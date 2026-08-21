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
  asaasPixCopyPaste?: string;
  asaasPixQrCode?: string;
  asaasBillingStatus?: string;
  contractStatus?: string;
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

  // Standalone form states
  const [formClientId, setFormClientId] = useState('');
  const [formType, setFormType] = useState<'avulsa' | 'parcelamento' | 'assinatura'>('avulsa');
  const [formValor, setFormValor] = useState<number>(0);
  const [formVencimento, setFormVencimento] = useState<string>('');
  const [formFormaPagamento, setFormFormaPagamento] = useState<string>('pix');
  const [formDescricao, setFormDescricao] = useState<string>('');
  const [formParcelas, setFormParcelas] = useState<number>(2);
  const [formCycle, setFormCycle] = useState<string>('MONTHLY');
  const [submittingForm, setSubmittingForm] = useState(false);

  // Syncing & Actions
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [isProduction, setIsProduction] = useState(true);

  // Modals & Feedback
  const [showPixModal, setShowPixModal] = useState(false);
  const [selectedPix, setSelectedPix] = useState<{ qrCode: string; payload: string; name: string; value?: number; invoiceUrl?: string } | null>(null);
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
    fetchStandalonePayments();
  }, []);

  const fetchPayments = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/admin/asaas');
      if (!res.ok) {
        let errMessage = `Servidor retornou status ${res.status}`;
        try {
          const errData = await res.json();
          if (errData?.error) errMessage = errData.error;
        } catch {}
        console.warn('Aviso Asaas:', errMessage);
        return;
      }
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setClients(json.data);
        if (json.isProduction !== undefined) setIsProduction(json.isProduction);
        if (json.balance) setBalance(json.balance);
      }
    } catch (e: any) {
      console.warn('Aviso ao consultar Asaas:', e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStandalonePayments = async () => {
    setLoadingStandalone(true);
    try {
      const res = await fetch('/api/admin/asaas?type=standalone');
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setStandalonePayments(json.data);
      }
    } catch (e: any) {
      console.warn('Aviso ao consultar avulsas:', e?.message || e);
    } finally {
      setLoadingStandalone(false);
    }
  };

  const handleSyncContract = async (contractId: string) => {
    setSyncingId(contractId);
    try {
      const res = await fetch('/api/admin/asaas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: 'Status da cobrança sincronizado com o Asaas com sucesso!', type: 'success' });
        await fetchPayments(true);
      } else {
        setMessage({ text: data.error || 'Erro ao sincronizar cobrança.', type: 'danger' });
      }
    } catch (e: any) {
      setMessage({ text: 'Erro de rede: ' + e.message, type: 'danger' });
    } finally {
      setSyncingId(null);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleGenerateContractBilling = async (contractId: string) => {
    setGeneratingId(contractId);
    try {
      const res = await fetch('/api/admin/asaas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: 'Cobrança gerada no Asaas com sucesso!', type: 'success' });
        setSuccessDetails(data.data);
        setShowSuccessDetailsModal(true);
        await fetchPayments(true);
      } else {
        setMessage({ text: data.error || 'Erro ao gerar cobrança no Asaas.', type: 'danger' });
      }
    } catch (e: any) {
      setMessage({ text: 'Erro de rede: ' + e.message, type: 'danger' });
    } finally {
      setGeneratingId(null);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleOpenPixModal = async (c: AsaasClientInfo) => {
    if (c.asaasPixQrCode && c.asaasPixCopyPaste) {
      setSelectedPix({
        qrCode: c.asaasPixQrCode,
        payload: c.asaasPixCopyPaste,
        name: c.nome,
        value: c.valorLiquido,
        invoiceUrl: c.asaasInvoiceUrl
      });
      setShowPixModal(true);
      return;
    }

    if (c.asaasPaymentId) {
      setSyncingId(c.contractId || c.clientId);
      try {
        const res = await fetch(`/api/admin/asaas?action=pix_qr&paymentId=${c.asaasPaymentId}`);
        const data = await res.json();
        if (data.success && data.data?.encodedImage) {
          setSelectedPix({
            qrCode: data.data.encodedImage,
            payload: data.data.payload,
            name: c.nome,
            value: c.valorLiquido,
            invoiceUrl: c.asaasInvoiceUrl
          });
          setShowPixModal(true);
        } else {
          if (c.asaasInvoiceUrl) window.open(c.asaasInvoiceUrl, '_blank');
        }
      } catch {
        if (c.asaasInvoiceUrl) window.open(c.asaasInvoiceUrl, '_blank');
      } finally {
        setSyncingId(null);
      }
    } else if (c.asaasInvoiceUrl) {
      window.open(c.asaasInvoiceUrl, '_blank');
    }
  };

  const handleSendWhatsAppBilling = (c: AsaasClientInfo) => {
    const rawPhone = (c.telefone || '').replace(/\D/g, '');
    if (!rawPhone) {
      alert('Telefone do aluno não cadastrado.');
      return;
    }
    const phone = rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone;
    const link = c.asaasInvoiceUrl || c.asaasBoletoPdf || '';
    const text = `Olá, ${c.nome}! 👋\n\nSeguem as informações do seu pagamento referente ao *${c.planoNome || 'Plano Clube Fitness'}* no valor de *R$ ${formatCurrencyBRL(c.valorLiquido)}*.\n\n🔗 *Link para Pagamento (Pix / Boleto / Cartão):*\n${link}\n\nQualquer dúvida estamos à disposição! 🏋️‍♂️✨`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCreateStandalone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId || !formValor) {
      alert('Selecione o aluno e informe o valor.');
      return;
    }

    setSubmittingForm(true);
    try {
      const payload: any = {
        action: formType === 'avulsa' ? 'create_avulsa' : formType === 'parcelamento' ? 'create_parcelamento' : 'create_assinatura',
        clientId: formClientId,
        valor: formValor,
        vencimento: formVencimento,
        formaPagamento: formFormaPagamento,
        descricao: formDescricao,
        parcelas: formParcelas,
        cycle: formCycle
      };

      const res = await fetch('/api/admin/asaas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ text: 'Cobrança avulsa emitida no Asaas com sucesso!', type: 'success' });
        setFormValor(0);
        setFormDescricao('');
        setSuccessDetails(data.data);
        setShowSuccessDetailsModal(true);
        fetchStandalonePayments();
        fetchPayments(true);
      } else {
        setMessage({ text: data.error || 'Erro ao emitir cobrança.', type: 'danger' });
      }
    } catch (e: any) {
      setMessage({ text: 'Erro de rede: ' + e.message, type: 'danger' });
    } finally {
      setSubmittingForm(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  // Filtered lists with Smart Search
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchesSearch = smartSearchMatch(searchQuery, [
        c.nome,
        c.cpf,
        c.email,
        c.telefone,
        c.planoNome,
        c.asaasBillingStatus
      ]);

      if (!matchesSearch) return false;
      if (statusFilter === 'todos') return true;
      if (statusFilter === 'gerado') return c.status === 'gerado';
      if (statusFilter === 'nao_gerado') return c.status === 'nao_gerado';
      if (statusFilter === 'pago') return c.asaasBillingStatus === 'pago' || c.asaasBillingStatus === 'CONFIRMED' || c.asaasBillingStatus === 'RECEIVED';
      if (statusFilter === 'pendente') return c.asaasBillingStatus === 'pendente' || c.asaasBillingStatus === 'PENDING';
      return true;
    });
  }, [clients, searchQuery, statusFilter]);

  const subscriptionsList = useMemo(() => {
    return standalonePayments.filter(p => (p.observacoes || '').toLowerCase().includes('assinatura') || (p.planoNome || '').toLowerCase().includes('assinatura'));
  }, [standalonePayments]);

  const filteredStandalone = useMemo(() => {
    return standalonePayments.filter(p => smartSearchMatch(standaloneSearchQuery, [
      p.clientNome,
      p.planoNome,
      p.observacoes,
      p.status
    ]));
  }, [standalonePayments, standaloneSearchQuery]);

  return (
    <div style={{ width: '100%', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* Toast Feedback */}
      {message && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 99999,
          padding: '14px 22px',
          borderRadius: '10px',
          background: message.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '0.9rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
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
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Central de Faturamento & Pagamentos Asaas
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', margin: '4px 0 0 0' }}>
              Gestão de cobranças automáticas via Pix Dinâmico, Boletos Registrados e Assinaturas no Cartão.
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
              Webhook de Retorno Ativo: <code style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{webhookUrl}</code>
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
            <h3 style={{ color: '#f472b6' }}>Assinaturas Cartão</h3>
            <div className="value" style={{ color: '#f472b6' }}>{subscriptionsList.length}</div>
          </div>
          <div className="metric-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
            <i className="fa-solid fa-credit-card"></i>
          </div>
        </div>
      </div>

      {/* Modern Pill Navigation Tabs */}
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
          <i className="fa-solid fa-plus-circle"></i> Emitir Cobrança Avulsa
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
          <i className="fa-solid fa-list-check"></i> Histórico de Transações ({standalonePayments.length})
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
                <i className="fa-solid fa-qrcode" style={{ marginRight: '8px' }}></i>
                Gerar Cobrança Pix / Boleto Avulso
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setActiveSubTab('contratos')}
                style={{ justifyContent: 'flex-start', padding: '12px 16px', borderRadius: '10px' }}
              >
                <i className="fa-solid fa-file-signature" style={{ marginRight: '8px' }}></i>
                Faturar Contratos Pendentes de Alunos
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setFormType('assinatura');
                  setActiveSubTab('avulsa');
                }}
                style={{ justifyContent: 'flex-start', padding: '12px 16px', borderRadius: '10px' }}
              >
                <i className="fa-solid fa-credit-card" style={{ marginRight: '8px' }}></i>
                Criar Nova Assinatura Recorrente no Cartão
              </button>
            </div>
          </div>

          <div className="content-panel" style={{ padding: '24px' }}>
            <div className="panel-header" style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-shield-halved" style={{ color: 'var(--color-primary)' }}></i>
                Status da Automação Bancária
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Baixa Automática via Pix:</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>✓ Instantânea (&lt; 3s)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Compensação de Boleto:</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>D+1 útil</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Notificações por WhatsApp/SMS:</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>✓ Régua Ativa Asaas</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Juros e Multa Automáticos:</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>✓ 2% Multa + 1% a.m.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FATURAMENTO DE CONTRATOS */}
      {activeSubTab === 'contratos' && (
        <div className="content-panel" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div style={{ flex: '1 1 240px', maxWidth: '300px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por nome, plano, CPF, status..."
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
                  <option value="gerado">⚡ Cobrança Gerada</option>
                  <option value="nao_gerado">⏳ Pendente de Gerar</option>
                  <option value="pago">✓ Pagos</option>
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
                  <th>Plano & Valor</th>
                  <th>Forma & Parcelas</th>
                  <th>Vencimento</th>
                  <th>Status Asaas</th>
                  <th style={{ textAlign: 'right' }}>Ações Rápidas</th>
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
                            {c.formaPagamento?.toUpperCase() || 'PIX'}
                          </span>
                          {c.parcelas && c.parcelas > 1 && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                              ({c.parcelas}x)
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem' }}>
                            {c.dataPrimeiroVencimento ? new Date(c.dataPrimeiroVencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                          </span>
                        </td>
                        <td>
                          {isPaid ? (
                            <span className="badge badge-success">✓ Pago</span>
                          ) : isOverdue ? (
                            <span className="badge badge-danger">⚠️ Vencido</span>
                          ) : hasBilling ? (
                            <span className="badge badge-warning">⏳ Pendente</span>
                          ) : c.status === 'nao_gerado' ? (
                            <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>Pronto p/ Gerar</span>
                          ) : (
                            <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)' }}>Sem Contrato</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                            {c.status === 'nao_gerado' && c.contractId && (
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleGenerateContractBilling(c.contractId!)}
                                disabled={generatingId === c.contractId}
                                style={{ fontSize: '0.75rem', padding: '5px 10px', background: '#10b981', borderColor: '#10b981' }}
                                title="Gerar cobrança no Asaas"
                              >
                                {generatingId === c.contractId ? (
                                  <i className="fa-solid fa-spinner fa-spin"></i>
                                ) : (
                                  <>⚡ Gerar Cobrança</>
                                )}
                              </button>
                            )}

                            {hasBilling && (
                              <>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleOpenPixModal(c)}
                                  style={{ fontSize: '0.75rem', padding: '5px 9px' }}
                                  title="Ver QR Code Pix ou Link"
                                >
                                  <i className="fa-brands fa-pix" style={{ color: '#10b981' }}></i>
                                </button>

                                {c.asaasBoletoPdf && (
                                  <a
                                    href={c.asaasBoletoPdf}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: '0.75rem', padding: '5px 9px' }}
                                    title="Visualizar Boleto em PDF"
                                  >
                                    <i className="fa-solid fa-file-pdf" style={{ color: '#ef4444' }}></i>
                                  </a>
                                )}

                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleSendWhatsAppBilling(c)}
                                  style={{ fontSize: '0.75rem', padding: '5px 9px' }}
                                  title="Enviar no WhatsApp do Aluno"
                                >
                                  <i className="fa-brands fa-whatsapp" style={{ color: '#10b981' }}></i>
                                </button>

                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleSyncContract(c.contractId!)}
                                  disabled={syncingId === c.contractId}
                                  style={{ fontSize: '0.75rem', padding: '5px 9px' }}
                                  title="Sincronizar status com o Asaas"
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

      {/* TAB 3: EMITIR COBRANÇA AVULSA */}
      {activeSubTab === 'avulsa' && (
        <div className="content-panel" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
          <div className="panel-header" style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-plus-circle" style={{ color: 'var(--color-primary)' }}></i>
              Emitir Nova Cobrança no Asaas
            </h2>
          </div>

          <form onSubmit={handleCreateStandalone}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                  Modalidade de Cobrança:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                  <button
                    type="button"
                    className={`btn ${formType === 'avulsa' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFormType('avulsa')}
                    style={{ fontSize: '0.82rem', padding: '10px' }}
                  >
                    🪙 Cobrança Avulsa (À Vista)
                  </button>
                  <button
                    type="button"
                    className={`btn ${formType === 'parcelamento' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFormType('parcelamento')}
                    style={{ fontSize: '0.82rem', padding: '10px' }}
                  >
                    📑 Parcelamento (Carnê/Boleto)
                  </button>
                  <button
                    type="button"
                    className={`btn ${formType === 'assinatura' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFormType('assinatura')}
                    style={{ fontSize: '0.82rem', padding: '10px' }}
                  >
                    🔄 Assinatura no Cartão
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                  Selecione o Aluno: *
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

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                  Meio de Pagamento:
                </label>
                <select
                  className="select-custom"
                  value={formFormaPagamento}
                  onChange={e => setFormFormaPagamento(e.target.value)}
                >
                  <option value="pix">💠 Pix Instantâneo (QR Code Dinâmico)</option>
                  <option value="boleto">📄 Boleto Bancário Registrado</option>
                  <option value="cartao">💳 Cartão de Crédito</option>
                </select>
              </div>

              {formType === 'parcelamento' && (
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                    Quantidade de Parcelas:
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
                    Ciclo de Cobrança:
                  </label>
                  <select
                    className="select-custom"
                    value={formCycle}
                    onChange={e => setFormCycle(e.target.value)}
                  >
                    <option value="MONTHLY">Mensal</option>
                    <option value="QUARTERLY">Trimestral</option>
                    <option value="SEMIANNUALLY">Semestral</option>
                    <option value="YEARLY">Anual</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px', display: 'block' }}>
                  Descrição / Motivo da Cobrança:
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Sessão de Quiropraxia, Avaliação Física Extra..."
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
                      Gerando no Asaas...
                    </>
                  ) : (
                    <>⚡ Emitir Cobrança Oficial no Asaas</>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: ASSINATURAS RECORRENTES */}
      {activeSubTab === 'assinaturas' && (
        <div className="content-panel" style={{ padding: '24px' }}>
          <div className="panel-header" style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-repeat" style={{ color: 'var(--color-primary)' }}></i>
              Assinaturas Recorrentes no Cartão de Crédito
            </h2>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Descrição da Assinatura</th>
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
                      Nenhuma assinatura recorrente registrada ainda. Crie uma na aba "Emitir Cobrança".
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
                        {s.asaasInvoiceUrl && (
                          <a
                            href={s.asaasInvoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                          >
                            Ver Fatura
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: HISTÓRICO DE TRANSAÇÕES */}
      {activeSubTab === 'historico_avulsas' && (
        <div className="content-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <i className="fa-solid fa-list-check" style={{ color: 'var(--color-primary)' }}></i>
              Histórico Completo de Cobranças Emitidas
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
                  <th style={{ textAlign: 'right' }}>Link / Fatura</th>
                </tr>
              </thead>
              <tbody>
                {filteredStandalone.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      Nenhuma cobrança avulsa encontrada.
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
                        ) : (
                          <span className="badge badge-warning">⏳ Pendente</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {p.asaasInvoiceUrl ? (
                          <a
                            href={p.asaasInvoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                          >
                            Abrir Link
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: PIX DINÂMICO QR CODE & COPIA E COLA */}
      {showPixModal && selectedPix && (
        <div className="modal-overlay" style={{ padding: '20px' }} onClick={() => setShowPixModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '95%', textAlign: 'center' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-brands fa-pix" style={{ color: '#10b981' }}></i>
                Pix Dinâmico Instantâneo
              </h3>
              <button className="modal-close" onClick={() => setShowPixModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '24px 20px' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Aluno: <strong>{selectedPix.name}</strong>
                {selectedPix.value && (
                  <> • Valor: <strong style={{ color: '#10b981' }}>R$ {formatCurrencyBRL(selectedPix.value)}</strong></>
                )}
              </p>

              {selectedPix.qrCode && (
                <div style={{
                  background: '#ffffff',
                  padding: '16px',
                  borderRadius: '12px',
                  display: 'inline-block',
                  marginBottom: '18px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}>
                  <img
                    src={`data:image/png;base64,${selectedPix.qrCode}`}
                    alt="Pix QR Code"
                    style={{ width: '220px', height: '220px', display: 'block' }}
                  />
                </div>
              )}

              {selectedPix.payload && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Chave Pix Copia e Cola:
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-control"
                      readOnly
                      value={selectedPix.payload}
                      style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.4)' }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedPix.payload);
                        alert('✓ Chave Pix Copia e Cola copiada para a área de transferência!');
                      }}
                      style={{ flexShrink: 0 }}
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              )}

              {selectedPix.invoiceUrl && (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Olá, ${selectedPix.name}! Segue o link para pagamento via Pix no valor de R$ ${formatCurrencyBRL(selectedPix.value)}:\n\n${selectedPix.invoiceUrl}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', background: '#10b981', borderColor: '#10b981', fontWeight: 700 }}
                >
                  <i className="fa-brands fa-whatsapp" style={{ marginRight: '8px' }}></i>
                  Compartilhar no WhatsApp
                </a>
              )}
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowPixModal(false)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUCESSO DE GERAÇÃO */}
      {showSuccessDetailsModal && successDetails && (
        <div className="modal-overlay" style={{ padding: '20px' }} onClick={() => setShowSuccessDetailsModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '95%' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-circle-check"></i>
                Cobrança Emitida com Sucesso!
              </h3>
              <button className="modal-close" onClick={() => setShowSuccessDetailsModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                A cobrança já está registrada oficialmente no Asaas e pronta para pagamento.
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
                    <i className="fa-solid fa-arrow-up-right-from-square" style={{ marginRight: '8px' }}></i>
                    Abrir Página de Pagamento do Asaas
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
                    Baixar Boleto Bancário em PDF
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
