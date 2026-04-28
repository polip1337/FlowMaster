// FlowMaster: tier-2 (body-map) marker visuals.
// Circular dep note: enterTier1ForActiveTier2 lives in view.ts which also
// imports from here. ES modules handle runtime-only circular calls fine.

import { TIER2_NODES, BODY_MODE_DEFAULT_SCALE } from './constants.ts';
import { st, tier2MarkerVisuals } from './state.ts';
import { handleTier2MarkerRouteClick } from './body-map.ts';

// Lazily resolved to avoid the circular dep at init time
let _enterTier1ForActiveTier2: (() => void) | null = null;
export function bindEnterTier1(fn: () => void) {
  _enterTier1ForActiveTier2 = fn;
}

export function setTier2VisualPosition(tier2Id: string) {
  const tier2 = TIER2_NODES.find((node) => node.id === tier2Id);
  const visual = tier2MarkerVisuals.get(tier2Id);
  if (!tier2 || !visual) return;
  visual.marker.position.set(tier2.x, tier2.y);
  if (visual.label) visual.label.position.set(tier2.x, tier2.y - 18);
}

export function redrawTier2MarkerVisual(tier2Id: string, hovered = false) {
  const tier2 = TIER2_NODES.find((node) => node.id === tier2Id);
  const visual = tier2MarkerVisuals.get(tier2Id);
  if (!tier2 || !visual) return;
  const marker = visual.marker;
  const zoomRatio = st.world ? st.world.scale.x / BODY_MODE_DEFAULT_SCALE : 1;
  const zoomFactor = 0.85 + 0.35 * Math.max(0.2, Math.min(1.4, zoomRatio));
  const radius = (tier2.radius ?? 16) * zoomFactor * 2.5;
  marker.clear();
  marker.circle(0, 0, radius);
  // TASK-191: Galaxy mode renders markers as brighter "stars"
  if (st.galaxyViewEnabled) {
    marker.fill({ color: 0xb8d8ff, alpha: hovered ? 0.72 : 0.56 });
    marker.stroke({ width: hovered ? 3.5 : 2.2, color: 0xeaf4ff, alpha: hovered ? 1 : 0.9 });
    marker.circle(0, 0, Math.max(1, radius * 0.32));
    marker.fill({ color: 0xffffff, alpha: hovered ? 1 : 0.9 });
  } else {
    // Keep markers visible at all times in T2 mode so zoom-out never appears empty.
    marker.fill({ color: hovered ? 0xffffff : 0xff4d4d, alpha: hovered ? 0.26 : 0.12 });
    marker.stroke({ width: hovered ? 3.5 : 2.2, color: hovered ? 0xffffff : 0xff4d4d, alpha: hovered ? 1 : 0.88 });
  }
}

export function refreshTier2MarkerVisuals() {
  for (const [tier2Id, visual] of tier2MarkerVisuals.entries()) {
    redrawTier2MarkerVisual(tier2Id, Boolean(visual.hovered));
  }
}

export function createTier2MarkerVisual(tier2: any) {
  if (!st.tier2MarkerLayer) return;
  const marker = new PIXI.Graphics();
  marker.eventMode = "static";
  marker.cursor = "pointer";
  redrawTier2MarkerVisual(tier2.id, false);
  marker.on("pointerdown", (event: any) => {
    // Allow normal body-map panning unless the user is actively dragging T2
    // nodes in developer mode.
    if (st.developerMode && st.symbolModeEnabled) {
      tryStartTier2Drag(tier2.id, event);
      event.stopPropagation();
    }
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
    if (st.developerMode && st.tier2DraggedDistance > 6) return;
    if (!st.symbolModeEnabled) return;
    if (handleTier2MarkerRouteClick(tier2.id)) return;
    st.activeTier2NodeId = tier2.id;
    if (_enterTier1ForActiveTier2) _enterTier1ForActiveTier2();
  });
  tier2MarkerVisuals.set(tier2.id, { marker, label: null, hovered: false });
  setTier2VisualPosition(tier2.id);
  st.tier2MarkerLayer.addChild(marker);
}

export function tryStartTier2Drag(tier2Id: string, event: any) {
  if (!st.developerMode || !st.symbolModeEnabled) return;
  st.draggingTier2NodeId = tier2Id;
  st.tier2DraggedDistance = 0;
  const local = event.getLocalPosition(st.world);
  const tier2 = TIER2_NODES.find((node) => node.id === tier2Id);
  if (!tier2) return;
  st.dragTier2OffsetX = local.x - tier2.x;
  st.dragTier2OffsetY = local.y - tier2.y;
}
