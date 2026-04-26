// FlowMaster: projection bridges — allow a "canProject" node to push Qi
// across a discontinuous link (not a regular edge). Whitelisted by
// projectionLinks and capped by attr.maxActiveBridges.

function allowedProjectionTargets(fromNodeId) {
  return projectionLinks
    .filter((link) => link.from === fromNodeId)
    .map((link) => link.to);
}

function candidateProjectionTargets(fromNodeId) {
  const fromNode = nodeById(fromNodeId);
  if (!fromNode || !fromNode.canProject) return [];
  const allowedTargets = new Set(allowedProjectionTargets(fromNodeId));
  if (allowedTargets.size === 0) return [];
  return nodeData.filter((node) => {
    if (node.id === fromNodeId) return false;
    if (!allowedTargets.has(node.id)) return false;
    return true;
  });
}

function activateProjection(from, to) {
  const fromNode = nodeById(from);
  if (!fromNode || !fromNode.canProject) return;
  if (!allowedProjectionTargets(from).includes(to)) return;

  const existing = activeProjections.find(
    (projection) => projection.from === from && projection.to === to
  );
  if (existing) {
    return;
  }
  const attr = getAttributeState();
  if (activeProjections.length >= attr.maxActiveBridges) return;
  activeProjections.push({
    from,
    to
  });
}

function toggleProjectionBridge(fromNodeId, toNodeId) {
  const idx = projectionLinks.findIndex((link) => link.from === fromNodeId && link.to === toNodeId);
  const fromNode = nodeById(fromNodeId);
  if (!fromNode) return;

  if (idx >= 0) {
    projectionLinks.splice(idx, 1);
  } else {
    projectionLinks.push({ from: fromNodeId, to: toNodeId });
    fromNode.canProject = true;
  }

  const hasAnyBridgeFromNode = projectionLinks.some((link) => link.from === fromNodeId);
  fromNode.canProject = hasAnyBridgeFromNode;

  for (let i = activeProjections.length - 1; i >= 0; i -= 1) {
    if (activeProjections[i].from === fromNodeId && activeProjections[i].to === toNodeId && idx >= 0) {
      activeProjections.splice(i, 1);
    }
  }
}
