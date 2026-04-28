export type CelestialSeason = "Spring" | "Summer" | "Autumn" | "Winter";

export interface CelestialBody {
  id: string;
  linkedT2NodeId: string;
  currentSign: string;
}

export interface CelestialCalendar {
  dayOfYear: number;
  season: CelestialSeason;
  activeConjunctions: string[];
}
