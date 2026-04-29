import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/**
 * Manipura — Ten-Spoke Wheel. GDD §2.3 MANIPURA.
 * OT_N (HEART), OT_S (SACRAL) I/O; center C is yang Qi conversion furnace.
 */
export const manipuraTopology: T1ClusterTopology = {
  id: "manipura",
  nodeCount: 14,
  nodes: [
    { id: 0, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 1, type: n.DANTIAN, isSourceNode: false, unlockAfter: [] },
    { id: 2, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 3, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 4, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 5, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 6, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 7, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 8, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 9, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 10, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 11, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 12, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 13, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] }
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
    { from: 11, to: 13, defaultWeight: 50 },
    { from: 12, to: 13, defaultWeight: 50 }
  ],
  potentialExtraEdges: [{ from: 4, to: 6, defaultWeight: 0 }, { from: 8, to: 12, defaultWeight: 0 }],
  meridianIoMap: {
    HEART: 2,
    SACRAL: 12
  },
  baseCapacityPerNode: 100,
  latentT1NodeIds: [3, 9],
  yangQiConversionNode: 7
};

// Atlas: OT_N(0) top; outer ring OT_NW(1)=dantian OT_NM(2)=HEART OT_NE(3,latent) top-row;
// inner ring IR_1(4) IR_2(5) IR_3(6); C(7)=yangQi centre;
// IR_4(8) IR_5(9,latent); outer bottom OT_SW(10) OT_SM(11) OT_SE(12)=SACRAL; OT_S(13).
export const stomachPositions = {
  0:  { x: 300, y:  50 }, // OT_N
  1:  { x: 170, y: 140 }, // OT_NW  dantian
  2:  { x: 300, y: 140 }, // OT_NM  HEART I/O
  3:  { x: 430, y: 140 }, // OT_NE  (latent)
  4:  { x: 190, y: 240 }, // IR_1
  5:  { x: 300, y: 240 }, // IR_2
  6:  { x: 410, y: 240 }, // IR_3
  7:  { x: 300, y: 330 }, // C      yangQi conversion hub
  8:  { x: 410, y: 420 }, // IR_4
  9:  { x: 190, y: 420 }, // IR_5   (latent)
  10: { x: 170, y: 510 }, // OT_SW
  11: { x: 300, y: 510 }, // OT_SM
  12: { x: 430, y: 510 }, // OT_SE  SACRAL I/O
  13: { x: 300, y: 600 }, // OT_S
};
