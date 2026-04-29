// FlowMaster: node (meridian sigil) rendering — creation + per-frame redraw.

import {
  STATE_LOCKED, STATE_ACTIVE, STATE_RESONANT, STATE_META,
  STAT_COLOR_HEX, STAT_CHAR,
  NODE_ORB_RADIUS, NODE_ARC_RADIUS, NODE_INNER_DASHED_RADIUS,
  UNLOCK_FADE_TICKS, TICKS_PER_SECOND
} from './constants.ts';
import { nodePositions } from './config.ts';
import { st, nodeVisuals, unlockFadeProgress } from './state.ts';
import { makeSerifText, drawDashedCircle, fmt, formatDuration } from './utils.ts';
import { getNodeState, getNodeStatLevels, topStats } from './queries.ts';
import { getAttributeState, computeNodeSiDeltaPerTick } from './mechanics.ts';
import {
  mixEnergyOrbColor,
  drawT1QualityRing,
  drawRepairPulse
} from './cluster-view.ts';

let cachedRatesTick = -1;
let cachedDeltaByNode: Record<number, number> = {};

function currentSiDeltaByNode() {
  if (cachedRatesTick !== st.tickCounter) {
    const attr = getAttributeState();
    cachedDeltaByNode = computeNodeSiDeltaPerTick(attr);
    cachedRatesTick = st.tickCounter;
  }
  return cachedDeltaByNode;
}

function drawOctagonPath(g: any, R: number): void {
  for (let i = 0; i < 8; i += 1) {
    const angle = -Math.PI / 2 + (Math.PI / 4) * i;
    if (i === 0) g.moveTo(Math.cos(angle) * R, Math.sin(angle) * R);
    else g.lineTo(Math.cos(angle) * R, Math.sin(angle) * R);
  }
  g.closePath();
}

function drawNodeCoreShape(g: any, shape: string | undefined, radius: number): void {
  const r = radius;
  if (shape === "diamond") {
    g.moveTo(0, -r);
    g.lineTo(r, 0);
    g.lineTo(0, r);
    g.lineTo(-r, 0);
    g.lineTo(0, -r);
    return;
  }
  if (shape === "square") {
    g.rect(-r, -r, r * 2, r * 2);
    return;
  }
  if (shape === "star") {
    const outer = r;
    const inner = r * 0.46;
    const start = -Math.PI / 2;
    g.moveTo(Math.cos(start) * outer, Math.sin(start) * outer);
    for (let i = 1; i <= 10; i += 1) {
      const angle = start + (Math.PI / 5) * i;
      const useOuter = i % 2 === 0;
      const len = useOuter ? outer : inner;
      g.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
    }
    g.lineTo(Math.cos(start) * outer, Math.sin(start) * outer);
    return;
  }
  g.circle(0, 0, r);
}

function isIoNode(node: any): boolean {
  return node?.nodeType === "IO_IN" || node?.nodeType === "IO_OUT" || node?.nodeType === "IO_BIDIR";
}

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

  const watermark = makeSerifText("", 24, 0x8b7a5a, { cjk: true });
  watermark.anchor.set(0.5);
  const siText = makeSerifText("", 12, 0x2a2318, { bold: true });
  siText.anchor.set(0.5);
  const netText = makeSerifText("", 11, 0x2a6a4a);
  netText.anchor.set(0.5);
  const etaText = makeSerifText("", 10, 0x6b5a3e);
  etaText.anchor.set(0.5);
  const nameText = makeSerifText(node.name, 13, 0x2a2318, { bold: true, letterSpacing: 1.5 });
  nameText.anchor.set(0.5);
  const stateText = makeSerifText("", 11, 0x8b7a5a, { bold: true, letterSpacing: 1.5 });
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
  const ioNode = isIoNode(node);
  const ioPrimaryStroke = 0x2f78d6;
  const ioArcColor = 0x4a9cff;
  const ioTextColor = 0x1f4f94;
  const primaryStroke = ioNode ? ioPrimaryStroke : meta.primaryStroke;
  const arcColor = ioNode ? ioArcColor : meta.arcColor;
  const textColor = ioNode ? ioTextColor : meta.textColor;
  const levels = getNodeStatLevels(node);
  const selected = node.id === st.selectedNodeId;
  const deltaByNode = currentSiDeltaByNode();
  const siDeltaPerTick = deltaByNode[node.id] ?? 0;

  const OCT_R = 65;
  const OCT_RI = 61;

  // Outer octagon frame — cream fill, double dark-brown border
  visual.ripples.clear();
  drawOctagonPath(visual.ripples, OCT_R);
  visual.ripples.fill({ color: 0xe8dfc0, alpha: 0.97 });
  drawOctagonPath(visual.ripples, OCT_R);
  visual.ripples.stroke({ width: 2.8, color: 0x3d2008, alpha: 0.95 });
  drawOctagonPath(visual.ripples, OCT_RI);
  visual.ripples.stroke({ width: 1.2, color: 0x6b4010, alpha: 0.7 });
  if (selected) {
    drawOctagonPath(visual.ripples, OCT_R + 3);
    visual.ripples.stroke({ width: 1.5, color: primaryStroke, alpha: 0.85 });
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

  // Dark ring track that the progress arc rides on
  visual.arcTrack.circle(0, 0, NODE_ARC_RADIUS);
  visual.arcTrack.stroke({ width: 7, color: 0x3d2008, alpha: 0.22 });

  if (maxProgress > 0) {
    const startA = -Math.PI / 2;
    const endA = startA + Math.PI * 2 * Math.max(0.001, maxProgress);
    visual.arcFill.arc(0, 0, NODE_ARC_RADIUS, startA, endA);
    visual.arcFill.stroke({ width: state === STATE_RESONANT ? 9 : 7, color: arcColor, alpha: 1, cap: "round" });
  }
  if (state === STATE_RESONANT) {
    drawDashedCircle(visual.arcFill, 0, 0, NODE_ARC_RADIUS - 8, 0.12, 0.08, {
      width: 1.2, color: 0xe8a830, alpha: 0.75
    });
  }

  // Cardinal diamond markers at the 4 vertex tips of the octagon (N/E/S/W)
  visual.compassTicks.clear();
  const dS = 6.5;
  for (let i = 0; i < 4; i += 1) {
    const angle = -Math.PI / 2 + (Math.PI / 2) * i;
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const tx = -Math.sin(angle);
    const ty = Math.cos(angle);
    const cx = nx * OCT_R;
    const cy = ny * OCT_R;
    visual.compassTicks.moveTo(cx + nx * dS, cy + ny * dS);
    visual.compassTicks.lineTo(cx + tx * dS, cy + ty * dS);
    visual.compassTicks.lineTo(cx - nx * dS, cy - ny * dS);
    visual.compassTicks.lineTo(cx - tx * dS, cy - ty * dS);
    visual.compassTicks.closePath();
    visual.compassTicks.fill({ color: 0x3d2008, alpha: 0.92 });
    visual.compassTicks.stroke({ width: 0.7, color: 0x8b6a2a, alpha: 0.75 });
  }

  // Subtle cross-hair lines inside the inner circle
  visual.statDots.clear();
  const crossR = NODE_ORB_RADIUS * 0.72;
  const crossColor = 0x8b7a5a;
  visual.statDots.moveTo(-crossR, 0);
  visual.statDots.lineTo(crossR, 0);
  visual.statDots.stroke({ width: 0.6, color: crossColor, alpha: 0.22 });
  visual.statDots.moveTo(0, -crossR);
  visual.statDots.lineTo(0, crossR);
  visual.statDots.stroke({ width: 0.6, color: crossColor, alpha: 0.22 });
  visual.statDots.moveTo(-crossR * 0.71, -crossR * 0.71);
  visual.statDots.lineTo(crossR * 0.71, crossR * 0.71);
  visual.statDots.stroke({ width: 0.4, color: crossColor, alpha: 0.13 });
  visual.statDots.moveTo(crossR * 0.71, -crossR * 0.71);
  visual.statDots.lineTo(-crossR * 0.71, crossR * 0.71);
  visual.statDots.stroke({ width: 0.4, color: crossColor, alpha: 0.13 });

  visual.wedges.clear();

  visual.orb.clear();
  visual.orb.circle(0, 0, NODE_ORB_RADIUS);
  const energyMix = mixEnergyOrbColor(node);
  const orbFill = energyMix != null && (node.unlocked || node.id === 0) ? energyMix : meta.orbFill;
  visual.orb.fill({ color: orbFill, alpha: 0.97 });
  visual.orb.circle(0, 0, NODE_ORB_RADIUS);
  visual.orb.stroke({ width: 1.4, color: 0x3d2008, alpha: 0.38 });
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
    width: 0.6, color: primaryStroke, alpha: 0.32
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

  // Prominent CJK state character inside inner circle
  visual.watermark.text = meta.char;
  visual.watermark.alpha = state === STATE_LOCKED ? 0.38 : 0.88;
  visual.watermark.style.fill = primaryStroke;
  visual.watermark.position.set(0, -10);

  // State label just below the CJK char
  visual.stateText.text = meta.en;
  visual.stateText.style.fill = primaryStroke;
  visual.stateText.position.set(0, 6);

  // SI value below state label
  const netPerSecond = siDeltaPerTick * TICKS_PER_SECOND;
  if (state === STATE_LOCKED) {
    const remaining = Math.max(0, node.unlockCost - node.si);
    visual.siText.text = `${fmt(remaining)} SI needed`;
  } else {
    visual.siText.text = `${fmt(node.si)} SI`;
  }
  visual.siText.style.fill = textColor;
  visual.siText.position.set(0, 20);

  // Current SI delta line
  visual.netText.text = `${netPerSecond >= 0 ? "+" : ""}${fmt(netPerSecond)} SI/s`;
  visual.netText.style.fill = textColor;
  visual.netText.position.set(0, 33);

  // ETA — shown only while the node is locked
  if (state === STATE_LOCKED) {
    const remaining = Math.max(0, node.unlockCost - node.si);
    const etaSec = remaining > 0 && siDeltaPerTick > 0
      ? remaining / siDeltaPerTick / TICKS_PER_SECOND
      : Number.POSITIVE_INFINITY;
    visual.etaText.text = Number.isFinite(etaSec) ? `ETA ${formatDuration(etaSec)}` : "ETA blocked";
    visual.etaText.style.fill = textColor;
    visual.etaText.position.set(0, 45);
  } else {
    visual.etaText.text = "";
    visual.etaText.position.set(0, 0);
  }

  // Node name label below the octagon
  visual.nameText.text = node.name;
  visual.nameText.style.fill = 0x2a2318;
  visual.nameText.position.set(0, OCT_R + 14);

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
      const statKey = entry.stat as keyof typeof STAT_CHAR & keyof typeof STAT_COLOR_HEX;
      const angle = Math.PI + (i - (top.length - 1) / 2) * 0.35;
      const anchorX = Math.cos(angle) * NODE_ARC_RADIUS;
      const anchorY = Math.sin(angle) * NODE_ARC_RADIUS;
      const margin = -110;
      const textY = anchorY;
      callout.line.moveTo(anchorX, anchorY);
      callout.line.lineTo(anchorX - 20, anchorY);
      callout.line.lineTo(margin + 10, textY);
      callout.line.stroke({ width: 0.5, color: 0x6b5a3e, alpha: 0.7 });
      callout.charText.text = STAT_CHAR[statKey];
      callout.charText.style.fill = STAT_COLOR_HEX[statKey];
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
