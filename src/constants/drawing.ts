export const COLORS = ["#ef4444", "#f59e0b", "#16a34a", "#2563eb", "#7c3aed", "#ec4899", "#171717"];
export const GRID = 28;
export const HIT_TOLERANCE_PX = 9;
export const ZOOM_MIN = 0.55;
export const ZOOM_MAX = 1.8;
export const ZOOM_STEP = 0.15;
export const ZOOM_DEFAULT = 1;

export function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

export function zoomByStep(zoom: number, direction: 1 | -1): number {
  return clampZoom(zoom + direction * ZOOM_STEP);
}

export function zoomFromWheel(zoom: number, deltaY: number): number {
  return clampZoom(zoom * Math.exp(-deltaY * 0.002));
}
