'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { downloadContractPDF, getContractPDFBase64 } from '@/utils/pdfGenerator';
import { generateContractTemplate as getUnifiedTemplate } from '@/utils/contractTemplate';
import { validateContractClientData } from '@/utils/contractValidator';
import { formatCurrencyBRL, selectOnFocus } from '@/utils/currencyMask';
import { smartSearchMatch } from '@/utils/smartSearch';
import { getContractValidityInfo } from '@/utils/contractValidity';
import ClicksignPanel from './ClicksignPanel';

const normalizeText = (str: string) => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

interface GestaoContratosPanelProps {
  clients: any[];
  plans: any[];
  userCargo: string;
  fetchData: (silent?: boolean) => void;
}

export default function GestaoContratosPanel({
  clients,
  plans,
  userCargo,
  fetchData
}: GestaoContratosPanelProps) {
  // Navigation & General states
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [subTab, setSubTab] = useState<'alunos' | 'clicksign'>('alunos');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('vencimento_asc');
  const [contratoStatusFilter, setContratoStatusFilter] = useState('todos');
  const [contratoPlanFilter, setContratoPlanFilter] = useState('todos');
  const [contracts, setContracts] = useState<any[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);

  // Computação com busca inteligente multi-termos, filtros e ordenação
  const sortedClients = useMemo(() => {
    return clients
      .filter((c: any) => {
        const com = c.dadosComerciais || {};
        const plan = plans.find(p => p._id === (com.planoId?._id || com.planoId));
        const status = com.status || 'pendente';
        
        // 1. Smart Search Multi-Terms
        const matchesSearch = smartSearchMatch(searchQuery, [
          c.dadosPessoais?.nome,
          c.dadosPessoais?.cpf,
          c.dadosPessoais?.email,
          c.dadosPessoais?.telefone,
          plan?.nome,
          status
        ]);
        if (!matchesSearch) return false;

        // 2. Status Filter
        if (contratoStatusFilter !== 'todos') {
          if (contratoStatusFilter === 'ativo' && (status !== 'ativo' && status !== 'assinado')) return false;
          if (contratoStatusFilter === 'pendente' && status !== 'pendente') return false;
          if (contratoStatusFilter === 'lead' && status !== 'lead') return false;
          if (contratoStatusFilter === 'vencido' && status !== 'vencido') return false;
          if (contratoStatusFilter === 'congelado' && status !== 'congelado') return false;
        }

        // 3. Plan Filter
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
        if (sortOption === 'alfabetico_asc') {
          return (a.dadosPessoais?.nome || '').localeCompare(b.dadosPessoais?.nome || '');
        }
        if (sortOption === 'alfabetico_desc') {
          return (b.dadosPessoais?.nome || '').localeCompare(a.dadosPessoais?.nome || '');
        }
        if (sortOption === 'inicio_desc') {
          const iA = a.dadosComerciais?.dataInicio || '';
          const iB = b.dadosComerciais?.dataInicio || '';
          return iB.localeCompare(iA);
        }
        if (sortOption === 'status') {
          const stA = a.dadosComerciais?.status === 'ativo' || a.dadosComerciais?.status === 'assinado' ? 1 : 0;
          const stB = b.dadosComerciais?.status === 'ativo' || b.dadosComerciais?.status === 'assinado' ? 1 : 0;
          return stB - stA;
        }
        return 0;
      });
  }, [clients, searchQuery, contratoStatusFilter, contratoPlanFilter, sortOption, plans]);
  const [generatingPayments, setGeneratingPayments] = useState(false);
  const [renewingValidity, setRenewingValidity] = useState(false);
  const [cancelingRecurrence, setCancelingRecurrence] = useState(false);

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
  const [swSubmitting, setSwSubmitting] = useState(false);

  const handleOpenSalesWizard = (client: any) => {
    const com = client.dadosComerciais || {};
    const activePlans = plans.filter((p: any) => p.ativo !== false);
    const defaultPlanId = com.planoId?._id || com.planoId || (activePlans[0]?._id || (plans[0]?._id || ''));
    const planObj = plans.find(p => p._id === defaultPlanId) || activePlans[0] || plans[0];
    const freq = com.frequencia || client.frequencia || 2;
    const defaultCreditos = com.creditosTotal !== undefined ? com.creditosTotal : (freq === 1 ? 4 : freq === 2 ? 9 : freq === 3 ? 13 : freq === 4 ? 17 : 22);
    const isAnual = (com.duracao || (planObj?.tipo === 'Anual' ? 'anual' : 'mensal')) === 'anual';

    setSalesWizardClient(client);
    setSwPlano(defaultPlanId);
    setSwDuracao(com.duracao || (planObj?.tipo === 'Anual' ? 'anual' : 'mensal'));
    setSwVigenciaQtd(com.duracaoQtd || (planObj?.tipo === 'Anual' ? 12 : 1));
    setSwDataInicio(com.dataInicio || new Date().toISOString().split('T')[0]);
    setSwValorUnitario(com.valorUnitario !== undefined ? com.valorUnitario : (planObj?.preco || 0));
    setSwDescontoTipo(com.descontoTipo || 'percentual');
    setSwDescontoValor(com.descontoValor || 0);
    setSwFrequencia(freq);
    setSwCreditosMensais(defaultCreditos);
    setSwCreditosMassagem(com.creditosMassagem !== undefined ? com.creditosMassagem : (isAnual ? 1 : 0));
    setSwCreditosEmergencia(com.creditosEmergencia !== undefined ? com.creditosEmergencia : (isAnual ? 1 : 0));
  };

  const handleConfirmSalesWizard = async () => {
    if (!salesWizardClient || !swPlano) {
      alert('Por favor, selecione um plano.');
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
        criarRecorrenciaMensal: false,
        recorrenciaMeses: 12,
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

      // 2. Salvar dados comerciais no cadastro do aluno
      await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: salesWizardClient._id,
          dadosComerciais: {
            planoId: swPlano,
            status: 'lead',
            duracao: swDuracao,
            duracaoQtd: swVigenciaQtd,
            valorUnitario: swValorUnitario,
            vencimento: dataFimCalculada,
            dataInicio: swDataInicio,
            frequencia: swFrequencia,
            creditosTotal: swCreditosMensais,
            creditosMassagem: swCreditosMassagem,
            creditosMassagemTotal: swCreditosMassagem,
            creditosEmergencia: swCreditosEmergencia,
            creditosEmergenciaTotal: swCreditosEmergencia,
            descontoTipo: swDescontoTipo,
            descontoValor: swDescontoValor
          }
        })
      });

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
    setDcwVigenciaQtd(com.duracaoQtd || (planObj?.tipo === 'Anual' ? 12 : 1));
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
      const resData = await res.json();
      if (!resData.success) {
        alert('Erro ao salvar dados comerciais: ' + resData.error);
        return;
      }

      if (action === 'clicksign') {
        const signRes = await fetch('/api/clicksign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: directContractClient._id,
            planoId: dcwPlano,
            valorFinal: calculatedValorLiquido,
            formaPagamento: dcwFormaPag,
            parcelas: dcwParcelas,
            dataVencimento: dcwVencimento || dcwDataInicio,
            dataInicio: dcwDataInicio
          })
        });
        const signData = await signRes.json();
        if (signData.success) {
          alert('Contrato emitido e enviado com sucesso para a Clicksign!');
        } else {
          alert('Dados comerciais atualizados, mas houve aviso da Clicksign: ' + signData.error);
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

      const isAnual = dcDuracao === 'anual';
      const bruto = dcValorUnitario * dcVigenciaQtd;
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
    
    setDcPlano(com.planoId?._id || com.planoId || '');
    setDcStatus(com.status === 'lead' ? 'ativo' : (com.status || 'ativo'));
    setDcFormaPag(com.formaPagamento || 'pix');
    setDcDuracao(com.duracao || 'mensal');
    setDcVigenciaQtd(com.duracaoQtd || 1);
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

      const res = await fetch('/api/clients', {
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
            recorrenciaMeses: dcRecorrenciaMeses
          }
        })
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Gestão Completa de Contratos</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              Gerencie dados comerciais dos alunos, emita contratos e acompanhe assinaturas eletrônicas na Clicksign.
            </p>
          </div>

          {/* Sub-tabs switch */}
          <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => setSubTab('alunos')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: subTab === 'alunos' ? 'var(--color-primary)' : 'transparent',
                color: subTab === 'alunos' ? '#fff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <i className="fa-solid fa-users"></i> Alunos & Emissão
            </button>
            <button
              type="button"
              onClick={() => setSubTab('clicksign')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: subTab === 'clicksign' ? 'var(--color-primary)' : 'transparent',
                color: subTab === 'clicksign' ? '#fff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <i className="fa-brands fa-whatsapp" style={{ color: subTab === 'clicksign' ? '#fff' : '#22c55e' }}></i> Controle Clicksign
            </button>
          </div>
        </div>

        {subTab === 'clicksign' ? (
          <ClicksignPanel />
        ) : (
          <>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ flex: '1 1 240px', maxWidth: '300px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar por nome, plano, CPF, status..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Status Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    <i className="fa-solid fa-filter" style={{ color: 'var(--color-primary)', marginRight: '4px' }}></i> Status:
                  </label>
                  <select
                    className="select-custom"
                    value={contratoStatusFilter}
                    onChange={e => setContratoStatusFilter(e.target.value)}
                    style={{ minWidth: '140px', fontSize: '0.83rem', padding: '6px 10px' }}
                  >
                    <option value="todos">🌐 Todos os Status</option>
                    <option value="ativo">✅ Contrato Ativo</option>
                    <option value="lead">🟣 Leads / Avaliação</option>
                    <option value="pendente">⏳ Pendentes</option>
                    <option value="congelado">❄️ Congelados</option>
                  </select>
                </div>

                {/* Plan Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    <i className="fa-solid fa-layer-group" style={{ color: 'var(--color-primary)', marginRight: '4px' }}></i> Plano:
                  </label>
                  <select
                    className="select-custom"
                    value={contratoPlanFilter}
                    onChange={e => setContratoPlanFilter(e.target.value)}
                    style={{ minWidth: '160px', fontSize: '0.83rem', padding: '6px 10px' }}
                  >
                    <option value="todos">📁 Todos os Planos</option>
                    {plans.map((p: any) => (
                      <option key={p._id} value={p._id}>{p.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Sort Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    <i className="fa-solid fa-arrow-down-a-z" style={{ color: 'var(--color-primary)', marginRight: '4px' }}></i> Ordenar:
                  </label>
                  <select
                    className="select-custom"
                    value={sortOption}
                    onChange={e => setSortOption(e.target.value)}
                    style={{ minWidth: '150px', fontSize: '0.83rem', padding: '6px 10px' }}
                  >
                    <option value="vencimento_asc">⏳ Vencimento Próximo</option>
                    <option value="vencimento_desc">📅 Vencimento Distante</option>
                    <option value="alfabetico_asc">🔤 Nome (A - Z)</option>
                    <option value="alfabetico_desc">🔤 Nome (Z - A)</option>
                    <option value="inicio_desc">🆕 Contratos Recentes</option>
                    <option value="status">⚡ Ativos Primeiro</option>
                  </select>
                </div>

                {/* View Mode Toggle */}
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: viewMode === 'cards' ? 'var(--color-primary)' : 'transparent',
                      color: viewMode === 'cards' ? '#fff' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <i className="fa-solid fa-grip"></i> Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: viewMode === 'table' ? 'var(--color-primary)' : 'transparent',
                      color: viewMode === 'table' ? '#fff' : 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <i className="fa-solid fa-list"></i> Tabela
                  </button>
                </div>

                {/* Reset Button */}
                {(searchQuery !== '' || contratoStatusFilter !== 'todos' || contratoPlanFilter !== 'todos' || sortOption !== 'vencimento_asc') && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setSearchQuery('');
                      setContratoStatusFilter('todos');
                      setContratoPlanFilter('todos');
                      setSortOption('vencimento_asc');
                    }}
                    style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <i className="fa-solid fa-xmark"></i> Limpar
                  </button>
                )}
              </div>
            </div>

        <div className="content-panel">
          {viewMode === 'cards' ? (
            /* ==========================================
               CARDS EXECUTIVOS MOBILE & DESKTOP GRID
               ========================================== */
            <div>
              {sortedClients.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <i className="fa-solid fa-file-excel" style={{ fontSize: '2.5rem', color: 'var(--text-dim)', marginBottom: '12px' }}></i>
                  <h4 style={{ margin: '0 0 6px', fontSize: '1.1rem' }}>Nenhum aluno encontrado</h4>
                  <p style={{ fontSize: '0.85rem' }}>Ajuste os filtros ou o termo de busca para visualizar contratos.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                  {sortedClients.map((c: any) => {
                    const com = c.dadosComerciais || {};
                    const plan = plans.find(p => p._id === (com.planoId?._id || com.planoId));
                    const info = getContractValidityInfo(c, plan);

                    const rawTel = (c.dadosPessoais?.telefone || '').replace(/\D/g, '');
                    const firstName = (c.dadosPessoais?.nome || 'Aluno').split(' ')[0];
                    const waMsg = encodeURIComponent(`Olá ${firstName}! Tudo bem? Entramos em contato referente ao seu plano no Clube Fitness.`);
                    const waLink = rawTel ? `https://wa.me/55${rawTel}?text=${waMsg}` : null;

                    const dtNasc = c.dadosPessoais?.dataNascimento || c.dadosPessoais?.nascimento;
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
                          {/* Header do Card (Sem Avatar) */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.2px', wordBreak: 'break-word' }}>
                                {c.dadosPessoais?.nome || 'Sem Nome'}
                              </h3>
                              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px', fontWeight: 500, lineHeight: 1.4 }}>
                                {c.dadosPessoais?.cpf ? `CPF: ${c.dadosPessoais.cpf}` : (c.dadosPessoais?.telefone || 'Sem contato')}
                                {birthDateFormatted && ` • Nasc: ${birthDateFormatted}`}
                              </div>
                            </div>

                            <span style={{
                              background: info.statusKey === 'ativo' ? '#065f46' : info.statusKey === 'vencido' ? '#991b1b' : info.statusKey === 'congelado' ? '#92400e' : '#334155',
                              color: '#ffffff',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 750,
                              letterSpacing: '0.4px',
                              textTransform: 'uppercase',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}>
                              {info.statusLabel}
                            </span>
                          </div>

                          {/* Bloco de Vigência e Condição Financeira Executivo */}
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem' }}>
                              <span style={{ color: '#94a3b8', fontWeight: 500 }}>Plano:</span>
                              <strong style={{ color: '#ffffff', fontWeight: 700, textAlign: 'right' }}>
                                {plan?.nome || 'Não definido'}
                              </strong>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                              <span style={{ color: '#94a3b8', fontWeight: 500 }}>Vigência:</span>
                              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <strong style={{ color: '#f1f5f9', fontWeight: 600 }}>
                                  {`${info.dataInicioFormatted} até ${info.dataFimFormatted}`}
                                </strong>
                                {info.daysLeftText && (
                                  <span style={{
                                    background: info.isExpired ? '#7f1d1d' : info.isExpiringSoon ? '#78350f' : '#064e3b',
                                    color: '#ffffff',
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

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', borderTop: '1px solid #1e293b', paddingTop: '6px' }}>
                              <span style={{ color: '#94a3b8', fontWeight: 500 }}>Condição:</span>
                              <strong style={{ color: '#38bdf8', fontWeight: 700 }}>
                                {com.valorUnitario ? `R$ ${com.valorUnitario.toFixed(2).replace('.', ',')} (${(com.formaPagamento || 'pix').toUpperCase()}${com.parcelas > 1 ? ` ${com.parcelas}x` : ''})` : 'A definir'}
                              </strong>
                            </div>

                            {Boolean(com.criarRecorrenciaMensal || com.recorrenciaVigencia) && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#93c5fd', background: '#1e293b', padding: '4px 8px', borderRadius: '6px' }}>
                                <i className="fa-solid fa-arrows-rotate"></i> Recorrência Mensal Ativada
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Ações Executivas Guiadas */}
                        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setConsultingClient(c)}
                              style={{
                                background: '#1e293b',
                                border: '1px solid #334155',
                                color: '#f1f5f9',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}
                              title="Consultar resumo completo do contrato em modo de leitura"
                            >
                              <i className="fa-solid fa-eye" style={{ color: '#94a3b8' }}></i> Consultar
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenAsaasModal(c)}
                              style={{
                                background: '#1e293b',
                                border: '1px solid #334155',
                                color: '#f1f5f9',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}
                              title="Buscar e sincronizar faturas do cliente no Asaas"
                            >
                              <i className="fa-solid fa-credit-card" style={{ color: '#38bdf8' }}></i> Asaas
                            </button>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenSalesWizard(c)}
                              style={{
                                background: '#1e293b',
                                border: '1px solid #334155',
                                color: '#f1f5f9',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}
                              title="Gerar Link de Venda para o Aluno Preencher no Celular"
                            >
                              <i className="fa-solid fa-link" style={{ color: '#c084fc' }}></i> Link Venda
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenDirectContractWizard(c)}
                              style={{
                                background: '#1e293b',
                                border: '1px solid #334155',
                                color: '#f1f5f9',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}
                              title="Preencher Dados e Emitir Contrato / Clicksign Diretamente"
                            >
                              <i className="fa-solid fa-file-signature" style={{ color: '#34d399' }}></i> Emitir Contrato
                            </button>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleGenerateRenewalLink(c)}
                              disabled={Boolean(generatingRenewalClientId)}
                              style={{
                                background: '#1e293b',
                                border: '1px solid #334155',
                                color: '#f1f5f9',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                              }}
                              title="Gerar Link de Renovação com Reajuste de 5%"
                            >
                              {generatingRenewalClientId === c._id ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-arrows-rotate" style={{ color: '#fbbf24' }}></i>}
                              Renovação
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSelectClient(c)}
                              style={{
                                background: '#059669',
                                border: '1px solid #047857',
                                color: '#ffffff',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)'
                              }}
                              title="Abrir workspace completo de edição do contrato"
                            >
                              <i className="fa-solid fa-sliders"></i> Gerenciar
                            </button>
                          </div>

                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                background: '#064e3b',
                                border: '1px solid #065f46',
                                color: '#34d399',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
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
                    const info = getContractValidityInfo(c, plan);
                    
                    return (
                      <tr key={c._id}>
                        <td style={{ fontWeight: 600 }}>{c.dadosPessoais?.nome || 'Sem Nome'}</td>
                        <td>{c.dadosPessoais?.cpf || '—'}</td>
                        <td>
                           {plan?.nome || '—'}
                           {Boolean(com.criarRecorrenciaMensal || com.recorrenciaVigencia) && (
                             <div style={{ marginTop: '4px' }}>
                               <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', padding: '3px 6px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '4px' }}>
                                 <i className="fa-solid fa-arrows-rotate fa-spin" style={{ fontSize: '0.6rem' }}></i> Recorrência Ativada
                               </span>
                             </div>
                           )}
                         </td>
                        <td>
                          {`${info.dataInicioFormatted} até ${info.dataFimFormatted}`}
                          {info.daysLeftText && (
                            <span style={{ marginLeft: '6px', fontSize: '0.7rem', padding: '1px 5px', borderRadius: '4px', background: info.badgeBg, color: info.badgeColor, fontWeight: 700 }}>
                              {info.daysLeftText}
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ color: info.badgeColor, fontWeight: 700 }}>{info.statusLabel}</span>
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
                    setDcValorUnitario(activeProposal.valorUnitario * 1.05);
                  } else {
                    setDcValorUnitario(activeProposal.valorUnitario);
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
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.2px' }}>
                    {selectedClient.dadosPessoais?.nome || selectedClient.nome || 'Sem Nome'}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', fontWeight: 500 }}>
                    {selectedClient.dadosPessoais?.cpf ? `CPF: ${selectedClient.dadosPessoais.cpf}` : 'Sem CPF'}
                    {selectedClient.dadosPessoais?.telefone && ` • Tel: ${selectedClient.dadosPessoais.telefone}`}
                    {birthDateFormatted && ` • Nascimento: ${birthDateFormatted}`}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
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

          <div className="form-group">
            <label>Plano</label>
            <select
              className="select-custom"
              value={dcPlano}
              onChange={e => {
                const newPlanoId = e.target.value;
                setDcPlano(newPlanoId);
                const plan = plans.find(p => p._id === newPlanoId);
                if (plan) {
                  setDcValorUnitario(plan.preco);
                  setDcDuracao(plan.tipo === 'Anual' ? 'anual' : 'mensal');
                  setDcVigenciaQtd(plan.tipo === 'Anual' ? 12 : 1);
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
              Status Comercial do Contrato
            </label>
            <select
              className="select-custom"
              value={dcStatus}
              onChange={e => setDcStatus(e.target.value)}
              style={{ fontWeight: 600 }}
            >
              <option value="ativo">🟢 Contrato Ativo (Matrícula Efetivada)</option>
              <option value="lead">🟣 Lead / Em Avaliação</option>
              <option value="congelado">🟡 Congelado</option>
              <option value="inativo">⚪ Sem Contrato Ativo / Inativo</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label>Forma de Pagamento</label>
              <select className="select-custom" value={dcFormaPag} onChange={e => setDcFormaPag(e.target.value)} required>
                <option value="pix">Pix</option>
                <option value="cartao">Cartão de Crédito</option>
                <option value="boleto">Boleto Bancário</option>
                <option value="dinheiro">Dinheiro</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label>Dia de Vencimento (1º Vencimento)</label>
              <input
                type="date"
                className="form-control"
                value={dcVencimento}
                onChange={e => setDcVencimento(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label>Tipo Vigência</label>
              <select className="select-custom" value={dcDuracao} onChange={e => setDcDuracao(e.target.value as any)} required>
                <option value="semana">Semana</option>
                <option value="mensal">Mensal</option>
                <option value="anual">Anual</option>
                <option value="indeterminado">Indeterminado</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label>Qtd Vigência</label>
              <input
                type="number"
                className="form-control"
                value={dcVigenciaQtd}
                onFocus={selectOnFocus}
                onChange={e => setDcVigenciaQtd(Math.max(1, parseInt(e.target.value.replace(/^0+(?=\d)/, '') || '0', 10)))}
                min={1}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label>Desconto Tipo</label>
              <select className="select-custom" value={dcDescontoTipo} onChange={e => setDcDescontoTipo(e.target.value as any)}>
                <option value="percentual">Percentual (%)</option>
                <option value="fixo">Fixo (R$)</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label>Desconto Valor</label>
              <input
                type="text"
                inputMode="decimal"
                className="form-control"
                value={dcDescontoValor ? (dcDescontoTipo === 'percentual' ? String(dcDescontoValor) : formatCurrencyBRL(dcDescontoValor)) : ''}
                onFocus={selectOnFocus}
                onChange={e => {
                  if (dcDescontoTipo === 'percentual') {
                    const raw = e.target.value.replace(/\D/g, '');
                    setDcDescontoValor(raw ? Math.min(100, parseInt(raw, 10)) : 0);
                  } else {
                    const rawDigits = e.target.value.replace(/\D/g, '');
                    const num = rawDigits ? parseInt(rawDigits, 10) / 100 : 0;
                    setDcDescontoValor(num);
                  }
                }}
                placeholder={dcDescontoTipo === 'percentual' ? '0%' : '0,00'}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label>Nº Parcelas</label>
              <select className="select-custom" value={dcParcelas} onChange={e => setDcParcelas(Number(e.target.value))} required>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}x</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label>Valor Unitário (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                className="form-control"
                value={dcValorUnitario ? formatCurrencyBRL(dcValorUnitario) : ''}
                onFocus={selectOnFocus}
                onChange={e => {
                  const rawDigits = e.target.value.replace(/\D/g, '');
                  const num = rawDigits ? parseInt(rawDigits, 10) / 100 : 0;
                  setDcValorUnitario(num);
                }}
                placeholder="0,00"
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label>Frequência Semanal Contratada</label>
              <select
                className="select-custom"
                value={dcFrequencia}
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
              <label>Data de Início</label>
              <input
                type="date"
                className="form-control"
                value={dcDataInicio}
                onChange={e => setDcDataInicio(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label>Créditos Mensais</label>
              <input
                type="number"
                className="form-control"
                value={dcCreditosTotal}
                onFocus={selectOnFocus}
                onChange={e => setDcCreditosTotal(parseInt(e.target.value.replace(/^0+(?=\d)/, '') || '0', 10))}
                min={0}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label>Créditos de Massagem (Mensais)</label>
              <input
                type="number"
                className="form-control"
                value={dcCreditosMassagem}
                onFocus={selectOnFocus}
                onChange={e => setDcCreditosMassagem(parseInt(e.target.value.replace(/^0+(?=\d)/, '') || '0', 10))}
                min={0}
              />
            </div>
            <div className="form-group" style={{ flex: '1 1 200px' }}>
              <label>Créditos de Emergência (Mensais)</label>
              <input
                type="number"
                className="form-control"
                value={dcCreditosEmergencia}
                onFocus={selectOnFocus}
                onChange={e => setDcCreditosEmergencia(parseInt(e.target.value.replace(/^0+(?=\d)/, '') || '0', 10))}
                min={0}
              />
            </div>
          </div>

          {/* CAIXA DE RECORRÊNCIA MENSAL AUTOMÁTICA */}
          <div style={{ marginTop: '8px', marginBottom: '16px', padding: '14px', background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)', margin: 0 }}>
              <input
                type="checkbox"
                checked={dcCriarRecorrencia}
                onChange={e => setDcCriarRecorrencia(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
              />
              <span><i className="fa-solid fa-arrows-rotate" style={{ marginRight: '6px', color: '#3b82f6' }}></i> Criar Recorrência Mensal Automática para este Plano</span>
            </label>
            {dcCriarRecorrencia && (
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Duração da Recorrência Mensal:</label>
                <select
                  className="select-custom"
                  value={dcRecorrenciaMeses}
                  onChange={e => setDcRecorrenciaMeses(Number(e.target.value))}
                  style={{ width: '160px', padding: '6px 10px', fontSize: '0.83rem' }}
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
            <label>Observações Contratuais (Opcional)</label>
            <textarea
              className="form-control"
              value={dcObservacoesContratuais}
              onChange={e => setDcObservacoesContratuais(e.target.value)}
              placeholder="Inserir observações opcionais..."
              style={{ minHeight: '60px', resize: 'vertical' }}
            />
          </div>

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
                  onClick={() => handleGenerateProposalLink()}
                >
                  {generatingProposal ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Gerando...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-share-nodes"></i> Gerar Link de Venda
                    </>
                  )}
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
        const info = getContractValidityInfo(consultingClient, plan);

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
                    <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px', fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                          {consultingClient.dadosPessoais?.nome || 'Sem Nome'}
                        </h4>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4 }}>
                          CPF: <strong style={{ color: '#ffffff' }}>{consultingClient.dadosPessoais?.cpf || '—'}</strong>
                          {consultingClient.dadosPessoais?.telefone && ` • Tel: ${consultingClient.dadosPessoais.telefone}`}
                          {birthDateFormatted && ` • Nascimento: ${birthDateFormatted}`}
                        </div>
                        {consultingClient.dadosPessoais?.email && (
                          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                            E-mail: {consultingClient.dadosPessoais.email}
                          </div>
                        )}
                      </div>
                      <span style={{
                        background: info.statusKey === 'ativo' ? '#065f46' : info.statusKey === 'vencido' ? '#991b1b' : info.statusKey === 'congelado' ? '#92400e' : '#334155',
                        color: '#ffffff',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 750,
                        letterSpacing: '0.4px',
                        textTransform: 'uppercase'
                      }}>
                        {info.statusLabel}
                      </span>
                    </div>
                  );
                })()}

                {/* Vigência e Datas */}
                <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
                    <i className="fa-solid fa-calendar-check" style={{ color: 'var(--color-primary)', marginRight: '6px' }}></i> Plano & Vigência
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Plano Contratado</div>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{plan?.nome || 'Não definido'}</strong>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Duração / Modalidade</div>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)', textTransform: 'capitalize' }}>
                        {com.duracao || 'Mensal'} {com.duracaoQtd ? `(${com.duracaoQtd}x)` : ''}
                      </strong>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Data de Início</div>
                      <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>
                        {info.dataInicioFormatted}
                      </strong>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Vencimento Final</div>
                      <strong style={{ fontSize: '0.92rem', color: info.isExpired ? '#ef4444' : info.isExpiringSoon ? '#f59e0b' : '#10b981' }}>
                        {info.dataFimFormatted}
                        {info.daysLeftText && ` (${info.daysLeftText})`}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Frequência e Créditos */}
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
                        {com.creditosTotal !== undefined ? `${com.creditosTotal} aulas` : '—'}
                      </strong>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Créditos de Massagem</div>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {com.creditosMassagem !== undefined ? `${com.creditosMassagem} sessão(ões)/mês` : '0'}
                      </strong>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Créditos de Emergência</div>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {com.creditosEmergencia !== undefined ? `${com.creditosEmergencia} sessão(ões)/mês` : '0'}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Condições Financeiras */}
                <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
                    <i className="fa-solid fa-wallet" style={{ color: 'var(--color-primary)', marginRight: '6px' }}></i> Condições Financeiras
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Valor Unitário / Mensal</div>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                        {com.valorUnitario ? `R$ ${com.valorUnitario.toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
                      </strong>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Forma de Pagamento</div>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)', textTransform: 'uppercase' }}>
                        {com.formaPagamento || 'PIX'} {com.parcelas > 1 ? `(${com.parcelas}x)` : ''}
                      </strong>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>1º Vencimento</div>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                        {com.dataPrimeiroVencimento ? new Date(com.dataPrimeiroVencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                      </strong>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Recorrência Asaas</div>
                      <strong style={{ fontSize: '0.85rem', color: com.criarRecorrenciaMensal ? '#3b82f6' : 'var(--text-dim)' }}>
                        {com.criarRecorrenciaMensal ? `Ativa (${com.recorrenciaMeses || 12} meses)` : 'Desativada'}
                      </strong>
                    </div>
                  </div>
                </div>
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
                <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '10px', padding: '12px', fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                  💡 <strong>Como funciona:</strong> Informe os dados comerciais acordados. O aluno receberá o link exclusivo para escolher as parcelas (até 12x), a forma de pagamento (Pix/Cartão/Boleto) e o 1º vencimento no próprio smartphone!
                </div>

                {/* Plano Ativo */}
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Plano Comercial (Ativos)</label>
                  <select
                    className="select-custom"
                    style={{ width: '100%', padding: '10px' }}
                    value={swPlano}
                    onChange={e => {
                      const pid = e.target.value;
                      setSwPlano(pid);
                      const pObj = plans.find(p => p._id === pid);
                      if (pObj) {
                        setSwValorUnitario(pObj.preco || 0);
                        if (pObj.tipo === 'Anual') {
                          setSwDuracao('anual');
                          setSwVigenciaQtd(12);
                          setSwCreditosMassagem(1);
                          setSwCreditosEmergencia(1);
                        } else {
                          setSwDuracao('mensal');
                          setSwVigenciaQtd(1);
                        }
                      }
                    }}
                  >
                    {activePlans.map((p: any) => (
                      <option key={p._id} value={p._id}>{p.nome}</option>
                    ))}
                  </select>
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
                      <option value={1}>1x por semana (4 aulas/mês)</option>
                      <option value={2}>2x por semana (9 aulas/mês)</option>
                      <option value={3}>3x por semana (13 aulas/mês)</option>
                      <option value={4}>4x por semana (17 aulas/mês)</option>
                      <option value={5}>5x por semana (22 aulas/mês)</option>
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
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Valor Unitário (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      style={{ padding: '9px 10px', fontWeight: 750, color: 'var(--color-primary)' }}
                      value={swValorUnitario}
                      onChange={e => setSwValorUnitario(parseFloat(e.target.value) || 0)}
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
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder={swDescontoTipo === 'percentual' ? '0%' : '0,00'}
                      style={{ padding: '9px 10px' }}
                      value={swDescontoValor}
                      onChange={e => setSwDescontoValor(parseFloat(e.target.value) || 0)}
                    />
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
                  disabled={swSubmitting || !swPlano}
                  style={{ background: '#8b5cf6', borderColor: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '6px' }}
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
                          <option value={1}>1x por semana (4 aulas/mês)</option>
                          <option value={2}>2x por semana (9 aulas/mês)</option>
                          <option value={3}>3x por semana (13 aulas/mês)</option>
                          <option value={4}>4x por semana (17 aulas/mês)</option>
                          <option value={5}>5x por semana (22 aulas/mês)</option>
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
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Valor Unitário (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          style={{ padding: '9px 10px', fontWeight: 750, color: 'var(--color-primary)' }}
                          value={dcwValorUnitario}
                          onChange={e => setDcwValorUnitario(parseFloat(e.target.value) || 0)}
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
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          placeholder={dcwDescontoTipo === 'percentual' ? '0%' : '0,00'}
                          style={{ padding: '9px 10px' }}
                          value={dcwDescontoValor}
                          onChange={e => setDcwDescontoValor(parseFloat(e.target.value) || 0)}
                        />
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

                    <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          id="dcwRecorrenciaCheck"
                          checked={dcwCriarRecorrencia}
                          onChange={e => setDcwCriarRecorrencia(e.target.checked)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <label htmlFor="dcwRecorrenciaCheck" style={{ fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', margin: 0 }}>
                          Ativar Recorrência Mensal Automática no Asaas
                        </label>
                      </div>
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
    </div>
  );
}
