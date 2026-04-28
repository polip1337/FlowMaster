import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/**
 * Muladhara — Square Seal. GDD §2.3 MULADHARA.
 * P_N source; P_S latent.
 */
export const muladharaTopology: T1ClusterTopology = {
  id: "muladhara",
  nodeCount: 12,
  nodes: [
    { id: 0, type: n.IO_BIDIR, isSourceNode: true, unlockAfter: [] },
    { id: 1, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 2, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 3, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
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
    { from: 0, to: 4, defaultWeight: 50 },
    { from: 0, to: 5, defaultWeight: 50 },
    { from: 1, to: 4, defaultWeight: 50 },
    { from: 1, to: 6, defaultWeight: 50 },
    { from: 2, to: 5, defaultWeight: 50 },
    { from: 2, to: 7, defaultWeight: 50 },
    { from: 3, to: 6, defaultWeight: 50 },
    { from: 3, to: 7, defaultWeight: 50 },
    { from: 4, to: 8, defaultWeight: 50 },
    { from: 5, to: 9, defaultWeight: 50 },
    { from: 8, to: 9, defaultWeight: 50 },
    { from: 8, to: 10, defaultWeight: 50 },
    { from: 9, to: 10, defaultWeight: 50 },
    { from: 8, to: 11, defaultWeight: 50 },
    { from: 9, to: 11, defaultWeight: 50 },
    { from: 10, to: 11, defaultWeight: 50 },
    { from: 6, to: 10, defaultWeight: 50 },
    { from: 7, to: 10, defaultWeight: 50 }
  ],
  potentialExtraEdges: [
    { from: 4, to: 6, defaultWeight: 0 },
    { from: 5, to: 7, defaultWeight: 0 },
    { from: 6, to: 8, defaultWeight: 0 }
  ],
  meridianIoMap: {
    SACRAL: 0,
    L_HIP: 1,
    R_HIP: 2
  },
  baseCapacityPerNode: 100,
  specialNodes: [{ id: 11, resonanceMultiplier: 2 }],
  latentT1NodeIds: [3]
};
