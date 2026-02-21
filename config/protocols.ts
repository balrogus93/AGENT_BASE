import { getAaveData } from "@/protocols/aave";
import { getMorphoData } from "@/protocols/morpho";

export async function getAllProtocols() {
  const aave = await getAaveData();
  const morpho = await getMorphoData();

  return [aave, morpho];
}
