import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/**
 * Ankle — Figure-Eight (6 nodes). GDD §2.3 ANKLE.
 * S-019 — directed upper/lower rings + zero-weight reverse edges for player-enabled mini-circulation.
 */
export const ankleTopology: T1ClusterTopology = {
  id: "ankle",
  nodeCount: 6,
  directedEdges: true,
  nodes: [
    { id: 0, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 1, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 2, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 3, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 4, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 5, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] }
  ],
  edges: [
    { from: 0, to: 1, defaultWeight: 50 },
    { from: 1, to: 2, defaultWeight: 50 },
    { from: 2, to: 0, defaultWeight: 50 },
    { from: 1, to: 0, defaultWeight: 0 },
    { from: 2, to: 1, defaultWeight: 0 },
    { from: 0, to: 2, defaultWeight: 0 },
    { from: 3, to: 4, defaultWeight: 50 },
    { from: 4, to: 5, defaultWeight: 50 },
    { from: 5, to: 3, defaultWeight: 50 },
    { from: 4, to: 3, defaultWeight: 0 },
    { from: 5, to: 4, defaultWeight: 0 },
    { from: 3, to: 5, defaultWeight: 0 },
    { from: 1, to: 4, defaultWeight: 50 },
    { from: 4, to: 1, defaultWeight: 0 }
  ],
  potentialExtraEdges: [
    { from: 0, to: 4, defaultWeight: 0 },
    { from: 3, to: 1, defaultWeight: 0 },
    { from: 5, to: 0, defaultWeight: 0 }
  ],
  meridianIoMap: {
    KNEE: 0,
    FOOT: 3
  },
  baseCapacityPerNode: 100
};
