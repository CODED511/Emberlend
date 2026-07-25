"use client";

import { useState } from "react";
import { useAppKit } from "@reown/appkit/react";
import { useAccount, useDisconnect } from "wagmi";
import { useHashConnect } from "@/lib/hashconnect";

function short(addr: string) {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export function ConnectButtons() {
  const [open, setOpen] = useState(false);
  const { open: openReown } = useAppKit();
  const { address, isConnected: evmConnected } = useAccount();
  const { disconnect: evmDisconnect } = useDisconnect();
  const {
    accountId,
    connect: hpConnect,
    disconnect: hpDisconnect,
  } = useHashConnect();

  // Connected states take priority in the UI.
  if (evmConnected && address) {
    return (
      <button
        onClick={() => evmDisconnect()}
        className="pill px-4 py-2 text-sm"
        title="Disconnect MetaMask"
      >
        🦊 {short(address)}
      </button>
    );
  }
  if (accountId) {
    return (
      <button
        onClick={() => hpDisconnect()}
        className="pill px-4 py-2 text-sm"
        title="Disconnect HashPack"
      >
        🪙 {accountId}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="ember-btn rounded-xl px-4 py-2 text-sm"
      >
        Connect wallet
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface-raised shadow-ember-sm">
          <MenuItem
            onClick={() => {
              openReown();
              setOpen(false);
            }}
            emoji="🦊"
            title="MetaMask & more"
            sub="EVM via Reown / WalletConnect"
          />
          <div className="h-px bg-border" />
          <MenuItem
            onClick={() => {
              hpConnect();
              setOpen(false);
            }}
            emoji="🪙"
            title="HashPack"
            sub="Native Hedera wallet"
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  onClick,
  emoji,
  title,
  sub,
}: {
  onClick: () => void;
  emoji: string;
  title: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface"
    >
      <span className="text-xl">{emoji}</span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-text-muted">{sub}</span>
      </span>
    </button>
  );
}
