import type { Protocol } from "./allocationEngine";

// Risk calculation parameters
const RISK_WEIGHTS = {
  tvlLow: 0.3, // TVL < 10M
  tvlMedium: 0.1, // TVL < 50M
  apyHigh: 0.2, // APY > 15%
  apyVeryHigh: 0.3, // APY > 25%
  newProtocol: 0.15, // Age < 6 months (if tracked)
};

// Calculate risk score for a single protocol
export function calculateRisk(protocol: {
  tvl: number;
  apy: number;
  age?: number; // months
}): number {
  let risk = 0;

  // TVL risk - lower TVL = higher risk
  if (protocol.tvl < 10_000_000) {
    risk += RISK_WEIGHTS.tvlLow;
  } else if (protocol.tvl < 50_000_000) {
    risk += RISK_WEIGHTS.tvlMedium;
  }

  // APY risk - unusually high APY = suspicious
  if (protocol.apy > 25) {
    risk += RISK_WEIGHTS.apyVeryHigh;
  } else if (protocol.apy > 15) {
    risk += RISK_WEIGHTS.apyHigh;
  }

  // New protocol risk
  if (protocol.age !== undefined && protocol.age < 6) {
    risk += RISK_WEIGHTS.newProtocol;
  }

  // Cap risk at 0.9 (never 100% risk)
  return Math.min(risk, 0.9);
}

// Assess all protocols and enrich with risk data
export function assessAllProtocols(protocols: Protocol[]): Protocol[] {
  return protocols.map((p) => {
    const risk = calculateRisk(p);
    const adjustedYield = p.apy * (1 - risk);

    return {
      ...p,
      risk,
      adjustedYield,
    };
  });
}

// Get risk category label
export function getRiskCategory(riskScore: number): string {
  if (riskScore < 0.2) return "LOW";
  if (riskScore < 0.4) return "MEDIUM";
  if (riskScore < 0.6) return "HIGH";
  return "VERY HIGH";
}

// Calculate portfolio-level risk
export function calculatePortfolioRisk(
  allocations: { protocol: string; percentage: number; riskScore: number }[]
): number {
  if (!allocations || allocations.length === 0) return 0;

  const weightedRisk = allocations.reduce(
    (sum, a) => sum + (a.riskScore * a.percentage) / 100,
    0
  );

  return weightedRisk;
}

// Validate if a protocol meets minimum safety requirements
export function isProtocolSafe(protocol: Protocol, maxRisk: number = 0.6): boolean {
  const risk = protocol.risk ?? calculateRisk(protocol);
  return risk <= maxRisk;
}
