import { st } from "./state.ts";
import { buildInitialGameState } from "../../src/core/simulation/bodyMapFactory.ts";
import { combatTick, endCombat, startCombat } from "../../src/core/combat/combatSystem.ts";
import { beginAlchemySession, advanceAlchemyToRefining, refineAlchemySession } from "../../src/core/alchemy/alchemySystem.ts";
import { ENEMY_ARCHETYPES } from "../../src/data/enemies/archetypes.ts";
import type { GameState } from "../../src/state/GameState.ts";
import { applyUiInputsToCoreState, mirrorCoreStateToUi, runUiDrivenCoreTick } from "../../src/uiCore/bridge.ts";

let coreState: GameState = buildInitialGameState();

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
  coreState = applyUiInputsToCoreState(coreState, {
    refiningPulseActive: st.refiningPulseActive,
    activeBodyRouteNodeIds: st.activeBodyRouteNodeIds
  });
  syncUiFromCore();
}

export function advanceCoreBridgeTick(): void {
  coreState = runUiDrivenCoreTick(coreState, {
    refiningPulseActive: st.refiningPulseActive,
    activeBodyRouteNodeIds: st.activeBodyRouteNodeIds
  });
  coreState = stepCombatIfActive(coreState);
  syncUiFromCore();
}

export function startCoreCombatFromUi(enemyId: string): void {
  const enemy = ENEMY_ARCHETYPES.find((entry) => entry.id === enemyId) ?? ENEMY_ARCHETYPES[0];
  coreState = startCombat(coreState, enemy);
  syncUiFromCore();
}

export function beginCoreAlchemyFromUi(recipeId: string): boolean {
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
  try {
    coreState = refineAlchemySession(coreState, desiredGain);
    return true;
  } catch {
    return false;
  } finally {
    syncUiFromCore();
  }
}
