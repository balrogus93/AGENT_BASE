import { createPublicClient, http, parseEther } from "viem";
import { baseSepolia } from "viem/chains";

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

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

// Helper pour créer le client CDP dynamiquement
async function getCdpClient() {
  const { CdpClient } = await import("@coinbase/cdp-sdk");
  return new CdpClient({
    apiKeyId: process.env.CDP_API_KEY_ID!,
    apiKeySecret: process.env.CDP_API_KEY_SECRET!,
    walletSecret: process.env.CDP_WALLET_SECRET!,
  });
}

export async function createEvmAccount(name?: string): Promise<WalletAccount> {
  const cdp = await getCdpClient();
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

export async function getOrCreateAccount(name: string): Promise<WalletAccount> {
  const cdp = await getCdpClient();

  const account = await cdp.evm.getOrCreateAccount({
    name,
  });

  return {
    address: account.address,
    name,
    network: "base-sepolia",
  };
}

export async function getWalletBalance(address: string): Promise<bigint> {
  const balance = await publicClient.getBalance({
    address: address as `0x${string}`,
  });
  return balance;
}

export async function requestFaucet(
  address: string,
  token: "eth" | "usdc" = "eth"
): Promise<TransactionResult> {
  try {
    const cdp = await getCdpClient();

    const { transactionHash } = await cdp.evm.requestFaucet({
      address: address as `0x${string}`,
      network: "base-sepolia",
      token,
    });

    await publicClient.waitForTransactionReceipt({
      hash: transactionHash as `0x${string}`,
    });

    return { success: true, transactionHash };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendTransaction(params: {
  fromAddress: string;
  toAddress: string;
  value: string;
  network?: string;
}): Promise<TransactionResult> {
  try {
    const cdp = await getCdpClient();

    const { transactionHash } = await cdp.evm.sendTransaction({
      address: params.fromAddress as `0x${string}`,
      network: (params.network || "base-sepolia") as any,
      transaction: {
        to: params.toAddress as `0x${string}`,
        value: parseEther(params.value),
      },
    });

    await publicClient.waitForTransactionReceipt({
      hash: transactionHash as `0x${string}`,
    });

    return { success: true, transactionHash };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
