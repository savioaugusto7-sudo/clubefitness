'use client';

import React, { useState, useMemo } from 'react';
import { formatCurrencyBRL } from '@/utils/currencyMask';

interface FinanceiroBalancoPanelProps {
  clients: any[];
  financials: any[];
  payments: any[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export default function FinanceiroBalancoPanel({
  clients,
  financials,
  payments,
  selectedMonth,
  setSelectedMonth,
  onNavigateTab
}: FinanceiroBalancoPanelProps) {
  const [dreMode, setDreMode] = useState<'sintetico' | 'analitico'>('sintetico');

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(cur);
  };

  const formatMonthTitle = (mStr: string) => {
    if (!mStr || !mStr.includes('-')) return mStr;
    const [y, m] = mStr.split('-').map(Number);
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${months[m - 1]} de ${y}`;
  };

  // 1. Cálculos de Receitas (Mensalidades)
  const financialMetrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    // Receitas filtradas pelo mês selecionado
    const monthPayments = payments.filter(p => {
      const v = (p.vencimento || '').split('T')[0];
      return v.startsWith(selectedMonth);
    });

    const totalRecebido = monthPayments
      .filter(p => p.status === 'Pago')
      .reduce((sum, p) => sum + Number(p.valor || 0), 0);

    const totalPendenteReceber = monthPayments
      .filter(p => p.status === 'Pendente' && p.vencimento >= todayStr)
      .reduce((sum, p) => sum + Number(p.valor || 0), 0);

    const totalEmAtraso = monthPayments
      .filter(p => p.status === 'Pendente' && p.vencimento < todayStr)
      .reduce((sum, p) => sum + Number(p.valor || 0), 0);

    const totalFaturadoMes = totalRecebido + totalPendenteReceber + totalEmAtraso;

    // 2. Cálculos de Despesas (Contas a Pagar)
    const monthExpenses = financials.filter(f => {
      const v = (f.vencimento || '').split('T')[0];
      const comp = f.competencia || v.substring(0, 7);
      return comp === selectedMonth || v.startsWith(selectedMonth);
    });

    const despesasPagas = monthExpenses
      .filter(f => f.status === 'Pago')
      .reduce((sum, f) => sum + Number(f.valor || 0), 0);

    const despesasPendentes = monthExpenses
      .filter(f => f.status !== 'Pago')
      .reduce((sum, f) => sum + Number(f.valor || 0), 0);

    const despesasFixas = monthExpenses
      .filter(f => f.tipo_custo === 'fixo')
      .reduce((sum, f) => sum + Number(f.valor || 0), 0);

    const despesasVariaveis = monthExpenses
      .filter(f => f.tipo_custo === 'variavel')
      .reduce((sum, f) => sum + Number(f.valor || 0), 0);

    const totalDespesasPrevistas = despesasPagas + despesasPendentes;

    // 3. Indicadores de Resultado & DRE
    const resultadoOperacionalRealizado = totalRecebido - despesasPagas;
    const resultadoProjetadoMes = (totalRecebido + totalPendenteReceber) - totalDespesasPrevistas;
    const margemOperacional = totalRecebido > 0 ? (resultadoOperacionalRealizado / totalRecebido) * 100 : 0;
    const taxaInadimplencia = totalFaturadoMes > 0 ? (totalEmAtraso / totalFaturadoMes) * 100 : 0;

    // Alunos ativos
    const activeClients = clients.filter(c => c.dadosComerciais?.status === 'ativo');
    const totalActiveClients = activeClients.length;
    const ticketMedio = totalActiveClients > 0 ? (totalRecebido / totalActiveClients) : 0;

    // Ponto de Equilíbrio (Break-Even): Custos Fixos / Margem de Contribuição %
    const margemContribuicaoPct = totalRecebido > 0 ? Math.max(0.1, (totalRecebido - despesasVariaveis) / totalRecebido) : 1;
    const pontoEquilibrio = despesasFixas > 0 ? (despesasFixas / margemContribuicaoPct) : despesasFixas;

    // Despesas agrupadas por categoria
    const expensesByCategory: Record<string, number> = {};
    monthExpenses.forEach(f => {
      const cat = f.categoria || 'Geral';
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Number(f.valor || 0);
    });

    const expensesCategoryList = Object.entries(expensesByCategory)
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total);

    // Entradas agrupadas por forma de pagamento
    const incomeByMethod: Record<string, number> = {};
    monthPayments.filter(p => p.status === 'Pago').forEach(p => {
      const method = p.formaPagamento || 'Outros';
      incomeByMethod[method] = (incomeByMethod[method] || 0) + Number(p.valor || 0);
    });

    const incomeMethodList = Object.entries(incomeByMethod)
      .map(([method, total]) => ({ method, total }))
      .sort((a, b) => b.total - a.total);

    // Comparativo Histórico de 6 Meses
    const historyMonths = [];
    const [currY, currM] = selectedMonth.split('-').map(Number);
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(currY, currM - 1 - i, 1);
      const mStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
      
      const mPay = payments.filter(p => (p.vencimento || '').startsWith(mStr) && p.status === 'Pago')
        .reduce((sum, p) => sum + Number(p.valor || 0), 0);
      
      const mExp = financials.filter(f => ((f.competencia || f.vencimento || '').startsWith(mStr)) && f.status === 'Pago')
        .reduce((sum, f) => sum + Number(f.valor || 0), 0);

      const mNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      historyMonths.push({
        monthStr: mStr,
        label: `${mNames[targetDate.getMonth()]}/${String(targetDate.getFullYear()).substring(2)}`,
        receita: mPay,
        despesa: mExp,
        saldo: mPay - mExp
      });
    }

    return {
      totalRecebido,
      totalPendenteReceber,
      totalEmAtraso,
      totalFaturadoMes,
      despesasPagas,
      despesasPendentes,
      despesasFixas,
      despesasVariaveis,
      totalDespesasPrevistas,
      resultadoOperacionalRealizado,
      resultadoProjetadoMes,
      margemOperacional,
      taxaInadimplencia,
      totalActiveClients,
      ticketMedio,
      pontoEquilibrio,
      expensesCategoryList,
      incomeMethodList,
      historyMonths
    };
  }, [clients, financials, payments, selectedMonth]);

  const maxHistoricalValue = Math.max(
    ...financialMetrics.historyMonths.map(h => Math.max(h.receita, h.despesa, 1000)),
    1000
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header do Período & Navegação Rápida */}
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
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-scale-balanced" style={{ color: '#10b981', fontSize: '1.4rem' }}></i>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>
              Balanço & DRE Gerencial
            </h2>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Visão consolidada de entradas, custos operacionais, lucratividade e ponto de equilíbrio.
          </div>
        </div>

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
            className="btn btn-primary"
            onClick={handleCurrentMonth}
            style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700 }}
          >
            Mês Atual
          </button>
        </div>
      </div>

      {/* 2. Top KPIs Executivos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        {/* Receita Realizada */}
        <div style={{
          background: 'radial-gradient(circle at top left, rgba(16, 185, 129, 0.15), rgba(15, 23, 42, 0.6))',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#34d399', fontWeight: 700, letterSpacing: '0.5px' }}>
              Receita Realizada (Mês)
            </span>
            <i className="fa-solid fa-circle-arrow-down" style={{ color: '#10b981', fontSize: '1.1rem' }}></i>
          </div>
          <strong style={{ fontSize: '1.8rem', color: '#10b981', fontWeight: 800 }}>
            R$ {formatCurrencyBRL(financialMetrics.totalRecebido)}
          </strong>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
            <span>A Receber: <strong>R$ {formatCurrencyBRL(financialMetrics.totalPendenteReceber)}</strong></span>
            {onNavigateTab && (
              <a href="#mensalidades" onClick={(e) => { e.preventDefault(); onNavigateTab('mensalidades'); }} style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>
                Ver Detalhes →
              </a>
            )}
          </div>
        </div>

        {/* Despesas Pagas */}
        <div style={{
          background: 'radial-gradient(circle at top left, rgba(239, 68, 68, 0.12), rgba(15, 23, 42, 0.6))',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#f87171', fontWeight: 700, letterSpacing: '0.5px' }}>
              Despesas Pagas (Mês)
            </span>
            <i className="fa-solid fa-circle-arrow-up" style={{ color: '#ef4444', fontSize: '1.1rem' }}></i>
          </div>
          <strong style={{ fontSize: '1.8rem', color: '#ef4444', fontWeight: 800 }}>
            R$ {formatCurrencyBRL(financialMetrics.despesasPagas)}
          </strong>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
            <span>A Pagar: <strong>R$ {formatCurrencyBRL(financialMetrics.despesasPendentes)}</strong></span>
            {onNavigateTab && (
              <a href="#contas_pagar" onClick={(e) => { e.preventDefault(); onNavigateTab('contas_pagar'); }} style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>
                Ver Despesas →
              </a>
            )}
          </div>
        </div>

        {/* Resultado Operacional Líquido */}
        <div style={{
          background: financialMetrics.resultadoOperacionalRealizado >= 0
            ? 'radial-gradient(circle at top left, rgba(59, 130, 246, 0.15), rgba(15, 23, 42, 0.6))'
            : 'radial-gradient(circle at top left, rgba(239, 68, 68, 0.2), rgba(15, 23, 42, 0.6))',
          border: financialMetrics.resultadoOperacionalRealizado >= 0
            ? '1px solid rgba(59, 130, 246, 0.35)'
            : '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#60a5fa', fontWeight: 700, letterSpacing: '0.5px' }}>
              Saldo Líquido Realizado
            </span>
            <span style={{
              background: financialMetrics.resultadoOperacionalRealizado >= 0 ? '#065f46' : '#7f1d1d',
              color: '#ffffff',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 800
            }}>
              {financialMetrics.resultadoOperacionalRealizado >= 0 ? 'SUPERÁVIT' : 'DÉFICIT'}
            </span>
          </div>
          <strong style={{
            fontSize: '1.8rem',
            color: financialMetrics.resultadoOperacionalRealizado >= 0 ? '#38bdf8' : '#f87171',
            fontWeight: 800
          }}>
            {financialMetrics.resultadoOperacionalRealizado >= 0 ? '+ ' : '- '}
            R$ {formatCurrencyBRL(Math.abs(financialMetrics.resultadoOperacionalRealizado))}
          </strong>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            Margem Líquida: <strong style={{ color: '#f8fafc' }}>{financialMetrics.margemOperacional.toFixed(1)}%</strong>
          </div>
        </div>

        {/* Projeção de Fechamento do Mês */}
        <div style={{
          background: 'radial-gradient(circle at top left, rgba(139, 92, 246, 0.15), rgba(15, 23, 42, 0.6))',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#c084fc', fontWeight: 700, letterSpacing: '0.5px' }}>
              Projeção de Fechamento
            </span>
            <i className="fa-solid fa-chart-line" style={{ color: '#a855f7', fontSize: '1.1rem' }}></i>
          </div>
          <strong style={{ fontSize: '1.8rem', color: '#c084fc', fontWeight: 800 }}>
            R$ {formatCurrencyBRL(financialMetrics.resultadoProjetadoMes)}
          </strong>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            Inadimplência: <strong style={{ color: financialMetrics.taxaInadimplencia > 5 ? '#ef4444' : '#10b981' }}>{financialMetrics.taxaInadimplencia.toFixed(1)}%</strong>
          </div>
        </div>
      </div>

      {/* 3. Indicadores Estratégicos & Ponto de Equilíbrio */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {/* Ponto de Equilíbrio */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f59e0b',
            fontSize: '1.3rem'
          }}>
            <i className="fa-solid fa-bullseye"></i>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>PONTO DE EQUILÍBRIO (BREAK-EVEN)</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
              R$ {formatCurrencyBRL(financialMetrics.pontoEquilibrio)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Faturamento mínimo para cobrir 100% dos custos fixos.
            </div>
          </div>
        </div>

        {/* Ticket Médio por Aluno */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(56, 189, 248, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8',
            fontSize: '1.3rem'
          }}>
            <i className="fa-solid fa-user-tag"></i>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>TICKET MÉDIO POR ALUNO</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
              R$ {formatCurrencyBRL(financialMetrics.ticketMedio)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Base: {financialMetrics.totalActiveClients} alunos ativos no sistema.
            </div>
          </div>
        </div>

        {/* Proporção de Custos Fixos vs Variáveis */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(168, 85, 247, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#a855f7',
            fontSize: '1.3rem'
          }}>
            <i className="fa-solid fa-layer-group"></i>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>ESTRUTURA DE CUSTOS</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
              Fixos: R$ {formatCurrencyBRL(financialMetrics.despesasFixas)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Variáveis: R$ {formatCurrencyBRL(financialMetrics.despesasVariaveis)}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Gráfico Histórico de Fluxo de Caixa (Últimos 6 Meses) */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
              <i className="fa-solid fa-chart-column" style={{ color: '#38bdf8', marginRight: '8px' }}></i>
              Evolução Financeira (Últimos 6 Meses)
            </h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Comparativo de Receitas Realizadas vs Despesas Liquidadas mês a mês.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981' }}></span>
              <span style={{ color: '#f8fafc' }}>Receita</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ef4444' }}></span>
              <span style={{ color: '#f8fafc' }}>Despesa</span>
            </div>
          </div>
        </div>

        {/* Barras do Gráfico */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${financialMetrics.historyMonths.length}, 1fr)`,
          gap: '16px',
          alignItems: 'flex-end',
          minHeight: '220px',
          paddingTop: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '12px'
        }}>
          {financialMetrics.historyMonths.map((h, idx) => {
            const hReceita = Math.round((h.receita / maxHistoricalValue) * 160);
            const hDespesa = Math.round((h.despesa / maxHistoricalValue) * 160);
            const isSelected = h.monthStr === selectedMonth;

            return (
              <div
                key={idx}
                onClick={() => setSelectedMonth(h.monthStr)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '8px 4px',
                  borderRadius: '10px',
                  background: isSelected ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                  border: isSelected ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Barras Lado a Lado */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '160px' }}>
                  {/* Barra Receita */}
                  <div
                    title={`Receita ${h.label}: R$ ${formatCurrencyBRL(h.receita)}`}
                    style={{
                      width: '18px',
                      height: `${Math.max(6, hReceita)}px`,
                      background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.4s ease'
                    }}
                  />
                  {/* Barra Despesa */}
                  <div
                    title={`Despesa ${h.label}: R$ ${formatCurrencyBRL(h.despesa)}`}
                    style={{
                      width: '18px',
                      height: `${Math.max(6, hDespesa)}px`,
                      background: 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.4s ease'
                    }}
                  />
                </div>

                {/* Rótulo do Mês */}
                <div style={{ fontSize: '0.78rem', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#38bdf8' : '#94a3b8' }}>
                  {h.label}
                </div>

                {/* Saldo Líquido do Mês */}
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: h.saldo >= 0 ? '#10b981' : '#ef4444'
                }}>
                  {h.saldo >= 0 ? '+' : ''}{formatCurrencyBRL(h.saldo)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. DRE Gerencial Sintético / Analítico */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
              <i className="fa-solid fa-file-invoice" style={{ color: '#10b981', marginRight: '8px' }}></i>
              DRE Gerencial - {formatMonthTitle(selectedMonth)}
            </h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Demonstrativo de Resultado do Exercício com estrutura contábil/gerencial.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', background: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setDreMode('sintetico')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: dreMode === 'sintetico' ? 'var(--color-primary)' : 'transparent',
                color: dreMode === 'sintetico' ? '#ffffff' : 'var(--text-dim)',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              Sintético
            </button>
            <button
              type="button"
              onClick={() => setDreMode('analitico')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: dreMode === 'analitico' ? 'var(--color-primary)' : 'transparent',
                color: dreMode === 'analitico' ? '#ffffff' : 'var(--text-dim)',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              Analítico por Categoria
            </button>
          </div>
        </div>

        {/* Tabela DRE */}
        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.04)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.78rem', textTransform: 'uppercase' }}>Linha / Descrição Contábil</th>
                <th style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.78rem', textTransform: 'uppercase', textAlign: 'right' }}>Valor Realizado (R$)</th>
                <th style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.78rem', textTransform: 'uppercase', textAlign: 'right' }}>% da Receita</th>
              </tr>
            </thead>
            <tbody>
              {/* 1. Receita Operacional Bruta */}
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 800, color: '#f8fafc' }}>
                  (+) RECEITA OPERACIONAL BRUTA (FATURAMENTO)
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 800, color: '#10b981', textAlign: 'right' }}>
                  R$ {formatCurrencyBRL(financialMetrics.totalFaturadoMes)}
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#94a3b8', textAlign: 'right' }}>
                  100,0%
                </td>
              </tr>

              {/* Mensalidades Realizadas */}
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', background: 'rgba(16, 185, 129, 0.03)' }}>
                <td style={{ padding: '10px 16px 10px 32px', color: '#cbd5e1', fontSize: '0.85rem' }}>
                  • Mensalidades Pagas pelos Alunos
                </td>
                <td style={{ padding: '10px 16px', color: '#10b981', textAlign: 'right', fontSize: '0.85rem' }}>
                  R$ {formatCurrencyBRL(financialMetrics.totalRecebido)}
                </td>
                <td style={{ padding: '10px 16px', color: '#94a3b8', textAlign: 'right', fontSize: '0.85rem' }}>
                  {financialMetrics.totalFaturadoMes > 0 ? ((financialMetrics.totalRecebido / financialMetrics.totalFaturadoMes) * 100).toFixed(1) : 0}%
                </td>
              </tr>

              {/* Inadimplência / Atrasos */}
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <td style={{ padding: '10px 16px 10px 32px', color: '#f87171', fontSize: '0.85rem' }}>
                  (-) Inadimplência em Atraso no Mês
                </td>
                <td style={{ padding: '10px 16px', color: '#ef4444', textAlign: 'right', fontSize: '0.85rem' }}>
                  - R$ {formatCurrencyBRL(financialMetrics.totalEmAtraso)}
                </td>
                <td style={{ padding: '10px 16px', color: '#f87171', textAlign: 'right', fontSize: '0.85rem' }}>
                  {financialMetrics.taxaInadimplencia.toFixed(1)}%
                </td>
              </tr>

              {/* 2. Receita Líquida Realizada */}
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.03)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 800, color: '#38bdf8' }}>
                  (=) RECEITA OPERACIONAL LÍQUIDA REALIZADA
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 800, color: '#38bdf8', textAlign: 'right' }}>
                  R$ {formatCurrencyBRL(financialMetrics.totalRecebido)}
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#38bdf8', textAlign: 'right' }}>
                  100,0%
                </td>
              </tr>

              {/* 3. Custos Fixos Operacionais */}
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 800, color: '#f8fafc' }}>
                  (-) CUSTOS FIXOS OPERACIONAIS
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 800, color: '#ef4444', textAlign: 'right' }}>
                  - R$ {formatCurrencyBRL(financialMetrics.despesasFixas)}
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#94a3b8', textAlign: 'right' }}>
                  {financialMetrics.totalRecebido > 0 ? ((financialMetrics.despesasFixas / financialMetrics.totalRecebido) * 100).toFixed(1) : 0}%
                </td>
              </tr>

              {/* 4. Custos Variáveis & Folha */}
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 800, color: '#f8fafc' }}>
                  (-) CUSTOS VARIÁVEIS & PRESTADORES
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 800, color: '#ef4444', textAlign: 'right' }}>
                  - R$ {formatCurrencyBRL(financialMetrics.despesasVariaveis)}
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#94a3b8', textAlign: 'right' }}>
                  {financialMetrics.totalRecebido > 0 ? ((financialMetrics.despesasVariaveis / financialMetrics.totalRecebido) * 100).toFixed(1) : 0}%
                </td>
              </tr>

              {/* Detalhamento Analítico por Categorias (Quando ativado) */}
              {dreMode === 'analitico' && financialMetrics.expensesCategoryList.map((cat, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', background: 'rgba(239, 68, 68, 0.02)' }}>
                  <td style={{ padding: '8px 16px 8px 32px', color: '#cbd5e1', fontSize: '0.82rem' }}>
                    • {cat.categoria}
                  </td>
                  <td style={{ padding: '8px 16px', color: '#f87171', textAlign: 'right', fontSize: '0.82rem' }}>
                    - R$ {formatCurrencyBRL(cat.total)}
                  </td>
                  <td style={{ padding: '8px 16px', color: '#94a3b8', textAlign: 'right', fontSize: '0.82rem' }}>
                    {financialMetrics.totalRecebido > 0 ? ((cat.total / financialMetrics.totalRecebido) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}

              {/* 5. Resultado Operacional Final */}
              <tr style={{
                background: financialMetrics.resultadoOperacionalRealizado >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                borderTop: '2px solid rgba(255, 255, 255, 0.15)'
              }}>
                <td style={{ padding: '16px', fontWeight: 900, fontSize: '1rem', color: '#f8fafc' }}>
                  (=) RESULTADO OPERACIONAL LÍQUIDO (EBITDA GERENCIAL)
                </td>
                <td style={{
                  padding: '16px',
                  fontWeight: 900,
                  fontSize: '1.15rem',
                  color: financialMetrics.resultadoOperacionalRealizado >= 0 ? '#10b981' : '#ef4444',
                  textAlign: 'right'
                }}>
                  {financialMetrics.resultadoOperacionalRealizado >= 0 ? '+ ' : '- '}
                  R$ {formatCurrencyBRL(Math.abs(financialMetrics.resultadoOperacionalRealizado))}
                </td>
                <td style={{
                  padding: '16px',
                  fontWeight: 900,
                  fontSize: '1rem',
                  color: financialMetrics.resultadoOperacionalRealizado >= 0 ? '#10b981' : '#ef4444',
                  textAlign: 'right'
                }}>
                  {financialMetrics.margemOperacional.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Distribuição Visual (Entradas por Meio vs Despesas por Categoria) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '16px'
      }}>
        {/* Entradas por Meio de Pagamento */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '20px'
        }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-wallet" style={{ color: '#10b981' }}></i>
            Receitas por Meio de Pagamento
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {financialMetrics.incomeMethodList.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textAlign: 'center', padding: '20px 0' }}>
                Nenhum pagamento liquidado no mês selecionado.
              </div>
            ) : (
              financialMetrics.incomeMethodList.map((item, idx) => {
                const pct = financialMetrics.totalRecebido > 0 ? (item.total / financialMetrics.totalRecebido) * 100 : 0;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{item.method}</span>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>
                        R$ {formatCurrencyBRL(item.total)} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#10b981', borderRadius: '3px' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Despesas por Categoria */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '20px'
        }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-chart-pie" style={{ color: '#ef4444' }}></i>
            Despesas por Categoria / Centro de Custo
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {financialMetrics.expensesCategoryList.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textAlign: 'center', padding: '20px 0' }}>
                Nenhuma despesa lançada para o mês selecionado.
              </div>
            ) : (
              financialMetrics.expensesCategoryList.map((item, idx) => {
                const pct = financialMetrics.totalDespesasPrevistas > 0 ? (item.total / financialMetrics.totalDespesasPrevistas) * 100 : 0;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                      <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{item.categoria}</span>
                      <span style={{ color: '#f87171', fontWeight: 700 }}>
                        R$ {formatCurrencyBRL(item.total)} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#ef4444', borderRadius: '3px' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
