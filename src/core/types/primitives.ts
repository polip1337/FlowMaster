/**
 * S-001 — Shared primitive re-exports only (no domain graph types).
 * Import enums here when you need several primitives without pulling T2Node ↔ conditions cycles.
 */
export { EnergyType, type EnergyPool, emptyPool, addPools, scaledPool, subtractPoolsNonNegative, totalEnergy } from "../energy/EnergyType";
export { T1NodeType, T1NodeState } from "../nodes/T1Types";
export { T2NodeType, T2NodeState } from "../nodes/T2Types";
export { MeridianState } from "../meridians/MeridianTypes";
