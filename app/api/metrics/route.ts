import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // Get system state
    const systemResult = await query("SELECT * FROM system_state LIMIT 1");
    const system = systemResult[0] || null;

    // Get recent rebalances
    const rebalancesResult = await query(
      `SELECT * FROM rebalance_history ORDER BY created_at DESC LIMIT 5`
    );

    // Get wallet info
    const walletResult = await query(
      `SELECT * FROM wallet_accounts WHERE account_type = 'evm' ORDER BY created_at DESC LIMIT 1`
    );

    return NextResponse.json({
      success: true,
      system: system
        ? {
            currentProtocol: system.current_protocol,
            currentApy: parseFloat(system.current_apy || "0"),
            riskScore: parseFloat(system.risk_score || "0"),
            lastRebalance: system.last_rebalance,
            totalValueLocked: parseFloat(system.total_value_locked || "0"),
          }
        : null,
      wallet: walletResult[0] || null,
      recentRebalances: rebalancesResult,
    });
  } catch (error: any) {
    console.error("[Metrics] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
