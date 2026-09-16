import { useEffect, useState, type RefObject } from "react";
import type { CanvasSize } from "../types/drawing";

export function useCanvasSize(wrapRef: RefObject<HTMLDivElement | null>): CanvasSize {
  const [size, setSize] = useState<CanvasSize>({ w: 1000, h: 650 });

  useEffect(() => {
    const update = () => {
      if (wrapRef.current) setSize({ w: wrapRef.current.clientWidth, h: wrapRef.current.clientHeight });
    };
    update();
    const observer = new ResizeObserver(update);
    if (wrapRef.current) observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, [wrapRef]);

  return size;
}
