/**
 * Motor Global de Busca Inteligente Multi-Termos (Multi-Combination Search)
 * Suporta busca por múltiplos termos em qualquer ordem, normalização de acentos,
 * pontuações e combinações entre nome, CPF, e-mail, plano, status, etc.
 */

export function normalizeSearchText(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Verifica se um item atende a todos os termos pesquisados (AND lógico entre palavras)
 * Ex: 'renato anual' -> busca registros onde 'renato' E 'anual' aparecem em qualquer dos campos analisados.
 */
export function smartSearchMatch(searchQuery: string, fieldValues: (string | number | undefined | null)[]): boolean {
  if (!searchQuery || !searchQuery.trim()) return true;

  const normalizedQuery = normalizeSearchText(searchQuery);
  const queryTokens = normalizedQuery.split(/\s+/).filter(t => t.length > 0);

  if (queryTokens.length === 0) return true;

  // Unifica todos os campos do item em um único bloco de texto normalizado + dígitos limpos
  const combinedText = fieldValues
    .map(v => normalizeSearchText(v))
    .join(' ');

  const rawDigits = fieldValues
    .map(v => String(v || '').replace(/\D/g, ''))
    .join(' ');

  // Para cada palavra digitada pelo usuário, ela deve existir no combinedText ou nos dígitos
  return queryTokens.every(token => {
    const cleanTokenDigits = token.replace(/\D/g, '');
    const inText = combinedText.includes(token);
    const inDigits = cleanTokenDigits.length > 0 && rawDigits.includes(cleanTokenDigits);
    return inText || inDigits;
  });
}
