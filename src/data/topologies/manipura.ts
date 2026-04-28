import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/**
 * Manipura — Ten-Spoke Wheel. GDD §2.3 MANIPURA.
 * OT_N (HEART), OT_S (SACRAL) I/O; center C is yang Qi conversion furnace.
 */
export const manipuraTopology: T1ClusterTopology = {
  id: "manipura",
  nodeCount: 12,
  nodes: [
    { id: 0, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 1, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 2, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 3, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 4, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 5, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 6, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 7, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 8, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 9, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 10, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 11, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] }
  ],
  edges: [
    { from: 0, to: 1, defaultWeight: 50 },
    { from: 1, to: 2, defaultWeight: 50 },
    { from: 2, to: 3, defaultWeight: 50 },
    { from: 3, to: 4, defaultWeight: 50 },
    { from: 4, to: 5, defaultWeight: 50 },
    { from: 5, to: 0, defaultWeight: 50 },
    { from: 6, to: 7, defaultWeight: 50 },
    { from: 7, to: 8, defaultWeight: 50 },
    { from: 8, to: 9, defaultWeight: 50 },
    { from: 9, to: 10, defaultWeight: 50 },
    { from: 10, to: 6, defaultWeight: 50 },
    { from: 0, to: 6, defaultWeight: 50 },
    { from: 1, to: 6, defaultWeight: 50 },
    { from: 1, to: 7, defaultWeight: 50 },
    { from: 2, to: 7, defaultWeight: 50 },
    { from: 2, to: 8, defaultWeight: 50 },
    { from: 3, to: 8, defaultWeight: 50 },
    { from: 3, to: 9, defaultWeight: 50 },
    { from: 4, to: 9, defaultWeight: 50 },
    { from: 4, to: 10, defaultWeight: 50 },
    { from: 5, to: 10, defaultWeight: 50 },
    { from: 5, to: 6, defaultWeight: 50 },
    { from: 11, to: 6, defaultWeight: 50 },
    { from: 11, to: 7, defaultWeight: 50 },
    { from: 11, to: 8, defaultWeight: 50 },
    { from: 11, to: 9, defaultWeight: 50 },
    { from: 11, to: 10, defaultWeight: 50 }
  ],
  potentialExtraEdges: [
    { from: 0, to: 2, defaultWeight: 0 },
    { from: 3, to: 5, defaultWeight: 0 },
    { from: 2, to: 9, defaultWeight: 0 }
  ],
  meridianIoMap: {
    HEART: 0,
    SACRAL: 3
  },
  baseCapacityPerNode: 100,
  latentT1NodeIds: [1, 5],
  yangQiConversionNode: 11
};
