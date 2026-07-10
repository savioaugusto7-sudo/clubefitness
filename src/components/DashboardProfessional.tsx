'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Pagination from './Pagination';
import SearchableSelect from './SearchableSelect';
import WorkoutBuilder from './WorkoutBuilder';
import { downloadReportPDF, downloadAssessmentPDF, downloadProntuarioPDF, downloadUnifiedProntuariosPDF, downloadStrengthTestPDF } from '@/utils/pdfGenerator';
import AgendaCompletaPanel from './AgendaCompletaPanel';

export const STRENGTH_REFERENCE_TABLE: Record<string, Record<string, { M: { min: number, max: number }, F: { min: number, max: number } }>> = {
  "Ombro": {
    "Abdução": { M: { min: 18, max: 25 }, F: { min: 14, max: 20 } },
    "Rotação Externa Neutro": { M: { min: 12, max: 16 }, F: { min: 12, max: 16 } },
    "Rotação Externa 90° de Abdução": { M: { min: 14, max: 18 }, F: { min: 14, max: 18 } }
  },
  "Cotovelo": {
    "Flexão": { M: { min: 20, max: 30 }, F: { min: 15, max: 22 } },
    "Extensão": { M: { min: 15, max: 22 }, F: { min: 10, max: 16 } }
  },
  "Punho": {
    "Flexão": { M: { min: 10, max: 18 }, F: { min: 7, max: 13 } },
    "Extensão": { M: { min: 8, max: 15 }, F: { min: 6, max: 11 } }
  },
  "Tornozelo": {
    "Inversão": { M: { min: 15, max: 22 }, F: { min: 12, max: 18 } },
    "Eversão": { M: { min: 12, max: 18 }, F: { min: 10, max: 15 } },
    "Flexão Plantar": { M: { min: 40, max: 55 }, F: { min: 30, max: 45 } }
  },
  "Joelho": {
    "Extensão": { M: { min: 45, max: 60 }, F: { min: 35, max: 50 } },
    "Flexão": { M: { min: 25, max: 35 }, F: { min: 20, max: 30 } }
  },
  "Quadril": {
    "Flexão": { M: { min: 30, max: 42 }, F: { min: 25, max: 36 } },
    "Abdução": { M: { min: 25, max: 35 }, F: { min: 20, max: 30 } },
    "Adução": { M: { min: 15, max: 20 }, F: { min: 15, max: 20 } },
    "Extensão": { M: { min: 25, max: 30 }, F: { min: 25, max: 30 } }
  }
};

interface DashboardProfessionalProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  professionalId?: string;
}

export default function DashboardProfessional({ activeTab, setActiveTab, professionalId }: DashboardProfessionalProps) {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'admin';

  const [clients, setClients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);

  // Assessor selection state
  const [asAvaliador, setAsAvaliador] = useState(professionalId || '6668ab030303030303030302');
  const [repAvaliador, setRepAvaliador] = useState(professionalId || '6668ab030303030303030301');
  const [stAvaliador, setStAvaliador] = useState(professionalId || '6668ab030303030303030302');
  const [professionals, setProfessionals] = useState<any[]>([]);

  useEffect(() => {
    if (professionalId) {
      setAsAvaliador(professionalId);
      setRepAvaliador(professionalId);
      setStAvaliador(professionalId);
    }
  }, [professionalId]);


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

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAptModal(false);
        setShowFixedSchedModal(false);
        setShowNewExModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Clinical data states
  const [fixedSchedules, setFixedSchedules] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [strengthTests, setStrengthTests] = useState<any[]>([]);
  const [prontuarios, setProntuarios] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);

  // Form modals state
  const [showAptModal, setShowAptModal] = useState(false);
  const [showFixedSchedModal, setShowFixedSchedModal] = useState(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showStModal, setShowStModal] = useState(false);
  const [showProntuarioModal, setShowProntuarioModal] = useState(false);
  const [showClientDetailModal, setShowClientDetailModal] = useState(false);
  const [detailClient, setDetailClient] = useState<any>(null);
  const [clientDetailTab, setClientDetailTab] = useState('agendamentos');
  const [showNewExModal, setShowNewExModal] = useState(false);

  // Emergency modal state
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyAptId, setEmergencyAptId] = useState('');
  const [emergencyApt, setEmergencyApt] = useState<any>(null);
  const [emergencyConduct, setEmergencyConduct] = useState<'alta' | 'remarcacao'>('alta');
  const [emergencyReport, setEmergencyReport] = useState('');
  const [emergencyReschedDate, setEmergencyReschedDate] = useState('');
  const [emergencyReschedHour, setEmergencyReschedHour] = useState('08:00');

  // New Appointment form inputs
  const [selectedClient, setSelectedClient] = useState('');
  const [aptDate, setAptDate] = useState('');
  const [aptTime, setAptTime] = useState('08:00');
  const [aptService, setAptService] = useState('Treino Monitorado');
  const [aptType, setAptType] = useState<'academia' | 'consultorio'>('academia');

  useEffect(() => {
    if (aptType === 'academia') {
      setAptService('Treino Monitorado');
    } else {
      setAptService('Avaliação Fisioterápica');
    }
  }, [aptType]);

  // Workout editor tab states
  const [workoutSearch, setWorkoutSearch] = useState('');
  const [workoutSubTab, setWorkoutSubTab] = useState<'clients' | 'exercises'>('clients');
  const [workoutStatusFilter, setWorkoutStatusFilter] = useState<'all' | 'active' | 'expired' | 'none'>('all');
  const [workoutPlanFilter, setWorkoutPlanFilter] = useState<string>('all');
  const [isNewWorkoutSheet, setIsNewWorkoutSheet] = useState(false);
  const [originalWorkoutData, setOriginalWorkoutData] = useState<any>(null);
  const [selectedClientForWorkout, setSelectedClientForWorkout] = useState<any>(null);
  const [editingWorkoutData, setEditingWorkoutData] = useState<any>(null);
  const [activeWorkoutCategory, setActiveWorkoutCategory] = useState<'fichasMonitorado' | 'fichasLivre'>('fichasMonitorado');
  const [activeWorkoutSubTab, setActiveWorkoutSubTab] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('A');
  const [sheetToDelete, setSheetToDelete] = useState<string | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [exerciseGroup, setExerciseGroup] = useState('');

  // Workout Builder
  const [showWorkoutBuilder, setShowWorkoutBuilder] = useState(false);
  const [builderClient, setBuilderClient] = useState<any>(null);

  // Fixed Schedule form inputs
  const [fsClient, setFsClient] = useState('');
  const [fsDay, setFsDay] = useState(1); // Monday
  const [fsTime, setFsTime] = useState('08:00');
  const [fsService, setFsService] = useState('Treino Monitorado');
  const [fsDate, setFsDate] = useState('');

  // Helper para goniometria (Mixed)
  const parseGonioValue = (val: any) => {
    if (val && typeof val === 'object') {
      return {
        semForca: val.semForca !== undefined && val.semForca !== null ? val.semForca : '',
        comForca: val.comForca !== undefined && val.comForca !== null ? val.comForca : ''
      };
    }
    return {
      semForca: typeof val === 'number' ? val : '',
      comForca: ''
    };
  };

  // Timer & Rascunho states
  const [asTimerSeconds, setAsTimerSeconds] = useState(0);
  const [repTimerSeconds, setRepTimerSeconds] = useState(0);
  const [stTimerSeconds, setStTimerSeconds] = useState(0);
  const [asPrefilledFields, setAsPrefilledFields] = useState<Record<string, boolean>>({});
  const [asMeta2Meses, setAsMeta2Meses] = useState('');
  const [asMeta1Ano, setAsMeta1Ano] = useState('');

  // Dobras cutâneas triplas
  const [asDobrasReadings, setAsDobrasReadings] = useState<Record<string, [string, string, string]>>({
    peitoral: ['', '', ''],
    triceps: ['', '', ''],
    subescapular: ['', '', ''],
    subaxilar: ['', '', ''],
    suprailiaca: ['', '', ''],
    abdomen: ['', '', ''],
    coxa: ['', '', ''],
    panturrilha: ['', '', '']
  });

  // Assessment form inputs
  const [asClient, setAsClient] = useState('');
  const [asDate, setAsDate] = useState('');
  const [asWeight, setAsWeight] = useState('');
  const [asHeight, setAsHeight] = useState('');
  const [asFat, setAsFat] = useState('');
  const [asMassaMagra, setAsMassaMagra] = useState('');
  const [asMassaGorda, setAsMassaGorda] = useState('');
  const [asObs, setAsObs] = useState('');
  
  // Wizard states
  const [asStep, setAsStep] = useState(1);
  const [draftOnOpen, setDraftOnOpen] = useState<any>(null);
  const [asTermografia, setAsTermografia] = useState('');
  const [asYTest, setAsYTest] = useState('');
  const [asStepDown, setAsStepDown] = useState('');
  const [asMaigne, setAsMaigne] = useState('');
  const [asTermografiaRealizou, setAsTermografiaRealizou] = useState('nao');
  const [asYTestRealizou, setAsYTestRealizou] = useState('nao');
  const [asStepDownRealizou, setAsStepDownRealizou] = useState('nao');
  const [asMaigneRealizou, setAsMaigneRealizou] = useState('nao');

  // Y-Test structured states
  const [asYLenD, setAsYLenD] = useState<number | ''>('');
  const [asYLenE, setAsYLenE] = useState<number | ''>('');
  const [asYAntD, setAsYAntD] = useState<number | ''>('');
  const [asYAntE, setAsYAntE] = useState<number | ''>('');
  const [asYPMD, setAsYPMD] = useState<number | ''>('');
  const [asYPME, setAsYPME] = useState<number | ''>('');
  const [asYPLD, setAsYPLD] = useState<number | ''>('');
  const [asYPLE, setAsYPLE] = useState<number | ''>('');

  // Step Down structured states
  const [asSdPelvica, setAsSdPelvica] = useState<number | ''>('');
  const [asSdAducao, setAsSdAducao] = useState<number | ''>('');
  const [asSdValgo, setAsSdValgo] = useState<number | ''>('');
  const [asSdPrps, setAsSdPrps] = useState<number | ''>('');

  // PDF attachment state
  const [asPdfUrl, setAsPdfUrl] = useState('');
  const [asPdfAttachName, setAsPdfAttachName] = useState('');
  const [asMaigneData, setAsMaigneData] = useState({
    flexao: 25, flexaoEVA: 0,
    extensao: 25, extensaoEVA: 0,
    inclinacaoD: 25, inclinacaoDEVA: 0,
    inclinacaoE: 25, inclinacaoEEVA: 0,
    rotacaoD: 25, rotacaoDEVA: 0,
    rotacaoE: 25, rotacaoEEVA: 0
  });

  const updateMaigneField = (field: string, value: number) => {
    setAsMaigneData(prev => ({ ...prev, [field]: value }));
  };

  const handleMaigneNodeClick = (idx: number) => {
    const fields = ['flexao', 'rotacaoD', 'inclinacaoD', 'extensao', 'inclinacaoE', 'rotacaoE'];
    const field = fields[idx];
    setAsMaigneData(prev => {
      let val = prev[field as keyof typeof prev] + 5;
      if (val > 50) val = 0;
      return { ...prev, [field]: val };
    });
  };

  const handleCloseAssessment = () => {
    setShowAssessmentModal(false);
    setDraftOnOpen(null);
  };

  const handleCloseReport = () => {
    setShowReportModal(false);
  };

  const handleCloseSt = () => {
    setShowStModal(false);
  };

  const handleCloseProntuario = () => {
    setShowProntuarioModal(false);
  };

  const calculateObjectiveWeeklyRate = (peso: number, sexo: string, freq: number, nivel: string, tipo: string) => {
    const p = Number(peso) || 70;
    const s = (sexo || '').trim().toUpperCase().startsWith('F') ? 'F' : 'M';
    const f = Number(freq) || 3;
    const n = nivel || 'Iniciante / Retorno';
    const t = tipo === 'Emagrecimento' ? 'Emagrecimento' : 'Massa Magra';

    let taxaBase = 0;
    let fatorSexo = 1.00;
    let fatorFreq = 1.00;

    if (t === 'Massa Magra') {
      // Hypertrofia
      if (n === 'Iniciante / Retorno') taxaBase = 0.0030;
      else if (n === 'Iniciante a Intermediário') taxaBase = 0.0022;
      else if (n === 'Intermediário') taxaBase = 0.0015;
      else if (n === 'Avançado') taxaBase = 0.0008;

      if (s === 'F') fatorSexo = 0.80;

      if (f === 2) fatorFreq = 0.80;
      else if (f === 3) fatorFreq = 0.90;
      else if (f === 4) fatorFreq = 1.00;
      else if (f >= 5) fatorFreq = 1.05;
    } else {
      // Emagrecimento
      if (n === 'Iniciante / Retorno') taxaBase = 0.0055;
      else if (n === 'Iniciante a Intermediário') taxaBase = 0.0065;
      else if (n === 'Intermediário') taxaBase = 0.0075;
      else if (n === 'Avançado') taxaBase = 0.0085;

      if (s === 'F') fatorSexo = 0.85;

      if (f === 2) fatorFreq = 0.85;
      else if (f === 3) fatorFreq = 0.95;
      else if (f === 4) fatorFreq = 1.00;
      else if (f >= 5) fatorFreq = 1.05;
    }

    return p * taxaBase * fatorSexo * fatorFreq;
  };

  const getGoalReferenceInfo = () => {
    if (!asTipoObjetivo) return [];
    
    const objectives = asTipoObjetivo.split(',').filter(Boolean);
    const freq = Number(asFreqSemanal) || 3;
    const sexo = asSex || 'M';
    const meses = Number(asObjetivoMeses) || 3;
    const nivel = asNivelExperiencia || 'Iniciante / Retorno';
    const peso = Number(asWeight) || 70;
    const totalSemanas = Math.round(meses * 4.33);

    return objectives.map(tipo => {
      const weeklyRate = calculateObjectiveWeeklyRate(peso, sexo, freq, nivel, tipo);
      const labelTipo = tipo === 'Emagrecimento' ? 'Emagrecimento / Perda de Gordura' : 'Ganho de Massa Magra';
      const labelSexo = (sexo || '').trim().toUpperCase().startsWith('M') ? 'Masculino' : 'Feminino';

      return {
        tipo,
        labelTipo,
        labelSexo,
        freq,
        meses,
        nivel,
        totalSemanas,
        weekly: {
          conservador: (weeklyRate * 0.50).toFixed(2),
          esperado: (weeklyRate * 1.00).toFixed(2),
          excelente: (weeklyRate * 1.20).toFixed(2)
        },
        total: {
          conservador: (weeklyRate * 0.50 * totalSemanas).toFixed(2),
          esperado: (weeklyRate * 1.00 * totalSemanas).toFixed(2),
          excelente: (weeklyRate * 1.20 * totalSemanas).toFixed(2)
        }
      };
    });
  };

  // Novas variáveis de estado para o assistente de 6 etapas
  const [asAge, setAsAge] = useState(30);
  const [asSex, setAsSex] = useState('M');
  const [asObjetivoPrincipal, setAsObjetivoPrincipal] = useState('');
  const [asObjetivoMeses, setAsObjetivoMeses] = useState(3);
  const [asTipoObjetivo, setAsTipoObjetivo] = useState('');
  const [asFreqSemanal, setAsFreqSemanal] = useState(3);
  const [asNivelExperiencia, setAsNivelExperiencia] = useState('Iniciante / Retorno');
  const [showTipoObjetivoDropdown, setShowTipoObjetivoDropdown] = useState(false);
  
  const [asPressao, setAsPressao] = useState('120/80 mmHg');
  const [asSono, setAsSono] = useState('7-8 h por noite');
  const [asNutricao, setAsNutricao] = useState('Adequada');
  const [asAtivFisica, setAsAtivFisica] = useState('4x por semana');
  const [asMedicamentos, setAsMedicamentos] = useState('Nenhum');
  const [asCirurgias, setAsCirurgias] = useState('Nenhuma');
  const [asQueixas, setAsQueixas] = useState('Nenhuma');

  const [asCirc, setAsCirc] = useState<Record<string, number | ''>>({
    pescoco: 38, ombros: 110, torax: 90, cintura: 80, abdomen: 82, quadril: 95,
    braçoD: 32, braçoE: 32, antebraçoD: 26, antebraçoE: 26, coxaD: 55, coxaE: 55, panturrilhaD: 36, panturrilhaE: 36
  });

  const [asDobras, setAsDobras] = useState<Record<string, number | ''>>({
    peitoral: '', triceps: '', subescapular: '', subaxilar: '', suprailiaca: '', abdomen: '', coxa: '', panturrilha: ''
  });

  const [asSomaDobras, setAsSomaDobras] = useState(102);

  const [asGonio, setAsGonio] = useState<Record<string, { semForca: number | '', comForca: number | '' }>>({
    quadrilFlexao1D: { semForca: '', comForca: '' },
    quadrilFlexao1E: { semForca: '', comForca: '' },
    quadrilFlexao2D: { semForca: '', comForca: '' },
    quadrilFlexao2E: { semForca: '', comForca: '' },
    quadrilRotIntD: { semForca: '', comForca: '' },
    quadrilRotIntE: { semForca: '', comForca: '' },
    quadrilRotExtD: { semForca: '', comForca: '' },
    quadrilRotExtE: { semForca: '', comForca: '' },
    joelhoFlexaoD: { semForca: '', comForca: '' },
    joelhoFlexaoE: { semForca: '', comForca: '' },
    joelhoPopliteoD: { semForca: '', comForca: '' },
    joelhoPopliteoE: { semForca: '', comForca: '' },
    tornozeloDorsi1D: { semForca: '', comForca: '' },
    tornozeloDorsi1E: { semForca: '', comForca: '' },
    tornozeloDorsi2D: { semForca: '', comForca: '' },
    tornozeloDorsi2E: { semForca: '', comForca: '' },
    tornozeloFlexaoPlantarD: { semForca: '', comForca: '' },
    tornozeloFlexaoPlantarE: { semForca: '', comForca: '' },
    ombroRotIntD: { semForca: '', comForca: '' },
    ombroRotIntE: { semForca: '', comForca: '' },
    ombroRotExtD: { semForca: '', comForca: '' },
    ombroRotExtE: { semForca: '', comForca: '' },
    ombroFlexaoD: { semForca: '', comForca: '' },
    ombroFlexaoE: { semForca: '', comForca: '' }
  });

  const [asOberD, setAsOberD] = useState('Negativo');
  const [asOberE, setAsOberE] = useState('Negativo');
  const [asThomasD, setAsThomasD] = useState('Negativo');
  const [asThomasE, setAsThomasE] = useState('Negativo');
  const [asThomasIliopsoasD, setAsThomasIliopsoasD] = useState('');
  const [asThomasIliopsoasE, setAsThomasIliopsoasE] = useState('');
  const [asThomasRetofemoralD, setAsThomasRetofemoralD] = useState('');
  const [asThomasRetofemoralE, setAsThomasRetofemoralE] = useState('');

  const [asPostura, setAsPostura] = useState('Nenhum desvio importante');

  // Report form inputs
  const [repClient, setRepClient] = useState('');
  const [repDate, setRepDate] = useState('');
  const [repPain, setRepPain] = useState(5);
  const [repContent, setRepContent] = useState('');
  const [repType, setRepType] = useState<'simplificado' | 'completo'>('completo');
  const [repActiveTab, setRepActiveTab] = useState<'anamnese' | 'goniometria' | 'testes'>('anamnese');
  
  // Full report fields
  const [repActiveStep, setRepActiveStep] = useState(1);
  const [repQueixas, setRepQueixas] = useState<any[]>([
    {
      dorOnde: '',
      quandoComecou: '',
      comoIniciou: '',
      dorEvolucao: 'estavel',
      dorIntensidade: 5,
      dorTodoMomento: 'sim',
      desencadeiaPiora: '',
      melhoraDesaparece: '',
      caracteristicaDor: 'Pontual / Aguda',
      origens: []
    }
  ]);
  const [repCirurgiasRealizou, setRepCirurgiasRealizou] = useState('nao');
  const [repCirurgiasList, setRepCirurgiasList] = useState<any[]>([]);
  const [repTraumas, setRepTraumas] = useState('');
  const [repCirurgias, setRepCirurgias] = useState('');
  const [repDoencas, setRepDoencas] = useState('');
  const [repTraumasEmo, setRepTraumasEmo] = useState('');
  const [repMedicao, setRepMedicao] = useState('');
  const [repDrogas, setRepDrogas] = useState('');
  
  const [repSonoHoras, setRepSonoHoras] = useState(8);
  const [repSonoTipo, setRepSonoTipo] = useState('continuo');
  const [repSonoQualidade, setRepSonoQualidade] = useState('Bom');
  const [repAlimentacaoDor, setRepAlimentacaoDor] = useState('');
  const [repAtividadeFisicaQual, setRepAtividadeFisicaQual] = useState('');
  const [repAtividadeFisicaInterfere, setRepAtividadeFisicaInterfere] = useState('');
  const [repControleStress, setRepControleStress] = useState('');
  const [repStress, setRepStress] = useState(5);
  const [repSono, setRepSono] = useState(8);
  const [repAtividadeFisica, setRepAtividadeFisica] = useState('nao');
  
  const [repTermografiaRealizou, setRepTermografiaRealizou] = useState('nao');
  const [repTermografiaImgB64, setRepTermografiaImgB64] = useState('');
  const [repMaigneRealizou, setRepMaigneRealizou] = useState('nao');
  const [repExamesList, setRepExamesList] = useState<any[]>([]);
  
  const [repDeRealizou, setRepDeRealizou] = useState('nao');
  const [repDeTipo, setRepDeTipo] = useState('Tipo IV');
  const [repDeAbdBilateral, setRepDeAbdBilateral] = useState('nao');
  const [repDeAbdUnilateral, setRepDeAbdUnilateral] = useState('nao');
  const [repDeDorAbd, setRepDeDorAbd] = useState('nao');

  // Report Goniometry (Mixed / Double fields)
  const [gGonio, setGGonio] = useState<Record<string, { semForca: number | '', comForca: number | '' }>>({
    quadrilFlexao1D: { semForca: '', comForca: '' },
    quadrilFlexao1E: { semForca: '', comForca: '' },
    quadrilFlexao2D: { semForca: '', comForca: '' },
    quadrilFlexao2E: { semForca: '', comForca: '' },
    quadrilRotIntD: { semForca: '', comForca: '' },
    quadrilRotIntE: { semForca: '', comForca: '' },
    quadrilRotExtD: { semForca: '', comForca: '' },
    quadrilRotExtE: { semForca: '', comForca: '' },
    joelhoFlexaoD: { semForca: '', comForca: '' },
    joelhoFlexaoE: { semForca: '', comForca: '' },
    joelhoPopliteoD: { semForca: '', comForca: '' },
    joelhoPopliteoE: { semForca: '', comForca: '' },
    tornozeloDorsi1D: { semForca: '', comForca: '' },
    tornozeloDorsi1E: { semForca: '', comForca: '' },
    tornozeloDorsi2D: { semForca: '', comForca: '' },
    tornozeloDorsi2E: { semForca: '', comForca: '' },
    tornozeloFlexaoPlantarD: { semForca: '', comForca: '' },
    tornozeloFlexaoPlantarE: { semForca: '', comForca: '' },
    ombroRotIntD: { semForca: '', comForca: '' },
    ombroRotIntE: { semForca: '', comForca: '' },
    ombroRotExtD: { semForca: '', comForca: '' },
    ombroRotExtE: { semForca: '', comForca: '' },
    ombroFlexaoD: { semForca: '', comForca: '' },
    ombroFlexaoE: { semForca: '', comForca: '' }
  });

  // Orthopedic tests
  const [tOberD, setTOberD] = useState('Negativo');
  const [tOberE, setTOberE] = useState('Negativo');
  const [tThomasD, setTThomasD] = useState('Negativo');
  const [tThomasE, setTThomasE] = useState('Negativo');
  const [tThomasIliopsoasD, setTThomasIliopsoasD] = useState('');
  const [tThomasIliopsoasE, setTThomasIliopsoasE] = useState('');
  const [tThomasRetofemoralD, setTThomasRetofemoralD] = useState('');
  const [tThomasRetofemoralE, setTThomasRetofemoralE] = useState('');

  const [repCirc, setRepCirc] = useState<Record<string, number | ''>>({
    pescoco: '', ombros: '', torax: '', cintura: '', abdomen: '', quadril: '',
    braçoD: '', braçoE: '', antebraçoD: '', antebraçoE: '', coxaD: '', coxaE: '',
    panturrilhaD: '', panturrilhaE: ''
  });
  
  // Maigne Star
  const [mFlex, setMFlex] = useState(25);
  const [mFlexEVA, setMFlexEVA] = useState(0);
  const [mExt, setMExt] = useState(25);
  const [mExtEVA, setMExtEVA] = useState(0);
  const [mIncD, setMIncD] = useState(25);
  const [mIncDEVA, setMIncDEVA] = useState(0);
  const [mIncE, setMIncE] = useState(25);
  const [mIncEEVA, setMIncEEVA] = useState(0);
  const [mRotD, setMRotD] = useState(25);
  const [mRotDEVA, setMRotDEVA] = useState(0);
  const [mRotE, setMRotE] = useState(25);
  const [mRotEEVA, setMRotEEVA] = useState(0);

  // Y-Test
  const [yRealizou, setYRealizou] = useState('nao');
  const [yAntD, setYAntD] = useState(0);
  const [yAntE, setYAntE] = useState(0);
  const [yPMD, setYPMD] = useState(0);
  const [yPME, setYPME] = useState(0);
  const [yPLD, setYPLD] = useState(0);
  const [yPLE, setYPLE] = useState(0);
  const [yLenD, setYLenD] = useState(0);
  const [yLenE, setYLenE] = useState(0);

  // Step Down
  const [sdRealizou, setSdRealizou] = useState('nao');
  const [sdPelvica, setSdPelvica] = useState(0);
  const [sdAducao, setSdAducao] = useState(0);
  const [sdValgo, setSdValgo] = useState(0);
  const [sdPrps, setSdPrps] = useState(0);

  // Exercicios
  const [repExercicios, setRepExercicios] = useState('');

  // Strength Test form inputs
  const [stClient, setStClient] = useState('');
  const [stDate, setStDate] = useState('');
  const [stPeso, setStPeso] = useState('');
  const [stTestesList, setStTestesList] = useState<any[]>([]);
  const [stObs, setStObs] = useState('');
  // Current edited test item inputs
  const [stArticulacao, setStArticulacao] = useState('Ombro');
  const [stMovimento, setStMovimento] = useState('Abdução');
  const [stLado, setStLado] = useState('Direito');
  const [stUnidade, setStUnidade] = useState('kgf');
  const [stValorObtido, setStValorObtido] = useState('');
  const [stTentativas, setStTentativas] = useState('1');
  const [stMelhorTentativa, setStMelhorTentativa] = useState('');
  const [stMediaTentativas, setStMediaTentativas] = useState('');

  useEffect(() => {
    if (stClient) {
      const clientAssessments = assessments.filter(a => {
        const cid = typeof a.clienteId === 'object' ? a.clienteId?._id : a.clienteId;
        return cid === stClient;
      });
      if (clientAssessments.length > 0) {
        const sorted = [...clientAssessments].sort((a, b) => b.data.localeCompare(a.data));
        setStPeso(sorted[0]?.dadosMedidos?.peso?.toString() || '');
      } else {
        setStPeso('');
      }
    } else {
      setStPeso('');
    }
  }, [stClient, assessments]);

  // Prontuario form inputs
  const [prClient, setPrClient] = useState('');
  const [prDate, setPrDate] = useState('');

  // Simulated Date for Agenda
  const [simulatedDate, setSimulatedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [prContent, setPrContent] = useState('');

  // Horário real em tempo real para controle de frequência no Resumo do Dia
  const [realTime, setRealTime] = useState('');
  useEffect(() => {
    const updateRealTime = () => {
      const agora = new Date();
      const hrs = String(agora.getHours()).padStart(2, '0');
      const mins = String(agora.getMinutes()).padStart(2, '0');
      setRealTime(`${hrs}:${mins}`);
    };
    updateRealTime();
    const interval = setInterval(updateRealTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // New Exercise form inputs
  const [newExNome, setNewExNome] = useState('');
  const [newExGrupo, setNewExGrupo] = useState('PEITO');
  const [newExEquip, setNewExEquip] = useState('BARRA');
  const [newExInst, setNewExInst] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const res = await fetch('/api/exercises/import', {
        method: 'POST',
        body: formData
      });
      const resJson = await res.json();
      if (resJson.success) {
        alert(`Importação concluída! ${resJson.count} exercícios importados com sucesso.`);
        fetchData();
      } else {
        alert(`Erro na importação: ${resJson.error}`);
      }
    } catch (err: any) {
      alert(`Erro ao importar arquivo.`);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Stopwatch effects
  useEffect(() => {
    let interval: any;
    if (showAssessmentModal) {
      interval = setInterval(() => {
        setAsTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setAsTimerSeconds(0);
    }
    return () => clearInterval(interval);
  }, [showAssessmentModal]);

  useEffect(() => {
    let interval: any;
    if (showReportModal) {
      interval = setInterval(() => {
        setRepTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setRepTimerSeconds(0);
    }
    return () => clearInterval(interval);
  }, [showReportModal]);

  useEffect(() => {
    let interval: any;
    if (showStModal) {
      interval = setInterval(() => {
        setStTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setStTimerSeconds(0);
    }
    return () => clearInterval(interval);
  }, [showStModal]);

  const formatTimer = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // LocalStorage Auto-save effects
  useEffect(() => {
    if (showAssessmentModal && asClient) {
      const data = {
        asClient, asDate, asWeight, asHeight, asFat, asMassaMagra, asMassaGorda, asObs,
        asMeta2Meses, asMeta1Ano, asDobrasReadings, asGonio, asCirc, asTimerSeconds,
        asNivelExperiencia, asFreqSemanal, asObjetivoMeses, asTipoObjetivo, asObjetivoPrincipal,
        asPressao, asSono, asNutricao, asAtivFisica, asMedicamentos, asCirurgias, asQueixas,
        asOberD, asOberE, asThomasD, asThomasE, asThomasIliopsoasD, asThomasIliopsoasE,
        asThomasRetofemoralD, asThomasRetofemoralE, asTermografia, asTermografiaRealizou,
        asYTestRealizou, asYLenD, asYLenE, asYAntD, asYAntE, asYPMD, asYPME, asYPLD, asYPLE,
        asStepDownRealizou, asSdPelvica, asSdAducao, asSdValgo, asSdPrps, asMaigneRealizou, asMaigneData, asMaigne, asPostura
      };
      localStorage.setItem('draft_assessment', JSON.stringify(data));
    }
  }, [showAssessmentModal, asClient, asDate, asWeight, asHeight, asFat, asMassaMagra, asMassaGorda, asObs, asMeta2Meses, asMeta1Ano, asDobrasReadings, asGonio, asCirc, asTimerSeconds, asNivelExperiencia, asFreqSemanal, asObjetivoMeses, asTipoObjetivo, asObjetivoPrincipal, asPressao, asSono, asNutricao, asAtivFisica, asMedicamentos, asCirurgias, asQueixas, asOberD, asOberE, asThomasD, asThomasE, asThomasIliopsoasD, asThomasIliopsoasE, asThomasRetofemoralD, asThomasRetofemoralE, asTermografia, asTermografiaRealizou, asYTestRealizou, asYLenD, asYLenE, asYAntD, asYAntE, asYPMD, asYPME, asYPLD, asYPLE, asStepDownRealizou, asSdPelvica, asSdAducao, asSdValgo, asSdPrps, asMaigneRealizou, asMaigneData, asMaigne, asPostura]);

  useEffect(() => {
    if (showReportModal && repClient) {
      const data = {
        repClient, repAvaliador, repDate, repType, repContent, repPain, repExercicios,
        gGonio, repTimerSeconds, repQueixas, repTraumas, repCirurgiasRealizou, repCirurgiasList,
        repDoencas, repTraumasEmo, repMedicao, repDrogas, repSonoHoras, repSonoTipo, repSonoQualidade,
        repAlimentacaoDor, repAtividadeFisicaQual, repAtividadeFisicaInterfere, repStress, repControleStress,
        repAtividadeFisica, repTermografiaRealizou, repTermografiaImgB64, repExamesList, repDeRealizou,
        repDeTipo, repDeAbdBilateral, repDeAbdUnilateral, repDeDorAbd, repMaigneRealizou, mFlex, mFlexEVA,
        mExt, mExtEVA, mIncD, mIncDEVA, mIncE, mIncEEVA, mRotD, mRotDEVA, mRotE, mRotEEVA, yRealizou,
        yLenD, yLenE, yAntD, yAntE, yPMD, yPME, yPLD, yPLE, sdRealizou, sdPelvica, sdAducao, sdValgo, sdPrps,
        repCirc, tThomasIliopsoasD, tThomasIliopsoasE, tThomasRetofemoralD, tThomasRetofemoralE
      };
      localStorage.setItem('draft_report', JSON.stringify(data));
    }
  }, [showReportModal, repClient, repAvaliador, repDate, repType, repContent, repPain, repExercicios, gGonio, repTimerSeconds, repQueixas, repTraumas, repCirurgiasRealizou, repCirurgiasList, repDoencas, repTraumasEmo, repMedicao, repDrogas, repSonoHoras, repSonoTipo, repSonoQualidade, repAlimentacaoDor, repAtividadeFisicaQual, repAtividadeFisicaInterfere, repStress, repControleStress, repAtividadeFisica, repTermografiaRealizou, repTermografiaImgB64, repExamesList, repDeRealizou, repDeTipo, repDeAbdBilateral, repDeAbdUnilateral, repDeDorAbd, repMaigneRealizou, mFlex, mFlexEVA, mExt, mExtEVA, mIncD, mIncDEVA, mIncE, mIncEEVA, mRotD, mRotDEVA, mRotE, mRotEEVA, yRealizou, yLenD, yLenE, yAntD, yAntE, yPMD, yPME, yPLD, yPLE, sdRealizou, sdPelvica, sdAducao, sdValgo, sdPrps, repCirc, tThomasIliopsoasD, tThomasIliopsoasE, tThomasRetofemoralD, tThomasRetofemoralE]);

  useEffect(() => {
    if (showStModal && stClient) {
      const data = {
        stClient, stAvaliador, stDate, stPeso, stObs, stTestesList, stTimerSeconds
      };
      localStorage.setItem('draft_strength', JSON.stringify(data));
    }
  }, [showStModal, stClient, stAvaliador, stDate, stPeso, stObs, stTestesList, stTimerSeconds]);

  const loadAssessmentDraft = (bypassConfirm = false, parsedObj?: any) => {
    const draft = localStorage.getItem('draft_assessment');
    if (draft) {
      try {
        const p = parsedObj || JSON.parse(draft);
        if (bypassConfirm || confirm('Encontramos um rascunho de avaliação física não salva para este aluno. Deseja recuperar os dados?')) {
          setAsDate(p.asDate || '');
          setAsWeight(p.asWeight || '');
          setAsHeight(p.asHeight || '');
          setAsFat(p.asFat || '');
          setAsMassaMagra(p.asMassaMagra || '');
          setAsMassaGorda(p.asMassaGorda || '');
          setAsObs(p.asObs || '');
          setAsMeta2Meses(p.asMeta2Meses || '');
          setAsMeta1Ano(p.asMeta1Ano || '');
          if (p.asDobrasReadings) setAsDobrasReadings(p.asDobrasReadings);
          if (p.asGonio) setAsGonio(p.asGonio);
          if (p.asCirc) setAsCirc(p.asCirc);
          if (p.asNivelExperiencia) setAsNivelExperiencia(p.asNivelExperiencia);
          if (p.asFreqSemanal) setAsFreqSemanal(p.asFreqSemanal);
          if (p.asObjetivoMeses) setAsObjetivoMeses(p.asObjetivoMeses);
          if (p.asTipoObjetivo) setAsTipoObjetivo(p.asTipoObjetivo);
          if (p.asObjetivoPrincipal) setAsObjetivoPrincipal(p.asObjetivoPrincipal);
          if (p.asPressao) setAsPressao(p.asPressao);
          if (p.asSono) setAsSono(p.asSono);
          if (p.asNutricao) setAsNutricao(p.asNutricao);
          if (p.asAtivFisica) setAsAtivFisica(p.asAtivFisica);
          if (p.asMedicamentos) setAsMedicamentos(p.asMedicamentos);
          if (p.asCirurgias) setAsCirurgias(p.asCirurgias);
          if (p.asQueixas) setAsQueixas(p.asQueixas);
          setAsOberD(p.asOberD || 'Negativo');
          setAsOberE(p.asOberE || 'Negativo');
          setAsThomasD(p.asThomasD || 'Negativo');
          setAsThomasE(p.asThomasE || 'Negativo');
          setAsThomasIliopsoasD(p.asThomasIliopsoasD || '');
          setAsThomasIliopsoasE(p.asThomasIliopsoasE || '');
          setAsThomasRetofemoralD(p.asThomasRetofemoralD || '');
          setAsThomasRetofemoralE(p.asThomasRetofemoralE || '');
          setAsTermografia(p.asTermografia || '');
          setAsTermografiaRealizou(p.asTermografiaRealizou || 'nao');
          setAsYTestRealizou(p.asYTestRealizou || 'nao');
          setAsYLenD(p.asYLenD || ''); setAsYLenE(p.asYLenE || '');
          setAsYAntD(p.asYAntD || ''); setAsYAntE(p.asYAntE || '');
          setAsYPMD(p.asYPMD || ''); setAsYPME(p.asYPME || '');
          setAsYPLD(p.asYPLD || ''); setAsYPLE(p.asYPLE || '');
          setAsStepDownRealizou(p.asStepDownRealizou || 'nao');
          setAsSdPelvica(p.asSdPelvica || ''); setAsSdAducao(p.asSdAducao || '');
          setAsSdValgo(p.asSdValgo || ''); setAsSdPrps(p.asSdPrps || '');
          setAsMaigneRealizou(p.asMaigneRealizou || 'nao');
          if (p.asMaigneData) setAsMaigneData(p.asMaigneData);
          setAsMaigne(p.asMaigne || '');
          if (p.asTimerSeconds) setAsTimerSeconds(p.asTimerSeconds);
        } else {
          localStorage.removeItem('draft_assessment');
        }
      } catch(e) { console.error('Error loading assessment draft', e); }
    }
  };

  const loadReportDraft = () => {
    const draft = localStorage.getItem('draft_report');
    if (draft) {
      if (confirm('Encontramos um rascunho de relatório não salvo. Deseja recuperar os dados?')) {
        try {
          const p = JSON.parse(draft);
          setRepDate(p.repDate || '');
          setRepType(p.repType || 'simplificado');
          setRepContent(p.repContent || '');
          setRepPain(p.repPain || 5);
          setRepExercicios(p.repExercicios || '');
          if (p.gGonio) setGGonio(p.gGonio);
          if (p.repQueixas) setRepQueixas(p.repQueixas);
          setRepTraumas(p.repTraumas || '');
          setRepCirurgiasRealizou(p.repCirurgiasRealizou || 'nao');
          if (p.repCirurgiasList) setRepCirurgiasList(p.repCirurgiasList);
          setRepDoencas(p.repDoencas || '');
          setRepTraumasEmo(p.repTraumasEmo || '');
          setRepMedicao(p.repMedicao || '');
          setRepDrogas(p.repDrogas || '');
          setRepSonoHoras(p.repSonoHoras || 8);
          setRepSonoTipo(p.repSonoTipo || 'continuo');
          setRepSonoQualidade(p.repSonoQualidade || 'Bom');
          setRepAlimentacaoDor(p.repAlimentacaoDor || '');
          setRepAtividadeFisicaQual(p.repAtividadeFisicaQual || '');
          setRepAtividadeFisicaInterfere(p.repAtividadeFisicaInterfere || '');
          setRepStress(p.repStress || 5);
          setRepControleStress(p.repControleStress || '');
          setRepAtividadeFisica(p.repAtividadeFisica || 'nao');
          setRepTermografiaRealizou(p.repTermografiaRealizou || 'nao');
          setRepTermografiaImgB64(p.repTermografiaImgB64 || '');
          if (p.repExamesList) setRepExamesList(p.repExamesList);
          setRepDeRealizou(p.repDeRealizou || 'nao');
          setRepDeTipo(p.repDeTipo || 'Tipo IV');
          setRepDeAbdBilateral(p.repDeAbdBilateral || 'nao');
          setRepDeAbdUnilateral(p.repDeAbdUnilateral || 'nao');
          setRepDeDorAbd(p.repDeDorAbd || 'nao');
          setRepMaigneRealizou(p.repMaigneRealizou || 'nao');
          if (p.repCirc) setRepCirc(p.repCirc);
          setTThomasIliopsoasD(p.tThomasIliopsoasD || '');
          setTThomasIliopsoasE(p.tThomasIliopsoasE || '');
          setTThomasRetofemoralD(p.tThomasRetofemoralD || '');
          setTThomasRetofemoralE(p.tThomasRetofemoralE || '');
          setYRealizou(p.yRealizou || 'nao');
          setYLenD(p.yLenD || ''); setYLenE(p.yLenE || '');
          setYAntD(p.yAntD || ''); setYAntE(p.yAntE || '');
          setYPMD(p.yPMD || ''); setYPME(p.yPME || '');
          setYPLD(p.yPLD || ''); setYPLE(p.yPLE || '');
          setSdRealizou(p.sdRealizou || 'nao');
          setSdPelvica(p.sdPelvica || ''); setSdAducao(p.sdAducao || '');
          setSdValgo(p.sdValgo || ''); setSdPrps(p.sdPrps || '');
          if (p.repTimerSeconds) setRepTimerSeconds(p.repTimerSeconds);
        } catch(e) { console.error('Error loading report draft', e); }
      } else {
        localStorage.removeItem('draft_report');
      }
    }
  };

  const loadStDraft = () => {
    const draft = localStorage.getItem('draft_strength');
    if (draft) {
      if (confirm('Encontramos um rascunho de teste de força não salvo. Deseja recuperar os dados?')) {
        try {
          const p = JSON.parse(draft);
          setStDate(p.stDate || '');
          setStPeso(p.stPeso || '');
          setStObs(p.stObs || '');
          if (p.stTestesList) setStTestesList(p.stTestesList);
          if (p.stTimerSeconds) setStTimerSeconds(p.stTimerSeconds);
        } catch(e) { console.error('Error loading strength draft', e); }
      } else {
        localStorage.removeItem('draft_strength');
      }
    }
  };



  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Always fetch clients first
      const resClients = await fetch('/api/clients');
      const jsonClients = await resClients.json();
      if (jsonClients.success) {
        setClients(jsonClients.data);
        if (jsonClients.data.length > 0) {
          // Initialize defaults
          setSelectedClient(jsonClients.data[0]._id);
          setFsClient(jsonClients.data[0]._id);
          setAsClient(jsonClients.data[0]._id);
          setRepClient(jsonClients.data[0]._id);
          setStClient(jsonClients.data[0]._id);
          setPrClient(jsonClients.data[0]._id);
        }
      }

      // Fetch professionals list
      const resProfs = await fetch('/api/professionals');
      const jsonProfs = await resProfs.json();
      if (jsonProfs.success) {
        setProfessionals(jsonProfs.data);
        if (jsonProfs.data.length > 0 && !professionalId) {
          setAsAvaliador(prev => prev || jsonProfs.data[0]._id);
          setRepAvaliador(prev => prev || jsonProfs.data[0]._id);
          setStAvaliador(prev => prev || jsonProfs.data[0]._id);
        }
      }

      if (activeTab === 'dashboard' || activeTab === 'resumo_dia') {
        const resApts = await fetch('/api/appointments');
        const jsonApts = await resApts.json();
        if (jsonApts.success) setAppointments(jsonApts.data);
      } else if (activeTab === 'treinos_prof') {
        const [resWorkouts, resExs] = await Promise.all([
          fetch('/api/workouts'),
          fetch('/api/exercises')
        ]);
        const jsonWorkouts = await resWorkouts.json();
        const jsonExs = await resExs.json();
        if (jsonWorkouts.success) setWorkouts(jsonWorkouts.data);
        if (jsonExs.success) setExercises(jsonExs.data);
      } else if (activeTab === 'agenda_fixa') {
        const resFS = await fetch('/api/fixed-schedules');
        const jsonFS = await resFS.json();
        if (jsonFS.success) setFixedSchedules(jsonFS.data);
      } else if (activeTab === 'avaliacoes') {
        const resAs = await fetch('/api/assessments');
        const jsonAs = await resAs.json();
        if (jsonAs.success) setAssessments(jsonAs.data);
      } else if (activeTab === 'relatorios') {
        const [resRep, resAs] = await Promise.all([
          fetch('/api/reports'),
          fetch('/api/assessments')
        ]);
        const jsonRep = await resRep.json();
        const jsonAs = await resAs.json();
        if (jsonRep.success) setReports(jsonRep.data);
        if (jsonAs.success) setAssessments(jsonAs.data);
      } else if (activeTab === 'testes_forca') {
        const [resSt, resAs] = await Promise.all([
          fetch('/api/strength-tests'),
          fetch('/api/assessments')
        ]);
        const jsonSt = await resSt.json();
        const jsonAs = await resAs.json();
        if (jsonSt.success) setStrengthTests(jsonSt.data);
        if (jsonAs.success) setAssessments(jsonAs.data);
      } else if (activeTab === 'prontuarios') {
        const resPr = await fetch('/api/prontuarios');
        const jsonPr = await resPr.json();
        if (jsonPr.success) setProntuarios(jsonPr.data);
      }
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setSelectedClientForWorkout(null);
    setEditingWorkoutData(null);
  }, [activeTab]);

  // Carregar dados e histórico do aluno automaticamente ao selecioná-lo
  useEffect(() => {
    if (!asClient) return;
    const client = clients.find(c => c._id === asClient);
    if (client) {
      // Calcular idade com base na data de nascimento
      let age = 30;
      if (client.dadosPessoais?.dataNascimento) {
        const birthDate = new Date(client.dadosPessoais.dataNascimento);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }
      setAsAge(age);
      setAsSex(client.dadosPessoais?.sexo ? (client.dadosPessoais.sexo.trim().toUpperCase().startsWith('F') ? 'F' : 'M') : 'M');

      // Buscar avaliação física mais recente deste aluno
      const past = assessments
        .filter((a: any) => {
          const aClientId = typeof a.clienteId === 'object' ? a.clienteId?._id : a.clienteId;
          return aClientId === asClient;
        })
        .sort((a: any, b: any) => b.data.localeCompare(a.data));

      if (past.length > 0) {
        const latest = past[0];
        const prefilled: Record<string, boolean> = {};
        const mark = (key: string) => { prefilled[key] = true; };

        setAsHeight(latest.dadosMedidos?.altura?.toString() || '');
        if (latest.dadosMedidos?.altura) mark('altura');

        setAsWeight(latest.dadosMedidos?.peso?.toString() || '');
        if (latest.dadosMedidos?.peso) mark('peso');

        setAsObjetivoPrincipal(latest.dadosMedidos?.objetivoPrincipal || '');
        if (latest.dadosMedidos?.objetivoPrincipal) mark('objetivoPrincipal');

        setAsObjetivoMeses(latest.dadosMedidos?.objetivoMeses || 3);
        if (latest.dadosMedidos?.objetivoMeses) mark('objetivoMeses');

        setAsTipoObjetivo(latest.dadosMedidos?.tipoObjetivo || '');
        if (latest.dadosMedidos?.tipoObjetivo) mark('tipoObjetivo');

        setAsFreqSemanal(latest.dadosMedidos?.freqSemanal || 3);
        if (latest.dadosMedidos?.freqSemanal) mark('freqSemanal');

        setAsNivelExperiencia(latest.dadosMedidos?.nivelExperiencia || 'Iniciante / Retorno');
        if (latest.dadosMedidos?.nivelExperiencia) mark('nivelExperiencia');

        if (latest.dadosMedidos?.saudeGeral) {
          setAsPressao(latest.dadosMedidos.saudeGeral.pressaoArterial || '');
          if (latest.dadosMedidos.saudeGeral.pressaoArterial) mark('saudeGeral.pressaoArterial');

          setAsSono(latest.dadosMedidos.saudeGeral.sono || '');
          if (latest.dadosMedidos.saudeGeral.sono) mark('saudeGeral.sono');

          setAsNutricao(latest.dadosMedidos.saudeGeral.nutricao || '');
          if (latest.dadosMedidos.saudeGeral.nutricao) mark('saudeGeral.nutricao');

          setAsAtivFisica(latest.dadosMedidos.saudeGeral.atividadeFisica || '');
          if (latest.dadosMedidos.saudeGeral.atividadeFisica) mark('saudeGeral.atividadeFisica');

          setAsMedicamentos(latest.dadosMedidos.saudeGeral.medicamentos || '');
          if (latest.dadosMedidos.saudeGeral.medicamentos) mark('saudeGeral.medicamentos');

          setAsCirurgias(latest.dadosMedidos.saudeGeral.cirurgias || '');
          if (latest.dadosMedidos.saudeGeral.cirurgias) mark('saudeGeral.cirurgias');

          setAsQueixas(latest.dadosMedidos.saudeGeral.queixas || '');
          if (latest.dadosMedidos.saudeGeral.queixas) mark('saudeGeral.queixas');
        }

        if (latest.dadosMedidos?.circunferencias) {
          setAsCirc({
            pescoco: latest.dadosMedidos.circunferencias.pescoco || '',
            ombros: latest.dadosMedidos.circunferencias.ombros || '',
            torax: latest.dadosMedidos.circunferencias.torax || '',
            cintura: latest.dadosMedidos.circunferencias.cintura || '',
            abdomen: latest.dadosMedidos.circunferencias.abdomen || '',
            quadril: latest.dadosMedidos.circunferencias.quadril || '',
            braçoD: latest.dadosMedidos.circunferencias.braçoD || '',
            braçoE: latest.dadosMedidos.circunferencias.braçoE || '',
            antebraçoD: latest.dadosMedidos.circunferencias.antebraçoD || '',
            antebraçoE: latest.dadosMedidos.circunferencias.antebraçoE || '',
            coxaD: latest.dadosMedidos.circunferencias.coxaD || '',
            coxaE: latest.dadosMedidos.circunferencias.coxaE || '',
            panturrilhaD: latest.dadosMedidos.circunferencias.panturrilhaD || '',
            panturrilhaE: latest.dadosMedidos.circunferencias.panturrilhaE || ''
          });
          Object.keys(latest.dadosMedidos.circunferencias).forEach(k => {
            if (latest.dadosMedidos.circunferencias[k]) mark('circ.' + k);
          });
        }

        if (latest.dadosMedidos?.dobras) {
          const d = latest.dadosMedidos.dobras;
          setAsDobras({
            peitoral: d.peitoral || '',
            triceps: d.triceps || '',
            subescapular: d.subescapular || '',
            subaxilar: d.subaxilar || '',
            suprailiaca: d.suprailiaca || '',
            abdomen: d.abdomen || '',
            coxa: d.coxa || '',
            panturrilha: d.panturrilha || ''
          });
          setAsDobrasReadings({
            peitoral: d.peitoral ? [d.peitoral.toString(), d.peitoral.toString(), d.peitoral.toString()] : ['', '', ''],
            triceps: d.triceps ? [d.triceps.toString(), d.triceps.toString(), d.triceps.toString()] : ['', '', ''],
            subescapular: d.subescapular ? [d.subescapular.toString(), d.subescapular.toString(), d.subescapular.toString()] : ['', '', ''],
            subaxilar: d.subaxilar ? [d.subaxilar.toString(), d.subaxilar.toString(), d.subaxilar.toString()] : ['', '', ''],
            suprailiaca: d.suprailiaca ? [d.suprailiaca.toString(), d.suprailiaca.toString(), d.suprailiaca.toString()] : ['', '', ''],
            abdomen: d.abdomen ? [d.abdomen.toString(), d.abdomen.toString(), d.abdomen.toString()] : ['', '', ''],
            coxa: d.coxa ? [d.coxa.toString(), d.coxa.toString(), d.coxa.toString()] : ['', '', ''],
            panturrilha: d.panturrilha ? [d.panturrilha.toString(), d.panturrilha.toString(), d.panturrilha.toString()] : ['', '', '']
          });
          Object.keys(d).forEach(k => {
            if (d[k]) mark('dobras.' + k);
          });
        }

        if (latest.dadosMedidos?.goniometria) {
          const g = latest.dadosMedidos.goniometria;
          const mappedGonio: any = {};
          const keys = [
            'quadrilFlexao1D', 'quadrilFlexao1E', 'quadrilFlexao2D', 'quadrilFlexao2E',
            'quadrilRotIntD', 'quadrilRotIntE', 'quadrilRotExtD', 'quadrilRotExtE',
            'joelhoFlexaoD', 'joelhoFlexaoE', 'joelhoPopliteoD', 'joelhoPopliteoE',
            'tornozeloDorsi1D', 'tornozeloDorsi1E', 'tornozeloDorsi2D', 'tornozeloDorsi2E',
            'tornozeloFlexaoPlantarD', 'tornozeloFlexaoPlantarE', 'ombroRotIntD', 'ombroRotIntE',
            'ombroRotExtD', 'ombroRotExtE', 'ombroFlexaoD', 'ombroFlexaoE', 'ombroAbducaoD', 'ombroAbducaoE'
          ];
          keys.forEach(k => {
            let val = g[k];
            let mapKey = k;
            if (k === 'ombroAbducaoD') mapKey = 'ombroFlexaoD';
            if (k === 'ombroAbducaoE') mapKey = 'ombroFlexaoE';
            const parsed = parseGonioValue(val);
            mappedGonio[mapKey] = parsed;
            if (parsed.semForca !== '' || parsed.comForca !== '') {
              mark('gonio.' + mapKey);
            }
          });
          setAsGonio(mappedGonio);
        }

        if (latest.dadosMedidos?.testesEspeciais) {
          setAsOberD(latest.dadosMedidos.testesEspeciais.oberD || 'Negativo');
          setAsOberE(latest.dadosMedidos.testesEspeciais.oberE || 'Negativo');
          setAsThomasD(latest.dadosMedidos.testesEspeciais.thomasD || 'Negativo');
          setAsThomasE(latest.dadosMedidos.testesEspeciais.thomasE || 'Negativo');
          setAsThomasIliopsoasD(latest.dadosMedidos.testesEspeciais.thomasIliopsoasD?.toString() || '');
          setAsThomasIliopsoasE(latest.dadosMedidos.testesEspeciais.thomasIliopsoasE?.toString() || '');
          setAsThomasRetofemoralD(latest.dadosMedidos.testesEspeciais.thomasRetofemoralD?.toString() || '');
          setAsThomasRetofemoralE(latest.dadosMedidos.testesEspeciais.thomasRetofemoralE?.toString() || '');
          setAsTermografia(latest.dadosMedidos.testesEspeciais.termografia || '');
          setAsTermografiaRealizou(latest.dadosMedidos.testesEspeciais.termografia && latest.dadosMedidos.testesEspeciais.termografia.trim() !== '' ? 'sim' : 'nao');
          
          const yVal = latest.dadosMedidos.testesEspeciais.yTest || '';
          if (yVal && yVal.startsWith('{')) {
            try {
              const parsed = JSON.parse(yVal);
              setAsYTestRealizou(parsed.realizou || 'sim');
              setAsYLenD(parsed.direita?.comprimentoMembro ?? '');
              setAsYLenE(parsed.esquerda?.comprimentoMembro ?? '');
              setAsYAntD(parsed.direita?.anterior ?? '');
              setAsYAntE(parsed.esquerda?.anterior ?? '');
              setAsYPMD(parsed.direita?.posteromedial ?? '');
              setAsYPME(parsed.esquerda?.posteromedial ?? '');
              setAsYPLD(parsed.direita?.posterolateral ?? '');
              setAsYPLE(parsed.esquerda?.posterolateral ?? '');
              setAsYTest('');
            } catch (err) {
              console.error(err);
            }
          } else {
            setAsYTest(yVal);
            setAsYTestRealizou(yVal && yVal.trim() !== '' ? 'sim' : 'nao');
            setAsYLenD(''); setAsYLenE('');
            setAsYAntD(''); setAsYAntE('');
            setAsYPMD(''); setAsYPME('');
            setAsYPLD(''); setAsYPLE('');
          }

          const sdVal = latest.dadosMedidos.testesEspeciais.stepDown || '';
          if (sdVal && sdVal.startsWith('{')) {
            try {
              const parsed = JSON.parse(sdVal);
              setAsStepDownRealizou(parsed.realizou || 'sim');
              setAsSdPelvica(parsed.quedaPelvica ?? '');
              setAsSdAducao(parsed.aducaoQuadril ?? '');
              setAsSdValgo(parsed.valgoDinamicoJoelho ?? '');
              setAsSdPrps(parsed.compExcentricoPrps ?? '');
              setAsStepDown('');
            } catch (err) {
              console.error(err);
            }
          } else {
            setAsStepDown(sdVal);
            setAsStepDownRealizou(sdVal && sdVal.trim() !== '' ? 'sim' : 'nao');
            setAsSdPelvica(''); setAsSdAducao('');
            setAsSdValgo(''); setAsSdPrps('');
          }
          const maigneVal = latest.dadosMedidos.testesEspeciais.maigne || '';
          try {
            if (maigneVal && maigneVal.startsWith('{')) {
              const parsed = JSON.parse(maigneVal);
              const isDefault =
                (parsed.flexao === undefined || parsed.flexao === 25) &&
                (parsed.flexaoEVA === undefined || parsed.flexaoEVA === 0) &&
                (parsed.extensao === undefined || parsed.extensao === 25) &&
                (parsed.extensaoEVA === undefined || parsed.extensaoEVA === 0) &&
                (parsed.inclinacaoD === undefined || parsed.inclinacaoD === 25) &&
                (parsed.inclinacaoDEVA === undefined || parsed.inclinacaoDEVA === 0) &&
                (parsed.inclinacaoE === undefined || parsed.inclinacaoE === 25) &&
                (parsed.inclinacaoEEVA === undefined || parsed.inclinacaoEEVA === 0) &&
                (parsed.rotacaoD === undefined || parsed.rotacaoD === 25) &&
                (parsed.rotacaoDEVA === undefined || parsed.rotacaoDEVA === 0) &&
                (parsed.rotacaoE === undefined || parsed.rotacaoE === 25) &&
                (parsed.rotacaoEEVA === undefined || parsed.rotacaoEEVA === 0) &&
                (!parsed.observacoes || parsed.observacoes.trim() === '');
              setAsMaigneRealizou(isDefault ? 'nao' : 'sim');

              setAsMaigneData({
                flexao: parsed.flexao !== undefined ? Number(parsed.flexao) : 25,
                flexaoEVA: parsed.flexaoEVA !== undefined ? Number(parsed.flexaoEVA) : 0,
                extensao: parsed.extensao !== undefined ? Number(parsed.extensao) : 25,
                extensaoEVA: parsed.extensaoEVA !== undefined ? Number(parsed.extensaoEVA) : 0,
                inclinacaoD: parsed.inclinacaoD !== undefined ? Number(parsed.inclinacaoD) : 25,
                inclinacaoDEVA: parsed.inclinacaoDEVA !== undefined ? Number(parsed.inclinacaoDEVA) : 0,
                inclinacaoE: parsed.inclinacaoE !== undefined ? Number(parsed.inclinacaoE) : 25,
                inclinacaoEEVA: parsed.inclinacaoEEVA !== undefined ? Number(parsed.inclinacaoEEVA) : 0,
                rotacaoD: parsed.rotacaoD !== undefined ? Number(parsed.rotacaoD) : 25,
                rotacaoDEVA: parsed.rotacaoDEVA !== undefined ? Number(parsed.rotacaoDEVA) : 0,
                rotacaoE: parsed.rotacaoE !== undefined ? Number(parsed.rotacaoE) : 25,
                rotacaoEEVA: parsed.rotacaoEEVA !== undefined ? Number(parsed.rotacaoEEVA) : 0
              });
              setAsMaigne(parsed.observacoes || '');
            } else {
              setAsMaigneRealizou(maigneVal.trim().length > 0 ? 'sim' : 'nao');
              setAsMaigne(maigneVal);
              setAsMaigneData({
                flexao: 25, flexaoEVA: 0,
                extensao: 25, extensaoEVA: 0,
                inclinacaoD: 25, inclinacaoDEVA: 0,
                inclinacaoE: 25, inclinacaoEEVA: 0,
                rotacaoD: 25, rotacaoDEVA: 0,
                rotacaoE: 25, rotacaoEEVA: 0
              });
            }
          } catch (e) {
            console.error('Error parsing Maigne:', e);
            setAsMaigneRealizou(maigneVal.trim().length > 0 ? 'sim' : 'nao');
            setAsMaigne(maigneVal);
          }
        }

        setAsPostura(latest.dadosMedidos?.postura || 'Nenhum desvio importante');
        if (latest.metas?.objetivo2Meses) {
          setAsMeta2Meses(latest.metas.objetivo2Meses);
          mark('metas.objetivo2Meses');
        }
        if (latest.metas?.objetivo1Ano) {
          setAsMeta1Ano(latest.metas.objetivo1Ano);
          mark('metas.objetivo1Ano');
        }

        if (latest.pdf_url) {
          setAsPdfUrl(latest.pdf_url);
          setAsPdfAttachName('PDF anexado anteriormente');
        } else {
          setAsPdfUrl('');
          setAsPdfAttachName('');
        }
        setAsPrefilledFields(prefilled);
      } else {
        // Primeira Avaliação — Limpar tudo
        setAsHeight('');
        setAsWeight('');
        setAsObjetivoPrincipal('');
        setAsObjetivoMeses(3);
        setAsTipoObjetivo('');
        setAsFreqSemanal(3);
        setAsNivelExperiencia('Iniciante / Retorno');
        setShowTipoObjetivoDropdown(false);
        setAsPressao('');
        setAsSono('');
        setAsNutricao('');
        setAsAtivFisica('');
        setAsMedicamentos('');
        setAsCirurgias('');
        setAsQueixas('');
        setAsCirc({
          pescoco: '', ombros: '', torax: '', cintura: '', abdomen: '', quadril: '',
          braçoD: '', braçoE: '', antebraçoD: '', antebraçoE: '', coxaD: '', coxaE: '', panturrilhaD: '', panturrilhaE: ''
        });
        setAsDobras({
          peitoral: '', triceps: '', subescapular: '', subaxilar: '', suprailiaca: '', abdomen: '', coxa: '', panturrilha: ''
        });
        setAsDobrasReadings({
          peitoral: ['', '', ''], triceps: ['', '', ''], subescapular: ['', '', ''], subaxilar: ['', '', ''],
          suprailiaca: ['', '', ''], abdomen: ['', '', ''], coxa: ['', '', ''], panturrilha: ['', '', '']
        });
        setAsGonio({
          quadrilFlexao1D: { semForca: '', comForca: '' },
          quadrilFlexao1E: { semForca: '', comForca: '' },
          quadrilFlexao2D: { semForca: '', comForca: '' },
          quadrilFlexao2E: { semForca: '', comForca: '' },
          quadrilRotIntD: { semForca: '', comForca: '' },
          quadrilRotIntE: { semForca: '', comForca: '' },
          quadrilRotExtD: { semForca: '', comForca: '' },
          quadrilRotExtE: { semForca: '', comForca: '' },
          joelhoFlexaoD: { semForca: '', comForca: '' },
          joelhoFlexaoE: { semForca: '', comForca: '' },
          joelhoPopliteoD: { semForca: '', comForca: '' },
          joelhoPopliteoE: { semForca: '', comForca: '' },
          tornozeloDorsi1D: { semForca: '', comForca: '' },
          tornozeloDorsi1E: { semForca: '', comForca: '' },
          tornozeloDorsi2D: { semForca: '', comForca: '' },
          tornozeloDorsi2E: { semForca: '', comForca: '' },
          tornozeloFlexaoPlantarD: { semForca: '', comForca: '' },
          tornozeloFlexaoPlantarE: { semForca: '', comForca: '' },
          ombroRotIntD: { semForca: '', comForca: '' },
          ombroRotIntE: { semForca: '', comForca: '' },
          ombroRotExtD: { semForca: '', comForca: '' },
          ombroRotExtE: { semForca: '', comForca: '' },
          ombroFlexaoD: { semForca: '', comForca: '' },
          ombroFlexaoE: { semForca: '', comForca: '' }
        });
        setAsOberD('Negativo');
        setAsOberE('Negativo');
        setAsThomasD('Negativo');
        setAsThomasE('Negativo');
        setAsThomasIliopsoasD('');
        setAsThomasIliopsoasE('');
        setAsThomasRetofemoralD('');
        setAsThomasRetofemoralE('');
        setAsTermografia('');
        setAsYTest('');
        setAsStepDown('');
        setAsTermografiaRealizou('nao');
        setAsYTestRealizou('nao');
        setAsStepDownRealizou('nao');
        setAsYLenD(''); setAsYLenE('');
        setAsYAntD(''); setAsYAntE('');
        setAsYPMD(''); setAsYPME('');
        setAsYPLD(''); setAsYPLE('');
        setAsSdPelvica(''); setAsSdAducao('');
        setAsSdValgo(''); setAsSdPrps('');
        setAsMaigne('');
        setAsMaigneData({
          flexao: 25, flexaoEVA: 0,
          extensao: 25, extensaoEVA: 0,
          inclinacaoD: 25, inclinacaoDEVA: 0,
          inclinacaoE: 25, inclinacaoEEVA: 0,
          rotacaoD: 25, rotacaoDEVA: 0,
          rotacaoE: 25, rotacaoEEVA: 0
        });
        setAsPostura('Nenhum desvio importante');
        setAsPdfUrl('');
        setAsPdfAttachName('');
        setAsPrefilledFields({});
        setAsMeta2Meses('');
        setAsMeta1Ano('');
      }
    }
  }, [asClient, clients, assessments]);

  // Carregar último prontuário ao mudar o paciente selecionado (alinhamento com projeto original)
  useEffect(() => {
    if (!prClient) {
      setPrContent('');
      return;
    }
    const clientProntuarios = prontuarios.filter(p => {
      const pClientId = typeof p.clienteId === 'object' ? p.clienteId?._id : p.clienteId;
      return pClientId === prClient;
    });
    if (clientProntuarios.length > 0) {
      const sorted = [...clientProntuarios].sort((a, b) => (b.data || '').localeCompare(a.data || '') || (b._id || '').localeCompare(a._id || ''));
      setPrContent(sorted[0].conteudo || '');
    } else {
      setPrContent('');
    }
  }, [prClient, prontuarios]);

  // Cálculo da composição corporal em tempo real (Pollock 7 dobras + Siri)
  useEffect(() => {
    const p = parseFloat(asWeight) || 0;
    const a = parseFloat(asHeight) || 0;
    const age = Number(asAge) || 30;
    const sex = asSex || 'M';

    const peitoral = parseFloat(asDobras.peitoral as any) || 0;
    const triceps = parseFloat(asDobras.triceps as any) || 0;
    const subescapular = parseFloat(asDobras.subescapular as any) || 0;
    const subaxilar = parseFloat(asDobras.subaxilar as any) || 0;
    const suprailiaca = parseFloat(asDobras.suprailiaca as any) || 0;
    const abdomen = parseFloat(asDobras.abdomen as any) || 0;
    const coxa = parseFloat(asDobras.coxa as any) || 0;

    const sum7 = peitoral + triceps + subescapular + subaxilar + suprailiaca + abdomen + coxa;
    setAsSomaDobras(sum7);

    if (p > 0 && a > 0 && sum7 > 0) {
      let bd = 1.0;
      if (sex === 'M') {
        bd = 1.112 - (0.00043499 * sum7) + (0.00000055 * sum7 * sum7) - (0.00028826 * age);
      } else {
        bd = 1.097 - (0.00046971 * sum7) + (0.00000056 * sum7 * sum7) - (0.00012828 * age);
      }

      let fat = ((4.95 / bd) - 4.5) * 100;
      if (fat < 2) fat = 2;
      if (fat > 60) fat = 60;

      const fatVal = parseFloat(fat.toFixed(1));
      const fatM = parseFloat((p * (fatVal / 100)).toFixed(1));
      const leanM = parseFloat((p - fatM).toFixed(1));

      setAsFat(fatVal.toString());
      setAsMassaMagra(leanM.toString());
      setAsMassaGorda(fatM.toString());
    } else {
      setAsFat('');
      setAsMassaMagra('');
      setAsMassaGorda('');
    }
  }, [asWeight, asHeight, asAge, asSex, asDobras]);

  // Handle CRUD submissions
  const handleCreateApt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        data: aptDate,
        horario: aptTime,
        tipo: aptType,
        servico: aptService,
        consumeCredito: aptService === 'Treino Monitorado',
        profissionalId: '6668ab030303030303030302', // Camila Lima
        clienteId: selectedClient
      };
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setShowAptModal(false);
        fetchData();
      } else {
        alert('Erro ao agendar: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro na requisição: ' + err.message);
    }
  };

  const handleUpdateAptStatus = async (id: string, status: string) => {
    // If confirming presence for an emergency appointment, open special modal
    if (status === 'presenca') {
      const apt = appointments.find((a: any) => a._id === id);
      if (apt?.servico === 'Emergência') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setEmergencyAptId(id);
        setEmergencyApt(apt);
        setEmergencyConduct('alta');
        setEmergencyReport('');
        setEmergencyReschedDate(tomorrow.toISOString().split('T')[0]);
        setEmergencyReschedHour('08:00');
        setShowEmergencyModal(true);
        return;
      }
    }
    try {
      const res = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEmergencyResolution = async () => {
    if (!emergencyReport.trim()) { alert('Por favor, preencha o relatório para o Prontuário Clínico.'); return; }
    if (emergencyConduct === 'remarcacao' && (!emergencyReschedDate || !emergencyReschedHour)) { alert('Preencha a data e o horário para a remarcação.'); return; }
    try {
      // 1. Mark original appointment as present
      await fetch('/api/appointments', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: emergencyAptId, status: 'presenca' }) });
      // 2. Create prontuário from emergency report
      const condutaText = emergencyConduct === 'alta' ? 'Alta do Paciente' : `Remarcado para ${emergencyReschedDate} às ${emergencyReschedHour}`;
      const prontuarioObs = `[Atendimento de Emergência - Finalização]\nConduta: ${condutaText}\n\nRelato Clínico:\n${emergencyReport}`;
      await fetch('/api/prontuarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clienteId: emergencyApt?.clienteId?._id || emergencyApt?.clienteId, profissionalId: emergencyApt?.profissionalId?._id || emergencyApt?.profissionalId || professionalId || '6668ab030303030303030301', data: emergencyApt?.data, conteudo: prontuarioObs }) });
      // 3. If rescheduling, create new appointment
      if (emergencyConduct === 'remarcacao') {
        await fetch('/api/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: emergencyReschedDate, horario: emergencyReschedHour, servico: 'Emergência', clienteId: emergencyApt?.clienteId?._id || emergencyApt?.clienteId, profissionalId: emergencyApt?.profissionalId?._id || emergencyApt?.profissionalId, status: 'agendado' }) });
      }
      setShowEmergencyModal(false);
      alert('Atendimento de emergência finalizado e prontuário gerado!');
      fetchData();
    } catch (err: any) {
      alert('Erro ao salvar resolução: ' + err.message);
    }
  };

  const handleCreateFixedSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        clienteId: fsClient,
        profissionalId: '6668ab030303030303030302', // Camila Lima
        diaSemana: Number(fsDay),
        horario: fsTime,
        servico: fsService,
        dataInicio: fsDate
      };
      const res = await fetch('/api/fixed-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setShowFixedSchedModal(false);
        fetchData();
      } else {
        alert('Erro ao criar horário fixo: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro de conexão.');
    }
  };

  const handleDeleteFixedSchedule = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta regra de horário fixo?')) {
      await fetch(`/api/fixed-schedules?id=${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asClient) {
      alert('Por favor, selecione um aluno/cliente.');
      return;
    }
    if (!asDate) {
      alert('Por favor, informe a data da avaliação.');
      return;
    }
    try {
      const p = parseFloat(asWeight) || 0;
      const a = parseFloat(asHeight) || 0;
      
      // IMC
      let imc = 0;
      let imcClass = '-';
      if (p > 0 && a > 0) {
        imc = parseFloat((p / (a * a)).toFixed(2));
        if (imc < 18.5) imcClass = 'Baixo peso';
        else if (imc < 25) imcClass = 'Normal';
        else if (imc < 30) imcClass = 'Sobrepeso';
        else imcClass = 'Obesidade';
      }

      // RCQ
      const cintura = parseFloat(asCirc.cintura as any) || 0;
      const quadril = parseFloat(asCirc.quadril as any) || 1;
      const rcq = parseFloat((cintura / quadril).toFixed(2));
      let rcqClass = 'Baixo Risco';
      if (asSex === 'M') {
        if (rcq > 0.95) rcqClass = 'Alto Risco';
        else if (rcq >= 0.88) rcqClass = 'Risco Moderado';
      } else {
        if (rcq > 0.86) rcqClass = 'Alto Risco';
        else if (rcq >= 0.78) rcqClass = 'Risco Moderado';
      }

      // Cálculo de Metas
      let metaGorduraVal = 0;
      let metaMassaVal = 0;
      if (asTipoObjetivo) {
        const objectives = asTipoObjetivo.split(',').filter(Boolean);
        const freq = Number(asFreqSemanal) || 3;
        const sexo = asSex || 'M';
        const meses = Number(asObjetivoMeses) || 3;
        const nivel = asNivelExperiencia || 'Iniciante / Retorno';
        const totalSemanas = Math.round(meses * 4.33);

        objectives.forEach(tipo => {
          const weeklyRate = calculateObjectiveWeeklyRate(p, sexo, freq, nivel, tipo);
          const expectedTotal = weeklyRate * 1.00 * totalSemanas;
          if (tipo === 'Emagrecimento') {
            metaGorduraVal = parseFloat(expectedTotal.toFixed(2));
          } else {
            metaMassaVal = parseFloat(expectedTotal.toFixed(2));
          }
        });
      }

      const payload = {
        clienteId: asClient,
        avaliadorId: asAvaliador || '6668ab030303030303030302',
        data: asDate,
        dadosMedidos: {
          idade: Number(asAge),
          peso: p,
          altura: a,
          sexo: asSex,
          objetivoPrincipal: asObjetivoPrincipal,
          tipoObjetivo: asTipoObjetivo,
          nivelExperiencia: asNivelExperiencia,
          freqSemanal: Number(asFreqSemanal),
          objetivoMeses: Number(asObjetivoMeses),
          saudeGeral: {
            pressaoArterial: asPressao,
            sono: asSono,
            nutricao: asNutricao,
            atividadeFisica: asAtivFisica,
            medicamentos: asMedicamentos,
            cirurgias: asCirurgias,
            queixas: asQueixas
          },
          circunferencias: {
            pescoco: Number(asCirc.pescoco),
            ombros: Number(asCirc.ombros),
            torax: Number(asCirc.torax),
            cintura: Number(asCirc.cintura),
            abdomen: Number(asCirc.abdomen),
            quadril: Number(asCirc.quadril),
            braçoD: Number(asCirc.braçoD),
            braçoE: Number(asCirc.braçoE),
            antebraçoD: Number(asCirc.antebraçoD),
            antebraçoE: Number(asCirc.antebraçoE),
            coxaD: Number(asCirc.coxaD),
            coxaE: Number(asCirc.coxaE),
            panturrilhaD: Number(asCirc.panturrilhaD),
            panturrilhaE: Number(asCirc.panturrilhaE)
          },
dobras: {
            peitoral: Number(asDobras.peitoral) || 0,
            triceps: Number(asDobras.triceps) || 0,
            subescapular: Number(asDobras.subescapular) || 0,
            subaxilar: Number(asDobras.subaxilar) || 0,
            suprailiaca: Number(asDobras.suprailiaca) || 0,
            abdomen: Number(asDobras.abdomen) || 0,
            coxa: Number(asDobras.coxa) || 0,
            panturrilha: Number(asDobras.panturrilha) || 0
          },
          dobrasReadings: asDobrasReadings,
          somaDobras: asSomaDobras,
          percentil: 50,
goniometria: {
            quadrilFlexao1D: asGonio.quadrilFlexao1D,
            quadrilFlexao1E: asGonio.quadrilFlexao1E,
            quadrilFlexao2D: asGonio.quadrilFlexao2D,
            quadrilFlexao2E: asGonio.quadrilFlexao2E,
            quadrilRotIntD: asGonio.quadrilRotIntD,
            quadrilRotIntE: asGonio.quadrilRotIntE,
            quadrilRotExtD: asGonio.quadrilRotExtD,
            quadrilRotExtE: asGonio.quadrilRotExtE,
            joelhoFlexaoD: asGonio.joelhoFlexaoD,
            joelhoFlexaoE: asGonio.joelhoFlexaoE,
            joelhoPopliteoD: asGonio.joelhoPopliteoD,
            joelhoPopliteoE: asGonio.joelhoPopliteoE,
            tornozeloDorsi1D: asGonio.tornozeloDorsi1D,
            tornozeloDorsi1E: asGonio.tornozeloDorsi1E,
            tornozeloDorsi2D: asGonio.tornozeloDorsi2D,
            tornozeloDorsi2E: asGonio.tornozeloDorsi2E,
            tornozeloFlexaoPlantarD: asGonio.tornozeloFlexaoPlantarD,
            tornozeloFlexaoPlantarE: asGonio.tornozeloFlexaoPlantarE,
            ombroRotIntD: asGonio.ombroRotIntD,
            ombroRotIntE: asGonio.ombroRotIntE,
            ombroRotExtD: asGonio.ombroRotExtD,
            ombroRotExtE: asGonio.ombroRotExtE,
            ombroFlexaoD: asGonio.ombroFlexaoD,
            ombroFlexaoE: asGonio.ombroFlexaoE
          },
          testesEspeciais: {
            oberD: asOberD,
            oberE: asOberE,
            thomasD: asThomasD,
            thomasE: asThomasE,
            thomasIliopsoasD: asThomasD === 'Positivo' ? (parseFloat(asThomasIliopsoasD) || null) : null,
            thomasIliopsoasE: asThomasE === 'Positivo' ? (parseFloat(asThomasIliopsoasE) || null) : null,
            thomasRetofemoralD: asThomasD === 'Positivo' ? (parseFloat(asThomasRetofemoralD) || null) : null,
            thomasRetofemoralE: asThomasE === 'Positivo' ? (parseFloat(asThomasRetofemoralE) || null) : null,
            termografia: asTermografiaRealizou === 'sim' ? asTermografia : '',
            yTest: asYTestRealizou === 'sim'
              ? (asYLenD !== '' || asYAntD !== ''
                  ? JSON.stringify({
                      realizou: 'sim',
                      direita: { comprimentoMembro: Number(asYLenD) || 0, anterior: Number(asYAntD) || 0, posteromedial: Number(asYPMD) || 0, posterolateral: Number(asYPLD) || 0 },
                      esquerda: { comprimentoMembro: Number(asYLenE) || 0, anterior: Number(asYAntE) || 0, posteromedial: Number(asYPME) || 0, posterolateral: Number(asYPLE) || 0 }
                    })
                  : asYTest)
              : '',
            stepDown: asStepDownRealizou === 'sim'
              ? (asSdPelvica !== '' || asSdAducao !== '' || asSdValgo !== '' || asSdPrps !== ''
                  ? JSON.stringify({
                      realizou: 'sim',
                      quedaPelvica: Number(asSdPelvica) || 0,
                      aducaoQuadril: Number(asSdAducao) || 0,
                      valgoDinamicoJoelho: Number(asSdValgo) || 0,
                      compExcentricoPrps: Number(asSdPrps) || 0
                    })
                  : asStepDown)
              : '',
            maigne: asMaigneRealizou === 'sim' ? JSON.stringify({ ...asMaigneData, observacoes: asMaigne }) : ''
          },
          flexibilidade: '',
          postura: asPostura
        },
        resultadosCalculados: {
          imc,
          imcClassificacao: imcClass,
          rcq,
          rcqClassificacao: rcqClass,
          percentualGordura: Number(asFat) || 0,
          massaMagra: Number(asMassaMagra) || 0,
          massaGorda: Number(asMassaGorda) || 0
        },
        metas: {
          metaGorduraValor: metaGorduraVal,
          metaGorduraAlvo: metaGorduraVal > 0 ? 12 : 0,
          metaMassaValor: metaMassaVal,
          metaMassaAlvo: metaMassaVal > 0 ? 5 : 0,
          metaCondicionamentoProgresso: 60,
          metaFlexibilidadeProgresso: 50
        },
        observacoes: asObs,
        pdfName: `Avaliacao_${asDate}.pdf`,
        pdf_url: asPdfUrl || ''
      };

      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          metas: {
            ...payload.metas,
            objetivo2Meses: asMeta2Meses,
            objetivo1Ano: asMeta1Ano
          },
          tempoGastoSegundos: asTimerSeconds
        })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.removeItem('draft_assessment');
        setShowAssessmentModal(false);
        fetchData();
        alert('Avaliação física criada com sucesso!');
      } else {
        alert('Erro ao criar avaliação física: ' + data.error);
      }
    } catch (err) {
      alert('Erro ao enviar: ' + (err as Error).message);
    }
  };

  const handleDeleteAssessment = async (id: string) => {
    if (confirm('Excluir esta avaliação física?')) {
      await fetch(`/api/assessments?id=${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const [tempExameNome, setTempExameNome] = useState('');
  const [tempExamePdfB64, setTempExamePdfB64] = useState('');
  const [tempExamePdfName, setTempExamePdfName] = useState('');
  
  const handleExameFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      alert('O arquivo PDF é muito grande! Escolha um arquivo de até 1.5 MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setTempExamePdfB64(event.target?.result as string);
      setTempExamePdfName(file.name);
    };
    reader.readAsDataURL(file);
  };
  
  const handleTermoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) {
      alert('A imagem termográfica é muito grande! Escolha um arquivo de até 800 KB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setRepTermografiaImgB64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAsTermoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      alert('A imagem termográfica é muito grande! Escolha um arquivo de até 1.5 MB.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setAsTermografia(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeAsTermoImage = () => {
    setAsTermografia('');
  };

  const handleAsPdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Por favor, selecione apenas arquivos PDF.');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('O PDF é muito grande! Escolha um arquivo de até 10 MB.');
      e.target.value = '';
      return;
    }
    setAsPdfAttachName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setAsPdfUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeAsPdfAttach = () => {
    setAsPdfUrl('');
    setAsPdfAttachName('');
  };

  const downloadExame = (index: number) => {
    const exame = repExamesList[index];
    if (!exame || !exame.pdfB64) return;
    const link = document.createElement('a');
    link.href = exame.pdfB64;
    link.download = exame.fileName || 'exame.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const addExame = () => {
    if (!tempExameNome.trim() || !tempExamePdfB64) {
      alert('Por favor, digite o nome do exame e selecione o arquivo PDF.');
      return;
    }
    setRepExamesList([...repExamesList, { nome: tempExameNome, pdfB64: tempExamePdfB64, fileName: tempExamePdfName }]);
    setTempExameNome('');
    setTempExamePdfB64('');
    setTempExamePdfName('');
  };
  
  const removeExame = (index: number) => {
    setRepExamesList(repExamesList.filter((_, idx) => idx !== index));
  };

  const addQueixa = () => {
    setRepQueixas([...repQueixas, { dorOnde: '', quandoComecou: '', comoIniciou: '', dorEvolucao: 'estavel', dorIntensidade: 5, dorTodoMomento: 'sim', desencadeiaPiora: '', melhoraDesaparece: '', caracteristicaDor: 'Pontual / Aguda', origens: [] }]);
  };
  
  const removeQueixa = (index: number) => {
    setRepQueixas(repQueixas.filter((_, idx) => idx !== index));
  };
  
  const updateQueixa = (index: number, field: string, val: any) => {
    setRepQueixas(repQueixas.map((q, idx) => idx === index ? { ...q, [field]: val } : q));
  };

  const addCirurgia = () => {
    setRepCirurgiasList([...repCirurgiasList, { data: '', local: '' }]);
  };
  
  const removeCirurgia = (index: number) => {
    setRepCirurgiasList(repCirurgiasList.filter((_, idx) => idx !== index));
  };
  
  const updateCirurgia = (index: number, field: string, val: any) => {
    setRepCirurgiasList(repCirurgiasList.map((c, idx) => idx === index ? { ...c, [field]: val } : c));
  };

  // ========== IMPORT FROM PHYSICAL ASSESSMENT HELPERS ==========
  const getLatestRepAssessment = () => {
    if (!repClient) return null;
    const list = assessments
      .filter((a: any) => (typeof a.clienteId === 'object' ? a.clienteId?._id : a.clienteId) === repClient)
      .sort((a: any, b: any) => b.data.localeCompare(a.data));
    return list[0] || null;
  };

  const fmtDateBR = (d: string) => {
    if (!d) return '';
    const p = d.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
  };

  const importFromPhysAssessment = (sections: string[]) => {
    const latest = getLatestRepAssessment();
    if (!latest) return;
    if (sections.includes('goniometria') && latest.dadosMedidos?.goniometria) {
      const g = latest.dadosMedidos.goniometria;
      const mappedGonio: any = {};
      const keys = [
        'quadrilFlexao1D', 'quadrilFlexao1E', 'quadrilFlexao2D', 'quadrilFlexao2E',
        'quadrilRotIntD', 'quadrilRotIntE', 'quadrilRotExtD', 'quadrilRotExtE',
        'joelhoFlexaoD', 'joelhoFlexaoE', 'joelhoPopliteoD', 'joelhoPopliteoE',
        'tornozeloDorsi1D', 'tornozeloDorsi1E', 'tornozeloDorsi2D', 'tornozeloDorsi2E',
        'tornozeloFlexaoPlantarD', 'tornozeloFlexaoPlantarE', 'ombroRotIntD', 'ombroRotIntE',
        'ombroRotExtD', 'ombroRotExtE', 'ombroFlexaoD', 'ombroFlexaoE', 'ombroAbducaoD', 'ombroAbducaoE'
      ];
      keys.forEach(k => {
        let val = g[k];
        let mapKey = k;
        if (k === 'ombroAbducaoD') mapKey = 'ombroFlexaoD';
        if (k === 'ombroAbducaoE') mapKey = 'ombroFlexaoE';
        mappedGonio[mapKey] = parseGonioValue(val);
      });
      setGGonio(mappedGonio);
    }
    if (sections.includes('testes') && latest.dadosMedidos?.testesEspeciais) {
      const te = latest.dadosMedidos.testesEspeciais;
      if (te.oberD) setTOberD(te.oberD);
      if (te.oberE) setTOberE(te.oberE);
      if (te.thomasD) setTThomasD(te.thomasD);
      if (te.thomasE) setTThomasE(te.thomasE);
      if (te.thomasIliopsoasD) setTThomasIliopsoasD(te.thomasIliopsoasD);
      if (te.thomasIliopsoasE) setTThomasIliopsoasE(te.thomasIliopsoasE);
      if (te.thomasRetofemoralD) setTThomasRetofemoralD(te.thomasRetofemoralD);
      if (te.thomasRetofemoralE) setTThomasRetofemoralE(te.thomasRetofemoralE);
    }
    if (sections.includes('perimetria') && latest.dadosMedidos?.circunferencias) {
      const c = latest.dadosMedidos.circunferencias;
      setRepCirc({
        pescoco: c.pescoco || '', ombros: c.ombros || '', torax: c.torax || '',
        cintura: c.cintura || '', abdomen: c.abdomen || '', quadril: c.quadril || '',
        braçoD: c.braçoD || '', braçoE: c.braçoE || '', antebraçoD: c.antebraçoD || '',
        antebraçoE: c.antebraçoE || '', coxaD: c.coxaD || '', coxaE: c.coxaE || '',
        panturrilhaD: c.panturrilhaD || '', panturrilhaE: c.panturrilhaE || ''
      });
    }
    if (sections.includes('ytest') && latest.dadosMedidos?.testesEspeciais?.yTest) {
      try {
        const yd = JSON.parse(latest.dadosMedidos.testesEspeciais.yTest);
        if (yd?.realizou === 'sim') {
          setYRealizou('sim');
          setYLenD(yd.direita?.comprimentoMembro || 0); setYLenE(yd.esquerda?.comprimentoMembro || 0);
          setYAntD(yd.direita?.anterior || 0); setYAntE(yd.esquerda?.anterior || 0);
          setYPMD(yd.direita?.posteromedial || 0); setYPME(yd.esquerda?.posteromedial || 0);
          setYPLD(yd.direita?.posterolateral || 0); setYPLE(yd.esquerda?.posterolateral || 0);
        }
      } catch { /* legacy */ }
    }
    if (sections.includes('stepdown') && latest.dadosMedidos?.testesEspeciais?.stepDown) {
      try {
        const sd = JSON.parse(latest.dadosMedidos.testesEspeciais.stepDown);
        if (sd?.realizou === 'sim') {
          setSdRealizou('sim');
          setSdPelvica(sd.quedaPelvica || 0); setSdAducao(sd.aducaoQuadril || 0);
          setSdValgo(sd.valgoDinamicoJoelho || 0); setSdPrps(sd.compExcentricoPrps || 0);
        }
      } catch { /* legacy */ }
    }
    if (sections.includes('termografia') && latest.dadosMedidos?.testesEspeciais?.termografia) {
      setRepTermografiaRealizou('sim');
      setRepTermografiaImgB64(latest.dadosMedidos.testesEspeciais.termografia);
    }
  };
  // ============================================================

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let payload: any = {
        clienteId: repClient,
        profissionalId: repAvaliador || professionalId || '6668ab030303030303030301',
        data: repDate,
        conteudo: {
          queixaPrincipal: repType === 'simplificado' ? repContent : (repQueixas[0]?.dorOnde || 'Anamnese Completa'),
          dorEscala: repType === 'simplificado' ? Number(repPain) : Number(repQueixas[0]?.dorIntensidade || 5),
          exercicios: repExercicios,
          conduta: repContent
        },
        pdfName: `Relatorio_Fisioterapia_${Date.now()}.pdf`,
        tempoGastoSegundos: repTimerSeconds
      };

      if (repType === 'completo') {
        payload.anamnese = {
          queixas: repQueixas,
          historico: {
            traumas: repTraumas,
            cirurgiasRealizou: repCirurgiasRealizou,
            cirurgias: repCirurgiasList,
            doencasPregressasAtuais: repDoencas,
            traumasEmocionaisStress: repTraumasEmo,
            medicacao: repMedicao,
            drogasRecreativas: repDrogas
          },
          habitos: {
            sonoHoras: Number(repSonoHoras),
            sonoTipo: repSonoTipo,
            sonoQualidade: repSonoQualidade,
            alimentacaoDor: repAlimentacaoDor,
            atividadeFisicaFaz: repAtividadeFisica,
            atividadeFisicaQual: repAtividadeFisicaQual,
            atividadeFisicaInterfere: repAtividadeFisicaInterfere,
            stressNivel: Number(repStress),
            controleStress: repControleStress
          }
        };

        payload.goniometria = gGonio;

        payload.testesEspeciais = {
          oberD: tOberD, oberE: tOberE,
          thomasD: tThomasD, thomasE: tThomasE,
          thomasIliopsoasD: tThomasIliopsoasD !== '' ? Number(tThomasIliopsoasD) : null,
          thomasIliopsoasE: tThomasIliopsoasE !== '' ? Number(tThomasIliopsoasE) : null,
          thomasRetofemoralD: tThomasRetofemoralD !== '' ? Number(tThomasRetofemoralD) : null,
          thomasRetofemoralE: tThomasRetofemoralE !== '' ? Number(tThomasRetofemoralE) : null
        };
        payload.perimetria = repCirc;

        payload.termografia = {
          realizou: repTermografiaRealizou,
          imagemB64: repTermografiaImgB64
        };

        payload.examesComplementares = repExamesList;

        payload.testesOrtopedicos = {
          yTeste: {
            realizou: yRealizou,
            direita: { anterior: Number(yAntD), posteromedial: Number(yPMD), posterolateral: Number(yPLD), comprimentoMembro: Number(yLenD) },
            esquerda: { anterior: Number(yAntE), posteromedial: Number(yPME), posterolateral: Number(yPLE), comprimentoMembro: Number(yLenE) }
          },
          estrelaMaigne: {
            realizou: repMaigneRealizou,
            flexao: Number(mFlex), flexaoEVA: Number(mFlexEVA),
            extensao: Number(mExt), extensaoEVA: Number(mExtEVA),
            inclinacaoD: Number(mIncD), inclinacaoDEVA: Number(mIncDEVA),
            inclinacaoE: Number(mIncE), inclinacaoEEVA: Number(mIncEEVA),
            rotacaoD: Number(mRotD), rotacaoDEVA: Number(mRotDEVA),
            rotacaoE: Number(mRotE), rotacaoEEVA: Number(mRotEEVA)
          },
          stepDown: {
            realizou: sdRealizou,
            quedaPelvica: Number(sdPelvica),
            aducaoQuadril: Number(sdAducao),
            valgoDinamicoJoelho: Number(sdValgo),
            compExcentricoPrps: Number(sdPrps)
          },
          discinesiaEscapular: {
            realizou: repDeRealizou,
            tipo: repDeTipo,
            abducaoBilateralCabecaFrente: repDeAbdBilateral,
            abducaoUnilateralToracicaCabeca: repDeAbdUnilateral,
            dorAbducaoUnilateralInclinacao: repDeDorAbd
          }
        };
      }

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        localStorage.removeItem('draft_report');
        setShowReportModal(false);
        // Reset states
        setRepActiveStep(1);
        setRepQueixas([
          {
            dorOnde: '',
            quandoComecou: '',
            comoIniciou: '',
            dorEvolucao: 'estavel',
            dorIntensidade: 5,
            dorTodoMomento: 'sim',
            desencadeiaPiora: '',
            melhoraDesaparece: '',
            caracteristicaDor: 'Pontual / Aguda',
            origens: []
          }
        ]);
        setRepCirurgiasRealizou('nao');
        setRepCirurgiasList([]);
        setRepTraumas('');
        setRepCirurgias('');
        setRepDoencas('');
        setRepTraumasEmo('');
        setRepMedicao('');
        setRepDrogas('');
        setRepSonoHoras(8);
        setRepSonoTipo('continuo');
        setRepSonoQualidade('Bom');
        setRepAlimentacaoDor('');
        setRepAtividadeFisicaQual('');
        setRepAtividadeFisicaInterfere('');
        setRepControleStress('');
        setRepStress(5);
        setRepSono(8);
        setRepAtividadeFisica('nao');
        setRepTermografiaRealizou('nao');
        setRepTermografiaImgB64('');
        setRepExamesList([]);
        setRepDeRealizou('nao');
        setRepDeTipo('Tipo IV');
        setRepDeAbdBilateral('nao');
        setRepDeAbdUnilateral('nao');
        setRepDeDorAbd('nao');
        setRepMaigneRealizou('nao');
        setYRealizou('nao');
        setSdRealizou('nao');
        setRepExercicios('');
        setRepContent('');
        fetchData();
        
        // Trigger report PDF download
        downloadReportPDF(data.data);
      } else {
        alert('Erro ao criar relatório: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro ao enviar: ' + err.message);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (confirm('Excluir este relatório?')) {
      await fetch(`/api/reports?id=${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const selectedClientObj = clients.find(c => c._id === stClient);
  const clientSex = selectedClientObj?.dadosPessoais?.sexo ? (selectedClientObj.dadosPessoais.sexo.trim().toUpperCase().startsWith('F') ? 'F' : 'M') : 'M';

  const calculateTestMetrics = (art: string, mov: string, lado: string, uni: string, valObtido: number, tent: number, melhor: number, media: number, peso: number, sex: string) => {
    const forcaN = uni === 'kgf' ? valObtido * 9.81 : valObtido;
    const pesoCorporalN = peso * 9.81;
    const pcPercent = pesoCorporalN > 0 ? (forcaN / pesoCorporalN) * 100 : 0;

    // Get reference
    const refData = STRENGTH_REFERENCE_TABLE[art]?.[mov]?.[sex === 'F' ? 'F' : 'M'] || { min: 0, max: 0 };
    const refMin = refData.min;
    const refMax = refData.max;
    const refMed = (refMin + refMax) / 2;

    const pctRef = refMed > 0 ? (pcPercent / refMed) * 100 : 0;

    // Classificação clínica
    let classificacao = '';
    if (pctRef >= 90) classificacao = 'FORÇA NORMAL';
    else if (pctRef >= 75) classificacao = 'DÉFICIT LEVE';
    else if (pctRef >= 50) classificacao = 'DÉFICIT MODERADO';
    else classificacao = 'DÉFICIT GRAVE';

    return {
      articulacao: art,
      movimento: mov,
      lado,
      unidade: uni,
      valorObtido: valObtido,
      tentativas: tent,
      melhorTentativa: melhor,
      mediaTentativas: media,
      forcaN,
      pesoCorporalN,
      pcPercent,
      pctRef,
      classificacao
    };
  };

  const calculateComparativos = (testList: any[]) => {
    const comps: any[] = [];
    // Group tests by articulation and movement
    const groups: Record<string, { Direito?: any, Esquerdo?: any }> = {};
    testList.forEach(t => {
      const key = `${t.articulacao}_${t.movimento}`;
      if (!groups[key]) groups[key] = {};
      if (t.lado === 'Direito') groups[key].Direito = t;
      if (t.lado === 'Esquerdo') groups[key].Esquerdo = t;
    });

    Object.keys(groups).forEach(key => {
      const { Direito, Esquerdo } = groups[key];
      if (Direito && Esquerdo) {
        const valD = Direito.forcaN;
        const valE = Esquerdo.forcaN;
        const minVal = Math.min(valD, valE);
        const maxVal = Math.max(valD, valE);

        const simetria = maxVal > 0 ? (minVal / maxVal) * 100 : 0;
        const deficit = maxVal > 0 ? ((maxVal - minVal) / maxVal) * 100 : 0;

        let classificacaoSimetria = '';
        if (simetria >= 90) classificacaoSimetria = 'Excelente';
        else if (simetria >= 85) classificacaoSimetria = 'Aceitável';
        else if (simetria >= 80) classificacaoSimetria = 'Atenção';
        else classificacaoSimetria = 'Assimetria Relevante';

        const [art, mov] = key.split('_');
        comps.push({
          articulacao: art,
          movimento: mov,
          valorD: valD,
          valorE: valE,
          simetria,
          deficit,
          classificacaoSimetria
        });
      }
    });

    return comps;
  };

  const handleAddTestItem = () => {
    if (!stPeso) {
      alert('Por favor, informe o Peso Corporal do aluno no topo do formulário.');
      const el = document.querySelector('input[placeholder="Peso em kg"]') as HTMLInputElement;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
        el.style.border = '2px solid var(--color-danger)';
        setTimeout(() => el.style.border = '', 3000);
      }
      return;
    }
    if (!stValorObtido) {
      alert('Por favor, informe o Valor Obtido do teste.');
      const el = document.querySelector('input[placeholder="0.0"]') as HTMLInputElement;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
        el.style.border = '2px solid var(--color-danger)';
        setTimeout(() => el.style.border = '', 3000);
      }
      return;
    }
    if (!stArticulacao || !stMovimento) {
      alert('Por favor, selecione a Articulação e o Movimento.');
      return;
    }

    const testItem = calculateTestMetrics(
      stArticulacao,
      stMovimento,
      stLado,
      stUnidade,
      Number(stValorObtido),
      Number(stTentativas) || 1,
      Number(stMelhorTentativa) || Number(stValorObtido),
      Number(stMediaTentativas) || Number(stValorObtido),
      Number(stPeso),
      clientSex
    );

    // Overwrite if same movement + articulation + side already exists
    const filtered = stTestesList.filter(t => !(t.articulacao === stArticulacao && t.movimento === stMovimento && t.lado === stLado));
    const newList = [...filtered, testItem];
    setStTestesList(newList);

    // Clean current inputs for ease of next input
    setStValorObtido('');
    setStMelhorTentativa('');
    setStMediaTentativas('');
    setStTentativas('1');
    // Auto-toggle side to make bilateral logging faster
    setStLado(stLado === 'Direito' ? 'Esquerdo' : 'Direito');
  };

  const handleRemoveTestItem = (index: number) => {
    const newList = stTestesList.filter((_, idx) => idx !== index);
    setStTestesList(newList);
  };

  const handleCreateStrengthTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stTestesList.length === 0) {
      alert('Por favor, adicione pelo menos um teste de movimento.');
      return;
    }
    try {
      const payload = {
        clienteId: stClient,
        profissionalId: stAvaliador || '6668ab030303030303030302',
        data: stDate,
        pesoCliente: Number(stPeso),
        testesRealizados: stTestesList,
        comparativos: calculateComparativos(stTestesList),
        observacoes: stObs,
        pdfName: `TesteForca_${stDate}.pdf`,
        tempoGastoSegundos: stTimerSeconds
      };
      
      const res = await fetch('/api/strength-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        localStorage.removeItem('draft_strength');
        setShowStModal(false);
        fetchData();
        // Reset states
        setStTestesList([]);
        setStObs('');
      } else {
        alert('Erro ao criar teste de força: ' + data.error);
      }
    } catch (err) {
      alert('Erro ao registrar o teste de força: ' + (err as Error).message);
    }
  };

  const handleDeleteStrengthTest = async (id: string) => {
    if (confirm('Excluir este teste de força?')) {
      await fetch(`/api/strength-tests?id=${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const handleCreateProntuario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        clienteId: prClient,
        profissionalId: professionalId || '6668ab030303030303030301', // Dr. Andre
        data: prDate,
        conteudo: prContent
      };
      const res = await fetch('/api/prontuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setShowProntuarioModal(false);
        fetchData();
        if (confirm('Deseja fazer o download do PDF do prontuário agora?')) {
          const client = clients.find(c => c._id === prClient);
          downloadProntuarioPDF(data.data, client);
        }
      } else {
        alert('Erro ao salvar prontuário: ' + data.error);
      }
    } catch (err) {
      alert('Erro de conexão.');
    }
  };

  const handleDeleteProntuario = async (id: string) => {
    if (confirm('Excluir este registro de prontuário?')) {
      await fetch(`/api/prontuarios?id=${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        nome: newExNome.toUpperCase(),
        grupo: newExGrupo,
        equipamento: newExEquip,
        instrucoes: newExInst,
        status: 'pending',
        solicitadoPorNome: (session?.user as any)?.name || session?.user?.email || 'Profissional'
      };
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setShowNewExModal(false);
        setNewExNome('');
        setNewExInst('');
        alert('Solicitação de cadastro de exercício enviada para aprovação do administrador!');
        fetchData();
      }
    } catch (err) {
      alert('Erro ao salvar exercício.');
    }
  };

  // Workout Editor management
  const handleOpenWorkoutEditor = async (clientObj: any) => {
    try {
      setLoading(true);
      setSelectedClientForWorkout(clientObj);
      const res = await fetch(`/api/workouts?clientId=${clientObj._id}`);
      const data = await res.json();
      if (data.success) {
        setEditingWorkoutData(data.data);
        setOriginalWorkoutData(JSON.parse(JSON.stringify(data.data)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryClientId = params.get('workoutClientId');
      if (queryClientId && clients.length > 0) {
        const foundClient = clients.find(c => c._id === queryClientId);
        if (foundClient) {
          handleOpenWorkoutEditor(foundClient);
        }
      }
    }
  }, [clients]);

  useEffect(() => {
    if (editingWorkoutData) {
      const currentSheets = editingWorkoutData[activeWorkoutCategory] || [];
      const ids = currentSheets.map((s: any) => s.id);
      if (ids.length > 0 && !ids.includes(activeWorkoutSubTab)) {
        setActiveWorkoutSubTab(ids[0]);
      }
    }
  }, [editingWorkoutData, activeWorkoutCategory, activeWorkoutSubTab]);

  const detectStructuralChanges = (original: any, current: any) => {
    if (!original || !current) return false;
    
    const origList = original[activeWorkoutCategory] || [];
    const currList = current[activeWorkoutCategory] || [];
    
    if (origList.length !== currList.length) return true;
    
    const origSheet = origList.find((f: any) => f.id === activeWorkoutSubTab);
    const currSheet = currList.find((f: any) => f.id === activeWorkoutSubTab);
    
    if (!origSheet && !currSheet) return false;
    if (!origSheet || !currSheet) return true;
    
    if (origSheet.nome !== currSheet.nome) return true;
    if (origSheet.observacoesGerais !== currSheet.observacoesGerais) return true;
    
    const origExs = origSheet.exercicios || [];
    const currExs = currSheet.exercicios || [];
    
    if (origExs.length !== currExs.length) return true;
    
    for (let i = 0; i < origExs.length; i++) {
      const o = origExs[i];
      const c = currExs[i];
      
      if (o.exercicioId !== c.exercicioId) return true;
      if (o.series !== c.series) return true;
      if (o.repeticoes !== c.repeticoes) return true;
      if (o.descanso !== c.descanso) return true;
      if (o.ritmo !== c.ritmo) return true;
      if (o.observacao !== c.observacao) return true;
      if (o.combinaGrupo !== c.combinaGrupo) return true;
    }
    
    return false;
  };

  useEffect(() => {
    if (originalWorkoutData && editingWorkoutData) {
      const isChanged = detectStructuralChanges(originalWorkoutData, editingWorkoutData);
      setIsNewWorkoutSheet(isChanged);
    } else {
      setIsNewWorkoutSheet(false);
    }
  }, [editingWorkoutData, activeWorkoutCategory, activeWorkoutSubTab, originalWorkoutData]);

  const handleAddWorkoutSheet = () => {
    if (!editingWorkoutData) return;
    const currentSheets = editingWorkoutData[activeWorkoutCategory] || [];
    if (currentSheets.length >= 5) {
      alert('Limite máximo de 5 fichas atingido.');
      return;
    }
    const possibleIds: ('A' | 'B' | 'C' | 'D' | 'E')[] = ['A', 'B', 'C', 'D', 'E'];
    const existingIds = currentSheets.map((s: any) => s.id);
    const nextId = possibleIds.find(id => !existingIds.includes(id));
    if (!nextId) {
      alert('Não é possível adicionar mais fichas.');
      return;
    }
    const newSheet = {
      id: nextId,
      nome: `Ficha ${nextId}`,
      ultimaAtualizacao: new Date().toISOString().split('T')[0],
      observacoesGerais: '',
      exercicios: []
    };
    const updatedSheets = [...currentSheets, newSheet].sort((a, b) => a.id.localeCompare(b.id));
    const updated = {
      ...editingWorkoutData,
      [activeWorkoutCategory]: updatedSheets
    };
    setEditingWorkoutData(updated);
    setActiveWorkoutSubTab(nextId);
  };

  const handleRemoveWorkoutSheet = (sheetId: 'A' | 'B' | 'C' | 'D' | 'E') => {
    if (!editingWorkoutData) return;
    const currentSheets = editingWorkoutData[activeWorkoutCategory] || [];
    if (currentSheets.length <= 1) {
      return;
    }
    
    if (sheetToDelete !== sheetId) {
      setSheetToDelete(sheetId);
      setTimeout(() => {
        setSheetToDelete(prev => prev === sheetId ? null : prev);
      }, 3000);
      return;
    }

    setSheetToDelete(null);

    // Calculate index shifts before removing
    const activeIndex = currentSheets.findIndex((s: any) => s.id === activeWorkoutSubTab);
    let nextIndex = activeIndex;
    if (sheetId === activeWorkoutSubTab) {
      if (activeIndex >= currentSheets.length - 1) {
        nextIndex = currentSheets.length - 2;
      }
    } else {
      const deletedIndex = currentSheets.findIndex((s: any) => s.id === sheetId);
      if (deletedIndex < activeIndex) {
        nextIndex = activeIndex - 1;
      }
    }

    const updatedSheets = currentSheets.filter((s: any) => s.id !== sheetId);
    
    // Reorder alphabetically and rename A, B, C, D, E
    const reorderedSheets = updatedSheets.map((sheet: any, index: number) => {
      const newLetter = ['A', 'B', 'C', 'D', 'E'][index];
      return {
        ...sheet,
        id: newLetter,
        nome: `Ficha ${newLetter}`
      };
    });

    const updated = {
      ...editingWorkoutData,
      [activeWorkoutCategory]: reorderedSheets
    };
    setEditingWorkoutData(updated);

    const finalNextIndex = Math.max(0, Math.min(nextIndex, reorderedSheets.length - 1));
    if (reorderedSheets[finalNextIndex]) {
      setActiveWorkoutSubTab(reorderedSheets[finalNextIndex].id as any);
    }
  };

  const handleAddExerciseToWorkout = (exerciseName: string) => {
    if (!editingWorkoutData) return;
    const updated = { ...editingWorkoutData };
    const list = updated[activeWorkoutCategory];
    const idx = list.findIndex((f: any) => f.id === activeWorkoutSubTab);
    if (idx !== -1) {
      list[idx].exercicios.push({
        exercicioId: exerciseName,
        series: 3,
        repeticoes: '12',
        carga: '10kg',
        descanso: '60s',
        observacao: '',
        ritmo: '2-0-2-0',
        combinaGrupo: ''
      });
      setEditingWorkoutData(updated);
    }
  };

  const handleMoveExercise = (exIdx: number, direction: number) => {
    if (!editingWorkoutData) return;
    const updated = { ...editingWorkoutData };
    const list = updated[activeWorkoutCategory];
    const idx = list.findIndex((f: any) => f.id === activeWorkoutSubTab);
    if (idx !== -1) {
      const exercicios = list[idx].exercicios;
      const targetIdx = exIdx + direction;
      if (targetIdx >= 0 && targetIdx < exercicios.length) {
        const temp = exercicios[exIdx];
        exercicios[exIdx] = exercicios[targetIdx];
        exercicios[targetIdx] = temp;
        setEditingWorkoutData(updated);
      }
    }
  };

  const handleRemoveExerciseFromWorkout = (exIdx: number) => {
    if (!editingWorkoutData) return;
    const updated = { ...editingWorkoutData };
    const list = updated[activeWorkoutCategory];
    const idx = list.findIndex((f: any) => f.id === activeWorkoutSubTab);
    if (idx !== -1) {
      list[idx].exercicios.splice(exIdx, 1);
      setEditingWorkoutData(updated);
    }
  };

  const handleUpdateExerciseField = (exIdx: number, field: string, value: any) => {
    if (!editingWorkoutData) return;
    const updated = { ...editingWorkoutData };
    const list = updated[activeWorkoutCategory];
    const idx = list.findIndex((f: any) => f.id === activeWorkoutSubTab);
    if (idx !== -1) {
      list[idx].exercicios[exIdx][field] = value;
      setEditingWorkoutData(updated);
    }
  };

  const handleSaveWorkout = async () => {
    if (!editingWorkoutData || !selectedClientForWorkout) return;
    try {
      setLoading(true);
      const updatedData = { ...editingWorkoutData };
      
      if (isNewWorkoutSheet) {
        const categoryList = updatedData[activeWorkoutCategory] || [];
        const sheetIdx = categoryList.findIndex((f: any) => f.id === activeWorkoutSubTab);
        if (sheetIdx !== -1) {
          categoryList[sheetIdx].ultimaAtualizacao = new Date().toISOString().split('T')[0];
        }
      }

      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientForWorkout._id,
          fichasMonitorado: updatedData.fichasMonitorado,
          fichasLivre: updatedData.fichasLivre
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Ficha de treino salva com sucesso!');
        setSelectedClientForWorkout(null);
        setEditingWorkoutData(null);
        setOriginalWorkoutData(null);
        fetchData();
      } else {
        alert('Erro ao salvar: ' + data.error);
      }
    } catch (e) {
      alert('Erro na requisição.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // Filter lists based on search
  const clientOptions = clients.map(c => ({
    value: c._id,
    label: c.dadosPessoais?.nome || 'Sem Nome'
  }));

  const filteredClients = clients.filter(c => {
    // 1. Filtro de pesquisa de Nome ou Email
    const matchesSearch = 
      (c.dadosPessoais?.nome || '').toLowerCase().includes(workoutSearch.toLowerCase()) ||
      (c.dadosPessoais?.email || '').toLowerCase().includes(workoutSearch.toLowerCase());
      
    // 2. Filtro de Status de Ficha (Ativa vs Sem Ficha)
    const userWorkout = workouts.find(w => w.clienteId === c._id);
    const hasActiveWorkout = userWorkout && (
      (userWorkout.fichasMonitorado && userWorkout.fichasMonitorado.some((f: any) => f.exercicios && f.exercicios.length > 0)) ||
      (userWorkout.fichasLivre && userWorkout.fichasLivre.some((f: any) => f.exercicios && f.exercicios.length > 0))
    );
    
    // Calcular se a ficha está expirada (mais de 60 dias)
    let isExpired = false;
    if (hasActiveWorkout && userWorkout) {
      const dates: string[] = [];
      if (userWorkout.fichasMonitorado) {
        userWorkout.fichasMonitorado.forEach((f: any) => {
          if (f.ultimaAtualizacao && f.exercicios && f.exercicios.length > 0) dates.push(f.ultimaAtualizacao);
        });
      }
      if (userWorkout.fichasLivre) {
        userWorkout.fichasLivre.forEach((f: any) => {
          if (f.ultimaAtualizacao && f.exercicios && f.exercicios.length > 0) dates.push(f.ultimaAtualizacao);
        });
      }
      if (dates.length > 0) {
        dates.sort((a, b) => b.localeCompare(a));
        const latestDate = new Date(dates[0] + 'T12:00:00');
        const today = new Date();
        const diffTime = today.getTime() - latestDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        isExpired = diffDays > 60;
      }
    }
    
    let matchesStatus = true;
    if (workoutStatusFilter === 'active') {
      matchesStatus = !!hasActiveWorkout && !isExpired;
    } else if (workoutStatusFilter === 'expired') {
      matchesStatus = !!hasActiveWorkout && isExpired;
    } else if (workoutStatusFilter === 'none') {
      matchesStatus = !hasActiveWorkout;
    }
    
    // 3. Filtro de Plano
    let matchesPlan = true;
    if (workoutPlanFilter !== 'all') {
      const planName = c.dadosComerciais?.planoId?.nome || 'Personalizado';
      matchesPlan = planName === workoutPlanFilter;
    }
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const filteredExercises = exercises.filter(ex => {
    if (ex.status === 'pending') return false;
    const matchesSearch = ex.nome?.toLowerCase().includes(exerciseSearch.toLowerCase());
    const matchesGroup = exerciseGroup ? ex.grupo === exerciseGroup : true;
    return matchesSearch && matchesGroup;
  });

  return (
    <div>
      {/* 0. View: Resumo do Dia */}
      {activeTab === 'resumo_dia' && (
        <>
          {(() => {
            // Lógica interna para data e hora do Resumo do Dia
            const hojeISO = (() => {
              const d = new Date();
              return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            })();

            const formatLocalDate = (dateStr: string) => {
              if (!dateStr) return '';
              const parts = dateStr.split('-');
              if (parts.length !== 3) return dateStr;
              return `${parts[2]}/${parts[1]}/${parts[0]}`;
            };

            const getAptTimeState = (horarioStr: string, currentStr: string) => {
              if (!horarioStr || !currentStr) return 'future';
              const [hA, mA] = horarioStr.split(':').map(Number);
              const [hC, mC] = currentStr.split(':').map(Number);
              const minApt = hA * 60 + mA;
              const minCurr = hC * 60 + mC;
              
              if (minCurr >= minApt && minCurr < minApt + 60) {
                return 'current';
              } else if (minCurr >= minApt + 60) {
                return 'past';
              } else {
                return 'future';
              }
            };

            // Filtrar agendamentos de hoje
            const todayApts = appointments
              .filter(a => a.data === hojeISO)
              .sort((a, b) => a.horario.localeCompare(b.horario));

            const totalHoje = todayApts.filter(a => a.status !== 'cancelado').length;
            const totalAcademia = todayApts.filter(a => a.tipo === 'academia' && a.status !== 'cancelado').length;
            const totalConsultorio = todayApts.filter(a => a.tipo === 'consultorio' && a.status !== 'cancelado').length;

            const urgentes: any[] = [];
            const atuais: any[] = [];

            todayApts.forEach(a => {
              const timeState = getAptTimeState(a.horario, realTime || '00:00');
              if (timeState === 'past' && a.status === 'agendado') {
                urgentes.push(a);
              } else if (timeState === 'current' && a.status !== 'cancelado') {
                atuais.push(a);
              }
            });

            return (
              <>
                <div className="view-header">
                  <div className="view-title-group">
                    <h1>Controle de Frequência Diária</h1>
                    <p>Visão geral e sinalização rápida dos atendimentos de hoje, {formatLocalDate(hojeISO)}.</p>
                  </div>
                </div>

                <div className="metrics-grid" style={{ marginBottom: '24px' }}>
                  <div className="metric-card">
                    <div className="metric-info">
                      <h3>Total de Alunos Hoje</h3>
                      <div className="value">{totalHoje}</div>
                    </div>
                    <div className="metric-icon"><i className="fa-solid fa-users"></i></div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-info">
                      <h3>Academia</h3>
                      <div className="value">{totalAcademia}</div>
                    </div>
                    <div className="metric-icon success"><i className="fa-solid fa-dumbbell"></i></div>
                  </div>

                </div>

                {/* Bloco de Atenção: Urgentes */}
                {urgentes.length > 0 && (
                  <div className="content-panel" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '24px', borderLeft: '5px solid var(--color-danger)', padding: '16px', borderRadius: '8px' }}>
                    <div className="panel-header" style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.15)', paddingBottom: '10px' }}>
                      <h2 style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                        <i className="fa-solid fa-triangle-exclamation" style={{ animation: 'pulse 1.5s infinite' }}></i> 
                        🚨 ATENÇÃO: Horários Passados Sem Sinalização ({urgentes.length})
                      </h2>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px', marginBottom: 0 }}>Alunos agendados em horários que já passaram, mas cuja presença não foi marcada. Sinalize abaixo para concluir a agenda.</p>
                    </div>
                    <div className="table-responsive" style={{ marginTop: '12px' }}>
                      <table className="data-table" style={{ width: '100%' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.1)' }}>
                            <th style={{ color: 'var(--text-muted)', padding: '12px 16px' }}>Horário</th>
                            <th style={{ color: 'var(--text-muted)', padding: '12px 16px' }}>Aluno</th>
                            <th style={{ color: 'var(--text-muted)', padding: '12px 16px' }}>Serviço</th>
                            <th style={{ color: 'var(--text-muted)', padding: '12px 16px', textAlign: 'center' }}>Sinalizar Frequência</th>
                          </tr>
                        </thead>
                        <tbody>
                          {urgentes.map(a => {
                            const client = clients.find(c => c._id === (a.clienteId?._id || a.clienteId)) || a.clienteId || {};
                            return (
                              <tr key={a._id} style={{ background: 'rgba(239, 68, 68, 0.02)' }}>
                                <td style={{ padding: '12px 16px' }}><strong style={{ color: 'var(--color-danger)' }}>{a.horario}</strong></td>
                                <td style={{ padding: '12px 16px' }}>
                                  <strong>{client.dadosPessoais?.nome || 'Aluno Desconhecido'}</strong><br />
                                  <small style={{ color: 'var(--text-dim)' }}>
                                    {client.dadosComerciais?.frequencia ? `${client.dadosComerciais.frequencia}x/semana` : ''}
                                  </small>
                                </td>
                                <td style={{ padding: '12px 16px' }}><span className="badge badge-info">{a.servico || a.tipo}</span></td>
                                <td style={{ textAlign: 'center', whiteSpace: 'nowrap', padding: '12px 16px' }}>
                                  <button className="btn btn-sm" style={{ background: '#10b981', color: 'white', border: '1px solid #10b981', marginRight: '6px', padding: '4px 10px' }} onClick={() => handleUpdateAptStatus(a._id, 'presenca')}>
                                    <i className="fa-solid fa-check"></i> Presença
                                  </button>
                                  <button className="btn btn-danger btn-sm" style={{ marginRight: '6px', padding: '4px 10px' }} onClick={() => handleUpdateAptStatus(a._id, 'falta')}>
                                    <i className="fa-solid fa-xmark"></i> Falta
                                  </button>
                                  <button className="btn btn-secondary btn-sm" style={{ padding: '4px 10px' }} onClick={() => handleUpdateAptStatus(a._id, 'cancelado')}>
                                    Cancelar
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Destaque do Horário Atual: Janela Ativa */}
                <div className="content-panel" style={{ border: '2px solid var(--color-primary)', boxShadow: '0 0 15px rgba(99, 102, 241, 0.12)', marginBottom: '24px', background: 'rgba(99, 102, 241, 0.02)' }}>
                  <div className="panel-header" style={{ borderBottom: '1px solid rgba(99, 102, 241, 0.1)', paddingBottom: '10px' }}>
                    <h2 style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                      <i className="fa-solid fa-circle-play" style={{ color: 'var(--color-primary)' }}></i>
                      ⭐ ATENDIMENTOS NO HORÁRIO ATUAL (Janela Ativa)
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px', marginBottom: 0 }}>Alunos agendados na janela de tempo atual. Sinalize a presença assim que o aluno comparecer.</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '16px', paddingBottom: '8px' }}>
                    {atuais.length === 0 ? (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                        Nenhum aluno agendado para o horário de hoje na janela atual ({realTime || '--:--'}).
                      </div>
                    ) : (
                      atuais.map(a => {
                        const client = clients.find(c => c._id === (a.clienteId?._id || a.clienteId)) || a.clienteId || {};
                        const statusClass = a.status === 'presenca' ? 'badge-success' : a.status === 'falta' ? 'badge-danger' : 'badge-warning';
                        const statusText = a.status === 'presenca' ? 'Presença' : a.status === 'falta' ? 'Falta' : 'Agendado';
                        return (
                          <div key={a._id} className="metric-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px', borderRadius: '8px', margin: 0, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', width: '100%' }}>
                              <div>
                                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)' }}>{a.horario}</span>
                                <h3 style={{ margin: '4px 0 2px 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>{client.dadosPessoais?.nome || 'Aluno Desconhecido'}</h3>
                                <span className="badge badge-info" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>{a.servico || a.tipo}</span>
                              </div>
                              <div>
                                <span className={`badge ${statusClass}`}>{statusText}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', width: '100%' }}>
                              <button className="btn btn-sm" style={{ flex: 1, background: '#10b981', color: 'white', border: '1px solid #10b981', padding: '4px' }} onClick={() => handleUpdateAptStatus(a._id, 'presenca')}>
                                <i className="fa-solid fa-check"></i> Presença
                              </button>
                              <button className="btn btn-danger btn-sm" style={{ flex: 1, padding: '4px' }} onClick={() => handleUpdateAptStatus(a._id, 'falta')}>
                                <i className="fa-solid fa-xmark"></i> Falta
                              </button>
                              <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }} onClick={() => handleUpdateAptStatus(a._id, 'cancelado')}>
                                Cancelar
                              </button>
                            </div>
                            <div style={{ marginTop: '8px', width: '100%' }}>
                              {client._id && (
                                <button className="btn btn-primary btn-sm" style={{ width: '100%', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)', fontWeight: 600 }} onClick={() => window.open(`/dashboard?activeTab=treinos_prof&workoutClientId=${client._id}`, '_blank')}>
                                  <i className="fa-solid fa-dumbbell"></i> Abrir Ficha de Treino
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Demais Atendimentos: Todos os Atendimentos de Hoje */}
                <div className="content-panel">
                  <div className="panel-header">
                    <h2><i className="fa-solid fa-calendar-day" style={{ color: 'var(--color-primary)' }}></i> Todos os Atendimentos de Hoje</h2>
                  </div>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Horário</th>
                          <th>Aluno</th>
                          <th>Modalidade / Serviço</th>
                          <th>Status</th>
                          <th>Sinalizar</th>
                          <th>Histórico</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todayApts.length === 0 ? (
                          <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '24px' }}>Nenhum agendamento para hoje.</td></tr>
                        ) : (
                          todayApts.map(a => {
                            const client = clients.find(c => c._id === (a.clienteId?._id || a.clienteId)) || a.clienteId || {};
                            const statusClass = a.status === 'presenca' ? 'badge-success' : a.status === 'falta' ? 'badge-danger' : a.status === 'cancelado' ? 'badge-warning' : 'badge-info';
                            const statusText = a.status === 'presenca' ? 'Presença' : a.status === 'falta' ? 'Falta' : a.status === 'cancelado' ? 'Cancelado' : 'Agendado';

                            const actionsCell = a.status === 'agendado' ? (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button className="btn btn-sm" style={{ background: '#10b981', color: 'white', border: '1px solid #10b981', padding: '2px 6px', fontSize: '0.75rem' }} onClick={() => handleUpdateAptStatus(a._id, 'presenca')}><i className="fa-solid fa-check"></i></button>
                                <button className="btn btn-danger btn-sm" style={{ padding: '2px 6px', fontSize: '0.75rem' }} onClick={() => handleUpdateAptStatus(a._id, 'falta')}><i className="fa-solid fa-xmark"></i></button>
                                <button className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: '0.75rem' }} onClick={() => handleUpdateAptStatus(a._id, 'cancelado')}><i className="fa-solid fa-ban"></i></button>
                              </div>
                            ) : (
                              <button className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: '0.7rem' }} onClick={() => handleUpdateAptStatus(a._id, 'agendado')}><i className="fa-solid fa-rotate-left"></i> Reverter</button>
                            );

                            return (
                              <tr key={a._id}>
                                <td><strong>{a.horario}</strong></td>
                                <td>
                                  <strong>{client.dadosPessoais?.nome || 'Aluno Desconhecido'}</strong><br />
                                  <small style={{ color: 'var(--text-dim)' }}>
                                    {client.dadosComerciais?.frequencia ? `${client.dadosComerciais.frequencia}x/semana` : ''}
                                  </small>
                                </td>
                                <td>
                                  <span className="badge badge-info">{a.servico || a.tipo}</span>
                                </td>
                                <td><span className={`badge ${statusClass}`}>{statusText}</span></td>
                                <td>{actionsCell}</td>
                                <td>
                                  {client._id ? (
                                    <button className="btn btn-secondary btn-sm" onClick={() => { setDetailClient(client); setShowClientDetailModal(true); }}>
                                      <i className="fa-solid fa-clock-rotate-left"></i> Histórico
                                    </button>
                                  ) : '-'}
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
            );
          })()}
        </>
      )}

      {/* 1. View: Agenda Completa / Dashboard */}
      {activeTab === 'dashboard' && (
        <AgendaCompletaPanel 
          clients={clients} 
          professionals={professionals.filter(p => p._id === professionalId)} 
        />
      )}

      {/* 2. View: Clientes Vinculados */}
      {activeTab === 'clientes' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Meus Alunos</h1>
              <p>Acompanhamento de fichas clínicas e evolução.</p>
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
            </div>
          </div>

          <div className="content-panel">
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input type="text" className="form-control" placeholder="Buscar aluno por nome, email ou CPF..." value={getSearchQuery('clientes')} onChange={e => setSearchQueryForKey('clientes', e.target.value)} style={{ maxWidth: '300px' }} />
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Contato</th>
                    <th>Plano</th>
                    <th>Observações Clínicas</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'clientes';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const q = getSearchQuery(listKey).toLowerCase();
                    const filtered = clients.filter(c => c.dadosPessoais?.nome?.toLowerCase().includes(q) || c.dadosPessoais?.email?.toLowerCase().includes(q) || c.dadosPessoais?.cpf?.includes(q));
                    const totalPages = Math.ceil(filtered.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = filtered.slice((curP - 1) * size, curP * size);

                    return paginated.map(c => (
                      <tr key={c._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img src={c.dadosPessoais?.sexo?.trim().toUpperCase().startsWith('F') ? '/avatar_feminino.png' : '/avatar_masculino.png'} alt="avatar" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
                            <strong>{c.dadosPessoais?.nome}</strong>
                          </div>
                        </td>
                        <td>{c.dadosPessoais?.telefone || '-'}</td>
                        <td>{c.dadosComerciais?.planoId?.nome || 'Personalizado'}</td>
                        <td>
                          <em style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {c.dadosClinicos?.lesoes || 'Sem lesões registradas'}
                          </em>
                        </td>
                        <td>
                          <button className="btn btn-primary btn-sm" onClick={() => {
                            setDetailClient(c);
                            setClientDetailTab('agendamentos');
                            setShowClientDetailModal(true);
                          }}>
                            <i className="fa-solid fa-address-card"></i> Histórico
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                  {clients.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-state-card">
                          <i className="fa-solid fa-graduation-cap empty-state-icon"></i>
                          <div className="empty-state-title">Nenhum aluno vinculado</div>
                          <div className="empty-state-desc">Não há alunos vinculados a você no sistema.</div>
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

      {/* 3. View: Fichas de Treino */}
      {activeTab === 'treinos_prof' && (
        <>
          {!selectedClientForWorkout ? (
            <>
              <div className="view-header">
                <div className="view-title-group">
                  <h1>Fichas de Treino</h1>
                  <p>Gerencie e crie rotinas de treino para seus alunos ou consulte o banco de exercícios.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <button className={`btn ${workoutSubTab === 'clients' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setWorkoutSubTab('clients')}>
                  Fichas dos Alunos
                </button>
                <button className={`btn ${workoutSubTab === 'exercises' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setWorkoutSubTab('exercises')}>
                  Banco de Exercícios
                </button>
              </div>

              {workoutSubTab === 'clients' && (
                <div className="content-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '12px', flexGrow: 1, flexWrap: 'wrap' }}>
                      <div style={{ minWidth: '200px', maxWidth: '300px', flexGrow: 1 }}>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="Buscar aluno por nome ou email..." 
                          value={workoutSearch} 
                          onChange={e => { setPage('treinos_prof_clients', 1); setWorkoutSearch(e.target.value); }} 
                        />
                      </div>
                      
                      {/* Filtro por Status da Ficha */}
                      <div style={{ width: '160px' }}>
                        <select 
                          className="select-custom"
                          value={workoutStatusFilter} 
                          onChange={e => { setPage('treinos_prof_clients', 1); setWorkoutStatusFilter(e.target.value as any); }}
                        >
                          <option value="all">Todos os Status</option>
                          <option value="active">Com Ficha Ativa (Válida)</option>
                          <option value="expired">Com Ficha Vencida</option>
                          <option value="none">Sem Ficha</option>
                        </select>
                      </div>

                      {/* Filtro por Plano */}
                      <div style={{ width: '180px' }}>
                        <select 
                          className="select-custom"
                          value={workoutPlanFilter} 
                          onChange={e => { setPage('treinos_prof_clients', 1); setWorkoutPlanFilter(e.target.value); }}
                        >
                          <option value="all">Todos os Planos</option>
                          {(() => {
                            const uniquePlans = Array.from(
                              new Set(
                                clients.map(c => c.dadosComerciais?.planoId?.nome || 'Personalizado')
                              )
                            );
                            return uniquePlans.map(planName => (
                              <option key={planName} value={planName}>{planName}</option>
                            ));
                          })()}
                        </select>
                      </div>
                    </div>

                    <div className="page-size-selector">
                      <span>Exibir:</span>
                      <select value={getPageSize('treinos_prof_clients')} onChange={e => setPageSizeForKey('treinos_prof_clients', Number(e.target.value))}>
                        <option value={5}>5</option>
                        <option value={8}>8</option>
                        <option value={15}>15</option>
                      </select>
                    </div>
                  </div>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Aluno</th>
                          <th>Plano</th>
                          <th style={{ textAlign: 'center' }}>Status da Ficha</th>
                          <th style={{ textAlign: 'center' }}>Data da Última Ficha</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const listKey = 'treinos_prof_clients';
                          const activeP = getPage(listKey);
                          const size = getPageSize(listKey);
                          const totalPages = Math.ceil(filteredClients.length / size);
                          const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                          const paginated = filteredClients.slice((curP - 1) * size, curP * size);

                          return paginated.map(c => {
                            const userWorkout = workouts.find(w => w.clienteId === c._id);
                            const hasWorkout = userWorkout && (
                              (userWorkout.fichasMonitorado && userWorkout.fichasMonitorado.some((f: any) => f.exercicios && f.exercicios.length > 0)) ||
                              (userWorkout.fichasLivre && userWorkout.fichasLivre.some((f: any) => f.exercicios && f.exercicios.length > 0))
                            );

                            const getUltimaFichaInfo = () => {
                              if (!userWorkout) return { dateStr: '—', isExpired: false };
                              const dates: string[] = [];
                              if (userWorkout.fichasMonitorado) {
                                userWorkout.fichasMonitorado.forEach((f: any) => {
                                  if (f.ultimaAtualizacao && f.exercicios && f.exercicios.length > 0) {
                                    dates.push(f.ultimaAtualizacao);
                                  }
                                });
                              }
                              if (userWorkout.fichasLivre) {
                                userWorkout.fichasLivre.forEach((f: any) => {
                                  if (f.ultimaAtualizacao && f.exercicios && f.exercicios.length > 0) {
                                    dates.push(f.ultimaAtualizacao);
                                  }
                                });
                              }
                              if (dates.length === 0) return { dateStr: '—', isExpired: false };
                              dates.sort((a, b) => b.localeCompare(a));
                              const latestDateStr = dates[0];
                              const latestDate = new Date(latestDateStr + 'T12:00:00');
                              const today = new Date();
                              const diffTime = today.getTime() - latestDate.getTime();
                              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                              const isExpired = diffDays > 60;
                              const parts = latestDateStr.split('-');
                              const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : latestDateStr;
                              return { dateStr: formattedDate, isExpired };
                            };

                            const { dateStr, isExpired } = getUltimaFichaInfo();

                            return (
                              <tr key={c._id}>
                                <td><strong>{c.dadosPessoais?.nome}</strong><br/><small style={{ color: 'var(--text-dim)' }}>{c.dadosPessoais?.email}</small></td>
                                <td>{c.dadosComerciais?.planoId?.nome || 'Personalizado'}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <span className={`badge ${hasWorkout ? (isExpired ? 'badge-danger' : 'badge-success') : 'badge-warning'}`}>
                                    {hasWorkout ? (isExpired ? 'Ficha Vencida' : 'Ficha Ativa') : 'Sem Ficha'}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <strong style={{ fontSize: '0.85rem' }}>{dateStr}</strong>
                                  {hasWorkout && isExpired && (
                                    <div style={{ marginTop: '4px' }}>
                                      <span className="badge badge-danger" style={{ fontSize: '0.7rem', padding: '2px 6px', fontWeight: 700 }}>Vencida</span>
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <button className="btn btn-primary btn-sm" onClick={() => handleOpenWorkoutEditor(c)}>
                                    <i className="fa-solid fa-dumbbell"></i> {hasWorkout ? 'Atualizar Ficha' : 'Criar Ficha'}
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                        {filteredClients.length === 0 && (
                          <tr>
                            <td colSpan={5}>
                              <div className="empty-state-card">
                                <i className="fa-solid fa-dumbbell empty-state-icon"></i>
                                <div className="empty-state-title">Nenhum aluno encontrado</div>
                                <div className="empty-state-desc">Não há alunos correspondentes à busca ou cadastrados no sistema.</div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {filteredClients.length > 0 && (
                    <Pagination
                      currentPage={getPage('treinos_prof_clients')}
                      totalItems={filteredClients.length}
                      itemsPerPage={getPageSize('treinos_prof_clients')}
                      onPageChange={page => setPage('treinos_prof_clients', page)}
                    />
                  )}
                </div>
              )}

              {workoutSubTab === 'exercises' && (
                <div className="content-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flexGrow: 1 }}>
                      <input type="text" className="form-control" style={{ maxWidth: '300px' }} placeholder="Buscar exercício..." value={exerciseSearch} onChange={e => { setPage('treinos_prof_exercises', 1); setExerciseSearch(e.target.value); }} />
                      <select className="select-custom" style={{ width: '160px' }} value={exerciseGroup} onChange={e => { setPage('treinos_prof_exercises', 1); setExerciseGroup(e.target.value); }}>
                        <option value="">Todos os Grupos</option>
                        <option value="PEITO">Peito</option>
                        <option value="COSTAS">Costas</option>
                        <option value="PERNAS">Pernas</option>
                        <option value="OMBROS">Ombros</option>
                        <option value="BÍCEPS">Bíceps</option>
                        <option value="TRÍCEPS">Tríceps</option>
                        <option value="CORE">Core</option>
                      </select>
                      <button className="btn btn-primary" onClick={() => setShowNewExModal(true)}>
                        <i className="fa-solid fa-plus"></i> Novo Exercício
                      </button>

                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".xlsx, .xls"
                        onChange={handleImportExcel}
                      />
                    </div>
                    <div className="page-size-selector">
                      <span>Exibir:</span>
                      <select value={getPageSize('treinos_prof_exercises')} onChange={e => setPageSizeForKey('treinos_prof_exercises', Number(e.target.value))}>
                        <option value={5}>5</option>
                        <option value={8}>8</option>
                        <option value={15}>15</option>
                      </select>
                    </div>
                  </div>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Exercício</th>
                          <th style={{ textAlign: 'center' }}>Grupo</th>
                          <th>Equipamento</th>
                          <th>Instruções</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const listKey = 'treinos_prof_exercises';
                          const activeP = getPage(listKey);
                          const size = getPageSize(listKey);
                          const totalPages = Math.ceil(filteredExercises.length / size);
                          const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                          const paginated = filteredExercises.slice((curP - 1) * size, curP * size);

                          return paginated.map(ex => (
                            <tr key={ex._id}>
                              <td><strong>{ex.nome}</strong></td>
                              <td style={{ textAlign: 'center' }}><span className="badge badge-info">{ex.grupo}</span></td>
                              <td><code>{ex.equipamento}</code></td>
                              <td><small style={{ color: 'var(--text-muted)' }}>{ex.instrucoes || 'Nenhuma instrução disponível.'}</small></td>
                            </tr>
                          ));
                        })()}
                        {filteredExercises.length === 0 && (
                          <tr>
                            <td colSpan={4}>
                              <div className="empty-state-card">
                                <i className="fa-solid fa-dumbbell empty-state-icon"></i>
                                <div className="empty-state-title">Nenhum exercício encontrado</div>
                                <div className="empty-state-desc">Não há exercícios correspondentes à busca ou cadastrados.</div>
                                <button className="btn btn-primary btn-sm" onClick={() => setShowNewExModal(true)}>
                                  <i className="fa-solid fa-plus"></i> Cadastrar Exercício
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {filteredExercises.length > 0 && (
                    <Pagination
                      currentPage={getPage('treinos_prof_exercises')}
                      totalItems={filteredExercises.length}
                      itemsPerPage={getPageSize('treinos_prof_exercises')}
                      onPageChange={page => setPage('treinos_prof_exercises', page)}
                    />
                  )}
                </div>
              )}
            </>
          ) : (
            // Full screen Workout Editor inside professional view
            <div className="content-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-title)' }}>Ficha de Treino — {selectedClientForWorkout.dadosPessoais?.nome}</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Plano: {selectedClientForWorkout.dadosComerciais?.planoId?.nome}</p>
                </div>
                <button className="btn btn-secondary" onClick={() => setSelectedClientForWorkout(null)}>
                  <i className="fa-solid fa-arrow-left"></i> Voltar
                </button>
              </div>

              {editingWorkoutData && (
                <div className="resp-grid-2-1" style={{ gap: '24px' }}>
                  {/* Left Column: Worksheet details */}
                  <div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      <button className={`btn btn-sm ${activeWorkoutCategory === 'fichasMonitorado' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveWorkoutCategory('fichasMonitorado')}>
                        Academia (Monitorado)
                      </button>
                      <button className={`btn btn-sm ${activeWorkoutCategory === 'fichasLivre' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveWorkoutCategory('fichasLivre')}>
                        Treino Livre
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px', background: 'var(--bg-darker)', padding: '6px', borderRadius: '8px', alignItems: 'center' }}>
                      {(() => {
                        const currentSheets = editingWorkoutData[activeWorkoutCategory] || [];
                        return currentSheets.map((sheet: any) => (
                          <div key={sheet.id} style={{ display: 'flex', alignItems: 'center', gap: '2px', background: activeWorkoutSubTab === sheet.id ? 'var(--color-primary-glow)' : 'transparent', borderRadius: '6px', padding: '2px 4px' }}>
                            <button 
                              type="button"
                              className={`btn btn-sm ${activeWorkoutSubTab === sheet.id ? 'btn-primary' : 'btn-secondary'}`} 
                              style={{ border: 'none', background: 'transparent', color: activeWorkoutSubTab === sheet.id ? 'var(--color-primary)' : 'var(--text-muted)' }} 
                              onClick={() => setActiveWorkoutSubTab(sheet.id)}
                            >
                              {sheet.nome || `Ficha ${sheet.id}`}
                            </button>
                            {currentSheets.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-sm"
                                style={{ 
                                  padding: '2px 6px', 
                                  border: 'none', 
                                  background: sheetToDelete === sheet.id ? 'var(--color-danger)' : 'transparent',
                                  color: '#ffffff',
                                  opacity: 0.8,
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'opacity 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}
                                onClick={() => handleRemoveWorkoutSheet(sheet.id)}
                                title={sheetToDelete === sheet.id ? "Clique novamente para confirmar" : "Remover esta Ficha"}
                              >
                                <i className={sheetToDelete === sheet.id ? "fa-solid fa-check" : "fa-solid fa-trash-can"} style={{ fontSize: '0.8rem' }}></i>
                                {sheetToDelete === sheet.id && <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Confirmar?</span>}
                              </button>
                            )}
                          </div>
                        ));
                      })()}
                      {(editingWorkoutData[activeWorkoutCategory] || []).length < 5 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          style={{ padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto', fontSize: '0.78rem' }}
                          onClick={handleAddWorkoutSheet}
                        >
                          <i className="fa-solid fa-plus"></i> Ficha
                        </button>
                      )}
                    </div>

                    {/* Worksheet Content Editor */}
                    {(() => {
                      const list = editingWorkoutData[activeWorkoutCategory] || [];
                      const sheet = list.find((f: any) => f.id === activeWorkoutSubTab) || { nome: '', observacoesGerais: '', exercicios: [] };
                      
                      const getGroupColor = (groupName: string) => {
                        if (!groupName) return '';
                        const uniqueGroups = Array.from(
                          new Set(sheet.exercicios?.map((e: any) => e.combinaGrupo).filter(Boolean) as string[])
                        ).sort();
                        const index = uniqueGroups.indexOf(groupName);
                        if (index === -1) return '#10b981';
                        const GROUP_COLORS = [
                          '#10b981', // Green
                          '#f59e0b', // Orange
                          '#a855f7', // Purple
                          '#3b82f6', // Blue
                          '#ec4899', // Pink
                          '#06b6d4', // Cyan
                          '#f43f5e', // Rose
                          '#84cc16', // Lime
                          '#eab308', // Yellow
                          '#6366f1'  // Indigo
                        ];
                        return GROUP_COLORS[index % GROUP_COLORS.length];
                      };

                      const groupSuggestions = Array.from(
                        new Set([
                          'G1', 'G2', 'G3', 'G4', 'G5',
                          ...(sheet.exercicios?.map((e: any) => e.combinaGrupo).filter(Boolean) as string[])
                        ])
                      ).sort();

                      return (
                        <div>
                          <div className="form-group">
                            <label>Nome da Ficha</label>
                            <input type="text" className="form-control" value={sheet.nome || ''} onChange={e => {
                              const updated = { ...editingWorkoutData };
                              const idx = updated[activeWorkoutCategory].findIndex((f: any) => f.id === activeWorkoutSubTab);
                              if (idx !== -1) {
                                updated[activeWorkoutCategory][idx].nome = e.target.value;
                                setEditingWorkoutData(updated);
                              }
                            }} />
                          </div>

                          <div className="form-group">
                            <label>Observações Gerais da Ficha</label>
                            <textarea className="form-control" style={{ height: '80px' }} value={sheet.observacoesGerais || ''} onChange={e => {
                              const updated = { ...editingWorkoutData };
                              const idx = updated[activeWorkoutCategory].findIndex((f: any) => f.id === activeWorkoutSubTab);
                              if (idx !== -1) {
                                updated[activeWorkoutCategory][idx].observacoesGerais = e.target.value;
                                setEditingWorkoutData(updated);
                              }
                            }} />
                          </div>

                          <h3 style={{ fontSize: '1.1rem', margin: '20px 0 12px 0', color: 'var(--color-primary)' }}>Exercícios Adicionados</h3>
                          <div className="table-responsive">
                            <datalist id={`group-suggestions-${activeWorkoutSubTab}`}>
                              {groupSuggestions.map(g => (
                                <option key={g} value={g} />
                              ))}
                            </datalist>
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Exercício</th>
                                  <th style={{ width: '70px' }}>Séries</th>
                                  <th style={{ width: '90px' }}>Reps</th>
                                  <th style={{ width: '90px' }}>Ritmo</th>
                                  <th style={{ width: '90px' }}>Carga</th>
                                  <th style={{ width: '80px' }}>Descanso</th>
                                  <th>Obs</th>
                                  <th style={{ width: '100px' }}>Combinar</th>
                                  <th style={{ width: '110px', textAlign: 'center' }}>Ações</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sheet.exercicios?.map((ex: any, idx: number) => {
                                  const groupColor = getGroupColor(ex.combinaGrupo);
                                  const rowStyle = groupColor ? { borderLeft: `4px solid ${groupColor}`, background: 'rgba(255, 255, 255, 0.015)' } : {};
                                  return (
                                    <tr key={idx} style={rowStyle}>
                                      <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <strong>{ex.exercicioId}</strong>
                                          {ex.combinaGrupo && (
                                            <span style={{ fontSize: '0.65rem', color: '#fff', background: groupColor, padding: '2px 6px', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                              {ex.combinaGrupo}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td>
                                        <input type="number" className="form-control" style={{ padding: '4px', height: '30px', textAlign: 'center' }} value={ex.series} onChange={e => handleUpdateExerciseField(idx, 'series', Number(e.target.value))} />
                                      </td>
                                      <td>
                                        <input type="text" className="form-control" style={{ padding: '4px', height: '30px', textAlign: 'center' }} value={ex.repeticoes} onChange={e => handleUpdateExerciseField(idx, 'repeticoes', e.target.value)} />
                                      </td>
                                      <td>
                                        <input type="text" className="form-control" style={{ padding: '4px', height: '30px', textAlign: 'center' }} value={ex.ritmo || '2-0-2-0'} onChange={e => handleUpdateExerciseField(idx, 'ritmo', e.target.value)} placeholder="2-0-2-0" />
                                      </td>
                                      <td>
                                        <input type="text" className="form-control" style={{ padding: '4px', height: '30px', textAlign: 'center' }} value={ex.carga} onChange={e => handleUpdateExerciseField(idx, 'carga', e.target.value)} />
                                      </td>
                                      <td>
                                        <input type="text" className="form-control" style={{ padding: '4px', height: '30px', textAlign: 'center' }} value={ex.descanso} onChange={e => handleUpdateExerciseField(idx, 'descanso', e.target.value)} />
                                      </td>
                                      <td>
                                        <input type="text" className="form-control" style={{ padding: '4px', height: '30px' }} value={ex.observacao} onChange={e => handleUpdateExerciseField(idx, 'observacao', e.target.value)} placeholder="Dica..." />
                                      </td>
                                      <td>
                                        <input 
                                          type="text" 
                                          list={`group-suggestions-${activeWorkoutSubTab}`} 
                                          className="form-control" 
                                          style={{ padding: '4px', height: '30px', textAlign: 'center', fontSize: '0.8rem' }} 
                                          value={ex.combinaGrupo || ''} 
                                          onChange={e => handleUpdateExerciseField(idx, 'combinaGrupo', e.target.value)} 
                                          placeholder="Individual" 
                                        />
                                      </td>
                                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                        <button className="btn btn-secondary btn-sm" style={{ padding: '4px 6px', marginRight: '4px' }} disabled={idx === 0} onClick={() => handleMoveExercise(idx, -1)}>
                                          <i className="fa-solid fa-arrow-up"></i>
                                        </button>
                                        <button className="btn btn-secondary btn-sm" style={{ padding: '4px 6px', marginRight: '4px' }} disabled={idx === sheet.exercicios.length - 1} onClick={() => handleMoveExercise(idx, 1)}>
                                          <i className="fa-solid fa-arrow-down"></i>
                                        </button>
                                        <button className="btn btn-danger btn-sm" style={{ padding: '4px 6px' }} onClick={() => handleRemoveExerciseFromWorkout(idx)}>
                                          <i className="fa-solid fa-trash"></i>
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                                {(!sheet.exercicios || sheet.exercicios.length === 0) && (
                                  <tr>
                                    <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                                      Nenhum exercício adicionado a esta ficha. Busque e adicione pelo menu lateral.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px', marginBottom: '12px', background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <input 
                              type="checkbox" 
                              id="isNewWorkoutSheetCheckbox" 
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary)' }} 
                              checked={isNewWorkoutSheet} 
                              onChange={e => setIsNewWorkoutSheet(e.target.checked)} 
                            />
                            <label htmlFor="isNewWorkoutSheetCheckbox" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
                              Esta alteração representa uma nova ficha / replanejamento de metas
                            </label>
                          </div>

                          <div style={{ marginTop: '16px' }}>
                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSaveWorkout}>
                              <i className="fa-solid fa-save"></i> Salvar Ficha de Treino
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Right Column: Fast Exercise Add Selector */}
                  <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '20px' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Adicionar Exercício</h3>
                    <input type="text" className="form-control" style={{ marginBottom: '12px', height: '34px', fontSize: '0.8rem' }} placeholder="Buscar..." value={exerciseSearch} onChange={e => setExerciseSearch(e.target.value)} />
                    <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {filteredExercises.map(ex => (
                        <div key={ex._id} style={{
                          padding: '10px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{ex.nome}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{ex.grupo}</div>
                          </div>
                          <button className="btn btn-primary btn-sm" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => handleAddExerciseToWorkout(ex.nome)}>
                            <i className="fa-solid fa-plus"></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 4. View: Horários Fixos */}
      {activeTab === 'agenda_fixa' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Horários Fixos (Agenda Recorrente)</h1>
              <p>Gerencie regras de agendamento permanente semanal para os alunos.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="page-size-selector">
                <span>Exibir:</span>
                <select value={getPageSize('agenda_fixa')} onChange={e => setPageSizeForKey('agenda_fixa', Number(e.target.value))}>
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={15}>15</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={() => {
                setFsDate(new Date().toISOString().split('T')[0]);
                setShowFixedSchedModal(true);
              }}>
                <i className="fa-solid fa-plus"></i> Novo Horário Fixo
              </button>
            </div>
          </div>

          <div className="content-panel">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Especialista</th>
                    <th>Dia de Semana</th>
                    <th>Horário</th>
                    <th>Serviço</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'agenda_fixa';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const totalPages = Math.ceil(fixedSchedules.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = fixedSchedules.slice((curP - 1) * size, curP * size);

                    const weekdayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

                    return paginated.map(fs => (
                      <tr key={fs._id}>
                        <td><strong>{fs.clienteId?.dadosPessoais?.nome || 'Aluno Removido'}</strong></td>
                        <td>{fs.profissionalId?.nome || 'Profissional'}</td>
                        <td>{weekdayNames[fs.diaSemana]}</td>
                        <td><strong>{fs.horario}</strong></td>
                        <td>{fs.servico}</td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteFixedSchedule(fs._id)}>
                            <i className="fa-solid fa-trash"></i> Excluir
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                  {fixedSchedules.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state-card">
                          <i className="fa-solid fa-calendar-alt empty-state-icon"></i>
                          <div className="empty-state-title">Nenhum horário fixo</div>
                          <div className="empty-state-desc">Não há horários fixos semanais agendados.</div>
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

      {/* 5. View: Avaliações Físicas */}
      {activeTab === 'avaliacoes' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Avaliações Físicas</h1>
              <p>Histórico de bioimpedância, dobras cutâneas e metas de saúde.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="page-size-selector">
                <span>Exibir:</span>
                <select value={getPageSize('avaliacoes')} onChange={e => setPageSizeForKey('avaliacoes', Number(e.target.value))}>
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={15}>15</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={() => {
                const draftStr = localStorage.getItem('draft_assessment');
                if (draftStr) {
                  try {
                    setDraftOnOpen(JSON.parse(draftStr));
                  } catch (e) {}
                } else {
                  setDraftOnOpen(null);
                }
                setAsDate(new Date().toISOString().split('T')[0]);
                setShowAssessmentModal(true);
              }}>
                <i className="fa-solid fa-plus"></i> Nova Avaliação
              </button>
            </div>
          </div>

          <div className="content-panel">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Aluno</th>
                    <th>Peso / Altura</th>
                    <th style={{ textAlign: 'center' }}>Gordura Corporal</th>
                    <th>Massa Magra / Gorda</th>
                    {isAdmin && <th>Avaliador</th>}
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'avaliacoes';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const totalPages = Math.ceil(assessments.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = assessments.slice((curP - 1) * size, curP * size);

                    return paginated.map(as => (
                      <tr key={as._id}>
                        <td><strong>{as.data}</strong></td>
                        <td><strong>{as.clienteId?.dadosPessoais?.nome || 'Aluno Removido'}</strong></td>
                        <td>{as.dadosMedidos?.peso} kg / {as.dadosMedidos?.altura} m</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-warning">{as.resultadosCalculados?.percentualGordura}% BF</span>
                        </td>
                        <td>
                          MM: {as.resultadosCalculados?.massaMagra} kg / MG: {as.resultadosCalculados?.massaGorda} kg
                        </td>
                        {isAdmin && <td>{as.avaliadorId?.nome || 'Não Definido'}</td>}
                        <td>
                          <button className="btn btn-danger btn-sm" style={{ marginRight: '8px' }} onClick={() => handleDeleteAssessment(as._id)}>
                            <i className="fa-solid fa-trash"></i>
                          </button>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadAssessmentPDF(as, assessments)}>
                            <i className="fa-solid fa-file-pdf"></i> Laudo PDF
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                  {assessments.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6}>
                        <div className="empty-state-card">
                          <i className="fa-solid fa-weight-scale empty-state-icon"></i>
                          <div className="empty-state-title">Nenhuma avaliação física</div>
                          <div className="empty-state-desc">Não há registros de avaliações físicas.</div>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => { setAsDate(new Date().toISOString().split('T')[0]); setShowAssessmentModal(true); }}>
                            <i className="fa-solid fa-plus"></i> Nova Avaliação
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {assessments.length > 0 && (
              <Pagination
                currentPage={getPage('avaliacoes')}
                totalItems={assessments.length}
                itemsPerPage={getPageSize('avaliacoes')}
                onPageChange={page => setPage('avaliacoes', page)}
              />
            )}
          </div>
        </>
      )}

      {/* 6. View: Relatórios Fisioterápicos */}
      {activeTab === 'relatorios' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Relatórios Fisioterápicos</h1>
              <p>Laudos de evolução clínica e acompanhamento de dores do paciente.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="page-size-selector">
                <span>Exibir:</span>
                <select value={getPageSize('relatorios')} onChange={e => setPageSizeForKey('relatorios', Number(e.target.value))}>
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={15}>15</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={() => {
                setRepDate(new Date().toISOString().split('T')[0]);
                setShowReportModal(true); setTimeout(() => loadReportDraft(), 150);
              }}>
                <i className="fa-solid fa-plus"></i> Novo Relatório
              </button>
            </div>
          </div>

          <div className="content-panel">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Aluno / Paciente</th>
                    <th style={{ textAlign: 'center' }}>Escala de Dor</th>
                    <th>Queixa Principal</th>
                    {isAdmin && <th>Profissional</th>}
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'relatorios';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const q = getSearchQuery(listKey).toLowerCase();
                    const filtered = reports.filter(r => (r.clienteId?.dadosPessoais?.nome || r.clienteId?.nome || '').toLowerCase().includes(q));
                    const totalPages = Math.ceil(filtered.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = filtered.slice((curP - 1) * size, curP * size);

                    return paginated.map(rep => (
                      <tr key={rep._id}>
                        <td><strong>{rep.data}</strong></td>
                        <td><strong>{rep.clienteId?.dadosPessoais?.nome || 'Aluno Removido'}</strong></td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${rep.conteudo?.dorEscala > 6 ? 'badge-danger' : 'badge-warning'}`}>
                            Dor: {rep.conteudo?.dorEscala} / 10
                          </span>
                        </td>
                        <td><small style={{ color: 'var(--text-muted)' }}>{rep.conteudo?.queixaPrincipal || '-'}</small></td>
                        {isAdmin && <td>{rep.profissionalId?.nome || 'Não Definido'}</td>}
                        <td>
                          <button className="btn btn-danger btn-sm" style={{ marginRight: '8px' }} onClick={() => handleDeleteReport(rep._id)}>
                            <i className="fa-solid fa-trash"></i>
                          </button>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadReportPDF(rep)}>
                            <i className="fa-solid fa-file-pdf"></i> PDF
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                  {reports.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5}>
                        <div className="empty-state-card">
                          <i className="fa-solid fa-file-medical empty-state-icon"></i>
                          <div className="empty-state-title">Nenhum relatório clínico</div>
                          <div className="empty-state-desc">Não há laudos ou relatórios de evolução fisioterápica.</div>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => { setRepDate(new Date().toISOString().split('T')[0]); setShowReportModal(true); setTimeout(() => loadReportDraft(), 150); }}>
                            <i className="fa-solid fa-plus"></i> Novo Relatório
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {reports.length > 0 && (
              <Pagination
                currentPage={getPage('relatorios')}
                totalItems={reports.length}
                itemsPerPage={getPageSize('relatorios')}
                onPageChange={page => setPage('relatorios', page)}
              />
            )}
          </div>
        </>
      )}

      {/* Frequência dos Alunos */}
      {activeTab === 'frequencia_alunos' && (() => {
        const today = new Date();
        const getDaysSince = (clientId: string) => {
          const clientApts = appointments.filter((a: any) =>
            (a.clientId === clientId || a.clientId?._id === clientId) &&
            (a.status === 'confirmado' || a.status === 'concluido' || a.status === 'presenca')
          );
          if (clientApts.length === 0) return 999;
          const dates = clientApts.map((a: any) => new Date(a.date || a.createdAt).getTime());
          return Math.floor((Date.now() - Math.max(...dates)) / (1000 * 60 * 60 * 24));
        };
        const getMonthSessions = (clientId: string) => {
          return appointments.filter((a: any) => {
            const d = new Date(a.date || a.createdAt);
            return (a.clientId === clientId || a.clientId?._id === clientId) &&
              d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
          }).length;
        };
        const getRisk = (days: number) => {
          if (days <= 7) return { level: 'Baixo', color: 'var(--color-primary)' };
          if (days <= 20) return { level: 'Médio', color: 'var(--color-warning)' };
          return { level: 'Alto', color: 'var(--color-danger)' };
        };
        const sorted = [...clients].sort((a: any, b: any) => getDaysSince(b._id) - getDaysSince(a._id));
        const highRisk = sorted.filter((c: any) => getDaysSince(c._id) > 20).length;
        const medRisk = sorted.filter((c: any) => { const d = getDaysSince(c._id); return d > 7 && d <= 20; }).length;
        const lowRisk = sorted.filter((c: any) => getDaysSince(c._id) <= 7).length;
        return (
          <>
            <div className="view-header">
              <div className="view-title-group">
                <h1>Frequência dos Alunos</h1>
                <p>Monitore a assiduidade e identifique riscos de evasão.</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Risco Baixo (≤7 dias)', value: lowRisk, color: 'var(--color-primary)' },
                { label: 'Risco Médio (8–20 dias)', value: medRisk, color: 'var(--color-warning)' },
                { label: 'Risco Alto (>20 dias)', value: highRisk, color: 'var(--color-danger)' },
              ].map(s => (
                <div key={s.label} className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '10px', background: s.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fa-solid fa-chart-bar" style={{ color: s.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Sessões (mês)</th>
                    <th>Último Atendimento</th>
                    <th>Dias Sem Vir</th>
                    <th>Risco de Evasão</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>Nenhum cliente vinculado.</td></tr>
                  ) : sorted.map((c: any) => {
                    const days = getDaysSince(c._id);
                    const risk = getRisk(days);
                    const sessions = getMonthSessions(c._id);
                    const clientApts = appointments.filter((a: any) =>
                      (a.clientId === c._id || a.clientId?._id === c._id) &&
                      (a.status === 'confirmado' || a.status === 'concluido' || a.status === 'presenca')
                    );
                    const lastDate = clientApts.length > 0
                      ? new Date(Math.max(...clientApts.map((a: any) => new Date(a.date || a.createdAt).getTime()))).toLocaleDateString('pt-BR')
                      : 'Sem histórico';
                    return (
                      <tr key={c._id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{c.dadosPessoais?.nome}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{c.dadosPessoais?.telefone || ''}</div>
                        </td>
                        <td style={{ fontWeight: 600, color: sessions > 0 ? 'var(--color-primary)' : 'var(--text-dim)' }}>{sessions}</td>
                        <td style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{lastDate}</td>
                        <td style={{ fontWeight: 600 }}>{days === 999 ? '—' : days}</td>
                        <td>
                          <span className="badge" style={{ background: risk.color + '22', color: risk.color, fontWeight: 700 }}>
                            {risk.level}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        );
      })()}

      {/* 7. View: Testes de Força */}
      {activeTab === 'testes_forca' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Avaliação de Teste de Força Muscular</h1>
              <p>Métricas de dinamarquês e risco de lesão do ombro.</p>
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
              <button className="btn btn-primary" onClick={() => {
                setStDate(new Date().toISOString().split('T')[0]);
                setShowStModal(true); setTimeout(() => loadStDraft(), 150);
              }}>
                <i className="fa-solid fa-plus"></i> Novo Teste
              </button>
            </div>
          </div>

          <div className="content-panel">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Aluno</th>
                    <th>Métricas de Força / Cargas</th>
                    <th style={{ textAlign: 'center' }}>Avaliação / Risco</th>
                    {isAdmin && <th>Avaliador</th>}
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'testes_forca';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const q = getSearchQuery(listKey).toLowerCase();
                    const filtered = strengthTests.filter(st => (st.clienteId?.dadosPessoais?.nome || st.clienteId?.nome || '').toLowerCase().includes(q));
                    const totalPages = Math.ceil(filtered.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = filtered.slice((curP - 1) * size, curP * size);

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
                        const supino = st.exercicios?.find((e: any) => e.nome === 'Supino Reto')?.carga || '-';
                        const remada = st.exercicios?.find((e: any) => e.nome === 'Remada Curvada / Máquina')?.carga || '-';
                        metricaText = `Supino: ${supino} kg / Remada: ${remada} kg`;
                        
                        const risco = st.analise?.riscoOmbro;
                        statusBadge = (
                          <span className={`badge ${risco ? 'badge-danger' : 'badge-success'}`}>
                            {risco ? 'Risco Elevado' : 'Seguro / Estável'}
                          </span>
                        );
                      }

                      return (
                        <tr key={st._id}>
                          <td><strong>{st.data}</strong></td>
                          <td><strong>{st.clienteId?.dadosPessoais?.nome || 'Aluno Removido'}</strong></td>
                          <td>{metricaText}</td>
                          <td style={{ textAlign: 'center' }}>
                            {statusBadge}
                          </td>
                          {isAdmin && <td>{st.profissionalId?.nome || 'Não Definido'}</td>}
                          <td>
                            <button className="btn btn-danger btn-sm" style={{ marginRight: '8px' }} onClick={() => handleDeleteStrengthTest(st._id)}>
                              <i className="fa-solid fa-trash"></i>
                            </button>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadStrengthTestPDF(st, st.clienteId, st.profissionalId)}>
                              <i className="fa-solid fa-file-pdf color-danger"></i> Análise PDF
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                  {strengthTests.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5}>
                        <div className="empty-state-card">
                          <i className="fa-solid fa-dumbbell empty-state-icon"></i>
                          <div className="empty-state-title">Nenhum teste de força</div>
                          <div className="empty-state-desc">Não há avaliações de força muscular registradas.</div>
                          <button className="btn btn-primary btn-sm" onClick={() => { setStDate(new Date().toISOString().split('T')[0]); setShowStModal(true); setTimeout(() => loadStDraft(), 150); }}>
                            <i className="fa-solid fa-plus"></i> Novo Teste
                          </button>
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

      {/* 8. View: Prontuários */}
      {activeTab === 'prontuarios' && (
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Prontuários Clínicos</h1>
              <p>Histórico clínico centralizado e anotações confidenciais do fisioterapeuta.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="page-size-selector">
                <span>Exibir:</span>
                <select value={getPageSize('prontuarios')} onChange={e => setPageSizeForKey('prontuarios', Number(e.target.value))}>
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={15}>15</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={() => {
                setPrDate(new Date().toISOString().split('T')[0]);
                setShowProntuarioModal(true);
              }}>
                <i className="fa-solid fa-plus"></i> Nova Anotação
              </button>
            </div>
          </div>

          <div className="content-panel">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Aluno / Paciente</th>
                    <th>Anotações Médicas</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'prontuarios';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const q = getSearchQuery(listKey).toLowerCase();
                    const filtered = prontuarios.filter(p => (p.clienteId?.dadosPessoais?.nome || p.clienteId?.nome || '').toLowerCase().includes(q));
                    const totalPages = Math.ceil(filtered.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = filtered.slice((curP - 1) * size, curP * size);

                    return paginated.map(pr => (
                      <tr key={pr._id}>
                        <td><strong>{pr.data}</strong></td>
                        <td><strong>{pr.clienteId?.dadosPessoais?.nome || 'Aluno Removido'}</strong></td>
                        <td><small style={{ color: 'var(--text-main)' }}>{(pr.conteudo || '').substring(0, 120)}{(pr.conteudo || '').length > 120 ? '...' : ''}</small></td>
                        <td style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadProntuarioPDF(pr, pr.clienteId)}>
                            <i className="fa-solid fa-file-pdf"></i> PDF
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteProntuario(pr._id)}>
                            <i className="fa-solid fa-trash"></i> Excluir
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                  {prontuarios.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-state-card">
                          <i className="fa-solid fa-clipboard-question empty-state-icon"></i>
                          <div className="empty-state-title">Nenhum prontuário</div>
                          <div className="empty-state-desc">Não há anotações ou evoluções de prontuário registradas.</div>
                          <button className="btn btn-primary btn-sm" onClick={() => { setPrDate(new Date().toISOString().split('T')[0]); setShowProntuarioModal(true); }}>
                            <i className="fa-solid fa-plus"></i> Nova Anotação
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {prontuarios.length > 0 && (
              <Pagination
                currentPage={getPage('prontuarios')}
                totalItems={prontuarios.length}
                itemsPerPage={getPageSize('prontuarios')}
                onPageChange={page => setPage('prontuarios', page)}
              />
            )}
          </div>
        </>
      )}

      {/* Default Fallback for other tabs */}
      {!['resumo_dia', 'dashboard', 'clientes', 'treinos_prof', 'agenda_fixa', 'avaliacoes', 'relatorios', 'testes_forca', 'prontuarios'].includes(activeTab) && (
        <div className="content-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h2>Aba em Desenvolvimento</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            A aba <strong>{activeTab}</strong> está sendo migrada. A agenda e fichas já se conectam ao MongoDB.
          </p>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Appointment Modal */}
      {showAptModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowAptModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h3>Novo Agendamento</h3>
              <button className="modal-close" onClick={() => setShowAptModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateApt}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Aluno</label>
                  <SearchableSelect
                    options={clientOptions}
                    value={selectedClient}
                    onChange={setSelectedClient}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Data</label>
                    <input type="date" className="form-control" value={aptDate} onChange={e => setAptDate(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Horário</label>
                    <input type="time" className="form-control" value={aptTime} onChange={e => setAptTime(e.target.value)} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Serviço</label>
                    <select className="select-custom" value={aptService} onChange={e => setAptService(e.target.value)}>
                      {aptDate && new Date(aptDate + 'T12:00:00').getDay() === 6 ? (
                        <option value="Massagem">Massagem</option>
                      ) : (
                        <>
                          <option value="Treino Monitorado">Treino Monitorado</option>
                          <option value="Treino Livre">Treino Livre</option>
                          <option value="Recovery">Recovery</option>
                          <option value="Avaliação Física">Avaliação Física</option>
                          <option value="Teste de Força">Teste de Força</option>
                          <option value="Avaliação Fisioterápica">Avaliação Fisioterápica</option>
                          <option value="Emergência">Atendimento de Emergência</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAptModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Confirmar Agendamento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Fixed Schedule Modal */}
      {showFixedSchedModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowFixedSchedModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h3>Novo Horário Fixo</h3>
              <button className="modal-close" onClick={() => setShowFixedSchedModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateFixedSchedule}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Aluno</label>
                  <SearchableSelect
                    options={clientOptions}
                    value={fsClient}
                    onChange={setFsClient}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
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
                  <div className="form-group">
                    <label>Horário</label>
                    <input type="time" className="form-control" value={fsTime} onChange={e => setFsTime(e.target.value)} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Serviço</label>
                    <select className="select-custom" value={fsService} onChange={e => setFsService(e.target.value)} required>
                      <option value="Treino Monitorado">Treino Monitorado</option>
                      <option value="Treino Livre">Treino Livre</option>
                      <option value="Avaliação Fisioterápica">Avaliação Fisioterápica</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Data de Início</label>
                    <input type="date" className="form-control" value={fsDate} onChange={e => setFsDate(e.target.value)} required />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowFixedSchedModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Criar Regra</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Physical Assessment Modal */}
      {showAssessmentModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'var(--bg-main, #0f172a)', zIndex: 9999, overflowY: 'auto', display: 'block', padding: '24px 0' }}>
          <div className="modal-content" style={{ maxWidth: '1200px', width: '95%', margin: '0 auto', background: 'var(--bg-card, #1e293b)', minHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <h3 style={{ margin: 0 }}>Nova Avaliação Física Fisioterapêutica</h3>
                <span style={{ padding: '4px 10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  ⏱️ Tempo: {formatTimer(asTimerSeconds)}
                </span>
              </div>
              <button className="modal-close" onClick={handleCloseAssessment}>&times;</button>
            </div>
            
            {/* Wizard Steps indicator */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)', flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5, 6].map(step => (
                <div key={step} style={{ flex: '1 1 15%', padding: '10px 4px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: asStep === step ? 'var(--color-primary)' : 'var(--text-dim)', borderBottom: asStep === step ? '3px solid var(--color-primary)' : '3px solid transparent' }}>
                  {step === 1 ? '1. Aluno' : step === 2 ? '2. Biometria' : step === 3 ? '3. Perímetros' : step === 4 ? '4. Dobras' : step === 5 ? '5. Ângulos' : '6. Metas'}
                </div>
              ))}
            </div>

            <form onSubmit={handleCreateAssessment}>
              <div className="modal-body" style={{ minHeight: '300px' }}>
                {asStep === 1 && (
                  <>
                    <div className="form-group">
                      <label>Aluno</label>
                      <SearchableSelect options={clientOptions} value={asClient} onChange={setAsClient} required />
                      {asClient && (
                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 12px', marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                          <strong>Informações do Aluno:</strong> Sexo: {asSex === 'M' ? 'Masculino' : 'Feminino'} | Idade: {asAge} anos | Altura: {asHeight} m
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Data</label>
                      <input type="date" className="form-control" value={asDate} onChange={e => setAsDate(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label>Avaliador</label>
                      <select className="form-control" value={asAvaliador} onChange={e => setAsAvaliador(e.target.value)} required>
                        <option value="">Selecione o Avaliador</option>
                        {professionals.map((p: any) => (
                          <option key={p._id} value={p._id}>{p.nome}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {asStep === 2 && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Idade (anos)</label>
                        <input type="number" className="form-control" value={asAge} onChange={e => setAsAge(Number(e.target.value))} required />
                      </div>
                      <div className="form-group">
                        <label>Peso (kg)</label>
                        <input type="number" step="0.1" className="form-control" style={asPrefilledFields['peso'] ? { color: '#ef4444' } : {}} value={asWeight} onChange={e => { setAsWeight(e.target.value); setAsPrefilledFields(prev => { const c = { ...prev }; delete c['peso']; return c; }); }} required />
                      </div>
                      <div className="form-group">
                        <label>Altura (m)</label>
                        <input type="number" step="0.01" className="form-control" style={asPrefilledFields['altura'] ? { color: '#ef4444' } : {}} value={asHeight} onChange={e => { setAsHeight(e.target.value); setAsPrefilledFields(prev => { const c = { ...prev }; delete c['altura']; return c; }); }} required />
                      </div>
                    </div>
                    <h4 style={{ color: 'var(--color-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginTop: '16px', marginBottom: '12px' }}>Saúde Geral</h4>
                    <div className="form-group">
                      <label>Horas de Sono / Noite</label>
                      <input type="text" className="form-control" style={asPrefilledFields['saudeGeral.sono'] ? { color: '#ef4444' } : {}} value={asSono} onChange={e => { setAsSono(e.target.value); setAsPrefilledFields(prev => { const c = { ...prev }; delete c['saudeGeral.sono']; return c; }); }} />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Nutrição</label>
                        <input type="text" className="form-control" style={asPrefilledFields['saudeGeral.nutricao'] ? { color: '#ef4444' } : {}} value={asNutricao} onChange={e => { setAsNutricao(e.target.value); setAsPrefilledFields(prev => { const c = { ...prev }; delete c['saudeGeral.nutricao']; return c; }); }} />
                      </div>
                      <div className="form-group">
                        <label>Atividade Física</label>
                        <input type="text" className="form-control" style={asPrefilledFields['saudeGeral.atividadeFisica'] ? { color: '#ef4444' } : {}} value={asAtivFisica} onChange={e => { setAsAtivFisica(e.target.value); setAsPrefilledFields(prev => { const c = { ...prev }; delete c['saudeGeral.atividadeFisica']; return c; }); }} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Medicamentos em Uso</label>
                      <input type="text" className="form-control" style={asPrefilledFields['saudeGeral.medicamentos'] ? { color: '#ef4444' } : {}} value={asMedicamentos} onChange={e => { setAsMedicamentos(e.target.value); setAsPrefilledFields(prev => { const c = { ...prev }; delete c['saudeGeral.medicamentos']; return c; }); }} />
                    </div>
                    <div className="form-group">
                      <label>Cirurgias Anteriores</label>
                      <input type="text" className="form-control" style={asPrefilledFields['saudeGeral.cirurgias'] ? { color: '#ef4444' } : {}} value={asCirurgias} onChange={e => { setAsCirurgias(e.target.value); setAsPrefilledFields(prev => { const c = { ...prev }; delete c['saudeGeral.cirurgias']; return c; }); }} />
                    </div>
                    <div className="form-group">
                      <label>Principais Queixas / Dores</label>
                      <input type="text" className="form-control" style={asPrefilledFields['saudeGeral.queixas'] ? { color: '#ef4444' } : {}} value={asQueixas} onChange={e => { setAsQueixas(e.target.value); setAsPrefilledFields(prev => { const c = { ...prev }; delete c['saudeGeral.queixas']; return c; }); }} />
                    </div>
                  </>
                )}

                {asStep === 3 && (
                  <>
                    <h4 style={{ color: 'var(--color-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '16px' }}>Circunferências Corporais (cm)</h4>
                    <div className="form-row">
                      <div className="form-group"><label>Pescoço</label><input type="number" step="0.1" className="form-control" style={asPrefilledFields['circ.pescoco'] ? { color: '#ef4444' } : {}} value={asCirc.pescoco} onChange={e => { setAsCirc({ ...asCirc, pescoco: e.target.value as any }); setAsPrefilledFields(prev => { const c = { ...prev }; delete c['circ.pescoco']; return c; }); }} /></div>
                      <div className="form-group"><label>Ombros</label><input type="number" step="0.1" className="form-control" style={asPrefilledFields['circ.ombros'] ? { color: '#ef4444' } : {}} value={asCirc.ombros} onChange={e => { setAsCirc({ ...asCirc, ombros: e.target.value as any }); setAsPrefilledFields(prev => { const c = { ...prev }; delete c['circ.ombros']; return c; }); }} /></div>
                      <div className="form-group"><label>Tórax</label><input type="number" step="0.1" className="form-control" style={asPrefilledFields['circ.torax'] ? { color: '#ef4444' } : {}} value={asCirc.torax} onChange={e => { setAsCirc({ ...asCirc, torax: e.target.value as any }); setAsPrefilledFields(prev => { const c = { ...prev }; delete c['circ.torax']; return c; }); }} /></div>
                      <div className="form-group"><label>Cintura</label><input type="number" step="0.1" className="form-control" style={asPrefilledFields['circ.cintura'] ? { color: '#ef4444' } : {}} value={asCirc.cintura} onChange={e => { setAsCirc({ ...asCirc, cintura: e.target.value as any }); setAsPrefilledFields(prev => { const c = { ...prev }; delete c['circ.cintura']; return c; }); }} /></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label>Abdômen</label><input type="number" step="0.1" className="form-control" style={asPrefilledFields['circ.abdomen'] ? { color: '#ef4444' } : {}} value={asCirc.abdomen} onChange={e => { setAsCirc({ ...asCirc, abdomen: e.target.value as any }); setAsPrefilledFields(prev => { const c = { ...prev }; delete c['circ.abdomen']; return c; }); }} /></div>
                      <div className="form-group"><label>Quadril</label><input type="number" step="0.1" className="form-control" style={asPrefilledFields['circ.quadril'] ? { color: '#ef4444' } : {}} value={asCirc.quadril} onChange={e => { setAsCirc({ ...asCirc, quadril: e.target.value as any }); setAsPrefilledFields(prev => { const c = { ...prev }; delete c['circ.quadril']; return c; }); }} /></div>
                      <div className="form-group"><label>Braço Direito</label><input type="number" step="0.1" className="form-control" style={asPrefilledFields['circ.braçoD'] ? { color: '#ef4444' } : {}} value={asCirc.braçoD} onChange={e => { setAsCirc({ ...asCirc, braçoD: e.target.value as any }); setAsPrefilledFields(prev => { const c = { ...prev }; delete c['circ.braçoD']; return c; }); }} /></div>
                      <div className="form-group"><label>Braço Esquerdo</label><input type="number" step="0.1" className="form-control" style={asPrefilledFields['circ.braçoE'] ? { color: '#ef4444' } : {}} value={asCirc.braçoE} onChange={e => { setAsCirc({ ...asCirc, braçoE: e.target.value as any }); setAsPrefilledFields(prev => { const c = { ...prev }; delete c['circ.braçoE']; return c; }); }} /></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label>Antebraço D</label><input type="number" step="0.1" className="form-control" style={asPrefilledFields['circ.antebraçoD'] ? { color: '#ef4444' } : {}} value={asCirc.antebraçoD} onChange={e => { setAsCirc({ ...asCirc, antebraçoD: e.target.value as any }); setAsPrefilledFields(prev => { const c = { ...prev }; delete c['circ.antebraçoD']; return c; }); }} /></div>
                      <div className="form-group"><label>Antebraço E</label><input type="number" step="0.1" className="form-control" style={asPrefilledFields['circ.antebraçoE'] ? { color: '#ef4444' } : {}} value={asCirc.antebraçoE} onChange={e => { setAsCirc({ ...asCirc, antebraçoE: e.target.value as any }); setAsPrefilledFields(prev => { const c = { ...prev }; delete c['circ.antebraçoE']; return c; }); }} /></div>
                      <div className="form-group"><label>Coxa Direita</label><input type="number" step="0.1" className="form-control" style={asPrefilledFields['circ.coxaD'] ? { color: '#ef4444' } : {}} value={asCirc.coxaD} onChange={e => { setAsCirc({ ...asCirc, coxaD: e.target.value as any }); setAsPrefilledFields(prev => { const c = { ...prev }; delete c['circ.coxaD']; return c; }); }} /></div>
                      <div className="form-group"><label>Coxa Esquerda</label><input type="number" step="0.1" className="form-control" style={asPrefilledFields['circ.coxaE'] ? { color: '#ef4444' } : {}} value={asCirc.coxaE} onChange={e => { setAsCirc({ ...asCirc, coxaE: e.target.value as any }); setAsPrefilledFields(prev => { const c = { ...prev }; delete c['circ.coxaE']; return c; }); }} /></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group" style={{ maxWidth: '25%' }}><label>Panturrilha D</label><input type="number" step="0.1" className="form-control" style={asPrefilledFields['circ.panturrilhaD'] ? { color: '#ef4444' } : {}} value={asCirc.panturrilhaD} onChange={e => { setAsCirc({ ...asCirc, panturrilhaD: e.target.value as any }); setAsPrefilledFields(prev => { const c = { ...prev }; delete c['circ.panturrilhaD']; return c; }); }} /></div>
                      <div className="form-group" style={{ maxWidth: '25%' }}><label>Panturrilha E</label><input type="number" step="0.1" className="form-control" style={asPrefilledFields['circ.panturrilhaE'] ? { color: '#ef4444' } : {}} value={asCirc.panturrilhaE} onChange={e => { setAsCirc({ ...asCirc, panturrilhaE: e.target.value as any }); setAsPrefilledFields(prev => { const c = { ...prev }; delete c['circ.panturrilhaE']; return c; }); }} /></div>
                    </div>
                  </>
                )}

                {asStep === 4 && (
                  <>
                    <h4 style={{ color: 'var(--color-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '16px' }}>Dobras Cutâneas (mm)</h4>
                    <p style={{ color: 'var(--text-dim)', fontSize: '12px', marginBottom: '14px' }}>
                      Fórmula de Jackson & Pollock (7 Dobras). Insira até 3 medidas por dobra. A média é calculada automaticamente.
                    </p>
                    
                    {(() => {
                      const dobrasList = [
                        { key: 'peitoral', label: 'Peitoral' },
                        { key: 'triceps', label: 'Tríceps' },
                        { key: 'subescapular', label: 'Subescapular' },
                        { key: 'subaxilar', label: 'Subaxilar' },
                        { key: 'suprailiaca', label: 'Supra-ilíaca' },
                        { key: 'abdomen', label: 'Abdômen' },
                        { key: 'coxa', label: 'Coxa' }
                      ];

                      const handleDobraReadingChange = (dobraKey: string, subIdx: number, val: string) => {
                        setAsDobrasReadings(prev => {
                          const currentReadings = prev[dobraKey] || ['', '', ''];
                          const nextReadings = [...currentReadings] as [string, string, string];
                          nextReadings[subIdx] = val;

                          // Calcular média em tempo real das medidas válidas
                          const parsedVals = nextReadings.map(v => parseFloat(v)).filter(v => !isNaN(v));
                          const avg = parsedVals.length > 0 ? parseFloat((parsedVals.reduce((sum, v) => sum + v, 0) / parsedVals.length).toFixed(1)) : 0;

                          // Atualizar a dobra principal
                          setAsDobras(prevD => ({ ...prevD, [dobraKey]: avg }));

                          // Atualizar prefilled state
                          setAsPrefilledFields(prevP => {
                            const copy = { ...prevP };
                            delete copy['dobras.' + dobraKey];
                            return copy;
                          });

                          return { ...prev, [dobraKey]: nextReadings };
                        });
                      };

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {dobrasList.map(dobra => {
                            const readings = asDobrasReadings[dobra.key] || ['', '', ''];
                            const isPrefilled = asPrefilledFields['dobras.' + dobra.key];
                            return (
                              <div key={dobra.key} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px' }}>
                                <div style={{ minWidth: '120px', fontWeight: 'bold', fontSize: '0.85rem' }}>{dobra.label}</div>
                                <div style={{ display: 'flex', gap: '6px', flex: 1, minWidth: '220px' }}>
                                  {[0, 1, 2].map(subIdx => (
                                    <input
                                      key={subIdx}
                                      type="number"
                                      step="0.1"
                                      placeholder={`M${subIdx+1}`}
                                      className="form-control form-control-sm"
                                      style={{ textAlign: 'center', height: '28px', flex: 1, ...(isPrefilled ? { color: '#ef4444' } : {}) }}
                                      value={readings[subIdx]}
                                      onChange={e => handleDobraReadingChange(dobra.key, subIdx, e.target.value)}
                                    />
                                  ))}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', minWidth: '90px' }}>
                                  <span style={{ color: 'var(--text-dim)' }}>Média:</span>
                                  <strong style={{ fontSize: '0.9rem', color: isPrefilled ? '#ef4444' : 'var(--color-primary)' }}>{asDobras[dobra.key] || '0'} mm</strong>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    <div style={{ marginTop: '16px', background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', maxWidth: '250px' }}>
                      <label style={{ fontWeight: 'bold', display: 'block', color: 'var(--color-primary)' }}>Soma das Dobras:</label>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-success)' }}>{asSomaDobras} mm</div>
                    </div>
                  </>
                )}

                {asStep === 5 && (
                  <>
                    <h4 style={{ color: 'var(--color-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '16px' }}>Flexibilidade & Goniometria (ADM em Graus)</h4>
                    
                    {/* Alertas de assimetria inline */}
                    {(() => {
                      const warnings: string[] = [];
                      const checkAsymmetry = (dObj: any, eObj: any, label: string) => {
                        const d = dObj && typeof dObj === 'object' ? Number(dObj.semForca) || 0 : Number(dObj) || 0;
                        const e = eObj && typeof eObj === 'object' ? Number(eObj.semForca) || 0 : Number(eObj) || 0;
                        const max = Math.max(d, e);
                        if (max > 0 && (Math.abs(d - e) / max) > 0.10) {
                          warnings.push(label);
                        }
                      };
                      
                      checkAsymmetry(asGonio.quadrilFlexao1D, asGonio.quadrilFlexao1E, 'Quadril - Flexão 1');
                      checkAsymmetry(asGonio.quadrilFlexao2D, asGonio.quadrilFlexao2E, 'Quadril - Flexão 2');
                      checkAsymmetry(asGonio.quadrilRotIntD, asGonio.quadrilRotIntE, 'Quadril - Rotação Interna');
                      checkAsymmetry(asGonio.quadrilRotExtD, asGonio.quadrilRotExtE, 'Quadril - Rotação Externa');
                      checkAsymmetry(asGonio.joelhoFlexaoD, asGonio.joelhoFlexaoE, 'Joelho - Flexão');
                      checkAsymmetry(asGonio.joelhoPopliteoD, asGonio.joelhoPopliteoE, 'Joelho - Poplíteo');
                      checkAsymmetry(asGonio.tornozeloDorsi1D, asGonio.tornozeloDorsi1E, 'Tornozelo - Dorsi 1');
                      checkAsymmetry(asGonio.tornozeloDorsi2D, asGonio.tornozeloDorsi2E, 'Tornozelo - Dorsi 2');
                      checkAsymmetry(asGonio.tornozeloFlexaoPlantarD, asGonio.tornozeloFlexaoPlantarE, 'Tornozelo - Flexão Plantar');
                      checkAsymmetry(asGonio.ombroRotIntD, asGonio.ombroRotIntE, 'Ombro - Rotação Interna');
                      checkAsymmetry(asGonio.ombroRotExtD, asGonio.ombroRotExtE, 'Ombro - Rotação Externa');
                      checkAsymmetry(asGonio.ombroFlexaoD, asGonio.ombroFlexaoE, 'Ombro - Flexão');
                      
                      const thomasIlioMax = Math.max(parseFloat(asThomasIliopsoasD) || 0, parseFloat(asThomasIliopsoasE) || 0);
                      if (thomasIlioMax > 0 && (Math.abs((parseFloat(asThomasIliopsoasD) || 0) - (parseFloat(asThomasIliopsoasE) || 0)) / thomasIlioMax) > 0.10) {
                        warnings.push('Teste de Thomas - Iliopsoas');
                      }
                      
                      const thomasRetoMax = Math.max(parseFloat(asThomasRetofemoralD) || 0, parseFloat(asThomasRetofemoralE) || 0);
                      if (thomasRetoMax > 0 && (Math.abs((parseFloat(asThomasRetofemoralD) || 0) - (parseFloat(asThomasRetofemoralE) || 0)) / thomasRetoMax) > 0.10) {
                        warnings.push('Teste de Thomas - Retofemoral');
                      }

                      if (warnings.length > 0) {
                        return (
                          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid #ef4444', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '12px', color: '#ef4444' }}>
                            <strong><i className="fa-solid fa-triangle-exclamation"></i> Assimetria Significativa Detectada (&gt;10%):</strong>
                            <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                              {warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                            </ul>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div>
                      <p style={{ color: 'var(--text-dim)', fontSize: '11px', marginBottom: '12px' }}>
                        Informe a amplitude em graus. <strong>Ativo</strong> = Sem aplicar força do instrutor. <strong>Passivo</strong> = Aplicando força.
                      </p>
                      <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                        <table className="data-table" style={{ margin: 0, fontSize: '0.8rem' }}>
                          <thead style={{ background: 'var(--bg-card)' }}>
                            <tr>
                              <th rowSpan={2} style={{ verticalAlign: 'middle' }}>Movimento (Ref)</th>
                              <th colSpan={2} style={{ textAlign: 'center', background: 'rgba(13,148,136,0.06)' }}>Direito</th>
                              <th colSpan={2} style={{ textAlign: 'center', background: 'rgba(99,102,241,0.06)' }}>Esquerdo</th>
                            </tr>
                            <tr>
                              <th style={{ textAlign: 'center', fontSize: '10px', background: 'rgba(13,148,136,0.04)' }}>Ativo (Sem)</th>
                              <th style={{ textAlign: 'center', fontSize: '10px', background: 'rgba(13,148,136,0.08)' }}>Passivo (Com)</th>
                              <th style={{ textAlign: 'center', fontSize: '10px', background: 'rgba(99,102,241,0.04)' }}>Ativo (Sem)</th>
                              <th style={{ textAlign: 'center', fontSize: '10px', background: 'rgba(99,102,241,0.08)' }}>Passivo (Com)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { label: 'Quadril - Flexão 1', ref: '70-80°', keyD: 'quadrilFlexao1D', keyE: 'quadrilFlexao1E' },
                              { label: 'Quadril - Flexão 2', ref: '100-125°', keyD: 'quadrilFlexao2D', keyE: 'quadrilFlexao2E' },
                              { label: 'Quadril - Rotação Interna', ref: '40-45°', keyD: 'quadrilRotIntD', keyE: 'quadrilRotIntE' },
                              { label: 'Quadril - Rotação Externa', ref: '40-45°', keyD: 'quadrilRotExtD', keyE: 'quadrilRotExtE' },
                              { label: 'Joelho - Flexão', ref: '135-150°', keyD: 'joelhoFlexaoD', keyE: 'joelhoFlexaoE' },
                              { label: 'Joelho - Poplíteo', ref: '155-160°', keyD: 'joelhoPopliteoD', keyE: 'joelhoPopliteoE' },
                              { label: 'Tornozelo - Dorsi 1', ref: '35-45°', keyD: 'tornozeloDorsi1D', keyE: 'tornozeloDorsi1E' },
                              { label: 'Tornozelo - Dorsi 2', ref: '20°', keyD: 'tornozeloDorsi2D', keyE: 'tornozeloDorsi2E' },
                              { label: 'Tornozelo - F. Plantar', ref: '40-50°', keyD: 'tornozeloFlexaoPlantarD', keyE: 'tornozeloFlexaoPlantarE' },
                              { label: 'Ombro - Rotação Interna', ref: '80-90°', keyD: 'ombroRotIntD', keyE: 'ombroRotIntE' },
                              { label: 'Ombro - Rotação Externa', ref: '80-100°', keyD: 'ombroRotExtD', keyE: 'ombroRotExtE' },
                              { label: 'Ombro - Flexão', ref: '180°', keyD: 'ombroFlexaoD', keyE: 'ombroFlexaoE' }
                            ].map(row => {
                              const valD = asGonio[row.keyD] || { semForca: '', comForca: '' };
                              const valE = asGonio[row.keyE] || { semForca: '', comForca: '' };
                              const prefilledD = asPrefilledFields['gonio.' + row.keyD];
                              const prefilledE = asPrefilledFields['gonio.' + row.keyE];

                              const updateField = (key: string, side: 'semForca' | 'comForca', value: string) => {
                                setAsGonio(prev => {
                                  const currentObj = prev[key] || { semForca: '', comForca: '' };
                                  const numVal = value === '' ? '' : Number(value);
                                  const nextObj = { ...currentObj, [side]: numVal };

                                  // Remover dos prefilleds
                                  setAsPrefilledFields(prevP => {
                                    const copy = { ...prevP };
                                    delete copy['gonio.' + key];
                                    return copy;
                                  });

                                  return { ...prev, [key]: nextObj };
                                });
                              };

                              return (
                                <tr key={row.keyD}>
                                  <td>
                                    <strong>{row.label}</strong> <br/>
                                    <small style={{ color: 'var(--text-dim)' }}>Ref: {row.ref}</small>
                                  </td>
                                  {/* Direito */}
                                  <td style={{ background: 'rgba(13,148,136,0.02)' }}>
                                    <input
                                      type="number"
                                      placeholder="1"
                                      className="form-control form-control-sm"
                                      style={{ textAlign: 'center', height: '26px', ...(prefilledD ? { color: '#ef4444' } : {}) }}
                                      value={valD.semForca}
                                      onChange={e => updateField(row.keyD, 'semForca', e.target.value)}
                                    />
                                  </td>
                                  <td style={{ background: 'rgba(13,148,136,0.05)' }}>
                                    <input
                                      type="number"
                                      placeholder="2"
                                      className="form-control form-control-sm"
                                      style={{ textAlign: 'center', height: '26px', ...(prefilledD ? { color: '#ef4444' } : {}) }}
                                      value={valD.comForca}
                                      onChange={e => updateField(row.keyD, 'comForca', e.target.value)}
                                    />
                                  </td>
                                  {/* Esquerdo */}
                                  <td style={{ background: 'rgba(99,102,241,0.02)' }}>
                                    <input
                                      type="number"
                                      placeholder="1"
                                      className="form-control form-control-sm"
                                      style={{ textAlign: 'center', height: '26px', ...(prefilledE ? { color: '#ef4444' } : {}) }}
                                      value={valE.semForca}
                                      onChange={e => updateField(row.keyE, 'semForca', e.target.value)}
                                    />
                                  </td>
                                  <td style={{ background: 'rgba(99,102,241,0.05)' }}>
                                    <input
                                      type="number"
                                      placeholder="2"
                                      className="form-control form-control-sm"
                                      style={{ textAlign: 'center', height: '26px', ...(prefilledE ? { color: '#ef4444' } : {}) }}
                                      value={valE.comForca}
                                      onChange={e => updateField(row.keyE, 'comForca', e.target.value)}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <h4 style={{ color: 'var(--color-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginTop: '20px', marginBottom: '16px' }}>Testes Especiais Ortopédicos</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', fontSize: '12px' }}>
                      <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <h5 style={{ color: 'var(--color-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '10px' }}>Teste de Ober</h5>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <label>Lado Direito</label>
                            <select className="form-control form-control-sm" value={asOberD} onChange={e => setAsOberD(e.target.value)}>
                              <option value="Negativo">Negativo</option>
                              <option value="Positivo">Positivo</option>
                            </select>
                          </div>
                          <div style={{ flex: 1 }}>
                            <label>Lado Esquerdo</label>
                            <select className="form-control form-control-sm" value={asOberE} onChange={e => setAsOberE(e.target.value)}>
                              <option value="Negativo">Negativo</option>
                              <option value="Positivo">Positivo</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <h5 style={{ color: 'var(--color-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '10px' }}>Teste de Thomas</h5>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <label>Lado Direito</label>
                            <select className="form-control form-control-sm" value={asThomasD} onChange={e => setAsThomasD(e.target.value)}>
                              <option value="Negativo">Negativo</option>
                              <option value="Positivo">Positivo</option>
                            </select>
                          </div>
                          <div style={{ flex: 1 }}>
                            <label>Lado Esquerdo</label>
                            <select className="form-control form-control-sm" value={asThomasE} onChange={e => setAsThomasE(e.target.value)}>
                              <option value="Negativo">Negativo</option>
                              <option value="Positivo">Positivo</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          {asThomasD === 'Positivo' && (
                            <div style={{ flex: 1 }}>
                              <label>Iliopsoas D (°)</label>
                              <input type="number" className="form-control form-control-sm" placeholder="Graus" value={asThomasIliopsoasD} onChange={e => setAsThomasIliopsoasD(e.target.value)} />
                              <label style={{ marginTop: '4px' }}>Retofemoral D (°)</label>
                              <input type="number" className="form-control form-control-sm" placeholder="Graus" value={asThomasRetofemoralD} onChange={e => setAsThomasRetofemoralD(e.target.value)} />
                            </div>
                          )}
                          {asThomasE === 'Positivo' && (
                            <div style={{ flex: 1 }}>
                              <label>Iliopsoas E (°)</label>
                              <input type="number" className="form-control form-control-sm" placeholder="Graus" value={asThomasIliopsoasE} onChange={e => setAsThomasIliopsoasE(e.target.value)} />
                              <label style={{ marginTop: '4px' }}>Retofemoral E (°)</label>
                              <input type="number" className="form-control form-control-sm" placeholder="Graus" value={asThomasRetofemoralE} onChange={e => setAsThomasRetofemoralE(e.target.value)} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <h4 style={{ color: 'var(--color-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginTop: '20px', marginBottom: '16px' }}>Termografia & Testes Funcionais</h4>
                    
                    <div style={{ display: 'flex', gap: '16px', flexDirection: 'column', marginBottom: '20px' }}>
                      
                      {/* Termografia — Image Upload */}
                      <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: asTermografiaRealizou === 'sim' ? '12px' : '0px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Termografia</span>
                          <select className="select-custom" style={{ width: 'auto', margin: 0, height: '28px', padding: '0 8px', fontSize: '0.8rem' }} value={asTermografiaRealizou} onChange={e => setAsTermografiaRealizou(e.target.value)}>
                            <option value="nao">Não se Aplica</option>
                            <option value="sim">Realizado</option>
                          </select>
                        </div>
                        {asTermografiaRealizou === 'sim' && (
                          <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>Upload da Imagem Termográfica (PNG/JPG, máx 1.5 MB)</label>
                            <input
                              type="file"
                              accept="image/*"
                              className="form-control"
                              style={{ marginBottom: '8px' }}
                              onChange={handleAsTermoFileSelect}
                            />
                            {asTermografia && asTermografia.startsWith('data:') && (
                              <div style={{ textAlign: 'center', marginTop: '8px' }}>
                                <img src={asTermografia} alt="Termografia Preview" style={{ maxHeight: '200px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'block', margin: '0 auto 8px' }} />
                                <button type="button" className="btn btn-danger btn-sm" onClick={removeAsTermoImage}>
                                  <i className="fa-solid fa-trash"></i> Remover Imagem
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Y-Test — Structured numeric inputs */}
                      <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: asYTestRealizou === 'sim' ? '12px' : '0px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Y-Test (Equilíbrio)</span>
                          <select className="select-custom" style={{ width: 'auto', margin: 0, height: '28px', padding: '0 8px', fontSize: '0.8rem' }} value={asYTestRealizou} onChange={e => setAsYTestRealizou(e.target.value)}>
                            <option value="nao">Não se Aplica</option>
                            <option value="sim">Realizado</option>
                          </select>
                        </div>
                        {asYTestRealizou === 'sim' && (
                          <div>
                            <div className="resp-grid-1-1">
                              {/* Membro Direito */}
                              <div>
                                <h6 style={{ color: 'var(--color-secondary)', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 700 }}>Membro Direito</h6>
                                {([
                                  { label: 'Comprimento do Membro (cm)', val: asYLenD, set: setAsYLenD },
                                  { label: 'Alcance Anterior (cm)', val: asYAntD, set: setAsYAntD },
                                  { label: 'Alcance Posteromedial (cm)', val: asYPMD, set: setAsYPMD },
                                  { label: 'Alcance Posterolateral (cm)', val: asYPLD, set: setAsYPLD },
                                ] as const).map(({ label, val, set }) => (
                                  <div key={label} style={{ marginBottom: '6px' }}>
                                    <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: '2px' }}>{label}</label>
                                    <input type="number" className="form-control form-control-sm" value={val} onChange={e => (set as any)(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0" />
                                  </div>
                                ))}
                              </div>
                              {/* Membro Esquerdo */}
                              <div>
                                <h6 style={{ color: 'var(--color-secondary)', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 700 }}>Membro Esquerdo</h6>
                                {([
                                  { label: 'Comprimento do Membro (cm)', val: asYLenE, set: setAsYLenE },
                                  { label: 'Alcance Anterior (cm)', val: asYAntE, set: setAsYAntE },
                                  { label: 'Alcance Posteromedial (cm)', val: asYPME, set: setAsYPME },
                                  { label: 'Alcance Posterolateral (cm)', val: asYPLE, set: setAsYPLE },
                                ] as const).map(({ label, val, set }) => (
                                  <div key={label} style={{ marginBottom: '6px' }}>
                                    <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginBottom: '2px' }}>{label}</label>
                                    <input type="number" className="form-control form-control-sm" value={val} onChange={e => (set as any)(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0" />
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Composite Score results */}
                            {(() => {
                              const mD = Number(asYLenD) || 0;
                              const mE = Number(asYLenE) || 0;
                              if (mD <= 0 || mE <= 0) return (
                                <div style={{ marginTop: '10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                                  Insira o comprimento dos membros de ambos os lados para calcular as pontuações e assimetrias.
                                </div>
                              );
                              const antD = Number(asYAntD) || 0, antE = Number(asYAntE) || 0;
                              const pmD = Number(asYPMD) || 0, pmE = Number(asYPME) || 0;
                              const plD = Number(asYPLD) || 0, plE = Number(asYPLE) || 0;
                              const scoreD = ((antD + pmD + plD) / (3 * mD)) * 100;
                              const scoreE = ((antE + pmE + plE) / (3 * mE)) * 100;
                              const diffAnt = Math.abs(antD - antE);
                              const diffPM = Math.abs(pmD - pmE);
                              const diffPL = Math.abs(plD - plE);
                              const hasAsymmetry = diffAnt > 10 || diffPM > 10 || diffPL > 10;
                              const hasLowScore = scoreD < 94 || scoreE < 94;
                              return (
                                <div style={{ marginTop: '10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '6px', fontSize: '0.78rem' }}>
                                  {(hasAsymmetry || hasLowScore) ? (
                                    <div style={{ marginBottom: '8px' }}>
                                      {hasAsymmetry && <span style={{ display: 'inline-block', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', padding: '2px 8px', marginRight: '6px', marginBottom: '4px', fontSize: '0.72rem' }}>⚠ Assimetria significativa (&gt;10cm) — Risco de Lesão!</span>}
                                      {hasLowScore && <span style={{ display: 'inline-block', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', padding: '2px 8px', fontSize: '0.72rem' }}>⚠ Alto risco (Pontuação normalizada &lt;94%)</span>}
                                    </div>
                                  ) : (
                                    <div style={{ marginBottom: '8px' }}>
                                      <span style={{ display: 'inline-block', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid #10b981', borderRadius: '4px', padding: '2px 8px', fontSize: '0.72rem' }}>✓ Sem alertas de risco detectados</span>
                                    </div>
                                  )}
                                  <div className="resp-grid-1-1" style={{ gap: '8px' }}>
                                    <div><strong>Composite Score D:</strong> {scoreD.toFixed(1)}%</div>
                                    <div><strong>Composite Score E:</strong> {scoreE.toFixed(1)}%</div>
                                  </div>
                                  <div style={{ marginTop: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                    <div><strong>Dif. Anterior:</strong> {diffAnt.toFixed(1)} cm</div>
                                    <div><strong>Dif. Posteromedial:</strong> {diffPM.toFixed(1)} cm</div>
                                    <div><strong>Dif. Posterolateral:</strong> {diffPL.toFixed(1)} cm</div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Step Down — Structured numeric inputs */}
                      <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: asStepDownRealizou === 'sim' ? '12px' : '0px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Step Down</span>
                          <select className="select-custom" style={{ width: 'auto', margin: 0, height: '28px', padding: '0 8px', fontSize: '0.8rem' }} value={asStepDownRealizou} onChange={e => setAsStepDownRealizou(e.target.value)}>
                            <option value="nao">Não se Aplica</option>
                            <option value="sim">Realizado</option>
                          </select>
                        </div>
                        {asStepDownRealizou === 'sim' && (
                          <div>
                            <div className="resp-grid-1-1">
                              <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Queda Pélvica (Graus)</label>
                                <input type="number" className="form-control form-control-sm" style={{ marginTop: '4px' }} value={asSdPelvica} onChange={e => setAsSdPelvica(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ex: 4" />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Referência: normal até 5°</span>
                              </div>
                              <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Adução do Quadril (Graus)</label>
                                <input type="number" className="form-control form-control-sm" style={{ marginTop: '4px' }} value={asSdAducao} onChange={e => setAsSdAducao(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ex: 8" />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Referência: normal até 10°</span>
                              </div>
                              <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Valgo Dinâmico de Joelho (Graus)</label>
                                <input type="number" className="form-control form-control-sm" style={{ marginTop: '4px' }} value={asSdValgo} onChange={e => setAsSdValgo(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ex: 9" />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Ref.: Homem até 10°, Mulher até 15°</span>
                              </div>
                              <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Ângulo Excêntrico de Quadríceps / PRPS (Graus)</label>
                                <input type="number" className="form-control form-control-sm" style={{ marginTop: '4px' }} value={asSdPrps} onChange={e => setAsSdPrps(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ex: 65" />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Referência: normal acima de 60°</span>
                              </div>
                            </div>
                            {/* Risk alerts */}
                            {(() => {
                              const qPel = Number(asSdPelvica) || 0;
                              const adQ = Number(asSdAducao) || 0;
                              const valJo = Number(asSdValgo) || 0;
                              const compEx = Number(asSdPrps) || 0;
                              const valLimit = asSex === 'M' ? 10 : 15;
                              const risks: string[] = [];
                              if (qPel > 5) risks.push('Queda Pélvica elevada (>5°)');
                              if (adQ > 10) risks.push('Adução de Quadril elevada (>10°)');
                              if (valJo > valLimit) risks.push(`Valgo Dinâmico elevado (>${valLimit}° para ${asSex === 'M' ? 'Masculino' : 'Feminino'})`);
                              if (compEx > 0 && compEx < 60) risks.push('Componente Excêntrico reduzido ou PRPS positivo (<60°)');
                              return (
                                <div style={{ marginTop: '10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '6px', fontSize: '0.78rem' }}>
                                  {risks.length > 0 ? (
                                    <>
                                      <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: '4px' }}>⚠ Risco Elevado de Lesão detectado</div>
                                      <div style={{ color: 'var(--text-dim)' }}><strong>Fatores:</strong> {risks.join(', ')}.</div>
                                    </>
                                  ) : (
                                    <div style={{ color: '#10b981' }}>✓ Controle Dinâmico Adequado — métricas dentro das referências.</div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                    </div>
                    {/* ESTRELA MAIGNE */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: asMaigneRealizou === 'sim' ? '16px' : '0px' }}>
                        <h5 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--color-primary)' }}>
                          Estrela Maigne (Rosa dos Ventos Clínica de Dor)
                        </h5>
                        <select className="select-custom" style={{ width: 'auto', margin: 0, height: '28px', padding: '0 8px', fontSize: '0.8rem' }} value={asMaigneRealizou} onChange={e => setAsMaigneRealizou(e.target.value)}>
                          <option value="nao">Não se Aplica</option>
                          <option value="sim">Realizado</option>
                        </select>
                      </div>

                      {asMaigneRealizou === 'sim' && (
                        <>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: '#ffffff', borderRadius: '8px', padding: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '300px', height: '300px' }}>
                          <svg id="maigneSVG" width="280" height="221" viewBox="0 0 380 300">
                            {/* Grid Circles */}
                            {[10, 20, 30, 40, 50].map(val => (
                              <g key={val}>
                                <circle cx={190} cy={150} r={val * 2} className="maigne-circle" />
                                <text x={190} y={150 - (val * 2) + 4} style={{ fontSize: '7px', fill: '#94a3b8', textAnchor: 'middle', fontWeight: 'bold' }}>{val}</text>
                              </g>
                            ))}

                            {/* Grid Lines */}
                            {[-Math.PI / 2, -Math.PI / 6, Math.PI / 6, Math.PI / 2, 5 * Math.PI / 6, 7 * Math.PI / 6].map((ang, idx) => {
                              const x = 190 + 100 * Math.cos(ang);
                              const y = 150 + 100 * Math.sin(ang);
                              return <line key={idx} x1={190} y1={150} x2={x} y2={y} className="maigne-axis" />;
                            })}

                            {/* Labels for directions */}
                            <text x={190} y={150 - 100 - 10} style={{ fontSize: '9px', fill: '#0f172a', fontWeight: 'bold', textAnchor: 'middle' }}>Flexão (EVA: {asMaigneData.flexaoEVA})</text>
                            <text x={190 + 100 * Math.cos(-Math.PI / 6) + 15} y={150 + 100 * Math.sin(-Math.PI / 6) - 5} style={{ fontSize: '9px', fill: '#0f172a', fontWeight: 'bold', textAnchor: 'start' }}>Rot D (EVA: {asMaigneData.rotacaoDEVA})</text>
                            <text x={190 + 100 * Math.cos(Math.PI / 6) + 15} y={150 + 100 * Math.sin(Math.PI / 6) + 10} style={{ fontSize: '9px', fill: '#0f172a', fontWeight: 'bold', textAnchor: 'start' }}>Inc D (EVA: {asMaigneData.inclinacaoDEVA})</text>
                            <text x={190} y={150 + 100 + 18} style={{ fontSize: '9px', fill: '#0f172a', fontWeight: 'bold', textAnchor: 'middle' }}>Extensão (EVA: {asMaigneData.extensaoEVA})</text>
                            <text x={190 + 100 * Math.cos(5 * Math.PI / 6) - 15} y={150 + 100 * Math.sin(5 * Math.PI / 6) + 10} style={{ fontSize: '9px', fill: '#0f172a', fontWeight: 'bold', textAnchor: 'end' }}>Inc E (EVA: {asMaigneData.inclinacaoEEVA})</text>
                            <text x={190 + 100 * Math.cos(7 * Math.PI / 6) - 15} y={150 + 100 * Math.sin(7 * Math.PI / 6) - 5} style={{ fontSize: '9px', fill: '#0f172a', fontWeight: 'bold', textAnchor: 'end' }}>Rot E (EVA: {asMaigneData.rotacaoEEVA})</text>

                            {/* Reference Polygon */}
                            <polygon
                              points={[-Math.PI / 2, -Math.PI / 6, Math.PI / 6, Math.PI / 2, 5 * Math.PI / 6, 7 * Math.PI / 6].map((ang, idx) => {
                                const refVals = [40, 40, 30, 30, 30, 40];
                                const x = 190 + refVals[idx] * 2 * Math.cos(ang);
                                const y = 150 + refVals[idx] * 2 * Math.sin(ang);
                                return `${x},${y}`;
                              }).join(' ')}
                              className="maigne-ref-poly"
                            />

                            {/* Value Polygon */}
                            <polygon
                              points={[-Math.PI / 2, -Math.PI / 6, Math.PI / 6, Math.PI / 2, 5 * Math.PI / 6, 7 * Math.PI / 6].map((ang, idx) => {
                                const clientVals = [
                                  asMaigneData.flexao,
                                  asMaigneData.rotacaoD,
                                  asMaigneData.inclinacaoD,
                                  asMaigneData.extensao,
                                  asMaigneData.inclinacaoE,
                                  asMaigneData.rotacaoE
                                ];
                                const x = 190 + clientVals[idx] * 2 * Math.cos(ang);
                                const y = 150 + clientVals[idx] * 2 * Math.sin(ang);
                                return `${x},${y}`;
                              }).join(' ')}
                              className="maigne-val-poly"
                            />

                            {/* Value Dots/Nodes */}
                            {[-Math.PI / 2, -Math.PI / 6, Math.PI / 6, Math.PI / 2, 5 * Math.PI / 6, 7 * Math.PI / 6].map((ang, idx) => {
                              const clientVals = [
                                  asMaigneData.flexao,
                                  asMaigneData.rotacaoD,
                                  asMaigneData.inclinacaoD,
                                  asMaigneData.extensao,
                                  asMaigneData.inclinacaoE,
                                  asMaigneData.rotacaoE
                              ];
                              const x = 190 + clientVals[idx] * 2 * Math.cos(ang);
                              const y = 150 + clientVals[idx] * 2 * Math.sin(ang);
                              return (
                                <circle
                                  key={idx}
                                  cx={x}
                                  cy={y}
                                  r="4.5"
                                  className="maigne-node"
                                  onClick={() => handleMaigneNodeClick(idx)}
                                />
                              );
                            })}
                          </svg>
                        </div>

                        <div className="resp-grid-1-1" style={{ flex: 1, minWidth: '250px' }}>
                          {/* Flexão */}
                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                              Flexão (ADM): <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{asMaigneData.flexao}</span>/50
                            </label>
                            <input
                              type="range"
                              className="form-control"
                              min="0"
                              max="50"
                              value={asMaigneData.flexao}
                              onChange={e => updateMaigneField('flexao', Number(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                            />
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                              Flexão (Dor EVA): <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{asMaigneData.flexaoEVA}</span>/10
                            </label>
                            <input
                              type="range"
                              className="form-control"
                              min="0"
                              max="10"
                              value={asMaigneData.flexaoEVA}
                              onChange={e => updateMaigneField('flexaoEVA', Number(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--color-danger)' }}
                            />
                          </div>

                          {/* Extensão */}
                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                              Extensão (ADM): <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{asMaigneData.extensao}</span>/50
                            </label>
                            <input
                              type="range"
                              className="form-control"
                              min="0"
                              max="50"
                              value={asMaigneData.extensao}
                              onChange={e => updateMaigneField('extensao', Number(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                            />
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                              Extensão (Dor EVA): <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{asMaigneData.extensaoEVA}</span>/10
                            </label>
                            <input
                              type="range"
                              className="form-control"
                              min="0"
                              max="10"
                              value={asMaigneData.extensaoEVA}
                              onChange={e => updateMaigneField('extensaoEVA', Number(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--color-danger)' }}
                            />
                          </div>

                          {/* Inclinação D */}
                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                              Inclinação D (ADM): <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{asMaigneData.inclinacaoD}</span>/50
                            </label>
                            <input
                              type="range"
                              className="form-control"
                              min="0"
                              max="50"
                              value={asMaigneData.inclinacaoD}
                              onChange={e => updateMaigneField('inclinacaoD', Number(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                            />
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                              Inclinação D (Dor EVA): <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{asMaigneData.inclinacaoDEVA}</span>/10
                            </label>
                            <input
                              type="range"
                              className="form-control"
                              min="0"
                              max="10"
                              value={asMaigneData.inclinacaoDEVA}
                              onChange={e => updateMaigneField('inclinacaoDEVA', Number(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--color-danger)' }}
                            />
                          </div>

                          {/* Inclinação E */}
                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                              Inclinação E (ADM): <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{asMaigneData.inclinacaoE}</span>/50
                            </label>
                            <input
                              type="range"
                              className="form-control"
                              min="0"
                              max="50"
                              value={asMaigneData.inclinacaoE}
                              onChange={e => updateMaigneField('inclinacaoE', Number(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                            />
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                              Inclinação E (Dor EVA): <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{asMaigneData.inclinacaoEEVA}</span>/10
                            </label>
                            <input
                              type="range"
                              className="form-control"
                              min="0"
                              max="10"
                              value={asMaigneData.inclinacaoEEVA}
                              onChange={e => updateMaigneField('inclinacaoEEVA', Number(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--color-danger)' }}
                            />
                          </div>

                          {/* Rotação D */}
                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                              Rotação D (ADM): <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{asMaigneData.rotacaoD}</span>/50
                            </label>
                            <input
                              type="range"
                              className="form-control"
                              min="0"
                              max="50"
                              value={asMaigneData.rotacaoD}
                              onChange={e => updateMaigneField('rotacaoD', Number(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                            />
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                              Rotação D (Dor EVA): <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{asMaigneData.rotacaoDEVA}</span>/10
                            </label>
                            <input
                              type="range"
                              className="form-control"
                              min="0"
                              max="10"
                              value={asMaigneData.rotacaoDEVA}
                              onChange={e => updateMaigneField('rotacaoDEVA', Number(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--color-danger)' }}
                            />
                          </div>

                          {/* Rotação E */}
                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                              Rotação E (ADM): <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{asMaigneData.rotacaoE}</span>/50
                            </label>
                            <input
                              type="range"
                              className="form-control"
                              min="0"
                              max="50"
                              value={asMaigneData.rotacaoE}
                              onChange={e => updateMaigneField('rotacaoE', Number(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                            />
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                              Rotação E (Dor EVA): <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{asMaigneData.rotacaoEEVA}</span>/10
                            </label>
                            <input
                              type="range"
                              className="form-control"
                              min="0"
                              max="10"
                              value={asMaigneData.rotacaoEEVA}
                              onChange={e => updateMaigneField('rotacaoEEVA', Number(e.target.value))}
                              style={{ width: '100%', accentColor: 'var(--color-danger)' }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="form-group" style={{ marginTop: '16px' }}>
                        <label style={{ fontSize: '0.8rem' }}>Observações do Sinal de Maigne</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Positivo D..."
                          value={asMaigne}
                          onChange={e => setAsMaigne(e.target.value)}
                        />
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '8px', fontStyle: 'italic' }}>
                        * A rosa dos ventos reflete o nível de dor e limitação de movimento nas 6 direções. Você pode clicar diretamente nos pontos azuis no desenho para aumentar a amplitude (ADM) de 5 em 5.
                      </p>
                      </>
                      )}
                    </div>

                  </>
                )}

                {asStep === 6 && (
                  <>
                    <h4 style={{ color: 'var(--color-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '16px' }}>Resultados Finais, Postura & Observações</h4>
                    
                    <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                      <h5 style={{ color: 'var(--color-primary)', marginBottom: '8px' }}>Composição Corporal Calculada (Jackson-Pollock 7 dobras)</h5>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <div><strong>Gordura Corporal:</strong> <span style={{ color: 'var(--color-success)' }}>{asFat || '0'} %</span></div>
                        <div><strong>Massa Magra:</strong> <span style={{ color: 'var(--color-primary)' }}>{asMassaMagra || '0'} kg</span></div>
                        <div><strong>Massa Gorda:</strong> <span style={{ color: 'var(--text-dim)' }}>{asMassaGorda || '0'} kg</span></div>
                      </div>
                    </div>

                    {/* Foco e Metas do Planejamento */}
                    <div className="form-group">
                      <label>Objetivo Principal (ex: Perda de gordura e ganho de massa magra)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        style={asPrefilledFields['objetivoPrincipal'] ? { color: '#ef4444' } : {}} 
                        value={asObjetivoPrincipal} 
                        onChange={e => {
                          setAsObjetivoPrincipal(e.target.value);
                          setAsPrefilledFields(prev => { const c = { ...prev }; delete c['objetivoPrincipal']; return c; });
                        }} 
                        placeholder="Objetivos do aluno..." 
                        required 
                      />
                    </div>
                    <div className="form-row" style={{ marginBottom: '16px' }}>
                      <div className="form-group">
                        <label>Objetivo Curto Prazo (2 Meses)</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          style={asPrefilledFields['metas.objetivo2Meses'] ? { color: '#ef4444' } : {}} 
                          value={asMeta2Meses} 
                          onChange={e => {
                            setAsMeta2Meses(e.target.value);
                            setAsPrefilledFields(prev => { const c = { ...prev }; delete c['metas.objetivo2Meses']; return c; });
                          }} 
                          placeholder="Ex: Reduzir 2% de BF, melhorar dorsiflexão..." 
                        />
                      </div>
                      <div className="form-group">
                        <label>Objetivo Longo Prazo (1 Ano)</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          style={asPrefilledFields['metas.objetivo1Ano'] ? { color: '#ef4444' } : {}} 
                          value={asMeta1Ano} 
                          onChange={e => {
                            setAsMeta1Ano(e.target.value);
                            setAsPrefilledFields(prev => { const c = { ...prev }; delete c['metas.objetivo1Ano']; return c; });
                          }} 
                          placeholder="Ex: Hipertrofia de 5kg, manter simetria..." 
                        />
                      </div>
                    </div>
                    <div className="form-row" style={{ marginBottom: '16px' }}>
                      <div className="form-group">
                        <label>Meses para Adequação</label>
                        <select className="form-control" value={asObjetivoMeses} onChange={e => setAsObjetivoMeses(Number(e.target.value))}>
                          {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                            <option key={m} value={m}>{m} {m === 1 ? 'mês' : 'meses'}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ position: 'relative' }}>
                        <label>Foco do Planejamento</label>
                        <div 
                          className="form-control" 
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            cursor: 'pointer', 
                            background: 'var(--bg-input, #1e293b)', 
                            borderColor: 'var(--border-input, #475569)', 
                            color: 'var(--text-main, #f8fafc)',
                            minHeight: '38px',
                            padding: '6px 12px'
                          }}
                          onClick={() => setShowTipoObjetivoDropdown(!showTipoObjetivoDropdown)}
                        >
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {(() => {
                              const current = asTipoObjetivo.split(',').filter(Boolean);
                              if (current.length === 0) return 'Não especificado';
                              const labels = current.map(x => x === 'Emagrecimento' ? 'Emagrecimento / Perda de Gordura' : 'Ganho de Massa Magra');
                              return labels.join(', ');
                            })()}
                          </span>
                          <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.8rem', opacity: 0.7 }}></i>
                        </div>
                        
                        {showTipoObjetivoDropdown && (
                          <>
                            <div 
                              style={{ 
                                position: 'fixed', 
                                top: 0, 
                                left: 0, 
                                right: 0, 
                                bottom: 0, 
                                zIndex: 999 
                              }} 
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowTipoObjetivoDropdown(false);
                              }} 
                            />
                            <div 
                              style={{ 
                                position: 'absolute', 
                                top: '100%', 
                                left: 0, 
                                right: 0, 
                                background: 'var(--bg-card, #1e293b)', 
                                border: '1px solid var(--border-color, #475569)', 
                                borderRadius: '6px', 
                                padding: '8px 12px', 
                                zIndex: 1000, 
                                marginTop: '4px', 
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)' 
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: 'normal', color: 'var(--text-main, #f8fafc)', fontSize: '0.85rem' }}>
                                  <input 
                                    type="checkbox" 
                                    style={{ cursor: 'pointer' }}
                                    checked={asTipoObjetivo.split(',').includes('Emagrecimento')} 
                                    onChange={e => {
                                      let current = asTipoObjetivo.split(',').filter(Boolean);
                                      if (e.target.checked) {
                                        if (!current.includes('Emagrecimento')) current.push('Emagrecimento');
                                      } else {
                                        current = current.filter(x => x !== 'Emagrecimento');
                                      }
                                      setAsTipoObjetivo(current.join(','));
                                    }}
                                  />
                                  Emagrecimento / Perda de Gordura
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: 'normal', color: 'var(--text-main, #f8fafc)', fontSize: '0.85rem' }}>
                                  <input 
                                    type="checkbox" 
                                    style={{ cursor: 'pointer' }}
                                    checked={asTipoObjetivo.split(',').includes('Massa Magra')} 
                                    onChange={e => {
                                      let current = asTipoObjetivo.split(',').filter(Boolean);
                                      if (e.target.checked) {
                                        if (!current.includes('Massa Magra')) current.push('Massa Magra');
                                      } else {
                                        current = current.filter(x => x !== 'Massa Magra');
                                      }
                                      setAsTipoObjetivo(current.join(','));
                                    }}
                                  />
                                  Ganho de Massa Magra
                                </label>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="form-group">
                        <label>Nível de Experiência</label>
                        <select className="form-control" value={asNivelExperiencia} onChange={e => setAsNivelExperiencia(e.target.value)}>
                          <option value="Iniciante / Retorno">Iniciante / Retorno</option>
                          <option value="Iniciante a Intermediário">Iniciante a Intermediário</option>
                          <option value="Intermediário">Intermediário</option>
                          <option value="Avançado">Avançado</option>
                        </select>
                      </div>
                    </div>
                    {asTipoObjetivo && (
                      <div style={{ marginBottom: '16px' }}>
                        <div className="form-group">
                          <label>Frequência de Treino Semanal Pretendida</label>
                          <select className="form-control" value={asFreqSemanal} onChange={e => setAsFreqSemanal(Number(e.target.value))}>
                            <option value="2">2x por semana</option>
                            <option value="3">3x por semana</option>
                            <option value="4">4x por semana</option>
                            <option value="5">5x por semana</option>
                          </select>
                        </div>
                        {(() => {
                          const refs = getGoalReferenceInfo();
                          if (refs.length === 0) return null;
                          return (
                            <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid #10b981', borderRadius: '8px', padding: '12px 16px', marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 700, color: '#10b981' }}>
                                <i className="fa-solid fa-calculator"></i> Projeção Automática Baseada no Aluno
                              </div>
                              <p style={{ margin: '0 0 8px 0', borderBottom: '1px dashed rgba(16, 185, 129, 0.2)', paddingBottom: '6px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                                Aluno: <strong>{refs[0].labelSexo}</strong> | Nível: <strong>{refs[0].nivel}</strong> | Freq: <strong>{refs[0].freq}x/semana</strong> | Peso: <strong>{asWeight || '70'} kg</strong>
                              </p>
                              {refs.map((ref, idx) => (
                                <div key={ref.tipo} style={{ marginTop: idx > 0 ? '16px' : '0', borderTop: idx > 0 ? '1px dashed rgba(16, 185, 129, 0.2)' : 'none', paddingTop: idx > 0 ? '16px' : '0' }}>
                                  <div style={{ fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '6px' }}>
                                    Objetivo: <span style={{ color: '#10b981' }}>{ref.labelTipo}</span>
                                  </div>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                                    <thead>
                                      <tr style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderBottom: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                        <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 'bold' }}>Cenário</th>
                                        <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 'bold' }}>Semanal</th>
                                        <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 'bold' }}>Projeção ({ref.meses} {ref.meses === 1 ? 'mês' : 'meses'})</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <tr style={{ borderBottom: '1px solid rgba(16, 185, 129, 0.1)' }}>
                                        <td style={{ padding: '6px 10px', color: 'var(--text-dim)' }}>Conservador (50%)</td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '500' }}>{ref.weekly.conservador.replace('.', ',')} kg/sem</td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '600', color: 'var(--text-main)' }}>{ref.total.conservador.replace('.', ',')} kg</td>
                                      </tr>
                                      <tr style={{ borderBottom: '1px solid rgba(16, 185, 129, 0.1)', background: 'rgba(16, 185, 129, 0.03)' }}>
                                        <td style={{ padding: '6px 10px', fontWeight: 'bold', color: 'var(--text-main)' }}>Esperado (100%)</td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 'bold' }}>{ref.weekly.esperado.replace('.', ',')} kg/sem</td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>{ref.total.esperado.replace('.', ',')} kg</td>
                                      </tr>
                                      <tr>
                                        <td style={{ padding: '6px 10px', color: 'var(--text-dim)' }}>Excelente (120%)</td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '500' }}>{ref.weekly.excelente.replace('.', ',')} kg/sem</td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '600', color: 'var(--text-main)' }}>{ref.total.excelente.replace('.', ',')} kg</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    <div className="form-group">
                      <label>Avaliação Postural Visual</label>
                      <textarea className="form-control" placeholder="Ex: Escoliose leve torácica esquerda, anteriorização de pelve..." rows={2} value={asPostura} onChange={e => setAsPostura(e.target.value)} />
                    </div>
                    
                    <div className="form-group">
                      <label>Considerações Finais e Conduta do Avaliador</label>
                      <textarea className="form-control" placeholder="Observações gerais sobre a avaliação..." rows={4} value={asObs} onChange={e => setAsObs(e.target.value)} required />
                    </div>

                    {/* PDF Attachment Section */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', marginTop: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ background: 'rgba(13, 148, 136, 0.12)', padding: '8px', borderRadius: '8px' }}>
                          <i className="fa-solid fa-file-pdf" style={{ color: 'var(--color-primary)', fontSize: '1.1rem' }}></i>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>PDF Complementar da Avaliação</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            Anexe um PDF externo (imagens, laudo, etc.). Ele será incorporado integralmente ao PDF da avaliação ao baixar. Máx. 10 MB.
                          </div>
                        </div>
                      </div>

                      {!asPdfUrl ? (
                        <div>
                          <label
                            htmlFor="asPdfUploadInput"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '10px',
                              border: '2px dashed var(--border-color)',
                              borderRadius: '8px',
                              padding: '20px',
                              cursor: 'pointer',
                              color: 'var(--text-dim)',
                              fontSize: '0.85rem',
                              transition: 'border-color 0.2s, color 0.2s'
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--color-primary)'; (e.currentTarget as HTMLLabelElement).style.color = 'var(--color-primary)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = 'var(--border-color)'; (e.currentTarget as HTMLLabelElement).style.color = 'var(--text-dim)'; }}
                          >
                            <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '1.4rem' }}></i>
                            <span>Clique para selecionar um PDF ou arraste aqui</span>
                          </label>
                          <input
                            id="asPdfUploadInput"
                            type="file"
                            accept="application/pdf"
                            style={{ display: 'none' }}
                            onChange={handleAsPdfFileSelect}
                          />
                        </div>
                      ) : (
                        <div style={{ background: 'rgba(13, 148, 136, 0.08)', border: '1px solid var(--color-primary)', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <i className="fa-solid fa-file-pdf" style={{ color: '#ef4444', fontSize: '1.5rem' }}></i>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{asPdfAttachName || 'PDF anexado'}</div>
                              <div style={{ fontSize: '0.72rem', color: '#10b981' }}>✓ PDF pronto para ser incluído na avaliação</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={removeAsPdfAttach}
                            style={{ flexShrink: 0 }}
                          >
                            <i className="fa-solid fa-trash"></i> Remover
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseAssessment}>Cancelar</button>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {asStep > 1 && (
                    <button type="button" className="btn btn-secondary" onClick={() => setAsStep(asStep - 1)}>
                      <i className="fa-solid fa-chevron-left"></i> Voltar
                    </button>
                  )}
                  {asStep < 6 ? (
                    <button type="button" className="btn btn-primary" onClick={() => {
                      if (asStep === 1) {
                        if (draftOnOpen && draftOnOpen.asClient === asClient) {
                          loadAssessmentDraft(false, draftOnOpen);
                          setDraftOnOpen(null);
                        }
                      }
                      setAsStep(asStep + 1);
                    }}>
                      Avançar <i className="fa-solid fa-chevron-right"></i>
                    </button>
                  ) : (
                    <button type="submit" className="btn btn-success">
                      <i className="fa-solid fa-check"></i> Concluir Avaliação
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Physiotherapy Report Modal */}
      {showReportModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'var(--bg-main, #0f172a)', zIndex: 9999, overflowY: 'auto', display: 'block', padding: '24px 0' }}>
          <div className="modal-content" style={{ maxWidth: '1200px', width: '95%', margin: '0 auto', background: 'var(--bg-card, #1e293b)', minHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <h3 style={{ margin: 0 }}>Novo Relatório Fisioterápico</h3>
                <span style={{ padding: '4px 10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  ⏱️ Tempo: {formatTimer(repTimerSeconds)}
                </span>
              </div>
              <button className="modal-close" onClick={handleCloseReport}>&times;</button>
            </div>
            <form onSubmit={handleCreateReport}>
              <div className="modal-body" style={{ maxHeight: '74vh', overflowY: 'auto', padding: '20px' }}>
                


                {/* Wizard Progress Bar */}
                {true && (
                  <div className="physio-wizard-progress" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', position: 'relative', overflowX: 'auto', gap: '10px', paddingBottom: '8px' }}>
                    {[
                      { step: 1, label: 'Anamnese' },
                      { step: 2, label: 'Histórico & Hábitos' },
                      { step: 3, label: 'Goniometria & Ober' },
                      { step: 4, label: 'Perimetria' },
                      { step: 5, label: 'Termo & Exames' },
                      { step: 6, label: 'Testes Avançados' },
                      { step: 7, label: 'Conduta & Salvar' }
                    ].map(s => {
                      const isActive = repActiveStep === s.step;
                      const isCompleted = repActiveStep > s.step;
                      return (
                        <div
                          key={s.step}
                          onClick={() => {
                            if (!repClient) {
                              alert('Selecione o cliente no Passo 1 antes de navegar.');
                              return;
                            }
                            setRepActiveStep(s.step);
                          }}
                          style={{
                            flex: 1,
                            minWidth: '100px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            background: isActive ? 'var(--color-primary)' : isCompleted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)',
                            border: isActive ? '1px solid var(--color-primary)' : isCompleted ? '1px solid #10b981' : '1px solid var(--border-color)',
                            color: isActive ? '#ffffff' : isCompleted ? '#10b981' : 'var(--text-muted)',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{s.step}</div>
                          <div style={{ fontSize: '0.7rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{s.label}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* PASSO 1: IDENTIFICAÇÃO E ANAMNESE (Globais + Queixas) */}
                {repActiveStep === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="resp-grid-2-1" style={{ gap: '15px' }}>
                      <div className="form-group">
                        <label>Selecione o Cliente</label>
                        <SearchableSelect
                          options={clientOptions}
                          value={repClient}
                          onChange={setRepClient}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Data de Emissão</label>
                        <input type="date" className="form-control" value={repDate} onChange={e => setRepDate(e.target.value)} required />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Avaliador / Profissional</label>
                      <select className="form-control" value={repAvaliador} onChange={e => setRepAvaliador(e.target.value)} required>
                        <option value="">Selecione o Profissional</option>
                        {professionals.map((p: any) => (
                          <option key={p._id} value={p._id}>{p.nome}</option>
                        ))}
                      </select>
                    </div>

                    {/* Dados pessoais resumidos se cliente selecionado */}
                    {(() => {
                      const selCli = clients.find(c => c._id === repClient);
                      if (!selCli) return null;
                      const birthDate = selCli.dadosPessoais?.dataNascimento ? new Date(selCli.dadosPessoais.dataNascimento) : null;
                      let age = '-';
                      if (birthDate) {
                        const today = new Date();
                        age = (today.getFullYear() - birthDate.getFullYear()).toString();
                      }
                      return (
                        <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', padding: '12px 16px', borderRadius: '6px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '0.85rem' }}>
                          <div><strong>CPF:</strong> {selCli.dadosPessoais?.cpf || '-'}</div>
                          <div><strong>Idade:</strong> {age} anos</div>
                          <div><strong>Gênero:</strong> {selCli.dadosPessoais?.sexo?.trim().toUpperCase().startsWith('M') ? 'Masculino' : 'Feminino'}</div>
                          <div><strong>Profissão:</strong> {selCli.dadosPessoais?.profissao || '-'}</div>
                          <div><strong>Telefone:</strong> {selCli.dadosPessoais?.telefone || '-'}</div>
                        </div>
                      );
                    })()}

                    {repType === 'simplificado' ? (
                      <div className="form-group">
                        <label>Escala de Dor Geral (0 a 10)</label>
                        <input
                          type="range"
                          className="form-control"
                          min="0"
                          max="10"
                          value={repPain}
                          onChange={e => setRepPain(Number(e.target.value))}
                          style={{ width: '100%', accentColor: 'var(--color-danger)', height: '32px' }}
                        />
                        <div style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--color-danger)', fontSize: '0.9rem', marginTop: '4px' }}>
                          Intensidade: {repPain}/10
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4 style={{ margin: '16px 0 8px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                          <i className="fa-solid fa-comments" style={{ marginRight: '8px', color: 'var(--color-primary)' }}></i>
                          Anamnese e Queixas (Múltiplas)
                        </h4>
                        
                        {repQueixas.map((q, idx) => (
                          <div key={idx} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px', marginBottom: '12px', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <strong style={{ color: 'var(--color-primary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                                {idx === 0 ? 'Queixa Principal' : `Queixa Secundária #${idx}`}
                              </strong>
                              {idx > 0 && (
                                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeQueixa(idx)} style={{ padding: '3px 8px', fontSize: '0.75rem' }}>
                                  <i className="fa-solid fa-trash" style={{ marginRight: '4px' }}></i> Remover
                                </button>
                              )}
                            </div>
                            
                            <div className="resp-grid-1-1-1" style={{ marginBottom: '10px' }}>
                              <div className="form-group">
                                <label style={{ fontSize: '0.75rem' }}>Onde é a dor?</label>
                                <input type="text" className="form-control form-control-sm" value={q.dorOnde} onChange={e => updateQueixa(idx, 'dorOnde', e.target.value)} placeholder="Ex: Joelho lateral esquerdo..." required />
                              </div>
                              <div className="form-group">
                                <label style={{ fontSize: '0.75rem' }}>Quando começou a sentir?</label>
                                <input type="text" className="form-control form-control-sm" value={q.quandoComecou} onChange={e => updateQueixa(idx, 'quandoComecou', e.target.value)} placeholder="Ex: Há 3 semanas..." />
                              </div>
                              <div className="form-group">
                                <label style={{ fontSize: '0.75rem' }}>Como iniciou?</label>
                                <input type="text" className="form-control form-control-sm" value={q.comoIniciou} onChange={e => updateQueixa(idx, 'comoIniciou', e.target.value)} placeholder="Ex: Durante agachamento..." />
                              </div>
                            </div>

                            <div className="resp-grid-1-1" style={{ marginBottom: '10px' }}>
                              <div className="form-group">
                                <label style={{ fontSize: '0.75rem' }}>Evolução da Dor</label>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                                  <label style={{ fontSize: '0.8rem', cursor: 'pointer' }}><input type="radio" checked={q.dorEvolucao === 'estavel'} onChange={() => updateQueixa(idx, 'dorEvolucao', 'estavel')} /> Sente a mesma dor</label>
                                  <label style={{ fontSize: '0.8rem', cursor: 'pointer' }}><input type="radio" checked={q.dorEvolucao === 'aumentando'} onChange={() => updateQueixa(idx, 'dorEvolucao', 'aumentando')} /> Foi aumentando</label>
                                  <label style={{ fontSize: '0.8rem', cursor: 'pointer' }}><input type="radio" checked={q.dorEvolucao === 'diminuindo'} onChange={() => updateQueixa(idx, 'dorEvolucao', 'diminuindo')} /> Foi diminuindo</label>
                                </div>
                              </div>
                              <div className="form-group">
                                <label style={{ fontSize: '0.75rem' }}>Intensidade da Dor (EVA: <strong>{q.dorIntensidade}</strong>/10)</label>
                                <input type="range" className="form-control" min="0" max="10" value={q.dorIntensidade} onChange={e => updateQueixa(idx, 'dorIntensidade', Number(e.target.value))} style={{ accentColor: 'var(--color-danger)' }} />
                              </div>
                            </div>

                            <div className="resp-grid-1-1-1" style={{ marginBottom: '10px' }}>
                              <div className="form-group">
                                <label style={{ fontSize: '0.75rem' }}>Sente essa dor a todo momento?</label>
                                <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                                  <label style={{ fontSize: '0.8rem', cursor: 'pointer' }}><input type="radio" checked={q.dorTodoMomento === 'sim'} onChange={() => updateQueixa(idx, 'dorTodoMomento', 'sim')} /> Sim</label>
                                  <label style={{ fontSize: '0.8rem', cursor: 'pointer' }}><input type="radio" checked={q.dorTodoMomento === 'nao'} onChange={() => updateQueixa(idx, 'dorTodoMomento', 'nao')} /> Não</label>
                                </div>
                              </div>
                              <div className="form-group">
                                <label style={{ fontSize: '0.75rem' }}>O que piora?</label>
                                <input type="text" className="form-control form-control-sm" value={q.desencadeiaPiora || ''} onChange={e => updateQueixa(idx, 'desencadeiaPiora', e.target.value)} placeholder="Ex: Ficar de pé prolongado..." />
                              </div>
                              <div className="form-group">
                                <label style={{ fontSize: '0.75rem' }}>O que melhora?</label>
                                <input type="text" className="form-control form-control-sm" value={q.melhoraDesaparece || ''} onChange={e => updateQueixa(idx, 'melhoraDesaparece', e.target.value)} placeholder="Ex: Repouso..." />
                              </div>
                            </div>

                            <div className="resp-grid-1-2">
                              <div className="form-group">
                                <label style={{ fontSize: '0.75rem' }}>Característica da Dor</label>
                                <select className="form-control form-control-sm" value={q.caracteristicaDor || 'Pontual / Aguda'} onChange={e => updateQueixa(idx, 'caracteristicaDor', e.target.value)}>
                                  <option value="Queimação">Queimação</option>
                                  <option value="Elétrica / Choque">Elétrica / Choque</option>
                                  <option value="Pontual / Aguda">Pontual / Aguda</option>
                                  <option value="Difusa / Surda">Difusa / Surda</option>
                                  <option value="Latejante">Latejante</option>
                                  <option value="Outra">Outra</option>
                                </select>
                              </div>
                              <div className="form-group">
                                <label style={{ fontSize: '0.75rem' }}>Origem Estimada da Dor</label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
                                  {['Discal', 'Ligamentar', 'Muscular', 'Nervoso', 'Facetário', 'Visceral'].map(orig => {
                                    const hasOrig = (q.origens || []).includes(orig);
                                    return (
                                      <label key={orig} style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                        <input
                                          type="checkbox"
                                          checked={hasOrig}
                                          onChange={e => {
                                            const current = q.origens || [];
                                            const updated = e.target.checked
                                              ? [...current, orig]
                                              : current.filter((o: string) => o !== orig);
                                            updateQueixa(idx, 'origens', updated);
                                          }}
                                        />
                                        {orig}
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        <div style={{ textAlign: 'right' }}>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={addQueixa}>
                            <i className="fa-solid fa-plus" style={{ marginRight: '4px' }}></i> Adicionar Outra Queixa
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* PASSO 2: HISTÓRICO CLÍNICO E HÁBITOS DE VIDA */}
                {repActiveStep === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>Histórico Clínico</h4>
                    <div className="form-group">
                      <label>Traumas Pregressos</label>
                      <textarea className="form-control" rows={2} value={repTraumas} onChange={e => setRepTraumas(e.target.value)} placeholder="Possíveis lesões primárias / urgências osteopáticas..." />
                    </div>

                    <div className="form-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Realizou cirurgias?</label>
                        <select className="form-control" value={repCirurgiasRealizou} onChange={e => setRepCirurgiasRealizou(e.target.value)}>
                          <option value="nao">Não</option>
                          <option value="sim">Sim</option>
                        </select>
                      </div>
                      <div className="form-group" style={{ flex: 2 }}>
                        <label>Doenças pregressas e atuais</label>
                        <input type="text" className="form-control" value={repDoencas} onChange={e => setRepDoencas(e.target.value)} placeholder="Ex: Diabetes, labirintite, hipertensão..." />
                      </div>
                    </div>

                    {repCirurgiasRealizou === 'sim' && (
                      <div style={{ border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '6px', marginBottom: '10px' }}>
                        <strong style={{ fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>Detalhamento das Cirurgias</strong>
                        {repCirurgiasList.map((c, sIdx) => (
                          <div key={sIdx} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                            <input type="date" className="form-control form-control-sm" style={{ width: '130px' }} value={c.data} onChange={e => updateCirurgia(sIdx, 'data', e.target.value)} />
                            <input type="text" className="form-control form-control-sm" value={c.local} onChange={e => updateCirurgia(sIdx, 'local', e.target.value)} placeholder="Ex: Cirurgia no menisco joelho esquerdo..." />
                            <button type="button" className="btn btn-danger btn-sm" onClick={() => removeCirurgia(sIdx)} style={{ height: '32px' }}><i className="fa-solid fa-trash"></i></button>
                          </div>
                        ))}
                        <button type="button" className="btn btn-secondary btn-sm" onClick={addCirurgia} style={{ marginTop: '4px' }}>
                          <i className="fa-solid fa-plus" style={{ marginRight: '4px' }}></i> Adicionar Cirurgia
                        </button>
                      </div>
                    )}

                    <div className="resp-grid-1-1">
                      <div className="form-group">
                        <label>Traumas emocionais / Estresse crônico</label>
                        <input type="text" className="form-control" value={repTraumasEmo} onChange={e => setRepTraumasEmo(e.target.value)} placeholder="Estresse severo, perdas, efeito sobre SNV..." />
                      </div>
                      <div className="form-group">
                        <label>Medicação em uso</label>
                        <input type="text" className="form-control" value={repMedicao} onChange={e => setRepMedicao(e.target.value)} placeholder="Remédios que alteram SNV, dor ou inflamação..." />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Uso de drogas recreativas / álcool / tabaco</label>
                      <input type="text" className="form-control" value={repDrogas} onChange={e => setRepDrogas(e.target.value)} placeholder="Frequência e substâncias..." />
                    </div>

                    <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginTop: '16px' }}>Hábitos de Vida & Estilo de Vida</h4>
                    <div className="resp-grid-1-1-1">
                      <div className="form-group">
                        <label>Horas sono / noite</label>
                        <input type="number" className="form-control" min={0} max={24} value={repSonoHoras} onChange={e => setRepSonoHoras(Number(e.target.value))} />
                      </div>
                      <div className="form-group">
                        <label>Tipo de sono</label>
                        <select className="form-control" value={repSonoTipo} onChange={e => setRepSonoTipo(e.target.value)}>
                          <option value="continuo">Contínuo</option>
                          <option value="acorda">Acorda à noite (intermitente)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Qualidade do Sono</label>
                        <select className="form-control" value={repSonoQualidade} onChange={e => setRepSonoQualidade(e.target.value)}>
                          <option value="Excelente">Excelente</option>
                          <option value="Bom">Bom</option>
                          <option value="Regular">Regular</option>
                          <option value="Ruim">Ruim</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Alimentação (Influência sobre inflamação/dor)</label>
                      <input type="text" className="form-control" value={repAlimentacaoDor} onChange={e => setRepAlimentacaoDor(e.target.value)} placeholder="Hábitos, jejum, café, açúcar, queixas intestinais..." />
                    </div>

                    <div className="form-row">
                      <div className="form-group" style={{ flex: 1 }}>
                        <label>Faz atividade física?</label>
                        <select className="form-control" value={repAtividadeFisica} onChange={e => setRepAtividadeFisica(e.target.value)}>
                          <option value="nao">Não</option>
                          <option value="sim">Sim</option>
                        </select>
                      </div>
                      {repAtividadeFisica === 'sim' && (
                        <>
                          <div className="form-group" style={{ flex: 2 }}>
                            <label>Qual atividade e freq.?</label>
                            <input type="text" className="form-control" value={repAtividadeFisicaQual} onChange={e => setRepAtividadeFisicaQual(e.target.value)} placeholder="Ex: Musculação 3x/sem..." />
                          </div>
                          <div className="form-group" style={{ flex: 2 }}>
                            <label>Interfere na dor?</label>
                            <input type="text" className="form-control" value={repAtividadeFisicaInterfere} onChange={e => setRepAtividadeFisicaInterfere(e.target.value)} placeholder="Ex: Dor diminui no aquecimento..." />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="resp-grid-1-2">
                      <div className="form-group">
                        <label>Geral Estresse (EVA: <strong>{repStress}</strong>/10)</label>
                        <input type="range" className="form-control" min={0} max={10} value={repStress} onChange={e => setRepStress(Number(e.target.value))} style={{ accentColor: 'var(--color-primary)' }} />
                      </div>
                      <div className="form-group">
                        <label>Mecanismo de controle do estresse</label>
                        <input type="text" className="form-control" value={repControleStress} onChange={e => setRepControleStress(e.target.value)} placeholder="Ex: Meditação, corrida, leitura, lazer..." />
                      </div>
                    </div>
                  </div>
                )}

                {/* PASSO 3: GONIOMETRIA E TESTES DE ENCURTAMENTO */}
                {repActiveStep === 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0 }}>Goniometria & Mobilidade Articular</h4>
                    </div>
                    {(() => {
                      const latest = getLatestRepAssessment();
                      if (!latest) return null;
                      return (
                        <div style={{ background: 'rgba(13,148,136,0.07)', border: '1px solid var(--color-primary)', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                            <i className="fa-solid fa-file-medical" style={{ color: 'var(--color-primary)' }}></i>
                            <span>Avaliação Física disponível: <strong>{fmtDateBR(latest.data)}</strong></span>
                          </div>
                          <button type="button" className="btn btn-sm" style={{ background: 'var(--color-primary)', color: '#fff', padding: '4px 12px', fontSize: '0.78rem' }} onClick={() => importFromPhysAssessment(['goniometria'])}>
                            <i className="fa-solid fa-download" style={{ marginRight: '5px' }}></i>Importar Goniometria
                          </button>
                        </div>
                      );
                    })()}

                    <div className="table-responsive" style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                      <table className="data-table" style={{ margin: 0, fontSize: '0.8rem' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10 }}>
                          <tr>
                            <th rowSpan={2} style={{ verticalAlign: 'middle' }}>Movimento (Ref)</th>
                            <th colSpan={2} style={{ textAlign: 'center', background: 'rgba(13,148,136,0.06)' }}>Direito</th>
                            <th colSpan={2} style={{ textAlign: 'center', background: 'rgba(99,102,241,0.06)' }}>Esquerdo</th>
                          </tr>
                          <tr>
                            <th style={{ textAlign: 'center', fontSize: '9px', background: 'rgba(13,148,136,0.04)' }}>1</th>
                            <th style={{ textAlign: 'center', fontSize: '9px', background: 'rgba(13,148,136,0.08)' }}>2</th>
                            <th style={{ textAlign: 'center', fontSize: '9px', background: 'rgba(99,102,241,0.04)' }}>1</th>
                            <th style={{ textAlign: 'center', fontSize: '9px', background: 'rgba(99,102,241,0.08)' }}>2</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { label: 'Quadril - Flexão J. Fletido', ref: '70-80°', keyD: 'quadrilFlexao1D', keyE: 'quadrilFlexao1E' },
                            { label: 'Quadril - Flexão J. Estendido', ref: '100-125°', keyD: 'quadrilFlexao2D', keyE: 'quadrilFlexao2E' },
                            { label: 'Quadril - Rotação Interna', ref: '40-45°', keyD: 'quadrilRotIntD', keyE: 'quadrilRotIntE' },
                            { label: 'Quadril - Rotação Externa', ref: '40-45°', keyD: 'quadrilRotExtD', keyE: 'quadrilRotExtE' },
                            { label: 'Joelho - Flexão', ref: '135-150°', keyD: 'joelhoFlexaoD', keyE: 'joelhoFlexaoE' },
                            { label: 'Joelho - Ângulo Poplíteo', ref: '155-160°', keyD: 'joelhoPopliteoD', keyE: 'joelhoPopliteoE' },
                            { label: 'Tornozelo - Dorsi 1', ref: '35-45°', keyD: 'tornozeloDorsi1D', keyE: 'tornozeloDorsi1E' },
                            { label: 'Tornozelo - Dorsi 2', ref: '20°', keyD: 'tornozeloDorsi2D', keyE: 'tornozeloDorsi2E' },
                            { label: 'Tornozelo - Flexão Plantar', ref: '40-50°', keyD: 'tornozeloFlexaoPlantarD', keyE: 'tornozeloFlexaoPlantarE' },
                            { label: 'Ombro - Rotação Interna', ref: '80-90°', keyD: 'ombroRotIntD', keyE: 'ombroRotIntE' },
                            { label: 'Ombro - Rotação Externa', ref: '80-100°', keyD: 'ombroRotExtD', keyE: 'ombroRotExtE' },
                            { label: 'Ombro - Flexão', ref: '180°', keyD: 'ombroFlexaoD', keyE: 'ombroFlexaoE' }
                          ].map(row => {
                            const valD = gGonio[row.keyD] || { semForca: '', comForca: '' };
                            const valE = gGonio[row.keyE] || { semForca: '', comForca: '' };

                            const updateField = (key: string, side: 'semForca' | 'comForca', value: string) => {
                              setGGonio(prev => {
                                const currentObj = prev[key] || { semForca: '', comForca: '' };
                                const numVal = value === '' ? '' : Number(value);
                                return { ...prev, [key]: { ...currentObj, [side]: numVal } };
                              });
                            };

                            return (
                              <tr key={row.keyD}>
                                <td>
                                  <strong>{row.label}</strong> <br/>
                                  <small style={{ color: 'var(--text-dim)' }}>Ref: {row.ref}</small>
                                </td>
                                {/* Direito */}
                                <td style={{ background: 'rgba(13,148,136,0.02)' }}>
                                  <input
                                    type="number"
                                    placeholder="1"
                                    className="form-control form-control-sm"
                                    style={{ textAlign: 'center', height: '24px' }}
                                    value={valD.semForca}
                                    onChange={e => updateField(row.keyD, 'semForca', e.target.value)}
                                  />
                                </td>
                                <td style={{ background: 'rgba(13,148,136,0.05)' }}>
                                  <input
                                    type="number"
                                    placeholder="2"
                                    className="form-control form-control-sm"
                                    style={{ textAlign: 'center', height: '24px' }}
                                    value={valD.comForca}
                                    onChange={e => updateField(row.keyD, 'comForca', e.target.value)}
                                  />
                                </td>
                                {/* Esquerdo */}
                                <td style={{ background: 'rgba(99,102,241,0.02)' }}>
                                  <input
                                    type="number"
                                    placeholder="1"
                                    className="form-control form-control-sm"
                                    style={{ textAlign: 'center', height: '24px' }}
                                    value={valE.semForca}
                                    onChange={e => updateField(row.keyE, 'semForca', e.target.value)}
                                  />
                                </td>
                                <td style={{ background: 'rgba(99,102,241,0.05)' }}>
                                  <input
                                    type="number"
                                    placeholder="2"
                                    className="form-control form-control-sm"
                                    style={{ textAlign: 'center', height: '24px' }}
                                    value={valE.comForca}
                                    onChange={e => updateField(row.keyE, 'comForca', e.target.value)}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginTop: '10px' }}>Testes Clínicos Especiais de Encurtamento</h4>
                    {(() => {
                      const latest = getLatestRepAssessment();
                      if (!latest?.dadosMedidos?.testesEspeciais) return null;
                      return (
                        <div style={{ background: 'rgba(13,148,136,0.07)', border: '1px solid var(--color-primary)', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                            <i className="fa-solid fa-file-medical" style={{ color: 'var(--color-primary)' }}></i>
                            <span>Avaliação Física: <strong>{fmtDateBR(latest.data)}</strong> — Testes de Ober e Thomas disponíveis</span>
                          </div>
                          <button type="button" className="btn btn-sm" style={{ background: 'var(--color-primary)', color: '#fff', padding: '4px 12px', fontSize: '0.78rem' }} onClick={() => importFromPhysAssessment(['testes'])}>
                            <i className="fa-solid fa-download" style={{ marginRight: '5px' }}></i>Importar Testes
                          </button>
                        </div>
                      );
                    })()}
                    <div className="resp-grid-1-1">
                      <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '6px' }}>
                        <strong style={{ fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>Teste de Ober (Banda Iliotibial)</strong>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Direito:</span>
                            <select className="form-control form-control-sm" value={tOberD} onChange={e => setTOberD(e.target.value)}>
                              <option value="Negativo">Negativo</option>
                              <option value="Positivo">Positivo</option>
                            </select>
                          </div>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Esquerdo:</span>
                            <select className="form-control form-control-sm" value={tOberE} onChange={e => setTOberE(e.target.value)}>
                              <option value="Negativo">Negativo</option>
                              <option value="Positivo">Positivo</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '6px' }}>
                        <strong style={{ fontSize: '0.85rem', display: 'block', marginBottom: '8px' }}>Teste de Thomas (Flexores de Quadril)</strong>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Direito:</span>
                            <select className="form-control form-control-sm" value={tThomasD} onChange={e => setTThomasD(e.target.value)}>
                              <option value="Negativo">Negativo</option>
                              <option value="Positivo">Positivo</option>
                            </select>
                          </div>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Esquerdo:</span>
                            <select className="form-control form-control-sm" value={tThomasE} onChange={e => setTThomasE(e.target.value)}>
                              <option value="Negativo">Negativo</option>
                              <option value="Positivo">Positivo</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {(tThomasD === 'Positivo' || tThomasE === 'Positivo') && (
                      <div className="resp-grid-1-1" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '6px' }}>
                        {tThomasD === 'Positivo' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                            <div className="form-group">
                              <label style={{ fontSize: '0.75rem' }}>Iliopsoas D (°)</label>
                              <input type="number" className="form-control form-control-sm" placeholder="Graus" value={tThomasIliopsoasD} onChange={e => setTThomasIliopsoasD(e.target.value)} />
                            </div>
                            <div className="form-group">
                              <label style={{ fontSize: '0.75rem' }}>Retofemoral D (°)</label>
                              <input type="number" className="form-control form-control-sm" placeholder="Graus" value={tThomasRetofemoralD} onChange={e => setTThomasRetofemoralD(e.target.value)} />
                            </div>
                          </div>
                        )}
                        {tThomasE === 'Positivo' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                            <div className="form-group">
                              <label style={{ fontSize: '0.75rem' }}>Iliopsoas E (°)</label>
                              <input type="number" className="form-control form-control-sm" placeholder="Graus" value={tThomasIliopsoasE} onChange={e => setTThomasIliopsoasE(e.target.value)} />
                            </div>
                            <div className="form-group">
                              <label style={{ fontSize: '0.75rem' }}>Retofemoral E (°)</label>
                              <input type="number" className="form-control form-control-sm" placeholder="Graus" value={tThomasRetofemoralE} onChange={e => setTThomasRetofemoralE(e.target.value)} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* PASSO 4: TERMOGRAFIA E EXAMES COMPLEMENTARES */}
                {repActiveStep === 4 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', margin: 0 }}>Perimetria (Circunferências em cm)</h4>

                        {(() => {
                          const latest = getLatestRepAssessment();
                          if (!latest?.dadosMedidos?.circunferencias) return null;
                          return (
                            <div style={{ background: 'rgba(13,148,136,0.07)', border: '1px solid var(--color-primary)', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                                <i className="fa-solid fa-file-medical" style={{ color: 'var(--color-primary)' }}></i>
                                <span>Avaliação Física: <strong>{fmtDateBR(latest.data)}</strong> — Perimetria disponível</span>
                              </div>
                              <button type="button" className="btn btn-sm" style={{ background: 'var(--color-primary)', color: '#fff', padding: '4px 12px', fontSize: '0.78rem' }} onClick={() => importFromPhysAssessment(['perimetria'])}>
                                <i className="fa-solid fa-download" style={{ marginRight: '5px' }}></i>Importar Perimetria
                              </button>
                            </div>
                          );
                        })()}

                        <div className="resp-grid-1-1">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div className="form-group">
                              <label style={{ fontSize: '0.75rem' }}>Pescoço</label>
                              <input type="number" step="0.1" className="form-control" value={repCirc.pescoco} onChange={e => setRepCirc(prev => ({ ...prev, pescoco: e.target.value === '' ? '' : Number(e.target.value) }))} />
                            </div>
                            <div className="form-group">
                              <label style={{ fontSize: '0.75rem' }}>Ombros</label>
                              <input type="number" step="0.1" className="form-control" value={repCirc.ombros} onChange={e => setRepCirc(prev => ({ ...prev, ombros: e.target.value === '' ? '' : Number(e.target.value) }))} />
                            </div>
                            <div className="form-group">
                              <label style={{ fontSize: '0.75rem' }}>Tórax</label>
                              <input type="number" step="0.1" className="form-control" value={repCirc.torax} onChange={e => setRepCirc(prev => ({ ...prev, torax: e.target.value === '' ? '' : Number(e.target.value) }))} />
                            </div>
                            <div className="form-group">
                              <label style={{ fontSize: '0.75rem' }}>Cintura</label>
                              <input type="number" step="0.1" className="form-control" value={repCirc.cintura} onChange={e => setRepCirc(prev => ({ ...prev, cintura: e.target.value === '' ? '' : Number(e.target.value) }))} />
                            </div>
                            <div className="form-group">
                              <label style={{ fontSize: '0.75rem' }}>Abdômen</label>
                              <input type="number" step="0.1" className="form-control" value={repCirc.abdomen} onChange={e => setRepCirc(prev => ({ ...prev, abdomen: e.target.value === '' ? '' : Number(e.target.value) }))} />
                            </div>
                            <div className="form-group">
                              <label style={{ fontSize: '0.75rem' }}>Quadril</label>
                              <input type="number" step="0.1" className="form-control" value={repCirc.quadril} onChange={e => setRepCirc(prev => ({ ...prev, quadril: e.target.value === '' ? '' : Number(e.target.value) }))} />
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <div className="form-group" style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.75rem' }}>Braço Direito</label>
                                <input type="number" step="0.1" className="form-control" value={repCirc.braçoD} onChange={e => setRepCirc(prev => ({ ...prev, braçoD: e.target.value === '' ? '' : Number(e.target.value) }))} />
                              </div>
                              <div className="form-group" style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.75rem' }}>Braço Esquerdo</label>
                                <input type="number" step="0.1" className="form-control" value={repCirc.braçoE} onChange={e => setRepCirc(prev => ({ ...prev, braçoE: e.target.value === '' ? '' : Number(e.target.value) }))} />
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <div className="form-group" style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.75rem' }}>Antebraço Direito</label>
                                <input type="number" step="0.1" className="form-control" value={repCirc.antebraçoD} onChange={e => setRepCirc(prev => ({ ...prev, antebraçoD: e.target.value === '' ? '' : Number(e.target.value) }))} />
                              </div>
                              <div className="form-group" style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.75rem' }}>Antebraço Esquerdo</label>
                                <input type="number" step="0.1" className="form-control" value={repCirc.antebraçoE} onChange={e => setRepCirc(prev => ({ ...prev, antebraçoE: e.target.value === '' ? '' : Number(e.target.value) }))} />
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <div className="form-group" style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.75rem' }}>Coxa Direito</label>
                                <input type="number" step="0.1" className="form-control" value={repCirc.coxaD} onChange={e => setRepCirc(prev => ({ ...prev, coxaD: e.target.value === '' ? '' : Number(e.target.value) }))} />
                              </div>
                              <div className="form-group" style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.75rem' }}>Coxa Esquerdo</label>
                                <input type="number" step="0.1" className="form-control" value={repCirc.coxaE} onChange={e => setRepCirc(prev => ({ ...prev, coxaE: e.target.value === '' ? '' : Number(e.target.value) }))} />
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <div className="form-group" style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.75rem' }}>Panturrilha Direita</label>
                                <input type="number" step="0.1" className="form-control" value={repCirc.panturrilhaD} onChange={e => setRepCirc(prev => ({ ...prev, panturrilhaD: e.target.value === '' ? '' : Number(e.target.value) }))} />
                              </div>
                              <div className="form-group" style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.75rem' }}>Panturrilha Esquerdo</label>
                                <input type="number" step="0.1" className="form-control" value={repCirc.panturrilhaE} onChange={e => setRepCirc(prev => ({ ...prev, panturrilhaE: e.target.value === '' ? '' : Number(e.target.value) }))} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                {repActiveStep === 5 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>Termografia Clínica</h4>
                    {(() => {
                      const latest = getLatestRepAssessment();
                      if (!latest?.dadosMedidos?.testesEspeciais?.termografia) return null;
                      return (
                        <div style={{ background: 'rgba(13,148,136,0.07)', border: '1px solid var(--color-primary)', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                            <i className="fa-solid fa-file-medical" style={{ color: 'var(--color-primary)' }}></i>
                            <span>Avaliação Física: <strong>{fmtDateBR(latest.data)}</strong> — Termografia disponível</span>
                          </div>
                          <button type="button" className="btn btn-sm" style={{ background: 'var(--color-primary)', color: '#fff', padding: '4px 12px', fontSize: '0.78rem' }} onClick={() => importFromPhysAssessment(['termografia'])}>
                            <i className="fa-solid fa-download" style={{ marginRight: '5px' }}></i>Importar Termografia
                          </button>
                        </div>
                      );
                    })()}
                    <div className="resp-grid-1-2">
                      <div className="form-group">
                        <label>Realizou Termografia?</label>
                        <select className="form-control" value={repTermografiaRealizou} onChange={e => setRepTermografiaRealizou(e.target.value)}>
                          <option value="nao">Não Realizou</option>
                          <option value="sim">Realizou</option>
                        </select>
                      </div>
                      {repTermografiaRealizou === 'sim' && (
                        <div className="form-group">
                          <label>Upload da Imagem Termográfica (PNG/JPG)</label>
                          <input type="file" accept="image/*" className="form-control" onChange={handleTermoFileSelect} />
                          <small style={{ color: 'var(--text-muted)' }}>Escolha um arquivo leve de até 800 KB.</small>
                        </div>
                      )}
                    </div>

                    {repTermografiaRealizou === 'sim' && repTermografiaImgB64 && (
                      <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                        <img src={repTermografiaImgB64} alt="Termografia Preview" style={{ maxHeight: '200px', display: 'block', margin: '0 auto 8px', borderRadius: '4px' }} />
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => setRepTermografiaImgB64('')}>
                          <i className="fa-solid fa-trash" style={{ marginRight: '4px' }}></i> Remover Imagem
                        </button>
                      </div>
                    )}

                    <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginTop: '16px' }}>Exames Complementares (Laudos em PDF)</h4>
                    <div className="resp-grid-attach" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.75rem' }}>Nome do Exame</label>
                        <input type="text" className="form-control form-control-sm" value={tempExameNome} onChange={e => setTempExameNome(e.target.value)} placeholder="Ex: Ressonância Coluna Lombar" />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.75rem' }}>Arquivo PDF</label>
                        <input type="file" accept="application/pdf" className="form-control form-control-sm" onChange={handleExameFileSelect} />
                      </div>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={addExame} style={{ height: '32px' }}><i className="fa-solid fa-plus"></i> Anexar</button>
                    </div>

                    {repExamesList.length > 0 && (
                      <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                        <table className="data-table" style={{ margin: 0, fontSize: '0.8rem' }}>
                          <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                              <th>Nome do Exame</th>
                              <th>Nome do Arquivo</th>
                              <th style={{ width: '120px', textAlign: 'center' }}>Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {repExamesList.map((ex, exIdx) => (
                              <tr key={exIdx}>
                                <td><strong>{ex.nome}</strong></td>
                                <td style={{ color: 'var(--text-muted)' }}>{ex.fileName}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadExame(exIdx)}><i className="fa-solid fa-download"></i></button>
                                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeExame(exIdx)}><i className="fa-solid fa-trash"></i></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* PASSO 5: TESTES ORTOPÉDICOS AVANÇADOS */}
                {repActiveStep === 6 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Y TESTE */}
                    {(() => {
                      const latest = getLatestRepAssessment();
                      if (!latest?.dadosMedidos?.testesEspeciais?.yTest) return null;
                      return (
                        <div style={{ background: 'rgba(13,148,136,0.07)', border: '1px solid var(--color-primary)', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                            <i className="fa-solid fa-file-medical" style={{ color: 'var(--color-primary)' }}></i>
                            <span>Avaliação Física: <strong>{fmtDateBR(latest.data)}</strong> — Y-Test disponível</span>
                          </div>
                          <button type="button" className="btn btn-sm" style={{ background: 'var(--color-primary)', color: '#fff', padding: '4px 12px', fontSize: '0.78rem' }} onClick={() => importFromPhysAssessment(['ytest'])}>
                            <i className="fa-solid fa-download" style={{ marginRight: '5px' }}></i>Importar Y-Test
                          </button>
                        </div>
                      );
                    })()}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h5 style={{ margin: 0 }}><i className="fa-solid fa-chevron-right" style={{ color: 'var(--color-primary)', marginRight: '6px', fontSize: '0.8rem' }}></i> Y Teste (Estabilidade do Membro Inferior)</h5>
                        <select className="select-custom" style={{ width: 'auto', margin: 0, height: '28px', padding: '0 8px', fontSize: '0.8rem' }} value={yRealizou} onChange={e => setYRealizou(e.target.value)}>
                          <option value="nao">Não Realizou</option>
                          <option value="sim">Realizou</option>
                        </select>
                      </div>

                      {yRealizou === 'sim' && (
                        <div>
                          <div className="resp-grid-1-1" style={{ marginBottom: '12px' }}>
                            <div>
                              <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--color-secondary)', fontSize: '0.8rem' }}>Membro Direito</strong>
                              <div className="resp-grid-1-1" style={{ fontSize: '0.75rem' }}>
                                <div>Comprimento (cm)<input type="number" className="form-control form-control-sm" value={yLenD || ''} onChange={e => setYLenD(Number(e.target.value))} /></div>
                                <div>Anterior (cm)<input type="number" className="form-control form-control-sm" value={yAntD || ''} onChange={e => setYAntD(Number(e.target.value))} /></div>
                                <div>PM (cm)<input type="number" className="form-control form-control-sm" value={yPMD || ''} onChange={e => setYPMD(Number(e.target.value))} /></div>
                                <div>PL (cm)<input type="number" className="form-control form-control-sm" value={yPLD || ''} onChange={e => setYPLD(Number(e.target.value))} /></div>
                              </div>
                            </div>
                            <div>
                              <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--color-secondary)', fontSize: '0.8rem' }}>Membro Esquerdo</strong>
                              <div className="resp-grid-1-1" style={{ fontSize: '0.75rem' }}>
                                <div>Comprimento (cm)<input type="number" className="form-control form-control-sm" value={yLenE || ''} onChange={e => setYLenE(Number(e.target.value))} /></div>
                                <div>Anterior (cm)<input type="number" className="form-control form-control-sm" value={yAntE || ''} onChange={e => setYAntE(Number(e.target.value))} /></div>
                                <div>PM (cm)<input type="number" className="form-control form-control-sm" value={yPME || ''} onChange={e => setYPME(Number(e.target.value))} /></div>
                                <div>PL (cm)<input type="number" className="form-control form-control-sm" value={yPLE || ''} onChange={e => setYPLE(Number(e.target.value))} /></div>
                              </div>
                            </div>
                          </div>

                          {/* Y TEST CALCULATIONS AND RESULTS */}
                          {(() => {
                            if (!yLenD || !yLenE) return <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Insira o comprimento dos membros de ambos os lados para visualizar as assimetrias e Composite Scores.</div>;
                            const diffAnt = Math.abs(yAntD - yAntE);
                            const diffPM = Math.abs(yPMD - yPME);
                            const diffPL = Math.abs(yPLD - yPLE);
                            const scoreD = ((yAntD + yPMD + yPLD) / (3 * yLenD)) * 100;
                            const scoreE = ((yAntE + yPME + yPLE) / (3 * yLenE)) * 100;
                            
                            let alerts = [];
                            if (diffAnt > 10 || diffPM > 10 || diffPL > 10) alerts.push('Assimetria significativa (> 10cm) - Risco de Lesão!');
                            if (scoreD < 94 || scoreE < 94) alerts.push('Alto risco de lesão (Pontuação normalizada inferior a 94%)');
                            
                            return (
                              <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '6px', fontSize: '0.8rem', marginTop: '12px' }}>
                                <div style={{ marginBottom: '8px' }}>
                                  {alerts.length > 0 ? (
                                    <span className="badge badge-danger" style={{ display: 'block', padding: '6px', textAlign: 'center', marginBottom: '8px' }}><i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i> {alerts.join(' | ')}</span>
                                  ) : (
                                    <span className="badge badge-success" style={{ display: 'block', padding: '6px', textAlign: 'center', marginBottom: '8px' }}><i className="fa-solid fa-check" style={{ marginRight: '6px' }}></i> Sem alertas de risco detectados</span>
                                  )}
                                </div>
                                <div className="resp-grid-1-1" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '8px' }}>
                                  <div><strong>Composite Score D:</strong> {scoreD.toFixed(1)}% <br/><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(Ant+PM+PL) / (3 * {yLenD})</span></div>
                                  <div><strong>Composite Score E:</strong> {scoreE.toFixed(1)}% <br/><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(Ant+PM+PL) / (3 * {yLenE})</span></div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', fontSize: '0.75rem' }}>
                                  <div>Diferença Anterior: <strong>{diffAnt.toFixed(1)} cm</strong></div>
                                  <div>Diferença Posteromedial: <strong>{diffPM.toFixed(1)} cm</strong></div>
                                  <div>Diferença Posterolateral: <strong>{diffPL.toFixed(1)} cm</strong></div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* ESTRELA MAIGNE */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h5 style={{ margin: 0 }}><i className="fa-solid fa-chevron-right" style={{ color: 'var(--color-primary)', marginRight: '6px', fontSize: '0.8rem' }}></i> Estrela de Maigne (Rosa dos Ventos Clínica de Dor)</h5>
                        <select className="select-custom" style={{ width: 'auto', margin: 0, height: '28px', padding: '0 8px', fontSize: '0.8rem' }} value={repMaigneRealizou} onChange={e => setRepMaigneRealizou(e.target.value)}>
                          <option value="nao">Não Realizou</option>
                          <option value="sim">Realizou</option>
                        </select>
                      </div>
                      
                      {repMaigneRealizou === 'sim' && (
                        <>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'center' }}>
                        
                        {/* Interactive React SVG */}
                        <div style={{ background: '#ffffff', borderRadius: '6px', padding: '10px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '280px', height: '280px' }}>
                          {(() => {
                            const cx = 190, cy = 150, scale = 2.0;
                            const angles = [-Math.PI / 2, -Math.PI / 6, Math.PI / 6, Math.PI / 2, 5 * Math.PI / 6, 7 * Math.PI / 6];
                            const refVals = [40, 40, 30, 30, 30, 40];
                            const clientVals = [mFlex, mRotD, mIncD, mExt, mIncE, mRotE];
                            const labels = [
                              { text: `Flexão (EVA: ${mFlexEVA})`, x: cx, y: cy - 100 - 10, anchor: 'middle' as const },
                              { text: `Rot D (EVA: ${mRotDEVA})`, x: cx + 100 * Math.cos(angles[1]) + 15, y: cy + 100 * Math.sin(angles[1]) - 5, anchor: 'start' as const },
                              { text: `Inc D (EVA: ${mIncDEVA})`, x: cx + 100 * Math.cos(angles[2]) + 15, y: cy + 100 * Math.sin(angles[2]) + 10, anchor: 'start' as const },
                              { text: `Extensão (EVA: ${mExtEVA})`, x: cx, y: cy + 100 + 18, anchor: 'middle' as const },
                              { text: `Inc E (EVA: ${mIncEEVA})`, x: cx + 100 * Math.cos(angles[4]) - 15, y: cy + 100 * Math.sin(angles[4]) + 10, anchor: 'end' as const },
                              { text: `Rot E (EVA: ${mRotEEVA})`, x: cx + 100 * Math.cos(angles[5]) - 15, y: cy + 100 * Math.sin(angles[5]) - 5, anchor: 'end' as const }
                            ];
                            
                            const refPoints = angles.map((ang, idx) => `${cx + refVals[idx] * scale * Math.cos(ang)},${cy + refVals[idx] * scale * Math.sin(ang)}`).join(' ');
                            const valPoints = angles.map((ang, idx) => `${cx + clientVals[idx] * scale * Math.cos(ang)},${cy + clientVals[idx] * scale * Math.sin(ang)}`).join(' ');
                            
                            const handleNodeClick = (idx: number) => {
                              const sliderIds = [
                                () => { let v = mFlex + 5; if (v > 50) v = 0; setMFlex(v); },
                                () => { let v = mRotD + 5; if (v > 50) v = 0; setMRotD(v); },
                                () => { let v = mIncD + 5; if (v > 50) v = 0; setMIncD(v); },
                                () => { let v = mExt + 5; if (v > 50) v = 0; setMExt(v); },
                                () => { let v = mIncE + 5; if (v > 50) v = 0; setMIncE(v); },
                                () => { let v = mRotE + 5; if (v > 50) v = 0; setMRotE(v); }
                              ];
                              sliderIds[idx]();
                            };

                            return (
                              <svg width="260" height="260" viewBox="0 0 380 300" style={{ display: 'block', margin: '0 auto', background: '#ffffff' }}>
                                {/* Circles grid */}
                                {[10, 20, 30, 40, 50].map(val => (
                                  <g key={val}>
                                    <circle cx={cx} cy={cy} r={val * scale} fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                                    <text x={cx} y={cy - (val * scale) + 3} style={{ fontSize: '7px', fill: '#94a3b8', textAnchor: 'middle', fontWeight: 'bold' }}>{val}</text>
                                  </g>
                                ))}
                                
                                {/* Axis lines */}
                                {angles.map((ang, aIdx) => (
                                  <line key={aIdx} x1={cx} y1={cy} x2={cx + 100 * Math.cos(ang)} y2={cy + 100 * Math.sin(ang)} stroke="#94a3b8" strokeWidth="0.75" />
                                ))}
                                
                                {/* Directions and labels */}
                                {labels.map((lbl, lIdx) => (
                                  <text key={lIdx} x={lbl.x} y={lbl.y} textAnchor={lbl.anchor} style={{ fontSize: '9px', fill: '#0f172a', fontWeight: 'bold' }}>{lbl.text}</text>
                                ))}

                                {/* Reference polygon */}
                                <polygon points={refPoints} fill="none" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="3,3" />

                                {/* User values polygon */}
                                <polygon points={valPoints} fill="rgba(13, 148, 136, 0.15)" stroke="#0d9488" strokeWidth="1.8" />

                                {/* Interactive value nodes */}
                                {angles.map((ang, idx) => (
                                  <circle
                                    key={idx}
                                    cx={cx + clientVals[idx] * scale * Math.cos(ang)}
                                    cy={cy + clientVals[idx] * scale * Math.sin(ang)}
                                    r="5.5"
                                    fill="#0d9488"
                                    stroke="#ffffff"
                                    strokeWidth="1.5"
                                    onClick={() => handleNodeClick(idx)}
                                    style={{ cursor: 'pointer' }}
                                  />
                                ))}
                              </svg>
                            );
                          })()}
                        </div>

                        {/* Control Sliders */}
                        <div className="resp-grid-1-1" style={{ flex: 1, minWidth: '250px' }}>
                          {[
                            { label: 'Flexão (ADM)', val: mFlex, setVal: setMFlex, max: 50, isEva: false },
                            { label: 'Flexão (EVA)', val: mFlexEVA, setVal: setMFlexEVA, max: 10, isEva: true },
                            { label: 'Extensão (ADM)', val: mExt, setVal: setMExt, max: 50, isEva: false },
                            { label: 'Extensão (EVA)', val: mExtEVA, setVal: setMExtEVA, max: 10, isEva: true },
                            { label: 'Rot D (ADM)', val: mRotD, setVal: setMRotD, max: 50, isEva: false },
                            { label: 'Rot D (EVA)', val: mRotDEVA, setVal: setMRotDEVA, max: 10, isEva: true },
                            { label: 'Rot E (ADM)', val: mRotE, setVal: setMRotE, max: 50, isEva: false },
                            { label: 'Rot E (EVA)', val: mRotEEVA, setVal: setMRotEEVA, max: 10, isEva: true },
                            { label: 'Inc D (ADM)', val: mIncD, setVal: setMIncD, max: 50, isEva: false },
                            { label: 'Inc D (EVA)', val: mIncDEVA, setVal: setMIncDEVA, max: 10, isEva: true },
                            { label: 'Inc E (ADM)', val: mIncE, setVal: setMIncE, max: 50, isEva: false },
                            { label: 'Inc E (EVA)', val: mIncEEVA, setVal: setMIncEEVA, max: 10, isEva: true }
                          ].map((item, keyIdx) => (
                            <div key={keyIdx} style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                                {item.label}: <span style={{ color: item.isEva ? 'var(--color-danger)' : 'var(--color-primary)', fontWeight: 'bold' }}>{item.val}</span>/{item.max}
                              </label>
                              <input
                                type="range"
                                className="form-control"
                                min="0"
                                max={item.max}
                                value={item.val}
                                onChange={e => item.setVal(Number(e.target.value))}
                                style={{ width: '100%', height: '18px', accentColor: item.isEva ? 'var(--color-danger)' : 'var(--color-primary)' }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>* Clique nos nós verdes do gráfico em teia ou use os controles deslizantes para alterar as amplitudes de movimento e dor.</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic', fontWeight: 600 }}>* Legenda Goniometria: 1 e 2 (com ou sem aplicação de força do instrutor).</p>
                        </>
                      )}
                    </div>

                    {(() => {
                      const latest = getLatestRepAssessment();
                      if (!latest?.dadosMedidos?.testesEspeciais?.stepDown) return null;
                      return (
                        <div style={{ background: 'rgba(13,148,136,0.07)', border: '1px solid var(--color-primary)', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                            <i className="fa-solid fa-file-medical" style={{ color: 'var(--color-primary)' }}></i>
                            <span>Avaliação Física: <strong>{fmtDateBR(latest.data)}</strong> — Step Down disponível</span>
                          </div>
                          <button type="button" className="btn btn-sm" style={{ background: 'var(--color-primary)', color: '#fff', padding: '4px 12px', fontSize: '0.78rem' }} onClick={() => importFromPhysAssessment(['stepdown'])}>
                            <i className="fa-solid fa-download" style={{ marginRight: '5px' }}></i>Importar Step Down
                          </button>
                        </div>
                      );
                    })()}

                    {/* STEP DOWN */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h5 style={{ margin: 0 }}><i className="fa-solid fa-chevron-right" style={{ color: 'var(--color-primary)', marginRight: '6px', fontSize: '0.8rem' }}></i> Step Down Test (Avaliação do Controle Dinâmico)</h5>
                        <select className="select-custom" style={{ width: 'auto', margin: 0, height: '28px', padding: '0 8px', fontSize: '0.8rem' }} value={sdRealizou} onChange={e => setSdRealizou(e.target.value)}>
                          <option value="nao">Não Realizou</option>
                          <option value="sim">Realizou</option>
                        </select>
                      </div>

                      {sdRealizou === 'sim' && (
                        <div>
                          <div className="resp-grid-1-1" style={{ marginBottom: '10px' }}>
                            <div className="form-group">
                              <label style={{ fontSize: '0.75rem' }}>Queda Pélvica (Graus)</label>
                              <input type="number" className="form-control form-control-sm" value={sdPelvica || ''} onChange={e => setSdPelvica(Number(e.target.value))} placeholder="Ex: 4..." />
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Referência: normal até 5°</span>
                            </div>
                            <div className="form-group">
                              <label style={{ fontSize: '0.75rem' }}>Adução do Quadril (Graus)</label>
                              <input type="number" className="form-control form-control-sm" value={sdAducao || ''} onChange={e => setSdAducao(Number(e.target.value))} placeholder="Ex: 8..." />
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Referência: normal até 10°</span>
                            </div>
                          </div>
                          
                          <div className="resp-grid-1-1">
                            <div className="form-group">
                              <label style={{ fontSize: '0.75rem' }}>Valgo Dinâmico do Joelho (Graus)</label>
                              <input type="number" className="form-control form-control-sm" value={sdValgo || ''} onChange={e => setSdValgo(Number(e.target.value))} placeholder="Ex: 9..." />
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Referência: Homem até 10°, Mulher até 15°</span>
                            </div>
                            <div className="form-group">
                              <label style={{ fontSize: '0.75rem' }}>Componente Excêntrico de Quadríceps / PRPS (Graus)</label>
                              <input type="number" className="form-control form-control-sm" value={sdPrps || ''} onChange={e => setSdPrps(Number(e.target.value))} placeholder="Ex: 65..." />
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Referência: normal acima de 60°</span>
                            </div>
                          </div>

                          {/* Step Down Real-time Alerts */}
                          {(() => {
                            const selCli = clients.find(c => c._id === repClient);
                            const rawSex = selCli?.dadosPessoais?.sexo || 'M';
                            const sex = rawSex === 'masculino' ? 'M' : rawSex === 'feminino' ? 'F' : rawSex === 'outro' ? 'O' : rawSex;
                            let riskFactors = [];
                            if (sdPelvica > 5) riskFactors.push('Queda Pélvica elevada (> 5°)');
                            if (sdAducao > 10) riskFactors.push('Adução de Quadril elevada (> 10°)');
                            const limit = sex === 'M' ? 10 : 15;
                            if (sdValgo > limit) riskFactors.push(`Valgo Dinâmico elevado (> ${limit}° para sexo ${sex === 'M' ? 'Masculino' : 'Feminino'})`);
                            if (sdPrps > 0 && sdPrps < 60) riskFactors.push('Componente Excêntrico de Quadríceps reduzido ou PRPS positivo (< 60°)');

                            return (
                              <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '6px', fontSize: '0.8rem', marginTop: '12px' }}>
                                {riskFactors.length > 0 ? (
                                  <>
                                    <div className="badge badge-danger" style={{ marginBottom: '6px' }}><i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i> Risco Elevado de Lesão detectado</div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}><strong>Fatores de risco identificados:</strong> {riskFactors.join(', ')}.</p>
                                  </>
                                ) : (
                                  <>
                                    <div className="badge badge-success" style={{ marginBottom: '6px' }}><i className="fa-solid fa-check" style={{ marginRight: '6px' }}></i> Controle Dinâmico Adequado</div>
                                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Todas as métricas estão dentro das referências clínicas saudáveis.</p>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* MOVIMENTO CINTURA ESCAPULAR & DISCINESIA */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h5 style={{ margin: 0 }}><i className="fa-solid fa-chevron-right" style={{ color: 'var(--color-primary)', marginRight: '6px', fontSize: '0.8rem' }}></i> Movimento da Cintura Escapular & Discinesia</h5>
                        <select className="select-custom" style={{ width: 'auto', margin: 0, height: '28px', padding: '0 8px', fontSize: '0.8rem' }} value={repDeRealizou} onChange={e => setRepDeRealizou(e.target.value)}>
                          <option value="nao">Não Realizou</option>
                          <option value="sim">Realizou</option>
                        </select>
                      </div>

                      {repDeRealizou === 'sim' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div className="form-group">
                            <label style={{ fontSize: '0.75rem' }}>Tipo de Discinesia Escapular</label>
                            <select className="form-control form-control-sm" value={repDeTipo} onChange={e => setRepDeTipo(e.target.value)}>
                              <option value="Tipo IV">Tipo IV: Normal (movimento simétrico)</option>
                              <option value="Tipo I">Tipo I: Proeminência do ângulo ínfero-medial</option>
                              <option value="Tipo II">Tipo II: Proeminência de toda a borda medial</option>
                              <option value="Tipo III">Tipo III: Proeminência da borda superior</option>
                            </select>
                          </div>
                          
                          <div style={{ background: 'var(--bg-darker)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <strong style={{ fontSize: '0.75rem', display: 'block', color: 'var(--text-muted)' }}>Parâmetros Qualitativos de Movimento:</strong>
                            <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                              <input type="checkbox" checked={repDeAbdBilateral === 'sim'} onChange={e => setRepDeAbdBilateral(e.target.checked ? 'sim' : 'nao')} />
                              Durante abdução bilateral dos braços, paciente projeta a cabeça para frente.
                            </label>
                            <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                              <input type="checkbox" checked={repDeAbdUnilateral === 'sim'} onChange={e => setRepDeAbdUnilateral(e.target.checked ? 'sim' : 'nao')} />
                              Durante abdução unilateral de um braço, paciente realiza inclinação torácica contralateral e desvia a cabeça.
                            </label>
                            <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                              <input type="checkbox" checked={repDeDorAbd === 'sim'} onChange={e => setRepDeDorAbd(e.target.checked ? 'sim' : 'nao')} />
                              Paciente relata dor ou limitação ao final da abdução unilateral com inclinação lateral da coluna.
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* PASSO 6: CONDUTA TERAPÊUTICA E PRESCRIÇÃO */}
                {(repActiveStep === 7) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>Conduta & Exercícios Domiciliares</h4>
                    <div className="form-group">
                      <label style={{ fontWeight: '600' }}>Conduta Fisioterapêutica Aplicada (Sessão)</label>
                      <textarea
                        className="form-control"
                        rows={6}
                        value={repContent}
                        onChange={e => setRepContent(e.target.value)}
                        placeholder="Ex: Mobilização articular passiva da coluna lombar, liberação miofascial de quadrado lombar, aplicação de agulhamento seco..."
                        required
                      />
                      <small style={{ color: 'var(--text-muted)' }}>Descreva as técnicas manuais, recursos físicos e condutas executadas em sessão.</small>
                    </div>

                    <div className="form-group">
                      <label style={{ fontWeight: '600' }}>Prescrição de Autocuidado / Exercícios para Casa</label>
                      <textarea
                        className="form-control"
                        rows={6}
                        value={repExercicios}
                        onChange={e => setRepExercicios(e.target.value)}
                        placeholder="Ex: Ponte pélvica isométrica 3x45s, alongamento de flexores de quadril..."
                      />
                      <small style={{ color: 'var(--text-muted)' }}>Indique orientações ergonômicas e exercícios prescritos ao paciente.</small>
                    </div>
                  </div>
                )}

              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <div>
                  {repActiveStep > 1 && (
                    <button type="button" className="btn btn-secondary" onClick={() => setRepActiveStep(repActiveStep - 1)}>
                      Anterior
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={handleCloseReport}>Cancelar</button>
                  {repActiveStep < 7 ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        if (!repClient) {
                          alert('Selecione o paciente antes de avançar.');
                          return;
                        }
                        setRepActiveStep(repActiveStep + 1);
                      }}
                    >
                      Avançar
                    </button>
                  ) : (
                    <button type="submit" className="btn btn-primary">
                      Registrar e Baixar PDF
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Strength Test Modal */}
      {showStModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'var(--bg-main, #0f172a)', zIndex: 9999, overflowY: 'auto', display: 'block', padding: '24px 0' }}>
          <div className="modal-content" style={{ maxWidth: '1200px', width: '95%', margin: '0 auto', background: 'var(--bg-card, #1e293b)', minHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <h3 style={{ margin: 0 }}>Registrar Teste de Força Muscular</h3>
                <span style={{ padding: '4px 10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  ⏱️ Tempo: {formatTimer(stTimerSeconds)}
                </span>
              </div>
              <button className="modal-close" onClick={handleCloseSt}>&times;</button>
            </div>
            <form onSubmit={handleCreateStrengthTest}>
              <div className="modal-body" style={{ padding: '20px' }}>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                  <div className="form-group">
                    <label>Paciente / Aluno</label>
                    <SearchableSelect
                      options={clientOptions}
                      value={stClient}
                      onChange={setStClient}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Data</label>
                    <input type="date" className="form-control" value={stDate} onChange={e => setStDate(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Avaliador / Profissional</label>
                    <select className="form-control" value={stAvaliador} onChange={e => setStAvaliador(e.target.value)} required>
                      <option value="">Selecione o Avaliador</option>
                      {professionals.map((p: any) => (
                        <option key={p._id} value={p._id}>{p.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Peso Corporal (kg)</label>
                    <input type="number" step="any" className="form-control" value={stPeso} onChange={e => setStPeso(e.target.value)} placeholder="Peso em kg" required />
                  </div>
                </div>

                <h5 style={{ margin: '16px 0 8px 0', color: 'var(--color-primary)' }}>Adicionar Novo Movimento Avaliado</h5>
                
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group">
                    <label>Articulação</label>
                    <select className="form-control" value={stArticulacao} onChange={e => {
                      const art = e.target.value;
                      setStArticulacao(art);
                      const movs = Object.keys(STRENGTH_REFERENCE_TABLE[art] || {});
                      setStMovimento(movs[0] || '');
                    }} required>
                      {Object.keys(STRENGTH_REFERENCE_TABLE).map(art => (
                        <option key={art} value={art}>{art}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Movimento Avaliado</label>
                    <select className="form-control" value={stMovimento} onChange={e => setStMovimento(e.target.value)} required>
                      {Object.keys(STRENGTH_REFERENCE_TABLE[stArticulacao] || {}).map(mov => (
                        <option key={mov} value={mov}>{mov}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Lado Avaliado</label>
                    <select className="form-control" value={stLado} onChange={e => setStLado(e.target.value)} required>
                      <option value="Direito">Direito</option>
                      <option value="Esquerdo">Esquerdo</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Unidade de Medida</label>
                    <select className="form-control" value={stUnidade} onChange={e => setStUnidade(e.target.value)} required>
                      <option value="kgf">kgf</option>
                      <option value="N">Newton (N)</option>
                    </select>
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '16px', alignItems: 'end' }}>
                  <div className="form-group">
                    <label>Valor Obtido</label>
                    <input type="number" step="any" className="form-control" value={stValorObtido} onChange={e => setStValorObtido(e.target.value)} placeholder="0.0" />
                  </div>
                  
                  <div className="form-group">
                    <label>Nº de Tentativas</label>
                    <input type="number" className="form-control" value={stTentativas} onChange={e => setStTentativas(e.target.value)} placeholder="1" />
                  </div>

                  <div className="form-group">
                    <label>Melhor Tentativa</label>
                    <input type="number" step="any" className="form-control" value={stMelhorTentativa} onChange={e => setStMelhorTentativa(e.target.value)} placeholder="Opcional" />
                  </div>

                  <div className="form-group">
                    <label>Média Tentativas</label>
                    <input type="number" step="any" className="form-control" value={stMediaTentativas} onChange={e => setStMediaTentativas(e.target.value)} placeholder="Opcional" />
                  </div>

                  <div className="form-group">
                    <button type="button" className="btn btn-primary" onClick={handleAddTestItem} style={{ width: '100%' }}>
                      <i className="fa-solid fa-plus"></i> Adicionar
                    </button>
                  </div>
                </div>

                {stTestesList.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h5 style={{ margin: '16px 0 8px 0', color: 'var(--color-primary)' }}>Movimentos Adicionados</h5>
                    <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                      <table className="data-table" style={{ margin: 0, fontSize: '0.8rem' }}>
                        <thead>
                          <tr>
                            <th>Articulação</th>
                            <th>Movimento</th>
                            <th>Lado</th>
                            <th>Valor</th>
                            <th>Força (N)</th>
                            <th>%PC</th>
                            <th>% Ref</th>
                            <th>Classificação</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stTestesList.map((t, idx) => (
                            <tr key={idx}>
                              <td>{t.articulacao}</td>
                              <td>{t.movimento}</td>
                              <td>{t.lado}</td>
                              <td>{t.valorObtido} {t.unidade}</td>
                              <td>{t.forcaN.toFixed(1)} N</td>
                              <td>{t.pcPercent.toFixed(1)}%</td>
                              <td>{t.pctRef.toFixed(1)}%</td>
                              <td>
                                <span className={`badge ${
                                  t.classificacao === 'FORÇA NORMAL' ? 'badge-success' : 
                                  t.classificacao === 'DÉFICIT LEVE' ? 'badge-warning' : 
                                  t.classificacao === 'DÉFICIT MODERADO' ? 'badge-warning' : 'badge-danger'
                                }`} style={{ fontSize: '0.7rem' }}>
                                  {t.classificacao}
                                </span>
                              </td>
                              <td>
                                <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemoveTestItem(idx)}>
                                  <i className="fa-solid fa-trash"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Bilateral comparisons table */}
                {(() => {
                  const comps = calculateComparativos(stTestesList);
                  if (comps.length === 0) return null;
                  return (
                    <div style={{ marginBottom: '20px' }}>
                      <h5 style={{ margin: '16px 0 8px 0', color: 'var(--color-primary)' }}>Análise Comparativa de Simetria (Bilateral)</h5>
                      <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                        <table className="data-table" style={{ margin: 0, fontSize: '0.8rem' }}>
                          <thead>
                            <tr>
                              <th>Articulação</th>
                              <th>Movimento</th>
                              <th>Dir (N)</th>
                              <th>Esq (N)</th>
                              <th>Symmetry (%)</th>
                              <th>Déficit (%)</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {comps.map((c, idx) => (
                              <tr key={idx}>
                                <td>{c.articulacao}</td>
                                <td>{c.movimento}</td>
                                <td>{c.valorD.toFixed(1)} N</td>
                                <td>{c.valorE.toFixed(1)} N</td>
                                <td>{c.simetria.toFixed(1)}%</td>
                                <td>{c.deficit.toFixed(1)}%</td>
                                <td>
                                  <span className={`badge ${
                                    c.classificacaoSimetria === 'Excelente' ? 'badge-success' : 
                                    c.classificacaoSimetria === 'Aceitável' ? 'badge-success' : 
                                    c.classificacaoSimetria === 'Atenção' ? 'badge-warning' : 'badge-danger'
                                  }`} style={{ fontSize: '0.7rem' }}>
                                    {c.classificacaoSimetria}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                <div className="form-group" style={{ marginTop: '15px' }}>
                  <label>Observações / Análise Clínica Geral</label>
                  <textarea className="form-control" value={stObs} onChange={e => setStObs(e.target.value)} placeholder="Anotações gerais sobre o padrão motor, dor ou progresso do teste..." />
                </div>

                {/* Interpretação Clínica dos Resultados */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', marginTop: '16px' }}>
                  <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', color: 'var(--text-main)', marginBottom: '16px' }}>
                    <i className="fa-solid fa-square-poll-vertical" style={{ color: 'var(--color-primary)', marginRight: '6px' }}></i> Interpretação Clínica dos Resultados
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', borderLeft: '4px solid #10b981', background: 'rgba(16, 185, 129, 0.04)' }}>
                      <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '4px' }}>&ge; 90% do Valor de Referência</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.4', display: 'block' }}>
                        <strong>Força normal:</strong> o paciente apresenta força muscular dentro dos parâmetros normativos para sua faixa demográfica. Liberação para progressão de carga ou retorno ao esporte/atividades.
                      </span>
                    </div>
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', borderLeft: '4px solid #3b82f6', background: 'rgba(59, 130, 246, 0.04)' }}>
                      <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '4px' }}>75-89% do Valor de Referência</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.4', display: 'block' }}>
                        <strong>Déficit leve:</strong> força levemente reduzida. Indica necessidade de fortalecimento direcionado, porém funcionalidade preservada para a maioria das atividades de vida diária.
                      </span>
                    </div>
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', borderLeft: '4px solid #f97316', background: 'rgba(249, 115, 22, 0.04)' }}>
                      <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '4px' }}>50-74% do Valor de Referência</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.4', display: 'block' }}>
                        <strong>Déficit moderado:</strong> comprometimento funcional relevante. Requer programa de reabilitação estruturado com reavaliação periódica. Restrição de atividades de maior demanda.
                      </span>
                    </div>
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', borderLeft: '4px solid #ef4444', background: 'rgba(239, 68, 68, 0.04)' }}>
                      <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '4px' }}>&lt; 50% do Valor de Referência</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.4', display: 'block' }}>
                        <strong>Déficit grave:</strong> fraqueza muscular importante com alto impacto funcional. Investigação de causas subjacentes, possível encaminhamento médico e reabilitação intensiva são indicados.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseSt}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar Teste de Força</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Prontuario Modal */}
      {showProntuarioModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'var(--bg-main, #0f172a)', zIndex: 9999, overflowY: 'auto', display: 'block', padding: '24px 0' }}>
          <div className="modal-content" style={{ maxWidth: '1200px', width: '95%', margin: '0 auto', background: 'var(--bg-card, #1e293b)', minHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h3>Nova Anotação de Prontuário</h3>
              <button className="modal-close" onClick={handleCloseProntuario}>&times;</button>
            </div>
            <form onSubmit={handleCreateProntuario}>
              <div className="modal-body" style={{ padding: '20px' }}>
                <div className="form-group">
                  <label>Paciente</label>
                  <SearchableSelect
                    options={clientOptions}
                    value={prClient}
                    onChange={setPrClient}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Data</label>
                  <input type="date" className="form-control" value={prDate} onChange={e => setPrDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Evolução / Histórico Clínico</label>
                  <textarea className="form-control" style={{ height: '240px' }} value={prContent} onChange={e => setPrContent(e.target.value)} placeholder="Registrar evolução do tratamento e condutas tomadas..." required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseProntuario}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Prontuário</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. New Exercise Modal */}
      {showNewExModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowNewExModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h3>Cadastrar Novo Exercício</h3>
              <button className="modal-close" onClick={() => setShowNewExModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateExercise}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nome do Exercício</label>
                  <input type="text" className="form-control" value={newExNome} onChange={e => setNewExNome(e.target.value)} placeholder="Ex: Crossover Polia Alta" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Grupo Muscular</label>
                    <select className="select-custom" value={newExGrupo} onChange={e => setNewExGrupo(e.target.value)} required>
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
                    <select className="select-custom" value={newExEquip} onChange={e => setNewExEquip(e.target.value)} required>
                      <option value="BARRA">Barra</option>
                      <option value="HALTER">Halter</option>
                      <option value="POLIA">Polia</option>
                      <option value="MÁQUINA">Máquina</option>
                      <option value="PESO CORPORAL">Peso Corporal</option>
                      <option value="ELÁSTICO">Elástico</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Instruções de Execução</label>
                  <textarea className="form-control" style={{ height: '80px' }} value={newExInst} onChange={e => setNewExInst(e.target.value)} placeholder="Passo a passo da execução do movimento..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewExModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Cadastrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Emergency Appointment Modal */}
      {showEmergencyModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowEmergencyModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '95%' }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: '#fff' }}>
              <h3><i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>Finalizar Atendimento de Emergência</h3>
              <button className="modal-close" style={{ color: '#fff' }} onClick={() => setShowEmergencyModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '8px', padding: '12px', fontSize: '0.9rem' }}>
                <p style={{ margin: '0 0 4px 0' }}><strong>Paciente:</strong> {emergencyApt?.clienteId?.dadosPessoais?.nome || 'Paciente'}</p>
                <p style={{ margin: 0 }}><strong>Atendimento:</strong> Emergência às {emergencyApt?.horario} de {emergencyApt?.data}</p>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '10px' }}>Conduta Clínica / Resolução:</label>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: emergencyConduct === 'alta' ? 600 : 400 }}>
                    <input type="radio" name="emgConduct" value="alta" checked={emergencyConduct === 'alta'} onChange={() => setEmergencyConduct('alta')} />
                    <span>Dar Alta ao Aluno</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: emergencyConduct === 'remarcacao' ? 600 : 400 }}>
                    <input type="radio" name="emgConduct" value="remarcacao" checked={emergencyConduct === 'remarcacao'} onChange={() => setEmergencyConduct('remarcacao')} />
                    <span>Remarcar Novo Atendimento</span>
                  </label>
                </div>
              </div>

              {emergencyConduct === 'remarcacao' && (
                <div style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)', padding: '14px', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--color-primary)' }}><i className="fa-solid fa-calendar-plus"></i> Dados do Novo Agendamento (Emergência)</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem' }}>Data da Remarcação</label>
                      <input type="date" className="form-control" value={emergencyReschedDate} onChange={e => setEmergencyReschedDate(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem' }}>Horário</label>
                      <select className="select-custom" value={emergencyReschedHour} onChange={e => setEmergencyReschedHour(e.target.value)}>
                        {['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'].map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Relatório para Prontuário Clínico <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <textarea
                  className="form-control"
                  rows={5}
                  required
                  style={{ resize: 'vertical' }}
                  placeholder="Descreva a queixa do aluno, procedures realizados e avaliação do estado clínico..."
                  value={emergencyReport}
                  onChange={e => setEmergencyReport(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEmergencyModal(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleSaveEmergencyResolution}>
                <i className="fa-solid fa-clipboard-check"></i> Confirmar e Finalizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Detail / History Modal */}
      {showClientDetailModal && detailClient && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowClientDetailModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h3>Histórico Clínico — {detailClient.dadosPessoais?.nome}</h3>
              <button className="modal-close" onClick={() => setShowClientDetailModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <h4 style={{ color: 'var(--color-primary)', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Avaliações Físicas</h4>
              <div className="table-responsive" style={{ marginBottom: '24px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Gordura Corporal</th>
                      <th>IMC</th>
                      {isAdmin && <th>Avaliador</th>}
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const clientAssessments = assessments.filter(as => (as.clienteId?._id || as.clienteId) === detailClient._id);
                      if (clientAssessments.length === 0) {
                        return <tr><td colSpan={isAdmin ? 5 : 4} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '12px' }}>Nenhuma avaliação cadastrada.</td></tr>;
                      }
                      return clientAssessments.map(as => {
                        const fatText = as.resultadosCalculados?.percentualGordura ? `${as.resultadosCalculados.percentualGordura.toFixed(1)}%` : '-';
                        const imcText = as.resultadosCalculados?.imc ? `${as.resultadosCalculados.imc.toFixed(1)} (${as.resultadosCalculados.imcClassificacao || ''})` : '-';
                        return (
                          <tr key={as._id}>
                            <td>{(() => {
                              if (!as.data) return '';
                              const parts = as.data.split('-');
                              if (parts.length !== 3) return as.data;
                              return `${parts[2]}/${parts[1]}/${parts[0]}`;
                            })()}</td>
                            <td>{fatText}</td>
                            <td>{imcText}</td>
                            {isAdmin && <td>{as.avaliadorId?.nome || 'Não Definido'}</td>}
                            <td>
                              <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadAssessmentPDF(as, assessments)}>
                                <i className="fa-solid fa-file-pdf"></i> Laudo PDF
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              <h4 style={{ color: 'var(--color-primary)', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Relatórios Fisioterápicos</h4>
              <div className="table-responsive" style={{ marginBottom: '24px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Queixa Principal</th>
                      <th>Escala de Dor</th>
                      {isAdmin && <th>Profissional</th>}
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const clientReports = reports.filter(rep => (rep.clienteId?._id || rep.clienteId) === detailClient._id);
                      if (clientReports.length === 0) {
                        return <tr><td colSpan={isAdmin ? 5 : 4} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '12px' }}>Nenhum relatório cadastrado.</td></tr>;
                      }
                      return clientReports.map(rep => (
                        <tr key={rep._id}>
                          <td>{(() => {
                            if (!rep.data) return '';
                            const parts = rep.data.split('-');
                            if (parts.length !== 3) return rep.data;
                            return `${parts[2]}/${parts[1]}/${parts[0]}`;
                          })()}</td>
                          <td>{rep.conteudo?.queixaPrincipal || '-'}</td>
                          <td>
                            <span className={`badge ${rep.conteudo?.dorEscala > 6 ? 'badge-danger' : 'badge-warning'}`}>
                              Dor: {rep.conteudo?.dorEscala}/10
                            </span>
                          </td>
                          {isAdmin && <td>{rep.profissionalId?.nome || 'Não Definido'}</td>}
                          <td>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadReportPDF(rep)}>
                              <i className="fa-solid fa-file-pdf"></i> PDF
                            </button>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowClientDetailModal(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}








