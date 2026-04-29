import { sahasraraTopology } from "../data/topologies/sahasrara.ts";
import { buildNodeSchema } from "./spec.ts";

export const mindTopology = sahasraraTopology;
export const mindPositions = {
  0: { x: 300, y: 50 }, 1: { x: 538, y: 223 }, 2: { x: 447, y: 502 }, 3: { x: 153, y: 502 },
  4: { x: 62, y: 223 }, 5: { x: 235, y: 180 }, 6: { x: 380, y: 235 }, 7: { x: 350, y: 390 },
  8: { x: 190, y: 360 }, 9: { x: 265, y: 275 }, 10: { x: 335, y: 320 }, 11: { x: 300, y: 300 }
};

export const mindSchema = buildNodeSchema(mindTopology, mindPositions);
