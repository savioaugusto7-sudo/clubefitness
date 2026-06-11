'use client';

import { useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';

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

  const user = session?.user as any;
  const profileId = user?.profileId;

  const fetchData = async () => {
    if (!profileId) return;
    try {
      setLoading(true);
      const [resClient, resApts] = await Promise.all([
        fetch(`/api/clients?userId=${user.id}`),
        fetch(`/api/appointments?clientId=${profileId}`)
      ]);
      const jsonClient = await resClient.json();
      const jsonApts = await resApts.json();

      if (jsonClient.success && jsonClient.data.length > 0) {
        setClient(jsonClient.data[0]);
      }
      if (jsonApts.success) {
        setAppointments(jsonApts.data);
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
          </div>

          <div className="content-panel">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data / Hora</th>
                    <th>Modalidade</th>
                    <th>Serviço</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map(a => (
                    <tr key={a._id}>
                      <td><strong>{a.data}</strong> às {a.horario}</td>
                      <td>
                        <span className={`badge ${a.tipo === 'academia' ? 'badge-success' : 'badge-info'}`}>
                          {a.tipo === 'academia' ? 'Academia' : 'Fisioterapia'}
                        </span>
                      </td>
                      <td>{a.servico}</td>
                      <td>
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
                  ))}
                  {appointments.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                        Nenhum agendamento futuro encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Default Fallback for other tabs */}
      {!['dashboard', 'agendar', 'agendamentos'].includes(activeTab) && (
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
