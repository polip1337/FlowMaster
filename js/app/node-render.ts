// FlowMaster: node (meridian sigil) rendering — creation + per-frame redraw.

import {
  STATE_LOCKED, STATE_ACTIVE, STATE_RESONANT, STATE_META,
  STAT_ORDER, STAT_COLOR_HEX, STAT_CHAR,
  NODE_ORB_RADIUS, NODE_ARC_RADIUS, NODE_INNER_DASHED_RADIUS,
  NODE_RADAR_MAX_RADIUS, NODE_RIPPLE_RADII, UNLOCK_FADE_TICKS,
  TICKS_PER_SECOND
} from './constants.ts';
import { nodePositions } from './config.ts';
import { st, nodeVisuals, unlockFadeProgress } from './state.ts';
import { makeSerifText, drawDashedCircle, fmt, formatDuration } from './utils.ts';
import { getNodeState, getNodeStatLevels, topStats } from './queries.ts';
import { getAttributeState, computeNodeRates } from './mechanics.ts';
import {
  mixEnergyOrbColor,
  drawT1QualityRing,
  drawRepairPulse
} from './cluster-view.ts';

export function createNodeVisual(node: any) {
  const container = new PIXI.Container();
  container.eventMode = "static";
  container.cursor = "pointer";
  container.hitArea = new PIXI.Circle(0, 0, NODE_ARC_RADIUS + 8);
  container.on("pointertap", () => selectNode(node.id));
  container.on("pointerdown", (event: any) => {
    tryStartNodeDrag(node.id, event);
    event.stopPropagation();
  });

  const ripples = new PIXI.Graphics();
  const qualityRing = new PIXI.Graphics();
  const repairGlow = new PIXI.Graphics();
  const arcTrack = new PIXI.Graphics();
  const arcFill = new PIXI.Graphics();
  const compassTicks = new PIXI.Graphics();
  const statDots = new PIXI.Graphics();
  const orb = new PIXI.Graphics();
  const orbDashed = new PIXI.Graphics();
  const wedges = new PIXI.Graphics();
  const lockGlyph = new PIXI.Graphics();
  const burstRays = new PIXI.Graphics();
  const damageOverlay = new PIXI.Graphics();
  const corona = new PIXI.Graphics();

  const watermark = makeSerifText("", 46, 0x8b7a5a, { cjk: true });
  watermark.anchor.set(0.5);
  const siText = makeSerifText("", 15, 0x2a2318, { bold: true });
  siText.anchor.set(0.5);
  const netText = makeSerifText("", 11, 0x2a6a4a);
  netText.anchor.set(0.5);
  const etaText = makeSerifText("", 10, 0x6b5a3e);
  etaText.anchor.set(0.5);
  const nameText = makeSerifText(node.name, 13, 0x2a2318, { bold: true, letterSpacing: 1.5 });
  nameText.anchor.set(0.5);
  const stateText = makeSerifText("", 11, 0x8b7a5a, { cjk: true, letterSpacing: 1 });
  stateText.anchor.set(0.5);

  const calloutLayer = new PIXI.Container();
  const callouts: any[] = [];
  for (let i = 0; i < 3; i += 1) {
    const line = new PIXI.Graphics();
    const charText = makeSerifText("", 11, 0x2a2318, { cjk: true });
    charText.anchor.set(1, 0.5);
    const labelText = makeSerifText("", 10, 0x2a2318);
    labelText.anchor.set(0, 0.5);
    calloutLayer.addChild(line, charText, labelText);
    callouts.push({ line, charText, labelText });
  }

  container.addChild(
    calloutLayer, ripples, qualityRing, repairGlow, arcTrack, arcFill, compassTicks,
    orb, orbDashed, wedges, burstRays, damageOverlay, corona, lockGlyph, statDots,
    watermark, siText, netText, etaText, stateText, nameText
  );

  st.nodeLayer.addChild(container);
  nodeVisuals[node.id] = {
    container, ripples, qualityRing, repairGlow, arcTrack, arcFill, compassTicks, statDots,
    orb, orbDashed, wedges, lockGlyph, burstRays, damageOverlay, corona,
    watermark, siText, netText, etaText, stateText, nameText,
    callouts, calloutLayer
  };
}

export function redrawNode(node: any) {
  const visual = nodeVisuals[node.id];
  const isVisible = st.visibleNodeIds.has(node.id);
  visual.container.visible = isVisible;
  if (!isVisible) return;

  const pos = nodePositions[node.id];
  visual.container.position.set(pos.x, pos.y);

  const fade = unlockFadeProgress.has(node.id)
    ? Math.min(1, unlockFadeProgress.get(node.id)! / UNLOCK_FADE_TICKS)
    : 1;
  visual.container.alpha = fade;

  const state = getNodeState(node);
  const meta = STATE_META[state];
  const levels = getNodeStatLevels(node);
  const selected = node.id === st.selectedNodeId;
  const hovered = node.id === st.hoveredTargetNodeId;

  const rippleCount = state === STATE_RESONANT ? 3 : 2;
  const rippleAlphaBase = state === STATE_RESONANT ? 0.38 : state === STATE_ACTIVE ? 0.3 : 0.22;
  visual.ripples.clear();
  for (let i = 0; i < rippleCount; i += 1) {
    const r = NODE_RIPPLE_RADII[i] ?? (NODE_RIPPLE_RADII[NODE_RIPPLE_RADII.length - 1] + (i * 8));
    visual.ripples.circle(0, 0, r);
    visual.ripples.stroke({ width: 0.6 - i * 0.08, color: meta.primaryStroke, alpha: rippleAlphaBase - i * 0.07 });
  }

  drawT1QualityRing(visual.qualityRing, node, st.tickCounter);
  drawRepairPulse(visual.repairGlow, node, st.tickCounter);

  visual.arcTrack.clear();
  visual.arcFill.clear();
  const maxProgress = state === STATE_RESONANT
    ? 1
    : node.unlockCost > 0
      ? Math.min(1, node.si / node.unlockCost)
      : (node.unlocked ? 1 : 0);

  if (state === STATE_LOCKED) {
    drawDashedCircle(visual.arcTrack, 0, 0, NODE_ARC_RADIUS + 6, 0.18, 0.12, {
      width: 0.6, color: meta.primaryStroke, alpha: 0.6
    });
  }
  visual.arcTrack.circle(0, 0, NODE_ARC_RADIUS);
  visual.arcTrack.stroke({ width: 1.4, color: meta.primaryStroke, alpha: state === STATE_LOCKED ? 0.45 : 0.55 });

  if (maxProgress > 0) {
    const startA = -Math.PI / 2;
    const endA = startA + Math.PI * 2 * Math.max(0.001, maxProgress);
    visual.arcFill.arc(0, 0, NODE_ARC_RADIUS, startA, endA);
    visual.arcFill.stroke({ width: state === STATE_RESONANT ? 4 : 2.4, color: meta.arcColor, alpha: 1, cap: "round" });
  }
  if (state === STATE_RESONANT) {
    drawDashedCircle(visual.arcFill, 0, 0, NODE_ARC_RADIUS - 6, 0.12, 0.08, {
      width: 1.2, color: 0xe8a830, alpha: 0.75
    });
  }

  visual.compassTicks.clear();
  for (let i = 0; i < 8; i += 1) {
    const angle = -Math.PI / 2 + (Math.PI / 4) * i;
    const isCardinal = i % 2 === 0;
    const inner = NODE_ARC_RADIUS - (isCardinal ? 5 : 3);
    const outer = NODE_ARC_RADIUS + (isCardinal ? 4 : 2);
    visual.compassTicks.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    visual.compassTicks.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    visual.compassTicks.stroke({ width: isCardinal ? 0.9 : 0.6, color: meta.primaryStroke, alpha: 0.75 });
  }

  visual.statDots.clear();
  for (let i = 0; i < STAT_ORDER.length; i += 1) {
    const stat = STAT_ORDER[i];
    const angle = -Math.PI / 2 + (Math.PI * 2 / 5) * i;
    const dx = Math.cos(angle) * NODE_ARC_RADIUS;
    const dy = Math.sin(angle) * NODE_ARC_RADIUS;
    const dotLevel = levels[stat];
    let radius: number, fill: number, strokeColor: number, strokeAlpha: number;
    if (state === STATE_LOCKED) {
      radius = 2.2; fill = 0xc8b898; strokeColor = 0x8b7a5a; strokeAlpha = 0.45;
    } else if (state === STATE_RESONANT) {
      radius = 2.8 + dotLevel * 1.6; fill = STAT_COLOR_HEX[stat]; strokeColor = 0xc87a14; strokeAlpha = 0.95;
    } else {
      radius = 2.4 + dotLevel * 1.3; fill = STAT_COLOR_HEX[stat]; strokeColor = 0x2a6a4a; strokeAlpha = 0.6;
    }
    visual.statDots.circle(dx, dy, radius);
    visual.statDots.fill({ color: fill, alpha: state === STATE_LOCKED ? 0.8 : 0.95 });
    visual.statDots.stroke({ width: 0.7, color: strokeColor, alpha: strokeAlpha });
  }

  visual.wedges.clear();
  if (state !== STATE_LOCKED) {
    const wedgeAlpha = state === STATE_RESONANT ? 0.28 : 0.18;
    for (let i = 0; i < STAT_ORDER.length; i += 1) {
      const stat = STAT_ORDER[i];
      const level = state === STATE_RESONANT ? Math.max(0.7, levels[stat]) : levels[stat];
      if (level <= 0.02) continue;
      const start = -Math.PI / 2 - Math.PI / 5 + (Math.PI * 2 / 5) * i;
      const end = start + (Math.PI * 2 / 5);
      const radius = NODE_RADAR_MAX_RADIUS * level;
      visual.wedges.moveTo(0, 0);
      visual.wedges.arc(0, 0, radius, start, end);
      visual.wedges.lineTo(0, 0);
      visual.wedges.fill({ color: STAT_COLOR_HEX[stat], alpha: wedgeAlpha });
    }
  }

  visual.orb.clear();
  visual.orb.circle(0, 0, NODE_ORB_RADIUS);
  const energyMix = mixEnergyOrbColor(node);
  const orbFill = energyMix != null && (node.unlocked || node.id === 0) ? energyMix : meta.orbFill;
  visual.orb.fill({ color: orbFill, alpha: 0.95 });
  const orbStrokeWidth = selected ? 2.2 : hovered ? 1.8 : 1.2;
  visual.orb.stroke({ width: orbStrokeWidth, color: selected ? 0x8b6914 : meta.primaryStroke, alpha: 0.9 });
  const shenPool = Math.max(0, Number(node.energyShen) || 0);
  const qiPool = Math.max(0, Number(node.energyQi) || 0);
  const shenRatio = shenPool / Math.max(1, shenPool + qiPool);
  visual.corona.clear();
  if (shenRatio > 0.25) {
    visual.corona.circle(0, 0, NODE_ORB_RADIUS + 6 + shenRatio * 8);
    visual.corona.stroke({ width: 1.6, color: 0xa975ff, alpha: Math.min(0.8, 0.25 + shenRatio * 0.6) });
  }
  if (st.refiningPulseActive && node.id === 11) {
    const furnacePulse = 0.75 + 0.25 * Math.sin(st.tickCounter * 0.35);
    visual.corona.circle(0, 0, NODE_ORB_RADIUS + 14 * furnacePulse);
    visual.corona.stroke({ width: 2.2, color: 0xffa34b, alpha: 0.55 });
  }

  visual.orbDashed.clear();
  drawDashedCircle(visual.orbDashed, 0, 0, NODE_INNER_DASHED_RADIUS, 0.14, 0.1, {
    width: 0.6, color: meta.primaryStroke, alpha: 0.55
  });

  visual.burstRays.clear();
  if (state === STATE_RESONANT) {
    const inner = NODE_ORB_RADIUS * 0.32;
    const outer = NODE_ORB_RADIUS * 0.76;
    for (let i = 0; i < 8; i += 1) {
      const angle = -Math.PI / 2 + (Math.PI / 4) * i;
      const isCardinal = i % 2 === 0;
      visual.burstRays.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      visual.burstRays.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      visual.burstRays.stroke({ width: isCardinal ? 1.3 : 0.7, color: 0xc87a14, alpha: 0.8 });
    }
  }

  visual.lockGlyph.clear();
  if (state === STATE_LOCKED) {
    const gx = 0;
    const gy = -NODE_ORB_RADIUS * 0.52;
    const glyphColor = 0x7a6a4a;
    visual.lockGlyph.roundRect(gx - 5, gy - 2, 10, 9, 1.2);
    visual.lockGlyph.fill({ color: glyphColor, alpha: 0.7 });
    visual.lockGlyph.moveTo(gx - 3.6, gy - 2);
    visual.lockGlyph.arc(gx, gy - 2, 3.6, Math.PI, 0);
    visual.lockGlyph.stroke({ width: 1.1, color: glyphColor, alpha: 0.7 });
    visual.lockGlyph.circle(gx, gy + 2.2, 1);
    visual.lockGlyph.fill({ color: 0xe8dfc0, alpha: 0.9 });
  }
  visual.damageOverlay.clear();
  if (node.damageState === "cracked" || node.damageState === "shattered") {
    const fractureColor = node.damageState === "shattered" ? 0x1d1d1d : 0x342313;
    const fractureWidth = node.damageState === "shattered" ? 2.2 : 1.2;
    const heal = Math.max(0, Math.min(1, Number(node.repairAccumulator) || 0));
    const crackScale = 1 - heal;
    visual.damageOverlay.moveTo(-NODE_ORB_RADIUS * 0.55, -NODE_ORB_RADIUS * 0.2);
    visual.damageOverlay.lineTo(NODE_ORB_RADIUS * 0.45 * crackScale, NODE_ORB_RADIUS * 0.18);
    visual.damageOverlay.moveTo(-NODE_ORB_RADIUS * 0.15, -NODE_ORB_RADIUS * 0.5);
    visual.damageOverlay.lineTo(NODE_ORB_RADIUS * 0.2 * crackScale, NODE_ORB_RADIUS * 0.55);
    if (node.damageState === "shattered") {
      visual.damageOverlay.moveTo(-NODE_ORB_RADIUS * 0.45, NODE_ORB_RADIUS * 0.05);
      visual.damageOverlay.lineTo(NODE_ORB_RADIUS * 0.5 * crackScale, -NODE_ORB_RADIUS * 0.08);
    }
    visual.damageOverlay.stroke({ width: fractureWidth, color: fractureColor, alpha: 0.75 });
  }

  if (state === STATE_LOCKED) {
    visual.watermark.text = "";
  } else {
    visual.watermark.text = state === STATE_RESONANT ? "鳴" : "氣";
    visual.watermark.alpha = state === STATE_RESONANT ? 0.2 : 0.14;
    visual.watermark.style.fill = meta.primaryStroke;
  }
  visual.watermark.position.set(0, 1);

  const attr = getAttributeState();
  const rates = computeNodeRates(attr);
  const nodeRate = rates[node.id] ?? { in: 0, out: 0, net: 0 };
  const netPerSec = nodeRate.net * TICKS_PER_SECOND;
  const remaining = Math.max(0, node.unlockCost - node.si);
  const etaSec = !node.unlocked && nodeRate.net > 0
    ? remaining / nodeRate.net / TICKS_PER_SECOND
    : Infinity;

  visual.siText.text = fmt(node.si);
  visual.siText.style.fill = meta.textColor;
  visual.siText.position.set(0, -10);

  if (state === STATE_LOCKED) {
    const pct = node.unlockCost > 0 ? (node.si / node.unlockCost) * 100 : 0;
    visual.netText.text = `${pct.toFixed(0)}% 突破`;
    visual.netText.style.fill = meta.subTextColor;
  } else if (state === STATE_RESONANT) {
    const surge = 1 + Math.min(3.5, Math.max(0.2, netPerSec / 10));
    visual.netText.text = `共鳴 ×${surge.toFixed(1)}`;
    visual.netText.style.fill = meta.subTextColor;
  } else {
    const sign = netPerSec >= 0 ? "+" : "";
    visual.netText.text = `${sign}${netPerSec.toFixed(2)} SI/s`;
    visual.netText.style.fill = meta.subTextColor;
  }
  visual.netText.position.set(0, 5);

  if (state === STATE_LOCKED) {
    visual.etaText.text = Number.isFinite(etaSec) ? `ETA ${formatDuration(etaSec)}` : "blocked";
  } else if (state === STATE_RESONANT) {
    visual.etaText.text = "BURST";
  } else {
    visual.etaText.text = `通 ACTIVE`;
  }
  visual.etaText.style.fill = 0x6b5a3e;
  visual.etaText.position.set(0, 18);

  visual.stateText.text = `${meta.char} · ${meta.en}`;
  visual.stateText.style.fill = meta.primaryStroke;
  visual.stateText.position.set(0, -NODE_RIPPLE_RADII[rippleCount - 1] - 10);

  visual.nameText.text = node.name;
  visual.nameText.style.fill = 0x2a2318;
  visual.nameText.position.set(0, NODE_RIPPLE_RADII[rippleCount - 1] + 12);

  for (const callout of visual.callouts) {
    callout.line.clear();
    callout.charText.text = "";
    callout.labelText.text = "";
  }
  if (state === STATE_ACTIVE) {
    const top = topStats(levels, 3);
    for (let i = 0; i < top.length; i += 1) {
      const callout = visual.callouts[i];
      if (!callout) continue;
      const entry = top[i];
      const angle = Math.PI + (i - (top.length - 1) / 2) * 0.35;
      const anchorX = Math.cos(angle) * NODE_ARC_RADIUS;
      const anchorY = Math.sin(angle) * NODE_ARC_RADIUS;
      const margin = -110;
      const textY = anchorY;
      callout.line.moveTo(anchorX, anchorY);
      callout.line.lineTo(anchorX - 20, anchorY);
      callout.line.lineTo(margin + 10, textY);
      callout.line.stroke({ width: 0.5, color: 0x6b5a3e, alpha: 0.7 });
      callout.charText.text = STAT_CHAR[entry.stat];
      callout.charText.style.fill = STAT_COLOR_HEX[entry.stat];
      callout.charText.position.set(margin + 8, textY - 1);
      callout.labelText.text = ` ${entry.stat}  ${Math.round(entry.value * 100)}%`;
      callout.labelText.style.fill = 0x2a2318;
      callout.labelText.position.set(margin + 10, textY - 1);
    }
  }
}

// Forward-declared — assigned by input.ts after it loads (avoids circular import)
export let selectNode: (nodeId: number) => void = () => {};
export let tryStartNodeDrag: (nodeId: number, event: any) => void = () => {};
export function bindNodeInteractions(
  selectFn: (nodeId: number) => void,
  dragFn: (nodeId: number, event: any) => void
) {
  selectNode = selectFn;
  tryStartNodeDrag = dragFn;
}
