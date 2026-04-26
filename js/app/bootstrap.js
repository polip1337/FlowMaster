// FlowMaster: PIXI application setup, global pointer/wheel bindings, and
// the single entry point that kicks off the game loop once assets are ready.

async function setupPixi() {
  const pixiWrap = document.getElementById("pixiWrap");
  app = new PIXI.Application();
  await app.init({
    resizeTo: pixiWrap,
    resolution: Math.max(1, window.devicePixelRatio || 1),
    autoDensity: true,
    backgroundAlpha: 0,
    antialias: true
  });
  pixiWrap.appendChild(app.canvas);
  const viewportCtor = window.pixi_viewport?.Viewport;
  if (viewportCtor) {
    usingViewport = true;
    world = new viewportCtor({
      screenWidth: app.screen.width,
      screenHeight: app.screen.height,
      worldWidth: 4000,
      worldHeight: 4000,
      events: app.renderer.events
    });
    world.drag({ mouseButtons: "left" }).wheel().decelerate();
  } else {
    usingViewport = false;
    world = new PIXI.Container();
  }
  edgeLayer = new PIXI.Container();
  nodeLayer = new PIXI.Container();
  particleLayer = new PIXI.Container();
  symbolLayer = new PIXI.Container();
  symbolLayer.visible = false;
  world.addChild(symbolLayer);
  world.addChild(edgeLayer, particleLayer, nodeLayer);
  app.stage.addChild(world);

  try {
    const texture = await PIXI.Assets.load(CHAKRA_SYMBOL_URL);
    if (texture?.source) {
      texture.source.scaleMode = "linear";
      texture.source.mipmap = "on";
      texture.source.update();
    }
    symbolSprite = new PIXI.Sprite(texture);
    symbolSprite.anchor.set(0);
    symbolSprite.alpha = 0.94;
    symbolSprite.eventMode = "none";
    symbolLayer.addChild(symbolSprite);
  } catch {
    symbolSprite = makeText("Body Map", 28, 0xe8f6ed);
    symbolSprite.anchor.set(0);
    symbolLayer.addChild(symbolSprite);
  }
  tier2MarkerLayer = new PIXI.Container();
  symbolLayer.addChild(tier2MarkerLayer);
  for (const tier2 of TIER2_NODES) {
    createTier2MarkerVisual(tier2);
  }

  for (const edge of edges) {
    createEdgeVisual(edge);
  }
  projectionHoverGraphic = new PIXI.Graphics();
  edgeLayer.addChild(projectionHoverGraphic);

  for (const node of nodeData) {
    createNodeVisual(node);
  }

  app.stage.eventMode = "static";
  app.stage.hitArea = app.screen;
  if (!usingViewport) {
    app.stage.on("pointerdown", startPan);
    app.stage.on("pointermove", onPanMove);
    app.stage.on("pointerup", stopPan);
    app.stage.on("pointerupoutside", stopPan);
  }
  app.stage.on("pointertap", (event) => {
    if (event.target !== app.stage && event.target !== world) return;
    if (draggedDistance > 6) return;
    if (selectedNodeId < 0) return;
    selectedNodeId = -1;
    hideFlowPopup();
    statusEl.textContent = "Node deselected.";
    redrawNetwork();
  });
  app.renderer.on("resize", () => {
    app.stage.hitArea = app.screen;
    if (usingViewport && world.resize) {
      world.resize(app.screen.width, app.screen.height, 4000, 4000);
    }
    layoutSymbolSprite();
    updateFlowPopupPosition();
  });

  if (!usingViewport) {
    app.canvas.addEventListener("wheel", onWheelZoom, { passive: false });
  }

  app.ticker.add((ticker) => {
    animateParticles(ticker.deltaTime);
    updateZoomHud();
    if (symbolModeEnabled) {
      refreshTier2MarkerVisuals();
    }
    if (usingViewport) {
      updateSymbolMode();
      clampWorldToBodyBounds();
      updateFlowPopupPosition();
    }
  });

  initBalancePane();
  layoutSymbolSprite();
  updateSymbolMode();
  updateZoomHud();
  redrawNetwork();
}

document.getElementById("recenter").addEventListener("click", recenterView);
resetBodyViewEl.addEventListener("click", resetBodyView);
devModeToggleEl.addEventListener("click", () => setDeveloperMode(!developerMode));
devSpeedToggleEl.addEventListener("click", () => setDevSpeedMode(!devSpeedEnabled));
showAllNodesBtnEl.addEventListener("click", () => {
  if (!developerMode) {
    statusEl.textContent = "Enable Developer Mode first.";
    return;
  }
  setShowAllNodesMode(!forceShowAllNodes);
});
editNodesBtnEl.addEventListener("click", openNodeEditor);
saveShapeEl.addEventListener("click", exportShapeConfig);
addT2NodeEl.addEventListener("click", addT2NodeInView);
saveT2LayoutEl.addEventListener("click", exportT2LayoutConfig);
speed1xEl.addEventListener("click", () => setSimSpeed(1));
speed10xEl.addEventListener("click", () => setSimSpeed(10));
speed100xEl.addEventListener("click", () => setSimSpeed(100));

setupPixi().then(() => {
  setDeveloperMode(false);
  setDevSpeedMode(false);
  initializeTier2Snapshots();
  world.scale.set(BODY_MODE_DEFAULT_SCALE);
  updateSymbolMode();
  if (symbolModeEnabled) {
    focusBodyModeOnTier2(BODY_MODE_FOCUS_TIER2_ID);
  } else {
    recenterView();
  }
  selectedNodeId = -1;
  hideFlowPopup();
  redrawNetwork();
  updateBonusSummary();
  setInterval(tick, TICK_MS);
  setInterval(refreshOpenTooltip, 1000);
});
