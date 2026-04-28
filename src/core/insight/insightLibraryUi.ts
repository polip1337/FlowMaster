import type { GameState } from "../../state/GameState";
import { getInsightLibraryCatalog, type InsightCategory } from "./insightLibrary";

export interface InsightUiEntry {
  id: string;
  title: string;
  discovered: boolean;
  hint: string;
  discoveredAtTick: number | null;
  bonusSummary: string;
}

export interface InsightUiCategorySection {
  category: InsightCategory;
  title: string;
  entries: InsightUiEntry[];
}

const CATEGORY_LABELS: Record<InsightCategory, string> = {
  body_node_activation: "Body Node Activations",
  rank_breakthrough: "Rank Breakthroughs",
  dao_node_unlock: "Dao Node Unlocks",
  enemy_defeat: "Enemy Defeats",
  treasure_discovery: "Treasure Discoveries",
  meridian_transcendence: "Meridian Transcendence",
  tribulation_success: "Tribulation Victories"
};

function bonusSummary(state: GameState, id: string): string {
  const entry = state.insightLibrary.entries.get(id);
  if (!entry) {
    return "+0.1% (locked)";
  }
  const parts: string[] = [];
  for (const [key, value] of Object.entries(entry.bonus.cultivation)) {
    parts.push(`${key} +${value.toFixed(1)}%`);
  }
  for (const [key, value] of Object.entries(entry.bonus.combat)) {
    parts.push(`${key} +${value.toFixed(1)}%`);
  }
  return parts.length > 0 ? parts.join(", ") : "+0.1%";
}

export function buildInsightLibraryUiModel(state: GameState): InsightUiCategorySection[] {
  const sections = new Map<InsightCategory, InsightUiCategorySection>();
  const catalog = getInsightLibraryCatalog(state);
  for (const item of catalog) {
    if (!sections.has(item.category)) {
      sections.set(item.category, {
        category: item.category,
        title: CATEGORY_LABELS[item.category],
        entries: []
      });
    }
    const unlocked = state.insightLibrary.entries.get(item.id);
    sections.get(item.category)!.entries.push({
      id: item.id,
      title: unlocked ? item.title : `??? ${item.title}`,
      discovered: Boolean(unlocked),
      hint: item.hint,
      discoveredAtTick: unlocked?.discoveredAtTick ?? null,
      bonusSummary: bonusSummary(state, item.id)
    });
  }
  return [...sections.values()];
}
