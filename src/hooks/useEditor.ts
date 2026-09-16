import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import { COLORS } from "../constants/drawing";
import { loadCustomColors, persistCustomColors } from "../services/content/customColors";
import { buildFaces, faceAt, faceKey, replaceFillsForFaces } from "../services/content/geometry";
import { transformedPoints, transformedSegments } from "../services/content/symmetry";
import { eventPixel, hitTest, logicalFromPixel, pointFromPixel } from "../services/page/coordinates";
import { exportPdf as exportPdfDocument } from "../services/page/exportPdf";
import { drawCanvas } from "../services/page/renderer";
import type { Face, Fill, FillNotice, PixelPoint, Point, Segment, Snapshot, Symmetry, Tool } from "../types/drawing";
import { useCanvasSize } from "./useCanvasSize";
import { useKeyboardDrawing } from "./useKeyboardDrawing";

const initialSegments: Segment[] = [];
const initialFills: Fill[] = [];

export function useEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLInputElement>(null);
  const gestureId = useRef(0);

  const [segments, setSegments] = useState<Segment[]>(initialSegments);
  const [fills, setFills] = useState<Fill[]>(initialFills);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [redo, setRedo] = useState<Snapshot[]>([]);
  const [tool, setTool] = useState<Tool>("line");
  const [symmetry, setSymmetry] = useState<Symmetry>(4);
  const [color, setColor] = useState(COLORS[0]);
  const [customSlots, setCustomSlots] = useState<(string | null)[]>(loadCustomColors);
  const [armedSlot, setArmedSlot] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [mouseStart, setMouseStart] = useState<Point | null>(null);
  const [spaceStart, setSpaceStart] = useState<Point | null>(null);
  const [cursor, setCursor] = useState<Point>({ x: 0, y: 0 });
  const [hover, setHover] = useState<Point | null>(null);
  const [rawMouse, setRawMouse] = useState<PixelPoint | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [fillNotice, setFillNotice] = useState<FillNotice | null>(null);

  const size = useCanvasSize(wrapRef);

  const saveHistory = useCallback(() => {
    setHistory(h => [...h.slice(-39), { segments, fills }]);
    setRedo([]);
  }, [segments, fills]);

  const persistSlots = useCallback((next: (string | null)[]) => {
    setCustomSlots(next);
    persistCustomColors(next);
  }, []);

  const faces = useMemo(() => buildFaces(segments), [segments]);

  useEffect(() => {
    if (!fillNotice) return;
    const timer = window.setTimeout(() => setFillNotice(null), 1800);
    return () => window.clearTimeout(timer);
  }, [fillNotice]);

  const commitLine = useCallback((a: Point, b: Point) => {
    if (a.x === b.x && a.y === b.y) return;
    saveHistory();
    const groupId = `gesture-${Date.now()}-${gestureId.current++}`;
    const pairs = transformedSegments(a, b, symmetry);
    const made = pairs.map((pair, i): Segment => ({ id: `${groupId}-${i}`, groupId, a: pair.a, b: pair.b, color }));
    setSegments(old => [...old, ...made]);
    setSelectedGroup(null);
  }, [color, saveHistory, symmetry]);

  const deleteGroup = useCallback((groupId: string) => {
    saveHistory();
    setSegments(old => old.filter(s => s.groupId !== groupId));
    setFills(old => old.filter(f => !f.boundaryGroups.includes(groupId)));
    setSelectedGroup(null);
  }, [saveHistory]);

  useKeyboardDrawing({
    tool,
    cursor,
    spaceStart,
    selectedGroup,
    commitLine,
    deleteGroup,
    setCursor,
    setSelectedGroup,
    setMouseStart,
    setSpaceStart,
  });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawCanvas({
      canvas,
      size,
      zoom,
      fills,
      segments,
      selectedGroup,
      mouseStart,
      spaceStart,
      rawMouse,
      cursor,
      hover,
      color,
    });
  }, [color, cursor, fills, hover, mouseStart, rawMouse, segments, selectedGroup, size, spaceStart, zoom]);

  useEffect(draw, [draw]);

  function pointerDown(e: PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.focus();
    const pixel = eventPixel(e);
    const p = pointFromPixel(pixel, size, zoom);
    setCursor(p);
    setRawMouse(pixel);
    if (tool === "select") {
      setSelectedGroup(hitTest(pixel, segments, size, zoom));
      return;
    }
    if (tool === "eraser") {
      const group = hitTest(pixel, segments, size, zoom);
      if (group) deleteGroup(group);
      return;
    }
    if (tool === "line") {
      setSelectedGroup(null);
      setMouseStart(p);
      return;
    }
    const targets = transformedPoints(logicalFromPixel(pixel, size, zoom), symmetry);
    const found: Face[] = [];
    for (const target of targets) {
      const face = faceAt(target, faces);
      if (face && !found.some(item => faceKey(item.polygon) === faceKey(face.polygon))) found.push(face);
    }
    if (found.length === 0) {
      setFillNotice("open");
      return;
    }
    saveHistory();
    setFills(old => replaceFillsForFaces(old, found, color));
    setFillNotice("filled");
  }

  function pointerMove(e: PointerEvent<HTMLCanvasElement>) {
    const pixel = eventPixel(e);
    setRawMouse(pixel);
    setHover(pointFromPixel(pixel, size, zoom));
  }

  function pointerUp(e: PointerEvent<HTMLCanvasElement>) {
    if (tool !== "line" || !mouseStart) return;
    const end = pointFromPixel(eventPixel(e), size, zoom);
    commitLine(mouseStart, end);
    setCursor(end);
    setMouseStart(null);
  }

  function pointerLeave() {
    setHover(null);
    setRawMouse(null);
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setRedo(r => [...r, { segments, fills }]);
    setSegments(previous.segments);
    setFills(previous.fills);
    setHistory(h => h.slice(0, -1));
    setSelectedGroup(null);
  }

  function redoAction() {
    const next = redo.at(-1);
    if (!next) return;
    setHistory(h => [...h, { segments, fills }]);
    setSegments(next.segments);
    setFills(next.fills);
    setRedo(r => r.slice(0, -1));
    setSelectedGroup(null);
  }

  function clickSlot(i: number) {
    const value = customSlots[i];
    if (value) {
      setColor(value);
      setArmedSlot(null);
    } else {
      setArmedSlot(i);
    }
  }

  function onWheelChange(e: ChangeEvent<HTMLInputElement>) {
    if (armedSlot === null) return;
    const picked = e.target.value;
    const next = customSlots.slice();
    next[armedSlot] = picked;
    persistSlots(next);
    setColor(picked);
    setArmedSlot(null);
  }

  function handleExportPdf() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    exportPdfDocument(canvas, segments, fills);
  }

  function clearSheet() {
    saveHistory();
    setSegments([]);
    setFills([]);
    setSelectedGroup(null);
  }

  return {
    canvasRef,
    wrapRef,
    wheelRef,
    tool,
    setTool,
    symmetry,
    setSymmetry,
    color,
    setColor,
    customSlots,
    armedSlot,
    zoom,
    setZoom,
    selectedGroup,
    fillNotice,
    history,
    redo,
    pointerDown,
    pointerMove,
    pointerUp,
    pointerLeave,
    undo,
    redoAction,
    deleteGroup,
    clearSheet,
    clickSlot,
    onWheelChange,
    exportPdf: handleExportPdf,
  };
}
