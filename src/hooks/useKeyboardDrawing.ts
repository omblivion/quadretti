import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { Point, Tool } from "../types/drawing";

type KeyboardDrawingOptions = {
  tool: Tool;
  cursor: Point;
  spaceStart: Point | null;
  selectedGroup: string | null;
  commitLine: (a: Point, b: Point) => void;
  deleteGroup: (groupId: string) => void;
  setCursor: Dispatch<SetStateAction<Point>>;
  setSelectedGroup: Dispatch<SetStateAction<string | null>>;
  setMouseStart: Dispatch<SetStateAction<Point | null>>;
  setSpaceStart: Dispatch<SetStateAction<Point | null>>;
};

export function useKeyboardDrawing({
  tool,
  cursor,
  spaceStart,
  selectedGroup,
  commitLine,
  deleteGroup,
  setCursor,
  setSelectedGroup,
  setMouseStart,
  setSpaceStart,
}: KeyboardDrawingOptions) {
  useEffect(() => {
    function down(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const delta = e.key === "ArrowLeft" ? [-1, 0] : e.key === "ArrowRight" ? [1, 0] : e.key === "ArrowUp" ? [0, -1] : [0, 1];
        setCursor(p => ({ x: p.x + delta[0], y: p.y + delta[1] }));
        setSelectedGroup(null);
      } else if (e.code === "Space" && tool === "line" && !e.repeat) {
        e.preventDefault();
        setSpaceStart(cursor);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedGroup) {
        e.preventDefault();
        deleteGroup(selectedGroup);
      } else if (e.key === "Escape") {
        setMouseStart(null);
        setSpaceStart(null);
        setSelectedGroup(null);
      }
    }
    function up(e: KeyboardEvent) {
      if (e.code === "Space" && spaceStart) {
        e.preventDefault();
        commitLine(spaceStart, cursor);
        setSpaceStart(null);
      }
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [commitLine, cursor, deleteGroup, selectedGroup, setCursor, setMouseStart, setSelectedGroup, setSpaceStart, spaceStart, tool]);
}
