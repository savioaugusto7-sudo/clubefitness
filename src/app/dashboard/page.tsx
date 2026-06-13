'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import DashboardAdmin from '@/components/DashboardAdmin';
import DashboardProfessional from '@/components/DashboardProfessional';
import DashboardClient from '@/components/DashboardClient';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

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
  const role = user.role || 'client';

  // Render the view according to active tab and role
  const renderContent = () => {
    if (role === 'admin') {
      return <DashboardAdmin activeTab={activeTab} setActiveTab={setActiveTab} />;
    } else if (role === 'professional') {
      return <DashboardProfessional activeTab={activeTab} setActiveTab={setActiveTab} />;
    } else {
      return <DashboardClient activeTab={activeTab} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar 
        role={role} 
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
                background: role === 'admin' ? 'rgba(245, 158, 11, 0.1)' : role === 'professional' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                color: role === 'admin' ? 'var(--color-warning)' : role === 'professional' ? 'var(--color-accent)' : 'var(--color-primary)',
                fontWeight: 700,
                fontSize: '0.75rem',
                padding: '4px 8px',
                borderRadius: '6px',
                textTransform: 'uppercase'
              }}>
                {user.cargo || (role === 'admin' ? 'ADMIN' : role === 'professional' ? 'PROFISSIONAL' : 'ALUNO')}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Logado como: <strong>{user.email}</strong>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {role === 'admin' && process.env.NODE_ENV === 'development' && (
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
