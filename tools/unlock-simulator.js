#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const DEFAULTS = {
  ticksPerSecond: 100,
  ticksPerCycle: 1000,
  sourceRatePerCycle: 100,
  flowTransferFactorPerCycle: 0.01,
  projectionTransferFactorPerTick: 0.003 / 1000,
  resonanceGainPerTick: 0.08,
  resonanceDecayPerTick: 0.035,
  resonanceBurstTicksMax: 4500,
  earthSinkInflowThreshold: 0.03,
  earthSinkHardThreshold: 0.08,
  sunSurgeIntervalTicks: 1400,
  sunSurgeDurationTicks: 280,
  maxTicks: 50_000_000,
  randomRuns: 5,
  randomSeed: 1337
};

function parseArgs(argv) {
  const args = {
    layout: "nodes.ts",
    strategies: ["cheapest", "expensive", "random"],
    randomRuns: DEFAULTS.randomRuns,
    maxTicks: DEFAULTS.maxTicks,
    randomSeed: DEFAULTS.randomSeed,
    json: false,
    logProgress: true,
    progressEveryTicks: 200000,
    outputDir: "tools/sim-logs",
    saveLogs: true
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--layout" && argv[i + 1]) args.layout = argv[++i];
    else if (arg === "--strategies" && argv[i + 1]) args.strategies = argv[++i].split(",").map((x) => x.trim());
    else if (arg === "--random-runs" && argv[i + 1]) args.randomRuns = Number(argv[++i]);
    else if (arg === "--max-ticks" && argv[i + 1]) args.maxTicks = Number(argv[++i]);
    else if (arg === "--seed" && argv[i + 1]) args.randomSeed = Number(argv[++i]);
    else if (arg === "--json") args.json = true;
    else if (arg === "--quiet") args.logProgress = false;
    else if (arg === "--progress-every" && argv[i + 1]) args.progressEveryTicks = Number(argv[++i]);
    else if (arg === "--output-dir" && argv[i + 1]) args.outputDir = argv[++i];
    else if (arg === "--no-save-logs") args.saveLogs = false;
  }
  return args;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadLayout(layoutPath) {
  const absolute = path.resolve(layoutPath);
  let code = fs.readFileSync(absolute, "utf8");
  if (absolute.endsWith(".ts")) {
    code = code.replace(/^export const /gm, "window.");
  }
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: absolute });
  const nodes = sandbox.window.NODE_DEFINITIONS ?? [];
  const edges = sandbox.window.NODE_EDGES ?? [];
  const projectionLinks = sandbox.window.PROJECTION_LINKS ?? [];
  if (!Array.isArray(nodes) || !Array.isArray(edges) || !Array.isArray(projectionLinks)) {
    throw new Error("Invalid layout: expected NODE_DEFINITIONS, NODE_EDGES, PROJECTION_LINKS arrays.");
  }
  return { nodes: deepClone(nodes), edges: deepClone(edges), projectionLinks: deepClone(projectionLinks) };
}

class CultivationMechanics {
  constructor(config = {}) {
    this.cfg = { ...DEFAULTS, ...config };
    this.flowTransferFactorPerTick = this.cfg.flowTransferFactorPerCycle / this.cfg.ticksPerCycle;
    this.sourceRatePerTick = this.cfg.sourceRatePerCycle / this.cfg.ticksPerCycle;
  }

  sumUnlockedBonus(state, field) {
    return state.nodes.filter((node) => node.unlocked).reduce((sum, node) => sum + (node.bonuses?.[field] ?? 0), 0);
  }

  nodeById(state, id) {
    return state.nodeMap.get(id);
  }

  edgeFlow(state, from, to) {
    const edge = state.edges.find((item) => item.from === from && item.to === to);
    return edge ? edge.flow : 0;
  }

  getAttributeState(state) {
    const flowEfficiency = this.sumUnlockedBonus(state, "flowEfficiency");
    const projectionRatePercent = this.sumUnlockedBonus(state, "projectionRatePercent");
    const projectionEcho = this.sumUnlockedBonus(state, "projectionEcho");
    const fortitude = this.sumUnlockedBonus(state, "fortitude");
    const harmonyPower = this.sumUnlockedBonus(state, "harmonyPower");
    const essencePercent = this.sumUnlockedBonus(state, "essencePercent");
    const essenceFlatPerCycle = this.sumUnlockedBonus(state, "essenceFlatPerCycle");
    const projectionDurationTicks = this.sumUnlockedBonus(state, "projectionDurationTicks");
    const maxBridgesBonus = this.sumUnlockedBonus(state, "maxBridges");
    const resonanceBurstPercent = this.sumUnlockedBonus(state, "resonanceBurstPercent");

    const coreNode = this.nodeById(state, 0);
    const coreAdjacents = [12, 13, 14].filter((id) => this.nodeById(state, id)?.unlocked).length;
    const coreAdjacencyBonus = coreAdjacents * (coreNode?.bonuses?.essencePercent ?? 0);

    const hasLeftBranch = this.nodeById(state, 5)?.unlocked && this.nodeById(state, 6)?.unlocked && this.nodeById(state, 7)?.unlocked;
    const hasRightBranch = this.nodeById(state, 8)?.unlocked && this.nodeById(state, 9)?.unlocked && this.nodeById(state, 10)?.unlocked;
    const hasTriangle = this.nodeById(state, 12)?.unlocked && this.nodeById(state, 13)?.unlocked && this.nodeById(state, 14)?.unlocked;
    const hasUpper = this.nodeById(state, 1)?.unlocked && this.nodeById(state, 2)?.unlocked && this.nodeById(state, 3)?.unlocked;
    const leftPattern = this.edgeFlow(state, 15, 5) + this.edgeFlow(state, 5, 6) + this.edgeFlow(state, 6, 11);
    const rightPattern = this.edgeFlow(state, 8, 3) + this.edgeFlow(state, 3, 9) + this.edgeFlow(state, 9, 10);
    const trianglePattern = this.edgeFlow(state, 12, 13) + this.edgeFlow(state, 13, 14) + this.edgeFlow(state, 14, 12);
    const upperPattern = this.edgeFlow(state, 2, 1) + this.edgeFlow(state, 1, 17) + this.edgeFlow(state, 18, 19);
    const resonancePatternReady = leftPattern >= 24 && rightPattern >= 24 && trianglePattern >= 24 && upperPattern >= 10;
    const resonanceReady = Boolean(hasLeftBranch && hasRightBranch && hasTriangle && hasUpper && resonancePatternReady);
    const resonanceActive = state.resonanceBurstTicks > 0;

    const generationPercent = essencePercent + coreAdjacencyBonus + (resonanceActive ? resonanceBurstPercent : 0) + harmonyPower * 0.2;
    const generationFlatPerTick = essenceFlatPerCycle / this.cfg.ticksPerCycle;

    return {
      flowEfficiency,
      projectionRatePercent,
      projectionEcho,
      fortitude,
      harmonyPower,
      projectionDurationTicks,
      maxActiveBridges: 1 + Math.floor(maxBridgesBonus),
      generationPercent,
      generationFlatPerTick,
      resonanceReady
    };
  }

  getProjectionTransferPerTick(state, attr, projection) {
    const sourceNode = this.nodeById(state, 0);
    const fromNode = this.nodeById(state, projection.from);
    if (!sourceNode || !fromNode) return 0;
    const surgeProjectionBonus = state.sunSurgeTicks > 0 ? 0.2 : 0;
    const transfer = sourceNode.si * this.cfg.projectionTransferFactorPerTick * (1 + attr.projectionRatePercent + attr.harmonyPower * 0.15 + surgeProjectionBonus);
    return Math.max(0, Math.min(transfer, fromNode.si));
  }

  tick(state) {
    const attr = this.getAttributeState(state);
    const sourceNode = this.nodeById(state, 0);
    const earthNode = this.nodeById(state, 11);

    const generation = this.sourceRatePerTick * (1 + attr.generationPercent) + attr.generationFlatPerTick;
    sourceNode.si += generation;

    let earthInflowThisTick = 0;
    let apexInflowThisTick = 0;
    const earthPenaltyActive = earthNode?.unlocked && earthNode.si > 0 && attr.fortitude < 0.7;
    const earthPenalty = earthPenaltyActive ? (earthNode.bonuses?.earthSinkPenalty ?? 0) : 0;
    const transferMultiplier = Math.max(0.5, 1 + attr.flowEfficiency + attr.harmonyPower * 0.2 - earthPenalty);

    for (const edge of state.edges) {
      if (edge.flow <= 0) continue;
      const fromNode = this.nodeById(state, edge.from);
      if (!fromNode?.unlocked) continue;
      const toNode = this.nodeById(state, edge.to);
      const transfer = sourceNode.si * this.flowTransferFactorPerTick * (edge.flow / 100) * transferMultiplier;
      if (transfer <= 0) continue;
      const move = Math.min(transfer, fromNode.si);
      fromNode.si -= move;
      toNode.si += move;
      if (toNode.id === 11) earthInflowThisTick += move;
      if (toNode.id === 20) apexInflowThisTick += move;
    }

    for (const projection of state.activeProjections) {
      const fromNode = this.nodeById(state, projection.from);
      if (!fromNode?.unlocked) continue;
      const toNode = this.nodeById(state, projection.to);
      const move = this.getProjectionTransferPerTick(state, attr, projection);
      fromNode.si -= move;
      toNode.si += move;
      if (toNode.id === 11) earthInflowThisTick += move;
      if (toNode.id === 20) apexInflowThisTick += move;
      if (attr.projectionEcho > 0 && move > 0) {
        const echoEdge = state.edges.find((edge) => edge.from === toNode.id);
        if (echoEdge) {
          const echoTarget = this.nodeById(state, echoEdge.to);
          const echoAmount = move * attr.projectionEcho;
          toNode.si = Math.max(0, toNode.si - echoAmount);
          echoTarget.si += echoAmount;
        }
      }
    }

    if (attr.resonanceReady) state.resonance = Math.min(100, state.resonance + this.cfg.resonanceGainPerTick);
    else state.resonance = Math.max(0, state.resonance - this.cfg.resonanceDecayPerTick);
    if (state.resonance >= 100 && state.resonanceBurstTicks <= 0) state.resonanceBurstTicks = this.cfg.resonanceBurstTicksMax;
    if (state.resonanceBurstTicks > 0) state.resonanceBurstTicks -= 1;

    if (earthInflowThisTick > this.cfg.earthSinkInflowThreshold && attr.fortitude < 0.7) {
      state.resonance = Math.max(0, state.resonance - 0.55);
    }
    if (earthInflowThisTick > this.cfg.earthSinkHardThreshold && attr.fortitude < 0.5) {
      sourceNode.si = Math.max(0, sourceNode.si - earthInflowThisTick * 0.65);
    }

    if (this.nodeById(state, 10)?.unlocked && state.tickCounter - state.lastSunSurgeTick >= this.cfg.sunSurgeIntervalTicks) {
      state.lastSunSurgeTick = state.tickCounter;
      state.sunSurgeTicks = this.cfg.sunSurgeDurationTicks;
    }
    if (state.sunSurgeTicks > 0) state.sunSurgeTicks -= 1;

    if (this.nodeById(state, 20)?.unlocked && apexInflowThisTick > 0) {
      state.resonance = Math.min(100, state.resonance + Math.min(0.22, apexInflowThisTick * 1.8));
    }

    for (const node of state.nodes) {
      if (node.unlocked || node.id === 0) continue;
      if (node.si >= node.unlockCost) node.unlocked = true;
    }

    state.tickCounter += 1;
  }
}

class UnlockSimulator {
  constructor(layout, config = {}, mechanics = null) {
    this.layout = layout;
    this.cfg = { ...DEFAULTS, ...config };
    this.mechanics = mechanics ?? new CultivationMechanics(this.cfg);
  }

  log(enabled, message) {
    if (enabled) process.stdout.write(`${message}\n`);
  }

  buildInitialState() {
    const nodes = deepClone(this.layout.nodes);
    const edges = deepClone(this.layout.edges).map((edge) => ({ ...edge, flow: Number(edge.flow ?? 0) }));
    return {
      nodes,
      edges,
      projectionLinks: deepClone(this.layout.projectionLinks),
      nodeMap: new Map(nodes.map((n) => [n.id, n])),
      tickCounter: 0,
      resonance: 0,
      resonanceBurstTicks: 0,
      sunSurgeTicks: 0,
      lastSunSurgeTick: 0,
      activeProjections: [],
      routeDemandNodes: new Set(),
      timeline: []
    };
  }

  allUnlocked(state) {
    return state.nodes.every((node) => node.id === 0 || node.unlocked);
  }

  findAvailableTargets(state) {
    const unlocked = new Set(state.nodes.filter((n) => n.unlocked).map((n) => n.id));
    const available = [];
    for (const node of state.nodes) {
      if (node.id === 0 || node.unlocked) continue;
      const byEdge = state.edges.some((edge) => edge.to === node.id && unlocked.has(edge.from));
      const byProjection = state.projectionLinks.some((link) => {
        const fromNode = state.nodeMap.get(link.from);
        return link.to === node.id && unlocked.has(link.from) && fromNode?.canProject;
      });
      if (byEdge || byProjection) available.push(node);
    }
    return available;
  }

  routeToTarget(state, targetId) {
    const unlocked = new Set(state.nodes.filter((n) => n.unlocked).map((n) => n.id));
    const reverseAdj = new Map();
    for (const edge of state.edges) {
      if (!reverseAdj.has(edge.to)) reverseAdj.set(edge.to, []);
      reverseAdj.get(edge.to).push(edge.from);
    }

    const wantedSenders = new Set([targetId]);
    const queue = [targetId];
    for (const link of state.projectionLinks) {
      if (link.to !== targetId) continue;
      const fromNode = state.nodeMap.get(link.from);
      if (!fromNode?.unlocked || !fromNode.canProject) continue;
      if (wantedSenders.has(link.from)) continue;
      wantedSenders.add(link.from);
      queue.push(link.from);
    }
    while (queue.length > 0) {
      const node = queue.shift();
      const parents = reverseAdj.get(node) ?? [];
      for (const p of parents) {
        if (!unlocked.has(p)) continue;
        if (wantedSenders.has(p)) continue;
        wantedSenders.add(p);
        queue.push(p);
      }
    }

    for (const edge of state.edges) {
      const fromUnlocked = unlocked.has(edge.from);
      const feedsPath = wantedSenders.has(edge.to);
      edge.flow = fromUnlocked && feedsPath ? 100 : 0;
    }
    state.routeDemandNodes = wantedSenders;

    const attr = this.mechanics.getAttributeState(state);
    state.activeProjections = [];
    for (const link of state.projectionLinks) {
      if (state.activeProjections.length >= attr.maxActiveBridges) break;
      const fromNode = state.nodeMap.get(link.from);
      if (!fromNode?.unlocked || !fromNode.canProject) continue;
      if (link.to !== targetId) continue;
      state.activeProjections.push({
        from: link.from,
        to: link.to
      });
    }
  }

  refreshTargetProjections(state, targetId) {
    if (targetId == null) return;
    const attr = this.mechanics.getAttributeState(state);
    const demandedNodes = state.routeDemandNodes?.size ? state.routeDemandNodes : new Set([targetId]);
    const existingToDemand = state.activeProjections.filter((p) => demandedNodes.has(p.to));

    if (existingToDemand.length >= attr.maxActiveBridges) return;
    for (const link of state.projectionLinks) {
      if (!demandedNodes.has(link.to)) continue;
      if (state.activeProjections.length >= attr.maxActiveBridges) break;
      const fromNode = state.nodeMap.get(link.from);
      if (!fromNode?.unlocked || !fromNode.canProject) continue;
      const alreadyExists = state.activeProjections.some((p) => p.from === link.from && p.to === link.to);
      if (alreadyExists) continue;
      state.activeProjections.push({
        from: link.from,
        to: link.to
      });
    }
  }

  chooseTarget(strategyName, availableNodes, rng) {
    if (availableNodes.length === 0) return null;
    if (strategyName === "cheapest") {
      return [...availableNodes].sort((a, b) => a.unlockCost - b.unlockCost || a.id - b.id)[0];
    }
    if (strategyName === "expensive") {
      return [...availableNodes].sort((a, b) => b.unlockCost - a.unlockCost || a.id - b.id)[0];
    }
    if (strategyName === "random") {
      const idx = Math.floor(rng() * availableNodes.length);
      return availableNodes[idx];
    }
    throw new Error(`Unknown strategy: ${strategyName}`);
  }

  runSingle(strategyName, rng, options = {}) {
    const state = this.buildInitialState();
    const runLabel = options.runLabel ?? strategyName;
    const logProgress = options.logProgress ?? false;
    const progressEveryTicks = options.progressEveryTicks ?? 200000;
    const logs = [];
    const unlockEvents = [];
    const logLine = (message) => {
      logs.push(message);
      this.log(logProgress, message);
    };
    let currentTargetId = null;
    let lastUnlockCount = state.nodes.filter((n) => n.unlocked).length;
    let ticksSinceProgress = 0;
    let nextProgressTick = progressEveryTicks;
    let previousUnlockedIds = new Set(state.nodes.filter((n) => n.unlocked).map((n) => n.id));
    logLine(`[${runLabel}] started`);
    while (!this.allUnlocked(state) && state.tickCounter < this.cfg.maxTicks) {
      const currentTarget = currentTargetId != null ? state.nodeMap.get(currentTargetId) : null;
      if (!currentTarget || currentTarget.unlocked) {
        const available = this.findAvailableTargets(state);
        if (available.length === 0) {
          return { success: false, reason: "No available targets to progress.", ticks: state.tickCounter };
        }
        const selected = this.chooseTarget(strategyName, available, rng);
        currentTargetId = selected.id;
        this.routeToTarget(state, currentTargetId);
        state.timeline.push({ tick: state.tickCounter, event: "target", nodeId: currentTargetId, nodeName: selected.name });
        logLine(`[${runLabel}] target -> ${selected.name} (cost ${selected.unlockCost}) at tick ${state.tickCounter}`);
      }
      this.refreshTargetProjections(state, currentTargetId);
      this.mechanics.tick(state);
      const unlockCount = state.nodes.filter((n) => n.unlocked).length;
      if (unlockCount > lastUnlockCount) {
        const nowUnlocked = state.nodes.filter((n) => n.unlocked && !previousUnlockedIds.has(n.id));
        for (const node of nowUnlocked) {
          const unlockEvent = {
            tick: state.tickCounter,
            seconds: state.tickCounter / this.cfg.ticksPerSecond,
            nodeId: node.id,
            nodeName: node.name,
            unlockCost: node.unlockCost
          };
          unlockEvents.push(unlockEvent);
          logLine(
            `[${runLabel}] unlocked -> ${node.name} (id ${node.id}) at tick ${unlockEvent.tick} (${formatDuration(unlockEvent.seconds)})`
          );
        }
        previousUnlockedIds = new Set(state.nodes.filter((n) => n.unlocked).map((n) => n.id));
        lastUnlockCount = unlockCount;
        ticksSinceProgress = 0;
        logLine(`[${runLabel}] unlock progress: ${unlockCount}/${state.nodes.length} nodes unlocked at tick ${state.tickCounter}`);
      } else {
        ticksSinceProgress += 1;
      }
      if (state.tickCounter >= nextProgressTick) {
        const total = state.nodes.length;
        logLine(`[${runLabel}] running... tick ${state.tickCounter} | unlocked ${unlockCount}/${total}`);
        nextProgressTick += progressEveryTicks;
      }
      if (ticksSinceProgress > 2_000_000) {
        logLine(`[${runLabel}] stalled at tick ${state.tickCounter}`);
        return {
          success: false,
          reason: "Stalled without new unlock for 2,000,000 ticks.",
          ticks: state.tickCounter,
          logs,
          unlockEvents
        };
      }
    }

    logLine(`[${runLabel}] finished at tick ${state.tickCounter} | success=${this.allUnlocked(state)}`);
    return {
      success: this.allUnlocked(state),
      ticks: state.tickCounter,
      seconds: state.tickCounter / this.cfg.ticksPerSecond,
      timeline: state.timeline,
      logs,
      unlockEvents
    };
  }

  runStrategy(strategyName, options = {}) {
    const rngSeed = options.seed ?? this.cfg.randomSeed;
    const randomRuns = options.randomRuns ?? this.cfg.randomRuns;
    const logProgress = options.logProgress ?? false;
    const progressEveryTicks = options.progressEveryTicks ?? 200000;
    this.log(logProgress, `\n=== Strategy: ${strategyName} ===`);
    if (strategyName !== "random") {
      return {
        strategy: strategyName,
        runs: [this.runSingle(strategyName, mulberry32(rngSeed), { runLabel: `${strategyName}#1`, logProgress, progressEveryTicks })]
      };
    }
    const runs = [];
    for (let i = 0; i < randomRuns; i += 1) {
      runs.push(this.runSingle(strategyName, mulberry32(rngSeed + i), {
        runLabel: `${strategyName}#${i + 1}`,
        logProgress,
        progressEveryTicks
      }));
    }
    return { strategy: strategyName, runs };
  }
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "blocked";
  const clamped = Math.max(0, Math.floor(seconds));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function summarize(result) {
  const successful = result.runs.filter((run) => run.success);
  if (successful.length === 0) {
    return {
      strategy: result.strategy,
      successRuns: 0,
      totalRuns: result.runs.length,
      bestSeconds: null,
      worstSeconds: null,
      averageSeconds: null
    };
  }
  const seconds = successful.map((run) => run.seconds);
  const best = Math.min(...seconds);
  const worst = Math.max(...seconds);
  const avg = seconds.reduce((a, b) => a + b, 0) / seconds.length;
  return {
    strategy: result.strategy,
    successRuns: successful.length,
    totalRuns: result.runs.length,
    bestSeconds: best,
    worstSeconds: worst,
    averageSeconds: avg
  };
}

function writeExecutionArtifact(baseDir, payload) {
  fs.mkdirSync(baseDir, { recursive: true });
  const filePath = path.join(baseDir, "execution-log.json");
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return { filePath };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const layout = loadLayout(args.layout);
  const simulator = new UnlockSimulator(layout, {
    maxTicks: args.maxTicks,
    randomRuns: args.randomRuns,
    randomSeed: args.randomSeed
  });

  const summaries = [];
  let artifactRoot = null;
  let runStamp = null;
  if (args.saveLogs) {
    runStamp = new Date().toISOString().replace(/[:.]/g, "-");
    artifactRoot = path.resolve(args.outputDir, runStamp);
    fs.mkdirSync(artifactRoot, { recursive: true });
  }
  for (const strategy of args.strategies) {
    const result = simulator.runStrategy(strategy, {
      seed: args.randomSeed,
      randomRuns: args.randomRuns,
      logProgress: args.logProgress,
      progressEveryTicks: args.progressEveryTicks
    });
    const stats = summarize(result);
    summaries.push({ strategy, result, stats });

  }

  let executionFile = null;
  if (args.saveLogs && artifactRoot) {
    const payload = {
      type: "unlock-simulator-execution",
      createdAt: new Date().toISOString(),
      runStamp,
      options: {
        layout: args.layout,
        strategies: args.strategies,
        randomRuns: args.randomRuns,
        maxTicks: args.maxTicks,
        randomSeed: args.randomSeed
      },
      summaries: summaries.map((item) => ({
        strategy: item.strategy,
        stats: item.stats,
        runs: item.result.runs
      }))
    };
    executionFile = writeExecutionArtifact(artifactRoot, payload).filePath;
  }

  if (args.json) {
    const payload = summaries.map((item) => ({
      strategy: item.strategy,
      stats: item.stats,
      runs: item.result.runs
    }));
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  for (const item of summaries) {
    const s = item.stats;
    if (!s.bestSeconds) {
      process.stdout.write(`\n${s.strategy.toUpperCase()}: no successful runs (${s.successRuns}/${s.totalRuns})\n`);
      continue;
    }
    process.stdout.write(
      `\n${s.strategy.toUpperCase()} (${s.successRuns}/${s.totalRuns} success)\n` +
      `  Best   : ${formatDuration(s.bestSeconds)}\n` +
      `  Average: ${formatDuration(s.averageSeconds)}\n` +
      `  Worst  : ${formatDuration(s.worstSeconds)}\n`
    );
  }
  if (args.saveLogs && artifactRoot) {
    process.stdout.write(`\nSaved execution log to: ${executionFile}\n`);
  }
}

main();
