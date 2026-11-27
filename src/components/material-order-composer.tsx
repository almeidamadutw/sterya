'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { registerPurchaseItem, requestOrder } from '@/app/actions/material-operations';
import { MaterialFields } from '@/components/material-fields';
import { MaterialOperationForm } from '@/components/material-operation-form';
import { materialBase, orderPriorities, type MaterialGroup, type PurchaseItem } from '@/lib/materials';

type OrderRow = { key: number; material: string };

export function MaterialOrderComposer({ materials, units, groups, essentials, initial, startWithRegistration }: {
  materials: PurchaseItem[];
  units: { id: string; name: string }[];
  groups: MaterialGroup[];
  essentials?: string;
  initial?: string;
  startWithRegistration: boolean;
}) {
  const [savedItems, setSavedItems] = useState<PurchaseItem[]>([]);
  const [rows, setRows] = useState<OrderRow[]>([{ key: 0, material: initial ?? '' }]);
  const [registered, setRegistered] = useState('');
  const next = useRef(1);
  const dialog = useRef<HTMLDialogElement>(null);
  const available = [...materials.filter(item => !savedItems.some(saved => saved.id === item.id)), ...savedItems]
    .sort((first, second) => first.name.localeCompare(second.name, 'pt-BR') || first.variant.localeCompare(second.variant, 'pt-BR'));

  useEffect(() => {
    if (startWithRegistration && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [startWithRegistration]);

  function addRegisteredItem(item: PurchaseItem) {
    setSavedItems(previous => [...previous.filter(saved => saved.id !== item.id), item]);
    const newKey = next.current++;
    setRows(previous => {
      if (previous.some(row => row.material === item.id)) return previous;
      const empty = previous.find(row => !row.material);
      if (empty) return previous.map(row => row.key === empty.key ? { ...row, material: item.id } : row);
      if (previous.length >= 50) return previous;
      return [...previous, { key: newKey, material: item.id }];
    });
    setRegistered(item.name + ' cadastrado no catálogo.');
    dialog.current?.close();
  }

  return <>
    <MaterialOperationForm action={requestOrder} label="Enviar para aprovação">
      <div className="material-form-grid">
        <label className="field">Unidade que vai receber
          <select name="unit_id" defaultValue="" required>
            <option value="" disabled>Selecione a unidade</option>
            {units.map(unit => <option value={unit.id} key={unit.id}>{unit.name}</option>)}
          </select>
        </label>
        <label className="field">Prioridade para aprovação
          <select name="priority" defaultValue={1}>
            {orderPriorities.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>
      <div className="material-order-lines">
        <div className="section-title purchase-lines-heading">
          <h2>Itens da lista</h2>
          <button type="button" className="button secondary" onClick={() => dialog.current?.showModal()}>
            Cadastrar novo item
          </button>
        </div>
        {registered && <p className="notice success" role="status">{registered}</p>}
        {!available.length && <p>Cadastre o primeiro item ou complete a unidade de medida de um item do catálogo.</p>}
        {rows.map((row, index) => {
          const current = available.find(material => material.id === row.material);
          return <div className="material-order-line" key={row.key}>
            <label className="field">Item {index + 1}
              <select name="material_id" required value={row.material} onChange={event => {
                const material = event.target.value;
                setRows(previous => previous.map(item => item.key === row.key ? { ...item, material } : item));
              }}>
                <option value="" disabled>Selecione um item</option>
                {available.map(material => <option key={material.id} value={material.id}
                  disabled={material.id !== row.material && rows.some(item => item.material === material.id)}>
                  {material.name}{material.variant ? ' · ' + material.variant : ''} · {material.purchase_unit} · {material.code}
                </option>)}
              </select>
            </label>
            <label className="field">Quantidade {current ? '(' + current.purchase_unit + ')' : ''}
              <input name="quantity" inputMode="decimal" maxLength={12} required />
            </label>
            {rows.length > 1 && <button type="button" className="button secondary"
              aria-label={'Remover item ' + (index + 1)}
              onClick={() => setRows(previous => previous.filter(item => item.key !== row.key))}>
              Remover
            </button>}
          </div>;
        })}
        {rows.length < Math.min(available.length, 50) &&
          <button type="button" className="button secondary" onClick={() => {
            const key = next.current++;
            setRows(previous => [...previous, { key, material: '' }]);
          }}>Adicionar item da lista</button>}
      </div>
      <label className="field">Observação (opcional)
        <textarea name="note" rows={3} maxLength={1000} placeholder="Se precisar, explique a prioridade ou deixe instruções para a compra." />
      </label>
      <p className="operations-muted">Só aparecem itens com unidade de medida preenchida. <Link href={materialBase}>Consultar catálogo</Link></p>
    </MaterialOperationForm>

    <dialog className="purchase-item-dialog" ref={dialog} aria-labelledby="purchase-item-title">
      <div className="section-title">
        <h2 id="purchase-item-title">Cadastrar item de compra</h2>
        <button type="button" className="button secondary" onClick={() => dialog.current?.close()}>Fechar</button>
      </div>
      <p>Cadastre o item uma vez para usar nesta lista e nas próximas. Exemplo: papel higiênico, grupo Essenciais, unidade pacote.</p>
      <MaterialOperationForm action={registerPurchaseItem} label="Salvar item" onSaved={result => {
        if ('item' in result && result.item) addRegisteredItem(result.item);
      }}>
        <MaterialFields groups={groups} defaultGroup={essentials} measureRequired />
      </MaterialOperationForm>
    </dialog>
  </>;
}
