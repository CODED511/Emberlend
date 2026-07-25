import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying EmberLendPool to "${network.name}"`);
  console.log(`Deployer: ${deployer.address}`);

  const Pool = await ethers.getContractFactory("EmberLendPool");
  const pool = await Pool.deploy();
  await pool.waitForDeployment();

  const addr = await pool.getAddress();
  console.log(`EmberLendPool deployed at: ${addr}`);

  // HashScan uses "testnet"/"mainnet", not our Hardhat network names.
  const scan =
    network.name === "hederaTestnet"
      ? "testnet"
      : network.name === "hederaMainnet"
        ? "mainnet"
        : null;

  if (scan) {
    console.log(`HashScan: https://hashscan.io/${scan}/contract/${addr}`);
    // The 0.0.x id appears on the mirror node a few seconds after deployment.
    console.log(
      `Mirror node: https://${scan}.mirrornode.hedera.com/api/v1/contracts/${addr}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
