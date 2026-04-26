// FlowMaster: tier-2 (body-map) marker visuals — clickable dots overlaid on
// the body sprite. Each marker enters its Tier-1 schema on tap.

function setTier2VisualPosition(tier2Id) {
  const tier2 = TIER2_NODES.find((node) => node.id === tier2Id);
  const visual = tier2MarkerVisuals.get(tier2Id);
  if (!tier2 || !visual) return;
  visual.marker.position.set(tier2.x, tier2.y);
  if (visual.label) {
    visual.label.position.set(tier2.x, tier2.y - 18);
  }
}

function redrawTier2MarkerVisual(tier2Id, hovered = false) {
  const tier2 = TIER2_NODES.find((node) => node.id === tier2Id);
  const visual = tier2MarkerVisuals.get(tier2Id);
  if (!tier2 || !visual) return;
  const marker = visual.marker;
  const zoomRatio = world ? world.scale.x / BODY_MODE_DEFAULT_SCALE : 1;
  const zoomFactor = 0.85 + 0.35 * Math.max(0.2, Math.min(1.4, zoomRatio));
  const radius = (tier2.radius ?? 16) * zoomFactor * 2.5;
  marker.clear();
  marker.circle(0, 0, radius);
  marker.fill({ color: 0xffffff, alpha: hovered ? 0.42 : 0 });
  marker.stroke({
    width: hovered ? 3.5 : 0,
    color: hovered ? 0xffffff : 0xff4d4d,
    alpha: hovered ? 1 : 0
  });
}

function refreshTier2MarkerVisuals() {
  for (const [tier2Id, visual] of tier2MarkerVisuals.entries()) {
    redrawTier2MarkerVisual(tier2Id, Boolean(visual.hovered));
  }
}

function createTier2MarkerVisual(tier2) {
  if (!tier2MarkerLayer) return;
  const marker = new PIXI.Graphics();
  marker.eventMode = "static";
  marker.cursor = "pointer";
  redrawTier2MarkerVisual(tier2.id, false);
  marker.on("pointerdown", (event) => {
    tryStartTier2Drag(tier2.id, event);
  });
  marker.on("pointerover", () => {
    const visual = tier2MarkerVisuals.get(tier2.id);
    if (visual) visual.hovered = true;
    redrawTier2MarkerVisual(tier2.id, true);
  });
  marker.on("pointerout", () => {
    const visual = tier2MarkerVisuals.get(tier2.id);
    if (visual) visual.hovered = false;
    redrawTier2MarkerVisual(tier2.id, false);
  });
  marker.on("pointertap", () => {
    if (developerMode && tier2DraggedDistance > 6) return;
    if (!symbolModeEnabled) return;
    activeTier2NodeId = tier2.id;
    enterTier1ForActiveTier2();
  });
  const label = null;
  tier2MarkerVisuals.set(tier2.id, { marker, label, hovered: false });
  setTier2VisualPosition(tier2.id);
  tier2MarkerLayer.addChild(marker);
}

function tryStartTier2Drag(tier2Id, event) {
  if (!developerMode || !symbolModeEnabled) return;
  draggingTier2NodeId = tier2Id;
  tier2DraggedDistance = 0;
  const local = event.getLocalPosition(world);
  const tier2 = TIER2_NODES.find((node) => node.id === tier2Id);
  if (!tier2) return;
  dragTier2OffsetX = local.x - tier2.x;
  dragTier2OffsetY = local.y - tier2.y;
}
