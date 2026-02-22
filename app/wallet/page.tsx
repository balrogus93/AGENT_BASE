"use client";

import { useState, useEffect } from "react";

interface WalletAccount {
  address: string;
  name: string;
  network: string;
  createdAt?: string;
}

interface WalletInfo {
  account: WalletAccount;
  balance?: {
    wei: string;
    eth: string;
  };
  faucetTx?: string;
}

interface CdpAccount {
  address: string;
  name?: string;
}

export default function WalletDashboard() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletName, setWalletName] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [importName, setImportName] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [availableWallets, setAvailableWallets] = useState<CdpAccount[]>([]);
  const [showImportKey, setShowImportKey] = useState(false);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Charger les wallets disponibles au démarrage
  useEffect(() => {
    loadAvailableWallets();
  }, []);

  // Charger la liste des wallets CDP
  const loadAvailableWallets = async () => {
    try {
      const res = await fetch("/api/wallet/import");
      const data = await res.json();
      
      if (data.success) {
        setAvailableWallets(data.cdpAccounts || []);
        addLog(`Found ${data.total} existing CDP wallets`);
      }
    } catch (err) {
      console.error("Failed to load wallets:", err);
    }
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
        loadAvailableWallets();
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

  // Importer avec clé privée
  const importWithPrivateKey = async () => {
    if (!privateKey) {
      setError("Please enter a private key");
      return;
    }

    setLoading(true);
    setError(null);
    addLog("Importing wallet with private key...");

    try {
      const res = await fetch("/api/wallet/import-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          privateKey: privateKey,
          name: importName || undefined 
        }),
      });

      const data = await res.json();

      if (data.success) {
        setWallet({ account: data.account });
        addLog(`✅ Wallet imported: ${data.account.address}`);
        addLog(`   Name: ${data.account.name}`);
        addLog(`   ${data.message}`);
        setPrivateKey(""); // Clear for security
        setImportName("");
        setShowImportKey(false);
        loadAvailableWallets();
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

  // Sélectionner un wallet depuis la liste
  const selectWallet = async (account: CdpAccount) => {
    setLoading(true);
    addLog(`Selecting wallet: ${account.name || account.address}`);

    try {
      const res = await fetch("/api/wallet/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: account.name, 
          address: account.address 
        }),
      });

      const data = await res.json();

      if (data.success) {
        setWallet({ account: data.account });
        addLog(`✅ Wallet selected: ${data.account.address}`);
        await getBalance(data.account.address);
      } else {
        addLog(`❌ Error: ${data.error}`);
      }
    } catch (err: any) {
      addLog(`❌ Error: ${err.message}`);
    }

    setLoading(false);
  };

  // Récupérer le solde
  const getBalance = async (address?: string) => {
    const walletAddress = address || wallet?.account.address;
    if (!walletAddress) return;

    addLog(`Fetching balance for ${walletAddress.slice(0, 10)}...`);

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
        Create, import, and manage EVM wallets on Base Sepolia testnet
      </p>

      {/* Section Wallets Existants */}
      {availableWallets.length > 0 && (
        <div style={{ background: "#fff3cd", padding: 20, borderRadius: 8, marginBottom: 20 }}>
          <h2 style={{ marginTop: 0, color: "#856404" }}>📂 Your CDP Wallets ({availableWallets.length})</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {availableWallets.map((acc, i) => (
              <button
                key={i}
                onClick={() => selectWallet(acc)}
                disabled={loading}
                style={{
                  padding: "10px 15px",
                  background: wallet?.account.address === acc.address ? "#28a745" : "#fff",
                  color: wallet?.account.address === acc.address ? "#fff" : "#333",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{acc.name || "Unnamed"}</div>
                <div style={{ fontSize: 12, color: wallet?.account.address === acc.address ? "#cfc" : "#666" }}>
                  {acc.address.slice(0, 10)}...{acc.address.slice(-6)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Section Création / Import */}
      <div style={{ background: "#f5f5f5", padding: 20, borderRadius: 8, marginBottom: 20 }}>
        <h2 style={{ marginTop: 0 }}>➕ Create or Import Wallet</h2>
        
        {/* Créer nouveau */}
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
            {loading ? "..." : "Create New"}
          </button>
        </div>

        {/* Toggle Import avec clé privée */}
        <button
          onClick={() => setShowImportKey(!showImportKey)}
          style={{
            padding: "10px 20px",
            background: showImportKey ? "#dc3545" : "#6c757d",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          {showImportKey ? "✕ Cancel Import" : "🔑 Import with Private Key"}
        </button>

        {/* Section Import avec clé privée */}
        {showImportKey && (
          <div style={{ 
            marginTop: 15, 
            padding: 20, 
            background: "#fff", 
            borderRadius: 8,
            border: "2px solid #0052FF"
          }}>
            <h3 style={{ marginTop: 0, color: "#0052FF" }}>🔑 Import Existing Wallet</h3>
            
            <div style={{ 
              background: "#ffe6e6", 
              padding: 10, 
              borderRadius: 6, 
              marginBottom: 15,
              fontSize: 13 
            }}>
              ⚠️ <strong>Security Warning:</strong> Your private key will be sent to CDP servers 
              and managed by Coinbase. Only use this for testnet wallets or if you trust CDP.
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", marginBottom: 5, fontWeight: 600 }}>
                Wallet Name (optional)
              </label>
              <input
                type="text"
                placeholder="e.g., my-imported-wallet"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 15px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  fontSize: 14,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 15 }}>
              <label style={{ display: "block", marginBottom: 5, fontWeight: 600 }}>
                Private Key <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="password"
                placeholder="0x... or 64 hex characters"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 15px",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  fontSize: 14,
                  fontFamily: "monospace",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ fontSize: 12, color: "#666", marginTop: 5 }}>
                Format: 64 hex characters with or without 0x prefix
              </div>
            </div>
            
            <button
              onClick={importWithPrivateKey}
              disabled={loading || !privateKey}
              style={{
                padding: "12px 24px",
                background: loading || !privateKey ? "#ccc" : "#28a745",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: loading || !privateKey ? "not-allowed" : "pointer",
                fontSize: 16,
                fontWeight: 600,
                width: "100%",
              }}
            >
              {loading ? "Importing..." : "🔐 Import Wallet"}
            </button>
          </div>
        )}
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
          <button 
            onClick={() => setError(null)}
            style={{ 
              marginLeft: 10, 
              background: "none", 
              border: "none", 
              cursor: "pointer",
              color: "#cc0000"
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Informations Wallet Sélectionné */}
      {wallet && (
        <div style={{ background: "#e8f5e9", padding: 20, borderRadius: 8, marginBottom: 20 }}>
          <h2 style={{ marginTop: 0, color: "#2e7d32" }}>✅ Active Wallet</h2>
          
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ padding: "8px 0", fontWeight: 600, width: 120 }}>Address:</td>
                <td style={{ padding: "8px 0" }}>
                  <code style={{ background: "#fff", padding: "4px 8px", borderRadius: 4, fontSize: 13 }}>
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
            maxHeight: 200,
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
    </div>
  );
}
