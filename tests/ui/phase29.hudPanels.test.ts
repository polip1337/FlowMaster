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
  const docListeners = new Map<string, Listener[]>();
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
  const stateModule = await import("../../src/app/state.ts");
  const mod = await import("../../src/app/phase29-panels.ts");
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

  it("bind panel ui idempotently to avoid duplicate key handlers", async () => {
    const { mod, stateModule, documentMock } = await loadPhase29Module();
    stateModule.st.visibleNodeIds = new Set([0, 1, 2, 3, 4, 5, 6]);
    stateModule.st.bodyHeat = 10;
    mod.updatePhase29Panels();
    mod.bindPhase29PanelUi();
    mod.bindPhase29PanelUi();
    documentMock.fireKey("r");
    expect(stateModule.st.refiningPulseActive).toBe(true);
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

  it("renders pre-combat setup view and enters active combat", async () => {
    const { mod, stateModule, documentMock } = await loadPhase29Module();
    mod.bindPhase29PanelUi();
    stateModule.st.combatEncountered = true;
    stateModule.st.combatPhase = "prep";
    mod.updatePhase29Panels();
    const prepEl = documentMock.getElementById("combatPrepBody");
    expect(prepEl.innerHTML).toContain("Rotation Builder");
    prepEl.dispatch("click", { target: { id: "startCombatBtn", closest: () => null } });
    expect(stateModule.st.combatPhase).toBe("active");
    mod.updatePhase29Panels();
    const activeEl = documentMock.getElementById("combatActiveBody");
    expect(activeEl.innerHTML).toContain("Current Skill");
    expect(activeEl.innerHTML).toContain("combatLogView");
  });

  it("raises crack alert and produces summary after active combat ticks", async () => {
    const { mod, stateModule, documentMock } = await loadPhase29Module();
    stateModule.st.combatEncountered = true;
    stateModule.st.combatPhase = "active";
    stateModule.st.combatEnemyHp = 10;
    stateModule.st.combatEnemyMaxHp = 180;
    stateModule.st.combatPlayerHp = 180;
    stateModule.st.combatPlayerMaxHp = 180;
    stateModule.st.combatSkillCooldownTicks = 7;
    (await import("../../src/app/config.ts")).nodeData[1].damageState = "cracked";
    mod.stepPhase29UiSystems();
    mod.updatePhase29Panels();
    const alertEl = documentMock.getElementById("combatNodeDamageAlert");
    expect(alertEl.textContent).toContain("Node cracked");
    expect(stateModule.st.combatSummary).not.toBeNull();
    const summaryEl = documentMock.getElementById("combatSummaryBody");
    expect(summaryEl.innerHTML).toContain("Outcome");
    (await import("../../src/app/config.ts")).nodeData[1].damageState = "healthy";
  });

  it("renders alchemy workbench, recipe browser, and highlights required ingredients", async () => {
    const { mod, stateModule, documentMock } = await loadPhase29Module();
    mod.bindPhase29PanelUi();
    mod.updatePhase29Panels();
    const recipeListEl = documentMock.getElementById("alchemyRecipeList");
    expect(recipeListEl.innerHTML).toContain("Available");
    const recipeId = "essence-condensation:basic";
    recipeListEl.dispatch("click", {
      target: {
        closest: () => ({ getAttribute: () => recipeId })
      }
    });
    mod.updatePhase29Panels();
    expect(stateModule.st.alchemySelectedRecipeId).toBe(recipeId);
    const ingredientsEl = documentMock.getElementById("ingredientInventory");
    expect(ingredientsEl.innerHTML).toContain("phase31-ingredient-highlight");
  });

  it("escapes untrusted panel strings before writing innerHTML", async () => {
    const { mod, stateModule, documentMock } = await loadPhase29Module();
    stateModule.st.combatEncountered = true;
    stateModule.st.combatPhase = "active";
    stateModule.st.combatLog = [`<img src=x onerror=alert(1)>`];
    stateModule.st.daoNodes = [{ id: "x", name: "<svg/onload=1>", state: "<b>ACTIVE</b>" as unknown as "ACTIVE" }];
    stateModule.st.daoSkills = ["<script>alert(1)</script>"];
    mod.updatePhase29Panels();
    const combatActiveEl = documentMock.getElementById("combatActiveBody");
    const daoNodesEl = documentMock.getElementById("daoNodes");
    const daoSkillsEl = documentMock.getElementById("daoSkills");
    expect(combatActiveEl.innerHTML).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(daoNodesEl.innerHTML).toContain("&lt;svg/onload=1&gt;");
    expect(daoSkillsEl.innerHTML).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("filters alchemy recipes and refines quality by spending YangQi", async () => {
    const { mod, stateModule, documentMock } = await loadPhase29Module();
    mod.bindPhase29PanelUi();
    stateModule.st.alchemySelectedRecipeId = "stone-hardening:basic";
    mod.updatePhase29Panels();
    const qualityEl = documentMock.getElementById("alchemyQualityPreview");
    qualityEl.dispatch("click", { target: { id: "alchemyStartMixingBtn" } });
    qualityEl.dispatch("click", { target: { id: "alchemyAdvanceRefiningBtn" } });
    const preQuality = stateModule.st.alchemyQualityPreview;
    const preYangQi = stateModule.st.combatEnergyPool.yangQi;
    const refineEl = documentMock.getElementById("alchemyRefineBtn");
    refineEl.dispatch("click");
    expect(stateModule.st.alchemyQualityPreview).toBeGreaterThan(preQuality);
    expect(stateModule.st.combatEnergyPool.yangQi).toBe(preYangQi - 5);

    const filterTierEl = documentMock.getElementById("alchemyFilterTier");
    filterTierEl.value = "transcendent";
    filterTierEl.dispatch("change");
    expect(documentMock.getElementById("alchemyRecipeList").innerHTML).toContain("Tier: transcendent");
  });
});
