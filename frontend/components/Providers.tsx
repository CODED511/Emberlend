"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { WagmiProvider } from "wagmi";
import { networks, projectId, wagmiAdapter, wagmiConfig } from "@/lib/wagmi";

const queryClient = new QueryClient();

const origin =
  typeof window !== "undefined"
    ? window.location.origin
    : "https://emberlend.vercel.app";

/**
 * Reown AppKit is the single connection path for every wallet — HashPack,
 * MetaMask, any WalletConnect wallet, plus email and social login. Initialized
 * once at module scope and themed to Emberlend's ember-on-black look.
 */
/**
 * HashPack is the native Hedera wallet, so we pin it to the top of the list
 * rather than relying on Reown's default ordering for an EVM chain. Its id
 * comes from the WalletConnect explorer registry.
 */
const HASHPACK_ID =
  "a29498d225fa4b13468ff4d6cf4ae0ea4adcbd95f07ce8a843a1dee10b632f3f";
const METAMASK_ID =
  "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96";

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: "Emberlend",
    description: "Micro-lending on Hedera",
    url: origin,
    icons: [`${origin}/favicon.ico`],
  },
  featuredWalletIds: [HASHPACK_ID, METAMASK_ID],
  features: {
    analytics: false,
    email: true,
    socials: ["google", "x", "discord", "github", "apple", "farcaster"],
    emailShowWallets: true,
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#F26522",
    "--w3m-border-radius-master": "3px",
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
