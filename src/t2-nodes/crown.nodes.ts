import { binduTopology } from "../data/topologies/bindu.ts";
import { buildNodeSchema } from "./spec.ts";

export const crownTopology = binduTopology;
export const crownPositions = {
  0: { x: 547, y: 416 }, 1: { x: 521, y: 456 }, 2: { x: 481, y: 490 }, 3: { x: 430, y: 516 },
  4: { x: 370, y: 534 }, 5: { x: 300, y: 540 }, 6: { x: 230, y: 534 }, 7: { x: 170, y: 516 },
  8: { x: 119, y: 490 }, 9: { x: 79, y: 456 }, 10: { x: 53, y: 416 }, 11: { x: 300, y: 90 }
};

export const crownSchema = buildNodeSchema(crownTopology, crownPositions);
