export default async function Home() {
  return (
    <main style={{ padding: 40 }}>
      <h1>DeFi Auto Agent</h1>
      <p>Endpoints disponibles:</p>
      <ul>
        <li><a href="/api/health">/api/health</a> - Status du système</li>
        <li><a href="/api/metrics">/api/metrics</a> - Métriques</li>
        <li><a href="/api/rebalance">/api/rebalance</a> - Rebalance</li>
        <li><a href="/api/allocate">/api/allocate</a> - Allocation</li>
        <li><a href="/api/wallet/create">/api/wallet/create</a> - Créer wallet</li>
        <li><a href="/api/wallet/balance">/api/wallet/balance</a> - Balance</li>
      </ul>
    </main>
  );
}
