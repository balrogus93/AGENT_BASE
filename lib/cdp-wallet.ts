import { CdpClient } from "@coinbase/cdp-sdk";
import { createPublicClient, http, parseEther } from "viem";
import { baseSepolia, base } from "viem/chains";

// CDP Client Singleton
let cdpClient: CdpClient | null = null;

export function getCdpClient(): CdpClient {
  if (!cdpClient) {
    cdpClient = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID!,
      apiKeySecret: process.env.CDP_API_KEY_SECRET!,
      walletSecret: process.env.CDP_WALLET_SECRET!,
    });
  }
  return cdpClient;
}

// Public client for transaction confirmation
export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

export const mainnetPublicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Types
export interface WalletAccount {
  address: string;
  name: string;
  network: string;
}

export interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

// Create a new EVM account
export async function createEvmAccount(name?: string): Promise<WalletAccount> {
  const cdp = getCdpClient();
  const accountName = name || `agent-wallet-${Date.now()}`;

  const account = await cdp.evm.createAccount({
    name: accountName,
  });

  return {
    address: account.address,
    name: accountName,
    network: "base-sepolia",
  };
}

// Get or create account by name
export async function getOrCreateAccount(name: string): Promise<WalletAccount> {
  const cdp = getCdpClient();

  const account = await cdp.evm.getOrCreateAccount({
    name,
  });

  return {
    address: account.address,
    name,
    network: "base-sepolia",
  };
}

// Get account balance
export async function getWalletBalance(address: string): Promise<bigint> {
  const balance = await publicClient.getBalance({
    address: address as `0x${string}`,
  });
  return balance;
}

// Request testnet funds from faucet
export async function requestFaucet(
  address: string,
  token: "eth" | "usdc" = "eth"
): Promise<TransactionResult> {
  try {
    const cdp = getCdpClient();

    const { transactionHash } = await cdp.evm.requestFaucet({
      address: address as `0x${string}`,
      network: "base-sepolia",
      token,
    });

    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({
      hash: transactionHash as `0x${string}`,
    });

    return {
      success: true,
      transactionHash,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// Send transaction
export async function sendTransaction(params: {
  fromAddress: string;
  toAddress: string;
  value: string; // in ETH
  network?: string;
}): Promise<TransactionResult> {
  try {
    const cdp = getCdpClient();

    const { transactionHash } = await cdp.evm.sendTransaction({
      address: params.fromAddress as `0x${string}`,
      network: (params.network || "base-sepolia") as any,
      transaction: {
        to: params.toAddress as `0x${string}`,
        value: parseEther(params.value),
      },
    });

    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({
      hash: transactionHash as `0x${string}`,
    });

    return {
      success: true,
      transactionHash,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// Sign message (EIP-191)
export async function signMessage(
  address: string,
  message: string
): Promise<{ signature: string } | { error: string }> {
  try {
    const cdp = getCdpClient();

    const signature = await cdp.evm.signMessage({
      address: address as `0x${string}`,
      message,
    });

    return { signature };
  } catch (error: any) {
    return { error: error.message };
  }
}

// Export for DeFi operations
export async function executeDefiTransaction(params: {
  action: "deposit" | "withdraw";
  protocol: string;
  amount: string;
  fromAddress: string;
}): Promise<TransactionResult> {
  // Protocol contract addresses (Base Sepolia testnet examples)
  const protocolContracts: Record<string, string> = {
    aave: "0x...", // Add real Aave pool address
    morpho: "0x...", // Add real Morpho address
  };

  const contractAddress = protocolContracts[params.protocol.toLowerCase()];

  if (!contractAddress || contractAddress === "0x...") {
    return {
      success: false,
      error: `Protocol ${params.protocol} not configured`,
    };
  }

  // For now, return mock - real implementation needs contract ABI encoding
  console.log(`[DeFi] ${params.action} ${params.amount} ETH on ${params.protocol}`);

  return {
    success: true,
    transactionHash: "0xmock_defi_tx",
  };
}
