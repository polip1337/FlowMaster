// FlowMaster: core simulation loop.

import {
  SOURCE_RATE_PER_TICK, FLOW_TRANSFER_FACTOR_PER_TICK, TICKS_PER_SECOND,
  UNLOCK_FADE_TICKS, projectionTransferFactorPerTick,
  resonanceGainPerTick, resonanceDecayPerTick, resonanceBurstTicksMax,
  earthSinkInflowThreshold, earthSinkHardThreshold,
  sunSurgeIntervalTicks, sunSurgeDurationTicks
} from './constants.ts';
import { nodeData, edges, initialEdges, initialNodeState, ensureClusterTier1UiFields, ensureMeridianUiFields } from './config.ts';
import {
  st, activeProjections, unlockFadeProgress, statusEl, ticksEl, sourceTotalEl, flowPopupEl
} from './state.ts';
import { nodeById, isNodeAvailableForOutflow } from './queries.ts';
import { getAttributeState, computeNodeRates } from './mechanics.ts';
import { getCultivationAttributeInfo } from './queries.ts';
import { fmt, formatDuration, formatHumanDuration } from './utils.ts';
import { attachDomTooltips } from './tooltips.ts';
import { initializeTier2Snapshots } from './snapshots.ts';
import {
  syncEnergyPoolsFromGameplay,
  stepRefinementFromSi,
  stepDirectJingRepair,
  updateClusterRepairDom
} from './cluster-view.ts';
import { redrawNetwork, updateBonusSummary, updateNodeUI } from './hud.ts';
import { hideFlowPopup, updateFlowPopupPosition } from './flow-popup.ts';
import { getNodeState } from './queries.ts';
import { STATE_META } from './constants.ts';
import { stepPhase29UiSystems, updatePhase29Panels } from './phase29-panels.ts';

export function processTick() {
  if (st.gameWon) return;
  const attr = getAttributeState();
  const sourceNode = nodeById(0);
  const surgeProjectionBonus = st.sunSurgeTicks > 0 ? 0.2 : 0;
  const generation = SOURCE_RATE_PER_TICK * (1 + attr.generationPercent) + attr.generationFlatPerTick;
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
    const transferMultiplier = Math.max(0.5, 1 + attr.flowEfficiency + attr.harmonyPower * 0.2 - earthPenalty);
    const transfer = sourceAmount * FLOW_TRANSFER_FACTOR_PER_TICK * (edge.flow / 100) * transferMultiplier;
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
      sourceNode.si * projectionTransferFactorPerTick *
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
    st.resonance = Math.min(100, st.resonance + resonanceGainPerTick);
  } else {
    st.resonance = Math.max(0, st.resonance - resonanceDecayPerTick);
  }
  if (st.resonance >= 100 && st.resonanceBurstTicks <= 0) {
    st.resonanceBurstTicks = resonanceBurstTicksMax;
    if (statusEl) statusEl.textContent = "Resonance awakened! Sigil output surges.";
  }
  if (st.resonanceBurstTicks > 0) st.resonanceBurstTicks -= 1;

  if (earthInflowThisTick > earthSinkInflowThreshold && attr.fortitude < 0.7) {
    st.resonance = Math.max(0, st.resonance - 0.55);
  }
  if (earthInflowThisTick > earthSinkHardThreshold && attr.fortitude < 0.5) {
    sourceNode.si = Math.max(0, sourceNode.si - earthInflowThisTick * 0.65);
  }

  if (nodeById(10)?.unlocked && st.tickCounter - st.lastSunSurgeTick >= sunSurgeIntervalTicks) {
    st.lastSunSurgeTick = st.tickCounter;
    st.sunSurgeTicks = sunSurgeDurationTicks;
    if (statusEl) statusEl.textContent = "Sun Arc surge: projection channels intensified.";
  }
  if (st.sunSurgeTicks > 0) st.sunSurgeTicks -= 1;

  if (nodeById(20)?.unlocked && apexInflowThisTick > 0) {
    st.resonance = Math.min(100, st.resonance + Math.min(0.22, apexInflowThisTick * 1.8));
  }

  let unlockedThisTick = false;
  for (const node of nodeData) {
    if (node.unlocked || node.id === 0) continue;
    if (node.si >= node.unlockCost) {
      node.unlocked = true;
      unlockedThisTick = true;
      unlockFadeProgress.set(node.id, 0);
      if (statusEl) statusEl.textContent = `${node.name} unlocked!`;
    }
  }

  for (const [nodeId, progress] of unlockFadeProgress.entries()) {
    const next = progress + 1;
    if (next >= UNLOCK_FADE_TICKS) unlockFadeProgress.delete(nodeId);
    else unlockFadeProgress.set(nodeId, next);
  }

  if (nodeData.every((node) => node.id === 0 || node.unlocked)) {
    st.gameWon = true;
    if (statusEl) statusEl.textContent = "Ascension complete! The full sigil is awakened.";
  }

  stepDirectJingRepair(nodeData);
  st.bodyJingPool = Math.min(8000, st.bodyJingPool + 0.35);
  stepRefinementFromSi(nodeData);
  syncEnergyPoolsFromGameplay(nodeData);
  updateClusterRepairDom(nodeData);
  stepPhase29UiSystems();

  // Visibility depends on unlock state; refresh full network immediately
  // when any node unlocks so newly unlocked nodes/edges stay visible.
  if (unlockedThisTick) redrawNetwork();
  else updateNodeUI();
  if (sourceTotalEl) sourceTotalEl.textContent = fmt(sourceNode.si);
  updateBonusSummary();
  updatePhase29Panels();
  if (!st.gameWon && st.tickCounter % 50 === 0) {
    const patternState = attr.resonancePatternReady ? "aligned" : "misaligned";
    if (statusEl) statusEl.textContent = `Resonance ${fmt(st.resonance)} (${patternState}) | Gen ${fmt(generation * TICKS_PER_SECOND)} SI/s`;
  }
}

export function tick() {
  const steps = st.devSpeedEnabled ? st.simSpeedMultiplier : 1;
  for (let i = 0; i < steps; i += 1) {
    if (st.gameWon) break;
    st.tickCounter += 1;
    processTick();
  }
  if (ticksEl) ticksEl.textContent = String(st.tickCounter);
}

export function refreshOpenTooltip() {
  if (st.selectedNodeId < 0) return;
  if (flowPopupEl.classList.contains("hidden")) return;
  if (!st.visibleNodeIds.has(st.selectedNodeId)) { hideFlowPopup(); return; }
  const node = nodeById(st.selectedNodeId);
  const overviewBlock = flowPopupEl.querySelector(".popup-overview") as HTMLElement | null;
  if (!node || !overviewBlock) return;

  const attr = getAttributeState();
  const rates = computeNodeRates(attr);
  const nodeRate = rates[st.selectedNodeId] ?? { in: 0, out: 0, net: 0 };
  const etaSec = node.unlocked
    ? 0
    : ((node.unlockCost - node.si) > 0 && nodeRate.net > 0
      ? (node.unlockCost - node.si) / nodeRate.net / TICKS_PER_SECOND
      : Infinity);
  const info = getCultivationAttributeInfo(node.attributeType);
  const stateKey = getNodeState(node);
  const formatSiPerSec = (v: number) => stateKey === "locked" && v === 0 ? "—" : `${fmt(v)} SI/s`;
  const etaLabel = node.unlocked ? "—" : (Number.isFinite(etaSec) ? formatHumanDuration(etaSec) : "blocked");
  overviewBlock.innerHTML = `
    <div class="popup-section-title">概覽 · Overview</div>
    <div class="popup-keyvals">
      <div data-tooltip="${info.description}"><span>Path</span>${info.name} T${node.attributeTier ?? "-"}</div>
      <div><span>SI</span>${fmt(node.si)} / ${node.unlockCost}</div>
      <div><span>In</span>${formatSiPerSec(nodeRate.in * TICKS_PER_SECOND)}</div>
      <div><span>Out</span>${formatSiPerSec(nodeRate.out * TICKS_PER_SECOND)}</div>
      <div><span>Net</span>${stateKey === "locked" && nodeRate.net === 0 ? "—" : `${fmt(nodeRate.net * TICKS_PER_SECOND)} SI/s`}</div>
      <div><span>時至突破 ETA</span>${etaLabel}</div>
    </div>`;
  attachDomTooltips(overviewBlock);

  const badge = flowPopupEl.querySelector(".state-badge");
  if (badge) {
    const stateMeta = STATE_META[stateKey];
    badge.className = `state-badge state-${stateKey}`;
    badge.textContent = `${stateMeta.char} · ${stateMeta.en}`;
  }
}

export function resetGame() {
  st.tickCounter = 0;
  st.gameWon = false;
  st.resonance = 0;
  st.resonanceBurstTicks = 0;
  st.sunSurgeTicks = 0;
  st.lastSunSurgeTick = 0;
  st.directJingRepairActive = false;
  st.bodyJingPool = 3200;
  const toggle = document.getElementById("directJingToggle") as HTMLInputElement | null;
  if (toggle) toggle.checked = false;
  for (let i = 0; i < nodeData.length; i += 1) {
    const src = initialNodeState[i];
    for (const key of Object.keys(src)) {
      (nodeData[i] as any)[key] = (src as any)[key];
    }
    ensureClusterTier1UiFields(nodeData[i]);
    nodeData[i]._prevSiRefine = nodeData[i].si;
  }
  unlockFadeProgress.clear();
  for (let i = 0; i < edges.length; i += 1) {
    const src = initialEdges[i];
    for (const key of Object.keys(src)) {
      (edges[i] as any)[key] = (src as any)[key];
    }
    ensureMeridianUiFields(edges[i]);
  }
  activeProjections.length = 0;
  initializeTier2Snapshots();
  if (statusEl) statusEl.textContent = "Open all sigil nodes to complete cultivation.";
  if (ticksEl) ticksEl.textContent = "0";
  if (sourceTotalEl) sourceTotalEl.textContent = "0.00";
  st.selectedNodeId = -1;
  hideFlowPopup();
  redrawNetwork();
  updateBonusSummary();
}
