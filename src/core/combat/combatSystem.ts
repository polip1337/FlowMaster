import type { CombatAttributes } from "../attributes/types";
import { DAO_SKILLS } from "../../data/dao/skills";
import type { SkillCategory, SkillDef } from "../dao/types";
import { EnergyType, emptyPool } from "../energy/EnergyType";
import type { T2Node } from "../nodes/T2Node";
import { T2NodeState } from "../nodes/T2Types";
import { rollDrops, rollIngredientDrops } from "../treasures/treasureSystem";
import { applyHpThresholdNodeDamageRolls, crackNode } from "./nodeDamage";
import { getDaoSkillScaling } from "../dao/daoSystem";
import type { EnemyDef } from "../../data/enemies/types";
import type { GameState } from "../../state/GameState";
import type { CombatEndResult, CombatState, CombatTickContext, CombatTickResult } from "./types";
import type { IngredientStack } from "../alchemy/types";

function skillById(id: string): SkillDef | undefined {
  return DAO_SKILLS.find((skill) => skill.id === id);
}

function getBodyEnergy(state: GameState) {
  const total = emptyPool();
  for (const t2 of state.t2Nodes.values()) {
    for (const t1 of t2.t1Nodes.values()) {
      for (const type of Object.values(EnergyType)) {
        total[type] += t1.energy[type];
      }
    }
  }
  return total;
}

function drainBodyEnergyToCombatPool(state: GameState, ratio: number) {
  const combatPool = emptyPool();
  for (const t2 of state.t2Nodes.values()) {
    for (const t1 of t2.t1Nodes.values()) {
      for (const type of Object.values(EnergyType)) {
        const drained = t1.energy[type] * ratio;
        t1.energy[type] -= drained;
        combatPool[type] += drained;
      }
    }
  }
  return combatPool;
}

function reduceBodyEnergyByPercent(state: GameState, percent: number): void {
  const keep = Math.max(0, 1 - percent);
  for (const t2 of state.t2Nodes.values()) {
    for (const t1 of t2.t1Nodes.values()) {
      for (const type of Object.values(EnergyType)) {
        t1.energy[type] *= keep;
      }
    }
  }
}

function estimateSkillBase(skill: SkillDef): number {
  const cost = Object.values(EnergyType).reduce((sum, type) => sum + skill.energyCost[type], 0);
  return 20 + cost * 0.75 + skill.cooldownTicks * 0.5;
}

function canAffordSkill(combat: CombatState, skill: SkillDef): boolean {
  return Object.values(EnergyType).every((type) => combat.combatEnergyPool[type] >= skill.energyCost[type]);
}

function spendSkillCost(combat: CombatState, skill: SkillDef): void {
  for (const type of Object.values(EnergyType)) {
    combat.combatEnergyPool[type] = Math.max(0, combat.combatEnergyPool[type] - skill.energyCost[type]);
  }
}

function regenCombatEnergy(combat: CombatState, attributes: CombatAttributes): void {
  const amount = Math.max(0, attributes.energyRecovery);
  const share = amount / 4;
  for (const type of Object.values(EnergyType)) {
    combat.combatEnergyPool[type] += share;
  }
}

function categoryDamage(base: number, category: SkillCategory, attributes: CombatAttributes): number {
  if (category === "physical") {
    return base * (attributes.physicalPower / 100);
  }
  if (category === "technique") {
    return base * (attributes.techniquePower / 100);
  }
  if (category === "soul") {
    return base * (attributes.soulPower / 100);
  }
  return 0;
}

function daoSkillDamageScale(context: CombatTickContext, skill: SkillDef): number {
  const daoNode = context.playerDaoNodes?.get(skill.unlockedByDaoNode);
  if (!daoNode) {
    return 1;
  }
  return getDaoSkillScaling(daoNode, context.attributes.techniquePower);
}

export function rollCrit(criticalInsight: number, random: () => number = Math.random): boolean {
  const critChance = Math.min(0.5, Math.max(0, criticalInsight) / 500);
  return random() < critChance;
}

function applyEnemyAttack(combat: CombatState, t2Nodes: Map<string, T2Node>, random: () => number): void {
  if (combat.combatTick % Math.max(1, combat.enemy.attackSpeedTicks) !== 0) {
    return;
  }

  if (combat.dodgeCharges > 0 && random() < 0.25) {
    combat.dodgeCharges -= 1;
    combat.log.push({ tick: combat.combatTick, message: "Player dodged enemy attack." });
    return;
  }

  const preferred = combat.enemy.preferredNodeTarget;
  if (preferred && random() < 0.3) {
    const node = t2Nodes.get(preferred);
    if (node) {
      crackNode(node);
      combat.log.push({ tick: combat.combatTick, message: `${node.id} was directly cracked by enemy strike.` });
      return;
    }
  }

  combat.playerHp = Math.max(0, combat.playerHp - combat.enemy.physicalAttack);
  combat.playerSoulHp = Math.max(0, combat.playerSoulHp - combat.enemy.soulAttack);
  const hpRatio = combat.playerMaxHp > 0 ? combat.playerHp / combat.playerMaxHp : 0;
  if (!combat.hp30RollDone && hpRatio <= 0.3) {
    const roll = applyHpThresholdNodeDamageRolls(hpRatio, t2Nodes, combat.stabilizationUsed, random, "hp30");
    combat.stabilizationUsed = roll.stabilizationUsed;
    combat.hp30RollDone = true;
    if (roll.cracked) {
      combat.log.push({ tick: combat.combatTick, message: "Low HP shock cracked one active node." });
    }
  }
  if (!combat.hp10RollDone && hpRatio <= 0.1) {
    const roll = applyHpThresholdNodeDamageRolls(hpRatio, t2Nodes, combat.stabilizationUsed, random, "hp10");
    combat.stabilizationUsed = roll.stabilizationUsed;
    combat.hp10RollDone = true;
    if (roll.shattered) {
      combat.log.push({ tick: combat.combatTick, message: "Critical HP collapse shattered one active node." });
    } else if (roll.stabilizationUsed) {
      combat.log.push({ tick: combat.combatTick, message: "Bindu stabilization reserve prevented node shatter." });
    }
  }
  combat.log.push({
    tick: combat.combatTick,
    message: `Enemy hit for ${combat.enemy.physicalAttack} physical and ${combat.enemy.soulAttack} soul.`
  });
}

export function startCombat(state: GameState, enemy: EnemyDef): GameState {
  const next = structuredClone(state);
  const combatPool = drainBodyEnergyToCombatPool(next, 0.4);
  const rotation = next.playerDao.availableSkillIds.slice(0, 6);
  const playerMaxHp = 100 + next.combatAttributes.physicalDurability;
  const playerMaxSoulHp = 50 + next.combatAttributes.soulDurability;
  next.maxHp = playerMaxHp;
  next.maxSoulHp = playerMaxSoulHp;
  const playerHp = Math.min(Math.max(0, next.hp), playerMaxHp);
  const playerSoulHp = Math.min(Math.max(0, next.soulHp), playerMaxSoulHp);

  next.combat = {
    active: true,
    enemy,
    playerHp,
    playerMaxHp,
    playerSoulHp,
    playerMaxSoulHp,
    combatEnergyPool: combatPool,
    enemyHp: enemy.hp,
    enemySoulHp: enemy.soulHp,
    rotation,
    currentSkillIndex: 0,
    ticksUntilNextSkill: 0,
    stabilizationUsed: false,
    heatSnapshot: next.bodyHeat,
    combatTick: 0,
    log: [{ tick: 0, message: `Combat started against ${enemy.name}.` }],
    dodgeCharges: 0,
    hp30RollDone: false,
    hp10RollDone: false
  };
  return next;
}

export function combatTick(combat: CombatState, context: CombatTickContext): CombatTickResult {
  const random = context.random ?? Math.random;
  const attrs = context.attributes;
  combat.combatTick += 1;
  combat.ticksUntilNextSkill = Math.max(0, combat.ticksUntilNextSkill - 1);
  regenCombatEnergy(combat, attrs);

  if (combat.ticksUntilNextSkill === 0 && combat.rotation.length > 0) {
    const skillId = combat.rotation[combat.currentSkillIndex % combat.rotation.length];
    const skill = skillById(skillId);
    if (skill && canAffordSkill(combat, skill)) {
      const base = estimateSkillBase(skill);
      const crit = rollCrit(context.criticalInsight, random);
      const critMult = crit ? 2 : 1;
      const daoScale = daoSkillDamageScale(context, skill);
      const damage = categoryDamage(base, skill.category, attrs) * critMult * daoScale;

      if (skill.category === "soul") {
        combat.enemySoulHp = Math.max(0, combat.enemySoulHp - damage);
      } else if (skill.category === "movement") {
        combat.dodgeCharges += 2;
      } else if (skill.category === "passive") {
        // Passive skill behaves as always-on amplification while in rotation.
        combat.combatEnergyPool[EnergyType.Qi] += 2;
      } else {
        combat.enemyHp = Math.max(0, combat.enemyHp - damage);
      }
      spendSkillCost(combat, skill);
      combat.log.push({
        tick: combat.combatTick,
        message: `${skill.id} dealt ${damage.toFixed(1)} ${skill.category} damage${crit ? " (CRIT)" : ""}.`
      });
      const speedScale = 1 + Math.max(0, attrs.attackSpeed) / 100;
      combat.ticksUntilNextSkill = Math.max(1, Math.floor(skill.cooldownTicks / speedScale));
      combat.currentSkillIndex = (combat.currentSkillIndex + 1) % combat.rotation.length;
    } else {
      combat.log.push({ tick: combat.combatTick, message: `Skill ${skillId} skipped (insufficient combat energy).` });
      combat.currentSkillIndex = (combat.currentSkillIndex + 1) % combat.rotation.length;
      combat.ticksUntilNextSkill = 1;
    }
  }

  applyEnemyAttack(combat, context.t2Nodes, random);
  return { combat, outcome: checkCombatEnd(combat) };
}

export function checkCombatEnd(combat: CombatState): "player_win" | "player_loss" | "ongoing" {
  if (combat.playerHp <= 0 || combat.playerSoulHp <= 0) {
    return "player_loss";
  }
  if (combat.enemyHp <= 0 && combat.enemySoulHp <= 0) {
    return "player_win";
  }
  return "ongoing";
}

function applySevereNodeDamage(state: GameState): void {
  const active = [...state.t2Nodes.values()].filter((node) => node.state === T2NodeState.ACTIVE);
  for (const node of active.slice(0, 2)) {
    crackNode(node);
  }
  state.globalTrackers.nodeDamageCount += Math.min(2, active.length);
}

export function endCombat(
  state: GameState,
  outcome: "player_win" | "player_loss",
  random: () => number = Math.random
): CombatEndResult {
  const next = structuredClone(state);
  if (!next.combat) {
    throw new Error("Cannot end combat when no combat is active.");
  }

  const droppedTreasures = outcome === "player_win" ? rollDrops(next.combat.enemy, next, random) : [];
  const droppedIngredients = outcome === "player_win" ? rollIngredientDrops(next.combat.enemy, random) : [];
  if (outcome === "player_win") {
    next.inventory.push(...droppedTreasures);
    mergeIngredientDrops(next.ingredientInventory, droppedIngredients);
    next.globalTrackers.combatCount += 1;
    next.specialEventFlags.add("event:combat_victory");
  } else {
    applySevereNodeDamage(next);
    reduceBodyEnergyByPercent(next, 0.2);
  }

  next.hp = Math.min(next.maxHp, Math.max(0, next.combat.playerHp));
  next.soulHp = Math.min(next.maxSoulHp, Math.max(0, next.combat.playerSoulHp));

  next.combat = null;
  return { state: next, outcome, droppedTreasures, droppedIngredients };
}

export function snapshotBodyEnergyForCombat(state: GameState) {
  return getBodyEnergy(state);
}

function mergeIngredientDrops(inventory: IngredientStack[], drops: IngredientStack[]): void {
  for (const drop of drops) {
    const existing = inventory.find((entry) => entry.ingredientId === drop.ingredientId);
    if (existing) {
      existing.quantity += drop.quantity;
    } else {
      inventory.push({ ingredientId: drop.ingredientId, quantity: drop.quantity });
    }
  }
}
