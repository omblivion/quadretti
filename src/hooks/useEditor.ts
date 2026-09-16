import { useCallback, useEffect, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import { COLORS, ZOOM_DEFAULT, clampZoom, zoomFromWheel } from "../constants/drawing";
import { loadCustomColors, persistCustomColors } from "../services/content/customColors";
import { applyFill, syncFills } from "../services/content/fillService";
import { transformedSegments } from "../services/content/symmetry";
import { eventPixel, hitTest, logicalFromPixel, pointFromPixel } from "../services/page/coordinates";
import { downloadQuadretto, readQuadrettoFile, serializeQuadretto } from "../services/content/quadretto";
import { exportPdf as exportPdfDocument } from "../services/page/exportPdf";
import { drawCanvas } from "../services/page/renderer";
import type { Fill, FillNotice, PixelPoint, Point, Segment, Snapshot, Symmetry, Tool } from "../types/drawing";
import type { FileNotice } from "../types/quadretto";
import { useCanvasSize } from "./useCanvasSize";
import { useKeyboardDrawing } from "./useKeyboardDrawing";
import { useTouchPan } from "./useTouchPan";

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
  const [zoom, setZoomState] = useState(ZOOM_DEFAULT);
  const [mouseStart, setMouseStart] = useState<Point | null>(null);
  const [spaceStart, setSpaceStart] = useState<Point | null>(null);
  const [cursor, setCursor] = useState<Point>({ x: 0, y: 0 });
  const [hover, setHover] = useState<Point | null>(null);
  const [rawMouse, setRawMouse] = useState<PixelPoint | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [fillNotice, setFillNotice] = useState<FillNotice | null>(null);
  const [fileNotice, setFileNotice] = useState<FileNotice | null>(null);
  const [showGrid, setShowGrid] = useState(true);

  const size = useCanvasSize(wrapRef);
  const touchPan = useTouchPan(canvasRef, () => {
    setMouseStart(null);
    setHover(null);
  });
  const pan = touchPan.pan;

  const setZoom = useCallback((updater: number | ((zoom: number) => number)) => {
    setZoomState(z => clampZoom(typeof updater === "function" ? updater(z) : updater));
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom(z => zoomFromWheel(z, event.deltaY));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [setZoom]);

  const saveHistory = useCallback(() => {
    setHistory(h => [...h.slice(-39), { segments, fills }]);
    setRedo([]);
  }, [segments, fills]);

  const persistSlots = useCallback((next: (string | null)[]) => {
    setCustomSlots(next);
    persistCustomColors(next);
  }, []);

  useEffect(() => {
    if (!fillNotice) return;
    const timer = window.setTimeout(() => setFillNotice(null), 1800);
    return () => window.clearTimeout(timer);
  }, [fillNotice]);

  useEffect(() => {
    if (!fileNotice) return;
    const timer = window.setTimeout(() => setFileNotice(null), 1800);
    return () => window.clearTimeout(timer);
  }, [fileNotice]);

  const commitLine = useCallback((a: Point, b: Point) => {
    if (a.x === b.x && a.y === b.y) return;
    saveHistory();
    const groupId = `gesture-${Date.now()}-${gestureId.current++}`;
    const pairs = transformedSegments(a, b, symmetry);
    const made = pairs.map((pair, i): Segment => ({ id: `${groupId}-${i}`, groupId, a: pair.a, b: pair.b, color }));
    const next = [...segments, ...made];
    setSegments(next);
    setFills(old => syncFills(old, next));
    setSelectedGroup(null);
  }, [color, saveHistory, segments, symmetry]);

  const deleteGroup = useCallback((groupId: string) => {
    saveHistory();
    const next = segments.filter(s => s.groupId !== groupId);
    setSegments(next);
    setFills(old => syncFills(old, next));
    setSelectedGroup(null);
  }, [saveHistory, segments]);

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
    setZoom,
  });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawCanvas({
      canvas,
      size,
      zoom,
      pan,
      fills,
      segments,
      selectedGroup,
      mouseStart,
      spaceStart,
      rawMouse,
      cursor,
      hover,
      color,
      showGrid,
    });
  }, [color, cursor, fills, hover, mouseStart, pan, rawMouse, segments, selectedGroup, showGrid, size, spaceStart, zoom]);

  useEffect(draw, [draw]);

  function applyPointTool(pixel: PixelPoint) {
    const p = pointFromPixel(pixel, size, zoom, pan);
    setCursor(p);
    setRawMouse(pixel);
    if (tool === "select") {
      setSelectedGroup(hitTest(pixel, segments, size, zoom, pan));
      return;
    }
    if (tool === "eraser") {
      const group = hitTest(pixel, segments, size, zoom, pan);
      if (group) deleteGroup(group);
      return;
    }
    const result = applyFill(logicalFromPixel(pixel, size, zoom, pan), fills, segments, color, symmetry);
    if (result.notice === "open") {
      setFillNotice("open");
      return;
    }
    saveHistory();
    setFills(result.fills);
    setFillNotice("filled");
  }

  function pointerDown(e: PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.focus();
    if (e.pointerType === "touch") e.currentTarget.setPointerCapture(e.pointerId);
    if (touchPan.isDrawLocked()) return;
    const pixel = eventPixel(e);
    const p = pointFromPixel(pixel, size, zoom, pan);
    setCursor(p);
    setRawMouse(pixel);
    if (tool === "line") {
      setSelectedGroup(null);
      setMouseStart(p);
      return;
    }
    if (e.pointerType === "touch") return;
    applyPointTool(pixel);
  }

  function pointerMove(e: PointerEvent<HTMLCanvasElement>) {
    if (touchPan.isDrawLocked()) return;
    const pixel = eventPixel(e);
    setRawMouse(pixel);
    setHover(pointFromPixel(pixel, size, zoom, pan));
  }

  function pointerUp(e: PointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === "touch" && touchPan.isDrawLocked()) {
      setMouseStart(null);
      return;
    }
    if (tool === "line") {
      if (!mouseStart) return;
      const end = pointFromPixel(eventPixel(e), size, zoom, pan);
      commitLine(mouseStart, end);
      setCursor(end);
      setMouseStart(null);
      return;
    }
    if (e.pointerType === "touch") applyPointTool(eventPixel(e));
  }

  function pointerCancel() {
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

  function handleExportQuadretto() {
    downloadQuadretto(serializeQuadretto(segments, fills));
  }

  async function handleImportQuadretto(file: File) {
    let imported;
    try {
      imported = await readQuadrettoFile(file);
    } catch {
      setFillNotice(null);
      setFileNotice("invalid");
      return;
    }
    if (segments.length > 0 || fills.length > 0) {
      const confirmed = window.confirm("Sostituire il disegno attuale con il progetto importato?");
      if (!confirmed) {
        setFillNotice(null);
        setFileNotice("cancelled");
        return;
      }
    }
    saveHistory();
    setSegments(imported.segments);
    setFills(imported.fills);
    setSelectedGroup(null);
    setFillNotice(null);
    setFileNotice("imported");
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
    showGrid,
    toggleGrid: () => setShowGrid(value => !value),
    selectedGroup,
    fillNotice,
    fileNotice,
    history,
    redo,
    pointerDown,
    pointerMove,
    pointerUp,
    pointerCancel,
    pointerLeave,
    undo,
    redoAction,
    deleteGroup,
    clearSheet,
    clickSlot,
    onWheelChange,
    exportPdf: handleExportPdf,
    exportQuadretto: handleExportQuadretto,
    importQuadretto: handleImportQuadretto,
  };
}
