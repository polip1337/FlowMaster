// FlowMaster: edge (meridian channel) rendering — PIXI Graphics only.
// Reads edgeVisuals, nodePositions, hoveredEdgeKey/Target, selectedNodeId.

function createEdgeVisual(edge) {
  const line = new PIXI.Graphics();
  const echo = new PIXI.Graphics();
  const dots = new PIXI.Graphics();
  const label = makeSerifText("", 11, 0x2a2318);
  label.anchor.set(0.5);
  edgeLayer.addChild(line, echo, dots, label);
  edgeVisuals[edge.key] = { line, echo, dots, label };
}

function deleteEdgeVisual(edgeKey) {
  const visual = edgeVisuals[edgeKey];
  if (!visual) return;
  visual.line.destroy();
  visual.echo.destroy();
  visual.dots.destroy();
  visual.label.destroy();
  delete edgeVisuals[edgeKey];
}

function getEdgeIntensity(flow) {
  const inBurst = resonanceBurstTicks > 0;
  if (flow >= 100 || (flow > 0 && inBurst)) return "burst";
  if (flow >= 61) return "high";
  if (flow >= 26) return "mid";
  if (flow > 0) return "low";
  return "idle";
}

function getEdgeStyle(intensity) {
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

function drawBezierPath(g, start, c1, c2, end, dashed, style) {
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

function redrawEdge(edge) {
  const visual = edgeVisuals[edge.key];
  if (!visual) return;
  visual.line.clear();
  visual.echo.clear();
  visual.dots.clear();
  visual.label.text = "";

  if (!visibleNodeIds.has(edge.from) || !visibleNodeIds.has(edge.to)) return;

  const bezier = computeEdgeBezier(edge);
  if (!bezier) return;
  const { start, end, c1, c2 } = bezier;

  const intensity = getEdgeIntensity(edge.flow);
  const baseStyle = getEdgeStyle(intensity);
  const hovered = hoveredEdgeKey === edge.key;
  const highlight = hovered || hoveredTargetNodeId === edge.to || edge.to === selectedNodeId || edge.from === selectedNodeId;

  const style = {
    width: hovered ? baseStyle.width + 1.5 : baseStyle.width,
    color: hovered ? 0xc87a14 : baseStyle.color,
    alpha: highlight ? Math.min(1, baseStyle.alpha + 0.15) : baseStyle.alpha,
    cap: "round"
  };

  drawBezierPath(visual.line, start, c1, c2, end, baseStyle.dashed, style);

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
      width: 1.6,
      color: 0xe8a830,
      alpha: 0.85,
      cap: "round"
    });
  }

  if (baseStyle.dotCount > 0) {
    const count = baseStyle.dotCount;
    const baseRadius = 3 + baseStyle.width * 0.3;
    const tsByCount = {
      1: [0.5],
      2: [0.35, 0.65],
      3: [0.28, 0.5, 0.72]
    };
    const ts = tsByCount[count];
    for (let i = 0; i < count; i += 1) {
      const t = ts[i];
      const p = cubicBezierPoint(start, c1, c2, end, t);
      const fade = 1 - t * 0.55;
      visual.dots.circle(p.x, p.y, baseRadius);
      visual.dots.fill({ color: baseStyle.color, alpha: Math.min(1, baseStyle.alpha + 0.2) * fade });
    }
  }

  if (edge.flow > 0) {
    const midpoint = cubicBezierPoint(start, c1, c2, end, 0.5);
    const transferPerSecond = getEdgeTransferPerTick(edge) * TICKS_PER_SECOND;
    visual.label.text = `${edge.flow}%  ${fmt(transferPerSecond)} SI/s`;
    visual.label.style.fill = intensity === "burst" ? 0x6b3d04 : 0x2a2318;
    visual.label.style.fontSize = 10;
    visual.label.style.letterSpacing = 0.5;
    visual.label.position.set(midpoint.x, midpoint.y + 16);
  }
}
