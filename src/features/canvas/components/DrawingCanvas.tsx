import type { PointerEvent, RefObject } from "react";

type DrawingCanvasProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onPointerDown: (e: PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (e: PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLCanvasElement>) => void;
  onPointerCancel: (e: PointerEvent<HTMLCanvasElement>) => void;
  onPointerLeave: () => void;
};

export function DrawingCanvas({ canvasRef, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onPointerLeave }: DrawingCanvasProps) {
  return (
    <canvas
      ref={canvasRef}
      tabIndex={0}
      aria-label="Foglio a quadretti interattivo"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerLeave}
    />
  );
}
