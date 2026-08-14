'use client';

import React, { useState, useEffect, useRef } from 'react';
import { downloadContractPDF, getContractPDFBase64 } from '@/utils/pdfGenerator';
import { generateContractTemplate as getUnifiedTemplate } from '@/utils/contractTemplate';
import { validateContractClientData } from '@/utils/contractValidator';
import { formatCurrencyBRL, selectOnFocus } from '@/utils/currencyMask';
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
  const [contracts, setContracts] = useState<any[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [generatingPayments, setGeneratingPayments] = useState(false);
  const [renewingValidity, setRenewingValidity] = useState(false);
  const [cancelingRecurrence, setCancelingRecurrence] = useState(false);

  // Form states (Dados Comerciais)
  const [dcPlano, setDcPlano] = useState('');
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

  // Filter and sort clients
  const sortedClients = [...clients]
    .filter(c => {
      const nome = c.dadosPessoais?.nome || '';
      const cpf = c.dadosPessoais?.cpf || '';
      const q = normalizeText(searchQuery);
      return normalizeText(nome).includes(q) || cpf.includes(q);
    })
    .sort((a: any, b: any) => {
      const comA = a.dadosComerciais || {};
      const comB = b.dadosComerciais || {};
      const nomeA = a.dadosPessoais?.nome || '';
      const nomeB = b.dadosPessoais?.nome || '';

      if (sortOption === 'vencimento_asc') {
        const vencA = comA.vencimento || '9999-12-31';
        const vencB = comB.vencimento || '9999-12-31';
        return vencA.localeCompare(vencB);
      }
      if (sortOption === 'vencimento_desc') {
        const vencA = comA.vencimento || '0000-01-01';
        const vencB = comB.vencimento || '0000-01-01';
        return vencB.localeCompare(vencA);
      }
      if (sortOption === 'alfabetico_asc') {
        return nomeA.localeCompare(nomeB, 'pt-BR');
      }
      if (sortOption === 'alfabetico_desc') {
        return nomeB.localeCompare(nomeA, 'pt-BR');
      }
      if (sortOption === 'inicio_desc') {
        const iniA = comA.dataInicio || '0000-01-01';
        const iniB = comB.dataInicio || '0000-01-01';
        return iniB.localeCompare(iniA);
      }
      if (sortOption === 'status') {
        const statusOrder: Record<string, number> = { ativo: 1, assinado: 1, congelado: 2, lead: 3, pendente: 4, cancelado: 5 };
        const orderA = statusOrder[comA.status || 'pendente'] || 99;
        const orderB = statusOrder[comB.status || 'pendente'] || 99;
        return orderA - orderB;
      }
      return 0;
    });

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

  // Auto-polling for pending contracts on active client view
  useEffect(() => {
    if (!selectedClient) return;
    const hasPending = contracts.some(c => c.clicksignDocKey && (c.status === 'pendente' || c.clicksignStatus === 'pendente'));
    if (!hasPending) return;

    const interval = setInterval(() => {
      loadContracts(selectedClient._id, true);
      fetchData(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedClient, contracts]);

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

  // Render Client List General View
  if (!selectedClient) {
    return (
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
            <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: '1 1 280px', maxWidth: '360px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar aluno por nome ou CPF..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              <i className="fa-solid fa-arrow-down-short-wide" style={{ marginRight: '6px', color: 'var(--color-primary)' }}></i>
              Ordenar por:
            </label>
            <select
              className="select-custom"
              value={sortOption}
              onChange={e => setSortOption(e.target.value)}
              style={{ minWidth: '230px', fontSize: '0.85rem' }}
            >
              <option value="vencimento_asc">⏳ Próximo a Encerrar (Vencimento)</option>
              <option value="vencimento_desc">📅 Vencimento Mais Distante</option>
              <option value="alfabetico_asc">🔤 Ordem Alfabética (A - Z)</option>
              <option value="alfabetico_desc">🔤 Ordem Alfabética (Z - A)</option>
              <option value="inicio_desc">🆕 Contratos Mais Recentes</option>
              <option value="status">⚡ Status (Contratos Ativos Primeiro)</option>
            </select>
          </div>
        </div>

        <div className="content-panel">
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
                  const status = com.status || 'pendente';
                  const isLead = status === 'lead';
                  const isClientActive = status === 'ativo' || status === 'assinado';
                  const stLabel = isClientActive ? 'Contrato Ativo' : isLead ? 'Lead / Em Avaliação' : status === 'congelado' ? 'Congelado' : 'Sem Contrato Ativo';
                  const stColor = isClientActive ? 'var(--color-success)' : isLead ? '#8b5cf6' : status === 'congelado' ? 'var(--color-warning)' : 'var(--text-dim)';
                  
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
                        {com.dataInicio ? `${new Date(com.dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')} até ${com.vencimento ? new Date(com.vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}` : '—'}
                      </td>
                      <td>
                        <span style={{ color: stColor, fontWeight: 700 }}>{stLabel}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          {!isClientActive && (
                            <button
                              className="btn btn-success"
                              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Vender Plano / Converter Lead em Aluno Ativo"
                              onClick={() => handleSelectClient(c)}
                            >
                              <i className="fa-solid fa-cart-shopping"></i> Vender Plano
                            </button>
                          )}
                          <button
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => handleSelectClient(c)}
                          >
                            <i className="fa-solid fa-file-signature" style={{ marginRight: '6px' }}></i> Gerenciar Contratos
                          </button>
                          <button
                             className="btn btn-secondary"
                             style={{ padding: '6px 10px', fontSize: '0.78rem', color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.08)' }}
                             onClick={() => handleRenewContractValidity(c)}
                             title="Estender a vigência comercial em +1 ciclo e lançar a parcela no Financeiro"
                           >
                             <i className="fa-solid fa-arrows-rotate" style={{ marginRight: '4px' }}></i> Renovar Vigência
                           </button>

                           <button
                             className="btn btn-secondary"
                             style={{ 
                               padding: '6px 10px', 
                               fontSize: '0.78rem', 
                               color: '#10b981', 
                               borderColor: 'rgba(16,185,129,0.3)', 
                               background: generatingRenewalClientId === c._id ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.08)',
                               opacity: generatingRenewalClientId && generatingRenewalClientId !== c._id ? 0.5 : 1,
                               cursor: generatingRenewalClientId ? 'not-allowed' : 'pointer',
                               display: 'inline-flex',
                               alignItems: 'center',
                               gap: '4px'
                             }}
                             disabled={Boolean(generatingRenewalClientId)}
                             onClick={() => handleGenerateRenewalLink(c)}
                             title="Gerar link de auto-renovação com reajuste automático de 5% para enviar ao aluno"
                           >
                             {generatingRenewalClientId === c._id ? (
                               <>
                                 <i className="fa-solid fa-circle-notch fa-spin"></i> Gerando Link...
                               </>
                             ) : (
                               <>
                                 <i className="fa-solid fa-link"></i> Link de Renovação
                               </>
                             )}
                           </button>

                           {Boolean(com.criarRecorrenciaMensal || com.recorrenciaVigencia) && (
                             <button
                               className="btn btn-secondary"
                               style={{ padding: '6px 10px', fontSize: '0.78rem', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}
                               onClick={() => handleCancelRecurrence(c)}
                               title="Finalizar e encerrar a recorrência mensal deste plano"
                             >
                               <i className="fa-solid fa-circle-stop" style={{ marginRight: '4px' }}></i> Finalizar Recorrência
                             </button>
                           )}
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
          </div>
        </>
        )}
      </div>
    );
  }

  // Render Detailed Workspace View for Selected Client
  return (
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
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '8px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.18)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.15rem',
                border: '1px solid rgba(16, 185, 129, 0.4)'
              }}>
                {(selectedClient.dadosPessoais?.nome || selectedClient.nome || 'A').charAt(0).toUpperCase()}
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', fontWeight: 700, display: 'block' }}>
                  Aluno em Atendimento
                </span>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {selectedClient.dadosPessoais?.nome || selectedClient.nome || 'Sem Nome'}
                </h3>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {selectedClient.dadosPessoais?.cpf && (
                <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  CPF: <strong style={{ color: 'var(--text-main)' }}>{selectedClient.dadosPessoais.cpf}</strong>
                </span>
              )}
              {selectedClient.dadosPessoais?.telefone && (
                <span style={{ fontSize: '0.8rem', padding: '4px 10px', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <i className="fa-solid fa-phone" style={{ marginRight: '4px', color: 'var(--color-primary)' }}></i>
                  {selectedClient.dadosPessoais.telefone}
                </span>
              )}
            </div>
          </div>

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
              {plans.map(p => (
                <option key={p._id} value={p._id}>{p.nome}</option>
              ))}
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
                <strong>{activeRenewal.planoNome}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Vigência do Novo Contrato:</span>
                <strong style={{ color: '#10b981' }}>
                  {activeRenewal.vigenciaMeses} meses ({new Date(activeRenewal.dataInicioRenovacao + 'T12:00:00').toLocaleDateString('pt-BR')} até {new Date(activeRenewal.dataFimCalculada + 'T12:00:00').toLocaleDateString('pt-BR')})
                </strong>
              </div>
              <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Valor da Mensalidade:</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981' }}>
                  R$ {activeRenewal.valorReajustado.toFixed(2).replace('.', ',')}/mês
                </span>
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
                
                let message = '';
                if (activeRenewal.isExpired) {
                  message = 
                    `🏋️‍♂️ *Olá, ${clientName}! Tudo bem?*\n\n` +
                    `Seu último contrato no *Clube Fitness & Fisio* encerrou no dia *${dataFimFormat}*.\n\n` +
                    `Veja os detalhes exclusivos da sua renovação! Preparamos condições especiais de renovação para reativar o seu plano: 📄✨\n\n` +
                    `👉 ${generatedRenewalUrl}\n\n` +
                    `_Qualquer dúvida, estamos à total disposição!_ 💚`;
                } else {
                  message = 
                    `🏋️‍♂️ *Olá, ${clientName}! Tudo bem?*\n\n` +
                    `Seu plano no *Clube Fitness & Fisio* irá se encerrar no dia *${dataFimFormat}*.\n\n` +
                    `Veja os detalhes exclusivos da sua renovação e garanta a continuidade dos seus treinos e benefícios sem interrupções! 📄✨\n\n` +
                    `👉 ${generatedRenewalUrl}\n\n` +
                    `_Qualquer dúvida, estamos à total disposição!_ 💚`;
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
    </div>
  );
}
