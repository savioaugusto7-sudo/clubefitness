'use client';

import React, { useEffect, useState } from 'react';
import Pagination from './Pagination';
import { downloadContractPDF, downloadStrengthTestPDF, getContractPDFBase64 } from '@/utils/pdfGenerator';
import { generateContractTemplate as getUnifiedTemplate } from '@/utils/contractTemplate';
import { validateContractClientData } from '@/utils/contractValidator';
import { formatCurrencyBRL, selectOnFocus } from '@/utils/currencyMask';
import { smartSearchMatch } from '@/utils/smartSearch';
import SmartSearchInput from './SmartSearchInput';
import GestaoContratosPanel from './GestaoContratosPanel';
import AsaasPanel from './AsaasPanel';
import AgendaCompletaPanel from './AgendaCompletaPanel';
import SearchableSelect from './SearchableSelect';
import DadosClinicosPanel from './DadosClinicosPanel';
import WorkoutBuilder from './WorkoutBuilder';
import DynamusPanel from './DynamusPanel';
import HorariosFixosPanel from './HorariosFixosPanel';
import FinanceiroBalancoPanel from './FinanceiroBalancoPanel';
import ContasPagarPanel from './ContasPagarPanel';
import { getContractValidityInfo } from '@/utils/contractValidity';
import MoneyInput from './MoneyInput';


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

  const getPageSize = (key: string) => pageSize[key] || 30;
  const setPageSizeForKey = (key: string, size: number) => {
    setPageSize(prev => ({ ...prev, [key]: size }));
    setPage(key, 1);
  };

  // Search states
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [linkMovements, setLinkMovements] = useState<any[]>([]);
  const [loadingLinkMovements, setLoadingLinkMovements] = useState<boolean>(false);
  const [linkMovementTypeFilter, setLinkMovementTypeFilter] = useState<string>('todos');
  const [linkMovementViewFilter, setLinkMovementViewFilter] = useState<string>('todos');
  const [linkMovementStatusFilter, setLinkMovementStatusFilter] = useState<string>('todos');
  const [linkMovementPeriodFilter, setLinkMovementPeriodFilter] = useState<string>('todos');
  const [linkMovementPlanFilter, setLinkMovementPlanFilter] = useState<string>('todos');
  const [linkMovementSort, setLinkMovementSort] = useState<string>('data_desc');
  const [selectedLinkMovementDetails, setSelectedLinkMovementDetails] = useState<any>(null);

  const fetchLinkMovements = async (silent = false) => {
    if (!silent && linkMovements.length === 0) {
      setLoadingLinkMovements(true);
    }
    try {
      const res = await fetch('/api/admin/link-movements');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLinkMovements(json.data);
      }
    } catch (e) {
      console.error('Error fetching link movements:', e);
    } finally {
      setLoadingLinkMovements(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'movimentos_links') {
      fetchLinkMovements(linkMovements.length > 0);
    }
  }, [activeTab]);
  const getSearchQuery = (key: string) => searchQueries[key] || '';
  const setSearchQueryForKey = (key: string, query: string) => {
    setSearchQueries(prev => ({ ...prev, [key]: query }));
    setPage(key, 1);
  };

  // Smart filters states for Clientes
  const [clientsFilterStatus, setClientsFilterStatus] = useState<string>('todos');
  const [clientsFilterPlan, setClientsFilterPlan] = useState<string>('todos');
  const [clientsFilterCredits, setClientsFilterCredits] = useState<string>('todos');
  const [clientsFilterRecurrence, setClientsFilterRecurrence] = useState<string>('todos');
  const [clientsSortOrder, setClientsSortOrder] = useState<string>('nome_asc');

  // Smart filters states for Financeiro (Mensalidades)
  const [paymentsPlanFilter, setPaymentsPlanFilter] = useState<string>('');
  const [paymentsMonthFilter, setPaymentsMonthFilter] = useState<string>('');
  const [paymentsMethodFilter, setPaymentsMethodFilter] = useState<string>('');
  const [paymentsTypeFilter, setPaymentsTypeFilter] = useState<string>('');
  const [paymentsSortOption, setPaymentsSortOption] = useState<string>('vencimento_asc');

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
  const [isEstagiario, setIsEstagiario] = useState(false);
  const [userRole, setUserRole] = useState<string>('aluno');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['client']);
  const [creditAmount, setCreditAmount] = useState(1);
  const [resetPassword, setResetPassword] = useState(false);
  const [creditType, setCreditType] = useState<'academia' | 'massagem' | 'emergencia'>('academia');
  const [creditOperation, setCreditOperation] = useState<'add' | 'sub'>('add');

  // States for Data Shielding & Unlock Audit
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockJustificativa, setUnlockJustificativa] = useState('');
  const [unlockingClient, setUnlockingClient] = useState(false);

  const handleUnlockClientData = async () => {
    if (!editingItem) return;
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
          id: editingItem._id,
          action: 'unlock_dados',
          justificativa: unlockJustificativa
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Dados cadastrais desbloqueados com sucesso para edição!');
        setEditingItem(data.data);
        setShowUnlockModal(false);
        setUnlockJustificativa('');
        fetchData();
      } else {
        alert('Erro ao desbloquear: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro de conexão: ' + err.message);
    } finally {
      setUnlockingClient(false);
    }
  };

  // New states for the missing features
  const [plans, setPlans] = useState<any[]>([]);
  const [planName, setPlanName] = useState('');
  const [planValidade, setPlanValidade] = useState(30);
  const [planAcademia, setPlanAcademia] = useState(0);
  const [planConsultorio, setPlanConsultorio] = useState(0);

  // ==========================================
  // ESTADOS: DASHBOARD 2.0 & FILA DE TRATATIVAS
  // ==========================================
  const getWeekKey = (d: Date = new Date()) => {
    const startOfWeek = new Date(d);
    const day = startOfWeek.getDay() || 7;
    if (day !== 1) startOfWeek.setHours(-24 * (day - 1));
    return startOfWeek.toISOString().split('T')[0];
  };

  const currentWeekKey = getWeekKey();
  const [tratativas, setTratativas] = useState<Record<string, { data: string; motivo: string; responsavel: string; tipo: 'whatsapp' | 'manual'; obs?: string }>>({});
  const [activeRetentionTab, setActiveRetentionTab] = useState<'pendentes' | 'tratados' | 'todos'>('pendentes');
  const [tratativaModalClient, setTratativaModalClient] = useState<any>(null);
  const [tratativaMotivo, setTratativaMotivo] = useState<string>('agendou');
  const [tratativaObs, setTratativaObs] = useState<string>('');
  const [contractTratativas, setContractTratativas] = useState<Record<string, { data: string; motivo: string; responsavel: string }>>({});
  const [activeContractAlertTab, setActiveContractAlertTab] = useState<'vencidos' | 'vencendo' | 'tratados'>('vencidos');

  // Carregar tratativas salvas no localStorage
  useEffect(() => {
    try {
      const savedRetention = localStorage.getItem(`cf_tratativas_retencao_${currentWeekKey}`);
      if (savedRetention) setTratativas(JSON.parse(savedRetention));
      const savedContracts = localStorage.getItem(`cf_tratativas_contratos`);
      if (savedContracts) setContractTratativas(JSON.parse(savedContracts));
    } catch (e) {
      console.error('Erro ao carregar tratativas do localStorage:', e);
    }
  }, [currentWeekKey]);

  const saveRetentionTratativa = (clientId: string, data: { motivo: string; tipo: 'whatsapp' | 'manual'; obs?: string }) => {
    const nowStr = new Date().toLocaleString('pt-BR');
    const updated = {
      ...tratativas,
      [clientId]: {
        data: nowStr,
        motivo: data.motivo,
        tipo: data.tipo,
        obs: data.obs || '',
        responsavel: 'Recepção / Admin'
      }
    };
    setTratativas(updated);
    try {
      localStorage.setItem(`cf_tratativas_retencao_${currentWeekKey}`, JSON.stringify(updated));
    } catch (e) {}
  };

  const removeRetentionTratativa = (clientId: string) => {
    const updated = { ...tratativas };
    delete updated[clientId];
    setTratativas(updated);
    try {
      localStorage.setItem(`cf_tratativas_retencao_${currentWeekKey}`, JSON.stringify(updated));
    } catch (e) {}
  };

  const saveContractTratativa = (clientId: string, motivo: string) => {
    const nowStr = new Date().toLocaleString('pt-BR');
    const updated = {
      ...contractTratativas,
      [clientId]: {
        data: nowStr,
        motivo,
        responsavel: 'Recepção / Admin'
      }
    };
    setContractTratativas(updated);
    try {
      localStorage.setItem(`cf_tratativas_contratos`, JSON.stringify(updated));
    } catch (e) {}
  };

  const removeContractTratativa = (clientId: string) => {
    const updated = { ...contractTratativas };
    delete updated[clientId];
    setContractTratativas(updated);
    try {
      localStorage.setItem(`cf_tratativas_contratos`, JSON.stringify(updated));
    } catch (e) {}
  };
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

  // User Management filter & sorting states
  const [userRoleFilter, setUserRoleFilter] = useState('todos');
  const [userPlanFilter, setUserPlanFilter] = useState('todos');
  const [userSortOption, setUserSortOption] = useState('alfabetico_asc');

  // Fixed Schedule form states
  const [showFixedSchedModal, setShowFixedSchedModal] = useState(false);
  const [fsClient, setFsClient] = useState('');
  const [fsDay, setFsDay] = useState(1); // 1 = Monday
  const [fsSelectedDays, setFsSelectedDays] = useState<number[]>([1, 3, 5]); // default: Seg, Qua, Sex
  const [fsTime, setFsTime] = useState('08:00');
  const [fsService, setFsService] = useState('Treino Monitorado');
  const [fsProfessional, setFsProfessional] = useState('');
  const [fsAgendaFilter, setFsAgendaFilter] = useState('todas');
  const [fsDate, setFsDate] = useState(new Date().toISOString().split('T')[0]);
  const [fsDurationType, setFsDurationType] = useState<'contrato' | 'manual' | 'indeterminado'>('contrato');
  const [fsManualEndDate, setFsManualEndDate] = useState('');
  const [isSavingFixedSched, setIsSavingFixedSched] = useState(false);
  const [fsAvailableSlots, setFsAvailableSlots] = useState<string[]>([]);
  const [fsSlotsData, setFsSlotsData] = useState<any[]>([]);
  const [loadingFsSlots, setLoadingFsSlots] = useState(false);
  const [strengthTests, setStrengthTests] = useState<any[]>([]);
  const [exerciseRequests, setExerciseRequests] = useState<any[]>([]);
  const [trancamentosAdminList, setTrancamentosAdminList] = useState<any[]>([]);
  const [contractsAdminList, setContractsAdminList] = useState<any[]>([]);
  const [exNome, setExNome] = useState('');
  const [exGrupo, setExGrupo] = useState('PEITO');
  const [exEquip, setExEquip] = useState('');
  const [exInst, setExInst] = useState('');
  const [exGifUrl, setExGifUrl] = useState('');
  const [selectedExerciseRequests, setSelectedExerciseRequests] = useState<string[]>([]);
  const [isProcessingBulkEx, setIsProcessingBulkEx] = useState(false);

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

  // Dynamic available slots for Fixed Schedule Modal (Multi-dias consolidado)
  useEffect(() => {
    if (!showFixedSchedModal) return;
    setLoadingFsSlots(true);

    let agendaTipo = 'academia';
    if (fsProfessional) {
      const pObj = professionals.find(p => p._id === fsProfessional);
      const pName = (pObj?.nome || '').toLowerCase();
      if (pName.includes('guilherme')) agendaTipo = 'dr_guilherme';
      else if (pName.includes('albert')) agendaTipo = 'dr_albert';
      else agendaTipo = 'consultorio';
    }

    const dateToQuery = fsDate || new Date().toISOString().split('T')[0];
    const daysStr = (fsSelectedDays || []).join(',');
    let url = `/api/appointments/slots?date=${encodeURIComponent(dateToQuery)}&tipo=${encodeURIComponent(agendaTipo)}`;
    if (daysStr) {
      url += `&diasSemana=${encodeURIComponent(daysStr)}`;
    }

    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.data)) {
          setFsSlotsData(d.data);
          const availableHours = d.data
            .filter((s: any) => (s.minVagasLivres ?? (s.capacidade - s.vagasOcupadas)) > 0 && (!s.conflitos || s.conflitos.length === 0))
            .map((s: any) => s.horario);
          setFsAvailableSlots(availableHours);
          if (availableHours.length > 0) {
            setFsTime((prev: string) => (availableHours.includes(prev) ? prev : availableHours[0]));
          } else {
            setFsTime('');
          }
        } else {
          setFsSlotsData([]);
          setFsAvailableSlots([]);
          setFsTime('');
        }
      })
      .catch(() => {
        setFsSlotsData([]);
        setFsAvailableSlots([]);
        setFsTime('');
      })
      .finally(() => setLoadingFsSlots(false));
  }, [showFixedSchedModal, fsProfessional, fsService, fsDate, fsSelectedDays, professionals]);

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
    const hasActiveSignedContract = clientContracts.some(c => c.status === 'assinado' || c.status === 'congelado');

  const generateContractTemplate = () => {
    const plan = plans.find((p: any) => p._id === dcPlano);
    if (!plan) return 'Nenhum plano selecionado.';

    return getUnifiedTemplate({
      clientNome: dcNome,
      clientCpf: dcCpf,
      clientEmail: detailClient?.dadosPessoais?.email,
      clientTelefone: detailClient?.dadosPessoais?.telefone,
      clientEndereco: dcEndereco,
      clientNumero: dcNumero,
      clientComplemento: dcComplemento,
      clientBairro: dcBairro,
      clientCidade: dcCidade,
      clientEstado: dcEstado,
      clientCep: dcCep,
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
      creditosMensais: dcFrequencia * 4 + 1,
      duracao: dcDuracao,
      vigenciaQtd: dcVigenciaQtd,
      criarRecorrenciaMensal: false,
      recorrenciaMeses: 12
    });
  };


  const handleCreateContract = async (status: 'pendente' | 'assinado' | 'clicksign') => {
    const validation = validateContractClientData(detailClient);
    if (!validation.isValid) {
      alert(`Não é possível emitir o contrato. Os seguintes dados obrigatórios do aluno estão ausentes:\n\n• ${validation.missingFields.join('\n• ')}\n\nPor favor, complete o cadastro na aba "Dados Pessoais" primeiro.`);
      return;
    }

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
    if (isSavingFixedSched) return;

    if (!fsClient) {
      alert('Selecione um aluno.');
      return;
    }

    if (!fsSelectedDays || fsSelectedDays.length === 0) {
      alert('Selecione pelo menos um dia da semana.');
      return;
    }

    if (!fsTime) {
      alert('Selecione o horário desejado.');
      return;
    }

    setIsSavingFixedSched(true);

    try {
      let finalEndDate: string | null = '';
      if (fsDurationType === 'contrato') {
        const selectedClientObj = clients.find(c => c._id === fsClient);
        if (selectedClientObj) {
          const valInfo = getContractValidityInfo(selectedClientObj, undefined, contractsAdminList);
          if (valInfo && valInfo.dataFim && !valInfo.isExpired) {
            finalEndDate = valInfo.dataFim;
          } else {
            const com = selectedClientObj.dadosComerciais || {};
            if (com.dataFim && com.dataFim >= fsDate) {
              finalEndDate = com.dataFim;
            } else if (com.vencimento && com.vencimento >= fsDate) {
              finalEndDate = com.vencimento;
            }
          }
        }

        if (!finalEndDate) {
          alert('Não foi encontrada nenhuma data de vigência ativa para este aluno. Por favor, renove a vigência na Gestão de Contratos, ative a recorrência ou selecione "Definir data final manualmente".');
          return;
        }
      } else if (fsDurationType === 'manual') {
        if (!fsManualEndDate) {
          alert('Por favor, informe a data final manualmente.');
          return;
        }
        finalEndDate = fsManualEndDate;
      }

      const slots = fsSelectedDays.map(day => ({
        diaSemana: Number(day),
        horario: fsTime
      }));

      const payload = {
        clienteId: fsClient,
        profissionalId: fsProfessional || null,
        slots,
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
        setFsProfessional('');
        setFsSelectedDays([1, 3, 5]);
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
    } finally {
      setIsSavingFixedSched(false);
    }
  };

  const handleDeleteFixedSchedule = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este horário fixo e os agendamentos futuros gerados?')) {
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

  const handleDeleteAllClientFixedSchedules = async (clientId: string) => {
    if (confirm('Tem certeza que deseja remover TODOS os horários fixos e agendamentos futuros deste aluno?')) {
      try {
        const res = await fetch(`/api/fixed-schedules?clientId=${clientId}`, { method: 'DELETE' });
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

  // F7   Controle Financeiro Tabs
  const [finTab, setFinTab] = useState<'balanco' | 'mensalidades' | 'contas_pagar'>('balanco');
  const [finSelectedMonth, setFinSelectedMonth] = useState<string>(() => new Date().toISOString().split('T')[0].substring(0, 7));

  // F15/F16   Financial filters
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

  const fetchData = async (silent = false) => {
    try {
      if (!silent && clients.length === 0) setLoading(true);

      const endpoints = [
        fetch('/api/clients').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/professionals').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/appointments').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/users').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/plans').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/financial').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/medications').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/fixed-schedules').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/strength-tests').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/exercises?status=pending').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/trancamentos').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/contracts').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/admin/agenda-config').then(r => r.json()).catch(() => ({ success: false })),
        fetch('/api/admin/activity-logs').then(r => r.json()).catch(() => ({ success: false }))
      ];

      const [
        jsonClients, jsonProfs, jsonApts, jsonUsers, jsonPlans,
        jsonFin, jsonMed, jsonFs, jsonSt, jsonExs,
        jsonTranc, jsonContracts, jsonAc, jsonLogs
      ] = await Promise.all(endpoints);

      if (jsonClients?.success) setClients(jsonClients.data);
      if (jsonProfs?.success) setProfessionals(jsonProfs.data);
      if (jsonApts?.success) setAppointments(jsonApts.data);
      if (jsonUsers?.success) setUsers(jsonUsers.data);
      if (jsonPlans?.success) setPlans(jsonPlans.data);
      if (jsonFin?.success) setFinancials(jsonFin.data);
      if (jsonMed?.success) setMedications(jsonMed.data);
      if (jsonFs?.success) setFixedSchedules(jsonFs.data);
      if (jsonSt?.success) setStrengthTests(jsonSt.data);
      if (jsonExs?.success) setExerciseRequests(jsonExs.data);
      if (jsonTranc?.success) setTrancamentosAdminList(jsonTranc.data);
      if (jsonContracts?.success) setContractsAdminList(jsonContracts.data);
      if (jsonAc?.success) setAgendaConfigs(jsonAc.data);
      if (jsonLogs?.success) setActivityLogs(jsonLogs.data);
      fetchLinkMovements();
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
      status: 'Pago' | 'Em Dia' | 'Atrasado';
      proximoVencimento: string;
    }> = {};

    payments.forEach(p => {
      if (!grouped[p.clientId]) {
        // Find client plan in the system (from clients array)
        const client = clients.find(c => c._id === p.clientId);
        const planName = client?.dadosComerciais?.planoId?.nome || 'Personalizado';

        grouped[p.clientId] = {
          clientId: p.clientId,
          clientNome: p.clientNome,
          planoNome: planName,
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

    const filtered = groupedList.filter((group: any) => {
      const client = clients.find(c => c._id === group.clientId);
      const isDynamus = Boolean(
        group.planoNome?.toLowerCase().includes('dynamus') ||
        client?.dadosPessoais?.email?.toLowerCase().includes('dynamus') ||
        client?.codigo?.toUpperCase().includes('DYN') ||
        client?.dadosClinicos?.observacoes?.toLowerCase().includes('dynamus')
      );
      const isRecorrente = Boolean(client?.dadosComerciais?.criarRecorrenciaMensal);

      // Smart Multi-Terms Search
      const searchTerms = [
        group.clientNome,
        group.planoNome,
        client?.dadosPessoais?.cpf,
        client?.dadosPessoais?.telefone,
        client?.dadosPessoais?.email,
        group.status,
        ...group.payments.map((p: any) => `${p.formaPagamento || ''} ${p.valor || ''} R$ ${p.valor || ''}`)
      ];
      const matchesSearch = smartSearchMatch(paymentsSearch, searchTerms);
      if (!matchesSearch) return false;

      // Status Filter
      if (paymentsStatusFilter) {
        if (paymentsStatusFilter === 'Pago' && group.status !== 'Pago') return false;
        if (paymentsStatusFilter === 'Pendente' && group.status !== 'Em Dia') return false;
        if (paymentsStatusFilter === 'Atrasado' && group.status !== 'Atrasado') return false;
      }

      // Plan Filter
      if (paymentsPlanFilter) {
        if (paymentsPlanFilter === 'Personalizado') {
          if (group.planoNome !== 'Personalizado') return false;
        } else if (!normalizeText(group.planoNome).includes(normalizeText(paymentsPlanFilter))) {
          return false;
        }
      }

      // Payment Method Filter
      if (paymentsMethodFilter) {
        const hasMethod = group.payments.some((p: any) => {
          const fm = (p.formaPagamento || client?.dadosComerciais?.formaPagamento || '').toLowerCase();
          if (paymentsMethodFilter === 'pix') return fm.includes('pix');
          if (paymentsMethodFilter === 'boleto') return fm.includes('boleto');
          if (paymentsMethodFilter === 'cartao') return fm.includes('cartao') || fm.includes('cartão') || fm.includes('asaas');
          if (paymentsMethodFilter === 'dinheiro') return fm.includes('dinheiro');
          return true;
        });
        if (!hasMethod) return false;
      }

      // Month / Period Filter
      if (paymentsMonthFilter) {
        const curY = parseInt(todayStr.substring(0, 4));
        const curM = parseInt(todayStr.substring(5, 7));
        
        const hasInPeriod = group.payments.some((p: any) => {
          if (!p.vencimento) return false;
          if (paymentsMonthFilter === 'mes_atual') {
            return p.vencimento.startsWith(todayStr.substring(0, 7));
          }
          if (paymentsMonthFilter === 'proximo_mes') {
            const nextM = curM === 12 ? 1 : curM + 1;
            const nextY = curM === 12 ? curY + 1 : curY;
            const nextStr = `${nextY}-${String(nextM).padStart(2, '0')}`;
            return p.vencimento.startsWith(nextStr);
          }
          if (paymentsMonthFilter === 'mes_anterior') {
            const prevM = curM === 1 ? 12 : curM - 1;
            const prevY = curM === 1 ? curY - 1 : curY;
            const prevStr = `${prevY}-${String(prevM).padStart(2, '0')}`;
            return p.vencimento.startsWith(prevStr);
          }
          if (paymentsMonthFilter === 'ano_atual') {
            return p.vencimento.startsWith(String(curY));
          }
          return true;
        });
        if (!hasInPeriod) return false;
      }

      // Type / Convênio Filter
      if (paymentsTypeFilter) {
        if (paymentsTypeFilter === 'dynamus' && !isDynamus) return false;
        if (paymentsTypeFilter === 'recorrente' && !isRecorrente) return false;
        if (paymentsTypeFilter === 'padrao' && (isDynamus || isRecorrente)) return false;
      }

      return true;
    });

    // Sorting
    filtered.sort((a: any, b: any) => {
      if (paymentsSortOption === 'vencimento_asc') {
        const vA = a.proximoVencimento || '9999-12-31';
        const vB = b.proximoVencimento || '9999-12-31';
        return vA.localeCompare(vB);
      }
      if (paymentsSortOption === 'vencimento_desc') {
        const vA = a.proximoVencimento || '0000-00-00';
        const vB = b.proximoVencimento || '0000-00-00';
        return vB.localeCompare(vA);
      }
      if (paymentsSortOption === 'valor_desc') {
        return b.totalValue - a.totalValue;
      }
      if (paymentsSortOption === 'valor_asc') {
        return a.totalValue - b.totalValue;
      }
      if (paymentsSortOption === 'nome_asc') {
        return (a.clientNome || '').localeCompare(b.clientNome || '');
      }
      if (paymentsSortOption === 'nome_desc') {
        return (b.clientNome || '').localeCompare(a.clientNome || '');
      }
      return 0;
    });

    return filtered;
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

  const handleConfirmAllCardPayments = async (clientId: string, clientNome: string, count: number) => {
    if (!confirm(`Deseja dar baixa em todas as ${count} parcelas de Cartão do aluno(a) ${clientNome}?\n\nCada parcela será registrada como PAGA com sua data de pagamento correspondente à respectiva data de vencimento.`)) return;
    try {
      setLoadingPayments(true);
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_all_card',
          clientId,
          formaPagamento: 'Cartão Manual'
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`SUCESSO: ${data.count || count} parcela(s) de cartão foram quitadas com suas respectivas datas de vencimento!`);
        await fetchPayments();
        fetchData();
      } else {
        alert('Erro ao dar baixa nas parcelas: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
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
      setIsEstagiario(item.isEstagiario || false);
      setPin(item.pin || '1234');
    } else {
      setEmail('');
      setNome('');
      setEspecialidade('');
      setRegistro('');
      setIsEstagiario(false);
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

  const handleEngageWhatsAppWithTratativa = (client: any, metrics: any) => {
    if (!metrics) return;
    const diasRestantesNomes: Record<number, string> = {
      4: '(terça a sexta)',
      3: '(quarta a sexta)',
      2: '(quinta e sexta)',
      1: '(sexta-feira)'
    };
    const diasRestantesTexto = diasRestantesNomes[metrics.diasRestantes] || '';
    const msg = `Olá, ${client.dadosPessoais?.nome}! Tudo bem? 💪\nPassando para acompanhar sua rotina no Clube Fitness: você realizou ${metrics.realizados} de seus ${metrics.frequenciaSemanal} treinos contratados esta semana. Ainda restam ${metrics.diasRestantes} dia(s) útil(eis) ${diasRestantesTexto} e você tem ${metrics.pendentes} treino(s) disponível(is). Que tal garantirmos seu horário? Vamos agendar?`;

    const cleanPhone = client.dadosPessoais?.telefone?.replace(/\D/g, '');
    if (cleanPhone) {
      const formattedPhone = cleanPhone.length <= 11 ? '55' + cleanPhone : cleanPhone;
      const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
    }
    saveRetentionTratativa(client._id, {
      motivo: 'Mensagem de WhatsApp enviada para engajamento e agendamento',
      tipo: 'whatsapp'
    });
  };

  const handleEngageAllPending = (pendingList: any[]) => {
    if (pendingList.length === 0) return;
    if (!confirm(`Deseja engajar ${pendingList.length} aluno(s) pendente(s) e registrar a tratativa da semana para todos?`)) return;

    pendingList.forEach(item => {
      saveRetentionTratativa(item.client._id, {
        motivo: 'Engajamento em lote disparado pela recepção',
        tipo: 'whatsapp'
      });
    });
    alert(`✅ Sucesso!\n\nForam registradas as tratativas de engajamento para os ${pendingList.length} alunos!`);
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
    setExGifUrl(item.gifUrl || '');
    setShowModal(true);
  };

  const toggleSelectAllExerciseRequests = () => {
    if (selectedExerciseRequests.length === exerciseRequests.length) {
      setSelectedExerciseRequests([]);
    } else {
      setSelectedExerciseRequests(exerciseRequests.map((ex: any) => ex._id));
    }
  };

  const toggleSelectExerciseRequest = (id: string) => {
    setSelectedExerciseRequests(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkApproveExercises = async () => {
    if (selectedExerciseRequests.length === 0) return;
    if (!confirm(`Aprovar todos os ${selectedExerciseRequests.length} exercícios selecionados?`)) return;
    try {
      setIsProcessingBulkEx(true);
      const res = await fetch('/api/exercises', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedExerciseRequests,
          action: 'approved'
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`${selectedExerciseRequests.length} exercício(s) aprovado(s) com sucesso!`);
        setSelectedExerciseRequests([]);
        fetchData();
      } else {
        alert('Erro ao aprovar exercícios: ' + data.error);
      }
    } catch (e) {
      alert('Erro ao processar aprovação em lote.');
    } finally {
      setIsProcessingBulkEx(false);
    }
  };

  const handleBulkRejectExercises = async () => {
    if (selectedExerciseRequests.length === 0) return;
    if (!confirm(`Rejeitar e excluir os ${selectedExerciseRequests.length} exercícios selecionados?`)) return;
    try {
      setIsProcessingBulkEx(true);
      const res = await fetch('/api/exercises', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedExerciseRequests,
          action: 'rejected'
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`${selectedExerciseRequests.length} solicitação(ões) rejeitada(s) e excluída(s)!`);
        setSelectedExerciseRequests([]);
        fetchData();
      } else {
        alert('Erro ao rejeitar solicitações: ' + data.error);
      }
    } catch (e) {
      alert('Erro ao processar rejeição em lote.');
    } finally {
      setIsProcessingBulkEx(false);
    }
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
          gifUrl: ex.gifUrl || '',
          status: 'approved'
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Exercício aprovado com sucesso!');
        setSelectedExerciseRequests(prev => prev.filter(i => i !== ex._id));
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
        setSelectedExerciseRequests(prev => prev.filter(i => i !== id));
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
          isEstagiario,
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
          gifUrl: exGifUrl.trim(),
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
          setSelectedExerciseRequests(prev => prev.filter(i => i !== editingItem?._id));
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
  // ==========================================
  // CÁLCULOS E INTELIGÊNCIA OPERACIONAL 2.0
  // ==========================================
  // Alunos Clube Fitness (ignora convênio Dynamus puro que não possui plano contratado conosco)
  const cfClients = clients.filter(c => !c.dadosComerciais?.convenioDynamus || (c.dadosComerciais?.planoId && c.dadosComerciais?.status === 'ativo'));
  const totalClients = cfClients.length;
  const activeClients = cfClients.filter(c => c.dadosComerciais?.status === 'ativo' || c.dadosComerciais?.status === 'assinado').length;
  
  // Receita Est. Mensal
  const currentMonthStr = getYearMonth(new Date());
  const currentMonthPayments = payments.filter(p => p.vencimento && getYearMonth(p.vencimento) === currentMonthStr && p.status !== 'Cancelado' && p.valor <= 2000);
  const activeClientsList = cfClients.filter(c => c.dadosComerciais?.status === 'ativo' || c.dadosComerciais?.status === 'assinado');
  
  const revenueEst = currentMonthPayments.length > 0
    ? currentMonthPayments.reduce((sum, p) => sum + p.valor, 0)
    : activeClientsList.reduce((acc, c) => acc + (Number(c.dadosComerciais?.valorUnitario) || 310), 0);

  // Atendimentos de Hoje por Turno
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(a => a.data === todayStr && a.status !== 'cancelado');
  const todayApts = todayAppointments.length;
  const presencasHoje = todayAppointments.filter(a => a.status === 'presenca').length;
  const agendadosHoje = todayAppointments.filter(a => a.status === 'agendado').length;
  const faltasHoje = todayAppointments.filter(a => a.status === 'falta').length;

  const sortAptsByTime = (list: any[]) => [...list].sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));

  const manhaApts = sortAptsByTime(todayAppointments.filter(a => { const h = parseInt(a.horario?.split(':')[0] || '0', 10); return h < 12; }));
  const tardeApts = sortAptsByTime(todayAppointments.filter(a => { const h = parseInt(a.horario?.split(':')[0] || '0', 10); return h >= 12 && h < 18; }));
  const noiteApts = sortAptsByTime(todayAppointments.filter(a => { const h = parseInt(a.horario?.split(':')[0] || '0', 10); return h >= 18; }));

  // Métricas de Retenção e Frequência Semanal
  const retentionList = cfClients
    .map(c => ({ client: c, metrics: getWeeklyFrequencyMetrics(c, appointments, simulatedDate) }))
    .filter((x): x is { client: any; metrics: NonNullable<ReturnType<typeof getWeeklyFrequencyMetrics>> } => Boolean(x.metrics && x.metrics.frequenciaSemanal > 0));

  const totalComMeta = retentionList.length;
  const emRiscoList = retentionList.filter(x => x.metrics.alerta && x.client.dadosComerciais?.status === 'ativo');
  const emConformidadeList = retentionList.filter(x => !x.metrics.alerta && x.client.dadosComerciais?.status === 'ativo');
  const taxaRetencao = totalComMeta > 0 ? Math.round((emConformidadeList.length / totalComMeta) * 100) : 100;

  const pendentesRetencao = emRiscoList.filter(x => !tratativas[x.client._id]);
  const tratadosRetencao = emRiscoList.filter(x => !!tratativas[x.client._id]);

  // Alertas de Contratos
  const expiredContracts = cfClients.filter(c => {
    if (c.dadosComerciais?.status === 'congelado' || c.dadosComerciais?.status === 'inativo') return false;
    const info = getContractValidityInfo(c);
    return info.isExpired;
  });

  const expiringContracts = cfClients.filter(c => {
    if (c.dadosComerciais?.status !== 'ativo') return false;
    const info = getContractValidityInfo(c);
    return !info.isExpired && info.daysLeft <= 15 && info.daysLeft >= 0;
  });

  const pendingExpiredContracts = expiredContracts.filter(c => !contractTratativas[c._id]);
  const pendingExpiringContracts = expiringContracts.filter(c => !contractTratativas[c._id]);

  return (
    <div>
      {/* 1. View: Dashboard Principal 2.0 */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* Cabeçalho Executivo */}
          <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', margin: 0 }}>
            <div className="view-title-group">
              <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-gauge-high" style={{ color: '#10b981' }}></i> Dashboard Administrativo & Cockpit Operacional
              </h1>
              <p>Monitoramento em tempo real de ocupação, retenção de treinos e saúde da clínica.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '6px 14px', borderRadius: '10px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-regular fa-calendar" style={{ color: '#38bdf8' }}></i>
                <span>Hoje: <strong style={{ color: '#fff' }}>{formatDateBR(todayStr)}</strong></span>
              </div>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '6px 14px', borderRadius: '10px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399' }}>
                <i className="fa-solid fa-bullseye"></i>
                <span>Meta Retenção: <strong>&gt; 80%</strong></span>
              </div>
            </div>
          </div>

          {/* Grid de 4 KPIs Operacionais Vivos */}
          <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            
            {/* Card 1: Taxa de Retenção Semanal */}
            <div className="metric-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 78, 59, 0.15) 100%)', border: `1px solid ${taxaRetencao >= 80 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}` }}>
              <div className="metric-info" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <h3 style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>Taxa de Retenção Semanal</h3>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: taxaRetencao >= 80 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: taxaRetencao >= 80 ? '#34d399' : '#fbbf24' }}>
                    {taxaRetencao >= 80 ? 'META ATINGIDA' : 'ATENÇÃO'}
                  </span>
                </div>
                <div className="value" style={{ color: taxaRetencao >= 80 ? '#34d399' : '#fbbf24', fontSize: '1.8rem', fontWeight: 900 }}>
                  {taxaRetencao}%
                </div>
                {/* Progress bar */}
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', margin: '8px 0 6px 0', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ width: `${Math.min(100, taxaRetencao)}%`, height: '100%', background: taxaRetencao >= 80 ? '#10b981' : '#f59e0b', borderRadius: '4px', transition: 'width 0.4s ease' }}></div>
                </div>
                <small style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                  {emConformidadeList.length} de {totalComMeta} alunos em dia na semana
                </small>
              </div>
            </div>

            {/* Card 2: Ocupação do Dia (Hoje) */}
            <div className="metric-card" style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(3, 105, 161, 0.15) 100%)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              <div className="metric-info">
                <h3 style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Atendimentos Hoje</h3>
                <div className="value" style={{ color: '#38bdf8', fontSize: '1.8rem', fontWeight: 900 }}>{todayApts}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '0.72rem', flexWrap: 'wrap' }}>
                  <span style={{ color: '#34d399' }}>✓ {presencasHoje} Feitos</span>
                  <span style={{ color: '#38bdf8' }}>🕒 {agendadosHoje} Agendados</span>
                  {faltasHoje > 0 && <span style={{ color: '#f87171' }}>✗ {faltasHoje} Faltas</span>}
                </div>
              </div>
              <div className="metric-icon indigo" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                <i className="fa-solid fa-calendar-check"></i>
              </div>
            </div>

            {/* Card 3: Fila de Retenção (Ação Necessária) */}
            <div className="metric-card" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(153, 27, 27, 0.15) 100%)', border: `1px solid ${pendentesRetencao.length > 0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255,255,255,0.1)'}` }}>
              <div className="metric-info">
                <h3 style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Fila Anti-Churn (Sem Tratativa)</h3>
                <div className="value" style={{ color: pendentesRetencao.length > 0 ? '#f87171' : '#34d399', fontSize: '1.8rem', fontWeight: 900 }}>
                  {pendentesRetencao.length}
                </div>
                <small style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                  {tratadosRetencao.length} tratado(s) nesta semana
                </small>
              </div>
              <div className="metric-icon" style={{ background: pendentesRetencao.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: pendentesRetencao.length > 0 ? '#ef4444' : '#10b981' }}>
                <i className="fa-solid fa-user-shield"></i>
              </div>
            </div>

            {/* Card 4: Alunos Ativos & Receita */}
            <div className="metric-card" style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(107, 33, 168, 0.15) 100%)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
              <div className="metric-info">
                <h3 style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Alunos Ativos Clube</h3>
                <div className="value" style={{ color: '#c084fc', fontSize: '1.8rem', fontWeight: 900 }}>{activeClients}</div>
                <small style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                  Faturamento Est.: <strong style={{ color: '#fff' }}>R$ {formatCurrencyBRL(revenueEst)}</strong>
                </small>
              </div>
              <div className="metric-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                <i className="fa-solid fa-users"></i>
              </div>
            </div>

          </div>

          {/* MÓDULO 1: TERMÔMETRO OPERACIONAL DA CLÍNICA (HOJE) */}
          <div className="content-panel" style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '20px' }}>
            {/* Header com Botão para Agenda Completa */}
            {(() => {
              const getAptClientName = (a: any) => {
                if (a.clienteNome && a.clienteNome !== 'Aluno') return a.clienteNome;
                if (a.clienteId && typeof a.clienteId === 'object' && a.clienteId.dadosPessoais?.nome) {
                  return a.clienteId.dadosPessoais.nome;
                }
                const cId = typeof a.clienteId === 'string' ? a.clienteId : a.clienteId?._id?.toString();
                if (cId) {
                  const found = clients.find(c => c._id?.toString() === cId);
                  if (found?.dadosPessoais?.nome) return found.dadosPessoais.nome;
                }
                return a.clienteNome || 'Aluno';
              };

              return (
                <>
                  <div className="panel-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-clock"></i> Termômetro Operacional da Clínica (Hoje)
                    </h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setActiveTab('agenda_completa')} style={{ fontSize: '0.78rem' }}>
                        <i className="fa-solid fa-calendar-days" style={{ marginRight: '6px' }}></i> Abrir Agenda Completa
                      </button>
                    </div>
                  </div>

                  {/* Cards de Turnos do Dia */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                    
                    {/* Manhã */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fde047', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fa-solid fa-sun"></i> Turno Manhã (06h - 12h)
                        </span>
                        <span style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>{manhaApts.length} atendimentos</span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                        {manhaApts.length > 0 ? (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                            {manhaApts.slice(0, 5).map((a, idx) => (
                              <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <strong style={{ color: '#fde047' }}>{a.horario}</strong> • {getAptClientName(a)}
                              </span>
                            ))}
                            {manhaApts.length > 5 && <span style={{ color: '#38bdf8', fontSize: '0.74rem', fontWeight: 700, padding: '3px 6px' }}>+{manhaApts.length - 5} mais</span>}
                          </div>
                        ) : (
                          <span>Nenhum atendimento agendado para a manhã.</span>
                        )}
                      </div>
                    </div>

                    {/* Tarde */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fb923c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fa-solid fa-cloud-sun"></i> Turno Tarde (12h - 18h)
                        </span>
                        <span style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>{tardeApts.length} atendimentos</span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                        {tardeApts.length > 0 ? (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                            {tardeApts.slice(0, 5).map((a, idx) => (
                              <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <strong style={{ color: '#fb923c' }}>{a.horario}</strong> • {getAptClientName(a)}
                              </span>
                            ))}
                            {tardeApts.length > 5 && <span style={{ color: '#38bdf8', fontSize: '0.74rem', fontWeight: 700, padding: '3px 6px' }}>+{tardeApts.length - 5} mais</span>}
                          </div>
                        ) : (
                          <span>Nenhum atendimento agendado para a tarde.</span>
                        )}
                      </div>
                    </div>

                    {/* Noite */}
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fa-solid fa-moon"></i> Turno Noite (18h - 22h)
                        </span>
                        <span style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>{noiteApts.length} atendimentos</span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                        {noiteApts.length > 0 ? (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                            {noiteApts.slice(0, 5).map((a, idx) => (
                              <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <strong style={{ color: '#818cf8' }}>{a.horario}</strong> • {getAptClientName(a)}
                              </span>
                            ))}
                            {noiteApts.length > 5 && <span style={{ color: '#38bdf8', fontSize: '0.74rem', fontWeight: 700, padding: '3px 6px' }}>+{noiteApts.length - 5} mais</span>}
                          </div>
                        ) : (
                          <span>Nenhum atendimento agendado para a noite.</span>
                        )}
                      </div>
                    </div>

                  </div>
                </>
              );
            })()}
          </div>

          {/* MÓDULO 2: CENTRAL DE INTELIGÊNCIA DE RETENÇÃO (FILA DE TRATATIVAS) */}
          <div className="content-panel" style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '20px' }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-shield-halved"></i> Central de Retenção & Fila de Tratativas (Anti-Churn)
                </h2>
                <small style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                  Acompanhamento preditivo de frequência semanal com tratativa ativa e resolução de pendências.
                </small>
              </div>

              {/* Botões de Ação Global */}
              {pendentesRetencao.length > 0 && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleEngageAllPending(pendentesRetencao)}
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderColor: '#059669', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="fa-brands fa-whatsapp"></i> Engajar Todos os Pendentes ({pendentesRetencao.length})
                </button>
              )}
            </div>

            {/* Abas de Navegação da Retenção */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${activeRetentionTab === 'pendentes' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveRetentionTab('pendentes')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fa-solid fa-circle-exclamation" style={{ color: activeRetentionTab === 'pendentes' ? '#fff' : '#ef4444' }}></i>
                Pendentes de Tratativa ({pendentesRetencao.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeRetentionTab === 'tratados' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveRetentionTab('tratados')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fa-solid fa-circle-check" style={{ color: activeRetentionTab === 'tratados' ? '#fff' : '#10b981' }}></i>
                Tratados nesta Semana ({tratadosRetencao.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeRetentionTab === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveRetentionTab('todos')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <i className="fa-solid fa-list"></i> Todos os Alunos com Meta ({totalComMeta})
              </button>
            </div>

            {/* ABA 1: PENDENTES DE TRATATIVA */}
            {activeRetentionTab === 'pendentes' && (
              <div>
                {pendentesRetencao.length === 0 ? (
                  <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
                    <i className="fa-solid fa-circle-check fa-2x" style={{ color: '#10b981', marginBottom: '10px' }}></i>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 700 }}>Parabéns! Nenhuma pendência de tratativa ativa.</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '6px 0 0 0' }}>
                      Todos os alunos em risco nesta semana já foram engajados ou tiveram suas tratativas registradas.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {pendentesRetencao.map(({ client: c, metrics }) => {
                      const diasNomes: Record<number, string> = { 4: '(terça a sexta)', 3: '(quarta a sexta)', 2: '(quinta e sexta)', 1: '(sexta-feira)' };
                      const diasTexto = diasNomes[metrics.diasRestantes] || '';
                      return (
                        <div
                          key={c._id}
                          style={{
                            background: 'rgba(239, 68, 68, 0.04)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '12px',
                            padding: '14px 18px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '280px', flex: '1 1 300px' }}>
                            <div>
                              <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>
                                {c.dadosPessoais?.nome}
                              </div>
                              <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '2px' }}>
                                Contratou <strong style={{ color: '#fde047' }}>{metrics.frequenciaSemanal}x/sem</strong> • Fez <strong style={{ color: '#34d399' }}>{metrics.realizados}</strong> • Agendou <strong style={{ color: '#38bdf8' }}>{metrics.agendados}</strong> • Restam <strong style={{ color: '#f87171' }}>{metrics.pendentes} pendente(s)</strong> ({metrics.diasRestantes} dias úteis {diasTexto})
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setTratativaModalClient(c);
                                setTratativaMotivo('agendou');
                                setTratativaObs('');
                              }}
                              style={{ fontSize: '0.78rem' }}
                            >
                              <i className="fa-solid fa-pen-to-square" style={{ marginRight: '5px' }}></i> Registrar Tratativa
                            </button>

                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleEngageWhatsAppWithTratativa(c, metrics)}
                              style={{ background: '#10b981', borderColor: '#10b981', color: '#fff', fontWeight: 700, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                              <i className="fa-brands fa-whatsapp"></i> Engajar WhatsApp
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ABA 2: TRATADOS NESTA SEMANA */}
            {activeRetentionTab === 'tratados' && (
              <div>
                {tratadosRetencao.length === 0 ? (
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                    Nenhuma tratativa registrada nesta semana ainda.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {tratadosRetencao.map(({ client: c, metrics }) => {
                      const t = tratativas[c._id];
                      return (
                        <div
                          key={c._id}
                          style={{
                            background: 'rgba(16, 185, 129, 0.04)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            borderRadius: '12px',
                            padding: '14px 18px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '280px', flex: '1 1 300px' }}>
                            <div>
                              <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {c.dadosPessoais?.nome}
                                <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '0.72rem', padding: '1px 8px', borderRadius: '6px' }}>
                                  Tratado
                                </span>
                              </div>
                              <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '2px' }}>
                                <strong>Motivo/Ação:</strong> {t?.motivo || 'Engajamento realizado'} {t?.obs ? `(${t.obs})` : ''} • <span style={{ color: '#64748b' }}>Tratado em {t?.data}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => removeRetentionTratativa(c._id)}
                              style={{ fontSize: '0.76rem', color: '#94a3b8' }}
                              title="Retornar para a lista de pendentes"
                            >
                              <i className="fa-solid fa-arrow-rotate-left" style={{ marginRight: '5px' }}></i> Desfazer Tratativa
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ABA 3: TODOS OS ALUNOS COM META */}
            {activeRetentionTab === 'todos' && (
              <div className="table-responsive" style={{ marginTop: '6px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Plano</th>
                      <th style={{ textAlign: 'center' }}>Freq. Contratada</th>
                      <th style={{ textAlign: 'center' }}>Treinos Feitos</th>
                      <th style={{ textAlign: 'center' }}>Agendados</th>
                      <th style={{ textAlign: 'center' }}>Pendentes</th>
                      <th style={{ textAlign: 'center' }}>Dias Restantes</th>
                      <th style={{ textAlign: 'center' }}>Status Semanal</th>
                      <th style={{ textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retentionList.map(({ client: c, metrics }) => {
                      const planName = c.dadosComerciais?.planoId?.nome || 'Plano Clube';
                      const isTreated = !!tratativas[c._id];
                      return (
                        <tr key={c._id}>
                          <td><strong>{c.dadosPessoais?.nome}</strong></td>
                          <td>{planName}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{metrics.frequenciaSemanal}x/semana</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--color-success)' }}>{metrics.realizados}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--color-info)' }}>{metrics.agendados}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: metrics.pendentes > 0 ? '#f59e0b' : '#64748b' }}>{metrics.pendentes}</td>
                          <td style={{ textAlign: 'center' }}>{metrics.diasRestantes} dias</td>
                          <td style={{ textAlign: 'center' }}>
                            {metrics.alerta ? (
                              isTreated ? (
                                <span className="badge badge-success" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>✓ Tratado</span>
                              ) : (
                                <span className="badge badge-danger">⚠️ Zona Crítica</span>
                              )
                            ) : (
                              <span className="badge badge-success">✓ Seguro</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleEngageWhatsAppWithTratativa(c, metrics)}
                              title="Engajar WhatsApp"
                              style={{ padding: '5px 10px' }}
                            >
                              <i className="fa-brands fa-whatsapp" style={{ color: '#10b981' }}></i>
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

          {/* MÓDULO 3: RADAR DE VENCIMENTOS & RENOVAÇÃO PROATIVA (COM TRATATIVAS) */}
          {(pendingExpiredContracts.length > 0 || pendingExpiringContracts.length > 0) && (
            <div className="content-panel" style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '20px' }}>
              <div className="panel-header" style={{ marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-file-contract"></i> Radar de Vencimentos & Renovações Pendentes
                </h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${activeContractAlertTab === 'vencidos' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveContractAlertTab('vencidos')}
                  >
                    Vencidos ({pendingExpiredContracts.length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${activeContractAlertTab === 'vencendo' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveContractAlertTab('vencendo')}
                  >
                    Vencendo em 15 dias ({pendingExpiringContracts.length})
                  </button>
                </div>
              </div>

              {/* Lista de Vencidos */}
              {activeContractAlertTab === 'vencidos' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pendingExpiredContracts.map(c => {
                    const info = getContractValidityInfo(c);
                    return (
                      <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px' }}>
                          <i className="fa-solid fa-circle-exclamation" style={{ color: '#ef4444' }}></i>
                          <span style={{ fontSize: '0.86rem' }}>
                            O contrato de <strong>{c.dadosPessoais?.nome}</strong> venceu em <strong>{info.dataFimFormatted}</strong>.
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => saveContractTratativa(c._id, 'Renovação em negociação com aluno')}
                            style={{ fontSize: '0.78rem' }}
                          >
                            Marcar como Tratado
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setActiveTab('contratos')}
                            style={{ fontSize: '0.78rem' }}
                          >
                            <i className="fa-solid fa-rotate" style={{ marginRight: '5px' }}></i> Renovar na Gestão
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Lista de Vencendo nos próximos 15 dias */}
              {activeContractAlertTab === 'vencendo' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pendingExpiringContracts.map(c => {
                    const info = getContractValidityInfo(c);
                    return (
                      <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', padding: '12px 16px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px' }}>
                          <i className="fa-solid fa-clock" style={{ color: '#f59e0b' }}></i>
                          <span style={{ fontSize: '0.86rem' }}>
                            O contrato de <strong>{c.dadosPessoais?.nome}</strong> vencerá em <strong>{info.dataFimFormatted}</strong> ({info.daysLeft} dias restantes).
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => saveContractTratativa(c._id, 'Abordado preventivamente para renovação')}
                            style={{ fontSize: '0.78rem' }}
                          >
                            Marcar como Tratado
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setActiveTab('contratos')}
                            style={{ fontSize: '0.78rem' }}
                          >
                            <i className="fa-solid fa-rotate" style={{ marginRight: '5px' }}></i> Renovar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MODAL DE REGISTRO MANUAL DE TRATATIVA DE RETENÇÃO */}
          {tratativaModalClient && (
            <div className="modal-overlay" style={{ display: 'flex', zIndex: 12000, background: 'rgba(0,0,0,0.8)' }} onClick={() => setTratativaModalClient(null)}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '95%', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-pen-to-square"></i> Registrar Tratativa de Retenção
                  </h3>
                  <button type="button" className="close-btn" onClick={() => setTratativaModalClient(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer' }}>&times;</button>
                </div>

                <div style={{ fontSize: '0.86rem', color: '#cbd5e1', marginBottom: '14px' }}>
                  Aluno: <strong style={{ color: '#fff' }}>{tratativaModalClient.dadosPessoais?.nome}</strong>
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Motivo / Desfecho da Tratativa *</label>
                  <select
                    className="select-custom"
                    style={{ width: '100%', padding: '10px 12px' }}
                    value={tratativaMotivo}
                    onChange={e => setTratativaMotivo(e.target.value)}
                  >
                    <option value="Agendou horário de reposição">Agendou horário de reposição</option>
                    <option value="Aluno em viagem justificada">Aluno em viagem justificada</option>
                    <option value="Atestado médico / Motivo de saúde">Atestado médico / Motivo de saúde</option>
                    <option value="Compromisso pessoal / Reagendará na próxima semana">Compromisso pessoal / Reagendará na próxima semana</option>
                    <option value="Contato via WhatsApp / Aguardando resposta">Contato via WhatsApp / Aguardando resposta</option>
                    <option value="Outro motivo">Outro motivo</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>Observações Adicionais</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    style={{ width: '100%', padding: '10px 12px', resize: 'vertical' }}
                    placeholder="Ex: Aluno informou que volta na segunda-feira e fará treino duplo..."
                    value={tratativaObs}
                    onChange={e => setTratativaObs(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setTratativaModalClient(null)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ background: '#10b981', borderColor: '#10b981', fontWeight: 700 }}
                    onClick={() => {
                      saveRetentionTratativa(tratativaModalClient._id, {
                        motivo: tratativaMotivo,
                        tipo: 'manual',
                        obs: tratativaObs
                      });
                      setTratativaModalClient(null);
                    }}
                  >
                    Salvar Tratativa
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 2. View: Profissionais */}
      {activeTab === 'profissionais' && (() => {
        const listKey = 'profissionais';
        const q = getSearchQuery(listKey);
        const filtered = professionals.filter(p => smartSearchMatch([p.nome, p.especialidade, p.registro, p.userId?.email], q));
        const activeP = getPage(listKey);
        const size = getPageSize(listKey);
        const totalPages = Math.ceil(filtered.length / size);
        const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
        const paginated = filtered.slice((curP - 1) * size, curP * size);

        return (
          <>
            <div className="view-header">
              <div className="view-title-group">
                <h1>Gestão de Profissionais</h1>
                <p>Cadastre e gerencie a equipe do Clube Fitness Fisio.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <SmartSearchInput
                  value={q}
                  onChange={val => setSearchQueryForKey('profissionais', val)}
                  placeholder="Buscar profissional..."
                  resultCount={filtered.length}
                  totalCount={professionals.length}
                />
                <button className="btn btn-primary" onClick={() => handleOpenProfModal()}>
                  <i className="fa-solid fa-plus"></i> Novo Profissional
                </button>
              </div>
            </div>

            <div className="content-panel">
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
                    {paginated.map(p => (
                      <tr key={p._id}>
                        <td>
                          <strong>{p.nome}</strong>
                          {p.isEstagiario && (
                            <span 
                              className="badge" 
                              style={{ 
                                marginLeft: '8px', 
                                background: 'rgba(245, 158, 11, 0.15)', 
                                color: '#f59e0b', 
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                fontSize: '0.7rem',
                                fontWeight: 700
                              }}
                            >
                              ESTAGIÁRIO
                            </span>
                          )}
                        </td>
                        <td><span className="badge badge-info">{p.especialidade}</span></td>
                        <td><code>{p.registro}</code></td>
                        <td>{p.userId?.email}</td>
                        <td>
                          <button className="btn btn-secondary btn-sm" style={{ marginRight: '8px' }} onClick={() => handleOpenProfModal(p)} title="Editar Profissional">
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteProf(p._id)} title="Excluir Profissional">
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
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
              {filtered.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <Pagination
                    currentPage={curP}
                    totalItems={filtered.length}
                    itemsPerPage={size}
                    onPageChange={page => setPage('profissionais', page)}
                  />
                </div>
              )}
            </div>
          </>
        );
      })()}

      {/* 2.5. View: Vincular Alunos */}
      {activeTab === 'vincular_alunos' && (() => {
        const listKey = 'vincular_alunos';
        const q = getSearchQuery(listKey);
        const filtered = clients.filter(c => 
          smartSearchMatch([c.dadosPessoais?.nome, c.dadosPessoais?.email, c.dadosPessoais?.cpf, c.dadosPessoais?.telefone], q)
        );
        const activeP = getPage(listKey);
        const size = getPageSize(listKey);
        const totalPages = Math.ceil(filtered.length / size);
        const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
        const paginated = filtered.slice((curP - 1) * size, curP * size);

        return (
          <>
            <div className="view-header">
              <div className="view-title-group">
                <h1>Vincular Alunos a Profissionais</h1>
                <p>Associe cada aluno ao profissional de saúde responsável.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <SmartSearchInput
                  value={q}
                  onChange={val => setSearchQueryForKey('vincular_alunos', val)}
                  placeholder="Buscar aluno por nome, CPF ou email..."
                  resultCount={filtered.length}
                  totalCount={clients.length}
                />
              </div>
            </div>
            <div className="content-panel">
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
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
                          Nenhum aluno encontrado.
                        </td>
                      </tr>
                    ) : (
                      paginated.map(c => {
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
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {filtered.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <Pagination
                    currentPage={curP}
                    totalItems={filtered.length}
                    itemsPerPage={size}
                    onPageChange={page => setPage('vincular_alunos', page)}
                  />
                </div>
              )}
            </div>
          </>
        );
      })()}


      {/* 2.6. View: Log de Atividades */}
      {activeTab === 'log_atividades' && (() => {
        const listKey = 'log_atividades';
        const q = getSearchQuery(listKey);
        const filtered = activityLogs.filter(log => {
          return smartSearchMatch([
            log.acao,
            log.detalhes,
            log.profissionalId?.nome,
            log.clienteId?.dadosPessoais?.nome,
            log.origem
          ], q);
        });
        const activeP = getPage(listKey);
        const size = getPageSize(listKey);
        const totalPages = Math.ceil(filtered.length / size);
        const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
        const paginated = filtered.slice((curP - 1) * size, curP * size);

        return (
          <>
            <div className="view-header">
              <div className="view-title-group">
                <h1>Log de Atividades (Auditoria)</h1>
                <p>Histórico de ações realizadas pelos profissionais no sistema.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <SmartSearchInput
                  value={q}
                  onChange={val => setSearchQueryForKey('log_atividades', val)}
                  placeholder="Buscar por ação, profissional, aluno..."
                  resultCount={filtered.length}
                  totalCount={activityLogs.length}
                />
              </div>
            </div>
            <div className="content-panel">
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
                    {paginated.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
                          Nenhuma atividade registrada.
                        </td>
                      </tr>
                    ) : (
                      paginated.map(log => {
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
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {filtered.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <Pagination
                    currentPage={curP}
                    totalItems={filtered.length}
                    itemsPerPage={size}
                    onPageChange={page => setPage('log_atividades', page)}
                  />
                </div>
              )}
            </div>
          </>
        );
      })()}

      {/* 3. View: Clientes */}
      {activeTab === 'clientes' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Cadastro Geral de Clientes</h1>
              <p>Gerencie dados clínicos, contratos e planos dos alunos.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button className="btn btn-primary" onClick={() => handleOpenClientModal()}>
                <i className="fa-solid fa-plus"></i> Novo Aluno
              </button>
            </div>
          </div>

          <div className="content-panel">
            <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ flex: '1 1 240px', maxWidth: '380px' }}>
                <SmartSearchInput 
                  placeholder="Buscar por nome, plano, CPF, status..." 
                  value={getSearchQuery('clientes')} 
                  onChange={val => setSearchQueryForKey('clientes', val)} 
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
                    value={clientsFilterStatus} 
                    onChange={e => { setClientsFilterStatus(e.target.value); setPage('clientes', 1); }}
                    style={{ minWidth: '130px', fontSize: '0.83rem', padding: '6px 10px' }}
                  >
                    <option value="todos">🌐 Todos os Status</option>
                    <option value="ativo">✅ Ativos</option>
                    <option value="vencido">⚠️ Vencidos</option>
                  </select>
                </div>

                {/* Plan Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    <i className="fa-solid fa-layer-group" style={{ color: 'var(--color-primary)', marginRight: '4px' }}></i> Plano:
                  </label>
                  <select 
                    className="select-custom" 
                    value={clientsFilterPlan} 
                    onChange={e => { setClientsFilterPlan(e.target.value); setPage('clientes', 1); }}
                    style={{ minWidth: '160px', fontSize: '0.83rem', padding: '6px 10px' }}
                  >
                    <option value="todos">📁 Todos os Planos</option>
                    <option value="personalizado">Personalizado</option>
                    {plans.map(p => (
                      <option key={p._id} value={p._id}>{p.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Credits Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    <i className="fa-solid fa-coins" style={{ color: 'var(--color-primary)', marginRight: '4px' }}></i> Créditos:
                  </label>
                  <select 
                    className="select-custom" 
                    value={clientsFilterCredits} 
                    onChange={e => { setClientsFilterCredits(e.target.value); setPage('clientes', 1); }}
                    style={{ minWidth: '140px', fontSize: '0.83rem', padding: '6px 10px' }}
                  >
                    <option value="todos">⚡ Todos</option>
                    <option value="zerado">Sem Créditos (0)</option>
                    <option value="pouco">Poucos (&lt; 3)</option>
                    <option value="suficiente">Com Créditos (&gt;= 3)</option>
                  </select>
                </div>

                {/* Sort Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    <i className="fa-solid fa-arrow-down-a-z" style={{ color: 'var(--color-primary)', marginRight: '4px' }}></i> Ordenar:
                  </label>
                  <select 
                    className="select-custom" 
                    value={clientsSortOrder} 
                    onChange={e => { setClientsSortOrder(e.target.value); setPage('clientes', 1); }}
                    style={{ minWidth: '140px', fontSize: '0.83rem', padding: '6px 10px' }}
                  >
                    <option value="nome_asc">🔤 Nome (A - Z)</option>
                    <option value="nome_desc">🔤 Nome (Z - A)</option>
                    <option value="vencimento_asc">⏳ Vencimento Próximo</option>
                    <option value="recentes">🆕 Mais Recentes</option>
                  </select>
                </div>

                {/* Reset Button */}
                {(getSearchQuery('clientes') !== '' || clientsFilterStatus !== 'todos' || clientsFilterPlan !== 'todos' || clientsFilterCredits !== 'todos' || clientsSortOrder !== 'nome_asc') && (
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => {
                      setSearchQueryForKey('clientes', '');
                      setClientsFilterStatus('todos');
                      setClientsFilterPlan('todos');
                      setClientsFilterCredits('todos');
                      setClientsFilterRecurrence('todos');
                      setClientsSortOrder('nome_asc');
                      setPage('clientes', 1);
                    }}
                    style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <i className="fa-solid fa-xmark"></i> Limpar
                  </button>
                )}
              </div>
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
                    const q = getSearchQuery(listKey);
                    const filtered = clients.filter(c => {
                      // 1. Smart Search Multi-Terms Match
                      const planName = c.dadosComerciais?.planoId?.nome || 'Personalizado';
                      const matchesSearch = smartSearchMatch(q, [
                        c.dadosPessoais?.nome,
                        c.dadosPessoais?.email,
                        c.dadosPessoais?.cpf,
                        c.dadosPessoais?.telefone,
                        planName,
                        c.dadosComerciais?.status
                      ]);
                      if (!matchesSearch) return false;

                      // 2. Status
                      const status = c.dadosComerciais?.status || 'ativo';
                      if (clientsFilterStatus !== 'todos' && status !== clientsFilterStatus) return false;

                      // 3. Plan
                      if (clientsFilterPlan !== 'todos') {
                        if (clientsFilterPlan === 'personalizado') {
                          if (c.dadosComerciais?.planoId) return false;
                        } else {
                          if (c.dadosComerciais?.planoId?._id !== clientsFilterPlan) return false;
                        }
                      }

                      // 4. Credits
                      const credTotal = c.dadosComerciais?.creditosTotal || 0;
                      const credUsados = c.dadosComerciais?.creditosUsados || 0;
                      const credReservados = c.dadosComerciais?.creditosReservados || 0;
                      const credDisp = Math.max(0, credTotal - credUsados - credReservados);

                      if (clientsFilterCredits !== 'todos') {
                        if (clientsFilterCredits === 'zerado' && credDisp !== 0) return false;
                        if (clientsFilterCredits === 'pouco' && (credDisp === 0 || credDisp >= 3)) return false;
                        if (clientsFilterCredits === 'suficiente' && credDisp < 3) return false;
                      }

                      return true;
                    });

                    // Sorting
                    filtered.sort((a, b) => {
                      if (clientsSortOrder === 'nome_asc') {
                        return (a.dadosPessoais?.nome || '').localeCompare(b.dadosPessoais?.nome || '');
                      }
                      if (clientsSortOrder === 'nome_desc') {
                        return (b.dadosPessoais?.nome || '').localeCompare(a.dadosPessoais?.nome || '');
                      }
                      if (clientsSortOrder === 'vencimento_asc') {
                        const vA = a.dadosComerciais?.vencimento || '9999-12-31';
                        const vB = b.dadosComerciais?.vencimento || '9999-12-31';
                        return vA.localeCompare(vB);
                      }
                      if (clientsSortOrder === 'recentes') {
                        const cA = a.createdAt || '';
                        const cB = b.createdAt || '';
                        return cB.localeCompare(cA);
                      }
                      return 0;
                    });

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
                          <td>
                            {planName}
                            {Boolean(c.dadosComerciais?.criarRecorrenciaMensal) && (
                              <div style={{ marginTop: '2px' }}>
                                <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.62rem', padding: '2px 4px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '3px' }}>
                                  <i className="fa-solid fa-arrows-rotate fa-spin" style={{ fontSize: '0.55rem' }}></i> Recorrência
                                </span>
                              </div>
                            )}
                          </td>
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
              <button className="btn btn-primary" onClick={() => handleOpenUserModal()}>
                <i className="fa-solid fa-plus"></i> Novo Usuário
              </button>
            </div>
          </div>

          <div className="content-panel">
            <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ flex: '1 1 240px', maxWidth: '380px' }}>
                <SmartSearchInput
                  placeholder="Buscar por nome ou e-mail..."
                  value={getSearchQuery('usuarios')}
                  onChange={val => setSearchQueryForKey('usuarios', val)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    <i className="fa-solid fa-filter" style={{ color: 'var(--color-primary)', marginRight: '4px' }}></i> Perfil:
                  </label>
                  <select
                    className="select-custom"
                    value={userRoleFilter}
                    onChange={e => setUserRoleFilter(e.target.value)}
                    style={{ minWidth: '150px', fontSize: '0.83rem', padding: '6px 10px' }}
                  >
                    <option value="todos">🌐 Todos os Perfis</option>
                    <option value="aluno">🎓 Alunos</option>
                    <option value="profissional">🩺 Profissionais</option>
                    <option value="recepcao">💼 Recepção</option>
                    <option value="admin">⚡ Administradores</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    <i className="fa-solid fa-layer-group" style={{ color: 'var(--color-primary)', marginRight: '4px' }}></i> Plano/Detalhe:
                  </label>
                  <select
                    className="select-custom"
                    value={userPlanFilter}
                    onChange={e => setUserPlanFilter(e.target.value)}
                    style={{ minWidth: '170px', fontSize: '0.83rem', padding: '6px 10px' }}
                  >
                    <option value="todos">📁 Todos os Planos/Detalhes</option>
                    {plans.map((p: any) => (
                      <option key={p._id || p.id} value={p.nome}>{p.nome}</option>
                    ))}
                    <option value="Fisioterapia">Fisioterapia</option>
                    <option value="Educador Físico">Educador Físico</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    <i className="fa-solid fa-arrow-down-short-wide" style={{ color: 'var(--color-primary)', marginRight: '4px' }}></i> Ordenar:
                  </label>
                  <select
                    className="select-custom"
                    value={userSortOption}
                    onChange={e => setUserSortOption(e.target.value)}
                    style={{ minWidth: '180px', fontSize: '0.83rem', padding: '6px 10px' }}
                  >
                    <option value="alfabetico_asc">🔤 Nome (A - Z)</option>
                    <option value="alfabetico_desc">🔤 Nome (Z - A)</option>
                    <option value="perfil">👤 Agrupar por Perfil</option>
                    <option value="recente">🆕 Mais Recentes</option>
                  </select>
                </div>
              </div>
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
                    const q = getSearchQuery(listKey);

                    const filtered = users.filter(u => {
                      const userRoles = u.roles && u.roles.length > 0 ? u.roles : [u.tipo];
                      const matchesSearch = smartSearchMatch([
                        u.nome,
                        u.email,
                        u.especialidade,
                        u.clientDetails?.dadosComerciais?.planoId?.nome,
                        u.tipo,
                        ...userRoles
                      ], q);
                      if (!matchesSearch) return false;

                      // Role filter
                      if (userRoleFilter !== 'todos') {
                        if (userRoleFilter === 'aluno' && !userRoles.includes('client')) return false;
                        if (userRoleFilter === 'profissional' && !userRoles.includes('professional')) return false;
                        if (userRoleFilter === 'recepcao' && !userRoles.includes('receptionist')) return false;
                        if (userRoleFilter === 'admin' && !userRoles.includes('admin')) return false;
                      }

                      // Plan / Detail Filter
                      if (userPlanFilter !== 'todos') {
                        const com = u.dadosComerciais || {};
                        const planName = (com.planoId?.nome || com.planoId || '').toString().toLowerCase();
                        const profSpec = (u.especialidade || '').toString().toLowerCase();
                        const target = userPlanFilter.toLowerCase();
                        if (!planName.includes(target) && !profSpec.includes(target)) return false;
                      }

                      return true;
                    });

                    // Dynamic sorting
                    const sorted = [...filtered].sort((a: any, b: any) => {
                      const nomeA = a.nome || '';
                      const nomeB = b.nome || '';

                      if (userSortOption === 'alfabetico_asc') {
                        return nomeA.localeCompare(nomeB, 'pt-BR');
                      }
                      if (userSortOption === 'alfabetico_desc') {
                        return nomeB.localeCompare(nomeA, 'pt-BR');
                      }
                      if (userSortOption === 'recente') {
                        const dateA = a.createdAt || a._id || '';
                        const dateB = b.createdAt || b._id || '';
                        return dateB.localeCompare(dateA);
                      }
                      if (userSortOption === 'perfil') {
                        const rolesA = a.roles && a.roles.length > 0 ? a.roles : [a.tipo];
                        const rolesB = b.roles && b.roles.length > 0 ? b.roles : [b.tipo];
                        const getRolePriority = (rList: string[]) => {
                          if (rList.includes('admin')) return 1;
                          if (rList.includes('receptionist')) return 2;
                          if (rList.includes('professional')) return 3;
                          if (rList.includes('client')) return 4;
                          return 5;
                        };
                        return getRolePriority(rolesA) - getRolePriority(rolesB);
                      }
                      return 0;
                    });

                    const totalPages = Math.ceil(sorted.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = sorted.slice((curP - 1) * size, curP * size);

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
      {activeTab === 'controle_creditos' && (() => {
        const listKey = 'controle_creditos';
        const q = getSearchQuery(listKey);
        const filtered = clients.filter(c => {
          const planName = c.dadosComerciais?.planoId?.nome || 'Personalizado';
          return smartSearchMatch([
            c.dadosPessoais?.nome,
            c.dadosPessoais?.email,
            c.dadosPessoais?.cpf,
            planName
          ], q);
        });
        const activeP = getPage(listKey);
        const size = getPageSize(listKey);
        const totalPages = Math.ceil(filtered.length / size);
        const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
        const paginated = filtered.slice((curP - 1) * size, curP * size);

        return (
          <>
            <div className="view-header">
              <div className="view-title-group">
                <h1>Controle de Créditos</h1>
                <p>Audite e gerencie o saldo de créditos semanais e mensais dos alunos.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <SmartSearchInput
                  value={q}
                  onChange={val => setSearchQueryForKey('controle_creditos', val)}
                  placeholder="Buscar aluno por nome, CPF ou plano..."
                  resultCount={filtered.length}
                  totalCount={clients.length}
                />
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
                    {paginated.map(c => {
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
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={7}>
                          <div className="empty-state-card">
                            <i className="fa-solid fa-coins empty-state-icon"></i>
                            <div className="empty-state-title">Nenhum aluno encontrado</div>
                            <div className="empty-state-desc">Não há alunos correspondentes aos filtros.</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filtered.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <Pagination
                    currentPage={curP}
                    totalItems={filtered.length}
                    itemsPerPage={size}
                    onPageChange={page => setPage('controle_creditos', page)}
                  />
                </div>
              )}
            </div>
          </>
        );
      })()}

      {/* 6. View: Planos & Configs */}
      {activeTab === 'planos' && (() => {
        const listKey = 'planos';
        const q = getSearchQuery(listKey);
        const filtered = plans.filter(p => smartSearchMatch([p.nome], q));
        const activeP = getPage(listKey);
        const size = getPageSize(listKey);
        const totalPages = Math.ceil(filtered.length / size);
        const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
        const paginated = filtered.slice((curP - 1) * size, curP * size);

        return (
          <>
            <div className="view-header">
              <div className="view-title-group">
                <h1>Planos & Configurações</h1>
                <p>Crie e gerencie as opções de planos e mensalidades oferecidas no clube.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <SmartSearchInput
                  value={q}
                  onChange={val => setSearchQueryForKey('planos', val)}
                  placeholder="Buscar plano..."
                  resultCount={filtered.length}
                  totalCount={plans.length}
                />
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
                    {paginated.map(p => (
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
                    ))}
                    {filtered.length === 0 && (
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
              {filtered.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <Pagination
                    currentPage={curP}
                    totalItems={filtered.length}
                    itemsPerPage={size}
                    onPageChange={page => setPage('planos', page)}
                  />
                </div>
              )}
            </div>
          </>
        );
      })()}

      {/* 7. View: Horários Fixos */}
      {activeTab === 'agenda_fixa' && (
        <HorariosFixosPanel
          fixedSchedules={fixedSchedules}
          clients={clients}
          professionals={professionals}
          contractsList={contractsAdminList}
          onRefresh={fetchData}
        />
      )}

      {/* View: Movimentos Realizados via Link */}
      {activeTab === 'movimentos_links' && (() => {
        const q = getSearchQuery('movimentos_links');
        const now = new Date();

        // 1. Filtragem Multidimensional
        const filtered = linkMovements.filter(m => {
          // Tipo
          if (linkMovementTypeFilter !== 'todos' && m.tipo !== linkMovementTypeFilter) {
            return false;
          }

          // Visualização
          const isOpened = Boolean(m.abertoEm || m.visualizado);
          if (linkMovementViewFilter === 'visualizado' && !isOpened) {
            return false;
          }
          if (linkMovementViewFilter === 'nao_visualizado' && isOpened) {
            return false;
          }

          // Status da Proposta
          if (linkMovementStatusFilter !== 'todos') {
            const st = (m.statusProposta || m.raw?.status || '').toLowerCase();
            if (linkMovementStatusFilter === 'pendente' && st !== 'pendente') return false;
            if (linkMovementStatusFilter === 'respondida' && !['respondida', 'aceita', 'concluido', 'assinado'].includes(st)) return false;
            if (linkMovementStatusFilter === 'expirada' && st !== 'expirada') return false;
          }

          // Período
          if (linkMovementPeriodFilter !== 'todos' && m.createdAt) {
            const dt = new Date(m.createdAt);
            if (!isNaN(dt.getTime())) {
              const diffDays = (now.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24);
              if (linkMovementPeriodFilter === 'hoje') {
                const isToday = dt.getDate() === now.getDate() && dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
                if (!isToday) return false;
              } else if (linkMovementPeriodFilter === '7dias') {
                if (diffDays > 7) return false;
              } else if (linkMovementPeriodFilter === '30dias') {
                if (diffDays > 30) return false;
              } else if (linkMovementPeriodFilter === 'mes_atual') {
                const isThisMonth = dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
                if (!isThisMonth) return false;
              }
            }
          }

          // Plano / Modalidade
          if (linkMovementPlanFilter !== 'todos') {
            const plInfo = m.infoList?.find((i: any) => i.label?.toLowerCase().includes('plano') || i.label?.toLowerCase().includes('modalidade'));
            const planName = plInfo?.value || m.raw?.planoNome || m.raw?.dadosComerciais?.planoId?.nome || '';
            if (planName !== linkMovementPlanFilter) return false;
          }

          // Busca Textual Inteligente
          const infoTexts = (m.infoList || []).map((i: any) => `${i.label} ${i.value}`).join(' ');
          return smartSearchMatch([
            m.cliente?.nome,
            m.cliente?.telefone,
            m.cliente?.cpf,
            m.cliente?.email,
            m.linkNome,
            m.tipoLabel,
            infoTexts
          ], q);
        });

        // 2. Ordenação Inteligente
        filtered.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

          if (linkMovementSort === 'data_asc') {
            return timeA - timeB;
          }
          if (linkMovementSort === 'visualizado_recente') {
            const viewA = a.abertoEm ? new Date(a.abertoEm).getTime() : 0;
            const viewB = b.abertoEm ? new Date(b.abertoEm).getTime() : 0;
            if (viewA !== viewB) return viewB - viewA;
            return timeB - timeA;
          }
          if (linkMovementSort === 'nao_visualizado') {
            const isAOpened = Boolean(a.abertoEm || a.visualizado);
            const isBOpened = Boolean(b.abertoEm || b.visualizado);
            if (isAOpened !== isBOpened) return isAOpened ? 1 : -1;
            return timeB - timeA;
          }
          if (linkMovementSort === 'prioridade_conversao') {
            const getPriority = (item: any) => {
              const isOp = Boolean(item.abertoEm || item.visualizado);
              const st = (item.statusProposta || item.raw?.status || '').toLowerCase();
              if (item.tipo === 'venda' && st === 'pendente' && isOp) return 1; // Quente: Abriu e não pagou
              if (item.tipo === 'venda' && st === 'pendente' && !isOp) return 2; // Pendente não aberto
              if (item.tipo === 'cadastro' || item.tipo === 'dynamus') return 3; // Novos cadastros
              if (['respondida', 'aceita', 'concluido', 'assinado'].includes(st)) return 4; // Concluído
              if (st === 'expirada') return 5; // Expirado
              return 6;
            };
            const pA = getPriority(a);
            const pB = getPriority(b);
            if (pA !== pB) return pA - pB;
            return timeB - timeA;
          }
          if (linkMovementSort === 'valor_desc' || linkMovementSort === 'valor_asc') {
            const getVal = (item: any) => {
              const raw = item.raw || {};
              return Number(raw.valorFinalRecalculado || raw.valorAcordado || raw.dadosComerciais?.valorMensalidade || 0);
            };
            const valA = getVal(a);
            const valB = getVal(b);
            if (valA !== valB) {
              return linkMovementSort === 'valor_desc' ? valB - valA : valA - valB;
            }
            return timeB - timeA;
          }
          if (linkMovementSort === 'nome_asc') {
            return (a.cliente?.nome || '').localeCompare(b.cliente?.nome || '');
          }
          if (linkMovementSort === 'nome_desc') {
            return (b.cliente?.nome || '').localeCompare(a.cliente?.nome || '');
          }

          // Padrão: data_desc
          return timeB - timeA;
        });

        const size = getPageSize('movimentos_links');
        const activeP = getPage('movimentos_links');
        const totalPages = Math.ceil(filtered.length / size);
        const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
        const paginated = filtered.slice((curP - 1) * size, curP * size);

        return (
          <>
            <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div className="view-title-group">
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-satellite-dish" style={{ color: '#10b981' }}></i>
                  Movimentos Realizados via Link
                </h1>
                <p>Acompanhe em tempo real os links preenchidos por clientes e todas as informações enviadas.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => fetchLinkMovements(false)} 
                  disabled={loadingLinkMovements}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className={`fa-solid fa-arrows-rotate ${loadingLinkMovements ? 'fa-spin' : ''}`}></i>
                  Atualizar
                </button>
              </div>
            </div>

            {/* Cards de Resumo */}
            {(() => {
              const total = linkMovements.length;
              const cadastros = linkMovements.filter(m => m.tipo === 'cadastro').length;
              const dynamus = linkMovements.filter(m => m.tipo === 'dynamus').length;
              const vendas = linkMovements.filter(m => m.tipo === 'venda').length;

              return (
                <div className="metrics-grid" style={{ marginBottom: '24px' }}>
                  <div className="metric-card">
                    <div className="metric-info">
                      <h3>Total de Movimentos</h3>
                      <div className="value">{total}</div>
                    </div>
                    <div className="metric-icon"><i className="fa-solid fa-link"></i></div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-info">
                      <h3>Cadastros via Link</h3>
                      <div className="value">{cadastros}</div>
                    </div>
                    <div className="metric-icon" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.15)' }}><i className="fa-solid fa-user-plus"></i></div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-info">
                      <h3>Cadastros / Compras Dynamus</h3>
                      <div className="value">{dynamus}</div>
                    </div>
                    <div className="metric-icon" style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)' }}><i className="fa-solid fa-bolt"></i></div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-info">
                      <h3>Links de Venda / Pagamentos</h3>
                      <div className="value">{vendas}</div>
                    </div>
                    <div className="metric-icon" style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.15)' }}><i className="fa-solid fa-credit-card"></i></div>
                  </div>
                </div>
              );
            })()}

            {/* Filtros e Busca Multidimensional */}
            <div className="content-panel" style={{ marginBottom: '24px', padding: '18px 20px' }}>
              {/* Linha 1: Busca + Filtro por Tipo + Ordenação Inteligente */}
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', flex: 1, minWidth: '280px' }}>
                  <div style={{ flex: 1, minWidth: '220px', maxWidth: '340px' }}>
                    <SmartSearchInput
                      placeholder="Buscar por aluno, telefone, CPF, e-mail, plano..."
                      value={getSearchQuery('movimentos_links')}
                      onChange={val => setSearchQueryForKey('movimentos_links', val)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'todos', label: 'Todos' },
                      { id: 'cadastro', label: 'Cadastros' },
                      { id: 'dynamus', label: 'Dynamus' },
                      { id: 'venda', label: 'Vendas/Pagamentos' },
                      { id: 'clicksign', label: 'Clicksign' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        className={`btn btn-sm ${linkMovementTypeFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => {
                          setLinkMovementTypeFilter(tab.id);
                          setPage('movimentos_links', 1);
                        }}
                        style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '8px' }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seletor de Ordenação Inteligente */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <i className="fa-solid fa-arrow-down-wide-short" style={{ color: 'var(--color-primary)' }}></i>
                    Ordenar por:
                  </label>
                  <select
                    className="form-control"
                    value={linkMovementSort}
                    onChange={e => {
                      setLinkMovementSort(e.target.value);
                      setPage('movimentos_links', 1);
                    }}
                    style={{
                      fontSize: '0.82rem',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      minWidth: '190px'
                    }}
                  >
                    <option value="data_desc">🕒 Mais recentes primeiro</option>
                    <option value="data_asc">⏳ Mais antigos primeiro</option>
                    <option value="visualizado_recente">👁️ Visualizados recentemente</option>
                    <option value="nao_visualizado">⚠️ Não visualizados primeiro</option>
                    <option value="prioridade_conversao">🎯 Prioridade de Conversão</option>
                    <option value="valor_desc">💰 Maior Valor (R$)</option>
                    <option value="valor_asc">💵 Menor Valor (R$)</option>
                    <option value="nome_asc">🔤 Nome do Aluno (A → Z)</option>
                    <option value="nome_desc">🔤 Nome do Aluno (Z → A)</option>
                  </select>
                </div>
              </div>

              {/* Linha 2: Filtros Específicos (Visualização, Status, Período, Plano) */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Filtro por Visualização */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <select
                    className="form-control"
                    value={linkMovementViewFilter}
                    onChange={e => {
                      setLinkMovementViewFilter(e.target.value);
                      setPage('movimentos_links', 1);
                    }}
                    style={{
                      fontSize: '0.78rem',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: linkMovementViewFilter !== 'todos' ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-secondary)',
                      color: linkMovementViewFilter !== 'todos' ? '#38bdf8' : 'var(--text-main)',
                      border: linkMovementViewFilter !== 'todos' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border-color)',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="todos">👁️ Visualização: Todas</option>
                    <option value="visualizado">👁️ Apenas Visualizados / Abertos</option>
                    <option value="nao_visualizado">👁️‍🗨️ Apenas Não Visualizados</option>
                  </select>
                </div>

                {/* Filtro por Status da Proposta */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <select
                    className="form-control"
                    value={linkMovementStatusFilter}
                    onChange={e => {
                      setLinkMovementStatusFilter(e.target.value);
                      setPage('movimentos_links', 1);
                    }}
                    style={{
                      fontSize: '0.78rem',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: linkMovementStatusFilter !== 'todos' ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-secondary)',
                      color: linkMovementStatusFilter !== 'todos' ? '#f59e0b' : 'var(--text-main)',
                      border: linkMovementStatusFilter !== 'todos' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-color)',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="todos">📋 Status: Todos</option>
                    <option value="pendente">🟡 Pendente / Em aberto</option>
                    <option value="respondida">🟢 Respondida / Aceita</option>
                    <option value="expirada">🔴 Expirada (3 dias)</option>
                  </select>
                </div>

                {/* Filtro por Período */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <select
                    className="form-control"
                    value={linkMovementPeriodFilter}
                    onChange={e => {
                      setLinkMovementPeriodFilter(e.target.value);
                      setPage('movimentos_links', 1);
                    }}
                    style={{
                      fontSize: '0.78rem',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: linkMovementPeriodFilter !== 'todos' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
                      color: linkMovementPeriodFilter !== 'todos' ? '#10b981' : 'var(--text-main)',
                      border: linkMovementPeriodFilter !== 'todos' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-color)',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="todos">📅 Período: Todo o Histórico</option>
                    <option value="hoje">📅 Hoje</option>
                    <option value="7dias">📅 Últimos 7 dias</option>
                    <option value="30dias">📅 Últimos 30 dias</option>
                    <option value="mes_atual">📅 Este Mês</option>
                  </select>
                </div>

                {/* Filtro por Plano / Modalidade */}
                {(() => {
                  const uniquePlans = Array.from(new Set(
                    linkMovements.map(m => {
                      const pl = m.infoList?.find((i: any) => i.label?.toLowerCase().includes('plano') || i.label?.toLowerCase().includes('modalidade'));
                      return pl?.value || m.raw?.planoNome || m.raw?.dadosComerciais?.planoId?.nome;
                    }).filter(Boolean)
                  )) as string[];

                  return uniquePlans.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <select
                        className="form-control"
                        value={linkMovementPlanFilter}
                        onChange={e => {
                          setLinkMovementPlanFilter(e.target.value);
                          setPage('movimentos_links', 1);
                        }}
                        style={{
                          fontSize: '0.78rem',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: linkMovementPlanFilter !== 'todos' ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-secondary)',
                          color: linkMovementPlanFilter !== 'todos' ? '#a78bfa' : 'var(--text-main)',
                          border: linkMovementPlanFilter !== 'todos' ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid var(--border-color)',
                          cursor: 'pointer',
                          maxWidth: '200px'
                        }}
                      >
                        <option value="todos">🏋️ Plano: Todos</option>
                        {uniquePlans.map((pn, pidx) => (
                          <option key={pidx} value={pn}>{pn}</option>
                        ))}
                      </select>
                    </div>
                  ) : null;
                })()}

                {/* Botão de Limpar Filtros */}
                {(() => {
                  const hasActiveFilters = 
                    linkMovementTypeFilter !== 'todos' ||
                    linkMovementViewFilter !== 'todos' ||
                    linkMovementStatusFilter !== 'todos' ||
                    linkMovementPeriodFilter !== 'todos' ||
                    linkMovementPlanFilter !== 'todos' ||
                    linkMovementSort !== 'data_desc' ||
                    Boolean(getSearchQuery('movimentos_links'));

                  if (!hasActiveFilters) return null;

                  return (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setLinkMovementTypeFilter('todos');
                        setLinkMovementViewFilter('todos');
                        setLinkMovementStatusFilter('todos');
                        setLinkMovementPeriodFilter('todos');
                        setLinkMovementPlanFilter('todos');
                        setLinkMovementSort('data_desc');
                        setSearchQueryForKey('movimentos_links', '');
                        setPage('movimentos_links', 1);
                      }}
                      style={{
                        fontSize: '0.75rem',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        background: 'rgba(239, 68, 68, 0.1)'
                      }}
                    >
                      <i className="fa-solid fa-filter-circle-xmark"></i>
                      Limpar Filtros
                    </button>
                  );
                })()}

                {/* Badge Contador de Resultados */}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-layer-group" style={{ color: 'var(--color-primary)' }}></i>
                  <span>Exibindo <strong>{filtered.length}</strong> de <strong>{linkMovements.length}</strong> movimentos</span>
                </div>
              </div>
            </div>

            {/* Tabela de Movimentos */}
            <div className="content-panel">
              {loadingLinkMovements ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="spinner"></div>
                  <p style={{ marginTop: '12px', color: 'var(--text-dim)' }}>Carregando movimentos de links...</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '140px' }}>Data / Hora</th>
                        <th style={{ width: '180px' }}>Cliente</th>
                        <th style={{ width: '170px' }}>Link Preenchido</th>
                        <th>Informações Informadas pelo Cliente</th>
                        <th style={{ textAlign: 'center', width: '260px' }}>Ações Rápidas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.length === 0 ? (
                        <tr>
                          <td colSpan={5}>
                            <div className="empty-state-card">
                              <i className="fa-solid fa-satellite-dish empty-state-icon"></i>
                              <div className="empty-state-title">Nenhum movimento encontrado</div>
                              <div className="empty-state-desc">Não foram encontrados preenchimentos de links com os filtros atuais selecionados.</div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginated.map(m => {
                          const clientName = m.cliente?.nome || 'Aluno';
                          const cleanPhone = (m.cliente?.telefone || '').replace(/\D/g, '');
                          const fullPhone = cleanPhone.length <= 11 ? '55' + cleanPhone : cleanPhone;
                          const dateFormatted = (() => {
                            if (!m.createdAt) return '-';
                            const d = new Date(m.createdAt);
                            if (isNaN(d.getTime())) return m.createdAt;
                            return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) + ' ' + d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
                          })();

                          return (
                            <tr key={m._id}>
                              <td data-label="Data / Hora" style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                <i className="fa-regular fa-clock" style={{ marginRight: '5px', color: 'var(--text-muted)' }}></i>
                                <strong>{dateFormatted}</strong>
                              </td>
                              <td data-label="Cliente">
                                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{clientName}</div>
                                {m.cliente?.telefone && (
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                                    <i className="fa-solid fa-phone" style={{ fontSize: '0.7rem', marginRight: '4px' }}></i>
                                    {m.cliente.telefone}
                                  </div>
                                )}
                                {m.cliente?.email && (
                                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                                    {m.cliente.email}
                                  </div>
                                )}
                              </td>
                              <td data-label="Link Preenchido">
                                <span 
                                  style={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '6px', 
                                    padding: '4px 10px', 
                                    borderRadius: '20px', 
                                    fontSize: '0.78rem', 
                                    fontWeight: 700, 
                                    background: `${m.badgeColor}20`, 
                                    color: m.badgeColor, 
                                    border: `1px solid ${m.badgeColor}40` 
                                  }}
                                >
                                  {m.tipo === 'dynamus' && <i className="fa-solid fa-bolt"></i>}
                                  {m.tipo === 'cadastro' && <i className="fa-solid fa-user-plus"></i>}
                                  {m.tipo === 'venda' && <i className="fa-solid fa-credit-card"></i>}
                                  {m.tipo === 'clicksign' && <i className="fa-solid fa-file-signature"></i>}
                                  {m.tipoLabel}
                                </span>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'monospace' }}>
                                  {m.linkUrl}
                                </div>

                                {(m.tipo === 'venda' || m.tipo === 'renovacao') && (
                                  <div style={{ marginTop: '6px' }}>
                                    {m.abertoEm ? (
                                      <span 
                                        style={{ 
                                          display: 'inline-flex', 
                                          alignItems: 'center', 
                                          gap: '5px', 
                                          padding: '3px 8px', 
                                          borderRadius: '6px', 
                                          fontSize: '0.72rem', 
                                          fontWeight: 700, 
                                          background: 'rgba(56, 189, 248, 0.15)', 
                                          color: '#38bdf8', 
                                          border: '1px solid rgba(56, 189, 248, 0.35)' 
                                        }}
                                        title={`Link aberto pela última vez em ${new Date(m.abertoEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`}
                                      >
                                        <i className="fa-solid fa-eye"></i> Aberto {new Date(m.abertoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} às {new Date(m.abertoEm).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    ) : (
                                      <span 
                                        style={{ 
                                          display: 'inline-flex', 
                                          alignItems: 'center', 
                                          gap: '5px', 
                                          padding: '3px 8px', 
                                          borderRadius: '6px', 
                                          fontSize: '0.72rem', 
                                          fontWeight: 600, 
                                          background: 'rgba(148, 163, 184, 0.1)', 
                                          color: '#94a3b8', 
                                          border: '1px solid rgba(148, 163, 184, 0.2)' 
                                        }}
                                      >
                                        <i className="fa-regular fa-eye-slash"></i> Não visualizado
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td data-label="Informações Preenchidas">
                                {m.infoList && m.infoList.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    {m.infoList.map((info: any, idx: number) => (
                                      <div key={idx} style={{ fontSize: '0.8rem', lineHeight: '1.3' }}>
                                        <strong style={{ color: 'var(--text-secondary)' }}>• {info.label}:</strong>{' '}
                                        <span style={{ color: 'var(--text-main)' }}>{info.value}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dados básicos de cadastro</span>
                                )}
                              </td>
                              <td data-label="Ações Rápidas" style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                  {cleanPhone && (
                                    <a
                                      href={`https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(`Olá, ${clientName}! Recebemos a sua solicitação no Clube Fitness Fisio. Como podemos te ajudar?`)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="btn btn-success btn-sm"
                                      style={{ padding: '4px 8px', fontSize: '0.75rem', fontWeight: 600 }}
                                      title="Chamar no WhatsApp"
                                    >
                                      <i className="fa-brands fa-whatsapp"></i> WhatsApp
                                    </a>
                                  )}

                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                    onClick={() => {
                                      setSearchQueryForKey('gestao_contratos', clientName);
                                      setActiveTab('gestao_contratos');
                                    }}
                                    title="Ir para Gestão de Contratos deste aluno"
                                  >
                                    <i className="fa-solid fa-file-contract"></i> Contratos
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                    onClick={() => {
                                      setSearchQueryForKey('clientes', clientName);
                                      setActiveTab('clientes');
                                    }}
                                    title="Ver cadastro completo em Clientes"
                                  >
                                    <i className="fa-solid fa-user"></i> Ver Aluno
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                    onClick={() => setSelectedLinkMovementDetails(m)}
                                    title="Ver todas as informações brutas"
                                  >
                                    <i className="fa-solid fa-eye"></i> Detalhes
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Paginação Sincronizada */}
              {filtered.length > 0 && (
                <Pagination
                  currentPage={getPage('movimentos_links')}
                  totalItems={filtered.length}
                  itemsPerPage={getPageSize('movimentos_links')}
                  onPageChange={page => setPage('movimentos_links', page)}
                />
              )}
            </div>

          {/* Modal de Detalhes Brutos do Movimento */}
          {selectedLinkMovementDetails && (
            <div className="modal-backdrop" onClick={() => setSelectedLinkMovementDetails(null)}>
              <div className="modal-container" style={{ maxWidth: '650px' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-satellite-dish" style={{ color: '#10b981' }}></i>
                    Detalhes do Movimento de Link
                  </h3>
                  <button type="button" className="btn-close" onClick={() => setSelectedLinkMovementDetails(null)}>&times;</button>
                </div>
                <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                  <div style={{ background: 'var(--bg-card, #1e293b)', padding: '14px', borderRadius: '8px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{selectedLinkMovementDetails.cliente?.nome}</div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {selectedLinkMovementDetails.tipoLabel} • {selectedLinkMovementDetails.linkUrl}
                    </div>
                  </div>

                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>Informações Enviadas:</h4>
                  <table className="data-table" style={{ width: '100%', marginBottom: '16px' }}>
                    <tbody>
                      {selectedLinkMovementDetails.infoList?.map((info: any, idx: number) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600, width: '40%' }}>{info.label}</td>
                          <td>{info.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>Dados Brutos (JSON):</h4>
                  <pre style={{ background: '#0f172a', color: '#38bdf8', padding: '12px', borderRadius: '6px', fontSize: '0.75rem', overflowX: 'auto', maxHeight: '200px' }}>
                    {JSON.stringify(selectedLinkMovementDetails.raw, null, 2)}
                  </pre>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedLinkMovementDetails(null)}>Fechar</button>
                </div>
              </div>
            </div>
          )}
        </>
      );
    })()}

      {/* 8. View: Testes de Força */}
      {activeTab === 'testes_forca' && (() => {
        const listKey = 'testes_forca';
        const q = getSearchQuery(listKey);
        const filtered = strengthTests.filter(st => {
          const clientName = st.clienteId?.dadosPessoais?.nome || '';
          const profName = st.profissionalId?.nome || '';
          const data = st.data || '';
          const obs = st.observacoes || '';
          return smartSearchMatch([clientName, profName, data, obs], q);
        });
        const activeP = getPage(listKey);
        const size = getPageSize(listKey);
        const totalPages = Math.ceil(filtered.length / size);
        const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
        const paginated = filtered.slice((curP - 1) * size, curP * size);

        return (
          <>
            <div className="view-header">
              <div className="view-title-group">
                <h1>Avaliações de Força</h1>
                <p>Consulte os testes de força muscular realizados pela equipe clínica.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <SmartSearchInput
                  value={q}
                  onChange={val => setSearchQueryForKey('testes_forca', val)}
                  placeholder="Buscar por aluno, data, avaliador..."
                  resultCount={filtered.length}
                  totalCount={strengthTests.length}
                />
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
                    {paginated.map(st => {
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
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={7}>
                          <div className="empty-state-card">
                            <i className="fa-solid fa-dumbbell empty-state-icon"></i>
                            <div className="empty-state-title">Nenhum teste de força</div>
                            <div className="empty-state-desc">Nenhum teste de força muscular encontrado com os filtros atuais.</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filtered.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <Pagination
                    currentPage={curP}
                    totalItems={filtered.length}
                    itemsPerPage={size}
                    onPageChange={page => setPage('testes_forca', page)}
                  />
                </div>
              )}
            </div>
          </>
        );
      })()}

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
              onClick={() => setFinTab('balanco')}
              style={{
                padding: '10px 20px',
                fontWeight: 700,
                fontSize: '0.9rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: finTab === 'balanco' ? '#10b981' : 'var(--text-dim)',
                borderBottom: finTab === 'balanco' ? '3px solid #10b981' : '3px solid transparent',
                marginBottom: '-2px'
              }}
            >
              <i className="fa-solid fa-scale-balanced" style={{ marginRight: '6px' }}></i>Balanço & DRE Geral
            </button>
            <button
              onClick={() => setFinTab('mensalidades')}
              style={{
                padding: '10px 20px',
                fontWeight: 700,
                fontSize: '0.9rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: finTab === 'mensalidades' ? 'var(--color-primary)' : 'var(--text-dim)',
                borderBottom: finTab === 'mensalidades' ? '3px solid var(--color-primary)' : '3px solid transparent',
                marginBottom: '-2px'
              }}
            >
              <i className="fa-solid fa-receipt" style={{ marginRight: '6px' }}></i>Mensalidades (A Receber)
            </button>
            <button
              onClick={() => setFinTab('contas_pagar')}
              style={{
                padding: '10px 20px',
                fontWeight: 700,
                fontSize: '0.9rem',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: finTab === 'contas_pagar' ? '#f59e0b' : 'var(--text-dim)',
                borderBottom: finTab === 'contas_pagar' ? '3px solid #f59e0b' : '3px solid transparent',
                marginBottom: '-2px'
              }}
            >
              <i className="fa-solid fa-file-invoice-dollar" style={{ marginRight: '6px' }}></i>Contas a Pagar
            </button>
          </div>

          {/* TAB 0: BALANÇO & DRE */}
          {finTab === 'balanco' && (
            <FinanceiroBalancoPanel
              clients={clients}
              financials={financials}
              payments={payments}
              selectedMonth={finSelectedMonth}
              setSelectedMonth={setFinSelectedMonth}
              onNavigateTab={(t: string) => setFinTab(t as any)}
            />
          )}

          {/* TAB 1: MENSALIDADES */}
          {finTab === 'mensalidades' && (
            <>
              {/* Stats Cards */}
              {(() => {
                const todayStr = new Date().toISOString().split('T')[0];
                const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM
                
                const currentGrouped = getGroupedPayments();
                const filteredPaymentsList = currentGrouped.flatMap(g => g.payments);

                const totalPaidThisMonth = filteredPaymentsList
                  .filter(p => p.status === 'Pago' && p.vencimento.startsWith(currentMonthStr))
                  .reduce((sum, p) => sum + p.valor, 0);

                const totalPendingThisMonth = filteredPaymentsList
                  .filter(p => p.status === 'Pendente' && p.vencimento >= todayStr && p.vencimento.startsWith(currentMonthStr))
                  .reduce((sum, p) => sum + p.valor, 0);

                const totalOverdue = filteredPaymentsList
                  .filter(p => p.status === 'Pendente' && p.vencimento < todayStr)
                  .reduce((sum, p) => sum + p.valor, 0);

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--color-primary)', fontWeight: 600 }}>Total Recebido (Mês)</span>
                      <strong style={{ fontSize: '1.6rem', color: '#10b981' }}>R$ {formatCurrencyBRL(totalPaidThisMonth)}</strong>
                    </div>
                    <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600 }}>Total Pendente (Mês)</span>
                      <strong style={{ fontSize: '1.6rem', color: '#f59e0b' }}>R$ {formatCurrencyBRL(totalPendingThisMonth)}</strong>
                    </div>
                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600 }}>Total em Atraso</span>
                      <strong style={{ fontSize: '1.6rem', color: '#ef4444' }}>R$ {formatCurrencyBRL(totalOverdue)}</strong>
                    </div>
                  </div>
                );
              })()}

              {/* Pílulas de Status Rápidas (Funil Financeiro) */}
              {(() => {
                const todayStr = new Date().toISOString().split('T')[0];
                const allGroupedRaw: any[] = [];
                const tempGrouped: Record<string, any> = {};
                payments.forEach(p => {
                  if (!tempGrouped[p.clientId]) {
                    tempGrouped[p.clientId] = { clientId: p.clientId, payments: [] };
                  }
                  tempGrouped[p.clientId].payments.push(p);
                });
                let countPago = 0;
                let countPendente = 0;
                let countAtrasado = 0;
                Object.values(tempGrouped).forEach((g: any) => {
                  const hasOverdue = g.payments.some((p: any) => p.status === 'Pendente' && p.vencimento < todayStr);
                  const hasPending = g.payments.some((p: any) => p.status === 'Pendente');
                  if (hasOverdue) countAtrasado++;
                  else if (hasPending) countPendente++;
                  else countPago++;
                });

                return (
                  <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setPaymentsStatusFilter('')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: paymentsStatusFilter === '' ? 'var(--color-primary)' : 'var(--border-color)',
                        background: paymentsStatusFilter === '' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                        color: paymentsStatusFilter === '' ? 'var(--color-primary)' : 'var(--text-muted)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      🌐 Todos ({Object.keys(tempGrouped).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentsStatusFilter('Pago')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: paymentsStatusFilter === 'Pago' ? '#10b981' : 'var(--border-color)',
                        background: paymentsStatusFilter === 'Pago' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                        color: paymentsStatusFilter === 'Pago' ? '#34d399' : 'var(--text-muted)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      🟢 Pagos / Recebidos ({countPago})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentsStatusFilter('Pendente')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: paymentsStatusFilter === 'Pendente' ? '#f59e0b' : 'var(--border-color)',
                        background: paymentsStatusFilter === 'Pendente' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.03)',
                        color: paymentsStatusFilter === 'Pendente' ? '#fbbf24' : 'var(--text-muted)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      🟡 Pendentes em Dia ({countPendente})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentsStatusFilter('Atrasado')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: paymentsStatusFilter === 'Atrasado' ? '#ef4444' : 'var(--border-color)',
                        background: paymentsStatusFilter === 'Atrasado' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.03)',
                        color: paymentsStatusFilter === 'Atrasado' ? '#f87171' : 'var(--text-muted)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      🔴 Em Atraso ({countAtrasado})
                    </button>
                  </div>
                );
              })()}

              {/* Barra de Ferramentas com Filtros Inteligentes Combinados */}
              <div className="content-panel" style={{ padding: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* Busca Multi-Termos Fluida */}
                  <div style={{ flex: '1 1 260px', minWidth: '240px', position: 'relative' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', color: 'var(--text-dim)', fontSize: '0.9rem' }}></i>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Buscar por aluno, CPF, valor (R$), plano ou forma de pagamento..."
                        value={paymentsSearch}
                        onChange={e => setPaymentsSearch(e.target.value)}
                        style={{ paddingLeft: '36px', paddingRight: paymentsSearch ? '32px' : '12px', height: '40px', fontSize: '0.86rem', width: '100%' }}
                      />
                      {paymentsSearch && (
                        <button
                          type="button"
                          onClick={() => setPaymentsSearch('')}
                          style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.9rem' }}
                          title="Limpar busca"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filtro por Mês / Competência */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      <i className="fa-solid fa-calendar-days" style={{ color: 'var(--color-primary)', marginRight: '4px' }}></i> Período:
                    </label>
                    <select
                      className="select-custom"
                      value={paymentsMonthFilter}
                      onChange={e => setPaymentsMonthFilter(e.target.value)}
                      style={{ minWidth: '150px', height: '40px', fontSize: '0.83rem', padding: '6px 10px' }}
                    >
                      <option value="">📅 Todos os Períodos</option>
                      <option value="mes_atual">📅 Mês Atual</option>
                      <option value="proximo_mes">📅 Próximo Mês</option>
                      <option value="mes_anterior">📅 Mês Anterior</option>
                      <option value="ano_atual">📅 Ano Atual (2026)</option>
                    </select>
                  </div>

                  {/* Filtro por Forma de Pagamento */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      <i className="fa-solid fa-credit-card" style={{ color: '#38bdf8', marginRight: '4px' }}></i> Pagamento:
                    </label>
                    <select
                      className="select-custom"
                      value={paymentsMethodFilter}
                      onChange={e => setPaymentsMethodFilter(e.target.value)}
                      style={{ minWidth: '150px', height: '40px', fontSize: '0.83rem', padding: '6px 10px' }}
                    >
                      <option value="">💳 Todas as Formas</option>
                      <option value="pix">⚡ Pix</option>
                      <option value="boleto">📄 Boleto Bancário</option>
                      <option value="cartao">💳 Cartão de Crédito</option>
                      <option value="dinheiro">💵 Dinheiro</option>
                    </select>
                  </div>

                  {/* Filtro por Plano / Convênio */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      <i className="fa-solid fa-layer-group" style={{ color: 'var(--color-primary)', marginRight: '4px' }}></i> Plano:
                    </label>
                    <select
                      className="select-custom"
                      value={paymentsPlanFilter}
                      onChange={e => setPaymentsPlanFilter(e.target.value)}
                      style={{ minWidth: '160px', height: '40px', fontSize: '0.83rem', padding: '6px 10px' }}
                    >
                      <option value="">📁 Todos os Planos</option>
                      <option value="Dynamus">⚡ Convênio Dynamus</option>
                      <option value="Personalizado">Personalizado</option>
                      {Array.from(new Set(payments.map(p => {
                        const client = clients.find(c => c._id === p.clientId);
                        return client?.dadosComerciais?.planoId?.nome || 'Personalizado';
                      }))).filter(name => name && name !== 'Personalizado' && !name.toLowerCase().includes('dynamus')).sort().map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Ordenação */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      <i className="fa-solid fa-arrow-down-a-z" style={{ color: 'var(--color-primary)', marginRight: '4px' }}></i> Ordenar:
                    </label>
                    <select
                      className="select-custom"
                      value={paymentsSortOption}
                      onChange={e => setPaymentsSortOption(e.target.value)}
                      style={{ minWidth: '160px', height: '40px', fontSize: '0.83rem', padding: '6px 10px' }}
                    >
                      <option value="vencimento_asc">⏳ Vencimento (Próximos)</option>
                      <option value="vencimento_desc">📅 Vencimento (Distantes)</option>
                      <option value="valor_desc">💰 Maior Valor</option>
                      <option value="valor_asc">💵 Menor Valor</option>
                      <option value="nome_asc">🔤 Aluno (A - Z)</option>
                      <option value="nome_desc">🔤 Aluno (Z - A)</option>
                    </select>
                  </div>

                  <button className="btn btn-secondary" onClick={handleGlobalSync} disabled={loadingPayments} style={{ height: '40px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-arrows-rotate"></i> Atualizar
                  </button>
                </div>

                {/* Feedback de Contagem e Total Filtrado com Botão Limpar */}
                {(() => {
                  const currentGrouped = getGroupedPayments();
                  const totalFiltrado = currentGrouped.reduce((sum: number, g: any) => sum + g.totalValue, 0);
                  const isFiltered = Boolean(paymentsSearch || paymentsStatusFilter || paymentsPlanFilter || paymentsMonthFilter || paymentsMethodFilter || paymentsTypeFilter || paymentsSortOption !== 'vencimento_asc');

                  return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      <div>
                        Exibindo <strong>{currentGrouped.length}</strong> alunos / contratos • Total Consolidado Filtrado: <strong style={{ color: 'var(--color-primary)', fontSize: '0.95rem' }}>R$ {formatCurrencyBRL(totalFiltrado)}</strong>
                      </div>
                      {isFiltered && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setPaymentsSearch('');
                            setPaymentsStatusFilter('');
                            setPaymentsPlanFilter('');
                            setPaymentsMonthFilter('');
                            setPaymentsMethodFilter('');
                            setPaymentsTypeFilter('');
                            setPaymentsSortOption('vencimento_asc');
                          }}
                          style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <i className="fa-solid fa-xmark"></i> Limpar Filtros
                        </button>
                      )}
                    </div>
                  );
                })()}
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
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 12px 0', flexWrap: 'wrap', gap: '8px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h4 style={{ margin: 0, fontSize: '0.88rem', textTransform: 'uppercase', color: 'var(--color-primary)', fontWeight: 600 }}>Extrato de Parcelas</h4>
                                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>({group.paidCount} de {group.totalCount} pagas)</span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {group.payments.some((p: any) => p.status !== 'Pago') && (
                                          <button
                                            className="btn btn-sm"
                                            style={{
                                              fontSize: '0.75rem',
                                              padding: '4px 10px',
                                              background: 'rgba(16, 185, 129, 0.12)',
                                              border: '1px solid rgba(16, 185, 129, 0.35)',
                                              color: '#10b981',
                                              fontWeight: 700,
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '6px',
                                              borderRadius: '6px',
                                              cursor: 'pointer'
                                            }}
                                            title="Quitar todas as parcelas pendentes com a respectiva data de vencimento de cada uma"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleConfirmAllCardPayments(group.clientId, group.clientNome, group.payments.filter((p: any) => p.status !== 'Pago').length);
                                            }}
                                          >
                                            <i className="fa-solid fa-credit-card"></i>
                                            Baixar Todas no Cartão (Datas de Vencimento)
                                          </button>
                                        )}
                                        <button
                                          className="btn btn-sm"
                                          style={{
                                            fontSize: '0.75rem',
                                            padding: '4px 10px',
                                            background: 'rgba(56, 189, 248, 0.12)',
                                            border: '1px solid rgba(56, 189, 248, 0.35)',
                                            color: '#38bdf8',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            borderRadius: '6px',
                                            cursor: 'pointer'
                                          }}
                                          title="Consultar status de todos os boletos deste aluno diretamente na API do Asaas"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                              setLoadingPayments(true);
                                              const res = await fetch('/api/admin/payments', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ action: 'sync_client_asaas', clientId: group.clientId })
                                              });
                                              const d = await res.json();
                                              if (d.success) {
                                                alert('Sincronização com o Asaas concluída com sucesso!');
                                                await fetchPayments();
                                                fetchData();
                                              } else {
                                                alert('Aviso: ' + (d.error || 'Nenhuma atualização pendente no Asaas.'));
                                              }
                                            } catch (err: any) {
                                              alert('Erro ao sincronizar: ' + err.message);
                                            } finally {
                                              setLoadingPayments(false);
                                            }
                                          }}
                                        >
                                          <i className="fa-solid fa-rotate"></i>
                                          Sincronizar Asaas
                                        </button>
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
                                              <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                  <span>{p.vencimento ? p.vencimento.split('-').reverse().join('/') : '—'}</span>
                                                  {p.status !== 'Pago' && (
                                                    <button
                                                      className="btn btn-sm"
                                                      style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: 'var(--text-dim)',
                                                        cursor: 'pointer',
                                                        padding: '2px 4px',
                                                        fontSize: '0.72rem'
                                                      }}
                                                      title="Alterar Data de Vencimento desta Parcela"
                                                      onClick={async (e) => {
                                                        e.stopPropagation();
                                                        const novaData = prompt(`Alterar vencimento da parcela ${p.parcelaNumero}/${p.parcelasTotal} (${p.clientNome}):\nInforme a data no formato AAAA-MM-DD:`, p.vencimento);
                                                        if (novaData && /^\d{4}-\d{2}-\d{2}$/.test(novaData.trim())) {
                                                          try {
                                                            const res = await fetch('/api/admin/payments', {
                                                              method: 'POST',
                                                              headers: { 'Content-Type': 'application/json' },
                                                              body: JSON.stringify({ action: 'update_due_date', paymentId: p._id, newDueDate: novaData.trim() })
                                                            });
                                                            const json = await res.json();
                                                            if (json.success) {
                                                              alert('Data de vencimento atualizada com sucesso!');
                                                              fetchPayments();
                                                            } else {
                                                              alert('Erro: ' + (json.error || 'Falha ao atualizar data'));
                                                            }
                                                          } catch (err: any) {
                                                            alert('Erro de conexão: ' + err.message);
                                                          }
                                                        }
                                                      }}
                                                    >
                                                      <i className="fa-solid fa-pen-to-square"></i>
                                                    </button>
                                                  )}
                                                </div>
                                              </td>
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
                                                  {p.status !== 'Pago' && (
                                                    <button
                                                      className="btn btn-primary btn-sm"
                                                      style={{ padding: '2px 8px', fontSize: '0.68rem' }}
                                                      title="Confirmar Recebimento / Dar Baixa"
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
                                                  {p.status === 'Pago' && (
                                                    <span style={{ fontSize: '0.72rem', color: '#10b981' }}><i className="fa-solid fa-circle-check"></i> Recebido</span>
                                                  )}
                                                  {p.asaasInvoiceUrl && (
                                                    <a
                                                      href={p.asaasInvoiceUrl}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="btn btn-secondary btn-sm"
                                                      style={{ padding: '2px 6px', fontSize: '0.68rem', color: '#38bdf8', borderColor: 'rgba(56,189,248,0.3)' }}
                                                      title="Abrir fatura / boleto no Asaas"
                                                    >
                                                      <i className="fa-solid fa-arrow-up-right-from-square"></i>
                                                    </a>
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
            <ContasPagarPanel
              financials={financials}
              fetchData={fetchData}
              selectedMonth={finSelectedMonth}
              setSelectedMonth={setFinSelectedMonth}
              onNavigateTab={(t: string) => setFinTab(t as any)}
            />
          )}


        </>
      )}

      {/* 10. View: Medicamentos */}
      {activeTab === 'medicamentos' && (() => {
        const listKey = 'medicamentos';
        const q = getSearchQuery(listKey);
        const filtered = medications.filter(m => smartSearchMatch([m.nome, m.categoria, m.lote], q));
        const activeP = getPage(listKey);
        const size = getPageSize(listKey);
        const totalPages = Math.ceil(filtered.length / size);
        const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
        const paginated = filtered.slice((curP - 1) * size, curP * size);

        return (
          <>
            <div className="view-header">
              <div className="view-title-group">
                <h1>Farmácia Clínica</h1>
                <p>Controle de estoque, lotes e validade de medicamentos de uso clínico.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <SmartSearchInput
                  value={q}
                  onChange={val => setSearchQueryForKey('medicamentos', val)}
                  placeholder="Buscar medicamento ou lote..."
                  resultCount={filtered.length}
                  totalCount={medications.length}
                />
                <button className="btn btn-primary" onClick={() => handleOpenMedicationModal()}>
                  <i className="fa-solid fa-plus"></i> Novo Medicamento
                </button>
              </div>
            </div>

            <div className="content-panel">
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
                    {paginated.map(m => {
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
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          <div className="empty-state-card">
                            <i className="fa-solid fa-prescription-bottle-medical empty-state-icon"></i>
                            <div className="empty-state-title">Nenhum medicamento encontrado</div>
                            <div className="empty-state-desc">Não há registros de medicamentos correspondentes à busca.</div>
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
              {filtered.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <Pagination
                    currentPage={curP}
                    totalItems={filtered.length}
                    itemsPerPage={size}
                    onPageChange={page => setPage('medicamentos', page)}
                  />
                </div>
              )}
            </div>
          </>
        );
      })()}

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
            {exerciseRequests.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Total pendente: <strong style={{ color: 'var(--color-primary)' }}>{exerciseRequests.length}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Barra de Ações em Lote */}
          {selectedExerciseRequests.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '12px 18px',
              borderRadius: '10px',
              marginBottom: '16px',
              gap: '12px',
              flexWrap: 'wrap',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  background: 'var(--color-primary)',
                  color: '#000',
                  fontWeight: 800,
                  borderRadius: '50%',
                  width: '26px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem'
                }}>
                  {selectedExerciseRequests.length}
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                  {selectedExerciseRequests.length === 1 ? 'exercício selecionado' : 'exercícios selecionados'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-sm"
                  style={{
                    backgroundColor: 'var(--color-success)',
                    color: '#fff',
                    padding: '8px 16px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                  onClick={handleBulkApproveExercises}
                  disabled={isProcessingBulkEx}
                >
                  <i className="fa-solid fa-check-double"></i>
                  {isProcessingBulkEx ? 'Processando...' : `Aprovar Selecionados (${selectedExerciseRequests.length})`}
                </button>
                <button
                  className="btn btn-sm"
                  style={{
                    backgroundColor: 'var(--color-danger)',
                    color: '#fff',
                    padding: '8px 16px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                  onClick={handleBulkRejectExercises}
                  disabled={isProcessingBulkEx}
                >
                  <i className="fa-solid fa-trash"></i>
                  Rejeitar Selecionados
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  style={{ padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}
                  onClick={() => setSelectedExerciseRequests([])}
                  disabled={isProcessingBulkEx}
                >
                  Desmarcar Todos
                </button>
              </div>
            </div>
          )}

          <div className="content-panel">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '45px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                        checked={exerciseRequests.length > 0 && selectedExerciseRequests.length === exerciseRequests.length}
                        onChange={toggleSelectAllExerciseRequests}
                        title={selectedExerciseRequests.length === exerciseRequests.length ? 'Desmarcar todos' : 'Selecionar todos'}
                      />
                    </th>
                    <th>Nome</th>
                    <th>Grupo Muscular</th>
                    <th>Equipamento</th>
                    <th>Mídia / GIF</th>
                    <th>Instruções</th>
                    <th>Solicitado Por</th>
                    <th style={{ textAlign: 'center', width: '280px' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {exerciseRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px' }}>
                        Nenhuma solicitação de exercício pendente.
                      </td>
                    </tr>
                  ) : (
                    exerciseRequests.map((ex: any) => {
                      const isSelected = selectedExerciseRequests.includes(ex._id);
                      return (
                        <tr
                          key={ex._id}
                          style={isSelected ? { background: 'rgba(16, 185, 129, 0.07)' } : {}}
                        >
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              style={{ width: '17px', height: '17px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                              checked={isSelected}
                              onChange={() => toggleSelectExerciseRequest(ex._id)}
                            />
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{ex.nome}</td>
                          <td>{ex.grupo}</td>
                          <td>{ex.equipamento}</td>
                          <td>
                            {ex.gifUrl ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                color: '#10b981',
                                background: 'rgba(16, 185, 129, 0.12)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontWeight: 700
                              }}>
                                <i className="fa-solid fa-photo-film"></i> GIF / Vídeo
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Sem mídia</span>
                            )}
                          </td>
                          <td style={{ maxWidth: '220px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }} title={ex.instrucoes}>
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ======================== GESTÃO DE CONTRATOS TAB ======================== */}
      {activeTab === 'gestao_contratos' && (
        <GestaoContratosPanel
          clients={clients}
          plans={plans}
          userCargo="Administrador"
          fetchData={fetchData}
          onNavigateTab={(tab, query) => {
            setActiveTab(tab);
            if (tab === 'financeiro') {
              setFinTab('mensalidades');
              if (query) setPaymentsSearch(query);
            }
          }}
        />
      )}

      {/* ======================== ASAAS MANAGEMENT TAB ======================== */}
      {activeTab === 'asaas' && (
        <AsaasPanel />
      )}

      {/* ======================== DYNAMUS MANAGEMENT TAB ======================== */}
      {activeTab === 'dynamus' && (
        <DynamusPanel clients={clients} plans={plans} userCargo="Administrador" fetchData={fetchData} />
      )}

      {/* ======================== AGENDA COMPLETA TAB ======================== */}
      {activeTab === 'agenda_completa' && (
        <AgendaCompletaPanel 
          clients={clients} 
          professionals={professionals} 
          userRole="admin" 
        />
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

      {!['dashboard', 'profissionais', 'clientes', 'usuarios', 'controle_creditos', 'planos', 'agenda_completa', 'agenda_fixa', 'testes_forca', 'financeiro', 'medicamentos', 'tv_panel', 'solicitacoes_exercicios', 'configuracoes', 'gestao_contratos', 'asaas', 'trancamentos_admin', 'config_agenda', 'log_atividades', 'dados_clinicos', 'vincular_alunos', 'treinos_prof', 'fichas_treino', 'dynamus', 'movimentos_links'].includes(activeTab) && (
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
                {modalType === 'client' && (() => {
                  const isClientLocked = editingItem ? (editingItem.bloqueioCadastral?.bloqueado !== false) : false;
                  const lockMotivo = editingItem?.bloqueioCadastral?.motivo || (editingItem?.dadosPessoais?.cpf ? 'Informação fornecida pelo contratante' : 'Dado consolidado no cadastro');

                  return (
                    <>
                      {/* Shield Banner */}
                      {isClientLocked && (
                        <div style={{
                          background: 'rgba(16, 185, 129, 0.08)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          marginBottom: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontSize: '0.82rem', fontWeight: 700 }}>
                            <i className="fa-solid fa-shield-halved" style={{ fontSize: '1rem' }}></i>
                            <span>{lockMotivo} (Dados Blindados)</span>
                          </div>
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
                        </div>
                      )}

                      <div className="form-group">
                        <label>Nome Completo {isClientLocked && <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 600 }}>[Blindado]</span>}</label>
                        <input type="text" className="form-control" value={nome} onChange={e => setNome(e.target.value)} disabled={isClientLocked} required />
                      </div>
                      <div className="form-group">
                        <label>E-mail de Acesso (Google) {isClientLocked && <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 600 }}>[Blindado]</span>}</label>
                        <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} disabled={isClientLocked} required />
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>CPF {isClientLocked && <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 600 }}>[Blindado]</span>}</label>
                          <input type="text" className="form-control" value={cpf} onChange={e => setCpf(e.target.value)} disabled={isClientLocked} />
                        </div>
                        <div className="form-group">
                          <label>Telefone {isClientLocked && <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 600 }}>[Blindado]</span>}</label>
                          <input type="text" className="form-control" value={telefone} onChange={e => setTelefone(e.target.value)} disabled={isClientLocked} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Plano</label>
                        <select className="select-custom" value={plano} onChange={e => setPlano(e.target.value)}>
                          {(plans.length > 0 ? plans : plansList).map((p: any) => (
                            <option key={p._id || p.id} value={p._id || p.id}>{p.nome}</option>
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
                );
              })()}

                {modalType === 'professional' && (
                  <>
                    <div className="form-group">
                      <label>Nome Completo</label>
                      <input type="text" className="form-control" value={nome} onChange={e => setNome(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label>E-mail de Acesso (Google)</label>
                      <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Especialidade</label>
                        <input type="text" className="form-control" value={especialidade} onChange={e => setEspecialidade(e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label>Registro Profissional (Ex: CREFITO)</label>
                        <input type="text" className="form-control" value={registro} onChange={e => setRegistro(e.target.value)} placeholder="Ex: CREFITO ou -" required />
                      </div>
                    </div>

                    <div className="form-group" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '8px', padding: '12px 14px', marginTop: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>
                        <input
                          type="checkbox"
                          checked={isEstagiario}
                          onChange={e => setIsEstagiario(e.target.checked)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                        />
                        <span>Profissional é Estagiário</span>
                      </label>
                      <small style={{ display: 'block', marginTop: '4px', color: 'var(--text-muted)', fontSize: '0.75rem', paddingLeft: '28px' }}>
                        Identifica o profissional como estagiário na equipe e definirá o modelo de assinatura/responsabilidade técnica nos laudos de avaliação.
                      </small>
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
                      <input type="number" className="form-control" value={creditAmount} onFocus={selectOnFocus} onChange={e => setCreditAmount(parseInt(e.target.value.replace(/^0+(?=\d)/, '') || '0', 10))} min={1} required />
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
                      <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required />
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
                        <MoneyInput
                          value={finValor}
                          onChange={setFinValor}
                          placeholder="R$ 0,00"
                          required
                        />
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
                          <option value="BRAÇO">Braço</option>
                          <option value="CORE">Core</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Equipamento</label>
                        <input type="text" className="form-control" value={exEquip} onChange={e => setExEquip(e.target.value)} placeholder="Ex: Halteres, Barra, Máquina..." required />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Demonstração Visual (URL do GIF ou Vídeo MP4 em Loop)</label>
                      <input
                        type="url"
                        className="form-control"
                        value={exGifUrl}
                        onChange={e => setExGifUrl(e.target.value)}
                        placeholder="https://exemplo.com/demonstracao.gif ou .mp4"
                      />
                      {exGifUrl && (
                        <div style={{
                          marginTop: '10px',
                          padding: '10px',
                          background: 'rgba(0, 0, 0, 0.3)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          textAlign: 'center'
                        }}>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                            <i className="fa-solid fa-eye" style={{ marginRight: '4px' }}></i> Pré-visualização da Demonstração:
                          </span>
                          {exGifUrl.match(/\.(mp4|webm)($|\?)/i) ? (
                            <video
                              src={exGifUrl}
                              autoPlay
                              loop
                              muted
                              playsInline
                              style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '6px' }}
                            />
                          ) : (
                            <img
                              src={exGifUrl}
                              alt="Pré-visualização"
                              style={{ maxHeight: '200px', maxWidth: '100%', borderRadius: '6px', objectFit: 'contain' }}
                            />
                          )}
                          <div style={{ marginTop: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                              onClick={() => setExGifUrl('')}
                            >
                              <i className="fa-solid fa-trash"></i> Remover GIF
                            </button>
                          </div>
                        </div>
                      )}
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

       {/* Modal de Novo Horário Fixo */}
        {showFixedSchedModal && (
          <div className="modal-overlay" style={{ display: 'flex', zIndex: 100000, padding: '16px', overflowY: 'auto' }} onClick={() => setShowFixedSchedModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '95%', maxHeight: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="modal-header" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', color: '#fff', flexShrink: 0 }}>
                <h3><i className="fa-solid fa-thumbtack" style={{ marginRight: '8px' }}></i>Novo Horário Fixo</h3>
                <button className="modal-close" style={{ color: '#fff' }} onClick={() => setShowFixedSchedModal(false)}>&times;</button>
              </div>
              <form onSubmit={handleCreateFixedSchedule} style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, overflow: 'hidden', margin: 0 }}>
                <div className="modal-body" style={{ padding: '20px', overflowY: 'auto', flex: '1 1 auto', minHeight: 0 }}>
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

                  {/* Seleção de Agenda / Profissional (Exclusivamente as 3 Agendas Oficiais) */}
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                      Agenda / Profissional Responsável
                    </label>
                    <select
                      className="select-custom"
                      value={fsProfessional}
                      onChange={e => {
                        const pId = e.target.value;
                        setFsProfessional(pId);
                        const pObj = professionals.find(p => p._id === pId);
                        if (pObj) {
                          const pName = (pObj.nome || '').toLowerCase();
                          if (pName.includes('albert') || pName.includes('guilherme') || (pObj.especialidade || '').toLowerCase().includes('fisio')) {
                            setFsService('Avaliação Fisioterápica');
                          }
                        } else {
                          setFsService('Treino Monitorado');
                        }
                      }}
                    >
                      <option value="">🏋️ Treino Monitorado / Geral (Academia)</option>
                      {professionals
                        .filter(p => {
                          const name = (p.nome || '').toLowerCase();
                          return name.includes('guilherme') || name.includes('albert');
                        })
                        .map(p => (
                          <option key={p._id} value={p._id}>
                            🩺 {p.nome} {p.especialidade ? `(${p.especialidade})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Seleção de Múltiplos Dias da Semana */}
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                      Dias da Semana Fixados
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {[
                        { day: 1, label: 'Segunda-feira' },
                        { day: 2, label: 'Terça-feira' },
                        { day: 3, label: 'Quarta-feira' },
                        { day: 4, label: 'Quinta-feira' },
                        { day: 5, label: 'Sexta-feira' },
                        { day: 6, label: 'Sábado' }
                      ].map(({ day, label }) => {
                        const isSelected = fsSelectedDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setFsSelectedDays(fsSelectedDays.filter(d => d !== day));
                              } else {
                                setFsSelectedDays([...fsSelectedDays, day].sort());
                              }
                            }}
                            style={{
                              padding: '8px 4px',
                              borderRadius: '8px',
                              border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                              background: isSelected ? 'rgba(0, 184, 148, 0.15)' : 'var(--bg-darker)',
                              color: isSelected ? 'var(--color-primary)' : 'var(--text-muted)',
                              fontWeight: isSelected ? 700 : 500,
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <i className={isSelected ? "fa-solid fa-square-check" : "fa-regular fa-square"}></i>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Serviço e Data de Início */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Serviço</label>
                      <select
                        className="select-custom"
                        value={fsService}
                        onChange={e => setFsService(e.target.value)}
                      >
                        {fsProfessional ? (
                          <>
                            <option value="Avaliação Fisioterápica">Avaliação Fisioterápica</option>
                            <option value="Sessão de Fisioterapia">Sessão de Fisioterapia</option>
                            <option value="Quiropraxia">Quiropraxia</option>
                            <option value="Recovery / Bota">Recovery / Bota</option>
                            <option value="Atendimento Individual">Atendimento Individual</option>
                            <option value="Treino Monitorado">Treino Monitorado</option>
                          </>
                        ) : (
                          <>
                            <option value="Treino Monitorado">Treino Monitorado</option>
                            <option value="Pilates">Pilates</option>
                            <option value="Funcional">Funcional</option>
                            <option value="Avaliação Física">Avaliação Física</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Data de Início</label>
                      <input
                        type="date"
                        className="form-control"
                        value={fsDate}
                        onChange={e => setFsDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Grade Interativa de Horários e Vagas Disponíveis */}
                  <div className="form-group" style={{ marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
                      <label style={{ fontWeight: 600, margin: 0 }}>Horário Desejado</label>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {loadingFsSlots ? (
                          <span style={{ color: 'var(--color-primary)' }}><i className="fa-solid fa-spinner fa-spin"></i> Verificando disponibilidade para os {fsSelectedDays.length} dias...</span>
                        ) : (
                          <span style={{ color: '#10b981' }}><i className="fa-solid fa-check"></i> Vagas consolidadas para os {fsSelectedDays.length} dias fixados</span>
                        )}
                      </div>
                    </div>

                    {loadingFsSlots ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.1)', borderRadius: '10px' }}>
                        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px', color: 'var(--color-primary)' }}></i>
                        Calculando disponibilidade para todas as datas futuras...
                      </div>
                    ) : fsSlotsData.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: '#ef4444', background: 'rgba(239,68,68,0.08)', borderRadius: '10px', fontSize: '0.82rem' }}>
                        ⚠️ Nenhum horário configurado para esta agenda nesta data.
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))', gap: '8px', maxHeight: '180px', overflowY: 'auto', padding: '4px', background: 'rgba(0,0,0,0.15)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                          {fsSlotsData.map((slot: any) => {
                            const minVagas = slot.minVagasLivres !== undefined ? slot.minVagasLivres : Math.max(0, slot.capacidade - slot.vagasOcupadas);
                            const hasConflicts = slot.conflitos && slot.conflitos.length > 0;
                            const isSelected = fsTime === slot.horario;

                            return (
                              <button
                                key={slot.horario}
                                type="button"
                                onClick={() => setFsTime(slot.horario)}
                                style={{
                                  borderRadius: '10px',
                                  padding: '10px 4px',
                                  border: isSelected ? '2px solid var(--color-primary)' : hasConflicts ? '1px solid rgba(239,68,68,0.45)' : '1px solid var(--border-color)',
                                  background: isSelected ? 'var(--color-primary)' : hasConflicts ? 'rgba(239,68,68,0.08)' : 'var(--bg-darker)',
                                  color: isSelected ? '#ffffff' : 'var(--text-main)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '3px',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <span style={{ fontSize: '1rem', fontWeight: 800 }}>{slot.horario}</span>
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  color: isSelected ? 'rgba(255,255,255,0.95)' : hasConflicts ? '#f87171' : minVagas >= 3 ? '#10b981' : '#f59e0b'
                                }}>
                                  {hasConflicts ? `🔴 Conflito (${slot.conflitos.length})` : `${minVagas} ${minVagas === 1 ? 'vaga livre' : 'vagas livres'}`}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Detalhamento de Conflitos Impeditivos do Horário Selecionado */}
                        {(() => {
                          const selectedSlotObj = fsSlotsData.find((s: any) => s.horario === fsTime);
                          if (!selectedSlotObj?.conflitos || selectedSlotObj.conflitos.length === 0) return null;

                          return (
                            <div style={{
                              marginTop: '10px',
                              padding: '12px 14px',
                              background: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.35)',
                              borderRadius: '10px'
                            }}>
                              <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.82rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className="fa-solid fa-triangle-exclamation"></i>
                                Conflitos impeditivos para o horário {fsTime} nos dias selecionados:
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '100px', overflowY: 'auto' }}>
                                {selectedSlotObj.conflitos.map((c: any, idx: number) => (
                                  <div key={idx} style={{ fontSize: '0.78rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <i className="fa-solid fa-circle-xmark" style={{ fontSize: '0.7rem', color: '#ef4444' }}></i>
                                    <span><strong>{c.dataFormatada}:</strong> {c.motivo}</span>
                                  </div>
                                ))}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
                                * Selecione outro horário sem conflitos ou ajuste os dias da semana para fixar este aluno.
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>

                  {/* Prévia dos horários que serão criados */}
                  {fsSelectedDays.length > 0 && (
                    <div style={{
                      padding: '10px 14px',
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      marginBottom: '15px',
                      fontSize: '0.82rem'
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Horários que serão fixados:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {fsSelectedDays.map(d => {
                          const daysShort = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                          return (
                            <span
                              key={d}
                              style={{
                                padding: '3px 8px',
                                background: 'rgba(0, 184, 148, 0.12)',
                                border: '1px solid rgba(0, 184, 148, 0.3)',
                                borderRadius: '4px',
                                color: 'var(--color-primary)',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <i className="fa-solid fa-circle" style={{ fontSize: '6px' }}></i>
                              {daysShort[d]} às {fsTime}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Data de Início e Duração */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Data de Início</label>
                      <input
                        type="date"
                        className="form-control"
                        value={fsDate}
                        onChange={e => setFsDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Tipo de Duração</label>
                      <select
                        className="select-custom"
                        value={fsDurationType}
                        onChange={e => setFsDurationType(e.target.value as any)}
                      >
                        <option value="contrato">Até o fim da vigência do contrato</option>
                        <option value="indeterminado">Sem data final (Fixar Contínuo)</option>
                        <option value="manual">Definir data de término manual</option>
                      </select>
                    </div>
                  </div>

                  {/* Informação sobre vigência do contrato */}
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '5px' }}>
                    {(() => {
                      const selClient = clients.find(c => c._id === fsClient);
                      if (!selClient) return null;

                      if (fsDurationType === 'contrato') {
                        const valInfo = getContractValidityInfo(selClient, undefined, contractsAdminList);
                        if (valInfo && valInfo.dataFim && !valInfo.isExpired) {
                          return (
                            <div style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="fa-solid fa-shield-halved"></i>
                              Vigência ativa até: <strong>{valInfo.dataFimFormatted}</strong> {valInfo.isRecorrente ? '(Recorrência Mensal)' : '(Fim da Vigência)'}
                            </div>
                          );
                        } else if (valInfo && valInfo.isExpired) {
                          return (
                            <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="fa-solid fa-triangle-exclamation"></i>
                              Plano vencido em {valInfo.dataFimFormatted}. Recomendado renovar antes de fixar horário.
                            </div>
                          );
                        } else {
                          const com = selClient.dadosComerciais || {};
                          const rawDate = com.dataFim || com.vencimento;
                          if (rawDate) {
                            const dfFormatted = rawDate.split('-').reverse().join('/');
                            return (
                              <div style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className="fa-solid fa-shield-halved"></i>
                                Vigência até: <strong>{dfFormatted}</strong> (Cadastro Comercial)
                              </div>
                            );
                          }
                          return (
                            <div style={{ color: '#fdcb6e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="fa-solid fa-triangle-exclamation"></i>
                              Aluno sem vigência cadastrada. Será fixado por 30 dias a partir da data de início.
                            </div>
                          );
                        }
                      }

                      if (fsDurationType === 'indeterminado') {
                        return (
                          <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fa-solid fa-infinity"></i>
                            Regra contínua gerada em lotes recorrentes de 30 dias.
                          </div>
                        );
                      }

                      return null;
                    })()}
                  </div>
                </div>

                <div className="modal-footer" style={{ padding: '15px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px', flexShrink: 0, marginTop: 'auto' }}>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} disabled={isSavingFixedSched} onClick={() => setShowFixedSchedModal(false)}>Cancelar</button>
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={isSavingFixedSched}
                    style={{ 
                      flex: 1, 
                      background: 'var(--color-primary)',
                      opacity: isSavingFixedSched ? 0.75 : 1,
                      cursor: isSavingFixedSched ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    {isSavingFixedSched ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        Salvando Horários...
                      </>
                    ) : (
                      `Criar Regra (${fsSelectedDays.length} ${fsSelectedDays.length === 1 ? 'dia' : 'dias'})`
                    )}
                  </button>
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

        {/* MODAL DE DESBLOQUEIO DE DADOS BLINDADOS COM AUDITORIA */}
        {showUnlockModal && editingItem && (
          <div className="modal-overlay" style={{ display: 'flex', zIndex: 100000 }} onClick={() => setShowUnlockModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '90%', border: '1px solid rgba(251, 191, 36, 0.4)' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid rgba(251, 191, 36, 0.2)' }}>
                <h3 style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                  <i className="fa-solid fa-triangle-exclamation"></i> Liberação de Edição Cadastral
                </h3>
                <button className="modal-close" onClick={() => setShowUnlockModal(false)}>&times;</button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '16px' }}>
                <div style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.25)', padding: '12px', borderRadius: '8px', fontSize: '0.84rem', color: '#fef08a', lineHeight: '1.4' }}>
                  <strong>Atenção de Segurança e Conformidade:</strong><br />
                  Estes dados foram informados diretamente pelo contratante ou consolidados em contrato oficial. A alteração indevida altera o cadastro legal do aluno. Esta liberação será gravada na trilha de auditoria.
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












