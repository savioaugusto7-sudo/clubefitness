'use client';

import React, { useEffect, useState } from 'react';
import { formatCurrencyBRL, selectOnFocus } from '@/utils/currencyMask';

interface AsaasClientInfo {
  clientId: string;
  nome: string;
  email: string;
  cpf: string;
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

const normalizeText = (str: string) => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

export default function AsaasPanel() {
  const [clients, setClients] = useState<AsaasClientInfo[]>([]);
  const [standalonePayments, setStandalonePayments] = useState<StandalonePaymentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStandalone, setLoadingStandalone] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'contratos' | 'avulsa' | 'historico_avulsas'>('contratos');
  
  // Client selection for contract flow
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  
  // Search query for lists
  const [searchQuery, setSearchQuery] = useState('');
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

  // Syncing states
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [isProduction, setIsProduction] = useState(false);

  // Modals & Feedback
  const [showPixModal, setShowPixModal] = useState(false);
  const [selectedPix, setSelectedPix] = useState<{ qrCode: string; payload: string; name: string } | null>(null);
  const [showSuccessDetailsModal, setShowSuccessDetailsModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState<any>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('https://clubefitness.vercel.app/api/webhooks/asaas');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/webhooks/asaas`);
    }
    fetchPayments();
    fetchStandalonePayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/asaas');
      const data = await res.json();
      if (data.success) {
        setClients(data.data || []);
        if (data.isProduction !== undefined) setIsProduction(data.isProduction);
      } else {
        showFeedback(data.error || 'Erro ao carregar faturas de contratos', 'danger');
      }
    } catch (e) {
      showFeedback('Erro de rede ao carregar faturas.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const fetchStandalonePayments = async () => {
    setLoadingStandalone(true);
    try {
      const res = await fetch('/api/admin/asaas?type=standalone');
      const data = await res.json();
      if (data.success) {
        setStandalonePayments(data.data || []);
      }
    } catch (e) {
      console.error('Erro ao carregar cobranças avulsas:', e);
    } finally {
      setLoadingStandalone(false);
    }
  };

  const showFeedback = (text: string, type: 'success' | 'danger') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  // Syncing a contract charge
  const handleSyncPayment = async (contractId: string) => {
    setSyncingId(contractId);
    try {
      const res = await fetch('/api/admin/asaas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId })
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('Cobrança sincronizada com sucesso!', 'success');
        fetchPayments();
      } else {
        showFeedback(data.error || 'Erro ao sincronizar cobrança', 'danger');
      }
    } catch (e) {
      showFeedback('Erro de rede ao sincronizar.', 'danger');
    } finally {
      setSyncingId(null);
    }
  };

  // Generating faturamento based on Contract
  const handleGenerateAsaasCharge = async (contractId: string) => {
    setGeneratingId(contractId);
    try {
      const res = await fetch('/api/admin/asaas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId })
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('Cobrança Asaas gerada com sucesso!', 'success');
        fetchPayments();
        fetchStandalonePayments();
      } else {
        showFeedback(data.error || 'Erro ao gerar cobrança no Asaas', 'danger');
      }
    } catch (err: any) {
      showFeedback('Erro de rede: ' + err.message, 'danger');
    } finally {
      setGeneratingId(null);
    }
  };

  // Submit standalone billing
  const handleCreateStandaloneBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId || formValor <= 0 || !formVencimento) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    
    setSubmittingForm(true);
    try {
      const actionMap = {
        avulsa: 'create_avulsa',
        parcelamento: 'create_parcelamento',
        assinatura: 'create_assinatura'
      };

      const payload = {
        action: actionMap[formType],
        clientId: formClientId,
        valor: formValor,
        vencimento: formVencimento,
        formaPagamento: formFormaPagamento,
        descricao: formDescricao,
        parcelas: formType === 'parcelamento' ? formParcelas : 1,
        cycle: formType === 'assinatura' ? formCycle : 'MONTHLY'
      };

      const res = await fetch('/api/admin/asaas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (data.success) {
        showFeedback('Cobrança avulsa gerada com sucesso!', 'success');
        
        // Load details for success modal
        let detailsObj = data.data;
        if (Array.isArray(data.data)) {
          const firstInstallment = data.data.find((p: any) => p.parcelaNumero === 1);
          detailsObj = firstInstallment || data.data[0];
        }
        setSuccessDetails(detailsObj);
        setShowSuccessDetailsModal(true);

        // Reset form
        setFormValor(0);
        setFormDescricao('');
        setFormVencimento('');

        fetchStandalonePayments();
      } else {
        showFeedback(data.error || 'Erro ao criar cobrança no Asaas', 'danger');
      }
    } catch (err: any) {
      showFeedback('Erro de rede: ' + err.message, 'danger');
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleCopyClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para a área de transferência!');
  };

  const filteredClients = clients.filter(c => {
    const name = c.nome || '';
    const cpf = c.cpf || '';
    const q = normalizeText(searchQuery);
    return normalizeText(name).includes(q) || cpf.includes(q);
  });

  const filteredStandalone = standalonePayments.filter(p => {
    const name = p.clientNome || '';
    const desc = p.planoNome || '';
    const q = normalizeText(standaloneSearchQuery);
    return normalizeText(name).includes(q) || normalizeText(desc).includes(q);
  });

  const activeClient = clients.find(c => c.clientId === selectedClientId);

  // Generate Simulation string
  const getFaturamentoSimulationText = (c: AsaasClientInfo) => {
    if (!c.valorLiquido || c.valorLiquido <= 0) return 'Dados comerciais incompletos ou valor nulo.';
    const fp = c.formaPagamento === 'pix' ? 'Pix' : c.formaPagamento === 'boleto' ? 'Boleto Bancário' : 'Cartão de Crédito';
    const vencStr = c.dataPrimeiroVencimento ? new Date(c.dataPrimeiroVencimento + 'T12:00:00').toLocaleDateString('pt-BR') : 'hoje';
    const parts = c.parcelas || 1;
    
    if (parts > 1) {
      const vParc = (c.valorLiquido / parts).toFixed(2).replace('.', ',');
      return `Será gerado um parcelamento de ${parts}x de R$ ${vParc} (Total: R$ ${c.valorLiquido.toFixed(2).replace('.', ',')}) via ${fp} com primeiro vencimento em ${vencStr}.`;
    } else {
      return `Será gerada uma cobrança única avulsa de R$ ${c.valorLiquido.toFixed(2).replace('.', ',')} via ${fp} com vencimento em ${vencStr}.`;
    }
  };

  return (
    <div className="content-panel" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            <i className="fa-solid fa-credit-card" style={{ marginRight: '8px', color: 'var(--color-primary)' }}></i> Central de Faturamento Asaas
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>Gerencie cobranças integradas a contratos, emita cobranças avulsas e controle o histórico financeiro.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => { fetchPayments(); fetchStandalonePayments(); }} disabled={loading || loadingStandalone}>
            <i className="fa-solid fa-arrows-rotate" style={{ marginRight: '6px' }}></i> Atualizar Dados
          </button>
          <a href={isProduction ? 'https://www.asaas.com' : 'https://sandbox.asaas.com'} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <i className="fa-solid fa-arrow-up-right-from-square"></i> Painel Operacional Asaas
          </a>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className={`fa-solid ${message.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
          <span>{message.text}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ambiente de Integração</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isProduction ? '#10b981' : '#f59e0b' }}></span>
            <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
              {isProduction ? 'Produção (Conta Real)' : 'Sandbox (Modo de Testes)'}
            </strong>
          </div>
          <small style={{ display: 'block', marginTop: '6px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            {isProduction ? 'Modo Real de Produção (Cobranças bancárias ativas).' : 'As transações criadas não representam cobranças bancárias reais.'}
          </small>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trilha de Retorno Webhook</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <code style={{ fontSize: '0.78rem', padding: '4px 6px', background: 'var(--bg-darker)', borderRadius: '4px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', flexGrow: 1, border: '1px solid var(--border-color)' }}>
              {webhookUrl}
            </code>
            <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', flexShrink: 0 }} onClick={() => handleCopyClipboard(webhookUrl)}>
              <i className="fa-solid fa-copy"></i>
            </button>
          </div>
          <small style={{ display: 'block', marginTop: '6px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Envio em tempo real de status de pagamentos.</small>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveSubTab('contratos')}
          style={{
            padding: '12px 20px',
            fontSize: '0.9rem',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: activeSubTab === 'contratos' ? 'var(--color-primary)' : 'var(--text-dim)',
            borderBottom: activeSubTab === 'contratos' ? '3px solid var(--color-primary)' : '3px solid transparent',
            marginBottom: '-2px',
            transition: 'all 0.2s'
          }}
        >
          <i className="fa-solid fa-file-contract" style={{ marginRight: '8px' }}></i> Faturamento de Contratos
        </button>

        <button
          onClick={() => setActiveSubTab('avulsa')}
          style={{
            padding: '12px 20px',
            fontSize: '0.9rem',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: activeSubTab === 'avulsa' ? 'var(--color-primary)' : 'var(--text-dim)',
            borderBottom: activeSubTab === 'avulsa' ? '3px solid var(--color-primary)' : '3px solid transparent',
            marginBottom: '-2px',
            transition: 'all 0.2s'
          }}
        >
          <i className="fa-solid fa-plus-circle" style={{ marginRight: '8px' }}></i> Cobrança Avulsa / Recorrente
        </button>

        <button
          onClick={() => setActiveSubTab('historico_avulsas')}
          style={{
            padding: '12px 20px',
            fontSize: '0.9rem',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: activeSubTab === 'historico_avulsas' ? 'var(--color-primary)' : 'var(--text-dim)',
            borderBottom: activeSubTab === 'historico_avulsas' ? '3px solid var(--color-primary)' : '3px solid transparent',
            marginBottom: '-2px',
            transition: 'all 0.2s'
          }}
        >
          <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: '8px' }}></i> Histórico de Avulsos ({standalonePayments.length})
        </button>
      </div>

      {/* SUBTAB 1: CONTRACT-BASED BILLING */}
      {activeSubTab === 'contratos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {/* Card Aluno Selector */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '0.88rem' }}>Selecione um Aluno para Faturar:</label>
            <select
              className="select-custom"
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              style={{ width: '100%', maxWidth: '500px', padding: '10px 14px' }}
            >
              <option value="">-- Selecione o Aluno --</option>
              {clients.map(c => (
                <option key={c.clientId} value={c.clientId}>
                  {c.nome} ({c.cpf ? `CPF: ${c.cpf}` : 'Sem CPF'})
                </option>
              ))}
            </select>
          </div>

          {/* Conditional detailed client summary */}
          {activeClient ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {/* Left Column: Contract & Commercial Summary */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 700 }}>
                    <i className="fa-solid fa-circle-info" style={{ marginRight: '6px', color: 'var(--color-primary)' }}></i> Detalhes do Aluno
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                    <div><strong>Nome:</strong> {activeClient.nome}</div>
                    <div><strong>Email:</strong> {activeClient.email || 'Não informado'}</div>
                    <div><strong>CPF:</strong> {activeClient.cpf || 'Não informado'}</div>
                    <div>
                      <strong>ID de Cliente Asaas:</strong>{' '}
                      {activeClient.asaasCustomerId ? (
                        <code style={{ background: 'var(--bg-darker)', padding: '2px 4px', borderRadius: '4px' }}>{activeClient.asaasCustomerId}</code>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Não gerado (será criado na primeira cobrança)</span>
                      )}
                    </div>
                  </div>
                </div>

                <hr style={{ border: '0', borderTop: '1px solid var(--border-color)', margin: '5px 0' }} />

                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 700 }}>
                    <i className="fa-solid fa-tags" style={{ marginRight: '6px', color: 'var(--color-primary)' }}></i> Dados Comerciais Vigentes
                  </h4>
                  
                  {/* Contract status indicator */}
                  <div style={{ marginBottom: '12px' }}>
                    {activeClient.status === 'sem_contrato' ? (
                      <span style={{ display: 'inline-block', color: 'var(--color-danger)', background: 'rgba(239,68,68,0.1)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                        <i className="fa-solid fa-circle-xmark" style={{ marginRight: '4px' }}></i> Sem Contrato Ativo
                      </span>
                    ) : activeClient.status === 'nao_gerado' ? (
                      <span style={{ display: 'inline-block', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                        <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '4px' }}></i> Contrato Pendente de Faturamento
                      </span>
                    ) : (
                      <span style={{ display: 'inline-block', color: 'var(--color-success)', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                        <i className="fa-solid fa-circle-check" style={{ marginRight: '4px' }}></i> Faturamento Ativo no Asaas
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                    <div><strong>Plano:</strong> {activeClient.planoNome || 'Sem plano associado'}</div>
                    <div><strong>Preço Contratual Líquido:</strong> {activeClient.valorLiquido ? `R$ ${activeClient.valorLiquido.toFixed(2).replace('.', ',')}` : '—'}</div>
                    <div><strong>Forma de Pagamento:</strong> <span style={{ textTransform: 'uppercase' }}>{activeClient.formaPagamento || '—'}</span></div>
                    <div><strong>Número de Parcelas:</strong> {activeClient.parcelas || 1}x</div>
                    <div>
                      <strong>Primeiro Vencimento:</strong>{' '}
                      {activeClient.dataPrimeiroVencimento ? new Date(activeClient.dataPrimeiroVencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Billing Control Panel & Simulation */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '15px' }}>
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 700 }}>
                    <i className="fa-solid fa-circle-nodes" style={{ marginRight: '6px', color: 'var(--color-primary)' }}></i> Ações de Faturamento
                  </h4>

                  {activeClient.status === 'sem_contrato' && (
                    <div className="alert alert-danger" style={{ fontSize: '0.82rem', margin: 0, padding: '12px' }}>
                      <strong>Não é possível faturar via contrato:</strong> Este aluno não possui nenhuma minuta de contrato emitida. Acesse a aba <strong>Gestão de Contratos</strong> para cadastrar um plano ou crie uma cobrança avulsa.
                    </div>
                  )}

                  {activeClient.status === 'nao_gerado' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#f59e0b', fontWeight: 600, marginBottom: '4px' }}>Simulador de Emissão Asaas:</div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                          {getFaturamentoSimulationText(activeClient)}
                        </p>
                      </div>

                      <button
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '12px', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                        onClick={() => handleGenerateAsaasCharge(activeClient.contractId || '')}
                        disabled={generatingId === activeClient.contractId}
                      >
                        {generatingId === activeClient.contractId ? (
                          <><i className="fa-solid fa-spinner fa-spin"></i> Emitindo Faturas no Asaas...</>
                        ) : (
                          <><i className="fa-solid fa-receipt"></i> Gerar Cobrança conforme Contrato</>
                        )}
                      </button>
                    </div>
                  )}

                  {activeClient.status === 'gerado' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div><strong>Status da Fatura:</strong> <span style={{ textTransform: 'uppercase', color: 'var(--color-success)', fontWeight: 700 }}>{activeClient.asaasBillingStatus || 'Pendente'}</span></div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>ID Cobrança Asaas: {activeClient.asaasPaymentId}</div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleSyncPayment(activeClient.contractId || '')}
                          disabled={syncingId === activeClient.contractId}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem' }}
                        >
                          {syncingId === activeClient.contractId ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-rotate"></i>} Sincronizar
                        </button>

                        {activeClient.asaasInvoiceUrl && (
                          <a
                            href={activeClient.asaasInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem' }}
                          >
                            <i className="fa-solid fa-file-invoice"></i> Abrir Fatura
                          </a>
                        )}

                        {activeClient.asaasBoletoPdf && (
                          <a
                            href={activeClient.asaasBoletoPdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ gridColumn: 'span 2', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem' }}
                          >
                            <i className="fa-solid fa-file-pdf" style={{ color: 'var(--color-danger)' }}></i> Baixar Boleto PDF
                          </a>
                        )}

                        {activeClient.formaPagamento === 'pix' && activeClient.asaasPixCopyPaste && (
                          <button
                            className="btn btn-primary"
                            style={{ gridColumn: 'span 2', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.8rem' }}
                            onClick={() => {
                              setSelectedPix({
                                qrCode: activeClient.asaasPixQrCode || '',
                                payload: activeClient.asaasPixCopyPaste || '',
                                name: activeClient.nome
                              });
                              setShowPixModal(true);
                            }}
                          >
                            <i className="fa-solid fa-qrcode"></i> Copiar Chave / Ver Pix QR Code
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                  <i className="fa-solid fa-lock"></i> Canal criptografado com o Gateway de Pagamentos Asaas v3
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', border: '1.5px dashed var(--border-color)', borderRadius: '12px' }}>
              <i className="fa-solid fa-address-book" style={{ fontSize: '3rem', color: 'var(--text-dim)', marginBottom: '12px' }}></i>
              <h4 style={{ margin: '0 0 6px 0' }}>Selecione um aluno acima</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto' }}>
                Os dados cadastrais e as opções de faturamento integradas serão exibidos após a seleção.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: CREATE STANDALONE BILLING FORM */}
      {activeSubTab === 'avulsa' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.15rem', fontWeight: 700 }}>
            <i className="fa-solid fa-circle-dollar-to-slot" style={{ marginRight: '8px', color: 'var(--color-primary)' }}></i> Nova Cobrança Avulsa / Recorrente (Fora de Contrato)
          </h3>
          
          <form onSubmit={handleCreateStandaloneBilling} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label className="comercial-field-label">Aluno beneficiário *</label>
                <select
                  className="select-custom"
                  value={formClientId}
                  onChange={e => setFormClientId(e.target.value)}
                  required
                >
                  <option value="">-- Selecione o Aluno --</option>
                  {clients.map(c => (
                    <option key={c.clientId} value={c.clientId}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="comercial-field-label">Tipo de Cobrança *</label>
                <select
                  className="select-custom"
                  value={formType}
                  onChange={e => setFormType(e.target.value as any)}
                  required
                >
                  <option value="avulsa">Cobrança Única Avulsa</option>
                  <option value="parcelamento">Cobrança Parcelada</option>
                  <option value="assinatura">Assinatura Recorrente (Assinar)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label className="comercial-field-label">
                  {formType === 'parcelamento' ? 'Valor Total do Parcelamento *' : 'Valor da Cobrança *'}
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-dim)' }}>R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="form-control"
                    value={formValor ? formatCurrencyBRL(formValor) : ''}
                    onFocus={selectOnFocus}
                    onChange={e => {
                      const rawDigits = e.target.value.replace(/\D/g, '');
                      const num = rawDigits ? parseInt(rawDigits, 10) / 100 : 0;
                      setFormValor(num);
                    }}
                    placeholder="0,00"
                    style={{ paddingLeft: '36px' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="comercial-field-label">
                  {formType === 'avulsa' ? 'Data de Vencimento *' : 'Primeiro Vencimento *'}
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={formVencimento}
                  onChange={e => setFormVencimento(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="comercial-field-label">Forma de Recebimento *</label>
                <select
                  className="select-custom"
                  value={formFormaPagamento}
                  onChange={e => setFormFormaPagamento(e.target.value)}
                  required
                >
                  <option value="pix">Pix (Imediato)</option>
                  <option value="boleto">Boleto Bancário</option>
                  <option value="cartao">Cartão de Crédito</option>
                </select>
              </div>
            </div>

            {/* Custom fields depending on type */}
            {formType === 'parcelamento' && (
              <div className="form-group" style={{ maxWidth: '250px' }}>
                <label className="comercial-field-label">Quantidade de Parcelas *</label>
                <select
                  className="select-custom"
                  value={formParcelas}
                  onChange={e => setFormParcelas(Number(e.target.value))}
                  required
                >
                  {[2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <option key={n} value={n}>{n} parcelas (R$ {(formValor / n).toFixed(2).replace('.', ',')} cada)</option>
                  ))}
                </select>
              </div>
            )}

            {formType === 'assinatura' && (
              <div className="form-group" style={{ maxWidth: '250px' }}>
                <label className="comercial-field-label">Frequência da Recorrência *</label>
                <select
                  className="select-custom"
                  value={formCycle}
                  onChange={e => setFormCycle(e.target.value)}
                  required
                >
                  <option value="WEEKLY">Semanal</option>
                  <option value="BIWEEKLY">Quinzenal</option>
                  <option value="MONTHLY">Mensal</option>
                  <option value="QUARTERLY">Trimestral</option>
                  <option value="SEMIANNUALLY">Semestral</option>
                  <option value="ANNUALLY">Anual</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="comercial-field-label">Descrição da cobrança (Exibida na fatura) *</label>
              <input
                type="text"
                className="form-control"
                value={formDescricao}
                onChange={e => setFormDescricao(e.target.value)}
                placeholder="Ex: Avaliação Fisioterapêutica Extra / Aulas de Pilates avulsas"
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '12px 24px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                disabled={submittingForm}
              >
                {submittingForm ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> Processando Emissão...</>
                ) : (
                  <><i className="fa-solid fa-circle-check"></i> Criar Lançamento Asaas</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUBTAB 3: STANDALONE BILLING HISTORY */}
      {activeSubTab === 'historico_avulsas' && (
        <div>
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ position: 'relative', flexGrow: 1 }}>
              <input
                type="text"
                className="form-control"
                placeholder="Pesquisar faturas avulsas por aluno ou descrição..."
                value={standaloneSearchQuery}
                onChange={e => setStandaloneSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px' }}
              />
              <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontSize: '0.8rem' }}></i>
            </div>
          </div>

          {loadingStandalone ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
              <p style={{ color: 'var(--text-dim)' }}>Carregando histórico avulso...</p>
            </div>
          ) : filteredStandalone.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', border: '1.5px dashed var(--border-color)', borderRadius: '12px' }}>
              <i className="fa-solid fa-folder-open" style={{ fontSize: '2.5rem', color: 'var(--text-dim)', marginBottom: '12px' }}></i>
              <h4 style={{ margin: '0 0 6px 0' }}>Nenhuma cobrança avulsa</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto' }}>
                Use a aba anterior para criar novos lançamentos avulsos, parcelamentos manuais ou assinaturas.
              </p>
            </div>
          ) : (
            <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table className="data-table" style={{ margin: 0, fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Descrição</th>
                    <th style={{ textAlign: 'right' }}>Valor</th>
                    <th style={{ textAlign: 'center' }}>Vencimento</th>
                    <th style={{ textAlign: 'center' }}>Forma</th>
                    <th style={{ textAlign: 'center' }}>Parcela</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'center' }}>Link / Fatura</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStandalone.map(p => {
                    let stColor = 'var(--text-dim)';
                    if (p.status === 'Pago') stColor = 'var(--color-success)';
                    else if (p.status === 'Atrasado') stColor = 'var(--color-danger)';
                    else if (p.status === 'Pendente') stColor = '#f59e0b';

                    return (
                      <tr key={p._id}>
                        <td><strong>{p.clientNome}</strong></td>
                        <td>{p.planoNome}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>R$ {p.valor.toFixed(2).replace('.', ',')}</td>
                        <td style={{ textAlign: 'center' }}>
                          {p.vencimento ? new Date(p.vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td style={{ textAlign: 'center', textTransform: 'uppercase' }}>{p.formaPagamento}</td>
                        <td style={{ textAlign: 'center' }}>{p.parcelasTotal && p.parcelasTotal > 1 ? `${p.parcelaNumero}/${p.parcelasTotal}` : '1/1'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: stColor }}>{p.status}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            {p.asaasInvoiceUrl ? (
                              <a href={p.asaasInvoiceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" title="Visualizar Fatura Asaas">
                                <i className="fa-solid fa-file-invoice"></i> Abrir Link
                              </a>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Indisponível</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Success Creation Details */}
      {showSuccessDetailsModal && successDetails && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowSuccessDetailsModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '90%' }}>
            <div className="modal-header">
              <h3 style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-circle-check"></i> Faturamento Criado com Sucesso!
              </h3>
              <button className="modal-close" onClick={() => setShowSuccessDetailsModal(false)}>&times;</button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px', fontSize: '0.85rem' }}>
                <div><strong>Aluno:</strong> {successDetails.clientNome}</div>
                <div><strong>Descrição:</strong> {successDetails.planoNome}</div>
                <div><strong>Valor:</strong> R$ {successDetails.valor.toFixed(2).replace('.', ',')}</div>
                <div><strong>Vencimento:</strong> {new Date(successDetails.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                <div><strong>Método de Recebimento:</strong> <span style={{ textTransform: 'uppercase' }}>{successDetails.formaPagamento}</span></div>
                {successDetails.asaasPaymentId && (
                  <div style={{ marginTop: '5px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Asaas ID: <code>{successDetails.asaasPaymentId}</code>
                  </div>
                )}
              </div>

              {successDetails.asaasInvoiceUrl && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <a
                    href={successDetails.asaasInvoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 600 }}
                  >
                    <i className="fa-solid fa-file-invoice"></i> Abrir Fatura no Navegador
                  </a>
                  
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleCopyClipboard(successDetails.asaasInvoiceUrl)}
                    style={{ width: '100%', padding: '10px' }}
                  >
                    <i className="fa-solid fa-copy" style={{ marginRight: '6px' }}></i> Copiar Link de Pagamento
                  </button>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSuccessDetailsModal(false)}>Concluído</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pix QR Code */}
      {showPixModal && selectedPix && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowPixModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%' }}>
            <div className="modal-header">
              <h3>QR Code Pix - {selectedPix.name}</h3>
              <button className="modal-close" onClick={() => setShowPixModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '20px' }}>
              {selectedPix.qrCode ? (
                <img
                  src={`data:image/png;base64,${selectedPix.qrCode}`}
                  alt="QR Code Pix"
                  style={{ width: '200px', height: '200px', margin: '0 auto 15px', display: 'block', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                />
              ) : (
                <div style={{ width: '200px', height: '200px', margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-darker)' }}>
                  <i className="fa-solid fa-qrcode fa-3x" style={{ color: 'var(--text-dim)' }}></i>
                </div>
              )}
              
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label>Pix Copia e Cola</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <textarea
                    readOnly
                    className="form-control"
                    value={selectedPix.payload}
                    style={{ fontSize: '0.75rem', height: '60px', resize: 'none', background: 'var(--bg-darker)', color: 'var(--text-main)' }}
                  />
                  <button className="btn btn-primary" onClick={() => handleCopyClipboard(selectedPix.payload)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px' }}>
                    <i className="fa-solid fa-copy"></i>
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPixModal(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
