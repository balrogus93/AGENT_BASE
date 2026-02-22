import { NextResponse } from "next/server";
import { getAllProtocolYields, getBestYieldForAsset, getYieldsByRisk } from "@/services/yields";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const asset = searchParams.get("asset");
    const maxRisk = searchParams.get("maxRisk");

    let yields;

    if (asset) {
      // Récupérer le meilleur yield pour un asset spécifique
      const best = await getBestYieldForAsset(asset);
      if (!best) {
        return NextResponse.json(
          { success: false, error: `No yields found for asset: ${asset}` },
          { status: 404 }
        );
      }
      yields = [best];
    } else if (maxRisk) {
      // Filtrer par risque maximum
      yields = await getYieldsByRisk(parseFloat(maxRisk));
    } else {
      // Tous les yields
      yields = await getAllProtocolYields();
    }

    return NextResponse.json({
      success: true,
      count: yields.length,
      yields,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[API Yields] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch yields" },
      { status: 500 }
    );
  }
}
