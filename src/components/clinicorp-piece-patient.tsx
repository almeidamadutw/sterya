'use client';

import { useRef, useState, type ReactNode } from 'react';
import { getClinicorpPieceProcedures, searchClinicorpPatient } from '@/app/actions/clinicorp';
import type { ClinicorpLookupResult, ClinicorpPatient } from '@/lib/clinicorp-lookup';
import {
  appointmentInputValue, parsePieceTeeth, pieceRoutingLabel, suggestPieceLaboratory,
  type ClinicorpPieceCandidate, type ClinicorpProcedureResult, type PieceProcedureType,
} from '@/lib/piece-routing';
import { procedureNames } from '@/lib/validation';

const errors: Record<Extract<ClinicorpProcedureResult, { error: string }>['error'], string> = {
  invalid: 'Selecione a unidade e informe o nome completo ou o código numérico do paciente.',
  denied: 'Sua sessão ou seu acesso à unidade precisa ser conferido.',
  not_configured: 'A unidade está sem uma configuração completa do Clinicorp nos Secrets do Supabase.',
  credentials_rejected: 'O Clinicorp recusou as credenciais desta unidade. Confira o usuário, token e assinante.',
  busy: 'O Clinicorp recebeu muitas consultas. Tente novamente em instantes.',
  unavailable: 'O Clinicorp não respondeu à busca. Tente novamente ou preencha os campos manualmente.',
  unit_unmapped: 'O Clinicorp não retornou uma clínica única para esta unidade. Preencha os campos da peça manualmente.',
};

type Laboratory = { id: string; name: string; active: boolean };

export function ClinicorpPiecePatient({ units, laboratories, children }: {
  units: { id: string; name: string }[];
  laboratories: Laboratory[];
  children: ReactNode;
}) {
  const [unit, setUnit] = useState('');
  const [term, setTerm] = useState('');
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [selected, setSelected] = useState<ClinicorpPatient | null>(null);
  const [response, setResponse] = useState<ClinicorpLookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const requestNumber = useRef(0);
  const detailsRequest = useRef(0);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [details, setDetails] = useState<ClinicorpProcedureResult | null>(null);
  const [candidate, setCandidate] = useState<ClinicorpPieceCandidate | null>(null);
  const [procedure, setProcedure] = useState<PieceProcedureType | ''>('');
  const [teeth, setTeeth] = useState('');
  const [arch, setArch] = useState('');
  const [pprStage, setPprStage] = useState('');
  const [override, setOverride] = useState<string | null>(null);
  const [appointment, setAppointment] = useState('');

  const label = pieceRoutingLabel(procedure, candidate?.label ?? '', pprStage);
  const suggestedLab = procedure
    ? suggestPieceLaboratory(procedure, label, parsePieceTeeth(teeth), laboratories) : null;
  const laboratory = override ?? suggestedLab ?? '';
  const changedSuggestion = Boolean(suggestedLab && laboratory && suggestedLab !== laboratory);
  const automaticAppointment = details && 'nextAppointment' in details
    ? appointmentInputValue(details.nextAppointment) : '';

  function clearSearch() {
    requestNumber.current++;
    setResponse(null);
    setLoading(false);
  }

  function clearDetails() {
    detailsRequest.current++;
    setLoadingDetails(false);
    setDetails(null);
    setCandidate(null);
    setProcedure('');
    setTeeth('');
    setArch('');
    setPprStage('');
    setOverride(null);
    setAppointment('');
  }

  function applyProcedure(item: ClinicorpPieceCandidate) {
    setCandidate(item);
    setProcedure(item.type);
    setTeeth(item.teeth.join(', '));
    setArch(item.arch ?? '');
    setPprStage('');
    setOverride(null);
  }

  async function pickPatient(patient: ClinicorpPatient) {
    setName(patient.name);
    setId(patient.id);
    setSelected(patient);
    setResponse(null);
    clearDetails();
    const request = ++detailsRequest.current;
    setLoadingDetails(true);
    try {
      const result = await getClinicorpPieceProcedures(unit, patient.id);
      if (request !== detailsRequest.current) return;
      setDetails(result);
      if ('procedures' in result) {
        setAppointment(appointmentInputValue(result.nextAppointment));
        if (result.procedures.length === 1) applyProcedure(result.procedures[0]);
      }
    } catch {
      if (request === detailsRequest.current) setDetails({ error: 'unavailable' });
    } finally {
      if (request === detailsRequest.current) setLoadingDetails(false);
    }
  }

  async function search() {
    const request = ++requestNumber.current;
    setResponse(null);
    setLoading(true);
    try {
      const result = await searchClinicorpPatient(unit, term);
      if (request === requestNumber.current) setResponse(result);
    } catch {
      if (request === requestNumber.current) setResponse({ error: 'unavailable' });
    } finally {
      if (request === requestNumber.current) setLoading(false);
    }
  }

  return <>
    <div className="field">
      <label htmlFor="unit_id">Unidade *</label>
      <select name="unit_id" id="unit_id" required value={unit} onChange={event => {
        setUnit(event.target.value);
        clearSearch();
        clearDetails();
        if (selected) {
          setSelected(null);
          setName('');
          setId('');
        }
      }}>
        <option value="">Selecione</option>
        {units.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </div>
    <div className="operations-patient-lookup">
      <div className="operations-patient-search">
        <div className="field">
          <label htmlFor="clinicorp_patient_search">Paciente no Clinicorp</label>
          <input id="clinicorp_patient_search" maxLength={160} autoComplete="off" value={term}
            placeholder="Nome completo ou ID do Clinicorp" onChange={event => {
              setTerm(event.target.value);
              clearSearch();
            }} onKeyDown={event => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault();
                if (!loading && unit && term.trim()) void search();
              }
            }} />
        </div>
        <button type="button" className="button secondary" onClick={search} disabled={loading || !unit || !term.trim()}>
          {loading ? 'Buscando…' : 'Buscar no Clinicorp'}
        </button>
      </div>
      {!unit && <p className="operations-muted">Selecione a unidade para buscar.</p>}
      {selected && <p className="notice success" role="status">Paciente selecionado: {selected.name} · ID {selected.id}</p>}
      {response && 'error' in response && <p className="notice error" role="alert">{errors[response.error]}</p>}
      {response && 'patients' in response && (
        response.patients.length ? <ul className="operations-patient-results" aria-label="Pacientes encontrados">
          {response.patients.map(patient => <li key={patient.id}>
            <button type="button" className="button secondary" onClick={() => void pickPatient(patient)}>
              {patient.name} <small>ID {patient.id}</small>
            </button>
          </li>)}
        </ul> : <p className="operations-muted" role="status">Nenhum paciente encontrado. Tente pelo nome completo ou ID.</p>
      )}
    </div>
    <div className="field">
      <label htmlFor="patient_name">Nome completo do paciente *</label>
      <input id="patient_name" name="patient_name" minLength={2} maxLength={160} required autoComplete="off"
        value={name} onChange={event => {
          setName(event.target.value);
          if (selected) {
            setSelected(null);
            setId('');
            clearDetails();
          }
        }} />
    </div>
    <div className="field">
      <label htmlFor="clinicorp_patient_id">ID do paciente no Clinicorp</label>
      <input id="clinicorp_patient_id" name="clinicorp_patient_id" maxLength={120} autoComplete="off"
        value={id} onChange={event => {
          setId(event.target.value);
          if (selected) {
            setSelected(null);
            clearDetails();
          }
        }} />
      <small>Vínculo com o cadastro do paciente.</small>
    </div>
    {loadingDetails && <p className="operations-patient-lookup operations-muted" role="status">Buscando procedimentos e próxima consulta…</p>}
    {details && 'error' in details && <p className="operations-patient-lookup notice error" role="alert">{errors[details.error]}</p>}
    {details && 'procedures' in details && <>
      {details.procedures.length > 1 && <div className="operations-patient-lookup field">
        <label htmlFor="clinicorp_piece_procedure">Procedimentos encontrados no Clinicorp</label>
        <select id="clinicorp_piece_procedure" value={candidate?.id ?? ''} onChange={event => {
          const item = details.procedures.find(option => option.id === event.target.value);
          if (item) applyProcedure(item);
        }}>
          <option value="" disabled>Escolha o procedimento desta peça</option>
          {details.procedures.map(item => <option key={item.id} value={item.id}>
            {item.label}{item.teeth.length ? ' · Dente(s) ' + item.teeth.join(', ') : ''}
            {item.arch ? ' · Arcada ' + item.arch : ''}
            {item.date ? ' · ' + item.date.split('-').reverse().join('/') : ''}
          </option>)}
        </select>
      </div>}
      {!details.procedures.length && <p className="operations-patient-lookup operations-muted" role="status">
        Nenhum procedimento de peça encontrado. Selecione o procedimento abaixo.
      </p>}
    </>}
    <input type="hidden" name="clinicorp_procedure_label" value={candidate?.label ?? ''} />
    <div className="field">
      <label htmlFor="procedure_type">Procedimento *</label>
      <select id="procedure_type" name="procedure_type" required disabled={loadingDetails} value={procedure}
        onChange={event => {
          const value = event.target.value as PieceProcedureType | '';
          setProcedure(value);
          if (candidate) {
            setTeeth('');
            setArch('');
          }
          setCandidate(null);
          setPprStage(value === 'ppr' ? 'completa' : '');
          setOverride(null);
        }}>
        <option value="">Selecione</option>
        {Object.entries(procedureNames).map(([key, display]) => <option key={key} value={key}>{display}</option>)}
      </select>
      {candidate && <small>Clinicorp: {candidate.label} · {candidate.source === 'agenda' ? 'Agenda' : 'Orçamento aprovado'}</small>}
    </div>
    <div className="field">
      <label htmlFor="laboratory_id">Laboratório *</label>
      <select id="laboratory_id" name="laboratory_id" required disabled={loadingDetails} value={laboratory}
        onChange={event => setOverride(event.target.value === suggestedLab ? null : event.target.value)}>
        <option value="">Selecione</option>
        {laboratories.filter(item => item.active).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      {suggestedLab && !changedSuggestion && <small>Preenchido pela regra do procedimento.</small>}
      {procedure === 'ppf_lente' && !suggestedLab && <small>Informe os dentes para identificar a região anterior ou posterior.</small>}
    </div>
    {changedSuggestion && <div className="field">
      <label htmlFor="laboratory_override_reason">Motivo para trocar o laboratório *</label>
      <input id="laboratory_override_reason" name="laboratory_override_reason" required minLength={3} maxLength={200} />
    </div>}
    {procedure === 'ppr' && <div className="field">
      <label htmlFor="piece_stage">Etapa da PPR</label>
      <select id="piece_stage" name="piece_stage" value={pprStage} onChange={event => {
        setPprStage(event.target.value);
        setOverride(null);
      }}>
        {candidate && <option value="">Conforme o Clinicorp</option>}
        <option value="completa">PPR completa</option>
        <option value="infraestrutura">Infraestrutura / armação</option>
      </select>
    </div>}
    <div className="field">
      <label htmlFor="teeth">Dente(s) ou região</label>
      <input id="teeth" name="teeth" maxLength={120} placeholder="11, 12, 21" value={teeth}
        disabled={loadingDetails} onChange={event => {
          setTeeth(event.target.value);
          setOverride(null);
        }} />
      <small>Separe os dentes por vírgula. Cada peça deve ter seu próprio registro.</small>
    </div>
    <div className="field">
      <label htmlFor="arch">Arcada</label>
      <select name="arch" id="arch" value={arch} disabled={loadingDetails} onChange={event => setArch(event.target.value)}>
        <option value="">Não se aplica</option>
        <option value="superior">Superior</option>
        <option value="inferior">Inferior</option>
        <option value="ambas">Ambas</option>
      </select>
    </div>
    <div className="field">
      <label htmlFor="next_appointment_at">Próxima consulta</label>
      <input id="next_appointment_at" name="next_appointment_at" type="datetime-local" value={appointment}
        disabled={loadingDetails} onChange={event => setAppointment(event.target.value)} />
      {appointment && appointment === automaticAppointment && <small>Consulta da unidade selecionada no Clinicorp.</small>}
      {details && 'nextAppointment' in details && !automaticAppointment && <small>Nenhuma consulta encontrada nos próximos 12 meses.</small>}
    </div>
    {children}
    <div className="operations-actions">
      <button type="submit" className="button primary" disabled={loadingDetails}>Salvar peça no banco</button>
    </div>
  </>;
}
