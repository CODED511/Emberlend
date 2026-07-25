import { TopicCreateTransaction, Hbar } from "@hashgraph/sdk";
import { getClient } from "./client.js";

/**
 * Creates the Hedera Consensus Service topic that stores Emberlend's
 * immutable credit history. Every borrow/repay is submitted as a message
 * here, giving each borrower a portable, tamper-evident track record —
 * the differentiator that a plain EVM lending app can't cheaply match.
 */
async function main() {
  const client = getClient();

  const tx = await new TopicCreateTransaction()
    .setTopicMemo("Emberlend credit history v1")
    .setMaxTransactionFee(new Hbar(5))
    .execute(client);

  const receipt = await tx.getReceipt(client);
  console.log(`✅ Credit topic created: ${receipt.topicId?.toString()}`);
  console.log(`   Add this to your .env as CREDIT_TOPIC_ID`);
  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
