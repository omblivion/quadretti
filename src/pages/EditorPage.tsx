import { DrawingCanvas } from "../features/canvas/components/DrawingCanvas";
import { ColorPalette } from "../features/toolbar/components/ColorPalette";
import { EditorNotices } from "../features/toolbar/components/EditorNotices";
import { ExportButton } from "../features/toolbar/components/ExportButton";
import { HistoryActions } from "../features/toolbar/components/HistoryActions";
import { SymmetryControls } from "../features/toolbar/components/SymmetryControls";
import { ToolPalette } from "../features/toolbar/components/ToolPalette";
import { ZoomControls } from "../features/toolbar/components/ZoomControls";
import { useEditor } from "../hooks/useEditor";

export default function EditorPage() {
  const editor = useEditor();

  return (
    <main className="app-shell">
      <div className="canvas-area" ref={editor.wrapRef}>
        <DrawingCanvas
          canvasRef={editor.canvasRef}
          onPointerDown={editor.pointerDown}
          onPointerMove={editor.pointerMove}
          onPointerUp={editor.pointerUp}
          onPointerLeave={editor.pointerLeave}
        />
        <div className="wordmark">quadretti</div>
        <ToolPalette tool={editor.tool} onChange={editor.setTool} />
        <HistoryActions
          canUndo={editor.history.length > 0}
          canRedo={editor.redo.length > 0}
          selectedGroup={editor.selectedGroup}
          onUndo={editor.undo}
          onRedo={editor.redoAction}
          onDelete={() => editor.selectedGroup && editor.deleteGroup(editor.selectedGroup)}
          onClear={editor.clearSheet}
        />
        <ExportButton onExport={editor.exportPdf} />
        <SymmetryControls symmetry={editor.symmetry} onChange={editor.setSymmetry} />
        <ColorPalette
          color={editor.color}
          customSlots={editor.customSlots}
          armedSlot={editor.armedSlot}
          wheelRef={editor.wheelRef}
          onSelect={editor.setColor}
          onSlotClick={editor.clickSlot}
          onWheelChange={editor.onWheelChange}
        />
        <ZoomControls zoom={editor.zoom} onChange={editor.setZoom} />
        <EditorNotices selectedGroup={editor.selectedGroup} fillNotice={editor.fillNotice} />
      </div>
    </main>
  );
}
