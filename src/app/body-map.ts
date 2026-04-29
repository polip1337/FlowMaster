import { TIER2_NODES } from "./constants.ts";
import {
  st,
  statusEl,
  routeMetricsEl,
  confirmRouteBtnEl,
  drawRouteBtnEl,
  galaxyToggleBtnEl,
  meridianDetailEl,
  reverseMeridianBtnEl
} from "./state.ts";
import { cubicBezierPoint } from "./utils.ts";
import { applyInventoryToTier2Target } from "./phase29-panels.ts";
import { makeMeridianId, parseForwardId } from "../../src/core/meridians/meridianId";

type BodyMapLinkDef = {
  from: string;
  to: string;
  canonicalDir: string;
};

const BODY_MAP_LINKS: BodyMapLinkDef[] = [
  { from: "crown", to: "mind", canonicalDir: "SPINE_CROWN" },
  { from: "mind", to: "intent", canonicalDir: "SPINE_AJNA" },
  { from: "intent", to: "qi", canonicalDir: "SPINE_THROAT" },
  { from: "qi", to: "heart", canonicalDir: "SPINE_HEART" },
  { from: "heart", to: "stomach", canonicalDir: "SPINE_SOLAR" },
  { from: "stomach", to: "dantian", canonicalDir: "SPINE_SACRAL" },
  { from: "dantian", to: "spine", canonicalDir: "SPINE_ROOT" },
  { from: "spine", to: "kneeLeft", canonicalDir: "LEG_LEFT_UPPER" },
  { from: "kneeLeft", to: "footLeft", canonicalDir: "LEG_LEFT_LOWER" },
  { from: "spine", to: "kneeRight", canonicalDir: "LEG_RIGHT_UPPER" },
  { from: "kneeRight", to: "footRight", canonicalDir: "LEG_RIGHT_LOWER" }
];

export type MeridianUiRecord = {
  id: string;
  nodeFromId: string;
  nodeToId: string;
  ioNodeOutId: number;
  ioNodeInId: number;
  state: "UNESTABLISHED" | "NASCENT" | "DEVELOPED" | "REFINED" | "TRANSCENDENT";
  width: number;
  purity: number;
  totalFlow: number;
  jingDeposit: number;
  shenScatterBonus: number;
  basePurity: number;
  typeAffinity: "Qi" | "Jing" | "YangQi" | "Shen" | null;
  affinityFraction: number;
  dominantTypeAccumulator: Record<string, number>;
  isEstablished: boolean;
  isScarred: boolean;
  scarPenalty: number;
  flowBonusPercent: number;
  hasReverseCandidate: boolean;
};

const meridianVisuals = new Map<string, { line: any; routeOverlay: any }>();
let greatCirculationWave: any = null;

function getMarkerNodeById(id: string) {
  return TIER2_NODES.find((n) => n.id === id) ?? null;
}

function getMeridianId(from: string, to: string): string {
  return makeMeridianId(from, to);
}

function getMeridianIdCandidates(from: string, to: string): string[] {
  const canonical = makeMeridianId(from, to);
  const legacy = `${from}->${to}`;
  return canonical === legacy ? [canonical] : [canonical, legacy];
}

function getMeridianRecord(meridians: Map<string, MeridianUiRecord>, from: string, to: string) {
  for (const id of getMeridianIdCandidates(from, to)) {
    const record = meridians.get(id);
    if (record) {
      return { id, record };
    }
  }
  return null;
}

function separatorForId(id: string): "legacy" | "canonical" {
  return id.includes("->") ? "legacy" : "canonical";
}

function buildMeridianId(from: string, to: string, format: "legacy" | "canonical"): string {
  return format === "legacy" ? `${from}->${to}` : makeMeridianId(from, to);
}

function makeInitialMeridian(def: BodyMapLinkDef): MeridianUiRecord {
  return {
    id: getMeridianId(def.from, def.to),
    nodeFromId: def.from,
    nodeToId: def.to,
    ioNodeOutId: 0,
    ioNodeInId: 0,
    state: "UNESTABLISHED",
    width: 0,
    purity: 0.55,
    totalFlow: 0,
    jingDeposit: 0,
    shenScatterBonus: 0,
    basePurity: 0.55,
    typeAffinity: null,
    affinityFraction: 0,
    dominantTypeAccumulator: { Qi: 0, Jing: 0, YangQi: 0, Shen: 0 },
    isEstablished: false,
    isScarred: false,
    scarPenalty: 0,
    flowBonusPercent: 0,
    hasReverseCandidate: false
  };
}

export function ensureBodyMapUiState() {
  if (!st.bodyMapMeridians) {
    st.bodyMapMeridians = new Map<string, MeridianUiRecord>();
    for (const def of BODY_MAP_LINKS) {
      st.bodyMapMeridians.set(getMeridianId(def.from, def.to), makeInitialMeridian(def));
    }
  }
  if (!Array.isArray(st.routeDraftNodeIds)) st.routeDraftNodeIds = [];
  if (!Array.isArray(st.activeBodyRouteNodeIds)) st.activeBodyRouteNodeIds = [];
}

export function getRouteDraftMetrics(nodeIds: string[], meridians: Map<string, MeridianUiRecord>) {
  if (nodeIds.length < 2) {
    return { efficiency: 0, bottleneck: "n/a", heat: 0 };
  }
  let bottleneck = Number.POSITIVE_INFINITY;
  let bottleneckId = "n/a";
  let heat = 0;
  for (let i = 0; i < nodeIds.length - 1; i += 1) {
    const candidate = getMeridianRecord(meridians, nodeIds[i], nodeIds[i + 1]);
    const id = candidate?.id ?? getMeridianId(nodeIds[i], nodeIds[i + 1]);
    const m = candidate?.record;
    if (!m || !m.isEstablished) {
      continue;
    }
    const score = Math.max(0, m.width) * Math.max(0, Math.min(1, m.purity));
    if (score < bottleneck) {
      bottleneck = score;
      bottleneckId = id;
    }
    heat += Math.max(0, m.width) * (1 - Math.max(0, Math.min(1, m.purity))) * 0.2;
  }
  const efficiency = Math.min(1.2, 0.6 + 0.06 * Math.max(0, nodeIds.length - 2));
  return {
    efficiency,
    bottleneck: bottleneckId,
    heat
  };
}

function setRouteStatusText() {
  const metrics = getRouteDraftMetrics(st.routeDraftNodeIds, st.bodyMapMeridians ?? new Map());
  const hasLoop = st.routeDraftNodeIds.length >= 3 &&
    st.routeDraftNodeIds[0] === st.routeDraftNodeIds[st.routeDraftNodeIds.length - 1];
  const routeEl = routeMetricsEl;
  if (!routeEl) return;
  routeEl.innerHTML = `
    <div>Draft: <strong>${st.routeDraftNodeIds.join(" → ") || "none"}</strong></div>
    <div>Efficiency: <strong>${(metrics.efficiency * 100).toFixed(1)}%</strong></div>
    <div>Bottleneck: <strong>${metrics.bottleneck}</strong></div>
    <div>Heat: <strong>${metrics.heat.toFixed(3)}/tick</strong></div>
    <div>Loop: <strong>${hasLoop ? "closed" : "open"}</strong></div>
  `;
  if (confirmRouteBtnEl) {
    (confirmRouteBtnEl as HTMLButtonElement).disabled = !hasLoop;
  }
}

export function setRouteDrawingMode(enabled: boolean) {
  ensureBodyMapUiState();
  st.routeDrawingMode = enabled;
  if (!enabled) {
    st.routeDraftNodeIds = [];
  }
  setRouteStatusText();
  if (statusEl) {
    statusEl.textContent = enabled
      ? "Draw Route enabled. Click T2 markers to draft a loop."
      : "Draw Route disabled.";
  }
}

export function handleTier2MarkerRouteClick(tier2Id: string): boolean {
  if (applyInventoryToTier2Target(tier2Id)) {
    return true;
  }
  if (!st.symbolModeEnabled || !st.routeDrawingMode) {
    return false;
  }
  const draft = st.routeDraftNodeIds;
  if (draft.length === 0) {
    draft.push(tier2Id);
    setRouteStatusText();
    return true;
  }
  const first = draft[0];
  const last = draft[draft.length - 1];
  if (tier2Id === first && draft.length >= 3) {
    if (last !== first) draft.push(first);
    setRouteStatusText();
    return true;
  }
  if (tier2Id !== last) draft.push(tier2Id);
  setRouteStatusText();
  return true;
}

export function confirmRouteDraft() {
  const draft = st.routeDraftNodeIds;
  if (draft.length < 3 || draft[0] !== draft[draft.length - 1]) {
    return;
  }
  st.activeBodyRouteNodeIds = [...draft];
  if (statusEl) statusEl.textContent = `Route confirmed: ${draft.join(" → ")}`;
}

export function openMeridianDetail(meridianId: string) {
  ensureBodyMapUiState();
  const meridians = st.bodyMapMeridians;
  if (!meridians || !meridianDetailEl) return;
  const m = meridians.get(meridianId);
  if (!m) return;
  st.selectedBodyMapMeridianId = meridianId;
  const affinity = m.typeAffinity ? `${m.typeAffinity} ${(m.affinityFraction * 100).toFixed(1)}%` : "none";
  meridianDetailEl.innerHTML = `
    <div><strong>${m.id}</strong></div>
    <div>state: ${m.state}</div>
    <div>from/to: ${m.nodeFromId} → ${m.nodeToId}</div>
    <div>io out/in: ${m.ioNodeOutId} / ${m.ioNodeInId}</div>
    <div>width: ${m.width.toFixed(2)}</div>
    <div>purity: ${m.purity.toFixed(3)}</div>
    <div>totalFlow: ${m.totalFlow.toFixed(2)}</div>
    <div>basePurity: ${m.basePurity.toFixed(2)}</div>
    <div>jingDeposit: ${m.jingDeposit.toFixed(2)}</div>
    <div>shenScatterBonus: ${m.shenScatterBonus.toFixed(2)}</div>
    <div>isEstablished: ${m.isEstablished ? "yes" : "no"}</div>
    <div>isScarred: ${m.isScarred ? "yes" : "no"} (penalty ${m.scarPenalty.toFixed(2)})</div>
    <div>affinity: <span class="meridian-affinity-badge">${affinity}</span></div>
    <div>flowBonus: ${m.flowBonusPercent.toFixed(2)}%</div>
  `;
  if (reverseMeridianBtnEl) {
    (reverseMeridianBtnEl as HTMLButtonElement).disabled = !m.hasReverseCandidate;
    reverseMeridianBtnEl.setAttribute("data-meridian-id", m.id);
  }
}

export function tryOpenReverseMeridian(meridianId: string) {
  const parsed = (() => {
    try {
      return parseForwardId(meridianId);
    } catch {
      return null;
    }
  })();
  const candidate = parsed && st.bodyMapMeridians
    ? getMeridianRecord(st.bodyMapMeridians, parsed[0], parsed[1])
    : null;
  const m = candidate?.record ?? st.bodyMapMeridians?.get(meridianId);
  if (!m) return;
  m.hasReverseCandidate = false;
  const format = separatorForId(candidate?.id ?? meridianId);
  const reverseId = buildMeridianId(m.nodeToId, m.nodeFromId, format);
  if (!st.bodyMapMeridians?.has(reverseId)) {
    st.bodyMapMeridians?.set(reverseId, {
      ...m,
      id: reverseId,
      nodeFromId: m.nodeToId,
      nodeToId: m.nodeFromId,
      isEstablished: true,
      state: "NASCENT",
      width: Math.max(1, m.width * 0.75),
      flowBonusPercent: Math.max(0, m.flowBonusPercent * 0.6),
      hasReverseCandidate: false
    });
  }
  const reverseCanonical = buildMeridianId(m.nodeToId, m.nodeFromId, "canonical");
  const reverseLegacy = buildMeridianId(m.nodeToId, m.nodeFromId, "legacy");
  const reverseRecord = st.bodyMapMeridians?.get(reverseId) ?? st.bodyMapMeridians?.get(reverseCanonical);
  if (reverseRecord) {
    st.bodyMapMeridians?.set(reverseCanonical, reverseRecord);
    st.bodyMapMeridians?.set(reverseLegacy, reverseRecord);
  }
  openMeridianDetail(reverseId);
}

export function redrawBodyMapMeridians() {
  ensureBodyMapUiState();
  if (!st.symbolModeEnabled || !st.bodyMapMeridianLayer || !st.bodyMapMeridians) return;
  const activeRouteEdges = new Set<string>();
  for (let i = 0; i < st.activeBodyRouteNodeIds.length - 1; i += 1) {
    activeRouteEdges.add(getMeridianId(st.activeBodyRouteNodeIds[i], st.activeBodyRouteNodeIds[i + 1]));
  }
  const draftRouteEdges = new Set<string>();
  for (let i = 0; i < st.routeDraftNodeIds.length - 1; i += 1) {
    draftRouteEdges.add(getMeridianId(st.routeDraftNodeIds[i], st.routeDraftNodeIds[i + 1]));
  }

  for (const [id, m] of st.bodyMapMeridians.entries()) {
    if (id.includes("->")) {
      continue;
    }
    const from = getMarkerNodeById(m.nodeFromId);
    const to = getMarkerNodeById(m.nodeToId);
    if (!from || !to) continue;
    let visual = meridianVisuals.get(id);
    if (!visual) {
      const line = new PIXI.Graphics();
      line.eventMode = "static";
      line.cursor = "pointer";
      line.on("pointertap", () => openMeridianDetail(id));
      const routeOverlay = new PIXI.Graphics();
      st.bodyMapMeridianLayer.addChild(line, routeOverlay);
      visual = { line, routeOverlay };
      meridianVisuals.set(id, visual);
    }
    visual.line.clear();
    visual.routeOverlay.clear();
    const start = { x: from.x, y: from.y };
    const end = { x: to.x, y: to.y };
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.hypot(dx, dy) || 1;
    const perpX = -dy / dist;
    const perpY = dx / dist;
    const bend = Math.min(26, dist * 0.12);
    const c1 = { x: start.x + dx * 0.3 + perpX * bend, y: start.y + dy * 0.3 + perpY * bend };
    const c2 = { x: start.x + dx * 0.7 + perpX * bend * 0.6, y: start.y + dy * 0.7 + perpY * bend * 0.6 };
    const galaxy = Boolean(st.galaxyViewEnabled);

    const breakthroughActive = st.breakthroughFxTicks > 0;
    const lineColor = breakthroughActive
      ? 0xffffff
      : m.isEstablished ? (galaxy ? 0x9ec4ff : 0x4ea3ff) : 0x8a8a8a;
    const width = m.isEstablished ? Math.max(1.5, m.width) : 1.3;
    const alpha = breakthroughActive
      ? 0.95
      : m.isEstablished ? Math.max(0.2, Math.min(1, m.purity)) : 0.65;
    const dashed = !m.isEstablished;
    drawBezier(visual.line, start, c1, c2, end, {
      color: lineColor,
      width,
      alpha,
      dashed
    });

    if (draftRouteEdges.has(id) || activeRouteEdges.has(id)) {
      drawBezier(visual.routeOverlay, start, c1, c2, end, {
        color: 0x35d27d,
        width: draftRouteEdges.has(id) ? 2 : 3,
        alpha: draftRouteEdges.has(id) ? 0.9 : 0.75,
        dashed: true
      });
    }
  }
  if (st.coreActiveRouteLength >= 24) {
    if (!greatCirculationWave) {
      greatCirculationWave = new PIXI.Graphics();
      st.bodyMapMeridianLayer.addChild(greatCirculationWave);
    }
    const t = st.tickCounter * (0.01 + Math.max(0, st.circulationSpeedPercent) * 0.00025);
    const x = 740 + Math.sin(t) * 190;
    const y = 1060 + Math.cos(t * 0.8) * 860;
    greatCirculationWave.clear();
    greatCirculationWave.circle(x, y, 18);
    greatCirculationWave.stroke({ width: 3.2, color: 0xffd866, alpha: 0.85 });
    greatCirculationWave.circle(x, y, 7);
    greatCirculationWave.fill({ color: 0xffe7a8, alpha: 0.65 });
  } else if (greatCirculationWave) {
    greatCirculationWave.clear();
  }
}

function drawBezier(
  g: any,
  start: { x: number; y: number },
  c1: { x: number; y: number },
  c2: { x: number; y: number },
  end: { x: number; y: number },
  style: { color: number; width: number; alpha: number; dashed: boolean }
) {
  if (!style.dashed) {
    g.moveTo(start.x, start.y);
    g.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y);
    g.stroke({ color: style.color, width: style.width, alpha: style.alpha, cap: "round" });
    return;
  }
  const samples = 48;
  const points = [];
  for (let i = 0; i <= samples; i += 1) {
    points.push(cubicBezierPoint(start, c1, c2, end, i / samples));
  }
  const dashLen = 6;
  const gapLen = 5;
  const cycle = dashLen + gapLen;
  let accum = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    if ((accum % cycle) < dashLen) {
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
    }
    accum += segLen;
  }
  g.stroke({ color: style.color, width: style.width, alpha: style.alpha, cap: "round" });
}

export function bindBodyMapUi() {
  ensureBodyMapUiState();
  drawRouteBtnEl?.addEventListener("click", () => {
    setRouteDrawingMode(!st.routeDrawingMode);
    drawRouteBtnEl?.classList.toggle("active", st.routeDrawingMode);
  });
  confirmRouteBtnEl?.addEventListener("click", () => confirmRouteDraft());
  galaxyToggleBtnEl?.addEventListener("click", () => {
    st.galaxyViewEnabled = !st.galaxyViewEnabled;
    document.body.classList.toggle("galaxy-view", st.galaxyViewEnabled);
    galaxyToggleBtnEl?.classList.toggle("active", st.galaxyViewEnabled);
  });
  reverseMeridianBtnEl?.addEventListener("click", () => {
    const id = reverseMeridianBtnEl?.getAttribute("data-meridian-id");
    if (!id) return;
    tryOpenReverseMeridian(id);
  });
  setRouteStatusText();
}
