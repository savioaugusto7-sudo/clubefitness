'use client';

import React, { useEffect, useState } from 'react';
import Pagination from './Pagination';
import { downloadContractPDF } from '@/utils/pdfGenerator';

interface DashboardAdminProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function DashboardAdmin({ activeTab, setActiveTab }: DashboardAdminProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
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
  const [modalType, setModalType] = useState<'client' | 'professional' | 'credit' | 'user' | 'plan' | 'financial' | 'medication'>('client');
  const [editingItem, setEditingItem] = useState<any>(null);

  // Input states
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [plano, setPlano] = useState('6668ab010101010101010103'); // default Clube Completo
  const [especialidade, setEspecialidade] = useState('');
  const [registro, setRegistro] = useState('');
  const [userRole, setUserRole] = useState<string>('aluno');
  const [creditAmount, setCreditAmount] = useState(1);
  const [creditType, setCreditType] = useState<'academia' | 'massagem'>('academia');

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
  const [strengthTests, setStrengthTests] = useState<any[]>([]);

  // F2 � Ficha completa do aluno
  const [showClientDetailModal, setShowClientDetailModal] = useState(false);
  const [clientDetailTab, setClientDetailTab] = useState<'pessoais' | 'clinicos' | 'comerciais'>('pessoais');
  const [detailClient, setDetailClient] = useState<any>(null);
  const [dcSexo, setDcSexo] = useState('M');
  const [dcNascimento, setDcNascimento] = useState('');
  const [dcEndereco, setDcEndereco] = useState('');
  const [dcLesoes, setDcLesoes] = useState('');
  const [dcRestricoes, setDcRestricoes] = useState('');
  const [dcMedicamentos, setDcMedicamentos] = useState('');
  const [dcHistorico, setDcHistorico] = useState('');
  const [dcObsClin, setDcObsClin] = useState('');
  const [dcPlano, setDcPlano] = useState('');
  const [dcVencimento, setDcVencimento] = useState('');
  const [dcStatus, setDcStatus] = useState('ativo');
  const [dcFormaPag, setDcFormaPag] = useState('pix');
  const [dcDuracao, setDcDuracao] = useState('mensal');

  const handleOpenRulesModal = (client: any) => {
    alert('Regras de crédito: ' + JSON.stringify(client.regrasCredito));
  };

  // F7   Simulador de Recebimentos
  const [finTab, setFinTab] = useState<'contas_pagar' | 'recebimentos'>('contas_pagar');
  const [showSimuladorModal, setShowSimuladorModal] = useState(false);
  const [simClient, setSimClient] = useState<any>(null);
  const [simForma, setSimForma] = useState<'pix' | 'boleto'>('pix');

  // F15/F16 � Financial filters
  const [finFilterStatus, setFinFilterStatus] = useState('');
  const [finFilterCat, setFinFilterCat] = useState('');
  const [finFilterMonth, setFinFilterMonth] = useState('');

  // Configura��es states
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
    alert('Configura��es salvas com sucesso!');
  };
  const plansList = [
    { id: '6668ab010101010101010101', nome: 'Academia VIP', preco: 150 },
    { id: '6668ab010101010101010102', nome: 'Fisioterapia Individual', preco: 450 },
    { id: '6668ab010101010101010103', nome: 'Clube Completo (Fisio + Academia)', preco: 490 }
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resClients, resProfs, resApts, resUsers, resPlans, resFin, resMed, resFs, resSt] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/professionals'),
        fetch('/api/appointments'),
        fetch('/api/users'),
        fetch('/api/plans'),
        fetch('/api/financial'),
        fetch('/api/medications'),
        fetch('/api/fixed-schedules'),
        fetch('/api/strength-tests')
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

      if (jsonClients.success) setClients(jsonClients.data);
      if (jsonProfs.success) setProfessionals(jsonProfs.data);
      if (jsonApts.success) setAppointments(jsonApts.data);
      if (jsonUsers.success) setUsers(jsonUsers.data);
      if (jsonPlans.success) setPlans(jsonPlans.data);
      if (jsonFin.success) setFinancials(jsonFin.data);
      if (jsonMed.success) setMedications(jsonMed.data);
      if (jsonFs.success) setFixedSchedules(jsonFs.data);
      if (jsonSt.success) setStrengthTests(jsonSt.data);
    } catch (e) {
      console.error('Error fetching admin dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
    } else {
      setEmail('');
      setNome('');
      setEspecialidade('');
      setRegistro('');
    }
    setShowModal(true);
  };

  const handleOpenCreditModal = (client: any) => {
    setEditingItem(client);
    setModalType('credit');
    setCreditAmount(1);
    setCreditType('academia');
    setShowModal(true);
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
      setEspecialidade(item.professionalDetails?.especialidade || '');
      setRegistro(item.professionalDetails?.registro || '');
    } else {
      setEmail('');
      setNome('');
      setUserRole('aluno');
      setEspecialidade('');
      setRegistro('');
    }
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
    } else {
      setPlanName('');
      setPlanValidade(30);
      setPlanAcademia(0);
      setPlanConsultorio(0);
      setPlanPrice(0);
      setPlanCreditos(0);
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
          cargo: especialidade
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

        if (userRole === 'admin') {
          tipo = 'admin';
          cargo = 'Administrador Geral';
        } else if (userRole === 'fisio') {
          tipo = 'professional';
          cargo = 'Fisio';
          esp = especialidade || 'Fisioterapia';
          reg = registro || 'CREFITO/00000-F';
        } else if (userRole === 'treino') {
          tipo = 'professional';
          cargo = 'Treino';
          esp = especialidade || 'Educação Física';
          reg = registro || 'CREF/00000-G';
        } else if (userRole === 'aluno_vip') {
          tipo = 'client';
          cargo = 'Aluno VIP';
        } else if (userRole === 'aluno') {
          tipo = 'client';
          cargo = 'Aluno';
        }

        const payload = {
          id: editingItem?._id,
          email,
          nome,
          tipo,
          cargo,
          especialidade: esp,
          registro: reg
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
          nome: planName,
          validadeDias: planValidade,
          limiteSessoesAcademia: planAcademia,
          limiteSessoesConsultorio: planConsultorio,
          preco: planPrice,
          creditosTotal: planCreditos
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
      } else if (modalType === 'credit') {
        // Update client credits
        const isMassage = creditType === 'massagem';
        const currentCom = editingItem.dadosComerciais;
        const payload = {
          id: editingItem._id,
          dadosComerciais: {
            creditosTotal: isMassage ? currentCom.creditosTotal : (currentCom.creditosTotal || 0) + creditAmount,
            creditosMassagemTotal: isMassage ? (currentCom.creditosMassagemTotal || 0) + creditAmount : currentCom.creditosMassagemTotal
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
  const activeClients = clients.filter(c => c.dadosComerciais?.status === 'ativo').length;
  const revenueEst = activeClients * 310;
  const todayApts = appointments.filter(a => {
    const todayStr = new Date().toISOString().split('T')[0];
    return a.data === todayStr && a.status !== 'cancelado';
  }).length;

  return (
    <div>
      {/* 1. View: Dashboard Principal */}
      {activeTab === 'dashboard' && (
        <>
          <div className="view-header">
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
                  Frequência Semanal (Seg-Sáb)
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
                    <th style={{ textAlign: 'center' }}>Agendados/Realizados</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'dashboard_freq';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const q = getSearchQuery(listKey).toLowerCase();
                    const filtered = clients.filter(c => c.dadosPessoais?.nome?.toLowerCase().includes(q));
                    const totalPages = Math.ceil(filtered.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = filtered.slice((curP - 1) * size, curP * size);

                    return paginated.map(c => {
                      const planName = c.dadosComerciais?.planoId?.nome || 'Plano Personalizado';
                      const freq = c.dadosComerciais?.frequencia || 3;
                      const status = c.dadosComerciais?.status || 'ativo';
                      return (
                        <tr key={c._id}>
                          <td><strong>{c.dadosPessoais?.nome}</strong></td>
                          <td>{planName}</td>
                          <td style={{ textAlign: 'center' }}>{freq}x/semana</td>
                          <td style={{ textAlign: 'center' }}>
                            {(c.dadosComerciais?.creditosUsados || 0)} / {(c.dadosComerciais?.creditosTotal || 0)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${status === 'ativo' ? 'badge-success' : 'badge-danger'}`}>
                              {status === 'ativo' ? 'Ativo' : 'Vencido'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleOpenCreditModal(c)}>
                              <i className="fa-solid fa-coins" style={{ marginRight: '6px' }}></i> Adicionar Créditos
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                  {clients.length === 0 && (
                    <tr>
                      <td colSpan={6}>
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
                    const q = getSearchQuery(listKey).toLowerCase();
                    const filtered = professionals.filter(p => p.nome?.toLowerCase().includes(q) || p.userId?.email?.toLowerCase().includes(q));
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
                      <td colSpan={5}>
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
                    const q = getSearchQuery(listKey).toLowerCase();
                    const filtered = clients.filter(c => c.dadosPessoais?.nome?.toLowerCase().includes(q) || c.dadosPessoais?.email?.toLowerCase().includes(q) || c.dadosPessoais?.cpf?.includes(q));
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
                              setDcSexo(c.dadosPessoais?.sexo || 'M');
                              setDcNascimento(c.dadosPessoais?.dataNascimento || '');
                              setDcEndereco(c.dadosPessoais?.endereco || '');
                              setDcLesoes(c.dadosClinicos?.lesoes || '');
                              setDcRestricoes(c.dadosClinicos?.restricoes || '');
                              setDcMedicamentos(c.dadosClinicos?.medicamentos || '');
                              setDcHistorico(c.dadosClinicos?.historicoClinico || '');
                              setDcObsClin(c.dadosClinicos?.observacoes || '');
                              setDcPlano(c.dadosComerciais?.planoId?._id || c.dadosComerciais?.planoId || '');
                              setDcVencimento(c.dadosComerciais?.vencimento || '');
                              setDcStatus(c.dadosComerciais?.status || 'ativo');
                              setDcFormaPag(c.dadosComerciais?.formaPagamento || 'pix');
                              setDcDuracao(c.dadosComerciais?.duracao || 'mensal');
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
                              downloadContractPDF(c, plan, c.contrato);
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
                    const q = getSearchQuery(listKey).toLowerCase();
                    const filtered = users.filter(u => u.nome?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
                    const totalPages = Math.ceil(filtered.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = filtered.slice((curP - 1) * size, curP * size);

                    return paginated.map(u => {
                      let roleBadgeClass = 'badge-success';
                      let roleLabel = 'Aluno';
                      let details = '-';

                      if (u.tipo === 'admin') {
                        roleBadgeClass = 'badge-warning';
                        roleLabel = 'Administrador Geral';
                      } else if (u.tipo === 'professional') {
                        roleBadgeClass = 'badge-info';
                        roleLabel = u.cargo === 'Fisio' ? 'Fisio' : 'Treino';
                        const espec = u.professionalDetails?.especialidade || u.cargo || 'Profissional';
                        const reg = u.professionalDetails?.registro || '';
                        details = `${espec} ${reg ? `(${reg})` : ''}`;
                      } else {
                        roleLabel = u.cargo === 'Aluno VIP' ? 'Aluno VIP' : 'Aluno';
                        roleBadgeClass = u.cargo === 'Aluno VIP' ? 'badge-primary' : 'badge-success';
                        const planoNome = u.clientDetails?.dadosComerciais?.planoId?.nome || 'Sem Plano';
                        const status = u.clientDetails?.dadosComerciais?.status || 'ativo';
                        details = `Plano: ${planoNome} (${status === 'ativo' ? 'Ativo' : 'Vencido'})`;
                      }

                      return (
                        <tr key={u._id}>
                          <td><strong>{u.nome}</strong></td>
                          <td>{u.email}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${roleBadgeClass}`}>
                              {roleLabel}
                            </span>
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
                    const q = getSearchQuery(listKey).toLowerCase();
                    const filtered = clients.filter(c => c.dadosPessoais?.nome?.toLowerCase().includes(q) || c.dadosPessoais?.email?.toLowerCase().includes(q) || c.dadosPessoais?.cpf?.includes(q));
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
                    <th className="text-right">Preço Mensal</th>
                    <th style={{ textAlign: 'center' }}>Vigência (Dias)</th>
                    <th style={{ textAlign: 'center' }}>Limite Academia</th>
                    <th style={{ textAlign: 'center' }}>Limite Consultório</th>
                    <th>Ações</th>
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
                        <td className="text-right">R$ {p.preco.toFixed(2).replace('.', ',')}</td>
                        <td style={{ textAlign: 'center' }}>{p.validadeDias} dias</td>
                        <td style={{ textAlign: 'center' }}>{p.limiteSessoesAcademia > 0 ? `${p.limiteSessoesAcademia} sessões` : 'Ilimitado'}</td>
                        <td style={{ textAlign: 'center' }}>{p.limiteSessoesConsultorio > 0 ? `${p.limiteSessoesConsultorio} sessões` : 'Sem sessões'}</td>
                        <td>
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
                    <th>Data de Início</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'agenda_fixa';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const q = getSearchQuery(listKey).toLowerCase();
                    const filtered = fixedSchedules.filter(fs => fs.clienteId?.nome?.toLowerCase().includes(q) || fs.profissionalId?.nome?.toLowerCase().includes(q));
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
                          <td>{fs.dataInicio}</td>
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
                    <th style={{ textAlign: 'center' }}>Relação Rotadores</th>
                    <th style={{ textAlign: 'center' }}>Risco Articular</th>
                    <th>Observações</th>
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
                      const ratio = st.analise?.ratios?.rotExternaRotInterna;
                      const risco = st.analise?.riscoOmbro;
                      return (
                        <tr key={st._id}>
                          <td><strong>{st.clienteId?.dadosPessoais?.nome || 'Aluno'}</strong></td>
                          <td>{st.data}</td>
                          <td style={{ textAlign: 'center' }}>{ratio ? ratio.toFixed(2) : '-'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${risco ? 'badge-danger' : 'badge-success'}`}>
                              {risco ? 'Alto Risco' : 'Normal / Seguro'}
                            </span>
                          </td>
                          <td><small>{st.observacoes || '-'}</small></td>
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
              <p>Gerencie as despesas, receitas e simule cobranças.</p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid var(--border-color)', marginBottom: '20px' }}>
            <button
              onClick={() => setFinTab('contas_pagar')}
              style={{ padding: '10px 20px', fontWeight: 600, fontSize: '0.9rem', background: 'none', border: 'none', cursor: 'pointer', color: finTab === 'contas_pagar' ? 'var(--color-primary)' : 'var(--text-dim)', borderBottom: finTab === 'contas_pagar' ? '3px solid var(--color-primary)' : '3px solid transparent', marginBottom: '-2px' }}
            >
              <i className="fa-solid fa-file-invoice-dollar" style={{ marginRight: '6px' }}></i>Contas a Pagar
            </button>
            <button
              onClick={() => setFinTab('recebimentos')}
              style={{ padding: '10px 20px', fontWeight: 600, fontSize: '0.9rem', background: 'none', border: 'none', cursor: 'pointer', color: finTab === 'recebimentos' ? 'var(--color-success)' : 'var(--text-dim)', borderBottom: finTab === 'recebimentos' ? '3px solid var(--color-success)' : '3px solid transparent', marginBottom: '-2px' }}
            >
              <i className="fa-solid fa-qrcode" style={{ marginRight: '6px' }}></i>Simulador de Recebimentos
            </button>
          </div>

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
                    { key: 'descricao', label: 'Descrio' },
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

              <div className="content-panel">
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
                          (finFilterCat ? f.categoria?.toLowerCase().includes(finFilterCat.toLowerCase()) : true)
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
                        (finFilterCat ? f.categoria?.toLowerCase().includes(finFilterCat.toLowerCase()) : true)
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
                  <Pagination currentPage={getPage('financeiro')} totalItems={financials.filter(f => (finFilterStatus ? f.status === finFilterStatus : true) && (finFilterCat ? f.categoria?.toLowerCase().includes(finFilterCat.toLowerCase()) : true)).length} itemsPerPage={getPageSize('financeiro')} onPageChange={page => setPage('financeiro', page)} />
                )}
              </div>
            </>
          )}

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
                    const q = getSearchQuery(listKey).toLowerCase();
                    const filtered = medications.filter(m => m.nome?.toLowerCase().includes(q) || m.categoria?.toLowerCase().includes(q));
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
        <>
          <div className="view-header">
            <div className="view-title-group">
              <h1>Painel de Recepção (TV)</h1>
              <p>Layout para projeção em televisores com status de atendimentos de hoje.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', background: '#090d16', padding: '32px', borderRadius: '16px', border: '1px solid #1a2438' }}>
            <div>
              <h2 style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-title)', marginBottom: '20px' }}>Atendimentos de Hoje</h2>
              <div className="table-responsive">
                <table className="data-table" style={{ background: 'transparent' }}>
                  <thead>
                    <tr>
                      <th style={{ color: 'var(--text-muted)' }}>Horário</th>
                      <th style={{ color: 'var(--text-muted)' }}>Aluno / Paciente</th>
                      <th style={{ color: 'var(--text-muted)' }}>Serviço</th>
                      <th style={{ color: 'var(--text-muted)' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.filter(a => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      return a.data === todayStr && a.status !== 'cancelado';
                    }).map(a => (
                      <tr key={a._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ fontSize: '1.25rem' }}><strong>{a.horario}</strong></td>
                        <td style={{ fontSize: '1.25rem' }}>{a.clienteId?.dadosPessoais?.nome || 'Aluno'}</td>
                        <td>{a.servico}</td>
                        <td>
                          <span className={`badge ${a.status === 'presenca' ? 'badge-success' : 'badge-warning'}`}>
                            {a.status === 'presenca' ? 'Presente' : 'Agendado'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {appointments.filter(a => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      return a.data === todayStr && a.status !== 'cancelado';
                    }).length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                          Nenhum atendimento agendado para hoje.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '32px' }}>
              <h2 style={{ fontFamily: 'var(--font-title)', marginBottom: '20px' }}>Informativo</h2>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <h3>Check-in Automático</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '8px' }}>
                  Ao chegar na recepção, confirme sua presença com o professor para liberar seus créditos semanais.
                </p>
              </div>
              <div style={{ background: 'var(--color-primary-glow)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-primary)' }}>
                <h3 style={{ color: 'var(--color-primary)' }}>Clube Fitness Fisio</h3>
                <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', marginTop: '8px' }}>
                  Saúde, Movimento e Reabilitação Integrada.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Default Fallback for other tabs */}
      {!['dashboard', 'profissionais', 'clientes', 'usuarios', 'controle_creditos', 'planos', 'agenda_fixa', 'testes_forca', 'financeiro', 'medicamentos', 'tv_panel', 'configuracoes'].includes(activeTab) && (
        <div className="content-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h2>Aba em Desenvolvimento</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            A visualização da aba <strong>{activeTab}</strong> está sendo migrada. Todos os endpoints já estão no MongoDB.
          </p>
        </div>
      )}

      {/* CRUD MODAL */}
      {showModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h3>
                {modalType === 'client' && (editingItem ? 'Editar Aluno' : 'Cadastrar Aluno')}
                {modalType === 'professional' && (editingItem ? 'Editar Profissional' : 'Cadastrar Profissional')}
                {modalType === 'user' && (editingItem ? 'Editar Usuário' : 'Cadastrar Usuário')}
                {modalType === 'credit' && `Adicionar Créditos para ${editingItem.dadosPessoais?.nome}`}
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
                  </>
                )}

                {modalType === 'credit' && (
                  <>
                    <div className="form-group">
                      <label>Tipo de Crédito</label>
                      <select className="select-custom" value={creditType} onChange={e => setCreditType(e.target.value as any)}>
                        <option value="academia">Créditos de Academia</option>
                        <option value="massagem">Créditos de Massagem</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Quantidade a Adicionar</label>
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
                      <label>Perfil do Usuário</label>
                      <select className="select-custom" value={userRole} onChange={e => setUserRole(e.target.value)}>
                        <option value="admin">Administrador Geral</option>
                        <option value="fisio">Fisio</option>
                        <option value="treino">Treino</option>
                        <option value="aluno_vip">Aluno VIP</option>
                        <option value="aluno">Aluno</option>
                      </select>
                    </div>
                    {(userRole === 'fisio' || userRole === 'treino') && (
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
                  <>
                    <div className="form-group">
                      <label>Nome do Plano</label>
                      <input type="text" className="form-control" value={planName} onChange={e => setPlanName(e.target.value)} required />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Vigência (Dias)</label>
                        <input type="number" className="form-control" value={planValidade} onChange={e => setPlanValidade(Number(e.target.value))} required />
                      </div>
                      <div className="form-group">
                        <label>Preço Mensal (R$)</label>
                        <input type="number" className="form-control" value={planPrice} onChange={e => setPlanPrice(Number(e.target.value))} required />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Limite Sessões Academia</label>
                        <input type="number" className="form-control" value={planAcademia} onChange={e => setPlanAcademia(Number(e.target.value))} required />
                      </div>
                      <div className="form-group">
                        <label>Limite Sessões Consultório</label>
                        <input type="number" className="form-control" value={planConsultorio} onChange={e => setPlanConsultorio(Number(e.target.value))} required />
                      </div>
                      <div className="form-group">
                        <label>Total de Créditos</label>
                        <input type="number" className="form-control" value={planCreditos} onChange={e => setPlanCreditos(Number(e.target.value))} required />
                      </div>
                    </div>
                  </>
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
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

       {/* F2   Ficha Completa do Aluno */}
       {showClientDetailModal && detailClient && (
         <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowClientDetailModal(false)}>
           <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px', width: '95%' }}>
             <div className="modal-header">
               <h3><i className="fa-solid fa-id-card" style={{ marginRight: '8px' }}></i>Ficha Completa   {detailClient.dadosPessoais?.nome}</h3>
               <button className="modal-close" onClick={() => setShowClientDetailModal(false)}>&times;</button>
             </div>
             <div className="modal-body" style={{ padding: 0 }}>
               <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)' }}>
                 {(['pessoais', 'clinicos', 'comerciais'] as const).map((t) => {
                   const labels: Record<string, string> = { pessoais: 'Dados Pessoais', clinicos: 'Dados Clnicos', comerciais: 'Dados Comerciais' };
                   const icons: Record<string, string> = { pessoais: 'fa-user', clinicos: 'fa-heart-pulse', comerciais: 'fa-file-contract' };
                   return (
                     <button key={t} onClick={() => setClientDetailTab(t)} style={{ flex: 1, padding: '12px', fontWeight: 600, fontSize: '0.82rem', background: 'none', border: 'none', cursor: 'pointer', color: clientDetailTab === t ? 'var(--color-primary)' : 'var(--text-dim)', borderBottom: clientDetailTab === t ? '3px solid var(--color-primary)' : '3px solid transparent', marginBottom: '-2px' }}>
                       <i className={`fa-solid ${icons[t]}`} style={{ marginRight: '5px' }}></i>{labels[t]}
                     </button>
                   );
                 })}
               </div>
               <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                 {clientDetailTab === 'pessoais' && (
                   <>
                     <div className="form-row">
                       <div className="form-group"><label>Nome Completo</label><input className="form-control" defaultValue={detailClient.dadosPessoais?.nome} readOnly /></div>
                       <div className="form-group"><label>E-mail</label><input className="form-control" defaultValue={detailClient.dadosPessoais?.email} readOnly /></div>
                     </div>
                     <div className="form-row">
                       <div className="form-group"><label>CPF</label><input className="form-control" defaultValue={detailClient.dadosPessoais?.cpf} readOnly /></div>
                       <div className="form-group"><label>Telefone</label><input className="form-control" defaultValue={detailClient.dadosPessoais?.telefone} readOnly /></div>
                     </div>
                     <div className="form-row">
                       <div className="form-group">
                         <label>Sexo</label>
                         <select className="select-custom" value={dcSexo} onChange={e => setDcSexo(e.target.value)}>
                           <option value="M">Masculino</option><option value="F">Feminino</option><option value="O">Outro</option>
                         </select>
                       </div>
                       <div className="form-group"><label>Data de Nascimento</label><input type="date" className="form-control" value={dcNascimento} onChange={e => setDcNascimento(e.target.value)} /></div>
                     </div>
                     <div className="form-group"><label>Endereo</label><input className="form-control" value={dcEndereco} onChange={e => setDcEndereco(e.target.value)} placeholder="Rua, N, Bairro, CEP" /></div>
                   </>
                 )}
                 {clientDetailTab === 'clinicos' && (
                   <>
                     <div className="form-group"><label>Leses e Diagnsticos</label><textarea className="form-control" rows={3} value={dcLesoes} onChange={e => setDcLesoes(e.target.value)} placeholder="Ex: Leso manguito rotador grau II..." /></div>
                     <div className="form-group"><label>Restries / Contraindicaes</label><textarea className="form-control" rows={2} value={dcRestricoes} onChange={e => setDcRestricoes(e.target.value)} /></div>
                     <div className="form-group"><label>Medicamentos em Uso</label><input className="form-control" value={dcMedicamentos} onChange={e => setDcMedicamentos(e.target.value)} placeholder="Nome, dosagem, frequncia..." /></div>
                     <div className="form-group"><label>Histrico Clnico Relevante</label><textarea className="form-control" rows={3} value={dcHistorico} onChange={e => setDcHistorico(e.target.value)} placeholder="Cirurgias, alergias, doenas crnicas..." /></div>
                     <div className="form-group"><label>Observaes Clnicas</label><textarea className="form-control" rows={2} value={dcObsClin} onChange={e => setDcObsClin(e.target.value)} /></div>
                   </>
                 )}
                 {clientDetailTab === 'comerciais' && (
                   <>
                     <div className="form-row">
                       <div className="form-group">
                         <label>Plano Contratado</label>
                         <select className="select-custom" value={dcPlano} onChange={e => setDcPlano(e.target.value)}>
                           {plans.map((p: any) => <option key={p._id} value={p._id}>{p.nome}   R$ {p.preco?.toFixed(2).replace('.', ',')}</option>)}
                         </select>
                       </div>
                       <div className="form-group">
                         <label>Status</label>
                         <select className="select-custom" value={dcStatus} onChange={e => setDcStatus(e.target.value)}>
                           <option value="ativo">Ativo</option><option value="vencido">Vencido</option><option value="suspenso">Suspenso</option>
                         </select>
                       </div>
                     </div>
                     <div className="form-row">
                       <div className="form-group">
                         <label>Durao</label>
                         <select className="select-custom" value={dcDuracao} onChange={e => setDcDuracao(e.target.value)}>
                           <option value="mensal">Mensal</option><option value="semestral">Semestral</option><option value="anual">Anual</option>
                         </select>
                       </div>
                       <div className="form-group">
                         <label>Forma de Pagamento</label>
                         <select className="select-custom" value={dcFormaPag} onChange={e => setDcFormaPag(e.target.value)}>
                           <option value="pix">Pix</option><option value="boleto">Boleto</option><option value="cartao">Carto</option><option value="dinheiro">Dinheiro</option>
                         </select>
                       </div>
                     </div>
                     <div className="form-group"><label>Vencimento</label><input type="date" className="form-control" value={dcVencimento} onChange={e => setDcVencimento(e.target.value)} /></div>
                     <div style={{ display: 'flex', gap: '10px' }}>
                       <button className="btn btn-primary" style={{ flex: 1 }} onClick={async () => {
                         await fetch('/api/clients', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: detailClient._id, dadosComerciais: { planoId: dcPlano, status: dcStatus, formaPagamento: dcFormaPag, duracao: dcDuracao, vencimento: dcVencimento } }) });
                         fetchData(); setShowClientDetailModal(false);
                       }}><i className="fa-solid fa-floppy-disk"></i> Salvar</button>
                       <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => {
                         const plan = plans.find((p: any) => p._id === dcPlano);
                         downloadContractPDF({ ...detailClient, dadosComerciais: { ...detailClient.dadosComerciais, planoId: plan, formaPagamento: dcFormaPag, duracao: dcDuracao, vencimento: dcVencimento } }, plan, detailClient.contrato);
                       }}><i className="fa-solid fa-file-contract"></i> Contrato PDF</button>
                     </div>
                   </>
                 )}
                 {clientDetailTab !== 'comerciais' && (
                   <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                     <button className="btn btn-primary" onClick={async () => {
                       const payload: any = { id: detailClient._id };
                       if (clientDetailTab === 'pessoais') payload.dadosPessoais = { ...detailClient.dadosPessoais, sexo: dcSexo, dataNascimento: dcNascimento, endereco: dcEndereco };
                       else payload.dadosClinicos = { lesoes: dcLesoes, restricoes: dcRestricoes, medicamentos: dcMedicamentos, historicoClinico: dcHistorico, observacoes: dcObsClin };
                       await fetch('/api/clients', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                       fetchData(); alert('Dados salvos!');
                     }}><i className="fa-solid fa-floppy-disk"></i> Salvar Altera��es</button>
                   </div>
                 )}
               </div>
             </div>
           </div>
         </div>
       )}

       {/* F7  Simulador de Cobran�a */}
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
                 <p style={{ margin: 0 }}><strong>Forma:</strong> {simForma === 'pix' ? 'Pix' : 'Boleto Banc�rio'}</p>
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
                   <small style={{ color: '#888', fontSize: '0.65rem' }}>C�digo simulado</small>
                 </div>
               )}
               <div style={{ display: 'flex', gap: '8px' }}>
                 <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSimForma(simForma === 'pix' ? 'boleto' : 'pix')}>
                   Mudar para {simForma === 'pix' ? 'Boleto' : 'PIX'}
                 </button>
                 <button className="btn btn-primary" style={{ flex: 1 }} onClick={async () => {
                   const valor = simClient.dadosComerciais?.planoId?.preco || 0;
                   await fetch('/api/financial', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ descricao: `Mensalidade  ${simClient.dadosPessoais?.nome}`, categoria: 'Mensalidade', valor, vencimento: new Date().toISOString().split('T')[0], status: 'Pago', forma_pagamento: simForma === 'pix' ? 'Pix' : 'Boleto Banc�rio' }) });
                   setShowSimuladorModal(false); fetchData(); alert('Pagamento registrado!');
                 }}>
                   <i className="fa-solid fa-check"></i> Confirmar
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
    </div>
  );
}

















