// FlowMaster: developer-mode utilities — node/T2 authoring, layout export,
// sim-speed controls, visibility toggles, and Tweakpane balance panel.

function buildNodesJsContent() {
  const nodesOut = nodeData.map((node) => ({ ...node }));
  const positionsOut = Object.fromEntries(
    Object.entries(nodePositions).map(([id, pos]) => [id, { x: Math.round(pos.x), y: Math.round(pos.y) }])
  );
  const edgesOut = edges.map(({ from, to, flow }) => ({ from, to, flow }));
  const projectionOut = projectionLinks.map((link) => ({ ...link }));
  return `window.NODE_DEFINITIONS = ${JSON.stringify(nodesOut, null, 2)};

window.INITIAL_NODE_POSITIONS = ${JSON.stringify(positionsOut, null, 2)};

window.NODE_EDGES = ${JSON.stringify(edgesOut, null, 2)};

window.PROJECTION_LINKS = ${JSON.stringify(projectionOut, null, 2)};
`;
}

async function exportShapeConfig() {
  const nodesJsContent = buildNodesJsContent();
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: "nodes.js",
        types: [
          {
            description: "JavaScript Files",
            accept: { "text/javascript": [".js"] }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(nodesJsContent);
      await writable.close();
      statusEl.textContent = "Saved and replaced nodes.js";
      return;
    } catch (error) {
      statusEl.textContent = "Save cancelled. Falling back to download.";
    }
  }

  const blob = new Blob([nodesJsContent], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "nodes.js";
  a.click();
  URL.revokeObjectURL(url);
  statusEl.textContent = "Downloaded nodes.js (replace project file manually if needed).";
}

function buildT2LayoutJsContent() {
  const layout = TIER2_NODES.map((node) => ({
    id: node.id,
    name: node.name,
    x: Math.round(node.x),
    y: Math.round(node.y),
    radius: Math.round(node.radius ?? 16)
  }));
  return `window.TIER2_LAYOUT_OVERRIDE = ${JSON.stringify(layout, null, 2)};
`;
}

function addT2NodeInView() {
  if (!developerMode) {
    statusEl.textContent = "Enable Developer Mode first.";
    return;
  }
  if (!symbolModeEnabled) {
    statusEl.textContent = "Switch to T2 view to add T2 nodes.";
    return;
  }
  const name = window.prompt("New T2 node name:", "New T2 Node");
  if (!name) return;
  const id = window.prompt("New T2 node id (unique, no spaces):", name.toLowerCase().replace(/\s+/g, "_"));
  if (!id) return;
  if (TIER2_NODES.some((node) => node.id === id)) {
    statusEl.textContent = `T2 id "${id}" already exists.`;
    return;
  }
  const center = viewportCenterWorldPoint();
  const tier2 = {
    id,
    name: name.trim(),
    x: Math.round(center.x),
    y: Math.round(center.y),
    radius: 18
  };
  TIER2_NODES.push(tier2);
  createTier2MarkerVisual(tier2);
  statusEl.textContent = `Added T2 node "${tier2.name}" at view center.`;
  updateZoomHud();
}

async function exportT2LayoutConfig() {
  if (!developerMode) {
    statusEl.textContent = "Enable Developer Mode first.";
    return;
  }
  const content = buildT2LayoutJsContent();
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: "t2-layout.js",
        types: [
          {
            description: "JavaScript Files",
            accept: { "text/javascript": [".js"] }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      statusEl.textContent = "Saved T2 layout override.";
      return;
    } catch {
      statusEl.textContent = "Save cancelled. Falling back to download.";
    }
  }
  const blob = new Blob([content], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "t2-layout.js";
  a.click();
  URL.revokeObjectURL(url);
  statusEl.textContent = "Downloaded t2-layout.js (include it before app.js to apply).";
}

function addNodeInView(name) {
  const nextId = getNextNodeId();
  const centerWorldX = (app.screen.width / 2 - world.x) / world.scale.x;
  const centerWorldY = (app.screen.height / 2 - world.y) / world.scale.y;
  const node = {
    id: nextId,
    name,
    unlocked: false,
    si: 0,
    unlockCost: 100,
    canProject: false
  };
  nodeData.push(node);
  nodePositions[nextId] = { x: centerWorldX, y: centerWorldY };
  createNodeVisual(node);
  selectNode(nextId);
  redrawNetwork();
  statusEl.textContent = `Added node "${name}" (id ${nextId}).`;
}

function openNodeEditor() {
  if (!developerMode) {
    statusEl.textContent = "Enable Developer Mode first.";
    return;
  }

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
    const selected = nodeById(selectedNodeId);
    if (!selected) {
      statusEl.textContent = "Select a node first to rename it.";
      return;
    }
    const name = window.prompt("Rename selected node:", selected.name);
    if (!name) return;
    selected.name = name.trim();
    redrawNetwork();
    if (!flowPopupEl.classList.contains("hidden")) {
      renderFlowPopup(selectedNodeId);
    }
    statusEl.textContent = `Renamed node to "${selected.name}".`;
    return;
  }

  statusEl.textContent = 'Unknown action. Use "add" or "rename".';
}

function setSimSpeed(multiplier) {
  simSpeedMultiplier = multiplier;
  speed1xEl.classList.toggle("active", multiplier === 1);
  speed10xEl.classList.toggle("active", multiplier === 10);
  speed100xEl.classList.toggle("active", multiplier === 100);
  if (devSpeedEnabled) {
    statusEl.textContent = `Dev speed active: ${multiplier}x simulation rate.`;
  }
}

function setDevSpeedMode(enabled) {
  devSpeedEnabled = enabled;
  devSpeedRowEl.style.display = enabled ? "grid" : "none";
  devSpeedToggleEl.textContent = enabled ? "Dev Speed: On" : "Dev Speed: Off";
  if (!enabled) {
    simSpeedMultiplier = 1;
  }
  setSimSpeed(simSpeedMultiplier);
}

function setShowAllNodesMode(enabled) {
  forceShowAllNodes = enabled;
  showAllNodesBtnEl.textContent = enabled ? "Show All Nodes: On" : "Show All Nodes: Off";
  redrawNetwork();
  if (selectedNodeId >= 0 && !visibleNodeIds.has(selectedNodeId)) {
    selectedNodeId = -1;
    hideFlowPopup();
  }
  statusEl.textContent = enabled
    ? "Developer visibility enabled: all nodes are now visible."
    : "Developer visibility disabled: showing only currently reachable nodes.";
}

function setDeveloperMode(enabled) {
  developerMode = enabled;
  devModeToggleEl.textContent = enabled ? "Dev Mode: On" : "Dev Mode: Off";
  devToolsRowEl.style.display = enabled ? "grid" : "none";
  if (!enabled) {
    setDevSpeedMode(false);
    setShowAllNodesMode(false);
  }
  statusEl.textContent = enabled
    ? "Developer mode enabled. Dev testing options are now available."
    : "Developer mode disabled.";
}

function initBalancePane() {
  if (balancePane) return;
  if (!window.Tweakpane || !window.Tweakpane.Pane) {
    statusEl.textContent = "Balance panel unavailable (Tweakpane failed to load).";
    return;
  }
  const host = document.getElementById("balancePaneHost");
  balancePane = new window.Tweakpane.Pane({
    title: "Balance",
    expanded: true,
    container: host
  });
  const params = {
    projectionTransferFactorPerTick,
    resonanceGainPerTick,
    resonanceDecayPerTick,
    earthSinkInflowThreshold,
    earthSinkHardThreshold
  };
  const addPaneBinding = (key, options, onChange) => {
    const add = balancePane.addBinding?.bind(balancePane) ?? balancePane.addInput?.bind(balancePane);
    if (!add) return null;
    const input = add(params, key, options);
    input?.on?.("change", (ev) => onChange(ev.value));
    return input;
  };
  addPaneBinding("projectionTransferFactorPerTick", { min: 0.000001, max: 0.00002, step: 0.000001 }, (value) => {
    projectionTransferFactorPerTick = value;
  });
  addPaneBinding("resonanceGainPerTick", { min: 0.01, max: 0.3, step: 0.005 }, (value) => {
    resonanceGainPerTick = value;
  });
  addPaneBinding("resonanceDecayPerTick", { min: 0.005, max: 0.2, step: 0.005 }, (value) => {
    resonanceDecayPerTick = value;
  });
  addPaneBinding("earthSinkInflowThreshold", { min: 0.005, max: 0.2, step: 0.005 }, (value) => {
    earthSinkInflowThreshold = value;
  });
  addPaneBinding("earthSinkHardThreshold", { min: 0.01, max: 0.4, step: 0.01 }, (value) => {
    earthSinkHardThreshold = value;
  });
}
