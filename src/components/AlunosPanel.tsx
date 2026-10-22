'use client';

import React, { useState, useMemo } from 'react';
import SmartSearchInput from './SmartSearchInput';
import { smartSearchMatch } from '@/utils/smartSearch';
import Pagination from './Pagination';

interface Client {
  _id: string;
  profissionalId?: any;
  dadosPessoais?: {
    nome?: string;
    email?: string;
    cpf?: string;
    telefone?: string;
    dataNascimento?: string;
  };
  dadosComerciais?: {
    plano?: string;
    planoId?: {
      _id?: string;
      nome?: string;
    };
    vencimento?: string;
    frequencia?: number;
    valor?: number;
  };
  dadosClinicos?: {
    objetivoPrincipal?: string;
    lesoes?: string;
    restricoes?: string;
    medicamentos?: string;
    historicoClinico?: string;
    observacoes?: string;
  };
  rotinaSemanal?: {
    dias?: Array<{
      diaSemana?: string;
      horario?: string;
      servico?: string;
      profissionalId?: any;
    }>;
  };
  contratosAtivos?: any[];
}

interface AlunosPanelProps {
  clients: Client[];
  professionalId?: string;
  professionals: any[];
  appointments: any[];
  assessments: any[];
  strengthTests: any[];
  onOpenDossier: (client: Client) => void;
  onOpenWorkout: (client: Client) => void;
  onOpenTrancamento?: (client: Client) => void;
}

export default function AlunosPanel({
  clients,
  professionalId,
  professionals,
  appointments,
  assessments,
  strengthTests,
  onOpenDossier,
  onOpenWorkout,
  onOpenTrancamento
}: AlunosPanelProps) {
  // Filtros
  const [filterScope, setFilterScope] = useState<'todos' | 'meus'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProf, setFilterProf] = useState('todos');
  const [filterPlano, setFilterPlano] = useState('todos');
  const [filterSt, setFilterSt] = useState('todos');
  const [filterAs, setFilterAs] = useState('todos');
  const [filterPlanStatus, setFilterPlanStatus] = useState('todos');
  const [filterRotina, setFilterRotina] = useState('todos');
  const [filterRisco, setFilterRisco] = useState('todos');
  const [sortOrder, setSortOrder] = useState('nome_asc');
  const [viewMode, setViewMode] = useState<'cards' | 'tabela'>('cards');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = viewMode === 'tabela' ? 15 : 12;

  // Helpers de Análise e Datas
  const getDaysSince = (clientId: string) => {
    const clientApts = appointments.filter((a: any) =>
      (a.clientId === clientId || a.clientId?._id === clientId) &&
      (a.status === 'confirmado' || a.status === 'concluido' || a.status === 'presenca')
    );
    if (clientApts.length === 0) return 999;
    const dates = clientApts.map((a: any) => new Date(a.date || a.createdAt).getTime());
    return Math.floor((Date.now() - Math.max(...dates)) / (1000 * 60 * 60 * 24));
  };

  const getRisk = (days: number) => {
    if (days === 999) return { level: 'Sem histórico', color: '#94a3b8' };
    if (days <= 7) return { level: 'Baixo', color: '#10b981' };
    if (days <= 20) return { level: 'Médio', color: '#f59e0b' };
    return { level: 'Alto', color: '#ef4444' };
  };

  const getLastAssessment = (clientId: string) => {
    const clientAs = assessments.filter((as: any) => {
      const cid = typeof as.clienteId === 'object' ? as.clienteId?._id : as.clienteId;
      return cid === clientId;
    });
    if (clientAs.length === 0) return null;
    const sorted = [...clientAs].sort((a: any, b: any) => b.data.localeCompare(a.data));
    return sorted[0].data; // YYYY-MM-DD
  };

  const getLastStrengthTest = (clientId: string) => {
    const clientSt = strengthTests.filter((st: any) => {
      const cid = typeof st.clienteId === 'object' ? st.clienteId?._id : st.clienteId;
      return cid === clientId;
    });
    if (clientSt.length === 0) return null;
    const sorted = [...clientSt].sort((a: any, b: any) => b.data.localeCompare(a.data));
    return sorted[0].data; // YYYY-MM-DD
  };

  const getPlanStatusObj = (vencimentoStr?: string) => {
    if (!vencimentoStr) {
      return { displayVal: 'Sem data', status: 'sem_data', style: { color: 'var(--text-muted)' }, icon: null, diffDays: null };
    }
    const parts = vencimentoStr.split('-');
    if (parts.length !== 3) {
      return { displayVal: vencimentoStr, status: 'indefinido', style: {}, icon: null, diffDays: null };
    }
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const displayVal = vencimentoStr.split('-').reverse().join('/');

    if (diffDays < 0) {
      return {
        displayVal,
        status: 'vencido',
        diffDays,
        style: { color: '#ef4444', fontWeight: 700 },
        icon: <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '5px', color: '#ef4444' }} title="Plano Vencido"></i>
      };
    } else if (diffDays <= 15) {
      return {
        displayVal,
        status: 'vencendo',
        diffDays,
        style: { color: '#f59e0b', fontWeight: 650 },
        icon: <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '5px', color: '#f59e0b' }} title={`Vence em ${diffDays} dia(s)`}></i>
      };
    } else {
      return {
        displayVal,
        status: 'em_dia',
        diffDays,
        style: { color: 'var(--text-main)' },
        icon: null
      };
    }
  };

  const getExamStatusObj = (examDateStr: string | null) => {
    if (!examDateStr || examDateStr === '-') {
      return { displayVal: 'Sem registro', status: 'sem_registro', style: { color: 'var(--text-muted)' }, icon: null, diffDays: null };
    }
    const parts = examDateStr.split('-');
    if (parts.length !== 3) {
      return { displayVal: examDateStr, status: 'indefinido', style: {}, icon: null, diffDays: null };
    }
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    const displayVal = examDateStr.split('-').reverse().join('/');

    if (diffDays > 60) {
      return {
        displayVal,
        status: 'atrasado',
        diffDays,
        style: { color: '#ef4444', fontWeight: 700 },
        icon: <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '5px', color: '#ef4444' }} title={`Vencido há ${diffDays} dias (> 60 dias)`}></i>
      };
    } else if (diffDays > 40) {
      return {
        displayVal,
        status: 'atencao',
        diffDays,
        style: { color: '#f59e0b', fontWeight: 650 },
        icon: <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '5px', color: '#f59e0b' }} title={`Atenção: realizado há ${diffDays} dias (vence em 60 dias)`}></i>
      };
    } else {
      return {
        displayVal,
        status: 'em_dia',
        diffDays,
        style: { color: '#10b981', fontWeight: 600 },
        icon: <i className="fa-solid fa-circle-check" style={{ marginRight: '5px', color: '#10b981' }} title={`Em dia (${diffDays} dias)`}></i>
      };
    }
  };

  // Resumo de Planos Únicos
  const uniquePlans = useMemo(() => {
    const set = new Set<string>();
    clients.forEach(c => {
      const p = c.dadosComerciais?.planoId?.nome || c.dadosComerciais?.plano;
      if (p && p.trim()) set.add(p.trim());
    });
    return Array.from(set).sort();
  }, [clients]);

  // Escopo
  const scopedClients = useMemo(() => {
    return clients.filter(c => {
      if (filterScope === 'meus') {
        const linkedProfId = c.profissionalId?._id || c.profissionalId;
        return String(linkedProfId) === String(professionalId);
      }
      return true;
    });
  }, [clients, filterScope, professionalId]);

  // Métricas dos KPIs
  const kpis = useMemo(() => {
    let stEmDia = 0;
    let stPendentes = 0;
    let asEmDia = 0;
    let asPendentes = 0;
    let planosCriticos = 0;
    let meusAlunosCount = 0;

    scopedClients.forEach(c => {
      const linkedProfId = c.profissionalId?._id || c.profissionalId;
      if (String(linkedProfId) === String(professionalId)) meusAlunosCount++;

      const stRaw = getLastStrengthTest(c._id);
      const stObj = getExamStatusObj(stRaw);
      if (stObj.status === 'em_dia') stEmDia++;
      else stPendentes++;

      const asRaw = getLastAssessment(c._id);
      const asObj = getExamStatusObj(asRaw);
      if (asObj.status === 'em_dia') asEmDia++;
      else asPendentes++;

      const planObj = getPlanStatusObj(c.dadosComerciais?.vencimento);
      if (planObj.status === 'vencendo' || planObj.status === 'vencido') {
        planosCriticos++;
      }
    });

    return {
      total: scopedClients.length,
      meusAlunosCount,
      stEmDia,
      stPendentes,
      asEmDia,
      asPendentes,
      planosCriticos
    };
  }, [scopedClients, professionalId, strengthTests, assessments]);

  // Filtros aplicados
  const filteredClients = useMemo(() => {
    return scopedClients.filter(c => {
      // 1. Busca textual
      const matchSearch = smartSearchMatch([
        c.dadosPessoais?.nome,
        c.dadosPessoais?.email,
        c.dadosPessoais?.cpf,
        c.dadosPessoais?.telefone,
        c.dadosClinicos?.objetivoPrincipal,
        c.dadosComerciais?.planoId?.nome,
        c.dadosComerciais?.plano
      ], searchQuery);
      if (!matchSearch) return false;

      // 2. Profissional Responsável
      if (filterProf !== 'todos') {
        const pid = c.profissionalId?._id || c.profissionalId;
        if (filterProf === 'sem_prof') {
          if (pid) return false;
        } else {
          if (String(pid) !== String(filterProf)) return false;
        }
      }

      // 3. Plano
      if (filterPlano !== 'todos') {
        const pNome = c.dadosComerciais?.planoId?.nome || c.dadosComerciais?.plano || '';
        if (pNome !== filterPlano) return false;
      }

      // 4. Teste de Força
      if (filterSt !== 'todos') {
        const lastSt = getLastStrengthTest(c._id);
        const stObj = getExamStatusObj(lastSt);
        if (filterSt === 'sem_teste' && stObj.status !== 'sem_registro') return false;
        if (filterSt === 'em_dia' && stObj.status !== 'em_dia') return false;
        if (filterSt === 'atencao' && stObj.status !== 'atencao') return false;
        if (filterSt === 'atrasado' && stObj.status !== 'atrasado') return false;
      }

      // 5. Avaliação Física
      if (filterAs !== 'todos') {
        const lastAs = getLastAssessment(c._id);
        const asObj = getExamStatusObj(lastAs);
        if (filterAs === 'sem_avaliacao' && asObj.status !== 'sem_registro') return false;
        if (filterAs === 'em_dia' && asObj.status !== 'em_dia') return false;
        if (filterAs === 'atencao' && asObj.status !== 'atencao') return false;
        if (filterAs === 'atrasado' && asObj.status !== 'atrasado') return false;
      }

      // 6. Vencimento do Plano
      if (filterPlanStatus !== 'todos') {
        const planObj = getPlanStatusObj(c.dadosComerciais?.vencimento);
        if (filterPlanStatus === 'vencido' && planObj.status !== 'vencido') return false;
        if (filterPlanStatus === 'vencendo' && planObj.status !== 'vencendo') return false;
        if (filterPlanStatus === 'em_dia' && planObj.status !== 'em_dia') return false;
      }

      // 7. Rotina Semanal
      if (filterRotina !== 'todos') {
        const hasRotina = Boolean(c.rotinaSemanal?.dias && c.rotinaSemanal.dias.length > 0);
        if (filterRotina === 'com_rotina' && !hasRotina) return false;
        if (filterRotina === 'sem_rotina' && hasRotina) return false;
      }

      // 8. Risco Clínico
      if (filterRisco !== 'todos') {
        const days = getDaysSince(c._id);
        const risk = getRisk(days);
        if (risk.level !== filterRisco) return false;
      }

      return true;
    });
  }, [scopedClients, searchQuery, filterProf, filterPlano, filterSt, filterAs, filterPlanStatus, filterRotina, filterRisco, assessments, strengthTests, appointments]);

  // Ordenação
  const sortedClients = useMemo(() => {
    return [...filteredClients].sort((a, b) => {
      if (sortOrder === 'nome_asc') {
        return (a.dadosPessoais?.nome || '').localeCompare(b.dadosPessoais?.nome || '');
      }
      if (sortOrder === 'nome_desc') {
        return (b.dadosPessoais?.nome || '').localeCompare(a.dadosPessoais?.nome || '');
      }
      if (sortOrder === 'as_recent') {
        const dateA = getLastAssessment(a._id) || '';
        const dateB = getLastAssessment(b._id) || '';
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB.localeCompare(dateA);
      }
      if (sortOrder === 'as_old') {
        const dateA = getLastAssessment(a._id) || '';
        const dateB = getLastAssessment(b._id) || '';
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA.localeCompare(dateB);
      }
      if (sortOrder === 'st_recent') {
        const dateA = getLastStrengthTest(a._id) || '';
        const dateB = getLastStrengthTest(b._id) || '';
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB.localeCompare(dateA);
      }
      if (sortOrder === 'st_old') {
        const dateA = getLastStrengthTest(a._id) || '';
        const dateB = getLastStrengthTest(b._id) || '';
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA.localeCompare(dateB);
      }
      if (sortOrder === 'vencimento_asc') {
        const vA = a.dadosComerciais?.vencimento || '9999-99-99';
        const vB = b.dadosComerciais?.vencimento || '9999-99-99';
        return vA.localeCompare(vB);
      }
      return 0;
    });
  }, [filteredClients, sortOrder, assessments, strengthTests]);

  // Paginação aplicada
  const totalPages = Math.ceil(sortedClients.length / pageSize);
  const curPage = currentPage > totalPages ? Math.max(1, totalPages) : currentPage;
  const paginatedClients = useMemo(() => {
    const start = (curPage - 1) * pageSize;
    return sortedClients.slice(start, start + pageSize);
  }, [sortedClients, curPage, pageSize]);

  // Checagem se algum filtro está ativo
  const hasActiveFilters = 
    searchQuery !== '' ||
    filterProf !== 'todos' ||
    filterPlano !== 'todos' ||
    filterSt !== 'todos' ||
    filterAs !== 'todos' ||
    filterPlanStatus !== 'todos' ||
    filterRotina !== 'todos' ||
    filterRisco !== 'todos' ||
    sortOrder !== 'nome_asc';

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterProf('todos');
    setFilterPlano('todos');
    setFilterSt('todos');
    setFilterAs('todos');
    setFilterPlanStatus('todos');
    setFilterRotina('todos');
    setFilterRisco('todos');
    setSortOrder('nome_asc');
    setCurrentPage(1);
  };

  const getCleanPhone = (phone?: string) => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  };

  return (
    <>
      {/* 1. Header com Título & Explicação */}
      <div className="view-header" style={{ marginBottom: '20px' }}>
        <div className="view-title-group">
          <h1>Alunos</h1>
          <p>Gestão e acompanhamento clínico, testes de força, evolução e rotinas de treinos.</p>
        </div>
      </div>

      {/* 2. KPIs Executivos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '14px',
        marginBottom: '22px'
      }}>
        {/* KPI 1: Total de Alunos */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '16px 18px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(56, 189, 248, 0.12)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            flexShrink: 0
          }}>
            <i className="fa-solid fa-users"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-dim)', fontWeight: 700 }}>
              Total de Alunos
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
              {kpis.total}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600, marginTop: '2px' }}>
              <i className="fa-solid fa-user-check" style={{ marginRight: '4px' }}></i>
              {kpis.meusAlunosCount} sob sua tutela
            </div>
          </div>
        </div>

        {/* KPI 2: Testes de Força */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '16px 18px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            flexShrink: 0
          }}>
            <i className="fa-solid fa-dumbbell"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-dim)', fontWeight: 700 }}>
              Testes de Força
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#10b981', lineHeight: 1.2 }}>
              {kpis.stEmDia} <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>em dia</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: kpis.stPendentes > 0 ? '#f59e0b' : 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
              <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: '4px' }}></i>
              {kpis.stPendentes} pendentes ou vencidos
            </div>
          </div>
        </div>

        {/* KPI 3: Avaliações Físicas */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '16px 18px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(129, 140, 248, 0.12)',
            color: '#818cf8',
            border: '1px solid rgba(129, 140, 248, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            flexShrink: 0
          }}>
            <i className="fa-solid fa-notes-medical"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-dim)', fontWeight: 700 }}>
              Avaliações Físicas
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#818cf8', lineHeight: 1.2 }}>
              {kpis.asEmDia} <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontWeight: 600 }}>em dia</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: kpis.asPendentes > 0 ? '#f59e0b' : 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
              <i className="fa-solid fa-file-waveform" style={{ marginRight: '4px' }}></i>
              {kpis.asPendentes} pendentes ou vencidas
            </div>
          </div>
        </div>

        {/* KPI 4: Planos Críticos */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '16px 18px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: kpis.planosCriticos > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            color: kpis.planosCriticos > 0 ? '#ef4444' : '#10b981',
            border: `1px solid ${kpis.planosCriticos > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            flexShrink: 0
          }}>
            <i className={`fa-solid ${kpis.planosCriticos > 0 ? 'fa-triangle-exclamation' : 'fa-calendar-check'}`}></i>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-dim)', fontWeight: 700 }}>
              Planos Críticos
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: kpis.planosCriticos > 0 ? '#ef4444' : '#10b981', lineHeight: 1.2 }}>
              {kpis.planosCriticos}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
              {kpis.planosCriticos > 0 ? 'Vencendo em até 15d ou vencidos' : 'Nenhum plano em atraso'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Painel de Filtros e Visualização */}
      <div className="content-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        {/* Linha 1: Escopo + Busca + Alternador de Visualização */}
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          marginBottom: '16px'
        }}>
          {/* Alternador de Escopo */}
          <div style={{
            display: 'inline-flex',
            background: 'var(--bg-secondary)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            gap: '4px'
          }}>
            <button
              type="button"
              className="btn btn-sm"
              style={{
                background: filterScope === 'todos' ? 'var(--color-primary)' : 'transparent',
                color: filterScope === 'todos' ? '#fff' : 'var(--text-muted)',
                fontWeight: 650,
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => { setFilterScope('todos'); setCurrentPage(1); }}
            >
              <i className="fa-solid fa-users" style={{ marginRight: '6px' }}></i>
              Todos ({clients.length})
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{
                background: filterScope === 'meus' ? '#10b981' : 'transparent',
                color: filterScope === 'meus' ? '#fff' : 'var(--text-muted)',
                fontWeight: 650,
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => { setFilterScope('meus'); setCurrentPage(1); }}
            >
              <i className="fa-solid fa-star" style={{ marginRight: '6px', color: filterScope === 'meus' ? '#fff' : '#f59e0b' }}></i>
              Meus Alunos ({clients.filter(c => {
                const linkedProfId = c.profissionalId?._id || c.profissionalId;
                return String(linkedProfId) === String(professionalId);
              }).length})
            </button>
          </div>

          {/* Busca Textual */}
          <div style={{ flex: '1 1 280px', maxWidth: '480px' }}>
            <SmartSearchInput
              value={searchQuery}
              onChange={val => { setSearchQuery(val); setCurrentPage(1); }}
              placeholder="Buscar por nome, CPF, telefone ou plano..."
              resultCount={filteredClients.length}
              totalCount={scopedClients.length}
            />
          </div>

          {/* Alternador de Modo de Visualização (Cards vs Tabela) */}
          <div style={{
            display: 'inline-flex',
            background: 'var(--bg-secondary)',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            gap: '4px'
          }}>
            <button
              type="button"
              style={{
                background: viewMode === 'cards' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'cards' ? '#fff' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontWeight: 650,
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
              onClick={() => { setViewMode('cards'); setCurrentPage(1); }}
              title="Visualizar em Grade de Cards"
            >
              <i className="fa-solid fa-grip"></i> Cards
            </button>
            <button
              type="button"
              style={{
                background: viewMode === 'tabela' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'tabela' ? '#fff' : 'var(--text-muted)',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontWeight: 650,
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
              onClick={() => { setViewMode('tabela'); setCurrentPage(1); }}
              title="Visualizar em Tabela Compacta"
            >
              <i className="fa-solid fa-list"></i> Tabela
            </button>
          </div>
        </div>

        {/* Linha 2: Barra de Filtros Multifacetados */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '10px',
          alignItems: 'center',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-color)'
        }}>
          {/* Filtro: Profissional Responsável */}
          <div>
            <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '3px', textTransform: 'uppercase' }}>
              Responsável
            </label>
            <select
              className="select-custom"
              value={filterProf}
              onChange={e => { setFilterProf(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', fontSize: '0.80rem' }}
            >
              <option value="todos">Todos os Profissionais</option>
              <option value="sem_prof">Sem Responsável</option>
              {professionals.map(p => (
                <option key={p._id} value={p._id}>{p.nome}</option>
              ))}
            </select>
          </div>

          {/* Filtro: Tipo de Plano */}
          <div>
            <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '3px', textTransform: 'uppercase' }}>
              Plano
            </label>
            <select
              className="select-custom"
              value={filterPlano}
              onChange={e => { setFilterPlano(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', fontSize: '0.80rem' }}
            >
              <option value="todos">Todos os Planos</option>
              {uniquePlans.map(plano => (
                <option key={plano} value={plano}>{plano}</option>
              ))}
            </select>
          </div>

          {/* Filtro: Teste de Força */}
          <div>
            <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '3px', textTransform: 'uppercase' }}>
              Teste de Força
            </label>
            <select
              className="select-custom"
              value={filterSt}
              onChange={e => { setFilterSt(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', fontSize: '0.80rem' }}
            >
              <option value="todos">Todos os Testes</option>
              <option value="em_dia">Em dia (≤ 40d)</option>
              <option value="atencao">Atenção (41-60d)</option>
              <option value="atrasado">Atrasado (&gt; 60d)</option>
              <option value="sem_teste">Sem Teste Realizado</option>
            </select>
          </div>

          {/* Filtro: Avaliação Física */}
          <div>
            <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '3px', textTransform: 'uppercase' }}>
              Avaliação Física
            </label>
            <select
              className="select-custom"
              value={filterAs}
              onChange={e => { setFilterAs(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', fontSize: '0.80rem' }}
            >
              <option value="todos">Todas Avaliações</option>
              <option value="em_dia">Em dia (≤ 40d)</option>
              <option value="atencao">Atenção (41-60d)</option>
              <option value="atrasado">Atrasada (&gt; 60d)</option>
              <option value="sem_avaliacao">Sem Avaliação</option>
            </select>
          </div>

          {/* Filtro: Vencimento do Plano */}
          <div>
            <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '3px', textTransform: 'uppercase' }}>
              Vencimento Plano
            </label>
            <select
              className="select-custom"
              value={filterPlanStatus}
              onChange={e => { setFilterPlanStatus(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', fontSize: '0.80rem' }}
            >
              <option value="todos">Todos os Vencimentos</option>
              <option value="em_dia">Em dia (&gt; 15d)</option>
              <option value="vencendo">Vencendo (0-15d)</option>
              <option value="vencido">Vencido (&lt; 0d)</option>
            </select>
          </div>

          {/* Filtro: Rotina Semanal */}
          <div>
            <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '3px', textTransform: 'uppercase' }}>
              Rotina Semanal
            </label>
            <select
              className="select-custom"
              value={filterRotina}
              onChange={e => { setFilterRotina(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', fontSize: '0.80rem' }}
            >
              <option value="todos">Todas Rotinas</option>
              <option value="com_rotina">Com Rotina Cadastrada</option>
              <option value="sem_rotina">Sem Rotina Cadastrada</option>
            </select>
          </div>

          {/* Filtro: Nível de Risco */}
          <div>
            <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '3px', textTransform: 'uppercase' }}>
              Risco Clínico
            </label>
            <select
              className="select-custom"
              value={filterRisco}
              onChange={e => { setFilterRisco(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', fontSize: '0.80rem' }}
            >
              <option value="todos">Todos os Riscos</option>
              <option value="Baixo">Baixo (frequente)</option>
              <option value="Médio">Médio (7-20d ausente)</option>
              <option value="Alto">Alto (&gt; 20d ausente)</option>
              <option value="Sem histórico">Sem Histórico</option>
            </select>
          </div>

          {/* Ordenação */}
          <div>
            <label style={{ display: 'block', fontSize: '0.70rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '3px', textTransform: 'uppercase' }}>
              Ordenar Por
            </label>
            <select
              className="select-custom"
              value={sortOrder}
              onChange={e => { setSortOrder(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', fontSize: '0.80rem' }}
            >
              <option value="nome_asc">Nome (A - Z)</option>
              <option value="nome_desc">Nome (Z - A)</option>
              <option value="as_recent">Avaliação (Mais Recente)</option>
              <option value="as_old">Avaliação (Mais Antiga)</option>
              <option value="st_recent">Teste Força (Mais Recente)</option>
              <option value="st_old">Teste Força (Mais Antigo)</option>
              <option value="vencimento_asc">Vencimento (Mais Próximo)</option>
            </select>
          </div>
        </div>

        {/* Botão Limpar Filtros quando ativo */}
        {hasActiveFilters && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleClearFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                color: '#ef4444',
                borderColor: 'rgba(239, 68, 68, 0.3)'
              }}
            >
              <i className="fa-solid fa-filter-circle-xmark"></i> Limpar Filtros Ativos
            </button>
          </div>
        )}
      </div>

      {/* 4. Renderização dos Dados: Cards ou Tabela */}
      {sortedClients.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)',
          border: '1.5px dashed var(--border-color)',
          borderRadius: '16px',
          padding: '48px 20px',
          textAlign: 'center'
        }}>
          <i className="fa-solid fa-graduation-cap" style={{ fontSize: '2.5rem', color: 'var(--text-dim)', marginBottom: '12px' }}></i>
          <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 750 }}>Nenhum aluno encontrado</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
            Não há alunos correspondentes aos filtros selecionados.
          </p>
          {hasActiveFilters && (
            <button className="btn btn-secondary btn-sm" onClick={handleClearFilters}>
              <i className="fa-solid fa-arrow-rotate-left"></i> Redefinir Filtros
            </button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        /* Modo 1: Cards (Grade) */
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {paginatedClients.map(c => {
              const days = getDaysSince(c._id);
              const risk = getRisk(days);
              const lastAsRaw = getLastAssessment(c._id);
              const lastStRaw = getLastStrengthTest(c._id);

              const asObj = getExamStatusObj(lastAsRaw);
              const stObj = getExamStatusObj(lastStRaw);
              const planObj = getPlanStatusObj(c.dadosComerciais?.vencimento);

              const linkedProfId = c.profissionalId?._id || c.profissionalId;
              const isMyStudent = String(linkedProfId) === String(professionalId);
              const cleanPhone = getCleanPhone(c.dadosPessoais?.telefone);

              return (
                <div
                  key={c._id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                    transition: 'transform 0.15s ease, border-color 0.15s ease'
                  }}
                >
                  <div>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 55%', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-main)', wordBreak: 'break-word' }}>
                            {c.dadosPessoais?.nome}
                          </h3>
                          {isMyStudent ? (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.3)' }}>
                              <i className="fa-solid fa-star" style={{ marginRight: '3px' }}></i>Meu Aluno
                            </span>
                          ) : c.profissionalId?.nome ? (
                            <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                              Prof. {c.profissionalId.nome}
                            </span>
                          ) : null}
                        </div>
                        
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {cleanPhone ? (
                            <a
                              href={`https://wa.me/55${cleanPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#10b981', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 650 }}
                              title="Conversar no WhatsApp"
                            >
                              <i className="fa-brands fa-whatsapp"></i> {c.dadosPessoais?.telefone}
                            </a>
                          ) : (
                            <span>{c.dadosPessoais?.email || 'Sem contato'}</span>
                          )}
                        </div>
                      </div>

                      <span style={{
                        background: risk.color + '22',
                        color: risk.color,
                        border: `1px solid ${risk.color}55`,
                        padding: '3px 8px',
                        borderRadius: '8px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}>
                        Risco {risk.level}
                      </span>
                    </div>

                    {/* Grid de Informações 2x2 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px' }}>
                      <div style={{ background: 'var(--bg-darker)', padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Última Avaliação</div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 750, marginTop: '2px', ...asObj.style, background: 'transparent' }}>
                          {asObj.icon} {asObj.displayVal}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-darker)', padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Teste de Força</div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 750, marginTop: '2px', ...stObj.style, background: 'transparent' }}>
                          {stObj.icon} {stObj.displayVal}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-darker)', padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Fim do Plano</div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 750, marginTop: '2px', ...planObj.style, background: 'transparent' }}>
                          {planObj.icon} {planObj.displayVal}
                        </div>
                      </div>
                      <div style={{ background: 'var(--bg-darker)', padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Plano</div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 750, color: 'var(--text-main)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.dadosComerciais?.planoId?.nome || c.dadosComerciais?.plano || 'Personalizado'}
                        </div>
                      </div>
                    </div>

                    {/* Resumo da Rotina Semanal */}
                    {(() => {
                      const contractFreq = c.contratosAtivos?.[0]?.frequencia || c.dadosComerciais?.frequencia || 3;
                      const rotinaDias: any[] = c.rotinaSemanal?.dias || [];
                      const hasRotina = rotinaDias.length > 0;

                      return (
                        <div style={{
                          marginTop: '10px',
                          background: hasRotina ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                          border: hasRotina ? '1px solid rgba(16, 185, 129, 0.25)' : '1px dashed rgba(255, 255, 255, 0.1)',
                          borderRadius: '10px',
                          padding: '8px 10px',
                          fontSize: '0.76rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 800, color: hasRotina ? '#10b981' : '#94a3b8', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                              <i className="fa-solid fa-calendar-week" style={{ marginRight: '4px' }}></i>
                              Rotina Semanal ({contractFreq}x)
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {hasRotina ? (
                              rotinaDias.slice(0, contractFreq).map((d: any, dIdx: number) => {
                                const isManual = d.servico === 'Terapia Manual';
                                const isIndividual = d.servico === 'Atendimento Individual';
                                const isMonitorado = d.servico === 'Treino Monitorado';
                                const badgeColor = isManual ? '#38bdf8' : (isIndividual ? '#c084fc' : (isMonitorado ? '#10b981' : '#f59e0b'));
                                const badgeBg = isManual ? 'rgba(56, 189, 248, 0.15)' : (isIndividual ? 'rgba(192, 132, 252, 0.15)' : (isMonitorado ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'));
                                const shortLabel = isManual ? 'Manual' : (isIndividual ? 'Individual' : (isMonitorado ? 'Monitorado' : (d.servico === 'Treino Livre' ? 'Livre' : (d.servico || 'Treino'))));

                                return (
                                  <span
                                    key={dIdx}
                                    style={{
                                      background: badgeBg,
                                      color: badgeColor,
                                      border: `1px solid ${badgeColor}40`,
                                      padding: '1px 6px',
                                      borderRadius: '5px',
                                      fontSize: '0.70rem',
                                      fontWeight: 750
                                    }}
                                  >
                                    D{dIdx + 1}: {shortLabel}
                                  </span>
                                );
                              })
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.72rem' }}>
                                Serviços ainda não detalhados
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Botões de Ação */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px', fontWeight: 750, borderRadius: '10px', fontSize: '0.82rem' }}
                      onClick={() => onOpenDossier(c)}
                    >
                      <i className="fa-solid fa-address-card"></i> Dossiê do Aluno
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 12px', fontWeight: 750, borderRadius: '10px', fontSize: '0.82rem' }}
                      onClick={() => onOpenWorkout(c)}
                      title="Montar ou editar ficha de treino"
                    >
                      <i className="fa-solid fa-dumbbell"></i> Treino
                    </button>
                    {onOpenTrancamento && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 12px', fontWeight: 750, borderRadius: '10px', fontSize: '0.82rem', borderColor: 'rgba(56, 189, 248, 0.3)', color: '#38bdf8' }}
                        onClick={() => onOpenTrancamento(c)}
                        title="Lançar trancamento de plano"
                      >
                        <i className="fa-solid fa-snowflake"></i> Trancar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginação Cards */}
          <div style={{ marginTop: '20px' }}>
            <Pagination
              currentPage={curPage}
              totalItems={sortedClients.length}
              itemsPerPage={pageSize}
              onPageChange={page => setCurrentPage(page)}
            />
          </div>
        </>
      ) : (
        /* Modo 2: Tabela Compacta (Lista) */
        <>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-dim)', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <th style={{ padding: '14px 16px', fontWeight: 750 }}>Aluno</th>
                    <th style={{ padding: '14px 16px', fontWeight: 750 }}>Responsável</th>
                    <th style={{ padding: '14px 16px', fontWeight: 750 }}>Plano & Vencimento</th>
                    <th style={{ padding: '14px 16px', fontWeight: 750 }}>Última Avaliação</th>
                    <th style={{ padding: '14px 16px', fontWeight: 750 }}>Teste de Força</th>
                    <th style={{ padding: '14px 16px', fontWeight: 750 }}>Rotina Semanal</th>
                    <th style={{ padding: '14px 16px', fontWeight: 750 }}>Risco</th>
                    <th style={{ padding: '14px 16px', fontWeight: 750, textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedClients.map(c => {
                    const days = getDaysSince(c._id);
                    const risk = getRisk(days);
                    const lastAsRaw = getLastAssessment(c._id);
                    const lastStRaw = getLastStrengthTest(c._id);

                    const asObj = getExamStatusObj(lastAsRaw);
                    const stObj = getExamStatusObj(lastStRaw);
                    const planObj = getPlanStatusObj(c.dadosComerciais?.vencimento);

                    const linkedProfId = c.profissionalId?._id || c.profissionalId;
                    const isMyStudent = String(linkedProfId) === String(professionalId);
                    const cleanPhone = getCleanPhone(c.dadosPessoais?.telefone);

                    const contractFreq = c.contratosAtivos?.[0]?.frequencia || c.dadosComerciais?.frequencia || 3;
                    const rotinaDias: any[] = c.rotinaSemanal?.dias || [];

                    return (
                      <tr key={c._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease' }}>
                        {/* Coluna 1: Aluno com WhatsApp */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ color: 'var(--text-main)', fontSize: '0.88rem' }}>
                              {c.dadosPessoais?.nome}
                            </strong>
                            {isMyStudent && (
                              <span style={{ fontSize: '0.66rem', fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '1px 5px', borderRadius: '4px' }}>
                                Meu Aluno
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
                            {cleanPhone ? (
                              <a
                                href={`https://wa.me/55${cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#10b981', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 650 }}
                                title="Conversar no WhatsApp"
                              >
                                <i className="fa-brands fa-whatsapp"></i> {c.dadosPessoais?.telefone}
                              </a>
                            ) : (
                              <span>{c.dadosPessoais?.email || 'Sem contato'}</span>
                            )}
                            {c.dadosPessoais?.cpf && (
                              <>
                                <span>•</span>
                                <span>{c.dadosPessoais.cpf}</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Coluna 2: Profissional Responsável */}
                        <td style={{ padding: '14px 16px' }}>
                          {c.profissionalId?.nome ? (
                            <span style={{ fontSize: '0.80rem', fontWeight: 600, color: 'var(--text-main)' }}>
                              {c.profissionalId.nome}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Não definido
                            </span>
                          )}
                        </td>

                        {/* Coluna 3: Plano & Vencimento */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 650, color: 'var(--text-main)', fontSize: '0.82rem' }}>
                            {c.dadosComerciais?.planoId?.nome || c.dadosComerciais?.plano || 'Personalizado'}
                          </div>
                          <div style={{ fontSize: '0.76rem', marginTop: '2px', ...planObj.style }}>
                            {planObj.icon} {planObj.displayVal}
                          </div>
                        </td>

                        {/* Coluna 4: Avaliação Física */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontSize: '0.80rem', fontWeight: 650, ...asObj.style }}>
                            {asObj.icon} {asObj.displayVal}
                          </div>
                        </td>

                        {/* Coluna 5: Teste de Força */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontSize: '0.80rem', fontWeight: 650, ...stObj.style }}>
                            {stObj.icon} {stObj.displayVal}
                          </div>
                        </td>

                        {/* Coluna 6: Rotina Semanal */}
                        <td style={{ padding: '14px 16px' }}>
                          {rotinaDias.length > 0 ? (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {rotinaDias.slice(0, contractFreq).map((d: any, dIdx: number) => {
                                const isManual = d.servico === 'Terapia Manual';
                                const isIndividual = d.servico === 'Atendimento Individual';
                                const isMonitorado = d.servico === 'Treino Monitorado';
                                const badgeColor = isManual ? '#38bdf8' : (isIndividual ? '#c084fc' : (isMonitorado ? '#10b981' : '#f59e0b'));
                                const badgeBg = isManual ? 'rgba(56, 189, 248, 0.15)' : (isIndividual ? 'rgba(192, 132, 252, 0.15)' : (isMonitorado ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'));
                                const shortLabel = isManual ? 'Manual' : (isIndividual ? 'Individual' : (isMonitorado ? 'Monitorado' : (d.servico === 'Treino Livre' ? 'Livre' : (d.servico || 'Treino'))));

                                return (
                                  <span
                                    key={dIdx}
                                    style={{
                                      background: badgeBg,
                                      color: badgeColor,
                                      border: `1px solid ${badgeColor}40`,
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      fontSize: '0.68rem',
                                      fontWeight: 750
                                    }}
                                  >
                                    D{dIdx + 1}: {shortLabel}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem', fontStyle: 'italic' }}>
                              Sem rotina
                            </span>
                          )}
                        </td>

                        {/* Coluna 7: Risco */}
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            background: risk.color + '22',
                            color: risk.color,
                            border: `1px solid ${risk.color}55`,
                            padding: '3px 8px',
                            borderRadius: '8px',
                            fontSize: '0.70rem',
                            fontWeight: 800,
                            whiteSpace: 'nowrap'
                          }}>
                            {risk.level}
                          </span>
                        </td>

                        {/* Coluna 8: Ações */}
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{ padding: '5px 10px', fontSize: '0.78rem', borderRadius: '8px', fontWeight: 700 }}
                              onClick={() => onOpenDossier(c)}
                              title="Visualizar Dossiê do Aluno"
                            >
                              <i className="fa-solid fa-address-card"></i> Dossiê
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '5px 10px', fontSize: '0.78rem', borderRadius: '8px', fontWeight: 700 }}
                              onClick={() => onOpenWorkout(c)}
                              title="Montar ou editar ficha de treino"
                            >
                              <i className="fa-solid fa-dumbbell"></i> Treino
                            </button>
                            {onOpenTrancamento && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '5px 10px', fontSize: '0.78rem', borderRadius: '8px', fontWeight: 700, borderColor: 'rgba(56, 189, 248, 0.3)', color: '#38bdf8' }}
                                onClick={() => onOpenTrancamento(c)}
                                title="Lançar trancamento de plano"
                              >
                                <i className="fa-solid fa-snowflake"></i> Trancar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginação Tabela */}
          <div style={{ marginTop: '20px' }}>
            <Pagination
              currentPage={curPage}
              totalItems={sortedClients.length}
              itemsPerPage={pageSize}
              onPageChange={page => setCurrentPage(page)}
            />
          </div>
        </>
      )}
    </>
  );
}
