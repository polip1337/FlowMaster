import { crownSchema } from './crown.nodes.ts';
import { mindSchema } from './mind.nodes.ts';
import { intentSchema } from './intent.nodes.ts';
import { qiSchema } from './qi.nodes.ts';
import { heartSchema } from './heart.nodes.ts';
import { stomachSchema } from './stomach.nodes.ts';
import { dantianSchema } from './dantian.nodes.ts';
import { spineSchema } from './spine.nodes.ts';
import { kneeLeftSchema } from './kneeLeft.nodes.ts';
import { kneeRightSchema } from './kneeRight.nodes.ts';
import { footLeftSchema } from './footLeft.nodes.ts';
import { footRightSchema } from './footRight.nodes.ts';

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
