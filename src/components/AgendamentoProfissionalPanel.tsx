'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { smartSearchMatch } from '@/utils/smartSearch';

interface ClientInfo {
  _id: string;
  dadosPessoais?: {
    nome?: string;
    email?: string;
    cpf?: string;
    telefone?: string;
  };
  nome?: string;
  email?: string;
  cpf?: string;
  telefone?: string;
  dadosComerciais?: {
    planoId?: any;
    status?: string;
    creditosTotal?: number;
    creditosUsados?: number;
    creditosReservados?: number;
    creditosMassagemTotal?: number;
    creditosMassagemUsados?: number;
    creditosEmergenciaTotal?: number;
    creditosEmergenciaUsados?: number;
  };
  planoNome?: string;
}

interface ProfessionalInfo {
  _id: string;
  nome: string;
  especialidade?: string;
}

interface SlotInfo {
  horario: string;
  capacidade: number;
  tipo: 'academia' | 'consultorio';
  vagasOcupadas: number;
  appointments?: any[];
}

interface AgendamentoProfissionalPanelProps {
  clients: ClientInfo[];
  professionals: ProfessionalInfo[];
  currentProfessionalId?: string;
  onSuccess?: () => void;
}

interface ServiceOption {
  id: string;
  nome: string;
  vagasNecessarias: number;
  icone: string;
  cor: string;
  descricao: string;
  tipoCredito: 'academia' | 'massagem' | 'emergencia' | 'nenhum';
}

const SERVICOS_DISPONIVEIS: ServiceOption[] = [
  {
    id: 'avaliacao_fisica',
    nome: 'Avaliação Física',
    vagasNecessarias: 3,
    icone: 'fa-heart-pulse',
    cor: '#38bdf8',
    descricao: 'Antropometria e bioimpedância',
    tipoCredito: 'academia'
  },
  {
    id: 'teste_forca',
    nome: 'Teste de Força',
    vagasNecessarias: 3,
    icone: 'fa-bolt-lightning',
    cor: '#f59e0b',
    descricao: 'Dinamometria e potência',
    tipoCredito: 'academia'
  },
  {
    id: 'avaliacao_fisioterapica',
    nome: 'Avaliação Fisioterápica',
    vagasNecessarias: 3,
    icone: 'fa-user-doctor',
    cor: '#10b981',
    descricao: 'Diagnóstico cinesiológico',
    tipoCredito: 'academia'
  },
  {
    id: 'emergencia',
    nome: 'Emergência',
    vagasNecessarias: 3,
    icone: 'fa-truck-medical',
    cor: '#f43f5e',
    descricao: 'Atendimento prioritário',
    tipoCredito: 'emergencia'
  },
  {
    id: 'terapia_manual',
    nome: 'Terapia Manual',
    vagasNecessarias: 3,
    icone: 'fa-hand-sparkles',
    cor: '#a855f7',
    descricao: 'Liberação e alívio de dor',
    tipoCredito: 'academia'
  },
  {
    id: 'recovery',
    nome: 'Recovery',
    vagasNecessarias: 1,
    icone: 'fa-snowflake',
    cor: '#06b6d4',
    descricao: 'Botas e recuperação',
    tipoCredito: 'nenhum'
  },
  {
    id: 'treino_monitorado',
    nome: 'Treino Monitorado',
    vagasNecessarias: 1,
    icone: 'fa-dumbbell',
    cor: '#22c55e',
    descricao: 'Treinamento guiado',
    tipoCredito: 'academia'
  },
  {
    id: 'treino_livre',
    nome: 'Treino Livre',
    vagasNecessarias: 0,
    icone: 'fa-person-running',
    cor: '#818cf8',
    descricao: 'Treino autônomo',
    tipoCredito: 'nenhum'
  }
];

export default function AgendamentoProfissionalPanel({
  clients,
  professionals,
  currentProfessionalId,
  onSuccess
}: AgendamentoProfissionalPanelProps) {
  // Etapa 1: Aluno
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientInfo | null>(null);

  // Etapa 2: Serviço
  const [selectedService, setSelectedService] = useState<ServiceOption>(SERVICOS_DISPONIVEIS[0]);

  // Etapa 3: Data
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Etapa 4: Horário
  const [selectedHour, setSelectedHour] = useState<string>('');
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Etapa 5: Profissional e Observações
  const [selectedProfId, setSelectedProfId] = useState<string>(currentProfessionalId || '');
  const [observacoes, setObservacoes] = useState('');

  // Status de Submissão & Feedback
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);

  useEffect(() => {
    if (currentProfessionalId && !selectedProfId) {
      setSelectedProfId(currentProfessionalId);
    }
  }, [currentProfessionalId, selectedProfId]);

  // Alunos filtrados pela busca multi-termos
  const filteredStudents = useMemo(() => {
    if (!searchStudent.trim()) return [];
    return clients
      .filter(c => {
        const planName = c.dadosComerciais?.planoId?.nome || c.planoNome || 'Plano';
        return smartSearchMatch(searchStudent, [
          c.dadosPessoais?.nome || c.nome,
          c.dadosPessoais?.cpf || c.cpf,
          c.dadosPessoais?.email || c.email,
          c.dadosPessoais?.telefone || c.telefone,
          planName
        ]);
      })
      .slice(0, 8);
  }, [clients, searchStudent]);

  // Carregar slots da data selecionada
  useEffect(() => {
    if (!selectedDate) return;
    let isMounted = true;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      setSelectedHour('');
      try {
        const res = await fetch(`/api/appointments/slots?date=${selectedDate}&tipo=academia`);
        const json = await res.json();
        if (isMounted && json.success) {
          setSlots(json.data || []);
        }
      } catch (err) {
        console.error('Erro ao carregar slots:', err);
      } finally {
        if (isMounted) setLoadingSlots(false);
      }
    };

    fetchSlots();
    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  // Filtrar horários de acordo com a quantidade de vagas necessárias do serviço selecionado
  const availableSlots = useMemo(() => {
    const requiredVagas = selectedService.vagasNecessarias;
    return slots.map(slot => {
      const vagasLivres = Math.max(0, slot.capacidade - slot.vagasOcupadas);
      const isAvailable = requiredVagas === 0 ? vagasLivres >= 0 : vagasLivres >= requiredVagas;
      return {
        ...slot,
        vagasLivres,
        isAvailable
      };
    });
  }, [slots, selectedService]);

  const validSlotsCount = useMemo(() => {
    return availableSlots.filter(s => s.isAvailable).length;
  }, [availableSlots]);

  // Helper para formatar data em Português
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    const dayName = dt.toLocaleDateString('pt-BR', { weekday: 'long' });
    const capDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    return `${d}/${m}/${y} (${capDayName})`;
  };

  const handleSelectClient = (c: ClientInfo) => {
    setSelectedClient(c);
    setSearchStudent('');
  };

  const handleSubmitAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) {
      setFeedback({ text: 'Por favor, selecione o aluno primeiro.', type: 'danger' });
      return;
    }
    if (!selectedService) {
      setFeedback({ text: 'Por favor, selecione o tipo de serviço.', type: 'danger' });
      return;
    }
    if (!selectedDate || !selectedHour) {
      setFeedback({ text: 'Por favor, selecione a data e o horário desejado.', type: 'danger' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        clienteId: selectedClient._id,
        profissionalId: selectedProfId || professionals[0]?._id || '',
        servico: selectedService.nome,
        data: selectedDate,
        horario: selectedHour,
        tipo: 'academia',
        observacoes: observacoes.trim() || undefined,
        status: 'agendado'
      };

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          text: `Agendamento de ${selectedService.nome} para ${selectedClient.dadosPessoais?.nome || selectedClient.nome} em ${formatDateDisplay(selectedDate)} às ${selectedHour} realizado com sucesso!`,
          type: 'success'
        });
        setSelectedHour('');
        setObservacoes('');
        if (onSuccess) onSuccess();
      } else {
        setFeedback({ text: data.error || 'Erro ao realizar agendamento.', type: 'danger' });
      }
    } catch (err: any) {
      setFeedback({ text: 'Erro de conexão: ' + err.message, type: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  // Resumo de créditos do aluno
  const com = selectedClient?.dadosComerciais || {};
  const credTotal = com.creditosTotal || 0;
  const credUsados = com.creditosUsados || 0;
  const credReservados = com.creditosReservados || 0;
  const credRestantes = Math.max(0, credTotal - credUsados - credReservados);

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Toast Notification */}
      {feedback && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 99999,
          padding: '16px 24px',
          borderRadius: '12px',
          background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '0.92rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'fadeIn 0.3s ease'
        }}>
          <i className={feedback.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation'} style={{ fontSize: '1.2rem' }}></i>
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '8px', fontSize: '1rem' }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(20, 30, 48, 0.9) 0%, rgba(10, 17, 30, 0.95) 100%)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <i className="fa-solid fa-calendar-plus"></i> AGENDAMENTO DIRETO
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>• Painel do Profissional</span>
            </div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Lançar Agendamento de Aluno
            </h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              Agende sessões, testes e avaliações com verificação de capacidade e vagas livres em tempo real.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmitAppointment}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          
          {/* ══════════════════════════════════════════════════════════════
              PASSO 1: SELEÇÃO DO ALUNO
              ══════════════════════════════════════════════════════════════ */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '22px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.2)',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.9rem'
              }}>1</div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Selecionar Aluno</h3>
            </div>

            {!selectedClient ? (
              <div>
                <div style={{ position: 'relative', marginBottom: '12px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Digite o nome, CPF ou telefone do aluno..."
                    value={searchStudent}
                    onChange={e => setSearchStudent(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-darker)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '10px 14px 10px 38px',
                      outline: 'none',
                      fontSize: '0.9rem'
                    }}
                  />
                  <i className="fa-solid fa-magnifying-glass" style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem'
                  }}></i>
                </div>

                {filteredStudents.length > 0 && (
                  <div style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    background: 'var(--bg-darker)',
                    overflow: 'hidden',
                    maxHeight: '260px',
                    overflowY: 'auto'
                  }}>
                    {filteredStudents.map(c => (
                      <div
                        key={c._id}
                        onClick={() => handleSelectClient(c)}
                        style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                            {c.dadosPessoais?.nome || c.nome}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            CPF: {c.dadosPessoais?.cpf || c.cpf || '—'} • Tel: {c.dadosPessoais?.telefone || c.telefone || '—'}
                          </div>
                        </div>
                        <span style={{
                          fontSize: '0.72rem',
                          background: 'rgba(255,255,255,0.06)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          color: 'var(--text-muted)'
                        }}>
                          {c.dadosComerciais?.planoId?.nome || c.planoNome || 'Personalizado'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {searchStudent.trim().length > 0 && filteredStudents.length === 0 && (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Nenhum aluno encontrado para "{searchStudent}".
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: 'rgba(59, 130, 246, 0.06)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '12px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'rgba(59, 130, 246, 0.2)',
                      color: '#3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1.1rem'
                    }}>
                      {(selectedClient.dadosPessoais?.nome || selectedClient.nome || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                        {selectedClient.dadosPessoais?.nome || selectedClient.nome}
                      </h4>
                      <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        CPF: {selectedClient.dadosPessoais?.cpf || selectedClient.cpf || '—'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedClient(null)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    <i className="fa-solid fa-arrow-rotate-left"></i> Trocar
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.78rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Plano Atual:</span>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {selectedClient.dadosComerciais?.planoId?.nome || selectedClient.planoNome || 'Personalizado'}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Créditos Restantes:</span>
                    <div style={{ fontWeight: 700, color: credRestantes > 0 ? '#10b981' : '#ef4444' }}>
                      ⚡ {credRestantes} / {credTotal} créditos
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════
              PASSO 2: SELEÇÃO DO SERVIÇO
              ══════════════════════════════════════════════════════════════ */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '22px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(168, 85, 247, 0.2)',
                color: '#a855f7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.9rem'
              }}>2</div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Escolha o Serviço</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {SERVICOS_DISPONIVEIS.map(srv => {
                const isSelected = selectedService.id === srv.id;
                return (
                  <div
                    key={srv.id}
                    onClick={() => setSelectedService(srv)}
                    style={{
                      border: isSelected ? `2px solid ${srv.cor}` : '1px solid var(--border-color)',
                      background: isSelected 
                        ? `linear-gradient(145deg, ${srv.cor}18 0%, rgba(255, 255, 255, 0.02) 100%)` 
                        : 'var(--bg-darker)',
                      borderRadius: '12px',
                      padding: '14px 12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      boxShadow: isSelected ? `0 4px 20px ${srv.cor}35` : 'none',
                      transform: isSelected ? 'translateY(-2px)' : 'none'
                    }}
                  >
                    {/* Top Row: Icon + Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: isSelected ? `${srv.cor}25` : 'rgba(255, 255, 255, 0.04)',
                        border: `1px solid ${isSelected ? srv.cor : 'rgba(255, 255, 255, 0.08)'}`,
                        color: srv.cor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.05rem',
                        transition: 'all 0.2s ease'
                      }}>
                        <i className={`fa-solid ${srv.icone}`}></i>
                      </div>

                      <span style={{
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        color: isSelected ? srv.cor : 'var(--text-muted)',
                        background: isSelected ? `${srv.cor}18` : 'rgba(255, 255, 255, 0.04)',
                        border: `1px solid ${isSelected ? srv.cor + '40' : 'rgba(255, 255, 255, 0.06)'}`,
                        padding: '3px 7px',
                        borderRadius: '6px',
                        letterSpacing: '0.2px'
                      }}>
                        {srv.vagasNecessarias >= 3 ? '3 Vagas' : srv.vagasNecessarias === 1 ? '1 Vaga' : 'Livre'}
                      </span>
                    </div>

                    {/* Service Name & Subtitle */}
                    <div>
                      <div style={{
                        fontWeight: 750,
                        fontSize: '0.88rem',
                        color: isSelected ? '#ffffff' : 'var(--text-main)',
                        lineHeight: '1.25',
                        marginBottom: '3px'
                      }}>
                        {srv.nome}
                      </div>
                      <div style={{
                        fontSize: '0.7rem',
                        color: isSelected ? 'rgba(255,255,255,0.7)' : 'var(--text-dim)',
                        lineHeight: '1.2'
                      }}>
                        {srv.descricao}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════════
            PASSO 3 & 4: DATA E HORÁRIOS DISPONÍVEIS
            ══════════════════════════════════════════════════════════════ */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '22px',
          marginTop: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.9rem'
            }}>3</div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Data & Horários Disponíveis</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px', maxWidth: '280px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                <i className="fa-solid fa-calendar-days" style={{ marginRight: '6px', color: '#10b981' }}></i> Selecione o dia:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-darker)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  outline: 'none',
                  fontSize: '0.88rem'
                }}
              />
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-color)',
              padding: '10px 16px',
              borderRadius: '8px',
              flex: '2 1 300px'
            }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Regra de Vagas Aplicada:</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {selectedService.vagasNecessarias >= 3 ? (
                  <span style={{ color: '#f59e0b' }}>
                    <i className="fa-solid fa-filter" style={{ marginRight: '6px' }}></i>
                    Mostrando apenas horários com <strong>3 ou mais vagas livres</strong> (exigência de {selectedService.nome}).
                  </span>
                ) : (
                  <span style={{ color: '#10b981' }}>
                    <i className="fa-solid fa-check" style={{ marginRight: '6px' }}></i>
                    Mostrando horários com <strong>vagas disponíveis</strong> para {selectedService.nome}.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Grid de Horários */}
          {loadingSlots ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.4rem', marginRight: '8px' }}></i>
              Carregando disponibilidade de horários para {formatDateDisplay(selectedDate)}...
            </div>
          ) : (
            <div>
              {validSlotsCount === 0 ? (
                <div style={{
                  padding: '30px',
                  textAlign: 'center',
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '12px',
                  color: 'var(--text-muted)'
                }}>
                  <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '2rem', color: '#ef4444', marginBottom: '10px', display: 'block' }}></i>
                  <strong style={{ color: '#ef4444', display: 'block', marginBottom: '4px' }}>
                    Nenhum horário com capacidade suficiente ({selectedService.vagasNecessarias} vagas) encontrado nesta data.
                  </strong>
                  <span>Por favor, selecione outra data acima ou ajuste o serviço solicitado.</span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                  {availableSlots.map(slot => {
                    const isSelected = selectedHour === slot.horario;
                    if (!slot.isAvailable) return null; // Filtra estritamente horários sem a quantidade de vagas necessária

                    return (
                      <button
                        key={slot.horario}
                        type="button"
                        onClick={() => setSelectedHour(slot.horario)}
                        style={{
                          border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                          background: isSelected ? 'var(--color-primary)' : 'var(--bg-darker)',
                          color: isSelected ? '#ffffff' : 'var(--text-main)',
                          borderRadius: '10px',
                          padding: '12px 8px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.5px' }}>
                          {slot.horario}
                        </span>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: isSelected ? 'rgba(255,255,255,0.9)' : slot.vagasLivres >= 3 ? '#10b981' : '#f59e0b'
                        }}>
                          {slot.vagasLivres} {slot.vagasLivres === 1 ? 'vaga livre' : 'vagas livres'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            PASSO 5: OBSERVAÇÕES E CONFIRMAÇÃO
            ══════════════════════════════════════════════════════════════ */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '22px',
          marginTop: '20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
              <i className="fa-solid fa-comment-medical" style={{ marginRight: '6px', color: '#a855f7' }}></i> Observações Clínicas / Detalhes (Opcional):
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Foco no ombro direito, retorno pós-lesão, ajuste de carga..."
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-darker)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '12px 14px',
                fontSize: '0.9rem',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Resumo & Botão de Confirmação */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '18px 22px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Resumo do Agendamento
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                {selectedClient ? (selectedClient.dadosPessoais?.nome || selectedClient.nome) : 'Selecione o Aluno'} • {selectedService.nome}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                📅 {formatDateDisplay(selectedDate)} às {selectedHour ? <strong style={{ color: '#10b981' }}>{selectedHour}</strong> : 'Escolha o horário'}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !selectedClient || !selectedHour}
              style={{
                background: (!selectedClient || !selectedHour) ? 'var(--bg-darker)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: (!selectedClient || !selectedHour) ? 'var(--text-muted)' : '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '14px 28px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: (!selectedClient || !selectedHour || submitting) ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: (!selectedClient || !selectedHour) ? 'none' : '0 4px 14px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.2s ease'
              }}
            >
              {submitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Lançando...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check"></i> Confirmar Agendamento
                </>
              )}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
