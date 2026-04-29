import { kneeTopology } from "../data/topologies/knee.ts";
import { buildNodeSchema } from "./spec.ts";

export const kneeLeftTopology = kneeTopology;
export const kneeLeftPositions = {
  0: { x: 210, y: 110 },
  1: { x: 210, y: 220 },
  2: { x: 210, y: 330 },
  3: { x: 320, y: 330 },
  4: { x: 430, y: 330 },
  5: { x: 540, y: 330 }
};

export const kneeLeftSchema = buildNodeSchema(kneeLeftTopology, kneeLeftPositions);
