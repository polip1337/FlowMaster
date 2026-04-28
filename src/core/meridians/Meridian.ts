import type { EnergyPool, EnergyType } from "../energy/EnergyType";
import type { MeridianState } from "./MeridianTypes";

export interface Meridian {
  id: string;
  nodeFromId: string;
  nodeToId: string;
  ioNodeOutId: number;
  ioNodeInId: number;
  state: MeridianState;
  width: number;
  purity: number;
  totalFlow: number;
  jingDeposit: number;
  shenScatterBonus: number;
  basePurity: number;
  typeAffinity: EnergyType | null;
  affinityFraction: number;
  dominantTypeAccumulator: EnergyPool;
  isEstablished: boolean;
  isScarred: boolean;
  scarPenalty: number;
  /** Body-map hops (used for reverse-open Jing cost). */
  hopCount: number;
  /** When true, this meridian runs opposite the canonical body direction. */
  isReverse: boolean;
}
