import { NextRequest, NextResponse } from "next/server";
import { calculateOptimalAllocation } from "@/engine/allocationEngine";
import { assessAllProtocols } from "@/engine/riskEngine";
import { getAllProtocols } from "@/config/protocols";
import { logAction, savePortfolioSnapshot, getLatestPortfolio } from "@/lib/db";

// GET: Calculate optimal allocation
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const capital = parseFloat(searchParams.get("capital") || "300");
    const maxProtocols = parseInt(searchParams.get("maxProtocols") || "3");
    const maxRisk = parseFloat(searchParams.get("maxRisk") || "0.5");

    // Fetch and assess protocols
    const protocols = await getAllProtocols();
    const assessedProtocols = assessAllProtocols(protocols);

    // Calculate optimal allocation
    const allocation = calculateOptimalAllocation(
      assessedProtocols,
      capital,
      maxProtocols,
      maxRisk
    );

    return NextResponse.json({
      success: true,
      allocation,
      protocols: assessedProtocols.map((p) => ({
        name: p.name,
        apy: p.apy,
        tvl: p.tvl,
        risk: p.risk,
        adjustedYield: p.adjustedYield,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST: Save allocation and optionally execute
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { capital = 300, maxProtocols = 3, maxRisk = 0.5, execute = false } = body;

    // Fetch and assess protocols
    const protocols = await getAllProtocols();
    const assessedProtocols = assessAllProtocols(protocols);

    // Calculate optimal allocation
    const allocation = calculateOptimalAllocation(
      assessedProtocols,
      capital,
      maxProtocols,
      maxRisk
    );

    // Save portfolio snapshot
    await savePortfolioSnapshot(allocation);

    // Log action
    await logAction("allocation_calculated", {
      capital,
      maxProtocols,
      maxRisk,
      allocations: allocation.allocations.length,
      expectedApy: allocation.expectedApy,
    });

    return NextResponse.json({
      success: true,
      allocation,
      saved: true,
      executed: execute, // TODO: implement execution
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
