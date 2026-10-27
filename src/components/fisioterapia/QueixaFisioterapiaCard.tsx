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
  const [alivioSearchTerm, setAlivioSearchTerm] = useState('');
  // Aberto por padrão para induzir o preenchimento completo dos dados clínicos
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(true);

  // Estados para modo de texto livre anatômico
  const [isCustomRegiao, setIsCustomRegiao] = useState<boolean>(() => {
    if (!queixa.regiao) return false;
    return !REGIOES_ANATOMICAS.some(r => r.nome.toLowerCase() === queixa.regiao.toLowerCase());
  });

  const [isCustomSubRegiao, setIsCustomSubRegiao] = useState<boolean>(() => {
    if (!queixa.subRegiao) return false;
    const regDef = REGIOES_ANATOMICAS.find(r => r.nome.toLowerCase() === (queixa.regiao || '').toLowerCase());
    if (!regDef) return true;
    return !regDef.subRegioes.some(s => s.nome.toLowerCase() === queixa.subRegiao.toLowerCase());
  });

  // Região anatômica selecionada atualmente (com detecção inteligente para queixas legadas e texto livre)
  const selectedRegiaoDef = useMemo(() => {
    if (queixa.regiao && queixa.regiao !== '__OUTRA__') {
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

    // Região personalizada
    if (queixa.regiao && queixa.regiao !== '__OUTRA__') {
      return {
        id: 'outra_personalizada',
        nome: queixa.regiao,
        icone: 'fa-pencil-alt',
        lateralidadePermitida: ['Direito', 'Esquerdo', 'Bilateral', 'Central / Axial'] as ('Direito' | 'Esquerdo' | 'Bilateral' | 'Central / Axial')[],
        subRegioes: []
      };
    }

    return REGIOES_ANATOMICAS.find(r => r.id === 'joelho') || REGIOES_ANATOMICAS[0];
  }, [queixa.regiao, queixa.dorOnde]);

  // Atualizador interno que mantém os campos legados sempre sintetizados
  const updateField = (field: keyof QueixaFisioterapicaItem, value: any) => {
    const updated = { ...queixa, [field]: value };

    // Se mudou a região para uma conhecida, ajusta a lateralidade se a atual não for permitida
    if (field === 'regiao') {
      const regDef = REGIOES_ANATOMICAS.find(r => r.nome === value);
      if (regDef) {
        if (!regDef.lateralidadePermitida.includes(updated.lateralidade)) {
          updated.lateralidade = regDef.lateralidadePermitida[0];
        }
        if (!isCustomSubRegiao) {
          updated.subRegiao = regDef.subRegioes[0]?.nome || '';
        }
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

  // Adição de atividade personalizada
  const handleAddAtividade = (texto: string) => {
    const clean = texto.trim();
    if (!clean) return;
    const current = queixa.atividadesAgravantes || [];
    if (!current.includes(clean)) {
      updateField('atividadesAgravantes', [...current, clean]);
    }
    setCifSearchTerm('');
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

  // Adição de fator de alívio personalizado
  const handleAddAlivio = (texto: string) => {
    const clean = texto.trim();
    if (!clean) return;
    const current = queixa.fatoresAlivio || [];
    if (!current.includes(clean)) {
      updateField('fatoresAlivio', [...current, clean]);
    }
    setAlivioSearchTerm('');
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

  // Fatores de alívio filtrados pela busca
  const filteredAlivioSuggestions = useMemo(() => {
    const term = alivioSearchTerm.toLowerCase().trim();
    if (!term) return FATORES_ALIVIO_SUGESTOES;
    return FATORES_ALIVIO_SUGESTOES.filter(f => f.toLowerCase().includes(term));
  }, [alivioSearchTerm]);

  const currentCategoryObj = useMemo(() => {
    return CIF_CATEGORIAS_ATIVIDADES.find(c => c.id === activeCifCategory) || CIF_CATEGORIAS_ATIVIDADES[0];
  }, [activeCifCategory]);

  const evaColor = getEvaColor(queixa.dorIntensidade);
  const evaLabel = getEvaLabel(queixa.dorIntensidade);

  return (
    <div
      style={{
        background: 'var(--bg-card, #1e293b)',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.12))',
        borderRadius: '12px',
        padding: '18px',
        marginBottom: '16px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        position: 'relative'
      }}
    >
      {/* 1. CABEÇALHO DO CARD */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))',
          paddingBottom: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              fontWeight: 800,
              fontSize: '1rem',
              color: isPrincipal ? '#818cf8' : '#f8fafc',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className={`fas ${selectedRegiaoDef.icone}`} />
            {isPrincipal ? 'Queixa Principal' : `Queixa Secundária #${index}`}
          </span>

          {/* Badge da Dor EVA */}
          <span
            style={{
              fontSize: '0.85rem',
              padding: '3px 10px',
              borderRadius: '14px',
              background: `${evaColor}25`,
              color: evaColor,
              fontWeight: 700,
              border: `1px solid ${evaColor}60`
            }}
          >
            EVA: {queixa.dorIntensidade}/10
          </span>

          {/* Botão de Manter Queixa Anterior */}
          {prevQueixa && onKeepPrev && (
            <button
              type="button"
              onClick={onKeepPrev}
              style={{
                fontSize: '0.78rem',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: 600
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
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.80rem',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <i className="fas fa-trash" style={{ marginRight: '5px' }} /> Remover Queixa
          </button>
        )}
      </div>

      {/* 2. LOCALIZAÇÃO ANATÔMICA (DROPDOWN + TEXTO LIVRE) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
        {/* Região Macro */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '0.88rem', color: '#e2e8f0', margin: 0, fontWeight: 700 }}>
              Região Anatômica:
            </label>
            {isCustomRegiao && !readOnly && (
              <button
                type="button"
                onClick={() => {
                  setIsCustomRegiao(false);
                  setIsCustomSubRegiao(false);
                  updateField('regiao', 'Joelho');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#818cf8',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  padding: 0,
                  fontWeight: 600
                }}
              >
                <i className="fas fa-list" style={{ marginRight: '3px' }} /> Voltar ao Catálogo
              </button>
            )}
          </div>

          {isCustomRegiao ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Digite a região (ex: ATM, Tórax, Costelas)..."
                value={queixa.regiao || ''}
                disabled={readOnly}
                onChange={e => updateField('regiao', e.target.value)}
                style={{
                  background: 'var(--bg-dark, #0f172a)',
                  color: '#f8fafc',
                  borderColor: '#6366f1',
                  height: '38px',
                  borderRadius: '6px',
                  fontSize: '0.90rem',
                  fontWeight: 500
                }}
                autoFocus
              />
            </div>
          ) : (
            <select
              className="form-control"
              value={queixa.regiao}
              disabled={readOnly}
              onChange={e => {
                if (e.target.value === '__OUTRA__') {
                  setIsCustomRegiao(true);
                  setIsCustomSubRegiao(true);
                  updateField('regiao', '');
                } else {
                  setIsCustomRegiao(false);
                  updateField('regiao', e.target.value);
                }
              }}
              style={{
                background: 'var(--bg-dark, #0f172a)',
                color: '#f8fafc',
                borderColor: 'var(--border-color, rgba(255, 255, 255, 0.2))',
                height: '38px',
                borderRadius: '6px',
                fontSize: '0.90rem',
                fontWeight: 500
              }}
            >
              {REGIOES_ANATOMICAS.map(r => (
                <option key={r.id} value={r.nome}>
                  {r.nome}
                </option>
              ))}
              <option value="__OUTRA__" style={{ fontWeight: 700, color: '#818cf8' }}>
                ✍️ Outra Região (Texto Livre)...
              </option>
            </select>
          )}
        </div>

        {/* Lateralidade */}
        <div>
          <label style={{ fontSize: '0.88rem', color: '#e2e8f0', marginBottom: '6px', display: 'block', fontWeight: 700 }}>
            Lateralidade:
          </label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
                    minWidth: '65px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontSize: '0.84rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: readOnly ? 'default' : 'pointer',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--primary, #6366f1)' : 'var(--border-color, rgba(255,255,255,0.15))',
                    background: isSelected ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255,255,255,0.03)',
                    color: isSelected ? '#a5b4fc' : '#cbd5e1',
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '0.88rem', color: '#e2e8f0', margin: 0, fontWeight: 700 }}>
              Sub-Região / Estrutura:
            </label>
            {isCustomSubRegiao && !isCustomRegiao && !readOnly && (
              <button
                type="button"
                onClick={() => {
                  setIsCustomSubRegiao(false);
                  updateField('subRegiao', selectedRegiaoDef.subRegioes[0]?.nome || '');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#818cf8',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  padding: 0,
                  fontWeight: 600
                }}
              >
                <i className="fas fa-list" style={{ marginRight: '3px' }} /> Voltar ao Catálogo
              </button>
            )}
          </div>

          {isCustomSubRegiao || isCustomRegiao ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Digite a estrutura / detalhes (ex: tendão patelar, menisco)..."
                value={queixa.subRegiao || ''}
                disabled={readOnly}
                onChange={e => updateField('subRegiao', e.target.value)}
                style={{
                  background: 'var(--bg-dark, #0f172a)',
                  color: '#f8fafc',
                  borderColor: '#6366f1',
                  height: '38px',
                  borderRadius: '6px',
                  fontSize: '0.90rem',
                  fontWeight: 500
                }}
              />
            </div>
          ) : (
            <select
              className="form-control"
              value={queixa.subRegiao}
              disabled={readOnly}
              onChange={e => {
                if (e.target.value === '__OUTRA_SUB__') {
                  setIsCustomSubRegiao(true);
                  updateField('subRegiao', '');
                } else {
                  updateField('subRegiao', e.target.value);
                }
              }}
              style={{
                background: 'var(--bg-dark, #0f172a)',
                color: '#f8fafc',
                borderColor: 'var(--border-color, rgba(255, 255, 255, 0.2))',
                height: '38px',
                borderRadius: '6px',
                fontSize: '0.90rem',
                fontWeight: 500
              }}
            >
              {selectedRegiaoDef.subRegioes.map(sr => (
                <option key={sr.id} value={sr.nome}>
                  {sr.nome}
                </option>
              ))}
              <option value="__OUTRA_SUB__" style={{ fontWeight: 700, color: '#818cf8' }}>
                ✍️ Outra Estrutura (Texto Livre)...
              </option>
            </select>
          )}
        </div>
      </div>

      {/* 3. ESCALA ANALÓGICA VISUAL (EVA 0–10) */}
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '14px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
            Intensidade da Dor (Escala EVA):
          </label>
          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: evaColor }}>
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
            height: '8px'
          }}
        />

        {/* Marcadores 0 a 10 com fontes nítidas */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.80rem', color: '#cbd5e1', padding: '0 4px', fontWeight: 600 }}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
            <span
              key={val}
              onClick={() => !readOnly && updateField('dorIntensidade', val)}
              style={{
                cursor: readOnly ? 'default' : 'pointer',
                fontWeight: queixa.dorIntensidade === val ? 800 : 500,
                color: queixa.dorIntensidade === val ? evaColor : 'inherit',
                fontSize: queixa.dorIntensidade === val ? '0.90rem' : '0.80rem'
              }}
            >
              {val}
            </span>
          ))}
        </div>
      </div>

      {/* 4. ATIVIDADES QUE AGRAVAM A DOR (CIF + PERSONALIZADAS) */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
          <label style={{ fontSize: '0.90rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
            <i className="fas fa-person-walking" style={{ marginRight: '6px', color: '#f59e0b' }} />
            Atividades que Provocam ou Agravam a Dor:
          </label>
          <span style={{ fontSize: '0.80rem', color: '#cbd5e1', fontWeight: 600 }}>
            {(queixa.atividadesAgravantes || []).length} selecionada(s)
          </span>
        </div>

        {/* Tokens / Tags de Atividades Selecionadas */}
        {(queixa.atividadesAgravantes || []).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px', padding: '8px 10px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            {queixa.atividadesAgravantes.map(ativ => (
              <span
                key={ativ}
                style={{
                  background: 'rgba(245, 158, 11, 0.25)',
                  color: '#fbbf24',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {ativ}
                {!readOnly && (
                  <i
                    className="fas fa-times"
                    onClick={() => toggleAtividade(ativ)}
                    style={{ cursor: 'pointer', fontSize: '0.80rem' }}
                    title="Remover atividade"
                  />
                )}
              </span>
            ))}
          </div>
        )}

        {/* Campo de Busca e Inserção Livre de Atividades */}
        {!readOnly && (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <i
                  className="fas fa-search"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }}
                />
                <input
                  type="text"
                  placeholder="Buscar ou digitar atividade agravante (pressione Enter para adicionar)..."
                  value={cifSearchTerm}
                  onChange={e => setCifSearchTerm(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (cifSearchTerm.trim()) {
                        handleAddAtividade(cifSearchTerm);
                      }
                    }
                  }}
                  style={{
                    width: '100%',
                    paddingLeft: '34px',
                    paddingRight: '12px',
                    height: '38px',
                    borderRadius: '6px',
                    background: 'var(--bg-dark, #0f172a)',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.18))',
                    color: '#f8fafc',
                    fontSize: '0.88rem'
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (cifSearchTerm.trim()) {
                    handleAddAtividade(cifSearchTerm);
                  }
                }}
                disabled={!cifSearchTerm.trim()}
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  border: '1px solid rgba(245, 158, 11, 0.45)',
                  color: '#fbbf24',
                  borderRadius: '6px',
                  padding: '0 14px',
                  fontSize: '0.84rem',
                  cursor: cifSearchTerm.trim() ? 'pointer' : 'default',
                  opacity: cifSearchTerm.trim() ? 1 : 0.5,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <i className="fas fa-plus" /> Adicionar
              </button>
            </div>

            {/* Resultados da Busca / Sugestões rápidas */}
            {cifSearchTerm.trim() && (
              <div style={{ marginBottom: '12px', padding: '8px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                {/* Opção para adicionar o texto exato digitado caso ainda não exista */}
                {!(queixa.atividadesAgravantes || []).includes(cifSearchTerm.trim()) && (
                  <div style={{ marginBottom: filteredCifActivities.length > 0 ? '8px' : 0 }}>
                    <button
                      type="button"
                      onClick={() => handleAddAtividade(cifSearchTerm)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontSize: '0.80rem',
                        border: '1px dashed #f59e0b',
                        background: 'rgba(245, 158, 11, 0.2)',
                        color: '#fbbf24',
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <i className="fas fa-plus-circle" /> Inserir "{cifSearchTerm.trim()}" como nova atividade
                    </button>
                  </div>
                )}

                {/* Sugestões do catálogo que combinam com os termos digitados */}
                {filteredCifActivities.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                    {filteredCifActivities.map(item => {
                      const isSelected = (queixa.atividadesAgravantes || []).includes(item.nome);
                      return (
                        <button
                          key={item.nome}
                          type="button"
                          onClick={() => toggleAtividade(item.nome)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.80rem',
                            fontWeight: isSelected ? 700 : 500,
                            border: '1px solid',
                            borderColor: isSelected ? '#f59e0b' : 'var(--border-color, rgba(255,255,255,0.2))',
                            background: isSelected ? 'rgba(245, 158, 11, 0.3)' : 'transparent',
                            color: isSelected ? '#fbbf24' : '#f8fafc',
                            cursor: 'pointer'
                          }}
                        >
                          {isSelected ? '✓ ' : '+ '} {item.nome}
                          <small style={{ opacity: 0.7, marginLeft: '5px' }}>({item.categoria})</small>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Abas das Categorias CIF quando não há busca ativa */}
            {!cifSearchTerm && (
              <>
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '10px' }}>
                  {CIF_CATEGORIAS_ATIVIDADES.map(cat => {
                    const isCatActive = cat.id === activeCifCategory;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCifCategory(cat.id)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '0.80rem',
                          fontWeight: isCatActive ? 700 : 500,
                          border: 'none',
                          background: isCatActive ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.03)',
                          color: isCatActive ? '#a5b4fc' : '#94a3b8',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <i className={`fas ${cat.icone}`} style={{ marginRight: '5px' }} />
                        {cat.categoria}
                      </button>
                    );
                  })}
                </div>

                {/* Chips de Atividades da Categoria Selecionada */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {currentCategoryObj.atividades.map(ativ => {
                    const isSelected = (queixa.atividadesAgravantes || []).includes(ativ.nome);
                    return (
                      <button
                        key={ativ.id}
                        type="button"
                        title={ativ.descricao}
                        onClick={() => toggleAtividade(ativ.nome)}
                        style={{
                          padding: '5px 11px',
                          borderRadius: '14px',
                          fontSize: '0.82rem',
                          fontWeight: isSelected ? 700 : 500,
                          border: '1px solid',
                          borderColor: isSelected ? '#f59e0b' : 'var(--border-color, rgba(255,255,255,0.15))',
                          background: isSelected ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255,255,255,0.03)',
                          color: isSelected ? '#fbbf24' : '#f8fafc',
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

      {/* 5. SEÇÃO DE DETALHES CLÍNICOS E FATORES DE ALÍVIO (ABERTO POR PADRÃO) */}
      <div style={{ borderTop: '1px solid var(--border-color, rgba(255,255,255,0.12))', paddingTop: '14px', marginTop: '16px' }}>
        <button
          type="button"
          onClick={() => setShowAdvancedDetails(!showAdvancedDetails)}
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
            borderRadius: '6px',
            color: '#e2e8f0',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            marginBottom: showAdvancedDetails ? '14px' : '6px'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-stethoscope" style={{ color: '#10b981' }} />
            Detalhes Clínicos: O que alivia a dor, tipo de sintoma e tempo
          </span>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {showAdvancedDetails ? 'Ocultar detalhes' : 'Expandir detalhes'}
            <i className={`fas fa-chevron-${showAdvancedDetails ? 'up' : 'down'}`} />
          </span>
        </button>

        {showAdvancedDetails && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '12px' }}>
            {/* Fatores de Melhora / Alívio */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.88rem', color: '#e2e8f0', margin: 0, fontWeight: 700 }}>
                  <i className="fas fa-heart-pulse" style={{ marginRight: '6px', color: '#10b981' }} />
                  O que alivia a dor? (Fatores de Melhora / Alívio):
                </label>
                <span style={{ fontSize: '0.80rem', color: '#cbd5e1', fontWeight: 600 }}>
                  {(queixa.fatoresAlivio || []).length} selecionado(s)
                </span>
              </div>

              {/* Tokens de Alívio Selecionados */}
              {(queixa.fatoresAlivio || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px', padding: '8px 10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  {queixa.fatoresAlivio.map(fat => (
                    <span
                      key={fat}
                      style={{
                        background: 'rgba(16, 185, 129, 0.25)',
                        color: '#34d399',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '14px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      {fat}
                      {!readOnly && (
                        <i
                          className="fas fa-times"
                          onClick={() => toggleAlivio(fat)}
                          style={{ cursor: 'pointer', fontSize: '0.80rem' }}
                          title="Remover fator de alívio"
                        />
                      )}
                    </span>
                  ))}
                </div>
              )}

              {/* Campo de Busca e Inserção de Fator de Alívio */}
              {!readOnly && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <i
                      className="fas fa-search"
                      style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.85rem' }}
                    />
                    <input
                      type="text"
                      placeholder="Digite ou busque o que alivia a dor (ex: Gelo, Calor, Repouso) e aperte Enter..."
                      value={alivioSearchTerm}
                      onChange={e => setAlivioSearchTerm(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (alivioSearchTerm.trim()) {
                            handleAddAlivio(alivioSearchTerm);
                          }
                        }
                      }}
                      style={{
                        width: '100%',
                        paddingLeft: '34px',
                        paddingRight: '12px',
                        height: '38px',
                        borderRadius: '6px',
                        background: 'var(--bg-dark, #0f172a)',
                        border: '1px solid var(--border-color, rgba(255,255,255,0.18))',
                        color: '#f8fafc',
                        fontSize: '0.88rem'
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (alivioSearchTerm.trim()) {
                        handleAddAlivio(alivioSearchTerm);
                      }
                    }}
                    disabled={!alivioSearchTerm.trim()}
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid rgba(16, 185, 129, 0.45)',
                      color: '#34d399',
                      borderRadius: '6px',
                      padding: '0 14px',
                      fontSize: '0.84rem',
                      cursor: alivioSearchTerm.trim() ? 'pointer' : 'default',
                      opacity: alivioSearchTerm.trim() ? 1 : 0.5,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <i className="fas fa-plus" /> Adicionar
                  </button>
                </div>
              )}

              {/* Sugestões de Alívio com Fontes Legíveis */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {filteredAlivioSuggestions.map(fat => {
                  const isSelected = (queixa.fatoresAlivio || []).includes(fat);
                  return (
                    <button
                      key={fat}
                      type="button"
                      disabled={readOnly}
                      onClick={() => toggleAlivio(fat)}
                      style={{
                        padding: '5px 11px',
                        borderRadius: '14px',
                        fontSize: '0.82rem',
                        fontWeight: isSelected ? 700 : 500,
                        border: '1px solid',
                        borderColor: isSelected ? '#10b981' : 'var(--border-color, rgba(255,255,255,0.15))',
                        background: isSelected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.03)',
                        color: isSelected ? '#34d399' : '#f8fafc',
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.86rem', color: '#e2e8f0', marginBottom: '6px', display: 'block', fontWeight: 600 }}>
                  Sensação / Tipo da Dor:
                </label>
                <select
                  className="form-control"
                  disabled={readOnly}
                  value={queixa.caracteristicaDor || 'Pontual / Aguda'}
                  onChange={e => updateField('caracteristicaDor', e.target.value)}
                  style={{ background: 'var(--bg-dark, #0f172a)', color: '#f8fafc', fontSize: '0.88rem', height: '38px', borderRadius: '6px', borderColor: 'rgba(255,255,255,0.18)' }}
                >
                  {TIPOS_CARACTERISTICA_DOR.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.86rem', color: '#e2e8f0', marginBottom: '6px', display: 'block', fontWeight: 600 }}>
                  Comportamento Temporal:
                </label>
                <select
                  className="form-control"
                  disabled={readOnly}
                  value={queixa.comportamentoDor || 'Intermitente'}
                  onChange={e => updateField('comportamentoDor', e.target.value)}
                  style={{ background: 'var(--bg-dark, #0f172a)', color: '#f8fafc', fontSize: '0.88rem', height: '38px', borderRadius: '6px', borderColor: 'rgba(255,255,255,0.18)' }}
                >
                  <option value="Intermitente">Intermitente (Vem e vai)</option>
                  <option value="Constante / Todo momento">Constante (Todo momento)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.86rem', color: '#e2e8f0', marginBottom: '6px', display: 'block', fontWeight: 600 }}>
                  Evolução dos Sintomas:
                </label>
                <select
                  className="form-control"
                  disabled={readOnly}
                  value={queixa.dorEvolucao || 'estavel'}
                  onChange={e => updateField('dorEvolucao', e.target.value)}
                  style={{ background: 'var(--bg-dark, #0f172a)', color: '#f8fafc', fontSize: '0.88rem', height: '38px', borderRadius: '6px', borderColor: 'rgba(255,255,255,0.18)' }}
                >
                  <option value="estavel">Estável (Sente a mesma dor)</option>
                  <option value="aumentando">Piorando / Aumentando</option>
                  <option value="diminuindo">Melhorando / Diminuindo</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.86rem', color: '#e2e8f0', marginBottom: '6px', display: 'block', fontWeight: 600 }}>
                  Tempo de Início:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Há 3 semanas..."
                  disabled={readOnly}
                  className="form-control"
                  value={queixa.tempoEvolucao || queixa.quandoComecou || ''}
                  onChange={e => {
                    updateField('tempoEvolucao', e.target.value);
                    updateField('quandoComecou', e.target.value);
                  }}
                  style={{ background: 'var(--bg-dark, #0f172a)', color: '#f8fafc', fontSize: '0.88rem', height: '38px', borderRadius: '6px', borderColor: 'rgba(255,255,255,0.18)' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. OBSERVAÇÕES LIVRES */}
      <div style={{ marginTop: '14px' }}>
        <label style={{ fontSize: '0.88rem', color: '#e2e8f0', marginBottom: '6px', display: 'block', fontWeight: 700 }}>
          Observações Clínicas Livres:
        </label>
        <textarea
          rows={2}
          disabled={readOnly}
          className="form-control"
          placeholder="Anotações livres sobre a queixa, contexto clínico, irradiação ou observações do aluno..."
          value={queixa.observacoesLivres || ''}
          onChange={e => updateField('observacoesLivres', e.target.value)}
          style={{
            background: 'var(--bg-dark, #0f172a)',
            color: '#f8fafc',
            borderColor: 'var(--border-color, rgba(255, 255, 255, 0.18))',
            borderRadius: '6px',
            fontSize: '0.88rem',
            resize: 'vertical'
          }}
        />
      </div>

      {/* 7. PREVIEW DA QUEIXA SINTETIZADA (TRANSPARÊNCIA TOTAL) */}
      <div style={{ marginTop: '12px', fontSize: '0.80rem', color: '#cbd5e1', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <span>
          <strong style={{ color: '#f8fafc' }}>Registro Padronizado:</strong> {queixa.dorOnde || 'Sem região'} • EVA {queixa.dorIntensidade}/10
          {queixa.desencadeiaPiora && ` • Piora: ${queixa.desencadeiaPiora}`}
          {queixa.melhoraDesaparece && ` • Alívio: ${queixa.melhoraDesaparece}`}
        </span>
      </div>
    </div>
  );
}
