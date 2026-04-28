import type { CombatAttributes, CultivationAttributes } from "../attributes/types";
import type { DaoType } from "../dao/types";
import type { EnergyType } from "../energy/EnergyType";
import type { UnlockCondition } from "../../data/conditions";

export type CultivationManualId = string;

export interface FormationArray {
  id: string;
  name: string;
  energyType: EnergyType;
  perTickGeneration: number;
}

export interface AttributeBundle {
  cultivation: Partial<CultivationAttributes>;
  combat: Partial<CombatAttributes>;
}

export interface Elder {
  id: string;
  name: string;
  daoType: DaoType;
  realm: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  favorLevel: number;
  teachableManuals: CultivationManualId[];
  requirement: UnlockCondition[];
}

export interface Sect {
  id: string;
  name: string;
  homeElder: Elder;
  availableFormationArrays: FormationArray[];
  memberBenefits: AttributeBundle;
}
