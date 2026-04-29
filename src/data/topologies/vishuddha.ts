import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/**
 * Vishuddha — Sixteen-Spoke Mandala (12-node reduction). GDD §2.3 VISHUDDHA.
 */
export const vishuddhaTopology: T1ClusterTopology = {
  id: "vishuddha",
  nodeCount: 14,
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
    { id: 13, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] }
  ],
  edges: [
    { from: 0, to: 1, defaultWeight: 50 },
    { from: 0, to: 2, defaultWeight: 50 },
    { from: 0, to: 3, defaultWeight: 50 },
    { from: 1, to: 4, defaultWeight: 50 },
    { from: 2, to: 5, defaultWeight: 50 },
    { from: 3, to: 6, defaultWeight: 50 },
    { from: 4, to: 5, defaultWeight: 50 },
    { from: 5, to: 6, defaultWeight: 50 },
    { from: 4, to: 7, defaultWeight: 50 },
    { from: 5, to: 7, defaultWeight: 50 },
    { from: 6, to: 7, defaultWeight: 50 },
    { from: 7, to: 8, defaultWeight: 50 },
    { from: 7, to: 9, defaultWeight: 50 },
    { from: 8, to: 10, defaultWeight: 50 },
    { from: 9, to: 11, defaultWeight: 50 },
    { from: 10, to: 12, defaultWeight: 50 },
    { from: 11, to: 12, defaultWeight: 50 },
    { from: 10, to: 13, defaultWeight: 50 },
    { from: 11, to: 13, defaultWeight: 50 }
  ],
  potentialExtraEdges: [{ from: 3, to: 5, defaultWeight: 0 }, { from: 8, to: 12, defaultWeight: 0 }],
  meridianIoMap: {
    HEART: 0,
    AJNA: 13
  },
  baseCapacityPerNode: 100,
  latentT1NodeIds: [2, 9]
};

// Atlas: ★OA_1(0)=HEART top; outer top OA_6(1) OA_L(2,latent) OA_2(3);
// inner IR_1(4) IR_2(5) IR_3(6); C(7) hub; IR_4(8) IR_5(9,latent);
// outer bottom OA_5(10) OA_R(11) OA_3(12); ★OA_4(13)=AJNA bottom.
export const qiPositions = {
  0:  { x: 300, y:  50 }, // ★OA_1  HEART I/O
  1:  { x: 170, y: 140 }, // OA_6
  2:  { x: 300, y: 140 }, // OA_L  (latent)
  3:  { x: 430, y: 140 }, // OA_2
  4:  { x: 190, y: 240 }, // IR_1
  5:  { x: 300, y: 240 }, // IR_2
  6:  { x: 410, y: 240 }, // IR_3
  7:  { x: 300, y: 330 }, // C     hub
  8:  { x: 410, y: 420 }, // IR_4
  9:  { x: 190, y: 420 }, // IR_5  (latent)
  10: { x: 170, y: 510 }, // OA_5
  11: { x: 300, y: 510 }, // OA_R
  12: { x: 430, y: 510 }, // OA_3
  13: { x: 300, y: 600 }, // ★OA_4  AJNA I/O
};
