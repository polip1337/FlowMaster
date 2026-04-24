window.TIER2_NODE_SCHEMAS = window.TIER2_NODE_SCHEMAS || {};
window.TIER2_NODE_SCHEMAS["kneeLeft"] = {
  nodeDefinitions: JSON.parse(JSON.stringify(window.NODE_DEFINITIONS ?? [])),
  initialNodePositions: JSON.parse(JSON.stringify(window.INITIAL_NODE_POSITIONS ?? {})),
  nodeEdges: JSON.parse(JSON.stringify(window.NODE_EDGES ?? [])),
  projectionLinks: JSON.parse(JSON.stringify(window.PROJECTION_LINKS ?? []))
};
