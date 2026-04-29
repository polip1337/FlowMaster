import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/** Hand — Open Palm (6 nodes). GDD §2.3 HAND. */
export const handTopology: T1ClusterTopology = {
  id: "hand",
  nodeCount: 8,
  nodes: [
    { id: 0, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 1, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 2, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 3, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 4, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 5, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 6, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 7, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] }
  ],
  edges: [
    { from: 0, to: 2, defaultWeight: 50 },
    { from: 1, to: 2, defaultWeight: 50 },
    { from: 2, to: 3, defaultWeight: 50 },
    { from: 2, to: 4, defaultWeight: 50 },
    { from: 3, to: 5, defaultWeight: 50 },
    { from: 4, to: 6, defaultWeight: 50 },
    { from: 4, to: 7, defaultWeight: 50 }
  ],
  potentialExtraEdges: [{ from: 5, to: 6, defaultWeight: 0 }],
  meridianIoMap: {
    WRIST: 2
  },
  baseCapacityPerNode: 100,
  terminalNode: true
};

// Atlas: [PALM](2)=WRIST I/O centre; FL(0) and F_2(1) feed in from top/left;
// FR(3) and F_3-branch(4) extend right/down; finger tips 5,6,7 at extremities.
export const handPositions = {
  0: { x: 160, y: 100 }, // F_1   (top-left feed)
  1: { x: 160, y: 200 }, // F_2   (left feed)
  2: { x: 300, y: 200 }, // [PALM] WRIST I/O
  3: { x: 440, y: 200 }, // FR    (right branch)
  4: { x: 300, y: 330 }, // F_3   (down branch)
  5: { x: 440, y: 310 }, // FR tip
  6: { x: 200, y: 430 }, // F_4
  7: { x: 400, y: 430 }, // F_5
};
