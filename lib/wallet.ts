export {
  getWalletBalance,
  sendTransaction,
  createEvmAccount,
  getOrCreateAccount,
  requestFaucet,
} from "./cdp-wallet";

export async function getWallet() {
  const { getOrCreateAccount } = await import("./cdp-wallet");
  return getOrCreateAccount("agent-main-wallet");
}
