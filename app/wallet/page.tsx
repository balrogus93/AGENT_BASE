"use client";

import { useState } from "react";

interface WalletAccount {
  address: string;
  name: string;
  network: string;
  createdAt: string;
}

interface WalletInfo {
  account: WalletAccount;
  balance?: {
    wei: string;
    eth: string;
  };
  faucetTx?: string;
}

export default function WalletDashboard() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletName, setWalletName] = useState("");
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Créer un nouveau wallet
  const createWallet = async () => {
    setLoading(true);
    setError(null);
    addLog("Creating new EVM wallet...");

    try {
      const res = await fetch("/api/wallet/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: walletName || undefined }),
      });

      const data = await res.json();

      if (data.success) {
        setWallet({ account: data.account });
        addLog(`✅ Wallet created: ${data.account.address}`);
        addLog(`   Name: ${data.account.name}`);
        addLog(`   Network: ${data.account.network}`);
      } else {
        setError(data.error);
        addLog(`❌ Error: ${data.error}`);
      }
    } catch (err: any) {
      setError(err.message);
      addLog(`❌ Error: ${err.message}`);
    }

    setLoading(false);
  };

  // Récupérer le wallet existant
  const getExistingWallet = async () => {
    setLoading(true);
    setError(null);
    addLog("Fetching existing wallet...");

    try {
      const res = await fetch("/api/wallet/create");
      const data = await res.json();

      if (data.success) {
        setWallet({ account: data.account });
        addLog(`✅ Wallet found: ${data.account.address}`);
        addLog(`   Message: ${data.message}`);
        
        // Récupérer le solde
        await getBalance(data.account.address);
      } else {
        setError(data.error);
        addLog(`❌ Error: ${data.error}`);
      }
    } catch (err: any) {
      setError(err.message);
      addLog(`❌ Error: ${err.message}`);
    }

    setLoading(false);
  };

  // Récupérer le solde
  const getBalance = async (address?: string) => {
    const walletAddress = address || wallet?.account.address;
    if (!walletAddress) return;

    addLog(`Fetching balance for ${walletAddress}...`);

    try {
      const res = await fetch(`/api/wallet/balance?address=${walletAddress}`);
      const data = await res.json();

      if (data.success) {
        setWallet((prev) =>
          prev ? { ...prev, balance: data.balance } : null
        );
        addLog(`✅ Balance: ${data.balance.eth} ETH`);
      } else {
        addLog(`❌ Balance error: ${data.error}`);
      }
    } catch (err: any) {
      addLog(`❌ Balance error: ${err.message}`);
    }
  };

  // Demander des fonds testnet
  const requestFaucet = async () => {
    if (!wallet?.account.address) return;

    setLoading(true);
    addLog("Requesting testnet ETH from faucet...");

    try {
      const res = await fetch("/api/wallet/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: wallet.account.address, token: "eth" }),
      });

      const data = await res.json();

      if (data.success) {
        setWallet((prev) =>
          prev
            ? {
                ...prev,
                faucetTx: data.transactionHash,
                balance: { wei: "0", eth: data.balance },
              }
            : null
        );
        addLog(`✅ Faucet success!`);
        addLog(`   TX: ${data.transactionHash}`);
        addLog(`   New balance: ${data.balance} ETH`);
        addLog(`   Explorer: ${data.explorerUrl}`);
      } else {
        addLog(`❌ Faucet error: ${data.error}`);
      }
    } catch (err: any) {
      addLog(`❌ Faucet error: ${err.message}`);
    }

    setLoading(false);
  };

  // Copier dans le presse-papier
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addLog(`📋 Copied ${label} to clipboard`);
  };

  return (
    <div style={{ padding: 40, maxWidth: 900, margin: "0 auto", fontFamily: "system-ui" }}>
      <h1 style={{ marginBottom: 10 }}>🔐 CDP Wallet Dashboard</h1>
      <p style={{ color: "#666", marginBottom: 30 }}>
        Create and manage EVM wallets on Base Sepolia testnet
      </p>

      {/* Section Création */}
      <div style={{ background: "#f5f5f5", padding: 20, borderRadius: 8, marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>Create New Wallet</h2>
        
        <div style={{ display: "flex", gap: 10, marginBottom: 15 }}>
          <input
            type="text"
            placeholder="Wallet name (optional)"
            value={walletName}
            onChange={(e) => setWalletName(e.target.value)}
            style={{
              flex: 1,
              padding: "10px 15px",
              border: "1px solid #ddd",
              borderRadius: 6,
              fontSize: 16,
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={createWallet}
            disabled={loading}
            style={{
              padding: "12px 24px",
              background: loading ? "#ccc" : "#0052FF",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {loading ? "Creating..." : "➕ Create New Wallet"}
          </button>

          <button
            onClick={getExistingWallet}
            disabled={loading}
            style={{
              padding: "12px 24px",
              background: loading ? "#ccc" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {loading ? "Loading..." : "🔍 Get Existing Wallet"}
          </button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div
          style={{
            background: "#ffe6e6",
            border: "1px solid #ff4444",
            padding: 15,
            borderRadius: 8,
            marginBottom: 20,
            color: "#cc0000",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Informations Wallet */}
      {wallet && (
        <div style={{ background: "#e8f5e9", padding: 20, borderRadius: 8, marginBottom: 20 }}>
          <h2 style={{ marginTop: 0, color: "#2e7d32" }}>✅ Wallet Info</h2>
          
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ padding: "8px 0", fontWeight: 600, width: 120 }}>Address:</td>
                <td style={{ padding: "8px 0" }}>
                  <code style={{ background: "#fff", padding: "4px 8px", borderRadius: 4 }}>
                    {wallet.account.address}
                  </code>
                  <button
                    onClick={() => copyToClipboard(wallet.account.address, "address")}
                    style={{
                      marginLeft: 10,
                      padding: "4px 8px",
                      background: "#0052FF",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    Copy
                  </button>
                </td>
              </tr>
              <tr>
                <td style={{ padding: "8px 0", fontWeight: 600 }}>Name:</td>
                <td style={{ padding: "8px 0" }}>{wallet.account.name}</td>
              </tr>
              <tr>
                <td style={{ padding: "8px 0", fontWeight: 600 }}>Network:</td>
                <td style={{ padding: "8px 0" }}>{wallet.account.network}</td>
              </tr>
              {wallet.balance && (
                <tr>
                  <td style={{ padding: "8px 0", fontWeight: 600 }}>Balance:</td>
                  <td style={{ padding: "8px 0", fontSize: 18, fontWeight: 600, color: "#0052FF" }}>
                    {wallet.balance.eth} ETH
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => getBalance()}
              disabled={loading}
              style={{
                padding: "10px 20px",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              🔄 Refresh Balance
            </button>

            <button
              onClick={requestFaucet}
              disabled={loading}
              style={{
                padding: "10px 20px",
                background: loading ? "#ccc" : "#ff9800",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 14,
              }}
            >
              {loading ? "Requesting..." : "🚰 Request Testnet ETH"}
            </button>

            <a
              href={`https://sepolia.basescan.org/address/${wallet.account.address}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "10px 20px",
                background: "#17a2b8",
                color: "white",
                border: "none",
                borderRadius: 6,
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              🔗 View on Explorer
            </a>
          </div>

          {wallet.faucetTx && (
            <div style={{ marginTop: 15, padding: 10, background: "#fff3cd", borderRadius: 6 }}>
              <strong>Last Faucet TX:</strong>{" "}
              <a
                href={`https://sepolia.basescan.org/tx/${wallet.faucetTx}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {wallet.faucetTx.slice(0, 20)}...
              </a>
            </div>
          )}
        </div>
      )}

      {/* Logs */}
      <div style={{ background: "#1e1e1e", padding: 20, borderRadius: 8 }}>
        <h3 style={{ marginTop: 0, color: "#fff" }}>📜 Activity Log</h3>
        <div
          style={{
            background: "#0d0d0d",
            padding: 15,
            borderRadius: 6,
            maxHeight: 300,
            overflowY: "auto",
            fontFamily: "monospace",
            fontSize: 13,
            color: "#00ff00",
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: "#666" }}>No activity yet...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                {log}
              </div>
            ))
          )}
        </div>
        {logs.length > 0 && (
          <button
            onClick={() => setLogs([])}
            style={{
              marginTop: 10,
              padding: "6px 12px",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Clear Logs
          </button>
        )}
      </div>

      {/* Instructions */}
      <div style={{ marginTop: 30, padding: 20, background: "#e3f2fd", borderRadius: 8 }}>
        <h3 style={{ marginTop: 0 }}>📖 How to use</h3>
        <ol style={{ lineHeight: 1.8 }}>
          <li><strong>Create a wallet</strong> - Click "Create New Wallet" to generate a new EVM account</li>
          <li><strong>Get testnet ETH</strong> - Click "Request Testnet ETH" to get free test tokens</li>
          <li><strong>View on explorer</strong> - Click the explorer link to see your transactions</li>
          <li><strong>Use in your agent</strong> - The wallet is automatically saved and used by the DeFi agent</li>
        </ol>
        
        <h4>⚠️ Important Notes:</h4>
        <ul style={{ lineHeight: 1.8 }}>
          <li>This is on <strong>Base Sepolia testnet</strong> - tokens have no real value</li>
          <li>Your wallet is managed by Coinbase CDP - keys are secured server-side</li>
          <li>Faucet has rate limits - wait a few minutes between requests</li>
        </ul>
      </div>
    </div>
  );
}
