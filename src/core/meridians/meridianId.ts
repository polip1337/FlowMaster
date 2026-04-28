/**
 * S-022 — Central meridian id format (avoids ad-hoc arrow strings colliding with node ids).
 */

export function makeMeridianId(fromNodeId: string, toNodeId: string): string {
  return `${fromNodeId}::${toNodeId}`;
}

export function parseForwardId(id: string): [string, string] {
  const canonicalIdx = id.indexOf("::");
  if (canonicalIdx !== -1) {
    return [id.slice(0, canonicalIdx), id.slice(canonicalIdx + 2)];
  }
  const legacyIdx = id.indexOf("->");
  if (legacyIdx !== -1) {
    return [id.slice(0, legacyIdx), id.slice(legacyIdx + 2)];
  }
  throw new Error(`Invalid meridian id (expected "::" or "->" separator): ${id}`);
}
