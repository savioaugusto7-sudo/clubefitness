'use client';

import { Suspense } from 'react';
import FichaStandalonePage from './[id]/page';

export default function FichaIndexPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#070b14' }} />}>
      <FichaStandalonePage />
    </Suspense>
  );
}
