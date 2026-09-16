import { Minus, Plus } from "lucide-react";

type ZoomControlsProps = {
  zoom: number;
  onChange: (updater: (zoom: number) => number) => void;
};

export function ZoomControls({ zoom, onChange }: ZoomControlsProps) {
  return (
    <div className="floating-zoom">
      <button onClick={() => onChange(z => Math.max(.55, z - .15))} aria-label="Riduci zoom"><Minus /></button>
      <span>{Math.round(zoom * 100)}%</span>
      <button onClick={() => onChange(z => Math.min(1.8, z + .15))} aria-label="Aumenta zoom"><Plus /></button>
    </div>
  );
}
