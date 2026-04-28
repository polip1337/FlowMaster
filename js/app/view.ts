// FlowMaster: camera / view management.

import {
  TIER2_NODES, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP,
  BODY_MODE_DEFAULT_SCALE, BODY_MODE_FOCUS_TIER2_ID,
  BODY_WORLD_BASE_WIDTH, SYMBOL_MODE_ENTER_ZOOM_THRESHOLD, SYMBOL_MODE_EXIT_ZOOM_THRESHOLD
} from './constants.ts';
import { nodePositions } from './config.ts';
import { st, tier1ViewState, tier2ViewState, statusEl, zoomHudEl, resetBodyViewEl, pixiWrapEl } from './state.ts';
import { nearestTier1NodeFromWorldPoint, nearestTier2NodeFromWorldPoint } from './queries.ts';
import { hideMarkerTooltip } from './tooltips.ts';
import { captureCurrentTier1Snapshot, applyTier1Snapshot, getOrCreateTier2Snapshot } from './snapshots.ts';
import { refreshTier2MarkerVisuals } from './tier2-markers.ts';
// hud.ts is imported lazily via the bound function to avoid a long circular chain
let _redrawNetwork: (() => void) | null = null;
export function bindRedrawNetwork(fn: () => void) { _redrawNetwork = fn; }
// flow-popup.ts
let _hideFlowPopup: (() => void) | null = null;
let _updateFlowPopupPosition: (() => void) | null = null;
export function bindFlowPopupFns(
  hideFn: () => void,
  updatePosFn: () => void
) {
  _hideFlowPopup = hideFn;
  _updateFlowPopupPosition = updatePosFn;
}

export function updateZoomHud() {
  if (!zoomHudEl || !st.world) return;
  const activeTier2 = TIER2_NODES.find((node) => node.id === st.activeTier2NodeId);
  const tier2Label = activeTier2 ? activeTier2.name : "n/a";
  let watching = "n/a";
  if (st.symbolModeEnabled) {
    watching = "T2 map";
  } else {
    const centerPoint = viewportCenterWorldPoint();
    const nearest = nearestTier1NodeFromWorldPoint(centerPoint);
    watching = nearest ? `T1 ${nearest.name}` : "T1";
  }
  zoomHudEl.innerHTML = `Zoom: ${st.world.scale.x.toFixed(2)}x<br>T2: ${tier2Label}<br>View: ${watching}`;
}

export function focusTier1OnNode(nodeId: number) {
  const nodePos = nodePositions[nodeId];
  if (!nodePos) return;
  st.world.x = Math.round(st.app.screen.width * 0.5 - nodePos.x * st.world.scale.x);
  st.world.y = Math.round(st.app.screen.height * 0.5 - nodePos.y * st.world.scale.y);
}

export function layoutSymbolSprite() {
  if (!st.symbolSprite || !st.app) return;
  st.symbolSprite.position.set(0, 0);
  const textureWidth = st.symbolSprite.texture?.width ?? st.symbolSprite.width ?? 0;
  const textureHeight = st.symbolSprite.texture?.height ?? st.symbolSprite.height ?? 0;
  if (textureWidth > 0 && textureHeight > 0) {
    const aspectRatio = textureHeight / textureWidth;
    st.bodyMapWidth = BODY_WORLD_BASE_WIDTH;
    st.bodyMapHeight = BODY_WORLD_BASE_WIDTH * aspectRatio;
    st.symbolSprite.scale.set(st.bodyMapWidth / textureWidth);
  } else {
    st.bodyMapWidth = BODY_WORLD_BASE_WIDTH;
    st.bodyMapHeight = 1900;
  }
}

export function viewportCenterWorldPoint() {
  const centerX = (st.app.screen.width * 0.5 - st.world.x) / st.world.scale.x;
  const centerY = (st.app.screen.height * 0.5 - st.world.y) / st.world.scale.y;
  return { x: centerX, y: centerY };
}

export function saveCurrentViewState(targetState: any) {
  if (!st.world || !targetState) return;
  targetState.initialized = true;
  targetState.scale = st.world.scale.x;
  targetState.x = st.world.x;
  targetState.y = st.world.y;
}

export function applyViewState(viewState: any) {
  if (!st.world || !viewState || !viewState.initialized) return false;
  const nextScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewState.scale));
  st.world.scale.set(nextScale);
  st.world.x = viewState.x;
  st.world.y = viewState.y;
  return true;
}

export function focusWorldOnPoint(worldX: number, worldY: number) {
  st.world.x = Math.round(st.app.screen.width * 0.5 - worldX * st.world.scale.x);
  st.world.y = Math.round(st.app.screen.height * 0.5 - worldY * st.world.scale.y);
}

export function focusBodyModeOnTier2(tier2Id: string) {
  const target = TIER2_NODES.find((node) => node.id === tier2Id) ?? TIER2_NODES[0];
  if (!target) return;
  st.activeTier2NodeId = target.id;
  focusWorldOnPoint(target.x, target.y);
  clampWorldToBodyBounds();
}

export function animateViewTransition(onMiddle: () => void) {
  if (!pixiWrapEl || !window.gsap) { onMiddle(); return; }
  const tl = window.gsap.timeline();
  tl.to(pixiWrapEl, { duration: 0.18, autoAlpha: 0.5, scale: 0.986, ease: "power2.inOut" })
    .add(() => { onMiddle(); })
    .to(pixiWrapEl, { duration: 0.26, autoAlpha: 1, scale: 1, ease: "power2.out" });
}

export function applySymbolModeState(shouldEnable: boolean, wasSymbolMode: boolean, nearestTier2: any) {
  if (shouldEnable && !wasSymbolMode) {
    saveCurrentViewState(tier1ViewState);
    const snap = getOrCreateTier2Snapshot(st.activeTier1OwnerTier2Id);
    // Re-capture current T1 state before switching
    captureCurrentTier1Snapshot();
  }
  st.symbolModeEnabled = shouldEnable;
  st.symbolLayer.visible = st.symbolModeEnabled;
  st.edgeLayer.visible = !st.symbolModeEnabled;
  st.nodeLayer.visible = !st.symbolModeEnabled;
  st.particleLayer.visible = !st.symbolModeEnabled;
  if (st.tier2MarkerLayer) st.tier2MarkerLayer.visible = st.symbolModeEnabled;
  (resetBodyViewEl as HTMLButtonElement).disabled = !st.symbolModeEnabled;

  if (st.symbolModeEnabled) {
    if (wasSymbolMode && nearestTier2) st.activeTier2NodeId = nearestTier2.id;
    const restoredTier2 = applyViewState(tier2ViewState);
    if (!restoredTier2) {
      st.world.scale.set(BODY_MODE_DEFAULT_SCALE);
      focusBodyModeOnTier2(st.activeTier2NodeId);
    } else {
      st.activeTier2NodeId = tier2ViewState.focusTier2Id ?? st.activeTier2NodeId;
      clampWorldToBodyBounds();
    }
    if (statusEl) statusEl.textContent = "Tier 2 body map view. Zoom in very close on a character to enter its node schema.";
    if (_hideFlowPopup) _hideFlowPopup();
    hideMarkerTooltip();
  } else {
    saveCurrentViewState(tier2ViewState);
    tier2ViewState.focusTier2Id = st.activeTier2NodeId;
    if (nearestTier2) {
      st.activeTier2NodeId = nearestTier2.id;
      if (statusEl) statusEl.textContent = `Entered Tier 1 schema for closest character: ${nearestTier2.name}.`;
    }
    st.activeTier1OwnerTier2Id = st.activeTier2NodeId;
    applyTier1Snapshot(getOrCreateTier2Snapshot(st.activeTier1OwnerTier2Id));
    st.world.scale.set(1);
    const centerPoint = viewportCenterWorldPoint();
    const nearestNode = nearestTier1NodeFromWorldPoint(centerPoint);
    if (nearestNode) {
      focusTier1OnNode(nearestNode.id);
      if (_updateFlowPopupPosition) _updateFlowPopupPosition();
      updateZoomHud();
    } else {
      recenterTier1Only();
    }
  }
  st.lastZoomScale = st.world.scale.x;
}

export function enterTier1ForActiveTier2() {
  if (!st.symbolModeEnabled || st.isViewTransitioning) return;
  st.isViewTransitioning = true;
  saveCurrentViewState(tier2ViewState);
  tier2ViewState.focusTier2Id = st.activeTier2NodeId;
  st.activeTier1OwnerTier2Id = st.activeTier2NodeId;
  animateViewTransition(() => {
    st.symbolModeEnabled = false;
    st.symbolLayer.visible = false;
    st.edgeLayer.visible = true;
    st.nodeLayer.visible = true;
    st.particleLayer.visible = true;
    (resetBodyViewEl as HTMLButtonElement).disabled = true;
    applyTier1Snapshot(getOrCreateTier2Snapshot(st.activeTier1OwnerTier2Id));
    st.world.scale.set(1);
    const centerPoint = viewportCenterWorldPoint();
    const nearestNode = nearestTier1NodeFromWorldPoint(centerPoint);
    if (nearestNode) { focusTier1OnNode(nearestNode.id); }
    else { recenterTier1Only(); }
    const tier2 = TIER2_NODES.find((node) => node.id === st.activeTier2NodeId);
    if (tier2 && statusEl) statusEl.textContent = `Entered Tier 1 schema for ${tier2.name}.`;
    if (_redrawNetwork) _redrawNetwork();
    if (_updateFlowPopupPosition) _updateFlowPopupPosition();
    updateZoomHud();
    st.lastZoomScale = st.world.scale.x;
    st.isViewTransitioning = false;
    if (st.viewTransitionQueued) { st.viewTransitionQueued = false; updateSymbolMode(); }
  });
}

export function clampWorldToBodyBounds() {
  if (!st.symbolModeEnabled || !st.app || !st.world) return;
  const scale = st.world.scale.x;
  const contentWidth = st.bodyMapWidth * scale;
  const contentHeight = st.bodyMapHeight * scale;
  if (contentWidth <= st.app.screen.width) {
    st.world.x = Math.round((st.app.screen.width - contentWidth) * 0.5);
  } else {
    const minX = st.app.screen.width - contentWidth;
    st.world.x = Math.round(Math.min(0, Math.max(minX, st.world.x)));
  }
  if (contentHeight <= st.app.screen.height) {
    st.world.y = Math.round((st.app.screen.height - contentHeight) * 0.5);
  } else {
    const minY = st.app.screen.height - contentHeight;
    st.world.y = Math.round(Math.min(0, Math.max(minY, st.world.y)));
  }
}

export function resetBodyView() {
  if (!st.world) return;
  st.world.scale.set(BODY_MODE_DEFAULT_SCALE);
  updateSymbolMode();
  if (st.symbolModeEnabled) {
    focusBodyModeOnTier2(BODY_MODE_FOCUS_TIER2_ID);
    saveCurrentViewState(tier2ViewState);
    tier2ViewState.focusTier2Id = BODY_MODE_FOCUS_TIER2_ID;
    if (statusEl) statusEl.textContent = "Body map reset to default focus.";
  } else {
    recenterView();
  }
  if (_updateFlowPopupPosition) _updateFlowPopupPosition();
}

export function updateSymbolMode() {
  if (!st.world || !st.symbolLayer) return;
  if (st.isViewTransitioning) { st.viewTransitionQueued = true; return; }
  const wasSymbolMode = st.symbolModeEnabled;
  const enterThreshold = Math.max(MIN_ZOOM, SYMBOL_MODE_ENTER_ZOOM_THRESHOLD);
  const exitThreshold = Math.max(MIN_ZOOM, SYMBOL_MODE_EXIT_ZOOM_THRESHOLD);
  const currentScale = st.world.scale.x;
  const center = viewportCenterWorldPoint();
  const nearestTier2 = nearestTier2NodeFromWorldPoint(center);
  let shouldEnable = st.symbolModeEnabled;
  // Use hysteresis based on absolute scale thresholds.
  // This avoids missed transitions when wheel deltas or queued transitions
  // desync direction tracking.
  if (wasSymbolMode && currentScale >= enterThreshold) shouldEnable = false;
  else if (!wasSymbolMode && currentScale <= exitThreshold) shouldEnable = true;
  if (wasSymbolMode && nearestTier2) st.activeTier2NodeId = nearestTier2.id;
  if (shouldEnable === wasSymbolMode) { st.lastZoomScale = currentScale; return; }
  st.isViewTransitioning = true;
  animateViewTransition(() => {
    applySymbolModeState(shouldEnable, wasSymbolMode, nearestTier2);
    st.isViewTransitioning = false;
    if (st.viewTransitionQueued) { st.viewTransitionQueued = false; updateSymbolMode(); }
  });
}

export function onWheelZoom(event: WheelEvent) {
  event.preventDefault();
  const rect = st.app.canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  const currentScale = st.world.scale.x;
  const scaleFactor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
  const nextScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentScale * scaleFactor));
  if (nextScale === currentScale) return;
  const worldXUnderMouse = (mouseX - st.world.x) / currentScale;
  const worldYUnderMouse = (mouseY - st.world.y) / currentScale;
  st.world.scale.set(nextScale);
  st.world.x = mouseX - worldXUnderMouse * nextScale;
  st.world.y = mouseY - worldYUnderMouse * nextScale;
  updateSymbolMode();
  clampWorldToBodyBounds();
  if (_updateFlowPopupPosition) _updateFlowPopupPosition();
  updateZoomHud();
}

export function recenterView() {
  const corePos = nodePositions[0];
  if (!corePos) return;
  st.world.x = Math.round(st.app.screen.width / 2 - corePos.x * st.world.scale.x);
  st.world.y = Math.round(st.app.screen.height / 2 - corePos.y * st.world.scale.y);
  clampWorldToBodyBounds();
  updateSymbolMode();
  if (_updateFlowPopupPosition) _updateFlowPopupPosition();
  updateZoomHud();
}

export function recenterTier1Only() {
  const corePos = nodePositions[0];
  if (!corePos) return;
  st.world.x = Math.round(st.app.screen.width / 2 - corePos.x * st.world.scale.x);
  st.world.y = Math.round(st.app.screen.height / 2 - corePos.y * st.world.scale.y);
  if (_updateFlowPopupPosition) _updateFlowPopupPosition();
  updateZoomHud();
}
