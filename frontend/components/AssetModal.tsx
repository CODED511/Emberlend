"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { AssetRow, fmtAmount, fmtUsd, usdValue } from "@/lib/useMarket";
import { useMarketActions } from "@/lib/useMarketActions";
import { TokenIcon } from "./TokenIcon";

export type ModalMode = "supply" | "borrow";
export type Side = "supply" | "withdraw" | "borrow" | "repay";

const SIDES: Record<ModalMode, [Side, Side]> = {
  supply: ["supply", "withdraw"],
  borrow: ["borrow", "repay"],
};

/**
 * Supply/withdraw (or borrow/repay) dialog.
 *
 * The slider picks a percentage of whichever cap applies to the active side —
 * wallet balance to supply, supplied position to withdraw, remaining borrow
 * power to borrow, outstanding debt to repay — so 100% is always exactly the
 * maximum the contract will accept.
 */
export function AssetModal({
  row,
  mode,
  initialSide,
  borrowableUsd,
  onClose,
  onDone,
}: {
  row: AssetRow;
  mode: ModalMode;
  /** Opens straight onto a given tab, e.g. repay from the borrows panel. */
  initialSide?: Side;
  borrowableUsd: bigint;
  onClose: () => void;
  onDone: () => void;
}) {
  const [side, setSide] = useState<Side>(initialSide ?? SIDES[mode][0]);
  const [amount, setAmount] = useState("");
  const [pct, setPct] = useState(0);
  const actions = useMarketActions();
  const { token } = row;

  // Close on Escape, and lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  /** The largest amount this side can legally submit. */
  const max = useMemo(() => {
    switch (side) {
      case "supply":
        return row.walletBalance;
      case "withdraw":
        // Can't withdraw more than the market currently holds.
        return row.suppliedBalance < row.available
          ? row.suppliedBalance
          : row.available;
      case "borrow": {
        if (row.price === 0n) return 0n;
        const byPower =
          (borrowableUsd * 10n ** BigInt(token.decimals)) / row.price;
        return byPower < row.available ? byPower : row.available;
      }
      case "repay": {
        const owed = row.borrowBalance;
        return row.walletBalance < owed ? row.walletBalance : owed;
      }
    }
  }, [side, row, borrowableUsd, token.decimals]);

  const parsed = useMemo(() => {
    if (!amount.trim()) return 0n;
    try {
      return parseUnits(amount, token.decimals);
    } catch {
      return 0n;
    }
  }, [amount, token.decimals]);

  const overMax = parsed > max;
  const canSubmit = parsed > 0n && !overMax && !actions.tx.pending;

  function applyPct(p: number) {
    setPct(p);
    const v = (max * BigInt(Math.round(p * 100))) / 10_000n;
    setAmount(v === 0n ? "" : formatUnits(v, token.decimals));
  }

  function onAmountChange(v: string) {
    setAmount(v);
    try {
      const parsedV = v.trim() ? parseUnits(v, token.decimals) : 0n;
      setPct(max > 0n ? Number((parsedV * 100n) / max) : 0);
    } catch {
      /* partial input like "0." — leave the slider where it is */
    }
  }

  async function submit() {
    try {
      if (side === "supply") await actions.supply(token, parsed);
      else if (side === "withdraw") await actions.withdraw(token, parsed);
      else if (side === "borrow") await actions.borrow(token, parsed);
      else await actions.repay(token, parsed);
      onDone();
      onClose();
    } catch {
      /* actions.tx.error surfaces it below */
    }
  }

  const [primary, secondary] = SIDES[mode];
  const usd = usdValue(parsed, token.decimals, row.price);
  const apy = side === "supply" || side === "withdraw"
    ? row.supplyApy
    : row.borrowApy;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-ember"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-mono text-lg font-bold text-primary">
            {side} <TokenIcon token={token} size={22} /> {token.symbol}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-lg border border-border">
          {[primary, secondary].map((s) => (
            <button
              key={s}
              onClick={() => {
                setSide(s);
                setAmount("");
                setPct(0);
                actions.reset();
              }}
              className={`py-3 font-mono text-sm capitalize transition ${
                side === s
                  ? "bg-[#1a1206] font-bold text-primary"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-primary/50 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <input
              autoFocus
              inputMode="decimal"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="0.00"
              className="w-0 flex-1 bg-transparent font-mono text-3xl outline-none placeholder:text-text-muted/50"
            />
            <span className="flex items-center gap-2 font-mono text-lg">
              <TokenIcon token={token} size={20} />
              {token.symbol}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-xs text-text-muted">
            <span>{fmtUsd(usd)}</span>
            <span className="flex items-center gap-2">
              {side === "withdraw"
                ? "supplied"
                : side === "repay"
                  ? "owed"
                  : side === "borrow"
                    ? "available"
                    : "wallet balance"}{" "}
              {fmtAmount(max, token.decimals)}
              <button
                onClick={() => applyPct(100)}
                className="rounded border border-primary/60 px-2 py-0.5 text-primary hover:bg-primary/10"
              >
                MAX
              </button>
            </span>
          </div>
        </div>

        <div className="mt-4">
          <input
            type="range"
            min={0}
            max={100}
            value={pct}
            onChange={(e) => applyPct(Number(e.target.value))}
            className="ember-range w-full"
            aria-label="Percentage of maximum"
          />
          <div className="mt-2 flex justify-between font-mono text-[11px] text-text-muted">
            {[0, 25, 50, 75, 100].map((p) => (
              <button
                key={p}
                onClick={() => applyPct(p)}
                className={`hover:text-primary ${
                  pct === p ? "text-primary" : ""
                }`}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        <dl className="mt-5 divide-y divide-border border-y border-border font-mono text-sm">
          <Row
            k={`${side === "borrow" || side === "repay" ? "borrow" : "supply"} apy`}
            v={`${apy.toFixed(2)}%`}
          />
          {(side === "supply" || side === "withdraw") && (
            <Row
              k="collateral"
              v={row.collateralOn ? "enabled" : "disabled"}
              tone={row.collateralOn ? "text-success" : "text-text-muted"}
            />
          )}
          {(side === "borrow" || side === "repay") && (
            <Row k="liquidation threshold" v={`${row.liqThresholdBps / 100}%`} />
          )}
        </dl>

        {overMax && (
          <p className="mt-4 font-mono text-sm text-danger">
            Exceeds the maximum of {fmtAmount(max, token.decimals)}{" "}
            {token.symbol}.
          </p>
        )}
        {actions.tx.error && (
          <p className="mt-4 break-words font-mono text-sm text-danger">
            {actions.tx.error}
          </p>
        )}

        <button
          onClick={submit}
          disabled={!canSubmit}
          className={`mt-5 w-full rounded-xl py-4 font-mono text-base font-bold transition ${
            canSubmit
              ? "ember-btn"
              : "cursor-not-allowed bg-surface-raised text-text-muted"
          }`}
        >
          {actions.tx.pending
            ? (actions.tx.step ?? "Confirming…")
            : parsed === 0n
              ? "enter an amount"
              : `${side} ${fmtAmount(parsed, token.decimals)} ${token.symbol}`}
        </button>
      </div>
    </div>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="text-text-muted">&gt; {k}</dt>
      <dd className={tone ?? ""}>{v}</dd>
    </div>
  );
}
