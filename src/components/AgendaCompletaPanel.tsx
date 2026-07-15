'use client';

import React, { useState, useEffect } from 'react';

const normalizeText = (str: string) => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const getServiceColor = (service: string) => {
  const name = (service || '').toLowerCase();
  if (name.includes('monitorado')) {
    return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' }; // Green
  }
  if (name.includes('livre')) {
    return { bg: 'rgba(99, 102, 241, 0.15)', text: '#6366f1' }; // Indigo
  }
  if (name.includes('avaliacao') || name.includes('avaliação')) {
    return { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7' }; // Purple
  }
  if (name.includes('liberacao') || name.includes('liberação') || name.includes('miofascial')) {
    return { bg: 'rgba(6, 182, 212, 0.15)', text: '#06b6d4' }; // Cyan
  }
  if (name.includes('quiro') || name.includes('quiropraxia')) {
    return { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' }; // Orange
  }
  if (name.includes('recovery') || name.includes('recuperacao') || name.includes('recuperação')) {
    return { bg: 'rgba(244, 63, 94, 0.15)', text: '#f43f5e' }; // Rose
  }
  return { bg: 'rgba(236, 72, 153, 0.15)', text: '#ec4899' }; // Pink (Default)
};


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
  nome: string;
  especialidade: string;
  registro: string;
  googleTokens?: {
    accessToken?: string;
    refreshToken?: string;
    tokenExpiry?: string;
    calendarId?: string;
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

interface GoogleEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  description: string;
}

interface AgendaCompletaPanelProps {
  clients: ClientInfo[];
  professionals: ProfessionalInfo[];
}

export default function AgendaCompletaPanel({ clients, professionals }: AgendaCompletaPanelProps) {
  // Aba selecionada: 'academia' | 'consultorio' | 'professionalId'
  const [activeTab, setActiveTab] = useState<string>('academia');

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [slots, setSlots] = useState<SlotDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [configs, setConfigs] = useState<AgendaConfigRule[]>([]);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);

  // States do Google Calendar
  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([]);
  const [googleNotConnected, setGoogleNotConnected] = useState<boolean>(false);
  const [googleConnecting, setGoogleConnecting] = useState<boolean>(false);
  const [showAddGoogleEventModal, setShowAddGoogleEventModal] = useState<boolean>(false);
  const [googleEventTitle, setGoogleEventTitle] = useState<string>('');
  const [googleEventStart, setGoogleEventStart] = useState<string>('09:00');
  const [googleEventEnd, setGoogleEventEnd] = useState<string>('10:00');
  const [googleEventDesc, setGoogleEventDesc] = useState<string>('');

  // States para Ajuste de Vagas (Local)
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustTargetTime, setAdjustTargetTime] = useState('');
  const [adjustTargetType, setAdjustTargetType] = useState<'academia' | 'consultorio'>('academia');
  const [adjustCapacityVal, setAdjustCapacityVal] = useState<number>(6);

  // States para Adicionar Horário Extra (Local)
  const [showAddHourModal, setShowAddHourModal] = useState(false);
  const [addTimeInput, setAddTimeInput] = useState('08:00');
  const [addTimeType, setAddTimeType] = useState<'academia' | 'consultorio'>('academia');
  const [addCapacityInput, setAddCapacityInput] = useState<number>(6);

  // States para Visualização e Agendamento Manual (Local)
  const [selectedSlot, setSelectedSlot] = useState<SlotDetails | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [manualClientId, setManualClientId] = useState('');
  const [manualService, setManualService] = useState('Treino Monitorado');
  const [manualProfId, setManualProfId] = useState('');
  const [clientSearchText, setClientSearchText] = useState('');

  // States para Modal Customizado de Confirmação de Deleção
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteTargetTime, setDeleteTargetTime] = useState('');
  const [deleteTargetType, setDeleteTargetType] = useState<'academia' | 'consultorio'>('academia');

  // Função utilitária de formatação de data com dia da semana
  const formatSelectedDateWithDayOfWeek = (dateStr: string) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('pt-BR');
    const dayOfWeek = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
    const capitalizedDay = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
    return `${formattedDate} (${capitalizedDay})`;
  };

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
      if (activeTab === 'academia' || activeTab === 'consultorio') {
        fetchSlotsAndConfigs();
      } else {
        fetchGoogleEvents();
      }
    }
  }, [selectedDate, activeTab]);

  const fetchSlotsAndConfigs = async () => {
    setLoading(true);
    try {
      const resSlots = await fetch(`/api/appointments/slots?date=${selectedDate}&tipo=${activeTab}`);
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

  const fetchGoogleEvents = async () => {
    setLoading(true);
    setGoogleNotConnected(false);
    try {
      const res = await fetch(`/api/admin/google-calendar?professionalId=${activeTab}&date=${selectedDate}`);
      const data = await res.json();
      if (data.success) {
        if (data.notConnected) {
          setGoogleNotConnected(true);
          setGoogleEvents([]);
        } else {
          setGoogleEvents(data.data || []);
        }
      } else {
        showFeedback(data.error || 'Erro ao obter compromissos do Google', 'danger');
      }
    } catch (err) {
      showFeedback('Erro de conexão com o Google Agenda.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Redireciona o usuário para o OAuth2 do Google
  const handleConnectGoogle = async () => {
    setGoogleConnecting(true);
    try {
      const res = await fetch(`/api/auth/google?professionalId=${activeTab}`);
      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        showFeedback(data.error || 'Erro ao gerar link de conexão do Google.', 'danger');
        setGoogleConnecting(false);
      }
    } catch (err) {
      showFeedback('Erro de conexão ao iniciar autenticação Google.', 'danger');
      setGoogleConnecting(false);
    }
  };

  // Criar compromisso na Google Agenda
  const handleAddGoogleEvent = async () => {
    if (!googleEventTitle) {
      alert('Digite o título do compromisso.');
      return;
    }

    const payload = {
      professionalId: activeTab,
      summary: googleEventTitle,
      start: `${selectedDate}T${googleEventStart}:00`,
      end: `${selectedDate}T${googleEventEnd}:00`,
      description: googleEventDesc
    };

    try {
      const res = await fetch('/api/admin/google-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('Compromisso adicionado na Google Agenda com sucesso!', 'success');
        setShowAddGoogleEventModal(false);
        setGoogleEventTitle('');
        setGoogleEventDesc('');
        fetchGoogleEvents();
      } else {
        showFeedback(data.error || 'Erro ao criar compromisso no Google.', 'danger');
      }
    } catch (err) {
      showFeedback('Erro de conexão ao criar compromisso.', 'danger');
    }
  };

  // Remover compromisso da Google Agenda
  const handleDeleteGoogleEvent = async (eventId: string) => {
    if (!confirm('Deseja realmente remover este compromisso do Google Agenda?')) return;

    try {
      const res = await fetch(`/api/admin/google-calendar?professionalId=${activeTab}&eventId=${eventId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('Compromisso excluído da Google Agenda com sucesso!', 'success');
        fetchGoogleEvents();
      } else {
        showFeedback(data.error || 'Erro ao deletar compromisso do Google.', 'danger');
      }
    } catch (err) {
      showFeedback('Erro de conexão ao remover compromisso.', 'danger');
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

    for (let i = 0; i < firstDayIndex; i++) {
      dayCells.push(<div key={`empty-${i}`} className="calendar-day-empty"></div>);
    }

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

  // --- Handlers de Ações locais de Exceções da Grade ---

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

  // --- Handlers de Ações locais de Reservas ---

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

    const defaultProfId = professionals[0]?._id || '6668ab030303030303030302';

    const payload = {
      data: selectedDate,
      horario: selectedSlot?.horario,
      servico: manualService,
      clienteId: manualClientId,
      profissionalId: defaultProfId,
      bypassRestrictions: true
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
        
        const newApt = data.data;
        const c = clients.find(cl => cl._id === manualClientId);
        const p = professionals.find(pr => pr._id === defaultProfId);
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

  // Cálculo das posições dos eventos da Google Agenda
  const getGoogleEventStyle = (startStr: string, endStr: string) => {
    try {
      const sDate = new Date(startStr);
      const eDate = new Date(endStr);

      const startMin = sDate.getHours() * 60 + sDate.getMinutes();
      const endMin = eDate.getHours() * 60 + eDate.getMinutes();

      const timelineStartMin = 6 * 60; // Inicia às 06:00
      
      const top = Math.max(0, startMin - timelineStartMin);
      const height = Math.max(35, endMin - startMin); // Altura mínima de 35px

      return {
        top: `${top}px`,
        height: `${height}px`
      };
    } catch (e) {
      return { top: '0px', height: '50px' };
    }
  };

  const filteredClients = clients.filter(c => 
    normalizeText(c.dadosPessoais?.nome).includes(normalizeText(clientSearchText))
  ).slice(0, 5);

  const formatMonthName = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
  };

  // Nome do profissional selecionado atualmente
  const currentProfessional = professionals.find(p => p._id === activeTab);

  return (
    <div className="content-panel" style={{ padding: '24px' }}>
      
      {/* Abas Superiores de Filtro */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button 
          className={`btn ${activeTab === 'academia' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('academia')}
          style={{ fontSize: '0.85rem' }}
        >
          <i className="fa-solid fa-dumbbell" style={{ marginRight: '6px' }}></i> Academia
        </button>


        {/* Divisor */}
        <div style={{ width: '1px', background: 'var(--border-color)', margin: '0 8px' }}></div>

        {/* Abas dos Profissionais */}
        {professionals.map(p => (
          <button
            key={p._id}
            className={`btn ${activeTab === p._id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(p._id)}
            style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="fa-brands fa-google" style={{ color: p.googleTokens?.refreshToken ? '#10b981' : '#ef4444', fontSize: '0.75rem' }}></i>
            <span>{p.nome}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
            <i className="fa-solid fa-calendar-alt" style={{ marginRight: '8px', color: 'var(--color-primary)' }}></i> 
            {activeTab === 'academia' ? 'Agenda Academia' : activeTab === 'consultorio' ? 'Agenda Consultório' : `Google Agenda - ${currentProfessional?.nome}`}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {activeTab === 'academia' || activeTab === 'consultorio' 
              ? 'Visualize as aulas marcadas por horário, suspenda turnos inteiros ou ajuste as vagas em datas e regras semanais.'
              : `Visualize e gerencie os compromissos diretamente no Google Calendar de ${currentProfessional?.nome}.`}
          </p>
        </div>
        <div>
          {activeTab === 'academia' || activeTab === 'consultorio' ? (
            <button className="btn btn-primary" onClick={() => setShowAddHourModal(true)}>
              <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> Horário Extra
            </button>
          ) : (
            !googleNotConnected && (
              <button className="btn btn-primary" onClick={() => setShowAddGoogleEventModal(true)}>
                <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> Compromisso Google
              </button>
            )
          )}
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className={`fa-solid ${message.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
          <span>{message.text}</span>
        </div>
      )}

      {/* Grid: Calendário do Mês à Esquerda, Horários do Dia à Direita */}
      <div className="agenda-grid-container" style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px', alignItems: 'start' }}>
        
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
              {selectedDate ? formatSelectedDateWithDayOfWeek(selectedDate) : '—'}
            </strong>
          </div>
        </div>

        {/* Listagem Dinâmica à Direita */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', minHeight: '400px' }}>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Carregando dados da agenda...</p>
            </div>
          ) : activeTab === 'academia' || activeTab === 'consultorio' ? (
            // ================= VISUALIZAÇÃO LOCAL (ACADEMIA / CONSULTÓRIO) =================
            <>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-clock" style={{ color: 'var(--text-dim)' }}></i>
                Grade de Horários para {selectedDate ? formatSelectedDateWithDayOfWeek(selectedDate) : ''}
              </h3>

              {slots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', border: '1.5px dashed var(--border-color)', borderRadius: '12px' }}>
                  <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '2.5rem', color: 'var(--text-dim)', marginBottom: '12px' }}></i>
                  <h4 style={{ margin: '0 0 6px' }}>Clube Fechado neste dia</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Não há horários definidos ou disponíveis nesta data.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {slots.map(slot => {
                    const occupancyPct = Math.min(100, (slot.vagasOcupadas / slot.capacidade) * 100);
                    let barColor = 'var(--color-primary)';
                    if (occupancyPct >= 100) barColor = 'var(--color-danger)';
                    else if (occupancyPct >= 70) barColor = '#f59e0b';
                    else barColor = 'var(--color-success)';

                    return (
                      <div 
                        key={`${slot.horario}-${slot.tipo}`}
                        className="agenda-slot-row"
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
                        <div style={{ position: 'absolute', bottom: 0, left: 0, height: '3px', width: `${occupancyPct}%`, background: barColor, transition: 'width 0.4s ease' }}></div>

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

                        <div style={{ flexGrow: 1, display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {slot.appointments.length === 0 ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>Nenhum aluno agendado</span>
                          ) : (
                             slot.appointments.map(apt => {
                               const sColors = getServiceColor(apt.servico || slot.tipo);
                               const shortName = apt.clienteId?.dadosPessoais?.nome 
                                 ? apt.clienteId.dadosPessoais.nome.split(' ').slice(0, 2).join(' ') 
                                 : 'Aluno';
                               return (
                                 <div 
                                   key={apt._id} 
                                   style={{ 
                                     display: 'inline-flex', 
                                     alignItems: 'center', 
                                     background: 'var(--bg-secondary)', 
                                     border: `1.5px solid ${sColors.text}`, 
                                     borderRadius: '16px', 
                                     padding: '2px 8px 2px 10px', 
                                     gap: '6px',
                                     boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                   }}
                                 >
                                   <span style={{ fontSize: '0.74rem', fontWeight: 700, color: apt.status === 'presenca' ? 'var(--color-success)' : 'var(--text-main)' }}>
                                     {shortName}
                                   </span>
                                   <span 
                                     style={{ 
                                       fontSize: '0.64rem', 
                                       fontWeight: 800, 
                                       textTransform: 'uppercase', 
                                       padding: '1px 6px', 
                                       borderRadius: '10px', 
                                       background: sColors.bg,
                                       color: sColors.text,
                                       letterSpacing: '0.3px'
                                     }}
                                   >
                                     {(apt.servico || slot.tipo || '')?.replace('Treino ', '')}
                                   </span>
                                 </div>
                               );
                             })
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            title="Ver e Gerenciar Agendamentos"
                            onClick={() => {
                              setSelectedSlot(slot);
                              const isSat = selectedDate ? new Date(selectedDate + 'T12:00:00').getDay() === 6 : false;
                              setManualService(isSat ? 'Massagem' : 'Treino Monitorado');
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
                            style={{ color: 'var(--color-danger)' }}
                            onClick={() => {
                              setDeleteTargetTime(slot.horario);
                              setDeleteTargetType(slot.tipo);
                              setShowDeleteConfirmModal(true);
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
            </>
          ) : googleNotConnected ? (
            // ================= VISUALIZAÇÃO GOOGLE - NÃO CONECTADO =================
            <div style={{ textAlign: 'center', padding: '80px 20px', border: '1.5px dashed var(--border-color)', borderRadius: '12px' }}>
              <i className="fa-brands fa-google" style={{ fontSize: '3rem', color: 'var(--text-dim)', marginBottom: '16px', display: 'block' }}></i>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: 'var(--text-main)' }}>Google Agenda Não Vinculada</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '450px', margin: '0 auto 20px' }}>
                O profissional <strong>{currentProfessional?.nome}</strong> ainda não realizou a integração de sua conta Google com o sistema.
              </p>
              <button 
                className="btn btn-primary" 
                onClick={handleConnectGoogle}
                disabled={googleConnecting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                {googleConnecting ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> Conectando...</>
                ) : (
                  <><i className="fa-brands fa-google"></i> Conectar Google Agenda</>
                )}
              </button>
            </div>
          ) : (
            // ================= VISUALIZAÇÃO GOOGLE - TIMELINE =================
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                  Compromissos Google Agenda ({selectedDate ? formatSelectedDateWithDayOfWeek(selectedDate) : ''})
                </h3>
                <span style={{ fontSize: '0.72rem', background: '#10b98120', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                  CONECTADA
                </span>
              </div>

              {/* Container da Timeline */}
              <div 
                style={{ 
                  position: 'relative', 
                  height: '960px', // 16 horas (06:00 às 22:00) * 60px por hora
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px', 
                  background: 'var(--bg-darker)',
                  overflowY: 'auto',
                  padding: '0 12px'
                }}
              >
                {/* Linhas Horárias de Fundo */}
                {Array.from({ length: 17 }).map((_, index) => {
                  const hour = 6 + index;
                  const formattedHour = String(hour).padStart(2, '0') + ':00';
                  return (
                    <div 
                      key={hour} 
                      style={{ 
                        position: 'absolute', 
                        top: `${index * 60}px`, 
                        left: 0, 
                        width: '100%', 
                        height: '1px', 
                        borderTop: '1px dashed var(--border-color)',
                        display: 'flex',
                        alignItems: 'flex-start'
                      }}
                    >
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', background: 'var(--bg-darker)', padding: '2px 6px', position: 'relative', top: '-10px', left: '4px', zIndex: 2 }}>
                        {formattedHour}
                      </span>
                    </div>
                  );
                })}

                {/* Renderização dos Eventos do Google */}
                {googleEvents.length === 0 ? (
                  <div style={{ position: 'absolute', width: '100%', top: '50%', transform: 'translateY(-50%)', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                    Nenhum compromisso agendado para este dia no Google Agenda.
                  </div>
                ) : (
                  googleEvents.map(event => {
                    const eventStyle = getGoogleEventStyle(event.start, event.end);
                    
                    return (
                      <div
                        key={event.id}
                        style={{
                          position: 'absolute',
                          left: '60px',
                          right: '16px',
                          ...eventStyle,
                          background: 'rgba(59, 130, 246, 0.18)',
                          borderLeft: '4px solid var(--color-primary)',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          zIndex: 5,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '0.82rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {event.summary}
                            </strong>
                            <button 
                              onClick={() => handleDeleteGoogleEvent(event.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '0.75rem', padding: '2px' }}
                              title="Remover compromisso no Google"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                          {event.description && (
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {event.description}
                            </p>
                          )}
                        </div>
                        <small style={{ fontSize: '0.68rem', color: 'var(--color-info)', fontWeight: 600 }}>
                          {new Date(event.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </small>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

        </div>
      </div>

      {/* MODAL 1: Ajustar Capacidade/Vagas (Local) */}
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

      {/* MODAL 1.5: Suspender Horário (Confirmação Customizada) */}
      {showDeleteConfirmModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowDeleteConfirmModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', width: '90%' }}>
            <div className="modal-header">
              <h3 style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-trash-can"></i> Suspender Horário
              </h3>
              <button className="modal-close" onClick={() => setShowDeleteConfirmModal(false)}>&times;</button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>
                Como deseja suspender o horário das <strong>{deleteTargetTime}</strong> ({deleteTargetType === 'academia' ? 'Academia' : 'Fisioterapia'})?
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    handleBlockSlot(deleteTargetTime, deleteTargetType, false);
                    setShowDeleteConfirmModal(false);
                  }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '12px 16px', height: 'auto', textAlign: 'left', borderColor: 'var(--border-color)' }}
                >
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>
                    Apenas neste dia ({selectedDate ? formatSelectedDateWithDayOfWeek(selectedDate) : ''})
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>O horário voltará a ficar ativo na semana seguinte.</span>
                </button>

                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    handleBlockSlot(deleteTargetTime, deleteTargetType, true);
                    setShowDeleteConfirmModal(false);
                  }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '12px 16px', height: 'auto', textAlign: 'left', borderColor: 'var(--border-color)' }}
                >
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>De forma recorrente (semanal)</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Remover das {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' }) + 's' : 'todas as semanas'}.
                  </span>
                </button>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirmModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Adicionar Horário Extra (Local) */}
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

      {/* MODAL 3: Visualização Detalhada & Agendamento Manual (Local) */}
      {showDetailsModal && selectedSlot && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', width: '95%' }}>
            <div className="modal-header">
              <h3>Alunos Agendados - {selectedSlot.horario} ({selectedSlot.tipo})</h3>
              <button className="modal-close" onClick={() => setShowDetailsModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div className="appointments-list-container">
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

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '10px' }}>Agendar Novo Aluno Manualmente</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
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
                      <div style={{ 
                        position: 'absolute', 
                        width: '100%', 
                        background: '#ffffff', 
                        border: '1px solid #d1d5db', 
                        borderRadius: '6px', 
                        zIndex: 9999, 
                        marginTop: '2px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        maxHeight: '200px',
                        overflowY: 'auto'
                      }}>
                        {filteredClients.map(c => (
                          <div 
                            key={c._id}
                            style={{ 
                              padding: '10px 12px', 
                              cursor: 'pointer', 
                              fontSize: '0.82rem', 
                              borderBottom: '1px solid #f3f4f6',
                              color: '#111827',
                              transition: 'background-color 0.2s'
                            }}
                            onClick={() => {
                              setManualClientId(c._id);
                              setClientSearchText(c.dadosPessoais.nome);
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <strong style={{ color: '#111827' }}>{c.dadosPessoais.nome}</strong> 
                            <span style={{ color: '#6b7280', marginLeft: '6px' }}>
                              (CPF: {c.dadosPessoais.cpf || '—'})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Serviço</label>
                    <select className="select-custom" value={manualService} onChange={e => setManualService(e.target.value)}>
                      {selectedDate && new Date(selectedDate + 'T12:00:00').getDay() === 6 ? (
                        <option value="Massagem">Massagem</option>
                      ) : selectedSlot.tipo === 'academia' ? (
                        <>
                          <option value="Treino Monitorado">Treino Monitorado</option>
                          <option value="Treino Livre">Treino Livre</option>
                          <option value="Recovery">Recovery</option>
                          <option value="Avaliação Física">Avaliação Física</option>
                          <option value="Teste de Força">Teste de Força</option>
                          <option value="Avaliação Fisioterápica">Avaliação Fisioterápica</option>
                          <option value="Emergência">Emergência</option>
                        </>
                      ) : (
                        <>
                          <option value="Avaliação Fisioterápica">Avaliação Fisioterápica</option>
                        </>
                      )}
                    </select>
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

      {/* MODAL 4: Adicionar Compromisso na Google Agenda */}
      {showAddGoogleEventModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowAddGoogleEventModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', width: '90%' }}>
            <div className="modal-header">
              <h3>Novo Compromisso - Google Agenda</h3>
              <button className="modal-close" onClick={() => setShowAddGoogleEventModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label>Título do Compromisso</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ex: Almoço de negócios, Consulta particular"
                  value={googleEventTitle}
                  onChange={e => setGoogleEventTitle(e.target.value)} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Horário de Início</label>
                  <input 
                    type="time" 
                    className="form-control" 
                    value={googleEventStart}
                    onChange={e => setGoogleEventStart(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label>Horário de Término</label>
                  <input 
                    type="time" 
                    className="form-control" 
                    value={googleEventEnd}
                    onChange={e => setGoogleEventEnd(e.target.value)} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Descrição (Opcional)</label>
                <textarea 
                  className="form-control" 
                  style={{ minHeight: '60px', resize: 'vertical' }}
                  placeholder="Detalhes adicionais..."
                  value={googleEventDesc}
                  onChange={e => setGoogleEventDesc(e.target.value)} 
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowAddGoogleEventModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddGoogleEvent}>Salvar no Google</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
