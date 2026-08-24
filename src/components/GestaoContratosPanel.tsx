'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { downloadContractPDF, getContractPDFBase64 } from '@/utils/pdfGenerator';
import { generateContractTemplate as getUnifiedTemplate } from '@/utils/contractTemplate';
import { validateContractClientData } from '@/utils/contractValidator';
import { formatCurrencyBRL, selectOnFocus } from '@/utils/currencyMask';
import { smartSearchMatch } from '@/utils/smartSearch';
import { getContractValidityInfo } from '@/utils/contractValidity';
import { getCardRateForInstallment } from '@/utils/paymentRates';
import ClicksignPanel from './ClicksignPanel';
import MoneyInput from './MoneyInput';

const normalizeText = (str: string) => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

export interface ClientContractStage {
  stageKey: 'ativo' | 'renovacao' | 'vencido' | 'pendente' | 'proposta' | 'congelado' | 'lead' | 'dynamus' | 'finalizado';
  stageLabel: string;
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
  orientacaoKey: 'vigente' | 'gerar_renovacao' | 'sincronizar_clicksign' | 'gerar_asaas' | 'reenviar_link' | 'gerar_link' | 'baixar_pdf' | 'gerenciar_dynamus' | 'dados_faltantes' | 'finalizado';
  orientacaoLabel: string;
  isRecorrente: boolean;
  isBoleto: boolean;
  hasAsaasBoleto: boolean;
  hasCpf: boolean;
  hasPhone: boolean;
  hasEndereco: boolean;
  hasBirthDate: boolean;
  isMissingData: boolean;
  info: any;
}

export function resolveClientContractStage(c: any, plan: any, latestContract: any, latestProposal: any, clientPayments?: any[]): ClientContractStage {
  const com = c?.dadosComerciais || {};
  const dp = c?.dadosPessoais || {};
  const info = getContractValidityInfo(c, plan, clientPayments);

  const isRecorrente = Boolean(com.criarRecorrenciaMensal || com.recorrenciaVigencia || latestContract?.criarRecorrenciaMensal);
  const isBoleto = (latestContract?.formaPagamento || com.formaPagamento) === 'boleto';
  const hasAsaasBoleto = Boolean(latestContract?.asaasBoletoPdf || latestContract?.asaasInvoiceUrl);
  const hasPaidInstallment = Boolean(clientPayments && clientPayments.some((p: any) => p.status === 'Pago'));

  const cleanCpf = (dp.cpf || '').replace(/\D/g, '');
  const cleanPhone = (dp.telefone || '').replace(/\D/g, '');
  const isCpfValid = Boolean(cleanCpf.length === 11 && !/^(\d)\1{10}$/.test(cleanCpf));
  const isPhoneValid = Boolean(cleanPhone.length >= 10 && !/^(\d)\1+$/.test(cleanPhone));
  // Ausência de CEP NÃO invalida o endereço se a rua/logradouro for preenchida
  const hasEndereco = Boolean(dp.endereco?.trim() && !dp.endereco.toLowerCase().includes('teste'));
  const hasBirthDate = Boolean(dp.dataNascimento?.trim());
  const hasValidEmail = Boolean(dp.email && !dp.email.toLowerCase().endsWith('@clube.com'));
  const hasCpf = isCpfValid;
  const hasPhone = isPhoneValid;
  const isMissingData = !hasCpf || !hasPhone || !hasEndereco || !hasBirthDate || !hasValidEmail;

  // 0. Contrato Finalizado (Não Renovou)
  if (com.status === 'finalizado' || c?.status === 'finalizado') {
    return {
      stageKey: 'finalizado',
      stageLabel: '🏁 Contrato Finalizado (Não Renovou)',
      badgeBg: 'rgba(107, 114, 128, 0.2)',
      badgeColor: '#9ca3af',
      badgeBorder: '1px solid rgba(107, 114, 128, 0.4)',
      orientacaoKey: 'finalizado',
      orientacaoLabel: '📁 Histórico / Reativar Aluno',
      isRecorrente: false,
      isBoleto,
      hasAsaasBoleto,
      hasCpf,
      hasPhone,
      hasEndereco,
      hasBirthDate,
      isMissingData,
      info
    };
  }

  // 0.1 Aluno Convênio Dynamus (Não é Lead, Já entra como Dynamus)
  const isDynamus = Boolean(
    plan?.nome?.toLowerCase().includes('dynamus') ||
    com.planoNome?.toLowerCase().includes('dynamus') ||
    dp.email?.toLowerCase().includes('dynamus') ||
    dp.endereco?.toLowerCase().includes('dynamus') ||
    c?.codigo?.toUpperCase().includes('DYN') ||
    c?.dadosClinicos?.observacoes?.toLowerCase().includes('dynamus')
  );

  if (isDynamus) {
    const isDynamusComplete = Boolean(dp.nome && isCpfValid);
    return {
      stageKey: 'dynamus',
      stageLabel: '⚡ ALUNO DYNAMUS',
      badgeBg: 'rgba(6, 182, 212, 0.18)',
      badgeColor: '#22d3ee',
      badgeBorder: '1px solid rgba(6, 182, 212, 0.4)',
      orientacaoKey: 'gerenciar_dynamus',
      orientacaoLabel: '⚡ Gerenciar Aluno Dynamus',
      isRecorrente: false,
      isBoleto: false,
      hasAsaasBoleto: false,
      hasCpf: isCpfValid,
      hasPhone: true, // Dispensado para Dynamus (dados do convênio)
      hasEndereco: true, // Dispensado para Dynamus (dados do convênio)
      hasBirthDate: true, // Dispensado para Dynamus
      isMissingData: !isDynamusComplete,
      info
    };
  }

  // 1. Contrato Assinado, Perfil Ativo com Vigência Válida ou Recorrência em Dia
  const hasActiveContract = Boolean(
    latestContract?.status === 'assinado' ||
    latestContract?.clicksignStatus === 'assinado' ||
    com.status === 'ativo' ||
    com.status === 'assinado' ||
    (isRecorrente && hasPaidInstallment && !info.isExpired) ||
    (plan && !info.isExpired && (com.valorUnitario > 0 || latestContract || hasPaidInstallment)) ||
    (com.valorUnitario > 0 && (com.vencimento || com.dataInicio)) ||
    (com.planoId && (com.vencimento || com.dataInicio))
  );

  const isExpired = Boolean(info.isExpired);
  const isExpiringSoon = Boolean(info.isExpiringSoon);

  if (hasActiveContract) {
    if (isExpired) {
      return {
        stageKey: 'vencido',
        stageLabel: isRecorrente ? '🔴 Recorrência Vencida' : '🔴 Contrato Vencido',
        badgeBg: '#991b1b',
        badgeColor: '#ffffff',
        badgeBorder: 'none',
        orientacaoKey: 'gerar_renovacao',
        orientacaoLabel: '🚀 Gerar Renovação Anual (+5%)',
        isRecorrente,
        isBoleto,
        hasAsaasBoleto,
        hasCpf,
        hasPhone,
        hasEndereco,
        hasBirthDate,
        isMissingData,
        info
      };
    }

    if (isExpiringSoon) {
      return {
        stageKey: 'renovacao',
        stageLabel: isRecorrente ? '🟠 Renovação de Recorrência (<30d)' : '🟠 Vencendo em Breve (<30d)',
        badgeBg: '#78350f',
        badgeColor: '#ffffff',
        badgeBorder: 'none',
        orientacaoKey: 'gerar_renovacao',
        orientacaoLabel: '🚀 Gerar Renovação Anual (+5%)',
        isRecorrente,
        isBoleto,
        hasAsaasBoleto,
        hasCpf,
        hasPhone,
        hasEndereco,
        hasBirthDate,
        isMissingData,
        info
      };
    }

    // Estável / Vigente (> 30 dias restantes)
    return {
      stageKey: 'ativo',
      stageLabel: isRecorrente ? '🟢 Contrato Vigente (Recorrência)' : '🟢 Contrato Vigente',
      badgeBg: '#065f46',
      badgeColor: '#ffffff',
      badgeBorder: 'none',
      orientacaoKey: isBoleto ? 'gerar_asaas' : 'baixar_pdf',
      orientacaoLabel: isBoleto ? (hasAsaasBoleto ? '💳 Ver Boletos Asaas' : '💳 Gerar Boletos Asaas') : '📄 Baixar Contrato PDF',
      isRecorrente,
      isBoleto,
      hasAsaasBoleto,
      hasCpf,
      hasPhone,
      hasEndereco,
      hasBirthDate,
      isMissingData,
      info
    };
  }

  // 2. Contrato Pendente de Assinatura (Clicksign)
  const isPendingContract = Boolean(
    (latestContract && (latestContract.status === 'pendente' || latestContract.clicksignStatus === 'pendente')) ||
    com.status === 'pendente'
  );
  if (isPendingContract) {
    return {
      stageKey: 'pendente',
      stageLabel: '⏳ Aguardando Assinatura',
      badgeBg: 'rgba(245, 158, 11, 0.18)',
      badgeColor: '#fbbf24',
      badgeBorder: '1px solid rgba(245, 158, 11, 0.4)',
      orientacaoKey: 'sincronizar_clicksign',
      orientacaoLabel: '🔄 Sincronizar Clicksign',
      isRecorrente,
      isBoleto,
      hasAsaasBoleto,
      hasCpf,
      hasPhone,
      hasEndereco,
      hasBirthDate,
      isMissingData,
      info
    };
  }

  // 3. Proposta Comercial Enviada
  const isPendingProposal = Boolean(latestProposal && latestProposal.status === 'pendente');
  if (isPendingProposal) {
    return {
      stageKey: 'proposta',
      stageLabel: '⏳ Proposta Enviada',
      badgeBg: 'rgba(139, 92, 246, 0.18)',
      badgeColor: '#c084fc',
      badgeBorder: '1px solid rgba(139, 92, 246, 0.4)',
      orientacaoKey: 'reenviar_link',
      orientacaoLabel: '📲 Reenviar Link de Venda',
      isRecorrente,
      isBoleto,
      hasAsaasBoleto,
      hasCpf,
      hasPhone,
      hasEndereco,
      hasBirthDate,
      isMissingData,
      info
    };
  }

  // 4. Congelado
  if (com.status === 'congelado') {
    return {
      stageKey: 'congelado',
      stageLabel: '❄️ Congelado',
      badgeBg: '#92400e',
      badgeColor: '#ffffff',
      badgeBorder: 'none',
      orientacaoKey: 'vigente',
      orientacaoLabel: '❄️ Plano Congelado',
      isRecorrente,
      isBoleto,
      hasAsaasBoleto,
      hasCpf,
      hasPhone,
      hasEndereco,
      hasBirthDate,
      isMissingData,
      info
    };
  }

  // 5. Lead / Novo Cadastro
  return {
    stageKey: 'lead',
    stageLabel: '🟣 Lead / Novo Cadastro',
    badgeBg: 'rgba(139, 92, 246, 0.12)',
    badgeColor: '#c084fc',
    badgeBorder: 'none',
    orientacaoKey: 'gerar_link',
    orientacaoLabel: '⚡ Gerar Link de Venda',
    isRecorrente,
    isBoleto,
    hasAsaasBoleto,
    hasCpf,
    hasPhone,
    hasEndereco,
    hasBirthDate,
    isMissingData,
    info
  };
}

interface GestaoContratosPanelProps {
  clients: any[];
  plans: any[];
  userCargo: string;
  fetchData: (silent?: boolean) => void;
  onNavigateTab?: (tab: string, filterQuery?: string) => void;
}

export default function GestaoContratosPanel({
  clients,
  plans,
  userCargo,
  fetchData,
  onNavigateTab
}: GestaoContratosPanelProps) {
  // Navigation & General states
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [subTab, setSubTab] = useState<'alunos' | 'clicksign'>('alunos');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('vencimento_asc');

  const handleOpenClientFinancial = (client: any) => {
    if (onNavigateTab) {
      onNavigateTab('financeiro', client.dadosPessoais?.nome || '');
    } else {
      window.dispatchEvent(new CustomEvent('navigate_tab', { detail: { tab: 'financeiro', searchQuery: client.dadosPessoais?.nome || '' } }));
    }
  };
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([
    'vigente',
    'renovacao',
    'vencido',
    'aguardando_assinatura',
    'lead',
    'dynamus'
  ]);
  const [quickViewFilter, setQuickViewFilter] = useState<string>('todos');
  const [orientacaoFilter, setOrientacaoFilter] = useState('todos');
  const [formaPagamentoFilter, setFormaPagamentoFilter] = useState('todos');
  const [contratoPlanFilter, setContratoPlanFilter] = useState('todos');
  const [contracts, setContracts] = useState<any[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [allContractsMap, setAllContractsMap] = useState<Record<string, any>>({});
  const [allProposalsMap, setAllProposalsMap] = useState<Record<string, any>>({});
  const [allPaymentsMap, setAllPaymentsMap] = useState<Record<string, any[]>>({});
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [syncingClicksignClientId, setSyncingClicksignClientId] = useState<string | null>(null);
  const [historyModalClient, setHistoryModalClient] = useState<any>(null);

  // States for Finalize Contract Modal (Não Renovou)
  const [finalizeClientTarget, setFinalizeClientTarget] = useState<any>(null);
  const [finalizeReason, setFinalizeReason] = useState('decidiu_nao_renovar');
  const [finalizeCustomObs, setFinalizeCustomObs] = useState('');
  const [submittingFinalize, setSubmittingFinalize] = useState(false);

  const handleOpenFinalizeModal = (client: any) => {
    setFinalizeClientTarget(client);
    setFinalizeReason('decidiu_nao_renovar');
    setFinalizeCustomObs('');
  };

  const handleConfirmFinalizeContract = async () => {
    if (!finalizeClientTarget) return;
    setSubmittingFinalize(true);
    try {
      const reasonMap: Record<string, string> = {
        decidiu_nao_renovar: 'Decidiu não renovar o plano',
        mudanca_cidade: 'Mudança de endereço / cidade',
        motivo_financeiro: 'Questões financeiras / orçamento',
        falta_tempo: 'Falta de tempo / rotina de trabalho',
        problema_saude: 'Problemas médicos / recomendação de repouso',
        insatisfacao: 'Insatisfação com o serviço / atendimento',
        outro: finalizeCustomObs.trim() || 'Não especificado'
      };
      const obsFinal = `[Contrato Finalizado em ${new Date().toLocaleDateString('pt-BR')}]: ${reasonMap[finalizeReason] || finalizeReason}${finalizeCustomObs && finalizeReason !== 'outro' ? ` - Obs: ${finalizeCustomObs}` : ''}`;

      const planIdVal = finalizeClientTarget.dadosComerciais?.planoId?._id || finalizeClientTarget.dadosComerciais?.planoId || null;
      const res = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: finalizeClientTarget._id,
          dadosComerciais: {
            ...finalizeClientTarget.dadosComerciais,
            planoId: planIdVal,
            status: 'finalizado',
            observacoesContratuais: `${finalizeClientTarget.dadosComerciais?.observacoesContratuais ? finalizeClientTarget.dadosComerciais.observacoesContratuais + '\n' : ''}${obsFinal}`
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`🏁 Contrato de ${finalizeClientTarget.dadosPessoais?.nome || 'Aluno'} finalizado com sucesso!\nO aluno foi transferido para o status "Finalizados".`);
        setFinalizeClientTarget(null);
        setSelectedClient(null);
        setDcStatus('finalizado');
        fetchData(true);
      } else {
        alert('Erro ao finalizar contrato: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (err: any) {
      alert('Erro de conexão: ' + err.message);
    } finally {
      setSubmittingFinalize(false);
    }
  };

  // States for Data Shielding & Unlock Audit in Workspace
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockJustificativa, setUnlockJustificativa] = useState('');
  const [unlockingClient, setUnlockingClient] = useState(false);
  const [sanitizing, setSanitizing] = useState(false);

  const handleRunSanitization = async () => {
    if (!confirm('Deseja executar a Varredura & Blindagem Geral da base?\n\nEsta rotina irá:\n1. Expurga alunos/mocks de teste (*@clube.com)\n2. Limpar dados fictícios de CPFs e endereços\n3. Trancar/blindar todos os cadastros legítimos remanescentes.')) return;

    setSanitizing(true);
    try {
      const res = await fetch('/api/admin/sanitize-clients', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Varredura & Blindagem Concluída!\n\n• Alunos de Teste/Mocks Removidos: ${data.stats.removedMockCount}\n• Cadastros Reais Sanitizados: ${data.stats.sanitizedRealCount}\n• Cadastros Blindados: ${data.stats.shieldedCount}\n• Total de Alunos Reais Atuais: ${data.stats.totalRemainingClients}`);
        fetchData();
      } else {
        alert('Erro ao executar varredura: ' + data.error);
      }
    } catch (e: any) {
      alert('Erro de conexão: ' + e.message);
    } finally {
      setSanitizing(false);
    }
  };

  const handleUnlockClientData = async () => {
    if (!selectedClient) return;
    if (!unlockJustificativa.trim() || unlockJustificativa.trim().length < 6) {
      alert('Por favor, informe uma justificativa válida com no mínimo 6 caracteres para fins de auditoria.');
      return;
    }

    setUnlockingClient(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedClient._id,
          action: 'unlock_dados',
          justificativa: unlockJustificativa
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Dados cadastrais desbloqueados com sucesso para edição!');
        setSelectedClient(data.data);
        setShowUnlockModal(false);
        setUnlockJustificativa('');
        fetchData(true);
      } else {
        alert('Erro ao desbloquear: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro de conexão: ' + err.message);
    } finally {
      setUnlockingClient(false);
    }
  };

  const handleToggleStatus = (statusKey: string) => {
    setSelectedStatuses(prev => {
      if (prev.includes(statusKey)) {
        return prev.filter(s => s !== statusKey);
      } else {
        return [...prev, statusKey];
      }
    });
  };

  const handleSelectOnlyStatus = (statusKey: string) => {
    setSelectedStatuses([statusKey]);
  };

  const handleSelectAllStatuses = () => {
    setSelectedStatuses(['vigente', 'renovacao', 'vencido', 'aguardando_assinatura', 'lead', 'dynamus', 'finalizado']);
  };

  const handleSelectOnlyActiveOperation = () => {
    setSelectedStatuses(['vigente', 'renovacao', 'vencido', 'aguardando_assinatura', 'lead', 'dynamus']);
  };

  const handleCancelProposal = async (client: any, proposal: any) => {
    if (!confirm(`Deseja cancelar e descartar a proposta comercial pendente de ${client.dadosPessoais?.nome || 'Aluno'}? O aluno retornará ao status anterior.`)) return;
    try {
      const pId = proposal?._id;
      const res = await fetch(`/api/propostas?${pId ? `id=${pId}` : `clientId=${client._id}`}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('Proposta cancelada e descartada com sucesso!');
        fetchData();
        loadContractsAndProposalsOverview();
      } else {
        alert('Erro ao cancelar proposta: ' + data.error);
      }
    } catch (e: any) {
      alert('Erro: ' + e.message);
    }
  };

  const handleManualActivateClient = async (client: any, proposal?: any) => {
    if (!confirm(`Confirmar fechamento manual para ${client.dadosPessoais?.nome || 'Aluno'}? Isso ativará o plano do aluno e concluirá a proposta.`)) return;
    try {
      const todayIso = new Date().toISOString().split('T')[0];
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      const nextYearIso = nextYear.toISOString().split('T')[0];

      const res = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: client._id,
          dadosComerciais: {
            ...(client.dadosComerciais || {}),
            status: 'ativo',
            dataInicio: client.dadosComerciais?.dataInicio || todayIso,
            vencimento: nextYearIso
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        if (proposal?._id) {
          await fetch(`/api/propostas?id=${proposal._id}`, { method: 'DELETE' }).catch(() => {});
        }
        alert('Aluno ativado com sucesso como Contrato Vigente!');
        fetchData();
        loadContractsAndProposalsOverview();
      } else {
        alert('Erro ao ativar aluno: ' + data.error);
      }
    } catch (e: any) {
      alert('Erro: ' + e.message);
    }
  };

  const loadContractsAndProposalsOverview = async () => {
    try {
      const [contractsRes, proposalsRes, paymentsRes] = await Promise.all([
        fetch('/api/contracts').then(r => r.json()).catch(() => ({})),
        fetch('/api/propostas').then(r => r.json()).catch(() => ({})),
        fetch('/api/admin/payments').then(r => r.json()).catch(() => ({}))
      ]);

      if (contractsRes.success && Array.isArray(contractsRes.data)) {
        const cMap: Record<string, any> = {};
        contractsRes.data.forEach((c: any) => {
          const cId = c.clientId?._id || c.clientId;
          if (cId && (!cMap[cId] || new Date(c.createdAt) > new Date(cMap[cId].createdAt))) {
            cMap[cId] = c;
          }
        });
        setAllContractsMap(cMap);
      }

      if (proposalsRes.success && Array.isArray(proposalsRes.data)) {
        const pMap: Record<string, any> = {};
        proposalsRes.data.forEach((p: any) => {
          const cId = p.clientId?._id || p.clientId;
          if (cId && (!pMap[cId] || new Date(p.createdAt) > new Date(pMap[cId].createdAt))) {
            pMap[cId] = p;
          }
        });
        setAllProposalsMap(pMap);
      }

      if (paymentsRes.success && Array.isArray(paymentsRes.data)) {
        const pyMap: Record<string, any[]> = {};
        paymentsRes.data.forEach((p: any) => {
          const cId = p.clientId?._id || p.clientId;
          if (cId) {
            if (!pyMap[cId]) pyMap[cId] = [];
            pyMap[cId].push(p);
          }
        });
        setAllPaymentsMap(pyMap);
      }
    } catch (e) {
      console.warn('Erro ao carregar mapa de contratos e propostas:', e);
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    loadContractsAndProposalsOverview();
  }, [clients]);

  const handleSyncClicksignForClient = async (client: any) => {
    const contract = allContractsMap[client._id];
    if (!contract || !contract.clicksignDocKey) {
      alert('Nenhum envelope da Clicksign encontrado para este aluno.');
      return;
    }
    setSyncingClicksignClientId(client._id);
    try {
      const res = await fetch('/api/clicksign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_doc',
          docKey: contract.clicksignDocKey,
          contractId: contract._id,
          clientId: client._id
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Status da Clicksign sincronizado com sucesso!');
        fetchData();
        loadContractsAndProposalsOverview();
      } else {
        alert('Erro ao sincronizar Clicksign: ' + (data.error || 'Falha na requisição'));
      }
    } catch (err: any) {
      alert('Erro de conexão ao sincronizar: ' + err.message);
    } finally {
      setSyncingClicksignClientId(null);
    }
  };

  // KPIs Financeiros e Operacionais em Tempo Real
  const contractKpis = useMemo(() => {
    let mrrAtivo = 0;
    let receitaEmRisco = 0;
    let inadimplenciaRetida = 0;
    let alunosAtivosCount = 0;

    clients.forEach((c: any) => {
      const com = c.dadosComerciais || {};
      const plan = plans.find(p => p._id === (com.planoId?._id || com.planoId));
      const latestContract = allContractsMap[c._id];
      const latestProposal = allProposalsMap[c._id];
      const clientPy = allPaymentsMap[c._id] || [];
      const stage = resolveClientContractStage(c, plan, latestContract, latestProposal, clientPy);

      const valorMensal = Number(com.valorUnitario) || (plan ? (plan.tipo === 'Anual' ? Number(plan.preco) / 12 : Number(plan.preco)) : 0);

      if (stage.stageKey === 'ativo' || stage.stageKey === 'dynamus') {
        alunosAtivosCount++;
        mrrAtivo += valorMensal;
      } else if (stage.stageKey === 'renovacao') {
        alunosAtivosCount++;
        receitaEmRisco += valorMensal;
      }

      // Inadimplência Asaas
      const overduePayments = clientPy.filter((p: any) => p.status === 'Atrasado');
      overduePayments.forEach((p: any) => {
        inadimplenciaRetida += Number(p.valor || 0);
      });
    });

    return {
      mrrAtivo,
      receitaEmRisco,
      inadimplenciaRetida,
      alunosAtivosCount
    };
  }, [clients, plans, allContractsMap, allProposalsMap, allPaymentsMap]);

  // Contadores dinâmicos calculados em tempo real para todas as pílulas de status
  const stageCounts = useMemo(() => {
    let total = 0;
    let vigente = 0;
    let renovacao = 0;
    let vencido = 0;
    let finalizado = 0;
    let aguardando_assinatura = 0;
    let lead = 0;
    let dynamus = 0;
    let boleto_asaas = 0;
    let incompleto = 0;

    clients.forEach((c: any) => {
      total++;
      const com = c.dadosComerciais || {};
      const plan = plans.find(p => p._id === (com.planoId?._id || com.planoId));
      const latestContract = allContractsMap[c._id];
      const latestProposal = allProposalsMap[c._id];
      const stage = resolveClientContractStage(c, plan, latestContract, latestProposal, allPaymentsMap[c._id]);

      if (stage.stageKey === 'dynamus') dynamus++;
      else if (stage.stageKey === 'ativo') vigente++;
      else if (stage.stageKey === 'renovacao') renovacao++;
      else if (stage.stageKey === 'vencido') vencido++;
      else if (stage.stageKey === 'finalizado') finalizado++;
      else if (stage.stageKey === 'pendente' || stage.stageKey === 'proposta') aguardando_assinatura++;
      else if (stage.stageKey === 'lead') lead++;

      if (stage.isBoleto) boleto_asaas++;
      if (stage.isMissingData) incompleto++;
    });

    return {
      total,
      vigente,
      renovacao,
      vencido,
      finalizado,
      aguardando_assinatura,
      lead,
      dynamus,
      boleto_asaas,
      incompleto
    };
  }, [clients, plans, allContractsMap, allProposalsMap, allPaymentsMap]);

  // Limpeza de todos os filtros de uma vez
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedStatuses(['vigente', 'renovacao', 'vencido', 'aguardando_assinatura', 'lead', 'dynamus']);
    setQuickViewFilter('todos');
    setOrientacaoFilter('todos');
    setFormaPagamentoFilter('todos');
    setContratoPlanFilter('todos');
    setSortOption('vencimento_asc');
  };

  // Computação com busca inteligente multi-termos, filtros combinados de estágio/orientação/pagamento e ordenação
  const sortedClients = useMemo(() => {
    return clients
      .filter((c: any) => {
        const com = c.dadosComerciais || {};
        const plan = plans.find(p => p._id === (com.planoId?._id || com.planoId));
        const latestContract = allContractsMap[c._id];
        const latestProposal = allProposalsMap[c._id];
        const clientPy = allPaymentsMap[c._id];
        const stage = resolveClientContractStage(c, plan, latestContract, latestProposal, clientPy);

        // 1. Smart Search Multi-Terms
        const matchesSearch = smartSearchMatch(searchQuery, [
          c.dadosPessoais?.nome,
          c.dadosPessoais?.cpf,
          c.dadosPessoais?.telefone,
          c.dadosPessoais?.email,
          plan?.nome,
          c.codigo,
          stage.stageLabel,
          stage.orientacaoLabel
        ]);
        if (!matchesSearch) return false;

        // 2. Multi-Status Selection Matrix
        let cat: string = stage.stageKey;
        if (cat === 'ativo') cat = 'vigente';
        if (cat === 'pendente' || cat === 'proposta') cat = 'aguardando_assinatura';

        if (selectedStatuses.length > 0 && !selectedStatuses.includes(cat)) {
          return false;
        }

        // 3. Modos Rápidos de Operação (Quick Views)
        if (quickViewFilter === 'foco_do_dia') {
          if (stage.stageKey !== 'renovacao' && stage.stageKey !== 'proposta') return false;
        } else if (quickViewFilter === 'inadimplentes') {
          if (!stage.info.hasOverdueInstallment && stage.stageKey !== 'vencido') return false;
        } else if (quickViewFilter === 'pendentes_assinatura') {
          if (stage.stageKey !== 'pendente' && stage.stageKey !== 'proposta') return false;
        } else if (quickViewFilter === 'pendencias_cadastrais') {
          if (!stage.isMissingData) return false;
        }

        // 4. Filtro por Orientação / Ação CTA
        if (orientacaoFilter !== 'todos') {
          if (orientacaoFilter === 'gerenciar_dynamus' && stage.orientacaoKey !== 'gerenciar_dynamus') return false;
          if (orientacaoFilter === 'dados_faltantes' && !stage.isMissingData) return false;
          if (orientacaoFilter === 'vigente' && stage.orientacaoKey !== 'vigente' && stage.orientacaoKey !== 'baixar_pdf') return false;
          if (orientacaoFilter === 'gerar_renovacao' && stage.orientacaoKey !== 'gerar_renovacao') return false;
          if (orientacaoFilter === 'finalizado' && stage.orientacaoKey !== 'finalizado') return false;
          if (orientacaoFilter === 'sincronizar_clicksign' && stage.orientacaoKey !== 'sincronizar_clicksign') return false;
          if (orientacaoFilter === 'gerar_asaas' && stage.orientacaoKey !== 'gerar_asaas') return false;
          if (orientacaoFilter === 'reenviar_link' && stage.orientacaoKey !== 'reenviar_link') return false;
          if (orientacaoFilter === 'gerar_link' && stage.orientacaoKey !== 'gerar_link') return false;
        }

        // 5. Filtro por Forma de Pagamento
        if (formaPagamentoFilter !== 'todos') {
          const clientForma = (latestContract?.formaPagamento || com.formaPagamento || '').toLowerCase();
          if (formaPagamentoFilter === 'boleto' && !clientForma.includes('boleto')) return false;
          if (formaPagamentoFilter === 'pix' && !clientForma.includes('pix')) return false;
          if (formaPagamentoFilter === 'cartao' && !clientForma.includes('cartao') && !clientForma.includes('asaas')) return false;
        }

        // 6. Filtro por Plano
        if (contratoPlanFilter !== 'todos') {
          const pId = com.planoId?._id || com.planoId;
          if (pId !== contratoPlanFilter) return false;
        }

        return true;
      })
      .sort((a: any, b: any) => {
        if (sortOption === 'vencimento_asc') {
          const vA = a.dadosComerciais?.vencimento || '9999-12-31';
          const vB = b.dadosComerciais?.vencimento || '9999-12-31';
          return vA.localeCompare(vB);
        }
        if (sortOption === 'vencimento_desc') {
          const vA = a.dadosComerciais?.vencimento || '0000-00-00';
          const vB = b.dadosComerciais?.vencimento || '0000-00-00';
          return vB.localeCompare(vA);
        }
        if (sortOption === 'valor_desc') {
          const valA = Number(a.dadosComerciais?.valorUnitario || 0);
          const valB = Number(b.dadosComerciais?.valorUnitario || 0);
          return valB - valA;
        }
        if (sortOption === 'alfabetico_asc') {
          return (a.dadosPessoais?.nome || '').localeCompare(b.dadosPessoais?.nome || '');
        }
        if (sortOption === 'alfabetico_desc') {
          return (b.dadosPessoais?.nome || '').localeCompare(a.dadosPessoais?.nome || '');
        }
        if (sortOption === 'inicio_desc') {
          const iA = a.dadosComerciais?.dataInicio || a.createdAt || '';
          const iB = b.dadosComerciais?.dataInicio || b.createdAt || '';
          return iB.localeCompare(iA);
        }
        return 0;
      });
  }, [clients, searchQuery, selectedStatuses, quickViewFilter, orientacaoFilter, formaPagamentoFilter, contratoPlanFilter, sortOption, plans, allContractsMap, allProposalsMap, allPaymentsMap]);

  const totalConsolidadoFiltrado = useMemo(() => {
    return sortedClients.reduce((acc: number, curr: any) => {
      const val = Number(curr.dadosComerciais?.valorUnitario) || 0;
      return acc + val;
    }, 0);
  }, [sortedClients]);
  const [generatingPayments, setGeneratingPayments] = useState(false);
  const [renewingValidity, setRenewingValidity] = useState(false);
  const [cancelingRecurrence, setCancelingRecurrence] = useState(false);

  // Form states (Dados Pessoais / Cadastrais do Contratante)
  const [dcNome, setDcNome] = useState('');
  const [dcEmail, setDcEmail] = useState('');
  const [dcCpf, setDcCpf] = useState('');
  const [dcTelefone, setDcTelefone] = useState('');
  const [dcSexo, setDcSexo] = useState('M');
  const [dcNascimento, setDcNascimento] = useState('');
  const [dcEndereco, setDcEndereco] = useState('');
  const [dcNumero, setDcNumero] = useState('');
  const [dcComplemento, setDcComplemento] = useState('');
  const [dcBairro, setDcBairro] = useState('');
  const [dcCidade, setDcCidade] = useState('');
  const [dcEstado, setDcEstado] = useState('');
  const [dcCep, setDcCep] = useState('');

  // Form states (Dados Comerciais)
  const [dcPlano, setDcPlano] = useState('');
  const [dcStatus, setDcStatus] = useState<string>('ativo');
  const [dcFormaPag, setDcFormaPag] = useState('pix');
  const [dcDuracao, setDcDuracao] = useState<'mensal' | 'anual' | 'semana' | 'indeterminado'>('mensal');
  const [dcVigenciaQtd, setDcVigenciaQtd] = useState(1);
  const [dcValorUnitario, setDcValorUnitario] = useState(0);
  const [dcVencimento, setDcVencimento] = useState('');
  const [dcDescontoTipo, setDcDescontoTipo] = useState<'percentual' | 'fixo'>('percentual');
  const [dcDescontoValor, setDcDescontoValor] = useState(0);
  const [dcParcelas, setDcParcelas] = useState(1);
  const [dcDataInicio, setDcDataInicio] = useState('');
  const [dcResponsavelVenda, setDcResponsavelVenda] = useState('');
  const [dcUnidadeContratada, setDcUnidadeContratada] = useState('');
  const [dcObservacoesContratuais, setDcObservacoesContratuais] = useState('');
  const [dcFrequencia, setDcFrequencia] = useState(3);
  const [dcCreditosTotal, setDcCreditosTotal] = useState(0);
  const [dcCreditosMassagem, setDcCreditosMassagem] = useState(0);
  const [dcCreditosEmergencia, setDcCreditosEmergencia] = useState(0);
  const [dcCriarRecorrencia, setDcCriarRecorrencia] = useState(false);
  const [dcRecorrenciaMeses, setDcRecorrenciaMeses] = useState(12);
  const [savingComercial, setSavingComercial] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [issuingContract, setIssuingContract] = useState(false);

  // Modals & Triggers
  const [showTextPreview, setShowTextPreview] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showImportSignedModal, setShowImportSignedModal] = useState(false);
  const [importPdfFile, setImportPdfFile] = useState<File | null>(null);
  const [importPdfBase64, setImportPdfBase64] = useState<string>('');
  const [importPdfName, setImportPdfName] = useState<string>('');
  const [submittingImport, setSubmittingImport] = useState(false);

  // Sales Proposal States
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [generatedProposalUrl, setGeneratedProposalUrl] = useState('');
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [activeProposal, setActiveProposal] = useState<any>(null);

  // Renewal States
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [generatedRenewalUrl, setGeneratedRenewalUrl] = useState('');
  const [generatingRenewalClientId, setGeneratingRenewalClientId] = useState<string | null>(null);
  const [activeRenewal, setActiveRenewal] = useState<any>(null);
  const [renewalTargetClient, setRenewalTargetClient] = useState<any>(null);

  const handleGenerateRenewalLink = async (client: any) => {
    if (generatingRenewalClientId) return;
    setGeneratingRenewalClientId(client._id);
    setRenewalTargetClient(client);
    try {
      const res = await fetch('/api/renovacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client._id })
      });
      const data = await res.json();
      if (data.success && data.data) {
        const url = window.location.origin + '/renovacao/' + data.data._id;
        setGeneratedRenewalUrl(url);
        setActiveRenewal(data.data);
        setShowRenewalModal(true);
      } else {
        alert('Erro ao gerar link de renovação: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro de conexão ao gerar link de renovação: ' + err.message);
    } finally {
      setGeneratingRenewalClientId(null);
    }
  };

  // Asaas Search & Link state
  const [dcAsaasCustomerId, setDcAsaasCustomerId] = useState('');
  const [searchingAsaas, setSearchingAsaas] = useState(false);

  const handleSearchAsaas = async () => {
    if (!selectedClient) return;
    try {
      setSearchingAsaas(true);
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'asaas_search_link',
          clientId: selectedClient._id,
          customCustomerId: dcAsaasCustomerId
        })
      });
      const data = await res.json();
      if (data.success) {
        setDcAsaasCustomerId(data.asaasCustomerId);
        alert(`Sucesso! Cliente vinculado ao Asaas ID: ${data.asaasCustomerId}. Faturas sincronizadas!`);
        fetchData();
        if (selectedClient) loadContracts(selectedClient._id);
      } else {
        alert('Erro ao buscar no Asaas: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro ao buscar no Asaas: ' + err.message);
    } finally {
      setSearchingAsaas(false);
    }
  };

  // ==========================================
  // CENTRAL EXECUTIVA GUIADA POR INTENÇÃO (STATES)
  // ==========================================
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // 1. Consulta Rápida (Somente Leitura)
  const [consultingClient, setConsultingClient] = useState<any>(null);

  // 2. Wizard de Link de Venda / Auto-Cadastro
  const [salesWizardClient, setSalesWizardClient] = useState<any>(null);
  const [swPlano, setSwPlano] = useState('');
  const [swDuracao, setSwDuracao] = useState<'mensal' | 'anual' | 'semana'>('anual');
  const [swVigenciaQtd, setSwVigenciaQtd] = useState(1);
  const [swDataInicio, setSwDataInicio] = useState('');
  const [swValorUnitario, setSwValorUnitario] = useState(0);
  const [swDescontoTipo, setSwDescontoTipo] = useState<'percentual' | 'fixo'>('percentual');
  const [swDescontoValor, setSwDescontoValor] = useState(0);
  const [swFrequencia, setSwFrequencia] = useState(3);
  const [swCreditosMensais, setSwCreditosMensais] = useState(13);
  const [swCreditosMassagem, setSwCreditosMassagem] = useState(0);
  const [swCreditosEmergencia, setSwCreditosEmergencia] = useState(0);
  const [swCriarRecorrenciaMensal, setSwCriarRecorrenciaMensal] = useState(false);
  const [swRecorrenciaMeses, setSwRecorrenciaMeses] = useState(12);
  const [swSubmitting, setSwSubmitting] = useState(false);

  const handleOpenSalesWizard = (client: any) => {
    setSalesWizardClient(client);
    setSwPlano('');
    setSwDuracao('mensal');
    setSwVigenciaQtd(1);
    setSwDataInicio(new Date().toISOString().split('T')[0]);
    setSwValorUnitario(0);
    setSwDescontoTipo('percentual');
    setSwDescontoValor(0);
    setSwFrequencia(3);
    setSwCreditosMensais(12);
    setSwCreditosMassagem(0);
    setSwCreditosEmergencia(0);
    setSwCriarRecorrenciaMensal(false);
    setSwRecorrenciaMeses(12);
  };

  const handleConfirmSalesWizard = async () => {
    if (!salesWizardClient || !swPlano) {
      alert('Por favor, selecione um plano.');
      return;
    }
    if (!swValorUnitario || Number(swValorUnitario) <= 0) {
      alert('Por favor, informe o valor da parcela/mensalidade negociada para esta proposta.');
      return;
    }
    setSwSubmitting(true);
    try {
      const plan = plans.find(p => p._id === swPlano);
      const grossPrice = swValorUnitario * swVigenciaQtd;
      let discountDeduction = 0;
      if (swDescontoTipo === 'percentual') {
        discountDeduction = (grossPrice * (Number(swDescontoValor) || 0)) / 100;
      } else {
        discountDeduction = Number(swDescontoValor) || 0;
      }
      const calculatedValorLiquido = Math.max(0, grossPrice - discountDeduction);

      const isAnual = swDuracao === 'anual';
      const startD = new Date((swDataInicio || new Date().toISOString().split('T')[0]) + 'T00:00:00');
      const endD = new Date(startD);
      if (swDuracao === 'semana') {
        endD.setDate(endD.getDate() + (swVigenciaQtd * 7));
      } else if (isAnual) {
        endD.setMonth(endD.getMonth() + (swVigenciaQtd * 12));
      } else {
        endD.setMonth(endD.getMonth() + swVigenciaQtd);
      }
      const dataFimCalculada = endD.toISOString().split('T')[0];

      // 1. Criar Proposta Comercial
      const payload = {
        clientId: salesWizardClient._id,
        planoId: swPlano,
        planoNome: plan?.nome || '',
        valorAcordado: calculatedValorLiquido,
        creditosMensais: swCreditosMensais,
        creditosMassagem: swCreditosMassagem,
        creditosEmergencia: swCreditosEmergencia,
        frequencia: swFrequencia,
        duracao: swDuracao,
        valorUnitario: swValorUnitario,
        vigenciaQtd: swVigenciaQtd,
        dataInicio: swDataInicio || new Date().toISOString().split('T')[0],
        criarRecorrenciaMensal: swCriarRecorrenciaMensal,
        recorrenciaMeses: swCriarRecorrenciaMensal ? swRecorrenciaMeses : 1,
        descontoTipo: swDescontoTipo,
        descontoValor: swDescontoValor,
        observacoesContratuais: '',
        unidadeContratada: plan?.unidadeAtendimento || ''
      };

      const res = await fetch('/api/propostas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success && data.data) {
        const url = window.location.origin + '/vendas/' + data.data._id;
        setGeneratedProposalUrl(url);
        setSelectedClient(salesWizardClient);
        setShowProposalModal(true);
        setActiveProposal(data.data);
        setSalesWizardClient(null);
        fetchData(true);
      } else {
        alert('Erro ao gerar link de venda: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (err: any) {
      alert('Erro de conexão: ' + err.message);
    } finally {
      setSwSubmitting(false);
    }
  };

  // 3. Wizard de Emissão Direta de Contrato & Clicksign
  const [directContractClient, setDirectContractClient] = useState<any>(null);
  const [dcwStep, setDcwStep] = useState(1);
  const [dcwPlano, setDcwPlano] = useState('');
  const [dcwDuracao, setDcwDuracao] = useState<'mensal' | 'anual' | 'semana'>('anual');
  const [dcwVigenciaQtd, setDcwVigenciaQtd] = useState(1);
  const [dcwDataInicio, setDcwDataInicio] = useState('');
  const [dcwValorUnitario, setDcwValorUnitario] = useState(0);
  const [dcwDescontoTipo, setDcwDescontoTipo] = useState<'percentual' | 'fixo'>('percentual');
  const [dcwDescontoValor, setDcwDescontoValor] = useState(0);
  const [dcwFrequencia, setDcwFrequencia] = useState(3);
  const [dcwCreditosMensais, setDcwCreditosMensais] = useState(13);
  const [dcwCreditosMassagem, setDcwCreditosMassagem] = useState(0);
  const [dcwCreditosEmergencia, setDcwCreditosEmergencia] = useState(0);
  const [dcwFormaPag, setDcwFormaPag] = useState('pix');
  const [dcwParcelas, setDcwParcelas] = useState(1);
  const [dcwVencimento, setDcwVencimento] = useState('');
  const [dcwCriarRecorrencia, setDcwCriarRecorrencia] = useState(false);
  const [dcwRecorrenciaMeses, setDcwRecorrenciaMeses] = useState(12);
  const [dcwSubmitting, setDcwSubmitting] = useState(false);

  const handleOpenDirectContractWizard = (client: any) => {
    const com = client.dadosComerciais || {};
    const activePlans = plans.filter((p: any) => p.ativo !== false);
    const defaultPlanId = com.planoId?._id || com.planoId || (activePlans[0]?._id || (plans[0]?._id || ''));
    const planObj = plans.find(p => p._id === defaultPlanId) || activePlans[0] || plans[0];
    const freq = com.frequencia || client.frequencia || 2;
    const defaultCreditos = com.creditosTotal !== undefined ? com.creditosTotal : (freq === 1 ? 4 : freq === 2 ? 9 : freq === 3 ? 13 : freq === 4 ? 17 : 22);
    const isAnual = (com.duracao || (planObj?.tipo === 'Anual' ? 'anual' : 'mensal')) === 'anual';

    setDirectContractClient(client);
    setDcwStep(1);
    setDcwPlano(defaultPlanId);
    setDcwDuracao(com.duracao || (planObj?.tipo === 'Anual' ? 'anual' : 'mensal'));
    setDcwVigenciaQtd(isAnual ? 1 : (com.duracaoQtd || 1));
    setDcwDataInicio(com.dataInicio || new Date().toISOString().split('T')[0]);
    setDcwValorUnitario(com.valorUnitario !== undefined ? com.valorUnitario : (planObj?.preco || 0));
    setDcwDescontoTipo(com.descontoTipo || 'percentual');
    setDcwDescontoValor(com.descontoValor || 0);
    setDcwFrequencia(freq);
    setDcwCreditosMensais(defaultCreditos);
    setDcwCreditosMassagem(com.creditosMassagem !== undefined ? com.creditosMassagem : (isAnual ? 1 : 0));
    setDcwCreditosEmergencia(com.creditosEmergencia !== undefined ? com.creditosEmergencia : (isAnual ? 1 : 0));
    setDcwFormaPag(com.formaPagamento || 'pix');
    setDcwParcelas(com.parcelas || 1);
    setDcwVencimento(com.dataPrimeiroVencimento || com.dataInicio || new Date().toISOString().split('T')[0]);
    setDcwCriarRecorrencia(Boolean(com.criarRecorrenciaMensal));
    setDcwRecorrenciaMeses(com.recorrenciaMeses || 12);
  };

  const handleConfirmDirectContract = async (action: 'save' | 'clicksign' | 'pdf') => {
    if (!directContractClient || !dcwPlano) {
      alert('Por favor, selecione um plano válido.');
      return;
    }
    setDcwSubmitting(true);
    try {
      const plan = plans.find(p => p._id === dcwPlano);
      const isAnual = dcwDuracao === 'anual';
      const startD = new Date((dcwDataInicio || new Date().toISOString().split('T')[0]) + 'T00:00:00');
      const endD = new Date(startD);
      if (dcwDuracao === 'semana') {
        endD.setDate(endD.getDate() + (dcwVigenciaQtd * 7));
      } else if (isAnual) {
        endD.setMonth(endD.getMonth() + (dcwVigenciaQtd * 12));
      } else {
        endD.setMonth(endD.getMonth() + dcwVigenciaQtd);
      }
      const dataFimCalculada = endD.toISOString().split('T')[0];

      const grossPrice = dcwValorUnitario * dcwVigenciaQtd;
      let discountDeduction = 0;
      if (dcwDescontoTipo === 'percentual') {
        discountDeduction = (grossPrice * (Number(dcwDescontoValor) || 0)) / 100;
      } else {
        discountDeduction = Number(dcwDescontoValor) || 0;
      }
      const calculatedValorLiquido = Math.max(0, grossPrice - discountDeduction);

      const clientUpdatePayload = {
        id: directContractClient._id,
        dadosComerciais: {
          planoId: dcwPlano,
          status: 'ativo',
          formaPagamento: dcwFormaPag,
          duracao: dcwDuracao,
          duracaoQtd: dcwVigenciaQtd,
          valorUnitario: dcwValorUnitario,
          vencimento: dataFimCalculada,
          dataPrimeiroVencimento: dcwVencimento || dcwDataInicio,
          descontoTipo: dcwDescontoTipo,
          descontoValor: dcwDescontoValor,
          parcelas: dcwParcelas,
          dataInicio: dcwDataInicio,
          frequencia: dcwFrequencia,
          creditosTotal: dcwCreditosMensais,
          creditosMassagem: dcwCreditosMassagem,
          creditosMassagemTotal: dcwCreditosMassagem,
          creditosEmergencia: dcwCreditosEmergencia,
          creditosEmergenciaTotal: dcwCreditosEmergencia,
          criarRecorrenciaMensal: dcwCriarRecorrencia,
          recorrenciaMeses: dcwRecorrenciaMeses
        }
      };

      const res = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientUpdatePayload)
      });
      const resText = await res.text();
      let resData: any = {};
      try { resData = JSON.parse(resText); } catch { resData = { success: false, error: resText }; }
      if (!resData.success) {
        alert('Erro ao salvar dados comerciais: ' + (resData.error || 'Erro desconhecido'));
        return;
      }

      if (action === 'clicksign') {
        let pdfBase64 = '';
        try {
          pdfBase64 = await getContractPDFBase64(directContractClient, plan, '', clientUpdatePayload.dadosComerciais);
        } catch {}

        const signRes = await fetch('/api/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: directContractClient._id,
            planoId: dcwPlano,
            dataInicio: dcwDataInicio,
            formaPagamento: dcwFormaPag,
            parcelas: dcwParcelas,
            dataPrimeiroVencimento: dcwVencimento || dcwDataInicio,
            valorBruto: grossPrice,
            descontoTipo: dcwDescontoTipo,
            descontoValor: dcwDescontoValor,
            valorLiquido: calculatedValorLiquido,
            duracao: dcwDuracao,
            duracaoQtd: dcwVigenciaQtd,
            frequencia: dcwFrequencia,
            creditosTotal: dcwCreditosMensais,
            enviarClicksign: true,
            contratoPdfBase64: pdfBase64,
            usuarioEmissor: userCargo || 'Administração'
          })
        });
        const signText = await signRes.text();
        let signData: any = {};
        try { signData = JSON.parse(signText); } catch { signData = { success: false, error: signText }; }
        if (signData.success) {
          alert('Contrato emitido e enviado com sucesso para a Clicksign!');
        } else {
          alert('Dados comerciais salvos, mas houve aviso na emissão: ' + (signData.error || 'Erro na comunicação'));
        }
      } else if (action === 'pdf') {
        downloadContractPDF(directContractClient, plan, '', clientUpdatePayload.dadosComerciais);
        alert('Contrato atualizado e download do PDF iniciado!');
      } else {
        alert('Dados comerciais atualizados com sucesso!');
      }

      setDirectContractClient(null);
      fetchData();
    } catch (err: any) {
      alert('Erro ao processar: ' + err.message);
    } finally {
      setDcwSubmitting(false);
    }
  };

  // 4. Modal de Busca e Sincronização no Asaas
  const [asaasModalClient, setAsAsaasModalClient] = useState<any>(null);
  const [asaasModalCusId, setAsaasModalCusId] = useState('');
  const [asaasModalSubmitting, setAsaasModalSubmitting] = useState(false);

  const handleOpenAsaasModal = (client: any) => {
    setAsAsaasModalClient(client);
    setAsaasModalCusId(client.dadosComerciais?.asaasCustomerId || '');
  };

  const handleConfirmAsaasSync = async () => {
    if (!asaasModalClient) return;
    setAsaasModalSubmitting(true);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'asaas_search_link',
          clientId: asaasModalClient._id,
          customCustomerId: asaasModalCusId
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Sucesso! Cliente vinculado ao Asaas ID: ${data.asaasCustomerId}. Faturas sincronizadas!`);
        setAsAsaasModalClient(null);
        fetchData();
      } else {
        alert('Erro ao buscar no Asaas: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro ao buscar no Asaas: ' + err.message);
    } finally {
      setAsaasModalSubmitting(false);
    }
  };

  const handleGenerateProposalLink = async () => {
    if (!selectedClient) return;
    if (!dcPlano) {
      alert('Por favor, selecione o plano no formulário antes de gerar a proposta.');
      return;
    }
    setGeneratingProposal(true);
    try {
      const plan = plans.find(p => p._id === dcPlano);
      const calculatedValorLiquido = dcValorUnitario * dcVigenciaQtd;
      
      const payload = {
        clientId: selectedClient._id,
        planoId: dcPlano,
        valorAcordado: calculatedValorLiquido,
        creditosMensais: dcFrequencia * 4 + 1,
        frequencia: dcFrequencia,
        duracao: dcDuracao,
        valorUnitario: dcValorUnitario,
        vigenciaQtd: dcVigenciaQtd,
        dataInicio: dcDataInicio,
        criarRecorrenciaMensal: dcCriarRecorrencia,
        recorrenciaMeses: dcRecorrenciaMeses,
        descontoTipo: dcDescontoTipo,
        descontoValor: dcDescontoValor,
        observacoesContratuais: dcObservacoesContratuais,
        unidadeContratada: dcUnidadeContratada || plan?.unidadeAtendimento || ''
      };

      const res = await fetch('/api/propostas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        const url = window.location.origin + '/vendas/' + data.data._id;
        setGeneratedProposalUrl(url);
        setShowProposalModal(true);
        setActiveProposal(data.data);
      } else {
        alert('Erro ao gerar link de venda: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro de conexão ao gerar proposta: ' + err.message);
    } finally {
      setGeneratingProposal(false);
    }
  };

  const handlePdfFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Por favor, selecione um arquivo no formato PDF.');
      return;
    }
    setImportPdfFile(file);
    setImportPdfName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImportPdfBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImportSignedContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    const plan = plans.find(p => p._id === dcPlano);
    if (!plan) {
      alert('Por favor, selecione um plano comercial.');
      return;
    }

    try {
      setSubmittingImport(true);

      const isAnual = dcDuracao === 'anual' || plan.tipo === 'Anual' || (plan.nome || '').toLowerCase().includes('anual');
      const bruto = isAnual ? dcValorUnitario : (dcValorUnitario * dcVigenciaQtd);
      const descVal = Number(dcDescontoValor) || 0;
      let liquido = bruto;
      if (dcDescontoTipo === 'percentual') {
        liquido = bruto * (1 - descVal / 100);
      } else {
        liquido = Math.max(0, bruto - descVal);
      }

      const endD = new Date((dcDataInicio || new Date().toISOString().split('T')[0]) + 'T00:00:00');
      if (dcDuracao === 'semana') {
        endD.setDate(endD.getDate() + (dcVigenciaQtd * 7));
      } else if (dcDuracao === 'anual') {
        endD.setMonth(endD.getMonth() + (dcVigenciaQtd * 12));
      } else {
        endD.setMonth(endD.getMonth() + dcVigenciaQtd);
      }
      const dataFimCalculada = endD.toISOString().split('T')[0];

      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient._id,
          planoId: dcPlano,
          planoNome: plan.nome,
          planoTipo: isAnual ? 'Anual' : 'Mensal',
          valorBruto: bruto,
          descontoTipo: dcDescontoTipo,
          descontoValor: descVal,
          valorLiquido: liquido,
          formaPagamento: dcFormaPag,
          parcelas: dcParcelas,
          dataPrimeiroVencimento: dcVencimento || dcDataInicio,
          dataInicio: dcDataInicio,
          dataFim: dataFimCalculada,
          vigenciaMeses: dcVigenciaQtd,
          frequencia: dcFrequencia,
          creditosTotal: dcCreditosTotal,
          status: 'assinado',
          clicksignStatus: 'assinado',
          assinaturaNome: 'Importado / Já Assinado Anteriormente',
          contratoAnexo: importPdfBase64,
          usuarioEmissor: 'Sistema / Importação Manual'
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('Contrato existente importado e ativado com sucesso!');
        setShowImportSignedModal(false);
        setImportPdfFile(null);
        setImportPdfBase64('');
        setImportPdfName('');
        setSelectedClient({
          ...selectedClient,
          dadosComerciais: {
            ...selectedClient.dadosComerciais,
            planoId: dcPlano,
            status: 'ativo',
            vencimento: dataFimCalculada,
            dataInicio: dcDataInicio
          }
        });
        loadContracts(selectedClient._id);
        fetchData();
      } else {
        alert('Erro ao registrar contrato: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro ao registrar contrato: ' + err.message);
    } finally {
      setSubmittingImport(false);
    }
  };

  // Presential Signature Modal Canvas states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [sigName, setSigName] = useState('');
  const [sigConsent, setSigConsent] = useState(false);
  const [submittingSignature, setSubmittingSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventDefault = (e: TouchEvent) => {
      e.preventDefault();
    };

    canvas.addEventListener('touchstart', preventDefault, { passive: false });
    canvas.addEventListener('touchmove', preventDefault, { passive: false });
    canvas.addEventListener('touchend', preventDefault, { passive: false });
    canvas.addEventListener('touchcancel', preventDefault, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', preventDefault);
      canvas.removeEventListener('touchmove', preventDefault);
      canvas.removeEventListener('touchend', preventDefault);
      canvas.removeEventListener('touchcancel', preventDefault);
    };
  }, [showSignatureModal]);

  useEffect(() => {
    if (selectedClient && clients) {
      const updated = clients.find(c => c._id === selectedClient._id);
      if (updated) {
        setSelectedClient(updated);
      }
    }
  }, [clients]);

  // Load contracts for selected client
  const loadContracts = async (clientId: string, silent = false) => {
    try {
      if (!silent) setLoadingContracts(true);
      const res = await fetch(`/api/contracts?clientId=${clientId}`);
      const data = await res.json();
      if (data.success) {
        setContracts(data.data);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico de contratos:', err);
    } finally {
      if (!silent) setLoadingContracts(false);
    }
  };

  // Auto-polling for pending contracts on active client view (stable timer without UI flicker)
  useEffect(() => {
    if (!selectedClient?._id) return;

    const interval = setInterval(() => {
      const hasPending = contracts.some(c => c.clicksignDocKey && (c.status === 'pendente' || c.clicksignStatus === 'pendente'));
      if (hasPending) {
        loadContracts(selectedClient._id, true);
        fetchData(true);
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [selectedClient?._id]);

  // Sync clicksign status
  const handleSyncClicksign = async (contractId: string) => {
    try {
      const res = await fetch(`/api/clicksign?id=${contractId}`);
      const data = await res.json();
      if (data.success) {
        if (data.data?.status === 'assinado' || data.data?.clicksignStatus === 'assinado') {
          alert('✅ Contrato assinado confirmado na Clicksign! O plano do aluno foi ativado com sucesso.');
        } else {
          alert('Status atual na Clicksign: ' + (data.data?.clicksignStatus || data.data?.status || 'Pendente'));
        }
        if (selectedClient) {
          await loadContracts(selectedClient._id);
          fetchData();
        }
      } else {
        alert('Erro ao sincronizar: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro ao sincronizar: ' + err.message);
    }
  };

  // Confirm / Mark contract as Assinado and activate client plan
  const handleConfirmSignContract = async (contractId: string) => {
    if (!selectedClient) return;
    if (!confirm('Deseja marcar este contrato como Assinado e ativar o plano do aluno?')) return;
    try {
      const res = await fetch('/api/contracts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contractId,
          action: 'sign',
          assinaturaNome: selectedClient.dadosPessoais?.nome || 'Assinado Manualmente'
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Contrato marcado como Assinado e plano do aluno ativado com sucesso!');
        setSelectedClient({
          ...selectedClient,
          dadosComerciais: {
            ...selectedClient.dadosComerciais,
            status: 'ativo'
          }
        });
        await loadContracts(selectedClient._id);
        await fetchData();
      } else {
        alert('Erro ao ativar contrato: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  // Cancel clicksign/manual contract
  const handleCancelContract = async (contractId: string, clientNome: string) => {
    if (!confirm(`Cancelar o contrato de ${clientNome}? Esta ação não pode ser desfeita.`)) return;
    try {
      const res = await fetch(`/api/clicksign?id=${contractId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('Contrato cancelado com sucesso!');
        if (selectedClient) loadContracts(selectedClient._id);
        fetchData();
      } else {
        alert('Erro ao cancelar: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro ao cancelar: ' + err.message);
    }
  };

  // Select client workspace
  const handleSelectClient = (client: any) => {
    setSelectedClient(client);
    const com = client.dadosComerciais || {};
    const pes = client.dadosPessoais || {};

    setDcNome(pes.nome || client.nome || '');
    setDcEmail(pes.email || client.email || '');
    setDcCpf(pes.cpf || '');
    setDcTelefone(pes.telefone || '');
    setDcSexo(pes.sexo || 'M');
    setDcNascimento(pes.dataNascimento || pes.nascimento || '');
    setDcEndereco(pes.endereco || '');
    setDcNumero(pes.numero || '');
    setDcComplemento(pes.complemento || '');
    setDcBairro(pes.bairro || '');
    setDcCidade(pes.cidade || '');
    setDcEstado(pes.estado || '');
    setDcCep(pes.cep || '');
    
    setDcPlano(com.planoId?._id || com.planoId || '');
    setDcStatus(com.status || 'lead');
    setDcFormaPag(com.formaPagamento || 'pix');

    const planObj = plans.find(p => p._id === (com.planoId?._id || com.planoId));
    const isAnual = com.duracao === 'anual' || planObj?.tipo === 'Anual' || planObj?.nome?.toLowerCase().includes('anual');
    setDcDuracao(isAnual ? 'anual' : (com.duracao || 'mensal'));
    setDcVigenciaQtd(isAnual ? 1 : (com.duracaoQtd || 1));

    setDcValorUnitario(com.valorUnitario || 0);
    setDcVencimento(com.dataPrimeiroVencimento || com.dataInicio || new Date().toISOString().split('T')[0]);
    setDcDescontoTipo(com.descontoTipo || 'percentual');
    setDcDescontoValor(com.descontoValor || 0);
    setDcParcelas(com.parcelas || 1);
    setDcDataInicio(com.dataInicio || new Date().toISOString().split('T')[0]);
    setDcResponsavelVenda(com.responsavelVenda || '');
    setDcUnidadeContratada(com.unidadeContratada || '');
    setDcObservacoesContratuais(com.observacoesContratuais || '');
    setDcFrequencia(com.frequencia || client.frequencia || 3);
    setDcCreditosTotal(com.creditosTotal || 0);
    setDcCreditosMassagem(com.creditosMassagemTotal || (com.duracao === 'anual' ? 1 : 0));
    setDcCreditosEmergencia(com.creditosEmergenciaTotal || (com.duracao === 'anual' ? 1 : 0));
    setDcCriarRecorrencia(Boolean(com.criarRecorrenciaMensal));
    setDcRecorrenciaMeses(com.recorrenciaMeses || 12);
    setDcAsaasCustomerId(com.asaasCustomerId || '');

    // Fetch active proposals for this client
    setActiveProposal(null);
    fetch(`/api/propostas?clientId=${client._id}`)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data && json.data.length > 0) {
          setActiveProposal(json.data[0]); // latest proposal
        }
      })
      .catch(() => {});

    loadContracts(client._id);
  };

  // Save commercial data to client profile
  const handleSaveComercial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    try {
      setSavingComercial(true);

      const isAnual = dcDuracao === 'anual';
      const startD = new Date((dcDataInicio || new Date().toISOString().split('T')[0]) + 'T00:00:00');
      const endD = new Date(startD);
      if (dcDuracao === 'semana') {
        endD.setDate(endD.getDate() + (dcVigenciaQtd * 7));
      } else if (isAnual) {
        endD.setMonth(endD.getMonth() + (dcVigenciaQtd * 12));
      } else {
        endD.setMonth(endD.getMonth() + dcVigenciaQtd);
      }
      const dataFimCalculada = endD.toISOString().split('T')[0];

      const isLocked = selectedClient.bloqueioCadastral?.bloqueado !== false;
      const payload: any = {
        id: selectedClient._id,
        dadosComerciais: {
          planoId: dcPlano || null,
          status: dcStatus || 'ativo',
          formaPagamento: dcFormaPag,
          duracao: dcDuracao,
          duracaoQtd: dcVigenciaQtd,
          valorUnitario: dcValorUnitario,
          vencimento: dataFimCalculada,
          dataPrimeiroVencimento: dcVencimento,
          descontoTipo: dcDescontoTipo,
          descontoValor: dcDescontoValor,
          parcelas: dcParcelas,
          dataInicio: dcDataInicio,
          observacoesContratuais: dcObservacoesContratuais,
          frequencia: dcFrequencia,
          creditosTotal: dcCreditosTotal,
          creditosMassagemTotal: dcCreditosMassagem,
          creditosEmergenciaTotal: dcCreditosEmergencia,
          criarRecorrenciaMensal: dcCriarRecorrencia,
          recorrenciaMeses: dcRecorrenciaMeses,
          asaasCustomerId: dcAsaasCustomerId
        }
      };

      if (!isLocked) {
        payload.dadosPessoais = {
          nome: dcNome,
          email: dcEmail,
          cpf: dcCpf,
          telefone: dcTelefone,
          sexo: dcSexo,
          dataNascimento: dcNascimento,
          endereco: dcEndereco,
          numero: dcNumero,
          complemento: dcComplemento,
          bairro: dcBairro,
          cidade: dcCidade,
          estado: dcEstado,
          cep: dcCep
        };
      }

      const res = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSelectedClient(data.data);
        fetchData(true);
        setSaveSuccess(true);
        setSaveError('');
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError('Erro ao salvar: ' + data.error);
        setTimeout(() => setSaveError(''), 4000);
      }
    } catch (err: any) {
      setSaveError('Erro ao salvar: ' + err.message);
      setTimeout(() => setSaveError(''), 4000);
    } finally {
      setSavingComercial(false);
    }
  };

  // Explicitly generate payment installments for Controle Financeiro
  const handleGeneratePaymentsExplicitly = async () => {
    if (!selectedClient) return;
    try {
      setGeneratingPayments(true);
      // First save commercial data to ensure profile is synced
      await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedClient._id,
          dadosComerciais: {
            planoId: dcPlano || null,
            status: dcStatus || 'ativo',
            formaPagamento: dcFormaPag,
            duracao: dcDuracao,
            duracaoQtd: dcVigenciaQtd,
            valorUnitario: dcValorUnitario,
            vencimento: dcVencimento,
            dataPrimeiroVencimento: dcVencimento,
            descontoTipo: dcDescontoTipo,
            descontoValor: dcDescontoValor,
            parcelas: dcParcelas,
            dataInicio: dcDataInicio,
            observacoesContratuais: dcObservacoesContratuais,
            frequencia: dcFrequencia,
            creditosTotal: dcCreditosTotal,
            creditosMassagemTotal: dcCreditosMassagem,
            creditosEmergenciaTotal: dcCreditosEmergencia
          }
        })
      });

      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_local_payments', clientId: selectedClient._id })
      });
      const data = await res.json();
      if (data.success) {
        const bruto = dcValorUnitario * dcVigenciaQtd;
        let liq = bruto;
        if (dcDescontoTipo === 'percentual') {
          liq = bruto * (1 - (Number(dcDescontoValor) || 0) / 100);
        } else {
          liq = Math.max(0, bruto - (Number(dcDescontoValor) || 0));
        }
        const totalCount = dcCriarRecorrencia ? dcRecorrenciaMeses : (Number(dcParcelas) || 1);
        const valParc = dcCriarRecorrencia ? liq : (liq / totalCount);
        const vencFmt = dcVencimento ? new Date(dcVencimento + 'T00:00:00').toLocaleDateString('pt-BR') : 'Hoje';
        
        alert(`✅ Sucesso!\n\nFoi(ram) lançada(s) ${totalCount} parcela(s) ${dcCriarRecorrencia ? 'mensais recorrentes ' : ''}no valor de R$ ${valParc.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cada no Controle Financeiro.\n(1º Vencimento: ${vencFmt})`);
      } else {
        alert('Erro ao lançar parcelas: ' + (data.error || 'Falha na requisição'));
      }
    } catch (err: any) {
      alert('Erro ao lançar parcelas: ' + err.message);
    } finally {
      setGeneratingPayments(false);
    }
  };

  // Explicitly renew contract validity by +1 cycle for Admin/Reception
  const handleRenewContractValidity = async (clientTarget: any) => {
    if (!clientTarget) return;
    const clientNome = clientTarget.dadosPessoais?.nome || 'Aluno';
    if (!confirm(`Deseja estender a vigência comercial de ${clientNome} em +1 ciclo e lançar a nova parcela no Financeiro?`)) return;

    try {
      setRenewingValidity(true);
      const res = await fetch('/api/contracts/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: clientTarget._id })
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Vigência Renovada com Sucesso!\n\nAluno: ${clientNome}\nNovo Vencimento da Vigência: ${data.data.vencimentoFormatado}\n\nA nova parcela no valor de R$ ${data.data.pagamento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} foi lançada no Controle Financeiro!`);
        fetchData();
        if (selectedClient && selectedClient._id === clientTarget._id) {
          setSelectedClient({
            ...selectedClient,
            dadosComerciais: {
              ...selectedClient.dadosComerciais,
              vencimento: data.data.novoVencimento
            }
          });
          setDcVencimento(data.data.novoVencimento);
        }
      } else {
        alert('Erro ao renovar vigência: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro ao renovar vigência: ' + err.message);
    } finally {
      setRenewingValidity(false);
    }
  };

  // Finalize/Cancel client plan recurrence
  const handleCancelRecurrence = async (clientTarget: any) => {
    if (!clientTarget) return;
    const clientNome = clientTarget.dadosPessoais?.nome || 'Aluno';
    if (!confirm(`Deseja realmente finalizar a recorrência de parcelas e vigência para o aluno ${clientNome}?`)) return;

    try {
      setCancelingRecurrence(true);
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel_recurrence', clientId: clientTarget._id })
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Recorrência finalizada com sucesso para ${clientNome}!`);
        fetchData();
        if (selectedClient && selectedClient._id === clientTarget._id) {
          setSelectedClient({
            ...selectedClient,
            dadosComerciais: {
              ...selectedClient.dadosComerciais,
              criarRecorrenciaMensal: false,
              recorrenciaVigencia: false
            }
          });
          setDcCriarRecorrencia(false);
        }
      } else {
        alert('Erro ao finalizar recorrência: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro ao finalizar recorrência: ' + err.message);
    } finally {
      setCancelingRecurrence(false);
    }
  };

  // Generate dynamic contract HTML text
  const generateContractText = () => {
    const plan = plans.find(p => p._id === dcPlano);
    if (!plan) return '<p style="color:var(--color-danger);font-weight:bold;">Selecione um plano comercial na coluna da esquerda para gerar a minuta do contrato.</p>';

    const pes = selectedClient.dadosPessoais || {};

    return getUnifiedTemplate({
      clientNome: pes.nome || '',
      clientCpf: pes.cpf || '',
      clientEmail: pes.email,
      clientTelefone: pes.telefone,
      clientEndereco: pes.endereco,
      clientNumero: pes.numero,
      clientComplemento: pes.complemento,
      clientBairro: pes.bairro,
      clientCidade: pes.cidade,
      clientEstado: pes.estado,
      clientCep: pes.cep,
      planNome: plan.nome,
      planPreco: (dcValorUnitario * dcVigenciaQtd) || plan.preco || 0,
      planTipo: plan.tipo,
      descontoTipo: dcDescontoTipo,
      descontoValor: dcDescontoValor,
      parcelas: dcParcelas,
      formaPagamento: dcFormaPag,
      dataInicio: dcDataInicio,
      dataVencimento: dcVencimento,
      observacoesContratuais: dcObservacoesContratuais,
      unidadeContratada: dcUnidadeContratada || plan.unidadeAtendimento,
      creditosMensais: dcCreditosTotal,
      duracao: dcDuracao,
      vigenciaQtd: dcVigenciaQtd,
      criarRecorrenciaMensal: dcCriarRecorrencia,
      recorrenciaMeses: dcRecorrenciaMeses
    });
  };

  // Submit contract (clicksSign, manual pending, or direct signed)
  const handleIssueContract = async (status: 'pendente' | 'clicksign') => {
    const validation = validateContractClientData(selectedClient);
    if (!validation.isValid) {
      alert(`Não é possível emitir o contrato. Os seguintes dados obrigatórios do aluno estão ausentes:\n\n• ${validation.missingFields.join('\n• ')}\n\nPor favor, complete o cadastro na aba "Dados Pessoais" primeiro.`);
      return;
    }

    const plan = plans.find(p => p._id === dcPlano);
    if (!plan) {
      alert('Selecione um plano comercial.');
      return;
    }

    const isClicksign = status === 'clicksign';
    let pdfBase64 = '';

    if (isClicksign) {
      const cleanPhone = (selectedClient.dadosPessoais?.telefone || '').replace(/\D/g, '');
      if (!selectedClient.dadosPessoais?.telefone || cleanPhone.length < 10) {
        alert('Para enviar via Clicksign (WhatsApp), o aluno deve possuir um número de celular cadastrado com DDD (mínimo 10 dígitos). Por favor, complete o cadastro do aluno na aba "Dados Pessoais".');
        return;
      }
      try {
        pdfBase64 = await getContractPDFBase64(
          {
            ...selectedClient,
            dadosComerciais: {
              planoId: dcPlano,
              formaPagamento: dcFormaPag,
              duracao: dcDuracao,
              vencimento: dcVencimento,
              descontoTipo: dcDescontoTipo,
              descontoValor: dcDescontoValor,
              parcelas: dcParcelas,
              dataInicio: dcDataInicio,
              responsavelVenda: dcResponsavelVenda,
              unidadeContratada: dcUnidadeContratada,
              observacoesContratuais: dcObservacoesContratuais
            }
          },
          plan,
          generateContractText()
        );
      } catch (err: any) {
        alert('Erro ao gerar o PDF para a Clicksign: ' + err.message);
        return;
      }
    }

    const payload = {
      clientId: selectedClient._id,
      planoId: dcPlano,
      descontoTipo: dcDescontoTipo,
      descontoValor: dcDescontoValor,
      parcelas: dcParcelas,
      formaPagamento: dcFormaPag,
      dataPrimeiroVencimento: dcVencimento,
      dataInicio: dcDataInicio,
      responsavelVenda: dcResponsavelVenda,
      unidadeContratada: dcUnidadeContratada,
      observacoesContratuais: dcObservacoesContratuais,
      status: isClicksign ? 'pendente' : 'pendente',
      contratoTexto: generateContractText(),
      usuarioEmissor: userCargo,
      enviarClicksign: isClicksign,
      enviarAsaas: false,
      contratoPdfBase64: pdfBase64,
      frequencia: dcFrequencia,
      creditosTotal: dcCreditosTotal
    };

    try {
      setIssuingContract(true);
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert(isClicksign ? 'Contrato enviado com sucesso para o WhatsApp do aluno e E-mail da clínica via Clicksign!' : 'Contrato pendente gerado!');
        loadContracts(selectedClient._id);
        fetchData();
      } else {
        alert('Erro ao gerar contrato: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
    } finally {
      setIssuingContract(false);
    }
  };

  // HTML5 Canvas Drawing functions for Presential Touch Signature
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getMouseCoords(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getMouseCoords(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getTouchCoords(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const coords = getTouchCoords(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  const getMouseCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const getTouchCoords = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Open signature canvas modal
  const handleOpenSignatureModal = () => {
    const plan = plans.find(p => p._id === dcPlano);
    if (!plan) {
      alert('Por favor, selecione um plano comercial antes.');
      return;
    }
    setSigName(selectedClient.dadosPessoais?.nome || '');
    setSigConsent(false);
    setShowSignatureModal(true);
    // Let the DOM render and clear the canvas
    setTimeout(() => clearCanvas(), 100);
  };

  // Submit Touch Signature contract creation
  const handleSaveSignatureContract = async () => {
    if (!sigConsent) {
      alert('Você precisa aceitar os termos declarados.');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    setSubmittingSignature(true);
    try {
      const base64Image = canvas.toDataURL('image/png');
      
      // Grab IP address
      let ip = 'IP não detectado';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        ip = ipData.ip || 'IP não detectado';
      } catch (err) {
        console.warn('Failed to fetch public IP:', err);
      }

      const plan = plans.find(p => p._id === dcPlano);
      const payload = {
        clientId: selectedClient._id,
        planoId: dcPlano,
        descontoTipo: dcDescontoTipo,
        descontoValor: dcDescontoValor,
        parcelas: dcParcelas,
        formaPagamento: dcFormaPag,
        dataPrimeiroVencimento: dcVencimento,
        dataInicio: dcDataInicio,
        responsavelVenda: dcResponsavelVenda,
        unidadeContratada: dcUnidadeContratada,
        observacoesContratuais: dcObservacoesContratuais,
        status: 'assinado',
        assinaturaNome: sigName,
        contratoTexto: generateContractText(),
        usuarioEmissor: userCargo,
        enviarClicksign: false,
        enviarAsaas: false,
        frequencia: dcFrequencia,
        creditosTotal: dcCreditosTotal,
        assinaturaPresencialImage: base64Image,
        trilhaAuditoria: {
          ip,
          dataHora: new Date(),
          operadorNome: userCargo,
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Desconhecido'
        }
      };

      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert('Assinatura presencial coletada e contrato ativado com sucesso!');
        setShowSignatureModal(false);
        loadContracts(selectedClient._id);
        fetchData();
        
        // Trigger auto-download
        downloadContractPDF(selectedClient, plan, payload.contratoTexto, data.data);
      } else {
        alert('Erro ao emitir contrato assinado: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
    } finally {
      setSubmittingSignature(false);
    }
  };

  return (
    <div>
      {!selectedClient ? (
        <div>
        {/* 1. TOP HEADER EXECUTIVO COM MICRO-GRÁFICOS DECORATIVOS */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.7) 0%, rgba(30, 41, 59, 0.4) 100%)',
          padding: '20px 24px',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)'
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '1.85rem',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              background: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              Gestão de Contratos
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '6px', margin: 0, fontWeight: 400 }}>
              Organize, acompanhe e finalize tudo no seu ritmo.
            </p>
          </div>

          {/* Micro-Analytics Glassmorphic Graph Widget & Sub-Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            background: 'rgba(15, 23, 42, 0.65)',
            padding: '10px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.1)',
            flexWrap: 'wrap'
          }}>
            {/* Sub-tabs switch */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                type="button"
                onClick={() => setSubTab('alunos')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: subTab === 'alunos' ? 'var(--color-primary)' : 'transparent',
                  color: subTab === 'alunos' ? '#fff' : '#94a3b8',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                Alunos & Emissão
              </button>
              <button
                type="button"
                onClick={() => setSubTab('clicksign')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: subTab === 'clicksign' ? 'var(--color-primary)' : 'transparent',
                  color: subTab === 'clicksign' ? '#fff' : '#94a3b8',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                Controle Clicksign
              </button>
            </div>

            {userCargo === 'Administrador' && (
              <button
                type="button"
                onClick={handleRunSanitization}
                disabled={sanitizing}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                  background: 'rgba(251, 191, 36, 0.12)',
                  color: '#fbbf24',
                  fontWeight: 700,
                  fontSize: '0.76rem',
                  cursor: 'pointer'
                }}
                title="Varredura e Blindagem Cadastral"
              >
                {sanitizing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-broom"></i>}
              </button>
            )}
          </div>
        </div>

        {subTab === 'clicksign' ? (
          <ClicksignPanel />
        ) : (
          <>
            {/* 2. BARRA MODOS RÁPIDOS */}
            <div style={{
              display: 'flex',
              alignItems: 'stretch',
              gap: '12px',
              marginBottom: '16px',
              padding: '14px 18px',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(30, 41, 59, 0.35) 100%)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              overflowX: 'auto'
            }}>
              {/* Etiqueta vertical MODOS RÁPIDOS */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                paddingRight: '14px',
                borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                minWidth: '95px'
              }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.2 }}>
                  MODOS
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.2 }}>
                  RÁPIDOS
                </span>
              </div>

              {/* Botões dos Modos Rápidos */}
              <div style={{ display: 'flex', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
                {/* 1. Foco do Dia */}
                <button
                  type="button"
                  onClick={() => setQuickViewFilter(prev => prev === 'foco_do_dia' ? 'todos' : 'foco_do_dia')}
                  style={{
                    flex: '1 1 180px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: quickViewFilter === 'foco_do_dia' ? '#06b6d4' : 'rgba(255,255,255,0.06)',
                    borderBottom: '3px solid #06b6d4',
                    background: quickViewFilter === 'foco_do_dia' ? 'rgba(6, 182, 212, 0.18)' : 'rgba(15, 23, 42, 0.6)',
                    color: '#f8fafc',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    boxShadow: quickViewFilter === 'foco_do_dia' ? '0 0 14px rgba(6, 182, 212, 0.25)' : 'none'
                  }}
                >
                  <div style={{ color: '#ffffff', fontWeight: 700 }}>Foco do Dia</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400, marginTop: '2px' }}>(Renovações & Propostas)</div>
                </button>

                {/* 2. Inadimplência Asaas */}
                <button
                  type="button"
                  onClick={() => setQuickViewFilter(prev => prev === 'inadimplentes' ? 'todos' : 'inadimplentes')}
                  style={{
                    flex: '1 1 180px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: quickViewFilter === 'inadimplentes' ? '#f43f5e' : 'rgba(255,255,255,0.06)',
                    borderBottom: '3px solid #f43f5e',
                    background: quickViewFilter === 'inadimplentes' ? 'rgba(244, 63, 94, 0.18)' : 'rgba(15, 23, 42, 0.6)',
                    color: '#f8fafc',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    boxShadow: quickViewFilter === 'inadimplentes' ? '0 0 14px rgba(244, 63, 94, 0.25)' : 'none'
                  }}
                >
                  <div style={{ color: '#ffffff', fontWeight: 700 }}>Inadimplência Asaas</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400, marginTop: '2px' }}>Parcelas em Atraso</div>
                </button>

                {/* 3. Pendentes de Assinatura */}
                <button
                  type="button"
                  onClick={() => setQuickViewFilter(prev => prev === 'pendentes_assinatura' ? 'todos' : 'pendentes_assinatura')}
                  style={{
                    flex: '1 1 180px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: quickViewFilter === 'pendentes_assinatura' ? '#f97316' : 'rgba(255,255,255,0.06)',
                    borderBottom: '3px solid #f97316',
                    background: quickViewFilter === 'pendentes_assinatura' ? 'rgba(249, 115, 22, 0.18)' : 'rgba(15, 23, 42, 0.6)',
                    color: '#f8fafc',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    boxShadow: quickViewFilter === 'pendentes_assinatura' ? '0 0 14px rgba(249, 115, 22, 0.25)' : 'none'
                  }}
                >
                  <div style={{ color: '#ffffff', fontWeight: 700 }}>Pendentes de Assinatura</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400, marginTop: '2px' }}>Clicksign & Propostas</div>
                </button>

                {/* 4. Cadastros com Pendências */}
                <button
                  type="button"
                  onClick={() => setQuickViewFilter(prev => prev === 'pendencias_cadastrais' ? 'todos' : 'pendencias_cadastrais')}
                  style={{
                    flex: '1 1 180px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: quickViewFilter === 'pendencias_cadastrais' ? '#eab308' : 'rgba(255,255,255,0.06)',
                    borderBottom: '3px solid #eab308',
                    background: quickViewFilter === 'pendencias_cadastrais' ? 'rgba(234, 179, 8, 0.18)' : 'rgba(15, 23, 42, 0.6)',
                    color: '#f8fafc',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: quickViewFilter === 'pendencias_cadastrais' ? '0 0 14px rgba(234, 179, 8, 0.25)' : 'none'
                  }}
                >
                  <div>
                    <div style={{ color: '#ffffff', fontWeight: 700 }}>Cadastros com Pendências</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400, marginTop: '2px' }}>Falta CPF/Tel/Endereço</div>
                  </div>
                  <span style={{
                    background: '#eab308',
                    color: '#0f172a',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '10px'
                  }}>
                    {stageCounts.incompleto}
                  </span>
                </button>
              </div>
            </div>

            {/* 3. PÍLULAS DE STATUS MULTI-SELEÇÃO INTERATIVAS COM STATUS DOTS */}
            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Botão Atalho: Apenas Ativos da Operação */}
              <button
                type="button"
                onClick={handleSelectOnlyActiveOperation}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  background: 'rgba(6, 182, 212, 0.08)',
                  color: '#22d3ee',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
                title="Mostrar todos os status ativos da operação (oculta finalizados)"
              >
                Operação Viva
              </button>

              {/* Botão Atalho: Marcar Todos */}
              <button
                type="button"
                onClick={handleSelectAllStatuses}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  background: selectedStatuses.length === 7 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.03)',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Todos
              </button>

              {/* Toggle Contrato Vigente */}
              <button
                type="button"
                onClick={() => handleToggleStatus('vigente')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: selectedStatuses.includes('vigente') ? '#059669' : 'rgba(255,255,255,0.08)',
                  background: selectedStatuses.includes('vigente') ? 'rgba(5, 150, 105, 0.2)' : 'rgba(255,255,255,0.02)',
                  color: selectedStatuses.includes('vigente') ? '#34d399' : '#94a3b8',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: selectedStatuses.includes('vigente') ? 1 : 0.5
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                Contrato Vigente
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '8px', fontSize: '0.72rem' }}>
                  {stageCounts.vigente}
                </span>
              </button>

              {/* Toggle Renovações <30d */}
              <button
                type="button"
                onClick={() => handleToggleStatus('renovacao')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: selectedStatuses.includes('renovacao') ? '#f59e0b' : 'rgba(255,255,255,0.08)',
                  background: selectedStatuses.includes('renovacao') ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.02)',
                  color: selectedStatuses.includes('renovacao') ? '#fbbf24' : '#94a3b8',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: selectedStatuses.includes('renovacao') ? 1 : 0.5
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
                Renovações &lt;30d
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '8px', fontSize: '0.72rem' }}>
                  {stageCounts.renovacao}
                </span>
              </button>

              {/* Toggle Vencidos */}
              <button
                type="button"
                onClick={() => handleToggleStatus('vencido')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: selectedStatuses.includes('vencido') ? '#dc2626' : 'rgba(255,255,255,0.08)',
                  background: selectedStatuses.includes('vencido') ? 'rgba(220, 38, 38, 0.2)' : 'rgba(255,255,255,0.02)',
                  color: selectedStatuses.includes('vencido') ? '#f87171' : '#94a3b8',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: selectedStatuses.includes('vencido') ? 1 : 0.5
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
                Vencidos
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '8px', fontSize: '0.72rem' }}>
                  {stageCounts.vencido}
                </span>
              </button>

              {/* Toggle Aguardando Assinatura */}
              <button
                type="button"
                onClick={() => handleToggleStatus('aguardando_assinatura')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: selectedStatuses.includes('aguardando_assinatura') ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                  background: selectedStatuses.includes('aguardando_assinatura') ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.02)',
                  color: selectedStatuses.includes('aguardando_assinatura') ? '#60a5fa' : '#94a3b8',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: selectedStatuses.includes('aguardando_assinatura') ? 1 : 0.5
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }}></span>
                Aguardando Assinatura / Proposta
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '8px', fontSize: '0.72rem' }}>
                  {stageCounts.aguardando_assinatura}
                </span>
              </button>

              {/* Toggle Leads */}
              <button
                type="button"
                onClick={() => handleToggleStatus('lead')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: selectedStatuses.includes('lead') ? '#8b5cf6' : 'rgba(255,255,255,0.08)',
                  background: selectedStatuses.includes('lead') ? 'rgba(139, 92, 246, 0.18)' : 'rgba(255,255,255,0.02)',
                  color: selectedStatuses.includes('lead') ? '#c084fc' : '#94a3b8',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: selectedStatuses.includes('lead') ? 1 : 0.5
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7', display: 'inline-block' }}></span>
                Leads & Cadastros
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '8px', fontSize: '0.72rem' }}>
                  {stageCounts.lead}
                </span>
              </button>

              {/* Toggle Dynamus */}
              <button
                type="button"
                onClick={() => handleToggleStatus('dynamus')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: selectedStatuses.includes('dynamus') ? '#06b6d4' : 'rgba(255,255,255,0.08)',
                  background: selectedStatuses.includes('dynamus') ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255,255,255,0.02)',
                  color: selectedStatuses.includes('dynamus') ? '#22d3ee' : '#94a3b8',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: selectedStatuses.includes('dynamus') ? 1 : 0.5
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#06b6d4', display: 'inline-block' }}></span>
                Alunos Dynamus
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '8px', fontSize: '0.72rem' }}>
                  {stageCounts.dynamus}
                </span>
              </button>

              {/* Toggle Finalizados */}
              <button
                type="button"
                onClick={() => handleToggleStatus('finalizado')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: selectedStatuses.includes('finalizado') ? '#64748b' : 'rgba(100, 116, 139, 0.2)',
                  background: selectedStatuses.includes('finalizado') ? 'rgba(100, 116, 139, 0.25)' : 'rgba(255,255,255,0.01)',
                  color: selectedStatuses.includes('finalizado') ? '#e2e8f0' : '#64748b',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: selectedStatuses.includes('finalizado') ? 1 : 0.5
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748b', display: 'inline-block' }}></span>
                Finalizados
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '8px', fontSize: '0.72rem' }}>
                  {stageCounts.finalizado}
                </span>
              </button>
            </div>

            {/* 4. PAINEL DE FILTROS GLASSMORPHIC SEGMENTADO */}
            <div style={{
              marginBottom: '20px',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(30, 41, 59, 0.45) 100%)',
              padding: '16px 20px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
            }}>
              {/* Linha Superior: Campo de Busca */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <i className="fa-solid fa-magnifying-glass" style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                    fontSize: '0.9rem'
                  }}></i>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar por aluno, CPF, plano, valor (R$) ou forma de pagamento..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      paddingLeft: '38px',
                      paddingRight: '14px',
                      paddingTop: '10px',
                      paddingBottom: '10px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              {/* Linha do Meio: 4 Dropdowns Segmentados com Traço de Destaque Vertical e Controles */}
              <div style={{
                display: 'flex',
                gap: '14px',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Dropdown 1: AÇÃO */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '3px', height: '10px', background: '#38bdf8', borderRadius: '2px', display: 'inline-block' }}></span>
                      Ação:
                    </span>
                    <select
                      className="select-custom"
                      value={orientacaoFilter}
                      onChange={e => setOrientacaoFilter(e.target.value)}
                      style={{
                        minWidth: '160px',
                        fontSize: '0.82rem',
                        padding: '8px 12px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#f8fafc'
                      }}
                    >
                      <option value="todos">Todas as Ações</option>
                      <option value="gerenciar_dynamus">Gerenciar Dynamus</option>
                      <option value="vigente">Vigência Regular</option>
                      <option value="gerar_renovacao">Gerar Renovação Anual</option>
                      <option value="sincronizar_clicksign">Sincronizar Clicksign</option>
                      <option value="gerar_asaas">Boletos Asaas</option>
                      <option value="reenviar_link">Reenviar Link de Venda</option>
                      <option value="gerar_link">Gerar Link de Venda</option>
                    </select>
                  </div>

                  {/* Dropdown 2: PAGAMENTO */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '3px', height: '10px', background: '#38bdf8', borderRadius: '2px', display: 'inline-block' }}></span>
                      Pagamento:
                    </span>
                    <select
                      className="select-custom"
                      value={formaPagamentoFilter}
                      onChange={e => setFormaPagamentoFilter(e.target.value)}
                      style={{
                        minWidth: '150px',
                        fontSize: '0.82rem',
                        padding: '8px 12px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#f8fafc'
                      }}
                    >
                      <option value="todos">Todas as Formas</option>
                      <option value="boleto">Boleto Bancário</option>
                      <option value="pix">Pix</option>
                      <option value="cartao">Cartão de Crédito</option>
                    </select>
                  </div>

                  {/* Dropdown 3: PLANO */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '3px', height: '10px', background: '#38bdf8', borderRadius: '2px', display: 'inline-block' }}></span>
                      Plano:
                    </span>
                    <select
                      className="select-custom"
                      value={contratoPlanFilter}
                      onChange={e => setContratoPlanFilter(e.target.value)}
                      style={{
                        minWidth: '160px',
                        fontSize: '0.82rem',
                        padding: '8px 12px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#f8fafc'
                      }}
                    >
                      <option value="todos">Todos os Planos</option>
                      {plans.map((p: any) => (
                        <option key={p._id} value={p._id}>{p.nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* Dropdown 4: ORDENAR POR */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '3px', height: '10px', background: '#38bdf8', borderRadius: '2px', display: 'inline-block' }}></span>
                      Ordenar por:
                    </span>
                    <select
                      className="select-custom"
                      value={sortOption}
                      onChange={e => setSortOption(e.target.value)}
                      style={{
                        minWidth: '160px',
                        fontSize: '0.82rem',
                        padding: '8px 12px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#f8fafc'
                      }}
                    >
                      <option value="vencimento_asc">Vencimento Próximo</option>
                      <option value="vencimento_desc">Vencimento Distante</option>
                      <option value="valor_desc">Maior Valor</option>
                      <option value="inicio_desc">Cadastro Recente</option>
                      <option value="alfabetico_asc">Nome (A - Z)</option>
                      <option value="alfabetico_desc">Nome (Z - A)</option>
                    </select>
                  </div>
                </div>

                {/* Botões de Ação e Alternador Cards/Tabela */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  {/* View Mode Toggle */}
                  <div style={{ display: 'flex', gap: '4px', background: 'rgba(15, 23, 42, 0.8)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <button
                      type="button"
                      onClick={() => setViewMode('cards')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        background: viewMode === 'cards' ? 'rgba(6, 182, 212, 0.25)' : 'transparent',
                        color: viewMode === 'cards' ? '#22d3ee' : '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <i className="fa-solid fa-table-cells-large"></i> Cards
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: 'none',
                        background: viewMode === 'table' ? 'rgba(6, 182, 212, 0.25)' : 'transparent',
                        color: viewMode === 'table' ? '#22d3ee' : '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <i className="fa-solid fa-list"></i> Tabela
                    </button>
                  </div>

                  {/* Botão Atualizar */}
                  <button
                    type="button"
                    onClick={() => fetchData()}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(6, 182, 212, 0.4)',
                      background: 'rgba(6, 182, 212, 0.12)',
                      color: '#22d3ee',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    title="Atualizar dados"
                  >
                    <i className="fa-solid fa-arrows-rotate"></i> Atualizar
                  </button>

                  {/* Reset Button */}
                  {(searchQuery !== '' || quickViewFilter !== 'todos' || selectedStatuses.length !== 6 || selectedStatuses.includes('finalizado') || orientacaoFilter !== 'todos' || formaPagamentoFilter !== 'todos' || contratoPlanFilter !== 'todos' || sortOption !== 'vencimento_asc') && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid rgba(244, 63, 94, 0.4)',
                        background: 'rgba(244, 63, 94, 0.12)',
                        color: '#f43f5e',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <i className="fa-solid fa-xmark"></i> Limpar filtros
                    </button>
                  )}
                </div>
              </div>

              {/* Linha de Rodapé: Totalizador Consolidado Filtrado */}
              <div style={{
                marginTop: '14px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '0.82rem',
                color: '#94a3b8'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-users" style={{ color: '#38bdf8' }}></i>
                  <span>Exibindo <strong style={{ color: '#ffffff' }}>{sortedClients.length}</strong> alunos / contratos</span>
                </div>
                <div>
                  <span>Total Consolidado Filtrado: </span>
                  <strong style={{ color: '#10b981', fontSize: '0.95rem', fontWeight: 800, marginLeft: '4px' }}>
                    R$ {totalConsolidadoFiltrado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>
            </div>

        <div className="content-panel">
          {loadingOverview ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)', margin: '16px 0' }}>
              <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '2.5rem', color: '#22d3ee', marginBottom: '16px' }}></i>
              <h4 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#ffffff', fontWeight: 700 }}>Sincronizando Contratos e Vigências</h4>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#94a3b8' }}>Consultando contratos ativos, propostas e extratos de pagamento em tempo real...</p>
            </div>
          ) : viewMode === 'cards' ? (
            /* ==========================================
               CARDS EXECUTIVOS EM 3 BLOCOS CLAROS
               ========================================== */
            <div>
              {sortedClients.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <i className="fa-solid fa-file-excel" style={{ fontSize: '2.5rem', color: 'var(--text-dim)', marginBottom: '12px' }}></i>
                  <h4 style={{ margin: '0 0 6px', fontSize: '1.1rem' }}>Nenhum aluno encontrado</h4>
                  <p style={{ fontSize: '0.85rem' }}>Ajuste os filtros ou o termo de busca para visualizar contratos.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
                  {sortedClients.map((c: any) => {
                    const com = c.dadosComerciais || {};
                    const plan = plans.find(p => p._id === (com.planoId?._id || com.planoId));
                    const latestContract = allContractsMap[c._id];
                    const latestProposal = allProposalsMap[c._id];
                    const stage = resolveClientContractStage(c, plan, latestContract, latestProposal, allPaymentsMap[c._id]);
                    const info = stage.info;

                    const rawTel = (c.dadosPessoais?.telefone || '').replace(/\D/g, '');
                    const firstName = (c.dadosPessoais?.nome || 'Aluno').split(' ')[0];
                    const waMsg = encodeURIComponent(`Olá ${firstName}! Tudo bem? Entramos em contato referente ao seu plano no Clube Fitness.`);
                    const waLink = rawTel ? `https://wa.me/55${rawTel}?text=${waMsg}` : null;

                    // Data checks
                    const hasCpf = Boolean(c.dadosPessoais?.cpf?.trim());
                    const hasPhone = Boolean(c.dadosPessoais?.telefone?.trim());
                    const hasBirthDate = Boolean(c.dadosPessoais?.dataNascimento?.trim());
                    const hasEndereco = Boolean(c.dadosPessoais?.endereco?.trim() && !c.dadosPessoais?.endereco?.toLowerCase().includes('teste'));
                    const enderecoFormatted = hasEndereco
                      ? `${c.dadosPessoais.endereco}${c.dadosPessoais.numero ? `, ${c.dadosPessoais.numero}` : ''}${c.dadosPessoais.bairro ? ` - ${c.dadosPessoais.bairro}` : ''}${c.dadosPessoais.cidade ? `, ${c.dadosPessoais.cidade}` : ''}${c.dadosPessoais.cep ? ` (${c.dadosPessoais.cep})` : ''}`
                      : null;

                    const isBoleto = (latestContract?.formaPagamento || com.formaPagamento) === 'boleto';
                    const hasAsaasBoleto = Boolean(latestContract?.asaasBoletoPdf || latestContract?.asaasInvoiceUrl);

                    return (
                      <div
                        key={c._id}
                        style={{
                          background: '#111827',
                          border: '1px solid #1f2937',
                          borderRadius: '14px',
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '14px',
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div>
                          {/* =========================================================
                              BLOCO 1: IDENTIFICAÇÃO DO ALUNO & ORIGEM
                              ========================================================= */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.2px', wordBreak: 'break-word' }}>
                                {c.dadosPessoais?.nome || 'Sem Nome'}
                              </h3>
                              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.4 }}>
                                <span>CPF: </span>
                                <strong style={{ color: hasCpf ? '#ffffff' : '#64748b' }}>
                                  {hasCpf ? c.dadosPessoais.cpf : '(Não informado)'}
                                </strong>
                                <span> • Tel: </span>
                                <strong style={{ color: hasPhone ? '#ffffff' : '#64748b' }}>
                                  {hasPhone ? c.dadosPessoais.telefone : '(Não informado)'}
                                </strong>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: hasEndereco ? '#94a3b8' : '#64748b', marginTop: '2px', lineHeight: 1.3 }}>
                                <i className="fa-solid fa-location-dot" style={{ marginRight: '4px', color: hasEndereco ? 'var(--color-primary)' : '#475569' }}></i>
                                {enderecoFormatted || '(Endereço não informado)'}
                              </div>
                              {stage.isMissingData && stage.stageKey !== 'dynamus' && (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                                  {!hasCpf && (
                                    <span style={{ fontSize: '0.68rem', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                      ⚠️ Falta CPF
                                    </span>
                                  )}
                                  {!hasPhone && (
                                    <span style={{ fontSize: '0.68rem', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                      ⚠️ Falta Tel
                                    </span>
                                  )}
                                  {!hasBirthDate && (
                                    <span style={{ fontSize: '0.68rem', background: 'rgba(245,158,11,0.15)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                      ⚠️ Falta Nascimento
                                    </span>
                                  )}
                                  {!hasEndereco && (
                                    <span style={{ fontSize: '0.68rem', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                      ⚠️ Falta Endereço
                                    </span>
                                  )}
                                  {c.dadosPessoais?.email && c.dadosPessoais.email.toLowerCase().endsWith('@clube.com') && (
                                    <span style={{ fontSize: '0.68rem', background: 'rgba(245,158,11,0.15)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                      ⚠️ E-mail Fictício (@clube.com)
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Badge do Estágio */}
                            <span style={{
                              background: stage.badgeBg,
                              color: stage.badgeColor,
                              border: stage.badgeBorder,
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 750,
                              letterSpacing: '0.4px',
                              textTransform: 'uppercase',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}>
                              {stage.stageLabel}
                            </span>
                          </div>

                          {/* =========================================================
                              BLOCO 2: ESTÁGIO, VIGÊNCIA & CHECKLIST DE DADOS
                              ========================================================= */}
                          <div style={{
                            background: '#090d16',
                            border: '1px solid #1e293b',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            marginTop: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}>
                            {/* Plano & Valor */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem' }}>
                              <span style={{ color: '#94a3b8', fontWeight: 500 }}>Plano:</span>
                              <strong style={{ color: '#ffffff', fontWeight: 700, textAlign: 'right' }}>
                                {plan?.nome || 'A definir'}
                              </strong>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                              <span style={{ color: '#94a3b8', fontWeight: 500 }}>
                                {info.isLead || info.isUncontracted ? 'Cadastro:' : (stage.isRecorrente ? 'Vigência (Acesso):' : 'Vigência:')}
                              </span>
                              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <strong style={{ color: '#f1f5f9', fontWeight: 600 }}>
                                  {info.isLead || info.isUncontracted
                                    ? (c.createdAt ? `Cadastrado em ${new Date(c.createdAt).toLocaleDateString('pt-BR')}` : 'Recente')
                                    : `${info.dataInicioFormatted} até ${info.dataFimFormatted}`}
                                </strong>
                                {info.daysLeftText && (
                                  <span style={{
                                    background: info.isLead || info.isUncontracted ? 'rgba(168, 85, 247, 0.15)' : (info.isExpired ? '#7f1d1d' : info.isExpiringSoon ? '#78350f' : '#064e3b'),
                                    color: info.isLead || info.isUncontracted ? '#c084fc' : '#ffffff',
                                    border: info.isLead || info.isUncontracted ? '1px solid rgba(168, 85, 247, 0.3)' : 'none',
                                    fontSize: '0.7rem',
                                    fontWeight: 750,
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                  }}>
                                    {info.daysLeftText}
                                  </span>
                                )}
                              </div>
                            </div>

                            {Boolean(stage.isRecorrente) && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.08)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                <span style={{ color: '#93c5fd', fontWeight: 600 }}>
                                  <i className="fa-solid fa-arrows-rotate" style={{ marginRight: '4px' }}></i> Contrato Anual (12 Meses):
                                </span>
                                <strong style={{ color: '#ffffff' }}>
                                  Término em {info.dataFimRecorrenciaFormatted}
                                </strong>
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', borderTop: '1px solid #1e293b', paddingTop: '6px' }}>
                              <span style={{ color: '#94a3b8', fontWeight: 500 }}>Condição:</span>
                              <strong style={{ color: '#38bdf8', fontWeight: 700 }}>
                                {stage.stageKey === 'dynamus' ? 'Convênio Corporativo Dynamus' : (com.valorUnitario ? `R$ ${com.valorUnitario.toFixed(2).replace('.', ',')} (${(com.formaPagamento || 'pix').toUpperCase()}${com.parcelas > 1 ? ` ${com.parcelas}x` : ''})` : 'A definir')}
                              </strong>
                            </div>

                            {/* Checklist de Dados */}
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px', borderTop: '1px solid #1e293b', paddingTop: '6px' }}>
                              {stage.stageKey === 'dynamus' ? (
                                <>
                                  <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.35)', fontWeight: 700 }}>
                                    ✅ Cadastro Dynamus Completo
                                  </span>
                                  <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.25)', fontWeight: 700 }}>
                                    ✅ Convênio Corporativo
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: hasCpf && hasPhone ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: hasCpf && hasPhone ? '#34d399' : '#f87171', border: '1px solid', borderColor: hasCpf && hasPhone ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)' }}>
                                    {hasCpf && hasPhone ? '✅ Contato & CPF' : '⚠️ Contato/CPF Incompleto'}
                                  </span>
                                  <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: hasEndereco ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: hasEndereco ? '#34d399' : '#f87171', border: '1px solid', borderColor: hasEndereco ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)' }}>
                                    {hasEndereco ? '✅ Endereço Completo' : '⚠️ Endereço Não Informado'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* =========================================================
                            BLOCO 3: CALL-TO-ACTION PRIMÁRIO & AÇÕES SECUNDÁRIAS
                            ========================================================= */}
                        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {/* BOTÃO DE AÇÃO PRIMÁRIA EM DESTAQUE */}
                          {stage.stageKey === 'dynamus' ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (onNavigateTab) {
                                  onNavigateTab('dynamus', c.dadosPessoais?.nome || '');
                                } else {
                                  window.dispatchEvent(new CustomEvent('navigate_tab', { detail: { tab: 'dynamus', searchQuery: c.dadosPessoais?.nome || '' } }));
                                }
                              }}
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '10px',
                                border: '1px solid rgba(6, 182, 212, 0.4)',
                                background: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
                              }}
                            >
                              <i className="fa-solid fa-bolt"></i> Gerenciar Créditos Dynamus
                            </button>
                          ) : stage.stageKey === 'ativo' ? (
                            <button
                              type="button"
                              onClick={() => setConsultingClient(c)}
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '10px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <i className="fa-solid fa-eye" style={{ color: 'var(--color-primary)' }}></i> Consultar Resumo
                            </button>
                          ) : stage.stageKey === 'finalizado' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenDirectContractWizard(c)}
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '10px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                              }}
                            >
                              <i className="fa-solid fa-arrows-rotate"></i> Reativar / Nova Renovação
                            </button>
                          ) : (stage.stageKey === 'vencido' || stage.stageKey === 'renovacao') ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleGenerateRenewalLink(c)}
                                disabled={Boolean(generatingRenewalClientId)}
                                style={{
                                  flex: '1 1 auto',
                                  padding: '10px 14px',
                                  borderRadius: '10px',
                                  border: 'none',
                                  background: '#fbbf24',
                                  color: '#000000',
                                  fontWeight: 800,
                                  fontSize: '0.84rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  boxShadow: '0 4px 12px rgba(251, 191, 36, 0.25)'
                                }}
                              >
                                {generatingRenewalClientId === c._id ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-arrows-rotate"></i>}
                                Renovação (+5%)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenFinalizeModal(c)}
                                title="Marcar contrato como Finalizado (Não Renovou)"
                                style={{
                                  padding: '10px 12px',
                                  borderRadius: '10px',
                                  border: '1px solid rgba(107, 114, 128, 0.4)',
                                  background: 'rgba(107, 114, 128, 0.18)',
                                  color: '#d1d5db',
                                  fontWeight: 700,
                                  fontSize: '0.8rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '5px',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                <i className="fa-solid fa-flag-checkered"></i> Não Renovou
                              </button>
                            </div>
                          ) : stage.stageKey === 'pendente' ? (
                            <button
                              type="button"
                              onClick={() => handleSyncClicksignForClient(c)}
                              disabled={syncingClicksignClientId === c._id}
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '10px',
                                border: 'none',
                                background: '#f59e0b',
                                color: '#000000',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)'
                              }}
                            >
                              {syncingClicksignClientId === c._id ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-arrows-rotate"></i>}
                              Sincronizar Status Clicksign
                            </button>
                          ) : stage.stageKey === 'proposta' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const url = window.location.origin + '/vendas/' + latestProposal._id;
                                  setGeneratedProposalUrl(url);
                                  setActiveProposal(latestProposal);
                                  setShowProposalModal(true);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '9px 12px',
                                  borderRadius: '10px',
                                  border: 'none',
                                  background: '#8b5cf6',
                                  color: '#ffffff',
                                  fontWeight: 800,
                                  fontSize: '0.82rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)'
                                }}
                              >
                                <i className="fa-solid fa-share-nodes"></i> Copiar / Reenviar Link
                              </button>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleManualActivateClient(c, latestProposal)}
                                  style={{
                                    flex: '1 1 auto',
                                    padding: '7px 8px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(16, 185, 129, 0.4)',
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    color: '#34d399',
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '5px'
                                  }}
                                  title="Validar fechamento manual e ativar o aluno como Contrato Vigente"
                                >
                                  <i className="fa-solid fa-circle-check"></i> Fechar Manual
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancelProposal(c, latestProposal)}
                                  style={{
                                    padding: '7px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(239, 68, 68, 0.4)',
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    color: '#f87171',
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px'
                                  }}
                                  title="Descartar esta proposta pendente"
                                >
                                  <i className="fa-solid fa-trash-can"></i> Descartar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenSalesWizard(c)}
                              style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '10px',
                                border: 'none',
                                background: 'var(--color-primary)',
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                              }}
                            >
                              <i className="fa-solid fa-bolt"></i> Gerar Link de Venda
                            </button>
                          )}

                          {/* AÇÕES SECUNDÁRIAS ORGANIZADAS */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                            {/* Botão 1: Se for contrato ativo ➔ Asaas (se boleto) OU Financeiro (outras formas); Se outros estágios ➔ Resumo */}
                            {stage.stageKey === 'ativo' ? (
                              isBoleto ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAsaasModal(c)}
                                  style={{
                                    background: 'rgba(2, 132, 199, 0.15)',
                                    border: '1px solid rgba(2, 132, 199, 0.4)',
                                    color: '#38bdf8',
                                    padding: '6px 8px',
                                    borderRadius: '8px',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px'
                                  }}
                                  title="Gerenciar cobranças e boletos no Asaas"
                                >
                                  <i className="fa-solid fa-receipt"></i> Asaas
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenClientFinancial(c)}
                                  style={{
                                    background: 'rgba(16, 185, 129, 0.12)',
                                    border: '1px solid rgba(16, 185, 129, 0.35)',
                                    color: '#34d399',
                                    padding: '6px 8px',
                                    borderRadius: '8px',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px'
                                  }}
                                  title="Consultar histórico e lançamentos financeiros do aluno"
                                >
                                  <i className="fa-solid fa-wallet"></i> Financeiro
                                </button>
                              )
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConsultingClient(c)}
                                style={{
                                  background: '#1e293b',
                                  border: '1px solid #334155',
                                  color: '#f1f5f9',
                                  padding: '6px 8px',
                                  borderRadius: '8px',
                                  fontSize: '0.74rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}
                                title="Consultar resumo completo do contrato em modo de leitura"
                              >
                                <i className="fa-solid fa-eye" style={{ color: '#94a3b8' }}></i> Resumo
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setHistoryModalClient(c)}
                                style={{
                                  background: (c.historicoContratos?.length > 0) ? 'rgba(6, 182, 212, 0.15)' : '#1e293b',
                                  border: (c.historicoContratos?.length > 0) ? '1px solid rgba(6, 182, 212, 0.45)' : '1px solid #334155',
                                  color: (c.historicoContratos?.length > 0) ? '#22d3ee' : '#94a3b8',
                                  padding: '6px 8px',
                                  borderRadius: '8px',
                                  fontSize: '0.74rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}
                                title="Consultar linha do tempo e histórico de serviços contratados"
                              >
                                <i className="fa-solid fa-clock-rotate-left" style={{ color: (c.historicoContratos?.length > 0) ? '#22d3ee' : '#94a3b8' }}></i>
                                {c.historicoContratos?.length > 0 ? `Histórico (${c.historicoContratos.length})` : 'Histórico'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenSalesWizard(c)}
                                style={{
                                  background: 'rgba(234, 179, 8, 0.12)',
                                  border: '1px solid rgba(234, 179, 8, 0.4)',
                                  color: '#fbbf24',
                                  padding: '6px 8px',
                                  borderRadius: '8px',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}
                                title="Gerar Link de Venda / Proposta Comercial"
                              >
                                <i className="fa-solid fa-bolt" style={{ color: '#fbbf24' }}></i> Link
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenDirectContractWizard(c)}
                              style={{
                                background: '#1e293b',
                                border: '1px solid #334155',
                                color: '#f1f5f9',
                                padding: '6px 8px',
                                borderRadius: '8px',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                              title="Emitir contrato direto ou presencial"
                            >
                              <i className="fa-solid fa-file-signature" style={{ color: '#34d399' }}></i> Emitir
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSelectClient(c)}
                              style={{
                                background: '#1e293b',
                                border: '1px solid #334155',
                                color: '#f1f5f9',
                                padding: '6px 8px',
                                borderRadius: '8px',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                              title="Gerenciar cadastro completo"
                            >
                              <i className="fa-solid fa-sliders" style={{ color: 'var(--color-primary)' }}></i> Gerenciar
                            </button>
                          </div>

                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                background: 'rgba(37, 211, 102, 0.08)',
                                border: '1px solid rgba(37, 211, 102, 0.3)',
                                color: '#25d366',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                textDecoration: 'none'
                              }}
                            >
                              <i className="fa-brands fa-whatsapp"></i> Conversar no WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ==========================================
               TABELA CLÁSSICA DETALHADA
               ========================================== */
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>CPF</th>
                    <th>Plano Comercial Atual</th>
                    <th>Vigência Comercial</th>
                    <th>Status Comercial</th>
                    <th style={{ textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedClients.map((c: any) => {
                    const com = c.dadosComerciais || {};
                    const plan = plans.find(p => p._id === (com.planoId?._id || com.planoId));
                    const latestContract = allContractsMap[c._id];
                    const latestProposal = allProposalsMap[c._id];
                    const stage = resolveClientContractStage(c, plan, latestContract, latestProposal, allPaymentsMap[c._id]);
                    const info = stage.info;
                    
                    return (
                      <tr key={c._id}>
                        <td style={{ fontWeight: 600 }}>{c.dadosPessoais?.nome || 'Sem Nome'}</td>
                        <td>{c.dadosPessoais?.cpf || '—'}</td>
                        <td>
                           {plan?.nome || '—'}
                           {Boolean(stage.isRecorrente) && (
                             <div style={{ marginTop: '4px' }}>
                               <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', padding: '3px 6px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '4px' }}>
                                 <i className="fa-solid fa-arrows-rotate fa-spin" style={{ fontSize: '0.6rem' }}></i> Recorrência Ativada
                               </span>
                             </div>
                           )}
                         </td>
                        <td>
                          <div>
                            {info.isLead || info.isUncontracted
                              ? (c.createdAt ? `Cadastrado em ${new Date(c.createdAt).toLocaleDateString('pt-BR')}` : 'Sem Contrato')
                              : `${info.dataInicioFormatted} até ${info.dataFimFormatted}`}
                          </div>
                          {Boolean(stage.isRecorrente) && (
                            <div style={{ fontSize: '0.7rem', color: '#93c5fd', marginTop: '2px' }}>
                              Fim Contrato: {info.dataFimRecorrenciaFormatted}
                            </div>
                          )}
                          {info.daysLeftText && (
                            <span style={{
                              marginTop: '2px',
                              display: 'inline-block',
                              fontSize: '0.68rem',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: info.isLead || info.isUncontracted ? 'rgba(168, 85, 247, 0.15)' : info.badgeBg,
                              color: info.isLead || info.isUncontracted ? '#c084fc' : info.badgeColor,
                              border: info.isLead || info.isUncontracted ? '1px solid rgba(168, 85, 247, 0.3)' : 'none',
                              fontWeight: 700
                            }}>
                              {info.daysLeftText}
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{
                            background: stage.badgeBg,
                            color: stage.badgeColor,
                            border: stage.badgeBorder,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 750,
                            display: 'inline-block'
                          }}>
                            {stage.stageLabel}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setConsultingClient(c)}
                              title="Consultar resumo"
                            >
                              <i className="fa-solid fa-eye"></i>
                            </button>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleSelectClient(c)}
                              title="Gerenciar contrato completo"
                            >
                              <i className="fa-solid fa-sliders"></i>
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }}
                              onClick={() => handleGenerateRenewalLink(c)}
                              title="Gerar link de renovação"
                            >
                              <i className="fa-solid fa-arrows-rotate"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {sortedClients.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                        Nenhum aluno encontrado correspondente à pesquisa.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
      )}
    </div>
  ) : (
    <div>
      {/* Workspace Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <button className="btn btn-secondary" onClick={() => setSelectedClient(null)}>
          <i className="fa-solid fa-arrow-left" style={{ marginRight: '6px' }}></i> Voltar para a lista
        </button>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          padding: '8px 16px',
          borderRadius: '8px'
        }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.15)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.9rem'
          }}>
            {(selectedClient.dadosPessoais?.nome || selectedClient.nome || 'A').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Aluno Selecionado</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {selectedClient.dadosPessoais?.nome || selectedClient.nome || 'Sem Nome'}
            </div>
          </div>
          {selectedClient.dadosPessoais?.cpf && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderLeft: '1px solid var(--border-color)', paddingLeft: '12px', marginLeft: '4px' }}>
              CPF: <strong style={{ color: 'var(--text-main)' }}>{selectedClient.dadosPessoais.cpf}</strong>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: Commercial settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {activeProposal && activeProposal.status === 'respondida' && (
            <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', padding: '16px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', fontWeight: 700 }}>
                <i className="fa-solid fa-bell"></i> Proposta de Auto-Cadastro Respondida!
              </h4>
              <p style={{ margin: '0 0 12px 0', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                O aluno preencheu seus dados cadastrais. Ele escolheu pagar via <strong>{activeProposal.formaPagamentoEscolhida === 'pix' ? 'Pix (1x)' : activeProposal.formaPagamentoEscolhida === 'boleto' ? 'Boleto Bancário' : 'Cartão de Crédito'}</strong> em <strong>{activeProposal.parcelasEscolhidas}x</strong> de <strong>R$ {(activeProposal.valorFinalRecalculado / activeProposal.parcelasEscolhidas).toFixed(2).replace('.', ',')}</strong> (Total: R$ {activeProposal.valorFinalRecalculado.toFixed(2).replace('.', ',')}) com o primeiro vencimento em <strong>{activeProposal.dataVencimentoEscolhida ? new Date(activeProposal.dataVencimentoEscolhida + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não definido'}</strong>.
              </p>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ color: '#fbbf24', borderColor: 'rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.06)', padding: '8px 12px', fontSize: '0.8rem', width: '100%', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}
                onClick={() => {
                  if (activeProposal.planoId) {
                    setDcPlano(activeProposal.planoId._id || activeProposal.planoId);
                  }
                  setDcFormaPag(activeProposal.formaPagamentoEscolhida);
                  setDcParcelas(activeProposal.parcelasEscolhidas);
                  if (activeProposal.dataVencimentoEscolhida) {
                    setDcVencimento(activeProposal.dataVencimentoEscolhida);
                  }
                  if (activeProposal.formaPagamentoEscolhida === 'cartao') {
                    const rate = getCardRateForInstallment(activeProposal.parcelasEscolhidas || 1);
                    setDcValorUnitario(activeProposal.valorFinalRecalculado || Number((activeProposal.valorUnitario * (1 + rate)).toFixed(2)));
                  } else {
                    setDcValorUnitario(activeProposal.valorFinalRecalculado || activeProposal.valorUnitario);
                  }
                  if (activeProposal.dataInicio) {
                    setDcDataInicio(activeProposal.dataInicio);
                  }
                  if (activeProposal.duracao) {
                    setDcDuracao(activeProposal.duracao);
                  }
                  if (activeProposal.vigenciaQtd !== undefined) {
                    setDcVigenciaQtd(activeProposal.vigenciaQtd);
                  }
                  if (activeProposal.frequencia !== undefined) {
                    setDcFrequencia(activeProposal.frequencia);
                  }
                  if (activeProposal.creditosMensais !== undefined) {
                    setDcCreditosTotal(activeProposal.creditosMensais);
                  }
                  if (activeProposal.descontoTipo) {
                    setDcDescontoTipo(activeProposal.descontoTipo);
                  }
                  if (activeProposal.descontoValor !== undefined) {
                    setDcDescontoValor(activeProposal.descontoValor);
                  }
                  if (activeProposal.criarRecorrenciaMensal !== undefined) {
                    setDcCriarRecorrencia(activeProposal.criarRecorrenciaMensal);
                  }
                  if (activeProposal.recorrenciaMeses !== undefined) {
                    setDcRecorrenciaMeses(activeProposal.recorrenciaMeses);
                  }
                  if (activeProposal.observacoesContratuais) {
                    setDcObservacoesContratuais(activeProposal.observacoesContratuais);
                  }
                  if (activeProposal.unidadeContratada) {
                    setDcUnidadeContratada(activeProposal.unidadeContratada);
                  }

                  // Fetch fresh client data from database to update personal info (CPF, Address, Phone, etc.)
                  fetch(`/api/clients?id=${selectedClient._id}`)
                    .then(res => res.json())
                    .then(json => {
                      if (json.success && json.data && json.data.length > 0) {
                        setSelectedClient(json.data[0]);
                      }
                    })
                    .catch(() => {});

                  fetchData(true);
                  alert('Opções comerciais, cadastrais e data de vencimento do aluno carregadas e aplicadas com sucesso!');
                }}
              >
                <i className="fa-solid fa-check"></i> Aplicar Preferências Comerciais ao Formulário
              </button>
            </div>
          )}

          <form onSubmit={handleSaveComercial} className="content-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', margin: 0 }}>
          {/* CABEÇALHO DO CLIENTE NO FORMULÁRIO */}
          {(() => {
            const dtNasc = selectedClient.dadosPessoais?.dataNascimento || selectedClient.dadosPessoais?.nascimento;
            let birthDateFormatted = '';
            if (dtNasc) {
              try {
                const parts = dtNasc.split('-');
                if (parts.length === 3 && parts[0].length === 4) {
                  birthDateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
                } else {
                  birthDateFormatted = new Date(dtNasc + 'T12:00:00').toLocaleDateString('pt-BR');
                }
              } catch {
                birthDateFormatted = dtNasc;
              }
            }

            const isClientLocked = selectedClient.bloqueioCadastral?.bloqueado !== false;
            const lockMotivo = selectedClient.bloqueioCadastral?.motivo || (selectedClient.dadosPessoais?.cpf ? 'Informação fornecida pelo contratante' : 'Dado consolidado no cadastro');

            return (
              <div style={{
                background: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.2px' }}>
                      {selectedClient.dadosPessoais?.nome || selectedClient.nome || 'Sem Nome'}
                    </h3>
                    {isClientLocked && (
                      <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fa-solid fa-shield-halved"></i> {lockMotivo} (Blindado)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', fontWeight: 500 }}>
                    {selectedClient.dadosPessoais?.cpf ? `CPF: ${selectedClient.dadosPessoais.cpf}` : 'Sem CPF'}
                    {selectedClient.dadosPessoais?.telefone && ` • Tel: ${selectedClient.dadosPessoais.telefone}`}
                    {birthDateFormatted && ` • Nascimento: ${birthDateFormatted}`}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {isClientLocked && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowUnlockModal(true)}
                      style={{
                        fontSize: '0.75rem',
                        padding: '6px 12px',
                        background: 'rgba(251, 191, 36, 0.15)',
                        color: '#fbbf24',
                        borderColor: 'rgba(251, 191, 36, 0.4)',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fa-solid fa-lock-open"></i> Liberar Edição (Admin)
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenFinalizeModal(selectedClient)}
                    style={{
                      fontSize: '0.75rem',
                      padding: '6px 12px',
                      background: 'rgba(107, 114, 128, 0.2)',
                      color: '#d1d5db',
                      borderColor: 'rgba(107, 114, 128, 0.4)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Finalizar aluno e mover para o histórico de finalizados"
                  >
                    <i className="fa-solid fa-flag-checkered"></i> Finalizar Aluno
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedClient(null)}
                    style={{ background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', cursor: 'pointer' }}
                  >
                    <i className="fa-solid fa-xmark"></i> Fechar Workspace
                  </button>
                </div>
              </div>
            );
          })()}

          {/* =========================================================================
              BLOCO DADOS CADASTRAIS DO CONTRATANTE (BLINDADOS / LIBERÁVEIS POR ADMIN)
              ========================================================================= */}
          {(() => {
            const isClientLocked = selectedClient.bloqueioCadastral?.bloqueado !== false;
            const lockMotivo = selectedClient.bloqueioCadastral?.motivo || (selectedClient.dadosPessoais?.cpf ? 'Informação fornecida pelo contratante' : 'Dado consolidado no cadastro');

            return (
              <div style={{
                background: 'var(--bg-secondary)',
                border: isClientLocked ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-id-card" style={{ color: isClientLocked ? '#34d399' : 'var(--color-primary)', fontSize: '1.05rem' }}></i>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      Dados Cadastrais do Contratante
                    </h4>
                    {isClientLocked ? (
                      <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fa-solid fa-lock"></i> {lockMotivo} (Blindado)
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fa-solid fa-pen"></i> Modo Edição Liberado
                      </span>
                    )}
                  </div>

                  {isClientLocked && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowUnlockModal(true)}
                      style={{
                        fontSize: '0.75rem',
                        padding: '4px 10px',
                        background: 'rgba(251, 191, 36, 0.15)',
                        color: '#fbbf24',
                        borderColor: 'rgba(251, 191, 36, 0.4)',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fa-solid fa-lock-open"></i> Liberar Edição (Admin)
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Nome Completo {isClientLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <input type="text" className="form-control" style={{ fontSize: '0.83rem', opacity: isClientLocked ? 0.75 : 1 }} value={dcNome} onChange={e => setDcNome(e.target.value)} disabled={isClientLocked} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      E-mail {isClientLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <input type="email" className="form-control" style={{ fontSize: '0.83rem', opacity: isClientLocked ? 0.75 : 1 }} value={dcEmail} onChange={e => setDcEmail(e.target.value)} disabled={isClientLocked} required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      CPF {isClientLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <input type="text" className="form-control" style={{ fontSize: '0.83rem', opacity: isClientLocked ? 0.75 : 1 }} value={dcCpf} onChange={e => setDcCpf(e.target.value)} disabled={isClientLocked} placeholder="000.000.000-00" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Telefone / WhatsApp {isClientLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <input type="text" className="form-control" style={{ fontSize: '0.83rem', opacity: isClientLocked ? 0.75 : 1 }} value={dcTelefone} onChange={e => setDcTelefone(e.target.value)} disabled={isClientLocked} placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Data de Nascimento {isClientLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <input type="date" className="form-control" style={{ fontSize: '0.83rem', opacity: isClientLocked ? 0.75 : 1 }} value={dcNascimento} onChange={e => setDcNascimento(e.target.value)} disabled={isClientLocked} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Sexo {isClientLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <select className="select-custom" style={{ fontSize: '0.83rem', opacity: isClientLocked ? 0.75 : 1 }} value={dcSexo} onChange={e => setDcSexo(e.target.value)} disabled={isClientLocked}>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="O">Outro</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 0.8fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      CEP {isClientLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <input type="text" className="form-control" style={{ fontSize: '0.83rem', opacity: isClientLocked ? 0.75 : 1 }} value={dcCep} onChange={e => setDcCep(e.target.value)} disabled={isClientLocked} placeholder="00000-000" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Endereço (Rua/Avenida) {isClientLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <input type="text" className="form-control" style={{ fontSize: '0.83rem', opacity: isClientLocked ? 0.75 : 1 }} value={dcEndereco} onChange={e => setDcEndereco(e.target.value)} disabled={isClientLocked} placeholder="Rua..." />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Número {isClientLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <input type="text" className="form-control" style={{ fontSize: '0.83rem', opacity: isClientLocked ? 0.75 : 1 }} value={dcNumero} onChange={e => setDcNumero(e.target.value)} disabled={isClientLocked} placeholder="123" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Complemento {isClientLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <input type="text" className="form-control" style={{ fontSize: '0.83rem', opacity: isClientLocked ? 0.75 : 1 }} value={dcComplemento} onChange={e => setDcComplemento(e.target.value)} disabled={isClientLocked} placeholder="Apto, Bloco..." />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 0.8fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Bairro {isClientLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <input type="text" className="form-control" style={{ fontSize: '0.83rem', opacity: isClientLocked ? 0.75 : 1 }} value={dcBairro} onChange={e => setDcBairro(e.target.value)} disabled={isClientLocked} placeholder="Bairro" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Cidade {isClientLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <input type="text" className="form-control" style={{ fontSize: '0.83rem', opacity: isClientLocked ? 0.75 : 1 }} value={dcCidade} onChange={e => setDcCidade(e.target.value)} disabled={isClientLocked} placeholder="Cidade" />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Estado (UF) {isClientLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <input type="text" className="form-control" style={{ fontSize: '0.83rem', opacity: isClientLocked ? 0.75 : 1 }} value={dcEstado} onChange={e => setDcEstado(e.target.value)} disabled={isClientLocked} placeholder="UF" />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* BLOCO VÍNCULO E BUSCA ASAAS */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <i className="fa-solid fa-credit-card" style={{ color: 'var(--color-primary)' }}></i> Vínculo Asaas (ID do Cliente)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-control"
                style={{ fontSize: '0.83rem', flex: 1 }}
                value={dcAsaasCustomerId}
                onChange={e => setDcAsaasCustomerId(e.target.value)}
                placeholder="ex: cus_0000057489 (ou deixe em branco para CPF)"
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', whiteSpace: 'nowrap', background: 'rgba(16,185,129,0.1)', color: 'var(--color-primary)', borderColor: 'rgba(16,185,129,0.3)' }}
                onClick={handleSearchAsaas}
                disabled={searchingAsaas}
              >
                {searchingAsaas ? (
                  <span><i className="fa-solid fa-spinner fa-spin"></i> Buscando...</span>
                ) : (
                  <span><i className="fa-solid fa-magnifying-glass"></i> Buscar no Asaas</span>
                )}
              </button>
            </div>
            <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', marginTop: '4px' }}>
              Insira o ID ou deixe em branco para buscar por CPF/E-mail no Asaas.
            </small>
          </div>

          {/* =========================================================================
              BLOCO DADOS COMERCIAIS DO CONTRATO (BLINDADOS SE CONTRATADO / LIBERÁVEIS)
              ========================================================================= */}
          {(() => {
            const hasContractOrProposal = Boolean(
              selectedClient.dadosComerciais?.planoId || 
              selectedClient.dadosComerciais?.status === 'ativo' ||
              activeProposal ||
              (contracts && contracts.length > 0)
            );
            const isCommercialLocked = Boolean(hasContractOrProposal && selectedClient.bloqueioCadastral?.bloqueado !== false);

            return (
              <div style={{
                background: 'var(--bg-secondary)',
                border: isCommercialLocked ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-file-contract" style={{ color: isCommercialLocked ? '#34d399' : 'var(--color-primary)', fontSize: '1.05rem' }}></i>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      Auditoria & Condições Comerciais do Contrato
                    </h4>
                    {isCommercialLocked ? (
                      <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fa-solid fa-lock"></i> Contratado pelo Aluno (Blindado)
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fa-solid fa-pen"></i> Edição Comercial Liberada
                      </span>
                    )}
                  </div>

                  {isCommercialLocked && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowUnlockModal(true)}
                      style={{
                        fontSize: '0.75rem',
                        padding: '4px 10px',
                        background: 'rgba(251, 191, 36, 0.15)',
                        color: '#fbbf24',
                        borderColor: 'rgba(251, 191, 36, 0.4)',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fa-solid fa-lock-open"></i> Liberar Edição (Admin)
                    </button>
                  )}
                </div>

                {/* Banner de Auditoria de Vigência */}
                <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Tipo de Vigência</span>
                    <strong style={{ fontSize: '0.92rem', color: '#38bdf8', textTransform: 'capitalize' }}>
                      {dcDuracao === 'semana' ? 'Semanal' : (dcDuracao === 'anual' ? 'Anual' : 'Mensal')}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Quantidade de Vigência</span>
                    <strong style={{ fontSize: '0.92rem', color: '#34d399' }}>
                      {dcVigenciaQtd} {dcDuracao === 'semana' ? (dcVigenciaQtd === 1 ? 'semana' : 'semanas') : (dcDuracao === 'anual' ? (dcVigenciaQtd === 1 ? 'ano' : 'anos') : (dcVigenciaQtd === 1 ? 'mês' : 'meses'))}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Período Oficial</span>
                    <strong style={{ fontSize: '0.85rem', color: '#f8fafc' }}>
                      {dcDataInicio ? new Date(dcDataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : '-'} até {dcVencimento ? new Date(dcVencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Recorrência Automática</span>
                    <strong style={{ fontSize: '0.85rem', color: (dcCriarRecorrencia || selectedClient?.dadosComerciais?.criarRecorrenciaMensal) ? '#10b981' : '#64748b' }}>
                      {(dcCriarRecorrencia || selectedClient?.dadosComerciais?.criarRecorrenciaMensal) ? '🟢 Ativa' : '⚪ Inativa'}
                    </strong>
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    Plano {isCommercialLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                  </label>
                  <select
                    className="select-custom"
                    value={dcPlano}
                    disabled={isCommercialLocked}
                    style={{ opacity: isCommercialLocked ? 0.75 : 1 }}
                    onChange={e => {
                      const newPlanoId = e.target.value;
                      setDcPlano(newPlanoId);
                      const plan = plans.find(p => p._id === newPlanoId);
                      if (plan) {
                        setDcValorUnitario(plan.preco);
                        setDcDuracao(plan.tipo === 'Anual' ? 'anual' : 'mensal');
                        setDcVigenciaQtd(1);
                        setDcCreditosTotal(plan.creditosTotal || 0);
                      }
                    }}
                    required
                  >
                    <option value="">Selecione um plano...</option>
                    {plans.filter((p: any) => p.ativo !== false).map((p: any) => (
                      <option key={p._id} value={p._id}>{p.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-signal" style={{ color: dcStatus === 'ativo' ? '#10b981' : dcStatus === 'lead' ? '#8b5cf6' : dcStatus === 'congelado' ? '#f59e0b' : '#94a3b8' }}></i>
                    Status Comercial do Contrato {isCommercialLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                  </label>
                  <select
                    className="select-custom"
                    value={dcStatus}
                    disabled={isCommercialLocked}
                    style={{ fontWeight: 600, opacity: isCommercialLocked ? 0.75 : 1 }}
                    onChange={e => setDcStatus(e.target.value)}
                  >
                    <option value="ativo">🟢 Contrato Ativo (Matrícula Efetivada)</option>
                    <option value="lead">🟣 Lead / Em Avaliação</option>
                    <option value="congelado">🟡 Congelado</option>
                    <option value="finalizado">🏁 Finalizado</option>
                    <option value="inativo">⚪ Inativo</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: '1 1 200px' }}>
                    <label>
                      Forma de Pagamento {isCommercialLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <select className="select-custom" value={dcFormaPag} onChange={e => setDcFormaPag(e.target.value)} disabled={isCommercialLocked} style={{ opacity: isCommercialLocked ? 0.75 : 1 }} required>
                      <option value="pix">Pix</option>
                      <option value="cartao">Cartão de Crédito</option>
                      <option value="boleto">Boleto Bancário</option>
                      <option value="dinheiro">Dinheiro</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: '1 1 200px' }}>
                    <label>
                      Dia de Vencimento (1º Vencimento) {isCommercialLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={dcVencimento}
                      onChange={e => setDcVencimento(e.target.value)}
                      disabled={isCommercialLocked}
                      style={{ opacity: isCommercialLocked ? 0.75 : 1 }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: '1 1 200px' }}>
                    <label>
                      Tipo de Vigência {isCommercialLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <select className="select-custom" value={dcDuracao} onChange={e => setDcDuracao(e.target.value as any)} disabled={isCommercialLocked} style={{ opacity: isCommercialLocked ? 0.75 : 1 }} required>
                      <option value="semana">Semana</option>
                      <option value="mensal">Mensal</option>
                      <option value="anual">Anual</option>
                      <option value="indeterminado">Indeterminado</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: '1 1 200px' }}>
                    <label>
                      Quantidade de Vigência {isCommercialLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={dcVigenciaQtd}
                      onFocus={selectOnFocus}
                      onChange={e => setDcVigenciaQtd(Math.max(1, parseInt(e.target.value.replace(/^0+(?=\d)/, '') || '0', 10)))}
                      min={1}
                      disabled={isCommercialLocked}
                      style={{ opacity: isCommercialLocked ? 0.75 : 1 }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: '1 1 200px' }}>
                    <label>
                      Desconto Tipo {isCommercialLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <select className="select-custom" value={dcDescontoTipo} onChange={e => setDcDescontoTipo(e.target.value as any)} disabled={isCommercialLocked} style={{ opacity: isCommercialLocked ? 0.75 : 1 }}>
                      <option value="percentual">Percentual (%)</option>
                      <option value="fixo">Fixo (R$)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: '1 1 200px' }}>
                    <label>
                      Desconto Valor {isCommercialLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    {dcDescontoTipo === 'percentual' ? (
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        placeholder="0%"
                        value={dcDescontoValor || ''}
                        onFocus={selectOnFocus}
                        onChange={e => setDcDescontoValor(parseFloat(e.target.value) || 0)}
                        disabled={isCommercialLocked}
                        style={{ opacity: isCommercialLocked ? 0.75 : 1 }}
                      />
                    ) : (
                      <MoneyInput
                        value={dcDescontoValor}
                        onChange={setDcDescontoValor}
                        placeholder="R$ 0,00"
                        disabled={isCommercialLocked}
                      />
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: '1 1 200px' }}>
                    <label>
                      Nº Parcelas {isCommercialLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <select className="select-custom" value={dcParcelas} onChange={e => setDcParcelas(Number(e.target.value))} disabled={isCommercialLocked} style={{ opacity: isCommercialLocked ? 0.75 : 1 }} required>
                      {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}x</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: '1 1 200px' }}>
                    <label>
                      Valor Unitário (R$) {isCommercialLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <MoneyInput
                      value={dcValorUnitario}
                      onChange={setDcValorUnitario}
                      placeholder="R$ 0,00"
                      disabled={isCommercialLocked}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: '1 1 200px' }}>
                    <label>
                      Frequência Semanal Contratada {isCommercialLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <select
                      className="select-custom"
                      value={dcFrequencia}
                      disabled={isCommercialLocked}
                      style={{ opacity: isCommercialLocked ? 0.75 : 1 }}
                      onChange={e => {
                        const freq = Number(e.target.value);
                        setDcFrequencia(freq);
                        if (freq === 1) setDcCreditosTotal(4);
                        else if (freq === 2) setDcCreditosTotal(9);
                        else if (freq === 3) setDcCreditosTotal(13);
                        else if (freq === 4) setDcCreditosTotal(17);
                        else if (freq === 5) setDcCreditosTotal(22);
                      }}
                    >
                      <option value={1}>1x por semana (4 sessões/mês)</option>
                      <option value={2}>2x por semana (9 sessões/mês)</option>
                      <option value={3}>3x por semana (13 sessões/mês)</option>
                      <option value={4}>4x por semana (17 sessões/mês)</option>
                      <option value={5}>5x por semana (22 sessões/mês)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: '1 1 200px' }}>
                    <label>
                      Data de Início {isCommercialLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={dcDataInicio}
                      onChange={e => setDcDataInicio(e.target.value)}
                      disabled={isCommercialLocked}
                      style={{ opacity: isCommercialLocked ? 0.75 : 1 }}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: '1 1 200px' }}>
                    <label>
                      Créditos Mensais {isCommercialLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={dcCreditosTotal}
                      onFocus={selectOnFocus}
                      onChange={e => setDcCreditosTotal(parseInt(e.target.value.replace(/^0+(?=\d)/, '') || '0', 10))}
                      min={0}
                      disabled={isCommercialLocked}
                      style={{ opacity: isCommercialLocked ? 0.75 : 1 }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: '1 1 200px' }}>
                    <label>
                      Créditos de Massagem (Mensais) {isCommercialLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={dcCreditosMassagem}
                      onFocus={selectOnFocus}
                      onChange={e => setDcCreditosMassagem(parseInt(e.target.value.replace(/^0+(?=\d)/, '') || '0', 10))}
                      min={0}
                      disabled={isCommercialLocked}
                      style={{ opacity: isCommercialLocked ? 0.75 : 1 }}
                    />
                  </div>
                  <div className="form-group" style={{ flex: '1 1 200px' }}>
                    <label>
                      Créditos de Emergência (Mensais) {isCommercialLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={dcCreditosEmergencia}
                      onFocus={selectOnFocus}
                      onChange={e => setDcCreditosEmergencia(parseInt(e.target.value.replace(/^0+(?=\d)/, '') || '0', 10))}
                      min={0}
                      disabled={isCommercialLocked}
                      style={{ opacity: isCommercialLocked ? 0.75 : 1 }}
                    />
                  </div>
                </div>

                {/* CAIXA DE RECORRÊNCIA MENSAL AUTOMÁTICA */}
                <div style={{ marginTop: '8px', marginBottom: '4px', padding: '14px', background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: isCommercialLocked ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={dcCriarRecorrencia}
                      onChange={e => setDcCriarRecorrencia(e.target.checked)}
                      disabled={isCommercialLocked}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
                    />
                    <span><i className="fa-solid fa-arrows-rotate" style={{ marginRight: '6px', color: '#3b82f6' }}></i> Criar Recorrência Mensal Automática para este Plano {isCommercialLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}</span>
                  </label>
                  {dcCriarRecorrencia && (
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Duração da Recorrência Mensal:</label>
                      <select
                        className="select-custom"
                        value={dcRecorrenciaMeses}
                        onChange={e => setDcRecorrenciaMeses(Number(e.target.value))}
                        disabled={isCommercialLocked}
                        style={{ width: '160px', padding: '6px 10px', fontSize: '0.83rem', opacity: isCommercialLocked ? 0.75 : 1 }}
                      >
                        <option value={3}>3 Meses</option>
                        <option value={6}>6 Meses</option>
                        <option value={12}>12 Meses (1 Ano)</option>
                        <option value={24}>24 Meses (2 Anos)</option>
                      </select>
                      <small style={{ color: '#3b82f6', fontSize: '0.75rem', flex: '1 1 100%' }}>
                        Gera cobranças mensais automáticas consecutivas a partir da Data do 1º Vencimento.
                      </small>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>
                    Observações Contratuais (Opcional) {isCommercialLocked && <span style={{ color: '#34d399', fontSize: '0.68rem' }}>[Blindado]</span>}
                  </label>
                  <textarea
                    className="form-control"
                    value={dcObservacoesContratuais}
                    onChange={e => setDcObservacoesContratuais(e.target.value)}
                    placeholder="Inserir observações opcionais..."
                    disabled={isCommercialLocked}
                    style={{ minHeight: '60px', resize: 'vertical', opacity: isCommercialLocked ? 0.75 : 1 }}
                  />
                </div>
              </div>
            );
          })()}

          {/* SIMULADOR DE PREÇO & FECHAMENTO */}
          {(() => {
            const brutoSim = dcValorUnitario * dcVigenciaQtd;
            const descValSim = Number(dcDescontoValor) || 0;
            let liquidoSim = brutoSim;
            if (dcDescontoTipo === 'percentual') {
              liquidoSim = brutoSim * (1 - descValSim / 100);
            } else {
              liquidoSim = Math.max(0, brutoSim - descValSim);
            }
            const descontoReaisSim = brutoSim - liquidoSim;
            const valorParcelaSim = liquidoSim / (Number(dcParcelas) || 1);

            const endD = new Date((dcDataInicio || new Date().toISOString().split('T')[0]) + 'T00:00:00');
            if (dcDuracao === 'semana') {
              endD.setDate(endD.getDate() + (dcVigenciaQtd * 7));
            } else if (dcDuracao === 'anual') {
              endD.setMonth(endD.getMonth() + (dcVigenciaQtd * 12));
            } else {
              endD.setMonth(endD.getMonth() + dcVigenciaQtd);
            }
            const dataFimSimStr = endD.toLocaleDateString('pt-BR');

            return (
              <div style={{
                marginTop: '10px',
                padding: '16px',
                background: 'rgba(16, 185, 129, 0.04)',
                border: '1px dashed rgba(16, 185, 129, 0.35)',
                borderRadius: '10px',
                color: 'var(--text-main)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                  <h4 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <i className="fa-solid fa-receipt" style={{ marginRight: '6px' }}></i> Resumo de Venda & Fechamento (Apresentação ao Cliente)
                  </h4>
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(16,185,129,0.12)', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                    Fechamento
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Período de Vigência</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 'bold', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-calendar-week" style={{ color: 'var(--color-primary)', fontSize: '0.85rem' }}></i>
                      {dcDataInicio ? new Date(dcDataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} até {dataFimSimStr}
                    </div>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', marginTop: '2px' }}>
                      Duração: {dcDuracao === 'semana' ? `${dcVigenciaQtd} semana(s)` : dcDuracao === 'mensal' ? `${dcVigenciaQtd} mês(es)` : `${dcVigenciaQtd} ano(s)`}
                    </small>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Valor Total (Líquido)</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 'bold', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-circle-check" style={{ color: 'var(--color-success)', fontSize: '0.85rem' }}></i>
                      R$ {liquidoSim.toFixed(2).replace('.', ',')}
                    </div>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', marginTop: '2px' }}>
                      Bruto: R$ {brutoSim.toFixed(2).replace('.', ',')} (Desc: R$ {descontoReaisSim.toFixed(2).replace('.', ',')})
                    </small>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Condição de Pagamento</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 'bold', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-credit-card" style={{ color: 'var(--color-primary)', fontSize: '0.85rem' }}></i>
                      {dcParcelas}x de R$ {valorParcelaSim.toFixed(2).replace('.', ',')}
                    </div>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', marginTop: '2px' }}>
                      Forma: {dcFormaPag.toUpperCase()}
                    </small>
                  </div>
                </div>
              </div>
            );
          })()}

          <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={savingComercial}
              style={{ flex: '1 1 140px' }}
            >
              {savingComercial ? (
                <span><i className="fa-solid fa-spinner fa-spin"></i> Salvando...</span>
              ) : (
                <span><i className="fa-solid fa-floppy-disk"></i> Salvar no Perfil</span>
              )}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleOpenFinalizeModal(selectedClient)}
              style={{
                flex: '0 0 auto',
                background: 'rgba(107, 114, 128, 0.2)',
                color: '#d1d5db',
                border: '1px solid rgba(107, 114, 128, 0.4)',
                fontWeight: 700
              }}
              title="Encerrar este contrato/aluno e mover para Finalizados"
            >
              <i className="fa-solid fa-flag-checkered"></i> Finalizar Aluno (Não Renovou)
            </button>

            {saveSuccess && (
              <span style={{
                color: '#10b981',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                alignSelf: 'center',
                animation: 'fadeIn 0.3s ease'
              }}>
                <i className="fa-solid fa-circle-check" /> Salvo com sucesso!
              </span>
            )}
            {saveError && (
              <span style={{
                color: '#ef4444',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                alignSelf: 'center'
              }}>
                <i className="fa-solid fa-circle-xmark" /> {saveError}
              </span>
            )}

            <button
              type="button"
              className="btn btn-primary"
              disabled={generatingPayments}
              onClick={handleGeneratePaymentsExplicitly}
              style={{ flex: '1 1 200px', background: '#10b981', borderColor: '#10b981', color: '#ffffff', fontWeight: 'bold' }}
            >
              {generatingPayments ? (
                <span><i className="fa-solid fa-spinner fa-spin"></i> Lançando...</span>
              ) : (
                <span><i className="fa-solid fa-file-invoice-dollar" style={{ marginRight: '6px' }}></i> Lançar Parcelas</span>
              )}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              disabled={renewingValidity}
              onClick={() => handleRenewContractValidity(selectedClient)}
              style={{ flex: '1 1 180px', color: '#3b82f6', borderColor: 'rgba(59,130,246,0.4)', background: 'rgba(59,130,246,0.08)', fontWeight: 'bold' }}
            >
              {renewingValidity ? (
                <span><i className="fa-solid fa-spinner fa-spin"></i> Renovando...</span>
              ) : (
                <span><i className="fa-solid fa-arrows-rotate" style={{ marginRight: '6px' }}></i> Renovar Vigência (+1 Ciclo)</span>
              )}
            </button>

             {Boolean(dcCriarRecorrencia || selectedClient?.dadosComerciais?.criarRecorrenciaMensal) && (
               <button
                 type="button"
                 className="btn btn-secondary"
                 disabled={cancelingRecurrence}
                 onClick={() => handleCancelRecurrence(selectedClient)}
                 style={{ flex: '1 1 180px', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', fontWeight: 'bold' }}
               >
                 {cancelingRecurrence ? (
                   <span><i className="fa-solid fa-spinner fa-spin"></i> Finalizando...</span>
                 ) : (
                   <span><i className="fa-solid fa-circle-stop" style={{ marginRight: '6px' }}></i> Finalizar Recorrência</span>
                 )}
               </button>
             )}
          </div>
        </form>
      </div>

        {/* Right Column: Issuance & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Box 1: Issue actions */}
          <div className="content-panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <span>
                <i className="fa-solid fa-file-invoice" style={{ marginRight: '8px' }}></i> Emissão de Novo Contrato
              </span>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', background: 'var(--bg-secondary)', padding: '3px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <i className="fa-solid fa-user" style={{ marginRight: '6px', color: 'var(--color-primary)' }}></i>
                {selectedClient.dadosPessoais?.nome || selectedClient.nome || 'Aluno'}
              </span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', padding: '10px', background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.3)', color: '#10b981', fontWeight: 600 }}
                onClick={() => setShowTextPreview(true)}
              >
                <i className="fa-solid fa-book-open" style={{ marginRight: '6px' }}></i> Visualizar Texto Completo do Contrato
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', padding: '10px', background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.3)', color: '#3b82f6', fontWeight: 600 }}
                onClick={() => {
                  const plan = plans.find(p => p._id === dcPlano);
                  if (!plan) {
                    alert('Selecione um plano comercial na coluna da esquerda para gerar o PDF.');
                    return;
                  }
                  downloadContractPDF(selectedClient, plan, generateContractText(), { _id: 'draft' });
                }}
              >
                <i className="fa-solid fa-file-pdf" style={{ marginRight: '6px' }}></i> Baixar PDF do Modelo do Contrato
              </button>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={issuingContract}
                  style={{ flex: 1, minWidth: '140px', background: '#10b981', borderColor: '#10b981', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', opacity: issuingContract ? 0.6 : 1 }}
                  onClick={() => handleOpenSignatureModal()}
                >
                  <i className="fa-solid fa-hand-pointer"></i> Assinatura Presencial
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={issuingContract}
                  style={{ flex: 1, minWidth: '140px', color: '#22c55e', borderColor: 'rgba(34,197,94,0.4)', background: issuingContract ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.08)', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', cursor: issuingContract ? 'not-allowed' : 'pointer' }}
                  onClick={() => handleIssueContract('clicksign')}
                  title="Enviar link de assinatura diretamente para o WhatsApp do aluno e E-mail da clínica via Clicksign"
                >
                  {issuingContract ? (
                    <span><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Enviando p/ Clicksign...</span>
                  ) : (
                    <span><i className="fa-brands fa-whatsapp" style={{ fontSize: '1.05rem', marginRight: '6px' }}></i> Enviar p/ Clicksign (WhatsApp)</span>
                  )}
                </button>
                 <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={issuingContract}
                  style={{ flex: 1, minWidth: '140px', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', opacity: issuingContract ? 0.6 : 1 }}
                  onClick={() => handleIssueContract('pendente')}
                >
                  <i className="fa-solid fa-clock"></i> Emitir Pendente
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={generatingProposal || issuingContract}
                  style={{ flex: 1, minWidth: '140px', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.4)', background: 'rgba(251,191,36,0.08)', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', opacity: (generatingProposal || issuingContract) ? 0.6 : 1 }}
                  onClick={() => handleOpenSalesWizard(selectedClient)}
                >
                  <i className="fa-solid fa-bolt"></i> Gerar Link de Venda
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={issuingContract}
                  style={{ flex: 1, minWidth: '100%', color: '#10b981', borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.1)', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', marginTop: '6px', opacity: issuingContract ? 0.6 : 1 }}
                  onClick={() => setShowImportSignedModal(true)}
                >
                  <i className="fa-solid fa-file-circle-check"></i> Registrar Já Assinado (Anexar PDF)
                </button>
              </div>
            </div>
          </div>

          {/* Box 2: Contract History */}
          <div className="content-panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <span>
                <i className="fa-solid fa-history" style={{ marginRight: '8px' }}></i> Histórico de Contratos Emitidos
              </span>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {selectedClient.dadosPessoais?.nome || selectedClient.nome || 'Aluno'}
              </span>
            </h3>

            {loadingContracts ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Carregando contratos...
              </div>
            ) : contracts.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Nenhum contrato emitido anteriormente para este aluno.
              </div>
            ) : (
              <div className="table-responsive" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Emissão</th>
                      <th>Plano</th>
                      <th>Tipo</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((c: any) => {
                      const cType = c.assinaturaPresencialImage ? 'Presencial (Touch)' : c.clicksignDocKey ? 'Clicksign' : 'Manual';
                      const st = c.status === 'assinado' ? 'assinado' : (c.clicksignStatus || c.status);
                      const statusColor = st === 'assinado' ? 'var(--color-success)' : st === 'cancelado' ? 'var(--color-danger)' : 'var(--color-warning)';
                      
                      return (
                        <tr key={c._id}>
                          <td>{new Date(c.dataEmissao).toLocaleDateString('pt-BR')}</td>
                          <td style={{ fontWeight: 600 }}>{c.planoNome}</td>
                          <td>{cType}</td>
                          <td>
                            <span style={{ color: statusColor, fontWeight: 700 }}>
                              {st === 'assinado' ? 'Assinado' : st === 'cancelado' ? 'Cancelado' : 'Pendente'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '3px 6px', fontSize: '0.75rem' }}
                                title="Baixar PDF do Contrato"
                                onClick={() => {
                                  const plan = plans.find(p => p._id === (c.planoId?._id || c.planoId));
                                  if (plan) downloadContractPDF(selectedClient, plan, c.contratoTexto, c);
                                }}
                              >
                                <i className="fa-solid fa-file-pdf"></i>
                              </button>

                              {st === 'pendente' && (
                                <button
                                  className="btn btn-success"
                                  style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  title="Confirmar / Marcar como Assinado e Ativar Plano"
                                  onClick={() => handleConfirmSignContract(c._id)}
                                >
                                  <i className="fa-solid fa-file-circle-check"></i> Marcar Assinado
                                </button>
                              )}

                              {c.clicksignDocKey && st === 'pendente' && (
                                <>
                                  <button
                                    className="btn btn-secondary"
                                    style={{ padding: '3px 6px', fontSize: '0.75rem', color: 'var(--color-primary)' }}
                                    title="Sincronizar com Clicksign"
                                    onClick={() => handleSyncClicksign(c._id)}
                                  >
                                    <i className="fa-solid fa-sync"></i>
                                  </button>
                                  {c.clicksignUrl && (
                                    <a
                                      href={c.clicksignUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-secondary"
                                      style={{ padding: '3px 6px', fontSize: '0.75rem', color: '#6366f1' }}
                                      title="Abrir Link Clicksign"
                                    >
                                      <i className="fa-solid fa-external-link"></i>
                                    </a>
                                  )}
                                </>
                              )}

                              {st !== 'cancelado' && (
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '3px 6px', fontSize: '0.75rem', color: 'var(--color-danger)' }}
                                  title="Cancelar Contrato"
                                  onClick={() => handleCancelContract(c._id, selectedClient.dadosPessoais?.nome)}
                                >
                                  <i className="fa-solid fa-trash"></i>
                                </button>
                              )}
                            </div>
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
      </div>
      </div>
      )}

      {/* MODAL 1: TEXT PREVIEW */}
      {showTextPreview && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowTextPreview(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h3>Minuta de Contrato Gerada</h3>
              <button className="modal-close" onClick={() => setShowTextPreview(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '500px', overflowY: 'auto', background: '#fff', color: '#000', padding: '30px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              <div dangerouslySetInnerHTML={{ __html: generateContractText() }} />
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#3b82f6', borderColor: '#3b82f6', display: 'flex', gap: '6px', alignItems: 'center' }}
                onClick={() => {
                  const plan = plans.find(p => p._id === dcPlano);
                  if (!plan) {
                    alert('Selecione um plano comercial na coluna da esquerda para gerar o PDF.');
                    return;
                  }
                  downloadContractPDF(selectedClient, plan, generateContractText(), { _id: 'draft' });
                }}
              >
                <i className="fa-solid fa-file-pdf"></i> Baixar PDF
              </button>
              <button className="btn btn-secondary" onClick={() => setShowTextPreview(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PRESENTIAL SIGNATURE (TOUCH / CANVAS) */}
      {showSignatureModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => { if (!submittingSignature) setShowSignatureModal(false); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px', width: '95%' }}>
            <div className="modal-header">
              <h3>Assinatura Eletrônica Presencial</h3>
              <button className="modal-close" onClick={() => { if (!submittingSignature) setShowSignatureModal(false); }}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Vire o tablet, celular ou tela touchscreen para que o aluno leia os termos e assine com o dedo ou caneta stylus.
              </p>

              <div className="form-group">
                <label>Nome Completo do Assinante</label>
                <input
                  type="text"
                  className="form-control"
                  value={sigName}
                  onChange={e => setSigName(e.target.value)}
                  placeholder="Nome do aluno ou responsável legal"
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Desenhe a assinatura abaixo:</label>
                <div style={{ background: '#fff', borderRadius: '6px', padding: '4px', display: 'flex', justifyContent: 'center' }}>
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={180}
                    style={{
                      border: '2px dashed #94a3b8',
                      borderRadius: '4px',
                      cursor: 'crosshair',
                      background: '#ffffff',
                      maxWidth: '100%',
                      touchAction: 'none'
                    }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawingTouch}
                    onTouchMove={drawTouch}
                    onTouchEnd={stopDrawingTouch}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={clearCanvas}>
                    <i className="fa-solid fa-eraser"></i> Limpar Tela
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '6px' }}>
                <input
                  type="checkbox"
                  id="sigConsentCheck"
                  checked={sigConsent}
                  onChange={e => setSigConsent(e.target.checked)}
                  style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
                />
                <label htmlFor="sigConsentCheck" style={{ fontSize: '0.8rem', cursor: 'pointer', lineHeight: '1.4', margin: 0, fontWeight: 500 }}>
                  Declaro que li e concordo com todos os termos do contrato, realizando a assinatura por meio eletrônico touchscreen neste terminal presencial.
                </label>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowSignatureModal(false)}
                disabled={submittingSignature}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveSignatureContract}
                disabled={submittingSignature || !sigConsent || !sigName}
                style={{ background: '#10b981', borderColor: '#10b981' }}
              >
                {submittingSignature ? (
                  <span><i className="fa-solid fa-spinner fa-spin"></i> Enviando...</span>
                ) : (
                  <span><i className="fa-solid fa-file-signature"></i> Finalizar Assinatura</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: IMPORT EXISTING SIGNED CONTRACT */}
      {showImportSignedModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => { if (!submittingImport) setShowImportSignedModal(false); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '95%' }}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-file-circle-check" style={{ marginRight: '8px', color: 'var(--color-success)' }}></i>Registrar Contrato Já Assinado</h3>
              <button className="modal-close" onClick={() => { if (!submittingImport) setShowImportSignedModal(false); }}>&times;</button>
            </div>
            <form onSubmit={handleImportSignedContract} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', padding: '12px', borderRadius: '8px', fontSize: '0.83rem', color: 'var(--text-main)' }}>
                <strong>Ativação Direta de Aluno:</strong> Utilize esta opção para cadastrar alunos migrados que já possuem contrato assinado anteriormente. O contrato será registrado com status <strong style={{ color: 'var(--color-success)' }}>ASSINADO</strong> e o plano será ativado imediatamente.
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Anexar PDF do Contrato Assinado (Opcional)</label>
                <input
                  type="file"
                  accept="application/pdf"
                  className="form-control"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handlePdfFileSelect(file);
                  }}
                />
                {importPdfName && (
                  <small style={{ color: 'var(--color-success)', marginTop: '4px', display: 'block' }}>
                    <i className="fa-solid fa-circle-check"></i> Arquivo selecionado: {importPdfName}
                  </small>
                )}
              </div>

              <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '6px', background: 'var(--bg-secondary)', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><strong>Aluno:</strong> {selectedClient?.dadosPessoais?.nome || '—'}</div>
                <div><strong>Plano:</strong> {plans.find(p => p._id === dcPlano)?.nome || 'Não selecionado'}</div>
                <div><strong>Data de Início:</strong> {dcDataInicio || 'Não informada'}</div>
                <div><strong>Vigência:</strong> {dcVigenciaQtd} {dcDuracao}(s)</div>
                <div><strong>Valor Unitário:</strong> R$ {dcValorUnitario.toFixed(2)} | <strong>Parcelas:</strong> {dcParcelas}x</div>
                <div><strong>Forma de Pagamento:</strong> {dcFormaPag.toUpperCase()}</div>
              </div>

              <div className="modal-footer" style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowImportSignedModal(false)} disabled={submittingImport}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)' }} disabled={submittingImport}>
                  {submittingImport ? (
                    <span><i className="fa-solid fa-spinner fa-spin"></i> Registrando...</span>
                  ) : (
                    <span><i className="fa-solid fa-check-double"></i> Confirmar e Ativar Aluno</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proposal URL Modal */}
      {showProposalModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '24px', maxWidth: '500px', width: '90%', boxShadow: 'var(--shadow-card)' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: 'var(--color-primary)', fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-share-nodes"></i> Link de Auto-Cadastro Gerado!
              </h3>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setShowProposalModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '16px' }}>
              Copie o link abaixo e envie para o aluno via WhatsApp ou E-mail. Ele poderá preencher os próprios dados cadastrais (CPF, CEP, etc.) e escolher a forma de pagamento/parcelas com base nas regras comerciais configuradas.
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  readOnly
                  className="form-control"
                  style={{ flex: 1, fontSize: '0.83rem', background: 'rgba(255,255,255,0.03)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}
                  value={generatedProposalUrl}
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ background: 'var(--color-primary)', display: 'flex', gap: '6px', alignItems: 'center' }}
                  onClick={() => {
                    navigator.clipboard.writeText(generatedProposalUrl);
                    alert('Link copiado para a área de transferência!');
                  }}
                >
                  <i className="fa-solid fa-copy"></i> Copiar
                </button>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#25D366', borderColor: '#25D366', color: '#fff', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', width: '100%', marginTop: '4px', fontWeight: 'bold' }}
                onClick={() => {
                  const clientName = selectedClient?.dadosPessoais?.nome ? ` *${selectedClient.dadosPessoais.nome}*` : '';
                  const planName = plans.find(p => p._id === dcPlano)?.nome || '';
                  const phone = (selectedClient?.dadosPessoais?.telefone || '').replace(/\D/g, '');
                  const message = 
                    `🏋️‍♂️ *Olá${clientName}! Tudo bem?*\n\n` +
                    `Sua proposta comercial do *Clube Fitness Fisio*${planName ? ` para o plano *${planName}*` : ''} está pronta! 📄✨\n\n` +
                    `Clique no link abaixo para conferir as condições, revisar e assinar seu contrato:\n` +
                    `${generatedProposalUrl}\n\n` +
                    `_Qualquer dúvida, estamos à total disposição!_ 💚`;
                  const text = encodeURIComponent(message);
                  const whatsappUrl = phone 
                    ? `https://api.whatsapp.com/send?phone=55${phone}&text=${text}`
                    : `https://api.whatsapp.com/send?text=${text}`;
                  window.open(whatsappUrl, '_blank');
                }}
              >
                <i className="fa-brands fa-whatsapp fa-lg"></i> Enviar via WhatsApp
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowProposalModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Compartilhamento do Link de Renovação */}
      {showRenewalModal && activeRenewal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '18px', width: '100%', maxWidth: '560px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: '1.2rem' }}>
                  <i className="fa-solid fa-arrows-rotate"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Link de Renovação Gerado!</h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Aluno: <strong>{renewalTargetClient?.dadosPessoais?.nome || 'Aluno'}</strong>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowRenewalModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>&times;</button>
            </div>

            {/* Resumo Financeiro da Renovação */}
            <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Plano:</span>
                <strong>{activeRenewal.planoNome} (Anual)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Vigência do Novo Contrato:</span>
                <strong style={{ color: '#10b981' }}>
                  12 meses ({new Date(activeRenewal.dataInicioRenovacao + 'T12:00:00').toLocaleDateString('pt-BR')} até {new Date(activeRenewal.dataFimCalculada + 'T12:00:00').toLocaleDateString('pt-BR')})
                </strong>
              </div>
              <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Valor Total do Plano:</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981' }}>
                  R$ {activeRenewal.valorReajustado.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span>📄 Boleto até 10x de R$ {(activeRenewal.valorReajustado / 10).toFixed(2).replace('.', ',')}</span>
                <span>•</span>
                <span>💳 Cartão até 12x (+5%)</span>
                <span>•</span>
                <span>🟢 PIX à vista</span>
              </div>
            </div>

            {/* Input com Link e Botão Copiar */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>Link Exclusivo do Aluno:</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  readOnly
                  className="form-control"
                  style={{ flex: 1, fontSize: '0.83rem', background: 'rgba(255,255,255,0.03)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}
                  value={generatedRenewalUrl}
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ background: 'var(--color-primary)', display: 'flex', gap: '6px', alignItems: 'center', whiteSpace: 'nowrap' }}
                  onClick={() => {
                    navigator.clipboard.writeText(generatedRenewalUrl);
                    alert('Link de renovação copiado com sucesso!');
                  }}
                >
                  <i className="fa-solid fa-copy"></i> Copiar
                </button>
              </div>
            </div>

            {/* Botão Enviar WhatsApp */}
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: '#25D366', borderColor: '#25D366', color: '#fff', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '14px', borderRadius: '12px', fontWeight: 800, fontSize: '0.95rem' }}
              onClick={() => {
                const clientName = renewalTargetClient?.dadosPessoais?.nome || 'Aluno';
                const phone = (renewalTargetClient?.dadosPessoais?.telefone || '').replace(/\D/g, '');
                const dataFimFormat = activeRenewal.dataFimAnterior ? new Date(activeRenewal.dataFimAnterior + 'T12:00:00').toLocaleDateString('pt-BR') : '';
                const planoNome = activeRenewal.planoNome || 'Clube Fitness - Monitorado';
                const dataInicioFormat = activeRenewal.dataInicioRenovacao ? new Date(activeRenewal.dataInicioRenovacao + 'T12:00:00').toLocaleDateString('pt-BR') : '';
                const dataFimCalcFormat = activeRenewal.dataFimCalculada ? new Date(activeRenewal.dataFimCalculada + 'T12:00:00').toLocaleDateString('pt-BR') : '';
                
                let message = '';
                if (activeRenewal.isExpired) {
                  message = 
                    `🏋️‍♂️ *Olá, ${clientName}! Tudo bem?*\n\n` +
                    `Preparamos as condições exclusivas para a *Renovação do seu Plano* no *Clube Fitness & Fisio*! 📄✨\n\n` +
                    `📋 *Detalhes da sua Renovação:*\n` +
                    `• *Plano:* ${planoNome} (Anual)\n` +
                    `• *Vigência:* 12 meses (${dataInicioFormat} até ${dataFimCalcFormat})\n` +
                    `• *Pagamento:* Boleto (até 10x), Cartão (até 12x) ou PIX à vista\n\n` +
                    `Clique no link abaixo para conferir as condições, revisar e assinar digitalmente pelo WhatsApp:\n` +
                    `👉 ${generatedRenewalUrl}\n\n` +
                    `_Qualquer dúvida, estamos à sua inteira disposição!_ 💚`;
                } else {
                  message = 
                    `🏋️‍♂️ *Olá, ${clientName}! Tudo bem?*\n\n` +
                    `Seu plano atual no *Clube Fitness & Fisio* encerra no dia *${dataFimFormat}*. Preparamos as condições exclusivas da sua *Renovação Anual* para você continuar seus treinos sem interrupções! 📄✨\n\n` +
                    `📋 *Detalhes da sua Renovação:*\n` +
                    `• *Plano:* ${planoNome} (Anual)\n` +
                    `• *Novo Ciclo:* 12 meses (${dataInicioFormat} até ${dataFimCalcFormat})\n` +
                    `• *Pagamento:* Boleto (até 10x), Cartão (até 12x) ou PIX à vista\n\n` +
                    `Clique no link abaixo para conferir as condições, revisar e assinar digitalmente pelo WhatsApp:\n` +
                    `👉 ${generatedRenewalUrl}\n\n` +
                    `_Qualquer dúvida, estamos à sua inteira disposição!_ 💚`;
                }

                const text = encodeURIComponent(message);
                const whatsappUrl = phone 
                  ? `https://api.whatsapp.com/send?phone=55${phone}&text=${text}`
                  : `https://api.whatsapp.com/send?text=${text}`;
                window.open(whatsappUrl, '_blank');
              }}
            >
              <i className="fa-brands fa-whatsapp fa-lg"></i> Enviar Mensagem via WhatsApp
            </button>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowRenewalModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL EXECUTIVO 1: CONSULTA / RESUMO DO CONTRATO (SOMENTE LEITURA)
          ========================================================================= */}
      {consultingClient && (() => {
        const com = consultingClient.dadosComerciais || {};
        const plan = plans.find(p => p._id === (com.planoId?._id || com.planoId));
        const clientPy = allPaymentsMap[consultingClient._id] || [];
        const info = getContractValidityInfo(consultingClient, plan, clientPy);

        const rawTel = (consultingClient.dadosPessoais?.telefone || '').replace(/\D/g, '');
        const firstName = (consultingClient.dadosPessoais?.nome || 'Aluno').split(' ')[0];
        const waMsg = encodeURIComponent(`Olá ${firstName}! Tudo bem? Entramos em contato referente ao seu contrato no Clube Fitness.`);
        const waLink = rawTel ? `https://wa.me/55${rawTel}?text=${waMsg}` : null;

        return (
          <div className="modal-overlay" onClick={() => setConsultingClient(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', width: '95%' }}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                    <i className="fa-solid fa-file-contract"></i>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Resumo do Contrato</h3>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Modo de Leitura Executiva</div>
                  </div>
                </div>
                <button className="modal-close" onClick={() => setConsultingClient(null)}>&times;</button>
              </div>

              <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Cabeçalho do Aluno (Sem Avatar) */}
                {(() => {
                  const dtNasc = consultingClient.dadosPessoais?.dataNascimento || consultingClient.dadosPessoais?.nascimento;
                  let birthDateFormatted = '';
                  if (dtNasc) {
                    try {
                      const parts = dtNasc.split('-');
                      if (parts.length === 3 && parts[0].length === 4) {
                        birthDateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
                      } else {
                        birthDateFormatted = new Date(dtNasc + 'T12:00:00').toLocaleDateString('pt-BR');
                      }
                    } catch {
                      birthDateFormatted = dtNasc;
                    }
                  }

                  return (
                    <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                          {consultingClient.dadosPessoais?.nome || 'Sem Nome'}
                        </h4>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          CPF: <strong style={{ color: '#ffffff' }}>{consultingClient.dadosPessoais?.cpf || '—'}</strong>
                          {consultingClient.dadosPessoais?.telefone && ` • Tel: ${consultingClient.dadosPessoais.telefone}`}
                          {birthDateFormatted && ` • Nascimento: ${birthDateFormatted}`}
                        </div>
                        {consultingClient.dadosPessoais?.email && (
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            E-mail: {consultingClient.dadosPessoais.email}
                          </div>
                        )}
                      </div>

                      {/* Badge de Status Oficial Unificado */}
                      <span style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        background: info.badgeBg,
                        color: info.badgeColor,
                        border: `1px solid ${info.badgeBorder}`,
                        letterSpacing: '0.4px',
                        textTransform: 'uppercase'
                      }}>
                        {info.statusLabel}
                      </span>
                    </div>
                  );
                })()}

                {/* Vigência e Datas */}
                {(() => {
                  const isDynamus = Boolean(
                    plan?.nome?.toLowerCase().includes('dynamus') ||
                    com.planoNome?.toLowerCase().includes('dynamus') ||
                    consultingClient.dadosPessoais?.email?.toLowerCase().includes('dynamus') ||
                    consultingClient.codigo?.toUpperCase().includes('DYN') ||
                    consultingClient.dadosClinicos?.observacoes?.toLowerCase().includes('dynamus')
                  );
                  const isSemestral = (com.duracao || '').toLowerCase().includes('semestral') ||
                                      (plan?.nome || '').toLowerCase().includes('semestral') ||
                                      com.parcelas === 6;

                  // Cálculo dos 3 tipos de créditos para Dynamus
                  const total = com.creditosTotal || 0;
                  const usados = com.creditosUsados || 0;
                  const reservados = com.creditosReservados || 0;
                  const restantes = Math.max(0, total - usados - reservados);

                  const recoveryTotal = com.creditosRecoveryTotal || 0;
                  const recoveryUsados = com.creditosRecoveryUsados || 0;
                  const recoveryRestantes = Math.max(0, recoveryTotal - recoveryUsados);

                  const massagemTotal = com.creditosMassagemTotal || 0;
                  const massagemUsados = com.creditosMassagemUsados || 0;
                  const massagemRestantes = Math.max(0, massagemTotal - massagemUsados);

                  return (
                    <>
                      {/* Vigência e Datas */}
                      <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
                          <i className="fa-solid fa-calendar-check" style={{ color: 'var(--color-primary)', marginRight: '6px' }}></i> Plano & Vigência
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Plano Contratado</div>
                            <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{plan?.nome || (isDynamus ? 'Dynamus' : 'Não definido')}</strong>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Duração / Modalidade</div>
                            <strong style={{ fontSize: '0.95rem', color: isDynamus ? '#22d3ee' : 'var(--text-main)', textTransform: 'capitalize' }}>
                              {isDynamus 
                                ? (isSemestral ? 'Semestral (6 meses)' : 'Anual (12 meses)') 
                                : info.recorrenciaMeses && info.recorrenciaMeses > 1 
                                  ? `Recorrência (${info.recorrenciaMeses} meses)` 
                                  : `${com.duracao || 'Mensal'} ${com.duracaoQtd ? `(${com.duracaoQtd}x)` : ''}`}
                            </strong>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Data de Início</div>
                            <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>
                              {info.dataInicioFormatted}
                            </strong>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Acesso Liberado Até</div>
                            <strong style={{ fontSize: '0.92rem', color: info.isExpired ? '#ef4444' : info.isExpiringSoon ? '#f59e0b' : '#10b981' }}>
                              {info.dataFimFormatted}
                              {info.daysLeftText && ` (${info.daysLeftText})`}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Quadro de Créditos: Especial Dynamus vs Convencional */}
                      {isDynamus ? (
                        <div style={{ background: 'var(--bg-darker)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ fontSize: '0.74rem', color: '#22d3ee', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fa-solid fa-bolt" style={{ color: '#f59e0b' }}></i> Créditos do Convênio Dynamus
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                            {/* 1. Créditos Gerais de Treino */}
                            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '10px 12px' }}>
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>🏋️ Créditos de Treino</div>
                              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
                                {restantes} <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>/ {total}</span>
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '3px' }}>
                                Usados: {usados} | Reserv.: {reservados}
                              </div>
                            </div>

                            {/* 2. Créditos de Recovery */}
                            <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '10px', padding: '10px 12px' }}>
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>🧊 Recovery</div>
                              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
                                {recoveryRestantes} <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>/ {recoveryTotal}</span>
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '3px' }}>
                                Usados: {recoveryUsados}
                              </div>
                            </div>

                            {/* 3. Créditos de Massagem */}
                            <div style={{ background: 'rgba(236, 72, 153, 0.08)', border: '1px solid rgba(236, 72, 153, 0.25)', borderRadius: '10px', padding: '10px 12px' }}>
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>💆 Massagem</div>
                              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ec4899', marginTop: '2px' }}>
                                {massagemRestantes} <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>/ {massagemTotal}</span>
                              </div>
                              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '3px' }}>
                                Usados: {massagemUsados}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
                            <i className="fa-solid fa-dumbbell" style={{ color: 'var(--color-primary)', marginRight: '6px' }}></i> Frequência & Créditos Mensais
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Frequência Semanal</div>
                              <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                {com.frequencia ? `${com.frequencia}x por semana` : 'Não informada'}
                              </strong>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Créditos de Treino / Mês</div>
                              <strong style={{ fontSize: '0.95rem', color: 'var(--color-primary)' }}>
                                {com.creditosTotal !== undefined ? `${com.creditosTotal} créditos` : '—'}
                              </strong>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Créditos de Massagem</div>
                              <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                {((com.creditosMassagemTotal !== undefined ? com.creditosMassagemTotal : com.creditosMassagem) ?? 0)} créditos/mês
                              </strong>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Créditos de Emergência</div>
                              <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                {((com.creditosEmergenciaTotal !== undefined ? com.creditosEmergenciaTotal : com.creditosEmergencia) ?? 0)} créditos/mês
                              </strong>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Condições Financeiras */}
                      <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
                          <i className="fa-solid fa-wallet" style={{ color: 'var(--color-primary)', marginRight: '6px' }}></i> Condições Financeiras
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Valor Unitário / Mensal</div>
                            <strong style={{ fontSize: '1.1rem', color: isDynamus ? '#22d3ee' : 'var(--color-primary)' }}>
                              {isDynamus ? 'Convênio Corporativo' : (com.valorUnitario ? `R$ ${com.valorUnitario.toFixed(2).replace('.', ',')}` : 'R$ 0,00')}
                            </strong>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Forma de Pagamento</div>
                            <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)', textTransform: 'uppercase' }}>
                              {isDynamus ? 'Faturamento Empresarial (Dynamus)' : `${com.formaPagamento || 'PIX'} ${com.parcelas > 1 ? `(${com.parcelas}x)` : ''}`}
                            </strong>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>1º Vencimento</div>
                            <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                              {isDynamus ? '—' : (com.dataPrimeiroVencimento ? new Date(com.dataPrimeiroVencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—')}
                            </strong>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Recorrência Asaas</div>
                            <strong style={{ fontSize: '0.85rem', color: isDynamus ? 'var(--text-dim)' : (com.criarRecorrenciaMensal ? '#3b82f6' : 'var(--text-dim)') }}>
                              {isDynamus ? 'Isento (Convênio Corporativo)' : (com.criarRecorrenciaMensal ? `Ativa (${com.recorrenciaMeses || 12} meses)` : 'Desativada')}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Rodapé com Ações Rápidas */}
              <div className="modal-footer" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {waLink && (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ color: '#25d366', borderColor: 'rgba(37,211,102,0.3)', background: 'rgba(37,211,102,0.08)' }}
                    >
                      <i className="fa-brands fa-whatsapp"></i> WhatsApp
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      const target = consultingClient;
                      setConsultingClient(null);
                      handleGenerateRenewalLink(target);
                    }}
                    style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)' }}
                  >
                    <i className="fa-solid fa-arrows-rotate"></i> Renovar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      const target = consultingClient;
                      setConsultingClient(null);
                      handleSelectClient(target);
                    }}
                  >
                    <i className="fa-solid fa-sliders"></i> Editar Contrato
                  </button>
                </div>
                <button className="btn btn-secondary" onClick={() => setConsultingClient(null)}>Fechar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          MODAL EXECUTIVO 2: WIZARD DE LINK DE VENDA / AUTO-CADASTRO
          ========================================================================= */}
      {salesWizardClient && (() => {
        const activePlans = plans.filter((p: any) => p.ativo !== false);
        const gross = swValorUnitario * (swVigenciaQtd || 1);
        const discountVal = swDescontoTipo === 'percentual' ? (gross * (Number(swDescontoValor) || 0)) / 100 : (Number(swDescontoValor) || 0);
        const netVal = Math.max(0, gross - discountVal);

        return (
          <div className="modal-overlay" onClick={() => { if (!swSubmitting) setSalesWizardClient(null); }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', width: '95%' }}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                    <i className="fa-solid fa-link"></i>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Gerar Link de Venda</h3>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      Aluno: <strong>{salesWizardClient.dadosPessoais?.nome || 'Aluno'}</strong>
                    </div>
                  </div>
                </div>
                <button className="modal-close" onClick={() => { if (!swSubmitting) setSalesWizardClient(null); }}>&times;</button>
              </div>

              <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '78vh', overflowY: 'auto' }}>
                {/* Resumo Inteligente do Contexto do Aluno */}
                {(() => {
                  const com = salesWizardClient.dadosComerciais || {};
                  const isFinalizado = com.status === 'finalizado' || (com.vencimento && new Date(com.vencimento + 'T23:59:59') < new Date() && com.status !== 'ativo');
                  const isAtivo = com.status === 'ativo' && (!com.vencimento || new Date(com.vencimento + 'T23:59:59') >= new Date());
                  const hasPrevious = Boolean(com.planoId || com.valorUnitario || com.dataInicio || (salesWizardClient.historicoContratos && salesWizardClient.historicoContratos.length > 0));

                  if (isFinalizado) {
                    return (
                      <div style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '10px', padding: '12px', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <strong style={{ color: '#fbbf24', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fa-solid fa-flag-checkered"></i> Último Contrato Finalizado / Anterior
                          </strong>
                          <span style={{ fontSize: '0.7rem', background: '#eab308', color: '#000', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                            {com.status === 'finalizado' ? 'Não Renovou' : 'Expirado'}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px', color: '#cbd5e1' }}>
                          <div><span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Plano: </span><strong style={{ color: '#fff' }}>{com.planoId?.nome || com.planoNome || 'Tratamento Personalizado'}</strong></div>
                          <div><span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Vigência: </span><strong style={{ color: '#34d399' }}>{com.duracao === 'anual' ? 'Anual' : (com.criarRecorrenciaMensal ? 'Recorrente' : 'Mensal')} ({com.duracaoQtd || 1} {com.duracao === 'anual' ? 'ano' : 'mês'})</strong></div>
                          <div><span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Período: </span>{com.dataInicio || '-'} até {com.vencimento || '-'}</div>
                          <div><span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Condição: </span>R$ {Number(com.valorUnitario || 0).toFixed(2)} ({String(com.formaPagamento || 'PIX').toUpperCase()})</div>
                          <div><span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Uso: </span>{com.creditosUsados || 0} de {com.creditosTotal || 0} créditos</div>
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '0.72rem', color: '#94a3b8', borderTop: '1px dashed rgba(234, 179, 8, 0.2)', paddingTop: '6px' }}>
                          ✨ <em>Ao gerar e fechar a nova venda pelo link, o contrato anterior será arquivado automaticamente no Histórico de Serviços.</em>
                        </div>
                      </div>
                    );
                  }

                  if (isAtivo) {
                    return (
                      <div style={{ background: 'rgba(160, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '12px', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <strong style={{ color: '#34d399', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fa-solid fa-circle-check"></i> Contrato Ativo Vigente
                          </strong>
                          <span style={{ fontSize: '0.7rem', background: '#10b981', color: '#000', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                            Vigente
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px', color: '#cbd5e1' }}>
                          <div><span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Plano: </span><strong style={{ color: '#fff' }}>{com.planoId?.nome || 'Plano Atual'}</strong></div>
                          <div><span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Vigência: </span><strong style={{ color: '#34d399' }}>{com.duracao === 'anual' ? 'Anual' : (com.criarRecorrenciaMensal ? 'Recorrente' : 'Mensal')} ({com.duracaoQtd || 1} {com.duracao === 'anual' ? 'ano' : 'mês'})</strong></div>
                          <div><span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Vigência até: </span>{com.vencimento || '-'}</div>
                          <div><span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Valor: </span>R$ {Number(com.valorUnitario || 0).toFixed(2)}</div>
                          <div><span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Saldo: </span>{Math.max(0, (com.creditosTotal || 0) - (com.creditosUsados || 0))} créditos</div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '10px', padding: '10px 12px', fontSize: '0.8rem', color: '#c084fc' }}>
                      <i className="fa-solid fa-star"></i> <strong>Primeiro Contrato do Aluno:</strong> Este aluno ainda não possui contratos registrados.
                    </div>
                  );
                })()}

                <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '10px', padding: '12px', fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                  💡 <strong>Como funciona:</strong> Informe os dados comerciais acordados. O aluno receberá o link exclusivo para escolher as parcelas (até 12x), a forma de pagamento (Pix/Cartão/Boleto) e o 1º vencimento no próprio smartphone!
                </div>

                {/* Plano Ativo */}
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Plano / Modalidade Acordada <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                  <select
                    className="select-custom"
                    style={{ width: '100%', padding: '10px' }}
                    value={swPlano}
                    onChange={e => {
                      const pid = e.target.value;
                      setSwPlano(pid);
                      const pObj = plans.find(p => p._id === pid);
                      if (pObj) {
                        if (pObj.preco) setSwValorUnitario(pObj.preco);
                        if (pObj.tipo === 'Anual') {
                          setSwDuracao('anual');
                          setSwVigenciaQtd(12);
                        } else {
                          setSwDuracao('mensal');
                          setSwVigenciaQtd(1);
                        }
                        if (pObj.frequencia) setSwFrequencia(pObj.frequencia);
                        if (pObj.creditosTotal) setSwCreditosMensais(pObj.creditosTotal);
                      } else {
                        setSwValorUnitario(0);
                      }
                    }}
                  >
                    <option value="">-- Selecione o Plano / Modalidade * --</option>
                    {activePlans.map((p: any) => (
                      <option key={p._id} value={p._id}>{p.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Checkbox Recorrência Mensal Automática */}
                <div 
                  style={{ 
                    background: swCriarRecorrenciaMensal ? 'rgba(59, 130, 246, 0.14)' : 'rgba(255, 255, 255, 0.03)', 
                    border: '1px solid',
                    borderColor: swCriarRecorrenciaMensal ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)', 
                    borderRadius: '10px', 
                    padding: '12px 14px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setSwCriarRecorrenciaMensal(!swCriarRecorrenciaMensal)}
                >
                  <input
                    type="checkbox"
                    id="swCriarRecorrenciaMensal"
                    checked={swCriarRecorrenciaMensal}
                    onChange={e => setSwCriarRecorrenciaMensal(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3b82f6' }}
                  />
                  <label htmlFor="swCriarRecorrenciaMensal" style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-arrows-rotate" style={{ color: '#3b82f6' }}></i>
                    Criar Recorrência Mensal Automática para este Plano
                  </label>
                </div>

                {/* Duração, Qtd Vigência e Data de Início */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Tipo Vigência</label>
                    <select
                      className="select-custom"
                      style={{ width: '100%', padding: '9px 10px' }}
                      value={swDuracao}
                      onChange={e => {
                        const dur = e.target.value as any;
                        setSwDuracao(dur);
                        if (dur === 'anual') {
                          setSwVigenciaQtd(12);
                          setSwCreditosMassagem(1);
                          setSwCreditosEmergencia(1);
                        } else {
                          setSwVigenciaQtd(1);
                        }
                      }}
                    >
                      <option value="anual">Anual</option>
                      <option value="mensal">Mensal</option>
                      <option value="semana">Semanal</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Qtd Vigência</label>
                    <input
                      type="number"
                      min={1}
                      className="form-control"
                      style={{ padding: '9px 10px' }}
                      value={swVigenciaQtd}
                      onChange={e => setSwVigenciaQtd(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Data de Início</label>
                    <input
                      type="date"
                      className="form-control"
                      style={{ padding: '9px 10px' }}
                      value={swDataInicio}
                      onChange={e => setSwDataInicio(e.target.value)}
                    />
                  </div>
                </div>

                {/* Frequência Semanal e Créditos */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Frequência Semanal</label>
                    <select
                      className="select-custom"
                      style={{ width: '100%', padding: '9px 10px' }}
                      value={swFrequencia}
                      onChange={e => {
                        const freq = Number(e.target.value);
                        setSwFrequencia(freq);
                        if (freq === 1) setSwCreditosMensais(4);
                        else if (freq === 2) setSwCreditosMensais(9);
                        else if (freq === 3) setSwCreditosMensais(13);
                        else if (freq === 4) setSwCreditosMensais(17);
                        else if (freq === 5) setSwCreditosMensais(22);
                      }}
                    >
                      <option value={1}>1x por semana (4 créditos/mês)</option>
                      <option value={2}>2x por semana (9 créditos/mês)</option>
                      <option value={3}>3x por semana (13 créditos/mês)</option>
                      <option value={4}>4x por semana (17 créditos/mês)</option>
                      <option value={5}>5x por semana (22 créditos/mês)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Créditos Mensais / Aulas</label>
                    <input
                      type="number"
                      min={0}
                      className="form-control"
                      style={{ padding: '9px 10px' }}
                      value={swCreditosMensais}
                      onChange={e => setSwCreditosMensais(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                </div>

                {/* Créditos Especiais (Massagem e Emergência) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Créditos de Massagem (Mensais)</label>
                    <input
                      type="number"
                      min={0}
                      className="form-control"
                      style={{ padding: '9px 10px' }}
                      value={swCreditosMassagem}
                      onChange={e => setSwCreditosMassagem(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Créditos de Emergência (Mensais)</label>
                    <input
                      type="number"
                      min={0}
                      className="form-control"
                      style={{ padding: '9px 10px' }}
                      value={swCreditosEmergencia}
                      onChange={e => setSwCreditosEmergencia(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                </div>

                {/* Valor Unitário, Tipo Desconto e Abatimento Concedido */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Valor Unitário</label>
                    <MoneyInput
                      style={{ padding: '9px 10px', fontWeight: 750, color: 'var(--color-primary)' }}
                      value={swValorUnitario}
                      onChange={setSwValorUnitario}
                      placeholder="R$ 0,00"
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Tipo de Desconto</label>
                    <select
                      className="select-custom"
                      style={{ width: '100%', padding: '9px 10px' }}
                      value={swDescontoTipo}
                      onChange={e => setSwDescontoTipo(e.target.value as any)}
                    >
                      <option value="percentual">🏷️ Porcentagem (%)</option>
                      <option value="fixo">💵 Valor Fixo (R$)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Abatimento Concedido ({swDescontoTipo === 'percentual' ? '%' : 'R$'})
                    </label>
                    {swDescontoTipo === 'percentual' ? (
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        placeholder="0%"
                        style={{ padding: '9px 10px' }}
                        value={swDescontoValor || ''}
                        onFocus={selectOnFocus}
                        onChange={e => setSwDescontoValor(parseFloat(e.target.value) || 0)}
                      />
                    ) : (
                      <MoneyInput
                        style={{ padding: '9px 10px' }}
                        value={swDescontoValor}
                        onChange={setSwDescontoValor}
                        placeholder="R$ 0,00"
                      />
                    )}
                  </div>
                </div>

                {/* Resumo Financeiro em Tempo Real */}
                <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Valor Bruto ({swVigenciaQtd}x)</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      R$ {gross.toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                  {discountVal > 0 && (
                    <div>
                      <div style={{ fontSize: '0.74rem', color: '#ef4444' }}>Desconto Aplicado</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ef4444' }}>
                        - R$ {discountVal.toFixed(2).replace('.', ',')} {swDescontoTipo === 'percentual' ? `(${swDescontoValor}%)` : ''}
                      </div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Valor Líquido da Proposta</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                      R$ {netVal.toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSalesWizardClient(null)} disabled={swSubmitting}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmSalesWizard}
                  disabled={swSubmitting || !swPlano || !swValorUnitario || Number(swValorUnitario) <= 0}
                  style={{ background: '#8b5cf6', borderColor: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '6px', opacity: (!swPlano || !swValorUnitario || Number(swValorUnitario) <= 0) ? 0.5 : 1 }}
                >
                  {swSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
                  Gerar Link & Compartilhar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          MODAL EXECUTIVO 3: WIZARD DE EMISSÃO DIRETA DE CONTRATO & CLICKSIGN
          ========================================================================= */}
      {directContractClient && (() => {
        const activePlans = plans.filter((p: any) => p.ativo !== false);
        const dcGross = dcwValorUnitario * (dcwVigenciaQtd || 1);
        const dcDiscountVal = dcwDescontoTipo === 'percentual' ? (dcGross * (Number(dcwDescontoValor) || 0)) / 100 : (Number(dcwDescontoValor) || 0);
        const dcNetVal = Math.max(0, dcGross - dcDiscountVal);

        return (
          <div className="modal-overlay" onClick={() => { if (!dcwSubmitting) setDirectContractClient(null); }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '95%' }}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                    <i className="fa-solid fa-file-signature"></i>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Emissão Direta de Contrato</h3>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      Aluno: <strong>{directContractClient.dadosPessoais?.nome || 'Aluno'}</strong> (Passo {dcwStep} de 2)
                    </div>
                  </div>
                </div>
                <button className="modal-close" onClick={() => { if (!dcwSubmitting) setDirectContractClient(null); }}>&times;</button>
              </div>

              <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '78vh', overflowY: 'auto' }}>
                {/* Stepper Header */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setDcwStep(1)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: 'none',
                      background: dcwStep === 1 ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                      color: dcwStep === 1 ? '#fff' : 'var(--text-muted)',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    1. Plano, Vigência & Créditos
                  </button>
                  <button
                    type="button"
                    onClick={() => setDcwStep(2)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: 'none',
                      background: dcwStep === 2 ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                      color: dcwStep === 2 ? '#fff' : 'var(--text-muted)',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer'
                    }}
                  >
                    2. Pagamento & Emissão
                  </button>
                </div>

                {dcwStep === 1 ? (
                  <>
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Plano Comercial (Ativos)</label>
                      <select
                        className="select-custom"
                        style={{ width: '100%', padding: '10px' }}
                        value={dcwPlano}
                        onChange={e => {
                          const pid = e.target.value;
                          setDcwPlano(pid);
                          const pObj = plans.find(p => p._id === pid);
                          if (pObj) {
                            setDcwValorUnitario(pObj.preco || 0);
                            if (pObj.tipo === 'Anual') {
                              setDcwDuracao('anual');
                              setDcwVigenciaQtd(12);
                              setDcwCreditosMassagem(1);
                              setDcwCreditosEmergencia(1);
                            } else {
                              setDcwDuracao('mensal');
                              setDcwVigenciaQtd(1);
                            }
                          }
                        }}
                      >
                        {activePlans.map((p: any) => (
                          <option key={p._id} value={p._id}>{p.nome}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '10px' }}>
                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Tipo Vigência</label>
                        <select
                          className="select-custom"
                          style={{ width: '100%', padding: '9px 10px' }}
                          value={dcwDuracao}
                          onChange={e => {
                            const dur = e.target.value as any;
                            setDcwDuracao(dur);
                            if (dur === 'anual') {
                              setDcwVigenciaQtd(12);
                              setDcwCreditosMassagem(1);
                              setDcwCreditosEmergencia(1);
                            } else {
                              setDcwVigenciaQtd(1);
                            }
                          }}
                        >
                          <option value="anual">Anual</option>
                          <option value="mensal">Mensal</option>
                          <option value="semana">Semanal</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Qtd Vigência</label>
                        <input
                          type="number"
                          min={1}
                          className="form-control"
                          style={{ padding: '9px 10px' }}
                          value={dcwVigenciaQtd}
                          onChange={e => setDcwVigenciaQtd(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        />
                      </div>

                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Data de Início</label>
                        <input
                          type="date"
                          className="form-control"
                          style={{ padding: '9px 10px' }}
                          value={dcwDataInicio}
                          onChange={e => setDcwDataInicio(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Frequência Semanal</label>
                        <select
                          className="select-custom"
                          style={{ width: '100%', padding: '9px 10px' }}
                          value={dcwFrequencia}
                          onChange={e => {
                            const freq = Number(e.target.value);
                            setDcwFrequencia(freq);
                            if (freq === 1) setDcwCreditosMensais(4);
                            else if (freq === 2) setDcwCreditosMensais(9);
                            else if (freq === 3) setDcwCreditosMensais(13);
                            else if (freq === 4) setDcwCreditosMensais(17);
                            else if (freq === 5) setDcwCreditosMensais(22);
                          }}
                        >
                          <option value={1}>1x por semana (4 créditos/mês)</option>
                          <option value={2}>2x por semana (9 créditos/mês)</option>
                          <option value={3}>3x por semana (13 créditos/mês)</option>
                          <option value={4}>4x por semana (17 créditos/mês)</option>
                          <option value={5}>5x por semana (22 créditos/mês)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Créditos Mensais / Aulas</label>
                        <input
                          type="number"
                          min={0}
                          className="form-control"
                          style={{ padding: '9px 10px' }}
                          value={dcwCreditosMensais}
                          onChange={e => setDcwCreditosMensais(parseInt(e.target.value, 10) || 0)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Créditos de Massagem (Mensais)</label>
                        <input
                          type="number"
                          min={0}
                          className="form-control"
                          style={{ padding: '9px 10px' }}
                          value={dcwCreditosMassagem}
                          onChange={e => setDcwCreditosMassagem(parseInt(e.target.value, 10) || 0)}
                        />
                      </div>

                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Créditos de Emergência (Mensais)</label>
                        <input
                          type="number"
                          min={0}
                          className="form-control"
                          style={{ padding: '9px 10px' }}
                          value={dcwCreditosEmergencia}
                          onChange={e => setDcwCreditosEmergencia(parseInt(e.target.value, 10) || 0)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: '10px' }}>
                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Valor Unitário</label>
                        <MoneyInput
                          style={{ padding: '9px 10px', fontWeight: 750, color: 'var(--color-primary)' }}
                          value={dcwValorUnitario}
                          onChange={setDcwValorUnitario}
                          placeholder="R$ 0,00"
                        />
                      </div>

                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Tipo de Desconto</label>
                        <select
                          className="select-custom"
                          style={{ width: '100%', padding: '9px 10px' }}
                          value={dcwDescontoTipo}
                          onChange={e => setDcwDescontoTipo(e.target.value as any)}
                        >
                          <option value="percentual">🏷️ Porcentagem (%)</option>
                          <option value="fixo">💵 Valor Fixo (R$)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                          Abatimento Concedido ({dcwDescontoTipo === 'percentual' ? '%' : 'R$'})
                        </label>
                        {dcwDescontoTipo === 'percentual' ? (
                          <input
                            type="number"
                            step="0.01"
                            className="form-control"
                            placeholder="0%"
                            style={{ padding: '9px 10px' }}
                            value={dcwDescontoValor || ''}
                            onFocus={selectOnFocus}
                            onChange={e => setDcwDescontoValor(parseFloat(e.target.value) || 0)}
                          />
                        ) : (
                          <MoneyInput
                            style={{ padding: '9px 10px' }}
                            value={dcwDescontoValor}
                            onChange={setDcwDescontoValor}
                            placeholder="R$ 0,00"
                          />
                        )}
                      </div>
                    </div>

                    {/* Resumo Financeiro */}
                    <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Valor Bruto ({dcwVigenciaQtd}x)</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                          R$ {dcGross.toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                      {dcDiscountVal > 0 && (
                        <div>
                          <div style={{ fontSize: '0.74rem', color: '#ef4444' }}>Desconto Aplicado</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ef4444' }}>
                            - R$ {dcDiscountVal.toFixed(2).replace('.', ',')} {dcwDescontoTipo === 'percentual' ? `(${dcwDescontoValor}%)` : ''}
                          </div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Valor Final Líquido</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                          R$ {dcNetVal.toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Forma de Pagamento</label>
                        <select
                          className="select-custom"
                          style={{ width: '100%', padding: '10px' }}
                          value={dcwFormaPag}
                          onChange={e => setDcwFormaPag(e.target.value)}
                        >
                          <option value="pix">PIX (À Vista)</option>
                          <option value="cartao">Cartão de Crédito</option>
                          <option value="boleto">Boleto Bancário</option>
                          <option value="dinheiro">Dinheiro / Espécie</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Parcelamento</label>
                        <select
                          className="select-custom"
                          style={{ width: '100%', padding: '10px' }}
                          value={dcwParcelas}
                          onChange={e => setDcwParcelas(Number(e.target.value))}
                        >
                          {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                            <option key={n} value={n}>{n}x de R$ {(dcNetVal / n).toFixed(2).replace('.', ',')}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Data do 1º Vencimento</label>
                      <input
                        type="date"
                        className="form-control"
                        style={{ padding: '9px 10px' }}
                        value={dcwVencimento}
                        onChange={e => setDcwVencimento(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="modal-footer" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div>
                  {dcwStep === 2 && (
                    <button type="button" className="btn btn-secondary" onClick={() => setDcwStep(1)} disabled={dcwSubmitting}>
                      ⬅️ Voltar
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {dcwStep === 1 ? (
                    <button type="button" className="btn btn-primary" onClick={() => setDcwStep(2)} style={{ padding: '10px 18px' }}>
                      Avançar para Pagamento ➡️
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleConfirmDirectContract('save')}
                        disabled={dcwSubmitting}
                        style={{ padding: '10px 14px' }}
                      >
                        💾 Salvar
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleConfirmDirectContract('pdf')}
                        disabled={dcwSubmitting}
                        style={{ padding: '10px 14px', color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)' }}
                      >
                        📥 Baixar PDF
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleConfirmDirectContract('clicksign')}
                        disabled={dcwSubmitting}
                        style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        {dcwSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-file-signature"></i>}
                        Emitir Clicksign
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          MODAL EXECUTIVO 4: BUSCA E SINCRONIZAÇÃO NO ASAAS
          ========================================================================= */}
      {asaasModalClient && (
        <div className="modal-overlay" onClick={() => { if (!asaasModalSubmitting) setAsAsaasModalClient(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                  <i className="fa-solid fa-credit-card"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Sincronizar com Asaas</h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Aluno: <strong>{asaasModalClient.dadosPessoais?.nome || 'Aluno'}</strong>
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => { if (!asaasModalSubmitting) setAsAsaasModalClient(null); }}>&times;</button>
            </div>

            <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '10px', padding: '12px', fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                💳 <strong>Integração Asaas:</strong> Vincule o identificador de cliente do Asaas para acompanhar cobranças via PIX, Cartão e Boleto em tempo real no Clube Fitness.
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  ID do Cliente no Asaas (Customer ID):
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: cus_000005918239 (ou deixe vazio para buscar por CPF)"
                  value={asaasModalCusId}
                  onChange={e => setAsaasModalCusId(e.target.value.trim())}
                  style={{ padding: '10px' }}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setAsAsaasModalClient(null)} disabled={asaasModalSubmitting}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmAsaasSync}
                disabled={asaasModalSubmitting}
                style={{ background: '#38bdf8', borderColor: '#38bdf8', color: '#000', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {asaasModalSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-arrows-rotate"></i>}
                Buscar & Sincronizar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* =========================================================================
          MODAL EXECUTIVO 5: LIBERAÇÃO DE EDIÇÃO CADASTRAL COM AUDITORIA
          ========================================================================= */}
      {showUnlockModal && selectedClient && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 100000 }} onClick={() => setShowUnlockModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '90%', border: '1px solid rgba(251, 191, 36, 0.4)' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(251, 191, 36, 0.2)' }}>
              <h3 style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', margin: 0 }}>
                <i className="fa-solid fa-triangle-exclamation"></i> Liberação de Edição Cadastral
              </h3>
              <button className="modal-close" onClick={() => setShowUnlockModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}>
              <div style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.25)', padding: '12px', borderRadius: '8px', fontSize: '0.84rem', color: '#fef08a', lineHeight: '1.4' }}>
                <strong>Atenção de Segurança e Conformidade:</strong><br />
                Os dados cadastrais de <strong>{selectedClient.dadosPessoais?.nome || 'Aluno'}</strong> foram informados diretamente pelo contratante ou consolidados em contrato. A alteração indevida altera o cadastro legal. Esta ação será registrada na trilha de auditoria.
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  Justificativa Obrigatória da Alteração <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Ex: Correção de dígito no CPF ou telefone solicitada pelo aluno com comprovante..."
                  value={unlockJustificativa}
                  onChange={e => setUnlockJustificativa(e.target.value)}
                  style={{ fontSize: '0.83rem', resize: 'vertical' }}
                  required
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                  Mínimo de 6 caracteres. Será registrado: seu nome (Administrador), data/hora e IP.
                </small>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowUnlockModal(false)}
                  disabled={unlockingClient}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1, background: '#f59e0b', color: '#000', fontWeight: 800 }}
                  onClick={handleUnlockClientData}
                  disabled={unlockingClient || unlockJustificativa.trim().length < 6}
                >
                  {unlockingClient ? <><i className="fa-solid fa-spinner fa-spin"></i> Registrando...</> : <><i className="fa-solid fa-check"></i> Confirmar Desbloqueio</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL EXECUTIVO 6: FINALIZAR CONTRATO (NÃO RENOVOU)
          ========================================================================= */}
      {finalizeClientTarget && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 100000 }} onClick={() => { if (!submittingFinalize) setFinalizeClientTarget(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%', border: '1px solid rgba(107, 114, 128, 0.4)' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                  <i className="fa-solid fa-flag-checkered"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Finalizar Contrato</h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Aluno: <strong>{finalizeClientTarget.dadosPessoais?.nome || 'Aluno'}</strong>
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => { if (!submittingFinalize) setFinalizeClientTarget(null); }}>&times;</button>
            </div>

            <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(107, 114, 128, 0.1)', border: '1px solid rgba(107, 114, 128, 0.25)', borderRadius: '10px', padding: '12px', fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                🏁 Ao marcar como <strong>Finalizado</strong>, o aluno sairá dos alertas de renovação/vencidos e será movido para o histórico de contratos finalizados. O histórico de treinos e prontuário permanece intacto.
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', display: 'block' }}>
                  Motivo do Encerramento:
                </label>
                <select
                  className="select-custom"
                  value={finalizeReason}
                  onChange={e => setFinalizeReason(e.target.value)}
                  style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
                >
                  <option value="decidiu_nao_renovar">Decidiu não renovar o plano</option>
                  <option value="mudanca_cidade">Mudança de endereço / cidade</option>
                  <option value="motivo_financeiro">Questões financeiras / orçamento</option>
                  <option value="falta_tempo">Falta de tempo / rotina de trabalho</option>
                  <option value="problema_saude">Problemas médicos / repouso</option>
                  <option value="insatisfacao">Insatisfação com o serviço / atendimento</option>
                  <option value="outro">Outro motivo</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                  Observações Adicionais (Opcional):
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Detalhes ou feedback informado pelo cliente..."
                  value={finalizeCustomObs}
                  onChange={e => setFinalizeCustomObs(e.target.value)}
                  style={{ fontSize: '0.83rem', resize: 'vertical' }}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setFinalizeClientTarget(null)}
                disabled={submittingFinalize}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmFinalizeContract}
                disabled={submittingFinalize}
                style={{ background: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)', borderColor: '#4b5563', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {submittingFinalize ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-flag-checkered"></i>}
                Confirmar Encerramento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL EXECUTIVO 7: LINHA DO TEMPO & HISTÓRICO DE SERVIÇOS CONTRATADOS
          ========================================================================= */}
      {historyModalClient && (
        <div className="modal-overlay" style={{ display: 'flex', zIndex: 100000 }} onClick={() => setHistoryModalClient(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px', width: '92%', border: '1px solid rgba(6, 182, 212, 0.35)', background: '#0f172a' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                  <i className="fa-solid fa-clock-rotate-left"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                    Histórico de Serviços Contratados
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                    Aluno: <strong style={{ color: '#fff' }}>{historyModalClient.dadosPessoais?.nome || 'Aluno'}</strong> &nbsp;•&nbsp; CPF: {historyModalClient.dadosPessoais?.cpf || 'Não informado'}
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setHistoryModalClient(null)}>&times;</button>
            </div>

            <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
              {/* 1. Contrato Atual / Vigente */}
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                    Plano Atual Cadastrado
                  </span>
                  <span style={{ fontSize: '0.72rem', background: '#10b981', color: '#000', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                    {historyModalClient.dadosComerciais?.status || 'Ativo'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block' }}>Plano:</span>
                    <strong style={{ color: '#f8fafc' }}>{historyModalClient.dadosComerciais?.planoId?.nome || historyModalClient.dadosComerciais?.planoNome || 'Plano Atual'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block' }}>Vigência / Período:</span>
                    <strong style={{ color: '#f8fafc' }}>
                      {historyModalClient.dadosComerciais?.dataInicio ? new Date(historyModalClient.dadosComerciais.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : '-'} até {historyModalClient.dadosComerciais?.vencimento ? new Date(historyModalClient.dadosComerciais.vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block' }}>Tipo / Quantidade de Vigência:</span>
                    <strong style={{ color: '#34d399' }}>
                      {historyModalClient.dadosComerciais?.duracao === 'anual' ? 'Anual' : (historyModalClient.dadosComerciais?.criarRecorrenciaMensal ? 'Recorrência Mensal' : 'Mensal')} • {historyModalClient.dadosComerciais?.duracaoQtd || 1} {historyModalClient.dadosComerciais?.duracao === 'semana' ? 'semana(s)' : (historyModalClient.dadosComerciais?.duracao === 'anual' ? 'ano(s)' : 'mês(es)')}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block' }}>Condição Comercial:</span>
                    <strong style={{ color: '#38bdf8' }}>
                      R$ {Number(historyModalClient.dadosComerciais?.valorUnitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({String(historyModalClient.dadosComerciais?.formaPagamento || 'PIX').toUpperCase()})
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8', fontSize: '0.7rem', display: 'block' }}>Créditos:</span>
                    <strong style={{ color: '#a78bfa' }}>
                      {historyModalClient.dadosComerciais?.creditosTotal || 0} totais ({historyModalClient.dadosComerciais?.creditosUsados || 0} usados)
                    </strong>
                  </div>
                </div>
              </div>

              {/* 2. Contratos Concorrentes / Adicionais Ativos */}
              {Array.isArray(historyModalClient.contratosAtivos) && historyModalClient.contratosAtivos.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.84rem', color: '#c084fc', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ⚡ Serviços Concorrentes Ativos ({historyModalClient.contratosAtivos.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {historyModalClient.contratosAtivos.map((ca: any, idx: number) => (
                      <div key={idx} style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <strong style={{ color: '#f8fafc', fontSize: '0.85rem' }}>{ca.planoNome}</strong>
                          <span style={{ fontSize: '0.7rem', background: '#a855f7', color: '#fff', fontWeight: 700, padding: '1px 6px', borderRadius: '4px' }}>Adicional</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                          <span>Período: <strong style={{ color: '#fff' }}>{ca.dataInicio} até {ca.dataFim}</strong></span>
                          <span>Valor: <strong style={{ color: '#38bdf8' }}>R$ {Number(ca.valorUnitario || 0).toFixed(2)}</strong></span>
                          <span>Créditos: <strong style={{ color: '#c084fc' }}>{ca.creditosTotal || 0} sessões</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Linha do Tempo de Ciclos Anteriores Arquivados */}
              <div>
                <h4 style={{ fontSize: '0.84rem', color: '#94a3b8', margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📜 Ciclos e Contratos Anteriores ({historyModalClient.historicoContratos?.length || 0})
                </h4>

                {(!historyModalClient.historicoContratos || historyModalClient.historicoContratos.length === 0) ? (
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
                    <i className="fa-solid fa-folder-open" style={{ fontSize: '1.5rem', marginBottom: '8px', display: 'block', color: '#475569' }}></i>
                    Nenhum ciclo anterior arquivado no histórico deste aluno. Este é o 1º contrato registrado.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {historyModalClient.historicoContratos.map((hc: any, idx: number) => {
                      const badgeColor = hc.statusCiclo === 'renovado' ? '#10b981' : (hc.statusCiclo === 'cancelado' ? '#ef4444' : '#64748b');
                      return (
                        <div key={idx} style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px', position: 'relative' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {historyModalClient.historicoContratos.length - idx}
                              </span>
                              <strong style={{ color: '#f8fafc', fontSize: '0.88rem' }}>{hc.planoNome}</strong>
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: `${badgeColor}22`, color: badgeColor, border: `1px solid ${badgeColor}44`, textTransform: 'uppercase' }}>
                              {hc.statusCiclo}
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '0.78rem', marginTop: '8px' }}>
                            <div>
                              <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>Período do Ciclo:</span>
                              <span style={{ color: '#cbd5e1' }}>{hc.dataInicio} até {hc.dataFim}</span>
                            </div>
                            <div>
                              <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>Tipo / Quantidade de Vigência:</span>
                              <span style={{ color: '#34d399', fontWeight: 600 }}>
                                {hc.tipoPlano || (hc.duracao === 'anual' ? 'Anual' : 'Mensal')} • {hc.duracaoQtd || 1} {hc.duracao === 'anual' ? 'ano' : 'mês'}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>Valor Contratado:</span>
                              <span style={{ color: '#38bdf8', fontWeight: 600 }}>R$ {Number(hc.valorContratado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({String(hc.formaPagamento || 'PIX').toUpperCase()})</span>
                            </div>
                            <div>
                              <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>Utilização:</span>
                              <span style={{ color: '#a78bfa' }}>{hc.creditosUtilizadosCiclo || 0} / {hc.creditosTotalCiclo || 0} créditos</span>
                            </div>
                            <div>
                              <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>Data Arquivamento:</span>
                              <span style={{ color: '#94a3b8' }}>{hc.dataArquivamento ? new Date(hc.dataArquivamento).toLocaleDateString('pt-BR') : '-'}</span>
                            </div>
                          </div>

                          {hc.observacoes && (
                            <div style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.72rem', color: '#94a3b8' }}>
                              <strong>Obs:</strong> {hc.observacoes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                🔒 Histórico protegido contra sobrescrita com trilha auditável
              </span>
              <button type="button" className="btn btn-secondary" onClick={() => setHistoryModalClient(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
