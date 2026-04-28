import { DaoType, type DaoNodeDef } from "../../core/dao/types";
import { earthDaoNodes } from "./earthNodes";
import { fireDaoNodes } from "./fireNodes";
import { lifeDaoNodes } from "./lifeNodes";
import { swordDaoNodes } from "./swordNodes";
import { thunderDaoNodes } from "./thunderNodes";
import { voidDaoNodes } from "./voidNodes";
import { waterDaoNodes } from "./waterNodes";
import { windDaoNodes } from "./windNodes";

export const DAO_NODE_DEFS_BY_TYPE: Record<DaoType, DaoNodeDef[]> = {
  [DaoType.Earth]: earthDaoNodes,
  [DaoType.Fire]: fireDaoNodes,
  [DaoType.Water]: waterDaoNodes,
  [DaoType.Wind]: windDaoNodes,
  [DaoType.Void]: voidDaoNodes,
  [DaoType.Life]: lifeDaoNodes,
  [DaoType.Sword]: swordDaoNodes,
  [DaoType.Thunder]: thunderDaoNodes
};
