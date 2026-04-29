import { TICK_MS } from "./constants.ts";
import { st } from "./state.ts";

const STORAGE_KEY = "flowmaster_offline_tick_bank_v1";
const MAX_BANK_TICKS =
  TICK_MS > 0 ? Math.floor((24 * 60 * 60 * 1000) / TICK_MS) : 0; // cap bank to 24h worth of ticks
const MAX_EARNED_SESSION_TICKS = 8 * 60 * 60 * 1000; // cap earned delta to 8h in ms (real time)
const PERSIST_EVERY_MS = 5_000;

// NOTE: We keep persistence UI-layer only (not core-state), so it survives between sessions
// without changing the simulation's core save format.
type OfflineTickStorage = {
  bankTicks: number;
  lastSeenAtMs: number;
};

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function safeParse(json: string): OfflineTickStorage | null {
  try {
    const parsed = JSON.parse(json) as Partial<OfflineTickStorage>;
    if (!parsed) return null;
    return {
      bankTicks: typeof parsed.bankTicks === "number" ? parsed.bankTicks : 0,
      lastSeenAtMs: typeof parsed.lastSeenAtMs === "number" ? parsed.lastSeenAtMs : 0
    };
  } catch {
    return null;
  }
}

function persistNow(now: number): void {
  const storage = getStorage();
  if (!storage) return;
  const payload: OfflineTickStorage = {
    bankTicks: Math.max(0, Math.floor(st.offlineTickBank || 0)),
    lastSeenAtMs: Math.max(0, Math.floor(st.offlineTickLastSeenAtMs || now))
  };
  storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  st.offlineTickBankDirty = false;
  st.offlineTickLastPersistAtMs = now;
}

export function initOfflineTickBank(): void {
  const storage = getStorage();
  if (!storage) return;
  const now = Date.now();

  const raw = storage.getItem(STORAGE_KEY);
  const stored = raw ? safeParse(raw) : null;

  const lastSeenAtMs = stored?.lastSeenAtMs ?? now;
  const storedBankTicks = stored?.bankTicks ?? 0;

  let earnedTicks = 0;
  if (typeof lastSeenAtMs === "number" && lastSeenAtMs > 0 && now > lastSeenAtMs) {
    const deltaMs = now - lastSeenAtMs;
    const cappedDeltaMs = Math.min(deltaMs, MAX_EARNED_SESSION_TICKS);
    earnedTicks = TICK_MS > 0 ? Math.floor(cappedDeltaMs / TICK_MS) : 0;
  }

  const total = Math.max(0, Math.floor(storedBankTicks + earnedTicks));
  st.offlineTickBank = MAX_BANK_TICKS > 0 ? Math.min(MAX_BANK_TICKS, total) : 0;
  st.offlineTickLastSeenAtMs = now;
  st.offlineTickLastPersistAtMs = 0;
  st.offlineTickBankDirty = true;

  persistNow(now);
}

export function requestOfflineTickBoostX5(active: boolean): void {
  // Only start the boost if we have banked ticks.
  if (active) {
    st.offlineTickBoostActive = (st.offlineTickBank || 0) > 0;
  } else {
    st.offlineTickBoostActive = false;
  }
  st.offlineTickBankDirty = true;
}

export function updateOfflineTickBankHeartbeat(now = Date.now()): void {
  // Keep "last seen" moving while the app is open so offline deltas are accurate.
  st.offlineTickLastSeenAtMs = now;

  const shouldPersist =
    st.offlineTickBankDirty ||
    st.offlineTickLastPersistAtMs <= 0 ||
    now - st.offlineTickLastPersistAtMs >= PERSIST_EVERY_MS;

  if (!shouldPersist) return;
  persistNow(now);
}

export function persistOfflineTickBankNow(): void {
  persistNow(Date.now());
}

