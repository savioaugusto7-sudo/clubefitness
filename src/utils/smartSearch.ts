/**
 * Motor Global de Busca Inteligente Multi-Termos (Multi-Combination Search)
 * Suporta busca por múltiplos termos em qualquer ordem, normalização de acentos,
 * pontuações e combinações entre nome, CPF, e-mail, plano, status, etc.
 * Aceita tanto (targets, query) quanto (query, targets).
 */

export function normalizeSearchText(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function smartSearchMatch(
  param1: (string | number | null | undefined)[] | string | null | undefined,
  param2?: string | (string | number | null | undefined)[] | null | undefined
): boolean {
  let targets: (string | number | null | undefined)[] = [];
  let query: string = '';

  if (Array.isArray(param1)) {
    targets = param1;
    query = typeof param2 === 'string' ? param2 : '';
  } else if (Array.isArray(param2)) {
    targets = param2;
    query = typeof param1 === 'string' ? param1 : '';
  } else {
    query = typeof param1 === 'string' ? param1 : (typeof param2 === 'string' ? param2 : '');
  }

  if (!query || !query.trim()) return true;

  const normalizedQuery = normalizeSearchText(query);
  const queryTokens = normalizedQuery.split(/\s+/).filter(t => t.length > 0);

  if (queryTokens.length === 0) return true;

  const combinedText = targets
    .map(v => normalizeSearchText(v))
    .join(' ');

  const rawDigits = targets
    .map(v => String(v || '').replace(/\D/g, ''))
    .join(' ');

  return queryTokens.every(token => {
    const cleanTokenDigits = token.replace(/\D/g, '');
    const inText = combinedText.includes(token);
    const inDigits = cleanTokenDigits.length >= 3 && rawDigits.includes(cleanTokenDigits);
    return inText || inDigits;
  });
}
