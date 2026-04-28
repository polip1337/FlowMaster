import { T2_NODE_DEFS } from "../../data/t2NodeDefs";
import type { GameState } from "../../state/GameState";
import type { CelestialBody, CelestialCalendar, CelestialSeason } from "./types";

export const CELESTIAL_YEAR_DAYS = 364;
export const CELESTIAL_PEAK_DURATION_DAYS = 45;
const SEASON_LENGTH_DAYS = 91;
const CONJUNCTION_DURATION_DAYS = 3;

interface ConjunctionEvent {
  startDay: number;
  bodyIds: string[];
}

interface CelestialBodyDefinition {
  bodyId: string;
  linkedT2NodeId: string;
  peakStartDay: number;
}

export interface CelestialTickModifiers {
  qiGenerationMultiplier: number;
  jingGenerationMultiplier: number;
  yangQiConversionMultiplier: number;
  shenGenerationMultiplier: number;
  t2ShenGenerationMultiplier: (nodeId: string) => number;
  t2GenerationMultiplier: (nodeId: string) => number;
  t2ResonanceQualityMultiplier: (nodeId: string) => number;
  conjunctionBodies: string[];
}

const BODY_DEFINITIONS: CelestialBodyDefinition[] = T2_NODE_DEFS.map((node, index) => ({
  bodyId: `CB_${node.id}`,
  linkedT2NodeId: node.id,
  peakStartDay: Math.floor((index * CELESTIAL_YEAR_DAYS) / T2_NODE_DEFS.length)
}));

const BODY_DEFINITION_BY_ID = new Map(BODY_DEFINITIONS.map((def) => [def.bodyId, def]));
const BODY_ID_BY_NODE_ID = new Map(BODY_DEFINITIONS.map((def) => [def.linkedT2NodeId, def.bodyId]));

const CONJUNCTION_EVENTS: ConjunctionEvent[] = [
  { startDay: 44, bodyIds: ["CB_MULADHARA", "CB_ANAHATA"] },
  { startDay: 226, bodyIds: ["CB_AJNA", "CB_BINDU", "CB_SAHASRARA"] }
];

function normalizeDay(day: number): number {
  const mod = day % CELESTIAL_YEAR_DAYS;
  return mod < 0 ? mod + CELESTIAL_YEAR_DAYS : mod;
}

function getSeasonForDay(dayOfYear: number): CelestialSeason {
  if (dayOfYear < SEASON_LENGTH_DAYS) {
    return "Spring";
  }
  if (dayOfYear < SEASON_LENGTH_DAYS * 2) {
    return "Summer";
  }
  if (dayOfYear < SEASON_LENGTH_DAYS * 3) {
    return "Autumn";
  }
  return "Winter";
}

function isDayInWindow(day: number, startDay: number, durationDays: number): boolean {
  for (let offset = 0; offset < durationDays; offset += 1) {
    if (normalizeDay(startDay + offset) === day) {
      return true;
    }
  }
  return false;
}

function isBodyPeakOnDay(bodyId: string, dayOfYear: number): boolean {
  const definition = BODY_DEFINITION_BY_ID.get(bodyId);
  if (!definition) {
    return false;
  }
  return isDayInWindow(dayOfYear, definition.peakStartDay, CELESTIAL_PEAK_DURATION_DAYS);
}

function getActiveConjunctionBodies(dayOfYear: number): string[] {
  const active = new Set<string>();
  for (const event of CONJUNCTION_EVENTS) {
    if (isDayInWindow(dayOfYear, event.startDay, CONJUNCTION_DURATION_DAYS)) {
      for (const bodyId of event.bodyIds) {
        active.add(bodyId);
      }
    }
  }
  return [...active];
}

function computeSign(bodyId: string, dayOfYear: number): string {
  return isBodyPeakOnDay(bodyId, dayOfYear) ? "Peak" : "Waning";
}

export function createInitialCelestialBodies(): CelestialBody[] {
  return BODY_DEFINITIONS.map((def) => ({
    id: def.bodyId,
    linkedT2NodeId: def.linkedT2NodeId,
    currentSign: computeSign(def.bodyId, 0)
  }));
}

export function createInitialCelestialCalendar(): CelestialCalendar {
  return {
    dayOfYear: 0,
    season: "Spring",
    activeConjunctions: getActiveConjunctionBodies(0)
  };
}

export function refreshCelestialStateForCurrentDay(state: GameState): void {
  const day = normalizeDay(state.celestialCalendar.dayOfYear);
  state.celestialCalendar.dayOfYear = day;
  state.celestialCalendar.season = getSeasonForDay(day);
  state.celestialCalendar.activeConjunctions = getActiveConjunctionBodies(day);
  for (const body of state.celestialBodies) {
    body.currentSign = computeSign(body.id, day);
  }
  if (state.celestialCalendar.activeConjunctions.length > 0) {
    state.specialEventFlags.add("event:celestial_conjunction_active");
  } else {
    state.specialEventFlags.delete("event:celestial_conjunction_active");
  }
}

export function advanceCalendar(state: GameState): GameState {
  state.celestialCalendar.dayOfYear = normalizeDay(state.celestialCalendar.dayOfYear + 1);
  refreshCelestialStateForCurrentDay(state);
  return state;
}

export function getCelestialTickModifiers(state: GameState): CelestialTickModifiers {
  const season = state.celestialCalendar.season;
  const seasonQiMultiplier = season === "Spring" ? 1.2 : 1;
  const seasonYangConversionMultiplier = season === "Summer" ? 1.3 : 1;
  const seasonJingMultiplier = season === "Autumn" ? 1.25 : 1;
  const seasonShenMultiplier = season === "Winter" ? 1.4 : 1;
  const conjunctionSet = new Set(state.celestialCalendar.activeConjunctions);
  const peakSet = new Set(state.celestialBodies.filter((body) => body.currentSign === "Peak").map((body) => body.id));

  const peakGenerationByNode = new Map<string, number>();
  const resonanceByNode = new Map<string, number>();
  const shenByNode = new Map<string, number>();
  for (const body of state.celestialBodies) {
    const isPeak = peakSet.has(body.id);
    peakGenerationByNode.set(body.linkedT2NodeId, isPeak ? 2 : 1);
    resonanceByNode.set(body.linkedT2NodeId, isPeak ? 1.1 : 1);
    shenByNode.set(body.linkedT2NodeId, conjunctionSet.has(body.id) ? 3 : 1);
  }

  return {
    qiGenerationMultiplier: seasonQiMultiplier,
    jingGenerationMultiplier: seasonJingMultiplier,
    yangQiConversionMultiplier: seasonYangConversionMultiplier,
    shenGenerationMultiplier: seasonShenMultiplier,
    t2ShenGenerationMultiplier: (nodeId: string) => shenByNode.get(nodeId) ?? 1,
    t2GenerationMultiplier: (nodeId: string) => peakGenerationByNode.get(nodeId) ?? 1,
    t2ResonanceQualityMultiplier: (nodeId: string) => resonanceByNode.get(nodeId) ?? 1,
    conjunctionBodies: [...conjunctionSet]
  };
}

export function getBodyIdForNodeId(nodeId: string): string | null {
  return BODY_ID_BY_NODE_ID.get(nodeId) ?? null;
}
