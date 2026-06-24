'use client';

import React, { useState } from 'react';
import { signOut } from 'next-auth/react';

interface TabConfig {
  id: string;
  label: string;
  icon: string;
}

interface SidebarProps {
  role: 'admin' | 'professional' | 'client';
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userName: string;
  userCargo?: string;
}

const tabConfigs: Record<string, TabConfig[]> = {
  admin: [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
    { id: 'usuarios', label: 'Cadastro de Usuários', icon: 'fa-user-cog' },
    { id: 'profissionais', label: 'Profissionais', icon: 'fa-user-md' },
    { id: 'clientes', label: 'Clientes', icon: 'fa-users' },
    { id: 'controle_creditos', label: 'Controle de Créditos', icon: 'fa-coins' },
    { id: 'planos', label: 'Planos & Configs', icon: 'fa-tags' },
    { id: 'agenda_fixa', label: 'Horários Fixos', icon: 'fa-thumbtack' },
    { id: 'testes_forca', label: 'Testes de Força', icon: 'fa-weight-hanging' },
    { id: 'financeiro', label: 'Financeiro', icon: 'fa-wallet' },
    { id: 'medicamentos', label: 'Medicamentos', icon: 'fa-pills' },
    { id: 'solicitacoes_exercicios', label: 'Exercícios Solicitados', icon: 'fa-clipboard-question' },
    { id: 'tv_panel', label: 'Painel TV Clínica', icon: 'fa-tv' },
    { id: 'configuracoes', label: 'Configurações', icon: 'fa-gear' }
  ],
  professional: [
    { id: 'resumo_dia', label: 'Resumo do Dia', icon: 'fa-clipboard-list' },
    { id: 'dashboard', label: 'Agenda Completa', icon: 'fa-calendar-alt' },
    { id: 'clientes', label: 'Clientes Vinculados', icon: 'fa-user-friends' },
    { id: 'treinos_prof', label: 'Fichas de Treino', icon: 'fa-dumbbell' },
    { id: 'agenda_fixa', label: 'Horários Fixos', icon: 'fa-thumbtack' },
    { id: 'avaliacoes', label: 'Avaliações Físicas', icon: 'fa-heartbeat' },
    { id: 'relatorios', label: 'Relatórios Fisioterápicos', icon: 'fa-file-medical' },
    { id: 'testes_forca', label: 'Testes de Força', icon: 'fa-weight-hanging' },
    { id: 'prontuarios', label: 'Prontuários', icon: 'fa-notes-medical' }
  ],
  client: [
    { id: 'dashboard', label: 'Painel do Aluno', icon: 'fa-home' },
    { id: 'agendar', label: 'Agendar Horário', icon: 'fa-calendar-plus' },
    { id: 'agendamentos', label: 'Meus Agendamentos', icon: 'fa-clock' },
    { id: 'evolucao', label: 'Minha Evolução', icon: 'fa-chart-line' },
    { id: 'treino', label: 'Ficha de Treino', icon: 'fa-dumbbell' },
    { id: 'documentos', label: 'Meus Documentos', icon: 'fa-file-pdf' }
  ]
};

export default function Sidebar({ role, activeTab, setActiveTab, userName, userCargo }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const tabs = tabConfigs[role] || [];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <div 
        className="mobile-menu-toggle" 
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{ zIndex: 1100 }}
      >
        <i className={`fa-solid ${mobileOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
      </div>

      {/* Sidebar Container */}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`} id="appSidebar">
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

        {/* Dynamic Navigation Menu */}
        <nav className="nav-menu">
          {tabs.map((tab) => (
            <div 
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabClick(tab.id)}
            >
              <i className={`fa-solid ${tab.icon}`}></i> 
              <span>{tab.label}</span>
            </div>
          ))}
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
                  {userCargo || (role === 'admin' ? 'Administrador' : role === 'professional' ? 'Profissional' : 'Aluno')}
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
    </>
  );
}

