// FlowMaster: in-graph controls anchored to connection curves.

import { edges } from './config.ts';
import { TICKS_PER_SECOND } from './constants.ts';
import { st, edgeControlsLayerEl, statusEl } from './state.ts';
import { nodeById } from './queries.ts';
import { getEdgeTransferPerTick } from './mechanics.ts';
import { computeEdgeBezier, cubicBezierPoint, fmt } from './utils.ts';

type ControlRecord = {
  pairKey: string;
  primaryEdge: any;
  reverseEdge: any | null;
  root: HTMLDivElement;
  minimizedValue: HTMLSpanElement;
  slider: HTMLInputElement;
};

const edgeControls = new Map<string, ControlRecord>();
let redrawNetworkFn: (() => void) | null = null;
let flowValueRefreshTimerId: number | null = null;

function scarSeverityLabel(edge: any): string {
  const ratio = Math.max(0, Math.min(1, Number(edge.scarPenalty ?? 0) / 0.25));
  if (ratio <= 0) return "None";
  if (ratio <= 0.34) return "Minor";
  if (ratio <= 0.67) return "Moderate";
  return "Severe";
}

export function bindEdgeControlsRedraw(fn: () => void) {
  redrawNetworkFn = fn;
}

function setHoveredEdge(edgeKey: string | null, toNodeId: number | null) {
  st.hoveredEdgeKey = edgeKey;
  st.hoveredTargetNodeId = toNodeId;
}

function destroyControl(edgeKey: string) {
  const control = edgeControls.get(edgeKey);
  if (!control) return;
  control.root.remove();
  edgeControls.delete(edgeKey);
}

function pairKeyForEdge(edge: any) {
  const low = Math.min(edge.from, edge.to);
  const high = Math.max(edge.from, edge.to);
  return `${low}:${high}`;
}

function reverseEdgeFor(edge: any) {
  return edges.find((candidate) => candidate.from === edge.to && candidate.to === edge.from) ?? null;
}

function signedFlowForPair(primaryEdge: any, reverseEdge: any | null) {
  const primaryFlow = Number(primaryEdge?.flow ?? 0);
  const reverseFlow = Number(reverseEdge?.flow ?? 0);
  return Math.max(-100, Math.min(100, primaryFlow - reverseFlow));
}

function applySignedFlowToPair(signedFlow: number, primaryEdge: any, reverseEdge: any | null) {
  const clamped = Math.max(-100, Math.min(100, Math.round(signedFlow)));
  if (clamped >= 0) {
    primaryEdge.flow = clamped;
    if (reverseEdge) reverseEdge.flow = 0;
    return;
  }
  primaryEdge.flow = 0;
  if (reverseEdge) reverseEdge.flow = Math.abs(clamped);
}

function formatDirectionLabel(signedFlow: number, nodeAName: string, nodeBName: string) {
  if (signedFlow > 0) return `${nodeAName} → ${nodeBName}: ${Math.abs(signedFlow)}%`;
  if (signedFlow < 0) return `${nodeBName} → ${nodeAName}: ${Math.abs(signedFlow)}%`;
  return `${nodeAName} ↔ ${nodeBName}: 0%`;
}

function formatSignedPercent(signedFlow: number) {
  return `${signedFlow}%`;
}

function formatMinimizedValue(primaryEdge: any, reverseEdge: any | null): string {
  const signedFlow = signedFlowForPair(primaryEdge, reverseEdge);
  const activeEdge = signedFlow >= 0 ? primaryEdge : (reverseEdge ?? primaryEdge);
  const transferPerSecond = getEdgeTransferPerTick(activeEdge) * TICKS_PER_SECOND;
  return `${Math.abs(signedFlow)}% ${fmt(transferPerSecond)} SI/s`;
}

function ensureFlowValueRefreshTimer() {
  if (flowValueRefreshTimerId !== null) return;
  flowValueRefreshTimerId = window.setInterval(() => {
    if (edgeControls.size === 0) return;
    for (const control of edgeControls.values()) {
      const signedFlow = signedFlowForPair(control.primaryEdge, control.reverseEdge);
      control.slider.value = String(signedFlow);
      control.minimizedValue.textContent = formatMinimizedValue(control.primaryEdge, control.reverseEdge);
    }
  }, 1000);
}

function createEdgeControl(primaryEdge: any, reverseEdge: any | null) {
  const fromNode = nodeById(primaryEdge.from);
  const toNode = nodeById(primaryEdge.to);
  const fromName = fromNode ? fromNode.name : `Node ${primaryEdge.from}`;
  const toName = toNode ? toNode.name : `Node ${primaryEdge.to}`;
  const pairKey = pairKeyForEdge(primaryEdge);
  const root = document.createElement('div');
  root.className = 'edge-flow-control';
  root.dataset.edgeKey = pairKey;
  const scarEdge =
    (primaryEdge.isScarred && primaryEdge.scarPenalty > 0)
      ? primaryEdge
      : (reverseEdge && reverseEdge.isScarred && reverseEdge.scarPenalty > 0 ? reverseEdge : null);
  if (scarEdge) {
    const healCost = Number(scarEdge.scarHealingCostShen ?? 50000);
    root.title = `Meridian Scar: ${scarSeverityLabel(scarEdge)} (${Math.round(scarEdge.scarPenalty * 100)}%) | Heal cost ${healCost.toLocaleString()} Shen`;
  }

  const head = document.createElement('div');
  head.className = 'edge-flow-head';
  const title = document.createElement('strong');
  title.textContent = `${fromName} \u2194 ${toName}`;
  const minimizedValue = document.createElement('span');
  minimizedValue.className = 'edge-flow-mini-value';
  minimizedValue.textContent = formatMinimizedValue(primaryEdge, reverseEdge);
  head.append(title, minimizedValue);

  const line = document.createElement('div');
  line.className = 'edge-flow-line';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '-100';
  slider.max = '100';
  slider.value = String(signedFlowForPair(primaryEdge, reverseEdge));

  slider.addEventListener('input', (ev) => {
    const signedFlow = Number((ev.target as HTMLInputElement).value);
    applySignedFlowToPair(signedFlow, primaryEdge, reverseEdge);
    minimizedValue.textContent = formatMinimizedValue(primaryEdge, reverseEdge);
    if (statusEl) statusEl.textContent = formatDirectionLabel(signedFlow, fromName, toName);
    if (redrawNetworkFn) redrawNetworkFn();
  });

  root.addEventListener('mouseenter', () => {
    root.classList.add('edge-hovered');
    const signedFlow = Number(slider.value);
    const activeEdge = signedFlow >= 0 ? primaryEdge : (reverseEdge ?? primaryEdge);
    setHoveredEdge(activeEdge.key, activeEdge.to);
    if (redrawNetworkFn) redrawNetworkFn();
  });
  root.addEventListener('mouseleave', () => {
    root.classList.remove('edge-hovered');
    setHoveredEdge(null, null);
    if (redrawNetworkFn) redrawNetworkFn();
  });

  line.append(slider);
  root.append(head, line);
  edgeControlsLayerEl.appendChild(root);
  edgeControls.set(pairKey, { pairKey, primaryEdge, reverseEdge, root, minimizedValue, slider });
}

export function clearEdgeControls() {
  for (const edgeKey of edgeControls.keys()) destroyControl(edgeKey);
  if (edgeControlsLayerEl) edgeControlsLayerEl.innerHTML = '';
}

export function syncEdgeControls() {
  if (!edgeControlsLayerEl) return;
  ensureFlowValueRefreshTimer();
  if (st.symbolModeEnabled) {
    clearEdgeControls();
    return;
  }
  const pairAnchors = new Map<string, any>();
  for (const edge of edges) {
    if (!st.visibleNodeIds.has(edge.from) || !st.visibleNodeIds.has(edge.to)) continue;
    const pairKey = pairKeyForEdge(edge);
    if (pairAnchors.has(pairKey)) continue;
    if (edge.from <= edge.to) {
      pairAnchors.set(pairKey, edge);
      continue;
    }
    const reverseEdge = reverseEdgeFor(edge);
    pairAnchors.set(pairKey, reverseEdge ?? edge);
  }
  const nextKeys = new Set(pairAnchors.keys());

  for (const edgeKey of edgeControls.keys()) {
    if (!nextKeys.has(edgeKey)) destroyControl(edgeKey);
  }
  for (const [pairKey, primaryEdge] of pairAnchors) {
    if (!nextKeys.has(pairKey)) continue;
    const reverseEdge = reverseEdgeFor(primaryEdge);
    const existing = edgeControls.get(pairKey);
    if (!existing) {
      createEdgeControl(primaryEdge, reverseEdge);
      continue;
    }
    // Edge objects are replaced when snapshots/topologies are applied.
    // Recreate the control so slider handlers target current edge objects.
    if (existing.primaryEdge !== primaryEdge || existing.reverseEdge !== reverseEdge) {
      destroyControl(pairKey);
      createEdgeControl(primaryEdge, reverseEdge);
    }
  }
  updateEdgeControlsLayout();
}

export function updateEdgeControlsLayout() {
  if (!edgeControlsLayerEl || edgeControls.size === 0) return;
  for (const control of edgeControls.values()) {
    const edge = control.primaryEdge;
    if (!control) continue;
    const fromVisible = st.visibleNodeIds.has(edge.from);
    const toVisible = st.visibleNodeIds.has(edge.to);
    if (!fromVisible || !toVisible || st.symbolModeEnabled) {
      control.root.style.display = 'none';
      continue;
    }
    const bezier = computeEdgeBezier(edge);
    if (!bezier) {
      control.root.style.display = 'none';
      continue;
    }
    const flowT = 0.58;
    const normalT = 0.54;
    const p = cubicBezierPoint(bezier.start, bezier.c1, bezier.c2, bezier.end, flowT);
    const p2 = cubicBezierPoint(bezier.start, bezier.c1, bezier.c2, bezier.end, normalT);
    const tangentX = p.x - p2.x;
    const tangentY = p.y - p2.y;
    const tangentLen = Math.hypot(tangentX, tangentY) || 1;
    const nx = -tangentY / tangentLen;
    const ny = tangentX / tangentLen;
    const offset = 18;
    const worldX = p.x + nx * offset;
    const worldY = p.y + ny * offset;
    const screenX = worldX * st.world.scale.x + st.world.x;
    const screenY = worldY * st.world.scale.y + st.world.y;
    const inBounds =
      screenX >= -80 &&
      screenX <= st.app.screen.width + 80 &&
      screenY >= -40 &&
      screenY <= st.app.screen.height + 40;
    if (!inBounds) {
      control.root.style.display = 'none';
      continue;
    }
    const expanded =
      st.hoveredEdgeKey === edge.key ||
      (control.reverseEdge != null && st.hoveredEdgeKey === control.reverseEdge.key) ||
      edge.from === st.selectedNodeId ||
      edge.to === st.selectedNodeId;
    control.root.classList.toggle('edge-flow-expanded', expanded);
    const signedFlow = signedFlowForPair(control.primaryEdge, control.reverseEdge);
    control.slider.value = String(signedFlow);
    control.minimizedValue.textContent = formatMinimizedValue(control.primaryEdge, control.reverseEdge);
    control.root.style.display = 'grid';
    control.root.style.left = `${Math.round(screenX)}px`;
    control.root.style.top = `${Math.round(screenY)}px`;
  }
}
