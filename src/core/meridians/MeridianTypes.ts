export enum MeridianState {
  UNESTABLISHED = "UNESTABLISHED",
  NASCENT = "NASCENT",
  DEVELOPED = "DEVELOPED",
  REFINED = "REFINED",
  TRANSCENDENT = "TRANSCENDENT"
}

/** Width bases per state (GDD / TaskList Phase 5). */
export const MERIDIAN_WIDTH_BASE: Record<MeridianState, number> = {
  [MeridianState.UNESTABLISHED]: 0,
  [MeridianState.NASCENT]: 1,
  [MeridianState.DEVELOPED]: 3,
  [MeridianState.REFINED]: 8,
  [MeridianState.TRANSCENDENT]: 20
};

/** Minimum lifetime totalFlow (TF) to reach each state tier (established meridians only). */
export const MERIDIAN_TF_FOR_STATE: Record<MeridianState, number> = {
  [MeridianState.UNESTABLISHED]: 0,
  [MeridianState.NASCENT]: 0,
  // Phase 36 balance: broaden progression pacing to session-scale milestones.
  [MeridianState.DEVELOPED]: 60_000,
  [MeridianState.REFINED]: 300_000,
  [MeridianState.TRANSCENDENT]: 1_800_000
};

const STATE_ORDER: MeridianState[] = [
  MeridianState.UNESTABLISHED,
  MeridianState.NASCENT,
  MeridianState.DEVELOPED,
  MeridianState.REFINED,
  MeridianState.TRANSCENDENT
];

export function meridianWidthBase(state: MeridianState): number {
  return MERIDIAN_WIDTH_BASE[state];
}

export function meridianStateFromTotalFlow(totalFlow: number, isEstablished: boolean): MeridianState {
  if (!isEstablished) {
    return MeridianState.UNESTABLISHED;
  }
  const tf = Math.max(0, totalFlow);
  if (tf >= MERIDIAN_TF_FOR_STATE[MeridianState.TRANSCENDENT]) {
    return MeridianState.TRANSCENDENT;
  }
  if (tf >= MERIDIAN_TF_FOR_STATE[MeridianState.REFINED]) {
    return MeridianState.REFINED;
  }
  if (tf >= MERIDIAN_TF_FOR_STATE[MeridianState.DEVELOPED]) {
    return MeridianState.DEVELOPED;
  }
  return MeridianState.NASCENT;
}

export function meridianStateRank(state: MeridianState): number {
  return STATE_ORDER.indexOf(state);
}
