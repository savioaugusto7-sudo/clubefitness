'use client';

import React, { useState, useEffect, useMemo } from 'react';
import SmartSearchInput from './SmartSearchInput';
import { smartSearchMatch } from '@/utils/smartSearch';
import { FastTextarea } from './FastFormField';

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

  const selectedClient = useMemo(() => {
    return clients.find(c => c._id === selectedClientId);
  }, [clients, selectedClientId]);

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
  }, [selectedClientId]);

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
    return smartSearchMatch([
      c.dadosPessoais?.nome,
      c.dadosPessoais?.cpf,
      c.dadosPessoais?.email,
      c.dadosPessoais?.telefone
    ], searchQuery);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(20, 30, 48, 0.9) 0%, rgba(10, 17, 30, 0.95) 100%)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem'
          }}>
            <i className="fa-solid fa-notes-medical"></i>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Dados Clínicos dos Alunos
            </h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Prontuário, histórico médico, lesões, restrições e medicações em uso.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', alignItems: 'start' }}>
        {/* Left Column / Mobile Top: Client Selection */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 750, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-users" style={{ color: '#38bdf8' }}></i> Selecionar Aluno
            </h3>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              {filteredClients.length} encontrados
            </span>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <SmartSearchInput
              placeholder="Buscar aluno por nome ou CPF..."
              value={searchQuery}
              onChange={val => setSearchQuery(val)}
              resultCount={filteredClients.length}
              totalCount={clients.length}
            />
          </div>

          <div style={{ maxHeight: '215px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px', scrollbarWidth: 'thin' }}>
            {filteredClients.map(c => {
              const isSelected = c._id === selectedClientId;
              const hasClinData = Boolean(c.dadosClinicos?.lesoes || c.dadosClinicos?.restricoes || c.dadosClinicos?.medicamentos || c.dadosClinicos?.historicoClinico);
              return (
                <button
                  type="button"
                  key={c._id}
                  onClick={() => setSelectedClientId(c._id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: isSelected ? '1.5px solid #10b981' : '1px solid var(--border-color)',
                    background: isSelected ? 'rgba(16,185,129,0.12)' : 'var(--bg-darker)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    textAlign: 'left',
                    width: '100%',
                    touchAction: 'manipulation'
                  }}
                >
                  <div style={{ overflow: 'hidden', paddingRight: '8px' }}>
                    <div style={{ fontWeight: 750, fontSize: '0.9rem', color: isSelected ? '#ffffff' : 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {c.dadosPessoais?.nome || 'Sem Nome'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      CPF: {c.dadosPessoais?.cpf || '—'}
                    </div>
                  </div>
                  {hasClinData && (
                    <span style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '8px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}>
                      <i className="fa-solid fa-file-medical"></i> Clínico
                    </span>
                  )}
                </button>
              );
            })}
            {filteredClients.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '24px 0', fontSize: '0.85rem' }}>
                Nenhum aluno encontrado para "{searchQuery}".
              </div>
            )}
          </div>
        </div>

        {/* Right Column / Mobile Main: Clinical Form */}
        {selectedClient ? (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header do Aluno Selecionado */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '16px',
              padding: '18px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Ficha do Aluno
                </div>
                <h2 style={{ margin: '2px 0 0', fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                  {selectedClient.dadosPessoais?.nome}
                </h2>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  CPF: {selectedClient.dadosPessoais?.cpf || '—'} • Tel: {selectedClient.dadosPessoais?.telefone || '—'}
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontWeight: 750,
                  fontSize: '0.88rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                  touchAction: 'manipulation'
                }}
              >
                {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                Salvar Dados
              </button>
            </div>

            {/* Card 1: Histórico Clínico */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <label style={{ fontWeight: 750, fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fa-solid fa-notes-medical"></i>
                </div>
                Histórico Clínico / Patologias Pregressas
              </label>
              <FastTextarea
                className="form-control"
                rows={3}
                placeholder="Hipertensão, diabetes, cirurgias prévias, hérnia de disco ou outras condições..."
                value={historicoClinico}
                onChange={val => setHistoricoClinico(val)}
                style={{ width: '100%', background: 'var(--bg-darker)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.88rem', resize: 'vertical' }}
              />
            </div>

            {/* Card 2: Lesões */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <label style={{ fontWeight: 750, fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fa-solid fa-user-injured"></i>
                </div>
                Lesões / Histórico de Lesões Musculares ou Articulares
              </label>
              <FastTextarea
                className="form-control"
                rows={3}
                placeholder="Descreva lesões musculares, estiramentos, rupturas, dor crônica ou inflamações..."
                value={lesoes}
                onChange={val => setLesoes(val)}
                style={{ width: '100%', background: 'var(--bg-darker)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.88rem', resize: 'vertical' }}
              />
            </div>

            {/* Card 3: Restrições */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <label style={{ fontWeight: 750, fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fa-solid fa-ban"></i>
                </div>
                Restrições Médicas / Movimentos Contraindicados
              </label>
              <FastTextarea
                className="form-control"
                rows={3}
                placeholder="Movimentos contraindicados, limites de flexão/extensão ou restrições de impacto..."
                value={restricoes}
                onChange={val => setRestricoes(val)}
                style={{ width: '100%', background: 'var(--bg-darker)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.88rem', resize: 'vertical' }}
              />
            </div>

            {/* Card 4: Medicamentos */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <label style={{ fontWeight: 750, fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fa-solid fa-pills"></i>
                </div>
                Medicamentos em Uso e Dosagens
              </label>
              <FastTextarea
                className="form-control"
                rows={2}
                placeholder="Medicamentos contínuos, analgésicos ou alertas fisiológicos..."
                value={medicamentos}
                onChange={val => setMedicamentos(val)}
                style={{ width: '100%', background: 'var(--bg-darker)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.88rem', resize: 'vertical' }}
              />
            </div>

            {/* Card 5: Observações Gerais */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <label style={{ fontWeight: 750, fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="fa-solid fa-comment-medical"></i>
                </div>
                Observações Clínicas Gerais
              </label>
              <FastTextarea
                className="form-control"
                rows={3}
                placeholder="Anotações adicionais de acompanhamento..."
                value={observacoes}
                onChange={val => setObservacoes(val)}
                style={{ width: '100%', background: 'var(--bg-darker)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px', fontSize: '0.88rem', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px 28px',
                  fontWeight: 750,
                  fontSize: '0.95rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  touchAction: 'manipulation',
                  width: '100%',
                  justifyContent: 'center'
                }}
              >
                {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                Salvar Dados Clínicos
              </button>
            </div>
          </form>
        ) : (
          <div style={{
            background: 'var(--bg-card)',
            border: '1.5px dashed var(--border-color)',
            borderRadius: '16px',
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--text-dim)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              margin: '0 auto 16px'
            }}>
              <i className="fa-solid fa-arrow-pointer"></i>
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 750 }}>
              Selecione um aluno
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '340px', marginInline: 'auto' }}>
              Escolha um aluno na lista ao lado para visualizar e registrar seu prontuário e histórico clínico.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
