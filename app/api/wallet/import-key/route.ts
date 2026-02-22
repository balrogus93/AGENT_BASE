import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  try {
    // Parser le body avec gestion d'erreur
    let body;
    try {
      const text = await request.text();
      if (!text) {
        return NextResponse.json(
          { success: false, error: "Empty request body" },
          { status: 400 }
        );
      }
      body = JSON.parse(text);
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { privateKey, name } = body;

    if (!privateKey) {
      return NextResponse.json(
        { success: false, error: "Private key is required" },
        { status: 400 }
      );
    }

    // Valider le format de la clé privée
    let formattedKey = privateKey.trim();
    
    // Ajouter 0x si manquant
    if (!formattedKey.startsWith("0x")) {
      formattedKey = "0x" + formattedKey;
    }

    // Vérifier la longueur (64 caractères hex + 0x = 66)
    if (formattedKey.length !== 66) {
      return NextResponse.json(
        { success: false, error: `Invalid private key length. Expected 66 characters (with 0x), got ${formattedKey.length}` },
        { status: 400 }
      );
    }

    // Vérifier que c'est bien de l'hexadécimal
    if (!/^0x[0-9a-fA-F]{64}$/.test(formattedKey)) {
      return NextResponse.json(
        { success: false, error: "Invalid private key format. Must be hexadecimal characters only." },
        { status: 400 }
      );
    }

    // Vérifier les credentials CDP
    if (!process.env.CDP_API_KEY_ID || !process.env.CDP_API_KEY_SECRET || !process.env.CDP_WALLET_SECRET) {
      return NextResponse.json(
        { success: false, error: "CDP credentials not configured on server" },
        { status: 500 }
      );
    }

    console.log("[Import] Starting import with key length:", formattedKey.length);

    // Import dynamique du SDK
    const { CdpClient } = await import("@coinbase/cdp-sdk");
    
    const cdp = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID,
      apiKeySecret: process.env.CDP_API_KEY_SECRET,
      walletSecret: process.env.CDP_WALLET_SECRET,
    });

    const accountName = name || `imported-${Date.now()}`;

    console.log("[Import] Calling CDP importAccount...");

    // Importer le compte avec la clé privée
    const account = await cdp.evm.importAccount({
      privateKey: formattedKey,
      name: accountName,
    });

    console.log("[Import] Success! Address:", account.address);

    // Sauvegarder dans la DB
    try {
      await query(
        `INSERT INTO wallet_accounts (address, name, created_at, network, account_type) 
         VALUES ($1, $2, NOW(), $3, $4)
         ON CONFLICT (address) DO UPDATE SET name = $2, updated_at = NOW()`,
        [account.address, accountName, "base-sepolia", "evm-imported"]
      );
    } catch (dbError) {
      console.error("[Import] DB error (non-fatal):", dbError);
    }

    return NextResponse.json({
      success: true,
      account: {
        address: account.address,
        name: accountName,
        network: "base-sepolia",
        type: "imported",
      },
      message: "Wallet imported successfully! Your private key is now managed by CDP.",
    });
  } catch (error: any) {
    console.error("[Import] Error:", error);
    
    // Messages d'erreur plus clairs
    let errorMessage = "Failed to import wallet";
    
    if (error.message) {
      if (error.message.includes("already exists") || error.message.includes("duplicate")) {
        errorMessage = "This wallet has already been imported to CDP";
      } else if (error.message.includes("invalid") || error.message.includes("Invalid")) {
        errorMessage = "Invalid private key: " + error.message;
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
