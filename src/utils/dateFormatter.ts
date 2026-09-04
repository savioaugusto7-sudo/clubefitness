/**
 * Utilitário canônico e centralizado para formatação segura de datas
 * Imune a problemas de timezone / deslocamento de 1 dia por parsing UTC.
 */

export function formatDateSafeBR(dStr: any): string {
  if (!dStr) return '-';
  if (typeof dStr === 'string') {
    const trimmed = dStr.trim();
    if (!trimmed) return '-';
    // Se já estiver formatado como DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) return trimmed;
    // Se for string no formato YYYY-MM-DD ou ISO (ex: 2026-09-02 ou 2026-09-02T14:30:00Z)
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const parts = trimmed.split('T')[0].split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
      }
    }
  }

  // Se for objeto Date ou timestamp numérico
  try {
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return String(dStr);
    return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return String(dStr);
  }
}

/**
 * Retorna o dia do mês (1..31) de uma data em formato YYYY-MM-DD sem sofrer offset de timezone
 */
export function getDayFromDateStr(dStr: any): number {
  if (!dStr) return new Date().getDate();
  if (typeof dStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dStr)) {
    const parts = dStr.split('T')[0].split('-');
    const day = parseInt(parts[2], 10);
    if (!isNaN(day)) return day;
  }
  try {
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? new Date().getDate() : d.getDate();
  } catch {
    return new Date().getDate();
  }
}
