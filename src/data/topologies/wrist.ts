import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/** Wrist — Cross-Gate (6 nodes). GDD §2.3 WRIST. */
export const wristTopology: T1ClusterTopology = {
  id: "wrist",
  nodeCount: 9,
  nodes: [
    { id: 0, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 1, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 2, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 3, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 4, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 5, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 6, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 7, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 8, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] }
  ],
  edges: [
    { from: 0, to: 4, defaultWeight: 50 },
    { from: 1, to: 2, defaultWeight: 50 },
    { from: 2, to: 3, defaultWeight: 50 },
    { from: 3, to: 4, defaultWeight: 50 },
    { from: 4, to: 5, defaultWeight: 50 },
    { from: 4, to: 7, defaultWeight: 50 },
    { from: 6, to: 7, defaultWeight: 50 },
    { from: 7, to: 8, defaultWeight: 50 }
  ],
  potentialExtraEdges: [{ from: 0, to: 1, defaultWeight: 0 }, { from: 5, to: 8, defaultWeight: 0 }],
  meridianIoMap: {
    ELBOW: 0,
    HAND: 6
  },
  baseCapacityPerNode: 100,
  latentT1NodeIds: [8]
};

// Atlas: elbow I/O enters at left spine (0), converges at cross node (4),
// then exits toward hand I/O (6). Used for both left and right wrists.
export const wristPositions = {
  0: { x: 80, y: 250 },  // ELBOW I/O
  1: { x: 220, y: 120 }, // upper chain start
  2: { x: 320, y: 120 },
  3: { x: 420, y: 180 },
  4: { x: 320, y: 250 }, // cross center
  5: { x: 420, y: 320 },
  6: { x: 560, y: 250 }, // HAND I/O
  7: { x: 460, y: 250 }, // hand-side bridge
  8: { x: 560, y: 380 }  // latent branch
};
