import { kneeTopology } from "../data/topologies/knee.ts";
import { buildNodeSchema } from "./spec.ts";

export const kneeRightTopology = kneeTopology;
export const kneeRightPositions = {
  0: { x: 390, y: 110 },
  1: { x: 390, y: 220 },
  2: { x: 390, y: 330 },
  3: { x: 280, y: 330 },
  4: { x: 170, y: 330 },
  5: { x: 60, y: 330 }
};

export const kneeRightSchema = buildNodeSchema(kneeRightTopology, kneeRightPositions);
