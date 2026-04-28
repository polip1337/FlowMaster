import { EnergyType, emptyPool } from "../../core/energy/EnergyType";
import { DaoType, type SkillDef } from "../../core/dao/types";

function cost(type: EnergyType, amount: number): ReturnType<typeof emptyPool> {
  return { ...emptyPool(), [type]: amount };
}

function dualCost(a: EnergyType, aAmount: number, b: EnergyType, bAmount: number): ReturnType<typeof emptyPool> {
  return { ...emptyPool(), [a]: aAmount, [b]: bAmount };
}

export const DAO_SKILLS: SkillDef[] = [
  { id: "earth-rumble-fist", daoType: DaoType.Earth, category: "physical", energyCost: cost(EnergyType.Jing, 20), damageFormula: "base * 1.15 + rank*4", cooldownTicks: 24, unlockedByDaoNode: "EARTH_CORE" },
  { id: "earth-boulder-step", daoType: DaoType.Earth, category: "movement", energyCost: cost(EnergyType.Jing, 14), damageFormula: "dash; grants stagger resist", cooldownTicks: 30, unlockedByDaoNode: "EARTH_PLATE" },
  { id: "earth-crag-guard", daoType: DaoType.Earth, category: "passive", energyCost: cost(EnergyType.Jing, 0), damageFormula: "passive defense + grounding", cooldownTicks: 0, unlockedByDaoNode: "EARTH_MANTLE" },
  { id: "earth-mountain-crush", daoType: DaoType.Earth, category: "technique", energyCost: cost(EnergyType.Jing, 36), damageFormula: "base * 1.75 + techniquePower*0.3", cooldownTicks: 44, unlockedByDaoNode: "EARTH_PILLAR" },
  { id: "earth-immovable-soul", daoType: DaoType.Earth, category: "soul", energyCost: dualCost(EnergyType.Jing, 18, EnergyType.Shen, 10), damageFormula: "soulBase * 1.2", cooldownTicks: 36, unlockedByDaoNode: "EARTH_MONOLITH" },
  { id: "earth-rooted-presence", daoType: DaoType.Earth, category: "physical", energyCost: cost(EnergyType.Jing, 28), damageFormula: "base * 1.35 with taunt", cooldownTicks: 32, unlockedByDaoNode: "EARTH_WORLDROOT" },

  { id: "fire-blazing-strike", daoType: DaoType.Fire, category: "physical", energyCost: cost(EnergyType.YangQi, 24), damageFormula: "base * 1.2 + burn", cooldownTicks: 20, unlockedByDaoNode: "FIRE_SPARK" },
  { id: "fire-scorch-wave", daoType: DaoType.Fire, category: "physical", energyCost: cost(EnergyType.YangQi, 26), damageFormula: "base * 1.25 aoe", cooldownTicks: 24, unlockedByDaoNode: "FIRE_COAL" },
  { id: "fire-ember-dash", daoType: DaoType.Fire, category: "movement", energyCost: cost(EnergyType.YangQi, 16), damageFormula: "dash; ignition trail", cooldownTicks: 28, unlockedByDaoNode: "FIRE_FLARE" },
  { id: "fire-phoenix-arc", daoType: DaoType.Fire, category: "technique", energyCost: cost(EnergyType.YangQi, 42), damageFormula: "base * 1.9 + techniquePower*0.4", cooldownTicks: 50, unlockedByDaoNode: "FIRE_PYRE" },
  { id: "fire-soul-immolation", daoType: DaoType.Fire, category: "soul", energyCost: dualCost(EnergyType.YangQi, 20, EnergyType.Shen, 10), damageFormula: "soulBase * 1.3 + burnSoul", cooldownTicks: 42, unlockedByDaoNode: "FIRE_SOLARIS" },
  { id: "fire-burning-aura", daoType: DaoType.Fire, category: "passive", energyCost: cost(EnergyType.YangQi, 0), damageFormula: "passive burn around player", cooldownTicks: 0, unlockedByDaoNode: "FIRE_ASHEN" },

  { id: "water-river-palm", daoType: DaoType.Water, category: "physical", energyCost: cost(EnergyType.Qi, 18), damageFormula: "base * 1.1 + slow", cooldownTicks: 18, unlockedByDaoNode: "WATER_SPRING" },
  { id: "water-tide-cascade", daoType: DaoType.Water, category: "technique", energyCost: cost(EnergyType.Qi, 34), damageFormula: "base * 1.7 + bounce", cooldownTicks: 38, unlockedByDaoNode: "WATER_STREAM" },
  { id: "water-mist-step", daoType: DaoType.Water, category: "movement", energyCost: cost(EnergyType.Qi, 12), damageFormula: "dash; dodge up", cooldownTicks: 24, unlockedByDaoNode: "WATER_TIDE" },
  { id: "water-deluge-technique", daoType: DaoType.Water, category: "physical", energyCost: cost(EnergyType.Qi, 26), damageFormula: "base * 1.35 aoe push", cooldownTicks: 30, unlockedByDaoNode: "WATER_ABYSS" },
  { id: "water-soul-mirror", daoType: DaoType.Water, category: "soul", energyCost: dualCost(EnergyType.Qi, 14, EnergyType.Shen, 12), damageFormula: "soulBase * 1.15 reflect", cooldownTicks: 34, unlockedByDaoNode: "WATER_MOON" },
  { id: "water-serene-current", daoType: DaoType.Water, category: "passive", energyCost: cost(EnergyType.Qi, 0), damageFormula: "passive regen + energyRecovery", cooldownTicks: 0, unlockedByDaoNode: "WATER_CALM" },

  { id: "wind-gale-kick", daoType: DaoType.Wind, category: "physical", energyCost: cost(EnergyType.YangQi, 18), damageFormula: "base * 1.12 + knockback", cooldownTicks: 16, unlockedByDaoNode: "WIND_BREEZE" },
  { id: "wind-cutter-current", daoType: DaoType.Wind, category: "physical", energyCost: cost(EnergyType.YangQi, 22), damageFormula: "base * 1.2 line slash", cooldownTicks: 20, unlockedByDaoNode: "WIND_GUST" },
  { id: "wind-voidstep", daoType: DaoType.Wind, category: "movement", energyCost: cost(EnergyType.YangQi, 10), damageFormula: "short blink; mobility up", cooldownTicks: 18, unlockedByDaoNode: "WIND_SQUALL" },
  { id: "wind-tempest-draw", daoType: DaoType.Wind, category: "technique", energyCost: cost(EnergyType.YangQi, 32), damageFormula: "base * 1.75 multi-hit", cooldownTicks: 36, unlockedByDaoNode: "WIND_TEMPEST" },
  { id: "wind-soul-whisper", daoType: DaoType.Wind, category: "soul", energyCost: dualCost(EnergyType.YangQi, 12, EnergyType.Shen, 10), damageFormula: "soulBase * 1.18 shred", cooldownTicks: 30, unlockedByDaoNode: "WIND_SKY" },
  { id: "wind-untouched-drift", daoType: DaoType.Wind, category: "passive", energyCost: cost(EnergyType.YangQi, 0), damageFormula: "passive dodge and speed", cooldownTicks: 0, unlockedByDaoNode: "WIND_STILL" },

  { id: "void-rift-cut", daoType: DaoType.Void, category: "physical", energyCost: cost(EnergyType.Shen, 16), damageFormula: "base * 1.08 + void mark", cooldownTicks: 20, unlockedByDaoNode: "VOID_NEXUS" },
  { id: "void-echo-collapse", daoType: DaoType.Void, category: "technique", energyCost: cost(EnergyType.Shen, 38), damageFormula: "base * 2.0 delayed burst", cooldownTicks: 52, unlockedByDaoNode: "VOID_ECHO" },
  { id: "void-fade-step", daoType: DaoType.Void, category: "movement", energyCost: cost(EnergyType.Shen, 14), damageFormula: "phase dash; brief invuln", cooldownTicks: 34, unlockedByDaoNode: "VOID_NULL" },
  { id: "void-gravity-well", daoType: DaoType.Void, category: "physical", energyCost: cost(EnergyType.Shen, 22), damageFormula: "base * 1.22 pull-in", cooldownTicks: 28, unlockedByDaoNode: "VOID_FRACTURE" },
  { id: "void-soul-shear", daoType: DaoType.Void, category: "soul", energyCost: cost(EnergyType.Shen, 30), damageFormula: "soulBase * 1.55 true soul", cooldownTicks: 46, unlockedByDaoNode: "VOID_ABSENCE" },
  { id: "void-still-mind", daoType: DaoType.Void, category: "passive", energyCost: cost(EnergyType.Shen, 0), damageFormula: "passive crit insight and control", cooldownTicks: 0, unlockedByDaoNode: "VOID_PARADOX" },

  { id: "life-vine-strike", daoType: DaoType.Life, category: "physical", energyCost: dualCost(EnergyType.Jing, 14, EnergyType.Shen, 6), damageFormula: "base * 1.12 + heal on hit", cooldownTicks: 22, unlockedByDaoNode: "LIFE_SEED" },
  { id: "life-regrowth-wave", daoType: DaoType.Life, category: "technique", energyCost: dualCost(EnergyType.Jing, 20, EnergyType.Shen, 14), damageFormula: "base * 1.55 + team heal", cooldownTicks: 44, unlockedByDaoNode: "LIFE_BLOOM" },
  { id: "life-verdant-step", daoType: DaoType.Life, category: "movement", energyCost: dualCost(EnergyType.Jing, 8, EnergyType.Shen, 8), damageFormula: "dash; regen trail", cooldownTicks: 26, unlockedByDaoNode: "LIFE_GROVE" },
  { id: "life-thorn-technique", daoType: DaoType.Life, category: "physical", energyCost: dualCost(EnergyType.Jing, 24, EnergyType.Shen, 8), damageFormula: "base * 1.35 retaliate", cooldownTicks: 28, unlockedByDaoNode: "LIFE_TRUNK" },
  { id: "life-soul-bloom", daoType: DaoType.Life, category: "soul", energyCost: dualCost(EnergyType.Jing, 12, EnergyType.Shen, 16), damageFormula: "soulBase * 1.28 drain", cooldownTicks: 38, unlockedByDaoNode: "LIFE_CANOPY" },
  { id: "life-evergreen-aura", daoType: DaoType.Life, category: "passive", energyCost: cost(EnergyType.Jing, 0), damageFormula: "passive sustain + repair rate", cooldownTicks: 0, unlockedByDaoNode: "LIFE_ETERNAL" },

  { id: "sword-iron-cleave", daoType: DaoType.Sword, category: "physical", energyCost: cost(EnergyType.YangQi, 20), damageFormula: "base * 1.18 bleed", cooldownTicks: 16, unlockedByDaoNode: "SWORD_EDGE" },
  { id: "sword-piercing-thread", daoType: DaoType.Sword, category: "physical", energyCost: cost(EnergyType.YangQi, 18), damageFormula: "base * 1.22 armorPierce", cooldownTicks: 14, unlockedByDaoNode: "SWORD_POINT" },
  { id: "sword-flashstep", daoType: DaoType.Sword, category: "movement", energyCost: cost(EnergyType.YangQi, 12), damageFormula: "quick step; crit chance up", cooldownTicks: 16, unlockedByDaoNode: "SWORD_GUARD" },
  { id: "sword-skyfall-form", daoType: DaoType.Sword, category: "technique", energyCost: cost(EnergyType.YangQi, 36), damageFormula: "base * 1.88 combo", cooldownTicks: 40, unlockedByDaoNode: "SWORD_FIELD" },
  { id: "sword-mind-sever", daoType: DaoType.Sword, category: "soul", energyCost: dualCost(EnergyType.YangQi, 14, EnergyType.Shen, 14), damageFormula: "soulBase * 1.32 execute", cooldownTicks: 36, unlockedByDaoNode: "SWORD_INTENT" },
  { id: "sword-aura-discipline", daoType: DaoType.Sword, category: "passive", energyCost: cost(EnergyType.YangQi, 0), damageFormula: "passive precision and attack speed", cooldownTicks: 0, unlockedByDaoNode: "SWORD_DOMAIN" },

  { id: "thunder-shock-fist", daoType: DaoType.Thunder, category: "physical", energyCost: cost(EnergyType.YangQi, 22), damageFormula: "base * 1.2 shock", cooldownTicks: 18, unlockedByDaoNode: "THUNDER_SPARK" },
  { id: "thunder-chain-bolt", daoType: DaoType.Thunder, category: "physical", energyCost: dualCost(EnergyType.YangQi, 18, EnergyType.Shen, 8), damageFormula: "base * 1.3 chain", cooldownTicks: 22, unlockedByDaoNode: "THUNDER_ARC" },
  { id: "thunder-flash-step", daoType: DaoType.Thunder, category: "movement", energyCost: cost(EnergyType.YangQi, 14), damageFormula: "blink dash; extra turn speed", cooldownTicks: 20, unlockedByDaoNode: "THUNDER_PULSE" },
  { id: "thunder-tempest-form", daoType: DaoType.Thunder, category: "technique", energyCost: dualCost(EnergyType.YangQi, 30, EnergyType.Shen, 12), damageFormula: "base * 1.95 storm field", cooldownTicks: 46, unlockedByDaoNode: "THUNDER_STORM" },
  { id: "thunder-soul-roar", daoType: DaoType.Thunder, category: "soul", energyCost: dualCost(EnergyType.YangQi, 16, EnergyType.Shen, 16), damageFormula: "soulBase * 1.4 stun", cooldownTicks: 40, unlockedByDaoNode: "THUNDER_SKY" },
  { id: "thunder-static-field", daoType: DaoType.Thunder, category: "passive", energyCost: cost(EnergyType.YangQi, 0), damageFormula: "passive chain lightning", cooldownTicks: 0, unlockedByDaoNode: "THUNDER_HEAVEN" }
];
