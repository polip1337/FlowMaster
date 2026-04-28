import { EnergyType } from "../core/energy/EnergyType";
import { T2NodeType } from "../core/nodes/T2Types";
import type { UnlockCondition } from "./conditions";
import type { TopologyId } from "./topologies";

const Et = EnergyType;

const I = {
  MULADHARA: "MULADHARA",
  SVADHISTHANA: "SVADHISTHANA",
  MANIPURA: "MANIPURA",
  ANAHATA: "ANAHATA",
  VISHUDDHA: "VISHUDDHA",
  AJNA: "AJNA",
  SAHASRARA: "SAHASRARA",
  BINDU: "BINDU",
  L_SHOULDER: "L_SHOULDER",
  R_SHOULDER: "R_SHOULDER",
  L_ELBOW: "L_ELBOW",
  R_ELBOW: "R_ELBOW",
  L_WRIST: "L_WRIST",
  R_WRIST: "R_WRIST",
  L_HAND: "L_HAND",
  R_HAND: "R_HAND",
  L_HIP: "L_HIP",
  R_HIP: "R_HIP",
  L_KNEE: "L_KNEE",
  R_KNEE: "R_KNEE",
  L_ANKLE: "L_ANKLE",
  R_ANKLE: "R_ANKLE",
  L_FOOT: "L_FOOT",
  R_FOOT: "R_FOOT"
} as const;

function rank(nodeId: string, minRank: number): UnlockCondition {
  return { type: "node_rank", nodeId, minRank };
}

function level(nodeId: string, minLevel: number): UnlockCondition {
  return { type: "node_level", nodeId, minLevel };
}

function active(nodeId: string): UnlockCondition {
  return { type: "node_active", nodeId };
}

function energyQi(minAmount: number): UnlockCondition {
  return { type: "energy_accumulated", energyType: Et.Qi, minAmount, scope: "global" };
}

/**
 * Static T2 definitions (GDD §5–6 progression). Svadhisthana matches TaskList TASK-062 example.
 */
export interface T2NodeDef {
  id: string;
  displayName: string;
  type: T2NodeType;
  topologyId: TopologyId;
  primaryAffinity: EnergyType;
  secondaryAffinity: EnergyType | null;
  sealThreshold: number;
  unlockConditions: UnlockCondition[];
  baseCapacityPerT1: number;
  displayPosition: { x: number; y: number };
  description: string;
}

export const T2_NODE_DEFS: T2NodeDef[] = [
  {
    id: I.MULADHARA,
    displayName: "Muladhara",
    type: T2NodeType.CHAKRA,
    topologyId: "muladhara",
    primaryAffinity: Et.Qi,
    secondaryAffinity: Et.Jing,
    sealThreshold: 0,
    unlockConditions: [],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.5, y: 0.92 },
    description: "Root chakra — starting gate; primary Qi source."
  },
  {
    id: I.SVADHISTHANA,
    displayName: "Svadhisthana",
    type: T2NodeType.CHAKRA,
    topologyId: "svadhisthana",
    primaryAffinity: Et.Qi,
    secondaryAffinity: Et.Jing,
    sealThreshold: 900,
    unlockConditions: [
      rank(I.MULADHARA, 1),
      level(I.MULADHARA, 3),
      energyQi(500)
    ],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.5, y: 0.82 },
    description: "Sacral chakra — flow and circulation speed."
  },
  {
    id: I.MANIPURA,
    displayName: "Manipura",
    type: T2NodeType.CHAKRA,
    topologyId: "manipura",
    primaryAffinity: Et.YangQi,
    secondaryAffinity: Et.Qi,
    sealThreshold: 1400,
    unlockConditions: [active(I.SVADHISTHANA), rank(I.SVADHISTHANA, 1), energyQi(2000)],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.5, y: 0.7 },
    description: "Solar plexus — Yang Qi furnace and physical power."
  },
  {
    id: I.ANAHATA,
    displayName: "Anahata",
    type: T2NodeType.CHAKRA,
    topologyId: "anahata",
    primaryAffinity: Et.Shen,
    secondaryAffinity: Et.Qi,
    sealThreshold: 2200,
    unlockConditions: [active(I.MANIPURA), level(I.MANIPURA, 2), energyQi(6000)],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.5, y: 0.58 },
    description: "Heart chakra — Shen hub and lateral shoulder bridge."
  },
  {
    id: I.VISHUDDHA,
    displayName: "Vishuddha",
    type: T2NodeType.CHAKRA,
    topologyId: "vishuddha",
    primaryAffinity: Et.Qi,
    secondaryAffinity: Et.Shen,
    sealThreshold: 3000,
    unlockConditions: [active(I.ANAHATA), level(I.ANAHATA, 3), energyQi(12000)],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.5, y: 0.44 },
    description: "Throat chakra — technique power and resonance storage."
  },
  {
    id: I.AJNA,
    displayName: "Ajna",
    type: T2NodeType.CHAKRA,
    topologyId: "ajna",
    primaryAffinity: Et.Shen,
    secondaryAffinity: Et.YangQi,
    sealThreshold: 4000,
    unlockConditions: [active(I.VISHUDDHA), level(I.VISHUDDHA, 2), energyQi(20000)],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.5, y: 0.32 },
    description: "Third eye — yin-yang dyad and critical insight."
  },
  {
    id: I.SAHASRARA,
    displayName: "Sahasrara",
    type: T2NodeType.CHAKRA,
    topologyId: "sahasrara",
    primaryAffinity: Et.Shen,
    secondaryAffinity: Et.Qi,
    sealThreshold: 5200,
    unlockConditions: [active(I.AJNA), level(I.AJNA, 3), energyQi(35000)],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.5, y: 0.2 },
    description: "Crown chakra — realm cap and Dao insight."
  },
  {
    id: I.BINDU,
    displayName: "Bindu",
    type: T2NodeType.CHAKRA,
    topologyId: "bindu",
    primaryAffinity: Et.Jing,
    secondaryAffinity: Et.Shen,
    sealThreshold: 7500,
    unlockConditions: [active(I.SAHASRARA), level(I.SAHASRARA, 4), energyQi(50000)],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.5, y: 0.08 },
    description: "Bindu — stabilization reserve and meridian repair focus."
  },

  {
    id: I.L_SHOULDER,
    displayName: "Left shoulder",
    type: T2NodeType.JOINT,
    topologyId: "shoulder",
    primaryAffinity: Et.YangQi,
    secondaryAffinity: Et.Qi,
    sealThreshold: 700,
    unlockConditions: [active(I.ANAHATA), energyQi(4000)],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.35, y: 0.55 },
    description: "Shoulder ladder — links heart to left arm chain."
  },
  {
    id: I.R_SHOULDER,
    displayName: "Right shoulder",
    type: T2NodeType.JOINT,
    topologyId: "shoulder",
    primaryAffinity: Et.YangQi,
    secondaryAffinity: Et.Qi,
    sealThreshold: 700,
    unlockConditions: [active(I.ANAHATA), energyQi(4000)],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.65, y: 0.55 },
    description: "Mirrored shoulder; lateral path crosses through heart."
  },
  {
    id: I.L_ELBOW,
    displayName: "Left elbow",
    type: T2NodeType.JOINT,
    topologyId: "elbow",
    primaryAffinity: Et.YangQi,
    secondaryAffinity: null,
    sealThreshold: 550,
    unlockConditions: [active(I.L_SHOULDER), level(I.L_SHOULDER, 2)],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.28, y: 0.48 },
    description: "Forked branch — trunk vs latent branch tradeoff."
  },
  {
    id: I.R_ELBOW,
    displayName: "Right elbow",
    type: T2NodeType.JOINT,
    topologyId: "elbow",
    primaryAffinity: Et.YangQi,
    secondaryAffinity: null,
    sealThreshold: 550,
    unlockConditions: [active(I.R_SHOULDER), level(I.R_SHOULDER, 2)],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.72, y: 0.48 },
    description: "Mirrored elbow joint."
  },
  {
    id: I.L_WRIST,
    displayName: "Left wrist",
    type: T2NodeType.JOINT,
    topologyId: "wrist",
    primaryAffinity: Et.Qi,
    secondaryAffinity: Et.Shen,
    sealThreshold: 450,
    unlockConditions: [active(I.L_ELBOW), level(I.L_ELBOW, 2)],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.22, y: 0.4 },
    description: "Cross-gate — refinement rate contributor."
  },
  {
    id: I.R_WRIST,
    displayName: "Right wrist",
    type: T2NodeType.JOINT,
    topologyId: "wrist",
    primaryAffinity: Et.Qi,
    secondaryAffinity: Et.Shen,
    sealThreshold: 450,
    unlockConditions: [active(I.R_ELBOW), level(I.R_ELBOW, 2)],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.78, y: 0.4 },
    description: "Mirrored wrist."
  },
  {
    id: I.L_HAND,
    displayName: "Left hand",
    type: T2NodeType.JOINT,
    topologyId: "hand",
    primaryAffinity: Et.YangQi,
    secondaryAffinity: Et.Shen,
    sealThreshold: 400,
    unlockConditions: [active(I.L_WRIST)],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.18, y: 0.32 },
    description: "Terminal open palm — technique outlet."
  },
  {
    id: I.R_HAND,
    displayName: "Right hand",
    type: T2NodeType.JOINT,
    topologyId: "hand",
    primaryAffinity: Et.YangQi,
    secondaryAffinity: Et.Shen,
    sealThreshold: 400,
    unlockConditions: [active(I.R_WRIST)],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.82, y: 0.32 },
    description: "Mirrored hand terminal."
  },

  {
    id: I.L_HIP,
    displayName: "Left hip",
    type: T2NodeType.JOINT,
    topologyId: "hip",
    primaryAffinity: Et.Jing,
    secondaryAffinity: Et.Qi,
    sealThreshold: 800,
    unlockConditions: [active(I.SVADHISTHANA), active(I.MULADHARA), energyQi(3500)],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.38, y: 0.78 },
    description: "Arch-and-chain — root and belt nexus."
  },
  {
    id: I.R_HIP,
    displayName: "Right hip",
    type: T2NodeType.JOINT,
    topologyId: "hip",
    primaryAffinity: Et.Jing,
    secondaryAffinity: Et.Qi,
    sealThreshold: 800,
    unlockConditions: [active(I.SVADHISTHANA), active(I.MULADHARA), energyQi(3500)],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.62, y: 0.78 },
    description: "Mirrored hip; lateral belt to opposite side unlocks later."
  },
  {
    id: I.L_KNEE,
    displayName: "Left knee",
    type: T2NodeType.JOINT,
    topologyId: "knee",
    primaryAffinity: Et.Qi,
    secondaryAffinity: null,
    sealThreshold: 500,
    unlockConditions: [active(I.L_HIP), level(I.L_HIP, 2)],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.36, y: 0.68 },
    description: "Bent reed relay — mobility scaling."
  },
  {
    id: I.R_KNEE,
    displayName: "Right knee",
    type: T2NodeType.JOINT,
    topologyId: "knee",
    primaryAffinity: Et.Qi,
    secondaryAffinity: null,
    sealThreshold: 500,
    unlockConditions: [active(I.R_HIP), level(I.R_HIP, 2)],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.64, y: 0.68 },
    description: "Mirrored knee."
  },
  {
    id: I.L_ANKLE,
    displayName: "Left ankle",
    type: T2NodeType.JOINT,
    topologyId: "ankle",
    primaryAffinity: Et.Qi,
    secondaryAffinity: null,
    sealThreshold: 450,
    unlockConditions: [active(I.L_KNEE), level(I.L_KNEE, 2)],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.34, y: 0.58 },
    description: "Figure-eight mini-circulation."
  },
  {
    id: I.R_ANKLE,
    displayName: "Right ankle",
    type: T2NodeType.JOINT,
    topologyId: "ankle",
    primaryAffinity: Et.Qi,
    secondaryAffinity: null,
    sealThreshold: 450,
    unlockConditions: [active(I.R_KNEE), level(I.R_KNEE, 2)],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.66, y: 0.58 },
    description: "Mirrored ankle."
  },
  {
    id: I.L_FOOT,
    displayName: "Left foot",
    type: T2NodeType.JOINT,
    topologyId: "foot",
    primaryAffinity: Et.Jing,
    secondaryAffinity: Et.Qi,
    sealThreshold: 500,
    unlockConditions: [active(I.L_ANKLE)],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.32, y: 0.5 },
    description: "Ground arch — passive Earth absorption at sole."
  },
  {
    id: I.R_FOOT,
    displayName: "Right foot",
    type: T2NodeType.JOINT,
    topologyId: "foot",
    primaryAffinity: Et.Jing,
    secondaryAffinity: Et.Qi,
    sealThreshold: 500,
    unlockConditions: [active(I.R_ANKLE)],
    baseCapacityPerT1: 100,
    displayPosition: { x: 0.68, y: 0.5 },
    description: "Mirrored foot terminal."
  }
];

export const T2_NODE_DEFS_BY_ID: Map<string, T2NodeDef> = new Map(T2_NODE_DEFS.map((d) => [d.id, d]));
