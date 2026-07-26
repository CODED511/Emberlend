import { ethers } from "hardhat";

/**
 * Recovers HBAR stranded in the original EmberLendPool.
 *
 * That contract predates EmberLendMarket and tracked supply as a single
 * global counter, so there is no per-lender claim to withdraw against — only
 * the owner-only withdraw(). This drains it back to the owner.
 *
 *   POOL_ADDRESS=0x… npx hardhat run scripts/recoverPool.ts --network hederaTestnet
 */
const POOL =
  process.env.POOL_ADDRESS ?? "0xABF8cDFe3f168077ccebDd640A6fBeE15d3cCcd7";

async function main() {
  const [signer] = await ethers.getSigners();
  const pool = await ethers.getContractAt("EmberLendPool", POOL);

  const owner = await pool.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Not the owner. Pool owner is ${owner}`);
  }

  // Balances here are tinybar: the relay divides msg.value by 1e10 before the
  // contract sees it, so address(this).balance is 8 dp, not 18.
  const balance = await pool.availableLiquidity();
  if (balance === 0n) {
    console.log("Pool is already empty.");
    return;
  }
  console.log(`Pool holds ${ethers.formatUnits(balance, 8)} HBAR`);

  const before = await ethers.provider.getBalance(signer.address);
  await (await pool.withdraw(balance)).wait();
  const after = await ethers.provider.getBalance(signer.address);

  console.log(`Recovered to ${signer.address}`);
  console.log(`Wallet: ${ethers.formatEther(before)} -> ${ethers.formatEther(after)} HBAR`);
  console.log(`Pool now holds ${await pool.availableLiquidity()} tinybar`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
