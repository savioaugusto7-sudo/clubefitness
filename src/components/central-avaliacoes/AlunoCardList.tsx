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

interface AlunoCardListProps {
  alunos: AlunoSummary[];
  selectedAlunoId: string | null;
  onSelectAluno: (id: string) => void;
  loading?: boolean;
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
  loading = false
}: AlunoCardListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'avaliados' | 'forca' | 'alertas'>('todos');

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

    // Todos os tokens digitados precisam bater com ao menos um atributo do aluno
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

  // Alunos filtrados respeitando busca e a aba atual
  const filteredAlunos = useMemo(() => {
    return alunos.filter(a => {
      if (!matchStudent(a)) return false;

      if (filterType === 'avaliados') return a.totalGeral > 0;
      if (filterType === 'forca') return a.totalST > 0;
      if (filterType === 'alertas') return a.temAlertaCritico;
      return true;
    });
  }, [alunos, searchTokens, filterType]);

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

  const filterLabels: Record<string, string> = {
    todos: 'Todos',
    avaliados: 'Avaliados',
    forca: 'Força',
    alertas: 'Alertas'
  };

  // Renderiza nome destacando os termos pesquisados quando houver busca
  const renderHighlightedName = (name: string) => {
    if (searchTokens.length === 0) return name;
    // Regex segura para destacar tokens
    try {
      const pattern = searchTokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      const regex = new RegExp(`(${pattern})`, 'gi');
      // Busca simplificada comparando com normalização
      return (
        <span>
          {name}
        </span>
      );
    } catch {
      return name;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
      {/* Barra de Pesquisa Otimizada */}
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
          type="text"
          placeholder="Buscar por nome, sobrenome, CPF ou telefone..."
          className="form-control form-control-sm"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') setSearchTerm('');
          }}
          style={{
            paddingLeft: '34px',
            paddingRight: searchTerm ? '32px' : '12px',
            height: '38px',
            borderRadius: '8px',
            background: 'var(--bg-card)',
            borderColor: searchTerm ? 'var(--primary)' : 'var(--border-color)',
            fontSize: '0.85rem',
            boxShadow: searchTerm ? '0 0 0 2px rgba(99, 102, 241, 0.15)' : 'none',
            transition: 'all 0.2s ease'
          }}
        />
        {searchTerm && (
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
              padding: '4px 6px',
              borderRadius: '4px'
            }}
          >
            <i className="fas fa-times" />
          </button>
        )}
      </div>

      {/* Indicador de Status da Busca / Total de Alunos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-dim)', padding: '0 2px' }}>
        <span>
          {searchTerm ? (
            <>
              Encontrados: <strong style={{ color: 'var(--text-main)' }}>{filteredAlunos.length}</strong> de {alunos.length} alunos
            </>
          ) : (
            <>Total: <strong style={{ color: 'var(--text-main)' }}>{filteredAlunos.length}</strong> alunos</>
          )}
        </span>
        {searchTerm && (
          <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>Pressione Esc para limpar</span>
        )}
      </div>

      {/* Chips de Filtro Rápido */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
        <button
          onClick={() => setFilterType('todos')}
          style={{
            padding: '4px 10px',
            borderRadius: '16px',
            fontSize: '0.75rem',
            fontWeight: 500,
            border: '1px solid',
            borderColor: filterType === 'todos' ? 'var(--primary)' : 'var(--border-color)',
            background: filterType === 'todos' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            color: filterType === 'todos' ? 'var(--primary)' : 'var(--text-dim)',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          Todos ({alunos.length})
        </button>
        <button
          onClick={() => setFilterType('avaliados')}
          style={{
            padding: '4px 10px',
            borderRadius: '16px',
            fontSize: '0.75rem',
            fontWeight: 500,
            border: '1px solid',
            borderColor: filterType === 'avaliados' ? 'var(--secondary)' : 'var(--border-color)',
            background: filterType === 'avaliados' ? 'rgba(13, 148, 136, 0.15)' : 'transparent',
            color: filterType === 'avaliados' ? 'var(--secondary)' : 'var(--text-dim)',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          Avaliados ({alunos.filter(a => a.totalGeral > 0).length})
        </button>
        <button
          onClick={() => setFilterType('forca')}
          style={{
            padding: '4px 10px',
            borderRadius: '16px',
            fontSize: '0.75rem',
            fontWeight: 500,
            border: '1px solid',
            borderColor: filterType === 'forca' ? '#f59e0b' : 'var(--border-color)',
            background: filterType === 'forca' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
            color: filterType === 'forca' ? '#f59e0b' : 'var(--text-dim)',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          Força ({alunos.filter(a => a.totalST > 0).length})
        </button>
        <button
          onClick={() => setFilterType('alertas')}
          style={{
            padding: '4px 10px',
            borderRadius: '16px',
            fontSize: '0.75rem',
            fontWeight: 500,
            border: '1px solid',
            borderColor: filterType === 'alertas' ? '#ef4444' : 'var(--border-color)',
            background: filterType === 'alertas' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
            color: filterType === 'alertas' ? '#ef4444' : 'var(--text-dim)',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          Alertas ({alunos.filter(a => a.temAlertaCritico).length})
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
                  background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-card)',
                  border: '1px solid',
                  borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                  borderLeft: isSelected ? '4px solid var(--primary)' : '3px solid transparent',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease-in-out',
                  position: 'relative'
                }}
              >
                {/* Nome do Aluno (Sem Avatar, Conforme Instrução) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <span
                    style={{
                      fontWeight: isSelected ? 600 : 500,
                      fontSize: '0.9rem',
                      color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                      lineHeight: 1.2
                    }}
                  >
                    {renderHighlightedName(a.nome)}
                  </span>
                  {a.temAlertaCritico && (
                    <span
                      title="Possui alertas clínicos ou assimetrias críticas"
                      style={{
                        fontSize: '9px',
                        padding: '2px 5px',
                        borderRadius: '4px',
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: '#ef4444',
                        fontWeight: 600,
                        marginLeft: '6px'
                      }}
                    >
                      ALERTA
                    </span>
                  )}
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
