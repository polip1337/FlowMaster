import { EnergyType, emptyPool, type EnergyPool } from "../../core/energy/EnergyType";

export type BodyTemperingActionMode = "passive" | "active";

export interface BodyTemperingActionDef {
  id: string;
  name: string;
  mode: BodyTemperingActionMode;
  xpPerTick: number;
  cooldownTicks: number;
  generatedEnergy: EnergyPool;
  hpCostPerUse: number;
  combatDifficultyScaling: boolean;
}

export const BODY_TEMPERING_ACTIONS: BodyTemperingActionDef[] = [
  {
    id: "breath-training",
    name: "Breath Training",
    mode: "passive",
    xpPerTick: 0.02,
    cooldownTicks: 0,
    generatedEnergy: emptyPool(),
    hpCostPerUse: 0,
    combatDifficultyScaling: false
  },
  {
    id: "sprint-training",
    name: "Sprint Training",
    mode: "active",
    xpPerTick: 0.35,
    cooldownTicks: 12,
    generatedEnergy: { ...emptyPool(), [EnergyType.YangQi]: 0.4 },
    hpCostPerUse: 0,
    combatDifficultyScaling: false
  },
  {
    id: "stone-lifting",
    name: "Stone Lifting",
    mode: "active",
    xpPerTick: 0.3,
    cooldownTicks: 10,
    generatedEnergy: { ...emptyPool(), [EnergyType.Jing]: 0.35 },
    hpCostPerUse: 0,
    combatDifficultyScaling: false
  },
  {
    id: "cold-water-immersion",
    name: "Cold Water Immersion",
    mode: "active",
    xpPerTick: 0.7,
    cooldownTicks: 18,
    generatedEnergy: emptyPool(),
    hpCostPerUse: 2.5,
    combatDifficultyScaling: false
  },
  {
    id: "meditation",
    name: "Meditation",
    mode: "active",
    xpPerTick: 0.12,
    cooldownTicks: 8,
    generatedEnergy: { ...emptyPool(), [EnergyType.Shen]: 0.2 },
    hpCostPerUse: 0,
    combatDifficultyScaling: false
  },
  {
    id: "combat-training",
    name: "Combat Training",
    mode: "active",
    xpPerTick: 0.15,
    cooldownTicks: 6,
    generatedEnergy: emptyPool(),
    hpCostPerUse: 0,
    combatDifficultyScaling: true
  }
];
