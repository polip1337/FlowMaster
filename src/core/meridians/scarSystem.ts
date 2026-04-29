import { EnergyType } from "../energy/EnergyType";
import type { Meridian } from "./Meridian";
import type { GameState } from "../../state/GameState";

export const MERIDIAN_SCAR_TRIGGER_MULTIPLIER = 2.5;
export const MERIDIAN_SCAR_STEP = 0.05;
export const MERIDIAN_SCAR_MAX_PENALTY = 0.25;
export const MERIDIAN_SCAR_HEAL_SHEN_COST = 50_000;

function clampScarPenalty(value: number): number {
  return Math.max(0, Math.min(MERIDIAN_SCAR_MAX_PENALTY, value));
}

export function recordMeridianScarIfOverloaded(
  meridian: Meridian,
  actualFlowThisTick: number,
  wasActivePumpTick: boolean
): boolean {
  if (!wasActivePumpTick) {
    return false;
  }
  const width = Math.max(0, meridian.width);
  if (width <= 0) {
    return false;
  }
  const threshold = width * MERIDIAN_SCAR_TRIGGER_MULTIPLIER;
  if (actualFlowThisTick <= threshold) {
    return false;
  }
  meridian.scarPenalty = clampScarPenalty(meridian.scarPenalty + MERIDIAN_SCAR_STEP);
  meridian.isScarred = meridian.scarPenalty > 0;
  return true;
}

export function healMeridianScar(meridian: Meridian, applications = 1): number {
  const count = Math.max(0, Math.floor(applications));
  if (count <= 0 || meridian.scarPenalty <= 0) {
    return 0;
  }
  const previous = meridian.scarPenalty;
  meridian.scarPenalty = clampScarPenalty(meridian.scarPenalty - MERIDIAN_SCAR_STEP * count);
  meridian.isScarred = meridian.scarPenalty > 0;
  return Math.max(0, previous - meridian.scarPenalty);
}

function totalBodyShen(state: GameState): number {
  let total = 0;
  for (const t2 of state.t2Nodes.values()) {
    for (const t1 of t2.t1Nodes.values()) {
      total += Math.max(0, t1.energy[EnergyType.Shen]);
    }
  }
  return total;
}

function spendBodyShen(state: GameState, amount: number): boolean {
  const need = Math.max(0, amount);
  if (need <= 0) {
    return true;
  }
  if (totalBodyShen(state) < need) {
    return false;
  }
  let remain = need;
  for (const t2 of state.t2Nodes.values()) {
    for (const t1 of t2.t1Nodes.values()) {
      if (remain <= 0) {
        return true;
      }
      const available = Math.max(0, t1.energy[EnergyType.Shen]);
      if (available <= 0) {
        continue;
      }
      const spend = Math.min(available, remain);
      t1.energy[EnergyType.Shen] -= spend;
      remain -= spend;
    }
  }
  return remain <= 0;
}

export function healMeridianScarWithShen(state: GameState, meridianId: string): boolean {
  const meridian = state.meridians.get(meridianId);
  if (!meridian || meridian.scarPenalty <= 0) {
    return false;
  }
  if (!spendBodyShen(state, MERIDIAN_SCAR_HEAL_SHEN_COST)) {
    return false;
  }
  healMeridianScar(meridian, 1);
  return true;
}
