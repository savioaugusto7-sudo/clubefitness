'use client';

import React, { useEffect, useState } from 'react';
import Pagination from './Pagination';
import { downloadContractPDF, downloadStrengthTestPDF, getContractPDFBase64 } from '@/utils/pdfGenerator';
import GestaoContratosPanel from './GestaoContratosPanel';
import AsaasPanel from './AsaasPanel';
import AgendaCompletaPanel from './AgendaCompletaPanel';
import SearchableSelect from './SearchableSelect';
import DadosClinicosPanel from './DadosClinicosPanel';
import WorkoutBuilder from './WorkoutBuilder';


export const normalizeText = (str: string) => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

export const getYearMonth = (dateInput: any): string => {
  if (!dateInput) return '';
  
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '';
    const year = dateInput.getFullYear();
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  let str = '';
  if (typeof dateInput === 'string') {
    str = dateInput;
  } else if (typeof dateInput === 'object' && dateInput !== null) {
    if (typeof dateInput.toISOString === 'function') {
      str = dateInput.toISOString();
    } else {
      str = String(dateInput);
    }
  } else {
    str = String(dateInput);
  }

  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const year = parts[2].trim().substring(0, 4);
      const month = parts[1].trim().padStart(2, '0');
      return `${year}-${month}`;
    }
  }

  const cleanStr = str.split('T')[0];
  const parts = cleanStr.split('-');
  if (parts.length >= 2) {
    const year = parts[0].trim();
    const month = parts[1].trim().padStart(2, '0');
    if (year.length === 4 && month.length === 2) {
      return `${year}-${month}`;
    }
  }

  return '';
};

const formatDateBR = (dateStr: string | undefined): string => {
  if (!dateStr) return '-';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

interface DashboardAdminProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function DashboardAdmin({ activeTab, setActiveTab }: DashboardAdminProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [savingClientProf, setSavingClientProf] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Pagination & UX states
  const [pages, setPages] = useState<Record<string, number>>({});
  const [pageSize, setPageSize] = useState<Record<string, number>>({});

  const getPage = (key: string) => pages[key] || 1;
  const setPage = (key: string, page: number) => {
    setPages(prev => ({ ...prev, [key]: page }));
  };

  const getPageSize = (key: string) => pageSize[key] || 8;
  const setPageSizeForKey = (key: string, size: number) => {
    setPageSize(prev => ({ ...prev, [key]: size }));
    setPage(key, 1);
  };

  // Search states
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const getSearchQuery = (key: string) => searchQueries[key] || '';
  const setSearchQueryForKey = (key: string, query: string) => {
    setSearchQueries(prev => ({ ...prev, [key]: query }));
    setPage(key, 1);
  };

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Form states for CRUD
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'client' | 'professional' | 'credit' | 'user' | 'plan' | 'financial' | 'medication' | 'exercise_request'>('client');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [simulatedDate, setSimulatedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Payments (Mensalidades) States
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentsSearch, setPaymentsSearch] = useState('');
  const [paymentsStatusFilter, setPaymentsStatusFilter] = useState('');
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [showManualPayModal, setShowManualPayModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [mpFormaPag, setMpFormaPag] = useState('Pix Manual');
  const [mpDataPag, setMpDataPag] = useState(new Date().toISOString().split('T')[0]);
  const [mpObservacoes, setMpObservacoes] = useState('');
  const [mpSaving, setMpSaving] = useState(false);
  const [dcAsaasCustomerId, setDcAsaasCustomerId] = useState('');

  // Input states
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [plano, setPlano] = useState('6668ab010101010101010103'); // default Clube Completo
  const [especialidade, setEspecialidade] = useState('');
  const [registro, setRegistro] = useState('');
  const [pin, setPin] = useState('');
  const [userRole, setUserRole] = useState<string>('aluno');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['client']);
  const [creditAmount, setCreditAmount] = useState(1);
  const [resetPassword, setResetPassword] = useState(false);
  const [creditType, setCreditType] = useState<'academia' | 'massagem' | 'emergencia'>('academia');
  const [creditOperation, setCreditOperation] = useState<'add' | 'sub'>('add');


  // New states for the missing features
  const [plans, setPlans] = useState<any[]>([]);
  const [planName, setPlanName] = useState('');
  const [planValidade, setPlanValidade] = useState(30);
  const [planAcademia, setPlanAcademia] = useState(0);
  const [planConsultorio, setPlanConsultorio] = useState(0);
  const [planPrice, setPlanPrice] = useState(0);
  const [planCreditos, setPlanCreditos] = useState(0);

  const [financials, setFinancials] = useState<any[]>([]);
  const [finDesc, setFinDesc] = useState('');
  const [finCat, setFinCat] = useState('');
  const [finValor, setFinValor] = useState(0);
  const [finVenc, setFinVenc] = useState('');
  const [finStatus, setFinStatus] = useState<'Pendente' | 'Pago' | 'Atrasado'>('Pendente');
  const [finForma, setFinForma] = useState('');
  const [finObs, setFinObs] = useState('');
  const [finComprovante, setFinComprovante] = useState('');

  const [medications, setMedications] = useState<any[]>([]);
  const [medNome, setMedNome] = useState('');
  const [medCat, setMedCat] = useState('');
  const [medQuant, setMedQuant] = useState(0);
  const [medUnidade, setMedUnidade] = useState('unidades');
  const [medLote, setMedLote] = useState('');
  const [medValidade, setMedValidade] = useState('');
  const [medObs, setMedObs] = useState('');
  const [medNF, setMedNF] = useState('');

  const [fixedSchedules, setFixedSchedules] = useState<any[]>([]);
  const [agendaConfigs, setAgendaConfigs] = useState<any[]>([]);
  
  // Agenda Configuration Panel form states
  const [acScope, setAcScope] = useState<'grade' | 'servico'>('grade');
  const [acGrade, setAcGrade] = useState<'academia' | 'consultorio'>('academia');
  const [acService, setAcService] = useState('Treino Monitorado');
  const [acFrequency, setAcFrequency] = useState<'permanente' | 'data'>('permanente');
  const [acSelectedDays, setAcSelectedDays] = useState<number[]>([]);
  const [acSpecificDate, setAcSpecificDate] = useState('');
  const [acTime, setAcTime] = useState('08:00');
  const [acAction, setAcAction] = useState<'bloquear' | 'alterar_capacidade' | 'adicionar'>('bloquear');
  const [acCapacity, setAcCapacity] = useState(6);

  // Fixed Schedule form states
  const [showFixedSchedModal, setShowFixedSchedModal] = useState(false);
  const [fsClient, setFsClient] = useState('');
  const [fsDay, setFsDay] = useState(1); // 1 = Monday
  const [fsTime, setFsTime] = useState('08:00');
  const [fsService, setFsService] = useState('Treino Monitorado');
  const [fsDate, setFsDate] = useState(new Date().toISOString().split('T')[0]);
  const [fsDurationType, setFsDurationType] = useState<'contrato' | 'manual' | 'indeterminado'>('contrato');
  const [fsManualEndDate, setFsManualEndDate] = useState('');
  const [strengthTests, setStrengthTests] = useState<any[]>([]);
  const [exerciseRequests, setExerciseRequests] = useState<any[]>([]);
  const [trancamentosAdminList, setTrancamentosAdminList] = useState<any[]>([]);
  const [contractsAdminList, setContractsAdminList] = useState<any[]>([]);
  const [exNome, setExNome] = useState('');
  const [exGrupo, setExGrupo] = useState('PEITO');
  const [exEquip, setExEquip] = useState('');
  const [exInst, setExInst] = useState('');

  // Fichas de Treino States
  const [selectedClientForWorkout, setSelectedClientForWorkout] = useState<any>(null);
  const [workoutSearchAdmin, setWorkoutSearchAdmin] = useState('');

  // Appointment Edit Modal States
  const [showEditAptModal, setShowEditAptModal] = useState(false);
  const [editAptItem, setEditAptItem] = useState<any>(null);
  const [editAptDate, setEditAptDate] = useState('');
  const [editAptTime, setEditAptTime] = useState('');
  const [editAptService, setEditAptService] = useState('Treino Monitorado');
  const [editAptAvailableSlots, setEditAptAvailableSlots] = useState<string[]>([]);
  const [loadingEditAptSlots, setLoadingEditAptSlots] = useState(false);
  const [savingEditApt, setSavingEditApt] = useState(false);

  useEffect(() => {
    if (!showEditAptModal || !editAptDate || !editAptService) return;
    setLoadingEditAptSlots(true);
    fetch(`/api/available-slots?data=${editAptDate}&servico=${encodeURIComponent(editAptService)}`)
      .then(r => r.json())
      .then(d => { if (d.success) setEditAptAvailableSlots(d.data || []); })
      .catch(() => setEditAptAvailableSlots([]))
      .finally(() => setLoadingEditAptSlots(false));
  }, [showEditAptModal, editAptDate, editAptService]);

  const handleOpenEditAptModal = (apt: any) => {
    setEditAptItem(apt);
    setEditAptDate(apt.data || new Date().toISOString().split('T')[0]);
    setEditAptTime(apt.horario || '');
    setEditAptService(apt.servico || 'Treino Monitorado');
    setShowEditAptModal(true);
  };

  const handleSaveEditApt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAptItem) return;
    if (!editAptTime) {
      alert('Selecione o novo horário.');
      return;
    }
    setSavingEditApt(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editAptItem._id,
          data: editAptDate,
          horario: editAptTime,
          servico: editAptService
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Agendamento alterado com sucesso!');
        setShowEditAptModal(false);
        fetchData();
      } else {
        alert('Erro ao alterar agendamento: ' + data.error);
      }
    } catch (e: any) {
      alert('Erro de rede: ' + e.message);
    } finally {
      setSavingEditApt(false);
    }
  };

  const handleCancelApt = async (apt: any) => {
    if (!confirm(`Deseja realmente cancelar o agendamento de ${apt.servico} do dia ${formatDateBR(apt.data)} às ${apt.horario}? O crédito será estornado.`)) return;
    try {
      const res = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: apt._id,
          status: 'cancelado'
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Agendamento cancelado com sucesso e crédito estornado!');
        fetchData();
      } else {
        alert('Erro ao cancelar agendamento: ' + data.error);
      }
    } catch (e: any) {
      alert('Erro de rede: ' + e.message);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const wId = params.get('workoutClientId');
      if (wId && clients.length > 0) {
        const found = clients.find(c => c._id === wId);
        if (found) setSelectedClientForWorkout(found);
      }
    }
  }, [clients]);

  // F2   Ficha completa do aluno
  // Regras Modal
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [rulesClient, setRulesClient] = useState<any>(null);
  const [rulesData, setRulesData] = useState({
    permiteRolagem: false,
    diasRetencaoFalta: 0,
    deducaoFaltaAtraso: 1
  });

  const handleOpenRulesModal = (client: any) => {
    setRulesClient(client);
    setRulesData({
      permiteRolagem: client.dadosComerciais?.regrasCredito?.permiteRolagem || false,
      diasRetencaoFalta: client.dadosComerciais?.regrasCredito?.diasRetencaoFalta || 0,
      deducaoFaltaAtraso: client.dadosComerciais?.regrasCredito?.deducaoFaltaAtraso ?? 1
    });
    setShowRulesModal(true);
  };

  const handleSaveRules = async () => {
    if (!rulesClient) return;
    const payload = {
      id: rulesClient._id,
      dadosComerciais: {
        regrasCredito: rulesData
      }
    };
    const res = await fetch('/api/clients', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      setShowRulesModal(false);
      fetchData();
      alert('Regras de crédito atualizadas!');
    } else {
      alert('Erro ao salvar regras: ' + data.error);
    }
  };

  const [showClientDetailModal, setShowClientDetailModal] = useState(false);
  const [clientDetailTab, setClientDetailTab] = useState<'pessoais' | 'clinicos' | 'comerciais' | 'contratos'>('pessoais');
  const [detailClient, setDetailClient] = useState<any>(null);

  // Personal Details States
  const [dcNome, setDcNome] = useState('');
  const [dcEmail, setDcEmail] = useState('');
  const [dcCpf, setDcCpf] = useState('');
  const [dcTelefone, setDcTelefone] = useState('');
  const [dcSexo, setDcSexo] = useState('M');
  const [dcNascimento, setDcNascimento] = useState('');
  const [dcEndereco, setDcEndereco] = useState('');
  const [dcTelefoneSecundario, setDcTelefoneSecundario] = useState('');
  const [dcEstadoCivil, setDcEstadoCivil] = useState('solteiro(a)');
  const [dcNacionalidade, setDcNacionalidade] = useState('brasileiro(a)');
  const [dcProfissao, setDcProfissao] = useState('autônomo(a)');
  const [dcNumero, setDcNumero] = useState('');
  const [dcComplemento, setDcComplemento] = useState('');
  const [dcBairro, setDcBairro] = useState('');
  const [dcCidade, setDcCidade] = useState('');
  const [dcEstado, setDcEstado] = useState('');
  const [dcCep, setDcCep] = useState('');

  // Clinical Details States
  const [dcLesãoes, setDcLesãoes] = useState('');
  const [dcRestricoes, setDcRestricoes] = useState('');
  const [dcMedicamentos, setDcMedicamentos] = useState('');
  const [dcHistorico, setDcHistorico] = useState('');
  const [dcObsClin, setDcObsClin] = useState('');

  // Commercial Details States
  const [dcPlano, setDcPlano] = useState('');
  const [dcVencimento, setDcVencimento] = useState('');
  const [dcStatus, setDcStatus] = useState('ativo');
  const [dcFormaPag, setDcFormaPag] = useState('pix');
  const [dcDuracao, setDcDuracao] = useState('mensal');
  const [dcVigenciaQtd, setDcVigenciaQtd] = useState(1);
  const [dcValorUnitario, setDcValorUnitario] = useState(0);
  const [dcDescontoTipo, setDcDescontoTipo] = useState('percentual');
  const [dcDescontoValor, setDcDescontoValor] = useState(0);
  const [dcParcelas, setDcParcelas] = useState(1);
  const [dcDataInicio, setDcDataInicio] = useState('');
  const [dcResponsavelVenda, setDcResponsavelVenda] = useState('');
  const [dcUnidadeContratada, setDcUnidadeContratada] = useState('');
  const [dcObservacoesContratuais, setDcObservacoesContratuais] = useState('');
  const [dcFrequencia, setDcFrequencia] = useState<number>(3);
  const getCreditsForFreq = (freq: number): number => {
    if (freq === 1) return 5;
    if (freq === 2) return 9;
    if (freq === 3) return 13;
    if (freq === 4) return 17;
    if (freq === 5) return 21;
    return freq * 4 + 1;
  };

  const [dcCreditosTotal, setDcCreditosTotal] = useState<number>(13);
  const [dcCreditosMassagem, setDcCreditosMassagem] = useState<number>(0);
  const [dcCreditosEmergencia, setDcCreditosEmergencia] = useState<number>(0);

  // Contract Tab States
  const [clientContracts, setClientContracts] = useState<any[]>([]);
  const [showContractPreview, setShowContractPreview] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [gerarAsaas, setGerarAsaas] = useState(false);
  const [generatingAsaasId, setGeneratingAsaasId] = useState<string | null>(null);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [freezeContractId, setFreezeContractId] = useState('');
  const [freezeStartDate, setFreezeStartDate] = useState('');
  const [freezeDuration, setFreezeDuration] = useState(30);

  // New states for Plan
  const [planTipo, setPlanTipo] = useState<'Mensal' | 'Anual'>('Mensal');
  const [planServicos, setPlanServicos] = useState<string[]>([]);
  const [planBeneficios, setPlanBeneficios] = useState<string[]>([]);
  const [planUnidade, setPlanUnidade] = useState('');
  const [planAtivo, setPlanAtivo] = useState(true);

  // Computed values for contract and commercial details
  const selectedPlan = plans.find((p: any) => p._id === dcPlano);
  const valorBruto = dcValorUnitario * dcVigenciaQtd;
  const isSelectedPlanAnual = dcDuracao === 'anual';
  
  let dataFimStr = '—';
  if (dcDataInicio) {
    const start = new Date(dcDataInicio + 'T00:00:00');
    if (dcDuracao === 'semana') {
      start.setDate(start.getDate() + (Number(dcVigenciaQtd) || 1) * 7);
    } else if (dcDuracao === 'mensal') {
      start.setMonth(start.getMonth() + (Number(dcVigenciaQtd) || 1));
    } else {
      start.setMonth(start.getMonth() + (Number(dcVigenciaQtd) || 1) * 12);
    }
    dataFimStr = start.toLocaleDateString('pt-BR');
  }
  
  let descontoReais = 0;
  if (dcDescontoTipo === 'percentual') {
    descontoReais = valorBruto * ((Number(dcDescontoValor) || 0) / 100);
  } else {
    descontoReais = Math.min(valorBruto, Number(dcDescontoValor) || 0);
  }
  const valorLiquido = Math.max(0, valorBruto - descontoReais);
  const valorParcela = valorLiquido / (Number(dcParcelas) || 1);
  const hasActiveSignedContract = clientContracts.some(c => c.status === 'assinado' || c.status === 'congelado');

  const generateContractTemplate = () => {
    const plan = plans.find((p: any) => p._id === dcPlano);
    if (!plan) return 'Nenhum plano selecionado.';

    const isAnual = dcDuracao === 'anual';
    let vigenciaText = '1 (um) mês';
    if (dcDuracao === 'semana') {
      vigenciaText = `${dcVigenciaQtd} semana(s)`;
    } else if (dcDuracao === 'mensal') {
      vigenciaText = dcVigenciaQtd === 1 ? '1 (um) mês' : `${dcVigenciaQtd} meses`;
    } else if (dcDuracao === 'anual') {
      vigenciaText = dcVigenciaQtd === 1 ? '12 (doze) meses (1 ano)' : `${dcVigenciaQtd * 12} meses (${dcVigenciaQtd} anos)`;
    }

    const bruto = dcValorUnitario * dcVigenciaQtd;
    const descVal = Number(dcDescontoValor) || 0;
    let liquido = bruto;
    if (dcDescontoTipo === 'percentual') {
      liquido = bruto * (1 - descVal / 100);
    } else {
      liquido = Math.max(0, bruto - descVal);
    }
    const nParc = Number(dcParcelas) || 1;
    const valorParc = liquido / nParc;
    const fmt = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let dataFimStr = '[Data Fim]';
    if (dcDataInicio) {
      const start = new Date(dcDataInicio + 'T00:00:00');
      if (dcDuracao === 'semana') {
        start.setDate(start.getDate() + (Number(dcVigenciaQtd) || 1) * 7);
      } else if (dcDuracao === 'mensal') {
        start.setMonth(start.getMonth() + (Number(dcVigenciaQtd) || 1));
      } else {
        start.setMonth(start.getMonth() + (Number(dcVigenciaQtd) || 1) * 12);
      }
      dataFimStr = start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    }
    const fmtDate = (d: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '[data]';
    const dataInicioFormatada = fmtDate(dcDataInicio);
    const dataContrato = dcDataInicio ? fmtDate(dcDataInicio) : fmtDate(new Date().toISOString().split('T')[0]);
    const vencimentoFormatado = dcVencimento ? new Date(dcVencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '[Primeiro Vencimento]';

    const creditosMensais = dcFrequencia * 4 + 1;
    const numeraisExtenso: Record<number,string> = {1:'um',2:'dois',3:'três',4:'quatro',5:'cinco',6:'seis',7:'sete',8:'oito',9:'nove',10:'dez',11:'onze',12:'doze',13:'treze',17:'dezessete',21:'vinte e um'};
    const creditosPorExtenso = numeraisExtenso[creditosMensais] || String(creditosMensais);

    const servicosPadrao = ['Liberação Miofascial','Quiropraxia','Recuperação (Recovery)','Hidrogênioterapia','Laserterapia','Bota pneumática','Eletroterapia','Treinos monitorados'];
    const servicosLista = (plan.servicosPermitidos?.length > 0 ? plan.servicosPermitidos : servicosPadrao)
      .map((s: string) => '<li>' + s + '</li>').join('');

    const nomeCompleto = dcNome || '[Nome do Contratante]';
    const cpfVal = dcCpf || '[CPF]';
    const enderecoCompleto = [dcEndereco, dcNumero ? 'nº ' + dcNumero : '', dcComplemento, dcBairro ? 'Bairro ' + dcBairro : ''].filter(Boolean).join(', ') || '[Endereço completo do Contratante]';
    const cidadeEstado = dcCidade && dcEstado ? dcCidade + '/' + dcEstado : 'Belo Horizonte/MG';
    const foro = dcCidade || 'Belo Horizonte';
    const cnpj = '52.883.492/0001-04';
    const contratadaNome = 'Albert Nunes Queiroz dos Santos LTDA.';
    const unidade = dcUnidadeContratada || plan.unidadeAtendimento || 'Principal';

    const beneficiosAnuaisHTML = isAnual
      ? `<ul style="margin-left:24px"><li>01 (uma) sessão de massagem por mês, no sistema de massoterapia da clínica.</li><li>01 (uma) atendimento de emergência terapêutica por mês, mediante necessidade clínica comprovada pelo fisioterapeuta.</li></ul>
         <p><em>Dos Atendimentos de Emergência:</em> Adicionalmente, reserva-se ao contratante o direito a 01 (uma) intervenção mensal de caráter emergencial, destinada exclusivamente ao atendimento terapêutico individualizado, mediante comprovação de necessidade.</p>
         <p><em>Da Gestão Terapêutica e Utilização de Créditos:</em> Na hipótese de o fisioterapeuta responsável identificar a necessidade técnica de atendimentos suplementares ao limite mensal estabelecido, o profissional procederá ao manejo das reservas contratuais disponíveis. Caberá exclusivamente ao fisioterapeuta a avaliação clínica e a gestão da frequência dessas sessões extraordinárias, sem ônus para o contratante.</p>
         <p>Acesso à unidade ${unidade} com aulas coletivas de acordo com a disponibilidade da unidade.</p>`
      : '<p>Por se tratar de plano Mensal, o CONTRATANTE <strong>não</strong> possui direito aos benefícios exclusivos da modalidade Anual (massagem cortesia, atendimento de emergência e congelamento de plano).</p>';

    const congelamentoClausula = isAnual
      ? '<p style="margin: 0 0 4px 0;"><em>Parágrafo Segundo:</em> O CONTRATANTE de plano anual possui o direito de suspender ("congelar") e redistribuir seus créditos por um período de até <strong>30 (trinta) dias</strong> em razão de sua ausência, desde que a utilização ocorra estritamente dentro da vigência do plano contratado, sendo vedada a prorrogação do prazo contratual original.</p>'
      : '';
    const paragTerceiro = isAnual ? 'Terceiro' : 'Segundo';

    const obsHTML = dcObservacoesContratuais
      ? '<p><strong>5.6 Observações Adicionais</strong><br/>' + dcObservacoesContratuais + '</p>'
      : '';

    const html =
      '<div style="font-family: Times New Roman, Times, serif; font-size: 9.5pt; line-height: 1.6; color: #111; width: 100%; box-sizing: border-box; padding: 0; margin: 0;">' +
      '<p style="text-align: right; margin-bottom: 4px;">' + dataContrato + '</p>' +
      '<p style="text-align: right; margin-bottom: 20px; font-style: italic;">' + contratadaNome + '</p>' +
      '<h2 style="text-align: center; text-transform: uppercase; font-size: 12pt; margin-bottom: 4px;">Contrato de Prestação de Serviços</h2>' +
      '<p style="text-align: center; color: #555; font-size: 9pt; margin-bottom: 20px;">Prestação de serviços de fisioterapia, atividades físicas de condicionamento</p>' +

      '<h3 style="font-size: 10pt; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-top: 16px; margin-bottom: 6px;">1. Identificação das Partes</h3>' +
      '<p style="margin: 0 0 6px 0;"><strong>1.1 CONTRATANTE</strong><br/>Nome: <strong>' + nomeCompleto + '</strong><br/>CPF: <strong>' + cpfVal + '</strong><br/>Endereço: ' + enderecoCompleto + '<br/>Cidade: <strong>' + cidadeEstado + '</strong></p>' +
      '<p style="margin: 0 0 6px 0;"><strong>1.2 CONTRATADO</strong><br/>Nome: <strong>' + contratadaNome + '</strong><br/>CNPJ: <strong>' + cnpj + '</strong><br/>Unidade: <strong>' + unidade + '</strong><br/>Cidade: <strong>' + cidadeEstado + '</strong></p>' +

      '<h3 style="font-size: 10pt; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-top: 16px; margin-bottom: 6px;">2. Objeto do Contrato</h3>' +
      '<p style="margin: 0 0 6px 0;">O presente contrato tem por objeto a prestação de serviços de fisioterapia e atividades físicas, com a disponibilização de <strong>' + creditosMensais + ' (' + creditosPorExtenso + ') créditos mensais</strong>, destinados a sessões de atendimento individualizado, conforme descrito na cláusula 3.</p>' +

      '<h3 style="font-size: 10pt; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-top: 16px; margin-bottom: 6px;">3. Serviços a Serem Prestados</h3>' +
      '<p style="margin: 0 0 4px 0;"><strong>3.1 Técnicas de Atendimento</strong><br/>O CONTRATADO se compromete a prestar os seguintes serviços de fisioterapia e educação física:</p>' +
      '<ul style="margin: 4px 0 4px 20px; padding: 0;">' + servicosLista + '</ul>' +
      '<p style="margin: 4px 0;"><strong>3.2 Benefícios Adicionais</strong></p>' +
      beneficiosAnuaisHTML +

      '<h3 style="font-size: 10pt; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-top: 16px; margin-bottom: 6px;">4. Valor e Forma de Pagamento</h3>' +
      '<p><strong>4.1 Valor ' + (isAnual ? 'Anual' : 'Mensal') + '</strong><br/>' +
      'O CONTRATANTE se compromete a pagar ao CONTRATADO o valor ' + (isAnual ? 'anual' : 'mensal') + ' de <strong>' + fmt(liquido) + '</strong>, pago em <strong>' + nParc + 'x de R$ ' + valorParc.toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2}) + '</strong>.</p>' +
      '<p><strong>4.2 Forma de Pagamento</strong><br/>' +
      'O pagamento será realizado mediante <strong>' + dcFormaPag.toUpperCase() + '</strong>, com vencimento inicial em <strong>' + vencimentoFormatado + '</strong>, conforme condições acordadas entre as partes.</p>' +

      '<h3 style="font-size: 10pt; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-top: 16px; margin-bottom: 6px;">5. Cláusulas Específicas</h3>' +
      '<p style="margin: 0 0 4px 0;"><strong>5.1 Horário e Reposição</strong></p>' +
      '<p style="margin: 0 0 4px 0;">O CONTRATADO se compromete a agendar os atendimentos com antecedência mínima de 2 (duas) horas; caso contrário, o sistema não permite a marcação.</p>' +
      '<p style="margin: 0 0 4px 0;">Em caso de cancelamento ou adiamento, o CONTRATADO deverá notificar com pelo menos <strong>6 (seis) horas</strong> de antecedência.</p>' +
      '<p style="margin: 0 0 4px 0;">A reposição do crédito será garantida mediante o cumprimento da regra de cancelamento.</p>' +

      '<p style="margin: 0 0 4px 0;"><strong>5.2 Planilha de Treinamento</strong></p>' +
      '<p style="margin: 0 0 4px 0;">O CONTRATADO fornecerá ao CONTRATANTE uma planilha de treinamento personalizada, atualizada mensalmente, com base na evolução clínica e objetivos terapêuticos, para utilização no treino livre. Este deve ser agendado pelo aplicativo, sendo disponibilizadas apenas <strong>3 (três) vagas</strong> por horário para esta modalidade.</p>' +

      '<p style="margin: 0 0 4px 0;"><strong>5.3 Férias e Feriados</strong></p>' +
      '<p style="margin: 0 0 4px 0;"><em>Parágrafo Primeiro:</em> Em caso de feriados ou recessos da Clínica, o CONTRATADO realizará o ajuste da agenda, assegurando a reposição dos créditos em dias úteis, conforme disponibilidade.</p>' +
      congelamentoClausula +
      '<p style="margin: 0 0 4px 0;"><em>Parágrafo ' + paragTerceiro + ':</em> O CONTRATADO reserva-se o direito de recesso anual entre o Natal e o Ano Novo, devendo o CONTRATANTE utilizar seus créditos remanescentes até o dia 24 de dezembro do respectivo ano.</p>' +

      '<p style="margin: 0 0 4px 0;"><strong>5.4 Reajuste Anual</strong></p>' +
      '<p style="margin: 0 0 4px 0;">O valor dos serviços será reajustado anualmente, com base na variação do Índice de Preços ao Consumidor Amplo (IPCA), divulgado pelo IBGE.</p>' +

      '<p style="margin: 0 0 4px 0;"><strong>5.5 Rescisão do Contrato</strong></p>' +
      '<p style="margin: 0 0 4px 0;">O CONTRATANTE poderá rescindir o contrato mediante aviso prévio de <strong>30 (trinta) dias</strong>, por escrito.</p>' +
      '<p style="margin: 0 0 4px 0;">Em caso de rescisão sem aviso prévio ou por escrito, será cobrada uma multa de <strong>10% (dez por cento)</strong> sobre o valor total do mês vigente.</p>' +

      obsHTML +

      '<h3 style="font-size: 10pt; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-top: 16px; margin-bottom: 6px;">6. Prazo de Vigência</h3>' +
      '<p style="margin: 0 0 4px 0;">O presente contrato terá duração de <strong>' + vigenciaText + '</strong>, iniciando-se em <strong>' + dataInicioFormatada + '</strong>, podendo ser renovado ou rescindido conforme as condições estabelecidas na cláusula 5.5.</p>' +

      '<h3 style="font-size: 10pt; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-top: 16px; margin-bottom: 6px;">7. Foro</h3>' +
      '<p style="margin: 0 0 4px 0;">Para todos os efeitos legais decorrentes do presente contrato, as partes elegem o foro da Comarca de <strong>' + foro + '</strong>, renunciando a qualquer outro, por mais privilegiado que seja.</p>' +

      '<div style="page-break-inside: avoid !important; break-inside: avoid !important;">' +
      '<h3 style="font-size: 10pt; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-top: 16px; margin-bottom: 6px;">8. Assinaturas</h3>' +
      '<div style="display:flex;justify-content:space-between;margin-top:40px;gap:30px;">' +
        '<div style="flex:1;text-align:center;"><div style="border-top:1px solid #333;padding-top:6px;margin-top:30px;"><strong>CONTRATANTE</strong><br/>' + nomeCompleto + '<br/><small>CPF: ' + cpfVal + '</small></div></div>' +
        '<div style="flex:1;text-align:center;"><div style="border-top:1px solid #333;padding-top:6px;margin-top:30px;"><strong>CONTRATADO</strong><br/>' + contratadaNome + '<br/><small>CNPJ: ' + cnpj + '</small></div></div>' +
      '</div>' +
      '<p style="margin-top:20px;text-align:center;">Local e data: _________________________, ' + dataContrato + '</p>' +
      '</div>' +
      '</div>';

    return html;
  };


  const handleCreateContract = async (status: 'pendente' | 'assinado' | 'clicksign') => {
    if (status === 'assinado' && !signatureName.trim()) {
      alert('Por favor, informe o nome do assinante para registrar o aceite digital.');
      return;
    }

    const plan = plans.find((p: any) => p._id === dcPlano);
    if (!plan) {
      alert('Plano não encontrado.');
      return;
    }

    const isClicksign = status === 'clicksign';
    let pdfBase64 = '';
    if (isClicksign) {
      try {
        pdfBase64 = await getContractPDFBase64(
          {
            ...detailClient,
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
          generateContractTemplate()
        );
      } catch (err: any) {
        alert('Erro ao gerar o PDF para a Clicksign: ' + err.message);
        return;
      }
    }

    const payload = {
      clientId: detailClient._id,
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
      status: isClicksign ? 'pendente' : status,
      assinaturaNome: status === 'assinado' ? signatureName : '',
      contratoTexto: generateContractTemplate(),
      usuarioEmissor: 'Administrador',
      enviarClicksign: isClicksign,
      enviarAsaas: gerarAsaas,
      contratoPdfBase64: pdfBase64,
      frequencia: dcFrequencia,
      creditosTotal: dcCreditosTotal,
                              asaasCustomerId: dcAsaasCustomerId,
    creditosMassagemPorPlano: dcCreditosMassagem,
    creditosEmergenciaPorPlano: dcCreditosEmergencia
    };

    const res = await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      if (isClicksign) {
        alert('Contrato gerado e enviado para a Clicksign com sucesso! O link para assinatura foi enviado por e-mail.');
      } else {
        alert(status === 'assinado' ? 'Contrato assinado e ativado com sucesso!' : 'Contrato gerado como pendente!');
      }
      setShowContractPreview(false);
      
      const resContracts = await fetch(`/api/contracts?clientId=${detailClient._id}`);
      const dataContracts = await resContracts.json();
      if (dataContracts.success) {
        setClientContracts(dataContracts.data);
      }
      
      fetchData();

      if (status === 'assinado') {
        const clientWithComercial = {
          ...detailClient,
          dadosComerciais: {
            ...detailClient.dadosComerciais,
            planoId: plan,
            formaPagamento: dcFormaPag,
            duracao: dcDuracao,
            duracaoQtd: dcVigenciaQtd,
            valorUnitario: dcValorUnitario,
            vencimento: dcVencimento,
            descontoTipo: dcDescontoTipo,
            descontoValor: dcDescontoValor,
            parcelas: dcParcelas,
            dataInicio: dcDataInicio,
            responsavelVenda: dcResponsavelVenda,
            unidadeContratada: dcUnidadeContratada,
            observacoesContratuais: dcObservacoesContratuais
          }
        };
        downloadContractPDF(clientWithComercial, plan, payload.contratoTexto);
      }
    } else {
      alert('Erro ao criar contrato: ' + data.error);
    }
  };

  const handleCreateFixedSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fsClient) {
      alert('Selecione um aluno.');
      return;
    }

    try {
      let finalEndDate = '';
      if (fsDurationType === 'contrato') {
        const resContracts = await fetch(`/api/contracts?clientId=${fsClient}`);
        const dataContracts = await resContracts.json();
        if (dataContracts.success) {
          const activeContract = dataContracts.data.find((c: any) => c.status === 'assinado' || c.status === 'congelado');
          if (activeContract && activeContract.dataFim) {
            finalEndDate = activeContract.dataFim;
          } else {
            alert('Não foi encontrado nenhum contrato ativo/assinado para este aluno. Defina a data final manualmente.');
            return;
          }
        } else {
          alert('Erro ao carregar contratos do aluno.');
          return;
        }
      } else if (fsDurationType === 'manual') {
        if (!fsManualEndDate) {
          alert('Por favor, informe a data final manualmente.');
          return;
        }
        finalEndDate = fsManualEndDate;
      }

      const payload = {
        clienteId: fsClient,
        profissionalId: null,
        diaSemana: Number(fsDay),
        horario: fsTime,
        servico: fsService,
        dataInicio: fsDate,
        duracaoSemanas: null,
        dataFim: finalEndDate || null
      };

      const res = await fetch('/api/fixed-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setShowFixedSchedModal(false);
        setFsClient('');
        setFsDay(1);
        setFsTime('08:00');
        setFsService('Treino Monitorado');
        setFsDate(new Date().toISOString().split('T')[0]);
        setFsDurationType('contrato');
        setFsManualEndDate('');
        fetchData();
      } else {
        alert('Erro ao criar horário fixo: ' + data.error);
      }
    } catch (err) {
      alert('Erro de conexão ao criar horário fixo.');
    }
  };

  const handleDeleteFixedSchedule = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta regra de horário fixo?')) {
      try {
        const res = await fetch(`/api/fixed-schedules?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          fetchData();
        } else {
          alert('Erro ao excluir: ' + data.error);
        }
      } catch (err) {
        alert('Erro de rede.');
      }
    }
  };

  const handleFreezeContract = async () => {
    if (!freezeStartDate) {
      alert('Selecione uma data de início para o congelamento.');
      return;
    }
    if (freezeDuration <= 0 || freezeDuration > 30) {
      alert('A duração do congelamento deve ser entre 1 e 30 dias.');
      return;
    }

    const res = await fetch('/api/contracts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: freezeContractId,
        action: 'congelar',
        dataInicio: freezeStartDate,
        duracaoDias: freezeDuration
      })
    });
    const data = await res.json();

    if (data.success) {
      alert('Contrato congelado com sucesso!');
      setShowFreezeModal(false);
      
      const resContracts = await fetch(`/api/contracts?clientId=${detailClient._id}`);
      const dataContracts = await resContracts.json();
      if (dataContracts.success) {
        setClientContracts(dataContracts.data);
      }
      fetchData();
    } else {
      alert('Erro ao congelar contrato: ' + data.error);
    }
  };

  const handleCancelContract = async (contractId: string) => {
    if (!confirm('Tem certeza de que deseja cancelar este contrato? Esta ação alterará o status comercial do aluno para inativo.')) {
      return;
    }

    const res = await fetch('/api/contracts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: contractId,
        action: 'cancel'
      })
    });
    const data = await res.json();

    if (data.success) {
      alert('Contrato cancelado com sucesso!');
      
      const resContracts = await fetch(`/api/contracts?clientId=${detailClient._id}`);
      const dataContracts = await resContracts.json();
      if (dataContracts.success) {
        setClientContracts(dataContracts.data);
      }
      fetchData();
    } else {
      alert('Erro ao cancelar contrato: ' + data.error);
    }
  };

  const handleGenerateAsaasCharge = async (contractId: string) => {
    setGeneratingAsaasId(contractId);
    try {
      const res = await fetch('/api/admin/asaas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId })
      });
      const data = await res.json();
      if (data.success) {
        alert('Cobrança Asaas gerada com sucesso! Boleto e Pix gerados.');
        const resContracts = await fetch(`/api/contracts?clientId=${detailClient._id}`);
        const dataContracts = await resContracts.json();
        if (dataContracts.success) {
          setClientContracts(dataContracts.data);
        }
        fetchData();
      } else {
        alert('Erro ao gerar cobrança no Asaas: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro de rede: ' + err.message);
    } finally {
      setGeneratingAsaasId(null);
    }
  };

  const handleSignContract = async (contractId: string, signatoryName: string) => {
    if (!signatoryName.trim()) {
      alert('Por favor, informe o nome do assinante para assinar o contrato.');
      return;
    }

    const res = await fetch('/api/contracts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: contractId,
        action: 'sign',
        assinaturaNome: signatoryName
      })
    });
    const data = await res.json();

    if (data.success) {
      alert('Contrato assinado e ativado!');
      
      const resContracts = await fetch(`/api/contracts?clientId=${detailClient._id}`);
      const dataContracts = await resContracts.json();
      if (dataContracts.success) {
        setClientContracts(dataContracts.data);
      }
      fetchData();
    } else {
      alert('Erro ao assinar contrato: ' + data.error);
    }
  };

  // F7   Simulador de Recebimentos
  const [finTab, setFinTab] = useState<'contas_pagar' | 'recebimentos' | 'mensalidades'>('mensalidades');
  const [showSimuladorModal, setShowSimuladorModal] = useState(false);
  const [simClient, setSimClient] = useState<any>(null);
  const [simForma, setSimForma] = useState<'pix' | 'boleto'>('pix');

  // F15/F16  Financial filters
  const [finFilterStatus, setFinFilterStatus] = useState('');
  const [finFilterCat, setFinFilterCat] = useState('');
  const [finFilterMonth, setFinFilterMonth] = useState('');

  // Configuraes states
  const [configSpotifyId, setConfigSpotifyId] = useState('');
  const [configThemeColor, setConfigThemeColor] = useState('#2563eb');
  const [configGymName, setConfigGymName] = useState('Clube Fitness Fisio');

  useEffect(() => {
    if (activeTab === 'configuracoes') {
      setConfigSpotifyId(localStorage.getItem('spotify_client_id') || '');
      setConfigThemeColor(localStorage.getItem('theme_color') || '#2563eb');
      setConfigGymName(localStorage.getItem('gym_name') || 'Clube Fitness Fisio');
    }
  }, [activeTab]);



  const handleSaveConfigs = () => {
    localStorage.setItem('spotify_client_id', configSpotifyId);
    localStorage.setItem('theme_color', configThemeColor);
    localStorage.setItem('gym_name', configGymName);
    
    // Apply theme changes dynamically
    document.documentElement.style.setProperty('--color-primary', configThemeColor);
    alert('Configuraes salvas com sucesso!');
  };
  const plansList = [
    { id: '6668ab010101010101010101', nome: 'Academia VIP', preco: 150 },
    { id: '6668ab010101010101010102', nome: 'Fisioterapia Individual', preco: 450 },
    { id: '6668ab010101010101010103', nome: 'Clube Completo (Fisio + Academia)', preco: 490 }
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resClients, resProfs, resApts, resUsers, resPlans, resFin, resMed, resFs, resSt, resExs, resTranc, resContracts, resAc, resLogs] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/professionals'),
        fetch('/api/appointments'),
        fetch('/api/users'),
        fetch('/api/plans'),
        fetch('/api/financial'),
        fetch('/api/medications'),
        fetch('/api/fixed-schedules'),
        fetch('/api/strength-tests'),
        fetch('/api/exercises?status=pending'),
        fetch('/api/trancamentos'),
        fetch('/api/contracts'),
        fetch('/api/admin/agenda-config'),
        fetch('/api/admin/activity-logs')
      ]);
      const jsonClients = await resClients.json();
      const jsonProfs = await resProfs.json();
      const jsonApts = await resApts.json();
      const jsonUsers = await resUsers.json();
      const jsonPlans = await resPlans.json();
      const jsonFin = await resFin.json();
      const jsonMed = await resMed.json();
      const jsonFs = await resFs.json();
      const jsonSt = await resSt.json();
      const jsonExs = await resExs.json();
      const jsonTranc = await resTranc.json();
      const jsonContracts = await resContracts.json();
      const jsonAc = await resAc.json();
      const jsonLogs = await resLogs.json();

      if (jsonClients.success) setClients(jsonClients.data);
      if (jsonProfs.success) setProfessionals(jsonProfs.data);
      if (jsonApts.success) setAppointments(jsonApts.data);
      if (jsonUsers.success) setUsers(jsonUsers.data);
      if (jsonPlans.success) setPlans(jsonPlans.data);
      if (jsonFin.success) setFinancials(jsonFin.data);
      if (jsonMed.success) setMedications(jsonMed.data);
      if (jsonFs.success) setFixedSchedules(jsonFs.data);
      if (jsonSt.success) setStrengthTests(jsonSt.data);
      if (jsonExs.success) setExerciseRequests(jsonExs.data);
      if (jsonTranc.success) setTrancamentosAdminList(jsonTranc.data);
      if (jsonContracts.success) setContractsAdminList(jsonContracts.data);
      if (jsonAc.success) setAgendaConfigs(jsonAc.data);
      if (jsonLogs.success) setActivityLogs(jsonLogs.data);
    } catch (e) {
      console.error('Error fetching admin dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };
  const handleCreateAgendaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      horario: acTime,
      acao: acAction,
      capacidadePersonalizada: acAction === 'alterar_capacidade' ? acCapacity : null
    };
    if (acScope === 'grade') {
      payload.tipo = 'academia';
      payload.servico = null;
    } else {
      payload.tipo = 'servico';
      payload.servico = acService;
    }
    if (acFrequency === 'permanente') {
      if (acSelectedDays.length === 0) {
        alert('Selecione pelo menos um dia da semana!');
        return;
      }
      setLoading(true);
      try {
        for (const day of acSelectedDays) {
          const res = await fetch('/api/admin/agenda-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...payload,
              diaSemana: day,
              dataEspecifica: null
            })
          });
          const data = await res.json();
          if (!data.success) {
            alert('Erro ao criar regra semanal: ' + data.error);
          }
        }
        alert('Regras permanentes criadas com sucesso!');
        fetchData();
        setAcSelectedDays([]);
      } catch (err: any) {
        alert('Erro na requisição: ' + err.message);
      } finally {
        setLoading(false);
      }
    } else {
      if (!acSpecificDate) {
        alert('Selecione uma data!');
        return;
      }
      setLoading(true);
      try {
        const res = await fetch('/api/admin/agenda-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            diaSemana: null,
            dataEspecifica: acSpecificDate
          })
        });
        const data = await res.json();
        if (data.success) {
          alert('Regra pontual criada com sucesso!');
          fetchData();
          setAcSpecificDate('');
        } else {
          alert('Erro ao criar regra pontual: ' + data.error);
        }
      } catch (err: any) {
        alert('Erro na requisição: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteAgendaConfig = async (id: string) => {
    if (!confirm('Deseja realmente remover esta regra?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/agenda-config?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        alert('Regra removida com sucesso!');
        fetchData();
      } else {
        alert('Erro ao remover: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro ao deletar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableHours = (day: number, service: string) => {
    if (day === 0) return [];
    const defaultGrade = day === 6
      ? ['09:50', '10:40', '11:30', '12:25']
      : ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
    const additions = agendaConfigs.filter(cfg => 
      cfg.tipo === 'academia' && 
      cfg.acao === 'adicionar' && 
      cfg.diaSemana === day && 
      !cfg.dataEspecifica
    );
    let grade = [...defaultGrade];
    for (const add of additions) {
      if (!grade.includes(add.horario)) {
        grade.push(add.horario);
      }
    }
    grade.sort((a, b) => a.localeCompare(b));
    return grade.filter(horario => {
      const serviceBlock = agendaConfigs.some(cfg => 
        cfg.tipo === 'servico' && 
        cfg.servico === service && 
        cfg.horario === horario && 
        cfg.diaSemana === day && 
        cfg.acao === 'bloquear' && 
        !cfg.dataEspecifica
      );
      if (serviceBlock) return false;
      const gradeBlock = agendaConfigs.some(cfg => 
        cfg.tipo === 'academia' && 
        cfg.horario === horario && 
        cfg.diaSemana === day && 
        cfg.acao === 'bloquear' && 
        !cfg.dataEspecifica
      );
      if (gradeBlock) return false;
      const serviceCapRule = agendaConfigs.find(cfg => 
        cfg.tipo === 'servico' && 
        cfg.servico === service && 
        cfg.horario === horario && 
        cfg.diaSemana === day && 
        cfg.acao === 'alterar_capacidade' && 
        !cfg.dataEspecifica
      );
      const gradeCapRule = agendaConfigs.find(cfg => 
        cfg.tipo === 'academia' && 
        cfg.horario === horario && 
        cfg.diaSemana === day && 
        cfg.acao === 'alterar_capacidade' && 
        !cfg.dataEspecifica
      );
      let maxVagas = 6;
      if (serviceCapRule && serviceCapRule.capacidadePersonalizada !== null) {
        maxVagas = serviceCapRule.capacidadePersonalizada;
      } else if (gradeCapRule && gradeCapRule.capacidadePersonalizada !== null) {
        maxVagas = gradeCapRule.capacidadePersonalizada;
      }
      const requiredVagas = service === 'Treino Livre' ? 0 : (service === 'Avaliação Fisioterápica' ? 3 : 1);
      const occupied = fixedSchedules
        .filter(fs => fs.diaSemana === day && fs.horario === horario)
        .reduce((sum, fs) => {
          const fsVagas = fs.servico === 'Treino Livre' ? 0 : (fs.servico === 'Avaliação Fisioterápica' ? 3 : 1);
          return sum + fsVagas;
        }, 0);
      return (occupied + requiredVagas <= maxVagas);
    });
  };

  useEffect(() => {
    if (showFixedSchedModal) {
      const hours = getAvailableHours(fsDay, fsService);
      if (hours.length > 0) {
        if (!hours.includes(fsTime)) {
          setFsTime(hours[0]);
        }
      } else {
        setFsTime('');
      }
    }
  }, [fsDay, fsService, fixedSchedules, agendaConfigs, showFixedSchedModal]);


  const getGroupedPayments = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const grouped: Record<string, {
      clientId: string;
      clientNome: string;
      planoNome: string;
      payments: any[];
      totalValue: number;
      paidCount: number;
      totalCount: number;
      status: 'Pago' | 'Pendente' | 'Atrasado';
      proximoVencimento: string;
    }> = {};

    payments.forEach(p => {
      if (!grouped[p.clientId]) {
        grouped[p.clientId] = {
          clientId: p.clientId,
          clientNome: p.clientNome,
          planoNome: p.planoNome,
          payments: [],
          totalValue: 0,
          paidCount: 0,
          totalCount: 0,
          status: 'Pago',
          proximoVencimento: ''
        };
      }
      grouped[p.clientId].payments.push(p);
    });

    const groupedList = Object.values(grouped).map((group: any) => {
      group.payments.sort((a: any, b: any) => a.vencimento.localeCompare(b.vencimento));
      group.totalCount = group.payments.length;
      group.paidCount = group.payments.filter((p: any) => p.status === 'Pago').length;
      group.totalValue = group.payments.reduce((sum: number, p: any) => sum + p.valor, 0);

      const hasOverdue = group.payments.some((p: any) => p.status === 'Pendente' && p.vencimento < todayStr);
      const hasPending = group.payments.some((p: any) => p.status === 'Pendente');
      
      if (hasOverdue) {
        group.status = 'Atrasado';
      } else if (hasPending) {
        group.status = 'Em Dia';
      } else {
        group.status = 'Pago';
      }

      const nextUnpaid = group.payments.find((p: any) => p.status === 'Pendente');
      group.proximoVencimento = nextUnpaid ? nextUnpaid.vencimento : (group.payments[group.payments.length - 1]?.vencimento || '');

      return group;
    });

    return groupedList.filter((group: any) => {
      const matchesSearch = normalizeText(group.clientNome).includes(normalizeText(paymentsSearch));
      const matchesStatus = !paymentsStatusFilter || group.status === paymentsStatusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const handleGlobalSync = async () => {
    setLoadingPayments(true);
    try {
      await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_all_asaas' })
      });
    } catch (e) {
      console.error('Error syncing all Asaas payments:', e);
    }
    await fetchPayments();
  };

  const handleDeleteSinglePayment = async (paymentId: string) => {
    if (!confirm('Deseja excluir esta parcela/cobrança indevida?')) return;
    try {
      const res = await fetch(`/api/admin/payments?id=${paymentId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('Parcela excluída com sucesso!');
        await fetchPayments();
        fetchData();
      } else {
        alert('Erro ao excluir parcela: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  const handleClean250Payments = async (clientId: string, clientNome: string) => {
    if (!confirm(`Deseja remover todas as cobranças/parcelas indevidas de R$ 250,00 para o aluno ${clientNome}?`)) return;
    try {
      setLoadingPayments(true);
      const res = await fetch(`/api/admin/payments?clientId=${clientId}&clean250=true`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert(`SUCESSO: ${data.deletedCount || 0} cobrança(s) indevida(s) de R$ 250,00 foram removidas!`);
        await fetchPayments();
        fetchData();
      } else {
        alert('Erro ao limpar cobranças: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro ao limpar cobranças: ' + err.message);
    } finally {
      setLoadingPayments(false);
    }
  };

  const fetchPayments = async () => {
    setLoadingPayments(true);
    try {
      const url = `/api/admin/payments?search=${encodeURIComponent(paymentsSearch)}&status=${paymentsStatusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setPayments(data.data || []);
      }
    } catch (e) {
      console.error('Error fetching payments:', e);
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleConfirmManualPayment = async () => {
    if (!selectedPayment) return;
    setMpSaving(true);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_manual',
          paymentId: selectedPayment._id,
          formaPagamento: mpFormaPag,
          dataPagamento: mpDataPag,
          observacoes: mpObservacoes
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Recebimento confirmado com sucesso!');
        setShowManualPayModal(false);
        setSelectedPayment(null);
        setMpObservacoes('');
        fetchPayments();
        fetchData(); // reload clients
      } else {
        alert('Erro: ' + data.error);
      }
    } catch (e: any) {
      alert('Erro de rede: ' + e.message);
    } finally {
      setMpSaving(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [paymentsSearch, paymentsStatusFilter]);

  useEffect(() => {
    fetchPayments();
    fetchData();
  }, [activeTab]);

  const exportToCSV = (data: any[], filename: string, columns: { key: string; label: string; formatter?: (val: any) => string }[]) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += columns.map(c => c.label).join(";") + "\n";
    
    data.forEach(row => {
      const rowData = columns.map(col => {
        let val = col.key.split('.').reduce((o, i) => (o ? o[i] : ''), row);
        if (col.formatter) val = col.formatter(val);
        // Escape quotes and wrap in quotes
        val = String(val || '').replace(/"/g, '""');
        return " + val + ";
      });
      csvContent += rowData.join(";") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename + "_" + new Date().toISOString().split('T')[0] + ".csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenClientModal = (item: any = null) => {
    setEditingItem(item);
    setModalType('client');
    if (item) {
      setEmail(item.dadosPessoais?.email || '');
      setNome(item.dadosPessoais?.nome || '');
      setCpf(item.dadosPessoais?.cpf || '');
      setTelefone(item.dadosPessoais?.telefone || '');
      setPlano(item.dadosComerciais?.planoId?._id || item.dadosComerciais?.planoId || '');
    } else {
      setEmail('');
      setNome('');
      setCpf('');
      setTelefone('');
      setPlano('6668ab010101010101010103');
    }
    setShowModal(true);
  };

  const handleOpenProfModal = (item: any = null) => {
    setEditingItem(item);
    setModalType('professional');
    if (item) {
      setEmail(item.userId?.email || '');
      setNome(item.nome || '');
      setEspecialidade(item.especialidade || '');
      setRegistro(item.registro || '');
      setPin(item.pin || '1234');
    } else {
      setEmail('');
      setNome('');
      setEspecialidade('');
      setRegistro('');
      setPin('1234');
    }
    setShowModal(true);
  };

  const handleOpenCreditModal = (client: any) => {
    setEditingItem(client);
    setModalType('credit');
    setCreditAmount(1);
    setCreditType('academia');
    setCreditOperation('add');
    setShowModal(true);
  };

  const sendPreventiveAlert = (client: any) => {
    const metrics = getWeeklyFrequencyMetrics(client, appointments, simulatedDate);
    if (!metrics) return;

    const diasRestantesNomes: Record<number, string> = {
      4: '(terça a sexta)',
      3: '(quarta a sexta)',
      2: '(quinta e sexta)',
      1: '(sexta-feira)'
    };

    const diasRestantesTexto = diasRestantesNomes[metrics.diasRestantes] || '';
    const msg = `Olá, ${client.dadosPessoais.nome}! Notamos que você realizou ${metrics.realizados} de seus ${metrics.frequenciaSemanal} treinos contratados esta semana. Para garantir que você cumpra a sua meta semanal, restam ${metrics.diasRestantes} dia(s) útil(eis) na semana ${diasRestantesTexto} e você ainda tem ${metrics.pendentes} treino(s) pendente(s). Vamos agendar seu próximo treino? 💪`;

    const cleanPhone = client.dadosPessoais?.telefone?.replace(/\D/g, '');
    if (cleanPhone) {
      const formattedPhone = cleanPhone.length <= 11 ? '55' + cleanPhone : cleanPhone;
      const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
    } else {
      alert(`Mensagem preventiva de WhatsApp para ${client.dadosPessoais.nome}:\n\n"${msg}"`);
    }
  };

  const handleOpenUserModal = (item: any = null) => {
    setEditingItem(item);
    setModalType('user');
    if (item) {
      setEmail(item.email || '');
      setNome(item.nome || '');
      if (item.tipo === 'admin') {
        setUserRole('admin');
      } else if (item.tipo === 'professional') {
        setUserRole(item.cargo === 'Fisio' ? 'fisio' : 'treino');
      } else {
        setUserRole(item.cargo === 'Aluno VIP' ? 'aluno_vip' : 'aluno');
      }
      setSelectedRoles(item.roles && item.roles.length > 0 ? item.roles : [item.tipo]);
      setEspecialidade(item.professionalDetails?.especialidade || '');
      setRegistro(item.professionalDetails?.registro || '');
    } else {
      setEmail('');
      setNome('');
      setUserRole('aluno');
      setSelectedRoles(['client']);
      setEspecialidade('');
      setRegistro('');
    }
    setResetPassword(false);
    setShowModal(true);
  };

  const handleOpenPlanModal = (item: any = null) => {
    setEditingItem(item);
    setModalType('plan');
    if (item) {
      setPlanName(item.nome || '');
      setPlanValidade(item.validadeDias || 30);
      setPlanAcademia(item.limiteSessoesAcademia || 0);
      setPlanConsultorio(item.limiteSessoesConsultorio || 0);
      setPlanPrice(item.preco || 0);
      setPlanCreditos(item.creditosTotal || 0);
      setPlanTipo(item.tipo || 'Mensal');
      setPlanServicos(item.servicosPermitidos || []);
      setPlanBeneficios(item.beneficiosInclusos || []);
      setPlanUnidade(item.unidadeAtendimento || '');
      setPlanAtivo(item.ativo !== undefined ? item.ativo : true);
    } else {
      setPlanName('');
      setPlanValidade(30);
      setPlanAcademia(0);
      setPlanConsultorio(0);
      setPlanPrice(0);
      setPlanCreditos(0);
      setPlanTipo('Mensal');
      setPlanServicos([]);
      setPlanBeneficios([]);
      setPlanUnidade('');
      setPlanAtivo(true);
    }
    setShowModal(true);
  };

  const handleOpenFinancialModal = (item: any = null) => {
    setEditingItem(item);
    setModalType('financial');
    if (item) {
      setFinDesc(item.descricao || '');
      setFinCat(item.categoria || '');
      setFinValor(item.valor || 0);
      setFinVenc(item.vencimento || '');
      setFinStatus(item.status || 'Pendente');
      setFinForma(item.forma_pagamento || '');
      setFinObs(item.observacoes || '');
      setFinComprovante(item.anexo_url || '');
    } else {
      setFinDesc('');
      setFinCat('');
      setFinValor(0);
      setFinVenc(new Date().toISOString().split('T')[0]);
      setFinStatus('Pendente');
      setFinForma('');
      setFinObs('');
      setFinComprovante('');
    }
    setShowModal(true);
  };

  const handleFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleComprovanteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const base64 = await handleFileToBase64(e.target.files[0]);
      setFinComprovante(base64);
    }
  };

  const handleNFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const base64 = await handleFileToBase64(e.target.files[0]);
      setMedNF(base64);
    }
  };

  const viewBase64File = (base64Data: string) => {
    const newWindow = window.open();
    if (newWindow) {
      if (base64Data.startsWith('data:image')) {
        newWindow.document.write('<img src="' + base64Data + '" style="max-width:100%"/>');
      } else {
        newWindow.document.write('<iframe src="' + base64Data + '" width="100%" height="100%" style="border:none;"></iframe>');
      }
    }
  };

  const handleOpenMedicationModal = (item: any = null) => {
    setEditingItem(item);
    setModalType('medication');
    if (item) {
      setMedNome(item.nome || '');
      setMedCat(item.categoria || '');
      setMedQuant(item.quantidade || 0);
      setMedUnidade(item.unidade || 'unidades');
      setMedLote(item.lote || '');
      setMedValidade(item.validade || '');
      setMedObs(item.observacoes || '');
      setMedNF(item.nota_fiscal_url || '');
    } else {
      setMedNome('');
      setMedCat('');
      setMedQuant(0);
      setMedUnidade('unidades');
      setMedLote('');
      setMedValidade('');
      setMedObs('');
      setMedNF('');
    }
    setShowModal(true);
  };

  const handleOpenExerciseRequestModal = (item: any) => {
    setEditingItem(item);
    setModalType('exercise_request');
    setExNome(item.nome || '');
    setExGrupo(item.grupo || 'PEITO');
    setExEquip(item.equipamento || '');
    setExInst(item.instrucoes || '');
    setShowModal(true);
  };

  const handleApproveExercise = async (ex: any) => {
    if (!confirm(`Aprovar o cadastro do exercício "${ex.nome}"?`)) return;
    try {
      const res = await fetch('/api/exercises', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ex._id,
          nome: ex.nome,
          grupo: ex.grupo,
          equipamento: ex.equipamento,
          instrucoes: ex.instrucoes,
          status: 'approved'
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Exercício aprovado com sucesso!');
        fetchData();
      } else {
        alert('Erro ao aprovar exercício: ' + data.error);
      }
    } catch (e) {
      alert('Erro ao aprovar exercício.');
    }
  };

  const handleRejectExerciseRequest = async (id: string) => {
    if (!confirm('Rejeitar e excluir esta solicitação de exercício?')) return;
    try {
      const res = await fetch(`/api/exercises?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('Solicitação rejeitada e excluída!');
        fetchData();
      } else {
        alert('Erro ao rejeitar solicitação: ' + data.error);
      }
    } catch (e) {
      alert('Erro ao rejeitar solicitação.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalType === 'client') {
        const payload = {
          id: editingItem?._id,
          email,
          nome,
          dadosPessoais: { nome, email, cpf, telefone },
          dadosComerciais: { planoId: plano }
        };
        const method = editingItem ? 'PUT' : 'POST';
        const res = await fetch('/api/clients', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          setShowModal(false);
          fetchData();
        } else {
          alert('Erro ao salvar cliente: ' + data.error);
        }
      } else if (modalType === 'professional') {
        const payload = {
          id: editingItem?._id,
          email,
          nome,
          especialidade,
          registro,
          cargo: especialidade,
          pin
        };
        const method = editingItem ? 'PUT' : 'POST';
        const res = await fetch('/api/professionals', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          setShowModal(false);
          fetchData();
        } else {
          alert('Erro ao salvar profissional: ' + data.error);
        }
      } else if (modalType === 'user') {
        let tipo = 'client';
        let cargo = 'Aluno';
        let esp = undefined;
        let reg = undefined;

        if (selectedRoles.includes('admin')) {
          tipo = 'admin';
          cargo = 'Administrador Geral';
        } else if (selectedRoles.includes('receptionist')) {
          tipo = 'receptionist';
          cargo = 'Recepção';
        } else if (selectedRoles.includes('professional')) {
          tipo = 'professional';
          cargo = 'Profissional';
          esp = especialidade || 'Fisioterapia';
          reg = registro || 'CREFITO/00000-F';
        } else if (selectedRoles.includes('client')) {
          tipo = 'client';
          cargo = 'Aluno';
        }

        const payload = {
          id: editingItem?._id,
          email,
          nome,
          tipo,
          roles: selectedRoles,
          cargo,
          especialidade: esp,
          registro: reg,
          resetPassword
        };
        const method = editingItem ? 'PUT' : 'POST';
        const res = await fetch('/api/users', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          setShowModal(false);
          fetchData();
        } else {
          alert('Erro ao salvar usuário: ' + data.error);
        }
      } else if (modalType === 'plan') {
        const payload = {
          id: editingItem?._id,
          nome: planName
        };
        const method = editingItem ? 'PUT' : 'POST';
        const res = await fetch('/api/plans', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          setShowModal(false);
          fetchData();
        } else {
          alert('Erro ao salvar plano: ' + data.error);
        }
      } else if (modalType === 'financial') {
        const payload = {
          id: editingItem?._id,
          descricao: finDesc,
          categoria: finCat,
          valor: finValor,
          vencimento: finVenc,
          status: finStatus,
          forma_pagamento: finForma,
          observacoes: finObs,
          comprovante: finComprovante
        };
        const method = editingItem ? 'PUT' : 'POST';
        const res = await fetch('/api/financial', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          setShowModal(false);
          fetchData();
        } else {
          alert('Erro ao salvar lançamento financeiro: ' + data.error);
        }
      } else if (modalType === 'medication') {
        const payload = {
          id: editingItem?._id,
          nome: medNome,
          categoria: medCat,
          quantidade: medQuant,
          unidade: medUnidade,
          lote: medLote,
          validade: medValidade,
          observacoes: medObs,
          notaFiscal: medNF
        };
        const method = editingItem ? 'PUT' : 'POST';
        const res = await fetch('/api/medications', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          setShowModal(false);
          fetchData();
        } else {
          alert('Erro ao salvar medicamento: ' + data.error);
        }
      } else if (modalType === 'exercise_request') {
        const payload = {
          id: editingItem?._id,
          nome: exNome.toUpperCase(),
          grupo: exGrupo,
          equipamento: exEquip,
          instrucoes: exInst,
          status: 'approved'
        };
        const res = await fetch('/api/exercises', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          setShowModal(false);
          fetchData();
          alert('Exercício editado e aprovado com sucesso!');
        } else {
          alert('Erro ao salvar e aprovar exercício: ' + data.error);
        }
      } else if (modalType === 'credit') {
        // Update client credits
        const isMassage = creditType === 'massagem';
        const isEmergencia = creditType === 'emergencia';
        const currentCom = editingItem.dadosComerciais;
        const change = creditOperation === 'sub' ? -creditAmount : creditAmount;
        const payload = {
          id: editingItem._id,
          dadosComerciais: {
            creditosTotal:           (!isMassage && !isEmergencia) ? Math.max(0, (currentCom.creditosTotal || 0) + change) : currentCom.creditosTotal,
            creditosMassagemTotal:   isMassage    ? Math.max(0, (currentCom.creditosMassagemTotal    || 0) + change) : currentCom.creditosMassagemTotal,
            creditosEmergenciaTotal: isEmergencia ? Math.max(0, (currentCom.creditosEmergenciaTotal  || 0) + change) : currentCom.creditosEmergenciaTotal,
          }
        };
        const res = await fetch('/api/clients', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          setShowModal(false);
          fetchData();
        }
      }
    } catch (err: any) {
      alert('Erro na requisição: ' + err.message);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este aluno?')) {
      const res = await fetch(`/api/clients?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchData();
    }
  };

  const handleDeleteProf = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este profissional?')) {
      const res = await fetch(`/api/professionals?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchData();
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este usuário? Todos os dados vinculados (de aluno ou profissional) também serão removidos permanentemente.')) {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert('Erro ao excluir usuário: ' + data.error);
      }
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (confirm('Deseja realmente excluir este plano?')) {
      const res = await fetch(`/api/plans?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchData();
    }
  };

  const handleDeleteFinancial = async (id: string) => {
    if (confirm('Deseja realmente excluir este lançamento financeiro?')) {
      const res = await fetch(`/api/financial?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchData();
    }
  };

  const handleDeleteMedication = async (id: string) => {
    if (confirm('Deseja realmente excluir este medicamento do estoque?')) {
      const res = await fetch(`/api/medications?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchData();
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // Dashboard calculations
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.dadosComerciais?.status === 'ativo' || c.dadosComerciais?.status === 'assinado').length;
  
  // Receita Est. Mensal: soma de todas as parcelas com vencimento no mês atual (Pagas ou Em Aberto)
  const currentMonthStr = getYearMonth(new Date());
  const currentMonthPayments = payments.filter(p => p.vencimento && getYearMonth(p.vencimento) === currentMonthStr && p.status !== 'Cancelado' && p.valor <= 2000);
  const activeClientsList = clients.filter(c => c.dadosComerciais?.status === 'ativo' || c.dadosComerciais?.status === 'assinado');
  
  const revenueEst = currentMonthPayments.length > 0
    ? currentMonthPayments.reduce((sum, p) => sum + p.valor, 0)
    : activeClientsList.reduce((acc, c) => acc + (Number(c.dadosComerciais?.valorUnitario) || 310), 0);
  const todayApts = appointments.filter(a => {
    const todayStr = new Date().toISOString().split('T')[0];
    return a.data === todayStr && a.status !== 'cancelado';
  }).length;

  return (
    <div>
      {/* 1. View: Dashboard Principal */}
      {activeTab === 'dashboard' && (
        <>
          <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div className="view-title-group">
              <h1>Dashboard Administrativo</h1>
              <p>Visão geral de faturamento, alunos ativos e ocupação diária.</p>
            </div>
          </div>

          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-info">
                <h3>Total de Alunos</h3>
                <div className="value">{totalClients}</div>
              </div>
              <div className="metric-icon"><i className="fa-solid fa-users"></i></div>
            </div>
            <div className="metric-card">
              <div className="metric-info">
                <h3>Alunos Ativos</h3>
                <div className="value">{activeClients}</div>
              </div>
              <div className="metric-icon"><i className="fa-solid fa-user-check"></i></div>
            </div>
            <div className="metric-card">
              <div className="metric-info">
                <h3>Atendimentos Hoje</h3>
                <div className="value">{todayApts}</div>
              </div>
              <div className="metric-icon indigo"><i className="fa-solid fa-calendar-day"></i></div>
            </div>
            <div className="metric-card">
              <div className="metric-info">
                <h3>Receita Est. Mensal</h3>
                <div className="value">R$ {revenueEst.toFixed(2).replace('.', ',')}</div>
              </div>
              <div className="metric-icon warning"><i className="fa-solid fa-wallet"></i></div>
            </div>
          </div>

          {/* Alertas de Notificação do Sistema */}
          {(() => {
            const expiredClients = clients.filter(c => c.dadosComerciais?.status === 'vencido');
            const alertClients = clients.filter(c => {
              if (c.dadosComerciais?.status !== 'ativo') return false;
              const metrics = getWeeklyFrequencyMetrics(c, appointments, simulatedDate);
              return metrics?.alerta;
            });

            if (expiredClients.length === 0 && alertClients.length === 0) return null;

            return (
              <div className="content-panel" style={{ marginTop: '24px', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.02)' }}>
                <div className="panel-header">
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171' }}>
                    <i className="fa-solid fa-triangle-exclamation"></i> Alertas do Sistema
                  </h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                  {expiredClients.map(c => (
                    <div key={c._id} className="notification-card unread" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <i className="fa-solid fa-circle-exclamation" style={{ color: '#ef4444' }}></i>
                        <span style={{ fontSize: '0.85rem' }}>
                          O plano de <strong>{c.dadosPessoais?.nome}</strong> venceu em <strong>{c.dadosComerciais?.vencimento ? new Date(c.dadosComerciais.vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</strong>. Status atual: <strong>Vencido</strong>.
                        </span>
                      </div>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => alert('Notificação enviada ao aluno!')}>
                        Notificar
                      </button>
                    </div>
                  ))}
                  {alertClients.map(c => {
                    const metrics = getWeeklyFrequencyMetrics(c, appointments, simulatedDate);
                    if (!metrics) return null;
                    const diasRestantesNomes: Record<number, string> = {
                      4: '(terça a sexta)',
                      3: '(quarta a sexta)',
                      2: '(quinta e sexta)',
                      1: '(sexta-feira)'
                    };
                    const diasRestantesTexto = diasRestantesNomes[metrics.diasRestantes] || '';
                    return (
                      <div key={c._id} className="notification-card unread" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <i className="fa-solid fa-clock-rotate-left" style={{ color: '#f59e0b' }}></i>
                          <span style={{ fontSize: '0.85rem' }}>
                            <strong>Risco de Evasão Semanal</strong>: <strong>{c.dadosPessoais?.nome}</strong> contratou <strong>{metrics.frequenciaSemanal}x/sem</strong>, mas realizou <strong>{metrics.realizados}</strong> e agendou <strong>{metrics.agendados}</strong> treinos. Restam apenas <strong>{metrics.diasRestantes}</strong> dias úteis na semana {diasRestantesTexto} para <strong>{metrics.pendentes}</strong> treino(s) pendente(s).
                          </span>
                        </div>
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => sendPreventiveAlert(c)} style={{ background: '#10b981', borderColor: '#10b981' }}>
                          <i className="fa-brands fa-whatsapp" style={{ marginRight: '6px' }}></i> Engajar
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Quick Frequency Monitoring Table */}
          <div className="content-panel" style={{ marginTop: '24px' }}>
            <div className="panel-header">
              <h2>Acompanhamento de Frequência Contratada</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="page-size-selector">
                  <span>Exibir:</span>
                  <select value={getPageSize('dashboard_freq')} onChange={e => setPageSizeForKey('dashboard_freq', Number(e.target.value))}>
                    <option value={5}>5</option>
                    <option value={8}>8</option>
                    <option value={15}>15</option>
                  </select>
                </div>
                <span style={{ fontSize: '0.75rem', background: 'var(--color-primary)', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
                  Frequência Semanal (Seg-Sex)
                </span>
              </div>
            </div>
            <div className="table-responsive" style={{ marginTop: '12px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Plano</th>
                    <th style={{ textAlign: 'center' }}>Freq. Contratada</th>
                    <th style={{ textAlign: 'center' }}>Treinos Feitos</th>
                    <th style={{ textAlign: 'center' }}>Treinos Agendados</th>
                    <th style={{ textAlign: 'center' }}>Pendentes</th>
                    <th style={{ textAlign: 'center' }}>Dias Restantes</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'dashboard_freq';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const q = normalizeText(getSearchQuery(listKey));
                    const filtered = clients.filter(c => normalizeText(c.dadosPessoais?.nome).includes(q));
                    const totalPages = Math.ceil(filtered.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = filtered.slice((curP - 1) * size, curP * size);

                    return paginated.map(c => {
                      const planName = c.dadosComerciais?.planoId?.nome || 'Plano Personalizado';
                      const metrics = getWeeklyFrequencyMetrics(c, appointments, simulatedDate);
                      const status = c.dadosComerciais?.status || 'ativo';

                      if (!metrics) {
                        return (
                          <tr key={c._id}>
                            <td><strong>{c.dadosPessoais?.nome}</strong></td>
                            <td>{planName}</td>
                            <td style={{ textAlign: 'center' }}>-</td>
                            <td style={{ textAlign: 'center' }}>-</td>
                            <td style={{ textAlign: 'center' }}>-</td>
                            <td style={{ textAlign: 'center' }}>-</td>
                            <td style={{ textAlign: 'center' }}>-</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>
                                Sem Meta
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => handleOpenCreditModal(c)}>
                                <i className="fa-solid fa-coins" style={{ marginRight: '6px' }}></i> Adicionar Créditos
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      const statusBadge = metrics.alerta 
                        ? <span className="badge badge-danger"><i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '4px' }}></i> Zona Crítica</span>
                        : <span className="badge badge-success"><i className="fa-solid fa-circle-check" style={{ marginRight: '4px' }}></i> Seguro</span>;

                      return (
                        <tr key={c._id}>
                          <td data-label="Cliente"><strong>{c.dadosPessoais?.nome}</strong></td>
                          <td data-label="Plano">{planName}</td>
                          <td data-label="Freq. Contratada" style={{ textAlign: 'center', fontWeight: 600 }}>{metrics.frequenciaSemanal}x/semana</td>
                          <td data-label="Treinos Feitos" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--color-success)' }}>{metrics.realizados}</td>
                          <td data-label="Treinos Agendados" style={{ textAlign: 'center', fontWeight: 700, color: 'var(--color-info)' }}>{metrics.agendados}</td>
                          <td data-label="Pendentes" style={{ textAlign: 'center', fontWeight: 700, color: metrics.pendentes > 0 ? 'var(--color-warning)' : 'var(--text-muted)' }}>{metrics.pendentes}</td>
                          <td data-label="Dias Restantes" style={{ textAlign: 'center' }}>{metrics.diasRestantes} dias</td>
                          <td data-label="Status" style={{ textAlign: 'center' }}>
                            {status === 'ativo' ? statusBadge : (
                              <span className="badge badge-danger">Vencido</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => handleOpenCreditModal(c)} title="Adicionar Créditos">
                                <i className="fa-solid fa-coins"></i>
                              </button>
                              {metrics.alerta && status === 'ativo' && (
                                <button className="btn btn-primary btn-sm" onClick={() => sendPreventiveAlert(c)} style={{ background: '#10b981', borderColor: '#10b981' }} title="Engajar WhatsApp">
                                  <i className="fa-brands fa-whatsapp"></i> Engajar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                  {clients.length === 0 && (
                    <tr>
                      <td colSpan={9}>
                        <div className="empty-state-card">
                          <i className="fa-solid fa-users-slash empty-state-icon"></i>
                          <div className="empty-state-title">Nenhum aluno cadastrado</div>
                          <div className="empty-state-desc">Não há alunos registrados no sistema para acompanhamento.</div>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => handleOpenClientModal()}>
                            <i className="fa-solid fa-plus"></i> Novo Aluno
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {clients.length > 0 && (
              <Pagination
                currentPage={getPage('dashboard_freq')}
                totalItems={clients.length}
                itemsPerPage={getPageSize('dashboard_freq')}
                onPageChange={page => setPage('dashboard_freq', page)}
              />
            )}
          </div>
        </>
      )}

      {/* 2. View: Profissionais */}
      {activeTab === 'profissionais' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Gestão de Profissionais</h1>
              <p>Cadastre e gerencie a equipe do Clube Fitness Fisio.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="page-size-selector">
                <span>Exibir:</span>
                <select value={getPageSize('profissionais')} onChange={e => setPageSizeForKey('profissionais', Number(e.target.value))}>
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={15}>15</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={() => handleOpenProfModal()}>
                <i className="fa-solid fa-plus"></i> Novo Profissional
              </button>
            </div>
          </div>

          <div className="content-panel">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input type="text" className="form-control" placeholder="Buscar profissional..." value={getSearchQuery('profissionais')} onChange={e => setSearchQueryForKey('profissionais', e.target.value)} style={{ maxWidth: '300px' }} />
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Especialidade</th>
                    <th>Registro Profissional</th>
                    <th>Email de Acesso</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'profissionais';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const q = normalizeText(getSearchQuery(listKey));
                    const filtered = professionals.filter(p => normalizeText(p.nome).includes(q) || normalizeText(p.userId?.email).includes(q));
                    const totalPages = Math.ceil(filtered.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = filtered.slice((curP - 1) * size, curP * size);

                    return paginated.map(p => (
                      <tr key={p._id}>
                        <td><strong>{p.nome}</strong></td>
                        <td><span className="badge badge-info">{p.especialidade}</span></td>
                        <td><code>{p.registro}</code></td>
                        <td>{p.userId?.email}</td>
                        <td>
                          <button className="btn btn-secondary btn-sm" style={{ marginRight: '8px' }} onClick={() => handleOpenProfModal(p)}>
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteProf(p._id)}>
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                  {professionals.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state-card">
                          <i className="fa-solid fa-user-doctor empty-state-icon"></i>
                          <div className="empty-state-title">Nenhum profissional cadastrado</div>
                          <div className="empty-state-desc">Não há profissionais ou fisioterapeutas cadastrados no sistema.</div>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => handleOpenProfModal()}>
                            <i className="fa-solid fa-plus"></i> Novo Profissional
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {professionals.length > 0 && (
              <Pagination
                currentPage={getPage('profissionais')}
                totalItems={professionals.length}
                itemsPerPage={getPageSize('profissionais')}
                onPageChange={page => setPage('profissionais', page)}
              />
            )}
          </div>
        </>
      )}

      {/* 2.5. View: Vincular Alunos */}
      {activeTab === 'vincular_alunos' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Vincular Alunos a Profissionais</h1>
              <p>Associe cada aluno ao profissional de saúde responsável.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="page-size-selector">
                <span>Exibir:</span>
                <select value={getPageSize('vincular_alunos')} onChange={e => setPageSizeForKey('vincular_alunos', Number(e.target.value))}>
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={15}>15</option>
                </select>
              </div>
            </div>
          </div>
          <div className="content-panel">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar aluno..."
                value={getSearchQuery('vincular_alunos')}
                onChange={e => setSearchQueryForKey('vincular_alunos', e.target.value)}
                style={{ maxWidth: '300px' }}
              />
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Plano Ativo</th>
                    <th>Profissional Responsável</th>
                    <th>Status de Salvamento</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'vincular_alunos';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const q = normalizeText(getSearchQuery(listKey));
                    const filtered = clients.filter(c => 
                      normalizeText(c.dadosPessoais?.nome).includes(q) || 
                      normalizeText(c.dadosPessoais?.email).includes(q)
                    );
                    const totalPages = Math.ceil(filtered.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = filtered.slice((curP - 1) * size, curP * size);

                    if (paginated.length === 0) {
                      return (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
                            Nenhum aluno encontrado.
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <>
                        {paginated.map(c => {
                          const planName = c.dadosComerciais?.planoId?.nome || 'Personalizado';
                          const currentProfId = c.profissionalId?._id || c.profissionalId || '';
                          const saveStatus = savingClientProf[c._id];

                          const handleProfChange = async (profId: string) => {
                            setSavingClientProf(prev => ({ ...prev, [c._id]: 'salvando' }));
                            try {
                              const res = await fetch('/api/clients', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  id: c._id,
                                  profissionalId: profId || null
                                })
                              });
                              const data = await res.json();
                              if (data.success) {
                                setClients(prev => prev.map(item => item._id === c._id ? { ...item, profissionalId: profId || null } : item));
                                setSavingClientProf(prev => ({ ...prev, [c._id]: 'salvo' }));
                                setTimeout(() => {
                                  setSavingClientProf(prev => {
                                    const copy = { ...prev };
                                    delete copy[c._id];
                                    return copy;
                                  });
                                }, 2000);
                              } else {
                                setSavingClientProf(prev => ({ ...prev, [c._id]: 'erro' }));
                              }
                            } catch (e) {
                              setSavingClientProf(prev => ({ ...prev, [c._id]: 'erro' }));
                            }
                          };

                          return (
                            <tr key={c._id}>
                              <td>
                                <strong>{c.dadosPessoais?.nome}</strong>
                                <br />
                                <small style={{ color: 'var(--text-dim)' }}>{c.dadosPessoais?.email}</small>
                              </td>
                              <td>{planName}</td>
                              <td>
                                <select
                                  value={currentProfId}
                                  onChange={e => handleProfChange(e.target.value)}
                                  className="form-control"
                                  style={{ maxWidth: '250px', background: 'var(--bg-secondary)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                                >
                                  <option value="">Nenhum/Sem Vínculo</option>
                                  {professionals.map(p => (
                                    <option key={p._id} value={p._id}>{p.nome}</option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ verticalAlign: 'middle' }}>
                                {saveStatus === 'salvando' && (
                                  <span style={{ color: 'var(--color-primary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <i className="fa-solid fa-spinner fa-spin"></i> Salvando...
                                  </span>
                                )}
                                {saveStatus === 'salvo' && (
                                  <span style={{ color: '#10b981', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <i className="fa-solid fa-check"></i> Salvo!
                                  </span>
                                )}
                                {saveStatus === 'erro' && (
                                  <span style={{ color: 'var(--color-danger)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <i className="fa-solid fa-triangle-exclamation"></i> Erro ao salvar
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
            {(() => {
              const listKey = 'vincular_alunos';
              const q = normalizeText(getSearchQuery(listKey));
              const filtered = clients.filter(c => 
                normalizeText(c.dadosPessoais?.nome).includes(q) || 
                normalizeText(c.dadosPessoais?.email).includes(q)
              );
              const totalPages = Math.ceil(filtered.length / getPageSize(listKey));
              if (totalPages <= 1) return null;
              return (
                <Pagination
                  currentPage={getPage(listKey)}
                  totalItems={filtered.length}
                  itemsPerPage={getPageSize(listKey)}
                  onPageChange={page => setPage(listKey, page)}
                />
              );
            })()}
          </div>
        </>
      )}

      {/* 2.6. View: Log de Atividades */}
      {activeTab === 'log_atividades' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Log de Atividades (Auditoria)</h1>
              <p>Histórico de ações realizadas pelos profissionais no sistema.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="page-size-selector">
                <span>Exibir:</span>
                <select value={getPageSize('log_atividades')} onChange={e => setPageSizeForKey('log_atividades', Number(e.target.value))}>
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={15}>15</option>
                </select>
              </div>
            </div>
          </div>
          <div className="content-panel">
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por ação, profissional ou aluno..."
                value={getSearchQuery('log_atividades')}
                onChange={e => setSearchQueryForKey('log_atividades', e.target.value)}
                style={{ maxWidth: '300px' }}
              />
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data / Hora</th>
                    <th>Profissional</th>
                    <th>Ação</th>
                    <th>Aluno Alvo</th>
                    <th>Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'log_atividades';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const q = normalizeText(getSearchQuery(listKey));
                    
                    const filtered = activityLogs.filter(log => {
                      const matchesSearch = 
                        normalizeText(log.acao).includes(q) || 
                        normalizeText(log.detalhes).includes(q) ||
                        normalizeText(log.profissionalId?.nome).includes(q) ||
                        normalizeText(log.clienteId?.dadosPessoais?.nome).includes(q);
                      return matchesSearch;
                    });

                    const totalPages = Math.ceil(filtered.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = filtered.slice((curP - 1) * size, curP * size);

                    if (paginated.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
                            Nenhuma atividade registrada.
                          </td>
                        </tr>
                      );
                    }

                    return paginated.map(log => {
                      const formattedDate = new Date(log.createdAt).toLocaleString('pt-BR');
                      const profName = log.profissionalId?.nome || 'Profissional Desconhecido';
                      const clientName = log.clienteId?.dadosPessoais?.nome || '-';
                      const isColetivo = log.origem === 'Computador Coletivo';

                      return (
                        <tr key={log._id}>
                          <td><strong>{formattedDate}</strong></td>
                          <td>{profName}</td>
                          <td>
                            <strong>{log.acao}</strong>
                            {log.detalhes && (
                              <>
                                <br />
                                <small style={{ color: 'var(--text-dim)' }}>{log.detalhes}</small>
                              </>
                            )}
                          </td>
                          <td>{clientName}</td>
                          <td>
                            <span className={`badge ${isColetivo ? 'badge-info' : 'badge-secondary'}`}>
                              {log.origem}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
            {(() => {
              const listKey = 'log_atividades';
              const q = normalizeText(getSearchQuery(listKey));
              const filtered = activityLogs.filter(log => 
                normalizeText(log.acao).includes(q) || 
                normalizeText(log.detalhes).includes(q) ||
                normalizeText(log.profissionalId?.nome).includes(q) ||
                normalizeText(log.clienteId?.dadosPessoais?.nome).includes(q)
              );
              const totalPages = Math.ceil(filtered.length / getPageSize(listKey));
              if (totalPages <= 1) return null;
              return (
                <Pagination
                  currentPage={getPage(listKey)}
                  totalItems={filtered.length}
                  itemsPerPage={getPageSize(listKey)}
                  onPageChange={page => setPage(listKey, page)}
                />
              );
            })()}
          </div>
        </>
      )}

      {/* 3. View: Clientes */}
      {activeTab === 'clientes' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Cadastro Geral de Clientes</h1>
              <p>Gerencie dados clínicos, contratos e planos dos alunos.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="page-size-selector">
                <span>Exibir:</span>
                <select value={getPageSize('clientes')} onChange={e => setPageSizeForKey('clientes', Number(e.target.value))}>
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={15}>15</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={() => handleOpenClientModal()}>
                <i className="fa-solid fa-plus"></i> Novo Aluno
              </button>
            </div>
          </div>

          <div className="content-panel">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input type="text" className="form-control" placeholder="Buscar aluno..." value={getSearchQuery('clientes')} onChange={e => setSearchQueryForKey('clientes', e.target.value)} style={{ maxWidth: '300px' }} />
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>CPF</th>
                    <th>Telefone</th>
                    <th>Plano Atual</th>
                    <th>Vencimento</th>
                    <th style={{ textAlign: 'center' }}>Créditos Restantes</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'clientes';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const q = normalizeText(getSearchQuery(listKey));
                    const filtered = clients.filter(c => normalizeText(c.dadosPessoais?.nome).includes(q) || normalizeText(c.dadosPessoais?.email).includes(q) || (c.dadosPessoais?.cpf || '').includes(q));
                    const totalPages = Math.ceil(filtered.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = filtered.slice((curP - 1) * size, curP * size);

                    return paginated.map(c => {
                      const status = c.dadosComerciais?.status || 'ativo';
                      const planName = c.dadosComerciais?.planoId?.nome || 'Personalizado';
                      const credTotal = c.dadosComerciais?.creditosTotal || 0;
                      const credUsados = c.dadosComerciais?.creditosUsados || 0;
                      const credReservados = c.dadosComerciais?.creditosReservados || 0;
                      const credDisp = Math.max(0, credTotal - credUsados - credReservados);
                      return (
                        <tr key={c._id}>
                          <td><strong>{c.dadosPessoais?.nome}</strong><br/><small style={{ color: 'var(--text-dim)' }}>{c.dadosPessoais?.email}</small></td>
                          <td>{c.dadosPessoais?.cpf || '-'}</td>
                          <td>{c.dadosPessoais?.telefone || '-'}</td>
                          <td>{planName}</td>
                          <td>{c.dadosComerciais?.vencimento || '-'}</td>
                          <td style={{ textAlign: 'center' }}><strong>{credDisp}</strong> <small style={{ color: 'var(--text-dim)' }}>(de {credTotal})</small></td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${status === 'ativo' ? 'badge-success' : 'badge-danger'}`}>
                              {status === 'ativo' ? 'Ativo' : 'Vencido'}
                            </span>
                          </td>
                          <td style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            <button className="btn btn-secondary btn-sm" title="Ver Ficha Completa" onClick={() => {
                              setDetailClient(c);
                              setDcNome(c.dadosPessoais?.nome || '');
                              setDcEmail(c.dadosPessoais?.email || '');
                              setDcCpf(c.dadosPessoais?.cpf || '');
                              setDcTelefone(c.dadosPessoais?.telefone || '');
                              setDcSexo(c.dadosPessoais?.sexo || 'M');
                              setDcNascimento(c.dadosPessoais?.dataNascimento || '');
                              setDcEndereco(c.dadosPessoais?.endereco || '');
                              setDcTelefoneSecundario(c.dadosPessoais?.telefoneSecundario || '');
                              setDcEstadoCivil(c.dadosPessoais?.estadoCivil || 'solteiro(a)');
                              setDcNacionalidade(c.dadosPessoais?.nacionalidade || 'brasileiro(a)');
                              setDcProfissao(c.dadosPessoais?.profissao || 'autônomo(a)');
                              setDcNumero(c.dadosPessoais?.numero || '');
                              setDcComplemento(c.dadosPessoais?.complemento || '');
                              setDcBairro(c.dadosPessoais?.bairro || '');
                              setDcCidade(c.dadosPessoais?.cidade || '');
                              setDcEstado(c.dadosPessoais?.estado || '');
                              setDcCep(c.dadosPessoais?.cep || '');
                              
                              setDcLesãoes(c.dadosClinicos?.lesoes || '');
                              setDcRestricoes(c.dadosClinicos?.restricoes || '');
                              setDcMedicamentos(c.dadosClinicos?.medicamentos || '');
                              setDcHistorico(c.dadosClinicos?.historicoClinico || '');
                              setDcObsClin(c.dadosClinicos?.observacoes || '');
                              
                              setDcPlano(c.dadosComerciais?.planoId?._id || c.dadosComerciais?.planoId || '');
                              setDcVencimento(c.dadosComerciais?.dataPrimeiroVencimento || c.dadosComerciais?.dataInicio || new Date().toISOString().split('T')[0]);
                              setDcStatus(c.dadosComerciais?.status || 'ativo');
                              setDcFormaPag(c.dadosComerciais?.formaPagamento || 'pix');
                              setDcDuracao(c.dadosComerciais?.duracao || 'mensal');
                              setDcVigenciaQtd(c.dadosComerciais?.duracaoQtd || 1);
                              setDcValorUnitario(c.dadosComerciais?.valorUnitario || 0);
                              setDcDescontoTipo(c.dadosComerciais?.descontoTipo || 'percentual');
                              setDcDescontoValor(c.dadosComerciais?.descontoValor || 0);
                              setDcParcelas(c.dadosComerciais?.parcelas || 1);
                              setDcDataInicio(c.dadosComerciais?.dataInicio || c.dadosComerciais?.vencimento || '');
                              setDcResponsavelVenda(c.dadosComerciais?.responsavelVenda || '');
                              setDcUnidadeContratada(c.dadosComerciais?.unidadeContratada || '');
                              setDcObservacoesContratuais(c.dadosComerciais?.observacoesContratuais || '');
                              setDcFrequencia(c.dadosComerciais?.frequencia || 3);
    setDcAsaasCustomerId(c.dadosComerciais?.asaasCustomerId || '');
    setDcCreditosTotal(c.dadosComerciais?.creditosTotal !== undefined ? c.dadosComerciais.creditosTotal : (c.dadosComerciais?.frequencia ? getCreditsForFreq(c.dadosComerciais.frequencia) : 13));
    setDcCreditosMassagem(c.dadosComerciais?.creditosMassagemTotal || 0);
    setDcCreditosEmergencia(c.dadosComerciais?.creditosEmergenciaTotal || 0);
    setDcCreditosTotal(c.dadosComerciais?.creditosTotal !== undefined ? c.dadosComerciais.creditosTotal : (c.dadosComerciais?.frequencia ? getCreditsForFreq(c.dadosComerciais.frequencia) : 13));
    setDcCreditosMassagem(c.dadosComerciais?.creditosMassagemTotal || 0);
    setDcCreditosEmergencia(c.dadosComerciais?.creditosEmergenciaTotal || 0);
                              
                              setSignatureName(c.dadosPessoais?.nome || '');
                              setShowContractPreview(false);
                              setClientContracts([]);
                              
                              fetch(`/api/contracts?clientId=${c._id}`)
                                .then(res => res.json())
                                .then(data => {
                                  if (data.success) {
                                    setClientContracts(data.data);
                                  }
                                });

                              setClientDetailTab('pessoais');
                              setShowClientDetailModal(true);
                            }}>
                              <i className="fa-solid fa-id-card"></i>
                            </button>
                            <button className="btn btn-secondary btn-sm" title="Editar" onClick={() => handleOpenClientModal(c)}>
                              <i className="fa-solid fa-pen"></i>
                            </button>
                            <button className="btn btn-secondary btn-sm" title="Baixar Contrato PDF" onClick={() => {
                              const plan = plans.find((p: any) => p._id === (c.dadosComerciais?.planoId?._id || c.dadosComerciais?.planoId));
                              downloadContractPDF(c, plan, c.contratoTexto, c.contrato || c.dadosComerciais);
                            }}>
                              <i className="fa-solid fa-file-contract"></i>
                            </button>
                            <button className="btn btn-danger btn-sm" title="Excluir" onClick={() => handleDeleteClient(c._id)}>
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                  {clients.length === 0 && (
                    <tr>
                      <td colSpan={8}>
                        <div className="empty-state-card">
                          <i className="fa-solid fa-users-slash empty-state-icon"></i>
                          <div className="empty-state-title">Nenhum aluno cadastrado</div>
                          <div className="empty-state-desc">Não há alunos registrados no sistema.</div>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => handleOpenClientModal()}>
                            <i className="fa-solid fa-plus"></i> Novo Aluno
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {clients.length > 0 && (
              <Pagination
                currentPage={getPage('clientes')}
                totalItems={clients.length}
                itemsPerPage={getPageSize('clientes')}
                onPageChange={page => setPage('clientes', page)}
              />
            )}
          </div>
        </>
      )}

      {/* 3b. View: Dados Clínicos */}
      {activeTab === 'dados_clinicos' && (
        <DadosClinicosPanel clients={clients} onUpdate={fetchData} />
      )}

      {/* 4. View: Usuários */}
      {activeTab === 'usuarios' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Cadastro de Usuários</h1>
              <p>Gerencie todos os usuários do sistema, defina seus perfis e credenciais de acesso.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="page-size-selector">
                <span>Exibir:</span>
                <select value={getPageSize('usuarios')} onChange={e => setPageSizeForKey('usuarios', Number(e.target.value))}>
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={15}>15</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={() => handleOpenUserModal()}>
                <i className="fa-solid fa-plus"></i> Novo Usuário
              </button>
            </div>
          </div>

          <div className="content-panel">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input type="text" className="form-control" placeholder="Buscar usurio..." value={getSearchQuery('usuarios')} onChange={e => setSearchQueryForKey('usuarios', e.target.value)} style={{ maxWidth: '300px' }} />
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th style={{ textAlign: 'center' }}>Perfil</th>
                    <th>Detalhes do Perfil</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'usuarios';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const q = normalizeText(getSearchQuery(listKey));
                    const filtered = users.filter(u => normalizeText(u.nome).includes(q) || normalizeText(u.email).includes(q));
                    const totalPages = Math.ceil(filtered.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = filtered.slice((curP - 1) * size, curP * size);

                    return paginated.map(u => {
                      const userRoles = u.roles && u.roles.length > 0 ? u.roles : [u.tipo];
                      const roleBadges = userRoles.map((r: string) => {
                        let badgeClass = 'badge-success';
                        let label = 'Aluno';
                        if (r === 'admin') {
                          badgeClass = 'badge-warning';
                          label = 'Admin';
                        } else if (r === 'receptionist') {
                          badgeClass = 'badge-primary';
                          label = 'Recepção';
                        } else if (r === 'professional') {
                          badgeClass = 'badge-info';
                          label = 'Profissional';
                        }
                        return (
                          <span key={r} className={`badge ${badgeClass}`} style={{ marginRight: '4px', textTransform: 'uppercase', fontSize: '0.68rem', display: 'inline-block' }}>
                            {label}
                          </span>
                        );
                      });

                      let detailsList = [];
                      if (userRoles.includes('client')) {
                        const planoNome = u.clientDetails?.dadosComerciais?.planoId?.nome || 'Sem Plano';
                        detailsList.push(`Aluno (${planoNome})`);
                      }
                      if (userRoles.includes('professional')) {
                        const espec = u.professionalDetails?.especialidade || 'Fisio/Treino';
                        detailsList.push(`Prof (${espec})`);
                      }
                      if (detailsList.length === 0) {
                        detailsList.push('-');
                      }
                      const details = detailsList.join(' | ');

                      return (
                        <tr key={u._id}>
                          <td><strong>{u.nome}</strong></td>
                          <td>{u.email}</td>
                          <td style={{ textAlign: 'center' }}>
                            {roleBadges}
                          </td>
                          <td>{details}</td>
                          <td>
                            <button className="btn btn-secondary btn-sm" style={{ marginRight: '8px' }} onClick={() => handleOpenUserModal(u)}>
                              <i className="fa-solid fa-pen"></i>
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u._id)}>
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-state-card">
                          <i className="fa-solid fa-users empty-state-icon"></i>
                          <div className="empty-state-title">Nenhum usuário cadastrado</div>
                          <div className="empty-state-desc">Não há contas de usuários cadastradas no sistema.</div>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => handleOpenUserModal()}>
                            <i className="fa-solid fa-plus"></i> Novo Usuário
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {users.length > 0 && (
              <Pagination
                currentPage={getPage('usuarios')}
                totalItems={users.length}
                itemsPerPage={getPageSize('usuarios')}
                onPageChange={page => setPage('usuarios', page)}
              />
            )}
          </div>
        </>
      )}

      {/* 5. View: Controle de Créditos */}
      {activeTab === 'controle_creditos' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Controle de Créditos</h1>
              <p>Audite e gerencie o saldo de créditos semanais e mensais dos alunos.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="page-size-selector">
                <span>Exibir:</span>
                <select value={getPageSize('controle_creditos')} onChange={e => setPageSizeForKey('controle_creditos', Number(e.target.value))}>
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={15}>15</option>
                </select>
              </div>
            </div>
          </div>

          <div className="content-panel">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Plano Atual</th>
                    <th style={{ textAlign: 'center' }}>Total de Créditos</th>
                    <th style={{ textAlign: 'center' }}>Créditos Usados</th>
                    <th style={{ textAlign: 'center' }}>Créditos Reservados</th>
                    <th style={{ textAlign: 'center' }}>Saldo Disponível</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'controle_creditos';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const q = normalizeText(getSearchQuery(listKey));
                    const filtered = clients.filter(c => normalizeText(c.dadosPessoais?.nome).includes(q) || normalizeText(c.dadosPessoais?.email).includes(q) || (c.dadosPessoais?.cpf || '').includes(q));
                    const totalPages = Math.ceil(filtered.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = filtered.slice((curP - 1) * size, curP * size);

                    return paginated.map(c => {
                      const planName = c.dadosComerciais?.planoId?.nome || 'Personalizado';
                      const total = c.dadosComerciais?.creditosTotal || 0;
                      const usados = c.dadosComerciais?.creditosUsados || 0;
                      const reservados = c.dadosComerciais?.creditosReservados || 0;
                      const saldo = Math.max(0, total - usados - reservados);
                      return (
                        <tr key={c._id}>
                          <td><strong>{c.dadosPessoais?.nome}</strong><br/><small style={{ color: 'var(--text-dim)' }}>{c.dadosPessoais?.email}</small></td>
                          <td>{planName}</td>
                          <td style={{ textAlign: 'center' }}>{total}</td>
                          <td style={{ textAlign: 'center' }}>{usados}</td>
                          <td style={{ textAlign: 'center' }}>{reservados}</td>
                          <td style={{ textAlign: 'center' }}><strong style={{ color: 'var(--color-primary)' }}>{saldo}</strong></td>
                          <td style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleOpenCreditModal(c)}>
                              <i className="fa-solid fa-coins"></i> Ajustar Créditos
                            </button>
                            <button className="btn btn-info btn-sm" onClick={() => handleOpenRulesModal(c)}>
                              <i className="fa-solid fa-scale-balanced"></i> Regras
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                  {clients.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty-state-card">
                          <i className="fa-solid fa-coins empty-state-icon"></i>
                          <div className="empty-state-title">Nenhum aluno cadastrado</div>
                          <div className="empty-state-desc">Não há alunos disponíveis para ajuste de créditos.</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {clients.length > 0 && (
              <Pagination
                currentPage={getPage('controle_creditos')}
                totalItems={clients.length}
                itemsPerPage={getPageSize('controle_creditos')}
                onPageChange={page => setPage('controle_creditos', page)}
              />
            )}
          </div>
        </>
      )}

      {/* 6. View: Planos & Configs */}
      {activeTab === 'planos' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Planos & Configurações</h1>
              <p>Crie e gerencie as opções de planos e mensalidades oferecidas no clube.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="page-size-selector">
                <span>Exibir:</span>
                <select value={getPageSize('planos')} onChange={e => setPageSizeForKey('planos', Number(e.target.value))}>
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={15}>15</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={() => handleOpenPlanModal()}>
                <i className="fa-solid fa-plus"></i> Novo Plano
              </button>
            </div>
          </div>

          <div className="content-panel">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome do Plano</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'planos';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const totalPages = Math.ceil(plans.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = plans.slice((curP - 1) * size, curP * size);

                    return paginated.map(p => (
                      <tr key={p._id}>
                        <td><strong>{p.nome}</strong></td>
                        <td style={{ textAlign: 'center' }}>
                          <button className="btn btn-secondary btn-sm" style={{ marginRight: '8px' }} onClick={() => handleOpenPlanModal(p)}>
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeletePlan(p._id)}>
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                  {plans.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state-card">
                          <i className="fa-solid fa-folder-open empty-state-icon"></i>
                          <div className="empty-state-title">Nenhum plano cadastrado</div>
                          <div className="empty-state-desc">Não há planos de assinaturas cadastrados no sistema.</div>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => handleOpenPlanModal()}>
                            <i className="fa-solid fa-plus"></i> Novo Plano
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {plans.length > 0 && (
              <Pagination
                currentPage={getPage('planos')}
                totalItems={plans.length}
                itemsPerPage={getPageSize('planos')}
                onPageChange={page => setPage('planos', page)}
              />
            )}
          </div>
        </>
      )}

      {/* 7. View: Horários Fixos */}
      {activeTab === 'agenda_fixa' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Regras de Horários Fixos</h1>
              <p>Monitore quais alunos possuem horários recorrentes reservados na agenda.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button className="btn btn-primary" onClick={() => setShowFixedSchedModal(true)}>
                <i className="fa-solid fa-plus" style={{ marginRight: '6px' }} />Novo Horário Fixo
              </button>
              <div className="page-size-selector">
                <span>Exibir:</span>
                <select value={getPageSize('agenda_fixa')} onChange={e => setPageSizeForKey('agenda_fixa', Number(e.target.value))}>
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={15}>15</option>
                </select>
              </div>
            </div>
          </div>

          <div className="content-panel">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input type="text" className="form-control" placeholder="Buscar por aluno ou profissional..." value={getSearchQuery('agenda_fixa')} onChange={e => setSearchQueryForKey('agenda_fixa', e.target.value)} style={{ maxWidth: '300px' }} />
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Dia da Semana</th>
                    <th>Horário</th>
                    <th>Serviço</th>
                    <th>Vigência da Regra</th>
                    <th style={{ textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'agenda_fixa';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const q = normalizeText(getSearchQuery(listKey));
                    const filtered = fixedSchedules.filter(fs => normalizeText(fs.clienteId?.dadosPessoais?.nome || fs.clienteId?.nome).includes(q) || normalizeText(fs.profissionalId?.nome).includes(q));
                    const totalPages = Math.ceil(filtered.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = filtered.slice((curP - 1) * size, curP * size);

                    const daysMap = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

                    return paginated.map(fs => {
                      const dayLabel = daysMap[fs.diaSemana] || fs.diaSemana;
                      return (
                        <tr key={fs._id}>
                          <td><strong>{fs.clienteId?.dadosPessoais?.nome || 'Aluno'}</strong></td>
                          <td>{dayLabel}</td>
                          <td>{fs.horario}</td>
                          <td>{fs.servico}</td>
                          <td>
                            {fs.dataInicio} {fs.dataFim ? `até ${fs.dataFim}` : '(Indeterminado)'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteFixedSchedule(fs._id)} title="Excluir Horário Fixo">
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                  {fixedSchedules.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-state-card">
                          <i className="fa-solid fa-calendar-alt empty-state-icon"></i>
                          <div className="empty-state-title">Nenhum horário fixo</div>
                          <div className="empty-state-desc">Não há horários fixos semanais agendados no sistema.</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {fixedSchedules.length > 0 && (
              <Pagination
                currentPage={getPage('agenda_fixa')}
                totalItems={fixedSchedules.length}
                itemsPerPage={getPageSize('agenda_fixa')}
                onPageChange={page => setPage('agenda_fixa', page)}
              />
            )}
          </div>
        </>
      )}

      {/* 8. View: Testes de Força */}
      {activeTab === 'testes_forca' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Avaliações de Força</h1>
              <p>Consulte os testes de força muscular realizados pela equipe clínica.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="page-size-selector">
                <span>Exibir:</span>
                <select value={getPageSize('testes_forca')} onChange={e => setPageSizeForKey('testes_forca', Number(e.target.value))}>
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={15}>15</option>
                </select>
              </div>
            </div>
          </div>

          <div className="content-panel">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Data do Teste</th>
                    <th>Movimentos / Cargas</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th>Avaliador</th>
                    <th>Observações</th>
                    <th style={{ textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'testes_forca';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const totalPages = Math.ceil(strengthTests.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = strengthTests.slice((curP - 1) * size, curP * size);

                    return paginated.map(st => {
                      const isNew = st.testesRealizados && st.testesRealizados.length > 0;
                      let metricaText = '';
                      let statusBadge = null;

                      if (isNew) {
                        const movs = st.testesRealizados.map((t: any) => `${t.articulacao} ${t.movimento} (${t.lado[0]})`);
                        const uniqueMovs = Array.from(new Set(movs)).join(', ');
                        metricaText = uniqueMovs.length > 50 ? uniqueMovs.substring(0, 47) + '...' : uniqueMovs;
                        
                        const hasSevere = st.testesRealizados.some((t: any) => t.classificacao === 'DÉFICIT GRAVE');
                        const hasModerate = st.testesRealizados.some((t: any) => t.classificacao === 'DÉFICIT MODERADO');
                        const hasAsym = st.comparativos?.some((c: any) => c.deficit > 20);
                        
                        if (hasSevere) {
                          statusBadge = <span className="badge badge-danger">Déficit Grave</span>;
                        } else if (hasAsym) {
                          statusBadge = <span className="badge badge-danger">Assimetria</span>;
                        } else if (hasModerate) {
                          statusBadge = <span className="badge badge-warning">Déficit Mod.</span>;
                        } else {
                          statusBadge = <span className="badge badge-success">Equilibrado</span>;
                        }
                      } else {
                        const ratio = st.analise?.ratios?.rotExternaRotInterna;
                        metricaText = ratio ? `Razão Rotadores: ${ratio.toFixed(2)}` : '-';
                        const risco = st.analise?.riscoOmbro;
                        statusBadge = (
                          <span className={`badge ${risco ? 'badge-danger' : 'badge-success'}`}>
                            {risco ? 'Alto Risco' : 'Normal / Seguro'}
                          </span>
                        );
                      }

                      return (
                        <tr key={st._id}>
                          <td><strong>{st.clienteId?.dadosPessoais?.nome || 'Aluno'}</strong></td>
                          <td>{st.data}</td>
                          <td>{metricaText}</td>
                          <td style={{ textAlign: 'center' }}>
                            {statusBadge}
                          </td>
                          <td>{st.profissionalId?.nome || 'Não Definido'}</td>
                          <td><small>{st.observacoes || '-'}</small></td>
                          <td style={{ textAlign: 'center' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => downloadStrengthTestPDF(st, st.clienteId, st.profissionalId)}>
                              <i className="fa-solid fa-download"></i> PDF
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                  {strengthTests.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty-state-card">
                          <i className="fa-solid fa-dumbbell empty-state-icon"></i>
                          <div className="empty-state-title">Nenhum teste de força</div>
                          <div className="empty-state-desc">Nenhum teste de força muscular cadastrado no banco.</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {strengthTests.length > 0 && (
              <Pagination
                currentPage={getPage('testes_forca')}
                totalItems={strengthTests.length}
                itemsPerPage={getPageSize('testes_forca')}
                onPageChange={page => setPage('testes_forca', page)}
              />
            )}
          </div>
        </>
      )}

      {/* 9. View: Financeiro */}
      {activeTab === 'financeiro' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Controle Financeiro</h1>
              <p>Gerencie as despesas, mensalidades e simule recebimentos.</p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid var(--border-color)', marginBottom: '20px' }}>
            <button
              onClick={() => setFinTab('mensalidades')}
              style={{ padding: '10px 20px', fontWeight: 600, fontSize: '0.9rem', background: 'none', border: 'none', cursor: 'pointer', color: finTab === 'mensalidades' ? 'var(--color-primary)' : 'var(--text-dim)', borderBottom: finTab === 'mensalidades' ? '3px solid var(--color-primary)' : '3px solid transparent', marginBottom: '-2px' }}
            >
              <i className="fa-solid fa-receipt" style={{ marginRight: '6px' }}></i>Mensalidades (Receber)
            </button>
            <button
              onClick={() => setFinTab('contas_pagar')}
              style={{ padding: '10px 20px', fontWeight: 600, fontSize: '0.9rem', background: 'none', border: 'none', cursor: 'pointer', color: finTab === 'contas_pagar' ? 'var(--color-success)' : 'var(--text-dim)', borderBottom: finTab === 'contas_pagar' ? '3px solid var(--color-success)' : '3px solid transparent', marginBottom: '-2px' }}
            >
              <i className="fa-solid fa-file-invoice-dollar" style={{ marginRight: '6px' }}></i>Contas a Pagar
            </button>
            <button
              onClick={() => setFinTab('recebimentos')}
              style={{ padding: '10px 20px', fontWeight: 600, fontSize: '0.9rem', background: 'none', border: 'none', cursor: 'pointer', color: finTab === 'recebimentos' ? 'var(--color-warning)' : 'var(--text-dim)', borderBottom: finTab === 'recebimentos' ? '3px solid var(--color-warning)' : '3px solid transparent', marginBottom: '-2px' }}
            >
              <i className="fa-solid fa-qrcode" style={{ marginRight: '6px' }}></i>Simulador de Recebimentos
            </button>
          </div>

          {/* TAB 1: MENSALIDADES */}
          {finTab === 'mensalidades' && (
            <>
              {/* Stats Cards */}
              {(() => {
                const todayStr = new Date().toISOString().split('T')[0];
                const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM
                
                const totalPaidThisMonth = payments
                  .filter(p => p.status === 'Pago' && p.vencimento.startsWith(currentMonthStr))
                  .reduce((sum, p) => sum + p.valor, 0);

                const totalPendingThisMonth = payments
                  .filter(p => p.status === 'Pendente' && p.vencimento >= todayStr && p.vencimento.startsWith(currentMonthStr))
                  .reduce((sum, p) => sum + p.valor, 0);

                const totalOverdue = payments
                  .filter(p => p.status === 'Pendente' && p.vencimento < todayStr)
                  .reduce((sum, p) => sum + p.valor, 0);

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--color-primary)', fontWeight: 600 }}>Total Recebido (Mês)</span>
                      <strong style={{ fontSize: '1.6rem', color: '#10b981' }}>R$ {totalPaidThisMonth.toFixed(2).replace('.', ',')}</strong>
                    </div>
                    <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600 }}>Total Pendente (Mês)</span>
                      <strong style={{ fontSize: '1.6rem', color: '#f59e0b' }}>R$ {totalPendingThisMonth.toFixed(2).replace('.', ',')}</strong>
                    </div>
                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600 }}>Total em Atraso</span>
                      <strong style={{ fontSize: '1.6rem', color: '#ef4444' }}>R$ {totalOverdue.toFixed(2).replace('.', ',')}</strong>
                    </div>
                  </div>
                );
              })()}

              {/* Filters & Search */}
              <div className="content-panel" style={{ padding: '16px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar por nome do aluno..."
                    value={paymentsSearch}
                    onChange={e => setPaymentsSearch(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <select
                    className="select-custom"
                    value={paymentsStatusFilter}
                    onChange={e => setPaymentsStatusFilter(e.target.value)}
                    style={{ width: '150px' }}
                  >
                    <option value="">Todos os Status</option>
                    <option value="Pago">Pago</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Atrasado">Atrasado</option>
                  </select>
                </div>
                <button className="btn btn-secondary" onClick={handleGlobalSync} disabled={loadingPayments}>
                  <i className="fa-solid fa-arrows-rotate" style={{ marginRight: '6px' }}></i>Atualizar
                </button>
              </div>

              {/* Table Grouped by Client */}
              <div className="content-panel" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}></th>
                        <th>Aluno</th>
                        <th>Plano</th>
                        <th>Status Consolidado</th>
                        <th style={{ textAlign: 'center' }}>Progresso</th>
                        <th>Próximo Vencimento</th>
                        <th>Total do Contrato</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getGroupedPayments().map((group: any) => {
                        const isExpanded = !!expandedClients[group.clientId];
                        let displayTotalValue = group.totalValue;
                        if (displayTotalValue > 5000) {
                          const validPayments = group.payments.filter((p: any) => p.valor <= 2000);
                          displayTotalValue = validPayments.length > 0 ? validPayments.reduce((s: number, p: any) => s + p.valor, 0) : 310;
                        }
                        return (
                          <React.Fragment key={group.clientId}>
                            <tr 
                              style={{ cursor: 'pointer', background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                              onClick={() => setExpandedClients(prev => ({ ...prev, [group.clientId]: !isExpanded }))}
                            >
                              <td style={{ textAlign: 'center' }}>
                                <i className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ color: 'var(--text-dim)' }}></i>
                              </td>
                              <td><strong>{group.clientNome}</strong></td>
                              <td>{group.planoNome}</td>
                              <td>
                                {group.status === 'Pago' ? (
                                  <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Totalmente Quitado</span>
                                ) : group.status === 'Atrasado' ? (
                                  <span className="badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', animation: 'pulse 2s infinite' }}>Em Atraso</span>
                                ) : (
                                  <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 600 }}>Em Dia</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'center' }}><strong>{group.paidCount}</strong> de {group.totalCount}</td>
                              <td>{group.proximoVencimento.split('-').reverse().join('/')}</td>
                              <td>R$ {displayTotalValue.toFixed(2).replace('.', ',')}</td>
                            </tr>
                            
                            {isExpanded && (
                              <tr>
                                <td colSpan={7} style={{ padding: '0 0 20px 40px', background: 'rgba(0,0,0,0.15)' }}>
                                  <div style={{ padding: '16px', borderLeft: '3px solid var(--color-primary)', background: 'rgba(255,255,255,0.01)', borderRadius: '0 8px 8px 0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 12px 0' }}>
                                      <h4 style={{ margin: 0, fontSize: '0.88rem', textTransform: 'uppercase', color: 'var(--color-primary)', fontWeight: 600 }}>Extrato de Parcelas</h4>
                                      {group.payments.some((p: any) => p.valor === 250 || p.formaPagamento === 'DINHEIRO' || p.formaPagamento === 'Dinheiro') && (
                                        <button
                                          className="btn btn-secondary btn-sm"
                                          style={{ fontSize: '0.75rem', padding: '3px 8px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)' }}
                                          onClick={(e) => { e.stopPropagation(); handleClean250Payments(group.clientId, group.clientNome); }}
                                        >
                                          <i className="fa-solid fa-broom" style={{ marginRight: '6px' }}></i>Limpar Cobranças Indevidas (R$ 250,00)
                                        </button>
                                      )}
                                    </div>
                                    <table className="data-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                                      <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                          <th>Parcela</th>
                                          <th>Vencimento</th>
                                          <th>Valor</th>
                                          <th>Método</th>
                                          <th>Status</th>
                                          <th style={{ textAlign: 'center' }}>Ações</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {group.payments.map((p: any) => {
                                          const isOverdue = p.status === 'Pendente' && p.vencimento < new Date().toISOString().split('T')[0];
                                          return (
                                            <tr key={p._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                              <td><strong>{p.parcelaNumero}/{p.parcelasTotal}</strong></td>
                                              <td>{p.vencimento.split('-').reverse().join('/')}</td>
                                              <td>R$ {p.valor.toFixed(2).replace('.', ',')}</td>
                                              <td><span className="badge" style={{ background: 'rgba(255,255,255,0.05)' }}>{p.formaPagamento}</span></td>
                                              <td>
                                                {p.status === 'Pago' ? (
                                                  <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>Pago</span>
                                                ) : isOverdue ? (
                                                  <span className="badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>Atrasado</span>
                                                ) : (
                                                  <span className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>A Vencer</span>
                                                )}
                                              </td>
                                              <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                                                  {p.status === 'Pendente' && p.formaPagamento !== 'Asaas' && (
                                                    <button
                                                      className="btn btn-primary btn-sm"
                                                      style={{ padding: '2px 8px', fontSize: '0.68rem' }}
                                                      onClick={() => {
                                                        setSelectedPayment(p);
                                                        setMpFormaPag(p.formaPagamento);
                                                        setMpDataPag(new Date().toISOString().split('T')[0]);
                                                        setShowManualPayModal(true);
                                                      }}
                                                    >
                                                      <i className="fa-solid fa-check" style={{ marginRight: '4px' }}></i>Receber
                                                    </button>
                                                  )}
                                                  {p.status === 'Pendente' && p.formaPagamento === 'Asaas' && (
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Integrado Asaas</span>
                                                  )}
                                                  {p.status === 'Pago' && (
                                                    <span style={{ fontSize: '0.72rem', color: '#10b981' }}><i className="fa-solid fa-circle-check"></i> Recebido</span>
                                                  )}
                                                  <button
                                                    className="btn btn-secondary btn-sm"
                                                    style={{ padding: '2px 6px', fontSize: '0.68rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                                                    title="Excluir Parcela Indevida"
                                                    onClick={() => handleDeleteSinglePayment(p._id)}
                                                  >
                                                    <i className="fa-solid fa-trash"></i>
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {getGroupedPayments().length === 0 && (
                        <tr>
                          <td colSpan={7}>
                            <div className="empty-state-card">
                              <i className="fa-solid fa-receipt empty-state-icon"></i>
                              <div className="empty-state-title">Nenhuma mensalidade encontrada</div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: CONTAS A PAGAR */}
          {finTab === 'contas_pagar' && (
            <>
              {/* Alerts for overdue/today */}
              {(() => {
                const today = new Date().toISOString().split('T')[0];
                const overdue = financials.filter(f => f.status !== 'Pago' && f.vencimento < today);
                const dueToday = financials.filter(f => f.status !== 'Pago' && f.vencimento === today);
                if (overdue.length === 0 && dueToday.length === 0) return null;
                return (
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    {overdue.length > 0 && (
                      <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '8px', padding: '10px 16px', flex: 1, minWidth: '220px' }}>
                        <strong style={{ color: '#ef4444' }}><i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>{overdue.length} conta(s) ATRASADA(s)</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>Total: R$ {overdue.reduce((s: number, f: any) => s + f.valor, 0).toFixed(2).replace('.', ',')}</div>
                      </div>
                    )}
                    {dueToday.length > 0 && (
                      <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: '8px', padding: '10px 16px', flex: 1, minWidth: '220px' }}>
                        <strong style={{ color: '#f59e0b' }}><i className="fa-solid fa-clock" style={{ marginRight: '6px' }}></i>{dueToday.length} conta(s) vencem HOJE</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>Total: R$ {dueToday.reduce((s: number, f: any) => s + f.valor, 0).toFixed(2).replace('.', ',')}</div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="month" className="form-control" style={{ maxWidth: '160px' }} value={finFilterMonth} onChange={e => setFinFilterMonth(e.target.value)} />
                <select className="select-custom" style={{ minWidth: '140px' }} value={finFilterStatus} onChange={e => setFinFilterStatus(e.target.value)}>
                  <option value="">Todos os Status</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Pago">Pago</option>
                  <option value="Atrasado">Atrasado</option>
                </select>
                <input type="text" className="form-control" style={{ maxWidth: '200px' }} placeholder="Filtrar categoria..." value={finFilterCat} onChange={e => setFinFilterCat(e.target.value)} />
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div className="page-size-selector"><span>Exibir:</span>
                    <select value={getPageSize('financeiro')} onChange={e => setPageSizeForKey('financeiro', Number(e.target.value))}>
                      <option value={5}>5</option><option value={8}>8</option><option value={15}>15</option>
                    </select>
                  </div>
                  <button className="btn btn-secondary" onClick={() => exportToCSV(financials, 'financeiro', [
                    { key: 'vencimento', label: 'Vencimento' },
                    { key: 'descricao', label: 'Descrição' },
                    { key: 'categoria', label: 'Categoria' },
                    { key: 'valor', label: 'Valor (R$)' },
                    { key: 'status', label: 'Status' },
                    { key: 'forma_pagamento', label: 'Forma Pagamento' }
                  ])}><i className="fa-solid fa-file-csv"></i> CSV</button>
                  <button className="btn btn-primary" onClick={() => handleOpenFinancialModal()}>
                    <i className="fa-solid fa-plus"></i> Novo Lançamento
                  </button>
                </div>
              </div>

              {/* Summary cards */}
              {(() => {
                const filtered = financials.filter(f =>
                  (finFilterStatus ? f.status === finFilterStatus : true) &&
                  (finFilterCat ? f.categoria?.toLowerCase().includes(finFilterCat.toLowerCase()) : true) &&
                  (finFilterMonth ? f.vencimento?.startsWith(finFilterMonth) : true)
                );
                const totalPago = filtered.filter(f => f.status === 'Pago').reduce((s: number, f: any) => s + f.valor, 0);
                const totalPendente = filtered.filter(f => f.status !== 'Pago').reduce((s: number, f: any) => s + f.valor, 0);
                return (
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ flex: 1, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '10px 14px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>TOTAL PAGO</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-success)' }}>R$ {totalPago.toFixed(2).replace('.', ',')}</div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', padding: '10px 14px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>TOTAL PENDENTE</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f59e0b' }}>R$ {totalPendente.toFixed(2).replace('.', ',')}</div>
                    </div>
                  </div>
                );
              })()}

              <div className="content-panel" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Descrição</th><th>Categoria</th><th className="text-right">Valor</th>
                        <th>Vencimento</th><th style={{ textAlign: 'center' }}>Status</th><th>Pagamento</th><th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const filtered = financials.filter(f =>
                          (finFilterStatus ? f.status === finFilterStatus : true) &&
                          (finFilterCat ? f.categoria?.toLowerCase().includes(finFilterCat.toLowerCase()) : true) &&
                          (finFilterMonth ? f.vencimento?.startsWith(finFilterMonth) : true)
                        );
                        const listKey = 'financeiro';
                        const activeP = getPage(listKey);
                        const size = getPageSize(listKey);
                        const totalPages = Math.ceil(filtered.length / size);
                        const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                        const paginated = filtered.slice((curP - 1) * size, curP * size);
                        return paginated.map(f => (
                          <tr key={f._id}>
                            <td><strong>{f.descricao}</strong></td>
                            <td><span className="badge badge-info">{f.categoria}</span></td>
                            <td className="text-right">R$ {f.valor.toFixed(2).replace('.', ',')}</td>
                            <td>{f.vencimento}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`badge ${f.status === 'Pago' ? 'badge-success' : f.status === 'Atrasado' ? 'badge-danger' : 'badge-warning'}`}>{f.status}</span>
                            </td>
                            <td>{f.forma_pagamento || '-'}</td>
                            <td>
                              <button className="btn btn-secondary btn-sm" style={{ marginRight: '6px' }} onClick={() => handleOpenFinancialModal(f)}><i className="fa-solid fa-pen"></i></button>
                              {f.status !== 'Pago' && (
                                <button className="btn btn-sm" style={{ marginRight: '6px', background: 'var(--color-success)', color: '#fff' }} title="Marcar como Pago" onClick={async () => {
                                  await fetch('/api/financial', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: f._id, status: 'Pago' }) });
                                  fetchData();
                                }}><i className="fa-solid fa-check"></i></button>
                              )}
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteFinancial(f._id)}><i className="fa-solid fa-trash"></i></button>
                            </td>
                          </tr>
                        ));
                      })()}
                      {financials.filter(f =>
                        (finFilterStatus ? f.status === finFilterStatus : true) &&
                        (finFilterCat ? f.categoria?.toLowerCase().includes(finFilterCat.toLowerCase()) : true) &&
                        (finFilterMonth ? f.vencimento?.startsWith(finFilterMonth) : true)
                      ).length === 0 && (
                        <tr><td colSpan={7}>
                          <div className="empty-state-card">
                            <i className="fa-solid fa-wallet empty-state-icon"></i>
                            <div className="empty-state-title">Nenhum lançamento encontrado</div>
                            <div className="empty-state-desc">Altere os filtros ou adicione um novo lançamento financeiro.</div>
                          </div>
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {financials.length > 0 && (
                  <Pagination currentPage={getPage('financeiro')} totalItems={financials.filter(f => (finFilterStatus ? f.status === finFilterStatus : true) && (finFilterCat ? f.categoria?.toLowerCase().includes(finFilterCat.toLowerCase()) : true) && (finFilterMonth ? f.vencimento?.startsWith(finFilterMonth) : true)).length} itemsPerPage={getPageSize('financeiro')} onPageChange={page => setPage('financeiro', page)} />
                )}
              </div>
            </>
          )}

          {/* TAB 3: SIMULADOR DE RECEBIMENTOS */}
          {finTab === 'recebimentos' && (
            <>
              <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '0.875rem' }}>
                <i className="fa-solid fa-circle-info" style={{ marginRight: '8px', color: 'var(--color-primary)' }}></i>
                Este simulador permite emitir cobranças PIX/Boleto e registrar pagamentos de mensalidades. As cobranças são <strong>simuladas</strong> (sandbox) e não geram cobranças reais.
              </div>
              <div className="content-panel">
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Aluno</th><th>Plano Atual</th><th>Status</th><th>Vencimento</th><th style={{ textAlign: 'center' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map(c => {
                        const status = c.dadosComerciais?.status || 'ativo';
                        const planName = c.dadosComerciais?.planoId?.nome || 'Personalizado';
                        const planPreco = c.dadosComerciais?.planoId?.preco || 0;
                        return (
                          <tr key={c._id}>
                            <td><strong>{c.dadosPessoais?.nome}</strong><br/><small style={{ color: 'var(--text-dim)' }}>{c.dadosPessoais?.email}</small></td>
                            <td>{planName}<br/><small style={{ color: 'var(--text-dim)' }}>R$ {planPreco.toFixed(2).replace('.', ',')}/mês</small></td>
                            <td><span className={`badge ${status === 'ativo' ? 'badge-success' : 'badge-danger'}`}>{status === 'ativo' ? 'Ativo' : 'Vencido'}</span></td>
                            <td>{c.dadosComerciais?.vencimento || '-'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button className="btn btn-primary btn-sm" onClick={() => { setSimClient(c); setSimForma('pix'); setShowSimuladorModal(true); }}>
                                  <i className="fa-solid fa-qrcode"></i> Emitir PIX
                                </button>
                                <button className="btn btn-secondary btn-sm" onClick={() => { setSimClient(c); setSimForma('boleto'); setShowSimuladorModal(true); }}>
                                  <i className="fa-solid fa-barcode"></i> Boleto
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {clients.length === 0 && (
                        <tr><td colSpan={5}><div className="empty-state-card"><i className="fa-solid fa-users empty-state-icon"></i><div className="empty-state-title">Nenhum aluno cadastrado</div></div></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* 10. View: Medicamentos */}
      {activeTab === 'medicamentos' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Farmácia Clínica</h1>
              <p>Controle de estoque, lotes e validade de medicamentos de uso clínico.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="page-size-selector">
                <span>Exibir:</span>
                <select value={getPageSize('medicamentos')} onChange={e => setPageSizeForKey('medicamentos', Number(e.target.value))}>
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={15}>15</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={() => handleOpenMedicationModal()}>
                <i className="fa-solid fa-plus"></i> Novo Medicamento
              </button>
            </div>
          </div>

          <div className="content-panel">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input type="text" className="form-control" placeholder="Buscar medicamento..." value={getSearchQuery('medicamentos')} onChange={e => setSearchQueryForKey('medicamentos', e.target.value)} style={{ maxWidth: '300px' }} />
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Medicamento</th>
                    <th>Categoria</th>
                    <th>Quantidade</th>
                    <th>Lote</th>
                    <th style={{ textAlign: 'center' }}>Validade</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'medicamentos';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const q = normalizeText(getSearchQuery(listKey));
                    const filtered = medications.filter(m => normalizeText(m.nome).includes(q) || normalizeText(m.categoria).includes(q));
                    const totalPages = Math.ceil(filtered.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = filtered.slice((curP - 1) * size, curP * size);

                    return paginated.map(m => {
                      const isExpired = new Date(m.validade) < new Date();
                      return (
                        <tr key={m._id}>
                          <td><strong>{m.nome}</strong></td>
                          <td>{m.categoria}</td>
                          <td>{m.quantidade} {m.unidade}</td>
                          <td><code>{m.lote}</code></td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${isExpired ? 'badge-danger' : 'badge-success'}`}>
                              {m.validade} {isExpired && '(VENCIDO)'}
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-secondary btn-sm" style={{ marginRight: '8px' }} onClick={() => handleOpenMedicationModal(m)}>
                              <i className="fa-solid fa-pen"></i>
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteMedication(m._id)}>
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                  {medications.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state-card">
                          <i className="fa-solid fa-prescription-bottle-medical empty-state-icon"></i>
                          <div className="empty-state-title">Nenhum medicamento registrado</div>
                          <div className="empty-state-desc">Não há registros de medicamentos no estoque clínico.</div>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => handleOpenMedicationModal()}>
                            <i className="fa-solid fa-plus"></i> Novo Medicamento
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {medications.length > 0 && (
              <Pagination
                currentPage={getPage('medicamentos')}
                totalItems={medications.length}
                itemsPerPage={getPageSize('medicamentos')}
                onPageChange={page => setPage('medicamentos', page)}
              />
            )}
          </div>
        </>
      )}

      {/* 11. View: Painel TV Clínica */}
      {activeTab === 'tv_panel' && (
        <div style={{ width: '100%', height: 'calc(100vh - 160px)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div className="view-title-group">
              <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>Painel de Recepção (TV Mode Premium)</h1>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Exibição otimizada para TVs com status do dia, pódio de presenças e feed ao vivo.</p>
            </div>
            <a 
              href="/tv" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-primary"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '10px 20px', 
                borderRadius: '8px', 
                fontWeight: 600,
                textDecoration: 'none',
                backgroundColor: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <i className="fa-solid fa-up-right-from-square"></i>
              Abrir em Tela Cheia (Nova Aba)
            </a>
          </div>

          <div style={{ flex: 1, minHeight: '450px', background: '#090d16', borderRadius: '16px', border: '1px solid #1a2438', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)' }}>
            <iframe 
              src="/tv" 
              style={{ 
                width: '100%', 
                height: '100%', 
                border: 'none',
                background: '#090d16'
              }}
              title="Painel TV Clínica"
            />
          </div>
        </div>
      )}

      {/* 12. View: Exercícios Solicitados */}
      {activeTab === 'solicitacoes_exercicios' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Exercícios Solicitados</h1>
              <p>Revise e modere os novos exercícios propostos pelos profissionais de treino.</p>
            </div>
          </div>

          <div className="content-panel">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Grupo Muscular</th>
                    <th>Equipamento</th>
                    <th>Instruções</th>
                    <th>Solicitado Por</th>
                    <th style={{ textAlign: 'center', width: '280px' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {exerciseRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                        Nenhuma solicitação de exercício pendente.
                      </td>
                    </tr>
                  ) : (
                    exerciseRequests.map((ex: any) => (
                      <tr key={ex._id}>
                        <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{ex.nome}</td>
                        <td>{ex.grupo}</td>
                        <td>{ex.equipamento}</td>
                        <td style={{ maxWidth: '250px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }} title={ex.instrucoes}>
                          {ex.instrucoes || '-'}
                        </td>
                        <td>{ex.solicitadoPorNome || 'Profissional'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-sm"
                            style={{ backgroundColor: 'var(--color-success)', color: '#fff', marginRight: '6px' }}
                            onClick={() => handleApproveExercise(ex)}
                            title="Aprovar Diretamente"
                          >
                            <i className="fa-solid fa-check"></i> Aprovar
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ backgroundColor: 'var(--color-info)', color: '#fff', marginRight: '6px' }}
                            onClick={() => handleOpenExerciseRequestModal(ex)}
                            title="Editar e Aprovar"
                          >
                            <i className="fa-solid fa-edit"></i> Editar
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ backgroundColor: 'var(--color-danger)', color: '#fff' }}
                            onClick={() => handleRejectExerciseRequest(ex._id)}
                            title="Rejeitar e Excluir"
                          >
                            <i className="fa-solid fa-trash"></i> Rejeitar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ======================== GESTÃO DE CONTRATOS TAB ======================== */}
      {activeTab === 'gestao_contratos' && (
        <GestaoContratosPanel clients={clients} plans={plans} userCargo="Administrador" fetchData={fetchData} />
      )}

      {/* ======================== ASAAS MANAGEMENT TAB ======================== */}
      {activeTab === 'asaas' && (
        <AsaasPanel />
      )}

      {/* ======================== AGENDA COMPLETA TAB ======================== */}
      {activeTab === 'agenda_completa' && (
        <AgendaCompletaPanel clients={clients} professionals={professionals} />
      )}

      {/* ======================== CONFIGURAÇÃO DA AGENDA TAB ======================== */}
      {activeTab === 'config_agenda' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Configuração da Agenda</h1>
              <p>Gerencie horários de funcionamento, capacidades e bloqueios permanentes ou para datas específicas.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {/* Formulário de Criação */}
            <div className="content-panel" style={{ flex: '1 1 400px', padding: '24px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-plus-circle" style={{ color: 'var(--color-primary)' }}></i>
                Nova Regra de Agenda
              </h2>
              
              <form onSubmit={handleCreateAgendaConfig} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>Escopo da Regra</label>
                  <select className="select-custom" value={acScope} onChange={e => {
                    const val = e.target.value as any;
                    setAcScope(val);
                    if (val === 'servico') {
                      if (acAction === 'adicionar') setAcAction('bloquear');
                    }
                  }}>
                    <option value="grade">Grade Completa (Academia)</option>
                    <option value="servico">Serviço Específico</option>
                  </select>
                </div>

                {acScope === 'servico' && (
                  <div className="form-group">
                    <label style={{ fontWeight: 600 }}>Serviço</label>
                    <select className="select-custom" value={acService} onChange={e => setAcService(e.target.value)}>
                      <option value="Treino Monitorado">Treino Monitorado</option>
                      <option value="Treino Livre">Treino Livre</option>
                      <option value="Avaliação Fisioterápica">Avaliação Fisioterápica</option>
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>Frequência</label>
                  <select className="select-custom" value={acFrequency} onChange={e => setAcFrequency(e.target.value as any)}>
                    <option value="permanente">Permanente (Repete todas as semanas)</option>
                    <option value="data">Data Específica (Regra pontual)</option>
                  </select>
                </div>

                {acFrequency === 'permanente' ? (
                  <div className="form-group">
                    <label style={{ fontWeight: 600 }}>Dias da Semana</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {[
                        { val: 1, label: 'Seg' },
                        { val: 2, label: 'Ter' },
                        { val: 3, label: 'Qua' },
                        { val: 4, label: 'Qui' },
                        { val: 5, label: 'Sex' },
                        { val: 6, label: 'Sáb' }
                      ].map(d => {
                        const checked = acSelectedDays.includes(d.val);
                        return (
                          <button
                            key={d.val}
                            type="button"
                            className={`btn ${checked ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '6px 12px', fontSize: '0.85rem', flex: '1 1 50px' }}
                            onClick={() => {
                              if (checked) {
                                setAcSelectedDays(acSelectedDays.filter(val => val !== d.val));
                              } else {
                                setAcSelectedDays([...acSelectedDays, d.val]);
                              }
                            }}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="form-group">
                    <label style={{ fontWeight: 600 }}>Data Específica</label>
                    <input type="date" className="form-control" value={acSpecificDate} onChange={e => setAcSpecificDate(e.target.value)} required />
                  </div>
                )}

                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>Ação</label>
                  <select className="select-custom" value={acAction} onChange={e => setAcAction(e.target.value as any)}>
                    <option value="bloquear">Bloquear / Fechar Horário</option>
                    <option value="alterar_capacidade">Definir Capacidade (Vagas)</option>
                    {acScope === 'grade' && <option value="adicionar">Adicionar Horário Extra</option>}
                  </select>
                </div>

                {acAction === 'alterar_capacidade' && (
                  <div className="form-group">
                    <label style={{ fontWeight: 600 }}>Quantidade de Vagas</label>
                    <input type="number" min={0} max={20} className="form-control" value={acCapacity} onChange={e => setAcCapacity(Number(e.target.value))} required />
                  </div>
                )}

                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>Horário</label>
                  {acAction === 'adicionar' ? (
                    <input type="time" className="form-control" value={acTime} onChange={e => setAcTime(e.target.value)} required />
                  ) : (
                    <select className="select-custom" value={acTime} onChange={e => setAcTime(e.target.value)}>
                      {acFrequency === 'permanente' && acSelectedDays.length === 1 && acSelectedDays[0] === 6 ? (
                        ['09:50', '10:40', '11:30', '12:25'].map(h => <option key={h} value={h}>{h}</option>)
                      ) : (
                        ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'].map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))
                      )}
                    </select>
                  )}
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '10px', width: '100%' }}>
                  Salvar Regra
                </button>
              </form>
            </div>

            {/* Listagem de Regras Cadastradas */}
            <div className="content-panel" style={{ flex: '2 1 600px', padding: '24px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-list" style={{ color: 'var(--color-primary)' }}></i>
                Regras Cadastradas
              </h2>
              
              {agendaConfigs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  Nenhuma regra de agenda cadastrada no momento.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table-custom">
                    <thead>
                      <tr>
                        <th>Frequência</th>
                        <th>Horário</th>
                        <th>Grade / Serviço</th>
                        <th>Ação</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agendaConfigs.map((cfg: any) => {
                        const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
                        const freqLabel = cfg.dataEspecifica 
                          ? `Pontual: ${cfg.dataEspecifica.split('-').reverse().join('/')}`
                          : `Semanal: ${dayNames[cfg.diaSemana] || 'Desconhecido'}`;
                          
                        const targetLabel = cfg.tipo === 'servico'
                          ? `Serviço: ${cfg.servico}`
                          : 'Grade Completa';
                          
                        let actionLabel = '';
                        if (cfg.acao === 'bloquear') {
                          actionLabel = 'Bloqueado';
                        } else if (cfg.acao === 'adicionar') {
                          actionLabel = 'Adicionado';
                        } else if (cfg.acao === 'alterar_capacidade') {
                          actionLabel = `${cfg.capacidadePersonalizada} vagas`;
                        }

                        return (
                          <tr key={cfg._id}>
                            <td style={{ fontWeight: 600 }}>{freqLabel}</td>
                            <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{cfg.horario}</td>
                            <td>{targetLabel}</td>
                            <td>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: cfg.acao === 'bloquear' ? 'rgba(239,68,68,0.1)' : cfg.acao === 'adicionar' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                                color: cfg.acao === 'bloquear' ? '#ef4444' : cfg.acao === 'adicionar' ? '#10b981' : '#3b82f6'
                              }}>
                                {actionLabel}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', padding: '4px 8px' }}
                                onClick={() => handleDeleteAgendaConfig(cfg._id)}
                              >
                                <i className="fa-solid fa-trash"></i>
                              </button>
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
        </>
      )}

      {/* ======================== TRANCAMENTOS ADMIN TAB ======================== */}
      {activeTab === 'trancamentos_admin' && (() => {
        // Build: map contractId -> list of trancamentos
        const trancByContract: Record<string, any[]> = {};
        trancamentosAdminList.forEach((t: any) => {
          const cid = t.contractId?._id || t.contractId;
          if (cid) {
            if (!trancByContract[cid]) trancByContract[cid] = [];
            trancByContract[cid].push(t);
          }
        });

        // Active contracts list
        const activeContracts = contractsAdminList.filter((c: any) => c.status === 'assinado');

        return (
          <>
            <div className="view-header">
              <div className="view-title-group">
                <h1>Acompanhar Trancamentos</h1>
                <p>Histórico de trancamentos solicitados e controle de saldo de semanas por aluno.</p>
              </div>
            </div>

            {/* ---- Histórico de Trancamentos ---- */}
            <div className="content-panel" style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--color-accent)' }}></i>
                Histórico de Trancamentos
              </h2>
              {trancamentosAdminList.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Nenhum trancamento registrado ainda.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                    <thead>
                      <tr>
                        <th>Aluno</th>
                        <th>Início do Trancamento</th>
                        <th>Semanas</th>
                        <th>Créditos Congelados</th>
                        <th>Redistribuição por Mês</th>
                        <th>Data Solicitação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trancamentosAdminList.map((t: any) => (
                        <tr key={t._id}>
                          <td style={{ fontWeight: 600 }}>
                            {t.clientId?.dadosPessoais?.nome || t.clientId?.nome || '—'}
                          </td>
                          <td>{t.dataInicio}</td>
                          <td>
                            <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--color-accent)', padding: '2px 8px', borderRadius: '4px' }}>
                              {t.semanas} {t.semanas === 1 ? 'semana' : 'semanas'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--color-warning)' }}>
                            {t.creditosTrancados} crédito{t.creditosTrancados !== 1 ? 's' : ''}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {(t.redistribuicao || []).map((r: any, idx: number) => (
                                <span key={idx} style={{ fontSize: '0.75rem', background: 'rgba(16,185,129,0.12)', color: 'var(--color-primary)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                  {r.mesAno}: +{r.creditos}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>
                            {t.createdAt ? new Date(t.createdAt).toLocaleDateString('pt-BR') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ---- Controle de Direito ao Congelamento ---- */}
            <div className="content-panel">
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-snowflake" style={{ color: 'var(--color-accent)' }}></i>
                Controle de Direito ao Congelamento
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '16px' }}>
                Alunos com contrato ativo. Limite: 4 semanas de trancamento por contrato.
              </p>
              {activeContracts.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Nenhum contrato ativo encontrado.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                    <thead>
                      <tr>
                        <th>Aluno</th>
                        <th>Vigência do Contrato</th>
                        <th>Semanas Usadas</th>
                        <th>Semanas Restantes</th>
                        <th>Créditos Congelados</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeContracts.map((contract: any) => {
                        const contratoTrancs = trancByContract[contract._id] || [];
                        const semanasUsadas = contratoTrancs.reduce((s: number, t: any) => s + t.semanas, 0);
                        const semanasRestantes = Math.max(0, 4 - semanasUsadas);
                        const creditosCongelados = contratoTrancs.reduce((s: number, t: any) => s + t.creditosTrancados, 0);
                        const clientName = contract.clientId?.dadosPessoais?.nome || contract.clientId?.nome || contract.nomeCliente || '—';
                        const alerta = semanasRestantes === 0;
                        return (
                          <tr key={contract._id}>
                            <td style={{ fontWeight: 600 }}>{clientName}</td>
                            <td style={{ color: 'var(--text-muted)' }}>
                              {contract.dataInicio || '—'} → {contract.dataFim || contract.dataTermino || '—'}
                            </td>
                            <td>
                              <span className="badge" style={{ background: semanasUsadas > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)', color: semanasUsadas > 0 ? 'var(--color-warning)' : 'var(--text-muted)', padding: '2px 8px', borderRadius: '4px' }}>
                                {semanasUsadas} / 4
                              </span>
                            </td>
                            <td>
                              <span className="badge" style={{ background: alerta ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: alerta ? 'var(--color-danger)' : 'var(--color-primary)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                                {semanasRestantes} semana{semanasRestantes !== 1 ? 's' : ''}
                              </span>
                            </td>
                            <td style={{ color: creditosCongelados > 0 ? 'var(--color-warning)' : 'var(--text-muted)' }}>
                              {creditosCongelados > 0 ? `${creditosCongelados} crédito${creditosCongelados !== 1 ? 's' : ''}` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        );
      })()}
      {(activeTab === 'treinos_prof' || activeTab === 'fichas_treino') && (
        <div style={{ padding: '10px 0' }}>
          {selectedClientForWorkout ? (
            <div>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedClientForWorkout(null)}
                >
                  <i className="fa-solid fa-arrow-left" style={{ marginRight: '6px' }}></i> Voltar para Lista de Alunos
                </button>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Aluno: <strong>{selectedClientForWorkout.dadosPessoais?.nome}</strong>
                </div>
              </div>
              <WorkoutBuilder
                onClose={() => setSelectedClientForWorkout(null)}
                clientId={selectedClientForWorkout._id}
                clientName={selectedClientForWorkout.dadosPessoais?.nome || 'Aluno'}
              />
            </div>
          ) : (
            <div>
              <div className="view-header" style={{ marginBottom: '20px' }}>
                <div className="view-title-group">
                  <h1><i className="fa-solid fa-dumbbell" style={{ marginRight: '8px', color: 'var(--color-primary)' }}></i>Fichas de Treino</h1>
                  <p>Selecione um aluno para montar, visualizar ou atualizar a ficha de treino.</p>
                </div>
              </div>

              <div className="content-panel" style={{ padding: '20px' }}>
                <div style={{ marginBottom: '16px', maxWidth: '400px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar aluno por nome ou CPF..."
                    value={workoutSearchAdmin}
                    onChange={e => setWorkoutSearchAdmin(e.target.value)}
                  />
                </div>

                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Aluno</th>
                        <th>CPF</th>
                        <th>Telefone</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'center' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients
                        .filter(c => {
                          const name = c.dadosPessoais?.nome || '';
                          const cpf = c.dadosPessoais?.cpf || '';
                          const q = (workoutSearchAdmin || '').toLowerCase();
                          return name.toLowerCase().includes(q) || cpf.includes(q);
                        })
                        .map(c => (
                          <tr key={c._id}>
                            <td style={{ fontWeight: 600 }}>{c.dadosPessoais?.nome || 'Sem Nome'}</td>
                            <td>{c.dadosPessoais?.cpf || '—'}</td>
                            <td>{c.dadosPessoais?.telefone || '—'}</td>
                            <td>
                              <span className={`badge badge-${c.dadosComerciais?.status === 'ativo' ? 'success' : 'secondary'}`}>
                                {c.dadosComerciais?.status?.toUpperCase() || 'INATIVO'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                                onClick={() => setSelectedClientForWorkout(c)}
                              >
                                <i className="fa-solid fa-dumbbell" style={{ marginRight: '6px' }}></i>
                                Abrir / Criar Ficha
                              </button>
                            </td>
                          </tr>
                        ))}
                      {clients.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                            Nenhum aluno cadastrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!['dashboard', 'profissionais', 'clientes', 'usuarios', 'controle_creditos', 'planos', 'agenda_completa', 'agenda_fixa', 'testes_forca', 'financeiro', 'medicamentos', 'tv_panel', 'solicitacoes_exercicios', 'configuracoes', 'gestao_contratos', 'asaas', 'trancamentos_admin', 'config_agenda', 'log_atividades', 'dados_clinicos', 'vincular_alunos', 'treinos_prof', 'fichas_treino'].includes(activeTab) && (
        <div className="content-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h2>Aba em Desenvolvimento</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            A visualização da aba <strong>{activeTab}</strong> está sendo migrada. Todos os endpoints já estão no MongoDB.
          </p>
        </div>
      )}

            {/* MANUAL CONFIRM RECEIPT MODAL */}
      {showManualPayModal && selectedPayment && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => { setShowManualPayModal(false); setSelectedPayment(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <div className="modal-header">
              <h3>Confirmar Recebimento Manual</h3>
              <button className="modal-close" onClick={() => { setShowManualPayModal(false); setSelectedPayment(null); }}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>Aluno</div>
                <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{selectedPayment.clientNome}</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Parcela</div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{selectedPayment.parcelaNumero}/{selectedPayment.parcelasTotal}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Valor da Parcela</div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)' }}>R$ {selectedPayment.valor.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="comercial-field-label">Método de Recebimento</label>
                <select className="select-custom" value={mpFormaPag} onChange={e => setMpFormaPag(e.target.value)}>
                  <option value="Pix Manual">Pix Manual (Não integrado)</option>
                  <option value="Dinheiro">Dinheiro Físico</option>
                  <option value="Cartão Manual">Cartão de Crédito/Débito (Máquina externa)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="comercial-field-label">Data de Recebimento</label>
                <input type="date" className="form-control" value={mpDataPag} onChange={e => setMpDataPag(e.target.value)} required />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="comercial-field-label">Observações / Notas</label>
                <textarea className="form-control" rows={2} value={mpObservacoes} onChange={e => setMpObservacoes(e.target.value)} placeholder="Comprovante id, quem recebeu, etc..." />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button className="btn btn-secondary" onClick={() => { setShowManualPayModal(false); setSelectedPayment(null); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleConfirmManualPayment} disabled={mpSaving}>
                {mpSaving ? 'Salvando...' : 'Confirmar Recebimento'}
              </button>
            </div>
          </div>
        </div>
      )}

{/* CRUD MODAL */}{/* CRUD MODAL */}
      {showModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h3>
                {modalType === 'client' && (editingItem ? 'Editar Aluno' : 'Cadastrar Aluno')}
                {modalType === 'professional' && (editingItem ? 'Editar Profissional' : 'Cadastrar Profissional')}
                {modalType === 'user' && (editingItem ? 'Editar Usuário' : 'Cadastrar Usuário')}
                {modalType === 'credit' && (creditOperation === 'add' ? `Adicionar Créditos para ${editingItem.dadosPessoais?.nome}` : `Subtrair Créditos de ${editingItem.dadosPessoais?.nome}`)}
                {modalType === 'exercise_request' && 'Revisar & Aprovar Exercício'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {modalType === 'client' && (
                  <>
                    <div className="form-group">
                      <label>Nome Completo</label>
                      <input type="text" className="form-control" value={nome} onChange={e => setNome(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label>E-mail de Acesso (Google)</label>
                      <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required disabled={!!editingItem} />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>CPF</label>
                        <input type="text" className="form-control" value={cpf} onChange={e => setCpf(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Telefone</label>
                        <input type="text" className="form-control" value={telefone} onChange={e => setTelefone(e.target.value)} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Plano</label>
                      <select className="select-custom" value={plano} onChange={e => setPlano(e.target.value)}>
                        {(plans.length > 0 ? plans : plansList).map((p: any) => (
                          <option key={p._id || p.id} value={p._id || p.id}>{p.nome} - R$ {p.preco}</option>
                        ))}
                      </select>
                    </div>

                    {editingItem && (() => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const clientFutureApts = appointments.filter((a: any) => {
                        const cId = a.clienteId?._id || a.clienteId;
                        return cId === editingItem._id && a.data >= todayStr && a.status !== 'cancelado';
                      });

                      return (
                        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}>
                            <i className="fa-solid fa-calendar-days"></i> Agendamentos Futuros do Aluno ({clientFutureApts.length})
                          </h4>
                          {clientFutureApts.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>Nenhum agendamento futuro ativo para este aluno.</p>
                          ) : (
                            <div className="table-responsive" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                              <table className="data-table" style={{ fontSize: '0.82rem' }}>
                                <thead>
                                  <tr>
                                    <th>Data / Hora</th>
                                    <th>Serviço</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'center' }}>Ações</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {clientFutureApts.map((apt: any) => (
                                    <tr key={apt._id}>
                                      <td>
                                        <strong>{formatDateBR(apt.data)}</strong> às <strong>{apt.horario}</strong>
                                      </td>
                                      <td>{apt.servico}</td>
                                      <td>
                                        <span className="badge badge-success">Confirmado</span>
                                      </td>
                                      <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                          <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => handleOpenEditAptModal(apt)}
                                            title="Editar / Reagendar"
                                          >
                                            <i className="fa-solid fa-pen-to-square"></i> Reagendar
                                          </button>
                                          <button
                                            type="button"
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleCancelApt(apt)}
                                            title="Cancelar agendamento e devolver crédito"
                                          >
                                            <i className="fa-solid fa-ban"></i> Cancelar
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}

                {modalType === 'professional' && (
                  <>
                    <div className="form-group">
                      <label>Nome Completo</label>
                      <input type="text" className="form-control" value={nome} onChange={e => setNome(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label>E-mail de Acesso (Google)</label>
                      <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required disabled={!!editingItem} />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Especialidade</label>
                        <input type="text" className="form-control" value={especialidade} onChange={e => setEspecialidade(e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label>Registro Profissional (Ex: CREFITO)</label>
                        <input type="text" className="form-control" value={registro} onChange={e => setRegistro(e.target.value)} required />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>PIN de Acesso Coletivo (Senha Curta de 4 Dígitos)</label>
                      <input type="text" className="form-control" value={pin} onChange={e => setPin(e.target.value)} maxLength={6} placeholder="Ex: 1234" required />
                    </div>
                  </>
                )}

                {modalType === 'credit' && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Operação</label>
                        <select className="select-custom" value={creditOperation} onChange={e => setCreditOperation(e.target.value as any)}>
                          <option value="add">Adicionar (+)</option>
                          <option value="sub">Subtrair (-)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Tipo de Crédito</label>
                        <select className="select-custom" value={creditType} onChange={e => setCreditType(e.target.value as any)}>
                          <option value="academia">Créditos de Academia</option>
                          <option value="massagem">Créditos de Massagem</option>
                          <option value="emergencia">Créditos de Emergência</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>{creditOperation === 'add' ? 'Quantidade a Adicionar' : 'Quantidade a Subtrair'}</label>
                      <input type="number" className="form-control" value={creditAmount} onChange={e => setCreditAmount(Number(e.target.value))} min={1} required />
                    </div>
                  </>
                )}

                {modalType === 'user' && (
                  <>
                    <div className="form-group">
                      <label>Nome Completo</label>
                      <input type="text" className="form-control" value={nome} onChange={e => setNome(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label>E-mail de Acesso (Google)</label>
                      <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required disabled={!!editingItem} />
                    </div>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '8px' }}>Papéis / Classes de Uso (Múltiplos Permitidos)</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--bg-darker)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        {[
                          { id: 'admin', label: 'Administrador Geral' },
                          { id: 'receptionist', label: 'Recepção' },
                          { id: 'professional', label: 'Profissional (Fisio/Treino)' },
                          { id: 'client', label: 'Aluno (Cliente)' }
                        ].map(roleItem => {
                          const isChecked = selectedRoles.includes(roleItem.id);
                          return (
                            <label key={roleItem.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)', margin: 0 }}>
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedRoles([...selectedRoles, roleItem.id]);
                                  } else {
                                    if (selectedRoles.length > 1) {
                                      setSelectedRoles(selectedRoles.filter(r => r !== roleItem.id));
                                    } else {
                                      alert('O usuário deve possuir pelo menos 1 papel ativo.');
                                    }
                                  }
                                }}
                              />
                              <span>{roleItem.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div className="form-group" style={{ marginTop: '16px' }}>
                      {!editingItem ? (
                        <div style={{ 
                          background: 'rgba(99, 102, 241, 0.05)', 
                          border: '1px solid rgba(99, 102, 241, 0.1)', 
                          padding: '10px 14px', 
                          borderRadius: '6px', 
                          fontSize: '0.78rem', 
                          color: 'var(--text-dim)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px' 
                        }}>
                          <i className="fa-solid fa-lock" style={{ color: 'var(--color-primary)' }}></i>
                          <span>Senha inicial padrão será <strong>123456</strong> (exigirá alteração no primeiro login).</span>
                        </div>
                      ) : (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          background: 'rgba(255,255,255,0.02)', 
                          padding: '10px 14px', 
                          borderRadius: '6px', 
                          border: '1px solid var(--border-color)' 
                        }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Segurança da Conta</span>
                          <button 
                            type="button" 
                            onClick={() => {
                              setResetPassword(true);
                              alert('A senha deste usuário será resetada para a padrão "123456" ao clicar em Salvar.');
                            }}
                            disabled={resetPassword}
                            className={`btn ${resetPassword ? 'btn-secondary' : 'btn-danger'} btn-sm`}
                            style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                          >
                            <i className="fa-solid fa-key" style={{ marginRight: '6px' }}></i>
                            {resetPassword ? 'Senha será Resetada' : 'Resetar Senha para 123456'}
                          </button>
                        </div>
                      )}
                    </div>
                    {selectedRoles.includes('professional') && (
                      <div className="form-row">
                        <div className="form-group">
                          <label>Especialidade</label>
                          <input type="text" className="form-control" value={especialidade} onChange={e => setEspecialidade(e.target.value)} required />
                        </div>
                        <div className="form-group">
                          <label>Registro Profissional (Ex: CREFITO)</label>
                          <input type="text" className="form-control" value={registro} onChange={e => setRegistro(e.target.value)} required />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {modalType === 'plan' && (
                  <div className="form-group">
                    <label>Nome do Plano</label>
                    <input type="text" className="form-control" placeholder="Ex: Crônico 1, Crônico 2, Agudo, Academia..." value={planName} onChange={e => setPlanName(e.target.value)} required />
                  </div>
                )}

                {modalType === 'financial' && (
                  <>
                    <div className="form-group">
                      <label>Descrição do Lançamento</label>
                      <input type="text" className="form-control" value={finDesc} onChange={e => setFinDesc(e.target.value)} required />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Categoria</label>
                        <input type="text" className="form-control" placeholder="Aluguel, Limpeza, etc." value={finCat} onChange={e => setFinCat(e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label>Valor (R$)</label>
                        <input type="number" className="form-control" value={finValor} onChange={e => setFinValor(Number(e.target.value))} required />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Vencimento</label>
                        <input type="date" className="form-control" value={finVenc} onChange={e => setFinVenc(e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label>Status</label>
                        <select className="select-custom" value={finStatus} onChange={e => setFinStatus(e.target.value as any)}>
                          <option value="Pendente">Pendente</option>
                          <option value="Pago">Pago</option>
                          <option value="Atrasado">Atrasado</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Forma de Pagamento</label>
                        <input type="text" className="form-control" placeholder="Pix, Boleto, etc." value={finForma} onChange={e => setFinForma(e.target.value)} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Observações</label>
                      <textarea className="form-control" value={finObs} onChange={e => setFinObs(e.target.value)} />
                    </div>
                    {finStatus === 'Pago' && (
                      <div className="form-group" style={{ background: 'rgba(16,185,129,0.05)', padding: '12px', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px' }}>
                        <label style={{ color: 'var(--color-success)' }}><i className="fa-solid fa-file-invoice-dollar" style={{ marginRight: '6px' }}></i>Comprovante de Pagamento (PDF/Imagem)</label>
                        <input type="file" className="form-control" accept="image/*,.pdf" onChange={handleComprovanteUpload} />
                        {finComprovante && (
                          <div style={{ marginTop: '8px' }}>
                            <span className="badge badge-success"><i className="fa-solid fa-check"></i> Anexado</span>
                            <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: '8px' }} onClick={() => viewBase64File(finComprovante)}>
                              <i className="fa-solid fa-eye"></i> Ver
                            </button>
                            <button type="button" className="btn btn-danger btn-sm" style={{ marginLeft: '4px' }} onClick={() => setFinComprovante('')}>
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {modalType === 'medication' && (
                  <>
                    <div className="form-group">
                      <label>Nome do Medicamento</label>
                      <input type="text" className="form-control" value={medNome} onChange={e => setMedNome(e.target.value)} required />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Categoria</label>
                        <input type="text" className="form-control" placeholder="Analgésico, Anti-inflamatório" value={medCat} onChange={e => setMedCat(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Quantidade</label>
                        <input type="number" className="form-control" value={medQuant} onChange={e => setMedQuant(Number(e.target.value))} required />
                      </div>
                      <div className="form-group">
                        <label>Unidade de Medida</label>
                        <input type="text" className="form-control" placeholder="Comprimidos, Frascos" value={medUnidade} onChange={e => setMedUnidade(e.target.value)} required />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Lote</label>
                        <input type="text" className="form-control" value={medLote} onChange={e => setMedLote(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Validade</label>
                        <input type="date" className="form-control" value={medValidade} onChange={e => setMedValidade(e.target.value)} required />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Observaes</label>
                      <textarea className="form-control" value={medObs} onChange={e => setMedObs(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ background: 'rgba(59,130,246,0.05)', padding: '12px', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px' }}>
                      <label style={{ color: 'var(--color-primary)' }}><i className="fa-solid fa-file-invoice" style={{ marginRight: '6px' }}></i>Nota Fiscal (PDF/Imagem)</label>
                      <input type="file" className="form-control" accept="image/*,.pdf" onChange={handleNFUpload} />
                      {medNF && (
                        <div style={{ marginTop: '8px' }}>
                          <span className="badge badge-info"><i className="fa-solid fa-check"></i> NF Anexada</span>
                          <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: '8px' }} onClick={() => viewBase64File(medNF)}>
                            <i className="fa-solid fa-eye"></i> Ver
                          </button>
                          <button type="button" className="btn btn-danger btn-sm" style={{ marginLeft: '4px' }} onClick={() => setMedNF('')}>
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {modalType === 'exercise_request' && (
                  <>
                    <div className="form-group">
                      <label>Nome do Exercício</label>
                      <input type="text" className="form-control" value={exNome} onChange={e => setExNome(e.target.value)} required />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Grupo Muscular</label>
                        <select className="select-custom" value={exGrupo} onChange={e => setExGrupo(e.target.value)} required>
                          <option value="PEITO">Peito</option>
                          <option value="COSTAS">Costas</option>
                          <option value="PERNAS">Pernas</option>
                          <option value="OMBROS">Ombros</option>
                          <option value="BÍCEPS">Bíceps</option>
                          <option value="TRÍCEPS">Tríceps</option>
                          <option value="CORE">Core</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Equipamento</label>
                        <input type="text" className="form-control" value={exEquip} onChange={e => setExEquip(e.target.value)} placeholder="Ex: Halteres, Barra, Máquina..." required />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Instruções de Execução</label>
                      <textarea className="form-control" style={{ minHeight: '100px' }} value={exInst} onChange={e => setExInst(e.target.value)} placeholder="Instruções para o aluno realizar o movimento corretamente..." />
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {showRulesModal && rulesClient && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowRulesModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <div className="modal-header">
              <h3 style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-scale-balanced"></i> Regras de Crédito – {rulesClient.dadosPessoais?.nome}
              </h3>
              <button className="modal-close" onClick={() => setShowRulesModal(false)}>&times;</button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="comercial-field-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={rulesData.permiteRolagem}
                    onChange={e => setRulesData({ ...rulesData, permiteRolagem: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  Permitir Rolagem de Créditos para o mês seguinte
                </label>
                <small style={{ color: 'var(--text-muted)', display: 'block', marginLeft: '24px', fontSize: '0.78rem' }}>
                  Se ativado, os créditos não utilizados expiram apenas no final do contrato, em vez de expirar mensalmente.
                </small>
              </div>

              <div className="form-group">
                <label className="comercial-field-label">Janela Limite para Reagendamento Pós-Falta (dias)</label>
                <input
                  type="number"
                  className="form-control"
                  value={rulesData.diasRetencaoFalta}
                  onChange={e => setRulesData({ ...rulesData, diasRetencaoFalta: Number(e.target.value) })}
                  min={0}
                  placeholder="0 para sem limite"
                />
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px', fontSize: '0.78rem' }}>
                  Número de dias que o aluno tem para realizar a reposição da aula após faltar (0 = sem limite).
                </small>
              </div>

              <div className="form-group">
                <label className="comercial-field-label">Dedução de Créditos por Falta/Atraso</label>
                <input
                  type="number"
                  className="form-control"
                  value={rulesData.deducaoFaltaAtraso}
                  onChange={e => setRulesData({ ...rulesData, deducaoFaltaAtraso: Number(e.target.value) })}
                  min={0}
                />
                <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px', fontSize: '0.78rem' }}>
                  Quantos créditos são consumidos/penalizados quando o aluno falta sem aviso prévio.
                </small>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setShowRulesModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveRules}>Salvar Regras</button>
            </div>
          </div>
        </div>
      )}

       {/* F2   Ficha de Dados Pessoais do Aluno */}
       {showClientDetailModal && detailClient && (
         <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowClientDetailModal(false)}>
           <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px', width: '95%' }}>
             <div className="modal-header">
               <h3><i className="fa-solid fa-id-card" style={{ marginRight: '8px' }}></i>Ficha de Dados Pessoais - {detailClient.dadosPessoais?.nome}</h3>
               <button className="modal-close" onClick={() => setShowClientDetailModal(false)}>&times;</button>
             </div>
             <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '550px', overflowY: 'auto' }}>
               <div className="form-row">
                 <div className="form-group">
                   <label>Nome Completo</label>
                   <input className="form-control" value={dcNome} onChange={e => setDcNome(e.target.value)} />
                 </div>
                 <div className="form-group">
                   <label>E-mail</label>
                   <input className="form-control" value={dcEmail} onChange={e => setDcEmail(e.target.value)} />
                 </div>
               </div>
               <div className="form-row">
                 <div className="form-group">
                   <label>CPF</label>
                   <input className="form-control" value={dcCpf} onChange={e => setDcCpf(e.target.value)} />
                 </div>
                 <div className="form-group">
                   <label>Telefone Principal</label>
                   <input className="form-control" value={dcTelefone} onChange={e => setDcTelefone(e.target.value)} />
                 </div>
                 <div className="form-group">
                   <label>Telefone Secundário</label>
                   <input className="form-control" value={dcTelefoneSecundario} onChange={e => setDcTelefoneSecundario(e.target.value)} />
                 </div>
               </div>
               <div className="form-row">
                 <div className="form-group">
                   <label>Sexo</label>
                   <select className="select-custom" value={dcSexo} onChange={e => setDcSexo(e.target.value)}>
                     <option value="M">Masculino</option>
                     <option value="F">Feminino</option>
                     <option value="O">Outro</option>
                   </select>
                 </div>
                 <div className="form-group">
                   <label>Data de Nascimento</label>
                   <input type="date" className="form-control" value={dcNascimento} onChange={e => setDcNascimento(e.target.value)} />
                 </div>
               </div>
               <div className="form-row">
                 <div className="form-group">
                   <label>Estado Civil</label>
                   <select className="select-custom" value={dcEstadoCivil} onChange={e => setDcEstadoCivil(e.target.value)}>
                     <option value="solteiro(a)">Solteiro(a)</option>
                     <option value="casado(a)">Casado(a)</option>
                     <option value="divorciado(a)">Divorciado(a)</option>
                     <option value="viúvo(a)">Viúvo(a)</option>
                     <option value="união estável">União Estável</option>
                   </select>
                 </div>
                 <div className="form-group">
                   <label>Nacionalidade</label>
                   <input className="form-control" value={dcNacionalidade} onChange={e => setDcNacionalidade(e.target.value)} />
                 </div>
                 <div className="form-group">
                   <label>Profissão</label>
                   <input className="form-control" value={dcProfissao} onChange={e => setDcProfissao(e.target.value)} />
                 </div>
               </div>
               <div className="form-row">
                 <div className="form-group" style={{ flex: 3 }}>
                   <label>Logradouro (Endereço)</label>
                   <input className="form-control" value={dcEndereco} onChange={e => setDcEndereco(e.target.value)} placeholder="Rua, Avenida, etc." />
                 </div>
                 <div className="form-group" style={{ flex: 1 }}>
                   <label>Número</label>
                   <input className="form-control" value={dcNumero} onChange={e => setDcNumero(e.target.value)} placeholder="Nº" />
                 </div>
               </div>
               <div className="form-row">
                 <div className="form-group">
                   <label>Complemento</label>
                   <input className="form-control" value={dcComplemento} onChange={e => setDcComplemento(e.target.value)} placeholder="Apto, Sala, etc." />
                 </div>
                 <div className="form-group">
                   <label>Bairro</label>
                   <input className="form-control" value={dcBairro} onChange={e => setDcBairro(e.target.value)} placeholder="Bairro" />
                 </div>
               </div>
               <div className="form-row">
                 <div className="form-group" style={{ flex: 2 }}>
                   <label>Cidade</label>
                   <input className="form-control" value={dcCidade} onChange={e => setDcCidade(e.target.value)} placeholder="Cidade" />
                 </div>
                 <div className="form-group" style={{ flex: 1 }}>
                   <label>Estado (UF)</label>
                   <input className="form-control" value={dcEstado} onChange={e => setDcEstado(e.target.value)} maxLength={2} placeholder="UF" />
                 </div>
                 <div className="form-group" style={{ flex: 2 }}>
                   <label>CEP</label>
                   <input className="form-control" value={dcCep} onChange={e => setDcCep(e.target.value)} placeholder="00000-000" />
                 </div>
               </div>

               <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                 <button className="btn btn-secondary" onClick={() => setShowClientDetailModal(false)}>Cancelar</button>
                 <button className="btn btn-primary" onClick={async () => {
                   try {
                     const payload = {
                       id: detailClient._id,
                       dadosPessoais: {
                         nome: dcNome,
                         email: dcEmail,
                         cpf: dcCpf,
                         telefone: dcTelefone,
                         sexo: dcSexo,
                         dataNascimento: dcNascimento,
                         endereco: dcEndereco,
                         telefoneSecundario: dcTelefoneSecundario,
                         estadoCivil: dcEstadoCivil,
                         nacionalidade: dcNacionalidade,
                         profissao: dcProfissao,
                         numero: dcNumero,
                         complemento: dcComplemento,
                         bairro: dcBairro,
                         cidade: dcCidade,
                         estado: dcEstado,
                         cep: dcCep
                       }
                     };
                     const res = await fetch('/api/clients', {
                       method: 'PUT',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify(payload)
                     });
                     const data = await res.json();
                     if (data.success) {
                       fetchData();
                       alert('Dados pessoais atualizados com sucesso!');
                       setShowClientDetailModal(false);
                     } else {
                       alert('Erro ao salvar dados pessoais: ' + data.error);
                     }
                   } catch (err: any) {
                     alert('Erro ao salvar dados pessoais: ' + err.message);
                   }
                 }}><i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i> Salvar Dados Pessoais</button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* F7  Simulador de Cobrana */}
       {showSimuladorModal && simClient && (
         <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowSimuladorModal(false)}>
           <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', width: '95%' }}>
             <div className="modal-header" style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff' }}>
               <h3><i className={`fa-solid fa-${simForma === 'pix' ? 'qrcode' : 'barcode'}`} style={{ marginRight: '8px' }}></i>Simulador  {simForma === 'pix' ? 'PIX' : 'Boleto'}</h3>
               <button className="modal-close" style={{ color: '#fff' }} onClick={() => setShowSimuladorModal(false)}>&times;</button>
             </div>
             <div className="modal-body" style={{ textAlign: 'center' }}>
               <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', marginBottom: '14px', textAlign: 'left', fontSize: '0.875rem' }}>
                 <p style={{ margin: '0 0 4px 0' }}><strong>Aluno:</strong> {simClient.dadosPessoais?.nome}</p>
                 <p style={{ margin: '0 0 4px 0' }}><strong>Valor:</strong> R$ {(simClient.dadosComerciais?.planoId?.preco || 0).toFixed(2).replace('.', ',')}</p>
                 <p style={{ margin: 0 }}><strong>Forma:</strong> {simForma === 'pix' ? 'Pix' : 'Boleto Bancrio'}</p>
               </div>
               {simForma === 'pix' ? (
                 <div style={{ margin: '0 auto 14px', width: '150px', height: '150px', background: '#fff', border: '2px solid #e5e7eb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                   <i className="fa-solid fa-qrcode" style={{ fontSize: '80px', color: '#111' }}></i>
                   <small style={{ color: '#888', fontSize: '0.65rem', marginTop: '4px' }}>QR Code Simulado</small>
                 </div>
               ) : (
                 <div style={{ background: '#fff', border: '2px dashed #ccc', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                   <i className="fa-solid fa-barcode" style={{ fontSize: '55px', color: '#333' }}></i>
                   <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#555', marginTop: '4px', letterSpacing: '2px' }}>0001 9371 9999 0001 9371 9999</div>
                   <small style={{ color: '#888', fontSize: '0.65rem' }}>Cdigo simulado</small>
                 </div>
               )}
               <div style={{ display: 'flex', gap: '8px' }}>
                 <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSimForma(simForma === 'pix' ? 'boleto' : 'pix')}>
                   Mudar para {simForma === 'pix' ? 'Boleto' : 'PIX'}
                 </button>
                 <button className="btn btn-primary" style={{ flex: 1 }} onClick={async () => {
                   const valor = simClient.dadosComerciais?.planoId?.preco || 0;
                   await fetch('/api/financial', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ descricao: `Mensalidade  ${simClient.dadosPessoais?.nome}`, categoria: 'Mensalidade', valor, vencimento: new Date().toISOString().split('T')[0], status: 'Pago', forma_pagamento: simForma === 'pix' ? 'Pix' : 'Boleto Bancrio' }) });
                   setShowSimuladorModal(false); fetchData(); alert('Pagamento registrado!');
                 }}>
                   <i className="fa-solid fa-check"></i> Confirmar
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
               {/* Modal de Novo Horário Fixo */}
        {showFixedSchedModal && (
          <div className="modal-overlay" style={{ display: 'flex', zIndex: 100000 }} onClick={() => setShowFixedSchedModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '95%' }}>
              <div className="modal-header" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', color: '#fff' }}>
                <h3><i className="fa-solid fa-thumbtack" style={{ marginRight: '8px' }}></i>Novo Horário Fixo</h3>
                <button className="modal-close" style={{ color: '#fff' }} onClick={() => setShowFixedSchedModal(false)}>&times;</button>
              </div>
              <form onSubmit={handleCreateFixedSchedule}>
                <div className="modal-body" style={{ padding: '20px' }}>
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label>Aluno / Cliente</label>
                    <SearchableSelect
                      options={clients.map(c => ({
                        value: c._id,
                        label: `${c.dadosPessoais?.nome || 'Sem Nome'} (${c.dadosPessoais?.cpf || 'Sem CPF'})`
                      }))}
                      value={fsClient}
                      onChange={setFsClient}
                      placeholder="Selecione o aluno..."
                      required
                    />
                  </div>

                  <div className="form-row" style={{ display: 'flex', gap: '12px', marginBottom: '15px' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Dia da Semana</label>
                      <select className="select-custom" value={fsDay} onChange={e => setFsDay(Number(e.target.value))} required>
                        <option value={1}>Segunda-feira</option>
                        <option value={2}>Terça-feira</option>
                        <option value={3}>Quarta-feira</option>
                        <option value={4}>Quinta-feira</option>
                        <option value={5}>Sexta-feira</option>
                        <option value={6}>Sábado</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Horário</label>
                      <select className="select-custom" value={fsTime} onChange={e => setFsTime(e.target.value)} required>
                        <option value="">Selecione...</option>
                        {getAvailableHours(fsDay, fsService).map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      {getAvailableHours(fsDay, fsService).length === 0 && (
                        <small style={{ color: '#ef4444', display: 'block', marginTop: '4px' }}>
                          Nenhum horário com vagas disponíveis neste dia/serviço.
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="form-row" style={{ display: 'flex', gap: '12px', marginBottom: '15px' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Serviço</label>
                      <select className="select-custom" value={fsService} onChange={e => setFsService(e.target.value)} required>
                        <option value="Treino Monitorado">Treino Monitorado</option>
                        <option value="Treino Livre">Treino Livre</option>
                        <option value="Avaliação Fisioterápica">Avaliação Fisioterápica</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Data de Início</label>
                      <input type="date" className="form-control" value={fsDate} onChange={e => setFsDate(e.target.value)} required />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label>Tipo de Duração</label>
                    <select className="select-custom" value={fsDurationType} onChange={e => setFsDurationType(e.target.value as any)} required>
                      <option value="contrato">Até o fim da vigência do contrato do aluno</option>
                      <option value="manual">Definir data final manualmente</option>
                      <option value="indeterminado">Sem data final (Indeterminado)</option>
                    </select>
                  </div>

                  {fsDurationType === 'manual' && (
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                      <label>Data de Término Recorrente</label>
                      <input type="date" className="form-control" value={fsManualEndDate} onChange={e => setFsManualEndDate(e.target.value)} required />
                    </div>
                  )}
                </div>
                <div className="modal-footer" style={{ padding: '15px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowFixedSchedModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'var(--color-primary)' }}>Criar Regra</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Congelamento */}
       {showFreezeModal && (
         <div className="modal-overlay" style={{ display: 'flex', zIndex: 100000 }} onClick={() => setShowFreezeModal(false)}>
           <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '95%' }}>
             <div className="modal-header" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff' }}>
               <h3><i className="fa-solid fa-snowflake" style={{ marginRight: '8px' }}></i>Congelar Contrato</h3>
               <button className="modal-close" style={{ color: '#fff' }} onClick={() => setShowFreezeModal(false)}>&times;</button>
             </div>
             <div className="modal-body" style={{ padding: '20px' }}>
               <div className="form-group" style={{ marginBottom: '15px' }}>
                 <label>Data de Início do Congelamento</label>
                 <input type="date" className="form-control" value={freezeStartDate} onChange={e => setFreezeStartDate(e.target.value)} required />
               </div>
               <div className="form-group" style={{ marginBottom: '15px' }}>
                 <label>Duração em Dias (Máximo 30)</label>
                 <input type="number" className="form-control" value={freezeDuration} onChange={e => setFreezeDuration(Math.min(30, Math.max(1, Number(e.target.value))))} min={1} max={30} required />
               </div>
               <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                 <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowFreezeModal(false)}>Voltar</button>
                 <button type="button" className="btn btn-primary" style={{ flex: 1, background: '#3b82f6' }} onClick={handleFreezeContract}>Confirmar</button>
               </div>
             </div>
           </div>
          </div>
        )}
       {/* Reagendar Modal */}
       {showEditAptModal && editAptItem && (
         <div className="modal-overlay" style={{ display: 'flex', zIndex: 99999 }} onClick={() => setShowEditAptModal(false)}>
           <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
             <div className="modal-header">
               <h3>Reagendar Atendimento</h3>
               <button className="modal-close" onClick={() => setShowEditAptModal(false)}>&times;</button>
             </div>
             <form onSubmit={handleSaveEditApt}>
               <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 <div className="form-group">
                   <label>Serviço</label>
                   <select className="select-custom" value={editAptService} onChange={e => setEditAptService(e.target.value)}>
                     <option value="Treino Monitorado">Treino Monitorado</option>
                     <option value="Treino Livre">Treino Livre</option>
                     <option value="Avaliação Fisioterápica">Avaliação Fisioterápica</option>
                     <option value="Massagem">Massagem</option>
                   </select>
                 </div>
                 <div className="form-group">
                   <label>Nova Data</label>
                   <input type="date" className="form-control" value={editAptDate} onChange={e => setEditAptDate(e.target.value)} required />
                 </div>
                 <div className="form-group">
                   <label>Novo Horário</label>
                   {loadingEditAptSlots ? (
                     <div style={{ padding: '10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                       <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Carregando horários disponíveis...
                     </div>
                   ) : editAptAvailableSlots.length === 0 ? (
                     <div style={{ padding: '10px', fontSize: '0.85rem', color: 'var(--color-danger)' }}>
                       Nenhum horário disponível para esta data/serviço.
                     </div>
                   ) : (
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', gap: '8px', maxHeight: '160px', overflowY: 'auto', padding: '6px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                       {editAptAvailableSlots.map(h => (
                         <button
                           type="button"
                           key={h}
                           onClick={() => setEditAptTime(h)}
                           style={{
                             padding: '8px 4px',
                             fontSize: '0.8rem',
                             fontWeight: 700,
                             borderRadius: '6px',
                             border: editAptTime === h ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)',
                             background: editAptTime === h ? 'var(--color-primary-glow)' : 'transparent',
                             color: editAptTime === h ? 'var(--color-primary)' : 'var(--text-main)',
                             cursor: 'pointer'
                           }}
                         >
                           {h}
                         </button>
                       ))}
                     </div>
                   )}
                 </div>
               </div>
               <div className="modal-footer" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                 <button type="button" className="btn btn-secondary" onClick={() => setShowEditAptModal(false)}>Cancelar</button>
                 <button type="submit" className="btn btn-primary" disabled={savingEditApt || !editAptTime}>
                   {savingEditApt ? 'Salvando...' : 'Confirmar Reagendamento'}
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}
    </div>
  );
}

// Helper functions for Churn / Evasão monitoring (Segunda a Sexta)
function dateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekDates(baseDate: Date): Date[] {
  const d = new Date(baseDate);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=Dom
  // Primeira da semana = segunda (1), se dom retrocede 6
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMon);
  const dates: Date[] = [];
  for (let i = 0; i < 5; i++) { // Segunda a Sexta
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    dates.push(day);
  }
  return dates;
}

function parseFrequenciaSemanal(freqStr: any): number {
  if (freqStr === undefined || freqStr === null) return 0;
  if (typeof freqStr === 'number') return freqStr;
  const str = String(freqStr);
  const match = str.match(/(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }
  const lower = str.toLowerCase();
  if (lower.includes('diár') || lower.includes('diar')) {
    return 5;
  }
  return 0;
}

function getWeeklyFrequencyMetrics(client: any, appointments: any[], simulatedDateStr: string) {
  const freqStr = client.dadosComerciais?.frequencia;
  const freqSemanal = typeof freqStr === 'number' ? freqStr : parseFrequenciaSemanal(freqStr);
  if (freqSemanal === 0) return null;

  const baseDate = new Date(simulatedDateStr + 'T00:00:00');
  const dayOfWeek = baseDate.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb

  // dias_restantes_semana (Segunda a Sexta = 1 a 5)
  let diasRestantes = 0;
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    diasRestantes = 5 - dayOfWeek;
  } else if (dayOfWeek === 0 || dayOfWeek === 6) {
    diasRestantes = 0;
  }

  // Obter datas da semana atual baseada na data base
  const weekDates = getWeekDates(baseDate);
  
  // Encontrar a data correspondente ao dia simulado/atual da semana
  let simulatedTodayISO = dateToISO(baseDate);

  // Filtrar agendamentos da semana atual (segunda a sexta)
  const mondayISO = dateToISO(weekDates[0]);
  const fridayISO = dateToISO(weekDates[weekDates.length - 1]);

  const weekApts = appointments.filter(a => {
    const cid = a.clienteId && typeof a.clienteId === 'object' ? a.clienteId._id?.toString() : a.clienteId?.toString();
    return (
      cid === client._id?.toString() &&
      a.data >= mondayISO &&
      a.data <= fridayISO &&
      a.status !== 'cancelado'
    );
  });

  let realizados = 0;
  let agendados = 0;

  weekApts.forEach(apt => {
    if (apt.data < simulatedTodayISO) {
      if (apt.status === 'presenca') {
        realizados++;
      }
    } else if (apt.data > simulatedTodayISO) {
      if (apt.status === 'agendado') {
        agendados++;
      }
    } else { // apt.data === simulatedTodayISO
      if (apt.status === 'presenca') {
        realizados++;
      } else if (apt.status === 'agendado') {
        agendados++;
      }
    }
  });

  const pendentes = Math.max(0, freqSemanal - realizados - agendados);
  const alerta = diasRestantes <= pendentes && pendentes > 0;

  return {
    frequenciaSemanal: freqSemanal,
    realizados,
    agendados,
    pendentes,
    diasRestantes,
    alerta,
    simulatedTodayISO,
    dayOfWeek
  };
}












