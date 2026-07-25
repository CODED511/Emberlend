import { createPublicClient, http } from "viem";
import { hederaLocal, hederaTestnet } from "./wagmi";

/**
 * Read-only client for EmberLendPool.
 *
 * Deliberately independent of the wallet connection: pool figures should load
 * for visitors who haven't connected anything, and HashPack users never get a
 * wagmi transport at all. Reads go straight to the Hedera JSON-RPC relay.
 */
const chain =
  process.env.NEXT_PUBLIC_HEDERA_NETWORK === "local"
    ? hederaLocal
    : hederaTestnet;

export const publicClient = createPublicClient({
  chain,
  transport: http(),
});
