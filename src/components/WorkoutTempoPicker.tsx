'use client';

import React, { useState, useRef, useEffect } from 'react';
import { RITMO_OPTIONS, parseTempoExecucaoSerie, formatSecondsToTime, TempoOption } from '@/utils/workoutTimeEngine';

interface WorkoutTempoPickerProps {
  value: string;
  onChange: (newValue: string) => void;
  reps?: any;
  series?: any;
  disabled?: boolean;
}

export const WorkoutTempoPicker: React.FC<WorkoutTempoPickerProps> = ({
  value,
  onChange,
  reps = '12',
  series = 3,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const execInfo = parseTempoExecucaoSerie(value, reps);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Input com botão integrado de dropdown */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#070b14',
          border: execInfo.isValid
            ? '1px solid rgba(56, 189, 248, 0.45)'
            : '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '7px',
          height: '36px',
          padding: '0 4px 0 6px',
          transition: 'all 0.15s ease'
        }}
        title={
          execInfo.isValid
            ? `Ritmo válido: ${execInfo.labelExplicativo}`
            : 'Ritmo não informado — clique para selecionar ou digite (ex: 2-1 ou 30s)'
        }
      >
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="Ritmo..."
          disabled={disabled}
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: execInfo.isValid ? '#38bdf8' : '#fbbf24',
            fontSize: '0.78rem',
            fontWeight: 700,
            textAlign: 'center',
            padding: 0
          }}
          onFocus={() => setIsOpen(true)}
        />

        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '2px 4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            fontSize: '0.65rem'
          }}
          title="Opções padronizadas de ritmo e tempo"
        >
          <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ opacity: 0.8 }}></i>
        </button>
      </div>

      {/* Popover de Seleção com Tradução em Tempo Explícita */}
      {isOpen && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            width: '290px',
            background: '#090d16',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.95), 0 0 15px rgba(56, 189, 248, 0.1)',
            borderRadius: '10px',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          {/* Cabeçalho do Popover */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '2px 6px 6px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-stopwatch" style={{ color: '#38bdf8', fontSize: '0.75rem' }}></i>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#f1f5f9' }}>
                Padronização de Ritmo
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '0.75rem',
                padding: '2px'
              }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {/* Seção 1: Cadências (Tempo por Repetição) */}
          <div>
            <div
              style={{
                fontSize: '0.64rem',
                fontWeight: 800,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                padding: '2px 6px',
                marginBottom: '2px'
              }}
            >
              ⚡ Cadência (Tempo por repetição)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {RITMO_OPTIONS.filter(o => o.tipo === 'cadencia').map(opt => {
                const isSelected = value === opt.valor;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.valor);
                      setIsOpen(false);
                    }}
                    style={{
                      textAlign: 'left',
                      padding: '5px 8px',
                      borderRadius: '6px',
                      background: isSelected ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.12s ease'
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.74rem', fontWeight: 800, color: isSelected ? '#38bdf8' : '#f8fafc' }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: '0.64rem', color: '#94a3b8', marginTop: '1px' }}>
                        {opt.descricao}
                      </div>
                    </div>
                    {isSelected && (
                      <i className="fa-solid fa-check" style={{ color: '#38bdf8', fontSize: '0.72rem' }}></i>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seção 2: Tempo Fixo por Série (Isometria / Pranchas) */}
          <div style={{ marginTop: '2px' }}>
            <div
              style={{
                fontSize: '0.64rem',
                fontWeight: 800,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                padding: '2px 6px',
                marginBottom: '2px'
              }}
            >
              ⏱️ Tempo Fixo por Série (Isometria / Prancha)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
              {RITMO_OPTIONS.filter(o => o.tipo === 'fixo').map(opt => {
                const isSelected = value === opt.valor;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.valor);
                      setIsOpen(false);
                    }}
                    style={{
                      height: '28px',
                      padding: '0',
                      borderRadius: '5px',
                      background: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.06)',
                      color: isSelected ? '#38bdf8' : '#f1f5f9',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.12s ease'
                    }}
                    title={opt.descricao}
                  >
                    {opt.valor}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rodapé informativo de feedback com tempo da série */}
          {execInfo.isValid ? (
            <div
              style={{
                marginTop: '4px',
                padding: '6px 8px',
                borderRadius: '6px',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.68rem',
                color: '#cbd5e1'
              }}
            >
              <span>1 série ({reps} reps):</span>
              <strong style={{ color: '#38bdf8' }}>
                ~{formatSecondsToTime(execInfo.secondsPerSet)} sob tensão
              </strong>
            </div>
          ) : (
            <div
              style={{
                marginTop: '4px',
                padding: '6px 8px',
                borderRadius: '6px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                fontSize: '0.66rem',
                color: '#fbbf24',
                textAlign: 'center'
              }}
            >
              ⚠️ Selecione um ritmo ou digite para calcular o tempo
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkoutTempoPicker;
