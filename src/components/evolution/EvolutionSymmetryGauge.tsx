'use client';

import React from 'react';
import { SymmetryEvolution } from '@/utils/studentEvolutionEngine';

interface EvolutionSymmetryGaugeProps {
  symmetry: SymmetryEvolution;
  color?: string;
}

export default function EvolutionSymmetryGauge({ symmetry, color = '#38bdf8' }: EvolutionSymmetryGaugeProps) {
  const isEquilibrado = symmetry.ultimaClassificacao === 'Equilibrado';
  const isLeve = symmetry.ultimaClassificacao === 'Assimetria Leve';

  const badgeColor = isEquilibrado ? '#34d399' : isLeve ? '#fbbf24' : '#f87171';
  const badgeBg = isEquilibrado ? 'rgba(16, 185, 129, 0.12)' : isLeve ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)';
  const badgeBorder = isEquilibrado ? 'rgba(16, 185, 129, 0.35)' : isLeve ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.35)';

  // Balanço central: 50% é o centro perfeito
  const total = symmetry.ultimoD + symmetry.ultimoE || 1;
  const pctD = Number(((symmetry.ultimoD / total) * 100).toFixed(1));
  const pctE = Number(((symmetry.ultimoE / total) * 100).toFixed(1));

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)'
      }}
    >
      {/* Top: Título & Status de Simetria */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color }}>
            Equilíbrio Bilateral
          </span>
          <h4 style={{ margin: '2px 0 0', fontSize: '0.96rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.2px' }}>
            {symmetry.nome}
          </h4>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 8px',
            borderRadius: '8px',
            background: badgeBg,
            border: `1px solid ${badgeBorder}`,
            color: badgeColor,
            fontWeight: 800,
            fontSize: '0.72rem',
            whiteSpace: 'nowrap'
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: badgeColor }}></span>
          <span>{symmetry.ultimaClassificacao}</span>
        </div>
      </div>

      {/* Middle: Comparativo Direito vs Esquerdo com Valores */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '12px',
          padding: '10px 14px'
        }}
      >
        {/* Lado Direito */}
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '0.70rem', color: '#94a3b8', fontWeight: 600 }}>Lado Direito</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>
            {symmetry.ultimoD} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>{symmetry.unidade}</span>
          </div>
        </div>

        {/* Centro: Índice de Simetria */}
        <div style={{ textAlign: 'center', padding: '0 8px' }}>
          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Simetria</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 900, color: badgeColor, marginTop: '1px' }}>
            {symmetry.ultimoIndiceSimetria}%
          </div>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            Dif: {symmetry.ultimaDiferenca} {symmetry.unidade}
          </div>
        </div>

        {/* Lado Esquerdo */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.70rem', color: '#94a3b8', fontWeight: 600 }}>Lado Esquerdo</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>
            {symmetry.ultimoE} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>{symmetry.unidade}</span>
          </div>
        </div>
      </div>

      {/* Barra de Balanço Central (Tug-of-War Gauge) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div
          style={{
            height: '8px',
            borderRadius: '4px',
            background: 'rgba(255, 255, 255, 0.08)',
            display: 'flex',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {/* Marcador central de 50% */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: '2px',
              background: '#ffffff',
              transform: 'translateX(-50%)',
              zIndex: 2,
              opacity: 0.7
            }}
          ></div>

          <div style={{ width: `${pctD}%`, background: 'linear-gradient(90deg, #3b82f6, #38bdf8)' }}></div>
          <div style={{ width: `${pctE}%`, background: 'linear-gradient(90deg, #818cf8, #a855f7)' }}></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#64748b' }}>
          <span>Direito: {pctD}%</span>
          <span>Centro Perfeito</span>
          <span>Esquerdo: {pctE}%</span>
        </div>
      </div>

      {/* Evolução Histórica da Simetria (se houver variação) */}
      {symmetry.evolucaoSimetriaDelta !== undefined && symmetry.penultimoIndiceSimetria !== undefined && (
        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            paddingTop: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.70rem',
            color: '#94a3b8'
          }}
        >
          <span>Evolução da Simetria:</span>
          <span
            style={{
              fontWeight: 800,
              color: symmetry.evolucaoSimetriaDelta >= 0 ? '#34d399' : '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <i className={`fa-solid ${symmetry.evolucaoSimetriaDelta >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`}></i>
            {symmetry.penultimoIndiceSimetria}% → {symmetry.ultimoIndiceSimetria}% ({symmetry.evolucaoSimetriaDelta >= 0 ? `+${symmetry.evolucaoSimetriaDelta}` : symmetry.evolucaoSimetriaDelta}%)
          </span>
        </div>
      )}
    </div>
  );
}
