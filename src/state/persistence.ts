import { buildInitialGameState } from "../core/simulation/bodyMapFactory";
import type { GameState } from "./GameState";

export const SAVE_SCHEMA_VERSION = 1;
export const PRIMARY_SAVE_KEY = "cultivationSave_v1";
export const BACKUP_SAVE_KEY = "cultivationSave_backup";

type JsonPrimitive = string | number | boolean | null;
type JsonLike = JsonPrimitive | JsonLike[] | { [key: string]: JsonLike };

type SaveEnvelope = {
  version: number;
  state: JsonLike;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function serializeValue(value: unknown): JsonLike {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => serializeValue(entry));
  }
  if (value instanceof Map) {
    return {
      __type: "Map",
      entries: Array.from(value.entries()).map(([k, v]) => [serializeValue(k), serializeValue(v)])
    };
  }
  if (value instanceof Set) {
    return {
      __type: "Set",
      values: Array.from(value.values()).map((entry) => serializeValue(entry))
    };
  }
  if (isPlainObject(value)) {
    const out: Record<string, JsonLike> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = serializeValue(v);
    }
    return out;
  }
  return null;
}

function deserializeValue(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => deserializeValue(entry));
  }
  if (isPlainObject(value)) {
    if (value.__type === "Map" && Array.isArray(value.entries)) {
      const entries = value.entries.map((entry) => {
        if (!Array.isArray(entry) || entry.length < 2) {
          return [null, null] as const;
        }
        return [deserializeValue(entry[0]), deserializeValue(entry[1])] as const;
      });
      return new Map(entries);
    }
    if (value.__type === "Set" && Array.isArray(value.values)) {
      return new Set(value.values.map((entry) => deserializeValue(entry)));
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = deserializeValue(v);
    }
    return out;
  }
  return null;
}

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

function deepMergeWithDefaults<T>(defaults: T, incoming: unknown): T {
  if (defaults instanceof Map) {
    if (incoming instanceof Map) {
      return deepClone(incoming) as unknown as T;
    }
    if (isPlainObject(incoming)) {
      return new Map(Object.entries(incoming)) as unknown as T;
    }
    return deepClone(defaults);
  }
  if (defaults instanceof Set) {
    if (incoming instanceof Set) {
      return new Set(incoming) as unknown as T;
    }
    if (Array.isArray(incoming)) {
      return new Set(incoming) as unknown as T;
    }
    return deepClone(defaults);
  }
  if (Array.isArray(defaults)) {
    return (Array.isArray(incoming) ? deepClone(incoming) : deepClone(defaults)) as unknown as T;
  }
  if (isPlainObject(defaults)) {
    const out: Record<string, unknown> = {};
    const incomingObj = isPlainObject(incoming) ? incoming : {};
    for (const [k, defaultValue] of Object.entries(defaults)) {
      out[k] = deepMergeWithDefaults(defaultValue, incomingObj[k]);
    }
    return out as T;
  }
  if (incoming === undefined || incoming === null) {
    return defaults;
  }
  return incoming as T;
}

function normalizeKnownContainers(state: GameState): GameState {
  if (!(state.t2Nodes instanceof Map)) {
    state.t2Nodes = new Map(Object.entries((state.t2Nodes as unknown as Record<string, unknown>) ?? {})) as GameState["t2Nodes"];
  }
  if (!(state.meridians instanceof Map)) {
    state.meridians = new Map(Object.entries((state.meridians as unknown as Record<string, unknown>) ?? {})) as GameState["meridians"];
  }
  if (!(state.playerDao.daoNodes instanceof Map)) {
    state.playerDao.daoNodes = new Map(
      Object.entries((state.playerDao.daoNodes as unknown as Record<string, unknown>) ?? {})
    ) as GameState["playerDao"]["daoNodes"];
  }
  if (!(state.specialEventFlags instanceof Set)) {
    const entries = Array.isArray(state.specialEventFlags)
      ? state.specialEventFlags
      : Object.keys((state.specialEventFlags as unknown as Record<string, unknown>) ?? {});
    state.specialEventFlags = new Set(entries as string[]);
  }
  if (state.companion) {
    if (!(state.companion.cultivation.t2Nodes instanceof Map)) {
      state.companion.cultivation.t2Nodes = new Map(
        Object.entries((state.companion.cultivation.t2Nodes as unknown as Record<string, unknown>) ?? {})
      ) as GameState["companion"]["cultivation"]["t2Nodes"];
    }
    if (!(state.companion.cultivation.meridians instanceof Map)) {
      state.companion.cultivation.meridians = new Map(
        Object.entries((state.companion.cultivation.meridians as unknown as Record<string, unknown>) ?? {})
      ) as GameState["companion"]["cultivation"]["meridians"];
    }
  }
  return state;
}

export function serializeGameState(state: GameState): string {
  const payload: SaveEnvelope = {
    version: SAVE_SCHEMA_VERSION,
    state: serializeValue(state)
  };
  return JSON.stringify(payload);
}

export function migrateState(rawObj: unknown, fromVersion: number): GameState {
  const defaults = buildInitialGameState();
  let candidate = rawObj;
  if (fromVersion < 1 && isPlainObject(rawObj) && "state" in rawObj) {
    candidate = rawObj.state;
  }
  const merged = deepMergeWithDefaults(defaults, candidate);
  return normalizeKnownContainers(merged);
}

export function deserializeGameState(json: string): GameState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new Error(`Failed to parse save JSON: ${(error as Error).message}`);
  }

  if (!isPlainObject(parsed)) {
    throw new Error("Invalid save format: root must be an object.");
  }

  const maybeEnvelope = parsed as Partial<SaveEnvelope>;
  const hasVersion = typeof maybeEnvelope.version === "number";
  const fromVersion = hasVersion ? maybeEnvelope.version! : 0;
  const rawState = hasVersion ? maybeEnvelope.state : parsed;
  const decodedState = deserializeValue(rawState);
  return migrateState(decodedState, fromVersion);
}

export function autoSaveState(state: GameState, storage: Pick<Storage, "getItem" | "setItem">): void {
  const previous = storage.getItem(PRIMARY_SAVE_KEY);
  if (previous !== null) {
    storage.setItem(BACKUP_SAVE_KEY, previous);
  }
  storage.setItem(PRIMARY_SAVE_KEY, serializeGameState(state));
}
