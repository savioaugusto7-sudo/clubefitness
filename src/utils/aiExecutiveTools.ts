import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import Contract from '@/models/Contract';
import Appointment from '@/models/Appointment';
import Payment from '@/models/Payment';
import Plan from '@/models/Plan';
import Proposal from '@/models/Proposal';
import Professional from '@/models/Professional';
import mongoose from 'mongoose';

export function getExecutiveSystemInstruction(currentDateTimeStr?: string): string {
  const now = currentDateTimeStr || new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  return `
Você é a **Gabi Intelligence**, a Consultora Sênior de BI, Auditoria de Dados e Inteligência Operacional exclusiva do Gestor Geral **Sávio Augusto Oliveira** no **Clube Fitness & Fisio**.

Data e hora atual de referência: **${now}**.

---

### 🎯 SEU PAPEL E OBJETIVO
Você é o braço direito analítico do Sávio. Sua missão é fornecer **diagnósticos cirúrgicos, cruzamento de dados profundos entre coleções, detecção proativa de inconsistências e insights estratégicos** para tomada de decisão gerencial.

---

### 📐 DIRETRIZES FUNDAMENTAIS DE ANÁLISE:
1. **RIGOR TÉCNICO & DADOS REAIS:**
   - Baseie sempre suas respostas nas ferramentas de consulta analítica. Nunca invente nomes, valores ou datas.
   - Quando questionada sobre valores, liste o valor unitário, total e forma de pagamento real.
2. **REGRA DE OURO SOBRE A AGENDA DO DR. ALBERT (OCIOSIDADE REAL VS CHECK-IN OPERACIONAL):**
   - **Apenas cancelamentos frequentes e explícitos configuram ociosidade real.**
   - O Dr. Albert rotineiramente não registra o check-in de todos os seus atendimentos individuais no aplicativo. Portanto, agendamentos passados em aberto ("não respondidos") **NÃO** significam que o aluno faltou ou abandonou.
   - Alunos com zero cancelamentos ou apenas cancelamentos pontuais devem ter seus horários fixos protegidos.
3. **DETECÇÃO DE INCONSISTÊNCIAS:**
   - Alunos com status comercial 'ativo' mas sem lançamentos na coleção financeira/pagamentos representam risco de inadimplência oculta ou falha de sincronização.
   - Contratos com data de vencimento no passado que permanecem com status 'ativo' devem ser apontados para encerramento ou renovação.
   - Alunos ativos que nunca agendaram nenhuma aula na vida devem ser sinalizados para onboarding urgente.

---

### 📊 FORMATO DE RESPOSTA VISUAL E ESTRUTURADA:
Para que o painel do Sávio renderize **tabelas dinâmicas, gráficos interativos e cards de KPIs**, estruture sua resposta sempre com:
1. **Resumo Executivo / Diagnóstico:** Texto claro, objetivo e contextualizado.
2. **Tabelas Completas em Markdown:** Com cabeçalhos claros, nomes, planos, valores, datas e status.
3. **Alertas & Ações Recomendadas:** Destaque o que o gestor deve fazer imediatamente usando alertas (\`> [!WARNING]\`, \`> [!IMPORTANT]\`, \`> [!TIP]\`).
4. **Bloco de Dados Visuais (Opcional, no final):**
   Quando a análise contiver dados que merecem gráficos ou tabelas exportáveis, você pode incluir um bloco json com a tag \`\`\`json:visual\`\`\` contendo:
   \`\`\`json:visual
   {
     "kpis": [
       { "label": "Alunos em Risco", "value": 7, "type": "danger" },
       { "label": "Vencimentos (30d)", "value": "R$ 14.800", "type": "warning" }
     ],
     "chart": {
       "type": "doughnut",
       "title": "Distribuição por Profissional",
       "labels": ["Dr. Albert", "Guilherme Graciano", "Academia Geral"],
       "data": [45, 52, 24]
     }
   }
   \`\`\`
`;
}

// Declarações das Ferramentas Analíticas para Function Calling no Gemini
export const executiveToolDeclarations = [
  {
    name: 'consultar_vencimentos_proximos',
    description: 'Consulta e lista os contratos e planos de alunos que vencem nos próximos N dias (ex: 7, 15, 30 ou 60 dias), informando plano, valor, dias restantes, contato e se já há proposta de renovação.',
    parameters: {
      type: 'OBJECT',
      properties: {
        diasAFrente: {
          type: 'NUMBER',
          description: 'Número de dias à frente para filtrar vencimentos (padrão 30 dias).'
        },
        apenasAtivos: {
          type: 'BOOLEAN',
          description: 'Se true, filtra apenas clientes com status comercial ativo (padrão true).'
        }
      }
    }
  },
  {
    name: 'auditar_inconsistencias_cadastrais_financeiras',
    description: 'Cruza a base de clientes com contratos e registros financeiros para apontar alunos ativos sem financeiro, planos vencidos como ativos, alunos sem contrato ou cadastros com crédito divergente.',
    parameters: {
      type: 'OBJECT',
      properties: {
        filtroTipo: {
          type: 'STRING',
          description: 'Tipo de inconsistência: "sem_financeiro", "vencido_como_ativo", "nunca_agendou", "creditos_divergentes" ou "todos".'
        }
      }
    }
  },
  {
    name: 'auditar_frequencia_e_agendas',
    description: 'Audita a retenção da base ativa e o mapa de ocupação das agendas: Dr. Albert Nunes, Guilherme Graciano ou Academia Geral, separando cancelamentos reais de pendências de check-in.',
    parameters: {
      type: 'OBJECT',
      properties: {
        diasAusenciaMinimo: {
          type: 'NUMBER',
          description: 'Filtrar alunos ausentes há pelo menos N dias (ex: 30 para críticos, 15 para alto risco, 7 para alerta, 0 para todos).'
        },
        profissionalFiltro: {
          type: 'STRING',
          description: 'Filtrar por profissional: "albert", "guilherme", "geral" ou "todos".'
        }
      }
    }
  },
  {
    name: 'obter_resumo_kpis_base',
    description: 'Obtém um panorama geral dos indicadores-chave da academia: total de alunos ativos, distribuição por nível de risco de churn, previsão de vencimentos e total de vagas bloqueadas na grade.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  }
];

// Funções Executoras das Ferramentas
export async function executeExecutiveTool(name: string, args: any): Promise<any> {
  await dbConnect();
  const db = mongoose.connection.db;

  try {
    switch (name) {
      case 'consultar_vencimentos_proximos':
        return await toolConsultarVencimentos(db, args);
      case 'auditar_inconsistencias_cadastrais_financeiras':
        return await toolAuditarInconsistencias(db, args);
      case 'auditar_frequencia_e_agendas':
        return await toolAuditarFrequenciaAgendas(db, args);
      case 'obter_resumo_kpis_base':
        return await toolObterResumoKpis(db);
      default:
        return { erro: `Ferramenta analítica "${name}" não reconhecida.` };
    }
  } catch (error: any) {
    console.error(`[aiExecutiveTools] Erro ao executar ${name}:`, error);
    return { erro: `Falha na execução de ${name}: ${error.message}` };
  }
}

// 1. Tool: Consultar Próximos Vencimentos
async function toolConsultarVencimentos(db: any, args: any) {
  const diasAFrente = Number(args.diasAFrente) || 30;
  const apenasAtivos = args.apenasAtivos !== false;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + diasAFrente);
  const maxDateStr = futureDate.toISOString().split('T')[0];

  const query: any = {};
  if (apenasAtivos) {
    query['dadosComerciais.status'] = 'ativo';
  }

  const clients = await db.collection('clients').find(query).toArray();
  const plans = await db.collection('plans').find({}).toArray();
  const planMap: Record<string, string> = {};
  plans.forEach((p: any) => { planMap[String(p._id)] = p.nome || p.name; });

  const expiringList: any[] = [];
  let valorTotalPrevisto = 0;

  for (const c of clients) {
    const venc = c.dadosComerciais?.vencimento || c.dadosComerciais?.dataFim;
    if (!venc) continue;

    // Se o vencimento estiver entre hoje e a data máxima futura
    if (venc >= todayStr && venc <= maxDateStr) {
      const dtVenc = new Date(venc + 'T12:00:00Z');
      const dtHoje = new Date(todayStr + 'T12:00:00Z');
      const diasRestantes = Math.max(0, Math.round((dtVenc.getTime() - dtHoje.getTime()) / (1000 * 60 * 60 * 24)));

      const pId = String(c.dadosComerciais?.planoId?._id || c.dadosComerciais?.planoId || '');
      const planoNome = planMap[pId] || c.dadosComerciais?.planoNome || 'Personalizado';
      const valor = Number(c.dadosComerciais?.valorTotal || c.dadosComerciais?.valorUnitario || 0);
      valorTotalPrevisto += valor;

      // Verificar se já possui proposta de renovação
      const proposal = await db.collection('proposals').findOne({
        $or: [{ clientId: c._id }, { clientId: String(c._id) }],
        status: { $in: ['pendente', 'aguardando_assinatura', 'enviada'] }
      });

      expiringList.push({
        clienteId: String(c._id),
        nome: c.dadosPessoais?.nome || 'Sem Nome',
        telefone: c.dadosPessoais?.telefone || '',
        plano: planoNome,
        duracao: c.dadosComerciais?.duracao || 'mensal',
        vencimento: venc,
        diasRestantes: diasRestantes,
        valor: valor,
        formaPagamento: c.dadosComerciais?.formaPagamento || 'Boleto/Pix',
        temPropostaRenovacao: Boolean(proposal)
      });
    }
  }

  // Ordenar por data de vencimento mais próxima
  expiringList.sort((a, b) => a.vencimento.localeCompare(b.vencimento));

  return {
    periodoAuditadoDias: diasAFrente,
    dataInicio: todayStr,
    dataFim: maxDateStr,
    totalVencimentos: expiringList.length,
    valorTotalPrevisto: valorTotalPrevisto,
    alunos: expiringList
  };
}

// 2. Tool: Auditar Inconsistências
async function toolAuditarInconsistencias(db: any, args: any) {
  const filtroTipo = args.filtroTipo || 'todos';
  const todayStr = new Date().toISOString().split('T')[0];

  const activeClients = await db.collection('clients').find({
    'dadosComerciais.status': 'ativo'
  }).toArray();

  const semFinanceiro: any[] = [];
  const vencidosComoAtivos: any[] = [];
  const nuncaAgendaram: any[] = [];

  for (const c of activeClients) {
    const nome = c.dadosPessoais?.nome || 'Sem Nome';
    const venc = c.dadosComerciais?.vencimento || c.dadosComerciais?.dataFim;

    // 1. Vencidos mas marcados como ativos
    if (venc && venc < todayStr) {
      vencidosComoAtivos.push({
        id: String(c._id),
        nome,
        vencimento: venc,
        plano: c.dadosComerciais?.planoNome || c.dadosComerciais?.duracao,
        telefone: c.dadosPessoais?.telefone || ''
      });
    }

    // 2. Alunos ativos sem registros na coleção de pagamentos/financials
    const hasPayment = await db.collection('payments').findOne({
      $or: [{ clientId: c._id }, { clientId: String(c._id) }, { userId: c.userId }]
    });
    const hasFinancial = await db.collection('financials').findOne({
      $or: [{ clientId: c._id }, { clienteId: c._id }, { clienteId: String(c._id) }]
    });

    if (!hasPayment && !hasFinancial) {
      semFinanceiro.push({
        id: String(c._id),
        nome,
        formaPagamento: c.dadosComerciais?.formaPagamento || 'Não informada',
        valorTotal: c.dadosComerciais?.valorTotal || 0,
        telefone: c.dadosPessoais?.telefone || '',
        dataInicio: c.dadosComerciais?.dataInicio || ''
      });
    }

    // 3. Alunos ativos que nunca tiveram agendamento
    const appCount = await db.collection('appointments').countDocuments({
      $or: [{ clienteId: c._id }, { clienteId: String(c._id) }]
    });
    if (appCount === 0) {
      nuncaAgendaram.push({
        id: String(c._id),
        nome,
        plano: c.dadosComerciais?.planoNome || c.dadosComerciais?.duracao,
        dataInicio: c.dadosComerciais?.dataInicio || (c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : '—'),
        telefone: c.dadosPessoais?.telefone || ''
      });
    }
  }

  const resultado: any = {
    totalAtivosAuditados: activeClients.length,
    inconsistencias: {}
  };

  if (filtroTipo === 'sem_financeiro' || filtroTipo === 'todos') {
    resultado.inconsistencias.ativosSemFinanceiro = {
      qtd: semFinanceiro.length,
      descricao: 'Alunos com status ativo que não possuem lançamentos financeiros ou pagamentos vinculados',
      lista: semFinanceiro
    };
  }

  if (filtroTipo === 'vencido_como_ativo' || filtroTipo === 'todos') {
    resultado.inconsistencias.planosVencidosComoAtivos = {
      qtd: vencidosComoAtivos.length,
      descricao: 'Alunos cuja data de término do plano já passou mas permanecem com status ativo',
      lista: vencidosComoAtivos
    };
  }

  if (filtroTipo === 'nunca_agendou' || filtroTipo === 'todos') {
    resultado.inconsistencias.ativosQueNuncaAgendaram = {
      qtd: nuncaAgendaram.length,
      descricao: 'Alunos ativos que nunca registraram nenhum agendamento na história (onboarding pendente)',
      lista: nuncaAgendaram
    };
  }

  return resultado;
}

// 3. Tool: Auditar Frequência e Agendas
async function toolAuditarFrequenciaAgendas(db: any, args: any) {
  const diasAusenciaMin = Number(args.diasAusenciaMinimo) || 0;
  const profFiltro = (args.profissionalFiltro || 'todos').toLowerCase();
  const todayStr = '2026-10-16';

  const professionals = await db.collection('professionals').find({}).toArray();
  const profMap: Record<string, string> = {};
  professionals.forEach((p: any) => { profMap[String(p._id)] = p.nome || p.name; });

  const albertIds: string[] = [];
  const guilhermeIds: string[] = [];
  for (const [id, name] of Object.entries(profMap)) {
    if (/albert/i.test(name)) albertIds.push(id);
    if (/guilherme/i.test(name)) guilhermeIds.push(id);
  }

  const activeClients = await db.collection('clients').find({
    'dadosComerciais.status': 'ativo'
  }).toArray();

  const auditList: any[] = [];

  for (const c of activeClients) {
    const nome = c.dadosPessoais?.nome || 'Sem Nome';
    const cIdObj = c._id;
    const cIdStr = String(c._id);

    // Fixed schedules
    const fixed = await db.collection('fixedschedules').find({
      $or: [{ clienteId: cIdObj }, { clienteId: cIdStr }],
      active: { $ne: false }
    }).toArray();

    // Appointments
    const apps = await db.collection('appointments').find({
      $or: [{ clienteId: cIdObj }, { clienteId: cIdStr }]
    }).sort({ data: -1 }).toArray();

    let presencas = 0;
    let faltas = 0;
    let cancelados = 0;
    let pendentesPassados = 0;
    let futurasReservas = 0;
    let ultimaPresenca: any = null;

    let countAlbert = 0;
    let countGuilherme = 0;
    let countGeral = 0;

    for (const a of apps) {
      const pIdStr = String(a.profissionalId);
      const isAlbert = a.tipo === 'dr_albert' || albertIds.includes(pIdStr) || /albert/i.test(profMap[pIdStr] || '');
      const isGuilherme = guilhermeIds.includes(pIdStr) || /guilherme/i.test(profMap[pIdStr] || '');

      if (a.status === 'presenca') {
        presencas++;
        if (!ultimaPresenca) ultimaPresenca = a.data;
      } else if (a.status === 'falta') {
        faltas++;
      } else if (a.status === 'cancelado') {
        cancelados++;
      } else if (a.status === 'agendado') {
        if (a.data >= todayStr) futurasReservas++;
        else pendentesPassados++;
      }

      if (isAlbert) countAlbert++;
      else if (isGuilherme) countGuilherme++;
      else countGeral++;
    }

    let diasSemVir = null;
    if (ultimaPresenca) {
      const dtUlt = new Date(ultimaPresenca + 'T12:00:00Z');
      const dtHoje = new Date(todayStr + 'T12:00:00Z');
      diasSemVir = Math.max(0, Math.round((dtHoje.getTime() - dtUlt.getTime()) / (1000 * 60 * 60 * 24)));
    }

    let agendaCategoria = 'Geral';
    const hasAlbertFixo = fixed.some(f => albertIds.includes(String(f.profissionalId)) || f.tipo === 'dr_albert');
    const hasGuilhermeFixo = fixed.some(f => guilhermeIds.includes(String(f.profissionalId)));

    if (hasAlbertFixo || countAlbert > (countGuilherme + countGeral)) agendaCategoria = 'Dr. Albert';
    else if (hasGuilhermeFixo || countGuilherme > (countAlbert + countGeral)) agendaCategoria = 'Guilherme';
    else if (countAlbert > 0 && countGuilherme > 0) agendaCategoria = 'Misto';

    // Aplicar filtros
    if (diasAusenciaMin > 0 && (diasSemVir === null || diasSemVir < diasAusenciaMin)) continue;
    if (profFiltro === 'albert' && !agendaCategoria.includes('Albert')) continue;
    if (profFiltro === 'guilherme' && !agendaCategoria.includes('Guilherme')) continue;

    auditList.push({
      id: String(c._id),
      nome,
      plano: c.dadosComerciais?.planoNome || c.dadosComerciais?.duracao,
      vencimento: c.dadosComerciais?.vencimento || '—',
      agendaPrincipal: agendaCategoria,
      temHorarioFixo: fixed.length > 0,
      diasSemVir: diasSemVir !== null ? diasSemVir : 'Nunca treinou',
      ultimaPresenca: ultimaPresenca || 'Nenhuma',
      presencas,
      faltas,
      cancelados,
      pendentesPassadosSemCheckin: pendentesPassados,
      futurasReservas
    });
  }

  // Ordenar por dias sem vir decrescente
  auditList.sort((a, b) => {
    if (typeof a.diasSemVir === 'string') return 1;
    if (typeof b.diasSemVir === 'string') return -1;
    return b.diasSemVir - a.diasSemVir;
  });

  return {
    totalEncontrados: auditList.length,
    filtroDias: diasAusenciaMin,
    filtroProfissional: profFiltro,
    alunos: auditList
  };
}

// 4. Tool: Resumo de KPIs
async function toolObterResumoKpis(db: any) {
  const activeCount = await db.collection('clients').countDocuments({ 'dadosComerciais.status': 'ativo' });
  const fixedCount = await db.collection('fixedschedules').countDocuments({ active: { $ne: false } });

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const next30 = new Date();
  next30.setDate(next30.getDate() + 30);
  const next30Str = next30.toISOString().split('T')[0];

  const vencendo30d = await db.collection('clients').countDocuments({
    'dadosComerciais.status': 'ativo',
    'dadosComerciais.vencimento': { $gte: todayStr, $lte: next30Str }
  });

  return {
    totalAlunosAtivos: activeCount,
    totalHorariosFixosAtivos: fixedCount,
    vencimentosProximos30d: vencendo30d,
    dataReferencia: todayStr
  };
}
