import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/**
 * Bindu — Crescent-Dot. GDD §2.3 BINDU.
 * CR_1..CR_11 as ids 0–10, D = 11; D connects only to CR_6 (id 5).
 */
export const binduTopology: T1ClusterTopology = {
  id: "bindu",
  nodeCount: 18,
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
    { id: 10, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 11, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 12, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 13, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 14, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 15, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 16, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 17, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] }
  ],
  edges: [
    { from: 0, to: 1, defaultWeight: 50 },
    { from: 1, to: 2, defaultWeight: 50 },
    { from: 2, to: 3, defaultWeight: 50 },
    { from: 3, to: 4, defaultWeight: 50 },
    { from: 4, to: 5, defaultWeight: 50 },
    { from: 5, to: 6, defaultWeight: 50 },
    { from: 6, to: 7, defaultWeight: 50 },
    { from: 7, to: 8, defaultWeight: 50 },
    { from: 8, to: 9, defaultWeight: 50 },
    { from: 9, to: 10, defaultWeight: 50 },
    { from: 0, to: 11, defaultWeight: 50 },
    { from: 2, to: 12, defaultWeight: 50 },
    { from: 4, to: 13, defaultWeight: 50 },
    { from: 5, to: 14, defaultWeight: 50 },
    { from: 6, to: 15, defaultWeight: 50 },
    { from: 8, to: 16, defaultWeight: 50 },
    { from: 10, to: 17, defaultWeight: 50 },
    { from: 14, to: 17, defaultWeight: 50 }
  ],
  potentialExtraEdges: [{ from: 3, to: 12, defaultWeight: 0 }, { from: 7, to: 16, defaultWeight: 0 }],
  meridianIoMap: {
    SAHASRARA: 0
  },
  baseCapacityPerNode: 100,
  latentT1NodeIds: [12, 15],
  stabilizationReserveNode: 17
};

// Atlas: ★CR_1(0)=SAHASRARA I/O, left end of horizontal crescent.
// CR chain 0–10 runs left→right across top. CL_1(11)..CL_6(16) hang below.
// D(17)=stabilizationReserve hangs from CL_4(14). Latent: 12(CL_2),15(CL_5).
export const crownPositions = {
  // Crescent top row — evenly spaced
  0:  { x:  60, y: 100 }, // ★CR_1  SAHASRARA I/O
  1:  { x: 120, y: 100 }, // CR_2
  2:  { x: 180, y: 100 }, // CR_3
  3:  { x: 240, y: 100 }, // CR_4
  4:  { x: 300, y: 100 }, // CR_5
  5:  { x: 360, y: 100 }, // CR_6
  6:  { x: 420, y: 100 }, // CR_7
  7:  { x: 480, y: 100 }, // CR_8
  8:  { x: 540, y: 100 }, // CR_9
  9:  { x: 600, y: 100 }, // CR_10
  10: { x: 660, y: 100 }, // CR_11
  // CL spurs hanging below
  11: { x: 120, y: 200 }, // CL_1  (from CR_1/0)
  12: { x: 210, y: 210 }, // CL_2  (latent, from CR_3/2)
  13: { x: 300, y: 220 }, // CL_3  (from CR_5/4)
  14: { x: 375, y: 230 }, // CL_4  (from CR_6/5)
  15: { x: 450, y: 220 }, // CL_5  (latent, from CR_7/6)
  16: { x: 555, y: 210 }, // CL_6  (from CR_9/8)
  17: { x: 375, y: 340 }, // D     stabilizationReserve (below CL_4)
};
