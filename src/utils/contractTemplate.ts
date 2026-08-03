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
  clientNacionalidade?: string;
  clientEstadoCivil?: string;
  clientProfissao?: string;
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
  planPreco: number;
  planTipo?: string;

  descontoTipo?: 'percentual' | 'reais' | string;
  descontoValor?: number;
  parcelas?: number;
  formaPagamento?: string;
  dataInicio?: string;
  dataVencimento?: string;
  observacoesContratuais?: string;
  unidadeContratada?: string;
  creditosMensais?: number;
}

export function generateContractTemplate(data: ContractData): string {
  const isAnual = (data.planTipo === 'Anual' || data.planNome.toLowerCase().includes('anual'));
  const vigenciaText = isAnual ? '12 (doze) meses' : '1 (um) mês';

  // Calculations
  const precoBase = data.planPreco || 0;
  const descVal = Number(data.descontoValor) || 0;
  let valorFinal = precoBase;
  if (data.descontoTipo === 'percentual') {
    valorFinal = precoBase * (1 - descVal / 100);
  } else {
    valorFinal = Math.max(0, precoBase - descVal);
  }

  const parcelasCount = Number(data.parcelas) || 1;
  const valorParcela = valorFinal / parcelasCount;

  // Dates
  const todayStr = new Date().toISOString().split('T')[0];
  const dateInicio = data.dataInicio || todayStr;
  const startD = new Date(dateInicio + 'T00:00:00');
  startD.setMonth(startD.getMonth() + (isAnual ? 12 : 1));
  const dateFim = startD.toISOString().split('T')[0];

  const dateVenc = data.dataVencimento || todayStr;
  const diaVenc = dateVenc.split('-')[2] ? parseInt(dateVenc.split('-')[2], 10) : 5;

  const formaPag = ({
    pix: 'Pix',
    boleto: 'Boleto Bancário',
    cartao: 'Cartão de Crédito',
    dinheiro: 'Dinheiro'
  } as any)[(data.formaPagamento || '').toLowerCase()] || data.formaPagamento || 'Pix';

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
    data.clientNacionalidade ? `de nacionalidade ${data.clientNacionalidade}` : '',
    data.clientEstadoCivil ? `estado civil ${data.clientEstadoCivil}` : '',
    data.clientProfissao ? `profissão ${data.clientProfissao}` : '',
    data.clientEmail ? `e-mail ${data.clientEmail}` : '',
    data.clientTelefone ? `telefone ${data.clientTelefone}` : ''
  ].filter(Boolean).join(', ');

  const contratanteText = `<strong>CONTRATANTE:</strong> ${data.clientNome || '[-]'}, portador(a) do CPF nº ${data.clientCpf || '[-]'}${clientDetails ? `, ${clientDetails}` : ''}, residente e domiciliado(a) em: ${enderecoCompleto}`;

  const contratadoText = `<strong>CONTRATADO:</strong> CLUBE FITNESS FISIO LTDA, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 52.883.492/0001-04, com sede na Avenida dos Bandeirantes, nº 1250, Sion, Belo Horizonte/MG, CEP 30315-380, neste ato representada na forma de seu contrato social`;

  // Generate Date in words for signing
  const now = new Date();
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const dataAssinaturaExtenso = `${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;

  let html = `
    <h2 style="font-size: 13pt; font-weight: bold; margin: 10px 0 20px 0; text-transform: uppercase; text-align: center;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h2>

    <p style="font-size: 9.5pt; margin-bottom: 12px; line-height: 1.4; text-align: justify;">
      ${contratanteText} (“Contratante”); e
    </p>

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
      1.2. Capacidade técnica. O Contratado declara-se, neste ato, perfeitamente apto e capaz tecnicamente para desenvolver os serviços, garantindo perante as Contratantes o correct desempenho dos serviços que vierem a desenvolver no atendimento ao estabelecido neste Contrato.
    </p>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      1.4. Livre Negociação. As Partes declaram que negociaram o presente Contrato conjuntamente e que o celebram em mútuo e comum acordo, de modo que a interpretação deste Contrato não será em favor de uma ou de outra Parte, mas sim em consonância com o quanto estabelecido em suas cláusulas e na forma da Lei aplicável.
    </p>

    <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA II - OBRIGAÇÕES DA CONTRATADA</h3>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      2.1 Durante todo o período de vigência do Contrato, o Contratado se obriga a:
    </p>
    <ul style="font-size: 9.5pt; line-height: 1.4; margin-left: 20px; margin-bottom: 8px; text-align: justify;">
      <li style="margin-bottom: 4px;">Atuar sempre no melhor interest da Contratante, cumprindo e fazendo com que seja cumprida toda a Lei aplicável, comprometendo-se a observar as determinações e diretrizes a serem tomadas pela Contratante;</li>
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

    <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA IV - DO PREÇO E DO PAGAMENTO</h3>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      4.1. Contraprestação. A título de contraprestação pelos serviços a serem prestados pelo Contratado à Contratante, nos termos deste Contrato, será pago o valor líquido de <strong>R$ ${valorFinal.toFixed(2).replace('.', ',')} (${valorExtenso(valorFinal)})</strong>, a ser quitado em <strong>${parcelasExtenso(parcelasCount)}</strong> parcela(s) no valor de <strong>R$ ${valorParcela.toFixed(2).replace('.', ',')} (${valorExtenso(valorParcela)})</strong> cada, com pagamento vencendo até o dia <strong>${diaExtenso(diaVenc)}</strong> de cada mês de serviços prestados, por meio de <strong>${formaPag}</strong>.
    </p>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      4.2. Mora. Em caso de atraso injustificado no pagamento da Contraprestação, incidirão sobre esta juros de 1% a.m. (um por cento ao mês) e multa compensatória de 2% (dois por cento) até que o valor principal venha a ser pago, salvo quando a Contratada tiver dado causa à mora.
    </p>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      4.3. Tributos. Correrá por conta da Contratada o valor correspondente a eventuais tributos incidentes sobre a Remuneração acima prevista, que deverá ser recolhido aos cofres públicos na forma legal.
    </p>

    <h3 style="font-size: 10pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #000; padding-bottom: 3px;">CLÁUSULA V - VIGÊNCIA E RESCISÃO</h3>
    <p style="font-size: 9.5pt; line-height: 1.4; text-align: justify; margin-bottom: 8px;">
      5.1. Prazo de vigência. O presente Contrato entra em vigor na data de início dos serviços, em <strong>${fmtDate(dateInicio)}</strong>, e vigorará pelo prazo de <strong>${vigenciaText}</strong>, com término previsto para <strong>${fmtDate(dateFim)}</strong>, com a renovação automática caso não formalizado Distrato por escrito entre as partes.
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
          <strong>CONTRATANTE:</strong><br/>
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
