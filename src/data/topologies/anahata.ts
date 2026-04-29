import { T1NodeType } from "../../core/nodes/T1Types";
import type { T1ClusterTopology } from "./types";

const n = T1NodeType;

/**
 * Anahata — Star of Two Triangles. GDD §2.3 ANAHATA.
 * Star 0–5, inner hex 6–11 (HX_1..HX_6).
 */
export const anahataTopology: T1ClusterTopology = {
  id: "anahata",
  nodeCount: 12,
  nodes: [
    { id: 0, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 1, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 2, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 3, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 4, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 5, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] },
    { id: 6, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 7, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 8, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 9, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 10, type: n.INTERNAL, isSourceNode: false, unlockAfter: [] },
    { id: 11, type: n.IO_BIDIR, isSourceNode: false, unlockAfter: [] }
  ],
  edges: [
    { from: 0, to: 1, defaultWeight: 50 },
    { from: 0, to: 2, defaultWeight: 50 },
    { from: 1, to: 3, defaultWeight: 50 },
    { from: 3, to: 4, defaultWeight: 50 },
    { from: 4, to: 5, defaultWeight: 50 },
    { from: 5, to: 6, defaultWeight: 50 },
    { from: 6, to: 7, defaultWeight: 50 },
    { from: 7, to: 8, defaultWeight: 50 },
    { from: 8, to: 3, defaultWeight: 50 },
    { from: 8, to: 9, defaultWeight: 50 },
    { from: 9, to: 10, defaultWeight: 50 },
    { from: 10, to: 11, defaultWeight: 50 },
    { from: 2, to: 11, defaultWeight: 50 }
  ],
  potentialExtraEdges: [{ from: 4, to: 8, defaultWeight: 0 }, { from: 7, to: 10, defaultWeight: 0 }],
  meridianIoMap: {
    THROAT: 0,
    R_SHOULDER: 2,
    SOLAR: 11,
    L_SHOULDER: 1
  },
  baseCapacityPerNode: 100,
  latentT1NodeIds: [5, 6]
};

// Atlas: ★SP_N(0)=THROAT top; SP_NW(1)=L_SHOULDER; SP_NE(2)=R_SHOULDER★;
// Star points 3(SW),4(inner-top),5(SE,latent); inner hex 6(HX_1)–10(HX_6); ★SP_S(11)=SOLAR bottom.
export const heartPositions = {
  0:  { x: 300, y:  50 }, // ★SP_N  THROAT (top)
  1:  { x: 160, y: 140 }, // SP_NW  L_SHOULDER
  2:  { x: 440, y: 140 }, // SP_NE★ R_SHOULDER
  3:  { x: 185, y: 255 }, // star point SW
  4:  { x: 300, y: 220 }, // inner top junction
  5:  { x: 415, y: 255 }, // star point SE (latent)
  6:  { x: 215, y: 320 }, // HX_1
  7:  { x: 300, y: 285 }, // HX_2
  8:  { x: 385, y: 320 }, // HX_3
  9:  { x: 215, y: 395 }, // HX_6 (lower-left)
  10: { x: 385, y: 395 }, // HX_5 (lower-right)
  11: { x: 300, y: 530 }, // ★SP_S  SOLAR (bottom)
};
