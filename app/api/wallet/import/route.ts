import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, address } = body;

    if (!name && !address) {
      return NextResponse.json(
        { success: false, error: "Please provide either 'name' or 'address'" },
        { status: 400 }
      );
    }

    // Vérifier les credentials CDP
    if (!process.env.CDP_API_KEY_ID || !process.env.CDP_API_KEY_SECRET || !process.env.CDP_WALLET_SECRET) {
      return NextResponse.json(
        { success: false, error: "CDP credentials not configured" },
        { status: 500 }
      );
    }

    // Import dynamique du SDK
    const { CdpClient } = await import("@coinbase/cdp-sdk");
    
    const cdp = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID,
      apiKeySecret: process.env.CDP_API_KEY_SECRET,
      walletSecret: process.env.CDP_WALLET_SECRET,
    });

    let account;

    if (name) {
      // Récupérer par nom (getOrCreateAccount ne crée pas si existe déjà)
      account = await cdp.evm.getOrCreateAccount({ name });
    } else if (address) {
      // Récupérer par adresse
      account = await cdp.evm.getAccount({ address });
    }

    if (!account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    // Sauvegarder dans la DB locale si pas déjà présent
    await query(
      `INSERT INTO wallet_accounts (address, name, created_at, network, account_type) 
       VALUES ($1, $2, NOW(), $3, $4)
       ON CONFLICT (address) DO UPDATE SET name = $2, updated_at = NOW()`,
      [account.address, name || `imported-${account.address.slice(0, 8)}`, "base-sepolia", "evm"]
    );

    return NextResponse.json({
      success: true,
      account: {
        address: account.address,
        name: name || `imported-${account.address.slice(0, 8)}`,
        network: "base-sepolia",
      },
      message: "Wallet imported successfully",
    });
  } catch (error: any) {
    console.error("Import wallet error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to import wallet" },
      { status: 500 }
    );
  }
}

// GET: Lister tous les wallets disponibles dans CDP
export async function GET() {
  try {
    // Vérifier les credentials CDP
    if (!process.env.CDP_API_KEY_ID || !process.env.CDP_API_KEY_SECRET || !process.env.CDP_WALLET_SECRET) {
      return NextResponse.json(
        { success: false, error: "CDP credentials not configured" },
        { status: 500 }
      );
    }

    // Import dynamique du SDK
    const { CdpClient } = await import("@coinbase/cdp-sdk");
    
    const cdp = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID,
      apiKeySecret: process.env.CDP_API_KEY_SECRET,
      walletSecret: process.env.CDP_WALLET_SECRET,
    });

    // Lister tous les comptes EVM
    const accounts = await cdp.evm.listAccounts();

    // Aussi récupérer depuis la DB locale
    const localAccounts = await query(
      "SELECT * FROM wallet_accounts WHERE account_type = 'evm' ORDER BY created_at DESC"
    );

    return NextResponse.json({
      success: true,
      cdpAccounts: accounts.map((acc: any) => ({
        address: acc.address,
        name: acc.name,
      })),
      localAccounts: localAccounts,
      total: accounts.length,
    });
  } catch (error: any) {
    console.error("List wallets error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list wallets" },
      { status: 500 }
    );
  }
}
