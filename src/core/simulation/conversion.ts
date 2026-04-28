import { EnergyType, totalEnergy } from "../energy/EnergyType";
import { clamp } from "../../utils/math";
import type { T2Node } from "../nodes/T2Node";
import { T1NodeState } from "../nodes/T1Types";

/** Manipura furnace T1 id (Ten-Spoke Wheel center). */
export const MANIPURA_FURNACE_T1_ID = 11;

/**
 * TASK-079 — Manipura Refining Pulse: Qi → YangQi at 3:1, efficiency from rank/level,
 * reduced when body heat ratio ≥ 40%. Returns heat (converted Qi × 0.2) for the heat system.
 */
export function applyManipuraRefiningPulse(
  manipura: T2Node,
  active: boolean,
  bodyHeatRatio: number,
  conversionMultiplier = 1
): number {
  if (!active) {
    return 0;
  }

  const furnace = manipura.t1Nodes.get(MANIPURA_FURNACE_T1_ID);
  if (!furnace || furnace.state !== T1NodeState.ACTIVE) {
    return 0;
  }

  const heatPenalty =
    bodyHeatRatio < 0.4 ? 1 : clamp(1 - (bodyHeatRatio - 0.4) * 1.25, 0.15, 1);
  const eff = clamp(0.3 + 0.07 * manipura.level + 0.03 * manipura.rank, 0.3, 0.95) * heatPenalty;

  const qiAvail = furnace.energy[EnergyType.Qi];
  const maxQiPerTick = 12;
  let qiSpend = Math.min(maxQiPerTick, Math.max(0, qiAvail));
  if (qiSpend <= 0) {
    return 0;
  }

  const k = 1 - eff / 3;
  const T = totalEnergy(furnace.energy);
  const cap = furnace.capacity;
  if (k > 1e-9 && T - qiSpend * k > cap + 1e-9) {
    qiSpend = Math.min(qiSpend, Math.max(0, (T - cap) / k));
  }
  qiSpend = Math.min(qiSpend, qiAvail);
  if (qiSpend <= 0) {
    return 0;
  }

  const yangGain = (qiSpend / 3) * eff * conversionMultiplier;
  furnace.energy[EnergyType.Qi] -= qiSpend;
  furnace.energy[EnergyType.YangQi] += yangGain;
  return qiSpend * 0.2;
}
