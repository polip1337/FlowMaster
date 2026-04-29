// FlowMaster: tier-2 snapshots. Each T2 node keeps its own T1-graph state.

import { TIER2_NODES } from './constants.ts';
import { nodeData, edges, gameConfig, getTier2SchemaConfig, ensureClusterTier1UiFields, ensureMeridianUiFields } from './config.ts';
import { activeProjections, tier2Tier1Snapshots } from './state.ts';
import { nodeById } from './queries.ts';
import { edgeVisuals } from './state.ts';
import { deleteEdgeVisual, createEdgeVisual } from './edge-render.ts';
import { particles } from './state.ts';
import { st } from './state.ts';

const CLUSTER_SNAPSHOT_KEYS = [
  "energyQi",
  "energyJing",
  "energyYangQi",
  "energyShen",
  "refinementPoints",
  "quality",
  "damageState",
  "repairAccumulator"
] as const;

const CLUSTER_STATIC_KEYS = [
  "name",
  "unlockCost",
  "nodeType",
  "isSourceNode",
  "nodeShape",
  "canProject",
  "attributeType",
  "attributeTier",
  "bonuses"
] as const;

function clusterFieldsFromNode(node: any): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const k of CLUSTER_SNAPSHOT_KEYS) {
    if (node[k] !== undefined) o[k] = node[k];
  }
  return o;
}

function staticFieldsFromNode(node: any): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const k of CLUSTER_STATIC_KEYS) {
    if (node[k] !== undefined) o[k] = node[k];
  }
  return o;
}

function normalizeSnapshotToSchema(snapshot: any) {
  if (!snapshot?.tier2Id) return snapshot;
  const schemaSnapshot = buildSnapshotFromTier2Schema(snapshot.tier2Id);

  const incomingNodeById = new Map<number, any>(
    (snapshot.nodeState ?? []).map((entry: any) => [entry.id, entry])
  );
  const mergedNodeState = (schemaSnapshot.nodeState ?? []).map((schemaNode: any) => {
    const incoming = incomingNodeById.get(schemaNode.id);
    if (!incoming) return { ...schemaNode };
    const merged = { ...schemaNode };
    if (typeof incoming.unlocked === "boolean") merged.unlocked = incoming.unlocked;
    if (typeof incoming.si === "number" && Number.isFinite(incoming.si)) merged.si = incoming.si;
    for (const key of CLUSTER_SNAPSHOT_KEYS) {
      if (Object.prototype.hasOwnProperty.call(incoming, key)) {
        merged[key] = incoming[key];
      }
    }
    return merged;
  });

  const incomingFlows = snapshot.edgeFlows ?? {};
  const mergedEdgeFlows: Record<string, number> = {};
  for (const edge of schemaSnapshot.edgeDefs ?? []) {
    const nextFlow = incomingFlows[edge.key];
    mergedEdgeFlows[edge.key] =
      typeof nextFlow === "number" && Number.isFinite(nextFlow) ? nextFlow : 0;
  }

  return {
    ...schemaSnapshot,
    ...snapshot,
    nodeState: mergedNodeState,
    edgeDefs: schemaSnapshot.edgeDefs,
    edgeFlows: mergedEdgeFlows,
    projections: Array.isArray(snapshot.projections) ? snapshot.projections : []
  };
}

export function captureCurrentTier1Snapshot() {
  const nodeState = nodeData.map((node) => ({
    id: node.id,
    unlocked: node.unlocked,
    si: node.si,
    ...clusterFieldsFromNode(node)
  }));
  const edgeFlows = Object.fromEntries(edges.map((edge) => [edge.key, edge.flow]));
  const projections = activeProjections.map((p) => ({ ...p }));
  return { nodeState, edgeFlows, projections };
}

export function applyTier1Snapshot(snapshot: any) {
  const normalized = normalizeSnapshotToSchema(snapshot);
  if (!normalized) return;

  // Switching topologies must rebuild the edge graph *and* its PIXI visuals,
  // otherwise `from/to` changes won't render.
  if (Array.isArray(normalized.edgeDefs)) {
    // Clear existing edge visuals (and their cached geometry).
    for (const edgeKey of Object.keys(edgeVisuals)) {
      deleteEdgeVisual(edgeKey);
    }

    // Stop edge-flow particles from referencing removed edges.
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      particles[i]?.sprite?.destroy?.();
      particles.splice(i, 1);
    }
    st.particleLayer?.removeChildren?.();

    // Rebuild edge list to match the selected topology.
    edges.splice(
      0,
      edges.length,
      ...normalized.edgeDefs.map((e: any) => {
        const next = { ...e, flow: 0 };
        ensureMeridianUiFields(next);
        return next;
      })
    );

    // Recreate visuals for the new edge set.
    for (const edge of edges) {
      createEdgeVisual(edge);
    }
  }

  const nodeStateById = new Map<number, any>(normalized.nodeState.map((entry: any) => [entry.id, entry]));
  for (const edge of edges) { edge.flow = 0; }
  for (const node of nodeData) {
    const entry = nodeStateById.get(node.id);

    if (!entry) {
      node.unlocked = false;
      node.si = 0;
      ensureClusterTier1UiFields(node);
      continue;
    }
    ensureClusterTier1UiFields(node);
    node.unlocked = entry.unlocked;
    node.si = entry.si;
    for (const k of CLUSTER_STATIC_KEYS) {
      if (Object.prototype.hasOwnProperty.call(entry, k)) (node as any)[k] = (entry as any)[k];
    }
    for (const k of CLUSTER_SNAPSHOT_KEYS) {
      if (Object.prototype.hasOwnProperty.call(entry, k)) (node as any)[k] = (entry as any)[k];
    }
  }
  for (const edge of edges) {
    if (Object.prototype.hasOwnProperty.call(normalized.edgeFlows, edge.key)) {
      edge.flow = normalized.edgeFlows[edge.key];
    }
  }
  activeProjections.length = 0;
  for (const p of normalized.projections) { activeProjections.push({ ...p }); }
}

export function initializeTier2Snapshots() {
  tier2Tier1Snapshots.clear();
  for (const tier2 of TIER2_NODES) {
    const schemaConfig = getTier2SchemaConfig(tier2.id) ?? gameConfig;
    const schemaNodes = schemaConfig.nodeDefinitions ?? [];
    const schemaEdges = ((schemaConfig as any).nodeEdges ?? []).map((edge: any, index: number) => ({
      ...edge,
      key: edge.key ?? `${edge.from}_${edge.to}_${index}`
    }));
    tier2Tier1Snapshots.set(tier2.id, {
      tier2Id: tier2.id,
      nodeState: schemaNodes.map((node: any) => ({
        id: node.id,
        unlocked: node.unlocked,
        si: node.si,
        ...staticFieldsFromNode(node),
        ...clusterFieldsFromNode(node)
      })),
      edgeDefs: schemaEdges,
      edgeFlows: Object.fromEntries(schemaEdges.map((edge: any) => [edge.key, edge.flow])),
      projections: []
    });
  }
}

export function buildSnapshotFromTier2Schema(tier2Id: string) {
  const schemaConfig = getTier2SchemaConfig(tier2Id) ?? gameConfig;
  const schemaNodes = schemaConfig.nodeDefinitions ?? [];
  const schemaEdges = ((schemaConfig as any).nodeEdges ?? []).map((edge: any, index: number) => ({
    ...edge,
    key: edge.key ?? `${edge.from}_${edge.to}_${index}`
  }));
  return {
    tier2Id,
    nodeState: schemaNodes.map((node: any) => ({
      id: node.id,
      unlocked: node.unlocked,
      si: node.si,
      ...staticFieldsFromNode(node),
      ...clusterFieldsFromNode(node)
    })),
    edgeDefs: schemaEdges,
    edgeFlows: Object.fromEntries(schemaEdges.map((edge: any) => [edge.key, edge.flow])),
    projections: []
  };
}

export function getOrCreateTier2Snapshot(tier2Id: string) {
  if (!tier2Tier1Snapshots.has(tier2Id)) {
    tier2Tier1Snapshots.set(tier2Id, buildSnapshotFromTier2Schema(tier2Id));
  }
  const normalized = normalizeSnapshotToSchema(tier2Tier1Snapshots.get(tier2Id));
  if (normalized) {
    tier2Tier1Snapshots.set(tier2Id, normalized);
  }
  return normalized;
}

// Used when switching away from the T1 view (e.g. entering T2/symbol mode) so
// edited node unlocks and edge-flow sliders aren't lost.
export function captureAndStoreCurrentTier1Snapshot(tier2Id: string): void {
  const existing = getOrCreateTier2Snapshot(tier2Id);
  if (!existing) return;
  const captured = captureCurrentTier1Snapshot();
  const capturedById = new Map<number, any>(
    (captured.nodeState ?? []).map((entry: any) => [entry.id, entry])
  );
  const mergedNodeState = (existing.nodeState ?? []).map((entry: any) => {
    const live = capturedById.get(entry.id);
    if (!live) {
      return { ...entry };
    }
    // Keep static schema metadata (name/type/cost/bonuses), only refresh live state.
    return {
      ...entry,
      ...live,
      id: entry.id
    };
  });
  tier2Tier1Snapshots.set(tier2Id, {
    ...existing,
    nodeState: mergedNodeState,
    edgeFlows: captured.edgeFlows,
    projections: captured.projections
  });
}
