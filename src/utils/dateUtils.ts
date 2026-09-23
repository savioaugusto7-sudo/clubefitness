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

export interface BirthdayItem {
  client: any;
  diffDays: number; // 0 = Hoje, 1 = Amanhã, 2..15 = Em X dias
  birthdayDate: Date;
  formattedDayMonth: string; // Ex: "23/09"
  turningAge: number | null; // Idade que está completando
  isToday: boolean;
  isTomorrow: boolean;
  statusText: string;
}

export interface BirthdaySummary {
  today: BirthdayItem[];
  upcoming: BirthdayItem[];
  totalCount: number;
}

/**
 * Calcula os aniversariantes do dia atual e dos próximos N dias (padrão 15 dias).
 * Suporta múltiplos formatos de data, anos bissextos e viradas de ano.
 */
export function getUpcomingBirthdays(
  clients: any[],
  referenceDate?: Date | string,
  daysAhead: number = 15
): BirthdaySummary {
  if (!Array.isArray(clients) || clients.length === 0) {
    return { today: [], upcoming: [], totalCount: 0 };
  }

  let refDate: Date;
  if (!referenceDate) {
    refDate = new Date();
  } else if (typeof referenceDate === 'string') {
    refDate = new Date(referenceDate.includes('T') ? referenceDate : `${referenceDate}T00:00:00`);
  } else {
    refDate = new Date(referenceDate);
  }

  if (isNaN(refDate.getTime())) {
    refDate = new Date();
  }

  const refZero = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const refYear = refDate.getFullYear();

  const results: BirthdayItem[] = [];

  for (const client of clients) {
    if (!client) continue;

    // Ignorar clientes excluídos ou cadastros anônimos/testes de sistema
    if (client.dadosComerciais?.status === 'excluido_anonimizado') continue;
    const clientName = (client.dadosPessoais?.nome || client.nome || '').trim();
    if (!clientName || clientName.toLowerCase().includes('clubefitness')) continue;

    const rawBirth = (client.dadosPessoais?.dataNascimento || client.dadosPessoais?.nascimento || client.dataNascimento || '').trim();
    if (!rawBirth) continue;

    let bDay: number | null = null;
    let bMonth: number | null = null; // 0-indexado
    let bYear: number | null = null;

    if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}/.test(rawBirth)) {
      const parts = rawBirth.split(/[\/\-]/);
      bDay = parseInt(parts[0], 10);
      bMonth = parseInt(parts[1], 10) - 1;
      bYear = parseInt(parts[2].slice(0, 4), 10);
    } else {
      const isoPart = rawBirth.split('T')[0];
      const parts = isoPart.split('-');
      if (parts.length === 3) {
        bYear = parseInt(parts[0], 10);
        bMonth = parseInt(parts[1], 10) - 1;
        bDay = parseInt(parts[2], 10);
      }
    }

    if (bDay === null || bMonth === null || isNaN(bDay) || isNaN(bMonth) || bMonth < 0 || bMonth > 11 || bDay < 1 || bDay > 31) {
      continue;
    }

    // Candidato 1: Aniversário no ano de referência atual
    let candDate = new Date(refYear, bMonth, bDay);
    let candZero = new Date(candDate.getFullYear(), candDate.getMonth(), candDate.getDate());

    // Se o aniversário deste ano já passou antes de hoje, projeta para o próximo ano
    if (candZero.getTime() < refZero.getTime()) {
      candDate = new Date(refYear + 1, bMonth, bDay);
      candZero = new Date(candDate.getFullYear(), candDate.getMonth(), candDate.getDate());
    }

    const diffMs = candZero.getTime() - refZero.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= daysAhead) {
      let turningAge: number | null = null;
      if (bYear && bYear > 1900 && bYear <= candDate.getFullYear()) {
        turningAge = candDate.getFullYear() - bYear;
      }

      const formattedDayMonth = `${String(bDay).padStart(2, '0')}/${String(bMonth + 1).padStart(2, '0')}`;
      const isToday = diffDays === 0;
      const isTomorrow = diffDays === 1;

      let statusText = `Em ${diffDays} dias`;
      if (isToday) statusText = 'Hoje! 🎂';
      else if (isTomorrow) statusText = 'Amanhã';

      results.push({
        client,
        diffDays,
        birthdayDate: candDate,
        formattedDayMonth,
        turningAge,
        isToday,
        isTomorrow,
        statusText
      });
    }
  }

  // Ordenação: primeiro por dias restantes (crescente), depois alfabético por nome
  results.sort((a, b) => {
    if (a.diffDays !== b.diffDays) {
      return a.diffDays - b.diffDays;
    }
    const nameA = (a.client.dadosPessoais?.nome || a.client.nome || '').trim();
    const nameB = (b.client.dadosPessoais?.nome || b.client.nome || '').trim();
    return nameA.localeCompare(nameB, 'pt-BR');
  });

  const today = results.filter(r => r.diffDays === 0);
  const upcoming = results.filter(r => r.diffDays > 0);

  return {
    today,
    upcoming,
    totalCount: results.length
  };
}
