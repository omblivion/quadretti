import { Download } from "lucide-react";

type ExportButtonProps = {
  onExport: () => void;
};

export function ExportButton({ onExport }: ExportButtonProps) {
  return (
    <button className="floating-export" onClick={onExport} aria-label="Esporta PDF">
      <Download />
      <span>PDF</span>
    </button>
  );
}
