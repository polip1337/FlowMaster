// FlowMaster: in-graph controls anchored to connection curves.

import { edges } from './config.ts';
import { st, edgeControlsLayerEl, statusEl } from './state.ts';
import { nodeById } from './queries.ts';
import { computeEdgeBezier, cubicBezierPoint } from './utils.ts';

type ControlRecord = {
  edgeKey: string;
  root: HTMLDivElement;
  value: HTMLSpanElement;
};

const edgeControls = new Map<string, ControlRecord>();
let redrawNetworkFn: (() => void) | null = null;

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

function createEdgeControl(edge: any, sourceName: string) {
  const target = nodeById(edge.to);
  const root = document.createElement('div');
  root.className = 'edge-flow-control';
  root.dataset.edgeKey = edge.key;
  if (edge.isScarred && edge.scarPenalty > 0) {
    const healCost = Number(edge.scarHealingCostShen ?? 50000);
    root.title = `Meridian Scar: ${scarSeverityLabel(edge)} (${Math.round(edge.scarPenalty * 100)}%) | Heal cost ${healCost.toLocaleString()} Shen`;
  }

  const head = document.createElement('div');
  head.className = 'edge-flow-head';
  head.innerHTML = `<strong>${target ? target.name : `Node ${edge.to}`}</strong><span>${sourceName} \u2192</span>`;

  const line = document.createElement('div');
  line.className = 'edge-flow-line';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.value = String(edge.flow);

  const value = document.createElement('span');
  value.className = 'edge-flow-value';
  value.textContent = `${edge.flow}%`;

  slider.addEventListener('input', (ev) => {
    edge.flow = Number((ev.target as HTMLInputElement).value);
    value.textContent = `${edge.flow}%`;
    if (statusEl) statusEl.textContent = `${sourceName} \u2192 ${target ? target.name : edge.to}: ${edge.flow}%`;
    if (redrawNetworkFn) redrawNetworkFn();
  });

  root.addEventListener('mouseenter', () => {
    root.classList.add('edge-hovered');
    setHoveredEdge(edge.key, edge.to);
    if (redrawNetworkFn) redrawNetworkFn();
  });
  root.addEventListener('mouseleave', () => {
    root.classList.remove('edge-hovered');
    setHoveredEdge(null, null);
    if (redrawNetworkFn) redrawNetworkFn();
  });

  line.append(slider, value);
  root.append(head, line);
  edgeControlsLayerEl.appendChild(root);
  edgeControls.set(edge.key, { edgeKey: edge.key, root, value });
}

export function clearEdgeControls() {
  for (const edgeKey of edgeControls.keys()) destroyControl(edgeKey);
  if (edgeControlsLayerEl) edgeControlsLayerEl.innerHTML = '';
}

export function syncEdgeControls() {
  if (!edgeControlsLayerEl) return;
  if (st.symbolModeEnabled) {
    clearEdgeControls();
    return;
  }
  const nextKeys = new Set(
    edges
      .filter((edge) => st.visibleNodeIds.has(edge.from) && st.visibleNodeIds.has(edge.to))
      .map((edge) => edge.key)
  );

  for (const edgeKey of edgeControls.keys()) {
    if (!nextKeys.has(edgeKey)) destroyControl(edgeKey);
  }
  for (const edge of edges) {
    if (!nextKeys.has(edge.key) || edgeControls.has(edge.key)) continue;
    const fromNode = nodeById(edge.from);
    createEdgeControl(edge, fromNode ? fromNode.name : `Node ${edge.from}`);
  }
  updateEdgeControlsLayout();
}

export function updateEdgeControlsLayout() {
  if (!edgeControlsLayerEl || edgeControls.size === 0) return;
  for (const edge of edges) {
    const control = edgeControls.get(edge.key);
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
      edge.from === st.selectedNodeId ||
      edge.to === st.selectedNodeId;
    control.root.classList.toggle('edge-flow-expanded', expanded);
    control.value.textContent = `${edge.flow}%`;
    control.root.style.display = 'grid';
    control.root.style.left = `${Math.round(screenX)}px`;
    control.root.style.top = `${Math.round(screenY)}px`;
  }
}
