import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/**
 * Sahasrara — Fractal Crown. GDD §2.3 SAHASRARA.
 * OR 0–4, MR 5–8, IR 9–10, C 11 (realm cap).
 */
export const sahasraraTopology: T1ClusterTopology = {
  id: "sahasrara",
  nodeCount: 16,
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
    { id: 14, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 15, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] }
  ],
  edges: [
    { from: 0, to: 1, defaultWeight: 50 },
    { from: 0, to: 2, defaultWeight: 50 },
    { from: 1, to: 2, defaultWeight: 50 },
    { from: 1, to: 5, defaultWeight: 50 },
    { from: 2, to: 3, defaultWeight: 50 },
    { from: 3, to: 6, defaultWeight: 50 },
    { from: 4, to: 5, defaultWeight: 50 },
    { from: 4, to: 9, defaultWeight: 50 },
    { from: 5, to: 6, defaultWeight: 50 },
    { from: 5, to: 7, defaultWeight: 50 },
    { from: 6, to: 8, defaultWeight: 50 },
    { from: 7, to: 8, defaultWeight: 50 },
    { from: 7, to: 10, defaultWeight: 50 },
    { from: 8, to: 11, defaultWeight: 50 },
    { from: 9, to: 10, defaultWeight: 50 },
    { from: 10, to: 11, defaultWeight: 50 },
    { from: 11, to: 12, defaultWeight: 50 },
    { from: 12, to: 13, defaultWeight: 50 },
    { from: 13, to: 14, defaultWeight: 50 },
    { from: 14, to: 15, defaultWeight: 50 },
    { from: 13, to: 15, defaultWeight: 50 }
  ],
  potentialExtraEdges: [{ from: 6, to: 10, defaultWeight: 0 }, { from: 9, to: 11, defaultWeight: 0 }],
  meridianIoMap: {
    AJNA: 0,
    BINDU: 15
  },
  baseCapacityPerNode: 100,
  latentT1NodeIds: [4, 12],
  realmCapNode: 14
};

// Atlas: ★OR_1(0)=AJNA top; outer ring 1-6; mid ring 7-11; inner 12-13; [C](14); BINDU(15) bottom.
// OR_5(4) and IR_A(12) are latent. realmCapNode=14.
export const mindPositions = {
  0:  { x: 300, y:  50 }, // ★OR_1  AJNA (top)
  1:  { x: 190, y: 120 }, // OR_2
  2:  { x: 300, y: 120 }, // OR_3★
  3:  { x: 410, y: 120 }, // OR_4
  4:  { x: 130, y: 200 }, // OR_5  (latent)
  5:  { x: 190, y: 200 }, // OR_6
  6:  { x: 300, y: 200 }, // OR_C
  7:  { x: 190, y: 285 }, // MR_1
  8:  { x: 300, y: 285 }, // MR_2
  9:  { x: 410, y: 200 }, // MR_3  (latent)
  10: { x: 300, y: 360 }, // MR_C
  11: { x: 410, y: 285 }, // MR_5
  12: { x: 230, y: 430 }, // IR_A  (latent)
  13: { x: 370, y: 430 }, // IR_B
  14: { x: 300, y: 490 }, // [C]   realmCap
  15: { x: 300, y: 560 }, // ★BINDU (bottom I/O)
};
