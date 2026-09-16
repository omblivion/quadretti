import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ChevronDown, Download, FileDown, FileUp } from "lucide-react";

type ExportButtonProps = {
  onExportPdf: () => void;
  onExportProject: () => void;
  onImportProject: (file: File) => void;
};

export function ExportButton({ onExportPdf, onExportProject, onImportProject }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function pickFile() {
    inputRef.current?.click();
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setOpen(false);
    if (file) onImportProject(file);
  }

  return (
    <div className="floating-export-wrap" ref={rootRef}>
      <button
        className="floating-export"
        type="button"
        aria-label="Esporta o importa"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        <Download />
        <span>Esporta</span>
        <ChevronDown />
      </button>
      {open && (
        <div className="export-menu" role="menu">
          <button type="button" role="menuitem" onClick={() => { onExportPdf(); setOpen(false); }}>
            <Download />
            Esporta PDF
          </button>
          <button type="button" role="menuitem" onClick={() => { onExportProject(); setOpen(false); }}>
            <FileDown />
            Esporta progetto
          </button>
          <button type="button" role="menuitem" onClick={pickFile}>
            <FileUp />
            Importa progetto
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".quadretto,application/json"
        hidden
        onChange={onFileChange}
      />
    </div>
  );
}
