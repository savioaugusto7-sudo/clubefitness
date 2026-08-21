export const normalizeText = (str: string | null | undefined): string => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

/**
 * Realiza uma busca inteligente multi-critério sobre múltiplos campos alvos.
 * Suporta múltiplos termos/palavras em qualquer ordem, ignora acentos/maiúsculas
 * e pesquisa números de CPF e telefone com ou sem máscara.
 * Aceita tanto (targets, query) quanto (query, targets).
 */
export const smartSearchMatch = (
  param1: (string | number | null | undefined)[] | string | null | undefined,
  param2: string | (string | number | null | undefined)[] | null | undefined
): boolean => {
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

  if (!query) return true;
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return true;

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const combinedText = targets.filter(t => t !== null && t !== undefined).join(' ');
  const normalizedHaystack = normalizeText(combinedText);
  const rawDigitsHaystack = combinedText.replace(/\D/g, '');

  return tokens.every(token => {
    const tokenDigits = token.replace(/\D/g, '');
    if (tokenDigits.length >= 3 && rawDigitsHaystack.includes(tokenDigits)) {
      return true;
    }
    return normalizedHaystack.includes(token);
  });
};
