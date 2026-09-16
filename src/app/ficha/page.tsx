'use client';

import { Suspense } from 'react';
import FichaStandalonePage from './[id]/page';

export default function FichaIndexPage() {
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
      <FichaStandalonePage />
    </Suspense>
  );
}
