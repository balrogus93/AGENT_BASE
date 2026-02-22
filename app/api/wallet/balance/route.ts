import { NextResponse } from "next/server";
import { getWalletBalance } from "@/lib/cdp-wallet";
import { query } from "@/lib/db";
import { formatEther } from "viem";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const addressParam = searchParams.get("address");

    let walletAddress: string;

    if (addressParam) {
      walletAddress = addressParam;
    } else {
      const result = await query(
        `SELECT address FROM wallet_accounts 
         WHERE account_type = 'evm' 
         ORDER BY created_at DESC LIMIT 1`
      );

      if (result.length === 0) {
        return NextResponse.json(
          { success: false, error: "No wallet found. Create one first." },
          { status: 404 }
        );
      }

      walletAddress = result[0].address;
    }

    const balance = await getWalletBalance(walletAddress);

    return NextResponse.json({
      success: true,
      address: walletAddress,
      balance: {
        wei: balance.toString(),
        eth: formatEther(balance),
      },
      network: "base-sepolia",
    });
  } catch (error: any) {
    console.error("Balance error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
