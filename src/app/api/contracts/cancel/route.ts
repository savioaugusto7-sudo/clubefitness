import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import Contract from '@/models/Contract';
import Payment from '@/models/Payment';
import { 
  deleteAsaasPayment, 
  deleteAsaasSubscription, 
  getAsaasSubscription, 
  listAsaasCustomerPayments 
} from '@/utils/asaas';

export const dynamic = 'force-dynamic';

// GET: Consulta e pré-calcula a simulação de rescisão contratual e itens Asaas
export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    const contractId = searchParams.get('contractId');

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId é obrigatório' }, { status: 400 });
    }

    const client: any = await Client.findById(clientId).lean();
    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente não encontrado' }, { status: 404 });
    }

    let contract: any = null;
    if (contractId) {
      contract = await Contract.findById(contractId).lean();
    } else {
      contract = await Contract.findOne({ 
        clientId, 
        status: { $in: ['assinado', 'ativo', 'pendente'] } 
      }).sort({ createdAt: -1 }).lean();
    }

    const com = client.dadosComerciais || {};
    const dp = client.dadosPessoais || {};

    // 1. Pagamentos no Banco Interno
    const internalPayments = await Payment.find({ clientId }).sort({ vencimento: 1 }).lean();
    const paidPayments = internalPayments.filter((p: any) => 
      ['pago', 'recebido', 'liquidado', 'concluido', 'confirmado'].includes(String(p.status).toLowerCase())
    );
    const pendingPayments = internalPayments.filter((p: any) => 
      ['pendente', 'aguardando', 'aberto'].includes(String(p.status).toLowerCase())
    );

    const valorPagoTotal = paidPayments.reduce((sum: number, p: any) => sum + (Number(p.valor) || 0), 0);

    // 2. Valores do Contrato
    const valorTotalContrato = Number(
      contract?.valorTotal || 
      contract?.valorContratado || 
      contract?.valorLiquido || 
      com.valorTotal || 
      com.valorUnitario || 
      0
    );

    // 3. Regra Oficial do Clube: Multa de 10% sobre o Valor Total do Contrato
    const multaPadrao10 = Number((valorTotalContrato * 0.10).toFixed(2));

    const queryDataInicio = searchParams.get('dataInicio');
    const queryDataFim = searchParams.get('dataFim');

    // 4. Vigência de Acesso Oficial do Aluno
    let vigenciaInicio = queryDataInicio || com.dataInicio || contract?.dataInicio || '';
    if (vigenciaInicio && vigenciaInicio.startsWith('6202')) {
      vigenciaInicio = vigenciaInicio.replace(/^6202/, '202');
    }
    if (!vigenciaInicio && com.contrato) {
      const match = String(com.contrato).match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (match) {
        vigenciaInicio = `${match[3]}-${match[2]}-${match[1]}`;
      }
    }

    let vigenciaFim = queryDataFim || com.dataFim || contract?.dataFim || com.vencimento || '';
    if (vigenciaFim && vigenciaFim.startsWith('6202')) {
      vigenciaFim = vigenciaFim.replace(/^6202/, '202');
    }

    // 5. Sugestão Inteligente da Data de Encerramento do Ciclo Pago
    // Projeta o ciclo mensal corrente a partir do dia base oficial da data de início
    let dataSugeridaCiclo = new Date().toISOString().split('T')[0];
    if (paidPayments.length > 0) {
      const lastPaid = paidPayments[paidPayments.length - 1];
      if (lastPaid.vencimento) {
        const lastDue = new Date(lastPaid.vencimento + (lastPaid.vencimento.includes('T') ? '' : 'T12:00:00'));
        lastDue.setMonth(lastDue.getMonth() + 1);
        dataSugeridaCiclo = lastDue.toISOString().split('T')[0];
      }
    } else if (vigenciaInicio) {
      const startD = new Date(vigenciaInicio + (vigenciaInicio.includes('T') ? '' : 'T12:00:00'));
      const now = new Date();
      // Avança de mês em mês a partir da data de início oficial mantendo o dia exato
      while (startD < now) {
        startD.setMonth(startD.getMonth() + 1);
      }
      dataSugeridaCiclo = startD.toISOString().split('T')[0];
    }

    // Se o término do ciclo ultrapassar a dataFim do contrato, limitar à dataFim
    if (vigenciaFim && dataSugeridaCiclo > vigenciaFim) {
      dataSugeridaCiclo = vigenciaFim;
    }

    // 6. Consulta de Itens Ativos no Asaas
    const asaasCustomerId = dp.asaasCustomerId || client.asaasCustomerId;
    const asaasSubscriptionId = contract?.asaasSubscriptionId || com.asaasSubscriptionId;
    let asaasSubscription: any = null;
    let asaasPendingCharges: any[] = [];

    if (asaasSubscriptionId) {
      try {
        const subData = await getAsaasSubscription(asaasSubscriptionId);
        if (subData && subData.id) {
          asaasSubscription = {
            id: subData.id,
            status: subData.status,
            value: subData.value,
            cycle: subData.cycle,
            nextDueDate: subData.nextDueDate,
            description: subData.description || 'Assinatura Recorrente'
          };
        }
      } catch (err: any) {
        console.warn('[Cancel API] Erro ao consultar assinatura Asaas:', err.message);
      }
    }

    if (asaasCustomerId) {
      try {
        const charges = await listAsaasCustomerPayments(asaasCustomerId, 'PENDING');
        if (Array.isArray(charges)) {
          asaasPendingCharges = charges.map((c: any) => ({
            id: c.id,
            value: c.value,
            dueDate: c.dueDate,
            status: c.status,
            billingType: c.billingType,
            description: c.description || 'Cobrança Avulsa/Parcela',
            installmentNumber: c.installmentNumber || null,
            bankSlipUrl: c.bankSlipUrl || null,
            invoiceUrl: c.invoiceUrl || null
          }));
        }
      } catch (err: any) {
        console.warn('[Cancel API] Erro ao listar cobranças Asaas:', err.message);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        client: {
          _id: client._id,
          nome: dp.nome || client.nome,
          cpf: dp.cpf,
          telefone: dp.telefone,
          status: com.status || client.status
        },
        contract: {
          _id: contract?._id || null,
          planoNome: contract?.planoNome || com.planoNome || 'Plano Clube Fitness',
          planoTipo: contract?.planoTipo || com.duracao || 'anual',
          valorTotal: valorTotalContrato,
          valorUnitario: Number(com.valorUnitario || contract?.valorUnitario || 0),
          parcelasTotal: Number(com.parcelas || contract?.parcelas || 1),
          formaPagamento: (com.formaPagamento || contract?.formaPagamento || 'PIX').toUpperCase(),
          vigenciaInicio,
          vigenciaFim,
          criarRecorrenciaMensal: Boolean(com.criarRecorrenciaMensal || contract?.criarRecorrenciaMensal)
        },
        financeiro: {
          valorTotalContrato,
          valorPagoTotal,
          multaPadrao10,
          parcelasPagasCount: paidPayments.length,
          parcelasPendentesCount: pendingPayments.length,
          dataSugeridaCiclo,
          paidPayments: paidPayments.map((p: any) => ({
            _id: p._id,
            numeroParcela: p.numeroParcela,
            valor: p.valor,
            vencimento: p.vencimento,
            dataPagamento: p.dataPagamento || p.updatedAt,
            status: p.status
          })),
          pendingPayments: pendingPayments.map((p: any) => ({
            _id: p._id,
            numeroParcela: p.numeroParcela,
            valor: p.valor,
            vencimento: p.vencimento,
            status: p.status
          }))
        },
        asaas: {
          hasAsaasCustomer: Boolean(asaasCustomerId),
          subscription: asaasSubscription,
          pendingCharges: asaasPendingCharges
        }
      }
    });
  } catch (error: any) {
    console.error('[API Contracts Cancel GET] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Executa a rescisão oficial do contrato com controle seletivo do Asaas
export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const {
      clientId,
      contractId,
      dataEncerramento,
      aplicarMulta,
      multaValor,
      saldoAcerto,
      motivo,
      observacoes,
      cancelarAsaasSubscription,
      cancelarAsaasPayments,
      cancelarInternalPayments = true,
      responsavel = 'Administrador'
    } = body;

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId é obrigatório' }, { status: 400 });
    }

    const client: any = await Client.findById(clientId);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente não encontrado' }, { status: 404 });
    }

    const finalTerminationDate = dataEncerramento || new Date().toISOString().split('T')[0];
    const fineApplied = aplicarMulta ? Number(multaValor || 0) : 0;
    const finalAcerto = Number(saldoAcerto || 0);

    const cancellationLog = {
      tipo: 'rescisao_contratual',
      dataCancelamento: new Date(),
      dataEncerramentoAcesso: finalTerminationDate,
      motivo: motivo || 'Rescisão Contratual',
      aplicarMulta: Boolean(aplicarMulta),
      multaValor: fineApplied,
      saldoAcerto: finalAcerto,
      observacoes: observacoes || '',
      responsavel
    };

    // 1. Atualizar o Contrato
    if (contractId) {
      const contract: any = await Contract.findById(contractId);
      if (contract) {
        contract.status = 'cancelado';
        contract.dataCancelamento = new Date();
        contract.dataEncerramentoAcesso = finalTerminationDate;
        contract.motivoCancelamento = motivo;
        contract.multaAplicada = fineApplied;
        contract.saldoAcerto = finalAcerto;
        contract.observacoesCancelamento = observacoes;
        await contract.save();
      }
    } else {
      await Contract.updateMany(
        { clientId, status: { $in: ['assinado', 'ativo', 'pendente'] } },
        { 
          status: 'cancelado',
          dataCancelamento: new Date(),
          dataEncerramentoAcesso: finalTerminationDate,
          motivoCancelamento: motivo,
          multaAplicada: fineApplied,
          saldoAcerto: finalAcerto
        }
      );
    }

    // 2. Atualizar o Cliente e a Vigência de Acesso
    if (!client.dadosComerciais) client.dadosComerciais = {};
    const com = client.dadosComerciais;

    // Se o encerramento for no futuro, manter cancelado_agendado para liberar o acesso até a data combinada
    const isFuture = new Date(finalTerminationDate + 'T23:59:59') > new Date();
    com.status = isFuture ? 'cancelado_agendado' : 'finalizado';
    com.vencimento = finalTerminationDate; // Ajusta a vigência de acesso para a data de encerramento

    // Adicionar histórico no cadastro do aluno
    if (!client.historicoContratos) client.historicoContratos = [];
    client.historicoContratos.push({
      evento: 'Rescisão / Cancelamento de Contrato',
      data: new Date().toISOString().split('T')[0],
      detalhes: `Contrato cancelado com término de acesso em ${finalTerminationDate}. Multa: R$ ${fineApplied.toFixed(2)}. Acerto: R$ ${finalAcerto.toFixed(2)}. Motivo: ${motivo || 'Acordo'}.`
    });

    await client.save();

    // 3. Cancelar Parcelas Internas no Banco
    if (cancelarInternalPayments) {
      await Payment.updateMany(
        { 
          clientId, 
          status: { $in: ['Pendente', 'pendente', 'Aguardando', 'aguardando'] },
          vencimento: { $gte: finalTerminationDate }
        },
        { status: 'Cancelado' }
      );
    }

    // 4. Cancelar Assinatura no Asaas (Se solicitado)
    let asaasSubCancelled = false;
    const asaasSubscriptionId = com.asaasSubscriptionId || (contractId ? (await Contract.findById(contractId))?.asaasSubscriptionId : null);
    if (cancelarAsaasSubscription && asaasSubscriptionId) {
      try {
        await deleteAsaasSubscription(asaasSubscriptionId);
        asaasSubCancelled = true;
      } catch (err: any) {
        console.warn('[Cancel API POST] Erro ao deletar assinatura Asaas:', err.message);
      }
    }

    // 5. Cancelar Cobranças Pendentes no Asaas (Se solicitado)
    let asaasPaymentsCancelledCount = 0;
    const asaasCustomerId = client.dadosPessoais?.asaasCustomerId || client.asaasCustomerId;
    if (cancelarAsaasPayments && asaasCustomerId) {
      try {
        const charges = await listAsaasCustomerPayments(asaasCustomerId, 'PENDING');
        if (Array.isArray(charges)) {
          for (const charge of charges) {
            // Cancelar se vencimento for maior ou igual à data de encerramento
            if (charge.dueDate >= finalTerminationDate || !isFuture) {
              try {
                await deleteAsaasPayment(charge.id);
                asaasPaymentsCancelledCount++;
              } catch (delErr: any) {
                console.warn(`[Cancel API POST] Erro ao deletar cobrança Asaas ${charge.id}:`, delErr.message);
              }
            }
          }
        }
      } catch (err: any) {
        console.warn('[Cancel API POST] Erro ao listar/deletar cobranças Asaas:', err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Rescisão contratual concluída com sucesso.',
      data: {
        finalTerminationDate,
        multaAplicada: fineApplied,
        saldoAcerto: finalAcerto,
        asaasSubCancelled,
        asaasPaymentsCancelledCount,
        log: cancellationLog
      }
    });
  } catch (error: any) {
    console.error('[API Contracts Cancel POST] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
