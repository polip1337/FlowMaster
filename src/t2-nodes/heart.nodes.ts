import { anahataTopology } from "../data/topologies/anahata.ts";
import { buildNodeSchema } from "./spec.ts";

export const heartTopology = anahataTopology;
export const heartPositions = {
  0: { x: 300, y: 50 }, 1: { x: 517, y: 175 }, 2: { x: 517, y: 425 }, 3: { x: 300, y: 550 },
  4: { x: 83, y: 425 }, 5: { x: 83, y: 175 }, 6: { x: 421, y: 230 }, 7: { x: 421, y: 370 },
  8: { x: 300, y: 440 }, 9: { x: 179, y: 370 }, 10: { x: 179, y: 230 }, 11: { x: 300, y: 160 }
};

export const heartSchema = buildNodeSchema(heartTopology, heartPositions);
