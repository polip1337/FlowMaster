import { beforeEach, describe, expect, it, vi } from "vitest";

type MockElement = {
  style: { display: string };
  textContent: string;
  checked?: boolean;
  addEventListener?: (event: string, handler: () => void) => void;
  dispatchChange?: () => void;
};

function makeDocumentMock() {
  const listeners = new Map<string, () => void>();
  const elements = new Map<string, MockElement>();

  elements.set("clusterRepairRow", {
    style: { display: "none" },
    textContent: ""
  });
  elements.set("bodyJingPoolLabel", {
    style: { display: "" },
    textContent: ""
  });
  elements.set("directJingToggle", {
    style: { display: "" },
    textContent: "",
    checked: false,
    addEventListener: (event: string, handler: () => void) => {
      if (event === "change") listeners.set(event, handler);
    },
    dispatchChange: () => {
      listeners.get("change")?.();
    }
  });

  return {
    getElementById(id: string) {
      return elements.get(id) ?? null;
    },
    elements
  };
}

async function loadClusterView() {
  const documentMock = makeDocumentMock();
  vi.stubGlobal("document", documentMock as unknown as { getElementById: (id: string) => MockElement | null });
  vi.stubGlobal("window", { z: undefined, Zod: undefined } as { z?: unknown; Zod?: unknown });
  const module = await import("../../src/app/cluster-view.ts");
  return { module, documentMock };
}

describe("phase 27 cluster view", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("blends per-node orb color using energy composition ratios", async () => {
    const { module } = await loadClusterView();
    const color = module.mixEnergyOrbColor({
      energyQi: 75,
      energyJing: 25,
      energyYangQi: 0,
      energyShen: 0
    });
    expect(color).toBe(0x82b1cb);
  });

  it("returns null blend color for empty pool nodes", async () => {
    const { module } = await loadClusterView();
    const color = module.mixEnergyOrbColor({
      energyQi: 0,
      energyJing: 0,
      energyYangQi: 0,
      energyShen: 0
    });
    expect(color).toBeNull();
  });

  it("computes refinement ring progress and clamps at max quality", async () => {
    const { module } = await loadClusterView();
    expect(module.refinementRingProgress({ quality: 1, refinementPoints: 50 })).toBeCloseTo(0.5, 6);
    expect(module.refinementRingProgress({ quality: 10, refinementPoints: 0 })).toBe(1);
  });

  it("shows direct Jing repair row only for damaged nodes", async () => {
    const { module, documentMock } = await loadClusterView();
    const row = documentMock.elements.get("clusterRepairRow")!;
    const label = documentMock.elements.get("bodyJingPoolLabel")!;

    module.updateClusterRepairDom([{ damageState: "healthy" }]);
    expect(row.style.display).toBe("none");

    module.updateClusterRepairDom([{ damageState: "cracked" }]);
    expect(row.style.display).toBe("flex");
    expect(label.textContent).toContain("Body Jing pool:");
  });

  it("binds direct Jing toggle and applies active repair with Jing drain", async () => {
    const { module, documentMock } = await loadClusterView();
    const toggle = documentMock.elements.get("directJingToggle")!;

    module.bindClusterRepairUi();
    toggle.checked = true;
    toggle.dispatchChange?.();

    const damagedNode = { damageState: "cracked", repairAccumulator: 0 };
    const stateModule = await import("../../src/app/state.ts");
    stateModule.st.bodyJingPool = 20;
    module.stepDirectJingRepair([damagedNode]);

    expect(stateModule.st.directJingRepairActive).toBe(true);
    expect(stateModule.st.bodyJingPool).toBeCloseTo(18.2, 6);
    expect(damagedNode.repairAccumulator).toBe(1);
  });
});
