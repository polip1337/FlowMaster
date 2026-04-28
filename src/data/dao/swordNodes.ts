import { DaoType, type DaoNodeDef } from "../../core/dao/types";

export const swordDaoNodes: DaoNodeDef[] = [
  { id: "SWORD_EDGE", daoType: DaoType.Sword, name: "Edge Line", nodeIndex: 0, topologyId: "wrist", bodyOverlayPosition: { x: 0.62, y: 0.68 }, associatedSkillId: "sword-iron-cleave" },
  { id: "SWORD_POINT", daoType: DaoType.Sword, name: "Point Drive", nodeIndex: 1, topologyId: "elbow", bodyOverlayPosition: { x: 0.64, y: 0.6 }, associatedSkillId: "sword-piercing-thread" },
  { id: "SWORD_GUARD", daoType: DaoType.Sword, name: "Guard Wheel", nodeIndex: 2, topologyId: "shoulder", bodyOverlayPosition: { x: 0.66, y: 0.52 }, associatedSkillId: "sword-flashstep" },
  { id: "SWORD_FIELD", daoType: DaoType.Sword, name: "Field Formation", nodeIndex: 3, topologyId: "vishuddha", bodyOverlayPosition: { x: 0.68, y: 0.44 }, associatedSkillId: "sword-skyfall-form" },
  { id: "SWORD_INTENT", daoType: DaoType.Sword, name: "Intent Sea", nodeIndex: 4, topologyId: "ajna", bodyOverlayPosition: { x: 0.7, y: 0.36 }, associatedSkillId: "sword-mind-sever" },
  { id: "SWORD_DOMAIN", daoType: DaoType.Sword, name: "Domain of Blades", nodeIndex: 5, topologyId: "sahasrara", bodyOverlayPosition: { x: 0.68, y: 0.28 }, associatedSkillId: "sword-aura-discipline" }
];
