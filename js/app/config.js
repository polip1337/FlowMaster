// FlowMaster: schema loading + initial game data derivation.
// Runs once at script evaluation to produce gameConfig, nodeData, edges, etc.

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getTier2SchemaConfig(tier2Id) {
  const allSchemas = window.TIER2_NODE_SCHEMAS ?? {};
  const schema = allSchemas[tier2Id];
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
    nodeDefinitions: window.NODE_DEFINITIONS ?? [],
    initialNodePositions: window.INITIAL_NODE_POSITIONS ?? {},
    nodeEdges: window.NODE_EDGES ?? [],
    projectionLinks: window.PROJECTION_LINKS ?? []
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
    bonuses: bonusSchema
  });
  const positionSchema = zApi.object({ x: zApi.number(), y: zApi.number() });
  const edgeSchema = zApi.object({
    from: zApi.number(),
    to: zApi.number(),
    flow: zApi.number(),
    key: zApi.string().optional()
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

const gameConfig = loadConfigWithValidation();
const initialNodeState = gameConfig.nodeDefinitions.map((node) => ({ ...node }));
const nodeData = initialNodeState.map((node) => ({ ...node }));

const initialEdges = gameConfig.nodeEdges.map((edge, index) => ({
  ...edge,
  key: edge.key ?? `${edge.from}_${edge.to}_${index}`
}));
const edges = initialEdges.map((edge) => ({ ...edge }));
const projectionLinks = gameConfig.projectionLinks ?? [];

const nodePositions = Object.fromEntries(
  Object.entries(gameConfig.initialNodePositions).map(([key, pos]) => [
    Number(key),
    { ...pos }
  ])
);
