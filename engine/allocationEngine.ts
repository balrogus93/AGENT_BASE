export function chooseBestProtocol(protocols: any[]) {
  let best = protocols[0];

  for (const p of protocols) {
    if (p.adjustedYield > best.adjustedYield) {
      best = p;
    }
  }

  return best;
}
