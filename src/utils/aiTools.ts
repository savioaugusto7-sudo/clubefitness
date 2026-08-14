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

Sua missão é atuar como um copiloto executivo, inteligente, ágil e prestativo.
Você tem acesso a ferramentas completas para consultar, criar, alterar e cancelar dados no sistema.

### 🧠 Diretrizes de Inteligência e Fluidez Contextual:
1. **Memória de Histórico & Resolução de Pronomes:**
   - Preste total atenção no histórico recente da conversa.
   - Quando o usuário disser *"troque esse agendamento para treino livre"*, *"remarque para 17:00"*, *"mude o horário dele"*, *"cancele isso"*, entenda que ele está se referindo ao **aluno/agendamento recém-mencionado ou recém-criado**.
   - Nesses casos, **NÃO faça perguntas burocráticas** pedindo nome/CPF de novo. Execute diretamente a ferramenta \`alterar_agendamento\` ou \`cancelar_agendamento\`.
2. **Comportamento Executivo e Ágil:**
   - Execute ações de forma direta, clara e objetiva.
   - Responda em Português do Brasil com tom profissional, positivo e emojis elegantes.

### ⚠️ Regras Rígidas de Segurança e Desambiguação de Alunos:
1. **NUNCA TROQUE OU ASSUMA UM ALUNO POR APROXIMAÇÃO:** É terminantemente proibido agendar para uma pessoa diferente apenas por ter um sobrenome similar.
2. **SE A FERRAMENTA RETORNAR "MULTIPLOS_ALUNOS_ENCONTRADOS":**
   - O agendamento **NÃO FOI REALIZADO AINDA**.
   - Você **DEVE** listar claramente as opções de alunos encontradas (com número, Nome Completo, Telefone/E-mail e Plano).
   - Peça ao usuário para escolher o aluno correto (ex: *"Encontrei mais de um aluno com esse termo. Por favor, confirme qual deles é o desejado (digite o número ou nome completo):"*).
3. **SE A FERRAMENTA RETORNAR "NAO_ENCONTRADO":**
   - Informe que o aluno não foi localizado e solicite o CPF ou o nome completo correto.
4. **SOMENTE CONFIRME O AGENDAMENTO** quando a ferramenta retornar \`sucesso: true\`.
`;

export function normalizeText(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export interface ClientSearchResult {
  status: 'EXACT' | 'MULTIPLE' | 'NONE';
  client?: any;
  candidates?: any[];
  mensagem?: string;
}

function formatCandidate(c: any) {
  return {
    id: c._id,
    nome: c.dadosPessoais?.nome || 'Sem nome',
    email: c.dadosPessoais?.email || '',
    telefone: c.dadosPessoais?.telefone || '',
    cpf: c.dadosPessoais?.cpf || '',
    plano: c.dadosComerciais?.planoId?.nome || 'Sem plano ativo'
  };
}

export async function findClientsSafe(nameOrTerm: string): Promise<ClientSearchResult> {
  const rawTerm = (nameOrTerm || '').trim();
  if (!rawTerm) {
    return { status: 'NONE', mensagem: 'Nome ou termo de busca não informado.' };
  }

  // 1. Busca por ID direto
  if (rawTerm.match(/^[0-9a-fA-F]{24}$/)) {
    const directClient = await Client.findById(rawTerm).populate('dadosComerciais.planoId').lean();
    if (directClient) {
      return { status: 'EXACT', client: directClient };
    }
  }

  const normQuery = normalizeText(rawTerm);
  const queryTokens = normQuery.split(/\s+/).filter(t => t.length >= 2);
  const digits = rawTerm.replace(/\D/g, '');

  const allClients = await Client.find().populate('dadosComerciais.planoId').lean();

  const exactMatches: any[] = [];
  const strongMatches: any[] = [];
  const partialMatches: any[] = [];

  for (const c of allClients) {
    const nome = c.dadosPessoais?.nome || '';
    const email = c.dadosPessoais?.email || '';
    const cpf = (c.dadosPessoais?.cpf || '').replace(/\D/g, '');
    const telefone = (c.dadosPessoais?.telefone || '').replace(/\D/g, '');

    const normNome = normalizeText(nome);
    const normEmail = normalizeText(email);

    // 1. Correspondência exata de CPF ou Telefone
    if (digits.length >= 8 && (cpf.includes(digits) || telefone.includes(digits))) {
      exactMatches.push(c);
      continue;
    }

    // 2. Correspondência exata de Nome ou E-mail
    if (normNome === normQuery || normEmail === normQuery) {
      exactMatches.push(c);
      continue;
    }

    // 3. Correspondência forte (início do nome ou contém a frase inteira)
    if (normNome.startsWith(normQuery) || (normQuery.length >= 4 && normNome.includes(normQuery))) {
      strongMatches.push(c);
      continue;
    }

    // 4. Correspondência de tokens (partes do nome)
    const clientTokens = normNome.split(/\s+/);
    let matchedTokens = 0;
    for (const qTok of queryTokens) {
      if (clientTokens.some((ct: string) => ct === qTok || (qTok.length >= 4 && ct.startsWith(qTok)))) {
        matchedTokens++;
      }
    }

    if (matchedTokens > 0) {
      if (matchedTokens >= queryTokens.length) {
        strongMatches.push(c);
      } else {
        partialMatches.push(c);
      }
    }
  }

  if (exactMatches.length === 1) {
    return { status: 'EXACT', client: exactMatches[0] };
  }
  if (exactMatches.length > 1) {
    return {
      status: 'MULTIPLE',
      candidates: exactMatches.map(formatCandidate),
      mensagem: `Encontrei ${exactMatches.length} cadastros exatos para "${rawTerm}". Por favor, confirme qual deles é o correto:`
    };
  }

  // Se houver exatamente 1 match forte e o usuário digitou nome composto
  if (strongMatches.length === 1 && queryTokens.length >= 2) {
    return { status: 'EXACT', client: strongMatches[0] };
  }

  if (strongMatches.length > 0) {
    return {
      status: 'MULTIPLE',
      candidates: strongMatches.map(formatCandidate),
      mensagem: `Encontrei ${strongMatches.length} aluno(s) correspondente(s) a "${rawTerm}". Por favor, confirme qual deles é o correto:`
    };
  }

  if (partialMatches.length > 0) {
    return {
      status: 'MULTIPLE',
      candidates: partialMatches.map(formatCandidate),
      mensagem: `Nenhum cadastro com nome idêntico, mas localizei estes alunos com termos parecidos:`
    };
  }

  return {
    status: 'NONE',
    mensagem: `Nenhum aluno encontrado para "${rawTerm}". Verifique a grafia ou confirme se o cadastro foi concluído.`
  };
}

// Definição das declarações de funções para o Gemini (Function Calling)
export const geminiToolDeclarations = [
  {
    name: 'buscar_aluno',
    description: 'Busca a ficha e dados completos de um aluno pelo nome, CPF ou número de WhatsApp/telefone. Retorna detalhes cadastrais ou lista de opções para desambiguação.',
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
    description: 'Realiza um novo agendamento para um aluno no sistema após validação segura de identidade.',
    parameters: {
      type: 'OBJECT',
      properties: {
        alunoNomeOuId: {
          type: 'STRING',
          description: 'Nome, ID ou CPF do aluno a ser agendado.'
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
          description: 'Nome do serviço (ex: "Treino Monitorado", "Treino Livre", "Fisioterapia", "Avaliação Física").'
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
    name: 'alterar_agendamento',
    description: 'Altera o serviço, horário, data ou profissional de um agendamento existente.',
    parameters: {
      type: 'OBJECT',
      properties: {
        agendamentoId: {
          type: 'STRING',
          description: 'ID do agendamento (opcional se puder ser inferido pelo aluno e data).'
        },
        alunoNomeOuId: {
          type: 'STRING',
          description: 'Nome ou ID do aluno associado ao agendamento.'
        },
        dataOriginal: {
          type: 'STRING',
          description: 'Data original do agendamento no formato YYYY-MM-DD (opcional).'
        },
        novoServico: {
          type: 'STRING',
          description: 'Novo serviço desejado (ex: "Treino Livre", "Treino Monitorado", "Fisioterapia", "Avaliação Física").'
        },
        novaData: {
          type: 'STRING',
          description: 'Nova data no formato YYYY-MM-DD (se for alterar a data).'
        },
        novoHorario: {
          type: 'STRING',
          description: 'Novo horário no formato HH:MM (se for alterar o horário).'
        },
        novoTipo: {
          type: 'STRING',
          description: '"academia" ou "consultorio" (opcional).'
        }
      }
    }
  },
  {
    name: 'cancelar_agendamento',
    description: 'Cancela um agendamento existente no sistema.',
    parameters: {
      type: 'OBJECT',
      properties: {
        agendamentoId: {
          type: 'STRING',
          description: 'ID do agendamento a ser cancelado.'
        },
        alunoNomeOuId: {
          type: 'STRING',
          description: 'Nome ou ID do aluno do agendamento.'
        },
        data: {
          type: 'STRING',
          description: 'Data do agendamento YYYY-MM-DD (opcional).'
        },
        horario: {
          type: 'STRING',
          description: 'Horário do agendamento HH:MM (opcional).'
        }
      }
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

        const searchResult = await findClientsSafe(termo);

        if (searchResult.status === 'NONE') {
          return { mensagem: searchResult.mensagem || `Nenhum aluno encontrado para "${termo}".` };
        }

        if (searchResult.status === 'MULTIPLE') {
          return {
            multiplosResultados: true,
            mensagem: searchResult.mensagem,
            opcoes: searchResult.candidates
          };
        }

        const c = searchResult.client;
        const lastContract = await Contract.findOne({ clientId: c._id }).sort({ dataEmissao: -1 }).lean();
        const lastAppointments = await Appointment.find({ clienteId: c._id }).sort({ data: -1, horario: -1 }).limit(3).lean();
        const pendingPayments = await Payment.find({ clientId: c._id, status: { $in: ['Pendente', 'Atrasado'] } }).lean();

        return {
          total: 1,
          aluno: {
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
          }
        };
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

        const searchResult = await findClientsSafe(alunoNomeOuId);

        if (searchResult.status === 'NONE') {
          return {
            sucesso: false,
            motivo: 'NAO_ENCONTRADO',
            mensagem: searchResult.mensagem || `Nenhum aluno encontrado para "${alunoNomeOuId}". Agendamento não realizado.`
          };
        }

        if (searchResult.status === 'MULTIPLE') {
          return {
            sucesso: false,
            motivo: 'MULTIPLOS_ALUNOS_ENCONTRADOS',
            mensagem: searchResult.mensagem,
            opcoes: searchResult.candidates
          };
        }

        const client = searchResult.client;

        // Auto-detect tipo (academia vs consultorio)
        let appointmentType = tipo;
        if (!appointmentType || appointmentType === 'todos') {
          if (/fisio|quiropraxia|massagem|consulta/i.test(servico)) {
            appointmentType = 'consultorio';
          } else {
            appointmentType = 'academia';
          }
        }

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

      case 'alterar_agendamento': {
        const { agendamentoId, alunoNomeOuId, dataOriginal, novoServico, novaData, novoHorario, novoTipo } = args;

        let appt: any = null;
        if (agendamentoId && agendamentoId.match(/^[0-9a-fA-F]{24}$/)) {
          appt = await Appointment.findById(agendamentoId);
        }

        if (!appt && alunoNomeOuId) {
          const searchResult = await findClientsSafe(alunoNomeOuId);
          if (searchResult.status === 'EXACT' && searchResult.client) {
            const query: any = { clienteId: searchResult.client._id, status: 'agendado' };
            if (dataOriginal) query.data = dataOriginal;
            appt = await Appointment.findOne(query).sort({ data: -1, horario: -1 });
          }
        }

        if (!appt) {
          // Buscar o último agendamento criado no sistema
          appt = await Appointment.findOne({ status: 'agendado' }).sort({ createdAt: -1 });
        }

        if (!appt) {
          return { erro: 'Não foi possível localizar o agendamento correspondente para alteração.' };
        }

        if (novoServico) appt.servico = novoServico;
        if (novaData) appt.data = novaData;
        if (novoHorario) appt.horario = novoHorario;
        if (novoTipo) {
          appt.tipo = novoTipo;
        } else if (novoServico) {
          appt.tipo = /fisio|quiropraxia|massagem/i.test(novoServico) ? 'consultorio' : 'academia';
        }

        await appt.save();

        const populatedAppt: any = await Appointment.findById(appt._id)
          .populate('clienteId', 'dadosPessoais.nome')
          .populate('profissionalId', 'nome')
          .lean();

        return {
          sucesso: true,
          mensagem: 'Agendamento atualizado com sucesso!',
          agendamento: {
            id: appt._id,
            aluno: populatedAppt.clienteId?.dadosPessoais?.nome || 'Aluno',
            servico: appt.servico,
            tipo: appt.tipo,
            data: appt.data,
            horario: appt.horario,
            profissional: populatedAppt.profissionalId?.nome || 'Profissional',
            status: appt.status
          }
        };
      }

      case 'cancelar_agendamento': {
        const { agendamentoId, alunoNomeOuId, data, horario } = args;

        let appt: any = null;
        if (agendamentoId && agendamentoId.match(/^[0-9a-fA-F]{24}$/)) {
          appt = await Appointment.findById(agendamentoId);
        }

        if (!appt && alunoNomeOuId) {
          const searchResult = await findClientsSafe(alunoNomeOuId);
          if (searchResult.status === 'EXACT' && searchResult.client) {
            const query: any = { clienteId: searchResult.client._id, status: 'agendado' };
            if (data) query.data = data;
            if (horario) query.horario = horario;
            appt = await Appointment.findOne(query).sort({ data: -1, horario: -1 });
          }
        }

        if (!appt) {
          appt = await Appointment.findOne({ status: 'agendado' }).sort({ createdAt: -1 });
        }

        if (!appt) {
          return { erro: 'Agendamento não encontrado para cancelamento.' };
        }

        appt.status = 'cancelado';
        await appt.save();

        return {
          sucesso: true,
          mensagem: `Agendamento cancelado com sucesso no sistema.`
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
