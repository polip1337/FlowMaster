import { simulationTick } from "../core/simulation/tick";
import { createEmptyRoute } from "../core/circulation/types";
import { makeMeridianId, parseForwardId } from "../core/meridians/meridianId";
import type { GameState } from "../state/GameState";

export interface UiRouteInput {
  activeBodyRouteNodeIds: string[];
}

export interface UiCoreInputs extends UiRouteInput {
  refiningPulseActive: boolean;
}

export interface UiMirrorState {
  tickCounter: number;
  bodyHeat: number;
  maxBodyHeat: number;
  refiningPulseActive: boolean;
  temperingLevel: number;
  temperingXp: number;
  temperingAction: string;
  daoSelected: string | null;
  daoInsights: number;
  daoComprehensionLevel: number;
  combatEncountered: boolean;
  combatPhase: "prep" | "active" | "summary";
  combatTick: number;
  combatPlayerHp: number;
  combatPlayerMaxHp: number;
  combatPlayerSoulHp: number;
  combatPlayerMaxSoulHp: number;
  combatEnemyHp: number;
  combatEnemyMaxHp: number;
  combatEnemySoulHp: number;
  combatEnemyMaxSoulHp: number;
  celestialDayOfYear: number;
  celestialSeason: "Spring" | "Summer" | "Autumn" | "Winter";
  celestialActiveConjunctions: string[];
  celestialBodies: Array<{ id: string; linkedT2NodeId: string; currentSign: string }>;
  sectJoinedId: string | null;
  sectElderFavorLevels: Record<string, number>;
  unlockedTechniques: string[];
  t2NodeRanks: Record<string, number>;
}

export function normalizeToCoreMeridianId(id: string): string {
  if (id.includes("::")) {
    const [from, to] = parseForwardId(id);
    return makeMeridianId(from, to);
  }
  if (id.includes("->")) {
    const [from, to] = id.split("->");
    if (!from || !to) {
      throw new Error(`Invalid legacy meridian id: ${id}`);
    }
    return makeMeridianId(from, to);
  }
  throw new Error(`Unsupported meridian id format: ${id}`);
}

export function routeNodeSequenceToMeridianIds(nodeSequence: string[]): string[] {
  const ids: string[] = [];
  for (let i = 0; i < nodeSequence.length - 1; i += 1) {
    ids.push(makeMeridianId(nodeSequence[i], nodeSequence[i + 1]));
  }
  return ids;
}

export function applyUiInputsToCoreState(state: GameState, ui: UiCoreInputs): GameState {
  const next = structuredClone(state);
  next.refiningPulseActive = ui.refiningPulseActive;
  const routeNodeIds = ui.activeBodyRouteNodeIds;
  const closedLoop = routeNodeIds.length >= 3 && routeNodeIds[0] === routeNodeIds[routeNodeIds.length - 1];
  if (closedLoop) {
    const route = createEmptyRoute("ui-route");
    route.nodeSequence = [...routeNodeIds];
    route.isActive = true;
    next.activeRoute = route;
  } else {
    next.activeRoute = null;
  }
  return next;
}

export function mirrorCoreStateToUi(core: GameState, ui: UiMirrorState): void {
  ui.tickCounter = core.tick;
  ui.bodyHeat = core.bodyHeat;
  ui.maxBodyHeat = core.maxBodyHeat;
  ui.refiningPulseActive = core.refiningPulseActive;
  ui.temperingLevel = core.bodyTemperingState.temperingLevel;
  ui.temperingXp = core.bodyTemperingState.temperingXP;
  ui.temperingAction = core.bodyTemperingState.currentTrainingAction ?? ui.temperingAction;
  ui.daoSelected = core.playerDao.selectedDao;
  ui.daoInsights = core.playerDao.daoInsights;
  ui.daoComprehensionLevel = core.playerDao.comprehensionLevel;
  ui.celestialDayOfYear = core.celestialCalendar.dayOfYear;
  ui.celestialSeason = core.celestialCalendar.season;
  ui.celestialActiveConjunctions = [...core.celestialCalendar.activeConjunctions];
  ui.celestialBodies = core.celestialBodies.map((body) => ({
    id: body.id,
    linkedT2NodeId: body.linkedT2NodeId,
    currentSign: body.currentSign
  }));
  ui.sectJoinedId = core.sect.joinedSectId;
  ui.sectElderFavorLevels = { ...core.sect.elderFavorLevels };
  ui.unlockedTechniques = [...core.unlockedTechniques];
  const t2NodeRanks: Record<string, number> = {};
  for (const [nodeId, node] of core.t2Nodes) {
    t2NodeRanks[nodeId] = node.rank;
  }
  ui.t2NodeRanks = t2NodeRanks;
  ui.combatEncountered = ui.combatEncountered || core.combat !== null || core.globalTrackers.combatCount > 0;
  if (!core.combat) {
    ui.combatPhase = "prep";
    ui.combatTick = 0;
    ui.combatPlayerHp = core.hp;
    ui.combatPlayerMaxHp = core.maxHp;
    ui.combatPlayerSoulHp = core.soulHp;
    ui.combatPlayerMaxSoulHp = core.maxSoulHp;
    return;
  }
  ui.combatPhase = "active";
  ui.combatTick = core.combat.combatTick;
  ui.combatPlayerHp = core.combat.playerHp;
  ui.combatPlayerMaxHp = core.combat.playerMaxHp;
  ui.combatPlayerSoulHp = core.combat.playerSoulHp;
  ui.combatPlayerMaxSoulHp = core.combat.playerMaxSoulHp;
  ui.combatEnemyHp = core.combat.enemyHp;
  ui.combatEnemyMaxHp = core.combat.enemy.hp;
  ui.combatEnemySoulHp = core.combat.enemySoulHp;
  ui.combatEnemyMaxSoulHp = core.combat.enemy.soulHp;
}

export function runUiDrivenCoreTick(state: GameState, ui: UiCoreInputs): GameState {
  const prepared = applyUiInputsToCoreState(state, ui);
  return simulationTick(prepared);
}
