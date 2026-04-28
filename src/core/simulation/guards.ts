/**
 * S-020 — NaN / infinity guards for simulation energy pools.
 */

import { EnergyType, type EnergyPool } from "../energy/EnergyType";

const MAX_MAG = 1e9;

export function assertValidEnergyPool(pool: EnergyPool, context: string): void {
  for (const t of Object.values(EnergyType)) {
    const v = pool[t];
    if (!Number.isFinite(v)) {
      throw new Error(`${context}: invalid energy value for ${t}: ${v}`);
    }
    if (v < 0) {
      throw new Error(`${context}: negative energy for ${t}: ${v}`);
    }
  }
}

export function sanitizeEnergyPool(pool: EnergyPool): EnergyPool {
  const out: EnergyPool = { ...pool };
  for (const t of Object.values(EnergyType)) {
    let v = out[t];
    if (!Number.isFinite(v) || v < 0) {
      v = 0;
    }
    out[t] = Math.min(MAX_MAG, v);
  }
  return out;
}
