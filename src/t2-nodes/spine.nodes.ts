import { muladharaTopology } from "../data/topologies/muladhara.ts";
import { buildNodeSchema } from "./spec.ts";

export const spineTopology = muladharaTopology;
export const spinePositions = {
  0: { x: 300, y: 70 }, 1: { x: 90, y: 280 }, 2: { x: 510, y: 280 }, 3: { x: 300, y: 520 },
  4: { x: 165, y: 165 }, 5: { x: 435, y: 165 }, 6: { x: 165, y: 395 }, 7: { x: 435, y: 395 },
  8: { x: 220, y: 235 }, 9: { x: 380, y: 235 }, 10: { x: 300, y: 355 }, 11: { x: 300, y: 285 }
};

export const spineSchema = buildNodeSchema(spineTopology, spinePositions);
