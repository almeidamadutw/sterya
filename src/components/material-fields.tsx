import type { MaterialGroup } from '@/lib/materials';

export type EditableMaterial = {
  id: string;
  category_id: string;
  name: string;
  variant: string;
  purchase_unit: string | null;
  review_note: string | null;
};

export function MaterialFields({ groups, material, measureInUse, measureRequired, defaultGroup }: {
  groups: MaterialGroup[];
  material?: EditableMaterial;
  measureInUse?: boolean;
  measureRequired?: boolean;
  defaultGroup?: string;
}) {
  return <>
    {material && <input type="hidden" name="id" value={material.id} />}
    <div className="material-form-grid">
      <label className="field">Nome do material
        <input name="name" defaultValue={material?.name} minLength={2} maxLength={160} required />
      </label>
      <label className="field">Especialidade / grupo
        <select name="category" defaultValue={material?.category_id ?? defaultGroup ?? ''} required>
          <option value="" disabled>Selecione</option>
          {groups.map(group => <option value={group.id} key={group.id}>{group.name}</option>)}
        </select>
      </label>
      <label className="field">Tamanho ou versão
        <input name="variant" defaultValue={material?.variant} maxLength={160} />
      </label>
      <label className="field">Unidade de medida
        <input name="measure" defaultValue={material?.purchase_unit ?? ''} maxLength={80}
          placeholder="Ex.: unidade, caixa, pacote" readOnly={measureInUse} required={measureRequired} />
        {measureInUse && <small>Unidade em uso no estoque ou em pedidos.</small>}
      </label>
    </div>
    {material?.review_note && <label className="material-checkbox">
      <input type="checkbox" name="clear_review" /> Marcar a especificação como conferida
    </label>}
  </>;
}
