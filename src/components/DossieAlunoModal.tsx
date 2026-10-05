'use client';

import React, { useState } from 'react';
import { downloadAssessmentPDF } from '@/utils/pdfGenerator';

interface DossieAlunoModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: any;
  appointments?: any[];
  assessments?: any[];
  strengthTests?: any[];
  onOpenWorkoutEditor?: (client: any) => void;
  isAdmin?: boolean;
}

const SERVICOS_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  'Treino Monitorado': { icon: 'fa-dumbbell', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  'Terapia Manual': { icon: 'fa-hands', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
  'Atendimento Individual': { icon: 'fa-user-doctor', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)' },
  'Treino Livre': { icon: 'fa-person-running', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  'Outro': { icon: 'fa-pen-to-square', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' }
};

export default function DossieAlunoModal({
  isOpen,
  onClose,
  client,
  appointments = [],
  assessments = [],
  strengthTests = [],
  onOpenWorkoutEditor,
  isAdmin = false
}: DossieAlunoModalProps) {
  const [activeDossieTab, setActiveDossieTab] = useState<'rotina' | 'clinico' | 'avaliacoes' | 'presencas'>('rotina');

  if (!isOpen || !client) return null;

  const planName = client?.dadosComerciais?.planoId?.nome || 'Personalizado';
  const contractFrequency: number = client?.contratosAtivos?.[0]?.frequencia || client?.dadosComerciais?.frequencia || 3;
  const rotinaDias: any[] = client?.rotinaSemanal?.dias || [];
  const rotinaObsGerais = client?.rotinaSemanal?.observacoesGerais || '';

  const clientAssessments = assessments.filter(as => {
    const cid = as.clienteId?._id || as.clienteId;
    return cid === client._id;
  });

  const clientStrengthTests = strengthTests.filter(st => {
    const cid = st.clienteId?._id || st.clienteId;
    return cid === client._id;
  });

  const clientAppointments = appointments.filter(a => {
    const cid = a.clienteId?._id || a.clienteId;
    return cid === client._id;
  }).sort((a, b) => (b.data || '').localeCompare(a.data || ''));

  const initials = (client.dadosPessoais?.nome || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n: string) => n[0].toUpperCase())
    .join('');

  return (
    <div className="modal-overlay" style={{ display: 'flex', zIndex: 1100 }} onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '960px', 
          width: '95%', 
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          borderRadius: '20px',
          background: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }}
      >
        {/* Header do Aluno */}
        <div style={{
          padding: '24px 28px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.4) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Avatar */}
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(13, 148, 136, 0.35))',
              border: '1.5px solid rgba(16, 185, 129, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              fontWeight: 900,
              color: '#10b981',
              flexShrink: 0
            }}>
              {initials}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                  {client.dadosPessoais?.nome}
                </h2>
                <span style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700
                }}>
                  {planName}
                </span>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#10b981',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 700
                }}>
                  {contractFrequency}x na semana
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '6px', fontSize: '0.80rem', color: '#94a3b8' }}>
                {client.dadosPessoais?.telefone && (
                  <span><i className="fa-solid fa-phone" style={{ marginRight: '5px' }}></i>{client.dadosPessoais?.telefone}</span>
                )}
                {client.dadosPessoais?.email && (
                  <span><i className="fa-solid fa-envelope" style={{ marginRight: '5px' }}></i>{client.dadosPessoais?.email}</span>
                )}
                {client.profissionalId?.nome && (
                  <span style={{ color: '#c084fc' }}>
                    <i className="fa-solid fa-user-doctor" style={{ marginRight: '5px' }}></i>
                    Prof. Responsável: <strong>{client.profissionalId?.nome}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {onOpenWorkoutEditor && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  onClose();
                  onOpenWorkoutEditor(client);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#f8fafc',
                  padding: '8px 14px',
                  borderRadius: '9px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <i className="fa-solid fa-dumbbell" style={{ color: '#10b981' }}></i>
                <span>Ficha de Treino</span>
              </button>
            )}

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
        </div>

        {/* Abas de Navegação do Dossiê */}
        <div style={{
          padding: '10px 28px',
          background: 'rgba(15, 23, 42, 0.9)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto'
        }}>
          <button
            type="button"
            onClick={() => setActiveDossieTab('rotina')}
            style={{
              padding: '8px 16px',
              borderRadius: '9px',
              border: 'none',
              background: activeDossieTab === 'rotina' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: activeDossieTab === 'rotina' ? '#10b981' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderBottom: activeDossieTab === 'rotina' ? '2px solid #10b981' : '2px solid transparent',
              transition: 'all 0.2s ease'
            }}
          >
            <i className="fa-solid fa-calendar-week"></i>
            <span>Planejamento Semanal ({contractFrequency}x)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDossieTab('clinico')}
            style={{
              padding: '8px 16px',
              borderRadius: '9px',
              border: 'none',
              background: activeDossieTab === 'clinico' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: activeDossieTab === 'clinico' ? '#38bdf8' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderBottom: activeDossieTab === 'clinico' ? '2px solid #38bdf8' : '2px solid transparent',
              transition: 'all 0.2s ease'
            }}
          >
            <i className="fa-solid fa-notes-medical"></i>
            <span>Dados Clínicos & Restrições</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDossieTab('avaliacoes')}
            style={{
              padding: '8px 16px',
              borderRadius: '9px',
              border: 'none',
              background: activeDossieTab === 'avaliacoes' ? 'rgba(192, 132, 252, 0.15)' : 'transparent',
              color: activeDossieTab === 'avaliacoes' ? '#c084fc' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderBottom: activeDossieTab === 'avaliacoes' ? '2px solid #c084fc' : '2px solid transparent',
              transition: 'all 0.2s ease'
            }}
          >
            <i className="fa-solid fa-heartbeat"></i>
            <span>Avaliações & Testes ({clientAssessments.length + clientStrengthTests.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDossieTab('presencas')}
            style={{
              padding: '8px 16px',
              borderRadius: '9px',
              border: 'none',
              background: activeDossieTab === 'presencas' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              color: activeDossieTab === 'presencas' ? '#f59e0b' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderBottom: activeDossieTab === 'presencas' ? '2px solid #f59e0b' : '2px solid transparent',
              transition: 'all 0.2s ease'
            }}
          >
            <i className="fa-solid fa-clipboard-check"></i>
            <span>Presenças & Atendimentos</span>
          </button>
        </div>

        {/* Conteúdo da Aba */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
          {/* ================= ABA 1: PLANEJAMENTO SEMANAL ================= */}
          {activeDossieTab === 'rotina' && (
            <div>
              {/* Card de Frequência Contratual */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(13, 148, 136, 0.05) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '16px',
                padding: '20px 22px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem'
                    }}>
                      <i className="fa-solid fa-calendar-check"></i>
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                        Frequência Semanal Contratada: {contractFrequency}x na semana
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.80rem', color: '#94a3b8' }}>
                        Definida formalmente em Gestão de Contratos. Cada dia representa uma unidade de atendimento.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grade de Dias e Serviços */}
              <h4 style={{ fontSize: '0.90rem', fontWeight: 800, color: '#f8fafc', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Serviços Planejados por Sessão / Dia:
              </h4>

              {rotinaDias.length === 0 ? (
                <div style={{
                  background: 'rgba(30, 41, 59, 0.4)',
                  border: '1.5px dashed rgba(245, 158, 11, 0.4)',
                  borderRadius: '14px',
                  padding: '28px 20px',
                  textAlign: 'center'
                }}>
                  <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '2rem', color: '#f59e0b', marginBottom: '10px', display: 'block' }}></i>
                  <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 750, color: '#f8fafc' }}>
                    Planejamento Semanal ainda não detalhado
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8', maxWidth: '500px', marginInline: 'auto' }}>
                    O aluno possui contrato ativo de <strong>{contractFrequency}x/semana</strong>. O administrador ou coordenação deve designar o serviço específico de cada dia na tela de Vincular Alunos.
                  </p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '14px',
                  marginBottom: '20px'
                }}>
                  {rotinaDias.slice(0, contractFrequency).map((dia, idx) => {
                    const servicoInfo = SERVICOS_ICONS[dia.servico] || SERVICOS_ICONS['Treino Monitorado'];
                    const profNome = dia.profissionalId?.nome || (client.profissionalId?.nome ? `${client.profissionalId.nome} (Principal)` : 'Equipe da Academia');

                    return (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(30, 41, 59, 0.55)',
                          border: `1.5px solid ${servicoInfo.color}44`,
                          borderRadius: '14px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '12px',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
                        }}
                      >
                        <div>
                          {/* Top Tag do Dia */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{
                              background: servicoInfo.color,
                              color: '#0f172a',
                              fontWeight: 900,
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              textTransform: 'uppercase'
                            }}>
                              Dia {dia.diaNumero || idx + 1}
                            </span>
                            {dia.diaSemanaSugestao && (
                              <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>
                                <i className="fa-regular fa-calendar" style={{ marginRight: '4px' }}></i>
                                {dia.diaSemanaSugestao}
                              </span>
                            )}
                          </div>

                          {/* Nome do Serviço */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: servicoInfo.bg,
                              color: servicoInfo.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.95rem'
                            }}>
                              <i className={`fa-solid ${servicoInfo.icon}`}></i>
                            </div>
                            <div>
                              <strong style={{ fontSize: '0.94rem', color: '#f8fafc', display: 'block' }}>
                                {dia.servico === 'Outro' && dia.servicoCustom ? dia.servicoCustom : dia.servico}
                              </strong>
                              <span style={{ fontSize: '0.72rem', color: servicoInfo.color, fontWeight: 700 }}>
                                Serviço Planejado
                              </span>
                            </div>
                          </div>

                          {/* Profissional Designado */}
                          <div style={{
                            background: 'rgba(15, 23, 42, 0.5)',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            color: '#e2e8f0',
                            marginTop: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                          }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.72rem', display: 'block', fontWeight: 600 }}>Profissional:</span>
                            <i className="fa-solid fa-user-doctor" style={{ color: '#c084fc', marginRight: '6px' }}></i>
                            <strong>{profNome}</strong>
                          </div>
                        </div>

                        {/* Foco e Observações do Dia */}
                        {dia.observacoes && (
                          <div style={{
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                            paddingTop: '8px',
                            fontSize: '0.76rem',
                            color: '#94a3b8'
                          }}>
                            <strong style={{ color: '#cbd5e1', display: 'block', marginBottom: '2px' }}>Foco do Dia:</strong>
                            <span style={{ color: '#f1f5f9' }}>{dia.observacoes}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Box de Orientações Gerais */}
              {rotinaObsGerais && (
                <div style={{
                  background: 'rgba(30, 41, 59, 0.45)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '16px 20px',
                  marginTop: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <i className="fa-solid fa-notes-medical" style={{ color: '#10b981' }}></i>
                    <strong style={{ fontSize: '0.85rem', color: '#f8fafc' }}>Orientações Gerais da Equipe:</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                    {rotinaObsGerais}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ================= ABA 2: DADOS CLÍNICOS ================= */}
          {activeDossieTab === 'clinico' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.45)', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <strong style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <i className="fa-solid fa-triangle-exclamation"></i> Lesões Diagnosticadas
                </strong>
                <p style={{ margin: '6px 0 0', color: '#e2e8f0', fontSize: '0.84rem' }}>
                  {client.dadosClinicos?.lesoes || 'Nenhuma lesão informada.'}
                </p>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.45)', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <strong style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <i className="fa-solid fa-ban"></i> Restrições de Exercícios / Movimentos
                </strong>
                <p style={{ margin: '6px 0 0', color: '#e2e8f0', fontSize: '0.84rem' }}>
                  {client.dadosClinicos?.restricoes || 'Nenhuma restrição informada.'}
                </p>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.45)', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <strong style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <i className="fa-solid fa-pills"></i> Medicamentos em Uso
                </strong>
                <p style={{ margin: '6px 0 0', color: '#e2e8f0', fontSize: '0.84rem' }}>
                  {client.dadosClinicos?.medicamentos || 'Nenhum medicamento informado.'}
                </p>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.45)', padding: '16px 20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <strong style={{ color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                  <i className="fa-solid fa-book-medical"></i> Histórico Clínico & Cirurgias
                </strong>
                <p style={{ margin: '6px 0 0', color: '#e2e8f0', fontSize: '0.84rem' }}>
                  {client.dadosClinicos?.historicoClinico || 'Nenhum histórico clínico informado.'}
                </p>
              </div>
            </div>
          )}

          {/* ================= ABA 3: AVALIAÇÕES & TESTES ================= */}
          {activeDossieTab === 'avaliacoes' && (
            <div>
              <h4 style={{ color: '#10b981', marginBottom: '12px', fontSize: '0.90rem', fontWeight: 800 }}>Avaliações Físicas</h4>
              <div className="table-responsive" style={{ marginBottom: '24px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Gordura Corporal</th>
                      <th>IMC</th>
                      {isAdmin && <th>Avaliador</th>}
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientAssessments.length === 0 ? (
                      <tr><td colSpan={isAdmin ? 5 : 4} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '14px' }}>Nenhuma avaliação física cadastrada.</td></tr>
                    ) : (
                      clientAssessments.map(as => {
                        const fatText = as.resultadosCalculados?.percentualGordura ? `${Number(as.resultadosCalculados.percentualGordura).toFixed(1)}%` : '-';
                        const imcText = as.resultadosCalculados?.imc ? `${Number(as.resultadosCalculados.imc).toFixed(1)}` : '-';

                        return (
                          <tr key={as._id}>
                            <td>{as.data}</td>
                            <td>{fatText}</td>
                            <td>{imcText}</td>
                            {isAdmin && <td>{as.avaliadorId?.nome || '-'}</td>}
                            <td>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={async () => {
                                  try {
                                    await downloadAssessmentPDF(as, assessments);
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }}
                              >
                                <i className="fa-solid fa-file-pdf"></i> Laudo PDF
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <h4 style={{ color: '#c084fc', marginBottom: '12px', fontSize: '0.90rem', fontWeight: 800 }}>Testes de Força (Dinamometria)</h4>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Membro / Teste</th>
                      <th>Carga Máxima</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientStrengthTests.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '14px' }}>Nenhum teste de força registrado.</td></tr>
                    ) : (
                      clientStrengthTests.map(st => (
                        <tr key={st._id}>
                          <td>{st.data}</td>
                          <td>{st.exercicio || st.tipo || 'Geral'}</td>
                          <td><strong>{st.cargaMaxima || st.valor || '-'} kg</strong></td>
                          <td><span style={{ color: '#10b981' }}>Concluído</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= ABA 4: PRESENÇAS & ATENDIMENTOS ================= */}
          {activeDossieTab === 'presencas' && (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Horário</th>
                    <th>Serviço Realizado</th>
                    <th>Profissional</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clientAppointments.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '16px' }}>Nenhum registro de atendimento encontrado.</td></tr>
                  ) : (
                    clientAppointments.slice(0, 30).map(a => (
                      <tr key={a._id}>
                        <td>{a.data}</td>
                        <td>{a.horario}</td>
                        <td><strong>{a.servico}</strong></td>
                        <td>{a.profissionalId?.nome || 'Equipe'}</td>
                        <td>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            background: a.status === 'presenca' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                            color: a.status === 'presenca' ? '#10b981' : '#94a3b8'
                          }}>
                            {a.status === 'presenca' ? 'Presente' : (a.status === 'falta' ? 'Falta' : a.status)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.7)',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{
              padding: '9px 20px',
              borderRadius: '9px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Fechar Dossiê
          </button>
        </div>
      </div>
    </div>
  );
}
