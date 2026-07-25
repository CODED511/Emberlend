#!/usr/bin/env node
/**
 * Emberlend env doctor.
 *
 * Verifies your secrets are present and well-formed WITHOUT printing them.
 * Only ever reports length + a masked fingerprint, so output is safe to paste
 * into a chat or an issue.
 *
 *   node scripts/check-env.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

function parseEnv(path) {
  if (!existsSync(path)) return null;
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

/** Masked fingerprint — never reveals the secret. */
function mask(v) {
  if (!v) return "";
  if (v.length <= 8) return "*".repeat(v.length);
  return `${v.slice(0, 4)}…${v.slice(-4)} ${DIM}(${v.length} chars)${RESET}`;
}

const isPlaceholder = (v) =>
  !v || /PASTE_|your_|xxxxx|^0\.0\.0$|^0x0{40}$/i.test(v);

const checks = [
  {
    file: "contracts/.env",
    vars: [
      {
        key: "OPERATOR_EVM_PRIVATE_KEY",
        required: true,
        validate: (v) =>
          /^0x[0-9a-fA-F]{64}$/.test(v)
            ? null
            : "must be 0x + 64 hex chars (HEX Encoded Private Key)",
      },
    ],
  },
  {
    file: "hedera/.env",
    vars: [
      { key: "HEDERA_NETWORK", required: true },
      {
        key: "OPERATOR_ID",
        required: true,
        validate: (v) =>
          /^\d+\.\d+\.\d+$/.test(v) ? null : "must look like 0.0.123456",
      },
      { key: "OPERATOR_KEY", required: true },
    ],
  },
  {
    file: "frontend/.env.local",
    vars: [
      { key: "NEXT_PUBLIC_REOWN_PROJECT_ID", required: true },
      { key: "NEXT_PUBLIC_HEDERA_NETWORK", required: true },
      { key: "NEXT_PUBLIC_EMBERLEND_ADDRESS", required: false },
    ],
  },
];

console.log("\n🔥 Emberlend env check\n");
let ready = true;

for (const { file, vars } of checks) {
  const env = parseEnv(join(root, file));
  console.log(`${file}`);

  if (!env) {
    console.log(`  ${RED}✗ file missing${RESET}\n`);
    ready = false;
    continue;
  }

  for (const { key, required, validate } of vars) {
    const val = env[key];
    if (isPlaceholder(val)) {
      const icon = required ? `${RED}✗` : `${YELLOW}○`;
      const note = required ? "not set (still a placeholder)" : "not set yet";
      console.log(`  ${icon} ${key} — ${note}${RESET}`);
      if (required) ready = false;
      continue;
    }
    const err = validate?.(val);
    if (err) {
      console.log(`  ${RED}✗ ${key} — ${err}${RESET}`);
      ready = false;
    } else {
      console.log(`  ${GREEN}✓${RESET} ${key} — ${mask(val)}`);
    }
  }
  console.log("");
}

console.log(
  ready
    ? `${GREEN}All set — ready to deploy.${RESET}\n`
    : `${YELLOW}Fill in the ✗ items above, then re-run.${RESET}\n`
);
process.exit(ready ? 0 : 1);
