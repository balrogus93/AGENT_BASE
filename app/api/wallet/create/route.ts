import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  try {
    // Vérifier que les variables d'environnement sont présentes
    if (!process.env.CDP_API_KEY_ID || !process.env.CDP_API_KEY_SECRET || !process.env.CDP_WALLET_SECRET) {
      return NextResponse.json(
        { 
          success: false, 
          error: "CDP credentials not configured. Please set CDP_API_KEY_ID, CDP_API_KEY_SECRET, and CDP_WALLET_SECRET in Vercel environment variables." 
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const accountName = body.name || `agent-wallet-${Date.now()}`;

    // Import dynamique pour éviter l'initialisation au build
    const { CdpClient } = await import("@coinbase/cdp-sdk");
    
    const cdp = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID,
      apiKeySecret: process.env.CDP_API_KEY_SECRET,
      walletSecret: process.env.CDP_WALLET_SECRET,
    });

    const account = await cdp.evm.createAccount({
      name: accountName,
    });

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
      { success: false, error: error.message || "Failed to create EVM account" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // D'abord vérifier si un wallet existe déjà
    const existing = await query(
      "SELECT * FROM wallet_accounts WHERE account_type = 'evm' ORDER BY created_at DESC LIMIT 1"
    );

    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        account: existing[0],
        message: "Existing account retrieved",
      });
    }

    // Vérifier les credentials avant de créer
    if (!process.env.CDP_API_KEY_ID || !process.env.CDP_API_KEY_SECRET || !process.env.CDP_WALLET_SECRET) {
      return NextResponse.json(
        { 
          success: false, 
          error: "CDP credentials not configured. Please set environment variables in Vercel." 
        },
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
      { success: false, error: error.message || "Failed to get/create EVM account" },
      { status: 500 }
    );
  }
}
