import { beforeEach, describe, expect, it, vi } from "vitest";

type Listener = (event?: any) => void;

function makeElement() {
  const listeners = new Map<string, Listener[]>();
  const attrs = new Map<string, string>();
  return {
    innerHTML: "",
    textContent: "",
    disabled: false,
    value: "",
    checked: false,
    style: { setProperty: vi.fn() as any },
    classList: {
      toggle: vi.fn(),
      contains: vi.fn(() => false)
    },
    setAttribute(name: string, value: string) {
      attrs.set(name, value);
    },
    removeAttribute(name: string) {
      attrs.delete(name);
    },
    getAttribute(name: string) {
      return attrs.get(name) ?? null;
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
    }
  };
}

function makeDocumentMock() {
  const elements = new Map<string, any>();
  const ids = [
    "status",
    "bodyHeatGauge",
    "bodyHeatLabel",
    "bodyHeatWarning",
    "cultivationPanelBody",
    "combatPanelBody",
    "combatPrepBody",
    "combatActiveBody",
    "combatSummaryBody",
    "combatNodeDamageAlert",
    "refiningPulseBtn",
    "refiningPulseInfo",
    "activeRouteDisplay",
    "stopRouteBtn",
    "temperingLevel",
    "temperingXp",
    "temperingAction",
    "temperingBonuses",
    "daoSummary",
    "daoSelect",
    "daoNodes",
    "daoSkills",
    "inventoryGrid",
    "inventoryDetail",
    "ingredientInventory",
    "alchemySlots",
    "alchemyPhase",
    "alchemyQualityPreview",
    "alchemyRefineBtn",
    "alchemyRecipeList",
    "alchemyFilterType",
    "alchemyFilterTier",
    "alchemyFilterAvailable",
    "celestialCalendarWidget",
    "sectPanelBody"
  ];
  for (const id of ids) elements.set(id, makeElement());
  return {
    getElementById(id: string) {
      return elements.get(id) ?? null;
    },
    addEventListener() {},
    querySelector: () => null
  };
}

async function loadPhase29Module() {
  const documentMock = makeDocumentMock();
  vi.stubGlobal("document", documentMock as unknown as Document);
  vi.stubGlobal("window", { z: undefined, Zod: undefined } as { z?: unknown; Zod?: unknown });
  const stateModule = await import("../../src/app/state.ts");
  const coreBridge = await import("../../src/app/core-bridge.ts");
  const mod = await import("../../src/app/phase29-panels.ts");
  return { mod, stateModule, documentMock, coreBridge };
}

describe("phase 33 celestial + sect ui", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("renders celestial widget with season, conjunctions, and peak countdown rows", async () => {
    const { mod, stateModule, documentMock } = await loadPhase29Module();
    stateModule.st.celestialSeason = "Winter";
    stateModule.st.celestialDayOfYear = 44;
    stateModule.st.celestialBodies = [
      { id: "CB_MULADHARA", linkedT2NodeId: "MULADHARA", currentSign: "Peak" },
      { id: "CB_ANAHATA", linkedT2NodeId: "ANAHATA", currentSign: "Waning" }
    ];
    stateModule.st.celestialActiveConjunctions = ["CB_MULADHARA", "CB_ANAHATA"];
    stateModule.st.t2NodeRanks = { MULADHARA: 2, ANAHATA: 1, MANIPURA: 1 };
    mod.updatePhase29Panels();
    const widget = documentMock.getElementById("celestialCalendarWidget");
    expect(widget.innerHTML).toContain("WINTER");
    expect(widget.innerHTML).toContain("Day 45 / 364");
    expect(widget.innerHTML).toContain("Muladhara");
  });

  it("renders sect panel and joins a sect through bridge action", async () => {
    const { mod, stateModule, documentMock, coreBridge } = await loadPhase29Module();
    coreBridge.initializeCoreBridgeFromUi();
    mod.bindPhase29PanelUi();
    mod.updatePhase29Panels();
    const sectPanelEl = documentMock.getElementById("sectPanelBody");
    expect(sectPanelEl.innerHTML).toContain("The Iron Foundation Sect");
    sectPanelEl.dispatch("click", {
      target: {
        closest: () => ({ getAttribute: () => "iron-foundation-sect" })
      }
    });
    expect(stateModule.st.sectJoinedId).toBe("iron-foundation-sect");
    mod.updatePhase29Panels();
    expect(documentMock.getElementById("sectPanelBody").innerHTML).toContain("Joined");
  });
});
