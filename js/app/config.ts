// FlowMaster: schema loading + initial game data derivation.
// Runs once at module evaluation to produce gameConfig, nodeData, edges, etc.

import { BODY_MODE_FOCUS_TIER2_ID } from './constants.ts';
import { NODE_DEFINITIONS, INITIAL_NODE_POSITIONS, NODE_EDGES, PROJECTION_LINKS } from '../../nodes.ts';
import { TIER2_NODE_SCHEMAS } from '../t2-nodes/schemas.ts';

export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function getTier2SchemaConfig(tier2Id: string) {
  const schema = TIER2_NODE_SCHEMAS[tier2Id];
  if (!schema) return null;
  return {
    nodeDefinitions: deepClone(schema.nodeDefinitions ?? []),
    initialNodePositions: deepClone(schema.initialNodePositions ?? {}),
    nodeEdges: deepClone(schema.nodeEdges ?? []),
    projectionLinks: deepClone(schema.projectionLinks ?? [])
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
  const zApi = window.z ?? window.Zod ?? null;
  if (!zApi) {
    return {
      nodeDefinitions: schemaSource.nodeDefinitions,
      initialNodePositions: schemaSource.initialNodePositions,
      nodeEdges: schemaSource.nodeEdges,
      projectionLinks: schemaSource.projectionLinks
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

  const parsed = cfgSchema.safeParse(schemaSource);
  if (!parsed.success) {
    console.warn("Config validation failed, using raw config.", parsed.error);
    return {
      nodeDefinitions: schemaSource.nodeDefinitions,
      initialNodePositions: schemaSource.initialNodePositions,
      nodeEdges: schemaSource.nodeEdges,
      projectionLinks: schemaSource.projectionLinks
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
