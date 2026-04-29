import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/**
 * Svadhisthana — Lotus Hex. Task-029 + GDD.
 * I/O: P0 ROOT, P3 SOLAR, P1 L_HIP, P4 R_HIP. P2, P5 latent.
 */
export const svadhisthanaTopology: T1ClusterTopology = {
  id: "svadhisthana",
  nodeCount: 17,
  nodes: [
    { id: 0, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 1, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 2, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 3, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 4, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 5, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 6, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 7, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 8, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 9, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 10, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 11, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 12, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 13, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 14, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 15, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 16, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] }
  ],
  edges: [
    { from: 0, to: 1, defaultWeight: 50 },
    { from: 0, to: 13, defaultWeight: 50 },
    { from: 1, to: 2, defaultWeight: 50 },
    { from: 1, to: 5, defaultWeight: 50 },
    { from: 2, to: 3, defaultWeight: 50 },
    { from: 3, to: 6, defaultWeight: 50 },
    { from: 4, to: 5, defaultWeight: 50 },
    { from: 4, to: 14, defaultWeight: 50 },
    { from: 5, to: 6, defaultWeight: 50 },
    { from: 5, to: 9, defaultWeight: 50 },
    { from: 6, to: 7, defaultWeight: 50 },
    { from: 7, to: 8, defaultWeight: 50 },
    { from: 7, to: 9, defaultWeight: 50 },
    { from: 7, to: 10, defaultWeight: 50 },
    { from: 8, to: 9, defaultWeight: 50 },
    { from: 8, to: 11, defaultWeight: 50 },
    { from: 9, to: 12, defaultWeight: 50 },
    { from: 10, to: 13, defaultWeight: 50 },
    { from: 10, to: 15, defaultWeight: 50 },
    { from: 11, to: 14, defaultWeight: 50 },
    { from: 11, to: 16, defaultWeight: 50 },
    { from: 12, to: 15, defaultWeight: 50 },
    { from: 16, to: 15, defaultWeight: 50 }
  ],
  potentialExtraEdges: [{ from: 2, to: 6, defaultWeight: 0 }, { from: 10, to: 11, defaultWeight: 0 }],
  meridianIoMap: {
    ROOT: 16,
    SOLAR: 0,
    L_HIP: 12,
    R_HIP: 4
  },
  baseCapacityPerNode: 100,
  latentT1NodeIds: [2, 14]
};

// Atlas: ★P4(0)=SOLAR top; ★P1(16)=ROOT bottom; R_HIP(4) right; L_HIP(12) left.
// Inner hex: IC(7) centre; I3(5) I4(6) upper; I2(8) I5(9) mid; I1(10) I6(11) lower.
// 1=P3M upper-left bridge; 2=latent step; 3=left-outer approach; 13=P2M lower-left bridge;
// 14=P6M lower-right bridge (latent); 15=bottom junction.
export const dantianPositions = {
  0:  { x: 300, y:  50 }, // ★P4  SOLAR (top)
  1:  { x: 185, y: 125 }, // P3M  upper-left bridge
  2:  { x: 100, y: 200 }, // latent step (P3-left)
  3:  { x:  55, y: 240 }, // left outer approach (upper)
  4:  { x: 415, y: 125 }, // P5   R_HIP upper-right
  5:  { x: 230, y: 220 }, // I3   upper-left inner
  6:  { x: 370, y: 220 }, // I4   upper-right inner
  7:  { x: 300, y: 300 }, // IC   centre
  8:  { x: 205, y: 300 }, // I2   mid-left inner
  9:  { x: 395, y: 300 }, // I5   mid-right inner
  10: { x: 230, y: 380 }, // I1   lower-left inner
  11: { x: 370, y: 380 }, // I6   lower-right inner
  12: { x:  55, y: 300 }, // L_HIP I/O — left side (same column as 3, differentiated by row)
  13: { x: 185, y: 475 }, // P2M  lower-left bridge
  14: { x: 415, y: 475 }, // P6M  lower-right bridge (latent)
  15: { x: 300, y: 540 }, // bottom junction
  16: { x: 300, y: 615 }, // ★P1  ROOT (bottom)
};
