import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import Plan from '@/models/Plan';
import Contract from '@/models/Contract';
import { checkSessionPermission } from '@/utils/authHelper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatPlanName(rawName?: string, rawTipo?: string): string {
  if (!rawName) return 'Clube Fitness - Monitorado';
  const lower = rawName.toLowerCase();
  if (lower.includes('monitorado')) return 'Clube Fitness - Monitorado';
  if (lower.includes('personalizado') || lower.includes('tratamento')) return 'Tratamento Personalizado';
  if (lower.includes('protocolo')) return 'Protocolo Individualizado';
  if (lower.includes('consulta')) return 'Consulta';
  if (lower.includes('captação') || lower.includes('captacao')) return 'Captação';
  return rawName.trim();
}

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { user } = await checkSessionPermission(['admin', 'professional', 'profissional'], undefined, request);

    // Register models for safety
    const _plan = Plan;
    const _contract = Contract;

    // Filtro base: excluir deletados e excluir estritamente alunos do Convênio Dynamus
    const query: any = {
      'dadosComerciais.status': { $ne: 'excluido_anonimizado' },
      'dadosComerciais.isConvenioDynamus': { $ne: true }
    };

    const clients = await Client.find(query)
      .select('dadosPessoais.nome dadosComerciais relatorioMensal createdAt')
      .populate({ path: 'dadosComerciais.planoId', select: 'nome tipo preco' })
      .sort({ 'dadosPessoais.nome': 1 })
      .lean()
      .maxTimeMS(10000);

    // Buscar contratos mais recentes dos clientes para garantir a fonte oficial do plano
    const clientIds = clients.map((c: any) => c._id);
    let latestContractMap = new Map<string, any>();
    if (clientIds.length > 0) {
      const contracts = await Contract.find({ clientId: { $in: clientIds } })
        .select('clientId planoNome planoTipo status createdAt versao')
        .sort({ versao: -1, createdAt: -1 })
        .lean()
        .maxTimeMS(6000);

      for (const ct of contracts) {
        const cid = ct.clientId?.toString();
        if (!cid) continue;
        if (!latestContractMap.has(cid)) {
          latestContractMap.set(cid, ct);
        } else {
          const existing = latestContractMap.get(cid);
          const ctIsActive = ct.status === 'assinado' || ct.status === 'ativo';
          const exIsActive = existing.status === 'assinado' || existing.status === 'ativo';
          if (ctIsActive && !exIsActive) {
            latestContractMap.set(cid, ct);
          }
        }
      }
    }

    // Mapear dados e aplicar filtros de exclusão do Dynamus
    const formattedClients = clients
      .map((c: any) => {
        const cid = c._id.toString();
        const latestCt = latestContractMap.get(cid);

        // Identificação do nome oficial do plano
        const rawPlanName = latestCt?.planoNome || c.dadosComerciais?.planoId?.nome || c.dadosComerciais?.planoNome || '';
        
        // Se por ventura o plano contiver Dynamus, descartar
        if (rawPlanName.toLowerCase().includes('dynamus')) {
          return null;
        }

        const planoNome = formatPlanName(rawPlanName, latestCt?.planoTipo);
        const statusPlano = (latestCt?.status || c.dadosComerciais?.status || 'ativo').toLowerCase();
        const habilitado = Boolean(c.relatorioMensal?.habilitado);

        return {
          id: cid,
          nome: c.dadosPessoais?.nome || 'Aluno Sem Nome',
          planoNome,
          statusPlano,
          habilitado,
          atualizadoEm: c.relatorioMensal?.atualizadoEm || null,
          atualizadoPor: c.relatorioMensal?.atualizadoPor || ''
        };
      })
      .filter(Boolean); // Remove nulos

    const total = formattedClients.length;
    const totalSinalizados = formattedClients.filter((c: any) => c.habilitado).length;
    const totalNaoSinalizados = total - totalSinalizados;

    return NextResponse.json({
      success: true,
      clients: formattedClients,
      metrics: {
        total,
        totalSinalizados,
        totalNaoSinalizados
      }
    });
  } catch (error: any) {
    console.error('[relatorio-mensal GET] Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao carregar lista de relatórios mensais.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await dbConnect();
    const { user } = await checkSessionPermission(['admin', 'professional', 'profissional'], undefined, request);

    const body = await request.json();
    const { clientId, habilitado } = body;

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId obrigatório.' }, { status: 400 });
    }

    const updated = await Client.findByIdAndUpdate(
      clientId,
      {
        $set: {
          'relatorioMensal.habilitado': Boolean(habilitado),
          'relatorioMensal.atualizadoEm': new Date(),
          'relatorioMensal.atualizadoPor': user.name || user.email || 'Admin'
        }
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Cliente não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      clientId,
      habilitado: Boolean(habilitado),
      atualizadoEm: updated.relatorioMensal?.atualizadoEm
    });
  } catch (error: any) {
    console.error('[relatorio-mensal PATCH] Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao atualizar sinalização.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const { user } = await checkSessionPermission(['admin', 'professional', 'profissional'], undefined, request);

    const body = await request.json();
    const { clientIds, habilitado } = body;

    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Lista clientIds vazia ou inválida.' }, { status: 400 });
    }

    const objectIds = clientIds
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));

    const result = await Client.updateMany(
      { _id: { $in: objectIds } },
      {
        $set: {
          'relatorioMensal.habilitado': Boolean(habilitado),
          'relatorioMensal.atualizadoEm': new Date(),
          'relatorioMensal.atualizadoPor': user.name || user.email || 'Admin'
        }
      }
    );

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
      habilitado: Boolean(habilitado)
    });
  } catch (error: any) {
    console.error('[relatorio-mensal PUT] Error:', error.message);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao atualizar clientes em massa.' },
      { status: 500 }
    );
  }
}
