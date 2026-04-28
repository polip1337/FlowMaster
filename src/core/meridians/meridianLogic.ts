import { DELTA_T, SCALE_W } from "../constants";
import { ENERGY_MODIFIERS } from "../energy/energyModifiers";
import { EnergyType, addPools, emptyPool, totalEnergy, type EnergyPool } from "../energy/EnergyType";
import { clamp, flowBonusPercent, jingStructuralPurity, logScalePurityFlow, logScaleWidth } from "../../utils/math";
import type { T1Node } from "../nodes/T1Node";
import { T1NodeType } from "../nodes/T1Types";
import type { T2Node } from "../nodes/T2Node";
import { getNonAffinityOverflowBoost, getT2PressureForRouting } from "../nodes/t2Logic";
import { T2NodeState } from "../nodes/T2Types";
import type { Meridian } from "./Meridian";
import {
  meridianStateFromTotalFlow,
  meridianStateRank,
  meridianWidthBase,
  MeridianState
} from "./MeridianTypes";

const BASE_PURITY_ON_ESTABLISH: Record<EnergyType, number> = {
  [EnergyType.Qi]: 0.55,
  [EnergyType.Jing]: 0.6,
  [EnergyType.YangQi]: 0.5,
  [EnergyType.Shen]: 0.65
};

const AFFINITY_DOMINANCE_THRESHOLD = 0.6;
const BIDIR_IDLE_BAND = 0.05;
const ACTIVE_PUMP_MAX = 2.5;

export interface GameStateForReverseMeridian {
  t2Nodes: Map<string, T2Node>;
}

export interface HarmonicPair {
  id: string;
  sharedNodeId: string;
  meridianAId: string;
  meridianBId: string;
  qualityA: number;
  qualityB: number;
}

export interface GameStateForMeridianHarmonics {
  t2Nodes: Map<string, T2Node>;
  meridians: Map<string, Meridian>;
}

export const MERIDIAN_HARMONIC_QUALITY_DELTA_MAX = 0.5;
export const MERIDIAN_HARMONIC_THROUGHPUT_BONUS = 0.15;
export const MERIDIAN_HARMONIC_SHEN_PULSE_PER_TICK = 0.002;

export function getT1LocalPressure(node: T1Node): number {
  if (node.capacity <= 0) {
    return 0;
  }
  return clamp(totalEnergy(node.energy) / node.capacity, 0, 1);
}

/** Effective width W for bottleneck / circulation metrics (S-019, Phase 9). */
export function getMeridianEffectiveWidth(m: Meridian): number {
  return Math.max(0, m.width) * (1 - clamp(m.scarPenalty, 0, 0.99));
}

function poolFractions(pool: EnergyPool): Record<EnergyType, number> {
  const tot = totalEnergy(pool);
  if (tot <= 0) {
    return {
      [EnergyType.Qi]: 0,
      [EnergyType.Jing]: 0,
      [EnergyType.YangQi]: 0,
      [EnergyType.Shen]: 0
    };
  }
  return {
    [EnergyType.Qi]: pool[EnergyType.Qi] / tot,
    [EnergyType.Jing]: pool[EnergyType.Jing] / tot,
    [EnergyType.YangQi]: pool[EnergyType.YangQi] / tot,
    [EnergyType.Shen]: pool[EnergyType.Shen] / tot
  };
}

function weightedModifierValue(pool: EnergyPool, pick: (t: EnergyType) => number): number {
  const fr = poolFractions(pool);
  return Object.values(EnergyType).reduce((sum, t) => sum + fr[t] * pick(t), 0);
}

export function establishMeridian(m: Meridian, firstEnergyType: EnergyType, fromNode: T2Node, toNode: T2Node): boolean {
  if (m.isEstablished || fromNode.state !== T2NodeState.ACTIVE || toNode.state !== T2NodeState.ACTIVE) {
    return false;
  }
  m.isEstablished = true;
  m.state = MeridianState.NASCENT;
  m.basePurity = BASE_PURITY_ON_ESTABLISH[firstEnergyType];
  m.dominantTypeAccumulator = emptyPool();
  return true;
}

export function computeMeridianPurity(m: Meridian): number {
  const structural = jingStructuralPurity(m.jingDeposit);
  const typePurityFactor = weightedModifierValue(m.dominantTypeAccumulator, (t) => ENERGY_MODIFIERS[t].purityFactor);
  const flow = logScalePurityFlow(m.totalFlow, typePurityFactor || 1);
  return clamp(m.basePurity + structural + flow + m.shenScatterBonus - Math.max(0, m.scarPenalty), 0, 0.99);
}

export function updateMeridianWidth(m: Meridian, typeMix: EnergyPool): number {
  if (!m.isEstablished) {
    m.width = 0;
    m.state = MeridianState.UNESTABLISHED;
    return m.width;
  }

  m.state = meridianStateFromTotalFlow(m.totalFlow, m.isEstablished);
  const base = meridianWidthBase(m.state);
  const typeFactor = weightedModifierValue(typeMix, (t) => ENERGY_MODIFIERS[t].widthFactor);
  m.width = logScaleWidth(m.totalFlow, typeFactor || 1, base, SCALE_W);
  return m.width;
}

/** @alias TaskList TASK-050 naming */
export const computeMeridianWidth = updateMeridianWidth;

export function getAffinityModifiers(
  m: Meridian,
  type: EnergyType
): { widthMod: number; purityLossMod: number } {
  if (m.typeAffinity === null) {
    return { widthMod: 1, purityLossMod: 1 };
  }
  if (m.typeAffinity === type) {
    return { widthMod: 1.25, purityLossMod: 0.85 };
  }
  return { widthMod: 1, purityLossMod: 1.1 };
}

export function updateMeridianAffinity(m: Meridian, flowThisTick: EnergyPool): void {
  m.dominantTypeAccumulator = addPools(m.dominantTypeAccumulator, flowThisTick);
  const accTot = totalEnergy(m.dominantTypeAccumulator);
  if (accTot <= 0) {
    m.affinityFraction = 0;
    return;
  }

  let dominant: EnergyType = EnergyType.Qi;
  let domAmt = -1;
  for (const t of Object.values(EnergyType)) {
    if (m.dominantTypeAccumulator[t] > domAmt) {
      domAmt = m.dominantTypeAccumulator[t];
      dominant = t;
    }
  }

  m.affinityFraction = domAmt / accTot;
  if (m.affinityFraction >= AFFINITY_DOMINANCE_THRESHOLD) {
    m.typeAffinity = dominant;
  }
}

export function updateMeridianDeposits(m: Meridian, jingFlowThisTick: number, shenLostThisTick: number): void {
  const j = Math.max(0, jingFlowThisTick);
  const purity = clamp(m.purity, 0, 1);
  m.jingDeposit += j * purity * 0.001;
  m.shenScatterBonus += Math.max(0, shenLostThisTick) * 0.05;
}

/** TASK-081 — width-limited meridian transport favors Shen > Jing > Qi > YangQi. */
const MERIDIAN_FLOW_PRIORITY: EnergyType[] = [
  EnergyType.Shen,
  EnergyType.Jing,
  EnergyType.Qi,
  EnergyType.YangQi
];

export function applyMeridianFlowPriorityCap(desired: EnergyPool, cap: number): EnergyPool {
  const out = emptyPool();
  if (cap <= 0) {
    return out;
  }
  let rem = cap;
  for (const t of MERIDIAN_FLOW_PRIORITY) {
    const x = Math.min(Math.max(0, desired[t]), rem);
    out[t] = x;
    rem -= x;
  }
  return out;
}

/**
 * TASK-081 — per-type unconstrained budget from IO composition; if sum exceeds cap, priority cap applies.
 */
function allocateMeridianTypeFlow(m: Meridian, ioOut: T1Node, capTotal: number): EnergyPool {
  const out = emptyPool();
  if (capTotal <= 0) {
    return out;
  }

  const fr = poolFractions(ioOut.energy);
  const unconstrained = emptyPool();
  let sum = 0;
  for (const t of Object.values(EnergyType)) {
    const aff = getAffinityModifiers(m, t).widthMod;
    unconstrained[t] = capTotal * fr[t] * ENERGY_MODIFIERS[t].flowMod * aff;
    sum += unconstrained[t];
  }

  if (sum <= 0) {
    return out;
  }
  if (sum <= capTotal) {
    return unconstrained;
  }
  return applyMeridianFlowPriorityCap(unconstrained, capTotal);
}

/** S-017 — TASK-082 overflow pressure on effective IO export side (alias for clarity). */
export function computeOverflowPressure(node: T2Node, dominantType: EnergyType): number {
  void dominantType;
  return getNonAffinityOverflowBoost(node);
}

export function computePassiveMeridianFlow(m: Meridian, fromNode: T2Node, toNode: T2Node): EnergyPool {
  if (!m.isEstablished || m.state === MeridianState.UNESTABLISHED) {
    return emptyPool();
  }

  const ioOut = fromNode.t1Nodes.get(m.ioNodeOutId);
  const ioIn = toNode.t1Nodes.get(m.ioNodeInId);
  if (!ioOut || !ioIn) {
    return emptyPool();
  }

  const dominant = m.typeAffinity ?? EnergyType.Qi;
  const pOut = getT1LocalPressure(ioOut) + computeOverflowPressure(fromNode, dominant);
  const pIn = getT1LocalPressure(ioIn);
  const dP = pOut - pIn;
  if (dP <= 0) {
    return emptyPool();
  }

  m.purity = computeMeridianPurity(m);
  const W = getMeridianEffectiveWidth(m);
  const Pur = clamp(m.purity, 0, 1);
  const grossBudget = W * dP * Pur * DELTA_T;
  return allocateMeridianTypeFlow(m, ioOut, grossBudget);
}

export function computeActiveMeridianFlow(
  m: Meridian,
  fromNode: T2Node,
  _toNode: T2Node,
  techniqueStrength: number
): EnergyPool {
  if (!m.isEstablished || m.state === MeridianState.UNESTABLISHED) {
    return emptyPool();
  }

  const ioOut = fromNode.t1Nodes.get(m.ioNodeOutId);
  if (!ioOut) {
    return emptyPool();
  }

  m.purity = computeMeridianPurity(m);
  const W = getMeridianEffectiveWidth(m);
  const Pur = clamp(m.purity, 0, 1);
  const pumpMod = clamp(techniqueStrength * getT2PressureForRouting(fromNode), 0, ACTIVE_PUMP_MAX);
  const grossBudget = W * pumpMod * Pur * DELTA_T;
  return allocateMeridianTypeFlow(m, ioOut, grossBudget);
}

export interface ApplyMeridianFlowResult {
  grossWithdrawn: EnergyPool;
  deposited: EnergyPool;
  heatDelta: number;
}

function computeMeridianTransferCore(
  ioOut: T1Node,
  ioIn: T1Node,
  flow: EnergyPool,
  purity: number
): { grossWithdrawn: EnergyPool; deposited: EnergyPool; heatDelta: number } {
  const grossWithdrawn = emptyPool();
  const deposited = emptyPool();
  const Pur = clamp(purity, 0, 1);

  const gross = emptyPool();
  for (const t of Object.values(EnergyType)) {
    gross[t] = Math.min(Math.max(0, flow[t]), Math.max(0, ioOut.energy[t]));
  }

  const idealDeposit = emptyPool();
  for (const t of Object.values(EnergyType)) {
    idealDeposit[t] = gross[t] * Pur;
  }

  const rem = Math.max(0, ioIn.capacity - totalEnergy(ioIn.energy));
  const idealTot = totalEnergy(idealDeposit);
  const scale = idealTot <= 0 ? 0 : Math.min(1, rem / idealTot);

  let heatDelta = 0;
  for (const t of Object.values(EnergyType)) {
    const g = gross[t] * scale;
    grossWithdrawn[t] = g;
    deposited[t] = g * Pur;
    const lost = g * (1 - Pur);
    heatDelta += lost * ENERGY_MODIFIERS[t].heatPerLost;
  }

  return { grossWithdrawn, deposited, heatDelta };
}

/** S-013 — gross withdrawal that would occur without mutating nodes (for reservation). */
export function planMeridianGrossWithdrawal(fromT2: T2Node, toT2: T2Node, flow: EnergyPool, m: Meridian): EnergyPool {
  const ioOut = fromT2.t1Nodes.get(m.ioNodeOutId);
  const ioIn = toT2.t1Nodes.get(m.ioNodeInId);
  if (!ioOut || !ioIn) {
    return emptyPool();
  }
  const purity = computeMeridianPurity(m);
  const { grossWithdrawn } = computeMeridianTransferCore(ioOut, ioIn, flow, purity);
  return grossWithdrawn;
}

export function applyMeridianFlow(
  fromT2: T2Node,
  toT2: T2Node,
  flow: EnergyPool,
  m: Meridian
): ApplyMeridianFlowResult {
  const ioOut = fromT2.t1Nodes.get(m.ioNodeOutId);
  const ioIn = toT2.t1Nodes.get(m.ioNodeInId);
  const empty = { grossWithdrawn: emptyPool(), deposited: emptyPool(), heatDelta: 0 };
  if (!ioOut || !ioIn) {
    return empty;
  }

  m.purity = computeMeridianPurity(m);
  const { grossWithdrawn, deposited, heatDelta } = computeMeridianTransferCore(ioOut, ioIn, flow, m.purity);

  for (const t of Object.values(EnergyType)) {
    ioOut.energy[t] -= grossWithdrawn[t];
    ioIn.energy[t] += deposited[t];
  }

  ioOut.reservedEnergy = emptyPool();

  const flowed = totalEnergy(grossWithdrawn);
  m.totalFlow += flowed;

  const Pur = clamp(m.purity, 0, 1);
  const jingGross = grossWithdrawn[EnergyType.Jing];
  const shenLost = grossWithdrawn[EnergyType.Shen] * (1 - Pur);
  updateMeridianDeposits(m, jingGross, shenLost);

  return { grossWithdrawn, deposited, heatDelta };
}

export function computeFlowBonus(m: Meridian): number {
  return flowBonusPercent(m.width, m.purity, m.totalFlow);
}

export function canOpenReverse(forward: Meridian, gameState: GameStateForReverseMeridian): boolean {
  const tier = meridianStateFromTotalFlow(forward.totalFlow, forward.isEstablished);
  if (forward.isReverse || meridianStateRank(tier) < meridianStateRank(MeridianState.DEVELOPED)) {
    return false;
  }
  const a = gameState.t2Nodes.get(forward.nodeFromId);
  const b = gameState.t2Nodes.get(forward.nodeToId);
  return Boolean(a && b && a.level >= 3 && b.level >= 3);
}

export function openReverseMeridian(
  forward: Meridian,
  newId: string,
  gameState: GameStateForReverseMeridian
): { meridian: Meridian; cost: EnergyPool } | null {
  if (!canOpenReverse(forward, gameState)) {
    return null;
  }
  const from = gameState.t2Nodes.get(forward.nodeFromId);
  const to = gameState.t2Nodes.get(forward.nodeToId);
  if (!from || !to) {
    return null;
  }

  const rank = Math.max(from.rank, to.rank);
  const jingCost = 500 * rank * forward.hopCount;
  const yangCost = 200 * rank;

  const reverse: Meridian = {
    id: newId,
    nodeFromId: forward.nodeToId,
    nodeToId: forward.nodeFromId,
    ioNodeOutId: forward.ioNodeInId,
    ioNodeInId: forward.ioNodeOutId,
    state: MeridianState.NASCENT,
    width: meridianWidthBase(MeridianState.NASCENT),
    purity: clamp(forward.purity * 0.6, 0.05, 0.99),
    totalFlow: 0,
    jingDeposit: 0,
    shenScatterBonus: 0,
    basePurity: forward.basePurity,
    typeAffinity: null,
    affinityFraction: 0,
    dominantTypeAccumulator: emptyPool(),
    isEstablished: true,
    isScarred: false,
    scarPenalty: 0,
    hopCount: forward.hopCount,
    isReverse: true
  };

  const cost = emptyPool();
  cost[EnergyType.Jing] = jingCost;
  cost[EnergyType.YangQi] = yangCost;

  return { meridian: reverse, cost };
}

/**
 * S-014 — BIDIR direction from local IO T1 pressure (same basis as passive flow), not T2 aggregate.
 */
export function resolveBidirDirection(m: Meridian, fromT2: T2Node, toT2: T2Node): "send" | "receive" | "idle" {
  const ioOut = fromT2.t1Nodes.get(m.ioNodeOutId);
  const ioIn = toT2.t1Nodes.get(m.ioNodeInId);
  if (!ioOut || !ioIn) {
    return "idle";
  }
  if (ioOut.type !== T1NodeType.IO_BIDIR && ioIn.type !== T1NodeType.IO_BIDIR) {
    return "send";
  }
  const localP = getT1LocalPressure(ioOut);
  const neighborP = getT1LocalPressure(ioIn);
  const delta = localP - neighborP;
  if (Math.abs(delta) < BIDIR_IDLE_BAND) {
    return "idle";
  }
  return delta > 0 ? "send" : "receive";
}

export function createBaseMeridian(
  init: Pick<Meridian, "id" | "nodeFromId" | "nodeToId" | "ioNodeOutId" | "ioNodeInId" | "hopCount"> &
    Partial<Omit<Meridian, "id" | "nodeFromId" | "nodeToId" | "ioNodeOutId" | "ioNodeInId" | "hopCount">>
): Meridian {
  return {
    id: init.id,
    nodeFromId: init.nodeFromId,
    nodeToId: init.nodeToId,
    ioNodeOutId: init.ioNodeOutId,
    ioNodeInId: init.ioNodeInId,
    hopCount: init.hopCount,
    state: init.state ?? MeridianState.UNESTABLISHED,
    width: init.width ?? 0,
    purity: init.purity ?? 0,
    totalFlow: init.totalFlow ?? 0,
    jingDeposit: init.jingDeposit ?? 0,
    shenScatterBonus: init.shenScatterBonus ?? 0,
    basePurity: init.basePurity ?? 0,
    typeAffinity: init.typeAffinity ?? null,
    affinityFraction: init.affinityFraction ?? 0,
    dominantTypeAccumulator: init.dominantTypeAccumulator ?? emptyPool(),
    isEstablished: init.isEstablished ?? false,
    isScarred: init.isScarred ?? false,
    scarPenalty: init.scarPenalty ?? 0,
    isReverse: init.isReverse ?? false
  };
}

function isRefinedOrAbove(m: Meridian): boolean {
  return m.isEstablished && meridianStateRank(m.state) >= meridianStateRank(MeridianState.REFINED);
}

function harmonicPairId(sharedNodeId: string, aId: string, bId: string): string {
  const [left, right] = [aId, bId].sort((x, y) => x.localeCompare(y));
  return `${sharedNodeId}:${left}:${right}`;
}

/** TASK-169 — detect balanced REFINED+ meridian pairs sharing the same T2 endpoint node. */
export function checkMeridianHarmonics(state: GameStateForMeridianHarmonics): HarmonicPair[] {
  const pairs: HarmonicPair[] = [];
  for (const [nodeId] of state.t2Nodes) {
    const connected = [...state.meridians.values()].filter(
      (m) => isRefinedOrAbove(m) && (m.nodeFromId === nodeId || m.nodeToId === nodeId)
    );
    if (connected.length < 2) {
      continue;
    }
    for (let i = 0; i < connected.length - 1; i += 1) {
      for (let j = i + 1; j < connected.length; j += 1) {
        const a = connected[i];
        const b = connected[j];
        const qualityA = clamp(a.purity, 0, 1);
        const qualityB = clamp(b.purity, 0, 1);
        if (Math.abs(qualityA - qualityB) > MERIDIAN_HARMONIC_QUALITY_DELTA_MAX) {
          continue;
        }
        pairs.push({
          id: harmonicPairId(nodeId, a.id, b.id),
          sharedNodeId: nodeId,
          meridianAId: a.id,
          meridianBId: b.id,
          qualityA,
          qualityB
        });
      }
    }
  }
  return pairs;
}
