import type { CirculationRoute } from "../circulation/types";
import type { Meridian } from "../meridians/Meridian";
import type { T2Node } from "../nodes/T2Node";

export interface CompanionCultivationState {
  t2Nodes: Map<string, T2Node>;
  meridians: Map<string, Meridian>;
  activeRoute: CirculationRoute | null;
  techniqueStrength: number;
}

export interface CompanionState {
  active: boolean;
  name: string;
  cultivation: CompanionCultivationState;
  harmonyLevel: number;
  sharedRouteActive: boolean;
  crossBodyMeridians: Meridian[];
}
