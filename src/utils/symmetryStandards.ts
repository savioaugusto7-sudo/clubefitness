/**
 * symmetryStandards.ts
 * Módulo Canônico Absoluto de Simetria e Déficit Lateral
 * Clube Fitness Fisio
 *
 * Régua Oficial:
 * - <= 10.0% de déficit (Simetria >= 90%): ACEITÁVEL (Diferença Aceitável / Baixo Risco - Verde)
 * - 10.1% a 20.0% de déficit (10 a 15% Risco Moderado): RISCO MODERADO (Amarelo / Âmbar)
 * - > 20.0% de déficit (Simetria < 80%): RISCO CRÍTICO (Alto Risco / Crítico - Vermelho)
 */

export interface SymmetryTier {
  status: 'ACEITÁVEL' | 'RISCO MODERADO' | 'RISCO CRÍTICO';
  label: string;
  grauRisco: 'Diferença Aceitável' | 'Risco Moderado' | 'Risco Crítico';
  corHex: string;
  bgBadgeHex: string;
  badgeClass: 'badge-success' | 'badge-warning' | 'badge-danger';
  barColorHex: string;
  isRisk: boolean;
  isCritical: boolean;
}

export function getSymmetryTier(deficitPct: number, simetriaPct?: number): SymmetryTier {
  let d = Math.abs(Number(deficitPct) || 0);

  // Se simetria foi passada e deficit não, calcular
  if ((deficitPct === undefined || deficitPct === null || isNaN(deficitPct)) && simetriaPct != null) {
    d = Math.max(0, 100 - Number(simetriaPct));
  }

  // 1. Até 10.0%: Diferença Aceitável
  if (d <= 10.05) {
    return {
      status: 'ACEITÁVEL',
      label: 'Diferença Aceitável',
      grauRisco: 'Diferença Aceitável',
      corHex: '#10b981',
      bgBadgeHex: 'rgba(16, 185, 129, 0.12)',
      badgeClass: 'badge-success',
      barColorHex: '#10b981',
      isRisk: false,
      isCritical: false
    };
  }

  // 2. 10.1% a 20.0%: Risco Moderado
  if (d <= 20.05) {
    const isUnder15 = d <= 15.05;
    return {
      status: 'RISCO MODERADO',
      label: isUnder15 ? 'Atenção (Risco Moderado)' : 'Risco Moderado',
      grauRisco: 'Risco Moderado',
      corHex: isUnder15 ? '#f59e0b' : '#f97316',
      bgBadgeHex: isUnder15 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(249, 115, 22, 0.15)',
      badgeClass: 'badge-warning',
      barColorHex: isUnder15 ? '#f59e0b' : '#f97316',
      isRisk: true,
      isCritical: false
    };
  }

  // 3. Acima de 20.0%: Risco Crítico
  return {
    status: 'RISCO CRÍTICO',
    label: 'Alto Risco (Risco Crítico)',
    grauRisco: 'Risco Crítico',
    corHex: '#ef4444',
    bgBadgeHex: 'rgba(239, 68, 68, 0.15)',
    badgeClass: 'badge-danger',
    barColorHex: '#ef4444',
    isRisk: true,
    isCritical: true
  };
}

export const SYMMETRY_LEGEND_TEXT = 'Referência CFF: ≤ 10% Diferença Aceitável • 10% a 20% Risco Moderado • > 20% Risco Crítico';

export const SYMMETRY_LEGEND_HTML = `
  <div style="margin-top: 6px; font-size: 7px; color: #64748b; display: flex; gap: 12px; justify-content: center; align-items: center; flex-wrap: wrap;">
    <span style="font-weight: 700; color: #334155;">Padrão CFF de Simetria Lateral:</span>
    <span style="display: inline-flex; align-items: center; gap: 4px;">
      <span style="display: inline-block; width: 6px; height: 6px; background: #10b981; border-radius: 50%;"></span>
      ≤ 10% Diferença Aceitável
    </span>
    <span style="display: inline-flex; align-items: center; gap: 4px;">
      <span style="display: inline-block; width: 6px; height: 6px; background: #f59e0b; border-radius: 50%;"></span>
      10% a 20% Risco Moderado
    </span>
    <span style="display: inline-flex; align-items: center; gap: 4px;">
      <span style="display: inline-block; width: 6px; height: 6px; background: #ef4444; border-radius: 50%;"></span>
      > 20% Risco Crítico
    </span>
  </div>
`;

