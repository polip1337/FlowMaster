import { describe, expect, it } from "vitest";
import { createT2Cluster } from "../../../src/core/nodes/clusterFactory";
import { muladharaTopology } from "../../../src/data/topologies/muladhara";
import { T1NodeState } from "../../../src/core/nodes/T1Types";

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
});
