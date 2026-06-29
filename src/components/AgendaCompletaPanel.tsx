'use client';

import React, { useState, useEffect } from 'react';

interface ClientInfo {
  _id: string;
  dadosPessoais: {
    nome: string;
    email: string;
    cpf: string;
    telefone?: string;
  };
}

interface ProfessionalInfo {
  _id: string;
  dadosPessoais: {
    nome: string;
  };
}

interface AgendaConfigRule {
  _id: string;
  tipo: 'academia' | 'consultorio';
  horario: string;
  acao: 'bloquear' | 'adicionar' | 'alterar_capacidade';
  diaSemana: number | null;
  dataEspecifica: string | null;
  capacidadePersonalizada: number | null;
}

interface SlotDetails {
  horario: string;
  capacidade: number;
  tipo: 'academia' | 'consultorio';
  vagasOcupadas: number;
  appointments: any[];
}

interface AgendaCompletaPanelProps {
  clients: ClientInfo[];
  professionals: ProfessionalInfo[];
}

export default function AgendaCompletaPanel({ clients, professionals }: AgendaCompletaPanelProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [slots, setSlots] = useState<SlotDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [configs, setConfigs] = useState<AgendaConfigRule[]>([]);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);

  // States para Ajuste de Vagas
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustTargetTime, setAdjustTargetTime] = useState('');
  const [adjustTargetType, setAdjustTargetType] = useState<'academia' | 'consultorio'>('academia');
  const [adjustCapacityVal, setAdjustCapacityVal] = useState<number>(6);

  // States para Adicionar Horário Extra
  const [showAddHourModal, setShowAddHourModal] = useState(false);
  const [addTimeInput, setAddTimeInput] = useState('08:00');
  const [addTimeType, setAddTimeType] = useState<'academia' | 'consultorio'>('academia');
  const [addCapacityInput, setAddCapacityInput] = useState<number>(6);

  // States para Visualização e Agendamento Manual
  const [selectedSlot, setSelectedSlot] = useState<SlotDetails | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [manualClientId, setManualClientId] = useState('');
  const [manualService, setManualService] = useState('Treino Monitorado');
  const [manualProfId, setManualProfId] = useState('');
  const [clientSearchText, setClientSearchText] = useState('');

  // Notificação temporária
  const showFeedback = (text: string, type: 'success' | 'danger') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  useEffect(() => {
    // Definir data padrão como hoje (formato local YYYY-MM-DD)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchSlotsAndConfigs();
    }
  }, [selectedDate]);

  const fetchSlotsAndConfigs = async () => {
    setLoading(true);
    try {
      const resSlots = await fetch(`/api/appointments/slots?date=${selectedDate}`);
      const dataSlots = await resSlots.json();
      if (dataSlots.success) {
        setSlots(dataSlots.data || []);
      }

      const resConfigs = await fetch(`/api/admin/agenda-config`);
      const dataConfigs = await resConfigs.json();
      if (dataConfigs.success) {
        setConfigs(dataConfigs.data || []);
      }
    } catch (err) {
      showFeedback('Erro ao conectar-se ao servidor.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Alterar mês no calendário
  const handlePrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
  };

  // Renderizar dias do calendário
  const renderCalendarDays = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const dayCells = [];

    // Células vazias para os dias que antecedem o início do mês
    for (let i = 0; i < firstDayIndex; i++) {
      dayCells.push(<div key={`empty-${i}`} className="calendar-day-empty"></div>);
    }

    // Dias do mês
    for (let day = 1; day <= totalDays; day++) {
      const formattedDay = String(day).padStart(2, '0');
      const formattedMonth = String(month + 1).padStart(2, '0');
      const cellDate = `${year}-${formattedMonth}-${formattedDay}`;
      const isSelected = cellDate === selectedDate;

      const today = new Date();
      const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

      dayCells.push(
        <div
          key={day}
          className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
          onClick={() => setSelectedDate(cellDate)}
        >
          <span className="day-number">{day}</span>
        </div>
      );
    }

    return dayCells;
  };

  // --- Handlers de Ações sobre a Configuração da Agenda ---

  // 1. Excluir / Bloquear Horário
  const handleBlockSlot = async (horario: string, tipo: 'academia' | 'consultorio', aplicarRecorrente: boolean) => {
    const parts = selectedDate.split('-');
    const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const dayOfWeek = dateObj.getDay();

    const payload = {
      tipo,
      horario,
      acao: 'bloquear',
      dataEspecifica: aplicarRecorrente ? null : selectedDate,
      diaSemana: aplicarRecorrente ? dayOfWeek : null
    };

    try {
      const res = await fetch('/api/admin/agenda-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showFeedback(aplicarRecorrente ? 'Horário suspenso semanalmente com sucesso!' : 'Horário suspenso para este dia com sucesso!', 'success');
        fetchSlotsAndConfigs();
      } else {
        showFeedback(data.error || 'Erro ao suspender horário', 'danger');
      }
    } catch (err) {
      showFeedback('Erro de conexão ao salvar regra.', 'danger');
    }
  };

  // 2. Ajustar Vagas / Capacidade
  const handleSaveCapacityRule = async (aplicarRecorrente: boolean) => {
    const parts = selectedDate.split('-');
    const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const dayOfWeek = dateObj.getDay();

    const payload = {
      tipo: adjustTargetType,
      horario: adjustTargetTime,
      acao: 'alterar_capacidade',
      capacidadePersonalizada: adjustCapacityVal,
      dataEspecifica: aplicarRecorrente ? null : selectedDate,
      diaSemana: aplicarRecorrente ? dayOfWeek : null
    };

    try {
      const res = await fetch('/api/admin/agenda-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('Vagas ajustadas com sucesso!', 'success');
        setShowAdjustModal(false);
        fetchSlotsAndConfigs();
      } else {
        showFeedback(data.error || 'Erro ao ajustar vagas', 'danger');
      }
    } catch (err) {
      showFeedback('Erro de conexão ao salvar regra.', 'danger');
    }
  };

  // 3. Adicionar Horário Extra
  const handleAddExtraHour = async (aplicarRecorrente: boolean) => {
    const parts = selectedDate.split('-');
    const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const dayOfWeek = dateObj.getDay();

    const payload = {
      tipo: addTimeType,
      horario: addTimeInput,
      acao: 'adicionar',
      dataEspecifica: aplicarRecorrente ? null : selectedDate,
      diaSemana: aplicarRecorrente ? dayOfWeek : null
    };

    try {
      // 1. Criar a regra de adição do slot
      let res = await fetch('/api/admin/agenda-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      let data = await res.json();
      
      if (!data.success) {
        showFeedback(data.error || 'Erro ao adicionar horário extra', 'danger');
        return;
      }

      // 2. Se a capacidade personalizada for diferente do padrão (6 para academia, 1 para consultorio), cria regra de capacidade também
      const defaultCap = addTimeType === 'academia' ? 6 : 1;
      if (addCapacityInput !== defaultCap) {
        const capacityPayload = {
          tipo: addTimeType,
          horario: addTimeInput,
          acao: 'alterar_capacidade',
          capacidadePersonalizada: addCapacityInput,
          dataEspecifica: aplicarRecorrente ? null : selectedDate,
          diaSemana: aplicarRecorrente ? dayOfWeek : null
        };
        await fetch('/api/admin/agenda-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(capacityPayload)
        });
      }

      showFeedback('Horário extra configurado com sucesso!', 'success');
      setShowAddHourModal(false);
      fetchSlotsAndConfigs();
    } catch (err) {
      showFeedback('Erro de conexão ao salvar regra.', 'danger');
    }
  };

  // --- Handlers de Ações sobre os Agendamentos ---

  const handleUpdateAptStatus = async (id: string, newStatus: 'presenca' | 'cancelado' | 'agendado') => {
    try {
      const res = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('Presença/Status atualizado com sucesso!', 'success');
        // Refresh detailed slot details view
        if (selectedSlot) {
          const updatedApts = selectedSlot.appointments.map(a => a._id === id ? { ...a, status: newStatus } : a);
          setSelectedSlot({
            ...selectedSlot,
            appointments: updatedApts,
            vagasOcupadas: newStatus === 'cancelado' ? Math.max(0, selectedSlot.vagasOcupadas - 1) : selectedSlot.vagasOcupadas
          });
        }
        fetchSlotsAndConfigs();
      } else {
        showFeedback(data.error || 'Erro ao atualizar status', 'danger');
      }
    } catch (e) {
      showFeedback('Erro de rede ao atualizar status.', 'danger');
    }
  };

  const handleRemoveAppointment = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir permanentemente este agendamento?')) return;
    try {
      const res = await fetch(`/api/appointments?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('Agendamento excluído com sucesso!', 'success');
        if (selectedSlot) {
          const updatedApts = selectedSlot.appointments.filter(a => a._id !== id);
          setSelectedSlot({
            ...selectedSlot,
            appointments: updatedApts,
            vagasOcupadas: Math.max(0, selectedSlot.vagasOcupadas - 1)
          });
        }
        fetchSlotsAndConfigs();
      } else {
        showFeedback(data.error || 'Erro ao excluir agendamento', 'danger');
      }
    } catch (e) {
      showFeedback('Erro de rede ao excluir.', 'danger');
    }
  };

  const handleManualBook = async () => {
    if (!manualClientId) {
      alert('Selecione o cliente.');
      return;
    }
    if (!manualProfId) {
      alert('Selecione o profissional.');
      return;
    }

    const payload = {
      data: selectedDate,
      horario: selectedSlot?.horario,
      servico: manualService,
      clienteId: manualClientId,
      profissionalId: manualProfId,
      bypassRestrictions: true // Liberação total por ser painel administrador
    };

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('Cliente agendado com sucesso!', 'success');
        setManualClientId('');
        setClientSearchText('');
        
        // Atualizar lista local no modal
        const newApt = data.data;
        const c = clients.find(cl => cl._id === manualClientId);
        const p = professionals.find(pr => pr._id === manualProfId);
        newApt.clienteId = c;
        newApt.profissionalId = p;

        if (selectedSlot) {
          setSelectedSlot({
            ...selectedSlot,
            appointments: [...selectedSlot.appointments, newApt],
            vagasOcupadas: selectedSlot.vagasOcupadas + 1
          });
        }
        fetchSlotsAndConfigs();
      } else {
        showFeedback(data.error || 'Erro ao agendar cliente', 'danger');
      }
    } catch (err) {
      showFeedback('Erro de conexão ao realizar agendamento.', 'danger');
    }
  };

  // Filtro de pesquisa de clientes
  const filteredClients = clients.filter(c => 
    c.dadosPessoais?.nome?.toLowerCase().includes(clientSearchText.toLowerCase())
  ).slice(0, 5);

  const formatMonthName = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
  };

  return (
    <div className="content-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
            <i className="fa-solid fa-calendar-alt" style={{ marginRight: '8px', color: 'var(--color-primary)' }}></i> Agenda Geral & Gestão de Horários
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Visualize as aulas marcadas por horário, suspenda turnos inteiros ou ajuste as vagas em datas e regras semanais.</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => setShowAddHourModal(true)}>
            <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> Horário Extra
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className={`fa-solid ${message.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
          <span>{message.text}</span>
        </div>
      )}

      {/* Grid: Calendário do Mês à Esquerda, Horários do Dia à Direita */}
      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Widget Calendário */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <button className="btn btn-secondary btn-sm" onClick={handlePrevMonth}><i className="fa-solid fa-chevron-left"></i></button>
            <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>{formatMonthName(selectedMonth)}</strong>
            <button className="btn btn-secondary btn-sm" onClick={handleNextMonth}><i className="fa-solid fa-chevron-right"></i></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <span key={d} style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>{d}</span>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {renderCalendarDays()}
          </div>

          <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <small style={{ color: 'var(--text-dim)', display: 'block' }}>Data selecionada:</small>
            <strong style={{ color: 'var(--color-primary)', fontSize: '1rem' }}>
              {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
            </strong>
          </div>
        </div>

        {/* Listagem de Horários do Dia */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', minHeight: '400px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-clock" style={{ color: 'var(--text-dim)' }}></i>
            Grade de Horários para {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Carregando horários da grade...</p>
            </div>
          ) : slots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', border: '1.5px dashed var(--border-color)', borderRadius: '12px' }}>
              <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '2.5rem', color: 'var(--text-dim)', marginBottom: '12px' }}></i>
              <h4 style={{ margin: '0 0 6px' }}>Clube Fechado neste dia</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Não há horários definidos ou disponíveis nesta data.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {slots.map(slot => {
                const occupancyPct = Math.min(100, (slot.vagasOcupadas / slot.capacidade) * 100);
                
                // Cores de Ocupação
                let barColor = 'var(--color-primary)';
                if (occupancyPct >= 100) barColor = 'var(--color-danger)';
                else if (occupancyPct >= 70) barColor = '#f59e0b';
                else barColor = 'var(--color-success)';

                return (
                  <div 
                    key={`${slot.horario}-${slot.tipo}`}
                    style={{
                      background: 'var(--bg-darker)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Barra de ocupação no background inferior */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: `${occupancyPct}%`, background: barColor, transition: 'width 0.4s ease' }}></div>

                    {/* Dados Básicos */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '150px' }}>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>{slot.horario}</strong>
                      <div>
                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', background: slot.tipo === 'academia' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)', color: slot.tipo === 'academia' ? 'var(--color-info)' : 'var(--color-success)', fontWeight: 'bold' }}>
                          {slot.tipo}
                        </span>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {slot.vagasOcupadas} / {slot.capacidade} vagas
                        </div>
                      </div>
                    </div>

                    {/* Alunos Agendados */}
                    <div style={{ flexGrow: 1, display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {slot.appointments.length === 0 ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>Nenhum aluno agendado</span>
                      ) : (
                        slot.appointments.map(apt => (
                          <span 
                            key={apt._id} 
                            style={{ 
                              fontSize: '0.72rem', 
                              background: 'var(--bg-secondary)', 
                              border: '1px solid var(--border-color)', 
                              borderRadius: '4px', 
                              padding: '2px 6px', 
                              color: apt.status === 'presenca' ? 'var(--color-success)' : 'var(--text-main)',
                              fontWeight: apt.status === 'presenca' ? 'bold' : 'normal'
                            }}
                          >
                            {apt.clienteId?.dadosPessoais?.nome?.split(' ')[0]} ({apt.servico?.replace('Treino ', '')})
                          </span>
                        ))
                      )}
                    </div>

                    {/* Ações Rápidas */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        title="Ver e Gerenciar Agendamentos"
                        onClick={() => {
                          setSelectedSlot(slot);
                          setShowDetailsModal(true);
                        }}
                      >
                        <i className="fa-solid fa-user-edit" style={{ color: 'var(--color-primary)' }}></i> Gerenciar
                      </button>

                      <button 
                        className="btn btn-secondary btn-sm" 
                        title="Ajustar Vagas"
                        onClick={() => {
                          setAdjustTargetTime(slot.horario);
                          setAdjustTargetType(slot.tipo);
                          setAdjustCapacityVal(slot.capacidade);
                          setShowAdjustModal(true);
                        }}
                      >
                        <i className="fa-solid fa-sliders"></i> Vagas
                      </button>

                      <button 
                        className="btn btn-secondary btn-sm" 
                        title="Excluir Horário"
                        style={{ color: 'var(--color-danger)' }}
                        onClick={() => {
                          if (confirm(`Suspender o horário das ${slot.horario} (${slot.tipo})?`)) {
                            const recursivo = confirm('Deseja excluir de forma recorrente (todas as semanas neste dia)?');
                            handleBlockSlot(slot.horario, slot.tipo, recursivo);
                          }
                        }}
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Ajustar Capacidade/Vagas */}
      {showAdjustModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowAdjustModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%' }}>
            <div className="modal-header">
              <h3>Ajustar Vagas - {adjustTargetTime} ({adjustTargetType})</h3>
              <button className="modal-close" onClick={() => setShowAdjustModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div className="form-group">
                <label>Número de Vagas Disponíveis</label>
                <input 
                  type="number" 
                  className="form-control" 
                  min={1} 
                  max={20} 
                  value={adjustCapacityVal}
                  onChange={e => setAdjustCapacityVal(Number(e.target.value))} 
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAdjustModal(false)}>Voltar</button>
              <button className="btn btn-secondary" style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }} onClick={() => handleSaveCapacityRule(false)}>Apenas esta Data</button>
              <button className="btn btn-primary" onClick={() => handleSaveCapacityRule(true)}>Salvar Semanal</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Adicionar Horário Extra */}
      {showAddHourModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowAddHourModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%' }}>
            <div className="modal-header">
              <h3>Adicionar Horário Extra</h3>
              <button className="modal-close" onClick={() => setShowAddHourModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label>Horário (HH:MM)</label>
                <input 
                  type="time" 
                  className="form-control" 
                  value={addTimeInput}
                  onChange={e => setAddTimeInput(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label>Tipo de Grade</label>
                <select className="select-custom" value={addTimeType} onChange={e => setAddTimeType(e.target.value as any)}>
                  <option value="academia">Academia (Treinos)</option>
                  <option value="consultorio">Consultório (Fisioterapia)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Vagas Iniciais</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={addCapacityInput}
                  onChange={e => setAddCapacityInput(Number(e.target.value))} 
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddHourModal(false)}>Voltar</button>
              <button className="btn btn-secondary" style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }} onClick={() => handleAddExtraHour(false)}>Apenas esta Data</button>
              <button className="btn btn-primary" onClick={() => handleAddExtraHour(true)}>Adicionar Semanal</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Visualização Detalhada & Agendamento Manual */}
      {showDetailsModal && selectedSlot && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', width: '95%' }}>
            <div className="modal-header">
              <h3>Alunos Agendados - {selectedSlot.horario} ({selectedSlot.tipo})</h3>
              <button className="modal-close" onClick={() => setShowDetailsModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Lista de Alunos Marcados */}
              <div>
                <h4 style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '10px' }}>Alunos com Horário Reservado</h4>
                {selectedSlot.appointments.length === 0 ? (
                  <div style={{ padding: '16px', background: 'var(--bg-darker)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                    Não há alunos marcados neste horário.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedSlot.appointments.map(apt => (
                      <div 
                        key={apt._id}
                        style={{
                          background: 'var(--bg-darker)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{apt.clienteId?.dadosPessoais?.nome}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            CPF: {apt.clienteId?.dadosPessoais?.cpf} · Tel: {apt.clienteId?.dadosPessoais?.telefone || '—'}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                            Profissional: <strong style={{ color: 'var(--color-primary)' }}>{apt.profissionalId?.dadosPessoais?.nome}</strong> · Serviço: <strong>{apt.servico}</strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          {apt.status === 'agendado' ? (
                            <>
                              <button className="btn btn-secondary btn-sm" style={{ color: 'var(--color-success)', borderColor: 'rgba(16,185,129,0.2)' }} onClick={() => handleUpdateAptStatus(apt._id, 'presenca')}>
                                <i className="fa-solid fa-check"></i> Presença
                              </button>
                              <button className="btn btn-secondary btn-sm" style={{ color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.2)' }} onClick={() => handleUpdateAptStatus(apt._id, 'cancelado')}>
                                <i className="fa-solid fa-ban"></i> Faltou
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: apt.status === 'presenca' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: apt.status === 'presenca' ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                              {apt.status}
                            </span>
                          )}
                          <button className="btn btn-secondary btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleRemoveAppointment(apt._id)}>
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Formulário de Agendamento Manual */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '10px' }}>Agendar Novo Aluno Manualmente</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Busca e Autocomplete de Alunos */}
                  <div style={{ position: 'relative' }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Buscar Aluno</label>
                    <input 
                      type="text"
                      className="form-control"
                      placeholder="Pesquisar por nome de aluno..."
                      value={clientSearchText}
                      onChange={e => {
                        setClientSearchText(e.target.value);
                        setManualClientId('');
                      }}
                    />
                    {clientSearchText && !manualClientId && (
                      <div style={{ position: 'absolute', width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', zIndex: 10, marginTop: '2px' }}>
                        {filteredClients.map(c => (
                          <div 
                            key={c._id}
                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.8rem', borderBottom: '1px solid var(--border-color)' }}
                            onClick={() => {
                              setManualClientId(c._id);
                              setClientSearchText(c.dadosPessoais.nome);
                            }}
                            className="autocomplete-item"
                          >
                            <strong>{c.dadosPessoais.nome}</strong> (CPF: {c.dadosPessoais.cpf})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Serviço</label>
                      <select className="select-custom" value={manualService} onChange={e => setManualService(e.target.value)}>
                        {selectedSlot.tipo === 'academia' ? (
                          <>
                            <option value="Treino Monitorado">Treino Monitorado</option>
                            <option value="Treino Livre">Treino Livre</option>
                            <option value="Recovery">Recovery</option>
                            <option value="Avaliação Física">Avaliação Física</option>
                            <option value="Teste de Força">Teste de Força</option>
                            <option value="Emergência">Emergência</option>
                          </>
                        ) : (
                          <>
                            <option value="Avaliação Fisioterápica">Avaliação Fisioterápica</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Profissional</label>
                      <select className="select-custom" value={manualProfId} onChange={e => setManualProfId(e.target.value)}>
                        <option value="">Selecione o profissional...</option>
                        {professionals.map(p => (
                          <option key={p._id} value={p._id}>{p.dadosPessoais.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button className="btn btn-primary" onClick={handleManualBook} style={{ alignSelf: 'flex-end', marginTop: '6px' }}>
                    Confirmar Agendamento
                  </button>
                </div>
              </div>

            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailsModal(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
