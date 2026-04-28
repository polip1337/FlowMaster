import { DaoType, type DaoNodeDef } from "../../core/dao/types";

export const waterDaoNodes: DaoNodeDef[] = [
  { id: "WATER_SPRING", daoType: DaoType.Water, name: "Spring Eye", nodeIndex: 0, topologyId: "svadhisthana", bodyOverlayPosition: { x: 0.46, y: 0.72 }, associatedSkillId: "water-river-palm" },
  { id: "WATER_STREAM", daoType: DaoType.Water, name: "Stream Curl", nodeIndex: 1, topologyId: "hip", bodyOverlayPosition: { x: 0.4, y: 0.66 }, associatedSkillId: "water-tide-cascade" },
  { id: "WATER_TIDE", daoType: DaoType.Water, name: "Tide Well", nodeIndex: 2, topologyId: "knee", bodyOverlayPosition: { x: 0.38, y: 0.6 }, associatedSkillId: "water-mist-step" },
  { id: "WATER_ABYSS", daoType: DaoType.Water, name: "Abyss Pool", nodeIndex: 3, topologyId: "ankle", bodyOverlayPosition: { x: 0.36, y: 0.54 }, associatedSkillId: "water-deluge-technique" },
  { id: "WATER_MOON", daoType: DaoType.Water, name: "Moon Basin", nodeIndex: 4, topologyId: "foot", bodyOverlayPosition: { x: 0.34, y: 0.48 }, associatedSkillId: "water-soul-mirror" },
  { id: "WATER_CALM", daoType: DaoType.Water, name: "Calm Sea", nodeIndex: 5, topologyId: "bindu", bodyOverlayPosition: { x: 0.4, y: 0.4 }, associatedSkillId: "water-serene-current" }
];
