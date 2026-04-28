import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/** Knee — Bent Reed (6 nodes). GDD §2.3 KNEE. */
export const kneeTopology: T1ClusterTopology = {
  id: "knee",
  nodeCount: 6,
  nodes: [
    { id: 0, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 1, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 2, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 3, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 4, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 5, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] }
  ],
  edges: [
    { from: 0, to: 1, defaultWeight: 50 },
    { from: 1, to: 2, defaultWeight: 50 },
    { from: 2, to: 3, defaultWeight: 50 },
    { from: 3, to: 4, defaultWeight: 50 },
    { from: 4, to: 5, defaultWeight: 50 }
  ],
  potentialExtraEdges: [
    { from: 0, to: 2, defaultWeight: 0 },
    { from: 1, to: 3, defaultWeight: 0 },
    { from: 2, to: 4, defaultWeight: 0 }
  ],
  meridianIoMap: {
    HIP: 0,
    ANKLE: 5
  },
  baseCapacityPerNode: 100
};
