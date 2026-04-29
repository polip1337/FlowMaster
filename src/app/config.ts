// FlowMaster: schema loading + initial game data derivation.
// Runs once at module evaluation to produce gameConfig, nodeData, edges, etc.

import { BODY_MODE_FOCUS_TIER2_ID } from './constants.ts';
import { NODE_DEFINITIONS, INITIAL_NODE_POSITIONS, NODE_EDGES, PROJECTION_LINKS } from '../../nodes.ts';
import { allTopologies } from '../data/topologies/index.ts';
import { T2_NODE_DEFS_BY_ID } from '../data/t2NodeDefs.ts';
import { toCoreTier2Id } from '../uiCore/t2UiMapping.ts';
import { edgeKey } from '../core/nodes/T1Edge.ts';

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function getTier2SchemaConfig(tier2Id: string) {
  const coreTier2Id = toCoreTier2Id(tier2Id);
  const t2Def = T2_NODE_DEFS_BY_ID.get(coreTier2Id);
  if (!t2Def) return null;

  const topology = allTopologies[t2Def.topologyId];
  if (!topology) return null;

  const topologyNodeIds = new Set(topology.nodes.map((n) => n.id));
  const nodeDefinitions = NODE_DEFINITIONS.filter((n: any) => topologyNodeIds.has(n.id));

  const nodeEdges: any[] = [];
  const addEdge = (from: number, to: number, weight: number) => {
    // JS UI uses `edge.flow` (slider) for transfer strength; topology defaultWeight is not used.
    nodeEdges.push({
      from,
      to,
      flow: 0,
      key: edgeKey(from, to),
      weight: weight ?? 0,
      isScarred: false,
      scarPenalty: 0,
      scarHealingCostShen: 50000
    });
  };

  for (const e of topology.edges) {
    if (topology.directedEdges) {
      addEdge(e.from, e.to, e.defaultWeight);
    } else {
      addEdge(e.from, e.to, e.defaultWeight);
      addEdge(e.to, e.from, e.defaultWeight);
    }
  }

  // Keep the full legacy positions set so edge rendering works even when switching topologies.
  return {
    nodeDefinitions: deepClone(nodeDefinitions),
    initialNodePositions: deepClone(INITIAL_NODE_POSITIONS),
    nodeEdges: deepClone(nodeEdges),
    projectionLinks: deepClone(PROJECTION_LINKS)
  };
}

function loadConfigWithValidation() {
  const activeSchema = getTier2SchemaConfig(BODY_MODE_FOCUS_TIER2_ID);
  const schemaSource = activeSchema ?? {
    nodeDefinitions: NODE_DEFINITIONS ?? [],
    initialNodePositions: INITIAL_NODE_POSITIONS ?? {},
    nodeEdges: NODE_EDGES ?? [],
    projectionLinks: PROJECTION_LINKS ?? []
  };

  // Important: keep the *full* legacy node set so PIXI visuals and UI lookups remain valid
  // across topology switches. We only swap the topology-specific edge graph.
  const cfg = {
    nodeDefinitions: NODE_DEFINITIONS ?? [],
    initialNodePositions: INITIAL_NODE_POSITIONS ?? {},
    nodeEdges: schemaSource.nodeEdges,
    projectionLinks: PROJECTION_LINKS ?? []
  };
  const zApi = window.z ?? window.Zod ?? null;
  if (!zApi) {
    return {
      nodeDefinitions: cfg.nodeDefinitions,
      initialNodePositions: cfg.initialNodePositions,
      nodeEdges: cfg.nodeEdges,
      projectionLinks: cfg.projectionLinks
    };
  }

  const bonusSchema = zApi.record(zApi.number()).optional();
  const nodeSchema = zApi.object({
    id: zApi.number(),
    name: zApi.string(),
    unlocked: zApi.boolean(),
    si: zApi.number(),
    unlockCost: zApi.number(),
    canProject: zApi.boolean().optional(),
    attributeType: zApi.string().optional(),
    attributeTier: zApi.number().optional(),
    bonuses: bonusSchema,
    energyQi: zApi.number().optional(),
    energyJing: zApi.number().optional(),
    energyYangQi: zApi.number().optional(),
    energyShen: zApi.number().optional(),
    refinementPoints: zApi.number().optional(),
    quality: zApi.number().optional(),
    damageState: zApi.enum(["healthy", "cracked", "shattered"]).optional(),
    repairAccumulator: zApi.number().optional()
  });
  const positionSchema = zApi.object({ x: zApi.number(), y: zApi.number() });
  const edgeSchema = zApi.object({
    from: zApi.number(),
    to: zApi.number(),
    flow: zApi.number(),
    key: zApi.string().optional(),
    isScarred: zApi.boolean().optional(),
    scarPenalty: zApi.number().optional(),
    scarHealingCostShen: zApi.number().optional()
  });
  const projectionSchema = zApi.object({ from: zApi.number(), to: zApi.number() });
  const cfgSchema = zApi.object({
    nodeDefinitions: zApi.array(nodeSchema),
    initialNodePositions: zApi.record(positionSchema),
    nodeEdges: zApi.array(edgeSchema),
    projectionLinks: zApi.array(projectionSchema)
  });

  const parsed = cfgSchema.safeParse(cfg);
  if (!parsed.success) {
    console.warn("Config validation failed, using raw config.", parsed.error);
    return {
      nodeDefinitions: cfg.nodeDefinitions,
      initialNodePositions: cfg.initialNodePositions,
      nodeEdges: cfg.nodeEdges,
      projectionLinks: cfg.projectionLinks
    };
  }
  return parsed.data;
}

export const gameConfig = loadConfigWithValidation();
export const initialNodeState: any[] = gameConfig.nodeDefinitions.map((node: any) => ({ ...node }));
export const nodeData: any[] = initialNodeState.map((node: any) => ({ ...node }));

export const initialEdges: any[] = gameConfig.nodeEdges.map((edge: any, index: number) => ({
  ...edge,
  key: edge.key ?? `${edge.from}_${edge.to}_${index}`
}));
export const edges: any[] = initialEdges.map((edge) => ({ ...edge }));
export const projectionLinks: any[] = gameConfig.projectionLinks ?? [];

export const nodePositions: Record<number, { x: number; y: number }> = Object.fromEntries(
  Object.entries(gameConfig.initialNodePositions).map(([key, pos]) => [
    Number(key),
    { ...(pos as any) }
  ])
);

export function ensureClusterTier1UiFields(node: any): void {
  if (node.energyQi == null) node.energyQi = 0;
  if (node.energyJing == null) node.energyJing = 0;
  if (node.energyYangQi == null) node.energyYangQi = 0;
  if (node.energyShen == null) node.energyShen = 0;
  if (node.refinementPoints == null) node.refinementPoints = 0;
  if (node.quality == null) node.quality = 1;
  if (node.damageState == null) node.damageState = "healthy";
  if (node.repairAccumulator == null) node.repairAccumulator = 0;
}

export function ensureMeridianUiFields(edge: any): void {
  if (edge.isScarred == null) edge.isScarred = false;
  if (edge.scarPenalty == null) edge.scarPenalty = 0;
  if (edge.scarHealingCostShen == null) edge.scarHealingCostShen = 50000;
}

for (const n of initialNodeState) ensureClusterTier1UiFields(n);
for (const n of nodeData) ensureClusterTier1UiFields(n);
for (const e of initialEdges) ensureMeridianUiFields(e);
for (const e of edges) ensureMeridianUiFields(e);
