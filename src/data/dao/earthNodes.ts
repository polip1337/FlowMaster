import { DaoType, type DaoNodeDef } from "../../core/dao/types";

export const earthDaoNodes: DaoNodeDef[] = [
  { id: "EARTH_CORE", daoType: DaoType.Earth, name: "Stone Core", nodeIndex: 0, topologyId: "muladhara", bodyOverlayPosition: { x: 0.48, y: 0.82 }, associatedSkillId: "earth-rumble-fist" },
  { id: "EARTH_PLATE", daoType: DaoType.Earth, name: "Plate Mantle", nodeIndex: 1, topologyId: "hip", bodyOverlayPosition: { x: 0.42, y: 0.76 }, associatedSkillId: "earth-boulder-step" },
  { id: "EARTH_MANTLE", daoType: DaoType.Earth, name: "Mantle Ring", nodeIndex: 2, topologyId: "knee", bodyOverlayPosition: { x: 0.44, y: 0.68 }, associatedSkillId: "earth-crag-guard" },
  { id: "EARTH_PILLAR", daoType: DaoType.Earth, name: "Pillar Vein", nodeIndex: 3, topologyId: "ankle", bodyOverlayPosition: { x: 0.46, y: 0.58 }, associatedSkillId: "earth-mountain-crush" },
  { id: "EARTH_MONOLITH", daoType: DaoType.Earth, name: "Monolith Seal", nodeIndex: 4, topologyId: "foot", bodyOverlayPosition: { x: 0.48, y: 0.5 }, associatedSkillId: "earth-immovable-soul" },
  { id: "EARTH_WORLDROOT", daoType: DaoType.Earth, name: "Worldroot", nodeIndex: 5, topologyId: "hand", bodyOverlayPosition: { x: 0.5, y: 0.42 }, associatedSkillId: "earth-rooted-presence" }
];
