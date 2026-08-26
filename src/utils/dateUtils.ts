/**
 * Utilitários de data e cálculo de idade para regras comerciais e contratuais
 */

export interface AgeCalculationResult {
  isMinor: boolean;
  age: number | null;
}

/**
 * Calcula a idade e verifica se é menor de 18 anos a partir de uma string de data de nascimento.
 * Suporta formatos:
 * - DD/MM/YYYY ou DD-MM-YYYY
 * - YYYY-MM-DD ou ISO Strings (com ou sem timestamp T00:00:00)
 */
export function calculateAgeAndMinorStatus(birthDateStr?: string | null): AgeCalculationResult {
  if (!birthDateStr || typeof birthDateStr !== 'string') {
    return { isMinor: false, age: null };
  }

  const clean = birthDateStr.trim();
  if (!clean) {
    return { isMinor: false, age: null };
  }

  let birth: Date | null = null;

  // Formato brasileiro: DD/MM/YYYY ou DD-MM-YYYY
  if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(clean)) {
    const parts = clean.split(/[\/\-]/);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2].slice(0, 4), 10);
    birth = new Date(year, month, day);
  } else {
    // Formato ISO: YYYY-MM-DD ou ISO 8601
    const isoPart = clean.split('T')[0];
    const parts = isoPart.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      birth = new Date(year, month, day);
    } else {
      birth = new Date(clean);
    }
  }

  if (!birth || isNaN(birth.getTime())) {
    return { isMinor: false, age: null };
  }

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  if (age < 0 || age > 130) {
    return { isMinor: false, age: null };
  }

  return {
    isMinor: age < 18,
    age
  };
}

/**
 * Retorna true se a data de nascimento corresponder a uma pessoa menor de 18 anos.
 */
export function isMinorFromBirthDate(birthDateStr?: string | null): boolean {
  return calculateAgeAndMinorStatus(birthDateStr).isMinor;
}
