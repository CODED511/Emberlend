import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { defineChain } from "viem";
import { cookieStorage, createStorage } from "wagmi";

/**
 * Reown (WalletConnect) project id — get one free at https://cloud.reown.com.
 * Put it in frontend/.env.local as NEXT_PUBLIC_REOWN_PROJECT_ID.
 */
export const projectId =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "REPLACE_WITH_REOWN_PROJECT_ID";

/**
 * Hedera EVM networks.
 *
 * The relay takes a transaction's `value` in 18-decimal weibar, so wagmi/viem
 * treat HBAR as an 18-decimal currency here. Careful: the contract itself sees
 * 8-decimal tinybar, so amounts passed as *arguments* or read back from
 * contract state use a different scale — see ./units.ts.
 */
/**
 * Multicall3 is deployed at its canonical address on Hedera, but viem's stock
 * chain definitions don't declare it — without this, publicClient.multicall
 * throws ChainDoesNotSupportContract and every batched read fails. Verified
 * present via eth_getCode on testnet.
 */
const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11" as const;

export const hederaTestnet = defineChain({
  id: 296,
  name: "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet.hashio.io/api"] } },
  blockExplorers: {
    default: { name: "HashScan", url: "https://hashscan.io/testnet" },
  },
  contracts: { multicall3: { address: MULTICALL3 } },
  testnet: true,
});

export const hederaLocal = defineChain({
  id: 298,
  name: "Hedera Local",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: { default: { http: ["http://localhost:7546"] } },
  testnet: true,
});

export const networks = [hederaTestnet, hederaLocal] as [
  AppKitNetwork,
  ...AppKitNetwork[],
];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId,
  networks,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
