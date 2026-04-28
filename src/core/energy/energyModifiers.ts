import { EnergyType } from "./EnergyType";

export interface EnergyTypeModifiers {
  flowMod: number;
  purityLossMod: number;
  widthFactor: number;
  purityFactor: number;
  internalAlphaMod: number;
  unlockWeight: number;
  heatPerLost: number;
  resonanceWeight: number;
}

export const ENERGY_MODIFIERS: Record<EnergyType, EnergyTypeModifiers> = {
  [EnergyType.Qi]: {
    flowMod: 1.0,
    purityLossMod: 1.0,
    widthFactor: 1.0,
    purityFactor: 1.0,
    internalAlphaMod: 1.0,
    unlockWeight: 1.0,
    heatPerLost: 0.0,
    resonanceWeight: 1.0
  },
  [EnergyType.Jing]: {
    flowMod: 0.65,
    purityLossMod: 0.8,
    widthFactor: 1.3,
    purityFactor: 0.9,
    internalAlphaMod: 0.7,
    unlockWeight: 1.25,
    heatPerLost: 0.0,
    resonanceWeight: 1.0
  },
  [EnergyType.YangQi]: {
    flowMod: 1.4,
    purityLossMod: 1.2,
    widthFactor: 1.8,
    purityFactor: 0.55,
    internalAlphaMod: 1.3,
    unlockWeight: 0.85,
    heatPerLost: 1.0,
    resonanceWeight: 1.1
  },
  [EnergyType.Shen]: {
    flowMod: 0.4,
    purityLossMod: 0.85,
    widthFactor: 0.5,
    purityFactor: 3.5,
    internalAlphaMod: 0.35,
    unlockWeight: 3.0,
    heatPerLost: 0.0,
    resonanceWeight: 3.0
  }
};
