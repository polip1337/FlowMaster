import type { GameState, ProgressionLevelUpEvent } from "../../state/GameState";
import { evaluateUpgradeConditions } from "../nodes/conditionEvaluator";
import type { T2Node } from "../nodes/T2Node";
import { T2NodeState } from "../nodes/T2Types";
import { buildConditionState } from "./conditionSnapshot";

function canApplyPhase11LevelConstraints(state: GameState, node: T2Node, nextLevel: number): boolean {
  if (node.id === "ANAHATA") {
    const leftShoulder = state.t2Nodes.get("L_SHOULDER");
    const rightShoulder = state.t2Nodes.get("R_SHOULDER");
    const shoulderCap = Math.min(leftShoulder?.level ?? 0, rightShoulder?.level ?? 0);
    if (nextLevel > shoulderCap) {
      return false;
    }
  }

  if (node.id === "SAHASRARA") {
    for (const other of state.t2Nodes.values()) {
      if (Math.abs(other.level - nextLevel) > 2) {
        return false;
      }
    }
  }

  return true;
}

export function checkLevelUps(state: GameState): ProgressionLevelUpEvent[] {
  const tickAfter = state.tick + 1;
  if (!state.immediateConditionCheck && tickAfter % 10 !== 0) {
    return [];
  }

  const conditionState = buildConditionState(state);
  const events: ProgressionLevelUpEvent[] = [];

  for (const node of state.t2Nodes.values()) {
    const isActiveLike = node.state === T2NodeState.ACTIVE || node.state === T2NodeState.REFINED;
    if (!isActiveLike || node.level >= 9) {
      continue;
    }

    if (!evaluateUpgradeConditions(node, node.upgradeConditions, conditionState)) {
      continue;
    }

    const nextLevel = Math.min(9, node.level + 1);
    if (!canApplyPhase11LevelConstraints(state, node, nextLevel)) {
      continue;
    }

    const fromLevel = node.level;
    node.level = nextLevel;
    events.push({
      nodeId: node.id,
      fromLevel,
      toLevel: nextLevel,
      tick: tickAfter
    });
  }

  return events;
}
