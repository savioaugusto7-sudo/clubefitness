'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import WorkoutBuilder from '@/components/WorkoutBuilder';

function FichaStandaloneContent() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const clientId = (params?.id as string) || searchParams.get('clientId') || '';
  const initialNameParam = searchParams.get('studentName') || searchParams.get('name') || '';
  const initialFichaId = searchParams.get('fichaId') || 'A';

  const [clientName, setClientName] = useState<string>(initialNameParam ? decodeURIComponent(initialNameParam) : '');
  const [loadingClient, setLoadingClient] = useState(!initialNameParam);

  // Definir título da aba imediatamente
  useEffect(() => {
    const displayName = clientName || (initialNameParam ? decodeURIComponent(initialNameParam) : 'Aluno');
    document.title = `${displayName} • Ficha de Treino | Clube Fitness`;
  }, [clientName, initialNameParam]);

  // Autenticação
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.href)}`);
    }
  }, [status, router]);

  // Se o nome não veio na URL, buscar dados do aluno
  useEffect(() => {
    if (!clientId) return;
    if (initialNameParam && !clientName) {
      setClientName(decodeURIComponent(initialNameParam));
      setLoadingClient(false);
      return;
    }

    const fetchClient = async () => {
      try {
        const res = await fetch(`/api/clients?id=${clientId}`);
        const data = await res.json();
        if (data.success && data.data) {
          const c = data.data;
          const foundName = c.dadosPessoais?.nome || c.nome || 'Aluno';
          setClientName(foundName);
          document.title = `${foundName} • Ficha de Treino | Clube Fitness`;
        }
      } catch (err) {
        console.error('Erro ao buscar dados do aluno:', err);
      } finally {
        setLoadingClient(false);
      }
    };

    fetchClient();
  }, [clientId, initialNameParam]);

  if (status === 'loading' || (loadingClient && !clientName)) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#070b14',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(16,185,129,0.2)', borderTop: '3px solid #10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '16px', color: '#94a3b8', fontSize: '0.9rem' }}>Carregando ficha de treino...</p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!clientId) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#070b14',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <p style={{ color: '#ef4444', fontSize: '1.1rem', fontWeight: 700 }}>Aluno não especificado.</p>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            marginTop: '12px',
            padding: '8px 18px',
            background: '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 700
          }}
        >
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  return (
    <WorkoutBuilder
      clientId={clientId}
      clientName={clientName || 'Aluno'}
      initialFichaId={initialFichaId}
      onClose={() => {
        if (typeof window !== 'undefined') {
          if (window.opener || window.history.length <= 1) {
            window.close();
          } else {
            router.push('/dashboard');
          }
        }
      }}
    />
  );
}

export default function FichaStandalonePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#070b14' }} />}>
      <FichaStandaloneContent />
    </Suspense>
  );
}
