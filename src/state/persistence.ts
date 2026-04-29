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

const MAX_DESERIALIZE_DEPTH = 80;
const MAX_DESERIALIZE_NODES = 50_000;
const MAX_JSON_LENGTH = 2_000_000;
const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const MAX_MAP_ENTRIES = 10_000;
const MAX_ARRAY_LENGTH = 5_000;
const MAX_SET_ENTRIES = 5_000;
const MAX_TICK = 10_000_000_000;

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

function deserializeValue(value: unknown, depth = 0, budget = { nodes: 0 }): unknown {
  if (depth > MAX_DESERIALIZE_DEPTH) {
    throw new Error(`Save payload exceeds max depth ${MAX_DESERIALIZE_DEPTH}`);
  }
  budget.nodes += 1;
  if (budget.nodes > MAX_DESERIALIZE_NODES) {
    throw new Error(`Save payload exceeds max node budget ${MAX_DESERIALIZE_NODES}`);
  }
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => deserializeValue(entry, depth + 1, budget));
  }
  if (isPlainObject(value)) {
    if (value.__type === "Map" && Array.isArray(value.entries)) {
      const entries = value.entries.map((entry) => {
        if (!Array.isArray(entry) || entry.length < 2) {
          return [null, null] as const;
        }
        return [deserializeValue(entry[0], depth + 1, budget), deserializeValue(entry[1], depth + 1, budget)] as const;
      });
      return new Map(entries);
    }
    if (value.__type === "Set" && Array.isArray(value.values)) {
      return new Set(value.values.map((entry) => deserializeValue(entry, depth + 1, budget)));
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (BLOCKED_KEYS.has(k)) {
        continue;
      }
      out[k] = deserializeValue(v, depth + 1, budget);
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
    if (!Array.isArray(incoming)) {
      return deepClone(defaults);
    }
    if (incoming.length > MAX_ARRAY_LENGTH) {
      throw new Error(`Save payload exceeds max array length ${MAX_ARRAY_LENGTH}`);
    }
    return deepClone(incoming) as unknown as T;
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
  if (typeof defaults === "number") {
    return (typeof incoming === "number" && Number.isFinite(incoming) ? incoming : defaults) as T;
  }
  if (typeof defaults === "string") {
    return (typeof incoming === "string" ? incoming : defaults) as T;
  }
  if (typeof defaults === "boolean") {
    return (typeof incoming === "boolean" ? incoming : defaults) as T;
  }
  return defaults;
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
      ) as NonNullable<GameState["companion"]>["cultivation"]["t2Nodes"];
    }
    if (!(state.companion.cultivation.meridians instanceof Map)) {
      state.companion.cultivation.meridians = new Map(
        Object.entries((state.companion.cultivation.meridians as unknown as Record<string, unknown>) ?? {})
      ) as NonNullable<GameState["companion"]>["cultivation"]["meridians"];
    }
  }
  return state;
}

function assertNumberInRange(name: string, value: unknown, min: number, max: number): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`Invalid save invariant: ${name} out of range.`);
  }
}

function assertBoolean(name: string, value: unknown): asserts value is boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Invalid save invariant: ${name} must be boolean.`);
  }
}

function assertString(name: string, value: unknown, maxLength = 120): asserts value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > maxLength) {
    throw new Error(`Invalid save invariant: ${name} must be a non-empty string <= ${maxLength} chars.`);
  }
}

function validateCriticalStateInvariants(state: GameState): void {
  assertNumberInRange("tick", state.tick, 0, MAX_TICK);
  assertNumberInRange("bodyHeat", state.bodyHeat, 0, 1_000_000);
  assertNumberInRange("maxBodyHeat", state.maxBodyHeat, 1, 1_000_000);
  if (state.bodyHeat > state.maxBodyHeat * 5) {
    throw new Error("Invalid save invariant: bodyHeat exceeds allowed multiple of maxBodyHeat.");
  }
  if (state.t2Nodes.size > MAX_MAP_ENTRIES) {
    throw new Error(`Invalid save invariant: t2Nodes exceeds max entries ${MAX_MAP_ENTRIES}.`);
  }
  for (const [nodeId, node] of state.t2Nodes) {
    assertString("t2Nodes key", nodeId);
    assertNumberInRange(`t2Nodes[${nodeId}].rank`, (node as { rank?: unknown }).rank, 0, 1000);
    const damageState = (node as { nodeDamageState?: unknown }).nodeDamageState as
      | { cracked?: unknown; shattered?: unknown; repairProgress?: unknown }
      | undefined;
    if (!damageState || !isPlainObject(damageState)) {
      throw new Error(`Invalid save invariant: t2Nodes[${nodeId}].nodeDamageState missing.`);
    }
    assertBoolean(`t2Nodes[${nodeId}].nodeDamageState.cracked`, damageState.cracked);
    assertBoolean(`t2Nodes[${nodeId}].nodeDamageState.shattered`, damageState.shattered);
    assertNumberInRange(`t2Nodes[${nodeId}].nodeDamageState.repairProgress`, damageState.repairProgress, 0, 1);
  }
  if (state.meridians.size > MAX_MAP_ENTRIES) {
    throw new Error(`Invalid save invariant: meridians exceeds max entries ${MAX_MAP_ENTRIES}.`);
  }
  for (const [meridianId, meridian] of state.meridians) {
    assertString("meridian key", meridianId);
    assertNumberInRange(`meridians[${meridianId}].width`, (meridian as { width?: unknown }).width, 0, 1000);
    assertNumberInRange(`meridians[${meridianId}].purity`, (meridian as { purity?: unknown }).purity, 0, 1);
  }
  if (state.specialEventFlags.size > MAX_SET_ENTRIES) {
    throw new Error(`Invalid save invariant: specialEventFlags exceeds max entries ${MAX_SET_ENTRIES}.`);
  }
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
  const normalized = normalizeKnownContainers(merged);
  validateCriticalStateInvariants(normalized);
  return normalized;
}

export function deserializeGameState(json: string): GameState {
  if (json.length > MAX_JSON_LENGTH) {
    throw new Error(`Save payload exceeds max size ${MAX_JSON_LENGTH} bytes.`);
  }
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
  const decodedState = deserializeValue(rawState, 0, { nodes: 0 });
  return migrateState(decodedState, fromVersion);
}

export function autoSaveState(state: GameState, storage: Pick<Storage, "getItem" | "setItem">): void {
  const previous = storage.getItem(PRIMARY_SAVE_KEY);
  if (previous !== null) {
    storage.setItem(BACKUP_SAVE_KEY, previous);
  }
  storage.setItem(PRIMARY_SAVE_KEY, serializeGameState(state));
}
