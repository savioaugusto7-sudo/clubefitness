import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import Plan from '@/models/Plan';
import Professional from '@/models/Professional';
import Proposal from '@/models/Proposal';
import RenewalProposal from '@/models/RenewalProposal';
import ActivityLog from '@/models/ActivityLog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

export async function GET() {
  try {
    await dbConnect();

    // 1. Buscar clientes recentes cadastrados
    let clients: any[] = [];
    try {
      clients = await Client.find({})
        .populate('dadosComerciais.planoId')
        .populate('profissionalId')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
    } catch (e) {
      console.warn('Client fetch warning in link-movements:', e);
      try {
        clients = await Client.find({}).sort({ createdAt: -1 }).limit(100).lean();
      } catch (_) {}
    }

    // 2. Buscar propostas / vendas geradas por link
    let propostas: any[] = [];
    try {
      if (Proposal) {
        propostas = await Proposal.find({})
          .populate('clientId')
          .sort({ createdAt: -1 })
          .limit(100)
          .lean();
      }
    } catch (e) {
      console.warn('Proposal fetch warning:', e);
    }

    // 3. Buscar renovações
    let renovacoes: any[] = [];
    try {
      if (RenewalProposal) {
        renovacoes = await RenewalProposal.find({})
          .populate('clientId')
          .sort({ createdAt: -1 })
          .limit(100)
          .lean();
      }
    } catch (e) {
      console.warn('RenewalProposal fetch warning:', e);
    }

    // 4. Buscar logs de atividades de links
    let activityLogs: any[] = [];
    try {
      if (ActivityLog) {
        activityLogs = await ActivityLog.find({
          $or: [
            { origem: { $regex: /link|onboarding|cadastro|dynamus|venda|clicksign|asaas/i } },
            { acao: { $regex: /link|onboarding|cadastro|dynamus|venda|clicksign|asaas|pagamento|assinou/i } }
          ]
        })
          .populate('clienteId')
          .sort({ createdAt: -1 })
          .limit(100)
          .lean();
      }
    } catch (e) {
      console.warn('ActivityLog fetch warning:', e);
    }

    const movements: any[] = [];

    // Formatar clientes como eventos de cadastro / onboarding
    clients.forEach((c: any) => {
      const isDynamus = c.dadosComerciais?.planoId?.nome?.toLowerCase().includes('dynamus') ||
                        (c.dadosComerciais?.saldoCreditosDynamus && c.dadosComerciais.saldoCreditosDynamus > 0) ||
                        c.origemCadastro?.toLowerCase().includes('dynamus');

      const infoList: { label: string; value: string }[] = [];

      if (c.dadosComerciais?.planoId?.nome) {
        infoList.push({ label: 'Plano / Modalidade', value: c.dadosComerciais.planoId.nome });
      }
      if (c.dadosComerciais?.valorMensalidade) {
        infoList.push({ label: 'Valor', value: `R$ ${Number(c.dadosComerciais.valorMensalidade).toFixed(2)}` });
      }
      if (c.dadosComerciais?.saldoCreditosDynamus) {
        infoList.push({ label: 'Sessões Dynamus', value: `${c.dadosComerciais.saldoCreditosDynamus} sessões` });
      }
      if (c.dadosComerciais?.formaPagamentoPreferida) {
        infoList.push({ label: 'Forma de Pagamento', value: c.dadosComerciais.formaPagamentoPreferida });
      }
      if (c.dadosClinicos?.objetivoPrincipal) {
        infoList.push({ label: 'Objetivo Principal', value: c.dadosClinicos.objetivoPrincipal });
      }
      if (c.dadosPessoais?.cpf) {
        infoList.push({ label: 'CPF', value: c.dadosPessoais.cpf });
      }
      if (c.dadosPessoais?.email) {
        infoList.push({ label: 'E-mail', value: c.dadosPessoais.email });
      }
      if (c.dadosClinicos?.lesoesHistorico) {
        infoList.push({ label: 'Histórico de Lesão', value: c.dadosClinicos.lesoesHistorico });
      }

      movements.push({
        _id: `cli_${c._id}`,
        createdAt: c.createdAt || new Date().toISOString(),
        tipo: isDynamus ? 'dynamus' : 'cadastro',
        tipoLabel: isDynamus ? 'Cadastro Dynamus' : 'Cadastro Geral (Onboarding)',
        badgeColor: isDynamus ? '#f59e0b' : '#10b981',
        linkNome: isDynamus ? 'Link Dynamus' : 'Link de Cadastro / Onboarding',
        linkUrl: isDynamus ? '/cadastro-dynamus' : '/cadastro',
        cliente: {
          _id: c._id,
          nome: c.dadosPessoais?.nome || 'Aluno sem nome',
          telefone: c.dadosPessoais?.telefone || '',
          email: c.dadosPessoais?.email || '',
          cpf: c.dadosPessoais?.cpf || ''
        },
        infoList,
        raw: c
      });
    });

    // Formatar propostas pagas ou enviadas via link
    propostas.forEach((p: any) => {
      const cli = p.clientId || {};
      const infoList: { label: string; value: string }[] = [];

      if (p.planoNome) {
        infoList.push({ label: 'Proposta / Plano', value: p.planoNome });
      }
      if (p.valorFinalRecalculado || p.valorAcordado) {
        infoList.push({ label: 'Valor da Proposta', value: `R$ ${Number(p.valorFinalRecalculado || p.valorAcordado || 0).toFixed(2)}` });
      }
      if (p.status) {
        infoList.push({ label: 'Status do Pagamento', value: p.status.toUpperCase() });
      }
      if (p.formaPagamentoEscolhida) {
        infoList.push({ label: 'Método Escolhido', value: p.formaPagamentoEscolhida.toUpperCase() });
      }
      if (p.dadosPreenchidos?.telefone) {
        infoList.push({ label: 'WhatsApp Preenchido', value: p.dadosPreenchidos.telefone });
      }
      if (p.dadosPreenchidos?.endereco) {
        infoList.push({ label: 'Endereço', value: `${p.dadosPreenchidos.endereco} ${p.dadosPreenchidos.numero || ''}` });
      }

      movements.push({
        _id: `prop_${p._id}`,
        createdAt: p.updatedAt || p.createdAt || new Date().toISOString(),
        tipo: 'venda',
        tipoLabel: 'Link de Venda / Pagamento',
        badgeColor: '#3b82f6',
        linkNome: 'Link de Venda Online',
        linkUrl: `/vendas/${p._id}`,
        cliente: {
          _id: cli._id || p.clientId,
          nome: cli.dadosPessoais?.nome || 'Cliente',
          telefone: p.dadosPreenchidos?.telefone || cli.dadosPessoais?.telefone || '',
          email: cli.dadosPessoais?.email || '',
          cpf: cli.dadosPessoais?.cpf || ''
        },
        infoList,
        raw: p
      });
    });

    // Formatar renovações
    renovacoes.forEach((r: any) => {
      const cli = r.clientId || {};
      const infoList: { label: string; value: string }[] = [];

      if (r.planoNome) {
        infoList.push({ label: 'Plano Renovado', value: r.planoNome });
      }
      if (r.valorAcordado) {
        infoList.push({ label: 'Valor Renovação', value: `R$ ${Number(r.valorAcordado).toFixed(2)}` });
      }
      if (r.status) {
        infoList.push({ label: 'Status Renovação', value: r.status.toUpperCase() });
      }

      movements.push({
        _id: `ren_${r._id}`,
        createdAt: r.updatedAt || r.createdAt || new Date().toISOString(),
        tipo: 'renovacao',
        tipoLabel: 'Renovação de Plano',
        badgeColor: '#10b981',
        linkNome: 'Link de Renovação',
        linkUrl: `/renovacao/${r._id}`,
        cliente: {
          _id: cli._id || r.clientId,
          nome: cli.dadosPessoais?.nome || 'Aluno',
          telefone: cli.dadosPessoais?.telefone || '',
          email: cli.dadosPessoais?.email || '',
          cpf: cli.dadosPessoais?.cpf || ''
        },
        infoList,
        raw: r
      });
    });

    // Formatar logs de atividade específicos de Clicksign ou links
    activityLogs.forEach((log: any) => {
      const cli = log.clienteId || {};
      const isClicksign = log.origem?.toLowerCase().includes('clicksign') || log.acao?.toLowerCase().includes('clicksign') || log.acao?.toLowerCase().includes('assinou');
      
      const infoList: { label: string; value: string }[] = [];
      infoList.push({ label: 'Ação Realizada', value: log.acao });
      if (log.detalhes) {
        infoList.push({ label: 'Detalhes', value: log.detalhes });
      }
      if (log.origem) {
        infoList.push({ label: 'Origem', value: log.origem });
      }

      movements.push({
        _id: `log_${log._id}`,
        createdAt: log.createdAt || new Date().toISOString(),
        tipo: isClicksign ? 'clicksign' : 'outro',
        tipoLabel: isClicksign ? 'Contrato Clicksign' : 'Movimento de Link',
        badgeColor: isClicksign ? '#8b5cf6' : '#64748b',
        linkNome: isClicksign ? 'Assinatura Digital (Clicksign)' : log.origem,
        linkUrl: isClicksign ? 'https://app.clicksign.com' : '#',
        cliente: {
          _id: cli._id || log.clienteId,
          nome: cli.dadosPessoais?.nome || 'Aluno',
          telefone: cli.dadosPessoais?.telefone || '',
          email: cli.dadosPessoais?.email || '',
          cpf: cli.dadosPessoais?.cpf || ''
        },
        infoList,
        raw: log
      });
    });

    // Ordenar todos os movimentos do mais recente para o mais antigo
    movements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      data: movements,
      total: movements.length
    });
  } catch (error: any) {
    console.error('Error fetching link movements:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
