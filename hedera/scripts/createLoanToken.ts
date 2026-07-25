import {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  Hbar,
  PrivateKey,
  AccountId,
} from "@hashgraph/sdk";
import { getClient } from "./client.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Creates the Emberlend loan/stable unit as a native HTS fungible token.
 * This is the idiomatic Hedera alternative to deploying an ERC-20:
 * cheaper, faster finality, and native compliance keys.
 */
async function main() {
  const client = getClient();
  const treasuryId = AccountId.fromString(process.env.OPERATOR_ID!);
  const adminKey = PrivateKey.fromStringECDSA(process.env.OPERATOR_KEY!);

  const tx = await new TokenCreateTransaction()
    .setTokenName("Emberlend USD")
    .setTokenSymbol("eUSD")
    .setTokenType(TokenType.FungibleCommon)
    .setDecimals(6)
    .setInitialSupply(1_000_000_000) // 1,000 eUSD at 6 decimals
    .setTreasuryAccountId(treasuryId)
    .setSupplyType(TokenSupplyType.Infinite)
    .setAdminKey(adminKey.publicKey)
    .setSupplyKey(adminKey.publicKey)
    .setMaxTransactionFee(new Hbar(30))
    .freezeWith(client);

  const signed = await tx.sign(adminKey);
  const resp = await signed.execute(client);
  const receipt = await resp.getReceipt(client);

  console.log(`✅ Loan token (eUSD) created: ${receipt.tokenId?.toString()}`);
  console.log(`   Add this to your .env as LOAN_TOKEN_ID`);
  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
