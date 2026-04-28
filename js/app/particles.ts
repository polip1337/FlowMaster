// FlowMaster: particle FX flowing along edges + projection bridges.

import { nodePositions } from './config.ts';
import { st, particles, activeProjections } from './state.ts';
import { cubicBezierPoint, computeEdgeBezier, getFlowColor } from './utils.ts';
import { isNodeAvailableForOutflow } from './queries.ts';
import { edges } from './config.ts';

export function spawnParticle(edge: any) {
  const start = nodePositions[edge.from];
  const dot = new PIXI.Graphics();
  dot.circle(0, 0, 2.4 + edge.flow * 0.02);
  dot.fill(getFlowColor(edge.flow));
  dot.alpha = 0.95;
  dot.position.set(start.x, start.y);
  st.particleLayer.addChild(dot);
  particles.push({ sprite: dot, edgeKey: edge.key, t: 0, speedScale: 1 });
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
  st.particleAccumulator += (totalFlow / 100) * 0.14 * deltaTime;
  st.particleAccumulator += activeProjections.length * 0.2 * deltaTime;

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
  }
}
