'use client';

import React, { useState, useEffect, useMemo } from 'react';

export interface AgendaConfigItem {
  _id: string;
  tipo: 'academia' | 'dr_guilherme' | 'dr_albert' | 'consultorio' | 'servico';
  horario: string;
  acao: 'bloquear' | 'adicionar' | 'alterar_capacidade';
  diaSemana: number | null;
  dataEspecifica: string | null;
  capacidadePersonalizada: number | null;
  servico?: string | null;
  createdAt?: string;
}

interface AgendaConfigPanelProps {
  onNotify?: (text: string, type: 'success' | 'danger') => void;
}

const AGENDA_TYPES = [
  {
    id: 'academia' as const,
    label: 'Academia / Salão',
    icon: 'fa-dumbbell',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.3)',
    capacidadeBase: 6,
    descricao: 'Grade coletiva e monitorada com capacidade padrão de 6 vagas por horário.'
  },
  {
    id: 'dr_guilherme' as const,
    label: 'Dr. Guilherme (Fisioterapia)',
    icon: 'fa-user-doctor',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.3)',
    capacidadeBase: 1,
    descricao: 'Consultório individual de Fisioterapia e Reabilitação (1 vaga por horário).'
  },
  {
    id: 'dr_albert' as const,
    label: 'Dr. Albert (Médico)',
    icon: 'fa-stethoscope',
    color: '#a855f7',
    bg: 'rgba(168, 85, 247, 0.12)',
    border: 'rgba(168, 85, 247, 0.3)',
    capacidadeBase: 2,
    descricao: 'Consultório médico e avaliações clínicas (2 vagas por horário).'
  }
];

const DAYS_OF_WEEK = [
  { val: 1, name: 'Segunda-feira', short: 'Seg', isWeekend: false },
  { val: 2, name: 'Terça-feira', short: 'Ter', isWeekend: false },
  { val: 3, name: 'Quarta-feira', short: 'Qua', isWeekend: false },
  { val: 4, name: 'Quinta-feira', short: 'Qui', isWeekend: false },
  { val: 5, name: 'Sexta-feira', short: 'Sex', isWeekend: false },
  { val: 6, name: 'Sábado', short: 'Sáb', isWeekend: true }
];

const DEFAULT_HOURS_WEEKDAY = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', 
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', 
  '18:00', '19:00', '20:00', '21:00'
];

const DEFAULT_HOURS_SATURDAY = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00'
];

export default function AgendaConfigPanel({ onNotify }: AgendaConfigPanelProps) {
  const [selectedAgenda, setSelectedAgenda] = useState<'academia' | 'dr_guilherme' | 'dr_albert'>('academia');
  const [activeSubTab, setActiveSubTab] = useState<'matriz' | 'feriados' | 'regras_lista'>('matriz');
  const [configs, setConfigs] = useState<AgendaConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState(false);

  // States para Modal de Ajuste de Horário / Vagas
  const [editSlotModal, setEditSlotModal] = useState<{
    isOpen: boolean;
    dayVal: number;
    dayName: string;
    horario: string;
    isBlocked: boolean;
    capacidade: number;
    ruleId?: string;
  } | null>(null);

  // States para Modal de Feriado / Bloqueio Pontual
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayDesc, setHolidayDesc] = useState('');
  const [holidayAction, setHolidayAction] = useState<'bloquear_dia' | 'horario_especifico'>('bloquear_dia');
  const [holidayCustomHours, setHolidayCustomHours] = useState('08:00');
  const [holidayCustomCap, setHolidayCustomCap] = useState(4);

  // States para Adicionar Horário Extra fora da grade padrão
  const [showAddExtraHourModal, setShowAddExtraHourModal] = useState(false);
  const [extraHourTime, setExtraHourTime] = useState('05:30');
  const [extraHourDays, setExtraHourDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [extraHourCap, setExtraHourCap] = useState<number>(6);

  const activeAgendaMeta = useMemo(() => {
    return AGENDA_TYPES.find(a => a.id === selectedAgenda) || AGENDA_TYPES[0];
  }, [selectedAgenda]);

  // Carregar regras do backend
  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/agenda-config');
      const data = await res.json();
      if (data.success) {
        setConfigs(data.data || []);
      }
    } catch (err) {
      console.error('Erro ao carregar regras de agenda:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const notify = (text: string, type: 'success' | 'danger') => {
    if (onNotify) {
      onNotify(text, type);
    } else {
      alert(text);
    }
  };

  // Filtrar regras da agenda ativa
  const currentAgendaConfigs = useMemo(() => {
    return configs.filter(c => c.tipo === selectedAgenda);
  }, [configs, selectedAgenda]);

  // Regras pontuais (feriados / datas específicas)
  const holidayConfigs = useMemo(() => {
    return configs.filter(c => c.dataEspecifica !== null && (c.tipo === selectedAgenda || c.tipo === 'academia'));
  }, [configs, selectedAgenda]);

  // Obter todos os horários a serem exibidos na grade semanal
  const gridHours = useMemo(() => {
    const hoursSet = new Set<string>(DEFAULT_HOURS_WEEKDAY);
    // Adicionar horários extras que existirem nas regras
    currentAgendaConfigs.forEach(c => {
      if (!c.dataEspecifica && c.horario) {
        hoursSet.add(c.horario);
      }
    });
    return Array.from(hoursSet).sort();
  }, [currentAgendaConfigs]);

  // Helper para obter o status de um horário em um dia da semana
  const getSlotStatus = (dayVal: number, horario: string) => {
    const isSaturday = dayVal === 6;
    // Se for sábado e o horário não fizer parte do sábado padrão nem de regra explícita
    const isDefaultSaturday = DEFAULT_HOURS_SATURDAY.includes(horario);
    const isDefaultWeekday = DEFAULT_HOURS_WEEKDAY.includes(horario);

    // Buscar regra recorrente
    const rule = currentAgendaConfigs.find(
      c => c.diaSemana === dayVal && c.horario === horario && !c.dataEspecifica
    );

    if (rule) {
      if (rule.acao === 'bloquear') {
        return {
          isBlocked: true,
          capacidade: 0,
          isCustom: true,
          ruleId: rule._id,
          label: 'Fechado'
        };
      }
      if (rule.acao === 'alterar_capacidade') {
        return {
          isBlocked: false,
          capacidade: rule.capacidadePersonalizada ?? activeAgendaMeta.capacidadeBase,
          isCustom: true,
          ruleId: rule._id,
          label: `${rule.capacidadePersonalizada ?? activeAgendaMeta.capacidadeBase} vagas`
        };
      }
      if (rule.acao === 'adicionar') {
        return {
          isBlocked: false,
          capacidade: rule.capacidadePersonalizada ?? activeAgendaMeta.capacidadeBase,
          isCustom: true,
          ruleId: rule._id,
          label: `${rule.capacidadePersonalizada ?? activeAgendaMeta.capacidadeBase} vagas (Extra)`
        };
      }
    }

    // Comportamento padrão caso não haja regra explícita
    if (isSaturday && !isDefaultSaturday) {
      return {
        isBlocked: true,
        capacidade: 0,
        isCustom: false,
        ruleId: undefined,
        label: 'Fechado'
      };
    }

    if (!isSaturday && !isDefaultWeekday) {
      return {
        isBlocked: true,
        capacidade: 0,
        isCustom: false,
        ruleId: undefined,
        label: 'Fechado'
      };
    }

    return {
      isBlocked: false,
      capacidade: activeAgendaMeta.capacidadeBase,
      isCustom: false,
      ruleId: undefined,
      label: `${activeAgendaMeta.capacidadeBase} vagas`
    };
  };

  // Alternância rápida (Liga / Desliga com 1 clique)
  const handleQuickToggleSlot = async (dayVal: number, horario: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const status = getSlotStatus(dayVal, horario);
    setSavingAction(true);

    try {
      if (status.isBlocked) {
        // Estava bloqueado -> Reabrir
        if (status.ruleId) {
          // Se tinha regra explícita de bloqueio, remove a regra para voltar ao padrão
          await fetch(`/api/admin/agenda-config?id=${status.ruleId}`, { method: 'DELETE' });
        } else {
          // Se estava fechado por ser fora da grade padrão, adiciona como horário ativo
          await fetch('/api/admin/agenda-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipo: selectedAgenda,
              horario,
              acao: 'adicionar',
              diaSemana: dayVal,
              capacidadePersonalizada: activeAgendaMeta.capacidadeBase
            })
          });
        }
        notify(`Horário ${horario} liberado com sucesso!`, 'success');
      } else {
        // Estava aberto -> Bloquear
        await fetch('/api/admin/agenda-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: selectedAgenda,
            horario,
            acao: 'bloquear',
            diaSemana: dayVal
          })
        });
        notify(`Horário ${horario} fechado com sucesso!`, 'success');
      }
      await fetchConfigs();
    } catch (err) {
      notify('Erro de comunicação ao atualizar horário.', 'danger');
    } finally {
      setSavingAction(false);
    }
  };

  // Salvar ajuste do Modal de Edição de Slot
  const handleSaveSlotModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSlotModal) return;

    setSavingAction(true);
    try {
      if (editSlotModal.isBlocked) {
        await fetch('/api/admin/agenda-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: selectedAgenda,
            horario: editSlotModal.horario,
            acao: 'bloquear',
            diaSemana: editSlotModal.dayVal
          })
        });
      } else {
        if (editSlotModal.capacidade === activeAgendaMeta.capacidadeBase && editSlotModal.ruleId) {
          // Restaurar ao padrão
          await fetch(`/api/admin/agenda-config?id=${editSlotModal.ruleId}`, { method: 'DELETE' });
        } else {
          await fetch('/api/admin/agenda-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipo: selectedAgenda,
              horario: editSlotModal.horario,
              acao: 'alterar_capacidade',
              diaSemana: editSlotModal.dayVal,
              capacidadePersonalizada: editSlotModal.capacidade
            })
          });
        }
      }

      notify('Configuração de horário salva com sucesso!', 'success');
      setEditSlotModal(null);
      await fetchConfigs();
    } catch (err) {
      notify('Erro ao salvar configuração do horário.', 'danger');
    } finally {
      setSavingAction(false);
    }
  };

  // Ação em Lote: Bloquear ou Abrir um Horário em Todos os Dias da Semana
  const handleBulkRowAction = async (horario: string, acao: 'bloquear_todos' | 'reabrir_todos') => {
    if (!confirm(`Deseja ${acao === 'bloquear_todos' ? 'BLOQUEAR' : 'REABRIR'} o horário das ${horario} em todos os dias (Segunda a Sábado)?`)) {
      return;
    }

    setSavingAction(true);
    try {
      if (acao === 'bloquear_todos') {
        const rules = [1, 2, 3, 4, 5, 6].map(d => ({
          tipo: selectedAgenda,
          horario,
          acao: 'bloquear',
          diaSemana: d
        }));
        await fetch('/api/admin/agenda-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bulk: true, rules })
        });
      } else {
        // Remover regras de todos os dias para esse horário
        for (const d of [1, 2, 3, 4, 5, 6]) {
          await fetch(`/api/admin/agenda-config?tipo=${selectedAgenda}&horario=${encodeURIComponent(horario)}&diaSemana=${d}`, {
            method: 'DELETE'
          });
        }
      }

      notify(`Ação em lote para o horário ${horario} concluída com sucesso!`, 'success');
      await fetchConfigs();
    } catch (err) {
      notify('Erro ao aplicar ação em lote.', 'danger');
    } finally {
      setSavingAction(false);
    }
  };

  // Salvar Feriado / Bloqueio Pontual
  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate) {
      notify('Informe a data do feriado ou bloqueio pontual.', 'danger');
      return;
    }

    setSavingAction(true);
    try {
      if (holidayAction === 'bloquear_dia') {
        // Bloquear todos os horários da grade para esta data específica
        const rules = gridHours.map(h => ({
          tipo: selectedAgenda,
          horario: h,
          acao: 'bloquear',
          dataEspecifica: holidayDate
        }));

        await fetch('/api/admin/agenda-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bulk: true, rules })
        });
        notify(`Data ${holidayDate.split('-').reverse().join('/')} bloqueada com sucesso!`, 'success');
      } else {
        await fetch('/api/admin/agenda-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: selectedAgenda,
            horario: holidayCustomHours,
            acao: 'alterar_capacidade',
            dataEspecifica: holidayDate,
            capacidadePersonalizada: holidayCustomCap
          })
        });
        notify(`Regra pontual para ${holidayDate.split('-').reverse().join('/')} salva com sucesso!`, 'success');
      }

      setHolidayDate('');
      setHolidayDesc('');
      await fetchConfigs();
    } catch (err) {
      notify('Erro ao salvar feriado ou bloqueio.', 'danger');
    } finally {
      setSavingAction(false);
    }
  };

  // Remover Feriado por Data
  const handleDeleteHolidayByDate = async (dateStr: string) => {
    if (!confirm(`Deseja remover todas as regras e bloqueios da data ${dateStr.split('-').reverse().join('/')}?`)) {
      return;
    }

    setSavingAction(true);
    try {
      await fetch(`/api/admin/agenda-config?dataEspecifica=${dateStr}&tipo=${selectedAgenda}`, {
        method: 'DELETE'
      });
      notify(`Bloqueio da data ${dateStr.split('-').reverse().join('/')} removido com sucesso!`, 'success');
      await fetchConfigs();
    } catch (err) {
      notify('Erro ao remover regra pontual.', 'danger');
    } finally {
      setSavingAction(false);
    }
  };

  // Adicionar Horário Extra
  const handleAddExtraHourSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraHourTime) return;

    setSavingAction(true);
    try {
      const rules = extraHourDays.map(d => ({
        tipo: selectedAgenda,
        horario: extraHourTime,
        acao: 'adicionar',
        diaSemana: d,
        capacidadePersonalizada: extraHourCap
      }));

      await fetch('/api/admin/agenda-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk: true, rules })
      });

      notify(`Horário extra ${extraHourTime} adicionado com sucesso!`, 'success');
      setShowAddExtraHourModal(false);
      await fetchConfigs();
    } catch (err) {
      notify('Erro ao adicionar horário extra.', 'danger');
    } finally {
      setSavingAction(false);
    }
  };

  // Agrupar feriados por data para exibição limpa
  const groupedHolidays = useMemo(() => {
    const map: Record<string, AgendaConfigItem[]> = {};
    holidayConfigs.forEach(h => {
      if (!h.dataEspecifica) return;
      if (!map[h.dataEspecifica]) map[h.dataEspecifica] = [];
      map[h.dataEspecifica].push(h);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [holidayConfigs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. SELETOR DE AGENDAS (TABS PRINCIPAIS COM IDENTIDADE VISUAL) */}
      <div style={{
        background: 'linear-gradient(135deg, #131d31 0%, #0c1322 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '16px 20px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.28rem', fontWeight: 900, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-calendar-gear" style={{ color: activeAgendaMeta.color }}></i>
              Configuração e Capacidade da Agenda
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              {activeAgendaMeta.descricao}
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchConfigs}
            disabled={loading || savingAction}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i> Atualizar
          </button>
        </div>

        {/* Botoes de Seleção de Agenda */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
          {AGENDA_TYPES.map(agenda => {
            const isSelected = selectedAgenda === agenda.id;
            return (
              <button
                key={agenda.id}
                type="button"
                onClick={() => setSelectedAgenda(agenda.id)}
                style={{
                  background: isSelected 
                    ? `linear-gradient(135deg, ${agenda.color}25, rgba(255,255,255,0.03))` 
                    : 'rgba(255, 255, 255, 0.03)',
                  border: isSelected ? `2px solid ${agenda.color}` : '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? `0 4px 16px ${agenda.color}20` : 'none'
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: isSelected ? agenda.color : 'rgba(255, 255, 255, 0.06)',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                  flexShrink: 0
                }}>
                  <i className={`fa-solid ${agenda.icon}`}></i>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: isSelected ? '#ffffff' : '#cbd5e1' }}>
                    {agenda.label}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                    Capacidade base: <strong style={{ color: agenda.color }}>{agenda.capacidadeBase} {agenda.capacidadeBase === 1 ? 'vaga' : 'vagas'}</strong>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. SUB-ABAS DE NAVEGAÇÃO (Grade Semanal / Feriados / Lista de Regras) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{
          display: 'inline-flex',
          background: 'rgba(0, 0, 0, 0.45)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          padding: '4px',
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => setActiveSubTab('matriz')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: activeSubTab === 'matriz' ? 800 : 600,
              border: 'none',
              background: activeSubTab === 'matriz' ? `linear-gradient(135deg, ${activeAgendaMeta.color}, #059669)` : 'transparent',
              color: activeSubTab === 'matriz' ? '#ffffff' : '#94a3b8',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px'
            }}
          >
            <i className="fa-solid fa-table-cells"></i> Grade Semanal Interativa
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('feriados')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: activeSubTab === 'feriados' ? 800 : 600,
              border: 'none',
              background: activeSubTab === 'feriados' ? `linear-gradient(135deg, ${activeAgendaMeta.color}, #059669)` : 'transparent',
              color: activeSubTab === 'feriados' ? '#ffffff' : '#94a3b8',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px'
            }}
          >
            <i className="fa-solid fa-umbrella-beach"></i> Feriados & Exceções Pontuais
            {holidayConfigs.length > 0 && (
              <span style={{
                background: 'rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                fontSize: '0.68rem',
                fontWeight: 900,
                padding: '1px 6px',
                borderRadius: '10px'
              }}>
                {groupedHolidays.length}
              </span>
            )}
          </button>
        </div>

        {activeSubTab === 'matriz' && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowAddExtraHourModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="fa-solid fa-plus-circle" style={{ color: activeAgendaMeta.color }}></i> Adicionar Horário Extra
          </button>
        )}
      </div>

      {/* 3. VISÃO: GRADE SEMANAL INTERATIVA (MATRIZ VISUAL) */}
      {activeSubTab === 'matriz' && (
        <div style={{
          background: '#0d1525',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.55)'
        }}>
          {/* Header da Grade: Dias da Semana */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '90px repeat(6, minmax(130px, 1fr))',
            background: 'rgba(0, 0, 0, 0.6)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'sticky',
            top: 0,
            zIndex: 10
          }}>
            <div style={{
              padding: '12px 10px',
              fontSize: '0.74rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: '#64748b',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              Horário
            </div>

            {DAYS_OF_WEEK.map(day => (
              <div
                key={day.val}
                style={{
                  padding: '12px 8px',
                  textAlign: 'center',
                  borderLeft: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#f8fafc' }}>
                  {day.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                  {day.isWeekend ? 'Fim de semana' : 'Dia útil'}
                </div>
              </div>
            ))}
          </div>

          {/* Linhas da Grade de Horários */}
          <div style={{ maxHeight: '680px', overflowY: 'auto' }}>
            {gridHours.map((horario, idx) => {
              return (
                <div
                  key={horario}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '90px repeat(6, minmax(130px, 1fr))',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)'
                  }}
                >
                  {/* Coluna 1: Horário + Ação de Linha Inteira */}
                  <div style={{
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(0, 0, 0, 0.3)'
                  }}>
                    <span style={{ fontSize: '0.94rem', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.3px' }}>
                      {horario}
                    </span>

                    <div style={{ display: 'flex', gap: '3px' }}>
                      <button
                        type="button"
                        onClick={() => handleBulkRowAction(horario, 'bloquear_todos')}
                        title="Bloquear este horário em todos os dias (Seg a Sáb)"
                        style={{
                          border: 'none',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          borderRadius: '4px',
                          padding: '2px 5px',
                          fontSize: '0.62rem',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        <i className="fa-solid fa-lock"></i>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkRowAction(horario, 'reabrir_todos')}
                        title="Reabrir este horário em todos os dias"
                        style={{
                          border: 'none',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          borderRadius: '4px',
                          padding: '2px 5px',
                          fontSize: '0.62rem',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        <i className="fa-solid fa-lock-open"></i>
                      </button>
                    </div>
                  </div>

                  {/* Colunas 2-7: Células dos Dias da Semana */}
                  {DAYS_OF_WEEK.map(day => {
                    const status = getSlotStatus(day.val, horario);
                    return (
                      <div
                        key={day.val}
                        onClick={() => {
                          setEditSlotModal({
                            isOpen: true,
                            dayVal: day.val,
                            dayName: day.name,
                            horario,
                            isBlocked: status.isBlocked,
                            capacidade: status.isBlocked ? activeAgendaMeta.capacidadeBase : status.capacidade,
                            ruleId: status.ruleId
                          });
                        }}
                        style={{
                          padding: '8px 10px',
                          borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                          cursor: 'pointer',
                          background: status.isBlocked 
                            ? 'rgba(239, 68, 68, 0.06)' 
                            : status.isCustom 
                            ? 'rgba(56, 189, 248, 0.05)' 
                            : 'transparent',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = status.isBlocked 
                            ? 'rgba(239, 68, 68, 0.12)' 
                            : 'rgba(255, 255, 255, 0.06)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = status.isBlocked 
                            ? 'rgba(239, 68, 68, 0.06)' 
                            : status.isCustom 
                            ? 'rgba(56, 189, 248, 0.05)' 
                            : 'transparent';
                        }}
                        title={`Clique para configurar ${day.name} às ${horario}`}
                      >
                        {/* Status Visual */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          {status.isBlocked ? (
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              color: '#ef4444',
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              padding: '2px 7px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <i className="fa-solid fa-lock" style={{ fontSize: '0.62rem' }}></i> Fechado
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              color: status.isCustom ? '#38bdf8' : activeAgendaMeta.color,
                              background: status.isCustom ? 'rgba(56, 189, 248, 0.12)' : activeAgendaMeta.bg,
                              border: `1px solid ${status.isCustom ? 'rgba(56, 189, 248, 0.3)' : activeAgendaMeta.border}`,
                              padding: '2px 7px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: status.isCustom ? '#38bdf8' : activeAgendaMeta.color }}></span>
                              {status.label}
                            </span>
                          )}
                        </div>

                        {/* Botão de Ação Rápida (Toggle) */}
                        <button
                          type="button"
                          onClick={e => handleQuickToggleSlot(day.val, horario, e)}
                          title={status.isBlocked ? 'Reabrir este horário' : 'Bloquear/Fechar este horário'}
                          style={{
                            border: 'none',
                            background: status.isBlocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: status.isBlocked ? '#10b981' : '#ef4444',
                            borderRadius: '6px',
                            width: '26px',
                            height: '26px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '0.74rem',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <i className={`fa-solid ${status.isBlocked ? 'fa-lock-open' : 'fa-lock'}`}></i>
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. VISÃO: FERIADOS & EXCEÇÕES PONTUAIS */}
      {activeSubTab === 'feriados' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Formulário de Cadastro de Feriado */}
          <div style={{
            background: 'linear-gradient(135deg, #131d31 0%, #0c1322 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '22px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.08rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-calendar-plus" style={{ color: activeAgendaMeta.color }}></i>
              Cadastrar Feriado ou Bloqueio Pontual
            </h3>

            <form onSubmit={handleSaveHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  Data do Feriado / Exceção <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={holidayDate}
                  onChange={e => setHolidayDate(e.target.value)}
                  style={{ width: '100%', padding: '10px' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  Tipo de Regra
                </label>
                <select
                  className="select-custom"
                  value={holidayAction}
                  onChange={e => setHolidayAction(e.target.value as any)}
                  style={{ width: '100%', padding: '10px' }}
                >
                  <option value="bloquear_dia">🔴 Fechar a Unidade / Bloquear o Dia Todo</option>
                  <option value="horario_especifico">🟡 Horário Especial / Vagas Reduzidas</option>
                </select>
              </div>

              {holidayAction === 'horario_especifico' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                      Horário
                    </label>
                    <input
                      type="time"
                      className="form-control"
                      value={holidayCustomHours}
                      onChange={e => setHolidayCustomHours(e.target.value)}
                      style={{ width: '100%', padding: '10px' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                      Vagas
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      className="form-control"
                      value={holidayCustomCap}
                      onChange={e => setHolidayCustomCap(Number(e.target.value))}
                      style={{ width: '100%', padding: '10px' }}
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  Motivo / Observação (Opcional)
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Feriado Nacional de Tiradentes"
                  value={holidayDesc}
                  onChange={e => setHolidayDesc(e.target.value)}
                  style={{ width: '100%', padding: '10px' }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingAction}
                style={{ marginTop: '6px', padding: '10px', fontWeight: 800 }}
              >
                <i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i> Salvar Bloqueio de Feriado
              </button>
            </form>
          </div>

          {/* Listagem de Feriados Cadastrados */}
          <div style={{
            background: 'linear-gradient(135deg, #131d31 0%, #0c1322 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '22px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.08rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-list-check" style={{ color: activeAgendaMeta.color }}></i>
              Feriados e Bloqueios Ativos ({groupedHolidays.length})
            </h3>

            {groupedHolidays.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#94a3b8',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '12px',
                border: '1px dashed rgba(255, 255, 255, 0.1)'
              }}>
                <i className="fa-solid fa-calendar-check" style={{ fontSize: '2rem', color: '#64748b', marginBottom: '10px', display: 'block' }}></i>
                Nenhum feriado ou bloqueio pontual cadastrado para esta agenda.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
                {groupedHolidays.map(([dateStr, items]) => {
                  const isDayBlocked = items.some(i => i.acao === 'bloquear');
                  const dateFormatted = dateStr.split('-').reverse().join('/');
                  const weekdayName = new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' });

                  return (
                    <div
                      key={dateStr}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          background: isDayBlocked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: isDayBlocked ? '#ef4444' : '#f59e0b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.1rem',
                          flexShrink: 0
                        }}>
                          <i className={`fa-solid ${isDayBlocked ? 'fa-ban' : 'fa-clock'}`}></i>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#f8fafc' }}>
                            {dateFormatted} <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'capitalize' }}>({weekdayName})</span>
                          </div>
                          <div style={{ fontSize: '0.76rem', color: isDayBlocked ? '#f87171' : '#fbbf24', marginTop: '2px', fontWeight: 600 }}>
                            {isDayBlocked ? '● Dia Inteiro Fechado' : `● ${items.length} regras de horário especial`}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteHolidayByDate(dateStr)}
                        disabled={savingAction}
                        title="Remover bloqueio desta data"
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <i className="fa-solid fa-trash"></i> Desbloquear
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE SLOT (CLICK NA CÉLULA) */}
      {editSlotModal?.isOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setEditSlotModal(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.75)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                  {editSlotModal.dayName} às {editSlotModal.horario}
                </h3>
                <span style={{ fontSize: '0.78rem', color: activeAgendaMeta.color, fontWeight: 700 }}>
                  {activeAgendaMeta.label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditSlotModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.2rem',
                  cursor: 'pointer'
                }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveSlotModal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
                  Status do Horário
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setEditSlotModal({ ...editSlotModal, isBlocked: false })}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      border: !editSlotModal.isBlocked ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: !editSlotModal.isBlocked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      color: !editSlotModal.isBlocked ? '#10b981' : '#94a3b8'
                    }}
                  >
                    <i className="fa-solid fa-lock-open" style={{ marginRight: '6px' }}></i> Aberto
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditSlotModal({ ...editSlotModal, isBlocked: true })}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      border: editSlotModal.isBlocked ? '2px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: editSlotModal.isBlocked ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      color: editSlotModal.isBlocked ? '#ef4444' : '#94a3b8'
                    }}
                  >
                    <i className="fa-solid fa-lock" style={{ marginRight: '6px' }}></i> Bloqueado
                  </button>
                </div>
              </div>

              {!editSlotModal.isBlocked && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
                    Quantidade de Vagas
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setEditSlotModal({ ...editSlotModal, capacidade: Math.max(1, editSlotModal.capacidade - 1) })}
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: '#fff',
                        fontSize: '1.1rem',
                        cursor: 'pointer'
                      }}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      className="form-control"
                      value={editSlotModal.capacidade}
                      onChange={e => setEditSlotModal({ ...editSlotModal, capacidade: Number(e.target.value) })}
                      style={{ textAlign: 'center', fontWeight: 900, fontSize: '1.1rem', flex: 1 }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setEditSlotModal({ ...editSlotModal, capacidade: Math.min(20, editSlotModal.capacidade + 1) })}
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        background: 'rgba(255, 255, 255, 0.06)',
                        color: '#fff',
                        fontSize: '1.1rem',
                        cursor: 'pointer'
                      }}
                    >
                      +
                    </button>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '6px' }}>
                    Capacidade base padrão: {activeAgendaMeta.capacidadeBase} vagas
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditSlotModal(null)}
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingAction}
                  style={{ flex: 1, fontWeight: 800 }}
                >
                  Salvar Regra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR HORÁRIO EXTRA */}
      {showAddExtraHourModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowAddExtraHourModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.75)'
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
              Adicionar Horário Extra na Grade
            </h3>

            <form onSubmit={handleAddExtraHourSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  Horário (HH:MM)
                </label>
                <input
                  type="time"
                  className="form-control"
                  value={extraHourTime}
                  onChange={e => setExtraHourTime(e.target.value)}
                  style={{ width: '100%', padding: '10px' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  Dias da Semana
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {DAYS_OF_WEEK.map(d => {
                    const isSelected = extraHourDays.includes(d.val);
                    return (
                      <button
                        key={d.val}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setExtraHourDays(extraHourDays.filter(val => val !== d.val));
                          } else {
                            setExtraHourDays([...extraHourDays, d.val]);
                          }
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: isSelected ? `1.5px solid ${activeAgendaMeta.color}` : '1px solid rgba(255, 255, 255, 0.1)',
                          background: isSelected ? activeAgendaMeta.bg : 'rgba(255, 255, 255, 0.04)',
                          color: isSelected ? '#fff' : '#94a3b8'
                        }}
                      >
                        {d.short}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  Capacidade de Vagas
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="form-control"
                  value={extraHourCap}
                  onChange={e => setExtraHourCap(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddExtraHourModal(false)}
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingAction || extraHourDays.length === 0}
                  style={{ flex: 1, fontWeight: 800 }}
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
