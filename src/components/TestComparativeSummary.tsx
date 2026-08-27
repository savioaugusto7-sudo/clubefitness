'use client';

import React from 'react';

export interface ComparativeItem {
  label: string;
  prevValue?: number | string | null;
  currValue?: number | string | null;
  unit?: string;
  isLowerBetter?: boolean; // e.g. for pain, asymmetry or step down score, lower is better
  normalRange?: string;
}

interface TestComparativeSummaryProps {
  testName: string;
  previousDate?: string;
  items: ComparativeItem[];
  notes?: string;
}

export default function TestComparativeSummary({
  testName,
  previousDate,
  items,
  notes
}: TestComparativeSummaryProps) {
  // If no previous test exists and no current values, don't show or show initial baseline card
  const hasPrev = Boolean(previousDate);
  const validItems = items.filter(it => it.currValue !== undefined && it.currValue !== '' && it.currValue !== null);

  if (!hasPrev && validItems.length === 0) {
    return null;
  }

  if (!hasPrev) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
        border: '1px dashed rgba(148, 163, 184, 0.3)',
        borderRadius: '12px',
        padding: '12px 16px',
        margin: '12px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>📋</span>
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#f8fafc' }}>
              {testName} — Primeiro Registro Clínico (Linha de Base)
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Este teste servirá como memória inicial e referência comparativa para os próximos atendimentos do aluno.
            </div>
          </div>
        </div>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          background: 'rgba(59, 130, 246, 0.15)',
          color: '#60a5fa',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          padding: '4px 10px',
          borderRadius: '6px'
        }}>
          Linha de Base Criada
        </span>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%)',
      border: '1px solid rgba(99, 102, 241, 0.35)',
      borderRadius: '12px',
      padding: '14px 18px',
      margin: '14px 0',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>📊</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#e0e7ff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Resumo Comparativo de Evolução — {testName}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Comparando com última realização em: <strong style={{ color: '#cbd5e1' }}>{previousDate}</strong>
            </div>
          </div>
        </div>
        <span style={{
          fontSize: '10.5px',
          fontWeight: 700,
          background: 'rgba(99, 102, 241, 0.2)',
          color: '#a5b4fc',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          padding: '3px 8px',
          borderRadius: '6px',
          letterSpacing: '0.04em'
        }}>
          MEMÓRIA DO CLIENTE
        </span>
      </div>

      {/* Grid of metrics comparison */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '10px'
      }}>
        {items.map((it, idx) => {
          const prevNum = it.prevValue !== undefined && it.prevValue !== null && it.prevValue !== '' ? Number(it.prevValue) : null;
          const currNum = it.currValue !== undefined && it.currValue !== null && it.currValue !== '' ? Number(it.currValue) : null;

          let deltaNum: number | null = null;
          let deltaPct: number | null = null;
          let isBetter = false;
          let isWorse = false;
          let isSame = false;

          if (prevNum !== null && !isNaN(prevNum) && currNum !== null && !isNaN(currNum)) {
            deltaNum = Number((currNum - prevNum).toFixed(1));
            if (prevNum !== 0) {
              deltaPct = Number(((deltaNum / prevNum) * 100).toFixed(1));
            }
            if (it.isLowerBetter) {
              isBetter = deltaNum < 0;
              isWorse = deltaNum > 0;
            } else {
              isBetter = deltaNum > 0;
              isWorse = deltaNum < 0;
            }
            isSame = deltaNum === 0;
          }

          return (
            <div
              key={idx}
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px',
                padding: '8px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                {it.label}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ fontSize: '11.5px', color: '#cbd5e1' }}>
                  <span style={{ opacity: 0.6, fontSize: '10px' }}>Ant:</span> {it.prevValue !== undefined && it.prevValue !== null && it.prevValue !== '' ? `${it.prevValue}${it.unit ? ` ${it.unit}` : ''}` : '—'}
                </div>

                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                  <span style={{ opacity: 0.6, fontSize: '10px' }}>Atual:</span> {it.currValue !== undefined && it.currValue !== null && it.currValue !== '' ? `${it.currValue}${it.unit ? ` ${it.unit}` : ''}` : '—'}
                </div>
              </div>

              {deltaNum !== null && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '2px',
                  paddingTop: '4px',
                  borderTop: '1px dashed rgba(255,255,255,0.06)',
                  fontSize: '11px'
                }}>
                  <span style={{
                    color: isBetter ? '#34d399' : isWorse ? '#f87171' : '#94a3b8',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}>
                    {isBetter ? '📈 Melhora' : isWorse ? '📉 Déficit' : '⚖️ Estável'}
                    {deltaPct !== null && ` (${deltaPct > 0 ? `+${deltaPct}` : deltaPct}%)`}
                  </span>
                  <span style={{ color: isBetter ? '#34d399' : isWorse ? '#f87171' : '#94a3b8', fontWeight: 600 }}>
                    {deltaNum > 0 ? `+${deltaNum}` : deltaNum}{it.unit ? ` ${it.unit}` : ''}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {notes && (
        <div style={{ fontSize: '11px', color: '#cbd5e1', fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '6px' }}>
          💡 {notes}
        </div>
      )}
    </div>
  );
}
