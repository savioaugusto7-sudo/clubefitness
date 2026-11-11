import dbConnect from './dbConnect';
import Payment from '@/models/Payment';
import Client from '@/models/Client';
import Contract from '@/models/Contract';
import { getBaseUrl, getAsaasHeaders } from './asaas';
import { syncClientPlanValidity } from './commercial';

export interface SyncAsaasResult {
  success: boolean;
  count: number;
  message?: string;
  error?: string;
}

/**
 * Sincroniza automaticamente as cobranças/assinaturas do Asaas com a coleção local `Payment`.
 * Preserva pagamentos manuais existentes e atualiza o status financeiro do contrato e a vigência do aluno.
 */
export async function syncAsaasPaymentsToLocalDb(
  clientId: string,
  customCustomerId?: string,
  targetContractId?: string
): Promise<SyncAsaasResult> {
  try {
    await dbConnect();

    if (!clientId) {
      return { success: false, count: 0, error: 'clientId é obrigatório' };
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return { success: false, count: 0, error: 'Cliente não encontrado' };
    }

    const asaasCustomerId = customCustomerId || client.dadosComerciais?.asaasCustomerId;
    if (!asaasCustomerId) {
      return { success: false, count: 0, error: 'Nenhum asaasCustomerId vinculado ao cliente' };
    }

    // Buscar contrato em foco
    let contract: any = null;
    if (targetContractId) {
      contract = await Contract.findById(targetContractId);
    }
    if (!contract) {
      contract = await Contract.findOne({
        clientId: client._id,
        status: { $in: ['assinado', 'ativo', 'vigente', 'pendente'] }
      }).sort({ versao: -1, createdAt: -1 });
    }

    const baseUrl = getBaseUrl();
    const headers = getAsaasHeaders();

    const paymentsRes = await fetch(`${baseUrl}/payments?customer=${asaasCustomerId}&limit=100`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(12000)
    });

    if (!paymentsRes.ok) {
      const errText = await paymentsRes.text().catch(() => '');
      return {
        success: false,
        count: 0,
        error: `Falha ao consultar cobranças no Asaas: HTTP ${paymentsRes.status} - ${errText}`
      };
    }

    const paymentsData = await paymentsRes.json();
    if (!Array.isArray(paymentsData.data)) {
      return { success: true, count: 0, message: 'Nenhuma cobrança retornada pelo Asaas' };
    }

    // Filtrar cobranças ativas (ignora canceladas/estornadas no Asaas se houver)
    const activeAsaasPayments = paymentsData.data.filter((p: any) => p.status !== 'DELETED');

    // Remover pagamentos Asaas anteriores para evitar duplicações, preservando pagamentos manuais
    await Payment.deleteMany({ clientId: client._id, formaPagamento: 'Asaas' });

    // Contar pagamentos manuais ativos
    const manualPaymentsCount = await Payment.countDocuments({
      clientId: client._id,
      formaPagamento: { $ne: 'Asaas' },
      status: { $ne: 'Cancelado' }
    });

    // Ordenar cronologicamente por vencimento
    activeAsaasPayments.sort((a: any, b: any) => (a.dueDate || '').localeCompare(b.dueDate || ''));

    const totalInstallmentsCount = manualPaymentsCount + activeAsaasPayments.length;

    const paymentRecords = activeAsaasPayments.map((p: any, idx: number) => {
      let status = 'Pendente';
      if (p.status === 'RECEIVED' || p.status === 'CONFIRMED' || p.status === 'RECEIVED_IN_CASH') {
        status = 'Pago';
      } else if (p.status === 'OVERDUE') {
        status = 'Atrasado';
      }

      return {
        clientId: client._id,
        clientNome: client.dadosPessoais?.nome || 'Sem Nome',
        contractId: contract?._id,
        planoNome: p.description || contract?.planoNome || 'Assinatura Asaas',
        valor: p.value || 0,
        vencimento: p.dueDate,
        dataPagamento: (status === 'Pago') ? (p.paymentDate || p.clientPaymentDate || new Date().toISOString().split('T')[0]) : '',
        status,
        formaPagamento: 'Asaas',
        asaasPaymentId: p.id,
        asaasInvoiceUrl: p.invoiceUrl || '',
        parcelaNumero: manualPaymentsCount + idx + 1,
        parcelasTotal: totalInstallmentsCount,
        observacoes: p.subscription ? `Assinatura Asaas (${p.subscription})` : (p.installment ? `Parcelamento Asaas (${p.installment})` : 'Cobrança Asaas')
      };
    });

    if (paymentRecords.length > 0) {
      await Payment.insertMany(paymentRecords);

      // Atualizar asaasBillingStatus no contrato
      if (contract) {
        const hasPago = paymentRecords.some((r: any) => r.status === 'Pago');
        const hasAtrasado = paymentRecords.some((r: any) => r.status === 'Atrasado');

        if (hasPago) {
          contract.asaasBillingStatus = 'pago';
        } else if (hasAtrasado) {
          contract.asaasBillingStatus = 'vencido';
        } else {
          contract.asaasBillingStatus = 'gerada';
        }
        await contract.save();
      }

      // Sincronizar vigência do plano com base nas parcelas
      await syncClientPlanValidity(client._id.toString());
    }

    return {
      success: true,
      count: paymentRecords.length,
      message: `${paymentRecords.length} parcelas sincronizadas com sucesso.`
    };
  } catch (err: any) {
    console.error('[syncAsaasPaymentsToLocalDb] Erro:', err);
    return { success: false, count: 0, error: err.message };
  }
}

