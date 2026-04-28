/**
 * Full T2 body graph (GDD §3). Each entry is one canonical directed meridian channel.
 * Shoulders connect through Anahata only (no direct L_SHOULDER↔R_SHOULDER meridian).
 */

export interface BodyEdgeDef {
  fromNodeId: string;
  toNodeId: string;
  canonicalDir: string;
  fromT1IoId: number;
  toT1IoId: number;
  hopCount: number;
}

import { makeMeridianId } from "../core/meridians/meridianId";

/** Stable id for a canonical (non-reverse) meridian instance (S-022). */
export function bodyMeridianId(fromNodeId: string, toNodeId: string): string {
  return makeMeridianId(fromNodeId, toNodeId);
}

const ADJ: Record<string, string[]> = {};

function addUndirected(a: string, b: string): void {
  (ADJ[a] ??= []).push(b);
  (ADJ[b] ??= []).push(a);
}

/** Shortest-path hop distance on the undirected body graph (for reverse-open costs, etc.). */
export function bodyGraphHopDistance(fromNodeId: string, toNodeId: string): number {
  if (fromNodeId === toNodeId) {
    return 0;
  }
  const seen = new Set<string>([fromNodeId]);
  let frontier = [fromNodeId];
  let dist = 1;
  while (frontier.length) {
    const next: string[] = [];
    for (const n of frontier) {
      for (const nb of ADJ[n] ?? []) {
        if (nb === toNodeId) {
          return dist;
        }
        if (!seen.has(nb)) {
          seen.add(nb);
          next.push(nb);
        }
      }
    }
    frontier = next;
    dist += 1;
  }
  return 1;
}

type BodyEdgeTuple = readonly [string, string, string, number, number];

const BODY_EDGE_TUPLES: BodyEdgeTuple[] = [
  ["MULADHARA", "SVADHISTHANA", "UP_SPINE_SACRAL", 0, 0],
  ["SVADHISTHANA", "MANIPURA", "UP_SPINE_SOLAR", 3, 3],
  ["MANIPURA", "ANAHATA", "UP_SPINE_HEART", 0, 3],
  ["ANAHATA", "VISHUDDHA", "UP_SPINE_THROAT", 0, 0],
  ["VISHUDDHA", "AJNA", "UP_SPINE_AJNA", 3, 10],
  ["AJNA", "SAHASRARA", "UP_SPINE_CROWN", 11, 0],
  ["SAHASRARA", "BINDU", "POSTERIOR_BINDU", 2, 0],

  ["ANAHATA", "L_SHOULDER", "LATERAL_ARM_L", 5, 0],
  ["L_SHOULDER", "L_ELBOW", "DOWN_ARM_L", 7, 0],
  ["L_ELBOW", "L_WRIST", "DOWN_ARM_L", 2, 0],
  ["L_WRIST", "L_HAND", "DOWN_ARM_L", 2, 0],

  ["ANAHATA", "R_SHOULDER", "LATERAL_ARM_R", 1, 0],
  ["R_SHOULDER", "R_ELBOW", "DOWN_ARM_R", 7, 0],
  ["R_ELBOW", "R_WRIST", "DOWN_ARM_R", 2, 0],
  ["R_WRIST", "R_HAND", "DOWN_ARM_R", 2, 0],

  ["MULADHARA", "L_HIP", "DOWN_LEG_ROOT_HIP_L", 1, 0],
  ["L_HIP", "L_KNEE", "DOWN_LEG_L", 6, 0],
  ["L_KNEE", "L_ANKLE", "DOWN_LEG_L", 5, 0],
  ["L_ANKLE", "L_FOOT", "DOWN_LEG_L", 3, 0],

  ["MULADHARA", "R_HIP", "DOWN_LEG_ROOT_HIP_R", 2, 0],
  ["R_HIP", "R_KNEE", "DOWN_LEG_R", 6, 0],
  ["R_KNEE", "R_ANKLE", "DOWN_LEG_R", 5, 0],
  ["R_ANKLE", "R_FOOT", "DOWN_LEG_R", 3, 0],

  ["SVADHISTHANA", "L_HIP", "LATERAL_BELT_L", 1, 2],
  ["SVADHISTHANA", "R_HIP", "LATERAL_BELT_R", 4, 2],

  ["L_HIP", "R_HIP", "CROSS_HIP_L_TO_R", 8, 8]
];

for (const [a, b] of BODY_EDGE_TUPLES) {
  addUndirected(a, b);
}

export const BODY_MAP_EDGES: BodyEdgeDef[] = BODY_EDGE_TUPLES.map(
  ([fromNodeId, toNodeId, canonicalDir, fromT1IoId, toT1IoId]) => ({
    fromNodeId,
    toNodeId,
    canonicalDir,
    fromT1IoId,
    toT1IoId,
    hopCount: bodyGraphHopDistance(fromNodeId, toNodeId)
  })
);

export const BODY_T2_IDS: string[] = [
  "MULADHARA",
  "SVADHISTHANA",
  "MANIPURA",
  "ANAHATA",
  "VISHUDDHA",
  "AJNA",
  "SAHASRARA",
  "BINDU",
  "L_SHOULDER",
  "R_SHOULDER",
  "L_ELBOW",
  "R_ELBOW",
  "L_WRIST",
  "R_WRIST",
  "L_HAND",
  "R_HAND",
  "L_HIP",
  "R_HIP",
  "L_KNEE",
  "R_KNEE",
  "L_ANKLE",
  "R_ANKLE",
  "L_FOOT",
  "R_FOOT"
];
