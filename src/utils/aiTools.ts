import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import Contract from '@/models/Contract';
import Appointment from '@/models/Appointment';
import Payment from '@/models/Payment';
import Plan from '@/models/Plan';
import Proposal from '@/models/Proposal';
import Professional from '@/models/Professional';

export function getGabiSystemInstruction(currentDateTimeStr?: string): string {
  const now = currentDateTimeStr || new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  return `
Você é a **Gabi**, a consultora e atendente virtual oficial do **Clube Fitness & Fisio**, uma academia e clínica integrada de saúde e alta performance localizada em Belo Horizonte/MG.

Data e hora atual de referência em Belo Horizonte: **${now}**.

---

### 💖 Sua Personalidade e Tom de Voz:
* **Humana, calorosa, empática e prestativa:** Você conversa de forma natural, simpática e acolhedora, como uma excelente recepcionista e consultora de WhatsApp.
* **Linguagem Natural de BH:** Fale em Português do Brasil de forma leve e gentil (ex: *"Oi! Tudo bem com você?"*, *"Combinado!"*, *"Já reservei sua vaga com todo prazer!"*), com emojis elegantes e calorosos (😊, 💪, 🏋️‍♀️, 🗓️, 🌟).
* **Nunca soe robótica:** Evite relatórios mecânicos ou frases prontas de sistema. Se precisar de dados adicionais ou desambiguação, pergunte de forma humana e amigável.
* **Inteligência Contextual e Memória:** Preste atenção no histórico recente da conversa. Quando o usuário disser *"troque esse agendamento para treino livre"*, *"mude o horário para 17:00"* ou *"cancele esse treino"*, entenda que se refere à última pessoa ou vaga tratada. Execute a ação imediatamente sem fazer perguntas burocráticas repetidas.

---

### 🏢 Base de Conhecimento do Clube Fitness & Fisio:
* **Estrutura & Localização:** Academia e clínica integradas em Belo Horizonte/MG, com aparelhos modernos, ambiente climatizado, vestiários completos com duchas e estacionamento conveniado.
* **Horários de Funcionamento:**
  * Segunda a Sexta: **06:00 às 22:00**
  * Sábados: **08:00 às 14:00**
  * Domingos e Feriados: Fechado
* **Modalidades e Setores:**
  * **Setor Academia:** Treino Monitorado individualizado (com acompanhamento contínuo de professores na sala), Treino Livre e Avaliação Física por Bioimpedância.
  * **Setor Consultório:** Fisioterapia Especializada, Quiropraxia, Liberação Miofascial e Massoterapia.
* **Planos Comerciais:** Planos flexíveis (Mensal, Trimestral, Semestral e Anual) com opções de pagamento via PIX, Cartão de Crédito e Boleto.

---

### 🎟️ REGRA CENTRAL DE AGENDAMENTO (GESTÃO POR VAGAS E CAPACIDADE):
* **Não amarramos agendamentos a profissionais específicos:** O Clube Fitness trabalha com **vagas por horário** em cada setor (Academia ou Consultório).
* **Comunicação de Vaga Garantida:** Ao confirmar um agendamento, confirme a **vaga garantida no horário e setor**, e NUNCA diga *"agendado com o professor X"*.
  * Exemplo correto: *"Prontinho! Sua vaga para o Treino Monitorado na terça-feira às 16:00 está confirmada na Academia! 💪 Te esperamos lá!"*

---

### ⚠️ Regras de Negócio e Segurança da Gabi:
1. **Dados Clínicos / Saúde:** 
   - A ausência de lesões informadas no cadastro significa que o aluno é **saudável, apto e sem restrições**.
   - **NUNCA** diga que o cadastro está incompleto por falta de dados clínicos ou que o aluno precisa responder questionário de saúde para liberar o acesso. O cadastro dele está 100% regular!
2. **Financeiro (Boletos em Aberto vs Atrasados):**
   - Parcelas com status **"Pendente"** são boletos **em aberto a vencer** no plano. O aluno está **EM DIA**.
   - Apenas parcelas com status **"Atrasado"** configuram inadimplência vencida.
   - Se o aluno possuir boletos a vencer e nenhum atrasado, confirme com alegria que a situação dele está **em dia**!
3. **NUNCA substitua um aluno por aproximação:** Se o usuário solicitar para *"Maria"* ou *"Lucas"* e houver múltiplos cadastros, a ferramenta retornará \`MULTIPLOS_ALUNOS_ENCONTRADOS\`. Você **NÃO DEVE** agendar de imediato; liste os alunos encontrados com carinho e peça para confirmar qual é a pessoa correta.
4. **Se a ferramenta retornar \`NAO_ENCONTRADO\`:** Informe cordialmente que não localizou o cadastro e pergunte se a pessoa gostaria de passar o CPF ou fazer uma proposta nova.
5. **Somente comemore e confirme a vaga** quando a ferramenta de sistema retornar \`sucesso: true\`.
`;
}

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

// Definição das declarações de funções para a Gabi (Function Calling)
export const geminiToolDeclarations = [
  {
    name: 'buscar_aluno',
    description: 'Busca a ficha e dados de um aluno por nome, CPF ou WhatsApp para verificar plano, saldo de créditos, lesões ou pendências financeiras.',
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
    description: 'Consulta as vagas e horários da grade para um dia específico na Academia (Treinos/Avaliação) ou no Consultório (Fisioterapia/Quiropraxia).',
    parameters: {
      type: 'OBJECT',
      properties: {
        data: {
          type: 'STRING',
          description: 'Data no formato YYYY-MM-DD (ex: 2026-08-18). Se não informado, assume hoje.'
        },
        tipo: {
          type: 'STRING',
          description: 'Setor da grade: "academia", "consultorio" ou "todos".'
        }
      }
    }
  },
  {
    name: 'criar_agendamento',
    description: 'Reserva uma vaga de atendimento/treino para um aluno em um horário e setor específico.',
    parameters: {
      type: 'OBJECT',
      properties: {
        alunoNomeOuId: {
          type: 'STRING',
          description: 'Nome, ID ou CPF do aluno a ser agendado.'
        },
        data: {
          type: 'STRING',
          description: 'Data no formato YYYY-MM-DD (ex: 2026-08-18).'
        },
        horario: {
          type: 'STRING',
          description: 'Horário no formato HH:MM (ex: 09:00, 16:00).'
        },
        servico: {
          type: 'STRING',
          description: 'Serviço a ser realizado (ex: "Treino Monitorado", "Treino Livre", "Fisioterapia", "Avaliação Física").'
        },
        tipo: {
          type: 'STRING',
          description: 'Setor: "academia" ou "consultorio" (opcional, deduzido automaticamente).'
        }
      },
      required: ['alunoNomeOuId', 'data', 'horario', 'servico']
    }
  },
  {
    name: 'alterar_agendamento',
    description: 'Altera o serviço (ex: para Treino Livre), data ou horário de uma vaga/agendamento existente.',
    parameters: {
      type: 'OBJECT',
      properties: {
        agendamentoId: {
          type: 'STRING',
          description: 'ID do agendamento (opcional se puder ser inferido pelo contexto ou aluno).'
        },
        alunoNomeOuId: {
          type: 'STRING',
          description: 'Nome ou ID do aluno do agendamento.'
        },
        dataOriginal: {
          type: 'STRING',
          description: 'Data original do agendamento YYYY-MM-DD (opcional).'
        },
        novoServico: {
          type: 'STRING',
          description: 'Novo serviço (ex: "Treino Livre", "Treino Monitorado", "Fisioterapia").'
        },
        novaData: {
          type: 'STRING',
          description: 'Nova data YYYY-MM-DD (se for trocar a data).'
        },
        novoHorario: {
          type: 'STRING',
          description: 'Novo horário HH:MM (se for trocar o horário).'
        },
        novoTipo: {
          type: 'STRING',
          description: 'Novo setor: "academia" ou "consultorio" (opcional).'
        }
      }
    }
  },
  {
    name: 'cancelar_agendamento',
    description: 'Cancela e libera a vaga de um agendamento existente no sistema.',
    parameters: {
      type: 'OBJECT',
      properties: {
        agendamentoId: {
          type: 'STRING',
          description: 'ID do agendamento a cancelar.'
        },
        alunoNomeOuId: {
          type: 'STRING',
          description: 'Nome ou ID do aluno associado.'
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
    description: 'Consulta faturamento do mês, previsão, taxa de adimplência, inadimplentes e contratos prestes a vencer.',
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
    description: 'Cria uma nova proposta comercial e gera o link de vendas (/vendas/[id]) para matrícula do aluno/lead.',
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
          description: 'Valor acordado em Reais (ex: 299.90).'
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
    description: 'Lista alunos com mais de 14 dias sem frequência ou com risco de evasão.',
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
    description: 'Lista os planos comerciais ativos com preços, validades e características.',
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
        const lastAppointments = await Appointment.find({ clienteId: c._id, status: { $ne: 'cancelado' } }).sort({ data: -1, horario: -1 }).limit(3).lean();
        
        const boletosAtrasados = await Payment.find({ clientId: c._id, status: 'Atrasado' }).lean();
        const boletosEmAberto = await Payment.find({ clientId: c._id, status: 'Pendente' }).lean();

        return {
          total: 1,
          aluno: {
            id: c._id,
            nome: c.dadosPessoais?.nome,
            telefone: c.dadosPessoais?.telefone,
            email: c.dadosPessoais?.email,
            cpf: c.dadosPessoais?.cpf,
            statusCadastro: 'Completo e Regular',
            planoAtual: c.dadosComerciais?.planoId?.nome || lastContract?.planoNome || 'Sem plano ativo',
            valorPlano: c.dadosComerciais?.valorAcordado || lastContract?.valorLiquido || 0,
            saldoCreditos: {
              academia: c.creditosTotal || 0,
              massagem: c.creditosMassagemPorPlano || 0,
              emergencia: c.creditosEmergenciaPorPlano || 0
            },
            statusFinanceiro: {
              situacao: boletosAtrasados.length > 0 ? 'Inadimplente (possui boletos vencidos)' : 'Em dia',
              inadimplente: boletosAtrasados.length > 0,
              quantidadeAtrasados: boletosAtrasados.length,
              quantidadeEmAbertoAVencer: boletosEmAberto.length,
              boletosAVencer: boletosEmAberto.map((p: any) => ({ vencimento: p.vencimento, valor: p.valor })),
              boletosVencidos: boletosAtrasados.map((p: any) => ({ vencimento: p.vencimento, valor: p.valor }))
            },
            dadosClinicos: {
              lesoes: c.dadosClinicos?.lesoes || 'Nenhuma (aluno saudável e apto)',
              restricoes: c.dadosClinicos?.restricoes || 'Nenhuma (sem restrições informadas)',
              medicamentos: c.dadosClinicos?.medicamentos || 'Nenhum informado',
              statusSaude: 'Cadastro de saúde 100% regular (apto para treinar)'
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

        const filter: any = { data: dataBusca, status: { $ne: 'cancelado' } };
        if (tipoBusca !== 'todos' && (tipoBusca === 'academia' || tipoBusca === 'consultorio')) {
          filter.tipo = tipoBusca;
        }

        const appointments = await Appointment.find(filter)
          .populate('clienteId', 'dadosPessoais.nome dadosPessoais.telefone')
          .sort({ horario: 1 })
          .lean();

        const formatados = appointments.map((a: any) => ({
          horario: a.horario,
          servico: a.servico,
          setor: a.tipo === 'consultorio' ? 'Consultório' : 'Academia',
          status: a.status,
          aluno: a.clienteId?.dadosPessoais?.nome || 'Aluno'
        }));

        return {
          data: dataBusca,
          totalVagasOcupadas: formatados.length,
          vagasOcupadasNaGrade: formatados
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

        // Profissional padrão geral do sistema para manter integridade do Schema
        let professional = await Professional.findOne();
        if (!professional) {
          professional = { _id: client._id, nome: 'Equipe Clube Fitness' } as any;
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
          mensagem: `Vaga reservada com sucesso no sistema!`,
          reserva: {
            id: newAppt._id,
            aluno: client.dadosPessoais?.nome,
            servico,
            setor: appointmentType === 'consultorio' ? 'Consultório' : 'Academia',
            data,
            horario,
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
          .lean();

        return {
          sucesso: true,
          mensagem: 'Vaga atualizada com sucesso no sistema!',
          reserva: {
            id: appt._id,
            aluno: populatedAppt.clienteId?.dadosPessoais?.nome || 'Aluno',
            servico: appt.servico,
            setor: appt.tipo === 'consultorio' ? 'Consultório' : 'Academia',
            data: appt.data,
            horario: appt.horario,
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
          mensagem: `Vaga cancelada e liberada com sucesso na grade.`
        };
      }

      case 'obter_resumo_financeiro': {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const currentMonthPrefix = args.mesAno || `${year}-${month}`;

        const payments = await Payment.find({ vencimento: { $regex: `^${currentMonthPrefix}` } }).lean();
        const totalRecebido = payments.filter((p: any) => p.status === 'Pago').reduce((acc: number, p: any) => acc + (p.valor || 0), 0);
        const totalPendente = payments.filter((p: any) => p.status === 'Pendente').reduce((acc: number, p: any) => acc + (p.valor || 0), 0);
        const totalAtrasado = payments.filter((p: any) => p.status === 'Atrasado').reduce((acc: number, p: any) => acc + (p.valor || 0), 0);

        const inadimplentes = await Payment.find({ status: 'Atrasado' })
          .populate('clientId', 'dadosPessoais.nome dadosPessoais.telefone')
          .limit(10)
          .lean();

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
          mensagem: `Proposta comercial gerada com sucesso para ${nomeLeadOuAluno} no plano ${plan?.nome || planoNome}.`,
          linkWhatsApp: `https://wa.me/${(telefone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${nomeLeadOuAluno}! Segue seu link de matrícula no Clube Fitness: ${linkVendas}`)}`
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
          const lastAppt = await Appointment.findOne({ clienteId: c._id, status: { $ne: 'cancelado' } })
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
