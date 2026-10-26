'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface ClientItem {
  id: string;
  nome: string;
  planoNome: string;
  statusPlano: string;
  habilitado: boolean;
  atualizadoEm?: string | null;
  atualizadoPor?: string;
}

interface Metrics {
  total: number;
  totalSinalizados: number;
  totalNaoSinalizados: number;
}

export default function RelatoriosMensaisPanel() {
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [selectedPlan, setSelectedPlan] = useState<string>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3000);
  };

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/relatorio-mensal', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.clients)) {
        setClients(json.clients);
      } else {
        console.error('Erro ao buscar clientes:', json.error);
      }
    } catch (err) {
      console.error('Erro na requisição:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Alternar sinalização individual (1 clique otimista)
  const handleToggle = async (client: ClientItem) => {
    const nextState = !client.habilitado;
    const clientId = client.id;

    // Atualização otimista imediata na UI
    setClients(prev =>
      prev.map(c => (c.id === clientId ? { ...c, habilitado: nextState } : c))
    );
    setTogglingId(clientId);

    try {
      const res = await fetch('/api/admin/relatorio-mensal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, habilitado: nextState })
      });
      const data = await res.json();
      if (!data.success) {
        // Reverter em caso de falha
        setClients(prev =>
          prev.map(c => (c.id === clientId ? { ...c, habilitado: !nextState } : c))
        );
        alert('Erro ao atualizar: ' + (data.error || 'Falha na rede.'));
      } else {
        showToast(`${client.nome}: ${nextState ? 'Marcado para receber relatório' : 'Removido da lista'}`);
      }
    } catch (err: any) {
      // Reverter
      setClients(prev =>
        prev.map(c => (c.id === clientId ? { ...c, habilitado: !nextState } : c))
      );
      alert('Erro ao conectar com o servidor: ' + err.message);
    } finally {
      setTogglingId(null);
    }
  };

  // Obter lista única de planos para o seletor
  const planOptions = useMemo(() => {
    const set = new Set<string>();
    clients.forEach(c => {
      if (c.planoNome) set.add(c.planoNome);
    });
    return Array.from(set).sort();
  }, [clients]);

  // Filtragem dos clientes
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      // Filtro de texto por nome
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (!c.nome.toLowerCase().includes(q)) return false;
      }

      // Filtro por status de sinalização
      if (filterMode === 'enabled' && !c.habilitado) return false;
      if (filterMode === 'disabled' && c.habilitado) return false;

      // Filtro por plano
      if (selectedPlan !== 'all' && c.planoNome !== selectedPlan) return false;

      return true;
    });
  }, [clients, searchQuery, filterMode, selectedPlan]);

  // Métricas dinâmicas em tempo real
  const metrics = useMemo<Metrics>(() => {
    const total = clients.length;
    const totalSinalizados = clients.filter(c => c.habilitado).length;
    const totalNaoSinalizados = total - totalSinalizados;
    return { total, totalSinalizados, totalNaoSinalizados };
  }, [clients]);

  // Ação em massa para marcar/desmarcar todos os filtrados
  const handleBulkToggle = async (enable: boolean) => {
    const targetIds = filteredClients
      .filter(c => c.habilitado !== enable)
      .map(c => c.id);

    if (targetIds.length === 0) {
      alert(enable ? 'Todos os alunos filtrados já estão marcados.' : 'Todos os alunos filtrados já estão desmarcados.');
      return;
    }

    const confirmMsg = enable
      ? `Deseja MARCAR todos os ${targetIds.length} alunos filtrados para receber o relatório mensal?`
      : `Deseja DESMARCAR todos os ${targetIds.length} alunos filtrados?`;

    if (!window.confirm(confirmMsg)) return;

    setBulkLoading(true);

    // Otimista
    setClients(prev =>
      prev.map(c => (targetIds.includes(c.id) ? { ...c, habilitado: enable } : c))
    );

    try {
      const res = await fetch('/api/admin/relatorio-mensal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientIds: targetIds, habilitado: enable })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${targetIds.length} alunos atualizados com sucesso!`);
      } else {
        fetchClients();
        alert('Erro ao atualizar em massa: ' + (data.error || 'Falha no processamento.'));
      }
    } catch (err: any) {
      fetchClients();
      alert('Erro de conexão: ' + err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  const getPlanBadgeStyle = (plano: string) => {
    const lower = plano.toLowerCase();
    if (lower.includes('monitorado')) {
      return { bg: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
    }
    if (lower.includes('personalizado')) {
      return { bg: 'rgba(168, 85, 247, 0.12)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' };
    }
    if (lower.includes('protocolo')) {
      return { bg: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
    }
    return { bg: 'rgba(148, 163, 184, 0.12)', color: '#cbd5e1', border: 'rgba(148, 163, 184, 0.3)' };
  };

  const percentSinalizados = metrics.total > 0 ? Math.round((metrics.totalSinalizados / metrics.total) * 100) : 0;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '10px 0 40px 0', color: '#f8fafc' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          fontSize: '0.88rem',
          fontWeight: 600,
          boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <i className="fa-solid fa-check-circle fa-lg"></i>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{
              margin: 0,
              fontSize: '1.65rem',
              fontWeight: 800,
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Sinalização de Relatórios Mensais
            </h1>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '3px 8px',
              borderRadius: '6px'
            }}>
              Exclusivo Admin
            </span>
          </div>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
            Marque com um clique quais clientes irão receber o relatório mensal de acompanhamento.
          </p>
        </div>

        <button
          onClick={fetchClients}
          disabled={loading}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#cbd5e1',
            padding: '9px 16px',
            borderRadius: '8px',
            fontSize: '0.84rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`} style={{ color: '#10b981' }}></i>
          Atualizar Lista
        </button>
      </div>

      {/* Cards de Métricas no Topo */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Total de Alunos */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(56, 189, 248, 0.12)',
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem'
          }}>
            <i className="fa-solid fa-users"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total de Clientes
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', fontFamily: 'Outfit, sans-serif' }}>
              {loading ? '—' : metrics.total}
            </div>
          </div>
        </div>

        {/* Irão Receber */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.75) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: '12px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.35rem'
            }}>
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: '#86efac', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Irão Receber Relatório
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', fontFamily: 'Outfit, sans-serif' }}>
                {loading ? '—' : metrics.totalSinalizados}
              </div>
            </div>
          </div>
          <span style={{
            background: 'rgba(16, 185, 129, 0.25)',
            color: '#a7f3d0',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '0.82rem',
            fontWeight: 800
          }}>
            {percentSinalizados}%
          </span>
        </div>

        {/* Não Irão Receber */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(148, 163, 184, 0.12)',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem'
          }}>
            <i className="fa-solid fa-circle-xmark"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Não Irão Receber
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#cbd5e1', fontFamily: 'Outfit, sans-serif' }}>
              {loading ? '—' : metrics.totalNaoSinalizados}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Ferramentas */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px'
      }}>
        {/* Campo de Busca por Nome */}
        <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 300px' }}>
          <i className="fa-solid fa-magnifying-glass" style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#64748b',
            fontSize: '0.88rem'
          }}></i>
          <input
            type="text"
            placeholder="Buscar por nome do aluno..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 34px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '0.88rem',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>

        {/* Filtro por Sinalização */}
        <div style={{ display: 'inline-flex', background: 'rgba(255, 255, 255, 0.04)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            onClick={() => setFilterMode('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: filterMode === 'all' ? '#334155' : 'transparent',
              color: filterMode === 'all' ? '#ffffff' : '#94a3b8',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Todos ({metrics.total})
          </button>
          <button
            onClick={() => setFilterMode('enabled')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: filterMode === 'enabled' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
              color: filterMode === 'enabled' ? '#86efac' : '#94a3b8',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
            Irão Receber ({metrics.totalSinalizados})
          </button>
          <button
            onClick={() => setFilterMode('disabled')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: filterMode === 'disabled' ? '#334155' : 'transparent',
              color: filterMode === 'disabled' ? '#ffffff' : '#94a3b8',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Não Irão Receber ({metrics.totalNaoSinalizados})
          </button>
        </div>

        {/* Filtro por Plano Contratado */}
        <select
          value={selectedPlan}
          onChange={e => setSelectedPlan(e.target.value)}
          style={{
            padding: '8px 12px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: '#cbd5e1',
            fontSize: '0.84rem',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="all" style={{ background: '#0f172a', color: '#fff' }}>Todos os Planos</option>
          {planOptions.map(p => (
            <option key={p} value={p} style={{ background: '#0f172a', color: '#fff' }}>{p}</option>
          ))}
        </select>

        {/* Ações em Massa */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => handleBulkToggle(true)}
            disabled={bulkLoading || filteredClients.length === 0}
            title="Marcar todos os alunos exibidos para receber relatório"
            style={{
              padding: '7px 12px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#86efac',
              borderRadius: '7px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fa-solid fa-check-double"></i> Marcar Todos
          </button>
          <button
            onClick={() => handleBulkToggle(false)}
            disabled={bulkLoading || filteredClients.length === 0}
            title="Desmarcar todos os alunos exibidos"
            style={{
              padding: '7px 12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#fca5a5',
              borderRadius: '7px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fa-solid fa-xmark"></i> Desmarcar Todos
          </button>
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
                fontSize: '0.76rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <th style={{ padding: '14px 20px', fontWeight: 700 }}>Nome do Aluno</th>
                <th style={{ padding: '14px 20px', fontWeight: 700 }}>Plano Contratado</th>
                <th style={{ padding: '14px 20px', fontWeight: 700, width: '130px', textAlign: 'center' }}>Status do Plano</th>
                <th style={{ padding: '14px 24px', fontWeight: 700, width: '220px', textAlign: 'center' }}>Receber Relatório Mensal</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ color: '#10b981', marginBottom: '10px', display: 'block' }}></i>
                    Carregando alunos e planos contratados...
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    <i className="fa-solid fa-inbox fa-2x" style={{ color: '#475569', marginBottom: '10px', display: 'block' }}></i>
                    Nenhum aluno encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client, idx) => {
                  const badge = getPlanBadgeStyle(client.planoNome);
                  const isToggling = togglingId === client.id;
                  const isAtivo = client.statusPlano === 'ativo' || client.statusPlano === 'assinado';

                  return (
                    <tr
                      key={client.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        background: client.habilitado ? 'rgba(16, 185, 129, 0.03)' : (idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)'),
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Nome do Aluno (somente nome, sem avatar) */}
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: '#f8fafc', fontSize: '0.92rem' }}>
                        {client.nome}
                      </td>

                      {/* Plano Contratado */}
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`
                        }}>
                          {client.planoNome}
                        </span>
                      </td>

                      {/* Status do Plano */}
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          background: isAtivo ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                          color: isAtivo ? '#86efac' : '#cbd5e1'
                        }}>
                          {client.statusPlano}
                        </span>
                      </td>

                      {/* Switch Liga/Desliga Interativo em 1 clique */}
                      <td style={{ padding: '14px 24px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={client.habilitado}
                            onClick={() => handleToggle(client)}
                            disabled={isToggling}
                            style={{
                              position: 'relative',
                              width: '48px',
                              height: '26px',
                              borderRadius: '13px',
                              border: 'none',
                              background: client.habilitado ? '#10b981' : '#334155',
                              cursor: isToggling ? 'wait' : 'pointer',
                              transition: 'background 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                              outline: 'none',
                              padding: '2px',
                              opacity: isToggling ? 0.6 : 1
                            }}
                          >
                            <span style={{
                              display: 'block',
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              background: '#ffffff',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                              transform: client.habilitado ? 'translateX(22px)' : 'translateX(0px)',
                              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}></span>
                          </button>

                          <span style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            minWidth: '70px',
                            textAlign: 'left',
                            color: client.habilitado ? '#10b981' : '#64748b'
                          }}>
                            {client.habilitado ? 'Sim' : 'Não'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da Tabela */}
        <div style={{
          padding: '12px 20px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem',
          color: '#64748b'
        }}>
          <span>Exibindo <strong>{filteredClients.length}</strong> de <strong>{metrics.total}</strong> clientes</span>
          <span>{metrics.totalSinalizados} marcados para relatório</span>
        </div>
      </div>
    </div>
  );
}
