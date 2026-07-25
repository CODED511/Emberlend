"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { HashConnect, SessionData } from "hashconnect";
import { projectId } from "./wagmi";

const appMetadata = {
  name: "Emberlend",
  description: "Micro-lending on Hedera",
  icons: ["http://localhost:3000/favicon.ico"],
  url: "http://localhost:3000",
};

type Ctx = {
  accountId: string | null;
  state: string;
  hc: HashConnect | null;
  connect: () => void;
  disconnect: () => void;
};

const HashConnectContext = createContext<Ctx | null>(null);

export function HashConnectProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hc, setHc] = useState<HashConnect | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [state, setState] = useState<string>("Disconnected");

  useEffect(() => {
    let instance: HashConnect | null = null;
    let cancelled = false;

    // Dynamically import the Hedera SDK + HashConnect so they never touch SSR
    // (they rely on Node's crypto and are browser/runtime-only).
    (async () => {
      const { LedgerId } = await import("@hashgraph/sdk");
      const { HashConnect } = await import("hashconnect");

      const ledger =
        process.env.NEXT_PUBLIC_HEDERA_NETWORK === "local"
          ? LedgerId.LOCAL_NODE
          : LedgerId.TESTNET;

      instance = new HashConnect(ledger, projectId, appMetadata, true);

      instance.pairingEvent.on((data: SessionData) => {
        setAccountId(data.accountIds?.[0] ?? null);
      });
      instance.disconnectionEvent.on(() => setAccountId(null));
      instance.connectionStatusChangeEvent.on((s) => setState(String(s)));

      await instance.init();
      if (cancelled) return;

      setHc(instance);
      const existing = instance.connectedAccountIds?.[0];
      if (existing) setAccountId(existing.toString());
    })().catch((e) => console.error("HashConnect init failed", e));

    return () => {
      cancelled = true;
      instance?.pairingEvent.offAll?.();
      instance?.disconnectionEvent.offAll?.();
      instance?.connectionStatusChangeEvent.offAll?.();
    };
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      accountId,
      state,
      hc,
      connect: () => hc?.openPairingModal(),
      disconnect: () => hc?.disconnect(),
    }),
    [accountId, state, hc],
  );

  return (
    <HashConnectContext.Provider value={value}>
      {children}
    </HashConnectContext.Provider>
  );
}

export function useHashConnect() {
  const ctx = useContext(HashConnectContext);
  if (!ctx)
    throw new Error("useHashConnect must be used within HashConnectProvider");
  return ctx;
}
