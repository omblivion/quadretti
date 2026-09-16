import type { Point, Symmetry } from "../../types/drawing";
import { edgeKey } from "./geometry";

export function transformedPoints(p: Point, symmetry: Symmetry): Point[] {
  const points = symmetry === 1 ? [p] : symmetry === 2 ? [p, { x: -p.x, y: p.y }] : [p, { x: -p.x, y: p.y }, { x: p.x, y: -p.y }, { x: -p.x, y: -p.y }];
  return points.filter((v, i, all) => all.findIndex(q => q.x === v.x && q.y === v.y) === i);
}

export function transformedSegments(a: Point, b: Point, symmetry: Symmetry) {
  const operations = ((p: Point) => p);
  const transforms = [operations, ...(symmetry >= 2 ? [(p: Point) => ({ x: -p.x, y: p.y })] : []), ...(symmetry === 4 ? [(p: Point) => ({ x: p.x, y: -p.y }), (p: Point) => ({ x: -p.x, y: -p.y })] : [])];
  const pairs = transforms.map(transform => ({ a: transform(a), b: transform(b) }));
  return pairs.filter((pair, i, all) => all.findIndex(other => edgeKey(other.a, other.b) === edgeKey(pair.a, pair.b)) === i);
}
