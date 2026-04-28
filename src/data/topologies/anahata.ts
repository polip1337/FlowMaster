import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/**
 * Anahata — Star of Two Triangles. GDD §2.3 ANAHATA.
 * Star 0–5, inner hex 6–11 (HX_1..HX_6).
 */
export const anahataTopology: T1ClusterTopology = {
  id: "anahata",
  nodeCount: 12,
  nodes: [
    { id: 0, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 1, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 2, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 3, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 4, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 5, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 6, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 7, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 8, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 9, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 10, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 11, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] }
  ],
  edges: [
    { from: 0, to: 7, defaultWeight: 50 },
    { from: 0, to: 11, defaultWeight: 50 },
    { from: 2, to: 9, defaultWeight: 50 },
    { from: 2, to: 7, defaultWeight: 50 },
    { from: 4, to: 11, defaultWeight: 50 },
    { from: 4, to: 9, defaultWeight: 50 },
    { from: 1, to: 6, defaultWeight: 50 },
    { from: 1, to: 8, defaultWeight: 50 },
    { from: 3, to: 8, defaultWeight: 50 },
    { from: 3, to: 10, defaultWeight: 50 },
    { from: 5, to: 10, defaultWeight: 50 },
    { from: 5, to: 6, defaultWeight: 50 },
    { from: 6, to: 7, defaultWeight: 50 },
    { from: 7, to: 8, defaultWeight: 50 },
    { from: 8, to: 9, defaultWeight: 50 },
    { from: 9, to: 10, defaultWeight: 50 },
    { from: 10, to: 11, defaultWeight: 50 },
    { from: 11, to: 6, defaultWeight: 50 }
  ],
  potentialExtraEdges: [
    { from: 6, to: 8, defaultWeight: 0 },
    { from: 7, to: 9, defaultWeight: 0 },
    { from: 8, to: 10, defaultWeight: 0 }
  ],
  meridianIoMap: {
    THROAT: 0,
    R_SHOULDER: 1,
    SOLAR: 3,
    L_SHOULDER: 5
  },
  baseCapacityPerNode: 100,
  latentT1NodeIds: [2, 4]
};
