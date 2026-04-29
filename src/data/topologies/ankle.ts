import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/**
 * Ankle — Figure-Eight (6 nodes). GDD §2.3 ANKLE.
 * S-019 — directed upper/lower rings + zero-weight reverse edges for player-enabled mini-circulation.
 */
export const ankleTopology: T1ClusterTopology = {
  id: "ankle",
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
    { id: 10, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 11, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 12, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 13, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] }
  ],
  edges: [
    { from: 0, to: 1, defaultWeight: 50 },
    { from: 1, to: 2, defaultWeight: 50 },
    { from: 2, to: 3, defaultWeight: 50 },
    { from: 0, to: 4, defaultWeight: 50 },
    { from: 4, to: 5, defaultWeight: 50 },
    { from: 5, to: 6, defaultWeight: 50 },
    { from: 3, to: 6, defaultWeight: 50 },
    { from: 4, to: 7, defaultWeight: 50 },
    { from: 7, to: 8, defaultWeight: 50 },
    { from: 8, to: 9, defaultWeight: 50 },
    { from: 10, to: 11, defaultWeight: 50 },
    { from: 11, to: 12, defaultWeight: 50 },
    { from: 12, to: 13, defaultWeight: 50 },
    { from: 9, to: 13, defaultWeight: 50 }
  ],
  potentialExtraEdges: [{ from: 2, to: 5, defaultWeight: 0 }, { from: 8, to: 12, defaultWeight: 0 }],
  meridianIoMap: {
    KNEE: 0,
    FOOT: 10
  },
  baseCapacityPerNode: 100
};

// Atlas: upper loop ★UL_A(0)=KNEE, UL_B(1),UL_C(2),UL_D(3) top arc; UL_E(4),UL_F(5),UL_G(6) bottom arc.
// Middle connector 7-8-9 bridges to lower loop.
// Lower loop ★LL_A(10)=FOOT, LL_B(11),LL_C(12),LL_D(13); shares midpoint with upper.
export const anklePositions = {
  // Upper loop
  0:  { x: 120, y:  80 }, // ★UL_A  KNEE I/O
  1:  { x: 250, y:  80 }, // UL_B
  2:  { x: 380, y:  80 }, // UL_C
  3:  { x: 500, y:  80 }, // UL_D
  4:  { x: 120, y: 200 }, // UL_E
  5:  { x: 250, y: 200 }, // UL_F  (figure-8 midpoint left)
  6:  { x: 500, y: 200 }, // UL_G
  // Middle bridge (upper→lower)
  7:  { x: 120, y: 310 }, // bridge node
  8:  { x: 250, y: 310 }, // bridge mid
  9:  { x: 380, y: 310 }, // bridge exit
  // Lower loop
  10: { x: 120, y: 430 }, // ★LL_A  FOOT I/O
  11: { x: 250, y: 430 }, // LL_B
  12: { x: 380, y: 430 }, // LL_C
  13: { x: 500, y: 430 }, // LL_D
};
