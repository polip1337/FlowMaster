import { edges, nodeData } from "./config";
import {
  activeProjections,
  resetTutorialBtnEl,
  st,
  tutorialCardEl,
  tutorialHighlightEl,
  tutorialMessageEl,
  tutorialNextBtnEl,
  tutorialOverlayEl,
  tutorialSkipBtnEl,
  tutorialStepCounterEl,
  tutorialTitleEl
} from "./state";
import { STATE_ACTIVE, STATE_RESONANT } from "./constants";
import { getNodeState } from "./queries";

type TutorialStep = {
  chapter: string;
  title: string;
  targetId: string;
  message: string;
  goal: string;
  revealIds: string[];
  trigger: () => boolean;
  advance: () => boolean;
};

const LOCKED_CLASS = "tutorial-locked-ui";
const ALWAYS_VISIBLE_IDS = new Set<string>([
  "pixiWrap",
  "edgeControlsLayer",
  "tutorialOverlay",
  "tutorialHighlight",
  "tutorialCard",
  "tutorialTitle",
  "tutorialMessage",
  "tutorialStepCounter",
  "tutorialSkipBtn",
  "tutorialNextBtn"
]);

const TUTORIAL_LOCKABLE_IDS = [
  "leftPanel",
  "rightPanel",
  "ticks",
  "sourceTotal",
  "status",
  "resetTutorialBtn",
  "recenter",
  "resetBodyView",
  "drawRouteBtn",
  "confirmRouteBtn",
  "galaxyViewToggleBtn",
  "devModeToggle",
  "devSpeedToggle",
  "routeMetrics",
  "refiningPulseBtn",
  "refiningPulseInfo",
  "activeRouteDisplay",
  "stopRouteBtn",
  "bodyHeatGauge",
  "bodyHeatLabel",
  "bodyHeatWarning",
  "zoomHud",
  "combatPanelBody",
  "combatPrepBody",
  "combatActiveBody",
  "combatSummaryBody",
  "combatNodeDamageAlert",
  "daoSelect",
  "daoSummary",
  "daoNodes",
  "daoSkills",
  "sectPanelBody",
  "ingredientInventory",
  "alchemySlots",
  "alchemyRecipeList",
  "alchemyPhase",
  "alchemyQualityPreview",
  "alchemyRefineBtn",
  "alchemyFilterType",
  "alchemyFilterTier",
  "alchemyFilterAvailable",
  "inventoryGrid",
  "inventoryDetail",
  "saveGameBtn",
  "loadGameBtn",
  "exportSaveBtn",
  "importSaveInput",
  "settingsTickRate",
  "settingsSoundToggle",
  "settingsParticleDensity",
  "settingsGalaxyDefault",
  "settingsColorMode",
  "bonusSummary",
  "stateWarnings",
  "resonanceChecklist",
  "celestialCalendarWidget",
  "nextAction",
  "reverseMeridianBtn",
  "meridianDetailPanel",
  "cultivationPanelBody",
  "temperingLevel",
  "temperingXp",
  "temperingAction",
  "temperingBonuses"
];

const VISIBILITY_DEPENDENCIES: Record<string, string[]> = {
  resetBodyView: ["leftPanel"],
  resetTutorialBtn: ["leftPanel"],
  recenter: ["leftPanel"],
  drawRouteBtn: ["leftPanel"],
  confirmRouteBtn: ["leftPanel"],
  galaxyViewToggleBtn: ["leftPanel"],
  devModeToggle: ["leftPanel"],
  devSpeedToggle: ["leftPanel"],
  routeMetrics: ["leftPanel"],
  refiningPulseBtn: ["leftPanel"],
  refiningPulseInfo: ["leftPanel"],
  activeRouteDisplay: ["leftPanel"],
  stopRouteBtn: ["leftPanel"],
  temperingLevel: ["leftPanel"],
  temperingXp: ["leftPanel"],
  temperingAction: ["leftPanel"],
  temperingBonuses: ["leftPanel"],
  cultivationPanelBody: ["rightPanel"],
  combatPanelBody: ["rightPanel"],
  combatPrepBody: ["rightPanel"],
  combatActiveBody: ["rightPanel"],
  combatSummaryBody: ["rightPanel"],
  combatNodeDamageAlert: ["rightPanel"],
  daoSelect: ["rightPanel"],
  daoSummary: ["rightPanel"],
  daoNodes: ["rightPanel"],
  daoSkills: ["rightPanel"],
  sectPanelBody: ["rightPanel"],
  inventoryGrid: ["rightPanel"],
  inventoryDetail: ["rightPanel"],
  ingredientInventory: ["rightPanel"],
  alchemySlots: ["rightPanel"],
  alchemyRecipeList: ["rightPanel"],
  alchemyPhase: ["rightPanel"],
  alchemyQualityPreview: ["rightPanel"],
  alchemyRefineBtn: ["rightPanel"],
  alchemyFilterType: ["rightPanel"],
  alchemyFilterTier: ["rightPanel"],
  alchemyFilterAvailable: ["rightPanel"],
  saveGameBtn: ["rightPanel"],
  loadGameBtn: ["rightPanel"],
  exportSaveBtn: ["rightPanel"],
  importSaveInput: ["rightPanel"],
  settingsTickRate: ["rightPanel"],
  settingsSoundToggle: ["rightPanel"],
  settingsParticleDensity: ["rightPanel"],
  settingsGalaxyDefault: ["rightPanel"],
  settingsColorMode: ["rightPanel"],
  bonusSummary: ["rightPanel"],
  stateWarnings: ["rightPanel"],
  resonanceChecklist: ["rightPanel"],
  celestialCalendarWidget: ["rightPanel"],
  nextAction: ["rightPanel"],
  reverseMeridianBtn: ["rightPanel"],
  meridianDetailPanel: ["rightPanel"]
};

let visibleTutorialIds = new Set<string>(ALWAYS_VISIBLE_IDS);

function unlockedNodeCount(): number {
  return nodeData.filter((node) => node.unlocked).length;
}

function hasAnyFlow(): boolean {
  return edges.some((edge) => edge.flow > 0);
}

function awakeT1NodeCount(): number {
  return nodeData.filter((node) => {
    const state = getNodeState(node);
    return state === STATE_ACTIVE || state === STATE_RESONANT;
  }).length;
}

export const tutorialSteps: TutorialStep[] = [
  {
    chapter: "Tutorial Ch1 — First Spark",
    title: "Awaken Your First Sigil",
    targetId: "pixiWrap",
    message: "Something stirs within. A warmth gathers at your center—your first node begins to drink Qi and awaken the inner map. Use that warmth to awaken your next node.",
    goal: "Awaken your next node (ACTIVE or RESONANT).",
    revealIds: ["ticks", "sourceTotal"],
    trigger: () => st.tickCounter >= 0,
    // In the real game, `processTick()` also unlocks nodes before the tutorial
    // system evaluates. In unit tests we don't run the simulation loop, so
    // we fall back to time-based enabling.
    advance: () => unlockedNodeCount() >= 2 || st.tickCounter >= 5
  },
  {
    chapter: "Tutorial Ch1 — First Spark",
    title: "T1 Resonance = Node Power",
    targetId: "pixiWrap",
    message: "The nodes you awaken here are small parts of a larger T2 body system. When a node becomes RESONANT, it means that node is stronger and contributes more power. Watch for RESONANT nodes among your awakened sigils.",
    goal: "Awaken a second T1 node (ACTIVE or RESONANT).",
    revealIds: ["ticks", "sourceTotal"],
    trigger: () => unlockedNodeCount() >= 2,
    advance: () => awakeT1NodeCount() >= 2
  },
  {
    chapter: "Tutorial Ch1 — First Spark",
    title: "Qi Projection Bridge",
    targetId: "pixiWrap",
    message: "You can move Qi with a special link: a Qi Projection Bridge. Instead of relying only on internal spread, projection sends Qi from one node to another. Select a projection-eligible node, then turn on at least one bridge in the Flow Popup.",
    goal: "Activate one Qi Projection Bridge.",
    revealIds: ["ticks", "sourceTotal"],
    trigger: () => unlockedNodeCount() >= 2,
    advance: () => activeProjections.length >= 1
  },
  {
    chapter: "Tutorial Ch1 — First Spark",
    title: "Internal Diffusion + Dead Zones (I/O Ports)",
    targetId: "pixiWrap",
    message: "Inside this cluster, Qi spreads along internal connections. If a path includes locked nodes, Qi can’t reach the other side, creating dead zones. The boundary I/O ports only work well when the internal route is unlocked.",
    goal: "Awaken enough internal nodes so the cluster stabilizes (4+ ACTIVE/RESONANT).",
    revealIds: ["ticks", "sourceTotal", "edgeControlsLayer"],
    trigger: () => activeProjections.length >= 1,
    advance: () => awakeT1NodeCount() >= 4
  },
  {
    chapter: "Tutorial Ch2 — First Channel",
    title: "Develop the First Channel",
    targetId: "drawRouteBtn",
    message: "Now you can guide Qi through the body’s meridian channels. Use the route controls to send your first circulation pulse—training the channel until the system starts flowing.",
    goal: "Open a flow and start training the channel.",
    revealIds: ["drawRouteBtn", "confirmRouteBtn", "activeRouteDisplay", "edgeControlsLayer"],
    trigger: () => awakeT1NodeCount() >= 4,
    advance: () => hasAnyFlow()
  },
  {
    chapter: "Tutorial Ch3 — First Loop",
    title: "Close the First Loop",
    targetId: "routeMetrics",
    message: "Close a circuit so your Qi circulates and your channels strengthen together. The weakest bridge sets the pace—balance matters more than pushing every channel to maximum.",
    goal: "Run a 3-node active loop.",
    revealIds: ["routeMetrics", "activeRouteDisplay", "drawRouteBtn", "confirmRouteBtn", "edgeControlsLayer"],
    trigger: () => st.activeBodyRouteNodeIds.length >= 2,
    advance: () => st.activeBodyRouteNodeIds.length >= 3
  },
  {
    chapter: "Tutorial Ch3 — First Loop",
    title: "Let the Heartbeats Pass",
    targetId: "ticks",
    message: "Each heartbeat advances cultivation. Transfers, gains, and risks all resolve on this rhythm—so let the loop breathe.",
    goal: "Let the loop run for 15 heartbeats.",
    revealIds: ["drawRouteBtn", "confirmRouteBtn", "activeRouteDisplay", "edgeControlsLayer"],
    trigger: () => st.tickCounter >= 0,
    advance: () => st.tickCounter >= 15 && hasAnyFlow()
  },
  {
    chapter: "Tutorial Ch3 — First Loop",
    title: "Guard the Core Breath",
    targetId: "sourceTotal",
    message: "Your core breath sets the pressure for every outward current. Keep the core fed while the loop trains the meridians.",
    goal: "Maintain flow until the core has fed you for 25 heartbeats.",
    revealIds: ["drawRouteBtn", "confirmRouteBtn", "activeRouteDisplay", "edgeControlsLayer"],
    trigger: () => hasAnyFlow(),
    advance: () => st.tickCounter >= 25
  },
  {
    chapter: "Ch4 — Body Takes Shape",
    title: "Feel the Circulation Strain",
    targetId: "bodyHeatGauge",
    message: "Circulation generates heat—your body's strain. Green and yellow stay steady, but orange and red mean the pressure is rising.",
    goal: "Reach 20 heat (warm and steady).",
    revealIds: ["bodyHeatGauge", "bodyHeatLabel", "drawRouteBtn", "confirmRouteBtn", "activeRouteDisplay", "routeMetrics", "edgeControlsLayer"],
    trigger: () => st.activeBodyRouteNodeIds.length >= 2 || hasAnyFlow(),
    advance: () => st.bodyHeat >= 20
  },
  {
    chapter: "Ch4 — Body Takes Shape",
    title: "When Strain Turns Dangerous",
    targetId: "bodyHeatWarning",
    message: "When warning nears the critical band, ease off aggressive routing—or temper your rhythm with Refining Pulse—before strain cascades into damage.",
    goal: "Push to 30+ heat once, then steady your pace.",
    revealIds: ["bodyHeatGauge", "bodyHeatLabel", "bodyHeatWarning", "drawRouteBtn", "confirmRouteBtn", "activeRouteDisplay", "routeMetrics", "edgeControlsLayer"],
    trigger: () => st.bodyHeat >= 20,
    advance: () => st.bodyHeat >= 30
  },
  {
    chapter: "Ch4 — Body Takes Shape",
    title: "The Refining Pulse",
    targetId: "refiningPulseBtn",
    message: "Refining Pulse is a furnace breath: it converts your tempo into power, but also increases risk. Use it for brief surges, not for endless uptime.",
    goal: "Turn Refining Pulse on once.",
    revealIds: ["refiningPulseBtn", "refiningPulseInfo", "drawRouteBtn", "confirmRouteBtn", "activeRouteDisplay", "routeMetrics", "edgeControlsLayer"],
    trigger: () => st.bodyHeat >= 20,
    advance: () => st.refiningPulseActive
  },
  {
    chapter: "Ch4 — Body Takes Shape",
    title: "Assess the Furnace",
    targetId: "refiningPulseInfo",
    message: "Before committing again, read the furnace conversion. Whether the pulse is worth it depends on both efficiency and how heat responds to your state.",
    goal: "Keep Refining Pulse active through one tutorial update cycle.",
    revealIds: ["refiningPulseBtn", "refiningPulseInfo", "bodyHeatWarning", "drawRouteBtn", "confirmRouteBtn", "activeRouteDisplay", "routeMetrics", "edgeControlsLayer"],
    trigger: () => st.refiningPulseActive,
    advance: () => st.refiningPulseActive && st.bodyHeat > 20
  },
  {
    chapter: "Ch4 — Body Takes Shape",
    title: "The Cultivation Ledger",
    targetId: "cultivationPanelBody",
    message: "The ledger summarizes your passive strengths—steady flow, projection reach, and what your body generates on its own.",
    goal: "Open the first combat encounter gate.",
    revealIds: ["cultivationPanelBody"],
    trigger: () => st.refiningPulseActive || st.bodyHeat >= 30,
    advance: () => st.combatEncountered
  },
  {
    chapter: "Ch6 — First Blood",
    title: "Before the First Strike",
    targetId: "combatPanelBody",
    message: "Combat lays bare your attribute profile—what your cultivated self can actually do in the moment.",
    goal: "Reach prep, active, or summary combat.",
    revealIds: ["combatPanelBody"],
    trigger: () => st.combatEncountered,
    advance: () => st.combatPhase === "prep" || st.combatPhase === "active" || st.combatPhase === "summary"
  },
  {
    chapter: "Ch6 — First Blood",
    title: "Set Your Opening Rhythm",
    targetId: "combatPrepBody",
    message: "Preparation sets your rotation and energy priorities. This is where consistency begins—before the body meets pressure.",
    goal: "Start combat and reach active or summary state.",
    revealIds: ["combatPrepBody"],
    trigger: () => st.combatEncountered,
    advance: () => st.combatPhase === "active" || st.combatPhase === "summary"
  },
  {
    chapter: "Ch6 — First Blood",
    title: "Read the Battle Stream",
    targetId: "combatActiveBody",
    message: "Watch HP pools, cooldowns, and energy spend as the fight runs. Weak rhythms announce themselves in the gaps.",
    goal: "Generate 2+ combat log entries, or finish the fight.",
    revealIds: ["combatActiveBody"],
    trigger: () => st.combatPhase === "active" || st.combatPhase === "summary",
    advance: () => st.combatLog.length >= 2 || st.combatPhase === "summary"
  },
  {
    chapter: "Ch6 — First Blood",
    title: "Aftermath & Lessons",
    targetId: "combatSummaryBody",
    message: "The aftermath records outcome, your damage profile, and the insights earned. Review before you change your routes again.",
    goal: "Reach the combat summary.",
    revealIds: ["combatSummaryBody"],
    trigger: () => st.combatEncountered,
    advance: () => st.combatPhase === "summary"
  },
  {
    chapter: "Ch6 — First Blood",
    title: "Step Back to See the Body",
    targetId: "zoomHud",
    message: "Zoom lets you inspect bottlenecks against the full body’s current layout—especially before you repeat the loop.",
    goal: "Keep any combat phase visible while the zoom HUD is shown.",
    revealIds: ["zoomHud", "activeRouteDisplay"],
    trigger: () => st.combatEncountered,
    advance: () => st.combatPhase === "prep" || st.combatPhase === "active" || st.combatPhase === "summary"
  },
  {
    chapter: "Ch7 — Body Complete",
    title: "Choose Your Dao",
    targetId: "daoSelect",
    message: "A Dao defines your long-term growth axis. Choose one path before you deepen alchemy and refine your foundations.",
    goal: "Select a Dao path.",
    revealIds: ["daoSelect"],
    trigger: () => st.combatPhase === "summary" || st.combatEncountered,
    advance: () => !!st.daoSelected
  },
  {
    chapter: "Ch7 — Body Complete",
    title: "Your Dao Keeps Score",
    targetId: "daoSummary",
    message: "The Dao summary tracks your insight and comprehension as your body learns its chosen way.",
    goal: "Gain Dao insight or comprehension.",
    revealIds: ["daoSummary", "daoSelect"],
    trigger: () => !!st.daoSelected,
    advance: () => st.daoInsights > 0 || st.daoComprehensionLevel > 0
  },
  {
    chapter: "Ch7 — Body Complete",
    title: "Trace the Dao Lanes",
    targetId: "daoNodes",
    message: "Dao node states reveal path structure: active lanes, sealing lanes, and what remains locked for later.",
    goal: "Reveal the Dao node lane.",
    revealIds: ["daoNodes", "daoSummary"],
    trigger: () => !!st.daoSelected,
    advance: () => st.daoNodes.length > 0
  },
  {
    chapter: "Ch7 — Body Complete",
    title: "Gather Ingredients",
    targetId: "ingredientInventory",
    message: "Ingredients are your stored essence for formulas. Without them, refinement can’t begin.",
    goal: "Hold at least one ingredient stack.",
    revealIds: ["ingredientInventory"],
    trigger: () => !!st.daoSelected,
    advance: () => st.ingredientItems.some((entry) => entry.quantity > 0)
  },
  {
    chapter: "Ch7 — Body Complete",
    title: "Pick a Formula",
    targetId: "alchemyRecipeList",
    message: "Choose a formula by its tier and type—and by what you can actually afford with your current stores.",
    goal: "Select one alchemy recipe.",
    revealIds: ["alchemyRecipeList"],
    trigger: () => st.ingredientItems.some((entry) => entry.quantity > 0),
    advance: () => !!st.alchemySelectedRecipeId
  },
  {
    chapter: "Ch7 — Body Complete",
    title: "Filter What You Can Use",
    targetId: "alchemyFilterAvailable",
    message: "Filters quiet the mind: choose a type, narrow by tier, then keep only what is available right now.",
    goal: "Keep a recipe selected while filter controls are visible.",
    revealIds: ["alchemyRecipeList", "alchemyFilterType", "alchemyFilterTier", "alchemyFilterAvailable"],
    trigger: () => !!st.alchemySelectedRecipeId,
    advance: () => !!st.alchemySelectedRecipeId
  },
  {
    chapter: "Ch7 — Body Complete",
    title: "Set the Workbench Slots",
    targetId: "alchemySlots",
    message: "The slots mirror your formula’s composition. Begin mixing only once you can supply every required ingredient.",
    goal: "Enter MIXING or REFINING phase.",
    revealIds: ["alchemySlots", "alchemyQualityPreview", "alchemyPhase"],
    trigger: () => !!st.alchemySelectedRecipeId,
    advance: () => st.alchemyPhase === "MIXING" || st.alchemyPhase === "REFINING"
  },
  {
    chapter: "Ch7 — Body Complete",
    title: "Refine With Restraint",
    targetId: "alchemyRefineBtn",
    message: "Refinement spends YangQi to raise quality. Refine only while your YangQi remains healthy enough to stay safe in the next battle.",
    goal: "Reach 20+ alchemy quality.",
    revealIds: ["alchemyRefineBtn", "alchemyQualityPreview", "alchemyPhase"],
    trigger: () => st.alchemyPhase === "MIXING" || st.alchemyPhase === "REFINING",
    advance: () => st.alchemyQualityPreview >= 20
  },
  {
    chapter: "Ch8 — Infinite Path",
    title: "Stabilize the Map",
    targetId: "resetBodyView",
    message: "After the setup, steady your viewpoint. Reset the view to regain full-map context before the long cycles ahead.",
    goal: "Enable symbol mode to complete guided onboarding.",
    revealIds: ["resetBodyView"],
    trigger: () => st.alchemyQualityPreview >= 20 || st.alchemyPhase === "REFINING",
    advance: () => st.symbolModeEnabled
  },
  {
    chapter: "Ch8 — Infinite Path",
    title: "Great Circulation Achieved",
    targetId: "status",
    message: "The full loop is within you: circulation trains the channels, heat and pulse teach restraint, combat sharpens gains, Dao guides your axis, and alchemy deepens the foundation.",
    goal: "Maintain a 4+ node active route.",
    revealIds: ["status", "drawRouteBtn", "confirmRouteBtn", "activeRouteDisplay", "routeMetrics", "edgeControlsLayer"],
    trigger: () => st.symbolModeEnabled || st.activeBodyRouteNodeIds.length >= 4,
    advance: () => st.activeBodyRouteNodeIds.length >= 4
  }
];
let tutorialUiBound = false;

function ensureTutorialLockStyles(): void {
  if (document.getElementById("tutorialLockStyle")) return;
  // Unit tests use a minimal document mock; skip style injection when DOM APIs
  // aren't available.
  if (typeof (document as any).createElement !== "function") return;
  if (!(document as any).head) return;
  const style = document.createElement("style");
  style.id = "tutorialLockStyle";
  style.textContent = `
    .${LOCKED_CLASS} {
      display: none !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);
}

function visibleIdsForStep(stepIndex: number): Set<string> {
  const ids = new Set<string>(ALWAYS_VISIBLE_IDS);
  const step = tutorialSteps[stepIndex];
  if (!step) return ids;
  const queue = [step.targetId, ...step.revealIds];
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || ids.has(id)) continue;
    ids.add(id);
    const deps = VISIBILITY_DEPENDENCIES[id];
    if (deps) {
      for (const depId of deps) queue.push(depId);
    }
  }
  return ids;
}

function setElementLocked(elementId: string, locked: boolean): void {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (locked) el.classList.add(LOCKED_CLASS);
  else el.classList.remove(LOCKED_CLASS);
}

function applyTutorialUiLocks(stepIndex: number): void {
  ensureTutorialLockStyles();
  visibleTutorialIds = visibleIdsForStep(stepIndex);
  for (const id of TUTORIAL_LOCKABLE_IDS) {
    const locked = !visibleTutorialIds.has(id);
    setElementLocked(id, locked);
  }
}

function unlockAllTutorialUi(): void {
  for (const id of TUTORIAL_LOCKABLE_IDS) setElementLocked(id, false);
}

function hideTutorialOverlay() {
  tutorialOverlayEl?.classList.add("hidden");
}

function showTutorialOverlay() {
  tutorialOverlayEl?.classList.remove("hidden");
}

function locateTargetElement(step: TutorialStep): HTMLElement | null {
  const element = document.getElementById(step.targetId);
  // Unit tests use a minimal document mock. When the target isn't present,
  // fall back to the tutorial card so the overlay can still render.
  if (!element) return tutorialCardEl ?? null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const style = typeof window !== "undefined" && "getComputedStyle" in window
    ? window.getComputedStyle(element)
    : null;
  if (style && (style.display === "none" || style.visibility === "hidden")) {
    return null;
  }
  return element;
}

function positionOverlay(step: TutorialStep, targetEl: HTMLElement): void {
  const rect = targetEl.getBoundingClientRect();
  const padding = 8;
  const left = Math.max(0, rect.left - padding);
  const top = Math.max(0, rect.top - padding);
  const width = Math.max(24, rect.width + padding * 2);
  const height = Math.max(24, rect.height + padding * 2);
  tutorialHighlightEl?.setAttribute(
    "style",
    `left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;width:${width.toFixed(1)}px;height:${height.toFixed(1)}px;`
  );
  const cardTop = Math.min(window.innerHeight - 220, top + height + 12);
  const cardLeft = Math.min(window.innerWidth - 380, Math.max(16, left));
  tutorialCardEl?.setAttribute("style", `top:${cardTop.toFixed(1)}px;left:${cardLeft.toFixed(1)}px;`);
}

function completeTutorial() {
  st.tutorial.active = false;
  st.tutorial.completed = true;
  hideTutorialOverlay();
  unlockAllTutorialUi();
}

function currentStep(): TutorialStep | null {
  if (st.tutorial.stepIndex < 0 || st.tutorial.stepIndex >= tutorialSteps.length) return null;
  return tutorialSteps[st.tutorial.stepIndex];
}

function renderTutorialStep(step: TutorialStep, canAdvance: boolean): void {
  if (tutorialTitleEl) tutorialTitleEl.textContent = `${step.chapter}: ${step.title}`;
  if (tutorialMessageEl) tutorialMessageEl.textContent = `${step.message} Goal: ${step.goal}`;
  if (tutorialStepCounterEl) tutorialStepCounterEl.textContent = `Step ${st.tutorial.stepIndex + 1} / ${tutorialSteps.length}`;
  if (tutorialNextBtnEl) tutorialNextBtnEl.toggleAttribute("disabled", !canAdvance);
  if (tutorialSkipBtnEl) tutorialSkipBtnEl.toggleAttribute("hidden", st.tutorial.stepIndex < 5);
}

function tryAdvance() {
  const step = currentStep();
  if (!step) {
    completeTutorial();
    return;
  }
  if (!step.advance()) return;
  st.tutorial.stepIndex += 1;
  if (st.tutorial.stepIndex >= tutorialSteps.length) {
    completeTutorial();
  }
}

function skipTutorial() {
  st.tutorial.active = false;
  st.tutorial.suppressed = true;
  hideTutorialOverlay();
  unlockAllTutorialUi();
}

export function resetTutorial(): void {
  st.tutorial.active = true;
  st.tutorial.suppressed = false;
  st.tutorial.completed = false;
  st.tutorial.stepIndex = 0;
  applyTutorialUiLocks(0);
}

export function applyTutorialSuppressionForReturningPlayer(): void {
  if (st.tickCounter > 1000) {
    st.tutorial.active = false;
    st.tutorial.suppressed = true;
    st.tutorial.completed = true;
    unlockAllTutorialUi();
  }
}

export function bindTutorialUi(): void {
  if (tutorialUiBound) {
    return;
  }
  tutorialUiBound = true;
  tutorialNextBtnEl?.addEventListener("click", () => {
    tryAdvance();
  });
  tutorialSkipBtnEl?.addEventListener("click", () => {
    skipTutorial();
  });
  resetTutorialBtnEl?.addEventListener("click", () => {
    resetTutorial();
    showTutorialOverlay();
  });
}

export function stepTutorialSystem(): void {
  if (!st.tutorial.active || st.tutorial.suppressed || st.tutorial.completed) {
    hideTutorialOverlay();
    unlockAllTutorialUi();
    return;
  }
  const step = currentStep();
  if (!step) {
    completeTutorial();
    return;
  }
  applyTutorialUiLocks(st.tutorial.stepIndex);
  if (!step.trigger()) {
    hideTutorialOverlay();
    return;
  }
  const target = locateTargetElement(step);
  if (!target) {
    hideTutorialOverlay();
    return;
  }
  const canAdvance = step.advance();
  renderTutorialStep(step, canAdvance);
  positionOverlay(step, target);
  showTutorialOverlay();
}
