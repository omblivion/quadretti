import { Trash2 } from "lucide-react";
import type { FillNotice } from "../../../types/drawing";
import type { FileNotice } from "../../../types/quadretto";

type EditorNoticesProps = {
  selectedGroup: string | null;
  fillNotice: FillNotice | null;
  fileNotice: FileNotice | null;
};

const FILE_NOTICE: Record<FileNotice, { className: string; text: string }> = {
  imported: { className: "fill-notice success", text: "Progetto importato." },
  invalid: { className: "fill-notice error", text: "File .quadretto non valido." },
  cancelled: { className: "fill-notice error", text: "Importazione annullata." },
};

export function EditorNotices({ selectedGroup, fillNotice, fileNotice }: EditorNoticesProps) {
  const file = fileNotice ? FILE_NOTICE[fileNotice] : null;
  return (
    <>
      {selectedGroup && <div className="selection-toast"><Trash2 />Gruppo simmetrico selezionato <kbd>Canc</kbd></div>}
      {file ? (
        <div className={file.className}>{file.text}</div>
      ) : fillNotice && (
        <div className={fillNotice === "open" ? "fill-notice error" : "fill-notice success"}>
          {fillNotice === "open" ? "Questa zona è aperta: chiudi prima il contorno." : "Area chiusa riempita."}
        </div>
      )}
    </>
  );
}
