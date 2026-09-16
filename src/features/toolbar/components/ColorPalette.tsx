import type { ChangeEvent, RefObject } from "react";
import { COLORS } from "../../../constants/drawing";

type ColorPaletteProps = {
  color: string;
  customSlots: (string | null)[];
  armedSlot: number | null;
  wheelRef: RefObject<HTMLInputElement | null>;
  onSelect: (color: string) => void;
  onSlotClick: (index: number) => void;
  onWheelChange: (e: ChangeEvent<HTMLInputElement>) => void;
};

export function ColorPalette({ color, customSlots, armedSlot, wheelRef, onSelect, onSlotClick, onWheelChange }: ColorPaletteProps) {
  return (
    <div className="floating-colors" aria-label="Colori">
      {COLORS.map(c => (
        <button key={c} className={color === c ? "color-btn selected" : "color-btn"} style={{ backgroundColor: c }} onClick={() => onSelect(c)} aria-label={`Colore ${c}`} />
      ))}
      <div className="color-divider" />
      <input ref={wheelRef} type="color" className="color-wheel" value={color} onChange={onWheelChange} aria-label="Ruota dei colori" />
      <div className="color-slots">
        {customSlots.map((slot, i) => (
          <button
            key={i}
            className={slot && color === slot ? "color-btn selected" : armedSlot === i ? "color-btn armed" : "color-btn"}
            style={slot ? { backgroundColor: slot } : undefined}
            onClick={() => onSlotClick(i)}
            aria-label={slot ? `Colore personalizzato ${slot}` : `Spazio colore vuoto ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
