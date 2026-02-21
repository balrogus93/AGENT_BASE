export async function getWalletBalance() {
  // TODO: intégrer CDP Agentic Wallet SDK
  return 300;
}

export async function sendTransaction(txData: any) {
  // TODO: brancher Agentic Wallet ici
  console.log("Sending transaction:", txData);
  return { txHash: "0xmockhash" };
}
