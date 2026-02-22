import { NextResponse } from "next/server";
import { CdpClient } from "@coinbase/cdp-sdk";
import { query } from "@/lib/db";

// Initialize CDP Client (credentials from env vars)
const cdp = new CdpClient({
  apiKeyId: process.env.CDP_API_KEY_ID!,
  apiKeySecret: process.env.CDP_API_KEY_SECRET!,
  walletSecret: process.env.CDP_WALLET_SECRET!,
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const accountName = body.name || `agent-wallet-${Date.now()}`;

    // Create EVM Account via CDP SDK
    const account = await cdp.evm.createAccount({
      name: accountName,
    });

    // Log to database
    await query(
      `INSERT INTO wallet_accounts (address, name, created_at, network, account_type) 
       VALUES ($1, $2, NOW(), $3, $4)
       ON CONFLICT (address) DO NOTHING`,
      [account.address, accountName, "base-sepolia", "evm"]
    );

    return NextResponse.json({
      success: true,
      account: {
        address: account.address,
        name: accountName,
        network: "base-sepolia",
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("CDP Account creation error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create EVM account",
      },
      { status: 500 }
    );
  }
}

// GET: Retrieve existing account or create if none exists
export async function GET() {
  try {
    // Check if we already have an account
    const existing = await query(
      `SELECT * FROM wallet_accounts WHERE account_type = 'evm' ORDER BY created_at DESC LIMIT 1`
    );

    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        account: existing[0],
        message: "Existing account retrieved",
      });
    }

    // No account exists, create one
    const accountName = `agent-wallet-${Date.now()}`;
    const account = await cdp.evm.createAccount({
      name: accountName,
    });

    await query(
      `INSERT INTO wallet_accounts (address, name, created_at, network, account_type) 
       VALUES ($1, $2, NOW(), $3, $4)`,
      [account.address, accountName, "base-sepolia", "evm"]
    );

    return NextResponse.json({
      success: true,
      account: {
        address: account.address,
        name: accountName,
        network: "base-sepolia",
        createdAt: new Date().toISOString(),
      },
      message: "New account created",
    });
  } catch (error: any) {
    console.error("CDP Account error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to get/create EVM account",
      },
      { status: 500 }
    );
  }
}
