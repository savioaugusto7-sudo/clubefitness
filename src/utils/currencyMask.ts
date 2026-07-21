/**
 * Utilitários Globais de Formatação Monetária e Tratamento de Inputs Numéricos
 */

/**
 * Formata um número ou string numérica no padrão BRL (ex: 1000 -> "1.000,00")
 */
export function formatCurrencyBRL(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') return '0,00';
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/\./g, '').replace(',', '.'));
  if (isNaN(num)) return '0,00';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Converte uma string formatada em BRL (ex: "1.000,00" ou "1000,00") para Number (ex: 1000)
 */
export function parseCurrencyToNumber(valStr: string | number | undefined | null): number {
  if (valStr === undefined || valStr === null || valStr === '') return 0;
  if (typeof valStr === 'number') return valStr;
  const cleaned = String(valStr)
    .replace(/[^\d,-]/g, '')
    .replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Trata a digitação de valores monetários garantindo vírgula e 2 casas decimais sem zeros à esquerda presos
 */
export function handleCurrencyMaskChange(
  e: React.ChangeEvent<HTMLInputElement>,
  onChangeNumber: (val: number) => void,
  onChangeDisplay?: (disp: string) => void
) {
  let val = e.target.value;

  // Se o usuário limpou o campo totalmente
  if (!val || val.trim() === '') {
    onChangeNumber(0);
    if (onChangeDisplay) onChangeDisplay('');
    return;
  }

  // Se contém apenas dígitos simples digitados
  const cleanDigits = val.replace(/\D/g, '');
  if (!cleanDigits) {
    onChangeNumber(0);
    if (onChangeDisplay) onChangeDisplay('');
    return;
  }

  // Parse centavos a partir dos dígitos digitados (modo caixa eletrônico / máquina de cartão)
  const cents = parseInt(cleanDigits, 10);
  const realVal = cents / 100;

  onChangeNumber(realVal);
  if (onChangeDisplay) {
    onChangeDisplay(formatCurrencyBRL(realVal));
  }
}

/**
 * Seleciona todo o conteúdo do input ao focar (no desktop ou mobile),
 * eliminando a necessidade de apagar manualmente o '0' inicial no 1º toque.
 */
export function selectOnFocus(e: React.FocusEvent<HTMLInputElement>) {
  try {
    e.target.select();
  } catch (err) {
    // Ignorar falhas em navegadores mobile que restringem seleção programática
  }
}

/**
 * Sanitiza a digitação de números inteiros para remover zeros à esquerda (ex: "01000" -> "1000")
 */
export function sanitizeIntegerInput(val: string | number): number {
  if (!val) return 0;
  const str = String(val).replace(/^0+(?=\d)/, '');
  const num = parseInt(str, 10);
  return isNaN(num) ? 0 : num;
}
