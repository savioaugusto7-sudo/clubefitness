'use client';

import { useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import Pagination from './Pagination';
import { downloadReportPDF, downloadAssessmentPDF } from '@/utils/pdfGenerator';

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

  // Sub-tabs for evolution
  const [evoSubTab, setEvoSubTab] = useState<'composicao' | 'perimetros' | 'mobilidade' | 'forca'>('composicao');

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

    // Checa se já passou de sexta-feira às 18h ou se é sábado/domingo
    const nextWeekReleased = (todayDayOfWeek === 5 && todayHours >= 18) || todayDayOfWeek === 6 || todayDayOfWeek === 0;

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
  const getPageSize = (key: string) => pageSize[key] || 8;
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginTop: '16px' }}>
        {sheetExercises.map((ex: any, idx: number) => {
          const details = exercises.find((e: any) => e.nome.toLowerCase() === ex.exercicioId.toLowerCase()) || { nome: ex.exercicioId, grupo: 'Geral' };
          const groupColor = getGroupColor(ex.combinaGrupo);
          const groupStyle = ex.combinaGrupo ? { borderLeft: `5px solid ${groupColor}`, background: 'rgba(255,255,255,0.015)' } : {};

          return (
            <div key={idx} className="workout-card-premium" style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-card)',
              ...groupStyle
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-primary)', background: 'var(--color-primary-glow)', padding: '2px 8px', borderRadius: '8px', fontWeight: 600, textTransform: 'uppercase' }}>
                    {details.grupo}
                  </span>
                  {ex.combinaGrupo && (
                    <span style={{ fontSize: '0.68rem', color: '#fff', background: groupColor, padding: '2px 8px', borderRadius: '8px', fontWeight: 700, textTransform: 'uppercase' }}>
                      Combinado {ex.combinaGrupo}
                    </span>
                  )}
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    #{idx + 1}
                  </span>
                </div>

                <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.3 }}>
                  {details.nome}
                </h4>

                {ex.combinaGrupo && (
                  <div style={{ fontSize: '0.72rem', color: groupColor, background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '6px', marginBottom: '12px', fontWeight: 600, border: `1px dashed ${groupColor}`, textAlign: 'center' }}>
                    <i className="fa-solid fa-circle-nodes"></i> Executar conjugado com {ex.combinaGrupo} (Sem descanso intermediário)
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px', background: 'rgba(0,0,0,0.18)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Séries</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>{ex.series || '3'}</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Repetições</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>{ex.repeticoes || '10'}</span>
                  </div>
                  <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '4px' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Carga</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary)' }}>{ex.carga || '-'}</span>
                  </div>
                  <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '4px' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Descanso</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>{ex.descanso || '60s'}</span>
                  </div>
                  <div style={{ gridColumn: 'span 2', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '4px' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Ritmo de Execução</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>{ex.ritmo || '2-0-2-0'}</span>
                  </div>
                </div>

                {ex.observacao && (
                  <div style={{ fontSize: '0.76rem', color: 'var(--color-warning)', background: 'rgba(245,158,11,0.05)', padding: '6px 10px', borderRadius: '6px', marginBottom: '12px', border: '1px solid rgba(245,158,11,0.1)' }}>
                    <strong>Nota:</strong> {ex.observacao}
                  </div>
                )}
              </div>

              {/* Instruções removidas conforme solicitação */}
            </div>
          );
        })}
      </div>
    );
  };

  const user = session?.user as any;
  const profileId = user?.profileId;

  const fetchData = async () => {
    if (!profileId) return;
    try {
      setLoading(true);
      const [resClient, resApts, resWorkout, resAs, resRep, resExercises, resSt, resContracts, resTrancamentos] = await Promise.all([
        clientId ? fetch(`/api/clients?id=${clientId}`) : fetch(`/api/clients?userId=${user.id}`),
        fetch(`/api/appointments?clientId=${profileId}`),
        fetch(`/api/workouts?clientId=${profileId}`),
        fetch('/api/assessments'),
        fetch('/api/reports'),
        fetch('/api/exercises'),
        fetch('/api/strength-tests'),
        fetch(`/api/contracts?clientId=${profileId}`),
        fetch(`/api/trancamentos?clientId=${profileId}`)
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

  // Reset bookTime when date or service changes
  useEffect(() => {
    setBookTime('');
    setAvailableSlots([]);
  }, [bookDate, bookService]);

  // Fetch available slots when date and service are set
  useEffect(() => {
    if (!bookDate || !bookService) return;
    setLoadingSlots(true);
    fetch(`/api/available-slots?data=${bookDate}&servico=${encodeURIComponent(bookService)}`)
      .then(r => r.json())
      .then(d => { if (d.success) setAvailableSlots(d.data); })
      .catch(() => setAvailableSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [bookDate, bookService]);

  const activeContract = contracts.find(c => c.status === 'assinado' || c.status === 'congelado');

  const getRemainingMonthsList = () => {
    if (!activeContract || !trancamentoDataInicio) return [];
    const start = trancamentoDataInicio;
    const end = activeContract.dataFim;
    const startDate = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T00:00:00');
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
    if (!trancamentoDataInicio) {
      setTrancamentoErrorMsg('Selecione a data de início do trancamento.');
      return;
    }

    const frequencia = activeContract.frequencia || 3;
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
      confirmMsg = `Atenção: Este agendamento é no passado ou possui menos de ${janelaHoras} horas de antecedência. Caso confirme o cancelamento, o crédito correspondente será consumido e NÃO será devolvido. Deseja continuar?`;
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
              <p>Plano Contratado: <strong>{client.dadosComerciais?.planoId?.nome || 'Plano Personalizado'}</strong></p>
              <p>Frequência Contratada: <strong>{client.dadosComerciais?.frequencia} vezes por semana</strong></p>
              <p>Vencimento do Plano: <strong>{formatDateBR(client.dadosComerciais?.vencimento)}</strong></p>
            </div>
          </div>
            </>
          )}
        </>
      )}

      {/* 2. View: Agendar Horário */}
      {activeTab === 'agendar' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Agendar Novo Horário</h1>
              <p>Escolha a data e hora desejada para realizar sua aula.</p>
            </div>
          </div>

          <div className="content-panel" style={{ maxWidth: '600px' }}>
            <form onSubmit={handleBookAppointment}>
              <div className="form-group">
                <label>Serviço</label>
                <select className="select-custom" value={bookService} onChange={e => setBookService(e.target.value)}>
                  {bookDateIsSaturday ? (
                    // Sábado: apenas Massagem
                    <option value="Massagem">Massagem</option>
                  ) : (
                    // Seg-Sex: todos exceto Massagem
                    <>
                      <option value="Treino Monitorado">Treino Monitorado</option>
                      <option value="Treino Livre">Treino Livre</option>
                      <option value="Recovery">Recovery</option>
                      <option value="Avaliação Física">Avaliação Física</option>
                      <option value="Teste de Força">Teste de Força</option>
                      <option value="Avaliação Fisioterápica">Avaliação Fisioterápica</option>
                      <option value="Emergência">Atendimento de Emergência</option>
                    </>
                  )}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600 }}>1. Selecione a Data</label>
                
                {/* Carrossel de datas em formato de cartões (toque rápido) */}
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', margin: '0 -4px' }}>
                  {getNextDays().map((d) => (
                    <button
                      type="button"
                      key={d.dateStr}
                      onClick={() => {
                        setBookDate(d.dateStr);
                        setBookTime('');
                      }}
                      style={{
                        flex: '0 0 68px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '12px 6px',
                        borderRadius: '12px',
                        border: bookDate === d.dateStr ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)',
                        background: bookDate === d.dateStr ? 'var(--color-primary-glow)' : 'rgba(255,255,255,0.01)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        outline: 'none'
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
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600 }}>2. Selecione o Horário</label>
                {!bookDate ? (
                  <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                    <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: '8px' }}></i>
                    Selecione uma data acima para visualizar os horários disponíveis.
                  </div>
                ) : loadingSlots ? (
                  <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                    Carregando horários disponíveis...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-danger)', fontSize: '0.84rem' }}>
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
                          border: bookTime === h ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)',
                          background: bookTime === h ? 'var(--color-primary-glow)' : 'rgba(255,255,255,0.015)',
                          color: bookTime === h ? 'var(--color-primary)' : 'var(--text-main)',
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          textAlign: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          outline: 'none'
                        }}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {bookingStatusMsg && (
                <div style={{ margin: '12px 0', padding: '10px', borderRadius: '8px', background: 'var(--color-primary-glow)', color: 'var(--color-primary)', fontWeight: 600 }}>
                  {bookingStatusMsg}
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                Confirmar Agendamento
              </button>
            </form>
          </div>
        </>
      )}

      {/* 3. View: Meus Agendamentos */}
      {activeTab === 'agendamentos' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Meus Agendamentos</h1>
              <p>Histórico e acompanhamento de agendamentos realizados.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="page-size-selector">
                <span>Exibir:</span>
                <select value={getPageSize('appointments')} onChange={e => setPageSizeForKey('appointments', Number(e.target.value))}>
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={15}>15</option>
                </select>
              </div>
            </div>
          </div>

          <div className="content-panel">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data / Hora</th>
                    <th>Modalidade</th>
                    <th>Serviço</th>
                    <th className="text-center">Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'appointments';
                    const size = getPageSize(listKey);
                    const totalPages = Math.ceil(appointments.length / size);
                    const activeP = getPage(listKey);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = appointments.slice((curP - 1) * size, curP * size);

                    if (paginated.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5}>
                            <div className="empty-state-card">
                              <i className="fa-solid fa-calendar-xmark empty-state-icon"></i>
                              <div className="empty-state-title">Nenhum agendamento futuro</div>
                              <div className="empty-state-desc">Você não possui aulas ou consultas agendadas para os próximos dias.</div>
                              <button type="button" className="btn btn-primary btn-sm" onClick={() => setActiveTab('agendar')}>
                                <i className="fa-solid fa-calendar-plus"></i> Agendar Agora
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return paginated.map(a => (
                      <tr key={a._id}>
                        <td data-label="Data / Hora"><strong>{formatDateBR(a.data)}</strong> às {a.horario}</td>
                        <td data-label="Modalidade">
                          <span className={`badge ${a.tipo === 'academia' ? 'badge-success' : 'badge-info'}`}>
                            {a.tipo === 'academia' ? 'Academia' : 'Fisioterapia'}
                          </span>
                        </td>
                        <td data-label="Serviço">{a.servico}</td>
                        <td data-label="Status" className="text-center">
                          <span className={`badge ${a.status === 'presenca' ? 'badge-success' : a.status === 'falta' ? 'badge-danger' : a.status === 'cancelado' ? 'badge-danger' : 'badge-warning'}`}>
                            {a.status === 'presenca' ? 'Presença Confirmada' : a.status === 'falta' ? 'Falta' : a.status === 'cancelado' ? 'Cancelado' : 'Agendado'}
                          </span>
                        </td>
                        <td data-label="Ações">
                          {a.status === 'agendado' && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleCancelAppointment(a._id)} style={{ width: '100%' }}>
                              Cancelar Agendamento
                            </button>
                          )}
                          {a.status !== 'agendado' && (
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Indisponível</span>
                          )}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {appointments.length > 0 && (
              <Pagination
                currentPage={getPage('appointments')}
                totalItems={appointments.length}
                itemsPerPage={getPageSize('appointments')}
                onPageChange={page => setPage('appointments', page)}
              />
            )}
          </div>
        </>
      )}

      {/* View: Ficha de Treino */}
      {activeTab === 'treino' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Minha Ficha de Treino</h1>
              <p>Consulte sua rotina de treinos prescrita pelos professores.</p>
            </div>
          </div>

          {workout ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
              {/* Monitorado Category */}
              <div className="content-panel">
                <div className="panel-header">
                  <h2>Treino Monitorado (Academia)</h2>
                </div>
                {workout.fichasMonitorado?.filter((f: any) => f.exercicios?.length > 0).map((f: any) => (
                  <div key={f.id} style={{ marginBottom: '32px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '12px' }}>
                    <h3 style={{ color: 'var(--color-primary)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px', fontSize: '1.25rem', fontFamily: 'var(--font-title)' }}>
                      {f.nome} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Atualizado em: {f.ultimaAtualizacao || '-'}</span>
                    </h3>
                    {f.observacoesGerais && (
                      <p style={{ margin: '8px 0 16px 0', fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)' }}>
                        Obs: {f.observacoesGerais}
                      </p>
                    )}
                    {renderWorkoutCards(f.exercicios)}
                  </div>
                ))}
                {(!workout.fichasMonitorado || workout.fichasMonitorado.filter((f: any) => f.exercicios?.length > 0).length === 0) && (
                  <p style={{ color: 'var(--text-muted)' }}>Nenhuma ficha de treino monitorado cadastrada.</p>
                )}
              </div>

              {/* Livre Category */}
              <div className="content-panel">
                <div className="panel-header">
                  <h2>Treino Livre</h2>
                </div>
                {workout.fichasLivre?.filter((f: any) => f.exercicios?.length > 0).map((f: any) => (
                  <div key={f.id} style={{ marginBottom: '32px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '12px' }}>
                    <h3 style={{ color: 'var(--color-secondary)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px', fontSize: '1.25rem', fontFamily: 'var(--font-title)' }}>
                      {f.nome} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Atualizado em: {f.ultimaAtualizacao || '-'}</span>
                    </h3>
                    {f.observacoesGerais && (
                      <p style={{ margin: '8px 0 16px 0', fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid var(--color-secondary)' }}>
                        Obs: {f.observacoesGerais}
                      </p>
                    )}
                    {renderWorkoutCards(f.exercicios)}
                  </div>
                ))}
                {(!workout.fichasLivre || workout.fichasLivre.filter((f: any) => f.exercicios?.length > 0).length === 0) && (
                  <p style={{ color: 'var(--text-muted)' }}>Nenhuma ficha de treino livre cadastrada.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="content-panel" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-muted)' }}>Sua ficha de treino está sendo montada pelos professores.</p>
            </div>
          )}
        </>
      )}

      {/* View: Minha Evolução */}
      {activeTab === 'evolucao' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Minha Evolução Física</h1>
              <p>Acompanhe seu progresso de peso, percentual de gordura, força e medidas corporais.</p>
            </div>
            {assessments.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="page-size-selector">
                  <span>Exibir:</span>
                  <select value={getPageSize('assessments')} onChange={e => setPageSizeForKey('assessments', Number(e.target.value))}>
                    <option value={5}>5</option>
                    <option value={8}>8</option>
                    <option value={15}>15</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {assessments.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
              
              {/* Evolution sub-tabs Segment Control */}
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                {[
                  { id: 'composicao', label: 'Composição Corporal', icon: 'fa-chart-pie' },
                  { id: 'perimetros', label: 'Medidas & Perímetros', icon: 'fa-ruler' },
                  { id: 'mobilidade', label: 'Mobilidade & Goniometria', icon: 'fa-arrows-up-down-left-right' },
                  { id: 'forca', label: 'Força & Cargas', icon: 'fa-dumbbell' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setEvoSubTab(tab.id as any)}
                    className="btn"
                    style={{
                      padding: '8px 16px',
                      background: evoSubTab === tab.id ? 'var(--color-primary-glow)' : 'transparent',
                      borderColor: evoSubTab === tab.id ? 'var(--color-primary)' : 'var(--border-color)',
                      color: evoSubTab === tab.id ? 'var(--color-primary)' : 'var(--text-muted)',
                      borderRadius: '30px',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <i className={`fa-solid ${tab.icon}`}></i> {tab.label}
                  </button>
                ))}
              </div>

              {/* Data definitions for calculations */}
              {(() => {
                const sortedAssessments = [...assessments].sort((a, b) => a.data.localeCompare(b.data));
                const latestAs = sortedAssessments[sortedAssessments.length - 1];
                const prevAs = sortedAssessments.length > 1 ? sortedAssessments[sortedAssessments.length - 2] : null;

                // 1. COMPOSIÇÃO CORPORAL
                if (evoSubTab === 'composicao') {
                  const wLatest = latestAs?.dadosMedidos?.peso || 0;
                  const wPrev = prevAs?.dadosMedidos?.peso || 0;
                  const wDelta = wLatest - wPrev;

                  const fLatest = latestAs?.resultadosCalculados?.percentualGordura || latestAs?.dadosMedidos?.gordura || 0;
                  const fPrev = prevAs?.resultadosCalculados?.percentualGordura || prevAs?.dadosMedidos?.gordura || 0;
                  const fDelta = fLatest - fPrev;

                  const mLatest = latestAs?.resultadosCalculados?.massaMagra || latestAs?.dadosMedidos?.massaMagra || 0;
                  const mPrev = prevAs?.resultadosCalculados?.massaMagra || prevAs?.dadosMedidos?.massaMagra || 0;
                  const mDelta = mLatest - mPrev;

                  const gLatest = latestAs?.resultadosCalculados?.massaGorda || latestAs?.dadosMedidos?.massaGorda || 0;
                  const gPrev = prevAs?.resultadosCalculados?.massaGorda || prevAs?.dadosMedidos?.massaGorda || 0;
                  const gDelta = gLatest - gPrev;

                  const renderDeltaBadge = (delta: number, type: 'decrease_good' | 'increase_good' | 'neutral', unit: string = 'kg') => {
                    if (!prevAs) return null;
                    const sign = delta > 0 ? '+' : '';
                    const isGood = 
                      (type === 'decrease_good' && delta < 0) ||
                      (type === 'increase_good' && delta > 0);
                    
                    const color = isGood ? 'var(--color-success)' : delta === 0 ? 'var(--text-muted)' : 'var(--color-danger)';
                    const bg = isGood ? 'rgba(16, 185, 129, 0.08)' : delta === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(239, 68, 68, 0.08)';
                    const icon = delta > 0 ? 'fa-arrow-trend-up' : delta < 0 ? 'fa-arrow-trend-down' : 'fa-equals';

                    return (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600, background: bg, color: color, border: `1px solid ${color}` }}>
                        <i className={`fa-solid ${icon}`}></i> {sign}{delta.toFixed(1)} {unit}
                      </span>
                    );
                  };

                  const renderCompositionChart = () => {
                    if (sortedAssessments.length === 0) return null;
                    const w = 600;
                    const h = 220;
                    const pad = 40;
                    
                    const weights = sortedAssessments.map(a => a.dadosMedidos?.peso || 0);
                    const leanMasses = sortedAssessments.map(a => a.resultadosCalculados?.massaMagra || a.dadosMedidos?.massaMagra || 0);
                    const fatMasses = sortedAssessments.map(a => a.resultadosCalculados?.massaGorda || a.dadosMedidos?.massaGorda || 0);
                    const allVals = [...weights, ...leanMasses, ...fatMasses].filter(v => v > 0);
                    
                    const maxVal = Math.max(...allVals, 100) * 1.1;
                    const minVal = Math.max(0, Math.min(...allVals, 10) * 0.9);
                    
                    const getX = (idx: number) => {
                      if (sortedAssessments.length <= 1) return w / 2;
                      return pad + (idx / (sortedAssessments.length - 1)) * (w - 2 * pad);
                    };
                    
                    const getY = (val: number) => {
                      return h - pad - ((val - minVal) / (maxVal - minVal)) * (h - 2 * pad);
                    };

                    const getPathData = (vals: number[]) => {
                      return vals.map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(val)}`).join(' ');
                    };

                    return (
                      <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', marginTop: '10px' }}>
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-title)' }}>
                          <i className="fa-solid fa-chart-line" style={{ color: 'var(--color-primary)' }}></i> Histórico de Composição Corporal (Gráfico de Linha)
                        </h4>
                        <div style={{ position: 'relative', overflowX: 'auto' }}>
                          <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="220px" style={{ background: 'transparent', minWidth: '500px' }}>
                            {[0, 0.25, 0.5, 0.75, 1].map((ratio, gridIdx) => {
                              const gridY = pad + ratio * (h - 2 * pad);
                              const gridVal = maxVal - ratio * (maxVal - minVal);
                              return (
                                <g key={gridIdx}>
                                  <line x1={pad} y1={gridY} x2={w - pad} y2={gridY} stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="3,3" />
                                  <text x={pad - 8} y={gridY + 3} style={{ fill: 'var(--text-dim)', fontSize: '8px', textAnchor: 'end', fontWeight: 'bold' }}>{gridVal.toFixed(0)} kg</text>
                                </g>
                              );
                            })}
                            
                            {sortedAssessments.map((a, idx) => (
                              <text key={idx} x={getX(idx)} y={h - 10} style={{ fill: 'var(--text-muted)', fontSize: '8px', textAnchor: 'middle', fontWeight: '600' }}>
                                {formatDateBR(a.data)}
                              </text>
                            ))}

                            {/* Weight Line */}
                            <path d={getPathData(weights)} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
                            {weights.map((val, idx) => (
                              <g key={idx}>
                                <circle cx={getX(idx)} cy={getY(val)} r="5" fill="#3b82f6" stroke="var(--bg-darker)" strokeWidth="1.5" />
                                <text x={getX(idx)} y={getY(val) - 10} style={{ fill: '#3b82f6', fontSize: '9px', fontWeight: 'bold', textAnchor: 'middle' }}>{val.toFixed(1)}</text>
                              </g>
                            ))}

                            {/* Lean Mass Line */}
                            <path d={getPathData(leanMasses)} fill="none" stroke="#10b981" strokeWidth="2.5" />
                            {leanMasses.map((val, idx) => (
                              <g key={idx}>
                                <circle cx={getX(idx)} cy={getY(val)} r="5" fill="#10b981" stroke="var(--bg-darker)" strokeWidth="1.5" />
                                <text x={getX(idx)} y={getY(val) - 10} style={{ fill: '#10b981', fontSize: '9px', fontWeight: 'bold', textAnchor: 'middle' }}>{val.toFixed(1)}</text>
                              </g>
                            ))}

                            {/* Fat Mass Line */}
                            <path d={getPathData(fatMasses)} fill="none" stroke="#ef4444" strokeWidth="2.5" />
                            {fatMasses.map((val, idx) => (
                              <g key={idx}>
                                <circle cx={getX(idx)} cy={getY(val)} r="5" fill="#ef4444" stroke="var(--bg-darker)" strokeWidth="1.5" />
                                <text x={getX(idx)} y={getY(val) - 10} style={{ fill: '#ef4444', fontSize: '9px', fontWeight: 'bold', textAnchor: 'middle' }}>{val.toFixed(1)}</text>
                              </g>
                            ))}
                          </svg>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '12px', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '3px' }}></span> Peso Corporal</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '3px' }}></span> Massa Magra (Músculo)</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '3px' }}></span> Massa Gorda (Gordura)</span>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <div className="metrics-grid" style={{ marginBottom: '0px' }}>
                        <div className="metric-card">
                          <div className="metric-info">
                            <h3>Peso Atual</h3>
                            <div className="value">{wLatest} kg</div>
                            <div style={{ marginTop: '6px' }}>{renderDeltaBadge(wDelta, 'decrease_good')}</div>
                          </div>
                          <div className="metric-icon"><i className="fa-solid fa-weight-scale"></i></div>
                        </div>
                        <div className="metric-card">
                          <div className="metric-info">
                            <h3>Gordura Corporal</h3>
                            <div className="value">{fLatest.toFixed(1)}%</div>
                            <div style={{ marginTop: '6px' }}>{renderDeltaBadge(fDelta, 'decrease_good', '%')}</div>
                          </div>
                          <div className="metric-icon danger"><i className="fa-solid fa-percent"></i></div>
                        </div>
                        <div className="metric-card">
                          <div className="metric-info">
                            <h3>Massa Magra</h3>
                            <div className="value">{mLatest.toFixed(1)} kg</div>
                            <div style={{ marginTop: '6px' }}>{renderDeltaBadge(mDelta, 'increase_good')}</div>
                          </div>
                          <div className="metric-icon"><i className="fa-solid fa-child-strength"></i></div>
                        </div>
                      </div>

                      {renderCompositionChart()}

                      {/* Assessment History Table */}
                      <div className="content-panel" style={{ marginTop: '8px' }}>
                        <div className="panel-header" style={{ marginBottom: '16px' }}>
                          <h2>Histórico Detalhado</h2>
                        </div>
                        <div className="table-responsive">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Data</th>
                                <th className="text-right">Peso</th>
                                <th className="text-right">Gordura Corporal (%)</th>
                                <th className="text-right">Massa Magra (kg)</th>
                                <th className="text-right">Massa Gorda (kg)</th>
                                <th>Avaliador</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const listKey = 'assessments';
                                const size = getPageSize(listKey);
                                const sorted = [...assessments].sort((a, b) => b.data.localeCompare(a.data));
                                const totalPages = Math.ceil(sorted.length / size);
                                const activeP = getPage(listKey);
                                const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                                const paginated = sorted.slice((curP - 1) * size, curP * size);

                                return paginated.map(a => {
                                  const w = a.dadosMedidos?.peso || 0;
                                  const f = a.resultadosCalculados?.percentualGordura || a.dadosMedidos?.gordura || 0;
                                  const mm = a.resultadosCalculados?.massaMagra || a.dadosMedidos?.massaMagra || 0;
                                  const mg = a.resultadosCalculados?.massaGorda || a.dadosMedidos?.massaGorda || 0;
                                  return (
                                    <tr key={a._id}>
                                      <td><strong>{formatDateBR(a.data)}</strong></td>
                                      <td className="text-right">{w} kg</td>
                                      <td className="text-right">{f}%</td>
                                      <td className="text-right">{mm} kg</td>
                                      <td className="text-right">{mg} kg</td>
                                      <td>{a.avaliadorId?.nome || 'Avaliador Técnico'}</td>
                                    </tr>
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
                        </div>
                        {assessments.length > 0 && (
                          <Pagination
                            currentPage={getPage('assessments')}
                            totalItems={assessments.length}
                            itemsPerPage={getPageSize('assessments')}
                            onPageChange={page => setPage('assessments', page)}
                          />
                        )}
                      </div>
                    </div>
                  );
                }

                // 2. MEDIDAS E PERÍMETROS
                if (evoSubTab === 'perimetros') {
                  const latestCirc = latestAs?.dadosMedidos?.circunferencias || {};
                  const prevCirc = prevAs?.dadosMedidos?.circunferencias || {};

                  const girthKeys = [
                    { key: 'ombros', label: 'Ombros', category: 'muscle' },
                    { key: 'torax', label: 'Tórax', category: 'muscle' },
                    { key: 'cintura', label: 'Cintura (Linha Fina)', category: 'waist' },
                    { key: 'abdomen', label: 'Abdômen', category: 'waist' },
                    { key: 'quadril', label: 'Quadril', category: 'waist' },
                    { key: 'braçoD', label: 'Braço Direito', category: 'muscle' },
                    { key: 'braçoE', label: 'Braço Esquerdo', category: 'muscle' },
                    { key: 'coxaD', label: 'Coxa Direita', category: 'muscle' },
                    { key: 'coxaE', label: 'Coxa Esquerda', category: 'muscle' },
                    { key: 'panturrilhaD', label: 'Panturrilha Direita', category: 'muscle' },
                    { key: 'panturrilhaE', label: 'Panturrilha Esquerda', category: 'muscle' }
                  ];

                  return (
                    <div className="content-panel">
                      <div className="panel-header" style={{ marginBottom: '20px' }}>
                        <h2>Comparativo de Circunferências Corporais</h2>
                        <small style={{ color: 'var(--text-muted)' }}>Comparação entre as duas últimas avaliações ({prevAs?.data ? formatDateBR(prevAs.data) : '-'} vs {formatDateBR(latestAs.data)})</small>
                      </div>

                      <div className="table-responsive">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Região Corporal</th>
                              <th className="text-right">Avaliação Anterior ({prevAs?.data ? formatDateBR(prevAs.data) : '-'})</th>
                              <th className="text-right">Última Avaliação ({formatDateBR(latestAs.data)})</th>
                              <th className="text-center">Variação Absoluta (cm)</th>
                              <th className="text-center">Variação Percentual (%)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {girthKeys.map(item => {
                              const latVal = latestCirc[item.key] || 0;
                              const prVal = prevCirc[item.key] || 0;
                              const diff = latVal - prVal;
                              const pct = prVal > 0 ? (diff / prVal) * 100 : 0;

                              const isWaist = item.category === 'waist';
                              const isGoodChange = 
                                (!isWaist && diff > 0) || // muscle gain is good
                                (isWaist && diff < 0);    // waist reduction is good
                              
                              const valColor = diff === 0 ? 'var(--text-muted)' : isGoodChange ? 'var(--color-success)' : 'var(--color-danger)';
                              const icon = diff > 0 ? 'fa-arrow-trend-up' : diff < 0 ? 'fa-arrow-trend-down' : 'fa-equals';

                              return (
                                <tr key={item.key}>
                                  <td><strong>{item.label}</strong></td>
                                  <td className="text-right" style={{ color: 'var(--text-muted)' }}>{prVal > 0 ? `${prVal} cm` : '-'}</td>
                                  <td className="text-right" style={{ fontWeight: 'bold' }}>{latVal > 0 ? `${latVal} cm` : '-'}</td>
                                  <td className="text-center" style={{ color: valColor, fontWeight: '600' }}>
                                    {prVal > 0 ? (
                                      <span>
                                        <i className={`fa-solid ${icon}`} style={{ marginRight: '6px' }}></i>
                                        {diff > 0 ? '+' : ''}{diff.toFixed(1)} cm
                                      </span>
                                    ) : '-'}
                                  </td>
                                  <td className="text-center">
                                    {prVal > 0 ? (
                                      <span className={`badge ${isGoodChange ? 'badge-success' : diff === 0 ? 'badge-secondary' : 'badge-danger'}`}>
                                        {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
                                      </span>
                                    ) : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }

                // 3. MOBILIDADE E ADM (GONIOMETRIA E ESTRELA MAIGNE)
                if (evoSubTab === 'mobilidade') {
                  const latestGoniometry = latestAs?.dadosMedidos?.goniometria || {};

                  const goniometryPairs = [
                    { label: 'Quadril - Flexão Joelho Fletido', dKey: 'quadrilFlexao1D', eKey: 'quadrilFlexao1E' },
                    { label: 'Quadril - Flexão Joelho Estendido', dKey: 'quadrilFlexao2D', eKey: 'quadrilFlexao2E' },
                    { label: 'Quadril - Rotação Interna', dKey: 'quadrilRotIntD', eKey: 'quadrilRotIntE' },
                    { label: 'Quadril - Rotação Externa', dKey: 'quadrilRotExtD', eKey: 'quadrilRotExtE' },
                    { label: 'Joelho - Flexão', dKey: 'joelhoFlexaoD', eKey: 'joelhoFlexaoE' },
                    { label: 'Joelho - Ângulo Poplíteo', dKey: 'joelhoPopliteoD', eKey: 'joelhoPopliteoE' },
                    { label: 'Tornozelo - Dorsiflexão Joelho Estendido', dKey: 'tornozeloDorsi1D', eKey: 'tornozeloDorsi1E' },
                    { label: 'Tornozelo - Dorsiflexão Joelho Fletido', dKey: 'tornozeloDorsi2D', eKey: 'tornozeloDorsi2E' },
                    { label: 'Tornozelo - Flexão Plantar', dKey: 'tornozeloFlexaoPlantarD', eKey: 'tornozeloFlexaoPlantarE' },
                    { label: 'Ombro - Rotação Interna', dKey: 'ombroRotIntD', eKey: 'ombroRotIntE' },
                    { label: 'Ombro - Rotação Externa', dKey: 'ombroRotExtD', eKey: 'ombroRotExtE' },
                    { label: 'Ombro - Abdução', dKey: 'ombroAbducaoD', eKey: 'ombroAbducaoE' }
                  ];

                  const flaggedAsymmetries = goniometryPairs.map(p => {
                    const dVal = latestGoniometry[p.dKey] || 0;
                    const eVal = latestGoniometry[p.eKey] || 0;
                    const diff = Math.abs(dVal - eVal);
                    return {
                      label: p.label,
                      dVal,
                      eVal,
                      diff,
                      isAsymmetry: diff > 8
                    };
                  }).filter(item => item.isAsymmetry);

                  let maigneData: any = null;
                  if (latestAs?.dadosMedidos?.testesEspeciais?.maigne) {
                    try {
                      maigneData = JSON.parse(latestAs.dadosMedidos.testesEspeciais.maigne);
                    } catch(e) {}
                  }

                  const renderMaigneStarClient = (maigne: any) => {
                    if (!maigne) return null;
                    const cx = 190, cy = 150, scale = 2.0;
                    const angles = [-Math.PI / 2, -Math.PI / 6, Math.PI / 6, Math.PI / 2, 5 * Math.PI / 6, 7 * Math.PI / 6];
                    const refVals = [40, 40, 30, 30, 30, 40];
                    const clientVals = [
                      maigne.flexao || 25,
                      maigne.rotacaoD || 25,
                      maigne.inclinacaoD || 25,
                      maigne.extensao || 25,
                      maigne.inclinacaoE || 25,
                      maigne.rotacaoE || 25
                    ];
                    
                    const refPoints = angles.map((ang, idx) => `${cx + refVals[idx] * scale * Math.cos(ang)},${cy + refVals[idx] * scale * Math.sin(ang)}`).join(' ');
                    const valPoints = angles.map((ang, idx) => `${cx + clientVals[idx] * scale * Math.cos(ang)},${cy + clientVals[idx] * scale * Math.sin(ang)}`).join(' ');
                    
                    const labels = [
                      { text: `Flexão (EVA: ${maigne.flexaoEVA || 0})`, x: cx, y: cy - 100 - 10, anchor: 'middle' as const },
                      { text: `Rot D (EVA: ${maigne.rotacaoDEVA || 0})`, x: cx + 100 * Math.cos(angles[1]) + 15, y: cy + 100 * Math.sin(angles[1]) - 5, anchor: 'start' as const },
                      { text: `Inc D (EVA: ${maigne.inclinacaoDEVA || 0})`, x: cx + 100 * Math.cos(angles[2]) + 15, y: cy + 100 * Math.sin(angles[2]) + 10, anchor: 'start' as const },
                      { text: `Extensão (EVA: ${maigne.extensaoEVA || 0})`, x: cx, y: cy + 100 + 18, anchor: 'middle' as const },
                      { text: `Inc E (EVA: ${maigne.inclinacaoEEVA || 0})`, x: cx + 100 * Math.cos(angles[4]) - 15, y: cy + 100 * Math.sin(angles[4]) + 10, anchor: 'end' as const },
                      { text: `Rot E (EVA: ${maigne.rotacaoEEVA || 0})`, x: cx + 100 * Math.cos(angles[5]) - 15, y: cy + 100 * Math.sin(angles[5]) - 5, anchor: 'end' as const }
                    ];

                    return (
                      <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', maxWidth: '340px', margin: '0 auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        <span style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 'bold', marginBottom: '8px', fontFamily: 'var(--font-title)' }}>Estrela de Maigne (Rosa dos Ventos Clínica)</span>
                        <svg width="250" height="250" viewBox="0 0 380 300" style={{ display: 'block', background: '#ffffff' }}>
                          {[10, 20, 30, 40, 50].map(val => (
                            <g key={val}>
                              <circle cx={cx} cy={cy} r={val * scale} fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                              <text x={cx} y={cy - (val * scale) + 3} style={{ fontSize: '7px', fill: '#94a3b8', textAnchor: 'middle', fontWeight: 'bold' }}>{val}</text>
                            </g>
                          ))}
                          {angles.map((ang, aIdx) => (
                            <line key={aIdx} x1={cx} y1={cy} x2={cx + 100 * Math.cos(ang)} y2={cy + 100 * Math.sin(ang)} stroke="#94a3b8" strokeWidth="0.75" />
                          ))}
                          {labels.map((lbl, lIdx) => (
                            <text key={lIdx} x={lbl.x} y={lbl.y} textAnchor={lbl.anchor} style={{ fontSize: '9px', fill: '#0f172a', fontWeight: 'bold' }}>{lbl.text}</text>
                          ))}
                          <polygon points={refPoints} fill="none" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="3,3" />
                          <polygon points={valPoints} fill="rgba(13, 148, 136, 0.15)" stroke="#0d9488" strokeWidth="1.8" />
                          {angles.map((ang, idx) => (
                            <circle key={idx} cx={cx + clientVals[idx] * scale * Math.cos(ang)} cy={cy + clientVals[idx] * scale * Math.sin(ang)} r="4.5" fill="#0d9488" stroke="#ffffff" strokeWidth="1.2" />
                          ))}
                        </svg>
                        <div style={{ display: 'flex', gap: '15px', fontSize: '0.7rem', color: '#64748b', marginTop: '6px' }}>
                          <span><span style={{ color: '#f59e0b', fontWeight: 'bold' }}>---</span> Referência Saudável</span>
                          <span><span style={{ color: '#0d9488', fontWeight: 'bold' }}>—</span> Suas amplitudes</span>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                      
                      {/* Flagged mobility asymmetries */}
                      {flaggedAsymmetries.length > 0 && (
                        <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', padding: '16px', borderRadius: '12px' }}>
                          <h5 style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px 0', fontSize: '0.9rem', fontFamily: 'var(--font-title)' }}>
                            <i className="fa-solid fa-triangle-exclamation"></i> Assimetrias de Mobilidade Detectadas (&gt;8°)
                          </h5>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 10px 0' }}>Identificamos variações na amplitude articular entre os membros esquerdo e direito. Esse desequilíbrio pode ser trabalhado com exercícios de mobilidade:</p>
                          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {flaggedAsymmetries.map((asym, asymIdx) => (
                              <li key={asymIdx}>
                                <strong>{asym.label}</strong>: Diferença de {asym.diff.toFixed(0)}° (Dir: {asym.dVal}° vs Esq: {asym.eVal}°)
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                        
                        {/* Goniometry Table */}
                        <div className="content-panel" style={{ flex: 2, minWidth: '300px', margin: 0 }}>
                          <div className="panel-header" style={{ marginBottom: '16px' }}>
                            <h2>Métricas de Mobilidade (Goniometria)</h2>
                          </div>
                          <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Articulação</th>
                                  <th className="text-center">Lado Direito</th>
                                  <th className="text-center">Lado Esquerdo</th>
                                  <th className="text-center">Diferença</th>
                                </tr>
                              </thead>
                              <tbody>
                                {goniometryPairs.map(p => {
                                  const dVal = latestGoniometry[p.dKey] || 0;
                                  const eVal = latestGoniometry[p.eKey] || 0;
                                  const diff = Math.abs(dVal - eVal);
                                  return (
                                    <tr key={p.dKey}>
                                      <td><strong>{p.label}</strong></td>
                                      <td className="text-center" style={{ fontWeight: 'bold' }}>{dVal}°</td>
                                      <td className="text-center" style={{ fontWeight: 'bold' }}>{eVal}°</td>
                                      <td className="text-center">
                                        <span className={`badge ${diff > 8 ? 'badge-danger' : 'badge-success'}`}>
                                          {diff.toFixed(0)}°
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Maigne Star Visualizer */}
                        {maigneData && (
                          <div style={{ flex: 1, minWidth: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {renderMaigneStarClient(maigneData)}
                          </div>
                        )}

                      </div>

                    </div>
                  );
                }

                // 4. FORÇA E CARGAS
                if (evoSubTab === 'forca') {
                  const sortedSt = [...strengthTests].sort((a, b) => a.data.localeCompare(b.data));
                  const latestSt = sortedSt[sortedSt.length - 1];
                  const isNew = latestSt?.testesRealizados && latestSt.testesRealizados.length > 0;

                  const renderStrengthChart = () => {
                    if (sortedSt.length === 0) {
                      return (
                        <div className="empty-state-card" style={{ padding: '30px' }}>
                          <i className="fa-solid fa-dumbbell empty-state-icon" style={{ fontSize: '2rem' }}></i>
                          <div className="empty-state-title" style={{ fontSize: '0.9rem' }}>Nenhum teste de força</div>
                          <div className="empty-state-desc" style={{ fontSize: '0.75rem' }}>Os testes de força máxima de 1RM são cadastrados no painel do profissional.</div>
                        </div>
                      );
                    }
                    
                    const exerciseNames = ['Supino Reto', 'Remada Curvada / Máquina', 'Puxada Alta / Lat Pulldown', 'Desenvolvimento de Ombros', 'Abdução de Ombro', 'Rotação Externa de Ombro', 'Rotação Interna de Ombro'];

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {exerciseNames.map(exName => {
                          const progression = sortedSt.map(t => {
                            const match = t.exercicios?.find((e: any) => e.nome.toLowerCase() === exName.toLowerCase() || e.nome.toLowerCase().includes(exName.toLowerCase().split(' ')[0]));
                            return {
                              data: t.data,
                              carga: match?.carga || t.cargaMax || 0
                            };
                          });

                          const maxCarga = Math.max(...progression.map(p => p.carga), 10);

                          return (
                            <div key={exName} style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{exName}</strong>
                                {progression.length > 1 && (
                                  (() => {
                                    const diff = progression[progression.length - 1].carga - progression[0].carga;
                                    const percent = progression[0].carga > 0 ? (diff / progression[0].carga) * 100 : 0;
                                    return (
                                      <span style={{ fontSize: '0.75rem', color: diff >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 'bold' }}>
                                        {diff >= 0 ? '+' : ''}{diff} kg ({percent >= 0 ? '+' : ''}{percent.toFixed(0)}%)
                                      </span>
                                    );
                                  })()
                                )}
                              </div>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {progression.map((p, idx) => {
                                  const pctWidth = maxCarga > 0 ? (p.carga / maxCarga) * 100 : 0;
                                  const barColor = idx === progression.length - 1 ? 'var(--color-primary)' : 'var(--text-dim)';
                                  return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', width: '80px', flexShrink: 0 }}>{formatDateBR(p.data)}</span>
                                      <div style={{ flexGrow: 1, background: 'rgba(255,255,255,0.03)', height: '14px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                        <div style={{ width: `${pctWidth}%`, height: '100%', background: barColor, borderRadius: '6px', transition: 'width 0.6s ease' }}></div>
                                      </div>
                                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', width: '45px', textAlign: 'right', color: idx === progression.length - 1 ? 'var(--color-primary)' : 'var(--text-main)' }}>{p.carga} kg</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  };

                  if (isNew) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Banner de informações da avaliação */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Data da última avaliação:</span>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{formatDateBR(latestSt.data)}</div>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Peso Corporal registrado:</span>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{latestSt.pesoCliente} kg</div>
                          </div>
                        </div>

                        {/* Testes de Força Individual */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                          <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', color: 'var(--text-main)', marginBottom: '16px' }}>
                            <i className="fa-solid fa-gauge-simple-high" style={{ color: 'var(--color-accent)', marginRight: '6px' }}></i> Força Muscular Individual por Movimento
                          </h4>
                          <div className="table-responsive">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Articulação</th>
                                  <th>Movimento</th>
                                  <th style={{ textAlign: 'center' }}>Lado</th>
                                  <th style={{ textAlign: 'right' }}>Valor Obtido</th>
                                  <th style={{ textAlign: 'right' }}>Força (N)</th>
                                  <th style={{ textAlign: 'right' }}>Normalização (%PC)</th>
                                  <th style={{ textAlign: 'center' }}>Classificação</th>
                                </tr>
                              </thead>
                              <tbody>
                                {latestSt.testesRealizados.map((t: any, idx: number) => {
                                  let badgeClass = 'badge-success';
                                  if (t.classificacao === 'DÉFICIT LEVE') badgeClass = 'badge-info';
                                  else if (t.classificacao === 'DÉFICIT MODERADO') badgeClass = 'badge-warning';
                                  else if (t.classificacao === 'DÉFICIT GRAVE') badgeClass = 'badge-danger';
                                  return (
                                    <tr key={idx}>
                                      <td><strong>{t.articulacao}</strong></td>
                                      <td>{t.movimento}</td>
                                      <td style={{ textAlign: 'center' }}>{t.lado}</td>
                                      <td style={{ textAlign: 'right' }}>{t.valorObtido} {t.unidade}</td>
                                      <td style={{ textAlign: 'right' }}>{t.forcaN?.toFixed(1)} N</td>
                                      <td style={{ textAlign: 'right' }}>{t.pcPercent?.toFixed(1)}%</td>
                                      <td style={{ textAlign: 'center' }}>
                                        <span className={`badge ${badgeClass}`}>{t.classificacao || 'FORÇA NORMAL'}</span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Análise de Simetria e Déficits */}
                        {latestSt.comparativos && latestSt.comparativos.length > 0 && (
                          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                            <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', color: 'var(--text-main)', marginBottom: '16px' }}>
                              <i className="fa-solid fa-arrows-left-right" style={{ color: 'var(--color-primary)', marginRight: '6px' }}></i> Índice de Simetria e Déficits Bilaterais
                            </h4>
                            <div className="table-responsive">
                              <table className="data-table">
                                <thead>
                                  <tr>
                                    <th>Articulação</th>
                                    <th>Movimento</th>
                                    <th style={{ textAlign: 'right' }}>Lado Direito (N)</th>
                                    <th style={{ textAlign: 'right' }}>Lado Esquerdo (N)</th>
                                    <th style={{ textAlign: 'right' }}>Déficit Lateral (%)</th>
                                    <th style={{ textAlign: 'right' }}>Simetria (%)</th>
                                    <th style={{ textAlign: 'center' }}>Classificação</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {latestSt.comparativos.map((c: any, idx: number) => {
                                    let badgeClass = 'badge-success';
                                    if (c.classificacaoSimetria === 'Aceitável') badgeClass = 'badge-info';
                                    else if (c.classificacaoSimetria === 'Atenção') badgeClass = 'badge-warning';
                                    else if (c.classificacaoSimetria === 'Assimetria Relevante') badgeClass = 'badge-danger';
                                    return (
                                      <tr key={idx}>
                                        <td><strong>{c.articulacao}</strong></td>
                                        <td>{c.movimento}</td>
                                        <td style={{ textAlign: 'right' }}>{c.valorD?.toFixed(1)} N</td>
                                        <td style={{ textAlign: 'right' }}>{c.valorE?.toFixed(1)} N</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: c.deficit > 15 ? 'var(--color-danger)' : 'inherit' }}>{c.deficit?.toFixed(1)}%</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: c.simetria < 85 ? 'var(--color-danger)' : 'var(--color-success)' }}>{c.simetria?.toFixed(1)}%</td>
                                        <td style={{ textAlign: 'center' }}>
                                          <span className={`badge ${badgeClass}`}>{c.classificacaoSimetria || 'Excelente'}</span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Observações do Fisioterapeuta */}
                        {latestSt.observacoes && (
                          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                            <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', color: 'var(--text-main)', marginBottom: '8px' }}>
                              <i className="fa-solid fa-comment-medical" style={{ color: 'var(--color-success)', marginRight: '6px' }}></i> Observações do Fisioterapeuta
                            </h4>
                            <p style={{ fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--text-dim)', whiteSpace: 'pre-wrap', margin: 0 }}>
                              {latestSt.observacoes}
                            </p>
                          </div>
                        )}

                        {/* Interpretação Clínica dos Resultados */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', marginTop: '16px' }}>
                          <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', color: 'var(--text-main)', marginBottom: '16px' }}>
                            <i className="fa-solid fa-square-poll-vertical" style={{ color: 'var(--color-primary)', marginRight: '6px' }}></i> Interpretação Clínica dos Resultados
                          </h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', borderLeft: '4px solid #10b981', background: 'rgba(16, 185, 129, 0.04)' }}>
                              <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '4px' }}>&ge; 90% do Valor de Referência</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.4', display: 'block' }}>
                                <strong>Força normal:</strong> o paciente apresenta força muscular dentro dos parâmetros normativos para sua faixa demográfica. Liberação para progressão de carga ou retorno ao esporte/atividades.
                              </span>
                            </div>
                            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', borderLeft: '4px solid #3b82f6', background: 'rgba(59, 130, 246, 0.04)' }}>
                              <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '4px' }}>75-89% do Valor de Referência</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.4', display: 'block' }}>
                                <strong>Déficit leve:</strong> força levemente reduzida. Indica necessidade de fortalecimento direcionado, porém funcionalidade preservada para a maioria das atividades de vida diária.
                              </span>
                            </div>
                            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', borderLeft: '4px solid #f97316', background: 'rgba(249, 115, 22, 0.04)' }}>
                              <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '4px' }}>50-74% do Valor de Referência</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.4', display: 'block' }}>
                                <strong>Déficit moderado:</strong> comprometimento funcional relevante. Requer programa de reabilitação estruturado com reavaliação periódica. Restrição de atividades de maior demanda.
                              </span>
                            </div>
                            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', borderLeft: '4px solid #ef4444', background: 'rgba(239, 68, 68, 0.04)' }}>
                              <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '4px' }}>&lt; 50% do Valor de Referência</strong>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.4', display: 'block' }}>
                                <strong>Déficit grave:</strong> fraqueza muscular importante com alto impacto funcional. Investigação de causas subjacentes, possível encaminhamento médico e reabilitação intensiva são indicados.
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const extOmbro = latestSt?.exercicios?.find((e: any) => e.nome.includes('Rotação Externa'))?.carga || 0;
                  const intOmbro = latestSt?.exercicios?.find((e: any) => e.nome.includes('Rotação Interna'))?.carga || 0;
                  const computedRatio = intOmbro > 0 ? extOmbro / intOmbro : 0;

                  const getRatioStatus = (ratio: number) => {
                    if (ratio === 0) return { label: 'Sem dados', color: 'var(--text-muted)', class: 'badge-secondary' };
                    if (ratio < 0.66) return { label: 'Risco de Lesão (Desbalanceado)', color: 'var(--color-danger)', class: 'badge-danger' };
                    if (ratio > 0.75) return { label: 'Dominância Extensores', color: 'var(--color-warning)', class: 'badge-warning' };
                    return { label: 'Ótimo / Equilibrado (Safe Zone)', color: 'var(--color-success)', class: 'badge-success' };
                  };
                  const ratioStatus = getRatioStatus(computedRatio);

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                      {latestSt && computedRatio > 0 && (
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                          <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', color: 'var(--text-main)', marginBottom: '12px' }}>
                            <i className="fa-solid fa-shield-halved" style={{ color: 'var(--color-accent)', marginRight: '6px' }}></i> Balanço de Rotadores do Ombro (Estabilidade Articular)
                          </h4>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                            <div>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Proporção Rotadores (Externa / Interna):</span>
                              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: ratioStatus.color }}>
                                {computedRatio.toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <span className={`badge ${ratioStatus.class}`} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                                {ratioStatus.label}
                              </span>
                            </div>
                          </div>
                          <div style={{ marginTop: '16px', background: 'var(--bg-darker)', borderRadius: '8px', padding: '12px', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                              <span>Desequilíbrio (Risco) &lt; 0.66</span>
                              <span>Safe Zone (0.66 - 0.75)</span>
                              <span>Dominância &gt; 0.75</span>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                              <div style={{ position: 'absolute', left: '0%', width: '66%', height: '100%', background: 'var(--color-danger)' }}></div>
                              <div style={{ position: 'absolute', left: '66%', width: '9%', height: '100%', background: 'var(--color-success)' }}></div>
                              <div style={{ position: 'absolute', left: '75%', width: '25%', height: '100%', background: 'var(--color-warning)' }}></div>
                              {/* Indicator dot */}
                              <div style={{
                                position: 'absolute',
                                left: `${Math.min(100, (computedRatio / 1.0) * 100)}%`,
                                top: '-2px',
                                width: '12px',
                                height: '12px',
                                background: '#ffffff',
                                border: '2px solid #000',
                                borderRadius: '50%',
                                transform: 'translateX(-6px)'
                              }}></div>
                            </div>
                          </div>
                          <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '10px', fontSize: '0.75rem', fontStyle: 'italic' }}>
                            * A relação de força ideal entre os rotadores externos e internos de ombro protege contra lesões do manguito rotador e melhora a postura em exercícios como supino e desenvolvimento.
                          </small>
                        </div>
                      )}

                      <div className="content-panel" style={{ margin: 0 }}>
                        <div className="panel-header" style={{ marginBottom: '16px' }}>
                          <h2>Evolução de Carga Máxima (1RM Estimado)</h2>
                          <small style={{ color: 'var(--text-muted)' }}>Histórico de progressão de carga de exercícios multiarticulares</small>
                        </div>
                        {renderStrengthChart()}
                      </div>
                    </div>
                  );
                }

                return null;
              })()}
            </div>
          ) : (
            <div className="empty-state-card" style={{ marginTop: '24px' }}>
              <i className="fa-solid fa-chart-line empty-state-icon"></i>
              <div className="empty-state-title">Nenhuma avaliação física</div>
              <div className="empty-state-desc">Você ainda não possui avaliações físicas registradas. Fale com seu fisioterapeuta ou instrutor para agendar uma avaliação.</div>
            </div>
          )}
        </>
      )}

      {/* View: Meus Documentos */}
      {activeTab === 'documentos' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Meus Documentos Clínicos</h1>
              <p>Acesse e baixe seus laudos de fisioterapia e relatórios de avaliações físicas.</p>
            </div>
            {(assessments.length > 0 || reports.length > 0) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="page-size-selector">
                  <span>Exibir:</span>
                  <select value={getPageSize('documents')} onChange={e => setPageSizeForKey('documents', Number(e.target.value))}>
                    <option value={5}>5</option>
                    <option value={8}>8</option>
                    <option value={15}>15</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="content-panel">
            <div className="panel-header">
              <h2>Arquivos Disponíveis para Download</h2>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th className="text-center">Tipo de Documento</th>
                    <th>Descrição</th>
                    <th>Arquivo</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'documents';
                    const size = getPageSize(listKey);
                    const docs = [
                      ...assessments.map(a => ({
                        id: a._id,
                        data: a.data,
                        tipo: 'Avaliação Física',
                        badgeClass: 'badge-success',
                        desc: 'Métricas corporais e goniometria completa',
                        rawDoc: a
                      })),
                      ...reports.map(r => ({
                        id: r._id,
                        data: r.data,
                        tipo: 'Relatório Fisioterápico',
                        badgeClass: 'badge-info',
                        desc: 'Evolução do tratamento de reabilitação e condutas',
                        rawDoc: r
                      }))
                    ].sort((a, b) => b.data.localeCompare(a.data));

                    const totalItems = docs.length;
                    const totalPages = Math.ceil(totalItems / size);
                    const activeP = getPage(listKey);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = docs.slice((curP - 1) * size, curP * size);

                    if (totalItems === 0) {
                      return (
                        <tr>
                          <td colSpan={4}>
                            <div className="empty-state-card">
                              <i className="fa-solid fa-folder-open empty-state-icon"></i>
                              <div className="empty-state-title">Nenhum documento disponível</div>
                              <div className="empty-state-desc">Não há laudos de fisioterapia ou relatórios de avaliação física disponíveis para download no momento.</div>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return paginated.map(doc => (
                      <tr key={doc.id}>
                        <td data-label="Data">{formatDateBR(doc.data)}</td>
                        <td data-label="Tipo de Documento" className="text-center">
                          <span className={`badge ${doc.badgeClass}`}>{doc.tipo}</span>
                        </td>
                        <td data-label="Descrição">{doc.desc}</td>
                        <td data-label="Arquivo">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              if (doc.tipo === 'Avaliação Física') {
                                downloadAssessmentPDF(doc.rawDoc, assessments);
                              } else {
                                downloadReportPDF(doc.rawDoc);
                              }
                            }}
                            style={{ width: '100%' }}
                          >
                            <i className="fa-solid fa-file-pdf"></i> Baixar PDF
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {assessments.length + reports.length > 0 && (
              <Pagination
                currentPage={getPage('documents')}
                totalItems={assessments.length + reports.length}
                itemsPerPage={getPageSize('documents')}
                onPageChange={page => setPage('documents', page)}
              />
            )}
          </div>
        </>
      )}

      {activeTab === 'trancamento' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Trancamento de Plano</h1>
              <p>Tranque semanas do seu plano e redistribua os créditos para os meses restantes.</p>
            </div>
          </div>

          {!activeContract ? (
            <div className="content-panel" style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '24px', color: 'var(--color-danger)' }}></i>
              </div>
              <h3>Nenhum Contrato Ativo</h3>
              <p style={{ color: 'var(--text-muted)' }}>Você não possui nenhum contrato assinado ou ativo no momento para realizar trancamentos.</p>
            </div>
          ) : (
            (() => {
              const totalSemanasTrancadas = trancamentosList.reduce((sum, t) => sum + t.semanas, 0);
              const semanasDisponiveis = Math.max(0, 4 - totalSemanasTrancadas);
              const frequencia = activeContract.frequencia || 3;
              const creditosCongelados = trancamentoSemanas * frequencia;

              const remainingMonths = getRemainingMonthsList();
              const sumRedist = remainingMonths.reduce((sum, m) => sum + (trancamentoRedistribuicao[m.value] || 0), 0);
              const isDistributionPerfect = sumRedist === creditosCongelados;

              return (
                <div className="trancamento-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
                  {/* Form de Trancamento */}
                  <div className="content-panel">
                    <div className="panel-header">
                      <h2>Solicitar Trancamento</h2>
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

                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>Plano: <strong>{activeContract.planoNome}</strong></p>
                      <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>Vigência: de <strong>{formatDateBR(activeContract.dataInicio)}</strong> até <strong>{formatDateBR(activeContract.dataFim)}</strong></p>
                      <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>Frequência contratada: <strong>{frequencia}x por semana</strong></p>
                      <p style={{ margin: '0', fontSize: '0.9rem', color: semanasDisponiveis > 0 ? 'var(--color-primary)' : 'var(--color-danger)' }}>
                        Semanas já trancadas: <strong>{totalSemanasTrancadas} de 4</strong> (Restam <strong>{semanasDisponiveis}</strong> semanas disponíveis)
                      </p>
                    </div>

                    {semanasDisponiveis <= 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                        Você já atingiu o limite máximo de 4 semanas trancadas para este contrato.
                      </div>
                    ) : (
                      <form onSubmit={handleRequestTrancamento}>
                        <div className="form-group">
                          <label>Data de Início do Trancamento (Selecione no calendário)</label>
                          <input
                            type="date"
                            className="form-control"
                            value={trancamentoDataInicio}
                            onChange={e => setTrancamentoDataInicio(e.target.value)}
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label>Quantidade de Semanas a Trancar</label>
                          <select
                            className="select-custom"
                            value={trancamentoSemanas}
                            onChange={e => {
                              setTrancamentoSemanas(Number(e.target.value));
                              setTrancamentoRedistribuicao({});
                            }}
                          >
                            {Array.from({ length: semanasDisponiveis }, (_, i) => i + 1).map(n => (
                              <option key={n} value={n}>{n} {n === 1 ? 'semana' : 'semanas'}</option>
                            ))}
                          </select>
                        </div>

                        <div style={{ fontSize: '1rem', fontWeight: 'bold', margin: '15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <i className="fa-solid fa-coins" style={{ color: 'var(--color-primary)' }}></i>
                          Créditos a Redistribuir: {creditosCongelados} créditos
                        </div>

                        {trancamentoDataInicio && (
                          <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>Redistribuição de Créditos</h3>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                              Escolha como distribuir os {creditosCongelados} créditos entre os meses restantes de vigência do seu contrato:
                            </p>

                            {remainingMonths.map(m => (
                              <div key={m.value} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>{m.label}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '2px 8px', minWidth: '28px' }}
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
                                  <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 'bold' }}>
                                    {trancamentoRedistribuicao[m.value] || 0}
                                  </span>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '2px 8px', minWidth: '28px' }}
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

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Total Distribuído:</span>
                              <span style={{ 
                                fontSize: '0.9rem', 
                                fontWeight: 700, 
                                color: isDistributionPerfect ? 'var(--color-success)' : 'var(--color-danger)'
                              }}>
                                {sumRedist} de {creditosCongelados}
                              </span>
                            </div>
                            {isDistributionPerfect ? (
                              <small style={{ color: 'var(--color-success)', display: 'block', marginTop: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                                <i className="fa-solid fa-circle-check"></i> Distribuição perfeita dos créditos!
                              </small>
                            ) : (
                              <small style={{ color: 'var(--color-warning)', display: 'block', marginTop: '4px', fontSize: '0.75rem' }}>
                                Distribua exatamente os {creditosCongelados} créditos para habilitar o envio.
                              </small>
                            )}
                          </div>
                        )}

                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={!isDistributionPerfect || !trancamentoDataInicio}
                          style={{ width: '100%', marginTop: '20px' }}
                        >
                          Confirmar Trancamento e Redistribuir
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Histórico de Trancamentos */}
                  <div className="content-panel">
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
          <div className="view-header">
            <div className="view-title-group">
              <h1>Meus Créditos</h1>
              <p>Acompanhe o saldo de cada tipo de crédito do seu plano.</p>
            </div>
          </div>

          {/* 3 Cards de Crédito */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '8px' }}>

            {/* Academia */}
            {(() => {
              const pct = credTotal > 0 ? Math.round(((credUsados + credReservados) / credTotal) * 100) : 0;
              const esgotado = credDisp <= 0 && credTotal > 0;
              return (
                <div className="content-panel" style={{ borderLeft: `4px solid ${esgotado ? 'var(--color-danger)' : 'var(--color-primary)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: esgotado ? 'rgba(239,68,68,0.12)' : 'var(--color-primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fa-solid fa-dumbbell" style={{ fontSize: '18px', color: esgotado ? 'var(--color-danger)' : 'var(--color-primary)' }}></i>
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Créditos de Academia</h3>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Treino Monitorado, Avaliações e Emergências</p>
                    </div>
                    {esgotado && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--color-danger)', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: '8px', fontWeight: 700 }}>ESGOTADO</span>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '14px', textAlign: 'center' }}>
                    <div><div style={{ fontSize: '1.6rem', fontWeight: 800, color: credDisp > 0 ? 'var(--color-primary)' : 'var(--color-danger)' }}>{credDisp}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Disponíveis</div></div>
                    <div><div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{credUsados}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Usados</div></div>
                    <div><div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-warning)' }}>{credReservados}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Reservados</div></div>
                  </div>
                  <div style={{ height: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: esgotado ? 'var(--color-danger)' : 'var(--color-primary)', borderRadius: '6px', transition: 'width 0.4s' }}></div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'right' }}>{pct}% utilizado de {credTotal} créditos/mês</div>
                </div>
              );
            })()}

            {/* Emergência */}
            {(() => {
              const pct = emergTotal > 0 ? Math.round(((emergUsados + emergReservados) / emergTotal) * 100) : 0;
              const esgotado = emergDisp <= 0 && emergTotal > 0;
              const semPlano = emergTotal === 0;
              return (
                <div className="content-panel" style={{ borderLeft: `4px solid ${esgotado ? 'var(--color-danger)' : semPlano ? 'var(--border-color)' : '#f59e0b'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: esgotado ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '18px', color: esgotado ? 'var(--color-danger)' : '#f59e0b' }}></i>
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Créditos de Emergência</h3>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Agendamentos de Emergência (Seg–Sex)</p>
                    </div>
                    {esgotado && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--color-danger)', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: '8px', fontWeight: 700 }}>ESGOTADO</span>}
                  </div>
                  {semPlano ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '12px 0' }}>Seu plano não inclui créditos de emergência.</p>
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '14px', textAlign: 'center' }}>
                        <div><div style={{ fontSize: '1.6rem', fontWeight: 800, color: emergDisp > 0 ? '#f59e0b' : 'var(--color-danger)' }}>{emergDisp}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Disponíveis</div></div>
                        <div><div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{emergUsados}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Usados</div></div>
                        <div><div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-warning)' }}>{emergReservados}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Reservados</div></div>
                      </div>
                      <div style={{ height: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: esgotado ? 'var(--color-danger)' : '#f59e0b', borderRadius: '6px', transition: 'width 0.4s' }}></div>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'right' }}>{pct}% utilizado de {emergTotal} crédito(s)/mês</div>
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
                <div className="content-panel" style={{ borderLeft: `4px solid ${esgotado ? 'var(--color-danger)' : semPlano ? 'var(--border-color)' : '#a855f7'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: esgotado ? 'rgba(239,68,68,0.12)' : 'rgba(168,85,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fa-solid fa-spa" style={{ fontSize: '18px', color: esgotado ? 'var(--color-danger)' : '#a855f7' }}></i>
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Créditos de Massagem</h3>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Massagem Terapêutica (exclusivo Sábados)</p>
                    </div>
                    {esgotado && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--color-danger)', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: '8px', fontWeight: 700 }}>ESGOTADO</span>}
                  </div>
                  {semPlano ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '12px 0' }}>Seu plano não inclui créditos de massagem.</p>
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '14px', textAlign: 'center' }}>
                        <div><div style={{ fontSize: '1.6rem', fontWeight: 800, color: massDisp > 0 ? '#a855f7' : 'var(--color-danger)' }}>{massDisp}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Disponíveis</div></div>
                        <div><div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{massUsados}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Usados</div></div>
                        <div><div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-warning)' }}>{massReservados}</div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Reservados</div></div>
                      </div>
                      <div style={{ height: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: esgotado ? 'var(--color-danger)' : '#a855f7', borderRadius: '6px', transition: 'width 0.4s' }}></div>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'right' }}>{pct}% utilizado de {massTotal} crédito(s)/mês</div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Histórico por tipo */}
          <div className="content-panel" style={{ marginTop: '24px' }}>
            <div className="panel-header"><h2>Histórico de Uso</h2></div>
            {appointments.filter((a: any) => a.tipoCredito && a.tipoCredito !== 'nenhum').length === 0 ? (
              <p style={{ color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center' }}>Nenhum agendamento com crédito encontrado.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Data</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Serviço</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tipo de Crédito</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments
                    .filter((a: any) => a.tipoCredito && a.tipoCredito !== 'nenhum')
                    .sort((a: any, b: any) => b.data.localeCompare(a.data))
                    .map((a: any) => {
                      const tipoCor: Record<string, string> = { academia: 'var(--color-primary)', emergencia: '#f59e0b', massagem: '#a855f7' };
                      const tipoLabel: Record<string, string> = { academia: 'Academia', emergencia: 'Emergência', massagem: 'Massagem' };
                      const statusCor: Record<string, string> = { agendado: 'var(--color-warning)', presenca: 'var(--color-success)', cancelado: 'var(--color-danger)', falta: 'var(--color-danger)' };
                      return (
                        <tr key={a._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '10px', fontSize: '0.82rem' }}>{formatDateBR(a.data)} {a.horario}</td>
                          <td style={{ padding: '10px', fontSize: '0.82rem' }}>{a.servico}</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: tipoCor[a.tipoCredito] || 'var(--text-muted)', background: `${tipoCor[a.tipoCredito] || 'var(--text-muted)'}22`, padding: '2px 8px', borderRadius: '8px' }}>
                              {tipoLabel[a.tipoCredito] || a.tipoCredito}
                            </span>
                          </td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: statusCor[a.status] || 'var(--text-muted)', background: `${statusCor[a.status] || 'var(--text-muted)'}22`, padding: '2px 8px', borderRadius: '8px' }}>
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
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
