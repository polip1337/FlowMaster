// FlowMaster: core simulation loop. processTick advances the game one tick
// (SI generation, edge transfers, projections, resonance, surges, unlocks,
// and win check). tick drives it from setInterval and supports dev speedup.
// resetGame restores initial state. refreshOpenTooltip rebuilds the popup
// overview in-place without full rerender.

function processTick() {
  if (gameWon) return;
  const attr = getAttributeState();

  const sourceNode = nodeById(0);
  const baseGeneration = SOURCE_RATE_PER_TICK;
  const surgeProjectionBonus = sunSurgeTicks > 0 ? 0.2 : 0;
  const generation = baseGeneration * (1 + attr.generationPercent) + attr.generationFlatPerTick;
  sourceNode.si += generation;

  let earthInflowThisTick = 0;
  let apexInflowThisTick = 0;
  for (const edge of edges) {
    if (edge.flow <= 0) continue;
    if (!isNodeAvailableForOutflow(edge.from)) continue;

    const sourceAmount = sourceNode.si;
    const earthNode = nodeById(11);
    const earthPenaltyActive = earthNode?.unlocked && earthNode.si > 0 && attr.fortitude < 0.7;
    const earthPenalty = earthPenaltyActive ? (earthNode.bonuses?.earthSinkPenalty ?? 0) : 0;
    const transferMultiplier = Math.max(
      0.5,
      1 + attr.flowEfficiency + attr.harmonyPower * 0.2 - earthPenalty
    );
    const transfer =
      sourceAmount * FLOW_TRANSFER_FACTOR_PER_TICK * (edge.flow / 100) * transferMultiplier;
    if (transfer <= 0) continue;

    const fromNode = nodeById(edge.from);
    const toNode = nodeById(edge.to);
    const move = Math.min(transfer, fromNode.si);
    fromNode.si -= move;
    toNode.si += move;
    if (toNode.id === 11) earthInflowThisTick += move;
    if (toNode.id === 20) apexInflowThisTick += move;
  }

  for (const projection of activeProjections) {
    if (!isNodeAvailableForOutflow(projection.from)) continue;
    const fromNode = nodeById(projection.from);
    const toNode = nodeById(projection.to);
    const transfer =
      sourceNode.si *
      projectionTransferFactorPerTick *
      (1 + attr.projectionRatePercent + attr.harmonyPower * 0.15 + surgeProjectionBonus);
    const move = Math.min(transfer, fromNode.si);
    fromNode.si -= move;
    toNode.si += move;
    if (toNode.id === 11) earthInflowThisTick += move;
    if (toNode.id === 20) apexInflowThisTick += move;
    if (attr.projectionEcho > 0 && move > 0) {
      const echoEdge = edges.find((edge) => edge.from === toNode.id);
      if (echoEdge) {
        const echoTarget = nodeById(echoEdge.to);
        const echoAmount = move * attr.projectionEcho;
        toNode.si = Math.max(0, toNode.si - echoAmount);
        echoTarget.si += echoAmount;
      }
    }
  }

  if (attr.resonanceReady) {
    resonance = Math.min(100, resonance + resonanceGainPerTick);
  } else {
    resonance = Math.max(0, resonance - resonanceDecayPerTick);
  }
  if (resonance >= 100 && resonanceBurstTicks <= 0) {
    resonanceBurstTicks = resonanceBurstTicksMax;
    statusEl.textContent = "Resonance awakened! Sigil output surges.";
  }
  if (resonanceBurstTicks > 0) {
    resonanceBurstTicks -= 1;
  }

  if (earthInflowThisTick > earthSinkInflowThreshold && attr.fortitude < 0.7) {
    resonance = Math.max(0, resonance - 0.55);
  }
  if (earthInflowThisTick > earthSinkHardThreshold && attr.fortitude < 0.5) {
    sourceNode.si = Math.max(0, sourceNode.si - earthInflowThisTick * 0.65);
  }

  // Active perk: Sun Arc Lower periodically overcharges projections.
  if (nodeById(10)?.unlocked && tickCounter - lastSunSurgeTick >= sunSurgeIntervalTicks) {
    lastSunSurgeTick = tickCounter;
    sunSurgeTicks = sunSurgeDurationTicks;
    statusEl.textContent = "Sun Arc surge: projection channels intensified.";
  }
  if (sunSurgeTicks > 0) {
    sunSurgeTicks -= 1;
  }

  // Active perk: Apex Crown Seal converts inflow into immediate resonance.
  if (nodeById(20)?.unlocked && apexInflowThisTick > 0) {
    resonance = Math.min(100, resonance + Math.min(0.22, apexInflowThisTick * 1.8));
  }

  for (const node of nodeData) {
    if (node.unlocked || node.id === 0) continue;
    if (node.si >= node.unlockCost) {
      node.unlocked = true;
      unlockFadeProgress.set(node.id, 0);
      statusEl.textContent = `${node.name} unlocked!`;
    }
  }

  for (const [nodeId, progress] of unlockFadeProgress.entries()) {
    const next = progress + 1;
    if (next >= UNLOCK_FADE_TICKS) unlockFadeProgress.delete(nodeId);
    else unlockFadeProgress.set(nodeId, next);
  }

  if (nodeData.every((node) => node.id === 0 || node.unlocked)) {
    gameWon = true;
    statusEl.textContent = "Ascension complete! The full sigil is awakened.";
  }

  updateNodeUI();
  sourceTotalEl.textContent = fmt(sourceNode.si);
  updateBonusSummary();
  if (!gameWon && tickCounter % 50 === 0) {
    const patternState = attr.resonancePatternReady ? "aligned" : "misaligned";
    statusEl.textContent = `Resonance ${fmt(resonance)} (${patternState}) | Gen ${fmt(generation * TICKS_PER_SECOND)} SI/s`;
  }
}

function tick() {
  const steps = devSpeedEnabled ? simSpeedMultiplier : 1;
  for (let i = 0; i < steps; i += 1) {
    if (gameWon) break;
    tickCounter += 1;
    processTick();
  }
  ticksEl.textContent = String(tickCounter);
}

function refreshOpenTooltip() {
  if (selectedNodeId < 0) return;
  if (flowPopupEl.classList.contains("hidden")) return;
  if (!visibleNodeIds.has(selectedNodeId)) {
    hideFlowPopup();
    return;
  }
  const node = nodeById(selectedNodeId);
  const overviewBlock = flowPopupEl.querySelector(".popup-overview");
  if (!node || !overviewBlock) return;

  const attr = getAttributeState();
  const rates = computeNodeRates(attr);
  const nodeRate = rates[selectedNodeId] ?? { in: 0, out: 0, net: 0 };
  const etaSec =
    node.unlocked
      ? 0
      : ((node.unlockCost - node.si) > 0 && nodeRate.net > 0
        ? (node.unlockCost - node.si) / nodeRate.net / TICKS_PER_SECOND
        : Infinity);
  const attrInfo = getCultivationAttributeInfo(node.attributeType);
  const stateKey = getNodeState(node);
  const formatSiPerSec = (value) => stateKey === "locked" && value === 0 ? "—" : `${fmt(value)} SI/s`;
  const etaLabel = node.unlocked
    ? "—"
    : Number.isFinite(etaSec)
      ? formatHumanDuration(etaSec)
      : "blocked";
  overviewBlock.innerHTML = `
    <div class="popup-section-title">概覽 · Overview</div>
    <div class="popup-keyvals">
      <div data-tooltip="${attrInfo.description}"><span>Path</span>${attrInfo.name} T${node.attributeTier ?? "-"}</div>
      <div><span>SI</span>${fmt(node.si)} / ${node.unlockCost}</div>
      <div><span>In</span>${formatSiPerSec(nodeRate.in * TICKS_PER_SECOND)}</div>
      <div><span>Out</span>${formatSiPerSec(nodeRate.out * TICKS_PER_SECOND)}</div>
      <div><span>Net</span>${stateKey === "locked" && nodeRate.net === 0 ? "—" : `${fmt(nodeRate.net * TICKS_PER_SECOND)} SI/s`}</div>
      <div><span>時至突破 ETA</span>${etaLabel}</div>
    </div>
  `;
  attachDomTooltips(overviewBlock);

  const badge = flowPopupEl.querySelector(".state-badge");
  if (badge) {
    const stateMeta = STATE_META[stateKey];
    badge.className = `state-badge state-${stateKey}`;
    badge.textContent = `${stateMeta.char} · ${stateMeta.en}`;
  }
}

function resetGame() {
  tickCounter = 0;
  gameWon = false;
  resonance = 0;
  resonanceBurstTicks = 0;
  sunSurgeTicks = 0;
  lastSunSurgeTick = 0;
  for (let i = 0; i < nodeData.length; i += 1) {
    nodeData[i].si = initialNodeState[i].si;
    nodeData[i].unlocked = initialNodeState[i].unlocked;
  }
  unlockFadeProgress.clear();
  for (let i = 0; i < edges.length; i += 1) {
    edges[i].flow = initialEdges[i].flow;
  }
  activeProjections.length = 0;
  initializeTier2Snapshots();
  statusEl.textContent = "Open all sigil nodes to complete cultivation.";
  ticksEl.textContent = "0";
  sourceTotalEl.textContent = "0.00";
  selectedNodeId = -1;
  hideFlowPopup();
  redrawNetwork();
  updateBonusSummary();
}
