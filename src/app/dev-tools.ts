// FlowMaster: developer-mode utilities.

import {
  TIER2_NODES, projectionTransferFactorPerTick, resonanceGainPerTick,
  resonanceDecayPerTick, earthSinkInflowThreshold, earthSinkHardThreshold,
  setProjectionTransferFactorPerTick, setResonanceGainPerTick, setResonanceDecayPerTick,
  setEarthSinkInflowThreshold, setEarthSinkHardThreshold
} from './constants.ts';
import { nodeData, nodePositions, edges, projectionLinks, ensureClusterTier1UiFields } from './config.ts';
import {
  st, flowPopupEl,
  statusEl, devModeToggleEl, devToolsRowEl, devSpeedToggleEl, devSpeedRowEl,
  speed1xEl, speed10xEl, speed100xEl, showAllNodesBtnEl
} from './state.ts';
import { getNextNodeId } from './queries.ts';
import { viewportCenterWorldPoint } from './view.ts';
import { createNodeVisual } from './node-render.ts';
import { createTier2MarkerVisual } from './tier2-markers.ts';
import { redrawNetwork } from './hud.ts';
import { selectNode } from './input.ts';
import { renderFlowPopup, hideFlowPopup } from './flow-popup.ts';
import { updateZoomHud } from './view.ts';
import { devCrackRandomT1, updateClusterRepairDom } from './cluster-view.ts';

export function devSimulateT1Damage() {
  if (!st.developerMode) {
    if (statusEl) statusEl.textContent = "Enable Developer Mode first.";
    return;
  }
  if (!devCrackRandomT1(nodeData)) {
    if (statusEl) statusEl.textContent = "No healthy T1 node to crack — unlock at least one node besides core.";
    return;
  }
  updateClusterRepairDom(nodeData);
  redrawNetwork();
  if (statusEl) statusEl.textContent = "Dev: one T1 node set to cracked (Phase 27 Direct Jing UI).";
}

export function buildNodesJsContent() {
  const nodesOut = nodeData.map((node) => ({ ...node }));
  const positionsOut = Object.fromEntries(
    Object.entries(nodePositions).map(([id, pos]) => [id, { x: Math.round(pos.x), y: Math.round(pos.y) }])
  );
  const edgesOut = edges.map(({ from, to, flow }: any) => ({ from, to, flow }));
  const projectionOut = projectionLinks.map((link: any) => ({ ...link }));
  return `window.NODE_DEFINITIONS = ${JSON.stringify(nodesOut, null, 2)};

window.INITIAL_NODE_POSITIONS = ${JSON.stringify(positionsOut, null, 2)};

window.NODE_EDGES = ${JSON.stringify(edgesOut, null, 2)};

window.PROJECTION_LINKS = ${JSON.stringify(projectionOut, null, 2)};
`;
}

export async function exportShapeConfig() {
  const nodesJsContent = buildNodesJsContent();
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: "nodes.ts",
        types: [{ description: "TypeScript Files", accept: { "text/typescript": [".ts"] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(nodesJsContent);
      await writable.close();
      if (statusEl) statusEl.textContent = "Saved nodes.ts";
      return;
    } catch {
      if (statusEl) statusEl.textContent = "Save cancelled. Falling back to download.";
    }
  }
  const blob = new Blob([nodesJsContent], { type: "text/typescript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "nodes.ts"; a.click();
  URL.revokeObjectURL(url);
  if (statusEl) statusEl.textContent = "Downloaded nodes.ts.";
}

export function buildT2LayoutJsContent() {
  const layout = TIER2_NODES.map((node) => ({
    id: node.id, name: node.name,
    x: Math.round(node.x), y: Math.round(node.y), radius: Math.round(node.radius ?? 16)
  }));
  return `export const TIER2_LAYOUT_OVERRIDE = ${JSON.stringify(layout, null, 2)};\n`;
}

export function addT2NodeInView() {
  if (!st.developerMode) { if (statusEl) statusEl.textContent = "Enable Developer Mode first."; return; }
  if (!st.symbolModeEnabled) { if (statusEl) statusEl.textContent = "Switch to T2 view to add T2 nodes."; return; }
  const name = window.prompt("New T2 node name:", "New T2 Node");
  if (!name) return;
  const id = window.prompt("New T2 node id (unique, no spaces):", name.toLowerCase().replace(/\s+/g, "_"));
  if (!id) return;
  if (TIER2_NODES.some((node) => node.id === id)) {
    if (statusEl) statusEl.textContent = `T2 id "${id}" already exists.`; return;
  }
  const center = viewportCenterWorldPoint();
  const tier2 = { id, name: name.trim(), x: Math.round(center.x), y: Math.round(center.y), radius: 18 };
  TIER2_NODES.push(tier2);
  createTier2MarkerVisual(tier2);
  if (statusEl) statusEl.textContent = `Added T2 node "${tier2.name}" at view center.`;
  updateZoomHud();
}

export async function exportT2LayoutConfig() {
  if (!st.developerMode) { if (statusEl) statusEl.textContent = "Enable Developer Mode first."; return; }
  const content = buildT2LayoutJsContent();
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: "t2-layout.ts",
        types: [{ description: "TypeScript Files", accept: { "text/typescript": [".ts"] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      if (statusEl) statusEl.textContent = "Saved T2 layout override."; return;
    } catch { if (statusEl) statusEl.textContent = "Save cancelled."; }
  }
  const blob = new Blob([content], { type: "text/typescript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "t2-layout.ts"; a.click();
  URL.revokeObjectURL(url);
  if (statusEl) statusEl.textContent = "Downloaded t2-layout.ts.";
}

export function addNodeInView(name: string) {
  const nextId = getNextNodeId();
  const centerWorldX = (st.app.screen.width / 2 - st.world.x) / st.world.scale.x;
  const centerWorldY = (st.app.screen.height / 2 - st.world.y) / st.world.scale.y;
  const node = { id: nextId, name, unlocked: false, si: 0, unlockCost: 100, canProject: false };
  ensureClusterTier1UiFields(node);
  nodeData.push(node);
  nodePositions[nextId] = { x: centerWorldX, y: centerWorldY };
  createNodeVisual(node);
  selectNode(nextId);
  redrawNetwork();
  if (statusEl) statusEl.textContent = `Added node "${name}" (id ${nextId}).`;
}

export async function openNodeEditor() {
  if (!st.developerMode) { if (statusEl) statusEl.textContent = "Enable Developer Mode first."; return; }
  const action = window.prompt('Developer Nodes: type "add" or "rename"', "add");
  if (!action) return;
  const normalized = action.trim().toLowerCase();
  if (normalized === "add") {
    const name = window.prompt("New node name:", "New Meridian");
    if (!name) return;
    addNodeInView(name.trim());
    return;
  }
  if (normalized === "rename") {
    const selected = nodeData.find((n: any) => n.id === st.selectedNodeId);
    if (!selected) { if (statusEl) statusEl.textContent = "Select a node first to rename it."; return; }
    const name = window.prompt("Rename selected node:", selected.name);
    if (!name) return;
    selected.name = name.trim();
    redrawNetwork();
    if (!flowPopupEl.classList.contains("hidden")) renderFlowPopup(st.selectedNodeId);
    if (statusEl) statusEl.textContent = `Renamed node to "${selected.name}".`;
    return;
  }
  if (statusEl) statusEl.textContent = 'Unknown action. Use "add" or "rename".';
}

export function setSimSpeed(multiplier: number) {
  st.simSpeedMultiplier = multiplier;
  speed1xEl?.classList.toggle("active", multiplier === 1);
  speed10xEl?.classList.toggle("active", multiplier === 10);
  speed100xEl?.classList.toggle("active", multiplier === 100);
  if (st.devSpeedEnabled && statusEl) statusEl.textContent = `Dev speed active: ${multiplier}x simulation rate.`;
}

export function setDevSpeedMode(enabled: boolean) {
  st.devSpeedEnabled = enabled;
  if (devSpeedRowEl) devSpeedRowEl.style.display = enabled ? "grid" : "none";
  if (devSpeedToggleEl) devSpeedToggleEl.textContent = enabled ? "Dev Speed: On" : "Dev Speed: Off";
  if (!enabled) st.simSpeedMultiplier = 1;
  setSimSpeed(st.simSpeedMultiplier);
}

export function setShowAllNodesMode(enabled: boolean) {
  st.forceShowAllNodes = enabled;
  if (showAllNodesBtnEl) showAllNodesBtnEl.textContent = enabled ? "Show All Nodes: On" : "Show All Nodes: Off";
  redrawNetwork();
  if (st.selectedNodeId >= 0 && !st.visibleNodeIds.has(st.selectedNodeId)) {
    st.selectedNodeId = -1;
    hideFlowPopup();
  }
  if (statusEl) statusEl.textContent = enabled
    ? "Developer visibility enabled: all nodes are now visible."
    : "Developer visibility disabled: showing only currently reachable nodes.";
}

export function setDeveloperMode(enabled: boolean) {
  st.developerMode = enabled;
  if (devModeToggleEl) devModeToggleEl.textContent = enabled ? "Dev Mode: On" : "Dev Mode: Off";
  if (devToolsRowEl) devToolsRowEl.style.display = enabled ? "grid" : "none";
  if (!enabled) { setDevSpeedMode(false); setShowAllNodesMode(false); }
  if (statusEl) statusEl.textContent = enabled
    ? "Developer mode enabled."
    : "Developer mode disabled.";
}

export function initBalancePane() {
  if (st.balancePane) return;
  if (!window.Tweakpane?.Pane) {
    if (statusEl) statusEl.textContent = "Balance panel unavailable (Tweakpane failed to load)."; return;
  }
  const host = document.getElementById("balancePaneHost");
  st.balancePane = new window.Tweakpane.Pane({ title: "Balance", expanded: true, container: host });
  const params = {
    projectionTransferFactorPerTick,
    resonanceGainPerTick,
    resonanceDecayPerTick,
    earthSinkInflowThreshold,
    earthSinkHardThreshold
  };
  const addPaneBinding = (key: string, options: any, onChange: (v: number) => void) => {
    const add = st.balancePane.addBinding?.bind(st.balancePane) ?? st.balancePane.addInput?.bind(st.balancePane);
    if (!add) return null;
    const input = add(params, key, options);
    input?.on?.("change", (ev: any) => onChange(ev.value));
    return input;
  };
  addPaneBinding("projectionTransferFactorPerTick", { min: 0.000001, max: 0.00002, step: 0.000001 }, setProjectionTransferFactorPerTick);
  addPaneBinding("resonanceGainPerTick", { min: 0.01, max: 0.3, step: 0.005 }, setResonanceGainPerTick);
  addPaneBinding("resonanceDecayPerTick", { min: 0.005, max: 0.2, step: 0.005 }, setResonanceDecayPerTick);
  addPaneBinding("earthSinkInflowThreshold", { min: 0.005, max: 0.2, step: 0.005 }, setEarthSinkInflowThreshold);
  addPaneBinding("earthSinkHardThreshold", { min: 0.01, max: 0.4, step: 0.01 }, setEarthSinkHardThreshold);
}
