import { DaoType, type DaoNodeDef } from "../../core/dao/types";

export const voidDaoNodes: DaoNodeDef[] = [
  { id: "VOID_NEXUS", daoType: DaoType.Void, name: "Nexus Fold", nodeIndex: 0, topologyId: "ajna", bodyOverlayPosition: { x: 0.52, y: 0.3 }, associatedSkillId: "void-rift-cut" },
  { id: "VOID_ECHO", daoType: DaoType.Void, name: "Echo Silence", nodeIndex: 1, topologyId: "bindu", bodyOverlayPosition: { x: 0.54, y: 0.24 }, associatedSkillId: "void-echo-collapse" },
  { id: "VOID_NULL", daoType: DaoType.Void, name: "Null Drift", nodeIndex: 2, topologyId: "sahasrara", bodyOverlayPosition: { x: 0.56, y: 0.18 }, associatedSkillId: "void-fade-step" },
  { id: "VOID_FRACTURE", daoType: DaoType.Void, name: "Fracture Gate", nodeIndex: 3, topologyId: "anahata", bodyOverlayPosition: { x: 0.58, y: 0.28 }, associatedSkillId: "void-gravity-well" },
  { id: "VOID_ABSENCE", daoType: DaoType.Void, name: "Absence Mind", nodeIndex: 4, topologyId: "svadhisthana", bodyOverlayPosition: { x: 0.56, y: 0.36 }, associatedSkillId: "void-soul-shear" },
  { id: "VOID_PARADOX", daoType: DaoType.Void, name: "Paradox Core", nodeIndex: 5, topologyId: "vishuddha", bodyOverlayPosition: { x: 0.54, y: 0.44 }, associatedSkillId: "void-still-mind" }
];
