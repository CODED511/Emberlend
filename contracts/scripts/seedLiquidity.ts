import { ethers } from "hardhat";

/**
 * Tops the market up with borrowable liquidity for the given tokens.
 *
 * Split out from deployMarket so a dropped RPC socket mid-deploy can be
 * recovered without redeploying everything — the Hashio public relay closes
 * connections fairly readily under a long run of sequential transactions.
 *
 *   npx hardhat run scripts/seedLiquidity.ts --network hederaTestnet
 */
const MARKET = process.env.MARKET_ADDRESS ?? "";
const TOKENS = (process.env.SEED_TOKENS ?? "").split(",").filter(Boolean);

async function main() {
  if (!MARKET) throw new Error("Set MARKET_ADDRESS");
  if (TOKENS.length === 0) throw new Error("Set SEED_TOKENS (comma separated)");

  const [signer] = await ethers.getSigners();
  const market = await ethers.getContractAt("EmberLendMarket", MARKET);

  for (const addr of TOKENS) {
    const token = await ethers.getContractAt("TestToken", addr);
    const symbol = await token.symbol();

    let bal = await token.balanceOf(signer.address);
    if (bal === 0n) {
      console.log(`${symbol}: drawing from faucet…`);
      await (await token.faucet()).wait();
      bal = await token.balanceOf(signer.address);
    }

    const already = await market.supplied(signer.address, addr);
    if (already > 0n) {
      console.log(`${symbol}: already seeded (${already}), skipping`);
      continue;
    }

    await (await token.approve(MARKET, bal)).wait();
    await (await market.supply(addr, bal)).wait();
    console.log(`${symbol}: supplied ${ethers.formatUnits(bal, await token.decimals())}`);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
