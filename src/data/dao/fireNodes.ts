import { DaoType, type DaoNodeDef } from "../../core/dao/types";

export const fireDaoNodes: DaoNodeDef[] = [
  { id: "FIRE_SPARK", daoType: DaoType.Fire, name: "Spark Gate", nodeIndex: 0, topologyId: "manipura", bodyOverlayPosition: { x: 0.54, y: 0.72 }, associatedSkillId: "fire-blazing-strike" },
  { id: "FIRE_COAL", daoType: DaoType.Fire, name: "Coal Furnace", nodeIndex: 1, topologyId: "wrist", bodyOverlayPosition: { x: 0.58, y: 0.66 }, associatedSkillId: "fire-scorch-wave" },
  { id: "FIRE_FLARE", daoType: DaoType.Fire, name: "Flare Channel", nodeIndex: 2, topologyId: "elbow", bodyOverlayPosition: { x: 0.6, y: 0.6 }, associatedSkillId: "fire-ember-dash" },
  { id: "FIRE_PYRE", daoType: DaoType.Fire, name: "Pyre Crown", nodeIndex: 3, topologyId: "shoulder", bodyOverlayPosition: { x: 0.62, y: 0.54 }, associatedSkillId: "fire-phoenix-arc" },
  { id: "FIRE_SOLARIS", daoType: DaoType.Fire, name: "Solaris Core", nodeIndex: 4, topologyId: "anahata", bodyOverlayPosition: { x: 0.58, y: 0.46 }, associatedSkillId: "fire-soul-immolation" },
  { id: "FIRE_ASHEN", daoType: DaoType.Fire, name: "Ashen Mantle", nodeIndex: 5, topologyId: "vishuddha", bodyOverlayPosition: { x: 0.56, y: 0.38 }, associatedSkillId: "fire-burning-aura" }
];
