/**
 * EmberLendPool contract handles.
 *  - address: EVM 0x address (used by wagmi / MetaMask path)
 *  - contractId: Hedera 0.0.x id (used by the HashPack / SDK path)
 * Fill both in frontend/.env.local after deploying.
 */
export const EMBERLEND_ADDRESS = (process.env.NEXT_PUBLIC_EMBERLEND_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const EMBERLEND_CONTRACT_ID =
  process.env.NEXT_PUBLIC_EMBERLEND_CONTRACT_ID ?? "0.0.0";

export const isContractConfigured =
  EMBERLEND_ADDRESS !== "0x0000000000000000000000000000000000000000";

export const emberlendAbi = [
  {
    type: "function",
    name: "supply",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "borrow",
    stateMutability: "payable",
    inputs: [{ name: "principal", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "repay",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "amountDue",
    stateMutability: "view",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "availableLiquidity",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "loans",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "collateral", type: "uint256" },
      { name: "principal", type: "uint256" },
      { name: "startedAt", type: "uint256" },
      { name: "active", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "accruedInterest",
    stateMutability: "view",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalSupplied",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalBorrowed",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "COLLATERAL_RATIO_BPS",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "ANNUAL_RATE_BPS",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
