"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { EMBERLEND_ADDRESS, emberlendAbi, isContractConfigured } from "./contract";
import { publicClient } from "./publicClient";

export { fmtHbar } from "./units";

/**
 * All bigint amounts below are **tinybar** (8 dp), because that is what the
 * contract stores and returns on Hedera. See ./units.ts.
 */
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
  /** Max borrow (tinybar) for a given collateral, from the on-chain ratio. */
  maxBorrowFor: (collateralTinybar: bigint) => bigint;
  refetch: () => void;
};

type Snapshot = Omit<LoanState, "maxBorrowFor" | "refetch" | "loading">;

const POLL_MS = 15_000;

/**
 * Reads live pool + borrower state from EmberLendPool.
 *
 * Pool-wide figures load with no wallet connected; borrower figures fill in
 * once Reown reports an address.
 */
export function useLoanState(): LoanState {
  const { address } = useAccount();
  const [snap, setSnap] = useState<Snapshot>({ hasLoan: false });
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

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
    maxBorrowFor: (collateralTinybar: bigint) =>
      snap.ratioBps && snap.ratioBps > 0n
        ? (collateralTinybar * 10_000n) / snap.ratioBps
        : 0n,
    refetch,
  };
}
