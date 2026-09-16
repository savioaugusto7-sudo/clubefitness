'use client';

import { SessionProvider } from 'next-auth/react';
import React from 'react';
import SmartErrorBoundary from '@/components/SmartErrorBoundary';
import { ThemeProvider } from '@/contexts/ThemeContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <SmartErrorBoundary fallbackTitle="Painel Clube Fitness">
          {children}
        </SmartErrorBoundary>
      </ThemeProvider>
    </SessionProvider>
  );
}

