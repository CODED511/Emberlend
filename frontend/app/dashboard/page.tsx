"use client";

import { useState } from "react";
import { Nav } from "@/components/Nav";
import { AssetTable } from "@/components/AssetTable";
import { AssetModal, ModalMode, Side } from "@/components/AssetModal";
import { PortfolioBar } from "@/components/PortfolioBar";
import { YourBorrows } from "@/components/YourBorrows";
import { useMarket, AssetRow } from "@/lib/useMarket";
import { useMarketActions } from "@/lib/useMarketActions";
import { useHederaAccount } from "@/lib/useHederaAccount";
import { MARKET_CONTRACT_ID } from "@/lib/tokens";
import { hashscanContract } from "@/lib/mirror";

export default function Dashboard() {
  const [mode, setMode] = useState<ModalMode>("supply");
  const [active, setActive] = useState<AssetRow | null>(null);
  const [activeSide, setActiveSide] = useState<Side | undefined>();

  function openAsset(row: AssetRow, side?: Side) {
    setActiveSide(side);
    setActive(row);
  }

  const { isConnected } = useHederaAccount();
  const { rows, portfolio, loading, refetch } = useMarket();
  const actions = useMarketActions();

  // The mirror node and relay lag consensus by a moment, so re-read twice.
  function refreshSoon() {
    setTimeout(refetch, 3000);
    setTimeout(refetch, 9000);
  }

  async function onFaucet(row: AssetRow) {
    try {
      await actions.faucet(row.token);
      refreshSoon();
    } catch {
      /* actions.tx.error surfaces it */
    }
  }

  const scan = hashscanContract(MARKET_CONTRACT_ID);

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-mono text-3xl font-extrabold tracking-tight">
              market
            </h1>
            <p className="mt-2 font-mono text-sm text-text-muted">
              {isConnected
                ? "supply assets to earn, or borrow against your collateral."
                : "connect a wallet to supply, borrow and track your health factor."}
            </p>
          </div>
          {scan && (
            <a
              href={scan}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-text-muted underline decoration-dotted hover:text-primary"
            >
              {MARKET_CONTRACT_ID} ↗
            </a>
          )}
        </div>

        <div className="mt-6">
          <PortfolioBar portfolio={portfolio} />
        </div>

        <div className="mt-8 flex items-center gap-8 border-b border-border">
          {(["supply", "borrow"] as ModalMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`relative -mb-px flex items-center gap-2 pb-4 font-mono text-lg transition ${
                mode === m
                  ? "font-bold text-text"
                  : "text-text-muted hover:text-text"
              }`}
            >
              <span
                className={`h-2 w-2 ${
                  mode === m ? "bg-success" : "bg-text-muted/50"
                }`}
              />
              {m} assets
              {mode === m && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
              )}
            </button>
          ))}
          <span className="ml-auto pb-4 font-mono text-sm text-text-muted">
            {mode === "supply" ? "earn yield" : "borrow power"}
          </span>
        </div>

        <div className="mt-6">
          {loading && rows.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface px-6 py-16 text-center font-mono text-text-muted">
              loading markets…
            </div>
          ) : (
            <AssetTable
              rows={rows}
              mode={mode}
              connected={isConnected}
              onAct={(row) => openAsset(row)}
              onFaucet={onFaucet}
            />
          )}
        </div>

        {mode === "borrow" && (
          <div className="mt-6">
            <YourBorrows
              rows={rows}
              portfolio={portfolio}
              connected={isConnected}
              onAct={openAsset}
            />
          </div>
        )}

        {actions.tx.error && !active && (
          <p className="mt-4 break-words font-mono text-sm text-danger">
            {actions.tx.error}
          </p>
        )}
        {actions.tx.pending && !active && (
          <p className="mt-4 font-mono text-sm text-text-muted">
            {actions.tx.step}
          </p>
        )}
      </main>

      {active && (
        <AssetModal
          row={active}
          mode={mode}
          initialSide={activeSide}
          borrowableUsd={portfolio.borrowableUsd}
          onClose={() => {
            setActive(null);
            setActiveSide(undefined);
          }}
          onDone={refreshSoon}
        />
      )}
    </>
  );
}
