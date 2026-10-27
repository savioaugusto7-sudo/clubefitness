'use client';

import React, { useState, useMemo } from 'react';
import {
  REGIOES_ANATOMICAS,
  CIF_CATEGORIAS_ATIVIDADES,
  FATORES_ALIVIO_SUGESTOES,
  TIPOS_CARACTERISTICA_DOR,
  QueixaFisioterapicaItem,
  getEvaColor,
  getEvaLabel,
  synthesizeLegacyFields
} from '@/utils/fisioterapiaQueixasCatalog';

interface QueixaFisioterapiaCardProps {
  queixa: QueixaFisioterapicaItem;
  index: number;
  isPrincipal?: boolean;
  onChange: (updated: QueixaFisioterapicaItem) => void;
  onRemove?: () => void;
  prevQueixa?: any;
  onKeepPrev?: () => void;
  readOnly?: boolean;
}

export default function QueixaFisioterapiaCard({
  queixa,
  index,
  isPrincipal = false,
  onChange,
  onRemove,
  prevQueixa,
  onKeepPrev,
  readOnly = false
}: QueixaFisioterapiaCardProps) {
  const [activeCifCategory, setActiveCifCategory] = useState<string>('mobilidade_mudancas');
  const [cifSearchTerm, setCifSearchTerm] = useState('');
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);

  // Região anatômica selecionada atualmente (com detecção inteligente para queixas legadas)
  const selectedRegiaoDef = useMemo(() => {
    if (queixa.regiao) {
      const found = REGIOES_ANATOMICAS.find(r => r.nome.toLowerCase() === queixa.regiao.toLowerCase());
      if (found) return found;
    }
    // Detecção heurística a partir do campo legado dorOnde
    const onde = (queixa.dorOnde || '').toLowerCase();
    if (onde.includes('joelho')) return REGIOES_ANATOMICAS.find(r => r.id === 'joelho')!;
    if (onde.includes('ombro')) return REGIOES_ANATOMICAS.find(r => r.id === 'ombro')!;
    if (onde.includes('lombar')) return REGIOES_ANATOMICAS.find(r => r.id === 'coluna_lombar')!;
    if (onde.includes('cervical')) return REGIOES_ANATOMICAS.find(r => r.id === 'coluna_cervical')!;
    if (onde.includes('torac') || onde.includes('torác')) return REGIOES_ANATOMICAS.find(r => r.id === 'coluna_toracica')!;
    if (onde.includes('quadril') || onde.includes('coxa') || onde.includes('trocant')) return REGIOES_ANATOMICAS.find(r => r.id === 'quadril_coxa')!;
    if (onde.includes('tornozelo') || onde.includes('pé') || onde.includes('pe ') || onde.includes('fascia')) return REGIOES_ANATOMICAS.find(r => r.id === 'tornozelo_pe')!;
    if (onde.includes('cotovelo') || onde.includes('epicondil')) return REGIOES_ANATOMICAS.find(r => r.id === 'cotovelo')!;
    if (onde.includes('punho') || onde.includes('mão') || onde.includes('carpo')) return REGIOES_ANATOMICAS.find(r => r.id === 'punho_mao')!;
    if (onde.includes('sacro') || onde.includes('pelve') || onde.includes('glute')) return REGIOES_ANATOMICAS.find(r => r.id === 'pelve_sacroiliaca')!;

    return REGIOES_ANATOMICAS.find(r => r.id === 'joelho') || REGIOES_ANATOMICAS[0];
  }, [queixa.regiao, queixa.dorOnde]);

  // Atualizador interno que mantém os campos legados sempre sintetizados
  const updateField = (field: keyof QueixaFisioterapicaItem, value: any) => {
    const updated = { ...queixa, [field]: value };

    // Se mudou a região, ajusta a lateralidade se a atual não for permitida e seleciona a primeira sub-região
    if (field === 'regiao') {
      const regDef = REGIOES_ANATOMICAS.find(r => r.nome === value);
      if (regDef) {
        if (!regDef.lateralidadePermitida.includes(updated.lateralidade)) {
          updated.lateralidade = regDef.lateralidadePermitida[0];
        }
        updated.subRegiao = regDef.subRegioes[0]?.nome || '';
      }
    }

    // Sintetiza automaticamente dorOnde, desencadeiaPiora e melhoraDesaparece para total compatibilidade retroativa
    const synthesized = synthesizeLegacyFields(updated);
    updated.dorOnde = synthesized.dorOnde;
    updated.desencadeiaPiora = synthesized.desencadeiaPiora;
    updated.melhoraDesaparece = synthesized.melhoraDesaparece;

    onChange(updated);
  };

  // Toggle de atividade agravante CIF
  const toggleAtividade = (nomeAtividade: string) => {
    const current = queixa.atividadesAgravantes || [];
    const exists = current.includes(nomeAtividade);
    const next = exists
      ? current.filter(a => a !== nomeAtividade)
      : [...current, nomeAtividade];
    updateField('atividadesAgravantes', next);
  };

  // Toggle de fator de alívio
  const toggleAlivio = (fator: string) => {
    const current = queixa.fatoresAlivio || [];
    const exists = current.includes(fator);
    const next = exists
      ? current.filter(f => f !== fator)
      : [...current, fator];
    updateField('fatoresAlivio', next);
  };

  // Atividades filtradas pela busca
  const filteredCifActivities = useMemo(() => {
    const term = cifSearchTerm.toLowerCase().trim();
    if (!term) return [];
    const matches: { nome: string; categoria: string }[] = [];
    CIF_CATEGORIAS_ATIVIDADES.forEach(cat => {
      cat.atividades.forEach(ativ => {
        if (ativ.nome.toLowerCase().includes(term) || (ativ.descricao && ativ.descricao.toLowerCase().includes(term))) {
          matches.push({ nome: ativ.nome, categoria: cat.categoria });
        }
      });
    });
    return matches;
  }, [cifSearchTerm]);

  const currentCategoryObj = useMemo(() => {
    return CIF_CATEGORIAS_ATIVIDADES.find(c => c.id === activeCifCategory) || CIF_CATEGORIAS_ATIVIDADES[0];
  }, [activeCifCategory]);

  const evaColor = getEvaColor(queixa.dorIntensidade);
  const evaLabel = getEvaLabel(queixa.dorIntensidade);

  return (
    <div
      style={{
        background: 'var(--bg-card, #1e293b)',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '14px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        position: 'relative'
      }}
    >
      {/* 1. CABEÇALHO DO CARD */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))',
          paddingBottom: '12px',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: '0.9rem',
              color: isPrincipal ? 'var(--primary, #6366f1)' : 'var(--text-main, #f8fafc)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
          >
            <i className={`fas ${selectedRegiaoDef.icone}`} style={{ marginRight: '6px' }} />
            {isPrincipal ? 'Queixa Principal' : `Queixa Secundária #${index}`}
          </span>

          {/* Badge da Dor EVA */}
          <span
            style={{
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: '12px',
              background: `${evaColor}20`,
              color: evaColor,
              fontWeight: 600,
              border: `1px solid ${evaColor}40`
            }}
          >
            EVA: {queixa.dorIntensidade}/10
          </span>

          {/* Botão de Manter Queixa Anterior (Comparativo de Avaliação) */}
          {prevQueixa && onKeepPrev && (
            <button
              type="button"
              onClick={onKeepPrev}
              style={{
                fontSize: '0.7rem',
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(56, 189, 248, 0.12)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <i className="fas fa-arrow-down-to-bracket" /> Manter da Avaliação Anterior
            </button>
          )}
        </div>

        {/* Botão de Remover Queixa */}
        {!isPrincipal && onRemove && !readOnly && (
          <button
            type="button"
            onClick={onRemove}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              padding: '3px 8px',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-trash" style={{ marginRight: '4px' }} /> Remover Queixa
          </button>
        )}
      </div>

      {/* 2. LOCALIZAÇÃO ANATÔMICA PADRONIZADA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '14px' }}>
        {/* Região Macro */}
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
            Região Anatômica:
          </label>
          <select
            className="form-control form-control-sm"
            value={queixa.regiao}
            disabled={readOnly}
            onChange={e => updateField('regiao', e.target.value)}
            style={{
              background: 'var(--bg-dark, #0f172a)',
              color: 'var(--text-main, #f8fafc)',
              borderColor: 'var(--border-color, rgba(255, 255, 255, 0.15))',
              height: '36px',
              borderRadius: '6px',
              fontSize: '0.85rem'
            }}
          >
            {REGIOES_ANATOMICAS.map(r => (
              <option key={r.id} value={r.nome}>
                {r.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Lateralidade */}
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
            Lateralidade:
          </label>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {selectedRegiaoDef.lateralidadePermitida.map(lat => {
              const isSelected = queixa.lateralidade === lat;
              return (
                <button
                  key={lat}
                  type="button"
                  disabled={readOnly}
                  onClick={() => updateField('lateralidade', lat)}
                  style={{
                    flex: 1,
                    minWidth: '60px',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: isSelected ? 600 : 400,
                    cursor: readOnly ? 'default' : 'pointer',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--primary, #6366f1)' : 'var(--border-color, rgba(255,255,255,0.1))',
                    background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                    color: isSelected ? 'var(--primary, #6366f1)' : 'var(--text-dim, #94a3b8)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {lat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-Região / Estrutura Específica */}
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
            Sub-Região / Estrutura:
          </label>
          <select
            className="form-control form-control-sm"
            value={queixa.subRegiao}
            disabled={readOnly}
            onChange={e => updateField('subRegiao', e.target.value)}
            style={{
              background: 'var(--bg-dark, #0f172a)',
              color: 'var(--text-main, #f8fafc)',
              borderColor: 'var(--border-color, rgba(255, 255, 255, 0.15))',
              height: '36px',
              borderRadius: '6px',
              fontSize: '0.85rem'
            }}
          >
            {selectedRegiaoDef.subRegioes.map(sr => (
              <option key={sr.id} value={sr.nome}>
                {sr.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. ESCALA ANALÓGICA VISUAL (EVA 0–10) */}
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.15)',
          padding: '12px 14px',
          borderRadius: '8px',
          marginBottom: '14px',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.05))'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main, #f8fafc)', margin: 0 }}>
            Intensidade da Dor (Escala EVA):
          </label>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: evaColor }}>
            {evaLabel}
          </span>
        </div>

        {/* Slider Responsivo */}
        <input
          type="range"
          min="0"
          max="10"
          step="1"
          disabled={readOnly}
          value={queixa.dorIntensidade}
          onChange={e => updateField('dorIntensidade', Number(e.target.value))}
          style={{
            width: '100%',
            accentColor: evaColor,
            cursor: readOnly ? 'default' : 'pointer',
            height: '6px'
          }}
        />

        {/* Marcadores 0 a 10 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.68rem', color: 'var(--text-dim, #94a3b8)', padding: '0 2px' }}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
            <span
              key={val}
              onClick={() => !readOnly && updateField('dorIntensidade', val)}
              style={{
                cursor: readOnly ? 'default' : 'pointer',
                fontWeight: queixa.dorIntensidade === val ? 700 : 400,
                color: queixa.dorIntensidade === val ? evaColor : 'inherit'
              }}
            >
              {val}
            </span>
          ))}
        </div>
      </div>

      {/* 4. ATIVIDADES AGRAVANTES BASEADAS NA CIF */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main, #f8fafc)', margin: 0 }}>
            <i className="fas fa-person-walking" style={{ marginRight: '5px', color: '#f59e0b' }} />
            Atividades que Provocam ou Agravam a Dor (Base CIF):
          </label>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim, #94a3b8)' }}>
            {(queixa.atividadesAgravantes || []).length} selecionada(s)
          </span>
        </div>

        {/* Tags de Atividades Selecionadas */}
        {(queixa.atividadesAgravantes || []).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px', padding: '6px 8px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            {queixa.atividadesAgravantes.map(ativ => (
              <span
                key={ativ}
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  color: '#f59e0b',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {ativ}
                {!readOnly && (
                  <i
                    className="fas fa-times"
                    onClick={() => toggleAtividade(ativ)}
                    style={{ cursor: 'pointer', fontSize: '0.7rem' }}
                  />
                )}
              </span>
            ))}
          </div>
        )}

        {/* Busca e Abas Rápidas de Categorias CIF */}
        {!readOnly && (
          <div>
            {/* Campo de Busca Rápida de Atividades */}
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <i
                className="fas fa-search"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim, #94a3b8)', fontSize: '0.75rem' }}
              />
              <input
                type="text"
                placeholder="Buscar atividade agravante (ex: escada, agachar, sentar, corrida, repouso...)"
                value={cifSearchTerm}
                onChange={e => setCifSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '28px',
                  paddingRight: '10px',
                  height: '32px',
                  borderRadius: '6px',
                  background: 'var(--bg-dark, #0f172a)',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                  color: 'var(--text-main, #f8fafc)',
                  fontSize: '0.78rem'
                }}
              />
            </div>

            {/* Resultados da Busca de Atividades */}
            {cifSearchTerm && filteredCifActivities.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px', maxHeight: '140px', overflowY: 'auto', padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                {filteredCifActivities.map(item => {
                  const isSelected = (queixa.atividadesAgravantes || []).includes(item.nome);
                  return (
                    <button
                      key={item.nome}
                      type="button"
                      onClick={() => toggleAtividade(item.nome)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        border: '1px solid',
                        borderColor: isSelected ? '#f59e0b' : 'var(--border-color, rgba(255,255,255,0.15))',
                        background: isSelected ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                        color: isSelected ? '#f59e0b' : 'var(--text-main, #f8fafc)',
                        cursor: 'pointer'
                      }}
                    >
                      {isSelected ? '✓ ' : '+ '} {item.nome}
                      <small style={{ opacity: 0.6, marginLeft: '4px' }}>({item.categoria})</small>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Abas das Categorias CIF */}
            {!cifSearchTerm && (
              <>
                <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '8px' }}>
                  {CIF_CATEGORIAS_ATIVIDADES.map(cat => {
                    const isCatActive = cat.id === activeCifCategory;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCifCategory(cat.id)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: isCatActive ? 600 : 400,
                          border: 'none',
                          background: isCatActive ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                          color: isCatActive ? 'var(--primary, #6366f1)' : 'var(--text-dim, #94a3b8)',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <i className={`fas ${cat.icone}`} style={{ marginRight: '4px' }} />
                        {cat.categoria}
                      </button>
                    );
                  })}
                </div>

                {/* Chips de Atividades da Categoria Selecionada */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {currentCategoryObj.atividades.map(ativ => {
                    const isSelected = (queixa.atividadesAgravantes || []).includes(ativ.nome);
                    return (
                      <button
                        key={ativ.id}
                        type="button"
                        title={ativ.descricao}
                        onClick={() => toggleAtividade(ativ.nome)}
                        style={{
                          padding: '4px 9px',
                          borderRadius: '12px',
                          fontSize: '0.73rem',
                          fontWeight: isSelected ? 600 : 400,
                          border: '1px solid',
                          borderColor: isSelected ? '#f59e0b' : 'var(--border-color, rgba(255,255,255,0.12))',
                          background: isSelected ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.02)',
                          color: isSelected ? '#f59e0b' : 'var(--text-main, #f8fafc)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isSelected ? '✓ ' : '+ '} {ativ.nome}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 5. SEÇÃO AVANÇADA / FATORES DE ALÍVIO E CARACTERÍSTICAS DA DOR (EXPANSÍVEL) */}
      <div style={{ borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))', paddingTop: '10px' }}>
        <button
          type="button"
          onClick={() => setShowAdvancedDetails(!showAdvancedDetails)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-dim, #94a3b8)',
            fontSize: '0.75rem',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: showAdvancedDetails ? '12px' : '6px'
          }}
        >
          <i className={`fas fa-chevron-${showAdvancedDetails ? 'up' : 'down'}`} />
          {showAdvancedDetails ? 'Ocultar detalhes clínicos adicionais' : 'Mais detalhes (Fatores de Alívio, Característica da Dor, Tempo)'}
        </button>

        {showAdvancedDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '10px' }}>
            {/* Fatores de Melhora / Alívio */}
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
                O que alivia a dor? (Fatores de Melhora):
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {FATORES_ALIVIO_SUGESTOES.map(fat => {
                  const isSelected = (queixa.fatoresAlivio || []).includes(fat);
                  return (
                    <button
                      key={fat}
                      type="button"
                      disabled={readOnly}
                      onClick={() => toggleAlivio(fat)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        border: '1px solid',
                        borderColor: isSelected ? '#10b981' : 'var(--border-color, rgba(255,255,255,0.12))',
                        background: isSelected ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                        color: isSelected ? '#10b981' : 'var(--text-main, #f8fafc)',
                        cursor: readOnly ? 'default' : 'pointer'
                      }}
                    >
                      {isSelected ? '✓ ' : '+ '} {fat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Linha com Características Clínicas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', marginBottom: '4px', display: 'block' }}>
                  Sensação / Tipo da Dor:
                </label>
                <select
                  className="form-control form-control-sm"
                  disabled={readOnly}
                  value={queixa.caracteristicaDor || 'Pontual / Aguda'}
                  onChange={e => updateField('caracteristicaDor', e.target.value)}
                  style={{ background: 'var(--bg-dark, #0f172a)', color: 'var(--text-main, #f8fafc)', fontSize: '0.78rem' }}
                >
                  {TIPOS_CARACTERISTICA_DOR.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', marginBottom: '4px', display: 'block' }}>
                  Comportamento Temporal:
                </label>
                <select
                  className="form-control form-control-sm"
                  disabled={readOnly}
                  value={queixa.comportamentoDor || 'Intermitente'}
                  onChange={e => updateField('comportamentoDor', e.target.value)}
                  style={{ background: 'var(--bg-dark, #0f172a)', color: 'var(--text-main, #f8fafc)', fontSize: '0.78rem' }}
                >
                  <option value="Intermitente">Intermitente (Vem e vai)</option>
                  <option value="Constante / Todo momento">Constante (Todo momento)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', marginBottom: '4px', display: 'block' }}>
                  Evolução dos Sintomas:
                </label>
                <select
                  className="form-control form-control-sm"
                  disabled={readOnly}
                  value={queixa.dorEvolucao || 'estavel'}
                  onChange={e => updateField('dorEvolucao', e.target.value)}
                  style={{ background: 'var(--bg-dark, #0f172a)', color: 'var(--text-main, #f8fafc)', fontSize: '0.78rem' }}
                >
                  <option value="estavel">Estável (Sente a mesma dor)</option>
                  <option value="aumentando">Piorando / Aumentando</option>
                  <option value="diminuindo">Melhorando / Diminuindo</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', marginBottom: '4px', display: 'block' }}>
                  Tempo de Início:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Há 3 semanas..."
                  disabled={readOnly}
                  className="form-control form-control-sm"
                  value={queixa.tempoEvolucao || queixa.quandoComecou || ''}
                  onChange={e => {
                    updateField('tempoEvolucao', e.target.value);
                    updateField('quandoComecou', e.target.value);
                  }}
                  style={{ background: 'var(--bg-dark, #0f172a)', color: 'var(--text-main, #f8fafc)', fontSize: '0.78rem' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. OBSERVAÇÕES LIVRES */}
      <div>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)', marginBottom: '4px', display: 'block', fontWeight: 600 }}>
          Observações Clínicas Livres:
        </label>
        <textarea
          rows={2}
          disabled={readOnly}
          className="form-control form-control-sm"
          placeholder="Anotações livres sobre a queixa, contexto clínico, irradiação ou observações do aluno..."
          value={queixa.observacoesLivres || ''}
          onChange={e => updateField('observacoesLivres', e.target.value)}
          style={{
            background: 'var(--bg-dark, #0f172a)',
            color: 'var(--text-main, #f8fafc)',
            borderColor: 'var(--border-color, rgba(255, 255, 255, 0.12))',
            borderRadius: '6px',
            fontSize: '0.8rem',
            resize: 'vertical'
          }}
        />
      </div>

      {/* 7. PREVIEW DA QUEIXA SINTETIZADA (TRANSPARÊNCIA TOTAL) */}
      <div style={{ marginTop: '10px', fontSize: '0.72rem', color: 'var(--text-dim, #94a3b8)', background: 'rgba(0,0,0,0.1)', padding: '6px 10px', borderRadius: '4px' }}>
        <span>
          <strong>Registro Padronizado:</strong> {queixa.dorOnde || 'Sem região'} • EVA {queixa.dorIntensidade}/10
          {queixa.desencadeiaPiora && ` • Piora: ${queixa.desencadeiaPiora}`}
          {queixa.melhoraDesaparece && ` • Alívio: ${queixa.melhoraDesaparece}`}
        </span>
      </div>
    </div>
  );
}
