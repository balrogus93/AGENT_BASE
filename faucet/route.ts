import { NextResponse } from "next/server";
import { requestFaucet, getWalletBalance } from "@/lib/cdp-wallet";
import { query } from "@/lib/db";
import { formatEther } from "viem";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, token = "eth" } = body;

    if (!address) {
      return NextResponse.json(
        { success: false, error: "Address is required" },
        { status: 400 }
      );
    }

    // Request funds from faucet
    const result = await requestFaucet(address, token);

    if (result.success) {
      // Get new balance
      const balance = await getWalletBalance(address);

      // Log to database
      await query(
        `INSERT INTO faucet_requests (address, token, tx_hash, created_at) 
         VALUES ($1, $2, $3, NOW())`,
        [address, token, result.transactionHash]
      );

      return NextResponse.json({
        success: true,
        transactionHash: result.transactionHash,
        balance: formatEther(balance),
        explorerUrl: `https://sepolia.basescan.org/tx/${result.transactionHash}`,
      });
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("Faucet error:", error);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
