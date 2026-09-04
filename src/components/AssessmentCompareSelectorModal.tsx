'use client';

import React from 'react';

export interface PreviousAssessmentOption {
  _id: string;
  data: string;
  tipo?: string;
  profissionalNome?: string;
  resumo?: string;
  rawDoc?: any;
  detalhes?: {
    peso?: number;
    gorduraPercent?: number;
    queixasCount?: number;
    testesCount?: number;
    dorEVA?: number;
  };
}

interface AssessmentCompareSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tipoModulo: 'physioreport' | 'physicalassessment' | 'strengthtest';
  clientName: string;
  previousAssessments: PreviousAssessmentOption[];
  onSelectAssessment: (assessment: PreviousAssessmentOption | null) => void;
}

export default function AssessmentCompareSelectorModal({
  isOpen,
  onClose,
  tipoModulo,
  clientName,
  previousAssessments,
  onSelectAssessment
}: AssessmentCompareSelectorModalProps) {
  if (!isOpen) return null;

  const getModuleTitle = () => {
    switch (tipoModulo) {
      case 'physioreport':
        return 'Relatório / Avaliação Fisioterapêutica';
      case 'physicalassessment':
        return 'Avaliação Física & Composição Corporal';
      case 'strengthtest':
        return 'Dinamometria Isométrica / Teste de Força';
      default:
        return 'Avaliação Clínica';
    }
  };

  const getModuleIcon = () => {
    switch (tipoModulo) {
      case 'physioreport':
        return 'fa-notes-medical';
      case 'physicalassessment':
        return 'fa-heart-pulse';
      case 'strengthtest':
        return 'fa-dumbbell';
      default:
        return 'fa-chart-line';
    }
  };

  const sortedList = [...previousAssessments].sort((a, b) => b.data.localeCompare(a.data));
  const latestId = sortedList[0]?._id;

  const formatDateBR = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('T')[0].split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dStr;
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 10050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          width: '100%',
          maxWidth: '650px',
          background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          animation: 'fadeInModal 0.2s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 28px 18px 28px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2))',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem'
                }}
              >
                <i className={`fa-solid ${getModuleIcon()}`}></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                  Comparativo de Avaliação em Tempo Real
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>
                  {getModuleTitle()} • <strong style={{ color: '#38bdf8' }}>{clientName}</strong>
                </span>
              </div>
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.84rem', color: '#cbd5e1', lineHeight: '1.4' }}>
              Selecione uma avaliação anterior para visualizar referências e acompanhar a evolução campo a campo durante a execução do teste:
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              transition: 'all 0.15s'
            }}
          >
            &times;
          </button>
        </div>

        {/* Body / List */}
        <div style={{ padding: '20px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sortedList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94a3b8' }}>
              <i className="fa-solid fa-folder-open" style={{ fontSize: '2rem', marginBottom: '10px', color: '#64748b' }}></i>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Nenhuma avaliação anterior encontrada para este aluno.</p>
            </div>
          ) : (
            sortedList.map((item, idx) => {
              const isLatest = item._id === latestId;
              return (
                <div
                  key={item._id || idx}
                  onClick={() => {
                    onSelectAssessment(item);
                    onClose();
                  }}
                  style={{
                    background: isLatest ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                    border: isLatest ? '1.5px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '16px 18px',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = isLatest ? '#10b981' : 'rgba(255, 255, 255, 0.25)';
                    e.currentTarget.style.background = isLatest ? 'rgba(16, 185, 129, 0.14)' : 'rgba(255, 255, 255, 0.06)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.borderColor = isLatest ? 'rgba(16, 185, 129, 0.45)' : 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.background = isLatest ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: isLatest ? '#10b981' : 'rgba(255, 255, 255, 0.06)',
                        color: isLatest ? '#ffffff' : '#94a3b8',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        lineHeight: '1.1'
                      }}
                    >
                      <span>{item.data ? item.data.split('-')[2] : 'DD'}</span>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.85 }}>
                        {item.data ? new Date(item.data + 'T12:00:00Z').toLocaleString('pt-BR', { month: 'short' }).replace('.', '') : 'MES'}
                      </span>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{ fontSize: '0.96rem', fontWeight: 750, color: '#f8fafc' }}>
                          Avaliação de {formatDateBR(item.data)}
                        </span>
                        {isLatest && (
                          <span
                            style={{
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              color: '#fff',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '20px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
                            }}
                          >
                            ⭐ Recomendado (Última)
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {item.profissionalNome && (
                          <span>
                            <i className="fa-solid fa-user-doctor" style={{ marginRight: '4px', opacity: 0.7 }}></i>
                            {item.profissionalNome}
                          </span>
                        )}
                        {item.detalhes?.peso && <span>• Peso: {item.detalhes.peso} kg</span>}
                        {item.detalhes?.dorEVA !== undefined && <span>• Dor EVA: {item.detalhes.dorEVA}/10</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '6px 14px',
                        background: isLatest ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                        border: isLatest ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: isLatest ? '#10b981' : '#cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      Selecionar <i className="fa-solid fa-chevron-right" style={{ fontSize: '0.7rem' }}></i>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            <i className="fa-solid fa-circle-info" style={{ marginRight: '5px' }}></i>
            Você pode alternar ou desativar o comparativo a qualquer momento durante a avaliação.
          </span>
          <button
            type="button"
            onClick={() => {
              onSelectAssessment(null);
              onClose();
            }}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#94a3b8',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            Iniciar em Branco (Sem Comparativo)
          </button>
        </div>
      </div>
    </div>
  );
}
