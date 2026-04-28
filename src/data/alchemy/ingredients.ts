import { EnergyType, emptyPool } from "../../core/energy/EnergyType";
import type { Ingredient } from "../../core/alchemy/types";

function pool(qi = 0, jing = 0, yangQi = 0, shen = 0) {
  return {
    ...emptyPool(),
    [EnergyType.Qi]: qi,
    [EnergyType.Jing]: jing,
    [EnergyType.YangQi]: yangQi,
    [EnergyType.Shen]: shen
  };
}

export const ALCHEMY_INGREDIENTS: Ingredient[] = [
  { id: "spirit-grass", name: "Spirit Grass", rarity: "common", energyContent: pool(30, 5, 0, 0) },
  { id: "iron-bark", name: "Iron Bark", rarity: "common", energyContent: pool(15, 10, 0, 0) },
  { id: "jade-moss", name: "Jade Moss", rarity: "common", energyContent: pool(10, 20, 0, 0) },
  { id: "ember-bloom", name: "Ember Bloom", rarity: "uncommon", energyContent: pool(20, 0, 15, 0) },
  { id: "moon-tear", name: "Moon Tear", rarity: "uncommon", energyContent: pool(0, 25, 0, 8) },
  { id: "void-thorn", name: "Void Thorn", rarity: "rare", energyContent: pool(5, 10, 10, 20) },
  { id: "golden-pith", name: "Golden Pith", rarity: "rare", energyContent: pool(35, 15, 10, 0) },
  { id: "dragon-blood-sap", name: "Dragon Blood Sap", rarity: "epic", energyContent: pool(25, 35, 20, 10) },
  { id: "astral-pollen", name: "Astral Pollen", rarity: "epic", energyContent: pool(10, 10, 25, 30) },
  { id: "dao-lotus-heart", name: "Dao Lotus Heart", rarity: "mythic", energyContent: pool(40, 40, 30, 40) }
];
