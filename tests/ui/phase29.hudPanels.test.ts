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
    style: { setProperty: vi.fn() as any },
    classList: {
      toggle: vi.fn(),
      contains: vi.fn(() => false)
    },
    setAttribute(name: string, value: string) {
      attrs.set(name, value);
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
  const docListeners = new Map<string, Listener[]>();
  const ids = [
    "status",
    "bodyHeatGauge",
    "bodyHeatLabel",
    "bodyHeatWarning",
    "cultivationPanelBody",
    "combatPanelBody",
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
    "ingredientInventory"
  ];
  for (const id of ids) elements.set(id, makeElement());
  return {
    getElementById(id: string) {
      return elements.get(id) ?? null;
    },
    addEventListener(event: string, fn: Listener) {
      const list = docListeners.get(event) ?? [];
      list.push(fn);
      docListeners.set(event, list);
    },
    fireKey(key: string) {
      for (const fn of docListeners.get("keydown") ?? []) fn({ key, repeat: false });
    },
    querySelector: () => null
  };
}

async function loadPhase29Module() {
  const documentMock = makeDocumentMock();
  vi.stubGlobal("document", documentMock as unknown as Document);
  vi.stubGlobal("window", { z: undefined, Zod: undefined } as { z?: unknown; Zod?: unknown });
  const stateModule = await import("../../js/app/state.ts");
  const mod = await import("../../js/app/phase29-panels.ts");
  return { mod, stateModule, documentMock };
}

describe("phase 29 hud and panels", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("maps body heat thresholds into expected zones", async () => {
    const { mod } = await loadPhase29Module();
    expect(mod.heatZoneFor(30, 100)).toBe("green");
    expect(mod.heatZoneFor(50, 100)).toBe("yellow");
    expect(mod.heatZoneFor(70, 100)).toBe("orange");
    expect(mod.heatZoneFor(90, 100)).toBe("red");
  });

  it("toggles refining pulse from R shortcut when available", async () => {
    const { mod, stateModule } = await loadPhase29Module();
    stateModule.st.visibleNodeIds = new Set([0, 1, 2, 3, 4, 5, 6]);
    stateModule.st.bodyHeat = 10;
    mod.updatePhase29Panels();
    mod.onPhase29KeyDown({ key: "r", repeat: false } as KeyboardEvent);
    expect(stateModule.st.refiningPulseActive).toBe(true);
  });

  it("binds key logic and unlocks combat panel on C", async () => {
    const { mod, stateModule, documentMock } = await loadPhase29Module();
    stateModule.st.combatEncountered = false;
    mod.bindPhase29PanelUi();
    documentMock.fireKey("c");
    expect(stateModule.st.combatEncountered).toBe(true);
  });

  it("consumes selected inventory item when applying to body-map target", async () => {
    const { mod, stateModule } = await loadPhase29Module();
    stateModule.st.selectedInventoryItemId = "pill_qi";
    stateModule.st.inventoryTargetingActive = true;
    const ok = mod.applyInventoryToTier2Target("heart");
    const item = stateModule.st.inventoryItems.find((entry: any) => entry.id === "pill_qi");
    expect(ok).toBe(true);
    expect(item?.quantity).toBe(1);
    expect(stateModule.st.inventoryTargetingActive).toBe(false);
  });
});
