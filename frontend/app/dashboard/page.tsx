"use client";

import { useState } from "react";
import { Nav } from "@/components/Nav";
import { useEmberlend } from "@/lib/useEmberlend";
import { isContractConfigured } from "@/lib/contract";

type Tab = "borrow" | "lend";

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>("borrow");
  const [collateral, setCollateral] = useState("");
  const [borrowAmt, setBorrowAmt] = useState("");
  const [supplyAmt, setSupplyAmt] = useState("");
  const [repayAmt, setRepayAmt] = useState("");

  const { wallet, status, supply, borrow, repay } = useEmberlend();

  const ltv = 66; // 150% collateralization => ~66% max LTV
  const maxBorrow = collateral ? (Number(collateral) * ltv) / 100 : 0;
  const overMax = Number(borrowAmt) > maxBorrow;

  const connected = wallet !== null;
  const canAct = connected && isContractConfigured && !status.pending;

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-text-muted">
          {connected
            ? `Connected via ${wallet === "evm" ? "MetaMask / EVM" : "HashPack"}.`
            : "Connect a wallet to borrow, repay, or supply."}
        </p>

        {!isContractConfigured && (
          <Banner tone="warn">
            No contract address set. Deploy <code>EmberLendPool</code> and add{" "}
            <code>NEXT_PUBLIC_EMBERLEND_ADDRESS</code> (and{" "}
            <code>NEXT_PUBLIC_EMBERLEND_CONTRACT_ID</code> for HashPack) to{" "}
            <code>.env.local</code>.
          </Banner>
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

        <section className="ember-surface mt-6 p-8 shadow-ember-sm">
          <div className="relative z-10">
            {tab === "borrow" ? (
              <div className="space-y-6">
                <Field
                  label="Collateral (HBAR)"
                  value={collateral}
                  onChange={setCollateral}
                  placeholder="0.00"
                />
                <div className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text-muted">
                  Max borrow at {ltv}% LTV:{" "}
                  <span className="font-semibold text-primary">
                    {maxBorrow.toFixed(2)} HBAR
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
                <ActionButton
                  disabled={!canAct || overMax || !collateral || !borrowAmt}
                  pending={status.pending}
                  onClick={() => borrow(collateral, borrowAmt)}
                  label="Lock collateral & borrow"
                />
              </div>
            ) : (
              <div className="space-y-8">
                <div className="space-y-4">
                  <Field
                    label="Deposit to treasury (HBAR)"
                    value={supplyAmt}
                    onChange={setSupplyAmt}
                    placeholder="0.00"
                  />
                  <div className="rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm text-text-muted">
                    Est. supply APY:{" "}
                    <span className="font-semibold text-success">4.2%</span>
                  </div>
                  <ActionButton
                    disabled={!canAct || !supplyAmt}
                    pending={status.pending}
                    onClick={() => supply(supplyAmt)}
                    label="Supply liquidity"
                  />
                </div>

                <div className="border-t border-border pt-6">
                  <Field
                    label="Repay loan (HBAR)"
                    value={repayAmt}
                    onChange={setRepayAmt}
                    placeholder="Amount due incl. interest"
                  />
                  <div className="mt-4">
                    <ActionButton
                      disabled={!canAct || !repayAmt}
                      pending={status.pending}
                      onClick={() => repay(repayAmt)}
                      label="Repay & reclaim collateral"
                    />
                  </div>
                </div>
              </div>
            )}

            {status.error && <Banner tone="error">{status.error}</Banner>}
            {status.ref && (
              <Banner tone="ok">
                Submitted:{" "}
                <span className="break-all font-mono text-xs">{status.ref}</span>
              </Banner>
            )}
          </div>
        </section>
      </main>
    </>
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
