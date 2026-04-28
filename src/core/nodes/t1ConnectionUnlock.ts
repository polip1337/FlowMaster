import { allTopologies } from "../../data/topologies";
import type { T1EdgeDef } from "../../data/topologies/types";
import { T2_NODE_DEFS_BY_ID } from "../../data/t2NodeDefs";
import type { GameState } from "../../state/GameState";
import { edgeKey } from "./T1Edge";
import { TreasureType } from "../treasures/types";

const MAX_UNLOCKED_CONNECTIONS_PER_CLUSTER = 2;
const STRUCTURE_CATALYST_MODE = "unlock_t1_connection";

function isUndirectedMatch(a: T1EdgeDef, fromId: number, toId: number): boolean {
  return (a.from === fromId && a.to === toId) || (a.from === toId && a.to === fromId);
}

function spendStructureCatalyst(next: GameState): void {
  const idx = next.inventory.findIndex(
    (item) => item.type === TreasureType.CultivationManual && "mode" in item.effect && item.effect.mode === STRUCTURE_CATALYST_MODE
  );
  if (idx < 0) {
    throw new Error("Structure Catalyst treasure is required.");
  }
  const catalyst = next.inventory[idx];
  catalyst.quantity = Math.max(0, Math.floor(catalyst.quantity) - 1);
  if (catalyst.quantity <= 0) {
    next.inventory.splice(idx, 1);
  }
}

export function unlockT1Connection(t2NodeId: string, fromId: number, toId: number, state: GameState): GameState {
  const next = structuredClone(state);
  const t2 = next.t2Nodes.get(t2NodeId);
  if (!t2) {
    throw new Error(`T2 node ${t2NodeId} not found.`);
  }

  const t2Def = T2_NODE_DEFS_BY_ID.get(t2NodeId);
  if (!t2Def) {
    throw new Error(`T2 definition ${t2NodeId} not found.`);
  }
  const topology = allTopologies[t2Def.topologyId];
  if (!topology) {
    throw new Error(`Topology for ${t2NodeId} not found.`);
  }

  const potentialExtraEdges = topology.potentialExtraEdges ?? [];
  const isDirected = Boolean(topology.directedEdges);
  if (!t2.t1Nodes.has(fromId) || !t2.t1Nodes.has(toId)) {
    throw new Error(`Connection ${fromId}->${toId} references unknown T1 node id.`);
  }
  const allowed = potentialExtraEdges.some((edge) =>
    isDirected ? edge.from === fromId && edge.to === toId : isUndirectedMatch(edge, fromId, toId)
  );
  if (!allowed) {
    throw new Error(`Connection ${fromId}->${toId} is not allowed for ${t2NodeId}.`);
  }

  if (t2.unlockedEdges.length >= MAX_UNLOCKED_CONNECTIONS_PER_CLUSTER) {
    throw new Error(`T2 node ${t2NodeId} already reached max unlocked connections.`);
  }

  if (t2.t1Edges.has(edgeKey(fromId, toId))) {
    throw new Error(`Connection ${fromId}->${toId} already exists.`);
  }
  if (t2.unlockedEdges.some((edge) => (isDirected ? edge.from === fromId && edge.to === toId : isUndirectedMatch(edge, fromId, toId)))) {
    throw new Error(`Connection ${fromId}->${toId} already unlocked.`);
  }

  spendStructureCatalyst(next);

  t2.t1Edges.set(edgeKey(fromId, toId), {
    fromId,
    toId,
    weight: 0,
    isLocked: false
  });
  t2.t1Nodes.get(fromId)?.outgoingEdges.push(toId);
  t2.t1Nodes.get(toId)?.incomingEdges.push(fromId);
  t2.unlockedEdges.push({ from: fromId, to: toId, defaultWeight: 0 });

  return next;
}
