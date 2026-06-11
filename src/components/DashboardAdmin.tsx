'use client';

import React, { useEffect, useState } from 'react';

interface DashboardAdminProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function DashboardAdmin({ activeTab, setActiveTab }: DashboardAdminProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for CRUD
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'client' | 'professional' | 'credit'>('client');
  const [editingItem, setEditingItem] = useState<any>(null);

  // Input states
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [plano, setPlano] = useState('6668ab010101010101010103'); // default Clube Completo
  const [especialidade, setEspecialidade] = useState('');
  const [registro, setRegistro] = useState('');
  const [creditAmount, setCreditAmount] = useState(1);
  const [creditType, setCreditType] = useState<'academia' | 'massagem'>('academia');

  // Simple hardcoded configs
  const plansList = [
    { id: '6668ab010101010101010101', nome: 'Academia VIP', preco: 150 },
    { id: '6668ab010101010101010102', nome: 'Fisioterapia Individual', preco: 450 },
    { id: '6668ab010101010101010103', nome: 'Clube Completo (Fisio + Academia)', preco: 490 }
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resClients, resProfs, resApts] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/professionals'),
        fetch('/api/appointments')
      ]);
      const jsonClients = await resClients.json();
      const jsonProfs = await resProfs.json();
      const jsonApts = await resApts.json();

      if (jsonClients.success) setClients(jsonClients.data);
      if (jsonProfs.success) setProfessionals(jsonProfs.data);
      if (jsonApts.success) setAppointments(jsonApts.data);
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
              <span style={{ fontSize: '0.75rem', background: 'var(--color-primary)', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontWeight: 600 }}>
                Frequência Semanal (Seg-Sáb)
              </span>
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
                  {clients.map(c => {
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
                  })}
                </tbody>
              </table>
            </div>
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
            <button className="btn btn-primary" onClick={() => handleOpenProfModal()}>
              <i className="fa-solid fa-plus"></i> Novo Profissional
            </button>
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
                  {professionals.map(p => (
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
                  ))}
                </tbody>
              </table>
            </div>
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
            <button className="btn btn-primary" onClick={() => handleOpenClientModal()}>
              <i className="fa-solid fa-plus"></i> Novo Aluno
            </button>
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
                    <th>Créditos Restantes</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(c => {
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
                        <td>
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
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Default Fallback for other tabs */}
      {!['dashboard', 'profissionais', 'clientes'].includes(activeTab) && (
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
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>
                {modalType === 'client' && (editingItem ? 'Editar Aluno' : 'Cadastrar Aluno')}
                {modalType === 'professional' && (editingItem ? 'Editar Profissional' : 'Cadastrar Profissional')}
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
                        {plansList.map(p => (
                          <option key={p.id} value={p.id}>{p.nome} - R$ {p.preco}</option>
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
