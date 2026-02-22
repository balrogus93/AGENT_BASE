import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { 
  buildDepositTransaction, 
  buildWithdrawTransaction,
  buildApproveTransaction,
  buildRebalanceTransactions,
  checkAllowance,
  getTokenBalance 
} from "@/services/transactions";
import { TOKENS, AAVE_V3, MORPHO } from "@/config/mainnet";
import { parseUnits, formatUnits } from "viem";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, protocol, asset, amount, userAddress, vaultAddress } = body;

    if (!action || !protocol || !asset || !amount || !userAddress) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: action, protocol, asset, amount, userAddress" },
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

    const token = TOKENS[asset as keyof typeof TOKENS];
    if (!token) {
      return NextResponse.json(
        { success: false, error: `Unknown asset: ${asset}` },
        { status: 400 }
      );
    }

    // Import dynamique du SDK CDP
    const { CdpClient } = await import("@coinbase/cdp-sdk");
    const cdp = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID,
      apiKeySecret: process.env.CDP_API_KEY_SECRET,
      walletSecret: process.env.CDP_WALLET_SECRET,
    });

    const transactions: { to: string; data: string; value?: bigint }[] = [];

    // Déterminer le spender
    const spender = protocol === "aave-v3" 
      ? AAVE_V3.poolAddress 
      : vaultAddress;

    if (action === "deposit" || action === "supply") {
      // Vérifier l'allowance
      const allowance = await checkAllowance(token.address, userAddress, spender);
      const amountBigInt = parseUnits(amount, token.decimals);

      // Si allowance insuffisante, ajouter approve
      if (allowance < amountBigInt) {
        transactions.push(buildApproveTransaction(token.address, spender));
      }

      // Ajouter la transaction de dépôt
      transactions.push(buildDepositTransaction({
        protocol,
        asset,
        amount,
        userAddress,
        vaultAddress,
      }));
    } else if (action === "withdraw") {
      transactions.push(buildWithdrawTransaction({
        protocol,
        asset,
        amount,
        userAddress,
        vaultAddress,
      }));
    } else {
      return NextResponse.json(
        { success: false, error: `Unknown action: ${action}` },
        { status: 400 }
      );
    }

    // Exécuter les transactions via CDP
    const results = [];
    for (const tx of transactions) {
      try {
        const result = await cdp.evm.sendTransaction({
          address: userAddress as `0x${string}`,
          network: "base", // Base mainnet
          transaction: {
            to: tx.to as `0x${string}`,
            data: tx.data as `0x${string}`,
            value: tx.value || 0n,
          },
        });

        results.push({
          success: true,
          transactionHash: result.transactionHash,
        });

        // Log dans la DB
        await query(
          `INSERT INTO transactions (tx_hash, from_address, to_address, action, protocol, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [result.transactionHash, userAddress, tx.to, action, protocol, "pending"]
        );
      } catch (txError: any) {
        results.push({
          success: false,
          error: txError.message,
        });
      }
    }

    return NextResponse.json({
      success: results.every(r => r.success),
      transactions: results,
      summary: {
        action,
        protocol,
        asset,
        amount,
        transactionCount: results.length,
      },
    });
  } catch (error: any) {
    console.error("[Execute] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute transaction" },
      { status: 500 }
    );
  }
}

// GET: Récupérer les positions actuelles de l'utilisateur
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get("address");

    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: "Address required" },
        { status: 400 }
      );
    }

    const positions = [];

    // Vérifier les balances de tokens
    for (const [name, token] of Object.entries(TOKENS)) {
      try {
        const balance = await getTokenBalance(token.address, userAddress);
        if (balance > 0n) {
          positions.push({
            type: "wallet",
            asset: name,
            balance: formatUnits(balance, token.decimals),
            protocol: "wallet",
          });
        }
      } catch (e) {
        // Ignorer les erreurs
      }
    }

    // Vérifier les positions Aave (aTokens)
    for (const [name, assetConfig] of Object.entries(AAVE_V3.assets)) {
      try {
        const balance = await getTokenBalance(assetConfig.aToken, userAddress);
        if (balance > 0n) {
          const token = TOKENS[name as keyof typeof TOKENS];
          positions.push({
            type: "lending",
            asset: name,
            balance: formatUnits(balance, token?.decimals || 18),
            protocol: "aave-v3",
          });
        }
      } catch (e) {
        // Ignorer les erreurs
      }
    }

    // Vérifier les positions Morpho (vault shares)
    for (const [vaultId, vaultConfig] of Object.entries(MORPHO.vaults)) {
      try {
        const balance = await getTokenBalance(vaultConfig.address, userAddress);
        if (balance > 0n) {
          positions.push({
            type: "vault",
            asset: vaultConfig.asset,
            balance: formatUnits(balance, 18), // La plupart des vaults utilisent 18 decimals pour les shares
            protocol: "morpho",
            vault: vaultConfig.name,
          });
        }
      } catch (e) {
        // Ignorer les erreurs
      }
    }

    return NextResponse.json({
      success: true,
      address: userAddress,
      positions,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Execute GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch positions" },
      { status: 500 }
    );
  }
}
