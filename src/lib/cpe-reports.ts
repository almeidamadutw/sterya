import type { Profile } from './auth';
import type { createClient } from './supabase/server';
import { orderFilters, orderQuery, pieceQuery, stockFilters, stockQuery } from './report-queries';
import { materialDate, materialQuantity, orderNextStep, orderPriorityLabel, orderStates, validMaterialId } from './materials';
import { cabinetBoxLabel } from './piece-cabinet';
import { procedureNames, statusNames } from './validation';
import { readReportRows, type OperationalReport } from './operational-report';

type Client = Awaited<ReturnType<typeof createClient>>;
export type ReportKind = 'estoque' | 'pedidos' | 'pecas';

export function mayReadReport(kind: ReportKind, role: string) {
  return ['suporte', 'gestor', 'equipe'].includes(role) || (kind === 'pecas' && role === 'laboratorio');
}

function unitDirectory(client: Client) {
  return readReportRows((from, to) => client.from('units').select('id,name', { count: 'exact' }).order('name').order('id').range(from, to));
}

async function stockReport(client: Client, params: URLSearchParams): Promise<OperationalReport> {
  const filters = stockFilters(params.get('q') ?? '', params.get('category') ?? '');
  const [materials, groups, units] = await Promise.all([
    readReportRows((from, to) => stockQuery(client, filters).range(from, to)),
    readReportRows((from, to) => client.from('material_categories').select('id,name', { count: 'exact' }).order('id').range(from, to)),
    unitDirectory(client),
  ]);
  const unitId = params.get('unidade') ?? '';
  const selectedUnits = validMaterialId(unitId) ? units.filter(unit => unit.id === unitId) : units;
  if (unitId && !selectedUnits.length) throw new Error('Unidade indisponível.');
  const groupNames = new Map(groups.map(group => [group.id, group.name]));
  const rows: string[][] = [];
  for (let start = 0; start < materials.length; start += 100) {
    const batch = materials.slice(start, start + 100);
    const balances = await readReportRows((from, to) => {
      let query = client.from('material_stock').select('material_id,unit_id,quantity', { count: 'exact' }).in('material_id', batch.map(item => item.id));
      if (validMaterialId(unitId)) query = query.eq('unit_id', unitId);
      return query.order('material_id').order('unit_id').range(from, to);
    });
    const values = new Map(balances.map(balance => [balance.material_id + ':' + balance.unit_id, balance.quantity]));
    for (const item of batch) {
      const stock = selectedUnits.map(unit => {
        const quantity = values.get(item.id + ':' + unit.id);
        return unit.name + ': ' + (quantity == null ? 'Não lançado' : (materialQuantity.format(quantity) + ' ' + (item.purchase_unit ?? '')).trim());
      });
      rows.push([item.code, item.name + (item.review_note ? '\nConferir: ' + item.review_note : ''), item.variant || 'Não especificado',
        groupNames.get(item.category_id) ?? 'Não informada', stock.join('\n') || 'Não lançado']);
    }
  }
  return { title: 'Estoque de materiais', scope: [validMaterialId(unitId) ? selectedUnits[0].name : 'Todas as unidades',
    filters.category ? groupNames.get(filters.category) ?? 'Grupo selecionado' : 'Todos os grupos', filters.q && 'Busca: ' + filters.q].filter(Boolean).join(' · '),
    count: materials.length === 1 ? '1 material' : materials.length + ' materiais', headers: ['Código', 'Material', 'Tamanho / versão', 'Especialidade', 'Saldo por unidade'],
    widths: ['12%', '27%', '17%', '19%', '25%'], rows };
}

async function purchaseReport(client: Client, profile: Profile, params: URLSearchParams): Promise<OperationalReport> {
  const filters = orderFilters(params.get('situacao') ?? '', params.get('prioridade') ?? '', params.get('unidade') ?? '');
  const [orders, units] = await Promise.all([
    readReportRows((from, to) => orderQuery(client, filters).range(from, to)), unitDirectory(client),
  ]);
  const names = new Map(units.map(unit => [unit.id, unit.name]));
  const rows: string[][] = [];
  for (let start = 0; start < orders.length; start += 100) {
    const batch = orders.slice(start, start + 100);
    const items = await readReportRows((from, to) => client.from('material_order_items')
      .select('order_id,material_id,material_name,material_variant,measure,quantity,received', { count: 'exact' })
      .in('order_id', batch.map(order => order.id)).order('order_id').order('material_name').order('material_variant').order('material_id').range(from, to));
    for (const order of batch) {
      const base = [order.code + '\n' + materialDate.format(new Date(order.created_at)), names.get(order.unit_id) ?? '—',
        (orderStates[order.state] ?? order.state) + '\n' + orderNextStep(order.state, profile.role), orderPriorityLabel(order.priority), order.requested_by_name];
      const orderItems = items.filter(item => item.order_id === order.id);
      if (!orderItems.length) rows.push([...base, 'Sem itens', '—', '—', '—']);
      for (const item of orderItems) {
        rows.push([...base, [item.material_name, item.material_variant].filter(Boolean).join(' · ') + (item.measure ? ' (' + item.measure + ')' : ''),
          materialQuantity.format(item.quantity), materialQuantity.format(item.received), materialQuantity.format(item.quantity - item.received)]);
      }
    }
  }
  return { title: filters.state === 'comprado' ? 'Pedidos aguardando recebimento' : 'Pedidos de compra',
    scope: [filters.requestedUnit ? names.get(filters.requestedUnit) ?? 'Unidade selecionada' : 'Todas as unidades',
      orderStates[filters.state] ?? 'Todas as situações', filters.priority ? 'Prioridade ' + orderPriorityLabel(filters.priority) : 'Todas as prioridades'].join(' · '),
    count: orders.length === 1 ? '1 pedido' : orders.length + ' pedidos', headers: ['Pedido / data', 'Unidade', 'Situação / ação', 'Prioridade', 'Solicitante', 'Material', 'Pedido', 'Recebido', 'Pendente'],
    widths: ['14%', '10%', '13%', '8%', '12%', '24%', '6%', '6%', '7%'], rows };
}

async function pieceReport(client: Client, profile: Profile): Promise<OperationalReport> {
  const internal = profile.role !== 'laboratorio';
  const [pieces, labs, units] = await Promise.all([
    internal || profile.laboratory_id ? readReportRows((from, to) => {
      const query = pieceQuery(client, 'exact');
      if (!internal) query.eq('laboratory_id', profile.laboratory_id);
      return query.range(from, to);
    }) : [],
    readReportRows((from, to) => client.from('laboratories').select('id,name', { count: 'exact' }).order('id').range(from, to)),
    internal ? unitDirectory(client) : [],
  ]);
  const labNames = new Map(labs.map(lab => [lab.id, lab.name]));
  const unitNames = new Map(units.map(unit => [unit.id, unit.name]));
  const date = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
  return { title: 'Acompanhamento das peças', scope: internal ? 'Peças da clínica' : 'Peças atribuídas ao seu laboratório',
    count: pieces.length === 1 ? '1 peça' : pieces.length + ' peças', headers: ['Referência', 'Paciente', 'Peça / região', ...(internal ? ['Unidade / caixa'] : []), 'Laboratório', 'Situação', 'Próxima consulta', 'Prazo'],
    widths: internal ? ['13%', '16%', '14%', '12%', '14%', '12%', '11%', '8%'] : ['14%', '19%', '18%', '15%', '15%', '11%', '8%'],
    rows: pieces.map(piece => [piece.reference + (piece.priority ? '\nPrioridade' : ''), piece.patient_name,
      (procedureNames[piece.procedure_type] ?? piece.procedure_type) + '\n' + (piece.teeth?.join(', ') || piece.arch || 'Sem região'),
      ...(internal ? [[unitNames.get(piece.unit_id) ?? '—', 'Caixa: ' + (cabinetBoxLabel(piece.cabinet_box) ?? '—')].join('\n')] : []),
      labNames.get(piece.laboratory_id) ?? 'Não atribuído', statusNames[piece.status] ?? piece.status,
      piece.next_appointment_at ? materialDate.format(new Date(piece.next_appointment_at)) : 'Não informada',
      piece.expected_at ? date.format(new Date(piece.expected_at + 'T12:00:00Z')) : 'Não informado']) };
}

export function loadReport(kind: ReportKind, client: Client, profile: Profile, params: URLSearchParams) {
  if (kind === 'pecas') return pieceReport(client, profile);
  if (kind === 'pedidos') return purchaseReport(client, profile, params);
  return stockReport(client, params);
}
