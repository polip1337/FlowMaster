// FlowMaster: read-only lookups over nodeData / edges / projectionLinks.
// Functions here return derived facts; they never mutate game state.

import {
  STATE_LOCKED, STATE_RESONANT, STATE_ACTIVE,
  STAT_ORDER, TIER2_NODES, ATTRIBUTE_THEME
} from './constants.ts';
import { nodeData, edges, projectionLinks, nodePositions } from './config.ts';
import { st } from './state.ts';

export function nodeById(nodeId: number) {
  return nodeData.find((node) => node.id === nodeId);
}

export function getNodeState(node: any) {
  if (!node.unlocked) return STATE_LOCKED;
  if (st.resonanceBurstTicks > 0) return STATE_RESONANT;
  if (node.unlockCost > 0 && node.si >= node.unlockCost * 1.8) return STATE_RESONANT;
  return STATE_ACTIVE;
}

export function getNodeStatLevels(node: any) {
  const levels: Record<string, number> = { Flow: 0, Insight: 0, Harmony: 0, Fortitude: 0, Essence: 0 };
  const bonuses = node.bonuses ?? {};
  const primary = node.attributeType;
  const tier = node.attributeTier ?? 1;
  if (primary && primary in levels) {
    levels[primary] = Math.max(levels[primary], 0.35 + 0.22 * tier);
  }
  if (bonuses.flowEfficiency) levels.Flow = Math.max(levels.Flow, Math.min(1, bonuses.flowEfficiency * 4.5));
  if (bonuses.projectionRatePercent) levels.Insight = Math.max(levels.Insight, Math.min(1, bonuses.projectionRatePercent * 4));
  if (bonuses.projectionEcho) levels.Insight = Math.max(levels.Insight, Math.min(1, bonuses.projectionEcho * 5));
  if (bonuses.projectionDurationTicks) levels.Insight = Math.max(levels.Insight, Math.min(1, bonuses.projectionDurationTicks / 500));
  if (bonuses.maxBridges) levels.Insight = Math.max(levels.Insight, Math.min(1, bonuses.maxBridges * 0.4));
  if (bonuses.harmonyPower) levels.Harmony = Math.max(levels.Harmony, Math.min(1, bonuses.harmonyPower * 4));
  if (bonuses.resonanceBurstPercent) levels.Harmony = Math.max(levels.Harmony, Math.min(1, bonuses.resonanceBurstPercent * 3));
  if (bonuses.fortitude) levels.Fortitude = Math.max(levels.Fortitude, Math.min(1, bonuses.fortitude * 1.6));
  if (bonuses.essencePercent) levels.Essence = Math.max(levels.Essence, Math.min(1, bonuses.essencePercent * 9));
  if (bonuses.essenceFlatPerCycle) levels.Essence = Math.max(levels.Essence, Math.min(1, bonuses.essenceFlatPerCycle / 50));
  return levels;
}

export function topStats(levels: Record<string, number>, count: number) {
  return STAT_ORDER
    .map((stat) => ({ stat, value: levels[stat] }))
    .filter((entry) => entry.value > 0.01)
    .sort((a, b) => b.value - a.value)
    .slice(0, count);
}

export function unlockedNodes() {
  return nodeData.filter((node) => node.unlocked);
}

export function sumUnlockedBonus(field: string) {
  return unlockedNodes().reduce((sum, node) => sum + (node.bonuses?.[field] ?? 0), 0);
}

export function outgoingEdges(nodeId: number) {
  return edges.filter((edge) => edge.from === nodeId);
}

export function edgeBetween(from: number, to: number) {
  return edges.find((edge) => edge.from === from && edge.to === to);
}

export function hasDirectEdge(from: number, to: number) {
  return edges.some((edge) => edge.from === from && edge.to === to);
}

export function edgeFlow(from: number, to: number) {
  const edge = edges.find((item) => item.from === from && item.to === to);
  return edge ? edge.flow : 0;
}

export function computeVisibleNodeIds() {
  if (st.forceShowAllNodes) {
    return new Set(nodeData.map((node) => node.id));
  }
  const unlockedIds = nodeData.filter((node) => node.unlocked).map((node) => node.id);
  const visible = new Set(unlockedIds);
  for (const edge of edges) {
    if (visible.has(edge.from) || visible.has(edge.to)) {
      visible.add(edge.from);
      visible.add(edge.to);
    }
  }
  for (const link of projectionLinks) {
    const fromNode = nodeById(link.from);
    if (!fromNode?.unlocked || !fromNode.canProject) continue;
    visible.add(link.to);
  }
  return visible;
}

export function isNodeAvailableForOutflow(nodeId: number) {
  const node = nodeById(nodeId);
  return Boolean(node && node.unlocked);
}

export function getCultivationAttributeInfo(attributeType: string | undefined) {
  if (!attributeType) return { name: "Unknown Path", description: "No attribute path defined." };
  return ATTRIBUTE_THEME[attributeType] ?? { name: attributeType, description: "Unclassified cultivation path." };
}

export function nearestTier1NodeFromWorldPoint(point: { x: number; y: number }) {
  let bestNode = null;
  let bestDist = Infinity;
  for (const node of nodeData) {
    const pos = nodePositions[node.id];
    if (!pos) continue;
    const dx = point.x - pos.x;
    const dy = point.y - pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist < bestDist) { bestDist = dist; bestNode = node; }
  }
  return bestNode;
}

export function nearestTier2NodeFromWorldPoint(point: { x: number; y: number }) {
  let best = null;
  let bestDist = Infinity;
  for (const tier2 of TIER2_NODES) {
    const dx = point.x - tier2.x;
    const dy = point.y - tier2.y;
    const d = Math.hypot(dx, dy);
    if (d < bestDist) { bestDist = d; best = tier2; }
  }
  return best;
}

export function findBlockingUpstreamNode(nodeId: number) {
  const incoming = edges.filter((edge) => edge.to === nodeId);
  for (const edge of incoming) {
    const source = nodeById(edge.from);
    if (source && !source.unlocked) return source;
  }
  for (const edge of incoming) {
    const source = nodeById(edge.from);
    if (source && source.si < source.unlockCost * 0.2) return source;
  }
  return incoming.length > 0 ? nodeById(incoming[0].from) : null;
}

export function getNextNodeId() {
  return nodeData.reduce((maxId, node) => Math.max(maxId, node.id), -1) + 1;
}
