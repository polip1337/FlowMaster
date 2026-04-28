import { DaoType, type DaoNodeDef } from "../../core/dao/types";

export const windDaoNodes: DaoNodeDef[] = [
  { id: "WIND_BREEZE", daoType: DaoType.Wind, name: "Breeze Step", nodeIndex: 0, topologyId: "vishuddha", bodyOverlayPosition: { x: 0.5, y: 0.64 }, associatedSkillId: "wind-gale-kick" },
  { id: "WIND_GUST", daoType: DaoType.Wind, name: "Gust Spiral", nodeIndex: 1, topologyId: "shoulder", bodyOverlayPosition: { x: 0.46, y: 0.58 }, associatedSkillId: "wind-cutter-current" },
  { id: "WIND_SQUALL", daoType: DaoType.Wind, name: "Squall Arc", nodeIndex: 2, topologyId: "elbow", bodyOverlayPosition: { x: 0.42, y: 0.52 }, associatedSkillId: "wind-voidstep" },
  { id: "WIND_TEMPEST", daoType: DaoType.Wind, name: "Tempest Eye", nodeIndex: 3, topologyId: "wrist", bodyOverlayPosition: { x: 0.38, y: 0.46 }, associatedSkillId: "wind-tempest-draw" },
  { id: "WIND_SKY", daoType: DaoType.Wind, name: "Sky Veil", nodeIndex: 4, topologyId: "hand", bodyOverlayPosition: { x: 0.34, y: 0.4 }, associatedSkillId: "wind-soul-whisper" },
  { id: "WIND_STILL", daoType: DaoType.Wind, name: "Still Horizon", nodeIndex: 5, topologyId: "ajna", bodyOverlayPosition: { x: 0.42, y: 0.34 }, associatedSkillId: "wind-untouched-drift" }
];
