'use client';

import React, { useState } from 'react';
import { calculateSheetTotalTime, calculateExerciseTime, formatSecondsToTime, RITMO_OPTIONS } from '@/utils/workoutTimeEngine';

interface WorkoutTempoModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  sheetName: string;
  onUpdateItemRitmo: (itemId: string, ritmo: string) => void;
  onApplyBatchRitmo?: (ritmo: string) => void;
}

export const WorkoutTempoModal: React.FC<WorkoutTempoModalProps> = ({
  isOpen,
  onClose,
  items,
  sheetName,
  onUpdateItemRitmo,
  onApplyBatchRitmo
}) => {
  const [metaMinutos, setMetaMinutos] = useState<number>(50);

  if (!isOpen) return null;

  const timeData = calculateSheetTotalTime(items);
  const diffMeta = timeData.totalMinutes - metaMinutos;
  const pendingItems = items.filter(it => {
    const res = calculateExerciseTime(it.series, it.reps || it.repeticoes, it.ritmo, it.descanso);
    return res.isPendingTempo;
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          background: '#0a0f1d',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.95), 0 0 30px rgba(56, 189, 248, 0.15)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(15, 23, 42, 0.6) 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.2)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
                fontSize: '1.2rem'
              }}
            >
              <i className="fa-solid fa-stopwatch"></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                Tempo Previsto & Viabilidade da Ficha
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                Ficha: <strong style={{ color: '#38bdf8' }}>{sheetName || 'Ficha de Treino'}</strong> • {items.length} exercícios
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem'
            }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Corpo do Modal com Scroll */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card Central de Tempo */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '16px'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.70rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                Duração Total
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: timeData.isComplete ? '#38bdf8' : '#fbbf24', marginTop: '2px' }}>
                ~{timeData.formattedTotal}
              </div>
              <div style={{ fontSize: '0.68rem', color: timeData.isComplete ? '#64748b' : '#fbbf24' }}>
                {timeData.isComplete ? 'Cálculo 100% calibrado' : `⚠️ ${timeData.pendingCount} ex. pendente(s)`}
              </div>
            </div>

            <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.06)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.70rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>
                Tempo Sob Tensão (Ativo)
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>
                ~{timeData.executionMinutes} min
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                {timeData.densidadePercent}% de densidade de esforço
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.70rem', color: '#cbd5e1', fontWeight: 700, textTransform: 'uppercase' }}>
                Descanso & Recuperação
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#cbd5e1', marginTop: '2px' }}>
                ~{timeData.restMinutes} min
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                {100 - timeData.densidadePercent}% de intervalos
              </div>
            </div>
          </div>

          {/* Barra Visual de Densidade de Esforço */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>
              <span>Composição da Sessão</span>
              <span>{timeData.densidadePercent}% Ativo • {100 - timeData.densidadePercent}% Descanso</span>
            </div>
            <div style={{ height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
              <div
                style={{
                  width: `${timeData.densidadePercent}%`,
                  background: 'linear-gradient(90deg, #06b6d4, #10b981)',
                  transition: 'width 0.3s ease'
                }}
                title={`Ativo: ${timeData.densidadePercent}%`}
              />
              <div
                style={{
                  width: `${100 - timeData.densidadePercent}%`,
                  background: 'rgba(255, 255, 255, 0.2)',
                  transition: 'width 0.3s ease'
                }}
                title={`Descanso: ${100 - timeData.densidadePercent}%`}
              />
            </div>
          </div>

          {/* Seção de Simulador de Janela / Tempo Hábil do Aluno */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#f8fafc' }}>
                  🎯 Janela de Treino Disponível do Aluno
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Verifique se esta ficha cabe no tempo disponível na rotina do aluno
                </div>
              </div>

              {/* Botões rápidos de meta de tempo */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {[35, 45, 50, 60].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMetaMinutos(m)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      background: metaMinutos === m ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                      border: metaMinutos === m ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: metaMinutos === m ? '#38bdf8' : '#94a3b8',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </div>

            {/* Diagnóstico de Viabilidade */}
            {diffMeta <= 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  fontSize: '0.82rem'
                }}
              >
                <i className="fa-solid fa-circle-check" style={{ fontSize: '1.1rem' }}></i>
                <div>
                  <strong>Treino Perfeitamente Viável!</strong> Previsto para ~{timeData.totalMinutes} min, cabendo com folga na meta de {metaMinutos} min ({Math.abs(diffMeta)} min livres para aquecimento/mobilidade).
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  fontSize: '0.82rem'
                }}
              >
                <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '1.1rem' }}></i>
                <div>
                  <strong>Atenção: Treino excede a janela do aluno em +{diffMeta} min!</strong>
                  <div style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '3px' }}>
                    Dica: Reduzir intervalos de descanso em 10-15s ou conjugar exercícios em Bi-set economiza tempo mantendo a intensidade.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bloco de Exercícios Pendentes de Ritmo (Regra SEM FALLBACK) */}
          {pendingItems.length > 0 && (
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '12px',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-circle-exclamation" style={{ color: '#fbbf24', fontSize: '1rem' }}></i>
                  <div>
                    <strong style={{ fontSize: '0.84rem', color: '#fbbf24' }}>
                      {pendingItems.length} exercício(s) sem ritmo definido
                    </strong>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      O sistema não adota estimativas cegas. Defina o ritmo para calcular com exatidão.
                    </div>
                  </div>
                </div>

                {onApplyBatchRitmo && (
                  <button
                    type="button"
                    onClick={() => onApplyBatchRitmo('2-1')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      background: 'rgba(245, 158, 11, 0.2)',
                      border: '1px solid rgba(245, 158, 11, 0.5)',
                      color: '#fbbf24',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    title="Preenche o ritmo 2-1 (3s por repetição) em todos os exercícios pendentes desta ficha"
                  >
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                    <span>Aplicar 2-1 (3s/rep) nos pendentes</span>
                  </button>
                )}
              </div>

              {/* Lista dos exercícios pendentes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                {pendingItems.map(pItem => (
                  <div
                    key={pItem.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#070b14',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9' }}>
                        {pItem.nome}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        {pItem.series} séries × {pItem.reps || pItem.repeticoes} reps
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      {['2-1', '2-0-2-0', '30s'].map(quickVal => (
                        <button
                          key={quickVal}
                          type="button"
                          onClick={() => onUpdateItemRitmo(pItem.id, quickVal)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '5px',
                            background: 'rgba(56, 189, 248, 0.15)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            color: '#38bdf8',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          + {quickVal}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Fechar */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'rgba(0, 0, 0, 0.2)'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f8fafc',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkoutTempoModal;
