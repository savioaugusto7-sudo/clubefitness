'use client';

import React, { useEffect, useState, useRef } from 'react';
import Pagination from './Pagination';
import SearchableSelect from './SearchableSelect';
import WorkoutBuilder from './WorkoutBuilder';
import { downloadReportPDF, downloadAssessmentPDF, downloadProntuarioPDF, downloadUnifiedProntuariosPDF, downloadStrengthTestPDF } from '@/utils/pdfGenerator';

interface DashboardProfessionalProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function DashboardProfessional({ activeTab, setActiveTab }: DashboardProfessionalProps) {
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
        setShowAssessmentModal(false);
        setShowReportModal(false);
        setShowStModal(false);
        setShowProntuarioModal(false);
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
          setAsYTest(latest.dadosMedidos.testesEspeciais.yTest || '');
          setAsStepDown(latest.dadosMedidos.testesEspeciais.stepDown || '');
          const maigneVal = latest.dadosMedidos.testesEspeciais.maigne || '';
          setAsMaigne(maigneVal);
          try {
            if (maigneVal && maigneVal.startsWith('{')) {
              const parsed = JSON.parse(maigneVal);
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
            } else {
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
          }
        }

        setAsPostura(latest.dadosMedidos?.postura || 'Nenhum desvio importante');
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
      }
    }
  }, [asClient, clients, assessments]);

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
      await fetch('/api/prontuarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clienteId: emergencyApt?.clienteId?._id || emergencyApt?.clienteId, data: emergencyApt?.data, conteudo: prontuarioObs }) });
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
            termografia: asTermografia,
            yTest: asYTest,
            stepDown: asStepDown,
            maigne: JSON.stringify(asMaigneData)
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
        pdfName: `Avaliacao_${asDate}.pdf`
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

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        clienteId: repClient,
        profissionalId: '6668ab030303030303030301', // Dr. Andre
        data: repDate,
        conteudo: {
          queixaPrincipal: repContent,
          dorEscala: Number(repPain)
        },
        pdfName: `Relatorio_Fisio_${repDate}.pdf`
      };
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setShowReportModal(false);
        fetchData();
      } else {
        alert('Erro ao criar relatório: ' + data.error);
      }
    } catch (err) {
      alert('Erro ao enviar.');
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
        profissionalId: '6668ab030303030303030301', // Dr. Andre
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
        observacao: ''
      });
      setEditingWorkoutData(updated);
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
                                <button className="btn btn-primary btn-sm" style={{ width: '100%', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)', fontWeight: 600 }} onClick={() => { handleOpenWorkoutEditor(client); setActiveTab('treino'); }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
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
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Exercício</th>
                                  <th style={{ width: '80px' }}>Séries</th>
                                  <th style={{ width: '100px' }}>Reps</th>
                                  <th style={{ width: '100px' }}>Carga</th>
                                  <th>Descanso</th>
                                  <th>Obs</th>
                                  <th>Remover</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sheet.exercicios?.map((ex: any, idx: number) => (
                                  <tr key={idx}>
                                    <td><strong>{ex.exercicioId}</strong></td>
                                    <td>
                                      <input type="number" className="form-control" style={{ padding: '6px', height: '30px' }} value={ex.series} onChange={e => handleUpdateExerciseField(idx, 'series', Number(e.target.value))} />
                                    </td>
                                    <td>
                                      <input type="text" className="form-control" style={{ padding: '6px', height: '30px' }} value={ex.repeticoes} onChange={e => handleUpdateExerciseField(idx, 'repeticoes', e.target.value)} />
                                    </td>
                                    <td>
                                      <input type="text" className="form-control" style={{ padding: '6px', height: '30px' }} value={ex.carga} onChange={e => handleUpdateExerciseField(idx, 'carga', e.target.value)} />
                                    </td>
                                    <td>
                                      <input type="text" className="form-control" style={{ padding: '6px', height: '30px' }} value={ex.descanso} onChange={e => handleUpdateExerciseField(idx, 'descanso', e.target.value)} />
                                    </td>
                                    <td>
                                      <input type="text" className="form-control" style={{ padding: '6px', height: '30px' }} value={ex.observacao} onChange={e => handleUpdateExerciseField(idx, 'observacao', e.target.value)} />
                                    </td>
                                    <td>
                                      <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => handleRemoveExerciseFromWorkout(idx)}>
                                        <i className="fa-solid fa-trash"></i>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {(!sheet.exercicios || sheet.exercicios.length === 0) && (
                                  <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
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
                          <option value="Treino Livre">Treino Livre</option>
                          <option value="Recovery">Recovery</option>
                        </>
                      ) : (
                        <>
                          <option value="Avaliação Fisioterápica">Avaliação Fisioterápica</option>
                          <option value="Emergência">Emergência</option>
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
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowAssessmentModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h3>Nova Avaliação Física Fisioterapêutica</h3>
              <button className="modal-close" onClick={() => setShowAssessmentModal(false)}>&times;</button>
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
                      <>
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
                      </>
                    )}
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
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '120px' }}>
                              <input type="number" className="form-control form-control-sm" placeholder="D" value={asGonio.quadrilFlexao1D} onChange={e => setAsGonio({ ...asGonio, quadrilFlexao1D: Number(e.target.value) })} />
                              <input type="number" className="form-control form-control-sm" placeholder="E" value={asGonio.quadrilFlexao1E} onChange={e => setAsGonio({ ...asGonio, quadrilFlexao1E: Number(e.target.value) })} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Flexão (2) <small style={{ color: 'var(--text-dim)' }}>(100-125°)</small></span>
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '120px' }}>
                              <input type="number" className="form-control form-control-sm" placeholder="D" value={asGonio.quadrilFlexao2D} onChange={e => setAsGonio({ ...asGonio, quadrilFlexao2D: Number(e.target.value) })} />
                              <input type="number" className="form-control form-control-sm" placeholder="E" value={asGonio.quadrilFlexao2E} onChange={e => setAsGonio({ ...asGonio, quadrilFlexao2E: Number(e.target.value) })} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Rot. Interna <small style={{ color: 'var(--text-dim)' }}>(40-45°)</small></span>
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '120px' }}>
                              <input type="number" className="form-control form-control-sm" placeholder="D" value={asGonio.quadrilRotIntD} onChange={e => setAsGonio({ ...asGonio, quadrilRotIntD: Number(e.target.value) })} />
                              <input type="number" className="form-control form-control-sm" placeholder="E" value={asGonio.quadrilRotIntE} onChange={e => setAsGonio({ ...asGonio, quadrilRotIntE: Number(e.target.value) })} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Rot. Externa <small style={{ color: 'var(--text-dim)' }}>(40-45°)</small></span>
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '120px' }}>
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
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '120px' }}>
                              <input type="number" className="form-control form-control-sm" placeholder="D" value={asGonio.joelhoFlexaoD} onChange={e => setAsGonio({ ...asGonio, joelhoFlexaoD: Number(e.target.value) })} />
                              <input type="number" className="form-control form-control-sm" placeholder="E" value={asGonio.joelhoFlexaoE} onChange={e => setAsGonio({ ...asGonio, joelhoFlexaoE: Number(e.target.value) })} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Poplíteo <small style={{ color: 'var(--text-dim)' }}>(155-160°)</small></span>
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '120px' }}>
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
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '120px' }}>
                              <input type="number" className="form-control form-control-sm" placeholder="D" value={asGonio.tornozeloDorsi1D} onChange={e => setAsGonio({ ...asGonio, tornozeloDorsi1D: Number(e.target.value) })} />
                              <input type="number" className="form-control form-control-sm" placeholder="E" value={asGonio.tornozeloDorsi1E} onChange={e => setAsGonio({ ...asGonio, tornozeloDorsi1E: Number(e.target.value) })} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Dorsi (2) <small style={{ color: 'var(--text-dim)' }}>(20°)</small></span>
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '120px' }}>
                              <input type="number" className="form-control form-control-sm" placeholder="D" value={asGonio.tornozeloDorsi2D} onChange={e => setAsGonio({ ...asGonio, tornozeloDorsi2D: Number(e.target.value) })} />
                              <input type="number" className="form-control form-control-sm" placeholder="E" value={asGonio.tornozeloDorsi2E} onChange={e => setAsGonio({ ...asGonio, tornozeloDorsi2E: Number(e.target.value) })} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>F. Plantar <small style={{ color: 'var(--text-dim)' }}>(40-50°)</small></span>
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '120px' }}>
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
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '120px' }}>
                              <input type="number" className="form-control form-control-sm" placeholder="D" value={asGonio.ombroRotIntD} onChange={e => setAsGonio({ ...asGonio, ombroRotIntD: Number(e.target.value) })} />
                              <input type="number" className="form-control form-control-sm" placeholder="E" value={asGonio.ombroRotIntE} onChange={e => setAsGonio({ ...asGonio, ombroRotIntE: Number(e.target.value) })} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Rot. Externa <small style={{ color: 'var(--text-dim)' }}>(80-100°)</small></span>
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '120px' }}>
                              <input type="number" className="form-control form-control-sm" placeholder="D" value={asGonio.ombroRotExtD} onChange={e => setAsGonio({ ...asGonio, ombroRotExtD: Number(e.target.value) })} />
                              <input type="number" className="form-control form-control-sm" placeholder="E" value={asGonio.ombroRotExtE} onChange={e => setAsGonio({ ...asGonio, ombroRotExtE: Number(e.target.value) })} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Abdução <small style={{ color: 'var(--text-dim)' }}>(180°)</small></span>
                            <div style={{ display: 'flex', gap: '8px', maxWidth: '120px' }}>
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
                    <div className="form-group">
                      <label>Termografia</label>
                      <input type="text" className="form-control" placeholder="Padrão hiper-radiante lombar, etc." value={asTermografia} onChange={e => setAsTermografia(e.target.value)} />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Y-Test (Equilíbrio)</label>
                        <input type="text" className="form-control" placeholder="Alcance Anterior D: 50cm, E: 45cm..." value={asYTest} onChange={e => setAsYTest(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Step Down</label>
                        <input type="text" className="form-control" placeholder="Valgo dinâmico D..." value={asStepDown} onChange={e => setAsStepDown(e.target.value)} />
                      </div>
                    </div>
                     <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
                      <h4 style={{ color: 'var(--color-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '16px' }}>
                        Estrela Maigne (Rosa dos Ventos Clínica de Dor)
                      </h4>
                      
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

                        <div style={{ flex: 1, minWidth: '250px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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

                    <div className="form-group">
                      <label>Avaliação Postural Visual</label>
                      <textarea className="form-control" placeholder="Ex: Escoliose leve torácica esquerda, anteriorização de pelve..." rows={2} value={asPostura} onChange={e => setAsPostura(e.target.value)} />
                    </div>
                    
                    <div className="form-group">
                      <label>Considerações Finais e Conduta do Avaliador</label>
                      <textarea className="form-control" placeholder="Observações gerais sobre a avaliação..." rows={4} value={asObs} onChange={e => setAsObs(e.target.value)} required />
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssessmentModal(false)}>Cancelar</button>
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
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowReportModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h3>Novo Relatório Fisioterápico</h3>
              <button className="modal-close" onClick={() => setShowReportModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateReport}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Paciente</label>
                  <SearchableSelect
                    options={clientOptions}
                    value={repClient}
                    onChange={setRepClient}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Data</label>
                    <input type="date" className="form-control" value={repDate} onChange={e => setRepDate(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Escala de Dor (0 a 10)</label>
                    <input type="number" className="form-control" min={0} max={10} value={repPain} onChange={e => setRepPain(Number(e.target.value))} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Queixa Principal e Conduta</label>
                  <textarea className="form-control" style={{ height: '100px' }} value={repContent} onChange={e => setRepContent(e.target.value)} placeholder="Relatar estado clínico e conduta fisioterapêutica..." required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowReportModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Criar Relatório</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Strength Test Modal */}
      {showStModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowStModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h3>Registrar Teste de Força</h3>
              <button className="modal-close" onClick={() => setShowStModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateStrengthTest}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
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
                <button type="button" className="btn btn-secondary" onClick={() => setShowStModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar Teste</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Prontuario Modal */}
      {showProntuarioModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowProntuarioModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h3>Nova Anotação de Prontuário</h3>
              <button className="modal-close" onClick={() => setShowProntuarioModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateProntuario}>
              <div className="modal-body">
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
                  <textarea className="form-control" style={{ height: '120px' }} value={prContent} onChange={e => setPrContent(e.target.value)} placeholder="Registrar evolução do tratamento e condutas tomadas..." required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowProntuarioModal(false)}>Cancelar</button>
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








