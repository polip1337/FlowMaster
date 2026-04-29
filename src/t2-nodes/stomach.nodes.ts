import { manipuraTopology } from "../data/topologies/manipura.ts";
import { buildNodeSchema } from "./spec.ts";

export const stomachTopology = manipuraTopology;
export const stomachPositions = {
  0: { x: 300, y: 50 }, 1: { x: 517, y: 175 }, 2: { x: 517, y: 425 }, 3: { x: 300, y: 550 },
  4: { x: 83, y: 425 }, 5: { x: 83, y: 175 }, 6: { x: 300, y: 155 }, 7: { x: 438, y: 255 },
  8: { x: 385, y: 417 }, 9: { x: 215, y: 417 }, 10: { x: 162, y: 255 }, 11: { x: 300, y: 300 }
};

export const stomachSchema = buildNodeSchema(stomachTopology, stomachPositions);
