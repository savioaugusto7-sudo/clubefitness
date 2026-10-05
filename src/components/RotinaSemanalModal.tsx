'use client';

import React, { useState, useEffect } from 'react';

interface RotinaDia {
  diaNumero: number;
  diaSemanaSugestao?: string;
  servico: string;
  servicoCustom?: string;
  profissionalId?: string | null;
  observacoes?: string;
}

interface RotinaSemanalModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: any;
  professionals: any[];
  onSaveSuccess: (updatedClient: any) => void;
}

const SERVICOS_VALIDOS = [
  { id: 'Treino Monitorado', label: 'Treino Monitorado', icon: 'fa-dumbbell', color: '#10b981' },
  { id: 'Terapia Manual', label: 'Terapia Manual', icon: 'fa-hands', color: '#38bdf8' },
  { id: 'Atendimento Individual', label: 'Atendimento Individual', icon: 'fa-user-doctor', color: '#a855f7' },
  { id: 'Treino Livre', label: 'Treino Livre', icon: 'fa-person-running', color: '#f59e0b' },
  { id: 'Outro', label: 'Outro (Personalizado)', icon: 'fa-pen-to-square', color: '#94a3b8' }
];

const DIAS_SEMANA_OPCOES = [
  'A combinar / Flexível',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

export default function RotinaSemanalModal({
  isOpen,
  onClose,
  client,
  professionals,
  onSaveSuccess
}: RotinaSemanalModalProps) {
  const [dias, setDias] = useState<RotinaDia[]>([]);
  const [observacoesGerais, setObservacoesGerais] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. A frequência semanal é obrigatoriamente obtida de Gestão de Contratos
  const contractFrequency: number = Math.max(
    1,
    client?.contratosAtivos?.[0]?.frequencia ||
    client?.dadosComerciais?.frequencia ||
    3
  );

  const defaultProfId = client?.profissionalId?._id || client?.profissionalId || '';

  // 2. Inicializa os dias com base na frequência contratual
  useEffect(() => {
    if (!isOpen || !client) return;

    setErrorMsg('');
    setSuccessMsg('');
    setObservacoesGerais(client?.rotinaSemanal?.observacoesGerais || '');

    const existingDias: any[] = client?.rotinaSemanal?.dias || [];
    const initialDias: RotinaDia[] = [];

    for (let i = 0; i < contractFrequency; i++) {
      const diaNum = i + 1;
      const existing = existingDias.find((d: any) => d.diaNumero === diaNum) || existingDias[i];

      if (existing) {
        initialDias.push({
          diaNumero: diaNum,
          diaSemanaSugestao: existing.diaSemanaSugestao || '',
          servico: existing.servico || 'Treino Monitorado',
          servicoCustom: existing.servicoCustom || '',
          profissionalId: existing.profissionalId?._id || existing.profissionalId || defaultProfId,
          observacoes: existing.observacoes || ''
        });
      } else {
        initialDias.push({
          diaNumero: diaNum,
          diaSemanaSugestao: '',
          servico: 'Treino Monitorado',
          servicoCustom: '',
          profissionalId: defaultProfId,
          observacoes: ''
        });
      }
    }

    setDias(initialDias);
  }, [isOpen, client, contractFrequency, defaultProfId]);

  if (!isOpen || !client) return null;

  const planName = client?.dadosComerciais?.planoId?.nome || 'Personalizado';

  // Manipuladores de alteração de campo de um dia
  const handleUpdateDia = (index: number, field: keyof RotinaDia, value: any) => {
    setDias(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Presets Rápidos
  const applyPresetAllMonitorado = () => {
    setDias(prev => prev.map(d => ({
      ...d,
      servico: 'Treino Monitorado',
      servicoCustom: ''
    })));
  };

  const applyPresetMonitoradoAndManual = () => {
    setDias(prev => prev.map((d, idx) => {
      const isLast = idx === prev.length - 1;
      return {
        ...d,
        servico: isLast ? 'Terapia Manual' : 'Treino Monitorado',
        servicoCustom: ''
      };
    }));
  };

  const applyPresetMonitoradoAndIndividual = () => {
    setDias(prev => prev.map((d, idx) => {
      const isLast = idx === prev.length - 1;
      return {
        ...d,
        servico: isLast ? 'Atendimento Individual' : 'Treino Monitorado',
        servicoCustom: ''
      };
    }));
  };

  // Submissão do Formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSaving(true);

    try {
      const payload = {
        id: client._id,
        rotinaSemanal: {
          dias: dias.map((d, idx) => ({
            diaNumero: idx + 1,
            diaSemanaSugestao: d.diaSemanaSugestao || '',
            servico: d.servico,
            servicoCustom: d.servico === 'Outro' ? (d.servicoCustom || '') : '',
            profissionalId: d.profissionalId || null,
            observacoes: d.observacoes || ''
          })),
          observacoesGerais: observacoesGerais.trim()
        }
      };

      const res = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Planejamento semanal salvo com sucesso!');
        if (onSaveSuccess) {
          onSaveSuccess(data.data || { ...client, rotinaSemanal: payload.rotinaSemanal });
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg(data.error || 'Erro ao salvar planejamento semanal.');
      }
    } catch (err: any) {
      setErrorMsg('Erro de comunicação ao salvar: ' + (err.message || 'Erro inesperado'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ display: 'flex', zIndex: 1100 }} onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '860px', 
          width: '95%', 
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          borderRadius: '20px',
          background: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.4) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem'
              }}>
                <i className="fa-solid fa-calendar-check"></i>
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                  Planejamento Semanal de Serviços
                </h2>
                <div style={{ fontSize: '0.84rem', color: '#94a3b8', marginTop: '2px' }}>
                  Aluno: <strong style={{ color: '#f8fafc' }}>{client.dadosPessoais?.nome}</strong> • Plano: <span style={{ color: '#38bdf8' }}>{planName}</span>
                </div>
              </div>
            </div>

            {/* Banner de Frequência Contratual Fixa */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '14px',
              padding: '6px 14px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              fontSize: '0.82rem',
              fontWeight: 700
            }}>
              <i className="fa-solid fa-file-contract"></i>
              <span>Frequência Contratada em Gestão de Contratos:</span>
              <span style={{ 
                background: '#10b981', 
                color: '#0f172a', 
                padding: '2px 8px', 
                borderRadius: '6px', 
                fontSize: '0.82rem', 
                fontWeight: 900 
              }}>
                {contractFrequency}x na semana
              </span>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            className="modal-close" 
            style={{ 
              background: 'rgba(255, 255, 255, 0.06)', 
              border: 'none', 
              color: '#94a3b8', 
              fontSize: '1.2rem', 
              cursor: 'pointer',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            &times;
          </button>
        </div>

        {/* Body com Scroll */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
          {errorMsg && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#f87171',
              marginBottom: '16px',
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#34d399',
              marginBottom: '16px',
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fa-solid fa-circle-check"></i>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Barra de Presets Rápidos */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '20px',
            padding: '12px 16px',
            borderRadius: '12px',
            background: 'rgba(30, 41, 59, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <i className="fa-solid fa-bolt" style={{ color: '#f59e0b', marginRight: '6px' }}></i>
              Preenchimento Rápido:
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={applyPresetAllMonitorado}
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#10b981',
                  borderRadius: '7px',
                  padding: '5px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                100% Monitorado
              </button>
              {contractFrequency >= 2 && (
                <button
                  type="button"
                  onClick={applyPresetMonitoradoAndManual}
                  style={{
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8',
                    borderRadius: '7px',
                    padding: '5px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Monitorado + Terapia Manual
                </button>
              )}
              {contractFrequency >= 2 && (
                <button
                  type="button"
                  onClick={applyPresetMonitoradoAndIndividual}
                  style={{
                    background: 'rgba(168, 85, 247, 0.1)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    color: '#c084fc',
                    borderRadius: '7px',
                    padding: '5px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Monitorado + Atendimento Individual
                </button>
              )}
            </div>
          </div>

          {/* Cards Modulares de Cada Dia (Gerados exatamente com a quantidade contratual) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {dias.map((dia, idx) => {
              const currentServico = SERVICOS_VALIDOS.find(s => s.id === dia.servico) || SERVICOS_VALIDOS[0];

              return (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(30, 41, 59, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '18px 20px',
                    transition: 'border-color 0.2s ease',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)'
                  }}
                >
                  {/* Cabeçalho do Card do Dia */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '14px',
                    paddingBottom: '10px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        background: currentServico.color,
                        color: '#0f172a',
                        fontWeight: 900,
                        fontSize: '0.75rem',
                        padding: '3px 9px',
                        borderRadius: '6px',
                        textTransform: 'uppercase'
                      }}>
                        Dia {dia.diaNumero}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                        Sessão {dia.diaNumero} de {contractFrequency}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className={`fa-solid ${currentServico.icon}`} style={{ color: currentServico.color, fontSize: '0.9rem' }}></i>
                      <span style={{ fontSize: '0.80rem', fontWeight: 600, color: currentServico.color }}>
                        {dia.servico === 'Outro' && dia.servicoCustom ? dia.servicoCustom : currentServico.label}
                      </span>
                    </div>
                  </div>

                  {/* Campos do Dia */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                    gap: '14px'
                  }}>
                    {/* Campo 1: Tipo de Serviço */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                        Serviço Planejado:
                      </label>
                      <select
                        value={dia.servico}
                        onChange={e => handleUpdateDia(idx, 'servico', e.target.value)}
                        className="form-control"
                        style={{
                          width: '100%',
                          background: 'rgba(15, 23, 42, 0.8)',
                          color: '#f8fafc',
                          borderColor: 'rgba(255, 255, 255, 0.12)',
                          fontSize: '0.84rem',
                          borderRadius: '8px',
                          padding: '8px 10px'
                        }}
                      >
                        {SERVICOS_VALIDOS.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Campo 1.1: Se 'Outro', campo de texto */}
                    {dia.servico === 'Outro' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#f59e0b', marginBottom: '6px' }}>
                          Especifique o Serviço:
                        </label>
                        <input
                          type="text"
                          value={dia.servicoCustom || ''}
                          onChange={e => handleUpdateDia(idx, 'servicoCustom', e.target.value)}
                          placeholder="Ex: Treino Cardiorrespiratório..."
                          style={{
                            width: '100%',
                            background: 'rgba(15, 23, 42, 0.8)',
                            color: '#f8fafc',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            fontSize: '0.84rem',
                            borderRadius: '8px',
                            padding: '8px 10px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    )}

                    {/* Campo 2: Profissional Designado */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                        Profissional Designado:
                      </label>
                      <select
                        value={dia.profissionalId || ''}
                        onChange={e => handleUpdateDia(idx, 'profissionalId', e.target.value)}
                        className="form-control"
                        style={{
                          width: '100%',
                          background: 'rgba(15, 23, 42, 0.8)',
                          color: '#f8fafc',
                          borderColor: 'rgba(255, 255, 255, 0.12)',
                          fontSize: '0.84rem',
                          borderRadius: '8px',
                          padding: '8px 10px'
                        }}
                      >
                        <option value="">Equipe Geral / Responsável do Aluno</option>
                        {professionals.map(p => (
                          <option key={p._id} value={p._id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Campo 3: Dia da Semana Sugerido (Opcional) */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                        Dia Sugerido da Semana:
                      </label>
                      <select
                        value={dia.diaSemanaSugestao || ''}
                        onChange={e => handleUpdateDia(idx, 'diaSemanaSugestao', e.target.value)}
                        className="form-control"
                        style={{
                          width: '100%',
                          background: 'rgba(15, 23, 42, 0.8)',
                          color: '#f8fafc',
                          borderColor: 'rgba(255, 255, 255, 0.12)',
                          fontSize: '0.84rem',
                          borderRadius: '8px',
                          padding: '8px 10px'
                        }}
                      >
                        <option value="">A combinar / Flexível</option>
                        {DIAS_SEMANA_OPCOES.slice(1).map(d => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Campo 4: Observações e Foco Clínico do Dia */}
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                      Foco Técnico / Observações para este dia:
                    </label>
                    <input
                      type="text"
                      value={dia.observacoes || ''}
                      onChange={e => handleUpdateDia(idx, 'observacoes', e.target.value)}
                      placeholder="Ex: Foco em membros inferiores e reabilitação do joelho; Ficha A..."
                      style={{
                        width: '100%',
                        background: 'rgba(15, 23, 42, 0.6)',
                        color: '#f8fafc',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        fontSize: '0.80rem',
                        borderRadius: '8px',
                        padding: '7px 10px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Observações Gerais da Rotina */}
          <div style={{ marginTop: '22px' }}>
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
              <i className="fa-solid fa-notes-medical" style={{ color: '#10b981', marginRight: '6px' }}></i>
              Instruções Gerais para os Profissionais:
            </label>
            <textarea
              rows={3}
              value={observacoesGerais}
              onChange={e => setObservacoesGerais(e.target.value)}
              placeholder="Orientações globais para todos os professores e fisioterapeutas que atenderem este aluno..."
              style={{
                width: '100%',
                background: 'rgba(30, 41, 59, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '10px 12px',
                color: '#f8fafc',
                fontSize: '0.84rem',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.7)',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '12px'
        }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '9px 18px',
              borderRadius: '9px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #0d9488 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '9px 22px',
              borderRadius: '9px',
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
            }}
          >
            {saving ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i>
                <span>Salvando Planejamento...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-check"></i>
                <span>Salvar Planejamento</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
