"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { EMBERLEND_ADDRESS, emberlendAbi } from "./contract";
import { hbarToTinybar, hbarToWeibar } from "./units";

export type ActionState = {
  pending: boolean;
  error?: string;
  ref?: string; // transaction hash
};

/**
 * Borrow / repay / supply against EmberLendPool.
 *
 * Every wallet — HashPack, MetaMask, WalletConnect, email and socials — comes
 * through Reown AppKit and signs over the Hedera JSON-RPC relay, so there is a
 * single wagmi code path here.
 *
 * Units matter: a transaction's `value` is weibar, but any amount *argument*
 * the contract takes is tinybar, because the relay divides value by 1e10
 * before the contract sees it. See ./units.ts.
 */
export function useEmberlend() {
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<ActionState>({ pending: false });

  const wallet = isConnected ? ("evm" as const) : null;

  async function run(fn: () => Promise<string>) {
    setStatus({ pending: true });
    try {
      const ref = await fn();
      setStatus({ pending: false, ref });
      return ref;
    } catch (e: any) {
      setStatus({
        pending: false,
        error: e?.shortMessage ?? e?.message ?? "Transaction failed",
      });
      throw e;
    }
  }

  async function supply(amountHbar: string) {
    return run(() =>
      writeContractAsync({
        address: EMBERLEND_ADDRESS,
        abi: emberlendAbi,
        functionName: "supply",
        value: hbarToWeibar(amountHbar),
      }),
    );
  }

  async function borrow(collateralHbar: string, principalHbar: string) {
    return run(() =>
      writeContractAsync({
        address: EMBERLEND_ADDRESS,
        abi: emberlendAbi,
        functionName: "borrow",
        // principal is a plain uint256 the contract compares against
        // msg.value, so it must be tinybar — not weibar.
        args: [hbarToTinybar(principalHbar)],
        value: hbarToWeibar(collateralHbar),
      }),
    );
  }

  async function repay(dueHbar: string) {
    return run(() =>
      writeContractAsync({
        address: EMBERLEND_ADDRESS,
        abi: emberlendAbi,
        functionName: "repay",
        value: hbarToWeibar(dueHbar),
      }),
    );
  }

  return { wallet, status, supply, borrow, repay };
}
