import { BODY_TEMPERING_ACTIONS, type BodyTemperingActionDef } from "../../data/bodyTempering/actions";
import { EnergyType, addPools, emptyPool } from "../energy/EnergyType";
import { T1NodeState } from "../nodes/T1Types";
import type { GameState } from "../../state/GameState";

const MAX_TEMPERING_LEVEL = 9;
const BASE_LEVEL_XP = 10;

function levelXpRequirement(level: number): number {
  if (level <= 1) {
    return BASE_LEVEL_XP;
  }
  return BASE_LEVEL_XP * 10 ** (level - 1);
}

function actionById(id: string | null): BodyTemperingActionDef | undefined {
  if (!id) {
    return undefined;
  }
  return BODY_TEMPERING_ACTIONS.find((action) => action.id === id);
}

function getCombatDifficultyScale(state: GameState): number {
  if (!state.combat) {
    return 0;
  }
  const enemy = state.combat.enemy;
  const composite = enemy.physicalAttack + enemy.soulAttack + enemy.hp / 80 + enemy.soulHp / 80;
  return Math.max(1, composite / 18);
}

function activeSourceNodes(state: GameState) {
  const out: Array<{ energy: ReturnType<typeof emptyPool> }> = [];
  for (const t2 of state.t2Nodes.values()) {
    for (const t1 of t2.t1Nodes.values()) {
      if (t1.isSourceNode && t1.state === T1NodeState.ACTIVE) {
        out.push(t1);
      }
    }
  }
  return out;
}

function applyGeneratedEnergy(state: GameState, generated: ReturnType<typeof emptyPool>): void {
  const sources = activeSourceNodes(state);
  if (sources.length === 0) {
    return;
  }
  for (const source of sources) {
    source.energy = addPools(source.energy, {
      ...emptyPool(),
      [EnergyType.Qi]: generated[EnergyType.Qi] / sources.length,
      [EnergyType.Jing]: generated[EnergyType.Jing] / sources.length,
      [EnergyType.YangQi]: generated[EnergyType.YangQi] / sources.length,
      [EnergyType.Shen]: generated[EnergyType.Shen] / sources.length
    });
  }
}

function gainTemperingXp(state: GameState, xp: number): void {
  if (xp <= 0) {
    return;
  }
  const tempering = state.bodyTemperingState;
  tempering.temperingXP += xp;
  while (tempering.temperingLevel < MAX_TEMPERING_LEVEL) {
    const requirement = levelXpRequirement(tempering.temperingLevel);
    if (tempering.temperingXP < requirement) {
      break;
    }
    tempering.temperingXP -= requirement;
    tempering.temperingLevel += 1;
    state.hp = Math.min(state.maxHp, state.hp + 5);
  }
}

export function applyBodyTemperingTick(state: GameState): void {
  gainTemperingXp(state, actionById("breath-training")?.xpPerTick ?? 0);

  if (state.bodyTemperingState.trainingCooldown > 0) {
    state.bodyTemperingState.trainingCooldown -= 1;
    return;
  }

  const action = actionById(state.bodyTemperingState.currentTrainingAction);
  if (!action || action.mode !== "active") {
    return;
  }

  let gainedXp = action.xpPerTick;
  if (action.combatDifficultyScaling) {
    gainedXp *= getCombatDifficultyScale(state);
  }
  gainTemperingXp(state, gainedXp);
  applyGeneratedEnergy(state, action.generatedEnergy);
  if (action.hpCostPerUse > 0) {
    state.hp = Math.max(0, state.hp - action.hpCostPerUse);
  }
  state.bodyTemperingState.trainingCooldown = action.cooldownTicks;
}

export function countActiveJingSourceNodes(state: GameState): number {
  let count = 0;
  for (const t2 of state.t2Nodes.values()) {
    for (const t1 of t2.t1Nodes.values()) {
      if (t1.isSourceNode && t1.state === T1NodeState.ACTIVE && t1.energy[EnergyType.Jing] > 0) {
        count += 1;
      }
    }
  }
  return count;
}
