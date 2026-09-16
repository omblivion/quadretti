import type { Fill, Segment } from "../../types/drawing";

export function exportPdf(canvas: HTMLCanvasElement, segments: Segment[], fills: Fill[]): void {
  const cs = [...new Set([...segments.map(s => s.color), ...fills.map(f => f.color)])];
  const rows = cs.map(c => `<tr><td><i style="background:${c}"></i>${c}</td><td>${segments.filter(s => s.color === c).length}</td><td>${fills.filter(f => f.color === c).length}</td></tr>`).join("");
  const p = window.open("", "_blank");
  if (!p) return;
  p.document.write(`<!doctype html><html><head><title>quadretti</title><style>@page{size:A4;margin:18mm}body{font:15px Arial;color:#17202a;margin:0}.page{min-height:255mm;page-break-after:always}h1{font-size:30px;margin:0 0 8px}.meta{color:#64748b;margin-bottom:34px}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #dbe7ef;padding:12px;text-align:left}i{display:inline-block;width:14px;height:14px;border-radius:4px;margin-right:10px;vertical-align:-2px}.art{display:flex;align-items:center;justify-content:center}.art img{max-width:100%;max-height:250mm;border:1px solid #dbe7ef}</style></head><body><section class="page"><h1>Inventario delle forme</h1><p class="meta">quadretti · unità geometriche del disegno</p><table><thead><tr><th>Colore</th><th>Segmenti</th><th>Aree riempite</th></tr></thead><tbody>${rows}</tbody></table><p><strong>Totale:</strong> ${segments.length} segmenti · ${fills.length} aree colorate</p></section><section class="page art"><img src="${canvas.toDataURL("image/png")}" /></section><script>onload=()=>setTimeout(()=>print(),250)<\/script></body></html>`);
  p.document.close();
}
