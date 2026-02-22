export default async function Home() {
  return (
    <main style={{ padding: 40, maxWidth: 800, margin: "0 auto", fontFamily: "system-ui" }}>
      <h1>🤖 DeFi Auto Agent</h1>
      <p style={{ color: "#666", fontSize: 18, marginBottom: 30 }}>
        Automated DeFi yield optimization on Base network
      </p>

      <div style={{ 
        background: "linear-gradient(135deg, #0052FF 0%, #1E40AF 100%)", 
        padding: 30, 
        borderRadius: 12,
        marginBottom: 30,
        color: "white"
      }}>
        <h2 style={{ marginTop: 0 }}>🔐 Wallet Management</h2>
        <p>Create and manage your CDP wallet for automated DeFi operations</p>
        <a 
          href="/wallet" 
          style={{
            display: "inline-block",
            padding: "12px 24px",
            background: "white",
            color: "#0052FF",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
            marginTop: 10
          }}
        >
          Open Wallet Dashboard →
        </a>
      </div>

      <h2>📡 API Endpoints</h2>
      <div style={{ display: "grid", gap: 15 }}>
        <EndpointCard 
          title="Health Check" 
          url="/api/health" 
          description="Check system status and configuration"
          method="GET"
        />
        <EndpointCard 
          title="Metrics" 
          url="/api/metrics" 
          description="View current positions and history"
          method="GET"
        />
        <EndpointCard 
          title="Rebalance" 
          url="/api/rebalance" 
          description="Trigger automatic rebalancing"
          method="GET"
        />
        <EndpointCard 
          title="Allocate" 
          url="/api/allocate" 
          description="Calculate optimal allocation"
          method="GET"
        />
        <EndpointCard 
          title="Create Wallet" 
          url="/api/wallet/create" 
          description="Create or get EVM wallet"
          method="GET/POST"
        />
        <EndpointCard 
          title="Wallet Balance" 
          url="/api/wallet/balance" 
          description="Check wallet balance"
          method="GET"
        />
        <EndpointCard 
          title="Faucet" 
          url="/api/wallet/faucet" 
          description="Request testnet ETH"
          method="POST"
        />
      </div>
    </main>
  );
}

function EndpointCard({ title, url, description, method }: {
  title: string;
  url: string;
  description: string;
  method: string;
}) {
  return (
    <a 
      href={url}
      style={{
        display: "block",
        padding: 20,
        background: "#f8f9fa",
        borderRadius: 8,
        textDecoration: "none",
        color: "inherit",
        border: "1px solid #e9ecef",
        transition: "transform 0.2s, box-shadow 0.2s"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: 0, color: "#0052FF" }}>{title}</h3>
          <p style={{ margin: "5px 0 0", color: "#666", fontSize: 14 }}>{description}</p>
        </div>
        <span style={{
          padding: "4px 12px",
          background: method.includes("POST") ? "#28a745" : "#17a2b8",
          color: "white",
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 600
        }}>
          {method}
        </span>
      </div>
    </a>
  );
}
