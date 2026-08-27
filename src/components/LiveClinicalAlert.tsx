'use client';

import React from 'react';
import { BiomechanicAlert } from '@/utils/biomechanicsEngine';

interface LiveClinicalAlertProps {
  alerts: BiomechanicAlert[];
  compact?: boolean;
  title?: string;
}

export default function LiveClinicalAlert({ alerts, compact = false, title }: LiveClinicalAlertProps) {
  if (!alerts || alerts.length === 0) return null;

  const criticos = alerts.filter(a => a.tipo === 'critico');
  const atencoes = alerts.filter(a => a.tipo === 'atencao');
  const normais = alerts.filter(a => a.tipo === 'normal');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      margin: '10px 0',
      width: '100%',
      animation: 'fadeIn 0.2s ease-in-out'
    }}>
      {title && (
        <div style={{
          fontSize: '12px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: criticos.length > 0 ? '#ef4444' : atencoes.length > 0 ? '#f59e0b' : '#10b981',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span>{criticos.length > 0 ? '🚨 Alerta Clínico' : atencoes.length > 0 ? '⚠️ Ponto de Atenção' : '✅ Parâmetros Normais'}</span>
          <span style={{ fontSize: '11px', opacity: 0.8 }}>({alerts.length} indicativo{alerts.length > 1 ? 's' : ''})</span>
        </div>
      )}

      {alerts.map((al, idx) => {
        const isCritico = al.tipo === 'critico';
        const isAtencao = al.tipo === 'atencao';

        const bg = isCritico
          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(185, 28, 28, 0.08) 100%)'
          : isAtencao
          ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(180, 83, 9, 0.08) 100%)'
          : 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.06) 100%)';

        const border = isCritico ? 'rgba(239, 68, 68, 0.4)' : isAtencao ? 'rgba(245, 158, 11, 0.4)' : 'rgba(16, 185, 129, 0.3)';
        const accent = isCritico ? '#ef4444' : isAtencao ? '#f59e0b' : '#10b981';

        if (compact) {
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: '8px',
                background: bg,
                border: `1px solid ${border}`,
                fontSize: '11.5px',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f8fafc', fontWeight: 600 }}>
                <span>{isCritico ? '🚨' : isAtencao ? '⚠️' : '✅'}</span>
                <span>{al.titulo}</span>
                {al.valorCalculado && (
                  <span style={{ color: accent, background: 'rgba(0,0,0,0.3)', padding: '1px 6px', borderRadius: '4px', fontSize: '10.5px' }}>
                    {al.valorCalculado}
                  </span>
                )}
              </div>
              {al.referenciaIdeal && (
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10.5px' }}>
                  Ref: <span style={{ color: '#fff' }}>{al.referenciaIdeal}</span>
                </div>
              )}
            </div>
          );
        }

        return (
          <div
            key={idx}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: bg,
              border: `1px solid ${border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: isCritico ? '0 2px 10px rgba(239, 68, 68, 0.1)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontWeight: 700, fontSize: '12.5px' }}>
                <span>{isCritico ? '🚨' : isAtencao ? '⚠️' : '✅'}</span>
                <span>{al.titulo}</span>
                {al.lado && (
                  <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
                    {al.lado}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                {al.valorCalculado && (
                  <span style={{ color: accent, fontWeight: 700, background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '6px' }}>
                    Obtido: {al.valorCalculado}
                  </span>
                )}
                {al.referenciaIdeal && (
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Ideal: <strong style={{ color: '#fff' }}>{al.referenciaIdeal}</strong>
                  </span>
                )}
              </div>
            </div>

            {al.descricao && (
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11.5px', marginTop: '2px' }}>
                {al.descricao}
              </div>
            )}

            {al.riscoClinico && (
              <div style={{
                color: isCritico ? '#fca5a5' : isAtencao ? '#fde68a' : '#a7f3d0',
                fontSize: '11px',
                fontStyle: 'italic',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '2px'
              }}>
                <strong>Risco Clínico:</strong> {al.riscoClinico}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
