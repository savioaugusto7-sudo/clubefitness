'use client';

import React, { useState, useEffect, useRef } from 'react';

interface RegistroPontoPanelProps {
  professionalId?: string;
}

export default function RegistroPontoPanel({ professionalId }: RegistroPontoPanelProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Relógio digital em tempo real
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateFormatted, setCurrentDateFormatted] = useState<string>('');

  // Geolocalização
  const [gpsStatus, setGpsStatus] = useState<'verificando' | 'dentro' | 'fora' | 'erro'>('verificando');
  const [gpsDistance, setGpsDistance] = useState<number | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string>('');

  const watchIdRef = useRef<number | null>(null);

  // Atualizador do relógio a cada segundo
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
      setCurrentDateFormatted(dateStr.charAt(0).toUpperCase() + dateStr.slice(1));
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Carregar dados de ponto do profissional
  const fetchData = async () => {
    if (!professionalId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ponto?professionalId=${professionalId}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Erro ao carregar dados do ponto.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [professionalId]);

  // Cálculo de distância de Haversine no frontend
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // Monitorar geolocalização do dispositivo
  const checkGeolocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('erro');
      setGpsErrorMsg('Geolocalização não é suportada pelo seu navegador/dispositivo.');
      return;
    }

    setGpsStatus('verificando');
    setGpsErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGpsCoords({ latitude, longitude, accuracy });

        const clinicLoc = data?.clinicLocation;
        if (clinicLoc && clinicLoc.latitude && clinicLoc.longitude) {
          const dist = calculateDistance(latitude, longitude, clinicLoc.latitude, clinicLoc.longitude);
          setGpsDistance(dist);
          const maxRadius = clinicLoc.radiusMeters || 150;
          if (dist <= maxRadius) {
            setGpsStatus('dentro');
          } else {
            setGpsStatus('fora');
          }
        } else {
          // Sem coordenadas da clínica cadastradas -> permite
          setGpsStatus('dentro');
          setGpsDistance(0);
        }
      },
      (err) => {
        setGpsStatus('erro');
        if (err.code === 1) {
          setGpsErrorMsg('Permissão de GPS negada. Por favor, permita o acesso à sua localização para registrar o ponto.');
        } else if (err.code === 2) {
          setGpsErrorMsg('Sinal de GPS indisponível no momento. Tente novamente em alguns instantes.');
        } else {
          setGpsErrorMsg('Tempo limite para obter localização GPS.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (data?.clinicLocation) {
      checkGeolocation();
    }
  }, [data]);

  // Ação de registrar ponto
  const handleRegistrarPonto = async () => {
    if (!professionalId) return;

    if (gpsStatus === 'fora') {
      alert(`Você está fora do perímetro da clínica (${gpsDistance}m de distância). Aproxime-se para registrar o ponto.`);
      return;
    }

    if (gpsStatus === 'erro' || !gpsCoords) {
      alert('Não foi possível obter sua localização GPS. Verifique se o GPS está ativado e tente novamente.');
      checkGeolocation();
      return;
    }

    const confirmMsg = data?.hoje?.isFolga
      ? 'Hoje consta como seu dia de folga na escala. Deseja confirmar o registro de ponto avulso?'
      : 'Confirma o registro de ponto de entrada para agora?';

    if (!window.confirm(confirmMsg)) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/ponto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profissionalId: professionalId,
          latitude: gpsCoords.latitude,
          longitude: gpsCoords.longitude,
          accuracy: gpsCoords.accuracy,
          dispositivoInfo: typeof navigator !== 'undefined' ? navigator.userAgent : ''
        })
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(json.message || 'Ponto registrado com sucesso!');
        await fetchData();
      } else {
        setError(json.error || 'Erro ao registrar ponto.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexão ao enviar registro.');
    } finally {
      setSubmitting(false);
    }
  };

  const hoje = data?.hoje;
  const registroHoje = hoje?.registroHoje;
  const clinicLoc = data?.clinicLocation;
  const monthRecords: any[] = data?.monthRecords || [];
  const resumoMes = data?.resumoMes || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* 1. CABEÇALHO DA PÁGINA */}
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', margin: 0 }}>
        <div className="view-title-group">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-fingerprint" style={{ color: '#0d9488' }}></i> Registro de Ponto Eletrônico
          </h1>
          <p>Presença digital validada por geolocalização com acompanhamento de pontualidade e metas</p>
        </div>

        <button
          className="btn btn-outline"
          onClick={() => {
            fetchData();
            checkGeolocation();
          }}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i> Atualizar Dados
        </button>
      </div>

      {/* ALERTAS DE SUCESSO OU ERRO */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '14px 18px',
          color: '#f87171',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.88rem'
        }}>
          <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '1.2rem' }}></i>
          <div>
            <strong>Atenção:</strong> {error}
          </div>
        </div>
      )}

      {successMsg && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.12)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '12px',
          padding: '14px 18px',
          color: '#4ade80',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.88rem'
        }}>
          <i className="fa-solid fa-circle-check" style={{ fontSize: '1.2rem' }}></i>
          <div>{successMsg}</div>
        </div>
      )}

      {/* 2. CARD PRINCIPAL: RELÓGIO DIGITAL & BATIDA DE PONTO */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.08), rgba(15, 23, 42, 0.6))',
        border: '1px solid rgba(13, 148, 136, 0.25)',
        borderRadius: '16px',
        padding: '28px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        alignItems: 'center',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)'
      }}>
        
        {/* Coluna Esquerda: Relógio & Data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0d9488', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <i className="fa-regular fa-clock"></i> Horário Oficial de Brasília
          </div>
          
          <div style={{
            fontSize: '3.2rem',
            fontWeight: 800,
            fontFamily: 'monospace',
            color: 'var(--text-main)',
            letterSpacing: '2px',
            lineHeight: 1.1,
            textShadow: '0 0 20px rgba(13, 148, 136, 0.3)'
          }}>
            {currentTime || '--:--:--'}
          </div>

          <div style={{ fontSize: '0.95rem', color: 'var(--text-dim)', fontWeight: 500 }}>
            {currentDateFormatted || 'Carregando data...'}
          </div>

          {/* Status da Escala do Dia */}
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {hoje?.isFolga ? (
              <span style={{
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <i className="fa-solid fa-umbrella-beach"></i> Dia de Folga: {hoje?.motivoFolga || 'Sem expediente programado'}
              </span>
            ) : (
              <span style={{
                background: 'rgba(13, 148, 136, 0.15)',
                color: '#2dd4bf',
                border: '1px solid rgba(13, 148, 136, 0.3)',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <i className="fa-solid fa-business-time"></i> Entrada Prevista: {hoje?.horarioEsperado || '08:00'} • Turno {hoje?.periodoNome || 'Manhã'} ({hoje?.horarioEsperado} às {hoje?.horarioSaida})
              </span>
            )}
          </div>
        </div>

        {/* Coluna Direita: Status de GPS & Ação de Ponto */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: 'rgba(0, 0, 0, 0.25)',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          
          {/* Card de Status de Geolocalização */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-location-dot" style={{
                color: gpsStatus === 'dentro' ? '#22c55e' : gpsStatus === 'fora' ? '#ef4444' : '#f59e0b'
              }}></i>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {gpsStatus === 'dentro' && `🟢 Dentro da clínica (${gpsDistance}m de distância)`}
                {gpsStatus === 'fora' && `🔴 Fora do perímetro (${gpsDistance}m de distância)`}
                {gpsStatus === 'verificando' && '🟡 Verificando sinal de GPS...'}
                {gpsStatus === 'erro' && '⚠️ Falha no sinal de GPS'}
              </span>
            </div>

            <button
              onClick={checkGeolocation}
              style={{
                background: 'none',
                border: 'none',
                color: '#38bdf8',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Rechecar GPS
            </button>
          </div>

          {gpsErrorMsg && (
            <div style={{ fontSize: '0.78rem', color: '#f87171', lineHeight: '1.4' }}>
              {gpsErrorMsg}
            </div>
          )}

          {clinicLoc && (
            <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>
              Raio de tolerância da clínica: <strong>{clinicLoc.radiusMeters || 150} metros</strong>
            </div>
          )}

          {/* Se já registrou ponto hoje: Exibe comprovante */}
          {registroHoje ? (
            <div style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1.5px solid rgba(34, 197, 94, 0.35)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase' }}>
                  <i className="fa-solid fa-circle-check"></i> Ponto Registrado Hoje
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                  ID: #{String(registroHoje._id).slice(-6).toUpperCase()}
                </span>
              </div>

              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', fontFamily: 'monospace' }}>
                {registroHoje.horario}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.82rem' }}>
                {registroHoje.minutosAtraso > 0 ? (
                  <span style={{
                    color: '#fbbf24',
                    background: 'rgba(245, 158, 11, 0.2)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 700
                  }}>
                    ⚠️ {registroHoje.minutosAtraso} min de atraso ({registroHoje.status === 'abonado' ? '0 pts - Abonado' : `-${registroHoje.pontosDebito} pts na meta`})
                  </span>
                ) : (
                  <span style={{
                    color: '#4ade80',
                    background: 'rgba(34, 197, 94, 0.2)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 700
                  }}>
                    ✨ No horário (0 débitos)
                  </span>
                )}

                <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                  Distância GPS: {registroHoje.localizacao?.distanciaMetros || 0}m
                </span>
              </div>
            </div>
          ) : (
            /* Botão Principal de Registrar Ponto */
            <button
              onClick={handleRegistrarPonto}
              disabled={submitting || gpsStatus === 'fora' || gpsStatus === 'erro'}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '16px 24px',
                fontSize: '1.05rem',
                fontWeight: 800,
                borderRadius: '12px',
                background: gpsStatus === 'dentro'
                  ? 'linear-gradient(135deg, #0d9488, #0f766e)'
                  : 'rgba(255, 255, 255, 0.1)',
                color: gpsStatus === 'dentro' ? '#ffffff' : 'var(--text-dim)',
                cursor: (submitting || gpsStatus === 'fora' || gpsStatus === 'erro') ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: gpsStatus === 'dentro' ? '0 4px 20px rgba(13, 148, 136, 0.4)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {submitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Validando Localização & Registrando...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-fingerprint" style={{ fontSize: '1.2rem' }}></i> Registrar Ponto de Entrada
                </>
              )}
            </button>
          )}

        </div>

      </div>

      {/* 3. CARDS DE RESUMO DO MÊS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        
        <div className="stat-card" style={{ padding: '18px 20px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>Dias Trabalhados no Mês</span>
            <i className="fa-solid fa-calendar-check" style={{ color: '#0d9488', fontSize: '1.1rem' }}></i>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '6px' }}>
            {resumoMes.totalDiasTrabalhados || 0} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-dim)' }}>dias</span>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '18px 20px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>Minutos Totais de Atraso</span>
            <i className="fa-solid fa-stopwatch" style={{ color: '#f59e0b', fontSize: '1.1rem' }}></i>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: resumoMes.totalAtrasosMinutos > 0 ? '#fbbf24' : '#22c55e', marginTop: '6px' }}>
            {resumoMes.totalAtrasosMinutos || 0} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-dim)' }}>min</span>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '18px 20px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>Débito na Tela de Metas</span>
            <i className="fa-solid fa-trophy" style={{ color: '#ef4444', fontSize: '1.1rem' }}></i>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: resumoMes.totalDebitosPontos > 0 ? '#f87171' : '#22c55e', marginTop: '6px' }}>
            -{resumoMes.totalDebitosPontos || 0} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-dim)' }}>pts</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Regra: 1 ponto por minuto de atraso
          </div>
        </div>

      </div>

      {/* 4. HISTÓRICO DE BATIDAS DO MÊS */}
      <div className="data-table-container" style={{ borderRadius: '14px', border: '1px solid var(--border-color)', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-clock-rotate-left" style={{ color: '#38bdf8' }}></i> Histórico de Registros do Mês
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Comprovantes de entrada diária com geolocalização e pontualidade
            </p>
          </div>
        </div>

        {monthRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-dim)' }}>
            <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '2rem', marginBottom: '10px', opacity: 0.4 }}></i>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Nenhum registro de ponto encontrado para este mês.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-dim)' }}>
                  <th style={{ padding: '12px 10px' }}>Data</th>
                  <th style={{ padding: '12px 10px' }}>Horário Entrada</th>
                  <th style={{ padding: '12px 10px' }}>Previsto / Turno</th>
                  <th style={{ padding: '12px 10px' }}>Pontualidade</th>
                  <th style={{ padding: '12px 10px' }}>Impacto Metas</th>
                  <th style={{ padding: '12px 10px' }}>Localização GPS</th>
                  <th style={{ padding: '12px 10px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {monthRecords.map((r: any) => {
                  const parts = (r.data || '').split('-');
                  const dataFormatada = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : r.data;
                  const isAtrasado = r.minutosAtraso > 0;
                  const isAbonado = r.status === 'abonado';

                  return (
                    <tr key={r._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--text-main)' }}>
                        {dataFormatada}
                      </td>
                      <td style={{ padding: '12px 10px', fontFamily: 'monospace', fontWeight: 700, color: '#ffffff' }}>
                        {r.horario}
                      </td>
                      <td style={{ padding: '12px 10px', color: 'var(--text-dim)' }}>
                        {r.horarioEsperado || '08:00'} ({r.periodoCobertura || 'Manhã'})
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        {isAtrasado ? (
                          <span style={{ color: '#fbbf24', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <i className="fa-solid fa-clock"></i> +{r.minutosAtraso} min
                          </span>
                        ) : (
                          <span style={{ color: '#4ade80', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <i className="fa-solid fa-check"></i> Pontual
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
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
                      <td style={{ padding: '12px 10px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                        {r.localizacao?.distanciaMetros !== undefined ? `${r.localizacao.distanciaMetros}m da clínica` : 'GPS Registrado'}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        {isAbonado ? (
                          <span style={{
                            background: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            Abonado
                          </span>
                        ) : isAtrasado ? (
                          <span style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            Atraso
                          </span>
                        ) : (
                          <span style={{
                            background: 'rgba(34, 197, 94, 0.15)',
                            color: '#4ade80',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            Conforme
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
  );
}
