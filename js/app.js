    const TICKS_PER_SECOND = 100;
    const TICKS_PER_CYCLE = 1000;
    const SOURCE_RATE_PER_CYCLE = 100;
    const SOURCE_RATE_PER_TICK = SOURCE_RATE_PER_CYCLE / TICKS_PER_CYCLE;
    const FLOW_TRANSFER_FACTOR_PER_CYCLE = 0.01; // 1% at 100% flow per 1000 ticks
    const FLOW_TRANSFER_FACTOR_PER_TICK = FLOW_TRANSFER_FACTOR_PER_CYCLE / TICKS_PER_CYCLE;
    const TICK_MS = 1000 / TICKS_PER_SECOND;
    let projectionTransferFactorPerTick = 0.003 / TICKS_PER_CYCLE;
    const MIN_ZOOM = 0.2;
    const MAX_ZOOM = 20.4;
    const ZOOM_STEP = 1.1;
    let resonanceGainPerTick = 0.08;
    let resonanceDecayPerTick = 0.035;
    let resonanceBurstTicksMax = 4500;
    let earthSinkInflowThreshold = 0.03;
    let earthSinkHardThreshold = 0.08;
    let sunSurgeIntervalTicks = 1400;
    let sunSurgeDurationTicks = 280;
    const SYMBOL_MODE_ENTER_ZOOM_THRESHOLD = 2.00;
    const SYMBOL_MODE_EXIT_ZOOM_THRESHOLD = 0.40;
    const CHAKRA_SYMBOL_URL = "file:///C:/Users/konra/.cursor/projects/c-Users-konra-Desktop-Cursor-FlowMaster/assets/c__Users_konra_Desktop_Cursor_FlowMaster_body.png";
    const BODY_WORLD_BASE_WIDTH = 1500;
    const BODY_MODE_DEFAULT_SCALE = 2.0;
    const BODY_MODE_FOCUS_TIER2_ID = "qi";
    const DEFAULT_T2_NODES = [
      { id: "crown", name: "Crown", x: 760, y: 175, radius: 16 },
      { id: "mind", name: "Mind", x: 760, y: 330, radius: 16 },
      { id: "intent", name: "Intent", x: 760, y: 510, radius: 16 },
      { id: "qi", name: "Qi", x: 760, y: 885, radius: 18 },
      { id: "heart", name: "Heart", x: 760, y: 1110, radius: 18 },
      { id: "stomach", name: "Stomach", x: 760, y: 1280, radius: 18 },
      { id: "dantian", name: "Dantian", x: 760, y: 1510, radius: 20 },
      { id: "spine", name: "Spine", x: 760, y: 1640, radius: 18 },
      { id: "kneeLeft", name: "Left Knee", x: 590, y: 1865, radius: 16 },
      { id: "kneeRight", name: "Right Knee", x: 930, y: 1865, radius: 16 },
      { id: "footLeft", name: "Left Foot", x: 565, y: 2110, radius: 17 },
      { id: "footRight", name: "Right Foot", x: 955, y: 2110, radius: 17 }
    ];
    const t2LayoutSource = Array.isArray(window.TIER2_LAYOUT_OVERRIDE)
      ? window.TIER2_LAYOUT_OVERRIDE
      : DEFAULT_T2_NODES;
    const defaultT2ById = new Map(DEFAULT_T2_NODES.map((node) => [node.id, node]));
    const TIER2_NODES = t2LayoutSource.map((node) => {
      const fallback = defaultT2ById.get(node.id) ?? {};
      return {
        id: node.id,
        name: node.name ?? fallback.name ?? node.id,
        x: typeof node.x === "number" ? node.x : (fallback.x ?? 0),
        y: typeof node.y === "number" ? node.y : (fallback.y ?? 0),
        radius: typeof node.radius === "number" ? node.radius : (fallback.radius ?? 16)
      };
    });

    function deepClone(value) {
      return JSON.parse(JSON.stringify(value));
    }

    function getTier2SchemaConfig(tier2Id) {
      const allSchemas = window.TIER2_NODE_SCHEMAS ?? {};
      const schema = allSchemas[tier2Id];
      if (!schema) return null;
      return {
        nodeDefinitions: deepClone(schema.nodeDefinitions ?? []),
        initialNodePositions: deepClone(schema.initialNodePositions ?? {}),
        nodeEdges: deepClone(schema.nodeEdges ?? []),
        projectionLinks: deepClone(schema.projectionLinks ?? [])
      };
    }

    function loadConfigWithValidation() {
      const activeSchema = getTier2SchemaConfig(BODY_MODE_FOCUS_TIER2_ID);
      const schemaSource = activeSchema ?? {
        nodeDefinitions: window.NODE_DEFINITIONS ?? [],
        initialNodePositions: window.INITIAL_NODE_POSITIONS ?? {},
        nodeEdges: window.NODE_EDGES ?? [],
        projectionLinks: window.PROJECTION_LINKS ?? []
      };
      const zApi = window.z ?? window.Zod ?? null;
      if (!zApi) {
        return {
          nodeDefinitions: schemaSource.nodeDefinitions,
          initialNodePositions: schemaSource.initialNodePositions,
          nodeEdges: schemaSource.nodeEdges,
          projectionLinks: schemaSource.projectionLinks
        };
      }

      const bonusSchema = zApi.record(zApi.number()).optional();
      const nodeSchema = zApi.object({
        id: zApi.number(),
        name: zApi.string(),
        unlocked: zApi.boolean(),
        si: zApi.number(),
        unlockCost: zApi.number(),
        canProject: zApi.boolean().optional(),
        attributeType: zApi.string().optional(),
        attributeTier: zApi.number().optional(),
        bonuses: bonusSchema
      });
      const positionSchema = zApi.object({ x: zApi.number(), y: zApi.number() });
      const edgeSchema = zApi.object({
        from: zApi.number(),
        to: zApi.number(),
        flow: zApi.number(),
        key: zApi.string().optional()
      });
      const projectionSchema = zApi.object({ from: zApi.number(), to: zApi.number() });
      const cfgSchema = zApi.object({
        nodeDefinitions: zApi.array(nodeSchema),
        initialNodePositions: zApi.record(positionSchema),
        nodeEdges: zApi.array(edgeSchema),
        projectionLinks: zApi.array(projectionSchema)
      });

      const parsed = cfgSchema.safeParse(schemaSource);

      if (!parsed.success) {
        console.warn("Config validation failed, using raw config.", parsed.error);
        return {
          nodeDefinitions: schemaSource.nodeDefinitions,
          initialNodePositions: schemaSource.initialNodePositions,
          nodeEdges: schemaSource.nodeEdges,
          projectionLinks: schemaSource.projectionLinks
        };
      }
      return parsed.data;
    }

    const gameConfig = loadConfigWithValidation();
    const initialNodeState = gameConfig.nodeDefinitions.map((node) => ({ ...node }));
    const nodeData = initialNodeState.map((node) => ({ ...node }));

    const initialEdges = gameConfig.nodeEdges.map((edge, index) => ({
      ...edge,
      key: edge.key ?? `${edge.from}_${edge.to}_${index}`
    }));
    const edges = initialEdges.map((edge) => ({ ...edge }));
    const projectionLinks = gameConfig.projectionLinks ?? [];

    const nodePositions = Object.fromEntries(
      Object.entries(gameConfig.initialNodePositions).map(([key, pos]) => [
        Number(key),
        { ...pos }
      ])
    );

    let tickCounter = 0;
    let gameWon = false;
    let app;
    let selectedNodeId = -1;
    let isPanning = false;
    let draggingNodeId = null;
    let panStartX = 0;
    let panStartY = 0;
    let worldStartX = 0;
    let worldStartY = 0;
    let draggedDistance = 0;
    let dragNodeOffsetX = 0;
    let dragNodeOffsetY = 0;
    let draggingTier2NodeId = null;
    let dragTier2OffsetX = 0;
    let dragTier2OffsetY = 0;
    let tier2DraggedDistance = 0;
    let developerMode = false;

    const edgeVisuals = {};
    const nodeVisuals = {};
    const particles = [];
    const activeProjections = [];
    let particleAccumulator = 0;
    let world;
    let usingViewport = false;
    let edgeLayer;
    let nodeLayer;
    let particleLayer;
    let symbolLayer;
    let symbolSprite;
    let tier2MarkerLayer;
    const tier2MarkerVisuals = new Map();
    let bodyMapWidth = BODY_WORLD_BASE_WIDTH;
    let bodyMapHeight = 1900;
    let symbolModeEnabled = false;
    let isViewTransitioning = false;
    let viewTransitionQueued = false;
    let lastZoomScale = 1;
    let activeTier2NodeId = BODY_MODE_FOCUS_TIER2_ID;
    let activeTier1OwnerTier2Id = BODY_MODE_FOCUS_TIER2_ID;
    const tier1ViewState = { initialized: false, scale: 1, x: 0, y: 0 };
    const tier2ViewState = {
      initialized: false,
      scale: BODY_MODE_DEFAULT_SCALE,
      x: 0,
      y: 0,
      focusTier2Id: BODY_MODE_FOCUS_TIER2_ID
    };
    let lastPopupLeft = 12;
    let lastPopupTop = 12;
    let edgeKeyCounter = initialEdges.length;
    let hoveredTargetNodeId = null;
    let hoveredEdgeKey = null;
    let hoveredProjection = null;
    let projectionHoverGraphic;
    let resonance = 0;
    let resonanceBurstTicks = 0;
    let sunSurgeTicks = 0;
    let lastSunSurgeTick = 0;
    let visibleNodeIds = new Set();
    const unlockFadeProgress = new Map();
    const UNLOCK_FADE_TICKS = 90;
    let balancePane = null;
    let devSpeedEnabled = false;
    let simSpeedMultiplier = 1;
    let forceShowAllNodes = false;
    const tier2Tier1Snapshots = new Map();

    const ticksEl = document.getElementById("ticks");
    const sourceTotalEl = document.getElementById("sourceTotal");
    const statusEl = document.getElementById("status");
    const bonusSummaryEl = document.getElementById("bonusSummary");
    const stateWarningsEl = document.getElementById("stateWarnings");
    const resonanceChecklistEl = document.getElementById("resonanceChecklist");
    const nextActionEl = document.getElementById("nextAction");
    const flowPopupEl = document.getElementById("flowPopup");
    const markerTooltipEl = document.getElementById("markerTooltip");
    const zoomHudEl = document.getElementById("zoomHud");
    const pixiWrapEl = document.getElementById("pixiWrap");
    const devSpeedToggleEl = document.getElementById("devSpeedToggle");
    const devToolsRowEl = document.getElementById("devToolsRow");
    const devSpeedRowEl = document.getElementById("devSpeedRow");
    const speed1xEl = document.getElementById("speed1x");
    const speed10xEl = document.getElementById("speed10x");
    const speed100xEl = document.getElementById("speed100x");
    const devModeToggleEl = document.getElementById("devModeToggle");
    const resetBodyViewEl = document.getElementById("resetBodyView");
    const showAllNodesBtnEl = document.getElementById("showAllNodesBtn");
    const editNodesBtnEl = document.getElementById("editNodesBtn");
    const saveShapeEl = document.getElementById("saveShapeBtn");
    const addT2NodeEl = document.getElementById("addT2NodeBtn");
    const saveT2LayoutEl = document.getElementById("saveT2LayoutBtn");
    const ATTRIBUTE_THEME = {
      Essence: {
        name: "Jing Root",
        description: "Increases core Spirit generation through refined essence."
      },
      Flow: {
        name: "Meridian Current",
        description: "Improves transfer efficiency and keeps channels circulating."
      },
      Insight: {
        name: "Spirit Sight",
        description: "Improves projection control, duration, and echo precision."
      },
      Fortitude: {
        name: "Body Tempering",
        description: "Mitigates destabilizing penalties from heavy Earth sink routing."
      },
      Harmony: {
        name: "Dual Harmony",
        description: "Amplifies projection throughput and resonance stability."
      },
      Void: {
        name: "Void Attunement",
        description: "Strengthens resonance burst and advanced bridge capacity."
      }
    };
    const METRIC_TOOLTIPS = {
      "Meridian Efficiency": "Multiplier applied to edge transfer each tick.",
      "Projection Throughput": "Extra Spirit sent through active projection bridges.",
      "Projection Echo": "Portion of projection output echoed as additional transfer.",
      "Body Tempering": "Resistance against Earth Nexus sink penalties.",
      "Dual Harmony": "Harmony force that boosts projection and resonance behavior.",
      "Core Generation Bonus": "Percent increase to base Spirit generation.",
      "Core Generation (Flat)": "Flat Spirit generation added every second.",
      "Core Net Flux": "Current core inflow minus outflow per second.",
      "Max Projection Bridges": "Maximum active projection bridges allowed at once.",
      "Projection Anchors": "How many unlocked nodes can initiate projections.",
      "Resonance State": "Whether resonance thresholds are currently satisfied."
    };

    function nodeById(nodeId) {
      return nodeData.find((node) => node.id === nodeId);
    }

    function captureCurrentTier1Snapshot() {
      const nodeState = nodeData.map((node) => ({
        id: node.id,
        unlocked: node.unlocked,
        si: node.si
      }));
      const edgeFlows = Object.fromEntries(edges.map((edge) => [edge.key, edge.flow]));
      const projections = activeProjections.map((projection) => ({ ...projection }));
      return { nodeState, edgeFlows, projections };
    }

    function applyTier1Snapshot(snapshot) {
      if (!snapshot) return;
      const nodeStateById = new Map(snapshot.nodeState.map((entry) => [entry.id, entry]));
      for (const node of nodeData) {
        const entry = nodeStateById.get(node.id);
        if (!entry) {
          node.unlocked = false;
          node.si = 0;
          continue;
        }
        node.unlocked = entry.unlocked;
        node.si = entry.si;
      }
      for (const edge of edges) {
        edge.flow = 0;
      }
      for (const entry of snapshot.nodeState) {
        const node = nodeById(entry.id);
        if (!node) continue;
        node.unlocked = entry.unlocked;
        node.si = entry.si;
      }
      for (const edge of edges) {
        if (Object.prototype.hasOwnProperty.call(snapshot.edgeFlows, edge.key)) {
          edge.flow = snapshot.edgeFlows[edge.key];
        }
      }
      activeProjections.length = 0;
      for (const projection of snapshot.projections) {
        activeProjections.push({ ...projection });
      }
    }

    function initializeTier2Snapshots() {
      tier2Tier1Snapshots.clear();
      for (const tier2 of TIER2_NODES) {
        const schemaConfig = getTier2SchemaConfig(tier2.id) ?? gameConfig;
        const schemaNodes = schemaConfig.nodeDefinitions ?? [];
        const schemaEdges = (schemaConfig.nodeEdges ?? []).map((edge, index) => ({
          ...edge,
          key: edge.key ?? `${edge.from}_${edge.to}_${index}`
        }));
        tier2Tier1Snapshots.set(tier2.id, {
          nodeState: schemaNodes.map((node) => ({
            id: node.id,
            unlocked: node.unlocked,
            si: node.si
          })),
          edgeFlows: Object.fromEntries(schemaEdges.map((edge) => [edge.key, edge.flow])),
          projections: []
        });
      }
    }

    function buildSnapshotFromTier2Schema(tier2Id) {
      const schemaConfig = getTier2SchemaConfig(tier2Id) ?? gameConfig;
      const schemaNodes = schemaConfig.nodeDefinitions ?? [];
      const schemaEdges = (schemaConfig.nodeEdges ?? []).map((edge, index) => ({
        ...edge,
        key: edge.key ?? `${edge.from}_${edge.to}_${index}`
      }));
      return {
        nodeState: schemaNodes.map((node) => ({
          id: node.id,
          unlocked: node.unlocked,
          si: node.si
        })),
        edgeFlows: Object.fromEntries(schemaEdges.map((edge) => [edge.key, edge.flow])),
        projections: []
      };
    }

    function getOrCreateTier2Snapshot(tier2Id) {
      if (!tier2Tier1Snapshots.has(tier2Id)) {
        tier2Tier1Snapshots.set(tier2Id, buildSnapshotFromTier2Schema(tier2Id));
      }
      return tier2Tier1Snapshots.get(tier2Id);
    }

    function getCultivationAttributeInfo(attributeType) {
      if (!attributeType) return { name: "Unknown Path", description: "No attribute path defined." };
      return ATTRIBUTE_THEME[attributeType] ?? {
        name: attributeType,
        description: "Unclassified cultivation path."
      };
    }

    function showDomTooltip(event, text) {
      if (!text) return;
      markerTooltipEl.textContent = text;
      markerTooltipEl.style.left = `${Math.round(event.clientX)}px`;
      markerTooltipEl.style.top = `${Math.round(event.clientY)}px`;
      markerTooltipEl.classList.remove("hidden");
    }

    function updateZoomHud() {
      if (!zoomHudEl || !world) return;
      const activeTier2 = TIER2_NODES.find((node) => node.id === activeTier2NodeId);
      const tier2Label = activeTier2 ? activeTier2.name : "n/a";
      let watching = "n/a";
      if (symbolModeEnabled) {
        watching = "T2 map";
      } else {
        const centerPoint = viewportCenterWorldPoint();
        const nearest = nearestTier1NodeFromWorldPoint(centerPoint);
        watching = nearest ? `T1 ${nearest.name}` : "T1";
      }
      zoomHudEl.innerHTML = `Zoom: ${world.scale.x.toFixed(2)}x<br>T2: ${tier2Label}<br>View: ${watching}`;
    }

    function nearestTier1NodeFromWorldPoint(point) {
      let bestNode = null;
      let bestDist = Infinity;
      for (const node of nodeData) {
        const pos = nodePositions[node.id];
        if (!pos) continue;
        const dx = point.x - pos.x;
        const dy = point.y - pos.y;
        const dist = Math.hypot(dx, dy);
        if (dist < bestDist) {
          bestDist = dist;
          bestNode = node;
        }
      }
      return bestNode;
    }

    function focusTier1OnNode(nodeId) {
      const nodePos = nodePositions[nodeId];
      if (!nodePos) return;
      world.x = Math.round(app.screen.width * 0.5 - nodePos.x * world.scale.x);
      world.y = Math.round(app.screen.height * 0.5 - nodePos.y * world.scale.y);
    }

    function attachDomTooltips(rootEl) {
      if (!rootEl) return;
      const tooltipNodes = rootEl.querySelectorAll("[data-tooltip]");
      for (const el of tooltipNodes) {
        const tip = el.dataset.tooltip;
        if (!tip) continue;
        el.classList.add("has-tooltip");
        el.addEventListener("mouseenter", (event) => showDomTooltip(event, tip));
        el.addEventListener("mousemove", (event) => showDomTooltip(event, tip));
        el.addEventListener("mouseleave", hideMarkerTooltip);
      }
    }

    function computeVisibleNodeIds() {
      if (forceShowAllNodes) {
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

    function unlockedNodes() {
      return nodeData.filter((node) => node.unlocked);
    }

    function sumUnlockedBonus(field) {
      return unlockedNodes().reduce(
        (sum, node) => sum + (node.bonuses?.[field] ?? 0),
        0
      );
    }

    function getAttributeState() {
      const flowEfficiency = sumUnlockedBonus("flowEfficiency");
      const projectionRatePercent = sumUnlockedBonus("projectionRatePercent");
      const projectionEcho = sumUnlockedBonus("projectionEcho");
      const fortitude = sumUnlockedBonus("fortitude");
      const harmonyPower = sumUnlockedBonus("harmonyPower");
      const essencePercent = sumUnlockedBonus("essencePercent");
      const essenceFlatPerCycle = sumUnlockedBonus("essenceFlatPerCycle");
      const projectionDurationTicks = sumUnlockedBonus("projectionDurationTicks");
      const maxBridgesBonus = sumUnlockedBonus("maxBridges");
      const resonanceBurstPercent = sumUnlockedBonus("resonanceBurstPercent");

      const coreAdjacents = [12, 13, 14].filter((id) => nodeById(id)?.unlocked).length;
      const coreAdjacencyBonus = coreAdjacents * (nodeById(0)?.bonuses?.essencePercent ?? 0);

      const hasLeftBranch = nodeById(5)?.unlocked && nodeById(6)?.unlocked && nodeById(7)?.unlocked;
      const hasRightBranch = nodeById(8)?.unlocked && nodeById(9)?.unlocked && nodeById(10)?.unlocked;
      const hasTriangle = nodeById(12)?.unlocked && nodeById(13)?.unlocked && nodeById(14)?.unlocked;
      const hasUpper = nodeById(1)?.unlocked && nodeById(2)?.unlocked && nodeById(3)?.unlocked;
      const leftPattern = edgeFlow(15, 5) + edgeFlow(5, 6) + edgeFlow(6, 11);
      const rightPattern = edgeFlow(8, 3) + edgeFlow(3, 9) + edgeFlow(9, 10);
      const trianglePattern = edgeFlow(12, 13) + edgeFlow(13, 14) + edgeFlow(14, 12);
      const upperPattern = edgeFlow(2, 1) + edgeFlow(1, 17) + edgeFlow(18, 19);
      const resonancePatternReady =
        leftPattern >= 24 && rightPattern >= 24 && trianglePattern >= 24 && upperPattern >= 10;
      const resonanceReady = Boolean(
        hasLeftBranch && hasRightBranch && hasTriangle && hasUpper && resonancePatternReady
      );
      const resonanceActive = resonanceBurstTicks > 0;

      const generationPercent =
        essencePercent +
        coreAdjacencyBonus +
        (resonanceActive ? resonanceBurstPercent : 0) +
        harmonyPower * 0.2;
      const generationFlatPerTick = essenceFlatPerCycle / TICKS_PER_CYCLE;

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
        resonanceReady,
        resonanceActive,
        resonancePatternReady,
        leftPattern,
        rightPattern,
        trianglePattern,
        upperPattern
      };
    }

    function edgeFlow(from, to) {
      const edge = edges.find((item) => item.from === from && item.to === to);
      return edge ? edge.flow : 0;
    }

    function fmt(num) {
      return num.toFixed(2);
    }

    function formatDuration(seconds) {
      if (!Number.isFinite(seconds)) return "blocked";
      const clamped = Math.max(0, Math.floor(seconds));
      const h = Math.floor(clamped / 3600);
      const m = Math.floor((clamped % 3600) / 60);
      const s = clamped % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

    function fmtPercent(ratio) {
      return `${(ratio * 100).toFixed(1)}%`;
    }

    function getProjectionTransferPerTick(attr, projection) {
      const sourceNode = nodeById(0);
      const fromNode = nodeById(projection.from);
      if (!sourceNode || !fromNode) return 0;
      const surgeProjectionBonus = sunSurgeTicks > 0 ? 0.2 : 0;
      const transfer =
        sourceNode.si *
        projectionTransferFactorPerTick *
        (1 + attr.projectionRatePercent + attr.harmonyPower * 0.15 + surgeProjectionBonus);
      return Math.max(0, Math.min(transfer, fromNode.si));
    }

    function computeNodeRates(attr) {
      const rates = Object.fromEntries(nodeData.map((node) => [node.id, { in: 0, out: 0, net: 0 }]));
      for (const edge of edges) {
        const transfer = getEdgeTransferPerTick(edge, attr);
        if (transfer <= 0) continue;
        rates[edge.from].out += transfer;
        rates[edge.to].in += transfer;
      }
      for (const projection of activeProjections) {
        const transfer = getProjectionTransferPerTick(attr, projection);
        if (transfer <= 0) continue;
        rates[projection.from].out += transfer;
        rates[projection.to].in += transfer;
      }
      for (const id of Object.keys(rates)) {
        rates[id].net = rates[id].in - rates[id].out;
      }
      return rates;
    }

    function formatNodeBonuses(node) {
      const bonuses = node.bonuses || {};
      const entries = [];
      if (bonuses.flowEfficiency) entries.push(`+${fmtPercent(bonuses.flowEfficiency)} Meridian Efficiency`);
      if (bonuses.projectionRatePercent) entries.push(`+${fmtPercent(bonuses.projectionRatePercent)} Projection Throughput`);
      if (bonuses.projectionDurationTicks) entries.push(`+${bonuses.projectionDurationTicks} Projection Duration Ticks`);
      if (bonuses.projectionEcho) entries.push(`+${fmtPercent(bonuses.projectionEcho)} Projection Echo`);
      if (bonuses.fortitude) entries.push(`+${fmtPercent(bonuses.fortitude)} Body Tempering`);
      if (bonuses.harmonyPower) entries.push(`+${fmtPercent(bonuses.harmonyPower)} Dual Harmony`);
      if (bonuses.essencePercent) entries.push(`+${fmtPercent(bonuses.essencePercent)} Core Generation Bonus`);
      if (bonuses.essenceFlatPerCycle) entries.push(`+${bonuses.essenceFlatPerCycle} SI / 1000 ticks (Flat Gen)`);
      if (bonuses.maxBridges) entries.push(`+${bonuses.maxBridges} Max Projection Bridge`);
      if (bonuses.resonanceBurstPercent) entries.push(`+${fmtPercent(bonuses.resonanceBurstPercent)} Resonance Burst`);
      if (bonuses.earthSinkPenalty) entries.push(`Earth Penalty ${fmtPercent(bonuses.earthSinkPenalty)}`);
      return entries.length > 0 ? entries.join(" | ") : "No passive bonus";
    }

    function updateBonusSummary() {
      const attr = getAttributeState();
      const rates = computeNodeRates(attr);
      const coreRate = rates[0] ?? { in: 0, out: 0, net: 0 };
      const projectionSources = nodeData.filter((node) => node.canProject).length;
      const activeResonance = attr.resonanceActive ? "Active" : "Inactive";
      const rows = [
        ["Meridian Efficiency", fmtPercent(attr.flowEfficiency)],
        ["Projection Throughput", fmtPercent(attr.projectionRatePercent)],
        ["Projection Echo", fmtPercent(attr.projectionEcho)],
        ["Body Tempering", fmtPercent(attr.fortitude)],
        ["Dual Harmony", fmtPercent(attr.harmonyPower)],
        ["Core Generation Bonus", fmtPercent(attr.generationPercent)],
        ["Core Generation (Flat)", `${fmt(attr.generationFlatPerTick * TICKS_PER_SECOND)} SI/s`],
        ["Core Net Flux", `${fmt(coreRate.net * TICKS_PER_SECOND)} SI/s`],
        ["Max Projection Bridges", `${attr.maxActiveBridges}`],
        ["Projection Anchors", `${projectionSources}`],
        ["Resonance State", activeResonance]
      ];
      bonusSummaryEl.innerHTML = rows.map(([label, value]) => {
        const tip = METRIC_TOOLTIPS[label] ?? "";
        return `<div data-tooltip="${tip}">${label}: <strong>${value}</strong></div>`;
      }).join("");
      attachDomTooltips(bonusSummaryEl);

      const warnings = [];
      if (sunSurgeTicks > 0) warnings.push(`Sun Surge active (${Math.ceil(sunSurgeTicks / TICKS_PER_SECOND)}s)`);
      const earthNode = nodeById(11);
      if (earthNode?.unlocked && earthNode.si > 0 && attr.fortitude < 0.7) {
        warnings.push("Earth Nexus penalty active");
      }
      if (activeProjections.length >= attr.maxActiveBridges) warnings.push("Projection capacity full");
      stateWarningsEl.textContent = warnings.length > 0 ? warnings.join(" | ") : "No active penalties.";

      resonanceChecklistEl.innerHTML = `
        <div>Left Branch: <strong>${fmt(attr.leftPattern)}/24</strong></div>
        <div>Right Branch: <strong>${fmt(attr.rightPattern)}/24</strong></div>
        <div>Inner Triangle: <strong>${fmt(attr.trianglePattern)}/24</strong></div>
        <div>Upper Branch: <strong>${fmt(attr.upperPattern)}/10</strong></div>
      `;

      let best = null;
      for (const node of nodeData) {
        if (node.unlocked || node.id === 0 || !visibleNodeIds.has(node.id)) continue;
        const remaining = Math.max(0, node.unlockCost - node.si);
        const rate = Math.max(0, rates[node.id]?.net ?? 0);
        if (rate <= 0) continue;
        const etaSec = remaining / rate / TICKS_PER_SECOND;
        if (!best || etaSec < best.etaSec) {
          best = { node, etaSec };
        }
      }
      if (best) {
        nextActionEl.textContent = `Feed ${best.node.name} first (ETA ${formatDuration(best.etaSec)} at current routing).`;
      } else {
        nextActionEl.textContent = "No reachable unlock with positive net SI. Redirect flows or open projection bridge.";
      }
    }

    function getFlowColor(flow) {
      if (flow <= 0) return 0x4b635a;
      if (flow < 35) return 0x6ea78d;
      if (flow < 70) return 0x8bd8b0;
      return 0xb6ffd1;
    }

    function makeText(label, size, color) {
      return new PIXI.Text({
        text: label,
        style: {
          fontFamily: "Arial",
          fontSize: size,
          fill: color,
          fontWeight: "700"
        }
      });
    }

    function showMarkerTooltip(text, marker) {
      if (!app || symbolModeEnabled) return;
      const global = marker.getGlobalPosition();
      markerTooltipEl.textContent = text;
      markerTooltipEl.style.left = `${Math.round(global.x)}px`;
      markerTooltipEl.style.top = `${Math.round(global.y)}px`;
      markerTooltipEl.classList.remove("hidden");
    }

    function hideMarkerTooltip() {
      markerTooltipEl.classList.add("hidden");
    }

    function createMarker(fillColor, tooltipText) {
      const marker = new PIXI.Graphics();
      marker.eventMode = "static";
      marker.cursor = "help";
      marker.on("pointerover", () => showMarkerTooltip(tooltipText, marker));
      marker.on("pointermove", () => showMarkerTooltip(tooltipText, marker));
      marker.on("pointerout", hideMarkerTooltip);
      marker.circle(0, 0, 6);
      marker.fill(fillColor);
      return marker;
    }

    function createNodeVisual(node) {
      const circle = new PIXI.Graphics();
      const progressRing = new PIXI.Graphics();
      const title = makeText(node.name, 13, 0x0a1812);
      title.anchor.set(0.5);
      const energy = makeText("0.00 SI", 11, 0xdff7ea);
      energy.anchor.set(0.5);
      const projectorMarker = createMarker(0xb8a6ff, "Projection source");
      const outgoingMarker = createMarker(0x7bf1a8, "Has outgoing flow links");
      const incomingMarker = createMarker(0xffd27b, "Has incoming flow links");
      const targetMarker = createMarker(0x6ed0ff, "Projection target");

      circle.eventMode = "static";
      circle.cursor = "pointer";
      circle.on("pointertap", () => selectNode(node.id));
      circle.on("pointerdown", (event) => tryStartNodeDrag(node.id, event));

      nodeLayer.addChild(progressRing, circle, title, energy, projectorMarker, outgoingMarker, incomingMarker, targetMarker);
      nodeVisuals[node.id] = {
        circle,
        progressRing,
        title,
        energy,
        projectorMarker,
        outgoingMarker,
        incomingMarker,
        targetMarker
      };
    }

    function setTier2VisualPosition(tier2Id) {
      const tier2 = TIER2_NODES.find((node) => node.id === tier2Id);
      const visual = tier2MarkerVisuals.get(tier2Id);
      if (!tier2 || !visual) return;
      visual.marker.position.set(tier2.x, tier2.y);
      if (visual.label) {
        visual.label.position.set(tier2.x, tier2.y - 18);
      }
    }

    function redrawTier2MarkerVisual(tier2Id, hovered = false) {
      const tier2 = TIER2_NODES.find((node) => node.id === tier2Id);
      const visual = tier2MarkerVisuals.get(tier2Id);
      if (!tier2 || !visual) return;
      const marker = visual.marker;
      const zoomRatio = world ? world.scale.x / BODY_MODE_DEFAULT_SCALE : 1;
      const zoomFactor = 0.85 + 0.35 * Math.max(0.2, Math.min(1.4, zoomRatio));
      const radius = (tier2.radius ?? 16) * zoomFactor * 2.5;
      marker.clear();
      marker.circle(0, 0, radius);
      marker.fill({ color: 0xffffff, alpha: hovered ? 0.42 : 0 });
      marker.stroke({
        width: hovered ? 3.5 : 0,
        color: hovered ? 0xffffff : 0xff4d4d,
        alpha: hovered ? 1 : 0
      });
    }

    function refreshTier2MarkerVisuals() {
      for (const [tier2Id, visual] of tier2MarkerVisuals.entries()) {
        redrawTier2MarkerVisual(tier2Id, Boolean(visual.hovered));
      }
    }

    function createTier2MarkerVisual(tier2) {
      if (!tier2MarkerLayer) return;
      const marker = new PIXI.Graphics();
      marker.eventMode = "static";
      marker.cursor = "pointer";
      redrawTier2MarkerVisual(tier2.id, false);
      marker.on("pointerdown", (event) => {
        tryStartTier2Drag(tier2.id, event);
      });
      marker.on("pointerover", () => {
        const visual = tier2MarkerVisuals.get(tier2.id);
        if (visual) visual.hovered = true;
        redrawTier2MarkerVisual(tier2.id, true);
      });
      marker.on("pointerout", () => {
        const visual = tier2MarkerVisuals.get(tier2.id);
        if (visual) visual.hovered = false;
        redrawTier2MarkerVisual(tier2.id, false);
      });
      marker.on("pointertap", () => {
        if (developerMode && tier2DraggedDistance > 6) return;
        if (!symbolModeEnabled) return;
        activeTier2NodeId = tier2.id;
        enterTier1ForActiveTier2();
      });
      const label = null;
      tier2MarkerVisuals.set(tier2.id, { marker, label, hovered: false });
      setTier2VisualPosition(tier2.id);
      tier2MarkerLayer.addChild(marker);
    }

    function tryStartTier2Drag(tier2Id, event) {
      if (!developerMode || !symbolModeEnabled) return;
      draggingTier2NodeId = tier2Id;
      tier2DraggedDistance = 0;
      const local = event.getLocalPosition(world);
      const tier2 = TIER2_NODES.find((node) => node.id === tier2Id);
      if (!tier2) return;
      dragTier2OffsetX = local.x - tier2.x;
      dragTier2OffsetY = local.y - tier2.y;
    }

    function initBalancePane() {
      if (balancePane) return;
      if (!window.Tweakpane || !window.Tweakpane.Pane) {
        statusEl.textContent = "Balance panel unavailable (Tweakpane failed to load).";
        return;
      }
      const host = document.getElementById("balancePaneHost");
      balancePane = new window.Tweakpane.Pane({
        title: "Balance",
        expanded: true,
        container: host
      });
      const params = {
        projectionTransferFactorPerTick,
        resonanceGainPerTick,
        resonanceDecayPerTick,
        earthSinkInflowThreshold,
        earthSinkHardThreshold
      };
      const addPaneBinding = (key, options, onChange) => {
        const add = balancePane.addBinding?.bind(balancePane) ?? balancePane.addInput?.bind(balancePane);
        if (!add) return null;
        const input = add(params, key, options);
        input?.on?.("change", (ev) => onChange(ev.value));
        return input;
      };
      addPaneBinding("projectionTransferFactorPerTick", { min: 0.000001, max: 0.00002, step: 0.000001 }, (value) => {
        projectionTransferFactorPerTick = value;
      });
      addPaneBinding("resonanceGainPerTick", { min: 0.01, max: 0.3, step: 0.005 }, (value) => {
        resonanceGainPerTick = value;
      });
      addPaneBinding("resonanceDecayPerTick", { min: 0.005, max: 0.2, step: 0.005 }, (value) => {
        resonanceDecayPerTick = value;
      });
      addPaneBinding("earthSinkInflowThreshold", { min: 0.005, max: 0.2, step: 0.005 }, (value) => {
        earthSinkInflowThreshold = value;
      });
      addPaneBinding("earthSinkHardThreshold", { min: 0.01, max: 0.4, step: 0.01 }, (value) => {
        earthSinkHardThreshold = value;
      });
    }

    function fitNodeTitle(name) {
      const words = name.split(" ");
      const maxCharsPerLine = 10;
      const lines = [];
      let current = "";

      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length <= maxCharsPerLine) {
          current = candidate;
        } else {
          if (current) lines.push(current);
          current = word;
        }
      }
      if (current) lines.push(current);

      let fittedLines = lines;
      if (fittedLines.length > 2) {
        const first = fittedLines[0];
        const rest = fittedLines.slice(1).join(" ");
        const second = rest.length > maxCharsPerLine ? `${rest.slice(0, maxCharsPerLine - 1)}…` : rest;
        fittedLines = [first, second];
      }

      const text = fittedLines.join("\n");
      const fontSize = fittedLines.length === 1
        ? Math.max(9, Math.min(12, 130 / Math.max(name.length, 6)))
        : 9;
      const yOffset = fittedLines.length === 1 ? -7 : -10;

      return { text, fontSize, yOffset };
    }

    async function setupPixi() {
      const pixiWrap = document.getElementById("pixiWrap");
      app = new PIXI.Application();
      await app.init({
        resizeTo: pixiWrap,
        resolution: Math.max(1, window.devicePixelRatio || 1),
        autoDensity: true,
        backgroundAlpha: 0,
        antialias: true
      });
      pixiWrap.appendChild(app.canvas);
      const viewportCtor = window.pixi_viewport?.Viewport;
      if (viewportCtor) {
        usingViewport = true;
        world = new viewportCtor({
          screenWidth: app.screen.width,
          screenHeight: app.screen.height,
          worldWidth: 4000,
          worldHeight: 4000,
          events: app.renderer.events
        });
        world.drag({ mouseButtons: "left" }).wheel().decelerate();
      } else {
        usingViewport = false;
        world = new PIXI.Container();
      }
      edgeLayer = new PIXI.Container();
      nodeLayer = new PIXI.Container();
      particleLayer = new PIXI.Container();
      symbolLayer = new PIXI.Container();
      symbolLayer.visible = false;
      world.addChild(symbolLayer);
      world.addChild(edgeLayer, particleLayer, nodeLayer);
      app.stage.addChild(world);

      try {
        const texture = await PIXI.Assets.load(CHAKRA_SYMBOL_URL);
        if (texture?.source) {
          texture.source.scaleMode = "linear";
          texture.source.mipmap = "on";
          texture.source.update();
        }
        symbolSprite = new PIXI.Sprite(texture);
        symbolSprite.anchor.set(0);
        symbolSprite.alpha = 0.94;
        symbolSprite.eventMode = "none";
        symbolLayer.addChild(symbolSprite);
      } catch {
        symbolSprite = makeText("Body Map", 28, 0xe8f6ed);
        symbolSprite.anchor.set(0);
        symbolLayer.addChild(symbolSprite);
      }
      tier2MarkerLayer = new PIXI.Container();
      symbolLayer.addChild(tier2MarkerLayer);
      for (const tier2 of TIER2_NODES) {
        createTier2MarkerVisual(tier2);
      }

      for (const edge of edges) {
        createEdgeVisual(edge);
      }
      projectionHoverGraphic = new PIXI.Graphics();
      edgeLayer.addChild(projectionHoverGraphic);

      for (const node of nodeData) {
        createNodeVisual(node);
      }

      app.stage.eventMode = "static";
      app.stage.hitArea = app.screen;
      if (!usingViewport) {
        app.stage.on("pointerdown", startPan);
        app.stage.on("pointermove", onPanMove);
        app.stage.on("pointerup", stopPan);
        app.stage.on("pointerupoutside", stopPan);
      }
      app.stage.on("pointertap", (event) => {
        if (event.target !== app.stage && event.target !== world) return;
        if (draggedDistance > 6) return;
        if (selectedNodeId < 0) return;
        selectedNodeId = -1;
        hideFlowPopup();
        statusEl.textContent = "Node deselected.";
        redrawNetwork();
      });
      app.renderer.on("resize", () => {
        app.stage.hitArea = app.screen;
        if (usingViewport && world.resize) {
          world.resize(app.screen.width, app.screen.height, 4000, 4000);
        }
        layoutSymbolSprite();
        updateFlowPopupPosition();
      });

      if (!usingViewport) {
        app.canvas.addEventListener("wheel", onWheelZoom, { passive: false });
      }

      app.ticker.add((ticker) => {
        animateParticles(ticker.deltaTime);
        updateZoomHud();
        if (symbolModeEnabled) {
          refreshTier2MarkerVisuals();
        }
        if (usingViewport) {
          updateSymbolMode();
          clampWorldToBodyBounds();
          updateFlowPopupPosition();
        }
      });

      initBalancePane();
      layoutSymbolSprite();
      updateSymbolMode();
      updateZoomHud();
      redrawNetwork();
    }

    function layoutSymbolSprite() {
      if (!symbolSprite || !app) return;
      symbolSprite.position.set(0, 0);
      if (symbolSprite.texture && symbolSprite.texture.width > 0) {
        const textureWidth = symbolSprite.texture.width;
        const textureHeight = symbolSprite.texture.height;
        const aspectRatio = textureHeight / textureWidth;
        bodyMapWidth = BODY_WORLD_BASE_WIDTH;
        bodyMapHeight = BODY_WORLD_BASE_WIDTH * aspectRatio;
        const uniformScale = bodyMapWidth / textureWidth;
        symbolSprite.scale.set(uniformScale);
      } else {
        bodyMapWidth = BODY_WORLD_BASE_WIDTH;
        bodyMapHeight = 1900;
      }
    }

    function viewportCenterWorldPoint() {
      const centerX = (app.screen.width * 0.5 - world.x) / world.scale.x;
      const centerY = (app.screen.height * 0.5 - world.y) / world.scale.y;
      return { x: centerX, y: centerY };
    }

    function saveCurrentViewState(targetState) {
      if (!world || !targetState) return;
      targetState.initialized = true;
      targetState.scale = world.scale.x;
      targetState.x = world.x;
      targetState.y = world.y;
    }

    function applyViewState(viewState) {
      if (!world || !viewState || !viewState.initialized) return false;
      const nextScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewState.scale));
      world.scale.set(nextScale);
      world.x = viewState.x;
      world.y = viewState.y;
      return true;
    }

    function nearestTier2NodeFromWorldPoint(point) {
      let best = null;
      let bestDist = Infinity;
      for (const tier2 of TIER2_NODES) {
        const dx = point.x - tier2.x;
        const dy = point.y - tier2.y;
        const d = Math.hypot(dx, dy);
        if (d < bestDist) {
          bestDist = d;
          best = tier2;
        }
      }
      return best;
    }

    function focusWorldOnPoint(worldX, worldY) {
      world.x = Math.round(app.screen.width * 0.5 - worldX * world.scale.x);
      world.y = Math.round(app.screen.height * 0.5 - worldY * world.scale.y);
    }

    function focusBodyModeOnTier2(tier2Id) {
      const target = TIER2_NODES.find((node) => node.id === tier2Id) ?? TIER2_NODES[0];
      if (!target) return;
      activeTier2NodeId = target.id;
      focusWorldOnPoint(target.x, target.y);
      clampWorldToBodyBounds();
    }

    function animateViewTransition(onMiddle) {
      if (!pixiWrapEl || !window.gsap) {
        onMiddle();
        return;
      }
      const tl = window.gsap.timeline();
      tl.to(pixiWrapEl, {
        duration: 0.18,
        autoAlpha: 0.5,
        scale: 0.986,
        ease: "power2.inOut"
      }).add(() => {
        onMiddle();
      }).to(pixiWrapEl, {
        duration: 0.26,
        autoAlpha: 1,
        scale: 1,
        ease: "power2.out"
      });
    }

    function applySymbolModeState(shouldEnable, wasSymbolMode, nearestTier2) {
      if (shouldEnable && !wasSymbolMode) {
        saveCurrentViewState(tier1ViewState);
        tier2Tier1Snapshots.set(activeTier1OwnerTier2Id, captureCurrentTier1Snapshot());
      }
      symbolModeEnabled = shouldEnable;
      symbolLayer.visible = symbolModeEnabled;
      edgeLayer.visible = !symbolModeEnabled;
      nodeLayer.visible = !symbolModeEnabled;
      particleLayer.visible = !symbolModeEnabled;
      if (tier2MarkerLayer) {
        tier2MarkerLayer.visible = symbolModeEnabled;
      }
      resetBodyViewEl.disabled = !symbolModeEnabled;
      if (symbolModeEnabled) {
        if (wasSymbolMode && nearestTier2) {
          activeTier2NodeId = nearestTier2.id;
        }
        const restoredTier2 = applyViewState(tier2ViewState);
        if (!restoredTier2) {
          world.scale.set(BODY_MODE_DEFAULT_SCALE);
          focusBodyModeOnTier2(activeTier2NodeId);
        } else {
          activeTier2NodeId = tier2ViewState.focusTier2Id ?? activeTier2NodeId;
          clampWorldToBodyBounds();
        }
        statusEl.textContent = "Tier 2 body map view. Zoom in very close on a character to enter its node schema.";
        hideFlowPopup();
        hideMarkerTooltip();
      } else {
        saveCurrentViewState(tier2ViewState);
        tier2ViewState.focusTier2Id = activeTier2NodeId;
        if (nearestTier2) {
          activeTier2NodeId = nearestTier2.id;
          statusEl.textContent = `Entered Tier 1 schema for closest character: ${nearestTier2.name}.`;
        }
        activeTier1OwnerTier2Id = activeTier2NodeId;
        applyTier1Snapshot(getOrCreateTier2Snapshot(activeTier1OwnerTier2Id));
        world.scale.set(1);
        const centerPoint = viewportCenterWorldPoint();
        const nearestNode = nearestTier1NodeFromWorldPoint(centerPoint);
        if (nearestNode) {
          focusTier1OnNode(nearestNode.id);
          updateFlowPopupPosition();
          updateZoomHud();
        } else {
          recenterTier1Only();
        }
      }
      lastZoomScale = world.scale.x;
    }

    function enterTier1ForActiveTier2() {
      if (!symbolModeEnabled || isViewTransitioning) return;
      isViewTransitioning = true;
      saveCurrentViewState(tier2ViewState);
      tier2ViewState.focusTier2Id = activeTier2NodeId;
      activeTier1OwnerTier2Id = activeTier2NodeId;
      animateViewTransition(() => {
        symbolModeEnabled = false;
        symbolLayer.visible = false;
        edgeLayer.visible = true;
        nodeLayer.visible = true;
        particleLayer.visible = true;
        resetBodyViewEl.disabled = true;
        applyTier1Snapshot(getOrCreateTier2Snapshot(activeTier1OwnerTier2Id));
        world.scale.set(1);
        const centerPoint = viewportCenterWorldPoint();
        const nearestNode = nearestTier1NodeFromWorldPoint(centerPoint);
        if (nearestNode) {
          focusTier1OnNode(nearestNode.id);
        } else {
          recenterTier1Only();
        }
        const tier2 = TIER2_NODES.find((node) => node.id === activeTier2NodeId);
        if (tier2) {
          statusEl.textContent = `Entered Tier 1 schema for ${tier2.name}.`;
        }
        redrawNetwork();
        updateFlowPopupPosition();
        updateZoomHud();
        lastZoomScale = world.scale.x;
        isViewTransitioning = false;
        if (viewTransitionQueued) {
          viewTransitionQueued = false;
          updateSymbolMode();
        }
      });
    }

    function clampWorldToBodyBounds() {
      if (!symbolModeEnabled || !app || !world) return;
      const scale = world.scale.x;
      const contentWidth = bodyMapWidth * scale;
      const contentHeight = bodyMapHeight * scale;

      if (contentWidth <= app.screen.width) {
        world.x = Math.round((app.screen.width - contentWidth) * 0.5);
      } else {
        const minX = app.screen.width - contentWidth;
        world.x = Math.round(Math.min(0, Math.max(minX, world.x)));
      }

      if (contentHeight <= app.screen.height) {
        world.y = Math.round((app.screen.height - contentHeight) * 0.5);
      } else {
        const minY = app.screen.height - contentHeight;
        world.y = Math.round(Math.min(0, Math.max(minY, world.y)));
      }
    }

    function resetBodyView() {
      if (!world) return;
      world.scale.set(BODY_MODE_DEFAULT_SCALE);
      updateSymbolMode();
      if (symbolModeEnabled) {
        focusBodyModeOnTier2(BODY_MODE_FOCUS_TIER2_ID);
        saveCurrentViewState(tier2ViewState);
        tier2ViewState.focusTier2Id = BODY_MODE_FOCUS_TIER2_ID;
        statusEl.textContent = "Body map reset to default focus.";
      } else {
        recenterView();
      }
      updateFlowPopupPosition();
    }

    function updateSymbolMode() {
      if (!world || !symbolLayer) return;
      if (isViewTransitioning) {
        viewTransitionQueued = true;
        return;
      }
      const wasSymbolMode = symbolModeEnabled;
      const enterThreshold = Math.max(MIN_ZOOM, SYMBOL_MODE_ENTER_ZOOM_THRESHOLD);
      const exitThreshold = Math.max(MIN_ZOOM, SYMBOL_MODE_EXIT_ZOOM_THRESHOLD);
      const currentScale = world.scale.x;
      const center = viewportCenterWorldPoint();
      const nearestTier2 = nearestTier2NodeFromWorldPoint(center);
      const zoomingIn = currentScale > lastZoomScale;
      const zoomingOut = currentScale < lastZoomScale;
      let shouldEnable = symbolModeEnabled;

      // Directional switching:
      // - T2 -> T1 only while zooming in and crossing the enter threshold.
      // - T1 -> T2 only while zooming out and crossing the exit threshold.
      if (wasSymbolMode && zoomingIn && currentScale >= enterThreshold) {
        shouldEnable = false;
      } else if (!wasSymbolMode && zoomingOut && currentScale <= exitThreshold) {
        shouldEnable = true;
      }
      if (wasSymbolMode && nearestTier2) {
        activeTier2NodeId = nearestTier2.id;
      }
      if (shouldEnable === wasSymbolMode) {
        lastZoomScale = currentScale;
        return;
      }
      isViewTransitioning = true;
      animateViewTransition(() => {
        applySymbolModeState(shouldEnable, wasSymbolMode, nearestTier2);
        isViewTransitioning = false;
        if (viewTransitionQueued) {
          viewTransitionQueued = false;
          updateSymbolMode();
        }
      });
    }

    function outgoingEdges(nodeId) {
      return edges.filter((edge) => edge.from === nodeId);
    }

    function edgeBetween(from, to) {
      return edges.find((edge) => edge.from === from && edge.to === to);
    }

    function allowedProjectionTargets(fromNodeId) {
      return projectionLinks
        .filter((link) => link.from === fromNodeId)
        .map((link) => link.to);
    }

    function hasDirectEdge(from, to) {
      return edges.some((edge) => edge.from === from && edge.to === to);
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

    function hideFlowPopup() {
      flowPopupEl.classList.add("hidden");
      flowPopupEl.innerHTML = "";
      hideMarkerTooltip();
      hoveredTargetNodeId = null;
      hoveredEdgeKey = null;
      hoveredProjection = null;
      redrawNetwork();
    }

    function createEdgeVisual(edge) {
      const line = new PIXI.Graphics();
      const arrow = new PIXI.Graphics();
      const label = makeText("0%", 12, 0xdff7ea);
      label.anchor.set(0.5);
      edgeLayer.addChild(line, arrow, label);
      edgeVisuals[edge.key] = { line, arrow, label };
    }

    function deleteEdgeVisual(edgeKey) {
      const visual = edgeVisuals[edgeKey];
      if (!visual) return;
      visual.line.destroy();
      visual.arrow.destroy();
      visual.label.destroy();
      delete edgeVisuals[edgeKey];
    }

    function updateFlowPopupPosition() {
      if (flowPopupEl.classList.contains("hidden")) return;
      if (!visibleNodeIds.has(selectedNodeId)) {
        hideFlowPopup();
        return;
      }
      const nodePos = nodePositions[selectedNodeId];
      if (!nodePos) return;

      const panelWidth = flowPopupEl.offsetWidth || 210;
      const panelHeight = flowPopupEl.offsetHeight || 140;
      const padding = 8;
      const anchorX = nodePos.x + world.x;
      const anchorY = nodePos.y + world.y;
      const isAnchorVisible =
        anchorX >= 0 && anchorX <= app.screen.width &&
        anchorY >= 0 && anchorY <= app.screen.height;

      if (!isAnchorVisible) {
        flowPopupEl.style.left = `${lastPopupLeft}px`;
        flowPopupEl.style.top = `${lastPopupTop}px`;
        return;
      }

      const nodeRadius = 52;
      const sideGap = nodeRadius + 14;
      const verticalGap = nodeRadius + 10;

      // Candidate placements in order of preference.
      const candidates = [
        { left: anchorX + sideGap, top: anchorY - panelHeight / 2 }, // right
        { left: anchorX - panelWidth - sideGap, top: anchorY - panelHeight / 2 }, // left
        { left: anchorX - panelWidth / 2, top: anchorY - panelHeight - verticalGap }, // above
        { left: anchorX - panelWidth / 2, top: anchorY + verticalGap } // below
      ];

      function clampPosition(pos) {
        return {
          left: Math.max(padding, Math.min(pos.left, app.screen.width - panelWidth - padding)),
          top: Math.max(padding, Math.min(pos.top, app.screen.height - panelHeight - padding))
        };
      }

      function overlapsNode(pos) {
        const nodeLeft = anchorX - nodeRadius;
        const nodeRight = anchorX + nodeRadius;
        const nodeTop = anchorY - nodeRadius;
        const nodeBottom = anchorY + nodeRadius;
        const popupLeft = pos.left;
        const popupRight = pos.left + panelWidth;
        const popupTop = pos.top;
        const popupBottom = pos.top + panelHeight;
        return !(popupRight < nodeLeft || popupLeft > nodeRight || popupBottom < nodeTop || popupTop > nodeBottom);
      }

      let chosen = null;
      for (const candidate of candidates) {
        const clamped = clampPosition(candidate);
        if (!overlapsNode(clamped)) {
          chosen = clamped;
          break;
        }
      }
      if (!chosen) {
        // Fallback with strongest side bias.
        chosen = clampPosition({ left: anchorX + sideGap, top: anchorY - panelHeight / 2 });
      }

      const left = chosen.left;
      const top = chosen.top;
      lastPopupLeft = Math.round(left);
      lastPopupTop = Math.round(top);
      flowPopupEl.style.left = `${lastPopupLeft}px`;
      flowPopupEl.style.top = `${lastPopupTop}px`;
    }

    function renderFlowPopup(nodeId) {
      const node = nodeById(nodeId);
      const outgoing = outgoingEdges(nodeId);
      if (!node) {
        hideFlowPopup();
        return;
      }

      flowPopupEl.innerHTML = "";
      const title = document.createElement("div");
      title.className = "flow-popup-title";
      title.textContent = node.name;
      flowPopupEl.appendChild(title);

      const attr = getAttributeState();
      const rates = computeNodeRates(attr);
      const nodeRate = rates[nodeId] ?? { in: 0, out: 0, net: 0 };
      const etaSec =
        node.unlocked
          ? 0
          : ((node.unlockCost - node.si) > 0 && nodeRate.net > 0
            ? (node.unlockCost - node.si) / nodeRate.net / TICKS_PER_SECOND
            : Infinity);
      const overviewBlock = document.createElement("div");
      overviewBlock.className = "popup-block popup-overview";
      const attrInfo = getCultivationAttributeInfo(node.attributeType);
      overviewBlock.innerHTML = `
        <div class="popup-block-title">Overview</div>
        <div class="popup-keyvals">
          <div data-tooltip="${attrInfo.description}"><span>Path</span><br>${attrInfo.name} T${node.attributeTier ?? "-"}</div>
          <div><span>Status</span><br>${node.unlocked ? "Unlocked" : "Locked"}</div>
          <div><span>In</span><br>${fmt(nodeRate.in * TICKS_PER_SECOND)} SI/s</div>
          <div><span>Out</span><br>${fmt(nodeRate.out * TICKS_PER_SECOND)} SI/s</div>
          <div><span>Net</span><br>${fmt(nodeRate.net * TICKS_PER_SECOND)} SI/s</div>
          <div><span>ETA</span><br>${node.unlocked ? "Unlocked" : formatDuration(etaSec)}</div>
        </div>
      `;
      flowPopupEl.appendChild(overviewBlock);
      attachDomTooltips(overviewBlock);

      const bonusBlock = document.createElement("div");
      bonusBlock.className = "popup-block";
      bonusBlock.innerHTML = `
        <div class="popup-block-title">Bonuses</div>
        <div class="flow-label">${formatNodeBonuses(node)}</div>
      `;
      flowPopupEl.appendChild(bonusBlock);

      if (!node.unlocked) {
        const lockedInfo = document.createElement("div");
        lockedInfo.className = "flow-label popup-block";
        lockedInfo.textContent = "Node is locked. Flow and projection controls unlock after breakthrough.";
        flowPopupEl.appendChild(lockedInfo);
      } else {
        const flowControlsTitle = document.createElement("div");
        flowControlsTitle.className = "popup-block-title";
        flowControlsTitle.textContent = "Flow Controls";
        flowPopupEl.appendChild(flowControlsTitle);

        for (const edge of outgoing) {
          const toNode = nodeById(edge.to);
          const row = document.createElement("div");
          row.className = "flow-row popup-block";

          const label = document.createElement("div");
          label.className = "flow-label";
          label.textContent = `To ${toNode ? toNode.name : `Node ${edge.to}`}`;

          const sliderLine = document.createElement("div");
          sliderLine.className = "flow-slider-line";
          const slider = document.createElement("input");
          slider.type = "range";
          slider.min = "0";
          slider.max = "100";
          slider.value = String(edge.flow);

          const value = document.createElement("span");
          value.textContent = `${edge.flow}%`;

          slider.addEventListener("input", (event) => {
            edge.flow = Number(event.target.value);
            value.textContent = `${edge.flow}%`;
            statusEl.textContent = `${node.name} -> ${toNode ? toNode.name : edge.to}: ${edge.flow}%`;
            redrawNetwork();
          });
          row.addEventListener("mouseenter", () => {
            hoveredEdgeKey = edge.key;
            hoveredTargetNodeId = edge.to;
            hoveredProjection = null;
            redrawNetwork();
          });
          row.addEventListener("mouseleave", () => {
            hoveredEdgeKey = null;
            hoveredTargetNodeId = null;
            redrawNetwork();
          });

          sliderLine.append(slider, value);
          row.append(label, sliderLine);
          flowPopupEl.appendChild(row);
        }

        if (node.canProject) {
          const projectionTitle = document.createElement("div");
          projectionTitle.className = "projection-title popup-block-title";
          projectionTitle.textContent = "Qi Projection Bridge";
          flowPopupEl.appendChild(projectionTitle);

          const projectionList = document.createElement("div");
          projectionList.className = "projection-list popup-block";
          const targets = candidateProjectionTargets(nodeId);
          if (targets.length === 0) {
            const none = document.createElement("div");
            none.className = "flow-label";
            none.textContent = "No valid projection targets.";
            projectionList.appendChild(none);
          } else {
            for (const target of targets) {
              const btn = document.createElement("button");
              btn.className = "projection-btn";
              btn.textContent = `Project to ${target.name}`;
              btn.addEventListener("click", () => {
                activateProjection(nodeId, target.id);
                statusEl.textContent = `${node.name} projecting to ${target.name} for 6.0s.`;
                renderFlowPopup(nodeId);
              });
              btn.addEventListener("mouseenter", () => {
                hoveredEdgeKey = null;
                hoveredTargetNodeId = target.id;
                hoveredProjection = { from: nodeId, to: target.id };
                redrawNetwork();
              });
              btn.addEventListener("mouseleave", () => {
                hoveredTargetNodeId = null;
                hoveredProjection = null;
                redrawNetwork();
              });
              projectionList.appendChild(btn);
            }
          }
          flowPopupEl.appendChild(projectionList);
        }

        const outgoingTotalFlow = outgoing.reduce((sum, edge) => sum + edge.flow, 0);
        const activeCount = activeProjections.filter((projection) => projection.from === nodeId).length;
        const projectionInfo = document.createElement("div");
        projectionInfo.className = "projection-active popup-block";
        projectionInfo.textContent = `Outflow ${outgoingTotalFlow}% | Active bridges: ${activeCount}`;
        flowPopupEl.appendChild(projectionInfo);
      }

      if (developerMode) {
        const devTitle = document.createElement("div");
        devTitle.className = "dev-title";
        devTitle.textContent = "Developer: Connections";
        flowPopupEl.appendChild(devTitle);

        const devList = document.createElement("div");
        devList.className = "dev-list";
        for (const target of nodeData) {
          if (target.id === nodeId) continue;
          const row = document.createElement("div");
          row.className = "dev-row";
          const label = document.createElement("div");
          label.className = "flow-label";
          label.textContent = target.name;
          const exists = Boolean(edgeBetween(nodeId, target.id));
          const btn = document.createElement("button");
          btn.className = "dev-btn";
          btn.textContent = exists ? "Disconnect" : "Connect";
          btn.addEventListener("click", () => {
            toggleConnection(nodeId, target.id);
            renderFlowPopup(nodeId);
            redrawNetwork();
          });
          row.append(label, btn);
          devList.appendChild(row);
        }
        flowPopupEl.appendChild(devList);

        const bridgeTitle = document.createElement("div");
        bridgeTitle.className = "dev-title";
        bridgeTitle.textContent = "Developer: Projection Bridges";
        flowPopupEl.appendChild(bridgeTitle);

        const bridgeList = document.createElement("div");
        bridgeList.className = "dev-list";
        for (const target of nodeData) {
          if (target.id === nodeId) continue;
          const row = document.createElement("div");
          row.className = "dev-row";
          const label = document.createElement("div");
          label.className = "flow-label";
          label.textContent = target.name;
          const exists = projectionLinks.some((link) => link.from === nodeId && link.to === target.id);
          const btn = document.createElement("button");
          btn.className = "dev-btn";
          btn.textContent = exists ? "Unbridge" : "Bridge";
          btn.addEventListener("click", () => {
            toggleProjectionBridge(nodeId, target.id);
            renderFlowPopup(nodeId);
            redrawNetwork();
          });
          row.append(label, btn);
          bridgeList.appendChild(row);
        }
        flowPopupEl.appendChild(bridgeList);
      }

      flowPopupEl.classList.remove("hidden");
      updateFlowPopupPosition();
    }

    function startPan(event) {
      if (draggingNodeId !== null) return;
      isPanning = true;
      draggedDistance = 0;
      const local = event.getLocalPosition(app.stage);
      panStartX = local.x;
      panStartY = local.y;
      worldStartX = world.x;
      worldStartY = world.y;
    }

    function onPanMove(event) {
      if (draggingTier2NodeId !== null) {
        const localWorld = event.getLocalPosition(world);
        const tier2 = TIER2_NODES.find((node) => node.id === draggingTier2NodeId);
        if (!tier2) return;
        const nextX = localWorld.x - dragTier2OffsetX;
        const nextY = localWorld.y - dragTier2OffsetY;
        tier2DraggedDistance = Math.max(
          tier2DraggedDistance,
          Math.hypot(nextX - tier2.x, nextY - tier2.y)
        );
        tier2.x = Math.round(nextX);
        tier2.y = Math.round(nextY);
        setTier2VisualPosition(draggingTier2NodeId);
        updateZoomHud();
        return;
      }
      if (draggingNodeId !== null) {
        const localWorld = event.getLocalPosition(world);
        nodePositions[draggingNodeId].x = localWorld.x - dragNodeOffsetX;
        nodePositions[draggingNodeId].y = localWorld.y - dragNodeOffsetY;
        redrawNetwork();
        updateFlowPopupPosition();
        return;
      }
      if (!isPanning) return;
      const local = event.getLocalPosition(app.stage);
      const dx = local.x - panStartX;
      const dy = local.y - panStartY;
      draggedDistance = Math.max(draggedDistance, Math.hypot(dx, dy));
      world.x = Math.round(worldStartX + dx);
      world.y = Math.round(worldStartY + dy);
      clampWorldToBodyBounds();
      updateFlowPopupPosition();
    }

    function stopPan() {
      isPanning = false;
      draggingNodeId = null;
      draggingTier2NodeId = null;
    }

    function tryStartNodeDrag(nodeId, event) {
      if (!developerMode || symbolModeEnabled) return;
      draggingNodeId = nodeId;
      draggedDistance = 0;
      const local = event.getLocalPosition(world);
      dragNodeOffsetX = local.x - nodePositions[nodeId].x;
      dragNodeOffsetY = local.y - nodePositions[nodeId].y;
    }

    function toggleConnection(fromNodeId, toNodeId) {
      const idx = edges.findIndex((edge) => edge.from === fromNodeId && edge.to === toNodeId);
      if (idx >= 0) {
        const [removed] = edges.splice(idx, 1);
        deleteEdgeVisual(removed.key);
        for (let i = particles.length - 1; i >= 0; i -= 1) {
          if (particles[i].edgeKey === removed.key) {
            particles[i].sprite.destroy();
            particles.splice(i, 1);
          }
        }
        return;
      }
      const edge = {
        from: fromNodeId,
        to: toNodeId,
        flow: 0,
        key: `dev_${fromNodeId}_${toNodeId}_${edgeKeyCounter}`
      };
      edgeKeyCounter += 1;
      edges.push(edge);
      createEdgeVisual(edge);
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

    function buildNodesJsContent() {
      const nodesOut = nodeData.map((node) => ({ ...node }));
      const positionsOut = Object.fromEntries(
        Object.entries(nodePositions).map(([id, pos]) => [id, { x: Math.round(pos.x), y: Math.round(pos.y) }])
      );
      const edgesOut = edges.map(({ from, to, flow }) => ({ from, to, flow }));
      const projectionOut = projectionLinks.map((link) => ({ ...link }));
      return `window.NODE_DEFINITIONS = ${JSON.stringify(nodesOut, null, 2)};

window.INITIAL_NODE_POSITIONS = ${JSON.stringify(positionsOut, null, 2)};

window.NODE_EDGES = ${JSON.stringify(edgesOut, null, 2)};

window.PROJECTION_LINKS = ${JSON.stringify(projectionOut, null, 2)};
`;
    }

    async function exportShapeConfig() {
      const nodesJsContent = buildNodesJsContent();
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: "nodes.js",
            types: [
              {
                description: "JavaScript Files",
                accept: { "text/javascript": [".js"] }
              }
            ]
          });
          const writable = await handle.createWritable();
          await writable.write(nodesJsContent);
          await writable.close();
          statusEl.textContent = "Saved and replaced nodes.js";
          return;
        } catch (error) {
          statusEl.textContent = "Save cancelled. Falling back to download.";
        }
      }

      const blob = new Blob([nodesJsContent], { type: "text/javascript" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "nodes.js";
      a.click();
      URL.revokeObjectURL(url);
      statusEl.textContent = "Downloaded nodes.js (replace project file manually if needed).";
    }

    function buildT2LayoutJsContent() {
      const layout = TIER2_NODES.map((node) => ({
        id: node.id,
        name: node.name,
        x: Math.round(node.x),
        y: Math.round(node.y),
        radius: Math.round(node.radius ?? 16)
      }));
      return `window.TIER2_LAYOUT_OVERRIDE = ${JSON.stringify(layout, null, 2)};
`;
    }

    function addT2NodeInView() {
      if (!developerMode) {
        statusEl.textContent = "Enable Developer Mode first.";
        return;
      }
      if (!symbolModeEnabled) {
        statusEl.textContent = "Switch to T2 view to add T2 nodes.";
        return;
      }
      const name = window.prompt("New T2 node name:", "New T2 Node");
      if (!name) return;
      const id = window.prompt("New T2 node id (unique, no spaces):", name.toLowerCase().replace(/\s+/g, "_"));
      if (!id) return;
      if (TIER2_NODES.some((node) => node.id === id)) {
        statusEl.textContent = `T2 id "${id}" already exists.`;
        return;
      }
      const center = viewportCenterWorldPoint();
      const tier2 = {
        id,
        name: name.trim(),
        x: Math.round(center.x),
        y: Math.round(center.y),
        radius: 18
      };
      TIER2_NODES.push(tier2);
      createTier2MarkerVisual(tier2);
      statusEl.textContent = `Added T2 node "${tier2.name}" at view center.`;
      updateZoomHud();
    }

    async function exportT2LayoutConfig() {
      if (!developerMode) {
        statusEl.textContent = "Enable Developer Mode first.";
        return;
      }
      const content = buildT2LayoutJsContent();
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: "t2-layout.js",
            types: [
              {
                description: "JavaScript Files",
                accept: { "text/javascript": [".js"] }
              }
            ]
          });
          const writable = await handle.createWritable();
          await writable.write(content);
          await writable.close();
          statusEl.textContent = "Saved T2 layout override.";
          return;
        } catch {
          statusEl.textContent = "Save cancelled. Falling back to download.";
        }
      }
      const blob = new Blob([content], { type: "text/javascript" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "t2-layout.js";
      a.click();
      URL.revokeObjectURL(url);
      statusEl.textContent = "Downloaded t2-layout.js (include it before app.js to apply).";
    }

    function getNextNodeId() {
      return nodeData.reduce((maxId, node) => Math.max(maxId, node.id), -1) + 1;
    }

    function addNodeInView(name) {
      const nextId = getNextNodeId();
      const centerWorldX = (app.screen.width / 2 - world.x) / world.scale.x;
      const centerWorldY = (app.screen.height / 2 - world.y) / world.scale.y;
      const node = {
        id: nextId,
        name,
        unlocked: false,
        si: 0,
        unlockCost: 100,
        canProject: false
      };
      nodeData.push(node);
      nodePositions[nextId] = { x: centerWorldX, y: centerWorldY };
      createNodeVisual(node);
      selectNode(nextId);
      redrawNetwork();
      statusEl.textContent = `Added node "${name}" (id ${nextId}).`;
    }

    function openNodeEditor() {
      if (!developerMode) {
        statusEl.textContent = "Enable Developer Mode first.";
        return;
      }

      const action = window.prompt('Developer Nodes: type "add" or "rename"', "add");
      if (!action) return;
      const normalized = action.trim().toLowerCase();

      if (normalized === "add") {
        const name = window.prompt("New node name:", "New Meridian");
        if (!name) return;
        addNodeInView(name.trim());
        return;
      }

      if (normalized === "rename") {
        const selected = nodeById(selectedNodeId);
        if (!selected) {
          statusEl.textContent = "Select a node first to rename it.";
          return;
        }
        const name = window.prompt("Rename selected node:", selected.name);
        if (!name) return;
        selected.name = name.trim();
        redrawNetwork();
        if (!flowPopupEl.classList.contains("hidden")) {
          renderFlowPopup(selectedNodeId);
        }
        statusEl.textContent = `Renamed node to "${selected.name}".`;
        return;
      }

      statusEl.textContent = 'Unknown action. Use "add" or "rename".';
    }

    function onWheelZoom(event) {
      event.preventDefault();
      const rect = app.canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      const currentScale = world.scale.x;
      const scaleFactor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      const nextScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, currentScale * scaleFactor));
      if (nextScale === currentScale) return;

      const worldXUnderMouse = (mouseX - world.x) / currentScale;
      const worldYUnderMouse = (mouseY - world.y) / currentScale;
      world.scale.set(nextScale);
      world.x = mouseX - worldXUnderMouse * nextScale;
      world.y = mouseY - worldYUnderMouse * nextScale;
      updateSymbolMode();
      clampWorldToBodyBounds();
      updateFlowPopupPosition();
      updateZoomHud();
    }

    function recenterView() {
      const corePos = nodePositions[0];
      if (!corePos) return;
      world.x = Math.round(app.screen.width / 2 - corePos.x * world.scale.x);
      world.y = Math.round(app.screen.height / 2 - corePos.y * world.scale.y);
      clampWorldToBodyBounds();
      updateSymbolMode();
      updateFlowPopupPosition();
      updateZoomHud();
    }

    function recenterTier1Only() {
      const corePos = nodePositions[0];
      if (!corePos) return;
      world.x = Math.round(app.screen.width / 2 - corePos.x * world.scale.x);
      world.y = Math.round(app.screen.height / 2 - corePos.y * world.scale.y);
      updateFlowPopupPosition();
      updateZoomHud();
    }

    function selectNode(nodeId) {
      if (draggingNodeId !== null) return;
      if (symbolModeEnabled) return;
      if (draggedDistance > 6) return;
      if (!visibleNodeIds.has(nodeId)) return;
      const isSameNode = selectedNodeId === nodeId;
      const popupVisible = !flowPopupEl.classList.contains("hidden");
      if (isSameNode && popupVisible) {
        selectedNodeId = -1;
        hideFlowPopup();
        statusEl.textContent = "Node deselected.";
        redrawNetwork();
        return;
      }

      selectedNodeId = nodeId;
      const outgoing = outgoingEdges(nodeId);
      const node = nodeById(nodeId);
      const projectionNote = node.canProject ? "or project Qi bridge." : "projection locked.";
      statusEl.textContent = `${node.name} selected. Adjust ${outgoing.length} route(s), ${projectionNote}`;
      renderFlowPopup(nodeId);
      redrawNetwork();
    }

    function redrawEdge(edge) {
      if (!visibleNodeIds.has(edge.from) || !visibleNodeIds.has(edge.to)) {
        const visual = edgeVisuals[edge.key];
        if (visual) {
          visual.line.clear();
          visual.arrow.clear();
          visual.label.text = "";
        }
        return;
      }
      const visual = edgeVisuals[edge.key];
      const start = nodePositions[edge.from];
      const end = nodePositions[edge.to];
      const color = getFlowColor(edge.flow);
      const width = 2 + edge.flow * 0.09;
      const alpha = edge.flow <= 0 ? 0.35 : 1;
      const hovered = hoveredEdgeKey === edge.key;
      const drawColor = hovered ? 0xf6d78f : color;
      const drawWidth = hovered ? width + 2.5 : width;

      visual.line.clear();
      visual.line.moveTo(start.x, start.y);
      visual.line.lineTo(end.x, end.y);
      visual.line.stroke({ width: drawWidth, color: drawColor, alpha, cap: "round" });

      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const arrowSize = 9 + edge.flow * 0.03;
      const arrowX = start.x + (end.x - start.x) * 0.72;
      const arrowY = start.y + (end.y - start.y) * 0.72;
      visual.arrow.clear();
      visual.arrow.moveTo(arrowX, arrowY);
      visual.arrow.lineTo(
        arrowX - Math.cos(angle - 0.45) * arrowSize,
        arrowY - Math.sin(angle - 0.45) * arrowSize
      );
      visual.arrow.lineTo(
        arrowX - Math.cos(angle + 0.45) * arrowSize,
        arrowY - Math.sin(angle + 0.45) * arrowSize
      );
      visual.arrow.closePath();
      visual.arrow.fill({ color: drawColor, alpha: Math.max(0.55, alpha) });

      const transferPerTick = getEdgeTransferPerTick(edge);
      const transferPerSecond = transferPerTick * TICKS_PER_SECOND;
      if (edge.flow <= 0) {
        visual.label.text = "";
      } else {
        visual.label.text = `${edge.flow}%\n${fmt(transferPerSecond)} SI/s`;
        visual.label.style.align = "center";
        visual.label.position.set((start.x + end.x) / 2, (start.y + end.y) / 2 + 22);
      }
    }

    function getEdgeTransferPerTick(edge, attr = null) {
      if (edge.flow <= 0) return 0;
      if (!isNodeAvailableForOutflow(edge.from)) return 0;
      const sourceNode = nodeById(0);
      const fromNode = nodeById(edge.from);
      if (!sourceNode || !fromNode) return 0;
      const state = attr ?? getAttributeState();
      const earthNode = nodeById(11);
      const earthPenaltyActive = earthNode?.unlocked && earthNode.si > 0 && state.fortitude < 0.7;
      const earthPenalty = earthPenaltyActive ? (earthNode.bonuses?.earthSinkPenalty ?? 0) : 0;
      const transferMultiplier = Math.max(
        0.5,
        1 + state.flowEfficiency + state.harmonyPower * 0.2 - earthPenalty
      );
      const rawTransfer =
        sourceNode.si * FLOW_TRANSFER_FACTOR_PER_TICK * (edge.flow / 100) * transferMultiplier;
      return Math.max(0, Math.min(rawTransfer, fromNode.si));
    }

    function redrawNode(node) {
      const visual = nodeVisuals[node.id];
      const isVisible = visibleNodeIds.has(node.id);
      visual.circle.visible = isVisible;
      visual.progressRing.visible = isVisible;
      visual.title.visible = isVisible;
      visual.energy.visible = isVisible;
      visual.projectorMarker.visible = isVisible;
      visual.outgoingMarker.visible = isVisible;
      visual.incomingMarker.visible = isVisible;
      visual.targetMarker.visible = isVisible;
      if (!isVisible) {
        return;
      }

      const fade = unlockFadeProgress.has(node.id)
        ? Math.min(1, unlockFadeProgress.get(node.id) / UNLOCK_FADE_TICKS)
        : 1;
      visual.circle.alpha = fade;
      visual.progressRing.alpha = fade;
      visual.title.alpha = fade;
      visual.energy.alpha = fade;
      visual.projectorMarker.alpha = fade;
      visual.outgoingMarker.alpha = fade;
      visual.incomingMarker.alpha = fade;
      visual.targetMarker.alpha = fade;

      const pos = nodePositions[node.id];
      let color = 0x567065;
      if (node.id === 0) color = 0xd6b06a;
      else if (node.unlocked) color = 0x6ecf9a;

      visual.progressRing.clear();
      if (node.id === 0) {
        visual.progressRing.circle(pos.x, pos.y, 49);
        visual.progressRing.stroke({ width: 6, color: 0xd6b06a, alpha: 0.9 });
      } else {
        const progress = Math.min(node.si / node.unlockCost, 1);
        visual.progressRing.arc(pos.x, pos.y, 49, -Math.PI / 2, 1.5 * Math.PI - 0.0001);
        visual.progressRing.stroke({ width: 6, color: 0x284137, alpha: 0.95 });
        if (progress > 0) {
          visual.progressRing.arc(
            pos.x,
            pos.y,
            49,
            -Math.PI / 2,
            -Math.PI / 2 + Math.PI * 2 * progress
          );
          visual.progressRing.stroke({
            width: 6,
            color: node.unlocked ? 0x6ecf9a : 0x8bd8b0,
            alpha: 1
          });
        }
      }

      visual.circle.clear();
      visual.circle.circle(pos.x, pos.y, 42);
      visual.circle.fill(color);
      visual.circle.stroke({
        width: node.id === selectedNodeId ? 6 : 4,
        color: node.id === selectedNodeId
          ? 0xd6c08a
          : (node.id === hoveredTargetNodeId ? 0xf6d78f : 0x1e332a)
      });

      visual.projectorMarker.visible = node.canProject;
      visual.projectorMarker.position.set(pos.x + 27, pos.y - 27);
      const hasOutgoing = edges.some((edge) => edge.from === node.id);
      visual.outgoingMarker.visible = hasOutgoing;
      visual.outgoingMarker.position.set(pos.x - 28, pos.y - 27);

      const hasIncoming = edges.some((edge) => edge.to === node.id);
      visual.incomingMarker.visible = hasIncoming;
      visual.incomingMarker.position.set(pos.x + 28, pos.y + 27);

      const isProjectionTarget = projectionLinks.some((link) => link.to === node.id);
      visual.targetMarker.visible = isProjectionTarget;
      visual.targetMarker.position.set(pos.x - 28, pos.y + 27);

      const titleLayout = fitNodeTitle(node.name);
      visual.title.text = titleLayout.text;
      visual.title.style.fontSize = titleLayout.fontSize;
      visual.title.style.align = "center";
      visual.title.position.set(pos.x, pos.y + titleLayout.yOffset);
      visual.energy.text = `${fmt(node.si)} SI`;
      visual.energy.position.set(pos.x, pos.y + 20);
    }

    function redrawNetwork() {
      visibleNodeIds = computeVisibleNodeIds();
      for (const edge of edges) redrawEdge(edge);
      for (const node of nodeData) redrawNode(node);
      projectionHoverGraphic.clear();
      if (hoveredProjection) {
        const start = nodePositions[hoveredProjection.from];
        const end = nodePositions[hoveredProjection.to];
        if (start && end) {
          projectionHoverGraphic.moveTo(start.x, start.y);
          projectionHoverGraphic.lineTo(end.x, end.y);
          projectionHoverGraphic.stroke({ width: 3, color: 0xb8a6ff, alpha: 0.85 });
        }
      }
    }

    function spawnParticle(edge) {
      const start = nodePositions[edge.from];
      const dot = new PIXI.Graphics();
      dot.circle(0, 0, 2.4 + edge.flow * 0.02);
      dot.fill(getFlowColor(edge.flow));
      dot.alpha = 0.95;
      dot.position.set(start.x, start.y);
      particleLayer.addChild(dot);

      particles.push({
        sprite: dot,
        edgeKey: edge.key,
        t: 0,
        speedScale: 1
      });
    }

    function spawnProjectionPulse(projection) {
      const start = nodePositions[projection.from];
      const dot = new PIXI.Graphics();
      dot.circle(0, 0, 2.8);
      dot.fill(0xb8a6ff);
      dot.alpha = 0.95;
      dot.position.set(start.x, start.y);
      particleLayer.addChild(dot);

      particles.push({
        sprite: dot,
        projectionFrom: projection.from,
        projectionTo: projection.to,
        t: 0,
        speedScale: 1.35
      });
    }

    function animateParticles(deltaTime) {
      if (!app) return;

      const totalFlow = edges.reduce((sum, edge) => sum + edge.flow, 0);
      particleAccumulator += (totalFlow / 100) * 0.14 * deltaTime;
      const activeProjectionStrength = activeProjections.length * 0.2 * deltaTime;
      particleAccumulator += activeProjectionStrength;

      while (particleAccumulator >= 1) {
        const candidates = edges.filter(
          (edge) => edge.flow > 0 && isNodeAvailableForOutflow(edge.from)
        );
        if (candidates.length === 0) {
          particleAccumulator = 0;
          break;
        }
        let pick = Math.random() * candidates.reduce((s, e) => s + e.flow, 0);
        for (const edge of candidates) {
          pick -= edge.flow;
          if (pick <= 0) {
            spawnParticle(edge);
            break;
          }
        }
        particleAccumulator -= 1;
      }

      if (activeProjections.length > 0) {
        const spawnCount = Math.min(activeProjections.length, 2);
        for (let i = 0; i < spawnCount; i += 1) {
          const projection = activeProjections[(tickCounter + i) % activeProjections.length];
          spawnProjectionPulse(projection);
        }
      }

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const particle = particles[i];
        let start;
        let end;
        let speed;

        if (particle.edgeKey) {
          const edge = edges.find((item) => item.key === particle.edgeKey);
          if (!edge || edge.flow <= 0) {
            particle.sprite.destroy();
            particles.splice(i, 1);
            continue;
          }
          start = nodePositions[edge.from];
          end = nodePositions[edge.to];
          speed = (0.004 + edge.flow * 0.00008) * deltaTime * particle.speedScale;
        } else {
          const projection = activeProjections.find(
            (item) => item.from === particle.projectionFrom && item.to === particle.projectionTo
          );
          if (!projection) {
            particle.sprite.destroy();
            particles.splice(i, 1);
            continue;
          }
          start = nodePositions[projection.from];
          end = nodePositions[projection.to];
          speed = 0.008 * deltaTime * particle.speedScale;
        }

        particle.t += speed;

        if (particle.t >= 1) {
          particle.sprite.destroy();
          particles.splice(i, 1);
          continue;
        }

        particle.sprite.position.set(
          start.x + (end.x - start.x) * particle.t,
          start.y + (end.y - start.y) * particle.t
        );
      }
    }

    function updateNodeUI() {
      for (const node of nodeData) redrawNode(node);
    }

    function isNodeAvailableForOutflow(nodeId) {
      const node = nodeById(nodeId);
      return Boolean(node && node.unlocked);
    }

    function processTick() {
      if (gameWon) return;
      const attr = getAttributeState();

      const sourceNode = nodeById(0);
      const baseGeneration = SOURCE_RATE_PER_TICK;
      const surgeProjectionBonus = sunSurgeTicks > 0 ? 0.2 : 0;
      const generation = baseGeneration * (1 + attr.generationPercent) + attr.generationFlatPerTick;
      sourceNode.si += generation;

      let earthInflowThisTick = 0;
      let apexInflowThisTick = 0;
      for (const edge of edges) {
        if (edge.flow <= 0) continue;
        if (!isNodeAvailableForOutflow(edge.from)) continue;

        const sourceAmount = sourceNode.si;
        const earthNode = nodeById(11);
        const earthPenaltyActive = earthNode?.unlocked && earthNode.si > 0 && attr.fortitude < 0.7;
        const earthPenalty = earthPenaltyActive ? (earthNode.bonuses?.earthSinkPenalty ?? 0) : 0;
        const transferMultiplier = Math.max(
          0.5,
          1 + attr.flowEfficiency + attr.harmonyPower * 0.2 - earthPenalty
        );
        const transfer =
          sourceAmount * FLOW_TRANSFER_FACTOR_PER_TICK * (edge.flow / 100) * transferMultiplier;
        if (transfer <= 0) continue;

        const fromNode = nodeById(edge.from);
        const toNode = nodeById(edge.to);
        const move = Math.min(transfer, fromNode.si);
        fromNode.si -= move;
        toNode.si += move;
        if (toNode.id === 11) earthInflowThisTick += move;
        if (toNode.id === 20) apexInflowThisTick += move;
      }

      for (const projection of activeProjections) {
        if (!isNodeAvailableForOutflow(projection.from)) continue;
        const fromNode = nodeById(projection.from);
        const toNode = nodeById(projection.to);
        const transfer =
          sourceNode.si *
          projectionTransferFactorPerTick *
          (1 + attr.projectionRatePercent + attr.harmonyPower * 0.15 + surgeProjectionBonus);
        const move = Math.min(transfer, fromNode.si);
        fromNode.si -= move;
        toNode.si += move;
        if (toNode.id === 11) earthInflowThisTick += move;
        if (toNode.id === 20) apexInflowThisTick += move;
        if (attr.projectionEcho > 0 && move > 0) {
          const echoEdge = edges.find((edge) => edge.from === toNode.id);
          if (echoEdge) {
            const echoTarget = nodeById(echoEdge.to);
            const echoAmount = move * attr.projectionEcho;
            toNode.si = Math.max(0, toNode.si - echoAmount);
            echoTarget.si += echoAmount;
          }
        }
      }

      if (attr.resonanceReady) {
        resonance = Math.min(100, resonance + resonanceGainPerTick);
      } else {
        resonance = Math.max(0, resonance - resonanceDecayPerTick);
      }
      if (resonance >= 100 && resonanceBurstTicks <= 0) {
        resonanceBurstTicks = resonanceBurstTicksMax;
        statusEl.textContent = "Resonance awakened! Sigil output surges.";
      }
      if (resonanceBurstTicks > 0) {
        resonanceBurstTicks -= 1;
      }

      if (earthInflowThisTick > earthSinkInflowThreshold && attr.fortitude < 0.7) {
        resonance = Math.max(0, resonance - 0.55);
      }
      if (earthInflowThisTick > earthSinkHardThreshold && attr.fortitude < 0.5) {
        sourceNode.si = Math.max(0, sourceNode.si - earthInflowThisTick * 0.65);
      }

      // Active perk: Sun Arc Lower periodically overcharges projections.
      if (nodeById(10)?.unlocked && tickCounter - lastSunSurgeTick >= sunSurgeIntervalTicks) {
        lastSunSurgeTick = tickCounter;
        sunSurgeTicks = sunSurgeDurationTicks;
        statusEl.textContent = "Sun Arc surge: projection channels intensified.";
      }
      if (sunSurgeTicks > 0) {
        sunSurgeTicks -= 1;
      }

      // Active perk: Apex Crown Seal converts inflow into immediate resonance.
      if (nodeById(20)?.unlocked && apexInflowThisTick > 0) {
        resonance = Math.min(100, resonance + Math.min(0.22, apexInflowThisTick * 1.8));
      }

      for (const node of nodeData) {
        if (node.unlocked || node.id === 0) continue;
        if (node.si >= node.unlockCost) {
          node.unlocked = true;
          unlockFadeProgress.set(node.id, 0);
          statusEl.textContent = `${node.name} unlocked!`;
        }
      }

      for (const [nodeId, progress] of unlockFadeProgress.entries()) {
        const next = progress + 1;
        if (next >= UNLOCK_FADE_TICKS) unlockFadeProgress.delete(nodeId);
        else unlockFadeProgress.set(nodeId, next);
      }

      if (nodeData.every((node) => node.id === 0 || node.unlocked)) {
        gameWon = true;
        statusEl.textContent = "Ascension complete! The full sigil is awakened.";
      }

      updateNodeUI();
      sourceTotalEl.textContent = fmt(sourceNode.si);
      updateBonusSummary();
      if (!gameWon && tickCounter % 50 === 0) {
        const patternState = attr.resonancePatternReady ? "aligned" : "misaligned";
        statusEl.textContent = `Resonance ${fmt(resonance)} (${patternState}) | Gen ${fmt(generation * TICKS_PER_SECOND)} SI/s`;
      }
    }

    function tick() {
      const steps = devSpeedEnabled ? simSpeedMultiplier : 1;
      for (let i = 0; i < steps; i += 1) {
        if (gameWon) break;
        tickCounter += 1;
        processTick();
      }
      ticksEl.textContent = String(tickCounter);
    }

    function refreshOpenTooltip() {
      if (selectedNodeId < 0) return;
      if (flowPopupEl.classList.contains("hidden")) return;
      if (!visibleNodeIds.has(selectedNodeId)) {
        hideFlowPopup();
        return;
      }
      const node = nodeById(selectedNodeId);
      const overviewBlock = flowPopupEl.querySelector(".popup-overview");
      if (!node || !overviewBlock) return;

      const attr = getAttributeState();
      const rates = computeNodeRates(attr);
      const nodeRate = rates[selectedNodeId] ?? { in: 0, out: 0, net: 0 };
      const etaSec =
        node.unlocked
          ? 0
          : ((node.unlockCost - node.si) > 0 && nodeRate.net > 0
            ? (node.unlockCost - node.si) / nodeRate.net / TICKS_PER_SECOND
            : Infinity);
      const attrInfo = getCultivationAttributeInfo(node.attributeType);
      overviewBlock.innerHTML = `
        <div class="popup-block-title">Overview</div>
        <div class="popup-keyvals">
          <div data-tooltip="${attrInfo.description}"><span>Path</span><br>${attrInfo.name} T${node.attributeTier ?? "-"}</div>
          <div><span>Status</span><br>${node.unlocked ? "Unlocked" : "Locked"}</div>
          <div><span>In</span><br>${fmt(nodeRate.in * TICKS_PER_SECOND)} SI/s</div>
          <div><span>Out</span><br>${fmt(nodeRate.out * TICKS_PER_SECOND)} SI/s</div>
          <div><span>Net</span><br>${fmt(nodeRate.net * TICKS_PER_SECOND)} SI/s</div>
          <div><span>ETA</span><br>${node.unlocked ? "Unlocked" : formatDuration(etaSec)}</div>
        </div>
      `;
      attachDomTooltips(overviewBlock);
    }

    function setSimSpeed(multiplier) {
      simSpeedMultiplier = multiplier;
      speed1xEl.classList.toggle("active", multiplier === 1);
      speed10xEl.classList.toggle("active", multiplier === 10);
      speed100xEl.classList.toggle("active", multiplier === 100);
      if (devSpeedEnabled) {
        statusEl.textContent = `Dev speed active: ${multiplier}x simulation rate.`;
      }
    }

    function setDevSpeedMode(enabled) {
      devSpeedEnabled = enabled;
      devSpeedRowEl.style.display = enabled ? "grid" : "none";
      devSpeedToggleEl.textContent = enabled ? "Dev Speed: On" : "Dev Speed: Off";
      if (!enabled) {
        simSpeedMultiplier = 1;
      }
      setSimSpeed(simSpeedMultiplier);
    }

    function setShowAllNodesMode(enabled) {
      forceShowAllNodes = enabled;
      showAllNodesBtnEl.textContent = enabled ? "Show All Nodes: On" : "Show All Nodes: Off";
      redrawNetwork();
      if (selectedNodeId >= 0 && !visibleNodeIds.has(selectedNodeId)) {
        selectedNodeId = -1;
        hideFlowPopup();
      }
      statusEl.textContent = enabled
        ? "Developer visibility enabled: all nodes are now visible."
        : "Developer visibility disabled: showing only currently reachable nodes.";
    }

    function setDeveloperMode(enabled) {
      developerMode = enabled;
      devModeToggleEl.textContent = enabled ? "Dev Mode: On" : "Dev Mode: Off";
      devToolsRowEl.style.display = enabled ? "grid" : "none";
      if (!enabled) {
        setDevSpeedMode(false);
        setShowAllNodesMode(false);
      }
      statusEl.textContent = enabled
        ? "Developer mode enabled. Dev testing options are now available."
        : "Developer mode disabled.";
    }

    function resetGame() {
      tickCounter = 0;
      gameWon = false;
      resonance = 0;
      resonanceBurstTicks = 0;
      sunSurgeTicks = 0;
      lastSunSurgeTick = 0;
      for (let i = 0; i < nodeData.length; i += 1) {
        nodeData[i].si = initialNodeState[i].si;
        nodeData[i].unlocked = initialNodeState[i].unlocked;
      }
      unlockFadeProgress.clear();
      for (let i = 0; i < edges.length; i += 1) {
        edges[i].flow = initialEdges[i].flow;
      }
      activeProjections.length = 0;
      initializeTier2Snapshots();
      statusEl.textContent = "Open all sigil nodes to complete cultivation.";
      ticksEl.textContent = "0";
      sourceTotalEl.textContent = "0.00";
      selectedNodeId = -1;
      hideFlowPopup();
      redrawNetwork();
      updateBonusSummary();
    }

    document.getElementById("recenter").addEventListener("click", recenterView);
    resetBodyViewEl.addEventListener("click", resetBodyView);
    devModeToggleEl.addEventListener("click", () => setDeveloperMode(!developerMode));
    devSpeedToggleEl.addEventListener("click", () => setDevSpeedMode(!devSpeedEnabled));
    showAllNodesBtnEl.addEventListener("click", () => {
      if (!developerMode) {
        statusEl.textContent = "Enable Developer Mode first.";
        return;
      }
      setShowAllNodesMode(!forceShowAllNodes);
    });
    editNodesBtnEl.addEventListener("click", openNodeEditor);
    saveShapeEl.addEventListener("click", exportShapeConfig);
    addT2NodeEl.addEventListener("click", addT2NodeInView);
    saveT2LayoutEl.addEventListener("click", exportT2LayoutConfig);
    speed1xEl.addEventListener("click", () => setSimSpeed(1));
    speed10xEl.addEventListener("click", () => setSimSpeed(10));
    speed100xEl.addEventListener("click", () => setSimSpeed(100));

    setupPixi().then(() => {
      setDeveloperMode(false);
      setDevSpeedMode(false);
      initializeTier2Snapshots();
      world.scale.set(BODY_MODE_DEFAULT_SCALE);
      updateSymbolMode();
      if (symbolModeEnabled) {
        focusBodyModeOnTier2(BODY_MODE_FOCUS_TIER2_ID);
      } else {
        recenterView();
      }
      selectedNodeId = -1;
      hideFlowPopup();
      redrawNetwork();
      updateBonusSummary();
      setInterval(tick, TICK_MS);
      setInterval(refreshOpenTooltip, 1000);
    });
  
