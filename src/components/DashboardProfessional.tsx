'use client';

import React, { useEffect, useState, useRef } from 'react';
import Pagination from './Pagination';
import SearchableSelect from './SearchableSelect';
import WorkoutBuilder from './WorkoutBuilder';
import { downloadReportPDF, downloadAssessmentPDF, downloadProntuarioPDF, downloadUnifiedProntuariosPDF, downloadStrengthTestPDF } from '@/utils/pdfGenerator';

interface DashboardProfessionalProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  professionalId?: string;
}

export default function DashboardProfessional({ activeTab, setActiveTab, professionalId }: DashboardProfessionalProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
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
  const [selectedClientForWorkout, setSelectedClientForWorkout] = useState<any>(null);
  const [editingWorkoutData, setEditingWorkoutData] = useState<any>(null);
  const [activeWorkoutCategory, setActiveWorkoutCategory] = useState<'fichasMonitorado' | 'fichasLivre'>('fichasMonitorado');
  const [activeWorkoutSubTab, setActiveWorkoutSubTab] = useState<'A' | 'B' | 'C'>('A');
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
    if (window.confirm("Tem certeza que deseja fechar a Avaliação Física? Todas as alterações não salvas serão perdidas.")) {
      setShowAssessmentModal(false);
    }
  };

  const handleCloseReport = () => {
    if (window.confirm("Tem certeza que deseja fechar o Relatório Fisioterápico? Todas as alterações não salvas serão perdidas.")) {
      setShowReportModal(false);
    }
  };

  const handleCloseSt = () => {
    if (window.confirm("Tem certeza que deseja fechar o Teste de Força? Todas as alterações não salvas serão perdidas.")) {
      setShowStModal(false);
    }
  };

  const handleCloseProntuario = () => {
    if (window.confirm("Tem certeza que deseja fechar a anotação de Prontuário? Todas as alterações não salvas serão perdidas.")) {
      setShowProntuarioModal(false);
    }
  };

  const getGoalReferenceInfo = () => {
    if (!asTipoObjetivo) return null;
    
    let min = null;
    let max = null;
    const freq = Number(asFreqSemanal) || 3;
    const sexo = asSex || 'M';
    const tipo = asTipoObjetivo;
    const meses = Number(asObjetivoMeses) || 3;

    if (freq === 2) {
      if (sexo === 'M' && tipo === 'Massa Magra') { min = 0.1; max = 0.25; }
      else if (sexo === 'F' && tipo === 'Emagrecimento') { min = 0.3; max = 0.6; }
    } else if (freq === 3) {
      if (sexo === 'M' && tipo === 'Massa Magra') { min = 0.2; max = 0.4; }
      else if (sexo === 'F' && tipo === 'Massa Magra') { min = 0.1; max = 0.2; }
    } else if (freq === 4) {
      if (sexo === 'M' && tipo === 'Emagrecimento') { min = 0.5; max = 0.8; }
      else if (sexo === 'F' && tipo === 'Massa Magra') { min = 0.2; max = 0.3; }
    } else if (freq === 5) {
      if (sexo === 'M' && tipo === 'Massa Magra') { min = 0.3; max = 0.5; }
      else if (sexo === 'F' && tipo === 'Emagrecimento') { min = 0.6; max = 1.0; }
    }

    if (min === null || max === null) {
      if (tipo === 'Emagrecimento') {
        if (sexo === 'F') { min = 0.3; max = 0.6; }
        else { min = 0.5; max = 0.8; }
      } else {
        if (sexo === 'F') { min = 0.1; max = 0.2; }
        else { min = 0.2; max = 0.4; }
      }
    }

    const totalSemanas = Math.round(meses * 4.33);
    const minTotal = (min * totalSemanas).toFixed(1);
    const maxTotal = (max * totalSemanas).toFixed(1);
    const labelTipo = tipo === 'Emagrecimento' ? 'Emagrecimento / Perda de Gordura' : 'Ganho de Massa Magra';
    const labelSexo = sexo === 'M' ? 'Masculino' : 'Feminino';

    return { min, max, minTotal, maxTotal, totalSemanas, labelTipo, labelSexo, freq, meses };
  };

  // Novas variáveis de estado para o assistente de 6 etapas
  const [asAge, setAsAge] = useState(30);
  const [asSex, setAsSex] = useState('M');
  const [asObjetivoPrincipal, setAsObjetivoPrincipal] = useState('');
  const [asObjetivoMeses, setAsObjetivoMeses] = useState(3);
  const [asTipoObjetivo, setAsTipoObjetivo] = useState('');
  const [asFreqSemanal, setAsFreqSemanal] = useState(3);
  
  const [asPressao, setAsPressao] = useState('120/80 mmHg');
  const [asSono, setAsSono] = useState('7-8 h por noite');
  const [asNutricao, setAsNutricao] = useState('Adequada');
  const [asAtivFisica, setAsAtivFisica] = useState('4x por semana');
  const [asMedicamentos, setAsMedicamentos] = useState('Nenhum');
  const [asCirurgias, setAsCirurgias] = useState('Nenhuma');
  const [asQueixas, setAsQueixas] = useState('Nenhuma');

  const [asCirc, setAsCirc] = useState({
    pescoco: 38, ombros: 110, torax: 90, cintura: 80, abdomen: 82, quadril: 95,
    braçoD: 32, braçoE: 32, antebraçoD: 26, antebraçoE: 26, coxaD: 55, coxaE: 55, panturrilhaD: 36, panturrilhaE: 36
  });

  const [asDobras, setAsDobras] = useState({
    peitoral: 10, triceps: 12, subescapular: 15, subaxilar: 11, suprailiaca: 14, abdomen: 18, coxa: 12, panturrilha: 10
  });

  const [asSomaDobras, setAsSomaDobras] = useState(102);

  const [asGonio, setAsGonio] = useState({
    quadrilFlexao1D: 75, quadrilFlexao1E: 75,
    quadrilFlexao2D: 110, quadrilFlexao2E: 110,
    quadrilRotIntD: 40, quadrilRotIntE: 40,
    quadrilRotExtD: 40, quadrilRotExtE: 40,
    joelhoFlexaoD: 140, joelhoFlexaoE: 140,
    joelhoPopliteoD: 155, joelhoPopliteoE: 155,
    tornozeloDorsi1D: 40, tornozeloDorsi1E: 40,
    tornozeloDorsi2D: 20, tornozeloDorsi2E: 20,
    tornozeloFlexaoPlantarD: 45, tornozeloFlexaoPlantarE: 45,
    ombroRotIntD: 85, ombroRotIntE: 85,
    ombroRotExtD: 90, ombroRotExtE: 90,
    ombroAbducaoD: 180, ombroAbducaoE: 180
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
  const [repType, setRepType] = useState<'simplificado' | 'completo'>('simplificado');
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
  const [repExamesList, setRepExamesList] = useState<any[]>([]);
  
  const [repDeRealizou, setRepDeRealizou] = useState('nao');
  const [repDeTipo, setRepDeTipo] = useState('Tipo IV');
  const [repDeAbdBilateral, setRepDeAbdBilateral] = useState('nao');
  const [repDeAbdUnilateral, setRepDeAbdUnilateral] = useState('nao');
  const [repDeDorAbd, setRepDeDorAbd] = useState('nao');

  // Goniometry
  const [gQuadrilFlex1D, setGQuadrilFlex1D] = useState(75);
  const [gQuadrilFlex1E, setGQuadrilFlex1E] = useState(75);
  const [gQuadrilFlex2D, setGQuadrilFlex2D] = useState(100);
  const [gQuadrilFlex2E, setGQuadrilFlex2E] = useState(102);
  const [gQuadrilRotIntD, setGQuadrilRotIntD] = useState(35);
  const [gQuadrilRotIntE, setGQuadrilRotIntE] = useState(36);
  const [gQuadrilRotExtD, setGQuadrilRotExtD] = useState(40);
  const [gQuadrilRotExtE, setGQuadrilRotExtE] = useState(40);
  const [gJoelhoFlexD, setGJoelhoFlexD] = useState(135);
  const [gJoelhoFlexE, setGJoelhoFlexE] = useState(135);
  const [gJoelhoPopD, setGJoelhoPopD] = useState(148);
  const [gJoelhoPopE, setGJoelhoPopE] = useState(148);
  const [gTornozeloDorsi1D, setGTornozeloDorsi1D] = useState(35);
  const [gTornozeloDorsi1E, setGTornozeloDorsi1E] = useState(35);
  const [gTornozeloDorsi2D, setGTornozeloDorsi2D] = useState(28);
  const [gTornozeloDorsi2E, setGTornozeloDorsi2E] = useState(28);
  const [gTornozeloPlantarD, setGTornozeloPlantarD] = useState(40);
  const [gTornozeloPlantarE, setGTornozeloPlantarE] = useState(40);
  const [gOmbroRotIntD, setGOmbroRotIntD] = useState(80);
  const [gOmbroRotIntE, setGOmbroRotIntE] = useState(80);
  const [gOmbroRotExtD, setGOmbroRotExtD] = useState(85);
  const [gOmbroRotExtE, setGOmbroRotExtE] = useState(85);
  const [gOmbroAbducaoD, setGOmbroAbducaoD] = useState(170);
  const [gOmbroAbducaoE, setGOmbroAbducaoE] = useState(170);

  // Orthopedic tests
  const [tOberD, setTOberD] = useState('Negativo');
  const [tOberE, setTOberE] = useState('Negativo');
  const [tThomasD, setTThomasD] = useState('Negativo');
  const [tThomasE, setTThomasE] = useState('Negativo');
  const [tThomasAngD, setTThomasAngD] = useState<number | ''>('');
  const [tThomasAngE, setTThomasAngE] = useState<number | ''>('');
  
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
  const [stSupino, setStSupino] = useState('');
  const [stRemada, setStRemada] = useState('');
  const [stDesenvolvimento, setStDesenvolvimento] = useState('');
  const [stPuxada, setStPuxada] = useState('');
  const [stRotExterna, setStRotExterna] = useState('');
  const [stRotInterna, setStRotInterna] = useState('');
  const [stAbducao, setStAbducao] = useState('');
  const [stObs, setStObs] = useState('');

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
        const resRep = await fetch('/api/reports');
        const jsonRep = await resRep.json();
        if (jsonRep.success) setReports(jsonRep.data);
      } else if (activeTab === 'testes_forca') {
        const resSt = await fetch('/api/strength-tests');
        const jsonSt = await resSt.json();
        if (jsonSt.success) setStrengthTests(jsonSt.data);
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
      setAsSex(client.dadosPessoais?.sexo || 'M');

      // Buscar avaliação física mais recente deste aluno
      const past = assessments
        .filter((a: any) => {
          const aClientId = typeof a.clienteId === 'object' ? a.clienteId?._id : a.clienteId;
          return aClientId === asClient;
        })
        .sort((a: any, b: any) => b.data.localeCompare(a.data));

      if (past.length > 0) {
        const latest = past[0];
        setAsHeight(latest.dadosMedidos?.altura?.toString() || '1.70');
        setAsWeight(latest.dadosMedidos?.peso?.toString() || '70');
        setAsObjetivoPrincipal(latest.dadosMedidos?.objetivoPrincipal || '');
        setAsObjetivoMeses(latest.dadosMedidos?.objetivoMeses || 3);
        setAsTipoObjetivo(latest.dadosMedidos?.tipoObjetivo || '');
        setAsFreqSemanal(latest.dadosMedidos?.freqSemanal || 3);

        if (latest.dadosMedidos?.saudeGeral) {
          setAsPressao(latest.dadosMedidos.saudeGeral.pressaoArterial || '120/80 mmHg');
          setAsSono(latest.dadosMedidos.saudeGeral.sono || '7-8 h por noite');
          setAsNutricao(latest.dadosMedidos.saudeGeral.nutricao || 'Adequada');
          setAsAtivFisica(latest.dadosMedidos.saudeGeral.atividadeFisica || '4x por semana');
          setAsMedicamentos(latest.dadosMedidos.saudeGeral.medicamentos || 'Nenhum');
          setAsCirurgias(latest.dadosMedidos.saudeGeral.cirurgias || 'Nenhuma');
          setAsQueixas(latest.dadosMedidos.saudeGeral.queixas || 'Nenhuma');
        }

        if (latest.dadosMedidos?.circunferencias) {
          setAsCirc({
            pescoco: latest.dadosMedidos.circunferencias.pescoco || 0,
            ombros: latest.dadosMedidos.circunferencias.ombros || 0,
            torax: latest.dadosMedidos.circunferencias.torax || 0,
            cintura: latest.dadosMedidos.circunferencias.cintura || 0,
            abdomen: latest.dadosMedidos.circunferencias.abdomen || 0,
            quadril: latest.dadosMedidos.circunferencias.quadril || 0,
            braçoD: latest.dadosMedidos.circunferencias.braçoD || 0,
            braçoE: latest.dadosMedidos.circunferencias.braçoE || 0,
            antebraçoD: latest.dadosMedidos.circunferencias.antebraçoD || 0,
            antebraçoE: latest.dadosMedidos.circunferencias.antebraçoE || 0,
            coxaD: latest.dadosMedidos.circunferencias.coxaD || 0,
            coxaE: latest.dadosMedidos.circunferencias.coxaE || 0,
            panturrilhaD: latest.dadosMedidos.circunferencias.panturrilhaD || 0,
            panturrilhaE: latest.dadosMedidos.circunferencias.panturrilhaE || 0
          });
        }

        if (latest.dadosMedidos?.dobras) {
          setAsDobras({
            peitoral: latest.dadosMedidos.dobras.peitoral || 0,
            triceps: latest.dadosMedidos.dobras.triceps || 0,
            subescapular: latest.dadosMedidos.dobras.subescapular || 0,
            subaxilar: latest.dadosMedidos.dobras.subaxilar || 0,
            suprailiaca: latest.dadosMedidos.dobras.suprailiaca || 0,
            abdomen: latest.dadosMedidos.dobras.abdomen || 0,
            coxa: latest.dadosMedidos.dobras.coxa || 0,
            panturrilha: latest.dadosMedidos.dobras.panturrilha || 0
          });
        }

        if (latest.dadosMedidos?.goniometria) {
          setAsGonio({
            quadrilFlexao1D: latest.dadosMedidos.goniometria.quadrilFlexao1D || 75,
            quadrilFlexao1E: latest.dadosMedidos.goniometria.quadrilFlexao1E || 75,
            quadrilFlexao2D: latest.dadosMedidos.goniometria.quadrilFlexao2D || 110,
            quadrilFlexao2E: latest.dadosMedidos.goniometria.quadrilFlexao2E || 110,
            quadrilRotIntD: latest.dadosMedidos.goniometria.quadrilRotIntD || 40,
            quadrilRotIntE: latest.dadosMedidos.goniometria.quadrilRotIntE || 40,
            quadrilRotExtD: latest.dadosMedidos.goniometria.quadrilRotExtD || 40,
            quadrilRotExtE: latest.dadosMedidos.goniometria.quadrilRotExtE || 40,
            joelhoFlexaoD: latest.dadosMedidos.goniometria.joelhoFlexaoD || 140,
            joelhoFlexaoE: latest.dadosMedidos.goniometria.joelhoFlexaoE || 140,
            joelhoPopliteoD: latest.dadosMedidos.goniometria.joelhoPopliteoD || 155,
            joelhoPopliteoE: latest.dadosMedidos.goniometria.joelhoPopliteoE || 155,
            tornozeloDorsi1D: latest.dadosMedidos.goniometria.tornozeloDorsi1D || 40,
            tornozeloDorsi1E: latest.dadosMedidos.goniometria.tornozeloDorsi1E || 40,
            tornozeloDorsi2D: latest.dadosMedidos.goniometria.tornozeloDorsi2D || 20,
            tornozeloDorsi2E: latest.dadosMedidos.goniometria.tornozeloDorsi2E || 20,
            tornozeloFlexaoPlantarD: latest.dadosMedidos.goniometria.tornozeloFlexaoPlantarD || 45,
            tornozeloFlexaoPlantarE: latest.dadosMedidos.goniometria.tornozeloFlexaoPlantarE || 45,
            ombroRotIntD: latest.dadosMedidos.goniometria.ombroRotIntD || 85,
            ombroRotIntE: latest.dadosMedidos.goniometria.ombroRotIntE || 85,
            ombroRotExtD: latest.dadosMedidos.goniometria.ombroRotExtD || 90,
            ombroRotExtE: latest.dadosMedidos.goniometria.ombroRotExtE || 90,
            ombroAbducaoD: latest.dadosMedidos.goniometria.ombroAbducaoD || 180,
            ombroAbducaoE: latest.dadosMedidos.goniometria.ombroAbducaoE || 180
          });
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
        // Load attached PDF if exists
        if (latest.pdf_url) {
          setAsPdfUrl(latest.pdf_url);
          setAsPdfAttachName('PDF anexado anteriormente');
        } else {
          setAsPdfUrl('');
          setAsPdfAttachName('');
        }
      } else {
        // Valores iniciais padrões se não houver histórico
        setAsHeight('1.70');
        setAsWeight('70');
        setAsObjetivoPrincipal('Perda de gordura e ganho de massa magra');
        setAsObjetivoMeses(3);
        setAsTipoObjetivo('');
        setAsFreqSemanal(3);
        setAsPressao('120/80 mmHg');
        setAsSono('7-8 h por noite');
        setAsNutricao('Adequada');
        setAsAtivFisica('4x por semana');
        setAsMedicamentos('Nenhum');
        setAsCirurgias('Nenhuma');
        setAsQueixas('Nenhuma');
        setAsCirc({
          pescoco: 38, ombros: 110, torax: 90, cintura: 80, abdomen: 82, quadril: 95,
          braçoD: 32, braçoE: 32, antebraçoD: 26, antebraçoE: 26, coxaD: 55, coxaE: 55, panturrilhaD: 36, panturrilhaE: 36
        });
        setAsDobras({
          peitoral: 10, triceps: 12, subescapular: 15, subaxilar: 11, suprailiaca: 14, abdomen: 18, coxa: 12, panturrilha: 10
        });
        setAsGonio({
          quadrilFlexao1D: 75, quadrilFlexao1E: 75,
          quadrilFlexao2D: 110, quadrilFlexao2E: 110,
          quadrilRotIntD: 40, quadrilRotIntE: 40,
          quadrilRotExtD: 40, quadrilRotExtE: 40,
          joelhoFlexaoD: 140, joelhoFlexaoE: 140,
          joelhoPopliteoD: 155, joelhoPopliteoE: 155,
          tornozeloDorsi1D: 40, tornozeloDorsi1E: 40,
          tornozeloDorsi2D: 20, tornozeloDorsi2E: 20,
          tornozeloFlexaoPlantarD: 45, tornozeloFlexaoPlantarE: 45,
          ombroRotIntD: 85, ombroRotIntE: 85,
          ombroRotExtD: 90, ombroRotExtE: 90,
          ombroAbducaoD: 180, ombroAbducaoE: 180
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
        let min = null;
        let max = null;
        if (asFreqSemanal === 2) {
          if (asSex === 'M' && asTipoObjetivo === 'Massa Magra') { min = 0.1; max = 0.25; }
          else if (asSex === 'F' && asTipoObjetivo === 'Emagrecimento') { min = 0.3; max = 0.6; }
        } else if (asFreqSemanal === 3) {
          if (asSex === 'M' && asTipoObjetivo === 'Massa Magra') { min = 0.2; max = 0.4; }
          else if (asSex === 'F' && asTipoObjetivo === 'Massa Magra') { min = 0.1; max = 0.2; }
        } else if (asFreqSemanal === 4) {
          if (asSex === 'M' && asTipoObjetivo === 'Emagrecimento') { min = 0.5; max = 0.8; }
          else if (asSex === 'F' && asTipoObjetivo === 'Massa Magra') { min = 0.2; max = 0.3; }
        } else if (asFreqSemanal === 5) {
          if (asSex === 'M' && asTipoObjetivo === 'Massa Magra') { min = 0.3; max = 0.5; }
          else if (asSex === 'F' && asTipoObjetivo === 'Emagrecimento') { min = 0.6; max = 1.0; }
        }

        if (min === null || max === null) {
          if (asTipoObjetivo === 'Emagrecimento') {
            if (asSex === 'F') { min = 0.3; max = 0.6; }
            else { min = 0.5; max = 0.8; }
          } else {
            if (asSex === 'F') { min = 0.1; max = 0.2; }
            else { min = 0.2; max = 0.4; }
          }
        }
        
        const totalSemanas = Math.round(asObjetivoMeses * 4.33);
        const minTotal = min * totalSemanas;
        const maxTotal = max * totalSemanas;
        const midTotal = (minTotal + maxTotal) / 2;
        
        if (asTipoObjetivo === 'Emagrecimento') {
          metaGorduraVal = parseFloat(midTotal.toFixed(1));
        } else {
          metaMassaVal = parseFloat(midTotal.toFixed(1));
        }
      }

      const payload = {
        clienteId: asClient,
        avaliadorId: '6668ab030303030303030302', // Camila Lima
        data: asDate,
        dadosMedidos: {
          idade: Number(asAge),
          peso: p,
          altura: a,
          sexo: asSex,
          objetivoPrincipal: asObjetivoPrincipal,
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
            peitoral: Number(asDobras.peitoral),
            triceps: Number(asDobras.triceps),
            subescapular: Number(asDobras.subescapular),
            subaxilar: Number(asDobras.subaxilar),
            suprailiaca: Number(asDobras.suprailiaca),
            abdomen: Number(asDobras.abdomen),
            coxa: Number(asDobras.coxa),
            panturrilha: Number(asDobras.panturrilha)
          },
          somaDobras: asSomaDobras,
          percentil: 50,
          goniometria: {
            quadrilFlexao1D: Number(asGonio.quadrilFlexao1D),
            quadrilFlexao1E: Number(asGonio.quadrilFlexao1E),
            quadrilFlexao2D: Number(asGonio.quadrilFlexao2D),
            quadrilFlexao2E: Number(asGonio.quadrilFlexao2E),
            quadrilRotIntD: Number(asGonio.quadrilRotIntD),
            quadrilRotIntE: Number(asGonio.quadrilRotIntE),
            quadrilRotExtD: Number(asGonio.quadrilRotExtD),
            quadrilRotExtE: Number(asGonio.quadrilRotExtE),
            joelhoFlexaoD: Number(asGonio.joelhoFlexaoD),
            joelhoFlexaoE: Number(asGonio.joelhoFlexaoE),
            joelhoPopliteoD: Number(asGonio.joelhoPopliteoD),
            joelhoPopliteoE: Number(asGonio.joelhoPopliteoE),
            tornozeloDorsi1D: Number(asGonio.tornozeloDorsi1D),
            tornozeloDorsi1E: Number(asGonio.tornozeloDorsi1E),
            tornozeloDorsi2D: Number(asGonio.tornozeloDorsi2D),
            tornozeloDorsi2E: Number(asGonio.tornozeloDorsi2E),
            tornozeloFlexaoPlantarD: Number(asGonio.tornozeloFlexaoPlantarD),
            tornozeloFlexaoPlantarE: Number(asGonio.tornozeloFlexaoPlantarE),
            ombroRotIntD: Number(asGonio.ombroRotIntD),
            ombroRotIntE: Number(asGonio.ombroRotIntE),
            ombroRotExtD: Number(asGonio.ombroRotExtD),
            ombroRotExtE: Number(asGonio.ombroRotExtE),
            ombroAbducaoD: Number(asGonio.ombroAbducaoD),
            ombroAbducaoE: Number(asGonio.ombroAbducaoE)
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
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setShowAssessmentModal(false);
        fetchData();
      } else {
        alert('Erro ao criar avaliação: ' + data.error);
      }
    } catch (err) {
      alert('Erro ao enviar.');
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
      setGQuadrilFlex1D(g.quadrilFlexao1D || 75); setGQuadrilFlex1E(g.quadrilFlexao1E || 75);
      setGQuadrilFlex2D(g.quadrilFlexao2D || 100); setGQuadrilFlex2E(g.quadrilFlexao2E || 102);
      setGQuadrilRotIntD(g.quadrilRotIntD || 35); setGQuadrilRotIntE(g.quadrilRotIntE || 36);
      setGQuadrilRotExtD(g.quadrilRotExtD || 40); setGQuadrilRotExtE(g.quadrilRotExtE || 40);
      setGJoelhoFlexD(g.joelhoFlexaoD || 135); setGJoelhoFlexE(g.joelhoFlexaoE || 135);
      setGJoelhoPopD(g.joelhoPopliteoD || 148); setGJoelhoPopE(g.joelhoPopliteoE || 148);
      setGTornozeloDorsi1D(g.tornozeloDorsi1D || 35); setGTornozeloDorsi1E(g.tornozeloDorsi1E || 35);
      setGTornozeloDorsi2D(g.tornozeloDorsi2D || 28); setGTornozeloDorsi2E(g.tornozeloDorsi2E || 28);
      setGTornozeloPlantarD(g.tornozeloFlexaoPlantarD || 40); setGTornozeloPlantarE(g.tornozeloFlexaoPlantarE || 40);
      setGOmbroRotIntD(g.ombroRotIntD || 80); setGOmbroRotIntE(g.ombroRotIntE || 80);
      setGOmbroRotExtD(g.ombroRotExtD || 85); setGOmbroRotExtE(g.ombroRotExtE || 85);
      setGOmbroAbducaoD(g.ombroAbducaoD || 170); setGOmbroAbducaoE(g.ombroAbducaoE || 170);
    }
    if (sections.includes('testes') && latest.dadosMedidos?.testesEspeciais) {
      const te = latest.dadosMedidos.testesEspeciais;
      if (te.oberD) setTOberD(te.oberD);
      if (te.oberE) setTOberE(te.oberE);
      if (te.thomasD) setTThomasD(te.thomasD);
      if (te.thomasE) setTThomasE(te.thomasE);
      if (te.thomasIliopsoasD != null) setTThomasAngD(te.thomasIliopsoasD);
      if (te.thomasIliopsoasE != null) setTThomasAngE(te.thomasIliopsoasE);
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
        profissionalId: professionalId || '6668ab030303030303030301', // Andre or dynamic
        data: repDate,
        conteudo: {
          queixaPrincipal: repType === 'simplificado' ? repContent : (repQueixas[0]?.dorOnde || 'Anamnese Completa'),
          dorEscala: repType === 'simplificado' ? Number(repPain) : Number(repQueixas[0]?.dorIntensidade || 5),
          exercicios: repExercicios,
          conduta: repContent
        },
        pdfName: `Relatorio_Fisioterapia_${Date.now()}.pdf`
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

        payload.goniometria = {
          quadrilFlexao1D: Number(gQuadrilFlex1D), quadrilFlexao1E: Number(gQuadrilFlex1E),
          quadrilFlexao2D: Number(gQuadrilFlex2D), quadrilFlexao2E: Number(gQuadrilFlex2E),
          quadrilRotIntD: Number(gQuadrilRotIntD), quadrilRotIntE: Number(gQuadrilRotIntE),
          quadrilRotExtD: Number(gQuadrilRotExtD), quadrilRotExtE: Number(gQuadrilRotExtE),
          joelhoFlexaoD: Number(gJoelhoFlexD), joelhoFlexaoE: Number(gJoelhoFlexE),
          joelhoPopliteoD: Number(gJoelhoPopD), joelhoPopliteoE: Number(gJoelhoPopE),
          tornozeloDorsi1D: Number(gTornozeloDorsi1D), tornozeloDorsi1E: Number(gTornozeloDorsi1E),
          tornozeloDorsi2D: Number(gTornozeloDorsi2D), tornozeloDorsi2E: Number(gTornozeloDorsi2E),
          tornozeloFlexaoPlantarD: Number(gTornozeloPlantarD), tornozeloFlexaoPlantarE: Number(gTornozeloPlantarE),
          ombroRotIntD: Number(gOmbroRotIntD), ombroRotIntE: Number(gOmbroRotIntE),
          ombroRotExtD: Number(gOmbroRotExtD), ombroRotExtE: Number(gOmbroRotExtE),
          ombroAbducaoD: Number(gOmbroAbducaoD), ombroAbducaoE: Number(gOmbroAbducaoE)
        };

        payload.testesEspeciais = {
          oberD: tOberD, oberE: tOberE,
          thomasD: tThomasD, thomasE: tThomasE,
          thomasAnguloD: tThomasAngD !== '' ? Number(tThomasAngD) : null,
          thomasAnguloE: tThomasAngE !== '' ? Number(tThomasAngE) : null
        };

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

  const handleCreateStrengthTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        clienteId: stClient,
        profissionalId: '6668ab030303030303030302', // Camila Lima
        data: stDate,
        exercicios: [
          { nome: 'Supino Reto', carga: Number(stSupino) || 0 },
          { nome: 'Remada Curvada / Máquina', carga: Number(stRemada) || 0 },
          { nome: 'Desenvolvimento de Ombros', carga: Number(stDesenvolvimento) || 0 },
          { nome: 'Puxada Alta / Lat Pulldown', carga: Number(stPuxada) || 0 },
          { nome: 'Rotação Externa de Ombro', carga: Number(stRotExterna) || 0 },
          { nome: 'Rotação Interna de Ombro', carga: Number(stRotInterna) || 0 },
          { nome: 'Abdução de Ombro', carga: Number(stAbducao) || 0 }
        ],
        analise: {
          riscoOmbro: Number(stRotExterna) / Number(stRotInterna) < 0.66,
          ratios: {
            rotExternaRotInterna: Number(stRotExterna) / Number(stRotInterna)
          }
        },
        observacoes: stObs,
        pdfName: `TesteForca_${stDate}.pdf`
      };
      const res = await fetch('/api/strength-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setShowStModal(false);
        fetchData();
      } else {
        alert('Erro ao criar teste de força: ' + data.error);
      }
    } catch (err) {
      alert('Erro.');
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
        instrucoes: newExInst
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
      const categoryList = editingWorkoutData[activeWorkoutCategory];
      const sheetIdx = categoryList.findIndex((f: any) => f.id === activeWorkoutSubTab);
      if (sheetIdx !== -1) {
        categoryList[sheetIdx].ultimaAtualizacao = new Date().toISOString().split('T')[0];
      }

      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientForWorkout._id,
          category: activeWorkoutCategory,
          workoutData: categoryList
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Ficha de treino salva com sucesso!');
        setSelectedClientForWorkout(null);
        setEditingWorkoutData(null);
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

  const filteredClients = clients.filter(c =>
    c.dadosPessoais?.nome?.toLowerCase().includes(workoutSearch.toLowerCase())
  );

  const filteredExercises = exercises.filter(ex => {
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
                  <div className="metric-card">
                    <div className="metric-info">
                      <h3>Consultório (Fisio)</h3>
                      <div className="value">{totalConsultorio}</div>
                    </div>
                    <div className="metric-icon indigo"><i className="fa-solid fa-stethoscope"></i></div>
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
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Agenda de Atendimentos</h1>
              <p>Gerenciamento de horários, presenças e agendamentos.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-card)', padding: '6px 12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  const d = new Date(simulatedDate + 'T00:00:00');
                  d.setDate(d.getDate() - 1);
                  setSimulatedDate(d.toISOString().split('T')[0]);
                }}><i className="fa-solid fa-chevron-left"></i></button>
                <input type="date" className="form-control" style={{ border: 'none', background: 'transparent', width: '130px', padding: '4px' }} value={simulatedDate} onChange={e => setSimulatedDate(e.target.value)} />
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  const d = new Date(simulatedDate + 'T00:00:00');
                  d.setDate(d.getDate() + 1);
                  setSimulatedDate(d.toISOString().split('T')[0]);
                }}><i className="fa-solid fa-chevron-right"></i></button>
                <button className="btn btn-primary btn-sm" onClick={() => setSimulatedDate(new Date().toISOString().split('T')[0])}>Hoje</button>
              </div>
              <div className="page-size-selector">
                <span>Exibir:</span>
                <select value={getPageSize('dashboard')} onChange={e => setPageSizeForKey('dashboard', Number(e.target.value))}>
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={15}>15</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={() => {
                setAptDate(new Date().toISOString().split('T')[0]);
                setShowAptModal(true);
              }}>
                <i className="fa-solid fa-calendar-plus"></i> Novo Agendamento
              </button>
            </div>
          </div>

          <div className="content-panel">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data / Hora</th>
                    <th>Tipo</th>
                    <th>Serviço</th>
                    <th>Aluno</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'dashboard';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const filtered = appointments.filter(a => a.data === simulatedDate);
                    const totalPages = Math.ceil(filtered.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = filtered.slice((curP - 1) * size, curP * size);

                    return paginated.map(a => (
                      <tr key={a._id}>
                        <td><strong>{a.data}</strong> às {a.horario}</td>
                        <td>
                          <span className={`badge ${a.tipo === 'academia' ? 'badge-success' : 'badge-info'}`}>
                            {a.tipo === 'academia' ? 'Academia' : 'Fisioterapia'}
                          </span>
                        </td>
                        <td>{a.servico}</td>
                        <td>{a.clienteId?.dadosPessoais?.nome || 'Aluno Removido'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${a.status === 'presenca' ? 'badge-success' : a.status === 'cancelado' ? 'badge-danger' : 'badge-warning'}`}>
                            {a.status === 'presenca' ? 'Presença Confirmada' : a.status === 'cancelado' ? 'Cancelado' : 'Agendado'}
                          </span>
                        </td>
                        <td>
                          {a.status === 'agendado' && (
                            <>
                              <button className="btn btn-success btn-sm" style={{ marginRight: '8px' }} onClick={() => handleUpdateAptStatus(a._id, 'presenca')}>
                                Confirmar Presença
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleUpdateAptStatus(a._id, 'cancelado')}>
                                Cancelar
                              </button>
                            </>
                          )}
                          {a.status === 'presenca' && (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleUpdateAptStatus(a._id, 'agendado')}>
                              Desmarcar Presença
                            </button>
                          )}
                          {a.status === 'cancelado' && (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleUpdateAptStatus(a._id, 'agendado')}>
                              Reativar
                            </button>
                          )}
                        </td>
                      </tr>
                    ));
                  })()}
                  {appointments.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state-card">
                          <i className="fa-solid fa-calendar-xmark empty-state-icon"></i>
                          <div className="empty-state-title">Nenhum agendamento</div>
                          <div className="empty-state-desc">Não há registros de agendamentos no sistema.</div>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => { setAptDate(new Date().toISOString().split('T')[0]); setShowAptModal(true); }}>
                            <i className="fa-solid fa-calendar-plus"></i> Novo Agendamento
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {appointments.length > 0 && (
              <Pagination
                currentPage={getPage('dashboard')}
                totalItems={appointments.length}
                itemsPerPage={getPageSize('dashboard')}
                onPageChange={page => setPage('dashboard', page)}
              />
            )}
          </div>
        </>
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
                            <img src={c.dadosPessoais?.sexo === 'F' ? '/avatar_feminino.png' : '/avatar_masculino.png'} alt="avatar" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
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
                    <div style={{ maxWidth: '400px', flexGrow: 1 }}>
                      <input type="text" className="form-control" placeholder="Buscar aluno..." value={workoutSearch} onChange={e => { setPage('treinos_prof_clients', 1); setWorkoutSearch(e.target.value); }} />
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
                            const hasWorkout = userWorkout && userWorkout.fichasMonitorado?.some((f: any) => f.exercicios?.length > 0);
                            return (
                              <tr key={c._id}>
                                <td><strong>{c.dadosPessoais?.nome}</strong><br/><small style={{ color: 'var(--text-dim)' }}>{c.dadosPessoais?.email}</small></td>
                                <td>{c.dadosComerciais?.planoId?.nome || 'Personalizado'}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <span className={`badge ${hasWorkout ? 'badge-success' : 'badge-warning'}`}>
                                    {hasWorkout ? 'Ficha Ativa' : 'Sem Ficha'}
                                  </span>
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
                            <td colSpan={4}>
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
                      <a href="/api/exercises/export" className="btn btn-secondary" download>
                        <i className="fa-solid fa-file-export"></i> Exportar (.xlsx)
                      </a>
                      <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                        <i className="fa-solid fa-file-import"></i> Importar (.xlsx)
                      </button>
                      <a href="/api/exercises/template" className="btn btn-secondary" download style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fa-solid fa-download"></i> Baixar Template
                      </a>
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

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'var(--bg-darker)', padding: '6px', borderRadius: '8px' }}>
                      {(['A', 'B', 'C'] as const).map(tab => (
                        <button key={tab} className={`btn btn-sm ${activeWorkoutSubTab === tab ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setActiveWorkoutSubTab(tab)}>
                          Ficha {tab}
                        </button>
                      ))}
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

                          <div style={{ marginTop: '24px' }}>
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
                        <td>
                          <button className="btn btn-danger btn-sm" style={{ marginRight: '8px' }} onClick={() => handleDeleteAssessment(as._id)}>
                            <i className="fa-solid fa-trash"></i>
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => downloadAssessmentPDF(as, assessments)}>
                            <i className="fa-solid fa-file-pdf"></i> Laudo PDF
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                  {assessments.length === 0 && (
                    <tr>
                      <td colSpan={6}>
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
                setShowReportModal(true);
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
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'relatorios';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const q = getSearchQuery(listKey).toLowerCase();
                    const filtered = reports.filter(r => r.clienteId?.nome?.toLowerCase().includes(q));
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
                        <td>
                          <button className="btn btn-danger btn-sm" style={{ marginRight: '8px' }} onClick={() => handleDeleteReport(rep._id)}>
                            <i className="fa-solid fa-trash"></i>
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => downloadReportPDF(rep)}>
                            <i className="fa-solid fa-file-pdf"></i> PDF
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                  {reports.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-state-card">
                          <i className="fa-solid fa-file-medical empty-state-icon"></i>
                          <div className="empty-state-title">Nenhum relatório clínico</div>
                          <div className="empty-state-desc">Não há laudos ou relatórios de evolução fisioterápica.</div>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => { setRepDate(new Date().toISOString().split('T')[0]); setShowReportModal(true); }}>
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
                setShowStModal(true);
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
                    <th>Cargas (Supino / Remada)</th>
                    <th style={{ textAlign: 'center' }}>Avaliação Risco</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'testes_forca';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const q = getSearchQuery(listKey).toLowerCase();
                    const filtered = strengthTests.filter(st => st.clienteId?.nome?.toLowerCase().includes(q));
                    const totalPages = Math.ceil(filtered.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = filtered.slice((curP - 1) * size, curP * size);

                    return paginated.map(st => {
                      const supino = st.exercicios?.find((e: any) => e.nome === 'Supino Reto')?.carga || '-';
                      const remada = st.exercicios?.find((e: any) => e.nome === 'Remada Curvada / Máquina')?.carga || '-';
                      const risco = st.analise?.riscoOmbro;
                      return (
                        <tr key={st._id}>
                          <td><strong>{st.data}</strong></td>
                          <td><strong>{st.clienteId?.dadosPessoais?.nome || 'Aluno Removido'}</strong></td>
                          <td>Supino: {supino} kg / Remada: {remada} kg</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${risco ? 'badge-danger' : 'badge-success'}`}>
                              {risco ? 'Risco Elevado' : 'Seguro / Estável'}
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-danger btn-sm" style={{ marginRight: '8px' }} onClick={() => handleDeleteStrengthTest(st._id)}>
                              <i className="fa-solid fa-trash"></i>
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => downloadStrengthTestPDF(st, st.clienteId, st.profissionalId)}>
                              <i className="fa-solid fa-file-pdf color-danger"></i> Análise PDF
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                  {strengthTests.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-state-card">
                          <i className="fa-solid fa-dumbbell empty-state-icon"></i>
                          <div className="empty-state-title">Nenhum teste de força</div>
                          <div className="empty-state-desc">Não há avaliações de força muscular registradas.</div>
                          <button className="btn btn-primary btn-sm" onClick={() => { setStDate(new Date().toISOString().split('T')[0]); setShowStModal(true); }}>
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
                    const filtered = prontuarios.filter(p => p.clienteId?.nome?.toLowerCase().includes(q));
                    const totalPages = Math.ceil(filtered.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = filtered.slice((curP - 1) * size, curP * size);

                    return paginated.map(pr => (
                      <tr key={pr._id}>
                        <td><strong>{pr.data}</strong></td>
                        <td><strong>{pr.clienteId?.dadosPessoais?.nome || 'Aluno Removido'}</strong></td>
                        <td><small style={{ color: 'var(--text-main)' }}>{(pr.conteudo || '').substring(0, 120)}{(pr.conteudo || '').length > 120 ? '...' : ''}</small></td>
                        <td style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => downloadProntuarioPDF(pr, pr.clienteId)}>
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
                    <label>Modalidade</label>
                    <select className="select-custom" value={aptType} onChange={e => setAptType(e.target.value as any)}>
                      <option value="academia">Academia</option>
                      <option value="consultorio">Fisioterapia</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Serviço</label>
                    <select className="select-custom" value={aptService} onChange={e => setAptService(e.target.value)}>
                      {aptType === 'academia' ? (
                        <>
                          <option value="Treino Monitorado">Treino Monitorado (Consome Crédito)</option>
                          <option value="Treino Livre">Treino Livre (Sem Custo)</option>
                          <option value="Recovery">Recovery (Sem Custo)</option>
                          <option value="Avaliação Física">Avaliação Física (Sem Custo)</option>
                          <option value="Teste de Força">Teste de Força (Sem Custo)</option>
                          <option value="Emergência">Atendimento de Emergência (Sem Custo)</option>
                          <option value="Massagem">Massagem (Consome Crédito Massagem - Sábados)</option>
                        </>
                      ) : (
                        <>
                          <option value="Avaliação Fisioterápica">Avaliação Fisioterápica</option>
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
            <div className="modal-header">
              <h3>Nova Avaliação Física Fisioterapêutica</h3>
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
                  </>
                )}

                {asStep === 2 && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Sexo Biológico</label>
                        <select className="form-control" value={asSex} onChange={e => setAsSex(e.target.value)}>
                          <option value="M">Masculino</option>
                          <option value="F">Feminino</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Idade (anos)</label>
                        <input type="number" className="form-control" value={asAge} onChange={e => setAsAge(Number(e.target.value))} required />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Peso (kg)</label>
                        <input type="number" step="0.1" className="form-control" value={asWeight} onChange={e => setAsWeight(e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label>Altura (m)</label>
                        <input type="number" step="0.01" className="form-control" value={asHeight} onChange={e => setAsHeight(e.target.value)} required />
                      </div>
                    </div>
                    <h4 style={{ color: 'var(--color-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginTop: '16px', marginBottom: '12px' }}>Saúde Geral</h4>
                    <div className="form-group">
                      <label>Horas de Sono / Noite</label>
                      <input type="text" className="form-control" value={asSono} onChange={e => setAsSono(e.target.value)} />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Nutrição</label>
                        <input type="text" className="form-control" value={asNutricao} onChange={e => setAsNutricao(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Atividade Física</label>
                        <input type="text" className="form-control" value={asAtivFisica} onChange={e => setAsAtivFisica(e.target.value)} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Medicamentos em Uso</label>
                      <input type="text" className="form-control" value={asMedicamentos} onChange={e => setAsMedicamentos(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Cirurgias Anteriores</label>
                      <input type="text" className="form-control" value={asCirurgias} onChange={e => setAsCirurgias(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Principais Queixas / Dores</label>
                      <input type="text" className="form-control" value={asQueixas} onChange={e => setAsQueixas(e.target.value)} />
                    </div>
                  </>
                )}

                {asStep === 3 && (
                  <>
                    <h4 style={{ color: 'var(--color-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '16px' }}>Circunferências Corporais (cm)</h4>
                    <div className="form-row">
                      <div className="form-group"><label>Pescoço</label><input type="number" step="0.1" className="form-control" value={asCirc.pescoco} onChange={e => setAsCirc({ ...asCirc, pescoco: Number(e.target.value) })} /></div>
                      <div className="form-group"><label>Ombros</label><input type="number" step="0.1" className="form-control" value={asCirc.ombros} onChange={e => setAsCirc({ ...asCirc, ombros: Number(e.target.value) })} /></div>
                      <div className="form-group"><label>Tórax</label><input type="number" step="0.1" className="form-control" value={asCirc.torax} onChange={e => setAsCirc({ ...asCirc, torax: Number(e.target.value) })} /></div>
                      <div className="form-group"><label>Cintura</label><input type="number" step="0.1" className="form-control" value={asCirc.cintura} onChange={e => setAsCirc({ ...asCirc, cintura: Number(e.target.value) })} /></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label>Abdômen</label><input type="number" step="0.1" className="form-control" value={asCirc.abdomen} onChange={e => setAsCirc({ ...asCirc, abdomen: Number(e.target.value) })} /></div>
                      <div className="form-group"><label>Quadril</label><input type="number" step="0.1" className="form-control" value={asCirc.quadril} onChange={e => setAsCirc({ ...asCirc, quadril: Number(e.target.value) })} /></div>
                      <div className="form-group"><label>Braço Direito</label><input type="number" step="0.1" className="form-control" value={asCirc.braçoD} onChange={e => setAsCirc({ ...asCirc, braçoD: Number(e.target.value) })} /></div>
                      <div className="form-group"><label>Braço Esquerdo</label><input type="number" step="0.1" className="form-control" value={asCirc.braçoE} onChange={e => setAsCirc({ ...asCirc, braçoE: Number(e.target.value) })} /></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label>Antebraço D</label><input type="number" step="0.1" className="form-control" value={asCirc.antebraçoD} onChange={e => setAsCirc({ ...asCirc, antebraçoD: Number(e.target.value) })} /></div>
                      <div className="form-group"><label>Antebraço E</label><input type="number" step="0.1" className="form-control" value={asCirc.antebraçoE} onChange={e => setAsCirc({ ...asCirc, antebraçoE: Number(e.target.value) })} /></div>
                      <div className="form-group"><label>Coxa Direita</label><input type="number" step="0.1" className="form-control" value={asCirc.coxaD} onChange={e => setAsCirc({ ...asCirc, coxaD: Number(e.target.value) })} /></div>
                      <div className="form-group"><label>Coxa Esquerda</label><input type="number" step="0.1" className="form-control" value={asCirc.coxaE} onChange={e => setAsCirc({ ...asCirc, coxaE: Number(e.target.value) })} /></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group" style={{ maxWidth: '25%' }}><label>Panturrilha D</label><input type="number" step="0.1" className="form-control" value={asCirc.panturrilhaD} onChange={e => setAsCirc({ ...asCirc, panturrilhaD: Number(e.target.value) })} /></div>
                      <div className="form-group" style={{ maxWidth: '25%' }}><label>Panturrilha E</label><input type="number" step="0.1" className="form-control" value={asCirc.panturrilhaE} onChange={e => setAsCirc({ ...asCirc, panturrilhaE: Number(e.target.value) })} /></div>
                    </div>
                  </>
                )}

                {asStep === 4 && (
                  <>
                    <h4 style={{ color: 'var(--color-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '16px' }}>Dobras Cutâneas (mm)</h4>
                    <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Fórmula de Jackson & Pollock (7 Dobras).</p>
                    <div className="form-row">
                      <div className="form-group"><label>Peitoral</label><input type="number" step="0.1" className="form-control" value={asDobras.peitoral} onChange={e => setAsDobras({ ...asDobras, peitoral: Number(e.target.value) })} /></div>
                      <div className="form-group"><label>Tríceps</label><input type="number" step="0.1" className="form-control" value={asDobras.triceps} onChange={e => setAsDobras({ ...asDobras, triceps: Number(e.target.value) })} /></div>
                      <div className="form-group"><label>Subescapular</label><input type="number" step="0.1" className="form-control" value={asDobras.subescapular} onChange={e => setAsDobras({ ...asDobras, subescapular: Number(e.target.value) })} /></div>
                      <div className="form-group"><label>Subaxilar</label><input type="number" step="0.1" className="form-control" value={asDobras.subaxilar} onChange={e => setAsDobras({ ...asDobras, subaxilar: Number(e.target.value) })} /></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label>Supra-ilíaca</label><input type="number" step="0.1" className="form-control" value={asDobras.suprailiaca} onChange={e => setAsDobras({ ...asDobras, suprailiaca: Number(e.target.value) })} /></div>
                      <div className="form-group"><label>Abdômen</label><input type="number" step="0.1" className="form-control" value={asDobras.abdomen} onChange={e => setAsDobras({ ...asDobras, abdomen: Number(e.target.value) })} /></div>
                      <div className="form-group" style={{ flex: 2 }}><label>Coxa</label><input type="number" step="0.1" className="form-control" value={asDobras.coxa} onChange={e => setAsDobras({ ...asDobras, coxa: Number(e.target.value) })} /></div>
                    </div>
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
                      const checkAsymmetry = (d: number, e: number, label: string) => {
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
                      checkAsymmetry(asGonio.ombroAbducaoD, asGonio.ombroAbducaoE, 'Ombro - Abdução');
                      
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

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                      <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <h5 style={{ color: 'var(--color-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '8px' }}>Quadril</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Flexão (1) <small style={{ color: 'var(--text-dim)' }}>(70-80°)</small></span>
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '140px' }}>
                              <input type="number" className="form-control form-control-sm" placeholder="D" value={asGonio.quadrilFlexao1D} onChange={e => setAsGonio({ ...asGonio, quadrilFlexao1D: Number(e.target.value) })} />
                              <input type="number" className="form-control form-control-sm" placeholder="E" value={asGonio.quadrilFlexao1E} onChange={e => setAsGonio({ ...asGonio, quadrilFlexao1E: Number(e.target.value) })} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Flexão (2) <small style={{ color: 'var(--text-dim)' }}>(100-125°)</small></span>
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '140px' }}>
                              <input type="number" className="form-control form-control-sm" placeholder="D" value={asGonio.quadrilFlexao2D} onChange={e => setAsGonio({ ...asGonio, quadrilFlexao2D: Number(e.target.value) })} />
                              <input type="number" className="form-control form-control-sm" placeholder="E" value={asGonio.quadrilFlexao2E} onChange={e => setAsGonio({ ...asGonio, quadrilFlexao2E: Number(e.target.value) })} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Rot. Interna <small style={{ color: 'var(--text-dim)' }}>(40-45°)</small></span>
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '140px' }}>
                              <input type="number" className="form-control form-control-sm" placeholder="D" value={asGonio.quadrilRotIntD} onChange={e => setAsGonio({ ...asGonio, quadrilRotIntD: Number(e.target.value) })} />
                              <input type="number" className="form-control form-control-sm" placeholder="E" value={asGonio.quadrilRotIntE} onChange={e => setAsGonio({ ...asGonio, quadrilRotIntE: Number(e.target.value) })} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Rot. Externa <small style={{ color: 'var(--text-dim)' }}>(40-45°)</small></span>
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '140px' }}>
                              <input type="number" className="form-control form-control-sm" placeholder="D" value={asGonio.quadrilRotExtD} onChange={e => setAsGonio({ ...asGonio, quadrilRotExtD: Number(e.target.value) })} />
                              <input type="number" className="form-control form-control-sm" placeholder="E" value={asGonio.quadrilRotExtE} onChange={e => setAsGonio({ ...asGonio, quadrilRotExtE: Number(e.target.value) })} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <h5 style={{ color: 'var(--color-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '8px' }}>Joelho</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Flexão <small style={{ color: 'var(--text-dim)' }}>(135-150°)</small></span>
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '140px' }}>
                              <input type="number" className="form-control form-control-sm" placeholder="D" value={asGonio.joelhoFlexaoD} onChange={e => setAsGonio({ ...asGonio, joelhoFlexaoD: Number(e.target.value) })} />
                              <input type="number" className="form-control form-control-sm" placeholder="E" value={asGonio.joelhoFlexaoE} onChange={e => setAsGonio({ ...asGonio, joelhoFlexaoE: Number(e.target.value) })} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Poplíteo <small style={{ color: 'var(--text-dim)' }}>(155-160°)</small></span>
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '140px' }}>
                              <input type="number" className="form-control form-control-sm" placeholder="D" value={asGonio.joelhoPopliteoD} onChange={e => setAsGonio({ ...asGonio, joelhoPopliteoD: Number(e.target.value) })} />
                              <input type="number" className="form-control form-control-sm" placeholder="E" value={asGonio.joelhoPopliteoE} onChange={e => setAsGonio({ ...asGonio, joelhoPopliteoE: Number(e.target.value) })} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <h5 style={{ color: 'var(--color-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '8px' }}>Tornozelo</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Dorsi (1) <small style={{ color: 'var(--text-dim)' }}>(35-45°)</small></span>
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '140px' }}>
                              <input type="number" className="form-control form-control-sm" placeholder="D" value={asGonio.tornozeloDorsi1D} onChange={e => setAsGonio({ ...asGonio, tornozeloDorsi1D: Number(e.target.value) })} />
                              <input type="number" className="form-control form-control-sm" placeholder="E" value={asGonio.tornozeloDorsi1E} onChange={e => setAsGonio({ ...asGonio, tornozeloDorsi1E: Number(e.target.value) })} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Dorsi (2) <small style={{ color: 'var(--text-dim)' }}>(20°)</small></span>
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '140px' }}>
                              <input type="number" className="form-control form-control-sm" placeholder="D" value={asGonio.tornozeloDorsi2D} onChange={e => setAsGonio({ ...asGonio, tornozeloDorsi2D: Number(e.target.value) })} />
                              <input type="number" className="form-control form-control-sm" placeholder="E" value={asGonio.tornozeloDorsi2E} onChange={e => setAsGonio({ ...asGonio, tornozeloDorsi2E: Number(e.target.value) })} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>F. Plantar <small style={{ color: 'var(--text-dim)' }}>(40-50°)</small></span>
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '140px' }}>
                              <input type="number" className="form-control form-control-sm" placeholder="D" value={asGonio.tornozeloFlexaoPlantarD} onChange={e => setAsGonio({ ...asGonio, tornozeloFlexaoPlantarD: Number(e.target.value) })} />
                              <input type="number" className="form-control form-control-sm" placeholder="E" value={asGonio.tornozeloFlexaoPlantarE} onChange={e => setAsGonio({ ...asGonio, tornozeloFlexaoPlantarE: Number(e.target.value) })} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <h5 style={{ color: 'var(--color-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '8px' }}>Ombro</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Rot. Interna <small style={{ color: 'var(--text-dim)' }}>(80-90°)</small></span>
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '140px' }}>
                              <input type="number" className="form-control form-control-sm" placeholder="D" value={asGonio.ombroRotIntD} onChange={e => setAsGonio({ ...asGonio, ombroRotIntD: Number(e.target.value) })} />
                              <input type="number" className="form-control form-control-sm" placeholder="E" value={asGonio.ombroRotIntE} onChange={e => setAsGonio({ ...asGonio, ombroRotIntE: Number(e.target.value) })} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Rot. Externa <small style={{ color: 'var(--text-dim)' }}>(80-100°)</small></span>
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '140px' }}>
                              <input type="number" className="form-control form-control-sm" placeholder="D" value={asGonio.ombroRotExtD} onChange={e => setAsGonio({ ...asGonio, ombroRotExtD: Number(e.target.value) })} />
                              <input type="number" className="form-control form-control-sm" placeholder="E" value={asGonio.ombroRotExtE} onChange={e => setAsGonio({ ...asGonio, ombroRotExtE: Number(e.target.value) })} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Abdução <small style={{ color: 'var(--text-dim)' }}>(180°)</small></span>
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '140px' }}>
                              <input type="number" className="form-control form-control-sm" placeholder="D" value={asGonio.ombroAbducaoD} onChange={e => setAsGonio({ ...asGonio, ombroAbducaoD: Number(e.target.value) })} />
                              <input type="number" className="form-control form-control-sm" placeholder="E" value={asGonio.ombroAbducaoE} onChange={e => setAsGonio({ ...asGonio, ombroAbducaoE: Number(e.target.value) })} />
                            </div>
                          </div>
                        </div>
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
                      <input type="text" className="form-control" value={asObjetivoPrincipal} onChange={e => setAsObjetivoPrincipal(e.target.value)} placeholder="Objetivos do aluno..." required />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Meses para Adequação do Objetivo</label>
                        <select className="form-control" value={asObjetivoMeses} onChange={e => setAsObjetivoMeses(Number(e.target.value))}>
                          {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                            <option key={m} value={m}>{m} {m === 1 ? 'mês' : 'meses'}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Foco do Planejamento</label>
                        <select className="form-control" value={asTipoObjetivo} onChange={e => setAsTipoObjetivo(e.target.value)}>
                          <option value="">Não especificado</option>
                          <option value="Emagrecimento">Emagrecimento / Perda de Gordura</option>
                          <option value="Massa Magra">Ganho de Massa Magra</option>
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
                          const ref = getGoalReferenceInfo();
                          if (!ref) return null;
                          return (
                            <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid #10b981', borderRadius: '8px', padding: '12px 16px', marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontWeight: 700, color: '#10b981' }}>
                                <i className="fa-solid fa-calculator"></i> Tabela de Referência Baseada no Aluno
                              </div>
                              <p style={{ margin: '0 0 6px 0' }}>Aluno: <strong>{ref.labelSexo}</strong> | Foco: <strong>{ref.labelTipo}</strong> | Freq: <strong>{ref.freq}x/semana</strong></p>
                              <p style={{ margin: '0 0 6px 0' }}>Taxa recomendada por semana: <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>{ref.min} kg a {ref.max} kg</span></p>
                              <p style={{ margin: 0 }}>Estimativa sugerida para <strong>{ref.meses} {ref.meses === 1 ? 'mês' : 'meses'}</strong> ({ref.totalSemanas} semanas): <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>{ref.minTotal} kg a {ref.maxTotal} kg</span></p>
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
                    <button type="button" className="btn btn-primary" onClick={() => setAsStep(asStep + 1)}>
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
            <div className="modal-header">
              <h3>Novo Relatório Fisioterápico</h3>
              <button className="modal-close" onClick={handleCloseReport}>&times;</button>
            </div>
            <form onSubmit={handleCreateReport}>
              <div className="modal-body" style={{ maxHeight: '74vh', overflowY: 'auto', padding: '20px' }}>
                
                {/* Tipo de Relatório */}
                <div className="form-group" style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <label style={{ fontWeight: '600', color: 'var(--color-primary)' }}>Tipo de Relatório</label>
                  <div style={{ display: 'flex', gap: '20px', marginTop: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                      <input type="radio" name="repType" checked={repType === 'simplificado'} onChange={() => { setRepType('simplificado'); setRepActiveStep(1); }} />
                      Simplificado (1 Página)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
                      <input type="radio" name="repType" checked={repType === 'completo'} onChange={() => { setRepType('completo'); setRepActiveStep(1); }} />
                      Completo (4 Páginas - Wizard 6 Etapas)
                    </label>
                  </div>
                </div>

                {/* Wizard Progress Bar for Completo */}
                {repType === 'completo' && (
                  <div className="wizard-progress" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', position: 'relative', overflowX: 'auto', gap: '10px', paddingBottom: '8px' }}>
                    {[
                      { step: 1, label: 'Anamnese' },
                      { step: 2, label: 'Histórico & Hábitos' },
                      { step: 3, label: 'Goniometria & Ober' },
                      { step: 4, label: 'Termo & Exames' },
                      { step: 5, label: 'Testes Avançados' },
                      { step: 6, label: 'Conduta & Salvar' }
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
                          <div><strong>Gênero:</strong> {selCli.dadosPessoais?.sexo === 'M' ? 'Masculino' : 'Feminino'}</div>
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
                {repType === 'completo' && repActiveStep === 2 && (
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
                {repType === 'completo' && repActiveStep === 3 && (
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
                            <th>Movimento / Articulação</th>
                            <th style={{ width: '25%', textAlign: 'center' }}>Direito (°)</th>
                            <th style={{ width: '25%', textAlign: 'center' }}>Esquerdo (°)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { label: 'Quadril - Flexão J. Fletido', dVal: gQuadrilFlex1D, setD: setGQuadrilFlex1D, eVal: gQuadrilFlex1E, setE: setGQuadrilFlex1E },
                            { label: 'Quadril - Flexão J. Estendido', dVal: gQuadrilFlex2D, setD: setGQuadrilFlex2D, eVal: gQuadrilFlex2E, setE: setGQuadrilFlex2E },
                            { label: 'Quadril - Rotação Interna', dVal: gQuadrilRotIntD, setD: setGQuadrilRotIntD, eVal: gQuadrilRotIntE, setE: setGQuadrilRotIntE },
                            { label: 'Quadril - Rotação Externa', dVal: gQuadrilRotExtD, setD: setGQuadrilRotExtD, eVal: gQuadrilRotExtE, setE: setGQuadrilRotExtE },
                            { label: 'Joelho - Flexão', dVal: gJoelhoFlexD, setD: setGJoelhoFlexD, eVal: gJoelhoFlexE, setE: setGJoelhoFlexE },
                            { label: 'Joelho - Ângulo Poplíteo', dVal: gJoelhoPopD, setD: setGJoelhoPopD, eVal: gJoelhoPopE, setE: setGJoelhoPopE },
                            { label: 'Tornozelo - Dorsiflexão J. Estendido', dVal: gTornozeloDorsi1D, setD: setGTornozeloDorsi1D, eVal: gTornozeloDorsi1E, setE: setGQuadrilFlex1E },
                            { label: 'Tornozelo - Dorsiflexão J. Fletido', dVal: gTornozeloDorsi2D, setD: setGTornozeloDorsi2D, eVal: gTornozeloDorsi2E, setE: setGQuadrilFlex2E },
                            { label: 'Tornozelo - Flexão Plantar', dVal: gTornozeloPlantarD, setD: setGTornozeloPlantarD, eVal: gTornozeloPlantarE, setE: setGTornozeloPlantarE },
                            { label: 'Ombro - Rotação Interna', dVal: gOmbroRotIntD, setD: setGOmbroRotIntD, eVal: gOmbroRotIntE, setE: setGOmbroRotIntE },
                            { label: 'Ombro - Rotação Externa', dVal: gOmbroRotExtD, setD: setGOmbroRotExtD, eVal: gOmbroRotExtE, setE: setGOmbroRotExtE },
                            { label: 'Ombro - Abdução', dVal: gOmbroAbducaoD, setD: setGOmbroAbducaoD, eVal: gOmbroAbducaoE, setE: setGOmbroAbducaoE }
                          ].map((row, rIdx) => (
                            <tr key={rIdx}>
                              <td><strong>{row.label}</strong></td>
                              <td><input type="number" className="form-control form-control-sm" style={{ textAlign: 'center', height: '28px' }} value={row.dVal} onChange={e => row.setD(Number(e.target.value))} /></td>
                              <td><input type="number" className="form-control form-control-sm" style={{ textAlign: 'center', height: '28px' }} value={row.eVal} onChange={e => row.setE(Number(e.target.value))} /></td>
                            </tr>
                          ))}
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
                          <div className="form-group">
                            <label style={{ fontSize: '0.75rem' }}>Ângulo Encurtamento Direito (Thomas)</label>
                            <input type="number" className="form-control form-control-sm" placeholder="Graus (°)..." value={tThomasAngD} onChange={e => setTThomasAngD(e.target.value !== '' ? Number(e.target.value) : '')} />
                          </div>
                        )}
                        {tThomasE === 'Positivo' && (
                          <div className="form-group">
                            <label style={{ fontSize: '0.75rem' }}>Ângulo Encurtamento Esquerdo (Thomas)</label>
                            <input type="number" className="form-control form-control-sm" placeholder="Graus (°)..." value={tThomasAngE} onChange={e => setTThomasAngE(e.target.value !== '' ? Number(e.target.value) : '')} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* PASSO 4: TERMOGRAFIA E EXAMES COMPLEMENTARES */}
                {repType === 'completo' && repActiveStep === 4 && (
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
                {repType === 'completo' && repActiveStep === 5 && (
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
                      <h5 style={{ marginBottom: '12px' }}><i className="fa-solid fa-chevron-right" style={{ color: 'var(--color-primary)', marginRight: '6px', fontSize: '0.8rem' }}></i> Estrela de Maigne (Rosa dos Ventos Clínica de Dor)</h5>
                      
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
                            const sex = selCli?.dadosPessoais?.sexo || 'M';
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
                {((repType === 'simplificado') || (repType === 'completo' && repActiveStep === 6)) && (
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
                  {repType === 'completo' && repActiveStep > 1 && (
                    <button type="button" className="btn btn-secondary" onClick={() => setRepActiveStep(repActiveStep - 1)}>
                      Anterior
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={handleCloseReport}>Cancelar</button>
                  {repType === 'completo' && repActiveStep < 6 ? (
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
            <div className="modal-header">
              <h3>Registrar Teste de Força</h3>
              <button className="modal-close" onClick={handleCloseSt}>&times;</button>
            </div>
            <form onSubmit={handleCreateStrengthTest}>
              <div className="modal-body" style={{ padding: '20px' }}>
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
                <h5 style={{ margin: '16px 0 8px 0', color: 'var(--color-primary)' }}>Cargas Máximas (kg)</h5>
                <div className="form-row">
                  <div className="form-group">
                    <label>Supino Reto</label>
                    <input type="number" className="form-control" value={stSupino} onChange={e => setStSupino(e.target.value)} placeholder="kg" required />
                  </div>
                  <div className="form-group">
                    <label>Remada Curvada</label>
                    <input type="number" className="form-control" value={stRemada} onChange={e => setStRemada(e.target.value)} placeholder="kg" required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Desenvolvimento</label>
                    <input type="number" className="form-control" value={stDesenvolvimento} onChange={e => setStDesenvolvimento(e.target.value)} placeholder="kg" required />
                  </div>
                  <div className="form-group">
                    <label>Puxada Alta</label>
                    <input type="number" className="form-control" value={stPuxada} onChange={e => setStPuxada(e.target.value)} placeholder="kg" required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Rot. Externa</label>
                    <input type="number" className="form-control" value={stRotExterna} onChange={e => setStRotExterna(e.target.value)} placeholder="kg" required />
                  </div>
                  <div className="form-group">
                    <label>Rot. Interna</label>
                    <input type="number" className="form-control" value={stRotInterna} onChange={e => setStRotInterna(e.target.value)} placeholder="kg" required />
                  </div>
                  <div className="form-group">
                    <label>Abdução</label>
                    <input type="number" className="form-control" value={stAbducao} onChange={e => setStAbducao(e.target.value)} placeholder="kg" required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Observações / Análise Clínica</label>
                  <textarea className="form-control" value={stObs} onChange={e => setStObs(e.target.value)} placeholder="Anotações sobre desequilíbrios musculares..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseSt}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar Teste</button>
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
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const clientAssessments = assessments.filter(as => (as.clienteId?._id || as.clienteId) === detailClient._id);
                      if (clientAssessments.length === 0) {
                        return <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '12px' }}>Nenhuma avaliação cadastrada.</td></tr>;
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
                            <td>
                              <button className="btn btn-secondary btn-sm" onClick={() => downloadAssessmentPDF(as, assessments)}>
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
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const clientReports = reports.filter(rep => (rep.clienteId?._id || rep.clienteId) === detailClient._id);
                      if (clientReports.length === 0) {
                        return <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '12px' }}>Nenhum relatório cadastrado.</td></tr>;
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
                          <td>
                            <button className="btn btn-secondary btn-sm" onClick={() => downloadReportPDF(rep)}>
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








