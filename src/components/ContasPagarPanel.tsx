'use client';

import React, { useState, useMemo } from 'react';
import { formatCurrencyBRL } from '@/utils/currencyMask';
import SmartSearchInput from './SmartSearchInput';
import { smartSearchMatch } from '@/utils/smartSearch';
import Pagination from './Pagination';

interface ContasPagarPanelProps {
  financials: any[];
  fetchData: (silent?: boolean) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export default function ContasPagarPanel({
  financials,
  fetchData,
  selectedMonth,
  setSelectedMonth,
  onNavigateTab
}: ContasPagarPanelProps) {
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [costTypeFilter, setCostTypeFilter] = useState<string>('todos'); // 'todos' | 'fixo' | 'variavel'
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form Fields
  const [descricao, setDescricao] = useState<string>('');
  const [categoria, setCategoria] = useState<string>('Aluguel');
  const [tipoCusto, setTipoCusto] = useState<'fixo' | 'variavel'>('fixo');
  const [centroCusto, setCentroCusto] = useState<string>('operacional');
  const [fornecedor, setFornecedor] = useState<string>('');
  const [valor, setValor] = useState<string>('');
  const [vencimento, setVencimento] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<string>('Pendente');
  const [formaPagamento, setFormaPagamento] = useState<string>('Pix');
  const [dataPagamento, setDataPagamento] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [anexoUrl, setAnexoUrl] = useState<string>('');
  const [recorrente, setRecorrente] = useState<boolean>(false);
  const [recorrenciaMeses, setRecorrenciaMeses] = useState<number>(12);
  const [saving, setSaving] = useState<boolean>(false);

  // Quick Pay Modal State
  const [quickPayItem, setQuickPayItem] = useState<any>(null);
  const [quickPayData, setQuickPayData] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [quickPayForma, setQuickPayForma] = useState<string>('Pix');
  const [quickPaySaving, setQuickPaySaving] = useState<boolean>(false);

  const categories = [
    'Aluguel & Condomínio',
    'Energia & Água',
    'Internet & Telefonia',
    'Softwares & Sistemas',
    'Folha de Pagamento',
    'Prestadores de Serviço',
    'Manutenção & Equipamentos',
    'Marketing & Tráfego',
    'Limpeza & Higiene',
    'Impostos & Taxas',
    'Contabilidade & Jurídico',
    'Outros'
  ];

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingItem(null);
    setDescricao('');
    setCategoria('Aluguel & Condomínio');
    setTipoCusto('fixo');
    setCentroCusto('operacional');
    setFornecedor('');
    setValor('');
    setVencimento(new Date().toISOString().split('T')[0]);
    setStatus('Pendente');
    setFormaPagamento('Pix');
    setDataPagamento('');
    setObservacoes('');
    setAnexoUrl('');
    setRecorrente(false);
    setRecorrenciaMeses(12);
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: any) => {
    setModalMode('edit');
    setEditingItem(item);
    setDescricao(item.descricao || '');
    setCategoria(item.categoria || 'Outros');
    setTipoCusto(item.tipo_custo || 'fixo');
    setCentroCusto(item.centro_custo || 'operacional');
    setFornecedor(item.fornecedor || '');
    setValor(item.valor ? String(item.valor) : '');
    setVencimento(item.vencimento ? item.vencimento.split('T')[0] : '');
    setStatus(item.status || 'Pendente');
    setFormaPagamento(item.forma_pagamento || 'Pix');
    setDataPagamento(item.data_pagamento ? item.data_pagamento.split('T')[0] : '');
    setObservacoes(item.observacoes || '');
    setAnexoUrl(item.anexo_url || '');
    setRecorrente(false);
    setShowModal(true);
  };

  // Save Modal
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim() || !valor || !vencimento) {
      alert('Preencha a descrição, valor e data de vencimento.');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        descricao: descricao.trim(),
        categoria,
        tipo_custo: tipoCusto,
        centro_custo: centroCusto,
        fornecedor: fornecedor.trim(),
        valor: parseFloat(valor.replace(',', '.')),
        vencimento,
        status,
        forma_pagamento: formaPagamento,
        data_pagamento: status === 'Pago' ? (dataPagamento || vencimento) : '',
        observacoes: observacoes.trim(),
        comprovante: anexoUrl.trim(),
        recorrente,
        recorrencia_meses: recorrenciaMeses
      };

      let res;
      if (modalMode === 'create') {
        res = await fetch('/api/financial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        payload.id = editingItem._id;
        res = await fetch('/api/financial', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchData();
      } else {
        alert('Erro ao salvar: ' + (data.error || 'Falha na requisição'));
      }
    } catch (err: any) {
      alert('Erro de conexão: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Quick Pay Submit
  const handleConfirmQuickPay = async () => {
    if (!quickPayItem) return;
    setQuickPaySaving(true);
    try {
      const res = await fetch('/api/financial', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: quickPayItem._id,
          action: 'dar_baixa',
          data_pagamento: quickPayData,
          forma_pagamento: quickPayForma
        })
      });
      const data = await res.json();
      if (data.success) {
        setQuickPayItem(null);
        fetchData();
      } else {
        alert('Erro ao dar baixa: ' + (data.error || 'Falha na requisição'));
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
    } finally {
      setQuickPaySaving(false);
    }
  };

  // Delete Item
  const handleDelete = async (item: any) => {
    if (!confirm(`Deseja realmente excluir o lançamento "${item.descricao}" no valor de R$ ${formatCurrencyBRL(item.valor)}?`)) return;
    try {
      const res = await fetch(`/api/financial?id=${item._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert('Erro ao excluir: ' + (data.error || 'Falha na requisição'));
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  // Filter and KPIs calculations
  const { filteredList, kpis } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    // Filter by selected month first
    const monthItems = financials.filter(f => {
      const v = (f.vencimento || '').split('T')[0];
      const comp = f.competencia || v.substring(0, 7);
      return comp === selectedMonth || v.startsWith(selectedMonth);
    });

    // Calculate month KPIs
    const totalPago = monthItems.filter(f => f.status === 'Pago').reduce((s, f) => s + Number(f.valor || 0), 0);
    const totalPendente = monthItems.filter(f => f.status === 'Pendente' && f.vencimento >= todayStr).reduce((s, f) => s + Number(f.valor || 0), 0);
    const totalAtrasado = monthItems.filter(f => f.status === 'Pendente' && f.vencimento < todayStr).reduce((s, f) => s + Number(f.valor || 0), 0);
    const totalFixas = monthItems.filter(f => f.tipo_custo === 'fixo').reduce((s, f) => s + Number(f.valor || 0), 0);
    const totalVariaveis = monthItems.filter(f => f.tipo_custo === 'variavel').reduce((s, f) => s + Number(f.valor || 0), 0);
    const totalGeral = totalPago + totalPendente + totalAtrasado;

    // Apply secondary filters
    const filtered = monthItems.filter(f => {
      const v = (f.vencimento || '').split('T')[0];

      if (statusFilter === 'pago' && f.status !== 'Pago') return false;
      if (statusFilter === 'pendente' && (f.status !== 'Pendente' || v < todayStr)) return false;
      if (statusFilter === 'atrasado' && (f.status !== 'Pendente' || v >= todayStr)) return false;
      if (statusFilter === 'hoje' && (f.status !== 'Pendente' || v !== todayStr)) return false;

      if (categoryFilter && f.categoria !== categoryFilter) return false;
      if (costTypeFilter !== 'todos' && f.tipo_custo !== costTypeFilter) return false;

      if (searchQuery.trim()) {
        const match = smartSearchMatch([f.descricao, f.categoria, f.fornecedor, f.forma_pagamento, f.observacoes], searchQuery);
        if (!match) return false;
      }

      return true;
    });

    return {
      filteredList: filtered,
      kpis: {
        totalPago,
        totalPendente,
        totalAtrasado,
        totalFixas,
        totalVariaveis,
        totalGeral,
        countAtrasados: monthItems.filter(f => f.status === 'Pendente' && f.vencimento < todayStr).length,
        countHoje: monthItems.filter(f => f.status === 'Pendente' && f.vencimento === todayStr).length
      }
    };
  }, [financials, selectedMonth, statusFilter, categoryFilter, costTypeFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedList = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatDateDisplay = (dStr: string) => {
    if (!dStr) return '-';
    const clean = dStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dStr;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Alertas de Urgência (Atrasados e Vencendo Hoje) */}
      {(kpis.countAtrasados > 0 || kpis.countHoje > 0) && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {kpis.countAtrasados > 0 && (
            <div
              onClick={() => setStatusFilter('atrasado')}
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '12px',
                padding: '12px 18px',
                flex: 1,
                minWidth: '240px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <strong style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  {kpis.countAtrasados} conta(s) em ATRASO
                </strong>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Total: <strong style={{ color: '#f87171' }}>R$ {formatCurrencyBRL(kpis.totalAtrasado)}</strong>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>Filtrar →</span>
            </div>
          )}

          {kpis.countHoje > 0 && (
            <div
              onClick={() => setStatusFilter('hoje')}
              style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: '12px',
                padding: '12px 18px',
                flex: 1,
                minWidth: '240px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <strong style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-clock"></i>
                  {kpis.countHoje} conta(s) vencem HOJE
                </strong>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Atenção para liquidação na data corrente.
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700 }}>Filtrar →</span>
            </div>
          )}
        </div>
      )}

      {/* 2. Top Header com Navegação de Mês & Ações */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '16px 20px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handlePrevMonth}
            style={{ padding: '8px 12px', borderRadius: '8px' }}
            title="Mês Anterior"
          >
            <i className="fa-solid fa-chevron-left"></i>
          </button>

          <input
            type="month"
            className="form-control"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ fontWeight: 700, textAlign: 'center', minWidth: '150px' }}
          />

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleNextMonth}
            style={{ padding: '8px 12px', borderRadius: '8px' }}
            title="Próximo Mês"
          >
            <i className="fa-solid fa-chevron-right"></i>
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCurrentMonth}
            style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700 }}
          >
            Mês Atual
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreateModal}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fa-solid fa-plus"></i> Novo Lançamento
          </button>
        </div>
      </div>

      {/* 3. Cards de Resumo Executivo das Despesas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px'
      }}>
        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '14px', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#10b981', fontWeight: 700 }}>Total Pago (Mês)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            R$ {formatCurrencyBRL(kpis.totalPago)}
          </div>
        </div>

        <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '14px', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#f59e0b', fontWeight: 700 }}>A Pagar / Pendente</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
            R$ {formatCurrencyBRL(kpis.totalPendente)}
          </div>
        </div>

        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '14px', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#ef4444', fontWeight: 700 }}>Em Atraso</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>
            R$ {formatCurrencyBRL(kpis.totalAtrasado)}
          </div>
        </div>

        <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '14px', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#a855f7', fontWeight: 700 }}>Total Previsto (Mês)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#c084fc', marginTop: '4px' }}>
            R$ {formatCurrencyBRL(kpis.totalGeral)}
          </div>
        </div>
      </div>

      {/* 4. Filtros Avançados & Pílulas de Status */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '14px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        {/* Pílulas de Status */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600, marginRight: '4px' }}>Status:</span>
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'pendente', label: 'Pendentes' },
            { id: 'pago', label: 'Pagos' },
            { id: 'atrasado', label: 'Em Atraso' },
            { id: 'hoje', label: 'Vencem Hoje' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setStatusFilter(tab.id); setCurrentPage(1); }}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: statusFilter === tab.id ? '1px solid var(--color-primary)' : '1px solid rgba(255, 255, 255, 0.1)',
                background: statusFilter === tab.id ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.04)',
                color: statusFilter === tab.id ? '#ffffff' : '#cbd5e1',
                fontWeight: statusFilter === tab.id ? 800 : 600,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Linha de Busca e Seletores de Categoria / Tipo */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 240px' }}>
            <SmartSearchInput
              placeholder="Buscar por descrição, fornecedor, categoria..."
              value={searchQuery}
              onChange={val => { setSearchQuery(val); setCurrentPage(1); }}
            />
          </div>

          <select
            className="select-custom"
            style={{ minWidth: '180px' }}
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="">Todas as Categorias</option>
            {categories.map((c, idx) => (
              <option key={idx} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="select-custom"
            style={{ minWidth: '140px' }}
            value={costTypeFilter}
            onChange={e => { setCostTypeFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="todos">Todos os Custos</option>
            <option value="fixo">Custos Fixos</option>
            <option value="variavel">Custos Variáveis</option>
          </select>
        </div>
      </div>

      {/* 5. Tabela de Lançamentos */}
      <div className="content-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.04)', textAlign: 'left' }}>
                <th style={{ padding: '14px 16px' }}>Descrição & Fornecedor</th>
                <th style={{ padding: '14px 16px' }}>Categoria / Tipo</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Valor (R$)</th>
                <th style={{ padding: '14px 16px' }}>Vencimento</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '14px 16px' }}>Pagamento</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>
                    <i className="fa-solid fa-receipt" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block', opacity: 0.5 }}></i>
                    Nenhuma conta a pagar encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paginatedList.map((f: any) => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isAtrasado = f.status === 'Pendente' && f.vencimento < todayStr;
                  const isHoje = f.status === 'Pendente' && f.vencimento === todayStr;

                  return (
                    <tr key={f._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      {/* Descrição */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem' }}>{f.descricao}</div>
                        {f.fornecedor && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                            <i className="fa-solid fa-building" style={{ marginRight: '4px' }}></i>
                            {f.fornecedor}
                          </div>
                        )}
                      </td>

                      {/* Categoria & Tipo */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                            {f.categoria}
                          </span>
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: f.tipo_custo === 'fixo' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            color: f.tipo_custo === 'fixo' ? '#38bdf8' : '#f59e0b',
                            fontWeight: 700
                          }}>
                            {f.tipo_custo === 'fixo' ? 'FIXO' : 'VARIÁVEL'}
                          </span>
                        </div>
                      </td>

                      {/* Valor */}
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: '#f8fafc', fontSize: '0.92rem' }}>
                        R$ {formatCurrencyBRL(f.valor)}
                      </td>

                      {/* Vencimento */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: isAtrasado ? '#ef4444' : isHoje ? '#f59e0b' : '#cbd5e1' }}>
                          {formatDateDisplay(f.vencimento)}
                        </div>
                        {isAtrasado && (
                          <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>
                            Atrasado
                          </div>
                        )}
                        {isHoje && (
                          <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700 }}>
                            Vence hoje
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          background: f.status === 'Pago' ? 'rgba(16, 185, 129, 0.15)' : isAtrasado ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: f.status === 'Pago' ? '#10b981' : isAtrasado ? '#ef4444' : '#f59e0b',
                          border: f.status === 'Pago' ? '1px solid rgba(16, 185, 129, 0.3)' : isAtrasado ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                        }}>
                          {f.status === 'Pago' ? 'PAGO' : isAtrasado ? 'ATRASADO' : 'PENDENTE'}
                        </span>
                      </td>

                      {/* Pagamento */}
                      <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                        {f.status === 'Pago' ? (
                          <div>
                            <div style={{ color: '#10b981', fontWeight: 600 }}>{formatDateDisplay(f.data_pagamento)}</div>
                            <div style={{ fontSize: '0.72rem' }}>{f.forma_pagamento || 'Pix'}</div>
                          </div>
                        ) : (
                          <span>-</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                          {f.status !== 'Pago' && (
                            <button
                              type="button"
                              onClick={() => {
                                setQuickPayItem(f);
                                setQuickPayData(new Date().toISOString().split('T')[0]);
                                setQuickPayForma(f.forma_pagamento || 'Pix');
                              }}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                background: '#10b981',
                                color: '#ffffff',
                                fontWeight: 700,
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Dar Baixa (Registrar Pagamento)"
                            >
                              <i className="fa-solid fa-check"></i> Baixar
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(f)}
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: '#cbd5e1',
                              cursor: 'pointer'
                            }}
                            title="Editar Lançamento"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(f)}
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              background: 'rgba(239, 68, 68, 0.08)',
                              color: '#ef4444',
                              cursor: 'pointer'
                            }}
                            title="Excluir Lançamento"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {filteredList.length > pageSize && (
          <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
            <Pagination
              currentPage={currentPage}
              totalItems={filteredList.length}
              itemsPerPage={pageSize}
              onPageChange={page => setCurrentPage(page)}
            />
          </div>
        )}
      </div>

      {/* MODAL: Criar / Editar Lançamento */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-receipt" style={{ color: 'var(--color-primary)' }}></i>
                {modalMode === 'create' ? 'Novo Lançamento a Pagar' : 'Editar Lançamento'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  Descrição da Conta / Despesa *
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Aluguel Unidade Buritis, Conta de Energia, etc."
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                    Categoria *
                  </label>
                  <select
                    className="select-custom"
                    value={categoria}
                    onChange={e => setCategoria(e.target.value)}
                    required
                  >
                    {categories.map((c, idx) => (
                      <option key={idx} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                    Tipo de Custo
                  </label>
                  <select
                    className="select-custom"
                    value={tipoCusto}
                    onChange={e => setTipoCusto(e.target.value as any)}
                  >
                    <option value="fixo">Custo Fixo (Recorrente)</option>
                    <option value="variavel">Custo Variável / Eventual</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                    Fornecedor / Beneficiário
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ex: Imobiliária, Cemig, Google..."
                    value={fornecedor}
                    onChange={e => setFornecedor(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                    Valor (R$) *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="0,00"
                    value={valor}
                    onChange={e => setValor(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                    Data de Vencimento *
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={vencimento}
                    onChange={e => setVencimento(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                    Status
                  </label>
                  <select
                    className="select-custom"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Pago">Pago (Liquidado)</option>
                  </select>
                </div>
              </div>

              {status === 'Pago' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(16, 185, 129, 0.05)', padding: '12px', borderRadius: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                      Data do Pagamento
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={dataPagamento}
                      onChange={e => setDataPagamento(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                      Forma de Pagamento
                    </label>
                    <select
                      className="select-custom"
                      value={formaPagamento}
                      onChange={e => setFormaPagamento(e.target.value)}
                    >
                      <option value="Pix">Pix</option>
                      <option value="Boleto">Boleto</option>
                      <option value="Cartão de Crédito">Cartão de Crédito</option>
                      <option value="Transferência">Transferência Bancária</option>
                      <option value="Dinheiro">Dinheiro</option>
                    </select>
                  </div>
                </div>
              )}

              {modalMode === 'create' && (
                <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px', borderRadius: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                    <input
                      type="checkbox"
                      checked={recorrente}
                      onChange={e => setRecorrente(e.target.checked)}
                    />
                    Repetir lançamento nos próximos meses (Recorrência)
                  </label>
                  {recorrente && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Criar para os próximos:</span>
                      <input
                        type="number"
                        min={1}
                        max={36}
                        className="form-control"
                        style={{ width: '80px', padding: '4px 8px' }}
                        value={recorrenciaMeses}
                        onChange={e => setRecorrenciaMeses(Number(e.target.value))}
                      />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>meses</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  Observações / Detalhes
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Observações adicionais, chave pix ou código de barras..."
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ fontWeight: 800 }}
                >
                  {saving ? 'Salvando...' : modalMode === 'create' ? 'Salvar Lançamento' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Baixa Rápida */}
      {quickPayItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#0f172a',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-check-circle"></i> Confirmar Baixa / Pagamento
              </h3>
              <button
                type="button"
                onClick={() => setQuickPayItem(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>{quickPayItem.descricao}</div>
              <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 800, marginTop: '2px' }}>
                Valor: R$ {formatCurrencyBRL(quickPayItem.valor)}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  Data da Liquidação / Pagamento
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={quickPayData}
                  onChange={e => setQuickPayData(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  Forma de Pagamento
                </label>
                <select
                  className="select-custom"
                  value={quickPayForma}
                  onChange={e => setQuickPayForma(e.target.value)}
                >
                  <option value="Pix">Pix</option>
                  <option value="Boleto">Boleto</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Transferência">Transferência Bancária</option>
                  <option value="Dinheiro">Dinheiro</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setQuickPayItem(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmQuickPay}
                  disabled={quickPaySaving}
                  style={{ background: '#10b981', border: 'none', fontWeight: 800 }}
                >
                  {quickPaySaving ? 'Confirmando...' : 'Confirmar Quitação'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
