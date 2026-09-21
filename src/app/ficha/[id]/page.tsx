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
  const initialCategoryParam = (searchParams.get('category') || searchParams.get('categoria') || '') as 'fichasMonitorado' | 'fichasLivre' | '';
  const initialSlotTime = searchParams.get('horario') || searchParams.get('time') || '';

  const [clientName, setClientName] = useState<string>(
    initialNameParam && initialNameParam !== 'Aluno' ? decodeURIComponent(initialNameParam) : ''
  );
  const [loadingClient, setLoadingClient] = useState(!clientName);

  // Definir título da aba imediatamente
  useEffect(() => {
    if (clientName && clientName !== 'Aluno') {
      document.title = `${clientName} • Ficha de Treino | Clube Fitness`;
    } else {
      document.title = `Ficha de Treino | Clube Fitness`;
    }
  }, [clientName]);

  // Autenticação
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.href)}`);
    }
  }, [status, router]);

  // Buscar dados do aluno no backend para garantir nome real e atualizado
  useEffect(() => {
    if (!clientId) return;

    let isMounted = true;
    const fetchClient = async () => {
      try {
        const res = await fetch(`/api/clients?id=${clientId}`);
        const data = await res.json();
        if (data.success && data.data && isMounted) {
          const raw = data.data;
          const c = Array.isArray(raw) ? raw[0] : raw;
          const foundName = c?.dadosPessoais?.nome || c?.nome || '';
          if (foundName) {
            setClientName(foundName);
            document.title = `${foundName} • Ficha de Treino | Clube Fitness`;
          }
        }
      } catch (err) {
        console.error('Erro ao buscar dados do aluno:', err);
      } finally {
        if (isMounted) setLoadingClient(false);
      }
    };

    fetchClient();
    return () => {
      isMounted = false;
    };
  }, [clientId]);

  if (status === 'loading' || (loadingClient && !clientName)) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        backgroundColor: '#070b14',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{
          width: '46px',
          height: '46px',
          border: '3px solid rgba(16,185,129,0.18)',
          borderTop: '3px solid #10b981',
          borderRadius: '50%',
          animation: 'fichaSpin 0.8s linear infinite',
          margin: '0 auto'
        }}></div>
        <p style={{ marginTop: '18px', color: '#94a3b8', fontSize: '0.95rem', fontWeight: 600, textAlign: 'center' }}>
          Carregando ficha de treino...
        </p>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes fichaSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}} />
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
      clientName={clientName || ''}
      initialFichaId={initialFichaId}
      initialCategory={initialCategoryParam || undefined}
      initialSlotTime={initialSlotTime || undefined}
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
    <Suspense fallback={
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#070b14',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{
          width: '46px',
          height: '46px',
          border: '3px solid rgba(16,185,129,0.18)',
          borderTop: '3px solid #10b981',
          borderRadius: '50%',
          animation: 'fichaSpin 0.8s linear infinite',
          margin: '0 auto'
        }}></div>
        <p style={{ marginTop: '18px', color: '#94a3b8', fontSize: '0.95rem', fontWeight: 600, textAlign: 'center' }}>
          Carregando ficha de treino...
        </p>
      </div>
    }>
      <FichaStandaloneContent />
    </Suspense>
  );
}
