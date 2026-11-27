'use client';

import { useRef, useState } from 'react';

type Choice = { id: string; name: string; variant: string; code: string; purchase_unit: string };

export function MaterialOrderLines({ materials, initial }: { materials: Choice[]; initial?: string }) {
  const [rows, setRows] = useState([{ key: 0, material: initial ?? '' }]);
  const next = useRef(1);

  return <div className="material-order-lines">
    {rows.map((row, index) => {
      const current = materials.find(material => material.id === row.material);
      return <div className="material-order-line" key={row.key}>
        <label className="field">Material {index + 1}
          <select name="material_id" required value={row.material} onChange={event => {
            const material = event.target.value;
            setRows(previous => previous.map(item => item.key === row.key ? { ...item, material } : item));
          }}>
            <option value="" disabled>Selecione um material</option>
            {materials.map(material => <option key={material.id} value={material.id}
              disabled={material.id !== row.material && rows.some(item => item.material === material.id)}>
              {material.name}{material.variant ? ' · ' + material.variant : ''} · {material.purchase_unit} · {material.code}
            </option>)}
          </select>
        </label>
        <label className="field">Quantidade {current ? '(' + current.purchase_unit + ')' : ''}
          <input name="quantity" inputMode="decimal" maxLength={12} required />
        </label>
        {rows.length > 1 && <button type="button" className="button secondary"
          aria-label={'Remover item ' + (index + 1)} onClick={() => setRows(previous => previous.filter(item => item.key !== row.key))}>
          Remover
        </button>}
      </div>;
    })}
    {rows.length < Math.min(materials.length, 50) &&
      <button type="button" className="button secondary" onClick={() => {
        const key = next.current++;
        setRows(previous => [...previous, { key, material: '' }]);
      }}>Adicionar item</button>}
  </div>;
}
