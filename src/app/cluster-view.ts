// Phase 27 — cluster (T1) view: energy-mix orb, refinement ring, Direct Jing repair UI.
// Spec: TaskList TASK-177, TASK-181, TASK-184.

import { NODE_ARC_RADIUS } from './constants.ts';
import { st } from './state.ts';

/** Mirrors `src/utils/math.ts` qualityRefinementThreshold (GDD table). */
const QUALITY_REFINEMENT_THRESHOLDS = [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600, 0] as const;

function qualityRefinementThreshold(quality: number): number {
  const q = Math.min(10, Math.max(1, Math.round(quality)));
  return QUALITY_REFINEMENT_THRESHOLDS[q - 1];
}

/** GDD / TASK-177 palette */
const RGB = {
  qi: { r: 0x6a, g: 0xb4, b: 0xff },
  jing: { r: 0xc8, g: 0xa8, b: 0x30 },
  yangQi: { r: 0xff, g: 0x64, b: 0x20 },
  shen: { r: 0xc8, g: 0x90, b: 0xff }
};

const JING_REPAIR_COST = 1.8;
const REPAIR_PHASE_CRACKED = 90;
const REPAIR_PHASE_SHATTERED = 140;

/** Weighted blend of four sRGB colors; returns PIXI 0xRRGGBB */
export function mixEnergyOrbColor(node: any): number | null {
  const q = Math.max(0, Number(node.energyQi) || 0);
  const j = Math.max(0, Number(node.energyJing) || 0);
  const y = Math.max(0, Number(node.energyYangQi) || 0);
  const s = Math.max(0, Number(node.energyShen) || 0);
  const sum = q + j + y + s;
  if (sum < 1e-9) return null;
  const wq = q / sum;
  const wj = j / sum;
  const wy = y / sum;
  const ws = s / sum;
  const r =
    wq * RGB.qi.r + wj * RGB.jing.r + wy * RGB.yangQi.r + ws * RGB.shen.r;
  const g =
    wq * RGB.qi.g + wj * RGB.jing.g + wy * RGB.yangQi.g + ws * RGB.shen.g;
  const b =
    wq * RGB.qi.b + wj * RGB.jing.b + wy * RGB.yangQi.b + ws * RGB.shen.b;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

/** Heuristic split from legacy SI + cultivation path until full EnergyPool sim lands. */
export function syncEnergyPoolsFromGameplay(nodes: any[]): void {
  for (const node of nodes) {
    if (!node.unlocked && node.id !== 0) {
      node.energyQi = 0;
      node.energyJing = 0;
      node.energyYangQi = 0;
      node.energyShen = 0;
      continue;
    }
    const si = Math.max(0, Number(node.si) || 0);
    const path = String(node.attributeType ?? "").toLowerCase();
    let wq = 0.58;
    let wj = 0.14;
    let wy = 0.14;
    let ws = 0.14;
    if (path.includes("essence")) {
      wj += 0.12;
      wq -= 0.08;
    }
    if (path.includes("fortitude")) {
      wy += 0.12;
      wq -= 0.06;
    }
    if (path.includes("insight") || path.includes("void")) {
      ws += 0.1;
      wq -= 0.05;
    }
    if (path.includes("flow")) {
      wq += 0.08;
      ws -= 0.04;
      wy -= 0.04;
    }
    const n = Math.max(1e-6, wq + wj + wy + ws);
    node.energyQi = si * (wq / n);
    node.energyJing = si * (wj / n);
    node.energyYangQi = si * (wy / n);
    node.energyShen = si * (ws / n);
  }
}

export function stepRefinementFromSi(nodes: any[]): void {
  for (const node of nodes) {
    if (!(node.unlocked || node.id === 0)) continue;
    const prev = typeof node._prevSiRefine === "number" ? node._prevSiRefine : node.si;
    const gain = Math.max(0, Number(node.si) - prev);
    if (gain > 0) {
      node.refinementPoints = (Number(node.refinementPoints) || 0) + gain / 1000;
    }
    let q = Math.min(10, Math.max(1, Math.round(Number(node.quality) || 1)));
    while (q < 10) {
      const th = qualityRefinementThreshold(q);
      if (th <= 0 || (Number(node.refinementPoints) || 0) < th) break;
      node.refinementPoints = (Number(node.refinementPoints) || 0) - th;
      q += 1;
    }
    node.quality = q;
    node._prevSiRefine = node.si;
  }
}

export function hasDamagedT1(nodes: any[]): boolean {
  return nodes.some((n) => n.damageState === "cracked" || n.damageState === "shattered");
}

export function stepDirectJingRepair(nodes: any[]): void {
  if (!st.directJingRepairActive) return;
  for (const node of nodes) {
    if (node.damageState !== "cracked" && node.damageState !== "shattered") continue;
    if (st.bodyJingPool < JING_REPAIR_COST) break;
    st.bodyJingPool -= JING_REPAIR_COST;
    node.repairAccumulator = (Number(node.repairAccumulator) || 0) + 1;
    const phase = node.damageState === "shattered" ? REPAIR_PHASE_SHATTERED : REPAIR_PHASE_CRACKED;
    if (node.repairAccumulator >= phase) {
      node.repairAccumulator = 0;
      if (node.damageState === "shattered") node.damageState = "cracked";
      else node.damageState = "healthy";
    }
  }
}

/** 0–1 progress toward next quality tier; 1 when quality === 10 */
export function refinementRingProgress(node: any): number {
  const q = Math.min(10, Math.max(1, Math.round(Number(node.quality) || 1)));
  if (q >= 10) return 1;
  const th = qualityRefinementThreshold(q);
  if (th <= 0) return 1;
  const rp = Number(node.refinementPoints) || 0;
  return Math.max(0, Math.min(1, rp / th));
}

export function drawT1QualityRing(g: any, node: any, tickCounter: number): void {
  g.clear();
  const state = node.unlocked || node.id === 0 ? 1 : 0;
  if (state === 0) return;

  const q = Math.min(10, Math.max(1, Math.round(Number(node.quality) || 1)));
  const r = NODE_ARC_RADIUS + 5;
  const start = -Math.PI / 2;

  if (q >= 10) {
    drawStarOutline(g, r + 4, 0xc8a830, tickCounter);
    return;
  }

  const prog = refinementRingProgress(node);
  g.circle(0, 0, r);
  g.stroke({ width: 1, color: 0x8b7a5a, alpha: 0.35 });
  if (prog > 0.001) {
    const end = start + Math.PI * 2 * prog;
    g.arc(0, 0, r, start, end);
    g.stroke({ width: 2.2, color: 0xc8a830, alpha: 0.92, cap: "round" });
  }
}

function drawStarOutline(g: any, outerR: number, color: number, tick: number): void {
  const innerR = outerR * 0.42;
  const rot = -Math.PI / 2 + (tick * 0.002);
  for (let i = 0; i <= 10; i += 1) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = rot + (i * Math.PI) / 5;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.stroke({ width: 1.4, color, alpha: 0.85 });
}

const JING_GLOW = 0xc8a830;

export function drawRepairPulse(g: any, node: any, tickCounter: number): void {
  g.clear();
  if (!st.directJingRepairActive) return;
  if (node.damageState !== "cracked" && node.damageState !== "shattered") return;
  const pulse = 0.35 + 0.25 * Math.sin(tickCounter * 0.12);
  const r = NODE_ARC_RADIUS + 10;
  g.circle(0, 0, r);
  g.stroke({ width: 2.4, color: JING_GLOW, alpha: pulse });
}

export function updateClusterRepairDom(nodes: any[]): void {
  const row = document.getElementById("clusterRepairRow");
  const toggle = document.getElementById("directJingToggle") as HTMLInputElement | null;
  const label = document.getElementById("bodyJingPoolLabel");
  if (!row || !toggle || !label) return;
  const show = hasDamagedT1(nodes);
  row.style.display = show ? "flex" : "none";
  if (show) {
    toggle.checked = st.directJingRepairActive;
    label.textContent = `Body Jing pool: ${st.bodyJingPool.toFixed(0)}`;
  }
}

export function bindClusterRepairUi(): void {
  const toggle = document.getElementById("directJingToggle") as HTMLInputElement | null;
  toggle?.addEventListener("change", () => {
    st.directJingRepairActive = Boolean(toggle.checked);
  });
}

/** Dev-only: mark first unlocked non-core node damaged for UI testing */
export function devCrackRandomT1(nodes: any[]): boolean {
  const candidates = nodes.filter((n) => n.id !== 0 && n.unlocked && n.damageState === "healthy");
  const pick = candidates[0] ?? nodes.find((n) => n.id !== 0 && n.damageState === "healthy");
  if (!pick) return false;
  pick.damageState = "cracked";
  pick.repairAccumulator = 0;
  return true;
}
