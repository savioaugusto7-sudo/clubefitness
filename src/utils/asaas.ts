const getHeaders = () => {
  const token = process.env.ASAAS_API_KEY;
  if (!token) {
    throw new Error('ASAAS_API_KEY não configurada nas variáveis de ambiente.');
  }
  return {
    'access_token': token,
    'Content-Type': 'application/json'
  };
};

export const getBaseUrl = () => {
  if (process.env.ASAAS_API_URL) {
    return process.env.ASAAS_API_URL.replace(/\/$/, '');
  }
  const token = process.env.ASAAS_API_KEY || '';
  if (token.startsWith('$aact_') && !token.includes('sandbox') && !token.includes('test')) {
    return 'https://api.asaas.com/v3';
  }
  return 'https://api.asaas.com/v3'; // Default para produção oficial
};

export const isAsaasProduction = () => {
  const url = getBaseUrl();
  return url.includes('api.asaas.com') && !url.includes('sandbox');
};

const handleError = async (res: Response, label: string) => {
  if (!res.ok) {
    let errData: any = {};
    try {
      errData = await res.json();
    } catch {}
    const detail =
      (Array.isArray(errData?.errors) && errData.errors.map((e: any) => e.description).join(', ')) ||
      errData?.error ||
      errData?.message ||
      `HTTP ${res.status}`;
    throw new Error(`Asaas – ${label}: ${detail}`);
  }
  return res.json();
};

export async function createAsaasCustomer(client: any) {
  const baseUrl = getBaseUrl();
  const headers = getHeaders();

  const phone = (client.dadosPessoais?.telefone || '').replace(/\D/g, '');
  const cpf = (client.dadosPessoais?.cpf || '').replace(/\D/g, '');

  const body = {
    name: client.dadosPessoais?.nome || '',
    cpfCnpj: cpf,
    email: client.dadosPessoais?.email || '',
    phone: phone,
    notificationDisabled: false
  };

  const res = await fetch(`${baseUrl}/customers`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000)
  });

  const data = await handleError(res, 'Criar Cliente');
  return data.id;
}

export async function createAsaasPayment(params: {
  customerId: string;
  formaPagamento: string;
  value: number;
  dueDate: string;
  description: string;
  parcelas?: number;
}) {
  const baseUrl = getBaseUrl();
  const headers = getHeaders();

  // Mapeia forma de pagamento para Asaas
  let billingType = 'UNDEFINED';
  const fp = (params.formaPagamento || '').toLowerCase();
  if (fp === 'pix') billingType = 'PIX';
  else if (fp === 'boleto') billingType = 'BOLETO';
  else if (fp === 'cartao') billingType = 'CREDIT_CARD';

  const body: any = {
    customer: params.customerId,
    billingType,
    dueDate: params.dueDate,
    description: params.description,
    postalService: false
  };

  const numParcelas = Number(params.parcelas) || 1;
  if (numParcelas > 1) {
    body.installmentCount = numParcelas;
    body.totalValue = params.value;
  } else {
    body.value = params.value;
  }

  const res = await fetch(`${baseUrl}/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000)
  });

  const data = await handleError(res, 'Criar Cobrança');
  return {
    paymentId: data.id,
    invoiceUrl: data.invoiceUrl,
    bankSlipUrl: data.bankSlipUrl || '',
    billingStatus: data.status,
    installmentId: data.installment || '',
    netValue: data.netValue || data.value
  };
}

export async function getAsaasPixQrCode(paymentId: string) {
  try {
    if (!process.env.ASAAS_API_KEY) return null;
    const baseUrl = getBaseUrl();
    const headers = getHeaders();

    const res = await fetch(`${baseUrl}/payments/${paymentId}/pixQrCode`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) return null;
    const data = await res.json();
    return {
      encodedImage: data.encodedImage || '',
      payload: data.payload || '',
      expirationDate: data.expirationDate || ''
    };
  } catch (e) {
    console.warn('Erro ao obter Pix QR Code do Asaas:', e);
    return null;
  }
}

export async function getAsaasPaymentDetails(paymentId: string) {
  const baseUrl = getBaseUrl();
  const headers = getHeaders();

  const res = await fetch(`${baseUrl}/payments/${paymentId}`, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(8000)
  });

  return handleError(res, 'Consultar Cobrança');
}

export async function createAsaasSubscription(params: {
  customerId: string;
  formaPagamento: string;
  value: number;
  nextDueDate: string;
  cycle: string;
  description: string;
}) {
  const baseUrl = getBaseUrl();
  const headers = getHeaders();

  let billingType = 'UNDEFINED';
  const fp = (params.formaPagamento || '').toLowerCase();
  if (fp === 'pix') billingType = 'PIX';
  else if (fp === 'boleto') billingType = 'BOLETO';
  else if (fp === 'cartao') billingType = 'CREDIT_CARD';

  const body = {
    customer: params.customerId,
    billingType,
    value: params.value,
    nextDueDate: params.nextDueDate,
    cycle: params.cycle.toUpperCase(),
    description: params.description
  };

  const res = await fetch(`${baseUrl}/subscriptions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000)
  });

  const data = await handleError(res, 'Criar Assinatura');
  return {
    subscriptionId: data.id,
    billingStatus: data.status,
    description: data.description,
    cycle: data.cycle
  };
}

export async function getAsaasBalance() {
  try {
    if (!process.env.ASAAS_API_KEY) {
      return { totalBalance: 0, availableBalance: 0, pendingBalance: 0 };
    }
    const baseUrl = getBaseUrl();
    const headers = getHeaders();

    const res = await fetch(`${baseUrl}/finance/balance`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(3500)
    });

    if (!res.ok) {
      return { totalBalance: 0, availableBalance: 0, pendingBalance: 0 };
    }
    const data = await res.json();
    return {
      totalBalance: data.totalBalance || 0,
      availableBalance: data.availableBalance || 0,
      pendingBalance: data.pendingBalance || 0
    };
  } catch (e) {
    console.warn('Asaas Balance fetch notice:', e);
    return { totalBalance: 0, availableBalance: 0, pendingBalance: 0 };
  }
}

export async function createAsaasPaymentLink(params: {
  name: string;
  description?: string;
  value: number;
  billingType?: string;
  chargeType?: 'DETACHED' | 'RECURRENT' | 'INSTALLMENT';
  maxInstallmentCount?: number;
  dueDateLimitDays?: number;
}) {
  const baseUrl = getBaseUrl();
  const headers = getHeaders();

  const body = {
    name: params.name,
    description: params.description || '',
    value: params.value,
    billingType: params.billingType || 'UNDEFINED',
    chargeType: params.chargeType || 'DETACHED',
    maxInstallmentCount: params.maxInstallmentCount || 1,
    dueDateLimitDays: params.dueDateLimitDays || 3
  };

  const res = await fetch(`${baseUrl}/paymentLinks`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000)
  });

  const data = await handleError(res, 'Criar Link de Pagamento');
  return {
    id: data.id,
    url: data.url,
    name: data.name,
    active: data.active
  };
}

export async function getAsaasInstallmentPayments(installmentId: string) {
  const baseUrl = getBaseUrl();
  const headers = getHeaders();

  const res = await fetch(`${baseUrl}/payments?installment=${installmentId}`, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(8000)
  });

  const data = await handleError(res, 'Listar Pagamentos do Parcelamento');
  return data.data || [];
}

export async function getAsaasSubscriptionPayments(subscriptionId: string) {
  const baseUrl = getBaseUrl();
  const headers = getHeaders();

  const res = await fetch(`${baseUrl}/payments?subscription=${subscriptionId}`, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(8000)
  });

  const data = await handleError(res, 'Listar Pagamentos da Assinatura');
  return data.data || [];
}
