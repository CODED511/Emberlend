# Emberlend 🔥

**Small sparks. Real growth.** — a micro-lending dApp on **Hedera** for farmers and
entrepreneurs the banks forgot. Collateralize an asset, borrow in seconds, and build a
portable on-chain credit history.

> Localhost-first build. Idiomatic Hedera path: native **HTS** tokens, **HCS** credit
> history, and an EVM lending pool on the Hedera Smart Contract Service.

---

## Monorepo layout

```
Emberlend/
├── frontend/     Next.js 14 + Tailwind UI (ember theme). Runs standalone today.
├── contracts/    Hardhat + Solidity (EmberLendPool). Deploys to Hedera EVM.
└── hedera/       Hedera SDK scripts — HTS loan token + HCS credit topic.
```

## Why these Hedera services (the "idiomatic path")

| Concern              | Generic EVM way        | Emberlend on Hedera                    |
| -------------------- | ---------------------- | -------------------------------------- |
| Loan/stable token    | ERC-20 contract        | **HTS** fungible token (`eUSD`)        |
| Collateral asset     | ERC-721                | **HTS** NFT (v2)                        |
| Credit history       | Events + off-chain DB  | **HCS** topic — immutable & portable   |
| Lending logic        | Solidity               | Solidity on **Hedera Smart Contract Service** |

## Getting started (localhost)

### 1. Frontend

```bash
cd frontend
npm install --legacy-peer-deps
cp .env.local.example .env.local   # add your Reown project id
npm run dev                        # http://localhost:3000
```

**Get a Reown project id** (required — both wallets use the WalletConnect relay):
sign up free at <https://cloud.reown.com>, create a project, and paste the id into
`NEXT_PUBLIC_REOWN_PROJECT_ID`. Without it the relay returns 403 and neither
MetaMask nor HashPack can pair.

### Wallets

Emberlend supports two connection paths from one button:

| Path         | Library            | Wallets                          |
| ------------ | ------------------ | -------------------------------- |
| EVM          | Reown AppKit + wagmi | MetaMask, Rainbow, Coinbase, any WalletConnect wallet |
| Native Hedera| HashConnect        | HashPack                         |

`lib/useEmberlend.ts` routes borrow/repay/supply to whichever is connected —
wagmi `writeContract` for EVM, `ContractExecuteTransaction` for HashPack.

### 2. Contracts

```bash
cd contracts
npm install
cp .env.example .env   # add your deployer key
npx hardhat compile
npx hardhat test       # 23 passing
npx hardhat coverage   # 100% stmts / lines / funcs
```

Deploy once you have a funded key:

```bash
npx hardhat run scripts/deploy.ts --network hederaTestnet
```

Then paste the printed address into `frontend/.env.local` as
`NEXT_PUBLIC_EMBERLEND_ADDRESS`, and its `0.0.x` form as
`NEXT_PUBLIC_EMBERLEND_CONTRACT_ID`.

### 3. Hedera services (HTS + HCS)

```bash
cd hedera
npm install
cp .env.example .env   # add OPERATOR_ID / OPERATOR_KEY
npm run create:token   # creates eUSD (HTS)  -> LOAN_TOKEN_ID
npm run create:topic   # creates credit log  -> CREDIT_TOPIC_ID
```

### Local Hedera network (full HTS/HCS locally)

Requires **Docker Desktop**. Then:

```bash
npx @hashgraph/hedera-local start
```

This gives you consensus + mirror node + JSON-RPC relay on localhost. Set
`HEDERA_NETWORK=local` (SDK) and deploy contracts to the `localHedera` network.
No Docker yet? Use **Hedera testnet** — everything works the same, just set the
network to `testnet`.

## Status

- [x] Themed frontend (landing + borrow/lend dashboard)
- [x] `EmberLendPool` lending contract (collateral, borrow, repay, interest)
- [x] HTS loan-token + HCS credit-topic scripts
- [x] Dual wallet connect — Reown/wagmi (MetaMask) + HashConnect (HashPack)
- [x] Frontend ↔ contract wiring (`lib/useEmberlend.ts`)
- [x] Reown project id wired (`.env.local`)
- [x] Contracts compile; 23 tests passing at 100% statement coverage
- [ ] Deploy to Hedera testnet + HashScan verification (needs a funded key)
- [ ] Read live loan state into the dashboard
- [ ] HTS token as the borrow asset (v2)
- [ ] Mirror `Borrowed`/`Repaid` events into the HCS credit topic
```
