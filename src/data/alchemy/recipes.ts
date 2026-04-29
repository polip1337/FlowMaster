import type { Recipe } from "../../core/alchemy/types";
import { TreasureType } from "../../core/treasures/types";

function createTieredRecipeSet(
  baseId: string,
  name: string,
  resultType: TreasureType,
  basicIngredients: string[],
  refinedIngredients: string[],
  transcendentIngredients: string[],
  baseQuality: number
): Recipe[] {
  return [
    {
      id: `${baseId}:basic`,
      name: `${name} (Basic)`,
      ingredients: basicIngredients,
      baseQuality,
      resultType,
      tier: "basic"
    },
    {
      id: `${baseId}:refined`,
      name: `${name} (Refined)`,
      ingredients: refinedIngredients,
      baseQuality: baseQuality + 15,
      resultType,
      tier: "refined"
    },
    {
      id: `${baseId}:transcendent`,
      name: `${name} (Transcendent)`,
      ingredients: transcendentIngredients,
      baseQuality: baseQuality + 30,
      resultType,
      tier: "transcendent"
    }
  ];
}

export const ALCHEMY_RECIPES: Recipe[] = [
  ...createTieredRecipeSet(
    "essence-condensation",
    "Essence Condensation Pill",
    TreasureType.CondensedEssencePill,
    ["spirit-grass", "jade-moss"],
    ["spirit-grass", "ember-bloom", "moon-tear"],
    ["golden-pith", "dragon-blood-sap", "dao-lotus-heart"],
    55
  ),
  ...createTieredRecipeSet(
    "stone-hardening",
    "Stone Hardening Pellet",
    TreasureType.RefiningStone,
    ["iron-bark", "jade-moss"],
    ["iron-bark", "golden-pith", "moon-tear"],
    ["void-thorn", "dragon-blood-sap", "dao-lotus-heart"],
    50
  ),
  ...createTieredRecipeSet(
    "meridian-mending",
    "Meridian Mending Pill",
    TreasureType.MeridianSalve,
    ["jade-moss", "moon-tear"],
    ["jade-moss", "ember-bloom", "void-thorn"],
    ["moon-tear", "astral-pollen", "dao-lotus-heart"],
    58
  ),
  ...createTieredRecipeSet(
    "jing-seed",
    "Jing Seed Pellet",
    TreasureType.JingDeposit,
    ["spirit-grass", "moon-tear"],
    ["golden-pith", "moon-tear", "void-thorn"],
    ["dragon-blood-sap", "astral-pollen", "dao-lotus-heart"],
    52
  ),
  ...createTieredRecipeSet(
    "dao-spark",
    "Dao Spark Capsule",
    TreasureType.DaoFragment,
    ["ember-bloom", "moon-tear"],
    ["ember-bloom", "void-thorn", "golden-pith"],
    ["void-thorn", "astral-pollen", "dao-lotus-heart"],
    54
  ),
  ...createTieredRecipeSet(
    "recovery-restoration",
    "Recovery Restoration Pill",
    TreasureType.RecoveryElixir,
    ["spirit-grass", "moon-tear"],
    ["jade-moss", "golden-pith", "void-thorn"],
    ["dragon-blood-sap", "astral-pollen", "dao-lotus-heart"],
    56
  ),
  ...createTieredRecipeSet(
    "formation-seal",
    "Formation Seal Pellet",
    TreasureType.FormationArray,
    ["iron-bark", "ember-bloom"],
    ["iron-bark", "golden-pith", "void-thorn"],
    ["dragon-blood-sap", "astral-pollen", "dao-lotus-heart"],
    53
  ),
  ...createTieredRecipeSet(
    "manual-ink",
    "Manual Ink Pill",
    TreasureType.CultivationManual,
    ["moon-tear", "jade-moss"],
    ["moon-tear", "void-thorn", "golden-pith"],
    ["astral-pollen", "dragon-blood-sap", "dao-lotus-heart"],
    60
  ),
  ...createTieredRecipeSet(
    "blazing-core",
    "Blazing Core Pill",
    TreasureType.CondensedEssencePill,
    ["ember-bloom", "spirit-grass"],
    ["ember-bloom", "golden-pith", "void-thorn"],
    ["dragon-blood-sap", "astral-pollen", "dao-lotus-heart"],
    57
  ),
  ...createTieredRecipeSet(
    "restoration-spiral",
    "Restoration Spiral Pill",
    TreasureType.MeridianRestoration,
    ["moon-tear", "spirit-grass"],
    ["moon-tear", "jade-moss", "void-thorn"],
    ["astral-pollen", "dragon-blood-sap", "dao-lotus-heart"],
    59
  ),
  ...createTieredRecipeSet(
    "soul-mirror",
    "Soul Mirror Pellet",
    TreasureType.DaoFragment,
    ["moon-tear", "ember-bloom"],
    ["void-thorn", "golden-pith", "moon-tear"],
    ["astral-pollen", "dragon-blood-sap", "dao-lotus-heart"],
    62
  ),
  ...createTieredRecipeSet(
    "heavenly-pulse",
    "Heavenly Pulse Pill",
    TreasureType.RecoveryElixir,
    ["spirit-grass", "iron-bark", "jade-moss"],
    ["golden-pith", "moon-tear", "void-thorn"],
    ["dragon-blood-sap", "astral-pollen", "dao-lotus-heart"],
    64
  )
];
