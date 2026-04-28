import { LEVEL_MULTIPLIERS, RANK_MULTIPLIERS } from "../constants";
import { EnergyType } from "../energy/EnergyType";
import { computeFlowBonus } from "../meridians/meridianLogic";
import { getT2Resonance } from "../nodes/t2Logic";
import { T2NodeState } from "../nodes/T2Types";
import type { GameState } from "../../state/GameState";
import { getNodeAttributeDef } from "../../data/attributeDefs";
import {
  createEmptyCombatAttributes,
  createEmptyCultivationAttributes,
  type CombatAttributes,
  type CultivationAttributes
} from "./types";

function applyCultivationPartial(
  out: CultivationAttributes,
  partial: Partial<CultivationAttributes>,
  scalar: number
): void {
  for (const key of Object.keys(partial) as Array<keyof CultivationAttributes>) {
    out[key] += (partial[key] ?? 0) * scalar;
  }
}

function applyCombatPartial(out: CombatAttributes, partial: Partial<CombatAttributes>, scalar: number): void {
  for (const key of Object.keys(partial) as Array<keyof CombatAttributes>) {
    out[key] += (partial[key] ?? 0) * scalar;
  }
}

function applyAjnaLobeBalance(state: GameState, cultivation: CultivationAttributes): void {
  const ajna = state.t2Nodes.get("AJNA");
  if (!ajna) {
    return;
  }
  let yin = 0;
  let yang = 0;
  for (const [id, t1] of ajna.t1Nodes) {
    const nodeEnergy =
      t1.energy[EnergyType.Qi] + t1.energy[EnergyType.Jing] + t1.energy[EnergyType.YangQi] + t1.energy[EnergyType.Shen];
    if (id <= 4) {
      yin += nodeEnergy;
    } else if (id <= 9) {
      yang += nodeEnergy;
    }
  }
  const total = yin + yang;
  if (total <= 0) {
    return;
  }
  const imbalance = Math.abs(yin - yang) / total;
  cultivation.criticalInsight *= 1 - imbalance * 0.5;
}

export function computeAllAttributes(state: GameState): {
  cultivation: CultivationAttributes;
  combat: CombatAttributes;
} {
  const cultivation = createEmptyCultivationAttributes();
  const combat = createEmptyCombatAttributes();

  for (const node of state.t2Nodes.values()) {
    if (node.state !== T2NodeState.ACTIVE && node.state !== T2NodeState.REFINED) {
      continue;
    }
    const base = getNodeAttributeDef(node.id);
    const resonance = getT2Resonance(node);
    const rankMul = RANK_MULTIPLIERS[Math.max(0, node.rank - 1)] ?? 1;
    const levelMul = LEVEL_MULTIPLIERS[Math.max(0, node.level - 1)] ?? 1;
    const scalar = resonance * rankMul * levelMul;

    applyCultivationPartial(cultivation, base.cultivation, scalar);
    applyCombatPartial(combat, base.combat, scalar);
  }

  let flowBonusSum = 0;
  for (const meridian of state.meridians.values()) {
    if (meridian.isEstablished) {
      flowBonusSum += computeFlowBonus(meridian);
    }
  }
  cultivation.maxEnergyBonus += flowBonusSum;

  applyAjnaLobeBalance(state, cultivation);

  return { cultivation, combat };
}
