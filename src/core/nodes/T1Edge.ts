import { clamp } from "../../utils/math";

export interface T1Edge {
  fromId: number;
  toId: number;
  weight: number;
  isLocked: boolean;
}

export type T1EdgeMap = Map<string, T1Edge>;

export function edgeKey(fromId: number, toId: number): string {
  return `${fromId}-${toId}`;
}

export function getEdge(map: T1EdgeMap, fromId: number, toId: number): T1Edge | undefined {
  return map.get(edgeKey(fromId, toId));
}

export function setEdgeWeight(map: T1EdgeMap, fromId: number, toId: number, weight: number): void {
  const existing = getEdge(map, fromId, toId);
  if (!existing) {
    return;
  }

  existing.weight = Math.round(clamp(weight, 0, 100));
}
