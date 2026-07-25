import { Client, AccountId, PrivateKey } from "@hashgraph/sdk";
import dotenv from "dotenv";

dotenv.config();

/**
 * Parses an operator key that may arrive in any of the formats the Hedera
 * portal hands out: raw hex ECDSA (with or without 0x), or a DER-encoded
 * string for either curve.
 *
 * Emberlend expects an **ECDSA (secp256k1)** account, because the same key is
 * reused to deploy the EVM contract via Hardhat and to sign SDK transactions.
 * An Ed25519 key works for HTS/HCS but cannot sign EVM deploys, so we detect
 * that case and say so plainly rather than failing deep inside the SDK.
 */
function parseOperatorKey(raw: string): PrivateKey {
  const key = raw.trim();

  if (!key || /^PASTE_/i.test(key)) {
    throw new Error(
      "OPERATOR_KEY is not set. Fill in hedera/.env — see README step 3."
    );
  }

  // Ed25519 DER keys start with this fixed prefix.
  if (key.startsWith("302e020100300506032b657004220420")) {
    throw new Error(
      "OPERATOR_KEY looks like an Ed25519 key, but Emberlend needs ECDSA " +
        "(secp256k1) so the same account can deploy the EVM contract.\n" +
        "Create a new testnet account on portal.hedera.com with key type " +
        "ECDSA and use its HEX Encoded Private Key."
    );
  }

  // ECDSA DER keys start with 3030...; raw hex is 64 chars (optionally 0x).
  try {
    if (key.startsWith("3030") || key.startsWith("30 2e")) {
      return PrivateKey.fromStringDer(key);
    }
    return PrivateKey.fromStringECDSA(key);
  } catch (e) {
    throw new Error(
      `Could not parse OPERATOR_KEY (${key.length} chars). Expected a HEX ` +
        `Encoded Private Key: 64 hex characters, optionally 0x-prefixed.`
    );
  }
}

function parseOperatorId(raw?: string): AccountId {
  const id = raw?.trim();
  if (!id || /^PASTE_/i.test(id)) {
    throw new Error(
      "OPERATOR_ID is not set. Fill in hedera/.env — see README step 3."
    );
  }
  if (!/^\d+\.\d+\.\d+$/.test(id)) {
    throw new Error(
      `OPERATOR_ID must look like 0.0.123456 — got "${id}".`
    );
  }
  return AccountId.fromString(id);
}

/**
 * Builds a Hedera SDK client from env.
 * HEDERA_NETWORK = local | testnet
 *
 * Local requires the Hedera Local Node (Docker) running. The operator account
 * and key are printed by `npx @hashgraph/hedera-local start`.
 */
export function getClient(): Client {
  const net = process.env.HEDERA_NETWORK ?? "testnet";
  const operatorId = parseOperatorId(process.env.OPERATOR_ID);
  const operatorKey = parseOperatorKey(process.env.OPERATOR_KEY ?? "");

  const client =
    net === "local"
      ? Client.forNetwork({ "127.0.0.1:50211": new AccountId(3) })
      : Client.forTestnet();

  client.setOperator(operatorId, operatorKey);
  return client;
}
