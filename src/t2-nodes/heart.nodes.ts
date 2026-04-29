import { NODE_DEFINITIONS, INITIAL_NODE_POSITIONS, NODE_EDGES, PROJECTION_LINKS } from '../../nodes.ts';

export const heartSchema = {
  nodeDefinitions: JSON.parse(JSON.stringify(NODE_DEFINITIONS)),
  initialNodePositions: JSON.parse(JSON.stringify(INITIAL_NODE_POSITIONS)),
  nodeEdges: JSON.parse(JSON.stringify(NODE_EDGES)),
  projectionLinks: JSON.parse(JSON.stringify(PROJECTION_LINKS))
};
