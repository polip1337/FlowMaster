// FlowMaster: per-node popup overlay.
// Circular dep note: input.ts imports renderFlowPopup/hideFlowPopup from here,
// and we call toggleConnection from input.ts — resolved via bindToggleConnection.

import { STATE_META, STAT_ORDER, STAT_COLOR_CSS, STAT_CHAR, TICKS_PER_SECOND } from './constants.ts';
import { nodeData, edges, nodePositions, projectionLinks } from './config.ts';
import { activeProjections } from './state.ts';
import { st, flowPopupEl, statusEl } from './state.ts';
import {
  nodeById, outgoingEdges, getNodeState, getNodeStatLevels,
  findBlockingUpstreamNode, edgeBetween, getCultivationAttributeInfo
} from './queries.ts';
import { getAttributeState, computeNodeRates, formatNodeBonuses } from './mechanics.ts';
import { fmt, formatHumanDuration } from './utils.ts';
import { attachDomTooltips, hideMarkerTooltip } from './tooltips.ts';
import { candidateProjectionTargets, activateProjection, toggleProjectionBridge } from './projections.ts';
import { redrawNetwork } from './hud.ts';
import { updateEdgeControlsLayout } from './edge-controls.ts';

// toggleConnection lives in input.ts — bound at bootstrap time to break the cycle
let _toggleConnection: ((from: number, to: number) => void) | null = null;
export function bindToggleConnection(fn: (from: number, to: number) => void) {
  _toggleConnection = fn;
}

export function hideFlowPopup() {
  flowPopupEl.classList.add("hidden");
  flowPopupEl.innerHTML = "";
  hideMarkerTooltip();
  st.hoveredTargetNodeId = null;
  st.hoveredEdgeKey = null;
  st.hoveredProjection = null;
  redrawNetwork();
}

export function updateFlowPopupPosition() {
  updateEdgeControlsLayout();
  if (flowPopupEl.classList.contains("hidden")) return;
  if (!st.visibleNodeIds.has(st.selectedNodeId)) { hideFlowPopup(); return; }
  const nodePos = nodePositions[st.selectedNodeId];
  if (!nodePos) return;

  const panelWidth = flowPopupEl.offsetWidth || 210;
  const panelHeight = flowPopupEl.offsetHeight || 140;
  const padding = 8;
  const anchorX = nodePos.x + st.world.x;
  const anchorY = nodePos.y + st.world.y;
  const isAnchorVisible =
    anchorX >= 0 && anchorX <= st.app.screen.width &&
    anchorY >= 0 && anchorY <= st.app.screen.height;

  if (!isAnchorVisible) {
    flowPopupEl.style.left = `${st.lastPopupLeft}px`;
    flowPopupEl.style.top = `${st.lastPopupTop}px`;
    return;
  }

  const nodeRadius = 52;
  const sideGap = nodeRadius + 14;
  const verticalGap = nodeRadius + 10;
  const candidates = [
    { left: anchorX + sideGap, top: anchorY - panelHeight / 2 },
    { left: anchorX - panelWidth - sideGap, top: anchorY - panelHeight / 2 },
    { left: anchorX - panelWidth / 2, top: anchorY - panelHeight - verticalGap },
    { left: anchorX - panelWidth / 2, top: anchorY + verticalGap }
  ];

  function clampPos(pos: { left: number; top: number }) {
    return {
      left: Math.max(padding, Math.min(pos.left, st.app.screen.width - panelWidth - padding)),
      top: Math.max(padding, Math.min(pos.top, st.app.screen.height - panelHeight - padding))
    };
  }
  function overlapsNode(pos: { left: number; top: number }) {
    const pl = pos.left; const pr = pos.left + panelWidth;
    const pt = pos.top; const pb = pos.top + panelHeight;
    return !(pr < anchorX - nodeRadius || pl > anchorX + nodeRadius || pb < anchorY - nodeRadius || pt > anchorY + nodeRadius);
  }

  let chosen = null;
  for (const c of candidates) {
    const cl = clampPos(c);
    if (!overlapsNode(cl)) { chosen = cl; break; }
  }
  if (!chosen) chosen = clampPos({ left: anchorX + sideGap, top: anchorY - panelHeight / 2 });

  st.lastPopupLeft = Math.round(chosen.left);
  st.lastPopupTop = Math.round(chosen.top);
  flowPopupEl.style.left = `${st.lastPopupLeft}px`;
  flowPopupEl.style.top = `${st.lastPopupTop}px`;
}

function renderStatRowsHTML(node: any, state: string) {
  const levels = getNodeStatLevels(node);
  return STAT_ORDER.map((stat) => {
    const value = levels[stat];
    const display = state === "locked" ? "—" : `${Math.round(value * 100)}%`;
    return `
      <div class="stat-row">
        <span class="stat-dot" style="background:${STAT_COLOR_CSS[stat]}"></span>
        <span class="stat-char" style="color:${STAT_COLOR_CSS[stat]}">${STAT_CHAR[stat]}</span>
        <span class="stat-name">${stat}</span>
        <span class="stat-value">${display}</span>
      </div>`;
  }).join("");
}

export function renderFlowPopup(nodeId: number) {
  const node = nodeById(nodeId);
  const outgoing = outgoingEdges(nodeId);
  if (!node) { hideFlowPopup(); return; }

  flowPopupEl.innerHTML = "";
  const stateKey = getNodeState(node);
  const stateMeta = STATE_META[stateKey];

  const title = document.createElement("div");
  title.className = "flow-popup-title";
  title.innerHTML = `<span>${node.name}</span><span class="state-badge state-${stateKey}">${stateMeta.char} · ${stateMeta.en}</span>`;
  flowPopupEl.appendChild(title);

  const attr = getAttributeState();
  const rates = computeNodeRates(attr);
  const nodeRate = rates[nodeId] ?? { in: 0, out: 0, net: 0 };
  const etaSec = node.unlocked
    ? 0
    : ((node.unlockCost - node.si) > 0 && nodeRate.net > 0
      ? (node.unlockCost - node.si) / nodeRate.net / TICKS_PER_SECOND
      : Infinity);
  const formatSiPerSec = (v: number) => stateKey === "locked" && v === 0 ? "—" : `${fmt(v)} SI/s`;
  const etaLabel = node.unlocked ? "—" : (Number.isFinite(etaSec) ? formatHumanDuration(etaSec) : "blocked");
  const info = getCultivationAttributeInfo(node.attributeType);

  const overviewBlock = document.createElement("div");
  overviewBlock.className = "popup-section popup-overview";
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
  flowPopupEl.appendChild(overviewBlock);
  attachDomTooltips(overviewBlock);

  const statBlock = document.createElement("div");
  statBlock.className = "popup-section";
  statBlock.innerHTML = `<div class="popup-section-title">屬性 · Stats</div>${renderStatRowsHTML(node, stateKey)}`;
  flowPopupEl.appendChild(statBlock);

  const bonusBlock = document.createElement("div");
  bonusBlock.className = "popup-section";
  bonusBlock.innerHTML = `<div class="popup-section-title">增益 · Bonuses</div><div class="flow-label">${stateKey === "locked" ? "—" : formatNodeBonuses(node)}</div>`;
  flowPopupEl.appendChild(bonusBlock);

  if (!node.unlocked) {
    const pathBlock = document.createElement("div");
    pathBlock.className = "popup-section";
    const blocking = findBlockingUpstreamNode(nodeId);
    const hintName = blocking ? blocking.name : "an upstream meridian";
    const hintText = blocking
      ? (blocking.unlocked ? `Feed ${blocking.name} to raise its flow share.` : `Break through ${blocking.name} first to open this channel.`)
      : "No upstream meridian is feeding this node yet.";
    pathBlock.innerHTML = `<div class="popup-section-title">通關之路 · Path to Unlock</div><div class="path-to-unlock">${hintName} — ${hintText}</div>`;
    flowPopupEl.appendChild(pathBlock);
  } else {
    const flowSection = document.createElement("div");
    flowSection.className = "popup-section";
    flowSection.innerHTML = `<div class="popup-section-title">導引 · Flow Routing</div><div class="flow-label">Routing controls are always visible on the channels. Hover or select a channel to expand its slider.</div>`;
    flowPopupEl.appendChild(flowSection);

    if (node.canProject) {
      const projectionSection = document.createElement("div");
      projectionSection.className = "popup-section";
      projectionSection.innerHTML = `<div class="popup-section-title">投射 · Qi Projection Bridge</div>`;
      const projectionList = document.createElement("div");
      projectionList.className = "projection-list";
      const targets = candidateProjectionTargets(nodeId);
      if (targets.length === 0) {
        const none = document.createElement("div");
        none.className = "flow-label";
        none.textContent = "No valid projection targets.";
        projectionList.appendChild(none);
      } else {
        for (const target of targets) {
          const btn = document.createElement("button");
          btn.className = "projection-btn";
          btn.textContent = `→ ${target.name}`;
          btn.addEventListener("click", () => {
            activateProjection(nodeId, target.id);
            if (statusEl) statusEl.textContent = `${node.name} projecting to ${target.name}.`;
            renderFlowPopup(nodeId);
          });
          btn.addEventListener("mouseenter", () => {
            st.hoveredEdgeKey = null; st.hoveredTargetNodeId = target.id;
            st.hoveredProjection = { from: nodeId, to: target.id }; redrawNetwork();
          });
          btn.addEventListener("mouseleave", () => {
            st.hoveredTargetNodeId = null; st.hoveredProjection = null; redrawNetwork();
          });
          projectionList.appendChild(btn);
        }
      }
      projectionSection.appendChild(projectionList);
      const outgoingTotalFlow = outgoing.reduce((sum, edge) => sum + edge.flow, 0);
      const activeCount = activeProjections.filter((p) => p.from === nodeId).length;
      const projectionInfo = document.createElement("div");
      projectionInfo.className = "projection-active";
      projectionInfo.textContent = `Outflow ${outgoingTotalFlow}% · Active bridges ${activeCount}`;
      projectionSection.appendChild(projectionInfo);
      flowPopupEl.appendChild(projectionSection);
    }
  }

  if (st.developerMode) {
    const devTitle = document.createElement("div");
    devTitle.className = "dev-title";
    devTitle.textContent = "Developer: Connections";
    flowPopupEl.appendChild(devTitle);
    const devList = document.createElement("div");
    devList.className = "dev-list";
    for (const target of nodeData) {
      if (target.id === nodeId) continue;
      const row = document.createElement("div");
      row.className = "dev-row";
      const lbl = document.createElement("div");
      lbl.className = "flow-label";
      lbl.textContent = target.name;
      const exists = Boolean(edgeBetween(nodeId, target.id));
      const btn = document.createElement("button");
      btn.className = "dev-btn";
      btn.textContent = exists ? "Disconnect" : "Connect";
      btn.addEventListener("click", () => {
        if (_toggleConnection) _toggleConnection(nodeId, target.id);
        renderFlowPopup(nodeId);
        redrawNetwork();
      });
      row.append(lbl, btn);
      devList.appendChild(row);
    }
    flowPopupEl.appendChild(devList);

    const bridgeTitle = document.createElement("div");
    bridgeTitle.className = "dev-title";
    bridgeTitle.textContent = "Developer: Projection Bridges";
    flowPopupEl.appendChild(bridgeTitle);
    const bridgeList = document.createElement("div");
    bridgeList.className = "dev-list";
    for (const target of nodeData) {
      if (target.id === nodeId) continue;
      const row = document.createElement("div");
      row.className = "dev-row";
      const lbl = document.createElement("div");
      lbl.className = "flow-label";
      lbl.textContent = target.name;
      const exists = projectionLinks.some((link) => link.from === nodeId && link.to === target.id);
      const btn = document.createElement("button");
      btn.className = "dev-btn";
      btn.textContent = exists ? "Unbridge" : "Bridge";
      btn.addEventListener("click", () => {
        toggleProjectionBridge(nodeId, target.id);
        renderFlowPopup(nodeId);
        redrawNetwork();
      });
      row.append(lbl, btn);
      bridgeList.appendChild(row);
    }
    flowPopupEl.appendChild(bridgeList);
  }

  flowPopupEl.classList.remove("hidden");
  updateFlowPopupPosition();
}
