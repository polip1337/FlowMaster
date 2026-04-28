// FlowMaster: textual HUD summary + full network redraw orchestration.

import { TICKS_PER_SECOND, METRIC_TOOLTIPS } from './constants.ts';
import { nodeData, edges, nodePositions } from './config.ts';
import { st, activeProjections, bonusSummaryEl, stateWarningsEl, resonanceChecklistEl, nextActionEl } from './state.ts';
import { computeVisibleNodeIds, nodeById } from './queries.ts';
import { getAttributeState, computeNodeRates } from './mechanics.ts';
import { fmt, formatDuration, fmtPercent } from './utils.ts';
import { attachDomTooltips } from './tooltips.ts';
import { redrawEdge, drawBezierPath } from './edge-render.ts';
import { redrawNode } from './node-render.ts';
import { syncEdgeControls, updateEdgeControlsLayout } from './edge-controls.ts';

export function updateBonusSummary() {
  const attr = getAttributeState();
  const rates = computeNodeRates(attr);
  const coreRate = rates[0] ?? { in: 0, out: 0, net: 0 };
  const projectionSources = nodeData.filter((node) => node.canProject).length;
  const rows: [string, string][] = [
    ["Meridian Efficiency", fmtPercent(attr.flowEfficiency)],
    ["Projection Throughput", fmtPercent(attr.projectionRatePercent)],
    ["Projection Echo", fmtPercent(attr.projectionEcho)],
    ["Body Tempering", fmtPercent(attr.fortitude)],
    ["Dual Harmony", fmtPercent(attr.harmonyPower)],
    ["Core Generation Bonus", fmtPercent(attr.generationPercent)],
    ["Core Generation (Flat)", `${fmt(attr.generationFlatPerTick * TICKS_PER_SECOND)} SI/s`],
    ["Core Net Flux", `${fmt(coreRate.net * TICKS_PER_SECOND)} SI/s`],
    ["Max Projection Bridges", `${attr.maxActiveBridges}`],
    ["Projection Anchors", `${projectionSources}`],
    ["Resonance State", attr.resonanceActive ? "Active" : "Inactive"]
  ];
  if (bonusSummaryEl) {
    bonusSummaryEl.innerHTML = rows.map(([label, value]) => {
      const tip = METRIC_TOOLTIPS[label] ?? "";
      return `<div data-tooltip="${tip}">${label}: <strong>${value}</strong></div>`;
    }).join("");
    attachDomTooltips(bonusSummaryEl as HTMLElement);
  }

  const warnings: string[] = [];
  if (st.sunSurgeTicks > 0) warnings.push(`Sun Surge active (${Math.ceil(st.sunSurgeTicks / TICKS_PER_SECOND)}s)`);
  const earthNode = nodeById(11);
  if (earthNode?.unlocked && earthNode.si > 0 && attr.fortitude < 0.7) warnings.push("Earth Nexus penalty active");
  if (activeProjections.length >= attr.maxActiveBridges) warnings.push("Projection capacity full");
  if (stateWarningsEl) stateWarningsEl.textContent = warnings.length > 0 ? warnings.join(" | ") : "No active penalties.";

  if (resonanceChecklistEl) {
    resonanceChecklistEl.innerHTML = `
      <div>Left Branch: <strong>${fmt(attr.leftPattern)}/24</strong></div>
      <div>Right Branch: <strong>${fmt(attr.rightPattern)}/24</strong></div>
      <div>Inner Triangle: <strong>${fmt(attr.trianglePattern)}/24</strong></div>
      <div>Upper Branch: <strong>${fmt(attr.upperPattern)}/10</strong></div>
    `;
  }

  let best: { node: any; etaSec: number } | null = null;
  for (const node of nodeData) {
    if (node.unlocked || node.id === 0 || !st.visibleNodeIds.has(node.id)) continue;
    const remaining = Math.max(0, node.unlockCost - node.si);
    const rate = Math.max(0, rates[node.id]?.net ?? 0);
    if (rate <= 0) continue;
    const etaSec = remaining / rate / TICKS_PER_SECOND;
    if (!best || etaSec < best.etaSec) best = { node, etaSec };
  }
  if (nextActionEl) {
    nextActionEl.textContent = best
      ? `Feed ${best.node.name} first (ETA ${formatDuration(best.etaSec)} at current routing).`
      : "No reachable unlock with positive net SI. Redirect flows or open projection bridge.";
  }
}

export function redrawNetwork() {
  st.visibleNodeIds = computeVisibleNodeIds();
  syncEdgeControls();
  for (const edge of edges) redrawEdge(edge);
  for (const node of nodeData) redrawNode(node);
  updateEdgeControlsLayout();
  st.projectionHoverGraphic.clear();
  if (st.hoveredProjection) {
    const start = nodePositions[st.hoveredProjection.from];
    const end = nodePositions[st.hoveredProjection.to];
    if (start && end) {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const dist = Math.hypot(dx, dy) || 1;
      const perpX = -dy / dist;
      const perpY = dx / dist;
      const bend = Math.min(38, dist * 0.16);
      const c1 = { x: start.x + dx * 0.28 + perpX * bend, y: start.y + dy * 0.28 + perpY * bend };
      const c2 = { x: start.x + dx * 0.72 + perpX * bend * 0.6, y: start.y + dy * 0.72 + perpY * bend * 0.6 };
      drawBezierPath(st.projectionHoverGraphic, start, c1, c2, end, true, {
        width: 2, color: 0x534ab7, alpha: 0.85, cap: "round"
      });
    }
  }
}

export function updateNodeUI() {
  for (const node of nodeData) redrawNode(node);
}
