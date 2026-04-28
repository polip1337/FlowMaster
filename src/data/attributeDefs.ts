import type { CombatAttributes, CultivationAttributes } from "../core/attributes/types";

type PartialCultivation = Partial<CultivationAttributes>;
type PartialCombat = Partial<CombatAttributes>;

export interface NodeAttributeDef {
  cultivation: PartialCultivation;
  combat: PartialCombat;
}

const Z: NodeAttributeDef = { cultivation: {}, combat: {} };

/**
 * TASK-091
 * Base per-node contributions used by Phase 10 attribute aggregation.
 * Values are intentionally small and are scaled by resonance/rank/level multipliers.
 */
export const ATTRIBUTE_DEFS_BY_NODE_ID: Record<string, NodeAttributeDef> = {
  MULADHARA: {
    cultivation: { maxEnergyBonus: 10, unlockEfficiency: 2, jingGenerationRate: 0.2 },
    combat: { grounding: 8, physicalDurability: 12 }
  },
  SVADHISTHANA: {
    cultivation: { circulationSpeed: 8, maxEnergyBonus: 6, jingGenerationRate: 0.15 },
    combat: { mobility: 4, energyRecovery: 3 }
  },
  MANIPURA: {
    cultivation: { yangQiConversionEfficiency: 10, circulationSpeed: 4 },
    combat: { physicalPower: 12, techniquePower: 5 }
  },
  ANAHATA: {
    cultivation: { shenGenerationRate: 0.25, meridianRepairRate: 6, daoInsightGain: 1.2 },
    combat: { soulDurability: 10, energyRecovery: 5 }
  },
  VISHUDDHA: {
    cultivation: { refinementRate: 8, daoInsightGain: 1.5 },
    combat: { techniquePower: 10, soulPower: 6 }
  },
  AJNA: {
    cultivation: { criticalInsight: 20, shenGenerationRate: 0.2 },
    combat: { soulPower: 8, mobility: 3 }
  },
  SAHASRARA: {
    cultivation: { daoInsightGain: 3, maxEnergyBonus: 8, shenGenerationRate: 0.3 },
    combat: { soulDurability: 8, techniquePower: 6 }
  },
  BINDU: {
    cultivation: { meridianRepairRate: 10, unlockEfficiency: 2, jingGenerationRate: 0.1 },
    combat: { grounding: 5, soulDurability: 6 }
  },
  L_SHOULDER: { cultivation: { circulationSpeed: 2 }, combat: { physicalPower: 4, grounding: 2 } },
  R_SHOULDER: { cultivation: { circulationSpeed: 2 }, combat: { physicalPower: 4, grounding: 2 } },
  L_ELBOW: { cultivation: { refinementRate: 2 }, combat: { attackSpeed: 2, physicalPower: 2 } },
  R_ELBOW: { cultivation: { refinementRate: 2 }, combat: { attackSpeed: 2, physicalPower: 2 } },
  L_WRIST: { cultivation: { refinementRate: 3, circulationSpeed: 1 }, combat: { attackSpeed: 3, mobility: 2 } },
  R_WRIST: { cultivation: { refinementRate: 3, circulationSpeed: 1 }, combat: { attackSpeed: 3, mobility: 2 } },
  L_HAND: { cultivation: { maxEnergyBonus: 2 }, combat: { techniquePower: 4, attackSpeed: 2 } },
  R_HAND: { cultivation: { maxEnergyBonus: 2 }, combat: { techniquePower: 4, attackSpeed: 2 } },
  L_HIP: { cultivation: { jingGenerationRate: 0.12, unlockEfficiency: 1 }, combat: { grounding: 3, mobility: 2 } },
  R_HIP: { cultivation: { jingGenerationRate: 0.12, unlockEfficiency: 1 }, combat: { grounding: 3, mobility: 2 } },
  L_KNEE: { cultivation: { circulationSpeed: 1 }, combat: { mobility: 4, physicalDurability: 2 } },
  R_KNEE: { cultivation: { circulationSpeed: 1 }, combat: { mobility: 4, physicalDurability: 2 } },
  L_ANKLE: { cultivation: { refinementRate: 1 }, combat: { mobility: 3, grounding: 2 } },
  R_ANKLE: { cultivation: { refinementRate: 1 }, combat: { mobility: 3, grounding: 2 } },
  L_FOOT: { cultivation: { jingGenerationRate: 0.15 }, combat: { grounding: 4, physicalDurability: 2 } },
  R_FOOT: { cultivation: { jingGenerationRate: 0.15 }, combat: { grounding: 4, physicalDurability: 2 } }
};

export function getNodeAttributeDef(nodeId: string): NodeAttributeDef {
  return ATTRIBUTE_DEFS_BY_NODE_ID[nodeId] ?? Z;
}
