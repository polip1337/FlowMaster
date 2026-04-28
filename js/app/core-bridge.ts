import { st } from "./state.ts";
import { buildInitialGameState } from "../../src/core/simulation/bodyMapFactory.ts";
import { combatTick, endCombat, startCombat } from "../../src/core/combat/combatSystem.ts";
import { beginAlchemySession, advanceAlchemyToRefining, refineAlchemySession } from "../../src/core/alchemy/alchemySystem.ts";
import { ENEMY_ARCHETYPES } from "../../src/data/enemies/archetypes.ts";
import type { GameState } from "../../src/state/GameState.ts";
import { applyUiInputsToCoreState, mirrorCoreStateToUi, runUiDrivenCoreTick } from "../../src/uiCore/bridge.ts";
import { joinSect } from "../../src/core/sect/sectSystem.ts";
import {
  autoSaveState,
  deserializeGameState,
  PRIMARY_SAVE_KEY,
  serializeGameState
} from "../../src/state/persistence.ts";

let coreState: GameState = buildInitialGameState();
let autoSaveTimer: number | null = null;
let coreBridgeInitialized = false;

export function isCoreBridgeInitialized(): boolean {
  return coreBridgeInitialized;
}

function combatTickContextFromState(state: GameState) {
  return {
    attributes: state.combatAttributes,
    criticalInsight: state.combatAttributes.criticalInsight,
    t2Nodes: state.t2Nodes
  };
}

function stepCombatIfActive(state: GameState): GameState {
  if (!state.combat) {
    return state;
  }
  const next = structuredClone(state);
  const result = combatTick(next.combat!, combatTickContextFromState(next));
  if (result.outcome === "ongoing") {
    return next;
  }
  return endCombat(next, result.outcome === "player_win" ? "player_win" : "player_loss").state;
}

function syncUiFromCore() {
  mirrorCoreStateToUi(coreState, st);
}

export function initializeCoreBridgeFromUi(): void {
  loadCoreStateFromLocalStorage();
  coreState = applyUiInputsToCoreState(coreState, {
    refiningPulseActive: st.refiningPulseActive,
    activeBodyRouteNodeIds: st.activeBodyRouteNodeIds
  });
  coreBridgeInitialized = true;
  syncUiFromCore();
}

export function advanceCoreBridgeTick(): void {
  if (!coreBridgeInitialized) {
    return;
  }
  coreState = runUiDrivenCoreTick(coreState, {
    refiningPulseActive: st.refiningPulseActive,
    activeBodyRouteNodeIds: st.activeBodyRouteNodeIds
  });
  coreState = stepCombatIfActive(coreState);
  syncUiFromCore();
}

export function startCoreCombatFromUi(enemyId: string): void {
  if (!coreBridgeInitialized) {
    return;
  }
  const enemy = ENEMY_ARCHETYPES.find((entry) => entry.id === enemyId) ?? ENEMY_ARCHETYPES[0];
  coreState = startCombat(coreState, enemy);
  syncUiFromCore();
}

export function beginCoreAlchemyFromUi(recipeId: string): boolean {
  if (!coreBridgeInitialized) {
    return true;
  }
  try {
    coreState = beginAlchemySession(coreState, recipeId);
    return true;
  } catch {
    return false;
  } finally {
    syncUiFromCore();
  }
}

export function advanceCoreAlchemyToRefiningFromUi(): boolean {
  if (!coreBridgeInitialized) {
    return true;
  }
  try {
    coreState = advanceAlchemyToRefining(coreState);
    return true;
  } catch {
    return false;
  } finally {
    syncUiFromCore();
  }
}

export function refineCoreAlchemyFromUi(desiredGain: number): boolean {
  if (!coreBridgeInitialized) {
    return true;
  }
  try {
    coreState = refineAlchemySession(coreState, desiredGain);
    return true;
  } catch {
    return false;
  } finally {
    syncUiFromCore();
  }
}

export function joinCoreSectFromUi(sectId: string): boolean {
  if (!coreBridgeInitialized) {
    return true;
  }
  try {
    coreState = joinSect(coreState, sectId);
    return true;
  } catch {
    return false;
  } finally {
    syncUiFromCore();
  }
}

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
}

export function saveCoreStateToLocalStorage(): boolean {
  const storage = getBrowserStorage();
  if (!storage) return false;
  autoSaveState(coreState, storage);
  return true;
}

export function loadCoreStateFromLocalStorage(): boolean {
  const storage = getBrowserStorage();
  if (!storage) return false;
  const raw = storage.getItem(PRIMARY_SAVE_KEY);
  if (!raw) return false;
  try {
    coreState = deserializeGameState(raw);
    syncUiFromCore();
    return true;
  } catch {
    return false;
  }
}

export function exportCoreStateAsJson(): string {
  return serializeGameState(coreState);
}

export function importCoreStateFromJson(json: string): boolean {
  try {
    coreState = deserializeGameState(json);
    syncUiFromCore();
    return true;
  } catch {
    return false;
  }
}

export function startCoreAutoSave(intervalMs = 60_000): void {
  const storage = getBrowserStorage();
  if (!storage) return;
  if (autoSaveTimer !== null) {
    window.clearInterval(autoSaveTimer);
  }
  autoSaveTimer = window.setInterval(() => {
    autoSaveState(coreState, storage);
  }, intervalMs);
}
