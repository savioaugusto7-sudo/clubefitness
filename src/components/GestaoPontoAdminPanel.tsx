'use client';

import React, { useState, useEffect } from 'react';

interface GestaoPontoAdminPanelProps {
  onRefresh?: () => void;
}

const DIAS_SEMANA_NOMES = [
  { key: '0', label: 'Domingo' },
  { key: '1', label: 'Segunda-feira' },
  { key: '2', label: 'Terça-feira' },
  { key: '3', label: 'Quarta-feira' },
  { key: '4', label: 'Quinta-feira' },
  { key: '5', label: 'Sexta-feira' },
  { key: '6', label: 'Sábado' }
];

export default function GestaoPontoAdminPanel({}: GestaoPontoAdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<'registros' | 'escalas' | 'geolocalizacao'>('registros');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtros de Registros
  const [selectedProfFilter, setSelectedProfFilter] = useState<string>('todos');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [apenasAtrasosFilter, setApenasAtrasosFilter] = useState(false);

  // Gestão de Escalas: Profissional Selecionado
  const [selectedScheduleProfId, setSelectedScheduleProfId] = useState<string>('');
  const [diasSemanaConfig, setDiasSemanaConfig] = useState<Record<string, { ativo: boolean; horarioEntrada: string; horarioSaida: string; periodoNome: string }>>({});
  const [folgasEspecificas, setFolgasEspecificas] = useState<Array<{ id: string; data: string; motivo: string }>>([]);
  const [newFolgaData, setNewFolgaData] = useState('');
  const [newFolgaMotivo, setNewFolgaMotivo] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Gestão de Localização da Clínica
  const [clinicLat, setClinicLat] = useState('');
  const [clinicLng, setClinicLng] = useState('');
  const [clinicRadius, setClinicRadius] = useState('150');
  const [clinicNome, setClinicNome] = useState('Clube Fitness Fisio');
  const [clinicEndereco, setClinicEndereco] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);

  // Modal de Abono/Justificativa
  const [abonoModalRecord, setAbonoModalRecord] = useState<any | null>(null);
  const [abonoJustificativa, setAbonoJustificativa] = useState('');
  const [savingAbono, setSavingAbono] = useState(false);

  // Carregar dados administrativos
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        profissionalId: selectedProfFilter,
        mes: selectedMonth,
        apenasAtrasos: apenasAtrasosFilter ? 'true' : 'false'
      });
      const res = await fetch(`/api/admin/ponto?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);

        // Preencher dados de localização
        if (json.data.clinicLocation) {
          setClinicLat(String(json.data.clinicLocation.latitude || ''));
          setClinicLng(String(json.data.clinicLocation.longitude || ''));
          setClinicRadius(String(json.data.clinicLocation.radiusMeters || 150));
          setClinicNome(json.data.clinicLocation.nome || 'Clube Fitness Fisio');
          setClinicEndereco(json.data.clinicLocation.endereco || '');
        }

        // Selecionar primeiro profissional se ainda não houver selecionado
        if (!selectedScheduleProfId && json.data.professionals?.length > 0) {
          setSelectedScheduleProfId(json.data.professionals[0]._id);
        }
      } else {
        setError(json.error || 'Erro ao carregar dados de ponto.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProfFilter, selectedMonth, apenasAtrasosFilter]);

  // Atualizar formulário de escala quando muda o profissional selecionado
  useEffect(() => {
    if (!selectedScheduleProfId || !data?.schedules) return;

    const existingSchedule = (data.schedules || []).find((s: any) => String(s.profissionalId) === String(selectedScheduleProfId));

    if (existingSchedule) {
      setDiasSemanaConfig(existingSchedule.diasSemana || {});
      setFolgasEspecificas(existingSchedule.folgasEspecificas || []);
    } else {
      // Padrão
      const def: any = {
        '0': { ativo: false, horarioEntrada: '08:00', horarioSaida: '12:00', periodoNome: 'Domingo' },
        '1': { ativo: true, horarioEntrada: '08:00', horarioSaida: '14:00', periodoNome: 'Manhã' },
        '2': { ativo: true, horarioEntrada: '08:00', horarioSaida: '14:00', periodoNome: 'Manhã' },
        '3': { ativo: true, horarioEntrada: '08:00', horarioSaida: '14:00', periodoNome: 'Manhã' },
        '4': { ativo: true, horarioEntrada: '08:00', horarioSaida: '14:00', periodoNome: 'Manhã' },
        '5': { ativo: true, horarioEntrada: '08:00', horarioSaida: '14:00', periodoNome: 'Manhã' },
        '6': { ativo: false, horarioEntrada: '08:00', horarioSaida: '12:00', periodoNome: 'Sábado' }
      };
      setDiasSemanaConfig(def);
      setFolgasEspecificas([]);
    }
  }, [selectedScheduleProfId, data]);

  // Salvar Escala Semanal e Folgas
  const handleSaveSchedule = async () => {
    if (!selectedScheduleProfId) return;
    setSavingSchedule(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/admin/ponto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_schedule',
          profissionalId: selectedScheduleProfId,
          diasSemana: diasSemanaConfig,
          folgasEspecificas: folgasEspecificas
        })
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg(json.message || 'Escala salva com sucesso!');
        await fetchData();
      } else {
        setError(json.error || 'Erro ao salvar escala.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexão.');
    } finally {
      setSavingSchedule(false);
    }
  };

  // Adicionar Folga Específica
  const handleAddFolga = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolgaData) return;

    const newEntry = {
      id: String(Date.now()),
      data: newFolgaData,
      motivo: newFolgaMotivo || 'Folga combinada / Férias'
    };

    setFolgasEspecificas(prev => [...prev, newEntry]);
    setNewFolgaData('');
    setNewFolgaMotivo('');
  };

  const handleRemoveFolga = (id: string) => {
    setFolgasEspecificas(prev => prev.filter(f => f.id !== id));
  };

  // Salvar Localização da Clínica
  const handleSaveLocation = async () => {
    if (!clinicLat || !clinicLng) {
      alert('Por favor, informe a Latitude e a Longitude da clínica.');
      return;
    }
    setSavingLocation(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/admin/ponto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_clinic_location',
          clinicLocation: {
            latitude: Number(clinicLat),
            longitude: Number(clinicLng),
            radiusMeters: Number(clinicRadius) || 150,
            nome: clinicNome,
            endereco: clinicEndereco
          }
        })
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg('Localização da clínica salva com sucesso!');
        await fetchData();
      } else {
        setError(json.error || 'Erro ao salvar localização.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexão.');
    } finally {
      setSavingLocation(false);
    }
  };

  // Capturar Localização Atual do Administrador
  const handleCaptureCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não é suportada pelo seu navegador.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setClinicLat(String(pos.coords.latitude));
        setClinicLng(String(pos.coords.longitude));
        setSuccessMsg(`Coordenadas capturadas com sucesso! (Precisão: ±${Math.round(pos.coords.accuracy)}m). Clique em Salvar para confirmar.`);
      },
      (err) => {
        alert('Não foi possível capturar a localização atual. Verifique se o GPS está ativo e permitido.');
      },
      { enableHighAccuracy: true }
    );
  };

  // Salvar Abono de Atraso
  const handleConfirmAbono = async () => {
    if (!abonoModalRecord) return;
    setSavingAbono(true);
    try {
      const res = await fetch('/api/admin/ponto', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: abonoModalRecord._id,
          status: 'abonado',
          justificativaAdmin: abonoJustificativa || 'Abonado pela administração'
        })
      });
      const json = await res.json();
      if (json.success) {
        setAbonoModalRecord(null);
        setAbonoJustificativa('');
        setSuccessMsg('Atraso abonado com sucesso! Os pontos de débito foram removidos da tela de metas.');
        await fetchData();
      } else {
        alert(json.error || 'Erro ao abonar atraso.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro de conexão.');
    } finally {
      setSavingAbono(false);
    }
  };

  const professionals: any[] = data?.professionals || [];
  const records: any[] = data?.records || [];
  const selectedProfObj = professionals.find(p => p._id === selectedScheduleProfId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. CABEÇALHO DA VIEW */}
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', margin: 0 }}>
        <div className="view-title-group">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-user-clock" style={{ color: '#0d9488' }}></i> Controle de Ponto & Gestão de Escalas
          </h1>
          <p>Supervisão de presença, escalas de trabalho individuais, sinalização de folgas e perímetro GPS</p>
        </div>

        <button
          className="btn btn-outline"
          onClick={fetchData}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i> Atualizar
        </button>
      </div>

      {/* ALERTAS */}
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '12px 16px', color: '#f87171', fontSize: '0.85rem' }}>
          <strong>Atenção:</strong> {error}
        </div>
      )}
      {successMsg && (
        <div style={{ background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '10px', padding: '12px 16px', color: '#4ade80', fontSize: '0.85rem' }}>
          {successMsg}
        </div>
      )}

      {/* 2. NAVEGAÇÃO DE ABAS */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveSubTab('registros')}
          className={`btn ${activeSubTab === 'registros' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '8px 16px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <i className="fa-solid fa-list-check"></i> Registros de Ponto
        </button>

        <button
          onClick={() => setActiveSubTab('escalas')}
          className={`btn ${activeSubTab === 'escalas' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '8px 16px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <i className="fa-solid fa-calendar-days"></i> Escalas & Folgas por Profissional
        </button>

        <button
          onClick={() => setActiveSubTab('geolocalizacao')}
          className={`btn ${activeSubTab === 'geolocalizacao' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '8px 16px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <i className="fa-solid fa-location-dot"></i> Localização da Clínica (GPS)
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: REGISTROS DE PONTO */}
      {/* ========================================================================= */}
      {activeSubTab === 'registros' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Filtros da Tabela */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '200px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>Filtrar por Profissional:</label>
              <select
                className="form-control"
                value={selectedProfFilter}
                onChange={e => setSelectedProfFilter(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              >
                <option value="todos">Todos os Profissionais</option>
                {professionals.map(p => (
                  <option key={p._id} value={p._id}>{p.nome} ({p.especialidade})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>Mês de Referência:</label>
              <input
                type="month"
                className="form-control"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                style={{ padding: '7px 12px', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '18px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                <input
                  type="checkbox"
                  checked={apenasAtrasosFilter}
                  onChange={e => setApenasAtrasosFilter(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#f59e0b', cursor: 'pointer' }}
                />
                Mostrar apenas registros com atraso
              </label>
            </div>
          </div>

          {/* Tabela de Registros */}
          <div className="data-table-container" style={{ borderRadius: '12px', border: '1px solid var(--border-color)', padding: '16px' }}>
            {records.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-dim)' }}>
                <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: '2rem', marginBottom: '8px', opacity: 0.4 }}></i>
                <p style={{ margin: 0 }}>Nenhum registro de ponto encontrado com os filtros selecionados.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-dim)' }}>
                      <th style={{ padding: '10px' }}>Profissional</th>
                      <th style={{ padding: '10px' }}>Data</th>
                      <th style={{ padding: '10px' }}>Horário Entrada</th>
                      <th style={{ padding: '10px' }}>Previsto / Turno</th>
                      <th style={{ padding: '10px' }}>Atraso</th>
                      <th style={{ padding: '10px' }}>Débito na Meta</th>
                      <th style={{ padding: '10px' }}>Distância GPS</th>
                      <th style={{ padding: '10px' }}>Status</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r: any) => {
                      const parts = (r.data || '').split('-');
                      const dataFormatada = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : r.data;
                      const isAtrasado = r.minutosAtraso > 0;
                      const isAbonado = r.status === 'abonado';

                      return (
                        <tr key={r._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                          <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text-main)' }}>
                            {r.profissionalNome}
                          </td>
                          <td style={{ padding: '10px' }}>{dataFormatada}</td>
                          <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 700, color: '#ffffff' }}>
                            {r.horario}
                          </td>
                          <td style={{ padding: '10px', color: 'var(--text-dim)' }}>
                            {r.horarioEsperado || '08:00'} ({r.periodoCobertura || 'Manhã'})
                          </td>
                          <td style={{ padding: '10px' }}>
                            {isAtrasado ? (
                              <span style={{ color: '#fbbf24', fontWeight: 700 }}>
                                +{r.minutosAtraso} min
                              </span>
                            ) : (
                              <span style={{ color: '#4ade80', fontWeight: 600 }}>Pontual</span>
                            )}
                          </td>
                          <td style={{ padding: '10px' }}>
                            {isAtrasado ? (
                              isAbonado ? (
                                <span style={{ color: '#38bdf8', fontSize: '0.78rem', fontWeight: 700 }}>
                                  0 pts (Abonado)
                                </span>
                              ) : (
                                <span style={{ color: '#f87171', fontWeight: 800 }}>
                                  -{r.pontosDebito || r.minutosAtraso} pts
                                </span>
                              )
                            ) : (
                              <span style={{ color: 'var(--text-dim)' }}>0 pts</span>
                            )}
                          </td>
                          <td style={{ padding: '10px', fontSize: '0.76rem', color: 'var(--text-dim)' }}>
                            {r.localizacao?.distanciaMetros !== undefined ? `${r.localizacao.distanciaMetros}m` : '-'}
                          </td>
                          <td style={{ padding: '10px' }}>
                            {isAbonado ? (
                              <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700 }}>
                                Abonado
                              </span>
                            ) : isAtrasado ? (
                              <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '2px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700 }}>
                                Atraso
                              </span>
                            ) : (
                              <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '2px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700 }}>
                                Conforme
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            {isAtrasado && !isAbonado && (
                              <button
                                className="btn btn-outline"
                                onClick={() => {
                                  setAbonoModalRecord(r);
                                  setAbonoJustificativa('');
                                }}
                                style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: '#38bdf8', color: '#38bdf8' }}
                              >
                                <i className="fa-solid fa-hand-holding-hand"></i> Abonar Atraso
                              </button>
                            )}
                            {isAbonado && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }} title={r.justificativaAdmin}>
                                {r.justificativaAdmin || 'Abonado'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: ESCALAS & FOLGAS INDIVIDUAIS */}
      {/* ========================================================================= */}
      {activeSubTab === 'escalas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Seletor de Profissional */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-user-md" style={{ color: '#0d9488', fontSize: '1.2rem' }}></i>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Selecione o Profissional:
              </span>
            </div>

            <select
              className="form-control"
              value={selectedScheduleProfId}
              onChange={e => setSelectedScheduleProfId(e.target.value)}
              style={{ maxWidth: '320px', fontSize: '0.9rem', fontWeight: 600, padding: '8px 12px' }}
            >
              {professionals.map(p => (
                <option key={p._id} value={p._id}>{p.nome} — {p.especialidade}</option>
              ))}
            </select>

            <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
              Configurando escala individual de: <strong>{selectedProfObj?.nome}</strong>
            </span>
          </div>

          {/* Grid de Escala Semanal por Dia da Semana */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-calendar-week" style={{ color: '#38bdf8' }}></i> Escala Semanal & Horários de Entrada
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  Defina o horário de entrada esperado, saída e turno para cada dia da semana ou marque como Folga Semanal Fixa
                </p>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleSaveSchedule}
                disabled={savingSchedule}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 20px', fontWeight: 700 }}
              >
                {savingSchedule ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                Salvar Escala de {selectedProfObj?.nome}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              {DIAS_SEMANA_NOMES.map(dia => {
                const cfg = diasSemanaConfig[dia.key] || { ativo: dia.key !== '0' && dia.key !== '6', horarioEntrada: '08:00', horarioSaida: '14:00', periodoNome: 'Manhã' };

                const updateDia = (field: string, val: any) => {
                  setDiasSemanaConfig(prev => ({
                    ...prev,
                    [dia.key]: {
                      ...(prev[dia.key] || cfg),
                      [field]: val
                    }
                  }));
                };

                return (
                  <div
                    key={dia.key}
                    style={{
                      background: cfg.ativo ? 'rgba(255, 255, 255, 0.02)' : 'rgba(245, 158, 11, 0.04)',
                      border: cfg.ativo ? '1px solid var(--border-color)' : '1px solid rgba(245, 158, 11, 0.2)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    {/* Dia da Semana & Toggle de Folga */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '180px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={cfg.ativo}
                          onChange={e => updateDia('ativo', e.target.checked)}
                          style={{ width: '18px', height: '18px', accentColor: '#0d9488', cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: cfg.ativo ? 'var(--text-main)' : '#fbbf24' }}>
                          {dia.label}
                        </span>
                      </label>

                      {!cfg.ativo && (
                        <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                          FOLGA FIXA
                        </span>
                      )}
                    </div>

                    {/* Campos de Horário (se ativo) */}
                    {cfg.ativo ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Entrada Prevista:</span>
                          <input
                            type="time"
                            className="form-control"
                            value={cfg.horarioEntrada || '08:00'}
                            onChange={e => updateDia('horarioEntrada', e.target.value)}
                            style={{ padding: '4px 8px', fontSize: '0.85rem', width: '110px' }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Saída:</span>
                          <input
                            type="time"
                            className="form-control"
                            value={cfg.horarioSaida || '14:00'}
                            onChange={e => updateDia('horarioSaida', e.target.value)}
                            style={{ padding: '4px 8px', fontSize: '0.85rem', width: '110px' }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Turno:</span>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Manhã, Tarde..."
                            value={cfg.periodoNome || ''}
                            onChange={e => updateDia('periodoNome', e.target.value)}
                            style={{ padding: '4px 8px', fontSize: '0.85rem', width: '120px' }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                        Sem expediente neste dia (Não cobra ponto / Não gera débito)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seção de Folgas Específicas / Férias / Ausências Programadas */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-umbrella-beach" style={{ color: '#f59e0b' }}></i> Folgas Específicas & Férias Programadas
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                Cadastre datas avulsas de folga, férias ou dispensas específicas para {selectedProfObj?.nome}
              </p>
            </div>

            {/* Formulário para adicionar data de folga */}
            <form onSubmit={handleAddFolga} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Data da Folga:</label>
                <input
                  type="date"
                  className="form-control"
                  value={newFolgaData}
                  onChange={e => setNewFolgaData(e.target.value)}
                  required
                  style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Motivo / Justificativa:</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Férias, Folga compensatória, Congresso..."
                  value={newFolgaMotivo}
                  onChange={e => setNewFolgaMotivo(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-outline"
                style={{ padding: '7px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fa-solid fa-plus"></i> Adicionar Data de Folga
              </button>
            </form>

            {/* Lista de Folgas Cadastradas */}
            {folgasEspecificas.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontStyle: 'italic', padding: '8px 0' }}>
                Nenhuma folga específica cadastrada para este profissional.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {folgasEspecificas.map(f => (
                  <div
                    key={f.id}
                    style={{
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '0.82rem'
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#fbbf24' }}>{f.data}</span>
                    <span style={{ color: 'var(--text-main)' }}>{f.motivo}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFolga(f.id)}
                      style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.9rem' }}
                      title="Remover folga"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: LOCALIZAÇÃO DA CLÍNICA (GPS) */}
      {/* ========================================================================= */}
      {activeSubTab === 'geolocalizacao' && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '14px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          maxWidth: '750px'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-satellite-dish" style={{ color: '#0d9488' }}></i> Configuração do Perímetro GPS da Clínica
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
              O profissional só consegue registrar o ponto quando estiver dentro do raio de metros configurado aqui
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>Latitude da Clínica:</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: -19.9234"
                value={clinicLat}
                onChange={e => setClinicLat(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>Longitude da Clínica:</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: -43.9372"
                value={clinicLng}
                onChange={e => setClinicLng(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>Raio de Tolerância (em metros):</label>
              <input
                type="number"
                className="form-control"
                placeholder="150"
                value={clinicRadius}
                onChange={e => setClinicRadius(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.9rem' }}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Recomendado: 100m a 200m para precisão GPS indoor</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>Nome da Unidade / Sede:</label>
            <input
              type="text"
              className="form-control"
              value={clinicNome}
              onChange={e => setClinicNome(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>Endereço Completo:</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ex: Av. Principal, 1000 - Centro"
              value={clinicEndereco}
              onChange={e => setClinicEndereco(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '10px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleCaptureCurrentLocation}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderColor: '#38bdf8', color: '#38bdf8' }}
            >
              <i className="fa-solid fa-location-crosshairs"></i> Capturar Minha Localização Atual como Sede
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveLocation}
              disabled={savingLocation}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontWeight: 700 }}
            >
              {savingLocation ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
              Salvar Localização da Clínica
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE ABONO DE ATRASO */}
      {/* ========================================================================= */}
      {abonoModalRecord && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '500px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-hand-holding-hand" style={{ color: '#38bdf8' }}></i> Abonar Atraso de Ponto
              </h3>
              <button onClick={() => setAbonoModalRecord(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.2rem', cursor: 'pointer' }}>
                &times;
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: '1.5' }}>
              Ao abonar este registro, o atraso de <strong>{abonoModalRecord.minutosAtraso} minutos</strong> (e o respectivo débito de <strong>-{abonoModalRecord.pontosDebito || abonoModalRecord.minutosAtraso} pontos</strong>) será zerado na tela de Metas dos Profissionais.
            </p>

            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div><strong>Profissional:</strong> {abonoModalRecord.profissionalNome}</div>
              <div><strong>Data:</strong> {abonoModalRecord.data} às {abonoModalRecord.horario}</div>
              <div><strong>Horário Previsto:</strong> {abonoModalRecord.horarioEsperado}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>Justificativa do Abono:</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Ex: Trânsito atípico justificado / Atendimento externo prévio..."
                value={abonoJustificativa}
                onChange={e => setAbonoJustificativa(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setAbonoModalRecord(null)}
                style={{ padding: '8px 16px' }}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmAbono}
                disabled={savingAbono}
                style={{ padding: '8px 20px', background: '#0284c7', borderColor: '#0284c7', color: '#fff', fontWeight: 700 }}
              >
                {savingAbono ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                Confirmar Abono
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
