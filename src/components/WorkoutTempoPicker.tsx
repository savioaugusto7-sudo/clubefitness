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
  exerciseName?: string;
  unilateral?: boolean;
}

export const WorkoutTempoPicker: React.FC<WorkoutTempoPickerProps> = ({
  value,
  onChange,
  reps = '12',
  series = 3,
  disabled = false,
  exerciseName,
  unilateral = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customNum, setCustomNum] = useState<string>('');
  const [customUnit, setCustomUnit] = useState<'min' | 'seg'>('min');
  const modalBoxRef = useRef<HTMLDivElement>(null);

  // Fecha o modal ao pressionar ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const execInfo = parseTempoExecucaoSerie(value, reps);
  const ladoMult = unilateral ? 2 : 1;
  const secondsTotalSet = execInfo.secondsPerSet * ladoMult;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Input com botão integrado de dropdown / modal */}
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
            ? `Tempo/Ritmo: ${execInfo.labelExplicativo}${unilateral ? ' (2x lados)' : ''}`
            : 'Tempo ou Ritmo — clique para abrir o seletor ou digite (ex: 6 min, 360seg, 2-1)'
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
          onClick={() => {
            if (!disabled) setIsOpen(true);
          }}
        />

        <button
          type="button"
          onClick={() => {
            if (!disabled) {
              setIsOpen(true);
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
          <i className="fa-solid fa-stopwatch" style={{ opacity: 0.85, color: '#38bdf8' }}></i>
        </button>
      </div>

      {/* 🌟 Modal Centralizado com Backdrop Escuro & Blur (Nunca extrapola tela) */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999999,
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            ref={modalBoxRef}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '430px',
              maxHeight: 'min(580px, 88vh)',
              overflowY: 'auto',
              background: '#090d16',
              border: '1px solid rgba(56, 189, 248, 0.45)',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.95), 0 0 25px rgba(56, 189, 248, 0.18)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
          {/* Cabeçalho do Modal */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '8px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8',
                  fontSize: '0.85rem'
                }}
              >
                <i className="fa-solid fa-stopwatch"></i>
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#f1f5f9' }}>
                  Padronização de Ritmo & Tempo
                </div>
                {exerciseName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                      {exerciseName}
                    </span>
                    {unilateral && (
                      <span
                        style={{
                          fontSize: '0.60rem',
                          fontWeight: 800,
                          color: '#38bdf8',
                          background: 'rgba(56, 189, 248, 0.15)',
                          border: '1px solid rgba(56, 189, 248, 0.35)',
                          padding: '1px 5px',
                          borderRadius: '4px'
                        }}
                      >
                        ⇄ Unilateral (2x lados)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '0.80rem',
                borderRadius: '6px',
                padding: '4px 8px'
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
                marginTop: '4px',
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#cbd5e1' }}>
                <span>1 série ({reps} reps{unilateral ? ' cada lado' : ''}):</span>
                <strong style={{ color: '#38bdf8', fontSize: '0.80rem' }}>
                  ~{formatSecondsToTime(secondsTotalSet)} sob tensão
                </strong>
              </div>
              <div style={{ fontSize: '0.64rem', color: '#94a3b8' }}>
                ✓ {execInfo.labelExplicativo}{unilateral ? ' • Tempo dobrado automaticamente (Direita + Esquerda)' : ''}
              </div>
            </div>
          ) : (
            <div
              style={{
                marginTop: '4px',
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                fontSize: '0.68rem',
                color: '#fbbf24',
                textAlign: 'center'
              }}
            >
              ⚠️ Selecione uma opção acima ou digite (ex: 6 min ou 360seg)
            </div>
          )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default WorkoutTempoPicker;
