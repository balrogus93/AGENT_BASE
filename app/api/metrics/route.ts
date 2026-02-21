import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  const system = await query("SELECT * FROM system_state LIMIT 1");

  return NextResponse.json({
    system: system[0] || null
  });
}
