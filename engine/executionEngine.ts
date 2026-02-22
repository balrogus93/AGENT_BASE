import { query } from "@/lib/db";
import type { Protocol } from "./allocationEngine";

export interface RebalanceResult {
  success: boolean;
  fromProtocol: string;
  toProtocol: string;
  txHash?: string;
  error?: string;
  timestamp: string;
}

export async function executeRebalance(
  from: Protocol,
  to: Protocol,
  amount?: number
): Promise<RebalanceResult> {
  const timestamp = new Date().toISOString();

  try {
    console.log(`[Rebalance] ${from.name} → ${to.name}`);

    const withdrawResult = await executeWithdraw(from, amount);
    if (!withdrawResult.success) {
      throw new Error(`Withdraw failed: ${withdrawResult.error}`);
    }

    const depositResult = await executeDeposit(to, amount);
    if (!depositResult.success) {
      throw new Error(`Deposit failed: ${depositResult.error}`);
    }

    await logRebalance(from.name, to.name, amount, depositResult.txHash);
    await saveCurrentState(to);

    return {
      success: true,
      fromProtocol: from.name,
      toProtocol: to.name,
      txHash: depositResult.txHash,
      timestamp,
    };
  } catch (error: any) {
    console.error("[Rebalance] Error:", error.message);

    return {
      success: false,
      fromProtocol: from.name,
      toProtocol: to.name,
      error: error.message,
      timestamp,
    };
  }
}

async function executeWithdraw(
  protocol: Protocol,
  amount?: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  console.log(`[Withdraw] ${amount ?? "all"} from ${protocol.name}`);
  return { success: true, txHash: `0xwithdraw_${Date.now()}` };
}

async function executeDeposit(
  protocol: Protocol,
  amount?: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  console.log(`[Deposit] ${amount ?? "all"} to ${protocol.name}`);
  return { success: true, txHash: `0xdeposit_${Date.now()}` };
}

async function logRebalance(
  fromProtocol: string,
  toProtocol: string,
  amount?: number,
  txHash?: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO rebalance_history (from_protocol, to_protocol, amount, tx_hash, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [fromProtocol, toProtocol, amount ?? 0, txHash ?? null]
    );
  } catch (error) {
    console.error("[DB] Failed to log rebalance:", error);
  }
}

export async function saveCurrentState(protocol: Protocol): Promise<void> {
  try {
    await query(
      `UPDATE system_state 
       SET current_protocol = $1, 
           current_apy = $2, 
           risk_score = $3,
           last_rebalance = NOW(),
           updated_at = NOW()
       WHERE id = 1`,
      [protocol.name, protocol.apy, protocol.risk ?? 0]
    );
  } catch (error) {
    console.error("[DB] Failed to save state:", error);
  }
}

export async function getCurrentState(): Promise<{
  currentProtocol: string;
  currentApy: number;
  riskScore: number;
  lastRebalance: Date | null;
} | null> {
  try {
    const result = await query(
      "SELECT current_protocol, current_apy, risk_score, last_rebalance FROM system_state LIMIT 1"
    );

    if (result.length === 0) return null;

    return {
      currentProtocol: result[0].current_protocol,
      currentApy: parseFloat(result[0].current_apy),
      riskScore: parseFloat(result[0].risk_score),
      lastRebalance: result[0].last_rebalance,
    };
  } catch (error) {
    console.error("[DB] Failed to get state:", error);
    return null;
  }
}
