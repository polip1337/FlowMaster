import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/**
 * Muladhara — Square Seal. GDD §2.3 MULADHARA.
 * P_N source; P_S latent.
 */
export const muladharaTopology: T1ClusterTopology = {
  id: "muladhara",
  nodeCount: 17,
  nodes: [
    { id: 0, type: n.IO_BIDIR, isSourceNode: true, unlockAfter: [] },
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
    { id: 14, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 15, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 16, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] }
  ],
  edges: [
    { from: 0, to: 1, defaultWeight: 50 },
    { from: 1, to: 3, defaultWeight: 50 },
    { from: 2, to: 5, defaultWeight: 50 },
    { from: 3, to: 4, defaultWeight: 50 },
    { from: 4, to: 5, defaultWeight: 50 },
    { from: 3, to: 11, defaultWeight: 50 },
    { from: 4, to: 6, defaultWeight: 50 },
    { from: 5, to: 12, defaultWeight: 50 },
    { from: 6, to: 8, defaultWeight: 50 },
    { from: 7, to: 8, defaultWeight: 50 },
    { from: 7, to: 9, defaultWeight: 50 },
    { from: 8, to: 9, defaultWeight: 50 },
    { from: 9, to: 10, defaultWeight: 50 },
    { from: 10, to: 12, defaultWeight: 50 },
    { from: 11, to: 13, defaultWeight: 50 },
    { from: 12, to: 13, defaultWeight: 50 },
    { from: 11, to: 14, defaultWeight: 50 },
    { from: 12, to: 15, defaultWeight: 50 },
    { from: 14, to: 16, defaultWeight: 50 },
    { from: 15, to: 16, defaultWeight: 50 },
    { from: 16, to: 13, defaultWeight: 50 }
  ],
  potentialExtraEdges: [{ from: 6, to: 11, defaultWeight: 0 }, { from: 8, to: 12, defaultWeight: 0 }],
  meridianIoMap: {
    SACRAL: 16,
    L_HIP: 14,
    R_HIP: 15
  },
  baseCapacityPerNode: 100,
  specialNodes: [{ id: 7, resonanceMultiplier: 2 }],
  latentT1NodeIds: [2]
};

// Atlas: ★P_N(0) top-centre; P_NL(2) latent flanks; Sq_NW/NT/NE (3-4-5) top row of square;
// T_LT/T_C/T_RT (6-7-8) and T_LB/T_RB (9-10) inner diamond; Sq_SW/SE (11-12) bottom row;
// P_W/P_E (14-15) lateral I/O; P_S junction (16) and final P_S (13) at base.
// Node 1 = intermediate step P_N → Sq_NW chain; node 2 = latent P_NL off to side.
export const spinePositions = {
  0:  { x: 300, y:  50 }, // ★P_N  (source, top)
  1:  { x: 220, y: 115 }, // P_N→Sq_NW step
  2:  { x: 420, y: 115 }, // P_NL latent (right flank)
  3:  { x: 160, y: 185 }, // Sq_NW
  4:  { x: 300, y: 185 }, // Sq_NT
  5:  { x: 440, y: 185 }, // Sq_NE
  6:  { x: 240, y: 255 }, // T_LT
  7:  { x: 300, y: 300 }, // T_C  (resonance ×2)
  8:  { x: 360, y: 255 }, // T_RT
  9:  { x: 240, y: 345 }, // T_LB
  10: { x: 360, y: 345 }, // T_RB
  11: { x: 160, y: 415 }, // Sq_SW
  12: { x: 440, y: 415 }, // Sq_SE
  13: { x: 300, y: 560 }, // ★P_S  (bottom terminus)
  14: { x:  80, y: 415 }, // P_W  (L_HIP I/O)
  15: { x: 520, y: 415 }, // P_E  (R_HIP I/O)
  16: { x: 300, y: 490 }, // P_S junction (SACRAL I/O)
};
