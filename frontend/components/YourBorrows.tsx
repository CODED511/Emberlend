"use client";

import { AssetRow, Portfolio, fmtAmount, fmtUsd, usdValue } from "@/lib/useMarket";
import { TokenIcon } from "./TokenIcon";
import type { Side } from "./AssetModal";

const SEGMENTS = 10;

/**
 * Open debt positions, with the share of borrowing capacity already used.
 *
 * Capacity is debt plus what remains borrowable — both come from the
 * contract's accountData(), so the bar reflects the same LTV maths that
 * borrow() enforces rather than a separate front-end estimate.
 */
export function YourBorrows({
  rows,
  portfolio,
  connected,
  onAct,
}: {
  rows: AssetRow[];
  portfolio: Portfolio;
  connected: boolean;
  onAct: (row: AssetRow, side: Side) => void;
}) {
  const borrowed = rows.filter((r) => r.borrowBalance > 0n);
  const capacity = portfolio.debtUsd + portfolio.borrowableUsd;
  const usedPct =
    capacity > 0n ? Number((portfolio.debtUsd * 10_000n) / capacity) / 100 : 0;
  const filled = Math.round((usedPct / 100) * SEGMENTS);

  // Approaching the limit is where liquidation risk lives, so shift the bar
  // from amber to red as it fills.
  const tone =
    usedPct >= 90 ? "bg-danger" : usedPct >= 75 ? "bg-[#f5a623]" : "bg-primary";
  const pctTone =
    usedPct >= 90
      ? "text-danger"
      : usedPct >= 75
        ? "text-[#f5a623]"
        : "text-primary";

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <header className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-5">
        <span className="h-3 w-3 bg-primary" />
        <h2 className="font-mono text-xl font-bold">your borrows</h2>
        <span
          title="Efficiency mode isn't implemented yet"
          className="flex cursor-default items-center gap-2 rounded border border-border px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-text-muted/70"
        >
          <span className="h-2 w-2 bg-text-muted/50" />
          e-mode off
        </span>
        <div className="ml-auto text-right">
          <p className="font-mono text-xs uppercase tracking-widest text-text-muted">
            total borrowed
          </p>
          <p className="font-mono text-2xl font-bold text-primary">
            {fmtUsd(portfolio.debtUsd)}
          </p>
        </div>
      </header>

      {borrowed.length === 0 ? (
        <p className="px-6 py-10 text-center font-mono text-sm text-text-muted">
          {connected
            ? "nothing borrowed yet — supply collateral, then borrow against it."
            : "connect a wallet to see your borrow positions."}
        </p>
      ) : (
        <div className="space-y-4 px-6 py-6">
          {borrowed.map((r) => (
            <div
              key={r.token.address}
              className="rounded-xl border border-border bg-surface-raised/40 px-5 py-5"
            >
              <div className="flex flex-wrap items-start gap-4">
                <TokenIcon token={r.token} size={44} />
                <div className="min-w-0">
                  <p className="font-mono text-lg font-bold">{r.token.symbol}</p>
                  <p className="font-mono text-xs text-text-muted">
                    {r.token.name}
                  </p>
                </div>

                <div className="ml-auto flex gap-10 text-right">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-widest text-text-muted">
                      debt
                    </p>
                    <p className="font-mono text-xl font-bold">
                      {fmtUsd(
                        usdValue(r.borrowBalance, r.token.decimals, r.price),
                      )}
                    </p>
                    <p className="font-mono text-xs text-text-muted">
                      {fmtAmount(r.borrowBalance, r.token.decimals)}{" "}
                      {r.token.symbol}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-xs uppercase tracking-widest text-text-muted">
                      apy, variable
                    </p>
                    <p className="font-mono text-xl font-bold text-primary">
                      {r.borrowApy.toFixed(2)}%
                    </p>
                    <p className="font-mono text-xs text-text-muted">
                      borrow rate
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-3 border-t border-border pt-4">
                <button
                  onClick={() => onAct(r, "borrow")}
                  className="rounded bg-primary px-8 py-2.5 font-mono text-sm font-bold text-[#100a06] shadow-ember-sm transition hover:brightness-110"
                >
                  borrow
                </button>
                <button
                  onClick={() => onAct(r, "repay")}
                  className="rounded border border-primary px-8 py-2.5 font-mono text-sm font-bold text-primary transition hover:bg-primary/10"
                >
                  repay
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-border px-6 py-5">
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-lg">borrow power used</p>
          <p className={`font-mono text-lg font-bold ${pctTone}`}>
            {usedPct.toFixed(0)}%
          </p>
        </div>
        <div className="mt-3 flex gap-1.5">
          {Array.from({ length: SEGMENTS }).map((_, i) => (
            <span
              key={i}
              className={`h-4 flex-1 rounded-[2px] ${
                i < filled ? tone : "bg-surface-raised"
              }`}
            />
          ))}
        </div>
        <p className="mt-3 font-mono text-sm text-text-muted">
          {fmtUsd(portfolio.debtUsd)} of {fmtUsd(capacity)} borrowing capacity
        </p>
      </div>
    </section>
  );
}
