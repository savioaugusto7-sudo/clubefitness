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

  const user = session?.user as any;
  const profileId = user?.profileId;

  const fetchData = async () => {
    if (!profileId) return;
    try {
      setLoading(true);
      const [resClient, resApts, resWorkout, resAs, resRep] = await Promise.all([
        fetch(`/api/clients?userId=${user.id}`),
        fetch(`/api/appointments?clientId=${profileId}`),
        fetch(`/api/workouts?clientId=${profileId}`),
        fetch('/api/assessments'),
        fetch('/api/reports')
      ]);
      const jsonClient = await resClient.json();
      const jsonApts = await resApts.json();
      const jsonWorkout = await resWorkout.json();
      const jsonAs = await resAs.json();
      const jsonRep = await resRep.json();

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
    } catch (e) {
      console.error('Error fetching client dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profileId, activeTab]);

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
        const res = await fetch(`/api/appointments?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          fetchData();
        }
      } catch (e) {
        console.error(e);
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
              <p>Confira seu plano, créditos e próximos treinos.</p>
            </div>
          </div>

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
                  {client.dadosComerciais?.status === 'ativo' ? 'Ativo' : 'Vencido'}
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
                      <option value="Treino Monitorado">Treino Monitorado (Consome 1 Crédito)</option>
                      <option value="Treino Livre">Treino Livre (Sem Custo)</option>
                      <option value="Recovery">Recovery</option>
                    </>
                  ) : (
                    <>
                      <option value="Avaliação Fisioterápica">Avaliação Fisioterápica</option>
                      <option value="Emergência">Emergência</option>
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
                  <div key={f.id} style={{ marginBottom: '24px', background: 'rgba(255, 255, 255, 0.02)', padding: '20px', borderRadius: '12px' }}>
                    <h3 style={{ color: 'var(--color-primary)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      {f.nome} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Atualizado em: {f.ultimaAtualizacao || '-'}</span>
                    </h3>
                    {f.observacoesGerais && (
                      <p style={{ margin: '8px 0', fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                        Obs: {f.observacoesGerais}
                      </p>
                    )}
                    <div className="table-responsive" style={{ marginTop: '12px' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Exercício</th>
                            <th>Séries</th>
                            <th>Repetições</th>
                            <th>Carga</th>
                            <th>Descanso</th>
                            <th>Instruções</th>
                          </tr>
                        </thead>
                        <tbody>
                          {f.exercicios.map((ex: any, idx: number) => (
                            <tr key={idx}>
                              <td><strong>{ex.exercicioId}</strong></td>
                              <td>{ex.series}</td>
                              <td>{ex.repeticoes}</td>
                              <td>{ex.carga}</td>
                              <td>{ex.descanso}</td>
                              <td><small style={{ color: 'var(--text-muted)' }}>{ex.observacao || '-'}</small></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
                  <div key={f.id} style={{ marginBottom: '24px', background: 'rgba(255, 255, 255, 0.02)', padding: '20px', borderRadius: '12px' }}>
                    <h3 style={{ color: 'var(--color-secondary)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      {f.nome} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Atualizado em: {f.ultimaAtualizacao || '-'}</span>
                    </h3>
                    {f.observacoesGerais && (
                      <p style={{ margin: '8px 0', fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                        Obs: {f.observacoesGerais}
                      </p>
                    )}
                    <div className="table-responsive" style={{ marginTop: '12px' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Exercício</th>
                            <th>Séries</th>
                            <th>Repetições</th>
                            <th>Carga</th>
                            <th>Descanso</th>
                            <th>Instruções</th>
                          </tr>
                        </thead>
                        <tbody>
                          {f.exercicios.map((ex: any, idx: number) => (
                            <tr key={idx}>
                              <td><strong>{ex.exercicioId}</strong></td>
                              <td>{ex.series}</td>
                              <td>{ex.repeticoes}</td>
                              <td>{ex.carga}</td>
                              <td>{ex.descanso}</td>
                              <td><small style={{ color: 'var(--text-muted)' }}>{ex.observacao || '-'}</small></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
              <p>Acompanhe seu progresso de peso, percentual de gordura e medidas corporais.</p>
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
              {/* Latest Assessment Stats */}
              {(() => {
                const sorted = [...assessments].sort((a, b) => b.data.localeCompare(a.data));
                const latest = sorted[0];
                const fat = latest.resultadosCalculados?.percentualGordura || latest.dadosMedidos?.gordura || 0;
                const magra = latest.resultadosCalculados?.massaMagra || latest.dadosMedidos?.massaMagra || 0;
                const weight = latest.dadosMedidos?.peso || 0;
                return (
                  <div className="metrics-grid" style={{ marginBottom: '0px' }}>
                    <div className="metric-card">
                      <div className="metric-info">
                        <h3>Peso Atual</h3>
                        <div className="value">{weight} kg</div>
                        <small style={{ color: 'var(--text-dim)' }}>Última medida: {latest.data}</small>
                      </div>
                      <div className="metric-icon"><i className="fa-solid fa-weight-scale"></i></div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-info">
                        <h3>Gordura Corporal</h3>
                        <div className="value">{fat}%</div>
                        <small style={{ color: 'var(--text-dim)' }}>Gordura total: {latest.resultadosCalculados?.massaGorda || 0} kg</small>
                      </div>
                      <div className="metric-icon danger"><i className="fa-solid fa-percent"></i></div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-info">
                        <h3>Massa Magra</h3>
                        <div className="value">{magra} kg</div>
                        <small style={{ color: 'var(--text-dim)' }}>Músculo e tecidos</small>
                      </div>
                      <div className="metric-icon"><i className="fa-solid fa-child-strength"></i></div>
                    </div>
                  </div>
                );
              })()}

              {/* Assessment History Table */}
              <div className="content-panel">
                <div className="panel-header">
                  <h2>Histórico de Avaliações</h2>
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
                        <th>Observações</th>
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
                              <td><small style={{ color: 'var(--text-muted)' }}>{a.observacoes || '-'}</small></td>
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
    </div>
  );
}
