import type { Protocol } from "./allocationEngine";

const RISK_WEIGHTS = {
  tvlLow: 0.3,
  tvlMedium: 0.1,
  apyHigh: 0.2,
  apyVeryHigh: 0.3,
  newProtocol: 0.15,
};

export function calculateRisk(protocol: {
  tvl: number;
  apy: number;
  age?: number;
}): number {
  let risk = 0;

  if (protocol.tvl < 10_000_000) {
    risk += RISK_WEIGHTS.tvlLow;
  } else if (protocol.tvl < 50_000_000) {
    risk += RISK_WEIGHTS.tvlMedium;
  }

  if (protocol.apy > 25) {
    risk += RISK_WEIGHTS.apyVeryHigh;
  } else if (protocol.apy > 15) {
    risk += RISK_WEIGHTS.apyHigh;
  }

  if (protocol.age !== undefined && protocol.age < 6) {
    risk += RISK_WEIGHTS.newProtocol;
  }

  return Math.min(risk, 0.9);
}

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

export function getRiskCategory(riskScore: number): string {
  if (riskScore < 0.2) return "LOW";
  if (riskScore < 0.4) return "MEDIUM";
  if (riskScore < 0.6) return "HIGH";
  return "VERY HIGH";
}

export function calculatePortfolioRisk(
  allocations: { protocol: string; percentage: number; riskScore: number }[]
): number {
  if (!allocations || allocations.length === 0) return 0;

  return allocations.reduce(
    (sum, a) => sum + (a.riskScore * a.percentage) / 100,
    0
  );
}

export function isProtocolSafe(protocol: Protocol, maxRisk: number = 0.6): boolean {
  const risk = protocol.risk ?? calculateRisk(protocol);
  return risk <= maxRisk;
}
