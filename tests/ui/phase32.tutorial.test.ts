import { beforeEach, describe, expect, it, vi } from "vitest";

type Listener = (event?: any) => void;

function makeElement(id = "") {
  const listeners = new Map<string, Listener[]>();
  const attrs = new Map<string, string>();
  const classes = new Set<string>();
  return {
    id,
    textContent: "",
    innerHTML: "",
    disabled: false,
    offsetParent: {},
    style: {},
    classList: {
      add: (name: string) => classes.add(name),
      remove: (name: string) => classes.delete(name),
      contains: (name: string) => classes.has(name),
      toggle: (name: string, force?: boolean) => {
        if (force === true) {
          classes.add(name);
          return true;
        }
        if (force === false) {
          classes.delete(name);
          return false;
        }
        if (classes.has(name)) {
          classes.delete(name);
          return false;
        }
        classes.add(name);
        return true;
      }
    },
    setAttribute(name: string, value: string) {
      attrs.set(name, value);
    },
    getAttribute(name: string) {
      return attrs.get(name) ?? null;
    },
    removeAttribute(name: string) {
      attrs.delete(name);
    },
    toggleAttribute(name: string, force?: boolean) {
      if (force === false) attrs.delete(name);
      else attrs.set(name, "");
    },
    addEventListener(event: string, fn: Listener) {
      const list = listeners.get(event) ?? [];
      list.push(fn);
      listeners.set(event, list);
    },
    dispatch(event: string, payload?: any) {
      for (const fn of listeners.get(event) ?? []) fn(payload);
    },
    getBoundingClientRect() {
      return { left: 120, top: 80, width: 140, height: 46 };
    }
  };
}

function makeDocumentMock() {
  const elements = new Map<string, any>();
  const ids = [
    "status",
    "ticks",
    "drawRouteBtn",
    "confirmRouteBtn",
    "activeRouteDisplay",
    "routeMetrics",
    "bodyHeatGauge",
    "refiningPulseBtn",
    "combatPanelBody",
    "zoomHud",
    "combatPrepBody",
    "combatActiveBody",
    "daoSelect",
    "daoSummary",
    "ingredientInventory",
    "alchemyRecipeList",
    "alchemyQualityPreview",
    "alchemyRefineBtn",
    "resetBodyView",
    "tutorialOverlay",
    "tutorialHighlight",
    "tutorialCard",
    "tutorialTitle",
    "tutorialMessage",
    "tutorialStepCounter",
    "tutorialNextBtn",
    "tutorialSkipBtn",
    "resetTutorialBtn"
  ];
  for (const id of ids) {
    elements.set(id, makeElement(id));
  }
  return {
    getElementById(id: string) {
      return elements.get(id) ?? null;
    }
  };
}

async function loadTutorialModule() {
  const documentMock = makeDocumentMock();
  vi.stubGlobal("document", documentMock as unknown as Document);
  vi.stubGlobal("window", { innerHeight: 900, innerWidth: 1400 } as unknown as Window);
  const stateModule = await import("../../src/app/state.ts");
  const tutorialModule = await import("../../src/app/tutorial.ts");
  return { stateModule, tutorialModule, documentMock };
}

describe("phase 32 tutorial and onboarding", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("suppresses tutorial for returning players over tick threshold", async () => {
    const { stateModule, tutorialModule } = await loadTutorialModule();
    stateModule.st.tickCounter = 1001;
    tutorialModule.applyTutorialSuppressionForReturningPlayer();
    expect(stateModule.st.tutorial.suppressed).toBe(true);
    expect(stateModule.st.tutorial.active).toBe(false);
  });

  it("shows overlay for first step and advances only when condition passes", async () => {
    const { stateModule, tutorialModule, documentMock } = await loadTutorialModule();
    stateModule.st.tickCounter = 0;
    tutorialModule.bindTutorialUi();
    tutorialModule.stepTutorialSystem();
    const overlay = documentMock.getElementById("tutorialOverlay");
    expect(overlay.classList.contains("hidden")).toBe(false);
    const nextBtn = documentMock.getElementById("tutorialNextBtn");
    expect(nextBtn.getAttribute("disabled")).toBe("");
    stateModule.st.tickCounter = 5;
    tutorialModule.stepTutorialSystem();
    expect(nextBtn.getAttribute("disabled")).toBeNull();
    nextBtn.dispatch("click");
    expect(stateModule.st.tutorial.stepIndex).toBe(1);
  });

  it("unlocks skip option after step five and allows suppression", async () => {
    const { stateModule, tutorialModule, documentMock } = await loadTutorialModule();
    tutorialModule.bindTutorialUi();
    stateModule.st.tutorial.stepIndex = 5;
    stateModule.st.activeBodyRouteNodeIds = ["root", "heart", "ajna"];
    tutorialModule.stepTutorialSystem();
    const skipBtn = documentMock.getElementById("tutorialSkipBtn");
    expect(skipBtn.getAttribute("hidden")).toBeNull();
    skipBtn.dispatch("click");
    expect(stateModule.st.tutorial.suppressed).toBe(true);
    expect(stateModule.st.tutorial.active).toBe(false);
  });

  it("reset tutorial button restores onboarding sequence", async () => {
    const { stateModule, tutorialModule, documentMock } = await loadTutorialModule();
    tutorialModule.bindTutorialUi();
    stateModule.st.tutorial.active = false;
    stateModule.st.tutorial.suppressed = true;
    stateModule.st.tutorial.completed = true;
    stateModule.st.tutorial.stepIndex = 9;
    documentMock.getElementById("resetTutorialBtn").dispatch("click");
    expect(stateModule.st.tutorial.active).toBe(true);
    expect(stateModule.st.tutorial.suppressed).toBe(false);
    expect(stateModule.st.tutorial.completed).toBe(false);
    expect(stateModule.st.tutorial.stepIndex).toBe(0);
  });

  it("binds tutorial UI idempotently to avoid double-advance", async () => {
    const { stateModule, tutorialModule, documentMock } = await loadTutorialModule();
    stateModule.st.tickCounter = 5;
    tutorialModule.bindTutorialUi();
    tutorialModule.bindTutorialUi();
    tutorialModule.stepTutorialSystem();
    documentMock.getElementById("tutorialNextBtn").dispatch("click");
    expect(stateModule.st.tutorial.stepIndex).toBe(1);
  });
});
