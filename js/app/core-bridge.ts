import { st } from "./state.ts";
import { buildInitialGameState } from "../../src/core/simulation/bodyMapFactory.ts";
import { combatTick, endCombat, startCombat } from "../../src/core/combat/combatSystem.ts";
import { beginAlchemySession, advanceAlchemyToRefining, refineAlchemySession } from "../../src/core/alchemy/alchemySystem.ts";
import { ENEMY_ARCHETYPES } from "../../src/data/enemies/archetypes.ts";
import type { GameState } from "../../src/state/GameState.ts";
import { applyUiInputsToCoreState, mirrorCoreStateToUi, runUiDrivenCoreTick } from "../../src/uiCore/bridge.ts";
import { T1NodeState } from "../../src/core/nodes/T1Types.ts";
import { joinSect } from "../../src/core/sect/sectSystem.ts";
import {
  autoSaveState,
  deserializeGameState,
  PRIMARY_SAVE_KEY,
  serializeGameState
} from "../../src/state/persistence.ts";
import { UI_BINDU_T2_ID, toUiTier2Id } from "../../src/uiCore/t2UiMapping.ts";

let coreState: GameState = buildInitialGameState();
let autoSaveTimer: number | null = null;
let coreBridgeInitialized = false;

type SoundEventType =
  | "t1_activated"
  | "meridian_state_changed"
  | "breakthrough"
  | "node_damage"
  | "first_shen_generation"
  | "dao_selected";

function emitSoundEvent(type: SoundEventType, tick: number, payload: Record<string, unknown>): void {
  const event = { type, tick, payload };
  st.phase37LastSoundEvents.push(event);
  if (st.phase37LastSoundEvents.length > 64) {
    st.phase37LastSoundEvents.shift();
  }
  if (!st.soundEnabled || typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent("flowmaster:sound", { detail: event }));
}

function processPhase37SoundEvents(prev: GameState, next: GameState): void {
  for (const [t2Id, nextT2] of next.t2Nodes) {
    const prevT2 = prev.t2Nodes.get(t2Id);
    if (!prevT2) continue;
    for (const [t1Id, nextT1] of nextT2.t1Nodes) {
      const prevT1 = prevT2.t1Nodes.get(t1Id);
      if (prevT1 && prevT1.state !== nextT1.state && nextT1.state === T1NodeState.ACTIVE) {
        emitSoundEvent("t1_activated", next.tick, { t2Id, t1Id });
      }
    }
  }
  for (const [id, nextM] of next.meridians) {
    const prevM = prev.meridians.get(id);
    if (prevM && prevM.state !== nextM.state) {
      emitSoundEvent("meridian_state_changed", next.tick, { meridianId: id, state: nextM.state });
    }
  }
  if (next.progression.breakthroughEvents.length > prev.progression.breakthroughEvents.length) {
    const latest = next.progression.breakthroughEvents[next.progression.breakthroughEvents.length - 1];
    st.breakthroughFxTicks = st.breakthroughFxDurationTicks;
    st.breakthroughSourceNodeId = latest?.nodeId ?? null;
    emitSoundEvent("breakthrough", next.tick, { nodeId: latest?.nodeId, toRank: latest?.toRank });
  }
  for (const [t2Id, nextT2] of next.t2Nodes) {
    const prevT2 = prev.t2Nodes.get(t2Id);
    if (!prevT2) continue;
    const prevDamaged = prevT2.nodeDamageState.cracked || prevT2.nodeDamageState.shattered;
    const nextDamaged = nextT2.nodeDamageState.cracked || nextT2.nodeDamageState.shattered;
    if (!prevDamaged && nextDamaged) {
      emitSoundEvent("node_damage", next.tick, {
        t2Id: toUiTier2Id(t2Id),
        cracked: nextT2.nodeDamageState.cracked,
        shattered: nextT2.nodeDamageState.shattered
      });
    }
  }
  if (prev.globalTrackers.lifetimeEnergyByType.Shen <= 0 && next.globalTrackers.lifetimeEnergyByType.Shen > 0) {
    emitSoundEvent("first_shen_generation", next.tick, { shen: next.globalTrackers.lifetimeEnergyByType.Shen });
  }
  if (!prev.playerDao.selectedDao && next.playerDao.selectedDao) {
    emitSoundEvent("dao_selected", next.tick, { dao: next.playerDao.selectedDao });
  }
  const stabilizationStarted = Boolean(next.combat?.stabilizationUsed) && !Boolean(prev.combat?.stabilizationUsed);
  if (stabilizationStarted) {
    st.binduStabilizationFlashTicks = 110;
    st.breakthroughSourceNodeId = UI_BINDU_T2_ID;
  }
}

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
  const prev = coreState;
  coreState = runUiDrivenCoreTick(coreState, {
    refiningPulseActive: st.refiningPulseActive,
    activeBodyRouteNodeIds: st.activeBodyRouteNodeIds
  });
  processPhase37SoundEvents(prev, coreState);
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
