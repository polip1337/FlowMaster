// FlowMaster: per-node popup overlay — overview, stat rows, flow sliders,
// projection bridge targets, and (in dev mode) connection/bridge toggles.

function hideFlowPopup() {
  flowPopupEl.classList.add("hidden");
  flowPopupEl.innerHTML = "";
  hideMarkerTooltip();
  hoveredTargetNodeId = null;
  hoveredEdgeKey = null;
  hoveredProjection = null;
  redrawNetwork();
}

function updateFlowPopupPosition() {
  if (flowPopupEl.classList.contains("hidden")) return;
  if (!visibleNodeIds.has(selectedNodeId)) {
    hideFlowPopup();
    return;
  }
  const nodePos = nodePositions[selectedNodeId];
  if (!nodePos) return;

  const panelWidth = flowPopupEl.offsetWidth || 210;
  const panelHeight = flowPopupEl.offsetHeight || 140;
  const padding = 8;
  const anchorX = nodePos.x + world.x;
  const anchorY = nodePos.y + world.y;
  const isAnchorVisible =
    anchorX >= 0 && anchorX <= app.screen.width &&
    anchorY >= 0 && anchorY <= app.screen.height;

  if (!isAnchorVisible) {
    flowPopupEl.style.left = `${lastPopupLeft}px`;
    flowPopupEl.style.top = `${lastPopupTop}px`;
    return;
  }

  const nodeRadius = 52;
  const sideGap = nodeRadius + 14;
  const verticalGap = nodeRadius + 10;

  // Candidate placements in order of preference.
  const candidates = [
    { left: anchorX + sideGap, top: anchorY - panelHeight / 2 }, // right
    { left: anchorX - panelWidth - sideGap, top: anchorY - panelHeight / 2 }, // left
    { left: anchorX - panelWidth / 2, top: anchorY - panelHeight - verticalGap }, // above
    { left: anchorX - panelWidth / 2, top: anchorY + verticalGap } // below
  ];

  function clampPosition(pos) {
    return {
      left: Math.max(padding, Math.min(pos.left, app.screen.width - panelWidth - padding)),
      top: Math.max(padding, Math.min(pos.top, app.screen.height - panelHeight - padding))
    };
  }

  function overlapsNode(pos) {
    const nodeLeft = anchorX - nodeRadius;
    const nodeRight = anchorX + nodeRadius;
    const nodeTop = anchorY - nodeRadius;
    const nodeBottom = anchorY + nodeRadius;
    const popupLeft = pos.left;
    const popupRight = pos.left + panelWidth;
    const popupTop = pos.top;
    const popupBottom = pos.top + panelHeight;
    return !(popupRight < nodeLeft || popupLeft > nodeRight || popupBottom < nodeTop || popupTop > nodeBottom);
  }

  let chosen = null;
  for (const candidate of candidates) {
    const clamped = clampPosition(candidate);
    if (!overlapsNode(clamped)) {
      chosen = clamped;
      break;
    }
  }
  if (!chosen) {
    // Fallback with strongest side bias.
    chosen = clampPosition({ left: anchorX + sideGap, top: anchorY - panelHeight / 2 });
  }

  const left = chosen.left;
  const top = chosen.top;
  lastPopupLeft = Math.round(left);
  lastPopupTop = Math.round(top);
  flowPopupEl.style.left = `${lastPopupLeft}px`;
  flowPopupEl.style.top = `${lastPopupTop}px`;
}

function renderStatRowsHTML(node, state) {
  const levels = getNodeStatLevels(node);
  const rows = [];
  for (const stat of STAT_ORDER) {
    const value = levels[stat];
    const display = state === "locked" ? "—" : `${Math.round(value * 100)}%`;
    rows.push(`
      <div class="stat-row">
        <span class="stat-dot" style="background:${STAT_COLOR_CSS[stat]}"></span>
        <span class="stat-char" style="color:${STAT_COLOR_CSS[stat]}">${STAT_CHAR[stat]}</span>
        <span class="stat-name">${stat}</span>
        <span class="stat-value">${display}</span>
      </div>
    `);
  }
  return rows.join("");
}

function renderFlowPopup(nodeId) {
  const node = nodeById(nodeId);
  const outgoing = outgoingEdges(nodeId);
  if (!node) {
    hideFlowPopup();
    return;
  }

  flowPopupEl.innerHTML = "";

  const stateKey = getNodeState(node);
  const stateMeta = STATE_META[stateKey];

  const title = document.createElement("div");
  title.className = "flow-popup-title";
  title.innerHTML = `
    <span>${node.name}</span>
    <span class="state-badge state-${stateKey}">${stateMeta.char} · ${stateMeta.en}</span>
  `;
  flowPopupEl.appendChild(title);

  const attr = getAttributeState();
  const rates = computeNodeRates(attr);
  const nodeRate = rates[nodeId] ?? { in: 0, out: 0, net: 0 };
  const etaSec =
    node.unlocked
      ? 0
      : ((node.unlockCost - node.si) > 0 && nodeRate.net > 0
        ? (node.unlockCost - node.si) / nodeRate.net / TICKS_PER_SECOND
        : Infinity);

  const formatSiPerSec = (value) => stateKey === "locked" && value === 0 ? "—" : `${fmt(value)} SI/s`;
  const etaLabel = node.unlocked
    ? "—"
    : Number.isFinite(etaSec)
      ? formatHumanDuration(etaSec)
      : "blocked";

  const attrInfo = getCultivationAttributeInfo(node.attributeType);
  const overviewBlock = document.createElement("div");
  overviewBlock.className = "popup-section popup-overview";
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
  flowPopupEl.appendChild(overviewBlock);
  attachDomTooltips(overviewBlock);

  const statBlock = document.createElement("div");
  statBlock.className = "popup-section";
  statBlock.innerHTML = `
    <div class="popup-section-title">屬性 · Stats</div>
    ${renderStatRowsHTML(node, stateKey)}
  `;
  flowPopupEl.appendChild(statBlock);

  const bonusBlock = document.createElement("div");
  bonusBlock.className = "popup-section";
  bonusBlock.innerHTML = `
    <div class="popup-section-title">增益 · Bonuses</div>
    <div class="flow-label">${stateKey === "locked" ? "—" : formatNodeBonuses(node)}</div>
  `;
  flowPopupEl.appendChild(bonusBlock);

  if (!node.unlocked) {
    const pathBlock = document.createElement("div");
    pathBlock.className = "popup-section";
    const blocking = findBlockingUpstreamNode(nodeId);
    const hintName = blocking ? blocking.name : "an upstream meridian";
    const hintText = blocking
      ? (blocking.unlocked
        ? `Feed ${blocking.name} to raise its flow share.`
        : `Break through ${blocking.name} first to open this channel.`)
      : "No upstream meridian is feeding this node yet.";
    pathBlock.innerHTML = `
      <div class="popup-section-title">通關之路 · Path to Unlock</div>
      <div class="path-to-unlock">${hintName} — ${hintText}</div>
    `;
    flowPopupEl.appendChild(pathBlock);
  } else {
    const flowSection = document.createElement("div");
    flowSection.className = "popup-section";
    flowSection.innerHTML = `<div class="popup-section-title">導引 · Flow Controls</div>`;

    for (const edge of outgoing) {
      const toNode = nodeById(edge.to);
      const row = document.createElement("div");
      row.className = "flow-row";

      const label = document.createElement("div");
      label.className = "flow-label";
      label.textContent = `→ ${toNode ? toNode.name : `Node ${edge.to}`}`;

      const sliderLine = document.createElement("div");
      sliderLine.className = "flow-slider-line";
      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = "0";
      slider.max = "100";
      slider.value = String(edge.flow);

      const value = document.createElement("span");
      value.textContent = `${edge.flow}%`;

      slider.addEventListener("input", (event) => {
        edge.flow = Number(event.target.value);
        value.textContent = `${edge.flow}%`;
        statusEl.textContent = `${node.name} → ${toNode ? toNode.name : edge.to}: ${edge.flow}%`;
        redrawNetwork();
      });
      row.addEventListener("mouseenter", () => {
        hoveredEdgeKey = edge.key;
        hoveredTargetNodeId = edge.to;
        hoveredProjection = null;
        redrawNetwork();
      });
      row.addEventListener("mouseleave", () => {
        hoveredEdgeKey = null;
        hoveredTargetNodeId = null;
        redrawNetwork();
      });

      sliderLine.append(slider, value);
      row.append(label, sliderLine);
      flowSection.appendChild(row);
    }
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
            statusEl.textContent = `${node.name} projecting to ${target.name}.`;
            renderFlowPopup(nodeId);
          });
          btn.addEventListener("mouseenter", () => {
            hoveredEdgeKey = null;
            hoveredTargetNodeId = target.id;
            hoveredProjection = { from: nodeId, to: target.id };
            redrawNetwork();
          });
          btn.addEventListener("mouseleave", () => {
            hoveredTargetNodeId = null;
            hoveredProjection = null;
            redrawNetwork();
          });
          projectionList.appendChild(btn);
        }
      }
      projectionSection.appendChild(projectionList);

      const outgoingTotalFlow = outgoing.reduce((sum, edge) => sum + edge.flow, 0);
      const activeCount = activeProjections.filter((projection) => projection.from === nodeId).length;
      const projectionInfo = document.createElement("div");
      projectionInfo.className = "projection-active";
      projectionInfo.textContent = `Outflow ${outgoingTotalFlow}% · Active bridges ${activeCount}`;
      projectionSection.appendChild(projectionInfo);
      flowPopupEl.appendChild(projectionSection);
    }
  }

  if (developerMode) {
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
      const label = document.createElement("div");
      label.className = "flow-label";
      label.textContent = target.name;
      const exists = Boolean(edgeBetween(nodeId, target.id));
      const btn = document.createElement("button");
      btn.className = "dev-btn";
      btn.textContent = exists ? "Disconnect" : "Connect";
      btn.addEventListener("click", () => {
        toggleConnection(nodeId, target.id);
        renderFlowPopup(nodeId);
        redrawNetwork();
      });
      row.append(label, btn);
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
      const label = document.createElement("div");
      label.className = "flow-label";
      label.textContent = target.name;
      const exists = projectionLinks.some((link) => link.from === nodeId && link.to === target.id);
      const btn = document.createElement("button");
      btn.className = "dev-btn";
      btn.textContent = exists ? "Unbridge" : "Bridge";
      btn.addEventListener("click", () => {
        toggleProjectionBridge(nodeId, target.id);
        renderFlowPopup(nodeId);
        redrawNetwork();
      });
      row.append(label, btn);
      bridgeList.appendChild(row);
    }
    flowPopupEl.appendChild(bridgeList);
  }

  flowPopupEl.classList.remove("hidden");
  updateFlowPopupPosition();
}
