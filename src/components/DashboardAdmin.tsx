'use client';

import React, { useEffect, useState } from 'react';
import Pagination from './Pagination';

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

  const [medications, setMedications] = useState<any[]>([]);
  const [medNome, setMedNome] = useState('');
  const [medCat, setMedCat] = useState('');
  const [medQuant, setMedQuant] = useState(0);
  const [medUnidade, setMedUnidade] = useState('unidades');
  const [medLote, setMedLote] = useState('');
  const [medValidade, setMedValidade] = useState('');
  const [medObs, setMedObs] = useState('');

  const [fixedSchedules, setFixedSchedules] = useState<any[]>([]);
  const [strengthTests, setStrengthTests] = useState<any[]>([]);

  // Simple hardcoded configs
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
    } else {
      setFinDesc('');
      setFinCat('');
      setFinValor(0);
      setFinVenc(new Date().toISOString().split('T')[0]);
      setFinStatus('Pendente');
      setFinForma('');
      setFinObs('');
    }
    setShowModal(true);
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
    } else {
      setMedNome('');
      setMedCat('');
      setMedQuant(0);
      setMedUnidade('unidades');
      setMedLote('');
      setMedValidade('');
      setMedObs('');
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
          observacoes: finObs
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
          observacoes: medObs
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
                    const totalPages = Math.ceil(clients.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = clients.slice((curP - 1) * size, curP * size);

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
                    const totalPages = Math.ceil(professionals.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = professionals.slice((curP - 1) * size, curP * size);

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
                    const totalPages = Math.ceil(clients.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = clients.slice((curP - 1) * size, curP * size);

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
                          <td>
                            <button className="btn btn-secondary btn-sm" style={{ marginRight: '8px' }} onClick={() => handleOpenClientModal(c)}>
                              <i className="fa-solid fa-pen"></i>
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteClient(c._id)}>
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
                    const totalPages = Math.ceil(users.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = users.slice((curP - 1) * size, curP * size);

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
                    const totalPages = Math.ceil(clients.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = clients.slice((curP - 1) * size, curP * size);

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
                          <td>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleOpenCreditModal(c)}>
                              <i className="fa-solid fa-coins"></i> Ajustar Créditos
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
                    const totalPages = Math.ceil(fixedSchedules.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = fixedSchedules.slice((curP - 1) * size, curP * size);

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
              <p>Gerencie as despesas, receitas e fluxo de pagamentos do clube.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="page-size-selector">
                <span>Exibir:</span>
                <select value={getPageSize('financeiro')} onChange={e => setPageSizeForKey('financeiro', Number(e.target.value))}>
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={15}>15</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={() => handleOpenFinancialModal()}>
                <i className="fa-solid fa-plus"></i> Novo Lançamento
              </button>
            </div>
          </div>

          <div className="content-panel">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th className="text-right">Valor</th>
                    <th>Vencimento</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th>Pagamento</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const listKey = 'financeiro';
                    const activeP = getPage(listKey);
                    const size = getPageSize(listKey);
                    const totalPages = Math.ceil(financials.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = financials.slice((curP - 1) * size, curP * size);

                    return paginated.map(f => (
                      <tr key={f._id}>
                        <td><strong>{f.descricao}</strong></td>
                        <td><span className="badge badge-info">{f.categoria}</span></td>
                        <td className="text-right">R$ {f.valor.toFixed(2).replace('.', ',')}</td>
                        <td>{f.vencimento}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${f.status === 'Pago' ? 'badge-success' : f.status === 'Atrasado' ? 'badge-danger' : 'badge-warning'}`}>
                            {f.status}
                          </span>
                        </td>
                        <td>{f.forma_pagamento || '-'}</td>
                        <td>
                          <button className="btn btn-secondary btn-sm" style={{ marginRight: '8px' }} onClick={() => handleOpenFinancialModal(f)}>
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteFinancial(f._id)}>
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                  {financials.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty-state-card">
                          <i className="fa-solid fa-wallet empty-state-icon"></i>
                          <div className="empty-state-title">Nenhum lançamento financeiro</div>
                          <div className="empty-state-desc">Não há despesas ou receitas cadastradas neste período.</div>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => handleOpenFinancialModal()}>
                            <i className="fa-solid fa-plus"></i> Novo Lançamento
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {financials.length > 0 && (
              <Pagination
                currentPage={getPage('financeiro')}
                totalItems={financials.length}
                itemsPerPage={getPageSize('financeiro')}
                onPageChange={page => setPage('financeiro', page)}
              />
            )}
          </div>
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
                    const totalPages = Math.ceil(medications.length / size);
                    const curP = activeP > totalPages ? Math.max(1, totalPages) : activeP;
                    const paginated = medications.slice((curP - 1) * size, curP * size);

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
      {!['dashboard', 'profissionais', 'clientes', 'usuarios', 'controle_creditos', 'planos', 'agenda_fixa', 'testes_forca', 'financeiro', 'medicamentos', 'tv_panel'].includes(activeTab) && (
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
                      <label>Observações</label>
                      <textarea className="form-control" value={medObs} onChange={e => setMedObs(e.target.value)} />
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
    </div>
  );
}
