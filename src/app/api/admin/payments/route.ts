import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Payment from '@/models/Payment';
import Client from '@/models/Client';
import Contract from '@/models/Contract';
import { syncClientPlanValidity } from '@/utils/commercial';

export const maxDuration = 60;

const getAsaasHeaders = () => {
  const token = process.env.ASAAS_API_KEY;
  if (!token) {
    throw new Error('ASAAS_API_KEY não configurada nas variáveis de ambiente.');
  }
  return {
    'access_token': token,
    'Content-Type': 'application/json'
  };
};

const getAsaasBaseUrl = () => {
  return (process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3').replace(/\/$/, '');
};

function formatFormaPagamento(fp?: string): string {
  if (!fp) return 'Pix Manual';
  const lower = fp.toLowerCase();
  if (lower === 'dinheiro') return 'Dinheiro';
  if (lower === 'pix') return 'Pix Manual';
  if (lower === 'cartao' || lower === 'cartão') return 'Cartão Manual';
  if (lower === 'boleto') return 'Boleto';
  if (lower === 'asaas') return 'Asaas';
  return fp;
}

const ensureLocalPaymentsForClients = async () => {
  try {
    const clients = await Client.find({
      $or: [
        { 'dadosComerciais.valorUnitario': { $gt: 0 } },
        { 'dadosComerciais.planoId': { $ne: null } }
      ]
    }).populate('dadosComerciais.planoId');

    const todayStr = new Date().toISOString().split('T')[0];

    for (const client of clients) {
      const existingPayments = await Payment.find({ clientId: client._id });
      if (existingPayments.length === 0) {
        const com = client.dadosComerciais || {};
        const planName = (com.planoId as any)?.nome || 'Plano Personalizado';
        const rawFirstDue = com.dataPrimeiroVencimento || com.dataInicio || todayStr;
        const firstDueStr = rawFirstDue.includes('T') ? rawFirstDue.split('T')[0] : rawFirstDue;

        const isRecorrente = Boolean(com.criarRecorrenciaMensal);
        const totalInstallments = isRecorrente ? Math.max(1, Number(com.recorrenciaMeses) || 12) : Math.max(1, Number(com.parcelas) || 1);
        const valorUnitario = Number(com.valorUnitario) || 0;
        const duracaoQtd = Number(com.duracaoQtd) || 1;
        const bruto = valorUnitario * duracaoQtd;
        const desc = Number(com.descontoValor) || 0;
        let liquido = bruto;
        if (com.descontoTipo === 'percentual') {
          liquido = bruto * (1 - desc / 100);
        } else {
          liquido = Math.max(0, bruto - desc);
        }
        const valorParcela = isRecorrente ? liquido : (totalInstallments > 0 ? liquido / totalInstallments : liquido);

        const recordsToInsert = [];
        for (let i = 0; i < totalInstallments; i++) {
          const due = new Date(firstDueStr + 'T00:00:00');
          due.setMonth(due.getMonth() + i);
          const dueIso = due.toISOString().split('T')[0];

          const isZeroVal = parseFloat(valorParcela.toFixed(2)) === 0;
          recordsToInsert.push({
            clientId: client._id,
            clientNome: client.dadosPessoais?.nome || 'Sem Nome',
            planoNome: planName,
            valor: parseFloat(valorParcela.toFixed(2)),
            vencimento: dueIso,
            dataPagamento: isZeroVal ? todayStr : '',
            status: isZeroVal ? 'Pago' : 'Pendente',
            formaPagamento: formatFormaPagamento(com.formaPagamento),
            parcelaNumero: i + 1,
            parcelasTotal: totalInstallments
          });
        }

        if (recordsToInsert.length > 0) {
          await Payment.insertMany(recordsToInsert);
        }
      }
      
      // Sync client plan validity based on payments
      await syncClientPlanValidity(client._id);
    }
  } catch (err) {
    console.error('Error ensuring local payments for clients:', err);
  }
};

// 1. GET: Query all client payments (mensalidades)
export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status'); // 'Pago', 'Pendente', 'Atrasado'
    const searchQuery = searchParams.get('search') || '';

    let query: any = {};

    // Apply status filter
    if (statusFilter) {
      if (statusFilter === 'Atrasado') {
        const todayStr = new Date().toISOString().split('T')[0];
        query.status = 'Pendente';
        query.vencimento = { $lt: todayStr };
      } else {
        query.status = statusFilter;
      }
    }

    // Apply name search
    if (searchQuery) {
      query.clientNome = { $regex: searchQuery, $options: 'i' };
    }

    // Fetch and sort by due date ascending
    const payments = await Payment.find(query).sort({ vencimento: 1 });

    return NextResponse.json({ success: true, data: payments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. POST: Manual Payment or Asaas Link
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { action } = body;

    // CANCEL CLIENT RECURRENCE
    if (action === 'cancel_recurrence') {
      const { clientId } = body;
      if (!clientId) {
        return NextResponse.json({ success: false, error: 'clientId é obrigatório' }, { status: 400 });
      }
      const client = await Client.findById(clientId);
      if (!client) {
        return NextResponse.json({ success: false, error: 'Cliente não encontrado' }, { status: 404 });
      }
      if (client.dadosComerciais) {
        client.dadosComerciais.criarRecorrenciaMensal = false;
        client.dadosComerciais.recorrenciaVigencia = false;
        await client.save();
      }
      return NextResponse.json({ success: true, message: 'Recorrência finalizada com sucesso!' });
    }

    // GENERATE LOCAL PAYMENTS FOR CLIENT
    if (action === 'generate_local_payments') {
      const { clientId } = body;
      if (!clientId) {
        return NextResponse.json({ success: false, error: 'clientId é obrigatório' }, { status: 400 });
      }
      const client = await Client.findById(clientId).populate('dadosComerciais.planoId');
      if (!client) {
        return NextResponse.json({ success: false, error: 'Cliente não encontrado' }, { status: 404 });
      }
      // Delete existing non-Asaas payments
      await Payment.deleteMany({ clientId: client._id, formaPagamento: { $ne: 'Asaas' } });

      const com = client.dadosComerciais || {};
      const planName = (com.planoId as any)?.nome || 'Plano Personalizado';
      const todayStr = new Date().toISOString().split('T')[0];
      const rawFirstDue = com.dataPrimeiroVencimento || com.dataInicio || todayStr;
      const firstDueStr = rawFirstDue.includes('T') ? rawFirstDue.split('T')[0] : rawFirstDue;

      const isRecorrente = Boolean(com.criarRecorrenciaMensal);
      const totalInstallments = isRecorrente ? Math.max(1, Number(com.recorrenciaMeses) || 12) : Math.max(1, Number(com.parcelas) || 1);
      const valorUnitario = Number(com.valorUnitario) || 0;
      const duracaoQtd = Number(com.duracaoQtd) || 1;
      const bruto = valorUnitario * duracaoQtd;
      const desc = Number(com.descontoValor) || 0;
      let liquido = bruto;
      if (com.descontoTipo === 'percentual') {
        liquido = bruto * (1 - desc / 100);
      } else {
        liquido = Math.max(0, bruto - desc);
      }
      const valorParcela = isRecorrente ? liquido : (totalInstallments > 0 ? liquido / totalInstallments : liquido);

      const recordsToInsert = [];
      for (let i = 0; i < totalInstallments; i++) {
        const due = new Date(firstDueStr + 'T00:00:00');
        due.setMonth(due.getMonth() + i);
        const dueIso = due.toISOString().split('T')[0];

        const isZeroVal = parseFloat(valorParcela.toFixed(2)) === 0;
        recordsToInsert.push({
          clientId: client._id,
          clientNome: client.dadosPessoais?.nome || 'Sem Nome',
          planoNome: planName,
          valor: parseFloat(valorParcela.toFixed(2)),
          vencimento: dueIso,
          dataPagamento: isZeroVal ? todayStr : '',
          status: isZeroVal ? 'Pago' : 'Pendente',
          formaPagamento: formatFormaPagamento(com.formaPagamento),
          parcelaNumero: i + 1,
          parcelasTotal: totalInstallments
        });
      }

      if (recordsToInsert.length > 0) {
        await Payment.insertMany(recordsToInsert);
      }

      return NextResponse.json({ success: true, count: recordsToInsert.length });
    }

    // A. CONFIRM MANUAL PAYMENT
    if (action === 'confirm_manual') {
      const { paymentId, formaPagamento, dataPagamento, observacoes } = body;
      if (!paymentId || !formaPagamento) {
        return NextResponse.json({ success: false, error: 'paymentId e formaPagamento são obrigatórios' }, { status: 400 });
      }

      const payment = await Payment.findById(paymentId);
      if (!payment) {
        return NextResponse.json({ success: false, error: 'Mensalidade não encontrada' }, { status: 404 });
      }

      payment.status = 'Pago';
      payment.formaPagamento = formaPagamento;
      payment.dataPagamento = dataPagamento || new Date().toISOString().split('T')[0];
      payment.observacoes = observacoes || '';
      await payment.save();

      // Optionally update client payment status to active
      const client = await Client.findById(payment.clientId);
      if (client && client.dadosComerciais) {
        client.dadosComerciais.status = 'ativo';
        await client.save();
        await syncClientPlanValidity(client._id);
      }

      return NextResponse.json({ success: true, data: payment });
    }

    // A1. UPDATE PAYMENT DUE DATE
    if (action === 'update_due_date') {
      const { paymentId, newDueDate } = body;
      if (!paymentId || !newDueDate) {
        return NextResponse.json({ success: false, error: 'paymentId e newDueDate são obrigatórios' }, { status: 400 });
      }

      const payment = await Payment.findById(paymentId);
      if (!payment) {
        return NextResponse.json({ success: false, error: 'Mensalidade não encontrada' }, { status: 404 });
      }

      payment.vencimento = newDueDate;
      await payment.save();

      return NextResponse.json({ success: true, data: payment });
    }

    // A2. CONFIRM ALL CARD INSTALLMENTS (SET PAYMENT DATE TO DUE DATE)
    if (action === 'confirm_all_card') {
      const { clientId, formaPagamento } = body;
      if (!clientId) {
        return NextResponse.json({ success: false, error: 'clientId é obrigatório' }, { status: 400 });
      }

      const payments = await Payment.find({
        clientId,
        status: { $ne: 'Pago' }
      });

      if (payments.length === 0) {
        return NextResponse.json({ success: true, count: 0, message: 'Nenhuma parcela pendente encontrada.' });
      }

      const fp = formaPagamento || 'Cartão Manual';
      for (const p of payments) {
        p.status = 'Pago';
        p.formaPagamento = fp;
        // Atribuir a cada parcela a sua respectiva data de vencimento
        p.dataPagamento = p.vencimento || new Date().toISOString().split('T')[0];
        await p.save();
      }

      // Atualizar status do contrato do cliente e sincronizar vigência
      const client = await Client.findById(clientId);
      if (client && client.dadosComerciais) {
        client.dadosComerciais.status = 'ativo';
        await client.save();
        await syncClientPlanValidity(client._id);
      }

      return NextResponse.json({ success: true, count: payments.length });
    }

    // B. SEARCH & LINK CLIENT TO ASAAS CUSTOMER
    if (action === 'asaas_search_link') {
      const { clientId, customCustomerId } = body;
      if (!clientId) {
        return NextResponse.json({ success: false, error: 'clientId é obrigatório' }, { status: 400 });
      }

      const client = await Client.findById(clientId);
      if (!client) {
        return NextResponse.json({ success: false, error: 'Cliente não encontrado' }, { status: 404 });
      }

      let asaasId = customCustomerId || '';

      // If no custom customer ID provided, try searching Asaas in cascade:
      // 1. Clean CPF (04340508659)
      // 2. Formatted CPF (043.405.086-59)
      // 3. Email
      // 4. Name
      if (!asaasId) {
        const rawCpf = client.dadosPessoais?.cpf || '';
        const cpfClean = rawCpf.replace(/\D/g, '');
        const email = client.dadosPessoais?.email || '';
        const nome = client.dadosPessoais?.nome || '';
        const baseUrl = getAsaasBaseUrl();
        const headers = getAsaasHeaders();

        const searchQueries: string[] = [];
        if (cpfClean) searchQueries.push(`${baseUrl}/customers?cpfCnpj=${cpfClean}`);
        if (rawCpf && rawCpf !== cpfClean) searchQueries.push(`${baseUrl}/customers?cpfCnpj=${encodeURIComponent(rawCpf)}`);
        if (email) searchQueries.push(`${baseUrl}/customers?email=${encodeURIComponent(email)}`);
        if (nome) searchQueries.push(`${baseUrl}/customers?name=${encodeURIComponent(nome)}`);

        for (const queryUrl of searchQueries) {
          try {
            const res = await fetch(queryUrl, { method: 'GET', headers });
            if (res.ok) {
              const searchData = await res.json();
              if (Array.isArray(searchData.data) && searchData.data.length > 0) {
                asaasId = searchData.data[0].id;
                break;
              }
            }
          } catch (err) {
            console.error('Erro na consulta em cascata Asaas:', err);
          }
        }
      }

      if (!asaasId) {
        return NextResponse.json({
          success: false,
          error: 'Nenhum cliente cadastrado no Asaas foi localizado com os dados de CPF, E-mail ou Nome. Para emitir cobranças ou cadastrar este aluno no Asaas, acesse a aba Asaas.'
        }, { status: 400 });
      }

      // Link client in db
      client.dadosComerciais.asaasCustomerId = asaasId;
      await client.save();

      // Retrieve all active/open payments from Asaas for this customer and populate our database
      const baseUrl = getAsaasBaseUrl();
      const headers = getAsaasHeaders();
      const paymentsRes = await fetch(`${baseUrl}/payments?customer=${asaasId}&limit=100`, { method: 'GET', headers });

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        if (Array.isArray(paymentsData.data)) {
          // Remove all existing payments for this client to avoid duplicates
          await Payment.deleteMany({ clientId: client._id });

          // Sort payments by dueDate ascending so parcel numbers are chronological
          paymentsData.data.sort((a: any, b: any) => a.dueDate.localeCompare(b.dueDate));

          const paymentRecords = paymentsData.data.map((p: any, idx: number) => {
            let status = 'Pendente';
            if (p.status === 'RECEIVED' || p.status === 'CONFIRMED' || p.status === 'RECEIVED_IN_CASH') {
              status = 'Pago';
            } else if (p.status === 'OVERDUE') {
              status = 'Atrasado';
            }

            return {
              clientId: client._id,
              clientNome: client.dadosPessoais?.nome || 'Sem Nome',
              planoNome: p.description || 'Assinatura Asaas',
              valor: p.value || 0,
              vencimento: p.dueDate,
              dataPagamento: p.paymentDate || '',
              status,
              formaPagamento: 'Asaas',
              asaasPaymentId: p.id,
              asaasInvoiceUrl: p.invoiceUrl || '',
              parcelaNumero: idx + 1,
              parcelasTotal: paymentsData.data.length,
            };
          });

          if (paymentRecords.length > 0) {
            await Payment.insertMany(paymentRecords);

            // Update asaasBillingStatus on contract if contract exists
            const contract = await Contract.findOne({ clientId: client._id });
            if (contract) {
              const hasPago = paymentRecords.some((r: any) => r.status === 'Pago');
              if (hasPago) {
                contract.asaasBillingStatus = 'pago';
                await contract.save();
              }
            }
          }
        }
      }

      return NextResponse.json({ success: true, asaasCustomerId: asaasId });
    }

    // B2. SYNC SINGLE CLIENT WITH ASAAS
    if (action === 'sync_client_asaas') {
      const { clientId } = body;
      if (!clientId) {
        return NextResponse.json({ success: false, error: 'clientId é obrigatório' }, { status: 400 });
      }
      const client = await Client.findById(clientId);
      if (!client) {
        return NextResponse.json({ success: false, error: 'Cliente não encontrado' }, { status: 404 });
      }
      const baseUrl = getAsaasBaseUrl();
      const headers = getAsaasHeaders();
      const ok = await syncSingleCustomerAsaas(client, baseUrl, headers);
      return NextResponse.json({ success: ok });
    }

    // C. SYNC ALL CLIENTS WITH ASAAS (BATCH PARALLEL CONCURRENCY)
    if (action === 'sync_all_asaas') {
      const clients = await Client.find({ 'dadosComerciais.asaasCustomerId': { $ne: '' } });
      if (clients.length === 0) {
        return NextResponse.json({ success: true, message: 'Nenhum cliente com ID Asaas cadastrado.' });
      }

      const baseUrl = getAsaasBaseUrl();
      const headers = getAsaasHeaders();

      // Process in parallel batches of 5 to avoid 504 timeouts while respecting Asaas rate limits
      const BATCH_SIZE = 5;
      let syncedCount = 0;

      for (let i = 0; i < clients.length; i += BATCH_SIZE) {
        const batch = clients.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(c => syncSingleCustomerAsaas(c, baseUrl, headers))
        );
        syncedCount += results.filter(r => r.status === 'fulfilled' && r.value === true).length;
      }

      return NextResponse.json({ success: true, syncedCount, total: clients.length });
    }

    return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Helper: Sincronização ultra-rápida e resiliente por cliente
async function syncSingleCustomerAsaas(client: any, baseUrl: string, headers: any): Promise<boolean> {
  const asaasId = client?.dadosComerciais?.asaasCustomerId;
  if (!asaasId) return false;

  try {
    const paymentsRes = await fetch(`${baseUrl}/payments?customer=${asaasId}&limit=100`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(5000)
    });

    if (!paymentsRes.ok) return false;
    const paymentsData = await paymentsRes.json();
    if (!Array.isArray(paymentsData.data)) return false;

    // Delete existing local payments for this client to avoid duplicates
    await Payment.deleteMany({ clientId: client._id });

    // Sort payments by dueDate ascending so parcel numbers are chronological
    paymentsData.data.sort((a: any, b: any) => (a.dueDate || '').localeCompare(b.dueDate || ''));

    const paymentRecords = paymentsData.data.map((p: any, idx: number) => {
      let status = 'Pendente';
      if (p.status === 'RECEIVED' || p.status === 'CONFIRMED' || p.status === 'RECEIVED_IN_CASH') {
        status = 'Pago';
      } else if (p.status === 'OVERDUE') {
        status = 'Atrasado';
      }

      return {
        clientId: client._id,
        clientNome: client.dadosPessoais?.nome || 'Sem Nome',
        planoNome: p.description || 'Assinatura Asaas',
        valor: p.value || 0,
        vencimento: p.dueDate,
        dataPagamento: p.paymentDate || '',
        status,
        formaPagamento: 'Asaas',
        asaasPaymentId: p.id,
        asaasInvoiceUrl: p.invoiceUrl || '',
        parcelaNumero: idx + 1,
        parcelasTotal: paymentsData.data.length,
      };
    });

    if (paymentRecords.length > 0) {
      await Payment.insertMany(paymentRecords);

      // Auto-activate contract if any payment is Pago
      const pendingContract = await Contract.findOne({ clientId: client._id, status: 'pendente' });
      if (pendingContract && paymentRecords.some((r: any) => r.status === 'Pago')) {
        pendingContract.status = 'assinado';
        pendingContract.asaasBillingStatus = 'pago';
        await pendingContract.save();
      }

      // Lógica de Recorrência Inteligente: estende a vigência do aluno a cada parcela paga
      const pagas = paymentRecords.filter((r: any) => r.status === 'Pago');
      const pendentes = paymentRecords.filter((r: any) => r.status === 'Pendente');
      const isRecorrente = Boolean(client.dadosComerciais?.criarRecorrenciaMensal || client.dadosComerciais?.recorrenciaVigencia);

      if (isRecorrente && pagas.length > 0) {
        let novaDataVigencia = '';
        if (pendentes.length > 0) {
          novaDataVigencia = pendentes[0].vencimento;
        } else {
          const ultimoPago = pagas[pagas.length - 1];
          const d = new Date(ultimoPago.vencimento + 'T12:00:00');
          d.setMonth(d.getMonth() + 1);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          novaDataVigencia = `${y}-${m}-${day}`;
        }
        if (novaDataVigencia) {
          client.dadosComerciais.vencimento = novaDataVigencia;
          client.dadosComerciais.status = 'ativo';
          await client.save();
        }
      } else if (pagas.length > 0) {
        client.dadosComerciais.status = 'ativo';
        await client.save();
      }
    }
    return true;
  } catch (err: any) {
    console.warn(`[syncSingleCustomerAsaas] Warning for ${client?.dadosPessoais?.nome}:`, err?.message);
    return false;
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');
    const clientId = searchParams.get('clientId');
    const clean250 = searchParams.get('clean250');

    const executeDelete = async () => {
      if (paymentId) {
        const item = await Payment.findById(paymentId);
        if (item) {
          if (item.asaasPaymentId && item.status !== 'Pago') {
            try {
              const baseUrl = getAsaasBaseUrl();
              const headers = getAsaasHeaders();
              await fetch(`${baseUrl}/payments/${item.asaasPaymentId}`, {
                method: 'DELETE',
                headers
              });
            } catch (asaasErr) {
              console.warn('Asaas remote delete warning:', asaasErr);
            }
          }
          await Payment.deleteOne({ _id: paymentId });
        }
        return { success: true };
      }

      let query: any = {};
      if (clientId) query.clientId = clientId;
      if (clean250) {
        query.$or = [
          { valor: 250 },
          { formaPagamento: 'DINHEIRO' },
          { formaPagamento: 'Dinheiro' }
        ];
      }

      if (Object.keys(query).length > 0) {
        const res = await Payment.deleteMany(query);
        return { success: true, deletedCount: res.deletedCount };
      }

      return { success: false, error: 'Parâmetros ausentes' };
    };

    try {
      const result = await executeDelete();
      return NextResponse.json(result);
    } catch (dbErr: any) {
      const isSslOrConnError = dbErr.message && (
        dbErr.message.includes('SSL') || 
        dbErr.message.includes('tlsv1') || 
        dbErr.message.includes('ECONNRESET') || 
        dbErr.message.includes('topology') ||
        dbErr.message.includes('closed')
      );

      if (isSslOrConnError) {
        console.warn('[Payments DELETE] Reconnecting after SSL error:', dbErr.message);
        await dbConnect(true);
        const retryResult = await executeDelete();
        return NextResponse.json(retryResult);
      }
      throw dbErr;
    }
  } catch (error: any) {
    console.error('Error in payments DELETE:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
