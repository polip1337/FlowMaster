// FlowMaster: tier-2 (body-map) marker visuals.
// Circular dep note: enterTier1ForActiveTier2 lives in view.ts which also
// imports from here. ES modules handle runtime-only circular calls fine.

import { TIER2_NODES, BODY_MODE_DEFAULT_SCALE } from './constants.ts';
import { st, tier2MarkerVisuals } from './state.ts';
import { handleTier2MarkerRouteClick } from './body-map.ts';
import { UI_AJNA_T2_ID, UI_BINDU_T2_ID } from '../../src/uiCore/t2UiMapping.ts';

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
  const breakthroughPhase = st.breakthroughFxDurationTicks > 0
    ? st.breakthroughFxTicks / st.breakthroughFxDurationTicks
    : 0;
  const pulse = breakthroughPhase > 0 ? (0.75 + 0.25 * Math.sin(st.tickCounter * 0.4)) : 1;
  const damage = st.t2DamageById[tier2.id];
  const cracked = Boolean(damage?.cracked);
  const shattered = Boolean(damage?.shattered);
  const repairProgress = Math.max(0, Math.min(1, Number(damage?.repairProgress) || 0));
  marker.clear();
  marker.circle(0, 0, radius * pulse);
  // TASK-191: Galaxy mode renders markers as brighter "stars"
  if (st.galaxyViewEnabled) {
    marker.fill({ color: shattered ? 0x2a2a2a : 0xb8d8ff, alpha: hovered ? 0.72 : 0.56 });
    marker.stroke({ width: hovered ? 3.5 : 2.2, color: 0xeaf4ff, alpha: hovered ? 1 : 0.9 });
    marker.circle(0, 0, Math.max(1, radius * 0.32 * pulse));
    marker.fill({ color: shattered ? 0x5a5a5a : 0xffffff, alpha: hovered ? 1 : 0.9 });
  } else {
    // Keep markers visible at all times in T2 mode so zoom-out never appears empty.
    marker.fill({ color: shattered ? 0x3a3a3a : hovered ? 0xffffff : 0xff4d4d, alpha: hovered ? 0.26 : 0.12 });
    marker.stroke({ width: hovered ? 3.5 : 2.2, color: cracked ? 0xffe0e0 : hovered ? 0xffffff : 0xff4d4d, alpha: hovered ? 1 : 0.88 });
  }
  if (cracked || shattered) {
    const crackAlpha = Math.max(0.08, (1 - repairProgress) * (shattered ? 1 : 0.75));
    marker.moveTo(-radius * 0.45, -radius * 0.2);
    marker.lineTo(radius * 0.4, radius * 0.2);
    marker.moveTo(-radius * 0.1, -radius * 0.45);
    marker.lineTo(radius * 0.15, radius * 0.42);
    marker.stroke({ width: shattered ? 2.4 : 1.4, color: 0x111111, alpha: crackAlpha });
  }
  if (tier2.id === UI_BINDU_T2_ID) {
    const crescentPhase = st.tickCounter * 0.007;
    const crescentStart = -Math.PI * 0.2 + Math.sin(crescentPhase) * 0.08;
    const crescentEnd = Math.PI * 1.15 + Math.sin(crescentPhase) * 0.08;
    marker.arc(0, 0, radius * 0.88, crescentStart, crescentEnd);
    marker.stroke({ width: 2.2, color: 0xdbe4f7, alpha: 0.92 });
    marker.arc(radius * 0.18, 0, radius * 0.66, crescentStart, crescentEnd);
    marker.stroke({ width: 2.8, color: 0x162034, alpha: 0.82 });
    const pulseWindow = (st.tickCounter % 500) / 500;
    if (st.binduReserveRatio > 0.5 && pulseWindow < 0.2) {
      const pulseAlpha = 1 - pulseWindow / 0.2;
      marker.circle(0, 0, radius * (0.16 + 0.12 * pulseAlpha));
      marker.fill({ color: 0xe6eeff, alpha: 0.6 * pulseAlpha });
    }
    if (st.binduStabilizationFlashTicks > 0) {
      const flash = 0.35 + 0.65 * Math.abs(Math.sin(st.tickCounter * 0.45));
      marker.circle(0, 0, radius * 1.05);
      marker.stroke({ width: 2.6, color: 0xf2f7ff, alpha: 0.9 * flash });
      marker.circle(0, 0, radius * 0.86);
      marker.fill({ color: 0x0f1625, alpha: 0.5 + 0.35 * flash });
    }
  }
  if (tier2.id === UI_AJNA_T2_ID) {
    const lobeRadius = radius * 0.38;
    const severity = Math.max(0, Math.min(1, (st.ajnaImbalanceSeverity - 0.2) / 0.8));
    marker.circle(-radius * 0.3, 0, lobeRadius);
    marker.fill({ color: 0x8093ff, alpha: 0.28 + st.ajnaYinRatio * 0.48 });
    marker.circle(radius * 0.3, 0, lobeRadius);
    marker.fill({ color: 0xffb25f, alpha: 0.28 + st.ajnaYangRatio * 0.48 });
    if (st.ajnaImbalanceSeverity > 0.2) {
      const tilt = (st.ajnaYinRatio - st.ajnaYangRatio) * 0.85;
      const cx = 0;
      const cy = -radius * 0.86;
      marker.moveTo(cx - radius * 0.23, cy);
      marker.lineTo(cx + radius * 0.23, cy + tilt * radius * 0.2);
      marker.stroke({ width: 1.7 + severity * 0.8, color: 0xf7e6b5, alpha: 0.94 });
      marker.moveTo(cx, cy - radius * 0.16);
      marker.lineTo(cx, cy + radius * 0.13);
      marker.stroke({ width: 1.4, color: 0xf7e6b5, alpha: 0.9 });
    }
  }
  if (st.breakthroughFxTicks > 0) {
    marker.circle(0, 0, radius * (1.2 + 0.2 * pulse));
    marker.stroke({ width: 2, color: 0xfff3a1, alpha: 0.45 });
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
