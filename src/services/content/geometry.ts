import type { Face, Fill, PixelPoint, Point, Segment } from "../../types/drawing";

export function distanceToSegment(p: PixelPoint, a: PixelPoint, b: PixelPoint) {
  const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export const pointKey = (p: Point) => `${p.x},${p.y}`;
export const edgeKey = (a: Point, b: Point) => [pointKey(a), pointKey(b)].sort().join("|");
export const faceKey = (polygon: Point[]) => polygon.map(pointKey).sort().join("|");

const polygonArea = (polygon: Point[]) => polygon.reduce((sum, p, i) => {
  const q = polygon[(i + 1) % polygon.length];
  return sum + p.x * q.y - q.x * p.y;
}, 0) / 2;

function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if (((a.y > point.y) !== (b.y > point.y)) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;
const cleanPoint = (p: Point): Point => ({ x: Number(p.x.toFixed(8)), y: Number(p.y.toFixed(8)) });

function splitAtIntersections(segments: Segment[]) {
  const cuts = segments.map(() => new Set([0, 1])), epsilon = 1e-8;
  const parameter = (point: Point, segment: Segment) => {
    const dx = segment.b.x - segment.a.x, dy = segment.b.y - segment.a.y;
    return Math.abs(dx) >= Math.abs(dy) ? (point.x - segment.a.x) / dx : (point.y - segment.a.y) / dy;
  };
  const onSegment = (point: Point, segment: Segment) => {
    const r = { x: segment.b.x - segment.a.x, y: segment.b.y - segment.a.y };
    const q = { x: point.x - segment.a.x, y: point.y - segment.a.y };
    const t = parameter(point, segment);
    return Math.abs(cross(r, q)) < epsilon && t > -epsilon && t < 1 + epsilon;
  };
  for (let i = 0; i < segments.length; i++) for (let j = i + 1; j < segments.length; j++) {
    const a = segments[i], b = segments[j];
    const r = { x: a.b.x - a.a.x, y: a.b.y - a.a.y };
    const s = { x: b.b.x - b.a.x, y: b.b.y - b.a.y };
    const qp = { x: b.a.x - a.a.x, y: b.a.y - a.a.y };
    const den = cross(r, s);
    if (Math.abs(den) > epsilon) {
      const t = cross(qp, s) / den, u = cross(qp, r) / den;
      if (t > -epsilon && t < 1 + epsilon && u > -epsilon && u < 1 + epsilon) {
        cuts[i].add(Math.max(0, Math.min(1, t)));
        cuts[j].add(Math.max(0, Math.min(1, u)));
      }
    } else if (Math.abs(cross(qp, r)) < epsilon) {
      for (const point of [b.a, b.b]) if (onSegment(point, a)) cuts[i].add(Math.max(0, Math.min(1, parameter(point, a))));
      for (const point of [a.a, a.b]) if (onSegment(point, b)) cuts[j].add(Math.max(0, Math.min(1, parameter(point, b))));
    }
  }
  const atomic = new Map<string, { a: Point; b: Point; groups: Set<string> }>();
  segments.forEach((segment, i) => {
    const values = [...cuts[i]].sort((a, b) => a - b);
    for (let k = 0; k < values.length - 1; k++) {
      const t1 = values[k], t2 = values[k + 1];
      if (t2 - t1 < epsilon) continue;
      const at = (t: number) => cleanPoint({ x: segment.a.x + (segment.b.x - segment.a.x) * t, y: segment.a.y + (segment.b.y - segment.a.y) * t });
      const a = at(t1), b = at(t2), key = edgeKey(a, b), found = atomic.get(key);
      if (found) found.groups.add(segment.groupId);
      else atomic.set(key, { a, b, groups: new Set([segment.groupId]) });
    }
  });
  return atomic;
}

export function buildFaces(segments: Segment[]): Face[] {
  const nodes = new Map<string, Point>(), edges = splitAtIntersections(segments);
  edges.forEach(edge => { nodes.set(pointKey(edge.a), edge.a); nodes.set(pointKey(edge.b), edge.b); });
  const adjacency = new Map<string, { to: string; angle: number }[]>();
  const add = (from: Point, to: Point) => {
    const key = pointKey(from), list = adjacency.get(key) ?? [];
    if (!list.some(n => n.to === pointKey(to))) list.push({ to: pointKey(to), angle: Math.atan2(to.y - from.y, to.x - from.x) });
    adjacency.set(key, list);
  };
  edges.forEach(e => { add(e.a, e.b); add(e.b, e.a); });
  adjacency.forEach(list => list.sort((a, b) => a.angle - b.angle));
  const visited = new Set<string>(), faces: Face[] = [], limit = edges.size * 2 + 4;
  for (const [startU, list] of adjacency) {
    for (const first of list) {
      const startV = first.to;
      if (visited.has(`${startU}>${startV}`)) continue;
      let u = startU, v = startV, steps = 0, closed = false;
      const polygon: Point[] = [], groups = new Set<string>();
      do {
        visited.add(`${u}>${v}`);
        polygon.push(nodes.get(u)!);
        const edge = edges.get([u, v].sort().join("|"));
        edge?.groups.forEach(g => groups.add(g));
        const around = adjacency.get(v);
        if (!around?.length) break;
        const incoming = around.findIndex(n => n.to === u);
        if (incoming < 0) break;
        const next = around[(incoming - 1 + around.length) % around.length].to;
        u = v;
        v = next;
        steps++;
        closed = u === startU && v === startV;
      } while (!closed && steps < limit);
      if (closed && polygon.length >= 3) {
        const area = polygonArea(polygon);
        if (area > 1e-6) faces.push({ polygon, holes: [], boundaryGroups: [...groups], area });
      }
    }
  }
  const children = new Map<number, number[]>();
  faces.forEach((child, childIndex) => {
    let parent = -1, parentArea = Infinity;
    faces.forEach((candidate, candidateIndex) => {
      if (candidateIndex !== childIndex && candidate.area > child.area && candidate.area < parentArea && pointInPolygon(child.polygon[0], candidate.polygon)) {
        parent = candidateIndex;
        parentArea = candidate.area;
      }
    });
    if (parent >= 0) children.set(parent, [...(children.get(parent) ?? []), childIndex]);
  });
  return faces.map((face, index) => {
    const childFaces = (children.get(index) ?? []).map(childIndex => faces[childIndex]);
    const groups = new Set(face.boundaryGroups);
    childFaces.forEach(child => child.boundaryGroups.forEach(group => groups.add(group)));
    return { ...face, holes: childFaces.map(child => child.polygon), boundaryGroups: [...groups] };
  });
}

export function faceAt(point: Point, faces: Face[]) {
  return faces
    .filter(face => pointInPolygon(point, face.polygon) && !face.holes.some(hole => pointInPolygon(point, hole)))
    .sort((a, b) => a.area - b.area)[0] ?? null;
}

export function replaceFillsForFaces(existing: Fill[], found: Face[], color: string): Fill[] {
  const keys = new Set(found.map(face => faceKey(face.polygon)));
  return [
    ...existing.filter(fill => !keys.has(faceKey(fill.polygon))),
    ...found.map((face, i) => ({
      id: `fill-${Date.now()}-${i}`,
      polygon: face.polygon,
      holes: face.holes,
      color,
      boundaryGroups: face.boundaryGroups,
    })),
  ];
}
