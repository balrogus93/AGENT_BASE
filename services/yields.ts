// Service pour récupérer les APY en temps réel des protocoles DeFi
import { createPublicClient, http, formatUnits } from "viem";
import { base } from "viem/chains";
import { 
  AAVE_V3, 
  MORPHO, 
  COMPOUND_V3, 
  TOKENS,
  ABIS,
  ACTIVE_PROTOCOLS 
} from "@/config/mainnet";

// Client public pour Base mainnet
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org"),
});

export interface ProtocolYield {
  id: string;
  name: string;
  protocol: string;
  asset: string;
  apy: number;           // APY en pourcentage (ex: 5.25)
  tvl: number;           // TVL en USD
  risk: number;          // Score de risque 0-1
  lastUpdated: Date;
}

// ============================================
// AAVE V3
// ============================================
export async function getAaveV3Yields(): Promise<ProtocolYield[]> {
  const yields: ProtocolYield[] = [];
  
  try {
    // Récupérer les données via le Data Provider
    for (const [assetName, assetConfig] of Object.entries(AAVE_V3.assets)) {
      try {
        const data = await publicClient.readContract({
          address: AAVE_V3.poolDataProvider as `0x${string}`,
          abi: [
            {
              name: "getReserveData",
              type: "function",
              stateMutability: "view",
              inputs: [{ name: "asset", type: "address" }],
              outputs: [
                { name: "unbacked", type: "uint256" },
                { name: "accruedToTreasuryScaled", type: "uint256" },
                { name: "totalAToken", type: "uint256" },
                { name: "totalStableDebt", type: "uint256" },
                { name: "totalVariableDebt", type: "uint256" },
                { name: "liquidityRate", type: "uint256" },
                { name: "variableBorrowRate", type: "uint256" },
                { name: "stableBorrowRate", type: "uint256" },
                { name: "averageStableBorrowRate", type: "uint256" },
                { name: "liquidityIndex", type: "uint256" },
                { name: "variableBorrowIndex", type: "uint256" },
                { name: "lastUpdateTimestamp", type: "uint40" },
              ],
            },
          ],
          functionName: "getReserveData",
          args: [assetConfig.underlying as `0x${string}`],
        }) as any[];

        // liquidityRate est en RAY (10^27), convertir en APY
        const liquidityRate = data[5];
        const RAY = 10n ** 27n;
        const SECONDS_PER_YEAR = 31536000n;
        
        // APR = liquidityRate / RAY
        const apr = Number(liquidityRate) / Number(RAY);
        // APY = (1 + APR/n)^n - 1, avec n = secondes par an (composé en continu)
        const apy = (Math.pow(1 + apr / 31536000, 31536000) - 1) * 100;

        // TVL approximatif
        const totalAToken = data[2];
        const decimals = TOKENS[assetName as keyof typeof TOKENS]?.decimals || 18;
        const tvlRaw = Number(formatUnits(totalAToken, decimals));

        yields.push({
          id: `aave-v3-${assetName.toLowerCase()}`,
          name: `Aave V3 ${assetName}`,
          protocol: "aave-v3",
          asset: assetName,
          apy: Math.round(apy * 100) / 100,
          tvl: tvlRaw, // En tokens, pas en USD
          risk: 0.1, // Aave est considéré low risk
          lastUpdated: new Date(),
        });
      } catch (assetError) {
        console.error(`[Aave] Error fetching ${assetName}:`, assetError);
      }
    }
  } catch (error) {
    console.error("[Aave] Error fetching yields:", error);
  }

  return yields;
}

// ============================================
// MORPHO
// ============================================
export async function getMorphoYields(): Promise<ProtocolYield[]> {
  const yields: ProtocolYield[] = [];

  try {
    // Query GraphQL API de Morpho
    const query = `
      query {
        vaults(first: 20, where: { chainId_in: [8453] }, orderBy: TotalAssetsUsd, orderDirection: Desc) {
          items {
            address
            name
            symbol
            state {
              apy
              netApy
              totalAssetsUsd
            }
            asset {
              symbol
              decimals
            }
          }
        }
      }
    `;

    const response = await fetch(MORPHO.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Morpho API error: ${response.status}`);
    }

    const data = await response.json();
    const vaults = data?.data?.vaults?.items || [];

    for (const vault of vaults) {
      if (!vault.state) continue;

      yields.push({
        id: `morpho-${vault.address.slice(0, 8).toLowerCase()}`,
        name: vault.name || `Morpho ${vault.symbol}`,
        protocol: "morpho",
        asset: vault.asset?.symbol || "UNKNOWN",
        apy: parseFloat(vault.state.netApy || vault.state.apy || "0") * 100,
        tvl: parseFloat(vault.state.totalAssetsUsd || "0"),
        risk: 0.15, // Morpho légèrement plus risqué
        lastUpdated: new Date(),
      });
    }
  } catch (error) {
    console.error("[Morpho] Error fetching yields:", error);
  }

  return yields;
}

// ============================================
// COMPOUND V3
// ============================================
export async function getCompoundV3Yields(): Promise<ProtocolYield[]> {
  const yields: ProtocolYield[] = [];

  try {
    // Récupérer l'utilization et le supply rate
    const [utilization, supplyRate] = await Promise.all([
      publicClient.readContract({
        address: COMPOUND_V3.cometUsdc as `0x${string}`,
        abi: [
          {
            name: "getUtilization",
            type: "function",
            stateMutability: "view",
            inputs: [],
            outputs: [{ type: "uint256" }],
          },
        ],
        functionName: "getUtilization",
      }),
      publicClient.readContract({
        address: COMPOUND_V3.cometUsdc as `0x${string}`,
        abi: [
          {
            name: "getSupplyRate",
            type: "function",
            stateMutability: "view",
            inputs: [{ name: "utilization", type: "uint256" }],
            outputs: [{ type: "uint64" }],
          },
        ],
        functionName: "getSupplyRate",
        args: [await publicClient.readContract({
          address: COMPOUND_V3.cometUsdc as `0x${string}`,
          abi: [{ name: "getUtilization", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }],
          functionName: "getUtilization",
        })],
      }),
    ]);

    // Supply rate est par seconde, convertir en APY
    const secondsPerYear = 31536000;
    const supplyRatePerYear = Number(supplyRate) * secondsPerYear;
    const apy = (supplyRatePerYear / 1e18) * 100;

    yields.push({
      id: "compound-v3-usdc",
      name: "Compound V3 USDC",
      protocol: "compound-v3",
      asset: "USDC",
      apy: Math.round(apy * 100) / 100,
      tvl: 0, // À implémenter
      risk: 0.12,
      lastUpdated: new Date(),
    });
  } catch (error) {
    console.error("[Compound] Error fetching yields:", error);
  }

  return yields;
}

// ============================================
// AGGREGATEUR
// ============================================
export async function getAllProtocolYields(): Promise<ProtocolYield[]> {
  console.log("[Yields] Fetching all protocol yields...");

  const [aaveYields, morphoYields, compoundYields] = await Promise.allSettled([
    getAaveV3Yields(),
    getMorphoYields(),
    getCompoundV3Yields(),
  ]);

  const allYields: ProtocolYield[] = [];

  if (aaveYields.status === "fulfilled") {
    allYields.push(...aaveYields.value);
  } else {
    console.error("[Yields] Aave failed:", aaveYields.reason);
  }

  if (morphoYields.status === "fulfilled") {
    allYields.push(...morphoYields.value);
  } else {
    console.error("[Yields] Morpho failed:", morphoYields.reason);
  }

  if (compoundYields.status === "fulfilled") {
    allYields.push(...compoundYields.value);
  } else {
    console.error("[Yields] Compound failed:", compoundYields.reason);
  }

  // Trier par APY décroissant
  allYields.sort((a, b) => b.apy - a.apy);

  console.log(`[Yields] Found ${allYields.length} protocols`);
  return allYields;
}

// Récupérer le meilleur yield pour un asset donné
export async function getBestYieldForAsset(asset: string): Promise<ProtocolYield | null> {
  const yields = await getAllProtocolYields();
  const filtered = yields.filter(y => y.asset.toUpperCase() === asset.toUpperCase());
  return filtered.length > 0 ? filtered[0] : null;
}

// Récupérer les yields filtrés par risque max
export async function getYieldsByRisk(maxRisk: number = 0.5): Promise<ProtocolYield[]> {
  const yields = await getAllProtocolYields();
  return yields.filter(y => y.risk <= maxRisk);
}
