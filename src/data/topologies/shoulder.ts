import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/** Shoulder — Ladder (8 nodes). Shared L/R. GDD §2.3 SHOULDER. */
export const shoulderTopology: T1ClusterTopology = {
  id: "shoulder",
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
    { from: 1, to: 2, defaultWeight: 50 },
    { from: 2, to: 3, defaultWeight: 50 },
    { from: 3, to: 4, defaultWeight: 50 },
    { from: 5, to: 6, defaultWeight: 50 },
    { from: 6, to: 7, defaultWeight: 50 },
    { from: 7, to: 8, defaultWeight: 50 },
    { from: 8, to: 9, defaultWeight: 50 },
    { from: 10, to: 11, defaultWeight: 50 },
    { from: 11, to: 12, defaultWeight: 50 },
    { from: 12, to: 13, defaultWeight: 50 },
    { from: 13, to: 14, defaultWeight: 50 },
    { from: 0, to: 5, defaultWeight: 50 },
    { from: 1, to: 6, defaultWeight: 50 },
    { from: 2, to: 7, defaultWeight: 50 },
    { from: 3, to: 8, defaultWeight: 50 },
    { from: 4, to: 9, defaultWeight: 50 },
    { from: 5, to: 10, defaultWeight: 50 },
    { from: 6, to: 11, defaultWeight: 50 },
    { from: 7, to: 12, defaultWeight: 50 },
    { from: 8, to: 13, defaultWeight: 50 },
    { from: 9, to: 14, defaultWeight: 50 }
  ],
  potentialExtraEdges: [{ from: 2, to: 8, defaultWeight: 0 }, { from: 6, to: 12, defaultWeight: 0 }],
  meridianIoMap: {
    HEART: 0,
    ELBOW: 14
  },
  baseCapacityPerNode: 100,
  latentT1NodeIds: [4, 10]
};

// Atlas: ★TR_1(0)=HEART top-left; ★BR_5(14)=ELBOW bottom-right.
// Three rows of five, connected as a ladder. Latent: TR_5(4) and BR_1(10).
export const shoulderPositions = {
  0:  { x:  80, y: 100 }, // ★TR_1  HEART I/O
  1:  { x: 200, y: 100 }, // TR_2
  2:  { x: 320, y: 100 }, // TR_3
  3:  { x: 440, y: 100 }, // TR_4
  4:  { x: 560, y: 100 }, // TR_5  (latent)
  5:  { x:  80, y: 220 }, // MR_1
  6:  { x: 200, y: 220 }, // MR_2
  7:  { x: 320, y: 220 }, // MR_3
  8:  { x: 440, y: 220 }, // MR_4
  9:  { x: 560, y: 220 }, // MR_5
  10: { x:  80, y: 340 }, // BR_1  (latent)
  11: { x: 200, y: 340 }, // BR_2
  12: { x: 320, y: 340 }, // BR_3
  13: { x: 440, y: 340 }, // BR_4
  14: { x: 560, y: 340 }, // ★BR_5  ELBOW I/O
};
