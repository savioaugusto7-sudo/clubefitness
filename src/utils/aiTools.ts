import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import Contract from '@/models/Contract';
import Appointment from '@/models/Appointment';
import Payment from '@/models/Payment';
import Plan from '@/models/Plan';
import Proposal from '@/models/Proposal';
import Professional from '@/models/Professional';

export const AI_SYSTEM_INSTRUCTION = `
Você é a inteligência artificial oficial do **Clube Fitness & Fisio**, uma academia e clínica integrada de alta performance e saúde em Belo Horizonte.

Sua missão é atuar como um copiloto e assistente administrativo/operacional inteligente e prestativo.
Você tem acesso a ferramentas de consulta e execução de ações no banco de dados do sistema.

### Suas Diretrizes:
1. **Comunicação:** Seja sempre profissional, cordial, claro, objetivo e utilize emojis elegantes para destacar informações. Responda em Português do Brasil.
2. **Uso de Ferramentas:** Quando o usuário perguntar sobre alunos, agendamentos, finanças, planos ou solicitar uma ação (como criar proposta, agendar horário ou checar inadimplência), **SEMPRE execute a ferramenta adequada**.
3. **Formatação Rica:** Apresente tabelas, listas com marcadores e resumos visuais para facilitar a leitura.
4. **Segurança e Veracidade Absoluta:** 
   - Se uma ferramenta retornar "erro" ou indicar que o aluno não foi encontrado, **NUNCA diga que a ação foi realizada**. 
   - Reporte exatamente o status real retornado pela ferramenta. Se falhou, explique o motivo e sugira a correção.
`;

// Helper de busca inteligente ranqueada de alunos por partes do nome
export async function findClientRanked(nameQuery: string): Promise<any> {
  const query = (nameQuery || '').trim().toLowerCase();
  if (!query) return null;

  if (query.match(/^[0-9a-fA-F]{24}$/)) {
    return await Client.findById(query);
  }

  const allClients = await Client.find().lean();
  let bestClient: any = null;
  let highestScore = 0;

  const tokens = query.split(/\s+/).filter(Boolean);

  for (const c of allClients) {
    const clientName = (c.dadosPessoais?.nome || '').toLowerCase();
    if (!clientName) continue;

    if (clientName === query) {
      return c; // Match exato
    }

    if (clientName.includes(query) || query.includes(clientName)) {
      const score = 50;
      if (score > highestScore) {
        highestScore = score;
        bestClient = c;
      }
      continue;
    }

    let score = 0;
    const clientTokens = clientName.split(/\s+/);
    tokens.forEach((tok, idx) => {
      if (clientTokens.some((ct: string) => ct.includes(tok) || tok.includes(ct))) {
        score += (idx === 0 ? 10 : 3); // Maior peso para primeiro nome
      }
    });

    if (score > highestScore) {
      highestScore = score;
      bestClient = c;
    }
  }

  return highestScore >= 3 ? bestClient : null;
}

// Definição das declarações de funções para o Gemini (Function Calling)
export const geminiToolDeclarations = [
  {
    name: 'buscar_aluno',
    description: 'Busca a ficha e dados completos de um aluno pelo nome, CPF ou número de WhatsApp/telefone.',
    parameters: {
      type: 'OBJECT',
      properties: {
        termo: {
          type: 'STRING',
          description: 'Nome, CPF ou telefone do aluno a ser pesquisado.'
        }
      },
      required: ['termo']
    }
  },
  {
    name: 'consultar_agenda',
    description: 'Consulta os agendamentos e horários livres de um dia específico para academia (treinos monitorados) ou consultório (fisioterapia, quiropraxia, massagem).',
    parameters: {
      type: 'OBJECT',
      properties: {
        data: {
          type: 'STRING',
          description: 'Data no formato YYYY-MM-DD (ex: 2026-08-14). Se não informado, assume hoje.'
        },
        tipo: {
          type: 'STRING',
          description: 'Tipo de agendamento: "academia", "consultorio" ou "todos".'
        }
      }
    }
  },
  {
    name: 'criar_agendamento',
    description: 'Realiza um novo agendamento para um aluno no sistema.',
    parameters: {
      type: 'OBJECT',
      properties: {
        alunoNomeOuId: {
          type: 'STRING',
          description: 'Nome ou ID do aluno a ser agendado.'
        },
        data: {
          type: 'STRING',
          description: 'Data do agendamento no formato YYYY-MM-DD.'
        },
        horario: {
          type: 'STRING',
          description: 'Horário no formato HH:MM (ex: 09:00, 15:30).'
        },
        servico: {
          type: 'STRING',
          description: 'Nome do serviço (ex: "Treino Monitorado", "Fisioterapia", "Avaliação Física").'
        },
        tipo: {
          type: 'STRING',
          description: '"academia" ou "consultorio".'
        }
      },
      required: ['alunoNomeOuId', 'data', 'horario', 'servico']
    }
  },
  {
    name: 'obter_resumo_financeiro',
    description: 'Obtém o resumo financeiro atual do sistema (faturamento do mês, pagamentos pendentes/atrasados, contagem de inadimplentes e contratos próximos ao vencimento).',
    parameters: {
      type: 'OBJECT',
      properties: {
        mesAno: {
          type: 'STRING',
          description: 'Mês e ano no formato YYYY-MM (opcional, padrão mês atual).'
        }
      }
    }
  },
  {
    name: 'gerar_link_vendas',
    description: 'Cria uma nova proposta comercial no sistema e gera o link público de vendas para envio ao cliente/aluno.',
    parameters: {
      type: 'OBJECT',
      properties: {
        nomeLeadOuAluno: {
          type: 'STRING',
          description: 'Nome completo do aluno ou lead.'
        },
        telefone: {
          type: 'STRING',
          description: 'Telefone / WhatsApp com DDD.'
        },
        planoNome: {
          type: 'STRING',
          description: 'Nome do plano negociado (ex: "Monitorado Anual", "Monitorado Mensal", "Fisioterapia").'
        },
        valorAcordado: {
          type: 'NUMBER',
          description: 'Valor líquido acordado em Reais (ex: 299.90).'
        },
        formaPagamento: {
          type: 'STRING',
          description: '"pix", "boleto" ou "cartao".'
        }
      },
      required: ['nomeLeadOuAluno', 'planoNome', 'valorAcordado']
    }
  },
  {
    name: 'listar_alunos_em_risco',
    description: 'Lista alunos com alto risco de evasão, que faltaram aos treinos recentemente ou que não agendam há mais de 14 dias.',
    parameters: {
      type: 'OBJECT',
      properties: {
        limite: {
          type: 'NUMBER',
          description: 'Quantidade máxima de alunos a retornar (padrão 10).'
        }
      }
    }
  },
  {
    name: 'consultar_planos',
    description: 'Lista todos os planos comerciais cadastrados e ativos no Clube Fitness com seus respectivos preços e modalidades.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  }
];

// Executor real das ferramentas conectadas ao banco MongoDB
export async function executeAiTool(name: string, args: any): Promise<any> {
  await dbConnect();

  try {
    switch (name) {
      case 'buscar_aluno': {
        const termo = (args.termo || '').trim();
        if (!termo) return { erro: 'Termo de busca vazio.' };

        const regex = new RegExp(termo, 'i');
        const digits = termo.replace(/\D/g, '');

        const queryOr: any[] = [
          { 'dadosPessoais.nome': regex },
          { 'dadosPessoais.email': regex }
        ];
        if (digits.length >= 3) {
          queryOr.push({ 'dadosPessoais.cpf': { $regex: digits } });
          queryOr.push({ 'dadosPessoais.telefone': { $regex: digits } });
        }

        let clients = await Client.find({ $or: queryOr })
          .populate('dadosComerciais.planoId')
          .limit(5)
          .lean();

        if (clients.length === 0) {
          const ranked = await findClientRanked(termo);
          if (ranked) {
            clients = [ranked];
          } else {
            return { erro: `Nenhum aluno encontrado para o termo "${termo}". Verifique se o nome está correto.` };
          }
        }

        const results = await Promise.all(clients.map(async (c: any) => {
          // Buscar último contrato
          const lastContract = await Contract.findOne({ clientId: c._id }).sort({ dataEmissao: -1 }).lean();
          // Buscar últimos agendamentos
          const lastAppointments = await Appointment.find({ clienteId: c._id })
            .sort({ data: -1, horario: -1 })
            .limit(3)
            .lean();
          // Buscar pagamentos pendentes
          const pendingPayments = await Payment.find({ clientId: c._id, status: { $in: ['Pendente', 'Atrasado'] } }).lean();

          return {
            id: c._id,
            nome: c.dadosPessoais?.nome,
            telefone: c.dadosPessoais?.telefone,
            email: c.dadosPessoais?.email,
            cpf: c.dadosPessoais?.cpf,
            statusCadastro: c.cadastroConcluido ? 'Completo' : 'Incompleto',
            planoAtual: c.dadosComerciais?.planoId?.nome || lastContract?.planoNome || 'Sem plano ativo',
            valorPlano: c.dadosComerciais?.valorAcordado || lastContract?.valorLiquido || 0,
            saldoCreditos: {
              academia: c.creditosTotal || 0,
              massagem: c.creditosMassagemPorPlano || 0,
              emergencia: c.creditosEmergenciaPorPlano || 0
            },
            inadimplente: pendingPayments.length > 0,
            quantidadePendencias: pendingPayments.length,
            dadosClinicos: {
              lesoes: c.dadosClinicos?.lesoes || 'Nenhuma informada',
              restricoes: c.dadosClinicos?.restricoes || 'Nenhuma informada',
              medicamentos: c.dadosClinicos?.medicamentos || 'Nenhum informado'
            },
            ultimosAgendamentos: lastAppointments.map((a: any) => ({
              data: a.data,
              horario: a.horario,
              servico: a.servico,
              status: a.status
            }))
          };
        }));

        return { total: results.length, alunos: results };
      }

      case 'consultar_agenda': {
        const todayStr = new Date().toISOString().split('T')[0];
        const dataBusca = args.data || todayStr;
        const tipoBusca = args.tipo || 'todos';

        const filter: any = { data: dataBusca };
        if (tipoBusca !== 'todos' && (tipoBusca === 'academia' || tipoBusca === 'consultorio')) {
          filter.tipo = tipoBusca;
        }

        const appointments = await Appointment.find(filter)
          .populate('clienteId', 'dadosPessoais.nome dadosPessoais.telefone')
          .populate('profissionalId', 'nome')
          .sort({ horario: 1 })
          .lean();

        const formatados = appointments.map((a: any) => ({
          horario: a.horario,
          servico: a.servico,
          tipo: a.tipo,
          status: a.status,
          aluno: a.clienteId?.dadosPessoais?.nome || 'Aluno não identificado',
          telefone: a.clienteId?.dadosPessoais?.telefone || '',
          profissional: a.profissionalId?.nome || 'Profissional Geral'
        }));

        return {
          data: dataBusca,
          totalAgendamentos: formatados.length,
          agendamentos: formatados
        };
      }

      case 'criar_agendamento': {
        const { alunoNomeOuId, data, horario, servico, tipo } = args;
        if (!alunoNomeOuId || !data || !horario || !servico) {
          return { erro: 'Parâmetros insuficientes para agendamento (aluno, data, horário e serviço são obrigatórios).' };
        }

        const client = await findClientRanked(alunoNomeOuId);
        if (!client) {
          return { 
            erro: `Aluno "${alunoNomeOuId}" não encontrado no sistema. Por favor, verifique o nome cadastrado.` 
          };
        }

        // Definir automaticamente tipo: academia ou consultorio
        let appointmentType = tipo;
        if (!appointmentType || appointmentType === 'todos') {
          if (/fisio|quiropraxia|massagem|consulta/i.test(servico)) {
            appointmentType = 'consultorio';
          } else {
            appointmentType = 'academia';
          }
        }

        // Localizar profissional adequado
        let professional = null;
        if (appointmentType === 'academia') {
          professional = await Professional.findOne({ especialidade: /treino|avalia|educa/i });
        } else {
          professional = await Professional.findOne({ especialidade: /fisio|quiro/i });
        }
        if (!professional) {
          professional = await Professional.findOne();
        }

        if (!professional) {
          return { erro: 'Nenhum profissional disponível no sistema para vincular o agendamento.' };
        }

        const newAppt = await Appointment.create({
          data,
          horario,
          tipo: appointmentType,
          servico,
          consumeCredito: appointmentType === 'academia',
          tipoCredito: appointmentType === 'academia' ? 'academia' : 'nenhum',
          clienteId: client._id,
          profissionalId: professional._id,
          status: 'agendado'
        });

        return {
          sucesso: true,
          mensagem: `Agendamento criado com sucesso no banco de dados!`,
          agendamento: {
            id: newAppt._id,
            aluno: client.dadosPessoais?.nome,
            servico,
            tipo: appointmentType,
            data,
            horario,
            profissional: professional.nome,
            status: 'agendado'
          }
        };
      }

      case 'obter_resumo_financeiro': {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const currentMonthPrefix = args.mesAno || `${year}-${month}`;

        // 1. Pagamentos do mês
        const payments = await Payment.find({ vencimento: { $regex: `^${currentMonthPrefix}` } }).lean();
        const totalRecebido = payments.filter((p: any) => p.status === 'Pago').reduce((acc: number, p: any) => acc + (p.valor || 0), 0);
        const totalPendente = payments.filter((p: any) => p.status === 'Pendente').reduce((acc: number, p: any) => acc + (p.valor || 0), 0);
        const totalAtrasado = payments.filter((p: any) => p.status === 'Atrasado').reduce((acc: number, p: any) => acc + (p.valor || 0), 0);

        // 2. Inadimplentes gerais
        const inadimplentes = await Payment.find({ status: 'Atrasado' })
          .populate('clientId', 'dadosPessoais.nome dadosPessoais.telefone')
          .limit(10)
          .lean();

        // 3. Contratos ativos e a vencer nos próximos 30 dias
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const futureDateStr = futureDate.toISOString().split('T')[0];
        const todayStr = today.toISOString().split('T')[0];

        const contratosAVencer = await Contract.find({
          status: 'assinado',
          dataFim: { $gte: todayStr, $lte: futureDateStr }
        }).populate('clientId', 'dadosPessoais.nome dadosPessoais.telefone').limit(10).lean();

        return {
          mesReferencia: currentMonthPrefix,
          faturamentoRecebido: totalRecebido,
          previsaoPendente: totalPendente,
          totalEmAtraso: totalAtrasado,
          taxaAdimplencia: (totalRecebido + totalPendente + totalAtrasado) > 0 
            ? `${((totalRecebido / (totalRecebido + totalPendente + totalAtrasado)) * 100).toFixed(1)}%` 
            : '100%',
          quantidadeInadimplentes: inadimplentes.length,
          listaInadimplentes: inadimplentes.map((i: any) => ({
            aluno: i.clientNome || i.clientId?.dadosPessoais?.nome,
            telefone: i.clientId?.dadosPessoais?.telefone,
            valor: i.valor,
            vencimento: i.vencimento
          })),
          contratosExpirandoProximos30Dias: contratosAVencer.map((c: any) => ({
            aluno: c.clientId?.dadosPessoais?.nome,
            telefone: c.clientId?.dadosPessoais?.telefone,
            plano: c.planoNome,
            dataFim: c.dataFim
          }))
        };
      }

      case 'gerar_link_vendas': {
        const { nomeLeadOuAluno, telefone, planoNome, valorAcordado, formaPagamento } = args;
        
        let plan = await Plan.findOne({ nome: new RegExp(planoNome.trim(), 'i') });
        if (!plan) {
          plan = await Plan.findOne();
        }

        const todayStr = new Date().toISOString().split('T')[0];

        const newProposal = await Proposal.create({
          leadNome: nomeLeadOuAluno,
          leadTelefone: telefone || '',
          planoId: plan?._id,
          planoNome: plan?.nome || planoNome,
          planoTipo: plan?.tipo || 'Mensal',
          duracao: plan?.tipo === 'Anual' ? 'anual' : 'mensal',
          vigenciaQtd: plan?.tipo === 'Anual' ? 1 : 1,
          frequencia: 3,
          creditosMensais: 13,
          descontoTipo: 'fixo',
          descontoValor: 0,
          valorAcordado: Number(valorAcordado) || plan?.preco || 299.9,
          dataInicio: todayStr,
          formaPagamentoSugerida: formaPagamento || 'pix',
          status: 'aberta'
        });

        const appUrl = process.env.NEXTAUTH_URL || 'https://clubefitness.vercel.app';
        const linkVendas = `${appUrl}/vendas/${newProposal._id}`;

        return {
          sucesso: true,
          propostaId: newProposal._id,
          linkVendas,
          mensagem: `Proposta gerada para ${nomeLeadOuAluno} com plano ${plan?.nome || planoNome} no valor de R$ ${valorAcordado}.`,
          instrucoesEnvio: `Envie o link para o cliente: ${linkVendas}`
        };
      }

      case 'listar_alunos_em_risco': {
        const limite = Number(args.limite) || 10;
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        const limitDateStr = fifteenDaysAgo.toISOString().split('T')[0];

        const clients = await Client.find({ cadastroConcluido: true })
          .populate('dadosComerciais.planoId')
          .limit(50)
          .lean();

        const alunosRisco = [];
        for (const c of clients) {
          const lastAppt = await Appointment.findOne({ clienteId: c._id })
            .sort({ data: -1 })
            .lean();

          const semTreinoRecente = !lastAppt || lastAppt.data < limitDateStr;
          if (semTreinoRecente) {
            alunosRisco.push({
              id: c._id,
              nome: c.dadosPessoais?.nome,
              telefone: c.dadosPessoais?.telefone,
              plano: c.dadosComerciais?.planoId?.nome || 'Sem plano',
              ultimoTreino: lastAppt ? lastAppt.data : 'Nunca treinou',
              diasSemTreinar: lastAppt 
                ? Math.floor((new Date().getTime() - new Date(lastAppt.data).getTime()) / (1000 * 3600 * 24)) 
                : '15+'
            });
          }
          if (alunosRisco.length >= limite) break;
        }

        return {
          totalEmRisco: alunosRisco.length,
          alunos: alunosRisco
        };
      }

      case 'consultar_planos': {
        const plans = await Plan.find({ ativo: { $ne: false } }).sort({ preco: 1 }).lean();
        return {
          totalPlanos: plans.length,
          planos: plans.map((p: any) => ({
            id: p._id,
            nome: p.nome,
            tipo: p.tipo,
            preco: p.preco,
            validadeDias: p.validadeDias,
            frequenciaPadrao: p.frequenciaPadrao || 3
          }))
        };
      }

      default:
        return { erro: `Ferramenta "${name}" não reconhecida.` };
    }
  } catch (err: any) {
    console.error(`Erro ao executar ferramenta ${name}:`, err);
    return { erro: `Falha ao executar ${name}: ${err.message}` };
  }
}
