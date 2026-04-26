// FlowMaster: pointer input — panning, node dragging, selection,
// and developer connection toggling.

function startPan(event) {
  if (draggingNodeId !== null) return;
  isPanning = true;
  draggedDistance = 0;
  const local = event.getLocalPosition(app.stage);
  panStartX = local.x;
  panStartY = local.y;
  worldStartX = world.x;
  worldStartY = world.y;
}

function onPanMove(event) {
  if (draggingTier2NodeId !== null) {
    const localWorld = event.getLocalPosition(world);
    const tier2 = TIER2_NODES.find((node) => node.id === draggingTier2NodeId);
    if (!tier2) return;
    const nextX = localWorld.x - dragTier2OffsetX;
    const nextY = localWorld.y - dragTier2OffsetY;
    tier2DraggedDistance = Math.max(
      tier2DraggedDistance,
      Math.hypot(nextX - tier2.x, nextY - tier2.y)
    );
    tier2.x = Math.round(nextX);
    tier2.y = Math.round(nextY);
    setTier2VisualPosition(draggingTier2NodeId);
    updateZoomHud();
    return;
  }
  if (draggingNodeId !== null) {
    const localWorld = event.getLocalPosition(world);
    nodePositions[draggingNodeId].x = localWorld.x - dragNodeOffsetX;
    nodePositions[draggingNodeId].y = localWorld.y - dragNodeOffsetY;
    redrawNetwork();
    updateFlowPopupPosition();
    return;
  }
  if (!isPanning) return;
  const local = event.getLocalPosition(app.stage);
  const dx = local.x - panStartX;
  const dy = local.y - panStartY;
  draggedDistance = Math.max(draggedDistance, Math.hypot(dx, dy));
  world.x = Math.round(worldStartX + dx);
  world.y = Math.round(worldStartY + dy);
  clampWorldToBodyBounds();
  updateFlowPopupPosition();
}

function stopPan() {
  isPanning = false;
  draggingNodeId = null;
  draggingTier2NodeId = null;
}

function tryStartNodeDrag(nodeId, event) {
  if (!developerMode || symbolModeEnabled) return;
  draggingNodeId = nodeId;
  draggedDistance = 0;
  const local = event.getLocalPosition(world);
  dragNodeOffsetX = local.x - nodePositions[nodeId].x;
  dragNodeOffsetY = local.y - nodePositions[nodeId].y;
}

function selectNode(nodeId) {
  if (draggingNodeId !== null) return;
  if (symbolModeEnabled) return;
  if (draggedDistance > 6) return;
  if (!visibleNodeIds.has(nodeId)) return;
  const isSameNode = selectedNodeId === nodeId;
  const popupVisible = !flowPopupEl.classList.contains("hidden");
  if (isSameNode && popupVisible) {
    selectedNodeId = -1;
    hideFlowPopup();
    statusEl.textContent = "Node deselected.";
    redrawNetwork();
    return;
  }

  selectedNodeId = nodeId;
  const outgoing = outgoingEdges(nodeId);
  const node = nodeById(nodeId);
  const projectionNote = node.canProject ? "or project Qi bridge." : "projection locked.";
  statusEl.textContent = `${node.name} selected. Adjust ${outgoing.length} route(s), ${projectionNote}`;
  renderFlowPopup(nodeId);
  redrawNetwork();
}

function toggleConnection(fromNodeId, toNodeId) {
  const idx = edges.findIndex((edge) => edge.from === fromNodeId && edge.to === toNodeId);
  if (idx >= 0) {
    const [removed] = edges.splice(idx, 1);
    deleteEdgeVisual(removed.key);
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      if (particles[i].edgeKey === removed.key) {
        particles[i].sprite.destroy();
        particles.splice(i, 1);
      }
    }
    return;
  }
  const edge = {
    from: fromNodeId,
    to: toNodeId,
    flow: 0,
    key: `dev_${fromNodeId}_${toNodeId}_${edgeKeyCounter}`
  };
  edgeKeyCounter += 1;
  edges.push(edge);
  createEdgeVisual(edge);
}
