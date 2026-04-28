import type { CirculationRoute } from "../core/circulation/types";
import type { CombatAttributes, CultivationAttributes } from "../core/attributes/types";
import type { EnergyPool } from "../core/energy/EnergyType";
import type { Meridian } from "../core/meridians/Meridian";
import type { CultivationTechnique } from "../core/simulation/CultivationTechnique";
import type { T2Node } from "../core/nodes/T2Node";
import type { PlayerDao } from "../core/dao/types";
import type { CombatState } from "../core/combat/types";
import type { PlacedFormationArray, Treasure } from "../core/treasures/types";
import type { AlchemySession, IngredientStack } from "../core/alchemy/types";
import type { EnemyDef } from "../data/enemies/types";
import type { CelestialBody, CelestialCalendar } from "../core/celestial/types";
import type { CompanionState } from "../core/companion/types";
import type { InsightLibraryState } from "../core/insight/insightLibrary";
export type { CirculationRoute } from "../core/circulation/types";

export interface TutorialState {
  completedSteps: string[];
}

export interface GlobalTrackers {
  lifetimeEnergyByType: EnergyPool;
  totalEnergyGenerated: number;
  nodeDamageCount: number;
  combatCount: number;
}

export interface ProgressionUnlockEvent {
  nodeId: string;
  tick: number;
}

export interface ProgressionLevelUpEvent {
  nodeId: string;
  fromLevel: number;
  toLevel: number;
  tick: number;
}

export interface ProgressionBreakthroughEvent {
  nodeId: string;
  fromRank: number;
  toRank: number;
  qualityNodesBoosted: number;
  tick: number;
}

export interface TribulationAttributeBonus {
  cultivationRateMultiplier: number;
}

export interface TribulationPenalty {
  nodeDamageCount: number;
  breakthroughDelayTicks: number;
}

export interface TribulationEvent {
  requiredRank: number;
  enemyWave: EnemyDef[];
  timeLimit: number;
  rewardOnSuccess: TribulationAttributeBonus;
  penaltyOnFailure: TribulationPenalty;
}

export interface PendingBreakthrough {
  nodeId: string;
  fromRank: number;
  toRank: number;
  jingCost: number;
  shenCost: number;
}

export interface TribulationState {
  activeEvent: TribulationEvent | null;
  activeNodeId: string | null;
  pendingBreakthrough: PendingBreakthrough | null;
  currentWaveIndex: number;
  elapsedTicks: number;
  isCultivationPaused: boolean;
  delayUntilTickByNode: Record<string, number>;
  permanentCultivationRateBonus: number;
}

export interface ProgressionState {
  unlockEvents: ProgressionUnlockEvent[];
  levelUpEvents: ProgressionLevelUpEvent[];
  breakthroughEvents: ProgressionBreakthroughEvent[];
}

export interface SectState {
  joinedSectId: string | null;
  elderFavorLevels: Record<string, number>;
}

export interface BodyTemperingState {
  temperingLevel: number;
  temperingXP: number;
  currentTrainingAction: string | null;
  trainingCooldown: number;
}

export interface GameState {
  t2Nodes: Map<string, T2Node>;
  meridians: Map<string, Meridian>;
  bodyHeat: number;
  maxBodyHeat: number;
  /** TASK-078 — ambience multiplier for foot SOLE Jing absorption. */
  environmentModifier: number;
  /** TASK-079 — player toggle for Manipura Qi→YangQi furnace. */
  refiningPulseActive: boolean;
  /** TASK-120 — body HP pool outside combat. */
  hp: number;
  maxHp: number;
  /** TASK-120 — body Soul HP pool outside combat. */
  soulHp: number;
  maxSoulHp: number;
  /** TASK-083 — true when total Jing is below 10% of storable Jing capacity. */
  jingDepletionWarning: boolean;
  activeRoute: CirculationRoute | null;
  technique: CultivationTechnique;
  playerDao: PlayerDao;
  combat: CombatState | null;
  inventory: Treasure[];
  ingredientInventory: IngredientStack[];
  alchemySession: AlchemySession | null;
  placedFormationArrays: PlacedFormationArray[];
  unlockedTechniques: string[];
  nodeSealThresholdModifiers: Record<string, number>;
  globalTrackers: GlobalTrackers;
  tutorial: TutorialState;
  cultivationAttributes: CultivationAttributes;
  combatAttributes: CombatAttributes;
  progression: ProgressionState;
  tribulation: TribulationState;
  /** External systems set flags used by progression gates (e.g. Dao challenges). */
  specialEventFlags: Set<string>;
  sect: SectState;
  bodyTemperingState: BodyTemperingState;
  celestialBodies: CelestialBody[];
  celestialCalendar: CelestialCalendar;
  companion: CompanionState | null;
  insightLibrary: InsightLibraryState;
  tick: number;
  /** S-021 — next tick runs full unlock/upgrade condition pass regardless of throttle. */
  immediateConditionCheck: boolean;
  /** TASK-125 — optional node id receiving direct Jing repair this tick. */
  activeRepairNodeId: string | null;
}
