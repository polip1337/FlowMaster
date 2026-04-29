import type { GameState } from "../state/GameState";
import { EnergyType } from "../core/energy/EnergyType";

export const UI_TO_CORE_T2_ID: Record<string, string> = {
  crown: "BINDU",
  mind: "SAHASRARA",
  intent: "AJNA",
  qi: "VISHUDDHA",
  heart: "ANAHATA",
  stomach: "MANIPURA",
  dantian: "SVADHISTHANA",
  spine: "MULADHARA",
  shoulderLeft: "L_SHOULDER",
  shoulderRight: "R_SHOULDER",
  elbowLeft: "L_ELBOW",
  elbowRight: "R_ELBOW",
  wristLeft: "L_WRIST",
  wristRight: "R_WRIST",
  handLeft: "L_HAND",
  handRight: "R_HAND",
  kneeLeft: "L_KNEE",
  kneeRight: "R_KNEE",
  ankleLeft: "L_ANKLE",
  ankleRight: "R_ANKLE",
  footLeft: "L_FOOT",
  footRight: "R_FOOT"
};

export const CORE_TO_UI_T2_ID: Record<string, string> = Object.entries(UI_TO_CORE_T2_ID).reduce(
  (acc, [uiId, coreId]) => {
    acc[coreId] = uiId;
    return acc;
  },
  {} as Record<string, string>
);

export const UI_BINDU_T2_ID = "crown";
export const UI_AJNA_T2_ID = "intent";

export function toUiTier2Id(coreTier2Id: string): string {
  return CORE_TO_UI_T2_ID[coreTier2Id] ?? coreTier2Id;
}

export function toCoreTier2Id(uiTier2Id: string): string {
  return UI_TO_CORE_T2_ID[uiTier2Id] ?? uiTier2Id;
}

export function computeBinduReserveRatio(state: GameState): number {
  const bindu = state.t2Nodes.get("BINDU");
  const reserveNode = bindu?.t1Nodes.get(11);
  if (!reserveNode) {
    return 0;
  }
  const capacity = Math.max(1, reserveNode.capacity);
  return Math.max(0, Math.min(1, reserveNode.energy[EnergyType.Qi] / capacity));
}

export function computeAjnaLobeBalance(state: GameState): { yinRatio: number; yangRatio: number; imbalance: number } {
  const ajna = state.t2Nodes.get("AJNA");
  if (!ajna) {
    return { yinRatio: 0.5, yangRatio: 0.5, imbalance: 0 };
  }
  let yin = 0;
  let yang = 0;
  for (const [id, t1] of ajna.t1Nodes) {
    const sum =
      t1.energy[EnergyType.Qi] +
      t1.energy[EnergyType.Jing] +
      t1.energy[EnergyType.YangQi] +
      t1.energy[EnergyType.Shen];
    if (id <= 4) yin += sum;
    else if (id <= 9) yang += sum;
  }
  const total = yin + yang;
  if (total <= 0) {
    return { yinRatio: 0.5, yangRatio: 0.5, imbalance: 0 };
  }
  const yinRatio = yin / total;
  const yangRatio = yang / total;
  return {
    yinRatio,
    yangRatio,
    imbalance: Math.abs(yinRatio - yangRatio)
  };
}
