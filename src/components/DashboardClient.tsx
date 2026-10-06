'use client';

import { useSession } from 'next-auth/react';
import React, { useEffect, useState, useMemo } from 'react';
import Pagination from './Pagination';
import { downloadReportPDF, downloadAssessmentPDF, downloadStrengthTestPDF } from '@/utils/pdfGenerator';
import { RITMO_OPTIONS } from '@/utils/workoutTimeEngine';
import { processStudentEvolution } from '@/utils/studentEvolutionEngine';
import EvolutionMetricCard from './evolution/EvolutionMetricCard';
import EvolutionSplineChart from './evolution/EvolutionSplineChart';
import EvolutionSymmetryGauge from './evolution/EvolutionSymmetryGauge';

interface DashboardClientProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  clientId?: string;
}

const formatDateBR = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const formatMonthYearBR = (myStr: string) => {
  if (!myStr) return '';
  const parts = myStr.split('-');
  if (parts.length === 2) {
    return `${parts[1]}/${parts[0]}`;
  }
  return myStr;
};

const formatDateISO = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function DashboardClient({ activeTab, setActiveTab, clientId }: DashboardClientProps) {
  const { data: session } = useSession();
  const [client, setClient] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking states
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('');
  const [bookService, setBookService] = useState('Treino Monitorado');
  const [bookType, setBookType] = useState<'academia' | 'consultorio'>('academia');
  const [bookingStatusMsg, setBookingStatusMsg] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Workout, Assessments, and Reports states for new views
  const [workout, setWorkout] = useState<any>(null);
  const [clientWorkoutCategory, setClientWorkoutCategory] = useState<'monitorado' | 'livre'>('monitorado');
  const [selectedFichaFilter, setSelectedFichaFilter] = useState<string>('AUTO');
  const [collapsedFichas, setCollapsedFichas] = useState<Record<string, boolean>>({});
  const [workoutCyclesHistory, setWorkoutCyclesHistory] = useState<any[]>([]);
  const [showCyclesHistory, setShowCyclesHistory] = useState(false);
  const [expandedCycleId, setExpandedCycleId] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [strengthTests, setStrengthTests] = useState<any[]>([]);
  const [selectedExerciseForInstruction, setSelectedExerciseForInstruction] = useState<any>(null);

  // Trancamento States
  const [trancamentosList, setTrancamentosList] = useState<any[]>([]);
  const [trancamentoSemanas, setTrancamentoSemanas] = useState<number>(1);
  const [trancamentoDataInicio, setTrancamentoDataInicio] = useState<string>('');
  const [trancamentoRedistribuicao, setTrancamentoRedistribuicao] = useState<Record<string, number>>({});
  const [trancamentoSuccessMsg, setTrancamentoSuccessMsg] = useState<string>('');
  const [trancamentoErrorMsg, setTrancamentoErrorMsg] = useState<string>('');

  // Sub-tabs & viewMode for evolution
  const [evoSubTab, setEvoSubTab] = useState<string>('composicao');
  const [evoViewMode, setEvoViewMode] = useState<'recente' | 'historico'>('recente');
  const [wellnessLogs, setWellnessLogs] = useState<any[]>([]);

  const getSchedulingLimitDate = () => {
    const now = new Date();
    // Forçar cálculo no fuso horário do Brasil/São Paulo
    const utcStr = now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
    const localNow = new Date(utcStr);

    const todayDayOfWeek = localNow.getDay(); // 0 = Dom, 1 = Seg, ..., 5 = Sex, 6 = Sáb
    const todayHours = localNow.getHours();

    // Sábado da semana atual
    const daysUntilSaturday = 6 - todayDayOfWeek;
    const currentSaturday = new Date(localNow);
    currentSaturday.setDate(localNow.getDate() + daysUntilSaturday);
    currentSaturday.setHours(23, 59, 59, 999);

    // Checa se já passou de sexta-feira às 18h ou se é sábado
    const nextWeekReleased = (todayDayOfWeek === 5 && todayHours >= 18) || todayDayOfWeek === 6;

    const limitDate = new Date(currentSaturday);
    if (nextWeekReleased) {
      // Se liberado, estende até o sábado da semana seguinte
      limitDate.setDate(currentSaturday.getDate() + 7);
    }

    return limitDate;
  };

  const getNextDays = () => {
    const days = [];
    const limitDate = getSchedulingLimitDate();
    
    const now = new Date();
    const utcStr = now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
    const today = new Date(utcStr);
    today.setHours(0, 0, 0, 0);

    const currentIter = new Date(today);
    // Limitar para exibir no máximo 14 dias para evitar loops infinitos acidentais
    let iterations = 0;
    while (currentIter <= limitDate && iterations < 15) {
      const isSunday = currentIter.getDay() === 0;
      if (!isSunday) {
        const dateStr = formatDateISO(currentIter);
        days.push({
          dateStr,
          dayName: currentIter.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
          dayNum: currentIter.getDate(),
          monthName: currentIter.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
        });
      }
      currentIter.setDate(currentIter.getDate() + 1);
      iterations++;
    }
    return days;
  };

  // Pagination & UX states
  const [pages, setPages] = useState<Record<string, number>>({});
  const [pageSize, setPageSize] = useState<Record<string, number>>({});

  const getPage = (key: string) => pages[key] || 1;
  const setPage = (key: string, page: number) => {
    setPages(prev => ({ ...prev, [key]: page }));
  };
  const getPageSize = (key: string) => pageSize[key] || 30;
  const setPageSizeForKey = (key: string, size: number) => {
    setPageSize(prev => ({ ...prev, [key]: size }));
    setPage(key, 1);
  };

  const renderWorkoutCards = (sheetExercises: any[]) => {
    const getGroupColor = (groupName: string) => {
      if (!groupName) return '';
      const uniqueGroups = Array.from(
        new Set(sheetExercises.map((e: any) => e.combinaGrupo).filter(Boolean) as string[])
      ).sort();
      const index = uniqueGroups.indexOf(groupName);
      if (index === -1) return '#10b981';
      const GROUP_COLORS = [
        '#10b981', // Green
        '#f59e0b', // Orange
        '#a855f7', // Purple
        '#3b82f6', // Blue
        '#ec4899', // Pink
        '#06b6d4', // Cyan
        '#f43f5e', // Rose
        '#84cc16', // Lime
        '#eab308', // Yellow
        '#6366f1'  // Indigo
      ];
      return GROUP_COLORS[index % GROUP_COLORS.length];
    };

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginTop: '16px' }}>
        {sheetExercises.map((ex: any, idx: number) => {
          const exName = typeof ex.exercicioId === 'object' ? ex.exercicioId?.nome : ex.exercicioId;
          const details = exercises.find((e: any) => e.nome?.toLowerCase() === (exName || '').toLowerCase() || e._id === exName) || { nome: exName || 'Exercício', grupo: 'Geral' };
          const groupColor = getGroupColor(ex.combinaGrupo);
          const groupStyle = ex.combinaGrupo ? { borderLeft: `4px solid ${groupColor}` } : {};

          return (
            <div 
              key={idx} 
              style={{
                background: 'linear-gradient(145deg, rgba(20, 27, 45, 0.65) 0%, rgba(10, 15, 26, 0.85) 100%)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '16px',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 30px 0 rgba(0, 0, 0, 0.25)',
                transition: 'all 0.25s ease',
                ...groupStyle
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = ex.combinaGrupo ? groupColor : 'rgba(16, 185, 129, 0.4)';
                e.currentTarget.style.boxShadow = `0 12px 32px 0 ${ex.combinaGrupo ? groupColor : '#10b981'}15`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)';
                e.currentTarget.style.boxShadow = '0 8px 30px 0 rgba(0, 0, 0, 0.25)';
              }}
            >
              <div>
                {/* 🏷️ Topo do Card: Grupo Muscular, Conjugado e Número */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.66rem',
                      color: '#10b981',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>
                      {details.grupo}
                    </span>
                    {ex.combinaGrupo && (
                      <span style={{
                        fontSize: '0.64rem',
                        color: ex.combinaGrupo === 'G5' ? '#000' : '#fff',
                        background: groupColor,
                        padding: '2px 7px',
                        borderRadius: '6px',
                        fontWeight: 900,
                        textTransform: 'uppercase'
                      }}>
                        Conjugado {ex.combinaGrupo}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    color: '#94a3b8',
                    fontWeight: 800,
                    background: 'rgba(255, 255, 255, 0.04)',
                    padding: '2px 7px',
                    borderRadius: '6px'
                  }}>
                    #{idx + 1}
                  </span>
                </div>

                {/* 🏋️ Nome do Exercício em Alta Visibilidade */}
                <h4 style={{
                  margin: '0 0 10px 0',
                  fontSize: '1.02rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: 1.3,
                  letterSpacing: '-0.2px'
                }}>
                  {details.nome}
                </h4>

                {/* 🔗 Alerta de Exercício Conjugado */}
                {ex.combinaGrupo && (
                  <div style={{
                    fontSize: '0.70rem',
                    color: groupColor,
                    background: `${groupColor}14`,
                    padding: '6px 10px',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    fontWeight: 700,
                    border: `1px dashed ${groupColor}55`,
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}>
                    <i className="fa-solid fa-circle-nodes"></i>
                    <span>Executar conjugado com {ex.combinaGrupo} (Sem descanso intermediário)</span>
                  </div>
                )}

                {/* 🎬 Prévia de Mídia (GIF ou Vídeo) */}
                {details.gifUrl && (
                  <div style={{
                    marginTop: '6px',
                    marginBottom: '12px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    background: '#040711',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                  }}>
                    {details.gifUrl.match(/\.(mp4|webm)($|\?)/i) ? (
                      <video
                        src={details.gifUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{ width: '100%', maxHeight: '160px', objectFit: 'contain' }}
                      />
                    ) : (
                      <img
                        src={details.gifUrl?.startsWith('data:') ? details.gifUrl : `/api/image-proxy?url=${encodeURIComponent(details.gifUrl)}`}
                        alt={details.nome}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        style={{ width: '100%', maxHeight: '160px', objectFit: 'contain' }}
                      />
                    )}
                  </div>
                )}

                {/* 📊 Grid de Métricas Limpo e Moderno (4 Colunas) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '6px',
                  marginBottom: '10px'
                }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    padding: '6px 4px',
                    textAlign: 'center'
                  }}>
                    <span style={{ fontSize: '0.58rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>SÉRIES</span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>{ex.series || '3'}</span>
                  </div>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    padding: '6px 4px',
                    textAlign: 'center'
                  }}>
                    <span style={{ fontSize: '0.58rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>REPS</span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>{ex.repeticoes || '10'}</span>
                  </div>
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '8px',
                    padding: '6px 4px',
                    textAlign: 'center'
                  }}>
                    <span style={{ fontSize: '0.58rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>CARGA</span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>{ex.carga || '-'}</span>
                  </div>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    padding: '6px 4px',
                    textAlign: 'center'
                  }}>
                    <span style={{ fontSize: '0.58rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>DESC.</span>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#cbd5e1' }}>{ex.descanso || '60s'}</span>
                  </div>
                </div>

                {/* ⏱️ Pílula de Ritmo de Execução Padronizado */}
                {(ex.ritmo && String(ex.ritmo).trim() !== '') && (
                  <div style={{
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    marginBottom: '8px'
                  }}>
                    <span style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <i className="fa-regular fa-clock" style={{ color: '#38bdf8' }}></i> Ritmo:
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#38bdf8' }}>
                      {(() => {
                        const opt = RITMO_OPTIONS.find(o => o.valor === ex.ritmo);
                        return opt ? opt.label : ex.ritmo;
                      })()}
                    </span>
                  </div>
                )}

                {/* ⚡ Drop-Set Badge */}
                {ex.dropSet && ex.dropSet.tipo && ex.dropSet.tipo !== 'none' && Array.isArray(ex.dropSet.drops) && ex.dropSet.drops.length > 0 && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 800, color: '#f59e0b' }}>
                      <span>⚡ {ex.dropSet.tipo === 'single' ? 'Single Drop' : ex.dropSet.tipo === 'double' ? 'Double Drop' : 'Triple Drop'}</span>
                      <span style={{ color: '#94a3b8', fontWeight: 600 }}>({ex.dropSet.escopo === 'todas_series' ? 'Todas as séries' : 'Última série'})</span>
                    </div>
                    <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                      {ex.carga} → {ex.dropSet.drops.map((d: any) => `${d}kg`).join(' → ')}
                    </div>
                  </div>
                )}

                {/* 📈 Evolução de Cargas */}
                {(() => {
                  if (!Array.isArray(ex.historicoCargas) || ex.historicoCargas.length < 2) return null;
                  const first = ex.historicoCargas[0];
                  const last = ex.historicoCargas[ex.historicoCargas.length - 1];
                  const cFirst = parseFloat(String(first.carga).replace(/[^\d.-]/g, '')) || 0;
                  const cLast = parseFloat(String(last.carga).replace(/[^\d.-]/g, '')) || 0;
                  const diff = Math.round((cLast - cFirst) * 10) / 10;
                  let dias = 0;
                  if (first.data && last.data) {
                    const d1 = new Date(first.data + 'T12:00:00');
                    const d2 = new Date(last.data + 'T12:00:00');
                    dias = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
                  }
                  return (
                    <div style={{
                      background: diff >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                      border: `1px solid ${diff >= 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      color: diff >= 0 ? '#34d399' : '#f87171',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      marginBottom: '8px'
                    }}>
                      <i className={`fa-solid ${diff >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`}></i>
                      <span>Sua evolução: {diff >= 0 ? `+${diff}` : diff} {last.unidadeCarga || 'kg'} em {dias}d ({first.carga} → {last.carga})</span>
                    </div>
                  );
                })()}

                {/* 📝 Observação Clínica */}
                {ex.observacao && (
                  <div style={{
                    fontSize: '0.74rem',
                    color: '#fbbf24',
                    background: 'rgba(245, 158, 11, 0.06)',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(245, 158, 11, 0.15)',
                    marginBottom: '8px'
                  }}>
                    <strong>Nota:</strong> {ex.observacao}
                  </div>
                )}

                {/* ℹ️ Botão de Instruções / Detalhes */}
                {(details.instrucoes || details.gifUrl) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    style={{
                      width: '100%',
                      marginTop: '4px',
                      fontSize: '0.74rem',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontWeight: 700
                    }}
                    onClick={() => setSelectedExerciseForInstruction(details)}
                  >
                    <i className="fa-solid fa-circle-info" style={{ color: 'var(--color-primary)' }}></i>
                    {details.gifUrl ? 'Ver Detalhes & Execução' : 'Instruções de Execução'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderFichaValidadeBadge = (f: any) => {
    if (!f.validadeDias && !f.dataExpiracao) {
      return (
        <span style={{ 
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600,
          background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)'
        }}>
          ⚠️ Sem validade informada
        </span>
      );
    }
    const expDate = f.dataExpiracao ? new Date(f.dataExpiracao) : null;
    const now = new Date();
    if (expDate && !isNaN(expDate.getTime())) {
      const diffMs = expDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        return (
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600,
            background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            🔴 Vencida ({Math.abs(diffDays)}d atrás) • Ciclo {f.validadeDias}d
          </span>
        );
      }
      return (
        <span style={{ 
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600,
          background: diffDays <= 5 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          color: diffDays <= 5 ? '#fbbf24' : '#34d399',
          border: diffDays <= 5 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'
        }}>
          ⏳ Vigente ({diffDays} dias restantes • Ciclo {f.validadeDias}d)
        </span>
      );
    }
    return null;
  };

  const user = session?.user as any;
  const profileId = user?.profileId;

  const fetchData = async () => {
    if (!profileId) return;
    try {
      setLoading(true);
      const [resClient, resApts, resWorkout, resAs, resRep, resExercises, resSt, resContracts, resTrancamentos, resWorkoutHist, resWellness] = await Promise.all([
        clientId ? fetch(`/api/clients?id=${clientId}`) : fetch(`/api/clients?userId=${user.id}`),
        fetch(`/api/appointments?clientId=${profileId}`),
        fetch(`/api/workouts?clientId=${profileId}`),
        fetch('/api/assessments'),
        fetch('/api/reports'),
        fetch('/api/exercises'),
        fetch('/api/strength-tests'),
        fetch(`/api/contracts?clientId=${profileId}`),
        fetch(`/api/trancamentos?clientId=${profileId}`),
        fetch(`/api/workouts?clientId=${profileId}&history=true`),
        fetch(`/api/wellness?clientId=${profileId}`).catch(() => null)
      ]);
      const jsonClient = await resClient.json();
      const jsonApts = await resApts.json();
      const jsonWorkout = await resWorkout.json();
      const jsonAs = await resAs.json();
      const jsonRep = await resRep.json();
      const jsonExercises = await resExercises.json();
      const jsonSt = await resSt.json();
      const jsonContracts = await resContracts.json();
      const jsonTrancamentos = await resTrancamentos.json();
      const jsonWorkoutHist = await resWorkoutHist.json();
      let jsonWellness: any = { success: false };
      try {
        if (resWellness) jsonWellness = await resWellness.json();
      } catch (err) {}

      if (jsonClient.success && jsonClient.data.length > 0) {
        setClient(jsonClient.data[0]);
      }
      if (jsonContracts.success) {
        setContracts(jsonContracts.data || []);
      }
      if (jsonApts.success) {
        const sorted = (jsonApts.data || []).sort((a: any, b: any) => {
          const dateA = `${a.data}T${a.horario}`;
          const dateB = `${b.data}T${b.horario}`;
          return dateB.localeCompare(dateA);
        });
        setAppointments(sorted);
      }
      if (jsonWorkout.success) {
        setWorkout(jsonWorkout.data);
        const monCount = (jsonWorkout.data?.fichasMonitorado || []).filter((f: any) => f.exercicios?.length > 0).length;
        const livreCount = (jsonWorkout.data?.fichasLivre || []).filter((f: any) => f.exercicios?.length > 0).length;
        if (monCount === 0 && livreCount > 0) {
          setClientWorkoutCategory('livre');
        } else {
          setClientWorkoutCategory('monitorado');
        }
      }
      if (jsonWorkoutHist.success && Array.isArray(jsonWorkoutHist.data)) {
        setWorkoutCyclesHistory(jsonWorkoutHist.data);
      }
      if (jsonAs.success) {
        setAssessments(jsonAs.data.filter((a: any) => (a.clienteId?._id || a.clienteId) === profileId));
      }
      if (jsonRep.success) {
        setReports(jsonRep.data.filter((r: any) => (r.clienteId?._id || r.clienteId) === profileId));
      }
      if (jsonExercises.success) {
        setExercises(jsonExercises.data);
      }
      if (jsonSt.success) {
        setStrengthTests(jsonSt.data.filter((t: any) => (t.clienteId?._id || t.clienteId) === profileId));
      }
      if (jsonTrancamentos.success) {
        setTrancamentosList(jsonTrancamentos.data || []);
      }
      if (jsonWellness.success && Array.isArray(jsonWellness.data)) {
        setWellnessLogs(jsonWellness.data);
      }
    } catch (e) {
      console.error('Error fetching client dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profileId, activeTab]);

  useEffect(() => {
    if (bookType === 'academia') {
      setBookService('Treino Monitorado');
    } else {
      setBookService('Avaliação Fisioterápica');
    }
  }, [bookType]);

  // Sincronizar serviço automaticamente quando a data for Sábado ou Dia de Semana
  useEffect(() => {
    if (!bookDate) return;
    const isSaturday = new Date(bookDate + 'T12:00:00').getDay() === 6;
    if (isSaturday) {
      if (bookService !== 'Massagem') {
        setBookService('Massagem');
      }
    } else {
      if (bookService === 'Massagem') {
        setBookService(bookType === 'academia' ? 'Treino Monitorado' : 'Avaliação Fisioterápica');
      }
    }
  }, [bookDate, bookType, bookService]);

  // Inteligência de Evolução Temporal do Aluno (Filtro estrito de >= 2 medições)
  const evolutionData = useMemo(() => {
    return processStudentEvolution(assessments, strengthTests, reports, wellnessLogs, workoutCyclesHistory);
  }, [assessments, strengthTests, reports, wellnessLogs, workoutCyclesHistory]);

  // Reset bookTime when date or service changes
  useEffect(() => {
    setBookTime('');
    setAvailableSlots([]);
  }, [bookDate, bookService]);

  // Fetch available slots when date and service are set
  useEffect(() => {
    if (!bookDate || !bookService) return;
    setLoadingSlots(true);
    const clientParam = profileId ? `&clienteId=${profileId}` : '';
    fetch(`/api/available-slots?data=${bookDate}&servico=${encodeURIComponent(bookService)}${clientParam}`)
      .then(r => r.json())
      .then(d => { if (d.success) setAvailableSlots(d.data); })
      .catch(() => setAvailableSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [bookDate, bookService, profileId]);

  const normalizeToISO = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
    }
    if (dateStr.includes('T')) return dateStr.split('T')[0];
    return dateStr;
  };

  const isContractAnual = (c: any) => {
    if (!c) return false;
    const vigencia = Number(c.vigenciaMeses);
    if (vigencia === 12) return true;
    const tipo = (c.planoTipo || '').toLowerCase();
    const duracao = (c.duracao || '').toLowerCase();
    const nome = (c.planoNome || '').toLowerCase();
    return tipo.includes('anual') || duracao.includes('anual') || nome.includes('anual');
  };

  const rawActiveContract = contracts.find((c: any) => (c.status === 'assinado' || c.status === 'congelado' || c.status === 'ativo') && isContractAnual(c)) || contracts.find((c: any) => c.status === 'assinado' || c.status === 'congelado' || c.status === 'ativo');

  const contractEndISO = normalizeToISO(client?.dadosComerciais?.vencimento) || normalizeToISO(rawActiveContract?.dataFim);
  const contractStartISO = normalizeToISO(rawActiveContract?.dataInicio || client?.dadosComerciais?.dataInicio) || client?.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0];

  const activeContract = rawActiveContract ? {
    ...rawActiveContract,
    planoNome: rawActiveContract.planoNome || (rawActiveContract.planoId?.nome === 'Captação' ? 'Aguardando Ativação' : rawActiveContract.planoId?.nome) || (client?.dadosComerciais?.planoId?.nome === 'Captação' ? 'Aguardando Ativação' : client?.dadosComerciais?.planoId?.nome) || 'Clube Fitness - Monitorado',
    dataInicio: contractStartISO,
    dataFim: contractEndISO || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    frequencia: Number(rawActiveContract.frequencia || client?.dadosComerciais?.frequencia || client?.frequencia || 0)
  } : (client?.dadosComerciais?.planoId || client?.dadosComerciais?.status === 'ativo' ? {
    _id: client._id,
    planoNome: (client.dadosComerciais?.planoId?.nome === 'Captação' ? 'Aguardando Ativação' : client.dadosComerciais?.planoId?.nome) || client.dadosComerciais?.planoNome || 'Clube Fitness - Monitorado',
    dataInicio: contractStartISO,
    dataFim: contractEndISO || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    frequencia: Number(client.dadosComerciais?.frequencia || client.frequencia || 0),
    vigenciaMeses: client.dadosComerciais?.vigenciaMeses || (client.dadosComerciais?.planoNome?.toLowerCase().includes('anual') ? 12 : 0)
  } : null);

  const getRemainingMonthsList = () => {
    if (!activeContract || !trancamentoDataInicio) return [];
    const startISO = normalizeToISO(trancamentoDataInicio);
    const endISO = normalizeToISO(activeContract.dataFim);
    const startDate = new Date(startISO + 'T00:00:00');
    const endDate = new Date(endISO + 'T00:00:00');
    const months = [];
    
    let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const last = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    
    while (current <= last) {
      const label = current.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const value = current.toISOString().slice(0, 7); // YYYY-MM
      months.push({ label, value });
      current.setMonth(current.getMonth() + 1);
    }
    return months;
  };

  const handleRequestTrancamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrancamentoErrorMsg('');
    setTrancamentoSuccessMsg('');

    if (!activeContract) {
      setTrancamentoErrorMsg('Você não possui nenhum contrato ativo.');
      return;
    }

    if (!isContractAnual(activeContract)) {
      setTrancamentoErrorMsg('O trancamento de plano é exclusivo para contratos da modalidade Anual.');
      return;
    }

    const frequencia = Number(activeContract.frequencia);
    if (!frequencia || frequencia <= 0) {
      setTrancamentoErrorMsg('Seu contrato não possui uma frequência semanal válida cadastrada. Entre em contato com a administração.');
      return;
    }

    if (!trancamentoDataInicio) {
      setTrancamentoErrorMsg('Selecione a data de início do trancamento.');
      return;
    }

    const totalCreditos = trancamentoSemanas * frequencia;
    
    const redistList = getRemainingMonthsList().map(m => ({
      mesAno: m.value,
      creditos: trancamentoRedistribuicao[m.value] || 0
    }));

    const totalRedist = redistList.reduce((sum, r) => sum + r.creditos, 0);
    if (totalRedist !== totalCreditos) {
      setTrancamentoErrorMsg(`A soma da redistribuição (${totalRedist}) deve ser igual a ${totalCreditos} créditos.`);
      return;
    }

    try {
      const res = await fetch('/api/trancamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client._id,
          contractId: activeContract._id,
          dataInicio: trancamentoDataInicio,
          semanas: trancamentoSemanas,
          redistribuicao: redistList
        })
      });
      const data = await res.json();
      if (data.success) {
        setTrancamentoSuccessMsg('Trancamento realizado e créditos redistribuídos com sucesso!');
        setTrancamentoDataInicio('');
        setTrancamentoRedistribuicao({});
        setTrancamentoSemanas(1);
        fetchData();
      } else {
        setTrancamentoErrorMsg('Erro ao solicitar trancamento: ' + data.error);
      }
    } catch (err: any) {
      setTrancamentoErrorMsg('Erro de rede.');
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingStatusMsg('Processando...');
    try {
      const payload = {
        data: bookDate,
        horario: bookTime,
        tipo: bookType,
        servico: bookService,
        profissionalId: '6668ab030303030303030302', // Camila Lima
        clienteId: profileId
      };
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setBookingStatusMsg('Agendamento realizado com sucesso!');
        setBookDate('');
        fetchData();
      } else {
        setBookingStatusMsg('Erro: ' + data.error);
      }
    } catch (err: any) {
      setBookingStatusMsg('Erro ao agendar.');
    }
  };

  const handleCancelAppointment = async (id: string) => {
    const apt = appointments.find(a => a._id === id);
    if (!apt) return;

    // Calcular diferença de horas (fuso -03:00)
    const dataHora = new Date(`${apt.data}T${apt.horario}:00-03:00`);
    const agora = new Date();
    const diffHoras = (dataHora.getTime() - agora.getTime()) / (1000 * 60 * 60);
    const janelaHoras = apt.tipo === 'academia' ? 6 : 2;

    let confirmMsg = 'Deseja realmente cancelar este agendamento?';
    if (diffHoras < janelaHoras) {
      confirmMsg = `Atenção: Cancelamentos realizados com menos de ${janelaHoras} horas de antecedência em relação ao horário do agendamento resultam no consumo do crédito utilizado. Deseja continuar?`;
    } else {
      confirmMsg = 'Deseja realmente cancelar este agendamento? O crédito correspondente será devolvido à sua conta.';
    }

    if (confirm(confirmMsg)) {
      try {
        const res = await fetch('/api/appointments', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: 'cancelado' })
        });
        const data = await res.json();
        if (data.success) {
          fetchData();
        } else {
          alert('Erro ao cancelar agendamento: ' + data.error);
        }
      } catch (e) {
        console.error(e);
        alert('Erro ao processar o cancelamento.');
      }
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="content-panel" style={{ textAlign: 'center', padding: '40px' }}>
        <h2 style={{ color: 'var(--color-danger)' }}>Erro de Cadastro</h2>
        <p>Não encontramos sua ficha de aluno cadastrada no sistema. Fale com a recepção.</p>
      </div>
    );
  }

  // Find pending Asaas contract
  const pendingAsaasContract = contracts.find(c => c.asaasPaymentId && c.status === 'pendente');

  // Calculate credits — all 3 types
  const credTotal = client.dadosComerciais?.creditosTotal || 0;
  const credUsados = client.dadosComerciais?.creditosUsados || 0;
  const credReservados = client.dadosComerciais?.creditosReservados || 0;
  const credDisp = Math.max(0, credTotal - credUsados - credReservados);

  const massTotal = client.dadosComerciais?.creditosMassagemTotal || 0;
  const massUsados = client.dadosComerciais?.creditosMassagemUsados || 0;
  const massReservados = client.dadosComerciais?.creditosMassagemReservados || 0;
  const massDisp = Math.max(0, massTotal - massUsados - massReservados);

  const emergTotal = client.dadosComerciais?.creditosEmergenciaTotal || 0;
  const emergUsados = client.dadosComerciais?.creditosEmergenciaUsados || 0;
  const emergReservados = client.dadosComerciais?.creditosEmergenciaReservados || 0;
  const emergDisp = Math.max(0, emergTotal - emergUsados - emergReservados);

  // Detect saturday from selected booking date
  const bookDateIsSaturday = bookDate ? new Date(bookDate + 'T12:00:00').getDay() === 6 : false;

  return (
    <div>
      {/* 1. View: Painel do Aluno */}
      {activeTab === 'dashboard' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Olá, {client.dadosPessoais?.nome}!</h1>
              <p>{client.dadosComerciais?.status === 'pendente' ? 'Seu cadastro foi recebido. Aguarde a ativação do seu plano.' : 'Confira seu plano, créditos e próximos treinos.'}</p>
            </div>
          </div>

          {/* Painel pendente ou aguardando pagamento */}
          {pendingAsaasContract ? (
            <div className="content-panel" style={{ marginTop: '24px', padding: '32px 24px', background: 'var(--bg-secondary)', border: '2.5px solid var(--color-primary)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="fa-solid fa-file-invoice-dollar" style={{ fontSize: '24px', color: 'var(--color-primary)' }}></i>
                </div>
                <div style={{ flexGrow: 1 }}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-main)' }}>Seu plano está aguardando pagamento</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                    Identificamos uma cobrança pendente para ativação do seu plano <strong>{pendingAsaasContract.planoNome}</strong>.
                  </p>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', textAlign: 'right' }}>
                  R$ {pendingAsaasContract.valorLiquido?.toFixed(2).replace('.', ',')}
                  <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-dim)' }}>
                    vencimento: {pendingAsaasContract.dataPrimeiroVencimento ? new Date(pendingAsaasContract.dataPrimeiroVencimento + 'T00:00:00').toLocaleDateString('pt-BR') : 'Hoje'}
                  </div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '20px 0' }} />

              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                {pendingAsaasContract.formaPagamento === 'pix' && pendingAsaasContract.asaasPixCopyPaste && (
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', flexGrow: 1 }}>
                    {pendingAsaasContract.asaasPixQrCode && (
                      <div style={{ background: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', width: '120px', height: '120px' }}>
                        <img src={`data:image/png;base64,${pendingAsaasContract.asaasPixQrCode}`} alt="QR Code Pix" style={{ width: '100%', height: '100%' }} />
                      </div>
                    )}
                    <div style={{ flexGrow: 1, maxWidth: '400px' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>PIX COPIA E COLA</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          readOnly
                          className="form-control"
                          value={pendingAsaasContract.asaasPixCopyPaste}
                          style={{ fontSize: '0.75rem', background: 'var(--bg-darker)' }}
                        />
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            navigator.clipboard.writeText(pendingAsaasContract.asaasPixCopyPaste);
                            alert('Copiado para a área de transferência!');
                          }}
                        >
                          <i className="fa-solid fa-copy"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                  {pendingAsaasContract.asaasBoletoPdf && (
                    <a href={pendingAsaasContract.asaasBoletoPdf} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-file-pdf" style={{ color: 'var(--color-danger)' }}></i> Baixar Boleto PDF
                    </a>
                  )}
                  <a href={pendingAsaasContract.asaasInvoiceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-arrow-up-right-from-square"></i> Pagar no Asaas
                  </a>
                </div>
              </div>
            </div>
          ) : client.dadosComerciais?.status === 'pendente' ? (
            <div className="content-panel" style={{ marginTop: '24px', textAlign: 'center', padding: '48px 32px' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <i className="fa-solid fa-clock" style={{ fontSize: '28px', color: 'var(--color-warning)' }}></i>
              </div>
              <h2 style={{ fontFamily: 'var(--font-title)', color: 'var(--color-warning)', marginBottom: '12px' }}>Aguardando Ativação do Plano</h2>
              <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto', lineHeight: 1.7 }}>
                Seu cadastro foi recebido com sucesso! A equipe irá analisar seus dados e ativar seu plano em breve.
                <br /><br />
                <strong style={{ color: 'var(--text-main)' }}>Em caso de dúvidas, entre em contato com a recepção.</strong>
              </p>
            </div>
          ) : (
            <>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-info">
                <h3>Créditos Disponíveis</h3>
                <div className="value">{credDisp}</div>
                <small style={{ color: 'var(--text-dim)' }}>de {credTotal} totais no mês</small>
              </div>
              <div className="metric-icon"><i className="fa-solid fa-coins"></i></div>
            </div>
            <div className="metric-card">
              <div className="metric-info">
                <h3>Treinos Agendados</h3>
                <div className="value">{credReservados}</div>
              </div>
              <div className="metric-icon indigo"><i className="fa-solid fa-clock"></i></div>
            </div>
            <div className="metric-card">
              <div className="metric-info">
                <h3>Status do Plano</h3>
                <div className="value" style={{ 
                  color: client.dadosComerciais?.status === 'ativo' ? 'var(--color-success)' : 'var(--color-danger)' 
                }}>
                  {client.dadosComerciais?.status === 'ativo' ? 'Ativo' : client.dadosComerciais?.status === 'pendente' ? 'Pendente' : 'Vencido'}
                </div>
              </div>
              <div className="metric-icon"><i className="fa-solid fa-calendar-check"></i></div>
            </div>
          </div>

          <div className="content-panel" style={{ marginTop: '24px' }}>
            <div className="panel-header">
              <h2>Detalhes do seu Plano</h2>
            </div>
            <div style={{ marginTop: '12px', lineHeight: '1.6' }}>
              <p>Plano Contratado: <strong>{client.dadosComerciais?.planoId?.nome === 'Captação' ? 'Aguardando Ativação' : (client.dadosComerciais?.planoId?.nome || 'Plano Personalizado')}</strong></p>
              <p>Frequência Contratada: <strong>{client.dadosComerciais?.frequencia} vezes por semana</strong></p>
              <p>Término da Vigência: <strong>{formatDateBR(client.dadosComerciais?.vencimento)}</strong></p>
            </div>
          </div>
            </>
          )}
        </>
      )}

      {/* 2. View: Agendar Horário */}
      {activeTab === 'agendar' && (
        <>
          <div className="view-header" style={{ marginBottom: '20px' }}>
            <div className="view-title-group">
              <h1 style={{ 
                fontFamily: 'var(--font-title)', 
                fontSize: '1.8rem', 
                fontWeight: 800, 
                background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                marginBottom: '4px'
              }}>
                Agendar Novo Horário
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Escolha a data e hora desejada para realizar sua aula.</p>
            </div>
          </div>

          <div className="content-panel" style={{ 
            maxWidth: '600px',
            background: 'rgba(22, 29, 45, 0.45)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
            padding: '24px'
          }}>
            {client?.dadosComerciais?.status === 'lead' ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <i className="fa-solid fa-user-clock" style={{ fontSize: '2.5rem', color: '#8b5cf6', marginBottom: '12px' }}></i>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700 }}>Cadastro em Fase de Avaliação (Lead)</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '16px' }}>
                  Sua conta está cadastrada para experiência/avaliação. Para realizar agendamentos de treinos e aulas, escolha e contrate um plano comercial com a nossa equipe!
                </p>
              </div>
            ) : (
              <form onSubmit={handleBookAppointment}>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>Serviço</label>
                  <select className="select-custom" value={bookService} onChange={e => setBookService(e.target.value)} style={{ background: 'rgba(14, 19, 31, 0.6)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text-main)', padding: '10px', borderRadius: '8px' }}>
                    {bookDateIsSaturday ? (
                      <option value="Massagem">Massagem</option>
                    ) : (
                      <>
                        <option value="Treino Monitorado">Treino Monitorado</option>
                        <option value="Treino Livre">Treino Livre</option>
                        <option value="Emergência">Atendimento de Emergência</option>
                      </>
                    )}
                  </select>
                </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                  <span style={{ color: 'var(--color-primary)', marginRight: '6px' }}>1.</span> Selecione a Data
                </label>
                
                {/* Carrossel de datas em formato de cartões (toque rápido) com padding extra no final para não cortar sábado 01/08 */}
                <div style={{ 
                  display: 'flex', 
                  gap: '10px', 
                  overflowX: 'auto', 
                  paddingBottom: '12px', 
                  paddingRight: '32px',
                  scrollbarWidth: 'none', 
                  WebkitOverflowScrolling: 'touch', 
                  margin: '0 -4px' 
                }}>
                  {getNextDays().map((d) => (
                    <button
                      type="button"
                      key={d.dateStr}
                      onClick={() => {
                        setBookDate(d.dateStr);
                        setBookTime('');
                      }}
                      style={{
                        flex: '0 0 72px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '12px 6px',
                        borderRadius: '12px',
                        border: bookDate === d.dateStr ? '1.5px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.05)',
                        background: bookDate === d.dateStr ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)',
                        boxShadow: bookDate === d.dateStr ? '0 0 15px rgba(16,185,129,0.15)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        outline: 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (bookDate !== d.dateStr) {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.borderColor = 'var(--color-primary)';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (bookDate !== d.dateStr) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                          e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                        }
                      }}
                    >
                      <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>{d.dayName}</span>
                      <span style={{ fontSize: '1.15rem', fontWeight: 800, margin: '4px 0', color: bookDate === d.dateStr ? 'var(--color-primary)' : 'var(--text-main)' }}>{d.dayNum}</span>
                      <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{d.monthName}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                  <span style={{ color: 'var(--color-primary)', marginRight: '6px' }}>2.</span> Selecione o Horário
                </label>
                {!bookDate ? (
                  <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                    <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: '8px' }}></i>
                    Selecione uma data acima para visualizar os horários disponíveis.
                  </div>
                ) : loadingSlots ? (
                  <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                    Carregando horários disponíveis...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-danger)', fontSize: '0.84rem' }}>
                    <i className="fa-solid fa-ban" style={{ marginRight: '8px' }}></i>
                    Nenhum horário disponível para a data ou serviço selecionado.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: '10px' }}>
                    {availableSlots.map(h => (
                      <button
                        type="button"
                        key={h}
                        onClick={() => setBookTime(h)}
                        style={{
                          padding: '10px 6px',
                          borderRadius: '10px',
                          border: bookTime === h ? '1.5px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.05)',
                          background: bookTime === h ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)',
                          boxShadow: bookTime === h ? '0 0 15px rgba(16,185,129,0.1)' : 'none',
                          color: bookTime === h ? 'var(--color-primary)' : 'var(--text-main)',
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          outline: 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (bookTime !== h) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.borderColor = 'var(--color-primary)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (bookTime !== h) {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                          }
                        }}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {bookingStatusMsg && (
                <div style={{ margin: '16px 0', padding: '12px', borderRadius: '8px', background: 'var(--color-primary-glow)', color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center' }}>
                  {bookingStatusMsg}
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px', padding: '12px', fontSize: '0.9rem', fontWeight: 700 }}>
                Confirmar Agendamento
              </button>
            </form>
            )}
          </div>
        </>
      )}

      {/* 3. View: Meus Agendamentos */}
      {activeTab === 'agendamentos' && (() => {
        const now = new Date();
        const futureApts = appointments.filter((a: any) => {
          const aptDateTime = new Date(`${a.data}T${a.horario}:00-03:00`);
          return aptDateTime.getTime() >= now.getTime();
        }).sort((a: any, b: any) => {
          const dateA = `${a.data}T${a.horario}`;
          const dateB = `${b.data}T${b.horario}`;
          return dateA.localeCompare(dateB);
        });

        return (
          <>
            <div className="view-header" style={{ marginBottom: '20px' }}>
              <div className="view-title-group">
                <h1 style={{ 
                  fontFamily: 'var(--font-title)', 
                  fontSize: '1.8rem', 
                  fontWeight: 800, 
                  background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)', 
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '4px'
                }}>
                  Meus Agendamentos
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Histórico e acompanhamento de agendamentos futuros.</p>
              </div>

            </div>

            {(() => {
              const listKey = 'appointments';
              const size = getPageSize(listKey);
              const totalPages = Math.ceil(futureApts.length / size);
              const activeP = getPage(listKey);
              const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
              const paginated = futureApts.slice((curP - 1) * size, curP * size);

              if (paginated.length === 0) {
                return (
                  <div className="empty-state-card" style={{ 
                    padding: '48px 24px', 
                    background: 'rgba(22, 29, 45, 0.45)', 
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '14px',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
                    textAlign: 'center'
                  }}>
                    <i className="fa-solid fa-calendar-xmark empty-state-icon" style={{ fontSize: '2.5rem', color: 'var(--text-dim)', marginBottom: '16px' }}></i>
                    <div className="empty-state-title" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>Nenhum agendamento futuro</div>
                    <div className="empty-state-desc" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px', maxWidth: '360px', margin: '0 auto 20px' }}>Você não possui aulas ou consultas agendadas para os próximos dias.</div>
                    <button type="button" className="btn btn-primary" onClick={() => setActiveTab('agendar')} style={{ padding: '10px 24px', fontSize: '0.85rem', fontWeight: 700 }}>
                      <i className="fa-solid fa-calendar-plus" style={{ marginRight: '6px' }}></i> Agendar Agora
                    </button>
                  </div>
                );
              }

              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '20px' }}>
                    {paginated.map(a => {
                      const isAcademia = a.tipo === 'academia';
                      const cardGlow = isAcademia ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)';
                      const cardBorder = isAcademia ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)';
                      const statusColors: Record<string, { bg: string, text: string, border: string }> = {
                        presenca: { bg: 'rgba(16,185,129,0.1)', text: 'var(--color-success)', border: 'rgba(16,185,129,0.2)' },
                        falta: { bg: 'rgba(239,68,68,0.1)', text: 'var(--color-danger)', border: 'rgba(239,68,68,0.2)' },
                        cancelado: { bg: 'rgba(239,68,68,0.1)', text: 'var(--color-danger)', border: 'rgba(239,68,68,0.2)' },
                        agendado: { bg: 'rgba(245,158,11,0.1)', text: 'var(--color-warning)', border: 'rgba(245,158,11,0.2)' }
                      };
                      const status = statusColors[a.status] || statusColors.agendado;
                      return (
                        <div 
                          key={a._id}
                          style={{
                            background: 'rgba(22, 29, 45, 0.45)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '14px',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
                            transition: 'all 0.3s ease',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.borderColor = isAcademia ? 'var(--color-primary)' : 'var(--color-info)';
                            e.currentTarget.style.boxShadow = `0 10px 30px 0 ${cardGlow}`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.boxShadow = '0 8px 32px 0 rgba(0, 0, 0, 0.15)';
                          }}
                        >
                          {/* Ticket punch holes visual effect */}
                          <div style={{ position: 'absolute', left: '-8px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', borderRadius: '50%', background: '#000', borderRight: '1px solid rgba(255,255,255,0.05)' }}></div>
                          <div style={{ position: 'absolute', right: '-8px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', borderRadius: '50%', background: '#000', borderLeft: '1px solid rgba(255,255,255,0.05)' }}></div>
                          
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                              <span style={{ 
                                background: isAcademia ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                                color: isAcademia ? 'var(--color-success)' : 'var(--color-info)',
                                border: `1px solid ${cardBorder}`,
                                padding: '2px 8px',
                                borderRadius: '8px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                textTransform: 'uppercase'
                              }}>
                                {isAcademia ? 'Academia' : 'Fisioterapia'}
                              </span>
                              <span style={{
                                background: status.bg,
                                color: status.text,
                                border: `1px solid ${status.border}`,
                                padding: '2px 8px',
                                borderRadius: '8px',
                                fontSize: '0.68rem',
                                fontWeight: 700
                              }}>
                                {a.status === 'presenca' ? 'Presença' : a.status === 'falta' ? 'Falta' : a.status === 'cancelado' ? 'Cancelado' : 'Agendado'}
                              </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px dashed rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                              <div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Data</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>{formatDateBR(a.data)}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Horário</div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-primary)' }}>{a.horario}</div>
                              </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Serviço</div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>{a.servico}</div>
                            </div>
                          </div>

                          <div>
                            {a.status === 'agendado' ? (
                              <button 
                                className="btn btn-danger btn-sm" 
                                onClick={() => handleCancelAppointment(a._id)} 
                                style={{ width: '100%', padding: '8px', fontSize: '0.78rem', fontWeight: 700, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                              >
                                <i className="fa-solid fa-calendar-minus"></i> Cancelar Agendamento
                              </button>
                            ) : (
                              <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.78rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px' }}>
                                Ações Indisponíveis
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {futureApts.length > size && (
                    <div style={{ marginTop: '24px' }}>
                      <Pagination
                        currentPage={curP}
                        totalItems={futureApts.length}
                        itemsPerPage={size}
                        onPageChange={page => setPage(listKey, page)}
                      />
                    </div>
                  )}
                </>
              );
            })()}
          </>
        );
      })()}

      {activeTab === 'treino' && (
        <>
          <div className="view-header" style={{ marginBottom: '20px' }}>
            <div className="view-title-group">
              <h1 style={{ 
                fontFamily: 'var(--font-title)', 
                fontSize: '1.8rem', 
                fontWeight: 800, 
                background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                marginBottom: '4px'
              }}>
                Minha Ficha de Treino
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Consulte sua rotina de treinos prescrita pelos professores.</p>
            </div>
          </div>

          {workout ? (() => {
            const activeMonitorado = (workout.fichasMonitorado || []).filter((f: any) => f.exercicios?.length > 0);
            const activeLivre = (workout.fichasLivre || []).filter((f: any) => f.exercicios?.length > 0);
            const hasMonitorado = activeMonitorado.length > 0;
            const hasLivre = activeLivre.length > 0;

            const currentCategory = clientWorkoutCategory === 'livre' ? (hasLivre ? 'livre' : 'monitorado') : (hasMonitorado ? 'monitorado' : 'livre');
            const currentSheets = currentCategory === 'livre' ? activeLivre : activeMonitorado;

            const effectiveFichaId = selectedFichaFilter === 'AUTO' 
              ? (currentSheets[0]?.id || 'ALL')
              : selectedFichaFilter;

            const displayedSheets = effectiveFichaId === 'ALL'
              ? currentSheets
              : currentSheets.filter((s: any) => s.id === effectiveFichaId);

            const toggleCollapseFicha = (fichaId: string) => {
              setCollapsedFichas(prev => ({
                ...prev,
                [fichaId]: !prev[fichaId]
              }));
            };

            const expandAll = () => {
              const updated: Record<string, boolean> = {};
              currentSheets.forEach((s: any) => { updated[s.id] = false; });
              setCollapsedFichas(prev => ({ ...prev, ...updated }));
            };

            const collapseAll = () => {
              const updated: Record<string, boolean> = {};
              currentSheets.forEach((s: any) => { updated[s.id] = true; });
              setCollapsedFichas(prev => ({ ...prev, ...updated }));
            };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* 🌟 1. Seletor de Categoria (Monitorado vs Livre) quando ambas existem */}
                {hasMonitorado && hasLivre && (
                  <div style={{
                    display: 'flex',
                    gap: '6px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '4px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    width: 'fit-content'
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setClientWorkoutCategory('monitorado');
                        setSelectedFichaFilter('AUTO');
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '9px',
                        border: 'none',
                        background: currentCategory === 'monitorado' ? '#10b981' : 'transparent',
                        color: currentCategory === 'monitorado' ? '#ffffff' : '#94a3b8',
                        fontWeight: 800,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <i className="fa-solid fa-clock-rotate-left"></i>
                      <span>Monitorado ({activeMonitorado.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setClientWorkoutCategory('livre');
                        setSelectedFichaFilter('AUTO');
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '9px',
                        border: 'none',
                        background: currentCategory === 'livre' ? '#38bdf8' : 'transparent',
                        color: currentCategory === 'livre' ? '#ffffff' : '#94a3b8',
                        fontWeight: 800,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <i className="fa-solid fa-person-running"></i>
                      <span>Treino Livre ({activeLivre.length})</span>
                    </button>
                  </div>
                )}

                {/* 🌟 2. Barra de Seleção da Ficha Escolhida (Foco no Treino de Hoje) */}
                {currentSheets.length > 0 && (
                  <div style={{
                    background: 'rgba(22, 29, 45, 0.55)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '14px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <i className="fa-solid fa-crosshairs" style={{ color: currentCategory === 'livre' ? '#38bdf8' : '#10b981', marginRight: '6px' }}></i>
                        Ficha Escolhida:
                      </span>

                      {currentSheets.map((sheet: any) => {
                        const isChosen = effectiveFichaId === sheet.id;
                        const themeColor = currentCategory === 'livre' ? '#38bdf8' : '#10b981';
                        return (
                          <button
                            key={sheet.id}
                            type="button"
                            onClick={() => setSelectedFichaFilter(sheet.id)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '8px',
                              border: isChosen ? `1.5px solid ${themeColor}` : '1px solid rgba(255, 255, 255, 0.08)',
                              background: isChosen ? (currentCategory === 'livre' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(16, 185, 129, 0.18)') : 'rgba(255, 255, 255, 0.03)',
                              color: isChosen ? themeColor : '#cbd5e1',
                              fontWeight: 800,
                              fontSize: '0.84rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease',
                              boxShadow: isChosen ? `0 0 16px ${themeColor}33` : 'none'
                            }}
                          >
                            <span>{sheet.nome || `Ficha ${sheet.id}`}</span>
                            <span style={{ fontSize: '0.70rem', opacity: 0.8, fontWeight: 700 }}>
                              ({sheet.exercicios?.length || 0})
                            </span>
                          </button>
                        );
                      })}

                      {currentSheets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setSelectedFichaFilter('ALL')}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: effectiveFichaId === 'ALL' ? '1.5px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: effectiveFichaId === 'ALL' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                            color: effectiveFichaId === 'ALL' ? '#ffffff' : '#94a3b8',
                            fontWeight: 750,
                            fontSize: '0.80rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          👁️ Ver Todas
                        </button>
                      )}
                    </div>

                    {/* Ações de Colapsar / Expandir em lote */}
                    {effectiveFichaId === 'ALL' && currentSheets.length > 1 && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={expandAll}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '0.72rem',
                            color: '#94a3b8',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          ▾ Expandir Todas
                        </button>
                        <button
                          type="button"
                          onClick={collapseAll}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '0.72rem',
                            color: '#94a3b8',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          ▴ Recolher Todas
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 🌟 3. Fichas de Treino com Acordeão Colapsável */}
                {displayedSheets.length > 0 ? (
                  displayedSheets.map((sheet: any) => {
                    const isCollapsed = Boolean(collapsedFichas[sheet.id]);
                    const themeColor = currentCategory === 'livre' ? '#38bdf8' : '#10b981';

                    return (
                      <div
                        key={sheet.id}
                        style={{
                          background: 'rgba(22, 29, 45, 0.45)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
                          borderRadius: '16px',
                          overflow: 'hidden',
                          transition: 'all 0.25s ease'
                        }}
                      >
                        {/* 📌 Cabeçalho Interativo Clicável da Ficha */}
                        <div
                          onClick={() => toggleCollapseFicha(sheet.id)}
                          style={{
                            padding: '16px 20px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                            background: isCollapsed ? 'rgba(0, 0, 0, 0.2)' : 'linear-gradient(90deg, rgba(255, 255, 255, 0.04) 0%, rgba(0, 0, 0, 0.1) 100%)',
                            borderBottom: isCollapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.06)',
                            userSelect: 'none',
                            transition: 'background 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{
                              color: themeColor,
                              fontSize: '1.15rem',
                              fontWeight: 800,
                              fontFamily: 'var(--font-title)',
                              letterSpacing: '-0.2px'
                            }}>
                              {sheet.nome && !sheet.nome.toLowerCase().startsWith('ficha')
                                ? (sheet.nome.toUpperCase().startsWith('TREINO LIVRE') ? sheet.nome : `${currentCategory === 'livre' ? 'TREINO LIVRE' : 'FICHA'} ${sheet.id} - ${sheet.nome}`)
                                : `${currentCategory === 'livre' ? 'TREINO LIVRE' : 'FICHA'} ${sheet.id}`}
                            </span>
                            {renderFichaValidadeBadge(sheet)}
                            <span style={{
                              fontSize: '0.72rem',
                              background: 'rgba(255, 255, 255, 0.06)',
                              color: '#94a3b8',
                              padding: '2px 8px',
                              borderRadius: '100px',
                              fontWeight: 700
                            }}>
                              {sheet.exercicios?.length || 0} exercícios
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                              Atualizado: {sheet.ultimaAtualizacao || '-'}
                            </span>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 10px',
                              borderRadius: '8px',
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              color: themeColor,
                              fontSize: '0.76rem',
                              fontWeight: 800
                            }}>
                              <span>{isCollapsed ? 'Ver Treino' : 'Recolher'}</span>
                              <i className={`fa-solid fa-chevron-${isCollapsed ? 'down' : 'up'}`} style={{ fontSize: '0.7rem' }}></i>
                            </div>
                          </div>
                        </div>

                        {/* 📋 Conteúdo da Ficha (quando não colapsada) */}
                        {!isCollapsed && (
                          <div style={{ padding: '20px' }}>
                            {sheet.observacoesGerais && (
                              <p style={{
                                margin: '0 0 16px 0',
                                fontSize: '0.84rem',
                                color: '#cbd5e1',
                                background: 'rgba(255, 255, 255, 0.03)',
                                padding: '10px 14px',
                                borderRadius: '10px',
                                borderLeft: `3px solid ${themeColor}`,
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderLeftColor: themeColor
                              }}>
                                <strong style={{ color: themeColor, marginRight: '4px' }}>Obs:</strong> {sheet.observacoesGerais}
                              </p>
                            )}
                            {renderWorkoutCards(sheet.exercicios)}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="content-panel" style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    background: 'rgba(22, 29, 45, 0.45)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)'
                  }}>
                    <i className="fa-solid fa-dumbbell" style={{ fontSize: '2rem', opacity: 0.3, marginBottom: '12px', display: 'block' }}></i>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.90rem', margin: 0 }}>
                      Nenhuma ficha cadastrada nesta categoria.
                    </p>
                  </div>
                )}
              </div>
            );
          })() : (
            <div className="content-panel" style={{ 
              textAlign: 'center', 
              padding: '40px 20px',
              background: 'rgba(22, 29, 45, 0.45)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)'
            }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Sua ficha de treino está sendo montada pelos professores.</p>
            </div>
          )}

          {/* 🌟 Histórico de Ciclos e Treinos Anteriores do Aluno */}
          {workoutCyclesHistory.length > 0 && (
            <div className="content-panel" style={{
              marginTop: '24px',
              background: 'rgba(22, 29, 45, 0.45)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
              padding: '24px'
            }}>
              <div 
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                onClick={() => setShowCyclesHistory(!showCyclesHistory)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--color-primary)', fontSize: '1.2rem' }}></i>
                  <div>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                      Histórico de Ciclos e Treinos Anteriores
                    </h2>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Consulte as rotinas e periodizações já concluídas da sua jornada ({workoutCyclesHistory.length} ciclo(s))
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className={showCyclesHistory ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'}></i>
                  {showCyclesHistory ? 'Recolher' : 'Visualizar Histórico'}
                </button>
              </div>

              {showCyclesHistory && (
                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {workoutCyclesHistory.map((cycle: any, cIdx: number) => {
                    const isExp = expandedCycleId === (cycle._id || String(cIdx));
                    const monS = cycle.snapshot?.fichasMonitorado || [];
                    const livS = cycle.snapshot?.fichasLivre || [];
                    const allSheets = [...monS, ...livS];
                    const exTotal = allSheets.reduce((acc: number, s: any) => acc + (s.exercicios?.length || 0), 0);
                    const periodStr = cycle.dataInicio && cycle.dataFim
                      ? `${cycle.dataInicio.split('-').reverse().join('/')} até ${cycle.dataFim.split('-').reverse().join('/')} (${cycle.diasCiclo || 0} dias)`
                      : (cycle.createdAt ? new Date(cycle.createdAt).toLocaleDateString('pt-BR') : '-');

                    return (
                      <div
                        key={cycle._id || cIdx}
                        style={{
                          background: 'rgba(0, 0, 0, 0.25)',
                          border: isExp ? '1px solid var(--color-primary)' : '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '12px',
                          padding: '16px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                                {cycle.statusCiclo === 'arquivado' ? 'Arquivado' : 'Ciclo Concluído'}
                              </span>
                              <strong style={{ fontSize: '0.98rem', color: 'var(--text-main)' }}>
                                {cycle.sheetNome || cycle.motivo || 'Ciclo de Treino'}
                              </strong>
                            </div>

                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                              <i className="fa-regular fa-calendar" style={{ marginRight: '5px' }}></i>
                              {periodStr}
                              {cycle.profissionalNome && (
                                <span style={{ marginLeft: '10px' }}>
                                  • <i className="fa-solid fa-user-doctor" style={{ marginRight: '4px' }}></i> Prescrito por: {cycle.profissionalNome}
                                </span>
                              )}
                            </div>

                            {cycle.observacoes && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--color-warning)', marginTop: '4px', fontStyle: 'italic' }}>
                                Foco: {cycle.observacoes}
                              </div>
                            )}

                            <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                              {exTotal} exercício(s) prescritos no período
                              {cycle.volumeKg ? ` • ${cycle.volumeKg.toLocaleString('pt-BR')} kg volume previsto` : ''}
                            </div>
                          </div>

                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setExpandedCycleId(isExp ? null : (cycle._id || String(cIdx)))}
                            style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <i className={isExp ? 'fa-solid fa-chevron-up' : 'fa-solid fa-eye'}></i>
                            {isExp ? 'Ocultar Exercícios' : 'Ver Exercícios Deste Ciclo'}
                          </button>
                        </div>

                        {isExp && (
                          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            {allSheets.map((sheet: any, sIdx: number) => {
                              const sExs = sheet.exercicios || [];
                              if (sExs.length === 0) return null;
                              return (
                                <div key={sheet.id || sIdx} style={{ marginBottom: sIdx < allSheets.length - 1 ? '20px' : 0 }}>
                                  <h4 style={{ color: 'var(--color-primary)', fontSize: '0.90rem', marginBottom: '12px' }}>
                                    {sheet.nome || `Ficha ${sheet.id}`} ({sExs.length} exercícios)
                                  </h4>
                                  {renderWorkoutCards(sExs)}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'evolucao' && (
        <>
          {/* ========================================================
              HERO HEADER: MINHA EVOLUÇÃO & PERFORMANCE (PREMIUM)
             ======================================================== */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-bolt"></i> Sports Science & Biometria Avançada
                </span>
                <h1 style={{ 
                  margin: '4px 0',
                  fontFamily: 'var(--font-title)', 
                  fontSize: '1.85rem', 
                  fontWeight: 900, 
                  background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)', 
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.5px'
                }}>
                  Minha Evolução & Performance
                </h1>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.86rem' }}>
                  Acompanhamento de alto padrão com curvas comparativas reais e rigor técnico.
                </p>
              </div>

              {/* Status Badge & Toggle de Modo de Leitura (Touch Friendly) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#34d399',
                  fontWeight: 800,
                  fontSize: '0.76rem'
                }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }}></span>
                  <span>{evolutionData.totalMetricasAtivas} métricas em evolução ativa (≥ 2 medições)</span>
                </div>

                {/* Segmented Control Touch: Recente vs Histórico */}
                <div style={{
                  display: 'inline-flex',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '3px',
                  gap: '4px'
                }}>
                  <button
                    type="button"
                    onClick={() => setEvoViewMode('recente')}
                    style={{
                      padding: '7px 14px',
                      minHeight: '38px',
                      borderRadius: '9px',
                      border: 'none',
                      background: evoViewMode === 'recente' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                      color: evoViewMode === 'recente' ? '#ffffff' : '#94a3b8',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <i className="fa-solid fa-forward-step"></i> Último Salto
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvoViewMode('historico')}
                    style={{
                      padding: '7px 14px',
                      minHeight: '38px',
                      borderRadius: '9px',
                      border: 'none',
                      background: evoViewMode === 'historico' ? 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)' : 'transparent',
                      color: evoViewMode === 'historico' ? '#ffffff' : '#94a3b8',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <i className="fa-solid fa-chart-line"></i> Total Acumulado
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================
              CARROSSEL HORIZONTAL DE CATEGORIAS (MOBILE SNAP)
             ======================================================== */}
          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '8px',
            marginBottom: '20px',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            scrollSnapType: 'x proximity'
          }}>
            {evolutionData.gruposOrdenados.map(g => {
              const isActive = evoSubTab === g.id;
              const hasItems = g.totalElegiveis > 0;

              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setEvoSubTab(g.id)}
                  style={{
                    flexShrink: 0,
                    scrollSnapAlign: 'start',
                    padding: '10px 16px',
                    minHeight: '44px',
                    borderRadius: '14px',
                    border: isActive ? `1.5px solid ${g.cor}` : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isActive ? `${g.cor}20` : 'rgba(30, 41, 59, 0.5)',
                    color: isActive ? '#ffffff' : hasItems ? '#cbd5e1' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isActive ? `0 4px 16px ${g.cor}33` : 'none'
                  }}
                >
                  <i className={`fa-solid ${g.icone}`} style={{ color: isActive ? g.cor : hasItems ? g.cor : '#64748b', fontSize: '0.9rem' }}></i>
                  <span>{g.titulo}</span>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '10px',
                    background: hasItems ? (isActive ? g.cor : 'rgba(255, 255, 255, 0.1)') : 'rgba(255, 255, 255, 0.04)',
                    color: hasItems ? (isActive ? '#000000' : '#ffffff') : '#64748b'
                  }}>
                    {g.totalElegiveis}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ========================================================
              CONTEÚDO DA CATEGORIA ATIVA
             ======================================================== */}
          {(() => {
            const currentGroup = evolutionData.grupos[evoSubTab] || evolutionData.grupos.composicao;

            // CASO 1: SEM ITENS ELEGÍVEIS (REGRA >= 2 REGISTROS)
            if (currentGroup.totalElegiveis === 0) {
              return (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.7) 100%)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '20px',
                  padding: '48px 24px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
                  margin: '8px 0'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: `${currentGroup.cor}18`,
                    border: `${currentGroup.cor}44 1px solid`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                    color: currentGroup.cor,
                    fontSize: '1.6rem',
                    boxShadow: `0 0 24px ${currentGroup.cor}22`
                  }}>
                    <i className={`fa-solid ${currentGroup.icone}`}></i>
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-title)' }}>
                    Aguardando 2ª Medição em {currentGroup.titulo}
                  </h3>
                  <p style={{ margin: 0, maxWidth: '520px', fontSize: '0.86rem', color: '#94a3b8', lineHeight: 1.5 }}>
                    Em conformidade com o padrão técnico de excelência do Clube Fitness, <strong>só exibimos comparativos e gráficos quando existem pelo menos 2 registros</strong> de uma mesma variável.
                  </p>
                  <div style={{
                    marginTop: '20px',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    fontSize: '0.78rem',
                    color: '#cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <i className="fa-solid fa-lock" style={{ color: currentGroup.cor }}></i>
                    <span>Sua linha do tempo e curvas serão desbloqueadas aqui na sua próxima avaliação.</span>
                  </div>
                </div>
              );
            }

            // CASO 2: POSSUI MÉTRICAS ELEGÍVEIS (>= 2 REGISTROS)
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* 1. GRÁFICO SPLINE EM DESTAQUE (PARA COMPOSIÇÃO CORPORAL) */}
                {evoSubTab === 'composicao' && (() => {
                  const chartSeries = [];
                  const pesoM = currentGroup.metricas.find(m => m.id === 'peso');
                  const magraM = currentGroup.metricas.find(m => m.id === 'massaMagra');
                  const gordaM = currentGroup.metricas.find(m => m.id === 'massaGorda');

                  if (pesoM) {
                    chartSeries.push({
                      id: 'peso',
                      nome: 'Peso (kg)',
                      unidade: 'kg',
                      cor: '#38bdf8',
                      pontos: pesoM.historico
                    });
                  }
                  if (magraM) {
                    chartSeries.push({
                      id: 'massaMagra',
                      nome: 'Massa Magra (kg)',
                      unidade: 'kg',
                      cor: '#10b981',
                      pontos: magraM.historico
                    });
                  }
                  if (gordaM) {
                    chartSeries.push({
                      id: 'massaGorda',
                      nome: 'Massa Gorda (kg)',
                      unidade: 'kg',
                      cor: '#f87171',
                      pontos: gordaM.historico
                    });
                  }

                  if (chartSeries.length > 0) {
                    return (
                      <EvolutionSplineChart
                        series={chartSeries}
                        titulo="Curva Histórica de Composição Corporal"
                        subtitulo="Toque em qualquer ponto para conferir peso e tecidos na data correspondente"
                        altura={250}
                      />
                    );
                  }
                  return null;
                })()}

                {/* 1.1 GRÁFICO SPLINE PARA DOR CLÍNICA (EVA) */}
                {evoSubTab === 'clinica' && (() => {
                  const evaM = currentGroup.metricas.find(m => m.id === 'clinica_eva');
                  if (evaM && evaM.historico.length >= 2) {
                    return (
                      <EvolutionSplineChart
                        series={[{
                          id: 'eva',
                          nome: 'Nível de Dor (EVA 0–10)',
                          unidade: '/10',
                          cor: '#14b8a6',
                          pontos: evaM.historico
                        }]}
                        titulo="Curva de Alívio de Sintomas e Conforto (EVA)"
                        subtitulo="Acompanhamento da intensidade de dor registrada nos relatórios de fisioterapia"
                        altura={220}
                      />
                    );
                  }
                  return null;
                })()}

                {/* 2. SEÇÃO DE SIMETRIAS BILATERAIS (QUANDO HOUVER) */}
                {currentGroup.simetrias && currentGroup.simetrias.length > 0 && (
                  <div>
                    <h3 style={{ margin: '0 0 14px', fontSize: '1.02rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-scale-balanced" style={{ color: currentGroup.cor }}></i>
                      Equilíbrio & Simetria Bilateral (Direito vs Esquerdo)
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '14px' }}>
                      {currentGroup.simetrias.map(sym => (
                        <EvolutionSymmetryGauge key={sym.id} symmetry={sym} color={currentGroup.cor} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. GRID DE CARDS DE MÉTRICA INDIVIDUAL */}
                {currentGroup.metricas.length > 0 && (
                  <div>
                    <h3 style={{ margin: '0 0 14px', fontSize: '1.02rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-chart-simple" style={{ color: currentGroup.cor }}></i>
                      {currentGroup.titulo} ({currentGroup.metricas.length} métricas ativas)
                    </h3>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '14px'
                    }}>
                      {currentGroup.metricas.map(m => (
                        <EvolutionMetricCard
                          key={m.id}
                          metric={m}
                          color={currentGroup.cor}
                          viewMode={evoViewMode}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. HISTÓRICO DETALHADO DE LAUDOS E AVALIAÇÕES PARA DOWNLOAD */}
                {assessments.length > 0 && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.45) 0%, rgba(15, 23, 42, 0.65) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '16px',
                    padding: '20px',
                    marginTop: '10px'
                  }}>
                    <h4 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-file-pdf" style={{ color: '#ef4444' }}></i>
                      Laudos Oficiais Emitidos ({assessments.length})
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                      {assessments.map(a => (
                        <div
                          key={a._id}
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '12px',
                            padding: '12px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#ffffff' }}>
                              📅 {formatDateBR(a.data)}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                              {a.avaliadorId?.nome || 'Avaliador Técnico'}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '6px 10px', fontSize: '0.72rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}
                            onClick={() => downloadAssessmentPDF(a, assessments)}
                          >
                            <i className="fa-solid fa-download"></i> PDF
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}

      {activeTab === 'trancamento' && (
        <>
          <div className="view-header" style={{ marginBottom: '20px' }}>
            <div className="view-title-group">
              <h1 style={{ 
                fontFamily: 'var(--font-title)', 
                fontSize: '1.8rem', 
                fontWeight: 800, 
                background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                marginBottom: '4px'
              }}>
                Trancamento de Plano
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tranque semanas do seu plano e redistribua os créditos para os meses restantes.</p>
            </div>
          </div>

          {!activeContract ? (
            <div className="content-panel" style={{ 
              textAlign: 'center', 
              padding: '40px 20px',
              background: 'rgba(22, 29, 45, 0.45)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
              borderRadius: '14px'
            }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '24px', color: 'var(--color-danger)' }}></i>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Nenhum Contrato Ativo</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Você não possui nenhum contrato assinado ou ativo no momento para realizar trancamentos.</p>
            </div>
          ) : !isContractAnual(activeContract) ? (
            <div className="content-panel" style={{ 
              textAlign: 'center', 
              padding: '40px 20px',
              background: 'rgba(22, 29, 45, 0.45)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
              borderRadius: '14px'
            }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <i className="fa-solid fa-lock" style={{ fontSize: '24px', color: '#f59e0b' }}></i>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Benefício Exclusivo para Planos Anuais</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 auto 12px', maxWidth: '500px' }}>
                O trancamento temporário de plano (até 4 semanas) e redistribuição de créditos é um benefício exclusivo de contratos da <strong>modalidade Anual</strong>.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>
                Plano atual contratado: <strong>{activeContract.planoNome}</strong>.
              </p>
            </div>
          ) : !activeContract.frequencia || Number(activeContract.frequencia) <= 0 ? (
            <div className="content-panel" style={{ 
              textAlign: 'center', 
              padding: '40px 20px',
              background: 'rgba(22, 29, 45, 0.45)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
              borderRadius: '14px'
            }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '24px', color: 'var(--color-danger)' }}></i>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Frequência Semanal Não Definida</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                O seu contrato anual não possui uma frequência semanal válida cadastrada. Por favor, entre em contato com a equipe de atendimento ou administração para regularizar o cadastro.
              </p>
            </div>
          ) : (
            (() => {
              const totalSemanasTrancadas = trancamentosList.reduce((sum, t) => sum + t.semanas, 0);
              const semanasDisponiveis = Math.max(0, 4 - totalSemanasTrancadas);
              const frequencia = Number(activeContract.frequencia);
              const creditosCongelados = trancamentoSemanas * frequencia;

              const remainingMonths = getRemainingMonthsList();
              const sumRedist = remainingMonths.reduce((sum, m) => sum + (trancamentoRedistribuicao[m.value] || 0), 0);
              const isDistributionPerfect = sumRedist === creditosCongelados;

              return (
                <div className="trancamento-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
                  {/* Form de Trancamento */}
                  <div className="content-panel" style={{ 
                    background: 'rgba(22, 29, 45, 0.45)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
                    padding: '24px'
                  }}>
                    <div className="panel-header" style={{ marginBottom: '20px' }}>
                      <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}><i className="fa-solid fa-snowflake" style={{ marginRight: '8px', color: 'var(--color-primary)' }}></i>Solicitar Trancamento</h2>
                    </div>

                    {trancamentoErrorMsg && (
                      <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-danger)', color: '#f87171', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
                        <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>
                        {trancamentoErrorMsg}
                      </div>
                    )}
                    {trancamentoSuccessMsg && (
                      <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--color-success)', color: '#34d399', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
                        <i className="fa-solid fa-circle-check" style={{ marginRight: '6px' }}></i>
                        {trancamentoSuccessMsg}
                      </div>
                    )}

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.04)', marginBottom: '20px', fontSize: '0.85rem', lineHeight: '1.5' }}>
                      <p style={{ margin: '0 0 8px 0' }}>Plano: <strong>{activeContract.planoNome}</strong></p>
                      <p style={{ margin: '0 0 8px 0' }}>Vigência: de <strong>{formatDateBR(activeContract.dataInicio)}</strong> até <strong>{formatDateBR(activeContract.dataFim)}</strong></p>
                      <p style={{ margin: '0 0 8px 0' }}>Frequência contratada: <strong>{frequencia}x por semana</strong></p>
                      <p style={{ margin: '0', color: semanasDisponiveis > 0 ? 'var(--color-primary)' : 'var(--color-danger)', fontWeight: 600 }}>
                        Semanas já trancadas: {totalSemanasTrancadas} de 4 (Restam {semanasDisponiveis} semanas disponíveis)
                      </p>
                    </div>

                    {semanasDisponiveis <= 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Você já atingiu o limite máximo de 4 semanas trancadas para este contrato.
                      </div>
                    ) : (
                      <form onSubmit={handleRequestTrancamento}>
                        <div className="form-group" style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>Data de Início do Trancamento</label>
                          <input
                            type="date"
                            className="form-control"
                            value={trancamentoDataInicio}
                            onChange={e => setTrancamentoDataInicio(e.target.value)}
                            style={{ 
                              background: 'rgba(0, 0, 0, 0.25)', 
                              border: '1px solid rgba(255, 255, 255, 0.06)', 
                              color: 'var(--text-main)',
                              borderRadius: '8px',
                              padding: '10px 14px',
                              width: '100%'
                            }}
                            required
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>Quantidade de Semanas a Trancar</label>
                          <select
                            className="select-custom"
                            value={trancamentoSemanas}
                            onChange={e => {
                              setTrancamentoSemanas(Number(e.target.value));
                              setTrancamentoRedistribuicao({});
                            }}
                            style={{ 
                              background: 'rgba(0, 0, 0, 0.25)', 
                              border: '1px solid rgba(255, 255, 255, 0.06)', 
                              color: 'var(--text-main)',
                              borderRadius: '8px',
                              padding: '10px 14px',
                              width: '100%',
                              cursor: 'pointer'
                            }}
                          >
                            {Array.from({ length: semanasDisponiveis }, (_, i) => i + 1).map(n => (
                              <option key={n} value={n} style={{ background: '#0a0e17' }}>{n} {n === 1 ? 'semana' : 'semanas'}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ fontSize: '0.92rem', fontWeight: 700, margin: '15px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                          <i className="fa-solid fa-coins" style={{ color: 'var(--color-primary)' }}></i>
                          Créditos a Redistribuir: <span style={{ color: 'var(--color-primary)' }}>{creditosCongelados} créditos</span>
                        </div>

                        {trancamentoDataInicio && (
                          <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(0,0,0,0.15)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>Redistribuição de Créditos</h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                              Escolha como distribuir os {creditosCongelados} créditos entre os meses restantes de vigência do seu contrato:
                            </p>

                            {remainingMonths.map(m => (
                              <div key={m.value} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{ fontSize: '0.8rem', textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-muted)' }}>{m.label}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '2px 8px', minWidth: '28px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                                    onClick={() => {
                                      const currentVal = trancamentoRedistribuicao[m.value] || 0;
                                      if (currentVal > 0) {
                                        setTrancamentoRedistribuicao({
                                          ...trancamentoRedistribuicao,
                                          [m.value]: currentVal - 1
                                        });
                                      }
                                    }}
                                  >
                                    -
                                  </button>
                                  <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                    {trancamentoRedistribuicao[m.value] || 0}
                                  </span>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '2px 8px', minWidth: '28px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                                    onClick={() => {
                                      const currentVal = trancamentoRedistribuicao[m.value] || 0;
                                      if (sumRedist < creditosCongelados) {
                                        setTrancamentoRedistribuicao({
                                          ...trancamentoRedistribuicao,
                                          [m.value]: currentVal + 1
                                        });
                                      }
                                    }}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            ))}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>Total Distribuído:</span>
                              <span style={{ 
                                fontSize: '0.85rem', 
                                fontWeight: 800, 
                                color: isDistributionPerfect ? 'var(--color-success)' : 'var(--color-danger)'
                              }}>
                                {sumRedist} de {creditosCongelados}
                              </span>
                            </div>
                            {isDistributionPerfect ? (
                              <small style={{ color: 'var(--color-success)', display: 'block', marginTop: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                                <i className="fa-solid fa-circle-check"></i> Distribuição perfeita dos créditos!
                              </small>
                            ) : (
                              <small style={{ color: 'var(--color-warning)', display: 'block', marginTop: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                                Distribua exatamente os {creditosCongelados} créditos para habilitar o envio.
                              </small>
                            )}
                          </div>
                        )}

                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={!isDistributionPerfect || !trancamentoDataInicio}
                          style={{ width: '100%', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                          <i className="fa-solid fa-check"></i> Confirmar Trancamento e Redistribuir
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Histórico de Trancamentos */}
                  <div className="content-panel" style={{ 
                    background: 'rgba(22, 29, 45, 0.45)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
                    padding: '24px'
                  }}>
                    <div className="panel-header">
                      <h2>Histórico de Trancamentos</h2>
                    </div>

                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Data Início</th>
                            <th>Semanas</th>
                            <th>Créditos</th>
                            <th>Redistribuição</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trancamentosList.length === 0 ? (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                Nenhum trancamento solicitado ou realizado ainda.
                              </td>
                            </tr>
                          ) : (
                            trancamentosList.map(t => (
                              <tr key={t._id}>
                                <td data-label="Data Início"><strong>{formatDateBR(t.dataInicio)}</strong></td>
                                <td data-label="Semanas">{t.semanas} {t.semanas === 1 ? 'semana' : 'semanas'}</td>
                                <td data-label="Créditos"><span className="badge badge-info">{t.creditosTrancados} créditos</span></td>
                                <td data-label="Redistribuição" style={{ fontSize: '0.8rem' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                                    {t.redistribuicao?.map((r: any) => (
                                      <div key={r.mesAno} style={{ whiteSpace: 'nowrap' }}>
                                        {formatMonthYearBR(r.mesAno)}: <strong>+{r.creditos}</strong> cr.
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </>
      )}


      {/* View: Meus Créditos */}
      {activeTab === 'creditos' && (
        <>
          <div className="view-header" style={{ marginBottom: '20px' }}>
            <div className="view-title-group">
              <h1 style={{ 
                fontFamily: 'var(--font-title)', 
                fontSize: '1.8rem', 
                fontWeight: 800, 
                background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                marginBottom: '4px'
              }}>
                Meus Créditos
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Acompanhe o saldo de cada tipo de crédito do seu plano.</p>
            </div>
          </div>

          {/* 3 Cards de Crédito */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '8px' }}>

            {/* Academia */}
            {(() => {
              const pct = credTotal > 0 ? Math.round(((credUsados + credReservados) / credTotal) * 100) : 0;
              const esgotado = credDisp <= 0 && credTotal > 0;
              return (
                <div style={{ 
                  background: 'rgba(22, 29, 45, 0.45)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '14px',
                  padding: '24px',
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
                  borderLeft: `4px solid ${esgotado ? 'var(--color-danger)' : 'var(--color-primary)'}`,
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = esgotado ? 'var(--color-danger)' : 'var(--color-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: esgotado ? 'rgba(239,68,68,0.12)' : 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fa-solid fa-dumbbell" style={{ fontSize: '18px', color: esgotado ? 'var(--color-danger)' : 'var(--color-primary)' }}></i>
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)' }}>Créditos de Academia</h3>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Treino Monitorado e Avaliações</p>
                    </div>
                    {esgotado && <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--color-danger)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '2px 8px', borderRadius: '8px', fontWeight: 700 }}>ESGOTADO</span>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '18px', textAlign: 'center' }}>
                    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: credDisp > 0 ? 'var(--color-primary)' : 'var(--color-danger)' }}>{credDisp}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Disponíveis</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>{credUsados}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Usados</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.15)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-warning)' }}>{credReservados}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Reservados</div>
                    </div>
                  </div>
                  <div style={{ height: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: esgotado ? 'var(--color-danger)' : 'var(--color-primary)', borderRadius: '6px', transition: 'width 0.4s' }}></div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'right', fontWeight: 600 }}>{pct}% utilizado de {credTotal} créditos/mês</div>
                </div>
              );
            })()}

            {/* Emergência */}
            {(() => {
              const pct = emergTotal > 0 ? Math.round(((emergUsados + emergReservados) / emergTotal) * 100) : 0;
              const esgotado = emergDisp <= 0 && emergTotal > 0;
              const semPlano = emergTotal === 0;
              return (
                <div style={{ 
                  background: 'rgba(22, 29, 45, 0.45)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '14px',
                  padding: '24px',
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
                  borderLeft: `4px solid ${esgotado ? 'var(--color-danger)' : semPlano ? 'rgba(255,255,255,0.1)' : '#f59e0b'}`,
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = esgotado ? 'var(--color-danger)' : semPlano ? 'rgba(255,255,255,0.1)' : '#f59e0b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: esgotado ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '18px', color: esgotado ? 'var(--color-danger)' : '#f59e0b' }}></i>
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)' }}>Créditos de Emergência</h3>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Agendamentos extras (Seg–Sex)</p>
                    </div>
                    {esgotado && <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--color-danger)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '2px 8px', borderRadius: '8px', fontWeight: 700 }}>ESGOTADO</span>}
                  </div>
                  {semPlano ? (
                    <div style={{ background: 'rgba(0,0,0,0.1)', borderRadius: '10px', padding: '20px', border: '1px dashed rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '105px' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', margin: 0, fontWeight: 500 }}>Seu plano atual não inclui créditos de emergência.</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '18px', textAlign: 'center' }}>
                        <div style={{ background: 'rgba(0,0,0,0.15)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: emergDisp > 0 ? '#f59e0b' : 'var(--color-danger)' }}>{emergDisp}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Disponíveis</div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.15)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>{emergUsados}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Usados</div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.15)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-warning)' }}>{emergReservados}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Reservados</div>
                        </div>
                      </div>
                      <div style={{ height: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: esgotado ? 'var(--color-danger)' : '#f59e0b', borderRadius: '6px', transition: 'width 0.4s' }}></div>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'right', fontWeight: 600 }}>{pct}% utilizado de {emergTotal} crédito(s)/mês</div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Massagem */}
            {(() => {
              const pct = massTotal > 0 ? Math.round(((massUsados + massReservados) / massTotal) * 100) : 0;
              const esgotado = massDisp <= 0 && massTotal > 0;
              const semPlano = massTotal === 0;
              return (
                <div style={{ 
                  background: 'rgba(22, 29, 45, 0.45)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '14px',
                  padding: '24px',
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
                  borderLeft: `4px solid ${esgotado ? 'var(--color-danger)' : semPlano ? 'rgba(255,255,255,0.1)' : '#a855f7'}`,
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = esgotado ? 'var(--color-danger)' : semPlano ? 'rgba(255,255,255,0.1)' : '#a855f7';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: esgotado ? 'rgba(239,68,68,0.12)' : 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fa-solid fa-spa" style={{ fontSize: '18px', color: esgotado ? 'var(--color-danger)' : '#a855f7' }}></i>
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)' }}>Créditos de Massagem</h3>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sessões aos Sábados</p>
                    </div>
                    {esgotado && <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--color-danger)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '2px 8px', borderRadius: '8px', fontWeight: 700 }}>ESGOTADO</span>}
                  </div>
                  {semPlano ? (
                    <div style={{ background: 'rgba(0,0,0,0.1)', borderRadius: '10px', padding: '20px', border: '1px dashed rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '105px' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', margin: 0, fontWeight: 500 }}>Seu plano atual não inclui créditos de massagem.</p>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '18px', textAlign: 'center' }}>
                        <div style={{ background: 'rgba(0,0,0,0.15)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: massDisp > 0 ? '#a855f7' : 'var(--color-danger)' }}>{massDisp}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Disponíveis</div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.15)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>{massUsados}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Usados</div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.15)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-warning)' }}>{massReservados}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>Reservados</div>
                        </div>
                      </div>
                      <div style={{ height: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: esgotado ? 'var(--color-danger)' : '#a855f7', borderRadius: '6px', transition: 'width 0.4s' }}></div>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'right', fontWeight: 600 }}>{pct}% utilizado de {massTotal} crédito(s)/mês</div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Histórico por tipo */}
          <div className="content-panel" style={{ 
            marginTop: '24px',
            background: 'rgba(22, 29, 45, 0.45)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
            padding: '24px'
          }}>
            <div className="panel-header" style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}><i className="fa-solid fa-clock-rotate-left" style={{ marginRight: '8px', color: 'var(--color-primary)' }}></i>Histórico de Uso</h2>
            </div>
            {appointments.filter((a: any) => a.tipoCredito && a.tipoCredito !== 'nenhum').length === 0 ? (
              <p style={{ color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center', fontSize: '0.85rem' }}>Nenhum agendamento com crédito encontrado.</p>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Serviço</th>
                      <th>Tipo de Crédito</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments
                      .filter((a: any) => a.tipoCredito && a.tipoCredito !== 'nenhum')
                      .sort((a: any, b: any) => b.data.localeCompare(a.data))
                      .map((a: any) => {
                        const tipoCor: Record<string, string> = { academia: 'var(--color-primary)', emergencia: '#f59e0b', massagem: '#a855f7' };
                        const tipoLabel: Record<string, string> = { academia: 'Academia', emergencia: 'Emergência', massagem: 'Massagem' };
                        
                        let badgeClass = 'badge-success';
                        if (a.status === 'agendado') badgeClass = 'badge-info';
                        else if (a.status === 'cancelado') badgeClass = 'badge-danger';
                        else if (a.status === 'falta') badgeClass = 'badge-warning';

                        return (
                          <tr key={a._id}>
                            <td><strong>{formatDateBR(a.data)} {a.horario}</strong></td>
                            <td>{a.servico}</td>
                            <td>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: tipoCor[a.tipoCredito] || 'var(--text-muted)', background: `${tipoCor[a.tipoCredito] || 'var(--text-muted)'}15`, border: `1px solid ${tipoCor[a.tipoCredito] || 'var(--text-muted)'}30`, padding: '2px 8px', borderRadius: '8px' }}>
                                {tipoLabel[a.tipoCredito] || a.tipoCredito}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${badgeClass}`}>{a.status}</span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Default Fallback for other tabs */}
      {!['dashboard', 'agendar', 'agendamentos', 'treino', 'evolucao', 'documentos', 'trancamento', 'creditos'].includes(activeTab) && (
        <div className="content-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h2>Aba em Desenvolvimento</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            A visualização da aba <strong>{activeTab}</strong> está sendo migrada. Seus treinos e evoluções estão salvos.
          </p>
        </div>
      )}
      {/* Modal de Instruções de Exercício */}
      {selectedExerciseForInstruction && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.75)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backdropFilter: 'blur(4px)',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-dark)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: 'var(--shadow-card)',
            color: 'var(--text-main)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--font-title)', color: 'var(--color-primary)', fontSize: '1.25rem' }}>
                Instruções - {selectedExerciseForInstruction.nome}
              </h3>
              <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }} onClick={() => setSelectedExerciseForInstruction(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-primary)', background: 'var(--color-primary-glow)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, border: '1px solid rgba(16,185,129,0.15)' }}>
                Foco: {selectedExerciseForInstruction.grupo}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, border: '1px solid rgba(59,130,246,0.15)' }}>
                Equipamento: {selectedExerciseForInstruction.equipamento || 'Nenhum'}
              </span>
            </div>

            {selectedExerciseForInstruction.gifUrl && (
              <div style={{
                marginBottom: '18px',
                borderRadius: '10px',
                overflow: 'hidden',
                background: '#000',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                {selectedExerciseForInstruction.gifUrl.match(/\.(mp4|webm)($|\?)/i) ? (
                  <video
                    src={selectedExerciseForInstruction.gifUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{ width: '100%', maxHeight: '220px', objectFit: 'contain' }}
                  />
                ) : (
                  <img
                    src={selectedExerciseForInstruction.gifUrl?.startsWith('data:') ? selectedExerciseForInstruction.gifUrl : `/api/image-proxy?url=${encodeURIComponent(selectedExerciseForInstruction.gifUrl)}`}
                    alt={selectedExerciseForInstruction.nome}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    style={{ width: '100%', maxHeight: '220px', objectFit: 'contain' }}
                  />
                )}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)' }}>
                <i className="fa-solid fa-list-check"></i> Como Executar Corretamente
              </h4>
              <div style={{
                background: 'rgba(0,0,0,0.15)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '16px',
                fontSize: '0.85rem',
                lineHeight: '1.45',
                maxHeight: '220px',
                overflowY: 'auto',
                color: 'var(--text-main)',
                whiteSpace: 'pre-wrap'
              }}>
                {selectedExerciseForInstruction.instrucoes || 'Sem instruções adicionais.'}
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setSelectedExerciseForInstruction(null)}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
