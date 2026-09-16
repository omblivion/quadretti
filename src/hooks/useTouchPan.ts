import { useEffect, useRef, useState, type RefObject } from "react";
import { ZERO_PAN } from "../services/page/coordinates";
import type { PanOffset } from "../types/drawing";

function findTouch(touches: TouchList, id: number): Touch | undefined {
  return Array.from(touches).find(touch => touch.identifier === id);
}

function midpoint(a: Touch, b: Touch): PanOffset {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

export function useTouchPan(canvasRef: RefObject<HTMLCanvasElement | null>, onPanStart: () => void) {
  const [pan, setPan] = useState<PanOffset>(ZERO_PAN);
  const panRef = useRef(pan);
  const pairRef = useRef<[number, number] | null>(null);
  const lastMidRef = useRef<PanOffset | null>(null);
  const lockedRef = useRef(false);
  const onPanStartRef = useRef(onPanStart);
  onPanStartRef.current = onPanStart;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onStart = (event: TouchEvent) => {
      if (event.touches.length < 2 || pairRef.current) return;
      event.preventDefault();
      const first = event.touches[0];
      const second = event.touches[1];
      pairRef.current = [first.identifier, second.identifier];
      lastMidRef.current = midpoint(first, second);
      lockedRef.current = true;
      onPanStartRef.current();
    };

    const onMove = (event: TouchEvent) => {
      const pair = pairRef.current;
      const lastMid = lastMidRef.current;
      if (!pair || !lastMid) return;
      const first = findTouch(event.touches, pair[0]);
      const second = findTouch(event.touches, pair[1]);
      if (!first || !second) return;
      event.preventDefault();
      const mid = midpoint(first, second);
      const next = {
        x: panRef.current.x + (mid.x - lastMid.x),
        y: panRef.current.y + (mid.y - lastMid.y),
      };
      lastMidRef.current = mid;
      panRef.current = next;
      setPan(next);
    };

    const onEnd = (event: TouchEvent) => {
      const pair = pairRef.current;
      if (pair) {
        const first = findTouch(event.touches, pair[0]);
        const second = findTouch(event.touches, pair[1]);
        if (!first || !second) {
          pairRef.current = null;
          lastMidRef.current = null;
        }
      }
      if (event.touches.length === 0) {
        window.requestAnimationFrame(() => {
          lockedRef.current = false;
        });
      }
    };

    canvas.addEventListener("touchstart", onStart, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    canvas.addEventListener("touchend", onEnd);
    canvas.addEventListener("touchcancel", onEnd);
    return () => {
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("touchend", onEnd);
      canvas.removeEventListener("touchcancel", onEnd);
    };
  }, [canvasRef]);

  return {
    pan,
    isDrawLocked: () => lockedRef.current,
  };
}
