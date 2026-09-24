'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FastTextarea } from './FastFormField';
import WellnessModal from './WellnessModal';
import { calculateWellness } from '@/utils/wellnessHelper';

const normalizeText = (str: string) => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const GROUP_PALETTE = [
  { color: '#10b981', name: 'Verde' },
  { color: '#f97316', name: 'Laranja' },
  { color: '#06b6d4', name: 'Ciano' },
  { color: '#a855f7', name: 'Roxo' },
  { color: '#eab308', name: 'Amarelo' },
  { color: '#ec4899', name: 'Rosa' },
  { color: '#3b82f6', name: 'Azul' },
  { color: '#14b8a6', name: 'Teal' },
  { color: '#f43f5e', name: 'Rose' },
  { color: '#84cc16', name: 'Lime' },
  { color: '#6366f1', name: 'Indigo' },
  { color: '#d946ef', name: 'Fuchsia' },
  { color: '#0ea5e9', name: 'Sky' }
];

const getGroupColor = (groupName: string) => {
  if (!groupName) return 'transparent';
  const match = groupName.match(/^G(\d+)$/i);
  if (match) {
    const idx = parseInt(match[1], 10) - 1;
    return GROUP_PALETTE[idx % GROUP_PALETTE.length]?.color || '#10b981';
  }
  return '#10b981';
};

const TECHNIQUE_PRESETS = [
  'Pico de contração 2s',
  'Drop-set na última série',
  'Rest-pause (3x com 10s)',
  'Excêntrica lenta 4s',
  'Até a falha concêntrica',
  'Isometria final 10s',
  'Repetições parciais'
];

export const calculateDropSuggestions = (baseCarga: number, tipo: 'none' | 'single' | 'double' | 'triple'): number[] => {
  if (!baseCarga || tipo === 'none') return [];
  const drop1 = Math.round(baseCarga * 0.75);
  if (tipo === 'single') return [drop1];
  const drop2 = Math.round(drop1 * 0.75);
  if (tipo === 'double') return [drop1, drop2];
  const drop3 = Math.round(drop2 * 0.75);
  if (tipo === 'triple') return [drop1, drop2, drop3];
  return [];
};

export const parseExerciseCarga = (ex: any) => {
  let rawCarga = ex.carga !== undefined && ex.carga !== null ? ex.carga : (ex.carga_sugerida !== undefined && ex.carga_sugerida !== null ? ex.carga_sugerida : '');
  let unidade = ex.unidadeCarga || '';
  let val: any = '';

  if (typeof rawCarga === 'number') {
    val = rawCarga;
  } else if (typeof rawCarga === 'string') {
    const s = rawCarga.trim();
    if (!s) {
      val = '';
    } else if (/^livre$/i.test(s)) {
      val = '';
      if (!unidade) unidade = 'Livre';
    } else {
      const match = s.match(/^([0-9.,]+)\s*([a-zA-Z%]*)$/);
      if (match) {
        val = parseFloat(match[1].replace(',', '.')) || '';
        if (!unidade && match[2]) unidade = match[2];
      } else {
        const numOnly = parseFloat(s.replace(/[^0-9.]/g, ''));
        val = isNaN(numOnly) ? '' : numOnly;
      }
    }
  }
  return { carga: val, unidadeCarga: unidade };
};

export const computeClientLastWorkout = (targetClientId: string, aptsList: any[], currentAptId?: string) => {
  if (!targetClientId || !Array.isArray(aptsList)) return null;
  const cIdStr = String(targetClientId);
  const now = new Date();
  const hojeISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const pastTreinosApts = aptsList.filter((a: any) => {
    const aClientId = String(a.clienteId?._id || a.clienteId || '');
    if (aClientId !== cIdStr) return false;
    if (currentAptId && String(a._id) === String(currentAptId)) return false;
    if (a.data > hojeISO) return false;
    if (a.data === hojeISO && a.status !== 'presenca' && !a.treinoExecutado) return false;
    return Boolean(a.treinoExecutado);
  }).sort((a: any, b: any) => {
    const dateComp = (b.data || '').localeCompare(a.data || '');
    if (dateComp !== 0) return dateComp;
    return (b.horario || '').localeCompare(a.horario || '');
  });

  if (pastTreinosApts.length === 0) return null;

  const lastTApt = pastTreinosApts[0];
  const te = lastTApt.treinoExecutado;
  const isLivre = te.categoria === 'fichasLivre' || te.tipo === 'livre' || lastTApt.servico === 'Treino Livre';
  const modalityLabel = isLivre ? 'Treino Livre' : 'Treino Monitorado';

  let fichaStr = '';
  if (te.fichaId) {
    fichaStr = `Ficha ${String(te.fichaId).toUpperCase()}`;
  } else if (te.fichaNome) {
    fichaStr = te.fichaNome;
  } else {
    fichaStr = isLivre ? 'Avulso' : 'Ficha';
  }

  if (te.fichaNome && te.fichaNome !== fichaStr && !te.fichaNome.toUpperCase().startsWith('TREINO LIVRE') && !te.fichaNome.toUpperCase().startsWith('FICHA')) {
    fichaStr = `${fichaStr} (${te.fichaNome})`;
  }

  // Format relative date with time: DD/MM/YYYY (relativo) • HH:MM
  const cleanDate = (lastTApt.data || '').split('T')[0];
  const parts = cleanDate.split('-');
  const fullFormatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : cleanDate;

  let relative = '';
  try {
    const dLast = new Date(parts[0] + '-' + parts[1] + '-' + parts[2] + 'T12:00:00');
    const dToday = new Date(hojeISO + 'T12:00:00');
    const diffTime = Math.abs(dToday.getTime() - dLast.getTime());
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) relative = 'hoje';
    else if (diffDays === 1) relative = 'ontem';
    else relative = `há ${diffDays} dias`;
  } catch (e) {}

  const horarioStr = lastTApt.horario ? ` • ${lastTApt.horario}` : '';
  const detailStr = `${fullFormatted}${relative ? ` (${relative})` : ''}${horarioStr}`;

  return {
    label: `${modalityLabel} • ${fichaStr}`,
    detail: detailStr,
    isLivre
  };
};

interface WorkoutBuilderProps {
  onClose: () => void;
  clientId: string;
  clientName: string;
  initialFichaId?: string;
  initialCategory?: 'fichasMonitorado' | 'fichasLivre';
  initialSlotTime?: string;
}

export default function WorkoutBuilder({ onClose, clientId, clientName, initialFichaId, initialCategory, initialSlotTime }: WorkoutBuilderProps) {
  const [currentClientId, setCurrentClientId] = useState<string>(clientId);
  const [realClientName, setRealClientName] = useState(clientName && clientName !== 'Aluno' ? clientName : '');
  const [activeSlotTime, setActiveSlotTime] = useState<string | null>(initialSlotTime || null);
  const [activeAppointment, setActiveAppointment] = useState<any | null>(null);
  const [showWellnessModal, setShowWellnessModal] = useState(false);
  
  const [exercises, setExercises] = useState<any[]>([]);
  const [selectedMuscle, setSelectedMuscle] = useState('Todos');
  const [search, setSearch] = useState('');
  
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [currentHourFilter, setCurrentHourFilter] = useState<'current' | 'all'>('current');
  const [lastWorkoutInfo, setLastWorkoutInfo] = useState<{ label: string; detail: string; isLivre: boolean } | null>(null);

  // Modal de Substituição de Exercício
  const [substitutingItem, setSubstitutingItem] = useState<{ id: string; index: number; nome: string; combinaGrupo: string; grupo: string } | null>(null);
  const [substituteSearch, setSubstituteSearch] = useState('');
  const [substituteMuscle, setSubstituteMuscle] = useState('Todos');

  const [activeCategory, setActiveCategory] = useState<'fichasMonitorado' | 'fichasLivre'>(initialCategory || 'fichasMonitorado');
  const [activeTabLetter, setActiveTabLetter] = useState<string>(initialFichaId?.toUpperCase() || 'A');
  const [workoutName, setWorkoutName] = useState(`Ficha ${initialFichaId?.toUpperCase() || 'A'}`);
  const [workoutGoal, setWorkoutGoal] = useState('');
  const [workoutItems, setWorkoutItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rawWorkoutDoc, setRawWorkoutDoc] = useState<any>(null);
  const [todayWellness, setTodayWellness] = useState<any>(null);

  // New Ficha modal states
  const [showAddFichaModal, setShowAddFichaModal] = useState(false);
  const [newFichaLetter, setNewFichaLetter] = useState('');
  const [addFichaError, setAddFichaError] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveToast, setSaveToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 🌟 Validade da Ficha (15, 30, 60 dias)
  const [workoutValidade, setWorkoutValidade] = useState<number | undefined>(undefined);
  const [workoutDataInicio, setWorkoutDataInicio] = useState<string>('');
  const [workoutDataExpiracao, setWorkoutDataExpiracao] = useState<string>('');

  // 🌟 Auto-Save em Tempo Real
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string>('');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isReadyForAutoSaveRef = useRef<boolean>(false);

  // 🌟 Histórico de Versões / Ciclos
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // 🌟 Popover / Modal de Evolução de Carga
  const [selectedProgressionItem, setSelectedProgressionItem] = useState<any | null>(null);

  // Unsaved changes protection
  const [initialSnapshot, setInitialSnapshot] = useState<string>('');
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingTargetClient, setPendingTargetClient] = useState<{ id: string; name: string; horario?: string } | null>(null);

  // Quick Client Search Dropdown
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [clientSearchText, setClientSearchText] = useState('');

  const [activeObsModalItem, setActiveObsModalItem] = useState<any | null>(null);
  const [tempObsText, setTempObsText] = useState('');
  const [activeDropMenuId, setActiveDropMenuId] = useState<string | null>(null);

  const carouselRef = useRef<HTMLDivElement>(null);
  const displayName = realClientName || (clientName && clientName !== 'Aluno' ? clientName : 'Aluno');

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const offset = direction === 'left' ? -260 : 260;
    carouselRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!carouselRef.current || !currentClientId) return;
    const activeBtn = carouselRef.current.querySelector(`[data-client-id="${currentClientId}"]`) as HTMLElement;
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [currentClientId]);

  useEffect(() => {
    if (!activeDropMenuId) return;
    const handleGlobalClick = () => setActiveDropMenuId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [activeDropMenuId]);

  // Snapshot calculator
  const computeSnapshot = (items = workoutItems, name = workoutName, goal = workoutGoal, cat = activeCategory, tab = activeTabLetter) => {
    return JSON.stringify({
      cat,
      tab,
      name,
      goal,
      items: items.map(it => ({
        nome: it.nome,
        series: it.series,
        reps: it.reps,
        carga: it.carga,
        unidadeCarga: it.unidadeCarga,
        descanso: it.descanso,
        observacao: it.observacao,
        ritmo: it.ritmo,
        combinaGrupo: it.combinaGrupo,
        dropSet: it.dropSet
      }))
    });
  };

  const hasUnsavedChanges = useMemo(() => {
    if (!initialSnapshot) return false;
    return initialSnapshot !== computeSnapshot();
  }, [initialSnapshot, workoutItems, workoutName, workoutGoal, activeCategory, activeTabLetter]);

  // Sincronizar prop com estado interno
  useEffect(() => {
    if (clientId && clientId !== currentClientId) {
      setCurrentClientId(clientId);
    }
    if (clientName && clientName !== 'Aluno') {
      setRealClientName(clientName);
    }
  }, [clientId, clientName]);

  // Atualizar título da aba do navegador com o nome do aluno
  useEffect(() => {
    const titleName = realClientName || (clientName && clientName !== 'Aluno' ? clientName : '');
    const prevTitle = document.title;
    document.title = titleName ? `${titleName} • Ficha de Treino | Clube Fitness` : `Ficha de Treino | Clube Fitness`;
    return () => {
      document.title = prevTitle;
    };
  }, [realClientName, clientName]);

  // Função de data local (Brasil UTC-3)
  const getLocalDateISO = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Verificação de janela de 60 minutos do agendamento
  const getAptTimeState = (horarioStr: string, currentStr: string) => {
    if (!horarioStr || !currentStr) return 'future';
    const [hA, mA] = horarioStr.split(':').map(Number);
    const [hC, mC] = currentStr.split(':').map(Number);
    const minApt = hA * 60 + (mA || 0);
    const minCurr = hC * 60 + (mC || 0);
    
    if (minCurr >= minApt && minCurr < minApt + 60) {
      return 'current';
    } else if (minCurr >= minApt + 60) {
      return 'past';
    } else {
      return 'future';
    }
  };

  // Horário atual no formato HH:00 e HH:MM
  const currentHourStr = useMemo(() => {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    return `${h}:00`;
  }, []);

  const currentRealTimeStr = useMemo(() => {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }, []);

  // Horário ativo para exibição no badge
  const displaySlotStr = useMemo(() => {
    if (activeSlotTime) return activeSlotTime;
    // Se não há slot explícito, verificar se o aluno ativo possui agendamento na janela atual
    const clientApts = todayAppointments.filter(a => String(a.clienteId?._id || a.clienteId) === String(currentClientId) && a.status !== 'cancelado');
    const currentApt = clientApts.find(a => getAptTimeState(a.horario, currentRealTimeStr) === 'current');
    if (currentApt) return currentApt.horario;
    if (clientApts.length > 0) return clientApts[0].horario;
    return currentHourStr;
  }, [activeSlotTime, todayAppointments, currentClientId, currentRealTimeStr, currentHourStr]);

  // Alunos da janela de horário atual (filtra direto por agendamento do slot ativo)
  const currentHourStudents = useMemo(() => {
    const targetSlot = displaySlotStr;
    const aptsInSlot = todayAppointments.filter(a => {
      if (a.status === 'cancelado') return false;
      if (targetSlot) return a.horario === targetSlot;
      return getAptTimeState(a.horario, currentRealTimeStr) === 'current';
    });

    const map = new Map<string, any>();
    aptsInSlot.forEach(a => {
      const sId = String(a.clienteId?._id || a.clienteId);
      if (!sId || sId === 'undefined') return;
      const cl = allClients.find(c => String(c._id) === sId) || (typeof a.clienteId === 'object' ? a.clienteId : {});
      const name = cl?.dadosPessoais?.nome || cl?.nome || a.clienteNome || 'Aluno';
      if (!map.has(sId)) {
        map.set(sId, {
          id: sId,
          name,
          horario: a.horario,
          status: a.status || 'agendado',
          servico: a.servico || a.tipo || 'Treino Monitorado',
          treinoExecutado: a.treinoExecutado,
          wellness: a.wellness,
          appointment: a
        });
      }
    });

    return Array.from(map.values());
  }, [todayAppointments, displaySlotStr, currentRealTimeStr, allClients]);

  // Lista de todos os alunos agendados para hoje (data local)
  const todayStudents = useMemo(() => {
    const map = new Map<string, any>();
    // Prioriza agendamentos no horário ativo ou confirmados para alunos com múltiplos horários
    const sorted = [...todayAppointments].sort((a, b) => {
      if (a.horario === displaySlotStr && b.horario !== displaySlotStr) return -1;
      if (b.horario === displaySlotStr && a.horario !== displaySlotStr) return 1;
      if (a.status === 'presenca' && b.status !== 'presenca') return -1;
      if (b.status === 'presenca' && a.status !== 'presenca') return 1;
      return (a.horario || '').localeCompare(b.horario || '');
    });

    sorted.forEach(a => {
      if (a.status === 'cancelado') return;
      const sId = String(a.clienteId?._id || a.clienteId);
      if (!sId || sId === 'undefined') return;
      const cl = allClients.find(c => String(c._id) === sId) || (typeof a.clienteId === 'object' ? a.clienteId : {});
      const name = cl?.dadosPessoais?.nome || cl?.nome || a.clienteNome || 'Aluno';
      if (!map.has(sId)) {
        map.set(sId, {
          id: sId,
          name,
          horario: a.horario,
          status: a.status || 'agendado',
          servico: a.servico || a.tipo || 'Treino Monitorado',
          treinoExecutado: a.treinoExecutado,
          wellness: a.wellness,
          appointment: a
        });
      }
    });
    return Array.from(map.values());
  }, [todayAppointments, displaySlotStr, allClients]);

  // Função centralizada para carregar dados do treino de um aluno
  const loadDataForClient = async (targetClientId: string, targetClientName?: string, isInitial = false, targetSlot?: string) => {
    try {
      setIsLoading(true);

      const fetchPromises: Promise<any>[] = [
        fetch(`/api/workouts?clientId=${targetClientId}`).then(r => r.json()).catch(() => ({ success: false })),
        fetch(`/api/clients?id=${targetClientId}`).then(r => r.json()).catch(() => ({ success: false }))
      ];

      if (isInitial || exercises.length === 0 || allClients.length === 0 || allAppointments.length === 0) {
        fetchPromises.push(fetch('/api/exercises').then(r => r.json()).catch(() => ({ success: false })));
        fetchPromises.push(fetch(`/api/appointments?t=${Date.now()}`).then(r => r.json()).catch(() => ({ success: false })));
        fetchPromises.push(fetch('/api/clients').then(r => r.json()).catch(() => ({ success: false })));
      }

      const results = await Promise.all(fetchPromises);
      const resWorkouts = results[0];
      const resClient = results[1];
      const resEx = results[2];
      const resApts = results[3];
      const resAllClients = results[4];

      if (resAllClients?.success && Array.isArray(resAllClients.data)) {
        setAllClients(resAllClients.data);
      }

      let currentTodayApts = todayAppointments;
      let aptsListForHistory = allAppointments;
      if (resApts?.success && Array.isArray(resApts.data)) {
        const hojeISO = getLocalDateISO();
        currentTodayApts = resApts.data.filter((a: any) => a.data === hojeISO && a.status !== 'cancelado');
        setTodayAppointments(currentTodayApts);
        setAllAppointments(resApts.data);
        aptsListForHistory = resApts.data;
      }

      let loadedExercises = exercises;
      if (resEx?.success && Array.isArray(resEx.data)) {
        loadedExercises = resEx.data;
        setExercises(loadedExercises);
      }

      let resolvedName = targetClientName || realClientName;
      if (resClient?.success && resClient.data) {
        const raw = resClient.data;
        const c = Array.isArray(raw) ? raw[0] : raw;
        const cName = c?.dadosPessoais?.nome || c?.nome || '';
        if (cName) {
          resolvedName = cName;
          setRealClientName(cName);
          document.title = `${cName} • Ficha de Treino | Clube Fitness`;
        }
      }

      const effectiveSlot = targetSlot || activeSlotTime || displaySlotStr;
      const clientApts = currentTodayApts.filter((a: any) => String(a.clienteId?._id || a.clienteId) === String(targetClientId));
      
      // 🌟 Regra Estrita SEM FALLBACK: Buscar estritamente o agendamento do horário ativo
      const clientApt = clientApts.find((a: any) => a.horario === effectiveSlot) || null;
      setActiveAppointment(clientApt);

      const lastTreino = computeClientLastWorkout(targetClientId, aptsListForHistory, clientApt?._id);
      setLastWorkoutInfo(lastTreino);

      if (clientApt && clientApt.wellness?.realizado) {
        setTodayWellness(clientApt.wellness);
      } else {
        setTodayWellness(null);
      }

      if (resWorkouts?.success && resWorkouts.data) {
        const w = resWorkouts.data;
        setRawWorkoutDoc(w);

        const monitorado = w.fichasMonitorado || [];
        const livre = w.fichasLivre || [];

        // 🌟 Identificar se o aluno tem ficha/categoria informada na presença ou agendamento de hoje
        const aptTreino = clientApt?.treinoExecutado;
        const aptFichaId = aptTreino?.fichaId ? String(aptTreino.fichaId).toUpperCase() : '';
        const aptCategoria = aptTreino?.categoria 
          || (aptTreino?.tipo === 'livre' || clientApt?.servico === 'Treino Livre' ? 'fichasLivre' : (aptTreino?.tipo === 'ficha' || clientApt?.servico === 'Treino Monitorado' ? 'fichasMonitorado' : null));

        let chosenCategory: 'fichasMonitorado' | 'fichasLivre' = 'fichasMonitorado';
        if (isInitial && initialCategory) {
          chosenCategory = initialCategory;
        } else if (aptCategoria) {
          chosenCategory = aptCategoria;
        } else if (monitorado.some((s: any) => s.exercicios?.length > 0)) {
          chosenCategory = 'fichasMonitorado';
        } else if (livre.some((s: any) => s.exercicios?.length > 0)) {
          chosenCategory = 'fichasLivre';
        } else {
          chosenCategory = (clientApt?.servico === 'Treino Livre' ? 'fichasLivre' : 'fichasMonitorado');
        }

        setActiveCategory(chosenCategory);
        const activeSheets = w[chosenCategory] || [];

        // Determinar a ficha inicial: prioridade da presença confirmada > initialFichaId > primeira com exercícios > 'A'
        let targetFichaLetter = (isInitial && initialFichaId) ? initialFichaId.toUpperCase() : (aptFichaId || '');
        let initialSheet = targetFichaLetter ? activeSheets.find((s: any) => s.id?.toUpperCase() === targetFichaLetter) : null;
        if (!initialSheet) {
          initialSheet = activeSheets.find((s: any) => s.exercicios?.length > 0) || activeSheets[0] || { id: targetFichaLetter || 'A', nome: `Ficha ${targetFichaLetter || 'A'}`, exercicios: [] };
        }

        if (initialSheet) {
          const sheetTab = (initialSheet.id || targetFichaLetter || 'A').toUpperCase();
          const sheetName = initialSheet.nome || `Ficha ${sheetTab}`;
          const sheetGoal = initialSheet.observacoesGerais || '';

          setActiveTabLetter(sheetTab);
          setWorkoutName(sheetName);
          setWorkoutGoal(sheetGoal);
          setWorkoutValidade(initialSheet.validadeDias ? Number(initialSheet.validadeDias) : undefined);
          setWorkoutDataInicio(initialSheet.dataInicio || '');
          setWorkoutDataExpiracao(initialSheet.dataExpiracao || '');
          
          const items = (initialSheet.exercicios || []).map((ex: any, idx: number) => {
            const exName = typeof ex.exercicioId === 'object' ? ex.exercicioId?.nome : ex.exercicioId;
            const matchedDbEx = loadedExercises.find(e => e.nome === exName || e._id === exName);
            const grupo = matchedDbEx?.grupo || matchedDbEx?.grupo_muscular || 'Geral';
            
            const { carga, unidadeCarga } = parseExerciseCarga(ex);
            return {
              _id: matchedDbEx?._id || ex._id || `ex_${idx}`,
              id: String(Date.now() + idx + Math.random()),
              nome: exName || 'Exercício',
              grupo,
              series: ex.series !== undefined && ex.series !== null ? ex.series : 3,
              reps: String(ex.repeticoes !== undefined && ex.repeticoes !== null ? ex.repeticoes : '12'),
              carga,
              unidadeCarga,
              descanso: ex.descanso !== undefined && ex.descanso !== null ? parseInt(String(ex.descanso).replace('s', '')) || 60 : 60,
              observacao: ex.observacao || ex.observacoes || '',
              ritmo: (ex.ritmo && String(ex.ritmo).trim() !== '2-0-2-0') ? String(ex.ritmo) : '',
              combinaGrupo: ex.combinaGrupo || '',
              historicoCargas: Array.isArray(ex.historicoCargas) ? ex.historicoCargas : [],
              dropSet: ex.dropSet ? {
                tipo: ex.dropSet.tipo || 'none',
                escopo: ex.dropSet.escopo || 'ultima_serie',
                drops: Array.isArray(ex.dropSet.drops) ? ex.dropSet.drops.map((d: any) => Number(d) || 0) : []
              } : undefined
            };
          });
          setWorkoutItems(items);
          setInitialSnapshot(computeSnapshot(items, sheetName, sheetGoal, chosenCategory, sheetTab));

          setTimeout(() => {
            isReadyForAutoSaveRef.current = true;
          }, 600);
        }
      } else {
        setWorkoutItems([]);
        setWorkoutValidade(undefined);
        setWorkoutDataInicio('');
        setWorkoutDataExpiracao('');
        setInitialSnapshot(computeSnapshot([], 'Ficha A', '', 'fichasMonitorado', 'A'));
        setTimeout(() => {
          isReadyForAutoSaveRef.current = true;
        }, 600);
      }

    } catch (err) {
      console.error('Erro ao carregar dados do treino:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDataForClient(currentClientId, realClientName, true, initialSlotTime || undefined);
  }, []);

  const requestSwitchClient = (targetId: string, targetName: string, targetHorario?: string) => {
    if (String(targetId) === String(currentClientId)) return;
    if (hasUnsavedChanges) {
      setPendingTargetClient({ id: targetId, name: targetName, horario: targetHorario });
      setShowUnsavedModal(true);
    } else {
      executeSwitchClient(targetId, targetName, targetHorario);
    }
  };

  const executeSwitchClient = async (targetId: string, targetName: string, targetHorario?: string) => {
    setCurrentClientId(targetId);
    setRealClientName(targetName);
    setShowUnsavedModal(false);
    setPendingTargetClient(null);
    setShowSearchDropdown(false);
    setClientSearchText('');

    if (targetHorario) {
      setActiveSlotTime(targetHorario);
    }

    if (typeof window !== 'undefined') {
      const slotParam = targetHorario ? `&horario=${encodeURIComponent(targetHorario)}` : '';
      window.history.pushState(null, '', `/ficha/${targetId}?studentName=${encodeURIComponent(targetName)}${slotParam}`);
      document.title = `${targetName} • Ficha de Treino | Clube Fitness`;
    }

    await loadDataForClient(targetId, targetName, false, targetHorario || activeSlotTime || displaySlotStr);
  };

  const handleConfirmWellness = async (wellnessData: { sono: number; fadiga: number; dorMuscular: number; treinoExecutado?: any }) => {
    if (!activeAppointment) return;
    try {
      const bodyPayload: any = {
        id: activeAppointment._id,
        status: 'presenca',
        wellness: {
          sono: wellnessData.sono,
          fadiga: wellnessData.fadiga,
          dorMuscular: wellnessData.dorMuscular
        }
      };
      if (wellnessData.treinoExecutado) {
        bodyPayload.treinoExecutado = wellnessData.treinoExecutado;
      }
      const res = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();
      if (data.success) {
        const calc = calculateWellness(wellnessData.sono, wellnessData.fadiga, wellnessData.dorMuscular);
        const updatedWellness = {
          realizado: true,
          sono: wellnessData.sono,
          fadiga: wellnessData.fadiga,
          dorMuscular: wellnessData.dorMuscular,
          score: calc.score,
          status: calc.status,
          statusLabel: calc.statusLabel,
          statusColor: calc.statusColor,
          conduta: calc.conduta,
          regrasAtivadas: calc.regrasAtivadas
        };
        setTodayWellness(updatedWellness);
        setActiveAppointment((prev: any) => prev ? { ...prev, status: 'presenca', wellness: updatedWellness } : null);
        setTodayAppointments((prev: any[]) => prev.map(a => String(a._id) === String(activeAppointment._id) ? { ...a, status: 'presenca', wellness: updatedWellness } : a));
        setShowWellnessModal(false);
        setSaveToast({
          message: `✨ Presença e Teste Wellness registrados para ${realClientName}!`,
          type: 'success'
        });
        setTimeout(() => setSaveToast(null), 4000);
      } else {
        alert(data.error || 'Erro ao registrar presença com wellness.');
      }
    } catch (err: any) {
      console.error('Erro ao salvar wellness:', err);
      alert('Erro de conexão ao salvar wellness.');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const activeList = currentHourFilter === 'current' ? currentHourStudents : todayStudents;
      if (activeList.length === 0) return;

      if (e.ctrlKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        const currentIndex = activeList.findIndex(s => String(s.id) === String(currentClientId));
        if (e.key === 'ArrowRight') {
          const nextIndex = (currentIndex + 1) % activeList.length;
          requestSwitchClient(activeList[nextIndex].id, activeList[nextIndex].name);
        } else if (e.key === 'ArrowLeft') {
          const prevIndex = (currentIndex - 1 + activeList.length) % activeList.length;
          requestSwitchClient(activeList[prevIndex].id, activeList[prevIndex].name);
        }
      }

      if (e.altKey && e.key >= '1' && e.key <= '9') {
        const num = parseInt(e.key, 10) - 1;
        if (activeList[num]) {
          e.preventDefault();
          requestSwitchClient(activeList[num].id, activeList[num].name);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentClientId, currentHourFilter, currentHourStudents, todayStudents, hasUnsavedChanges]);

  // Lista dinâmica de fichas da categoria ativa (somente as que têm exercícios ou a ficha atualmente aberta/criada)
  const visibleSheets = useMemo(() => {
    const sheets = rawWorkoutDoc?.[activeCategory] || [];
    const valid = sheets.filter((s: any) => (s.exercicios && s.exercicios.length > 0) || s.id?.toUpperCase() === activeTabLetter?.toUpperCase());
    if (valid.length === 0) {
      return [{ id: 'A', nome: 'Ficha A', exercicios: [] }];
    }
    return valid;
  }, [rawWorkoutDoc, activeCategory, activeTabLetter]);

  const handleChangeSheet = (letter: string, categoryOverride?: 'fichasMonitorado' | 'fichasLivre') => {
    isReadyForAutoSaveRef.current = false;
    const targetLetter = (letter || 'A').toUpperCase();
    setActiveTabLetter(targetLetter);
    const cat = categoryOverride || activeCategory;
    const sheets = rawWorkoutDoc?.[cat] || [];
    const sheet = sheets.find((s: any) => s.id?.toUpperCase() === targetLetter);
    if (sheet) {
      setWorkoutName(sheet.nome || (cat === 'fichasLivre' ? `TREINO LIVRE ${targetLetter}` : `Ficha ${targetLetter}`));
      setWorkoutGoal(sheet.observacoesGerais || '');
      setWorkoutValidade(sheet.validadeDias ? Number(sheet.validadeDias) : undefined);
      setWorkoutDataInicio(sheet.dataInicio || '');
      setWorkoutDataExpiracao(sheet.dataExpiracao || '');

      const items = (sheet.exercicios || []).map((ex: any, idx: number) => {
        const exName = typeof ex.exercicioId === 'object' ? ex.exercicioId?.nome : ex.exercicioId;
        const matchedDbEx = exercises.find(e => e.nome === exName || e._id === exName);
        const { carga, unidadeCarga } = parseExerciseCarga(ex);
        return {
          _id: matchedDbEx?._id || ex._id || `ex_${idx}`,
          id: String(Date.now() + idx + Math.random()),
          nome: exName || 'Exercício',
          grupo: matchedDbEx?.grupo || matchedDbEx?.grupo_muscular || 'Geral',
          series: ex.series !== undefined && ex.series !== null ? ex.series : 3,
          reps: String(ex.repeticoes !== undefined && ex.repeticoes !== null ? ex.repeticoes : '12'),
          carga,
          unidadeCarga,
          descanso: ex.descanso !== undefined && ex.descanso !== null ? parseInt(String(ex.descanso).replace('s', '')) || 60 : 60,
          observacao: ex.observacao || ex.observacoes || '',
          ritmo: (ex.ritmo && String(ex.ritmo).trim() !== '2-0-2-0') ? String(ex.ritmo) : '',
          combinaGrupo: ex.combinaGrupo || '',
          historicoCargas: Array.isArray(ex.historicoCargas) ? ex.historicoCargas : [],
          dropSet: ex.dropSet ? {
            tipo: ex.dropSet.tipo || 'none',
            escopo: ex.dropSet.escopo || 'ultima_serie',
            drops: Array.isArray(ex.dropSet.drops) ? ex.dropSet.drops.map((d: any) => Number(d) || 0) : []
          } : undefined
        };
      });
      setWorkoutItems(items);
    } else {
      setWorkoutName(cat === 'fichasLivre' ? `TREINO LIVRE ${targetLetter}` : `Ficha ${targetLetter}`);
      setWorkoutGoal('');
      setWorkoutValidade(undefined);
      setWorkoutDataInicio('');
      setWorkoutDataExpiracao('');
      setWorkoutItems([]);
    }

    setTimeout(() => {
      isReadyForAutoSaveRef.current = true;
    }, 400);
  };

  const handleAddCustomFicha = () => {
    const letter = newFichaLetter.trim().toUpperCase();
    if (!letter || !/^[A-Z]$/.test(letter)) {
      setAddFichaError('Digite exatamente 1 letra maiúscula (A-Z).');
      return;
    }

    const currentSheets = rawWorkoutDoc?.[activeCategory] || [];
    const exists = currentSheets.some((s: any) => s.id?.toUpperCase() === letter);
    if (exists) {
      setAddFichaError(`A Ficha ${letter} já existe em ${activeCategory === 'fichasLivre' ? 'Treino Livre' : 'Treino Monitorado'}. Escolha outra letra.`);
      return;
    }

    const newSheet = {
      id: letter,
      nome: activeCategory === 'fichasLivre' ? `TREINO LIVRE ${letter}` : `Ficha ${letter}`,
      exercicios: [],
      observacoesGerais: ''
    };

    const updatedSheets = [...currentSheets, newSheet];
    setRawWorkoutDoc((prev: any) => ({
      ...(prev || {}),
      [activeCategory]: updatedSheets
    }));

    setShowAddFichaModal(false);
    setNewFichaLetter('');
    setAddFichaError('');

    handleChangeSheet(letter, activeCategory);
  };

  const muscles = ['Todos', 'Peito', 'Costas', 'Pernas', 'Ombros', 'Braços', 'Core', 'Cardio'];

  const filteredExercises = useMemo(() => {
    const rawSearch = normalizeText(search).trim();
    const stopWords = new Set(['no', 'na', 'nos', 'nas', 'de', 'da', 'do', 'dos', 'das', 'em', 'with', 'com', 'e', 'a', 'o', 'as', 'os']);
    
    const searchTokens = rawSearch
      ? rawSearch.split(/\s+/).filter(t => t.length > 0 && !stopWords.has(t))
      : [];

    return exercises
      .filter(ex => {
        const g = ex.grupo || ex.grupo_muscular || 'Geral';
        const matchMuscle = selectedMuscle === 'Todos' || normalizeText(g) === normalizeText(selectedMuscle);
        if (!matchMuscle) return false;
        if (searchTokens.length === 0) return true;

        const exNomeNorm = normalizeText(ex.nome);
        const exGrupoNorm = normalizeText(g);
        const fullText = `${exNomeNorm} ${exGrupoNorm}`;

        if (exNomeNorm.includes(rawSearch) || fullText.includes(rawSearch)) return true;
        const matchesAllTokens = searchTokens.every(token => fullText.includes(token));
        return matchesAllTokens;
      })
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [exercises, selectedMuscle, search]);

  const addExercise = (ex: any) => {
    const newItem = {
      _id: ex._id,
      id: String(Date.now() + Math.random()),
      nome: ex.nome,
      grupo: ex.grupo || ex.grupo_muscular || 'Geral',
      series: 3,
      reps: '12',
      carga: parseFloat(String(ex.carga_sugerida || '10').replace('kg', '')) || 10,
      unidadeCarga: 'kg',
      descanso: 60,
      observacao: '',
      ritmo: '',
      combinaGrupo: '',
      historicoCargas: []
    };
    const updated = [...workoutItems, newItem];
    setWorkoutItems(updated);
    persistWorkoutData(updated, workoutName, workoutGoal, workoutValidade, true);
  };

  const handleSubstituteExercise = (oldItemId: string, newDbEx: any) => {
    const updated = workoutItems.map(item => {
      if (item.id === oldItemId) {
        return {
          _id: newDbEx._id || `ex_${Date.now()}`,
          id: String(Date.now() + Math.random()),
          nome: newDbEx.nome,
          grupo: newDbEx.grupo || newDbEx.grupo_muscular || 'Geral',
          combinaGrupo: item.combinaGrupo || '',
          series: '',
          reps: '',
          ritmo: '',
          carga: '',
          unidadeCarga: '',
          descanso: '',
          observacao: '',
          historicoCargas: [],
          dropSet: undefined
        };
      }
      return item;
    });
    setWorkoutItems(updated);
    setSubstitutingItem(null);
    persistWorkoutData(updated, workoutName, workoutGoal, workoutValidade, true);
  };

  const substituteFilteredExercises = useMemo(() => {
    const rawSearch = normalizeText(substituteSearch).trim();
    return exercises
      .filter(ex => {
        const g = ex.grupo || ex.grupo_muscular || 'Geral';
        const matchMuscle = substituteMuscle === 'Todos' || normalizeText(g) === normalizeText(substituteMuscle);
        if (!matchMuscle) return false;
        if (!rawSearch) return true;
        const exNomeNorm = normalizeText(ex.nome);
        const exGrupoNorm = normalizeText(g);
        return exNomeNorm.includes(rawSearch) || exGrupoNorm.includes(rawSearch);
      })
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [exercises, substituteMuscle, substituteSearch]);

  const addToWorkout = addExercise;

  const removeItem = (id: string) => {
    const updated = workoutItems.filter(item => item.id !== id);
    setWorkoutItems(updated);
    persistWorkoutData(updated, workoutName, workoutGoal, workoutValidade, true);
  };

  const updateItem = (id: string, field: string, value: any) => {
    setWorkoutItems(prev => {
      const updated = prev.map(item => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      });
      triggerDebouncedAutoSave(updated);
      return updated;
    });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...workoutItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setWorkoutItems(newItems);
    persistWorkoutData(newItems, workoutName, workoutGoal, workoutValidade, true);
  };

  const handleSetDropTipo = (id: string, newTipo: 'none' | 'single' | 'double' | 'triple') => {
    const updated = workoutItems.map(item => {
      if (item.id === id) {
        if (newTipo === 'none') {
          return { ...item, dropSet: undefined };
        }
        const baseCarga = parseFloat(String(item.carga)) || 0;
        const drops = calculateDropSuggestions(baseCarga, newTipo);
        return {
          ...item,
          dropSet: {
            tipo: newTipo,
            escopo: item.dropSet?.escopo || 'ultima_serie',
            drops
          }
        };
      }
      return item;
    });
    setWorkoutItems(updated);
    persistWorkoutData(updated, workoutName, workoutGoal, workoutValidade, true);
  };

  const handleUpdateDropValue = (id: string, dropIndex: number, val: number) => {
    setWorkoutItems(prev => {
      const updated = prev.map(item => {
        if (item.id === id && item.dropSet) {
          const newDrops = [...(item.dropSet.drops || [])];
          newDrops[dropIndex] = val;
          return {
            ...item,
            dropSet: {
              ...item.dropSet,
              drops: newDrops
            }
          };
        }
        return item;
      });
      triggerDebouncedAutoSave(updated);
      return updated;
    });
  };

  const handleToggleDropEscopo = (id: string, escopo: 'ultima_serie' | 'todas_series') => {
    const updated = workoutItems.map(item => {
      if (item.id === id && item.dropSet) {
        return {
          ...item,
          dropSet: {
            ...item.dropSet,
            escopo
          }
        };
      }
      return item;
    });
    setWorkoutItems(updated);
    persistWorkoutData(updated, workoutName, workoutGoal, workoutValidade, true);
  };

  const metrics = useMemo(() => {
    let volume = 0;
    let series = 0;
    workoutItems.forEach(it => {
      const s = Number(it.series) || 0;
      const r = parseInt(String(it.reps).match(/\d+/)?.[0] || '10', 10);
      const rawC = parseFloat(String(it.carga)) || 0;
      const c = (it.unidadeCarga && String(it.unidadeCarga).toLowerCase().includes('lb')) ? rawC * 0.453592 : rawC;
      series += s;

      const dropSet = it.dropSet;
      const hasDrop = dropSet && dropSet.tipo && dropSet.tipo !== 'none' && Array.isArray(dropSet.drops) && dropSet.drops.length > 0;

      if (!hasDrop) {
        volume += s * r * c;
      } else {
        const dropSum = dropSet.drops.reduce((acc: number, d: number) => acc + (Number(d) || 0), 0);
        const volumeUmaSerieComDrop = (r * c) + (r * dropSum);

        if (dropSet.escopo === 'todas_series') {
          volume += s * volumeUmaSerieComDrop;
        } else {
          const seriesNormais = Math.max(0, s - 1);
          volume += (seriesNormais * r * c) + volumeUmaSerieComDrop;
        }
      }
    });
    return {
      volumeTotal: Math.round(volume),
      totalSeries: series,
      totalExercicios: workoutItems.length
    };
  }, [workoutItems]);

  // 🌟 Gerador de payload da ficha atual
  const buildCurrentSheetPayload = (
    items = workoutItems,
    name = workoutName,
    goal = workoutGoal,
    validade = workoutValidade,
    dataInicio = workoutDataInicio,
    dataExpiracao = workoutDataExpiracao
  ) => {
    return {
      id: activeTabLetter,
      nome: name,
      ultimaAtualizacao: new Date().toISOString().split('T')[0],
      observacoesGerais: goal,
      validadeDias: validade,
      dataInicio: dataInicio || new Date().toISOString().split('T')[0],
      dataExpiracao: dataExpiracao,
      exercicios: items.map(item => {
        let cargaFinal: any = '';
        if (item.unidadeCarga) {
          cargaFinal = (item.carga !== '' && item.carga !== undefined && item.carga !== null) ? `${item.carga}${item.unidadeCarga}` : item.unidadeCarga;
        } else if (item.carga !== '' && item.carga !== undefined && item.carga !== null) {
          cargaFinal = `${item.carga}`;
        }

        return {
          exercicioId: item.nome,
          series: item.series !== '' && item.series !== undefined && item.series !== null ? Number(item.series) : '',
          repeticoes: String(item.reps || ''),
          carga: cargaFinal,
          unidadeCarga: item.unidadeCarga || '',
          descanso: item.descanso !== '' && item.descanso !== undefined && item.descanso !== null ? `${item.descanso}s` : '',
          observacao: item.observacao || '',
          ritmo: item.ritmo || '',
          combinaGrupo: item.combinaGrupo || '',
          historicoCargas: Array.isArray(item.historicoCargas) ? item.historicoCargas : [],
          dropSet: (item.dropSet && item.dropSet.tipo && item.dropSet.tipo !== 'none') ? {
            tipo: item.dropSet.tipo,
            escopo: item.dropSet.escopo || 'ultima_serie',
            drops: item.dropSet.drops || []
          } : undefined
        };
      })
    };
  };

  // 🌟 Motor de persistência unificado (Manual ou Auto-Save)
  const persistWorkoutData = async (
    items = workoutItems,
    name = workoutName,
    goal = workoutGoal,
    validade = workoutValidade,
    isAutoSave = false
  ) => {
    try {
      if (isAutoSave) {
        setAutoSaveStatus('saving');
      } else {
        setIsSaving(true);
        setSaveToast(null);
      }

      const currentSheetPayload = buildCurrentSheetPayload(items, name, goal, validade);

      const existingSheets = rawWorkoutDoc?.[activeCategory] || [
        { id: 'A', nome: 'Ficha A', exercicios: [] },
        { id: 'B', nome: 'Ficha B', exercicios: [] },
        { id: 'C', nome: 'Ficha C', exercicios: [] }
      ];

      const sheetIdx = existingSheets.findIndex((s: any) => s.id?.toUpperCase() === activeTabLetter.toUpperCase());
      const prevExCount = (sheetIdx !== -1 && existingSheets[sheetIdx].exercicios) ? existingSheets[sheetIdx].exercicios.length : 0;

      let confirmEmpty = false;
      if (!isAutoSave && prevExCount > 0 && items.length === 0) {
        const ok = window.confirm(
          `⚠️ ATENÇÃO: A ${name || ('Ficha ' + activeTabLetter)} de ${realClientName || 'Aluno'} continha ${prevExCount} exercício(s) e agora está totalmente vazia.\n\nSalvar agora apagará todos os exercícios do aluno.\n\nDeseja realmente salvar a ficha vazia?`
        );
        if (!ok) {
          setIsSaving(false);
          return;
        }
        confirmEmpty = true;
      }

      let updatedSheets = [...existingSheets];
      if (sheetIdx !== -1) {
        updatedSheets[sheetIdx] = currentSheetPayload;
      } else {
        updatedSheets.push(currentSheetPayload);
      }

      const payload = {
        clientId: currentClientId,
        category: activeCategory,
        workoutData: updatedSheets,
        [activeCategory]: updatedSheets,
        confirmEmpty,
        motivo: isAutoSave ? 'Salvamento automático de treino' : 'Atualização manual de ficha de treino',
        profissionalNome: realClientName ? `Edição: ${displayName}` : ''
      };

      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success || res.ok) {
        const savedDoc = data.data || {};
        setRawWorkoutDoc((prev: any) => ({
          ...(prev || {}),
          [activeCategory]: savedDoc[activeCategory] || updatedSheets
        }));

        const savedSheet = (savedDoc[activeCategory] || updatedSheets).find((s: any) => s.id?.toUpperCase() === activeTabLetter.toUpperCase());
        if (savedSheet) {
          if (savedSheet.dataInicio) setWorkoutDataInicio(savedSheet.dataInicio);
          if (savedSheet.dataExpiracao) setWorkoutDataExpiracao(savedSheet.dataExpiracao);
          if (savedSheet.validadeDias) setWorkoutValidade(Number(savedSheet.validadeDias));

          if (Array.isArray(savedSheet.exercicios)) {
            setWorkoutItems(prev => prev.map(it => {
              const returnedEx = savedSheet.exercicios.find((e: any) => {
                const eNome = typeof e.exercicioId === 'object' ? e.exercicioId?.nome : e.exercicioId;
                return eNome === it.nome;
              });
              if (returnedEx && Array.isArray(returnedEx.historicoCargas)) {
                return { ...it, historicoCargas: returnedEx.historicoCargas };
              }
              return it;
            }));
          }
        }

        setInitialSnapshot(computeSnapshot(items, name, goal, activeCategory, activeTabLetter));

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        setAutoSaveStatus('saved');
        setLastAutoSaveTime(timeStr);

        if (!isAutoSave) {
          setJustSaved(true);
          setSaveToast({
            message: `✨ ${name} de ${realClientName || 'Aluno'} salva com sucesso às ${timeStr}!`,
            type: 'success'
          });

          setTimeout(() => {
            setJustSaved(false);
          }, 3000);

          setTimeout(() => {
            setSaveToast(null);
          }, 5000);
        }
      } else {
        if (isAutoSave) {
          setAutoSaveStatus('error');
        } else {
          setSaveToast({
            message: `Erro ao salvar: ${data.error || 'Falha na resposta do servidor'}`,
            type: 'error'
          });
        }
      }
    } catch (err: any) {
      if (isAutoSave) {
        setAutoSaveStatus('error');
      } else {
        setSaveToast({
          message: `Erro de conexão ao salvar: ${err.message}`,
          type: 'error'
        });
      }
    } finally {
      if (!isAutoSave) {
        setIsSaving(false);
      }
    }
  };

  // 🌟 Disparador com Debounce Inteligente (800ms)
  const triggerDebouncedAutoSave = (updatedItems?: any[], updatedName?: string, updatedGoal?: string, updatedValidade?: number) => {
    if (!isReadyForAutoSaveRef.current) return;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    setAutoSaveStatus('saving');
    autoSaveTimerRef.current = setTimeout(() => {
      persistWorkoutData(
        updatedItems !== undefined ? updatedItems : workoutItems,
        updatedName !== undefined ? updatedName : workoutName,
        updatedGoal !== undefined ? updatedGoal : workoutGoal,
        updatedValidade !== undefined ? updatedValidade : workoutValidade,
        true
      );
    }, 800);
  };

  // 🌟 Seletor de Validade da Ficha (15, 30 ou 60 dias)
  const handleSetValidade = (days: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const baseDate = new Date(todayStr + 'T12:00:00');
    baseDate.setDate(baseDate.getDate() + days);
    const expStr = baseDate.toISOString().split('T')[0];

    setWorkoutValidade(days);
    setWorkoutDataInicio(todayStr);
    setWorkoutDataExpiracao(expStr);

    persistWorkoutData(workoutItems, workoutName, workoutGoal, days, true);
  };

  // 🌟 Cálculo de Evolução de Carga (Overload Progressivo)
  const getExerciseLoadProgression = (historico: any[]) => {
    if (!Array.isArray(historico) || historico.length < 2) return null;
    const first = historico[0];
    const last = historico[historico.length - 1];
    const cFirst = parseFloat(String(first.carga).replace(/[^\d.-]/g, '')) || 0;
    const cLast = parseFloat(String(last.carga).replace(/[^\d.-]/g, '')) || 0;
    const diff = Math.round((cLast - cFirst) * 10) / 10;

    let dias = 0;
    if (first.data && last.data) {
      const d1 = new Date(first.data + 'T12:00:00');
      const d2 = new Date(last.data + 'T12:00:00');
      dias = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
    }
    return { diff, dias, first, last, unit: last.unidadeCarga || first.unidadeCarga || 'kg' };
  };

  // 🌟 Modal de Histórico de Versões
  const handleOpenHistory = async () => {
    try {
      setIsLoadingHistory(true);
      setShowHistoryModal(true);
      const res = await fetch(`/api/workouts?clientId=${currentClientId}&history=true`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setHistoryList(data.data);
      }
    } catch (e) {
      console.error('Erro ao carregar histórico:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSave = () => persistWorkoutData(workoutItems, workoutName, workoutGoal, workoutValidade, false);

  const handleSaveAndSwitch = async () => {
    if (!pendingTargetClient) return;
    await handleSave();
    await executeSwitchClient(pendingTargetClient.id, pendingTargetClient.name, pendingTargetClient.horario);
  };

  const handleDiscardAndSwitch = async () => {
    if (!pendingTargetClient) return;
    await executeSwitchClient(pendingTargetClient.id, pendingTargetClient.name, pendingTargetClient.horario);
  };

  const handleCancelSwitch = () => {
    setShowUnsavedModal(false);
    setPendingTargetClient(null);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#070b14',
      color: '#f8fafc',
      zIndex: 999999,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      
      {saveToast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000000,
          background: saveToast.type === 'success' 
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))' 
            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(185, 28, 28, 0.95))',
          backdropFilter: 'blur(12px)',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '100px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(16, 185, 129, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontWeight: 700,
          fontSize: '0.92rem',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <i className={saveToast.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'} style={{ fontSize: '1.1rem' }}></i>
          <span>{saveToast.message}</span>
          <button 
            onClick={() => setSaveToast(null)} 
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '6px', opacity: 0.8 }}
          >
            &times;
          </button>
        </div>
      )}

      {/* 🌟 Barra Superior de Navegação Rápida entre Alunos Presentes/Agendados (Desktop PWA) */}
      <div style={{
        background: '#090e1a',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '8px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        zIndex: 100,
        boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
        flexShrink: 0
      }}>
        {/* Lado Esquerdo: Identificador de Horário & Alternador */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '4px 10px',
            borderRadius: '8px',
            color: '#34d399',
            fontSize: '0.78rem',
            fontWeight: 800
          }}>
            <i className="fa-regular fa-clock" style={{ fontSize: '0.85rem' }}></i>
            <span>{currentHourFilter === 'current' ? `Horário ${displaySlotStr}` : 'Hoje'}</span>
          </div>

          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '2px'
          }}>
            <button
              type="button"
              onClick={() => setCurrentHourFilter('current')}
              style={{
                background: currentHourFilter === 'current' ? '#10b981' : 'transparent',
                color: currentHourFilter === 'current' ? '#fff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                padding: '3px 9px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Filtrar apenas alunos da janela atual"
            >
              Atual ({currentHourStudents.length})
            </button>
            <button
              type="button"
              onClick={() => setCurrentHourFilter('all')}
              style={{
                background: currentHourFilter === 'all' ? '#10b981' : 'transparent',
                color: currentHourFilter === 'all' ? '#fff' : '#94a3b8',
                border: 'none',
                borderRadius: '6px',
                padding: '3px 9px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Ver todos os alunos agendados para hoje"
            >
              Todos ({todayStudents.length})
            </button>
          </div>
        </div>

        {/* Centro: Carrossel Horizontal de Alunos */}
        <div 
          ref={carouselRef}
          onWheel={(e) => {
            if (carouselRef.current && e.deltaY !== 0) {
              carouselRef.current.scrollLeft += e.deltaY;
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            padding: '2px 4px',
            flex: 1,
            justifyContent: 'flex-start',
            scrollBehavior: 'smooth'
          }}
        >
          {(currentHourFilter === 'current' ? currentHourStudents : todayStudents).length === 0 ? (
            <span style={{ fontSize: '0.76rem', color: '#64748b', fontStyle: 'italic' }}>
              Nenhum outro aluno agendado para este horário.
            </span>
          ) : (
            (currentHourFilter === 'current' ? currentHourStudents : todayStudents).map((s, idx) => {
              const isActive = String(s.id) === String(currentClientId);
              const isPresente = s.status === 'presenca';
              const isFalta = s.status === 'falta';
              const statusDotColor = isPresente ? '#10b981' : isFalta ? '#ef4444' : '#f59e0b';
              const fichaLetter = s.treinoExecutado?.fichaId || '';

              return (
                <button
                  key={s.id}
                  data-client-id={s.id}
                  type="button"
                  onClick={() => requestSwitchClient(s.id, s.name, s.horario)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: isActive ? '5px 14px' : '5px 10px',
                    borderRadius: '10px',
                    border: isActive ? '1.5px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(6, 182, 212, 0.15) 100%)'
                      : 'rgba(255, 255, 255, 0.035)',
                    color: isActive ? '#ffffff' : '#cbd5e1',
                    fontSize: '0.78rem',
                    fontWeight: isActive ? 800 : 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: isActive ? '0 0 14px rgba(16, 185, 129, 0.35)' : 'none',
                    transition: 'all 0.15s ease',
                    flexShrink: 0
                  }}
                  title={`Alternar para ${s.name}${s.horario ? ` (${s.horario})` : ''} (Alt+${idx + 1})`}
                >
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: statusDotColor,
                    boxShadow: isPresente ? '0 0 8px #10b981' : 'none',
                    display: 'inline-block'
                  }}></span>

                  <span>{s.name}</span>

                  {fichaLetter && (
                    <span style={{
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      background: isActive ? '#10b981' : 'rgba(255,255,255,0.1)',
                      color: isActive ? '#000' : '#34d399',
                      padding: '1px 5px',
                      borderRadius: '4px'
                    }}>
                      Ficha {fichaLetter}
                    </span>
                  )}


                  {idx < 9 && (
                    <span style={{
                      fontSize: '0.62rem',
                      color: '#64748b',
                      background: 'rgba(0,0,0,0.3)',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      marginLeft: '2px'
                    }}>
                      Alt+{idx + 1}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Lado Direito: Setas de Rolagem da Barra & Busca de Alunos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, position: 'relative' }}>
          {/* Navegação de Rolagem Horizontal */}
          <div style={{ display: 'flex', gap: '3px' }}>
            <button
              type="button"
              onClick={() => scrollCarousel('left')}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.74rem'
              }}
              title="Rolar lista para a esquerda"
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel('right')}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.74rem'
              }}
              title="Rolar lista para a direita"
            >
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>

          {/* Botão Buscar Outro Aluno */}
          <button
            type="button"
            onClick={() => setShowSearchDropdown(prev => !prev)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '8px',
              border: showSearchDropdown ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.12)',
              background: showSearchDropdown ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: showSearchDropdown ? '#34d399' : '#e2e8f0',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <i className="fa-solid fa-magnifying-glass"></i>
            <span>Buscar Aluno</span>
          </button>

          {/* Dropdown de Busca Rápida de Alunos */}
          {showSearchDropdown && (
            <div style={{
              position: 'absolute',
              top: '36px',
              right: '0',
              width: '280px',
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              boxShadow: '0 12px 35px rgba(0,0,0,0.8)',
              padding: '10px',
              zIndex: 2000000,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  autoFocus
                  value={clientSearchText}
                  onChange={(e) => setClientSearchText(e.target.value)}
                  placeholder="Nome do aluno..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    paddingLeft: '30px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: '#070b14',
                    color: '#fff',
                    fontSize: '0.82rem'
                  }}
                />
                <i className="fa-solid fa-search" style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b', fontSize: '0.75rem' }}></i>
              </div>

              <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {allClients
                  .filter(c => {
                    const cNome = normalizeText(c.dadosPessoais?.nome || c.nome || '');
                    return cNome.includes(normalizeText(clientSearchText));
                  })
                  .slice(0, 8)
                  .map(c => {
                    const cId = String(c._id);
                    const cNome = c.dadosPessoais?.nome || c.nome || 'Aluno';
                    const isSelected = cId === String(currentClientId);

                    return (
                      <button
                        key={cId}
                        type="button"
                        onClick={() => requestSwitchClient(cId, cNome)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                          color: isSelected ? '#34d399' : '#cbd5e1',
                          fontSize: '0.78rem',
                          fontWeight: isSelected ? 800 : 500,
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = isSelected ? 'rgba(16, 185, 129, 0.2)' : 'transparent')}
                      >
                        <span>{cNome}</span>
                        {isSelected && <i className="fa-solid fa-check" style={{ color: '#10b981', fontSize: '0.7rem' }}></i>}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{
        padding: '14px 28px',
        background: 'linear-gradient(180deg, #111827 0%, #0c1220 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button 
            type="button"
            className="btn btn-secondary" 
            onClick={onClose} 
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: '#e2e8f0',
              fontWeight: 600,
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <i className="fa-solid fa-arrow-left"></i> Voltar para Lista
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, color: '#ffffff', fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.3px' }}>
                {displayName}
              </h2>
                <span style={{ 
                  background: 'rgba(16, 185, 129, 0.18)', 
                  color: '#10b981', 
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  padding: '2px 8px', 
                  borderRadius: '6px', 
                  fontSize: '0.72rem', 
                  fontWeight: 800,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase'
                }}>
                  Ficha de Treino
                </span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-dumbbell" style={{ color: '#10b981' }}></i> Prescrição e Acompanhamento Clínico
                </span>
                {lastWorkoutInfo && (
                  <span style={{
                    background: lastWorkoutInfo.isLivre ? 'rgba(56, 189, 248, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                    border: lastWorkoutInfo.isLivre ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                    color: lastWorkoutInfo.isLivre ? '#38bdf8' : '#10b981',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}>
                    <i className={lastWorkoutInfo.isLivre ? 'fa-solid fa-person-walking' : 'fa-solid fa-dumbbell'}></i>
                    <span>Último Treino: {lastWorkoutInfo.label} — {lastWorkoutInfo.detail}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '6px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <i className="fa-solid fa-weight-hanging" style={{ color: '#10b981', fontSize: '0.9rem' }}></i>
            <div>
              <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Volume Previsto</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981' }}>{metrics.volumeTotal.toLocaleString('pt-BR')} kg</div>
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '6px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <i className="fa-solid fa-layer-group" style={{ color: '#38bdf8', fontSize: '0.9rem' }}></i>
            <div>
              <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Exercícios / Séries</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8' }}>{metrics.totalExercicios} ex • {metrics.totalSeries} séries</div>
            </div>
          </div>

          {/* 🌟 Botão Histórico de Ciclos */}
          <button
            type="button"
            onClick={handleOpenHistory}
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#e2e8f0',
              fontWeight: 700,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title="Ver histórico de ciclos e versões passadas deste aluno"
          >
            <i className="fa-solid fa-clock-rotate-left" style={{ color: '#38bdf8' }}></i>
            <span>Histórico de Ciclos</span>
          </button>

          {/* 🌟 Indicador de Auto-Save em Tempo Real */}
          {autoSaveStatus === 'saving' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#fbbf24',
              fontSize: '0.78rem',
              fontWeight: 750
            }}>
              <i className="fa-solid fa-spinner fa-spin"></i>
              <span>Salvando alterações...</span>
            </div>
          )}
          {autoSaveStatus === 'saved' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: '0.78rem',
              fontWeight: 750
            }}>
              <i className="fa-solid fa-check"></i>
              <span>Salvo automaticamente {lastAutoSaveTime ? `(${lastAutoSaveTime})` : ''}</span>
            </div>
          )}
          {autoSaveStatus === 'error' && (
            <div 
              onClick={() => handleSave()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                fontSize: '0.78rem',
                fontWeight: 750,
                cursor: 'pointer'
              }}
              title="Clique para tentar salvar novamente"
            >
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>Falha no salvamento automático • Tentar novamente</span>
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              background: justSaved 
                ? 'linear-gradient(135deg, #10b981, #059669)' 
                : 'linear-gradient(135deg, #10b981, #047857)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.75 : 1,
              boxShadow: justSaved 
                ? '0 0 25px rgba(16, 185, 129, 0.6)' 
                : '0 4px 16px rgba(16, 185, 129, 0.3)',
              border: 'none',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {isSaving ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Salvando Ficha...
              </>
            ) : justSaved ? (
              <>
                <i className="fa-solid fa-circle-check"></i> Ficha Salva!
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk"></i> Salvar Treino
              </>
            )}
          </button>
        </div>
      </div>

      {/* 🌟 Banner Wellness Respondido */}
      {todayWellness && (
        <div style={{
          background: todayWellness.status === 'otimo' 
            ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 78, 59, 0.25) 100%)' 
            : todayWellness.status === 'moderado' 
            ? 'linear-gradient(90deg, rgba(234, 179, 8, 0.15) 0%, rgba(113, 63, 18, 0.25) 100%)' 
            : todayWellness.status === 'ruim' 
            ? 'linear-gradient(90deg, rgba(249, 115, 22, 0.15) 0%, rgba(124, 45, 18, 0.25) 100%)' 
            : 'linear-gradient(90deg, rgba(239, 68, 68, 0.15) 0%, rgba(127, 29, 29, 0.25) 100%)',
          borderBottom: `2px solid ${todayWellness.statusColor || '#10b981'}`,
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '5px 12px',
              borderRadius: '100px',
              border: `1.5px solid ${todayWellness.statusColor || '#10b981'}`
            }}>
              <span style={{ fontSize: '1.1rem' }}>🧘</span>
              <div>
                <span style={{ 
                  color: todayWellness.statusColor || '#10b981', 
                  fontWeight: 900, 
                  fontSize: '0.84rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {todayWellness.statusLabel || 'Wellness'}
                </span>
                <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '0.88rem', marginLeft: '6px' }}>
                  ({todayWellness.score}/30 pts)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.80rem' }}>
                <span style={{ color: '#94a3b8' }}>🌙 Sono:</span>
                <strong style={{ color: '#ffffff' }}>{todayWellness.sono}/10</strong>
                <div style={{ width: '40px', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(todayWellness.sono / 10) * 100}%`, height: '100%', background: '#38bdf8' }}></div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.80rem' }}>
                <span style={{ color: '#94a3b8' }}>⚡ Fadiga:</span>
                <strong style={{ color: '#ffffff' }}>{todayWellness.fadiga}/10</strong>
                <div style={{ width: '40px', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(todayWellness.fadiga / 10) * 100}%`, height: '100%', background: '#f59e0b' }}></div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.80rem' }}>
                <span style={{ color: '#94a3b8' }}>🩺 Dor:</span>
                <strong style={{ color: '#ffffff' }}>{todayWellness.dorMuscular}/10</strong>
                <div style={{ width: '40px', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(todayWellness.dorMuscular / 10) * 100}%`, height: '100%', background: '#ef4444' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: `1px solid ${todayWellness.statusColor || '#10b981'}`,
              color: '#ffffff',
              padding: '5px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: `0 0 12px ${todayWellness.statusColor ? todayWellness.statusColor + '33' : 'rgba(16,185,129,0.2)'}`
            }}>
              <span>👉 Conduta:</span>
              <span style={{ color: todayWellness.statusColor || '#10b981' }}>{todayWellness.conduta || 'Treino Liberado'}</span>
            </div>

            <button
              type="button"
              onClick={() => setShowWellnessModal(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1',
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Revisar questionário Wellness deste atendimento"
            >
              <i className="fa-solid fa-pen-to-square" style={{ marginRight: '4px' }}></i>
              Editar
            </button>
          </div>
        </div>
      )}

      {/* ⚠️ Banner Alerta de Wellness Pendente (Apenas se o aluno tem agendamento ativo no horário) */}
      {!todayWellness && activeAppointment && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.18) 0%, rgba(180, 83, 9, 0.28) 100%)',
          borderBottom: '2px solid #f59e0b',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 2px 10px rgba(245, 158, 11, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.25)',
              border: '1.5px solid #f59e0b',
              color: '#fbbf24',
              fontSize: '1rem'
            }}>
              <i className="fa-solid fa-heart-pulse"></i>
            </span>
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#fef3c7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Wellness Pendente para o Atendimento das {activeAppointment.horario}</span>
                <span style={{
                  fontSize: '0.68rem',
                  background: 'rgba(245, 158, 11, 0.3)',
                  color: '#fbbf24',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid rgba(245, 158, 11, 0.5)',
                  fontWeight: 700
                }}>
                  {activeAppointment.servico || 'Treino'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#fde68a' }}>
                O questionário diário de prontidão ainda não foi respondido para este horário. Registre para balizar carga, fadiga e dor muscular.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowWellnessModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '7px 16px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(245, 158, 11, 0.4)',
              transition: 'all 0.15s ease'
            }}
          >
            <i className="fa-solid fa-heart-pulse"></i>
            <span>Responder Teste Wellness</span>
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        <div style={{
          width: '380px',
          background: '#0d1322',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>
                <i className="fa-solid fa-plus-circle" style={{ color: '#10b981', marginRight: '6px' }}></i> Adicionar Exercício
              </span>
              <span style={{ fontSize: '0.74rem', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '100px', color: '#94a3b8' }}>
                {filteredExercises.length} disponíveis
              </span>
            </div>

            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por nome ou grupo muscular..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.84rem'
                }}
              />
              <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.8rem' }}></i>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  &times;
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {muscles.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMuscle(m)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '100px',
                    border: '1px solid',
                    borderColor: selectedMuscle === m ? '#10b981' : 'rgba(255,255,255,0.08)',
                    background: selectedMuscle === m ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                    color: selectedMuscle === m ? '#10b981' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.74rem',
                    fontWeight: selectedMuscle === m ? 800 : 500,
                    transition: 'all 0.15s'
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredExercises.map(ex => (
              <div
                key={ex._id}
                style={{
                  padding: '10px 14px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div 
                    style={{ 
                      fontWeight: 700, 
                      fontSize: '0.86rem', 
                      color: '#f1f5f9', 
                      whiteSpace: 'normal', 
                      wordBreak: 'break-word', 
                      lineHeight: '1.35' 
                    }}
                    title={ex.nome}
                  >
                    {ex.nome}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginTop: '2px' }}>
                    {ex.grupo || ex.grupo_muscular || 'Geral'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => addExercise(ex)}
                  title="Adicionar à Ficha"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    transition: 'all 0.2s'
                  }}
                >
                  <i className="fa-solid fa-plus"></i>
                </button>
              </div>
            ))}

            {filteredExercises.length === 0 && (
              <div style={{ textAlign: 'center', color: '#64748b', marginTop: '50px', padding: '0 20px' }}>
                <i className="fa-solid fa-dumbbell" style={{ fontSize: '2rem', opacity: 0.3, marginBottom: '10px', display: 'block' }}></i>
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Nenhum exercício encontrado</div>
                <small style={{ color: '#475569' }}>Tente outro filtro muscular ou termo de busca</small>
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, padding: '24px 32px 140px 32px', overflowY: 'auto', background: '#070b14' }}>
          <div style={{ maxWidth: '1050px', margin: '0 auto' }}>
            
            {/* 🌟 Informação Clara do Último Treino Executado pelo Aluno */}
            {lastWorkoutInfo && (
              <div style={{
                background: lastWorkoutInfo.isLivre ? 'linear-gradient(90deg, rgba(56, 189, 248, 0.08) 0%, rgba(13, 19, 34, 0.6) 100%)' : 'linear-gradient(90deg, rgba(16, 185, 129, 0.08) 0%, rgba(13, 19, 34, 0.6) 100%)',
                border: lastWorkoutInfo.isLivre ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
                borderLeft: lastWorkoutInfo.isLivre ? '4px solid #38bdf8' : '4px solid #10b981',
                borderRadius: '12px',
                padding: '10px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: lastWorkoutInfo.isLivre ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: lastWorkoutInfo.isLivre ? '#38bdf8' : '#10b981'
                  }}>
                    <i className={lastWorkoutInfo.isLivre ? 'fa-solid fa-person-walking' : 'fa-solid fa-dumbbell'}></i>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: lastWorkoutInfo.isLivre ? '#38bdf8' : '#10b981', letterSpacing: '0.5px' }}>
                      Último Treino Realizado pelo Aluno
                    </div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f8fafc' }}>
                      {lastWorkoutInfo.label}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    padding: '4px 12px',
                    fontSize: '0.78rem',
                    color: '#cbd5e1',
                    fontWeight: 700
                  }}>
                    <i className="fa-regular fa-clock" style={{ marginRight: '6px', color: '#94a3b8' }}></i>
                    {lastWorkoutInfo.detail}
                  </span>
                </div>
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '14px',
              background: '#0d1322',
              padding: '12px 18px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#94a3b8', marginRight: '4px' }}>
                  FICHAS:
                </span>
                {visibleSheets.map((sheet: any) => {
                  const letter = (sheet.id || 'A').toUpperCase();
                  const isSelected = activeTabLetter?.toUpperCase() === letter;
                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => handleChangeSheet(letter)}
                      style={{
                        padding: '7px 18px',
                        borderRadius: '8px',
                        border: isSelected ? '1.5px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                        background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                        color: isSelected ? '#10b981' : '#94a3b8',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        boxShadow: isSelected ? '0 0 15px rgba(16, 185, 129, 0.25)' : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      {sheet.nome || `Ficha ${letter}`}
                    </button>
                  );
                })}

                {/* Botão + para Adicionar Nova Ficha com Letra */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAddFichaModal(true);
                    setNewFichaLetter('');
                    setAddFichaError('');
                  }}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px dashed rgba(16, 185, 129, 0.5)',
                    background: 'rgba(16, 185, 129, 0.08)',
                    color: '#34d399',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.2s'
                  }}
                  title="Criar nova ficha com letra personalizada"
                >
                  <i className="fa-solid fa-plus"></i>
                  <span>Ficha</span>
                </button>
              </div>

              <div style={{
                display: 'flex',
                background: 'rgba(0, 0, 0, 0.4)',
                padding: '4px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory('fichasMonitorado');
                    const sheets = rawWorkoutDoc?.['fichasMonitorado'] || [];
                    const firstWithEx = sheets.find((s: any) => s.exercicios?.length > 0) || sheets[0] || { id: 'A' };
                    handleChangeSheet(firstWithEx.id || 'A', 'fichasMonitorado');
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '7px',
                    border: 'none',
                    background: activeCategory === 'fichasMonitorado' ? '#10b981' : 'transparent',
                    color: activeCategory === 'fichasMonitorado' ? '#ffffff' : '#94a3b8',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <i className="fa-solid fa-user-shield" style={{ marginRight: '6px' }}></i>
                  Treino Monitorado
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory('fichasLivre');
                    const sheets = rawWorkoutDoc?.['fichasLivre'] || [];
                    const firstWithEx = sheets.find((s: any) => s.exercicios?.length > 0) || sheets[0] || { id: 'A' };
                    handleChangeSheet(firstWithEx.id || 'A', 'fichasLivre');
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '7px',
                    border: 'none',
                    background: activeCategory === 'fichasLivre' ? '#38bdf8' : 'transparent',
                    color: activeCategory === 'fichasLivre' ? '#ffffff' : '#94a3b8',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <i className="fa-solid fa-person-running" style={{ marginRight: '6px' }}></i>
                  Treino Livre
                </button>
              </div>
            </div>

            {/* ⚠️ Banner para Ficha sem Validade Informada (Legada) */}
            {!workoutValidade && (
              <div style={{
                background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.16) 0%, rgba(217, 119, 6, 0.24) 100%)',
                border: '1.5px solid rgba(245, 158, 11, 0.5)',
                borderRadius: '12px',
                padding: '14px 20px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.15)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.25)',
                    border: '1px solid #f59e0b',
                    color: '#fbbf24',
                    fontSize: '1.1rem'
                  }}>
                    <i className="fa-solid fa-triangle-exclamation"></i>
                  </span>
                  <div>
                    <div style={{ fontWeight: 800, color: '#fef3c7', fontSize: '0.92rem' }}>
                      Ficha sem validade informada
                    </div>
                    <div style={{ color: '#fde68a', fontSize: '0.80rem', marginTop: '2px' }}>
                      Por favor, defina a validade deste treino para ativar o acompanhamento de ciclo e a contagem regressiva:
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {[15, 30, 60].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => handleSetValidade(days)}
                      style={{
                        padding: '8px 18px',
                        borderRadius: '8px',
                        border: '1.5px solid #f59e0b',
                        background: 'rgba(245, 158, 11, 0.25)',
                        color: '#ffffff',
                        fontWeight: 850,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#f59e0b';
                        e.currentTarget.style.color = '#000000';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(245, 158, 11, 0.25)';
                        e.currentTarget.style.color = '#ffffff';
                      }}
                    >
                      ⏱️ {days} dias
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <label style={{ fontWeight: 700, fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  NOME DA FICHA
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={workoutName} 
                  onChange={e => {
                    const newName = e.target.value;
                    setWorkoutName(newName);
                    triggerDebouncedAutoSave(workoutItems, newName);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    background: '#0d1322',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.9rem'
                  }} 
                />
              </div>

              <div style={{ flex: 2, minWidth: '260px' }}>
                <label style={{ fontWeight: 700, fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  OBSERVAÇÕES GERAIS / FOCO DO TREINO
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ex: Foco em Hipertrofia Peitoral e Deltoide Anterior • Intervalos estritos" 
                  value={workoutGoal} 
                  onChange={e => {
                    const newGoal = e.target.value;
                    setWorkoutGoal(newGoal);
                    triggerDebouncedAutoSave(workoutItems, workoutName, newGoal);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    background: '#0d1322',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.9rem'
                  }} 
                />
              </div>

              {/* 🌟 Campo de Validade da Ficha */}
              <div style={{ width: '280px', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                    VALIDADE DA FICHA
                  </label>
                  {workoutValidade && workoutDataExpiracao && (() => {
                    const expD = new Date(workoutDataExpiracao + 'T12:00:00');
                    const diff = Math.ceil((expD.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    const isExp = diff <= 0;
                    const isSoon = diff > 0 && diff <= 7;
                    const formattedExp = workoutDataExpiracao.split('-').reverse().join('/');
                    return (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: isExp ? '#ef4444' : isSoon ? '#fbbf24' : '#10b981'
                      }} title={`Expira em ${formattedExp}`}>
                        {isExp ? `Vencida há ${Math.abs(diff)}d` : isSoon ? `Vence em ${diff}d (${formattedExp})` : `Vigente (${diff}d • ${formattedExp})`}
                      </span>
                    );
                  })()}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[15, 30, 60].map(days => {
                    const isSel = workoutValidade === days;
                    return (
                      <button
                        key={days}
                        type="button"
                        onClick={() => handleSetValidade(days)}
                        style={{
                          flex: 1,
                          padding: '8px 6px',
                          borderRadius: '8px',
                          border: isSel ? '1.5px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                          background: isSel ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                          color: isSel ? '#34d399' : '#94a3b8',
                          fontWeight: isSel ? 850 : 600,
                          fontSize: '0.80rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        ⏱️ {days} dias
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{
              background: '#0d1322',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'visible',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
            }}>
              
              <div style={{
                padding: '16px 22px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-list-check" style={{ color: '#10b981', fontSize: '1.1rem' }}></i>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                    Exercícios da {workoutName} ({activeCategory === 'fichasMonitorado' ? 'Monitorado' : 'Livre'})
                  </h3>
                </div>
                <span style={{ 
                  background: 'rgba(16, 185, 129, 0.15)', 
                  color: '#10b981', 
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '4px 12px',
                  borderRadius: '100px',
                  fontSize: '0.78rem',
                  fontWeight: 800
                }}>
                  {workoutItems.length} EXERCÍCIOS
                </span>
              </div>
              
              <datalist id="unidades-carga-list">
                <option value="kg" />
                <option value="lbs" />
                <option value="Livre" />
                <option value="placas" />
                <option value="barra" />
              </datalist>

              {workoutItems.length > 0 && !isLoading && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(200px, 2fr) 60px 70px 85px 175px 65px 50px 110px 95px',
                  gap: '8px',
                  padding: '10px 20px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: '#64748b',
                  letterSpacing: '0.5px'
                }}>
                  <div>EXERCÍCIO</div>
                  <div style={{ textAlign: 'center' }}>SÉRIES</div>
                  <div style={{ textAlign: 'center' }}>REPS</div>
                  <div style={{ textAlign: 'center' }}>RITMO</div>
                  <div style={{ textAlign: 'center' }}>CARGA</div>
                  <div style={{ textAlign: 'center' }}>DESC.</div>
                  <div style={{ textAlign: 'center' }}>OBS</div>
                  <div style={{ textAlign: 'center' }}>COMBINAR</div>
                  <div style={{ textAlign: 'center' }}>AÇÕES</div>
                </div>
              )}

              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {isLoading ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#10b981', marginBottom: '16px', display: 'block' }}></i>
                    <p style={{ margin: 0, fontWeight: 800, color: '#ffffff', fontSize: '1rem' }}>Carregando ficha de treino do aluno...</p>
                    <small style={{ color: '#64748b' }}>Sincronizando exercícios, cargas e Wellness</small>
                  </div>
                ) : workoutItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                    <i className="fa-solid fa-dumbbell" style={{ fontSize: '2.5rem', opacity: 0.3, marginBottom: '12px', display: 'block' }}></i>
                    <p style={{ margin: 0, fontWeight: 700, color: '#94a3b8', fontSize: '0.95rem' }}>Esta ficha ainda não possui exercícios cadastrados.</p>
                    <small style={{ color: '#475569' }}>Selecione exercícios na barra lateral à esquerda para adicionar.</small>
                  </div>
                ) : (
                  workoutItems.map((item, index) => {
                    const groupColor = getGroupColor(item.combinaGrupo);
                    const isGrouped = Boolean(item.combinaGrupo);
                    const hasDrop = item.dropSet && item.dropSet.tipo && item.dropSet.tipo !== 'none' && Array.isArray(item.dropSet.drops) && item.dropSet.drops.length > 0;
                    const loadProg = getExerciseLoadProgression(item.historicoCargas);

                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          padding: '10px 14px',
                          background: isGrouped ? 'rgba(255, 255, 255, 0.03)' : hasDrop ? 'rgba(245, 158, 11, 0.02)' : 'rgba(255, 255, 255, 0.015)',
                          borderRadius: '10px',
                          border: hasDrop ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                          borderLeft: isGrouped ? `4px solid ${groupColor}` : hasDrop ? '4px solid #f59e0b' : '4px solid transparent',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(200px, 2fr) 60px 70px 85px 175px 65px 50px 110px 95px',
                            gap: '8px',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                            <span style={{ 
                              fontSize: '0.8rem', 
                              fontWeight: 800, 
                              color: '#64748b', 
                              width: '18px' 
                            }}>
                              {index + 1}
                            </span>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f8fafc' }}>
                                  {item.nome}
                                </span>
                                {item.combinaGrupo && (
                                  <span style={{
                                    background: groupColor,
                                    color: item.combinaGrupo === 'G5' ? '#000' : '#fff',
                                    fontSize: '0.65rem',
                                    fontWeight: 900,
                                    padding: '1px 6px',
                                    borderRadius: '4px'
                                  }}>
                                    {item.combinaGrupo}
                                  </span>
                                )}
                                {hasDrop && (
                                  <span style={{
                                    background: '#f59e0b',
                                    color: '#000',
                                    fontSize: '0.62rem',
                                    fontWeight: 900,
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    textTransform: 'uppercase'
                                  }}>
                                    {item.dropSet!.tipo === 'single' ? '1 Drop' : item.dropSet!.tipo === 'double' ? 'Double Drop' : 'Triple Drop'}
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                                <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                                  {item.grupo}
                                </div>
                                {loadProg && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedProgressionItem(item)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '1px 7px',
                                      borderRadius: '6px',
                                      background: loadProg.diff >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                      border: `1px solid ${loadProg.diff >= 0 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                                      color: loadProg.diff >= 0 ? '#34d399' : '#f87171',
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease'
                                    }}
                                    title="Clique para ver a evolução de carga deste exercício ao longo do tempo"
                                  >
                                    <i className="fa-solid fa-arrow-trend-up"></i>
                                    <span>{loadProg.diff >= 0 ? `+${loadProg.diff}` : loadProg.diff} {loadProg.unit} em {loadProg.dias}d</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              value={item.series}
                              onChange={e => updateItem(item.id, 'series', Number(e.target.value))}
                              style={{
                                width: '100%',
                                height: '36px',
                                textAlign: 'center',
                                padding: '0 4px',
                                background: '#070b14',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#fff',
                                borderRadius: '7px',
                                fontWeight: 700,
                                fontSize: '0.85rem'
                              }}
                            />
                          </div>

                          <div>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={item.reps}
                              onChange={e => updateItem(item.id, 'reps', e.target.value)}
                              placeholder="12"
                              style={{
                                width: '100%',
                                height: '36px',
                                textAlign: 'center',
                                padding: '0 4px',
                                background: '#070b14',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#fff',
                                borderRadius: '7px',
                                fontWeight: 700,
                                fontSize: '0.85rem'
                              }}
                            />
                          </div>

                          <div>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={item.ritmo || ''}
                              onChange={e => updateItem(item.id, 'ritmo', e.target.value)}
                              placeholder="Ritmo..."
                              title="Ritmo / Cadência: livre escrita (Ex: 2-0-2-0, Controlado, Isometria...)"
                              style={{
                                width: '100%',
                                height: '36px',
                                textAlign: 'center',
                                padding: '0 6px',
                                background: '#070b14',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                color: '#38bdf8',
                                borderRadius: '7px',
                                fontWeight: 700,
                                fontSize: '0.78rem'
                              }}
                            />
                          </div>

                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '3px', width: '100%', height: '36px' }}>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              value={item.carga !== undefined && item.carga !== null ? item.carga : ''}
                              onChange={e => {
                                const valStr = e.target.value;
                                const newCarga = valStr === '' ? '' : Number(valStr);
                                updateItem(item.id, 'carga', newCarga);
                                if (item.dropSet && item.dropSet.tipo !== 'none') {
                                  const drops = calculateDropSuggestions(typeof newCarga === 'number' ? newCarga : 0, item.dropSet.tipo);
                                  setWorkoutItems(prev => prev.map(it => it.id === item.id ? { ...it, carga: newCarga, dropSet: { ...it.dropSet!, drops } } : it));
                                }
                              }}
                              placeholder="0"
                              style={{
                                width: '48px',
                                height: '36px',
                                textAlign: 'center',
                                padding: '0 2px',
                                background: '#070b14',
                                border: hasDrop ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                                color: hasDrop ? '#f59e0b' : '#10b981',
                                borderRadius: '7px',
                                fontWeight: 700,
                                fontSize: '0.84rem'
                              }}
                            />
                            <input
                              type="text"
                              list="unidades-carga-list"
                              className="form-control form-control-sm"
                              value={item.unidadeCarga || ''}
                              onChange={e => updateItem(item.id, 'unidadeCarga', e.target.value)}
                              placeholder="Unid"
                              title="Unidade de medida da carga (ex: kg, lbs, Livre, placas - campo livre)"
                              style={{
                                width: '44px',
                                height: '36px',
                                textAlign: 'center',
                                padding: '0 2px',
                                background: '#070b14',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#cbd5e1',
                                borderRadius: '7px',
                                fontWeight: 700,
                                fontSize: '0.74rem'
                              }}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropMenuId(activeDropMenuId === item.id ? null : item.id);
                              }}
                              title={hasDrop ? "Alterar ou remover Drop-set" : "Configurar Drop-set"}
                              style={{
                                flex: 1,
                                height: '36px',
                                padding: '0 4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                                borderRadius: '7px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                background: hasDrop ? 'rgba(245, 158, 11, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                                border: hasDrop ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                                color: hasDrop ? '#fbbf24' : '#94a3b8',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {hasDrop ? (
                                <>
                                  <i className="fa-solid fa-bolt" style={{ fontSize: '0.65rem' }}></i>
                                  <span>{item.dropSet!.tipo === 'single' ? '1 Drop' : item.dropSet!.tipo === 'double' ? '2 Drops' : '3 Drops'}</span>
                                </>
                              ) : (
                                <>
                                  <i className="fa-solid fa-plus" style={{ fontSize: '0.6rem', opacity: 0.7 }}></i>
                                  <span>Drop</span>
                                </>
                              )}
                            </button>

                            {activeDropMenuId === item.id && (() => {
                              const openUpwards = workoutItems.length <= 3 || index >= workoutItems.length - 2;
                              return (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    position: 'absolute',
                                    top: openUpwards ? 'auto' : '40px',
                                    bottom: openUpwards ? '42px' : 'auto',
                                    right: 0,
                                    zIndex: 99999,
                                    background: '#0a0f1d',
                                    border: '1px solid rgba(245, 158, 11, 0.4)',
                                    boxShadow: '0 16px 36px rgba(0,0,0,0.95), 0 0 15px rgba(245, 158, 11, 0.15)',
                                    borderRadius: '8px',
                                    padding: '4px',
                                    minWidth: '150px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px',
                                    backdropFilter: 'blur(12px)'
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleSetDropTipo(item.id, 'none');
                                      setActiveDropMenuId(null);
                                    }}
                                    style={{
                                      textAlign: 'left',
                                      padding: '6px 10px',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      borderRadius: '5px',
                                      background: (!item.dropSet || item.dropSet.tipo === 'none') ? 'rgba(255,255,255,0.08)' : 'transparent',
                                      color: '#94a3b8',
                                      border: 'none',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}
                                  >
                                    <i className="fa-solid fa-ban" style={{ fontSize: '0.7rem', color: '#64748b' }}></i>
                                    Sem Drop-set
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleSetDropTipo(item.id, 'single');
                                      setActiveDropMenuId(null);
                                    }}
                                    style={{
                                      textAlign: 'left',
                                      padding: '6px 10px',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      borderRadius: '5px',
                                      background: item.dropSet?.tipo === 'single' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                                      color: item.dropSet?.tipo === 'single' ? '#fbbf24' : '#f8fafc',
                                      border: 'none',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}
                                  >
                                    <span style={{ color: '#f59e0b', fontWeight: 900 }}>⚡ 1</span> Drop (Single)
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleSetDropTipo(item.id, 'double');
                                      setActiveDropMenuId(null);
                                    }}
                                    style={{
                                      textAlign: 'left',
                                      padding: '6px 10px',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      borderRadius: '5px',
                                      background: item.dropSet?.tipo === 'double' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                                      color: item.dropSet?.tipo === 'double' ? '#fbbf24' : '#f8fafc',
                                      border: 'none',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}
                                  >
                                    <span style={{ color: '#f59e0b', fontWeight: 900 }}>⚡ 2</span> Drops (Double)
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleSetDropTipo(item.id, 'triple');
                                      setActiveDropMenuId(null);
                                    }}
                                    style={{
                                      textAlign: 'left',
                                      padding: '6px 10px',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      borderRadius: '5px',
                                      background: item.dropSet?.tipo === 'triple' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                                      color: item.dropSet?.tipo === 'triple' ? '#fbbf24' : '#f8fafc',
                                      border: 'none',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px'
                                    }}
                                  >
                                    <span style={{ color: '#f59e0b', fontWeight: 900 }}>⚡ 3</span> Drops (Triple)
                                  </button>
                                </div>
                              );
                            })()}
                          </div>

                          <div>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              value={item.descanso}
                              onChange={e => updateItem(item.id, 'descanso', Number(e.target.value))}
                              placeholder="60"
                              style={{
                                width: '100%',
                                height: '36px',
                                textAlign: 'center',
                                padding: '0 4px',
                                background: '#070b14',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#fff',
                                borderRadius: '7px',
                                fontWeight: 700,
                                fontSize: '0.85rem'
                              }}
                            />
                          </div>

                          <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '36px' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveObsModalItem(item);
                                setTempObsText(item.observacao || '');
                              }}
                              title={item.observacao ? `Obs: ${item.observacao}` : 'Adicionar observação técnica'}
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '7px',
                                border: item.observacao ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                                background: item.observacao ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                color: item.observacao ? '#38bdf8' : '#94a3b8',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <i className="fa-solid fa-comment-dots"></i>
                            </button>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', height: '36px' }}>
                            {(() => {
                              const usedGroups = workoutItems.map(w => w.combinaGrupo).filter(Boolean);
                              let maxGroupNum = 0;
                              usedGroups.forEach((g: string) => {
                                const match = g.match(/^G(\d+)$/i);
                                if (match) {
                                  const num = parseInt(match[1], 10);
                                  if (num > maxGroupNum) maxGroupNum = num;
                                }
                              });
                              const dynamicOptions = [
                                { id: '', label: 'Individual' },
                                ...Array.from({ length: Math.max(1, maxGroupNum + 1) }, (_, i) => {
                                  const id = `G${i + 1}`;
                                  const p = GROUP_PALETTE[i % GROUP_PALETTE.length];
                                  return { id, label: `${id} (${p.name})` };
                                })
                              ];

                              return (
                                <select
                                  value={item.combinaGrupo || ''}
                                  onChange={e => updateItem(item.id, 'combinaGrupo', e.target.value)}
                                  style={{
                                    width: '100%',
                                    height: '36px',
                                    padding: '0 6px',
                                    borderRadius: '7px',
                                    border: item.combinaGrupo ? `1.5px solid ${groupColor}` : '1px solid rgba(255, 255, 255, 0.1)',
                                    background: item.combinaGrupo ? `${groupColor}22` : '#070b14',
                                    color: item.combinaGrupo ? '#ffffff' : '#94a3b8',
                                    fontSize: '0.74rem',
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {dynamicOptions.map(g => (
                                    <option key={g.id} value={g.id} style={{ background: '#0d1322', color: '#fff' }}>
                                      {g.label}
                                    </option>
                                  ))}
                                </select>
                              );
                            })()}
                          </div>

                          <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', alignItems: 'center', height: '36px' }}>
                            <button
                              type="button"
                              onClick={() => moveItem(index, 'up')}
                              disabled={index === 0}
                              title="Subir"
                              style={{
                                width: '22px',
                                height: '36px',
                                padding: 0,
                                background: 'transparent',
                                border: 'none',
                                color: index === 0 ? '#334155' : '#94a3b8',
                                cursor: index === 0 ? 'default' : 'pointer',
                                fontSize: '0.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <i className="fa-solid fa-chevron-up"></i>
                            </button>

                            <button
                              type="button"
                              onClick={() => moveItem(index, 'down')}
                              disabled={index === workoutItems.length - 1}
                              title="Descer"
                              style={{
                                width: '22px',
                                height: '36px',
                                padding: 0,
                                background: 'transparent',
                                border: 'none',
                                color: index === workoutItems.length - 1 ? '#334155' : '#94a3b8',
                                cursor: index === workoutItems.length - 1 ? 'default' : 'pointer',
                                fontSize: '0.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <i className="fa-solid fa-chevron-down"></i>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSubstitutingItem({
                                  id: item.id,
                                  index,
                                  nome: item.nome,
                                  combinaGrupo: item.combinaGrupo || '',
                                  grupo: item.grupo || 'Geral'
                                });
                                setSubstituteSearch('');
                                setSubstituteMuscle(item.grupo && muscles.includes(item.grupo) ? item.grupo : 'Todos');
                              }}
                              title="Substituir Exercício (mantém a posição e a combinação G1 ativada)"
                              style={{
                                width: '22px',
                                height: '36px',
                                padding: 0,
                                background: 'transparent',
                                border: 'none',
                                color: '#38bdf8',
                                cursor: 'pointer',
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'color 0.15s'
                              }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#7dd3fc')}
                              onMouseLeave={e => (e.currentTarget.style.color = '#38bdf8')}
                            >
                              <i className="fa-solid fa-arrows-rotate"></i>
                            </button>

                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              title="Excluir Exercício"
                              style={{
                                width: '22px',
                                height: '36px',
                                padding: 0,
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                        </div>

                        {/* Drop-set Sub-Row if active */}
                        {hasDrop && item.dropSet && (
                          <div style={{
                            marginTop: '4px',
                            padding: '6px 12px',
                            background: 'rgba(245, 158, 11, 0.08)',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '8px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <i className="fa-solid fa-layer-group"></i> {item.dropSet.tipo === 'single' ? 'Single Drop' : item.dropSet.tipo === 'double' ? 'Double Drop' : 'Triple Drop'}:
                              </span>
                              
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Base: <strong style={{ color: '#fff' }}>{item.carga}{item.unidadeCarga || ''}</strong></span>
                              
                              {item.dropSet.drops.map((dropVal: any, dIdx: number) => (
                                <div key={dIdx} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 800 }}>→</span>
                                  <label style={{ fontSize: '0.65rem', color: '#fbbf24', fontWeight: 700 }}>Drop {dIdx + 1}:</label>
                                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    <input
                                      type="number"
                                      value={dropVal}
                                      onChange={e => handleUpdateDropValue(item.id, dIdx, Number(e.target.value))}
                                      style={{
                                        width: '54px',
                                        padding: '2px 4px',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        textAlign: 'center',
                                        background: '#070b14',
                                        border: '1px solid rgba(245, 158, 11, 0.4)',
                                        color: '#fbbf24',
                                        borderRadius: '4px'
                                      }}
                                    />
                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: '3px' }}>{item.unidadeCarga || ''}</span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleToggleDropEscopo(item.id, 'ultima_serie')}
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.65rem',
                                    fontWeight: item.dropSet.escopo === 'ultima_serie' ? 800 : 500,
                                    background: item.dropSet.escopo === 'ultima_serie' ? '#f59e0b' : 'rgba(255,255,255,0.05)',
                                    color: item.dropSet.escopo === 'ultima_serie' ? '#000' : '#94a3b8',
                                    border: 'none',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Última série
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleDropEscopo(item.id, 'todas_series')}
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.65rem',
                                    fontWeight: item.dropSet.escopo === 'todas_series' ? 800 : 500,
                                    background: item.dropSet.escopo === 'todas_series' ? '#f59e0b' : 'rgba(255,255,255,0.05)',
                                    color: item.dropSet.escopo === 'todas_series' ? '#000' : '#94a3b8',
                                    border: 'none',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Todas as séries
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleSetDropTipo(item.id, 'none')}
                                title="Remover Drop-set"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontSize: '0.78rem',
                                  padding: '2px 4px'
                                }}
                              >
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

      {activeObsModalItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(6px)',
          zIndex: 10000001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }} onClick={() => setActiveObsModalItem(null)}>
          <div style={{
            background: '#0d1322',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#38bdf8' }}>
                <i className="fa-solid fa-comment-medical" style={{ marginRight: '8px' }}></i>
                Observações Técnicas • {activeObsModalItem.nome}
              </h4>
              <button onClick={() => setActiveObsModalItem(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>&times;</button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.76rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                SUGESTÕES DE MÉTODOS E TÉCNICAS RÁPIDAS:
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {TECHNIQUE_PRESETS.map(tech => (
                  <button
                    key={tech}
                    type="button"
                    onClick={() => {
                      setTempObsText(prev => prev ? `${prev} • ${tech}` : tech);
                    }}
                    style={{
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      padding: '4px 10px',
                      borderRadius: '100px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    + {tech}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.76rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                INSTRUÇÃO BIOMECÂNICA PERSONALIZADA:
              </label>
              <FastTextarea
                className="form-control"
                rows={3}
                value={tempObsText}
                onChange={val => setTempObsText(val)}
                placeholder="Ex: Manter cotovelos alinhados, fazer pico de contração de 2 segundos..."
                style={{
                  width: '100%',
                  background: '#070b14',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '0.86rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActiveObsModalItem(null)}
                style={{ padding: '6px 14px', fontSize: '0.84rem' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  updateItem(activeObsModalItem.id, 'observacao', tempObsText);
                  setActiveObsModalItem(null);
                }}
                style={{
                  padding: '6px 18px',
                  background: '#10b981',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  borderRadius: '8px'
                }}
              >
                Salvar Observação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 Modal de Substituição de Exercício */}
      {substitutingItem && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000000,
            padding: '20px'
          }}
          onClick={() => setSubstitutingItem(null)}
        >
          <div
            style={{
              background: '#0d1322',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 25px rgba(56, 189, 248, 0.15)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.08) 0%, transparent 100%)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-arrows-rotate" style={{ color: '#38bdf8', fontSize: '1.1rem' }}></i>
                  <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.05rem', fontWeight: 800 }}>
                    Substituir Exercício
                  </h3>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                  Substituindo <strong style={{ color: '#f8fafc' }}>"{substitutingItem.nome}"</strong> (Posição #{substitutingItem.index + 1})
                  {substitutingItem.combinaGrupo && (
                    <span style={{
                      marginLeft: '8px',
                      background: getGroupColor(substitutingItem.combinaGrupo),
                      color: substitutingItem.combinaGrupo === 'G5' ? '#000' : '#fff',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {substitutingItem.combinaGrupo} Ativo
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSubstitutingItem(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  lineHeight: 1
                }}
              >
                &times;
              </button>
            </div>

            {/* Busca & Filtros Musculares */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <input
                  type="text"
                  autoFocus
                  className="form-control"
                  placeholder="Buscar exercício substituto..."
                  value={substituteSearch}
                  onChange={e => setSubstituteSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.86rem'
                  }}
                />
                <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.8rem' }}></i>
              </div>

              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {muscles.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSubstituteMuscle(m)}
                    style={{
                      padding: '3px 9px',
                      borderRadius: '100px',
                      border: '1px solid',
                      borderColor: substituteMuscle === m ? '#38bdf8' : 'rgba(255,255,255,0.08)',
                      background: substituteMuscle === m ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)',
                      color: substituteMuscle === m ? '#38bdf8' : '#94a3b8',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontWeight: substituteMuscle === m ? 800 : 500,
                      transition: 'all 0.15s'
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de Exercícios Filtrados */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {substituteFilteredExercises.slice(0, 50).map(ex => (
                <button
                  key={ex._id}
                  type="button"
                  onClick={() => handleSubstituteExercise(substitutingItem.id, ex)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)';
                    e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '10px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#f8fafc', whiteSpace: 'normal' }}>
                      {ex.nome}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', marginTop: '2px' }}>
                      {ex.grupo || ex.grupo_muscular || 'Geral'}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    color: '#38bdf8',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    flexShrink: 0
                  }}>
                    Substituir
                  </span>
                </button>
              ))}

              {substituteFilteredExercises.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b' }}>
                  Nenhum exercício encontrado com esses filtros.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ Modal de Confirmação para Alterações Não Salvas */}
      {showUnsavedModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          zIndex: 20000000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(150deg, #131d31 0%, #0c1322 100%)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '16px',
            padding: '24px 28px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 25px rgba(245, 158, 11, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
                fontSize: '1.4rem',
                flexShrink: 0
              }}>
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.15rem', fontWeight: 800 }}>
                  Alterações não salvas na Ficha
                </h3>
                <p style={{ margin: '3px 0 0 0', color: '#94a3b8', fontSize: '0.84rem' }}>
                  Você editou a ficha de <strong>{realClientName || 'Aluno'}</strong> e ainda não salvou.
                </p>
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '0.84rem',
              color: '#cbd5e1'
            }}>
              Deseja salvar as alterações de <strong>{workoutName}</strong> antes de alternar para a ficha de <strong>{pendingTargetClient?.name}</strong>?
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelSwitch}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#cbd5e1',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDiscardAndSwitch}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  cursor: 'pointer'
                }}
              >
                <i className="fa-solid fa-trash" style={{ marginRight: '6px' }}></i> Descartar
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveAndSwitch}
                disabled={isSaving}
                style={{
                  padding: '9px 20px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                }}
              >
                <i className="fa-solid fa-floppy-disk" style={{ marginRight: '6px' }}></i> {isSaving ? 'Salvando...' : 'Salvar e Trocar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 Modal para Adicionar Nova Ficha com Letra Personalizada */}
      {showAddFichaModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          zIndex: 10000000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(150deg, #131d31 0%, #0c1322 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '16px',
            padding: '24px 28px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 25px rgba(16, 185, 129, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-plus-circle" style={{ color: '#10b981' }}></i> Nova Ficha
              </h3>
              <button
                type="button"
                onClick={() => setShowAddFichaModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
              Categoria: <strong style={{ color: activeCategory === 'fichasLivre' ? '#38bdf8' : '#10b981' }}>{activeCategory === 'fichasLivre' ? 'Treino Livre' : 'Treino Monitorado'}</strong>
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                Letra da Ficha (Obrigatório, A-Z):
              </label>
              <input
                type="text"
                autoFocus
                maxLength={1}
                value={newFichaLetter}
                placeholder="Ex: G, C, T..."
                onChange={(e) => {
                  const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1);
                  setNewFichaLetter(val);
                  setAddFichaError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCustomFicha();
                }}
                style={{
                  width: '100%',
                  textAlign: 'center',
                  fontSize: '1.6rem',
                  fontWeight: 900,
                  letterSpacing: '2px',
                  padding: '10px',
                  borderRadius: '10px',
                  border: addFichaError ? '1.5px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.2)',
                  background: '#070b14',
                  color: '#10b981',
                  outline: 'none'
                }}
              />
              {addFichaError && (
                <span style={{ display: 'block', color: '#ef4444', fontSize: '0.78rem', marginTop: '6px', fontWeight: 600 }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '4px' }}></i>
                  {addFichaError}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setShowAddFichaModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#94a3b8',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddCustomFicha}
                disabled={!newFichaLetter}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: newFichaLetter ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  fontWeight: 800,
                  cursor: newFichaLetter ? 'pointer' : 'not-allowed',
                  opacity: newFichaLetter ? 1 : 0.6,
                  boxShadow: newFichaLetter ? '0 4px 14px rgba(16, 185, 129, 0.35)' : 'none'
                }}
              >
                Criar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 Modal de Histórico de Versões / Ciclos */}
      {showHistoryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999999,
          padding: '20px'
        }}>
          <div style={{
            background: '#0d1322',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '18px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7)'
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-clock-rotate-left" style={{ color: '#38bdf8', fontSize: '1.2rem' }}></i>
                <div>
                  <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.1rem', fontWeight: 800 }}>
                    Histórico de Ciclos e Versões
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                    {displayName} • Registro de alterações e snapshots passados
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.3rem',
                  cursor: 'pointer'
                }}
              >
                &times;
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {isLoadingHistory ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.8rem', color: '#38bdf8', marginBottom: '10px' }}></i>
                  <p style={{ margin: 0, fontWeight: 700 }}>Carregando histórico de fichas...</p>
                </div>
              ) : historyList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <i className="fa-solid fa-folder-open" style={{ fontSize: '2rem', opacity: 0.4, marginBottom: '10px' }}></i>
                  <p style={{ margin: 0, fontWeight: 700, color: '#94a3b8' }}>Nenhum ciclo histórico anterior registrado para este aluno.</p>
                  <small style={{ color: '#475569' }}>Novos snapshots são gerados automaticamente a cada atualização de ciclo.</small>
                </div>
              ) : (
                historyList.map((entry, idx) => {
                  const entryDate = entry.createdAt ? new Date(entry.createdAt).toLocaleString('pt-BR') : 'Data não registrada';
                  const monSheets = entry.snapshot?.fichasMonitorado || [];
                  const livSheets = entry.snapshot?.fichasLivre || [];
                  const totalExercises = [...monSheets, ...livSheets].reduce((acc: number, s: any) => acc + (s.exercicios?.length || 0), 0);

                  return (
                    <div
                      key={entry._id || idx}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '12px',
                        padding: '14px 18px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '14px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            background: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '6px'
                          }}>
                            Versão #{historyList.length - idx}
                          </span>
                          <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#f1f5f9' }}>
                            {entry.motivo || 'Atualização de ficha'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '4px' }}>
                          <i className="fa-regular fa-clock" style={{ marginRight: '5px' }}></i>
                          {entryDate}
                          {entry.profissionalNome && (
                            <span style={{ marginLeft: '8px', color: '#cbd5e1' }}>
                              • <i className="fa-solid fa-user-doctor" style={{ marginRight: '4px' }}></i> {entry.profissionalNome}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                          Conteúdo: {monSheets.length} ficha(s) monitoradas, {livSheets.length} ficha(s) livres • {totalExercises} exercícios no snapshot
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          const confirmRestore = window.confirm(`Deseja restaurar a Versão #${historyList.length - idx} (${entryDate}) como a ficha ativa do aluno? As alterações atuais serão arquivadas.`);
                          if (!confirmRestore) return;

                          try {
                            const res = await fetch('/api/workouts', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                clientId: currentClientId,
                                action: 'restore',
                                historyId: entry._id,
                                profissionalNome: realClientName ? `Restauração: ${displayName}` : ''
                              })
                            });
                            const data = await res.json();
                            if (data.success) {
                              alert('✨ Ficha de treino restaurada com sucesso!');
                              setShowHistoryModal(false);
                              await loadDataForClient(currentClientId, realClientName, false, activeSlotTime || undefined);
                            } else {
                              alert(data.error || 'Erro ao restaurar versão.');
                            }
                          } catch (err: any) {
                            alert('Erro de conexão ao restaurar: ' + err.message);
                          }
                        }}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: '1px solid rgba(56, 189, 248, 0.4)',
                          background: 'rgba(56, 189, 248, 0.12)',
                          color: '#38bdf8',
                          fontSize: '0.78rem',
                          fontWeight: 750,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <i className="fa-solid fa-arrow-rotate-left"></i>
                        <span>Restaurar esta Versão</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🌟 Modal de Detalhes da Evolução de Carga do Exercício */}
      {selectedProgressionItem && (() => {
        const historico = selectedProgressionItem.historicoCargas || [];
        const progression = getExerciseLoadProgression(historico);

        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999999,
            padding: '20px'
          }}>
            <div style={{
              background: '#0d1322',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '18px',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7)'
            }}>
              <div style={{
                padding: '18px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-arrow-trend-up" style={{ color: '#10b981', fontSize: '1.2rem' }}></i>
                  <div>
                    <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.05rem', fontWeight: 800 }}>
                      Evolução de Carga (Overload Progressivo)
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                      {selectedProgressionItem.nome} • {displayName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProgressionItem(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '1.3rem',
                    cursor: 'pointer'
                  }}
                >
                  &times;
                </button>
              </div>

              <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
                {progression && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '10px',
                    marginBottom: '18px'
                  }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Carga Inicial</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                        {progression.first.carga} {progression.unit}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {progression.first.data ? progression.first.data.split('-').reverse().join('/') : 'Início'}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Carga Atual</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                        {progression.last.carga} {progression.unit}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {progression.last.data ? progression.last.data.split('-').reverse().join('/') : 'Hoje'}
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Progressão</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: progression.diff >= 0 ? '#34d399' : '#f87171', marginTop: '2px' }}>
                        {progression.diff >= 0 ? `+${progression.diff}` : progression.diff} {progression.unit}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        em {progression.dias} dias
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#cbd5e1', marginBottom: '8px' }}>
                  Linha do Tempo dos Registros:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {historico.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '0.82rem', textAlign: 'center', margin: '20px 0' }}>
                      Nenhum histórico de cargas registrado ainda para este exercício.
                    </p>
                  ) : (
                    historico.map((h: any, hIdx: number) => {
                      const prev = hIdx > 0 ? historico[hIdx - 1] : null;
                      const cCurrent = parseFloat(String(h.carga).replace(/[^\d.-]/g, '')) || 0;
                      const cPrev = prev ? (parseFloat(String(prev.carga).replace(/[^\d.-]/g, '')) || 0) : null;
                      const stepDiff = cPrev !== null ? Math.round((cCurrent - cPrev) * 10) / 10 : null;

                      return (
                        <div
                          key={hIdx}
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '10px',
                            padding: '10px 14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 700 }}>
                              #{hIdx + 1}
                            </span>
                            <div>
                              <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.90rem' }}>
                                {h.carga} {h.unidadeCarga || selectedProgressionItem.unidadeCarga || 'kg'}
                                {h.reps ? ` • ${h.reps} reps` : ''}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                                📅 {h.data ? h.data.split('-').reverse().join('/') : 'Data não informada'} • Origem: {h.origem || 'prescrição'}
                              </div>
                            </div>
                          </div>

                          {stepDiff !== null && (
                            <span style={{
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              color: stepDiff >= 0 ? '#34d399' : '#f87171',
                              background: stepDiff >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              padding: '2px 8px',
                              borderRadius: '6px'
                            }}>
                              {stepDiff >= 0 ? `+${stepDiff}` : stepDiff} {h.unidadeCarga || 'kg'}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 🌟 Modal Wellness Integrado na Ficha de Treino */}
      {showWellnessModal && activeAppointment && (
        <WellnessModal
          isOpen={showWellnessModal}
          onClose={() => setShowWellnessModal(false)}
          appointment={activeAppointment}
          clientWorkout={rawWorkoutDoc}
          onConfirm={handleConfirmWellness}
        />
      )}

    </div>
  );
}
