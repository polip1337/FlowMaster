# CULTIVATION SIMULATOR — FULL IMPLEMENTATION TASK LIST
### Covers entire GDD v2.0 + Revised T1 Flow Mechanics
### For use with Cursor agent

---

## FLOW MECHANICS QUICK REFERENCE

**T1 internal flow (player-controlled):**
```
flow(a→b) = E(a) × 0.01 × (weight_ab / 100)
actual = min(flow, C(b) − E(b))
```
- Weight is a player-set integer 0–100 on each directed edge
- All edges fire simultaneously from a tick-start snapshot
- One source T1 node generates Qi; all others are pure storage

**T2 pressure (meridian driver):**
```
P_T2 = E_T2 / C_T2    (sum of T1 energies / sum of T1 capacities)
PassiveFlow = W × (P_src − P_dst) × Pur × TypeMod × Δt
```

**I/O boundary:** Meridian pressure injects into IO_IN T1 node; player routes it inward via weights. Player routes energy toward IO_OUT T1 node; meridian withdraws from it.

**Tick order:** Source generation → IO_IN injection → T1 weight-driven flows → IO_OUT withdrawal → heat update → T1 quality refinement → meridian training → state updates → attribute recalc

---

## HOW TO READ THIS LIST

Tasks are grouped into phases. Each phase has a goal milestone. Tasks within a phase should be done roughly in order; cross-phase dependencies are noted. A Cursor agent should complete each task before starting the next within a phase.

---

# PHASE 0 — PROJECT FOUNDATION
*Goal: runnable empty project with all constants and math helpers*

**TASK-001** Adapt the project to `/src/core`, `/src/state`, `/src/ui`, `/src/data`, `/src/utils`, `/tests` directory structure. Configure tsconfig, eslint, vitest. All core logic must be importable without DOM.

**TASK-002** Create `src/core/constants.ts` with all simulation constants: TICK_RATE=10, DELTA_T=0.1, T1_MAX_FLOW_RATE=0.01, T1_BASE_SOURCE_RATE=0.5, T1_SECONDARY_SOURCE_RATE=0.05, BETA_PORT=0.15, JING_STRUCTURE_CONST=20000, PURITY_SCALE_CONST=200000, FLOW_BONUS_K=4.0, SCALE_W=8.0, RANK_MULTIPLIERS=[1,2,3.5,6,10,16,25,38,60], LEVEL_MULTIPLIERS=[1,1.12,1.26,1.41,1.58,1.78,2,2.24,2.51], move any currents constants to this file.

**TASK-003** Create `src/core/energy/EnergyType.ts` with `EnergyType` enum (Qi, Jing, YangQi, Shen), `EnergyPool = Record<EnergyType, number>`, `emptyPool()`, `totalEnergy(pool)`, `addPools(a,b)`, `scaledPool(pool, factor)` helpers.

**TASK-004** Create `src/core/energy/energyModifiers.ts` with the full type modifier matrix: flowMod, purityLossMod, widthFactor, purityFactor, internalAlphaMod, unlockWeight, heatPerLost, resonanceWeight — one record per EnergyType as specified in GDD Section 5.2.

**TASK-005** Create `src/utils/math.ts` with: `clamp(v,min,max)`, `lerp(a,b,t)`, `qualityMultiplier(q: 1–10): number` (lookup table from GDD), `qualityRefinementThreshold(q): number`, `logScaleWidth(tf, typeFactor, base, scaleW)`, `logScalePurityFlow(tf, typeFactor)`, `jingStructuralPurity(deposit)`, `shenScatterBonus(bonus)`, `flowBonusPercent(W, Pur, tf)`, `resonanceQualityFactor(qualities)`.

**TASK-006** Create `SimulationClock` class in `src/core/simulation/SimulationClock.ts`. Methods: `start()`, `stop()`, `pause()`, `resume()`, `onTick(cb)`. Uses `setInterval` at TICK_RATE. Exposes `tick: number` counter and `isPaused: boolean`.

---

# PHASE 1 — T1 NODE DATA MODEL
*Goal: T1 nodes exist, hold energy, and can be read/written*

**TASK-007** Create `src/core/nodes/T1Types.ts`: enums `T1NodeType` (INTERNAL, IO_IN, IO_OUT, IO_BIDIR) and `T1NodeState` (LOCKED, UNSEALED, ACTIVE).

**TASK-008** Create `src/core/nodes/T1Node.ts` interface: id, type, state, energy (EnergyPool), capacity, quality, outgoingEdges (number[]), incomingEdges (number[]), meridianSlotId (string|null), isSourceNode, refinementPoints, lifetimeFlowOut, resonanceMultiplier (default 1.0), damageState ('healthy'|'cracked'|'shattered').

**TASK-009** Create `src/core/nodes/T1Edge.ts` interface: fromId, toId, weight (0–100 integer), isLocked. Create `T1EdgeMap = Map<string, T1Edge>` with key `"${from}-${to}"`. Add helpers `edgeKey(from,to)`, `getEdge(map, from, to)`, `setEdgeWeight(map, from, to, weight)`.

**TASK-010** Create `src/core/nodes/t1Factory.ts` with `createT1Node(id, type, isSource, baseCapacity): T1Node` returning a node at LOCKED state with quality=1, empty energy pool, refinementPoints=0.

**TASK-011** Implement `getT1Capacity(baseCapacity, quality): number` using `qualityMultiplier` from math utils. Add to `src/core/nodes/t1Logic.ts`.

**TASK-012** Write unit tests for T1Node creation and capacity scaling: quality 1 returns 1.0× base, quality 5 returns 2.35× base, quality 10 returns 7.0× base.

---

# PHASE 2 — T1 FLOW LOGIC
*Goal: energy moves between T1 nodes via player-set weights*

**TASK-013** Implement `computeT1Flows(nodes: Map<number,T1Node>, edges: T1EdgeMap): FlowResult[]` in t1Logic.ts. FlowResult = {fromId, toId, amount: EnergyPool}. Rules: snapshot energies at start; for each edge compute `E(from)×0.01×(weight/100)`, cap by dest remaining capacity, split by source energy type ratios. Locked dest = zero flow.

**TASK-014** Implement `applyT1Flows(nodes: Map<number,T1Node>, flows: FlowResult[]): void`. Subtracts from source pools, adds to dest pools. Updates `lifetimeFlowOut` on each source node.

**TASK-015** Implement T1 source energy generation: `generateSourceEnergy(node: T1Node): EnergyPool`. Source node returns `T1_BASE_SOURCE_RATE × qualityMultiplier(quality)` Qi. ACTIVE INTERNAL non-source node returns `T1_SECONDARY_SOURCE_RATE × quality` Qi. All others return emptyPool.

**TASK-016** Implement T1 state transitions in `updateT1States(nodes: Map<number,T1Node>): T1StateChangeEvent[]`. LOCKED→UNSEALED: all predecessors in cluster graph are ACTIVE and node itself is not LOCKED due to topology order. UNSEALED→ACTIVE: `totalEnergy(node.energy) >= node.capacity × 0.30`. One-way only. Return events for UI.

**TASK-017** Implement T1 quality refinement: `updateT1Refinement(node: T1Node, flowedThisTick: number): void`. Add `flowedThisTick / 1000` to refinementPoints. Check threshold for quality level using `qualityRefinementThreshold`. On quality gain: increment quality, recalculate capacity, reset excess refinement points.

**TASK-018** Write unit tests: node with 1000 Qi energy, edge to empty dest at weight 100 → flows 10 Qi. Two outgoing edges at weight 50 each → each flows 5 Qi. Locked dest → zero flow. Source node generates correct Qi per tick.

---

# PHASE 3 — T2 NODE DATA MODEL
*Goal: T2 nodes wrap T1 clusters and expose aggregate stats*

**TASK-019** Create enums `T2NodeType` (CHAKRA, JOINT) and `T2NodeState` (LOCKED, SEALING, ACTIVE, REFINED) in `src/core/nodes/T2Types.ts`.

**TASK-020** Create `src/core/nodes/T2Node.ts` interface: id, name, type, state, t1Nodes (Map<number,T1Node>), t1Edges (T1EdgeMap), ioNodeMap (Map<string,number> — meridianId→T1NodeId), rank, level, sealingProgress, unlockConditions, upgradeConditions, meridianSlotIds (string[]), latentT1NodeIds (number[]), flowBonusPercent (number — applied from meridians), nodeDamageState.

**TASK-021** Implement T2 computed getters in `src/core/nodes/t2Logic.ts`: `getT2EnergyPool(node)`, `getT2TotalEnergy(node)`, `getT2Capacity(node)`, `getT2Pressure(node)` (totalEnergy/capacity, clamped 0–1), `getT2Resonance(node)` using active T1 count × resonanceQualityFactor × special node multipliers.

**TASK-022** Create `src/data/conditions.ts` with UnlockCondition and UpgradeCondition discriminated union types. Condition types: node_rank, node_level, node_active, energy_accumulated (by type, scope), meridian_state, meridian_quality, other_node_level, lifetime_energy_generated, special_event.

**TASK-023** Implement `evaluateUnlockConditions(conditions, gameState): boolean` and `evaluateUpgradeConditions(node, conditions, gameState): boolean` in `src/core/nodes/conditionEvaluator.ts`. All conditions must pass (AND logic).

**TASK-024** Implement `computeStandardUpgradeRequirements(node: T2Node): UpgradeCondition[]` generating level-up conditions: energyStored = 500×rank×level, lifetimeFlow = 2000×rank²×level, avgMeridianQuality = rank + level/3.

**TASK-025** Implement T2 sealing progress: `updateSealingProgress(node, arrivedThisTick: EnergyPool, baseThreshold, unlockEfficiencyBonus): boolean`. QE = sum of each type × unlockWeight[type]. Progress += QE / (baseThreshold × (1 - unlockEfficiencyBonus)). Returns true on completion.

**TASK-026** Write unit tests: getT2Pressure with half-filled cluster returns 0.5. Resonance with all ACTIVE quality-5 nodes returns 1.0. Sealing progress reaches 1.0 after correct energy delivery.

---

# PHASE 4 — CLUSTER TOPOLOGIES
*Goal: all 24 T2 node cluster shapes defined as static data*

**TASK-027** Create `src/data/topologies/types.ts` with T1NodeDef (id, type, isSourceNode, unlockAfter[]), T1EdgeDef (from, to, defaultWeight), T1ClusterTopology (nodeCount, nodes, edges, meridianIoMap, baseCapacityPerNode, specialNodes with resonanceMultiplier overrides, yangQiConversionNode?, passiveAbsorberNode?, stabilizationReserveNode?).

**TASK-028** Implement Muladhara topology (Square Seal, 12 nodes) in `src/data/topologies/muladhara.ts`. Nodes: P_N(0,BIDIR,source), P_W(1,BIDIR), P_E(2,BIDIR), P_S(3,INTERNAL,latent), Sq_NW(4), Sq_NE(5), Sq_SW(6), Sq_SE(7), T_L(8), T_R(9), T_B(10), C(11,resonanceMultiplier=2). All edges as per GDD. MeridianIoMap: SACRAL→0, L_HIP→1, R_HIP→2.

**TASK-029** Implement Svadhisthana topology (Lotus Hex, 12 nodes) in `src/data/topologies/svadhisthana.ts`. Outer hex petals P0–P5, inner hex I0–I5. Active I/O: P0(ROOT), P3(SOLAR), P1(L_HIP Belt), P4(R_HIP Belt). Crescent shortcuts I0→I3, I1→I4 default weight 0.

**TASK-030** Implement Manipura topology (Ten-Spoke Wheel, 12 nodes) in `src/data/topologies/manipura.ts`. Outer tips OT_N(0,BIDIR→HEART), OT_S(3,BIDIR→SACRAL), others INTERNAL/latent. Inner pentagon IR1–IR5, center C(11). Mark yangQiConversionNode=11.

**TASK-031** Implement Anahata topology (Star of Two Triangles, 12 nodes) in `src/data/topologies/anahata.ts`. Star points SP_N(0→THROAT), SP_NE(1→R_SHOULDER), SP_SE(2,latent), SP_S(3→SOLAR), SP_SW(4,latent), SP_NW(5→L_SHOULDER). Inner hexagon HX[0–5]. Two-triangle edge pattern as per GDD.

**TASK-032** Implement Vishuddha topology (Sixteen-Spoke Mandala, 12 nodes) in `src/data/topologies/vishuddha.ts`. Outer arc OA[0–5], inner pentagon IR[0–4], center C(11). Active I/O: OA_1(→HEART), OA_4(→AJNA). Storage arc nodes non-I/O but contribute resonance.

**TASK-033** Implement Ajna topology (Yin-Yang Dyad, 12 nodes) in `src/data/topologies/ajna.ts`. Yin chain YN[0–4], Yang chain YG[5–9], junctions J_BOT(10,→THROAT), J_TOP(11,→SAHASRARA). S-curve bridges: YN_2(2)→YG_4(8), YN_4(4)→YG_2(6). Yin nodes affinity Shen, Yang nodes affinity YangQi (metadata only).

**TASK-034** Implement Sahasrara topology (Fractal Crown, 12 nodes) in `src/data/topologies/sahasrara.ts`. Outer pentagon OR[0–4], middle square MR[5–8], inner pair IR[9–10], center C(11). Active I/O: OR_1(0,→AJNA), OR_3(2,→BINDU). Mark C(11) as realmCapNode.

**TASK-035** Implement Bindu topology (Crescent-Dot, 12 nodes) in `src/data/topologies/bindu.ts`. Crescent chain CR[0–10], dot node D(11). Active I/O: CR[0](→SAHASRARA). D connects only to CR[5]. Mark D(11) as stabilizationReserveNode. Note: D is the only node in the entire game that connects to exactly one neighbor and has no I/O.

**TASK-036** Implement Shoulder topology (Ladder, 8 nodes) in `src/data/topologies/shoulder.ts`. Top rail TR[0–3], bottom rail BR[4–7]. I/O: TR_1(0,→HEART), BR_4(7,→ELBOW). Rungs: TR_i↔BR_i for i=0..3 (bidirectional for internal diffusion). Shared topology for L and R instances.

**TASK-037** Implement Hip topology (Arch-and-Chain, 8 nodes) in `src/data/topologies/hip.ts`. Arch: AR_L(0,→ROOT), AR_M(1,latent), AR_R(2,→SACRAL Belt). Keystone K_L(3), K_R(4). Chain: CH_A(5), CH_B(6,→KNEE), CH_C(7). Edges: arch ring, AR_M→both K, K_L→CH_A, K_R→CH_C, CH chain.

**TASK-038** Implement Knee topology (Bent Reed, 6 nodes) in `src/data/topologies/knee.ts`. V_1(0,→HIP), V_2(1), V_3(2), H_1(3), H_2(4), H_3(5,→ANKLE). Single linear chain 0→1→2→3→4→5. No redundancy — pure relay.

**TASK-039** Implement Elbow topology (Forked Branch, 6 nodes) in `src/data/topologies/elbow.ts`. Trunk T_1(0,→SHOULDER), T_2(1), T_3(2,→WRIST). Branch B_1(3), B_2(4), B_3(5,latent). Edges: 0→1→2 (trunk), 1→3→4→5 (branch off T_2). Branch siphons energy from T_2.

**TASK-040** Implement Wrist topology (Cross-Gate, 6 nodes) in `src/data/topologies/wrist.ts`. N(0,→ELBOW), E(1,latent), S(2,→HAND), W(3,latent), CEN(4), EXT(5). Star edges: all outer→CEN. Extra arm 2→5 (EXT). CEN is the only path N→S.

**TASK-041** Implement Hand topology (Open Palm, 6 nodes) in `src/data/topologies/hand.ts`. PALM(0,→WRIST), F1(1)–F5(5). Star: PALM→all fingers. Terminal — no export, no loop inclusion. Mark as terminalNode=true on topology.

**TASK-042** Implement Ankle topology (Figure-Eight, 6 nodes) in `src/data/topologies/ankle.ts`. Upper loop UL[0–2] ring, Lower loop LL[3–5] ring. I/O: UL_A(0,→KNEE), LL_A(3,→FOOT). Bridge: UL_B(1)↔LL_B(4). Internal loops allow mini-circulation within the ankle cluster.

**TASK-043** Implement Foot topology (Ground Arch, 6 nodes) in `src/data/topologies/foot.ts`. HEEL(0,→ANKLE), AR_1(1), AR_2(2), AR_3(3), SOLE(4), TOE(5). Arch chain 0→1→2→3→5. Branch 2→4 (SOLE). Mark passiveAbsorberNode=4 (SOLE absorbs Earth Qi from environment). Terminal.

**TASK-044** Create `src/core/nodes/clusterFactory.ts` with `createT2Cluster(topology, t2NodeId): {nodes, edges}`. Instantiates all T1 nodes from topology defs (state=LOCKED except source node=UNSEALED, quality=1). Creates all T1 edges with default weights. Applies special node overrides (resonanceMultiplier, etc.).

**TASK-045** Write tests for cluster factory: Muladhara creates 12 nodes, source node P_N is UNSEALED, all others LOCKED, edge count matches topology, special center node has resonanceMultiplier=2.

---

# PHASE 5 — MERIDIAN SYSTEM
*Goal: energy flows between T2 nodes through typed, trainable channels*

**TASK-046** Create enum `MeridianState` (UNESTABLISHED, NASCENT, DEVELOPED, REFINED, TRANSCENDENT) with width bases [0,1,3,8,20] and TF thresholds [0,0,10000,100000,1000000] in `src/core/meridians/MeridianTypes.ts`.

**TASK-047** Create `src/core/meridians/Meridian.ts` interface: id, nodeFromId, nodeToId, ioNodeOutId (T1 id in source), ioNodeInId (T1 id in dest), state, width, purity, totalFlow, jingDeposit, shenScatterBonus, basePurity, typeAffinity (EnergyType|null), affinityFraction, dominantTypeAccumulator (EnergyPool for lifetime tracking), isEstablished, isScarred (bool), scarPenalty (number).

**TASK-048** Implement `establishMeridian(m: Meridian, firstEnergyType: EnergyType)`: set isEstablished=true, state=NASCENT, basePurity per type (Qi:0.55, Jing:0.60, YangQi:0.50, Shen:0.65). Requires both endpoint nodes ACTIVE.

**TASK-049** Implement `computeMeridianPurity(m: Meridian): number`. Two components: structural=`0.25×jingDeposit/(jingDeposit+JING_STRUCTURE_CONST)`, flow=`logScalePurityFlow(totalFlow, typePurityFactor)`. Total = basePurity + structural + flow + shenScatterBonus, capped at 0.99.

**TASK-050** Implement `computeMeridianWidth(m: Meridian, typeMix: EnergyPool): number`. typeFactor = weighted average of widthFactor[type] by mix fraction. Width = widthBase(state) × logScaleWidth(totalFlow, typeFactor, widthBase, SCALE_W). Update state if TF crosses threshold.

**TASK-051** Implement `updateMeridianAffinity(m: Meridian, flowThisTick: EnergyPool)`. Update dominantTypeAccumulator. affinityFraction = dominant_TF / totalFlow. If ≥0.60 → set typeAffinity. Create `getAffinityModifiers(m, type): {widthMod, purityLossMod}` — attuned: 1.25/0.85, non-attuned: 1.0/1.10.

**TASK-052** Implement `updateMeridianDeposits(m: Meridian, jingFlowThisTick: number, shenLostThisTick: number)`. jingDeposit += jingFlow × purity × 0.001. shenScatterBonus += shenLost × 0.05.

**TASK-053** Implement passive meridian flow: `computePassiveMeridianFlow(m, fromNode, toNode): EnergyPool`. Uses IO node pressures: ΔP = P_local(io_out) - P_local(io_in). Per type: flowRate = W × ΔP × Pur × flowMod[type] × affinityMod × Δt. Total flow capped by W. Negative ΔP = zero flow (no reverse on single meridian).

**TASK-054** Implement active meridian flow: `computeActiveMeridianFlow(m, fromNode, toNode, techniqueStrength): EnergyPool`. pumpMod = techniqueStrength × P_T2(from), clamped 0–2.5. flowRate = W × pumpMod × Pur × flowMod × Δt. Can flow against ΔP gradient.

**TASK-055** Implement `applyMeridianFlow(fromT2, toT2, flow: EnergyPool, m: Meridian)`. Withdraw from io_out T1 node (capped by available energy). Deposit to io_in T1 node (capped by capacity). Compute energy lost = flow × (1-Pur) per type. Heat += yangQiLost × heatPerLost. Update TF.

**TASK-056** Implement `computeFlowBonus(m: Meridian): number`. quality = m.width × m.purity. bonus = FLOW_BONUS_K × log10(1+quality) × log10(1+m.totalFlow/1000). Returns percent to add to both endpoint node max capacities.

**TASK-057** Implement reverse meridian opening: `canOpenReverse(forward: Meridian, gameState): boolean` — forward.state ≥ DEVELOPED, both endpoint nodes level ≥ 3. `openReverseMeridian(forward, gameState): Meridian` — creates new Meridian with swapped from/to, charges Jing and YangQi cost (500×rank×hopCount Jing + 200×rank YangQi).

**TASK-058** Implement IO_BIDIR direction resolution per tick: `resolveBidirDirection(m: Meridian, selfNode: T2Node, neighborNode: T2Node): 'send'|'receive'|'idle'`. Compare P_T2 values; if ΔP < 0.05 return idle.

**TASK-059** Write meridian tests: NASCENT meridian at ΔP=0.5 flows width×0.5×purity×Δt. FlowBonus for REFINED meridian at 500k TF ≈ 9.6%. Purity reaches 0.99 cap only asymptotically.

---

# PHASE 6 — BODY MAP TOPOLOGY
*Goal: the 24-node body graph is defined and a GameState can be built from it*

**TASK-060** Create `src/data/bodyMap.ts` defining all body adjacency edges as `BodyEdgeDef[]`: {fromNodeId, toNodeId, canonicalDir, fromT1IoId, toT1IoId, hopCount}. Include all 24 connections from GDD Section 3: spine chain (ROOT→SACRAL→SOLAR→HEART→THROAT→AJNA→CROWN→BINDU), both arm chains (HEART→SHOULDER→ELBOW→WRIST→HAND), both leg chains (ROOT→HIP→KNEE→ANKLE→FOOT), belt vessels (ROOT↔L_HIP, ROOT↔R_HIP, SACRAL↔L_HIP, SACRAL↔R_HIP), cross vessel (L_SHOULDER↔R_SHOULDER via HEART).

**TASK-061** Create `src/data/t2NodeDefs.ts` with T2NodeDef records for all 24 nodes. Each record includes: id, displayName, type, topology (reference), primaryAffinity, secondaryAffinity, sealThreshold, unlockConditions (from GDD Section 5.1 tables), baseCapacityPerT1, displayPosition {x,y} (normalized 0–1 on body silhouette), description.

**TASK-062** Implement Muladhara unlock conditions: auto-active (no conditions). Svadhisthana: node_rank(muladhara,1), node_level(muladhara,3), energy_accumulated(Qi,500). All 24 nodes' conditions from GDD Section 5.1.

**TASK-063** Create `src/core/simulation/bodyMapFactory.ts` with `buildInitialGameState(): GameState`. Instantiates all 24 T2 nodes via clusterFactory. Creates all meridians from bodyMap as UNESTABLISHED. Sets Muladhara ACTIVE with source node UNSEALED. All other T2 nodes LOCKED.

**TASK-064** Create `src/state/GameState.ts` interface: t2Nodes (Map<string,T2Node>), meridians (Map<string,Meridian>), bodyHeat, maxBodyHeat, activeRoute (CirculationRoute|null), technique (CultivationTechnique), playerDao (PlayerDao), combat (CombatState|null), inventory (Treasure[]), globalTrackers (lifetimeEnergyByType, totalEnergyGenerated, nodeDamageCount, combatCount), tutorial (TutorialState), tick.

---

# PHASE 7 — SIMULATION TICK ENGINE
*Goal: the world updates correctly 10 times per second*

**TASK-065** Implement master tick in `src/core/simulation/tick.ts`: `simulationTick(state: GameState): GameState` (pure function). Executes the 12-step tick order from the flow mechanics spec. Returns new state object (immutable update pattern).

**TASK-066** Implement step 1 (source generation): for all T2 nodes, for each T1 node, call generateSourceEnergy and add to node energy pool.

**TASK-067** Implement step 2 (IO_IN injection): for each established meridian, compute flow (passive or active if on route), deposit to IO_IN T1 node. Handle BIDIR direction resolution.

**TASK-068** Implement step 3 (T1 weight-driven flows): for each T2 node cluster, call computeT1Flows from snapshot then applyT1Flows.

**TASK-069** Implement step 4 (IO_OUT withdrawal): for each established meridian, withdraw computed flow amount from IO_OUT T1 node.

**TASK-070** Implement step 5 (heat update) in `src/core/simulation/heatSystem.ts`. Accumulate yangQiLost from all meridians × heatPerLost. Dissipate: 0.5 × manipuraResonance × Δt. Apply heat thresholds: hot (40%)→purity −5%, scorching (65%)→HP damage 0.01/tick, critical (85%)→node crack roll per tick.

**TASK-071** Implement step 6 (T1 quality refinement): for all T1 nodes with lifetimeFlowOut changed this tick, call updateT1Refinement.

**TASK-072** Implement step 7 (meridian training): for all established meridians that had flow this tick, call updateMeridianWidth, updateMeridianPurity, updateMeridianAffinity, updateMeridianDeposits.

**TASK-073** Implement step 8 (flow bonus update, throttled every 10 ticks): recompute FlowBonus for all meridians, sum bonuses per T2 node, apply as capacity multiplier to all T1 nodes in each cluster.

**TASK-074** Implement step 9 (T1 state update): for all T2 clusters, call updateT1States. Unlock edges when destination node becomes UNSEALED (remove locked flag).

**TASK-075** Implement step 10 (T2 state update): evaluate unlock conditions for LOCKED nodes; advance SEALING progress; check upgrade conditions for ACTIVE nodes; fire level-up if conditions met.

**TASK-076** Implement step 11 (attribute recalc, throttled every 10 ticks): recompute all cultivation and combat attributes from active nodes.

**TASK-077** Write integration test: run 1000 ticks from initial state. Assert Muladhara T1 nodes activate sequentially (P_N first). Assert Qi accumulates. Assert no NaN values anywhere in state.

---

# PHASE 8 — ENERGY SPECIAL MECHANICS
*Goal: Jing, YangQi, and Shen have their unique behaviors*

**TASK-078** Implement Foot SOLE passive absorption in tick step 1: for each ACTIVE foot T1 cluster (L and R), if SOLE node (id=4) is ACTIVE, add `0.03 × quality × environmentModifier` Jing to SOLE node per tick. Default environmentModifier=1.0.

**TASK-079** Implement Manipura Refining Pulse in `src/core/simulation/conversion.ts`. Player-toggleable. Each tick when active: at furnace node C (id=11), convert Qi → YangQi at ratio 3:1, efficiency = `clamp(0.30 + 0.07×level + 0.03×rank, 0.30, 0.95)`, reduced by heat penalty above 40%. Generates heat: converted_amount × 0.2.

**TASK-080** Implement Shen passive generation: Anahata generates 0.002 Shen/tick when resonance>0.5. Ajna generates 0.002 Shen/tick when resonance>0.5. Both add to their source T1 node's energy pool.

**TASK-081** Implement multi-type flow priority in meridians: when total requested flow exceeds W, prioritize Shen > Jing > Qi > YangQi. Scale each type's actual flow proportionally within available width.

**TASK-082** Implement per-type soft capacity caps in T2 nodes: affinity types fill freely to 100% of C_T2; non-affinity types soft-cap at 60%. Above 60%, overflow pressure = `(E_type/(0.6×C_T2) − 1.0)×0.5`, added to local IO pressure for faster export of excess.

**TASK-083** Implement Jing depletion warning: if total body Jing < 10% of total Jing capacity, all ACTIVE T2 nodes take 0.001 HP damage per tick (tracked as a separate HP pool on the body, not node damage). Display warning indicator.

---

# PHASE 9 — CIRCULATION ROUTES
*Goal: player can define loops that train meridians efficiently*

**TASK-084** Create `CirculationRoute` interface in `src/core/circulation/types.ts`: id, nodeSequence (string[]), isActive, loopEfficiency, bottleneckMeridianId, estimatedHeatPerTick, estimatedTrainingMultiplier.

**TASK-085** Implement `validateRoute(nodeSequence, meridians): {valid, errors}`. Checks: min 2 nodes (with double meridian), max 16 nodes, each consecutive pair has established meridian in direction, no revisited nodes (except close), all nodes ACTIVE, no terminal nodes included (Hand, Foot marked as terminalNode on topology).

**TASK-086** Implement `computeRouteMetrics(route, meridians, t2Nodes): void`. loopEfficiency = min(1.20, 0.60 + 0.06×(n−2)). Bottleneck = meridian with lowest W×Pur. heatPerTick = sum of yangQiFraction×flowRate×(1−Pur) over all meridians.

**TASK-087** Implement `executeCirculationRoute(route, state)` called from tick step 2. Uses active flow for each meridian in route. TF contribution multiplied by loopEfficiency. Accumulates to route heat total. Throttle if bodyHeat exceeds 60% (apply ThrottleFactor = max(0.1, 1−(heat/maxHeat−0.6)×2.5)).

**TASK-088** Implement Great Circulation check: `isGreatCirculationAvailable(state): boolean` — all 24 nodes ACTIVE, all canonical meridians DEVELOPED+. When full 24-node route active: loopEfficiency override to 1.30, TypeWidthFactor×1.25, TypePurityFactor×1.25, Shen generation +0.003/tick at Anahata IO_IN, heat multiplier ×1.5.

**TASK-089** Implement Ankle mini-circulation detection: if the active route includes an Ankle node but neither its Knee nor Foot connections are in the route, detect the internal UL/LL loop and apply a bonus: internal ring nodes train quality 20% faster.

---

# PHASE 10 — ATTRIBUTE SYSTEM
*Goal: node states produce numeric attributes that affect all systems*

**TASK-090** Define `CultivationAttributes` and `CombatAttributes` interfaces in `src/core/attributes/types.ts` as listed in GDD Section 8. All fields are numbers. Add `createEmpty()` factories returning all-zero instances.

**TASK-091** Define per-node base attribute contributions in `src/data/attributeDefs.ts`. For each of the 24 T2 nodes, specify their baseAttributes object (cultivation and combat partials) as given in GDD Section 8 tables.

**TASK-092** Implement `computeAllAttributes(state): {cultivation, combat}` in `src/core/attributes/attributeComputer.ts`. For each ACTIVE T2 node: contribution = base × resonance × RANK_MULTIPLIERS[rank−1] × LEVEL_MULTIPLIERS[level−1]. Sum all contributions. Apply meridian FlowBonus sum to maxEnergyBonus.

**TASK-093** Implement Ajna lobe balance check: after computing base criticalInsight, compute imbalance = |yinEnergy − yangEnergy| / totalLobeEnergy. criticalInsight ×= (1 − imbalance × 0.5). Yin = nodes 0–4, Yang = nodes 5–9 in Ajna cluster.

**TASK-094** Apply cultivation attributes as system modifiers: circulationSpeed multiplies active flow PumpMod, refinementRate multiplies quality gain rate, unlockEfficiency reduces seal thresholds, daoInsightGain adds to insight accumulation, meridianRepairRate speeds node damage repair.

**TASK-095** Apply combat attributes in combat: physicalPower multiplies physical skill base damage, techniquePower multiplies technique/soul skill damage, mobility affects dodge chance, grounding affects stagger resistance, attackSpeed reduces ticksUntilNextSkill, energyRecovery increases combat pool regen.

---

# PHASE 11 — PROGRESSION SYSTEM
*Goal: nodes unlock, level up, and rank advance correctly*

**TASK-096** Implement `checkAndUnlockT2Nodes(state): UnlockEvent[]` in `src/core/progression/unlockController.ts`. Each tick (throttled to every 30 ticks), evaluate unlockConditions for all LOCKED nodes. Transition to SEALING on success. Log UnlockEvent for UI.

**TASK-097** Implement `checkLevelUps(state): LevelUpEvent[]`. For all ACTIVE nodes below level 9, evaluate upgradeConditions. On success: increment level. Enforce multi-node constraints (Anahata ≤ Shoulder level, Sahasrara requires all nodes within 2 levels).

**TASK-098** Implement rank breakthrough system in `src/core/progression/rankController.ts`. Check body-wide conditions from GDD Section 6.3 table. When met: drain Jing+Shen cost, increment rank, reset level to 1, apply +1 quality to all T1 nodes in cluster (capped at rank×1.5 rounded up), fire BreakthroughEvent.

**TASK-099** Implement Sahasrara Realm Cap: no T2 node can advance beyond rank = sahasraraRank + 1. Enforce in rank breakthrough check. Sahasrara's own rank advancement requires a DaoComprehensionChallenge event (flag set by special combat/event, not just resources).

**TASK-100** Implement reverse meridian opening progression gate: add to upgrade requirements UI a "Reverse Meridians Available" section showing which connections can now be doubled and their costs.

---

# PHASE 12 — DAO SYSTEM
*Goal: player selects a Dao and gains Dao nodes and skills*

**TASK-101** Create `src/core/dao/types.ts`: DaoType enum (Earth, Fire, Water, Wind, Void, Life, Sword, Thunder), DaoNodeDef, PlayerDao interface (selectedDao, daoNodes: Map<string,T2Node>, daoInsights, insightThresholds, comprehensionLevel, resetCost).

**TASK-102** Define Dao node topologies for all 8 Daos. Each Dao has 5–7 Dao nodes with their own T1 cluster topologies (can reuse simple variants of existing topologies). Create `src/data/dao/[daoname]Nodes.ts` for each. Each Dao node has a bodyOverlayPosition.

**TASK-103** Define skills for each Dao: each Dao has at minimum 2 physical, 1 technique, 1 movement, 1 soul, 1 passive skill. Create `src/data/dao/skills.ts` with SkillDef (id, daoType, category, energyCost: EnergyPool, damage formula, cooldownTicks, unlockedByDaoNode). All 8 Daos × 6 skills = 48 skill definitions.

**TASK-104** Implement Dao selection trigger: `checkDaoSelectionTrigger(state): boolean` — player has reached Rank 2 for the first time and has no Dao selected. Fires MomentOfStillnessEvent that pauses cultivation and presents Dao selection UI.

**TASK-105** Implement `selectDao(state, daoType): GameState`. Sets playerDao.selectedDao. Creates first Dao node cluster. Adds first Dao skill to available skills. Logs selection permanently (Dao cannot be changed without paying resetCost = 1,000,000 combined Jing+Shen).

**TASK-106** Implement Dao Insight generation: base = daoInsightGain attribute × Δt × (1 + ajnaResonance × 0.5). Burst: +50 insights on breakthrough events, +10 on combat victories, +100 on DaoComprehensionChallenge completion.

**TASK-107** Implement Dao node unlock and leveling: uses Dao Insights as primary resource plus specific energy type per Dao (Earth=Jing, Fire=YangQi, Water=Qi, Wind=YangQi, Void=Shen, Life=Jing+Shen, Sword=YangQi, Thunder=YangQi+Shen). Dao node SEALING threshold = insightThreshold[nodeIndex].

**TASK-108** Implement Dao node skill unlock: when a Dao node reaches ACTIVE, its associated skill becomes available for combat rotation. Skills scale with Dao node rank and level using techniquePower attribute.

**TASK-109** Implement Dao comprehension level: separate from node levels. Comprehension advances by 1 each time any Dao node rank-advances. At comprehension ≥ 8, unlock DaoComprehensionChallenge events. At max comprehension (all Dao nodes rank 9), flag as "Dao Fully Comprehended" (needed for Rank 9 body breakthrough).

---

# PHASE 13 — COMBAT SYSTEM
*Goal: automated combat resolves correctly and interacts with cultivation state*

**TASK-110** Define `EnemyDef` in `src/data/enemies/types.ts`: id, name, tier (1–9 corresponding to realm ranks), hp, soulHp, physicalAttack, soulAttack, attackSpeedTicks, preferredNodeTarget (string|null), dropTable (TreasureDropDef[]), realmRequired.

**TASK-111** Create 5 base enemy archetypes in `src/data/enemies/archetypes.ts`: BanditCultivator (tier 1–2, physical focus), WildBeast (tier 1–3, no soul attacks, high HP), RogueScholar (tier 3–5, soul attacks, node targeting), AncientGuardian (tier 5–7, targets chakra nodes specifically), TribulationSpirit (tier 7–9, all attack types, high soul damage).

**TASK-112** Create `CombatState` interface in `src/core/combat/types.ts`: active, enemy, playerHp, playerMaxHp (= 100 + physicalDurability), playerSoulHp, playerMaxSoulHp (= 50 + soulDurability), combatEnergyPool, enemyHp, enemySoulHp, rotation (SkillId[]), currentSkillIndex, ticksUntilNextSkill, stabilizationUsed, heatSnapshot, combatTick, log (CombatLogEntry[]).

**TASK-113** Implement combat initialization: `startCombat(state, enemy): GameState`. Sets combatEnergyPool = 40% of each energy type from body. Reduces body energy accordingly. Sets playerMaxHp and playerMaxSoulHp from attributes. Resets stabilizationUsed=false.

**TASK-114** Implement combat tick: `combatTick(combat, attributes): CombatTickResult`. Advance ticksUntilNextSkill. When 0: execute current rotation skill, compute damage = skillBase × relevantAttribute × critRoll, drain energy from combatEnergyPool, advance rotation index. Enemy attacks per its speed: deals physicalAttack to playerHp, soulAttack to playerSoulHp. Combat energy pool regenerates at energyRecovery rate.

**TASK-115** Implement skill damage formulas by category: Physical = base × physicalPower / 100. Technique = base × techniquePower / 100. Soul = base × soulPower / 100 (applied to enemy soulHp). Movement = no damage, instead applies dodge chance for next N enemy attacks. Passive = always-on effect during combat.

**TASK-116** Implement critical hits: `rollCrit(criticalInsight): boolean`. critChance = min(0.50, criticalInsight / 500). Crit multiplier = 2.0. Applied to damage before delivery.

**TASK-117** Implement enemy death: `checkCombatEnd(combat): 'player_win'|'player_loss'|'ongoing'`. playerHp ≤ 0 or playerSoulHp ≤ 0 → player_loss. enemyHp ≤ 0 and enemySoulHp ≤ 0 → player_win (enemy must be dead on both bars).

**TASK-118** Implement combat end: player_win → rollTreasureDrops, restore stabilizationUsed=false, add combat to globalTrackers.combatCount. player_loss → apply severe node damage, body energy reduced by 20%.

**TASK-119** Implement enemy node targeting: if enemy.preferredNodeTarget is set, each attack has 30% chance to damage that specific T2 node instead of applying HP damage. Direct node attacks bypass HP thresholds and immediately crack the node.

---

# PHASE 14 — HP, SOUL, AND NODE DAMAGE
*Goal: taking damage has meaningful cultivation consequences*

**TASK-120** Add hp and soulHp to GameState (outside combat, tracking body integrity). HP max = 100 + physicalDurability. SoulHp max = 50 + soulDurability. Both regenerate slowly out of combat at 0.1/tick.

**TASK-121** Implement node damage rolls in `src/core/combat/nodeDamage.ts`. At 30% HP threshold: 50% chance to crack one random ACTIVE T2 node. At 10% HP threshold: check stabilization — if Bindu reserve available and !stabilizationUsed, spend reserve and prevent shatter; else 70% chance to shatter one random ACTIVE T2 node.

**TASK-122** Implement cracked node state: cap resonance calculation at 0.50 regardless of actual T1 states. Halve all attribute contributions. Visual indicator in UI. Track `nodeDamageState: {cracked: boolean, shattered: boolean, repairProgress: number}` on T2Node.

**TASK-123** Implement shattered node state: node treated as LOCKED for attribute and circulation purposes (cannot be included in routes, contributes zero attributes). All T1 nodes within set to UNSEALED state (energy preserved but not active).

**TASK-124** Implement passive node repair in simulation tick: for each damaged node, repairProgress += meridianRepairRate × (jingInNode/node.capacity) × 0.001 × Δt. Full repair (progress=1.0): clear damage state, restore normal resonance cap.

**TASK-125** Implement active node repair: player can direct Jing explicitly to a damaged node via the UI. Active repair = 10× passive rate. Drains Jing from body at 0.1 Jing/tick while active. Implemented as a player toggle in the cluster view.

**TASK-126** Implement Bindu D-node stabilization reserve: `getBinduReserve(state): number` — energy at D node (id=11) in Bindu cluster. `spendBinduReserve(state, amount)` — depletes D node, prevents shatter. D refills only through normal cultivation routing energy to CR[5]→D via player-set weights.

---

# PHASE 15 — TREASURE AND INVENTORY SYSTEM
*Goal: items can be found, held, and applied to the cultivation body*

**TASK-127** Define all treasure types and their effect structures in `src/core/treasures/types.ts`: CondensedEssencePill (fill X energy of type to node), RefiningStone (+1 T1 quality), MeridianSalve (add TF to meridian), JingDeposit (add jingDeposit to meridian), DaoFragment (add insights), RecoveryElixir (repair node + restore Jing), FormationArray (placed item with passive generation), CultivationManual (unlock technique or reduce threshold).

**TASK-128** Implement `applyTreasure(treasure, targetId, state): GameState`. Route each TreasureType to its effect function. Validate target type matches treasure requirement. Decrement treasure quantity on use.

**TASK-129** Implement combat treasure drops: `rollDrops(enemy, state): Treasure[]`. dropChance = 0.15 + criticalInsight/200. If roll hits, select from enemy.dropTable weighted by tier. Higher tier enemies drop rarer treasure types.

**TASK-130** Implement Formation Array as a placeable passive generator: when placed at player's rest location, adds a flat energy generation bonus per tick (type depends on array type) to the nearest T2 node's source T1 node. Stack limit: 3 arrays. Formation Arrays are lost if moved (one-time placement).

**TASK-131** Implement Cultivation Manual effects: manuals can (a) unlock a new circulation technique variant, (b) reduce a specific T2 node's seal threshold by 20%, or (c) open a latent I/O slot on a specific node (adds a new meridian connection point). Store unlocked manuals in GameState.unlockedTechniques[].

---

# PHASE 16 — ALCHEMY SYSTEM
*Goal: player crafts pills whose quality scales with cultivation state*

**TASK-132** Create `src/core/alchemy/types.ts`: Ingredient (id, name, energyContent: EnergyPool, rarity), Recipe (id, name, ingredients: IngredientId[], baseQuality, resultType: TreasureType), AlchemySession (recipe, ingredients placed, state: MIXING|REFINING|COMPLETE, quality: number).

**TASK-133** Define 12 base recipes covering all Treasure types. Include 3 tiers per recipe (basic, refined, transcendent) requiring increasingly rare ingredients. Store in `src/data/alchemy/recipes.ts`.

**TASK-134** Implement pill quality calculation: `computePillQuality(recipe, state): number`. quality = baseQuality × (manipuraResonance × 0.4 + avgBodyRank/9 × 0.3 + jingGenerationRate/maxJingRate × 0.3). Quality directly scales the pill's effect magnitude (e.g., higher quality Condensed Essence Pill fills more energy).

**TASK-135** Implement alchemy session lifecycle: MIXING phase (ingredients combined, no interaction), REFINING phase (player can input energy to raise quality — costs YangQi per quality point added), COMPLETE (pill produced, quality finalized). Allow session to be abandoned (ingredients lost).

**TASK-136** Implement ingredient gathering as a post-combat bonus: certain enemies drop raw ingredients in addition to treasures. Ingredient drop table defined per enemy archetype. Store ingredients in a separate inventory section from finished treasures.

---

# PHASE 17 — SECT AND ELDER SYSTEM
*Goal: NPCs provide teachable techniques and formation arrays*

**TASK-137** Create `src/core/sect/types.ts`: Elder (id, name, daoType, realm: 1–9, favorLevel: 0–100, teachableManuals: CultivationManualId[], requirement: UnlockCondition[]), Sect (id, name, homeElder, availableFormationArrays: FormationArray[], memberBenefits: AttributeBundle).

**TASK-138** Define 3 Sects in `src/data/sects/sects.ts`: The Iron Foundation Sect (Earth/Life focused, gives Jing-specialization manuals), The Heaven-Striking Order (Fire/Thunder focused, gives YangQi manuals), The Still Water School (Water/Void focused, gives Shen/Qi manuals). Each with 1 Elder, 3 teachable manuals, 2 formation arrays.

**TASK-139** Implement Elder interaction: `canLearnFromElder(elder, state): boolean` — player's relevant node cluster (per Dao) at required rank. `learnFromElder(elder, manualId, state): GameState` — adds manual to inventory, increases favorLevel with that Elder.

**TASK-140** Implement Sect membership: player can join one Sect (irreversible). On join: gain access to Sect formation arrays at rest location, gain passive attribute bonus from memberBenefits scaled by favorLevel. Favor increases by performing combat in Sect-aligned areas.

---

# PHASE 18 — BODY TEMPERING
*Goal: parallel physical training track improves HP and Jing*

**TASK-141** Add `bodyTemperingState` to GameState: temperingLevel (1–9), temperingXP, currentTrainingAction (string|null), trainingCooldown.

**TASK-142** Define 6 training actions in `src/data/bodyTempering/actions.ts`: Breath Training (passive, always on, +XP/tick), Sprint Training (active, +XP burst, generates YangQi), Stone Lifting (active, +XP, generates Jing), Cold Water Immersion (active, large XP, costs HP temporarily), Meditation (active, +Shen, slow XP), Combat Training (active, XP scaled by combat difficulty).

**TASK-143** Implement tempering XP accumulation from passive training and active selection. Level-up: temperingLevel increases, granting: +10 to physicalDurability base, +0.01 to Jing generation rate, +5 HP. Each level requires 10× XP of previous.

**TASK-144** Apply tempering level to combat: player HP max = 100 + physicalDurability + temperingLevel×10. Physical damage reduction = temperingLevel × 2%. Jing generation rate += temperingLevel × 0.01 per active Jing-source T1 node.

---

# PHASE 19 — REALM TRIBULATION EVENTS
*Goal: rank breakthroughs require surviving a forced challenge*

**TASK-145** Create `TribulationEvent` type: requiredRank, enemyWave (EnemyDef[]), timeLimit (ticks), rewardOnSuccess (AttributeBonus), penaltyOnFailure (NodeDamageCount, breakthroughDelayTicks).

**TASK-146** Implement tribulation trigger: when player meets all rank breakthrough conditions (resources + level 9), instead of immediately advancing, trigger a TribulationEvent. Cultivation pauses; tribulation combat must be completed.

**TASK-147** Implement tribulation wave combat: sequential enemy encounters with no rest between them. Player's cultivations attributes apply but combat energy pool does not regenerate between waves. Failure = breakthrough delayed 1 hour in-game time, one random node cracked.

**TASK-148** Implement tribulation success rewards: permanent attribute bonus (e.g., +5% to all cultivation rates), plus the rank advancement proceeds normally. Log tribulation completion in insight library.

---

# PHASE 20 — MERIDIAN SCARS
*Goal: overloading a meridian permanently damages its purity*

**TASK-149** Add scar detection to meridian flow: if actual flow on a meridian exceeds W × 2.5 in a single tick (via an extreme active pump), record a scar event. isScarred = true, scarPenalty += 0.05 (up to 0.25 max).

**TASK-150** Apply scar to purity calculation: `computeMeridianPurity` subtracts scarPenalty before returning. Scar is permanent until healed.

**TASK-151** Implement scar healing: requires either (a) spending 50,000 Shen directly into the meridian via a dedicated action, or (b) applying a rare "Meridian Restoration" treasure. Both reduce scarPenalty by 0.05 per application.

**TASK-152** Display scar visually: scarred meridians render with a reddish tint and broken-line texture in the body map. Tooltip shows scar severity and healing cost.

---

# PHASE 21 — CELESTIAL BODY MAP
*Goal: in-game calendar affects cultivation rates*

**TASK-153** Create `src/core/celestial/types.ts`: CelestialBody (id, linkedT2NodeId, currentSign: string), CelestialCalendar (dayOfYear: 0–364, season: 'Spring'|'Summer'|'Autumn'|'Winter', activeConjunctions: string[]).

**TASK-154** Define 24 celestial bodies (one per T2 node) with their seasonal cycles. Each T2 node's linked celestial body enters a "peak" phase for ~45 days per year. During peak: linked T2 node's generation rate ×1.5, resonance quality factor ×1.1.

**TASK-155** Implement day/season progression: 1 in-game day = 720 real seconds (12 minutes). 4 seasons × 91 days = 364-day year. Add `advanceCalendar(state): GameState` called from tick (once per in-game day).

**TASK-156** Implement conjunction events: twice per year, 2–3 celestial bodies align. During conjunction (3 in-game days): all linked T2 nodes' Shen generation ×3. Alert player via HUD.

**TASK-157** Implement seasonal baseline modifiers: Spring → Qi generation +20%, Summer → YangQi conversion +30%, Autumn → Jing generation +25%, Winter → Shen generation +40%. Apply as multipliers in simulation tick step 1.

---

# PHASE 22 — DUAL CULTIVATION
*Goal: a companion character can synchronize circulation with the player*

**TASK-158** Create `CompanionState` in `src/core/companion/types.ts`: active, name, cultivation (GameState subset — own T2 nodes and meridians), harmonyLevel (0–100), sharedRouteActive, crossBodyMeridians (Meridian[]).

**TASK-159** Implement companion cultivation simulation: companion runs a simplified version of the main simulation tick (only T2 pressure and meridian training, no T1 weight management — auto-optimized). Player does not control companion's internal routing.

**TASK-160** Implement shared circulation routes: if both player and companion have a route defined through the same T2 node sequence, and harmonyLevel ≥ 50, the route gains HarmonyBonus: loopEfficiency +0.15, TypePurityFactor ×1.3.

**TASK-161** Implement cross-body meridian opening (late game): at harmonyLevel ≥ 90 and both players at Rank 6+, allow opening a special meridian between player's Anahata and companion's Anahata. This channel transfers Shen bidirectionally and counts toward both players' FlowBonus.

---

# PHASE 23 — INSIGHT LIBRARY (CODEX)
*Goal: collectible record of discoveries grants permanent small bonuses*

**TASK-162** Create `InsightLibrary` structure in GameState: entries (Map<string,CodexEntry>), totalEntries, permanentBonuses (AttributeBundle).

**TASK-163** Define codex entry triggers: T2 node first activation (24 entries), first rank breakthrough per rank (9 entries), each Dao node first unlock (up to 56 entries), each enemy type first defeated (5 entries), each treasure type first acquired (8 entries), each meridian reaching TRANSCENDENT (24 entries), tribulation success (8 entries). Total: ~134 possible entries.

**TASK-164** Implement codex entry firing: on each trigger event, check if entry exists; if not, create entry with description text, add permanent bonus. Each entry adds a flat +0.1% to a relevant attribute (e.g., first Muladhara activation → +0.1% Jing generation).

**TASK-165** Implement codex UI: scrollable list of entries organized by category. Locked entries show silhouette and hint. Completed entries show discovery date and bonus. Total accumulated bonus visible at top.

---

# PHASE 24 — T1 CONNECTION UNLOCKING
*Goal: players can add new edges within clusters using rare treasures*

**TASK-166** Add `unlockedEdges: T1EdgeDef[]` to T2Node. Max 2 additional edges per cluster. New edges must connect nodes that are geometrically adjacent in the cluster's visual layout (pre-defined list of valid extra connections per topology, stored in topology def as `potentialExtraEdges`).

**TASK-167** Implement `unlockT1Connection(t2NodeId, fromId, toId, state): GameState`. Requires Structure Catalyst treasure. Validates connection is in potentialExtraEdges and count < 2. Adds edge to t1Edges map with weight 0.

**TASK-168** Add `potentialExtraEdges: T1EdgeDef[]` to all 24 topology definitions. 2–4 valid extra connections per topology that would create useful shortcuts without violating the cluster's spatial logic.

---

# PHASE 25 — MERIDIAN RESONANCE HARMONICS
*Goal: balanced meridian pairs grant bonus Shen pulses*

**TASK-169** Implement harmonic detection: `checkMeridianHarmonics(state): HarmonicPair[]`. For each T2 node, check all pairs of connected meridians; if both Quality values are within 0.5 of each other and both are REFINED+, they form a harmonic pair.

**TASK-170** Implement harmonic bonus: active harmonic pairs gain +15% width temporarily (not added to TF training, just throughput) and generate +0.002 Shen/tick at the shared endpoint node. Pulse resets if quality diverges beyond 0.5.

**TASK-171** Display harmonic pairs in body map: meridians in harmonic resonance glow with a matching color tint and a subtle synchronized pulse animation.

---

# PHASE 26 — PHANTOM NODES (DAO MANIFESTATION)
*Goal: at high rank, Dao nodes can be "planted" in world locations*

**TASK-172** Add `phantomNodes: PhantomNode[]` to GameState. PhantomNode: id, daoType, bodyOverlayPosition (world location reference), t2NodeRef (full T2Node for cultivation), isPlanted, locationId, generationBonus (EnergyPool per tick).

**TASK-173** Implement phantom node unlock: requires player at Rank 7+ and Dao comprehension ≥ 6. First phantom node unlocks as a Dao node rank-advance reward. Up to 3 phantom nodes can be unlocked total.

**TASK-174** Implement phantom node planting: player selects a world location (combat zone or exploration area). Planted phantom node generates energy remotely based on location's elemental resonance. Energy flows into the player's Anahata or Sahasrara (nearest chakra) each tick via a special phantom meridian.

**TASK-175** Implement phantom node retrieval: player can un-plant a phantom node (takes 1 in-game hour). While planted, the node cannot be leveled but continues generating.

---

# PHASE 27 — UI: CLUSTER VIEW
*Goal: player can see and interact with any T1 cluster*


**TASK-177** Implement per-T1-node color blending: fill color blends energy types proportionally. Qi = #6ab4ff, Jing = #c8a830, YangQi = #ff6420, Shen = #c890ff. Use weighted CSS gradient or canvas fillStyle interpolation.

**TASK-181** Render quality ring on each T1 node: thin arc (0°–360°) showing refinementPoints/nextThreshold as progress. Full ring at max quality becomes a star border.

**TASK-184** Implement active node repair toggle: when a T2 node has damaged T1 nodes, show a "Direct Jing" toggle button. When active, renders a Jing-colored pulsing overlay on damaged T1 nodes and activates active repair logic.

---

# PHASE 28 — UI: BODY MAP
*Goal: player sees the full 24-node body and can navigate it*

**TASK-187** Render unestablished meridian connections as dotted grey lines (potential connections not yet opened).

**TASK-189** Implement route drawing mode: when player activates "Draw Route" mode, clicking T2 nodes adds them to sequence. Show green dotted overlay path. Show real-time metrics (efficiency, bottleneck, heat). Close-loop click shows Confirm button.

**TASK-190** Implement meridian click handler: clicking a meridian opens a MeridianDetailPanel showing all Meridian fields from the data model plus FlowBonus currently applied, affinity badge, reverse meridian button.

**TASK-191** Implement Galaxy View toggle: switches body map rendering to star-map mode. Nodes = glowing stars (brightness = resonance, size = rank). Meridians = light-beams (thickness = W, opacity = Pur). All interactions identical. Dark background.

---

# PHASE 29 — UI: HUD AND PANELS
*Goal: all critical game state visible at a glance*

**TASK-193** Create body heat indicator: thermometer or arc gauge. Color zones: green (<40%), yellow (40–65%), orange (65–85%), red (>85%). Pulsing animation at critical. Shows "CRITICAL — Node Damage Risk" text at >85%.

**TASK-194** Create cultivation attributes panel: collapsible. Shows all 10 cultivation attributes with current values. Clicking any attribute shows tooltip with per-node breakdown (node name, contribution, resonance, rank, level).

**TASK-195** Create combat attributes panel: same structure as cultivation panel but for combat attributes. Initially locked behind first combat encounter.

**TASK-196** Create Refining Pulse button: shows current Qi→YangQi conversion rate, heat cost, efficiency %. Toggle on/off. Grayed out if Manipura not ACTIVE or heat > 80%.

**TASK-197** Create active circulation route display: shows current route as a sequence of node badges. Loop efficiency, bottleneck indicator, heat/tick. Stop button.

**TASK-198** Create body tempering panel: shows temperingLevel, XP progress bar, active training action selector, derived HP and Jing bonuses.

**TASK-199** Create Dao panel: shows selected Dao (or selection prompt), Dao nodes with states, daoInsights counter, comprehension level, unlocked skills list.

**TASK-200** Create inventory panel: grid of treasure slots. Clicking treasure selects it; shows description and effect preview; clicking a valid target on the body map applies it. Shows ingredient inventory for alchemy separately.

---

# PHASE 30 — UI: COMBAT
*Goal: player can configure, watch, and understand combat*

**TASK-201** Create pre-combat configuration screen: shows rotation builder (drag skills into order), energy priority sliders (how much of each type to allocate from body to combat pool), enemy info panel showing tier and known attack patterns.

**TASK-202** Create combat view: side-by-side HP and SoulHp bars for player and enemy. Combat log (scrolling text of events). Current skill being executed with cooldown visualization. Combat energy pool bars.

**TASK-203** Implement node damage flash effect: when a node is cracked during combat, its body map icon flashes red and a notification appears. Cracked state persists visibly after combat.

**TASK-204** Create post-combat summary screen: damage dealt/received, skills used, energy spent, nodes damaged, treasures dropped, insights gained.

---

# PHASE 31 — UI: ALCHEMY
*Goal: alchemy has its own dedicated crafting interface*

**TASK-205** Create alchemy workbench panel: ingredient slots (4 max), recipe browser (shows all recipes, locked vs available), quality preview (shows expected pill quality based on current cultivation state), Refine button (costs YangQi to boost quality during REFINING phase).

**TASK-206** Implement recipe browser: filter by treasure type, tier, available ingredients. Selecting a recipe highlights required ingredients in inventory. Show craft count (how many you can make with current stock).

---

# PHASE 32 — UI: TUTORIAL AND ONBOARDING
*Goal: first-time player is guided through the opening hour*

**TASK-207** Create tutorial state machine with 20 steps corresponding to GDD Sections 11 (Tutorial Chapters 1–8 key moments). Each step has: trigger condition, highlighted UI element ID, message text, advance condition.

**TASK-208** Create tutorial overlay renderer: darkened background with cutout highlight on the targeted element. Floating tooltip with message. "Next" button when advance condition true. Skip option after step 5.

**TASK-209** Implement step-specific tutorial content for Chapter 1 (T1 node activation), Chapter 2 (first meridian and I/O), Chapter 3 (first loop), Chapter 4 (Yang Qi and heat), Chapter 5 (Shen and Ajna lobe balance), Chapter 6 (first combat), Chapter 7 (Dao selection), Chapter 8 (Great Circulation).

**TASK-210** Implement tutorial suppression for returning players: if GameState.tick > 1000 (loaded from save), skip tutorial. Add "Reset Tutorial" option in settings.

---

# PHASE 33 — CELESTIAL AND SECT UI

**TASK-211** Create celestial calendar widget: small clock-face showing current day/season, active celestial body conjunctions as glowing indicators, next peak event countdown for each T2 node.

**TASK-212** Create sect panel: shows available sects, join status, favor level with each Elder, teachable manuals (locked/available), formation arrays inventory, member benefits.

---

# PHASE 34 — SAVE, LOAD, AND PERSISTENCE
*Goal: game state survives browser sessions*

**TASK-213** Implement `serializeGameState(state): string` in `src/state/persistence.ts`. Full JSON serialization of GameState. Include schema version number.

**TASK-214** Implement `deserializeGameState(json): GameState`. Parse and validate. Rehydrate class instances from plain objects. Handle missing fields from older saves with defaults (schema migration).

**TASK-215** Implement auto-save: every 60 real seconds, serialize and write to localStorage key `cultivationSave_v1`. Write backup to `cultivationSave_backup` before overwriting.

**TASK-216** Implement manual save/load UI in settings panel. Export save as downloadable JSON file. Import save from file upload.

**TASK-217** Implement save file migration: `migrateState(rawObj, fromVersion): GameState`. Handle version bumps gracefully — missing fields default, removed fields ignored.

---

# PHASE 35 — INTEGRATION TESTS
*Goal: all systems work together as specified*

**TASK-218** Integration test: Muladhara fills → Svadhisthana unlocks → first meridian trains from NASCENT to DEVELOPED within expected tick range (5,000–10,000 ticks).

**TASK-219** Integration test: 3-node loop (ROOT→SACRAL→L_HIP→ROOT) trains all three meridians simultaneously. After 500 ticks active circulation vs 500 ticks passive, active shows ≥3× TF gain.

**TASK-220** Integration test: Refining Pulse converts Qi to YangQi at correct ratio. Heat accumulates. Disabling Pulse allows heat to decay.

**TASK-221** Integration test: Yang Qi circulation causes meridian width training faster than Qi but purity lower. Jing circulation causes purity to rise via jingDeposit. Shen causes purity to rise fastest per unit.

**TASK-222** Integration test: opening a reverse meridian between ROOT and SACRAL enables 2-node loop. 2-node loop trains both meridians with 0.60× efficiency vs 3-node at 0.66×.

**TASK-223** Integration test: Bindu D-node stabilization prevents shatter on first trigger; second trigger (stabilizationUsed=true) allows shatter.

**TASK-224** Integration test: cracked node halves its attribute contributions. Shattered node zeroes all attribute contributions. Passive repair over 10,000 ticks restores cracked node.

**TASK-225** Integration test: Dao selection at Rank 2 fires correctly. Selecting Fire Dao creates Fire Dao node, adds first Fire skill to rotation options.

**TASK-226** Integration test: body tempering level 5 adds correct HP bonus and Jing rate bonus.

**TASK-227** Integration test: celestial calendar advances 1 day per 720 seconds. Peak phase doubles linked T2 node generation rate.

---

# PHASE 36 — BALANCE PASSES
*Goal: numerical values produce satisfying progression pacing*

**TASK-228** Early game balance (Hours 0–3): Svadhisthana should unlock within 1,500–3,000 ticks. First meridian should reach DEVELOPED within 5,000–10,000 ticks. Heat should not appear before Manipura. Adjust T1_BASE_SOURCE_RATE, seal thresholds, ENERGY_MODIFIERS if needed.

**TASK-229** Mid game balance (Hours 3–25): Full body map (all 24 nodes) should be reachable within 25 hours. First rank breakthrough within 20 hours. Great Circulation within 30 hours. Adjust unlock conditions and breakthrough requirements if needed.

**TASK-230** Late game balance (Hours 25–100): Rank 9 should require serious dedication (80–100 hours). Adjust rank threshold energy costs and multi-node level requirements at high ranks.

**TASK-231** Combat balance: Tier 1 enemies should be defeatable with Rank 1 body at full resonance. Tier 5 requires Rank 4+. Tier 9 requires full Rank 9 body and Dao comprehension 8+. Adjust enemy stat scaling.

**TASK-232** Meridian training curve balance: NASCENT→DEVELOPED should feel achievable in a play session (1–2 hours active). DEVELOPED→REFINED requires sustained effort (5–10 hours on that specific meridian). REFINED→TRANSCENDENT is a late-game achievement (30+ hours on one meridian). Adjust TF thresholds and width/purity scale constants.

**TASK-233** Alchemy balance: common pill ingredients should drop every 3–5 combat encounters. Rare ingredients every 20–30 encounters. Pill quality should meaningfully exceed what a player could achieve without alchemy at equivalent cultivation level.

**TASK-234** Celestial calendar balance: peak phases should occur often enough to feel rewarding but rare enough to feel special. Conjunctions should be noteworthy events. Verify seasonal modifier stacks don't create energy overflow at high node counts.

---

# PHASE 37 — POLISH AND EFFECTS
*Goal: the game feels alive and satisfying*

**TASK-235** Implement breakthrough animation: 3-second full-body light pulse when any rank breakthrough occurs. All T2 nodes flash to max brightness, all meridians pulse white, particle explosion from the advanced node outward.

**TASK-236** Implement node damage visual: cracked T2 node icon shows a crack overlay. Shattered node is dark with spider-web fracture pattern. Repair progress shown as crack "healing" (filling in) as progress increases.

**TASK-237** Implement energy flow ambient animation: even during passive tick (no active route), very faint particle drift along established meridians showing passive trickle. Resting body should feel alive, not static.

**TASK-238** Implement Shen visual distinction: Shen flow particles are larger, slower, and leave a brief trail compared to Qi particles. Nodes with significant Shen content glow with a soft violet corona.

**TASK-239** Implement Manipura furnace visual: when Refining Pulse is active, the furnace T1 node (C, id=11) in Manipura's cluster pulses with orange-white light. Heat rings radiate outward. Stopping Pulse shows the furnace cooling.

**TASK-240** Implement Bindu crescent animation: Bindu's cluster renders as a slow, cool silver crescent. D-node pulses once every 5 seconds when above 50% fill. When stabilization is used, D-node flashes and dims — a visual indication of reserve spent.

**TASK-241** Implement Great Circulation visual: when the 24-node route is active, a continuous golden wave travels around the entire body silhouette. The wave speed reflects circulation speed attribute.

**TASK-242** Implement Ajna lobe balance visual indicator: in Ajna's cluster view, Yin lobe nodes glow cooler (blue-violet) and Yang lobe nodes glow warmer (gold-orange). An imbalance indicator (a tilted scale icon) appears with severity when lobes diverge >20%.

**TASK-243** Implement sound design hooks: fire SoundEvent on T1 node activation, meridian state change, breakthrough, node damage, first Shen generation, Dao selection. Sound implementation left to audio system; events are the contract.

**TASK-244** Implement performance optimization: dirty flag system for attribute recalc (only recompute if a node changed state or rank/level). Throttle meridian training updates to every 5 ticks. Profile and ensure tick runs under 5ms at full 24-node body with 24 meridians active.

**TASK-245** Implement settings panel: tick rate multiplier (1×, 2×, 5×, 10× fast-forward), sound on/off, tutorial reset, save management, display options (Galaxy View as default, particle density), color accessibility mode (recolor energy types for colorblind).

---

## TASK COUNT BY PHASE

| Phase | Tasks | Focus |
|-------|-------|-------|
| 0 — Foundation | 6 | Project, constants, math |
| 1 — T1 Data | 6 | T1 node model |
| 2 — T1 Flow | 6 | Weight-driven internal flow |
| 3 — T2 Data | 8 | T2 node model, conditions |
| 4 — Topologies | 19 | All 24 cluster shapes |
| 5 — Meridians | 14 | Flow, training, purity math |
| 6 — Body Map Data | 5 | Adjacency, node defs, factory |
| 7 — Simulation Tick | 13 | Master tick, all steps |
| 8 — Energy Mechanics | 6 | Jing, YangQi, Shen specials |
| 9 — Circulation | 6 | Routes, Great Circulation |
| 10 — Attributes | 6 | Computation, scaling |
| 11 — Progression | 5 | Unlock, level, rank, realm cap |
| 12 — Dao System | 9 | All 8 Daos, skills, insights |
| 13 — Combat | 10 | Enemies, rotation, skills, death |
| 14 — HP & Node Damage | 7 | Crack, shatter, repair |
| 15 — Treasures | 5 | Types, drops, formation arrays |
| 16 — Alchemy | 5 | Recipes, quality, sessions |
| 17 — Sect & Elder | 4 | NPCs, manuals, membership |
| 18 — Body Tempering | 4 | Parallel progression |
| 19 — Tribulations | 4 | Breakthrough events |
| 20 — Meridian Scars | 4 | Overload damage |
| 21 — Celestial Map | 5 | Calendar, seasons, conjunctions |
| 22 — Dual Cultivation | 4 | Companion system |
| 23 — Insight Library | 4 | Codex of Dao |
| 24 — T1 Connection Unlock | 3 | Extra cluster edges |
| 25 — Meridian Harmonics | 3 | Quality-balanced pairs |
| 26 — Phantom Nodes | 4 | Planted Dao nodes |
| 27 — UI: Cluster View | 9 | T1 cluster renderer |
| 28 — UI: Body Map | 7 | T2 map, meridians, routes |
| 29 — UI: HUD & Panels | 9 | Energy, attributes, Dao |
| 30 — UI: Combat | 4 | Configuration, view, summary |
| 31 — UI: Alchemy | 2 | Workbench, recipe browser |
| 32 — UI: Tutorial | 4 | Steps, overlay, content |
| 33 — Celestial & Sect UI | 2 | Calendar widget, sect panel |
| 34 — Save/Load | 5 | Serialization, auto-save, migration |
| 35 — Integration Tests | 10 | System interaction tests |
| 36 — Balance Passes | 7 | Numerical tuning |
| 37 — Polish | 11 | Animations, sound hooks, perf |
| **TOTAL** | **245** | |

---

## CRITICAL PATH (minimum viable game, in order)

Tasks that must be done before a playable build exists:
**TASK-001 through TASK-077** (Phases 0–7: foundation through simulation tick)

First playable milestone: Muladhara cluster visible, energy generating, T1 nodes lighting up in topology order.

Second playable milestone (add TASK-078–089, 090–100): first meridian, first loop, attribute panel.

Full feature-complete (all 245 tasks): complete game as specified in GDD.