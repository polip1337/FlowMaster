export type { T1ClusterTopology, T1EdgeDef, T1NodeDef, TopologySpecialNode } from "./types";
export { spineTopology as muladharaTopology } from "../../t2-nodes/spine.nodes.ts";
export { dantianTopology as svadhisthanaTopology } from "../../t2-nodes/dantian.nodes.ts";
export { stomachTopology as manipuraTopology } from "../../t2-nodes/stomach.nodes.ts";
export { heartTopology as anahataTopology } from "../../t2-nodes/heart.nodes.ts";
export { qiTopology as vishuddhaTopology } from "../../t2-nodes/qi.nodes.ts";
export { intentTopology as ajnaTopology } from "../../t2-nodes/intent.nodes.ts";
export { mindTopology as sahasraraTopology } from "../../t2-nodes/mind.nodes.ts";
export { crownTopology as binduTopology } from "../../t2-nodes/crown.nodes.ts";
export { shoulderTopology } from "./shoulder";
export { hipTopology } from "./hip";
export { kneeLeftTopology as kneeTopology } from "../../t2-nodes/kneeLeft.nodes.ts";
export { elbowTopology } from "./elbow";
export { wristTopology } from "./wrist";
export { handTopology } from "./hand";
export { ankleTopology } from "./ankle";
export { footLeftTopology as footTopology } from "../../t2-nodes/footLeft.nodes.ts";

import { spineTopology as muladharaTopology } from "../../t2-nodes/spine.nodes.ts";
import { dantianTopology as svadhisthanaTopology } from "../../t2-nodes/dantian.nodes.ts";
import { stomachTopology as manipuraTopology } from "../../t2-nodes/stomach.nodes.ts";
import { heartTopology as anahataTopology } from "../../t2-nodes/heart.nodes.ts";
import { qiTopology as vishuddhaTopology } from "../../t2-nodes/qi.nodes.ts";
import { intentTopology as ajnaTopology } from "../../t2-nodes/intent.nodes.ts";
import { mindTopology as sahasraraTopology } from "../../t2-nodes/mind.nodes.ts";
import { crownTopology as binduTopology } from "../../t2-nodes/crown.nodes.ts";
import { shoulderTopology } from "./shoulder";
import { hipTopology } from "./hip";
import { kneeLeftTopology as kneeTopology } from "../../t2-nodes/kneeLeft.nodes.ts";
import { elbowTopology } from "./elbow";
import { wristTopology } from "./wrist";
import { handTopology } from "./hand";
import { ankleTopology } from "./ankle";
import { footLeftTopology as footTopology } from "../../t2-nodes/footLeft.nodes.ts";
import { withTopologyNodeDefinitions } from "./node-definitions.ts";

/** All 17 named topology graphs (chakra + joint patterns; L/R share shoulder/hip/etc.). */
export const allTopologies = {
  muladhara: withTopologyNodeDefinitions(muladharaTopology),
  svadhisthana: withTopologyNodeDefinitions(svadhisthanaTopology),
  manipura: withTopologyNodeDefinitions(manipuraTopology),
  anahata: withTopologyNodeDefinitions(anahataTopology),
  vishuddha: withTopologyNodeDefinitions(vishuddhaTopology),
  ajna: withTopologyNodeDefinitions(ajnaTopology),
  sahasrara: withTopologyNodeDefinitions(sahasraraTopology),
  bindu: withTopologyNodeDefinitions(binduTopology),
  shoulder: withTopologyNodeDefinitions(shoulderTopology),
  hip: withTopologyNodeDefinitions(hipTopology),
  knee: withTopologyNodeDefinitions(kneeTopology),
  elbow: withTopologyNodeDefinitions(elbowTopology),
  wrist: withTopologyNodeDefinitions(wristTopology),
  hand: withTopologyNodeDefinitions(handTopology),
  ankle: withTopologyNodeDefinitions(ankleTopology),
  foot: withTopologyNodeDefinitions(footTopology)
} as const;

export type TopologyId = keyof typeof allTopologies;
