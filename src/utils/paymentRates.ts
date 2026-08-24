/**
 * Tabela Oficial de Taxas de Parcelamento de Cartão de Crédito
 * Clube Fitness Fisio
 */

export const CARD_INSTALLMENT_RATES: Record<number, number> = {
  1: 0.0315,  // 3,15% (Crédito à vista)
  2: 0.0539,  // 5,39%
  3: 0.0612,  // 6,12%
  4: 0.0685,  // 6,85%
  5: 0.0757,  // 7,57%
  6: 0.0828,  // 8,28%
  7: 0.0899,  // 8,99%
  8: 0.0969,  // 9,69%
  9: 0.1038,  // 10,38%
  10: 0.1106, // 11,06%
  11: 0.1174, // 11,74%
  12: 0.1240  // 12,40%
};

/**
 * Retorna a taxa percentual decimal para o número de parcelas escolhido (de 1x a 12x)
 */
export function getCardRateForInstallment(installments: number): number {
  const n = Math.max(1, Math.min(12, Math.round(installments || 1)));
  return CARD_INSTALLMENT_RATES[n] !== undefined ? CARD_INSTALLMENT_RATES[n] : 0.0315;
}

/**
 * Calcula o valor final com a taxa do cartão aplicada
 */
export function calculateCardPrice(basePrice: number, installments: number): number {
  const rate = getCardRateForInstallment(installments);
  return Number((basePrice * (1 + rate)).toFixed(2));
}
