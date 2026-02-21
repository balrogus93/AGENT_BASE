export function calculateRisk({
  tvl,
  apy,
}: {
  tvl: number;
  apy: number;
}) {
  let risk = 0;

  // TVL faible = plus risqué
  if (tvl < 10_000_000) {
    risk += 0.3;
  }

  // APY anormalement élevé = suspicion
  if (apy > 15) {
    risk += 0.2;
  }

  return risk;
}
