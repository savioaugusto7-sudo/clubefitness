'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { smartSearchMatch } from '@/utils/smartSearch';
import SearchableSelect from './SearchableSelect';
import SmartSearchInput from './SmartSearchInput';
import Pagination from './Pagination';
import { getContractValidityInfo } from '@/utils/contractValidity';

interface HorariosFixosPanelProps {
  fixedSchedules: any[];
  clients: any[];
  professionals: any[];
  contractsList?: any[];
  onRefresh: () => void | Promise<void>;
  readOnly?: boolean;
  defaultAgendaFilter?: string;
}

const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAYS_FULL = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

const STANDARD_HOURS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00'
];

export default function HorariosFixosPanel({
  fixedSchedules = [],
  clients = [],
  professionals = [],
  contractsList = [],
  onRefresh,
  readOnly = false,
  defaultAgendaFilter = 'todas'
}: HorariosFixosPanelProps) {
  // --- Estados de Visualização & Filtros ---
  const [viewMode, setViewMode] = useState<'tabela' | 'grade'>('tabela');
  const [searchQuery, setSearchQuery] = useState('');
  const [agendaFilter, setAgendaFilter] = useState<string>(defaultAgendaFilter);
  const [dayFilter, setDayFilter] = useState<number | 'todos'>('todos');
  const [serviceFilter, setServiceFilter] = useState<string>('todos');

  // Paginação da Tabela
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // --- Estados do Modal de Criação / Edição ---
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any | null>(null);

  const [modalClient, setModalClient] = useState('');
  const [modalProf, setModalProf] = useState('');
  const [modalService, setModalService] = useState('Treino Monitorado');
  const [modalStartDate, setModalStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [modalDurationType, setModalDurationType] = useState<'contrato' | 'indeterminado' | 'manual'>('contrato');
  const [modalManualEndDate, setModalManualEndDate] = useState('');

  // Modo de horários: 'uniforme' (mesmo horário para os dias escolhidos) ou 'individual' (horário por dia)
  const [scheduleMode, setScheduleMode] = useState<'uniforme' | 'individual'>('uniforme');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]); // Seg, Qua, Sex
  const [uniformTime, setUniformTime] = useState('08:00');
  const [dayTimesMap, setDayTimesMap] = useState<Record<number, string>>({
    1: '08:00',
    2: '08:00',
    3: '08:00',
    4: '08:00',
    5: '08:00',
    6: '08:00'
  });

  // Validação de vagas / conflitos para os horários selecionados
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsData, setSlotsData] = useState<any[]>([]);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Sincronização em massa
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Modal de Impressão / Exportação
  const [showPrintModal, setShowPrintModal] = useState(false);

  // --- Profissionais Médicos Mapeados ---
  const albertProf = useMemo(() => {
    return professionals.find(p => (p.nome || '').toLowerCase().includes('albert'));
  }, [professionals]);

  const guilhermeProf = useMemo(() => {
    return professionals.find(p => (p.nome || '').toLowerCase().includes('guilherme'));
  }, [professionals]);

  // --- Agrupamento das Regras por Aluno + Agenda ---
  const groupedRules = useMemo(() => {
    const map: Record<string, { client: any; professional: any; rules: any[]; servico: string; dataInicio: string; dataFim: string | null }> = {};

    for (const fs of fixedSchedules) {
      const cId = fs.clienteId?._id || fs.clienteId || 'sem_aluno';
      const pId = fs.profissionalId?._id || fs.profissionalId || 'geral';
      const groupKey = `${cId}_${pId}`;

      if (!map[groupKey]) {
        map[groupKey] = {
          client: fs.clienteId,
          professional: fs.profissionalId,
          rules: [],
          servico: fs.servico,
          dataInicio: fs.dataInicio,
          dataFim: fs.dataFim || null
        };
      }
      map[groupKey].rules.push(fs);
    }

    return Object.values(map);
  }, [fixedSchedules]);

  // Lista de Serviços Únicos para Filtro
  const availableServices = useMemo(() => {
    const set = new Set<string>();
    fixedSchedules.forEach(fs => {
      if (fs.servico) set.add(fs.servico);
    });
    return Array.from(set).sort();
  }, [fixedSchedules]);

  // --- Filtragem Multidimensional ---
  const filteredGroups = useMemo(() => {
    return groupedRules.filter(g => {
      // 1. Filtro de Agenda / Profissional
      if (agendaFilter === 'albert') {
        const pNome = (g.professional?.nome || '').toLowerCase();
        if (!pNome.includes('albert')) return false;
      } else if (agendaFilter === 'guilherme') {
        const pNome = (g.professional?.nome || '').toLowerCase();
        if (!pNome.includes('guilherme')) return false;
      } else if (agendaFilter === 'geral') {
        if (g.professional) return false;
      } else if (agendaFilter !== 'todas') {
        const pId = g.professional?._id || g.professional;
        if (pId !== agendaFilter) return false;
      }

      // 2. Filtro de Dia da Semana
      if (dayFilter !== 'todos') {
        const hasDay = g.rules.some(r => Number(r.diaSemana) === Number(dayFilter));
        if (!hasDay) return false;
      }

      // 3. Filtro de Serviço
      if (serviceFilter !== 'todos') {
        if (g.servico !== serviceFilter) return false;
      }

      // 4. Busca Inteligente (Nome, CPF, Telefone, Dia, Horário, Serviço)
      if (searchQuery.trim()) {
        const nome = g.client?.dadosPessoais?.nome || g.client?.nome || '';
        const cpf = g.client?.dadosPessoais?.cpf || '';
        const telefone = g.client?.dadosPessoais?.telefone || '';
        const servico = g.servico || '';
        const profNome = g.professional?.nome || 'Treino Geral';
        const daysText = g.rules
          .map(r => `${DAYS_SHORT[r.diaSemana] || ''} ${DAYS_FULL[r.diaSemana] || ''} ${r.horario || ''}`)
          .join(' ');

        return smartSearchMatch([nome, cpf, telefone, servico, profNome, daysText], searchQuery);
      }

      return true;
    });
  }, [groupedRules, agendaFilter, dayFilter, serviceFilter, searchQuery]);

  // Paginação
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredGroups.slice(start, start + pageSize);
  }, [filteredGroups, currentPage, pageSize]);

  // --- Contadores dos Top KPIs ---
  const kpis = useMemo(() => {
    const totalRegras = fixedSchedules.length;
    const uniqueClients = new Set(fixedSchedules.map(fs => fs.clienteId?._id || fs.clienteId)).size;

    const countAlbert = fixedSchedules.filter(fs => {
      const pNome = (fs.profissionalId?.nome || '').toLowerCase();
      return pNome.includes('albert');
    }).length;

    const countGuilherme = fixedSchedules.filter(fs => {
      const pNome = (fs.profissionalId?.nome || '').toLowerCase();
      return pNome.includes('guilherme');
    }).length;

    const countGeral = fixedSchedules.filter(fs => !fs.profissionalId).length;

    return { totalRegras, uniqueClients, countAlbert, countGuilherme, countGeral };
  }, [fixedSchedules]);

  // --- Efeito: Consultar disponibilidade / vagas e conflitos ao mudar parâmetros no Modal ---
  useEffect(() => {
    if (!showModal) return;

    let isMounted = true;
    const checkAvailability = async () => {
      setSlotsLoading(true);
      try {
        const pIdParam = modalProf || '';
        const servParam = modalService || 'Treino Monitorado';
        const dateParam = modalStartDate || new Date().toISOString().split('T')[0];

        const daysParam = selectedDays.join(',');
        const queryParams = new URLSearchParams({
          date: dateParam,
          service: servParam,
          daysOfWeek: daysParam
        });
        if (pIdParam) queryParams.set('profissionalId', pIdParam);

        const res = await fetch(`/api/appointments/slots?${queryParams.toString()}`);
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.data)) {
          setSlotsData(data.data);
        }
      } catch (err) {
        console.error('Erro ao verificar disponibilidade de slots:', err);
      } finally {
        if (isMounted) setSlotsLoading(false);
      }
    };

    checkAvailability();

    return () => {
      isMounted = false;
    };
  }, [showModal, modalProf, modalService, modalStartDate, selectedDays]);

  // --- Abertura do Modal para Novo Horário Fixo ---
  const handleOpenNewModal = (prefillDay?: number, prefillTime?: string) => {
    setEditingGroup(null);
    setModalClient('');
    setModalProf('');
    setModalService('Treino Monitorado');
    setModalStartDate(new Date().toISOString().split('T')[0]);
    setModalDurationType('contrato');
    setModalManualEndDate('');
    setScheduleMode('uniforme');

    if (prefillDay !== undefined) {
      setSelectedDays([prefillDay]);
    } else {
      setSelectedDays([1, 3, 5]);
    }

    if (prefillTime) {
      setUniformTime(prefillTime);
      setDayTimesMap(prev => ({ ...prev, [prefillDay || 1]: prefillTime }));
    } else {
      setUniformTime('08:00');
    }

    setShowModal(true);
  };

  // --- Abertura do Modal para Editar Regras de um Aluno ---
  const handleOpenEditModal = (group: any) => {
    setEditingGroup(group);
    setModalClient(group.client?._id || group.client || '');
    setModalProf(group.professional?._id || group.professional || '');
    setModalService(group.servico || 'Treino Monitorado');
    setModalStartDate(group.dataInicio || new Date().toISOString().split('T')[0]);

    if (group.dataFim) {
      setModalDurationType('manual');
      setModalManualEndDate(group.dataFim);
    } else {
      setModalDurationType('indeterminado');
      setModalManualEndDate('');
    }

    // Configurar dias e horários
    const days: number[] = [];
    const newTimesMap: Record<number, string> = { ...dayTimesMap };
    let firstTime = '08:00';
    let allSame = true;

    group.rules.forEach((r: any, idx: number) => {
      const d = Number(r.diaSemana);
      days.push(d);
      newTimesMap[d] = r.horario || '08:00';
      if (idx === 0) firstTime = r.horario;
      else if (r.horario !== firstTime) allSame = false;
    });

    setSelectedDays(days.sort());
    setDayTimesMap(newTimesMap);
    setUniformTime(firstTime);
    setScheduleMode(allSame ? 'uniforme' : 'individual');

    setShowModal(true);
  };

  // --- Salvar Regras (Criar ou Atualizar) ---
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingSchedule) return;

    if (!modalClient) {
      alert('Por favor, selecione o aluno.');
      return;
    }

    if (selectedDays.length === 0) {
      alert('Selecione pelo menos um dia da semana.');
      return;
    }

    setSavingSchedule(true);

    try {
      // 1. Resolver a data de vigência final
      let finalEndDate: string | null = null;

      if (modalDurationType === 'contrato') {
        const selClientObj = clients.find(c => c._id === modalClient);
        const com = selClientObj?.dadosComerciais || {};
        const hasRecurrence = Boolean(com.criarRecorrenciaMensal);

        if (hasRecurrence) {
          finalEndDate = null; // Modo contínuo recorrente
        } else if (com.vencimento && com.vencimento >= modalStartDate) {
          finalEndDate = com.vencimento;
        } else {
          // Consultar vigência do contrato
          const valInfo = getContractValidityInfo(selClientObj, undefined, contractsList);
          if (valInfo && valInfo.dataFim && valInfo.dataFim >= modalStartDate) {
            finalEndDate = valInfo.dataFim;
          }
        }
      } else if (modalDurationType === 'manual') {
        if (!modalManualEndDate) {
          alert('Por favor, informe a data final de término da regra.');
          setSavingSchedule(false);
          return;
        }
        finalEndDate = modalManualEndDate;
      } else {
        // Indeterminado / Contínuo
        finalEndDate = null;
      }

      // 2. Montar array de slots
      const slots = selectedDays.map(day => {
        const horario = scheduleMode === 'uniforme' ? uniformTime : (dayTimesMap[day] || uniformTime);
        return {
          diaSemana: Number(day),
          horario
        };
      });

      // 3. Enviar para a API (POST ou PUT)
      let res;
      if (editingGroup) {
        // Atualização em lote das regras do aluno
        res = await fetch('/api/fixed-schedules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clienteId: modalClient,
            oldProfessionalId: editingGroup.professional?._id || editingGroup.professional || null,
            profissionalId: modalProf || null,
            slots,
            servico: modalService,
            dataInicio: modalStartDate,
            dataFim: finalEndDate
          })
        });
      } else {
        // Criação de novas regras
        res = await fetch('/api/fixed-schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clienteId: modalClient,
            profissionalId: modalProf || null,
            slots,
            servico: modalService,
            dataInicio: modalStartDate,
            duracaoSemanas: null,
            dataFim: finalEndDate
          })
        });
      }

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        if (onRefresh) await onRefresh();
      } else {
        alert('Erro ao salvar horários fixos: ' + (data.error || 'Falha na requisição'));
      }
    } catch (err: any) {
      alert('Erro de conexão ao salvar: ' + err.message);
    } finally {
      setSavingSchedule(false);
    }
  };

  // --- Excluir Slot Individual ---
  const handleDeleteSingleSlot = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Deseja excluir este horário fixo específico?')) return;

    try {
      const res = await fetch(`/api/fixed-schedules?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        if (onRefresh) await onRefresh();
      } else {
        alert('Erro ao excluir: ' + data.error);
      }
    } catch (err) {
      alert('Erro de rede ao excluir horário.');
    }
  };

  // --- Excluir Todas as Regras do Aluno ---
  const handleDeleteAllGroupRules = async (clientId: string, clientName: string) => {
    if (!confirm(`Tem certeza que deseja remover TODOS os horários fixos de ${clientName}? Os agendamentos futuros correspondentes também serão removidos.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/fixed-schedules?clientId=${clientId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        if (onRefresh) await onRefresh();
      } else {
        alert('Erro ao excluir regras: ' + data.error);
      }
    } catch (err) {
      alert('Erro de rede ao excluir regras.');
    }
  };

  // --- Sincronizar Todas as Regras com a Grade ---
  const handleSyncAllRules = async () => {
    if (!confirm('Deseja sincronizar e recalcular todas as regras de horários fixos com a grade de agendamentos reais?')) {
      return;
    }

    setIsSyncingAll(true);
    try {
      const res = await fetch('/api/fixed-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncAll: true })
      });
      const data = await res.json();
      if (data.success) {
        alert('Sincronização concluída com sucesso! Todas as regras foram propagadas na grade da agenda.');
        if (onRefresh) await onRefresh();
      } else {
        alert('Erro ao sincronizar: ' + data.error);
      }
    } catch (err) {
      alert('Erro de rede ao sincronizar regras.');
    } finally {
      setIsSyncingAll(false);
    }
  };

  return (
    <div className="horarios-fixos-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. Header com Título e Ações Globais */}
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div className="view-title-group">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.6rem', fontWeight: 800 }}>
            <i className="fa-solid fa-thumbtack" style={{ color: 'var(--color-primary)' }}></i>
            Regras de Horários Fixos
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Gerencie as reservas semanais recorrentes dos alunos nas agendas de treino e consultas especializadas.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowPrintModal(true)}
            title="Visualizar e Imprimir a Grade Semanal de Horários Fixos"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, padding: '9px 15px' }}
          >
            <i className="fa-solid fa-print"></i>
            Grade para Impressão
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleSyncAllRules}
            disabled={isSyncingAll}
            title="Sincronizar todas as regras com a grade real de agendamentos"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, padding: '9px 15px' }}
          >
            <i className={`fa-solid fa-arrows-rotate ${isSyncingAll ? 'fa-spin' : ''}`}></i>
            {isSyncingAll ? 'Sincronizando...' : 'Sincronizar Grade'}
          </button>

          {!readOnly && (
            <button
              className="btn btn-primary"
              onClick={() => handleOpenNewModal()}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 750, padding: '9px 18px' }}
            >
              <i className="fa-solid fa-plus"></i>
              Novo Horário Fixo
            </button>
          )}
        </div>
      </div>

      {/* 2. Top KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div className="metric-card" style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>TOTAL DE REGRAS</span>
            <i className="fa-solid fa-calendar-check" style={{ color: 'var(--color-primary)' }}></i>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px', color: 'var(--text-main)' }}>
            {kpis.totalRegras}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Slots semanais fixados
          </div>
        </div>

        <div className="metric-card" style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>ALUNOS COM HORÁRIO FIXO</span>
            <i className="fa-solid fa-users" style={{ color: '#60a5fa' }}></i>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px', color: '#60a5fa' }}>
            {kpis.uniqueClients}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Alunos com reserva garantida
          </div>
        </div>

        <div className="metric-card" style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>TREINO / GERAL</span>
            <i className="fa-solid fa-dumbbell" style={{ color: '#34d399' }}></i>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px', color: '#34d399' }}>
            {kpis.countGeral}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Grade principal da academia
          </div>
        </div>

        <div className="metric-card" style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
            <span>CONSULTÓRIOS / ESPECIALISTAS</span>
            <i className="fa-solid fa-user-doctor" style={{ color: '#c084fc' }}></i>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px', color: '#c084fc' }}>
            {kpis.countAlbert + kpis.countGuilherme}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Albert ({kpis.countAlbert}) | Guilherme ({kpis.countGuilherme})
          </div>
        </div>
      </div>

      {/* 3. Barra de Controles: Busca Inteligente, Filtros e Alternador de Visão */}
      <div style={{
        background: 'var(--bg-darker)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          
          {/* Busca Inteligente */}
          <div style={{ flex: '1 1 320px', minWidth: '260px' }}>
            <SmartSearchInput
              placeholder="Buscar por aluno, CPF, serviço, dia ou horário..."
              value={searchQuery}
              onChange={setSearchQuery}
              resultCount={filteredGroups.length}
              totalCount={groupedRules.length}
            />
          </div>

          {/* Alternador de Visualização (Tabela vs Grade Semanal) */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setViewMode('tabela')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'tabela' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'tabela' ? '#fff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <i className="fa-solid fa-list-ul"></i>
              Tabela
            </button>
            <button
              onClick={() => setViewMode('grade')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'grade' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'grade' ? '#fff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
            >
              <i className="fa-solid fa-calendar-days"></i>
              Grade Semanal
            </button>
          </div>
        </div>

        {/* Filtros Rápidos (Agenda, Dia da Semana, Serviço) */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          
          {/* Pills de Agenda */}
          <button
            className={`btn btn-sm ${agendaFilter === 'todas' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '8px', fontWeight: 700 }}
            onClick={() => setAgendaFilter('todas')}
          >
            Todas as Agendas ({fixedSchedules.length})
          </button>

          <button
            className={`btn btn-sm ${agendaFilter === 'geral' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}
            onClick={() => setAgendaFilter('geral')}
          >
            <span>🏋️ Treino / Geral</span>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '1px 6px', borderRadius: '10px', fontSize: '0.72rem' }}>
              {kpis.countGeral}
            </span>
          </button>

          {albertProf && (
            <button
              className={`btn btn-sm ${agendaFilter === 'albert' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}
              onClick={() => setAgendaFilter('albert')}
            >
              <span>🩺 Dr. Albert</span>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '1px 6px', borderRadius: '10px', fontSize: '0.72rem' }}>
                {kpis.countAlbert}
              </span>
            </button>
          )}

          {guilhermeProf && (
            <button
              className={`btn btn-sm ${agendaFilter === 'guilherme' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}
              onClick={() => setAgendaFilter('guilherme')}
            >
              <span>🩺 Dr. Guilherme</span>
              <span style={{ background: 'rgba(255,255,255,0.2)', padding: '1px 6px', borderRadius: '10px', fontSize: '0.72rem' }}>
                {kpis.countGuilherme}
              </span>
            </button>
          )}

          <div style={{ height: '24px', width: '1px', background: 'var(--border-color)', margin: '0 4px' }} />

          {/* Filtro de Dia da Semana */}
          <select
            className="select-custom"
            value={dayFilter}
            onChange={e => setDayFilter(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
            style={{ padding: '6px 12px', fontSize: '0.82rem', width: 'auto', minWidth: '150px' }}
          >
            <option value="todos">Todos os Dias</option>
            <option value="1">Segunda-feira</option>
            <option value="2">Terça-feira</option>
            <option value="3">Quarta-feira</option>
            <option value="4">Quinta-feira</option>
            <option value="5">Sexta-feira</option>
            <option value="6">Sábado</option>
          </select>

          {/* Filtro de Serviço */}
          {availableServices.length > 1 && (
            <select
              className="select-custom"
              value={serviceFilter}
              onChange={e => setServiceFilter(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '0.82rem', width: 'auto', minWidth: '160px' }}
            >
              <option value="todos">Todos os Serviços</option>
              {availableServices.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}

          {(agendaFilter !== 'todas' || dayFilter !== 'todos' || serviceFilter !== 'todos' || searchQuery.trim()) && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setAgendaFilter('todas');
                setDayFilter('todos');
                setServiceFilter('todos');
                setSearchQuery('');
              }}
              style={{ color: '#ef4444', fontSize: '0.78rem', padding: '6px 10px' }}
            >
              <i className="fa-solid fa-xmark" style={{ marginRight: '4px' }}></i> Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* 4. Visualização 1: MODO TABELA INTELIGENTE */}
      {viewMode === 'tabela' && (
        <div className="content-panel" style={{ padding: 0, overflow: 'hidden', borderRadius: '12px' }}>
          <div className="table-responsive">
            <table className="data-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '220px' }}>Aluno</th>
                  <th style={{ minWidth: '160px' }}>Agenda / Profissional</th>
                  <th style={{ minWidth: '260px' }}>Dias & Horários Fixados</th>
                  <th style={{ minWidth: '160px' }}>Serviço</th>
                  <th style={{ minWidth: '170px' }}>Vigência da Regra</th>
                  <th style={{ minWidth: '130px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedGroups.map(group => {
                  const clientName = group.client?.dadosPessoais?.nome || group.client?.nome || 'Aluno sem nome';
                  const clientCpf = group.client?.dadosPessoais?.cpf || '';
                  const clientPhone = group.client?.dadosPessoais?.telefone || '';
                  const prof = group.professional;

                  return (
                    <tr key={`${group.client?._id || Math.random()}_${prof?._id || 'geral'}`}>
                      {/* Aluno com nome em destaque */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '0.96rem', color: 'var(--text-main)', letterSpacing: '0.2px' }}>
                              {clientName}
                            </strong>
                            {clientPhone && (
                              <a
                                href={`https://wa.me/55${clientPhone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                title={`Conversar no WhatsApp (${clientPhone})`}
                                style={{ color: '#22c55e', fontSize: '0.85rem' }}
                              >
                                <i className="fa-brands fa-whatsapp"></i>
                              </a>
                            )}
                          </div>
                          {clientCpf && (
                            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                              CPF: {clientCpf}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Agenda / Profissional */}
                      <td>
                        {prof ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: (prof.nome || '').toLowerCase().includes('albert')
                                ? 'rgba(59, 130, 246, 0.15)'
                                : (prof.nome || '').toLowerCase().includes('guilherme')
                                ? 'rgba(168, 85, 247, 0.15)'
                                : 'rgba(16, 185, 129, 0.15)',
                              color: (prof.nome || '').toLowerCase().includes('albert')
                                ? '#60a5fa'
                                : (prof.nome || '').toLowerCase().includes('guilherme')
                                ? '#c084fc'
                                : '#34d399',
                              border: '1px solid currentColor',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '0.78rem',
                              fontWeight: 750
                            }}
                          >
                            <i className="fa-solid fa-user-doctor"></i> {prof.nome}
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: 'rgba(107, 114, 128, 0.15)',
                              color: '#9ca3af',
                              border: '1px solid rgba(107, 114, 128, 0.3)',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '0.78rem',
                              fontWeight: 700
                            }}
                          >
                            <i className="fa-solid fa-dumbbell"></i> Treino / Geral
                          </span>
                        )}
                      </td>

                      {/* Dias e Horários Fixados */}
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {group.rules.map(r => (
                            <span
                              key={r._id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                background: 'rgba(16, 185, 129, 0.12)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: '16px',
                                color: '#10b981',
                                fontSize: '0.8rem',
                                fontWeight: 700
                              }}
                            >
                              <i className="fa-solid fa-clock" style={{ fontSize: '0.72rem' }}></i>
                              {DAYS_SHORT[r.diaSemana]} {r.horario}
                              {!readOnly && (
                                <button
                                  onClick={e => handleDeleteSingleSlot(r._id, e)}
                                  title="Excluir este horário específico"
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    padding: '0 0 0 4px',
                                    fontSize: '0.9rem',
                                    lineHeight: 1
                                  }}
                                >
                                  &times;
                                </button>
                              )}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Serviço */}
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.88rem' }}>
                          {group.servico || 'Treino Monitorado'}
                        </span>
                      </td>

                      {/* Vigência da Regra */}
                      <td>
                        <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                          {group.dataInicio ? group.dataInicio.split('-').reverse().join('/') : ''}
                          {' '}
                          {group.dataFim
                            ? `até ${group.dataFim.split('-').reverse().join('/')}`
                            : '(Indeterminado / Contínuo)'}
                        </span>
                      </td>

                      {/* Ações da Linha */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                          {!readOnly && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenEditModal(group)}
                              title="Editar regras deste aluno (dias, horários, vigência)"
                              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                            </button>
                          )}
                          {!readOnly && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteAllGroupRules(group.client?._id, clientName)}
                              title="Excluir Todos os Horários deste Aluno"
                              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredGroups.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state-card" style={{ padding: '40px 20px', textAlign: 'center' }}>
                        <i className="fa-solid fa-calendar-xmark empty-state-icon" style={{ fontSize: '2.5rem', color: 'var(--text-muted)', marginBottom: '10px' }}></i>
                        <div className="empty-state-title" style={{ fontSize: '1.1rem', fontWeight: 700 }}>Nenhum horário fixo encontrado</div>
                        <div className="empty-state-desc" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          Não foram encontradas regras correspondentes aos filtros selecionados.
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {filteredGroups.length > pageSize && (
            <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Mostrando {paginatedGroups.length} de {filteredGroups.length} alunos com horários fixos
              </div>
              <Pagination
                currentPage={currentPage}
                totalItems={filteredGroups.length}
                itemsPerPage={pageSize}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {/* 5. Visualização 2: MODO GRADE SEMANAL INTERATIVA */}
      {viewMode === 'grade' && (
        <div className="content-panel" style={{ padding: '16px', borderRadius: '12px', overflowX: 'auto' }}>
          <div style={{ minWidth: '950px' }}>
            
            {/* Cabeçalho dos Dias (Seg a Sáb) */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(6, 1fr)', gap: '8px', marginBottom: '8px' }}>
              <div style={{ textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.85rem', padding: '8px 0' }}>
                Horário
              </div>
              {[1, 2, 3, 4, 5, 6].map(day => (
                <div
                  key={day}
                  style={{
                    background: 'var(--bg-darker)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    textAlign: 'center',
                    padding: '8px 4px',
                    fontWeight: 750,
                    fontSize: '0.9rem',
                    color: 'var(--text-main)'
                  }}
                >
                  {DAYS_FULL[day]}
                </div>
              ))}
            </div>

            {/* Linhas de Horários */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {STANDARD_HOURS.map(hour => {
                return (
                  <div key={hour} style={{ display: 'grid', gridTemplateColumns: '80px repeat(6, 1fr)', gap: '8px' }}>
                    
                    {/* Faixa de Horário */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '0.92rem',
                        color: 'var(--color-primary)'
                      }}
                    >
                      {hour}
                    </div>

                    {/* Células dos Dias (Seg a Sáb) */}
                    {[1, 2, 3, 4, 5, 6].map(day => {
                      // Alunos fixados neste dia e horário que atendem aos filtros ativos
                      const matchingRules = fixedSchedules.filter(fs => {
                        if (Number(fs.diaSemana) !== day) return false;
                        if (fs.horario !== hour) return false;

                        // Filtro de Agenda
                        if (agendaFilter === 'albert') {
                          const pNome = (fs.profissionalId?.nome || '').toLowerCase();
                          if (!pNome.includes('albert')) return false;
                        } else if (agendaFilter === 'guilherme') {
                          const pNome = (fs.profissionalId?.nome || '').toLowerCase();
                          if (!pNome.includes('guilherme')) return false;
                        } else if (agendaFilter === 'geral') {
                          if (fs.profissionalId) return false;
                        } else if (agendaFilter !== 'todas') {
                          const pId = fs.profissionalId?._id || fs.profissionalId;
                          if (pId !== agendaFilter) return false;
                        }

                        // Filtro de Serviço
                        if (serviceFilter !== 'todos' && fs.servico !== serviceFilter) return false;

                        // Busca Inteligente
                        if (searchQuery.trim()) {
                          const nome = fs.clienteId?.dadosPessoais?.nome || fs.clienteId?.nome || '';
                          const cpf = fs.clienteId?.dadosPessoais?.cpf || '';
                          const servico = fs.servico || '';
                          return smartSearchMatch([nome, cpf, servico], searchQuery);
                        }

                        return true;
                      });

                      const count = matchingRules.length;

                      return (
                        <div
                          key={day}
                          style={{
                            background: count > 0 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.015)',
                            border: count > 0 ? '1px solid var(--border-color)' : '1px dashed rgba(255,255,255,0.08)',
                            borderRadius: '8px',
                            minHeight: '72px',
                            padding: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            position: 'relative',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {/* Header da Célula com Contagem e Botão de Adicionar */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                color: count >= 6 ? '#ef4444' : count >= 3 ? '#f59e0b' : count > 0 ? '#10b981' : 'var(--text-muted)'
                              }}
                            >
                              {count} {count === 1 ? 'aluno' : 'alunos'}
                            </span>
                            {!readOnly && (
                              <button
                                onClick={() => handleOpenNewModal(day, hour)}
                                title={`Fixar aluno em ${DAYS_FULL[day]} às ${hour}`}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--color-primary)',
                                  cursor: 'pointer',
                                  fontSize: '0.78rem',
                                  padding: '1px 4px',
                                  opacity: 0.7
                                }}
                              >
                                <i className="fa-solid fa-plus"></i>
                              </button>
                            )}
                          </div>

                          {/* Lista de Alunos na Célula */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '110px', overflowY: 'auto' }}>
                            {matchingRules.map(fs => {
                              const cName = fs.clienteId?.dadosPessoais?.nome || fs.clienteId?.nome || 'Aluno';
                              const isAlbert = (fs.profissionalId?.nome || '').toLowerCase().includes('albert');
                              const isGuilherme = (fs.profissionalId?.nome || '').toLowerCase().includes('guilherme');

                              return (
                                <div
                                  key={fs._id}
                                  onClick={() => {
                                    const group = groupedRules.find(g => {
                                      const cId = g.client?._id || g.client;
                                      const targetCid = fs.clienteId?._id || fs.clienteId;
                                      return cId === targetCid;
                                    });
                                    if (group) handleOpenEditModal(group);
                                  }}
                                  title={`${cName} - ${fs.servico} (Clique para editar)`}
                                  style={{
                                    fontSize: '0.74rem',
                                    fontWeight: 650,
                                    padding: '3px 6px',
                                    borderRadius: '5px',
                                    background: isAlbert
                                      ? 'rgba(59, 130, 246, 0.15)'
                                      : isGuilherme
                                      ? 'rgba(168, 85, 247, 0.15)'
                                      : 'rgba(16, 185, 129, 0.12)',
                                    color: isAlbert ? '#60a5fa' : isGuilherme ? '#c084fc' : '#34d399',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {cName}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL DINÂMICO DE CRIAÇÃO & EDIÇÃO (Multi-Horário Flexível com Conflitos) */}
      {showModal && (
        <div
          className="modal-overlay"
          style={{ display: 'flex', zIndex: 100000, padding: '16px', overflowY: 'auto' }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '560px',
              width: '95%',
              maxHeight: 'calc(100vh - 32px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderRadius: '14px'
            }}
          >
            {/* Modal Header */}
            <div
              className="modal-header"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                color: '#fff',
                padding: '16px 20px',
                flexShrink: 0
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-thumbtack"></i>
                {editingGroup ? 'Editar Regras de Horários Fixos' : 'Novo Horário Fixo'}
              </h3>
              <button className="modal-close" style={{ color: '#fff' }} onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={handleSaveSchedule}
              style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, overflow: 'hidden', margin: 0 }}
            >
              <div className="modal-body" style={{ padding: '20px', overflowY: 'auto', flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Seleção do Aluno */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                    Aluno / Cliente <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <SearchableSelect
                    options={clients.map(c => ({
                      value: c._id,
                      label: `${c.dadosPessoais?.nome || c.nome || 'Sem Nome'} (${c.dadosPessoais?.cpf || 'Sem CPF'})`
                    }))}
                    value={modalClient}
                    onChange={setModalClient}
                    placeholder="Selecione o aluno..."
                    required
                  />
                </div>

                {/* Seleção da Agenda / Profissional Responsável */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                    Agenda / Profissional Responsável
                  </label>
                  <select
                    className="select-custom"
                    value={modalProf}
                    onChange={e => {
                      const pId = e.target.value;
                      setModalProf(pId);
                      const pObj = professionals.find(p => p._id === pId);
                      if (pObj) {
                        const pName = (pObj.nome || '').toLowerCase();
                        if (pName.includes('albert') || pName.includes('guilherme') || (pObj.especialidade || '').toLowerCase().includes('fisio')) {
                          setModalService('Avaliação Fisioterápica');
                        }
                      } else {
                        setModalService('Treino Monitorado');
                      }
                    }}
                  >
                    <option value="">🏋️ Treino Monitorado / Geral (Academia)</option>
                    {professionals
                      .filter(p => {
                        const name = (p.nome || '').toLowerCase();
                        return name.includes('guilherme') || name.includes('albert') || (p.especialidade || '').toLowerCase().includes('fisio');
                      })
                      .map(p => (
                        <option key={p._id} value={p._id}>
                          🩺 {p.nome} {p.especialidade ? `(${p.especialidade})` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Serviço e Data de Início */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                      Serviço <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      className="select-custom"
                      value={modalService}
                      onChange={e => setModalService(e.target.value)}
                    >
                      {modalProf ? (
                        <>
                          <option value="Avaliação Fisioterápica">Avaliação Fisioterápica</option>
                          <option value="Sessão de Fisioterapia">Sessão de Fisioterapia</option>
                          <option value="Quiropraxia">Quiropraxia</option>
                          <option value="Recovery / Bota">Recovery / Bota</option>
                          <option value="Atendimento Individual">Atendimento Individual</option>
                          <option value="Treino Monitorado">Treino Monitorado</option>
                        </>
                      ) : (
                        <>
                          <option value="Treino Monitorado">Treino Monitorado</option>
                          <option value="Pilates">Pilates</option>
                          <option value="Funcional">Funcional</option>
                          <option value="Avaliação Física">Avaliação Física</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                      Data de Início <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={modalStartDate}
                      onChange={e => setModalStartDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Seleção de Dias da Semana */}
                <div className="form-group" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>
                      Dias da Semana Fixados <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    
                    {/* Alternador de Modo de Horários */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setScheduleMode('uniforme')}
                        style={{
                          background: scheduleMode === 'uniforme' ? 'var(--color-primary)' : 'rgba(0,0,0,0.2)',
                          color: scheduleMode === 'uniforme' ? '#fff' : 'var(--text-muted)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          padding: '3px 8px',
                          cursor: 'pointer',
                          fontWeight: 650
                        }}
                      >
                        Horário Único
                      </button>
                      <button
                        type="button"
                        onClick={() => setScheduleMode('individual')}
                        style={{
                          background: scheduleMode === 'individual' ? 'var(--color-primary)' : 'rgba(0,0,0,0.2)',
                          color: scheduleMode === 'individual' ? '#fff' : 'var(--text-muted)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          padding: '3px 8px',
                          cursor: 'pointer',
                          fontWeight: 650
                        }}
                      >
                        Horário por Dia
                      </button>
                    </div>
                  </div>

                  {/* Pills dos Dias da Semana */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[
                      { day: 1, label: 'Segunda-feira' },
                      { day: 2, label: 'Terça-feira' },
                      { day: 3, label: 'Quarta-feira' },
                      { day: 4, label: 'Quinta-feira' },
                      { day: 5, label: 'Sexta-feira' },
                      { day: 6, label: 'Sábado' }
                    ].map(({ day, label }) => {
                      const isSelected = selectedDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedDays(selectedDays.filter(d => d !== day));
                            } else {
                              setSelectedDays([...selectedDays, day].sort());
                            }
                          }}
                          style={{
                            padding: '8px 4px',
                            borderRadius: '8px',
                            border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                            background: isSelected ? 'rgba(0, 184, 148, 0.15)' : 'var(--bg-darker)',
                            color: isSelected ? 'var(--color-primary)' : 'var(--text-muted)',
                            fontWeight: isSelected ? 700 : 500,
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <i className={isSelected ? 'fa-solid fa-square-check' : 'fa-regular fa-square'}></i>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Seleção de Horários (Modo Uniforme ou Individual) */}
                {scheduleMode === 'uniforme' ? (
                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>
                        Horário Desejado (para todos os {selectedDays.length} dias)
                      </label>
                      <span style={{ fontSize: '0.75rem', color: slotsLoading ? 'var(--color-primary)' : '#10b981' }}>
                        {slotsLoading ? <><i className="fa-solid fa-spinner fa-spin"></i> Verificando vagas...</> : <><i className="fa-solid fa-check"></i> Vagas verificadas</>}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', gap: '6px', maxHeight: '150px', overflowY: 'auto', padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      {STANDARD_HOURS.map(hour => {
                        const slotObj = slotsData.find(s => s.horario === hour);
                        const minVagas = slotObj?.minVagasLivres !== undefined ? slotObj.minVagasLivres : Math.max(0, (slotObj?.capacidade || 8) - (slotObj?.vagasOcupadas || 0));
                        const hasConflicts = slotObj?.conflitos && slotObj.conflitos.length > 0;
                        const isSelected = uniformTime === hour;

                        return (
                          <button
                            key={hour}
                            type="button"
                            onClick={() => setUniformTime(hour)}
                            style={{
                              borderRadius: '8px',
                              padding: '8px 4px',
                              border: isSelected ? '2px solid var(--color-primary)' : hasConflicts ? '1px solid rgba(239,68,68,0.45)' : '1px solid var(--border-color)',
                              background: isSelected ? 'var(--color-primary)' : hasConflicts ? 'rgba(239,68,68,0.08)' : 'var(--bg-darker)',
                              color: isSelected ? '#fff' : 'var(--text-main)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '2px'
                            }}
                          >
                            <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>{hour}</span>
                            <span style={{ fontSize: '0.65rem', color: isSelected ? '#fff' : hasConflicts ? '#f87171' : minVagas >= 3 ? '#10b981' : '#f59e0b' }}>
                              {hasConflicts ? `🔴 Conflito` : `${minVagas} vagas`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px', display: 'block' }}>
                      Definir Horário Específico para Cada Dia Selecionado:
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedDays.map(day => {
                        const curTime = dayTimesMap[day] || uniformTime;
                        return (
                          <div
                            key={day}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              background: 'rgba(0,0,0,0.2)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px'
                            }}
                          >
                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                              {DAYS_FULL[day]}
                            </span>
                            <select
                              className="select-custom"
                              value={curTime}
                              onChange={e => setDayTimesMap(prev => ({ ...prev, [day]: e.target.value }))}
                              style={{ width: '130px', padding: '6px 10px', fontSize: '0.82rem' }}
                            >
                              {STANDARD_HOURS.map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Duração e Vigência */}
                <div style={{ display: 'grid', gridTemplateColumns: modalDurationType === 'manual' ? '1fr 1fr' : '1fr', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                      Tipo de Vigência
                    </label>
                    <select
                      className="select-custom"
                      value={modalDurationType}
                      onChange={e => setModalDurationType(e.target.value as any)}
                    >
                      <option value="contrato">Até o fim da vigência do contrato comercial</option>
                      <option value="indeterminado">Sem data final (Contínuo / Recorrente)</option>
                      <option value="manual">Definir data de término manual</option>
                    </select>
                  </div>

                  {modalDurationType === 'manual' && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                        Data Final Manual <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={modalManualEndDate}
                        onChange={e => setModalManualEndDate(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>

                {/* Prévia dos slots que serão gerados */}
                {selectedDays.length > 0 && (
                  <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Resumo da Regra:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedDays.map(d => {
                        const time = scheduleMode === 'uniforme' ? uniformTime : (dayTimesMap[d] || uniformTime);
                        return (
                          <span
                            key={d}
                            style={{
                              padding: '3px 8px',
                              background: 'rgba(0, 184, 148, 0.15)',
                              border: '1px solid rgba(0, 184, 148, 0.3)',
                              borderRadius: '4px',
                              color: 'var(--color-primary)',
                              fontWeight: 700,
                              fontSize: '0.78rem'
                            }}
                          >
                            {DAYS_SHORT[d]} às {time}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div
                className="modal-footer"
                style={{
                  padding: '14px 20px',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  gap: '10px',
                  flexShrink: 0
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  disabled={savingSchedule}
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingSchedule || selectedDays.length === 0}
                  style={{ flex: 1, fontWeight: 750 }}
                >
                  {savingSchedule ? (
                    <><i className="fa-solid fa-spinner fa-spin"></i> Salvando...</>
                  ) : editingGroup ? (
                    'Atualizar Regras'
                  ) : (
                    `Criar Regra (${selectedDays.length} ${selectedDays.length === 1 ? 'dia' : 'dias'})`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL DE VISUALIZAÇÃO & IMPRESSÃO DA GRADE SEMANAL */}
      {showPrintModal && (
        <div
          className="modal-overlay"
          style={{ display: 'flex', zIndex: 100000, padding: '16px', overflowY: 'auto' }}
          onClick={() => setShowPrintModal(false)}
        >
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '900px',
              width: '95%',
              maxHeight: 'calc(100vh - 32px)',
              display: 'flex',
              flexDirection: 'column',
              background: '#ffffff',
              color: '#111827',
              borderRadius: '12px'
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#111827' }}>
                  Grade Semanal de Horários Fixos
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  Clube Fitness • Gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => window.print()}
                  style={{ background: '#00b894', color: '#fff', fontWeight: 700 }}
                >
                  <i className="fa-solid fa-print" style={{ marginRight: '6px' }}></i> Imprimir
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowPrintModal(false)}
                  style={{ background: '#e5e7eb', color: '#374151', border: 'none' }}
                >
                  Fechar
                </button>
              </div>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: '1 1 auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center', width: '70px', fontWeight: 800 }}>Horário</th>
                    {[1, 2, 3, 4, 5, 6].map(d => (
                      <th key={d} style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center', fontWeight: 800 }}>
                        {DAYS_FULL[d]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {STANDARD_HOURS.map(hour => (
                    <tr key={hour}>
                      <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'center', fontWeight: 800, background: '#f9fafb' }}>
                        {hour}
                      </td>
                      {[1, 2, 3, 4, 5, 6].map(day => {
                        const matches = fixedSchedules.filter(fs => Number(fs.diaSemana) === day && fs.horario === hour);
                        return (
                          <td key={day} style={{ border: '1px solid #d1d5db', padding: '4px', verticalAlign: 'top', height: '45px' }}>
                            {matches.map(fs => {
                              const cName = fs.clienteId?.dadosPessoais?.nome || fs.clienteId?.nome || 'Aluno';
                              return (
                                <div key={fs._id} style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1f2937', padding: '1px 2px', borderBottom: '1px dotted #e5e7eb' }}>
                                  • {cName}
                                </div>
                              );
                            })}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
