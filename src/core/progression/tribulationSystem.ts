import type { CombatTickContext } from "../combat/types";
import { combatTick, startCombat } from "../combat/combatSystem";
import { crackNode } from "../combat/nodeDamage";
import { ENEMY_ARCHETYPES } from "../../data/enemies/archetypes";
import type { GameState, TribulationEvent } from "../../state/GameState";

const ONE_HOUR_IN_GAME_TICKS = 36_000;
const DEFAULT_TRIBULATION_TIME_LIMIT = 1_800;
const DEFAULT_CULTIVATION_RATE_BONUS = 0.05;

function tribulationEnemyForRank(requiredRank: number) {
  if (requiredRank >= 7) {
    return ENEMY_ARCHETYPES.find((e) => e.id === "tribulation-spirit") ?? ENEMY_ARCHETYPES[ENEMY_ARCHETYPES.length - 1];
  }
  if (requiredRank >= 5) {
    return ENEMY_ARCHETYPES.find((e) => e.id === "ancient-guardian") ?? ENEMY_ARCHETYPES[3];
  }
  if (requiredRank >= 3) {
    return ENEMY_ARCHETYPES.find((e) => e.id === "rogue-scholar") ?? ENEMY_ARCHETYPES[2];
  }
  return ENEMY_ARCHETYPES.find((e) => e.id === "wild-beast") ?? ENEMY_ARCHETYPES[1];
}

export function createTribulationEvent(requiredRank: number): TribulationEvent {
  const waveCount = Math.max(1, Math.min(3, requiredRank - 1));
  const enemyWave = Array.from({ length: waveCount }, () => tribulationEnemyForRank(requiredRank));
  return {
    requiredRank,
    enemyWave,
    timeLimit: DEFAULT_TRIBULATION_TIME_LIMIT,
    rewardOnSuccess: {
      cultivationRateMultiplier: DEFAULT_CULTIVATION_RATE_BONUS
    },
    penaltyOnFailure: {
      nodeDamageCount: 1,
      breakthroughDelayTicks: ONE_HOUR_IN_GAME_TICKS
    }
  };
}

export function isTribulationActive(state: GameState): boolean {
  return state.tribulation.activeEvent !== null;
}

export function triggerTribulation(
  state: GameState,
  nodeId: string,
  fromRank: number,
  toRank: number,
  jingCost: number,
  shenCost: number
): boolean {
  if (state.tribulation.activeEvent || state.tribulation.pendingBreakthrough) {
    return false;
  }
  const delayUntil = state.tribulation.delayUntilTickByNode[nodeId] ?? 0;
  if (state.tick < delayUntil) {
    return false;
  }

  const event = createTribulationEvent(toRank);
  state.tribulation.activeEvent = event;
  state.tribulation.activeNodeId = nodeId;
  state.tribulation.pendingBreakthrough = {
    nodeId,
    fromRank,
    toRank,
    jingCost,
    shenCost
  };
  state.tribulation.currentWaveIndex = 0;
  state.tribulation.elapsedTicks = 0;
  state.tribulation.isCultivationPaused = true;
  state.specialEventFlags.add(`event:tribulation_started:${nodeId}:${toRank}`);
  return true;
}

function finishTribulation(state: GameState): void {
  state.tribulation.activeEvent = null;
  state.tribulation.activeNodeId = null;
  state.tribulation.pendingBreakthrough = null;
  state.tribulation.currentWaveIndex = 0;
  state.tribulation.elapsedTicks = 0;
  state.tribulation.isCultivationPaused = false;
}

export function startActiveTribulationCombat(state: GameState): GameState {
  const event = state.tribulation.activeEvent;
  if (!event || event.enemyWave.length === 0) {
    return state;
  }
  return startCombat(state, event.enemyWave[0]);
}

function crackRandomActiveNode(state: GameState, random: () => number): void {
  const activeNodes = [...state.t2Nodes.values()].filter((n) => n.state === "ACTIVE" || n.state === "REFINED");
  if (activeNodes.length === 0) {
    return;
  }
  const idx = Math.max(0, Math.min(activeNodes.length - 1, Math.floor(random() * activeNodes.length)));
  crackNode(activeNodes[idx]);
  state.globalTrackers.nodeDamageCount += 1;
}

function applyTribulationFailure(state: GameState, random: () => number): void {
  const nodeId = state.tribulation.activeNodeId;
  const event = state.tribulation.activeEvent;
  if (event && nodeId) {
    state.tribulation.delayUntilTickByNode[nodeId] = state.tick + event.penaltyOnFailure.breakthroughDelayTicks;
    for (let i = 0; i < event.penaltyOnFailure.nodeDamageCount; i += 1) {
      crackRandomActiveNode(state, random);
    }
    state.specialEventFlags.add(`event:tribulation_failed:${nodeId}:${event.requiredRank}`);
  }
  state.combat = null;
  finishTribulation(state);
}

function applyTribulationSuccess(state: GameState): void {
  const event = state.tribulation.activeEvent;
  const pending = state.tribulation.pendingBreakthrough;
  const nodeId = state.tribulation.activeNodeId;
  if (!event || !pending || !nodeId) {
    finishTribulation(state);
    return;
  }

  state.tribulation.permanentCultivationRateBonus += event.rewardOnSuccess.cultivationRateMultiplier;
  state.specialEventFlags.add(`event:tribulation_success:${nodeId}:${pending.toRank}`);
  state.specialEventFlags.add("event:insight_library:tribulation_success");
  // Force the next tick to evaluate progression finalization immediately.
  state.immediateConditionCheck = true;
  state.combat = null;
}

function startNextWave(state: GameState): void {
  const event = state.tribulation.activeEvent;
  const previousCombat = state.combat;
  if (!event || !previousCombat) {
    return;
  }
  const nextWaveIndex = state.tribulation.currentWaveIndex + 1;
  const enemy = event.enemyWave[nextWaveIndex];
  if (!enemy) {
    return;
  }
  state.tribulation.currentWaveIndex = nextWaveIndex;
  state.combat = {
    ...previousCombat,
    enemy,
    enemyHp: enemy.hp,
    enemySoulHp: enemy.soulHp,
    combatTick: 0,
    log: [...previousCombat.log, { tick: 0, message: `Tribulation wave ${nextWaveIndex + 1} started: ${enemy.name}.` }]
  };
}

export function applyTribulationCombatTick(
  state: GameState,
  context: CombatTickContext,
  random: () => number = Math.random
): GameState {
  const event = state.tribulation.activeEvent;
  if (!event || !state.combat) {
    return state;
  }

  const result = combatTick(state.combat, {
    ...context,
    disableEnergyRegen: true,
    random: context.random ?? random
  });
  state.combat = result.combat;
  state.tribulation.elapsedTicks += 1;

  if (state.tribulation.elapsedTicks >= event.timeLimit) {
    applyTribulationFailure(state, random);
    return state;
  }

  if (result.outcome === "player_loss") {
    applyTribulationFailure(state, random);
    return state;
  }

  if (result.outcome !== "player_win") {
    return state;
  }

  if (state.tribulation.currentWaveIndex < event.enemyWave.length - 1) {
    startNextWave(state);
    return state;
  }

  applyTribulationSuccess(state);
  return state;
}

export function finalizeSuccessfulTribulation(state: GameState): void {
  finishTribulation(state);
}
