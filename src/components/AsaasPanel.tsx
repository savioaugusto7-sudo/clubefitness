'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { formatCurrencyBRL } from '@/utils/currencyMask';
import { smartSearchMatch } from '@/utils/smartSearch';

interface AsaasClientInfo {
  clientId: string;
  nome: string;
  email: string;
  cpf: string;
  telefone?: string;
  asaasCustomerId?: string;
  status: 'gerado' | 'nao_gerado' | 'sem_contrato';
  contractId?: string;
  planoNome?: string;
  valorLiquido?: number;
  formaPagamento?: string;
  dataPrimeiroVencimento?: string;
  parcelas?: number;
  asaasPaymentId?: string;
  asaasInvoiceUrl?: string;
  asaasBoletoPdf?: string;
  asaasBillingStatus?: string;
  contractStatus?: string;
  isSignedClicksign?: boolean;
}

interface StandalonePaymentInfo {
  _id: string;
  clientNome: string;
  planoNome: string;
  valor: number;
  vencimento: string;
  status: 'Pendente' | 'Pago' | 'Atrasado' | 'Cancelado';
  formaPagamento: string;
  asaasPaymentId?: string;
  asaasInvoiceUrl?: string;
  parcelaNumero?: number;
  parcelasTotal?: number;
  observacoes?: string;
  createdAt: string;
}

export default function AsaasPanel() {
  const [clients, setClients] = useState<AsaasClientInfo[]>([]);
  const [standalonePayments, setStandalonePayments] = useState<StandalonePaymentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStandalone, setLoadingStandalone] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'visao_geral' | 'contratos' | 'avulsa' | 'assinaturas' | 'historico_avulsas'>('visao_geral');
  
  // Balance State
  const [balance, setBalance] = useState({ totalBalance: 0, availableBalance: 0, pendingBalance: 0 });

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [standaloneSearchQuery, setStandaloneSearchQuery] = useState('');

  // Standalone form states (100% BOLETO BANCÁRIO)
  const [formClientId, setFormClientId] = useState('');
  const [formType, setFormType] = useState<'avulsa' | 'parcelamento' | 'assinatura'>('avulsa');
  const [formValor, setFormValor] = useState<number>(0);
  const [formVencimento, setFormVencimento] = useState<string>('');
  const [formDescricao, setFormDescricao] = useState<string>('');
  const [formParcelas, setFormParcelas] = useState<number>(2);
  const [formCycle, setFormCycle] = useState<string>('MONTHLY');
  const [submittingForm, setSubmittingForm] = useState(false);

  // Syncing & Actions
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [isProduction, setIsProduction] = useState(true);

  // Modals & Feedback
  const [showSuccessDetailsModal, setShowSuccessDetailsModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState<any>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('https://clubefitness.vercel.app/api/webhooks/asaas');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/webhooks/asaas`);
    }
    fetchPayments();
    fetchBalance();
    fetchStandalonePayments();
  }, []);

  const fetchBalance = async () => {
    try {
      const res = await fetch('/api/admin/asaas?type=balance');
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.balance) {
        setBalance(json.balance);
        if (json.isProduction !== undefined) {
          setIsProduction(json.isProduction);
        }
      }
    } catch (e) {
      console.warn('Erro ao buscar saldo do Asaas:', e);
    }
  };

  const fetchPayments = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const res = await fetch('/api/admin/asaas');
      if (!res.ok) throw new Error('Falha ao consultar cobranças');
      const json = await res.json();
      if (json.success) {
        setClients(json.data || []);
        if (json.isProduction !== undefined) {
          setIsProduction(json.isProduction);
        }
      }
    } catch (e: any) {
      setMessage({ text: e.message || 'Erro ao carregar dados do Asaas', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStandalonePayments = async () => {
    try {
      setLoadingStandalone(true);
      const res = await fetch('/api/admin/asaas?type=standalone');
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) {
        setStandalonePayments(json.data || []);
      }
    } catch (e) {
      console.warn('Erro ao buscar transações avulsas:', e);
    } finally {
      setLoadingStandalone(false);
    }
  };

  const handleSyncContract = async (contractId: string) => {
    try {
      setSyncingId(contractId);
      const res = await fetch('/api/admin/asaas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Erro ao sincronizar contrato');
      }
      setMessage({ text: '✓ Status do boleto sincronizado com o Asaas com sucesso!', type: 'success' });
      setTimeout(() => setMessage(null), 4000);
      fetchPayments(false);
      fetchBalance();
      fetchStandalonePayments();
    } catch (e: any) {
      setMessage({ text: e.message, type: 'danger' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSyncingId(null);
    }
  };

  const handleGenerateContractBilling = async (contractId: string) => {
    try {
      setGeneratingId(contractId);
      const res = await fetch('/api/admin/asaas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Erro ao faturar contrato');
      }
      setMessage({ text: '✓ Boletos do contrato gerados no Asaas e agendados no WhatsApp!', type: 'success' });
      setTimeout(() => setMessage(null), 5000);
      setSuccessDetails({
        invoiceUrl: json.data?.asaasInvoiceUrl,
        bankSlipUrl: json.data?.asaasBoletoPdf
      });
      setShowSuccessDetailsModal(true);
      fetchPayments(false);
      fetchBalance();
      fetchStandalonePayments();
    } catch (e: any) {
      setMessage({ text: e.message, type: 'danger' });
      setTimeout(() => setMessage(null), 6000);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleCreateStandalone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId || !formValor || formValor <= 0) {
      setMessage({ text: 'Por favor, selecione um aluno e informe um valor válido.', type: 'danger' });
      return;
    }

    try {
      setSubmittingForm(true);
      const action = formType === 'avulsa' ? 'create_avulsa' : formType === 'parcelamento' ? 'create_parcelamento' : 'create_assinatura';
      const res = await fetch('/api/admin/asaas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          clientId: formClientId,
          valor: formValor,
          vencimento: formVencimento,
          formaPagamento: 'boleto', // EXCLUSIVO BOLETO
          descricao: formDescricao,
          parcelas: formParcelas,
          cycle: formCycle
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Erro ao emitir boleto no Asaas');
      }

      setMessage({ text: '✓ Boleto registrado com sucesso no Asaas e pronto para envio via WhatsApp!', type: 'success' });
      setTimeout(() => setMessage(null), 5000);

      // Reset form
      setFormValor(0);
      setFormVencimento('');
      setFormDescricao('');
      setFormClientId('');

      const pData = Array.isArray(json.data) ? json.data[0] : json.data;
      if (pData) {
        setSuccessDetails({
          invoiceUrl: pData.asaasInvoiceUrl,
          bankSlipUrl: pData.asaasInvoiceUrl
        });
        setShowSuccessDetailsModal(true);
      }

      fetchBalance();
      fetchStandalonePayments();
      fetchPayments(false);
    } catch (e: any) {
      setMessage({ text: e.message, type: 'danger' });
      setTimeout(() => setMessage(null), 6000);
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleCancelPayment = async (paymentId?: string, paymentDbId?: string) => {
    if (!confirm('Deseja realmente cancelar este boleto no Asaas? Esta ação não pode ser desfeita.')) {
      return;
    }
    try {
      setCancelingId(paymentDbId || paymentId || 'cancel');
      const res = await fetch('/api/admin/asaas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel_payment',
          paymentId,
          paymentDbId
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Erro ao cancelar boleto');
      }
      setMessage({ text: '✓ Boleto cancelado no Asaas com sucesso.', type: 'success' });
      setTimeout(() => setMessage(null), 4000);
      fetchStandalonePayments();
      fetchPayments(false);
      fetchBalance();
    } catch (e: any) {
      setMessage({ text: e.message, type: 'danger' });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setCancelingId(null);
    }
  };

  const handleSendWhatsAppBilling = (c: AsaasClientInfo) => {
    const rawPhone = (c.telefone || '').replace(/\D/g, '');
    if (!rawPhone) {
      alert('Aluno sem número de telefone cadastrado no perfil.');
      return;
    }
    const cleanPhone = rawPhone.length === 10 || rawPhone.length === 11 ? `55${rawPhone}` : rawPhone;
    const url = c.asaasInvoiceUrl || c.asaasBoletoPdf;
    const msg = `Olá, ${c.nome}! 🏋️‍♂️\n\nSegue o link do seu *Boleto Bancário* referente ao plano *${c.planoNome || 'Clube Fitness'}*:\n\n📄 *Acessar Boleto:* ${url}\n\nQualquer dúvida, estamos à disposição!`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleSendWhatsAppStandalone = (p: StandalonePaymentInfo) => {
    const matchedClient = clients.find(c => c.nome.toLowerCase() === p.clientNome.toLowerCase());
    const rawPhone = (matchedClient?.telefone || '').replace(/\D/g, '');
    const phoneParam = rawPhone ? (rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone) : '';
    const msg = `Olá, ${p.clientNome}! 🏋️‍♂️\n\nSegue o link do seu *Boleto Bancário* no valor de *R$ ${formatCurrencyBRL(p.valor)}*:\n\n📄 *Acessar Boleto:* ${p.asaasInvoiceUrl}\n\nQualquer dúvida, estamos à disposição!`;
    const targetUrl = phoneParam ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(targetUrl, '_blank');
  };

  // Filtered lists
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      if (statusFilter !== 'todos') {
        if (statusFilter === 'gerado' && c.status !== 'gerado') return false;
        if (statusFilter === 'nao_gerado' && c.status !== 'nao_gerado') return false;
        if (statusFilter === 'pago' && c.asaasBillingStatus !== 'pago' && c.asaasBillingStatus !== 'CONFIRMED' && c.asaasBillingStatus !== 'RECEIVED') return false;
        if (statusFilter === 'pendente' && c.asaasBillingStatus !== 'pendente' && c.asaasBillingStatus !== 'PENDING') return false;
      }
      if (!searchQuery) return true;
      return (
        smartSearchMatch(searchQuery, c.nome) ||
        smartSearchMatch(searchQuery, c.cpf) ||
        smartSearchMatch(searchQuery, c.planoNome || '') ||
        smartSearchMatch(searchQuery, c.email)
      );
    });
  }, [clients, searchQuery, statusFilter]);

  const filteredStandalone = useMemo(() => {
    return standalonePayments.filter(p => {
      if (!standaloneSearchQuery) return true;
      return (
        smartSearchMatch(standaloneSearchQuery, p.clientNome) ||
        smartSearchMatch(standaloneSearchQuery, p.planoNome) ||
        smartSearchMatch(standaloneSearchQuery, p.status)
      );
    });
  }, [standalonePayments, standaloneSearchQuery]);

  const selectedFormClient = useMemo(() => {
    return clients.find(c => c.clientId === formClientId);
  }, [clients, formClientId]);

  const subscriptionsList = useMemo(() => {
    return standalonePayments.filter(p => p.planoNome.includes('Assinatura') || p.observacoes?.includes('Assinatura'));
  }, [standalonePayments]);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Toast Notification */}
      {message && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: message.type === 'success' ? '#10b981' : '#ef4444',
          color: '#fff',
          padding: '14px 20px',
          borderRadius: '10px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          fontWeight: 700,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backdropFilter: 'blur(8px)'
        }}>
          {message.text}
        </div>
      )}

      {/* Header Fintech Hero */}
      <div className="content-panel" style={{
        background: 'linear-gradient(135deg, rgba(14, 26, 43, 0.85) 0%, rgba(8, 14, 24, 0.95) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        padding: '24px 28px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                {isProduction ? 'Asaas Produção (Conexão Oficial Ativa)' : 'Asaas Sandbox (Modo de Testes)'}
              </span>
              <span style={{
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <i className="fa-brands fa-whatsapp"></i> Notificações: Exclusivamente WhatsApp
              </span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Central de Faturamento & Boletos Asaas
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', margin: '4px 0 0 0' }}>
              Emissão oficial de Boletos Registrados e Notificações no WhatsApp vinculadas aos Contratos assinados.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={() => fetchPayments(false)}
              disabled={loading}
              style={{ fontSize: '0.82rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i>
              Atualizar Dados
            </button>
            <a
              href={isProduction ? 'https://www.asaas.com' : 'https://sandbox.asaas.com'}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
              style={{ fontSize: '0.82rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', background: '#10b981', borderColor: '#10b981' }}
            >
              <i className="fa-solid fa-arrow-up-right-from-square"></i>
              Painel Oficial Asaas
            </a>
          </div>
        </div>

        {/* Webhook Card */}
        <div style={{
          marginTop: '18px',
          padding: '12px 16px',
          background: 'rgba(0, 0, 0, 0.35)',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-bolt" style={{ color: '#10b981' }}></i>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Webhook de Retorno Automático: <code style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{webhookUrl}</code>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(webhookUrl);
              setCopiedLink(true);
              setTimeout(() => setCopiedLink(false), 2500);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: copiedLink ? '#10b981' : 'var(--text-muted)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            {copiedLink ? '✓ Copiado!' : 'Copiar URL do Webhook'}
          </button>
        </div>
      </div>

      {/* KPI Cards (Fintech Metrics) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div className="metric-card" style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
          <div className="metric-info">
            <h3 style={{ color: '#10b981' }}>Saldo Disponível</h3>
            <div className="value" style={{ color: '#10b981' }}>R$ {formatCurrencyBRL(balance.availableBalance)}</div>
          </div>
          <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <i className="fa-solid fa-vault"></i>
          </div>
        </div>

        <div className="metric-card" style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
          <div className="metric-info">
            <h3 style={{ color: '#f59e0b' }}>Saldo a Receber (Futuro)</h3>
            <div className="value" style={{ color: '#f59e0b' }}>R$ {formatCurrencyBRL(balance.pendingBalance)}</div>
          </div>
          <div className="metric-icon warning">
            <i className="fa-solid fa-clock-rotate-left"></i>
          </div>
        </div>

        <div className="metric-card" style={{ background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
          <div className="metric-info">
            <h3 style={{ color: '#818cf8' }}>Contratos Faturados</h3>
            <div className="value" style={{ color: '#818cf8' }}>{clients.filter(c => c.status === 'gerado').length}</div>
          </div>
          <div className="metric-icon indigo">
            <i className="fa-solid fa-file-invoice-dollar"></i>
          </div>
        </div>

        <div className="metric-card" style={{ background: 'rgba(236, 72, 153, 0.06)', border: '1px solid rgba(236, 72, 153, 0.25)' }}>
          <div className="metric-info">
            <h3 style={{ color: '#f472b6' }}>Assinaturas em Boleto</h3>
            <div className="value" style={{ color: '#f472b6' }}>{subscriptionsList.length}</div>
          </div>
          <div className="metric-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
            <i className="fa-solid fa-receipt"></i>
          </div>
        </div>
      </div>

      {/* Modern Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        padding: '6px',
        background: 'rgba(8, 11, 17, 0.7)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        marginBottom: '20px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        <button
          className="role-tab-btn"
          onClick={() => setActiveSubTab('visao_geral')}
          style={{
            background: activeSubTab === 'visao_geral' ? 'var(--color-primary)' : 'transparent',
            color: activeSubTab === 'visao_geral' ? '#fff' : 'var(--text-muted)',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.82rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fa-solid fa-chart-pie"></i> Visão Geral & Extrato
        </button>

        <button
          className="role-tab-btn"
          onClick={() => setActiveSubTab('contratos')}
          style={{
            background: activeSubTab === 'contratos' ? 'var(--color-primary)' : 'transparent',
            color: activeSubTab === 'contratos' ? '#fff' : 'var(--text-muted)',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.82rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fa-solid fa-file-contract"></i> Faturamento de Contratos ({clients.length})
        </button>

        <button
          className="role-tab-btn"
          onClick={() => setActiveSubTab('avulsa')}
          style={{
            background: activeSubTab === 'avulsa' ? 'var(--color-primary)' : 'transparent',
            color: activeSubTab === 'avulsa' ? '#fff' : 'var(--text-muted)',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.82rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fa-solid fa-plus-circle"></i> Emitir Boleto Avulso
        </button>

        <button
          className="role-tab-btn"
          onClick={() => setActiveSubTab('assinaturas')}
          style={{
            background: activeSubTab === 'assinaturas' ? 'var(--color-primary)' : 'transparent',
            color: activeSubTab === 'assinaturas' ? '#fff' : 'var(--text-muted)',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.82rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fa-solid fa-repeat"></i> Assinaturas Recorrentes ({subscriptionsList.length})
        </button>

        <button
          className="role-tab-btn"
          onClick={() => setActiveSubTab('historico_avulsas')}
          style={{
            background: activeSubTab === 'historico_avulsas' ? 'var(--color-primary)' : 'transparent',
            color: activeSubTab === 'historico_avulsas' ? '#fff' : 'var(--text-muted)',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.82rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap'
          }}
        >
          <i className="fa-solid fa-list-check"></i> Histórico de Boletos ({standalonePayments.length})
        </button>
      </div>

      {/* TAB 1: VISÃO GERAL */}
      {activeSubTab === 'visao_geral' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div className="content-panel" style={{ padding: '24px' }}>
            <div className="panel-header" style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-wand-magic-sparkles" style={{ color: 'var(--color-primary)' }}></i>
                Ações Rápidas de Faturamento
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                className="btn btn-primary"
                onClick={() => setActiveSubTab('avulsa')}
                style={{ justifyContent: 'flex-start', padding: '12px 16px', borderRadius: '10px' }}
              >
                <i className="fa-solid fa-file-invoice" style={{ marginRight: '8px' }}></i>
                Emitir Boleto Bancário Avulso
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setActiveSubTab('contratos')}
                style={{ justifyContent: 'flex-start', padding: '12px 16px', borderRadius: '10px' }}
              >
                <i className="fa-solid fa-file-signature" style={{ marginRight: '8px' }}></i>
                Faturar Contratos Assinados (Clicksign)
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setFormType('assinatura');
                  setActiveSubTab('avulsa');
                }}
                style={{ justifyContent: 'flex-start', padding: '12px 16px', borderRadius: '10px' }}
              >
                <i className="fa-solid fa-repeat" style={{ marginRight: '8px' }}></i>
                Criar Nova Assinatura Recorrente em Boleto
              </button>
            </div>
          </div>

          <div className="content-panel" style={{ padding: '24px' }}>
            <div className="panel-header" style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-shield-halved" style={{ color: 'var(--color-primary)' }}></i>
                Diretrizes Oficiais da Automação Asaas
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Método Exclusivo:</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>📄 Boleto Bancário Registrado</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Canal de Comunicação com Alunos:</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>💬 Exclusivamente WhatsApp</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Gatilho de Faturamento de Contratos:</span>
                <span style={{ color: '#60a5fa', fontWeight: 700 }}>🔒 Após Assinatura Clicksign</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Juros e Multa Padrão:</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>✓ 2% Multa + 1% a.m.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FATURAMENTO DE CONTRATOS (CLICKSIGN GATE) */}
      {activeSubTab === 'contratos' && (
        <div className="content-panel" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ flex: '1 1 240px', maxWidth: '300px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por aluno, plano, CPF, status..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  <i className="fa-solid fa-filter" style={{ color: 'var(--color-primary)', marginRight: '4px' }}></i> Status:
                </label>
                <select
                  className="select-custom"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  style={{ minWidth: '150px', fontSize: '0.83rem', padding: '6px 10px' }}
                >
                  <option value="todos">🌐 Todos os Status</option>
                  <option value="gerado">⚡ Boletos Gerados</option>
                  <option value="nao_gerado">⏳ Pronto para Faturar</option>
                  <option value="pago">✓ Boletos Pagos</option>
                  <option value="pendente">⚠️ Aguardando Pagto</option>
                </select>
              </div>

              {(searchQuery !== '' || statusFilter !== 'todos') && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('todos');
                  }}
                  style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <i className="fa-solid fa-xmark"></i> Limpar
                </button>
              )}
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Plano & Total</th>
                  <th>Condição Comercial</th>
                  <th>1º Vencimento</th>
                  <th>Status Clicksign</th>
                  <th style={{ textAlign: 'right' }}>Ação de Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>
                      <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px', color: 'var(--color-primary)' }}></i>
                      Carregando dados financeiros...
                    </td>
                  </tr>
                ) : filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      Nenhum aluno encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map(c => {
                    const isPaid = c.asaasBillingStatus === 'pago' || c.asaasBillingStatus === 'CONFIRMED' || c.asaasBillingStatus === 'RECEIVED';
                    const isOverdue = c.asaasBillingStatus === 'vencido' || c.asaasBillingStatus === 'OVERDUE';
                    const hasBilling = c.status === 'gerado';
                    const numP = c.parcelas || 1;
                    const valParcela = numP > 0 ? (c.valorLiquido || 0) / numP : (c.valorLiquido || 0);

                    return (
                      <tr key={c.clientId}>
                        <td>
                          <strong>{c.nome}</strong>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {c.cpf || 'Sem CPF'} • {c.telefone || 'Sem Tel'}
                          </div>
                        </td>
                        <td>
                          <div>{c.planoNome || 'Plano Personalizado'}</div>
                          <strong style={{ color: 'var(--color-primary)', fontSize: '0.85rem' }}>
                            R$ {formatCurrencyBRL(c.valorLiquido)}
                          </strong>
                        </td>
                        <td>
                          <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-main)' }}>
                            {numP > 1 ? `${numP}x de R$ ${formatCurrencyBRL(valParcela)}` : 'À Vista em Boleto'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem' }}>
                            {c.dataPrimeiroVencimento ? new Date(c.dataPrimeiroVencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                          </span>
                        </td>
                        <td>
                          {c.isSignedClicksign ? (
                            <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <i className="fa-solid fa-signature"></i> Assinado
                            </span>
                          ) : (
                            <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <i className="fa-solid fa-lock"></i> Pendente Assinatura
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {c.status === 'nao_gerado' && c.contractId && (
                              c.isSignedClicksign ? (
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleGenerateContractBilling(c.contractId!)}
                                  disabled={generatingId === c.contractId}
                                  style={{ fontSize: '0.75rem', padding: '6px 12px', background: '#10b981', borderColor: '#10b981', fontWeight: 700 }}
                                  title="Faturar contrato e agendar boletos no Asaas"
                                >
                                  {generatingId === c.contractId ? (
                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                  ) : (
                                    <>📑 Faturar Contrato em Boletos</>
                                  )}
                                </button>
                              ) : (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  disabled
                                  style={{ fontSize: '0.72rem', padding: '5px 10px', opacity: 0.6, cursor: 'not-allowed', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.3)' }}
                                  title="O faturamento só é liberado após o contrato ser assinado na Clicksign"
                                >
                                  <i className="fa-solid fa-lock" style={{ marginRight: '4px' }}></i>
                                  Aguardando Assinatura Clicksign
                                </button>
                              )
                            )}

                            {hasBilling && (
                              <>
                                {c.asaasBoletoPdf && (
                                  <a
                                    href={c.asaasBoletoPdf}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: '0.75rem', padding: '5px 9px' }}
                                    title="Visualizar Boleto em PDF"
                                  >
                                    <i className="fa-solid fa-file-pdf" style={{ color: '#ef4444' }}></i> Boleto PDF
                                  </a>
                                )}

                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleSendWhatsAppBilling(c)}
                                  style={{ fontSize: '0.75rem', padding: '5px 9px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                                  title="Reenviar Boleto no WhatsApp do Aluno"
                                >
                                  <i className="fa-brands fa-whatsapp"></i> Reenviar no WhatsApp
                                </button>

                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleSyncContract(c.contractId!)}
                                  disabled={syncingId === c.contractId}
                                  style={{ fontSize: '0.75rem', padding: '5px 9px' }}
                                  title="Sincronizar status do boleto com o Asaas"
                                >
                                  <i className={`fa-solid fa-rotate-right ${syncingId === c.contractId ? 'fa-spin' : ''}`}></i>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: EMITIR BOLETO AVULSO (COM RESUMO DE VALORES AO LADO) */}
      {activeSubTab === 'avulsa' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1.2fr) minmax(280px, 0.8fr)', gap: '24px', alignItems: 'start' }}>
          
          {/* Form Column */}
          <div className="content-panel" style={{ padding: '24px' }}>
            <div className="panel-header" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-file-invoice" style={{ color: 'var(--color-primary)' }}></i>
                Emitir Boleto Bancário no Asaas
              </h2>
            </div>

            <form onSubmit={handleCreateStandalone}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                    Modalidade de Emissão em Boleto:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                    <button
                      type="button"
                      className={`btn ${formType === 'avulsa' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setFormType('avulsa')}
                      style={{ fontSize: '0.82rem', padding: '10px' }}
                    >
                      📄 Boleto Avulso (1x)
                    </button>
                    <button
                      type="button"
                      className={`btn ${formType === 'parcelamento' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setFormType('parcelamento')}
                      style={{ fontSize: '0.82rem', padding: '10px' }}
                    >
                      📑 Parcelamento em Boletos
                    </button>
                    <button
                      type="button"
                      className={`btn ${formType === 'assinatura' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setFormType('assinatura')}
                      style={{ fontSize: '0.82rem', padding: '10px' }}
                    >
                      🔄 Assinatura Recorrente (Boleto)
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                    Selecione o Aluno (Dados Blindados): *
                  </label>
                  <select
                    className="select-custom"
                    value={formClientId}
                    onChange={e => setFormClientId(e.target.value)}
                    required
                  >
                    <option value="">-- Selecione o Aluno --</option>
                    {clients.map(c => (
                      <option key={c.clientId} value={c.clientId}>
                        {c.nome} ({c.cpf || 'Sem CPF'})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                      Valor Total (R$): *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      placeholder="0,00"
                      value={formValor || ''}
                      onChange={e => setFormValor(Number(e.target.value))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                      Data de Vencimento: *
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={formVencimento}
                      onChange={e => setFormVencimento(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {formType === 'parcelamento' && (
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                      Quantidade de Parcelas em Boleto:
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={24}
                      className="form-control"
                      value={formParcelas}
                      onChange={e => setFormParcelas(Number(e.target.value))}
                      required
                    />
                  </div>
                )}

                {formType === 'assinatura' && (
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                      Ciclo de Cobrança em Boleto:
                    </label>
                    <select
                      className="select-custom"
                      value={formCycle}
                      onChange={e => setFormCycle(e.target.value)}
                    >
                      <option value="MONTHLY">Mensal (Boleto gerado 5 dias antes no WhatsApp)</option>
                      <option value="QUARTERLY">Trimestral</option>
                      <option value="SEMIANNUALLY">Semestral</option>
                      <option value="YEARLY">Anual</option>
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                    Descrição / Motivo do Boleto:
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ex: Mensalidade, Sessão Avulsa, Avaliação..."
                    value={formDescricao}
                    onChange={e => setFormDescricao(e.target.value)}
                  />
                </div>

                <div style={{ marginTop: '10px' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submittingForm}
                    style={{ width: '100%', padding: '12px', fontSize: '0.95rem', fontWeight: 700, background: '#10b981', borderColor: '#10b981' }}
                  >
                    {submittingForm ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                        Emitindo Boleto no Asaas...
                      </>
                    ) : (
                      <>📄 Emitir Boleto Oficial no Asaas & Enviar no WhatsApp</>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Side Values Summary Card */}
          <div className="content-panel" style={{ padding: '24px', background: 'rgba(14, 26, 43, 0.65)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-calculator" style={{ color: '#60a5fa' }}></i>
              Resumo do Boleto a Ser Lançado
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
              <div style={{ paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Aluno Selecionado:</span>
                <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>
                  {selectedFormClient?.nome || 'Nenhum aluno selecionado'}
                </strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  CPF: {selectedFormClient?.cpf || '—'}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Valor Líquido:</span>
                <strong style={{ color: '#10b981', fontSize: '1.05rem' }}>
                  R$ {formatCurrencyBRL(formValor)}
                </strong>
              </div>

              {formType === 'parcelamento' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Parcelamento em Boletos:</span>
                  <span style={{ color: '#60a5fa', fontWeight: 700 }}>
                    {formParcelas}x de R$ {formatCurrencyBRL(formValor / (formParcelas || 1))}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Data de Vencimento:</span>
                <strong style={{ color: 'var(--text-main)' }}>
                  {formVencimento ? new Date(formVencimento + 'T00:00:00').toLocaleDateString('pt-BR') : 'Hoje'}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Multa / Juros de Mora:</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>2% Multa + 1% a.m.</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Canal de Notificação:</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>💬 Exclusivamente WhatsApp</span>
              </div>

              <div style={{ marginTop: '8px', padding: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', fontSize: '0.78rem', color: '#10b981' }}>
                <i className="fa-solid fa-circle-check" style={{ marginRight: '6px' }}></i>
                Ao emitir, o Asaas gera a linha digitável oficial, código de barras e link em PDF com envio automático no WhatsApp.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ASSINATURAS RECORRENTES EM BOLETO */}
      {activeSubTab === 'assinaturas' && (
        <div className="content-panel" style={{ padding: '24px' }}>
          <div className="panel-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <i className="fa-solid fa-repeat" style={{ color: 'var(--color-primary)' }}></i>
              Assinaturas Recorrentes em Boleto Bancário
            </h2>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setFormType('assinatura');
                setActiveSubTab('avulsa');
              }}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            >
              <i className="fa-solid fa-plus" style={{ marginRight: '4px' }}></i> Nova Assinatura em Boleto
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Descrição</th>
                  <th>Valor Mensal</th>
                  <th>Próximo Vencimento</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {subscriptionsList.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      Nenhuma assinatura recorrente em boleto registrada ainda.
                    </td>
                  </tr>
                ) : (
                  subscriptionsList.map(s => (
                    <tr key={s._id}>
                      <td><strong>{s.clientNome}</strong></td>
                      <td>{s.planoNome}</td>
                      <td><strong style={{ color: '#10b981' }}>R$ {formatCurrencyBRL(s.valor)}</strong></td>
                      <td>{s.vencimento ? new Date(s.vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                      <td>
                        <span className="badge badge-success">✓ Ativa</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {s.asaasInvoiceUrl && (
                            <a
                              href={s.asaasInvoiceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                            >
                              Ver Boleto
                            </a>
                          )}
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleSendWhatsAppStandalone(s)}
                            style={{ fontSize: '0.75rem', padding: '5px 9px', color: '#10b981' }}
                            title="Reenviar no WhatsApp"
                          >
                            <i className="fa-brands fa-whatsapp"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: HISTÓRICO DE BOLETOS EMITIDOS */}
      {activeSubTab === 'historico_avulsas' && (
        <div className="content-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <i className="fa-solid fa-list-check" style={{ color: 'var(--color-primary)' }}></i>
              Histórico Completo de Boletos Emitidos
            </h2>
            
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por aluno, plano, status..."
              value={standaloneSearchQuery}
              onChange={e => setStandaloneSearchQuery(e.target.value)}
              style={{ maxWidth: '300px' }}
            />
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações / WhatsApp</th>
                </tr>
              </thead>
              <tbody>
                {filteredStandalone.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      Nenhum boleto encontrado no histórico.
                    </td>
                  </tr>
                ) : (
                  filteredStandalone.map(p => (
                    <tr key={p._id}>
                      <td><strong>{p.clientNome}</strong></td>
                      <td>{p.planoNome}</td>
                      <td><strong style={{ color: 'var(--color-primary)' }}>R$ {formatCurrencyBRL(p.valor)}</strong></td>
                      <td>{p.vencimento ? new Date(p.vencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                      <td>
                        {p.status === 'Pago' ? (
                          <span className="badge badge-success">✓ Pago</span>
                        ) : p.status === 'Atrasado' ? (
                          <span className="badge badge-danger">⚠️ Atrasado</span>
                        ) : p.status === 'Cancelado' ? (
                          <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)' }}>Cancelado</span>
                        ) : (
                          <span className="badge badge-warning">⏳ Pendente</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {p.asaasInvoiceUrl ? (
                            <a
                              href={p.asaasInvoiceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                            >
                              <i className="fa-solid fa-file-pdf" style={{ color: '#ef4444', marginRight: '4px' }}></i>
                              Boleto
                            </a>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>—</span>
                          )}

                          {p.status !== 'Cancelado' && (
                            <>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleSendWhatsAppStandalone(p)}
                                style={{ fontSize: '0.75rem', padding: '5px 9px', color: '#10b981' }}
                                title="Reenviar Boleto no WhatsApp"
                              >
                                <i className="fa-brands fa-whatsapp"></i>
                              </button>

                              {p.status !== 'Pago' && (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleCancelPayment(p.asaasPaymentId, p._id)}
                                  disabled={cancelingId === p._id}
                                  style={{ fontSize: '0.75rem', padding: '5px 9px', color: '#ef4444' }}
                                  title="Cancelar Boleto"
                                >
                                  {cancelingId === p._id ? (
                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                  ) : (
                                    <i className="fa-solid fa-xmark"></i>
                                  )}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: SUCESSO DE EMISSÃO DE BOLETO */}
      {showSuccessDetailsModal && successDetails && (
        <div className="modal-overlay" style={{ padding: '20px' }} onClick={() => setShowSuccessDetailsModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '95%' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-circle-check"></i>
                Boleto Emitido com Sucesso no Asaas!
              </h3>
              <button className="modal-close" onClick={() => setShowSuccessDetailsModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                O boleto bancário já está registrado oficialmente e programado para envio no WhatsApp do aluno.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {successDetails.invoiceUrl && (
                  <a
                    href={successDetails.invoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{ padding: '12px', justifyContent: 'center', background: '#10b981', borderColor: '#10b981', fontWeight: 700 }}
                  >
                    <i className="fa-solid fa-file-invoice" style={{ marginRight: '8px' }}></i>
                    Abrir Página do Boleto no Asaas
                  </a>
                )}

                {successDetails.bankSlipUrl && (
                  <a
                    href={successDetails.bankSlipUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ padding: '12px', justifyContent: 'center', fontWeight: 600 }}
                  >
                    <i className="fa-solid fa-file-pdf" style={{ marginRight: '8px', color: '#ef4444' }}></i>
                    Baixar Boleto em PDF
                  </a>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowSuccessDetailsModal(false)}>
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
