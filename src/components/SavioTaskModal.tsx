'use client';

import React, { useState, useEffect } from 'react';

export interface ISavioTaskItem {
  _id?: string;
  titulo: string;
  descricao?: string;
  data: string;
  horario?: string;
  prazoFinal?: string;
  prioridade: 'alta' | 'media' | 'baixa';
  categoria: 'administrativa' | 'financeira' | 'comercial' | 'operacional' | 'pessoal' | 'personalizada';
  categoriaPersonalizada?: string;
  status: 'a_fazer' | 'em_andamento' | 'concluida';
  lembrete: boolean;
  concluidaEm?: string | Date | null;
  createdAt?: string | Date;
}

interface SavioTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: ISavioTaskItem | null;
  initialDate?: string;
  onSaved: () => void;
}

const CATEGORIAS_CONFIG: { id: ISavioTaskItem['categoria']; label: string; icon: string; color: string }[] = [
  { id: 'administrativa', label: 'Administrativa', icon: 'fa-building', color: '#6366f1' },
  { id: 'financeira', label: 'Financeira', icon: 'fa-coins', color: '#10b981' },
  { id: 'comercial', label: 'Comercial', icon: 'fa-handshake', color: '#3b82f6' },
  { id: 'operacional', label: 'Operacional', icon: 'fa-gears', color: '#f59e0b' },
  { id: 'pessoal', label: 'Pessoal', icon: 'fa-user', color: '#ec4899' },
  { id: 'personalizada', label: 'Outra', icon: 'fa-tag', color: '#8b5cf6' }
];

export default function SavioTaskModal({
  isOpen,
  onClose,
  taskToEdit,
  initialDate,
  onSaved
}: SavioTaskModalProps) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [prazoFinal, setPrazoFinal] = useState('');
  const [prioridade, setPrioridade] = useState<ISavioTaskItem['prioridade']>('media');
  const [categoria, setCategoria] = useState<ISavioTaskItem['categoria']>('administrativa');
  const [categoriaPersonalizada, setCategoriaPersonalizada] = useState('');
  const [status, setStatus] = useState<ISavioTaskItem['status']>('a_fazer');
  const [lembrete, setLembrete] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Helper para obter data YYYY-MM-DD
  const formatYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (taskToEdit) {
      setTitulo(taskToEdit.titulo || '');
      setDescricao(taskToEdit.descricao || '');
      setData(taskToEdit.data || '');
      setHorario(taskToEdit.horario || '');
      setPrazoFinal(taskToEdit.prazoFinal || '');
      setPrioridade(taskToEdit.prioridade || 'media');
      setCategoria(taskToEdit.categoria || 'administrativa');
      setCategoriaPersonalizada(taskToEdit.categoriaPersonalizada || '');
      setStatus(taskToEdit.status || 'a_fazer');
      setLembrete(taskToEdit.lembrete !== false);
    } else {
      setTitulo('');
      setDescricao('');
      setData(initialDate || formatYMD(new Date()));
      setHorario('');
      setPrazoFinal('');
      setPrioridade('media');
      setCategoria('administrativa');
      setCategoriaPersonalizada('');
      setStatus('a_fazer');
      setLembrete(true);
    }
    setErrorMsg('');
  }, [taskToEdit, initialDate, isOpen]);

  if (!isOpen) return null;

  // Atalhos Rápidos de Data
  const setQuickDate = (type: 'hoje' | 'amanha' | 'segunda') => {
    const now = new Date();
    if (type === 'hoje') {
      setData(formatYMD(now));
    } else if (type === 'amanha') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      setData(formatYMD(tomorrow));
    } else if (type === 'segunda') {
      const nextMonday = new Date(now);
      const day = nextMonday.getDay();
      const diff = (day === 0 ? 1 : 8 - day);
      nextMonday.setDate(nextMonday.getDate() + diff);
      setData(formatYMD(nextMonday));
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setErrorMsg('Por favor, informe o título da tarefa.');
      return;
    }
    if (!data.trim()) {
      setErrorMsg('Por favor, selecione a data de execução.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg('');

      const payload = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        data: data.trim(),
        horario: horario.trim(),
        prazoFinal: prazoFinal.trim(),
        prioridade,
        categoria,
        categoriaPersonalizada: categoria === 'personalizada' ? categoriaPersonalizada.trim() : '',
        status,
        lembrete
      };

      const isEdit = Boolean(taskToEdit?._id);
      const url = isEdit
        ? `/api/admin/savio-agenda/${taskToEdit!._id}`
        : '/api/admin/savio-agenda';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const dataRes = await res.json();
      if (!res.ok || !dataRes.success) {
        throw new Error(dataRes.error || 'Erro ao salvar tarefa.');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar tarefa:', err);
      setErrorMsg(err.message || 'Erro inesperado ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(5, 8, 15, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#0f172a',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          maxWidth: '650px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 30px 70px -10px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#0f172a',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '1rem',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
              }}
            >
              <i className={taskToEdit ? 'fas fa-pen-to-square' : 'fas fa-plus'} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', fontWeight: 700 }}>
                {taskToEdit ? 'Editar Tarefa / Compromisso' : 'Nova Tarefa Administrativa'}
              </h4>
              <small style={{ color: 'var(--text-dim, #94a3b8)', fontSize: '0.76rem' }}>
                Agenda Executiva Privada • Sávio Augusto Oliveira
              </small>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim, #94a3b8)',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px'
            }}
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Formulário com Scroll */}
        <form onSubmit={handleSalvar} style={{ overflowY: 'auto', flex: 1, backgroundColor: '#0b0f19', padding: '20px' }}>
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '0.85rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className="fas fa-triangle-exclamation" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Título da Tarefa */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                Título da Tarefa / Compromisso <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ex: Auditoria nos Contratos Asaas, Reunião com Fisioterapeutas..."
                autoFocus
                style={{
                  width: '100%',
                  backgroundColor: '#161f30',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: '0.92rem',
                  outline: 'none'
                }}
              />
            </div>

            {/* Descrição / Notas */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                Descrição & Observações <span style={{ color: 'var(--text-dim, #94a3b8)', fontWeight: 400 }}>(opcional)</span>
              </label>
              <textarea
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                rows={3}
                placeholder="Detalhes, pauta de reunião, links ou passos a executar..."
                style={{
                  width: '100%',
                  backgroundColor: '#161f30',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: '0.88rem',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Linha de Datas e Horário com Atalhos */}
            <div style={{ backgroundColor: '#161f30', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Planejamento de Execução
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setQuickDate('hoje')}
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '6px',
                      color: '#cbd5e1',
                      cursor: 'pointer'
                    }}
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate('amanha')}
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '6px',
                      color: '#cbd5e1',
                      cursor: 'pointer'
                    }}
                  >
                    Amanhã
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate('segunda')}
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '6px',
                      color: '#cbd5e1',
                      cursor: 'pointer'
                    }}
                  >
                    Próx. Segunda
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '4px' }}>
                    Data de Execução <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={data}
                    onChange={e => setData(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      color: '#fff',
                      fontSize: '0.86rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '4px' }}>
                    Horário Específico <span style={{ color: 'var(--text-dim, #94a3b8)' }}>(opcional)</span>
                  </label>
                  <input
                    type="time"
                    value={horario}
                    onChange={e => setHorario(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      color: '#fff',
                      fontSize: '0.86rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '4px' }}>
                    Prazo Limite / Vencimento <span style={{ color: 'var(--text-dim, #94a3b8)' }}>(opcional)</span>
                  </label>
                  <input
                    type="date"
                    value={prazoFinal}
                    onChange={e => setPrazoFinal(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      color: '#fff',
                      fontSize: '0.86rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Prioridade e Status */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                  Nível de Prioridade
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { id: 'baixa', label: 'Baixa', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: '#38bdf8' },
                    { id: 'media', label: 'Média', color: '#facc15', bg: 'rgba(250, 204, 21, 0.15)', border: '#facc15' },
                    { id: 'alta', label: 'Alta', color: '#f87171', bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444' }
                  ].map(p => {
                    const isSelected = prioridade === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPrioridade(p.id as any)}
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: isSelected ? p.bg : 'rgba(255, 255, 255, 0.04)',
                          color: isSelected ? p.color : 'var(--text-dim, #94a3b8)',
                          border: `1px solid ${isSelected ? p.border : 'rgba(255, 255, 255, 0.1)'}`,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                  Status Atual
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { id: 'a_fazer', label: 'A Fazer' },
                    { id: 'em_andamento', label: 'Em Andamento' },
                    { id: 'concluida', label: 'Concluída' }
                  ].map(s => {
                    const isSelected = status === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setStatus(s.id as any)}
                        style={{
                          flex: 1,
                          padding: '8px 8px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                          color: isSelected ? '#a5b4fc' : 'var(--text-dim, #94a3b8)',
                          border: `1px solid ${isSelected ? '#6366f1' : 'rgba(255, 255, 255, 0.1)'}`,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Categoria */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>
                Categoria da Tarefa
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                {CATEGORIAS_CONFIG.map(cat => {
                  const isSelected = categoria === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoria(cat.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: isSelected ? `${cat.color}25` : 'rgba(255, 255, 255, 0.04)',
                        color: isSelected ? '#fff' : 'var(--text-dim, #94a3b8)',
                        border: `1px solid ${isSelected ? cat.color : 'rgba(255, 255, 255, 0.08)'}`,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <i className={`fas ${cat.icon}`} style={{ color: isSelected ? cat.color : 'inherit', fontSize: '0.85rem' }} />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {categoria === 'personalizada' && (
                <div style={{ marginTop: '10px' }}>
                  <input
                    type="text"
                    value={categoriaPersonalizada}
                    onChange={e => setCategoriaPersonalizada(e.target.value)}
                    placeholder="Digite o nome da categoria personalizada..."
                    style={{
                      width: '100%',
                      backgroundColor: '#161f30',
                      border: '1px solid rgba(255, 255, 255, 0.16)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Lembrete / Alerta no Menu */}
            <div
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fas fa-bell" style={{ color: '#818cf8', fontSize: '1rem' }} />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>Alerta Visual no Menu</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-dim, #94a3b8)' }}>
                    Exibe indicador e badge no menu lateral se a tarefa estiver pendente ou atrasada
                  </div>
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px', margin: 0, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={lembrete}
                  onChange={e => setLembrete(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: lembrete ? '#6366f1' : 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '22px',
                    transition: '0.2s'
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      height: '16px',
                      width: '16px',
                      left: lembrete ? '21px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: '0.2s'
                    }}
                  />
                </span>
              </label>
            </div>
          </div>
        </form>

        {/* Rodapé com Botões de Ação */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: '#0f172a',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              color: 'var(--text-dim, #94a3b8)',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.86rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSalvar}
            disabled={saving}
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              border: 'none',
              color: '#fff',
              padding: '9px 20px',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
            }}
          >
            {saving ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check" />}
            {taskToEdit ? 'Atualizar Tarefa' : 'Salvar Tarefa'}
          </button>
        </div>
      </div>
    </div>
  );
}
