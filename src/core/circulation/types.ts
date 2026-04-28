/**
 * Phase 9 — circulation routes (TaskList TASK-084..089).
 */

export interface CirculationRoute {
  id: string;
  nodeSequence: string[];
  isActive: boolean;
  loopEfficiency: number;
  bottleneckMeridianId: string | null;
  estimatedHeatPerTick: number;
  estimatedTrainingMultiplier: number;
  /** TASK-087 — cumulative circulation-route heat model (YangQi-loss proxy). */
  accumulatedRouteHeat: number;
}

export function createEmptyRoute(id: string): CirculationRoute {
  return {
    id,
    nodeSequence: [],
    isActive: false,
    loopEfficiency: 1,
    bottleneckMeridianId: null,
    estimatedHeatPerTick: 0,
    estimatedTrainingMultiplier: 1,
    accumulatedRouteHeat: 0
  };
}

export interface RouteValidationResult {
  valid: boolean;
  errors: string[];
}
