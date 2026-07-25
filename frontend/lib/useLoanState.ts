"use client";

import { useCallback, useEffect, useState } from "react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { EMBERLEND_ADDRESS, emberlendAbi, isContractConfigured } from "./contract";
import { useHashConnect } from "./hashconnect";
import { accountIdToEvmAddress } from "./mirror";
import { publicClient } from "./publicClient";

/** Trims trailing zeros so 12.500000 reads as 12.5, and flags sub-dust amounts. */
export function fmtHbar(wei?: bigint, dp = 4): string {
  if (wei === undefined) return "—";
  const n = Number(formatEther(wei));
  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";
  return n.toLocaleString(undefined, { maximumFractionDigits: dp });
}

export type LoanState = {
  address?: `0x${string}`;
  loading: boolean;
  error?: string;
  hasLoan: boolean;
  collateral?: bigint;
  principal?: bigint;
  interest?: bigint;
  due?: bigint;
  startedAt?: bigint;
  liquidity?: bigint;
  totalSupplied?: bigint;
  totalBorrowed?: bigint;
  ratioBps?: bigint;
  rateBps?: bigint;
  maxBorrowFor: (collateralWei: bigint) => bigint;
  refetch: () => void;
};

type Snapshot = Omit<LoanState, "maxBorrowFor" | "refetch" | "loading">;

const POLL_MS = 15_000;

/**
 * Reads live pool + borrower state from EmberLendPool.
 *
 * Works in all three states: no wallet (pool figures only), MetaMask (address
 * straight from wagmi), and HashPack (0.0.x id resolved to its EVM alias via
 * the mirror node).
 */
export function useLoanState(): LoanState {
  const { address: evmAddress } = useAccount();
  const { accountId } = useHashConnect();
  const [resolved, setResolved] = useState<`0x${string}` | undefined>();
  const [snap, setSnap] = useState<Snapshot>({ hasLoan: false });
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // HashPack gives a native account id; map it to the EVM alias for eth_call.
  useEffect(() => {
    let cancelled = false;
    if (evmAddress || !accountId) {
      setResolved(undefined);
      return;
    }
    accountIdToEvmAddress(accountId).then((addr) => {
      if (!cancelled) setResolved(addr ?? undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [accountId, evmAddress]);

  const address = evmAddress ?? resolved;

  useEffect(() => {
    if (!isContractConfigured) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function load() {
      const base = { address: EMBERLEND_ADDRESS, abi: emberlendAbi } as const;
      try {
        const [liquidity, totalSupplied, totalBorrowed, ratioBps, rateBps] =
          await Promise.all([
            publicClient.readContract({ ...base, functionName: "availableLiquidity" }),
            publicClient.readContract({ ...base, functionName: "totalSupplied" }),
            publicClient.readContract({ ...base, functionName: "totalBorrowed" }),
            publicClient.readContract({ ...base, functionName: "COLLATERAL_RATIO_BPS" }),
            publicClient.readContract({ ...base, functionName: "ANNUAL_RATE_BPS" }),
          ]);

        let borrowerPart: Partial<Snapshot> = { hasLoan: false };
        if (address) {
          const [loan, due, interest] = await Promise.all([
            publicClient.readContract({
              ...base,
              functionName: "loans",
              args: [address],
            }),
            publicClient.readContract({
              ...base,
              functionName: "amountDue",
              args: [address],
            }),
            publicClient.readContract({
              ...base,
              functionName: "accruedInterest",
              args: [address],
            }),
          ]);
          const [collateral, principal, startedAt, active] = loan as readonly [
            bigint,
            bigint,
            bigint,
            boolean,
          ];
          borrowerPart = {
            hasLoan: active,
            collateral,
            principal,
            startedAt,
            due: due as bigint,
            interest: interest as bigint,
          };
        }

        if (cancelled) return;
        setSnap({
          address,
          liquidity: liquidity as bigint,
          totalSupplied: totalSupplied as bigint,
          totalBorrowed: totalBorrowed as bigint,
          ratioBps: ratioBps as bigint,
          rateBps: rateBps as bigint,
          error: undefined,
          ...borrowerPart,
        } as Snapshot);
      } catch (e: any) {
        if (!cancelled) {
          setSnap((s) => ({
            ...s,
            error: e?.shortMessage ?? e?.message ?? "Could not reach the network",
          }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [address, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return {
    ...snap,
    loading,
    maxBorrowFor: (collateralWei: bigint) =>
      snap.ratioBps && snap.ratioBps > 0n
        ? (collateralWei * 10_000n) / snap.ratioBps
        : 0n,
    refetch,
  };
}
