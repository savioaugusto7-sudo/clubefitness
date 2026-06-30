'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function LoginContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');

  // Credentials States
  const [loginMethod, setLoginMethod] = useState<'google' | 'email'>('google');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginErrorMsg, setLoginErrorMsg] = useState('');

  const error = searchParams.get('error');
  const fromLogout = searchParams.get('from') === 'logout';

  useEffect(() => {
    // Skip auto-redirect if user just logged out — show the account chooser instead
    if (session && !fromLogout) {
      router.push('/dashboard');
    }
  }, [session, fromLogout, router]);

  const handleGoogleLogin = () => {
    setLoading(true);
    signIn('google');
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      setLoginErrorMsg('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    setLoginErrorMsg('');
    try {
      const res = await signIn('credentials', {
        email: emailInput,
        password: passwordInput,
        redirect: false
      });
      if (res?.error) {
        setLoginErrorMsg('E-mail ou senha incorretos.');
        setLoading(false);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setLoginErrorMsg('Erro ao tentar fazer login.');
      setLoading(false);
    }
  };

  const handleDemoLogin = (email: string) => {
    setLoading(true);
    signIn('demo-credentials', { email, callbackUrl: '/dashboard' });
  };

  const handleSeedDB = async () => {
    setSeeding(true);
    setSeedMessage('Resetando dados de teste...');
    try {
      const res = await fetch('/api/seed');
      const data = await res.json();
      if (data.success) {
        setSeedMessage('Dados de teste resetados! Faça login com um perfil de teste.');
      } else {
        setSeedMessage('Erro: ' + data.error);
      }
    } catch (err: any) {
      setSeedMessage('Erro de rede.');
    } finally {
      setSeeding(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="login-loading-container">
        <div className="spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="login-page-wrapper">
      <div className="login-card-glow"></div>
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo-circle" style={{ overflow: 'hidden' }}>
            <img src="/logo.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1>CLUBE FITNESS FISIO</h1>
          <p>Gestão Inteligente de Saúde e Treino</p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--color-danger)',
            color: '#f87171',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            fontSize: '0.85rem',
            marginBottom: '20px',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-circle-exclamation"></i> Falha na autenticação
            </div>
            <div>
              {error === 'CredentialsSignin' ? (
                <span>Os perfis de teste podem não estar inicializados no banco de dados. Clique no botão de inicialização abaixo para popular o banco.</span>
              ) : (
                <span>Ocorreu um erro ao tentar entrar. Tente novamente.</span>
              )}
            </div>
          </div>
        )}

        {/* Banner shown when user landed here from logout but still has an active session */}
        {fromLogout && session && (
          <div style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px 16px',
            marginBottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--color-accent)' }}>
              <i className="fa-solid fa-circle-info"></i>
              <span>Você ainda está logado como <strong>{(session.user as any)?.name || session.user?.email}</strong>.</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => router.push('/dashboard')}
                style={{ flex: 1, fontSize: '0.8rem' }}
              >
                <i className="fa-solid fa-arrow-right" style={{ marginRight: '6px' }}></i>
                Voltar ao Dashboard
              </button>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center' }}>
              Para trocar de conta, escolha um perfil abaixo.
            </div>
          </div>
        )}

        {/* Login Method Toggle Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '24px', 
          background: 'rgba(255,255,255,0.03)', 
          padding: '4px', 
          borderRadius: '8px', 
          border: '1px solid var(--border-color)' 
        }}>
          <button 
            type="button" 
            onClick={() => {
              setLoginMethod('google');
              setLoginErrorMsg('');
            }}
            style={{ 
              flex: 1, 
              padding: '10px', 
              fontSize: '0.82rem', 
              fontWeight: 600, 
              borderRadius: '6px', 
              border: 'none', 
              cursor: 'pointer', 
              background: loginMethod === 'google' ? 'var(--color-primary)' : 'transparent', 
              color: 'var(--text-main)', 
              transition: 'var(--transition-fast)' 
            }}
          >
            <i className="fa-brands fa-google" style={{ marginRight: '6px' }}></i> Google
          </button>
          <button 
            type="button" 
            onClick={() => {
              setLoginMethod('email');
              setLoginErrorMsg('');
            }}
            style={{ 
              flex: 1, 
              padding: '10px', 
              fontSize: '0.82rem', 
              fontWeight: 600, 
              borderRadius: '6px', 
              border: 'none', 
              cursor: 'pointer', 
              background: loginMethod === 'email' ? 'var(--color-primary)' : 'transparent', 
              color: 'var(--text-main)', 
              transition: 'var(--transition-fast)' 
            }}
          >
            <i className="fa-solid fa-envelope" style={{ marginRight: '6px' }}></i> E-mail/Senha
          </button>
        </div>

        {loginMethod === 'google' ? (
          <button className="btn btn-primary login-btn-google" onClick={handleGoogleLogin}>
            <i className="fa-brands fa-google"></i>
            Entrar com o Google
          </button>
        ) : (
          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
            {loginErrorMsg && (
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid var(--color-danger)', 
                color: '#f87171', 
                padding: '10px 14px', 
                borderRadius: '6px', 
                fontSize: '0.78rem', 
                marginBottom: '4px' 
              }}>
                <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>
                {loginErrorMsg}
              </div>
            )}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>E-mail</label>
              <input 
                type="email" 
                className="form-control" 
                placeholder="seu-email@provedor.com" 
                value={emailInput} 
                onChange={e => setEmailInput(e.target.value)} 
                required 
                style={{ fontSize: '0.85rem', padding: '10px 12px' }} 
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>Senha</label>
              <input 
                type="password" 
                className="form-control" 
                placeholder="Sua senha" 
                value={passwordInput} 
                onChange={e => setPasswordInput(e.target.value)} 
                required 
                style={{ fontSize: '0.85rem', padding: '10px 12px' }} 
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px', padding: '11px' }}>
              Entrar
            </button>
          </form>
        )}

        {process.env.NODE_ENV === 'development' && (
          <>
            <div className="login-divider">
              <span>{fromLogout && session ? 'TROCAR PARA PERFIL DE TESTE' : 'OU SIMULE UM PERFIL DE TESTE'}</span>
            </div>

            <div className="demo-users-grid">
              <button className="demo-user-btn" onClick={() => handleDemoLogin('admin@clube.com')}>
                <i className="fa-solid fa-shield-halved color-warning"></i>
                <div className="demo-info">
                  <strong>Administrador Geral</strong>
                  <span>admin@clube.com</span>
                </div>
              </button>

              <button className="demo-user-btn" onClick={() => handleDemoLogin('fisio@clube.com')}>
                <i className="fa-solid fa-user-md color-accent"></i>
                <div className="demo-info">
                  <strong>Dr. André (Fisio)</strong>
                  <span>fisio@clube.com</span>
                </div>
              </button>

              <button className="demo-user-btn" onClick={() => handleDemoLogin('prof@clube.com')}>
                <i className="fa-solid fa-dumbbell color-primary"></i>
                <div className="demo-info">
                  <strong>Profª. Camila (Treino)</strong>
                  <span>prof@clube.com</span>
                </div>
              </button>

              <button className="demo-user-btn" onClick={() => handleDemoLogin('aluno1@clube.com')}>
                <i className="fa-solid fa-user color-success"></i>
                <div className="demo-info">
                  <strong>Sávio Silva (Aluno VIP)</strong>
                  <span>aluno1@clube.com</span>
                </div>
              </button>

              <button className="demo-user-btn" onClick={() => handleDemoLogin('aluno2@clube.com')}>
                <i className="fa-solid fa-user color-info"></i>
                <div className="demo-info">
                  <strong>Maria Santos (Aluno)</strong>
                  <span>aluno2@clube.com</span>
                </div>
              </button>
            </div>
          </>
        )}

        {/* Database seed utility section */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{
            marginTop: '28px',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch'
          }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleSeedDB}
              disabled={seeding}
              style={{
                padding: '10px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <i className="fa-solid fa-database"></i>
              {seeding ? 'Resetando dados de teste...' : 'Inicializar / Resetar Dados de Teste'}
            </button>
            {seedMessage && (
              <div style={{
                marginTop: '10px',
                fontSize: '0.75rem',
                color: seedMessage.startsWith('Erro') ? '#ef4444' : '#10b981',
                fontWeight: '500',
                textAlign: 'center'
              }}>
                {seedMessage}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="login-loading-container">
        <div className="spinner"></div>
        <p>Carregando...</p>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
