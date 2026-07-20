'use client';

import React, { useState, useEffect } from 'react';

interface Client {
  _id: string;
  dadosPessoais?: {
    nome?: string;
    email?: string;
    cpf?: string;
    telefone?: string;
  };
  dadosClinicos?: {
    lesoes?: string;
    restricoes?: string;
    medicamentos?: string;
    historicoClinico?: string;
    observacoes?: string;
  };
}

interface DadosClinicosPanelProps {
  clients: Client[];
  onUpdate?: () => void;
}

export default function DadosClinicosPanel({ clients, onUpdate }: DadosClinicosPanelProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [lesoes, setLesoes] = useState('');
  const [restricoes, setRestricoes] = useState('');
  const [medicamentos, setMedicamentos] = useState('');
  const [historicoClinico, setHistoricoClinico] = useState('');
  const [observacoes, setObservacoes] = useState('');
  
  const [saving, setSaving] = useState(false);

  const selectedClient = clients.find(c => c._id === selectedClientId);

  useEffect(() => {
    if (selectedClient && selectedClient.dadosClinicos) {
      setLesoes(selectedClient.dadosClinicos.lesoes || '');
      setRestricoes(selectedClient.dadosClinicos.restricoes || '');
      setMedicamentos(selectedClient.dadosClinicos.medicamentos || '');
      setHistoricoClinico(selectedClient.dadosClinicos.historicoClinico || '');
      setObservacoes(selectedClient.dadosClinicos.observacoes || '');
    } else {
      setLesoes('');
      setRestricoes('');
      setMedicamentos('');
      setHistoricoClinico('');
      setObservacoes('');
    }
  }, [selectedClientId, selectedClient]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) {
      alert('Selecione um aluno para salvar os dados clínicos.');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedClientId,
          dadosClinicos: {
            lesoes,
            restricoes,
            medicamentos,
            historicoClinico,
            observacoes
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Dados clínicos atualizados com sucesso!');
        if (onUpdate) onUpdate();
      } else {
        alert('Erro ao salvar dados clínicos: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro ao salvar dados clínicos: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredClients = clients.filter(c => {
    const q = searchQuery.toLowerCase();
    const nome = (c.dadosPessoais?.nome || '').toLowerCase();
    const cpf = c.dadosPessoais?.cpf || '';
    return nome.includes(q) || cpf.includes(q);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="view-header">
        <div className="view-title-group">
          <h1><i className="fa-solid fa-notes-medical" style={{ marginRight: '10px', color: 'var(--color-primary)' }}></i>Dados Clínicos dos Alunos</h1>
          <p>Gerenciamento de prontuário, histórico médico, lesões, restrições e medicações.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: clients.length > 0 ? '320px 1fr' : '1fr', gap: '20px', alignItems: 'start' }}>
        {/* Left Column: Client Selection */}
        <div className="content-panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-users" style={{ color: 'var(--color-primary)' }}></i> Selecionar Aluno
          </h3>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar aluno por nome ou CPF..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ maxHeight: '480px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredClients.map(c => {
              const isSelected = c._id === selectedClientId;
              const hasClinData = Boolean(c.dadosClinicos?.lesoes || c.dadosClinicos?.restricoes || c.dadosClinicos?.medicamentos || c.dadosClinicos?.historicoClinico);
              return (
                <div
                  key={c._id}
                  onClick={() => setSelectedClientId(c._id)}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: isSelected ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)',
                    background: isSelected ? 'rgba(16,185,129,0.08)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: isSelected ? 'var(--color-primary)' : 'var(--text-main)' }}>
                      {c.dadosPessoais?.nome || 'Sem Nome'}
                    </div>
                    <small style={{ color: 'var(--text-dim)' }}>
                      CPF: {c.dadosPessoais?.cpf || '—'}
                    </small>
                  </div>
                  {hasClinData && (
                    <span title="Possui histórico registrado" style={{ color: 'var(--color-primary)', fontSize: '0.85rem' }}>
                      <i className="fa-solid fa-file-medical"></i>
                    </span>
                  )}
                </div>
              );
            })}
            {filteredClients.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px 0', fontSize: '0.85rem' }}>
                Nenhum aluno encontrado.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Clinical Form */}
        {selectedClient ? (
          <form onSubmit={handleSave} className="content-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {selectedClient.dadosPessoais?.nome}
                </h2>
                <small style={{ color: 'var(--text-dim)' }}>
                  CPF: {selectedClient.dadosPessoais?.cpf || '—'} | E-mail: {selectedClient.dadosPessoais?.email || '—'}
                </small>
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i>
                {saving ? 'Salvando...' : 'Salvar Dados Clínicos'}
              </button>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-user-injured" style={{ color: '#ef4444' }}></i> Lesões / Histórico de Lesões
              </label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Descreva lesões musculares, articulares, fraturas ou cirurgias prévias..."
                value={lesoes}
                onChange={e => setLesoes(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-ban" style={{ color: '#f59e0b' }}></i> Restrições Médicas / Atividade Física
              </label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Movimentos contraindicados, restrições de carga ou recomendações médicas..."
                value={restricoes}
                onChange={e => setRestricoes(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-pills" style={{ color: '#3b82f6' }}></i> Medicamentos em Uso
              </label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Medicamentos contínuos, dosagens ou alertas fisiológicos..."
                value={medicamentos}
                onChange={e => setMedicamentos(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-notes-medical" style={{ color: '#10b981' }}></i> Histórico Clínico / Patologias Pregressas
              </label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Hipertensão, diabetes, problemas cardíacos, hérnia de disco ou outras condições..."
                value={historicoClinico}
                onChange={e => setHistoricoClinico(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-comment-medical" style={{ color: 'var(--text-dim)' }}></i> Observações Clínicas Gerais
              </label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Anotações adicionais de acompanhamento..."
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i>
                {saving ? 'Salvando...' : 'Salvar Dados Clínicos'}
              </button>
            </div>
          </form>
        ) : (
          <div className="content-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
            <i className="fa-solid fa-notes-medical" style={{ fontSize: '3rem', color: 'var(--border-color)', marginBottom: '12px' }}></i>
            <h3>Selecione um aluno à esquerda</h3>
            <p style={{ margin: 0 }}>Escolha um aluno na lista para visualizar e atualizar seu prontuário e histórico clínico.</p>
          </div>
        )}
      </div>
    </div>
  );
}
