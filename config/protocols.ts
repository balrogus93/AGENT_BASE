import type { Protocol } from "@/engine/allocationEngine";

// Protocol configurations
export interface ProtocolConfig {
  name: string;
  chain: string;
  enabled: boolean;
  contractAddress?: string;
  poolId?: string;
}

// Enabled protocols list
const PROTOCOL_CONFIGS: ProtocolConfig[] = [
  {
    name: "Aave",
    chain: "base",
    enabled: true,
  },
  {
    name: "Morpho",
    chain: "base",
    enabled: true,
  },
  {
    name: "Compound",
    chain: "base",
    enabled: false,
  },
];

// Get all enabled protocols
export function getEnabledProtocols(): ProtocolConfig[] {
  return PROTOCOL_CONFIGS.filter((p) => p.enabled);
}

// Fetch live data from Aave
async function getAaveData(): Promise<Protocol> {
  // TODO: Fetch real data from Aave API/subgraph
  // For now, return mock data
  return {
    name: "Aave",
    apy: 4.5,
    tvl: 50_000_000,
    chain: "base",
    enabled: true,
  };
}

// Fetch live data from Morpho
async function getMorphoData(): Promise<Protocol> {
  // TODO: Fetch real data from Morpho API
  return {
    name: "Morpho",
    apy: 5.2,
    tvl: 30_000_000,
    chain: "base",
    enabled: true,
  };
}

// Fetch live data from Compound
async function getCompoundData(): Promise<Protocol> {
  return {
    name: "Compound",
    apy: 3.8,
    tvl: 80_000_000,
    chain: "base",
    enabled: false,
  };
}

// Protocol fetchers map
const PROTOCOL_FETCHERS: Record<string, () => Promise<Protocol>> = {
  Aave: getAaveData,
  Morpho: getMorphoData,
  Compound: getCompoundData,
};

// Get all protocols with live data
export async function getAllProtocols(): Promise<Protocol[]> {
  const enabledConfigs = getEnabledProtocols();
  const protocols: Protocol[] = [];

  for (const config of enabledConfigs) {
    const fetcher = PROTOCOL_FETCHERS[config.name];
    if (fetcher) {
      try {
        const data = await fetcher();
        protocols.push(data);
      } catch (error) {
        console.error(`Failed to fetch ${config.name}:`, error);
      }
    }
  }

  return protocols;
}

// Get single protocol data
export async function getProtocolData(name: string): Promise<Protocol | null> {
  const fetcher = PROTOCOL_FETCHERS[name];
  if (!fetcher) return null;

  try {
    return await fetcher();
  } catch (error) {
    console.error(`Failed to fetch ${name}:`, error);
    return null;
  }
}
