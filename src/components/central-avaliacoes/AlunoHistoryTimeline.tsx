'use client';

import React, { useState } from 'react';
import { downloadReavaliacaoLaudoPDF } from '@/utils/reavaliacaoPdfGenerator';

interface TimelineItem {
  id: string;
  origem: 'PhysicalAssessment' | 'PhysioReport' | 'StrengthTest' | 'ClientTestRecord';
  tipoLabel: string;
  tipoTeste?: string;
  icone: string;
  cor: string;
  data: string;
  createdAt?: string;
  avaliadorId?: string;
  resumo: string[];
  pdfUrl?: string | null;
  rawDoc?: any;
}

interface AlunoHistoryTimelineProps {
  timeline: TimelineItem[];
  longitudinal: {
    t1Id: string | null;
    t1Data: string | null;
    t2Id: string | null;
    t2Data: string | null;
    availableReports: { id: string; data: string }[];
    computed: any;
    narrative: any;
  } | null;
  onSelectComparativeDates?: (t1Id: string, t2Id: string) => void;
  onOpenNovoTeste?: () => void;
}

export default function AlunoHistoryTimeline({
  timeline,
  longitudinal,
  onSelectComparativeDates,
  onOpenNovoTeste
}: AlunoHistoryTimelineProps) {
  const [selectedDoc, setSelectedDoc] = useState<TimelineItem | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'comparativo'>('timeline');

  // Filtro de tipo na timeline
  const [selectedFilter, setSelectedFilter] = useState<string>('todos');

  const filteredTimeline = timeline.filter(item => {
    if (selectedFilter === 'todos') return true;
    if (selectedFilter === 'avaliacoes') return item.origem === 'PhysicalAssessment' || item.origem === 'PhysioReport';
    if (selectedFilter === 'forca') return item.origem === 'StrengthTest';
    if (selectedFilter === 'avulsos') return item.origem === 'ClientTestRecord';
    return true;
  });

  const formatDate = (dStr?: string) => {
    if (!dStr) return '—';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dStr;
  };

  const handlePrintLaudo = () => {
    if (longitudinal?.computed && longitudinal?.narrative) {
      downloadReavaliacaoLaudoPDF(longitudinal.computed, longitudinal.narrative);
    } else {
      alert('Selecione duas avaliações para gerar o Laudo Comparativo.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Barra de Ações e Alternância de Modo */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--bg-card)',
          padding: '12px 16px',
          borderRadius: '10px',
          border: '1px solid var(--border-color)'
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setViewMode('timeline')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: viewMode === 'timeline' ? 'var(--primary)' : 'var(--border-color)',
              background: viewMode === 'timeline' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'timeline' ? '#fff' : 'var(--text-main)',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-stream" style={{ marginRight: '6px' }} />
            Linha do Tempo ({timeline.length})
          </button>
          <button
            onClick={() => setViewMode('comparativo')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: viewMode === 'comparativo' ? 'var(--secondary)' : 'var(--border-color)',
              background: viewMode === 'comparativo' ? 'var(--secondary)' : 'transparent',
              color: viewMode === 'comparativo' ? '#fff' : 'var(--text-main)',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-columns" style={{ marginRight: '6px' }} />
            Comparativo Longitudinal (T1 vs T2)
          </button>
        </div>

        {viewMode === 'comparativo' && longitudinal?.computed && (
          <button
            onClick={handlePrintLaudo}
            className="btn btn-primary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #0d9488, #059669)',
              borderColor: '#0d9488',
              fontSize: '0.85rem',
              padding: '6px 14px',
              borderRadius: '8px'
            }}
          >
            <i className="fas fa-file-pdf" />
            Imprimir Laudo em PDF
          </button>
        )}
      </div>

      {/* MODO 1: LINHA DO TEMPO */}
      {viewMode === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Filtros da Linha do Tempo */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
            <button
              onClick={() => setSelectedFilter('todos')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                border: '1px solid var(--border-color)',
                background: selectedFilter === 'todos' ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: selectedFilter === 'todos' ? 'var(--text-main)' : 'var(--text-dim)',
                cursor: 'pointer'
              }}
            >
              Todos ({timeline.length})
            </button>
            <button
              onClick={() => setSelectedFilter('avaliacoes')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                border: '1px solid var(--border-color)',
                background: selectedFilter === 'avaliacoes' ? 'rgba(13, 148, 136, 0.15)' : 'transparent',
                color: selectedFilter === 'avaliacoes' ? 'var(--secondary)' : 'var(--text-dim)',
                cursor: 'pointer'
              }}
            >
              Avaliações Físicas / Fisioterápicas
            </button>
            <button
              onClick={() => setSelectedFilter('forca')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                border: '1px solid var(--border-color)',
                background: selectedFilter === 'forca' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                color: selectedFilter === 'forca' ? '#f59e0b' : 'var(--text-dim)',
                cursor: 'pointer'
              }}
            >
              Testes de Força (Kinology)
            </button>
            <button
              onClick={() => setSelectedFilter('avulsos')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                border: '1px solid var(--border-color)',
                background: selectedFilter === 'avulsos' ? 'rgba(236, 72, 153, 0.15)' : 'transparent',
                color: selectedFilter === 'avulsos' ? '#ec4899' : 'var(--text-dim)',
                cursor: 'pointer'
              }}
            >
              Testes Avulsos Independentes
            </button>
          </div>

          {/* Nós da Linha do Tempo */}
          {filteredTimeline.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                background: 'var(--bg-card)',
                borderRadius: '10px',
                border: '1px dashed var(--border-color)'
              }}
            >
              <i className="fas fa-clipboard-list fa-3x" style={{ color: 'var(--text-dim)', opacity: 0.4, marginBottom: '12px' }} />
              <h5 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: 'var(--text-main)' }}>Nenhum registro encontrado</h5>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', margin: '0 0 16px 0' }}>
                Este aluno ainda não possui lançamentos para este filtro.
              </p>
              {onOpenNovoTeste && (
                <button onClick={onOpenNovoTeste} className="btn btn-primary btn-sm">
                  <i className="fas fa-plus" style={{ marginRight: '6px' }} />
                  Lançar Teste Avulso Agora
                </button>
              )}
            </div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: '24px' }}>
              {/* Linha vertical condutora */}
              <div
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '12px',
                  bottom: '12px',
                  width: '2px',
                  background: 'var(--border-color)'
                }}
              />

              {filteredTimeline.map(item => (
                <div
                  key={item.id}
                  style={{
                    position: 'relative',
                    marginBottom: '16px'
                  }}
                >
                  {/* Ponto / Ícone no eixo vertical */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '-24px',
                      top: '14px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: item.cor,
                      border: '3px solid var(--bg-card)',
                      boxShadow: `0 0 8px ${item.cor}88`
                    }}
                  />

                  {/* Card do Registro */}
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      transition: 'all 0.15s ease-in-out'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: `${item.cor}20`,
                            color: item.cor,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <i className={`fas ${item.icone}`} />
                          {item.tipoLabel}
                        </span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          {formatDate(item.data)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {item.pdfUrl && (
                          <a
                            href={item.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                          >
                            <i className="fas fa-file-pdf" style={{ marginRight: '4px' }} />
                            PDF
                          </a>
                        )}
                        <button
                          onClick={() => setSelectedDoc(item)}
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                        >
                          <i className="fas fa-eye" style={{ marginRight: '4px' }} />
                          Detalhes
                        </button>
                      </div>
                    </div>

                    {/* Resumo de métricas aferidas */}
                    {item.resumo.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {item.resumo.map((m, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.04)',
                              color: 'var(--text-dim)',
                              border: '1px solid rgba(255, 255, 255, 0.06)'
                            }}
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODO 2: COMPARATIVO LONGITUDINAL (LAUDO DE REAVALIAÇÃO) */}
      {viewMode === 'comparativo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Seletor de Datas T1 e T2 */}
          {longitudinal && longitudinal.availableReports.length >= 2 ? (
            <div
              style={{
                background: 'var(--bg-card)',
                padding: '14px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>Avaliação Inicial (T1):</label>
                <select
                  value={longitudinal.t1Id || ''}
                  onChange={e => onSelectComparativeDates && onSelectComparativeDates(e.target.value, longitudinal.t2Id || '')}
                  className="form-control form-control-sm"
                  style={{ width: '140px', background: 'var(--bg-dark)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                >
                  {longitudinal.availableReports.map(r => (
                    <option key={r.id} value={r.id}>
                      {formatDate(r.data)}
                    </option>
                  ))}
                </select>
              </div>

              <i className="fas fa-arrow-right" style={{ color: 'var(--text-dim)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>Reavaliação (T2):</label>
                <select
                  value={longitudinal.t2Id || ''}
                  onChange={e => onSelectComparativeDates && onSelectComparativeDates(longitudinal.t1Id || '', e.target.value)}
                  className="form-control form-control-sm"
                  style={{ width: '140px', background: 'var(--bg-dark)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                >
                  {longitudinal.availableReports.map(r => (
                    <option key={r.id} value={r.id}>
                      {formatDate(r.data)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                background: 'var(--bg-card)',
                borderRadius: '10px',
                border: '1px dashed var(--border-color)',
                color: 'var(--text-dim)'
              }}
            >
              <i className="fas fa-info-circle fa-2x" style={{ marginBottom: '8px', color: 'var(--secondary)' }} />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                Para habilitar a análise longitudinal comparativa, este aluno precisa de pelo menos duas avaliações registradas.
              </p>
            </div>
          )}

          {/* Tabelas de Resultados Reais do Motor Longitudinal */}
          {longitudinal?.computed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 1. Tabela de Força Muscular */}
              {longitudinal.computed.tabelaForca?.length > 0 && (
                <div style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', background: 'rgba(99, 102, 241, 0.05)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-weight-hanging" style={{ color: 'var(--primary)' }} />
                    <strong style={{ fontSize: '0.9rem' }}>6. Força Muscular Isométrica (Kinology)</strong>
                  </div>
                  <div className="table-responsive" style={{ margin: 0 }}>
                    <table className="data-table" style={{ margin: 0, fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th>Movimento</th>
                          <th>Lado</th>
                          <th style={{ textAlign: 'center' }}>T1 ({formatDate(longitudinal.t1Data || '')})</th>
                          <th style={{ textAlign: 'center' }}>T2 ({formatDate(longitudinal.t2Data || '')})</th>
                          <th style={{ textAlign: 'center' }}>Variação</th>
                          <th>Situação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {longitudinal.computed.tabelaForca.map((r: any, idx: number) => {
                          const varStr = String(r.variacao ?? (r.variacaoPct != null ? `${r.variacaoPct >= 0 ? '+' : ''}${r.variacaoPct}%` : '—'));
                          const sitStr = String(r.situacao ?? r.leitura ?? 'Estável');
                          const isPos = varStr.startsWith('+');
                          const isNeg = varStr.startsWith('-');
                          return (
                            <tr key={idx}>
                              <td><strong>{r.movimento}</strong></td>
                              <td>{r.lado}</td>
                              <td style={{ textAlign: 'center' }}>{r.t1}</td>
                              <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{r.t2}</td>
                              <td style={{ textAlign: 'center', fontWeight: 'bold', color: isPos ? '#10b981' : (isNeg ? '#ef4444' : 'inherit') }}>
                                {varStr}
                              </td>
                              <td>
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: sitStr.includes('Evoluiu') ? 'rgba(16, 185, 129, 0.12)' : (sitStr.includes('Queda') ? 'rgba(239, 68, 68, 0.12)' : 'rgba(148, 163, 184, 0.1)'),
                                    color: sitStr.includes('Evoluiu') ? '#10b981' : (sitStr.includes('Queda') ? '#ef4444' : 'var(--text-dim)')
                                  }}
                                >
                                  {sitStr}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. Tabela de Simetria Bilateral */}
              {longitudinal.computed.tabelaSimetria?.length > 0 && (
                <div style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', background: 'rgba(13, 148, 136, 0.05)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-balance-scale" style={{ color: 'var(--secondary)' }} />
                    <strong style={{ fontSize: '0.9rem' }}>7. Simetria Bilateral (Déficit entre Membros)</strong>
                  </div>
                  <div className="table-responsive" style={{ margin: 0 }}>
                    <table className="data-table" style={{ margin: 0, fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th>Movimento</th>
                          <th style={{ textAlign: 'center' }}>Déficit T1</th>
                          <th style={{ textAlign: 'center' }}>Déficit T2</th>
                          <th style={{ textAlign: 'center' }}>Variação</th>
                          <th>Situação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {longitudinal.computed.tabelaSimetria.map((s: any, idx: number) => {
                          const varStr = String(s.variacao ?? (s.variacaoPP != null ? `${s.variacaoPP >= 0 ? '+' : ''}${s.variacaoPP} p.p.` : '—'));
                          const sitStr = String(s.situacao || 'Persistente');
                          return (
                            <tr key={idx}>
                              <td><strong>{s.movimento}</strong></td>
                              <td style={{ textAlign: 'center' }}>{s.t1}</td>
                              <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{s.t2}</td>
                              <td style={{ textAlign: 'center' }}>{varStr}</td>
                              <td>
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: sitStr === 'Resolvida' ? 'rgba(16, 185, 129, 0.15)' : (sitStr.includes('Melhorou') ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
                                    color: sitStr === 'Resolvida' ? '#10b981' : (sitStr.includes('Melhorou') ? '#f59e0b' : '#ef4444')
                                  }}
                                >
                                  {sitStr}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. Tabela de Goniometria */}
              {longitudinal.computed.tabelaGoniometria?.length > 0 && (
                <div style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', background: 'rgba(245, 158, 11, 0.05)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-ruler-combined" style={{ color: '#f59e0b' }} />
                    <strong style={{ fontSize: '0.9rem' }}>9. Amplitude de Movimento (Goniometria)</strong>
                  </div>
                  <div className="table-responsive" style={{ margin: 0 }}>
                    <table className="data-table" style={{ margin: 0, fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th>Movimento</th>
                          <th style={{ textAlign: 'center' }}>Referência</th>
                          <th style={{ textAlign: 'center' }}>T1</th>
                          <th style={{ textAlign: 'center' }}>T2</th>
                          <th style={{ textAlign: 'center' }}>Variação</th>
                          <th>Leitura</th>
                        </tr>
                      </thead>
                      <tbody>
                        {longitudinal.computed.tabelaGoniometria.map((g: any, idx: number) => {
                          const varStr = String(g.variacao != null ? g.variacao : '—');
                          const isPos = varStr.startsWith('+');
                          const isNeg = varStr.startsWith('-');
                          const leiStr = String(g.leitura || 'Estável');
                          return (
                            <tr key={idx}>
                              <td><strong>{g.movimento}</strong></td>
                              <td style={{ textAlign: 'center', color: 'var(--text-dim)' }}>{g.referencia}</td>
                              <td style={{ textAlign: 'center' }}>{g.t1 != null ? `${g.t1}°` : '—'}</td>
                              <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{g.t2 != null ? `${g.t2}°` : '—'}</td>
                              <td style={{ textAlign: 'center', fontWeight: 'bold', color: isPos ? '#10b981' : (isNeg ? '#ef4444' : 'inherit') }}>
                                {varStr}
                              </td>
                              <td>
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: leiStr === 'Normalizou' || leiStr === 'Evoluiu' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                    color: leiStr === 'Normalizou' || leiStr === 'Evoluiu' ? '#10b981' : '#ef4444'
                                  }}
                                >
                                  {leiStr}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. Escala de Dor EVA */}
              {longitudinal.computed.tabelaEVA?.rows?.length > 0 && (
                <div style={{ background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.05)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-heartbeat" style={{ color: '#ef4444' }} />
                    <strong style={{ fontSize: '0.9rem' }}>4. Mapeamento de Sintomas Dolorosos (Escala EVA)</strong>
                  </div>
                  <div className="table-responsive" style={{ margin: 0 }}>
                    <table className="data-table" style={{ margin: 0, fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th>Região Anatômica / Queixa</th>
                          <th style={{ textAlign: 'center' }}>Intensidade T1</th>
                          <th style={{ textAlign: 'center' }}>Intensidade T2</th>
                          <th style={{ textAlign: 'center' }}>Variação</th>
                          <th>Status Clínico</th>
                        </tr>
                      </thead>
                      <tbody>
                        {longitudinal.computed.tabelaEVA.rows.map((eva: any, idx: number) => {
                          const statusStr = String(eva.status || 'Em acompanhamento');
                          return (
                            <tr key={idx}>
                              <td><strong>{eva.queixa}</strong></td>
                              <td style={{ textAlign: 'center' }}>{eva.t1}/10</td>
                              <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{eva.t2}/10</td>
                              <td style={{ textAlign: 'center', color: Number(eva.delta) < 0 ? '#10b981' : '#ef4444' }}>
                                {eva.delta} pts
                              </td>
                              <td>
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: statusStr === 'Resolvida' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                    color: statusStr === 'Resolvida' ? '#10b981' : '#f59e0b'
                                  }}
                                >
                                  {statusStr}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE DETALHES DE UM DOCUMENTO INDIVIDUAL */}
      {selectedDoc && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '20px'
          }}
          onClick={() => setSelectedDoc(null)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '20px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <div>
                <h5 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.05rem' }}>
                  {selectedDoc.tipoLabel}
                </h5>
                <small style={{ color: 'var(--text-dim)' }}>Data do Registro: {formatDate(selectedDoc.data)}</small>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <pre
              style={{
                background: 'var(--bg-dark)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: 'var(--text-main)',
                overflowX: 'auto',
                maxHeight: '400px'
              }}
            >
              {JSON.stringify(selectedDoc.rawDoc, null, 2)}
            </pre>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setSelectedDoc(null)} className="btn btn-outline btn-sm">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
