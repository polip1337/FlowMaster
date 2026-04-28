import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/**
 * Ajna — Yin-Yang Dyad. Task-033 + GDD.
 * YN 0–4, YG 5–9, J_BOT 10 (throat), J_TOP 11 (sahasrara).
 */
export const ajnaTopology: T1ClusterTopology = {
  id: "ajna",
  nodeCount: 12,
  nodes: [
    { id: 0, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 1, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 2, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 3, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 4, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 5, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 6, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 7, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 8, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 9, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 10, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 11, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] }
  ],
  edges: [
    { from: 11, to: 0, defaultWeight: 50 },
    { from: 0, to: 1, defaultWeight: 50 },
    { from: 1, to: 2, defaultWeight: 50 },
    { from: 2, to: 3, defaultWeight: 50 },
    { from: 3, to: 4, defaultWeight: 50 },
    { from: 4, to: 10, defaultWeight: 50 },
    { from: 11, to: 5, defaultWeight: 50 },
    { from: 5, to: 6, defaultWeight: 50 },
    { from: 6, to: 7, defaultWeight: 50 },
    { from: 7, to: 8, defaultWeight: 50 },
    { from: 8, to: 9, defaultWeight: 50 },
    { from: 9, to: 10, defaultWeight: 50 },
    { from: 1, to: 8, defaultWeight: 50 },
    { from: 3, to: 6, defaultWeight: 50 }
  ],
  potentialExtraEdges: [
    { from: 2, to: 7, defaultWeight: 0 },
    { from: 0, to: 5, defaultWeight: 0 },
    { from: 4, to: 9, defaultWeight: 0 }
  ],
  meridianIoMap: {
    THROAT: 10,
    SAHASRARA: 11
  },
  baseCapacityPerNode: 100,
  latentT1NodeIds: [4, 9],
  nodeAffinity: {
    0: "Shen",
    1: "Shen",
    2: "Shen",
    3: "Shen",
    4: "Shen",
    5: "YangQi",
    6: "YangQi",
    7: "YangQi",
    8: "YangQi",
    9: "YangQi"
  }
};
