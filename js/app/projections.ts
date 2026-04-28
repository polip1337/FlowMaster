// FlowMaster: projection bridges.

import { projectionLinks, nodeData } from './config.ts';
import { activeProjections } from './state.ts';
import { nodeById } from './queries.ts';
import { getAttributeState } from './mechanics.ts';

export function allowedProjectionTargets(fromNodeId: number) {
  return projectionLinks.filter((link) => link.from === fromNodeId).map((link) => link.to);
}

export function candidateProjectionTargets(fromNodeId: number) {
  const fromNode = nodeById(fromNodeId);
  if (!fromNode || !fromNode.canProject) return [];
  const allowedTargets = new Set(allowedProjectionTargets(fromNodeId));
  if (allowedTargets.size === 0) return [];
  return nodeData.filter((node) => node.id !== fromNodeId && allowedTargets.has(node.id));
}

export function activateProjection(from: number, to: number) {
  const fromNode = nodeById(from);
  if (!fromNode || !fromNode.canProject) return;
  if (!allowedProjectionTargets(from).includes(to)) return;
  const existing = activeProjections.find((p) => p.from === from && p.to === to);
  if (existing) return;
  const attr = getAttributeState();
  if (activeProjections.length >= attr.maxActiveBridges) return;
  activeProjections.push({ from, to });
}

export function toggleProjectionBridge(fromNodeId: number, toNodeId: number) {
  const idx = projectionLinks.findIndex((link) => link.from === fromNodeId && link.to === toNodeId);
  const fromNode = nodeById(fromNodeId);
  if (!fromNode) return;
  if (idx >= 0) {
    projectionLinks.splice(idx, 1);
  } else {
    projectionLinks.push({ from: fromNodeId, to: toNodeId });
    fromNode.canProject = true;
  }
  fromNode.canProject = projectionLinks.some((link) => link.from === fromNodeId);
  for (let i = activeProjections.length - 1; i >= 0; i -= 1) {
    if (activeProjections[i].from === fromNodeId && activeProjections[i].to === toNodeId && idx >= 0) {
      activeProjections.splice(i, 1);
    }
  }
}
