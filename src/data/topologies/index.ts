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

/** All 17 named topology graphs (chakra + joint patterns; L/R share shoulder/hip/etc.). */
export const allTopologies = {
  muladhara: muladharaTopology,
  svadhisthana: svadhisthanaTopology,
  manipura: manipuraTopology,
  anahata: anahataTopology,
  vishuddha: vishuddhaTopology,
  ajna: ajnaTopology,
  sahasrara: sahasraraTopology,
  bindu: binduTopology,
  shoulder: shoulderTopology,
  hip: hipTopology,
  knee: kneeTopology,
  elbow: elbowTopology,
  wrist: wristTopology,
  hand: handTopology,
  ankle: ankleTopology,
  foot: footTopology
} as const;

export type TopologyId = keyof typeof allTopologies;
