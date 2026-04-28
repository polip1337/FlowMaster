import {
  FLOW_BONUS_K,
  JING_STRUCTURE_CONST,
  PURITY_SCALE_CONST,
  SCALE_W
} from "../core/constants";

const QUALITY_MULTIPLIER_TABLE = [1.0, 1.25, 1.55, 1.9, 2.35, 2.9, 3.6, 4.45, 5.5, 7.0] as const;
const QUALITY_REFINEMENT_THRESHOLDS = [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600, 0] as const;

export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function qualityMultiplier(q: number): number {
  const index = Math.round(clamp(q, 1, 10)) - 1;
  return QUALITY_MULTIPLIER_TABLE[index];
}

export function qualityRefinementThreshold(q: number): number {
  const index = Math.round(clamp(q, 1, 10)) - 1;
  return QUALITY_REFINEMENT_THRESHOLDS[index];
}

export function logScaleWidth(tf: number, typeFactor: number, base: number, scaleW: number = SCALE_W): number {
  const safeTf = Math.max(0, tf);
  const safeTypeFactor = Math.max(0, typeFactor);
  const safeScaleW = Math.max(1e-9, scaleW);

  return base * (1 + Math.log10(1 + safeTf * safeTypeFactor) / safeScaleW);
}

export function logScalePurityFlow(tf: number, typeFactor: number): number {
  const weightedFlow = Math.max(0, tf) * Math.max(0, typeFactor);
  return 0.35 * (weightedFlow / (weightedFlow + PURITY_SCALE_CONST));
}

export function jingStructuralPurity(deposit: number): number {
  const d = Math.max(0, deposit);
  return 0.25 * (d / (d + JING_STRUCTURE_CONST));
}

export function shenScatterBonus(bonus: number): number {
  return Math.max(0, bonus);
}

export function flowBonusPercent(W: number, Pur: number, tf: number): number {
  const quality = Math.max(0, W) * clamp(Pur, 0, 1);
  const tfFactor = Math.max(0, tf) / 1000;
  return FLOW_BONUS_K * Math.log10(1 + quality) * Math.log10(1 + tfFactor);
}

export function resonanceQualityFactor(qualities: number[]): number {
  if (qualities.length === 0) {
    return 0;
  }

  const sum = qualities.reduce((acc, q) => acc + clamp(q, 1, 10) / 5, 0);
  return sum / qualities.length;
}
