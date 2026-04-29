import { describe, expect, it } from "vitest";
import { createT2Cluster } from "../../../src/core/nodes/clusterFactory";
import { muladharaTopology } from "../../../src/data/topologies/muladhara";
import { svadhisthanaTopology } from "../../../src/data/topologies/svadhisthana";
import { T1NodeState } from "../../../src/core/nodes/T1Types";
import { T1NodeType } from "../../../src/core/nodes/T1Types";
import { updateT1States } from "../../../src/core/nodes/t1Logic";
import { EnergyType } from "../../../src/core/energy/EnergyType";

describe("createT2Cluster", () => {
  it("Muladhara: 12 nodes, source UNSEALED, others LOCKED", () => {
    const { nodes, edges, latentT1NodeIds } = createT2Cluster(muladharaTopology, "MULADHARA");

    expect(nodes.size).toBe(12);
    expect(nodes.get(0)?.state).toBe(T1NodeState.UNSEALED);
    expect(nodes.get(0)?.isSourceNode).toBe(true);
    for (const [id, node] of nodes) {
      if (id !== 0) {
        expect(node.state).toBe(T1NodeState.LOCKED);
      }
    }
    expect(latentT1NodeIds).toEqual([3]);
    expect(edges.size).toBe(36);
  });

  it("center node C(11) has resonanceMultiplier 2", () => {
    const { nodes } = createT2Cluster(muladharaTopology, "MULADHARA");
    expect(nodes.get(11)?.resonanceMultiplier).toBe(2);
  });

  it("I/O nodes get meridianSlotId from meridianIoMap", () => {
    const { nodes } = createT2Cluster(muladharaTopology, "MULADHARA");
    expect(nodes.get(0)?.meridianSlotId).toBe("SACRAL");
    expect(nodes.get(1)?.meridianSlotId).toBe("L_HIP");
    expect(nodes.get(2)?.meridianSlotId).toBe("R_HIP");
  });

  it("Svadhisthana: unlockDepth/predecessors follow IO distance", () => {
    const { nodes } = createT2Cluster(svadhisthanaTopology, "SVADHISTHANA");

    const ioNodes = [...nodes.values()].filter((n) => n.type === T1NodeType.IO_BIDIR);
    expect(ioNodes.length).toBeGreaterThan(0);

    // All I/O nodes are distance 0.
    for (const io of ioNodes) {
      expect(io.unlockDepth).toBe(0);
      expect(io.predecessorIds).toEqual([]);
    }

    // Every other node has exactly one predecessor from the previous distance layer.
    for (const node of nodes.values()) {
      if (node.type === T1NodeType.IO_BIDIR) continue;
      expect(node.unlockDepth).toBeGreaterThan(0);
      expect(node.predecessorIds).toHaveLength(1);
      const pred = nodes.get(node.predecessorIds[0]);
      expect(pred).toBeTruthy();
      expect(pred!.unlockDepth).toBe(node.unlockDepth - 1);
    }
  });

  it("IO nodes can UNSEAL from energy seed (no active predecessors)", () => {
    const { nodes } = createT2Cluster(svadhisthanaTopology, "SVADHISTHANA");
    const io = [...nodes.values()].find((n) => n.type === T1NodeType.IO_BIDIR) ?? null;
    expect(io).toBeTruthy();
    if (!io) return;

    expect(io.state).toBe(T1NodeState.LOCKED);
    // Below UNSEALED→ACTIVE threshold (capacity * 0.3), but above IO seed threshold (capacity * 0.1).
    io.energy[EnergyType.Qi] = io.capacity * 0.2;

    const events = updateT1States(nodes);
    expect(events.some((e) => e.nodeId === io.id && e.to === T1NodeState.UNSEALED)).toBe(true);
    expect(io.state).toBe(T1NodeState.UNSEALED);
  });
});
