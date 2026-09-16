import { Grid3x3 } from "lucide-react";

type GridToggleProps = {
  showGrid: boolean;
  onToggle: () => void;
};

export function GridToggle({ showGrid, onToggle }: GridToggleProps) {
  return (
    <div className="floating-grid">
      <button
        className={showGrid ? "float-btn active" : "float-btn"}
        onClick={onToggle}
        aria-pressed={showGrid}
        aria-label={showGrid ? "Nascondi griglia" : "Mostra griglia"}
      >
        <Grid3x3 />
      </button>
    </div>
  );
}
