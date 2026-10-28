'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import SavioTaskModal, { ISavioTaskItem } from './SavioTaskModal';

interface SavioAgendaPanelProps {
  user: any;
}

type ViewType = 'diaria' | 'semanal' | 'mensal' | 'lista';

const PRIORIDADE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  alta: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: '#ef4444' },
  media: { bg: 'rgba(250, 204, 21, 0.15)', text: '#facc15', border: '#f59e0b' },
  baixa: { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: '#0284c7' }
};

const CATEGORIA_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  administrativa: { icon: 'fa-building', color: '#818cf8', label: 'Administrativa' },
  financeira: { icon: 'fa-coins', color: '#10b981', label: 'Financeira' },
  comercial: { icon: 'fa-handshake', color: '#3b82f6', label: 'Comercial' },
  operacional: { icon: 'fa-gears', color: '#f59e0b', label: 'Operacional' },
  pessoal: { icon: 'fa-user', color: '#ec4899', label: 'Pessoal' },
  personalizada: { icon: 'fa-tag', color: '#8b5cf6', label: 'Outra' }
};

// Formatar data YYYY-MM-DD
function formatYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Formatar data para exibição brasileira (DD/MM/YYYY)
function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

// Nome do dia da semana
function getDiaSemanaExtenso(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return dias[date.getDay()] || '';
}

export default function SavioAgendaPanel({ user }: SavioAgendaPanelProps) {
  // Estados de Visualização e Filtro
  const [currentView, setCurrentView] = useState<ViewType>('diaria');
  const [selectedDate, setSelectedDate] = useState<string>(() => formatYMD(new Date()));
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());

  // Filtros da Visão em Lista
  const [filterStatus, setFilterStatus] = useState<string>('todas');
  const [filterPrioridade, setFilterPrioridade] = useState<string>('todas');
  const [filterCategoria, setFilterCategoria] = useState<string>('todas');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Dados das Tarefas e Métricas
  const [tasks, setTasks] = useState<ISavioTaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<any>({
    hojeTotal: 0,
    hojePendentes: 0,
    concluidasHoje: 0,
    atrasadas: 0,
    emAndamento: 0,
    proximas: 0,
    totalGeral: 0,
    concluidasTotal: 0,
    taxaHoje: 0,
    taxaGeral: 0
  });

  // Modal de Criação / Edição
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [taskEditing, setTaskEditing] = useState<ISavioTaskItem | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<string>('');

  // Data de Hoje
  const todayBR = useMemo(() => formatYMD(new Date()), []);

  // 1. Carregar Resumo Estatístico dos KPIs
  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/savio-agenda/summary?mes=${currentMonth}&ano=${currentYear}`);
      const data = await res.json();
      if (data.success && data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Erro ao buscar resumo:', err);
    }
  }, [currentMonth, currentYear]);

  // 2. Carregar Lista de Tarefas de acordo com a visualização atual
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/admin/savio-agenda?view=${currentView}`;

      if (currentView === 'diaria') {
        url += `&data=${selectedDate}`;
      } else if (currentView === 'semanal') {
        // Calcular início (segunda) e fim (domingo) da semana selecionada
        const [y, m, d] = selectedDate.split('-').map(Number);
        const curr = new Date(y, m - 1, d);
        const day = curr.getDay();
        const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(curr.setDate(diffToMonday));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        url += `&semanaInicio=${formatYMD(monday)}&semanaFim=${formatYMD(sunday)}`;
      } else if (currentView === 'mensal') {
        url += `&mes=${currentMonth}&ano=${currentYear}`;
      } else if (currentView === 'lista') {
        if (filterStatus !== 'todas') url += `&status=${filterStatus}`;
        if (filterPrioridade !== 'todas') url += `&prioridade=${filterPrioridade}`;
        if (filterCategoria !== 'todas') url += `&categoria=${filterCategoria}`;
        if (searchTerm.trim()) url += `&busca=${encodeURIComponent(searchTerm.trim())}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error('Erro ao buscar tarefas:', err);
    } finally {
      setLoading(false);
    }
  }, [currentView, selectedDate, currentMonth, currentYear, filterStatus, filterPrioridade, filterCategoria, searchTerm]);

  // Recarregar tarefas e métricas quando os parâmetros mudarem
  useEffect(() => {
    fetchTasks();
    fetchSummary();
  }, [fetchTasks, fetchSummary]);

  // Alternar Status da Tarefa (Concluir / Reabrir)
  const toggleComplete = async (task: ISavioTaskItem) => {
    const nextStatus = task.status === 'concluida' ? 'a_fazer' : 'concluida';
    // Otimista
    setTasks(prev =>
      prev.map(t => (t._id === task._id ? { ...t, status: nextStatus, concluidaEm: nextStatus === 'concluida' ? new Date() : null } : t))
    );

    try {
      const res = await fetch(`/api/admin/savio-agenda/${task._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error);
      }
      fetchSummary();
    } catch (err) {
      console.error('Erro ao alternar conclusão:', err);
      fetchTasks(); // Reverter em caso de falha
    }
  };

  // Reagendamento Rápido (+1 dia, +3 dias, Próxima Segunda)
  const quickReschedule = async (taskId: string, daysToAdd: number) => {
    const now = new Date();
    const newDateObj = new Date(now);
    newDateObj.setDate(newDateObj.getDate() + daysToAdd);
    const newDateStr = formatYMD(newDateObj);

    try {
      const res = await fetch(`/api/admin/savio-agenda/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: newDateStr })
      });
      const data = await res.json();
      if (data.success) {
        fetchTasks();
        fetchSummary();
      }
    } catch (err) {
      console.error('Erro ao reagendar tarefa:', err);
    }
  };

  // Excluir Tarefa
  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    if (!confirm(`Deseja realmente excluir a tarefa "${taskTitle}"?`)) return;

    try {
      const res = await fetch(`/api/admin/savio-agenda/${taskId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setTasks(prev => prev.filter(t => t._id !== taskId));
        fetchSummary();
      }
    } catch (err) {
      console.error('Erro ao excluir tarefa:', err);
    }
  };

  // Abrir Modal para Nova Tarefa
  const openNewTaskModal = (dateToUse?: string) => {
    setTaskEditing(null);
    setModalInitialDate(dateToUse || selectedDate || todayBR);
    setModalOpen(true);
  };

  // Abrir Modal para Edição
  const openEditTaskModal = (task: ISavioTaskItem) => {
    setTaskEditing(task);
    setModalOpen(true);
  };

  // Navegação de Dias (Visão Diária)
  const changeSelectedDay = (offset: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + offset);
    setSelectedDate(formatYMD(date));
  };

  // Navegação de Semanas
  const changeSelectedWeek = (offsetWeeks: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + offsetWeeks * 7);
    setSelectedDate(formatYMD(date));
  };

  // Navegação de Mês
  const changeSelectedMonth = (offsetMonth: number) => {
    let nextM = currentMonth + offsetMonth;
    let nextY = currentYear;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    } else if (nextM < 1) {
      nextM = 12;
      nextY -= 1;
    }
    setCurrentMonth(nextM);
    setCurrentYear(nextY);
  };

  // Calcular dias da semana atual para a Visão Semanal
  const weekDays = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const curr = new Date(y, m - 1, d);
    const day = curr.getDay();
    const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diffToMonday));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      days.push(formatYMD(dayDate));
    }
    return days;
  }, [selectedDate]);

  // Calcular dias do mês para a Visão Mensal
  const monthCalendarGrid = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Domingo, 1 = Segunda...

    const cells: { dateStr: string; dayNumber: number; isCurrentMonth: boolean }[] = [];

    // Dias do mês anterior para completar o início da semana
    const prevMonthLastDay = new Date(currentYear, currentMonth - 1, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevD = prevMonthLastDay - i;
      const prevMonthNum = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYearNum = currentMonth === 1 ? currentYear - 1 : currentYear;
      cells.push({
        dateStr: `${prevYearNum}-${String(prevMonthNum).padStart(2, '0')}-${String(prevD).padStart(2, '0')}`,
        dayNumber: prevD,
        isCurrentMonth: false
      });
    }

    // Dias do mês corrente
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({
        dateStr: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
        dayNumber: i,
        isCurrentMonth: true
      });
    }

    // Dias do próximo mês para completar a grade em múltiplos de 7
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextMonthNum = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYearNum = currentMonth === 12 ? currentYear + 1 : currentYear;
      cells.push({
        dateStr: `${nextYearNum}-${String(nextMonthNum).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
        dayNumber: i,
        isCurrentMonth: false
      });
    }

    return cells;
  }, [currentYear, currentMonth]);

  // Mapeamento de tarefas por data para a visão mensal
  const tasksByDate = useMemo(() => {
    const map: Record<string, ISavioTaskItem[]> = {};
    tasks.forEach(t => {
      if (!map[t.data]) map[t.data] = [];
      map[t.data].push(t);
    });
    return map;
  }, [tasks]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '1440px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* 1. BARRA SUPERIOR EXECUTIVA */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '16px',
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #3730a3 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '1.25rem',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)'
            }}
          >
            <i className="fas fa-calendar-check" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
                Agenda Pessoal & Tarefas Administrativas
              </h1>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  backgroundColor: 'rgba(99, 102, 241, 0.2)',
                  color: '#a5b4fc',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fas fa-shield-halved" /> Sávio Augusto Oliveira • Gestor Geral
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--text-dim, #94a3b8)' }}>
              Planejamento diário, compromissos executivos, prazos e prioridades estratégicas com privacidade total.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => { fetchTasks(); fetchSummary(); }}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#cbd5e1',
              borderRadius: '10px',
              padding: '9px 14px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="Recarregar dados"
          >
            <i className="fas fa-rotate" />
            <span className="hidden-mobile">Atualizar</span>
          </button>

          <button
            type="button"
            onClick={() => openNewTaskModal()}
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              border: 'none',
              color: '#fff',
              borderRadius: '10px',
              padding: '9px 18px',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)'
            }}
          >
            <i className="fas fa-plus" />
            <span>Nova Tarefa</span>
          </button>
        </div>
      </div>

      {/* 2. CARDS DE MÉTRICAS (KPIS) COM TAXA DE CONCLUSÃO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        {/* Taxa de Conclusão */}
        <div
          style={{
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Taxa do Dia</span>
            <i className="fas fa-chart-pie" style={{ color: '#10b981', fontSize: '1rem' }} />
          </div>
          <div style={{ margin: '10px 0 6px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>{summary.taxaHoje}%</span>
            <small style={{ color: '#94a3b8', fontSize: '0.76rem' }}>
              ({summary.concluidasHoje}/{summary.hojeTotal} concluídas)
            </small>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${summary.taxaHoje}%`, height: '100%', backgroundColor: '#10b981', transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Tarefas de Hoje */}
        <div
          style={{
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Para Hoje</span>
            <i className="fas fa-calendar-day" style={{ color: '#818cf8', fontSize: '1rem' }} />
          </div>
          <div style={{ margin: '10px 0 0' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>{summary.hojeTotal}</span>
            <span style={{ fontSize: '0.78rem', color: summary.hojePendentes > 0 ? '#f59e0b' : '#10b981', marginLeft: '8px', fontWeight: 600 }}>
              {summary.hojePendentes > 0 ? `• ${summary.hojePendentes} pendente(s)` : '• Todas prontas!'}
            </span>
          </div>
        </div>

        {/* Tarefas Atrasadas (Alerta Vermelho) */}
        <div
          style={{
            background: summary.atrasadas > 0 ? 'rgba(239, 68, 68, 0.12)' : '#0f172a',
            border: summary.atrasadas > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: summary.atrasadas > 0 ? '0 4px 20px rgba(239, 68, 68, 0.2)' : '0 4px 16px rgba(0, 0, 0, 0.25)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: summary.atrasadas > 0 ? '#f87171' : '#94a3b8', textTransform: 'uppercase' }}>
              Atrasadas
            </span>
            <i className="fas fa-triangle-exclamation" style={{ color: summary.atrasadas > 0 ? '#ef4444' : '#64748b', fontSize: '1rem' }} />
          </div>
          <div style={{ margin: '10px 0 0' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: summary.atrasadas > 0 ? '#f87171' : '#fff' }}>
              {summary.atrasadas}
            </span>
            <span style={{ fontSize: '0.78rem', color: summary.atrasadas > 0 ? '#fca5a5' : '#94a3b8', marginLeft: '8px' }}>
              {summary.atrasadas > 0 ? 'Exigem reagendamento' : 'Em dia'}
            </span>
          </div>
        </div>

        {/* Em Andamento */}
        <div
          style={{
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Em Andamento</span>
            <i className="fas fa-spinner fa-spin" style={{ color: '#38bdf8', fontSize: '1rem' }} />
          </div>
          <div style={{ margin: '10px 0 0' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>{summary.emAndamento}</span>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginLeft: '8px' }}>em execução</span>
          </div>
        </div>

        {/* Total Concluídas Histórico */}
        <div
          style={{
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Total Concluídas</span>
            <i className="fas fa-check-double" style={{ color: '#10b981', fontSize: '1rem' }} />
          </div>
          <div style={{ margin: '10px 0 0' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>{summary.concluidasTotal}</span>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginLeft: '8px' }}>
              ({summary.taxaGeral}% histórico)
            </span>
          </div>
        </div>
      </div>

      {/* 3. SELETOR DE VISUALIZAÇÕES DA AGENDA */}
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '14px',
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'inline-flex', backgroundColor: '#161f30', borderRadius: '10px', padding: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          {[
            { id: 'diaria', label: 'Diária', icon: 'fa-calendar-day' },
            { id: 'semanal', label: 'Semanal', icon: 'fa-calendar-week' },
            { id: 'mensal', label: 'Mensal', icon: 'fa-calendar' },
            { id: 'lista', label: 'Lista Completa', icon: 'fa-list-check' }
          ].map(v => {
            const isActive = currentView === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setCurrentView(v.id as ViewType)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: isActive ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-dim, #94a3b8)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: isActive ? '0 2px 10px rgba(99, 102, 241, 0.35)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <i className={`fas ${v.icon}`} />
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>

        {/* Controles de Navegação de Acordo com a Visão */}
        {currentView === 'diaria' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => changeSelectedDay(-1)}
              style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              <i className="fas fa-chevron-left" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(todayBR)}
              style={{
                background: selectedDate === todayBR ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                border: selectedDate === todayBR ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
                color: selectedDate === todayBR ? '#a5b4fc' : '#fff',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Hoje
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ background: '#161f30', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', borderRadius: '8px', padding: '6px 10px', fontSize: '0.84rem', outline: 'none' }}
            />
            <button
              type="button"
              onClick={() => changeSelectedDay(1)}
              style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              <i className="fas fa-chevron-right" />
            </button>
          </div>
        )}

        {currentView === 'semanal' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => changeSelectedWeek(-1)}
              style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              <i className="fas fa-chevron-left" /> Sem. Anterior
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(todayBR)}
              style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Semana Atual
            </button>
            <button
              type="button"
              onClick={() => changeSelectedWeek(1)}
              style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Próx. Semana <i className="fas fa-chevron-right" />
            </button>
          </div>
        )}

        {currentView === 'mensal' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => changeSelectedMonth(-1)}
              style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              <i className="fas fa-chevron-left" />
            </button>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', padding: '0 8px' }}>
              {new Date(currentYear, currentMonth - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => changeSelectedMonth(1)}
              style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              <i className="fas fa-chevron-right" />
            </button>
          </div>
        )}
      </div>

      {/* 4. CONTEÚDO PRINCIPAL (RENDERIZADOR DAS 4 VISUALIZAÇÕES) */}
      <div style={{ backgroundColor: '#0b0f19', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.12)', padding: '20px', minHeight: '400px' }}>
        {/* A. VISÃO DIÁRIA */}
        {currentView === 'diaria' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{getDiaSemanaExtenso(selectedDate)}, {formatDateBR(selectedDate)}</span>
                  {selectedDate === todayBR && (
                    <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                      HOJE
                    </span>
                  )}
                </h3>
                <small style={{ color: 'var(--text-dim, #94a3b8)' }}>
                  {tasks.length} tarefa(s) agendada(s) para este dia
                </small>
              </div>

              <button
                type="button"
                onClick={() => openNewTaskModal(selectedDate)}
                style={{
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.35)',
                  color: '#a5b4fc',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fas fa-plus" /> Adicionar neste dia
              </button>
            </div>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <i className="fas fa-spinner fa-spin fa-2x" />
                <p style={{ marginTop: '10px', fontSize: '0.88rem' }}>Carregando tarefas...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                <i className="fas fa-calendar-check fa-3x" style={{ opacity: 0.25, marginBottom: '12px' }} />
                <h4 style={{ margin: 0, color: '#e2e8f0' }}>Nenhuma tarefa para este dia</h4>
                <p style={{ margin: '6px 0 16px', fontSize: '0.86rem' }}>Aproveite o tempo livre ou adicione uma nova tarefa administrativa.</p>
                <button
                  type="button"
                  onClick={() => openNewTaskModal(selectedDate)}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-plus" style={{ marginRight: '6px' }} />
                  Criar Tarefa para Hoje
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tasks.map(task => {
                  const isDone = task.status === 'concluida';
                  const isAtrasada = !isDone && task.data < todayBR;
                  const catConfig = CATEGORIA_ICONS[task.categoria] || CATEGORIA_ICONS.administrativa;
                  const prioConfig = PRIORIDADE_COLORS[task.prioridade] || PRIORIDADE_COLORS.media;

                  return (
                    <div
                      key={task._id}
                      style={{
                        backgroundColor: '#161f30',
                        border: isAtrasada ? '1px solid rgba(239, 68, 68, 0.4)' : isDone ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderLeft: `4px solid ${isAtrasada ? '#ef4444' : isDone ? '#10b981' : prioConfig.border}`,
                        borderRadius: '12px',
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '14px',
                        transition: 'all 0.15s ease',
                        opacity: isDone ? 0.75 : 1
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                        {/* Checkbox de Conclusão */}
                        <button
                          type="button"
                          onClick={() => toggleComplete(task)}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            border: `2px solid ${isDone ? '#10b981' : 'rgba(255, 255, 255, 0.3)'}`,
                            backgroundColor: isDone ? '#10b981' : 'transparent',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'all 0.15s ease'
                          }}
                          title={isDone ? 'Reabrir tarefa' : 'Marcar como concluída'}
                        >
                          {isDone && <i className="fas fa-check" style={{ fontSize: '0.75rem' }} />}
                        </button>

                        {/* Detalhes da Tarefa */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '0.94rem', color: isDone ? '#94a3b8' : '#fff', textDecoration: isDone ? 'line-through' : 'none' }}>
                              {task.titulo}
                            </strong>

                            {task.horario && (
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(255, 255, 255, 0.08)', color: '#38bdf8', padding: '2px 8px', borderRadius: '6px' }}>
                                <i className="far fa-clock" style={{ marginRight: '4px' }} />
                                {task.horario}
                              </span>
                            )}

                            <span style={{ fontSize: '0.72rem', fontWeight: 600, backgroundColor: prioConfig.bg, color: prioConfig.text, border: `1px solid ${prioConfig.border}40`, padding: '2px 8px', borderRadius: '6px' }}>
                              {task.prioridade.toUpperCase()}
                            </span>

                            <span style={{ fontSize: '0.72rem', backgroundColor: `${catConfig.color}20`, color: catConfig.color, padding: '2px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <i className={`fas ${catConfig.icon}`} />
                              {task.categoria === 'personalizada' && task.categoriaPersonalizada ? task.categoriaPersonalizada : catConfig.label}
                            </span>

                            {isAtrasada && (
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, backgroundColor: 'rgba(239, 68, 68, 0.25)', color: '#f87171', padding: '2px 8px', borderRadius: '6px' }}>
                                ATRASADA
                              </span>
                            )}
                          </div>

                          {task.descricao && (
                            <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'var(--text-dim, #94a3b8)', whiteSpace: 'pre-line' }}>
                              {task.descricao}
                            </p>
                          )}

                          {task.prazoFinal && (
                            <small style={{ display: 'block', marginTop: '4px', color: '#94a3b8', fontSize: '0.72rem' }}>
                              <i className="far fa-calendar-times" style={{ marginRight: '4px' }} />
                              Prazo final: <strong>{formatDateBR(task.prazoFinal)}</strong>
                            </small>
                          )}
                        </div>
                      </div>

                      {/* Ações Rápidas (Reagendamento, Edição, Exclusão) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {!isDone && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => quickReschedule(task._id!, 1)}
                              style={{ padding: '5px 8px', fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
                              title="Reagendar para Amanhã (+1 dia)"
                            >
                              +1 dia
                            </button>
                            <button
                              type="button"
                              onClick={() => quickReschedule(task._id!, 3)}
                              style={{ padding: '5px 8px', fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
                              title="Reagendar para daqui a 3 dias"
                            >
                              +3 dias
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => openEditTaskModal(task)}
                          style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: '6px', cursor: 'pointer', fontSize: '0.9rem' }}
                          title="Editar Tarefa"
                        >
                          <i className="fas fa-pencil" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task._id!, task.titulo)}
                          style={{ background: 'transparent', border: 'none', color: '#f87171', padding: '6px', cursor: 'pointer', fontSize: '0.9rem' }}
                          title="Excluir Tarefa"
                        >
                          <i className="fas fa-trash-can" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* B. VISÃO SEMANAL */}
        {currentView === 'semanal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>
                Semana de {formatDateBR(weekDays[0])} a {formatDateBR(weekDays[6])}
              </h3>
              <small style={{ color: 'var(--text-dim, #94a3b8)' }}>{tasks.length} tarefa(s) na semana</small>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
              {weekDays.map(dayStr => {
                const dayTasks = tasksByDate[dayStr] || [];
                const isToday = dayStr === todayBR;
                const diaSemana = getDiaSemanaExtenso(dayStr).split('-')[0];

                return (
                  <div
                    key={dayStr}
                    style={{
                      backgroundColor: '#161f30',
                      border: isToday ? '2px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: '260px',
                      boxShadow: isToday ? '0 0 16px rgba(99, 102, 241, 0.25)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: isToday ? '#a5b4fc' : '#94a3b8', textTransform: 'uppercase' }}>
                          {diaSemana}
                        </div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                          {formatDateBR(dayStr).slice(0, 5)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openNewTaskModal(dayStr)}
                        style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Adicionar tarefa neste dia"
                      >
                        <i className="fas fa-plus" style={{ fontSize: '0.75rem' }} />
                      </button>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
                      {dayTasks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255, 255, 255, 0.2)', fontSize: '0.75rem' }}>
                          Sem tarefas
                        </div>
                      ) : (
                        dayTasks.map(t => {
                          const isDone = t.status === 'concluida';
                          return (
                            <div
                              key={t._id}
                              onClick={() => openEditTaskModal(t)}
                              style={{
                                padding: '8px',
                                borderRadius: '8px',
                                backgroundColor: isDone ? 'rgba(16, 185, 129, 0.1)' : '#0f172a',
                                border: isDone ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                                cursor: 'pointer',
                                transition: 'all 0.12s ease'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isDone ? '#94a3b8' : '#fff', textDecoration: isDone ? 'line-through' : 'none', wordBreak: 'break-word' }}>
                                  {t.titulo}
                                </span>
                              </div>
                              {t.horario && (
                                <div style={{ fontSize: '0.7rem', color: '#38bdf8', marginTop: '2px' }}>
                                  <i className="far fa-clock" style={{ marginRight: '3px' }} />
                                  {t.horario}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* C. VISÃO MENSAL (CALENDÁRIO COM MARCADORES) */}
        {currentView === 'mensal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>
                Calendário Executivo — {new Date(currentYear, currentMonth - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </h3>
              <small style={{ color: 'var(--text-dim, #94a3b8)' }}>Clique em um dia para ver ou adicionar tarefas</small>
            </div>

            {/* Cabeçalho dos Dias da Semana */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center' }}>
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d} style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', padding: '6px 0', textTransform: 'uppercase' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Grade dos Dias do Mês */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {monthCalendarGrid.map(cell => {
                const cellTasks = tasksByDate[cell.dateStr] || [];
                const isToday = cell.dateStr === todayBR;
                const isSelected = cell.dateStr === selectedDate;

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => {
                      setSelectedDate(cell.dateStr);
                      if (cellTasks.length === 0) {
                        openNewTaskModal(cell.dateStr);
                      }
                    }}
                    style={{
                      minHeight: '80px',
                      backgroundColor: cell.isCurrentMonth ? '#161f30' : 'rgba(22, 31, 48, 0.4)',
                      border: isToday ? '2px solid #6366f1' : isSelected ? '1px solid #a5b4fc' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      opacity: cell.isCurrentMonth ? 1 : 0.4,
                      transition: 'all 0.12s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: isToday ? 800 : 600, color: isToday ? '#a5b4fc' : '#fff' }}>
                        {cell.dayNumber}
                      </span>
                      {cellTasks.length > 0 && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, backgroundColor: 'rgba(99, 102, 241, 0.3)', color: '#c7d2fe', padding: '1px 5px', borderRadius: '8px' }}>
                          {cellTasks.length}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
                      {cellTasks.slice(0, 2).map(t => (
                        <div
                          key={t._id}
                          style={{
                            fontSize: '0.68rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            backgroundColor: t.status === 'concluida' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                            color: t.status === 'concluida' ? '#10b981' : '#cbd5e1',
                            padding: '1px 4px',
                            borderRadius: '4px'
                          }}
                        >
                          {t.titulo}
                        </div>
                      ))}
                      {cellTasks.length > 2 && (
                        <span style={{ fontSize: '0.64rem', color: '#94a3b8' }}>
                          +{cellTasks.length - 2} mais
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* D. VISÃO EM LISTA COMPLETA COM FILTROS */}
        {currentView === 'lista' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Barra de Filtros e Busca */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: '1 1 240px', position: 'relative' }}>
                <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por título, nota ou categoria..."
                  style={{
                    width: '100%',
                    backgroundColor: '#161f30',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '8px 12px 8px 34px',
                    color: '#fff',
                    fontSize: '0.86rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Filtro Status */}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                style={{ backgroundColor: '#161f30', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', borderRadius: '8px', padding: '8px 12px', fontSize: '0.84rem', outline: 'none' }}
              >
                <option value="todas">Todos os Status</option>
                <option value="a_fazer">A Fazer</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="concluida">Concluídas</option>
                <option value="atrasadas">Atrasadas</option>
              </select>

              {/* Filtro Prioridade */}
              <select
                value={filterPrioridade}
                onChange={e => setFilterPrioridade(e.target.value)}
                style={{ backgroundColor: '#161f30', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', borderRadius: '8px', padding: '8px 12px', fontSize: '0.84rem', outline: 'none' }}
              >
                <option value="todas">Todas as Prioridades</option>
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>

              {/* Filtro Categoria */}
              <select
                value={filterCategoria}
                onChange={e => setFilterCategoria(e.target.value)}
                style={{ backgroundColor: '#161f30', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', borderRadius: '8px', padding: '8px 12px', fontSize: '0.84rem', outline: 'none' }}
              >
                <option value="todas">Todas as Categorias</option>
                <option value="administrativa">Administrativa</option>
                <option value="financeira">Financeira</option>
                <option value="comercial">Comercial</option>
                <option value="operacional">Operacional</option>
                <option value="pessoal">Pessoal</option>
                <option value="personalizada">Personalizada</option>
              </select>
            </div>

            {/* Lista Tabela de Tarefas */}
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <i className="fas fa-spinner fa-spin fa-2x" />
                <p style={{ marginTop: '10px', fontSize: '0.88rem' }}>Carregando lista...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                <i className="fas fa-filter fa-2x" style={{ opacity: 0.3, marginBottom: '10px' }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Nenhuma tarefa encontrada com os filtros selecionados.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tasks.map(task => {
                  const isDone = task.status === 'concluida';
                  const isAtrasada = !isDone && task.data < todayBR;
                  const catConfig = CATEGORIA_ICONS[task.categoria] || CATEGORIA_ICONS.administrativa;
                  const prioConfig = PRIORIDADE_COLORS[task.prioridade] || PRIORIDADE_COLORS.media;

                  return (
                    <div
                      key={task._id}
                      style={{
                        backgroundColor: '#161f30',
                        border: isAtrasada ? '1px solid rgba(239, 68, 68, 0.4)' : isDone ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        opacity: isDone ? 0.75 : 1
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                        <button
                          type="button"
                          onClick={() => toggleComplete(task)}
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '6px',
                            border: `2px solid ${isDone ? '#10b981' : 'rgba(255, 255, 255, 0.3)'}`,
                            backgroundColor: isDone ? '#10b981' : 'transparent',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          {isDone && <i className="fas fa-check" style={{ fontSize: '0.7rem' }} />}
                        </button>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '0.9rem', color: isDone ? '#94a3b8' : '#fff', textDecoration: isDone ? 'line-through' : 'none' }}>
                              {task.titulo}
                            </strong>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                              <i className="far fa-calendar" style={{ marginRight: '4px' }} />
                              {formatDateBR(task.data)}
                              {task.horario ? ` às ${task.horario}` : ''}
                            </span>
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, backgroundColor: prioConfig.bg, color: prioConfig.text, padding: '2px 6px', borderRadius: '4px' }}>
                              {task.prioridade}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: catConfig.color }}>
                              • {task.categoria}
                            </span>
                          </div>
                          {task.descricao && (
                            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-dim, #94a3b8)' }}>
                              {task.descricao}
                            </p>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => openEditTaskModal(task)}
                          style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: '6px', cursor: 'pointer' }}
                        >
                          <i className="fas fa-pencil" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task._id!, task.titulo)}
                          style={{ background: 'transparent', border: 'none', color: '#f87171', padding: '6px', cursor: 'pointer' }}
                        >
                          <i className="fas fa-trash-can" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      <SavioTaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        taskToEdit={taskEditing}
        initialDate={modalInitialDate}
        onSaved={() => {
          fetchTasks();
          fetchSummary();
        }}
      />
    </div>
  );
}
