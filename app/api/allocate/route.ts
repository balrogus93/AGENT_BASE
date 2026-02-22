// ============================================
// ALLOCATION API
// GET /api/allocate - Get optimal allocation
// POST /api/allocate - Calculate and save new allocation
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { calculateOptimalAllocation, AllocationStrategy } from '@/engine/allocationEngine';
import { assessAllProtocols } from '@/engine/riskEngine';
import { getEnabledProtocols } from '@/config/protocols';
import { logAction, savePortfolioSnapshot, getLatestPortfolio } from '@/lib/db';

export const runtime = 'edge';

// GET: Retrieve current/optimal allocation
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const strategy = (searchParams.get('strategy') || 'risk-adjusted') as AllocationStrategy;
    const includeAssessments = searchParams.get('assessments') === 'true';
    
    // Calculate optimal allocation
    const portfolio = calculateOptimalAllocation(strategy);
    
    // Get latest saved portfolio for comparison
    const savedPortfolio = await getLatestPortfolio();
    
    const response: Record<string, unknown> = {
      strategy,
      portfolio: {
        totalValueUSD: portfolio.totalValueUSD,
        expectedAPY: portfolio.expectedAPY.toFixed(2) + '%',
        weightedRiskScore: portfolio.weightedRiskScore.toFixed(1),
        allocations: portfolio.allocations.map(a => ({
          protocol: a.protocolId,
          percentage: a.percentage.toFixed(1) + '%',
          amountUSD: a.amountUSD.toFixed(2),
          expectedYield: a.expectedYield.toFixed(2) + '%',
          riskScore: a.riskScore
        }))
      },
      lastSaved: savedPortfolio?.created_at || null
    };
    
    // Optionally include risk assessments
    if (includeAssessments) {
      const protocols = getEnabledProtocols();
      const assessments = assessAllProtocols(protocols);
      
      response.assessments = assessments.map(a => ({
        protocol: a.protocolId,
        riskScore: a.totalRiskScore,
        adjustedYield: a.adjustedYield.toFixed(2) + '%',
        recommendation: a.recommendation,
        breakdown: a.breakdown
      }));
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[ALLOCATE API] Error:', error);
    
    return NextResponse.json({
      error: 'Failed to calculate allocation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST: Calculate and persist new allocation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const strategy = (body.strategy || 'risk-adjusted') as AllocationStrategy;
    
    // Calculate optimal allocation
    const portfolio = calculateOptimalAllocation(strategy);
    
    // Save to database
    const snapshot = await savePortfolioSnapshot(
      portfolio.totalValueUSD,
      portfolio.allocations,
      portfolio.expectedAPY,
      portfolio.weightedRiskScore
    );
    
    // Log the action
    await logAction('allocation_calculated', {
      strategy,
      portfolioId: snapshot.id,
      expectedAPY: portfolio.expectedAPY,
      allocationsCount: portfolio.allocations.length
    });
    
    return NextResponse.json({
      success: true,
      portfolioId: snapshot.id,
      timestamp: snapshot.created_at,
      portfolio: {
        totalValueUSD: portfolio.totalValueUSD,
        expectedAPY: portfolio.expectedAPY.toFixed(2) + '%',
        weightedRiskScore: portfolio.weightedRiskScore.toFixed(1),
        allocations: portfolio.allocations
      }
    });
    
  } catch (error) {
    console.error('[ALLOCATE API] Error:', error);
    
    await logAction('allocation_error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    }, false);
    
    return NextResponse.json({
      error: 'Failed to save allocation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
