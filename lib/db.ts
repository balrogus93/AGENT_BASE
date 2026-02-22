import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function query(text: string, params?: any[]) {
  if (params) {
    return await sql(text, params);
  }
  return await sql(text);
}

export async function logAction(
  action: string,
  details: Record<string, any>
): Promise<void> {
  try {
    await query(
      `INSERT INTO action_logs (action, details, created_at)
       VALUES ($1, $2, NOW())`,
      [action, JSON.stringify(details)]
    );
  } catch (error) {
    console.log(`[Action] ${action}:`, details);
  }
}

export async function savePortfolioSnapshot(portfolio: {
  totalValue: number;
  allocations: any[];
  expectedApy: number;
  totalRisk: number;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO portfolio_snapshots (total_value, allocations, expected_apy, total_risk, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        portfolio.totalValue,
        JSON.stringify(portfolio.allocations),
        portfolio.expectedApy,
        portfolio.totalRisk,
      ]
    );
  } catch (error) {
    console.error("[DB] Failed to save portfolio snapshot:", error);
  }
}

export async function getLatestPortfolio(): Promise<{
  totalValue: number;
  allocations: any[];
  expectedApy: number;
  totalRisk: number;
  createdAt: Date;
} | null> {
  try {
    const result = await query(
      "SELECT * FROM portfolio_snapshots ORDER BY created_at DESC LIMIT 1"
    );

    if (result.length === 0) return null;

    return {
      totalValue: parseFloat(result[0].total_value),
      allocations: result[0].allocations,
      expectedApy: parseFloat(result[0].expected_apy),
      totalRisk: parseFloat(result[0].total_risk),
      createdAt: result[0].created_at,
    };
  } catch (error) {
    console.error("[DB] Failed to get portfolio:", error);
    return null;
  }
}

export default sql;
