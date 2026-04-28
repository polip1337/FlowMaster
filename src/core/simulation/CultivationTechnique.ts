/**
 * S-002 — Cultivation technique definition (TASK-054 / TASK-064).
 */

export interface CultivationTechnique {
  id: string;
  name: string;
  /** 0.5–2.0 typical scale by rank. */
  strength: number;
  rankRequirement: number;
  description: string;
}

export const BASIC_TECHNIQUE: CultivationTechnique = {
  id: "basic",
  name: "Basic Circulation",
  strength: 0.5,
  rankRequirement: 1,
  description: "Foundational breath circulation; modest active meridian pump strength."
};

export const TECHNIQUES: CultivationTechnique[] = [
  BASIC_TECHNIQUE,
  {
    id: "adept",
    name: "Adept Circulation",
    strength: 1.0,
    rankRequirement: 3,
    description: "Stronger pump along active routes once meridians stabilize."
  },
  {
    id: "master",
    name: "Master Circulation",
    strength: 1.5,
    rankRequirement: 6,
    description: "High-rank technique pressure for late-game route training."
  }
];
