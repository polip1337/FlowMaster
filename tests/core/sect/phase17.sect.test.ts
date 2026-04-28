import { describe, expect, it } from "vitest";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import { computeAllAttributes } from "../../../src/core/attributes/attributeComputer";
import { endCombat, startCombat } from "../../../src/core/combat/combatSystem";
import { ENEMY_ARCHETYPES } from "../../../src/data/enemies/archetypes";
import { SECTS } from "../../../src/data/sects/sects";
import {
  canLearnFromElder,
  getAvailableSectFormationArrays,
  joinSect,
  learnFromElder,
  listSects
} from "../../../src/core/sect/sectSystem";

describe("phase 17 sect and elder system", () => {
  it("defines elder and sect catalog with expected composition", () => {
    const sects = listSects();
    expect(sects).toHaveLength(3);
    expect(sects.map((s) => s.name)).toEqual(
      expect.arrayContaining(["The Iron Foundation Sect", "The Heaven-Striking Order", "The Still Water School"])
    );
    for (const sect of sects) {
      expect(sect.homeElder.realm).toBeGreaterThanOrEqual(1);
      expect(sect.homeElder.realm).toBeLessThanOrEqual(9);
      expect(sect.homeElder.teachableManuals).toHaveLength(3);
      expect(sect.availableFormationArrays).toHaveLength(2);
    }
  });

  it("gates elder learning by requirement and grants manual + favor on success", () => {
    const state = buildInitialGameState();
    const ironSect = SECTS.find((s) => s.id === "iron-foundation-sect");
    expect(ironSect).toBeTruthy();
    const elder = ironSect!.homeElder;

    expect(canLearnFromElder(elder, state)).toBe(false);
    const muladhara = state.t2Nodes.get("MULADHARA");
    expect(muladhara).toBeTruthy();
    muladhara!.rank = 2;
    expect(canLearnFromElder(elder, state)).toBe(true);

    const beforeFavor = state.sect.elderFavorLevels[elder.id] ?? 0;
    const learned = learnFromElder(elder, elder.teachableManuals[0], state);
    expect(learned.unlockedTechniques).toContain(elder.teachableManuals[0]);
    expect(learned.sect.elderFavorLevels[elder.id]).toBe(beforeFavor + 5);
  });

  it("allows one irreversible sect membership and exposes rest-only arrays", () => {
    const state = buildInitialGameState();
    const joined = joinSect(state, "heaven-striking-order");
    expect(joined.sect.joinedSectId).toBe("heaven-striking-order");
    expect(getAvailableSectFormationArrays(joined, false)).toHaveLength(0);
    expect(getAvailableSectFormationArrays(joined, true)).toHaveLength(2);
    expect(() => joinSect(joined, "still-water-school")).toThrow();
  });

  it("applies member benefits scaled by elder favor level", () => {
    const base = buildInitialGameState();
    const baseAttrs = computeAllAttributes(base);

    const member = buildInitialGameState();
    joinSect(member, "heaven-striking-order");
    member.sect.elderFavorLevels["elder-skybreaker"] = 50;
    const memberAttrs = computeAllAttributes(member);

    expect(memberAttrs.cultivation.yangQiConversionEfficiency).toBeGreaterThan(baseAttrs.cultivation.yangQiConversionEfficiency);
    expect(memberAttrs.combat.techniquePower).toBeGreaterThan(baseAttrs.combat.techniquePower);
  });

  it("increases favor after combat victory in sect-aligned area", () => {
    const state = buildInitialGameState();
    joinSect(state, "still-water-school");
    const elderId = "elder-deep-current";
    state.sect.elderFavorLevels[elderId] = 10;

    const started = startCombat(state, ENEMY_ARCHETYPES[2]);
    const ended = endCombat(started, "player_win", () => 0).state;
    expect(ended.sect.elderFavorLevels[elderId]).toBeGreaterThan(10);
  });
});
