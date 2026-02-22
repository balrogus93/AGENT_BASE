// ============================================
// HEALTH CHECK API
// GET /api/health
// ============================================

import { NextResponse } from 'next/server';
import { getDB, initializeDatabase } from '@/lib/db';

export const runtime = 'edge'; // Vercel Edge Runtime

export async function GET() {
  try {
    // Test database connection
    const db = getDB();
    const dbCheck = await db`SELECT NOW() as time`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        serverTime: dbCheck[0]?.time
      },
      version: '1.0.0'
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      database: {
        connected: false
      }
    }, { status: 500 });
  }
}

// Initialize database on first call (optional)
export async function POST() {
  try {
    const result = await initializeDatabase();
    
    return NextResponse.json({
      status: 'initialized',
      ...result
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Failed to initialize'
    }, { status: 500 });
  }
}
