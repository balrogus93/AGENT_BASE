-- Schema for DeFi Auto Agent
-- Run this in your Neon console

CREATE TABLE IF NOT EXISTS wallet_accounts (
  id SERIAL PRIMARY KEY,
  address VARCHAR(42) UNIQUE NOT NULL,
  name VARCHAR(100),
  network VARCHAR(50) DEFAULT 'base-sepolia',
  account_type VARCHAR(20) DEFAULT 'evm',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faucet_requests (
  id SERIAL PRIMARY KEY,
  address VARCHAR(42) NOT NULL,
  token VARCHAR(20) DEFAULT 'eth',
  tx_hash VARCHAR(66),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_state (
  id SERIAL PRIMARY KEY,
  current_protocol VARCHAR(100),
  current_apy DECIMAL(10, 4),
  last_rebalance TIMESTAMP,
  total_value_locked DECIMAL(20, 8),
  risk_score DECIMAL(5, 4),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rebalance_history (
  id SERIAL PRIMARY KEY,
  from_protocol VARCHAR(100),
  to_protocol VARCHAR(100),
  amount DECIMAL(20, 8),
  tx_hash VARCHAR(66),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS protocol_snapshots (
  id SERIAL PRIMARY KEY,
  protocol_name VARCHAR(100) NOT NULL,
  apy DECIMAL(10, 4),
  tvl DECIMAL(20, 2),
  risk_score DECIMAL(5, 4),
  adjusted_yield DECIMAL(10, 4),
  snapshot_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  tx_hash VARCHAR(66) UNIQUE,
  from_address VARCHAR(42),
  to_address VARCHAR(42),
  value_eth DECIMAL(20, 18),
  action VARCHAR(50),
  protocol VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS action_logs (
  id SERIAL PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id SERIAL PRIMARY KEY,
  total_value DECIMAL(20, 8),
  allocations JSONB,
  expected_apy DECIMAL(10, 4),
  total_risk DECIMAL(5, 4),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_accounts_address ON wallet_accounts(address);
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_protocol_snapshots_name ON protocol_snapshots(protocol_name);
CREATE INDEX IF NOT EXISTS idx_rebalance_history_created ON rebalance_history(created_at);
CREATE INDEX IF NOT EXISTS idx_action_logs_action ON action_logs(action);
CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_created ON portfolio_snapshots(created_at);

INSERT INTO system_state (id, current_protocol, current_apy, risk_score, total_value_locked)
VALUES (1, 'none', 0, 0, 0)
ON CONFLICT (id) DO NOTHING;
