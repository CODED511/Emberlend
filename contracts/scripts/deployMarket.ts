import { ethers, network } from "hardhat";

const NATIVE = ethers.ZeroAddress;
const usd = (n: string) => ethers.parseUnits(n, 8);

/**
 * Test assets for the Hedera testnet market. Prices are indicative only —
 * setPrice() can move them later to demo health-factor changes.
 *
 * ltv     — borrowing power granted by this collateral
 * liqThr  — how far it may fall before the position is liquidatable
 */
const TOKENS = [
  {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    faucet: 1000,
    price: "1",
    supplyBps: 450,
    borrowBps: 700,
    ltv: 8000,
    liqThr: 8500,
  },
  {
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6,
    faucet: 1000,
    price: "1",
    supplyBps: 420,
    borrowBps: 720,
    ltv: 8000,
    liqThr: 8500,
  },
  {
    name: "SaucerSwap",
    symbol: "SAUCE",
    decimals: 6,
    faucet: 5000,
    price: "0.0180",
    supplyBps: 90,
    borrowBps: 1150,
    ltv: 4000,
    liqThr: 5500,
  },
  {
    name: "Wrapped BTC",
    symbol: "WBTC",
    decimals: 8,
    faucet: 1,
    price: "96000",
    supplyBps: 30,
    borrowBps: 480,
    ltv: 7000,
    liqThr: 7500,
  },
  {
    name: "Wrapped ETH",
    symbol: "WETH",
    decimals: 18,
    faucet: 10,
    price: "3200",
    supplyBps: 40,
    borrowBps: 500,
    ltv: 7500,
    liqThr: 8000,
  },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying EmberLendMarket to "${network.name}"`);
  console.log(`Deployer: ${deployer.address}\n`);

  const Market = await ethers.getContractFactory("EmberLendMarket");
  const market = await Market.deploy();
  await market.waitForDeployment();
  const marketAddr = await market.getAddress();
  console.log(`EmberLendMarket: ${marketAddr}\n`);

  // HBAR is the native asset. 18 dp here because the JSON-RPC relay presents
  // native value to the EVM in weibar.
  console.log("Listing HBAR (native)…");
  await (
    await market.listMarket(NATIVE, 18, usd("0.20"), 120, 500, 6000, 7500)
  ).wait();

  const Token = await ethers.getContractFactory("TestToken");
  const deployed: Record<string, string> = {};

  for (const t of TOKENS) {
    const token = await Token.deploy(t.name, t.symbol, t.decimals, t.faucet);
    await token.waitForDeployment();
    const addr = await token.getAddress();
    deployed[t.symbol] = addr;

    await (
      await market.listMarket(
        addr,
        t.decimals,
        usd(t.price),
        t.supplyBps,
        t.borrowBps,
        t.ltv,
        t.liqThr,
      )
    ).wait();
    console.log(`  ${t.symbol.padEnd(5)} ${addr}`);
  }

  // Seed borrowable liquidity so the market is usable immediately.
  console.log("\nSeeding liquidity…");
  for (const t of TOKENS) {
    const token = Token.attach(deployed[t.symbol]) as any;
    await (await token.faucet()).wait();
    const bal = await token.balanceOf(deployer.address);
    await (await token.approve(marketAddr, bal)).wait();
    await (await market.supply(deployed[t.symbol], bal)).wait();
    console.log(`  supplied ${t.symbol}`);
  }

  const scan =
    network.name === "hederaTestnet"
      ? "testnet"
      : network.name === "hederaMainnet"
        ? "mainnet"
        : null;

  console.log("\n--- frontend/.env.local ---");
  console.log(`NEXT_PUBLIC_MARKET_ADDRESS=${marketAddr}`);
  for (const [sym, addr] of Object.entries(deployed)) {
    console.log(`NEXT_PUBLIC_TOKEN_${sym}=${addr}`);
  }
  if (scan) {
    console.log(`\nHashScan: https://hashscan.io/${scan}/contract/${marketAddr}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
