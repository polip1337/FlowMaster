import { describe, expect, it, vi } from "vitest";
import { buildInitialGameState } from "../../../src/core/simulation/bodyMapFactory";
import {
  autoSaveState,
  BACKUP_SAVE_KEY,
  deserializeGameState,
  migrateState,
  PRIMARY_SAVE_KEY,
  SAVE_SCHEMA_VERSION,
  serializeGameState
} from "../../../src/state/persistence";

describe("phase34 persistence", () => {
  it("serializes and deserializes GameState maps and sets", () => {
    const state = buildInitialGameState();
    state.specialEventFlags.add("event:test");
    state.tick = 777;

    const json = serializeGameState(state);
    const roundTripped = deserializeGameState(json);

    expect(roundTripped.tick).toBe(777);
    expect(roundTripped.t2Nodes instanceof Map).toBe(true);
    expect(roundTripped.meridians instanceof Map).toBe(true);
    expect(roundTripped.playerDao.daoNodes instanceof Map).toBe(true);
    expect(roundTripped.specialEventFlags instanceof Set).toBe(true);
    expect(roundTripped.specialEventFlags.has("event:test")).toBe(true);
  });

  it("migrates missing fields from legacy saves using defaults", () => {
    const legacy = {
      tick: 55,
      bodyHeat: 21
    };

    const migrated = migrateState(legacy, 0);
    expect(migrated.tick).toBe(55);
    expect(migrated.bodyHeat).toBe(21);
    expect(migrated.maxBodyHeat).toBeGreaterThan(0);
    expect(migrated.t2Nodes instanceof Map).toBe(true);
    expect(migrated.specialEventFlags instanceof Set).toBe(true);
  });

  it("deserializes both versioned and raw legacy payloads", () => {
    const state = buildInitialGameState();
    state.tick = 18;
    const versioned = serializeGameState(state);
    const parsedVersioned = deserializeGameState(versioned);
    expect(parsedVersioned.tick).toBe(18);

    const rawLegacyJson = JSON.stringify({ tick: 9, bodyHeat: 2 });
    const parsedLegacy = deserializeGameState(rawLegacyJson);
    expect(parsedLegacy.tick).toBe(9);
    expect(parsedLegacy.bodyHeat).toBe(2);
  });

  it("autosaves with backup rotation before overwrite", () => {
    const state = buildInitialGameState();
    state.tick = 5;
    const storage = {
      getItem: vi.fn<(_key: string) => string | null>().mockReturnValueOnce(null).mockReturnValueOnce("older-save"),
      setItem: vi.fn<(key: string, value: string) => void>()
    };

    autoSaveState(state, storage);
    autoSaveState(state, storage);

    expect(storage.setItem).toHaveBeenCalledWith(PRIMARY_SAVE_KEY, expect.any(String));
    expect(storage.setItem).toHaveBeenCalledWith(BACKUP_SAVE_KEY, "older-save");
  });

  it("writes schema version marker into serialized output", () => {
    const state = buildInitialGameState();
    const json = serializeGameState(state);
    const parsed = JSON.parse(json) as { version: number };
    expect(parsed.version).toBe(SAVE_SCHEMA_VERSION);
  });

  it("drops prototype-pollution keys during deserialization", () => {
    const payload = JSON.stringify({
      version: SAVE_SCHEMA_VERSION,
      state: {
        tick: 11,
        playerDao: {
          selectedDao: "Flame"
        },
        __proto__: {
          polluted: true
        },
        constructor: {
          prototype: {
            pollutedAgain: true
          }
        }
      }
    });
    const parsed = deserializeGameState(payload) as Record<string, unknown>;
    expect((parsed as any).polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("rejects deeply nested payloads beyond safety limits", () => {
    let nested: Record<string, unknown> = { leaf: true };
    for (let i = 0; i < 90; i += 1) {
      nested = { child: nested };
    }
    const payload = JSON.stringify({ version: SAVE_SCHEMA_VERSION, state: nested });
    expect(() => deserializeGameState(payload)).toThrow(/max depth/i);
  });

  it("rejects invalid critical nested ranges during migration", () => {
    const state = buildInitialGameState();
    const t2Nodes = {
      __type: "Map",
      entries: Array.from(state.t2Nodes.entries())
    };
    const firstEntry = t2Nodes.entries[0];
    if (!firstEntry) {
      throw new Error("Expected at least one t2 node in initial game state.");
    }
    (firstEntry[1] as Record<string, unknown>).nodeDamageState = {
      cracked: true,
      shattered: false,
      repairProgress: 99
    };
    const payload = JSON.stringify({
      version: SAVE_SCHEMA_VERSION,
      state: {
        ...state,
        tick: 10,
        t2Nodes
      }
    });
    expect(() => deserializeGameState(payload)).toThrow(/invariant/i);
  });
});
