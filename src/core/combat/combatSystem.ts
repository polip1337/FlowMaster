import type { CombatAttributes } from "../attributes/types";
import { DAO_SKILLS } from "../../data/dao/skills";
import type { SkillCategory, SkillDef } from "../dao/types";
import { EnergyType, emptyPool } from "../energy/EnergyType";
import type { T2Node } from "../nodes/T2Node";
import { T2NodeState } from "../nodes/T2Types";
import type { EnemyDef } from "../../data/enemies/types";
import type { GameState, Treasure } from "../../state/GameState";
import type { CombatEndResult, CombatState, CombatTickContext, CombatTickResult } from "./types";

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
      node.nodeDamageState = "cracked";
      combat.log.push({ tick: combat.combatTick, message: `${node.id} was directly cracked by enemy strike.` });
      return;
    }
  }

  combat.playerHp = Math.max(0, combat.playerHp - combat.enemy.physicalAttack);
  combat.playerSoulHp = Math.max(0, combat.playerSoulHp - combat.enemy.soulAttack);
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

  next.combat = {
    active: true,
    enemy,
    playerHp: playerMaxHp,
    playerMaxHp,
    playerSoulHp: playerMaxSoulHp,
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
    dodgeCharges: 0
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
      const damage = categoryDamage(base, skill.category, attrs) * critMult;

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

export function rollTreasureDrops(enemy: EnemyDef, random: () => number = Math.random): Treasure[] {
  const rewards: Treasure[] = [];
  for (const drop of enemy.dropTable) {
    if (random() > drop.probability) {
      continue;
    }
    const qtyRange = drop.quantityMax - drop.quantityMin + 1;
    const qty = drop.quantityMin + Math.floor(random() * Math.max(1, qtyRange));
    const tierRange = drop.tierMax - drop.tierMin + 1;
    for (let i = 0; i < qty; i += 1) {
      const tier = drop.tierMin + Math.floor(random() * Math.max(1, tierRange));
      rewards.push({ id: `${drop.treasureType}:t${tier}` });
    }
  }
  return rewards;
}

function applySevereNodeDamage(state: GameState): void {
  const active = [...state.t2Nodes.values()].filter((node) => node.state === T2NodeState.ACTIVE);
  for (const node of active.slice(0, 2)) {
    node.nodeDamageState = "cracked";
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

  const droppedTreasures = outcome === "player_win" ? rollTreasureDrops(next.combat.enemy, random) : [];
  if (outcome === "player_win") {
    next.inventory.push(...droppedTreasures);
    next.globalTrackers.combatCount += 1;
    next.specialEventFlags.add("event:combat_victory");
  } else {
    applySevereNodeDamage(next);
    reduceBodyEnergyByPercent(next, 0.2);
  }

  next.combat = null;
  return { state: next, outcome, droppedTreasures };
}

export function snapshotBodyEnergyForCombat(state: GameState) {
  return getBodyEnergy(state);
}
