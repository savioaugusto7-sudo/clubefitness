'use client';

import React, { useState, useEffect } from 'react';

interface ExerciseItem {
  _id: string;
  nome: string;
  grupo: string;
  equipamento: string;
  instrucoes?: string;
  gifUrl?: string;
  isLocked?: boolean;
  lockReason?: string;
  suggestion?: {
    gifUrl: string;
    catalogName: string;
    confidence: number;
  };
}

interface CurationStats {
  total: number;
  locked: number;
  hasGif: number;
  suggestions: number;
  noGif: number;
  catalogSize: number;
}

export default function ExerciseCurationPanel() {
  const [stats, setStats] = useState<CurationStats | null>(null);
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'locked' | 'suggestions' | 'has_gif' | 'no_gif'>('suggestions');
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewGif, setPreviewGif] = useState<string | null>(null);

  const fetchCurationData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/exercises/curation?filter=${filter}&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setExercises(data.data);
      }
    } catch (err) {
      console.error('Error fetching curation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurationData();
  }, [filter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCurationData();
  };

  const handleApprove = async (ex: ExerciseItem) => {
    if (!ex.suggestion?.gifUrl) return;
    setProcessingId(ex._id);
    try {
      const res = await fetch('/api/exercises/curation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          exerciseId: ex._id,
          gifUrl: ex.suggestion.gifUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        // Atualizar lista local
        setExercises(prev => prev.map(item => 
          item._id === ex._id ? { ...item, gifUrl: ex.suggestion!.gifUrl, suggestion: undefined } : item
        ));
        if (filter === 'suggestions') {
          setExercises(prev => prev.filter(item => item._id !== ex._id));
        }
        if (stats) {
          setStats({
            ...stats,
            hasGif: stats.hasGif + 1,
            suggestions: Math.max(0, stats.suggestions - 1)
          });
        }
      } else {
        alert(data.error || 'Erro ao aprovar GIF');
      }
    } catch (err: any) {
      alert('Erro na requisição: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleBatchApprove = async () => {
    const highConfidence = exercises.filter(e => e.suggestion && e.suggestion.confidence >= 80);
    if (highConfidence.length === 0) {
      alert('Nenhuma sugestão com alta confiança (>= 80%) encontrada na visualização atual.');
      return;
    }

    if (!confirm(`Deseja aprovar e enriquecer automaticamente ${highConfidence.length} exercício(s) com correspondência de alta confiança (>= 80%)?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/exercises/curation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch_approve',
          exerciseIds: highConfidence.map(e => e._id)
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchCurationData();
      } else {
        alert(data.error || 'Erro no processamento');
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(147, 51, 234, 0.3)', borderRadius: '16px', padding: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#c084fc', fontWeight: 700, textTransform: 'uppercase' }}>🔒 Blindados</span>
            <i className="fa-solid fa-shield-halved" style={{ color: '#a855f7' }}></i>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ffffff', marginTop: '6px' }}>
            {stats?.locked || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            113 da Rachel + 8 Manuais
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '16px', padding: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>⏳ Sugestões Prontas</span>
            <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#3b82f6' }}></i>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ffffff', marginTop: '6px' }}>
            {stats?.suggestions || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Match biomecânico IA
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '16px', padding: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 700, textTransform: 'uppercase' }}>✅ Com GIF Ativo</span>
            <i className="fa-solid fa-circle-check" style={{ color: '#10b981' }}></i>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ffffff', marginTop: '6px' }}>
            {stats?.hasGif || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Exercícios ilustrados
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>⚪ Sem GIF</span>
            <i className="fa-regular fa-image" style={{ color: 'var(--text-dim)' }}></i>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '6px' }}>
            {stats?.noGif || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Aguardando inclusão
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className={`btn ${filter === 'suggestions' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700 }}
            onClick={() => setFilter('suggestions')}
          >
            ✨ Sugestões com Preview ({stats?.suggestions || 0})
          </button>
          <button
            className={`btn ${filter === 'locked' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700 }}
            onClick={() => setFilter('locked')}
          >
            🔒 Blindados Rachel & Manuais ({stats?.locked || 0})
          </button>
          <button
            className={`btn ${filter === 'has_gif' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700 }}
            onClick={() => setFilter('has_gif')}
          >
            ✅ Com GIF ({stats?.hasGif || 0})
          </button>
          <button
            className={`btn ${filter === 'no_gif' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700 }}
            onClick={() => setFilter('no_gif')}
          >
            ⚪ Sem GIF ({stats?.noGif || 0})
          </button>
          <button
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700 }}
            onClick={() => setFilter('all')}
          >
            Todos ({stats?.total || 0})
          </button>
        </div>

        {filter === 'suggestions' && stats && stats.suggestions > 0 && (
          <button
            className="btn"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              fontWeight: 800,
              borderRadius: '10px',
              border: 'none',
              padding: '8px 16px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
            }}
            onClick={handleBatchApprove}
          >
            <i className="fa-solid fa-wand-magic-sparkles"></i> Aprovar Lote de Alta Confiança (&ge; 80%)
          </button>
        )}
      </div>

      {/* Search form */}
      <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          className="form-control"
          placeholder="Buscar por nome, grupo muscular ou equipamento..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: '10px 14px', borderRadius: '10px' }}
        />
        <button type="submit" className="btn btn-secondary" style={{ borderRadius: '10px', fontWeight: 700 }}>
          <i className="fa-solid fa-magnifying-glass"></i> Buscar
        </button>
      </form>

      {/* Grid of Exercises */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ color: 'var(--color-primary)', marginBottom: '12px' }}></i>
          <p>Carregando exercícios e calculando correspondências biomecânicas...</p>
        </div>
      ) : exercises.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
          <i className="fa-regular fa-folder-open fa-3x" style={{ color: 'var(--text-dim)', marginBottom: '14px' }}></i>
          <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Nenhum exercício encontrado</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginTop: '6px' }}>
            Nenhum registro corresponde ao filtro ou busca selecionada.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {exercises.map(ex => (
            <div
              key={ex._id}
              style={{
                background: 'var(--bg-card)',
                border: ex.isLocked 
                  ? '1px solid rgba(147, 51, 234, 0.4)' 
                  : ex.suggestion 
                    ? '1px solid rgba(59, 130, 246, 0.4)' 
                    : ex.gifUrl 
                      ? '1px solid rgba(16, 185, 129, 0.3)' 
                      : '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.12)'
              }}
            >
              <div>
                {/* Header row with badges */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800 }}>
                      {ex.grupo}
                    </span>
                    <span style={{ background: 'rgba(107, 114, 128, 0.15)', color: '#9ca3af', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600 }}>
                      {ex.equipamento}
                    </span>
                  </div>

                  {ex.isLocked ? (
                    <span style={{ background: 'rgba(147, 51, 234, 0.2)', color: '#c084fc', border: '1px solid rgba(147, 51, 234, 0.4)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                      <i className="fa-solid fa-lock"></i> Blindado
                    </span>
                  ) : ex.gifUrl ? (
                    <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                      <i className="fa-solid fa-check"></i> Com GIF
                    </span>
                  ) : ex.suggestion ? (
                    <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                      🎯 {ex.suggestion.confidence}% Match
                    </span>
                  ) : (
                    <span style={{ background: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>
                      Sem GIF
                    </span>
                  )}
                </div>

                {/* Title */}
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.3 }}>
                  {ex.nome}
                </h4>

                {ex.lockReason && (
                  <div style={{ fontSize: '0.72rem', color: '#c084fc', marginTop: '4px', fontWeight: 600 }}>
                    <i className="fa-solid fa-shield-halved"></i> {ex.lockReason}
                  </div>
                )}
              </div>

              {/* Preview Box */}
              {ex.suggestion ? (
                <div style={{ background: 'var(--bg-darker)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '10px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <img
                    src={ex.suggestion.gifUrl}
                    alt={ex.suggestion.catalogName}
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)', cursor: 'pointer', background: '#000' }}
                    onClick={() => setPreviewGif(ex.suggestion!.gifUrl)}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.7rem', color: '#60a5fa', fontWeight: 800, textTransform: 'uppercase' }}>
                      Sugestão do Catálogo
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 750, color: 'var(--text-main)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ex.suggestion.catalogName}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                      Clique na imagem para ampliar
                    </div>
                  </div>
                </div>
              ) : ex.gifUrl ? (
                <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '10px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <img
                    src={ex.gifUrl}
                    alt={ex.nome}
                    style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)', cursor: 'pointer', background: '#000' }}
                    onClick={() => setPreviewGif(ex.gifUrl!)}
                  />
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    GIF já cadastrado e ativo
                  </div>
                </div>
              ) : null}

              {/* Action buttons */}
              {ex.suggestion && !ex.isLocked && (
                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                  <button
                    className="btn btn-primary"
                    disabled={processingId === ex._id}
                    style={{ flex: 1, padding: '8px', fontSize: '0.8rem', fontWeight: 800, borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleApprove(ex)}
                  >
                    {processingId === ex._id ? (
                      <i className="fa-solid fa-spinner fa-spin"></i>
                    ) : (
                      <>
                        <i className="fa-solid fa-check"></i> Confirmar GIF
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Preview Grande */}
      {previewGif && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setPreviewGif(null)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '20px',
              maxWidth: '480px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 14px 0', fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
              Preview do Exercício
            </h3>
            <img
              src={previewGif}
              alt="Preview"
              style={{ width: '100%', maxHeight: '360px', objectFit: 'contain', borderRadius: '12px', background: '#000' }}
            />
            <button
              className="btn btn-secondary"
              style={{ marginTop: '16px', width: '100%', borderRadius: '10px', fontWeight: 800 }}
              onClick={() => setPreviewGif(null)}
            >
              Fechar Visualização
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
