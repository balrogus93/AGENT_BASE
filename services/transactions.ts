// Service pour exécuter les transactions DeFi sur les protocoles
import { createPublicClient, http, encodeFunctionData, parseUnits, maxUint256 } from "viem";
import { base } from "viem/chains";
import { AAVE_V3, MORPHO, TOKENS, ABIS } from "@/config/mainnet";

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org"),
});

export interface TransactionRequest {
  to: string;
  data: string;
  value?: bigint;
}

export interface DepositParams {
  protocol: string;
  asset: string;
  amount: string; // En unités humaines (ex: "100" pour 100 USDC)
  userAddress: string;
  vaultAddress?: string; // Pour Morpho
}

export interface WithdrawParams {
  protocol: string;
  asset: string;
  amount: string; // En unités humaines ou "max"
  userAddress: string;
  vaultAddress?: string;
}

// ============================================
// APPROVE TOKEN
// ============================================
export function buildApproveTransaction(
  tokenAddress: string,
  spenderAddress: string,
  amount: bigint = maxUint256
): TransactionRequest {
  const data = encodeFunctionData({
    abi: [
      {
        name: "approve",
        type: "function",
        inputs: [
          { name: "spender", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [{ type: "bool" }],
      },
    ],
    functionName: "approve",
    args: [spenderAddress as `0x${string}`, amount],
  });

  return {
    to: tokenAddress,
    data,
  };
}

// ============================================
// AAVE V3 - SUPPLY
// ============================================
export function buildAaveSupplyTransaction(
  params: DepositParams
): TransactionRequest {
  const token = TOKENS[params.asset as keyof typeof TOKENS];
  if (!token) throw new Error(`Unknown asset: ${params.asset}`);

  const amount = parseUnits(params.amount, token.decimals);

  const data = encodeFunctionData({
    abi: [
      {
        name: "supply",
        type: "function",
        inputs: [
          { name: "asset", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "onBehalfOf", type: "address" },
          { name: "referralCode", type: "uint16" },
        ],
        outputs: [],
      },
    ],
    functionName: "supply",
    args: [
      token.address as `0x${string}`,
      amount,
      params.userAddress as `0x${string}`,
      0,
    ],
  });

  return {
    to: AAVE_V3.poolAddress,
    data,
  };
}

// ============================================
// AAVE V3 - WITHDRAW
// ============================================
export function buildAaveWithdrawTransaction(
  params: WithdrawParams
): TransactionRequest {
  const token = TOKENS[params.asset as keyof typeof TOKENS];
  if (!token) throw new Error(`Unknown asset: ${params.asset}`);

  // Si "max", utiliser type(uint256).max
  const amount = params.amount === "max" 
    ? maxUint256 
    : parseUnits(params.amount, token.decimals);

  const data = encodeFunctionData({
    abi: [
      {
        name: "withdraw",
        type: "function",
        inputs: [
          { name: "asset", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "to", type: "address" },
        ],
        outputs: [{ type: "uint256" }],
      },
    ],
    functionName: "withdraw",
    args: [
      token.address as `0x${string}`,
      amount,
      params.userAddress as `0x${string}`,
    ],
  });

  return {
    to: AAVE_V3.poolAddress,
    data,
  };
}

// ============================================
// MORPHO VAULT - DEPOSIT (ERC4626)
// ============================================
export function buildMorphoDepositTransaction(
  params: DepositParams
): TransactionRequest {
  if (!params.vaultAddress) {
    throw new Error("Vault address required for Morpho deposit");
  }

  const token = TOKENS[params.asset as keyof typeof TOKENS];
  if (!token) throw new Error(`Unknown asset: ${params.asset}`);

  const amount = parseUnits(params.amount, token.decimals);

  const data = encodeFunctionData({
    abi: [
      {
        name: "deposit",
        type: "function",
        inputs: [
          { name: "assets", type: "uint256" },
          { name: "receiver", type: "address" },
        ],
        outputs: [{ type: "uint256" }],
      },
    ],
    functionName: "deposit",
    args: [amount, params.userAddress as `0x${string}`],
  });

  return {
    to: params.vaultAddress,
    data,
  };
}

// ============================================
// MORPHO VAULT - WITHDRAW (ERC4626)
// ============================================
export function buildMorphoWithdrawTransaction(
  params: WithdrawParams
): TransactionRequest {
  if (!params.vaultAddress) {
    throw new Error("Vault address required for Morpho withdraw");
  }

  const token = TOKENS[params.asset as keyof typeof TOKENS];
  if (!token) throw new Error(`Unknown asset: ${params.asset}`);

  // Pour ERC4626, on utilise redeem pour retirer tout
  if (params.amount === "max") {
    const data = encodeFunctionData({
      abi: [
        {
          name: "redeem",
          type: "function",
          inputs: [
            { name: "shares", type: "uint256" },
            { name: "receiver", type: "address" },
            { name: "owner", type: "address" },
          ],
          outputs: [{ type: "uint256" }],
        },
      ],
      functionName: "redeem",
      args: [
        maxUint256, // Sera ajusté par le contrat
        params.userAddress as `0x${string}`,
        params.userAddress as `0x${string}`,
      ],
    });

    return {
      to: params.vaultAddress,
      data,
    };
  }

  const amount = parseUnits(params.amount, token.decimals);

  const data = encodeFunctionData({
    abi: [
      {
        name: "withdraw",
        type: "function",
        inputs: [
          { name: "assets", type: "uint256" },
          { name: "receiver", type: "address" },
          { name: "owner", type: "address" },
        ],
        outputs: [{ type: "uint256" }],
      },
    ],
    functionName: "withdraw",
    args: [
      amount,
      params.userAddress as `0x${string}`,
      params.userAddress as `0x${string}`,
    ],
  });

  return {
    to: params.vaultAddress,
    data,
  };
}

// ============================================
// HELPER: Vérifier allowance
// ============================================
export async function checkAllowance(
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string
): Promise<bigint> {
  const allowance = await publicClient.readContract({
    address: tokenAddress as `0x${string}`,
    abi: [
      {
        name: "allowance",
        type: "function",
        stateMutability: "view",
        inputs: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
        ],
        outputs: [{ type: "uint256" }],
      },
    ],
    functionName: "allowance",
    args: [ownerAddress as `0x${string}`, spenderAddress as `0x${string}`],
  });

  return allowance as bigint;
}

// ============================================
// HELPER: Récupérer balance token
// ============================================
export async function getTokenBalance(
  tokenAddress: string,
  userAddress: string
): Promise<bigint> {
  const balance = await publicClient.readContract({
    address: tokenAddress as `0x${string}`,
    abi: [
      {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ type: "uint256" }],
      },
    ],
    functionName: "balanceOf",
    args: [userAddress as `0x${string}`],
  });

  return balance as bigint;
}

// ============================================
// BUILDER GÉNÉRIQUE
// ============================================
export function buildDepositTransaction(params: DepositParams): TransactionRequest {
  switch (params.protocol) {
    case "aave-v3":
      return buildAaveSupplyTransaction(params);
    case "morpho":
      return buildMorphoDepositTransaction(params);
    default:
      throw new Error(`Unsupported protocol: ${params.protocol}`);
  }
}

export function buildWithdrawTransaction(params: WithdrawParams): TransactionRequest {
  switch (params.protocol) {
    case "aave-v3":
      return buildAaveWithdrawTransaction(params);
    case "morpho":
      return buildMorphoWithdrawTransaction(params);
    default:
      throw new Error(`Unsupported protocol: ${params.protocol}`);
  }
}

// ============================================
// REBALANCE COMPLET
// ============================================
export interface RebalanceParams {
  fromProtocol: string;
  toProtocol: string;
  asset: string;
  amount: string;
  userAddress: string;
  fromVaultAddress?: string;
  toVaultAddress?: string;
}

export function buildRebalanceTransactions(
  params: RebalanceParams
): TransactionRequest[] {
  const transactions: TransactionRequest[] = [];

  const token = TOKENS[params.asset as keyof typeof TOKENS];
  if (!token) throw new Error(`Unknown asset: ${params.asset}`);

  // 1. Withdraw from source protocol
  transactions.push(
    buildWithdrawTransaction({
      protocol: params.fromProtocol,
      asset: params.asset,
      amount: params.amount,
      userAddress: params.userAddress,
      vaultAddress: params.fromVaultAddress,
    })
  );

  // 2. Approve destination (si nécessaire)
  const spender = params.toProtocol === "aave-v3" 
    ? AAVE_V3.poolAddress 
    : params.toVaultAddress;
  
  if (spender) {
    transactions.push(
      buildApproveTransaction(token.address, spender)
    );
  }

  // 3. Deposit to destination protocol
  transactions.push(
    buildDepositTransaction({
      protocol: params.toProtocol,
      asset: params.asset,
      amount: params.amount,
      userAddress: params.userAddress,
      vaultAddress: params.toVaultAddress,
    })
  );

  return transactions;
}
