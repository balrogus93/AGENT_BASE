import { NextResponse } from "next/server";
import { getAllProtocols } from "@/config/protocols";
import { calculateRisk, assessAllProtocols } from "@/engine/riskEngine";
import { chooseBestProtocol, shouldRebalance } from "@/engine/allocationEngine";
import { executeRebalance, getCurrentState, saveCurrentState } from "@/engine/executionEngine";
import { logAction } from "@/lib/db";

export async function GET() {
  try {
    // Step 1: Fetch all protocol data
    const protocols = await getAllProtocols();

    if (protocols.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No protocols available",
      });
    }

    // Step 2: Assess risk for all protocols
    const assessedProtocols = assessAllProtocols(protocols);

    // Step 3: Find the best protocol
    const best = chooseBestProtocol(assessedProtocols);

    // Step 4: Get current state
    const currentState = await getCurrentState();
    const currentProtocol = currentState?.currentProtocol ?? "none";

    // Step 5: Check if rebalance is needed
    const rebalanceDecision = shouldRebalance(currentProtocol, best);

    // Step 6: Execute rebalance if needed
    if (rebalanceDecision.shouldRebalance) {
      // Find current protocol data
      const current = assessedProtocols.find((p) => p.name === currentProtocol) || {
        name: currentProtocol,
        apy: 0,
        tvl: 0,
        risk: 0,
      };

      const result = await executeRebalance(current, best);

      await logAction("rebalance", {
        from: current.name,
        to: best.name,
        reason: rebalanceDecision.reason,
        result: result.success ? "success" : "failed",
      });

      return NextResponse.json({
        success: result.success,
        action: "rebalanced",
        from: current.name,
        to: best.name,
        reason: rebalanceDecision.reason,
        newPosition: {
          protocol: best.name,
          apy: best.apy,
          risk: best.risk,
          adjustedYield: best.adjustedYield,
        },
        txHash: result.txHash,
      });
    }

    // No rebalance needed
    return NextResponse.json({
      success: true,
      action: "none",
      reason: rebalanceDecision.reason,
      currentPosition: {
        protocol: best.name,
        apy: best.apy,
        risk: best.risk,
        adjustedYield: best.adjustedYield,
      },
      allProtocols: assessedProtocols.map((p) => ({
        name: p.name,
        apy: p.apy,
        risk: p.risk,
        adjustedYield: p.adjustedYield,
      })),
    });
  } catch (error: any) {
    console.error("[Rebalance] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// POST: Force rebalance to specific protocol
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetProtocol } = body;

    if (!targetProtocol) {
      return NextResponse.json(
        { success: false, error: "targetProtocol is required" },
        { status: 400 }
      );
    }

    const protocols = await getAllProtocols();
    const assessedProtocols = assessAllProtocols(protocols);

    const target = assessedProtocols.find(
      (p) => p.name.toLowerCase() === targetProtocol.toLowerCase()
    );

    if (!target) {
      return NextResponse.json(
        { success: false, error: `Protocol ${targetProtocol} not found` },
        { status: 404 }
      );
    }

    const currentState = await getCurrentState();
    const current = assessedProtocols.find(
      (p) => p.name === currentState?.currentProtocol
    ) || { name: "none", apy: 0, tvl: 0, risk: 0 };

    const result = await executeRebalance(current, target);

    return NextResponse.json({
      success: result.success,
      action: "forced_rebalance",
      from: current.name,
      to: target.name,
      txHash: result.txHash,
      error: result.error,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
