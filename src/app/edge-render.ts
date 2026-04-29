// FlowMaster: edge (meridian channel) rendering — PIXI Graphics only.

import { st, edgeVisuals } from './state.ts';
import { makeSerifText, cubicBezierPoint, computeEdgeBezier, drawDashedCircle } from './utils.ts';

export function createEdgeVisual(edge: any) {
  const line = new PIXI.Graphics();
  const echo = new PIXI.Graphics();
  const dots = new PIXI.Graphics();
  const label = makeSerifText("", 11, 0x2a2318);
  label.anchor.set(0.5);
  st.edgeLayer.addChild(line, echo, dots, label);
  edgeVisuals[edge.key] = { line, echo, dots, label };
}

export function deleteEdgeVisual(edgeKey: string) {
  const visual = edgeVisuals[edgeKey];
  if (!visual) return;
  visual.line.destroy();
  visual.echo.destroy();
  visual.dots.destroy();
  visual.label.destroy();
  delete edgeVisuals[edgeKey];
}

function getEdgeIntensity(flow: number) {
  const inBurst = st.resonanceBurstTicks > 0;
  if (flow >= 100 || (flow > 0 && inBurst)) return "burst";
  if (flow >= 61) return "high";
  if (flow >= 26) return "mid";
  if (flow > 0) return "low";
  return "idle";
}

function getEdgeStyle(intensity: string) {
  switch (intensity) {
    case "burst":
      return { color: 0xc87a14, width: 4, alpha: 0.9, dashed: false, dotCount: 3, echo: true };
    case "high":
      return { color: 0x1a5a3a, width: 3.5, alpha: 0.85, dashed: false, dotCount: 3, echo: false };
    case "mid":
      return { color: 0x2a6a4a, width: 2.5, alpha: 0.7, dashed: false, dotCount: 2, echo: false };
    case "low":
      return { color: 0x8b7a5a, width: 1.5, alpha: 0.55, dashed: true, dotCount: 1, echo: false };
    default:
      return { color: 0x8b7a5a, width: 1.2, alpha: 0.35, dashed: true, dotCount: 0, echo: false };
  }
}

function scarSeverityAlpha(edge: any): number {
  return Math.max(0, Math.min(1, Number(edge.scarPenalty ?? 0) / 0.25));
}

export function drawBezierPath(g: any, start: any, c1: any, c2: any, end: any, dashed: boolean, style: any) {
  if (!dashed) {
    g.moveTo(start.x, start.y);
    g.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y);
    g.stroke(style);
    return;
  }
  const samples = 48;
  const points = [];
  for (let i = 0; i <= samples; i += 1) {
    points.push(cubicBezierPoint(start, c1, c2, end, i / samples));
  }
  const dashLen = 5;
  const gapLen = 4;
  const cycle = dashLen + gapLen;
  let accum = 0;
  for (let i = 1; i < points.length; i += 1) {
    const segLen = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    const phaseStart = accum % cycle;
    if (phaseStart < dashLen) {
      g.moveTo(points[i - 1].x, points[i - 1].y);
      g.lineTo(points[i].x, points[i].y);
    }
    accum += segLen;
  }
  g.stroke(style);
}

export function redrawEdge(edge: any) {
  const visual = edgeVisuals[edge.key];
  if (!visual) return;
  visual.line.clear();
  visual.echo.clear();
  visual.dots.clear();
  visual.label.text = "";

  if (!st.visibleNodeIds.has(edge.from) || !st.visibleNodeIds.has(edge.to)) return;

  const bezier = computeEdgeBezier(edge);
  if (!bezier) return;
  const { start, end, c1, c2 } = bezier;

  const intensity = getEdgeIntensity(edge.flow);
  const baseStyle = getEdgeStyle(intensity);
  const hovered = st.hoveredEdgeKey === edge.key;
  const highlight = hovered || st.hoveredTargetNodeId === edge.to || edge.to === st.selectedNodeId || edge.from === st.selectedNodeId;

  const style = {
    width: hovered ? baseStyle.width + 1.5 : baseStyle.width,
    color: hovered ? 0xc87a14 : baseStyle.color,
    alpha: highlight ? Math.min(1, baseStyle.alpha + 0.15) : baseStyle.alpha,
    cap: "round"
  };
  const scarred = Boolean(edge.isScarred) && Number(edge.scarPenalty ?? 0) > 0;
  if (scarred) {
    const severity = scarSeverityAlpha(edge);
    style.color = 0x8f1e1e;
    style.alpha = Math.min(1, Math.max(style.alpha, 0.55 + severity * 0.3));
    style.width += 0.6 + severity;
  }

  drawBezierPath(visual.line, start, c1, c2, end, scarred ? true : baseStyle.dashed, style);

  if (baseStyle.echo) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.hypot(dx, dy) || 1;
    const perpX = -dy / dist;
    const perpY = dx / dist;
    const offset = 4;
    const echoStart = { x: start.x + perpX * offset, y: start.y + perpY * offset };
    const echoEnd = { x: end.x + perpX * offset, y: end.y + perpY * offset };
    const echoC1 = { x: c1.x + perpX * offset, y: c1.y + perpY * offset };
    const echoC2 = { x: c2.x + perpX * offset, y: c2.y + perpY * offset };
    drawBezierPath(visual.echo, echoStart, echoC1, echoC2, echoEnd, true, {
      width: 1.6, color: 0xe8a830, alpha: 0.85, cap: "round"
    });
  }

  if (baseStyle.dotCount > 0) {
    const count = baseStyle.dotCount;
    const baseRadius = 3 + baseStyle.width * 0.3;
    const tsByCount: Record<number, number[]> = { 1: [0.5], 2: [0.35, 0.65], 3: [0.28, 0.5, 0.72] };
    const ts = tsByCount[count];
    for (let i = 0; i < count; i += 1) {
      const t = ts[i];
      const p = cubicBezierPoint(start, c1, c2, end, t);
      const fade = 1 - t * 0.55;
      visual.dots.circle(p.x, p.y, baseRadius);
      visual.dots.fill({ color: baseStyle.color, alpha: Math.min(1, baseStyle.alpha + 0.2) * fade });
    }
  }

  if (scarred) {
    const severity = scarSeverityAlpha(edge);
    drawBezierPath(visual.echo, start, c1, c2, end, true, {
      width: 1.2 + severity * 0.6,
      color: 0xc14b4b,
      alpha: 0.55 + severity * 0.25,
      cap: "round"
    });
  }

  // Edge stats are surfaced by the minimized flow-control chip.
}
