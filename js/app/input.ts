// FlowMaster: pointer input — panning, node dragging, selection,
// and developer connection toggling.

import { TIER2_NODES } from './constants.ts';
import { edges, nodePositions } from './config.ts';
import { st, particles, statusEl, flowPopupEl } from './state.ts';
import { nodeById, outgoingEdges } from './queries.ts';
import { createEdgeVisual, deleteEdgeVisual } from './edge-render.ts';
import { setTier2VisualPosition } from './tier2-markers.ts';
import { updateZoomHud, clampWorldToBodyBounds } from './view.ts';
import { renderFlowPopup, hideFlowPopup, updateFlowPopupPosition } from './flow-popup.ts';
import { redrawNetwork } from './hud.ts';

export function startPan(event: any) {
  if (st.draggingNodeId !== null) return;
  st.isPanning = true;
  st.draggedDistance = 0;
  const local = event.getLocalPosition(st.app.stage);
  st.panStartX = local.x;
  st.panStartY = local.y;
  st.worldStartX = st.world.x;
  st.worldStartY = st.world.y;
}

export function onPanMove(event: any) {
  if (st.draggingTier2NodeId !== null) {
    const localWorld = event.getLocalPosition(st.world);
    const tier2 = TIER2_NODES.find((node) => node.id === st.draggingTier2NodeId);
    if (!tier2) return;
    const nextX = localWorld.x - st.dragTier2OffsetX;
    const nextY = localWorld.y - st.dragTier2OffsetY;
    st.tier2DraggedDistance = Math.max(st.tier2DraggedDistance, Math.hypot(nextX - tier2.x, nextY - tier2.y));
    tier2.x = Math.round(nextX);
    tier2.y = Math.round(nextY);
    setTier2VisualPosition(st.draggingTier2NodeId);
    updateZoomHud();
    return;
  }
  if (st.draggingNodeId !== null) {
    const localWorld = event.getLocalPosition(st.world);
    nodePositions[st.draggingNodeId].x = localWorld.x - st.dragNodeOffsetX;
    nodePositions[st.draggingNodeId].y = localWorld.y - st.dragNodeOffsetY;
    redrawNetwork();
    updateFlowPopupPosition();
    return;
  }
  if (!st.isPanning) return;
  const local = event.getLocalPosition(st.app.stage);
  const dx = local.x - st.panStartX;
  const dy = local.y - st.panStartY;
  st.draggedDistance = Math.max(st.draggedDistance, Math.hypot(dx, dy));
  st.world.x = Math.round(st.worldStartX + dx);
  st.world.y = Math.round(st.worldStartY + dy);
  clampWorldToBodyBounds();
  updateFlowPopupPosition();
  updateZoomHud();
}

export function stopPan() {
  st.isPanning = false;
  st.draggingNodeId = null;
  st.draggingTier2NodeId = null;
}

export function tryStartNodeDrag(nodeId: number, event: any) {
  if (!st.developerMode || st.symbolModeEnabled) return;
  st.draggingNodeId = nodeId;
  st.draggedDistance = 0;
  const local = event.getLocalPosition(st.world);
  st.dragNodeOffsetX = local.x - nodePositions[nodeId].x;
  st.dragNodeOffsetY = local.y - nodePositions[nodeId].y;
}

export function selectNode(nodeId: number) {
  if (st.draggingNodeId !== null) return;
  if (st.symbolModeEnabled) return;
  if (st.draggedDistance > 6) return;
  if (!st.visibleNodeIds.has(nodeId)) return;
  const isSameNode = st.selectedNodeId === nodeId;
  const popupVisible = !flowPopupEl.classList.contains("hidden");
  if (isSameNode && popupVisible) {
    st.selectedNodeId = -1;
    hideFlowPopup();
    if (statusEl) statusEl.textContent = "Node deselected.";
    redrawNetwork();
    return;
  }
  st.selectedNodeId = nodeId;
  const outgoing = outgoingEdges(nodeId);
  const node = nodeById(nodeId);
  const projectionNote = node.canProject ? "or project Qi bridge." : "projection locked.";
  if (statusEl) statusEl.textContent = `${node.name} selected. Adjust ${outgoing.length} route(s), ${projectionNote}`;
  renderFlowPopup(nodeId);
  redrawNetwork();
}

export function toggleConnection(fromNodeId: number, toNodeId: number) {
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
    from: fromNodeId, to: toNodeId, flow: 0,
    key: `dev_${fromNodeId}_${toNodeId}_${st.edgeKeyCounter}`
  };
  st.edgeKeyCounter += 1;
  edges.push(edge);
  createEdgeVisual(edge);
}
