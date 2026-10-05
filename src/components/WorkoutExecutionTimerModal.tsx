'use client';

import React, { useState, useEffect, useRef } from 'react';
import { formatSecondsToTime } from '@/utils/workoutTimeEngine';

interface WorkoutExecutionTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  targetSeconds: number;
  seriesTotal?: number;
  onCompleteSeries?: (seriesIndex: number) => void;
}

export const WorkoutExecutionTimerModal: React.FC<WorkoutExecutionTimerModalProps> = ({
  isOpen,
  onClose,
  exerciseName,
  targetSeconds,
  seriesTotal = 1,
  onCompleteSeries
}) => {
  const [currentSeries, setCurrentSeries] = useState(1);
  const [timeLeft, setTimeLeft] = useState(targetSeconds);
  const [initialDuration, setInitialDuration] = useState(targetSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reiniciar quando o modal abre ou os segundos alvo mudam
  useEffect(() => {
    if (isOpen) {
      const s = Math.max(1, targetSeconds || 60);
      setTimeLeft(s);
      setInitialDuration(s);
      setIsRunning(false);
      setIsFinished(false);
      setCurrentSeries(1);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isOpen, targetSeconds]);

  // Web Audio API sintetizador suave de beep/conclusão
  const playBeep = (freq = 880, duration = 0.15, count = 1) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      let now = ctx.currentTime;
      for (let i = 0; i < count; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration);

        now += duration + 0.08;
      }
    } catch (e) {
      // AudioContext bloqueado pelo navegador até interação
    }
  };

  // Cronômetro regressivo com intervalo de 1s
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            setIsFinished(true);
            playBeep(980, 0.25, 3); // Três beeps de comemoração
            return 0;
          }
          // Beep suave nos últimos 3 segundos
          if (prev <= 4 && prev > 1) {
            playBeep(660, 0.1, 1);
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft, soundEnabled]);

  // Tecla de atalho: Espaço para Play/Pause, Esc para Fechar
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsRunning(prev => !prev);
      } else if (e.code === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const progressPercent = Math.min(
    100,
    Math.max(0, ((initialDuration - timeLeft) / initialDuration) * 100)
  );

  const handleReset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(initialDuration);
    setIsRunning(false);
    setIsFinished(false);
  };

  const handleAdjustTime = (deltaSeconds: number) => {
    setTimeLeft(prev => {
      const next = Math.max(0, prev + deltaSeconds);
      if (next > initialDuration) {
        setInitialDuration(next);
      }
      if (next > 0) setIsFinished(false);
      return next;
    });
  };

  const handleNextSeriesOrFinish = () => {
    if (onCompleteSeries) {
      onCompleteSeries(currentSeries);
    }

    if (currentSeries < seriesTotal) {
      // Avança para a próxima série
      setCurrentSeries(prev => prev + 1);
      setTimeLeft(initialDuration);
      setIsRunning(false);
      setIsFinished(false);
    } else {
      // Treino do exercício concluído
      onClose();
    }
  };

  // Formatar tempo em mm:ss
  const formatTimeMinutesSeconds = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999999,
        background: 'rgba(3, 7, 18, 0.88)',
        backdropFilter: 'blur(10px)',
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
          maxWidth: '480px',
          background: 'radial-gradient(circle at top, #0d1527 0%, #060913 100%)',
          border: isFinished ? '2px solid #10b981' : isRunning ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: isFinished
            ? '0 0 50px rgba(16, 185, 129, 0.4), 0 25px 60px rgba(0, 0, 0, 0.9)'
            : isRunning
            ? '0 0 40px rgba(56, 189, 248, 0.3), 0 25px 60px rgba(0, 0, 0, 0.9)'
            : '0 25px 60px rgba(0, 0, 0, 0.9)',
          borderRadius: '20px',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          color: '#fff',
          transition: 'all 0.3s ease'
        }}
      >
        {/* Botão de Fechar no Topo */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            color: '#94a3b8',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.90rem',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        {/* Botão de Som Mute/Unmute */}
        <button
          type="button"
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? 'Silenciar beeps' : 'Ativar beeps sonoros'}
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            color: soundEnabled ? '#38bdf8' : '#64748b',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.85rem'
          }}
        >
          <i className={`fa-solid fa-volume-${soundEnabled ? 'high' : 'xmark'}`}></i>
        </button>

        {/* Cabeçalho do Exercício */}
        <div style={{ textAlign: 'center', marginTop: '4px', marginBottom: '16px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 10px',
              borderRadius: '20px',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              fontSize: '0.70rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              marginBottom: '6px'
            }}
          >
            <i className="fa-solid fa-person-running"></i>
            <span>Execução de Treino</span>
          </div>

          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: 900,
              color: '#f8fafc',
              margin: '0 0 4px',
              letterSpacing: '-0.3px'
            }}
          >
            {exerciseName || 'Exercício'}
          </h3>

          <div style={{ fontSize: '0.80rem', color: '#94a3b8', fontWeight: 600 }}>
            {seriesTotal > 1 ? (
              <span>
                Série <strong style={{ color: '#38bdf8' }}>{currentSeries}</strong> de {seriesTotal} • Meta:{' '}
                {formatSecondsToTime(initialDuration)}
              </span>
            ) : (
              <span>
                Série Única Contínua • Meta: <strong style={{ color: '#38bdf8' }}>{formatSecondsToTime(initialDuration)}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Display Central do Timer */}
        <div
          style={{
            position: 'relative',
            width: '240px',
            height: '240px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '10px 0 20px'
          }}
        >
          {/* Anel SVG de Progresso */}
          <svg
            width="240"
            height="240"
            viewBox="0 0 240 240"
            style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}
          >
            {/* Círculo de fundo */}
            <circle
              cx="120"
              cy="120"
              r="105"
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.06)"
              strokeWidth="10"
            />
            {/* Círculo animado de progresso */}
            <circle
              cx="120"
              cy="120"
              r="105"
              fill="transparent"
              stroke={isFinished ? '#10b981' : isRunning ? '#38bdf8' : '#64748b'}
              strokeWidth="10"
              strokeDasharray={2 * Math.PI * 105}
              strokeDashoffset={2 * Math.PI * 105 * (1 - progressPercent / 100)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.3s ease' }}
            />
          </svg>

          {/* Conteúdo Digital Central */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2
            }}
          >
            {/* Tag de Estado */}
            <div
              style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: isFinished ? '#10b981' : isRunning ? '#38bdf8' : '#94a3b8',
                marginBottom: '4px'
              }}
            >
              {isFinished ? '🎉 Concluído!' : isRunning ? '⚡ Em Execução' : '⏸️ Pausado'}
            </div>

            {/* Mostrador Digital Grande */}
            <div
              style={{
                fontSize: '3.2rem',
                fontWeight: 900,
                fontFamily: 'monospace, monospace',
                letterSpacing: '2px',
                color: isFinished ? '#34d399' : isRunning ? '#38bdf8' : '#ffffff',
                textShadow: isRunning ? '0 0 25px rgba(56, 189, 248, 0.5)' : 'none',
                lineHeight: 1
              }}
            >
              {formatTimeMinutesSeconds(timeLeft)}
            </div>

            {/* Segundos totais restantes */}
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '6px', fontWeight: 600 }}>
              {timeLeft}s restantes ({Math.round(progressPercent)}%)
            </div>
          </div>
        </div>

        {/* Ajustes Rápidos de Tempo (+30s, +1min, -30s) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => handleAdjustTime(-30)}
            disabled={timeLeft <= 30}
            style={{
              padding: '5px 10px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: timeLeft <= 30 ? '#475569' : '#cbd5e1',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: timeLeft <= 30 ? 'not-allowed' : 'pointer'
            }}
          >
            -30s
          </button>
          <button
            type="button"
            onClick={() => handleAdjustTime(30)}
            style={{
              padding: '5px 10px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#cbd5e1',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            +30s
          </button>
          <button
            type="button"
            onClick={() => handleAdjustTime(60)}
            style={{
              padding: '5px 10px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              color: '#38bdf8',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            +1 min
          </button>
          <button
            type="button"
            onClick={handleReset}
            title="Reiniciar cronômetro"
            style={{
              padding: '5px 10px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <i className="fa-solid fa-rotate-left"></i>
          </button>
        </div>

        {/* Controles Principais: Play / Pause / Concluir */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '360px' }}>
          {!isFinished ? (
            <button
              type="button"
              onClick={() => setIsRunning(!isRunning)}
              style={{
                flex: 1,
                height: '48px',
                borderRadius: '12px',
                border: 'none',
                background: isRunning
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                fontSize: '0.95rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: isRunning
                  ? '0 6px 20px rgba(245, 158, 11, 0.35)'
                  : '0 6px 20px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              <i className={`fa-solid fa-${isRunning ? 'pause' : 'play'}`}></i>
              <span>{isRunning ? 'Pausar' : 'Iniciar Execução'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextSeriesOrFinish}
              style={{
                flex: 1,
                height: '48px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981, #047857)',
                color: '#fff',
                fontSize: '0.95rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 6px 25px rgba(16, 185, 129, 0.5)',
                transition: 'all 0.15s ease'
              }}
            >
              <i className="fa-solid fa-check"></i>
              <span>
                {currentSeries < seriesTotal ? `Avançar para Série ${currentSeries + 1}` : 'Concluir Exercício'}
              </span>
            </button>
          )}
        </div>

        {/* Dica de atalho no rodapé */}
        <div style={{ marginTop: '14px', fontSize: '0.68rem', color: '#64748b', textAlign: 'center' }}>
          Dica: Pressione <strong style={{ color: '#94a3b8' }}>[Espaço]</strong> para Iniciar/Pausar •{' '}
          <strong style={{ color: '#94a3b8' }}>[Esc]</strong> para Fechar
        </div>
      </div>
    </div>
  );
};

export default WorkoutExecutionTimerModal;
