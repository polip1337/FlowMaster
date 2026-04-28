import { DaoType } from "../../core/dao/types";
import { EnergyType } from "../../core/energy/EnergyType";
import type { Sect } from "../../core/sect/types";

export const SECTS: Sect[] = [
  {
    id: "iron-foundation-sect",
    name: "The Iron Foundation Sect",
    homeElder: {
      id: "elder-iron-marrow",
      name: "Elder Iron Marrow",
      daoType: DaoType.Earth,
      realm: 4,
      favorLevel: 0,
      teachableManuals: ["iron-bone-canon", "deep-root-breath", "mountain-heart-method"],
      requirement: [{ type: "node_rank", nodeId: "MULADHARA", minRank: 2 }]
    },
    availableFormationArrays: [
      { id: "iron-vessel-array", name: "Iron Vessel Array", energyType: EnergyType.Jing, perTickGeneration: 3 },
      { id: "earthpulse-array", name: "Earthpulse Array", energyType: EnergyType.Qi, perTickGeneration: 2 }
    ],
    memberBenefits: {
      cultivation: { jingGenerationRate: 12, meridianRepairRate: 6 },
      combat: { physicalDurability: 10, grounding: 8 }
    }
  },
  {
    id: "heaven-striking-order",
    name: "The Heaven-Striking Order",
    homeElder: {
      id: "elder-skybreaker",
      name: "Elder Skybreaker",
      daoType: DaoType.Fire,
      realm: 5,
      favorLevel: 0,
      teachableManuals: ["sun-forge-sutra", "storm-lance-principle", "blazing-core-wheel"],
      requirement: [{ type: "node_rank", nodeId: "MANIPURA", minRank: 2 }]
    },
    availableFormationArrays: [
      { id: "heavenflame-array", name: "Heavenflame Array", energyType: EnergyType.YangQi, perTickGeneration: 3 },
      { id: "thunderstep-array", name: "Thunderstep Array", energyType: EnergyType.Qi, perTickGeneration: 2 }
    ],
    memberBenefits: {
      cultivation: { yangQiConversionEfficiency: 14, circulationSpeed: 6 },
      combat: { techniquePower: 12, attackSpeed: 10 }
    }
  },
  {
    id: "still-water-school",
    name: "The Still Water School",
    homeElder: {
      id: "elder-deep-current",
      name: "Elder Deep Current",
      daoType: DaoType.Water,
      realm: 4,
      favorLevel: 0,
      teachableManuals: ["still-water-scripture", "void-listening-art", "moonwell-clarity-sutra"],
      requirement: [{ type: "node_rank", nodeId: "SVADHISTHANA", minRank: 2 }]
    },
    availableFormationArrays: [
      { id: "tranquil-tide-array", name: "Tranquil Tide Array", energyType: EnergyType.Qi, perTickGeneration: 3 },
      { id: "silent-depth-array", name: "Silent Depth Array", energyType: EnergyType.Shen, perTickGeneration: 2 }
    ],
    memberBenefits: {
      cultivation: { shenGenerationRate: 12, criticalInsight: 10 },
      combat: { soulPower: 11, soulDurability: 9 }
    }
  }
];
