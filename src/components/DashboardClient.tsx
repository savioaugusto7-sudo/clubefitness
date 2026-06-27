'use client';

import { useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import Pagination from './Pagination';
import { downloadReportPDF, downloadAssessmentPDF } from '@/utils/pdfGenerator';

interface DashboardClientProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function DashboardClient({ activeTab, setActiveTab }: DashboardClientProps) {
  const { data: session } = useSession();
  const [client, setClient] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking states
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('08:00');
  const [bookService, setBookService] = useState('Treino Monitorado');
  const [bookType, setBookType] = useState<'academia' | 'consultorio'>('academia');
  const [bookingStatusMsg, setBookingStatusMsg] = useState('');

  // Workout, Assessments, and Reports states for new views
  const [workout, setWorkout] = useState<any>(null);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [strengthTests, setStrengthTests] = useState<any[]>([]);
  const [selectedExerciseForInstruction, setSelectedExerciseForInstruction] = useState<any>(null);

  // Sub-tabs for evolution
  const [evoSubTab, setEvoSubTab] = useState<'composicao' | 'perimetros' | 'mobilidade' | 'forca'>('composicao');

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

              <button className="btn btn-primary" onClick={() => setSelectedExerciseForInstruction(details)} style={{ width: '100%', fontSize: '0.78rem', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
                <i className="fa-solid fa-circle-info"></i> Instruções
              </button>
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
      const [resClient, resApts, resWorkout, resAs, resRep, resExercises, resSt] = await Promise.all([
        fetch(`/api/clients?userId=${user.id}`),
        fetch(`/api/appointments?clientId=${profileId}`),
        fetch(`/api/workouts?clientId=${profileId}`),
        fetch('/api/assessments'),
        fetch('/api/reports'),
        fetch('/api/exercises'),
        fetch('/api/strength-tests')
      ]);
      const jsonClient = await resClient.json();
      const jsonApts = await resApts.json();
      const jsonWorkout = await resWorkout.json();
      const jsonAs = await resAs.json();
      const jsonRep = await resRep.json();
      const jsonExercises = await resExercises.json();
      const jsonSt = await resSt.json();

      if (jsonClient.success && jsonClient.data.length > 0) {
        setClient(jsonClient.data[0]);
      }
      if (jsonApts.success) {
        setAppointments(jsonApts.data);
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

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingStatusMsg('Processando...');
    try {
      const payload = {
        data: bookDate,
        horario: bookTime,
        tipo: bookType,
        servico: bookService,
        consumeCredito: bookService === 'Treino Monitorado',
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
    if (confirm('Deseja realmente cancelar este agendamento?')) {
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

  // Calculate credits
  const credTotal = client.dadosComerciais?.creditosTotal || 0;
  const credUsados = client.dadosComerciais?.creditosUsados || 0;
  const credReservados = client.dadosComerciais?.creditosReservados || 0;
  const credDisp = Math.max(0, credTotal - credUsados - credReservados);

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

          {/* Painel pendente: sem plano ativo */}
          {client.dadosComerciais?.status === 'pendente' ? (
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
              <p>Vencimento do Plano: <strong>{client.dadosComerciais?.vencimento}</strong></p>
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
                <label>Modalidade</label>
                <select className="select-custom" value={bookType} onChange={e => setBookType(e.target.value as any)}>
                  <option value="academia">Treino na Academia</option>
                  <option value="consultorio">Atendimento Fisioterápico</option>
                </select>
              </div>

              <div className="form-group">
                <label>Serviço</label>
                <select className="select-custom" value={bookService} onChange={e => setBookService(e.target.value)}>
                  {bookType === 'academia' ? (
                    <>
                      <option value="Treino Monitorado">Treino Monitorado (Consome Crédito)</option>
                      <option value="Treino Livre">Treino Livre (Sem Custo)</option>
                      <option value="Recovery">Recovery (Sem Custo)</option>
                      <option value="Avaliação Física">Avaliação Física (Sem Custo)</option>
                      <option value="Teste de Força">Teste de Força (Sem Custo)</option>
                      <option value="Emergência">Atendimento de Emergência (Sem Custo)</option>
                      <option value="Massagem">Massagem (Consome Crédito Massagem - Sábados)</option>
                    </>
                  ) : (
                    <>
                      <option value="Avaliação Fisioterápica">Avaliação Fisioterápica</option>
                    </>
                  )}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Data</label>
                  <input type="date" className="form-control" value={bookDate} onChange={e => setBookDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Horário</label>
                  <input type="time" className="form-control" value={bookTime} onChange={e => setBookTime(e.target.value)} required />
                </div>
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
                        <td><strong>{a.data}</strong> às {a.horario}</td>
                        <td>
                          <span className={`badge ${a.tipo === 'academia' ? 'badge-success' : 'badge-info'}`}>
                            {a.tipo === 'academia' ? 'Academia' : 'Fisioterapia'}
                          </span>
                        </td>
                        <td>{a.servico}</td>
                        <td className="text-center">
                          <span className={`badge ${a.status === 'presenca' ? 'badge-success' : a.status === 'cancelado' ? 'badge-danger' : 'badge-warning'}`}>
                            {a.status === 'presenca' ? 'Presença Confirmada' : a.status === 'cancelado' ? 'Cancelado' : 'Agendado'}
                          </span>
                        </td>
                        <td>
                          {a.status === 'agendado' && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleCancelAppointment(a._id)}>
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
                                {a.data}
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
                                      <td><strong>{a.data}</strong></td>
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
                        <small style={{ color: 'var(--text-muted)' }}>Comparação entre as duas últimas avaliações ({prevAs?.data || '-'} vs {latestAs.data})</small>
                      </div>

                      <div className="table-responsive">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Região Corporal</th>
                              <th className="text-right">Avaliação Anterior ({prevAs?.data || '-'})</th>
                              <th className="text-right">Última Avaliação ({latestAs.data})</th>
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
                                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', width: '80px', flexShrink: 0 }}>{p.data}</span>
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
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{latestSt.data}</div>
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
                        <td>{doc.data}</td>
                        <td className="text-center">
                          <span className={`badge ${doc.badgeClass}`}>{doc.tipo}</span>
                        </td>
                        <td>{doc.desc}</td>
                        <td>
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

      {/* Default Fallback for other tabs */}
      {!['dashboard', 'agendar', 'agendamentos', 'treino', 'evolucao', 'documentos'].includes(activeTab) && (
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
