'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [customNum, setCustomNum] = useState<string>('');
  const [customUnit, setCustomUnit] = useState<'min' | 'seg'>('min');
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; openUpwards: boolean }>({ top: 0, left: 0, openUpwards: false });

  // Calcula a posição do popover flutuante com viewport clamping e detecção de borda
  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverWidth = 315;
    const popoverHeight = 460;

    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < popoverHeight && rect.top > popoverHeight;

    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    // Garante margem de segurança nas bordas da tela
    left = Math.max(10, Math.min(window.innerWidth - popoverWidth - 10, left));

    const top = openUpwards ? Math.max(10, rect.top - popoverHeight - 6) : rect.bottom + 6;
    setCoords({ top, left, openUpwards });
  };

  // Atualiza posição no scroll ou resize enquanto aberto
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        (!popoverRef.current || !popoverRef.current.contains(target))
      ) {
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
            ? `Tempo/Ritmo válido: ${execInfo.labelExplicativo}`
            : 'Tempo ou Ritmo — clique para selecionar ou digite (ex: 6 min, 360seg, 2-1)'
        }
      >
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder="Tempo/Ritmo"
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
          onFocus={() => {
            updatePosition();
            setIsOpen(true);
          }}
        />

        <button
          type="button"
          onClick={() => {
            if (!disabled) {
              if (!isOpen) updatePosition();
              setIsOpen(!isOpen);
            }
          }}
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

      {/* 🌟 Popover de Seleção renderizado via Portal no document.body para nunca ser cortado por overflow: hidden */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            zIndex: 99999999,
            width: '315px',
            maxHeight: 'min(490px, 88vh)',
            overflowY: 'auto',
            background: '#090d16',
            border: '1px solid rgba(56, 189, 248, 0.45)',
            boxShadow: '0 20px 48px rgba(0, 0, 0, 0.95), 0 0 20px rgba(56, 189, 248, 0.15)',
            borderRadius: '10px',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
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
              <i className="fa-solid fa-stopwatch" style={{ color: '#38bdf8', fontSize: '0.80rem' }}></i>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#f1f5f9' }}>
                Padronização de Ritmo & Tempo
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

          {/* Seção 1: 🏃‍♂️ Cardio & Tempo Contínuo (Aeróbico / Esteira / Bike) */}
          <div>
            <div
              style={{
                fontSize: '0.64rem',
                fontWeight: 800,
                color: '#38bdf8',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                padding: '2px 6px',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span>🏃‍♂️ Cardio / Contínuo (Minutos)</span>
              <span style={{ fontSize: '0.58rem', color: '#64748b', fontWeight: 600 }}>1 toque</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
              {RITMO_OPTIONS.filter(o => o.tipo === 'cardio').map(opt => {
                const isSelected = value === opt.valor;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.valor);
                      setIsOpen(false);
                    }}
                    title={`${opt.valor} (${opt.tempoSegundosPorSerie}s) - ${opt.descricao}`}
                    style={{
                      padding: '6px 3px',
                      borderRadius: '6px',
                      background: isSelected ? 'rgba(56, 189, 248, 0.28)' : 'rgba(56, 189, 248, 0.05)',
                      border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.15)',
                      color: isSelected ? '#38bdf8' : '#e0f2fe',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.12s ease'
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(56, 189, 248, 0.05)';
                      }
                    }}
                  >
                    {opt.valor}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seção 2: ⚡ Entrada Rápida Personalizada de Tempo (min / seg) */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '7px',
              padding: '6px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px'
            }}
          >
            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
              ⏱️ Lançar Tempo Personalizado
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="Ex: 6"
                value={customNum}
                onChange={e => setCustomNum(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && customNum.trim()) {
                    e.preventDefault();
                    onChange(`${customNum.trim()} ${customUnit}`);
                    setIsOpen(false);
                  }
                }}
                style={{
                  width: '65px',
                  height: '28px',
                  background: '#040711',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  borderRadius: '5px',
                  color: '#fff',
                  textAlign: 'center',
                  fontSize: '0.80rem',
                  fontWeight: 800,
                  outline: 'none',
                  padding: '0 4px'
                }}
              />

              {/* Botões alternadores min / seg */}
              <div style={{ display: 'flex', background: '#080d1a', borderRadius: '5px', padding: '2px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <button
                  type="button"
                  onClick={() => setCustomUnit('min')}
                  style={{
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 7px',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: customUnit === 'min' ? '#38bdf8' : 'transparent',
                    color: customUnit === 'min' ? '#040711' : '#94a3b8',
                    transition: 'all 0.12s ease'
                  }}
                >
                  min
                </button>
                <button
                  type="button"
                  onClick={() => setCustomUnit('seg')}
                  style={{
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 7px',
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: customUnit === 'seg' ? '#38bdf8' : 'transparent',
                    color: customUnit === 'seg' ? '#040711' : '#94a3b8',
                    transition: 'all 0.12s ease'
                  }}
                >
                  seg
                </button>
              </div>

              {/* Botão Aplicar */}
              <button
                type="button"
                disabled={!customNum.trim()}
                onClick={() => {
                  if (customNum.trim()) {
                    onChange(`${customNum.trim()} ${customUnit}`);
                    setIsOpen(false);
                  }
                }}
                style={{
                  flex: 1,
                  height: '28px',
                  border: 'none',
                  borderRadius: '5px',
                  background: customNum.trim() ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                  color: customNum.trim() ? '#040711' : '#64748b',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  cursor: customNum.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'all 0.12s ease'
                }}
              >
                <i className="fa-solid fa-check"></i>
                <span>Aplicar {customNum ? `${customNum}${customUnit}` : ''}</span>
              </button>
            </div>
          </div>

          {/* Seção 3: Isometria e Tempo Fixo Curto por Série */}
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
              ⏱️ Isometria Curta (por série)
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
                      padding: '5px 2px',
                      borderRadius: '6px',
                      background: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                      border: isSelected ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(255, 255, 255, 0.05)',
                      color: isSelected ? '#38bdf8' : '#ffffff',
                      fontSize: '0.70rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.12s ease'
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      }
                    }}
                  >
                    {opt.valor}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seção 4: Cadências (Tempo por Repetição) */}
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
              ⚡ Cadência Dinâmica (Tempo por rep)
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
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: isSelected ? '#38bdf8' : '#ffffff' }}>
                        {opt.valor}
                      </span>
                      <span style={{ fontSize: '0.64rem', color: '#94a3b8', marginLeft: '6px' }}>
                        {opt.descricao}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.62rem', color: isSelected ? '#38bdf8' : '#64748b', fontWeight: 700 }}>
                      {opt.tempoSegundosPorRep ? `${opt.tempoSegundosPorRep}s/rep` : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rodapé com Cálculo de Tempo em Tempo Real */}
          {execInfo.isValid ? (
            <div
              style={{
                marginTop: '2px',
                padding: '6px 8px',
                borderRadius: '6px',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem', color: '#cbd5e1' }}>
                <span>1 série ({reps} reps):</span>
                <strong style={{ color: '#38bdf8' }}>
                  ~{formatSecondsToTime(execInfo.secondsPerSet)} sob tensão
                </strong>
              </div>
              <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                ✓ {execInfo.labelExplicativo}
              </div>
            </div>
          ) : (
            <div
              style={{
                marginTop: '2px',
                padding: '6px 8px',
                borderRadius: '6px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                fontSize: '0.66rem',
                color: '#fbbf24',
                textAlign: 'center'
              }}
            >
              ⚠️ Selecione uma opção acima ou digite (ex: 6 min ou 360seg)
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default WorkoutTempoPicker;
