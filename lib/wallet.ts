// Re-export from CDP wallet for backward compatibility
export {
  getWalletBalance,
  sendTransaction,
  createEvmAccount,
  getOrCreateAccount,
  requestFaucet,
  executeDefiTransaction,
} from "./cdp-wallet";

// Legacy function for compatibility with existing code
export async function getWallet() {
  const { getOrCreateAccount } = await import("./cdp-wallet");
  return getOrCreateAccount("agent-main-wallet");
}
