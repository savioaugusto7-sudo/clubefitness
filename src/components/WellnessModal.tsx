'use client';

import React, { useState, useEffect } from 'react';
import { calculateWellness, WellnessResult } from '@/utils/wellnessHelper';

interface WellnessModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onConfirm: (wellnessData: { sono: number; fadiga: number; dorMuscular: number }) => Promise<void>;
}

export default function WellnessModal({ isOpen, onClose, appointment, onConfirm }: WellnessModalProps) {
  const [sono, setSono] = useState<number>(3);
  const [fadiga, setFadiga] = useState<number>(3);
  const [dorMuscular, setDorMuscular] = useState<number>(2);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [summaryResult, setSummaryResult] = useState<WellnessResult | null>(null);
  const loadedAptIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (isOpen && appointment) {
      const currentId = String(appointment._id || '');
      if (loadedAptIdRef.current !== currentId) {
        loadedAptIdRef.current = currentId;
        if (appointment?.wellness?.realizado) {
          setSono(appointment.wellness.sono || 3);
          setFadiga(appointment.wellness.fadiga || 3);
          setDorMuscular(appointment.wellness.dorMuscular || 2);
        } else {
          setSono(3);
          setFadiga(3);
          setDorMuscular(2);
        }
        setErrorMessage('');
        setShowSummary(false);
        setSummaryResult(null);
      }
    } else if (!isOpen) {
      loadedAptIdRef.current = null;
      setShowSummary(false);
      setSummaryResult(null);
    }
  }, [isOpen, appointment?._id]);

  if (!isOpen || !appointment) return null;

  const currentResult = calculateWellness(sono, fadiga, dorMuscular);
  const clientName = appointment.clienteId?.dadosPessoais?.nome || appointment.clienteId?.nome || 'Aluno';
  const dataFormatada = appointment.data ? new Date(appointment.data + 'T12:00:00').toLocaleDateString('pt-BR') : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage('');
    try {
      await onConfirm({ sono, fadiga, dorMuscular });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao registrar questionário Wellness.');
      setIsSaving(false);
    }
  };

  const renderScaleButtons = (
    value: number, 
    setValue: (val: number) => void, 
    minLabel: string, 
    maxLabel: string,
    invertColors = false
  ) => {
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '4px', marginTop: '8px' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
            const isSelected = value === num;
            let btnBg = 'rgba(255, 255, 255, 0.05)';
            let btnColor = 'var(--text-main, #fff)';
            let borderColor = 'var(--border-color, rgba(255,255,255,0.1))';

            if (isSelected) {
              if (invertColors) {
                // Para sono: 8-10 é Ótimo (Verde), 6-7 é Moderado (Amarelo), 4-5 é Alerta (Laranja), 1-3 é Crítico (Vermelho)
                if (num >= 8) {
                  btnBg = '#10b981';
                  btnColor = '#fff';
                  borderColor = '#10b981';
                } else if (num >= 6) {
                  btnBg = '#eab308';
                  btnColor = '#000';
                  borderColor = '#eab308';
                } else if (num >= 4) {
                  btnBg = '#f97316';
                  btnColor = '#fff';
                  borderColor = '#f97316';
                } else {
                  btnBg = '#ef4444';
                  btnColor = '#fff';
                  borderColor = '#ef4444';
                }
              } else {
                // Para fadiga e dor: 1-3 é Bom (Verde), 4-6 é Moderado (Amarelo), 7-8 é Alto (Laranja), 9-10 é Severo (Vermelho)
                if (num <= 3) {
                  btnBg = '#10b981';
                  btnColor = '#fff';
                  borderColor = '#10b981';
                } else if (num <= 6) {
                  btnBg = '#eab308';
                  btnColor = '#000';
                  borderColor = '#eab308';
                } else if (num <= 8) {
                  btnBg = '#f97316';
                  btnColor = '#fff';
                  borderColor = '#f97316';
                } else {
                  btnBg = '#ef4444';
                  btnColor = '#fff';
                  borderColor = '#ef4444';
                }
              }
            }

            return (
              <button
                key={num}
                type="button"
                onClick={() => setValue(num)}
                style={{
                  height: '42px',
                  borderRadius: '8px',
                  border: `2px solid ${borderColor}`,
                  background: btnBg,
                  color: btnColor,
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isSelected ? '0 0 10px rgba(0,0,0,0.3)' : 'none'
                }}
              >
                {num}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)', marginTop: '4px', padding: '0 2px' }}>
          <span>{invertColors ? '🔴 1 = ' + minLabel : '🟢 1 = ' + minLabel}</span>
          <span>{invertColors ? '🟢 10 = ' + maxLabel : '🔴 10 = ' + maxLabel}</span>
        </div>
      </div>
    );
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
      }}
      onClick={() => {
        if (!isSaving && showSummary) onClose();
      }}
    >
      <div 
        style={{
          background: 'var(--bg-card, #1e293b)',
          border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '560px',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
          maxHeight: '94vh',
          overflowY: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* MODAL 2: Resumo e Confirmação de Conduta (Pós-salvamento) */}
        {showSummary && summaryResult ? (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: summaryResult.statusBadgeBg,
                color: summaryResult.statusColor,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                marginBottom: '12px',
                border: `2px solid ${summaryResult.statusColor}`
              }}>
                <i className="fa-solid fa-check"></i>
              </div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main, #fff)' }}>
                Presença Registrada com Sucesso!
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
                {clientName} • {dataFormatada} às {appointment.horario}
              </p>
            </div>

            {/* Box do Laudo do Dia */}
            <div style={{
              background: 'var(--bg-darker, #0f172a)',
              border: `2px solid ${summaryResult.statusColor}`,
              borderRadius: '16px',
              padding: '18px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-muted, #94a3b8)' }}>
                  🧘 WELLNESS DO DIA
                </span>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  background: summaryResult.statusBadgeBg,
                  color: summaryResult.statusColor,
                  border: `1px solid ${summaryResult.statusColor}`
                }}>
                  {summaryResult.statusLabel}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center', marginBottom: '14px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sono</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{sono}<small style={{ fontSize: '0.7rem' }}>/10</small></div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Fadiga</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{fadiga}<small style={{ fontSize: '0.7rem' }}>/10</small></div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Dor Muscular</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{dorMuscular}<small style={{ fontSize: '0.7rem' }}>/10</small></div>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Wellness Score Total: </span>
                <strong style={{ fontSize: '1.1rem', color: summaryResult.statusColor }}>{summaryResult.score} / 30 pts</strong>
              </div>

              <div style={{
                background: summaryResult.statusBadgeBg,
                border: `1px solid ${summaryResult.statusColor}`,
                borderRadius: '10px',
                padding: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: summaryResult.statusColor, textTransform: 'uppercase', marginBottom: '2px' }}>
                  🎯 Conduta Recomendada para o Treino:
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main, #fff)' }}>
                  {summaryResult.conduta}
                </div>
              </div>

              {summaryResult.regrasAtivadas?.length > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                  ⚠️ Regra Clínica: {summaryResult.regrasAtivadas.join(' • ')}
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={onClose}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.95rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Concluir e Iniciar Atendimento
            </button>
          </div>
        ) : (
          /* MODAL 1: Formulário do Questionário Wellness (1 minuto) */
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.3rem' }}>🧘</span>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main, #fff)' }}>
                    Questionário Wellness do Dia
                  </h3>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)' }}>
                  Obrigatório para registrar a presença de <strong style={{ color: 'var(--text-main, #fff)' }}>{clientName}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {/* Pergunta 1: Sono */}
            <div style={{ marginBottom: '16px', background: 'var(--bg-darker, #0f172a)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main, #fff)' }}>
                  1. Qualidade do Sono na Noite Anterior:
                </label>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: sono >= 8 ? '#10b981' : sono >= 6 ? '#eab308' : sono >= 4 ? '#f97316' : '#ef4444' }}>
                  {sono}/10
                </span>
              </div>
              {renderScaleButtons(sono, setSono, 'Péssimo / Insônia', 'Excelente / Reparador', true)}
            </div>

            {/* Pergunta 2: Fadiga */}
            <div style={{ marginBottom: '16px', background: 'var(--bg-darker, #0f172a)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main, #fff)' }}>
                  2. Qual seu nível de fadiga / cansaço agora?
                </label>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: fadiga <= 3 ? '#10b981' : fadiga <= 7 ? '#eab308' : '#ef4444' }}>
                  {fadiga}/10
                </span>
              </div>
              {renderScaleButtons(fadiga, setFadiga, 'Disposto / Com Energia', 'Exaustão Extrema')}
            </div>

            {/* Pergunta 3: Dor Muscular */}
            <div style={{ marginBottom: '16px', background: 'var(--bg-darker, #0f172a)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main, #fff)' }}>
                  3. Como está sua dor muscular?
                </label>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: dorMuscular <= 3 ? '#10b981' : dorMuscular <= 7 ? '#eab308' : '#ef4444' }}>
                  {dorMuscular}/10
                </span>
              </div>
              {renderScaleButtons(dorMuscular, setDorMuscular, 'Sem Dor', 'Dor Severa / Incapacitante')}
            </div>

            {/* Pré-visualização em tempo real do Score e Status */}
            <div style={{
              background: currentResult.statusBadgeBg,
              border: `1px solid ${currentResult.statusColor}`,
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>WELLNESS SCORE PREVISTO:</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: currentResult.statusColor }}>
                  {currentResult.score} / 30 pts • {currentResult.statusLabel}
                </div>
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main, #fff)', textAlign: 'right' }}>
                👉 {currentResult.conduta}
              </div>
            </div>

            {errorMessage && (
              <div style={{ color: '#ef4444', fontSize: '0.84rem', background: 'rgba(239,68,68,0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', marginBottom: '14px' }}>
                ⚠️ {errorMessage}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isSaving}
                onClick={onClose}
                style={{ padding: '10px 18px', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                {isSaving ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Registrando...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check"></i> Confirmar Presença e Salvar
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
