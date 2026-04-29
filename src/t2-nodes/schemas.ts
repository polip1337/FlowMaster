import { crownSchema } from './crown.nodes.ts';
import { crownTopology } from './crown.nodes.ts';
import { mindSchema } from './mind.nodes.ts';
import { mindTopology } from './mind.nodes.ts';
import { intentSchema } from './intent.nodes.ts';
import { intentTopology } from './intent.nodes.ts';
import { qiSchema } from './qi.nodes.ts';
import { qiTopology } from './qi.nodes.ts';
import { heartSchema } from './heart.nodes.ts';
import { heartTopology } from './heart.nodes.ts';
import { stomachSchema } from './stomach.nodes.ts';
import { stomachTopology } from './stomach.nodes.ts';
import { dantianSchema } from './dantian.nodes.ts';
import { dantianTopology } from './dantian.nodes.ts';
import { spineSchema } from './spine.nodes.ts';
import { spineTopology } from './spine.nodes.ts';
import { kneeLeftSchema } from './kneeLeft.nodes.ts';
import { kneeLeftTopology } from './kneeLeft.nodes.ts';
import { kneeRightSchema } from './kneeRight.nodes.ts';
import { kneeRightTopology } from './kneeRight.nodes.ts';
import { footLeftSchema } from './footLeft.nodes.ts';
import { footLeftTopology } from './footLeft.nodes.ts';
import { footRightSchema } from './footRight.nodes.ts';
import { footRightTopology } from './footRight.nodes.ts';

export const TIER2_NODE_SCHEMAS: Record<string, {
  nodeDefinitions: any[];
  initialNodePositions: Record<string, any>;
  nodeEdges: any[];
  projectionLinks: any[];
}> = {
  crown: crownSchema,
  mind: mindSchema,
  intent: intentSchema,
  qi: qiSchema,
  heart: heartSchema,
  stomach: stomachSchema,
  dantian: dantianSchema,
  spine: spineSchema,
  kneeLeft: kneeLeftSchema,
  kneeRight: kneeRightSchema,
  footLeft: footLeftSchema,
  footRight: footRightSchema
};

export const TIER2_NODE_TOPOLOGIES: Record<string, any> = {
  crown: crownTopology,
  mind: mindTopology,
  intent: intentTopology,
  qi: qiTopology,
  heart: heartTopology,
  stomach: stomachTopology,
  dantian: dantianTopology,
  spine: spineTopology,
  kneeLeft: kneeLeftTopology,
  kneeRight: kneeRightTopology,
  footLeft: footLeftTopology,
  footRight: footRightTopology
};
