import { ethers } from "hardhat";

/**
 * Corrects the HBAR market's decimals to 8.
 *
 * The relay accepts a transaction's `value` in 18-dp weibar, which makes it
 * tempting to list HBAR as an 18-dp asset. But it divides by 1e10 before the
 * contract runs, so msg.value and address(this).balance are both 8-dp tinybar.
 * Listed as 18, every HBAR figure came out 1e10 too small and priced at $0.
 *
 * listMarket() updates a market in place when it is already listed, so this is
 * safe to run against the live contract.
 *
 *   MARKET_ADDRESS=0x… npx hardhat run scripts/relistNative.ts --network hederaTestnet
 */
const MARKET = process.env.MARKET_ADDRESS ?? "";
const usd = (n: string) => ethers.parseUnits(n, 8);

async function main() {
  if (!MARKET) throw new Error("Set MARKET_ADDRESS");

  const market = await ethers.getContractAt("EmberLendMarket", MARKET);
  const before = await market.markets(ethers.ZeroAddress);
  console.log(`HBAR decimals before: ${before.decimals}`);

  await (
    await market.listMarket(
      ethers.ZeroAddress,
      8, // tinybar
      usd("0.20"),
      120,
      500,
      6000,
      7500,
    )
  ).wait();

  const after = await market.markets(ethers.ZeroAddress);
  console.log(`HBAR decimals after:  ${after.decimals}`);
  console.log(`totalSupplied (tinybar): ${after.totalSupplied}`);
  console.log(`= ${ethers.formatUnits(after.totalSupplied, 8)} HBAR`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
