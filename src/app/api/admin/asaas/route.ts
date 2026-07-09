import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Contract from '@/models/Contract';
import Client from '@/models/Client';
import Plan from '@/models/Plan';
import { getAsaasPaymentDetails, getAsaasPixQrCode, createAsaasCustomer, createAsaasPayment, createAsaasSubscription, getAsaasInstallmentPayments, getAsaasSubscriptionPayments } from '@/utils/asaas';
import Payment from '@/models/Payment';

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'standalone') {
      const standalonePayments = await Payment.find({
        planoNome: { $regex: /^(Cobrança Avulsa:|Parcelamento |Assinatura:)/ },
        formaPagamento: 'Asaas'
      }).sort({ createdAt: -1 });
      return NextResponse.json({ success: true, data: standalonePayments });
    }

    // Buscar todos os clientes
    const clients = await Client.find().sort({ 'dadosPessoais.nome': 1 });

    const clientGroupedData = [];

    for (const client of clients) {
      // Buscar contratos desse cliente
      const contracts = await Contract.find({ clientId: client._id }).sort({ createdAt: -1 });

      const clientInfo = {
        clientId: client._id.toString(),
        nome: client.dadosPessoais?.nome || 'Sem Nome',
        email: client.dadosPessoais?.email || '',
        cpf: client.dadosPessoais?.cpf || '',
        asaasCustomerId: client.dadosComerciais?.asaasCustomerId || '',
        status: 'sem_contrato', // default
        contractId: '',
        planoNome: '',
        valorLiquido: 0,
        formaPagamento: '',
        dataPrimeiroVencimento: '',
        parcelas: 1,
        asaasPaymentId: '',
        asaasInvoiceUrl: '',
        asaasBoletoPdf: '',
        asaasPixCopyPaste: '',
        asaasPixQrCode: '',
        asaasBillingStatus: '',
        contractStatus: ''
      };

      // 1. Procurar contrato com cobrança gerada no Asaas
      const asaasContract = contracts.find(c => c.asaasPaymentId);
      // 2. Procurar contrato pendente de cobrança
      const pendingContract = contracts.find(c => c.status === 'pendente' && !c.asaasPaymentId);

      if (asaasContract) {
        clientInfo.status = 'gerado';
        clientInfo.contractId = asaasContract._id.toString();
        clientInfo.planoNome = asaasContract.planoNome;
        clientInfo.valorLiquido = asaasContract.valorLiquido;
        clientInfo.formaPagamento = asaasContract.formaPagamento;
        clientInfo.dataPrimeiroVencimento = asaasContract.dataPrimeiroVencimento || asaasContract.dataInicio || '';
        clientInfo.parcelas = asaasContract.parcelas || 1;
        clientInfo.asaasPaymentId = asaasContract.asaasPaymentId;
        clientInfo.asaasInvoiceUrl = asaasContract.asaasInvoiceUrl;
        clientInfo.asaasBoletoPdf = asaasContract.asaasBoletoPdf || '';
        clientInfo.asaasPixCopyPaste = asaasContract.asaasPixCopyPaste || '';
        clientInfo.asaasPixQrCode = asaasContract.asaasPixQrCode || '';
        clientInfo.asaasBillingStatus = asaasContract.asaasBillingStatus || 'pendente';
        clientInfo.contractStatus = asaasContract.status;
      } else if (pendingContract) {
        clientInfo.status = 'nao_gerado';
        clientInfo.contractId = pendingContract._id.toString();
        clientInfo.planoNome = pendingContract.planoNome;
        clientInfo.valorLiquido = pendingContract.valorLiquido;
        clientInfo.formaPagamento = pendingContract.formaPagamento;
        clientInfo.dataPrimeiroVencimento = pendingContract.dataPrimeiroVencimento || pendingContract.dataInicio || '';
        clientInfo.parcelas = pendingContract.parcelas || 1;
        clientInfo.contractStatus = pendingContract.status;
      } else if (contracts.length > 0) {
        // Possui contratos assinados ou cancelados
        const latestContract = contracts[0];
        clientInfo.contractId = latestContract._id.toString();
        clientInfo.planoNome = latestContract.planoNome;
        clientInfo.valorLiquido = latestContract.valorLiquido;
        clientInfo.formaPagamento = latestContract.formaPagamento;
        clientInfo.parcelas = latestContract.parcelas || 1;
        clientInfo.contractStatus = latestContract.status;
      }

      clientGroupedData.push(clientInfo);
    }

    return NextResponse.json({ success: true, data: clientGroupedData });
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

    const client = await Client.findById(contract.clientId);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente não encontrado' }, { status: 404 });
    }

    // Atualizar status no banco com base no retorno do Asaas
    if (apiStatus === 'RECEIVED' || apiStatus === 'CONFIRMED') {
      // Ativar contrato e dados comerciais do cliente
      contract.status = 'assinado';
      contract.asaasBillingStatus = 'pago';
      if (!contract.assinaturaNome) {
        contract.assinaturaNome = client.dadosPessoais?.nome || 'Sincronização Manual Asaas';
        contract.assinaturaData = new Date();
      }
      await contract.save();

      const plan = await Plan.findById(contract.planoId);
      const isAnual = contract.planoTipo === 'Anual';

      Object.assign(client.dadosComerciais, {
        planoId: contract.planoId,
        vencimento: contract.dataPrimeiroVencimento || contract.dataFim,
        status: 'ativo',
        parcelas: contract.parcelas,
        descontoValor: contract.descontoValor,
        descontoTipo: contract.descontoTipo,
        duracao: isAnual ? 'anual' : 'mensal',
        formaPagamento: contract.formaPagamento,
        dataInicio: contract.dataInicio,
        responsavelVenda: contract.responsavelVenda || '',
        unidadeContratada: contract.unidadeContratada || '',
        observacoesContratuais: contract.observacoesContratuais || '',
        creditosTotal: plan?.creditosTotal || (contract.valorBruto > 0 ? 12 : 0),
        creditosUsados: 0,
        creditosReservados: 0,
        creditosMassagemTotal: isAnual ? 1 : 0,
        creditosMassagemUsados: 0,
        creditosMassagemReservados: 0
      });
      await client.save();
    } else if (apiStatus === 'OVERDUE') {
      contract.asaasBillingStatus = 'vencido';
      await contract.save();

      client.dadosComerciais.status = 'vencido';
      await client.save();
    } else if (apiStatus === 'DELETED') {
      contract.status = 'cancelado';
      contract.asaasBillingStatus = 'cancelado';
      await contract.save();

      if (client.dadosComerciais?.planoId?.toString() === contract.planoId.toString()) {
        client.dadosComerciais.status = 'inativo';
        await client.save();
      }
    } else {
      // Apenas atualiza o status de cobrança
      contract.asaasBillingStatus = apiStatus.toLowerCase();

      // Se a cobrança for Pix e por acaso as chaves Pix não estiverem salvas localmente, tentar buscar e salvar
      if (contract.formaPagamento === 'pix' && !contract.asaasPixCopyPaste) {
        const pixDetails = await getAsaasPixQrCode(contract.asaasPaymentId);
        if (pixDetails) {
          contract.asaasPixQrCode = pixDetails.encodedImage;
          contract.asaasPixCopyPaste = pixDetails.payload;
        }
      }
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
    const { contractId, action, clientId, valor, vencimento, formaPagamento, descricao, parcelas, cycle } = body;

    // ══════════════════════════════════════════════════════════════
    // SUB-FLOW: STANDALONE CHARGES (AVULSA, PARCELADA, ASSINATURA)
    // ══════════════════════════════════════════════════════════════
    if (action) {
      if (!clientId || !valor || !formaPagamento) {
        return NextResponse.json({ success: false, error: 'clientId, valor e formaPagamento são obrigatórios' }, { status: 400 });
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
      }

      if (action === 'create_avulsa') {
        const dueDate = vencimento || new Date().toISOString().split('T')[0];
        const paymentResult = await createAsaasPayment({
          customerId: asaasCustomerId,
          formaPagamento,
          value: Number(valor),
          dueDate,
          description: descricao || 'Cobrança Avulsa'
        });

        // Registrar na coleção Payment para aparecer no controle financeiro
        const pRecord = await Payment.create({
          clientId: client._id,
          clientNome: client.dadosPessoais?.nome || 'Avulso',
          planoNome: `Cobrança Avulsa: ${descricao || 'Geral'}`,
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
          formaPagamento,
          value: Number(valor),
          dueDate: firstDueDate,
          description: descricao || 'Parcelamento',
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
            planoNome: `Parcelamento ${ip.installmentNumber}/${installmentPayments.length}: ${descricao || 'Geral'}`,
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
          formaPagamento,
          value: Number(valor),
          nextDueDate: firstDueDate,
          cycle: cycle || 'MONTHLY',
          description: descricao || 'Assinatura Recorrente'
        });

        // Buscar a primeira cobrança gerada para essa assinatura
        const subPayments = await getAsaasSubscriptionPayments(subResult.subscriptionId);
        let firstPaymentRecord = null;

        if (subPayments.length > 0) {
          const sp = subPayments[0];
          firstPaymentRecord = await Payment.create({
            clientId: client._id,
            clientNome: client.dadosPessoais?.nome || 'Avulso',
            planoNome: `Assinatura: ${descricao || 'Geral'}`,
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
          // Fallback caso não seja gerado imediatamente no Sandbox
          firstPaymentRecord = await Payment.create({
            clientId: client._id,
            clientNome: client.dadosPessoais?.nome || 'Avulso',
            planoNome: `Assinatura: ${descricao || 'Geral'}`,
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
    // ORIGINAL FLOW: CONTRACT-BASED CHARGES
    // ══════════════════════════════════════════════════════════════
    if (!contractId) {
      return NextResponse.json({ success: false, error: 'contractId ou action é obrigatório' }, { status: 400 });
    }

    const contract = await Contract.findById(contractId);
    if (!contract) {
      return NextResponse.json({ success: false, error: 'Contrato não encontrado' }, { status: 404 });
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
      console.log('Criando cliente no Asaas para cobrança retroativa...');
      asaasCustomerId = await createAsaasCustomer(client);
      client.dadosComerciais.asaasCustomerId = asaasCustomerId;
      await client.save();
    }

    console.log('Gerando cobrança retroativa no Asaas...');
    const paymentResult = await createAsaasPayment({
      customerId: asaasCustomerId,
      formaPagamento: contract.formaPagamento,
      value: contract.valorLiquido,
      dueDate: contract.dataPrimeiroVencimento || contract.dataInicio || new Date().toISOString().split('T')[0],
      description: `Contrato de Plano: ${plan.nome}`,
      parcelas: contract.parcelas
    });

    contract.asaasPaymentId = paymentResult.paymentId;
    contract.asaasInvoiceUrl = paymentResult.invoiceUrl;
    contract.asaasBoletoPdf = paymentResult.bankSlipUrl;
    contract.asaasBillingStatus = paymentResult.billingStatus;

    if (contract.formaPagamento === 'pix') {
      const pixDetails = await getAsaasPixQrCode(contract.asaasPaymentId);
      if (pixDetails) {
        contract.asaasPixQrCode = pixDetails.encodedImage;
        contract.asaasPixCopyPaste = pixDetails.payload;
      }
    }

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
    console.error('Erro ao gerar cobrança manual do Asaas:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
