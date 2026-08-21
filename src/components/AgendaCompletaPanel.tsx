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
  const [isBookingManual, setIsBookingManual] = useState(false);
  const [bookingError, setBookingError] = useState('');

  // States para Modal Customizado de Confirmação de Deleção
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteTargetTime, setDeleteTargetTime] = useState('');
  const [deleteTargetType, setDeleteTargetType] = useState<'academia' | 'consultorio'>('academia');

  // States para Inspeção Rápida de Agendamento e Gestão de Observações (Mobile & Desktop)
  const [inspectApt, setInspectApt] = useState<any | null>(null);
  const [editObsText, setEditObsText] = useState('');
  const [isEditingObs, setIsEditingObs] = useState(false);
  const [savingObs, setSavingObs] = useState(false);

  // Formatação de data/hora de lançamento de observação
  const formatObsTimestamp = (dtString?: string | Date) => {
    if (!dtString) return '';
    try {
      const d = new Date(dtString);
      if (isNaN(d.getTime())) return '';
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const ano = d.getFullYear();
      const hora = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${dia}/${mes}/${ano} às ${hora}:${min}`;
    } catch {
      return '';
    }
  };

  // Função utilitária de formatação de data com dia da semana
  const formatSelectedDateWithDayOfWeek = (dateStr: string) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('pt-BR');
    const dayOfWeek = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
    const capitalizedDay = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
    return `${formattedDate} (${capitalizedDay})`;
  };

  // Salvar observação clínica diretamente no agendamento
  const handleSaveObservation = async () => {
    if (!inspectApt) return;
    setSavingObs(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: inspectApt._id,
          observacoes: editObsText
        })
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('Observação clínica atualizada com sucesso!', 'success');
        setInspectApt((prev: any) => prev ? {
          ...prev,
          observacoes: editObsText.trim(),
          observacaoDataHora: editObsText.trim() ? new Date().toISOString() : null
        } : null);
        setIsEditingObs(false);
        fetchSlotsAndConfigs();
      } else {
        showFeedback(data.error || 'Erro ao salvar observação.', 'danger');
      }
    } catch (e: any) {
      showFeedback('Erro de conexão: ' + e.message, 'danger');
    } finally {
      setSavingObs(false);
    }
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

  const handleUpdateAptStatus = async (id: string, newStatus: 'presenca' | 'cancelado' | 'agendado' | 'falta') => {
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
    setBookingError('');
    let targetClientId = manualClientId;
    
    // Se o cliente não foi explicitamente clicado, tenta inferir pelo texto digitado
    if (!targetClientId && clientSearchText.trim()) {
      const searchNorm = normalizeText(clientSearchText.trim());
      const exactMatch = clients.find(c => normalizeText(c.dadosPessoais?.nome) === searchNorm);
      const partialMatch = clients.find(c => normalizeText(c.dadosPessoais?.nome).includes(searchNorm));
      const chosen = exactMatch || partialMatch;
      if (chosen) {
        targetClientId = chosen._id;
        setManualClientId(chosen._id);
        setClientSearchText(chosen.dadosPessoais?.nome || clientSearchText);
      }
    }

    if (!targetClientId) {
      setBookingError('Por favor, selecione um aluno na lista.');
      return;
    }

    setIsBookingManual(true);
    const defaultProfId = professionals[0]?._id || '6668ab030303030303030302';

    const payload = {
      data: selectedDate,
      horario: selectedSlot?.horario,
      servico: manualService,
      clienteId: targetClientId,
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
        setBookingError('');
        
        const newApt = data.data;
        const c = clients.find(cl => cl._id === targetClientId);
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
        setBookingError(data.error || 'Erro ao agendar cliente.');
        showFeedback(data.error || 'Erro ao agendar cliente', 'danger');
      }
    } catch (err: any) {
      setBookingError('Erro de conexão ao realizar agendamento.');
      showFeedback('Erro de conexão ao realizar agendamento.', 'danger');
    } finally {
      setIsBookingManual(false);
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
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button 
          className={`btn ${activeTab === 'academia' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('academia')}
          style={{ fontSize: '0.78rem', padding: '6px 14px', borderRadius: '8px' }}
        >
          <i className="fa-solid fa-dumbbell" style={{ marginRight: '5px' }}></i> Academia
        </button>


        {/* Divisor */}
        <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' }}></div>

        {/* Abas dos Profissionais */}
        {professionals.map(p => (
          <button
            key={p._id}
            className={`btn ${activeTab === p._id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(p._id)}
            style={{ fontSize: '0.76rem', padding: '5px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <i className="fa-brands fa-google" style={{ color: p.googleTokens?.refreshToken ? '#10b981' : '#ef4444', fontSize: '0.72rem' }}></i>
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
                               const hasObs = Boolean(apt.observacoes && apt.observacoes.trim());

                               return (
                                 <button 
                                   type="button"
                                   key={apt._id} 
                                   onClick={(e) => {
                                     e.preventDefault();
                                     e.stopPropagation();
                                     setInspectApt(apt);
                                     setEditObsText(apt.observacoes || '');
                                     setIsEditingObs(false);
                                   }}
                                   title={hasObs ? `Clique para ver: ${apt.observacoes}` : 'Clique para ver detalhes do agendamento'}
                                   style={{ 
                                     display: 'inline-flex', 
                                     alignItems: 'center', 
                                     background: 'var(--bg-secondary)', 
                                     border: `1.5px solid ${sColors.text}`, 
                                     borderRadius: '16px', 
                                     padding: '3px 10px', 
                                     gap: '6px',
                                     boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                     cursor: 'pointer',
                                     touchAction: 'manipulation',
                                     WebkitTapHighlightColor: 'transparent',
                                     outline: 'none',
                                     transition: 'all 0.15s ease',
                                     textAlign: 'left'
                                   }}
                                 >
                                   <span style={{ fontSize: '0.76rem', fontWeight: 700, color: apt.status === 'presenca' ? 'var(--color-success)' : 'var(--text-main)', pointerEvents: 'none' }}>
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
                                       letterSpacing: '0.3px',
                                       pointerEvents: 'none'
                                     }}
                                   >
                                     {(apt.servico || slot.tipo || '')?.replace('Treino ', '')}
                                   </span>
                                   {hasObs && (
                                      <span
                                        style={{
                                          background: 'rgba(245, 158, 11, 0.2)',
                                          color: '#f59e0b',
                                          border: '1px solid rgba(245, 158, 11, 0.4)',
                                          fontSize: '0.7rem',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                          padding: '1px 6px',
                                          borderRadius: '8px',
                                          marginLeft: '2px',
                                          fontWeight: 800,
                                          pointerEvents: 'none'
                                        }}
                                      >
                                        <i className="fa-solid fa-note-sticky"></i> Obs
                                      </span>
                                    )}
                                 </button>
                               );
                             })
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button 
                            type="button"
                            className="btn btn-secondary btn-sm" 
                            title="Ver e Gerenciar Agendamentos"
                            style={{ touchAction: 'manipulation', minHeight: '36px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
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
                            type="button"
                            className="btn btn-secondary btn-sm" 
                            title="Ajustar Vagas"
                            style={{ touchAction: 'manipulation', minHeight: '36px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
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
                            type="button"
                            className="btn btn-secondary btn-sm" 
                            style={{ color: 'var(--color-danger)', touchAction: 'manipulation', minHeight: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
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
        <div className="modal-overlay" onClick={() => setShowAdjustModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                  <i className="fa-solid fa-sliders"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Ajustar Vagas</h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Horário: <strong>{adjustTargetTime}</strong> ({adjustTargetType === 'academia' ? 'Academia' : 'Fisioterapia'})
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowAdjustModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Número de Vagas Disponíveis</label>
                <input 
                  type="number" 
                  className="form-control" 
                  min={1} 
                  max={20} 
                  value={adjustCapacityVal}
                  onChange={e => setAdjustCapacityVal(Number(e.target.value))} 
                  style={{ width: '100%', padding: '10px', fontSize: '1rem', fontWeight: 700 }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAdjustModal(false)}>Voltar</button>
              <button className="btn btn-secondary" style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }} onClick={() => handleSaveCapacityRule(false)}>Apenas esta Data</button>
              <button className="btn btn-primary" onClick={() => handleSaveCapacityRule(true)}>Salvar Semanal</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1.5: Suspender Horário (Confirmação Customizada) */}
      {showDeleteConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirmModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                  <i className="fa-solid fa-trash-can"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>Suspender Horário</h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Horário: <strong>{deleteTargetTime}</strong> ({deleteTargetType === 'academia' ? 'Academia' : 'Fisioterapia'})
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowDeleteConfirmModal(false)}>&times;</button>
            </div>
            
            <div className="modal-body">
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                Como deseja suspender o horário das <strong>{deleteTargetTime}</strong> ({deleteTargetType === 'academia' ? 'Academia' : 'Fisioterapia'})?
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    handleBlockSlot(deleteTargetTime, deleteTargetType, false);
                    setShowDeleteConfirmModal(false);
                  }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '14px 16px', height: 'auto', textAlign: 'left', borderColor: 'var(--border-color)', borderRadius: '12px' }}
                >
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                    Apenas neste dia ({selectedDate ? formatSelectedDateWithDayOfWeek(selectedDate) : ''})
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>O horário voltará a ficar ativo na semana seguinte.</span>
                </button>

                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    handleBlockSlot(deleteTargetTime, deleteTargetType, true);
                    setShowDeleteConfirmModal(false);
                  }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '14px 16px', height: 'auto', textAlign: 'left', borderColor: 'rgba(239, 68, 68, 0.3)', borderRadius: '12px' }}
                >
                  <strong style={{ fontSize: '0.9rem', color: '#ef4444' }}>De forma recorrente (todas as semanas)</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Remover permanentemente das {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' }) + 's' : 'todas as semanas'}.
                  </span>
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirmModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Adicionar Horário Extra (Local) */}
      {showAddHourModal && (
        <div className="modal-overlay" onClick={() => setShowAddHourModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                  <i className="fa-solid fa-clock"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Adicionar Horário Extra</h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Nova vaga ou abertura de agenda</div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowAddHourModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Horário (HH:MM)</label>
                <input 
                  type="time" 
                  className="form-control" 
                  value={addTimeInput}
                  onChange={e => setAddTimeInput(e.target.value)} 
                  style={{ width: '100%', padding: '10px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Vagas Iniciais</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={addCapacityInput}
                  onChange={e => setAddCapacityInput(Number(e.target.value))} 
                  style={{ width: '100%', padding: '10px' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddHourModal(false)}>Voltar</button>
              <button className="btn btn-secondary" style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }} onClick={() => handleAddExtraHour(false)}>Apenas esta Data</button>
              <button className="btn btn-primary" onClick={() => handleAddExtraHour(true)}>Adicionar Semanal</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Visualização Detalhada & Agendamento Manual (Local) */}
      {showDetailsModal && selectedSlot && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                  <i className="fa-solid fa-users-gear"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    Gerenciar Horário: {selectedSlot.horario}
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {selectedSlot.tipo === 'academia' ? 'Academia (Treino)' : 'Consultório (Fisioterapia)'} • <strong style={{ color: '#10b981' }}>{selectedSlot.vagasOcupadas}/{selectedSlot.capacidade} vagas</strong>
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowDetailsModal(false)}>&times;</button>
            </div>

            <div className="modal-body">
              <div className="appointments-list-container">
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  Alunos com Horário Reservado ({selectedSlot.appointments.length})
                </div>
                {selectedSlot.appointments.length === 0 ? (
                  <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-color)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                    Nenhum aluno agendado para este horário.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selectedSlot.appointments.map(apt => (
                      <div 
                        key={apt._id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px',
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ flex: '1 1 200px' }}>
                          <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>{apt.clienteId?.dadosPessoais?.nome}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            CPF: {apt.clienteId?.dadosPessoais?.cpf || '—'} · Tel: {apt.clienteId?.dadosPessoais?.telefone || '—'}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                            Profissional: <strong style={{ color: 'var(--color-primary)' }}>{apt.profissionalId?.dadosPessoais?.nome || 'Equipe'}</strong> · Serviço: <strong>{apt.servico}</strong>
                          </div>
                          {apt.observacoes && (
                            <div style={{
                              marginTop: '8px',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              background: 'rgba(245, 158, 11, 0.08)',
                              border: '1px solid rgba(245, 158, 11, 0.25)',
                              fontSize: '0.78rem',
                              color: 'var(--text-main)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontWeight: 700, marginBottom: '3px' }}>
                                <i className="fa-solid fa-note-sticky"></i> Observação Clínica:
                              </div>
                              <div style={{ lineHeight: '1.4' }}>{apt.observacoes}</div>
                              {apt.observacaoDataHora && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                  🕒 Lançada em {formatObsTimestamp(apt.observacaoDataHora)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {apt.status === 'agendado' ? (
                            <>
                              <button className="btn btn-secondary btn-sm" style={{ color: 'var(--color-success)', borderColor: 'rgba(16,185,129,0.3)', padding: '6px 12px', fontWeight: 600 }} onClick={() => handleUpdateAptStatus(apt._id, 'presenca')}>
                                <i className="fa-solid fa-check"></i> Presença
                              </button>
                              <button className="btn btn-secondary btn-sm" style={{ color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.3)', padding: '6px 12px', fontWeight: 600 }} onClick={() => handleUpdateAptStatus(apt._id, 'falta')}>
                                <i className="fa-solid fa-ban"></i> Falta
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', background: apt.status === 'presenca' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: apt.status === 'presenca' ? '#10b981' : '#ef4444', fontWeight: 800, textTransform: 'uppercase' }}>
                              {apt.status}
                            </span>
                          )}
                          <button className="btn btn-secondary btn-sm" style={{ color: 'var(--color-danger)', padding: '6px 10px' }} title="Excluir Agendamento" onClick={() => handleRemoveAppointment(apt._id)}>
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  Agendar Novo Aluno Manualmente
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  <div style={{ position: 'relative' }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Buscar Aluno</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Pesquisar por nome ou CPF..." 
                      value={clientSearchText}
                      onChange={e => {
                        setClientSearchText(e.target.value);
                        setManualClientId('');
                      }}
                      style={{ width: '100%', padding: '10px 12px' }}
                    />
                    {clientSearchText && !manualClientId && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#090e1a', 
                        border: '1px solid rgba(255, 255, 255, 0.15)', 
                        borderRadius: '10px', 
                        zIndex: 99999, 
                        marginTop: '4px',
                        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.8)',
                        maxHeight: '220px',
                        overflowY: 'auto'
                      }}>
                        {filteredClients.map(c => (
                          <div 
                            key={c._id}
                            style={{ 
                              padding: '12px 14px', 
                              cursor: 'pointer', 
                              fontSize: '0.84rem', 
                              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                              color: '#ffffff',
                              transition: 'background-color 0.15s ease',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                            onClick={() => {
                              setManualClientId(c._id);
                              setClientSearchText(c.dadosPessoais.nome);
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.12)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <strong style={{ color: '#ffffff' }}>{c.dadosPessoais.nome}</strong> 
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                              CPF: {c.dadosPessoais.cpf || '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Serviço</label>
                    <select className="select-custom" value={manualService} onChange={e => setManualService(e.target.value)} style={{ width: '100%', padding: '10px' }}>
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

                  {bookingError && (
                    <div style={{ color: 'var(--color-danger, #ef4444)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: '8px' }}>
                      <i className="fa-solid fa-triangle-exclamation"></i> {bookingError}
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleManualBook}
                    disabled={isBookingManual}
                    style={{
                      alignSelf: 'flex-end',
                      marginTop: '6px',
                      padding: '12px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontWeight: 700,
                      opacity: isBookingManual ? 0.7 : 1,
                      cursor: isBookingManual ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isBookingManual ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i> Agendando...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-calendar-check"></i> Confirmar Agendamento
                      </>
                    )}
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
        <div className="modal-overlay" onClick={() => setShowAddGoogleEventModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                  <i className="fa-brands fa-google"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Novo Compromisso Google Agenda</h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Sincronização direta com o calendário</div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowAddGoogleEventModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Título do Compromisso</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ex: Reunião clínica, Consulta particular..." 
                  value={googleEventTitle}
                  onChange={e => setGoogleEventTitle(e.target.value)} 
                  style={{ width: '100%', padding: '10px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Horário de Início</label>
                  <input 
                    type="time" 
                    className="form-control" 
                    value={googleEventStart}
                    onChange={e => setGoogleEventStart(e.target.value)} 
                    style={{ width: '100%', padding: '10px' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Horário de Término</label>
                  <input 
                    type="time" 
                    className="form-control" 
                    value={googleEventEnd}
                    onChange={e => setGoogleEventEnd(e.target.value)} 
                    style={{ width: '100%', padding: '10px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Descrição (Opcional)</label>
                <textarea 
                  className="form-control" 
                  style={{ minHeight: '70px', resize: 'vertical', width: '100%', padding: '10px' }}
                  placeholder="Detalhes adicionais do compromisso..." 
                  value={googleEventDesc}
                  onChange={e => setGoogleEventDesc(e.target.value)} 
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddGoogleEventModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddGoogleEvent}>Salvar no Google</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Modal Executivo de Inspeção Rápida de Agendamento & Observações (Desktop & Mobile) */}
      {inspectApt && (
        <div className="modal-overlay" onClick={() => { setInspectApt(null); setIsEditingObs(false); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px', width: '95%' }}>
            
            {/* Modal Header Executivo */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                  <i className="fa-solid fa-user-check"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                    {inspectApt.clienteId?.dadosPessoais?.nome || inspectApt.clienteNome || 'Aluno'}
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    📅 {formatSelectedDateWithDayOfWeek(inspectApt.data || selectedDate)} às <strong style={{ color: '#10b981' }}>{inspectApt.horario}</strong>
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => { setInspectApt(null); setIsEditingObs(false); }}>&times;</button>
            </div>

            {/* Modal Body com Scroll Inteligente */}
            <div className="modal-body">
              {/* Modalidade & Contato */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  CPF: <strong>{inspectApt.clienteId?.dadosPessoais?.cpf || '—'}</strong> • Tel: <strong>{inspectApt.clienteId?.dadosPessoais?.telefone || '—'}</strong>
                </div>
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: '10px',
                  background: getServiceColor(inspectApt.servico).bg,
                  color: getServiceColor(inspectApt.servico).text,
                  border: `1px solid ${getServiceColor(inspectApt.servico).text}40`
                }}>
                  {inspectApt.servico}
                </span>
              </div>

              {/* Bloco de Observação Clínica com Timestamp */}
              <div style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '14px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 800, fontSize: '0.88rem' }}>
                    <i className="fa-solid fa-note-sticky"></i> Observação Clínica
                  </div>
                  {!isEditingObs && (
                    <button
                      type="button"
                      onClick={() => setIsEditingObs(true)}
                      style={{
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        color: '#f59e0b',
                        borderRadius: '8px',
                        padding: '4px 12px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <i className="fa-solid fa-pen-to-square"></i> {inspectApt.observacoes ? 'Editar' : 'Adicionar'}
                    </button>
                  )}
                </div>

                {isEditingObs ? (
                  <div>
                    <textarea
                      rows={3}
                      className="form-control"
                      placeholder="Digite orientações clínicas, foco do treino, dores ou restrições..."
                      value={editObsText}
                      onChange={e => setEditObsText(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#080b11',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '12px',
                        fontSize: '0.9rem',
                        resize: 'vertical',
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingObs(false);
                          setEditObsText(inspectApt.observacoes || '');
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-muted)',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          cursor: 'pointer'
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={savingObs}
                        onClick={handleSaveObservation}
                        style={{
                          background: '#10b981',
                          border: 'none',
                          color: '#fff',
                          padding: '8px 18px',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {savingObs ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                        Salvar Observação
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {inspectApt.observacoes ? (
                      <>
                        <div style={{ fontSize: '0.92rem', color: '#ffffff', lineHeight: '1.45', whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                          "{inspectApt.observacoes}"
                        </div>
                        {inspectApt.observacaoDataHora && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <i className="fa-regular fa-clock"></i> Lançada em {formatObsTimestamp(inspectApt.observacaoDataHora)}
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        Nenhuma observação clínica registrada para este agendamento.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Ações Rápidas de Frequência em Botões Tácteis Grandes */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '4px' }}>
                {inspectApt.status === 'agendado' ? (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        await handleUpdateAptStatus(inspectApt._id, 'presenca');
                        setInspectApt(null);
                      }}
                      style={{
                        flex: '1 1 140px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        fontSize: '0.9rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                      }}
                    >
                      <i className="fa-solid fa-check"></i> Marcar Presença
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await handleUpdateAptStatus(inspectApt._id, 'falta');
                        setInspectApt(null);
                      }}
                      style={{
                        flex: '1 1 120px',
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        fontSize: '0.9rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <i className="fa-solid fa-xmark"></i> Falta
                    </button>
                  </>
                ) : (
                  <div style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    background: inspectApt.status === 'presenca' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: inspectApt.status === 'presenca' ? '#10b981' : '#ef4444',
                    fontWeight: 800,
                    textAlign: 'center',
                    fontSize: '0.88rem',
                    textTransform: 'uppercase'
                  }}>
                    Status Atual: {inspectApt.status}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setInspectApt(null); setIsEditingObs(false); }}>Fechar</button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
