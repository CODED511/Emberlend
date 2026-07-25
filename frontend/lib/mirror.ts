/**
 * Hedera mirror node helpers.
 *
 * Contract reads go through the JSON-RPC relay (via wagmi), but the relay only
 * speaks EVM addresses. HashPack hands us a native `0.0.x` account id, so we
 * resolve it to its EVM alias here. The mirror node is free, has no rate limit
 * for this, and needs no wallet connection.
 */

const NETWORK = process.env.NEXT_PUBLIC_HEDERA_NETWORK ?? "testnet";

export const MIRROR_BASE =
  NETWORK === "local"
    ? "http://localhost:5551/api/v1"
    : `https://${NETWORK}.mirrornode.hedera.com/api/v1`;

export const HASHSCAN_BASE =
  NETWORK === "local" ? null : `https://hashscan.io/${NETWORK}`;

/**
 * Resolves a Hedera account id (0.0.x) to its 20-byte EVM address.
 * Returns null if the account has no EVM alias or the lookup fails.
 */
export async function accountIdToEvmAddress(
  accountId: string,
): Promise<`0x${string}` | null> {
  try {
    const res = await fetch(`${MIRROR_BASE}/accounts/${accountId}`);
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data?.evm_address as string | undefined;
    if (!addr) return null;
    return (addr.startsWith("0x") ? addr : `0x${addr}`) as `0x${string}`;
  } catch {
    return null;
  }
}

export function hashscanTx(ref: string): string | null {
  if (!HASHSCAN_BASE) return null;
  // EVM tx hashes are 0x-prefixed; Hedera tx ids look like 0.0.x@seconds.nanos
  return `${HASHSCAN_BASE}/transaction/${ref}`;
}

export function hashscanContract(contractId: string): string | null {
  if (!HASHSCAN_BASE) return null;
  return `${HASHSCAN_BASE}/contract/${contractId}`;
}
