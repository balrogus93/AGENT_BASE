// Types
export interface Protocol {
  name: string;
  apy: number;
  tvl: number;
  risk?: number;
  adjustedYield?: number;
  chain?: string;
  enabled?: boolean;
}

export interface AllocationStrategy {
  protocol: string;
  percentage: number;
  amount: number;
  expectedYield: number;
  riskScore: number;
}

export interface PortfolioAllocation {
  totalValue: number;
  allocations: AllocationStrategy[];
  expectedApy: number;
  totalRisk: number;
  timestamp: string;
}

// Choose the best single protocol (simple strategy)
export function chooseBestProtocol(protocols: Protocol[]): Protocol {
  if (!protocols || protocols.length === 0) {
    throw new Error("No protocols available");
  }

  let best = protocols[0];

  for (const p of protocols) {
    const currentAdjusted = p.adjustedYield ?? p.apy * (1 - (p.risk ?? 0));
    const bestAdjusted = best.adjustedYield ?? best.apy * (1 - (best.risk ?? 0));

    if (currentAdjusted > bestAdjusted) {
      best = p;
    }
  }

  return best;
}

// Calculate optimal allocation across multiple protocols
export function calculateOptimalAllocation(
  protocols: Protocol[],
  totalCapital: number,
  maxProtocols: number = 3,
  maxRisk: number = 0.5
): PortfolioAllocation {
  if (!protocols || protocols.length === 0) {
    return {
      totalValue: totalCapital,
      allocations: [],
      expectedApy: 0,
      totalRisk: 0,
      timestamp: new Date().toISOString(),
    };
  }

  // Filter protocols by max risk
  const eligibleProtocols = protocols
    .filter((p) => (p.risk ?? 0) <= maxRisk)
    .map((p) => ({
      ...p,
      adjustedYield: p.adjustedYield ?? p.apy * (1 - (p.risk ?? 0)),
    }))
    .sort((a, b) => (b.adjustedYield ?? 0) - (a.adjustedYield ?? 0))
    .slice(0, maxProtocols);

  if (eligibleProtocols.length === 0) {
    return {
      totalValue: totalCapital,
      allocations: [],
      expectedApy: 0,
      totalRisk: 0,
      timestamp: new Date().toISOString(),
    };
  }

  // Simple allocation: weight by adjusted yield
  const totalAdjustedYield = eligibleProtocols.reduce(
    (sum, p) => sum + (p.adjustedYield ?? 0),
    0
  );

  const allocations: AllocationStrategy[] = eligibleProtocols.map((p) => {
    const weight = (p.adjustedYield ?? 0) / totalAdjustedYield;
    const amount = totalCapital * weight;

    return {
      protocol: p.name,
      percentage: weight * 100,
      amount,
      expectedYield: p.apy,
      riskScore: p.risk ?? 0,
    };
  });

  // Calculate portfolio metrics
  const expectedApy =
    allocations.reduce((sum, a) => sum + (a.expectedYield * a.percentage) / 100, 0);

  const totalRisk =
    allocations.reduce((sum, a) => sum + (a.riskScore * a.percentage) / 100, 0);

  return {
    totalValue: totalCapital,
    allocations,
    expectedApy,
    totalRisk,
    timestamp: new Date().toISOString(),
  };
}

// Determine if rebalance is needed
export function shouldRebalance(
  currentProtocol: string,
  bestProtocol: Protocol,
  minYieldImprovement: number = 0.5 // 0.5% minimum improvement
): { shouldRebalance: boolean; reason: string } {
  if (!currentProtocol || currentProtocol === "none") {
    return {
      shouldRebalance: true,
      reason: "No current position - initial allocation needed",
    };
  }

  if (currentProtocol === bestProtocol.name) {
    return {
      shouldRebalance: false,
      reason: "Already in optimal protocol",
    };
  }

  const improvement = bestProtocol.adjustedYield ?? bestProtocol.apy;

  if (improvement >= minYieldImprovement) {
    return {
      shouldRebalance: true,
      reason: `Better yield available: ${bestProtocol.name} (${improvement.toFixed(2)}% adjusted)`,
    };
  }

  return {
    shouldRebalance: false,
    reason: `Improvement too small (${improvement.toFixed(2)}% < ${minYieldImprovement}% threshold)`,
  };
}
