import { buildConditionState } from "../progression/conditionSnapshot";
import { evaluateUnlockConditions } from "../nodes/conditionEvaluator";
import { DaoType } from "../dao/types";
import type { GameState } from "../../state/GameState";
import type { CombatAttributes, CultivationAttributes } from "../attributes/types";
import type { Elder, Sect } from "./types";
import { SECTS } from "../../data/sects/sects";

const DAO_RELEVANT_NODE: Record<DaoType, string> = {
  [DaoType.Earth]: "MULADHARA",
  [DaoType.Fire]: "MANIPURA",
  [DaoType.Water]: "SVADHISTHANA",
  [DaoType.Wind]: "VISHUDDHA",
  [DaoType.Void]: "AJNA",
  [DaoType.Life]: "ANAHATA",
  [DaoType.Sword]: "L_HAND",
  [DaoType.Thunder]: "VISHUDDHA"
};

function clampFavor(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function requiredRankFromConditions(elder: Elder): number {
  let minRank = 1;
  for (const condition of elder.requirement) {
    if (condition.type === "node_rank") {
      minRank = Math.max(minRank, condition.minRank);
    }
  }
  return minRank;
}

function getElderFavorLevel(state: GameState, elderId: string, defaultLevel = 0): number {
  return state.sect.elderFavorLevels[elderId] ?? defaultLevel;
}

function applyPartial<T extends Record<string, number>>(target: T, partial: Partial<T>, scalar: number): void {
  for (const key of Object.keys(partial) as Array<keyof T>) {
    target[key] += (partial[key] ?? 0) * scalar;
  }
}

export function listSects(): Sect[] {
  return SECTS;
}

export function getSectById(sectId: string): Sect | undefined {
  return SECTS.find((sect) => sect.id === sectId);
}

export function canLearnFromElder(elder: Elder, state: GameState): boolean {
  const conditionState = buildConditionState(state);
  if (!evaluateUnlockConditions(elder.requirement, conditionState)) {
    return false;
  }
  const relevantNode = state.t2Nodes.get(DAO_RELEVANT_NODE[elder.daoType]);
  if (!relevantNode) {
    return false;
  }
  const requiredRank = requiredRankFromConditions(elder);
  return relevantNode.rank >= requiredRank;
}

export function learnFromElder(elder: Elder, manualId: string, state: GameState): GameState {
  if (!elder.teachableManuals.includes(manualId)) {
    throw new Error(`Manual ${manualId} is not taught by elder ${elder.id}.`);
  }
  if (!canLearnFromElder(elder, state)) {
    throw new Error(`Requirements not met to learn from elder ${elder.id}.`);
  }
  if (!state.unlockedTechniques.includes(manualId)) {
    state.unlockedTechniques.push(manualId);
  }
  const currentFavor = getElderFavorLevel(state, elder.id, elder.favorLevel);
  state.sect.elderFavorLevels[elder.id] = clampFavor(currentFavor + 5);
  return state;
}

export function joinSect(state: GameState, sectId: string): GameState {
  const sect = getSectById(sectId);
  if (!sect) {
    throw new Error(`Unknown sect: ${sectId}`);
  }
  if (state.sect.joinedSectId && state.sect.joinedSectId !== sectId) {
    throw new Error("Sect membership is irreversible once joined.");
  }
  state.sect.joinedSectId = sectId;
  if (state.sect.elderFavorLevels[sect.homeElder.id] === undefined) {
    state.sect.elderFavorLevels[sect.homeElder.id] = clampFavor(sect.homeElder.favorLevel);
  }
  return state;
}

export function gainSectFavorFromCombat(state: GameState, areaDaoType: DaoType, gain = 3): GameState {
  const sect = state.sect.joinedSectId ? getSectById(state.sect.joinedSectId) : undefined;
  if (!sect || sect.homeElder.daoType !== areaDaoType) {
    return state;
  }
  const elderId = sect.homeElder.id;
  const current = getElderFavorLevel(state, elderId, sect.homeElder.favorLevel);
  state.sect.elderFavorLevels[elderId] = clampFavor(current + gain);
  return state;
}

export function getSectBenefitsMultiplier(state: GameState, sect: Sect): number {
  const favor = getElderFavorLevel(state, sect.homeElder.id, sect.homeElder.favorLevel);
  return favor / 100;
}

export function applySectMemberBenefits(
  state: GameState,
  cultivation: CultivationAttributes,
  combat: CombatAttributes
): void {
  const sect = state.sect.joinedSectId ? getSectById(state.sect.joinedSectId) : undefined;
  if (!sect) {
    return;
  }
  const scalar = getSectBenefitsMultiplier(state, sect);
  if (scalar <= 0) {
    return;
  }
  applyPartial(cultivation, sect.memberBenefits.cultivation, scalar);
  applyPartial(combat, sect.memberBenefits.combat, scalar);
}

export function getAvailableSectFormationArrays(state: GameState, isAtRestLocation: boolean) {
  const sect = state.sect.joinedSectId ? getSectById(state.sect.joinedSectId) : undefined;
  if (!sect || !isAtRestLocation) {
    return [];
  }
  return sect.availableFormationArrays;
}
