export const TICK_RATE = 10;
export const DELTA_T = 0.1;

export const T1_MAX_FLOW_RATE = 0.01;
export const T1_BASE_SOURCE_RATE = 0.5;
export const T1_SECONDARY_SOURCE_RATE = 0.05;

export const BETA_PORT = 0.15;
export const JING_STRUCTURE_CONST = 20000;
export const PURITY_SCALE_CONST = 200000;
export const FLOW_BONUS_K = 4.0;
export const SCALE_W = 8.0;

export const RANK_MULTIPLIERS = [1, 2, 3.5, 6, 10, 16, 25, 38, 60] as const;
export const LEVEL_MULTIPLIERS = [1, 1.12, 1.26, 1.41, 1.58, 1.78, 2, 2.24, 2.51] as const;
