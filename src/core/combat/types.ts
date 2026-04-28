import type { CombatAttributes } from "../attributes/types";
import type { EnergyPool } from "../energy/EnergyType";
import type { T2Node } from "../nodes/T2Node";
import type { Treasure } from "../treasures/types";
import type { IngredientStack } from "../alchemy/types";
import type { EnemyDef } from "../../data/enemies/types";

export type SkillId = string;

export interface CombatLogEntry {
  tick: number;
  message: string;
}

export interface CombatState {
  active: boolean;
  enemy: EnemyDef;
  playerHp: number;
  playerMaxHp: number;
  playerSoulHp: number;
  playerMaxSoulHp: number;
  combatEnergyPool: EnergyPool;
  enemyHp: number;
  enemySoulHp: number;
  rotation: SkillId[];
  currentSkillIndex: number;
  ticksUntilNextSkill: number;
  stabilizationUsed: boolean;
  heatSnapshot: number;
  combatTick: number;
  log: CombatLogEntry[];
  dodgeCharges: number;
  hp30RollDone: boolean;
  hp10RollDone: boolean;
}

export interface CombatTickResult {
  combat: CombatState;
  outcome: "player_win" | "player_loss" | "ongoing";
}

export interface CombatEndResult {
  state: import("../../state/GameState").GameState;
  outcome: "player_win" | "player_loss";
  droppedTreasures: Treasure[];
  droppedIngredients: IngredientStack[];
}

export interface CombatTickContext {
  attributes: CombatAttributes;
  criticalInsight: number;
  t2Nodes: Map<string, T2Node>;
  playerDaoNodes?: Map<string, T2Node>;
  random?: () => number;
}
