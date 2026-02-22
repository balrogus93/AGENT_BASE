import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { formatEther } from "viem";
import { getWalletBalance } from "@/lib/cdp-wallet";

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

    // Vérifier les credentials
    if (!process.env.CDP_API_KEY_ID || !process.env.CDP_API_KEY_SECRET || !process.env.CDP_WALLET_SECRET) {
      return NextResponse.json(
        { success: false, error: "CDP credentials not configured" },
        { status: 500 }
      );
    }

    // Import dynamique
    const { CdpClient } = await import("@coinbase/cdp-sdk");
    
    const cdp = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID,
      apiKeySecret: process.env.CDP_API_KEY_SECRET,
      walletSecret: process.env.CDP_WALLET_SECRET,
    });

    const { transactionHash } = await cdp.evm.requestFaucet({
      address: address as `0x${string}`,
      network: "base-sepolia",
      token,
    });

    // Get new balance
    const balance = await getWalletBalance(address);

    // Log to database
    await query(
      `INSERT INTO faucet_requests (address, token, tx_hash, created_at) 
       VALUES ($1, $2, $3, NOW())`,
      [address, token, transactionHash]
    );

    return NextResponse.json({
      success: true,
      transactionHash,
      balance: formatEther(balance),
      explorerUrl: `https://sepolia.basescan.org/tx/${transactionHash}`,
    });
  } catch (error: any) {
    console.error("Faucet error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
