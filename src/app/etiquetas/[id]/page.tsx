import { notFound } from 'next/navigation';
import { requireProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { procedureNames } from '@/lib/validation';
import { PrintLabelButton } from '@/components/print-label-button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Etiqueta 60 × 40 | STERYA' };
const date = (raw: string | null) => raw
  ? new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(raw))
  : '__/__/____';

export default async function LabelPage({ params }: { params: Promise<{id:string}> }) {
  await requireProfile();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: piece } = await supabase.from('pieces')
    .select('id,patient_name,procedure_type,teeth,arch,reference,laboratory_reference,laboratory_id,sent_at,received_at,delivered_at')
    .eq('id',id).maybeSingle();
  if (!piece) notFound();
  const {data:lab} = await supabase.from('laboratories').select('name').eq('id',piece.laboratory_id).maybeSingle();
  return <>
    <style>{`
      body {background:#f1f3f8}
      .label-utility {max-width:620px; margin:20px auto;display:flex;gap:12px;align-items:center;justify-content:space-between;font:14px Arial}
      .print-label-button {background:#24449b;color:white;border:0;border-radius:8px;padding:12px 18px;cursor:pointer}
      .sterya-print-label {width:60mm;height:40mm;padding:1.7mm 2mm;box-sizing:border-box;background:#fff;color:#111;overflow:hidden;border:1px solid #ddd;margin:10px auto;font-family:Arial,Helvetica,sans-serif}
      .label-header {text-align:center;font-size:9px;font-weight:800;letter-spacing:.3px;padding-bottom:.7mm;border-bottom:1px solid #111;margin-bottom:1mm}
      .label-line {display:flex;justify-content:space-between;gap:1.4mm;line-height:1.28;font-size:7px;min-height:3mm}
      .label-line strong {font-weight:750}
      .label-line span {min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .label-patient {font-size:9px;font-weight:750;line-height:1.2;max-height:7mm;overflow:hidden;overflow-wrap:anywhere;margin:.4mm 0}
      .label-code {font-weight:750;font-size:8px}
      .label-dates {border-top:1px solid #111;margin-top:.8mm;padding-top:.6mm}
      .label-dates .label-line {font-size:7px}
      @page {size:60mm 40mm;margin:0}
      @media print{
        html,body {width:60mm;height:40mm;margin:0!important;padding:0!important;background:#fff!important}
        .label-utility {display:none!important}
        .sterya-print-label {border:none!important;margin:0!important;box-shadow:none!important}
      }
    `}</style>
    <div className="label-utility"><span>Prévia real da etiqueta 60 × 40 mm</span><PrintLabelButton /></div>
    <div className="sterya-print-label" aria-label="Etiqueta protética da Casal Odonto">
      <div className="label-header">CASAL ODONTO · CONTROLE PROTÉTICO</div>
      <div className="label-patient">{piece.patient_name}</div>
      <div className="label-line"><span><strong>PEÇA:</strong> {procedureNames[piece.procedure_type] ?? piece.procedure_type}</span><span><strong>DENTE:</strong> {piece.teeth?.join(',') || piece.arch || '—'}</span></div>
      <div className="label-line"><span><strong>LAB:</strong> {lab?.name ?? '—'}</span></div>
      <div className="label-line label-code"><span><strong>CO:</strong> {piece.reference}</span></div>
      <div className="label-line"><span><strong>CÓD. LAB:</strong> {piece.laboratory_reference || '__________________'}</span></div>
      <div className="label-dates">
        <div className="label-line"><span><strong>ENVIO:</strong> {date(piece.sent_at)}</span></div>
        <div className="label-line"><span><strong>CHEGOU CLÍNICA:</strong> {date(piece.received_at)}</span></div>
        <div className="label-line"><span><strong>ENTREGA PACIENTE:</strong> {date(piece.delivered_at)}</span></div>
      </div>
    </div>
  </>;
}
