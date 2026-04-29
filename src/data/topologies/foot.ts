import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/** Foot — Ground Arch (6 nodes). GDD §2.3 FOOT. */
export const footTopology: T1ClusterTopology = {
  id: "foot",
  nodeCount: 11,
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
    { id: 10, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] }
  ],
  edges: [
    { from: 0, to: 1, defaultWeight: 50 },
    { from: 1, to: 2, defaultWeight: 50 },
    { from: 2, to: 3, defaultWeight: 50 },
    { from: 3, to: 4, defaultWeight: 50 },
    { from: 4, to: 5, defaultWeight: 50 },
    { from: 1, to: 6, defaultWeight: 50 },
    { from: 2, to: 6, defaultWeight: 50 },
    { from: 3, to: 7, defaultWeight: 50 },
    { from: 6, to: 8, defaultWeight: 50 },
    { from: 7, to: 8, defaultWeight: 50 },
    { from: 8, to: 9, defaultWeight: 50 },
    { from: 9, to: 10, defaultWeight: 50 }
  ],
  potentialExtraEdges: [{ from: 2, to: 7, defaultWeight: 0 }],
  meridianIoMap: {
    ANKLE: 0
  },
  baseCapacityPerNode: 100,
  passiveAbsorberNode: 8,
  terminalNode: true
};

export const footLeftPositions = {
  // Atlas: ★HEEL(0)=ANKLE left; arch AR_1..AR_4; TOE right; MID nodes below arch; SOLE→GND chain.
  0:  { x:  60, y: 200 }, // ★HEEL  ANKLE I/O
  1:  { x: 160, y: 200 }, // AR_1
  2:  { x: 260, y: 200 }, // AR_2
  3:  { x: 360, y: 200 }, // AR_3
  4:  { x: 460, y: 200 }, // AR_4
  5:  { x: 560, y: 200 }, // TOE
  6:  { x: 200, y: 300 }, // MID_1
  7:  { x: 340, y: 300 }, // MID_2
  8:  { x: 270, y: 390 }, // SOLE  (passiveAbsorber)
  9:  { x: 270, y: 470 }, // GND_1
  10: { x: 270, y: 550 }, // GND_2
};

export const footRightPositions = {
  0:  { x: 560, y: 200 }, // ★HEEL  ANKLE I/O
  1:  { x: 460, y: 200 }, // AR_1
  2:  { x: 360, y: 200 }, // AR_2
  3:  { x: 260, y: 200 }, // AR_3
  4:  { x: 160, y: 200 }, // AR_4
  5:  { x:  60, y: 200 }, // TOE
  6:  { x: 400, y: 300 }, // MID_1
  7:  { x: 260, y: 300 }, // MID_2
  8:  { x: 330, y: 390 }, // SOLE  (passiveAbsorber)
  9:  { x: 330, y: 470 }, // GND_1
  10: { x: 330, y: 550 }, // GND_2
};
