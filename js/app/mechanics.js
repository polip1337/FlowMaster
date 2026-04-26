// FlowMaster: gameplay math — attribute aggregation and per-tick transfer
// calculations. These functions are pure reads: they don't mutate nodeData.

function getAttributeState() {
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
  const resonanceActive = resonanceBurstTicks > 0;

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

function getProjectionTransferPerTick(attr, projection) {
  const sourceNode = nodeById(0);
  const fromNode = nodeById(projection.from);
  if (!sourceNode || !fromNode) return 0;
  const surgeProjectionBonus = sunSurgeTicks > 0 ? 0.2 : 0;
  const transfer =
    sourceNode.si *
    projectionTransferFactorPerTick *
    (1 + attr.projectionRatePercent + attr.harmonyPower * 0.15 + surgeProjectionBonus);
  return Math.max(0, Math.min(transfer, fromNode.si));
}

function getEdgeTransferPerTick(edge, attr = null) {
  if (edge.flow <= 0) return 0;
  if (!isNodeAvailableForOutflow(edge.from)) return 0;
  const sourceNode = nodeById(0);
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

function computeNodeRates(attr) {
  const rates = Object.fromEntries(nodeData.map((node) => [node.id, { in: 0, out: 0, net: 0 }]));
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
    rates[id].net = rates[id].in - rates[id].out;
  }
  return rates;
}

function formatNodeBonuses(node) {
  const bonuses = node.bonuses || {};
  const entries = [];
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
