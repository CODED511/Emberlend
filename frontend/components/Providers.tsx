"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { WagmiProvider } from "wagmi";
import {
  networks,
  projectId,
  wagmiAdapter,
  wagmiConfig,
} from "@/lib/wagmi";
import { HashConnectProvider } from "@/lib/hashconnect";

const queryClient = new QueryClient();

// Initialize the Reown AppKit modal once, at module scope.
// Themed to match Emberlend's ember-on-black look.
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: "Emberlend",
    description: "Micro-lending on Hedera",
    url: "http://localhost:3000",
    icons: ["http://localhost:3000/favicon.ico"],
  },
  features: { analytics: false, email: false, socials: false },
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#F26522",
    "--w3m-border-radius-master": "3px",
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <HashConnectProvider>{children}</HashConnectProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
