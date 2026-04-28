import type { T1EdgeMap } from "./T1Edge";
import type { T1Node } from "./T1Node";
import type { T2NodeState, T2NodeType } from "./T2Types";
import type { UnlockCondition, UpgradeCondition } from "../../data/conditions";

export interface T2NodeDamageState {
  cracked: boolean;
  shattered: boolean;
  repairProgress: number;
}

export interface T2Node {
  id: string;
  name: string;
  type: T2NodeType;
  state: T2NodeState;
  t1Nodes: Map<number, T1Node>;
  t1Edges: T1EdgeMap;
  ioNodeMap: Map<string, number>;
  rank: number;
  level: number;
  sealingProgress: number;
  unlockConditions: UnlockCondition[];
  upgradeConditions: UpgradeCondition[];
  meridianSlotIds: string[];
  latentT1NodeIds: number[];
  flowBonusPercent: number;
  nodeDamageState: T2NodeDamageState;
  /** S-010 — prevents applying REFINED cluster resonance multiplier more than once. */
  refinedResonanceBonusApplied: boolean;
}
