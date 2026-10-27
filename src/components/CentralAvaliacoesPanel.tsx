'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AlunoCardList, { AlunoSummary } from './central-avaliacoes/AlunoCardList';
import AlunoEvolutionDashboard from './central-avaliacoes/AlunoEvolutionDashboard';
import AlunoHistoryTimeline from './central-avaliacoes/AlunoHistoryTimeline';
import AvulsoTestModal from './central-avaliacoes/AvulsoTestModal';

interface CentralAvaliacoesPanelProps {
  onOpenCompletaPhysical?: () => void;
  onOpenCompletaPhysio?: () => void;
}

export default function CentralAvaliacoesPanel({
  onOpenCompletaPhysical,
  onOpenCompletaPhysio
}: CentralAvaliacoesPanelProps) {
  const [alunos, setAlunos] = useState<AlunoSummary[]>([]);
  const [loadingAlunos, setLoadingAlunos] = useState(true);
  const [selectedAlunoId, setSelectedAlunoId] = useState<string | null>(null);

  // Dados do Aluno Selecionado
  const [alunoDetail, setAlunoDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Controle de Abas da Central Individual
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'historico'>('dashboard');
  const [showNovoTesteModal, setShowNovoTesteModal] = useState(false);

  // 1. Carregar Lista de Alunos Inicial
  const loadAlunos = useCallback(async () => {
    setLoadingAlunos(true);
    try {
      const res = await fetch('/api/central-avaliacoes/alunos');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAlunos(json.data);
        // Se nenhum aluno selecionado, seleciona o primeiro com avaliações ou o primeiro da lista
        if (!selectedAlunoId && json.data.length > 0) {
          const comAval = json.data.find((a: any) => a.totalGeral > 0) || json.data[0];
          setSelectedAlunoId(comAval._id);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar lista de alunos na Central:', err);
    } finally {
      setLoadingAlunos(false);
    }
  }, [selectedAlunoId]);

  useEffect(() => {
    loadAlunos();
  }, [loadAlunos]);

  // 2. Carregar Detalhes Completos do Aluno Selecionado
  const loadAlunoDetail = useCallback(async (clientId: string, t1Id?: string, t2Id?: string) => {
    setLoadingDetail(true);
    setDetailError(null);
    try {
      let url = `/api/central-avaliacoes/aluno?clientId=${clientId}`;
      if (t1Id && t2Id) {
        url += `&t1Id=${t1Id}&t2Id=${t2Id}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setAlunoDetail(json.data);
      } else {
        setDetailError(json.error || 'Não foi possível carregar os dados deste aluno.');
      }
    } catch (err: any) {
      console.error('Erro ao carregar detalhes do aluno na Central:', err);
      setDetailError(err.message || 'Erro de conexão ao carregar prontuário do aluno.');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const handleSelectAluno = (id: string) => {
    if (id !== selectedAlunoId) {
      setSelectedAlunoId(id);
      setAlunoDetail(null); // Limpa o anterior imediatamente para feedback instantâneo ao usuário
      setDetailError(null);
    }
  };

  useEffect(() => {
    if (selectedAlunoId) {
      loadAlunoDetail(selectedAlunoId);
    }
  }, [selectedAlunoId, loadAlunoDetail]);

  const handleSelectComparativeDates = (t1Id: string, t2Id: string) => {
    if (selectedAlunoId) {
      loadAlunoDetail(selectedAlunoId, t1Id, t2Id);
    }
  };

  const handleTestSaved = () => {
    // Recarrega detalhes do aluno e contadores da lista
    if (selectedAlunoId) {
      loadAlunoDetail(selectedAlunoId);
    }
    loadAlunos();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 'calc(100vh - 120px)' }}>
      {/* Banner Superior da Central de Avaliações */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(13, 148, 136, 0.08) 100%)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-stethoscope" style={{ color: 'var(--primary)' }} />
            Central de Avaliações & Biomecânica
          </h3>
          <small style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            Hub unificado de acompanhamento clínico, testes avulsos, histórico e evolução longitudinal
          </small>
        </div>

        {selectedAlunoId && alunoDetail?.client && (
          <button
            onClick={() => setShowNovoTesteModal(true)}
            className="btn btn-primary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
            }}
          >
            <i className="fas fa-plus" />
            Lançar Teste Avulso
          </button>
        )}
      </div>

      {/* Grid Principal: Coluna Esquerda (Alunos) + Coluna Direita (Central Individual) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 340px) 1fr',
          gap: '18px',
          flex: 1,
          alignItems: 'start'
        }}
      >
        {/* COLUNA ESQUERDA: LISTAGEM DE ALUNOS */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            padding: '14px',
            height: 'calc(100vh - 230px)',
            minHeight: '520px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <AlunoCardList
            alunos={alunos}
            selectedAlunoId={selectedAlunoId}
            onSelectAluno={handleSelectAluno}
            loading={loadingAlunos}
          />
        </div>

        {/* COLUNA DIREITA: CENTRAL INDIVIDUAL DO ALUNO SELECIONADO */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            padding: '20px',
            minHeight: '520px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {loadingDetail ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-dim)' }}>
              <i className="fas fa-spinner fa-spin fa-3x" style={{ color: 'var(--primary)', marginBottom: '12px' }} />
              <h5 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)' }}>Carregando dados clínicos do aluno...</h5>
              <small>Processando histórico, cálculos de força e goniometria</small>
            </div>
          ) : detailError ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
              <i className="fas fa-exclamation-triangle fa-3x" style={{ color: '#ef4444', marginBottom: '14px' }} />
              <h5 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: 'var(--text-main)' }}>
                Erro ao carregar prontuário do aluno
              </h5>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', maxWidth: '420px', margin: '0 auto 16px auto' }}>
                {detailError}
              </p>
              <button
                type="button"
                onClick={() => selectedAlunoId && loadAlunoDetail(selectedAlunoId)}
                style={{
                  background: 'var(--primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 18px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <i className="fas fa-redo-alt" style={{ marginRight: '6px' }} />
                Tentar Novamente
              </button>
            </div>
          ) : !alunoDetail?.client ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-dim)' }}>
              <i className="fas fa-user-check fa-3x" style={{ opacity: 0.3, marginBottom: '12px' }} />
              <h5 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)' }}>Selecione um aluno na coluna ao lado</h5>
              <p style={{ fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                Clique em qualquer aluno da lista para abrir a Central Individual com histórico completo e dashboard de evolução.
              </p>
            </div>
          ) : (
            <>
              {/* Header Individual do Aluno (Sem Avatar, apenas Nome conforme instrução do usuário) */}
              <div
                style={{
                  background: 'var(--bg-dark)',
                  padding: '16px 20px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {alunoDetail.client.nome}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
                    {alunoDetail.client.idade && <span>{alunoDetail.client.idade} anos</span>}
                    {alunoDetail.client.peso && <span>• {alunoDetail.client.peso} kg</span>}
                    {alunoDetail.client.altura && <span>• {alunoDetail.client.altura} cm</span>}
                    {alunoDetail.client.profissionalResponsavel && (
                      <span>• Fisioterapeuta / Treinador: <strong style={{ color: 'var(--text-main)' }}>{alunoDetail.client.profissionalResponsavel}</strong></span>
                    )}
                  </div>

                  {(alunoDetail.client.lesoes || alunoDetail.client.restricoes) && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {alunoDetail.client.lesoes && (
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
                          <i className="fas fa-notes-medical" style={{ marginRight: '4px' }} />
                          {alunoDetail.client.lesoes}
                        </span>
                      )}
                      {alunoDetail.client.restricoes && (
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                          <i className="fas fa-shield-alt" style={{ marginRight: '4px' }} />
                          {alunoDetail.client.restricoes}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => setActiveSubTab('dashboard')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: activeSubTab === 'dashboard' ? 'var(--primary)' : 'var(--border-color)',
                      background: activeSubTab === 'dashboard' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      color: activeSubTab === 'dashboard' ? 'var(--primary)' : 'var(--text-dim)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <i className="fas fa-chart-pie" />
                    Dashboard de Evolução
                  </button>

                  <button
                    onClick={() => setActiveSubTab('historico')}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: activeSubTab === 'historico' ? 'var(--secondary)' : 'var(--border-color)',
                      background: activeSubTab === 'historico' ? 'rgba(13, 148, 136, 0.15)' : 'transparent',
                      color: activeSubTab === 'historico' ? 'var(--secondary)' : 'var(--text-dim)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <i className="fas fa-history" />
                    Histórico & Comparativo ({alunoDetail.counts.totalTimeline})
                  </button>
                </div>
              </div>

              {/* CONTEÚDO DA ABA SELECIONADA */}
              {activeSubTab === 'dashboard' && (
                <AlunoEvolutionDashboard
                  client={alunoDetail.client}
                  counts={alunoDetail.counts}
                  liveAlerts={alunoDetail.liveAlerts}
                  evolutionSeries={alunoDetail.evolutionSeries}
                  longitudinal={alunoDetail.longitudinal}
                  onOpenNovoTeste={() => setShowNovoTesteModal(true)}
                />
              )}

              {activeSubTab === 'historico' && (
                <AlunoHistoryTimeline
                  timeline={alunoDetail.timeline}
                  longitudinal={alunoDetail.longitudinal}
                  onSelectComparativeDates={handleSelectComparativeDates}
                  onOpenNovoTeste={() => setShowNovoTesteModal(true)}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL DE LANÇAMENTO DE TESTES AVULSOS */}
      {showNovoTesteModal && selectedAlunoId && alunoDetail?.client && (
        <AvulsoTestModal
          clientId={selectedAlunoId}
          clientNome={alunoDetail.client.nome}
          onClose={() => setShowNovoTesteModal(false)}
          onSaved={handleTestSaved}
          onOpenCompletaPhysical={onOpenCompletaPhysical}
          onOpenCompletaPhysio={onOpenCompletaPhysio}
        />
      )}
    </div>
  );
}
