// FlowMaster: mutable runtime state + DOM element references.
// All files share these `let`/`const` bindings via the classic-script global
// lexical environment, so every subsequent file can read and mutate them.

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
