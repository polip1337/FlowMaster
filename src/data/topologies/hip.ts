import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/** Hip — Arch-and-Chain (9 nodes). Shared L/R. GDD §2.3 HIP + lateral PEER_HIP belt. */
export const hipTopology: T1ClusterTopology = {
  id: "hip",
  nodeCount: 9,
  nodes: [
    { id: 0, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 1, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 2, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 3, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 4, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 5, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 6, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 7, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 8, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] }
  ],
  edges: [
    { from: 0, to: 1, defaultWeight: 50 },
    { from: 1, to: 2, defaultWeight: 50 },
    { from: 0, to: 3, defaultWeight: 50 },
    { from: 2, to: 4, defaultWeight: 50 },
    { from: 1, to: 3, defaultWeight: 50 },
    { from: 1, to: 4, defaultWeight: 50 },
    { from: 3, to: 5, defaultWeight: 50 },
    { from: 4, to: 7, defaultWeight: 50 },
    { from: 5, to: 6, defaultWeight: 50 },
    { from: 6, to: 7, defaultWeight: 50 },
    { from: 1, to: 8, defaultWeight: 50 }
  ],
  potentialExtraEdges: [
    { from: 0, to: 4, defaultWeight: 0 },
    { from: 2, to: 3, defaultWeight: 0 },
    { from: 4, to: 6, defaultWeight: 0 }
  ],
  meridianIoMap: {
    ROOT: 0,
    SACRAL: 2,
    KNEE: 6,
    PEER_HIP: 8
  },
  baseCapacityPerNode: 100,
  latentT1NodeIds: [1]
};
