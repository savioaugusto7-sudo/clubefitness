import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Trancamento from '@/models/Trancamento';
import Client from '@/models/Client';
import Contract from '@/models/Contract';

import ActivityLog from '@/models/ActivityLog';
import Appointment from '@/models/Appointment';

export const maxDuration = 30;

const toISO = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  if (dateStr.includes('T')) return dateStr.split('T')[0];
  return dateStr;
};

export function computeTrancamentoDates(dataInicio: string, semanasOrDataFim: number | string, dataFimInput?: string) {
  const trancStartISO = toISO(dataInicio);
  const [y, m, d] = trancStartISO.split('-').map(Number);
  const dtInicio = new Date(y, m - 1, d, 12, 0, 0);

  let dataFimISO = '';
  let dataRetornoISO = '';
  let diasTrancados = 0;
  let semanas = 0;

  if (dataFimInput || (typeof semanasOrDataFim === 'string' && semanasOrDataFim.includes('-'))) {
    const rawEnd = toISO(dataFimInput || (semanasOrDataFim as string));
    dataFimISO = rawEnd;
    const [ey, em, ed] = rawEnd.split('-').map(Number);
    const dtFim = new Date(ey, em - 1, ed, 12, 0, 0);

    const diffMs = dtFim.getTime() - dtInicio.getTime();
    diasTrancados = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
    semanas = Math.max(1, Math.round(diasTrancados / 7));

    const dtRetorno = new Date(dtFim);
    dtRetorno.setDate(dtRetorno.getDate() + 1);
    dataRetornoISO = `${dtRetorno.getFullYear()}-${String(dtRetorno.getMonth() + 1).padStart(2, '0')}-${String(dtRetorno.getDate()).padStart(2, '0')}`;
  } else {
    const numSemanas = Math.max(1, Number(semanasOrDataFim) || 1);
    semanas = numSemanas;
    diasTrancados = numSemanas * 7;

    const dtFimTranc = new Date(dtInicio);
    dtFimTranc.setDate(dtFimTranc.getDate() + diasTrancados - 1);
    dataFimISO = `${dtFimTranc.getFullYear()}-${String(dtFimTranc.getMonth() + 1).padStart(2, '0')}-${String(dtFimTranc.getDate()).padStart(2, '0')}`;

    const dtRetorno = new Date(dtInicio);
    dtRetorno.setDate(dtRetorno.getDate() + diasTrancados);
    dataRetornoISO = `${dtRetorno.getFullYear()}-${String(dtRetorno.getMonth() + 1).padStart(2, '0')}-${String(dtRetorno.getDate()).padStart(2, '0')}`;
  }

  return {
    trancStartISO,
    dataFimISO,
    dataRetornoISO,
    diasTrancados,
    semanas
  };
}

export async function syncAppointmentsForTrancamento(trancamento: any) {
  try {
    const clientId = trancamento.clientId?._id || trancamento.clientId;
    if (!clientId || !trancamento.dataInicio) return 0;

    const { trancStartISO, dataFimISO, dataRetornoISO, semanas } = computeTrancamentoDates(
      trancamento.dataInicio,
      trancamento.dataFim || trancamento.semanas,
      trancamento.dataFim
    );

    const updateRes = await Appointment.updateMany(
      {
        clienteId: clientId,
        data: { $gte: trancStartISO, $lte: dataFimISO },
        status: { $ne: 'cancelado' }
      },
      {
        $set: {
          isTrancado: true,
          trancamentoId: trancamento._id,
          trancamentoEncerramento: dataFimISO,
          trancamentoRetorno: dataRetornoISO,
          trancamentoSemanas: Number(trancamento.semanas || semanas),
          consumeCredito: false,
          tipoCredito: 'nenhum'
        }
      }
    );

    return updateRes.modifiedCount || 0;
  } catch (err) {
    console.error('Erro ao sincronizar agendamentos do trancamento:', err);
    return 0;
  }
}

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    // Make sure models are registered
    const _client = Client;
    const _contract = Contract;

    let query = {};
    if (clientId) {
      query = { clientId };
    }

    const trancamentos = await Trancamento.find(query)
      .populate('clientId')
      .populate('contractId')
      .populate('profissionalId')
      .sort({ createdAt: -1 });

    // Auto-sincronizar agendamentos dos trancamentos encontrados
    for (const t of trancamentos) {
      await syncAppointmentsForTrancamento(t);
    }

    return NextResponse.json({ success: true, data: trancamentos });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { clientId, contractId, dataInicio, dataFim, semanas, creditosTrancados: creditosInput, redistribuicao, profissionalId, origem } = body;

    if (!clientId || !contractId || !dataInicio || (!semanas && !dataFim) || !redistribuicao) {
      return NextResponse.json({ success: false, error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    // 1. Get contract
    const contract = await Contract.findById(contractId);
    if (!contract) {
      return NextResponse.json({ success: false, error: 'Contrato não encontrado.' }, { status: 404 });
    }

    // Regra Estrita: Somente plano anual permite trancamento
    const client = await Client.findById(clientId || contract.clientId);
    const com = client?.dadosComerciais || {};
    const isAnual = (com.duracao || '').toLowerCase() === 'anual' ||
      com.recorrenciaMeses === 12 ||
      Number(contract.vigenciaMeses) >= 12 || 
      (contract.planoTipo || '').toLowerCase().includes('anual') || 
      (contract.duracao || '').toLowerCase().includes('anual') ||
      (contract.planoNome || '').toLowerCase().includes('anual');

    if (!isAnual) {
      return NextResponse.json({
        success: false,
        error: 'Somente planos anuais permitem trancamento de plano.'
      }, { status: 400 });
    }

    // 2. Consult weekly frequency (com fallback no cadastro do aluno se ausente no contrato)
    const frequencia = Number(contract.frequencia || com.frequencia || client?.frequencia || 0);
    if (!frequencia || frequencia <= 0) {
      return NextResponse.json({
        success: false,
        error: 'O contrato/aluno não possui uma frequência semanal válida cadastrada.'
      }, { status: 400 });
    }

    // 3. Validação de Vigência e Cálculo de Datas
    const contractEndISO = toISO(contract.dataFim || contract.dataTermino || com.vencimento);
    const trancStartISO = toISO(dataInicio);

    if (!contractEndISO) {
      return NextResponse.json({
        success: false,
        error: 'O contrato não possui data de término definida para validação da vigência.'
      }, { status: 400 });
    }

    const {
      dataFimISO,
      dataRetornoISO,
      diasTrancados,
      semanas: semanasCalc
    } = computeTrancamentoDates(dataInicio, dataFim || semanas, dataFim);

    const startDate = new Date(trancStartISO + 'T00:00:00');
    const endDate = new Date(dataFimISO + 'T23:59:59');
    const contractEndDate = new Date(contractEndISO + 'T23:59:59');

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || isNaN(contractEndDate.getTime())) {
      return NextResponse.json({
        success: false,
        error: 'Data de início, término do trancamento ou vigência do contrato inválida.'
      }, { status: 400 });
    }

    if (startDate > endDate) {
      return NextResponse.json({
        success: false,
        error: `A data de início do trancamento (${trancStartISO}) não pode ser posterior à data de término (${dataFimISO}).`
      }, { status: 400 });
    }

    if (endDate > contractEndDate) {
      return NextResponse.json({
        success: false,
        error: `A data final do trancamento (${dataFimISO}) ultrapassa o término da vigência do contrato (${contractEndISO}).`
      }, { status: 400 });
    }

    // Validar que todas as redistribuições ocorrem estritamente dentro da vigência do contrato
    const mesFimContrato = contractEndISO.slice(0, 7);
    const mesInicioTranc = trancStartISO.slice(0, 7);

    for (const r of redistribuicao) {
      const qtd = Number(r.creditos || 0);
      if (qtd > 0) {
        if (r.mesAno < mesInicioTranc || r.mesAno > mesFimContrato) {
          return NextResponse.json({
            success: false,
            error: `O mês ${r.mesAno} está fora da vigência válida (${mesInicioTranc} até ${mesFimContrato}). Todas as reposições devem ser repostas dentro da vigência do contrato.`
          }, { status: 400 });
        }
      }
    }

    // Cálculo dos créditos trancados: prioriza o valor ajustado/auditado (Opção 3) ou calcula semanas * frequencia
    const finalSemanas = Number(semanas) || semanasCalc;
    let creditosTrancados = finalSemanas * frequencia;
    if (creditosInput !== undefined && creditosInput !== null && !isNaN(Number(creditosInput))) {
      creditosTrancados = Number(creditosInput);
    }

    // 4. Validate redistribution credits sum
    const sumRedistribuicao = redistribuicao.reduce((sum: number, r: any) => sum + Number(r.creditos || 0), 0);
    if (sumRedistribuicao !== creditosTrancados) {
      return NextResponse.json({
        success: false,
        error: `A soma dos créditos redistribuídos (${sumRedistribuicao}) deve ser exatamente igual ao total de créditos a repor (${creditosTrancados}).`
      }, { status: 400 });
    }

    // 5. Create Trancamento
    const trancamento = await Trancamento.create({
      clientId,
      contractId,
      dataInicio: trancStartISO,
      dataFim: dataFimISO,
      dataRetorno: dataRetornoISO,
      diasTrancados,
      semanas: finalSemanas,
      creditosTrancados,
      redistribuicao,
      profissionalId: profissionalId || null,
      origem: origem === 'Computador Coletivo' ? 'Computador Coletivo' : 'Acesso Direto'
    });

    // 5.1 Sincronizar agendamentos existentes do aluno: marcar como trancados (sem consumo de créditos e liberando vaga)
    await syncAppointmentsForTrancamento(trancamento);

    // 6. Auditoria de atividade se informado profissional executor
    if (profissionalId) {
      try {
        const clientName = client?.dadosPessoais?.nome || contract.nomeCliente || 'Aluno';
        await ActivityLog.create({
          profissionalId,
          clienteId: clientId,
          acao: 'Lançou Trancamento de Plano',
          detalhes: `Trancou de ${trancStartISO} a ${dataFimISO} (${diasTrancados} dias, ${creditosTrancados} créditos) para ${clientName}, retorno em ${dataRetornoISO}, redistribuídos até ${mesFimContrato}.`,
          origem: origem === 'Computador Coletivo' ? 'Computador Coletivo' : 'Acesso Direto'
        });
      } catch (logErr) {
        console.error('Falha ao registrar ActivityLog de trancamento:', logErr);
      }
    }

    // 7. Update current month's credits in database if credits are redistributed to current month
    if (client) {
      const currentMonthStr = new Date().toISOString().slice(0, 7); // e.g. "2026-06"
      const currentAlloc = redistribuicao.find((r: any) => r.mesAno === currentMonthStr);
      if (currentAlloc && Number(currentAlloc.creditos) > 0) {
        client.dadosComerciais.creditosTotal = (client.dadosComerciais.creditosTotal || 0) + Number(currentAlloc.creditos);
        client.markModified('dadosComerciais');
        await client.save();
      }
    }

    return NextResponse.json({ success: true, data: trancamento });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
