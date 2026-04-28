import type { T2Node } from "../nodes/T2Node";
import type { EnergyPool } from "../energy/EnergyType";

export enum DaoType {
  Earth = "Earth",
  Fire = "Fire",
  Water = "Water",
  Wind = "Wind",
  Void = "Void",
  Life = "Life",
  Sword = "Sword",
  Thunder = "Thunder"
}

export interface DaoNodeDef {
  id: string;
  daoType: DaoType;
  name: string;
  nodeIndex: number;
  topologyId: string;
  bodyOverlayPosition: { x: number; y: number };
  associatedSkillId: string;
}

export type SkillCategory = "physical" | "technique" | "movement" | "soul" | "passive";

export interface SkillDef {
  id: string;
  daoType: DaoType;
  category: SkillCategory;
  energyCost: EnergyPool;
  damageFormula: string;
  cooldownTicks: number;
  unlockedByDaoNode: string;
}

export interface PlayerDao {
  selectedDao: DaoType | null;
  daoNodes: Map<string, T2Node>;
  daoInsights: number;
  insightThresholds: number[];
  comprehensionLevel: number;
  resetCost: number;
  selectedAtBodyRank: number | null;
  availableSkillIds: string[];
  fullyComprehended: boolean;
  processedBreakthroughEvents: number;
}
