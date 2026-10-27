'use client';

import React, { useState, useMemo } from 'react';

export interface AlunoSummary {
  _id: string;
  nome: string;
  idade: number | null;
  telefone: string;
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

export default function AlunoCardList({
  alunos,
  selectedAlunoId,
  onSelectAluno,
  loading = false
}: AlunoCardListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'avaliados' | 'forca' | 'alertas'>('todos');

  const filteredAlunos = useMemo(() => {
    return alunos.filter(a => {
      // Filtro de busca textual (Nome ou Telefone)
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        a.nome.toLowerCase().includes(term) ||
        (a.telefone && a.telefone.includes(term));

      if (!matchSearch) return false;

      // Filtros rápidos
      if (filterType === 'avaliados') return a.totalGeral > 0;
      if (filterType === 'forca') return a.totalST > 0;
      if (filterType === 'alertas') return a.temAlertaCritico;
      return true;
    });
  }, [alunos, searchTerm, filterType]);

  const formatDate = (dStr?: string) => {
    if (!dStr) return 'Sem avaliação';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dStr;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      {/* Barra de Pesquisa */}
      <div style={{ position: 'relative' }}>
        <i
          className="fas fa-search"
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-dim)',
            fontSize: '0.85rem'
          }}
        />
        <input
          type="text"
          placeholder="Buscar aluno por nome..."
          className="form-control form-control-sm"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            paddingLeft: '34px',
            height: '36px',
            borderRadius: '8px',
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
            fontSize: '0.85rem'
          }}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer'
            }}
          >
            <i className="fas fa-times" />
          </button>
        )}
      </div>

      {/* Chips de Filtro Rápido */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
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
                    {a.nome}
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

                {/* Linha de Metadados: Idade e Última Avaliação */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                  {a.idade ? <span>{a.idade} anos</span> : <span>Idade n/i</span>}
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
