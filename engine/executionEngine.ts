import { sendTransaction } from "../lib/wallet";

export async function executeRebalance(from: any, to: any) {
  console.log(`Rebalancing from ${from.name} to ${to.name}`);

  await sendTransaction({
    action: "withdraw",
    protocol: from.name
  });

  await sendTransaction({
    action: "deposit",
    protocol: to.name
  });
}
