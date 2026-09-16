import type { Face, Fill, FillNotice, Point, Segment, Symmetry } from "../../types/drawing";
import { edgeKey, pointKey } from "./geometry";
import { transformedPoints } from "./symmetry";

const EPSILON = 1e-8;

const faceKey = (polygon: Point[]) => polygon.map(pointKey).sort().join("|");

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

function regionContains(point: Point, polygon: Point[], holes: Point[][]) {
  return pointInPolygon(point, polygon) && !holes.some(hole => pointInPolygon(point, hole));
}

function interiorPoint(polygon: Point[]): Point | null {
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length < EPSILON) continue;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const nx = -dy / length, ny = dx / length;
    for (const offset of [1e-4, 1e-5, 1e-3, 1e-2, 0.05]) {
      const probe = { x: mx + nx * offset, y: my + ny * offset };
      if (pointInPolygon(probe, polygon)) return probe;
    }
  }
  const centroid = {
    x: polygon.reduce((sum, p) => sum + p.x, 0) / polygon.length,
    y: polygon.reduce((sum, p) => sum + p.y, 0) / polygon.length,
  };
  return pointInPolygon(centroid, polygon) ? centroid : null;
}

const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;
const cleanPoint = (p: Point): Point => ({ x: Number(p.x.toFixed(8)), y: Number(p.y.toFixed(8)) });

function createWelder() {
  const points: Point[] = [];
  return (p: Point): Point => {
    const found = points.find(q => Math.hypot(q.x - p.x, q.y - p.y) < EPSILON);
    if (found) return found;
    const cleaned = cleanPoint(p);
    points.push(cleaned);
    return cleaned;
  };
}

function splitAtIntersections(segments: Segment[]) {
  const cuts = segments.map(() => new Set([0, 1]));
  const parameter = (point: Point, segment: Segment) => {
    const dx = segment.b.x - segment.a.x, dy = segment.b.y - segment.a.y;
    return Math.abs(dx) >= Math.abs(dy) ? (point.x - segment.a.x) / dx : (point.y - segment.a.y) / dy;
  };
  const onSegment = (point: Point, segment: Segment) => {
    const r = { x: segment.b.x - segment.a.x, y: segment.b.y - segment.a.y };
    const q = { x: point.x - segment.a.x, y: point.y - segment.a.y };
    const t = parameter(point, segment);
    return Math.abs(cross(r, q)) < EPSILON && t > -EPSILON && t < 1 + EPSILON;
  };
  for (let i = 0; i < segments.length; i++) for (let j = i + 1; j < segments.length; j++) {
    const a = segments[i], b = segments[j];
    const r = { x: a.b.x - a.a.x, y: a.b.y - a.a.y };
    const s = { x: b.b.x - b.a.x, y: b.b.y - b.a.y };
    const qp = { x: b.a.x - a.a.x, y: b.a.y - a.a.y };
    const den = cross(r, s);
    if (Math.abs(den) > EPSILON) {
      const t = cross(qp, s) / den, u = cross(qp, r) / den;
      if (t > -EPSILON && t < 1 + EPSILON && u > -EPSILON && u < 1 + EPSILON) {
        cuts[i].add(Math.max(0, Math.min(1, t)));
        cuts[j].add(Math.max(0, Math.min(1, u)));
      }
    } else if (Math.abs(cross(qp, r)) < EPSILON) {
      for (const point of [b.a, b.b]) if (onSegment(point, a)) cuts[i].add(Math.max(0, Math.min(1, parameter(point, a))));
      for (const point of [a.a, a.b]) if (onSegment(point, b)) cuts[j].add(Math.max(0, Math.min(1, parameter(point, b))));
    }
  }
  const weld = createWelder();
  const atomic = new Map<string, { a: Point; b: Point; groups: Set<string> }>();
  segments.forEach((segment, i) => {
    const values = [...cuts[i]].sort((a, b) => a - b);
    for (let k = 0; k < values.length - 1; k++) {
      const t1 = values[k], t2 = values[k + 1];
      if (t2 - t1 < EPSILON) continue;
      const at = (t: number) => weld({ x: segment.a.x + (segment.b.x - segment.a.x) * t, y: segment.a.y + (segment.b.y - segment.a.y) * t });
      const a = at(t1), b = at(t2);
      if (pointKey(a) === pointKey(b)) continue;
      const key = edgeKey(a, b), found = atomic.get(key);
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
  const interiors = faces.map(face => interiorPoint(face.polygon));
  const children = new Map<number, number[]>();
  faces.forEach((child, childIndex) => {
    const probe = interiors[childIndex];
    if (!probe) return;
    let parent = -1, parentArea = Infinity;
    faces.forEach((candidate, candidateIndex) => {
      if (candidateIndex !== childIndex && candidate.area > child.area && candidate.area < parentArea && pointInPolygon(probe, candidate.polygon)) {
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

function faceAt(point: Point, faces: Face[]) {
  return faces
    .filter(face => regionContains(point, face.polygon, face.holes))
    .sort((a, b) => a.area - b.area)[0] ?? null;
}

function fillFromFace(face: Face, color: string, index: number): Fill {
  return {
    id: `fill-${Date.now()}-${index}`,
    polygon: face.polygon,
    holes: face.holes,
    color,
    boundaryGroups: face.boundaryGroups,
  };
}

function replaceFillsForFaces(existing: Fill[], found: Face[], color: string): Fill[] {
  const keys = new Set(found.map(face => faceKey(face.polygon)));
  return [
    ...existing.filter(fill => !keys.has(faceKey(fill.polygon))),
    ...found.map((face, i) => fillFromFace(face, color, i)),
  ];
}

function smallestFillContaining(point: Point, fills: Fill[]) {
  return fills
    .filter(fill => regionContains(point, fill.polygon, fill.holes))
    .sort((a, b) => Math.abs(polygonArea(a.polygon)) - Math.abs(polygonArea(b.polygon)))[0] ?? null;
}

export function applyFill(point: Point, fills: Fill[], segments: Segment[], color: string, symmetry: Symmetry): { fills: Fill[]; notice: FillNotice } {
  const faces = buildFaces(segments);
  const found: Face[] = [];
  for (const target of transformedPoints(point, symmetry)) {
    const face = faceAt(target, faces);
    if (face && !found.some(item => faceKey(item.polygon) === faceKey(face.polygon))) found.push(face);
  }
  if (found.length === 0) return { fills, notice: "open" };
  return { fills: replaceFillsForFaces(fills, found, color), notice: "filled" };
}

export function syncFills(fills: Fill[], segments: Segment[]): Fill[] {
  if (fills.length === 0) return [];
  const faces = buildFaces(segments);
  const matches = faces.map(face => {
    const interior = interiorPoint(face.polygon);
    return { face, fill: interior ? smallestFillContaining(interior, fills) : null };
  });
  const parentByChild = new Map<Face, Face>();
  for (const parent of faces) {
    for (const hole of parent.holes) {
      const child = faces.find(face => faceKey(face.polygon) === faceKey(hole));
      if (child) parentByChild.set(child, parent);
    }
  }
  return matches.flatMap(({ face, fill }, index) => {
    if (!fill) return [];
    const parent = parentByChild.get(face);
    if (parent && matches.find(item => item.face === parent)?.fill === fill) return [];
    return [fillFromFace(face, fill.color, index)];
  });
}
