// FlowMaster: camera / view management. Handles panning, zoom clamping,
// recentering, body-sprite layout, and the Tier-1 <-> Tier-2 symbol-mode
// transition with optional GSAP crossfade.

function updateZoomHud() {
  if (!zoomHudEl || !world) return;
  const activeTier2 = TIER2_NODES.find((node) => node.id === activeTier2NodeId);
  const tier2Label = activeTier2 ? activeTier2.name : "n/a";
  let watching = "n/a";
  if (symbolModeEnabled) {
    watching = "T2 map";
  } else {
    const centerPoint = viewportCenterWorldPoint();
    const nearest = nearestTier1NodeFromWorldPoint(centerPoint);
    watching = nearest ? `T1 ${nearest.name}` : "T1";
  }
  zoomHudEl.innerHTML = `Zoom: ${world.scale.x.toFixed(2)}x<br>T2: ${tier2Label}<br>View: ${watching}`;
}

function focusTier1OnNode(nodeId) {
  const nodePos = nodePositions[nodeId];
  if (!nodePos) return;
  world.x = Math.round(app.screen.width * 0.5 - nodePos.x * world.scale.x);
  world.y = Math.round(app.screen.height * 0.5 - nodePos.y * world.scale.y);
}

function layoutSymbolSprite() {
  if (!symbolSprite || !app) return;
  symbolSprite.position.set(0, 0);
  if (symbolSprite.texture && symbolSprite.texture.width > 0) {
    const textureWidth = symbolSprite.texture.width;
    const textureHeight = symbolSprite.texture.height;
    const aspectRatio = textureHeight / textureWidth;
    bodyMapWidth = BODY_WORLD_BASE_WIDTH;
    bodyMapHeight = BODY_WORLD_BASE_WIDTH * aspectRatio;
    const uniformScale = bodyMapWidth / textureWidth;
    symbolSprite.scale.set(uniformScale);
  } else {
    bodyMapWidth = BODY_WORLD_BASE_WIDTH;
    bodyMapHeight = 1900;
  }
}

function viewportCenterWorldPoint() {
  const centerX = (app.screen.width * 0.5 - world.x) / world.scale.x;
  const centerY = (app.screen.height * 0.5 - world.y) / world.scale.y;
  return { x: centerX, y: centerY };
}

function saveCurrentViewState(targetState) {
  if (!world || !targetState) return;
  targetState.initialized = true;
  targetState.scale = world.scale.x;
  targetState.x = world.x;
  targetState.y = world.y;
}

function applyViewState(viewState) {
  if (!world || !viewState || !viewState.initialized) return false;
  const nextScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewState.scale));
  world.scale.set(nextScale);
  world.x = viewState.x;
  world.y = viewState.y;
  return true;
}

function focusWorldOnPoint(worldX, worldY) {
  world.x = Math.round(app.screen.width * 0.5 - worldX * world.scale.x);
  world.y = Math.round(app.screen.height * 0.5 - worldY * world.scale.y);
}

function focusBodyModeOnTier2(tier2Id) {
  const target = TIER2_NODES.find((node) => node.id === tier2Id) ?? TIER2_NODES[0];
  if (!target) return;
  activeTier2NodeId = target.id;
  focusWorldOnPoint(target.x, target.y);
  clampWorldToBodyBounds();
}

function animateViewTransition(onMiddle) {
  if (!pixiWrapEl || !window.gsap) {
    onMiddle();
    return;
  }
  const tl = window.gsap.timeline();
  tl.to(pixiWrapEl, {
    duration: 0.18,
    autoAlpha: 0.5,
    scale: 0.986,
    ease: "power2.inOut"
  }).add(() => {
    onMiddle();
  }).to(pixiWrapEl, {
    duration: 0.26,
    autoAlpha: 1,
    scale: 1,
    ease: "power2.out"
  });
}

function applySymbolModeState(shouldEnable, wasSymbolMode, nearestTier2) {
  if (shouldEnable && !wasSymbolMode) {
    saveCurrentViewState(tier1ViewState);
    tier2Tier1Snapshots.set(activeTier1OwnerTier2Id, captureCurrentTier1Snapshot());
  }
  symbolModeEnabled = shouldEnable;
  symbolLayer.visible = symbolModeEnabled;
  edgeLayer.visible = !symbolModeEnabled;
  nodeLayer.visible = !symbolModeEnabled;
  particleLayer.visible = !symbolModeEnabled;
  if (tier2MarkerLayer) {
    tier2MarkerLayer.visible = symbolModeEnabled;
  }
  resetBodyViewEl.disabled = !symbolModeEnabled;
  if (symbolModeEnabled) {
    if (wasSymbolMode && nearestTier2) {
      activeTier2NodeId = nearestTier2.id;
    }
    const restoredTier2 = applyViewState(tier2ViewState);
    if (!restoredTier2) {
      world.scale.set(BODY_MODE_DEFAULT_SCALE);
      focusBodyModeOnTier2(activeTier2NodeId);
    } else {
      activeTier2NodeId = tier2ViewState.focusTier2Id ?? activeTier2NodeId;
      clampWorldToBodyBounds();
    }
    statusEl.textContent = "Tier 2 body map view. Zoom in very close on a character to enter its node schema.";
    hideFlowPopup();
    hideMarkerTooltip();
  } else {
    saveCurrentViewState(tier2ViewState);
    tier2ViewState.focusTier2Id = activeTier2NodeId;
    if (nearestTier2) {
      activeTier2NodeId = nearestTier2.id;
      statusEl.textContent = `Entered Tier 1 schema for closest character: ${nearestTier2.name}.`;
    }
    activeTier1OwnerTier2Id = activeTier2NodeId;
    applyTier1Snapshot(getOrCreateTier2Snapshot(activeTier1OwnerTier2Id));
    world.scale.set(1);
    const centerPoint = viewportCenterWorldPoint();
    const nearestNode = nearestTier1NodeFromWorldPoint(centerPoint);
    if (nearestNode) {
      focusTier1OnNode(nearestNode.id);
      updateFlowPopupPosition();
      updateZoomHud();
    } else {
      recenterTier1Only();
    }
  }
  lastZoomScale = world.scale.x;
}

function enterTier1ForActiveTier2() {
  if (!symbolModeEnabled || isViewTransitioning) return;
  isViewTransitioning = true;
  saveCurrentViewState(tier2ViewState);
  tier2ViewState.focusTier2Id = activeTier2NodeId;
  activeTier1OwnerTier2Id = activeTier2NodeId;
  animateViewTransition(() => {
    symbolModeEnabled = false;
    symbolLayer.visible = false;
    edgeLayer.visible = true;
    nodeLayer.visible = true;
    particleLayer.visible = true;
    resetBodyViewEl.disabled = true;
    applyTier1Snapshot(getOrCreateTier2Snapshot(activeTier1OwnerTier2Id));
    world.scale.set(1);
    const centerPoint = viewportCenterWorldPoint();
    const nearestNode = nearestTier1NodeFromWorldPoint(centerPoint);
    if (nearestNode) {
      focusTier1OnNode(nearestNode.id);
    } else {
      recenterTier1Only();
    }
    const tier2 = TIER2_NODES.find((node) => node.id === activeTier2NodeId);
    if (tier2) {
      statusEl.textContent = `Entered Tier 1 schema for ${tier2.name}.`;
    }
    redrawNetwork();
    updateFlowPopupPosition();
    updateZoomHud();
    lastZoomScale = world.scale.x;
    isViewTransitioning = false;
    if (viewTransitionQueued) {
      viewTransitionQueued = false;
      updateSymbolMode();
    }
  });
}

function clampWorldToBodyBounds() {
  if (!symbolModeEnabled || !app || !world) return;
  const scale = world.scale.x;
  const contentWidth = bodyMapWidth * scale;
  const contentHeight = bodyMapHeight * scale;

  if (contentWidth <= app.screen.width) {
    world.x = Math.round((app.screen.width - contentWidth) * 0.5);
  } else {
    const minX = app.screen.width - contentWidth;
    world.x = Math.round(Math.min(0, Math.max(minX, world.x)));
  }

  if (contentHeight <= app.screen.height) {
    world.y = Math.round((app.screen.height - contentHeight) * 0.5);
  } else {
    const minY = app.screen.height - contentHeight;
    world.y = Math.round(Math.min(0, Math.max(minY, world.y)));
  }
}

function resetBodyView() {
  if (!world) return;
  world.scale.set(BODY_MODE_DEFAULT_SCALE);
  updateSymbolMode();
  if (symbolModeEnabled) {
    focusBodyModeOnTier2(BODY_MODE_FOCUS_TIER2_ID);
    saveCurrentViewState(tier2ViewState);
    tier2ViewState.focusTier2Id = BODY_MODE_FOCUS_TIER2_ID;
    statusEl.textContent = "Body map reset to default focus.";
  } else {
    recenterView();
  }
  updateFlowPopupPosition();
}

function updateSymbolMode() {
  if (!world || !symbolLayer) return;
  if (isViewTransitioning) {
    viewTransitionQueued = true;
    return;
  }
  const wasSymbolMode = symbolModeEnabled;
  const enterThreshold = Math.max(MIN_ZOOM, SYMBOL_MODE_ENTER_ZOOM_THRESHOLD);
  const exitThreshold = Math.max(MIN_ZOOM, SYMBOL_MODE_EXIT_ZOOM_THRESHOLD);
  const currentScale = world.scale.x;
  const center = viewportCenterWorldPoint();
  const nearestTier2 = nearestTier2NodeFromWorldPoint(center);
  const zoomingIn = currentScale > lastZoomScale;
  const zoomingOut = currentScale < lastZoomScale;
  let shouldEnable = symbolModeEnabled;

  // Directional switching:
  // - T2 -> T1 only while zooming in and crossing the enter threshold.
  // - T1 -> T2 only while zooming out and crossing the exit threshold.
  if (wasSymbolMode && zoomingIn && currentScale >= enterThreshold) {
    shouldEnable = false;
  } else if (!wasSymbolMode && zoomingOut && currentScale <= exitThreshold) {
    shouldEnable = true;
  }
  if (wasSymbolMode && nearestTier2) {
    activeTier2NodeId = nearestTier2.id;
  }
  if (shouldEnable === wasSymbolMode) {
    lastZoomScale = currentScale;
    return;
  }
  isViewTransitioning = true;
  animateViewTransition(() => {
    applySymbolModeState(shouldEnable, wasSymbolMode, nearestTier2);
    isViewTransitioning = false;
    if (viewTransitionQueued) {
      viewTransitionQueued = false;
      updateSymbolMode();
    }
  });
}

function onWheelZoom(event) {
  event.preventDefault();
  const rect = app.canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  const currentScale = world.scale.x;
  const scaleFactor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
  const nextScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentScale * scaleFactor));
  if (nextScale === currentScale) return;

  const worldXUnderMouse = (mouseX - world.x) / currentScale;
  const worldYUnderMouse = (mouseY - world.y) / currentScale;
  world.scale.set(nextScale);
  world.x = mouseX - worldXUnderMouse * nextScale;
  world.y = mouseY - worldYUnderMouse * nextScale;
  updateSymbolMode();
  clampWorldToBodyBounds();
  updateFlowPopupPosition();
  updateZoomHud();
}

function recenterView() {
  const corePos = nodePositions[0];
  if (!corePos) return;
  world.x = Math.round(app.screen.width / 2 - corePos.x * world.scale.x);
  world.y = Math.round(app.screen.height / 2 - corePos.y * world.scale.y);
  clampWorldToBodyBounds();
  updateSymbolMode();
  updateFlowPopupPosition();
  updateZoomHud();
}

function recenterTier1Only() {
  const corePos = nodePositions[0];
  if (!corePos) return;
  world.x = Math.round(app.screen.width / 2 - corePos.x * world.scale.x);
  world.y = Math.round(app.screen.height / 2 - corePos.y * world.scale.y);
  updateFlowPopupPosition();
  updateZoomHud();
}
