import Link from "next/link";
import { Nav } from "@/components/Nav";

const CONTRACT_ID =
  process.env.NEXT_PUBLIC_EMBERLEND_CONTRACT_ID ?? "not deployed";

const stats = [
  { label: "Collateral ratio", value: "150% minimum" },
  { label: "Powered by", value: "Hedera HTS + HCS" },
  { label: "Contract", value: CONTRACT_ID },
];

export default function Home() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-6xl px-6">
        {/* Hero */}
        <section className="ember-surface mt-10 px-8 py-16 shadow-ember sm:px-14 sm:py-20">
          <div className="relative z-10 max-w-2xl">
            <a
              href={`https://hashscan.io/testnet/contract/${CONTRACT_ID}`}
              target="_blank"
              rel="noreferrer"
              className="pill inline-block px-3 py-1 text-xs hover:brightness-125"
            >
              🟢 LIVE ON HEDERA TESTNET
            </a>
            <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Small sparks.
              <br />
              <span className="text-primary">Real growth.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-text-muted">
              Emberlend is a micro-lending dApp on Hedera. Collateralize an
              asset, borrow in seconds, and build an on-chain credit history —
              designed for farmers and entrepreneurs the banks forgot.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/dashboard"
                className="ember-btn rounded-2xl px-8 py-4 text-base"
              >
                Launch app →
              </Link>
              <a
                href="#how"
                className="rounded-2xl border border-border px-8 py-4 text-base text-text-muted hover:text-text"
              >
                How it works
              </a>
            </div>
          </div>
        </section>

        {/* Stat pills */}
        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="ember-surface px-6 py-5"
            >
              <div className="relative z-10">
                <p className="text-xs uppercase tracking-wide text-text-muted">
                  {s.label}
                </p>
                <p className="mt-1 text-xl font-bold text-primary">{s.value}</p>
              </div>
            </div>
          ))}
        </section>

        {/* How it works */}
        <section id="how" className="mt-20 mb-24">
          <h2 className="text-3xl font-extrabold tracking-tight">
            How Emberlend works
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {[
              {
                n: "01",
                t: "Lock collateral",
                d: "Deposit an HTS token or NFT as collateral. It's held in the LendingPool until you repay.",
              },
              {
                n: "02",
                t: "Borrow instantly",
                d: "Draw a micro-loan against your collateral at a market-based dynamic rate. Funds hit your wallet in seconds.",
              },
              {
                n: "03",
                t: "Build credit",
                d: "Every loan and repayment is written to a Hedera Consensus Service topic — an immutable, portable credit history.",
              },
            ].map((c) => (
              <div key={c.n} className="ember-surface px-6 py-7">
                <div className="relative z-10">
                  <span className="text-sm font-bold text-primary-dim">
                    {c.n}
                  </span>
                  <h3 className="mt-2 text-xl font-bold">{c.t}</h3>
                  <p className="mt-2 text-sm text-text-muted">{c.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-text-muted">
        Emberlend · Micro-lending on Hedera ·{" "}
        <a
          href={`https://hashscan.io/testnet/contract/${CONTRACT_ID}`}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          {CONTRACT_ID} on HashScan
        </a>
      </footer>
    </>
  );
}
