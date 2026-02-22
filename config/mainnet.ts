// Configuration des protocoles DeFi sur Base Mainnet
// Chain ID: 8453

export const NETWORK = {
  chainId: 8453,
  name: "Base",
  rpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org",
  explorerUrl: "https://basescan.org",
};

// Tokens principaux sur Base
export const TOKENS = {
  USDC: {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    decimals: 6,
    symbol: "USDC",
  },
  WETH: {
    address: "0x4200000000000000000000000000000000000006",
    decimals: 18,
    symbol: "WETH",
  },
  cbETH: {
    address: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22",
    decimals: 18,
    symbol: "cbETH",
  },
  USDbC: {
    address: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA",
    decimals: 6,
    symbol: "USDbC",
  },
  DAI: {
    address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    decimals: 18,
    symbol: "DAI",
  },
};

// Configuration Aave V3 sur Base
export const AAVE_V3 = {
  name: "Aave V3",
  protocol: "aave-v3",
  // Contrats principaux
  poolAddress: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
  poolDataProvider: "0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac",
  // Subgraph pour les données
  subgraphUrl: "https://api.studio.thegraph.com/query/60626/aave-v3-base/version/latest",
  // Assets supportés pour le lending
  assets: {
    USDC: {
      underlying: TOKENS.USDC.address,
      aToken: "0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB",
    },
    WETH: {
      underlying: TOKENS.WETH.address,
      aToken: "0xD4a0e0b9149BCee3C920d2E00b5dE09138fd8bb7",
    },
    cbETH: {
      underlying: TOKENS.cbETH.address,
      aToken: "0x3bf93770f2d4a8D5b5D78cB3B3A1e8a8d4f6D1e5",
    },
  },
};

// Configuration Morpho sur Base
export const MORPHO = {
  name: "Morpho",
  protocol: "morpho",
  // API GraphQL
  apiUrl: "https://api.morpho.org/graphql",
  // Vaults USDC populaires sur Base (chainId: 8453)
  vaults: {
    // Gauntlet USDC Prime - vault très populaire
    "gauntlet-usdc-prime": {
      address: "0x616a4E1db48e22028f6bbf20444Cd3b8e3273738",
      name: "Gauntlet USDC Prime",
      asset: "USDC",
    },
    // Steakhouse USDC
    "steakhouse-usdc": {
      address: "0xbeeF010f9cb27031ad51e3333f9af9c6b1228183",
      name: "Steakhouse USDC",
      asset: "USDC",
    },
    // Re7 WETH
    "re7-weth": {
      address: "0xa0E430870c4604CcfC7B38Ca7845B1FF653D0ff1",
      name: "Re7 WETH",
      asset: "WETH",
    },
  },
};

// Configuration Compound V3 sur Base
export const COMPOUND_V3 = {
  name: "Compound V3",
  protocol: "compound-v3",
  // Comet (marché principal)
  cometUsdc: "0xb125E6687d4313864e53df431d5425969c15Eb2F",
  cometWeth: "0x46e6b214b524310239732D51387075E0e70970bf",
  // Rewards
  rewardsContract: "0x123964802e6ABabBE1Bc9547D72A05b6AF55A377",
};

// Configuration Moonwell sur Base
export const MOONWELL = {
  name: "Moonwell",
  protocol: "moonwell",
  // Comptroller
  comptroller: "0xfBb21d0380beE3312B33c4353c8936a0F13EF26C",
  // mTokens
  mTokens: {
    mUSDC: "0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22",
    mWETH: "0x628ff693426583D9a7FB391E54366292F509D457",
    mcbETH: "0x3bf93770f2d4a8D5b5D78cB3B3A1e8a8d4f6D1e5",
  },
};

// Liste de tous les protocoles actifs
export const ACTIVE_PROTOCOLS = [
  {
    id: "aave-v3-usdc",
    name: "Aave V3 USDC",
    protocol: "aave-v3",
    asset: "USDC",
    enabled: true,
  },
  {
    id: "aave-v3-weth",
    name: "Aave V3 WETH",
    protocol: "aave-v3",
    asset: "WETH",
    enabled: true,
  },
  {
    id: "morpho-gauntlet-usdc",
    name: "Morpho Gauntlet USDC",
    protocol: "morpho",
    vaultId: "gauntlet-usdc-prime",
    asset: "USDC",
    enabled: true,
  },
  {
    id: "morpho-steakhouse-usdc",
    name: "Morpho Steakhouse USDC",
    protocol: "morpho",
    vaultId: "steakhouse-usdc",
    asset: "USDC",
    enabled: true,
  },
  {
    id: "compound-v3-usdc",
    name: "Compound V3 USDC",
    protocol: "compound-v3",
    asset: "USDC",
    enabled: true,
  },
  {
    id: "moonwell-usdc",
    name: "Moonwell USDC",
    protocol: "moonwell",
    asset: "USDC",
    enabled: false, // Désactivé par défaut
  },
];

// ABIs minimaux pour les interactions
export const ABIS = {
  // Aave Pool - pour supply/withdraw
  aavePool: [
    "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
    "function withdraw(address asset, uint256 amount, address to) external returns (uint256)",
    "function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, uint16 id, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))",
  ],
  
  // Aave Data Provider - pour les APY
  aaveDataProvider: [
    "function getReserveData(address asset) external view returns (uint256 unbacked, uint256 accruedToTreasuryScaled, uint256 totalAToken, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp)",
  ],

  // ERC20 standard
  erc20: [
    "function balanceOf(address account) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
  ],

  // ERC4626 Vault (Morpho, etc.)
  erc4626: [
    "function deposit(uint256 assets, address receiver) external returns (uint256 shares)",
    "function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares)",
    "function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets)",
    "function totalAssets() external view returns (uint256)",
    "function convertToAssets(uint256 shares) external view returns (uint256)",
    "function convertToShares(uint256 assets) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)",
  ],

  // Compound V3 Comet
  comet: [
    "function supply(address asset, uint256 amount) external",
    "function withdraw(address asset, uint256 amount) external",
    "function balanceOf(address account) external view returns (uint256)",
    "function getSupplyRate(uint256 utilization) external view returns (uint64)",
    "function getUtilization() external view returns (uint256)",
  ],
};

export type ProtocolConfig = typeof ACTIVE_PROTOCOLS[number];
