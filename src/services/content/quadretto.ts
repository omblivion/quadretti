import type { Fill, Point, Segment } from "../../types/drawing";
import {
  QUADRETTO_FILENAME,
  QUADRETTO_FORMAT,
  QUADRETTO_VERSION,
  QuadrettoError,
  type QuadrettoDocument,
} from "../../types/quadretto";

export function serializeQuadretto(segments: Segment[], fills: Fill[]): QuadrettoDocument {
  return {
    format: QUADRETTO_FORMAT,
    version: QUADRETTO_VERSION,
    exportedAt: new Date().toISOString(),
    segments: segments.map(cloneSegment),
    fills: fills.map(cloneFill),
  };
}

export function parseQuadretto(text: string): QuadrettoDocument {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new QuadrettoError("File .quadretto non valido.");
  }
  return validateQuadretto(data);
}

export function downloadQuadretto(document: QuadrettoDocument, filename = QUADRETTO_FILENAME): void {
  const blob = new Blob([JSON.stringify(document, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function readQuadrettoFile(file: File): Promise<QuadrettoDocument> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(parseQuadretto(String(reader.result ?? "")));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new QuadrettoError("Impossibile leggere il file."));
    reader.readAsText(file);
  });
}

function validateQuadretto(data: unknown): QuadrettoDocument {
  if (!isRecord(data)) {
    throw new QuadrettoError("File .quadretto non valido.");
  }
  if (data.format !== QUADRETTO_FORMAT) {
    throw new QuadrettoError("File .quadretto non valido.");
  }
  if (data.version !== QUADRETTO_VERSION) {
    throw new QuadrettoError("Versione del file non supportata.");
  }
  if (typeof data.exportedAt !== "string") {
    throw new QuadrettoError("File .quadretto non valido.");
  }
  if (!Array.isArray(data.segments) || !Array.isArray(data.fills)) {
    throw new QuadrettoError("File .quadretto non valido.");
  }
  return {
    format: QUADRETTO_FORMAT,
    version: QUADRETTO_VERSION,
    exportedAt: data.exportedAt,
    segments: data.segments.map(parseSegment),
    fills: data.fills.map(parseFill),
  };
}

function parseSegment(value: unknown): Segment {
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.groupId) || !isNonEmptyString(value.color)) {
    throw new QuadrettoError("File .quadretto non valido.");
  }
  return {
    id: value.id,
    groupId: value.groupId,
    a: parsePoint(value.a),
    b: parsePoint(value.b),
    color: value.color,
  };
}

function parseFill(value: unknown): Fill {
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.color) || !Array.isArray(value.polygon) || !Array.isArray(value.holes) || !Array.isArray(value.boundaryGroups)) {
    throw new QuadrettoError("File .quadretto non valido.");
  }
  if (!value.boundaryGroups.every(isNonEmptyString)) {
    throw new QuadrettoError("File .quadretto non valido.");
  }
  return {
    id: value.id,
    polygon: value.polygon.map(parsePoint),
    holes: value.holes.map(parseRing),
    color: value.color,
    boundaryGroups: [...value.boundaryGroups],
  };
}

function parseRing(value: unknown): Point[] {
  if (!Array.isArray(value)) {
    throw new QuadrettoError("File .quadretto non valido.");
  }
  return value.map(parsePoint);
}

function parsePoint(value: unknown): Point {
  if (!isRecord(value) || !Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new QuadrettoError("File .quadretto non valido.");
  }
  return { x: Number(value.x), y: Number(value.y) };
}

function cloneSegment(segment: Segment): Segment {
  return {
    id: segment.id,
    groupId: segment.groupId,
    a: { ...segment.a },
    b: { ...segment.b },
    color: segment.color,
  };
}

function cloneFill(fill: Fill): Fill {
  return {
    id: fill.id,
    polygon: fill.polygon.map(p => ({ ...p })),
    holes: fill.holes.map(ring => ring.map(p => ({ ...p }))),
    color: fill.color,
    boundaryGroups: [...fill.boundaryGroups],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
