'use client';

import React, { useState } from 'react';
import { MetricEvolution } from '@/utils/studentEvolutionEngine';

interface EvolutionMetricCardProps {
  metric: MetricEvolution;
  color?: string;
  viewMode?: 'recente' | 'historico';
}

export default function EvolutionMetricCard({ metric, color = '#10b981', viewMode = 'recente' }: EvolutionMetricCardProps) {
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const delta = viewMode === 'recente' ? metric.deltaRecente : metric.deltaTotal;
  const deltaPct = viewMode === 'recente' ? metric.deltaRecentePercent : metric.deltaTotalPercent;
  const isPos = delta > 0;
  const isZero = delta === 0;

  // Semântica de cores biológica
  let deltaColor = '#94a3b8';
  let deltaBg = 'rgba(148, 163, 184, 0.1)';
  let deltaBorder = 'rgba(148, 163, 184, 0.25)';
  let deltaIcon = 'fa-equals';

  if (!isZero) {
    if (metric.isMelhora) {
      deltaColor = '#34d399';
      deltaBg = 'rgba(16, 185, 129, 0.12)';
      deltaBorder = 'rgba(16, 185, 129, 0.35)';
      deltaIcon = isPos ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
    } else {
      deltaColor = '#f87171';
      deltaBg = 'rgba(239, 68, 68, 0.12)';
      deltaBorder = 'rgba(239, 68, 68, 0.35)';
      deltaIcon = isPos ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
    }
  }

  const penultimoPonto = metric.historico[metric.historico.length - 2];
  const ultimoPonto = metric.historico[metric.historico.length - 1];

  return (
    <>
      <div
        onClick={() => setShowHistoryModal(true)}
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '12px',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          touchAction: 'manipulation'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = `${color}66`;
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 12px 28px rgba(0, 0, 0, 0.35), 0 0 15px ${color}22`;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.25)';
        }}
      >
        {/* Top: Categoria & Indicador de Toque */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: color }}>
              {metric.categoria}
            </span>
            <h4 style={{ margin: '2px 0 0', fontSize: '0.98rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.2px', lineHeight: 1.25 }}>
              {metric.nome}
            </h4>
          </div>

          <span
            style={{
              fontSize: '0.66rem',
              color: '#94a3b8',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '3px 7px',
              borderRadius: '6px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <i className="fa-solid fa-chart-line" style={{ fontSize: '0.62rem' }}></i> {metric.historico.length} medições
          </span>
        </div>

        {/* Middle: 3 Tempos de Leitura Rápida */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500, marginBottom: '2px' }}>
              Anterior: <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{metric.penultimoValor} {metric.unidade}</span>
              <span style={{ fontSize: '0.65rem', color: '#64748b', marginLeft: '4px' }}>({penultimoPonto?.dataFormatada})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '1.65rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px', lineHeight: 1 }}>
                {metric.ultimoValor}
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8' }}>
                {metric.unidade}
              </span>
            </div>
          </div>

          {/* Badge de Delta Luminoso */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              borderRadius: '10px',
              background: deltaBg,
              border: `1px solid ${deltaBorder}`,
              color: deltaColor,
              fontWeight: 800,
              fontSize: '0.78rem',
              whiteSpace: 'nowrap',
              boxShadow: `0 2px 8px ${deltaColor}15`
            }}
          >
            <i className={`fa-solid ${deltaIcon}`} style={{ fontSize: '0.72rem' }}></i>
            <span>{isPos ? `+${delta}` : delta} {metric.unidade}</span>
            <span style={{ fontSize: '0.68rem', opacity: 0.85 }}>({isPos ? `+${deltaPct}` : deltaPct}%)</span>
          </div>
        </div>

        {/* Bottom: Mini Sparkline SVG */}
        {metric.sparklineSvgPoints && (
          <div style={{ marginTop: '2px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Curva temporal</span>
            <svg width="100" height="26" viewBox="0 0 100 28" style={{ overflow: 'visible' }}>
              <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={metric.sparklineSvgPoints}
              />
            </svg>
          </div>
        )}
      </div>

      {/* Modal / Sheet de Histórico Completo ao Tocar */}
      {showHistoryModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '24px',
              width: '100%',
              maxWidth: '480px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: color, fontWeight: 700, textTransform: 'uppercase' }}>{metric.categoria}</span>
                <h3 style={{ margin: '2px 0 0', fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                  {metric.nome}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#ffffff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Resumo do Ganho / Perda Total */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '18px',
                display: 'flex',
                justifyContent: 'space-around',
                textAlign: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '0.70rem', color: '#94a3b8' }}>Inicial ({metric.historico[0]?.dataFormatada})</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                  {metric.primeiroValor} {metric.unidade}
                </div>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.08)' }}></div>
              <div>
                <div style={{ fontSize: '0.70rem', color: '#94a3b8' }}>Atual ({ultimoPonto?.dataFormatada})</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                  {metric.ultimoValor} {metric.unidade}
                </div>
              </div>
              <div style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.08)' }}></div>
              <div>
                <div style={{ fontSize: '0.70rem', color: '#94a3b8' }}>Evolução Total</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: deltaColor, marginTop: '2px' }}>
                  {metric.deltaTotal > 0 ? `+${metric.deltaTotal}` : metric.deltaTotal} {metric.unidade}
                </div>
              </div>
            </div>

            {/* Linha do Tempo Cronológica */}
            <h5 style={{ margin: '0 0 10px', fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Linha do Tempo das Medições ({metric.historico.length})
            </h5>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {metric.historico.map((pt, idx) => {
                const prevPt = idx > 0 ? metric.historico[idx - 1] : null;
                const ptDelta = prevPt ? Number((pt.valor - prevPt.valor).toFixed(2)) : null;

                return (
                  <div
                    key={idx}
                    style={{
                      background: idx === metric.historico.length - 1 ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: idx === metric.historico.length - 1 ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(255, 255, 255, 0.04)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#ffffff' }}>
                        {pt.dataFormatada}
                      </div>
                      {pt.avaliador && (
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          Avaliador: {pt.avaliador}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: '#f8fafc' }}>
                        {pt.valor} {metric.unidade}
                      </div>
                      {ptDelta !== null && (
                        <div style={{ fontSize: '0.70rem', fontWeight: 700, color: ptDelta > 0 ? '#34d399' : ptDelta < 0 ? '#f87171' : '#94a3b8' }}>
                          {ptDelta > 0 ? `+${ptDelta}` : ptDelta} {metric.unidade}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
