const fs = require('fs');

const filePath = 'C:/Users/user/.gemini/antigravity-ide/scratch/clubefitness/src/components/DashboardAdmin.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Normalize CRLF to LF for processing
content = content.replace(/\r\n/g, '\n');

const startMarker = '\n  const generateContractTemplate = () => {';
const endMarker = '\n  const handleCreateContract = async (status:';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('Markers not found!', startIdx, endIdx);
  process.exit(1);
}

console.log(`Replacing lines ${startIdx}-${endIdx}`);

const newFn = `
  const generateContractTemplate = () => {
    const plan = plans.find((p: any) => p._id === dcPlano);
    if (!plan) return 'Nenhum plano selecionado.';

    const isAnual = plan.tipo === 'Anual';
    const mesesVigencia = isAnual ? 12 : 1;
    const vigenciaText = isAnual ? '12 (doze) meses' : '1 (um) mês';

    const bruto = plan.preco || 0;
    const descVal = Number(dcDescontoValor) || 0;
    let liquido = bruto;
    if (dcDescontoTipo === 'percentual') {
      liquido = bruto * (1 - descVal / 100);
    } else {
      liquido = Math.max(0, bruto - descVal);
    }
    const nParc = Number(dcParcelas) || 1;
    const valorParc = liquido / nParc;
    const fmt = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let dataFimStr = '[Data Fim]';
    if (dcDataInicio) {
      const start = new Date(dcDataInicio + 'T00:00:00');
      start.setMonth(start.getMonth() + mesesVigencia);
      dataFimStr = start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    }
    const fmtDate = (d: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '[data]';
    const dataInicioFormatada = fmtDate(dcDataInicio);
    const dataContrato = dcDataInicio ? fmtDate(dcDataInicio) : fmtDate(new Date().toISOString().split('T')[0]);
    const vencimentoFormatado = dcVencimento ? new Date(dcVencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '[Primeiro Vencimento]';

    const creditosMensais = plan.limiteSessoesAcademia || plan.creditosTotal || 9;
    const numeraisExtenso: Record<number,string> = {1:'um',2:'dois',3:'três',4:'quatro',5:'cinco',6:'seis',7:'sete',8:'oito',9:'nove',10:'dez',11:'onze',12:'doze'};
    const creditosPorExtenso = numeraisExtenso[creditosMensais] || String(creditosMensais);

    const servicosPadrao = ['Liberação Miofascial','Quiropraxia','Recuperação (Recovery)','Hidrogênioterapia','Laserterapia','Bota pneumática','Eletroterapia','Treinos monitorados'];
    const servicosLista = (plan.servicosPermitidos?.length > 0 ? plan.servicosPermitidos : servicosPadrao)
      .map((s: string) => '<li>' + s + '</li>').join('');

    const nomeCompleto = dcNome || '[Nome do Contratante]';
    const cpfVal = dcCpf || '[CPF]';
    const enderecoCompleto = [dcEndereco, dcNumero ? 'nº ' + dcNumero : '', dcComplemento, dcBairro ? 'Bairro ' + dcBairro : ''].filter(Boolean).join(', ') || '[Endereço completo do Contratante]';
    const cidadeEstado = dcCidade && dcEstado ? dcCidade + '/' + dcEstado : 'Belo Horizonte/MG';
    const foro = dcCidade || 'Belo Horizonte';
    const cnpj = '52.883.492/0001-04';
    const contratadaNome = 'Albert Nunes Queiroz dos Santos LTDA.';
    const unidade = dcUnidadeContratada || plan.unidadeAtendimento || 'Principal';

    const beneficiosAnuaisHTML = isAnual
      ? \`<ul style="margin-left:24px"><li>01 (uma) sessão de massagem por mês, no sistema de massoterapia da clínica.</li><li>01 (uma) atendimento de emergência terapêutica por mês, mediante necessidade clínica comprovada pelo fisioterapeuta.</li></ul>
         <p><em>Dos Atendimentos de Emergência:</em> Adicionalmente, reserva-se ao contratante o direito a 01 (uma) intervenção mensal de caráter emergencial, destinada exclusivamente ao atendimento terapêutico individualizado, mediante comprovação de necessidade.</p>
         <p><em>Da Gestão Terapêutica e Utilização de Créditos:</em> Na hipótese de o fisioterapeuta responsável identificar a necessidade técnica de atendimentos suplementares ao limite mensal estabelecido, o profissional procederá ao manejo das reservas contratuais disponíveis. Caberá exclusivamente ao fisioterapeuta a avaliação clínica e a gestão da frequência dessas sessões extraordinárias, sem ônus para o contratante.</p>
         <p>Acesso à unidade \${unidade} com aulas coletivas de acordo com a disponibilidade da unidade.</p>\`
      : '<p>Por se tratar de plano Mensal, o CONTRATANTE <strong>não</strong> possui direito aos benefícios exclusivos da modalidade Anual (massagem cortesia, atendimento de emergência e congelamento de plano).</p>';

    const congelamentoClausula = isAnual
      ? '<em>Parágrafo Segundo:</em> O CONTRATANTE de plano anual possui o direito de suspender ("congelar") e redistribuir seus créditos por um período de até <strong>30 (trinta) dias</strong> em razão de sua ausência, desde que a utilização ocorra estritamente dentro da vigência do plano contratado, sendo vedada a prorrogação do prazo contratual original.<br/>'
      : '';
    const paragTerceiro = isAnual ? 'Terceiro' : 'Segundo';

    const obsHTML = dcObservacoesContratuais
      ? '<p><strong>5.6 Observações Adicionais</strong><br/>' + dcObservacoesContratuais + '</p>'
      : '';

    const html =
      '<div style="font-family: Times New Roman, Times, serif; font-size: 12pt; line-height: 1.8; color: #111; max-width: 800px; margin: 0 auto; padding: 40px;">' +
      '<p style="text-align: right; margin-bottom: 4px;">' + dataContrato + '</p>' +
      '<p style="text-align: right; margin-bottom: 32px; font-style: italic;">' + contratadaNome + '</p>' +
      '<h2 style="text-align: center; text-transform: uppercase; font-size: 14pt; margin-bottom: 4px;">Contrato de Prestação de Serviços</h2>' +
      '<p style="text-align: center; color: #555; font-size: 11pt; margin-bottom: 32px;">Prestação de serviços de fisioterapia, atividades físicas de condicionamento</p>' +

      '<h3 style="font-size: 12pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 24px;">1. Identificação das Partes</h3>' +
      '<p><strong>1.1 CONTRATANTE</strong><br/>Nome: <strong>' + nomeCompleto + '</strong><br/>CPF: <strong>' + cpfVal + '</strong><br/>Endereço: ' + enderecoCompleto + '<br/>Cidade: <strong>' + cidadeEstado + '</strong></p>' +
      '<p><strong>1.2 CONTRATADO</strong><br/>Nome: <strong>' + contratadaNome + '</strong><br/>CNPJ: <strong>' + cnpj + '</strong><br/>Unidade: <strong>' + unidade + '</strong><br/>Cidade: <strong>' + cidadeEstado + '</strong></p>' +

      '<h3 style="font-size: 12pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 24px;">2. Objeto do Contrato</h3>' +
      '<p>O presente contrato tem por objeto a prestação de serviços de fisioterapia e atividades físicas, com a disponibilização de <strong>' + creditosMensais + ' (' + creditosPorExtenso + ') créditos mensais</strong>, destinados a sessões de atendimento individualizado, conforme descrito na cláusula 3.</p>' +

      '<h3 style="font-size: 12pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 24px;">3. Serviços a Serem Prestados</h3>' +
      '<p><strong>3.1 Técnicas de Atendimento</strong><br/>O CONTRATADO se compromete a prestar os seguintes serviços de fisioterapia e educação física:</p>' +
      '<ul style="margin-left: 24px;">' + servicosLista + '</ul>' +
      '<p><strong>3.2 Benefícios Adicionais</strong></p>' +
      beneficiosAnuaisHTML +

      '<h3 style="font-size: 12pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 24px;">4. Valor e Forma de Pagamento</h3>' +
      '<p><strong>4.1 Valor ' + (isAnual ? 'Anual' : 'Mensal') + '</strong><br/>' +
      'O CONTRATANTE se compromete a pagar ao CONTRATADO o valor ' + (isAnual ? 'anual' : 'mensal') + ' de <strong>' + fmt(liquido) + '</strong>, pago em <strong>' + nParc + 'x de R$ ' + valorParc.toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2}) + '</strong>.</p>' +
      '<p><strong>4.2 Forma de Pagamento</strong><br/>' +
      'O pagamento será realizado mediante <strong>' + dcFormaPag.toUpperCase() + '</strong>, com vencimento inicial em <strong>' + vencimentoFormatado + '</strong>, conforme condições acordadas entre as partes.</p>' +

      '<h3 style="font-size: 12pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 24px;">5. Cláusulas Específicas</h3>' +
      '<p><strong>5.1 Horário e Reposição</strong><br/>' +
      'O CONTRATADO se compromete a agendar os atendimentos com antecedência mínima de 2 (duas) horas; caso contrário, o sistema não permite a marcação.<br/>' +
      'Em caso de cancelamento ou adiamento, o CONTRATADO deverá notificar com pelo menos <strong>6 (seis) horas</strong> de antecedência.<br/>' +
      'A reposição do crédito será garantida mediante o cumprimento da regra de cancelamento.</p>' +

      '<p><strong>5.2 Planilha de Treinamento</strong><br/>' +
      'O CONTRATADO fornecerá ao CONTRATANTE uma planilha de treinamento personalizada, atualizada mensalmente, com base na evolução clínica e objetivos terapêuticos, para utilização no treino livre. Este deve ser agendado pelo aplicativo, sendo disponibilizadas apenas <strong>3 (três) vagas</strong> por horário para esta modalidade.</p>' +

      '<p><strong>5.3 Férias e Feriados</strong><br/>' +
      '<em>Parágrafo Primeiro:</em> Em caso de feriados ou recessos da Clínica, o CONTRATADO realizará o ajuste da agenda, assegurando a reposição dos créditos em dias úteis, conforme disponibilidade.<br/>' +
      congelamentoClausula +
      '<em>Parágrafo ' + paragTerceiro + ':</em> O CONTRATADO reserva-se o direito de recesso anual entre o Natal e o Ano Novo, devendo o CONTRATANTE utilizar seus créditos remanescentes até o dia 24 de dezembro do respectivo ano.</p>' +

      '<p><strong>5.4 Reajuste Anual</strong><br/>' +
      'O valor dos serviços será reajustado anualmente, com base na variação do Índice de Preços ao Consumidor Amplo (IPCA), divulgado pelo IBGE.</p>' +

      '<p><strong>5.5 Rescisão do Contrato</strong><br/>' +
      'O CONTRATANTE poderá rescindir o contrato mediante aviso prévio de <strong>30 (trinta) dias</strong>, por escrito.<br/>' +
      'Em caso de rescisão sem aviso prévio ou por escrito, será cobrada uma multa de <strong>10% (dez por cento)</strong> sobre o valor total do mês vigente.</p>' +

      obsHTML +

      '<h3 style="font-size: 12pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 24px;">6. Prazo de Vigência</h3>' +
      '<p>O presente contrato terá duração de <strong>' + vigenciaText + '</strong>, iniciando-se em <strong>' + dataInicioFormatada + '</strong>, podendo ser renovado ou rescindido conforme as condições estabelecidas na cláusula 5.5.</p>' +

      '<h3 style="font-size: 12pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 24px;">7. Foro</h3>' +
      '<p>Para todos os efeitos legais decorrentes do presente contrato, as partes elegem o foro da Comarca de <strong>' + foro + '</strong>, renunciando a qualquer outro, por mais privilegiado que seja.</p>' +

      '<h3 style="font-size: 12pt; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-top: 24px;">8. Assinaturas</h3>' +
      '<div style="display:flex;justify-content:space-between;margin-top:60px;gap:40px;">' +
        '<div style="flex:1;text-align:center;"><div style="border-top:1px solid #333;padding-top:8px;margin-top:40px;"><strong>CONTRATANTE</strong><br/>' + nomeCompleto + '<br/><small>CPF: ' + cpfVal + '</small></div></div>' +
        '<div style="flex:1;text-align:center;"><div style="border-top:1px solid #333;padding-top:8px;margin-top:40px;"><strong>CONTRATADO</strong><br/>' + contratadaNome + '<br/><small>CNPJ: ' + cnpj + '</small></div></div>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;margin-top:40px;gap:40px;">' +
        '<div style="flex:1;text-align:center;"><div style="border-top:1px solid #333;padding-top:8px;margin-top:40px;"><strong>Testemunha 1</strong></div></div>' +
        '<div style="flex:1;text-align:center;"><div style="border-top:1px solid #333;padding-top:8px;margin-top:40px;"><strong>Testemunha 2</strong></div></div>' +
      '</div>' +
      '<p style="margin-top:32px;text-align:center;">Local e data: _________________________, ' + dataContrato + '</p>' +
      '</div>';

    return html;
  };

`;

const newContent = content.slice(0, startIdx) + newFn + content.slice(endIdx);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Contract template patched successfully!');
console.log('New file size:', newContent.length);
