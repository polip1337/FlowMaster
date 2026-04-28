// FlowMaster: particle FX flowing along edges + projection bridges.

import { nodeData, nodePositions } from './config.ts';
import { st, particles, activeProjections } from './state.ts';
import { cubicBezierPoint, computeEdgeBezier, getFlowColor } from './utils.ts';
import { isNodeAvailableForOutflow } from './queries.ts';
import { edges } from './config.ts';
import { TIER2_NODES } from './constants.ts';

export function spawnParticle(edge: any) {
  const start = nodePositions[edge.from];
  const fromNode = nodeData.find((n: any) => n.id === edge.from) ?? null;
  const shenRatio = fromNode
    ? Math.max(0, Math.min(1, (fromNode.energyShen ?? 0) / Math.max(1, (fromNode.energyQi ?? 0) + (fromNode.energyShen ?? 0))))
    : 0;
  const dot = new PIXI.Graphics();
  const radius = (2.2 + edge.flow * 0.018) * (1 + shenRatio * 0.65);
  dot.circle(0, 0, radius);
  dot.fill(shenRatio > 0.35 ? 0xc890ff : getFlowColor(edge.flow));
  dot.alpha = shenRatio > 0.35 ? 0.84 : 0.95;
  dot.position.set(start.x, start.y);
  st.particleLayer.addChild(dot);
  particles.push({ sprite: dot, edgeKey: edge.key, t: 0, speedScale: shenRatio > 0.35 ? 0.72 : 1, shenTrail: shenRatio > 0.35 });
}

export function spawnProjectionPulse(projection: any) {
  const start = nodePositions[projection.from];
  const dot = new PIXI.Graphics();
  dot.circle(0, 0, 2.8);
  dot.fill(0x534ab7);
  dot.alpha = 0.95;
  dot.position.set(start.x, start.y);
  st.particleLayer.addChild(dot);
  particles.push({ sprite: dot, projectionFrom: projection.from, projectionTo: projection.to, t: 0, speedScale: 1.35 });
}

export function animateParticles(deltaTime: number) {
  if (!st.app) return;

  const totalFlow = edges.reduce((sum, edge) => sum + edge.flow, 0);
  st.particleAccumulator += (totalFlow / 100) * 0.14 * deltaTime * st.particleDensity;
  st.particleAccumulator += activeProjections.length * 0.2 * deltaTime;
  if (st.activeBodyRouteNodeIds.length < 2 && st.bodyMapMeridians) {
    st.particleAccumulator += 0.08 * deltaTime * st.particleDensity;
  }

  while (st.particleAccumulator >= 1) {
    const candidates = edges.filter((edge) => edge.flow > 0 && isNodeAvailableForOutflow(edge.from));
    if (candidates.length === 0) { st.particleAccumulator = 0; break; }
    let pick = Math.random() * candidates.reduce((s, e) => s + e.flow, 0);
    for (const edge of candidates) {
      pick -= edge.flow;
      if (pick <= 0) { spawnParticle(edge); break; }
    }
    st.particleAccumulator -= 1;
  }
  if (st.activeBodyRouteNodeIds.length < 2 && st.bodyMapMeridians) {
    const ambient = [...st.bodyMapMeridians.values()].find((m: any) => m.isEstablished && Math.random() < 0.15);
    if (ambient) {
      const from = TIER2_NODES.find((n) => n.id === ambient.nodeFromId);
      const to = TIER2_NODES.find((n) => n.id === ambient.nodeToId);
      if (from && to) {
        const dot = new PIXI.Graphics();
        dot.circle(0, 0, 1.2);
        dot.fill(0xbccfff);
        dot.alpha = 0.28;
        dot.position.set(from.x, from.y);
        st.particleLayer.addChild(dot);
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const bend = Math.min(18, Math.hypot(dx, dy) * 0.16);
        const c1 = { x: from.x + dx * 0.35 - dy * 0.03, y: from.y + dy * 0.35 + dx * 0.03 };
        const c2 = { x: from.x + dx * 0.75 - dy * 0.02, y: from.y + dy * 0.75 + dx * 0.02 };
        particles.push({
          sprite: dot,
          ambientPath: { start: { x: from.x, y: from.y }, c1, c2, end: { x: to.x, y: to.y + bend * 0.02 } },
          t: 0,
          speedScale: 0.45,
          ambient: true
        });
      }
    }
  }

  if (activeProjections.length > 0) {
    const spawnCount = Math.min(activeProjections.length, 2);
    for (let i = 0; i < spawnCount; i += 1) {
      const projection = activeProjections[(st.tickCounter + i) % activeProjections.length];
      spawnProjectionPulse(projection);
    }
  }

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    let bezier = null;
    let speed: number;

    if (particle.edgeKey) {
      const edge = edges.find((item) => item.key === particle.edgeKey);
      if (!edge || edge.flow <= 0) { particle.sprite.destroy(); particles.splice(i, 1); continue; }
      bezier = computeEdgeBezier(edge);
      speed = (0.004 + edge.flow * 0.00008) * deltaTime * particle.speedScale;
    } else if (particle.ambientPath) {
      bezier = particle.ambientPath;
      speed = 0.0028 * deltaTime * particle.speedScale;
    } else {
      const projection = activeProjections.find(
        (item) => item.from === particle.projectionFrom && item.to === particle.projectionTo
      );
      if (!projection) { particle.sprite.destroy(); particles.splice(i, 1); continue; }
      bezier = computeEdgeBezier({ from: projection.from, to: projection.to });
      speed = 0.008 * deltaTime * particle.speedScale;
    }

    particle.t += speed;
    if (!bezier || particle.t >= 1) { particle.sprite.destroy(); particles.splice(i, 1); continue; }

    const p = cubicBezierPoint(bezier.start, bezier.c1, bezier.c2, bezier.end, particle.t);
    particle.sprite.position.set(p.x, p.y);
    if (particle.shenTrail) {
      particle.sprite.alpha = Math.max(0.2, 1 - particle.t);
    }
  }
}
