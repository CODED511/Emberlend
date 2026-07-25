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
 * Hedera EVM networks. Note: the JSON-RPC relay represents native value with
 * 18 decimals (weibar), so viem/wagmi treat HBAR as an 18-decimal currency —
 * parseEther/formatEther work as expected.
 */
export const hederaTestnet = defineChain({
  id: 296,
  name: "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet.hashio.io/api"] } },
  blockExplorers: {
    default: { name: "HashScan", url: "https://hashscan.io/testnet" },
  },
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
