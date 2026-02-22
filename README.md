# 🤖 DeFi Agent

Automated DeFi portfolio management agent running on Vercel serverless with Neon Postgres.

## Architecture

```
├── app/                    # Next.js App Router
│   ├── api/
│   │   ├── health/        # GET: System status
│   │   ├── allocate/      # GET/POST: Portfolio allocation
│   │   └── rebalance/     # GET/POST: Rebalancing
│   ├── page.tsx           # Dashboard
│   └── layout.tsx
├── engine/                 # Core business logic
│   ├── riskEngine.ts      # Risk scoring & assessment
│   ├── allocationEngine.ts # Portfolio optimization
│   └── executionEngine.ts # Transaction execution
├── lib/                    # Shared utilities
│   ├── types.ts           # TypeScript definitions
│   ├── db.ts              # Neon database client
│   └── wallet.ts          # Wallet abstraction (CDP ready)
├── config/
│   └── protocols.ts       # Protocol configurations
└── tsconfig.json          # Path aliases configured
```

## Quick Start

### 1. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/agent-defi)

### 2. Set Environment Variables in Vercel

```
DATABASE_URL=postgresql://...@neon.tech/...?sslmode=require
DRY_RUN=true
```

### 3. Initialize Database

```bash
curl -X POST https://your-app.vercel.app/api/health
```

## API Endpoints

### `GET /api/health`
Check system status and database connection.

### `GET /api/allocate?strategy=risk-adjusted&assessments=true`
Get optimal portfolio allocation.

**Query params:**
- `strategy`: `risk-adjusted` | `conservative` | `equal-weight`
- `assessments`: `true` to include risk breakdown

### `POST /api/allocate`
Calculate and save allocation to database.

```json
{ "strategy": "risk-adjusted" }
```

### `GET /api/rebalance`
Preview rebalancing actions (dry run).

### `POST /api/rebalance`
Execute rebalance.

```json
{
  "force": false,
  "dryRun": true
}
```

## Risk Engine

The risk engine calculates a weighted score (0-100) based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| Audit Score | 30% | Security audit quality |
| TVL Score | 25% | Total Value Locked |
| Age Score | 20% | Protocol maturity |
| Complexity | 15% | Smart contract complexity |
| Chain Score | 10% | L1/L2 maturity |

**Adjusted Yield** = APY × (Risk Score / 100)^0.5

## Supported Protocols (Base)

- Aave V3
- Compound V3
- Morpho
- Moonwell
- Aerodrome

## CDP Wallet Integration (Coming Soon)

The wallet module is designed for Coinbase CDP Agentic Wallet integration:

```typescript
// Future implementation in lib/wallet.ts
import { AgenticWallet } from '@coinbase/cdp-sdk';

const wallet = new AgenticWallet({
  apiKey: process.env.CDP_API_KEY,
  network: Network.BASE_MAINNET
});
```

## Development

```bash
# Install dependencies
npm install

# Type check
npm run type-check

# Build
npm run build
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `DRY_RUN` | No | Set to `true` to disable real transactions |
| `CDP_API_KEY` | No | Coinbase CDP API key (for wallet) |
| `WALLET_ADDRESS` | No | Wallet address to manage |

## License

MIT
