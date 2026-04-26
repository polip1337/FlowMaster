// FlowMaster: tier-2 snapshots. Each T2 node keeps its own T1-graph state
// (node SI, edge flows, active projections). Saved on leaving a T2 and
// restored when re-entering it.

function captureCurrentTier1Snapshot() {
  const nodeState = nodeData.map((node) => ({
    id: node.id,
    unlocked: node.unlocked,
    si: node.si
  }));
  const edgeFlows = Object.fromEntries(edges.map((edge) => [edge.key, edge.flow]));
  const projections = activeProjections.map((projection) => ({ ...projection }));
  return { nodeState, edgeFlows, projections };
}

function applyTier1Snapshot(snapshot) {
  if (!snapshot) return;
  const nodeStateById = new Map(snapshot.nodeState.map((entry) => [entry.id, entry]));
  for (const node of nodeData) {
    const entry = nodeStateById.get(node.id);
    if (!entry) {
      node.unlocked = false;
      node.si = 0;
      continue;
    }
    node.unlocked = entry.unlocked;
    node.si = entry.si;
  }
  for (const edge of edges) {
    edge.flow = 0;
  }
  for (const entry of snapshot.nodeState) {
    const node = nodeById(entry.id);
    if (!node) continue;
    node.unlocked = entry.unlocked;
    node.si = entry.si;
  }
  for (const edge of edges) {
    if (Object.prototype.hasOwnProperty.call(snapshot.edgeFlows, edge.key)) {
      edge.flow = snapshot.edgeFlows[edge.key];
    }
  }
  activeProjections.length = 0;
  for (const projection of snapshot.projections) {
    activeProjections.push({ ...projection });
  }
}

function initializeTier2Snapshots() {
  tier2Tier1Snapshots.clear();
  for (const tier2 of TIER2_NODES) {
    const schemaConfig = getTier2SchemaConfig(tier2.id) ?? gameConfig;
    const schemaNodes = schemaConfig.nodeDefinitions ?? [];
    const schemaEdges = (schemaConfig.nodeEdges ?? []).map((edge, index) => ({
      ...edge,
      key: edge.key ?? `${edge.from}_${edge.to}_${index}`
    }));
    tier2Tier1Snapshots.set(tier2.id, {
      nodeState: schemaNodes.map((node) => ({
        id: node.id,
        unlocked: node.unlocked,
        si: node.si
      })),
      edgeFlows: Object.fromEntries(schemaEdges.map((edge) => [edge.key, edge.flow])),
      projections: []
    });
  }
}

function buildSnapshotFromTier2Schema(tier2Id) {
  const schemaConfig = getTier2SchemaConfig(tier2Id) ?? gameConfig;
  const schemaNodes = schemaConfig.nodeDefinitions ?? [];
  const schemaEdges = (schemaConfig.nodeEdges ?? []).map((edge, index) => ({
    ...edge,
    key: edge.key ?? `${edge.from}_${edge.to}_${index}`
  }));
  return {
    nodeState: schemaNodes.map((node) => ({
      id: node.id,
      unlocked: node.unlocked,
      si: node.si
    })),
    edgeFlows: Object.fromEntries(schemaEdges.map((edge) => [edge.key, edge.flow])),
    projections: []
  };
}

function getOrCreateTier2Snapshot(tier2Id) {
  if (!tier2Tier1Snapshots.has(tier2Id)) {
    tier2Tier1Snapshots.set(tier2Id, buildSnapshotFromTier2Schema(tier2Id));
  }
  return tier2Tier1Snapshots.get(tier2Id);
}
