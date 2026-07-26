import { ethers } from "hardhat";

/**
 * Supplies HBAR into the market so the native asset has borrowable liquidity.
 *
 *   MARKET_ADDRESS=0x… SEED_HBAR=40 npx hardhat run scripts/seedNative.ts --network hederaTestnet
 */
const MARKET = process.env.MARKET_ADDRESS ?? "";
const AMOUNT = process.env.SEED_HBAR ?? "40";

async function main() {
  if (!MARKET) throw new Error("Set MARKET_ADDRESS");

  const [signer] = await ethers.getSigners();
  const market = await ethers.getContractAt("EmberLendMarket", MARKET);

  const already = await market.supplied(signer.address, ethers.ZeroAddress);
  if (already > 0n) {
    console.log(`Already supplied ${ethers.formatEther(already)} HBAR, skipping.`);
    return;
  }

  await (
    await market.supply(ethers.ZeroAddress, 0, {
      value: ethers.parseEther(AMOUNT),
    })
  ).wait();
  console.log(`Supplied ${AMOUNT} HBAR`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
