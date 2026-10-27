'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AlunoSummary, FilterType, normalizeStr } from './AlunoCardList';

interface AlunoDesktopNavigatorProps {
  currentAluno: {
    _id: string;
    nome: string;
    status?: string;
  } | null;
  filteredAlunos: AlunoSummary[];
  selectedAlunoId: string | null;
  onSelectAluno: (id: string) => void;
  filterType: FilterType;
  onChangeFilterType: (filter: FilterType) => void;
  searchTerm: string;
  onChangeSearchTerm: (term: string) => void;
  todayClientIds?: Set<string>;
  desktopLayout: 'full' | 'split';
  onToggleDesktopLayout: () => void;
}

export default function AlunoDesktopNavigator({
  currentAluno,
  filteredAlunos,
  selectedAlunoId,
  onSelectAluno,
  filterType,
  onChangeFilterType,
  searchTerm,
  onChangeSearchTerm,
  todayClientIds,
  desktopLayout,
  onToggleDesktopLayout
}: AlunoDesktopNavigatorProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Posição do aluno atual na lista filtrada
  const currentIndex = useMemo(() => {
    if (!selectedAlunoId) return -1;
    return filteredAlunos.findIndex(a => a._id === selectedAlunoId);
  }, [filteredAlunos, selectedAlunoId]);

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < filteredAlunos.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      onSelectAluno(filteredAlunos[currentIndex - 1]._id);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onSelectAluno(filteredAlunos[currentIndex + 1]._id);
    }
  };

  // Atalhos de teclado no Desktop:
  // - Seta Esquerda (←) ou 'j': Aluno Anterior
  // - Seta Direita (→) ou 'k': Próximo Aluno
  // - '/' : Abrir o seletor rápido com foco na busca
  // - 'Escape': Fechar o seletor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';

      if (!isInput) {
        if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'j') {
          if (hasPrevious) {
            e.preventDefault();
            handlePrevious();
          }
        } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'k') {
          if (hasNext) {
            e.preventDefault();
            handleNext();
          }
        } else if (e.key === '/') {
          e.preventDefault();
          setDropdownOpen(true);
          setTimeout(() => {
            searchInputRef.current?.focus();
            searchInputRef.current?.select();
          }, 50);
        }
      }

      if (e.key === 'Escape' && dropdownOpen) {
        setDropdownOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPrevious, hasNext, currentIndex, filteredAlunos, dropdownOpen]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const filterLabels: Record<FilterType, { label: string; icon: string }> = {
    todos: { label: 'Todos', icon: 'fa-users' },
    hoje: { label: 'Hoje', icon: 'fa-calendar-check' },
    alertas: { label: 'Alertas', icon: 'fa-triangle-exclamation' },
    reavaliacao: { label: 'Reavaliação', icon: 'fa-clock-rotate-left' },
    forca: { label: 'Força', icon: 'fa-dumbbell' },
    avaliados: { label: 'Avaliados', icon: 'fa-clipboard-check' }
  };

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: '14px',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.4)',
        zIndex: 50
      }}
    >
      {/* Lado Esquerdo: Toggle de Layout + Navegação Anterior/Próximo + Seletor */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Botão de Alternância de Layout: Tela Cheia Panorâmica vs Modo Dividido */}
        <button
          type="button"
          onClick={onToggleDesktopLayout}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: desktopLayout === 'full' ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${desktopLayout === 'full' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.12)'}`,
            color: desktopLayout === 'full' ? '#a5b4fc' : 'var(--text-dim, #94a3b8)',
            borderRadius: '8px',
            padding: '7px 12px',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title={desktopLayout === 'full' ? 'Clique para ver a Lista Lateral fixa' : 'Clique para expandir o Prontuário em Tela Cheia Panorâmica'}
        >
          <i className={desktopLayout === 'full' ? 'fas fa-maximize' : 'fas fa-columns'} />
          <span>{desktopLayout === 'full' ? 'Modo Panorâmico (100%)' : 'Modo Dividido (2 Colunas)'}</span>
        </button>

        <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.1)' }} />

        {/* Botão Anterior */}
        <button
          type="button"
          onClick={handlePrevious}
          disabled={!hasPrevious}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: hasPrevious ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: hasPrevious ? 'var(--text-main, #fff)' : 'rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '7px 12px',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: hasPrevious ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease'
          }}
          title="Aluno Anterior (Atalho: Seta Esquerda ← ou J)"
        >
          <i className="fas fa-chevron-left" />
          <span>Anterior</span>
        </button>

        {/* Dropdown Seletor do Aluno Atual */}
        <button
          type="button"
          onClick={() => {
            setDropdownOpen(!dropdownOpen);
            if (!dropdownOpen) {
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: dropdownOpen ? '1px solid var(--primary, #6366f1)' : '1px solid rgba(255, 255, 255, 0.14)',
            color: 'var(--text-main, #fff)',
            borderRadius: '10px',
            padding: '7px 14px',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: dropdownOpen ? '0 0 0 3px rgba(99, 102, 241, 0.2)' : 'none'
          }}
          title="Clique para pesquisar ou trocar de aluno rapidamente"
        >
          <i className="fas fa-user-circle" style={{ color: 'var(--primary, #818cf8)', fontSize: '1rem' }} />
          <span style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentAluno ? currentAluno.nome : 'Selecionar Aluno'}
          </span>
          {currentIndex >= 0 && (
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-dim, #94a3b8)',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '2px 8px',
                borderRadius: '10px',
                fontWeight: 600
              }}
            >
              {currentIndex + 1} de {filteredAlunos.length}
            </span>
          )}
          <i className={`fas fa-chevron-${dropdownOpen ? 'up' : 'down'}`} style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94a3b8)' }} />
        </button>

        {/* Botão Próximo */}
        <button
          type="button"
          onClick={handleNext}
          disabled={!hasNext}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: hasNext ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: hasNext ? 'var(--text-main, #fff)' : 'rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '7px 12px',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: hasNext ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease'
          }}
          title="Próximo Aluno (Atalho: Seta Direita → ou K)"
        >
          <span>Próximo</span>
          <i className="fas fa-chevron-right" />
        </button>
      </div>

      {/* Lado Direito: Chips Rápidos de Filtro Ativo + Atalho de Teclado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '2px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          {(['todos', 'hoje', 'alertas', 'reavaliacao'] as FilterType[]).map(f => {
            const isActive = filterType === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => onChangeFilterType(f)}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  background: isActive ? 'var(--primary, #6366f1)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-dim, #94a3b8)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {filterLabels[f].label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            setDropdownOpen(true);
            setTimeout(() => searchInputRef.current?.focus(), 50);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'var(--text-dim, #94a3b8)',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '0.78rem',
            cursor: 'pointer'
          }}
          title="Buscar aluno pelo nome, CPF ou telefone (tecle /)"
        >
          <i className="fas fa-search" />
          <span>Buscar aluno...</span>
          <kbd style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.7rem', color: '#cbd5e1' }}>/</kbd>
        </button>
      </div>

      {/* POPOVER SUSPENSO DE BUSCA E TROCA RÁPIDA DE ALUNOS */}
      {dropdownOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            maxWidth: '680px',
            backgroundColor: '#0b0f19',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            borderRadius: '14px',
            boxShadow: '0 30px 60px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.12)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            zIndex: 1000
          }}
        >
          {/* Campo de Busca Rápida */}
          <div style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim, #94a3b8)', fontSize: '0.9rem' }} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={e => onChangeSearchTerm(e.target.value)}
              placeholder="Digite o nome, CPF ou telefone do aluno..."
              style={{
                width: '100%',
                backgroundColor: '#161f30',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '10px 14px 10px 36px',
                color: '#fff',
                fontSize: '0.92rem',
                outline: 'none'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => onChangeSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim, #94a3b8)',
                  cursor: 'pointer'
                }}
              >
                <i className="fas fa-times" />
              </button>
            )}
          </div>

          {/* Lista de Alunos Filtrados para Troca Imediata */}
          <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px', paddingRight: '4px' }}>
            {filteredAlunos.length > 0 ? (
              filteredAlunos.map(a => {
                const isSelected = a._id === selectedAlunoId;
                const isHoje = todayClientIds ? todayClientIds.has(a._id) : false;

                return (
                  <div
                    key={a._id}
                    onClick={() => {
                      onSelectAluno(a._id);
                      setDropdownOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? '#312e81' : '#161f30',
                      border: isSelected ? '1px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.08)',
                      cursor: 'pointer',
                      transition: 'all 0.12s ease'
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = '#243048';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = '#161f30';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <strong style={{ fontSize: '0.88rem', color: isSelected ? '#c7d2fe' : 'var(--text-main, #fff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.nome}
                      </strong>
                      {a.idade && <span style={{ fontSize: '0.74rem', color: 'var(--text-dim, #94a3b8)' }}>{a.idade}a</span>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {isHoje && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.25)', color: '#10b981' }}>
                          HOJE
                        </span>
                      )}
                      {a.temAlertaCritico && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.25)', color: '#f87171' }}>
                          ALERTA
                        </span>
                      )}
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-dim, #94a3b8)' }}>
                        {a.totalGeral} registro(s)
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim, #94a3b8)' }}>
                <i className="fas fa-search fa-2x" style={{ opacity: 0.3, marginBottom: '6px' }} />
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Nenhum aluno encontrado para "{searchTerm}".</p>
              </div>
            )}
          </div>

          {/* Dica de Rodapé */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-dim, #94a3b8)', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '8px' }}>
            <span>Navegação: <strong>←</strong> e <strong>→</strong> passam pelos alunos</span>
            <span>Fechar: <strong>Esc</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
