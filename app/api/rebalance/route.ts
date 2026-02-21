import { NextResponse } from "next/server";
import { getAllProtocols } from "../../../../config/protocols";
import { calculateRisk } from "../../../../engine/riskEngine";
import { chooseBestProtocol } from "../../../../engine/allocationEngine";
import { executeRebalance } from "../../../../engine/executionEngine";

export async function GET() {
  const protocols = await getAllProtocols();

  const enriched = protocols.map((p) => {
    const risk = calculateRisk(p);
    const adjustedYield = p.apy * (1 - risk);

    return { ...p, risk, adjustedYield };
  });

  const best = chooseBestProtocol(enriched);

  // Placeholder current position
  const current = enriched[0];

  if (best.name !== current.name) {
    await executeRebalance(current, best);
  }

  return NextResponse.json({
    best
  });
}
