import { DaoType, type DaoNodeDef } from "../../core/dao/types";

export const lifeDaoNodes: DaoNodeDef[] = [
  { id: "LIFE_SEED", daoType: DaoType.Life, name: "Seed Pulse", nodeIndex: 0, topologyId: "anahata", bodyOverlayPosition: { x: 0.5, y: 0.7 }, associatedSkillId: "life-vine-strike" },
  { id: "LIFE_BLOOM", daoType: DaoType.Life, name: "Bloom Ring", nodeIndex: 1, topologyId: "muladhara", bodyOverlayPosition: { x: 0.5, y: 0.62 }, associatedSkillId: "life-regrowth-wave" },
  { id: "LIFE_GROVE", daoType: DaoType.Life, name: "Grove Vein", nodeIndex: 2, topologyId: "svadhisthana", bodyOverlayPosition: { x: 0.5, y: 0.54 }, associatedSkillId: "life-verdant-step" },
  { id: "LIFE_TRUNK", daoType: DaoType.Life, name: "Trunk Heart", nodeIndex: 3, topologyId: "manipura", bodyOverlayPosition: { x: 0.5, y: 0.46 }, associatedSkillId: "life-thorn-technique" },
  { id: "LIFE_CANOPY", daoType: DaoType.Life, name: "Canopy Mind", nodeIndex: 4, topologyId: "ajna", bodyOverlayPosition: { x: 0.5, y: 0.38 }, associatedSkillId: "life-soul-bloom" },
  { id: "LIFE_ETERNAL", daoType: DaoType.Life, name: "Eternal Spring", nodeIndex: 5, topologyId: "sahasrara", bodyOverlayPosition: { x: 0.5, y: 0.3 }, associatedSkillId: "life-evergreen-aura" }
];
