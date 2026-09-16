import { GRID, HIT_TOLERANCE_PX } from "../../constants/drawing";
import type { CanvasSize, PanOffset, PixelPoint, Point, Segment } from "../../types/drawing";
import { distanceToSegment } from "../content/geometry";

export const ZERO_PAN: PanOffset = { x: 0, y: 0 };

export function originPixel(size: CanvasSize, pan: PanOffset = ZERO_PAN): PixelPoint {
  return { x: size.w / 2 + pan.x, y: size.h / 2 + pan.y };
}

export function toCanvas(p: Point, size: CanvasSize, zoom: number, pan: PanOffset = ZERO_PAN): PixelPoint {
  const origin = originPixel(size, pan);
  return { x: origin.x + p.x * GRID * zoom, y: origin.y + p.y * GRID * zoom };
}

export function eventPixel(e: { clientX: number; clientY: number; currentTarget: { getBoundingClientRect(): DOMRect } }): PixelPoint {
  const r = e.currentTarget.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

export function pointFromPixel(p: PixelPoint, size: CanvasSize, zoom: number, pan: PanOffset = ZERO_PAN): Point {
  const origin = originPixel(size, pan);
  return { x: Math.round((p.x - origin.x) / (GRID * zoom)), y: Math.round((p.y - origin.y) / (GRID * zoom)) };
}

export function logicalFromPixel(p: PixelPoint, size: CanvasSize, zoom: number, pan: PanOffset = ZERO_PAN): Point {
  const origin = originPixel(size, pan);
  return { x: (p.x - origin.x) / (GRID * zoom), y: (p.y - origin.y) / (GRID * zoom) };
}

export function hitTest(p: PixelPoint, segments: Segment[], size: CanvasSize, zoom: number, pan: PanOffset = ZERO_PAN): string | null {
  let best: { groupId: string; distance: number } | null = null;
  for (const s of segments) {
    const d = distanceToSegment(p, toCanvas(s.a, size, zoom, pan), toCanvas(s.b, size, zoom, pan));
    if (d <= HIT_TOLERANCE_PX && (!best || d < best.distance)) best = { groupId: s.groupId, distance: d };
  }
  return best?.groupId ?? null;
}
