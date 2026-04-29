import { footTopology } from "../data/topologies/foot.ts";
import { buildNodeSchema } from "./spec.ts";

export const footLeftTopology = footTopology;
export const footLeftPositions = {
  0: { x: 110, y: 320 },
  1: { x: 220, y: 320 },
  2: { x: 330, y: 320 },
  3: { x: 440, y: 320 },
  4: { x: 330, y: 430 },
  5: { x: 550, y: 300 }
};

export const footLeftSchema = buildNodeSchema(footLeftTopology, footLeftPositions);
