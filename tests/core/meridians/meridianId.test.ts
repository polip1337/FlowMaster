import { describe, expect, it } from "vitest";
import { makeMeridianId, parseForwardId } from "../../../src/core/meridians/meridianId";

describe("meridianId (S-022)", () => {
  it("round-trips forward ids with double-colon separator", () => {
    const id = makeMeridianId("MULADHARA", "SVADHISTHANA");
    expect(id).toBe("MULADHARA::SVADHISTHANA");
    expect(parseForwardId(id)).toEqual(["MULADHARA", "SVADHISTHANA"]);
  });

  it("accepts legacy arrow separator ids for compatibility", () => {
    expect(parseForwardId("MULADHARA->SVADHISTHANA")).toEqual(["MULADHARA", "SVADHISTHANA"]);
  });
});
