"use client";

import { Portfolio, fmtUsd, healthLabel, NO_DEBT } from "@/lib/useMarket";

const TONE = {
  safe: "text-success",
  ok: "text-success",
  warn: "text-[#f5a623]",
  danger: "text-danger",
} as const;

const BAR_TONE = {
  safe: "bg-success",
  ok: "bg-success",
  warn: "bg-[#f5a623]",
  danger: "bg-danger",
} as const;

/**
 * Supplied / borrowed / health-factor summary.
 *
 * The health bar fills toward 8 segments as the factor climbs from 1.0 (one
 * segment, at liquidation) to 3.0 and above (full). No debt reads ∞ and fills
 * completely.
 */
export function PortfolioBar({ portfolio }: { portfolio: Portfolio }) {
  const { text, tone } = healthLabel(portfolio.health);
  const noDebt = portfolio.health === NO_DEBT;

  const segments = 8;
  const filled = noDebt
    ? segments
    : Math.max(
        1,
        Math.min(
          segments,
          Math.round(((Number(portfolio.health) / 1e18 - 1) / 2) * segments),
        ),
      );

  const usedPct =
    portfolio.borrowableUsd + portfolio.debtUsd > 0n
      ? Number(
          (portfolio.debtUsd * 100n) /
            (portfolio.borrowableUsd + portfolio.debtUsd),
        )
      : 0;

  return (
    <section className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
      <Cell
        label="supplied"
        value={fmtUsd(portfolio.suppliedUsd)}
        valueClass="text-success"
        sub={`${portfolio.assetsSupplied} asset${
          portfolio.assetsSupplied === 1 ? "" : "s"
        } · earning`}
      />
      <Cell
        label="borrowed"
        value={fmtUsd(portfolio.debtUsd)}
        valueClass="text-primary"
        sub={`${usedPct}% of borrow power`}
      />
      <Cell
        label="health factor"
        value={text}
        valueClass={TONE[tone]}
        sub={
          <div className="mt-2 flex gap-1">
            {Array.from({ length: segments }).map((_, i) => (
              <span
                key={i}
                className={`h-2 flex-1 rounded-[2px] ${
                  i < filled ? BAR_TONE[tone] : "bg-surface-raised"
                }`}
              />
            ))}
          </div>
        }
      />
    </section>
  );
}

function Cell({
  label,
  value,
  valueClass,
  sub,
}: {
  label: string;
  value: string;
  valueClass: string;
  sub: React.ReactNode;
}) {
  return (
    <div className="bg-surface px-6 py-5">
      <p className="font-mono text-xs uppercase tracking-widest text-text-muted">
        {label}
      </p>
      <p className={`mt-2 font-mono text-3xl font-bold ${valueClass}`}>
        {value}
      </p>
      {typeof sub === "string" ? (
        <p className="mt-1 font-mono text-xs text-text-muted">{sub}</p>
      ) : (
        sub
      )}
    </div>
  );
}
