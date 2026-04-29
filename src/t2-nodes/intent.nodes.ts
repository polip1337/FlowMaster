import { ajnaTopology } from "../data/topologies/ajna.ts";
import { buildNodeSchema } from "./spec.ts";

export const intentTopology = ajnaTopology;
export const intentPositions = {
  0: { x: 235, y: 120 }, 1: { x: 185, y: 200 }, 2: { x: 165, y: 290 }, 3: { x: 185, y: 380 },
  4: { x: 235, y: 460 }, 5: { x: 365, y: 120 }, 6: { x: 415, y: 200 }, 7: { x: 435, y: 290 },
  8: { x: 415, y: 380 }, 9: { x: 365, y: 460 }, 10: { x: 300, y: 500 }, 11: { x: 300, y: 80 }
};

export const intentSchema = buildNodeSchema(intentTopology, intentPositions);
