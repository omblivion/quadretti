import { GRID } from "../../constants/drawing";
import type { CanvasSize, Fill, PanOffset, PixelPoint, Point, Segment } from "../../types/drawing";
import { originPixel, toCanvas, ZERO_PAN } from "./coordinates";

export type DrawState = {
  canvas: HTMLCanvasElement;
  size: CanvasSize;
  zoom: number;
  pan?: PanOffset;
  fills: Fill[];
  segments: Segment[];
  selectedGroup: string | null;
  mouseStart: Point | null;
  spaceStart: Point | null;
  rawMouse: PixelPoint | null;
  cursor: Point;
  hover: Point | null;
  color: string;
  showGrid: boolean;
};

export function drawCanvas(state: DrawState): void {
  const { canvas, size, zoom, fills, segments, selectedGroup, mouseStart, spaceStart, rawMouse, cursor, hover, color, showGrid } = state;
  const pan = state.pan ?? ZERO_PAN;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size.w * dpr;
  canvas.height = size.h * dpr;
  canvas.style.width = `${size.w}px`;
  canvas.style.height = `${size.h}px`;
  const c = canvas.getContext("2d");
  if (!c) return;
  c.scale(dpr, dpr);
  c.fillStyle = "#fff";
  c.fillRect(0, 0, size.w, size.h);
  if (showGrid) {
    const step = GRID * zoom, origin = originPixel(size, pan), ox = origin.x, oy = origin.y;
    const startX = ((ox % step) + step) % step;
    const startY = ((oy % step) + step) % step;
    c.beginPath();
    c.strokeStyle = "#c2c2c2";
    c.lineWidth = 1;
    for (let x = startX; x < size.w; x += step) {
      c.moveTo(x, 0);
      c.lineTo(x, size.h);
    }
    for (let y = startY; y < size.h; y += step) {
      c.moveTo(0, y);
      c.lineTo(size.w, y);
    }
    c.stroke();
    c.beginPath();
    c.strokeStyle = "#8a8a8a";
    c.lineWidth = 1.5;
    c.moveTo(ox, 0);
    c.lineTo(ox, size.h);
    c.moveTo(0, oy);
    c.lineTo(size.w, oy);
    c.stroke();
  }
  fills.forEach(f => {
    if (f.polygon.length < 3) return;
    c.beginPath();
    const addRing = (ring: Point[]) => {
      ring.forEach((point, i) => {
        const p = toCanvas(point, size, zoom, pan);
        if (i === 0) c.moveTo(p.x, p.y);
        else c.lineTo(p.x, p.y);
      });
      c.closePath();
    };
    addRing(f.polygon);
    f.holes.forEach(addRing);
    c.globalAlpha = 1;
    c.fillStyle = f.color;
    c.fill("evenodd");
  });
  segments.forEach(s => {
    const a = toCanvas(s.a, size, zoom, pan), b = toCanvas(s.b, size, zoom, pan), selected = s.groupId === selectedGroup;
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.strokeStyle = selected ? "#fff" : s.color;
    c.lineWidth = selected ? 8 : 3;
    c.lineCap = "round";
    c.stroke();
    if (selected) {
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.strokeStyle = "#0ea5e9";
      c.lineWidth = 4;
      c.stroke();
    }
  });
  const previewStart = mouseStart ?? spaceStart;
  if (previewStart) {
    const a = toCanvas(previewStart, size, zoom, pan), b = mouseStart && rawMouse ? rawMouse : toCanvas(cursor, size, zoom, pan);
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
    c.strokeStyle = color;
    c.globalAlpha = .68;
    c.setLineDash([8, 6]);
    c.lineWidth = 2.5;
    c.stroke();
    c.setLineDash([]);
    c.globalAlpha = 1;
    if (mouseStart && hover && rawMouse) {
      const snap = toCanvas(hover, size, zoom, pan);
      c.beginPath();
      c.moveTo(rawMouse.x, rawMouse.y);
      c.lineTo(snap.x, snap.y);
      c.strokeStyle = "#2563eb";
      c.globalAlpha = .35;
      c.lineWidth = 1;
      c.stroke();
      c.globalAlpha = 1;
    }
  }
  if (hover) {
    const p = toCanvas(hover, size, zoom, pan);
    c.beginPath();
    c.arc(p.x, p.y, 7, 0, Math.PI * 2);
    c.fillStyle = "#eff6ff";
    c.fill();
    c.strokeStyle = "#60a5fa";
    c.lineWidth = 2;
    c.stroke();
  }
  const cp = toCanvas(cursor, size, zoom, pan);
  c.beginPath();
  c.arc(cp.x, cp.y, 10, 0, Math.PI * 2);
  c.fillStyle = "#2563eb22";
  c.fill();
  c.strokeStyle = "#2563eb";
  c.lineWidth = 2.5;
  c.stroke();
  c.beginPath();
  c.arc(cp.x, cp.y, 3.2, 0, Math.PI * 2);
  c.fillStyle = "#2563eb";
  c.fill();
}
