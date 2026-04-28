# CULTIVATION SIMULATOR — GAME DESIGN DOCUMENT
### Version 2.0 | Revised

---

## TABLE OF CONTENTS

1. [Vision & Pillars](#1-vision--pillars)
2. [Core Architecture: The Node Hierarchy](#2-core-architecture-the-node-hierarchy)
   - 2.1 T1 Nodes — Internal Flow, I/O Ports, and Topology
   - 2.2 T2 Nodes — Pressure, Aggregate Energy, and Port Architecture
   - 2.3 T1 Topology Atlas — All 24 T2 Cluster Designs
3. [T2 Body Topology Map](#3-t2-body-topology-map)
4. [The Meridian System](#4-the-meridian-system)
   - 4.1 Meridian Directionality and Flow Paths
   - 4.2 The Two-Node Loop Question
   - 4.3 Meridian Data Model and Math
5. [The Energy System](#5-the-energy-system)
   - 5.1 The Four Energy Types
   - 5.2 Energy Flow Mathematics
   - 5.3 Energy Type Modifier Matrix
6. [Progression Systems](#6-progression-systems)
7. [The Circulation System](#7-the-circulation-system)
8. [The Attribute System](#8-the-attribute-system)
9. [Nebulous Systems (Design Intent)](#9-nebulous-systems-design-intent)
10. [Implementation Order](#10-implementation-order)
11. [Player Introduction Order (Onboarding Arc)](#11-player-introduction-order-onboarding-arc)
12. [Proposed Additional Systems](#12-proposed-additional-systems)

---

# 1. VISION & PILLARS

*(Unchanged from v1.0)*

## Concept Statement
A cultivation simulator in which the player embodies a practitioner building inner power from the most fundamental unit — a single T1 node — all the way up through a living constellation of interconnected T2 nodes, meridian channels, and Dao-infused skills. Progression feels like sculpting a living organism from the inside.

## Design Pillars

**1. Visible Inner Architecture**
The player's body is literally a map. Every node, meridian, and energy stream is visible and interactive. Progress should feel like lighting up a dark sky one star at a time.

**2. Systems That Breathe Together**
No system is independent. Meridian quality affects energy flow; energy flow affects node unlocking; unlocked nodes provide attributes that accelerate meridian training. Every upgrade ripples outward.

**3. Depth Revealed Gradually**
The first ten minutes show the player one T1 node and one energy type. The hundredth hour reveals Dao-forged phantom nodes and multi-energy combat rotations. The same core loop never stops being relevant.

**4. Meaningful Choices, Not Optimization Traps**
Dao selection, energy specialization, and attribute routing should produce genuinely different characters, not a "solved build." Asymmetric trade-offs at every layer.

---

# 2. CORE ARCHITECTURE: THE NODE HIERARCHY

## 2.1 T1 Nodes — Internal Flow, I/O Ports, and Topology

### What They Are
T1 nodes are the smallest meaningful unit of the cultivation body. Each one is a discrete energy pocket. They are arranged inside a T2 cluster in a fixed topology — a small graph whose shape is unique to each T2 node type, inspired by chakra yantras and classical Chinese characters. The topology is not decorative: it determines how energy propagates internally, which nodes bottleneck flow, and where the meridian connections attach.

### T1 Node Data Model

```
T1Node {
    id                  : integer (unique within parent T2 cluster)
    type                : INTERNAL | IO_IN | IO_OUT | IO_BIDIR
    state               : LOCKED | UNSEALED | ACTIVE
    energy              : float  (current stored energy, any mix of types)
    capacity            : float  (C_base × QualityMultiplier[quality])
    quality             : integer 1–10
    connections         : list[T1NodeId]   // neighbors in internal graph
    meridian_slot       : MeridianId | null  // set if this is an I/O node
}
```

### T1 Node Types in Detail

| Type | Role | Notes |
|------|------|-------|
| `INTERNAL` | Stores energy, participates in internal diffusion | Never touches a meridian directly |
| `IO_IN` | Receives energy arriving from a connected meridian | First stop for incoming energy; diffuses inward |
| `IO_OUT` | Drains energy from local pool; sends it to a meridian | Must have energy diffuse to it first to export |
| `IO_BIDIR` | Does both — used on bidirectional meridians | Flow direction set per tick based on meridian state |

Every T2 node has exactly **one I/O T1 node per meridian connection** it supports. A Heart node (4 meridian connections) has 4 I/O T1 nodes. A Hand node (1 meridian connection, terminal) has 1 I/O T1 node.

### T1 Internal Diffusion — The Math

Energy diffuses between neighboring T1 nodes inside a cluster every tick. This is pressure-driven:

```
T1_flow(a → b, t) = α × [ E(a)/C(a) − E(b)/C(b) ] × min(Q(a), Q(b)) × Δt
```

Where:
- `α` = internal diffusion constant = **5.0 units/tick** (tunable per energy type — see Section 5.3)
- `E(x)` = current energy at node x (summed across all energy types)
- `C(x)` = current capacity of node x
- `Q(x)` = quality of node x (1–10); the lower-quality neighbor is always the bottleneck
- `Δt` = timestep = **0.1 seconds** (10 ticks per second recommended)

If `T1_flow(a→b)` is negative, energy flows `b → a` instead. Diffusion is not capped per se — but if `E(a)` would go below 0, the actual flow is clamped to `E(a)`.

**Key implication:** Energy arriving at an `IO_IN` node must **diffuse through the internal graph** to reach the `IO_OUT` node on the other side of the cluster. A cluster with unactivated LOCKED T1 nodes in the path creates dead zones. The player must unlock the correct T1 nodes to open efficient internal pathways.

### I/O Port Interface Rate

Even if a meridian can carry 20 units/tick, the I/O T1 node may not be able to process that volume:

```
EffectiveInputRate = min(MeridianFlow, C(io_in) × Q(io_in) × β)
EffectiveOutputRate = min(MeridianPullRate, E(io_out) × Q(io_out) × β)
```

Where `β` = port interface constant = **0.15 per quality point** (so a quality 10 I/O node can process 1.5× its capacity per tick — allowing burst throughput).

**This is why I/O T1 nodes should be prioritized for quality improvement.** A great meridian strangled by a low-quality I/O node performs like a mediocre one.

### T1 Quality

Quality gates capacity and interface speed. It improves through:
- Lifetime energy *passing through* the node (not just stored): every 1,000 units moved through a T1 node adds refinement points; 100 refinement points = +1 quality.
- T2 rank advancement: all T1 nodes in a cluster gain +1 quality (up to rank cap).
- Refining Stone treasures (instant).

| Quality | Capacity Multiplier | Max Refinement Points to Next |
|---------|--------------------|-----------------------------|
| 1 | 1.00× | 100 |
| 2 | 1.25× | 200 |
| 3 | 1.55× | 400 |
| 4 | 1.90× | 800 |
| 5 | 2.35× | 1,600 |
| 6 | 2.90× | 3,200 |
| 7 | 3.60× | 6,400 |
| 8 | 4.45× | 12,800 |
| 9 | 5.50× | 25,600 |
| 10 | 7.00× | — (max) |

---

## 2.2 T2 Nodes — Pressure, Aggregate Energy, and Port Architecture

### T2 Aggregate Energy

A T2 node does not have its own energy pool separate from its T1 nodes. Its energy is purely the sum:

```
E_T2 = Σ E(t1_i)    for all T1 nodes i in the cluster
C_T2 = Σ C(t1_i)    = Σ [ C_base × QualityMultiplier(Q_i) ]
```

### Two Flavors of T2 Pressure

For display and progression purposes, we track **aggregate T2 pressure**:

```
P_T2 = E_T2 / C_T2    [range 0.0 – 1.0]
```

For **meridian flow calculations**, however, the relevant pressure is the **local I/O node pressure**, not the cluster average:

```
P_local(io_node) = E(io_node) / C(io_node)
```

This distinction matters. A T2 node can be 85% full overall yet have an empty Output I/O node if energy hasn't diffused there — and therefore cannot export to its meridian. This is not a bug; it's the core of the "internal topology matters" design.

**Resonance** is the fraction of ACTIVE T1 nodes:

```
Resonance = (count of T1 nodes in ACTIVE state) / (total T1 count) × AverageQualityFactor

AverageQualityFactor = (1/n) × Σ (Q_i / 5)    [normalized so quality-5 = 1.0]
```

Resonance multiplies all attributes the T2 node provides. A node at 40% resonance provides 40% of its listed attributes.

### T2 Node Data Model

```
T2Node {
    id                  : string
    name                : string
    type                : CHAKRA | JOINT
    state               : LOCKED | SEALING | ACTIVE | REFINED
    t1_cluster          : T1Node[]
    io_nodes            : { meridian_id: T1NodeId }   // maps each meridian slot to a T1 node
    rank                : 1–9
    level               : 1–9
    resonance           : float (computed)
    e_total             : float (computed from T1 sum)
    c_total             : float (computed from T1 sum)
    p_aggregate         : float (e_total / c_total)
    meridian_slots      : MeridianSlot[]
    unlock_requirements : Condition[]
    upgrade_requirements: Condition[]
    attributes          : AttributeBundle
    latent_slots        : int  // unused I/O T1 nodes; potential future meridian connections
}
```

---

## 2.3 T1 Topology Atlas — All 24 T2 Cluster Designs

### Notation

Each topology is described as:
- **Node list:** short IDs for each T1 node, with type (I = IO_IN, O = IO_OUT, B = IO_BIDIR, X = INTERNAL)
- **Edge list:** internal connections (undirected)
- **I/O assignments:** which T1 node serves which meridian direction
- **Strategic challenge:** what makes this topology demand a specific approach

I/O nodes are marked with `★` in diagrams. Unlock order within a cluster follows graph distance from the nearest I/O node — nodes closer to an I/O unlock first.

---

### CHAKRA NODES (8 Nodes, 12 T1 each)

---

#### MULADHARA — "The Square Seal" (Root Chakra)

**Inspiration:** Muladhara yantra — a downward-pointing triangle inside a square, four petals pointing outward at cardinal directions.

**T1 Nodes (12):**

```
     ★P_N
    /     \
Sq_NW   Sq_NE
  |  T_L—T_R  |
  |    \ /    |
  |    T_B    |
  |     |     |
Sq_SW  [C]  Sq_SE
    \     /
     (unused)
```

```
Nodes:
  P_N  (B)  — top petal     [IO: SACRAL meridian]
  P_W  (B)  — left petal    [IO: L.HIP meridian]
  P_E  (B)  — right petal   [IO: R.HIP meridian]
  P_S  (X)  — bottom petal  [LATENT — potential future connection]
  Sq_NW (X), Sq_NE (X), Sq_SW (X), Sq_SE (X) — square corners
  T_L (X), T_R (X), T_B (X) — downward triangle
  C   (X)  — center seed node

Edges:
  P_N — Sq_NW, P_N — Sq_NE          [petal connects to two square corners]
  P_W — Sq_NW, P_W — Sq_SW
  P_E — Sq_NE, P_E — Sq_SE
  P_S — Sq_SW, P_S — Sq_SE
  Sq_NW — T_L,  Sq_NE — T_R          [square feeds triangle]
  T_L — T_R,   T_L — T_B,  T_R — T_B [triangle ring]
  T_L — C,     T_R — C,    T_B — C    [triangle feeds center]
  Sq_SW — T_B, Sq_SE — T_B            [lower square to triangle base]
```

**Meridian I/O Assignment:**
- SACRAL direction → `P_N` (Bidirectional; becomes double meridian as first major upgrade)
- L.HIP direction → `P_W` (Bidirectional)
- R.HIP direction → `P_E` (Bidirectional)
- `P_S` is LATENT — unlocked as a bonus slot by specific late-game techniques

**Strategic Challenge — "The Sealed Triangle":**
The triangle `(T_L, T_R, T_B)` and center `C` are deep in the graph. Energy entering from any petal must pass through two square corners before reaching the triangle. The center `C` fills last. However, `C` provides the highest per-node resonance contribution (worth 2× a normal T1 node for resonance calculation). Players must deliberately route circulation inward rather than settling for full outer petal activity alone.

**Unlock Sequence:** P_N (first; auto-unlocked) → Sq_NW, Sq_NE → T_L, T_R → T_B → C → P_W, P_E, Sq_SW, Sq_SE → P_S (latent)

---

#### SVADHISTHANA — "The Lotus Hex" (Sacral Chakra)

**Inspiration:** Svadhisthana yantra — a six-petaled lotus with an inner circle and crescent symbol.

**T1 Nodes (12):**
```
Outer hexagon (6 petals): P1, P2, P3, P4, P5, P6 — arranged in a regular hexagon
Inner hexagon (6 nodes): I1, I2, I3, I4, I5, I6 — rotated 30° inward relative to outer

I/O assignments (4 meridian connections):
  P1 (B) — SACRAL → ROOT direction (downward)
  P4 (B) — SACRAL → SOLAR direction (upward)
  P2 (B) — SACRAL → L.HIP (lateral left)
  P5 (B) — SACRAL → R.HIP (lateral right)
  P3, P6 (X) — LATENT

Edges:
  Outer ring: P1—P2—P3—P4—P5—P6—P1
  Inner ring: I1—I2—I3—I4—I5—I6—I1
  Spoke connections: P1—I1, P2—I2, P3—I3, P4—I4, P5—I5, P6—I6
  Crescent cross: I1—I4, I2—I5 (creates two shortcut diagonals through center)
```

**Strategic Challenge — "The Crescent Shortcut":**
The two crescent cross-connections `I1—I4` and `I2—I5` are the fastest internal paths between opposite I/O nodes. Without them (early game, when I1–I6 may not all be active), energy traveling from ROOT-side P1 to SOLAR-side P4 must go around the full outer ring — 3 hops instead of 2 inner hops. Developing the inner hexagon is essential for this node to function as the distribution hub it's designed to be.

---

#### MANIPURA — "The Ten-Spoke Wheel" (Solar Plexus Chakra)

**Inspiration:** Manipura yantra — a ten-petaled lotus with an inner downward-pointing triangle.

**T1 Nodes (12):**
```
Outer ring (10 spoke-tips): S1–S10, evenly spaced (36° apart)
Inner triangle (3 nodes): TR_L, TR_R, TR_B (downward triangle)
  — note: only 13, we use 10 + 2 hub nodes
  
Revised count for 12:
  Spoke tips (5): S1, S3, S5, S7, S9 (every other, aligned with I/O directions)
  Spoke midpoints (5): S2, S4, S6, S8, S10 (between tips)
  Triangle (2): TR_A, TR_B (simplified inner triangle, two nodes)
  — Wait, that's 12 total. Let me re-do:

Final 12-node layout:
  Outer tips (6): OT_N, OT_NE, OT_SE, OT_S, OT_SW, OT_NW
  Inner ring (5): IR_1, IR_2, IR_3, IR_4, IR_5 (pentagon)
  Center (1): C

I/O: 2 meridian connections (SACRAL below, HEART above)
  OT_S (B) — SOLAR → SACRAL
  OT_N (B) — SOLAR → HEART
  OT_NE, OT_NW (X) — LATENT (future Dao node connections)

Edges:
  Outer ring: OT_N—OT_NE—OT_SE—OT_S—OT_SW—OT_NW—OT_N
  Inner ring: IR_1—IR_2—IR_3—IR_4—IR_5—IR_1
  Spoke connections: each OT_x to nearest IR_x (6 spokes to 5 inner = one IR has 2 spokes)
  Center spokes: C—IR_1, C—IR_2, C—IR_3, C—IR_4, C—IR_5
```

**Strategic Challenge — "The Furnace Core":**
Manipura has a special function: it is the Yang Qi conversion node. Its center `C` is the "furnace point" — Qi stored at `C` is eligible for conversion to Yang Qi at each tick. `C` connects only to the inner ring, not directly to the outer. Players must ensure inner ring nodes are developed to allow Qi to reach `C`. The more active inner ring nodes, the higher the conversion throughput. This means Manipura rewards full internal development, not just outer I/O activation.

---

#### ANAHATA — "The Star of Two Triangles" (Heart Chakra)

**Inspiration:** Anahata yantra — the Star of David (two overlapping triangles), 12-petaled lotus.

**T1 Nodes (12):**
```
Two overlapping triangles form a hexagram with 6 outer star points and 6 inner hexagon intersections.

Star points (6): SP_N, SP_NE, SP_SE, SP_S, SP_SW, SP_NW
Inner hexagon (6): HX_1, HX_2, HX_3, HX_4, HX_5, HX_6

I/O: 4 meridian connections (this is the primary hub of the upper body)
  SP_S  (B) — HEART → SOLAR
  SP_N  (B) — HEART → THROAT
  SP_NW (B) — HEART → L.SHOULDER
  SP_NE (B) — HEART → R.SHOULDER
  SP_SW, SP_SE (X) — LATENT

Edges:
  Upward triangle: SP_N—HX_2, SP_N—HX_6 ; SP_SE—HX_4, SP_SE—HX_2 ; SP_SW—HX_6, SP_SW—HX_4
  Downward triangle: SP_NE—HX_1, SP_NE—HX_3 ; SP_S—HX_3, SP_S—HX_5 ; SP_NW—HX_5, SP_NW—HX_1
  Inner hexagon ring: HX_1—HX_2—HX_3—HX_4—HX_5—HX_6—HX_1
```

**Strategic Challenge — "The Four-Way Crossroads":**
Anahata is the only T2 node in the body with 4 active meridian connections (all other nodes have ≤3 in normal operation). Energy constantly flows in from SOLAR and out to THROAT, L.SHOULDER, R.SHOULDER — or the reverse. The inner hexagon ring is the distribution manifold. If inner hexagon nodes are underdeveloped, energy entering from one star point cannot reach the others efficiently, creating lopsided distribution. Advanced players deliberately route Shen through Anahata because Shen's high purity training factor smooths the inner hexagon's connections fastest.

---

#### VISHUDDHA — "The Sixteen-Spoke Mandala" (Throat Chakra)

**Inspiration:** Vishuddha yantra — a 16-petaled lotus with an inner circle and downward triangle.

**T1 Nodes (12):**
```
16 petals reduced to 12 nodes via dual-layer concentric ring:
  Outer arc (6): OA_1–OA_6 (wide spread, 60° apart, like every other of 12)
  Inner ring (5): IR_1–IR_5 (pentagon)
  Center (1): C

This creates a "bell" shape — wide top and bottom, dense center.

I/O: 2 meridian connections
  OA_1 (B) — THROAT → HEART (downward)
  OA_4 (B) — THROAT → AJNA (upward)
  OA_2, OA_3, OA_5, OA_6 (X) — LATENT / resonance storage

Edges:
  Outer arc: OA_1—OA_2—OA_3—OA_4—OA_5—OA_6—OA_1 (ring)
  Inner ring: IR_1—IR_2—IR_3—IR_4—IR_5—IR_1 (pentagon)
  Outer-to-inner: OA_1—IR_1, OA_2—IR_2, OA_3—IR_2, OA_4—IR_3, OA_5—IR_4, OA_6—IR_5
  Center: C—IR_1, C—IR_2, C—IR_3, C—IR_4, C—IR_5
```

**Strategic Challenge — "The Resonator":**
Vishuddha has only 2 active I/O nodes but 6 outer arc nodes. The outer arc provides enormous passive storage but its latent nodes contribute resonance without contributing to flow. The strategic challenge is different from other chakras: *Vishuddha is a resonance storage node, not a throughput node.* A player who fills all outer arc nodes maximizes the Circulation Speed attribute bonus dramatically. The optimal play is to develop the center `C` and inner ring first (for throughput between HEART and AJNA), then fill the outer arc for attribute power.

---

#### AJNA — "The Yin-Yang Dyad" (Third Eye Chakra)

**Inspiration:** Ajna yantra — two-petaled lotus, yin-yang symbol internally.

**T1 Nodes (12):**
```
Two interlocking S-curve lobes (Yin and Yang), each containing 5 nodes, plus 2 shared junction nodes.

Yin lobe (5): YN_1, YN_2, YN_3, YN_4, YN_5 (left S-curve)
Yang lobe (5): YG_1, YG_2, YG_3, YG_4, YG_5 (right S-curve)
Junction nodes (2): J_TOP, J_BOT (where the lobes meet at top and bottom)

I/O: 2 meridian connections
  J_BOT (B) — AJNA → THROAT (downward)
  J_TOP (B) — AJNA → SAHASRARA (upward)
  YN_5 (X) — LATENT Yin slot
  YG_5 (X) — LATENT Yang slot

Edges:
  Yin chain: J_TOP—YN_1—YN_2—YN_3—YN_4—YN_5—J_BOT
  Yang chain: J_TOP—YG_1—YG_2—YG_3—YG_4—YG_5—J_BOT
  Yin-Yang bridges: YN_2—YG_4, YN_4—YG_2 (the two S-curve crossing points)
```

**Strategic Challenge — "Lobe Balance":**
Energy entering from `J_BOT` (from Throat) will take whichever lobe path is less congested. If one lobe is underdeveloped (fewer active T1 nodes, lower quality), energy will predominantly flow through the other, starving the first. The Yin lobe has affinity for Shen (higher purity flow); the Yang lobe has affinity for Yang Qi (higher speed). To maximize Ajna's analytical attributes, the player must balance both lobes. An imbalanced Ajna provides only partial Critical Insight attribute.

---

#### SAHASRARA — "The Fractal Crown" (Crown Chakra)

**Inspiration:** Sahasrara yantra — thousand-petaled lotus, represented as a complex multi-ring mandala.

**T1 Nodes (12):**
```
Three concentric rings plus a center:
  Outer ring (5): OR_1–OR_5 (pentagonal)
  Middle ring (4): MR_1–MR_4 (square, rotated 45° from outer)
  Inner ring (2): IR_A, IR_B
  Center (1): C

I/O: 2 meridian connections
  OR_1 (B) — SAHASRARA → AJNA (downward)
  OR_3 (B) — SAHASRARA → BINDU (posterior connection)
  OR_2, OR_4, OR_5 (X) — LATENT (significant Dao node attachment points)

Edges:
  Outer ring: OR_1—OR_2—OR_3—OR_4—OR_5—OR_1
  Outer-to-middle: OR_1—MR_1, OR_2—MR_1, OR_2—MR_2, OR_3—MR_2, OR_4—MR_3, OR_5—MR_3, OR_5—MR_4, OR_1—MR_4
  Middle ring: MR_1—MR_2—MR_3—MR_4—MR_1 (square)
  Middle-to-inner: MR_1—IR_A, MR_2—IR_A, MR_3—IR_B, MR_4—IR_B
  Inner ring: IR_A—IR_B
  Center: C—IR_A, C—IR_B
```

**Strategic Challenge — "The Three Rings":**
Three distinct layers must each be developed before the next layer can be efficiently reached. Energy entering at `OR_1` must pass through the outer ring, then the middle ring, then the inner ring to reach `C`. The center `C` is the only node that contributes to the "Realm Cap Lift" bonus — Sahasrara's signature attribute that raises the maximum rank achievable by all other nodes. Without `C` active, Sahasrara works but provides no realm expansion. The three-ring structure forces patient, systematic cultivation and cannot be rushed.

---

#### BINDU — "The Crescent-Dot" (Soma Chakra)

**Inspiration:** Bindu visarga symbol — a crescent with a dot above it.

**T1 Nodes (12):**
```
Crescent arc (11): CR_1–CR_11 (sequential arc, slight curve)
Dot node (1): D (the bindu point, positioned above the crescent's center)

D is connected ONLY to CR_6 (the crescent midpoint). This is the most isolated position
in any cluster topology — the dot must be reached through the crescent.

I/O: 1 meridian connection initially (2 once the reverse is opened)
  CR_1 (B) — BINDU → SAHASRARA (and back)
  CR_11 (X) — LATENT end of arc (potential secondary connection in very late game)

Edges:
  Crescent chain: CR_1—CR_2—CR_3—CR_4—CR_5—CR_6—CR_7—CR_8—CR_9—CR_10—CR_11
  Dot connection: CR_6—D (single connection; D has only one neighbor)
```

**Strategic Challenge — "The Isolated Dot":**
`D` is the most critical T1 node in the entire body. Bindu's "Node Stabilization Reserve" is stored exclusively at `D`. But `D` connects only to `CR_6`, and `CR_6` is six hops from the I/O node `CR_1`. This means:
1. Filling `D` is very slow — energy must travel through half the crescent first.
2. Expending Bindu reserves during combat depletes `D` first; refilling it requires long cultivation.
3. The player has a strong incentive to maximize `CR_6`'s quality specifically, since it is the only bridge to `D`.
The crescent structure also acts as a **delay line** — energy entering at `CR_1` slowly propagates, giving Bindu a natural gradual-absorption character that resists sudden depletion.

---

### JOINT NODES

Joint nodes have 8 T1 nodes each (major joints) or 6 T1 nodes each (minor joints). Their topologies are inspired by the written forms of Chinese anatomical characters, producing structural rather than radial designs.

---

#### SHOULDER — "The Ladder" (8 T1, Major)

**Inspiration:** 肩 (jiān — shoulder); two horizontal rails connected by vertical rungs.

```
Top rail: TR_1—TR_2—TR_3—TR_4   (4 nodes, horizontal)
Bot rail: BR_1—BR_2—BR_3—BR_4   (4 nodes, horizontal)
Rungs: TR_1—BR_1, TR_2—BR_2, TR_3—BR_3, TR_4—BR_4

I/O:
  TR_1 (B) — receives from / sends to HEART (or SOLAR for cross-body later)
  BR_4 (B) — receives from / sends to ELBOW
  TR_4, BR_1 (X) — LATENT end positions
```

**Strategic Challenge — "The Rung Bottleneck":**
Energy entering from `TR_1` (Heart) moves along the top rail and must cross a rung to exit from `BR_4` (Elbow). Each rung is a potential shortcut. Developing interior rungs (`TR_2—BR_2`, `TR_3—BR_3`) gives energy a shorter path to the bottom rail. A player who only unlocks end nodes has a 7-hop path from entry to exit. A player who develops all rungs can find a 2-hop path (TR_2→BR_2→BR_3→BR_4). This makes Shoulder a node where internal development has dramatic throughput payoff.

---

#### HIP — "The Arch-and-Chain" (8 T1, Major)

**Inspiration:** 髋 (kuān — hip joint); a broad arch above with hanging structural elements.

```
Arch (3): AR_L—AR_M—AR_R   (3 nodes, arc shape — AR_M is the keystone)
Keystone layer (2): K_L—K_R   (AR_M connects to both K_L and K_R below)
Chain (3): CH_A—CH_B—CH_C   (hanging below K layer, CH_A connects to K_L, CH_C connects to K_R)

Edges:
  AR_L—AR_M, AR_M—AR_R
  AR_L—K_L, AR_R—K_R
  AR_M—K_L, AR_M—K_R
  K_L—CH_A, K_R—CH_C
  CH_A—CH_B—CH_C

I/O:
  AR_L (B) — connects toward ROOT (Muladhara)
  AR_R (B) — connects toward SACRAL (Svadhisthana) [Belt Vessel]
  CH_B (B) — connects toward KNEE
  AR_M (X) — LATENT (potential cross-hip connection in advanced play)
```

**Strategic Challenge — "The Weight-Bearing Arch":**
`AR_M` (keystone) connects to both K nodes, making it the single most important relay node in the cluster. Without `AR_M` active, the arch is split and energy from `AR_L` cannot reach the K layer via `AR_R` side. The keystone must be unlocked early — but it is in the second graph layer from the I/O nodes (one hop from `AR_L` or `AR_R`). The chain hangs below and fills from the middle (`CH_B` I/O receives from Knee direction and distributes to CH_A and CH_C). Filling the chain before the arch is developed leads to energy pooling at `CH_B` with nowhere to go.

---

#### KNEE — "The Bent Reed" (6 T1, Minor)

**Inspiration:** 膝 (xī — knee); a simple angled bend, elegant and minimal.

```
Vertical arm (3): V_1—V_2—V_3   (from top)
Horizontal arm (3): H_1—H_2—H_3   (from bottom, perpendicular)
Bend junction: V_3 connects to H_1

I/O:
  V_1 (B) — connects toward HIP
  H_3 (B) — connects toward ANKLE
```

**Strategic Challenge — "The Corner Node":**
`V_3 / H_1` junction is the single relay point. There is only ONE path from entry to exit: V_1→V_2→V_3→H_1→H_2→H_3. This makes the Knee a pure relay — zero redundancy. However, its simplicity also means its strength comes entirely from maximizing the quality of every single T1 node. A high-quality Knee is not about clever routing; it's about patient refinement. This is intentionally different from the complex topologies above. The Knee teaches the player that quality matters as much as structure.

---

#### ELBOW — "The Forked Branch" (6 T1, Minor)

**Inspiration:** 肘 (zhǒu — elbow); a vertical trunk with an angled branch splitting off.

```
Trunk (3): T_1—T_2—T_3   (vertical)
Branch (3): B_1—B_2—B_3   (angled off T_2)

Edges:
  T_1—T_2—T_3
  T_2—B_1—B_2—B_3

I/O:
  T_1 (B) — connects toward SHOULDER
  T_3 (B) — connects toward WRIST
  B_3 (X) — LATENT (possible cross-body connection — L.Elbow ↔ R.Elbow in extreme late game)
```

**Strategic Challenge — "The Dead Branch":**
`B_1–B_2–B_3` is a storage branch that does not lie on the direct path from SHOULDER to WRIST. Energy flowing through the trunk will diffuse into the branch naturally, but the branch also bleeds energy *back* into the trunk. This means a player who wants maximum throughput for the Shoulder→Wrist path must accept that the branch siphons some energy — or deliberately keep the branch half-empty. The branch's volume does contribute to resonance and to the Elbow's combat attributes. This is a quality-vs-throughput tension unique to the Elbow.

---

#### WRIST — "The Cross-Gate" (6 T1, Minor)

**Inspiration:** 腕 (wàn — wrist); a flowing character with a central crossing element.

```
Horizontal bar (3): HL—HC—HR   (left, center, right)
Vertical bar (3): VT—VC—VB   (top, center, bottom)
The two bars share their center node: HC = VC = CENTER (single node)

Revised 6-node cross:
  N (north), E (east), S (south), W (west), CEN (center), EXT (extended southern arm)

Edges: N—CEN, E—CEN, S—CEN, W—CEN, S—EXT (one arm is longer)

I/O:
  N (B) — connects toward ELBOW
  S (B) — connects toward HAND
  E (X), W (X) — LATENT
  EXT (X) — extended storage arm, no meridian
```

**Strategic Challenge — "The Junction Chokepoint":**
`CEN` is touched by every active path — all four arms converge there. It is the only way for energy to travel from ELBOW (N) to HAND (S). Maximizing CEN quality is the dominant priority. The lateral arms `E` and `W` provide resonance and storage but are energetically "downstream" dead-ends. Players who develop `EXT` gain extra storage but create a natural drain on `CEN` as energy diffuses into it.

---

#### HAND — "The Open Palm" (6 T1, Minor)

**Inspiration:** 手 (shǒu — hand); a palm with radiating fingers.

```
Palm hub (1): PALM
5 finger nodes: F_1, F_2, F_3, F_4, F_5

Edges: PALM—F_1, PALM—F_2, PALM—F_3, PALM—F_4, PALM—F_5
(Pure star topology — palm to all fingers, no finger-to-finger connections)

I/O:
  PALM (B) — the ONLY I/O node; connects toward WRIST
  F_1–F_5 (X) — ALL terminal storage; no meridian connections
```

**Strategic Challenge — "The Terminal Reservoir":**
Hand is the terminal node of the arm chain. No energy exits through the fingers — they are pure storage. This makes Hand fundamentally different from every other node: **it cannot contribute to circulation** (you cannot route a loop through a terminal node). Instead, Hand functions as a **combat energy reservoir** — the stored energy here is directly drawn upon for Dao skills at the moment of use. More importantly, the Hand's resonance determines the *multiplier* applied to Dao skill output: a Hand at 100% resonance (all 5 fingers active) provides maximum skill amplification. Players must choose between routing energy into Hand for combat or keeping it circulating for cultivation. Hand is the first explicit cultivation-vs-combat tension point.

---

#### ANKLE — "The Figure-Eight Bridge" (6 T1, Minor)

**Inspiration:** 踝 (huái — ankle bone); a complex character suggesting a double curved structure.

```
Two loops sharing one bridge node:
  Upper loop (3): UL_A—UL_B—UL_C  (and UL_C connects back to UL_A — ring)
  Lower loop (3): LL_A—LL_B—LL_C  (and LL_C connects back to LL_A — ring)
  Bridge: UL_B—LL_B (the two loops share this single connection point — NOT the same node, just connected)

I/O:
  UL_A (B) — connects toward KNEE
  LL_A (B) — connects toward FOOT
```

**Strategic Challenge — "The Bridge Pressure":**
Energy enters `UL_A` and must cross the bridge `UL_B—LL_B` to reach `LL_A` for export to Foot. Both loops are true rings — energy can circulate internally within each loop. This makes the Ankle the **only standard T2 node capable of its own mini-circulation** (a loop within the T1 cluster itself, without needing a second T2 node). A player who deliberately circles energy within the upper or lower Ankle loop can train the Ankle's internal T1 nodes' quality independently of the main body circulation loop. The bridge connection `UL_B—LL_B` is the key bottleneck: if either is low quality, the mini-circulation stays trapped in one loop.

---

#### FOOT — "The Ground Arch" (6 T1, Minor)

**Inspiration:** 足 (zú — foot); an arch character with a descending line, suggesting weight-bearing.

```
Heel (1): HEEL
Arch (3): AR_1—AR_2—AR_3   (curved, HEEL connects to AR_1)
Sole (1): SOLE  (beneath AR_2, the arch midpoint)
Toe-mound (1): TOE (at far end, AR_3 connects to TOE)

Edges: HEEL—AR_1—AR_2—AR_3—TOE ; AR_2—SOLE

I/O:
  HEEL (B) — connects toward ANKLE (only meridian connection; Foot is terminal)
  SOLE (X) — special: passively absorbs Earth Qi from ground (no meridian; environment interface)
```

**Strategic Challenge — "The Grounded Terminus":**
Like Hand, Foot is terminal — no energy loops through it. Unlike Hand, the Foot has a unique passive function: `SOLE` absorbs ambient Earth Qi from the environment at a rate proportional to its quality and the player's current location. This is the only T1 node in the body with an environmental energy source not tied to the meridian network. Players who prioritize Foot quality get a free trickle of Jing/Earth Qi without spending on circulation. The arch structure distributes this absorbed energy toward `HEEL` (the I/O), where it can flow out to `ANKLE` and upward. Foot thus "feeds" the body from below.

---

# 3. T2 BODY TOPOLOGY MAP

## The Full Adjacency Map

Below is the complete graph of all 24 T2 nodes and their meridian connections. This defines the "outer body map" the player sees — distinct from the T1 internal topology inside each cluster.

```
                         [BINDU]
                            |
                        [SAHASRARA]
                            |
                          [AJNA]
                            |
                        [VISHUDDHA]
                            |
              [L.SHOULDER]—[ANAHATA]—[R.SHOULDER]
                    |          |           |
              [L.ELBOW]    [MANIPURA]   [R.ELBOW]
                    |          |           |
              [L.WRIST]   [SVADHISTHANA] [R.WRIST]
                    |       /    \          |
              [L.HAND]  [L.HIP]—[R.HIP]  [R.HAND]
                           |        |
                       [L.KNEE]  [R.KNEE]
                           |        |
                      [L.ANKLE]  [R.ANKLE]
                           |        |
                       [L.FOOT]  [R.FOOT]
```

*Note: MULADHARA (ROOT) is not shown in the vertical chain because it connects laterally at the bottom of SVADHISTHANA's belt level:*

```
                       [SVADHISTHANA]
                       /      |      \
                  [L.HIP] [MULADHARA] [R.HIP]
```

## Full Adjacency List with Meridian Properties

| T2 Node | Connected To | Meridian Count | Initial Direction | Notes |
|---------|-------------|----------------|------------------|-------|
| MULADHARA | SVADHISTHANA | 1 (→ 2) | UP → SACRAL | First double-meridian upgrade target |
| MULADHARA | L.HIP | 1 (→ 2) | DOWN → HIP | |
| MULADHARA | R.HIP | 1 (→ 2) | DOWN → HIP | |
| SVADHISTHANA | MULADHARA | shared | | |
| SVADHISTHANA | MANIPURA | 1 (→ 2) | UP → SOLAR | |
| SVADHISTHANA | L.HIP | 1 | LATERAL | Belt vessel; initial single |
| SVADHISTHANA | R.HIP | 1 | LATERAL | Belt vessel |
| MANIPURA | SVADHISTHANA | shared | | |
| MANIPURA | ANAHATA | 1 (→ 2) | UP → HEART | |
| ANAHATA | MANIPURA | shared | | |
| ANAHATA | VISHUDDHA | 1 (→ 2) | UP | |
| ANAHATA | L.SHOULDER | 1 (→ 2) | LATERAL | |
| ANAHATA | R.SHOULDER | 1 (→ 2) | LATERAL | |
| VISHUDDHA | ANAHATA | shared | | |
| VISHUDDHA | AJNA | 1 (→ 2) | UP | |
| AJNA | VISHUDDHA | shared | | |
| AJNA | SAHASRARA | 1 (→ 2) | UP | |
| SAHASRARA | AJNA | shared | | |
| SAHASRARA | BINDU | 1 (→ 2) | POSTERIOR | |
| BINDU | SAHASRARA | shared | | |
| L.SHOULDER | ANAHATA | shared | | |
| L.SHOULDER | L.ELBOW | 1 (→ 2) | DOWN | |
| L.ELBOW | L.SHOULDER | shared | | |
| L.ELBOW | L.WRIST | 1 (→ 2) | DOWN | |
| L.WRIST | L.ELBOW | shared | | |
| L.WRIST | L.HAND | 1 | DOWN | Hand is terminal; no reverse |
| L.HIP | MULADHARA | shared | | |
| L.HIP | SVADHISTHANA | shared | | |
| L.HIP | L.KNEE | 1 (→ 2) | DOWN | |
| L.KNEE | L.HIP | shared | | |
| L.KNEE | L.ANKLE | 1 (→ 2) | DOWN | |
| L.ANKLE | L.KNEE | shared | | |
| L.ANKLE | L.FOOT | 1 | DOWN | Foot is terminal; no reverse |
| L.HIP | R.HIP | 1 | LATERAL | Belt cross-connection; late unlock |

*(Right-side nodes mirror Left-side exactly)*

## Meridian Direction Convention

A meridian is defined by a **canonical flow direction** — the direction energy travels during unassisted passive flow when the system is out of equilibrium.

**Single Meridians:** Energy flows in one canonical direction only (downhill pressure still drives it, but active pumping against the canonical direction is impossible until the reverse meridian is opened).

**Double Meridians:** Both the canonical direction AND its reverse are open. Both directions can carry energy simultaneously. This is what enables two-node circulation loops.

## The "1 (→ 2)" Notation
"1 (→ 2)" means the connection starts as a single-direction meridian and can be upgraded to a double (bidirectional) meridian. This upgrade is a significant gameplay milestone — it requires:
- Both endpoint nodes at minimum Level 3 in current rank
- A substantial one-time Jing + Yang Qi expenditure
- The meridian must have reached DEVELOPED state (Total Flow threshold met)

Terminal connections (Hand/Foot) are never doubled — those nodes have no meaningful reverse flow.

---

# 4. THE MERIDIAN SYSTEM

## 4.1 Meridian Directionality and Flow Paths

### The Core Design Answer

**Meridians are one-directional channels.** Each meridian has a canonical flow direction. Two nodes connected by a meridian can exchange energy only in that direction during passive (pressure-driven) flow.

**However:** A "connection" between two T2 nodes can host **up to two meridians** — one in each direction. When only one exists, the connection is unidirectional. When both exist, the connection is bidirectional and two-node circulation becomes possible.

This is not merely a semantic distinction. The *second* meridian is a separate game object with its own Width, Purity, Total Flow counter, and quality. It must be trained independently. Two nodes connected by a double meridian have two distinct channels to develop.

### Passive Flow
When no active circulation technique is running, energy drifts along all open meridians driven by the pressure difference between the I/O nodes at each end:

```
PassiveFlow(tick) = max(0, W × ΔP_local × Pur × TypeMod_flow × Δt)

ΔP_local = P_io_out(source) − P_io_in(dest)
```

If `ΔP_local ≤ 0`, no passive flow occurs on this meridian this tick. Energy never flows backward on a single meridian under passive conditions.

### Active Flow (Player-Directed)
When the player defines a circulation route and activates it, each meridian on the route carries energy at a rate determined by the pumping technique in use:

```
ActiveFlow(tick) = W × PumpMod × Pur × TypeMod_flow × Δt

PumpMod = TechniqueStrength × P_T2(source_node)
  — Cannot pump from a node below 5% aggregate pressure (empty)
  — TechniqueStrength range: 0.5 (rank 1 basic technique) → 2.0 (rank 7 technique)
  — Caps at: W × 2.5 (the "burst" ceiling; prevents infinite speed)
```

Active flow *can* move energy against the passive pressure gradient (i.e., from a lower-pressure node to a higher-pressure node) if the technique is strong enough. This is how advanced practitioners "push" energy upward against gravity or fill nodes intentionally.

---

## 4.2 The Two-Node Loop Question

### Can You Create Circulation with Only 2 T2 Nodes?

**Yes — but only after opening the double meridian between them.**

With a single meridian between ROOT and SACRAL (initial state), energy can only flow ROOT → SACRAL. There is no loop. The first cultivation milestone is opening the reverse meridian SACRAL → ROOT, creating the **first two-node micro-loop**.

```
[ROOT] ══════⇒══════ [SACRAL]    (Governing Vessel — upward)
[ROOT] ══════⇐══════ [SACRAL]    (Conception Vessel — downward)
```

With both meridians open, the player can define a 2-node loop:
- Energy flows ROOT → SACRAL on meridian A
- Energy flows SACRAL → ROOT on meridian B
- Both meridians train simultaneously

**Efficiency of 2-node vs N-node loops:**
A 2-node loop is valid but less efficient than longer loops per unit of energy spent. The "Loop Efficiency Factor" (see Section 7) scales with the number of nodes in the loop. Two-node loops have efficiency 0.6×; three-node loops have 0.8×; six-node loops reach 1.0×; twelve-node loops reach 1.2×.

**Why allow it then?** Because in early game with only ROOT and SACRAL available, the 2-node loop is the only way to begin training meridians actively. It is a deliberate stepping-stone, not an optimal strategy. Players who hold the 2-node loop too long will fall behind players who open the 3-node loop (ROOT → SACRAL → L.HIP → ROOT) as soon as it becomes available.

### Minimum Loop Requirements
- **2 nodes:** Requires double meridian between them. Loop Efficiency 0.6×.
- **3+ nodes:** Requires a closed cycle (each node connects to the next via a same-direction meridian). Loop Efficiency scales up to 1.2× at 12 nodes.
- **Maximum loop length:** 16 nodes (engine limitation; longer loops have diminishing training returns and high heat accumulation).

---

## 4.3 Meridian Data Model and Math

### Meridian Data Model

```
Meridian {
    id              : string
    node_from       : T2NodeId      // canonical flow source
    node_to         : T2NodeId      // canonical flow destination
    io_node_out     : T1NodeId      // T1 node at source end (type IO_OUT or IO_BIDIR)
    io_node_in      : T1NodeId      // T1 node at dest end (type IO_IN or IO_BIDIR)
    state           : UNESTABLISHED | NASCENT | DEVELOPED | REFINED | TRANSCENDENT
    width           : float         // W — max flow rate at ΔP = 1.0 (units/tick)
    purity          : float         // Pur — fraction of energy that survives transit [0–1]
    total_flow      : float         // TF — lifetime energy successfully transported
    jing_deposit    : float         // accumulated Jing structural essence (improves base_purity)
    type_affinity   : EnergyType | null  // develops after 60%+ lifetime dominance of one type
    affinity_fraction: float        // fraction of lifetime flow that is attuned type
}
```

### Width Evolution

```
W(TF) = W_base × [1 + log₁₀(1 + TF × TypeWidthFactor) / ScaleW]

W_base by state:
  NASCENT:       1.0
  DEVELOPED:     3.0   (TF threshold: 10,000)
  REFINED:       8.0   (TF threshold: 100,000)
  TRANSCENDENT: 20.0   (TF threshold: 1,000,000)

ScaleW = 8.0 (tunable)
TypeWidthFactor (how efficiently each type trains width — see Section 5.3)
```

Width grows continuously between state thresholds. State labels are milestones that trigger UI feedback and attribute bonuses, but width is a continuous float.

### Purity Evolution

Purity has two components — a dynamic "flow purity" trained by Shen and Yang Qi, and a permanent "structural purity" built by Jing:

```
Pur(TF) = Pur_structural + Pur_flow_bonus

Pur_structural = Pur_base + 0.25 × (jing_deposit / (jing_deposit + JingStructureConstant))
  JingStructureConstant = 20,000

Pur_flow_bonus = 0.35 × (TF × TypePurityFactor) / (TF × TypePurityFactor + PurityScaleConst)
  PurityScaleConst = 200,000

Total Pur is capped at 0.99 (some loss always exists; 1.0 is unachievable)
```

Starting purity values by type of first establishment:
- Established with Qi: base purity 0.55
- Established with Jing: base purity 0.60
- Established with Yang Qi: base purity 0.50
- Established with Shen: base purity 0.65

### Meridian Quality (Composite Metric)

```
Quality = W × Pur    [ranges roughly 0.5 (nascent, low purity) to ~20 (transcendent, high purity)]
```

### Flow Bonus to Connected Nodes

The most strategically important output of a meridian: it adds to the maximum energy of both connected T2 nodes.

```
FlowBonus_percent = K_fb × log₁₀(1 + Quality) × log₁₀(1 + TF / 1000)

K_fb = 4.0 (tunable multiplier)

Example: A REFINED meridian (W=8, Pur=0.85, Quality=6.8) with TF=500,000:
  FlowBonus = 4.0 × log₁₀(7.8) × log₁₀(501) ≈ 4.0 × 0.892 × 2.70 ≈ +9.6% to both node maxEnergy
```

This bonus stacks multiplicatively with bonuses from other meridians connected to the same node.

### Energy Delivered vs. Energy Lost

```
EnergyDelivered = FlowRate × Pur
EnergyLost = FlowRate × (1 − Pur)

Lost energy dissipates as:
  - Heat (Yang Qi primary): BodyHeat += EnergyLost × YangQiFraction
  - Scatter (Qi/Jing): simply removed from system (absorbed by body's ambient field)
  - Shen loss: Shen is so refined that its "scatter" deposits as a trace permanent purity bonus
    ShenScatterDeposit = EnergyLost_Shen × 0.1  (added to jing_deposit equivalent for Shen)
```

### Type Affinity Effect

Once a meridian develops type affinity (one type > 60% of TF):
- Attuned type: Width multiplied by 1.25×, Purity loss multiplied by 0.85× (less loss)
- Non-attuned type: Purity loss multiplied by 1.10× (more loss, slight resistance)
- Mixed-type flows: weighted average of modifiers by energy fraction per tick

---

# 5. THE ENERGY SYSTEM

## 5.1 The Four Energy Types

*(Concept descriptions from v1.0 preserved; mathematical specifics added below)*

### QI — Vital Breath
- **Source:** Passive generation from all active T1 nodes (base rate 0.1 Qi/tick per active T1). Meditation boosts this.
- **Role:** Universal currency. Most abundant, most flexible.
- **Conversion:** Qi → Yang Qi (Manipura refining, 3:1 ratio at base efficiency). Qi → Jing (very slow, Svadhisthana cycling, 12:1 ratio).

### JING — Refined Essence
- **Source:** Passive from Hip + Foot nodes (0.03 Jing/tick per active T1 in those nodes). Rest actions. Physical training. Certain foods.
- **Role:** Structural. Best for unlocking, repairing, widening meridians.
- **Depletion Warning:** If total body Jing < 10% of Jing capacity: all nodes take 0.001 HP damage per tick. Jing is non-optional.

### YANG QI — Refined Breath-Fire
- **Source:** Manipura conversion from Qi. Combat activity. Fire/Force school treasures.
- **Role:** Combat power. Fastest meridian width training. Volatile — generates heat.
- **Heat:** Yang Qi that is lost during meridian transit (the `EnergyLost` component) converts to body heat 1:1.

### SHEN — Spirit Light
- **Source:** Anahata and Ajna passive (0.002 Shen/tick each when at Resonance > 50%). Dao Comprehension events. Rare meditation states.
- **Role:** Most precious. Trains meridian purity fastest. Powers highest-tier skills. Cannot be converted from other types.
- **Resonance Weight:** Each unit of Shen stored counts as 3 Qi-equivalent for resonance calculation within its node.

---

## 5.2 Energy Flow Mathematics

### The Type Modifier Matrix

All energy types flow through the same meridian network but with different behavioral parameters:

| Property | Qi | Jing | Yang Qi | Shen |
|----------|-----|------|---------|------|
| **TypeMod_flow** (speed multiplier in meridians) | 1.00× | 0.65× | 1.40× | 0.40× |
| **TypeMod_purity_loss** (multiplier on (1-Pur)) | 1.00× | 0.80× | 1.20× | 0.85× |
| **TypeWidthFactor** (contribution to TF for width training) | 1.00× | 1.30× | 1.80× | 0.50× |
| **TypePurityFactor** (contribution to TF for purity training) | 1.00× | 0.90× | 0.55× | 3.50× |
| **Internal α multiplier** (T1-to-T1 diffusion speed) | 1.00× | 0.70× | 1.30× | 0.35× |
| **Node Unlock Weight** (Qi-equivalents per unit for unlock threshold) | 1.00 | 1.25 | 0.85 | 3.00 |
| **Heat per unit lost** | 0.00 | 0.00 | 1.00 | 0.00 |
| **Resonance weight per stored unit** | 1.00 | 1.00 | 1.10 | 3.00 |

### Interpreting the Matrix

**Yang Qi** is the speed demon. It moves fastest (1.4× through meridians, 1.3× internally), trains width fastest (1.8× TypeWidthFactor), but suffers highest loss (1.2× on purity multiplier) and generates heat. A body flooded with Yang Qi circulation trains its meridian widths aggressively but risks overheating and ignores purity development.

**Jing** is the structural workhorse. Slower flow (0.65×), but its loss fraction is reduced (0.8× on purity loss) and it trains width 30% better than Qi. Its structural deposits (jing_deposit accumulation) uniquely improve base purity permanently. A Jing-heavy circulation strategy builds durable, structurally sound meridians that don't need constant maintenance.

**Shen** is the refiner. Barely moves (0.4× speed, 0.35× internal diffusion) but trains purity at 3.5× rate and generates no heat. A tiny amount of Shen in a circulation loop dramatically accelerates purity improvement. The optimal strategy is to include a trickle of Shen in every loop without letting it dominate the volume (since its low flow rate creates a bottleneck if it fills the width capacity).

**Qi** is the baseline. Unremarkable in every modifier — but its abundance makes it the foundation everything else is built on.

### Multi-Type Flow in a Single Meridian

Multiple types can coexist in a meridian simultaneously. The total flow rate cannot exceed the meridian's width `W`. Types are processed in order of precedence when total requested flow exceeds `W`:

```
Flow priority order: Shen > Jing > Qi > Yang Qi
(Shen gets first claim on width; Yang Qi is last — it "fills the gap")
```

Per-type actual flow:
```
FlowRate_type(t) = TypeMod_flow(type) × W_remaining × fraction_type_at_io_out
W_remaining decreases as each type claims its share
```

The energy delivered for each type is computed separately using its own modifiers.

### Heat System

```
BodyHeat += Σ (Flow_yangqi_i × (1 − Pur_i))   for all active meridians i, per tick
BodyHeat -= BaseDissipation × ManipuraResonance × Δt

BaseDissipation = 0.5 heat units/tick (at full Manipura resonance)
ManipuraResonance ∈ [0, 1]
```

**Heat thresholds:**
| Heat Level | Threshold | Effect |
|-----------|-----------|--------|
| Warm | >20% of max heat | No penalty; visual indicator |
| Hot | >40% | All meridian effective purity −5% (temporary) |
| Scorching | >65% | Physical HP damage: 0.01 HP/tick |
| Critical | >85% | Node cracking risk: each tick, roll (heat − 85%) chance to crack random node |

Max heat capacity scales with Manipura rank and level.

### Jing Structural Deposit

Jing doesn't just flow — it deposits traces of structural essence in meridian walls:

```
jing_deposit += Flow_jing × Pur × 0.001   (per tick; a slow accumulation)
```

This is the mechanism behind Pur_structural in the purity formula. Jing cultivation is the "long game" — it permanently and irreversibly improves purity floors.

### Shen Scatter Deposit

When Shen is lost in transit (the rare `EnergyLost_Shen` component):
```
Pur_floor_bonus += EnergyLost_Shen × 0.05   (added permanently to meridian purity)
```

Shen loss is actually less bad than other type losses — it leaves a positive trace. This means Shen circulated in low-purity early meridians is not wasted: it "seasons" the meridian for better performance later.

---

## 5.3 Energy Interactions: Mixing, Conversion, Capacity

### Per-Type Node Capacity

Each T2 node holds energy as a mix of types. The total capacity `C_T2` is shared across all types:

```
E_Qi + E_Jing + E_YangQi + E_Shen ≤ C_T2

Individual caps can be soft-capped per energy type based on node affinity:
  Affinity types fill freely to 100% of C_T2
  Non-affinity types soft-cap at 60% (generating mild overflow pressure above this)
```

Overflow pressure for non-affinity types above 60%:
```
OverflowPressure(type) = (E_type / (0.6 × C_T2) − 1.0) × 0.5 if E_type > 0.6 × C_T2
                       = 0 otherwise
```

This creates a higher apparent pressure at the I/O node for non-affinity overflow, causing faster export — the node "rejects" energy that doesn't belong to it.

### Qi → Yang Qi Conversion at Manipura

Manipura's center node `C` performs active conversion each tick when the player activates the Refining Pulse technique:

```
ConversionRate = ConversionEfficiency × E_Qi(C) × Δt

ConversionEfficiency = 0.30 + 0.07 × ManipuraLevel + 0.03 × ManipuraRank
  (ranges from 0.30 at level 1, rank 1 to ~0.95 at level 9, rank 5)

YangQiGenerated = ConversionRate × (1 - HeatPenalty)
HeatPenalty = max(0, (BodyHeat / MaxHeat - 0.40))   [heat above 40% reduces conversion]

Qi consumed = ConversionRate (always at 3:1 input; actual output may be less due to heat)
```

---

# 6. PROGRESSION SYSTEMS

*(Core logic unchanged from v1.0; updated to reference new node data model)*

## 6.1 Unlocking T2 Nodes

Unlock conditions, thresholds, and the SEALING progress bar remain as designed in v1.0. The key addition from the new architecture:

**Unlock Threshold uses Qi-equivalent weighting:**
```
UnlockProgress += FlowRate_Qi × 1.00
                + FlowRate_Jing × 1.25
                + FlowRate_YangQi × 0.85
                + FlowRate_Shen × 3.00
```

(Per tick of energy entering the SEALING node through its I/O port — the energy must actually arrive at the I/O node, not just be present somewhere in an adjacent T2.)

## 6.2 Improving T2 Nodes (Level Requirements)

*(Unchanged from v1.0 — see Section 5.2 of v1.0 for the full requirement tables)*

One addition: **Average meridian quality** requirements now reference the Quality composite metric (`W × Pur`) rather than just state labels, giving smoother gating.

## 6.3 Rank Advancement Breakthroughs

*(Unchanged from v1.0)*

## 6.4 Opening Reverse Meridians (New in v2.0)

Reverse meridian opening is a major milestone separate from node leveling.

**Requirements to open the reverse of an existing meridian:**
1. Both endpoint T2 nodes at Rank X, Level 3 minimum
2. The existing (forward) meridian must be in DEVELOPED state or better
3. One-time cost: `500 × Rank × MeridianLength_hops` Jing + `200 × Rank` Yang Qi
4. Establishment: player must perform a specific "reverse-sealing" action (sending energy against the grain of the existing meridian with a high-strength active pump — uses `TechniqueStrength` at max for 30 seconds real time)

**Milestone order (recommended):**
1. ROOT ↔ SACRAL reverse (enables first 2-node loop) — earliest possible, ~Hour 2
2. SACRAL ↔ SOLAR (enables 3-node spine loop) — ~Hour 5
3. ROOT ↔ L.HIP and ROOT ↔ R.HIP reverse (enables first leg loops) — ~Hour 8
4. Gradual opening of all remaining chakra chain reverses — Hours 10–30
5. Limb reverses (Shoulder↔Elbow, etc.) — mid-game
6. All reverses open, Great Circulation possible — late game

---

# 7. THE CIRCULATION SYSTEM

## Loop Definition

A circulation route is an ordered list of T2 nodes forming a closed directed cycle. Each consecutive pair in the list must be connected by a meridian in the matching direction.

Valid loop examples:
- `[ROOT → SACRAL → ROOT]` (2-node loop, requires double meridian ROOT↔SACRAL)
- `[ROOT → SACRAL → SOLAR → HEART → SOLAR → SACRAL → ROOT]` — INVALID (revisits nodes)
- `[ROOT → SACRAL → L.HIP → ROOT]` (3-node loop using left belt vessel)
- `[ROOT → SACRAL → SOLAR → HEART → R.SHOULDER → R.ELBOW → R.WRIST → ... → R.HIP → SACRAL → ROOT]` — partial Great Circulation

## Bottleneck and Efficiency

```
LoopBottleneck = min_i (W_i × Pur_i × TypeMod_flow_i)   for all meridians i in loop

LoopEfficiency(n) = 0.60 + 0.06 × (n − 2)   for n ≥ 2, capped at 1.20
  n = number of nodes in loop (= number of meridians in loop)
  n=2: 0.60×; n=3: 0.66×; n=7: 0.90×; n=10: 1.08×; n=12: 1.20× (cap)

TrainingContribution(tick) = LoopBottleneck × LoopEfficiency × EnergyVolumeFraction
  — applied to ALL meridians in the loop proportionally (slow meridians get more relative benefit)
```

## The Great Circulation

Once all 24 nodes are active and all canonical meridians are DEVELOPED or better, the player can define the Great Circulation — a single loop visiting all 24 nodes.

**Great Circulation bonus (while active):**
```
GlobalMeridianTrainingBonus = +25% to TypeWidthFactor and TypePurityFactor for all types
ShenGenerationBonus = +0.003 Shen/tick (ambient resonance harmonic)
HarmonyBonus = LoopEfficiency treated as 1.30× (above the normal cap)
HeatMultiplier = 1.5× (the Great Circulation runs hot regardless of type mix)
```

## Heat from Circulation

```
CirculationHeat(tick) = Σ_i [Flow_yangqi_i × (1 − Pur_i)]   summed over all meridians in loop

Passive dissipation always occurs regardless of circulation activity.
If BodyHeat is too high, the active loop is automatically throttled:
  ThrottleFactor = max(0.1, 1 − (BodyHeat / MaxHeat − 0.6) × 2.5)
  EffectiveActiveFlow = ActiveFlow × ThrottleFactor
```

---

# 8. THE ATTRIBUTE SYSTEM

*(Unchanged from v1.0 — reproduced for completeness)*

## Cultivation Attributes

| Attribute | Source Nodes | Effect |
|-----------|-------------|--------|
| **Max Energy** | All nodes (base), Meridian Flow Bonus | Raises energy ceiling of each node |
| **Qi Generation** | Muladhara, Svadhisthana, Sahasrara | Passive Qi per tick |
| **Jing Generation** | Muladhara, Bindu, Hip Nodes, Foot Nodes | Passive Jing per tick (slow) |
| **Yang Qi Conversion** | Manipura | Efficiency of Qi→Yang Qi conversion |
| **Shen Generation** | Anahata, Ajna, Sahasrara | Passive Shen per tick (very slow) |
| **Circulation Speed** | Svadhisthana, Knee Nodes, Ankle Nodes | Rate at which loops complete |
| **Meridian Repair Rate** | Svadhisthana, Bindu | Speed of damaged meridian recovery |
| **Unlock Efficiency** | All active T2 nodes (total resonance) | Reduces thresholds for node unlocking |
| **Refinement Rate** | Wrist Nodes, Hand Nodes | Speed at which T1 quality improves |
| **Dao Insight Gain** | Anahata, Ajna, Sahasrara | How fast Dao comprehension advances |

## Combat Attributes

| Attribute | Source Nodes | Effect |
|-----------|-------------|--------|
| **Physical Power** | Manipura, Shoulder Nodes | Base physical skill damage |
| **Technique Power** | Wrist Nodes, Hand Nodes, Vishuddha | Dao skill damage and effectiveness |
| **Soul Power** | Anahata, Ajna | Soul-targeted damage and Shen-skill potency |
| **Physical Durability** | Muladhara, Bindu, Hip Nodes | HP maximum and physical damage reduction |
| **Soul Durability** | Anahata, Bindu | Soul HP maximum and soul damage reduction |
| **Mobility** | Knee Nodes, Ankle Nodes, Foot Nodes | Movement speed, dodge rate |
| **Grounding** | Muladhara, Hip Nodes, Foot Nodes | Resist stagger, stability under pressure |
| **Attack Speed** | Svadhisthana, Elbow Nodes | How fast skills activate |
| **Energy Recovery** | Svadhisthana, Throat Chakra | Regeneration of combat energy pool |
| **Critical Insight** | Ajna | Critical hit chance, weakness exploitation |

## Attribute Scaling Formula

```
FinalContribution = BaseValue × Resonance × RankMultiplier[rank] × LevelMultiplier[level]

RankMultiplier: [1.0, 2.0, 3.5, 6.0, 10.0, 16.0, 25.0, 38.0, 60.0]   (ranks 1–9)
LevelMultiplier: [1.0, 1.12, 1.26, 1.41, 1.58, 1.78, 2.0, 2.24, 2.51]  (levels 1–9)
```

---

# 9. NEBULOUS SYSTEMS (DESIGN INTENT)

*(Unchanged from v1.0 — reproduced below)*

## 9.1 The Dao

The Dao is the player's chosen cosmic truth — their philosophical and elemental path. Selected at Rank 2 via a "Moment of Stillness" narrative event. Irreversible (one reset at extreme cost).

### Dao Types

| Dao | Energy Affinity | Node Focus | Flavor |
|-----|----------------|-----------|--------|
| Dao of Earth | Jing, stability | Hip/Foot nodes | Immovable, enduring, slowly overwhelming |
| Dao of Fire | Yang Qi, destruction | Manipura, Shoulder, Hand | Explosive bursts, aggressive, volatile |
| Dao of Water | Qi, flow | Svadhisthana, meridians | Constant, adaptive, endless attrition |
| Dao of Wind | Yang Qi, speed | Ankle, Knee, Elbow | Evasion-based, rapid, unpredictable |
| Dao of Void | Shen, perception | Ajna, Sahasrara | Counter-based, insight, soul attacks |
| Dao of Life | Jing, Shen, restoration | Anahata, Bindu | Healing, recovery, resilience |
| Dao of Sword | Yang Qi, precision | Hand, Wrist, Elbow | Pure technique power, single-target mastery |
| Dao of Thunder | Yang Qi, Shen | Sahasrara, Shoulder | Mixed type, overwhelming power spikes |

Dao Nodes are phantom T2-equivalent nodes overlaid on the body map, unlocked via Dao Insights and specific energy types, providing skills rather than passive attributes.

## 9.2 Combat

Automated-but-directed. Player pre-configures a skill rotation and energy allocation. A separate combat energy pool (drawn from stored body energy at fight start) powers skill execution. Advanced enemies can target specific T2 nodes for damage.

### Skill Categories
- **Physical Skills:** Yang Qi primary; powered by Physical Power attribute
- **Technique Skills:** Ling/Shen primary; powered by Technique Power
- **Movement Skills:** Qi/Jing; powered by Mobility
- **Soul Skills:** Shen primary; targets enemy Soul HP
- **Passive Skills:** Always active; no cost

## 9.3 HP, Soul & Node Damage

**Two health bars:** Physical HP (body) and Soul HP (consciousness).

**Node Damage from combat:**
- At 30% HP: Roll for random node crack (50% base chance)
- At 10% HP: Roll for random node shatter (70% base chance)
- Cracked: Resonance capped at 50%, attributes halved
- Shattered: Node goes offline, treated as inactive
- Bindu's `D` node reserve can stabilize (prevent shatter) once per combat

**Repair:** Slow passive via Meridian Repair Rate. Active cultivation via Jing circulation through damaged node. Treasures for instant repair.

## 9.4 Treasures & Cultivation Aids

| Type | Effect |
|------|--------|
| Condensed Essence Pills | Fill X energy of one type into target node immediately |
| Refining Stones | +1 quality to one T1 node, bypassing refinement requirements |
| Meridian Salves | Add fixed amount to a meridian's Total Flow counter |
| Jing Deposits | Increase a meridian's jing_deposit directly |
| Dao Fragments | Provide Dao Insights |
| Recovery Elixirs | Restore Jing reserves, repair node damage |
| Formation Arrays | Passive energy generation at rest location |
| Cultivation Manuals | Unlock techniques (circulation types, threshold reductions) |

---

# 10. IMPLEMENTATION ORDER

## Phase 1 — Single Node, Single Energy

1. T1Node data model (energy, capacity, quality, state, connections)
2. T2Node wrapper (T1 cluster list, aggregate energy/capacity computation)
3. T1 internal diffusion tick (`α × ΔP × min(Q_a, Q_b) × Δt`)
4. Muladhara cluster only — implement the Square Seal topology (12 nodes, correct edges)
5. Qi passive generation (0.1 Qi/tick per active T1 node)
6. T1 state transitions based on fill threshold
7. T2 resonance calculation
8. Basic UI: cluster map with glow states, Qi bar, resonance meter

**Milestone:** Watch Muladhara's Square Seal fill up T1 node by T1 node, lighting from outside in.

---

## Phase 2 — I/O Nodes and First Meridian

1. Add `type` field to T1Node (IO_IN, IO_OUT, IO_BIDIR, INTERNAL)
2. Implement I/O port interface rate formula (`C × Q × β`)
3. Add Svadhisthana cluster (Lotus Hex topology)
4. Meridian data model (W, Pur, TF, state, io_node_out, io_node_in)
5. Single meridian ROOT → SACRAL with canonical direction
6. Passive flow formula (`W × ΔP_local × Pur × TypeMod × Δt`)
7. Energy lost to scatter on transit
8. TF accumulation and Width evolution (continuous formula)
9. Purity evolution (flow component only; Jing structural later)
10. FlowBonus applied to both endpoint maxEnergy
11. Hip nodes (L + R) — Arch-and-Chain topology

**Milestone:** Unlock Sacral by filling Root. Watch energy cross the meridian (visually). See max capacity grow as TF accumulates.

---

## Phase 3 — Multiple Nodes, Leveling, Attributes

1. Add Manipura (Ten-Spoke Wheel), both Shoulder nodes (Ladder topology)
2. T2 Node leveling system (requirements: energy stored, TF through node, min meridian quality)
3. Level-up UI with progress breakdown
4. T1 quality refinement system (throughput counter per T1 node)
5. Cultivation attribute system — compute from resonance × rank × level
6. Attribute display panel (cultivation attributes only)
7. Knee nodes (Bent Reed topology), Elbow nodes (Forked Branch topology)
8. Save/load system

---

## Phase 4 — Active Circulation and Manual Routes

1. Route definition UI (click T2 nodes in sequence; validate closed directed cycle)
2. Route validation (check each consecutive pair has a same-direction meridian)
3. Active flow formula (`W × PumpMod × Pur × TypeMod × Δt`)
4. Loop efficiency factor based on node count
5. TF increase during active vs. passive circulation (active is LoopEfficiency× faster)
6. Jing energy type — add to T1 generation model (Hip/Foot nodes)
7. Jing structural deposit (jing_deposit accumulation on meridians during Jing flow)
8. Purity structural component from jing_deposit
9. Jing unlock discount (1.25× Node Unlock Weight)

**Milestone:** Set up first active loop (ROOT → SACRAL → ROOT impossible yet; first valid loop is ROOT → SACRAL → L.HIP → ROOT). Watch all three meridians train simultaneously. See loop efficiency number displayed.

---

## Phase 5 — Reverse Meridians and 2-Node Loop

1. Implement "reverse meridian opening" mechanic (30-second high-pump action)
2. Cost formula for reverse opening
3. Double meridian data (store two Meridian objects per connection)
4. Update route validation to allow 2-node loops when double meridian exists
5. ROOT ↔ SACRAL first reverse open as tutorial-guided event

**Milestone:** Player opens the first reverse meridian. Sets up first 2-node loop. Sees the 0.6× efficiency note but can now train both meridians simultaneously.

---

## Phase 6 — Yang Qi, Heat System, Full Chakra Chain

1. Yang Qi energy type — Manipura conversion mechanic (Refining Pulse technique)
2. Heat generation, dissipation, and threshold effects
3. Heat UI (body temperature indicator)
4. Type Modifier Matrix implementation (all TypeMod fields)
5. Multi-type flow in meridians (priority queue, per-type flow rates)
6. Add remaining chakra nodes: Anahata (Star of Two Triangles), Vishuddha (Sixteen-Spoke), Ajna (Yin-Yang Dyad), Sahasrara (Fractal Crown), Bindu (Crescent-Dot)
7. Remaining joint nodes: Wrist (Cross-Gate), Hand (Open Palm), Ankle (Figure-Eight), Foot (Ground Arch) + Right-side mirrors
8. Terminal node handling (Hand/Foot cannot be loop waypoints)
9. Foot SOLE passive Earth Qi absorption

---

## Phase 7 — Shen, Type Affinity, Full Math

1. Shen energy type — passive generation from Anahata/Ajna above 50% resonance
2. Shen scatter deposit (permanent purity bonus from Shen loss)
3. Type affinity development on meridians (60% lifetime dominance threshold)
4. Affinity bonus/penalty modifiers on attuned/non-attuned types
5. Resonance weight for Shen (3.0× per stored unit)
6. Per-type soft capacity caps and overflow pressure
7. Ajna lobe balance check (lobe asymmetry penalty on Critical Insight attribute)

---

## Phase 8 — Great Circulation and Rank Breakthroughs

1. Great Circulation unlock condition (all 24 nodes active, all canonical meridians DEVELOPED)
2. Great Circulation bonuses and heat multiplier
3. Rank advancement breakthrough system (conditions, costs, event animation)
4. All 9 rank multipliers and level multipliers in attribute formula
5. Sahasrara Realm Cap Lift attribute (raises max rank for other nodes)

---

## Phase 9 — Dao, Combat, Treasures

1. Dao selection event (Moment of Stillness)
2. Dao Node overlay system
3. Dao Insight resource
4. Basic skill system (2–3 skills per Dao)
5. Combat energy pool
6. Automated combat execution
7. HP and Soul HP bars
8. Node damage system (crack/shatter, Bindu stabilization)
9. Treasure drop system
10. Inventory and item use

---

## Phase 10 — Polish and Balance

1. Full topology render polish (glow states, flow animations through meridians)
2. Tutorial and onboarding (see Section 11)
3. Balance pass on all numerical constants
4. Node damage repair mechanics
5. Late-game content (Ranks 6–9, full Dao skill sets)

---

# 11. PLAYER INTRODUCTION ORDER (ONBOARDING ARC)

## Tutorial Chapter 1 — "The First Spark" (Minutes 0–15)

**Shown:** Only Muladhara's Square Seal cluster. A minimal UI shows one bar: Qi.

1. Qi passively generates. The outer four petals `P_N, P_W, P_E, P_S` are the first T1 nodes to begin filling. Text: *"Something stirs within. A warmth at your center."*
2. First petal T1 node reaches ACTIVE threshold — highlighted. Brief tooltip: *"A T1 node awakens. The smallest unit of cultivation."*
3. Square corner nodes begin unlocking as petals fill. The player sees the graph connectivity.
4. Goal appears: *"Bring four nodes to ACTIVE state."*
5. First resonance percentage appears in the UI. The square seal symbol brightens.

**By end of Chapter 1:** Player understands T1 states, that topology determines unlock order, and that resonance is the measure of a node's vitality.

---

## Tutorial Chapter 2 — "The First Channel" (Minutes 15–45)

1. The game reveals Svadhisthana's silhouette above Root. Unlock condition panel appears.
2. Muladhara reaches a level — prompt: *"Energy seeks a path upward. Develop the channel."*
3. The `P_N` I/O node in Muladhara's cluster is highlighted: *"This is the port. Energy enters and exits only here."*
4. Player meets unlock conditions; Svadhisthana enters SEALING state. First meridian glows into existence.
5. Energy flows across the meridian. Purity loss tutorial: player sees 10 units sent, 6 arrive. *"The channel is new and rough. It loses energy. Use will smooth it."*
6. TF counter appears on the meridian. FlowBonus tooltip: *"As you use this channel, your capacity grows."*

**By end of Chapter 2:** Player understands I/O nodes, meridian loss, and that use improves channels.

---

## Tutorial Chapter 3 — "The First Loop" (Minutes 45–120)

1. Hip nodes unlock. Belt vessel meridians appear (Sacral → L.Hip, Sacral → R.Hip, Root → L.Hip).
2. Route definition UI introduced. Player draws: ROOT → SACRAL → L.HIP → ROOT. *"A closed path. Energy circulates. The channels train together."*
3. Player sees Loop Efficiency (0.66×) and LoopBottleneck displayed. *"The weakest link sets the pace."*
4. After the loop runs for a minute, a meridian upgrades from NASCENT to DEVELOPED. Capacity visibly increases.
5. Jing appears for the first time (Hip node generates it). New bar. *"Jing — essence of the body. Dense. Slow. Essential."*
6. Jing Unlock Discount tooltip shown when a new node enters SEALING.

**By end of Chapter 3:** Player understands loops, bottlenecks, multiple energy types, and Jing's structural role.

---

## Chapter 4 — "The Body Takes Shape" (Hours 1–3)

- Manipura unlocks. Yang Qi refining introduced. Heat bar appears.
- Shoulder nodes and arm chain appear. Player sees Anahata (Heart) as an upcoming target — the four-connection hub.
- Node leveling requirements appear. Player discovers that Meridian Quality (W × Pur) is now tracked.
- First cultivation attributes become meaningful (Circulation Speed from Svadhisthana shows numeric change).

---

## Chapter 5 — "Spirit and Perception" (Hours 3–8)

- Anahata unlocks. Shen appears — a tiny, precious new bar.
- Player is warned: *"Shen cannot be forced. It arises from harmony."*
- Ajna unlock chain starts. Yin-Yang Dyad topology introduced — player immediately notices the lobe balance mechanic when one lobe fills faster.
- Full attribute panel shown. Combat attributes grayed out with hint.
- First reverse meridian opening tutorialized (Root ↔ Sacral).

---

## Chapter 6 — "First Blood" (Hours 6–12)

- First combat (optional → mandatory). Automated combat introduced.
- Combat attributes revealed as active and meaningful.
- First treasure drops. Inventory introduced.
- Node damage introduced through scripted difficult encounter. Anahata or Manipura cracks — player feels the attribute loss immediately.
- Bindu unlockable as a response to node damage.

---

## Chapter 7 — "The Body Complete" (Hours 12–25)

- All 24 nodes available as unlock targets. The full body map visible in silhouette.
- Dao selection event triggers. Player chooses their path. Dao Nodes appear as overlay.
- Great Circulation becomes achievable. Big UI moment when it unlocks.
- First rank breakthrough. Dramatic event, all T1 nodes gain +1 quality.

---

## Chapter 8 — "The Infinite Path" (Hours 25+)

- Ranks 3–9 content opens. Sahasrara's Realm Cap attribute becomes critical.
- Bindu's `D` node stabilization mechanic introduces itself through a high-stakes combat.
- Late-game loop: combat drops treasures → treasures boost nodes/meridians → better cultivation → access to harder combat.
- True endgame: Great Circulation + full Dao comprehension + Rank 9 pursuit.

---

# 12. PROPOSED ADDITIONAL SYSTEMS

*(Unchanged from v1.0 — reproduced for completeness)*

## 12.1 Celestial Body Map
Each T2 node corresponds to a celestial object. Alignment influences cultivation rates, creating daily/seasonal rituals.

## 12.2 Dual Cultivation / Companion System
A second character performs synchronized circulation. Shared routes gain Resonance Harmony bonus. Cross-body meridians openable in very late game.

## 12.3 Realm Tribulation Events
Forced high-intensity events at each rank breakthrough. Failure delays advancement and damages a node; success grants permanent bonus.

## 12.4 Alchemy and Pill Formation
Crafting system where pill quality scales with the player's cultivation state at time of brewing. Becomes primary economy.

## 12.5 Node Network Visualization (Galaxy Mode)
Zoomed-out "star map" rendering of the full body — T2 nodes as stars, meridians as light-lines, brightness = resonance, thickness = width. No new mechanics; just a stunning alternative view.

## 12.6 Sect and Elder System
High-realm NPC mentors teachable only when specific cultivation achievements are demonstrated. Sects provide formation arrays for the player's rest location.

## 12.7 Body Tempering (Parallel Track)
Physical training separate from Qi cultivation. Improves HP, Physical Power attributes, and Jing generation rate. For players who enjoy active training loops.

## 12.8 Insight Library (Codex of Dao)
Collectible system — major cultivation events, enemies defeated, and treasures found add codex entries. Each entry gives a small permanent insight bonus to a relevant attribute.

## 12.9 Meridian Scars
Overloading a meridian (forcing flow far above W capacity) leaves a permanent purity penalty — a "scar" requiring rare treasure or massive Shen investment to heal. Creates a real risk for aggressive cultivation.

## 12.10 Phantom Nodes (Dao Manifestation)
At Rank 7+, Dao essence manifests as phantom T2 nodes outside the body. "Planted" at specific world locations to generate energy remotely and provide area-based bonuses.

## 12.11 T1 Connection Unlocking (New Proposal)
Currently, internal T1 connections are fixed. A new system could allow the player to permanently open *new* connections within a cluster — essentially reshaping the internal topology over time using rare treasures (Structure Catalysts). This would let dedicated players move from the stock topology toward a customized graph. Caps: maximum 2 new connections per cluster; cannot create connections that violate the cluster's physical space.

## 12.12 Meridian Resonance Harmonics (New Proposal)
When two meridians sharing a T2 node endpoint reach identical Quality within 0.5 of each other, they enter a "harmonic resonance" state. While in resonance, both meridians gain +15% width temporarily and generate a small ambient Shen pulse every 60 seconds. This rewards players who develop their network in a balanced, symmetric way — and provides a concrete mechanical incentive for keeping both arms or both legs at similar cultivation levels.

---

*End of Document — Version 2.0*

*Key changes from v1.0:*
- *T1 I/O port architecture fully specified (Section 2.1)*
- *T1 internal diffusion math added*
- *All 24 T2 node topologies designed (Section 2.3)*
- *Body topology map with full adjacency list (Section 3)*
- *Meridian directionality: unidirectional channels, doubled for bidirectional (Section 4.1)*
- *Two-node circulation: possible with double meridian, 0.6× efficiency (Section 4.2)*
- *Complete meridian math: Width(TF), Purity(TF), Quality, FlowBonus (Section 4.3)*
- *Full energy type modifier matrix with per-property values (Section 5.2)*
- *Heat system fully specified (Section 5.2)*
- *Shen scatter deposit mechanic (Section 5.2)*
- *Jing structural deposit mechanic (Section 5.2)*
- *Reverse meridian opening requirements and cost formula (Section 6.4)*
- *Circulation loop efficiency formula (Section 7)*
- *Two new Additional System proposals (12.11, 12.12)*
