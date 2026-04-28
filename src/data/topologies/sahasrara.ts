import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/**
 * Sahasrara — Fractal Crown. GDD §2.3 SAHASRARA.
 * OR 0–4, MR 5–8, IR 9–10, C 11 (realm cap).
 */
export const sahasraraTopology: T1ClusterTopology = {
  id: "sahasrara",
  nodeCount: 12,
  nodes: [
    { id: 0, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 1, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
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
    { from: 0, to: 1, defaultWeight: 50 },
    { from: 1, to: 2, defaultWeight: 50 },
    { from: 2, to: 3, defaultWeight: 50 },
    { from: 3, to: 4, defaultWeight: 50 },
    { from: 4, to: 0, defaultWeight: 50 },
    { from: 0, to: 5, defaultWeight: 50 },
    { from: 1, to: 5, defaultWeight: 50 },
    { from: 1, to: 6, defaultWeight: 50 },
    { from: 2, to: 6, defaultWeight: 50 },
    { from: 3, to: 7, defaultWeight: 50 },
    { from: 4, to: 7, defaultWeight: 50 },
    { from: 4, to: 8, defaultWeight: 50 },
    { from: 0, to: 8, defaultWeight: 50 },
    { from: 5, to: 6, defaultWeight: 50 },
    { from: 6, to: 7, defaultWeight: 50 },
    { from: 7, to: 8, defaultWeight: 50 },
    { from: 8, to: 5, defaultWeight: 50 },
    { from: 5, to: 9, defaultWeight: 50 },
    { from: 6, to: 9, defaultWeight: 50 },
    { from: 7, to: 10, defaultWeight: 50 },
    { from: 8, to: 10, defaultWeight: 50 },
    { from: 9, to: 10, defaultWeight: 50 },
    { from: 11, to: 9, defaultWeight: 50 },
    { from: 11, to: 10, defaultWeight: 50 }
  ],
  meridianIoMap: {
    AJNA: 0,
    BINDU: 2
  },
  baseCapacityPerNode: 100,
  latentT1NodeIds: [1, 3, 4],
  realmCapNode: 11
};
