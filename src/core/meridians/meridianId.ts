/**
 * S-022 — Central meridian id format (avoids ad-hoc arrow strings colliding with node ids).
 */

export function makeMeridianId(fromNodeId: string, toNodeId: string): string {
  return `${fromNodeId}::${toNodeId}`;
}

export function parseForwardId(id: string): [string, string] {
  const idx = id.indexOf("::");
  if (idx === -1) {
    throw new Error(`Invalid meridian id (expected "::" separator): ${id}`);
  }
  return [id.slice(0, idx), id.slice(idx + 2)];
}
