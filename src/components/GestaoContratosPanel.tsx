'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { downloadContractPDF, getContractPDFBase64 } from '@/utils/pdfGenerator';
import { generateContractTemplate as getUnifiedTemplate } from '@/utils/contractTemplate';
import { validateContractClientData } from '@/utils/contractValidator';
import { formatCurrencyBRL, selectOnFocus } from '@/utils/currencyMask';
import { smartSearchMatch } from '@/utils/smartSearch';
import { getContractValidityInfo, calculateContractEndDate } from '@/utils/contractValidity';
import { getCardRateForInstallment } from '@/utils/paymentRates';
import { calculateAgeAndMinorStatus, isMinorFromBirthDate } from '@/utils/dateUtils';
import ClicksignPanel from './ClicksignPanel';
import MoneyInput from './MoneyInput';

const normalizeText = (str: string) => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

export const isFunnelTerm = (str?: string): boolean => {
  if (!str) return true;
  const clean = str.trim().toLowerCase();
  return [
    'captação',
    'captacao',
    'lead',
    'indicação',
    'indicacao',
    'instagram',
    'balcão',
    'balcao',
    'orgânico',
    'organico',
    'marketing',
    'whatsapp',
    'anúncio',
    'anuncio',
    'tráfego pago',
    'trafego pago'
  ].includes(clean);
};

export interface ClientContractStage {
  stageKey: 'ativo' | 'renovacao' | 'vencido' | 'pendente' | 'proposta' | 'congelado' | 'lead' | 'dynamus' | 'cancelado_agendado' | 'finalizado';
  stageLabel: string;
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
  orientacaoKey: 'vigente' | 'gerar_renovacao' | 'sincronizar_clicksign' | 'gerar_asaas' | 'reenviar_link' | 'gerar_link' | 'baixar_pdf' | 'gerenciar_dynamus' | 'dados_faltantes' | 'ver_rescisao' | 'finalizado';
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

  const isRecorrente = Boolean(com.criarRecorrenciaMensal || latestContract?.criarRecorrenciaMensal);
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

  // 0. Contrato Finalizado (Não Renovou ou Encerrado)
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

  // 0.1. Rescisão Contratual / Cancelamento Agendado (Prioridade Imediata)
  if (com.status === 'cancelado_agendado' || com.status === 'cancelado' || latestContract?.status === 'cancelado') {
    const termDate = com.dataFim || com.vencimento || latestContract?.dataEncerramentoAcesso || '';
    const termDateFmt = termDate ? new Date(termDate + (termDate.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('pt-BR') : '';
    const isTerminated = termDate ? new Date(termDate + 'T23:59:59') < new Date() : false;

    if (isTerminated || com.status === 'cancelado') {
      return {
        stageKey: 'finalizado',
        stageLabel: '🚫 Rescisão / Contrato Encerrado',
        badgeBg: 'rgba(239, 68, 68, 0.18)',
        badgeColor: '#f87171',
        badgeBorder: '1px solid rgba(239, 68, 68, 0.4)',
        orientacaoKey: 'finalizado',
        orientacaoLabel: '📁 Histórico de Rescisão',
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

    return {
      stageKey: 'cancelado_agendado',
      stageLabel: termDateFmt ? `🚫 Rescisão (Acesso até ${termDateFmt})` : '🚫 Rescisão Agendada',
      badgeBg: 'rgba(239, 68, 68, 0.22)',
      badgeColor: '#fca5a5',
      badgeBorder: '1px solid rgba(239, 68, 68, 0.5)',
      orientacaoKey: 'ver_rescisao',
      orientacaoLabel: '🚫 Ver Rescisão / Encerramento',
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

  // 1. Verificar se há contrato assinado/ativo (Prioridade Máxima)
  const isContractSigned = Boolean(
    (latestContract?.status === 'assinado' || latestContract?.clicksignStatus === 'assinado' || com.status === 'assinado') &&
    latestContract?.status !== 'cancelado' &&
    com.status !== 'cancelado_agendado'
  );

  // 2. Contrato Pendente de Assinatura (Clicksign / Presencial)
  const isPendingContract = !isContractSigned && Boolean(
    (latestContract && (latestContract.status === 'pendente' || (latestContract.clicksignDocKey && latestContract.clicksignStatus === 'pendente'))) ||
    (com.status === 'pendente' && !latestContract)
  );
  if (isPendingContract) {
    const isClicksign = Boolean(latestContract?.clicksignDocKey);
    return {
      stageKey: 'pendente',
      stageLabel: isClicksign ? '⏳ Aguardando Assinatura (Clicksign)' : '⏳ Aguardando Assinatura',
      badgeBg: 'rgba(245, 158, 11, 0.18)',
      badgeColor: '#fbbf24',
      badgeBorder: '1px solid rgba(245, 158, 11, 0.4)',
      orientacaoKey: 'sincronizar_clicksign',
      orientacaoLabel: isClicksign ? '🔄 Sincronizar Clicksign' : '✍️ Formalizar Assinatura',
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

  // 3. Proposta Comercial Enviada via Link (Pendente de Resposta do Aluno / Lead)
  const isPendingProposal = !isContractSigned && Boolean(
    (latestProposal && latestProposal.status === 'pendente') ||
    com.status === 'proposta_enviada' ||
    com.status === 'proposta'
  );
  if (isPendingProposal) {
    return {
      stageKey: 'proposta',
      stageLabel: '⏳ Proposta Enviada (Link)',
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

  // 4. Aluno Convênio Dynamus (Sem proposta/contrato Clube em andamento)
  const isDynamus = Boolean(
    com.isConvenioDynamus ||
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

  // 4. Contrato Assinado / Perfil Ativo com Vigência Válida ou Recorrência em Dia
  const hasActiveContract = Boolean(
    isContractSigned ||
    com.status === 'ativo' ||
    (isRecorrente && hasPaidInstallment && !info.isExpired) ||
    (plan && !info.isExpired && (com.valorUnitario > 0 || hasPaidInstallment)) ||
    (com.valorUnitario > 0 && (com.vencimento || com.dataInicio) && com.status !== 'lead')
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
    'dynamus',
    'cancelado_agendado'
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
    setSelectedStatuses(['vigente', 'renovacao', 'vencido', 'aguardando_assinatura', 'lead', 'dynamus', 'cancelado_agendado', 'finalizado']);
  };

  const handleSelectOnlyActiveOperation = () => {
    setSelectedStatuses(['vigente', 'renovacao', 'vencido', 'aguardando_assinatura', 'lead', 'dynamus', 'cancelado_agendado']);
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

  // Modal de Edição Executiva de Condições Comerciais & Ativação de Vigência
  const [editContractClient, setEditContractClient] = useState<any | null>(null);
  const [ecPlanoId, setEcPlanoId] = useState<string>('');
  const [ecStatus, setEcStatus] = useState<string>('ativo');
  const [ecDuracao, setEcDuracao] = useState<'mensal' | 'anual' | 'semestral' | 'semana'>('mensal');
  const [ecVigenciaQtd, setEcVigenciaQtd] = useState<number>(1);
  const [ecDataInicio, setEcDataInicio] = useState<string>('');
  const [ecVencimento, setEcVencimento] = useState<string>('');
  const [ecDataPrimeiroVencimento, setEcDataPrimeiroVencimento] = useState<string>('');
  const [ecFormaPagamento, setEcFormaPagamento] = useState<string>('pix');
  const [ecValorUnitario, setEcValorUnitario] = useState<number>(0);
  const [ecParcelas, setEcParcelas] = useState<number>(1);
  const [ecDescontoTipo, setEcDescontoTipo] = useState<'percentual' | 'fixo'>('percentual');
  const [ecDescontoValor, setEcDescontoValor] = useState<number>(0);
  const [ecFrequencia, setEcFrequencia] = useState<number>(3);
  const [ecCreditosTotal, setEcCreditosTotal] = useState<number>(13);
  const [ecCreditosMassagemTotal, setEcCreditosMassagemTotal] = useState<number>(0);
  const [ecCreditosEmergenciaTotal, setEcCreditosEmergenciaTotal] = useState<number>(0);
  const [ecCriarRecorrenciaMensal, setEcCriarRecorrenciaMensal] = useState<boolean>(false);
  const [ecSaving, setEcSaving] = useState<boolean>(false);
  const [ecError, setEcError] = useState<string>('');

  const handleOpenEditContractModal = (client: any) => {
    setEditContractClient(client);
    const com = client.dadosComerciais || {};
    const latestC = allContractsMap[client._id];
    const latestP = allProposalsMap[client._id];
    const info = getContractValidityInfo(client);
    
    // Resolver plano
    const resolvedPlanoId = com.planoId?._id || com.planoId || latestC?.planoId?._id || latestC?.planoId || latestP?.planoId?._id || latestP?.planoId || '';
    setEcPlanoId(resolvedPlanoId);

    // Status
    setEcStatus(com.status || client.status || 'ativo');

    // Duração & Vigência
    const rawDur = (com.duracao || latestC?.duracao || (com.planoId?.tipo === 'Anual' ? 'anual' : 'mensal')).toLowerCase();
    const dur: any = ['anual', 'semestral', 'semana', 'mensal'].includes(rawDur) ? rawDur : 'mensal';
    setEcDuracao(dur);
    let vigQtd = Number(com.duracaoQtd || com.vigenciaQtd || latestC?.vigenciaQtd || 1) || 1;
    if (dur === 'anual' && vigQtd >= 12) {
      vigQtd = 1;
    }
    setEcVigenciaQtd(vigQtd);

    // Datas Reais do Contrato / Cadastro do Aluno
    const todayStr = new Date().toISOString().split('T')[0];
    const dInicio = com.dataInicio || latestC?.dataInicio || todayStr;
    const dVenc = com.vencimento || latestC?.vencimento || calculateContractEndDate(dInicio, dur, vigQtd, undefined, Boolean(com.criarRecorrenciaMensal));
    const dPrimeiroVenc = com.dataPrimeiroVencimento || latestC?.dataPrimeiroVencimento || dInicio;

    setEcDataInicio(dInicio);
    setEcVencimento(dVenc);
    setEcDataPrimeiroVencimento(dPrimeiroVenc);

    // Forma de Pagamento & Parcelas
    const forma = (com.formaPagamento || latestC?.formaPagamento || latestP?.formaPagamento || 'pix').toLowerCase();
    setEcFormaPagamento(forma);
    setEcParcelas(Number(com.parcelas || latestC?.parcelas || latestP?.parcelas || 1) || 1);

    // Valor & Desconto
    const val = Number(com.valorTotal || com.valorUnitario || latestC?.valorTotal || latestC?.valorContratado || latestC?.valorUnitario || latestP?.valorAcordado || latestP?.valorUnitario || 0);
    setEcValorUnitario(val);
    setEcDescontoTipo(com.descontoTipo || 'percentual');
    setEcDescontoValor(Number(com.descontoValor || 0));

    // Frequência & Créditos
    setEcFrequencia(Number(com.frequencia || 3));
    setEcCreditosTotal(Number(com.creditosTotal !== undefined ? com.creditosTotal : 13));
    setEcCreditosMassagemTotal(Number(com.creditosMassagemTotal || (dur === 'anual' ? 1 : 0)));
    setEcCreditosEmergenciaTotal(Number(com.creditosEmergenciaTotal || (dur === 'anual' ? 1 : 0)));

    // Recorrência
    setEcCriarRecorrenciaMensal(Boolean(com.criarRecorrenciaMensal));

    setEcSaving(false);
    setEcError('');
  };

  const handleDeleteContract = async (contractId: string, planName: string) => {
    if (!confirm(`Deseja realmente descartar/excluir o contrato de "${planName}"? Esta ação removerá o registro do histórico.`)) return;
    try {
      const res = await fetch(`/api/contracts?id=${contractId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('✅ Contrato descartado com sucesso!');
        if (selectedClient?._id) {
          loadContracts(selectedClient._id, true);
        }
        fetchData();
        loadContractsAndProposalsOverview();
      } else {
        alert('Erro ao excluir contrato: ' + (data.error || 'Falha na requisição'));
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  const handleSaveContractConditions = async (activateAsVigente: boolean) => {
    if (!editContractClient) return;
    setEcSaving(true);
    setEcError('');

    try {
      const finalEndDate = ecVencimento || calculateContractEndDate(ecDataInicio, ecDuracao, ecVigenciaQtd, undefined, ecCriarRecorrenciaMensal);

      const plan = plans.find(p => p._id === ecPlanoId);
      const isAnual = ecDuracao === 'anual' || plan?.tipo === 'Anual';
      const grossPrice = Number(ecValorUnitario || 0) * (isAnual ? 1 : Number(ecVigenciaQtd || 1));
      let discountDeduction = 0;
      if (ecDescontoTipo === 'percentual') {
        discountDeduction = (grossPrice * (Number(ecDescontoValor) || 0)) / 100;
      } else {
        discountDeduction = Number(ecDescontoValor) || 0;
      }
      discountDeduction = Math.min(discountDeduction, grossPrice);
      const calculatedValorLiquido = Math.max(0, grossPrice - discountDeduction);
      const dueDay = ecDataPrimeiroVencimento ? parseInt(ecDataPrimeiroVencimento.split('-')[2] || '5', 10) : new Date().getDate();

      // 1. SE FOR ATIVAÇÃO COMO VIGENTE: Emitir e formalizar o contrato oficial (POST /api/contracts)
      if (activateAsVigente) {
        const contractPayload: any = {
          clientId: editContractClient._id,
          planoId: ecPlanoId,
          planoNome: plan?.nome || 'Plano Clube Fitness',
          planoTipo: isAnual ? 'Anual' : 'Mensal',
          valorBruto: grossPrice,
          descontoTipo: ecDescontoTipo,
          descontoValor: ecDescontoValor,
          valorLiquido: calculatedValorLiquido,
          valorTotal: calculatedValorLiquido,
          parcelas: Number(ecParcelas) || 1,
          formaPagamento: ecFormaPagamento || 'pix',
          diaVencimento: dueDay,
          dataPrimeiroVencimento: ecDataPrimeiroVencimento || ecDataInicio,
          dataInicio: ecDataInicio,
          dataFim: finalEndDate,
          vigenciaMeses: isAnual ? 12 : (ecDuracao === 'semestral' ? 6 : (Number(ecVigenciaQtd) || 1)),
          status: 'assinado',
          usuarioEmissor: userCargo || 'Administrador',
          unidadeContratada: plan?.unidadeAtendimento || 'Clube Fitness',
          frequencia: ecFrequencia,
          creditosTotal: ecCreditosTotal,
          creditosMassagemPorPlano: ecCreditosMassagemTotal,
          creditosEmergenciaPorPlano: ecCreditosEmergenciaTotal,
          enviarClicksign: false,
          enviarAsaas: false
        };

        const contractRes = await fetch('/api/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contractPayload)
        });

        const contractData = await contractRes.json();
        if (!contractRes.ok || !contractData.success) {
          throw new Error(contractData.error || 'Erro ao registrar versão oficial do contrato.');
        }

        // Limpar proposta pendente se houver
        const latestP = allProposalsMap[editContractClient._id];
        if (latestP?._id) {
          await fetch(`/api/propostas?id=${latestP._id}`, { method: 'DELETE' }).catch(() => {});
        }
      }

      // 2. Atualização Cadastral/Comercial do Cliente (PUT /api/clients)
      const clientUpdatePayload: any = {
        id: editContractClient._id,
        dadosComerciais: {
          ...(editContractClient.dadosComerciais || {}),
          planoId: ecPlanoId || null,
          status: activateAsVigente ? 'ativo' : (editContractClient.dadosComerciais?.status || 'ativo'),
          duracao: ecDuracao,
          duracaoQtd: ecVigenciaQtd,
          vigenciaQtd: ecVigenciaQtd,
          dataInicio: ecDataInicio,
          dataFim: finalEndDate,
          vencimento: finalEndDate,
          dataPrimeiroVencimento: ecDataPrimeiroVencimento || ecDataInicio,
          diaVencimento: dueDay,
          formaPagamento: ecFormaPagamento,
          valorUnitario: ecValorUnitario,
          valorTotal: calculatedValorLiquido,
          parcelas: Number(ecParcelas) || 1,
          descontoTipo: ecDescontoTipo,
          descontoValor: ecDescontoValor,
          frequencia: ecFrequencia,
          creditosTotal: ecCreditosTotal,
          creditosMassagemTotal: ecCreditosMassagemTotal,
          creditosEmergenciaTotal: ecCreditosEmergenciaTotal,
          criarRecorrenciaMensal: ecCriarRecorrenciaMensal
        }
      };

      const res = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientUpdatePayload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao salvar condições comerciais.');
      }

      if (selectedClient && selectedClient._id === editContractClient._id) {
        setSelectedClient(data.data);
      }

      if (activateAsVigente) {
        alert('✅ Contrato formalizado e ativado como Vigente!');
      } else {
        alert('✅ Condições comerciais salvas com sucesso no cadastro!');
      }

      fetchData();
      loadContractsAndProposalsOverview();
      if (editContractClient._id) {
        loadContracts(editContractClient._id, true);
      }
      setEditContractClient(null);
    } catch (err: any) {
      setEcError(err.message || 'Erro ao salvar.');
    } finally {
      setEcSaving(false);
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
    let cancelado_agendado = 0;
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
      else if (stage.stageKey === 'cancelado_agendado') cancelado_agendado++;
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
      cancelado_agendado,
      boleto_asaas,
      incompleto
    };
  }, [clients, plans, allContractsMap, allProposalsMap, allPaymentsMap]);

  // Limpeza de todos os filtros de uma vez
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedStatuses(['vigente', 'renovacao', 'vencido', 'aguardando_assinatura', 'lead', 'dynamus', 'cancelado_agendado']);
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
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [showTextPreview, setShowTextPreview] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showImportSignedModal, setShowImportSignedModal] = useState(false);
  const [importPdfFile, setImportPdfFile] = useState<File | null>(null);
  const [importPdfBase64, setImportPdfBase64] = useState<string>('');
  const [importPdfName, setImportPdfName] = useState<string>('');
  const [submittingImport, setSubmittingImport] = useState(false);

  const handleSaveClientModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    setSavingComercial(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedClient._id,
          dadosPessoais: {
            ...(selectedClient.dadosPessoais || {}),
            nome: dcNome,
            email: dcEmail,
            cpf: dcCpf,
            telefone: dcTelefone,
            dataNascimento: dcNascimento,
            sexo: dcSexo,
            cep: dcCep,
            endereco: dcEndereco,
            numero: dcNumero,
            complemento: dcComplemento,
            bairro: dcBairro,
            cidade: dcCidade,
            estado: dcEstado
          },
          dadosComerciais: {
            ...(selectedClient.dadosComerciais || {}),
            asaasCustomerId: dcAsaasCustomerId
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setSelectedClient({
          ...selectedClient,
          dadosPessoais: {
            ...(selectedClient.dadosPessoais || {}),
            nome: dcNome,
            email: dcEmail,
            cpf: dcCpf,
            telefone: dcTelefone,
            dataNascimento: dcNascimento,
            sexo: dcSexo,
            cep: dcCep,
            endereco: dcEndereco,
            numero: dcNumero,
            complemento: dcComplemento,
            bairro: dcBairro,
            cidade: dcCidade,
            estado: dcEstado
          },
          dadosComerciais: {
            ...(selectedClient.dadosComerciais || {}),
            asaasCustomerId: dcAsaasCustomerId
          }
        });
        setShowEditClientModal(false);
        if (typeof fetchData === 'function') fetchData();
      } else {
        setSaveError(data.error || 'Erro ao salvar alterações');
      }
    } catch (err: any) {
      setSaveError(err.message || 'Erro de conexão');
    } finally {
      setSavingComercial(false);
    }
  };

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
  const [swShowCalculator, setSwShowCalculator] = useState(false);
  const [swDesiredInstallment, setSwDesiredInstallment] = useState(0);
  const [swDesiredInstallmentCount, setSwDesiredInstallmentCount] = useState(10);
  const [swSubmitting, setSwSubmitting] = useState(false);

  const handleOpenSalesWizard = (client: any) => {
    setSalesWizardClient(client);
    setSwPlano('');
    setSwDuracao('anual');
    setSwVigenciaQtd(1);
    setSwDataInicio(new Date().toISOString().split('T')[0]);
    setSwValorUnitario(0);
    setSwDescontoTipo('percentual');
    setSwDescontoValor(0);
    setSwFrequencia(3);
    setSwCreditosMensais(13);
    setSwCreditosMassagem(0);
    setSwCreditosEmergencia(1);
    setSwCriarRecorrenciaMensal(false);
    setSwRecorrenciaMeses(12);
    setSwShowCalculator(false);
    setSwDesiredInstallment(0);
    setSwDesiredInstallmentCount(10);
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
      const isAnual = swDuracao === 'anual';
      const grossPrice = isAnual ? swValorUnitario : (swValorUnitario * (swVigenciaQtd || 1));
      let discountDeduction = 0;
      if (swDescontoTipo === 'percentual') {
        discountDeduction = (grossPrice * (Number(swDescontoValor) || 0)) / 100;
      } else {
        discountDeduction = Number(swDescontoValor) || 0;
      }
      const calculatedValorLiquido = Math.max(0, grossPrice - discountDeduction);

      const startD = new Date((swDataInicio || new Date().toISOString().split('T')[0]) + 'T00:00:00');
      const endD = new Date(startD);
      if (swDuracao === 'semana') {
        endD.setDate(endD.getDate() + (swVigenciaQtd * 7));
      } else if (isAnual) {
        const anos = swVigenciaQtd >= 12 ? 1 : (swVigenciaQtd || 1);
        endD.setFullYear(endD.getFullYear() + anos);
      } else {
        endD.setMonth(endD.getMonth() + (swVigenciaQtd || 1));
      }
      const dataFimCalculada = endD.toISOString().split('T')[0];

      const clientBirthDate = salesWizardClient?.dadosPessoais?.dataNascimento || salesWizardClient?.dadosPessoais?.nascimento;
      const isMinorDetected = isMinorFromBirthDate(clientBirthDate);

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
        unidadeContratada: plan?.unidadeAtendimento || '',
        isMinor: isMinorDetected
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

  // ==========================================
  // ESTADOS E HANDLERS: VENDA MANUAL (ADMIN)
  // ==========================================
  const [manualSaleClient, setManualSaleClient] = useState<any>(null);
  const [msSubmitting, setMsSubmitting] = useState(false);
  const [showMsContractPreview, setShowMsContractPreview] = useState(false);

  // 1. Dados Comerciais
  const [msPlano, setMsPlano] = useState('');
  const [msValorUnitario, setMsValorUnitario] = useState<number>(0);
  const [msDuracao, setMsDuracao] = useState<'mensal' | 'anual' | 'semestral' | 'semana'>('mensal');
  const [msVigenciaQtd, setMsVigenciaQtd] = useState<number>(1);
  const [msDataInicio, setMsDataInicio] = useState('');
  const [msCriarRecorrencia, setMsCriarRecorrencia] = useState(false);
  const [msRecorrenciaMeses, setMsRecorrenciaMeses] = useState(12);
  const [msDescontoTipo, setMsDescontoTipo] = useState<'percentual' | 'fixo'>('percentual');
  const [msDescontoValor, setMsDescontoValor] = useState<number>(0);
  const [msFrequencia, setMsFrequencia] = useState<number>(3);
  const [msCreditosMensais, setMsCreditosMensais] = useState<number>(13);
  const [msCreditosMassagem, setMsCreditosMassagem] = useState<number>(0);
  const [msCreditosEmergencia, setMsCreditosEmergencia] = useState<number>(0);

  // 2. Dados Pessoais do Aluno
  const [msNome, setMsNome] = useState('');
  const [msCpf, setMsCpf] = useState('');
  const [msEmail, setMsEmail] = useState('');
  const [msTelefone, setMsTelefone] = useState('');
  const [msDataNascimento, setMsDataNascimento] = useState('');

  // 3. Dados do Responsável Legal (quando menor de idade)
  const [msRespNome, setMsRespNome] = useState('');
  const [msRespCpf, setMsRespCpf] = useState('');
  const [msRespEmail, setMsRespEmail] = useState('');
  const [msRespTelefone, setMsRespTelefone] = useState('');

  // 4. Endereço Residencial
  const [msCep, setMsCep] = useState('');
  const [msEndereco, setMsEndereco] = useState('');
  const [msNumero, setMsNumero] = useState('');
  const [msComplemento, setMsComplemento] = useState('');
  const [msBairro, setMsBairro] = useState('');
  const [msCidade, setMsCidade] = useState('');
  const [msEstado, setMsEstado] = useState('MG');
  const [msBuscandoCep, setMsBuscandoCep] = useState(false);

  // 5. Condições de Pagamento (Superpoderes Admin)
  const [msFormaPagamento, setMsFormaPagamento] = useState<'boleto' | 'cartao'>('boleto');
  const [msParcelas, setMsParcelas] = useState<number>(1);
  const [msDataPrimeiroVencimento, setMsDataPrimeiroVencimento] = useState('');

  const handleMsCepBlur = async () => {
    const clean = (msCep || '').replace(/\D/g, '');
    if (clean.length !== 8) return;
    setMsBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        if (data.logradouro) setMsEndereco(data.logradouro);
        if (data.bairro) setMsBairro(data.bairro);
        if (data.localidade) setMsCidade(data.localidade);
        if (data.uf) setMsEstado(data.uf);
      }
    } catch {
      // ignore
    } finally {
      setMsBuscandoCep(false);
    }
  };

  const handleOpenManualSale = (client: any) => {
    setManualSaleClient(client);
    setShowMsContractPreview(false);
    const dp = client?.dadosPessoais || {};
    const com = client?.dadosComerciais || {};

    // 1. Dados Pessoais
    setMsNome(dp.nome || '');
    setMsCpf(dp.cpf || '');
    setMsEmail(dp.email || '');
    setMsTelefone(dp.telefone || '');
    setMsDataNascimento(dp.dataNascimento || dp.nascimento || '');

    // Responsável (se menor)
    setMsRespNome('');
    setMsRespCpf('');
    setMsRespEmail('');
    setMsRespTelefone('');

    // Endereço
    setMsCep(dp.cep || '');
    setMsEndereco(dp.endereco || '');
    setMsNumero(dp.numero || '');
    setMsComplemento(dp.complemento || '');
    setMsBairro(dp.bairro || '');
    setMsCidade(dp.cidade || '');
    setMsEstado(dp.estado || 'MG');

    // 2. Dados Comerciais
    const defaultPlanId = com.planoId?._id || com.planoId || (plans.length > 0 ? plans[0]._id : '');
    const plan = plans.find(p => p._id === defaultPlanId);
    const isAnual = plan?.tipo === 'Anual';
    setMsPlano(defaultPlanId);
    setMsValorUnitario(Number(com.valorUnitario) || plan?.preco || 0);
    setMsDuracao((com.duracao as any) || (isAnual ? 'anual' : 'mensal'));
    setMsVigenciaQtd(1);
    setMsDataInicio(new Date().toISOString().split('T')[0]);
    setMsCriarRecorrencia(Boolean(com.criarRecorrenciaMensal));
    setMsRecorrenciaMeses(12);
    setMsDescontoTipo('percentual');
    setMsDescontoValor(0);
    const freq = Number(com.frequencia) || plan?.frequencia || 3;
    setMsFrequencia(freq);
    setMsCreditosMensais(freq === 1 ? 4 : freq === 2 ? 9 : freq === 3 ? 13 : freq === 4 ? 17 : freq === 5 ? 22 : 13);
    setMsCreditosMassagem(isAnual ? 1 : 0);
    setMsCreditosEmergencia(isAnual ? 1 : 0);

    // 3. Pagamento
    setMsFormaPagamento('boleto');
    setMsParcelas(1);
    setMsDataPrimeiroVencimento(new Date().toISOString().split('T')[0]);
  };

  const handleConfirmManualSale = async (actionType: 'clicksign' | 'presencial') => {
    if (!manualSaleClient || !msPlano) {
      alert('Por favor, selecione um plano.');
      return;
    }
    if (!msNome.trim() || !msCpf.trim() || !msEmail.trim() || !msTelefone.trim()) {
      alert('Por favor, preencha os dados cadastrais básicos do aluno (Nome, CPF, E-mail e WhatsApp).');
      return;
    }

    const birthDateStr = msDataNascimento || manualSaleClient?.dadosPessoais?.dataNascimento || manualSaleClient?.dadosPessoais?.nascimento;
    const isMinor = isMinorFromBirthDate(birthDateStr);
    if (isMinor) {
      if (!msRespNome.trim() || !msRespCpf.trim() || !msRespEmail.trim() || !msRespTelefone.trim()) {
        alert('Este aluno é menor de idade. Por favor, preencha todos os campos do Responsável Legal (Nome, CPF, E-mail e WhatsApp).');
        return;
      }
    }

    if (!msEndereco.trim() || !msNumero.trim() || !msBairro.trim() || !msCidade.trim()) {
      alert('Por favor, preencha o endereço residencial completo (Rua, Número, Bairro e Cidade).');
      return;
    }

    setMsSubmitting(true);
    try {
      const plan = plans.find(p => p._id === msPlano);
      const isAnual = msDuracao === 'anual';
      const grossPrice = Number(msValorUnitario || 0) * (msDuracao === 'mensal' ? Number(msVigenciaQtd || 1) : 1);
      let discountDeduction = 0;
      if (msDescontoTipo === 'percentual') {
        discountDeduction = (grossPrice * (Number(msDescontoValor) || 0)) / 100;
      } else {
        discountDeduction = Number(msDescontoValor) || 0;
      }
      discountDeduction = Math.min(discountDeduction, grossPrice);
      const calculatedValorLiquido = Math.max(0, grossPrice - discountDeduction);

      const numParcelas = Number(msParcelas) || 1;
      const cardRate = msFormaPagamento === 'cartao' ? getCardRateForInstallment(numParcelas) : 0;
      const finalPrice = msFormaPagamento === 'cartao' ? Number((calculatedValorLiquido * (1 + cardRate)).toFixed(2)) : calculatedValorLiquido;

      const dataFimCalculada = calculateContractEndDate(msDataInicio, msDuracao, msVigenciaQtd, undefined, msCriarRecorrencia);
      const vigenciaMeses = isAnual ? 12 : (msDuracao === 'semestral' ? 6 : (Number(msVigenciaQtd) || 1));

      // 1. Atualizar dados cadastrais e comerciais do cliente
      const clientUpdatePayload = {
        id: manualSaleClient._id,
        dadosPessoais: {
          ...manualSaleClient.dadosPessoais,
          nome: msNome,
          cpf: msCpf,
          email: msEmail,
          telefone: msTelefone,
          dataNascimento: msDataNascimento,
          cep: msCep,
          endereco: msEndereco,
          numero: msNumero,
          complemento: msComplemento,
          bairro: msBairro,
          cidade: msCidade,
          estado: msEstado,
          responsavelLegal: isMinor ? {
            nome: msRespNome,
            cpf: msRespCpf,
            email: msRespEmail,
            telefone: msRespTelefone
          } : undefined
        },
        dadosComerciais: {
          ...(manualSaleClient.dadosComerciais || {}),
          planoId: msPlano,
          status: actionType === 'presencial' ? 'ativo' : 'pendente',
          duracao: msDuracao,
          duracaoQtd: msVigenciaQtd,
          vigenciaQtd: msVigenciaQtd,
          dataInicio: msDataInicio,
          vencimento: dataFimCalculada,
          dataPrimeiroVencimento: msDataPrimeiroVencimento || msDataInicio,
          formaPagamento: msFormaPagamento,
          valorUnitario: msValorUnitario,
          parcelas: numParcelas,
          descontoTipo: msDescontoTipo,
          descontoValor: msDescontoValor,
          frequencia: msFrequencia,
          creditosTotal: msCreditosMensais,
          creditosMassagemTotal: msCreditosMassagem,
          creditosEmergenciaTotal: msCreditosEmergencia,
          criarRecorrenciaMensal: msCriarRecorrencia
        },
        bloqueioCadastral: {
          bloqueado: actionType === 'clicksign',
          motivo: actionType === 'clicksign' ? 'Aguardando assinatura do contrato via Clicksign' : 'Venda manual concluída presencialmente',
          dadosInformadosPeloCliente: true,
          origemCadastro: 'venda_manual_admin',
          historicoDesbloqueios: manualSaleClient.bloqueioCadastral?.historicoDesbloqueios || []
        }
      };

      await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientUpdatePayload)
      });

      // 2. Gerar texto do contrato unificado
      const contractData = {
        clientNome: isMinor ? msRespNome : msNome,
        clientCpf: isMinor ? msRespCpf : msCpf,
        clientEmail: isMinor ? msRespEmail : msEmail,
        clientTelefone: isMinor ? msRespTelefone : msTelefone,
        clientDataNascimento: isMinor ? '' : msDataNascimento,
        clientCep: msCep,
        clientEndereco: msEndereco,
        clientNumero: msNumero,
        clientComplemento: msComplemento,
        clientBairro: msBairro,
        clientCidade: msCidade,
        planNome: plan?.nome || 'Plano Clube Fitness',
        planTipo: plan?.tipo || (isAnual ? 'Anual' : 'Mensal'),
        planPreco: plan?.preco || grossPrice,
        valorUnitario: msValorUnitario,
        valorLiquido: finalPrice,
        descontoTipo: msDescontoTipo,
        descontoValor: msDescontoValor,
        duracao: msDuracao,
        vigenciaQtd: msVigenciaQtd,
        parcelas: numParcelas,
        formaPagamento: msFormaPagamento,
        dataInicio: msDataInicio,
        dataVencimento: msDataPrimeiroVencimento || msDataInicio,
        creditosMensais: msCreditosMensais,
        unidadeContratada: plan?.unidadeAtendimento || 'Clube Fitness',
        isMinor,
        beneficiarioNome: isMinor ? msNome : undefined,
        beneficiarioCpf: isMinor ? msCpf : undefined
      };

      const unifiedContractText = getUnifiedTemplate(contractData);

      // 3. Criar Contrato Oficial
      const contractPayload: any = {
        clientId: manualSaleClient._id,
        planoId: msPlano,
        planoNome: plan?.nome,
        planoTipo: isAnual ? 'Anual' : 'Mensal',
        valorBruto: grossPrice,
        descontoTipo: msDescontoTipo,
        descontoValor: msDescontoValor,
        valorLiquido: finalPrice,
        parcelas: numParcelas,
        formaPagamento: msFormaPagamento,
        diaVencimento: msDataPrimeiroVencimento ? parseInt(msDataPrimeiroVencimento.split('-')[2] || '5', 10) : new Date().getDate(),
        dataPrimeiroVencimento: msDataPrimeiroVencimento || msDataInicio,
        dataInicio: msDataInicio,
        dataFim: dataFimCalculada,
        vigenciaMeses,
        status: actionType === 'presencial' ? 'vigente' : 'pendente',
        contratoTexto: unifiedContractText,
        usuarioEmissor: userCargo || 'Administrador',
        unidadeContratada: plan?.unidadeAtendimento || 'Clube Fitness',
        frequencia: msFrequencia,
        creditosTotal: msCreditosMensais,
        enviarClicksign: actionType === 'clicksign',
        assinaturaNome: actionType === 'presencial' ? 'Assinatura Presencial (Balcão)' : undefined,
        signerNome: isMinor ? msRespNome : msNome,
        signerCpf: isMinor ? msRespCpf : msCpf,
        signerEmail: isMinor ? msRespEmail : msEmail,
        signerTelefone: isMinor ? msRespTelefone : msTelefone,
        isMinor
      };

      const contractRes = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractPayload)
      });
      const contractJson = await contractRes.json();

      if (contractJson.success) {
        if (actionType === 'clicksign') {
          alert(`✅ Contrato emitido com sucesso e enviado pela Clicksign diretamente para o WhatsApp de ${isMinor ? msRespNome : msNome}!`);
        } else {
          alert(`✅ Venda manual cadastrada com sucesso! Contrato ativado e créditos liberados.`);
        }
        setManualSaleClient(null);
        fetchData(true);
      } else {
        alert('Erro ao emitir contrato: ' + (contractJson.error || 'Erro desconhecido'));
      }
    } catch (err: any) {
      alert('Erro ao processar venda manual: ' + err.message);
    } finally {
      setMsSubmitting(false);
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

  // ==========================================
  // ESTADOS E HANDLERS: RESCISÃO & CANCELAMENTO INTELIGENTE
  // ==========================================
  const [showCancelContractModal, setShowCancelContractModal] = useState<boolean>(false);
  const [cancelModalLoading, setCancelModalLoading] = useState<boolean>(false);
  const [cancelModalClient, setCancelModalClient] = useState<any | null>(null);
  const [cancelModalData, setCancelModalData] = useState<any | null>(null);
  const [cancelDataEncerramento, setCancelDataEncerramento] = useState<string>('');
  const [cancelAplicarMulta, setCancelAplicarMulta] = useState<boolean>(true);
  const [cancelMultaValor, setCancelMultaValor] = useState<number>(0);
  const [cancelMotivo, setCancelMotivo] = useState<string>('Acordo Amigável');
  const [cancelObservacoes, setCancelObservacoes] = useState<string>('');
  const [cancelAsaasSubscription, setCancelAsaasSubscription] = useState<boolean>(true);
  const [cancelAsaasPayments, setCancelAsaasPayments] = useState<boolean>(true);
  const [cancelInternalPayments, setCancelInternalPayments] = useState<boolean>(true);
  const [cancelSubmitting, setCancelSubmitting] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string>('');
  const [showAsaasChargesDetail, setShowAsaasChargesDetail] = useState<boolean>(false);

  const handleOpenCancelContractModal = async (client: any, contract?: any) => {
    if (!client) return;
    setCancelModalClient(client);
    setShowCancelContractModal(true);
    setCancelModalLoading(true);
    setCancelError('');

    try {
      const latestCt = contract || allContractsMap[client._id];
      const contractId = latestCt?._id || '';
      const dtInicio = latestCt?.dataInicio || client.dadosComerciais?.dataInicio || dcDataInicio || '';
      const dtFim = latestCt?.dataFim || client.dadosComerciais?.dataFim || client.dadosComerciais?.vencimento || dcVencimento || '';

      const res = await fetch(`/api/contracts/cancel?clientId=${client._id}&contractId=${contractId}&dataInicio=${encodeURIComponent(dtInicio)}&dataFim=${encodeURIComponent(dtFim)}`);
      const data = await res.json();

      if (data.success && data.data) {
        setCancelModalData(data.data);
        const fin = data.data.financeiro;
        setCancelDataEncerramento(fin.dataSugeridaCiclo || new Date().toISOString().split('T')[0]);
        setCancelAplicarMulta(true);
        setCancelMultaValor(fin.multaPadrao10 || 0);
        setCancelAsaasSubscription(Boolean(data.data.asaas?.subscription));
        setCancelAsaasPayments(Boolean(data.data.asaas?.pendingCharges?.length > 0));
        setCancelInternalPayments(true);
      } else {
        setCancelError(data.error || 'Erro ao carregar dados de rescisão.');
      }
    } catch (err: any) {
      setCancelError(err.message || 'Erro de conexão.');
    } finally {
      setCancelModalLoading(false);
    }
  };

  const handleConfirmCancelContract = async () => {
    if (!cancelModalClient) return;
    setCancelSubmitting(true);
    setCancelError('');

    try {
      const contractId = cancelModalData?.contract?._id || allContractsMap[cancelModalClient._id]?._id || '';
      const fineToApply = cancelAplicarMulta ? Number(cancelMultaValor || 0) : 0;

      const payload = {
        clientId: cancelModalClient._id,
        contractId,
        dataEncerramento: cancelDataEncerramento,
        aplicarMulta: cancelAplicarMulta,
        multaValor: fineToApply,
        saldoAcerto: fineToApply,
        motivo: cancelMotivo,
        observacoes: cancelObservacoes,
        cancelarAsaasSubscription: cancelAsaasSubscription,
        cancelarAsaasPayments: cancelAsaasPayments,
        cancelarInternalPayments: cancelInternalPayments
      };

      const res = await fetch('/api/contracts/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        alert(`✅ Rescisão concluída com sucesso!\nAcesso do aluno válido até ${cancelDataEncerramento}.`);
        setShowCancelContractModal(false);
        setCancelModalClient(null);
        setCancelModalData(null);
        if (selectedClient?._id === cancelModalClient._id) {
          loadContracts(selectedClient._id);
        }
        fetchData();
      } else {
        setCancelError(data.error || 'Erro ao executar rescisão.');
      }
    } catch (err: any) {
      setCancelError(err.message || 'Erro de conexão.');
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Cancel clicksign/manual contract legado
  const handleCancelContract = async (contractId: string, clientNome: string) => {
    if (selectedClient) {
      handleOpenCancelContractModal(selectedClient);
      return;
    }
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
    const latestContract = allContractsMap[client._id];
    const latestProposal = allProposalsMap[client._id];

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
    
    const effectivePlanoId = com.planoId?._id || (typeof com.planoId === 'string' ? com.planoId : '') || latestContract?.planoId?._id || latestContract?.planoId || latestProposal?.planoId || '';
    const effectivePlanoNome = latestContract?.planoNome || latestProposal?.planoNome || com.planoNome || '';
    const planObj = plans.find(p => (effectivePlanoId && p._id === effectivePlanoId) || (effectivePlanoNome && p.nome === effectivePlanoNome));

    setDcPlano(planObj?._id || effectivePlanoId);
    setDcStatus(latestContract?.status || com.status || 'lead');
    setDcFormaPag(latestContract?.formaPagamento || latestProposal?.formaPagamentoEscolhida || com.formaPagamento || 'pix');

    const effectiveDuracao = latestContract?.duracao || latestProposal?.duracao || com.duracao || (planObj?.tipo === 'Anual' ? 'anual' : 'mensal');
    const isAnual = effectiveDuracao === 'anual' || planObj?.tipo === 'Anual' || (effectivePlanoNome || '').toLowerCase().includes('anual');
    setDcDuracao(isAnual ? 'anual' : (effectiveDuracao === 'semana' ? 'semana' : 'mensal'));
    const effectiveVigenciaQtd = isAnual ? 1 : (() => {
      if (latestProposal?.vigenciaQtd) return Number(latestProposal.vigenciaQtd);
      if (latestContract?.vigenciaQtd) return Number(latestContract.vigenciaQtd);
      if (com.duracaoQtd && com.duracaoQtd !== com.parcelas) return Number(com.duracaoQtd);
      if (com.vigenciaQtd) return Number(com.vigenciaQtd);
      if (latestContract?.vigenciaMeses && latestContract.vigenciaMeses !== latestContract.parcelas) return Number(latestContract.vigenciaMeses);
      return Number(com.duracaoQtd || 1);
    })();
    setDcVigenciaQtd(effectiveVigenciaQtd);

    setDcValorUnitario(Number(latestContract?.valorUnitario || latestProposal?.valorUnitario || com.valorUnitario || planObj?.preco || 0));
    setDcVencimento(latestContract?.dataPrimeiroVencimento || latestContract?.dataVencimento || latestProposal?.dataVencimentoEscolhida || latestProposal?.dataVencimento || com.dataPrimeiroVencimento || com.vencimento || '');
    setDcDescontoTipo(latestContract?.descontoTipo || latestProposal?.descontoTipo || com.descontoTipo || 'percentual');
    setDcDescontoValor(Number(latestContract?.descontoValor || latestProposal?.descontoValor || com.descontoValor || 0));
    setDcParcelas(Number(latestContract?.parcelas || latestProposal?.parcelasEscolhidas || com.parcelas || 1));
    setDcDataInicio(latestContract?.dataInicio || latestProposal?.dataInicio || com.dataInicio || '');
    setDcResponsavelVenda(latestContract?.usuarioEmissor || com.responsavelVenda || '');
    setDcUnidadeContratada(latestContract?.unidadeContratada || latestProposal?.unidadeContratada || com.unidadeContratada || planObj?.unidadeAtendimento || '');
    setDcObservacoesContratuais(latestContract?.observacoesContratuais || latestProposal?.observacoesContratuais || com.observacoesContratuais || '');
    setDcFrequencia(Number(latestContract?.frequencia || latestProposal?.frequencia || com.frequencia || client.frequencia || planObj?.frequencia || 0));
    setDcCreditosTotal(Number(latestContract?.creditosTotal || latestProposal?.creditosMensais || com.creditosTotal || 0));
    setDcCreditosMassagem(Number(latestContract?.creditosMassagem || latestProposal?.creditosMassagem || com.creditosMassagemTotal || (isAnual ? 1 : 0)));
    setDcCreditosEmergencia(Number(latestContract?.creditosEmergencia || latestProposal?.creditosEmergencia || com.creditosEmergenciaTotal || (isAnual ? 1 : 0)));
    setDcCriarRecorrencia(Boolean(latestContract?.criarRecorrenciaMensal || latestProposal?.criarRecorrenciaMensal || com.criarRecorrenciaMensal));
    setDcRecorrenciaMeses(Number(latestContract?.recorrenciaMeses || latestProposal?.recorrenciaMeses || com.recorrenciaMeses || 12));
    setDcAsaasCustomerId(com.asaasCustomerId || '');

    // Fetch active proposals for this client
    setActiveProposal(latestProposal || null);
    fetch(`/api/propostas?clientId=${client._id}`)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data && json.data.length > 0) {
          const latestProp = json.data[0];
          setActiveProposal(latestProp);
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

              {/* Toggle Rescisões Agendadas */}
              <button
                type="button"
                onClick={() => handleToggleStatus('cancelado_agendado')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: selectedStatuses.includes('cancelado_agendado') ? '#ef4444' : 'rgba(239, 68, 68, 0.25)',
                  background: selectedStatuses.includes('cancelado_agendado') ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.02)',
                  color: selectedStatuses.includes('cancelado_agendado') ? '#fca5a5' : '#94a3b8',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: selectedStatuses.includes('cancelado_agendado') ? 1 : 0.5
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
                Rescisões Agendadas
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '8px', fontSize: '0.72rem' }}>
                  {stageCounts.cancelado_agendado || 0}
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
                  {(searchQuery !== '' || quickViewFilter !== 'todos' || selectedStatuses.length !== 7 || selectedStatuses.includes('finalizado') || orientacaoFilter !== 'todos' || formaPagamentoFilter !== 'todos' || contratoPlanFilter !== 'todos' || sortOption !== 'vencimento_asc') && (
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
                    const isCardProposalMode = stage.stageKey === 'proposta';

                    return (
                      <div
                        key={c._id}
                        style={{
                          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%)',
                          border: isCardProposalMode ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '16px',
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '14px',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                          backdropFilter: 'blur(12px)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div>
                          {/* =========================================================
                              BLOCO 1: IDENTIFICAÇÃO DO ALUNO (SEM AVATAR, PURO NOME)
                              ========================================================= */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.2px', wordBreak: 'break-word', fontFamily: 'var(--font-title)' }}>
                                {c.dadosPessoais?.nome || 'Sem Nome'}
                              </h3>
                              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span>
                                  CPF: <strong style={{ color: hasCpf ? '#cbd5e1' : '#64748b' }}>{hasCpf ? c.dadosPessoais.cpf : '(Não informado)'}</strong>
                                </span>
                                {hasPhone && (
                                  <a
                                    href={waLink || `https://wa.me/55${String(c.dadosPessoais.telefone).replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      background: 'rgba(16, 185, 129, 0.12)',
                                      border: '1px solid rgba(16, 185, 129, 0.3)',
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      color: '#34d399',
                                      fontWeight: 700,
                                      fontSize: '0.76rem',
                                      textDecoration: 'none',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                    title="Conversar no WhatsApp"
                                  >
                                    <i className="fa-brands fa-whatsapp"></i> {c.dadosPessoais.telefone}
                                  </a>
                                )}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: hasEndereco ? '#94a3b8' : '#64748b', marginTop: '4px', lineHeight: 1.3 }}>
                                <i className="fa-solid fa-location-dot" style={{ marginRight: '4px', color: hasEndereco ? '#38bdf8' : '#475569' }}></i>
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
                                </div>
                              )}
                            </div>

                            {/* Badge do Estágio */}
                            <span style={{
                              background: stage.badgeBg,
                              color: stage.badgeColor,
                              border: stage.badgeBorder || 'none',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              letterSpacing: '0.3px',
                              textTransform: 'uppercase',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}>
                              {stage.stageLabel}
                            </span>
                          </div>

                          {/* =========================================================
                              BLOCO 2: INFORMAÇÕES DA PROPOSTA OU CONTRATO
                              ========================================================= */}
                          {isCardProposalMode && latestProposal ? (
                            /* CARD INFORMATIVO DA PROPOSTA COMERCIAL */
                            <div style={{
                              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              borderRadius: '12px',
                              padding: '12px 14px',
                              marginTop: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem' }}>
                                <span style={{ color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <i className="fa-solid fa-file-invoice-dollar" style={{ color: '#fbbf24' }}></i> Plano Proposto:
                                </span>
                                <strong style={{ color: '#ffffff', fontWeight: 800, textAlign: 'right' }}>
                                  {latestProposal.planoNome || 'Plano Personalizado'}
                                </strong>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                <span style={{ color: '#94a3b8', fontWeight: 500 }}>Duração & Franquia:</span>
                                <strong style={{ color: '#fbbf24', fontWeight: 700 }}>
                                  {latestProposal.duracao === 'semana' ? 'Semana' : 'Mensal'} • {latestProposal.vigenciaQtd || 1} {latestProposal.duracao === 'semana' ? 'sem' : 'mês(es)'} {latestProposal.frequencia ? `(${latestProposal.frequencia}x/sem)` : ''}
                                </strong>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', background: 'rgba(0,0,0,0.25)', padding: '5px 8px', borderRadius: '6px' }}>
                                <span style={{ color: '#94a3b8', fontWeight: 500 }}>Previsão de Vigência:</span>
                                <strong style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.78rem' }}>
                                  📅 A partir da ativação
                                </strong>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', borderTop: '1px solid rgba(245, 158, 11, 0.15)', paddingTop: '6px' }}>
                                <span style={{ color: '#94a3b8', fontWeight: 500 }}>Valor Proposto:</span>
                                <strong style={{ color: '#38bdf8', fontWeight: 900, fontSize: '0.95rem' }}>
                                  R$ {Number(latestProposal.valorFinalRecalculado || latestProposal.valorAcordado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </strong>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                                <span style={{ color: '#94a3b8', fontWeight: 500 }}>1º Vencimento:</span>
                                {latestProposal.dataVencimentoEscolhida ? (
                                  <strong style={{ color: '#34d399', fontWeight: 700 }}>
                                    📅 {new Date(latestProposal.dataVencimentoEscolhida + (latestProposal.dataVencimentoEscolhida.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('pt-BR')}
                                  </strong>
                                ) : (
                                  <span style={{ color: '#fbbf24', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <i className="fa-solid fa-hourglass-half"></i> Aguardando escolha no link
                                  </span>
                                )}
                              </div>

                              {/* Status de Visualização do Link */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '6px' }}>
                                <span style={{ color: '#94a3b8', fontWeight: 500 }}>Última Visualização:</span>
                                {latestProposal.abertoEm ? (
                                  <span style={{ color: '#38bdf8', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <i className="fa-solid fa-eye"></i> Aberto em {new Date(latestProposal.abertoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} às {new Date(latestProposal.abertoEm).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}
                                    {latestProposal.visualizacoesCount && latestProposal.visualizacoesCount > 1 ? ` (${latestProposal.visualizacoesCount}x)` : ''}
                                  </span>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <i className="fa-regular fa-eye-slash"></i> Ainda não aberto
                                  </span>
                                )}
                              </div>

                              {/* Checklist de Dados */}
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                                <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: hasCpf && hasPhone ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: hasCpf && hasPhone ? '#34d399' : '#f87171', border: '1px solid', borderColor: hasCpf && hasPhone ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)', fontWeight: 700 }}>
                                  {hasCpf && hasPhone ? '✅ Contato & CPF' : '⚠️ Contato/CPF Incompleto'}
                                </span>
                                <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: hasEndereco ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: hasEndereco ? '#34d399' : '#f87171', border: '1px solid', borderColor: hasEndereco ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)', fontWeight: 700 }}>
                                  {hasEndereco ? '✅ Endereço Completo' : '⚠️ Endereço Não Informado'}
                                </span>
                              </div>
                            </div>
                          ) : (
                            /* CARD DE CONTRATO ATIVO / PENDENTE / OUTROS - SOFT GLASS */
                            <div style={{
                              background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.035) 0%, rgba(255, 255, 255, 0.01) 100%)',
                              border: '1px solid rgba(255, 255, 255, 0.07)',
                              borderRadius: '14px',
                              padding: '14px 16px',
                              marginTop: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                              boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)'
                            }}>
                              {/* 1. Nome do Plano & Badge de Frequência */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto', minWidth: 0 }}>
                                  <span style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '6px',
                                    background: 'rgba(56, 189, 248, 0.12)',
                                    color: '#38bdf8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.72rem',
                                    flexShrink: 0
                                  }}>
                                    <i className="fa-solid fa-dumbbell"></i>
                                  </span>
                                  <span style={{
                                    fontWeight: 750,
                                    fontSize: '0.92rem',
                                    color: '#f8fafc',
                                    letterSpacing: '-0.2px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {latestContract?.planoNome || com.planoNome || plan?.nome || (!isFunnelTerm(c.plano) ? c.plano : null) || 'A definir'}
                                  </span>
                                </div>

                                {plan?.frequenciaSemanal && (
                                  <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 650,
                                    color: 'var(--text-muted)',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {plan.frequenciaSemanal}x/sem
                                  </span>
                                )}
                              </div>

                              {/* 2. Vigência Suave */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', gap: '6px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255, 255, 255, 0.65)' }}>
                                  <i className="fa-regular fa-calendar" style={{ fontSize: '0.76rem', color: 'rgba(255, 255, 255, 0.4)' }}></i>
                                  <span>
                                    {info.isLead || info.isUncontracted
                                      ? (c.createdAt ? `Cadastrado em ${new Date(c.createdAt).toLocaleDateString('pt-BR')}` : 'Recente')
                                      : `${info.dataInicioFormatted} → ${info.dataFimFormatted}`}
                                  </span>
                                </div>

                                {info.daysLeftText && (
                                  <span style={{
                                    background: info.isLead || info.isUncontracted
                                      ? 'rgba(168, 85, 247, 0.12)'
                                      : (info.isExpired ? 'rgba(239, 68, 68, 0.12)' : info.isExpiringSoon ? 'rgba(245, 158, 11, 0.14)' : 'rgba(16, 185, 129, 0.12)'),
                                    color: info.isLead || info.isUncontracted
                                      ? '#c084fc'
                                      : (info.isExpired ? '#fca5a5' : info.isExpiringSoon ? '#fbbf24' : '#34d399'),
                                    border: info.isLead || info.isUncontracted
                                      ? '1px solid rgba(168, 85, 247, 0.25)'
                                      : (info.isExpired ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)'),
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '20px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    {!info.isExpired && !info.isLead && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor' }}></span>}
                                    {info.daysLeftText}
                                  </span>
                                )}
                              </div>

                              {Boolean(stage.isRecorrente) && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', background: 'rgba(59, 130, 246, 0.06)', padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                                  <span style={{ color: '#93c5fd', fontWeight: 550 }}>
                                    <i className="fa-solid fa-arrows-rotate" style={{ marginRight: '4px' }}></i> Anual (12 Meses):
                                  </span>
                                  <strong style={{ color: '#f8fafc' }}>
                                    Término em {info.dataFimRecorrenciaFormatted}
                                  </strong>
                                </div>
                              )}

                              {/* 3. Cápsula Financeira Suave (Investment Pill) */}
                              <div style={{
                                background: 'rgba(0, 0, 0, 0.22)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                borderRadius: '10px',
                                padding: '8px 12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600 }}>
                                    Investimento Total
                                  </span>
                                  <span style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.2px' }}>
                                    {stage.stageKey === 'dynamus'
                                      ? 'Convênio Dynamus'
                                      : (latestContract?.valorTotal || latestContract?.valorLiquido || com.valorTotal || com.valorUnitario)
                                        ? `R$ ${Number(latestContract?.valorTotal || latestContract?.valorLiquido || com.valorTotal || com.valorUnitario || 0).toFixed(2).replace('.', ',')}`
                                        : 'A definir'}
                                  </span>
                                </div>

                                {stage.stageKey !== 'dynamus' && (latestContract?.formaPagamento || com.formaPagamento) && (
                                  <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    color: 'rgba(255, 255, 255, 0.85)',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    padding: '4px 9px',
                                    borderRadius: '6px',
                                    letterSpacing: '0.2px'
                                  }}>
                                    {(latestContract?.formaPagamento || com.formaPagamento || 'PIX').toUpperCase()}
                                    {(latestContract?.parcelas || com.parcelas || 1) > 1 ? ` • ${(latestContract?.parcelas || com.parcelas)}x` : ''}
                                  </span>
                                )}
                              </div>

                              {/* Checklist de Dados exibido apenas em Leads/Cadastros incompletos (oculto em contratos vigentes) */}
                              {(info.isLead || info.isUncontracted || stage.stageKey === 'dynamus') && (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
                                  {stage.stageKey === 'dynamus' ? (
                                    <>
                                      <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.12)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.25)', fontWeight: 700 }}>
                                        ✅ Cadastro Dynamus Completo
                                      </span>
                                      <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.2)', fontWeight: 700 }}>
                                        ✅ Convênio Corporativo
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: hasCpf && hasPhone ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: hasCpf && hasPhone ? '#34d399' : '#f87171', border: '1px solid', borderColor: hasCpf && hasPhone ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)' }}>
                                        {hasCpf && hasPhone ? '✅ Contato & CPF' : '⚠️ Contato/CPF Incompleto'}
                                      </span>
                                      <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: hasEndereco ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: hasEndereco ? '#34d399' : '#f87171', border: '1px solid', borderColor: hasEndereco ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)' }}>
                                        {hasEndereco ? '✅ Endereço Completo' : '⚠️ Endereço Não Informado'}
                                      </span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* =========================================================
                            BLOCO 3: BOTÕES DE AÇÃO OTIMIZADOS E SEM REDUNDÂNCIAS
                            ========================================================= */}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          
                          {/* CASO A: PROPOSTA ENVIADA */}
                          {isCardProposalMode && latestProposal ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                              {/* 1. Botão Hero: Link de Venda */}
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
                                  padding: '11px 14px',
                                  borderRadius: '10px',
                                  border: 'none',
                                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                  color: '#ffffff',
                                  fontWeight: 800,
                                  fontSize: '0.86rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                <i className="fa-solid fa-share-nodes"></i> Copiar / Reenviar Link
                              </button>

                              {/* 2. Linha de Ações Secundárias Simétricas (3 botões) */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleManualActivateClient(c, latestProposal)}
                                  style={{
                                    padding: '8px 6px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(16, 185, 129, 0.4)',
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    color: '#34d399',
                                    fontWeight: 700,
                                    fontSize: '0.74rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px'
                                  }}
                                  title="Validar fechamento manual e ativar o aluno como Contrato Vigente"
                                >
                                  <i className="fa-solid fa-circle-check"></i> Fechar Manual
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSelectClient(c)}
                                  style={{
                                    padding: '8px 6px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    color: '#f1f5f9',
                                    fontWeight: 700,
                                    fontSize: '0.74rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px'
                                  }}
                                  title="Abrir o workspace completo do aluno"
                                >
                                  <i className="fa-solid fa-folder-open" style={{ color: '#38bdf8' }}></i> Workspace
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleCancelProposal(c, latestProposal)}
                                  style={{
                                    padding: '8px 6px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(239, 68, 68, 0.4)',
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    color: '#f87171',
                                    fontWeight: 700,
                                    fontSize: '0.74rem',
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
                          ) : stage.stageKey === 'ativo' ? (
                            /* CASO A: CONTRATO VIGENTE / ATIVO */
                            <button
                              type="button"
                              onClick={() => handleSelectClient(c)}
                              style={{
                                width: '100%',
                                padding: '13px 18px',
                                borderRadius: '12px',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.8) 100%)',
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: '0.88rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.6)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.2)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.35)';
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3)';
                              }}
                            >
                              <i className="fa-solid fa-folder-open" style={{ color: '#10b981', fontSize: '1rem' }}></i> Abrir Workspace do Contrato
                            </button>
                          ) : stage.stageKey === 'pendente' ? (
                            /* CASO C: PENDENTE CLICKSIGN */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                              <button
                                type="button"
                                onClick={() => handleSyncClicksignForClient(c)}
                                disabled={syncingClicksignClientId === c._id}
                                style={{
                                  width: '100%',
                                  padding: '11px 14px',
                                  borderRadius: '10px',
                                  border: 'none',
                                  background: '#f59e0b',
                                  color: '#000000',
                                  fontWeight: 800,
                                  fontSize: '0.86rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)'
                                }}
                              >
                                {syncingClicksignClientId === c._id ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-arrows-rotate"></i>}
                                Sincronizar Clicksign
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelectClient(c)}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(255, 255, 255, 0.12)',
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  color: '#f1f5f9',
                                  fontWeight: 700,
                                  fontSize: '0.76rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '5px'
                                }}
                              >
                                <i className="fa-solid fa-folder-open" style={{ color: '#38bdf8' }}></i> Abrir Workspace
                              </button>
                            </div>
                          ) : stage.stageKey === 'cancelado_agendado' ? (
                            /* CASO RESCISÃO AGENDADA */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenCancelContractModal(c, latestContract)}
                                  style={{
                                    flex: '1 1 auto',
                                    padding: '11px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(239, 68, 68, 0.5)',
                                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(15, 23, 42, 0.8) 100%)',
                                    color: '#fca5a5',
                                    fontWeight: 800,
                                    fontSize: '0.82rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                                  }}
                                  title="Ver os detalhes e acertos da rescisão efetuada"
                                >
                                  <i className="fa-solid fa-ban"></i> Detalhes da Rescisão
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenFinalizeModal(c)}
                                  title="Encerrar o acesso imediatamente"
                                  style={{
                                    padding: '11px 12px',
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
                                    gap: '5px'
                                  }}
                                >
                                  <i className="fa-solid fa-flag-checkered"></i> Encerrar Hoje
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSelectClient(c)}
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(255, 255, 255, 0.12)',
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  color: '#f1f5f9',
                                  fontWeight: 700,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  transition: 'all 0.2s ease'
                                }}
                                title="Abrir Workspace do Contrato"
                              >
                                <i className="fa-solid fa-folder-open" style={{ color: '#38bdf8' }}></i> Abrir Workspace do Contrato
                              </button>
                            </div>
                          ) : (stage.stageKey === 'vencido' || stage.stageKey === 'renovacao') ? (
                            /* CASO D: VENCIDO / RENOVAÇÃO */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleGenerateRenewalLink(c)}
                                  disabled={Boolean(generatingRenewalClientId)}
                                  style={{
                                    flex: '1 1 auto',
                                    padding: '11px 14px',
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
                                    padding: '11px 12px',
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
                                    gap: '5px'
                                  }}
                                >
                                  <i className="fa-solid fa-flag-checkered"></i> Não Renovou
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSelectClient(c)}
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(255, 255, 255, 0.12)',
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  color: '#f1f5f9',
                                  fontWeight: 700,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  transition: 'all 0.2s ease'
                                }}
                                title="Abrir Workspace do Contrato"
                              >
                                <i className="fa-solid fa-folder-open" style={{ color: '#38bdf8' }}></i> Abrir Workspace do Contrato
                              </button>
                            </div>
                          ) : stage.stageKey === 'finalizado' ? (
                            /* CASO E: FINALIZADO */
                            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenDirectContractWizard(c)}
                                style={{
                                  flex: '1 1 auto',
                                  padding: '11px 14px',
                                  borderRadius: '10px',
                                  border: 'none',
                                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                  color: '#ffffff',
                                  fontWeight: 800,
                                  fontSize: '0.84rem',
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
                              <button
                                type="button"
                                onClick={() => handleSelectClient(c)}
                                style={{
                                  padding: '11px 12px',
                                  borderRadius: '10px',
                                  border: '1px solid rgba(255, 255, 255, 0.12)',
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  color: '#f1f5f9',
                                  fontWeight: 700,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}
                                title="Abrir Workspace do Aluno"
                              >
                                <i className="fa-solid fa-folder-open" style={{ color: '#38bdf8' }}></i>
                              </button>
                            </div>
                          ) : (
                            /* CASO F: LEAD / PADRÃO */
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenSalesWizard(c)}
                                style={{
                                  flex: '1 1 auto',
                                  padding: '11px 14px',
                                  borderRadius: '10px',
                                  border: 'none',
                                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                  color: '#ffffff',
                                  fontWeight: 800,
                                  fontSize: '0.86rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)'
                                }}
                              >
                                <i className="fa-solid fa-bolt"></i> Gerar Link de Venda
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSelectClient(c)}
                                style={{
                                  padding: '11px 12px',
                                  borderRadius: '10px',
                                  border: '1px solid rgba(255, 255, 255, 0.12)',
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  color: '#f1f5f9',
                                  fontWeight: 700,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}
                                title="Abrir Workspace"
                              >
                                <i className="fa-solid fa-folder-open" style={{ color: '#38bdf8' }}></i>
                              </button>
                            </div>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Workspace Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setSelectedClient(null)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', fontSize: '0.84rem', fontWeight: 600, background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.12)', color: '#cbd5e1', cursor: 'pointer' }}
        >
          <i className="fa-solid fa-arrow-left"></i> Voltar para a lista de alunos
        </button>
        <div style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
          <i className="fa-solid fa-folder-open" style={{ color: '#10b981' }}></i>
          <span>Workspace de Gestão Contratual</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 0.9fr)', gap: '20px', alignItems: 'start' }}>
        
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

          <form onSubmit={handleSaveComercial} style={{ display: 'flex', flexDirection: 'column', gap: '18px', margin: 0 }}>
          {/* CABEÇALHO DO CLIENTE NO FORMULÁRIO (HERO VIP SEM AVATAR) */}
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

            const telClean = String(selectedClient.dadosPessoais?.telefone || dcTelefone || '').replace(/\D/g, '');
            const fullAddr = [
              selectedClient.dadosPessoais?.endereco || dcEndereco ? `${selectedClient.dadosPessoais?.endereco || dcEndereco}${selectedClient.dadosPessoais?.numero || dcNumero ? `, ${selectedClient.dadosPessoais?.numero || dcNumero}` : ''}` : '',
              selectedClient.dadosPessoais?.complemento || dcComplemento,
              selectedClient.dadosPessoais?.bairro || dcBairro,
              selectedClient.dadosPessoais?.cidade || dcCidade ? `${selectedClient.dadosPessoais?.cidade || dcCidade}${selectedClient.dadosPessoais?.estado || dcEstado ? ` - ${selectedClient.dadosPessoais?.estado || dcEstado}` : ''}` : '',
              selectedClient.dadosPessoais?.cep || dcCep ? `CEP: ${selectedClient.dadosPessoais?.cep || dcCep}` : ''
            ].filter(Boolean).join(' • ');

            const latestContractTop = (contracts && contracts.length > 0 ? contracts[0] : null) || allContractsMap[selectedClient._id] || null;
            const currentProposalTop = activeProposal || allProposalsMap[selectedClient._id] || null;
            const planIdStrTop = latestContractTop?.planoId?._id || latestContractTop?.planoId || currentProposalTop?.planoId || selectedClient.dadosComerciais?.planoId?._id || (typeof selectedClient.dadosComerciais?.planoId === 'string' ? selectedClient.dadosComerciais?.planoId : dcPlano);
            const selectedPlanTop = plans.find(p => p._id === planIdStrTop || p.nome === latestContractTop?.planoNome || p.nome === currentProposalTop?.planoNome || p.nome === selectedClient.dadosComerciais?.planoNome);
            const clientPyTop = allPaymentsMap[selectedClient._id] || [];
            const stage = resolveClientContractStage(selectedClient, selectedPlanTop, latestContractTop, currentProposalTop, clientPyTop);

            const isClientLocked = selectedClient.bloqueioCadastral?.bloqueado !== false;
            const lockMotivo = selectedClient.bloqueioCadastral?.motivo || (selectedClient.dadosPessoais?.cpf ? 'Informação fornecida pelo contratante' : 'Dado consolidado no cadastro');

            return (
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.09)',
                borderRadius: '16px',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(16px)'
              }}>
                <div style={{ flex: '1 1 340px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px', fontFamily: 'var(--font-title)' }}>
                      {selectedClient.dadosPessoais?.nome || selectedClient.nome || dcNome || 'Aluno'}
                    </h3>
                    {isClientLocked && (
                      <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '3px 9px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <i className="fa-solid fa-shield-halved"></i> {lockMotivo} (Blindado)
                      </span>
                    )}
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      background: stage.badgeBg,
                      color: stage.badgeColor,
                      border: stage.badgeBorder || 'none',
                      textTransform: 'uppercase',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      letterSpacing: '0.3px'
                    }}>
                      {stage.stageLabel}
                    </span>
                  </div>

                  {/* Metadados do Aluno em Chips Elegantes */}
                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '0.82rem', color: '#94a3b8', marginTop: '10px', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <i className="fa-solid fa-id-card" style={{ color: '#64748b' }}></i>
                      <strong style={{ color: '#cbd5e1' }}>CPF:</strong> {selectedClient.dadosPessoais?.cpf || dcCpf || 'Não informado'}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <i className="fa-solid fa-envelope" style={{ color: '#64748b' }}></i>
                      <strong style={{ color: '#cbd5e1' }}>E-mail:</strong> {selectedClient.dadosPessoais?.email || dcEmail || 'Não informado'}
                    </span>
                    {(selectedClient.dadosPessoais?.telefone || dcTelefone) && (
                      <a
                        href={telClean ? `https://wa.me/55${telClean}` : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: 'rgba(16, 185, 129, 0.12)',
                          border: '1px solid rgba(16, 185, 129, 0.35)',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          color: '#34d399',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <i className="fa-brands fa-whatsapp"></i> {selectedClient.dadosPessoais?.telefone || dcTelefone}
                      </a>
                    )}
                    {birthDateFormatted && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <i className="fa-solid fa-cake-candles" style={{ color: '#64748b' }}></i>
                        <strong style={{ color: '#cbd5e1' }}>Nascimento:</strong> {birthDateFormatted}
                      </span>
                    )}
                  </div>

                  {fullAddr && (
                    <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-location-dot" style={{ color: '#475569' }}></i> {fullAddr}
                    </div>
                  )}
                </div>

                {/* Barra de Ações Rápidas de Gestão */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowEditClientModal(true)}
                    style={{ fontSize: '0.78rem', padding: '7px 14px', background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', borderColor: 'rgba(255,255,255,0.12)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    <i className="fa-solid fa-pen-to-square"></i> Editar Cadastro
                  </button>
                  {isClientLocked && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowUnlockModal(true)}
                      style={{
                        fontSize: '0.78rem',
                        padding: '7px 14px',
                        background: 'rgba(251, 191, 36, 0.12)',
                        color: '#fbbf24',
                        borderColor: 'rgba(251, 191, 36, 0.35)',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        borderRadius: '8px',
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
                      fontSize: '0.78rem',
                      padding: '7px 14px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      color: '#f87171',
                      borderColor: 'rgba(239, 68, 68, 0.35)',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderRadius: '8px',
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
                    style={{ fontSize: '0.78rem', padding: '7px 14px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.12)', color: '#f1f5f9', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                  >
                    <i className="fa-solid fa-xmark"></i> Fechar Workspace
                  </button>
                </div>
              </div>
            );
          })()}

          {/* =========================================================================
              PAINEL EXECUTIVO DO ALUNO & AUDITORIA (DARK GLASSMORPHISM SOFISTICADO)
              ========================================================================= */}
          {(() => {
            const latestContract = (contracts && contracts.length > 0 ? contracts[0] : null) || allContractsMap[selectedClient._id] || null;
            const currentProposal = activeProposal || allProposalsMap[selectedClient._id] || null;
            const planIdStr = latestContract?.planoId?._id || latestContract?.planoId || currentProposal?.planoId || selectedClient.dadosComerciais?.planoId?._id || (typeof selectedClient.dadosComerciais?.planoId === 'string' ? selectedClient.dadosComerciais?.planoId : dcPlano);
            const selectedPlan = plans.find(p => p._id === planIdStr || p.nome === latestContract?.planoNome || p.nome === currentProposal?.planoNome || p.nome === selectedClient.dadosComerciais?.planoNome || (typeof selectedClient.dadosComerciais?.planoId === 'object' && p._id === selectedClient.dadosComerciais?.planoId?._id));
            const clientPy = allPaymentsMap[selectedClient._id] || [];
            const info = getContractValidityInfo(selectedClient, selectedPlan, clientPy);

            const planNameResolved = 
              latestContract?.planoNome ||
              currentProposal?.planoNome ||
              selectedClient.dadosComerciais?.planoNome ||
              selectedPlan?.nome ||
              (typeof selectedClient.dadosComerciais?.planoId === 'object' ? selectedClient.dadosComerciais?.planoId?.nome : null) ||
              (!isFunnelTerm(selectedClient.plano) ? selectedClient.plano : null) ||
              (dcPlano ? plans.find(p => p._id === dcPlano)?.nome : null) ||
              'Plano Personalizado';

            const rawTipo = String(
              latestContract?.duracao ||
              selectedClient.dadosComerciais?.duracao || 
              currentProposal?.duracao || 
              dcDuracao || 
              (selectedPlan?.tipo === 'Anual' ? 'anual' : 'mensal')
            ).toLowerCase();

            const isAnual = rawTipo === 'anual' || selectedPlan?.tipo === 'Anual' || (planNameResolved || '').toLowerCase().includes('anual');
            const tipoLabel = rawTipo === 'semana' ? 'Semana' : (isAnual ? 'Anual' : 'Mensal');
            const qtdVal = isAnual ? 1 : (() => {
              if (currentProposal?.vigenciaQtd) return Number(currentProposal.vigenciaQtd);
              if (latestContract?.vigenciaQtd) return Number(latestContract.vigenciaQtd);
              if (selectedClient.dadosComerciais?.duracaoQtd && selectedClient.dadosComerciais.duracaoQtd !== selectedClient.dadosComerciais.parcelas) {
                return Number(selectedClient.dadosComerciais.duracaoQtd);
              }
              if (selectedClient.dadosComerciais?.vigenciaQtd) return Number(selectedClient.dadosComerciais.vigenciaQtd);
              if (latestContract?.vigenciaMeses && latestContract.vigenciaMeses !== latestContract.parcelas) {
                return Number(latestContract.vigenciaMeses);
              }
              return Number(dcVigenciaQtd || selectedClient.dadosComerciais?.duracaoQtd || 1);
            })();

            const isRecorrenteResolved = Boolean(
              latestContract?.criarRecorrenciaMensal || 
              selectedClient.dadosComerciais?.criarRecorrenciaMensal || 
              currentProposal?.criarRecorrenciaMensal || 
              dcCriarRecorrencia
            );

            // Período Oficial
            const dtInicioStr = info.dataInicio || latestContract?.dataInicio || selectedClient.dadosComerciais?.dataInicio || currentProposal?.dataInicio || dcDataInicio || '';
            const dtFimStr = (() => {
              if (isRecorrenteResolved) {
                return info.dataFim || selectedClient.dadosComerciais?.vencimento || '';
              }
              if (currentProposal?.dataFim) return currentProposal.dataFim;
              if (dtInicioStr) {
                return calculateContractEndDate(dtInicioStr, rawTipo, qtdVal, undefined, false);
              }
              return latestContract?.dataFim || selectedClient.dadosComerciais?.vencimento || info.dataFim || '';
            })();
            const periodoOficialDisplay = (() => {
              if (!dtInicioStr) return 'Não definido';
              const startFmt = new Date(dtInicioStr + (dtInicioStr.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('pt-BR');
              if (dtFimStr) {
                const endFmt = new Date(dtFimStr + (dtFimStr.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('pt-BR');
                return `${startFmt} até ${endFmt}`;
              }
              const endCalc = calculateContractEndDate(dtInicioStr, rawTipo, qtdVal, undefined, false);
              const endFmt = new Date(endCalc + 'T12:00:00').toLocaleDateString('pt-BR');
              return `${startFmt} até ${endFmt}`;
            })();

            // 1º Vencimento da Parcela Financeira
            const firstVencDate = 
              latestContract?.dataPrimeiroVencimento || 
              latestContract?.dataVencimento || 
              currentProposal?.dataVencimentoEscolhida || 
              currentProposal?.dataVencimento ||
              selectedClient.dadosComerciais?.dataPrimeiroVencimento || 
              dcVencimento || 
              dtInicioStr ||
              '';

            // Condição Financeira
            const numParcelas = Number(
              latestContract?.parcelas || 
              selectedClient.dadosComerciais?.parcelas || 
              currentProposal?.parcelasEscolhidas || 
              currentProposal?.parcelas ||
              dcParcelas || 
              1
            );

            const valorUnitarioBase = Number(
              latestContract?.valorUnitario ||
              selectedClient.dadosComerciais?.valorUnitario || 
              currentProposal?.valorUnitario || 
              selectedPlan?.preco || 
              0
            );

            const valorTotalContrato = Number(
              latestContract?.valorLiquido ||
              latestContract?.valorTotal ||
              selectedClient.dadosComerciais?.valorTotal || 
              selectedClient.dadosComerciais?.valorLiquido ||
              currentProposal?.valorFinalRecalculado || 
              currentProposal?.valorAcordado || 
              (valorUnitarioBase * (qtdVal > 1 ? qtdVal : 1)) ||
              selectedClient.dadosComerciais?.valorUnitario ||
              0
            );

            const valorParcelaIndividual = numParcelas > 0 ? (valorTotalContrato / numParcelas) : valorTotalContrato;

            const descTipo = latestContract?.descontoTipo || selectedClient.dadosComerciais?.descontoTipo || currentProposal?.descontoTipo || dcDescontoTipo || 'percentual';
            const descValor = Number(latestContract?.descontoValor || selectedClient.dadosComerciais?.descontoValor || currentProposal?.descontoValor || dcDescontoValor || 0);
            const hasDesconto = descValor > 0;

            const formaPagamentoFinal = String(
              latestContract?.formaPagamento || 
              selectedClient.dadosComerciais?.formaPagamento || 
              currentProposal?.formaPagamentoEscolhida || 
              currentProposal?.formaPagamento ||
              dcFormaPag || 
              'PIX'
            ).toUpperCase();

            // Frequência Semanal
            const creditosBase = Number(latestContract?.creditosTotal || currentProposal?.creditosMensais || selectedClient.dadosComerciais?.creditosTotal || dcCreditosTotal || 0);
            const freqDeducao = creditosBase > 0 
              ? (creditosBase <= 4 ? 1 : creditosBase <= 9 ? 2 : creditosBase <= 14 ? 3 : creditosBase <= 18 ? 4 : 5) 
              : 0;

            const freqSemanal = Number(
              latestContract?.frequencia || 
              latestContract?.frequenciaSemanal ||
              currentProposal?.frequencia || 
              selectedClient.dadosComerciais?.frequencia || 
              dcFrequencia || 
              selectedPlan?.frequencia || 
              freqDeducao ||
              selectedClient.frequencia || 
              0
            );

            const isProposalMode = Boolean(currentProposal && (!latestContract || (latestContract.status !== 'assinado' && latestContract.clicksignStatus !== 'assinado')));

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                {/* 1.1 ALERTA: CONTRATO CLICKSIGN, ASSINATURA OU RESCISÃO */}
                {latestContract && (
                  (() => {
                    const isContractCancelled = Boolean(
                      latestContract.status === 'cancelado' ||
                      selectedClient.dadosComerciais?.status === 'cancelado_agendado' ||
                      selectedClient.dadosComerciais?.status === 'cancelado'
                    );

                    if (isContractCancelled) {
                      const termDate = latestContract.dataEncerramentoAcesso || selectedClient.dadosComerciais?.dataFim || selectedClient.dadosComerciais?.vencimento;
                      const termDateFmt = termDate ? new Date(termDate + (termDate.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('pt-BR') : 'Hoje';
                      const fineAmt = Number(latestContract.multaAplicada || 0);
                      const acertoAmt = Number(latestContract.saldoAcerto || 0);

                      return (
                        <div style={{
                          background: 'linear-gradient(135deg, rgba(153, 27, 27, 0.4) 0%, rgba(15, 23, 42, 0.95) 100%)',
                          border: '1px solid rgba(239, 68, 68, 0.45)',
                          borderRadius: '16px',
                          padding: '16px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          boxShadow: '0 8px 24px rgba(239, 68, 68, 0.15)',
                          backdropFilter: 'blur(12px)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '10px',
                                background: 'rgba(239, 68, 68, 0.25)',
                                color: '#f87171',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.3rem'
                              }}>
                                <i className="fa-solid fa-ban"></i>
                              </div>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  Contrato Rescindido / Cancelamento Efetuado
                                  <span style={{
                                    fontSize: '0.72rem',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontWeight: 800,
                                    background: 'rgba(239, 68, 68, 0.3)',
                                    color: '#fca5a5',
                                    border: '1px solid rgba(239, 68, 68, 0.6)'
                                  }}>
                                    🚫 RESCISÃO CONFIRMADA
                                  </span>
                                </h4>
                                <span style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '3px', display: 'block' }}>
                                  Plano: <strong style={{ color: '#f8fafc' }}>{latestContract.planoNome}</strong> • Término do Acesso: <strong style={{ color: '#fbbf24' }}>{termDateFmt}</strong> • Multa: <strong style={{ color: fineAmt > 0 ? '#f87171' : '#34d399' }}>{fineAmt > 0 ? `R$ ${fineAmt.toFixed(2).replace('.', ',')}` : 'Isenta (R$ 0,00)'}</strong> {acertoAmt > 0 ? `• Saldo: R$ ${acertoAmt.toFixed(2).replace('.', ',')}` : ''}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{
                                padding: '8px 16px',
                                fontSize: '0.82rem',
                                fontWeight: 800,
                                background: 'rgba(239, 68, 68, 0.25)',
                                borderColor: 'rgba(239, 68, 68, 0.5)',
                                color: '#fca5a5',
                                borderRadius: '8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer'
                              }}
                              onClick={() => handleOpenCancelContractModal(selectedClient, latestContract)}
                            >
                              <i className="fa-solid fa-calculator"></i> Ver Detalhes da Rescisão
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div style={{
                        background: (latestContract.status === 'assinado' || latestContract.clicksignStatus === 'assinado')
                          ? 'linear-gradient(135deg, rgba(6, 95, 70, 0.4) 0%, rgba(15, 23, 42, 0.95) 100%)'
                          : 'linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(15, 23, 42, 0.95) 100%)',
                        border: `1px solid ${(latestContract.status === 'assinado' || latestContract.clicksignStatus === 'assinado') ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                        borderRadius: '16px',
                        padding: '16px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                        backdropFilter: 'blur(12px)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              background: (latestContract.status === 'assinado' || latestContract.clicksignStatus === 'assinado') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                              color: (latestContract.status === 'assinado' || latestContract.clicksignStatus === 'assinado') ? '#34d399' : '#fbbf24',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.25rem'
                            }}>
                              <i className={latestContract.clicksignDocKey ? 'fa-solid fa-file-signature' : 'fa-solid fa-file-contract'}></i>
                            </div>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                {latestContract.clicksignDocKey ? 'Contrato Eletrônico Clicksign' : 'Contrato Emitido'}
                                <span style={{
                                  fontSize: '0.72rem',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontWeight: 800,
                                  background: (latestContract.status === 'assinado' || latestContract.clicksignStatus === 'assinado') ? '#065f46' : 'rgba(245, 158, 11, 0.25)',
                                  color: (latestContract.status === 'assinado' || latestContract.clicksignStatus === 'assinado') ? '#34d399' : '#fbbf24',
                                  border: `1px solid ${(latestContract.status === 'assinado' || latestContract.clicksignStatus === 'assinado') ? '#10b981' : '#f59e0b'}`
                                }}>
                                  {(latestContract.status === 'assinado' || latestContract.clicksignStatus === 'assinado')
                                    ? '✅ ASSINADO DIGITALMENTE'
                                    : '⏳ AGUARDANDO ASSINATURA'}
                                </span>
                              </h4>
                              <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                                Plano: <strong style={{ color: '#cbd5e1' }}>{latestContract.planoNome}</strong> • Emissão: {new Date(latestContract.dataEmissao).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                              </span>
                            </div>
                          </div>

                          {/* Barra de Ações do Clicksign */}
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {latestContract.clicksignUrl && (latestContract.status !== 'assinado' && latestContract.clicksignStatus !== 'assinado') && (
                              <a
                                href={latestContract.clicksignUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary btn-sm"
                                style={{ padding: '7px 14px', fontSize: '0.8rem', fontWeight: 800, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', borderColor: '#4f46e5', color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', borderRadius: '8px' }}
                              >
                                <i className="fa-solid fa-arrow-up-right-from-square"></i> Abrir Clicksign
                              </a>
                            )}

                            {latestContract.clicksignDocKey && (latestContract.status !== 'assinado' && latestContract.clicksignStatus !== 'assinado') && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '7px 12px', fontSize: '0.78rem', color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.4)', background: 'rgba(251, 191, 36, 0.12)', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', borderRadius: '8px' }}
                                onClick={() => handleSyncClicksign(latestContract._id)}
                              >
                                <i className="fa-solid fa-rotate"></i> Sincronizar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* 2. GRID DE AUDITORIA COMERCIAL DIVIDIDA EM 2 PILARES CLAROS (GLASSMORPHISM) */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.7) 100%)',
                  border: isProposalMode ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255, 255, 255, 0.09)',
                  borderRadius: '16px',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.35)',
                  backdropFilter: 'blur(16px)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: isProposalMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: isProposalMode ? '#fbbf24' : '#34d399',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.15rem'
                      }}>
                        <i className={isProposalMode ? "fa-solid fa-file-invoice-dollar" : "fa-solid fa-file-contract"}></i>
                      </div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.2px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'var(--font-title)' }}>
                        {isProposalMode ? 'Condições da Proposta Comercial Enviada' : 'Auditoria & Condições Comerciais do Contrato'}
                        {isProposalMode && (
                          <span style={{ fontSize: '0.7rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.35)', padding: '3px 9px', borderRadius: '6px', fontWeight: 700 }}>
                            Aguardando Aceite / Assinatura
                          </span>
                        )}
                      </h4>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '7px 16px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => handleOpenEditContractModal(selectedClient)}
                      title="Editar vigência, parcelas ou condições financeiras"
                    >
                      <i className="fa-solid fa-pen-to-square"></i>
                      Editar Condições
                    </button>
                  </div>

                  {/* Os 2 Pilares Lado a Lado */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
                    
                    {/* Pilar 1: Vigência & Acesso ao Clube */}
                    <div style={{
                      background: isProposalMode 
                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.06) 0%, rgba(15, 23, 42, 0.6) 100%)' 
                        : 'linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(15, 23, 42, 0.6) 100%)',
                      border: isProposalMode ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '14px',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ fontSize: '0.86rem', fontWeight: 800, color: isProposalMode ? '#fbbf24' : '#34d399', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: isProposalMode ? '1px solid rgba(245, 158, 11, 0.15)' : '1px solid rgba(16, 185, 129, 0.15)', paddingBottom: '8px' }}>
                        <i className="fa-solid fa-calendar-days"></i> {isProposalMode ? '1. Vigência & Franquia Proposta' : '1. Vigência & Acesso ao Clube'}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                            {isProposalMode ? 'Plano Proposto' : 'Plano Contratado'}
                          </span>
                          <strong style={{ fontSize: '1rem', color: '#ffffff', marginTop: '2px', display: 'block', fontWeight: 800 }}>
                            {planNameResolved}
                          </strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Tipo / Duração</span>
                          <strong style={{ fontSize: '0.96rem', color: isProposalMode ? '#fbbf24' : '#34d399', marginTop: '2px', display: 'block', fontWeight: 800 }}>
                            {tipoLabel} • {qtdVal} {tipoLabel === 'Semana' ? 'semana(s)' : tipoLabel === 'Anual' ? 'ano' : 'meses'}
                          </strong>
                        </div>
                      </div>

                      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '12px', marginTop: '2px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                          {isProposalMode ? 'Previsão de Vigência' : 'Período Oficial de Acesso'}
                        </span>
                        {isProposalMode ? (
                          <div style={{ marginTop: '4px' }}>
                            <strong style={{ fontSize: '0.9rem', color: '#f8fafc', display: 'block', fontWeight: 700 }}>
                              📅 {qtdVal} {tipoLabel === 'Semana' ? 'semana(s)' : tipoLabel === 'Anual' ? 'ano' : 'meses'} a partir da ativação / aceite
                            </strong>
                            {currentProposal?.dataInicio && (
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                                Previsão informada: {new Date(currentProposal.dataInicio + (currentProposal.dataInicio.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <strong style={{ fontSize: '0.92rem', color: '#f8fafc', marginTop: '4px', display: 'block', fontWeight: 700 }}>
                            📅 {periodoOficialDisplay}
                          </strong>
                        )}
                        <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fa-solid fa-dumbbell" style={{ color: '#34d399' }}></i>
                          <span>Franquia: <strong>{currentProposal?.creditosMensais ? `${currentProposal.creditosMensais} treinos/mês ` : ''}{freqSemanal > 0 ? `(${freqSemanal}x por semana)` : 'Conforme Plano'}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Pilar 2: Condições Financeiras & Faturamento */}
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.06) 0%, rgba(15, 23, 42, 0.6) 100%)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      borderRadius: '14px',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(56, 189, 248, 0.15)', paddingBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <i className="fa-solid fa-credit-card"></i> {isProposalMode ? '2. Condições Comerciais da Proposta' : '2. Condições de Pagamento'}
                        </div>
                        <span style={{ fontSize: '0.7rem', background: isProposalMode ? 'rgba(245, 158, 11, 0.18)' : 'rgba(56, 189, 248, 0.18)', color: isProposalMode ? '#fbbf24' : '#38bdf8', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, textTransform: 'uppercase' }}>
                          {isProposalMode ? 'Link de Venda Aberto' : formaPagamentoFinal}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                            {isProposalMode ? 'Valor Total da Proposta' : 'Valor Total do Contrato'}
                          </span>
                          <strong style={{
                            fontSize: '1.25rem',
                            marginTop: '2px',
                            display: 'block',
                            fontWeight: 900,
                            fontFamily: 'var(--font-title)',
                            background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}>
                            R$ {valorTotalContrato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>1º Vencimento da Parcela</span>
                          {isProposalMode ? (
                            currentProposal?.dataVencimentoEscolhida ? (
                              <strong style={{ fontSize: '0.96rem', color: '#34d399', marginTop: '3px', display: 'block', fontWeight: 800 }}>
                                📅 {new Date(currentProposal.dataVencimentoEscolhida + (currentProposal.dataVencimentoEscolhida.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('pt-BR')}
                              </strong>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 700, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <i className="fa-solid fa-hourglass-half"></i> Aguardando escolha no link
                              </span>
                            )
                          ) : (
                            <strong style={{ fontSize: '0.96rem', color: '#f8fafc', marginTop: '3px', display: 'block', fontWeight: 800 }}>
                              {firstVencDate ? new Date(firstVencDate + (firstVencDate.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('pt-BR') : 'Data de Início'}
                            </strong>
                          )}
                        </div>
                      </div>

                      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '12px', marginTop: '2px', fontSize: '0.8rem', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.04)' }}>
                        {isProposalMode ? (
                          <div>
                            <strong style={{ color: '#cbd5e1' }}>Opções no link:</strong> PIX (à vista) ou Boleto / Cartão de Crédito {isAnual ? 'em até 12x' : qtdVal > 1 ? `em até ${qtdVal}x` : ''}
                            {currentProposal?.formaPagamentoEscolhida && (
                              <div style={{ marginTop: '4px', color: '#34d399', fontWeight: 600 }}>
                                <i className="fa-solid fa-check" style={{ marginRight: '4px' }}></i>
                                Seleção do aluno: {currentProposal.parcelasEscolhidas}x no {currentProposal.formaPagamentoEscolhida.toUpperCase()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <strong style={{ color: '#cbd5e1' }}>Condição:</strong> {numParcelas}x de R$ {valorParcelaIndividual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        )}
                        {hasDesconto && (
                          <div style={{ color: '#34d399', fontWeight: 600, marginTop: '4px' }}>
                            <i className="fa-solid fa-tag" style={{ marginRight: '4px' }}></i>
                            Desconto: {descTipo === 'percentual' ? `${descValor}% OFF` : `R$ ${descValor.toFixed(2)} OFF`}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* 3. HISTÓRICO DE CONTRATOS & CICLOS EMITIDOS (TIMELINE UNIFICADA) */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.7) 0%, rgba(30, 41, 59, 0.5) 100%)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  backdropFilter: 'blur(12px)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <i className="fa-solid fa-clock-rotate-left" style={{ color: '#38bdf8', fontSize: '1.1rem' }}></i>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-title)' }}>
                        Histórico de Contratos Emitidos
                      </h4>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
                      {contracts.length} contrato(s) registrado(s)
                    </span>
                  </div>

                  {loadingContracts ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Carregando contratos...
                    </div>
                  ) : contracts.length === 0 ? (
                    <div style={{
                      padding: '24px',
                      textAlign: 'center',
                      background: 'rgba(0,0,0,0.15)',
                      borderRadius: '12px',
                      border: '1px dashed rgba(255,255,255,0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <i className="fa-solid fa-file-circle-xmark" style={{ fontSize: '1.8rem', color: '#475569' }}></i>
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                        Nenhum contrato formalizado anteriormente para este aluno.
                      </span>
                    </div>
                  ) : (
                    <div className="table-responsive" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                      <table className="data-table" style={{ fontSize: '0.82rem', width: '100%' }}>
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
                                <td style={{ fontWeight: 700, color: '#fff' }}>{c.planoNome}</td>
                                <td>{cType}</td>
                                <td>
                                  <span style={{ color: statusColor, fontWeight: 800 }}>
                                    {st === 'assinado' ? '✅ Assinado' : st === 'cancelado' ? '❌ Cancelado' : '⏳ Pendente'}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      title="Baixar PDF do Contrato"
                                      onClick={() => {
                                        const plan = plans.find(p => p._id === (c.planoId?._id || c.planoId));
                                        if (plan) downloadContractPDF(selectedClient, plan, c.contratoTexto, c);
                                      }}
                                    >
                                      <i className="fa-solid fa-file-pdf"></i> PDF
                                    </button>

                                    {st !== 'assinado' && st !== 'cancelado' && (
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        style={{
                                          padding: '4px 8px',
                                          fontSize: '0.75rem',
                                          borderRadius: '6px',
                                          color: '#f87171',
                                          borderColor: 'rgba(239, 68, 68, 0.35)',
                                          background: 'rgba(239, 68, 68, 0.1)',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}
                                        title="Descartar / Excluir Contrato Pendente"
                                        onClick={() => handleDeleteContract(c._id, c.planoNome)}
                                      >
                                        <i className="fa-solid fa-trash-can"></i> Descartar
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
            );
          })()}
        </form>
      </div>

        {/* Right Column: Central de Ações Comerciais e Documentos (Sticky & Sofisticada) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Painel 1: Ações Comerciais Primárias */}
          <div className="content-panel" style={{
            padding: '22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.35)',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(16px)'
          }}>
            <h3 style={{ margin: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px', fontSize: '1rem', fontWeight: 800, color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-title)' }}>
              <span><i className="fa-solid fa-bolt" style={{ marginRight: '8px' }}></i> Ações Comerciais & Vendas</span>
              <span style={{ fontSize: '0.7rem', background: 'rgba(139, 92, 246, 0.2)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>Oficial</span>
            </h3>

            {/* Ação 1: Enviar Link de Venda Online */}
            <button
              type="button"
              className="btn btn-primary"
              disabled={generatingProposal || issuingContract}
              style={{
                width: '100%',
                minHeight: '52px',
                padding: '14px 18px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                borderColor: '#7c3aed',
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.96rem',
                display: 'flex',
                gap: '10px',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 6px 20px rgba(139, 92, 246, 0.4)',
                cursor: 'pointer',
                borderRadius: '10px',
                letterSpacing: '0.2px',
                transition: 'all 0.2s ease'
              }}
              onClick={() => handleOpenSalesWizard(selectedClient)}
            >
              <i className="fa-solid fa-bolt fa-lg"></i> Gerar Link de Venda Online (WhatsApp)
            </button>

            {/* Ação 2: Fechar Venda Manual / Balcão Presencial */}
            {(userCargo === 'Administrador' || userCargo === 'admin' || userCargo?.toLowerCase().includes('admin')) && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={generatingProposal || issuingContract}
                style={{
                  width: '100%',
                  minHeight: '44px',
                  padding: '10px 14px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)',
                  borderColor: 'rgba(16, 185, 129, 0.4)',
                  color: '#34d399',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.12)',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => handleOpenManualSale(selectedClient)}
              >
                <i className="fa-solid fa-file-pen"></i> Cadastrar Venda Manual (Admin)
              </button>
            )}
          </div>

          {/* Painel 2: Documentos & Suporte Operacional */}
          <div className="content-panel" style={{
            padding: '22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(16px)'
          }}>
            <h3 style={{ margin: 0, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px', fontSize: '1rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-title)' }}>
              <span><i className="fa-solid fa-file-lines" style={{ marginRight: '8px' }}></i> Documentos & Operações</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: '42px', padding: '8px 12px', background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.35)', color: '#10b981', fontWeight: 700, fontSize: '0.82rem', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', borderRadius: '8px' }}
                onClick={() => setShowTextPreview(true)}
              >
                <i className="fa-solid fa-book-open"></i> Ver Minuta
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: '42px', padding: '8px 12px', background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.35)', color: '#3b82f6', fontWeight: 700, fontSize: '0.82rem', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', borderRadius: '8px' }}
                onClick={() => {
                  const plan = plans.find(p => p._id === dcPlano);
                  if (!plan) {
                    alert('Selecione um plano comercial para gerar o PDF.');
                    return;
                  }
                  downloadContractPDF(selectedClient, plan, generateContractText(), { _id: 'draft' });
                }}
              >
                <i className="fa-solid fa-file-pdf"></i> Baixar PDF
              </button>
            </div>

            {/* Lançamento Manual no Financeiro (Para pagamentos presenciais/balcão fora do Asaas) */}
            <button
              type="button"
              className="btn btn-secondary"
              disabled={generatingPayments}
              onClick={handleGeneratePaymentsExplicitly}
              style={{
                width: '100%',
                minHeight: '40px',
                color: '#34d399',
                borderColor: 'rgba(16, 185, 129, 0.35)',
                background: 'rgba(16, 185, 129, 0.08)',
                fontWeight: 700,
                fontSize: '0.82rem',
                display: 'flex',
                gap: '8px',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
              title="Lança as parcelas diretamente no Controle Financeiro (Dinheiro, Maquininha Balcão ou Transferência)"
            >
              <i className="fa-solid fa-file-invoice-dollar"></i> Lançar Parcelas no Financeiro (Manual)
            </button>

            {/* Rescisão & Cancelamento de Contrato com Calculadora */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleOpenCancelContractModal(selectedClient)}
              style={{
                width: '100%',
                minHeight: '40px',
                color: '#f87171',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.08)',
                fontWeight: 700,
                fontSize: '0.82rem',
                display: 'flex',
                gap: '8px',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
              title="Abrir Calculadora de Rescisão e Cancelamento de Contrato"
            >
              <i className="fa-solid fa-ban"></i> Rescindir / Cancelar Contrato
            </button>
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
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '12px' }}>
              Copie o link abaixo e envie para o aluno via WhatsApp ou E-mail. Ele poderá preencher os próprios dados cadastrais (CPF, CEP, etc.) e escolher a forma de pagamento/parcelas com base nas regras comerciais configuradas.
            </p>

            {activeProposal && (
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>
                    <i className="fa-solid fa-hourglass-half" style={{ marginRight: '5px' }}></i>
                    Validade do Link: <strong>3 dias</strong>
                  </span>
                  {activeProposal.abertoEm ? (
                    <span style={{ color: '#38bdf8', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <i className="fa-solid fa-eye"></i> Última abertura: {new Date(activeProposal.abertoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} às {new Date(activeProposal.abertoEm).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}
                      {activeProposal.visualizacoesCount && activeProposal.visualizacoesCount > 1 ? ` (${activeProposal.visualizacoesCount}x)` : ''}
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <i className="fa-regular fa-eye-slash"></i> Ainda não visualizado
                    </span>
                  )}
                </div>
              </div>
            )}

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
                                : (info.isRecorrente && info.recorrenciaMeses && info.recorrenciaMeses > 1) 
                                  ? `Recorrência (${info.recorrenciaMeses} meses)` 
                                  : `${com.duracao === 'semana' ? 'Semanal' : (com.duracao === 'anual' ? 'Anual' : 'Mensal')} (${com.duracaoQtd || com.vigenciaQtd || 1} ${com.duracao === 'semana' ? 'semanas' : (com.duracao === 'anual' ? 'ano(s)' : 'mês(es)')})`}
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
        const gross = swDuracao === 'anual' ? swValorUnitario : (swValorUnitario * (swVigenciaQtd || 1));
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
                          setSwVigenciaQtd(1);
                          setSwCreditosMassagem(1);
                          setSwCreditosEmergencia(1);
                        } else {
                          setSwDuracao('mensal');
                          setSwVigenciaQtd(1);
                          setSwCreditosMassagem(0);
                          setSwCreditosEmergencia(0);
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

                {/* Aviso automático de Menor de Idade / Responsável Legal baseado na Data de Nascimento */}
                {(() => {
                  const clientBirthDate = salesWizardClient?.dadosPessoais?.dataNascimento || salesWizardClient?.dadosPessoais?.nascimento;
                  const minorInfo = calculateAgeAndMinorStatus(clientBirthDate);
                  if (!minorInfo.isMinor) return null;
                  return (
                    <div 
                      style={{ 
                        background: 'rgba(245, 158, 11, 0.12)', 
                        border: '1px solid rgba(245, 158, 11, 0.4)', 
                        borderRadius: '10px', 
                        padding: '12px 14px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px'
                      }}
                    >
                      <i className="fa-solid fa-child" style={{ color: '#f59e0b', fontSize: '1.2rem' }}></i>
                      <div style={{ fontSize: '0.84rem', color: '#f8fafc' }}>
                        <strong style={{ color: '#f59e0b', display: 'block' }}>
                          Aluno Menor de Idade {minorInfo.age !== null ? `(${minorInfo.age} anos)` : ''}
                        </strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          Identificado automaticamente pela data de nascimento. O link de vendas solicitará o preenchimento e assinatura do Responsável Legal.
                        </span>
                      </div>
                    </div>
                  );
                })()}

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
                          setSwVigenciaQtd(1);
                          setSwCreditosMassagem(1);
                          setSwCreditosEmergencia(1);
                        } else {
                          setSwVigenciaQtd(1);
                          setSwCreditosMassagem(0);
                          setSwCreditosEmergencia(0);
                        }
                      }}
                    >
                      <option value="anual">Anual (12 meses)</option>
                      <option value="mensal">Mensal</option>
                      <option value="semana">Semanal</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      {swDuracao === 'anual' ? 'Qtd (Anos)' : (swDuracao === 'semana' ? 'Qtd (Semanas)' : 'Qtd (Meses)')}
                    </label>
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

                {/* Alternância da Calculadora Bidirecional */}
                <div style={{ marginTop: '4px', marginBottom: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setSwShowCalculator(!swShowCalculator)}
                    style={{
                      background: 'rgba(139, 92, 246, 0.1)',
                      border: '1px dashed #8b5cf6',
                      color: '#a78bfa',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: '6px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      width: '100%',
                      justifyContent: 'center'
                    }}
                  >
                    <i className={`fa-solid ${swShowCalculator ? 'fa-chevron-up' : 'fa-calculator'}`}></i>
                    {swShowCalculator ? 'Fechar Calculadora de Parcelas' : '💡 Calculadora Comercial: Definir Anuidade a partir de Parcela Desejada'}
                  </button>

                  {swShowCalculator && (
                    <div style={{ background: 'rgba(139, 92, 246, 0.06)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '10px', padding: '12px', marginTop: '8px' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#c4b5fd', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fa-solid fa-wand-magic-sparkles"></i> Simulação Reversa (Definir Parcela $\rightarrow$ Valor Total)
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr auto', gap: '8px', alignItems: 'flex-end' }}>
                        <div>
                          <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Qtd Parcelas</label>
                          <select
                            className="select-custom"
                            style={{ padding: '7px 8px', fontSize: '0.82rem', width: '100%' }}
                            value={swDesiredInstallmentCount}
                            onChange={e => setSwDesiredInstallmentCount(parseInt(e.target.value, 10) || 10)}
                          >
                            <option value={1}>1x (À vista)</option>
                            <option value={2}>2x</option>
                            <option value={3}>3x</option>
                            <option value={4}>4x</option>
                            <option value={5}>5x</option>
                            <option value={6}>6x</option>
                            <option value={10}>10x (Padrão Boleto)</option>
                            <option value={12}>12x (Padrão Cartão)</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>Valor da Parcela Desejada</label>
                          <MoneyInput
                            style={{ padding: '7px 8px', fontSize: '0.82rem' }}
                            value={swDesiredInstallment}
                            onChange={setSwDesiredInstallment}
                            placeholder="R$ 125,00"
                          />
                        </div>
                        <div>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            disabled={!swDesiredInstallment || swDesiredInstallment <= 0}
                            onClick={() => {
                              const calcTotal = Number((swDesiredInstallment * swDesiredInstallmentCount).toFixed(2));
                              setSwValorUnitario(calcTotal);
                              setSwDescontoValor(0);
                            }}
                            style={{ padding: '8px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                          >
                            Aplicar Total R$ {(swDesiredInstallment * swDesiredInstallmentCount).toFixed(2).replace('.', ',')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Resumo Executivo das 4 Dimensões em Tempo Real */}
                <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-layer-group"></i> Resumo Executivo da Proposta
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Vigência: <strong>{swDuracao === 'anual' ? '12 meses' : `${swVigenciaQtd} ${swDuracao === 'semana' ? 'semanas' : 'meses'}`}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Valor Total Líquido</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                        R$ {netVal.toFixed(2).replace('.', ',')}
                      </div>
                      {discountVal > 0 && (
                        <div style={{ fontSize: '0.68rem', color: '#ef4444', marginTop: '1px' }}>
                          (- R$ {discountVal.toFixed(2).replace('.', ',')})
                        </div>
                      )}
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Boleto / Pix (Até 10x)</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8' }}>
                        10x de R$ {(netVal / 10).toFixed(2).replace('.', ',')}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#fde047', marginTop: '1px' }}>
                        (Equiv. R$ {(netVal / 12).toFixed(2).replace('.', ',')}/mês)
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Franquia Mensal</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#4ade80' }}>
                        {swCreditosMensais} treinos/mês
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '1px' }}>
                        {swCreditosMassagem > 0 ? `${swCreditosMassagem} massag.` : '0 massag.'} • {swCreditosEmergencia > 0 ? `${swCreditosEmergencia} emerg.` : '0 emerg.'}
                      </div>
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
          MODAL EXECUTIVO: CADASTRO DE VENDA MANUAL / BALCÃO (ADMIN)
          ========================================================================= */}
      {manualSaleClient && (() => {
        const activePlans = plans.filter((p: any) => p.ativo !== false);
        const grossPrice = Number(msValorUnitario) * Number(msVigenciaQtd || 1);
        let discountDeduction = 0;
        if (msDescontoTipo === 'percentual') {
          discountDeduction = (grossPrice * (Number(msDescontoValor) || 0)) / 100;
        } else {
          discountDeduction = Number(msDescontoValor) || 0;
        }
        const calculatedValorLiquido = Math.max(0, grossPrice - discountDeduction);

        const numParcelas = Number(msParcelas) || 1;
        const cardRate = msFormaPagamento === 'cartao' ? getCardRateForInstallment(numParcelas) : 0;
        const finalPrice = msFormaPagamento === 'cartao' ? Number((calculatedValorLiquido * (1 + cardRate)).toFixed(2)) : calculatedValorLiquido;
        const valorParcela = Number((finalPrice / numParcelas).toFixed(2));

        const birthDateStr = msDataNascimento || manualSaleClient?.dadosPessoais?.dataNascimento || manualSaleClient?.dadosPessoais?.nascimento;
        const isMinorDetected = isMinorFromBirthDate(birthDateStr);

        return (
          <div className="modal-overlay" onClick={() => { if (!msSubmitting) setManualSaleClient(null); }} style={{ zIndex: 10000 }}>
            <div
              className="modal-content"
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '860px', width: '95%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', border: '1px solid rgba(16, 185, 129, 0.4)', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}
            >
              {/* Header */}
              <div
                className="modal-header"
                style={{
                  padding: '18px 24px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)',
                  borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-file-pen"></i> Cadastrar Venda Manual (Balcão / Admin)
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span>Aluno: <strong style={{ color: '#fff' }}>{msNome || manualSaleClient.dadosPessoais?.nome || 'Aluno'}</strong></span>
                    {isMinorDetected && (
                      <span style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#fde047', border: '1px solid rgba(234, 179, 8, 0.4)', borderRadius: '4px', padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700 }}>
                        <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '4px' }}></i>
                        Menor de Idade (Requer Responsável Legal)
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="close-btn"
                  onClick={() => { if (!msSubmitting) setManualSaleClient(null); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer' }}
                >
                  &times;
                </button>
              </div>

              {/* Body */}
              <div className="modal-body" style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
                
                {/* ETAPA 1: DADOS COMERCIAIS */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 14px 0', fontSize: '0.92rem', fontWeight: 800, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-tag"></i> 1. Condições Comerciais do Plano
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Plano / Modalidade *</label>
                      <select
                        className="select-custom"
                        style={{ width: '100%', padding: '9px 10px' }}
                        value={msPlano}
                        onChange={e => {
                          const pId = e.target.value;
                          setMsPlano(pId);
                          const p = plans.find(x => x._id === pId);
                          if (p) {
                            setMsValorUnitario(p.preco || 0);
                            const isAn = p.tipo === 'Anual';
                            setMsDuracao(isAn ? 'anual' : 'mensal');
                            setMsVigenciaQtd(1);
                            const f = p.frequencia || 3;
                            setMsFrequencia(f);
                            setMsCreditosMensais(f === 1 ? 4 : f === 2 ? 9 : f === 3 ? 13 : f === 4 ? 17 : f === 5 ? 22 : 13);
                            setMsCreditosMassagem(isAn ? 1 : 0);
                            setMsCreditosEmergencia(isAn ? 1 : 0);
                          }
                        }}
                      >
                        <option value="">Selecione o plano...</option>
                        {activePlans.map(p => (
                          <option key={p._id} value={p._id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Tipo de Vigência</label>
                      <select
                        className="select-custom"
                        style={{ width: '100%', padding: '9px 10px' }}
                        value={msDuracao}
                        onChange={e => {
                          const val = e.target.value as any;
                          setMsDuracao(val);
                          setMsVigenciaQtd(1);
                          if (val === 'anual') {
                            setMsCreditosMassagem(1);
                            setMsCreditosEmergencia(1);
                          }
                        }}
                      >
                        <option value="anual">Anual (1 Ano)</option>
                        <option value="semestral">Semestral (6 Meses)</option>
                        <option value="mensal">Mensal (1 Mês)</option>
                        <option value="semana">Semanal (1 Semana)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Qtd. de Vigência ({msDuracao === 'anual' ? 'Anos' : msDuracao === 'semestral' ? 'Semestres' : msDuracao === 'semana' ? 'Semanas' : 'Meses'})
                      </label>
                      <input
                        type="number"
                        min={1}
                        className="form-control"
                        style={{ padding: '9px 10px' }}
                        value={msVigenciaQtd}
                        onChange={e => setMsVigenciaQtd(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Data de Início do Acesso</label>
                      <input
                        type="date"
                        className="form-control"
                        style={{ padding: '9px 10px' }}
                        value={msDataInicio}
                        onChange={e => setMsDataInicio(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Frequência, Créditos e Valores */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Frequência Semanal</label>
                      <select
                        className="select-custom"
                        style={{ width: '100%', padding: '9px 10px' }}
                        value={msFrequencia}
                        onChange={e => {
                          const freq = Number(e.target.value);
                          setMsFrequencia(freq);
                          if (freq === 1) setMsCreditosMensais(4);
                          else if (freq === 2) setMsCreditosMensais(9);
                          else if (freq === 3) setMsCreditosMensais(13);
                          else if (freq === 4) setMsCreditosMensais(17);
                          else if (freq === 5) setMsCreditosMensais(22);
                        }}
                      >
                        <option value={1}>1x por semana (4 aulas)</option>
                        <option value={2}>2x por semana (9 aulas)</option>
                        <option value={3}>3x por semana (13 aulas)</option>
                        <option value={4}>4x por semana (17 aulas)</option>
                        <option value={5}>5x por semana (22 aulas)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Créditos Mensais</label>
                      <input
                        type="number"
                        min={0}
                        className="form-control"
                        style={{ padding: '9px 10px' }}
                        value={msCreditosMensais}
                        onChange={e => setMsCreditosMensais(parseInt(e.target.value, 10) || 0)}
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Créditos Massagem</label>
                      <input
                        type="number"
                        min={0}
                        className="form-control"
                        style={{ padding: '9px 10px' }}
                        value={msCreditosMassagem}
                        onChange={e => setMsCreditosMassagem(parseInt(e.target.value, 10) || 0)}
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Créditos Emergência</label>
                      <input
                        type="number"
                        min={0}
                        className="form-control"
                        style={{ padding: '9px 10px' }}
                        value={msCreditosEmergencia}
                        onChange={e => setMsCreditosEmergencia(parseInt(e.target.value, 10) || 0)}
                      />
                    </div>
                  </div>

                  {/* Valores e Desconto */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Valor do Plano / Período (R$) *</label>
                      <MoneyInput
                        style={{ padding: '9px 10px', fontWeight: 750, color: 'var(--color-primary)' }}
                        value={msValorUnitario}
                        onChange={setMsValorUnitario}
                        placeholder="R$ 0,00"
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Desconto</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <select
                          className="select-custom"
                          style={{ width: '90px', padding: '9px 6px' }}
                          value={msDescontoTipo}
                          onChange={e => setMsDescontoTipo(e.target.value as any)}
                        >
                          <option value="percentual">%</option>
                          <option value="fixo">R$</option>
                        </select>
                        {msDescontoTipo === 'percentual' ? (
                          <input
                            type="number"
                            step="0.01"
                            className="form-control"
                            placeholder="0%"
                            style={{ padding: '9px 8px' }}
                            value={msDescontoValor || ''}
                            onFocus={selectOnFocus}
                            onChange={e => setMsDescontoValor(parseFloat(e.target.value) || 0)}
                          />
                        ) : (
                          <MoneyInput
                            style={{ padding: '9px 8px' }}
                            value={msDescontoValor}
                            onChange={setMsDescontoValor}
                            placeholder="R$ 0,00"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Resumo Líquido Base */}
                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      Bruto: <strong>R$ {grossPrice.toFixed(2).replace('.', ',')}</strong>
                      {discountDeduction > 0 && <span style={{ color: '#ef4444', marginLeft: '10px' }}>Desconto: - R$ {discountDeduction.toFixed(2).replace('.', ',')}</span>}
                    </span>
                    <span style={{ fontWeight: 800, color: '#34d399', fontSize: '1rem' }}>
                      Valor Líquido Base: R$ {calculatedValorLiquido.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>

                {/* ETAPA 2: DADOS PESSOAIS & ENDEREÇO */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 14px 0', fontSize: '0.92rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-user-check"></i> 2. Dados Cadastrais & Endereço do Contratante
                  </h4>

                  {/* Dados do Aluno */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Nome Completo do Aluno *</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ padding: '9px 10px' }}
                        value={msNome}
                        onChange={e => setMsNome(e.target.value)}
                        placeholder="Nome completo"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>CPF do Aluno *</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ padding: '9px 10px' }}
                        value={msCpf}
                        onChange={e => setMsCpf(e.target.value)}
                        placeholder="000.000.000-00"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>WhatsApp / Celular *</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ padding: '9px 10px' }}
                        value={msTelefone}
                        onChange={e => setMsTelefone(e.target.value)}
                        placeholder="(31) 99999-9999"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>E-mail *</label>
                      <input
                        type="email"
                        className="form-control"
                        style={{ padding: '9px 10px' }}
                        value={msEmail}
                        onChange={e => setMsEmail(e.target.value)}
                        placeholder="aluno@email.com"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Data de Nascimento</label>
                      <input
                        type="date"
                        className="form-control"
                        style={{ padding: '9px 10px' }}
                        value={msDataNascimento}
                        onChange={e => setMsDataNascimento(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Campos do Responsável Legal se Menor */}
                  {isMinorDetected && (
                    <div style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fde047', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fa-solid fa-user-shield"></i> Dados do Responsável Legal (Contratante e Signatário Clicksign)
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                        <div className="form-group">
                          <label style={{ fontSize: '0.78rem', color: '#fde047', marginBottom: '3px' }}>Nome do Responsável *</label>
                          <input
                            type="text"
                            className="form-control"
                            style={{ padding: '8px 10px' }}
                            value={msRespNome}
                            onChange={e => setMsRespNome(e.target.value)}
                            placeholder="Nome do pai/mãe/tutor"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: '0.78rem', color: '#fde047', marginBottom: '3px' }}>CPF do Responsável *</label>
                          <input
                            type="text"
                            className="form-control"
                            style={{ padding: '8px 10px' }}
                            value={msRespCpf}
                            onChange={e => setMsRespCpf(e.target.value)}
                            placeholder="000.000.000-00"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: '0.78rem', color: '#fde047', marginBottom: '3px' }}>WhatsApp do Responsável *</label>
                          <input
                            type="text"
                            className="form-control"
                            style={{ padding: '8px 10px' }}
                            value={msRespTelefone}
                            onChange={e => setMsRespTelefone(e.target.value)}
                            placeholder="(31) 99999-9999"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label style={{ fontSize: '0.78rem', color: '#fde047', marginBottom: '3px' }}>E-mail do Responsável *</label>
                          <input
                            type="email"
                            className="form-control"
                            style={{ padding: '8px 10px' }}
                            value={msRespEmail}
                            onChange={e => setMsRespEmail(e.target.value)}
                            placeholder="responsavel@email.com"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Endereço Residencial */}
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1.5fr 90px 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>
                        CEP {msBuscandoCep && <i className="fa-solid fa-spinner fa-spin" style={{ color: 'var(--color-primary)' }}></i>}
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ padding: '8px 10px' }}
                        value={msCep}
                        onBlur={handleMsCepBlur}
                        onChange={e => setMsCep(e.target.value)}
                        placeholder="00000-000"
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>Rua / Logradouro *</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ padding: '8px 10px' }}
                        value={msEndereco}
                        onChange={e => setMsEndereco(e.target.value)}
                        placeholder="Av. Principal"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>Número *</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ padding: '8px 10px' }}
                        value={msNumero}
                        onChange={e => setMsNumero(e.target.value)}
                        placeholder="123"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>Complemento</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ padding: '8px 10px' }}
                        value={msComplemento}
                        onChange={e => setMsComplemento(e.target.value)}
                        placeholder="Apto 101"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '10px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>Bairro *</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ padding: '8px 10px' }}
                        value={msBairro}
                        onChange={e => setMsBairro(e.target.value)}
                        placeholder="Bairro"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>Cidade *</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ padding: '8px 10px' }}
                        value={msCidade}
                        onChange={e => setMsCidade(e.target.value)}
                        placeholder="Cidade"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '3px' }}>UF *</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ padding: '8px 10px' }}
                        value={msEstado}
                        onChange={e => setMsEstado(e.target.value.toUpperCase())}
                        placeholder="MG"
                        maxLength={2}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* ETAPA 3: CONDIÇÕES DE PAGAMENTO (ADMIN) */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 14px 0', fontSize: '0.92rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-credit-card"></i> 3. Condições de Pagamento (Poder Total Administrador)
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                    {/* Botão Boleto / Pix */}
                    <div
                      onClick={() => { setMsFormaPagamento('boleto'); setMsParcelas(1); }}
                      style={{
                        background: msFormaPagamento === 'boleto' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)',
                        border: `2px solid ${msFormaPagamento === 'boleto' ? 'var(--color-primary)' : 'var(--border-color)'}`,
                        borderRadius: '10px',
                        padding: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <i className="fa-solid fa-barcode fa-2x" style={{ color: msFormaPagamento === 'boleto' ? 'var(--color-primary)' : 'var(--text-muted)' }}></i>
                      <div>
                        <strong style={{ color: '#fff', fontSize: '0.95rem', display: 'block' }}>Boleto / Pix</strong>
                        <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Liberado de 1x até 10x sem juros</small>
                      </div>
                    </div>

                    {/* Botão Cartão de Crédito */}
                    <div
                      onClick={() => { setMsFormaPagamento('cartao'); setMsParcelas(1); }}
                      style={{
                        background: msFormaPagamento === 'cartao' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                        border: `2px solid ${msFormaPagamento === 'cartao' ? '#3b82f6' : 'var(--border-color)'}`,
                        borderRadius: '10px',
                        padding: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <i className="fa-solid fa-credit-card fa-2x" style={{ color: msFormaPagamento === 'cartao' ? '#60a5fa' : 'var(--text-muted)' }}></i>
                      <div>
                        <strong style={{ color: '#fff', fontSize: '0.95rem', display: 'block' }}>Cartão de Crédito</strong>
                        <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Liberado de 1x até 12x</small>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Número de Parcelas ({msFormaPagamento === 'cartao' ? 'Até 12x' : 'Até 10x'})
                      </label>
                      <select
                        className="select-custom"
                        style={{ width: '100%', padding: '9px 10px' }}
                        value={msParcelas}
                        onChange={e => setMsParcelas(Number(e.target.value))}
                      >
                        {Array.from({ length: msFormaPagamento === 'cartao' ? 12 : 10 }, (_, i) => i + 1).map(num => {
                          const rate = msFormaPagamento === 'cartao' ? getCardRateForInstallment(num) : 0;
                          const total = msFormaPagamento === 'cartao' ? Number((calculatedValorLiquido * (1 + rate)).toFixed(2)) : calculatedValorLiquido;
                          const instVal = Number((total / num).toFixed(2));
                          return (
                            <option key={num} value={num}>
                              {num}x de R$ {instVal.toFixed(2).replace('.', ',')} (Total: R$ {total.toFixed(2).replace('.', ',')})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Data do 1º Vencimento</label>
                      <input
                        type="date"
                        className="form-control"
                        style={{ padding: '9px 10px' }}
                        value={msDataPrimeiroVencimento}
                        onChange={e => setMsDataPrimeiroVencimento(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Resumo Final da Venda */}
                  <div style={{ marginTop: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Forma Selecionada:</div>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                        {msFormaPagamento === 'boleto' ? 'Boleto / Pix' : 'Cartão de Crédito'}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: msFormaPagamento === 'boleto' ? 'var(--color-primary)' : '#60a5fa' }}>
                        {numParcelas}x de R$ {valorParcela.toFixed(2).replace('.', ',')}
                      </div>
                      <small style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                        Valor Total Contratado: <strong style={{ color: '#fff' }}>R$ {finalPrice.toFixed(2).replace('.', ',')}</strong>
                      </small>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer / Botões de Ação */}
              <div
                className="modal-footer"
                style={{
                  padding: '16px 24px',
                  background: 'var(--bg-darker)',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { if (!msSubmitting) setManualSaleClient(null); }}
                    disabled={msSubmitting}
                  >
                    Cancelar
                  </button>

                  {/* Botão Ver Minuta */}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={!msPlano || !msValorUnitario || Number(msValorUnitario) <= 0}
                    style={{
                      borderColor: 'rgba(56, 189, 248, 0.4)',
                      background: 'rgba(56, 189, 248, 0.08)',
                      color: '#38bdf8',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '10px 16px',
                      cursor: 'pointer'
                    }}
                    onClick={() => setShowMsContractPreview(true)}
                  >
                    <i className="fa-solid fa-eye"></i> Visualizar Minuta do Contrato
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Opção 1: WhatsApp Clicksign */}
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={msSubmitting || !msPlano || !msValorUnitario || Number(msValorUnitario) <= 0}
                    style={{
                      background: 'rgba(34, 197, 94, 0.2)',
                      borderColor: '#22c55e',
                      color: '#4ade80',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleConfirmManualSale('clicksign')}
                  >
                    {msSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-brands fa-whatsapp fa-lg"></i>}
                    Disparar WhatsApp Clicksign
                  </button>

                  {/* Opção 2: Concluir Presencialmente */}
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={msSubmitting || !msPlano || !msValorUnitario || Number(msValorUnitario) <= 0}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      borderColor: '#059669',
                      color: '#fff',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 18px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                    }}
                    onClick={() => handleConfirmManualSale('presencial')}
                  >
                    {msSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                    Concluir & Ativar Presencialmente
                  </button>
                </div>
              </div>

              {/* Overlay de Processamento com Bloqueio de Duplo Clique */}
              {msSubmitting && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000, borderRadius: '18px', gap: '16px', padding: '20px', textAlign: 'center' }}>
                  <i className="fa-solid fa-spinner fa-spin fa-3x" style={{ color: '#10b981' }}></i>
                  <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.15rem' }}>
                    Processando e ativando contrato...
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '380px', lineHeight: '1.4' }}>
                    Aguarde a formalização, gravação das parcelas e liberação dos créditos.
                  </div>
                </div>
              )}
              {showMsContractPreview && (() => {
                const planSel = plans.find(p => p._id === msPlano);
                const isAnualPlan = msDuracao === 'anual' || Number(msVigenciaQtd) >= 12;
                const liveContractData = {
                  clientNome: isMinorDetected ? (msRespNome || 'Nome do Responsável Legal') : (msNome || 'Nome do Aluno'),
                  clientCpf: isMinorDetected ? (msRespCpf || '000.000.000-00') : (msCpf || '000.000.000-00'),
                  clientEmail: isMinorDetected ? msRespEmail : msEmail,
                  clientTelefone: isMinorDetected ? msRespTelefone : msTelefone,
                  clientDataNascimento: isMinorDetected ? '' : msDataNascimento,
                  clientCep: msCep,
                  clientEndereco: msEndereco,
                  clientNumero: msNumero,
                  clientComplemento: msComplemento,
                  clientBairro: msBairro,
                  clientCidade: msCidade,
                  clientEstado: msEstado,
                  planNome: planSel?.nome || 'Plano Clube Fitness',
                  planTipo: planSel?.tipo || (isAnualPlan ? 'Anual' : 'Mensal'),
                  planPreco: planSel?.preco || grossPrice,
                  valorUnitario: msValorUnitario,
                  valorLiquido: finalPrice,
                  descontoTipo: msDescontoTipo,
                  descontoValor: msDescontoValor,
                  duracao: msDuracao,
                  vigenciaQtd: msVigenciaQtd,
                  parcelas: numParcelas,
                  formaPagamento: msFormaPagamento,
                  dataInicio: msDataInicio,
                  dataVencimento: msDataPrimeiroVencimento || msDataInicio,
                  creditosMensais: msCreditosMensais,
                  unidadeContratada: planSel?.unidadeAtendimento || 'Clube Fitness',
                  isMinor: isMinorDetected,
                  beneficiarioNome: isMinorDetected ? (msNome || 'Nome do Menor') : undefined,
                  beneficiarioCpf: isMinorDetected ? (msCpf || '000.000.000-00') : undefined
                };
                const liveContractHtml = getUnifiedTemplate(liveContractData);

                return (
                  <div
                    className="modal-overlay"
                    style={{ display: 'flex', zIndex: 11000, background: 'rgba(0,0,0,0.8)' }}
                    onClick={() => setShowMsContractPreview(false)}
                  >
                    <div
                      className="modal-content"
                      onClick={e => e.stopPropagation()}
                      style={{ maxWidth: '860px', width: '95%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', border: '1px solid rgba(56, 189, 248, 0.4)', boxShadow: '0 25px 70px rgba(0,0,0,0.85)' }}
                    >
                      <div
                        className="modal-header"
                        style={{
                          padding: '16px 22px',
                          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(3, 105, 161, 0.15) 100%)',
                          borderBottom: '1px solid rgba(56, 189, 248, 0.3)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="fa-solid fa-file-contract"></i> Pré-Visualização da Minuta do Contrato
                          </h3>
                          <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                            Revise os dados cadastrais, partes qualificadas e condições de pagamento
                          </small>
                        </div>
                        <button
                          type="button"
                          className="close-btn"
                          onClick={() => setShowMsContractPreview(false)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer' }}
                        >
                          &times;
                        </button>
                      </div>

                      <div
                        className="modal-body"
                        style={{
                          padding: '24px 30px',
                          background: '#ffffff',
                          color: '#1e293b',
                          maxHeight: '65vh',
                          overflowY: 'auto',
                          fontSize: '0.92rem',
                          lineHeight: '1.6'
                        }}
                      >
                        <div dangerouslySetInnerHTML={{ __html: liveContractHtml }} />
                      </div>

                      <div
                        className="modal-footer"
                        style={{
                          padding: '14px 22px',
                          background: 'var(--bg-darker)',
                          borderTop: '1px solid var(--border-color)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setShowMsContractPreview(false)}
                        >
                          Fechar Prévia
                        </button>

                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={msSubmitting || !msPlano || !msValorUnitario || Number(msValorUnitario) <= 0}
                            style={{
                              background: 'rgba(34, 197, 94, 0.2)',
                              borderColor: '#22c55e',
                              color: '#4ade80',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '9px 15px',
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              setShowMsContractPreview(false);
                              handleConfirmManualSale('clicksign');
                            }}
                          >
                            {msSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-brands fa-whatsapp fa-lg"></i>}
                            Disparar WhatsApp Clicksign
                          </button>

                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={msSubmitting || !msPlano || !msValorUnitario || Number(msValorUnitario) <= 0}
                            style={{
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              borderColor: '#059669',
                              color: '#fff',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '9px 16px',
                              cursor: 'pointer',
                              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                            }}
                            onClick={() => {
                              setShowMsContractPreview(false);
                              handleConfirmManualSale('presencial');
                            }}
                          >
                            {msSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                            Concluir & Ativar Presencialmente
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

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
              {(() => {
                const comStatus = String(historyModalClient.dadosComerciais?.status || 'ativo').toLowerCase();
                const isFinalizado = comStatus === 'finalizado' || comStatus === 'inativo';
                
                if (isFinalizado) {
                  return (
                    <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>
                          <i className="fa-solid fa-flag-checkered"></i>
                        </div>
                        <div>
                          <strong style={{ color: '#f87171', fontSize: '0.88rem', display: 'block' }}>Aluno sem Contrato Vigente Ativo</strong>
                          <span style={{ color: '#94a3b8', fontSize: '0.74rem' }}>Status Atual: <strong>FINALIZADO</strong> • Consulte abaixo os ciclos anteriores arquivados</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.72rem', background: '#ef4444', color: '#fff', fontWeight: 800, padding: '3px 10px', borderRadius: '6px', textTransform: 'uppercase' }}>
                        Finalizado
                      </span>
                    </div>
                  );
                }

                const t = String(historyModalClient.dadosComerciais?.duracao || 'mensal').toLowerCase();
                const tipoLabel = t === 'semana' ? 'Semana' : (t === 'anual' ? 'Anual' : 'Mensal');
                const qtdVal = historyModalClient.dadosComerciais?.duracaoQtd || 1;

                return (
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
                          {tipoLabel} • {qtdVal}
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
                );
              })()}

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
                      const rawT = String(hc.tipoPlano || hc.duracao || 'mensal').toLowerCase();
                      const tipoHc = rawT === 'semana' ? 'Semana' : (rawT === 'anual' ? 'Anual' : 'Mensal');
                      const qtdHc = hc.duracaoQtd || 1;
                      const usadosHc = hc.creditosUsados !== undefined ? hc.creditosUsados : (hc.creditosUtilizadosCiclo !== undefined ? hc.creditosUtilizadosCiclo : 12);
                      const totalHc = hc.creditosTotal !== undefined ? hc.creditosTotal : (hc.creditosTotalCiclo !== undefined ? hc.creditosTotalCiclo : 12);

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
                                {tipoHc} • {qtdHc}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>Valor Contratado:</span>
                              <span style={{ color: '#38bdf8', fontWeight: 600 }}>R$ {Number(hc.valorContratado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({String(hc.formaPagamento || 'PIX').toUpperCase()})</span>
                            </div>
                            <div>
                              <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>Utilização:</span>
                              <span style={{ color: '#a78bfa' }}>{usadosHc} / {totalHc} créditos</span>
                            </div>
                            <div>
                              <span style={{ color: '#64748b', fontSize: '0.68rem', display: 'block' }}>Data Arquivamento:</span>
                              <span style={{ color: '#94a3b8' }}>{hc.dataArquivamento ? new Date(hc.dataArquivamento).toLocaleDateString('pt-BR') : '-'}</span>
                            </div>
                          </div>

                          {hc.motivoEncerramento && (
                            <div style={{ marginTop: '8px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.72rem', color: '#94a3b8' }}>
                              <strong>Obs:</strong> {hc.motivoEncerramento}
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

      {/* MODAL: EDIÇÃO CADASTRAL & COMERCIAL DIRETA (ADMIN) */}
      {showEditClientModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowEditClientModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-pen-to-square" style={{ marginRight: '8px', color: '#38bdf8' }}></i> Editar Dados do Aluno (Administrador)</h3>
              <button className="modal-close" onClick={() => setShowEditClientModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaveClientModal}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  1. Dados Pessoais & Contato
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Nome Completo</label>
                    <input type="text" className="form-control" value={dcNome} onChange={e => setDcNome(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>E-mail</label>
                    <input type="email" className="form-control" value={dcEmail} onChange={e => setDcEmail(e.target.value)} required />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  <div className="form-group">
                    <label>CPF</label>
                    <input type="text" className="form-control" value={dcCpf} onChange={e => setDcCpf(e.target.value)} placeholder="000.000.000-00" />
                  </div>
                  <div className="form-group">
                    <label>Telefone / WhatsApp</label>
                    <input type="text" className="form-control" value={dcTelefone} onChange={e => setDcTelefone(e.target.value)} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="form-group">
                    <label>Data de Nascimento</label>
                    <input type="date" className="form-control" value={dcNascimento} onChange={e => setDcNascimento(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Sexo</label>
                    <select className="select-custom" value={dcSexo} onChange={e => setDcSexo(e.target.value)}>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="O">Outro</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 0.8fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>CEP</label>
                    <input type="text" className="form-control" value={dcCep} onChange={e => setDcCep(e.target.value)} placeholder="00000-000" />
                  </div>
                  <div className="form-group">
                    <label>Endereço (Rua/Av.)</label>
                    <input type="text" className="form-control" value={dcEndereco} onChange={e => setDcEndereco(e.target.value)} placeholder="Rua..." />
                  </div>
                  <div className="form-group">
                    <label>Número</label>
                    <input type="text" className="form-control" value={dcNumero} onChange={e => setDcNumero(e.target.value)} placeholder="123" />
                  </div>
                  <div className="form-group">
                    <label>Complemento</label>
                    <input type="text" className="form-control" value={dcComplemento} onChange={e => setDcComplemento(e.target.value)} placeholder="Apto..." />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 0.8fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Bairro</label>
                    <input type="text" className="form-control" value={dcBairro} onChange={e => setDcBairro(e.target.value)} placeholder="Bairro" />
                  </div>
                  <div className="form-group">
                    <label>Cidade</label>
                    <input type="text" className="form-control" value={dcCidade} onChange={e => setDcCidade(e.target.value)} placeholder="Cidade" />
                  </div>
                  <div className="form-group">
                    <label>Estado (UF)</label>
                    <input type="text" className="form-control" value={dcEstado} onChange={e => setDcEstado(e.target.value)} placeholder="UF" />
                  </div>
                </div>

                <div className="form-group">
                  <label>Vínculo Asaas (ID do Cliente)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-control"
                      value={dcAsaasCustomerId}
                      onChange={e => setDcAsaasCustomerId(e.target.value)}
                      placeholder="ex: cus_0000057489"
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleSearchAsaas}
                      disabled={searchingAsaas}
                      style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                    >
                      {searchingAsaas ? 'Buscando...' : 'Buscar no Asaas'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditClientModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={savingComercial}>
                  {savingComercial ? <span><i className="fa-solid fa-spinner fa-spin"></i> Salvando...</span> : <span><i className="fa-solid fa-floppy-disk"></i> Salvar Alterações</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* =========================================================================
          MODAL EXECUTIVO: EDITAR CONDIÇÕES COMERCIAIS & ATIVAR VIGÊNCIA (ADMIN)
          ========================================================================= */}
      {editContractClient && (() => {
        const activePlans = plans.filter((p: any) => p.ativo !== false && !p.nome?.toLowerCase().includes('dynamus'));
        const gross = Number(ecValorUnitario || 0) * (ecCriarRecorrenciaMensal ? 1 : Number(ecVigenciaQtd || 1));
        let discountVal = 0;
        if (ecDescontoTipo === 'percentual') {
          discountVal = (gross * (Number(ecDescontoValor) || 0)) / 100;
        } else {
          discountVal = Number(ecDescontoValor) || 0;
        }
        discountVal = Math.min(discountVal, gross);
        const netVal = Math.max(0, gross - discountVal);
        const valorParc = netVal / (Number(ecParcelas) || 1);

        return (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, padding: '20px' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '18px', width: '100%', maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto', padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', fontSize: '1.2rem' }}>
                    <i className="fa-solid fa-pen-to-square"></i>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Editar Condições & Ativar Vigência</h3>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Aluno: <strong>{editContractClient.dadosPessoais?.nome || editContractClient.nome}</strong>
                    </div>
                  </div>
                </div>
                <button onClick={() => setEditContractClient(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer' }}>&times;</button>
              </div>

              {/* Status e Ação Rápida */}
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
                    Status Comercial Atual
                  </label>
                  <select
                    value={ecStatus}
                    onChange={e => setEcStatus(e.target.value)}
                    style={{ padding: '6px 10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700 }}
                  >
                    <option value="ativo">🟢 Ativo (Vigente / Formalizado)</option>
                    <option value="pendente">⏳ Pendente (Aguardando Assinatura)</option>
                    <option value="lead">🟣 Lead / Novo Cadastro</option>
                    <option value="renovacao">🟡 Renovação Pendente</option>
                    <option value="vencido">🔴 Vencido</option>
                    <option value="finalizado">⚪ Finalizado / Inativo</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setEcStatus('ativo')}
                  style={{
                    background: ecStatus === 'ativo' ? '#10b981' : 'rgba(16, 185, 129, 0.15)',
                    color: ecStatus === 'ativo' ? '#fff' : '#34d399',
                    border: '1px solid #10b981',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="fa-solid fa-circle-check"></i>
                  {ecStatus === 'ativo' ? 'Definido como Vigente' : 'Marcar como Vigente'}
                </button>
              </div>

              {/* Form Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Plano Contratado */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Plano Contratado <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={ecPlanoId}
                    onChange={e => {
                      const pid = e.target.value;
                      setEcPlanoId(pid);
                      const pObj = plans.find(p => p._id === pid);
                      if (pObj) {
                        if (pObj.preco) setEcValorUnitario(pObj.preco);
                        if (pObj.tipo === 'Anual') {
                          setEcDuracao('anual');
                          setEcVigenciaQtd(12);
                          setEcCreditosMassagemTotal(1);
                          setEcCreditosEmergenciaTotal(1);
                        } else {
                          setEcDuracao('mensal');
                          setEcVigenciaQtd(1);
                          setEcCreditosMassagemTotal(0);
                          setEcCreditosEmergenciaTotal(0);
                        }
                        if (pObj.frequencia) setEcFrequencia(pObj.frequencia);
                        if (pObj.creditosTotal) setEcCreditosTotal(pObj.creditosTotal);
                        const end = calculateContractEndDate(ecDataInicio || new Date().toISOString().split('T')[0], pObj.tipo === 'Anual' ? 'anual' : 'mensal', pObj.tipo === 'Anual' ? 12 : 1, undefined, ecCriarRecorrenciaMensal);
                        setEcVencimento(end);
                      }
                    }}
                    style={{ width: '100%', padding: '10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.88rem' }}
                  >
                    <option value="">-- Selecione o Plano --</option>
                    {activePlans.map((p: any) => (
                      <option key={p._id} value={p._id}>{p.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Recorrência Mensal Automática */}
                <div 
                  style={{ 
                    background: ecCriarRecorrenciaMensal ? 'rgba(59, 130, 246, 0.14)' : 'rgba(255, 255, 255, 0.03)', 
                    border: '1px solid',
                    borderColor: ecCriarRecorrenciaMensal ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)', 
                    borderRadius: '10px', 
                    padding: '12px 14px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => {
                    const next = !ecCriarRecorrenciaMensal;
                    setEcCriarRecorrenciaMensal(next);
                    const end = calculateContractEndDate(ecDataInicio, ecDuracao, ecVigenciaQtd, undefined, next);
                    setEcVencimento(end);
                  }}
                >
                  <input
                    type="checkbox"
                    id="ecCriarRecorrenciaMensal"
                    checked={ecCriarRecorrenciaMensal}
                    onChange={e => {
                      setEcCriarRecorrenciaMensal(e.target.checked);
                      const end = calculateContractEndDate(ecDataInicio, ecDuracao, ecVigenciaQtd, undefined, e.target.checked);
                      setEcVencimento(end);
                    }}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3b82f6' }}
                  />
                  <label htmlFor="ecCriarRecorrenciaMensal" style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-arrows-rotate" style={{ color: '#3b82f6' }}></i>
                    Contrato com Recorrência Mensal Automática
                  </label>
                </div>

                {/* Bloco 1: Duração & Vigência Oficial de Acesso */}
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-calendar-days"></i> 1. Vigência do Plano (Período de Acesso ao Clube)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 1.1fr 1.1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Tipo Vigência</label>
                      <select
                        style={{ width: '100%', padding: '9px 10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }}
                        value={ecDuracao}
                        onChange={e => {
                          const dur = e.target.value as any;
                          setEcDuracao(dur);
                          const qty = dur === 'anual' ? 12 : (dur === 'semestral' ? 6 : 1);
                          setEcVigenciaQtd(qty);
                          const end = calculateContractEndDate(ecDataInicio, dur, qty, undefined, ecCriarRecorrenciaMensal);
                          setEcVencimento(end);
                        }}
                      >
                        <option value="anual">Anual</option>
                        <option value="semestral">Semestral</option>
                        <option value="mensal">Mensal</option>
                        <option value="semana">Semanal</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Qtd Vigência</label>
                      <input
                        type="number"
                        min={1}
                        style={{ width: '100%', padding: '9px 10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }}
                        value={ecVigenciaQtd}
                        onChange={e => {
                          const q = Math.max(1, parseInt(e.target.value, 10) || 1);
                          setEcVigenciaQtd(q);
                          const end = calculateContractEndDate(ecDataInicio, ecDuracao, q, undefined, ecCriarRecorrenciaMensal);
                          setEcVencimento(end);
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Início da Vigência</label>
                      <input
                        type="date"
                        style={{ width: '100%', padding: '9px 10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }}
                        value={ecDataInicio}
                        onChange={e => {
                          const d = e.target.value;
                          setEcDataInicio(d);
                          const end = calculateContractEndDate(d, ecDuracao, ecVigenciaQtd, undefined, ecCriarRecorrenciaMensal);
                          setEcVencimento(end);
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#34d399', marginBottom: '4px' }}>
                        <i className="fa-solid fa-calendar-check" style={{ marginRight: '4px' }}></i> Término da Vigência
                      </label>
                      <input
                        type="date"
                        style={{ width: '100%', padding: '9px 10px', background: 'var(--bg-darker)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', fontWeight: 700, borderRadius: '8px' }}
                        value={ecVencimento}
                        onChange={e => setEcVencimento(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Bloco 2: 1º Vencimento da Parcela & Condição Financeira */}
                <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-credit-card"></i> 2. Condições de Pagamento (Faturamento & Parcelamento)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#38bdf8', marginBottom: '4px' }}>
                        <i className="fa-regular fa-calendar-check" style={{ marginRight: '4px' }}></i> 1º Vencimento da Parcela
                      </label>
                      <input
                        type="date"
                        style={{ width: '100%', padding: '9px 10px', background: 'var(--bg-darker)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', fontWeight: 700, borderRadius: '8px' }}
                        value={ecDataPrimeiroVencimento}
                        onChange={e => setEcDataPrimeiroVencimento(e.target.value)}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Forma Pagamento</label>
                      <select
                        style={{ width: '100%', padding: '9px 10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }}
                        value={ecFormaPagamento}
                        onChange={e => setEcFormaPagamento(e.target.value)}
                      >
                        <option value="pix">PIX</option>
                        <option value="boleto">Boleto Bancário</option>
                        <option value="cartao">Cartão de Crédito</option>
                        <option value="dinheiro">Dinheiro</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Valor Unitário (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        style={{ width: '100%', padding: '9px 10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--color-primary)', fontWeight: 700, borderRadius: '8px' }}
                        value={ecValorUnitario || ''}
                        onChange={e => setEcValorUnitario(parseFloat(e.target.value) || 0)}
                        placeholder="R$ 0,00"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Parcelas</label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        style={{ width: '100%', padding: '9px 10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }}
                        value={ecParcelas}
                        onChange={e => setEcParcelas(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      />
                    </div>
                  </div>
                </div>

                {/* Descontos */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Tipo de Desconto</label>
                    <select
                      style={{ width: '100%', padding: '9px 10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }}
                      value={ecDescontoTipo}
                      onChange={e => setEcDescontoTipo(e.target.value as any)}
                    >
                      <option value="percentual">🏷️ Porcentagem (%)</option>
                      <option value="fixo">💵 Valor Fixo (R$)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Abatimento ({ecDescontoTipo === 'percentual' ? '%' : 'R$'})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      style={{ width: '100%', padding: '9px 10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }}
                      value={ecDescontoValor || ''}
                      onChange={e => setEcDescontoValor(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Frequência e Créditos */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Frequência Semanal</label>
                    <select
                      style={{ width: '100%', padding: '9px 10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }}
                      value={ecFrequencia}
                      onChange={e => {
                        const freq = Number(e.target.value);
                        setEcFrequencia(freq);
                        if (freq === 1) setEcCreditosTotal(4);
                        else if (freq === 2) setEcCreditosTotal(9);
                        else if (freq === 3) setEcCreditosTotal(13);
                        else if (freq === 4) setEcCreditosTotal(17);
                        else if (freq === 5) setEcCreditosTotal(22);
                      }}
                    >
                      <option value={1}>1x/sem (4 créd/mês)</option>
                      <option value={2}>2x/sem (9 créd/mês)</option>
                      <option value={3}>3x/sem (13 créd/mês)</option>
                      <option value={4}>4x/sem (17 créd/mês)</option>
                      <option value={5}>5x/sem (22 créd/mês)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Créditos Treino/Mês</label>
                    <input
                      type="number"
                      min={0}
                      style={{ width: '100%', padding: '9px 10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }}
                      value={ecCreditosTotal}
                      onChange={e => setEcCreditosTotal(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Créditos Massagem</label>
                    <input
                      type="number"
                      min={0}
                      style={{ width: '100%', padding: '9px 10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }}
                      value={ecCreditosMassagemTotal}
                      onChange={e => setEcCreditosMassagemTotal(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Créditos Emergência</label>
                    <input
                      type="number"
                      min={0}
                      style={{ width: '100%', padding: '9px 10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }}
                      value={ecCreditosEmergenciaTotal}
                      onChange={e => setEcCreditosEmergenciaTotal(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                </div>

                {/* Resumo Financeiro em Tempo Real */}
                <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Valor Bruto ({ecVigenciaQtd}x)</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      R$ {gross.toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                  {discountVal > 0 && (
                    <div>
                      <div style={{ fontSize: '0.74rem', color: '#ef4444' }}>Desconto Aplicado</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ef4444' }}>
                        - R$ {discountVal.toFixed(2).replace('.', ',')} {ecDescontoTipo === 'percentual' ? `(${ecDescontoValor}%)` : ''}
                      </div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Valor Total Líquido</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                      R$ {netVal.toFixed(2).replace('.', ',')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>
                      {ecParcelas}x de R$ {valorParc.toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                </div>

                {ecError && (
                  <div style={{ color: '#ef4444', fontSize: '0.82rem', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    ⚠️ {ecError}
                  </div>
                )}

                {/* Footer de Ações */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '6px' }}>
                  <button type="button" onClick={() => setEditContractClient(null)} className="btn btn-secondary" style={{ padding: '9px 18px', borderRadius: '8px' }}>
                    Cancelar
                  </button>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => handleSaveContractConditions(false)}
                      disabled={ecSaving || !ecPlanoId}
                      className="btn btn-secondary"
                      style={{ padding: '9px 18px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                    >
                      {ecSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
                      Salvar Alterações
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveContractConditions(true)}
                      disabled={ecSaving || !ecPlanoId}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 800,
                        padding: '9px 22px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: (!ecPlanoId || ecSaving) ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
                      }}
                    >
                      {ecSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-bolt"></i>}
                      Salvar & Ativar como Vigente
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          MODAL EXECUTIVO: RESCISÃO & CANCELAMENTO DE CONTRATO COM CALCULADORA
          ========================================================================= */}
      {showCancelContractModal && cancelModalClient && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '18px', width: '100%', maxWidth: '680px', maxHeight: '92vh', overflowY: 'auto', padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px', boxShadow: '0 20px 50px rgba(0,0,0,0.7)' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', fontSize: '1.2rem' }}>
                  <i className="fa-solid fa-ban"></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>Rescisão & Cancelamento de Contrato</h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Aluno: <strong style={{ color: '#f8fafc' }}>{cancelModalClient.dadosPessoais?.nome || cancelModalClient.nome}</strong> • Plano: <span style={{ color: '#38bdf8' }}>{cancelModalData?.contract?.planoNome || 'Plano Atual'}</span>
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => !cancelSubmitting && setShowCancelContractModal(false)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer', padding: '4px' }}
              >
                &times;
              </button>
            </div>

            {cancelModalLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <i className="fa-solid fa-circle-notch fa-spin fa-2x" style={{ color: '#38bdf8', marginBottom: '12px' }}></i>
                <div style={{ fontSize: '0.9rem' }}>Carregando dados financeiros e integrados do Asaas...</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* BLOCO 1: DEFINIR DATA OFICIAL DE ENCERRAMENTO DO ACESSO */}
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-calendar-check"></i> 1. Vigência de Acesso & Data Oficial de Término
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    Escolha a data em que o acesso do aluno ao Clube será encerrado. Sugerimos a data de término do ciclo mensal já quitado para que o aluno usufrua do período pago:
                  </div>

                  {/* Atalhos Rápidos de Seleção */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {cancelModalData?.financeiro?.dataSugeridaCiclo && (
                      <button
                        type="button"
                        onClick={() => setCancelDataEncerramento(cancelModalData.financeiro.dataSugeridaCiclo)}
                        style={{
                          background: cancelDataEncerramento === cancelModalData.financeiro.dataSugeridaCiclo ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.04)',
                          border: cancelDataEncerramento === cancelModalData.financeiro.dataSugeridaCiclo ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                          color: cancelDataEncerramento === cancelModalData.financeiro.dataSugeridaCiclo ? '#38bdf8' : '#cbd5e1',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        🌟 Término do Ciclo Quitado ({new Date(cancelModalData.financeiro.dataSugeridaCiclo + 'T12:00:00').toLocaleDateString('pt-BR')})
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setCancelDataEncerramento(new Date().toISOString().split('T')[0])}
                      style={{
                        background: cancelDataEncerramento === new Date().toISOString().split('T')[0] ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.04)',
                        border: cancelDataEncerramento === new Date().toISOString().split('T')[0] ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.08)',
                        color: cancelDataEncerramento === new Date().toISOString().split('T')[0] ? '#f87171' : '#cbd5e1',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      ⚡ Encerramento Imediato (Hoje)
                    </button>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Data Limite de Acesso (Vigência Final)
                    </label>
                    <input
                      type="date"
                      value={cancelDataEncerramento}
                      onChange={e => setCancelDataEncerramento(e.target.value)}
                      style={{ padding: '9px 12px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', width: '100%', fontSize: '0.88rem', fontWeight: 700 }}
                    />
                  </div>
                </div>

                {/* BLOCO 2: CALCULADORA RESCISÓRIA OFICIAL (10% SOBRE O VALOR TOTAL) */}
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-calculator"></i> 2. Calculadora de Rescisão (10% sobre o Total do Contrato)
                    </span>
                    <span style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                      Regra Contratual
                    </span>
                  </div>

                  {/* Cards Métricos */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Valor Total Contratado</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#f8fafc', marginTop: '2px' }}>
                        R$ {Number(cancelModalData?.financeiro?.valorTotalContrato || 0).toFixed(2).replace('.', ',')}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Quitado</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#34d399', marginTop: '2px' }}>
                        R$ {Number(cancelModalData?.financeiro?.valorPagoTotal || 0).toFixed(2).replace('.', ',')}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                        {cancelModalData?.financeiro?.parcelasPagasCount || 0} parcela(s) paga(s)
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Multa Rescisória (10%)</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 900, color: cancelAplicarMulta ? '#f87171' : '#94a3b8', marginTop: '2px' }}>
                        {cancelAplicarMulta ? `R$ ${Number(cancelMultaValor || 0).toFixed(2).replace('.', ',')}` : 'R$ 0,00 (Isenta)'}
                      </div>
                    </div>
                  </div>

                  {/* Toggle de Isenção de Multa */}
                  <div 
                    style={{ 
                      background: !cancelAplicarMulta ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.03)', 
                      border: '1px solid',
                      borderColor: !cancelAplicarMulta ? '#10b981' : 'rgba(255,255,255,0.08)', 
                      borderRadius: '10px', 
                      padding: '10px 14px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => setCancelAplicarMulta(!cancelAplicarMulta)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={!cancelAplicarMulta}
                        onChange={() => setCancelAplicarMulta(!cancelAplicarMulta)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                      />
                      <div>
                        <strong style={{ fontSize: '0.84rem', color: !cancelAplicarMulta ? '#34d399' : '#f8fafc', display: 'block' }}>
                          ✨ Rescindir sem Aplicar Multa (Isenção / Acordo Amigável)
                        </strong>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          Zera a cobrança da multa de 10% em caso de atestado médico, mudança de cidade ou acordo.
                        </span>
                      </div>
                    </div>
                    {!cancelAplicarMulta && (
                      <span style={{ fontSize: '0.72rem', background: '#10b981', color: '#000', fontWeight: 800, padding: '2px 8px', borderRadius: '4px' }}>
                        Multa Isenta
                      </span>
                    )}
                  </div>
                </div>

                {/* BLOCO 3: GESTÃO & CONTROLE INTEGRADO ASAAS */}
                <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-credit-card"></i> 3. Gestão Integrada Asaas (Controle do Administrador)
                    </span>
                    <span style={{ fontSize: '0.7rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                      Gateway Financeiro
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Assinatura Asaas */}
                    {cancelModalData?.asaas?.subscription ? (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)', cursor: 'pointer', margin: 0 }}>
                        <input
                          type="checkbox"
                          checked={cancelAsaasSubscription}
                          onChange={e => setCancelAsaasSubscription(e.target.checked)}
                          style={{ width: '18px', height: '18px', accentColor: '#38bdf8', cursor: 'pointer' }}
                        />
                        <div>
                          <strong style={{ fontSize: '0.82rem', color: '#f8fafc', display: 'block' }}>
                            🔄 Cancelar Assinatura Recorrente no Asaas
                          </strong>
                          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                            ID: <code>{cancelModalData.asaas.subscription.id}</code> • R$ {Number(cancelModalData.asaas.subscription.value || 0).toFixed(2).replace('.', ',')}/mês ({cancelModalData.asaas.subscription.status})
                          </span>
                        </div>
                      </label>
                    ) : (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '6px 0' }}>
                        ℹ️ Nenhuma assinatura recorrente ativa vinculada no Asaas.
                      </div>
                    )}

                    {/* Cobranças Pendentes Asaas */}
                    {cancelModalData?.asaas?.pendingCharges && cancelModalData.asaas.pendingCharges.length > 0 ? (
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={cancelAsaasPayments}
                            onChange={e => setCancelAsaasPayments(e.target.checked)}
                            style={{ width: '18px', height: '18px', accentColor: '#38bdf8', cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <strong style={{ fontSize: '0.82rem', color: '#f8fafc', display: 'block' }}>
                              📄 Cancelar Cobranças / Boletos Pendentes no Asaas ({cancelModalData.asaas.pendingCharges.length} faturas)
                            </strong>
                            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                              Cancela faturas com vencimento posterior à data de encerramento ({cancelDataEncerramento}).
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={e => { e.preventDefault(); setShowAsaasChargesDetail(!showAsaasChargesDetail); }}
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                          >
                            {showAsaasChargesDetail ? 'Ocultar Detalhes' : 'Ver Faturas'}
                          </button>
                        </label>

                        {showAsaasChargesDetail && (
                          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                            {cancelModalData.asaas.pendingCharges.map((ch: any) => (
                              <div key={ch.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#cbd5e1', padding: '2px 0' }}>
                                <span>{ch.description || 'Parcela'} (ID: <code>{ch.id}</code>)</span>
                                <span>Venc: <strong>{new Date(ch.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}</strong> • <strong>R$ {Number(ch.value).toFixed(2).replace('.', ',')}</strong></span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '6px 0' }}>
                        ℹ️ Nenhuma cobrança/boleto pendente encontrada no Asaas para este aluno.
                      </div>
                    )}
                  </div>
                </div>

                {/* BLOCO 4: MOTIVO & OBSERVAÇÕES */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Motivo da Rescisão <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={cancelMotivo}
                      onChange={e => setCancelMotivo(e.target.value)}
                      style={{ padding: '9px 12px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', width: '100%', fontSize: '0.84rem' }}
                    >
                      <option value="Acordo Amigável">🤝 Acordo Amigável</option>
                      <option value="Mudança de Cidade">✈️ Mudança de Cidade / Domicílio</option>
                      <option value="Problema de Saúde / Atestado">🏥 Problema de Saúde / Atestado Médico</option>
                      <option value="Dificuldades Financeiras">💵 Dificuldades Financeiras</option>
                      <option value="Insatisfação / Motivos Pessoais">👤 Motivos Pessoais / Outros</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Observações da Rescisão
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Aluno apresentou atestado / Isenção acordada"
                      value={cancelObservacoes}
                      onChange={e => setCancelObservacoes(e.target.value)}
                      style={{ padding: '9px 12px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', width: '100%', fontSize: '0.84rem' }}
                    />
                  </div>
                </div>

                {/* RESUMO EXECUTIVO DO ACERTO */}
                <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Balanço Final do Acerto</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: cancelAplicarMulta ? '#f87171' : '#34d399' }}>
                      {cancelAplicarMulta ? `💰 Cobrar Multa: R$ ${Number(cancelMultaValor || 0).toFixed(2).replace('.', ',')}` : '✅ Quitado / Sem Multa'}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1', textAlign: 'right' }}>
                    Término de Acesso: <strong style={{ color: '#38bdf8' }}>{new Date(cancelDataEncerramento + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>
                  </div>
                </div>

                {cancelError && (
                  <div style={{ color: '#ef4444', fontSize: '0.82rem', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    ⚠️ {cancelError}
                  </div>
                )}

                {/* Footer de Confirmação */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCancelContractModal(false)}
                    disabled={cancelSubmitting}
                    style={{ padding: '9px 18px', borderRadius: '8px' }}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmCancelContract}
                    disabled={cancelSubmitting || !cancelDataEncerramento}
                    style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      border: 'none',
                      color: '#fff',
                      fontWeight: 800,
                      padding: '9px 22px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: cancelSubmitting ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
                    }}
                  >
                    {cancelSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-ban"></i>}
                    Confirmar Rescisão Contratual
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

