import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Contract from '@/models/Contract';
import Client from '@/models/Client';
import Plan from '@/models/Plan';
import { 
  getAsaasPaymentDetails, 
  getAsaasPixQrCode, 
  createAsaasCustomer, 
  updateAsaasCustomer,
  createAsaasPayment, 
  createAsaasSubscription, 
  getAsaasInstallmentPayments, 
  getAsaasSubscriptionPayments,
  getAsaasBalance,
  deleteAsaasPayment,
  pauseAsaasSubscription
} from '@/utils/asaas';
import Payment from '@/models/Payment';

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const isProduction = Boolean(
      process.env.ASAAS_API_URL?.includes('api.asaas.com') ||
      (process.env.ASAAS_API_KEY?.startsWith('$aact_') && !process.env.ASAAS_API_KEY?.includes('sandbox'))
    );

    if (type === 'balance') {
      try {
        const balance = await getAsaasBalance();
        return NextResponse.json({ success: true, isProduction, balance });
      } catch (e: any) {
        return NextResponse.json({ success: true, isProduction, balance: { totalBalance: 0, availableBalance: 0, pendingBalance: 0 } });
      }
    }

    if (type === 'standalone') {
      const standalonePayments = await Payment.find({
        formaPagamento: 'Asaas',
        $or: [
          { observacoes: { $regex: 'Avulso', $options: 'i' } },
          { observacoes: { $regex: 'Parcelamento', $options: 'i' } },
          { observacoes: { $regex: 'Assinatura', $options: 'i' } },
          { observacoes: { $regex: 'Link', $options: 'i' } }
        ]
      }).sort({ createdAt: -1 }).lean();
      return NextResponse.json({ success: true, data: standalonePayments, isProduction });
    }

    // Busca em lote ultrarrápida do MongoDB (sem bloqueio de rede externa)
    const [clients, allContracts] = await Promise.all([
      Client.find().sort({ 'dadosPessoais.nome': 1 }).lean(),
      Contract.find().sort({ createdAt: -1 }).lean()
    ]);

    // Indexar contratos por clientId para acesso O(1)
    const contractsByClient: Record<string, any[]> = {};
    for (const c of allContracts) {
      const cId = c.clientId?.toString();
      if (cId) {
        if (!contractsByClient[cId]) contractsByClient[cId] = [];
        contractsByClient[cId].push(c);
      }
    }

    const clientGroupedData = clients.map(client => {
      const cIdStr = (client as any)._id.toString();
      const contracts = contractsByClient[cIdStr] || [];

      const clientInfo: any = {
        clientId: cIdStr,
        nome: client.dadosPessoais?.nome || 'Sem Nome',
        email: client.dadosPessoais?.email || '',
        cpf: client.dadosPessoais?.cpf || '',
        telefone: client.dadosPessoais?.telefone || '',
        asaasCustomerId: client.dadosComerciais?.asaasCustomerId || '',
        status: 'sem_contrato',
        contractId: '',
        planoNome: '',
        valorLiquido: 0,
        formaPagamento: 'Boleto',
        dataPrimeiroVencimento: '',
        parcelas: 1,
        asaasPaymentId: '',
        asaasInvoiceUrl: '',
        asaasBoletoPdf: '',
        asaasPixCopyPaste: '',
        asaasPixQrCode: '',
        asaasBillingStatus: '',
        contractStatus: '',
        isSignedClicksign: false
      };

      const asaasContract = contracts.find(c => c.asaasPaymentId);
      const pendingContract = contracts.find(c => c.status === 'pendente' && !c.asaasPaymentId);
      const signedActiveContract = contracts.find(c => (c.status === 'ativo' || Boolean(c.contratoAnexo)) && !c.asaasPaymentId);

      if (asaasContract) {
        clientInfo.status = 'gerado';
        clientInfo.contractId = asaasContract._id.toString();
        clientInfo.planoNome = asaasContract.planoNome;
        clientInfo.valorLiquido = asaasContract.valorLiquido;
        clientInfo.formaPagamento = 'Boleto';
        clientInfo.dataPrimeiroVencimento = asaasContract.dataPrimeiroVencimento || asaasContract.dataInicio || '';
        clientInfo.parcelas = asaasContract.parcelas || 1;
        clientInfo.asaasPaymentId = asaasContract.asaasPaymentId;
        clientInfo.asaasInvoiceUrl = asaasContract.asaasInvoiceUrl;
        clientInfo.asaasBoletoPdf = asaasContract.asaasBoletoPdf || '';
        clientInfo.asaasPixCopyPaste = asaasContract.asaasPixCopyPaste || '';
        clientInfo.asaasPixQrCode = asaasContract.asaasPixQrCode || '';
        clientInfo.asaasBillingStatus = asaasContract.asaasBillingStatus || 'pendente';
        clientInfo.contractStatus = asaasContract.status;
        clientInfo.isSignedClicksign = asaasContract.status === 'ativo' || Boolean(asaasContract.contratoAnexo);
      } else if (signedActiveContract) {
        clientInfo.status = 'nao_gerado';
        clientInfo.contractId = signedActiveContract._id.toString();
        clientInfo.planoNome = signedActiveContract.planoNome;
        clientInfo.valorLiquido = signedActiveContract.valorLiquido;
        clientInfo.formaPagamento = 'Boleto';
        clientInfo.dataPrimeiroVencimento = signedActiveContract.dataPrimeiroVencimento || signedActiveContract.dataInicio || '';
        clientInfo.parcelas = signedActiveContract.parcelas || 1;
        clientInfo.contractStatus = signedActiveContract.status;
        clientInfo.isSignedClicksign = true;
      } else if (pendingContract) {
        clientInfo.status = 'nao_gerado';
        clientInfo.contractId = pendingContract._id.toString();
        clientInfo.planoNome = pendingContract.planoNome;
        clientInfo.valorLiquido = pendingContract.valorLiquido;
        clientInfo.formaPagamento = 'Boleto';
        clientInfo.dataPrimeiroVencimento = pendingContract.dataPrimeiroVencimento || pendingContract.dataInicio || '';
        clientInfo.parcelas = pendingContract.parcelas || 1;
        clientInfo.contractStatus = pendingContract.status;
        clientInfo.isSignedClicksign = Boolean(pendingContract.contratoAnexo);
      } else if (contracts.length > 0) {
        const latestContract = contracts[0];
        clientInfo.contractId = latestContract._id.toString();
        clientInfo.planoNome = latestContract.planoNome;
        clientInfo.valorLiquido = latestContract.valorLiquido;
        clientInfo.formaPagamento = 'Boleto';
        clientInfo.parcelas = latestContract.parcelas || 1;
        clientInfo.contractStatus = latestContract.status;
        clientInfo.isSignedClicksign = latestContract.status === 'ativo' || Boolean(latestContract.contratoAnexo);
      }

      return clientInfo;
    });

    return NextResponse.json({
      success: true,
      data: clientGroupedData,
      isProduction
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { contractId } = body;

    if (!contractId) {
      return NextResponse.json({ success: false, error: 'contractId é obrigatório' }, { status: 400 });
    }

    const contract = await Contract.findById(contractId);
    if (!contract) {
      return NextResponse.json({ success: false, error: 'Contrato não encontrado' }, { status: 404 });
    }

    if (!contract.asaasPaymentId) {
      return NextResponse.json({ success: false, error: 'Contrato não está vinculado ao Asaas' }, { status: 400 });
    }

    console.log(`Iniciando sincronização manual do Asaas para o contrato: ID=${contract._id}, PaymentId=${contract.asaasPaymentId}`);

    // Consultar dados atualizados diretamente na API do Asaas
    const payment = await getAsaasPaymentDetails(contract.asaasPaymentId);
    const apiStatus = payment.status; // ex: PENDING, RECEIVED, CONFIRMED, OVERDUE, DELETED

    // Atualizar status no banco com base no retorno do Asaas
    if (apiStatus === 'RECEIVED' || apiStatus === 'CONFIRMED') {
      contract.asaasBillingStatus = 'pago';
      await contract.save();
    } else if (apiStatus === 'OVERDUE') {
      contract.asaasBillingStatus = 'vencido';
      await contract.save();
    } else if (apiStatus === 'DELETED') {
      contract.asaasBillingStatus = 'cancelado';
      await contract.save();
    } else {
      contract.asaasBillingStatus = apiStatus.toLowerCase();
      await contract.save();
    }

    return NextResponse.json({ success: true, data: contract });
  } catch (error: any) {
    console.error('Erro na sincronização manual com Asaas:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { contractId, action, clientId, valor, vencimento, descricao, parcelas, cycle, paymentId, paymentDbId, subscriptionId } = body;

    // ══════════════════════════════════════════════════════════════
    // SUB-FLOW: STANDALONE CHARGES (AVULSA, PARCELADA, ASSINATURA, CANCELAMENTO)
    // ══════════════════════════════════════════════════════════════
    if (action) {
      if (action === 'cancel_payment') {
        if (paymentId) {
          try {
            await deleteAsaasPayment(paymentId);
          } catch (e: any) {
            console.warn('Aviso ao cancelar cobrança no Asaas:', e.message);
          }
        }
        if (paymentDbId) {
          await Payment.findByIdAndUpdate(paymentDbId, { status: 'Cancelado' });
        }
        return NextResponse.json({ success: true, message: 'Boleto cancelado no Asaas com sucesso.' });
      }

      if (action === 'pause_subscription') {
        if (subscriptionId) {
          try {
            await pauseAsaasSubscription(subscriptionId);
          } catch (e: any) {
            console.warn('Aviso ao pausar assinatura no Asaas:', e.message);
          }
        }
        return NextResponse.json({ success: true, message: 'Assinatura de boletos pausada no Asaas com sucesso.' });
      }

      if (action === 'normalize_anna_luiza') {
        const anna = await Client.findOne({
          $or: [
            { 'dadosPessoais.cpf': { $regex: '09097935652' } },
            { 'dadosPessoais.nome': { $regex: 'Anna Luiza Nogueira Coutinho', $options: 'i' } }
          ]
        });

        if (!anna) {
          return NextResponse.json({ success: false, error: 'Anna Luiza não encontrada no banco.' }, { status: 404 });
        }

        const contract = await Contract.findOne({ clientId: anna._id }).sort({ createdAt: -1 });
        if (!contract) {
          return NextResponse.json({ success: false, error: 'Contrato de Anna Luiza não encontrado.' }, { status: 404 });
        }

        let asaasCustomerId = anna.dadosComerciais?.asaasCustomerId || 'cus_000197978956';

        // 1. Atualizar cadastro no Asaas com mobilePhone
        try {
          await updateAsaasCustomer(asaasCustomerId, anna);
        } catch (e: any) {
          console.warn('Aviso ao atualizar cliente Anna no Asaas:', e.message);
        }

        // 2. Cancelar a cobrança avulsa antiga caso exista
        if (contract.asaasPaymentId && !contract.asaasSubscriptionId) {
          try {
            await deleteAsaasPayment(contract.asaasPaymentId);
          } catch (e: any) {
            console.warn('Aviso ao deletar cobrança avulsa antiga:', e.message);
          }
        }

        // 3. Criar Assinatura Recorrente no Asaas
        const dueDate = contract.dataPrimeiroVencimento || contract.dataInicio || '2026-09-15';
        const subResult = await createAsaasSubscription({
          customerId: asaasCustomerId,
          formaPagamento: 'boleto',
          value: Number(contract.valorLiquido) || Number(contract.valorBruto) || 500,
          nextDueDate: dueDate,
          cycle: 'MONTHLY',
          description: `Contrato Clube Fitness - Monitorado (Mensalidade Recorrente)`
        });

        // 4. Atualizar o contrato de Anna no MongoDB
        contract.asaasSubscriptionId = subResult.subscriptionId;
        if (subResult.paymentId) {
          contract.asaasPaymentId = subResult.paymentId;
          contract.asaasInvoiceUrl = subResult.invoiceUrl || '';
          contract.asaasBoletoPdf = subResult.bankSlipUrl || '';
          contract.asaasBillingStatus = 'gerada';
        }
        contract.criarRecorrenciaMensal = true;
        await contract.save();

        if (anna.dadosComerciais) {
          anna.dadosComerciais.asaasCustomerId = asaasCustomerId;
          anna.dadosComerciais.criarRecorrenciaMensal = true;
          await anna.save();
        }

        return NextResponse.json({
          success: true,
          message: 'Cadastro e assinatura de Anna Luiza normalizados com sucesso no Asaas.',
          data: {
            customerId: asaasCustomerId,
            subscriptionId: subResult.subscriptionId,
            paymentId: subResult.paymentId,
            invoiceUrl: subResult.invoiceUrl,
            bankSlipUrl: subResult.bankSlipUrl
          }
        });
      }

      if (!clientId || !valor) {
        return NextResponse.json({ success: false, error: 'clientId e valor são obrigatórios' }, { status: 400 });
      }

      const client = await Client.findById(clientId);
      if (!client) {
        return NextResponse.json({ success: false, error: 'Cliente não encontrado' }, { status: 404 });
      }

      let asaasCustomerId = client.dadosComerciais?.asaasCustomerId;
      if (!asaasCustomerId) {
        console.log('Criando cliente no Asaas para cobrança avulsa...');
        asaasCustomerId = await createAsaasCustomer(client);
        client.dadosComerciais.asaasCustomerId = asaasCustomerId;
        await client.save();
      } else {
        await updateAsaasCustomer(asaasCustomerId, client).catch(() => {});
      }

      if (action === 'create_avulsa') {
        const dueDate = vencimento || new Date().toISOString().split('T')[0];
        const paymentResult = await createAsaasPayment({
          customerId: asaasCustomerId,
          formaPagamento: 'boleto', // EXCLUSIVO BOLETO
          value: Number(valor),
          dueDate,
          description: descricao || 'Boleto Avulso'
        });

        // Registrar na coleção Payment para aparecer no controle financeiro
        const pRecord = await Payment.create({
          clientId: client._id,
          clientNome: client.dadosPessoais?.nome || 'Avulso',
          planoNome: `Boleto Avulso: ${descricao || 'Geral'}`,
          valor: Number(valor),
          vencimento: dueDate,
          status: 'Pendente',
          formaPagamento: 'Asaas',
          asaasPaymentId: paymentResult.paymentId,
          asaasInvoiceUrl: paymentResult.invoiceUrl,
          parcelaNumero: 1,
          parcelasTotal: 1,
          observacoes: descricao || ''
        });

        return NextResponse.json({ success: true, data: pRecord });
      }

      if (action === 'create_parcelamento') {
        const numParcelas = Number(parcelas) || 1;
        const firstDueDate = vencimento || new Date().toISOString().split('T')[0];
        
        const paymentResult = await createAsaasPayment({
          customerId: asaasCustomerId,
          formaPagamento: 'boleto', // EXCLUSIVO BOLETO
          value: Number(valor),
          dueDate: firstDueDate,
          description: descricao || 'Parcelamento em Boletos',
          parcelas: numParcelas
        });

        if (!paymentResult.installmentId) {
          throw new Error('Não foi possível gerar o ID do parcelamento no Asaas');
        }

        // Consultar as cobranças individuais criadas no Asaas
        const installmentPayments = await getAsaasInstallmentPayments(paymentResult.installmentId);
        const savedPayments = [];

        for (const ip of installmentPayments) {
          const pRecord = await Payment.create({
            clientId: client._id,
            clientNome: client.dadosPessoais?.nome || 'Avulso',
            planoNome: `Boleto Parcela ${ip.installmentNumber}/${installmentPayments.length}: ${descricao || 'Geral'}`,
            valor: ip.value,
            vencimento: ip.dueDate,
            status: 'Pendente',
            formaPagamento: 'Asaas',
            asaasPaymentId: ip.id,
            asaasInvoiceUrl: ip.invoiceUrl,
            parcelaNumero: ip.installmentNumber,
            parcelasTotal: installmentPayments.length,
            observacoes: descricao || ''
          });
          savedPayments.push(pRecord);
        }

        return NextResponse.json({ success: true, data: savedPayments });
      }

      if (action === 'create_assinatura') {
        const firstDueDate = vencimento || new Date().toISOString().split('T')[0];
        const subResult = await createAsaasSubscription({
          customerId: asaasCustomerId,
          formaPagamento: 'boleto', // EXCLUSIVO BOLETO
          value: Number(valor),
          nextDueDate: firstDueDate,
          cycle: cycle || 'MONTHLY',
          description: descricao || 'Assinatura Mensal em Boleto'
        });

        // Buscar a primeira cobrança gerada para essa assinatura
        const subPayments = await getAsaasSubscriptionPayments(subResult.subscriptionId);
        let firstPaymentRecord = null;

        if (subPayments.length > 0) {
          const sp = subPayments[0];
          firstPaymentRecord = await Payment.create({
            clientId: client._id,
            clientNome: client.dadosPessoais?.nome || 'Avulso',
            planoNome: `Boleto Recorrente: ${descricao || 'Geral'}`,
            valor: sp.value,
            vencimento: sp.dueDate,
            status: 'Pendente',
            formaPagamento: 'Asaas',
            asaasPaymentId: sp.id,
            asaasInvoiceUrl: sp.invoiceUrl,
            parcelaNumero: 1,
            parcelasTotal: 1,
            observacoes: `Assinatura Asaas ID: ${subResult.subscriptionId}`
          });
        } else {
          firstPaymentRecord = await Payment.create({
            clientId: client._id,
            clientNome: client.dadosPessoais?.nome || 'Avulso',
            planoNome: `Boleto Recorrente: ${descricao || 'Geral'}`,
            valor: Number(valor),
            vencimento: firstDueDate,
            status: 'Pendente',
            formaPagamento: 'Asaas',
            asaasPaymentId: `sub_dummy_${subResult.subscriptionId}`,
            asaasInvoiceUrl: '',
            parcelaNumero: 1,
            parcelasTotal: 1,
            observacoes: `Assinatura Asaas ID: ${subResult.subscriptionId} (Pendente de emissão da 1ª fatura)`
          });
        }

        return NextResponse.json({ success: true, data: firstPaymentRecord });
      }

      return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 });
    }

    // ══════════════════════════════════════════════════════════════
    // ORIGINAL FLOW: CONTRACT-BASED CHARGES (GATED BY CLICKSIGN)
    // ══════════════════════════════════════════════════════════════
    if (!contractId) {
      return NextResponse.json({ success: false, error: 'contractId ou action é obrigatório' }, { status: 400 });
    }

    const contract = await Contract.findById(contractId);
    if (!contract) {
      return NextResponse.json({ success: false, error: 'Contrato não encontrado' }, { status: 404 });
    }

    // 🔒 Trava de Segurança: Faturamento de contratos em boletos só é liberado após o contrato ser formalmente assinado no Clicksign
    const isSigned = contract.status === 'ativo' || Boolean(contract.contratoAnexo);
    if (!isSigned) {
      return NextResponse.json({
        success: false,
        error: 'Ação Bloqueada: O faturamento em boletos no Asaas só é liberado após o contrato ser formalmente assinado no Clicksign.'
      }, { status: 400 });
    }

    if (contract.asaasPaymentId) {
      return NextResponse.json({ success: false, error: 'Este contrato já possui uma cobrança Asaas gerada' }, { status: 400 });
    }

    const client = await Client.findById(contract.clientId);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente não encontrado' }, { status: 404 });
    }

    const plan = await Plan.findById(contract.planoId);
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Plano não encontrado' }, { status: 404 });
    }

    let asaasCustomerId = client.dadosComerciais?.asaasCustomerId;
    if (!asaasCustomerId) {
      console.log('Criando cliente no Asaas para faturamento de contrato...');
      asaasCustomerId = await createAsaasCustomer(client);
      client.dadosComerciais.asaasCustomerId = asaasCustomerId;
      await client.save();
    }

    console.log('Gerando boletos do contrato no Asaas...');
    const paymentResult = await createAsaasPayment({
      customerId: asaasCustomerId,
      formaPagamento: 'boleto', // EXCLUSIVO BOLETO
      value: contract.valorLiquido,
      dueDate: contract.dataPrimeiroVencimento || contract.dataInicio || new Date().toISOString().split('T')[0],
      description: `Contrato: ${plan.nome}`,
      parcelas: contract.parcelas
    });

    contract.asaasPaymentId = paymentResult.paymentId;
    contract.asaasInvoiceUrl = paymentResult.invoiceUrl;
    contract.asaasBoletoPdf = paymentResult.bankSlipUrl;
    contract.asaasBillingStatus = paymentResult.billingStatus;

    await contract.save();

    // Também criar lançamento correspondente na tabela de Payments
    const numP = contract.parcelas || 1;
    if (numP > 1 && paymentResult.installmentId) {
      const installmentPayments = await getAsaasInstallmentPayments(paymentResult.installmentId);
      for (const ip of installmentPayments) {
        await Payment.create({
          clientId: client._id,
          clientNome: client.dadosPessoais?.nome || 'Avulso',
          planoNome: `Contrato Parcela ${ip.installmentNumber}/${installmentPayments.length}: ${plan.nome}`,
          valor: ip.value,
          vencimento: ip.dueDate,
          status: 'Pendente',
          formaPagamento: 'Asaas',
          asaasPaymentId: ip.id,
          asaasInvoiceUrl: ip.invoiceUrl,
          parcelaNumero: ip.installmentNumber,
          parcelasTotal: installmentPayments.length,
          contractId: contract._id,
          observacoes: `Gerado para o contrato ${contract._id}`
        });
      }
    } else {
      await Payment.create({
        clientId: client._id,
        clientNome: client.dadosPessoais?.nome || 'Avulso',
        planoNome: `Contrato: ${plan.nome}`,
        valor: contract.valorLiquido,
        vencimento: contract.dataPrimeiroVencimento || contract.dataInicio || new Date().toISOString().split('T')[0],
        status: 'Pendente',
        formaPagamento: 'Asaas',
        asaasPaymentId: contract.asaasPaymentId,
        asaasInvoiceUrl: contract.asaasInvoiceUrl,
        parcelaNumero: 1,
        parcelasTotal: 1,
        contractId: contract._id,
        observacoes: `Gerado para o contrato ${contract._id}`
      });
    }

    return NextResponse.json({ success: true, data: contract });
  } catch (error: any) {
    console.error('Erro ao faturar contrato em boletos no Asaas:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
