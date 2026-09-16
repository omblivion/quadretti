import type { PixelPoint, Point } from "../../types/drawing";

export function distanceToSegment(p: PixelPoint, a: PixelPoint, b: PixelPoint) {
  const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export const pointKey = (p: Point) => `${p.x},${p.y}`;
export const edgeKey = (a: Point, b: Point) => [pointKey(a), pointKey(b)].sort().join("|");
