## Tasks Requiring Changes In Current Code

- **TASK-176** Create `ClusterView` canvas component.  
  Current code renders a Tier-1 cluster view, but it is not organized as a dedicated `ClusterView` component and does not fully align with the specified topology-driven component structure.

- **TASK-178** Render T1 edges as directed arrows.  
  Current edge rendering shows flow intensity and labels, but not explicit directed arrows with the requested particle semantics per task wording.

- **TASK-180** Render IO node badges.  
  Current node rendering does not expose explicit IO_IN / IO_OUT / IO_BIDIR badges with per-tick direction color behavior.

- **TASK-182** Implement T1 node tooltip on hover with full data payload.  
  Current popup is click-driven and includes partial stats, but does not match the exact hover behavior and complete data contract from the task.

- **TASK-183** Render cluster T2 header with full required fields.  
  Current UI has side/top panels and popup details, but not the exact cluster header contract (name, state badge, rank/level, resonance bar, pressure bar, total energy/capacity) in the requested form.

- **TASK-186** Render meridians on body map with width/opacity/affinity mapping and canonical-direction particle animation.  
  Current body map/edge visuals exist, but do not yet fully implement the specified meridian styling and directionality contract.

- **TASK-192** Create global energy HUD with four colored bars and trend arrows.  
  Current top HUD exists, but it currently shows ticks/core values and not the required four energy bars with generation and trend indicators.
