import type { T1NodeType } from "../../core/nodes/T1Types";

export interface T1NodeDef {
  id: number;
  type: T1NodeType;
  isSourceNode: boolean;
  /** Predecessor T1 ids for unlock ordering hints (cluster graph). */
  unlockAfter: number[];
  /** S-008 — normalized 0–1 layout within cluster bounds (optional until all topologies authored). */
  position?: { x: number; y: number };
}

export interface T1EdgeDef {
  from: number;
  to: number;
  defaultWeight: number;
}

export interface TopologySpecialNode {
  id: number;
  resonanceMultiplier?: number;
}

export interface T1ClusterTopology {
  /** Stable id e.g. "muladhara" for saves / UI. */
  id: string;
  nodeCount: number;
  nodes: T1NodeDef[];
  /** Logical undirected links; clusterFactory adds both directed edges unless `directed: true`. */
  edges: T1EdgeDef[];
  /** When true, edges are stored only in the given direction (no reverse). */
  directedEdges?: boolean;
  meridianIoMap: Record<string, number>;
  baseCapacityPerNode: number;
  specialNodes?: TopologySpecialNode[];
  latentT1NodeIds?: number[];
  yangQiConversionNode?: number;
  passiveAbsorberNode?: number;
  stabilizationReserveNode?: number;
  realmCapNode?: number;
  /** Hand / Foot style: terminal reservoir — no circulation export through extremity storage. */
  terminalNode?: boolean;
  /** Optional per-node affinity labels for future sim/UI (Ajna). */
  nodeAffinity?: Partial<Record<number, "Shen" | "YangQi">>;
}
