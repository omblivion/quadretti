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
      <div className="color-columns">
        <div className="color-presets">
          {COLORS.map(c => (
            <button key={c} className={color === c ? "color-btn selected" : "color-btn"} style={{ backgroundColor: c, backgroundImage: "none" }} onClick={() => onSelect(c)} aria-label={`Colore ${c}`} />
          ))}
        </div>
        <div className="color-slots">
          {customSlots.map((slot, i) => (
            <button
              key={i}
              className={slot && color === slot ? "color-btn selected" : armedSlot === i ? "color-btn armed" : slot ? "color-btn" : "color-btn empty"}
              style={slot ? { backgroundColor: slot, backgroundImage: "none" } : undefined}
              onClick={() => onSlotClick(i)}
              aria-label={slot ? `Colore personalizzato ${slot}` : `Spazio colore vuoto ${i + 1}`}
            />
          ))}
        </div>
      </div>
      <label className="color-wheel-wrap">
        <input ref={wheelRef} type="color" className="color-wheel" value={color} onChange={onWheelChange} aria-label="Ruota dei colori" />
      </label>
    </div>
  );
}
