"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { evmAddressToAccountId } from "./mirror";

export type HederaAccount = {
  /** Connected EVM address, e.g. 0x42cd…3d7d */
  address?: `0x${string}`;
  /** Native Hedera id, e.g. 0.0.9706356 — null until resolved, or if unfunded. */
  accountId: string | null;
  isConnected: boolean;
  resolving: boolean;
  /** What to show in the UI: the Hedera id when we have it, else the address. */
  display: string;
};

/** Shortens an EVM address; Hedera ids are already short enough to show whole. */
export function shortAddress(addr: string): string {
  return addr.startsWith("0x") && addr.length > 12
    ? `${addr.slice(0, 6)}…${addr.slice(-4)}`
    : addr;
}

/**
 * Maps the connected EVM address onto its native Hedera account id.
 *
 * Every wallet now connects through Reown over the JSON-RPC relay, which only
 * exposes EVM addresses — but Hedera users identify accounts by 0.0.x, so we
 * look that up on the mirror node and prefer it everywhere in the UI.
 */
export function useHederaAccount(): HederaAccount {
  const { address, isConnected } = useAccount();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!address) {
      setAccountId(null);
      return;
    }
    setResolving(true);
    evmAddressToAccountId(address)
      .then((id) => {
        if (!cancelled) setAccountId(id);
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  return {
    address,
    accountId,
    isConnected,
    resolving,
    display: accountId ?? (address ? shortAddress(address) : ""),
  };
}
