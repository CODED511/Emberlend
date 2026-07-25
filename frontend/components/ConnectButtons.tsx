"use client";

import { useEffect, useRef, useState } from "react";
import { useAppKit } from "@reown/appkit/react";
import { useDisconnect } from "wagmi";
import { useHederaAccount } from "@/lib/useHederaAccount";
import { hashscanAccount } from "@/lib/mirror";

/**
 * Single connect entry point — Reown AppKit handles every wallet
 * (HashPack, MetaMask, WalletConnect, email and socials).
 *
 * Once connected the button shows the native Hedera account id and opens a
 * menu rather than disconnecting on click, so a stray click can't drop the
 * session.
 */
export function ConnectButtons() {
  const { open } = useAppKit();
  const { disconnect } = useDisconnect();
  const { address, accountId, isConnected, resolving, display } =
    useHederaAccount();

  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  if (!isConnected || !address) {
    return (
      <button
        onClick={() => open()}
        className="ember-btn rounded-xl px-4 py-2 text-sm"
      >
        Connect wallet
      </button>
    );
  }

  // Prefer the Hedera id; fall back to the EVM address if it isn't on the
  // ledger yet (an address only gets a 0.0.x once it has been funded).
  const copyValue = accountId ?? address;

  async function copy() {
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the menu still shows the value */
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="pill flex items-center gap-2 px-4 py-2 text-sm"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <span className="h-2 w-2 rounded-full bg-success" />
        <span className="font-semibold">
          {resolving && !accountId ? "…" : display}
        </span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          className={`transition-transform ${menuOpen ? "rotate-180" : ""}`}
        >
          <path
            d="M1 1l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface-raised shadow-ember-sm"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-text-muted">
              {accountId ? "Hedera account" : "EVM address"}
            </p>
            <p className="mt-1 break-all font-mono text-sm text-primary">
              {copyValue}
            </p>
            {accountId && (
              <p className="mt-1 break-all font-mono text-[11px] text-text-muted">
                {address}
              </p>
            )}
          </div>

          <MenuItem onClick={copy} icon="⧉">
            {copied ? "Copied!" : "Copy address"}
          </MenuItem>

          {hashscanAccount(copyValue) && (
            <a
              href={hashscanAccount(copyValue)!}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-surface"
              role="menuitem"
            >
              <span className="w-4 text-center opacity-70">↗</span>
              View on HashScan
            </a>
          )}

          <MenuItem
            onClick={() => {
              open({ view: "Networks" });
              setMenuOpen(false);
            }}
            icon="⇄"
          >
            Switch network
          </MenuItem>

          <div className="h-px bg-border" />

          <MenuItem
            onClick={() => {
              disconnect();
              setMenuOpen(false);
            }}
            icon="⏻"
            danger
          >
            Disconnect
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  onClick,
  icon,
  danger,
  children,
}: {
  onClick: () => void;
  icon: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-surface ${
        danger ? "text-danger" : ""
      }`}
    >
      <span className="w-4 text-center opacity-70">{icon}</span>
      {children}
    </button>
  );
}
