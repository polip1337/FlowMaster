import { EnergyType } from "../energy/EnergyType";
import type { T2Node } from "../nodes/T2Node";
import { T1NodeState } from "../nodes/T1Types";
import { T2NodeState } from "../nodes/T2Types";
import { getT2Resonance } from "../nodes/t2Logic";

export const FOOT_CLUSTER_IDS = ["L_FOOT", "R_FOOT"] as const;
/** Foot topology passive absorber (SOLE). */
export const FOOT_SOLE_T1_ID = 4;

const ANAHATA_ID = "ANAHATA";
const AJNA_ID = "AJNA";
/** S-018 / TASK-080 — Anahata inner hex HX_1 (id 6); IO boundary respected. */
const ANAHATA_SHEN_TARGET_T1 = 6;
const AJNA_SHEN_TARGET_T1 = 11;

function isT2Operational(state: T2NodeState): boolean {
  return state === T2NodeState.ACTIVE || state === T2NodeState.REFINED;
}

/**
 * TASK-078 — Earth Jing into foot SOLE when the foot cluster is ACTIVE and SOLE T1 is ACTIVE.
 */
export function applyFootSoleEarthJing(t2: T2Node, environmentModifier: number, generationMultiplier = 1): void {
  if (t2.state !== T2NodeState.ACTIVE) {
    return;
  }
  const sole = t2.t1Nodes.get(FOOT_SOLE_T1_ID);
  if (!sole || sole.state !== T1NodeState.ACTIVE) {
    return;
  }
  sole.energy[EnergyType.Jing] += 0.03 * sole.quality * environmentModifier * generationMultiplier;
}

/**
 * TASK-080 — passive Shen when heart / third-eye resonance exceeds 0.5.
 */
export function applyShenPassiveGeneration(
  t2: T2Node,
  generationMultiplier = 1,
  resonanceQualityMultiplier = 1
): void {
  if (t2.id !== ANAHATA_ID && t2.id !== AJNA_ID) {
    return;
  }
  if (!isT2Operational(t2.state)) {
    return;
  }
  if (getT2Resonance(t2) * resonanceQualityMultiplier <= 0.5) {
    return;
  }
  const t1Id = t2.id === ANAHATA_ID ? ANAHATA_SHEN_TARGET_T1 : AJNA_SHEN_TARGET_T1;
  const target = t2.t1Nodes.get(t1Id);
  if (!target || target.state !== T1NodeState.ACTIVE) {
    return;
  }
  target.energy[EnergyType.Shen] += 0.003 * generationMultiplier;
}
