import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Payment from '@/models/Payment';
import Client from '@/models/Client';
import Contract from '@/models/Contract';

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

        const numParcelas = Math.max(1, Number(com.parcelas) || 1);
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
        const valorParcela = numParcelas > 0 ? liquido / numParcelas : liquido;

        const recordsToInsert = [];
        for (let i = 0; i < numParcelas; i++) {
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
            formaPagamento: (com.formaPagamento || 'PIX').toUpperCase(),
            parcelaNumero: i + 1,
            parcelasTotal: numParcelas
          });
        }

        if (recordsToInsert.length > 0) {
          await Payment.insertMany(recordsToInsert);
        }
      }
    }
  } catch (err) {
    console.error('Error ensuring local payments for clients:', err);
  }
};

// 1. GET: Query all client payments (mensalidades)
export async function GET(request: Request) {
  try {
    await dbConnect();
    await ensureLocalPaymentsForClients();
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
    const payments = await Payment.find(query).sort({ vencimento: 1 }).limit(100);

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

      const numParcelas = Math.max(1, Number(com.parcelas) || 1);
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
      const valorParcela = numParcelas > 0 ? liquido / numParcelas : liquido;

      const recordsToInsert = [];
      for (let i = 0; i < numParcelas; i++) {
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
          formaPagamento: (com.formaPagamento || 'PIX').toUpperCase(),
          parcelaNumero: i + 1,
          parcelasTotal: numParcelas
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
      }

      return NextResponse.json({ success: true, data: payment });
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

    // C. SYNC ALL CLIENTS WITH ASAAS
    if (action === 'sync_all_asaas') {
      const clients = await Client.find({ 'dadosComerciais.asaasCustomerId': { $ne: '' } });
      if (clients.length === 0) {
         return NextResponse.json({ success: true, message: 'Nenhum cliente com ID Asaas cadastrado.' });
      }

      // Auto-migrate/align contract end dates with payments for all active clients (querying by clientId)
      try {
        const allContracts = await Contract.find({ status: { $in: ['assinado', 'congelado'] } });
        for (const contract of allContracts) {
          const payments = await Payment.find({ clientId: contract.clientId });
          if (payments.length > 0) {
            let latestPaymentDate = '';
            payments.forEach((p: any) => {
              if (p.vencimento && (!latestPaymentDate || p.vencimento > latestPaymentDate)) {
                latestPaymentDate = p.vencimento;
              }
            });
            if (latestPaymentDate && (!contract.dataFim || contract.dataFim < latestPaymentDate)) {
              contract.dataFim = latestPaymentDate;
              await contract.save();

              const client = await Client.findById(contract.clientId);
              if (client && client.dadosComerciais) {
                if ((client.dadosComerciais.vencimento || '') < latestPaymentDate) {
                  client.dadosComerciais.vencimento = latestPaymentDate;
                  client.markModified('dadosComerciais');
                  await client.save();
                }
              }
            }
          }
        }
      } catch (migrationErr) {
        console.error('Error running contract duration self-healing migration:', migrationErr);
      }

      const baseUrl = getAsaasBaseUrl();
      const headers = getAsaasHeaders();

      let syncedCount = 0;
      for (const client of clients) {
        const asaasId = client.dadosComerciais.asaasCustomerId;
        try {
          const paymentsRes = await fetch(`${baseUrl}/payments?customer=${asaasId}&limit=100`, { method: 'GET', headers });
          if (paymentsRes.ok) {
            const paymentsData = await paymentsRes.json();
            if (Array.isArray(paymentsData.data)) {
              // Delete existing local payments for this client to avoid duplicates
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

                // Auto-activate contract if any payment is Pago
                const pendingContract = await Contract.findOne({ clientId: client._id, status: 'pendente' });
                if (pendingContract && paymentRecords.some((r: any) => r.status === 'Pago')) {
                  pendingContract.status = 'assinado';
                  pendingContract.asaasBillingStatus = 'pago';
                  await pendingContract.save();

                  client.dadosComerciais.status = 'ativo';
                  await client.save();
                }
              }
              syncedCount++;
            }
          }
        } catch (err) {
          console.error(`Erro ao sincronizar cliente Asaas ${client.dadosPessoais?.nome}:`, err);
        }
      }

      return NextResponse.json({ success: true, syncedCount });
    }

    return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('id');
    const clientId = searchParams.get('clientId');
    const clean250 = searchParams.get('clean250');

    if (paymentId) {
      await Payment.findByIdAndDelete(paymentId);
      return NextResponse.json({ success: true });
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
      return NextResponse.json({ success: true, deletedCount: res.deletedCount });
    }

    return NextResponse.json({ success: false, error: 'Parâmetros ausentes' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
