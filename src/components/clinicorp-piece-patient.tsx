'use client';

import { useRef, useState } from 'react';
import { searchClinicorpPatient } from '@/app/actions/clinicorp';
import type { ClinicorpLookupResult, ClinicorpPatient } from '@/lib/clinicorp-lookup';

const errors: Record<Extract<ClinicorpLookupResult, { error: string }>['error'], string> = {
  invalid: 'Selecione a unidade e informe o nome completo ou o código numérico do paciente.',
  denied: 'Sua sessão ou seu acesso à unidade precisa ser conferido.',
  not_configured: 'O Clinicorp ainda precisa ser conectado para esta unidade no CPE.',
  busy: 'O Clinicorp recebeu muitas consultas. Tente novamente em instantes.',
  unavailable: 'O Clinicorp não respondeu à busca. Tente novamente ou preencha os campos manualmente.',
};

export function ClinicorpPiecePatient({ units }: { units: { id: string; name: string }[] }) {
  const [unit, setUnit] = useState('');
  const [term, setTerm] = useState('');
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [selected, setSelected] = useState<ClinicorpPatient | null>(null);
  const [response, setResponse] = useState<ClinicorpLookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const requestNumber = useRef(0);

  function clearSearch() {
    requestNumber.current++;
    setResponse(null);
    setLoading(false);
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
      {selected && <p className="notice success" role="status">Paciente selecionado no Clinicorp: {selected.name} · ID {selected.id}</p>}
      {response && 'error' in response && <p className="notice error" role="alert">{errors[response.error]}</p>}
      {response && 'patients' in response && (
        response.patients.length ? <ul className="operations-patient-results" aria-label="Pacientes encontrados">
          {response.patients.map(patient => <li key={patient.id}>
            <button type="button" className="button secondary" onClick={() => {
              setName(patient.name);
              setId(patient.id);
              setSelected(patient);
              setResponse(null);
            }}>
              {patient.name} <small>ID {patient.id}</small>
            </button>
          </li>)}
        </ul> : <p className="operations-muted" role="status">Nenhum paciente encontrado. Tente o nome completo ou o ID do Clinicorp.</p>
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
          }
        }} />
    </div>
    <div className="field">
      <label htmlFor="clinicorp_patient_id">ID do paciente no Clinicorp</label>
      <input id="clinicorp_patient_id" name="clinicorp_patient_id" maxLength={120} autoComplete="off"
        value={id} onChange={event => { setId(event.target.value); setSelected(null); }} />
    </div>
  </>;
}
