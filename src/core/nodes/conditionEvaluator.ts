import type { EnergyType } from "../energy/EnergyType";
import type { T2Node } from "./T2Node";
import type { UnlockCondition, UpgradeCondition } from "../../data/conditions";

interface NodeConditionSnapshot {
  rank: number;
  level: number;
  isActive: boolean;
  lifetimeEnergyGenerated: number;
}

interface MeridianConditionSnapshot {
  state: string;
  quality: number;
}

export interface ConditionGameState {
  nodes: Map<string | number, NodeConditionSnapshot>;
  meridians: Map<string, MeridianConditionSnapshot>;
  energyAccumulatedByScope: Map<string, Partial<Record<EnergyType, number>>>;
  lifetimeEnergyByScope: Map<string, number>;
  averageMeridianQuality: number;
  specialEvents: Set<string>;
}

function resolveNode(
  gameState: ConditionGameState,
  fallbackNode: T2Node | null,
  nodeId?: string | number
): NodeConditionSnapshot | undefined {
  if (nodeId !== undefined) {
    return gameState.nodes.get(nodeId);
  }
  if (fallbackNode) {
    return gameState.nodes.get(fallbackNode.id);
  }
  return undefined;
}

function evaluateCondition(
  condition: UnlockCondition | UpgradeCondition,
  gameState: ConditionGameState,
  fallbackNode: T2Node | null
): boolean {
  switch (condition.type) {
    case "node_rank": {
      const node = resolveNode(gameState, fallbackNode, condition.nodeId);
      return Boolean(node && node.rank >= condition.minRank);
    }
    case "node_level": {
      const node = resolveNode(gameState, fallbackNode, condition.nodeId);
      return Boolean(node && node.level >= condition.minLevel);
    }
    case "node_active": {
      const node = resolveNode(gameState, fallbackNode, condition.nodeId);
      return Boolean(node && node.isActive);
    }
    case "energy_accumulated": {
      const scopePool = gameState.energyAccumulatedByScope.get(condition.scope);
      const amount = scopePool?.[condition.energyType] ?? 0;
      return amount >= condition.minAmount;
    }
    case "meridian_state": {
      const meridian = gameState.meridians.get(condition.meridianId);
      return Boolean(meridian && meridian.state === condition.requiredState);
    }
    case "meridian_quality": {
      if (condition.average) {
        return gameState.averageMeridianQuality >= condition.minQuality;
      }
      if (!condition.meridianId) {
        return false;
      }
      const meridian = gameState.meridians.get(condition.meridianId);
      return Boolean(meridian && meridian.quality >= condition.minQuality);
    }
    case "other_node_level": {
      const otherNode = gameState.nodes.get(condition.nodeId);
      return Boolean(otherNode && otherNode.level >= condition.minLevel);
    }
    case "lifetime_energy_generated": {
      const total = gameState.lifetimeEnergyByScope.get(condition.scope) ?? 0;
      return total >= condition.minAmount;
    }
    case "special_event":
      return gameState.specialEvents.has(condition.eventId);
    default:
      return false;
  }
}

export function evaluateUnlockConditions(conditions: UnlockCondition[], gameState: ConditionGameState): boolean {
  return conditions.every((condition) => evaluateCondition(condition, gameState, null));
}

export function evaluateUpgradeConditions(
  node: T2Node,
  conditions: UpgradeCondition[],
  gameState: ConditionGameState
): boolean {
  return conditions.every((condition) => evaluateCondition(condition, gameState, node));
}
