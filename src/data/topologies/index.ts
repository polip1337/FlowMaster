export type { T1ClusterTopology, T1EdgeDef, T1NodeDef, TopologySpecialNode } from "./types";
export { muladharaTopology } from "./muladhara";
export { svadhisthanaTopology } from "./svadhisthana";
export { manipuraTopology } from "./manipura";
export { anahataTopology } from "./anahata";
export { vishuddhaTopology } from "./vishuddha";
export { ajnaTopology } from "./ajna";
export { sahasraraTopology } from "./sahasrara";
export { binduTopology } from "./bindu";
export { shoulderTopology } from "./shoulder";
export { hipTopology } from "./hip";
export { kneeTopology } from "./knee";
export { elbowTopology } from "./elbow";
export { wristTopology } from "./wrist";
export { handTopology } from "./hand";
export { ankleTopology } from "./ankle";
export { footTopology } from "./foot";
export { crownPositions } from "./bindu";
export { mindPositions } from "./sahasrara";
export { intentPositions } from "./ajna";
export { qiPositions } from "./vishuddha";
export { heartPositions } from "./anahata";
export { stomachPositions } from "./manipura";
export { dantianPositions } from "./svadhisthana";
export { spinePositions } from "./muladhara";
export { shoulderPositions } from "./shoulder";
export { elbowPositions } from "./elbow";
export { wristPositions } from "./wrist";
export { handPositions } from "./hand";
export { kneeLeftPositions, kneeRightPositions } from "./knee";
export { anklePositions } from "./ankle";
export { footLeftPositions, footRightPositions } from "./foot";

import { muladharaTopology } from "./muladhara";
import { svadhisthanaTopology } from "./svadhisthana";
import { manipuraTopology } from "./manipura";
import { anahataTopology } from "./anahata";
import { vishuddhaTopology } from "./vishuddha";
import { ajnaTopology } from "./ajna";
import { sahasraraTopology } from "./sahasrara";
import { binduTopology } from "./bindu";
import { shoulderTopology } from "./shoulder";
import { hipTopology } from "./hip";
import { kneeTopology } from "./knee";
import { elbowTopology } from "./elbow";
import { wristTopology } from "./wrist";
import { handTopology } from "./hand";
import { ankleTopology } from "./ankle";
import { footTopology } from "./foot";
import { crownPositions } from "./bindu";
import { mindPositions } from "./sahasrara";
import { intentPositions } from "./ajna";
import { qiPositions } from "./vishuddha";
import { heartPositions } from "./anahata";
import { stomachPositions } from "./manipura";
import { dantianPositions } from "./svadhisthana";
import { spinePositions } from "./muladhara";
import { shoulderPositions } from "./shoulder";
import { elbowPositions } from "./elbow";
import { wristPositions } from "./wrist";
import { handPositions } from "./hand";
import { kneeLeftPositions, kneeRightPositions } from "./knee";
import { anklePositions } from "./ankle";
import { footLeftPositions, footRightPositions } from "./foot";
import { buildTopologyNodeDefinitions } from "./ui-definitions";

/** All 17 named topology graphs (chakra + joint patterns; L/R share shoulder/hip/etc.). */
export const allTopologies = {
  muladhara: { ...muladharaTopology, nodeDefinitions: buildTopologyNodeDefinitions(muladharaTopology) },
  svadhisthana: { ...svadhisthanaTopology, nodeDefinitions: buildTopologyNodeDefinitions(svadhisthanaTopology) },
  manipura: { ...manipuraTopology, nodeDefinitions: buildTopologyNodeDefinitions(manipuraTopology) },
  anahata: { ...anahataTopology, nodeDefinitions: buildTopologyNodeDefinitions(anahataTopology) },
  vishuddha: { ...vishuddhaTopology, nodeDefinitions: buildTopologyNodeDefinitions(vishuddhaTopology) },
  ajna: { ...ajnaTopology, nodeDefinitions: buildTopologyNodeDefinitions(ajnaTopology) },
  sahasrara: { ...sahasraraTopology, nodeDefinitions: buildTopologyNodeDefinitions(sahasraraTopology) },
  bindu: { ...binduTopology, nodeDefinitions: buildTopologyNodeDefinitions(binduTopology) },
  shoulder: { ...shoulderTopology, nodeDefinitions: buildTopologyNodeDefinitions(shoulderTopology) },
  hip: { ...hipTopology, nodeDefinitions: buildTopologyNodeDefinitions(hipTopology) },
  knee: { ...kneeTopology, nodeDefinitions: buildTopologyNodeDefinitions(kneeTopology) },
  elbow: { ...elbowTopology, nodeDefinitions: buildTopologyNodeDefinitions(elbowTopology) },
  wrist: { ...wristTopology, nodeDefinitions: buildTopologyNodeDefinitions(wristTopology) },
  hand: { ...handTopology, nodeDefinitions: buildTopologyNodeDefinitions(handTopology) },
  ankle: { ...ankleTopology, nodeDefinitions: buildTopologyNodeDefinitions(ankleTopology) },
  foot: { ...footTopology, nodeDefinitions: buildTopologyNodeDefinitions(footTopology) }
} as const;

export type TopologyId = keyof typeof allTopologies;

export const topologyPositionsByUiId: Record<string, Record<number, { x: number; y: number }>> = {
  crown: crownPositions,
  mind: mindPositions,
  intent: intentPositions,
  qi: qiPositions,
  heart: heartPositions,
  stomach: stomachPositions,
  dantian: dantianPositions,
  spine: spinePositions,
  shoulderLeft: shoulderPositions,
  shoulderRight: shoulderPositions,
  elbowLeft: elbowPositions,
  elbowRight: elbowPositions,
  wristLeft: wristPositions,
  wristRight: wristPositions,
  handLeft: handPositions,
  handRight: handPositions,
  kneeLeft: kneeLeftPositions,
  kneeRight: kneeRightPositions,
  ankleLeft: anklePositions,
  ankleRight: anklePositions,
  footLeft: footLeftPositions,
  footRight: footRightPositions
};
