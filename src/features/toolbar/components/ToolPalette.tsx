import { Eraser, MousePointer2, PaintBucket, PenLine } from "lucide-react";
import type { Tool } from "../../../types/drawing";

type ToolPaletteProps = {
  tool: Tool;
  onChange: (tool: Tool) => void;
};

export function ToolPalette({ tool, onChange }: ToolPaletteProps) {
  return (
    <nav className="floating-stack left-tools" aria-label="Strumenti">
      <button className={tool === "select" ? "float-btn active" : "float-btn"} onClick={() => onChange("select")} aria-label="Seleziona"><MousePointer2 /></button>
      <button className={tool === "line" ? "float-btn active" : "float-btn"} onClick={() => onChange("line")} aria-label="Linea"><PenLine /></button>
      <button className={tool === "fill" ? "float-btn active" : "float-btn"} onClick={() => onChange("fill")} aria-label="Riempi"><PaintBucket /></button>
      <button className={tool === "eraser" ? "float-btn active" : "float-btn"} onClick={() => onChange("eraser")} aria-label="Gomma"><Eraser /></button>
    </nav>
  );
}
