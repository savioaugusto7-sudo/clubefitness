'use client';

import React, { useState } from 'react';
import { EvolutionDataPoint } from '@/utils/studentEvolutionEngine';

export interface ChartSeries {
  id: string;
  nome: string;
  unidade: string;
  cor: string;
  pontos: EvolutionDataPoint[];
}

interface EvolutionSplineChartProps {
  series: ChartSeries[];
  titulo?: string;
  subtitulo?: string;
  altura?: number;
}

export default function EvolutionSplineChart({
  series,
  titulo = 'Curva Histórica de Evolução',
  subtitulo = 'Toque em qualquer ponto da curva para ver detalhes',
  altura = 240
}: EvolutionSplineChartProps) {
  const [activeTooltip, setActiveTooltip] = useState<{
    x: number;
    y: number;
    data: string;
    valor: number;
    unidade: string;
    nome: string;
    cor: string;
    avaliador?: string;
  } | null>(null);

  const [visibleSeriesIds, setVisibleSeriesIds] = useState<string[]>(series.map(s => s.id));

  const filteredSeries = series.filter(s => visibleSeriesIds.includes(s.id));
  if (filteredSeries.length === 0 || filteredSeries.every(s => s.pontos.length < 2)) {
    return null;
  }

  // Coleta todas as datas únicas ordenadas
  const allDates = Array.from(
    new Set(filteredSeries.flatMap(s => s.pontos.map(p => p.data)))
  ).sort();

  if (allDates.length < 2) return null;

  // Encontra valores min e max de todas as séries ativas
  const allValues = filteredSeries.flatMap(s => s.pontos.map(p => p.valor));
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const range = rawMax - rawMin || 10;
  const minVal = Math.max(0, rawMin - range * 0.15);
  const maxVal = rawMax + range * 0.15;

  const w = 600;
  const h = altura;
  const padL = 46;
  const padR = 24;
  const padT = 24;
  const padB = 34;

  const getX = (dateStr: string) => {
    const idx = allDates.indexOf(dateStr);
    if (idx === -1) return padL;
    return padL + (idx / (allDates.length - 1)) * (w - padL - padR);
  };

  const getY = (val: number) => {
    return h - padB - ((val - minVal) / (maxVal - minVal)) * (h - padT - padB);
  };

  // Gerador de curva suave Bézier
  const generateSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };

  const toggleSeries = (id: string) => {
    if (visibleSeriesIds.includes(id)) {
      if (visibleSeriesIds.length > 1) {
        setVisibleSeriesIds(visibleSeriesIds.filter(sId => sId !== id));
      }
    } else {
      setVisibleSeriesIds([...visibleSeriesIds, id]);
    }
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.65) 0%, rgba(15, 23, 42, 0.85) 100%)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '18px',
        padding: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        position: 'relative'
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-chart-line" style={{ color: '#38bdf8' }}></i>
            {titulo}
          </h4>
          <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#94a3b8' }}>
            {subtitulo}
          </p>
        </div>

        {/* Chips de Legenda Tocáveis (Liga/Desliga no Mobile) */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {series.map(s => {
            const isActive = visibleSeriesIds.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSeries(s.id)}
                style={{
                  background: isActive ? `${s.cor}22` : 'rgba(255, 255, 255, 0.04)',
                  border: `1px solid ${isActive ? s.cor : 'rgba(255, 255, 255, 0.1)'}`,
                  color: isActive ? '#ffffff' : '#64748b',
                  borderRadius: '20px',
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.cor }}></span>
                <span>{s.nome}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Container Responsivo */}
      <div style={{ position: 'relative', width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          width="100%"
          height={altura}
          style={{ display: 'block', minWidth: '320px', overflow: 'visible' }}
          onClick={() => setActiveTooltip(null)}
        >
          {/* Grids Horizontais */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const gridY = padT + ratio * (h - padT - padB);
            const val = maxVal - ratio * (maxVal - minVal);
            return (
              <g key={idx}>
                <line
                  x1={padL}
                  y1={gridY}
                  x2={w - padR}
                  y2={gridY}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeDasharray="3 3"
                  strokeWidth="0.7"
                />
                <text
                  x={padL - 8}
                  y={gridY + 3}
                  textAnchor="end"
                  style={{ fill: '#64748b', fontSize: '9px', fontWeight: 600 }}
                >
                  {val.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Rótulos de Datas no Eixo X */}
          {allDates.map((dt, idx) => {
            const x = getX(dt);
            const dtObj = new Date(dt + 'T12:00:00');
            const dayMonth = !isNaN(dtObj.getTime())
              ? `${dtObj.getDate()}/${dtObj.getMonth() + 1}`
              : dt;

            return (
              <text
                key={idx}
                x={x}
                y={h - 10}
                textAnchor="middle"
                style={{ fill: '#94a3b8', fontSize: '9px', fontWeight: 700 }}
              >
                {dayMonth}
              </text>
            );
          })}

          {/* Curvas e Áreas de Cada Série */}
          {filteredSeries.map(s => {
            const pts = s.pontos.map(p => ({ x: getX(p.data), y: getY(p.valor) }));
            const splinePath = generateSmoothPath(pts);
            if (!splinePath) return null;

            // Área preenchida com degradê
            const areaPath = `${splinePath} L ${pts[pts.length - 1].x} ${h - padB} L ${pts[0].x} ${h - padB} Z`;

            return (
              <g key={s.id}>
                {/* Degradê de Área */}
                <defs>
                  <linearGradient id={`grad_${s.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.cor} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={s.cor} stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <path d={areaPath} fill={`url(#grad_${s.id})`} />
                <path
                  d={splinePath}
                  fill="none"
                  stroke={s.cor}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Marcadores em Cada Ponto com Interação Touch */}
                {s.pontos.map((p, pIdx) => {
                  const ptX = getX(p.data);
                  const ptY = getY(p.valor);
                  return (
                    <g
                      key={pIdx}
                      style={{ cursor: 'pointer' }}
                      onClick={e => {
                        e.stopPropagation();
                        setActiveTooltip({
                          x: ptX,
                          y: ptY,
                          data: p.dataFormatada,
                          valor: p.valor,
                          unidade: s.unidade,
                          nome: s.nome,
                          cor: s.cor,
                          avaliador: p.avaliador
                        });
                      }}
                    >
                      {/* Círculo invisível maior para alvo de toque no mobile (hit area) */}
                      <circle cx={ptX} cy={ptY} r="16" fill="transparent" />
                      <circle
                        cx={ptX}
                        cy={ptY}
                        r="5"
                        fill="#0f172a"
                        stroke={s.cor}
                        strokeWidth="2.5"
                      />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Tooltip Flutuante Interativo (Glass Tooltip) */}
        {activeTooltip && (
          <div
            style={{
              position: 'absolute',
              left: `${Math.min(Math.max(activeTooltip.x - 70, 10), w - 160)}px`,
              top: `${Math.max(activeTooltip.y - 70, 0)}px`,
              background: '#090d16',
              border: `1px solid ${activeTooltip.cor}`,
              boxShadow: `0 8px 24px rgba(0, 0, 0, 0.6), 0 0 12px ${activeTooltip.cor}33`,
              borderRadius: '10px',
              padding: '8px 12px',
              zIndex: 10,
              pointerEvents: 'none',
              minWidth: '130px'
            }}
          >
            <div style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 600 }}>
              📅 {activeTooltip.data}
            </div>
            <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#ffffff', marginTop: '2px' }}>
              {activeTooltip.valor} {activeTooltip.unidade}
            </div>
            <div style={{ fontSize: '0.68rem', color: activeTooltip.cor, fontWeight: 700 }}>
              {activeTooltip.nome}
            </div>
            {activeTooltip.avaliador && (
              <div style={{ fontSize: '0.62rem', color: '#64748b', marginTop: '2px' }}>
                Por: {activeTooltip.avaliador}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
