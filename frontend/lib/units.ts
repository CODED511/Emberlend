import { formatUnits, parseUnits } from "viem";

/**
 * HBAR unit handling on Hedera's EVM.
 *
 * There are two scales in play and mixing them silently breaks things:
 *
 *  - **weibar (18 dp)** — what the JSON-RPC relay expects in a transaction's
 *    `value` field, for EVM tooling compatibility. `parseEther` is correct here.
 *  - **tinybar (8 dp)** — what the contract actually sees. The relay divides
 *    `value` by 1e10, so `msg.value`, anything derived from it, and
 *    `address(this).balance` are all tinybar.
 *
 * So: send in weibar, but any uint256 the contract stores, returns, or takes
 * as an amount argument is tinybar. Verified on testnet — supplying 100 HBAR
 * moved `totalSupplied` by 1e10 (= 100 * 1e8), not 1e20.
 */
export const TINYBAR_DECIMALS = 8;
export const WEIBAR_PER_TINYBAR = 10_000_000_000n; // 1e10

/** "1.5" -> 150000000n tinybar. Throws on malformed input. */
export function hbarToTinybar(hbar: string): bigint {
  return parseUnits(hbar, TINYBAR_DECIMALS);
}

/** Tinybar -> the weibar value a transaction's `value` field needs. */
export function tinybarToWeibar(tinybar: bigint): bigint {
  return tinybar * WEIBAR_PER_TINYBAR;
}

/** "1.5" -> weibar, for a transaction `value`. */
export function hbarToWeibar(hbar: string): bigint {
  return tinybarToWeibar(hbarToTinybar(hbar));
}

/** Tinybar -> a plain decimal string like "1.5". */
export function tinybarToHbar(tinybar: bigint): string {
  return formatUnits(tinybar, TINYBAR_DECIMALS);
}

/** Display helper: trims noise, flags dust, groups thousands. */
export function fmtHbar(tinybar?: bigint, dp = 4): string {
  if (tinybar === undefined) return "—";
  const n = Number(tinybarToHbar(tinybar));
  if (n === 0) return "0";
  if (n > 0 && n < 0.0001) return "<0.0001";
  return n.toLocaleString(undefined, { maximumFractionDigits: dp });
}

/** parseUnits throws on partial input like "0." — treat that as absent. */
export function safeHbarToTinybar(v: string): bigint | null {
  if (!v.trim()) return null;
  try {
    return hbarToTinybar(v);
  } catch {
    return null;
  }
}
