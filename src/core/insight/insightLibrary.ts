import type { CombatAttributes, CultivationAttributes } from "../attributes/types";
import { T2NodeState } from "../nodes/T2Types";
import { MeridianState } from "../meridians/MeridianTypes";
import { T2_NODE_DEFS_BY_ID } from "../../data/t2NodeDefs";
import { DAO_NODE_DEFS_BY_TYPE } from "../../data/dao";
import { ENEMY_ARCHETYPES } from "../../data/enemies/archetypes";
import { TreasureType } from "../treasures/types";
import type { GameState } from "../../state/GameState";
import type { DaoType } from "../dao/types";

export type InsightCategory =
  | "body_node_activation"
  | "rank_breakthrough"
  | "dao_node_unlock"
  | "enemy_defeat"
  | "treasure_discovery"
  | "meridian_transcendence"
  | "tribulation_success";

export interface InsightAttributeBundle {
  cultivation: Partial<CultivationAttributes>;
  combat: Partial<CombatAttributes>;
}

export interface CodexEntry {
  id: string;
  category: InsightCategory;
  title: string;
  description: string;
  hint: string;
  discoveredAtTick: number;
  bonus: InsightAttributeBundle;
}

export interface InsightLibraryState {
  entries: Map<string, CodexEntry>;
  totalEntries: number;
  permanentBonuses: InsightAttributeBundle;
}

export interface CodexCatalogEntry {
  id: string;
  category: InsightCategory;
  title: string;
  hint: string;
}

const ENTRY_BONUS_AMOUNT = 0.1;

const TREASURE_TYPES: TreasureType[] = [
  TreasureType.CondensedEssencePill,
  TreasureType.RefiningStone,
  TreasureType.MeridianSalve,
  TreasureType.MeridianRestoration,
  TreasureType.JingDeposit,
  TreasureType.DaoFragment,
  TreasureType.RecoveryElixir,
  TreasureType.FormationArray
];

function emptyBonusBundle(): InsightAttributeBundle {
  return { cultivation: {}, combat: {} };
}

function addBonus(target: InsightAttributeBundle, source: InsightAttributeBundle): void {
  for (const key of Object.keys(source.cultivation) as Array<keyof CultivationAttributes>) {
    target.cultivation[key] = (target.cultivation[key] ?? 0) + (source.cultivation[key] ?? 0);
  }
  for (const key of Object.keys(source.combat) as Array<keyof CombatAttributes>) {
    target.combat[key] = (target.combat[key] ?? 0) + (source.combat[key] ?? 0);
  }
}

function activationBonusForNode(nodeId: string): InsightAttributeBundle {
  const def = T2_NODE_DEFS_BY_ID.get(nodeId);
  const affinity = def?.primaryAffinity ?? "Qi";
  if (affinity === "Jing") {
    return { cultivation: { jingGenerationRate: ENTRY_BONUS_AMOUNT }, combat: {} };
  }
  if (affinity === "Shen") {
    return { cultivation: { shenGenerationRate: ENTRY_BONUS_AMOUNT }, combat: {} };
  }
  if (affinity === "YangQi") {
    return { cultivation: { yangQiConversionEfficiency: ENTRY_BONUS_AMOUNT }, combat: {} };
  }
  return { cultivation: { circulationSpeed: ENTRY_BONUS_AMOUNT }, combat: {} };
}

function treasureBonusForType(type: TreasureType): InsightAttributeBundle {
  if (type === TreasureType.DaoFragment) {
    return { cultivation: { daoInsightGain: ENTRY_BONUS_AMOUNT }, combat: {} };
  }
  if (type === TreasureType.RecoveryElixir || type === TreasureType.MeridianRestoration) {
    return { cultivation: { meridianRepairRate: ENTRY_BONUS_AMOUNT }, combat: {} };
  }
  return { cultivation: { criticalInsight: ENTRY_BONUS_AMOUNT }, combat: {} };
}

function ensureEntry(state: GameState, entry: Omit<CodexEntry, "discoveredAtTick">): boolean {
  if (state.insightLibrary.entries.has(entry.id)) {
    return false;
  }
  const fullEntry: CodexEntry = {
    ...entry,
    discoveredAtTick: state.tick
  };
  state.insightLibrary.entries.set(fullEntry.id, fullEntry);
  state.insightLibrary.totalEntries = state.insightLibrary.entries.size;
  addBonus(state.insightLibrary.permanentBonuses, fullEntry.bonus);
  return true;
}

function processBodyNodeActivations(state: GameState): void {
  for (const event of state.progression.unlockEvents) {
    const nodeId = event.nodeId;
    const node = state.t2Nodes.get(nodeId);
    if (!node || (node.state !== T2NodeState.ACTIVE && node.state !== T2NodeState.REFINED)) {
      continue;
    }
    const def = T2_NODE_DEFS_BY_ID.get(nodeId);
    ensureEntry(state, {
      id: `insight:t2:${nodeId}`,
      category: "body_node_activation",
      title: `Body Node Awakened: ${def?.displayName ?? nodeId}`,
      description: `${def?.displayName ?? nodeId} has been activated for the first time.`,
      hint: `Awaken ${def?.displayName ?? nodeId}.`,
      bonus: activationBonusForNode(nodeId)
    });
  }
}

function processRankBreakthroughs(state: GameState): void {
  for (const event of state.progression.breakthroughEvents) {
    const rank = event.toRank;
    ensureEntry(state, {
      id: `insight:rank:${rank}`,
      category: "rank_breakthrough",
      title: `Realm Insight: Rank ${rank}`,
      description: `First successful breakthrough to body rank ${rank}.`,
      hint: `Reach body rank ${rank} with any active node.`,
      bonus: { cultivation: { maxEnergyBonus: ENTRY_BONUS_AMOUNT }, combat: {} }
    });
  }
}

function processDaoNodeUnlocks(state: GameState): void {
  for (const [nodeId, node] of state.playerDao.daoNodes) {
    if (node.state !== T2NodeState.ACTIVE && node.state !== T2NodeState.REFINED) {
      continue;
    }
    ensureEntry(state, {
      id: `insight:dao:${nodeId}`,
      category: "dao_node_unlock",
      title: `Dao Node Unlocked: ${node.name}`,
      description: `${node.name} was comprehended and activated.`,
      hint: `Comprehend and activate ${node.name}.`,
      bonus: { cultivation: { daoInsightGain: ENTRY_BONUS_AMOUNT }, combat: {} }
    });
  }
}

function processEventFlags(state: GameState): void {
  const processed: string[] = [];
  for (const flag of state.specialEventFlags) {
    if (flag.startsWith("event:enemy_defeated:")) {
      const enemyId = flag.replace("event:enemy_defeated:", "");
      const enemy = ENEMY_ARCHETYPES.find((candidate) => candidate.id === enemyId);
      ensureEntry(state, {
        id: `insight:enemy:${enemyId}`,
        category: "enemy_defeat",
        title: `Enemy Studied: ${enemy?.name ?? enemyId}`,
        description: `First victory against ${enemy?.name ?? enemyId}.`,
        hint: `Defeat ${enemy?.name ?? enemyId} once.`,
        bonus: { cultivation: {}, combat: { physicalPower: ENTRY_BONUS_AMOUNT } }
      });
      processed.push(flag);
      continue;
    }

    if (flag.startsWith("event:treasure_acquired:")) {
      const rawType = flag.replace("event:treasure_acquired:", "") as TreasureType;
      ensureEntry(state, {
        id: `insight:treasure:${rawType}`,
        category: "treasure_discovery",
        title: `Treasure Cataloged: ${rawType}`,
        description: `First acquisition of treasure type ${rawType}.`,
        hint: `Acquire a ${rawType} treasure.`,
        bonus: treasureBonusForType(rawType)
      });
      processed.push(flag);
      continue;
    }

    if (flag.startsWith("event:insight_library:tribulation_success:")) {
      const rank = Number(flag.split(":").at(-1) ?? "0");
      ensureEntry(state, {
        id: `insight:tribulation:${rank}`,
        category: "tribulation_success",
        title: `Tribulation Cleared: Rank ${rank}`,
        description: `Tribulation for rank ${rank} was conquered.`,
        hint: `Survive and clear a rank ${rank} tribulation.`,
        bonus: { cultivation: { refinementRate: ENTRY_BONUS_AMOUNT }, combat: { soulDurability: ENTRY_BONUS_AMOUNT } }
      });
      processed.push(flag);
    }
  }
  for (const flag of processed) {
    state.specialEventFlags.delete(flag);
  }
}

function processMeridianTranscendence(state: GameState): void {
  for (const [id, meridian] of state.meridians) {
    if (meridian.state !== MeridianState.TRANSCENDENT) {
      continue;
    }
    ensureEntry(state, {
      id: `insight:meridian:${id}`,
      category: "meridian_transcendence",
      title: `Meridian Transcendent: ${id}`,
      description: `${id} reached TRANSCENDENT state.`,
      hint: `Train ${id} until TRANSCENDENT.`,
      bonus: { cultivation: { circulationSpeed: ENTRY_BONUS_AMOUNT }, combat: {} }
    });
  }
}

function collectDaoCatalogEntries(): CodexCatalogEntry[] {
  const out: CodexCatalogEntry[] = [];
  for (const dao of Object.keys(DAO_NODE_DEFS_BY_TYPE) as DaoType[]) {
    const defs = DAO_NODE_DEFS_BY_TYPE[dao];
    for (const def of defs) {
      out.push({
        id: `insight:dao:${def.id}`,
        category: "dao_node_unlock",
        title: `Dao Node Unlocked: ${def.name}`,
        hint: `Comprehend and activate ${def.name}.`
      });
    }
  }
  return out;
}

export function createInitialInsightLibraryState(): InsightLibraryState {
  return {
    entries: new Map<string, CodexEntry>(),
    totalEntries: 0,
    permanentBonuses: emptyBonusBundle()
  };
}

export function processInsightLibraryTriggers(state: GameState): void {
  processBodyNodeActivations(state);
  processRankBreakthroughs(state);
  processDaoNodeUnlocks(state);
  processMeridianTranscendence(state);
  processEventFlags(state);
}

export function applyInsightPermanentBonuses(
  cultivation: CultivationAttributes,
  combat: CombatAttributes,
  insightLibrary: InsightLibraryState
): void {
  addBonus(
    { cultivation, combat },
    insightLibrary.permanentBonuses
  );
}

export function getInsightLibraryCatalog(state: GameState): CodexCatalogEntry[] {
  const rankEntries: CodexCatalogEntry[] = Array.from({ length: 9 }, (_, index) => {
    const rank = index + 1;
    return {
      id: `insight:rank:${rank}`,
      category: "rank_breakthrough",
      title: `Realm Insight: Rank ${rank}`,
      hint: `Reach body rank ${rank} with any active node.`
    };
  });
  const nodeEntries: CodexCatalogEntry[] = [...state.t2Nodes.keys()].map((id) => {
    const def = T2_NODE_DEFS_BY_ID.get(id);
    return {
      id: `insight:t2:${id}`,
      category: "body_node_activation",
      title: `Body Node Awakened: ${def?.displayName ?? id}`,
      hint: `Awaken ${def?.displayName ?? id}.`
    };
  });
  const enemyEntries: CodexCatalogEntry[] = ENEMY_ARCHETYPES.map((enemy) => ({
    id: `insight:enemy:${enemy.id}`,
    category: "enemy_defeat",
    title: `Enemy Studied: ${enemy.name}`,
    hint: `Defeat ${enemy.name} once.`
  }));
  const treasureEntries: CodexCatalogEntry[] = TREASURE_TYPES.map((type) => ({
    id: `insight:treasure:${type}`,
    category: "treasure_discovery",
    title: `Treasure Cataloged: ${type}`,
    hint: `Acquire a ${type} treasure.`
  }));
  const meridianEntries: CodexCatalogEntry[] = [...state.meridians.keys()].map((id) => ({
    id: `insight:meridian:${id}`,
    category: "meridian_transcendence",
    title: `Meridian Transcendent: ${id}`,
    hint: `Train ${id} until TRANSCENDENT.`
  }));
  const tribulationEntries: CodexCatalogEntry[] = Array.from({ length: 8 }, (_, index) => {
    const rank = index + 2;
    return {
      id: `insight:tribulation:${rank}`,
      category: "tribulation_success",
      title: `Tribulation Cleared: Rank ${rank}`,
      hint: `Survive and clear a rank ${rank} tribulation.`
    };
  });
  return [
    ...nodeEntries,
    ...rankEntries,
    ...collectDaoCatalogEntries(),
    ...enemyEntries,
    ...treasureEntries,
    ...meridianEntries,
    ...tribulationEntries
  ];
}
