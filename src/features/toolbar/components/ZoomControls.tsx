import { Minus, Plus } from "lucide-react";
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from "../../../constants/drawing";

type ZoomControlsProps = {
  zoom: number;
  onChange: (updater: (zoom: number) => number) => void;
};

export function ZoomControls({ zoom, onChange }: ZoomControlsProps) {
  const percent = Math.round(zoom * 100);
  const minPercent = Math.round(ZOOM_MIN * 100);
  const maxPercent = Math.round(ZOOM_MAX * 100);

  return (
    <div className="floating-zoom">
      <button
        onClick={() => onChange(z => z - ZOOM_STEP)}
        disabled={percent <= minPercent}
        aria-label="Riduci zoom"
      >
        <Minus />
      </button>
      <span aria-live="polite">{percent}%</span>
      <button
        onClick={() => onChange(z => z + ZOOM_STEP)}
        disabled={percent >= maxPercent}
        aria-label="Aumenta zoom"
      >
        <Plus />
      </button>
    </div>
  );
}
