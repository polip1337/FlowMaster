import { EnergyType, emptyPool } from "../energy/EnergyType";
import { getT1Capacity } from "../nodes/t1Logic";
import type { EnemyDef } from "../../data/enemies/types";
import type { GameState } from "../../state/GameState";
import { TreasureType, type PlacedFormationArray, type Treasure, type TreasureDropDef } from "./types";
import type { IngredientStack } from "../alchemy/types";

function clampQuantity(value: number): number {
  return Math.max(0, Math.floor(value));
}

function decrementTreasureInventory(inventory: Treasure[], treasureId: string): void {
  const idx = inventory.findIndex((entry) => entry.id === treasureId);
  if (idx < 0) {
    throw new Error(`Treasure ${treasureId} not found in inventory.`);
  }
  const item = inventory[idx];
  item.quantity = clampQuantity(item.quantity - 1);
  if (item.quantity <= 0) {
    inventory.splice(idx, 1);
  }
}

function getNodeAndT1(state: GameState, targetId: string) {
  const [t2Id, rawT1] = targetId.split(":");
  const t2 = state.t2Nodes.get(t2Id);
  if (!t2) {
    return null;
  }
  if (!rawT1) {
    return { t2, t1: null };
  }
  const t1Id = Number(rawT1);
  if (!Number.isFinite(t1Id)) {
    return null;
  }
  return { t2, t1: t2.t1Nodes.get(t1Id) ?? null };
}

function applyCondensedEssencePill(state: GameState, treasure: Treasure, targetId: string): void {
  const target = getNodeAndT1(state, targetId);
  if (!target?.t1 || treasure.type !== TreasureType.CondensedEssencePill) {
    throw new Error("Condensed Essence Pill requires target format T2_ID:T1_ID.");
  }
  const { energyType, amount } = treasure.effect;
  const current = target.t1.energy[energyType];
  target.t1.energy[energyType] = Math.min(target.t1.capacity, current + Math.max(0, amount));
}

function applyRefiningStone(state: GameState, treasure: Treasure, targetId: string): void {
  const target = getNodeAndT1(state, targetId);
  if (!target?.t1 || treasure.type !== TreasureType.RefiningStone) {
    throw new Error("Refining Stone requires target format T2_ID:T1_ID.");
  }
  const gain = Math.max(1, Math.floor(treasure.effect.qualityGain));
  target.t1.quality = Math.min(10, target.t1.quality + gain);
  target.t1.capacity = getT1Capacity(target.t1.baseCapacity, target.t1.quality);
}

function applyMeridianSalve(state: GameState, treasure: Treasure, targetId: string): void {
  const meridian = state.meridians.get(targetId);
  if (!meridian || treasure.type !== TreasureType.MeridianSalve) {
    throw new Error("Meridian Salve requires a valid meridian id target.");
  }
  meridian.totalFlow += Math.max(0, treasure.effect.trainingFlowGain);
}

function applyJingDeposit(state: GameState, treasure: Treasure, targetId: string): void {
  const meridian = state.meridians.get(targetId);
  if (!meridian || treasure.type !== TreasureType.JingDeposit) {
    throw new Error("Jing Deposit requires a valid meridian id target.");
  }
  meridian.jingDeposit += Math.max(0, treasure.effect.jingDepositGain);
}

function applyDaoFragment(state: GameState, treasure: Treasure): void {
  if (treasure.type !== TreasureType.DaoFragment) {
    throw new Error("Invalid Dao Fragment payload.");
  }
  state.playerDao.daoInsights += Math.max(0, treasure.effect.insightsGain);
}

function applyRecoveryElixir(state: GameState, treasure: Treasure, targetId: string): void {
  const target = state.t2Nodes.get(targetId);
  if (!target || treasure.type !== TreasureType.RecoveryElixir) {
    throw new Error("Recovery Elixir requires a valid T2 node id target.");
  }
  const repairAmount = Math.max(0, treasure.effect.repairAmount);
  target.nodeDamageState.repairProgress = Math.min(1, target.nodeDamageState.repairProgress + repairAmount);
  if (target.nodeDamageState.repairProgress >= 1) {
    target.nodeDamageState.cracked = false;
    target.nodeDamageState.shattered = false;
  }

  const source = [...target.t1Nodes.values()].find((node) => node.isSourceNode) ?? [...target.t1Nodes.values()][0];
  if (source) {
    source.energy[EnergyType.Jing] = Math.min(source.capacity, source.energy[EnergyType.Jing] + treasure.effect.restoreJing);
  }
}

function applyFormationArray(state: GameState, treasure: Treasure, targetId: string): void {
  const node = state.t2Nodes.get(targetId);
  if (!node || treasure.type !== TreasureType.FormationArray) {
    throw new Error("Formation Array placement requires a valid T2 node id target.");
  }
  if (state.placedFormationArrays.length >= 3) {
    throw new Error("Formation Array stack limit reached (3).");
  }
  const placed: PlacedFormationArray = {
    treasureId: treasure.id,
    nodeId: targetId,
    energyType: treasure.effect.energyType,
    perTickGeneration: Math.max(0, treasure.effect.perTickGeneration)
  };
  state.placedFormationArrays.push(placed);
}

function applyCultivationManual(state: GameState, treasure: Treasure): void {
  if (treasure.type !== TreasureType.CultivationManual) {
    throw new Error("Invalid Cultivation Manual payload.");
  }
  const effect = treasure.effect;
  if (effect.mode === "unlock_technique") {
    if (!state.unlockedTechniques.includes(effect.techniqueId)) {
      state.unlockedTechniques.push(effect.techniqueId);
    }
    return;
  }
  if (effect.mode === "reduce_seal_threshold") {
    const current = state.nodeSealThresholdModifiers[effect.nodeId] ?? 1;
    state.nodeSealThresholdModifiers[effect.nodeId] = Math.max(0.2, current * effect.multiplier);
    return;
  }
  const node = state.t2Nodes.get(effect.nodeId);
  if (!node) {
    throw new Error(`Manual target node ${effect.nodeId} not found.`);
  }
  if (!node.meridianSlotIds.includes(effect.slotId)) {
    node.meridianSlotIds.push(effect.slotId);
  }
}

export function applyTreasure(treasure: Treasure, targetId: string, state: GameState): GameState {
  const next = structuredClone(state);
  switch (treasure.type) {
    case TreasureType.CondensedEssencePill:
      applyCondensedEssencePill(next, treasure, targetId);
      break;
    case TreasureType.RefiningStone:
      applyRefiningStone(next, treasure, targetId);
      break;
    case TreasureType.MeridianSalve:
      applyMeridianSalve(next, treasure, targetId);
      break;
    case TreasureType.JingDeposit:
      applyJingDeposit(next, treasure, targetId);
      break;
    case TreasureType.DaoFragment:
      applyDaoFragment(next, treasure);
      break;
    case TreasureType.RecoveryElixir:
      applyRecoveryElixir(next, treasure, targetId);
      break;
    case TreasureType.FormationArray:
      applyFormationArray(next, treasure, targetId);
      break;
    case TreasureType.CultivationManual:
      applyCultivationManual(next, treasure);
      break;
    default:
      throw new Error("Unsupported treasure type.");
  }
  decrementTreasureInventory(next.inventory, treasure.id);
  return next;
}

function rollFromDropTable(dropTable: TreasureDropDef[], random: () => number): TreasureDropDef | null {
  const totalWeight = dropTable.reduce((sum, drop) => sum + Math.max(0, drop.weight), 0);
  if (totalWeight <= 0) {
    return null;
  }
  let cursor = random() * totalWeight;
  for (const drop of dropTable) {
    cursor -= Math.max(0, drop.weight);
    if (cursor <= 0) {
      return drop;
    }
  }
  return dropTable[dropTable.length - 1] ?? null;
}

function createTreasureFromDrop(drop: TreasureDropDef, enemyTier: number, random: () => number): Treasure {
  const tierSpan = Math.max(0, drop.tierMax - drop.tierMin);
  const rolledTier = drop.tierMin + Math.floor(random() * (tierSpan + 1));
  const tier = Math.max(1, Math.min(9, Math.max(rolledTier, Math.floor(enemyTier / 2))));
  const quantitySpan = Math.max(0, drop.quantityMax - drop.quantityMin);
  const quantity = drop.quantityMin + Math.floor(random() * (quantitySpan + 1));
  const safeQuantity = Math.max(1, quantity);

  const id = `${drop.treasureType}:${tier}:${Math.floor(random() * 1_000_000)}`;
  switch (drop.treasureType) {
    case TreasureType.CondensedEssencePill:
      return {
        id,
        type: TreasureType.CondensedEssencePill,
        tier,
        quantity: safeQuantity,
        effect: { energyType: drop.energyTypeFilter ?? EnergyType.Qi, amount: 40 * tier }
      };
    case TreasureType.RefiningStone:
      return { id, type: TreasureType.RefiningStone, tier, quantity: safeQuantity, effect: { qualityGain: 1 } };
    case TreasureType.MeridianSalve:
      return {
        id,
        type: TreasureType.MeridianSalve,
        tier,
        quantity: safeQuantity,
        effect: { trainingFlowGain: 250 * tier }
      };
    case TreasureType.JingDeposit:
      return { id, type: TreasureType.JingDeposit, tier, quantity: safeQuantity, effect: { jingDepositGain: 80 * tier } };
    case TreasureType.DaoFragment:
      return { id, type: TreasureType.DaoFragment, tier, quantity: safeQuantity, effect: { insightsGain: 25 * tier } };
    case TreasureType.RecoveryElixir:
      return {
        id,
        type: TreasureType.RecoveryElixir,
        tier,
        quantity: safeQuantity,
        effect: { repairAmount: Math.min(1, 0.25 + tier * 0.1), restoreJing: 50 * tier }
      };
    case TreasureType.FormationArray:
      return {
        id,
        type: TreasureType.FormationArray,
        tier,
        quantity: safeQuantity,
        effect: { energyType: drop.energyTypeFilter ?? EnergyType.Qi, perTickGeneration: 0.2 * tier }
      };
    case TreasureType.CultivationManual:
      return {
        id,
        type: TreasureType.CultivationManual,
        tier,
        quantity: safeQuantity,
        effect: { mode: "unlock_technique", techniqueId: tier >= 5 ? "master" : "adept" }
      };
    default:
      return {
        id,
        type: TreasureType.CondensedEssencePill,
        tier,
        quantity: safeQuantity,
        effect: { energyType: EnergyType.Qi, amount: 40 * tier }
      };
  }
}

export function rollDrops(enemy: EnemyDef, state: GameState, random: () => number = Math.random): Treasure[] {
  const dropChance = Math.min(0.95, 0.15 + state.cultivationAttributes.criticalInsight / 200);
  if (random() > dropChance) {
    return [];
  }
  const chosen = rollFromDropTable(enemy.dropTable, random);
  if (!chosen) {
    return [];
  }
  return [createTreasureFromDrop(chosen, enemy.tier, random)];
}

export function rollIngredientDrops(enemy: EnemyDef, random: () => number = Math.random): IngredientStack[] {
  const drops: IngredientStack[] = [];
  for (const drop of enemy.ingredientDropTable) {
    if (random() > Math.max(0, Math.min(1, drop.probability))) {
      continue;
    }
    const tierSpan = Math.max(0, drop.tierMax - drop.tierMin);
    const tierRoll = drop.tierMin + Math.floor(random() * (tierSpan + 1));
    if (tierRoll > enemy.tier) {
      continue;
    }
    const quantitySpan = Math.max(0, drop.quantityMax - drop.quantityMin);
    const quantity = Math.max(1, drop.quantityMin + Math.floor(random() * (quantitySpan + 1)));
    drops.push({ ingredientId: drop.ingredientId, quantity });
  }
  return drops;
}

export function applyFormationArrayPassiveGeneration(state: GameState): void {
  for (const array of state.placedFormationArrays) {
    const node = state.t2Nodes.get(array.nodeId);
    if (!node) {
      continue;
    }
    const source = [...node.t1Nodes.values()].find((t1) => t1.isSourceNode) ?? [...node.t1Nodes.values()][0];
    if (!source) {
      continue;
    }
    source.energy[array.energyType] = Math.min(source.capacity, source.energy[array.energyType] + array.perTickGeneration);
  }
}

export function emptyTreasureCounters() {
  return emptyPool();
}
