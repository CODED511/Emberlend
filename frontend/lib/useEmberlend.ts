"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import {
  EMBERLEND_ADDRESS,
  EMBERLEND_CONTRACT_ID,
  emberlendAbi,
} from "./contract";
import { useHashConnect } from "./hashconnect";

export type ActionState = {
  pending: boolean;
  error?: string;
  ref?: string; // tx hash (EVM) or tx id (HashPack)
};

/**
 * Unified borrow/repay/supply that works with either wallet:
 *  - EVM (MetaMask via Reown)  -> wagmi writeContract
 *  - HashPack (via HashConnect) -> Hedera SDK ContractExecuteTransaction
 *
 * On Hedera EVM, msg.value is denominated in weibar (1 HBAR = 1e18), so
 * parseEther() is the correct unit for both value and the uint256 principal.
 */
export function useEmberlend() {
  const { isConnected: evmConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { accountId, hc } = useHashConnect();
  const [status, setStatus] = useState<ActionState>({ pending: false });

  const wallet: "evm" | "hashpack" | null = evmConnected
    ? "evm"
    : accountId
      ? "hashpack"
      : null;

  async function run(fn: () => Promise<string>) {
    setStatus({ pending: true });
    try {
      const ref = await fn();
      setStatus({ pending: false, ref });
      return ref;
    } catch (e: any) {
      setStatus({ pending: false, error: e?.shortMessage ?? e?.message ?? "Transaction failed" });
      throw e;
    }
  }

  async function execHashpack(
    fnName: "supply" | "borrow" | "repay",
    payableHbar?: string,
    principalWeibar?: bigint,
  ): Promise<string> {
    const {
      ContractExecuteTransaction,
      ContractFunctionParameters,
      ContractId,
      Hbar,
      AccountId,
    } = await import("@hashgraph/sdk");
    const BigNumber = (await import("bignumber.js")).default;

    const signer = hc!.getSigner(AccountId.fromString(accountId!) as any);
    let tx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(EMBERLEND_CONTRACT_ID))
      .setGas(600_000);

    if (payableHbar) tx = tx.setPayableAmount(new Hbar(payableHbar));

    if (fnName === "borrow") {
      tx = tx.setFunction(
        "borrow",
        new ContractFunctionParameters().addUint256(
          new BigNumber(principalWeibar!.toString()),
        ),
      );
    } else {
      tx = tx.setFunction(fnName);
    }

    const frozen = await tx.freezeWithSigner(signer as any);
    const resp = await frozen.executeWithSigner(signer as any);
    return resp.transactionId.toString();
  }

  async function supply(amountHbar: string) {
    return run(async () => {
      const value = parseEther(amountHbar);
      if (wallet === "evm") {
        return writeContractAsync({
          address: EMBERLEND_ADDRESS,
          abi: emberlendAbi,
          functionName: "supply",
          value,
        });
      }
      return execHashpack("supply", amountHbar);
    });
  }

  async function borrow(collateralHbar: string, principalHbar: string) {
    return run(async () => {
      const collateral = parseEther(collateralHbar);
      const principal = parseEther(principalHbar);
      if (wallet === "evm") {
        return writeContractAsync({
          address: EMBERLEND_ADDRESS,
          abi: emberlendAbi,
          functionName: "borrow",
          args: [principal],
          value: collateral,
        });
      }
      return execHashpack("borrow", collateralHbar, principal);
    });
  }

  async function repay(dueHbar: string) {
    return run(async () => {
      const value = parseEther(dueHbar);
      if (wallet === "evm") {
        return writeContractAsync({
          address: EMBERLEND_ADDRESS,
          abi: emberlendAbi,
          functionName: "repay",
          value,
        });
      }
      return execHashpack("repay", dueHbar);
    });
  }

  return { wallet, status, supply, borrow, repay };
}
