'use client';

import React from 'react';

interface AlunoClinicalHeaderProps {
  client: {
    _id: string;
    nome: string;
    idade: number | null;
    peso: number | null;
    altura: number | null;
    profissionalResponsavel?: string;
    lesoes?: string;
    restricoes?: string;
  };
  activeSubTab: 'dashboard' | 'historico';
  onChangeSubTab: (tab: 'dashboard' | 'historico') => void;
  totalTimelineCount: number;
  onOpenNovoTeste: () => void;
  onOpenFichaTreino?: () => void;
  onDownloadLaudoPDF?: () => void;
  hasLaudoAvailable?: boolean;
  onOpenComparativo?: () => void;
  isMobile?: boolean;
  onBackToList?: () => void;
}

export default function AlunoClinicalHeader({
  client,
  activeSubTab,
  onChangeSubTab,
  totalTimelineCount,
  onOpenNovoTeste,
  onOpenFichaTreino,
  onDownloadLaudoPDF,
  hasLaudoAvailable = false,
  onOpenComparativo,
  isMobile = false,
  onBackToList
}: AlunoClinicalHeaderProps) {
  // Cálculo de IMC caso peso e altura estejam preenchidos
  const imc = React.useMemo(() => {
    if (client.peso && client.altura && client.altura > 0) {
      const altM = client.altura > 3 ? client.altura / 100 : client.altura;
      const val = client.peso / (altM * altM);
      return val.toFixed(1);
    }
    return null;
  }, [client.peso, client.altura]);

  const imcClassificacao = React.useMemo(() => {
    if (!imc) return null;
    const n = parseFloat(imc);
    if (n < 18.5) return { label: 'Abaixo do peso', color: '#38bdf8' };
    if (n < 25) return { label: 'Eutrófico (Normal)', color: '#10b981' };
    if (n < 30) return { label: 'Sobrepeso', color: '#f59e0b' };
    return { label: 'Obesidade', color: '#ef4444' };
  }, [imc]);

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, var(--bg-card, #1e293b) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
        borderRadius: '16px',
        padding: isMobile ? '16px 14px' : '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.4)'
      }}
    >
      {/* Linha Superior: Botão Voltar (Mobile) + Identificação do Aluno + Ações Rápidas */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '14px',
          width: '100%'
        }}
      >
        <div style={{ flex: 1, minWidth: 0, width: isMobile ? '100%' : 'auto' }}>
          {/* Botão de retorno mobile para a lista de alunos */}
          {isMobile && onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--border-color, rgba(255, 255, 255, 0.18))',
                borderRadius: '8px',
                color: 'var(--text-main, #fff)',
                padding: '9px 14px',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: '12px',
                minHeight: '44px',
                width: '100%',
                justifyContent: 'center'
              }}
            >
              <i className="fas fa-arrow-left" style={{ color: 'var(--primary, #6366f1)' }} />
              <span>← Voltar para Lista de Alunos</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2
              style={{
                margin: 0,
                fontSize: isMobile ? '1.35rem' : '1.65rem',
                fontWeight: 800,
                color: 'var(--text-main, #fff)',
                letterSpacing: '-0.02em',
                lineHeight: 1.2
              }}
            >
              {client.nome}
            </h2>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '20px',
                background: 'rgba(99, 102, 241, 0.18)',
                color: 'var(--primary, #818cf8)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              Prontuário Ativo
            </span>
          </div>

          {/* Dados biométricos em chips confortáveis */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '8px',
              fontSize: '0.82rem',
              color: 'var(--text-dim, #94a3b8)',
              flexWrap: 'wrap'
            }}
          >
            {client.idade && (
              <span style={{ background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '6px' }}>
                🎂 <strong>{client.idade}</strong> anos
              </span>
            )}
            {client.peso && (
              <span style={{ background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '6px' }}>
                ⚖️ <strong>{client.peso}</strong> kg
              </span>
            )}
            {client.altura && (
              <span style={{ background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '6px' }}>
                📏 <strong>{client.altura}</strong> cm
              </span>
            )}
            {imc && imcClassificacao && (
              <span
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  borderLeft: `2px solid ${imcClassificacao.color}`
                }}
                title={`IMC: ${imc} kg/m²`}
              >
                IMC: <strong>{imc}</strong> <small style={{ color: imcClassificacao.color }}>({imcClassificacao.label})</small>
              </span>
            )}
            {client.profissionalResponsavel && (
              <span style={{ background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: '6px' }}>
                👨‍⚕️ Resp: <strong style={{ color: 'var(--text-main, #fff)' }}>{client.profissionalResponsavel}</strong>
              </span>
            )}
          </div>

          {/* Badges Médicos: Lesões & Restrições */}
          {(client.lesoes || client.restricoes) && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
              {client.lesoes && (
                <div
                  style={{
                    fontSize: '0.8rem',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="fas fa-notes-medical" style={{ color: '#ef4444' }} />
                  <span><strong>Lesão:</strong> {client.lesoes}</span>
                </div>
              )}
              {client.restricoes && (
                <div
                  style={{
                    fontSize: '0.8rem',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'rgba(245, 158, 11, 0.12)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="fas fa-shield-alt" style={{ color: '#f59e0b' }} />
                  <span><strong>Restrição:</strong> {client.restricoes}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botões de Ação Rápida */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            alignItems: 'center',
            width: isMobile ? '100%' : 'auto'
          }}
        >
          <button
            type="button"
            onClick={onOpenNovoTeste}
            style={{
              flex: isMobile ? 1 : 'initial',
              minHeight: '44px',
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              transition: 'transform 0.15s ease'
            }}
          >
            <i className="fas fa-plus" />
            <span>Lançar Teste</span>
          </button>

          {onOpenFichaTreino && (
            <button
              type="button"
              onClick={onOpenFichaTreino}
              style={{
                flex: isMobile ? 1 : 'initial',
                minHeight: '44px',
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease'
              }}
              title="Abrir a Ficha de Treino atual do aluno"
            >
              <i className="fas fa-dumbbell" />
              <span>Ficha de Treino</span>
            </button>
          )}

          {onDownloadLaudoPDF && (
            <button
              type="button"
              onClick={onDownloadLaudoPDF}
              style={{
                flex: isMobile ? 1 : 'initial',
                minHeight: '44px',
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                background: 'rgba(56, 189, 248, 0.12)',
                color: '#38bdf8',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
                opacity: hasLaudoAvailable ? 1 : 0.65
              }}
              title={hasLaudoAvailable ? 'Emitir Laudo Clínico Comparativo em PDF' : 'Necessário pelo menos 2 avaliações no prontuário'}
            >
              <i className="fas fa-file-pdf" />
              <span>Laudo PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Linha Inferior: Abas de Navegação Clínica */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '12px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <button
          type="button"
          onClick={() => onChangeSubTab('dashboard')}
          style={{
            flex: isMobile ? 1 : 'initial',
            minHeight: '44px',
            padding: '10px 20px',
            borderRadius: '10px',
            border: '1px solid',
            borderColor: activeSubTab === 'dashboard' ? 'var(--primary, #6366f1)' : 'transparent',
            background: activeSubTab === 'dashboard' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            color: activeSubTab === 'dashboard' ? '#fff' : 'var(--text-dim, #94a3b8)',
            fontWeight: activeSubTab === 'dashboard' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fas fa-chart-pie" style={{ color: activeSubTab === 'dashboard' ? 'var(--primary, #818cf8)' : 'inherit' }} />
          <span>Dashboard de Evolução</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeSubTab('historico')}
          style={{
            flex: isMobile ? 1 : 'initial',
            minHeight: '44px',
            padding: '10px 20px',
            borderRadius: '10px',
            border: '1px solid',
            borderColor: activeSubTab === 'historico' ? '#0d9488' : 'transparent',
            background: activeSubTab === 'historico' ? 'rgba(13, 148, 136, 0.22)' : 'rgba(255, 255, 255, 0.04)',
            color: activeSubTab === 'historico' ? '#fff' : 'var(--text-dim, #94a3b8)',
            fontWeight: activeSubTab === 'historico' ? 700 : 500,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fas fa-history" style={{ color: activeSubTab === 'historico' ? '#2dd4bf' : 'inherit' }} />
          <span>Histórico & Comparativo</span>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: '12px',
              fontSize: '0.72rem',
              fontWeight: 800,
              background: activeSubTab === 'historico' ? '#0d9488' : 'rgba(255, 255, 255, 0.1)',
              color: '#fff'
            }}
          >
            {totalTimelineCount}
          </span>
        </button>
      </div>
    </div>
  );
}
