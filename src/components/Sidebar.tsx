'use client';

import React, { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';

interface TabConfig {
  id: string;
  label: string;
  icon: string;
}

export interface SidebarCategory {
  title: string;
  icon?: string;
  tabs: TabConfig[];
}

interface SidebarProps {
  role: 'admin' | 'receptionist' | 'professional' | 'client';
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userName: string;
  userCargo?: string;
}

const categoryConfigs: Record<string, SidebarCategory[]> = {
  admin: [
    {
      title: 'GERAL & VISÃO',
      icon: 'fa-chart-pie',
      tabs: [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
        { id: 'agenda_completa', label: 'Agenda Geral', icon: 'fa-calendar-alt' },
        { id: 'log_atividades', label: 'Log de Atividades', icon: 'fa-history' }
      ]
    },
    {
      title: 'PESSOAS & ALUNOS',
      icon: 'fa-users',
      tabs: [
        { id: 'usuarios', label: 'Cadastro de Usuários', icon: 'fa-user-cog' },
        { id: 'profissionais', label: 'Profissionais', icon: 'fa-user-md' },
        { id: 'clientes', label: 'Clientes', icon: 'fa-users' },
        { id: 'vincular_alunos', label: 'Vincular Alunos', icon: 'fa-link' },
        { id: 'dados_clinicos', label: 'Dados Clínicos', icon: 'fa-notes-medical' }
      ]
    },
    {
      title: 'COMERCIAL & FINANCEIRO',
      icon: 'fa-wallet',
      tabs: [
        { id: 'financeiro', label: 'Financeiro', icon: 'fa-wallet' },
        { id: 'gestao_contratos', label: 'Gestão de Contratos', icon: 'fa-file-signature' },
        { id: 'asaas', label: 'Cobranças Asaas', icon: 'fa-credit-card' },
        { id: 'controle_creditos', label: 'Controle de Créditos', icon: 'fa-coins' }
      ]
    },
    {
      title: 'CONFIGURAÇÕES DA ACADEMIA',
      icon: 'fa-sliders',
      tabs: [
        { id: 'planos', label: 'Planos & Configs', icon: 'fa-tags' },
        { id: 'config_agenda', label: 'Configuração da Agenda', icon: 'fa-calendar-check' },
        { id: 'agenda_fixa', label: 'Horários Fixos', icon: 'fa-thumbtack' },
        { id: 'tv_panel', label: 'Painel TV Clínica', icon: 'fa-tv' },
        { id: 'trancamentos_admin', label: 'Acompanhar Trancamentos', icon: 'fa-snowflake' },
        { id: 'configuracoes', label: 'Configurações', icon: 'fa-gear' }
      ]
    },
    {
      title: 'PRESCRIÇÕES & RECURSOS',
      icon: 'fa-briefcase-medical',
      tabs: [
        { id: 'medicamentos', label: 'Medicamentos', icon: 'fa-pills' },
        { id: 'solicitacoes_exercicios', label: 'Exercícios Solicitados', icon: 'fa-clipboard-question' }
      ]
    }
  ],
  professional: [
    {
      title: 'ATENDIMENTO & AGENDA',
      icon: 'fa-calendar-alt',
      tabs: [
        { id: 'resumo_dia', label: 'Resumo do Dia', icon: 'fa-clipboard-list' },
        { id: 'dashboard', label: 'Agenda Completa', icon: 'fa-calendar-alt' },
        { id: 'clientes', label: 'Clientes Vinculados', icon: 'fa-user-friends' },
        { id: 'dados_clinicos', label: 'Dados Clínicos', icon: 'fa-notes-medical' },
        { id: 'frequencia_alunos', label: 'Frequência dos Alunos', icon: 'fa-chart-bar' }
      ]
    },
    {
      title: 'TREINOS & AVALIAÇÕES',
      icon: 'fa-dumbbell',
      tabs: [
        { id: 'treinos_prof', label: 'Fichas de Treino', icon: 'fa-dumbbell' },
        { id: 'avaliacoes', label: 'Avaliações Físicas', icon: 'fa-heartbeat' },
        { id: 'relatorios', label: 'Relatórios Fisioterápicos', icon: 'fa-file-medical' },
        { id: 'testes_forca', label: 'Testes de Força', icon: 'fa-weight-hanging' },
        { id: 'prontuarios', label: 'Prontuários', icon: 'fa-notes-medical' }
      ]
    }
  ],
  receptionist: [
    {
      title: 'RECEPÇÃO & AGENDA',
      icon: 'fa-clipboard-check',
      tabs: [
        { id: 'dashboard', label: 'Painel da Recepção', icon: 'fa-chart-pie' },
        { id: 'clientes', label: 'Clientes', icon: 'fa-users' },
        { id: 'agendamentos', label: 'Agendamentos', icon: 'fa-calendar-alt' },
        { id: 'agenda_fixa', label: 'Horários Fixos', icon: 'fa-thumbtack' },
        { id: 'frequencia', label: 'Frequência & Evasão', icon: 'fa-chart-bar' }
      ]
    },
    {
      title: 'COMERCIAL & CONTRATOS',
      icon: 'fa-file-contract',
      tabs: [
        { id: 'mensalidades', label: 'Mensalidades', icon: 'fa-money-bill-wave' },
        { id: 'contratos', label: 'Contratos', icon: 'fa-file-contract' }
      ]
    }
  ],
  client: [
    {
      title: 'PAINEL DO ALUNO',
      icon: 'fa-user-circle',
      tabs: [
        { id: 'dashboard', label: 'Painel do Aluno', icon: 'fa-home' },
        { id: 'agendar', label: 'Agendar Horário', icon: 'fa-calendar-plus' },
        { id: 'agendamentos', label: 'Meus Agendamentos', icon: 'fa-clock' },
        { id: 'evolucao', label: 'Minha Evolução', icon: 'fa-chart-line' },
        { id: 'treino', label: 'Ficha de Treino', icon: 'fa-dumbbell' },
        { id: 'documentos', label: 'Meus Documentos', icon: 'fa-file-pdf' },
        { id: 'creditos', label: 'Meus Créditos', icon: 'fa-coins' },
        { id: 'trancamento', label: 'Trancar Plano', icon: 'fa-snowflake' }
      ]
    }
  ]
};

const bottomNavConfigs: Record<string, TabConfig[]> = {
  admin: [
    { id: 'dashboard', label: 'Início', icon: 'fa-chart-pie' },
    { id: 'agenda_completa', label: 'Agenda', icon: 'fa-calendar-alt' },
    { id: 'clientes', label: 'Clientes', icon: 'fa-users' },
    { id: 'financeiro', label: 'Financeiro', icon: 'fa-wallet' }
  ],
  professional: [
    { id: 'resumo_dia', label: 'Resumo', icon: 'fa-clipboard-list' },
    { id: 'dashboard', label: 'Agenda', icon: 'fa-calendar-alt' },
    { id: 'clientes', label: 'Alunos', icon: 'fa-user-friends' },
    { id: 'treinos_prof', label: 'Treinos', icon: 'fa-dumbbell' }
  ],
  receptionist: [
    { id: 'dashboard', label: 'Painel', icon: 'fa-chart-pie' },
    { id: 'clientes', label: 'Clientes', icon: 'fa-users' },
    { id: 'agendamentos', label: 'Agendas', icon: 'fa-calendar-alt' },
    { id: 'mensalidades', label: 'Mensalidades', icon: 'fa-money-bill-wave' }
  ],
  client: [
    { id: 'dashboard', label: 'Início', icon: 'fa-home' },
    { id: 'agendar', label: 'Agendar', icon: 'fa-calendar-plus' },
    { id: 'treino', label: 'Treino', icon: 'fa-dumbbell' },
    { id: 'documentos', label: 'Laudos', icon: 'fa-file-pdf' }
  ]
};

export default function Sidebar({ role, activeTab, setActiveTab, userName, userCargo }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  const categories = categoryConfigs[role] || [];
  const allTabs = categories.flatMap(c => c.tabs);

  // Automatically ensure category of active tab is expanded
  useEffect(() => {
    const activeCategory = categories.find(cat => cat.tabs.some(t => t.id === activeTab));
    if (activeCategory) {
      setOpenCategories(prev => ({ ...prev, [activeCategory.title]: true }));
    }
  }, [activeTab, role]);

  const toggleCategory = (title: string) => {
    setOpenCategories(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Sidebar Container */}
      <aside className="sidebar" id="appSidebar" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Brand Section */}
        <div className="brand-section">
          <div className="brand-logo" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            overflow: 'hidden'
          }}>
            <img src="/logo.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div className="brand-name">CLUBE FITNESS FISIO</div>
        </div>

        {/* Menu Search Bar */}
        <div style={{ padding: '0 16px 12px 16px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', fontSize: '0.75rem', color: 'var(--text-dim)' }}></i>
            <input
              type="text"
              placeholder="Buscar no menu..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 28px',
                fontSize: '0.78rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--text-main)',
                outline: 'none'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Navigation Menu */}
        <nav className="nav-menu" style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
          {categories.map((category) => {
            const matchingTabs = category.tabs.filter(t => 
              !searchTerm || t.label.toLowerCase().includes(searchTerm.toLowerCase())
            );

            if (searchTerm && matchingTabs.length === 0) return null;

            const isOpen = searchTerm ? true : (openCategories[category.title] ?? true);
            const hasActiveTab = category.tabs.some(t => t.id === activeTab);

            return (
              <div key={category.title} style={{ marginBottom: '10px' }}>
                {/* Category Header */}
                <div
                  onClick={() => toggleCategory(category.title)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 16px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: hasActiveTab ? 'var(--color-primary)' : 'var(--text-dim)',
                    letterSpacing: '0.5px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    textTransform: 'uppercase',
                    opacity: 0.9
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {category.icon && <i className={`fa-solid ${category.icon}`} style={{ fontSize: '0.72rem' }}></i>}
                    {category.title}
                  </span>
                  <i className={`fa-solid fa-chevron-${isOpen ? 'down' : 'right'}`} style={{ fontSize: '0.65rem', opacity: 0.7 }}></i>
                </div>

                {/* Category Items */}
                {isOpen && (
                  <div style={{ marginTop: '4px' }}>
                    {matchingTabs.map((tab) => (
                      <div
                        key={tab.id}
                        className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => handleTabClick(tab.id)}
                        style={{ paddingLeft: '22px' }}
                      >
                        <i className={`fa-solid ${tab.icon}`}></i>
                        <span>{tab.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Card footer */}
        <div className="user-profile-section">
          <div className="user-badge" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
              <div className="user-avatar" style={{ flexShrink: 0 }}>
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="user-info" style={{ overflow: 'hidden' }}>
                <div className="user-name" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{userName}</div>
                <div className="user-role" style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {userCargo || (role === 'admin' ? 'Administrador' : role === 'receptionist' ? 'Recepção' : role === 'professional' ? 'Profissional' : 'Aluno')}
                </div>
              </div>
            </div>
            <button 
              onClick={() => signOut({ callbackUrl: '/login?from=logout' })}
              title="Sair"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-danger)',
                cursor: 'pointer',
                fontSize: '1.1rem',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition-fast)',
                flexShrink: 0
              }}
            >
              <i className="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
        </div>
      </aside>

      {/* Bottom Nav Bar (Mobile Only) */}
      <div className="bottom-nav-bar">
        {bottomNavConfigs[role]?.map((tab) => (
          <div 
            key={tab.id} 
            className={`bottom-nav-item ${activeTab === tab.id ? 'active' : ''}`} 
            onClick={() => handleTabClick(tab.id)}
          >
            <i className={`fa-solid ${tab.icon}`}></i>
            <span>{tab.label}</span>
          </div>
        ))}
        <div className={`bottom-nav-item ${mobileOpen ? 'active' : ''}`} onClick={() => setMobileOpen(!mobileOpen)}>
          <i className="fa-solid fa-bars"></i>
          <span>Mais</span>
        </div>
      </div>

      {/* Bottom Drawer (Mobile Only) */}
      {mobileOpen && (
        <div className="bottom-drawer-overlay" onClick={() => setMobileOpen(false)}>
          <div className="bottom-drawer-content" onClick={e => e.stopPropagation()}>
            <div className="bottom-drawer-header">
              <h4>Mais Opções</h4>
              <button className="drawer-close" onClick={() => setMobileOpen(false)}>&times;</button>
            </div>
            <div className="bottom-drawer-grid">
              {allTabs
                .filter(tab => !bottomNavConfigs[role]?.some(bt => bt.id === tab.id))
                .map(tab => (
                  <div 
                    key={tab.id} 
                    className={`drawer-grid-item ${activeTab === tab.id ? 'active' : ''}`} 
                    onClick={() => handleTabClick(tab.id)}
                  >
                    <i className={`fa-solid ${tab.icon}`}></i>
                    <span>{tab.label}</span>
                  </div>
                ))}
              <div className="drawer-grid-item text-danger" onClick={() => signOut({ callbackUrl: '/login?from=logout' })}>
                <i className="fa-solid fa-right-from-bracket"></i>
                <span>Sair da Conta</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
