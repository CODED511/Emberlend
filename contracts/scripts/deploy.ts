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
  console.log(`Verify on HashScan: https://hashscan.io/${network.name}/contract/${addr}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
