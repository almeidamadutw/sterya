'use client';
export function PrintLabelButton() {
  return <button type="button" className="print-label-button" onClick={() => window.print()}>Imprimir etiqueta 60 × 40 mm</button>;
}
