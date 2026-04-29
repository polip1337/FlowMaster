// FlowMaster: mutable runtime state + DOM element references.

import {
  BODY_WORLD_BASE_WIDTH,
  BODY_MODE_DEFAULT_SCALE,
  BODY_MODE_FOCUS_TIER2_ID
} from './constants.ts';
import { initialEdges } from './config.ts';
import type { RecipeTier } from "../../src/core/alchemy/types.ts";

// All primitives and PIXI object bindings that get reassigned live here.
// ES modules can't reassign exported `let`s from other files, so we use a
// single mutable object whose properties are always writable.
export const st = {
  // PIXI objects (assigned in bootstrap.ts / setupPixi)
  app: null as any,
  world: null as any,
  edgeLayer: null as any,
  nodeLayer: null as any,
  particleLayer: null as any,
  symbolLayer: null as any,
  symbolSprite: null as any,
  tier2MarkerLayer: null as any,
  projectionHoverGraphic: null as any,

  // Tick / game state
  tickCounter: 0,
  gameWon: false,

  // Node selection
  selectedNodeId: -1,

  // Pointer / pan / drag state
  isPanning: false,
  draggingNodeId: null as number | null,
  panStartX: 0,
  panStartY: 0,
  worldStartX: 0,
  worldStartY: 0,
  draggedDistance: 0,
  dragNodeOffsetX: 0,
  dragNodeOffsetY: 0,

  // Tier-2 drag state
  draggingTier2NodeId: null as string | null,
  dragTier2OffsetX: 0,
  dragTier2OffsetY: 0,
  tier2DraggedDistance: 0,

  // Developer / sim controls
  developerMode: false,
  devSpeedEnabled: false,
  simSpeedMultiplier: 1,
  tickRateMultiplier: 1,

  // Offline tick bank: stored time converted into bonus simulation ticks.
  // Player can spend this bank to temporarily speed up the game (x5).
  offlineTickBank: 0,
  offlineTickBoostActive: false,
  offlineTickLastSeenAtMs: 0,
  offlineTickLastPersistAtMs: 0,
  offlineTickBankDirty: false,
  soundEnabled: true,
  particleDensity: 1,
  colorAccessibilityMode: "default" as "default" | "deuteranopia" | "tritanopia",
  galaxyViewDefault: false,
  forceShowAllNodes: false,
  balancePane: null as any,

  // Particle accumulator
  particleAccumulator: 0,

  // View / body-map state
  symbolModeEnabled: false,
  isViewTransitioning: false,
  viewTransitionQueued: false,
  lastZoomScale: 1,
  bodyMapWidth: BODY_WORLD_BASE_WIDTH,
  bodyMapHeight: 1900,

  // Active tier-2 tracking
  activeTier2NodeId: BODY_MODE_FOCUS_TIER2_ID,
  activeTier1OwnerTier2Id: BODY_MODE_FOCUS_TIER2_ID,

  // Popup / hover
  lastPopupLeft: 12,
  lastPopupTop: 12,
  hoveredTargetNodeId: null as number | null,
  hoveredEdgeKey: null as string | null,
  hoveredProjection: null as { from: number; to: number } | null,

  // Edge key counter — starts after the initial edges
  edgeKeyCounter: initialEdges.length,

  // Resonance / surges
  resonance: 0,
  resonanceBurstTicks: 0,
  sunSurgeTicks: 0,
  lastSunSurgeTick: 0,

  /** Phase 27 — Direct Jing active repair (TASK-184) */
  directJingRepairActive: false,
  bodyJingPool: 3200,

  /** Phase 28 — Body map route/meridian UI */
  bodyMapMeridianLayer: null as any,
  bodyMapMeridians: null as Map<string, any> | null,
  routeDrawingMode: false,
  routeDraftNodeIds: [] as string[],
  activeBodyRouteNodeIds: [] as string[],
  selectedBodyMapMeridianId: null as string | null,
  galaxyViewEnabled: false,
  bodyHeat: 12,
  maxBodyHeat: 100,
  refiningPulseActive: false,
  temperingLevel: 1,
  temperingXp: 0,
  temperingAction: "Breath Training",
  daoSelected: null as string | null,
  daoInsights: 0,
  daoComprehensionLevel: 0,
  daoNodes: [] as Array<{ id: string; name: string; state: "LOCKED" | "SEALING" | "ACTIVE" }>,
  daoSkills: [] as string[],
  combatEncountered: false,
  combatPhase: "prep" as "prep" | "active" | "summary",
  combatEnemyId: "bandit-cultivator",
  combatRotation: ["Palm Strike", "Soul Lance", "Iron Guard", "Heaven Step"] as string[],
  combatEnergyPriority: { qi: 45, jing: 30, yangQi: 15, shen: 10 } as Record<string, number>,
  combatCurrentSkillIndex: 0,
  combatSkillCooldownTicks: 0,
  combatTick: 0,
  combatPlayerHp: 200,
  combatPlayerMaxHp: 200,
  combatPlayerSoulHp: 120,
  combatPlayerMaxSoulHp: 120,
  combatEnemyHp: 180,
  combatEnemyMaxHp: 180,
  combatEnemySoulHp: 90,
  combatEnemyMaxSoulHp: 90,
  combatEnergyPool: { qi: 100, jing: 80, yangQi: 55, shen: 40 } as Record<string, number>,
  combatLog: ["Awaiting combat start. Configure your opening rotation."] as string[],
  combatSummary: null as null | {
    outcome: "victory" | "defeat";
    damageDealt: number;
    damageReceived: number;
    skillsUsed: number;
    energySpent: Record<string, number>;
    nodesDamaged: string[];
    treasuresDropped: string[];
    insightsGained: number;
  },
  combatCrackFlashNodeId: null as number | null,
  combatCrackFlashTicks: 0,
  inventoryItems: [
    { id: "pill_qi", name: "Condensed Essence Pill", quantity: 2, effect: "+280 Qi to target node" },
    { id: "stone_refine", name: "Refining Stone", quantity: 1, effect: "+1 quality to target node" }
  ] as Array<{ id: string; name: string; quantity: number; effect: string }>,
  ingredientItems: [
    { id: "spirit-grass", name: "Spirit Grass", quantity: 5 },
    { id: "iron-bark", name: "Iron Bark", quantity: 3 },
    { id: "jade-moss", name: "Jade Moss", quantity: 4 },
    { id: "ember-bloom", name: "Ember Bloom", quantity: 2 },
    { id: "moon-tear", name: "Moon Tear", quantity: 3 },
    { id: "void-thorn", name: "Void Thorn", quantity: 1 }
  ] as Array<{ id: string; name: string; quantity: number }>,
  selectedInventoryItemId: null as string | null,
  inventoryTargetingActive: false,
  alchemySelectedRecipeId: null as string | null,
  alchemyWorkbenchSlots: [] as string[],
  alchemyPhase: "IDLE" as "IDLE" | "MIXING" | "REFINING",
  alchemyQualityPreview: 0,
  alchemyFilterType: "all" as string,
  alchemyFilterTier: "all" as RecipeTier | "all",
  alchemyFilterAvailableOnly: false,
  tutorial: {
    active: true,
    suppressed: false,
    completed: false,
    stepIndex: 0
  } as {
    active: boolean;
    suppressed: boolean;
    completed: boolean;
    stepIndex: number;
  },
  celestialDayOfYear: 0,
  celestialSeason: "Spring" as "Spring" | "Summer" | "Autumn" | "Winter",
  celestialActiveConjunctions: [] as string[],
  celestialBodies: [] as Array<{ id: string; linkedT2NodeId: string; currentSign: string }>,
  sectJoinedId: null as string | null,
  sectElderFavorLevels: {} as Record<string, number>,
  unlockedTechniques: [] as string[],
  t2NodeRanks: {} as Record<string, number>,
  coreActiveRouteLength: 0,
  circulationSpeedPercent: 0,
  t2DamageById: {} as Record<string, { cracked: boolean; shattered: boolean; repairProgress: number }>,
  breakthroughFxTicks: 0,
  breakthroughFxDurationTicks: 300,
  breakthroughSourceNodeId: null as string | null,
  binduStabilizationFlashTicks: 0,
  binduReserveRatio: 0,
  ajnaYinRatio: 0.5,
  ajnaYangRatio: 0.5,
  ajnaImbalanceSeverity: 0,
  firstShenEventSeen: false,
  phase37LastSoundEvents: [] as Array<{ type: string; tick: number; payload?: Record<string, unknown> }>,

  // Node visibility (reassigned each frame by redrawNetwork)
  visibleNodeIds: new Set<number>()
};

// Mutable collections — the bindings never change, only the contents do,
// so they can be plain named exports (mutation is fine across ES modules).
export const edgeVisuals: Record<string, any> = {};
export const nodeVisuals: Record<number, any> = {};
export const particles: any[] = [];
export const activeProjections: any[] = [];
export const unlockFadeProgress = new Map<number, number>();
export const tier2MarkerVisuals = new Map<string, any>();
export const tier2Tier1Snapshots = new Map<string, any>();

// View states — object bindings don't change, only properties mutate.
export const tier1ViewState = { initialized: false, scale: 1, x: 0, y: 0 };
export const tier2ViewState = {
  initialized: false,
  scale: BODY_MODE_DEFAULT_SCALE,
  x: 0,
  y: 0,
  focusTier2Id: BODY_MODE_FOCUS_TIER2_ID
};

// DOM element references — const, never reassigned.
export const ticksEl = document.getElementById("ticks");
export const sourceTotalEl = document.getElementById("sourceTotal");
export const statusEl = document.getElementById("status");
export const bonusSummaryEl = document.getElementById("bonusSummary");
export const stateWarningsEl = document.getElementById("stateWarnings");
export const resonanceChecklistEl = document.getElementById("resonanceChecklist");
export const nextActionEl = document.getElementById("nextAction");
export const flowPopupEl = document.getElementById("flowPopup")!;
export const markerTooltipEl = document.getElementById("markerTooltip")!;
export const edgeControlsLayerEl = document.getElementById("edgeControlsLayer")!;
export const zoomHudEl = document.getElementById("zoomHud");
export const pixiWrapEl = document.getElementById("pixiWrap");
export const devSpeedToggleEl = document.getElementById("devSpeedToggle");
export const devToolsRowEl = document.getElementById("devToolsRow");
export const devSpeedRowEl = document.getElementById("devSpeedRow");
export const speed1xEl = document.getElementById("speed1x");
export const speed10xEl = document.getElementById("speed10x");
export const speed100xEl = document.getElementById("speed100x");
export const devModeToggleEl = document.getElementById("devModeToggle");
export const resetBodyViewEl = document.getElementById("resetBodyView");
export const zoomToT2BtnEl = document.getElementById("zoomToT2Btn");
export const showAllNodesBtnEl = document.getElementById("showAllNodesBtn");
export const editNodesBtnEl = document.getElementById("editNodesBtn");
export const saveShapeEl = document.getElementById("saveShapeBtn");
export const addT2NodeEl = document.getElementById("addT2NodeBtn");
export const saveT2LayoutEl = document.getElementById("saveT2LayoutBtn");
export const drawRouteBtnEl = document.getElementById("drawRouteBtn");
export const confirmRouteBtnEl = document.getElementById("confirmRouteBtn");
export const galaxyToggleBtnEl = document.getElementById("galaxyViewToggleBtn");
export const routeMetricsEl = document.getElementById("routeMetrics");
export const meridianDetailEl = document.getElementById("meridianDetailPanel");
export const reverseMeridianBtnEl = document.getElementById("reverseMeridianBtn");
export const bodyHeatGaugeEl = document.getElementById("bodyHeatGauge");
export const bodyHeatLabelEl = document.getElementById("bodyHeatLabel");
export const bodyHeatWarningEl = document.getElementById("bodyHeatWarning");
export const cultivationPanelBodyEl = document.getElementById("cultivationPanelBody");
export const combatPanelBodyEl = document.getElementById("combatPanelBody");
export const combatPrepBodyEl = document.getElementById("combatPrepBody");
export const combatActiveBodyEl = document.getElementById("combatActiveBody");
export const combatSummaryBodyEl = document.getElementById("combatSummaryBody");
export const combatNodeDamageAlertEl = document.getElementById("combatNodeDamageAlert");
export const refiningPulseBtnEl = document.getElementById("refiningPulseBtn");
export const refiningPulseInfoEl = document.getElementById("refiningPulseInfo");
export const activeRouteDisplayEl = document.getElementById("activeRouteDisplay");
export const stopRouteBtnEl = document.getElementById("stopRouteBtn");
export const temperingLevelEl = document.getElementById("temperingLevel");
export const temperingXpEl = document.getElementById("temperingXp");
export const temperingActionEl = document.getElementById("temperingAction");
export const temperingBonusesEl = document.getElementById("temperingBonuses");
export const daoSummaryEl = document.getElementById("daoSummary");
export const daoSelectEl = document.getElementById("daoSelect");
export const daoNodesEl = document.getElementById("daoNodes");
export const daoSkillsEl = document.getElementById("daoSkills");
export const inventoryGridEl = document.getElementById("inventoryGrid");
export const inventoryDetailEl = document.getElementById("inventoryDetail");
export const ingredientInventoryEl = document.getElementById("ingredientInventory");
export const alchemySlotsEl = document.getElementById("alchemySlots");
export const alchemyPhaseEl = document.getElementById("alchemyPhase");
export const alchemyQualityPreviewEl = document.getElementById("alchemyQualityPreview");
export const alchemyRefineBtnEl = document.getElementById("alchemyRefineBtn");
export const alchemyRecipeListEl = document.getElementById("alchemyRecipeList");
export const alchemyFilterTypeEl = document.getElementById("alchemyFilterType");
export const alchemyFilterTierEl = document.getElementById("alchemyFilterTier");
export const alchemyFilterAvailableEl = document.getElementById("alchemyFilterAvailable");
export const celestialCalendarWidgetEl = document.getElementById("celestialCalendarWidget");
export const sectPanelBodyEl = document.getElementById("sectPanelBody");
export const saveGameBtnEl = document.getElementById("saveGameBtn");
export const loadGameBtnEl = document.getElementById("loadGameBtn");
export const exportSaveBtnEl = document.getElementById("exportSaveBtn");
export const importSaveInputEl = document.getElementById("importSaveInput");
export const tutorialOverlayEl = document.getElementById("tutorialOverlay");
export const tutorialHighlightEl = document.getElementById("tutorialHighlight");
export const tutorialCardEl = document.getElementById("tutorialCard");
export const tutorialTitleEl = document.getElementById("tutorialTitle");
export const tutorialMessageEl = document.getElementById("tutorialMessage");
export const tutorialStepCounterEl = document.getElementById("tutorialStepCounter");
export const tutorialNextBtnEl = document.getElementById("tutorialNextBtn");
export const tutorialSkipBtnEl = document.getElementById("tutorialSkipBtn");
export const resetTutorialBtnEl = document.getElementById("resetTutorialBtn");
export const settingsTickRateEl = document.getElementById("settingsTickRate");
export const settingsSoundToggleEl = document.getElementById("settingsSoundToggle");
export const settingsParticleDensityEl = document.getElementById("settingsParticleDensity");
export const settingsGalaxyDefaultEl = document.getElementById("settingsGalaxyDefault");
export const settingsColorModeEl = document.getElementById("settingsColorMode");
export const offlineTickBankLabelEl = document.getElementById("offlineTickBankLabel");
export const offlineTickBoostBtnEl = document.getElementById("offlineTickBoostBtn");
