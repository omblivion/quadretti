import type { Symmetry } from "../../../types/drawing";

type SymmetryControlsProps = {
  symmetry: Symmetry;
  onChange: (symmetry: Symmetry) => void;
};

export function SymmetryControls({ symmetry, onChange }: SymmetryControlsProps) {
  return (
    <div className="floating-stack right-symmetry" aria-label="Simmetria">
      {([1, 2, 4] as Symmetry[]).map(v => (
        <button
          key={v}
          className={symmetry === v ? "float-btn text active" : "float-btn text"}
          onClick={() => onChange(v)}
          aria-label={v === 1 ? "Simmetria disattivata" : `Simmetria ${v} lati`}
        >
          {v === 1 ? "1×" : `${v}×`}
        </button>
      ))}
    </div>
  );
}
