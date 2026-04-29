import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/** Knee — Bent Reed (6 nodes). GDD §2.3 KNEE. */
export const kneeTopology: T1ClusterTopology = {
  id: "knee",
  nodeCount: 8,
  nodes: [
    { id: 0, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 1, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 2, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 3, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 4, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 5, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 6, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 7, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] }
  ],
  edges: [
    { from: 0, to: 1, defaultWeight: 50 },
    { from: 1, to: 2, defaultWeight: 50 },
    { from: 2, to: 3, defaultWeight: 50 },
    { from: 3, to: 4, defaultWeight: 50 },
    { from: 4, to: 5, defaultWeight: 50 },
    { from: 5, to: 6, defaultWeight: 50 },
    { from: 6, to: 7, defaultWeight: 50 }
  ],
  potentialExtraEdges: [{ from: 2, to: 4, defaultWeight: 0 }],
  meridianIoMap: {
    HIP: 0,
    ANKLE: 7
  },
  baseCapacityPerNode: 100
};

export const kneeLeftPositions = {
  // Atlas: vertical drop ★V_1(0)→V_2(1)→V_3(2) then horizontal →★H_4(7)
  0: { x: 100, y:  80 }, // ★V_1  HIP I/O
  1: { x: 100, y: 180 }, // V_2
  2: { x: 100, y: 280 }, // V_3
  3: { x: 200, y: 280 }, // V_4
  4: { x: 300, y: 280 }, // H_1
  5: { x: 400, y: 280 }, // H_2
  6: { x: 500, y: 280 }, // H_3
  7: { x: 600, y: 280 }, // ★H_4  ANKLE I/O
};

export const kneeRightPositions = {
  0: { x: 500, y:  80 }, // ★V_1  HIP I/O
  1: { x: 500, y: 180 }, // V_2
  2: { x: 500, y: 280 }, // V_3
  3: { x: 400, y: 280 }, // V_4
  4: { x: 300, y: 280 }, // H_1
  5: { x: 200, y: 280 }, // H_2
  6: { x: 100, y: 280 }, // H_3
  7: { x:  20, y: 280 }, // ★H_4  ANKLE I/O
};
