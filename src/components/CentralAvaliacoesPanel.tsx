'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AlunoCardList, { AlunoSummary } from './central-avaliacoes/AlunoCardList';
import AlunoEvolutionDashboard from './central-avaliacoes/AlunoEvolutionDashboard';
import AlunoHistoryTimeline from './central-avaliacoes/AlunoHistoryTimeline';
import AvulsoTestModal from './central-avaliacoes/AvulsoTestModal';
import AlunoClinicalHeader from './central-avaliacoes/AlunoClinicalHeader';

interface CentralAvaliacoesPanelProps {
  onOpenCompletaPhysical?: () => void;
  onOpenCompletaPhysio?: () => void;
}

export default function CentralAvaliacoesPanel({
  onOpenCompletaPhysical,
  onOpenCompletaPhysio
}: CentralAvaliacoesPanelProps) {
  const router = useRouter();
  const [alunos, setAlunos] = useState<AlunoSummary[]>([]);
  const [loadingAlunos, setLoadingAlunos] = useState(true);
  const [selectedAlunoId, setSelectedAlunoId] = useState<string | null>(null);

  // Detecção de Viewport Mobile (<= 768px) para fluxo Master-Detail
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileView('detail');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      setAlunoDetail(null);
      setDetailError(null);
    }
    if (isMobile) {
      setMobileView('detail');
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    if (selectedAlunoId) {
      loadAlunoDetail(selectedAlunoId);
    }
    loadAlunos();
  };

  const handleOpenFichaTreino = () => {
    if (selectedAlunoId && alunoDetail?.client?.nome) {
      router.push(`/ficha/${selectedAlunoId}?studentName=${encodeURIComponent(alunoDetail.client.nome)}`);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        minHeight: 'calc(100vh - 120px)',
        paddingBottom: 'calc(100px + env(safe-area-inset-bottom, 24px))',
        maxWidth: '100vw',
        overflowX: 'hidden'
      }}
    >
      {/* Banner Superior da Central de Avaliações (compacto ou omitido no detalhe mobile) */}
      {(!isMobile || mobileView === 'list') && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(13, 148, 136, 0.08) 100%)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: isMobile ? '14px 16px' : '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: isMobile ? '1.15rem' : '1.25rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-stethoscope" style={{ color: 'var(--primary)' }} />
              Central de Avaliações & Biomecânica
            </h3>
            <small style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
              Acompanhamento clínico, testes de força, goniometria e histórico de evolução
            </small>
          </div>

          {!isMobile && selectedAlunoId && alunoDetail?.client && (
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
      )}

      {/* Grid Principal: Coluna Esquerda (Alunos) + Coluna Direita (Central Individual) */}
      <div
        style={{
          display: isMobile ? 'flex' : 'grid',
          gridTemplateColumns: isMobile ? undefined : 'minmax(300px, 350px) 1fr',
          flexDirection: isMobile ? 'column' : undefined,
          gap: '18px',
          flex: 1,
          alignItems: 'start',
          width: '100%'
        }}
      >
        {/* COLUNA ESQUERDA: LISTAGEM DE ALUNOS (exibida se desktop ou se mobileView === 'list') */}
        {(!isMobile || mobileView === 'list') && (
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              padding: isMobile ? '12px' : '16px',
              height: isMobile ? 'auto' : 'calc(100vh - 230px)',
              minHeight: isMobile ? '400px' : '520px',
              display: 'flex',
              flexDirection: 'column',
              width: '100%'
            }}
          >
            <AlunoCardList
              alunos={alunos}
              selectedAlunoId={selectedAlunoId}
              onSelectAluno={handleSelectAluno}
              loading={loadingAlunos}
            />
          </div>
        )}

        {/* COLUNA DIREITA: CENTRAL INDIVIDUAL DO ALUNO (exibida se desktop ou se mobileView === 'detail') */}
        {(!isMobile || mobileView === 'detail') && (
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              padding: isMobile ? '12px' : '20px',
              minHeight: '520px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              width: '100%'
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
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => setMobileView('list')}
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      ← Voltar à Lista
                    </button>
                  )}
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
              </div>
            ) : !alunoDetail?.client ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-dim)' }}>
                <i className="fas fa-user-check fa-3x" style={{ opacity: 0.3, marginBottom: '12px' }} />
                <h5 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)' }}>Selecione um aluno na lista</h5>
                <p style={{ fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                  Clique em qualquer aluno da lista para abrir a Central Individual com histórico completo e dashboard de evolução.
                </p>
                {isMobile && (
                  <button
                    type="button"
                    onClick={() => setMobileView('list')}
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: '16px' }}
                  >
                    Ver Lista de Alunos
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* 🌟 Cabeçalho Clínico de Alto Padrão (com botão voltar para mobile, badges médicas e ações) */}
                <AlunoClinicalHeader
                  client={alunoDetail.client}
                  activeSubTab={activeSubTab}
                  onChangeSubTab={setActiveSubTab}
                  totalTimelineCount={alunoDetail.counts?.totalTimeline || 0}
                  onOpenNovoTeste={() => setShowNovoTesteModal(true)}
                  onOpenFichaTreino={handleOpenFichaTreino}
                  isMobile={isMobile}
                  onBackToList={() => setMobileView('list')}
                />

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
        )}
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
