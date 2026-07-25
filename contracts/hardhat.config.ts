import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const OPERATOR_KEY = process.env.OPERATOR_EVM_PRIVATE_KEY ?? "";

/**
 * Networks:
 *  - hardhat / localhost: plain EVM for fast unit tests (no HTS/HCS).
 *  - localHedera: Hedera Local Node JSON-RPC relay (needs Docker running).
 *  - hederaTestnet: Hedera testnet via Hashio public relay.
 */
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    localHedera: {
      url: "http://localhost:7546",
      accounts: OPERATOR_KEY ? [OPERATOR_KEY] : [],
      chainId: 298,
    },
    hederaTestnet: {
      url: "https://testnet.hashio.io/api",
      accounts: OPERATOR_KEY ? [OPERATOR_KEY] : [],
      chainId: 296,
    },
  },
};

export default config;
