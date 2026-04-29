import { svadhisthanaTopology } from "../data/topologies/svadhisthana.ts";
import { buildNodeSchema } from "./spec.ts";

export const dantianTopology = svadhisthanaTopology;
export const dantianPositions = {
  0: { x: 300, y: 50 }, 1: { x: 517, y: 175 }, 2: { x: 517, y: 425 }, 3: { x: 300, y: 550 },
  4: { x: 83, y: 425 }, 5: { x: 83, y: 175 }, 6: { x: 300, y: 175 }, 7: { x: 408, y: 238 },
  8: { x: 408, y: 363 }, 9: { x: 300, y: 425 }, 10: { x: 192, y: 363 }, 11: { x: 192, y: 238 }
};

export const dantianSchema = buildNodeSchema(dantianTopology, dantianPositions);
