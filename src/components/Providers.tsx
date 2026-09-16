'use client';

import { SessionProvider } from 'next-auth/react';
import React from 'react';
import SmartErrorBoundary from '@/components/SmartErrorBoundary';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SmartErrorBoundary fallbackTitle="Painel Clube Fitness">
        {children}
      </SmartErrorBoundary>
    </SessionProvider>
  );
}

