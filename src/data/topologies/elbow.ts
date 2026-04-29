import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/** Elbow — Forked Branch (6 nodes). GDD §2.3 ELBOW. */
export const elbowTopology: T1ClusterTopology = {
  id: "elbow",
  nodeCount: 9,
  nodes: [
    { id: 0, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 1, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 2, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 3, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 4, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 5, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 6, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 7, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 8, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] }
  ],
  edges: [
    { from: 0, to: 1, defaultWeight: 50 },
    { from: 1, to: 2, defaultWeight: 50 },
    { from: 1, to: 3, defaultWeight: 50 },
    { from: 2, to: 4, defaultWeight: 50 },
    { from: 3, to: 6, defaultWeight: 50 },
    { from: 4, to: 5, defaultWeight: 50 },
    { from: 6, to: 7, defaultWeight: 50 },
    { from: 7, to: 8, defaultWeight: 50 }
  ],
  potentialExtraEdges: [{ from: 2, to: 6, defaultWeight: 0 }],
  meridianIoMap: {
    SHOULDER: 0,
    WRIST: 5
  },
  baseCapacityPerNode: 100,
  latentT1NodeIds: [8]
};

// Atlas: ★T_1(0)=SHOULDER top; fork at T_2(1) into T-branch and B-branch; ★T_5(5)=WRIST.
// B_4(8) is latent dangling branch.
export const elbowPositions = {
  0: { x: 300, y:  60 }, // ★T_1  SHOULDER I/O
  1: { x: 300, y: 150 }, // T_2  fork point
  2: { x: 190, y: 240 }, // T_3  left branch
  3: { x: 410, y: 240 }, // B_1  right branch
  4: { x: 190, y: 330 }, // T_4
  5: { x: 190, y: 420 }, // ★T_5  WRIST I/O
  6: { x: 410, y: 330 }, // B_2
  7: { x: 410, y: 420 }, // B_3
  8: { x: 410, y: 510 }, // B_4  (latent)
};
