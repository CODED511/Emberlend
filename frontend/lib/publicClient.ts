import { createPublicClient, http } from "viem";
import { hederaLocal, hederaTestnet } from "./wagmi";

/**
 * Read-only client for the Emberlend market.
 *
 * Deliberately independent of the wallet connection so market figures load for
 * visitors who haven't connected anything. Reads go straight to the Hedera
 * JSON-RPC relay.
 *
 * Batching is capped well below the default: Hashio is a shared public relay
 * and rejects oversized eth_call payloads, so a six-asset table is split into
 * a few modest multicalls rather than one large one.
 */
const chain =
  process.env.NEXT_PUBLIC_HEDERA_NETWORK === "local"
    ? hederaLocal
    : hederaTestnet;

export const publicClient = createPublicClient({
  chain,
  transport: http(undefined, { batch: false, timeout: 30_000 }),
  batch: { multicall: { batchSize: 512, wait: 24 } },
});
