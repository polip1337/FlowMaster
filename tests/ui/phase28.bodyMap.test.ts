import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadBodyMapModule() {
  vi.stubGlobal("document", {
    getElementById: () => null
  } as unknown as Document);
  vi.stubGlobal("window", { z: undefined, Zod: undefined } as { z?: unknown; Zod?: unknown });
  const stateModule = await import("../../js/app/state.ts");
  const mod = await import("../../js/app/body-map.ts");
  return { mod, stateModule };
}

describe("phase 28 body map ui helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("computes route metrics from established meridians", async () => {
    const { mod } = await loadBodyMapModule();
    const meridians = new Map<string, any>([
      ["A->B", { isEstablished: true, width: 3, purity: 0.8 }],
      ["B->C", { isEstablished: true, width: 1.5, purity: 0.6 }]
    ]);
    const out = mod.getRouteDraftMetrics(["A", "B", "C"], meridians);
    expect(out.efficiency).toBeCloseTo(0.66, 6);
    expect(out.bottleneck).toBe("B->C");
    expect(out.heat).toBeGreaterThan(0);
  });

  it("closes route when clicking first marker in draw mode", async () => {
    const { mod, stateModule } = await loadBodyMapModule();
    mod.ensureBodyMapUiState();
    stateModule.st.symbolModeEnabled = true;
    mod.setRouteDrawingMode(true);
    mod.handleTier2MarkerRouteClick("crown");
    mod.handleTier2MarkerRouteClick("mind");
    mod.handleTier2MarkerRouteClick("intent");
    mod.handleTier2MarkerRouteClick("crown");
    expect(stateModule.st.routeDraftNodeIds).toEqual(["crown", "mind", "intent", "crown"]);
  });

  it("opens reverse meridian as established swapped direction", async () => {
    const { mod, stateModule } = await loadBodyMapModule();
    mod.ensureBodyMapUiState();
    const forwardId = "crown->mind";
    const forward = stateModule.st.bodyMapMeridians.get(forwardId);
    forward.hasReverseCandidate = true;
    forward.isEstablished = true;
    forward.width = 4;
    mod.tryOpenReverseMeridian(forwardId);
    const reverse = stateModule.st.bodyMapMeridians.get("mind->crown");
    expect(reverse).toBeTruthy();
    expect(reverse.isEstablished).toBe(true);
    expect(reverse.nodeFromId).toBe("mind");
    expect(reverse.nodeToId).toBe("crown");
  });
});
