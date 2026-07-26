"use client";

import { useMemo, useState } from "react";
import { AssetRow, fmtAmount, fmtUsd, usdValue } from "@/lib/useMarket";
import { TokenIcon } from "./TokenIcon";
import type { ModalMode } from "./AssetModal";

type SortKey = "asset" | "wallet" | "apy";

/**
 * Asset list for the market, in the terminal-style layout: coin, balance,
 * APY, collateral flag, action.
 *
 * `mode` decides which side of the market this table shows — supply lists
 * wallet balances and supply APY, borrow lists available liquidity and borrow
 * APY.
 */
export function AssetTable({
  rows,
  mode,
  connected,
  onAct,
  onFaucet,
}: {
  rows: AssetRow[];
  mode: ModalMode;
  connected: boolean;
  onAct: (row: AssetRow) => void;
  onFaucet: (row: AssetRow) => void;
}) {
  const [showZero, setShowZero] = useState(true);
  const [sort, setSort] = useState<SortKey>("wallet");
  const [asc, setAsc] = useState(false);

  const isSupply = mode === "supply";

  const visible = useMemo(() => {
    const amountOf = (r: AssetRow) =>
      isSupply ? r.walletBalance : r.available;

    let out = [...rows];
    if (!showZero) out = out.filter((r) => amountOf(r) > 0n);

    out.sort((a, b) => {
      let d = 0;
      if (sort === "asset") d = a.token.symbol.localeCompare(b.token.symbol);
      else if (sort === "apy")
        d = (isSupply ? a.supplyApy : a.borrowApy) -
            (isSupply ? b.supplyApy : b.borrowApy);
      else {
        const av = usdValue(amountOf(a), a.token.decimals, a.price);
        const bv = usdValue(amountOf(b), b.token.decimals, b.price);
        d = av === bv ? 0 : av < bv ? -1 : 1;
      }
      return asc ? d : -d;
    });
    return out;
  }, [rows, showZero, sort, asc, isSupply]);

  function toggleSort(k: SortKey) {
    if (sort === k) setAsc((v) => !v);
    else {
      setSort(k);
      setAsc(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] font-mono text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-widest text-text-muted">
              <Th onClick={() => toggleSort("asset")} active={sort === "asset"}>
                asset ⇅
              </Th>
              <Th
                onClick={() => toggleSort("wallet")}
                active={sort === "wallet"}
                right
              >
                {isSupply ? "wallet" : "available"} {sort === "wallet" ? (asc ? "↑" : "↓") : "⇅"}
              </Th>
              <Th onClick={() => toggleSort("apy")} active={sort === "apy"} right>
                apy ⇅
              </Th>
              <th className="px-4 py-4 text-left font-normal">
                {isSupply ? "collateral" : "your debt"}
              </th>
              <th className="px-4 py-4 text-right font-normal">actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const amount = isSupply ? r.walletBalance : r.available;
              const canAct = connected && amount > 0n;
              return (
                <tr
                  key={r.token.address}
                  className="border-b border-border/60 last:border-0 hover:bg-surface-raised/40"
                >
                  <td className="px-4 py-5">
                    <div className="flex items-center gap-3">
                      <TokenIcon token={r.token} />
                      <div>
                        <p className="font-bold">{r.token.symbol}</p>
                        <p className="text-xs text-text-muted">
                          {r.token.name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-5 text-right">
                    <p className="text-lg">
                      {fmtAmount(amount, r.token.decimals)}
                    </p>
                    <p className="text-xs text-text-muted">
                      {fmtUsd(usdValue(amount, r.token.decimals, r.price))}
                    </p>
                  </td>
                  <td className="px-4 py-5 text-right text-success">
                    {(isSupply ? r.supplyApy : r.borrowApy).toFixed(2)}%
                  </td>
                  <td className="px-4 py-5">
                    {isSupply ? (
                      r.ltvBps > 0 ? (
                        <span className="text-success">✓ yes</span>
                      ) : (
                        <span className="text-text-muted">— no</span>
                      )
                    ) : r.borrowBalance > 0n ? (
                      <span className="text-primary">
                        {fmtAmount(r.borrowBalance, r.token.decimals)}
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex justify-end gap-2">
                      {isSupply && connected && !r.token.isNative && (
                        <button
                          onClick={() => onFaucet(r)}
                          title={`Get test ${r.token.symbol}`}
                          className="rounded border border-border px-2 py-2 text-xs text-text-muted hover:border-primary hover:text-primary"
                        >
                          faucet
                        </button>
                      )}
                      <button
                        onClick={() => onAct(r)}
                        disabled={!canAct}
                        className={`rounded px-6 py-2 text-sm font-bold transition ${
                          canAct
                            ? "bg-primary text-[#100a06] shadow-ember-sm hover:brightness-110"
                            : "cursor-not-allowed border border-border text-text-muted"
                        }`}
                      >
                        {mode}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-text-muted"
                >
                  No assets to show.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 border-t border-border px-4 py-4 font-mono text-xs uppercase tracking-widest text-text-muted">
        show assets with 0 balance
        <button
          onClick={() => setShowZero((v) => !v)}
          role="switch"
          aria-checked={showZero}
          className={`relative h-6 w-12 rounded border transition ${
            showZero ? "border-primary bg-[#1a1206]" : "border-border bg-surface"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-5 rounded-sm transition-all ${
              showZero
                ? "left-6 bg-primary shadow-ember-sm"
                : "left-0.5 bg-text-muted"
            }`}
          />
        </button>
        <span className={showZero ? "text-primary" : ""}>
          {showZero ? "on" : "off"}
        </span>
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  right,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  right?: boolean;
}) {
  return (
    <th className={`px-4 py-4 font-normal ${right ? "text-right" : "text-left"}`}>
      <button
        onClick={onClick}
        className={`uppercase tracking-widest hover:text-primary ${
          active ? "text-primary" : ""
        }`}
      >
        {children}
      </button>
    </th>
  );
}
