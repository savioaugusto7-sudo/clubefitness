export interface WellnessResult {
  score: number;
  status: 'otimo' | 'moderado' | 'ruim' | 'critico';
  statusLabel: string;
  statusColor: string;
  statusBadgeBg: string;
  conduta: string;
  regrasAtivadas: string[];
}

export function calculateWellness(sono: number, fadiga: number, dorMuscular: number): WellnessResult {
  const s = Math.max(1, Math.min(10, Number(sono) || 1));
  const f = Math.max(1, Math.min(10, Number(fadiga) || 1));
  const d = Math.max(1, Math.min(10, Number(dorMuscular) || 1));

  const score = s + f + d;
  const regrasAtivadas: string[] = [];

  // Regras de Segurança Críticas (Prioritárias)
  // 1. Sono >= 8 + Fadiga >= 7 -> Repouso Total / Avaliação Fisioterapêutica
  if (s >= 8 && f >= 7) {
    regrasAtivadas.push('Sono Crítico (≥8) + Fadiga Severa (≥7)');
    return {
      score,
      status: 'critico',
      statusLabel: 'Estado Crítico / Avaliação',
      statusColor: '#ef4444',
      statusBadgeBg: 'rgba(239, 68, 68, 0.15)',
      conduta: 'Repouso Total / Avaliação Fisioterapêutica',
      regrasAtivadas
    };
  }

  // 2. Fadiga >= 7 + Dor >= 6 -> Treino Regenerativo ou Repouso
  if (f >= 7 && d >= 6) {
    regrasAtivadas.push('Fadiga Severa (≥7) + Dor Muscular Alta (≥6)');
    return {
      score,
      status: 'ruim',
      statusLabel: 'Estado Ruim / Regenerativo',
      statusColor: '#f97316',
      statusBadgeBg: 'rgba(249, 115, 22, 0.15)',
      conduta: 'Treino Regenerativo ou Repouso',
      regrasAtivadas
    };
  }

  // 3. Dor >= 7 -> Treino Técnico Leve, sem treino de força ou impacto
  if (d >= 7) {
    regrasAtivadas.push('Dor Muscular Elevada (≥7)');
    return {
      score,
      status: 'moderado',
      statusLabel: 'Ajuste por Dor Elevada',
      statusColor: '#eab308',
      statusBadgeBg: 'rgba(234, 179, 8, 0.15)',
      conduta: 'Treino Técnico Leve (sem treino de força ou impacto)',
      regrasAtivadas
    };
  }

  // 4. Sono 1-3 + Fadiga 1-3 + Dor 1-3 -> Treino Completo
  if (s <= 3 && f <= 3 && d <= 3) {
    regrasAtivadas.push('Excelência Fisiológica (Sono, Fadiga e Dor ≤ 3)');
    return {
      score,
      status: 'otimo',
      statusLabel: 'Estado Ótimo',
      statusColor: '#10b981',
      statusBadgeBg: 'rgba(16, 185, 129, 0.15)',
      conduta: 'Treino Completo de Alta Carga Liberado',
      regrasAtivadas
    };
  }

  // Classificação Base por Pontuação Composta
  if (score <= 10) {
    return {
      score,
      status: 'otimo',
      statusLabel: 'Estado Ótimo',
      statusColor: '#10b981',
      statusBadgeBg: 'rgba(16, 185, 129, 0.15)',
      conduta: 'Treino de Alta Carga Liberado',
      regrasAtivadas
    };
  } else if (score <= 17) {
    return {
      score,
      status: 'moderado',
      statusLabel: 'Estado Moderado',
      statusColor: '#eab308',
      statusBadgeBg: 'rgba(234, 179, 8, 0.15)',
      conduta: 'Ajuste de Carga Recomendado',
      regrasAtivadas
    };
  } else if (score <= 24) {
    return {
      score,
      status: 'ruim',
      statusLabel: 'Estado Ruim',
      statusColor: '#f97316',
      statusBadgeBg: 'rgba(249, 115, 22, 0.15)',
      conduta: 'Treino Regenerativo ou Repouso',
      regrasAtivadas
    };
  } else {
    return {
      score,
      status: 'critico',
      statusLabel: 'Estado Crítico',
      statusColor: '#ef4444',
      statusBadgeBg: 'rgba(239, 68, 68, 0.15)',
      conduta: 'Repouso Total',
      regrasAtivadas
    };
  }
}
