'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';

interface TrancamentoPanelProps {
  clients: any[];
  professionals: any[];
  professionalId?: string;
  isColetivo?: boolean;
  onExecuteAction?: (
    actionName: string,
    targetClientId: string | null,
    callback: (executorProfId: string, isCollective: boolean) => void,
    actionDetails?: string
  ) => void;
  preSelectedClientId?: string | null;
  isModal?: boolean;
  onClose?: () => void;
}

export default function TrancamentoPanel({
  clients,
  professionals,
  professionalId,
  isColetivo = false,
  onExecuteAction,
  preSelectedClientId,
  isModal = false,
  onClose
}: TrancamentoPanelProps) {
  const [contracts, setContracts] = useState<any[]>([]);
  const [trancamentosList, setTrancamentosList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [creditosManual, setCreditosManual] = useState<number | null>(null);
  const [fixedSchedules, setFixedSchedules] = useState<any[]>([]);
  const [loadingFixedSchedules, setLoadingFixedSchedules] = useState(false);
  const [redistribuicao, setRedistribuicao] = useState<Record<string, number>>({});
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalizador de data ISO (YYYY-MM-DD)
  const toISO = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    if (dateStr.includes('T')) return dateStr.split('T')[0];
    return dateStr;
  };

  // Carrega contratos e trancamentos existentes
  const fetchContractsAndTrancamentos = async () => {
    setLoading(true);
    try {
      const [resContracts, resTrancamentos] = await Promise.all([
        fetch('/api/contracts').then(r => r.json()),
        fetch('/api/trancamentos').then(r => r.json())
      ]);

      if (resContracts?.success && Array.isArray(resContracts.data)) {
        setContracts(resContracts.data);
      }
      if (resTrancamentos?.success && Array.isArray(resTrancamentos.data)) {
        setTrancamentosList(resTrancamentos.data);
      }
    } catch (err) {
      console.error('Erro ao carregar contratos e trancamentos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContractsAndTrancamentos();
  }, []);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtra contratos ativos e exclusivos da modalidade ANUAL
  const annualActiveContracts = useMemo(() => {
    return contracts.filter((c: any) => {
      const isAssinado = c.status === 'assinado' || c.status === 'ativo' || c.status === 'congelado';
      if (!isAssinado) return false;

      const duracao = (c.duracao || '').toLowerCase();
      const planoTipo = (c.planoTipo || '').toLowerCase();
      const planoNome = (c.planoNome || c.planoId?.nome || '').toLowerCase();
      const vigenciaMeses = Number(c.vigenciaMeses || 0);

      const isAnual = duracao.includes('anual') ||
        planoTipo.includes('anual') ||
        planoNome.includes('anual') ||
        vigenciaMeses >= 12;

      return isAnual;
    });
  }, [contracts]);

  // Se houver aluno pré-selecionado (via props)
  useEffect(() => {
    if (preSelectedClientId && annualActiveContracts.length > 0) {
      const matched = annualActiveContracts.find(c => {
        const cClientId = c.clientId?._id || c.clientId;
        return String(cClientId) === String(preSelectedClientId);
      });
      if (matched) {
        setSelectedContractId(matched._id);
        const cl = clients.find(client => client._id === preSelectedClientId);
        const name = cl?.dadosPessoais?.nome || matched.nomeCliente || 'Aluno';
        const plan = matched.planoNome || matched.planoId?.nome || 'Plano Anual';
        setSearchQuery(`${name} — ${plan}`);
      }
    }
  }, [preSelectedClientId, annualActiveContracts, clients]);

  // Contrato e Cliente selecionados
  const selectedContract = useMemo(() => {
    return annualActiveContracts.find(c => c._id === selectedContractId);
  }, [annualActiveContracts, selectedContractId]);

  const selectedClient = useMemo(() => {
    if (!selectedContract) return null;
    const cid = selectedContract.clientId?._id || selectedContract.clientId;
    return clients.find(cl => cl._id === cid);
  }, [selectedContract, clients]);

  const selectedClientName = useMemo(() => {
    if (selectedClient?.dadosPessoais?.nome) return selectedClient.dadosPessoais.nome;
    if (selectedContract?.nomeCliente) return selectedContract.nomeCliente;
    return 'Aluno';
  }, [selectedClient, selectedContract]);

  // Frequência semanal validada
  const frequencia = Number(
    selectedContract?.frequencia ||
    selectedClient?.dadosComerciais?.frequencia ||
    selectedClient?.frequencia || 0
  );
  const frequenciaValida = !isNaN(frequencia) && frequencia > 0;

  // Trancamentos anteriores deste contrato
  const trancsDesteContrato = useMemo(() => {
    if (!selectedContractId) return [];
    return trancamentosList.filter(t => (t.contractId?._id || t.contractId) === selectedContractId);
  }, [trancamentosList, selectedContractId]);

  const semanasUsadasAnteriores = useMemo(() => {
    return trancsDesteContrato.reduce((acc, t) => acc + (Number(t.semanas) || 0), 0);
  }, [trancsDesteContrato]);

  // Data final do contrato
  const contractEndISO = useMemo(() => {
    if (!selectedContract) return '';
    return toISO(selectedContract.dataFim || selectedContract.dataTermino || selectedClient?.dadosComerciais?.vencimento);
  }, [selectedContract, selectedClient]);

  // Carrega horários fixos do cliente para auditoria da grade
  useEffect(() => {
    if (!selectedClient?._id) {
      setFixedSchedules([]);
      return;
    }
    setLoadingFixedSchedules(true);
    fetch(`/api/fixed-schedules?clienteId=${selectedClient._id}`)
      .then(r => r.json())
      .then(json => {
        if (json?.success && Array.isArray(json.data)) {
          setFixedSchedules(json.data);
        } else {
          setFixedSchedules([]);
        }
      })
      .catch(err => {
        console.error('Erro ao carregar horários fixos do cliente:', err);
        setFixedSchedules([]);
      })
      .finally(() => setLoadingFixedSchedules(false));
  }, [selectedClient]);

  // Opção 3: Cálculo de dias, semanas e auditoria inteligente de créditos
  const trancamentoCalculation = useMemo(() => {
    if (!dataInicio || !dataFim) {
      return {
        diasTrancados: 0,
        semanasEquiv: 0,
        dataRetornoISO: '',
        dataRetornoFormatted: '',
        creditosSugeridos: 0,
        detalheCalculo: '',
        aulasAuditadas: [] as any[]
      };
    }

    const startISO = toISO(dataInicio);
    const endISO = toISO(dataFim);

    const [sy, sm, sd] = startISO.split('-').map(Number);
    const [ey, em, ed] = endISO.split('-').map(Number);

    const dtStart = new Date(sy, sm - 1, sd, 12, 0, 0);
    const dtEnd = new Date(ey, em - 1, ed, 12, 0, 0);

    if (isNaN(dtStart.getTime()) || isNaN(dtEnd.getTime()) || dtStart > dtEnd) {
      return {
        diasTrancados: 0,
        semanasEquiv: 0,
        dataRetornoISO: '',
        dataRetornoFormatted: '',
        creditosSugeridos: 0,
        detalheCalculo: 'Data inicial posterior à data final',
        aulasAuditadas: [] as any[]
      };
    }

    const diffMs = dtEnd.getTime() - dtStart.getTime();
    const diasTrancados = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
    const semanasEquiv = Math.max(1, Math.round(diasTrancados / 7));

    const dtRetorno = new Date(dtEnd);
    dtRetorno.setDate(dtRetorno.getDate() + 1);
    const retY = dtRetorno.getFullYear();
    const retM = String(dtRetorno.getMonth() + 1).padStart(2, '0');
    const retD = String(dtRetorno.getDate()).padStart(2, '0');
    const dataRetornoISO = `${retY}-${retM}-${retD}`;
    const dataRetornoFormatted = dtRetorno.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

    // Auditoria de Horários Fixos na grade entre startISO e endISO
    let aulasContadas = 0;
    const aulasAuditadas: any[] = [];

    if (fixedSchedules && fixedSchedules.length > 0) {
      const cur = new Date(dtStart);
      while (cur <= dtEnd) {
        const curDayOfWeek = cur.getDay(); // 0 = Domingo, 1 = Segunda...
        const curISO = cur.toISOString().slice(0, 10);

        const schedsDoDia = fixedSchedules.filter((s: any) => {
          if (Number(s.diaSemana) !== curDayOfWeek) return false;
          if (s.dataInicio && s.dataInicio > curISO) return false;
          if (s.dataFim && s.dataFim < curISO) return false;
          return true;
        });

        for (const s of schedsDoDia) {
          const serv = s.servico || 'Treino Monitorado';
          const isLivre = serv.toLowerCase().includes('livre');
          if (!isLivre) {
            aulasContadas++;
            aulasAuditadas.push({
              data: curISO,
              diaSemana: curDayOfWeek,
              horario: s.horario,
              servico: serv
            });
          }
        }

        cur.setDate(cur.getDate() + 1);
      }
    }

    let creditosSugeridos = 0;
    let detalheCalculo = '';

    if (aulasContadas > 0) {
      creditosSugeridos = aulasContadas;
      detalheCalculo = `Auditadas ${aulasContadas} aula(s) de Treino Monitorado no período de ${diasTrancados} dias.`;
    } else {
      creditosSugeridos = Math.max(1, Math.round((diasTrancados / 7) * (frequencia || 1)));
      detalheCalculo = `Baseado em ${diasTrancados} dias (~${(diasTrancados / 7).toFixed(1)} semanas) e frequência de ${frequencia || 1}x/semana do contrato.`;
    }

    return {
      diasTrancados,
      semanasEquiv,
      dataRetornoISO,
      dataRetornoFormatted,
      creditosSugeridos,
      detalheCalculo,
      aulasAuditadas
    };
  }, [dataInicio, dataFim, fixedSchedules, frequencia]);

  // Créditos totais a congelar e redistribuir (com suporte ao ajuste fino)
  const creditosCongelados = useMemo(() => {
    if (creditosManual !== null) return Math.max(0, creditosManual);
    return trancamentoCalculation.creditosSugeridos || 0;
  }, [creditosManual, trancamentoCalculation.creditosSugeridos]);

  // Atalhos rápidos para período de trancamento
  const handleApplyQuickPeriod = (dias: number | 'endOfMonth') => {
    if (!dataInicio) return;
    const startISO = toISO(dataInicio);
    const [y, m, d] = startISO.split('-').map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0);

    if (dias === 'endOfMonth') {
      const lastDay = new Date(dt.getFullYear(), dt.getMonth() + 1, 0, 12, 0, 0);
      const endISO = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
      setDataFim(endISO);
    } else {
      dt.setDate(dt.getDate() + dias - 1);
      const endISO = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      setDataFim(endISO);
    }
    setCreditosManual(null);
    setRedistribuicao({});
  };

  // Meses restantes de vigência a partir de dataInicio
  const remainingMonths = useMemo(() => {
    if (!selectedContract || !dataInicio || !contractEndISO) return [];
    const startISO = toISO(dataInicio);
    const startDate = new Date(startISO + 'T00:00:00');
    const endDate = new Date(contractEndISO + 'T23:59:59');

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) return [];

    const months: Array<{ label: string; value: string }> = [];
    let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const last = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (current <= last) {
      const label = current.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const value = current.toISOString().slice(0, 7); // YYYY-MM
      months.push({ label, value });
      current.setMonth(current.getMonth() + 1);
    }
    return months;
  }, [selectedContract, dataInicio, contractEndISO]);

  // Auto-distribuição inteligente dos créditos entre os meses restantes
  const handleAutoDistribute = () => {
    if (creditosCongelados <= 0 || remainingMonths.length === 0) return;
    const retMonth = trancamentoCalculation.dataRetornoISO ? trancamentoCalculation.dataRetornoISO.slice(0, 7) : remainingMonths[0].value;
    const eligibleMonths = remainingMonths.filter(m => m.value >= retMonth);
    const targetMonths = eligibleMonths.length > 0 ? eligibleMonths : remainingMonths;

    const newRedist: Record<string, number> = {};
    remainingMonths.forEach(m => { newRedist[m.value] = 0; });

    let remaining = creditosCongelados;
    let idx = 0;
    while (remaining > 0) {
      const monthKey = targetMonths[idx % targetMonths.length].value;
      newRedist[monthKey] = (newRedist[monthKey] || 0) + 1;
      remaining--;
      idx++;
    }
    setRedistribuicao(newRedist);
  };

  // Soma dos créditos atualmente redistribuídos
  const sumRedist = useMemo(() => {
    return remainingMonths.reduce((sum, m) => sum + (Number(redistribuicao[m.value]) || 0), 0);
  }, [remainingMonths, redistribuicao]);

  const isDistributionPerfect = frequenciaValida && creditosCongelados > 0 && sumRedist === creditosCongelados;

  // Submissão do Trancamento
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedContract || !selectedClient) {
      setErrorMsg('Selecione um aluno com contrato anual ativo.');
      return;
    }
    if (!frequenciaValida) {
      setErrorMsg('O aluno não possui uma frequência semanal válida cadastrada (1x a 5x).');
      return;
    }
    if (!dataInicio) {
      setErrorMsg('Informe a data de início do trancamento.');
      return;
    }
    if (!dataFim) {
      setErrorMsg('Informe a data de término do trancamento.');
      return;
    }
    if (dataFim < dataInicio) {
      setErrorMsg('A data de término não pode ser anterior à data de início.');
      return;
    }
    if (contractEndISO && dataFim > contractEndISO) {
      setErrorMsg(`A data de término (${dataFim}) não pode ultrapassar a vigência do contrato (${contractEndISO}).`);
      return;
    }
    if (creditosCongelados <= 0) {
      setErrorMsg('A quantidade de créditos a repor deve ser maior que zero.');
      return;
    }
    if (!isDistributionPerfect) {
      setErrorMsg(`A soma redistribuída (${sumRedist}) deve ser exatamente igual ao total de ${creditosCongelados} créditos a repor.`);
      return;
    }

    const redistList = remainingMonths.map(m => ({
      mesAno: m.value,
      creditos: Number(redistribuicao[m.value] || 0)
    }));

    const executeTrancamento = async (executorProfId: string, isCollective: boolean) => {
      setSubmitting(true);
      try {
        const payload = {
          clientId: selectedClient._id,
          contractId: selectedContract._id,
          dataInicio: toISO(dataInicio),
          dataFim: toISO(dataFim),
          semanas: trancamentoCalculation.semanasEquiv,
          creditosTrancados: creditosCongelados,
          redistribuicao: redistList,
          profissionalId: executorProfId || professionalId || null,
          origem: isCollective ? 'Computador Coletivo' : 'Acesso Direto'
        };

        const res = await fetch('/api/trancamentos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          setSuccessMsg(`Trancamento de ${trancamentoCalculation.diasTrancados} dias (${creditosCongelados} créditos) lançado com sucesso!`);
          fetchContractsAndTrancamentos();
          // Reset form
          setSelectedContractId('');
          setSearchQuery('');
          setDataInicio('');
          setDataFim('');
          setCreditosManual(null);
          setRedistribuicao({});
          if (onClose) {
            setTimeout(() => onClose(), 1500);
          }
        } else {
          setErrorMsg(data.error || 'Erro ao registrar trancamento.');
        }
      } catch (err: any) {
        setErrorMsg('Erro de conexão ao salvar trancamento.');
      } finally {
        setSubmitting(false);
      }
    };

    // Segurança de Computador Coletivo: Se coletivo, dispara fluxo com proteção de PIN
    if (isColetivo && onExecuteAction) {
      onExecuteAction(
        'Lançou Trancamento de Plano',
        selectedClient._id,
        (executorProfId, isColl) => {
          executeTrancamento(executorProfId, isColl);
        },
        `Lançamento de trancamento de ${trancamentoCalculation.diasTrancados} dias (${creditosCongelados} créditos) para o aluno ${selectedClientName}`
      );
    } else {
      executeTrancamento(professionalId || '', false);
    }
  };

  const content = (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Cabeçalho */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(14, 165, 233, 0.1) 100%)',
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.35rem',
            border: '1px solid rgba(56, 189, 248, 0.3)'
          }}>
            <i className="fa-solid fa-snowflake"></i>
          </div>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '1.45rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Lançar Trancamento de Plano
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              Suspensão regulamentar de aulas com reposição de créditos dentro da vigência contratual.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isColetivo ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#fbbf24',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              fontSize: '0.78rem',
              fontWeight: 700
            }}>
              <i className="fa-solid fa-shield-halved"></i> Computador Coletivo (PIN Ativo)
            </span>
          ) : (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              fontSize: '0.78rem',
              fontWeight: 700
            }}>
              <i className="fa-solid fa-user-check"></i> Acesso Direto
            </span>
          )}

          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#cbd5e1',
                borderRadius: '8px',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Fechar
            </button>
          )}
        </div>
      </div>

      {/* Formulário Principal */}
      <div style={{
        background: '#0f172a',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        marginBottom: '28px'
      }}>
        <form onSubmit={handleSubmit}>
          {/* Seleção do Aluno */}
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
              Aluno com Contrato Anual Ativo *
            </label>
            <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '14px', color: '#94a3b8', fontSize: '0.85rem' }}></i>
                <input
                  type="text"
                  placeholder="Digite o nome do aluno ou clique para listar os contratos anuais..."
                  value={searchQuery}
                  onFocus={() => setDropdownOpen(true)}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setSelectedContractId('');
                    setDropdownOpen(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 38px',
                    background: '#1e293b',
                    border: selectedContractId ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)',
                    color: '#f8fafc',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
                <div style={{ position: 'absolute', right: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {(searchQuery || selectedContractId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedContractId('');
                        setDropdownOpen(true);
                      }}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', fontSize: '0.85rem' }}
                      title="Limpar seleção"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', fontSize: '0.78rem' }}
                  >
                    <i className={`fa-solid fa-chevron-${dropdownOpen ? 'up' : 'down'}`}></i>
                  </button>
                </div>
              </div>

              {/* Menu Dropdown com Busca Inteligente */}
              {dropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  zIndex: 99999,
                  background: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '8px',
                  boxShadow: '0 16px 36px rgba(0,0,0,0.6)',
                  maxHeight: '260px',
                  overflowY: 'auto'
                }}>
                  {(() => {
                    const norm = (str: string) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
                    const filtered = annualActiveContracts.filter((c: any) => {
                      if (!searchQuery) return true;
                      const cl = clients.find(clItem => clItem._id === (c.clientId?._id || c.clientId));
                      const name = cl?.dadosPessoais?.nome || c.nomeCliente || '';
                      const plan = c.planoNome || c.planoId?.nome || '';
                      return norm(name).includes(norm(searchQuery)) || norm(plan).includes(norm(searchQuery));
                    });

                    if (filtered.length === 0) {
                      return (
                        <div style={{ padding: '14px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                          Nenhum contrato anual ativo correspondente à busca.
                        </div>
                      );
                    }

                    return filtered.map((c: any) => {
                      const cl = clients.find(clItem => clItem._id === (c.clientId?._id || c.clientId));
                      const name = cl?.dadosPessoais?.nome || c.nomeCliente || 'Aluno';
                      const plan = c.planoNome || c.planoId?.nome || 'Plano Anual';
                      const isSelected = c._id === selectedContractId;

                      return (
                        <div
                          key={c._id}
                          onClick={() => {
                            setSelectedContractId(c._id);
                            setSearchQuery(`${name} — ${plan}`);
                            setDropdownOpen(false);
                            setDataInicio('');
                            setSemanas(1);
                            setRedistribuicao({});
                            setErrorMsg('');
                          }}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: '0.84rem', color: isSelected ? '#38bdf8' : '#f8fafc', display: 'block' }}>
                              {name}
                            </strong>
                            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                              {plan} • Fim: {c.dataFim || c.dataTermino || '—'}
                            </span>
                          </div>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: 'rgba(56, 189, 248, 0.12)',
                            color: '#38bdf8'
                          }}>
                            Plano Anual
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Card Resumo do Contrato Selecionado */}
          {selectedContract && (
            <div style={{
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              padding: '14px 18px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
                  {selectedClientName}
                </span>
                <span style={{
                  fontSize: '0.74rem',
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 700
                }}>
                  {selectedContract.planoNome || selectedContract.planoId?.nome || 'Plano Anual'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', fontSize: '0.76rem' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Vigência:</span>
                  <strong style={{ color: '#cbd5e1' }}>{selectedContract.dataInicio || '—'} → {contractEndISO || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Frequência:</span>
                  <strong style={{ color: frequenciaValida ? '#cbd5e1' : '#ef4444' }}>
                    {frequenciaValida ? `${frequencia}x por semana` : 'Inconsistente (Sem Frequência)'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Trancamentos Anteriores:</span>
                  <strong style={{ color: '#f59e0b' }}>{semanasUsadasAnteriores} semanas utilizadas</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Vigência Restante:</span>
                  <strong style={{ color: maxSemanasDisponiveis > 0 ? '#10b981' : '#ef4444' }}>
                    {maxSemanasDisponiveis} semanas disponíveis
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Bloqueio se não tiver frequência válida */}
          {selectedContract && !frequenciaValida ? (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#fca5a5',
              padding: '16px',
              borderRadius: '10px',
              textAlign: 'center',
              fontSize: '0.85rem'
            }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>
              Este contrato não possui uma frequência semanal válida cadastrada (1x a 5x). Favor regularizar o cadastro antes de lançar o trancamento.
            </div>
          ) : selectedContract ? (
            <>
              {/* Seleção de Período (Início e Término do Trancamento) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                    Início do Trancamento *
                  </label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={e => {
                      setDataInicio(e.target.value);
                      setCreditosManual(null);
                      setRedistribuicao({});
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#f8fafc',
                      borderRadius: '8px',
                      fontSize: '0.85rem'
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                    Término do Trancamento * (Último dia ausente)
                  </label>
                  <input
                    type="date"
                    value={dataFim}
                    min={dataInicio || undefined}
                    max={contractEndISO || undefined}
                    onChange={e => {
                      setDataFim(e.target.value);
                      setCreditosManual(null);
                      setRedistribuicao({});
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#f8fafc',
                      borderRadius: '8px',
                      fontSize: '0.85rem'
                    }}
                    required
                  />
                </div>
              </div>

              {/* Botões Rápidos de Período */}
              {dataInicio && (
                <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8', marginRight: '4px' }}>
                    Atalhos rápidos:
                  </span>
                  {[
                    { label: '+1 Semana (7d)', dias: 7 },
                    { label: '+2 Semanas (14d)', dias: 14 },
                    { label: '+3 Semanas (21d)', dias: 21 },
                    { label: '+4 Semanas (28d)', dias: 28 },
                    { label: 'Até Fim do Mês', dias: 'endOfMonth' as const }
                  ].map(btn => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => handleApplyQuickPeriod(btn.dias)}
                      style={{
                        padding: '4px 10px',
                        background: 'rgba(56, 189, 248, 0.1)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        color: '#38bdf8',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 650,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Diagnóstico do Período e Retorno às Aulas */}
              {dataInicio && dataFim && trancamentoCalculation.diasTrancados > 0 && (
                <div style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '12px'
                }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>Duração do Trancamento:</span>
                    <strong style={{ fontSize: '0.90rem', color: '#f8fafc' }}>
                      {trancamentoCalculation.diasTrancados} dias corridos
                    </strong>
                    <span style={{ fontSize: '0.70rem', color: '#38bdf8', marginLeft: '6px' }}>
                      (~{trancamentoCalculation.semanasEquiv} {trancamentoCalculation.semanasEquiv === 1 ? 'semana' : 'semanas'})
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>Retorno Oficial às Aulas:</span>
                    <strong style={{ fontSize: '0.90rem', color: '#10b981' }}>
                      {trancamentoCalculation.dataRetornoFormatted}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>Vigência Restante do Contrato:</span>
                    <strong style={{ fontSize: '0.90rem', color: '#cbd5e1' }}>
                      {contractEndISO}
                    </strong>
                  </div>
                </div>
              )}

              {/* Opção 3: Auditoria Real da Grade & Ajuste Fino de Créditos a Repor */}
              {dataInicio && dataFim && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.06) 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1rem', color: '#fbbf24' }}>
                          <i className="fa-solid fa-calculator"></i>
                        </span>
                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc' }}>
                          Créditos a Repor (Opção 3 — Auditoria da Grade)
                        </h4>
                        <span style={{
                          fontSize: '0.70rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(245, 158, 11, 0.2)',
                          color: '#fbbf24',
                          border: '1px solid rgba(245, 158, 11, 0.35)'
                        }}>
                          🎯 Sugestão: {trancamentoCalculation.creditosSugeridos} cr.
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: '#cbd5e1' }}>
                        {loadingFixedSchedules ? (
                          <span><i className="fa-solid fa-spinner fa-spin"></i> Auditando horários fixos do aluno...</span>
                        ) : (
                          trancamentoCalculation.detalheCalculo
                        )}
                      </p>
                    </div>

                    {/* Botão de Restaurar Sugestão Automática se o usuário ajustou manualmente */}
                    {creditosManual !== null && creditosManual !== trancamentoCalculation.creditosSugeridos && (
                      <button
                        type="button"
                        onClick={() => {
                          setCreditosManual(null);
                          setRedistribuicao({});
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: '#cbd5e1',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          cursor: 'pointer'
                        }}
                      >
                        <i className="fa-solid fa-rotate-left" style={{ marginRight: '4px' }}></i>
                        Restaurar Sugestão ({trancamentoCalculation.creditosSugeridos})
                      </button>
                    )}
                  </div>

                  {/* Controle de Ajuste Fino [ - ] [ INPUT ] [ + ] */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(0,0,0,0.3)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    <span style={{ fontSize: '0.80rem', color: '#cbd5e1', fontWeight: 600 }}>
                      Quantidade Final de Créditos a Repor:
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const novo = Math.max(0, creditosCongelados - 1);
                          setCreditosManual(novo);
                          setRedistribuicao({});
                        }}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: 'rgba(245, 158, 11, 0.2)',
                          border: '1px solid rgba(245, 158, 11, 0.4)',
                          color: '#fbbf24',
                          fontWeight: 800,
                          fontSize: '1rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Diminuir 1 crédito"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={creditosCongelados}
                        onChange={e => {
                          const v = Math.max(0, Number(e.target.value) || 0);
                          setCreditosManual(v);
                          setRedistribuicao({});
                        }}
                        style={{
                          width: '65px',
                          padding: '6px 0',
                          textAlign: 'center',
                          background: '#0f172a',
                          border: '1px solid rgba(245, 158, 11, 0.5)',
                          borderRadius: '6px',
                          color: '#fbbf24',
                          fontSize: '1.05rem',
                          fontWeight: 800,
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const novo = creditosCongelados + 1;
                          setCreditosManual(novo);
                          setRedistribuicao({});
                        }}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: 'rgba(245, 158, 11, 0.2)',
                          border: '1px solid rgba(245, 158, 11, 0.4)',
                          color: '#fbbf24',
                          fontWeight: 800,
                          fontSize: '1rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Aumentar 1 crédito"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Grade de Redistribuição Mensal de Créditos */}
              {dataInicio && dataFim && creditosCongelados > 0 && (
                <div style={{
                  background: '#1e293b',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  padding: '18px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.90rem', fontWeight: 700, color: '#f8fafc' }}>
                        Redistribuição Mensal de Créditos (Dentro da Vigência)
                      </h4>
                      <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
                        Distribua exatamente os <strong>{creditosCongelados} créditos</strong> entre os meses restantes antes do vencimento do contrato ({contractEndISO}):
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoDistribute}
                      style={{
                        padding: '6px 12px',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.15) 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: '#34d399',
                        borderRadius: '6px',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      title="Distribuir créditos uniformemente nos meses restantes"
                    >
                      <i className="fa-solid fa-wand-magic-sparkles"></i>
                      ⚡ Distribuir Automaticamente
                    </button>
                  </div>

                  {remainingMonths.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: '#fca5a5' }}>
                      Não foram encontrados meses restantes entre a data de início e o fim da vigência do contrato. Verifique a data inicial.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {remainingMonths.map(m => {
                        const currentVal = Number(redistribuicao[m.value] || 0);
                        return (
                          <div
                            key={m.value}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              background: 'rgba(0,0,0,0.25)',
                              borderRadius: '6px',
                              border: '1px solid rgba(255,255,255,0.05)'
                            }}
                          >
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', textTransform: 'capitalize' }}>
                              {m.label}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                type="button"
                                style={{
                                  padding: '3px 8px',
                                  minWidth: '28px',
                                  background: 'rgba(255,255,255,0.06)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  color: '#cbd5e1',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontWeight: 700
                                }}
                                onClick={() => {
                                  if (currentVal > 0) {
                                    setRedistribuicao({
                                      ...redistribuicao,
                                      [m.value]: currentVal - 1
                                    });
                                  }
                                }}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                max={creditosCongelados}
                                value={currentVal}
                                onChange={e => {
                                  const v = Math.max(0, Math.min(creditosCongelados, Number(e.target.value) || 0));
                                  setRedistribuicao({
                                    ...redistribuicao,
                                    [m.value]: v
                                  });
                                }}
                                style={{
                                  width: '50px',
                                  textAlign: 'center',
                                  fontWeight: 'bold',
                                  fontSize: '0.85rem',
                                  background: '#0f172a',
                                  border: '1px solid rgba(255,255,255,0.15)',
                                  color: '#fff',
                                  borderRadius: '4px',
                                  padding: '4px 0'
                                }}
                              />
                              <button
                                type="button"
                                style={{
                                  padding: '3px 8px',
                                  minWidth: '28px',
                                  background: 'rgba(255,255,255,0.06)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  color: '#cbd5e1',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontWeight: 700
                                }}
                                onClick={() => {
                                  if (sumRedist < creditosCongelados) {
                                    setRedistribuicao({
                                      ...redistribuicao,
                                      [m.value]: currentVal + 1
                                    });
                                  }
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Validação de soma em tempo real */}
                      <div style={{
                        marginTop: '12px',
                        paddingTop: '10px',
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>Total Distribuído:</span>
                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: isDistributionPerfect ? '#10b981' : '#f59e0b' }}>
                          {sumRedist} de {creditosCongelados} créditos {isDistributionPerfect ? '✓' : `(Restam ${creditosCongelados - sumRedist})`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mensagens de feedback */}
              {errorMsg && (
                <div style={{
                  padding: '12px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
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
                  padding: '12px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <i className="fa-solid fa-circle-check"></i>
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Botão de Envio */}
              <button
                type="submit"
                disabled={submitting || !isDistributionPerfect}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: isDistributionPerfect
                    ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                    : 'rgba(255,255,255,0.06)',
                  color: isDistributionPerfect ? '#fff' : '#64748b',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.90rem',
                  cursor: isDistributionPerfect && !submitting ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                {submitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>Registrando trancamento...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-snowflake"></i>
                    <span>Confirmar Trancamento {isColetivo ? '(Exige PIN)' : ''}</span>
                  </>
                )}
              </button>
            </>
          ) : null}
        </form>
      </div>

      {/* Histórico Recente de Trancamentos */}
      <div style={{
        background: '#0f172a',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
            Histórico de Trancamentos Registrados
          </h3>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            {trancamentosList.length} registro(s)
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Carregando histórico...
          </div>
        ) : trancamentosList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px', color: '#64748b', fontSize: '0.85rem' }}>
            Nenhum trancamento registrado até o momento.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.80rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                  <th style={{ padding: '10px 8px' }}>Aluno</th>
                  <th style={{ padding: '10px 8px' }}>Período Trancado</th>
                  <th style={{ padding: '10px 8px' }}>Retorno</th>
                  <th style={{ padding: '10px 8px' }}>Duração</th>
                  <th style={{ padding: '10px 8px' }}>Créditos</th>
                  <th style={{ padding: '10px 8px' }}>Redistribuição</th>
                  <th style={{ padding: '10px 8px' }}>Lançado por</th>
                  <th style={{ padding: '10px 8px' }}>Data</th>
                </tr>
              </thead>
              <tbody>
                {trancamentosList.slice(0, 15).map((t: any) => {
                  const cName = t.clientId?.dadosPessoais?.nome || 'Aluno';
                  const pName = t.profissionalId?.nome || 'Administração';
                  const orig = t.origem || 'Direto';
                  return (
                    <tr key={t._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 650, color: '#f8fafc' }}>{cName}</td>
                      <td style={{ padding: '10px 8px', color: '#cbd5e1' }}>
                        <div>{t.dataInicio} → {t.dataFim || '—'}</div>
                      </td>
                      <td style={{ padding: '10px 8px', color: '#10b981', fontWeight: 600 }}>
                        {t.dataRetorno || '—'}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: t.semanas > 4 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.08)',
                          color: t.semanas > 4 ? '#38bdf8' : '#e2e8f0',
                          fontWeight: 700
                        }}>
                          {t.diasTrancados ? `${t.diasTrancados} dias` : `${t.semanas} sem.`}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px', color: '#fbbf24', fontWeight: 700 }}>
                        {t.creditosTrancados} cr.
                      </td>
                      <td style={{ padding: '10px 8px', color: '#94a3b8' }}>
                        {(t.redistribuicao || []).filter((r: any) => r.creditos > 0).map((r: any) => `${r.mesAno}: +${r.creditos}`).join(', ') || '—'}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ color: '#cbd5e1', fontWeight: 600 }}>{pName}</div>
                        <span style={{
                          fontSize: '0.68rem',
                          color: orig === 'Computador Coletivo' ? '#fbbf24' : '#94a3b8'
                        }}>
                          {orig}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px', color: '#64748b' }}>
                        {t.createdAt ? new Date(t.createdAt).toLocaleDateString('pt-BR') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div
        className="modal-overlay"
        style={{
          display: 'flex',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 100000,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(6px)',
          padding: '20px',
          overflowY: 'auto'
        }}
        onClick={onClose}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            maxWidth: '900px',
            width: '98%',
            margin: 'auto',
            background: '#090d16',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255,255,255,0.12)'
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  return content;
}
