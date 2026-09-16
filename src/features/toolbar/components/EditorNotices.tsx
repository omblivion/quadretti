import { Trash2 } from "lucide-react";
import type { FillNotice } from "../../../types/drawing";

type EditorNoticesProps = {
  selectedGroup: string | null;
  fillNotice: FillNotice | null;
};

export function EditorNotices({ selectedGroup, fillNotice }: EditorNoticesProps) {
  return (
    <>
      {selectedGroup && <div className="selection-toast"><Trash2 />Gruppo simmetrico selezionato <kbd>Canc</kbd></div>}
      {fillNotice && (
        <div className={fillNotice === "open" ? "fill-notice error" : "fill-notice success"}>
          {fillNotice === "open" ? "Questa zona è aperta: chiudi prima il contorno." : "Area chiusa riempita."}
        </div>
      )}
    </>
  );
}
