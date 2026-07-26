"use client";

import { useCallback, useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { publicClient } from "./publicClient";
import { marketAbi, erc20Abi } from "./marketAbi";
import { MARKET_ADDRESS, TOKENS, TokenMeta } from "./tokens";
import { WEIBAR_PER_TINYBAR } from "./units";
import { accountBalanceTinybar } from "./mirror";

/** Health factor sentinel the contract returns when an account has no debt. */
export const NO_DEBT = (1n << 256n) - 1n;
const WAD = 10n ** 18n;

export type AssetRow = {
  token: TokenMeta;
  /** Wallet balance in the token's own decimals. */
  walletBalance: bigint;
  /** What the connected user has supplied. */
  suppliedBalance: bigint;
  /** What the connected user owes. */
  borrowBalance: bigint;
  collateralOn: boolean;
  /** USD price, 8 dp. */
  price: bigint;
  supplyApy: number;
  borrowApy: number;
  ltvBps: number;
  liqThresholdBps: number;
  /** Liquidity sitting in the market, available to borrow or withdraw. */
  available: bigint;
  totalSupplied: bigint;
  totalBorrowed: bigint;
};

export type Portfolio = {
  /** USD, 8 dp. */
  collateralUsd: bigint;
  debtUsd: bigint;
  borrowableUsd: bigint;
  /** 1e18-scaled; NO_DEBT when nothing is borrowed. */
  health: bigint;
  suppliedUsd: bigint;
  assetsSupplied: number;
};

export type MarketState = {
  rows: AssetRow[];
  portfolio: Portfolio;
  loading: boolean;
  refetch: () => void;
};

const EMPTY_PORTFOLIO: Portfolio = {
  collateralUsd: 0n,
  debtUsd: 0n,
  borrowableUsd: 0n,
  health: NO_DEBT,
  suppliedUsd: 0n,
  assetsSupplied: 0,
};

/** USD value of an amount, returned in 8 dp to match the contract. */
export function usdValue(amount: bigint, decimals: number, price: bigint) {
  return (amount * price) / 10n ** BigInt(decimals);
}

/** Formats an 8 dp USD figure as $1,234.56. */
export function fmtUsd(v: bigint, dp = 2): string {
  const n = Number(formatUnits(v, 8));
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: dp,
  });
}

/** Formats a token amount, trimming to something readable. */
export function fmtAmount(v: bigint, decimals: number): string {
  const n = Number(formatUnits(v, decimals));
  if (n === 0) return "0";
  if (n < 0.000001) return "<0.000001";
  if (n < 1) return n.toPrecision(3).replace(/0+$/, "").replace(/\.$/, "");
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function healthLabel(h: bigint): {
  text: string;
  tone: "safe" | "ok" | "warn" | "danger";
} {
  if (h === NO_DEBT) return { text: "∞", tone: "safe" };
  const n = Number(h) / 1e18;
  const text = n > 100 ? "99+" : n.toFixed(2);
  if (n >= 2) return { text, tone: "safe" };
  if (n >= 1.5) return { text, tone: "ok" };
  if (n >= 1.1) return { text, tone: "warn" };
  return { text, tone: "danger" };
}

/**
 * Reads every listed market plus the connected user's positions.
 *
 * Batched into a single multicall so a six-asset table costs one round trip
 * rather than thirty — the Hashio relay is rate-limited and drops connections
 * under bursts of individual eth_calls.
 */
export function useMarket(): MarketState {
  const { address } = useAccount();
  const [rows, setRows] = useState<AssetRow[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio>(EMPTY_PORTFOLIO);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const marketCalls = TOKENS.map((t) => ({
          address: MARKET_ADDRESS,
          abi: marketAbi,
          functionName: "markets" as const,
          args: [t.address] as const,
        }));
        const availCalls = TOKENS.map((t) => ({
          address: MARKET_ADDRESS,
          abi: marketAbi,
          functionName: "available" as const,
          args: [t.address] as const,
        }));

        const userCalls = address
          ? TOKENS.flatMap((t) => [
              {
                address: MARKET_ADDRESS,
                abi: marketAbi,
                functionName: "supplied" as const,
                args: [address, t.address] as const,
              },
              {
                address: MARKET_ADDRESS,
                abi: marketAbi,
                functionName: "borrowBalance" as const,
                args: [address, t.address] as const,
              },
              {
                address: MARKET_ADDRESS,
                abi: marketAbi,
                functionName: "collateralOn" as const,
                args: [address, t.address] as const,
              },
            ])
          : [];

        const erc20Calls =
          address
            ? TOKENS.filter((t) => !t.isNative).map((t) => ({
                address: t.address,
                abi: erc20Abi,
                functionName: "balanceOf" as const,
                args: [address] as const,
              }))
            : [];

        // Native balance comes from the mirror node in tinybar. Falling back
        // to eth_getBalance (weibar) only if the account isn't indexed yet.
        const nativeBalPromise = address
          ? accountBalanceTinybar(address).then(async (tb) =>
              tb !== null
                ? tb
                : (await publicClient.getBalance({ address })) /
                  WEIBAR_PER_TINYBAR,
            )
          : Promise.resolve(0n);

        const [results, nativeTinybar, account] = await Promise.all([
          publicClient.multicall({
            contracts: [
              ...marketCalls,
              ...availCalls,
              ...userCalls,
              ...erc20Calls,
            ] as any,
            allowFailure: true,
          }),
          nativeBalPromise,
          address
            ? publicClient.readContract({
                address: MARKET_ADDRESS,
                abi: marketAbi,
                functionName: "accountData",
                args: [address],
              })
            : Promise.resolve(undefined),
        ]);

        if (cancelled) return;

        const n = TOKENS.length;
        const val = (i: number) =>
          results[i]?.status === "success" ? (results[i] as any).result : undefined;

        let erc20Cursor = n + n + (address ? n * 3 : 0);
        let suppliedUsd = 0n;
        let assetsSupplied = 0;

        const next: AssetRow[] = TOKENS.map((token, i) => {
          const m = val(i) as any[] | undefined;
          const avail = (val(n + i) as bigint) ?? 0n;

          const base = address ? n + n + i * 3 : -1;
          const suppliedBalance = address ? ((val(base) as bigint) ?? 0n) : 0n;
          const borrowBalance = address
            ? ((val(base + 1) as bigint) ?? 0n)
            : 0n;
          const collOn = address ? ((val(base + 2) as boolean) ?? false) : false;

          let walletBalance = 0n;
          if (address) {
            // Already tinybar — see nativeBalPromise above.
            if (token.isNative) walletBalance = nativeTinybar;
            else {
              walletBalance = (val(erc20Cursor) as bigint) ?? 0n;
              erc20Cursor += 1;
            }
          }

          const price = (m?.[2] as bigint) ?? 0n;
          if (suppliedBalance > 0n) {
            suppliedUsd += usdValue(suppliedBalance, token.decimals, price);
            assetsSupplied += 1;
          }

          return {
            token,
            walletBalance,
            suppliedBalance,
            borrowBalance,
            collateralOn: collOn,
            price,
            supplyApy: Number((m?.[3] as bigint) ?? 0n) / 100,
            borrowApy: Number((m?.[4] as bigint) ?? 0n) / 100,
            ltvBps: Number((m?.[5] as bigint) ?? 0n),
            liqThresholdBps: Number((m?.[6] as bigint) ?? 0n),
            available: avail,
            totalSupplied: (m?.[7] as bigint) ?? 0n,
            totalBorrowed: (m?.[8] as bigint) ?? 0n,
          };
        });

        setRows(next);
        setPortfolio(
          account
            ? {
                collateralUsd: (account as any)[0],
                debtUsd: (account as any)[1],
                borrowableUsd: (account as any)[2],
                health: (account as any)[3],
                suppliedUsd,
                assetsSupplied,
              }
            : { ...EMPTY_PORTFOLIO, suppliedUsd, assetsSupplied },
        );
      } catch (e) {
        if (!cancelled) console.error("market read failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, tick]);

  return { rows, portfolio, loading, refetch };
}
