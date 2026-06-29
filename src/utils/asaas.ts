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

const getBaseUrl = () => {
  return (process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3').replace(/\/$/, '');
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
    body: JSON.stringify(body)
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
    description: params.description
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
    body: JSON.stringify(body)
  });

  const data = await handleError(res, 'Criar Cobrança');
  return {
    paymentId: data.id,
    invoiceUrl: data.invoiceUrl,
    bankSlipUrl: data.bankSlipUrl || '',
    billingStatus: data.status,
    installmentId: data.installment || ''
  };
}

export async function getAsaasPixQrCode(paymentId: string) {
  try {
    const baseUrl = getBaseUrl();
    const headers = getHeaders();

    const res = await fetch(`${baseUrl}/payments/${paymentId}/pixQrCode`, {
      method: 'GET',
      headers
    });

    if (!res.ok) return null;
    const data = await res.json();
    return {
      encodedImage: data.encodedImage || '',
      payload: data.payload || ''
    };
  } catch (e) {
    console.error('Erro ao obter Pix QR Code do Asaas:', e);
    return null;
  }
}

export async function getAsaasPaymentDetails(paymentId: string) {
  const baseUrl = getBaseUrl();
  const headers = getHeaders();

  const res = await fetch(`${baseUrl}/payments/${paymentId}`, {
    method: 'GET',
    headers
  });

  return handleError(res, 'Consultar Cobrança');
}
