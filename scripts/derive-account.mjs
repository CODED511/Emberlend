#!/usr/bin/env node
/**
 * Derives the EVM address from OPERATOR_EVM_PRIVATE_KEY in contracts/.env,
 * then asks the Hedera testnet mirror node which account ID that address maps
 * to — saving you from copying the ID by hand.
 *
 * Prints only the PUBLIC address and account id. Never prints the key.
 *
 *   node scripts/derive-account.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "contracts", "package.json"));
const { ethers } = require("ethers");

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

function readEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i > -1) out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const contractsEnvPath = join(root, "contracts", ".env");
const hederaEnvPath = join(root, "hedera", ".env");

const pk = readEnv(contractsEnvPath).OPERATOR_EVM_PRIVATE_KEY;
if (!pk || /^PASTE_/i.test(pk)) {
  console.error(`${RED}OPERATOR_EVM_PRIVATE_KEY not set in contracts/.env${RESET}`);
  process.exit(1);
}

const wallet = new ethers.Wallet(pk);
const address = wallet.address; // public — safe to print
console.log(`\n🔥 Derived EVM address: ${GREEN}${address}${RESET}`);

const url = `https://testnet.mirrornode.hedera.com/api/v1/accounts/${address}`;
console.log(`   Querying mirror node…\n`);

const res = await fetch(url);
if (!res.ok) {
  console.log(`${YELLOW}No account found for that address on testnet.${RESET}`);
  console.log(`This usually means the account hasn't been created or funded yet.`);
  console.log(`Create one at https://portal.hedera.com (key type: ECDSA), then`);
  console.log(`make sure its HEX key matches the one in contracts/.env.\n`);
  process.exit(1);
}

const data = await res.json();
const accountId = data.account;
const balance = (data.balance?.balance ?? 0) / 1e8;

console.log(`${GREEN}✓ Account ID:${RESET} ${accountId}`);
console.log(`${GREEN}✓ Balance:${RESET}   ${balance} HBAR`);
console.log(`  HashScan:   https://hashscan.io/testnet/account/${accountId}\n`);

// Write both values into hedera/.env, preserving everything else.
let hederaEnv = readFileSync(hederaEnvPath, "utf8");
hederaEnv = hederaEnv
  .replace(/^OPERATOR_ID=.*$/m, `OPERATOR_ID=${accountId}`)
  .replace(/^OPERATOR_KEY=.*$/m, `OPERATOR_KEY=${pk}`);
writeFileSync(hederaEnvPath, hederaEnv);

console.log(`${GREEN}✓ Wrote OPERATOR_ID and OPERATOR_KEY into hedera/.env${RESET}`);

if (balance === 0) {
  console.log(
    `\n${YELLOW}Balance is 0 — fund this account from the portal before deploying.${RESET}`
  );
}
console.log("");
