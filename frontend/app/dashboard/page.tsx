"use client";

import { useEffect, useState } from "react";
import { formatEther, parseEther } from "viem";
import { Nav } from "@/components/Nav";
import { useEmberlend } from "@/lib/useEmberlend";
import { useLoanState, fmtHbar } from "@/lib/useLoanState";
import { EMBERLEND_CONTRACT_ID, isContractConfigured } from "@/lib/contract";
import { hashscanContract, hashscanTx } from "@/lib/mirror";

type Tab = "borrow" | "lend";

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("borrow");
  const [collateral, setCollateral] = useState("");
  const [borrowAmt, setBorrowAmt] = useState("");
  const [supplyAmt, setSupplyAmt] = useState("");
  const [repayAmt, setRepayAmt] = useState("");

  const { wallet, status, supply, borrow, repay } = useEmberlend();
  const loan = useLoanState();

  const connected = wallet !== null;
  const canAct = connected && isContractConfigured && !status.pending;

  // Max borrow comes from the contract's own collateral ratio, not a guess.
  const collateralWei = safeParse(collateral);
  const maxBorrowWei = collateralWei ? loan.maxBorrowFor(collateralWei) : 0n;
  const borrowWei = safeParse(borrowAmt);
  const overMax = !!borrowWei && !!maxBorrowWei && borrowWei > maxBorrowWei;
  const overLiquidity =
    !!borrowWei && loan.liquidity !== undefined && borrowWei > loan.liquidity;

  const ltvPct = loan.ratioBps ? (10_000 / Number(loan.ratioBps)) * 100 : null;
  const ratePct = loan.rateBps ? Number(loan.rateBps) / 100 : null;

  // Keep the repay field in step with the live amount due (it grows with
  // interest). A small buffer covers accrual between quote and confirmation;
  // the contract refunds any excess.
  useEffect(() => {
    if (loan.due && loan.hasLoan) {
      const buffered = (loan.due * 10_050n) / 10_000n;
      setRepayAmt(formatEther(buffered));
    }
  }, [loan.due, loan.hasLoan]);

  async function withRefresh(fn: () => Promise<string>) {
    try {
      await fn();
      // Mirror/relay lag a moment behind consensus.
      setTimeout(loan.refetch, 3000);
      setTimeout(loan.refetch, 8000);
    } catch {
      /* status.error already surfaces it */
    }
  }

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
            <p className="mt-2 text-text-muted">
              {connected
                ? `Connected via ${wallet === "evm" ? "MetaMask / EVM" : "HashPack"}.`
                : "Connect a wallet to borrow, repay, or supply."}
            </p>
          </div>
          {isContractConfigured && (
            <a
              href={hashscanContract(EMBERLEND_CONTRACT_ID) ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="pill px-3 py-1 text-xs hover:brightness-125"
            >
              {EMBERLEND_CONTRACT_ID} ↗
            </a>
          )}
        </div>

        {!isContractConfigured && (
          <Banner tone="warn">
            No contract address set. Deploy <code>EmberLendPool</code> and add{" "}
            <code>NEXT_PUBLIC_EMBERLEND_ADDRESS</code> to <code>.env.local</code>.
          </Banner>
        )}

        {loan.error && (
          <Banner tone="error">Could not read contract state: {loan.error}</Banner>
        )}

        {/* Live pool stats */}
        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Available liquidity"
            value={`${fmtHbar(loan.liquidity)} ℏ`}
            loading={loan.loading}
          />
          <Stat
            label="Total borrowed"
            value={`${fmtHbar(loan.totalBorrowed)} ℏ`}
            loading={loan.loading}
          />
          <Stat
            label="Borrow rate"
            value={ratePct !== null ? `${ratePct}% APR` : "—"}
            loading={loan.loading}
          />
        </section>

        {/* The user's live position */}
        {loan.hasLoan && (
          <section className="ember-surface mt-6 p-6 shadow-ember-sm">
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Your active loan</h2>
                <span className="pill px-3 py-1 text-xs">● OPEN</span>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                <Cell label="Collateral" value={`${fmtHbar(loan.collateral)} ℏ`} />
                <Cell label="Borrowed" value={`${fmtHbar(loan.principal)} ℏ`} />
                <Cell
                  label="Interest accrued"
                  value={`${fmtHbar(loan.interest, 6)} ℏ`}
                />
                <Cell
                  label="Total due"
                  value={`${fmtHbar(loan.due)} ℏ`}
                  highlight
                />
              </dl>
              {loan.startedAt !== undefined && loan.startedAt > 0n && (
                <p className="mt-4 text-xs text-text-muted">
                  Opened {new Date(Number(loan.startedAt) * 1000).toLocaleString()}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Tabs */}
        <div className="mt-8 inline-flex rounded-xl border border-border bg-surface p-1">
          {(["borrow", "lend"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-6 py-2 text-sm font-semibold capitalize transition ${
                tab === t
                  ? "bg-ember-btn text-[#100a06]"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <section className="ember-surface mt-4 p-8 shadow-ember-sm">
          <div className="relative z-10">
            {tab === "borrow" ? (
              loan.hasLoan ? (
                <div className="space-y-6">
                  <p className="text-text-muted">
                    You have an open loan. Repay it to reclaim your collateral
                    before borrowing again.
                  </p>
                  <Field
                    label="Repay (HBAR)"
                    value={repayAmt}
                    onChange={setRepayAmt}
                    placeholder="Amount due incl. interest"
                  />
                  <p className="text-xs text-text-muted">
                    Pre-filled with the live amount due plus a 0.5% buffer for
                    interest accruing while you confirm. Any excess is refunded.
                  </p>
                  <ActionButton
                    disabled={!canAct || !repayAmt}
                    pending={status.pending}
                    onClick={() => withRefresh(() => repay(repayAmt))}
                    label="Repay & reclaim collateral"
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <Field
                    label="Collateral (HBAR)"
                    value={collateral}
                    onChange={setCollateral}
                    placeholder="0.00"
                  />
                  <div className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text-muted">
                    Max borrow
                    {ltvPct ? ` at ${ltvPct.toFixed(1)}% LTV` : ""}:{" "}
                    <span className="font-semibold text-primary">
                      {fmtHbar(maxBorrowWei)} ℏ
                    </span>
                  </div>
                  <Field
                    label="Borrow amount (HBAR)"
                    value={borrowAmt}
                    onChange={setBorrowAmt}
                    placeholder="0.00"
                  />
                  {overMax && (
                    <p className="text-sm text-danger">
                      Exceeds max borrow for that collateral.
                    </p>
                  )}
                  {!overMax && overLiquidity && (
                    <p className="text-sm text-danger">
                      Pool only has {fmtHbar(loan.liquidity)} ℏ available.
                    </p>
                  )}
                  <ActionButton
                    disabled={
                      !canAct ||
                      overMax ||
                      overLiquidity ||
                      !collateral ||
                      !borrowAmt
                    }
                    pending={status.pending}
                    onClick={() =>
                      withRefresh(() => borrow(collateral, borrowAmt))
                    }
                    label="Lock collateral & borrow"
                  />
                </div>
              )
            ) : (
              <div className="space-y-4">
                <Field
                  label="Deposit to treasury (HBAR)"
                  value={supplyAmt}
                  onChange={setSupplyAmt}
                  placeholder="0.00"
                />
                <div className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text-muted">
                  Pool size:{" "}
                  <span className="font-semibold text-primary">
                    {fmtHbar(loan.totalSupplied)} ℏ
                  </span>{" "}
                  supplied · {fmtHbar(loan.liquidity)} ℏ idle
                </div>
                <ActionButton
                  disabled={!canAct || !supplyAmt}
                  pending={status.pending}
                  onClick={() => withRefresh(() => supply(supplyAmt))}
                  label="Supply liquidity"
                />
              </div>
            )}

            {status.error && <Banner tone="error">{status.error}</Banner>}
            {status.ref && (
              <Banner tone="ok">
                Submitted:{" "}
                <a
                  href={hashscanTx(status.ref) ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all font-mono text-xs underline"
                >
                  {status.ref}
                </a>
              </Banner>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

/** parseEther throws on partial input like "0." — treat that as no value. */
function safeParse(v: string): bigint | null {
  if (!v.trim()) return null;
  try {
    return parseEther(v);
  } catch {
    return null;
  }
}

function Stat({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="ember-surface px-5 py-4">
      <div className="relative z-10">
        <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
        <p className="mt-1 text-lg font-bold text-primary">
          {loading ? "…" : value}
        </p>
      </div>
    </div>
  );
}

function Cell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-text-muted">{label}</dt>
      <dd
        className={`mt-1 font-bold ${highlight ? "text-primary" : "text-text"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function ActionButton({
  disabled,
  pending,
  onClick,
  label,
}: {
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="ember-btn w-full rounded-2xl py-4 text-base disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending ? "Confirm in wallet…" : label}
    </button>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "warn" | "error" | "ok";
  children: React.ReactNode;
}) {
  const map = {
    warn: "border-primary/40 text-primary",
    error: "border-danger/50 text-danger",
    ok: "border-success/40 text-success",
  } as const;
  return (
    <div
      className={`mt-6 rounded-xl border bg-surface-raised px-4 py-3 text-sm ${map[tone]}`}
    >
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-text-muted">{label}</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-lg outline-none focus:border-primary"
      />
    </label>
  );
}
