import { TopicMessageSubmitTransaction } from "@hashgraph/sdk";
import { getClient } from "./client.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Submits a single credit event to the HCS topic.
 * In production this is called by a worker that listens to EmberLendPool's
 * Borrowed/Repaid events and mirrors them onto the topic.
 *
 * Usage: npm run log:event -- borrow 0xabc... 25.0
 */
async function main() {
  const [action, borrower, amount] = process.argv.slice(2);
  if (!action || !borrower || !amount) {
    console.error("Usage: log:event -- <borrow|repay> <address> <amount>");
    process.exit(1);
  }

  const client = getClient();
  const topicId = process.env.CREDIT_TOPIC_ID!;

  const payload = JSON.stringify({
    v: 1,
    action,
    borrower,
    amount,
    ts: new Date().toISOString(),
  });

  const tx = await new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(payload)
    .execute(client);

  const receipt = await tx.getReceipt(client);
  console.log(`✅ Logged credit event (status ${receipt.status.toString()})`);
  console.log(`   ${payload}`);
  client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
