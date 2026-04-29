// FlowMaster: schema loading + initial game data derivation.
// Runs once at module evaluation to produce gameConfig, nodeData, edges, etc.

import { BODY_MODE_FOCUS_TIER2_ID } from './constants.ts';
import { allTopologies, topologyPositionsByUiId } from '../data/topologies/index.ts';
import { buildTopologyNodeDefinitions } from '../data/topologies/ui-definitions.ts';
import { T2_NODE_DEFS_BY_ID } from '../data/t2NodeDefs.ts';
import { toCoreTier2Id } from '../uiCore/t2UiMapping.ts';
import { edgeKey } from '../core/nodes/T1Edge.ts';

const T1_POSITION_DISTANCE_MULTIPLIER = 3;

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function ensureRequiredManipuraEdges(nodeEdges: any[]) {
  const requiredPairs: Array<[number, number]> = [
    [0, 1], // Dantian <-> Solar Crucible
    [0, 2], // Dantian <-> Golden Cauldron
    [0, 3]  // Dantian <-> Ember Meridian
  ];
  for (const [from, to] of requiredPairs) {
    const hasForward = nodeEdges.some((edge) => edge.from === from && edge.to === to);
    if (!hasForward) {
      nodeEdges.push({
        from,
        to,
        flow: 0,
        key: edgeKey(from, to),
        weight: 50,
        isScarred: false,
        scarPenalty: 0,
        scarHealingCostShen: 50000
      });
    }
    const hasReverse = nodeEdges.some((edge) => edge.from === to && edge.to === from);
    if (!hasReverse) {
      nodeEdges.push({
        from: to,
        to: from,
        flow: 0,
        key: edgeKey(to, from),
        weight: 50,
        isScarred: false,
        scarPenalty: 0,
        scarHealingCostShen: 50000
      });
    }
  }
}

function scaleNodePositions(
  positions: Record<number, { x: number; y: number }>,
  multiplier: number
): Record<number, { x: number; y: number }> {
  const entries = Object.entries(positions);
  if (entries.length === 0 || multiplier === 1) {
    return deepClone(positions);
  }

  let sumX = 0;
  let sumY = 0;
  for (const [, pos] of entries) {
    sumX += pos.x;
    sumY += pos.y;
  }
  const pivotX = sumX / entries.length;
  const pivotY = sumY / entries.length;

  const scaled: Record<number, { x: number; y: number }> = {};
  for (const [id, pos] of entries) {
    scaled[Number(id)] = {
      x: pivotX + (pos.x - pivotX) * multiplier,
      y: pivotY + (pos.y - pivotY) * multiplier
    };
  }
  return scaled;
}

export function getTier2SchemaConfig(tier2Id: string) {
  const coreTier2Id = toCoreTier2Id(tier2Id);
  const t2Def = T2_NODE_DEFS_BY_ID.get(coreTier2Id);
  if (!t2Def) return null;

  const topology = allTopologies[t2Def.topologyId];
  if (!topology) return null;

  const nodeDefinitions = buildTopologyNodeDefinitions(topology);

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
  if (tier2Id === "stomach" || topology.id === "manipura") {
    ensureRequiredManipuraEdges(nodeEdges);
  }

  return {
    nodeDefinitions: deepClone(nodeDefinitions),
    initialNodePositions: scaleNodePositions(
      topologyPositionsByUiId[tier2Id] ?? {},
      T1_POSITION_DISTANCE_MULTIPLIER
    ),
    nodeEdges: deepClone(nodeEdges),
    projectionLinks: deepClone(topology.projectionLinks ?? [])
  };
}

function loadConfigWithValidation() {
  const activeSchema = getTier2SchemaConfig(BODY_MODE_FOCUS_TIER2_ID);
  const schemaSource = activeSchema ?? {
    nodeDefinitions: [],
    initialNodePositions: {},
    nodeEdges: [],
    projectionLinks: []
  };

  const cfg = {
    nodeDefinitions: schemaSource.nodeDefinitions,
    initialNodePositions: schemaSource.initialNodePositions,
    nodeEdges: schemaSource.nodeEdges,
    projectionLinks: schemaSource.projectionLinks
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
    nodeType: zApi.string().optional(),
    isSourceNode: zApi.boolean().optional(),
    nodeShape: zApi.enum(["circle", "diamond", "square", "star"]).optional(),
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
