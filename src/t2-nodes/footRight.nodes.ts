import { footTopology } from "../data/topologies/foot.ts";
import { buildNodeSchema } from "./spec.ts";

export const footRightTopology = footTopology;
export const footRightPositions = {
  0: { x: 490, y: 320 },
  1: { x: 380, y: 320 },
  2: { x: 270, y: 320 },
  3: { x: 160, y: 320 },
  4: { x: 270, y: 430 },
  5: { x: 50, y: 300 }
};

export const footRightSchema = buildNodeSchema(footRightTopology, footRightPositions);
