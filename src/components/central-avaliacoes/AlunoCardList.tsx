'use client';

import React, { useState, useMemo } from 'react';

export interface AlunoSummary {
  _id: string;
  nome: string;
  idade: number | null;
  telefone: string;
  cpf?: string;
  email?: string;
  status: string;
  lesoes?: string;
  restricoes?: string;
  totalAvaliacoes: number;
  totalTestes: number;
  totalGeral: number;
  totalPA: number;
  totalPR: number;
  totalST: number;
  totalTR: number;
  ultimaData: string;
  temAlertaCritico: boolean;
}

export type FilterType = 'todos' | 'hoje' | 'alertas' | 'reavaliacao' | 'forca' | 'avaliados';

interface AlunoCardListProps {
  alunos: AlunoSummary[];
  selectedAlunoId: string | null;
  onSelectAluno: (id: string) => void;
  loading?: boolean;
  todayClientIds?: Set<string>;
}

// Normalização de string: remove acentos, diacríticos e pontuação para busca infalível
export function normalizeStr(str?: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function AlunoCardList({
  alunos,
  selectedAlunoId,
  onSelectAluno,
  loading = false,
  todayClientIds
}: AlunoCardListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('todos');
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  // 🌟 Atalho Global de Teclado: Apertar '/' foca o campo de busca
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Tokens de busca separados por espaço (busca por termos independentes)
  const searchTokens = useMemo(() => {
    return normalizeStr(searchTerm)
      .split(/\s+/)
      .filter(t => t.length > 0);
  }, [searchTerm]);

  // Função validadora de match para um aluno
  const matchStudent = (a: AlunoSummary): boolean => {
    if (searchTokens.length === 0) return true;

    const normNome = normalizeStr(a.nome);
    const normCpf = normalizeStr(a.cpf);
    const rawCpf = (a.cpf || '').replace(/\D/g, '');
    const normPhone = normalizeStr(a.telefone);
    const rawPhone = (a.telefone || '').replace(/\D/g, '');
    const normEmail = normalizeStr(a.email);

    return searchTokens.every(token => {
      const tokenDigits = token.replace(/\D/g, '');
      return (
        normNome.includes(token) ||
        normCpf.includes(token) ||
        (tokenDigits.length >= 2 && rawCpf.includes(tokenDigits)) ||
        (tokenDigits.length >= 2 && rawPhone.includes(tokenDigits)) ||
        normPhone.includes(token) ||
        normEmail.includes(token)
      );
    });
  };

  // Verificador de Reavaliação Pendente (avaliado há mais de 45 dias)
  const isReavaliacaoPendente = (a: AlunoSummary): boolean => {
    if (!a.ultimaData || a.totalGeral === 0) return false;
    const parts = a.ultimaData.split('-');
    if (parts.length !== 3) return false;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 45;
  };

  // Alunos filtrados respeitando busca e a aba atual
  const filteredAlunos = useMemo(() => {
    return alunos.filter(a => {
      if (!matchStudent(a)) return false;

      if (filterType === 'hoje') return todayClientIds ? todayClientIds.has(a._id) : false;
      if (filterType === 'alertas') return a.temAlertaCritico;
      if (filterType === 'reavaliacao') return isReavaliacaoPendente(a);
      if (filterType === 'forca') return a.totalST > 0;
      if (filterType === 'avaliados') return a.totalGeral > 0;
      return true;
    });
  }, [alunos, searchTokens, filterType, todayClientIds]);

  // Checagem inteligente de cross-match: usuário buscou, deu 0 resultados na aba atual, mas existe em 'Todos'?
  const crossMatchesInTodos = useMemo(() => {
    if (searchTokens.length === 0 || filterType === 'todos') return 0;
    if (filteredAlunos.length > 0) return 0;
    return alunos.filter(a => matchStudent(a)).length;
  }, [alunos, searchTokens, filterType, filteredAlunos.length]);

  const formatDate = (dStr?: string) => {
    if (!dStr) return 'Sem avaliação';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dStr;
  };

  const filterLabels: Record<FilterType, string> = {
    todos: 'Todos',
    hoje: 'Hoje',
    alertas: 'Alertas',
    reavaliacao: 'Reavaliação',
    forca: 'Força',
    avaliados: 'Avaliados'
  };

  // 🌟 Navegação por Teclado dentro do Input: Setas para cima/baixo alternam alunos
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setSearchTerm('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredAlunos.length > 0) {
        const idx = filteredAlunos.findIndex(a => a._id === selectedAlunoId);
        const nextIdx = idx < filteredAlunos.length - 1 ? idx + 1 : 0;
        onSelectAluno(filteredAlunos[nextIdx]._id);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredAlunos.length > 0) {
        const idx = filteredAlunos.findIndex(a => a._id === selectedAlunoId);
        const prevIdx = idx > 0 ? idx - 1 : filteredAlunos.length - 1;
        onSelectAluno(filteredAlunos[prevIdx]._id);
      }
    } else if (e.key === 'Enter') {
      if (filteredAlunos.length > 0 && !selectedAlunoId) {
        onSelectAluno(filteredAlunos[0]._id);
      }
    }
  };

  // Contagens para os chips
  const countHoje = useMemo(() => {
    if (!todayClientIds) return 0;
    return alunos.filter(a => todayClientIds.has(a._id)).length;
  }, [alunos, todayClientIds]);

  const countAlertas = useMemo(() => alunos.filter(a => a.temAlertaCritico).length, [alunos]);
  const countReavaliacao = useMemo(() => alunos.filter(a => isReavaliacaoPendente(a)).length, [alunos]);
  const countForca = useMemo(() => alunos.filter(a => a.totalST > 0).length, [alunos]);
  const countAvaliados = useMemo(() => alunos.filter(a => a.totalGeral > 0).length, [alunos]);

  // Renderiza nome destacando os termos pesquisados quando houver busca
  const renderHighlightedName = (name: string) => {
    if (searchTokens.length === 0) return name;
    try {
      const pattern = searchTokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      const regex = new RegExp(`(${pattern})`, 'gi');
      return <span>{name}</span>;
    } catch {
      return name;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
      {/* Barra de Pesquisa Otimizada com Atalho '/' */}
      <div style={{ position: 'relative' }}>
        <i
          className="fas fa-search"
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: searchTerm ? 'var(--primary)' : 'var(--text-dim)',
            fontSize: '0.85rem',
            transition: 'color 0.2s ease'
          }}
        />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Buscar aluno, CPF ou telefone... (ou tecle /)"
          className="form-control form-control-sm"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onKeyDown={handleInputKeyDown}
          style={{
            paddingLeft: '36px',
            paddingRight: searchTerm ? '34px' : '36px',
            height: '42px',
            borderRadius: '10px',
            background: 'var(--bg-card)',
            borderColor: searchTerm ? 'var(--primary)' : 'var(--border-color)',
            fontSize: '0.92rem',
            boxShadow: searchTerm ? '0 0 0 2px rgba(99, 102, 241, 0.15)' : 'none',
            transition: 'all 0.2s ease'
          }}
        />
        {searchTerm ? (
          <button
            type="button"
            title="Limpar busca (Esc)"
            onClick={() => setSearchTerm('')}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: '4px'
            }}
          >
            <i className="fas fa-times" />
          </button>
        ) : (
          <span
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '0.72rem',
              color: 'var(--text-dim)',
              background: 'rgba(255,255,255,0.06)',
              padding: '2px 6px',
              borderRadius: '4px',
              pointerEvents: 'none'
            }}
            title="Pressione a tecla / para buscar rapidamente"
          >
            /
          </span>
        )}
      </div>

      {/* Indicador de Status da Busca / Total de Alunos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: 'var(--text-dim)', padding: '0 2px' }}>
        <span>
          {searchTerm ? (
            <>
              Encontrados: <strong style={{ color: 'var(--text-main)' }}>{filteredAlunos.length}</strong> de {alunos.length}
            </>
          ) : (
            <>Exibindo: <strong style={{ color: 'var(--text-main)' }}>{filteredAlunos.length}</strong> de {alunos.length}</>
          )}
        </span>
        <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Use ↑ ↓ para navegar</span>
      </div>

      {/* Chips de Filtro Rápido Clínicos */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' }}>
        <button
          onClick={() => setFilterType('todos')}
          style={{
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 600,
            border: '1px solid',
            borderColor: filterType === 'todos' ? 'var(--primary)' : 'var(--border-color)',
            background: filterType === 'todos' ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
            color: filterType === 'todos' ? 'var(--primary)' : 'var(--text-dim)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            minHeight: '34px'
          }}
        >
          Todos ({alunos.length})
        </button>

        {countHoje > 0 && (
          <button
            onClick={() => setFilterType('hoje')}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 700,
              border: '1px solid',
              borderColor: filterType === 'hoje' ? '#10b981' : 'var(--border-color)',
              background: filterType === 'hoje' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              color: filterType === 'hoje' ? '#10b981' : 'var(--text-dim)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              minHeight: '34px'
            }}
          >
            🟢 Hoje ({countHoje})
          </button>
        )}

        <button
          onClick={() => setFilterType('alertas')}
          style={{
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 600,
            border: '1px solid',
            borderColor: filterType === 'alertas' ? '#ef4444' : 'var(--border-color)',
            background: filterType === 'alertas' ? 'rgba(239, 68, 68, 0.18)' : 'transparent',
            color: filterType === 'alertas' ? '#ef4444' : 'var(--text-dim)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            minHeight: '34px'
          }}
        >
          Alertas ({countAlertas})
        </button>

        <button
          onClick={() => setFilterType('reavaliacao')}
          style={{
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 600,
            border: '1px solid',
            borderColor: filterType === 'reavaliacao' ? '#f59e0b' : 'var(--border-color)',
            background: filterType === 'reavaliacao' ? 'rgba(245, 158, 11, 0.18)' : 'transparent',
            color: filterType === 'reavaliacao' ? '#f59e0b' : 'var(--text-dim)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            minHeight: '34px'
          }}
        >
          Reavaliação ({countReavaliacao})
        </button>

        <button
          onClick={() => setFilterType('forca')}
          style={{
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 600,
            border: '1px solid',
            borderColor: filterType === 'forca' ? '#6366f1' : 'var(--border-color)',
            background: filterType === 'forca' ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
            color: filterType === 'forca' ? '#6366f1' : 'var(--text-dim)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            minHeight: '34px'
          }}
        >
          Força ({countForca})
        </button>

        <button
          onClick={() => setFilterType('avaliados')}
          style={{
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 600,
            border: '1px solid',
            borderColor: filterType === 'avaliados' ? 'var(--secondary)' : 'var(--border-color)',
            background: filterType === 'avaliados' ? 'rgba(13, 148, 136, 0.18)' : 'transparent',
            color: filterType === 'avaliados' ? 'var(--secondary)' : 'var(--text-dim)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            minHeight: '34px'
          }}
        >
          Avaliados ({countAvaliados})
        </button>
      </div>

      {/* Armadilha de Abas: Aviso quando a busca tem resultado em 'Todos' mas 0 na aba atual */}
      {crossMatchesInTodos > 0 && (
        <div
          style={{
            padding: '8px 10px',
            borderRadius: '8px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <span style={{ color: 'var(--text-main)' }}>
            Nenhum em <strong>{filterLabels[filterType]}</strong>, mas há <strong>{crossMatchesInTodos}</strong> em <strong>Todos</strong>.
          </span>
          <button
            type="button"
            onClick={() => setFilterType('todos')}
            style={{
              background: 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '3px 8px',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Ver em Todos
          </button>
        </div>
      )}

      {/* Lista Rolável de Cards de Alunos */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          paddingRight: '2px'
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
            <i className="fas fa-spinner fa-spin fa-2x" style={{ marginBottom: '8px', color: 'var(--primary)' }} />
            <p style={{ fontSize: '0.85rem' }}>Carregando alunos...</p>
          </div>
        ) : filteredAlunos.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '30px 15px',
              color: 'var(--text-dim)',
              background: 'var(--bg-card)',
              borderRadius: '8px',
              border: '1px dashed var(--border-color)'
            }}
          >
            <i className="fas fa-user-slash fa-2x" style={{ marginBottom: '8px', opacity: 0.5 }} />
            <p style={{ fontSize: '0.85rem', margin: 0 }}>Nenhum aluno encontrado para os critérios selecionados.</p>
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('todos');
                }}
                style={{
                  marginTop: '10px',
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--primary)',
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Limpar filtros de busca
              </button>
            )}
          </div>
        ) : (
          filteredAlunos.map(a => {
            const isSelected = selectedAlunoId === a._id;
            return (
              <div
                key={a._id}
                onClick={() => onSelectAluno(a._id)}
                style={{
                  background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-card)',
                  border: '1px solid',
                  borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                  borderLeft: isSelected ? '4px solid var(--primary)' : '3px solid transparent',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease-in-out',
                  position: 'relative',
                  minHeight: '56px'
                }}
              >
                {/* Nome do Aluno (Sem Avatar, Conforme Instrução) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span
                    style={{
                      fontWeight: isSelected ? 700 : 600,
                      fontSize: '0.94rem',
                      color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                      lineHeight: 1.25
                    }}
                  >
                    {renderHighlightedName(a.nome)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {todayClientIds?.has(a._id) && (
                      <span
                        title="Possui agendamento hoje"
                        style={{
                          fontSize: '9px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: '#10b981',
                          fontWeight: 700
                        }}
                      >
                        HOJE
                      </span>
                    )}
                    {a.temAlertaCritico && (
                      <span
                        title="Possui alertas clínicos ou assimetrias críticas"
                        style={{
                          fontSize: '9px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(239, 68, 68, 0.18)',
                          color: '#ef4444',
                          fontWeight: 700
                        }}
                      >
                        ALERTA
                      </span>
                    )}
                    {isReavaliacaoPendente(a) && (
                      <span
                        title="Última avaliação há mais de 45 dias"
                        style={{
                          fontSize: '9px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(245, 158, 11, 0.18)',
                          color: '#f59e0b',
                          fontWeight: 700
                        }}
                      >
                        REAVALIAÇÃO
                      </span>
                    )}
                    <i
                      className="fas fa-chevron-right"
                      style={{
                        fontSize: '0.75rem',
                        color: isSelected ? 'var(--primary)' : 'var(--text-dim)',
                        opacity: isSelected ? 1 : 0.4,
                        transition: 'transform 0.15s ease',
                        transform: isSelected ? 'translateX(2px)' : 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Linha de Metadados: Idade, CPF ou Telefone quando pesquisado, e Última Avaliação */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '6px', flexWrap: 'wrap' }}>
                  {a.idade ? <span>{a.idade} anos</span> : <span>Idade n/i</span>}
                  {a.cpf && (
                    <>
                      <span>•</span>
                      <span>CPF: {a.cpf}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>Última: {formatDate(a.ultimaData)}</span>
                </div>

                {/* Badges de Contagem de Avaliações / Testes Reais */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {a.totalAvaliacoes > 0 && (
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(13, 148, 136, 0.12)',
                        color: '#0d9488',
                        fontWeight: 500
                      }}
                    >
                      <i className="fas fa-file-medical" style={{ marginRight: '3px' }} />
                      {a.totalAvaliacoes} aval.
                    </span>
                  )}
                  {a.totalST > 0 && (
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(245, 158, 11, 0.12)',
                        color: '#f59e0b',
                        fontWeight: 500
                      }}
                    >
                      <i className="fas fa-weight-hanging" style={{ marginRight: '3px' }} />
                      {a.totalST} força
                    </span>
                  )}
                  {a.totalTR > 0 && (
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(236, 72, 153, 0.12)',
                        color: '#ec4899',
                        fontWeight: 500
                      }}
                    >
                      <i className="fas fa-bolt" style={{ marginRight: '3px' }} />
                      {a.totalTR} avulsos
                    </span>
                  )}
                  {a.totalGeral === 0 && (
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(148, 163, 184, 0.1)',
                        color: 'var(--text-dim)'
                      }}
                    >
                      Pendente
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
