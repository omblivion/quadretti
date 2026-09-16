import { Redo2, RotateCcw, Trash2, Undo2 } from "lucide-react";

type HistoryActionsProps = {
  canUndo: boolean;
  canRedo: boolean;
  selectedGroup: string | null;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onClear: () => void;
};

export function HistoryActions({ canUndo, canRedo, selectedGroup, onUndo, onRedo, onDelete, onClear }: HistoryActionsProps) {
  return (
    <div className="floating-stack left-actions">
      <button className="float-btn" onClick={onUndo} disabled={!canUndo} aria-label="Annulla"><Undo2 /></button>
      <button className="float-btn" onClick={onRedo} disabled={!canRedo} aria-label="Ripeti"><Redo2 /></button>
      <button className={selectedGroup ? "float-btn danger ready" : "float-btn danger"} disabled={!selectedGroup} onClick={onDelete} aria-label="Elimina selezione"><Trash2 /></button>
      <button className="float-btn" onClick={onClear} aria-label="Pulisci foglio"><RotateCcw /></button>
    </div>
  );
}
