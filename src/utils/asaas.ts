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

export async function configureAsaasCustomerWhatsAppOnly(customerId: string) {
  try {
    const baseUrl = getBaseUrl();
    const headers = getHeaders();

    const res = await fetch(`${baseUrl}/customers/${customerId}/notifications`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      console.warn(`[Asaas Notifications] Falha ao consultar notificações de ${customerId}: HTTP ${res.status}`);
      return false;
    }

    const data = await res.json();
    const notifications = Array.isArray(data?.data) ? data.data : [];

    for (const notif of notifications) {
      await fetch(`${baseUrl}/notifications/${notif.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          emailEnabledForCustomer: false,
          smsEnabledForCustomer: false,
          phoneCallEnabledForCustomer: false,
          whatsappEnabledForCustomer: true
        }),
        signal: AbortSignal.timeout(8000)
      }).catch((e: any) => {
        console.warn(`[Asaas Notifications] Erro ao atualizar notificação ${notif.id}:`, e?.message);
      });
    }

    console.log(`[Asaas Notifications] Cliente ${customerId} configurado exclusivamente para WhatsApp (${notifications.length} notificações).`);
    return true;
  } catch (err: any) {
    console.warn(`[Asaas Notifications] Erro ao configurar WhatsApp para ${customerId}:`, err?.message);
    return false;
  }
}

export async function createAsaasCustomer(client: any) {
  const baseUrl = getBaseUrl();
  const headers = getHeaders();

  const phone = (client.dadosPessoais?.telefone || '').replace(/\D/g, '');
  const cpf = (client.dadosPessoais?.cpf || '').replace(/\D/g, '');

  const body: any = {
    name: client.dadosPessoais?.nome || '',
    cpfCnpj: cpf,
    email: client.dadosPessoais?.email || '',
    notificationDisabled: false
  };

  if (phone) {
    body.mobilePhone = phone;
    body.phone = phone;
  }

  const res = await fetch(`${baseUrl}/customers`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000)
  });

  const data = await handleError(res, 'Criar Cliente');
  const customerId = data.id;

  // Garantir contato exclusivo via WhatsApp
  try {
    await configureAsaasCustomerWhatsAppOnly(customerId);
  } catch (e: any) {
    console.warn('[Asaas Notifications] Falha não impeditiva ao configurar WhatsApp:', e?.message);
  }

  return customerId;
}

export async function updateAsaasCustomer(customerId: string, client: any) {
  const baseUrl = getBaseUrl();
  const headers = getHeaders();

  const phone = (client.dadosPessoais?.telefone || client.telefone || '').replace(/\D/g, '');
  const cpf = (client.dadosPessoais?.cpf || client.cpf || '').replace(/\D/g, '');

  const body: any = {
    name: client.dadosPessoais?.nome || client.nome || '',
    email: client.dadosPessoais?.email || client.email || '',
    notificationDisabled: false
  };

  if (cpf) body.cpfCnpj = cpf;
  if (phone) {
    body.mobilePhone = phone;
    body.phone = phone;
  }

  const res = await fetch(`${baseUrl}/customers/${customerId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000)
  });

  const data = await handleError(res, 'Atualizar Cliente');

  // Garantir contato exclusivo via WhatsApp
  try {
    await configureAsaasCustomerWhatsAppOnly(customerId);
  } catch (e: any) {
    console.warn('[Asaas Notifications] Falha não impeditiva ao configurar WhatsApp:', e?.message);
  }

  return data.id;
}

export async function createAsaasPayment(params: {
  customerId: string;
  formaPagamento: string;
  value: number;
  dueDate: string;
  description: string;
  parcelas?: number;
  externalReference?: string;
}) {
  const baseUrl = getBaseUrl();
  const headers = getHeaders();

  // Se tiver externalReference, checar se já existe cobrança gerada para evitar cobranças duplicadas
  if (params.externalReference) {
    try {
      const resCheck = await fetch(`${baseUrl}/payments?externalReference=${encodeURIComponent(params.externalReference)}&limit=10`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(6000)
      });
      if (resCheck.ok) {
        const dataCheck = await resCheck.json();
        const paymentsList = Array.isArray(dataCheck?.data) ? dataCheck.data : [];
        const activePayment = paymentsList.find((p: any) => p.status !== 'CANCELLED' && p.status !== 'DELETED') || paymentsList[0];
        if (activePayment) {
          console.log(`[Asaas Idempotency] Cobrança existente encontrada para ref ${params.externalReference}: ${activePayment.id}`);
          return {
            paymentId: activePayment.id,
            invoiceUrl: activePayment.invoiceUrl,
            bankSlipUrl: activePayment.bankSlipUrl || '',
            billingStatus: activePayment.status,
            installmentId: activePayment.installment || '',
            netValue: activePayment.netValue || activePayment.value
          };
        }
      }
    } catch (e: any) {
      console.warn('[Asaas Idempotency] Aviso na checagem de duplicidade:', e?.message);
    }
  }

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

  if (params.externalReference) {
    body.externalReference = params.externalReference;
  }

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
  externalReference?: string;
}) {
  const baseUrl = getBaseUrl();
  const headers = getHeaders();

  // Se tiver externalReference, checar assinatura existente para evitar duplicação
  if (params.externalReference) {
    try {
      const resCheck = await fetch(`${baseUrl}/subscriptions?externalReference=${encodeURIComponent(params.externalReference)}&limit=10`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(6000)
      });
      if (resCheck.ok) {
        const dataCheck = await resCheck.json();
        const subsList = Array.isArray(dataCheck?.data) ? dataCheck.data : [];
        const activeSub = subsList.find((s: any) => s.status !== 'INACTIVE' && s.status !== 'DELETED') || subsList[0];
        if (activeSub) {
          console.log(`[Asaas Idempotency] Assinatura existente encontrada para ref ${params.externalReference}: ${activeSub.id}`);
          let firstPaymentId = '';
          let invoiceUrl = '';
          let bankSlipUrl = '';
          try {
            const resPayments = await fetch(`${baseUrl}/subscriptions/${activeSub.id}/payments`, {
              method: 'GET',
              headers,
              signal: AbortSignal.timeout(6000)
            });
            if (resPayments.ok) {
              const dataPayments = await resPayments.json();
              const firstPayment = Array.isArray(dataPayments.data) && dataPayments.data.length > 0 ? dataPayments.data[0] : null;
              if (firstPayment) {
                firstPaymentId = firstPayment.id;
                invoiceUrl = firstPayment.invoiceUrl || '';
                bankSlipUrl = firstPayment.bankSlipUrl || '';
              }
            }
          } catch {}

          return {
            subscriptionId: activeSub.id,
            paymentId: firstPaymentId,
            invoiceUrl,
            bankSlipUrl,
            billingStatus: activeSub.status,
            description: activeSub.description,
            cycle: activeSub.cycle
          };
        }
      }
    } catch (e: any) {
      console.warn('[Asaas Idempotency] Aviso na checagem de assinatura existente:', e?.message);
    }
  }

  let billingType = 'UNDEFINED';
  const fp = (params.formaPagamento || '').toLowerCase();
  if (fp === 'pix') billingType = 'PIX';
  else if (fp === 'boleto') billingType = 'BOLETO';
  else if (fp === 'cartao') billingType = 'CREDIT_CARD';

  const body: any = {
    customer: params.customerId,
    billingType,
    value: params.value,
    nextDueDate: params.nextDueDate,
    cycle: params.cycle.toUpperCase(),
    description: params.description
  };

  if (params.externalReference) {
    body.externalReference = params.externalReference;
  }

  const res = await fetch(`${baseUrl}/subscriptions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000)
  });

  const data = await handleError(res, 'Criar Assinatura');
  
  // Buscar os pagamentos gerados por esta assinatura para obter imediatamente o primeiro boleto
  let firstPaymentId = '';
  let invoiceUrl = '';
  let bankSlipUrl = '';

  try {
    const resPayments = await fetch(`${baseUrl}/subscriptions/${data.id}/payments`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(6000)
    });
    if (resPayments.ok) {
      const dataPayments = await resPayments.json();
      const firstPayment = Array.isArray(dataPayments.data) && dataPayments.data.length > 0 ? dataPayments.data[0] : null;
      if (firstPayment) {
        firstPaymentId = firstPayment.id;
        invoiceUrl = firstPayment.invoiceUrl || '';
        bankSlipUrl = firstPayment.bankSlipUrl || '';
      }
    }
  } catch (errPayments: any) {
    console.warn('Aviso: Falha ao obter pagamentos da assinatura recém-criada:', errPayments?.message);
  }

  return {
    subscriptionId: data.id,
    paymentId: firstPaymentId,
    invoiceUrl,
    bankSlipUrl,
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

export async function deleteAsaasPayment(paymentId: string) {
  const baseUrl = getBaseUrl();
  const headers = getHeaders();

  const res = await fetch(`${baseUrl}/payments/${paymentId}`, {
    method: 'DELETE',
    headers,
    signal: AbortSignal.timeout(8000)
  });

  return handleError(res, 'Cancelar Cobrança');
}

export async function pauseAsaasSubscription(subscriptionId: string) {
  const baseUrl = getBaseUrl();
  const headers = getHeaders();

  const res = await fetch(`${baseUrl}/subscriptions/${subscriptionId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ status: 'INACTIVE' }),
    signal: AbortSignal.timeout(8000)
  });

  return handleError(res, 'Pausar Assinatura');
}

export async function deleteAsaasSubscription(subscriptionId: string) {
  const baseUrl = getBaseUrl();
  const headers = getHeaders();

  const res = await fetch(`${baseUrl}/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
    headers,
    signal: AbortSignal.timeout(8000)
  });

  return handleError(res, 'Cancelar Assinatura');
}

export async function listAsaasCustomerPayments(customerAsaasId: string, status?: string) {
  const baseUrl = getBaseUrl();
  const headers = getHeaders();

  const query = status ? `customer=${customerAsaasId}&status=${status}` : `customer=${customerAsaasId}`;
  const res = await fetch(`${baseUrl}/payments?${query}&limit=50`, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(8000)
  });

  const data = await handleError(res, 'Listar Cobranças do Cliente');
  return data.data || [];
}

export async function getAsaasSubscription(subscriptionId: string) {
  const baseUrl = getBaseUrl();
  const headers = getHeaders();

  const res = await fetch(`${baseUrl}/subscriptions/${subscriptionId}`, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(8000)
  });

  return handleError(res, 'Consultar Assinatura');
}

export async function listAsaasCustomerInstallments(customerId: string) {
  const baseUrl = getBaseUrl();
  const headers = getHeaders();

  const res = await fetch(`${baseUrl}/installments?customer=${customerId}&limit=50`, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(8000)
  });

  const data = await handleError(res, 'Listar Parcelamentos do Cliente');
  return data.data || [];
}

export async function deleteAsaasInstallment(installmentId: string) {
  const baseUrl = getBaseUrl();
  const headers = getHeaders();

  const res = await fetch(`${baseUrl}/installments/${installmentId}`, {
    method: 'DELETE',
    headers,
    signal: AbortSignal.timeout(8000)
  });

  return handleError(res, 'Cancelar Parcelamento');
}



