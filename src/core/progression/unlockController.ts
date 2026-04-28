import type { GameState, ProgressionUnlockEvent } from "../../state/GameState";
import { evaluateUnlockConditions } from "../nodes/conditionEvaluator";
import { T2NodeState } from "../nodes/T2Types";
import { buildConditionState } from "./conditionSnapshot";

export function checkAndUnlockT2Nodes(state: GameState): ProgressionUnlockEvent[] {
  const tickAfter = state.tick + 1;
  if (!state.immediateConditionCheck && tickAfter % 30 !== 0) {
    return [];
  }

  const events: ProgressionUnlockEvent[] = [];
  const conditionState = buildConditionState(state);

  for (const node of state.t2Nodes.values()) {
    if (node.state !== T2NodeState.LOCKED) {
      continue;
    }
    if (!evaluateUnlockConditions(node.unlockConditions, conditionState)) {
      continue;
    }
    node.state = T2NodeState.SEALING;
    node.sealingProgress = 1;
    node.state = T2NodeState.ACTIVE;
    events.push({ nodeId: node.id, tick: tickAfter });
  }

  return events;
}
