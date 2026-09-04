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

  // Normalização do Sono:
  // No formulário, 1 = Péssimo/Insônia e 10 = Excelente/Reparador.
  // Para cálculo de sobrecarga/estresse fisiológico (1 = ótimo, 10 = crítico):
  const estresseSono = 11 - s;

  // Pontuação composta de sobrecarga (mínimo 3, máximo 30)
  const score = estresseSono + f + d;
  const regrasAtivadas: string[] = [];

  // =========================================================================
  // 1. NÍVEL CRÍTICO (Prioridade Máxima - Vermelho / Recovery)
  // =========================================================================
  if (s <= 3 && f >= 7) {
    regrasAtivadas.push('Insônia Severa (Sono ≤3) + Fadiga Alta (≥7)');
    return {
      score,
      status: 'critico',
      statusLabel: 'Estado Crítico',
      statusColor: '#ef4444',
      statusBadgeBg: 'rgba(239, 68, 68, 0.15)',
      conduta: 'Recovery e Regenerativo (Sem Carga)',
      regrasAtivadas
    };
  }

  if (d >= 9) {
    regrasAtivadas.push('Dor Muscular / Articular Severa (≥9)');
    return {
      score,
      status: 'critico',
      statusLabel: 'Estado Crítico (Dor Severa)',
      statusColor: '#ef4444',
      statusBadgeBg: 'rgba(239, 68, 68, 0.15)',
      conduta: 'Avaliação Presencial / Repouso Articular',
      regrasAtivadas
    };
  }

  if (f >= 8 && d >= 8) {
    regrasAtivadas.push('Exaustão Extrema (≥8) + Dor Alta (≥8)');
    return {
      score,
      status: 'critico',
      statusLabel: 'Estado Crítico',
      statusColor: '#ef4444',
      statusBadgeBg: 'rgba(239, 68, 68, 0.15)',
      conduta: 'Recovery',
      regrasAtivadas
    };
  }

  if (score >= 24) {
    regrasAtivadas.push('Sobrecarga Fisiológica Crítica (Score ≥ 24)');
    return {
      score,
      status: 'critico',
      statusLabel: 'Estado Crítico',
      statusColor: '#ef4444',
      statusBadgeBg: 'rgba(239, 68, 68, 0.15)',
      conduta: 'Recovery',
      regrasAtivadas
    };
  }

  // =========================================================================
  // 2. NÍVEL RUIM (Prioridade Alta - Laranja / Treino Livre ou Repouso)
  // =========================================================================
  if (f >= 7 && d >= 6) {
    regrasAtivadas.push('Fadiga Severa (≥7) + Dor Muscular Relevante (≥6)');
    return {
      score,
      status: 'ruim',
      statusLabel: 'Estado Ruim',
      statusColor: '#f97316',
      statusBadgeBg: 'rgba(249, 115, 22, 0.15)',
      conduta: 'Treino Livre ou Repouso',
      regrasAtivadas
    };
  }

  if (s <= 4 && f >= 6) {
    regrasAtivadas.push('Sono Ruim (≤4) + Fadiga Elevada (≥6)');
    return {
      score,
      status: 'ruim',
      statusLabel: 'Estado Ruim',
      statusColor: '#f97316',
      statusBadgeBg: 'rgba(249, 115, 22, 0.15)',
      conduta: 'Treino Livre ou Repouso',
      regrasAtivadas
    };
  }

  if (score >= 18) {
    regrasAtivadas.push('Sobrecarga Fisiológica Elevada (Score ≥ 18)');
    return {
      score,
      status: 'ruim',
      statusLabel: 'Estado Ruim',
      statusColor: '#f97316',
      statusBadgeBg: 'rgba(249, 115, 22, 0.15)',
      conduta: 'Treino Livre ou Repouso',
      regrasAtivadas
    };
  }

  // =========================================================================
  // 3. NÍVEL MODERADO (Prioridade Média - Amarelo / Ajustes Técnicos ou de Carga)
  // =========================================================================
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

  if (s <= 4) {
    regrasAtivadas.push('Noite de Sono Ruim (≤4)');
    return {
      score,
      status: 'moderado',
      statusLabel: 'Ajuste por Sono Ruim',
      statusColor: '#eab308',
      statusBadgeBg: 'rgba(234, 179, 8, 0.15)',
      conduta: 'Ajuste de Carga e Volume Moderado',
      regrasAtivadas
    };
  }

  if (f >= 6) {
    regrasAtivadas.push('Fadiga Acima da Média (≥6)');
    return {
      score,
      status: 'moderado',
      statusLabel: 'Ajuste por Fadiga',
      statusColor: '#eab308',
      statusBadgeBg: 'rgba(234, 179, 8, 0.15)',
      conduta: 'Ajuste de Carga Recomendado',
      regrasAtivadas
    };
  }

  if (score >= 11) {
    return {
      score,
      status: 'moderado',
      statusLabel: 'Estado Moderado',
      statusColor: '#eab308',
      statusBadgeBg: 'rgba(234, 179, 8, 0.15)',
      conduta: 'Ajuste de Carga Recomendado',
      regrasAtivadas
    };
  }

  // =========================================================================
  // 4. NÍVEL ÓTIMO (Verde / Treino de Alta Carga Liberado)
  // =========================================================================
  regrasAtivadas.push('Excelência Fisiológica (Alta Prontidão)');
  return {
    score,
    status: 'otimo',
    statusLabel: 'Estado Ótimo',
    statusColor: '#10b981',
    statusBadgeBg: 'rgba(16, 185, 129, 0.15)',
    conduta: 'Treino de Alta Carga Liberado',
    regrasAtivadas
  };
}
