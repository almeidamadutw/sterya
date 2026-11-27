'use client';
export function PrintLabelButton() {
  return <button type="button" className="print-label-button" onClick={() => window.print()}>Imprimir etiqueta 50 × 30 mm</button>;
}
