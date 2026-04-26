// FlowMaster: pure math / formatting / low-level PIXI text helpers.
// No game state access — safe to reuse anywhere.

function drawDashedCircle(g, cx, cy, radius, dashAngle, gapAngle, style) {
  let a = 0;
  while (a < Math.PI * 2 - 0.0001) {
    const a2 = Math.min(a + dashAngle, Math.PI * 2);
    g.arc(cx, cy, radius, a, a2);
    g.stroke(style);
    a = a2 + gapAngle;
  }
}

function cubicBezierPoint(p0, c1, c2, p3, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * p3.y
  };
}

function computeEdgeBezier(edge) {
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

function fmt(num) {
  return num.toFixed(2);
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "blocked";
  const clamped = Math.max(0, Math.floor(seconds));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatHumanDuration(seconds) {
  if (!Number.isFinite(seconds)) return "blocked";
  const clamped = Math.max(0, Math.floor(seconds));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtPercent(ratio) {
  return `${(ratio * 100).toFixed(1)}%`;
}

function getFlowColor(flow) {
  if (flow <= 0) return 0x8b7a5a;
  if (flow < 35) return 0x2a6a4a;
  if (flow < 70) return 0x1a5a3a;
  if (flow < 100) return 0x1a5a3a;
  return 0xc87a14;
}

function makeText(label, size, color) {
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

function makeSerifText(label, size, color, { bold = false, cjk = false, letterSpacing = 0, align = "center" } = {}) {
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
