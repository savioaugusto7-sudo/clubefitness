'use client';

import React from 'react';

export interface ComparisonPillProps {
  prevValue: number | string | undefined | null;
  currValue?: number | string | undefined | null;
  unit?: string;
  refRange?: string;
  isLowerBetter?: boolean;
  onKeepPrevious?: (val: any) => void;
  onKeepValue?: (val?: any) => void;
  onKeep?: (val?: any) => void;
  style?: React.CSSProperties;
  size?: 'sm' | 'md';
}

export default function ComparisonPill({
  prevValue,
  currValue,
  unit = '',
  refRange,
  isLowerBetter = false,
  onKeepPrevious,
  onKeepValue,
  onKeep,
  style,
  size = 'md'
}: ComparisonPillProps) {
  const handleKeep = onKeepPrevious || onKeepValue || onKeep;
  // If no previous value exists, return null
  if (prevValue === undefined || prevValue === null || prevValue === '') {
    return null;
  }

  const pNum = typeof prevValue === 'number' ? prevValue : parseFloat(String(prevValue).replace(',', '.'));
  const cNum = (currValue !== undefined && currValue !== null && currValue !== '') 
    ? (typeof currValue === 'number' ? currValue : parseFloat(String(currValue).replace(',', '.')))
    : null;

  const hasCurr = cNum !== null && !isNaN(cNum);
  const hasPrev = !isNaN(pNum);

  // If current value is equal to previous value
  const isIdentical = hasCurr && hasPrev && Math.abs(cNum - pNum) < 0.001;

  // Delta calculation
  const delta = (hasCurr && hasPrev) ? cNum - pNum : null;

  // Determine sentiment
  let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (delta !== null && Math.abs(delta) >= 0.01) {
    if (isLowerBetter) {
      sentiment = delta < 0 ? 'positive' : 'negative';
    } else {
      sentiment = delta > 0 ? 'positive' : 'negative';
    }
  }

  // Format numbers nicely
  const formatVal = (v: number) => {
    return Number.isInteger(v) ? v.toString() : v.toFixed(1);
  };

  const getColors = () => {
    if (!hasCurr) {
      return {
        bg: 'rgba(56, 189, 248, 0.08)',
        border: 'rgba(56, 189, 248, 0.25)',
        text: '#38bdf8',
        icon: 'fa-history'
      };
    }
    if (isIdentical) {
      return {
        bg: 'rgba(148, 163, 184, 0.12)',
        border: 'rgba(148, 163, 184, 0.3)',
        text: '#cbd5e1',
        icon: 'fa-check'
      };
    }
    if (sentiment === 'positive') {
      return {
        bg: 'rgba(16, 185, 129, 0.14)',
        border: 'rgba(16, 185, 129, 0.45)',
        text: '#34d399',
        icon: 'fa-arrow-trend-up'
      };
    }
    if (sentiment === 'negative') {
      return {
        bg: 'rgba(239, 68, 68, 0.14)',
        border: 'rgba(239, 68, 68, 0.45)',
        text: '#f87171',
        icon: 'fa-arrow-trend-down'
      };
    }
    return {
      bg: 'rgba(255, 255, 255, 0.06)',
      border: 'rgba(255, 255, 255, 0.15)',
      text: '#94a3b8',
      icon: 'fa-minus'
    };
  };

  const colors = getColors();

  const isSmall = size === 'sm';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: isSmall ? '2px 8px' : '4px 10px',
        borderRadius: '8px',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        fontSize: isSmall ? '0.72rem' : '0.78rem',
        fontWeight: 650,
        lineHeight: '1.2',
        transition: 'all 0.2s ease',
        marginTop: '4px',
        userSelect: 'none',
        ...style
      }}
    >
      <i className={`fa-solid ${colors.icon}`} style={{ fontSize: isSmall ? '0.65rem' : '0.72rem', opacity: 0.9 }}></i>

      {/* When no current value has been typed yet */}
      {!hasCurr && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>
            Ant: <strong style={{ color: '#f8fafc' }}>{hasPrev ? formatVal(pNum) : prevValue}{unit}</strong>
          </span>
          {handleKeep && (
            <button
              type="button"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                handleKeep(prevValue);
              }}
              title="Manter exatamente o valor da avaliação anterior neste campo"
              style={{
                background: 'rgba(56, 189, 248, 0.2)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: '5px',
                color: '#38bdf8',
                fontSize: isSmall ? '0.65rem' : '0.7rem',
                fontWeight: 750,
                padding: '2px 6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#0284c7';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)';
                e.currentTarget.style.color = '#38bdf8';
              }}
            >
              <i className="fa-solid fa-arrow-down" style={{ fontSize: '0.6rem' }}></i> Manter
            </button>
          )}
        </div>
      )}

      {/* When current value is identical to previous */}
      {isIdentical && (
        <span>
          Ant: {formatVal(pNum)}{unit} ➔ <strong style={{ color: '#f8fafc' }}>Mantido</strong>
        </span>
      )}

      {/* When current value is different (shows delta and reference) */}
      {hasCurr && !isIdentical && (
        <span>
          Ant: {formatVal(pNum)}{unit} ➔ <strong style={{ color: '#f8fafc' }}>{formatVal(cNum)}{unit}</strong>{' '}
          <span style={{ opacity: 0.95 }}>
            ({delta! > 0 ? `+${formatVal(delta!)}` : formatVal(delta!)}{unit})
          </span>
          {refRange && <span style={{ marginLeft: '4px', opacity: 0.75, fontSize: '0.7rem' }}>• Ref: {refRange}</span>}
        </span>
      )}
    </div>
  );
}

export function ComparisonActiveBar({
  assessmentDate,
  evaluatorName,
  tipoModulo,
  onChangeComparison,
  onDisableComparison
}: {
  assessmentDate: string;
  evaluatorName?: string;
  tipoModulo?: string;
  onChangeComparison: () => void;
  onDisableComparison: () => void;
}) {
  const formatDateBR = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dStr;
  };

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.12) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        borderRadius: '12px',
        padding: '10px 16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: '#10b981',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.85rem'
          }}
        >
          <i className="fa-solid fa-code-compare"></i>
        </div>
        <div>
          <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
            Modo Comparativo Ativo • Avaliação de {formatDateBR(assessmentDate)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {evaluatorName ? `Avaliador anterior: ${evaluatorName}` : 'Dados anteriores sendo exibidos como referência campo a campo'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={onChangeComparison}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#e2e8f0',
            borderRadius: '7px',
            padding: '5px 10px',
            fontSize: '0.76rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          }}
        >
          <i className="fa-solid fa-arrows-rotate"></i> Trocar Comparativo
        </button>

        <button
          type="button"
          onClick={onDisableComparison}
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            borderRadius: '7px',
            padding: '5px 10px',
            fontSize: '0.76rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
          }}
        >
          <i className="fa-solid fa-xmark"></i> Desativar
        </button>
      </div>
    </div>
  );
}
