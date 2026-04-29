// FlowMaster: gameplay math — attribute aggregation and per-tick transfer
// calculations. These functions are pure reads: they don't mutate nodeData.

import {
  TICKS_PER_CYCLE, TICKS_PER_SECOND, FLOW_TRANSFER_FACTOR_PER_TICK,
  projectionTransferFactorPerTick
} from './constants.ts';
import { nodeData, edges } from './config.ts';
import { st, activeProjections } from './state.ts';
import { nodeById, sumUnlockedBonus, edgeFlow, isNodeAvailableForOutflow } from './queries.ts';
import { fmtPercent } from './utils.ts';

function isIoNode(node: any): boolean {
  return node?.nodeType === "IO_IN" || node?.nodeType === "IO_OUT" || node?.nodeType === "IO_BIDIR";
}

function getPrimaryGenerationNode() {
  return nodeData.find((n) => n.unlocked && n.isSourceNode && !isIoNode(n))
    ?? nodeData.find((n) => n.unlocked && !isIoNode(n))
    ?? nodeById(0);
}

export function getAttributeState() {
  const flowEfficiency = sumUnlockedBonus("flowEfficiency");
  const projectionRatePercent = sumUnlockedBonus("projectionRatePercent");
  const projectionEcho = sumUnlockedBonus("projectionEcho");
  const fortitude = sumUnlockedBonus("fortitude");
  const harmonyPower = sumUnlockedBonus("harmonyPower");
  const essencePercent = sumUnlockedBonus("essencePercent");
  const essenceFlatPerCycle = sumUnlockedBonus("essenceFlatPerCycle");
  const projectionDurationTicks = sumUnlockedBonus("projectionDurationTicks");
  const maxBridgesBonus = sumUnlockedBonus("maxBridges");
  const resonanceBurstPercent = sumUnlockedBonus("resonanceBurstPercent");

  const coreAdjacents = [12, 13, 14].filter((id) => nodeById(id)?.unlocked).length;
  const coreAdjacencyBonus = coreAdjacents * (nodeById(0)?.bonuses?.essencePercent ?? 0);

  const hasLeftBranch = nodeById(5)?.unlocked && nodeById(6)?.unlocked && nodeById(7)?.unlocked;
  const hasRightBranch = nodeById(8)?.unlocked && nodeById(9)?.unlocked && nodeById(10)?.unlocked;
  const hasTriangle = nodeById(12)?.unlocked && nodeById(13)?.unlocked && nodeById(14)?.unlocked;
  const hasUpper = nodeById(1)?.unlocked && nodeById(2)?.unlocked && nodeById(3)?.unlocked;
  const leftPattern = edgeFlow(15, 5) + edgeFlow(5, 6) + edgeFlow(6, 11);
  const rightPattern = edgeFlow(8, 3) + edgeFlow(3, 9) + edgeFlow(9, 10);
  const trianglePattern = edgeFlow(12, 13) + edgeFlow(13, 14) + edgeFlow(14, 12);
  const upperPattern = edgeFlow(2, 1) + edgeFlow(1, 17) + edgeFlow(18, 19);
  const resonancePatternReady =
    leftPattern >= 24 && rightPattern >= 24 && trianglePattern >= 24 && upperPattern >= 10;
  const resonanceReady = Boolean(
    hasLeftBranch && hasRightBranch && hasTriangle && hasUpper && resonancePatternReady
  );
  const resonanceActive = st.resonanceBurstTicks > 0;

  const generationPercent =
    essencePercent +
    coreAdjacencyBonus +
    (resonanceActive ? resonanceBurstPercent : 0) +
    harmonyPower * 0.2;
  const generationFlatPerTick = essenceFlatPerCycle / TICKS_PER_CYCLE;

  return {
    flowEfficiency,
    projectionRatePercent,
    projectionEcho,
    fortitude,
    harmonyPower,
    projectionDurationTicks,
    maxActiveBridges: 1 + Math.floor(maxBridgesBonus),
    generationPercent,
    generationFlatPerTick,
    resonanceReady,
    resonanceActive,
    resonancePatternReady,
    leftPattern,
    rightPattern,
    trianglePattern,
    upperPattern
  };
}

export function getProjectionTransferPerTick(attr: any, projection: any) {
  const sourceNode = getPrimaryGenerationNode();
  const fromNode = nodeById(projection.from);
  if (!sourceNode || !fromNode) return 0;
  const surgeProjectionBonus = st.sunSurgeTicks > 0 ? 0.2 : 0;
  const transfer =
    sourceNode.si *
    projectionTransferFactorPerTick *
    (1 + attr.projectionRatePercent + attr.harmonyPower * 0.15 + surgeProjectionBonus);
  return Math.max(0, Math.min(transfer, fromNode.si));
}

export function getEdgeTransferPerTick(edge: any, attr: any = null) {
  if (edge.flow <= 0) return 0;
  if (!isNodeAvailableForOutflow(edge.from)) return 0;
  const sourceNode = getPrimaryGenerationNode();
  const fromNode = nodeById(edge.from);
  if (!sourceNode || !fromNode) return 0;
  const state = attr ?? getAttributeState();
  const earthNode = nodeById(11);
  const earthPenaltyActive = earthNode?.unlocked && earthNode.si > 0 && state.fortitude < 0.7;
  const earthPenalty = earthPenaltyActive ? (earthNode.bonuses?.earthSinkPenalty ?? 0) : 0;
  const transferMultiplier = Math.max(
    0.5,
    1 + state.flowEfficiency + state.harmonyPower * 0.2 - earthPenalty
  );
  const rawTransfer =
    sourceNode.si * FLOW_TRANSFER_FACTOR_PER_TICK * (edge.flow / 100) * transferMultiplier;
  return Math.max(0, Math.min(rawTransfer, fromNode.si));
}

export function computeNodeRates(attr: any) {
  const rates: Record<number, { in: number; out: number; net: number }> = Object.fromEntries(
    nodeData.map((node) => [node.id, { in: 0, out: 0, net: 0 }])
  );
  for (const edge of edges) {
    const transfer = getEdgeTransferPerTick(edge, attr);
    if (transfer <= 0) continue;
    rates[edge.from].out += transfer;
    rates[edge.to].in += transfer;
  }
  for (const projection of activeProjections) {
    const transfer = getProjectionTransferPerTick(attr, projection);
    if (transfer <= 0) continue;
    rates[projection.from].out += transfer;
    rates[projection.to].in += transfer;
  }
  for (const id of Object.keys(rates)) {
    (rates as any)[id].net = (rates as any)[id].in - (rates as any)[id].out;
  }
  return rates;
}

export function formatNodeBonuses(node: any) {
  const bonuses = node.bonuses || {};
  const entries: string[] = [];
  if (bonuses.flowEfficiency) entries.push(`+${fmtPercent(bonuses.flowEfficiency)} Meridian Efficiency`);
  if (bonuses.projectionRatePercent) entries.push(`+${fmtPercent(bonuses.projectionRatePercent)} Projection Throughput`);
  if (bonuses.projectionDurationTicks) entries.push(`+${bonuses.projectionDurationTicks} Projection Duration Ticks`);
  if (bonuses.projectionEcho) entries.push(`+${fmtPercent(bonuses.projectionEcho)} Projection Echo`);
  if (bonuses.fortitude) entries.push(`+${fmtPercent(bonuses.fortitude)} Body Tempering`);
  if (bonuses.harmonyPower) entries.push(`+${fmtPercent(bonuses.harmonyPower)} Dual Harmony`);
  if (bonuses.essencePercent) entries.push(`+${fmtPercent(bonuses.essencePercent)} Core Generation Bonus`);
  if (bonuses.essenceFlatPerCycle) entries.push(`+${bonuses.essenceFlatPerCycle} SI / 1000 ticks (Flat Gen)`);
  if (bonuses.maxBridges) entries.push(`+${bonuses.maxBridges} Max Projection Bridge`);
  if (bonuses.resonanceBurstPercent) entries.push(`+${fmtPercent(bonuses.resonanceBurstPercent)} Resonance Burst`);
  if (bonuses.earthSinkPenalty) entries.push(`Earth Penalty ${fmtPercent(bonuses.earthSinkPenalty)}`);
  return entries.length > 0 ? entries.join(" | ") : "No passive bonus";
}
