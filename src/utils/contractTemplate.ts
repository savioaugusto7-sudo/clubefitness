import { calculateContractEndDate } from './contractValidity';

function valorExtenso(valor: number): string {
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const dezenas = ['', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const dezenove = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  function grp(n: number): string {
    if (!n) return '';
    let r = '';
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    if (c > 0) {
      r += (c === 1 && !d && !u) ? 'cem' : centenas[c];
    }
    if (d > 0) {
      if (r) r += ' e ';
      if (d === 1) {
        r += dezenove[u];
        return r;
      }
      r += dezenas[d];
    }
    if (u > 0) {
      if (r) r += ' e ';
      r += unidades[u];
    }
    return r;
  }

  const int = Math.floor(valor);
  const cts = Math.round((valor - int) * 100);
  let t = '';
  if (!int) {
    t = 'zero reais';
  } else if (int === 1) {
    t = 'um real';
  } else {
    const m = Math.floor(int / 1000);
    const r = int % 1000;
    if (m > 0) {
      t = m === 1 ? 'mil' : `${grp(m)} mil`;
      if (r > 0) t += (r < 100 || r % 100 === 0) ? ` e ${grp(r)}` : ` ${grp(r)}`;
    } else {
      t = grp(r);
    }
    t += ' reais';
  }
  const ct = cts > 0 ? (cts === 1 ? 'um centavo' : `${grp(cts)} centavos`) : '';
  return ct ? (!int ? ct : `${t} e ${ct}`) : t;
}

function parcelasExtenso(n: number): string {
  const nomes = ['', '1 (uma)', '2 (duas)', '3 (três)', '4 (quatro)', '5 (cinco)', '6 (seis)', '7 (sete)', '8 (oito)', '9 (nove)', '10 (dez)', '11 (onze)', '12 (doze)'];
  return nomes[n] || `${n} (${n})`;
}

function diaExtenso(n: number): string {
  const nomes = [
    '', '01 (primeiro)', '02 (dois)', '03 (três)', '04 (quatro)', '05 (cinco)',
    '06 (seis)', '07 (sete)', '08 (oito)', '09 (nove)', '10 (dez)',
    '11 (onze)', '12 (doze)', '13 (treze)', '14 (quatorze)', '15 (quinze)',
    '16 (dezesseis)', '17 (dezessete)', '18 (dezoito)', '19 (dezenove)', '20 (vinte)',
    '21 (vinte e um)', '22 (vinte e dois)', '23 (vinte e três)', '24 (vinte e quatro)', '25 (vinte e cinco)',
    '26 (vinte e seis)', '27 (vinte e sete)', '28 (vinte e oito)', '29 (vinte e nove)', '30 (trinta)',
    '31 (trinta e um)'
  ];
  return nomes[n] || n.toString();
}

function fmtDate(dStr: any) {
  if (!dStr) return '-';
  try {
    const d = new Date(dStr);
    if (isNaN(d.getTime())) {
      return dStr;
    }
    return d.toLocaleDateString('pt-BR');
  } catch (e) {
    return dStr;
  }
}

function creditosExtenso(n: number): string {
  const nomes: Record<number, string> = {
    1: 'um', 2: 'dois', 3: 'três', 4: 'quatro', 5: 'cinco', 6: 'seis', 7: 'sete',
    8: 'oito', 9: 'nove', 10: 'dez', 11: 'onze', 12: 'doze', 13: 'treze',
    14: 'quatorze', 15: 'quinze', 16: 'dezesseis', 17: 'dezessete', 18: 'dezoito',
    19: 'dezenove', 20: 'vinte', 21: 'vinte e um', 22: 'vinte e dois'
  };
  return nomes[n] || n.toString();
}

export interface ContractData {
  clientNome: string;
  clientCpf: string;
  clientRg?: string;
  clientEmail?: string;
  clientTelefone?: string;
  clientEndereco?: string;
  clientNumero?: string;
  clientComplemento?: string;
  clientBairro?: string;
  clientCidade?: string;
  clientEstado?: string;
  clientCep?: string;

  planNome: string;
  planPreco?: number;
  planTipo?: string;

  valorUnitario?: number;
  valorLiquido?: number;

  descontoTipo?: 'percentual' | 'reais' | string;
  descontoValor?: number;
  parcelas?: number;
  formaPagamento?: string;
  dataInicio?: string;
  dataVencimento?: string;
  observacoesContratuais?: string;
  unidadeContratada?: string;
  creditosMensais?: number;
  creditosMassagem?: number;
  creditosEmergencia?: number;
  duracao?: string;
  vigenciaQtd?: number;
  criarRecorrenciaMensal?: boolean;
  recorrenciaMeses?: number;

  // Menor de idade / Responsável Legal
  isMinor?: boolean;
  beneficiarioNome?: string;
  beneficiarioCpf?: string;
}

function renderClausulaPagamento(options: {
  isAnual: boolean;
  isRecorrente: boolean;
  isMensalSemVinculo: boolean;
  recorrenciaMeses: number;
  parcelasCount: number;
  valorFinal: number;
  valorParcela: number;
  precoBase: number;
  descVal: number;
  descontoTexto: string;
  formaVigencia: string;
  formaPag: string;
  diaVenc: number;
  numClausula?: string;
  prefix?: string;
}): string {
  const num = options.numClausula || 'QUARTA';
  const pfx = options.prefix || '4';

  if (options.valorFinal <= 0) {
    return `
      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA ${num} - DO PAGAMENTO E CONCESSÃO DE CORTESIA</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        ${pfx}.1. O presente plano é concedido pela CONTRATADA ao(à) CONTRATANTE a título de <strong>Cortesia Comercial / Desconto Promocional Integral de 100% (cem por cento)</strong> sobre o valor de referência de <strong>R$ ${options.precoBase.toFixed(2).replace('.', ',')} (${valorExtenso(options.precoBase)})</strong>, totalizando o valor líquido de <strong>R$ 0,00 (zero reais)</strong>.
      </p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        ${pfx}.2. Em virtude do benefício e gratuidade integral ora pactuados, o(a) CONTRATANTE fica plenamente isento(a) de pagamentos, cobranças financeiras ou emissão de boletos durante a vigência deste contrato.
      </p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        ${pfx}.3. O valor dos serviços para eventuais renovações futuras será reajustado anualmente com base na variação do Índice de Preços ao Consumidor Amplo (IPCA), divulgado pelo IBGE.
      </p>
    `;
  }

  return `
    <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA ${num} - DO PAGAMENTO</h3>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      ${pfx}.1. O(A) CONTRATANTE pagará à CONTRATADA o valor correspondente ao plano escolhido, conforme condições comerciais e valor acordados entre as partes no ato da adesão${options.descVal > 0 ? `, aplicado desconto informado na cláusula ${pfx}.5` : ''}:
      ${
        options.isRecorrente && options.isMensalSemVinculo
          ? `será pago o valor mensal de <strong>R$ ${options.valorFinal.toFixed(2).replace('.', ',')} (${valorExtenso(options.valorFinal)})</strong> por meio de recorrência mensal via <strong>${options.formaPag}</strong>, com pagamento vencendo até o dia <strong>${diaExtenso(options.diaVenc)}</strong> de cada mês.`
          : options.isRecorrente
            ? `será pago o valor mensal de <strong>R$ ${options.valorFinal.toFixed(2).replace('.', ',')} (${valorExtenso(options.valorFinal)})</strong>, a ser quitado em <strong>${parcelasExtenso(options.recorrenciaMeses)}</strong> mensalidades recorrentes consecutivas por meio de <strong>${options.formaPag}</strong>, com pagamento vencendo até o dia <strong>${diaExtenso(options.diaVenc)}</strong> de cada mês.`
            : `será pago o valor líquido de <strong>R$ ${options.valorFinal.toFixed(2).replace('.', ',')} (${valorExtenso(options.valorFinal)})</strong>, a ser quitado em <strong>${parcelasExtenso(options.parcelasCount)}</strong> parcela(s) no valor de <strong>R$ ${options.valorParcela.toFixed(2).replace('.', ',')} (${valorExtenso(options.valorParcela)})</strong> cada, por meio de <strong>${options.formaPag}</strong>, com pagamento vencendo até o dia <strong>${diaExtenso(options.diaVenc)}</strong> de cada mês.`
      }
    </p>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">${pfx}.2. O valor dos serviços será reajustado anualmente, com base na variação do Índice de Preços ao Consumidor Amplo (IPCA), divulgado pelo IBGE.</p>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">${pfx}.3. O pagamento será realizado na forma <strong>${options.formaVigencia}</strong>, por meio de <strong>${options.formaPag}</strong>, com vencimento todo dia <strong>${options.diaVenc}</strong> de cada mês.</p>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">${pfx}.4. O atraso no pagamento sujeitará o(a) CONTRATANTE à multa de 2% (dois por cento) sobre o valor devido, acrescido de juros de mora de 1% (um por cento) ao mês.</p>
    ${options.descVal > 0 ? `<p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">${pfx}.5. Fica concedido ao CONTRATANTE um desconto de <strong>${options.descontoTexto}</strong> sobre o valor de referência do plano contratado, conforme negociação entre as partes. O desconto foi aplicado no cálculo do valor total deste contrato, passando a integrar as condições comerciais ora pactuadas.</p>` : ''}
  `;
}

export function generateContractTemplate(data: ContractData): string {
  // Calculations - Prioritize valorUnitario and valorLiquido from custom negotiation
  const precoBase = Number(data.valorUnitario) || Number(data.planPreco) || Number(data.valorLiquido) || 0;
  const descVal = Number(data.descontoValor) || 0;
  let valorFinal = data.valorLiquido !== undefined && data.valorLiquido !== null && data.valorLiquido > 0
    ? Number(data.valorLiquido)
    : precoBase;

  if (!data.valorLiquido && descVal > 0) {
    if (data.descontoTipo === 'percentual') {
      valorFinal = precoBase * (1 - descVal / 100);
    } else {
      valorFinal = Math.max(0, precoBase - descVal);
    }
  }

  const parcelasCount = Number(data.parcelas) || 1;
  const valorParcela = valorFinal / parcelasCount;

  // Vigencia & Recorrencia rules
  const customDuracao = data.duracao || 'mensal';
  const customVigenciaQtd = Number(data.vigenciaQtd) || 1;
  const isRecorrente = Boolean(data.criarRecorrenciaMensal);
  const recorrenciaMeses = Number(data.recorrenciaMeses) || 12;

  // Check if it is a monthly contract of 1 month (with or without recurrence)
  const isMensalSemVinculo = customDuracao === 'mensal' && customVigenciaQtd === 1;

  // official contract isAnual rule
  const isAnual = !isMensalSemVinculo && (
    customDuracao === 'anual' || 
    customVigenciaQtd >= 12 || 
    (isRecorrente && recorrenciaMeses >= 12) || 
    (data.planTipo === 'Anual' || data.planNome.toLowerCase().includes('anual'))
  );

  let vigenciaText = '';
  if (isRecorrente && isMensalSemVinculo) {
    vigenciaText = '1 (um) mês';
  } else if (isRecorrente) {
    vigenciaText = `${recorrenciaMeses} (${recorrenciaMeses === 12 ? 'doze' : recorrenciaMeses}) meses`;
  } else if (customDuracao === 'semana') {
    vigenciaText = `${customVigenciaQtd} semana(s)`;
  } else if (customDuracao === 'anual') {
    vigenciaText = `${customVigenciaQtd * 12} meses`;
  } else {
    vigenciaText = `${customVigenciaQtd} ${customVigenciaQtd > 1 ? 'meses' : 'mês'}`;
  }

  // Dates
  const todayStr = new Date().toISOString().split('T')[0];
  const dateInicio = data.dataInicio || todayStr;
  const dateFim = calculateContractEndDate(
    dateInicio,
    isAnual ? 'anual' : (customDuracao || 'mensal'),
    isAnual ? 1 : (isRecorrente ? recorrenciaMeses : customVigenciaQtd),
    undefined,
    isRecorrente && isMensalSemVinculo
  );

  const dateVenc = data.dataVencimento || todayStr;
  const diaVenc = dateVenc.split('-')[2] ? parseInt(dateVenc.split('-')[2], 10) : 5;

  const formaPag = ({
    pix: 'Boleto / Pix',
    boleto: 'Boleto / Pix',
    cartao: 'Cartão de Crédito',
    dinheiro: 'Dinheiro'
  } as any)[(data.formaPagamento || '').toLowerCase()] || data.formaPagamento || 'Boleto / Pix';

  // Address
  const addressParts = [
    data.clientEndereco,
    data.clientNumero ? `nº ${data.clientNumero}` : '',
    data.clientComplemento,
    data.clientBairro ? `Bairro ${data.clientBairro}` : '',
    data.clientCidade ? `${data.clientCidade}/${data.clientEstado || 'MG'}` : '',
    data.clientCep ? `CEP ${data.clientCep}` : ''
  ].filter(Boolean);
  const enderecoCompleto = addressParts.length > 0 ? addressParts.join(', ') : '[-]';

  // Client Details
  const clientDetails = [
    data.clientEmail ? `e-mail ${data.clientEmail}` : '',
    data.clientTelefone ? `telefone ${data.clientTelefone}` : ''
  ].filter(Boolean).join(', ');

  const contratanteText = `<strong>CONTRATANTE:</strong> ${data.clientNome || '[-]'}, portador(a) do CPF nº ${data.clientCpf || '[-]'}${clientDetails ? `, ${clientDetails}` : ''}, residente e domiciliado(a) em: ${enderecoCompleto}`;

  const contratadoText = `<strong>CONTRATADO:</strong> CLUBE FITNESS FISIO LTDA, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 52.883.492/0001-04, com sede na Rua Senador Lima Guimarães, nº 229, Estoril, Belo Horizonte/MG, CEP 30455-600, neste ato representada na forma de seu contrato social`;

  // ─── MENOR DE IDADE: textos reutilizáveis ──────────────────────────────────
  const _isMinor = !!data.isMinor && !!data.beneficiarioNome;
  const _benefNome = data.beneficiarioNome || '[-]';
  const _benefCpf = data.beneficiarioCpf || '[-]';

  // Bloco de identificação do Responsável Legal (quando isMinor)
  function renderContratanteMinor(label: 'CONTRATANTE' | 'CONTRATANTE / RESPONSÁVEL LEGAL' = 'CONTRATANTE / RESPONSÁVEL LEGAL') {
    return `<strong>${label}:</strong> ${data.clientNome || '[-]'}, inscrito(a) no CPF sob o nº ${data.clientCpf || '[-]'}${clientDetails ? `, ${clientDetails}` : ''}, residente e domiciliado(a) em: ${enderecoCompleto}, na qualidade de responsável legal pelo(a) beneficiário(a) abaixo qualificado(a), doravante denominado(a) simplesmente CONTRATANTE.`;
  }

  // Bloco de identificação do Beneficiário menor
  function renderBeneficiario() {
    return `<strong>BENEFICIÁRIO(A):</strong> ${_benefNome}, inscrito(a) no CPF sob o nº ${_benefCpf}, menor de idade, que utilizará os serviços objeto deste contrato sob a responsabilidade do(a) CONTRATANTE acima qualificado(a).`;
  }

  // Bloco de assinatura com Beneficiário (adicionado após CONTRATANTE + CONTRATADA)
  function renderSignatureBeneficiario() {
    if (!_isMinor) return '';
    return `
      <div style="margin-top: 30px; font-size: 9.5pt; page-break-inside: avoid; break-inside: avoid;">
        <div style="width: 50%; border-top: 1px solid #333; padding-top: 6px; margin-top: 10px;">
          <strong>BENEFICIÁRIO(A):</strong><br/>
          ${_benefNome}<br/>
          <small>CPF: ${_benefCpf}</small>
        </div>
      </div>
    `;
  }

  // Generate Date in words for signing
  const now = new Date();
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const dataAssinaturaExtenso = `${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;

  const isMonitorado = data.planNome.toLowerCase().includes('monitorado');
  const isTratamentoPersonalizado = !isMonitorado && (
    data.planNome.toLowerCase().includes('tratamento') ||
    data.planNome.toLowerCase().includes('personalizado')
  );
  const isProtocoloIndividualizado = !isMonitorado && !isTratamentoPersonalizado &&
    data.planNome.toLowerCase().includes('protocolo');

  if (isMonitorado) {
    // Identificação do CONTRATANTE — condicional para menor de idade
    const contratanteTextMonitorado = _isMinor
      ? renderContratanteMinor()
      : `<strong>CONTRATANTE:</strong> ${data.clientNome || '[-]'}, inscrito(a) no CPF sob o nº ${data.clientCpf || '[-]'}${clientDetails ? `, ${clientDetails}` : ''}, residente e domiciliado(a) em: ${enderecoCompleto}, doravante denominado(a) simplesmente CONTRATANTE.`;
    const beneficiarioTextMonitorado = _isMinor ? renderBeneficiario() : '';

    const contratadaTextMonitorado = `<strong>CONTRATADA:</strong> CLUBE FITNESS FISIO LTDA, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 52.883.492/0001-04, com sede na Rua Senador Lima Guimarães, nº 229, Estoril, Belo Horizonte/MG, CEP 30455-600, doravante denominada simplesmente CONTRATADA.`;

    let formaVigencia = 'Mensal';
    if (isAnual) {
      formaVigencia = 'Anual';
    } else if (customDuracao === 'mensal') {
      if (customVigenciaQtd === 3) formaVigencia = 'Trimestral';
      else if (customVigenciaQtd === 6) formaVigencia = 'Semestral';
      else if (customVigenciaQtd === 12) formaVigencia = 'Anual';
    }

    let descontoTextoExtra = '';
    if (descVal > 0) {
      if (data.descontoTipo === 'percentual') {
        descontoTextoExtra = `${descVal}%`;
      } else {
        descontoTextoExtra = `R$ ${descVal.toFixed(2).replace('.', ',')} (${valorExtenso(descVal)})`;
      }
    }

    const vigenciaPrazoDesc = isAnual ? '12 (doze) meses' : vigenciaText;

    const rescisaoClauses = [];
    const isOneMonthNoRecur = isMensalSemVinculo && !isRecorrente;
    if (!isOneMonthNoRecur) {
      rescisaoClauses.push(`7.1. Este contrato poderá ser rescindido por qualquer das partes, mediante comunicação por escrito com antecedência mínima de 30 (trinta) dias.`);
    }
    const nextNum = rescisaoClauses.length + 1;
    rescisaoClauses.push(`7.${nextNum}. Em caso de rescisão antecipada por iniciativa do(a) CONTRATANTE, poderá ser cobrada multa de 10% sobre o valor total do contrato, a título de cláusula penal.`);

    let monitoradoHtml = `
      <h2 style="font-size: 13pt; font-weight: bold; margin: 10px 0 20px 0; text-transform: uppercase; text-align: center;">TERMO DE ADESÃO A PLANO CLUBE FITNESS MONITORADO</h2>

      <p style="font-size: 9.5pt; margin-bottom: 12px; line-height: 1.4; text-align: justify;">
        ${contratadaTextMonitorado}
      </p>

      <p style="font-size: 9.5pt; margin-bottom: 12px; line-height: 1.4; text-align: justify;">
        ${contratanteTextMonitorado}
      </p>
      ${beneficiarioTextMonitorado ? `<p style="font-size: 9.5pt; margin-bottom: 12px; line-height: 1.4; text-align: justify;">${beneficiarioTextMonitorado}</p>` : ''}

      <p style="font-size: 9.5pt; margin-bottom: 14px; line-height: 1.4; text-align: justify;">
        As partes acima qualificadas celebram o presente Termo de Adesão, que se regerá pelas seguintes cláusulas e condições:
      </p>

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA PRIMEIRA - DO OBJETO</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        1.1. O presente instrumento tem por objeto a prestação de serviços de treinamento personalizado pela CONTRATADA ao(à) CONTRATANTE, conforme o plano selecionado no momento da contratação.
      </p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        1.2. Capacidade técnica. O Contratado declara-se, neste ato, perfeitamente apto e capaz tecnicamente para desenvolver os serviços, garantindo perante as Contratantes o correto desempenho dos serviços que vierem a desenvolver no atendimento ao estabelecido neste Contrato.
      </p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        1.3. Livre Negociação. As Partes declaram que negociaram o presente Contrato conjuntamente e que o celebram em mútuo e comum acordo, de modo que a interpretação deste Contrato não será em favor de uma ou de outra Parte, mas sim em consonância com o quanto estabelecido em suas cláusulas e na forma da Lei aplicável.
      </p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        1.4. Franquia Mensal de Utilização: O plano contratado confere ao(à) CONTRATANTE a franquia mensal de <strong>${Number(data.creditosMensais) || 13} (${creditosExtenso(Number(data.creditosMensais) || 13)}) créditos de treinos personalizados/monitorados por mês</strong>${(Number(data.creditosMassagem) || 0) > 0 ? `, <strong>${Number(data.creditosMassagem)} (${creditosExtenso(Number(data.creditosMassagem))}) crédito(s) de massagem por mês</strong>` : ''}${(Number(data.creditosEmergencia) || (isAnual ? 1 : 0)) > 0 ? ` e <strong>${Number(data.creditosEmergencia) || (isAnual ? 1 : 0)} (${creditosExtenso(Number(data.creditosEmergencia) || (isAnual ? 1 : 0))}) crédito(s) de atendimento de emergência por mês</strong>` : ''}, renováveis a cada ciclo mensal de 30 (trinta) dias durante toda a vigência deste instrumento.
      </p>

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA SEGUNDA - DAS OBRIGAÇÕES DA CONTRATADA</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        2.1. Prestar os serviços de condicionamento físico, treinamento personalizado e acompanhamento profissional com zelo, qualidade e profissionalismo, por meio de profissionais habilitados e qualificados.
      </p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        2.2. Disponibilizar instalações, equipamentos e materiais adequados à execução dos serviços.
      </p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        2.3. Manter sigilo sobre as informações pessoais e de saúde do(a) CONTRATANTE, nos termos da legislação vigente, em especial a Lei Geral de Proteção de Dados (LGPD).
      </p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        2.4. Orientar o(a) CONTRATANTE sobre os procedimentos, exercícios e condutas a serem adotados durante e após as sessões.
      </p>

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA TERCEIRA - DAS OBRIGAÇÕES DO(A) CONTRATANTE</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        3.1. Efetuar o pagamento do plano contratado de forma pontual, nos valores e datas acordados.
      </p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        3.2. Respeitar as orientações dos profissionais da CONTRATADA, visando à eficácia e segurança do CONTRATANTE.
      </p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        3.3. Informar à CONTRATADA sobre qualquer alteração das informações do presente instrumento ou condições de saúde que possam interferir no objeto do contrato.
      </p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        3.4. Zelar pelos equipamentos e instalações da CONTRATADA, responsabilizando-se por eventuais danos causados por uso indevido.
      </p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        3.5. A(O) CONTRATANTE se compromete a realizar o agendamento dos atendimentos com antecedência mínima de 2 (duas) horas, observado que, após esse prazo, o sistema de agendamento não permitirá novas marcações.
      </p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        3.6. Em caso de cancelamento ou remarcação do atendimento, a(o) CONTRATANTE deverá comunicar a CONTRATADA com antecedência mínima de 6 (seis) horas para que tenha direito à restituição do crédito para novo agendamento, conforme as regras estabelecidas neste contrato.
      </p>

      ${renderClausulaPagamento({
        isAnual,
        isRecorrente,
        isMensalSemVinculo,
        recorrenciaMeses,
        parcelasCount,
        valorFinal,
        valorParcela,
        precoBase,
        descVal,
        descontoTexto: descontoTextoExtra,
        formaVigencia,
        formaPag,
        diaVenc,
        numClausula: 'QUARTA',
        prefix: '4'
      })}

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA QUINTA - DA VIGÊNCIA E PRAZO</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        5.1. O presente contrato tem vigência de <strong>${vigenciaPrazoDesc}</strong>, com início em <strong>${fmtDate(dateInicio)}</strong> e término previsto para <strong>${fmtDate(dateFim)}</strong>.
      </p>
      ${
        (!isAnual && isRecorrente)
          ? `
            <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
              5.2. O presente contrato será renovado automaticamente ao término do prazo previsto, em caso de ausência de manifestação em sentido contrário, passando a vigorar por prazo indeterminado.
            </p>
          `
          : ''
      }

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA SEXTA - DO RECESSO</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        6.1. A(O) CONTRATANTE terá um recesso de final de ano compreendido entre o Natal e o primeiro dia útil de janeiro, período este considerado como férias já incluídas no pacote contratado, permanecendo a cobrança do plano normalmente, sem direito à reposição, compensação ou desconto das aulas não realizadas durante o referido recesso.
      </p>

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA SÉTIMA - DA RESCISÃO</h3>
      ${rescisaoClauses.map(clause => `
        <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
          ${clause}
        </p>
      `).join('')}

      ${
        isAnual
          ? `
            <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA OITAVA - DO CONGELAMENTO DO PLANO</h3>
            <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
              8.1. Fica assegurado ao(à) CONTRATANTE o direito de solicitar o congelamento (suspensão temporária) do plano pelo período de 30 (trinta) dias, a ser usufruído dentro do prazo de vigência de 12 (doze) meses, contados a partir da assinatura do contrato.
            </p>
            <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
              8.1.1. O período de congelamento do contrato poderá ser utilizado de forma fracionada, em contagem semanal, desde que o total dos períodos de congelamento não ultrapasse o limite previsto em cláusula 8.1.
            </p>
          `
          : ''
      }

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA ${isAnual ? 'NONA' : 'OITAVA'} - DA RESPONSABILIDADE</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        ${isAnual ? '9' : '8'}.1. A CONTRATADA não se responsabiliza por lesões ou danos decorrentes do não cumprimento das orientações profissionais por parte do(a) CONTRATANTE ou da omissão de informações relevantes sobre seu estado de saúde.
      </p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        ${isAnual ? '9' : '8'}.2. A responsabilidade da CONTRATADA limita-se à prestação dos serviços nos termos aqui descritos, não garantindo resultados específicos, que podem variar conforme a condição e a resposta individual de cada CONTRATANTE.
      </p>

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA ${isAnual ? 'DÉCIMA' : 'NONA'} - DA PROTEÇÃO DE DADOS</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        ${isAnual ? '10' : '9'}.1. O(A) CONTRATANTE autoriza a CONTRATADA a coletar, armazenar e tratar seus dados pessoais e de saúde estritamente para os fins de execução deste contrato e prestação dos serviços, em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados).
      </p>

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA ${isAnual ? 'DÉCIMA PRIMEIRA' : 'DÉCIMA'} - DO FORO</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        ${isAnual ? '11' : '10'}.1. Fica eleito o foro da Comarca de Belo Horizonte para dirimir quaisquer controvérsias oriundas do presente contrato, com renúncia a qualquer outro, por mais privilegiado que seja.
      </p>

      <p style="font-size: 9.5pt; margin-top: 20px; margin-bottom: 20px; line-height: 1.4; text-align: justify;">
        E, por estarem justas e contratadas, as partes assinam o presente instrumento.
      </p>

      <p style="font-size: 9.5pt; margin-bottom: 40px; font-weight: bold;">
        Belo Horizonte/MG, ${dataAssinaturaExtenso}.
      </p>

      <!-- Signatures -->
      <div style="display: flex; justify-content: space-between; margin-top: 50px; font-size: 9.5pt; page-break-inside: avoid; break-inside: avoid;">
        <div style="flex: 1; text-align: center; margin-right: 20px;">
          <div style="border-top: 1px solid #333; padding-top: 6px; margin-top: 30px;">
            <strong>${_isMinor ? 'CONTRATANTE / RESPONSÁVEL LEGAL' : 'CONTRATANTE'}:</strong><br/>
            ${data.clientNome || '[-]'}<br/>
            <small>CPF: ${data.clientCpf || '[-]'}</small>
          </div>
        </div>
        <div style="flex: 1; text-align: center; margin-left: 20px;">
          <div style="border-top: 1px solid #333; padding-top: 6px; margin-top: 30px;">
            <strong>CONTRATADA:</strong><br/>
            CLUBE FITNESS FISIO LTDA<br/>
            <small>CNPJ: 52.883.492/0001-04</small>
          </div>
        </div>
      </div>
      ${renderSignatureBeneficiario()}
    `;

    if (data.observacoesContratuais) {
      monitoradoHtml += `
        <div style="margin-top: 30px; font-size: 9.5pt; border-top: 1px solid var(--border-color); padding-top: 10px; page-break-inside: avoid; break-inside: avoid;">
          <strong>Observações Contratuais:</strong><br/>
          ${data.observacoesContratuais}
        </div>
      `;
    }

    return monitoradoHtml;
  }

  // ─── TRATAMENTO PERSONALIZADO ────────────────────────────────────────────────
  if (isTratamentoPersonalizado) {
    const contratanteTratamento = _isMinor
      ? renderContratanteMinor()
      : `<strong>CONTRATANTE:</strong> ${data.clientNome || '[-]'}, inscrito(a) no CPF sob o nº ${data.clientCpf || '[-]'}${clientDetails ? `, ${clientDetails}` : ''}, residente e domiciliado(a) em: ${enderecoCompleto}, doravante denominado(a) simplesmente CONTRATANTE.`;
    const beneficiarioTextTratamento = _isMinor ? renderBeneficiario() : '';
    const contratadaTratamento = `<strong>CONTRATADA:</strong> CLUBE FITNESS FISIO LTDA, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 52.883.492/0001-04, com sede na Rua Senador Lima Guimarães, nº 229, Estoril, Belo Horizonte/MG, CEP 30455-600, doravante denominada simplesmente CONTRATADA.`;

    let formaVigenciaTrat = 'Mensal';
    if (isAnual) { formaVigenciaTrat = 'Anual'; }
    else if (customDuracao === 'mensal') {
      if (customVigenciaQtd === 3) formaVigenciaTrat = 'Trimestral';
      else if (customVigenciaQtd === 6) formaVigenciaTrat = 'Semestral';
      else if (customVigenciaQtd === 12) formaVigenciaTrat = 'Anual';
    }

    const vigenciaPrazoDescTrat = isAnual ? '12 (doze) meses' : vigenciaText;

    const isOneMonthNoRecurTrat = isMensalSemVinculo && !isRecorrente;
    const rescisaoTrat: string[] = [];
    if (!isOneMonthNoRecurTrat) {
      rescisaoTrat.push(`7.1. Este contrato poderá ser rescindido por qualquer das partes, mediante comunicação por escrito com antecedência mínima de 30 (trinta) dias.`);
    }
    const nextNumTrat = rescisaoTrat.length + 1;
    rescisaoTrat.push(`7.${nextNumTrat}. Em caso de rescisão antecipada por iniciativa do(a) CONTRATANTE, poderá ser cobrada multa de 10% sobre o valor total do contrato, a título de cláusula penal.`);

    let descontoTextoTrat = '';
    if (descVal > 0) {
      descontoTextoTrat = data.descontoTipo === 'percentual'
        ? `${descVal}%`
        : `R$ ${descVal.toFixed(2).replace('.', ',')} (${valorExtenso(descVal)})`;
    }

    let tratamentoHtml = `
      <h2 style="font-size: 13pt; font-weight: bold; margin: 10px 0 20px 0; text-transform: uppercase; text-align: center;">TERMO DE ADESÃO A PLANO TRATAMENTO PERSONALIZADO</h2>

      <p style="font-size: 9.5pt; margin-bottom: 12px; line-height: 1.4; text-align: justify;">${contratadaTratamento}</p>
      <p style="font-size: 9.5pt; margin-bottom: 12px; line-height: 1.4; text-align: justify;">${contratanteTratamento}</p>
      ${beneficiarioTextTratamento ? `<p style="font-size: 9.5pt; margin-bottom: 12px; line-height: 1.4; text-align: justify;">${beneficiarioTextTratamento}</p>` : ''}
      <p style="font-size: 9.5pt; margin-bottom: 14px; line-height: 1.4; text-align: justify;">As partes acima qualificadas celebram o presente Termo de Adesão, que se regerá pelas seguintes cláusulas e condições:</p>

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA PRIMEIRA - DO OBJETO</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        1.1. O presente instrumento tem por objeto a prestação de serviços de treinamento personalizado pela CONTRATADA ao(à) CONTRATANTE, conforme o plano selecionado no momento da contratação.
      </p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        1.2. Capacidade técnica. O Contratado declara-se, neste ato, perfeitamente apto e capaz tecnicamente para desenvolver os serviços, garantindo perante as Contratantes o correto desempenho dos serviços que vierem a desenvolver no atendimento ao estabelecido neste Contrato.
      </p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        1.3. Livre Negociação. As Partes declaram que negociaram o presente Contrato conjuntamente e que o celebram em mútuo e comum acordo, de modo que a interpretação deste Contrato não será em favor de uma ou de outra Parte, mas sim em consonância com o quanto estabelecido em suas cláusulas e na forma da Lei aplicável.
      </p>

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA SEGUNDA - DAS OBRIGAÇÕES DA CONTRATADA</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">2.1. Prestar os serviços de condicionamento físico, treinamento personalizado e acompanhamento profissional com zelo, qualidade e profissionalismo, por meio de profissionais habilitados e qualificados.</p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">2.2. Disponibilizar instalações, equipamentos e materiais adequados à execução dos serviços.</p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">2.3. Manter sigilo sobre as informações pessoais e de saúde do(a) CONTRATANTE, nos termos da legislação vigente, em especial a Lei Geral de Proteção de Dados (LGPD).</p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">2.4. Orientar o(a) CONTRATANTE sobre os procedimentos, exercícios e condutas a serem adotados durante e após as sessões.</p>

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA TERCEIRA - DAS OBRIGAÇÕES DO(A) CONTRATANTE</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">3.1. Efetuar o pagamento do plano contratado de forma pontual, nos valores e datas acordados.</p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">3.2. Respeitar as orientações dos profissionais da CONTRATADA, visando à eficácia e segurança do CONTRATANTE.</p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">3.3. Informar à CONTRATADA sobre qualquer alteração das informações do presente instrumento ou condições de saúde que possam interferir no objeto do contrato.</p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">3.4. Zelar pelos equipamentos e instalações da CONTRATADA, responsabilizando-se por eventuais danos causados por uso indevido.</p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">3.5. A(O) CONTRATANTE se compromete a realizar o agendamento dos atendimentos com antecedência mínima de 2 (duas) horas, observado que, após esse prazo, o sistema de agendamento não permitirá novas marcações.</p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">3.6. Em caso de cancelamento ou remarcação do atendimento, a(o) CONTRATANTE deverá comunicar a CONTRATADA com antecedência mínima de 24 (vinte e quatro) horas para que tenha direito à restituição do crédito para novo agendamento, conforme as regras estabelecidas neste contrato.</p>

      ${renderClausulaPagamento({
        isAnual,
        isRecorrente,
        isMensalSemVinculo,
        recorrenciaMeses,
        parcelasCount,
        valorFinal,
        valorParcela,
        precoBase,
        descVal,
        descontoTexto: descontoTextoTrat,
        formaVigencia: formaVigenciaTrat,
        formaPag,
        diaVenc,
        numClausula: 'QUARTA',
        prefix: '4'
      })}

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA QUINTA - DA VIGÊNCIA E PRAZO</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">5.1. O presente contrato tem vigência de <strong>${vigenciaPrazoDescTrat}</strong>, com início em <strong>${fmtDate(dateInicio)}</strong> e término previsto para <strong>${fmtDate(dateFim)}</strong>.</p>
      ${(!isAnual && isRecorrente) ? `<p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">5.2. O presente contrato será renovado automaticamente ao término do prazo previsto, em caso de ausência de manifestação em sentido contrário, passando a vigorar por prazo indeterminado.</p>` : ''}

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA SEXTA - DO RECESSO</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">6.1. A(O) CONTRATANTE terá um recesso de final de ano compreendido entre o Natal e o primeiro dia útil de janeiro, período este considerado como férias já incluídas no pacote contratado, permanecendo a cobrança do plano normalmente, sem direito à reposição, compensação ou desconto das aulas não realizadas durante o referido recesso.</p>

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA SÉTIMA - DA RESCISÃO</h3>
      ${rescisaoTrat.map(clause => `<p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">${clause}</p>`).join('')}

      ${isAnual ? `
        <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA OITAVA - DO CONGELAMENTO DO PLANO</h3>
        <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">8.1. Fica assegurado ao(à) CONTRATANTE o direito de solicitar o congelamento (suspensão temporária) do plano pelo período de 30 (trinta) dias, a ser usufruído dentro do prazo de vigência de 12 (doze) meses, contados a partir da assinatura do contrato.</p>
        <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">8.1.1. O período de congelamento do contrato poderá ser utilizado de forma fracionada, em contagem semanal, desde que o total dos períodos de congelamento não ultrapasse o limite previsto em cláusula 8.1.</p>
      ` : ''}

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA ${isAnual ? 'NONA' : 'OITAVA'} - DA RESPONSABILIDADE</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">${isAnual ? '9' : '8'}.1. A CONTRATADA não se responsabiliza por lesões ou danos decorrentes do não cumprimento das orientações profissionais por parte do(a) CONTRATANTE ou da omissão de informações relevantes sobre seu estado de saúde.</p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">${isAnual ? '9' : '8'}.2. A responsabilidade da CONTRATADA limita-se à prestação dos serviços nos termos aqui descritos, não garantindo resultados específicos, que podem variar conforme a condição e a resposta individual de cada CONTRATANTE.</p>

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA ${isAnual ? 'DÉCIMA' : 'NONA'} - DA PROTEÇÃO DE DADOS</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">${isAnual ? '10' : '9'}.1. O(A) CONTRATANTE autoriza a CONTRATADA a coletar, armazenar e tratar seus dados pessoais e de saúde estritamente para os fins de execução deste contrato e prestação dos serviços, em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados).</p>

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA ${isAnual ? 'DÉCIMA PRIMEIRA' : 'DÉCIMA'} - DO FORO</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">${isAnual ? '11' : '10'}.1. Fica eleito o foro da Comarca de Belo Horizonte para dirimir quaisquer controvérsias oriundas do presente contrato, com renúncia a qualquer outro, por mais privilegiado que seja.</p>

      <p style="font-size: 9.5pt; margin-top: 20px; margin-bottom: 20px; line-height: 1.4; text-align: justify;">E, por estarem justas e contratadas, as partes assinam o presente instrumento.</p>
      <p style="font-size: 9.5pt; margin-bottom: 40px; font-weight: bold;">Belo Horizonte/MG, ${dataAssinaturaExtenso}.</p>

      <div style="display: flex; justify-content: space-between; margin-top: 50px; font-size: 9.5pt; page-break-inside: avoid; break-inside: avoid;">
        <div style="flex: 1; text-align: center; margin-right: 20px;">
          <div style="border-top: 1px solid #333; padding-top: 6px; margin-top: 30px;">
            <strong>${_isMinor ? 'CONTRATANTE / RESPONSÁVEL LEGAL' : 'CONTRATANTE'}:</strong><br/>${data.clientNome || '[-]'}<br/><small>CPF: ${data.clientCpf || '[-]'}</small>
          </div>
        </div>
        <div style="flex: 1; text-align: center; margin-left: 20px;">
          <div style="border-top: 1px solid #333; padding-top: 6px; margin-top: 30px;">
            <strong>CONTRATADA:</strong><br/>CLUBE FITNESS FISIO LTDA<br/><small>CNPJ: 52.883.492/0001-04</small>
          </div>
        </div>
      </div>
      ${renderSignatureBeneficiario()}
    `;

    if (data.observacoesContratuais) {
      tratamentoHtml += `<div style="margin-top: 30px; font-size: 9.5pt; border-top: 1px solid var(--border-color); padding-top: 10px; page-break-inside: avoid; break-inside: avoid;"><strong>Observações Contratuais:</strong><br/>${data.observacoesContratuais}</div>`;
    }
    return tratamentoHtml;
  }

  // ─── PROTOCOLO INDIVIDUALIZADO ───────────────────────────────────────────────
  if (isProtocoloIndividualizado) {
    const contratanteProtocolo = _isMinor
      ? renderContratanteMinor()
      : `<strong>CONTRATANTE:</strong> ${data.clientNome || '[-]'}, inscrito(a) no CPF sob o nº ${data.clientCpf || '[-]'}${clientDetails ? `, ${clientDetails}` : ''}, residente e domiciliado(a) em: ${enderecoCompleto}, doravante denominado(a) simplesmente CONTRATANTE.`;
    const beneficiarioTextProtocolo = _isMinor ? renderBeneficiario() : '';
    const contratadaProtocolo = `<strong>CONTRATADA:</strong> CLUBE FITNESS FISIO LTDA, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 52.883.492/0001-04, com sede na Rua Senador Lima Guimarães, nº 229, Estoril, Belo Horizonte/MG, CEP 30455-600, doravante denominada simplesmente CONTRATADA.`;

    let formaVigenciaProt = 'Mensal';
    if (isAnual) { formaVigenciaProt = 'Anual'; }
    else if (customDuracao === 'mensal') {
      if (customVigenciaQtd === 3) formaVigenciaProt = 'Trimestral';
      else if (customVigenciaQtd === 6) formaVigenciaProt = 'Semestral';
      else if (customVigenciaQtd === 12) formaVigenciaProt = 'Anual';
    }

    const isOneMonthNoRecurProt = isMensalSemVinculo && !isRecorrente;
    const rescisaoProt: string[] = [];
    if (!isOneMonthNoRecurProt) {
      rescisaoProt.push(`7.1. Este contrato poderá ser rescindido por qualquer das partes, mediante comunicação por escrito com antecedência mínima de 30 (trinta) dias.`);
    }
    const nextNumProt = rescisaoProt.length + 1;
    rescisaoProt.push(`7.${nextNumProt}. Em caso de rescisão antecipada por iniciativa do(a) CONTRATANTE, poderá ser cobrada multa de 10% sobre o valor total do contrato, a título de cláusula penal.`);

    let descontoTextoProt = '';
    if (descVal > 0) {
      descontoTextoProt = data.descontoTipo === 'percentual'
        ? `${descVal}%`
        : `R$ ${descVal.toFixed(2).replace('.', ',')} (${valorExtenso(descVal)})`;
    }

    // Numeração das cláusulas desloca se anual (cláusula 8 = Congelamento)
    const nResp = isAnual ? '9' : '8';
    const nDados = isAnual ? '10' : '9';
    const nForo  = isAnual ? '11' : '10';
    const nomResp  = isAnual ? 'NONA' : 'OITAVA';
    const nomDados = isAnual ? 'DÉCIMA' : 'NONA';
    const nomForo  = isAnual ? 'DÉCIMA PRIMEIRA' : 'DÉCIMA';

    let protocoloHtml = `
      <h2 style="font-size: 13pt; font-weight: bold; margin: 10px 0 20px 0; text-transform: uppercase; text-align: center;">TERMO DE ADESÃO A PLANO PROTOCOLO INDIVIDUALIZADO</h2>

      <p style="font-size: 9.5pt; margin-bottom: 12px; line-height: 1.4; text-align: justify;">${contratadaProtocolo}</p>
      <p style="font-size: 9.5pt; margin-bottom: 12px; line-height: 1.4; text-align: justify;">${contratanteProtocolo}</p>
      ${beneficiarioTextProtocolo ? `<p style="font-size: 9.5pt; margin-bottom: 12px; line-height: 1.4; text-align: justify;">${beneficiarioTextProtocolo}</p>` : ''}
      <p style="font-size: 9.5pt; margin-bottom: 14px; line-height: 1.4; text-align: justify;">As partes acima qualificadas celebram o presente Termo de Adesão, que se regerá pelas seguintes cláusulas e condições:</p>

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA PRIMEIRA - DO OBJETO</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">1.1. O presente instrumento tem por objeto a prestação de serviços de Fisioterapia e condicionamento físico pela CONTRATADA ao(à) CONTRATANTE, conforme o plano selecionado no momento da contratação.</p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        1.2. Capacidade técnica. O Contratado declara-se, neste ato, perfeitamente apto e capaz tecnicamente para desenvolver os serviços, garantindo perante as Contratantes o correto desempenho dos serviços que vierem a desenvolver no atendimento ao estabelecido neste Contrato.
      </p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
        1.3. Livre Negociação. As Partes declaram que negociaram o presente Contrato conjuntamente e que o celebram em mútuo e comum acordo, de modo que a interpretação deste Contrato não será em favor de uma ou de outra Parte, mas sim em consonância com o quanto estabelecido em suas cláusulas e na forma da Lei aplicável.
      </p>

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA SEGUNDA - DAS OBRIGAÇÕES DA CONTRATADA</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">2.1. Prestar os serviços de Fisioterapia e condicionamento físico com zelo, qualidade e profissionalismo, por meio de profissionais habilitados e qualificados.</p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">2.2. Disponibilizar instalações, equipamentos e materiais adequados à execução dos serviços.</p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">2.3. Manter sigilo sobre as informações pessoais e de saúde do(a) CONTRATANTE, nos termos da legislação vigente, em especial a Lei Geral de Proteção de Dados (LGPD).</p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">2.4. Orientar o(a) CONTRATANTE sobre os procedimentos, exercícios e condutas a serem adotados durante e após as sessões.</p>

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA TERCEIRA - DAS OBRIGAÇÕES DO(A) CONTRATANTE</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">3.1. Efetuar o pagamento do plano contratado de forma pontual, nos valores e datas acordados.</p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">3.2. Comparecer às sessões agendadas com pontualidade. O não comparecimento sem aviso prévio de, no mínimo, 24 (vinte e quatro) horas, poderá implicar a cobrança da sessão ou a sua dedução do total de sessões contratadas.</p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">3.3. Respeitar as orientações dos profissionais da CONTRATADA, visando à eficácia e segurança do CONTRATANTE.</p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">3.4. Informar à CONTRATADA sobre qualquer alteração das informações do presente instrumento ou condições de saúde que possam interferir no objeto do contrato.</p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">3.5. Zelar pelos equipamentos e instalações da CONTRATADA, responsabilizando-se por eventuais danos causados por uso indevido.</p>

      ${renderClausulaPagamento({
        isAnual,
        isRecorrente,
        isMensalSemVinculo,
        recorrenciaMeses,
        parcelasCount,
        valorFinal,
        valorParcela,
        precoBase,
        descVal,
        descontoTexto: descontoTextoProt,
        formaVigencia: formaVigenciaProt,
        formaPag,
        diaVenc,
        numClausula: 'QUARTA',
        prefix: '4'
      })}

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA QUINTA - DA VIGÊNCIA, PRAZO E RECESSOS</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">5.1. O presente contrato tem vigência de <strong>${vigenciaText}</strong>, com início em <strong>${fmtDate(dateInicio)}</strong>.</p>
      ${(!isAnual && isRecorrente) ? `<p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">5.2. O presente contrato será renovado automaticamente ao término do prazo previsto, em caso de ausência de manifestação em sentido contrário, passando a vigorar por prazo indeterminado.</p>` : ''}
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">${!isAnual ? '5.3.' : '5.2.'} A(O) CONTRATANTE declara estar ciente de que os feriados que coincidirem com o dia habitual de treinamento serão considerados como aula ministrada, não gerando direito à reposição, desconto ou compensação.</p>

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA SEXTA - DO RECESSO</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">6.1. O(A) CONTRATANTE terá direito a 1 (uma) semana de férias no primeiro semestre e 1 (uma) semana de férias no segundo semestre, não sendo devidas reposições das aulas correspondentes.</p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">6.2. A(O) CONTRATANTE terá um recesso de final de ano compreendido entre o Natal e o primeiro dia útil de janeiro, período este considerado como férias já incluídas no pacote contratado, permanecendo a cobrança do plano normalmente, sem direito à reposição, compensação ou desconto das aulas não realizadas durante o referido recesso.</p>

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA SÉTIMA - DA RESCISÃO</h3>
      ${rescisaoProt.map(clause => `<p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">${clause}</p>`).join('')}

      ${isAnual ? `
        <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA OITAVA - DO CONGELAMENTO DO PLANO</h3>
        <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">8.1. Fica assegurado ao(à) CONTRATANTE o direito de solicitar o congelamento (suspensão temporária) do plano pelo período de 30 (trinta) dias, a ser usufruído dentro do prazo de vigência de 12 (doze) meses, contados a partir da assinatura do contrato.</p>
        <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">8.1.1. O período de congelamento do contrato poderá ser utilizado de forma fracionada, em contagem semanal, desde que o total dos períodos de congelamento não ultrapasse o limite previsto em cláusula 8.1.</p>
      ` : ''}

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA ${nomResp} - DA RESPONSABILIDADE</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">${nResp}.1. A CONTRATADA não se responsabiliza por lesões ou danos decorrentes do não cumprimento das orientações profissionais por parte do(a) CONTRATANTE ou da omissão de informações relevantes sobre seu estado de saúde.</p>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">${nResp}.2. A responsabilidade da CONTRATADA limita-se à prestação dos serviços nos termos aqui descritos, não garantindo resultados específicos, que podem variar conforme a condição e a resposta individual de cada CONTRATANTE.</p>

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA ${nomDados} - DA PROTEÇÃO DE DADOS</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">${nDados}.1. O(A) CONTRATANTE autoriza a CONTRATADA a coletar, armazenar e tratar seus dados pessoais e de saúde estritamente para os fins de execução deste contrato e prestação dos serviços, em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados).</p>

      <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA ${nomForo} - DO FORO</h3>
      <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">${nForo}.1. Fica eleito o foro da Comarca de Belo Horizonte para dirimir quaisquer controvérsias oriundas do presente contrato, com renúncia a qualquer outro, por mais privilegiado que seja.</p>

      <p style="font-size: 9.5pt; margin-top: 20px; margin-bottom: 20px; line-height: 1.4; text-align: justify;">E, por estarem justas e contratadas, as partes assinam o presente instrumento.</p>
      <p style="font-size: 9.5pt; margin-bottom: 40px; font-weight: bold;">Belo Horizonte/MG, ${dataAssinaturaExtenso}.</p>

      <div style="display: flex; justify-content: space-between; margin-top: 50px; font-size: 9.5pt; page-break-inside: avoid; break-inside: avoid;">
        <div style="flex: 1; text-align: center; margin-right: 20px;">
          <div style="border-top: 1px solid #333; padding-top: 6px; margin-top: 30px;">
            <strong>${_isMinor ? 'CONTRATANTE / RESPONSÁVEL LEGAL' : 'CONTRATANTE'}:</strong><br/>${data.clientNome || '[-]'}<br/><small>CPF: ${data.clientCpf || '[-]'}</small>
          </div>
        </div>
        <div style="flex: 1; text-align: center; margin-left: 20px;">
          <div style="border-top: 1px solid #333; padding-top: 6px; margin-top: 30px;">
            <strong>CONTRATADA:</strong><br/>CLUBE FITNESS FISIO LTDA<br/><small>CNPJ: 52.883.492/0001-04</small>
          </div>
        </div>
      </div>
      ${renderSignatureBeneficiario()}
    `;

    if (data.observacoesContratuais) {
      protocoloHtml += `<div style="margin-top: 30px; font-size: 9.5pt; border-top: 1px solid var(--border-color); padding-top: 10px; page-break-inside: avoid; break-inside: avoid;"><strong>Observações Contratuais:</strong><br/>${data.observacoesContratuais}</div>`;
    }
    return protocoloHtml;
  }

  let html = `
    <h2 style="font-size: 13pt; font-weight: bold; margin: 10px 0 20px 0; text-transform: uppercase; text-align: center;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h2>

    <p style="font-size: 9.5pt; margin-bottom: 12px; line-height: 1.4; text-align: justify;">
      ${_isMinor ? renderContratanteMinor('CONTRATANTE') : contratanteText} ("Contratante"); e
    </p>
    ${_isMinor ? `<p style="font-size: 9.5pt; margin-bottom: 12px; line-height: 1.4; text-align: justify;">${renderBeneficiario()}</p>` : ''}

    <p style="font-size: 9.5pt; margin-bottom: 12px; line-height: 1.4; text-align: justify;">
      ${contratadoText} (“Contratado”).
    </p>

    <p style="font-size: 9.5pt; margin-bottom: 14px; line-height: 1.4; text-align: justify;">
      Sendo Contratante e Contratada denominados isoladamente como “Parte” e, conjuntamente, como “Partes”.
    </p>

    <p style="font-size: 9.5pt; margin-bottom: 14px; line-height: 1.4; text-align: justify;">
      As Partes têm, entre si, justas e acertadas, o presente Contrato de Prestação de Serviços (“Contrato”), que será regido pelas seguintes cláusulas e condições:
    </p>

    <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA I - OBJETO</h3>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      1.1. O presente Contrato tem por objeto a prestação de serviços de Fisioterapia e condicionamento físico na modalidade <strong>Plano ${data.planNome}</strong>, com a disponibilização de <strong>${data.creditosMensais ? `${data.creditosMensais} (${creditosExtenso(data.creditosMensais)})` : '—'} créditos mensais</strong>, nos termos previstos neste Contrato (“Serviços”).
    </p>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      Os serviços prestados serão de inteira e exclusiva responsabilidade técnica do Contratado, devendo zelar pela qualidade, disponibilidade, assertividade e pontualidade dos serviços ora contratados.
    </p>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      Caberá ao CONTRATADO, a partir da avaliação e análise realizada por seus profissionais habilitados, definir o plano de tratamento mais adequado ao CONTRATANTE, considerando suas condições físicas, objetivos, necessidades e critérios técnicos. O plano de tratamento poderá ser ajustado sempre que houver necessidade, conforme a evolução do CONTRATANTE ou por recomendação da equipe técnica, visando a melhor condução do atendimento.
    </p>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      1.2. Capacidade técnica. O Contratado declara-se, neste ato, perfeitamente apto e capaz tecnicamente para desenvolver os serviços, garantindo perante as Contratantes o correto desempenho dos serviços que vierem a desenvolver no atendimento ao estabelecido neste Contrato.
    </p>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      1.3. Livre Negociação. As Partes declaram que negociaram o presente Contrato conjuntamente e que o celebram em mútuo e comum acordo, de modo que a interpretação deste Contrato não será em favor de uma ou de outra Parte, mas sim em consonância com o quanto estabelecido em suas cláusulas e na forma da Lei aplicável.
    </p>

    <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA II - OBRIGAÇÕES DA CONTRATADA</h3>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      2.1 Durante todo o período de vigência do Contrato, o Contratado se obriga a:
    </p>
    <ul style="font-size: 9.5pt; line-height: 1.4; margin-left: 20px; margin-bottom: 8px; text-align: justify;">
      <li style="margin-bottom: 4px;">Atuar sempre no melhor interesse da Contratante, cumprindo e fazendo com que seja cumprida toda a Lei aplicável, comprometendo-se a observar as determinações e diretrizes a serem tomadas pela Contratante;</li>
      <li style="margin-bottom: 4px;">Desempenhar seus serviços sempre com zelo, lealdade e diligência;</li>
      <li style="margin-bottom: 4px;">Utilizar somente dados e documentos apresentados pela Contratante, responsabilizando-se por toda informação repassada a terceiros que não aquelas apresentadas pela Contratante;</li>
      <li style="margin-bottom: 4px;">Respeitar a confidencialidade quanto aos dados, pessoais ou não, e informações que vier a ter acesso em função dos serviços prestados, bem como atuar em conformidade com a Lei Geral de Proteção de Dados Pessoais.</li>
    </ul>

    <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA III - OBRIGAÇÕES DA CONTRATANTE</h3>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      3.1 A Contratante se obriga a apresentar ao Contratado todos os documentos necessários ao bom e fiel cumprimento do presente Contrato, inclusive quanto aos dados técnicos, especificações e instruções necessárias à prestação dos serviços contratados.
    </p>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      3.2 A Contratante se obriga a efetuar os pagamentos devidos ao Contratado, nos prazos e condições estabelecidos neste Contrato.
    </p>

    ${renderClausulaPagamento({
      isAnual,
      isRecorrente,
      isMensalSemVinculo,
      recorrenciaMeses,
      parcelasCount,
      valorFinal,
      valorParcela,
      precoBase,
      descVal,
      descontoTexto: data.descontoTipo === 'percentual' ? `${descVal}%` : `R$ ${descVal.toFixed(2).replace('.', ',')} (${valorExtenso(descVal)})`,
      formaVigencia: isAnual ? 'Anual' : 'Mensal',
      formaPag,
      diaVenc,
      numClausula: 'IV',
      prefix: '4'
    })}

    <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA V - VIGÊNCIA E RESCISÃO</h3>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      5.1. Prazo de vigência. O presente Contrato entra em vigor na data de início dos serviços, em <strong>${fmtDate(dateInicio)}</strong>, e vigorará pelo prazo de <strong>${vigenciaText}</strong>, com término previsto para <strong>${fmtDate(dateFim)}</strong>${
        (customDuracao === 'mensal' && !isRecorrente)
          ? ''
          : ', com a renovação automática caso não formalizado Distrato por escrito entre as partes'
      }.
    </p>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      5.2. Rescisão. Observado o disposto abaixo, qualquer das Partes poderá rescindir e terminar este Contrato, imotivadamente, a qualquer momento, mediante aviso prévio por escrito enviado com antecedência mínima de 30 (trinta) dias à outra Parte.
    </p>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      5.3. Rescisão por Justo Motivo. A Contratante poderá rescindir este Contrato de forma imediata por justo motivo nas seguintes hipóteses: (i) se o Contratado cometer qualquer ato ilícito; (ii) se quaisquer das partes deixar de cumprir quaisquer das disposições deste Contrato que não for sanada no prazo de 10 (dez) dias contados do inadimplemento, se possível a cura do inadimplemento.
    </p>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      5.4. Trancamento. ${isAnual ? `
        A Contratante de plano anual possui o direito de suspender ("congelar") e redistribuir seus créditos por um período de até 30 (trinta) dias, em razão de sua ausência, desde que a utilização ocorra estritamente dentro da vigência do plano contratado, sendo vedada a prorrogação do prazo contratual original.
      ` : `
        Por se tratar de plano da modalidade Mensal/Curta duração, o Contratante declara-se ciente de que não possui direito ao congelamento ou trancamento temporário de créditos.
      `}
    </p>

    <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA VI - CONFIDENCIALIDADE</h3>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      6.1. Confidencialidade. O Contratado concorda que os termos e condições do presente Contrato são sigilosos e devem ser considerados como Informação Confidencial, obrigando-se por si a não os divulgar, parcial ou integralmente, a terceiros (“Informação Confidencial”).
    </p>

    <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA VII – PROPRIEDADE INTELECTUAL</h3>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      7.1. Propriedade Intelectual. O Contratado expressamente reconhece e aceita que nada neste Contrato constitui qualquer forma de transferência de propriedade ou autorização de utilização (salvo, neste caso, pelos direitos não exclusivos aqui expressamente autorizados) de qualquer propriedade intelectual, tecnologia, know how, software, marca, patente, procedimento, sistema, código fonte e/ou ferramenta detido, registrado, sujeito a pedido de registro ou, de qualquer outra forma, sob a posse, propriedade, licenciadas ou cedidas em favor da Contratante.
    </p>

    <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA VIII - DISPOSIÇÕES GERAIS</h3>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      8.1. Consentimento. Cada Parte assina este Contrato para expressar seu consentimento completo e irrestrito a todos os termos e condições contidos no presente, e compromete-se a cumprir estritamente este Contrato e fazer com que este seja estritamente cumprido.
    </p>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      8.2. Livre Negociação. As Partes declaram que negociaram o presente Contrato conjuntamente e que o celebram em mútuo e comum acordo, de modo que a interpretação deste Contrato não será em favor de uma ou de outra Parte, mas sim em consonância com o quanto estabelecido em suas cláusulas e na forma da Lei aplicável.
    </p>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      8.3. Lei Aplicável. O presente Contrato, bem como quaisquer disputas dele decorrentes ou relacionadas, serão regidos pelas leis da República Federativa do Brasil.
    </p>

    <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA IX - FORO</h3>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      9.1. Foro. Fica eleito o foro da Comarca de Belo Horizonte/MG para dirimir qualquer dúvida ou controvérsia emergente do presente Contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.
    </p>

    <p style="font-size: 9.5pt; margin-top: 20px; margin-bottom: 20px; line-height: 1.4; text-align: justify;">
      E por estarem justas e acertadas, as Partes assinam o presente Contrato em via eletrônica conjuntamente com 2 (duas) testemunhas.
    </p>

    <p style="font-size: 9.5pt; margin-bottom: 40px; font-weight: bold;">
      Belo Horizonte/MG, ${dataAssinaturaExtenso}
    </p>

    <!-- Signatures -->
    <div style="display: flex; justify-content: space-between; margin-top: 50px; font-size: 9.5pt; page-break-inside: avoid; break-inside: avoid;">
      <div style="flex: 1; text-align: center; margin-right: 20px;">
        <div style="border-top: 1px solid #333; padding-top: 6px; margin-top: 30px;">
          <strong>${_isMinor ? 'CONTRATANTE / RESPONSÁVEL LEGAL' : 'CONTRATANTE'}:</strong><br/>
          ${data.clientNome || '[-]'}<br/>
          <small>CPF: ${data.clientCpf || '[-]'}</small>
        </div>
      </div>
      <div style="flex: 1; text-align: center; margin-left: 20px;">
        <div style="border-top: 1px solid #333; padding-top: 6px; margin-top: 30px;">
          <strong>CONTRATADO:</strong><br/>
          CLUBE FITNESS FISIO LTDA<br/>
          <small>CNPJ: 52.883.492/0001-04</small>
        </div>
      </div>
    </div>
    ${renderSignatureBeneficiario()}

    <!-- Witnesses -->
    <div style="margin-top: 50px; font-size: 9.5pt; page-break-inside: avoid; break-inside: avoid;">
      <p style="font-weight: bold; margin-bottom: 15px;">Testemunhas:</p>
      <div style="display: flex; justify-content: space-between;">
        <div style="flex: 1; border-top: 1px solid #333; padding-top: 6px; margin-right: 20px; margin-top: 20px; text-align: left;">
          Nome:<br/>
          CPF:
        </div>
        <div style="flex: 1; border-top: 1px solid #333; padding-top: 6px; margin-left: 20px; margin-top: 20px; text-align: left;">
          Nome:<br/>
          CPF:
        </div>
      </div>
    </div>
  `;

  if (data.observacoesContratuais) {
    html += `
      <div style="margin-top: 30px; font-size: 9.5pt; border-top: 1px solid var(--border-color); padding-top: 10px; page-break-inside: avoid; break-inside: avoid;">
        <strong>Observações Contratuais:</strong><br/>
        ${data.observacoesContratuais}
      </div>
    `;
  }

  return html;
}
