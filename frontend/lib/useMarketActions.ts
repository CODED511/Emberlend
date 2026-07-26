"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { publicClient } from "./publicClient";
import { marketAbi, erc20Abi } from "./marketAbi";
import { MARKET_ADDRESS, TokenMeta } from "./tokens";
import { tinybarToWeibar } from "./units";

export type TxState = {
  pending: boolean;
  step?: string;
  error?: string;
  hash?: string;
};

const MAX_UINT = (1n << 256n) - 1n;

/**
 * Supply / withdraw / borrow / repay against EmberLendMarket.
 *
 * ERC-20 assets need an allowance before the market can pull them, so supply
 * and repay transparently send an approval first when one is missing. Native
 * HBAR skips that and rides along as msg.value.
 */
export function useMarketActions() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [tx, setTx] = useState<TxState>({ pending: false });

  const reset = () => setTx({ pending: false });

  async function run<T>(step: string, fn: () => Promise<T>): Promise<T> {
    setTx({ pending: true, step });
    try {
      const out = await fn();
      setTx({ pending: false, hash: typeof out === "string" ? out : undefined });
      return out;
    } catch (e: any) {
      setTx({
        pending: false,
        error: e?.shortMessage ?? e?.message ?? "Transaction failed",
      });
      throw e;
    }
  }

  /** Ensures the market can pull `amount` of an ERC-20 on the user's behalf. */
  async function ensureAllowance(token: TokenMeta, amount: bigint) {
    if (token.isNative || !address) return;
    const current = await publicClient.readContract({
      address: token.address,
      abi: erc20Abi,
      functionName: "allowance",
      args: [address, MARKET_ADDRESS],
    });
    if ((current as bigint) >= amount) return;

    setTx({ pending: true, step: `Approving ${token.symbol}…` });
    const hash = await writeContractAsync({
      address: token.address,
      abi: erc20Abi,
      functionName: "approve",
      args: [MARKET_ADDRESS, MAX_UINT],
    });
    await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
  }

  /**
   * Native amounts are held in tinybar everywhere in the UI, but a transaction's
   * `value` must be weibar — the relay divides it by 1e10 before the contract
   * sees it. Skipping this conversion sends 1e10× too little.
   */
  const nativeValue = (token: TokenMeta, amount: bigint) =>
    token.isNative ? tinybarToWeibar(amount) : 0n;

  async function supply(token: TokenMeta, amount: bigint) {
    await ensureAllowance(token, amount);
    return run(`Supplying ${token.symbol}…`, () =>
      writeContractAsync({
        address: MARKET_ADDRESS,
        abi: marketAbi,
        functionName: "supply",
        args: [token.address, token.isNative ? 0n : amount],
        value: nativeValue(token, amount),
      }),
    );
  }

  async function withdraw(token: TokenMeta, amount: bigint) {
    return run(`Withdrawing ${token.symbol}…`, () =>
      writeContractAsync({
        address: MARKET_ADDRESS,
        abi: marketAbi,
        functionName: "withdraw",
        args: [token.address, amount],
      }),
    );
  }

  async function borrow(token: TokenMeta, amount: bigint) {
    return run(`Borrowing ${token.symbol}…`, () =>
      writeContractAsync({
        address: MARKET_ADDRESS,
        abi: marketAbi,
        functionName: "borrow",
        args: [token.address, amount],
      }),
    );
  }

  async function repay(token: TokenMeta, amount: bigint) {
    await ensureAllowance(token, amount);
    return run(`Repaying ${token.symbol}…`, () =>
      writeContractAsync({
        address: MARKET_ADDRESS,
        abi: marketAbi,
        functionName: "repay",
        args: [token.address, token.isNative ? 0n : amount],
        value: nativeValue(token, amount),
      }),
    );
  }

  async function setCollateral(token: TokenMeta, enabled: boolean) {
    return run("Updating collateral…", () =>
      writeContractAsync({
        address: MARKET_ADDRESS,
        abi: marketAbi,
        functionName: "setCollateral",
        args: [token.address, enabled],
      }),
    );
  }

  /** Draws test tokens so a fresh wallet has something to supply. */
  async function faucet(token: TokenMeta) {
    return run(`Requesting ${token.symbol}…`, () =>
      writeContractAsync({
        address: token.address,
        abi: erc20Abi,
        functionName: "faucet",
      }),
    );
  }

  return { tx, reset, supply, withdraw, borrow, repay, setCollateral, faucet };
}
