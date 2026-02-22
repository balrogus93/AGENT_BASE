import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: false,
    environment: {
      hasDbUrl: !!process.env.DATABASE_URL,
      hasCdpKeys: !!(process.env.CDP_API_KEY_ID && process.env.CDP_API_KEY_SECRET),
      hasCdpWalletSecret: !!process.env.CDP_WALLET_SECRET,
    },
  };

  try {
    await query('SELECT 1');
    checks.database = true;
  } catch (error) {
    checks.database = false;
  }

  const allHealthy = checks.database && checks.environment.hasDbUrl;

  return NextResponse.json(
    { ...checks, healthy: allHealthy },
    { status: allHealthy ? 200 : 503 }
  );
}
