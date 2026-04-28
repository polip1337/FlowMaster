export interface CultivationAttributes {
  maxEnergyBonus: number;
  circulationSpeed: number;
  refinementRate: number;
  unlockEfficiency: number;
  daoInsightGain: number;
  meridianRepairRate: number;
  jingGenerationRate: number;
  yangQiConversionEfficiency: number;
  shenGenerationRate: number;
  criticalInsight: number;
}

export interface CombatAttributes {
  physicalPower: number;
  techniquePower: number;
  soulPower: number;
  mobility: number;
  grounding: number;
  attackSpeed: number;
  energyRecovery: number;
  physicalDurability: number;
  soulDurability: number;
}

export function createEmptyCultivationAttributes(): CultivationAttributes {
  return {
    maxEnergyBonus: 0,
    circulationSpeed: 0,
    refinementRate: 0,
    unlockEfficiency: 0,
    daoInsightGain: 0,
    meridianRepairRate: 0,
    jingGenerationRate: 0,
    yangQiConversionEfficiency: 0,
    shenGenerationRate: 0,
    criticalInsight: 0
  };
}

export function createEmptyCombatAttributes(): CombatAttributes {
  return {
    physicalPower: 0,
    techniquePower: 0,
    soulPower: 0,
    mobility: 0,
    grounding: 0,
    attackSpeed: 0,
    energyRecovery: 0,
    physicalDurability: 0,
    soulDurability: 0
  };
}
