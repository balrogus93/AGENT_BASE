// ============================================
// REBALANCE API
// GET /api/rebalance - Preview rebalance actions
// POST /api/rebalance - Execute rebalance
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  calculateOptimalAllocation, 
  calculateRebalanceActions,
  shouldRebalance 
} from '@/engine/allocationEngine';
import { executeRebalance, saveCurrentState } from '@/engine/executionEngine';
import { logAction, getLatestPortfolio } from '@/lib/db';
import { connectWallet, isWalletConnected, getWalletBalance } from '@/lib/wallet';
import type { Portfolio, Allocation } from '@/lib/types';

export const runtime = 'edge';

// GET: Preview rebalance actions (dry run)
export async function GET() {
  try {
    // Get current portfolio from database
    const savedPortfolio = await getLatestPortfolio();
    
    if (!savedPortfolio) {
      return NextResponse.json({
        needsRebalance: false,
        reason: 'No existing portfolio found. Call POST /api/allocate first.',
        actions: []
      });
    }
    
    // Reconstruct portfolio object
    const currentPortfolio: Portfolio = {
      totalValueUSD: Number(savedPortfolio.total_value_usd),
      allocations: savedPortfolio.allocations as Allocation[],
      expectedAPY: Number(savedPortfolio.expected_apy),
      weightedRiskScore: Number(savedPortfolio.weighted_risk_score),
      lastRebalance: new Date(savedPortfolio.created_at),
      nextRebalance: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h from now
    };
    
    // Calculate new optimal allocation
    const targetPortfolio = calculateOptimalAllocation('risk-adjusted');
    
    // Determine if rebalance is needed
    const needsRebalance = shouldRebalance(currentPortfolio);
    
    // Calculate what actions would be needed
    const actions = calculateRebalanceActions(currentPortfolio, targetPortfolio);
    
    return NextResponse.json({
      needsRebalance,
      reason: needsRebalance ? 'Rebalance interval reached or allocation drift detected' : 'No rebalance needed yet',
      currentPortfolio: {
        expectedAPY: currentPortfolio.expectedAPY.toFixed(2) + '%',
        weightedRiskScore: currentPortfolio.weightedRiskScore.toFixed(1),
        allocationsCount: currentPortfolio.allocations.length,
        lastRebalance: currentPortfolio.lastRebalance
      },
      targetPortfolio: {
        expectedAPY: targetPortfolio.expectedAPY.toFixed(2) + '%',
        weightedRiskScore: targetPortfolio.weightedRiskScore.toFixed(1),
        allocationsCount: targetPortfolio.allocations.length
      },
      actions: actions.map(a => ({
        type: a.type,
        from: a.fromProtocol || null,
        to: a.toProtocol || null,
        amountUSD: a.amountUSD.toFixed(2),
        reason: a.reason,
        priority: a.priority
      })),
      dryRun: true
    });
    
  } catch (error) {
    console.error('[REBALANCE API] Error:', error);
    
    return NextResponse.json({
      error: 'Failed to calculate rebalance',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST: Execute rebalance
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const force = body.force === true;
    const dryRun = body.dryRun === true;
    
    // Check wallet connection
    if (!isWalletConnected()) {
      const connectResult = await connectWallet();
      
      if (!connectResult.success) {
        return NextResponse.json({
          error: 'Wallet connection failed',
          details: connectResult.error
        }, { status: 400 });
      }
    }
    
    // Get wallet balance
    const balance = await getWalletBalance();
    
    // Get current portfolio
    const savedPortfolio = await getLatestPortfolio();
    
    // Build current portfolio (or empty if first time)
    const currentPortfolio: Portfolio = savedPortfolio ? {
      totalValueUSD: Number(savedPortfolio.total_value_usd),
      allocations: savedPortfolio.allocations as Allocation[],
      expectedAPY: Number(savedPortfolio.expected_apy),
      weightedRiskScore: Number(savedPortfolio.weighted_risk_score),
      lastRebalance: new Date(savedPortfolio.created_at),
      nextRebalance: new Date()
    } : {
      totalValueUSD: balance.balanceUSD,
      allocations: [],
      expectedAPY: 0,
      weightedRiskScore: 0,
      lastRebalance: new Date(0),
      nextRebalance: new Date()
    };
    
    // Check if rebalance is needed (unless forced)
    if (!force && savedPortfolio && !shouldRebalance(currentPortfolio)) {
      return NextResponse.json({
        executed: false,
        reason: 'Rebalance not needed yet. Use force=true to override.',
        nextRebalance: currentPortfolio.nextRebalance
      });
    }
    
    // Calculate target allocation
    const targetPortfolio = calculateOptimalAllocation('risk-adjusted');
    
    // Calculate actions
    const actions = calculateRebalanceActions(currentPortfolio, targetPortfolio);
    
    if (actions.length === 0) {
      return NextResponse.json({
        executed: false,
        reason: 'No rebalancing actions needed',
        portfolio: targetPortfolio
      });
    }
    
    // Log rebalance start
    await logAction('rebalance_started', {
      force,
      dryRun,
      actionsCount: actions.length,
      walletAddress: balance.address
    });
    
    // Execute or simulate
    if (dryRun) {
      return NextResponse.json({
        executed: false,
        dryRun: true,
        wouldExecute: actions,
        targetPortfolio: {
          expectedAPY: targetPortfolio.expectedAPY.toFixed(2) + '%',
          allocations: targetPortfolio.allocations
        }
      });
    }
    
    // Execute rebalance
    const { results, successCount, failCount } = await executeRebalance(actions);
    
    // Save new portfolio state
    await saveCurrentState(targetPortfolio);
    
    return NextResponse.json({
      executed: true,
      summary: {
        totalActions: actions.length,
        successful: successCount,
        failed: failCount
      },
      results: results.map((r, i) => ({
        action: actions[i].type,
        protocol: actions[i].toProtocol || actions[i].fromProtocol,
        success: r.success,
        txHash: r.txHash,
        error: r.error
      })),
      newPortfolio: {
        totalValueUSD: targetPortfolio.totalValueUSD,
        expectedAPY: targetPortfolio.expectedAPY.toFixed(2) + '%',
        allocationsCount: targetPortfolio.allocations.length
      }
    });
    
  } catch (error) {
    console.error('[REBALANCE API] Error:', error);
    
    await logAction('rebalance_error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    }, false);
    
    return NextResponse.json({
      error: 'Rebalance execution failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
