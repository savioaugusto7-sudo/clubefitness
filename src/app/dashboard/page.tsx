'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardAdmin from '@/components/DashboardAdmin';
import DashboardReceptionist from '@/components/DashboardReceptionist';
import DashboardProfessional from '@/components/DashboardProfessional';
import DashboardClient from '@/components/DashboardClient';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');
  const [adminViewMode, setAdminViewMode] = useState<'admin' | 'receptionist' | 'professional' | 'client'>('admin');

  const hasInitializedMode = useRef(false);

  useEffect(() => {
    if (session?.user && !hasInitializedMode.current) {
      const u = session.user as any;
      const roles = u.activeRoles || [u.role || 'client'];
      if (roles.length > 0) {
        setAdminViewMode(roles[0]);
        hasInitializedMode.current = true;
      }
    }
  }, [session]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    // Redirecionar cliente novo para o onboarding se cadastro não concluído
    if (status === 'authenticated') {
      const u = session?.user as any;
      if (u?.role === 'client' && u?.cadastroConcluido === false) {
        router.push('/onboarding');
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('activeTab');
      if (tab) {
        setActiveTab(tab);
      }
    }
  }, []);

  const handleSeedDB = async () => {
    setSeeding(true);
    setSeedMessage('Resetando dados de teste...');
    try {
      const res = await fetch('/api/seed');
      const data = await res.json();
      if (data.success) {
        setSeedMessage('Dados de teste resetados!');
        setTimeout(() => setSeedMessage(''), 3000);
        // Refresh page
        window.location.reload();
      } else {
        setSeedMessage('Erro: ' + data.error);
      }
    } catch (err: any) {
      setSeedMessage('Erro de rede.');
    } finally {
      setSeeding(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="login-loading-container">
        <div className="spinner"></div>
        <p>Verificando sessão...</p>
      </div>
    );
  }

  if (!session) return null;

  const user = session.user as any;

  if (user.needPasswordChange) {
    return (
      <div className="login-page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-main)' }}>
        <div className="login-card-glow"></div>
        <ChangePasswordCard userEmail={user.email} />
      </div>
    );
  }
  const activeRoles = user.activeRoles || [user.role || 'client'];
  const effectiveRole = activeRoles.length > 1 ? adminViewMode : (activeRoles[0] || 'client');

  // Render the view according to active tab and role
  const renderContent = () => {
    if (effectiveRole === 'admin') {
      return <DashboardAdmin activeTab={activeTab} setActiveTab={setActiveTab} />;
    } else if (effectiveRole === 'receptionist') {
      return <DashboardReceptionist activeTab={activeTab} setActiveTab={setActiveTab} />;
    } else if (effectiveRole === 'professional') {
      return <DashboardProfessional activeTab={activeTab} setActiveTab={setActiveTab} professionalId={user.professionalProfileId || user.profileId || '6668ab030303030303030301'} />;
    } else {
      return <DashboardClient activeTab={activeTab} setActiveTab={setActiveTab} clientId={user.clientProfileId || user.profileId || '6668ab040404040404040401'} />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar 
        role={effectiveRole} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userName={user.name || 'Usuário'}
        userCargo={user.cargo}
      />

      {/* Main Content Area */}
      <main className="main-content" id="mainContent">
        {/* Header toolbar */}
        <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h4 style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Clube Fitness Fisio
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge" style={{ 
                background: user.role === 'admin' ? 'rgba(245, 158, 11, 0.1)' : user.role === 'receptionist' ? 'rgba(236, 72, 153, 0.1)' : user.role === 'professional' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                color: user.role === 'admin' ? 'var(--color-warning)' : user.role === 'receptionist' ? '#ec4899' : user.role === 'professional' ? 'var(--color-accent)' : 'var(--color-primary)',
                fontWeight: 700,
                fontSize: '0.75rem',
                padding: '4px 8px',
                borderRadius: '6px',
                textTransform: 'uppercase'
              }}>
                {user.cargo || (user.role === 'admin' ? 'ADMIN' : user.role === 'receptionist' ? 'RECEPÇÃO' : user.role === 'professional' ? 'PROFISSIONAL' : 'ALUNO')}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Logado como: <strong>{user.email}</strong>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {activeRoles.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>Visualizar como:</span>
                <select 
                  value={adminViewMode} 
                  onChange={(e) => {
                    setAdminViewMode(e.target.value as any);
                    setActiveTab('dashboard');
                  }}
                  style={{ 
                    fontSize: '0.78rem', 
                    padding: '6px 12px', 
                    background: 'var(--bg-secondary)', 
                    color: 'var(--text-main)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '6px',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  {activeRoles.includes('admin') && <option value="admin">Administrador Geral</option>}
                  {activeRoles.includes('receptionist') && <option value="receptionist">Recepção</option>}
                  {activeRoles.includes('professional') && <option value="professional">Profissional</option>}
                  {activeRoles.includes('client') && <option value="client">Aluno</option>}
                </select>
              </div>
            )}
            {user.role === 'admin' && user.email === 'admin@clube.com' && (
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={handleSeedDB}
                disabled={seeding}
                style={{ fontSize: '0.75rem' }}
              >
                <i className="fa-solid fa-database" style={{ marginRight: '6px' }}></i>
                {seedMessage || 'Resetar Dados de Teste'}
              </button>
            )}
            <button 
              className="btn btn-danger btn-sm" 
              onClick={() => signOut({ callbackUrl: '/login?from=logout' })}
              style={{ fontSize: '0.75rem' }}
            >
              <i className="fa-solid fa-right-from-bracket" style={{ marginRight: '6px' }}></i>
              Sair
            </button>
          </div>
        </header>

        {/* Dynamic page content */}
        {renderContent()}
      </main>
    </div>
  );
}

function ChangePasswordCard({ userEmail }: { userEmail: string }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMsg('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Senha cadastrada com sucesso!');
      } else {
        setErrorMsg(data.error || 'Erro ao atualizar a senha.');
        setLoading(false);
      }
    } catch (err) {
      setErrorMsg('Erro de conexão. Tente novamente.');
      setLoading(false);
    }
  };

  if (successMsg) {
    return (
      <div className="login-card" style={{ width: '100%', maxWidth: '420px', padding: '32px' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '3rem', color: 'var(--color-primary)' }}>
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Senha Cadastrada!</h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-dim)', margin: 0 }}>
            Sua senha inicial foi atualizada com segurança. Por favor, faça login novamente usando a sua nova senha.
          </p>
          <button 
            className="btn btn-primary" 
            onClick={() => signOut({ callbackUrl: '/login?from=logout' })}
            style={{ width: '100%', padding: '12px', marginTop: '8px' }}
          >
            Fazer Login Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-card" style={{ width: '100%', maxWidth: '420px', padding: '32px' }}>
      <div className="login-brand" style={{ marginBottom: '24px' }}>
        <div className="login-logo-circle" style={{ overflow: 'hidden', margin: '0 auto 16px auto' }}>
          <img src="/logo.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', margin: 0 }}>Cadastrar Nova Senha</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', margin: 0 }}>
          Este é o seu primeiro acesso como <strong>{userEmail}</strong>. Por segurança, defina uma senha pessoal de acesso.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
        {errorMsg && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid var(--color-danger)', 
            color: '#f87171', 
            padding: '10px 14px', 
            borderRadius: '6px', 
            fontSize: '0.78rem' 
          }}>
            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>
            {errorMsg}
          </div>
        )}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>Nova Senha</label>
          <input 
            type="password" 
            className="form-control" 
            placeholder="Mínimo 6 caracteres" 
            value={newPassword} 
            onChange={e => setNewPassword(e.target.value)} 
            required 
            disabled={loading}
            style={{ fontSize: '0.85rem', padding: '10px 12px' }} 
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>Confirmar Nova Senha</label>
          <input 
            type="password" 
            className="form-control" 
            placeholder="Repita a senha" 
            value={confirmPassword} 
            onChange={e => setConfirmPassword(e.target.value)} 
            required 
            disabled={loading}
            style={{ fontSize: '0.85rem', padding: '10px 12px' }} 
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '8px', padding: '11px' }}>
          {loading ? 'Salvando...' : 'Salvar e Acessar'}
        </button>
      </form>
    </div>
  );
}


