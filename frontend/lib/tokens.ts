/**
 * Asset registry for the Emberlend market on Hedera testnet.
 *
 * HBAR is the native asset and uses the zero address, matching
 * EmberLendMarket.NATIVE. Everything else is an ERC-20 on the Hedera EVM with
 * an open faucet, so a fresh wallet can hold balances immediately — an HTS
 * token would need an association step first.
 */
export const NATIVE_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;

export type TokenMeta = {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  /** Tailwind classes for the coin badge. */
  tint: string;
  glyph: string;
  isNative?: boolean;
};

const env = (k: string, fallback: string) =>
  (process.env[k as keyof typeof process.env] as string) || fallback;

export const MARKET_ADDRESS = (process.env.NEXT_PUBLIC_MARKET_ADDRESS ||
  "0x648a9cce87d4a52ffe70ef3508951c6b70481e07") as `0x${string}`;

export const MARKET_CONTRACT_ID =
  process.env.NEXT_PUBLIC_MARKET_CONTRACT_ID || "0.0.9770769";

export const TOKENS: TokenMeta[] = [
  {
    address: NATIVE_ADDRESS,
    symbol: "HBAR",
    name: "hedera hbar",
    // Tinybar. The relay takes a transaction's `value` in 18-dp weibar but
    // divides by 1e10, so the contract stores and returns 8-dp tinybar.
    // useMarketActions converts on the way out; see lib/units.ts.
    decimals: 8,
    tint: "bg-[#1a1206] text-primary ring-primary/40",
    glyph: "ℏ",
    isNative: true,
  },
  {
    address: env(
      "NEXT_PUBLIC_TOKEN_USDC",
      "0xbb18Ed613d5885eBC69D5E177706bd1Bd0a1C566",
    ) as `0x${string}`,
    symbol: "USDC",
    name: "usd coin",
    decimals: 6,
    tint: "bg-[#04263f] text-[#4aa3ff] ring-[#4aa3ff]/40",
    glyph: "$",
  },
  {
    address: env(
      "NEXT_PUBLIC_TOKEN_USDT",
      "0x938165Bb84c4C8E0770C16bFeA50B0e8444B082f",
    ) as `0x${string}`,
    symbol: "USDT",
    name: "tether usd",
    decimals: 6,
    tint: "bg-[#03291f] text-[#26a17b] ring-[#26a17b]/40",
    glyph: "₮",
  },
  {
    address: env(
      "NEXT_PUBLIC_TOKEN_SAUCE",
      "0x5609565cb471fb2695977Caab0e5f258A1A6e165",
    ) as `0x${string}`,
    symbol: "SAUCE",
    name: "saucerswap",
    decimals: 6,
    tint: "bg-[#2a0d2e] text-[#c05cff] ring-[#c05cff]/40",
    glyph: "◇",
  },
  {
    address: env(
      "NEXT_PUBLIC_TOKEN_WBTC",
      "0xABf8fb177e3f744D894C7171A1271d394cb41aF3",
    ) as `0x${string}`,
    symbol: "WBTC",
    name: "wrapped btc",
    decimals: 8,
    tint: "bg-[#2b1704] text-[#f7931a] ring-[#f7931a]/40",
    glyph: "₿",
  },
  {
    address: env(
      "NEXT_PUBLIC_TOKEN_WETH",
      "0x34Ac117d997063474713d6F923C6343EF4b00DD8",
    ) as `0x${string}`,
    symbol: "WETH",
    name: "wrapped eth",
    decimals: 18,
    tint: "bg-[#16182b] text-[#8f9eff] ring-[#8f9eff]/40",
    glyph: "Ξ",
  },
];

export const tokenByAddress = (addr: string): TokenMeta | undefined =>
  TOKENS.find((t) => t.address.toLowerCase() === addr.toLowerCase());
