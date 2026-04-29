import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/**
 * Ajna — Yin-Yang Dyad. Task-033 + GDD.
 * YN 0–4, YG 5–9, J_BOT 10 (throat), J_TOP 11 (sahasrara).
 */
export const ajnaTopology: T1ClusterTopology = {
  id: "ajna",
  nodeCount: 15,
  nodes: [
    { id: 0, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 1, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 2, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 3, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 4, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 5, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 6, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 7, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 8, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 9, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 10, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 11, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 12, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 13, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 14, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] }
  ],
  edges: [
    { from: 0, to: 1, defaultWeight: 50 },
    { from: 0, to: 5, defaultWeight: 50 },
    { from: 1, to: 2, defaultWeight: 50 },
    { from: 2, to: 3, defaultWeight: 50 },
    { from: 3, to: 6, defaultWeight: 50 },
    { from: 3, to: 8, defaultWeight: 50 },
    { from: 4, to: 7, defaultWeight: 50 },
    { from: 4, to: 9, defaultWeight: 50 },
    { from: 5, to: 6, defaultWeight: 50 },
    { from: 6, to: 7, defaultWeight: 50 },
    { from: 7, to: 8, defaultWeight: 50 },
    { from: 8, to: 9, defaultWeight: 50 },
    { from: 9, to: 10, defaultWeight: 50 },
    { from: 10, to: 11, defaultWeight: 50 },
    { from: 11, to: 12, defaultWeight: 50 },
    { from: 12, to: 13, defaultWeight: 50 },
    { from: 13, to: 14, defaultWeight: 50 },
    { from: 14, to: 10, defaultWeight: 50 }
  ],
  potentialExtraEdges: [{ from: 2, to: 8, defaultWeight: 0 }, { from: 6, to: 9, defaultWeight: 0 }],
  meridianIoMap: {
    THROAT: 14,
    SAHASRARA: 0
  },
  baseCapacityPerNode: 100,
  latentT1NodeIds: [2, 12],
  nodeAffinity: {
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

// Atlas: ★J_TOP(0)=SAHASRARA top; ★J_BOT(14)=THROAT bottom.
// Left col YN: YN_1(1) YN_2(2,latent) YN_3(3) YN_4(4) YN_5(implicit via chain).
// Right col YG: YG_1(5) then cross-chain 6-7-8-9=YX/YG nodes.
// Bottom loop: 10-11-12(latent)-13-14 with back-edge 14→10.
export const intentPositions = {
  0:  { x: 300, y:  50 }, // ★J_TOP  SAHASRARA
  1:  { x: 180, y: 130 }, // YN_1
  2:  { x: 180, y: 210 }, // YN_2  (latent)
  3:  { x: 180, y: 290 }, // YN_3
  4:  { x: 180, y: 370 }, // YN_4
  5:  { x: 420, y: 130 }, // YG_1
  6:  { x: 300, y: 210 }, // YX_1 / cross-node
  7:  { x: 300, y: 290 }, // YX_2 / cross-node
  8:  { x: 300, y: 370 }, // YX_3 / cross-node
  9:  { x: 420, y: 370 }, // YG_2
  10: { x: 420, y: 450 }, // lower-right junction
  11: { x: 340, y: 490 }, // lower mid
  12: { x: 260, y: 490 }, // latent lower
  13: { x: 180, y: 450 }, // YN_5 side
  14: { x: 300, y: 560 }, // ★J_BOT  THROAT
};
