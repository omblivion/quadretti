import { GRID, HIT_TOLERANCE_PX } from "../../constants/drawing";
import type { CanvasSize, PixelPoint, Point, Segment } from "../../types/drawing";
import { distanceToSegment } from "../content/geometry";

export function toCanvas(p: Point, size: CanvasSize, zoom: number): PixelPoint {
  return { x: size.w / 2 + p.x * GRID * zoom, y: size.h / 2 + p.y * GRID * zoom };
}

export function eventPixel(e: { clientX: number; clientY: number; currentTarget: { getBoundingClientRect(): DOMRect } }): PixelPoint {
  const r = e.currentTarget.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

export function pointFromPixel(p: PixelPoint, size: CanvasSize, zoom: number): Point {
  return { x: Math.round((p.x - size.w / 2) / (GRID * zoom)), y: Math.round((p.y - size.h / 2) / (GRID * zoom)) };
}

export function logicalFromPixel(p: PixelPoint, size: CanvasSize, zoom: number): Point {
  return { x: (p.x - size.w / 2) / (GRID * zoom), y: (p.y - size.h / 2) / (GRID * zoom) };
}

export function hitTest(p: PixelPoint, segments: Segment[], size: CanvasSize, zoom: number): string | null {
  let best: { groupId: string; distance: number } | null = null;
  for (const s of segments) {
    const d = distanceToSegment(p, toCanvas(s.a, size, zoom), toCanvas(s.b, size, zoom));
    if (d <= HIT_TOLERANCE_PX && (!best || d < best.distance)) best = { groupId: s.groupId, distance: d };
  }
  return best?.groupId ?? null;
}
