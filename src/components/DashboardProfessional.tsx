'use client';

import React, { useEffect, useState, useRef } from 'react';
import Pagination from './Pagination';
import SearchableSelect from './SearchableSelect';
import { downloadReportPDF, downloadAssessmentPDF } from '@/utils/pdfGenerator';

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
  const [showNewExModal, setShowNewExModal] = useState(false);

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
  const [prContent, setPrContent] = useState('');

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
      const payload = {
        clienteId: asClient,
        avaliadorId: '6668ab030303030303030302', // Camila Lima
        data: asDate,
        dadosMedidos: {
          idade: 30,
          peso: Number(asWeight),
          altura: Number(asHeight),
          sexo: 'M',
          circunferencias: {},
          dobras: {},
          saudeGeral: { queixas: asObs }
        },
        resultadosCalculados: {
          percentualGordura: Number(asFat),
          massaMagra: Number(asMassaMagra),
          massaGorda: Number(asMassaGorda)
        },
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
          <div className="view-header">
            <div className="view-title-group">
              <h1>Resumo do Dia</h1>
              <p>Visão geral e cronograma de atendimentos agendados para hoje.</p>
            </div>
          </div>

          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-info">
                <h3>Total Agendados Hoje</h3>
                <div className="value">
                  {appointments.filter(a => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    return a.data === todayStr && a.status !== 'cancelado';
                  }).length}
                </div>
              </div>
              <div className="metric-icon"><i className="fa-solid fa-calendar-day"></i></div>
            </div>
            <div className="metric-card">
              <div className="metric-info">
                <h3>Presenças Confirmadas</h3>
                <div className="value">
                  {appointments.filter(a => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    return a.data === todayStr && a.status === 'presenca';
                  }).length}
                </div>
              </div>
              <div className="metric-icon"><i className="fa-solid fa-user-check"></i></div>
            </div>
            <div className="metric-card">
              <div className="metric-info">
                <h3>Atendimentos Pendentes</h3>
                <div className="value">
                  {appointments.filter(a => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    return a.data === todayStr && a.status === 'agendado';
                  }).length}
                </div>
              </div>
              <div className="metric-icon warning"><i className="fa-solid fa-clock"></i></div>
            </div>
          </div>

          <div className="content-panel">
            <div className="panel-header">
              <h2>Cronograma de Atendimentos</h2>
              <div className="page-size-selector">
                <span>Exibir:</span>
                <select value={getPageSize('resumo_dia')} onChange={e => setPageSizeForKey('resumo_dia', Number(e.target.value))}>
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={15}>15</option>
                </select>
              </div>
            </div>
            <div className="table-responsive" style={{ marginTop: '12px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Horário</th>
                    <th>Tipo</th>
                    <th>Serviço</th>
                    <th>Aluno</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'resumo_dia';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const todayStr = new Date().toISOString().split('T')[0];
                    const todayApts = appointments
                      .filter(a => a.data === todayStr && a.status !== 'cancelado')
                      .sort((a, b) => a.horario.localeCompare(b.horario));

                    const totalPages = Math.ceil(todayApts.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = todayApts.slice((curP - 1) * size, curP * size);

                    return paginated.map(a => (
                      <tr key={a._id}>
                        <td><strong>{a.horario}</strong></td>
                        <td>
                          <span className={`badge ${a.tipo === 'academia' ? 'badge-success' : 'badge-info'}`}>
                            {a.tipo === 'academia' ? 'Academia' : 'Fisioterapia'}
                          </span>
                        </td>
                        <td>{a.servico}</td>
                        <td>{a.clienteId?.dadosPessoais?.nome || 'Aluno'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${a.status === 'presenca' ? 'badge-success' : 'badge-warning'}`}>
                            {a.status === 'presenca' ? 'Presente' : 'Agendado'}
                          </span>
                        </td>
                        <td>
                          {a.status === 'agendado' && (
                            <button className="btn btn-success btn-sm" onClick={() => handleUpdateAptStatus(a._id, 'presenca')}>
                              Confirmar Presença
                            </button>
                          )}
                          {a.status === 'presenca' && (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleUpdateAptStatus(a._id, 'agendado')}>
                              Desmarcar Presença
                            </button>
                          )}
                        </td>
                      </tr>
                    ));
                  })()}
                  {(() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const count = appointments.filter(a => a.data === todayStr && a.status !== 'cancelado').length;
                    if (count === 0) {
                      return (
                        <tr>
                          <td colSpan={6}>
                            <div className="empty-state-card">
                              <i className="fa-solid fa-calendar-xmark empty-state-icon"></i>
                              <div className="empty-state-title">Sem atendimentos hoje</div>
                              <div className="empty-state-desc">Não há sessões ou aulas agendadas para o dia de hoje.</div>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    return null;
                  })()}
                </tbody>
              </table>
            </div>
            {(() => {
              const todayStr = new Date().toISOString().split('T')[0];
              const count = appointments.filter(a => a.data === todayStr && a.status !== 'cancelado').length;
              if (count > 0) {
                return (
                  <Pagination
                    currentPage={getPage('resumo_dia')}
                    totalItems={count}
                    itemsPerPage={getPageSize('resumo_dia')}
                    onPageChange={page => setPage('resumo_dia', page)}
                  />
                );
              }
              return null;
            })()}
          </div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                    const totalPages = Math.ceil(appointments.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = appointments.slice((curP - 1) * size, curP * size);

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
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Contato</th>
                    <th>Plano</th>
                    <th>Observações Clínicas</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'clientes';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const totalPages = Math.ceil(clients.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = clients.slice((curP - 1) * size, curP * size);

                    return paginated.map(c => (
                      <tr key={c._id}>
                        <td><strong>{c.dadosPessoais?.nome}</strong></td>
                        <td>{c.dadosPessoais?.telefone || '-'}</td>
                        <td>{c.dadosComerciais?.planoId?.nome || 'Personalizado'}</td>
                        <td>
                          <em style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {c.dadosClinicos?.lesoes || 'Sem lesões registradas'}
                          </em>
                        </td>
                      </tr>
                    ));
                  })()}
                  {clients.length === 0 && (
                    <tr>
                      <td colSpan={4}>
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
                    const totalPages = Math.ceil(reports.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = reports.slice((curP - 1) * size, curP * size);

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
                    const totalPages = Math.ceil(strengthTests.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = strengthTests.slice((curP - 1) * size, curP * size);

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
                            <button className="btn btn-secondary btn-sm" onClick={() => alert('Download do Teste PDF...')}>
                              <i className="fa-solid fa-file-pdf"></i> Laudo PDF
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
                    const totalPages = Math.ceil(prontuarios.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = prontuarios.slice((curP - 1) * size, curP * size);

                    return paginated.map(pr => (
                      <tr key={pr._id}>
                        <td><strong>{pr.data}</strong></td>
                        <td><strong>{pr.clienteId?.dadosPessoais?.nome || 'Aluno Removido'}</strong></td>
                        <td><small style={{ color: 'var(--text-main)' }}>{pr.conteudo}</small></td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteProntuario(pr._id)}>
                            <i className="fa-solid fa-trash"></i> Excluir
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                  {prontuarios.length === 0 && (
                    <tr>
                      <td colSpan={4}>
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
      {!['dashboard', 'clientes', 'treinos_prof', 'agenda_fixa', 'avaliacoes', 'relatorios', 'testes_forca', 'prontuarios'].includes(activeTab) && (
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
              <h3>Nova Avaliação Física</h3>
              <button className="modal-close" onClick={() => setShowAssessmentModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateAssessment}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Aluno</label>
                  <SearchableSelect
                    options={clientOptions}
                    value={asClient}
                    onChange={setAsClient}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Data</label>
                    <input type="date" className="form-control" value={asDate} onChange={e => setAsDate(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Peso (kg)</label>
                    <input type="number" className="form-control" value={asWeight} onChange={e => setAsWeight(e.target.value)} placeholder="80" required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Altura (m)</label>
                    <input type="number" step="0.01" className="form-control" value={asHeight} onChange={e => setAsHeight(e.target.value)} placeholder="1.80" required />
                  </div>
                  <div className="form-group">
                    <label>Gordura Corporal (% BF)</label>
                    <input type="number" className="form-control" value={asFat} onChange={e => setAsFat(e.target.value)} placeholder="15" required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Massa Magra (kg)</label>
                    <input type="number" className="form-control" value={asMassaMagra} onChange={e => setAsMassaMagra(e.target.value)} placeholder="65" required />
                  </div>
                  <div className="form-group">
                    <label>Massa Gorda (kg)</label>
                    <input type="number" className="form-control" value={asMassaGorda} onChange={e => setAsMassaGorda(e.target.value)} placeholder="15" required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Observações Clínicas / Queixas</label>
                  <textarea className="form-control" value={asObs} onChange={e => setAsObs(e.target.value)} placeholder="Ex: Dor lombar leve" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssessmentModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar Avaliação</button>
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
    </div>
  );
}
