import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/** Hip — Arch-and-Chain (9 nodes). Shared L/R. GDD §2.3 HIP + lateral PEER_HIP belt. */
export const hipTopology: T1ClusterTopology = {
  id: "hip",
  nodeCount: 13,
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
    { id: 10, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 11, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 12, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] }
  ],
  edges: [
    { from: 0, to: 1, defaultWeight: 50 },
    { from: 1, to: 2, defaultWeight: 50 },
    { from: 2, to: 3, defaultWeight: 50 },
    { from: 3, to: 4, defaultWeight: 50 },
    { from: 0, to: 5, defaultWeight: 50 },
    { from: 1, to: 6, defaultWeight: 50 },
    { from: 2, to: 7, defaultWeight: 50 },
    { from: 5, to: 6, defaultWeight: 50 },
    { from: 6, to: 7, defaultWeight: 50 },
    { from: 5, to: 8, defaultWeight: 50 },
    { from: 6, to: 8, defaultWeight: 50 },
    { from: 7, to: 8, defaultWeight: 50 },
    { from: 8, to: 9, defaultWeight: 50 },
    { from: 8, to: 10, defaultWeight: 50 },
    { from: 9, to: 11, defaultWeight: 50 },
    { from: 10, to: 11, defaultWeight: 50 },
    { from: 10, to: 12, defaultWeight: 50 }
  ],
  potentialExtraEdges: [{ from: 4, to: 7, defaultWeight: 0 }, { from: 11, to: 12, defaultWeight: 0 }],
  meridianIoMap: {
    ROOT: 0,
    SACRAL: 2,
    KNEE: 10,
    PEER_HIP: 12
  },
  baseCapacityPerNode: 100,
  latentT1NodeIds: [4, 9]
};

// Atlas: ★AR_L(0)=ROOT; AR_LM(1); AR_M(2)=SACRAL; AR_RM(3); AR_R(4,latent).
// K-row: K_L(5) K_C(6) K_R(7). Hub: K_hub(8). Latent(9).
// ★CH_C(10)=KNEE; CH_D(11); ★CH_E(12)=PEER_HIP.
export const hipPositions = {
  // Arch top row
  0:  { x:  80, y:  80 }, // ★AR_L  ROOT I/O
  1:  { x: 200, y:  80 }, // AR_LM
  2:  { x: 320, y:  80 }, // AR_M  SACRAL I/O
  3:  { x: 440, y:  80 }, // AR_RM
  4:  { x: 560, y:  80 }, // AR_R  (latent)
  // K row
  5:  { x: 170, y: 190 }, // K_L
  6:  { x: 320, y: 190 }, // K_C
  7:  { x: 470, y: 190 }, // K_R
  // Hub & lower chain
  8:  { x: 320, y: 290 }, // central hub
  9:  { x: 200, y: 370 }, // latent CH node
  10: { x: 440, y: 290 }, // ★CH_C  KNEE I/O
  11: { x: 250, y: 450 }, // CH_D
  12: { x: 390, y: 450 }, // ★CH_E  PEER_HIP I/O
};
