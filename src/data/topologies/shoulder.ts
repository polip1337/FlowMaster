import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/** Shoulder — Ladder (8 nodes). Shared L/R. GDD §2.3 SHOULDER. */
export const shoulderTopology: T1ClusterTopology = {
  id: "shoulder",
  nodeCount: 8,
  nodes: [
    { id: 0, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 1, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 2, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 3, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 4, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 5, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 6, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 7, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] }
  ],
  edges: [
    { from: 0, to: 1, defaultWeight: 50 },
    { from: 1, to: 2, defaultWeight: 50 },
    { from: 2, to: 3, defaultWeight: 50 },
    { from: 4, to: 5, defaultWeight: 50 },
    { from: 5, to: 6, defaultWeight: 50 },
    { from: 6, to: 7, defaultWeight: 50 },
    { from: 0, to: 4, defaultWeight: 50 },
    { from: 1, to: 5, defaultWeight: 50 },
    { from: 2, to: 6, defaultWeight: 50 },
    { from: 3, to: 7, defaultWeight: 50 }
  ],
  potentialExtraEdges: [
    { from: 0, to: 2, defaultWeight: 0 },
    { from: 1, to: 6, defaultWeight: 0 },
    { from: 2, to: 7, defaultWeight: 0 }
  ],
  meridianIoMap: {
    HEART: 0,
    ELBOW: 7
  },
  baseCapacityPerNode: 100,
  latentT1NodeIds: [3, 4]
};
