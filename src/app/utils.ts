// FlowMaster: pure math / formatting / low-level PIXI text helpers.
// No game state access — safe to reuse anywhere.

import { SERIF_FONT_FAMILY, CJK_FONT_FAMILY } from './constants.ts';
import { nodePositions } from './config.ts';

export function drawDashedCircle(g: any, cx: number, cy: number, radius: number, dashAngle: number, gapAngle: number, style: any) {
  let a = 0;
  while (a < Math.PI * 2 - 0.0001) {
    const a2 = Math.min(a + dashAngle, Math.PI * 2);
    g.arc(cx, cy, radius, a, a2);
    g.stroke(style);
    a = a2 + gapAngle;
  }
}

export function cubicBezierPoint(p0: any, c1: any, c2: any, p3: any, t: number) {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * p3.y
  };
}

export function computeEdgeBezier(edge: any) {
  const start = nodePositions[edge.from];
  const end = nodePositions[edge.to];
  if (!start || !end) return null;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.hypot(dx, dy) || 1;
  const perpX = -dy / dist;
  const perpY = dx / dist;
  const bend = Math.min(38, dist * 0.16);
  const side = ((edge.from + edge.to) % 2 === 0) ? 1 : -1;
  const offset = bend * side;
  const c1 = {
    x: start.x + dx * 0.28 + perpX * offset,
    y: start.y + dy * 0.28 + perpY * offset
  };
  const c2 = {
    x: start.x + dx * 0.72 + perpX * offset * 0.6,
    y: start.y + dy * 0.72 + perpY * offset * 0.6
  };
  return { start, end, c1, c2 };
}

export function fmt(num: number) {
  return num.toFixed(2);
}

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return "blocked";
  const clamped = Math.max(0, Math.floor(seconds));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatHumanDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return "blocked";
  const clamped = Math.max(0, Math.floor(seconds));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function fmtPercent(ratio: number) {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function getFlowColor(flow: number) {
  if (flow <= 0) return 0x8b7a5a;
  if (flow < 35) return 0x2a6a4a;
  if (flow < 70) return 0x1a5a3a;
  if (flow < 100) return 0x1a5a3a;
  return 0xc87a14;
}

export function makeText(label: string, size: number, color: number) {
  return new PIXI.Text({
    text: label,
    style: {
      fontFamily: SERIF_FONT_FAMILY,
      fontSize: size,
      fill: color,
      fontWeight: "700"
    }
  });
}

export function makeSerifText(
  label: string,
  size: number,
  color: number,
  { bold = false, cjk = false, letterSpacing = 0, align = "center" } = {}
) {
  return new PIXI.Text({
    text: label,
    style: {
      fontFamily: cjk ? CJK_FONT_FAMILY : SERIF_FONT_FAMILY,
      fontSize: size,
      fill: color,
      fontWeight: bold ? "700" : "400",
      letterSpacing,
      align
    }
  });
}
