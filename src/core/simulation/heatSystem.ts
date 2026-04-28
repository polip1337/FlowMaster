import { DELTA_T } from "../constants";
import { clamp } from "../../utils/math";

export interface HeatUpdateInput {
  bodyHeat: number;
  maxBodyHeat: number;
  manipuraResonance: number;
  meridianHeatGain: number;
}

export interface HeatUpdateResult {
  bodyHeat: number;
  purityMultiplier: number;
  hpDamagePerTick: number;
  nodeCrackRisk: number;
}

/**
 * Step 5 heat model:
 * - add meridian heat gain
 * - dissipate by Manipura resonance
 * - expose threshold effects for downstream systems
 *
 * S-030 tribulation behavior:
 * - during active tribulation, caller passes `meridianHeatGain = 0`
 * - this makes heat update dissipation-only (body cools, no new heat accumulation)
 */
export function updateBodyHeat(input: HeatUpdateInput): HeatUpdateResult {
  const maxBodyHeat = Math.max(1, input.maxBodyHeat);
  const heatAdded = Math.max(0, input.meridianHeatGain);
  const dissipation = 0.5 * Math.max(0, input.manipuraResonance) * DELTA_T;
  const bodyHeat = clamp(input.bodyHeat + heatAdded - dissipation, 0, maxBodyHeat);

  const ratio = bodyHeat / maxBodyHeat;
  const purityMultiplier = ratio >= 0.4 ? 0.95 : 1;
  const hpDamagePerTick = ratio >= 0.65 ? 0.01 : 0;
  const nodeCrackRisk = ratio >= 0.85 ? 0.01 : 0;

  return {
    bodyHeat,
    purityMultiplier,
    hpDamagePerTick,
    nodeCrackRisk
  };
}
