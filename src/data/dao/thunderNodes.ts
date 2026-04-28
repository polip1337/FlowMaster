import { DaoType, type DaoNodeDef } from "../../core/dao/types";

export const thunderDaoNodes: DaoNodeDef[] = [
  { id: "THUNDER_SPARK", daoType: DaoType.Thunder, name: "Spark Lash", nodeIndex: 0, topologyId: "manipura", bodyOverlayPosition: { x: 0.52, y: 0.74 }, associatedSkillId: "thunder-shock-fist" },
  { id: "THUNDER_ARC", daoType: DaoType.Thunder, name: "Arc Current", nodeIndex: 1, topologyId: "anahata", bodyOverlayPosition: { x: 0.56, y: 0.66 }, associatedSkillId: "thunder-chain-bolt" },
  { id: "THUNDER_PULSE", daoType: DaoType.Thunder, name: "Pulse Dash", nodeIndex: 2, topologyId: "shoulder", bodyOverlayPosition: { x: 0.6, y: 0.58 }, associatedSkillId: "thunder-flash-step" },
  { id: "THUNDER_STORM", daoType: DaoType.Thunder, name: "Storm Cage", nodeIndex: 3, topologyId: "wrist", bodyOverlayPosition: { x: 0.64, y: 0.5 }, associatedSkillId: "thunder-tempest-form" },
  { id: "THUNDER_SKY", daoType: DaoType.Thunder, name: "Sky Roar", nodeIndex: 4, topologyId: "ajna", bodyOverlayPosition: { x: 0.62, y: 0.42 }, associatedSkillId: "thunder-soul-roar" },
  { id: "THUNDER_HEAVEN", daoType: DaoType.Thunder, name: "Heaven Drum", nodeIndex: 5, topologyId: "sahasrara", bodyOverlayPosition: { x: 0.58, y: 0.34 }, associatedSkillId: "thunder-static-field" }
];
