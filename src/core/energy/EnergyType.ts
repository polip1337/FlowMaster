export enum EnergyType {
  Qi = "Qi",
  Jing = "Jing",
  YangQi = "YangQi",
  Shen = "Shen"
}

export type EnergyPool = Record<EnergyType, number>;

export function emptyPool(): EnergyPool {
  return {
    [EnergyType.Qi]: 0,
    [EnergyType.Jing]: 0,
    [EnergyType.YangQi]: 0,
    [EnergyType.Shen]: 0
  };
}

export function totalEnergy(pool: EnergyPool): number {
  return pool[EnergyType.Qi] + pool[EnergyType.Jing] + pool[EnergyType.YangQi] + pool[EnergyType.Shen];
}

export function addPools(a: EnergyPool, b: EnergyPool): EnergyPool {
  return {
    [EnergyType.Qi]: a[EnergyType.Qi] + b[EnergyType.Qi],
    [EnergyType.Jing]: a[EnergyType.Jing] + b[EnergyType.Jing],
    [EnergyType.YangQi]: a[EnergyType.YangQi] + b[EnergyType.YangQi],
    [EnergyType.Shen]: a[EnergyType.Shen] + b[EnergyType.Shen]
  };
}

export function scaledPool(pool: EnergyPool, factor: number): EnergyPool {
  return {
    [EnergyType.Qi]: pool[EnergyType.Qi] * factor,
    [EnergyType.Jing]: pool[EnergyType.Jing] * factor,
    [EnergyType.YangQi]: pool[EnergyType.YangQi] * factor,
    [EnergyType.Shen]: pool[EnergyType.Shen] * factor
  };
}

/** Per-type max(0, a − b); used so T1 flows cannot drain meridian-reserved IO energy (S-013). */
export function subtractPoolsNonNegative(a: EnergyPool, b: EnergyPool): EnergyPool {
  return {
    [EnergyType.Qi]: Math.max(0, a[EnergyType.Qi] - b[EnergyType.Qi]),
    [EnergyType.Jing]: Math.max(0, a[EnergyType.Jing] - b[EnergyType.Jing]),
    [EnergyType.YangQi]: Math.max(0, a[EnergyType.YangQi] - b[EnergyType.YangQi]),
    [EnergyType.Shen]: Math.max(0, a[EnergyType.Shen] - b[EnergyType.Shen])
  };
}
