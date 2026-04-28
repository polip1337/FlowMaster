import { edges, nodeData } from "./config.ts";
import {
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
} from "./state.ts";

type TutorialStep = {
  chapter: string;
  title: string;
  targetId: string;
  message: string;
  trigger: () => boolean;
  advance: () => boolean;
};

function unlockedNodeCount(): number {
  return nodeData.filter((node) => node.unlocked).length;
}

function hasAnyFlow(): boolean {
  return edges.some((edge) => edge.flow > 0);
}

export const tutorialSteps: TutorialStep[] = [
  {
    chapter: "Chapter 1",
    title: "Awaken T1 Node",
    targetId: "ticks",
    message: "Welcome, cultivator. Let the meridians breathe for a few ticks.",
    trigger: () => st.tickCounter >= 0,
    advance: () => st.tickCounter >= 5
  },
  {
    chapter: "Chapter 1",
    title: "Activate First Node",
    targetId: "status",
    message: "Unlock your first T1 node to begin circulation.",
    trigger: () => st.tickCounter >= 5,
    advance: () => unlockedNodeCount() >= 2
  },
  {
    chapter: "Chapter 2",
    title: "Open Meridian Controls",
    targetId: "drawRouteBtn",
    message: "Prepare a path by entering route drawing mode.",
    trigger: () => unlockedNodeCount() >= 2,
    advance: () => st.routeDrawingMode || st.routeDraftNodeIds.length > 0
  },
  {
    chapter: "Chapter 2",
    title: "Confirm First I/O Link",
    targetId: "confirmRouteBtn",
    message: "Confirm your route to establish first flow input/output.",
    trigger: () => st.routeDrawingMode || st.routeDraftNodeIds.length > 0,
    advance: () => st.activeBodyRouteNodeIds.length >= 2 || hasAnyFlow()
  },
  {
    chapter: "Chapter 3",
    title: "Form First Loop",
    targetId: "activeRouteDisplay",
    message: "Sustain your first loop. Stable routes empower progression.",
    trigger: () => st.activeBodyRouteNodeIds.length >= 2 || hasAnyFlow(),
    advance: () => st.activeBodyRouteNodeIds.length >= 3
  },
  {
    chapter: "Chapter 3",
    title: "Route Quality",
    targetId: "routeMetrics",
    message: "Inspect bottlenecks and keep loop efficiency climbing.",
    trigger: () => st.activeBodyRouteNodeIds.length >= 2,
    advance: () => st.activeBodyRouteNodeIds.length >= 3
  },
  {
    chapter: "Chapter 4",
    title: "Watch Yang Qi Heat",
    targetId: "bodyHeatGauge",
    message: "Heat rises with aggressive refinement. Stay below danger bands.",
    trigger: () => st.bodyHeat > 0,
    advance: () => st.bodyHeat >= 20
  },
  {
    chapter: "Chapter 4",
    title: "Trigger Refining Pulse",
    targetId: "refiningPulseBtn",
    message: "Use refining pulse once to feel the Yang Qi conversion tempo.",
    trigger: () => st.bodyHeat >= 20,
    advance: () => st.refiningPulseActive
  },
  {
    chapter: "Chapter 5",
    title: "Balance Shen Focus",
    targetId: "combatPanelBody",
    message: "Shen balance starts in combat prep and soul pressure awareness.",
    trigger: () => st.refiningPulseActive || st.bodyHeat >= 30,
    advance: () => st.combatEncountered
  },
  {
    chapter: "Chapter 5",
    title: "Ajna Awareness",
    targetId: "zoomHud",
    message: "Use zoom and perspective to monitor broader state flow alignment.",
    trigger: () => st.combatEncountered,
    advance: () => st.combatPhase === "prep" || st.combatPhase === "active" || st.combatPhase === "summary"
  },
  {
    chapter: "Chapter 6",
    title: "Enter First Combat",
    targetId: "combatPrepBody",
    message: "Your first combat tests meridian stability under pressure.",
    trigger: () => st.combatEncountered,
    advance: () => st.combatPhase === "active" || st.combatPhase === "summary"
  },
  {
    chapter: "Chapter 6",
    title: "Read Combat Telemetry",
    targetId: "combatActiveBody",
    message: "Track skill rotation and energy pools while fighting.",
    trigger: () => st.combatPhase === "active" || st.combatPhase === "summary",
    advance: () => st.combatLog.length >= 2 || st.combatPhase === "summary"
  },
  {
    chapter: "Chapter 7",
    title: "Select Your Dao",
    targetId: "daoSelect",
    message: "Choose a Dao path to define long-term cultivation identity.",
    trigger: () => st.combatPhase === "summary" || st.combatEncountered,
    advance: () => !!st.daoSelected
  },
  {
    chapter: "Chapter 7",
    title: "Review Dao Progress",
    targetId: "daoSummary",
    message: "Monitor Dao insights and comprehension gains as you advance.",
    trigger: () => !!st.daoSelected,
    advance: () => st.daoInsights > 0 || st.daoComprehensionLevel > 0
  },
  {
    chapter: "Chapter 8",
    title: "Prepare Great Circulation",
    targetId: "ingredientInventory",
    message: "Gather ingredients to support sustained macro-circulation growth.",
    trigger: () => !!st.daoSelected,
    advance: () => st.ingredientItems.some((entry) => entry.quantity > 0)
  },
  {
    chapter: "Chapter 8",
    title: "Open Alchemy Paths",
    targetId: "alchemyRecipeList",
    message: "Choose alchemy recipes that reinforce your circulation strategy.",
    trigger: () => st.ingredientItems.some((entry) => entry.quantity > 0),
    advance: () => !!st.alchemySelectedRecipeId
  },
  {
    chapter: "Chapter 8",
    title: "Start Refinement Cycle",
    targetId: "alchemyQualityPreview",
    message: "Enter mixing and refining to begin great circulation throughput.",
    trigger: () => !!st.alchemySelectedRecipeId,
    advance: () => st.alchemyPhase === "MIXING" || st.alchemyPhase === "REFINING"
  },
  {
    chapter: "Chapter 8",
    title: "Refine Core Output",
    targetId: "alchemyRefineBtn",
    message: "Spend Yang Qi to refine quality and amplify your cycle.",
    trigger: () => st.alchemyPhase === "MIXING" || st.alchemyPhase === "REFINING",
    advance: () => st.alchemyQualityPreview >= 20 || st.alchemyPhase === "REFINING"
  },
  {
    chapter: "Chapter 8",
    title: "Stabilize the View",
    targetId: "resetBodyView",
    message: "Reset body view to keep the full circulation map readable.",
    trigger: () => st.alchemyQualityPreview >= 20 || st.alchemyPhase === "REFINING",
    advance: () => st.symbolModeEnabled
  },
  {
    chapter: "Chapter 8",
    title: "Great Circulation Achieved",
    targetId: "status",
    message: "You have completed the opening guidance. Continue forging your Dao.",
    trigger: () => st.symbolModeEnabled || st.activeBodyRouteNodeIds.length >= 4,
    advance: () => st.activeBodyRouteNodeIds.length >= 4
  }
];
let tutorialUiBound = false;

function hideTutorialOverlay() {
  tutorialOverlayEl?.classList.add("hidden");
}

function showTutorialOverlay() {
  tutorialOverlayEl?.classList.remove("hidden");
}

function locateTargetElement(step: TutorialStep): HTMLElement | null {
  const element = document.getElementById(step.targetId);
  if (!element) return null;
  if (element.offsetParent === null && element.id !== "status") {
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
}

function currentStep(): TutorialStep | null {
  if (st.tutorial.stepIndex < 0 || st.tutorial.stepIndex >= tutorialSteps.length) return null;
  return tutorialSteps[st.tutorial.stepIndex];
}

function renderTutorialStep(step: TutorialStep, canAdvance: boolean): void {
  if (tutorialTitleEl) tutorialTitleEl.textContent = `${step.chapter}: ${step.title}`;
  if (tutorialMessageEl) tutorialMessageEl.textContent = step.message;
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
}

export function resetTutorial(): void {
  st.tutorial.active = true;
  st.tutorial.suppressed = false;
  st.tutorial.completed = false;
  st.tutorial.stepIndex = 0;
}

export function applyTutorialSuppressionForReturningPlayer(): void {
  if (st.tickCounter > 1000) {
    st.tutorial.active = false;
    st.tutorial.suppressed = true;
    st.tutorial.completed = true;
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
    return;
  }
  const step = currentStep();
  if (!step) {
    completeTutorial();
    return;
  }
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
