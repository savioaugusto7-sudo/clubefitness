'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { downloadContractPDF, getContractPDFBase64 } from '@/utils/pdfGenerator';

interface DashboardReceptionistProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function DashboardReceptionist({ activeTab, setActiveTab }: DashboardReceptionistProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [clientSearch, setClientSearch] = useState('');

  // Client detail modal
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientModalTab, setClientModalTab] = useState<'pessoais' | 'comerciais' | 'contratos'>('pessoais');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientContracts, setClientContracts] = useState<any[]>([]);

  // Client form states
  const [dcNome, setDcNome] = useState('');
  const [dcEmail, setDcEmail] = useState('');
  const [dcCpf, setDcCpf] = useState('');
  const [dcTelefone, setDcTelefone] = useState('');
  const [dcSexo, setDcSexo] = useState('M');
  const [dcNascimento, setDcNascimento] = useState('');
  const [dcEndereco, setDcEndereco] = useState('');
  const [dcNumero, setDcNumero] = useState('');
  const [dcComplemento, setDcComplemento] = useState('');
  const [dcBairro, setDcBairro] = useState('');
  const [dcCidade, setDcCidade] = useState('');
  const [dcEstado, setDcEstado] = useState('');
  const [dcCep, setDcCep] = useState('');
  const [dcEstadoCivil, setDcEstadoCivil] = useState('solteiro(a)');
  const [dcNacionalidade, setDcNacionalidade] = useState('brasileiro(a)');
  const [dcProfissao, setDcProfissao] = useState('');
  const [dcPlano, setDcPlano] = useState('');
  const [dcVencimento, setDcVencimento] = useState('');
  const [dcDataInicio, setDcDataInicio] = useState('');
  const [dcStatus, setDcStatus] = useState('ativo');
  const [dcFormaPag, setDcFormaPag] = useState('pix');
  const [dcDuracao, setDcDuracao] = useState('mensal');
  const [dcVigenciaQtd, setDcVigenciaQtd] = useState(1);
  const [dcValorUnitario, setDcValorUnitario] = useState(0);
  const [dcDescontoTipo, setDcDescontoTipo] = useState('percentual');
  const [dcDescontoValor, setDcDescontoValor] = useState(0);
  const [dcParcelas, setDcParcelas] = useState(1);
  const [dcResponsavelVenda, setDcResponsavelVenda] = useState('');
  const [dcUnidadeContratada, setDcUnidadeContratada] = useState('');
  const [dcObservacoesContratuais, setDcObservacoesContratuais] = useState('');

  // New client modal
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTelefone, setNewTelefone] = useState('');
  const [newSexo, setNewSexo] = useState('M');
  const [newNascimento, setNewNascimento] = useState('');

  // Appointment modal
  const [showAptModal, setShowAptModal] = useState(false);
  const [aptClientId, setAptClientId] = useState('');
  const [aptDate, setAptDate] = useState('');
  const [aptTime, setAptTime] = useState('');
  const [aptType, setAptType] = useState('fisioterapia');
  const [aptNotes, setAptNotes] = useState('');

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentClient, setPaymentClient] = useState<any>(null);
  const [paymentValue, setPaymentValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentObs, setPaymentObs] = useState('');

  // Contract modal
  const [showContractPreview, setShowContractPreview] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [freezeContractId, setFreezeContractId] = useState('');
  const [freezeStartDate, setFreezeStartDate] = useState('');
  const [freezeDuration, setFreezeDuration] = useState(30);

  // Computed
  const selectedPlan = plans.find((p: any) => p._id === dcPlano);

  let dataFimStr = '—';
  if (dcDataInicio) {
    const start = new Date(dcDataInicio + 'T00:00:00');
    if (dcDuracao === 'semana') {
      start.setDate(start.getDate() + (Number(dcVigenciaQtd) || 1) * 7);
    } else if (dcDuracao === 'mensal') {
      start.setMonth(start.getMonth() + (Number(dcVigenciaQtd) || 1));
    } else {
      start.setMonth(start.getMonth() + (Number(dcVigenciaQtd) || 1) * 12);
    }
    dataFimStr = start.toLocaleDateString('pt-BR');
  }
  const valorBruto = dcValorUnitario * dcVigenciaQtd;
  let descontoReais = 0;
  if (dcDescontoTipo === 'percentual') {
    descontoReais = valorBruto * ((Number(dcDescontoValor) || 0) / 100);
  } else {
    descontoReais = Math.min(valorBruto, Number(dcDescontoValor) || 0);
  }
  const valorLiquido = Math.max(0, valorBruto - descontoReais);
  const valorParcela = valorLiquido / (Number(dcParcelas) || 1);
  const hasActiveSignedContract = clientContracts.some(c => c.status === 'assinado' || c.status === 'congelado');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [resC, resA, resP, resF] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/appointments'),
        fetch('/api/plans'),
        fetch('/api/financial')
      ]);
      const [jC, jA, jP, jF] = await Promise.all([resC.json(), resA.json(), resP.json(), resF.json()]);
      if (jC.success) setClients(jC.data);
      if (jA.success) setAppointments(jA.data);
      if (jP.success) setPlans(jP.data);
      if (jF.success) setFinancials(jF.data);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (dcPlano) {
      const plan = plans.find((p: any) => p._id === dcPlano);
      if (plan) {
        let sugDur = 'mensal';
        let sugQtd = 1;
        if (plan.tipo === 'Anual' || plan.validadeDias > 180) {
          sugDur = 'anual';
          sugQtd = 1;
        } else if (plan.validadeDias === 14 || plan.validadeDias === 7) {
          sugDur = 'semana';
          sugQtd = plan.validadeDias === 14 ? 2 : 1;
        } else {
          sugDur = 'mensal';
          sugQtd = Math.round(plan.validadeDias / 30) || 1;
        }
        setDcDuracao(sugDur);
        setDcVigenciaQtd(sugQtd);
        setDcValorUnitario(plan.preco || 0);
        if (sugDur === 'anual') {
          setDcParcelas(12);
        } else if (sugDur === 'mensal') {
          setDcParcelas(sugQtd);
        } else {
          setDcParcelas(1);
        }
      }
    }
  }, [dcPlano, plans]);

  useEffect(() => {
    if (dcPlano) {
      const plan = plans.find((p: any) => p._id === dcPlano);
      if (plan) {
        let sugDur = 'mensal';
        let sugQtd = 1;
        if (plan.tipo === 'Anual' || plan.validadeDias > 180) {
          sugDur = 'anual';
          sugQtd = 1;
        } else if (plan.validadeDias === 14 || plan.validadeDias === 7) {
          sugDur = 'semana';
          sugQtd = plan.validadeDias === 14 ? 2 : 1;
        } else {
          sugDur = 'mensal';
          sugQtd = Math.round(plan.validadeDias / 30) || 1;
        }
        setDcDuracao(sugDur);
        setDcVigenciaQtd(sugQtd);
        setDcValorUnitario(plan.preco || 0); // Sugere o preço do plano
        if (sugDur === 'anual') {
          setDcParcelas(12);
        } else if (sugDur === 'mensal') {
          setDcParcelas(sugQtd);
        } else {
          setDcParcelas(1);
        }
      }
    }
  }, [dcPlano, plans]);

  useEffect(() => {
    if (dcPlano) {
      const plan = plans.find((p: any) => p._id === dcPlano);
      if (plan) {
        const suggestedDuracao = plan.tipo === 'Anual' || plan.validadeDias > 180 ? 'anual' : 'mensal';
        setDcDuracao(suggestedDuracao);
        if (suggestedDuracao === 'anual') {
          setDcParcelas(12);
        } else {
          setDcParcelas(1);
        }
      }
    }
  }, [dcPlano, plans]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowClientModal(false);
        setShowNewClientModal(false);
        setShowAptModal(false);
        setShowPaymentModal(false);
        setShowContractPreview(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const fmt = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const statusColor = (s: string) => {
    switch (s) {
      case 'ativo': return '#10b981';
      case 'vencido': return '#ef4444';
      case 'suspenso': return '#f59e0b';
      case 'cancelado': return '#6b7280';
      case 'pendente': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const statusLabel = (s: string) => {
    const labels: Record<string, string> = {
      ativo: 'Ativo', vencido: 'Vencido', suspenso: 'Suspenso',
      cancelado: 'Cancelado', pendente: 'Pendente', inativo: 'Inativo'
    };
    return labels[s] || s;
  };

  const getDaysSinceLastAppointment = (clientId: string) => {
    const clientApts = appointments.filter((a: any) =>
      a.clientId === clientId && (a.status === 'confirmado' || a.status === 'concluido')
    );
    if (clientApts.length === 0) return 999;
    const dates = clientApts.map((a: any) => new Date(a.date || a.createdAt).getTime());
    const lastDate = Math.max(...dates);
    return Math.floor((Date.now() - lastDate) / (1000 * 60 * 60 * 24));
  };

  const getRiskLevel = (days: number) => {
    if (days <= 7) return { level: 'Baixo', color: '#10b981', bg: 'rgba(16,185,129,0.1)' };
    if (days <= 20) return { level: 'Médio', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
    return { level: 'Alto', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
  };

  const getTotalSessionsThisMonth = (clientId: string) => {
    const now = new Date();
    return appointments.filter((a: any) => {
      const d = new Date(a.date || a.createdAt);
      return a.clientId === clientId && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  };

  // ─── Actions ─────────────────────────────────────────────────────────────────
  const openClientModal = async (client: any) => {
    setSelectedClient(client);
    setDcNome(client.dadosPessoais?.nome || '');
    setDcEmail(client.dadosPessoais?.email || '');
    setDcCpf(client.dadosPessoais?.cpf || '');
    setDcTelefone(client.dadosPessoais?.telefone || '');
    setDcSexo(client.dadosPessoais?.sexo || 'M');
    setDcNascimento(client.dadosPessoais?.dataNascimento || '');
    setDcEndereco(client.dadosPessoais?.endereco || '');
    setDcNumero(client.dadosPessoais?.numero || '');
    setDcComplemento(client.dadosPessoais?.complemento || '');
    setDcBairro(client.dadosPessoais?.bairro || '');
    setDcCidade(client.dadosPessoais?.cidade || '');
    setDcEstado(client.dadosPessoais?.estado || '');
    setDcCep(client.dadosPessoais?.cep || '');
    setDcEstadoCivil(client.dadosPessoais?.estadoCivil || 'solteiro(a)');
    setDcNacionalidade(client.dadosPessoais?.nacionalidade || 'brasileiro(a)');
    setDcProfissao(client.dadosPessoais?.profissao || '');
    setDcPlano(client.dadosComerciais?.planoId?._id || client.dadosComerciais?.planoId || '');
    setDcVencimento(client.dadosComerciais?.vencimento || '');
    setDcDataInicio(client.dadosComerciais?.dataInicio || '');
    setDcStatus(client.dadosComerciais?.status || 'ativo');
    setDcFormaPag(client.dadosComerciais?.formaPagamento || 'pix');
    setDcDuracao(client.dadosComerciais?.duracao || 'mensal');
    setDcVigenciaQtd(client.dadosComerciais?.duracaoQtd || 1);
    setDcValorUnitario(client.dadosComerciais?.valorUnitario || 0);
    setDcVigenciaQtd(client.dadosComerciais?.duracaoQtd || 1);
    setDcValorUnitario(client.dadosComerciais?.valorUnitario || 0);
    setDcDescontoTipo(client.dadosComerciais?.descontoTipo || 'percentual');
    setDcDescontoValor(client.dadosComerciais?.descontoValor || 0);
    setDcParcelas(client.dadosComerciais?.parcelas || 1);
    setDcResponsavelVenda(client.dadosComerciais?.responsavelVenda || '');
    setDcUnidadeContratada(client.dadosComerciais?.unidadeContratada || '');
    setDcObservacoesContratuais(client.dadosComerciais?.observacoesContratuais || '');

    const res = await fetch(`/api/contracts?clientId=${client._id}`);
    const data = await res.json();
    if (data.success) setClientContracts(data.data);
    else setClientContracts([]);

    setClientModalTab('pessoais');
    setShowClientModal(true);
  };

  const handleSaveClientPersonal = async () => {
    const payload = {
      id: selectedClient._id,
      dadosPessoais: {
        nome: dcNome, email: dcEmail, cpf: dcCpf, telefone: dcTelefone,
        sexo: dcSexo, dataNascimento: dcNascimento,
        endereco: dcEndereco, numero: dcNumero, complemento: dcComplemento,
        bairro: dcBairro, cidade: dcCidade, estado: dcEstado, cep: dcCep,
        estadoCivil: dcEstadoCivil, nacionalidade: dcNacionalidade, profissao: dcProfissao
      }
    };
    const res = await fetch('/api/clients', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.success) { alert('Dados salvos com sucesso!'); fetchData(); }
    else alert('Erro: ' + data.error);
  };

  const handleSaveClientCommercial = async () => {
    const payload = {
      id: selectedClient._id,
      dadosComerciais: {
        planoId: dcPlano, vencimento: dcVencimento, dataInicio: dcDataInicio,
        status: dcStatus, formaPagamento: dcFormaPag, duracao: dcDuracao, duracaoQtd: dcVigenciaQtd, valorUnitario: dcValorUnitario,
        descontoTipo: dcDescontoTipo, descontoValor: dcDescontoValor, parcelas: dcParcelas,
        responsavelVenda: dcResponsavelVenda, unidadeContratada: dcUnidadeContratada,
        observacoesContratuais: dcObservacoesContratuais
      }
    };
    const res = await fetch('/api/clients', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.success) { alert('Dados comerciais salvos!'); fetchData(); }
    else alert('Erro: ' + data.error);
  };

  const handleCreateNewClient = async () => {
    if (!newNome || !newEmail) { alert('Nome e e-mail são obrigatórios.'); return; }
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: newNome, email: newEmail, telefone: newTelefone,
        sexo: newSexo, dataNascimento: newNascimento
      })
    });
    const data = await res.json();
    if (data.success) {
      alert('Cliente cadastrado com sucesso!');
      setShowNewClientModal(false);
      setNewNome(''); setNewEmail(''); setNewTelefone(''); setNewSexo('M'); setNewNascimento('');
      fetchData();
    } else {
      alert('Erro: ' + data.error);
    }
  };

  const handleCreateAppointment = async () => {
    if (!aptClientId || !aptDate || !aptTime) { alert('Preencha cliente, data e horário.'); return; }
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: aptClientId, date: aptDate, time: aptTime, type: aptType, notes: aptNotes, status: 'agendado' })
    });
    const data = await res.json();
    if (data.success) {
      alert('Agendamento criado!');
      setShowAptModal(false);
      setAptClientId(''); setAptDate(''); setAptTime(''); setAptNotes('');
      fetchData();
    } else alert('Erro: ' + data.error);
  };

  const handleCancelAppointment = async (id: string) => {
    if (!confirm('Cancelar este agendamento?')) return;
    const res = await fetch('/api/appointments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'cancelado' })
    });
    const data = await res.json();
    if (data.success) { fetchData(); }
    else alert('Erro ao cancelar: ' + data.error);
  };

  const handleRegisterPayment = async () => {
    if (!paymentClient) return;
    const plan = plans.find((p: any) => p._id === (paymentClient.dadosComerciais?.planoId?._id || paymentClient.dadosComerciais?.planoId));
    const valor = paymentValue || (plan?.preco || 0);
    const res = await fetch('/api/financial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        descricao: `Mensalidade - ${paymentClient.dadosPessoais?.nome}`,
        categoria: 'mensalidade',
        valor: valor,
        tipo: 'receita',
        vencimento: paymentDate,
        status: 'Pago',
        formaPagamento: paymentMethod,
        observacoes: paymentObs,
        clientId: paymentClient._id
      })
    });
    const data = await res.json();
    if (data.success) {
      // Also update client status to ativo
      await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: paymentClient._id, dadosComerciais: { ...paymentClient.dadosComerciais, status: 'ativo' } })
      });
      alert('Pagamento registrado com sucesso!');
      setShowPaymentModal(false);
      setPaymentClient(null); setPaymentValue(0); setPaymentObs('');
      fetchData();
    } else alert('Erro: ' + data.error);
  };

  const generateContractTemplate = () => {
    const plan = plans.find((p: any) => p._id === dcPlano);
    if (!plan || !selectedClient) return 'Selecione um plano para gerar o contrato.';

    const isAnual = dcDuracao === 'anual';
    let mesesVigencia = 1;
    let vigenciaText = '1 (um) mês';
    if (dcDuracao === 'anual') {
      mesesVigencia = 12;
      vigenciaText = '12 (doze) meses';
    } else if (dcDuracao === 'semestral') {
      mesesVigencia = 6;
      vigenciaText = '6 (seis) meses';
    } else if (dcDuracao === 'trimestral') {
      mesesVigencia = 3;
      vigenciaText = '3 (três) meses';
    }
    const bruto = dcValorUnitario * dcVigenciaQtd;
    const descVal = Number(dcDescontoValor) || 0;
    let liquido = bruto;
    if (dcDescontoTipo === 'percentual') { liquido = bruto * (1 - descVal / 100); }
    else { liquido = Math.max(0, bruto - descVal); }
    const nParc = Number(dcParcelas) || 1;
    const valorParc = liquido / nParc;
    const fmtV = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let dataFimStr = '[Data Fim]';
    if (dcDataInicio) {
      const start = new Date(dcDataInicio + 'T00:00:00');
      if (dcDuracao === 'semana') {
        start.setDate(start.getDate() + (Number(dcVigenciaQtd) || 1) * 7);
      } else if (dcDuracao === 'mensal') {
        start.setMonth(start.getMonth() + (Number(dcVigenciaQtd) || 1));
      } else {
        start.setMonth(start.getMonth() + (Number(dcVigenciaQtd) || 1) * 12);
      }
      dataFimStr = start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    }
    const fmtDate = (d: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '[data]';
    const dataInicioFormatada = fmtDate(dcDataInicio);
    const dataContrato = dcDataInicio ? fmtDate(dcDataInicio) : fmtDate(new Date().toISOString().split('T')[0]);
    const vencimentoFormatado = dcVencimento ? new Date(dcVencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '[Primeiro Vencimento]';

    const creditosMensais = plan.limiteSessoesAcademia || plan.creditosTotal || 9;
    const numeraisExtenso: Record<number, string> = { 1: 'um', 2: 'dois', 3: 'três', 4: 'quatro', 5: 'cinco', 6: 'seis', 7: 'sete', 8: 'oito', 9: 'nove', 10: 'dez', 11: 'onze', 12: 'doze' };
    const creditosPorExtenso = numeraisExtenso[creditosMensais] || String(creditosMensais);
    const servicosPadrao = ['Liberação Miofascial', 'Quiropraxia', 'Recuperação (Recovery)', 'Hidrogênioterapia', 'Laserterapia', 'Bota pneumática', 'Eletroterapia', 'Treinos monitorados'];
    const servicosLista = (plan.servicosPermitidos?.length > 0 ? plan.servicosPermitidos : servicosPadrao)
      .map((s: string) => '<li>' + s + '</li>').join('');

    const nomeCompleto = dcNome || '[Nome do Contratante]';
    const cpfVal = dcCpf || '[CPF]';
    const enderecoCompleto = [dcEndereco, dcNumero ? 'nº ' + dcNumero : '', dcComplemento, dcBairro ? 'Bairro ' + dcBairro : ''].filter(Boolean).join(', ') || '[Endereço]';
    const cidadeEstado = dcCidade && dcEstado ? dcCidade + '/' + dcEstado : 'Belo Horizonte/MG';
    const foro = dcCidade || 'Belo Horizonte';
    const cnpj = '52.883.492/0001-04';
    const contratadaNome = 'Albert Nunes Queiroz dos Santos LTDA.';
    const unidade = dcUnidadeContratada || plan.unidadeAtendimento || 'Principal';

    const beneficiosAnuaisHTML = isAnual
      ? `<ul style="margin-left:24px"><li>01 (uma) sessão de massagem por mês.</li><li>01 (uma) atendimento de emergência terapêutica por mês.</li></ul>`
      : '<p>Por se tratar de plano Mensal, o CONTRATANTE <strong>não</strong> possui direito aos benefícios exclusivos da modalidade Anual.</p>';

    const congelamentoClausula = isAnual
      ? '<p><em>Parágrafo Segundo:</em> O CONTRATANTE de plano anual possui o direito de suspender ("congelar") seus créditos por até <strong>30 (trinta) dias</strong> dentro da vigência do plano.</p>'
      : '';

    const obsHTML = dcObservacoesContratuais
      ? '<p><strong>5.6 Observações Adicionais</strong><br/>' + dcObservacoesContratuais + '</p>'
      : '';

    return '<div style="font-family: Times New Roman, Times, serif; font-size: 9.5pt; line-height: 1.6; color: #111;">' +
      '<p style="text-align: right;">' + dataContrato + '</p>' +
      '<h2 style="text-align: center; text-transform: uppercase;">Contrato de Prestação de Serviços</h2>' +
      '<h3>1. Identificação das Partes</h3>' +
      '<p><strong>1.1 CONTRATANTE</strong><br/>Nome: <strong>' + nomeCompleto + '</strong><br/>CPF: <strong>' + cpfVal + '</strong><br/>Endereço: ' + enderecoCompleto + '<br/>Cidade: <strong>' + cidadeEstado + '</strong></p>' +
      '<p><strong>1.2 CONTRATADO</strong><br/>Nome: <strong>' + contratadaNome + '</strong><br/>CNPJ: <strong>' + cnpj + '</strong><br/>Unidade: <strong>' + unidade + '</strong></p>' +
      '<h3>2. Objeto</h3><p>Prestação de serviços de fisioterapia e atividades físicas, com <strong>' + creditosMensais + ' (' + creditosPorExtenso + ') créditos mensais</strong>.</p>' +
      '<h3>3. Serviços</h3><ul>' + servicosLista + '</ul>' + beneficiosAnuaisHTML +
      '<h3>4. Valor e Pagamento</h3>' +
      '<p>Valor ' + (isAnual ? 'anual' : 'mensal') + ': <strong>' + fmtV(liquido) + '</strong> em <strong>' + nParc + 'x de ' + valorParc.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '</strong>.<br/>Forma: <strong>' + dcFormaPag.toUpperCase() + '</strong> — Vencimento: <strong>' + vencimentoFormatado + '</strong></p>' +
      '<h3>5. Cláusulas</h3>' +
      '<p><strong>5.1 Cancelamento:</strong> Aviso prévio de 6h para cancelamento. Reposição garantida.</p>' +
      '<p><strong>5.2 Rescisão:</strong> Aviso prévio de 30 dias. Multa de 10% sem aviso.</p>' + congelamentoClausula + obsHTML +
      '<h3>6. Vigência</h3><p>Duração: <strong>' + vigenciaText + '</strong> — Início: <strong>' + dataInicioFormatada + '</strong></p>' +
      '<h3>7. Foro</h3><p>Comarca de <strong>' + foro + '</strong>.</p>' +
      '<div style="display:flex;justify-content:space-between;margin-top:40px;gap:30px;">' +
      '<div style="flex:1;text-align:center;"><div style="border-top:1px solid #333;padding-top:6px;margin-top:30px;"><strong>CONTRATANTE</strong><br/>' + nomeCompleto + '<br/><small>CPF: ' + cpfVal + '</small></div></div>' +
      '<div style="flex:1;text-align:center;"><div style="border-top:1px solid #333;padding-top:6px;margin-top:30px;"><strong>CONTRATADO</strong><br/>' + contratadaNome + '</div></div>' +
      '</div><p style="margin-top:20px;text-align:center;">Local e data: _________________________, ' + dataContrato + '</p></div>';
  };

  const handleCreateContract = async (status: 'pendente' | 'assinado' | 'clicksign') => {
    if (status === 'assinado' && !signatureName.trim()) { alert('Informe o nome do assinante.'); return; }
    const plan = plans.find((p: any) => p._id === dcPlano);
    if (!plan) { alert('Plano não encontrado.'); return; }
    const isClicksign = status === 'clicksign';

    let pdfBase64 = '';
    if (isClicksign) {
      try {
        pdfBase64 = await getContractPDFBase64(
          {
            ...selectedClient,
            dadosComerciais: {
              planoId: dcPlano,
              formaPagamento: dcFormaPag,
              duracao: dcDuracao,
              vencimento: dcVencimento,
              descontoTipo: dcDescontoTipo,
              descontoValor: dcDescontoValor,
              parcelas: dcParcelas,
              dataInicio: dcDataInicio,
              responsavelVenda: dcResponsavelVenda,
              unidadeContratada: dcUnidadeContratada,
              observacoesContratuais: dcObservacoesContratuais
            }
          },
          plan,
          generateContractTemplate()
        );
      } catch (err: any) {
        alert('Erro ao gerar o PDF para a Clicksign: ' + err.message);
        return;
      }
    }

    const payload = {
      clientId: selectedClient._id, planoId: dcPlano,
      descontoTipo: dcDescontoTipo, descontoValor: dcDescontoValor,
      parcelas: dcParcelas, formaPagamento: dcFormaPag,
      dataPrimeiroVencimento: dcVencimento, dataInicio: dcDataInicio,
      responsavelVenda: dcResponsavelVenda, unidadeContratada: dcUnidadeContratada,
      observacoesContratuais: dcObservacoesContratuais,
      status: isClicksign ? 'pendente' : status, 
      assinaturaNome: status === 'assinado' ? signatureName : '',
      contratoTexto: generateContractTemplate(), usuarioEmissor: 'Recepção',
      duracao: dcDuracao, duracaoQtd: dcVigenciaQtd, valorUnitario: dcValorUnitario,
      enviarClicksign: isClicksign,
      contratoPdfBase64: pdfBase64
    };
    const res = await fetch('/api/contracts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.success) {
      if (isClicksign) {
        alert('Contrato gerado e enviado para a Clicksign com sucesso! O link para assinatura foi enviado por e-mail.');
      } else {
        alert(status === 'assinado' ? 'Contrato assinado!' : 'Contrato gerado como pendente!');
      }
      setShowContractPreview(false);
      const resContracts = await fetch(`/api/contracts?clientId=${selectedClient._id}`);
      const dc = await resContracts.json();
      if (dc.success) setClientContracts(dc.data);
      fetchData();
      if (status === 'assinado') {
        const clientWithComercial = { ...selectedClient, dadosComerciais: { ...selectedClient.dadosComerciais, planoId: plan, formaPagamento: dcFormaPag, vencimento: dcVencimento, descontoTipo: dcDescontoTipo, descontoValor: dcDescontoValor, parcelas: dcParcelas, dataInicio: dcDataInicio } };
        downloadContractPDF(clientWithComercial, plan, payload.contratoTexto);
      }
    } else alert('Erro ao criar contrato: ' + data.error);
  };

  const handleFreezeContract = async () => {
    if (!freezeStartDate) { alert('Selecione uma data de início.'); return; }
    const res = await fetch('/api/contracts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: freezeContractId, action: 'congelar', dataInicio: freezeStartDate, duracaoDias: freezeDuration }) });
    const data = await res.json();
    if (data.success) {
      alert('Contrato congelado!');
      setShowFreezeModal(false);
      const resContracts = await fetch(`/api/contracts?clientId=${selectedClient._id}`);
      const dc = await resContracts.json();
      if (dc.success) setClientContracts(dc.data);
      fetchData();
    } else alert('Erro: ' + data.error);
  };

  const handleCancelContract = async (contractId: string) => {
    if (!confirm('Cancelar este contrato?')) return;
    const res = await fetch('/api/contracts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: contractId, action: 'cancel' }) });
    const data = await res.json();
    if (data.success) {
      const resContracts = await fetch(`/api/contracts?clientId=${selectedClient._id}`);
      const dc = await resContracts.json();
      if (dc.success) setClientContracts(dc.data);
      fetchData();
    } else alert('Erro: ' + data.error);
  };

  // ─── Derived Data ─────────────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const todayApts = appointments.filter((a: any) => (a.date || '').startsWith(today));
  const activeClients = clients.filter((c: any) => c.dadosComerciais?.status === 'ativo');
  const pendingClients = clients.filter((c: any) => ['vencido', 'pendente'].includes(c.dadosComerciais?.status));
  const highRiskClients = activeClients.filter((c: any) => getDaysSinceLastAppointment(c._id) > 20);
  const pendingPayments = financials.filter((f: any) => f.status === 'Pendente' && f.tipo === 'receita');

  const filteredClients = clients.filter((c: any) => {
    const name = c.dadosPessoais?.nome?.toLowerCase() || '';
    const email = c.dadosPessoais?.email?.toLowerCase() || '';
    const q = clientSearch.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const cardStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '20px',
  };

  const statCard = (icon: string, label: string, value: string | number, color: string, onClick?: () => void) => (
    <div
      onClick={onClick}
      style={{
        ...cardStyle,
        display: 'flex', alignItems: 'center', gap: '16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { if (onClick) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'; } }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
    >
      <div style={{ width: 48, height: 48, borderRadius: '12px', background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`fa-solid ${icon}`} style={{ color, fontSize: '1.2rem' }} />
      </div>
      <div>
        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
      </div>
    </div>
  );

  const inputStyle = {
    width: '100%', padding: '8px 12px', background: 'var(--bg-darker)',
    border: '1px solid var(--border-color)', borderRadius: '8px',
    color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box' as const
  };

  const labelStyle = { display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 500 };

  const modalOverlay = {
    position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 9000, padding: '16px'
  };

  const modalBox = {
    background: 'var(--bg-card)', borderRadius: '16px',
    border: '1px solid var(--border-color)', width: '100%',
    maxWidth: '720px', maxHeight: '90vh', overflow: 'auto',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)'
  };

  const btnPrimary = {
    padding: '8px 16px', background: 'var(--color-primary)', color: '#fff',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600
  };

  const btnSecondary = {
    padding: '8px 16px', background: 'var(--bg-darker)', color: 'var(--text-primary)',
    border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem'
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
      <div className="spinner" /><p style={{ marginLeft: '12px', color: 'var(--text-muted)' }}>Carregando...</p>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  // TAB: DASHBOARD
  // ══════════════════════════════════════════════════════════════
  if (activeTab === 'dashboard') return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Painel da Recepção</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {statCard('fa-users', 'Alunos Ativos', activeClients.length, '#10b981', () => setActiveTab('clientes'))}
        {statCard('fa-calendar-check', 'Agendamentos Hoje', todayApts.length, '#3b82f6', () => setActiveTab('agendamentos'))}
        {statCard('fa-triangle-exclamation', 'Risco de Evasão', highRiskClients.length, '#ef4444', () => setActiveTab('frequencia'))}
        {statCard('fa-clock-rotate-left', 'Mensalidades Pendentes', pendingClients.length, '#f59e0b', () => setActiveTab('mensalidades'))}
      </div>

      {/* Today's appointments */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
            <i className="fa-solid fa-calendar-day" style={{ marginRight: '8px', color: '#3b82f6' }} />
            Agendamentos de Hoje ({todayApts.length})
          </h3>
          <button style={btnPrimary} onClick={() => setShowAptModal(true)}>
            <i className="fa-solid fa-plus" style={{ marginRight: '6px' }} />Novo Agendamento
          </button>
        </div>
        {todayApts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>Nenhum agendamento para hoje.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {todayApts.sort((a: any, b: any) => (a.time || '').localeCompare(b.time || '')).map((a: any) => {
              const c = clients.find((cl: any) => cl._id === a.clientId);
              return (
                <div key={a._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-darker)', borderRadius: '8px', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f622', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: '#3b82f6', fontWeight: 700 }}>
                      {(c?.dadosPessoais?.nome || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{c?.dadosPessoais?.nome || 'Cliente'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.time} · {a.type || 'Atendimento'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '20px', background: a.status === 'cancelado' ? '#ef444422' : '#10b98122', color: a.status === 'cancelado' ? '#ef4444' : '#10b981' }}>
                      {a.status}
                    </span>
                    {a.status !== 'cancelado' && (
                      <button style={{ ...btnSecondary, padding: '4px 10px', fontSize: '0.75rem', color: '#ef4444', borderColor: '#ef444444' }} onClick={() => handleCancelAppointment(a._id)}>
                        <i className="fa-solid fa-xmark" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* High risk clients preview */}
      {highRiskClients.length > 0 && (
        <div style={{ ...cardStyle, marginTop: '16px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 600 }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px', color: '#ef4444' }} />
            Alunos em Risco de Evasão
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {highRiskClients.slice(0, 5).map((c: any) => {
              const days = getDaysSinceLastAppointment(c._id);
              const risk = getRiskLevel(days);
              return (
                <div key={c._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-darker)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.9rem' }}>{c.dadosPessoais?.nome}</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{days === 999 ? 'Sem histórico' : `${days} dias sem vir`}</span>
                    <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '20px', background: risk.bg, color: risk.color, fontWeight: 600 }}>
                      {risk.level}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {highRiskClients.length > 5 && (
            <button style={{ ...btnSecondary, marginTop: '12px', width: '100%' }} onClick={() => setActiveTab('frequencia')}>
              Ver todos ({highRiskClients.length})
            </button>
          )}
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  // TAB: CLIENTES
  // ══════════════════════════════════════════════════════════════
  if (activeTab === 'clientes') return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Clientes</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <input
            placeholder="Buscar por nome ou e-mail..."
            value={clientSearch}
            onChange={e => setClientSearch(e.target.value)}
            style={{ ...inputStyle, width: '240px' }}
          />
          <button style={btnPrimary} onClick={() => setShowNewClientModal(true)}>
            <i className="fa-solid fa-user-plus" style={{ marginRight: '6px' }} />Novo Cliente
          </button>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-darker)', borderBottom: '1px solid var(--border-color)' }}>
              {['Nome', 'Telefone', 'Plano', 'Status', 'Ações'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredClients.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum cliente encontrado.</td></tr>
            ) : filteredClients.map((c: any) => {
              const planInfo = plans.find((p: any) => p._id === (c.dadosComerciais?.planoId?._id || c.dadosComerciais?.planoId));
              const st = c.dadosComerciais?.status || 'pendente';
              return (
                <tr key={c._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.dadosPessoais?.nome}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.dadosPessoais?.email}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.dadosPessoais?.telefone || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>{planInfo?.nome || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '20px', background: statusColor(st) + '22', color: statusColor(st), fontWeight: 600 }}>
                      {statusLabel(st)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={btnSecondary} onClick={() => openClientModal(c)} title="Editar">
                        <i className="fa-solid fa-pen-to-square" />
                      </button>
                      <button style={{ ...btnSecondary, color: '#10b981', borderColor: '#10b98144' }} onClick={() => { setPaymentClient(c); setPaymentValue(plans.find((p: any) => p._id === (c.dadosComerciais?.planoId?._id || c.dadosComerciais?.planoId))?.preco || 0); setShowPaymentModal(true); }} title="Registrar pagamento">
                        <i className="fa-solid fa-money-bill-wave" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* New client modal */}
      {showNewClientModal && (
        <div style={modalOverlay} onClick={e => { if (e.target === e.currentTarget) setShowNewClientModal(false); }}>
          <div style={{ ...modalBox, maxWidth: '480px' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Novo Cliente</h3>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setShowNewClientModal(false)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div><label style={labelStyle}>Nome completo *</label><input style={inputStyle} value={newNome} onChange={e => setNewNome(e.target.value)} placeholder="Nome do aluno" /></div>
              <div><label style={labelStyle}>E-mail *</label><input style={inputStyle} type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@exemplo.com" /></div>
              <div><label style={labelStyle}>Telefone</label><input style={inputStyle} value={newTelefone} onChange={e => setNewTelefone(e.target.value)} placeholder="(31) 9 0000-0000" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Sexo</label>
                  <select style={inputStyle} value={newSexo} onChange={e => setNewSexo(e.target.value)}>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="O">Outro</option>
                  </select>
                </div>
                <div><label style={labelStyle}>Data de Nascimento</label><input style={inputStyle} type="date" value={newNascimento} onChange={e => setNewNascimento(e.target.value)} /></div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button style={btnSecondary} onClick={() => setShowNewClientModal(false)}>Cancelar</button>
                <button style={btnPrimary} onClick={handleCreateNewClient}>Cadastrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client edit modal */}
      {showClientModal && selectedClient && (
        <div style={modalOverlay} onClick={e => { if (e.target === e.currentTarget) setShowClientModal(false); }}>
          <div style={modalBox}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{selectedClient.dadosPessoais?.nome}</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedClient.dadosPessoais?.email}</p>
              </div>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setShowClientModal(false)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 24px' }}>
              {(['pessoais', 'comerciais', 'contratos'] as const).map(t => (
                <button key={t} onClick={() => setClientModalTab(t)} style={{
                  background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer',
                  color: clientModalTab === t ? 'var(--color-primary)' : 'var(--text-muted)',
                  borderBottom: clientModalTab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
                  fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize'
                }}>
                  {t === 'pessoais' ? 'Dados Pessoais' : t === 'comerciais' ? 'Dados Comerciais' : 'Contratos'}
                </button>
              ))}
            </div>
            <div style={{ padding: '24px' }}>
              {clientModalTab === 'pessoais' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><label style={labelStyle}>Nome</label><input style={inputStyle} value={dcNome} onChange={e => setDcNome(e.target.value)} /></div>
                    <div><label style={labelStyle}>E-mail</label><input style={inputStyle} value={dcEmail} onChange={e => setDcEmail(e.target.value)} /></div>
                    <div><label style={labelStyle}>CPF</label><input style={inputStyle} value={dcCpf} onChange={e => setDcCpf(e.target.value)} /></div>
                    <div><label style={labelStyle}>Telefone</label><input style={inputStyle} value={dcTelefone} onChange={e => setDcTelefone(e.target.value)} /></div>
                    <div>
                      <label style={labelStyle}>Sexo</label>
                      <select style={inputStyle} value={dcSexo} onChange={e => setDcSexo(e.target.value)}>
                        <option value="M">Masculino</option><option value="F">Feminino</option><option value="O">Outro</option>
                      </select>
                    </div>
                    <div><label style={labelStyle}>Nascimento</label><input style={inputStyle} type="date" value={dcNascimento} onChange={e => setDcNascimento(e.target.value)} /></div>
                    <div><label style={labelStyle}>Endereço</label><input style={inputStyle} value={dcEndereco} onChange={e => setDcEndereco(e.target.value)} /></div>
                    <div><label style={labelStyle}>Número</label><input style={inputStyle} value={dcNumero} onChange={e => setDcNumero(e.target.value)} /></div>
                    <div><label style={labelStyle}>Bairro</label><input style={inputStyle} value={dcBairro} onChange={e => setDcBairro(e.target.value)} /></div>
                    <div><label style={labelStyle}>Cidade</label><input style={inputStyle} value={dcCidade} onChange={e => setDcCidade(e.target.value)} /></div>
                    <div><label style={labelStyle}>Estado</label><input style={inputStyle} value={dcEstado} onChange={e => setDcEstado(e.target.value)} /></div>
                    <div><label style={labelStyle}>CEP</label><input style={inputStyle} value={dcCep} onChange={e => setDcCep(e.target.value)} /></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button style={btnSecondary} onClick={() => setShowClientModal(false)}>Fechar</button>
                    <button style={btnPrimary} onClick={handleSaveClientPersonal}>Salvar</button>
                  </div>
                </div>
              )}
              {clientModalTab === 'comerciais' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="comercial-summary-card" style={{ padding: '20px', marginBottom: '10px' }}>
                    <div className="comercial-summary-header">
                      <span><i className="fa-solid fa-calculator" style={{ marginRight: '8px' }}></i> Resumo Financeiro em Tempo Real</span>
                    </div>
                    <div className="comercial-summary-grid">
                      <div className="comercial-summary-box">
                        <span className="comercial-summary-label">Subtotal Bruto</span>
                        <strong className="comercial-summary-val" style={{ fontSize: '1.05rem' }}>{fmt(valorBruto)}</strong>
                        <small className="comercial-summary-desc">
                          {dcDuracao === 'semana' 
                            ? `${dcVigenciaQtd} sem. x R$ ${dcValorUnitario.toFixed(2)}` 
                            : dcDuracao === 'mensal' 
                            ? `${dcVigenciaQtd} meses x R$ ${dcValorUnitario.toFixed(2)}` 
                            : `${dcVigenciaQtd} ano(s) x R$ ${dcValorUnitario.toFixed(2)}`}
                        </small>
                      </div>
                      <div className="comercial-summary-box" style={{ background: 'rgba(239, 68, 68, 0.015)', borderColor: 'rgba(239, 68, 68, 0.08)' }}>
                        <span className="comercial-summary-label" style={{ color: 'var(--color-danger)' }}>Desconto Aplicado</span>
                        <strong className="comercial-summary-val" style={{ color: 'var(--color-danger)', fontSize: '1.05rem' }}>- {fmt(descontoReais)}</strong>
                        <small className="comercial-summary-desc">
                          {dcDescontoTipo === 'percentual' ? `${dcDescontoValor}% de desconto` : 'Valor fixo deduzido'}
                        </small>
                      </div>
                      <div className="comercial-summary-box" style={{ background: 'rgba(16, 185, 129, 0.015)', borderColor: 'rgba(16, 185, 129, 0.08)' }}>
                        <span className="comercial-summary-label" style={{ color: 'var(--color-success)' }}>Total Líquido</span>
                        <strong className="comercial-summary-val" style={{ color: 'var(--color-success)', fontSize: '1.05rem' }}>{fmt(valorLiquido)}</strong>
                        <small className="comercial-summary-desc">Valor final do contrato</small>
                      </div>
                      <div className="comercial-summary-box">
                        <span className="comercial-summary-label">Parcelamento</span>
                        <strong className="comercial-summary-val" style={{ fontSize: '1.05rem' }}>{dcParcelas}x {fmt(valorParcela)}</strong>
                        <small className="comercial-summary-desc">
                          {dcParcelas > 1 ? 'Mensalidades' : 'À vista'}
                        </small>
                      </div>
                    </div>
                  </div>

                  <div className="comercial-section-card" style={{ padding: '16px', marginBottom: '10px' }}>
                    <div className="comercial-section-title" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
                      <i className="fa-solid fa-file-invoice-dollar"></i> Plano Contratado & Vigência
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="comercial-field-label"><i className="fa-solid fa-signature"></i> Plano Contratado</label>
                        <select className="select-custom" value={dcPlano} onChange={e => setDcPlano(e.target.value)}>
                          <option value="">Selecione...</option>
                          {plans.map((p: any) => <option key={p._id} value={p._id}>{p.nome} — {fmt(p.preco)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="comercial-field-label"><i className="fa-solid fa-circle-info"></i> Status</label>
                        <select className="select-custom" value={dcStatus} onChange={e => setDcStatus(e.target.value)}>
                          <option value="ativo">Ativo</option>
                          <option value="vencido">Vencido</option>
                          <option value="suspenso">Suspenso</option>
                          <option value="cancelado">Cancelado</option>
                          <option value="pendente">Pendente</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <label className="comercial-field-label"><i className="fa-solid fa-calendar-days"></i> Vigência do Contrato</label>
                          <select className="select-custom" value={dcDuracao} onChange={e => setDcDuracao(e.target.value)}>
                            <option value="semana">Semana(s)</option>
                            <option value="mensal">Mensal</option>
                            <option value="anual">Anual (12 Meses)</option>
                          </select>
                        </div>
                        <div style={{ width: '70px' }}>
                          <label className="comercial-field-label"><i className="fa-solid fa-list-numeric"></i> Qtd</label>
                          <input type="number" className="form-control" value={dcVigenciaQtd} onChange={e => setDcVigenciaQtd(Math.max(1, Number(e.target.value)))} min={1} />
                        </div>
                      </div>
                      <div>
                        <label className="comercial-field-label"><i className="fa-solid fa-money-bill-wave"></i> {dcDuracao === 'semana' ? 'Valor Semanal (R$)' : dcDuracao === 'anual' ? 'Valor Anual (R$)' : 'Valor Mensal (R$)'}</label>
                        <input type="number" className="form-control" value={dcValorUnitario} onChange={e => setDcValorUnitario(Number(e.target.value))} min={0} />
                      </div>
                    </div>
                  </div>

                  <div className="comercial-section-card" style={{ padding: '16px', marginBottom: '10px' }}>
                    <div className="comercial-section-title" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
                      <i className="fa-solid fa-percent"></i> Descontos & Parcelamento
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="comercial-field-label"><i className="fa-solid fa-tag"></i> Tipo Desconto</label>
                        <select className="select-custom" value={dcDescontoTipo} onChange={e => setDcDescontoTipo(e.target.value)}>
                          <option value="percentual">Percentual (%)</option>
                          <option value="fixo">Fixo (R$)</option>
                        </select>
                      </div>
                      <div>
                        <label className="comercial-field-label"><i className="fa-solid fa-tags"></i> Valor Desconto</label>
                        <input type="number" className="form-control" value={dcDescontoValor} onChange={e => setDcDescontoValor(Number(e.target.value))} />
                      </div>
                      <div>
                        <label className="comercial-field-label"><i className="fa-solid fa-credit-card"></i> Parcelas</label>
                        <input type="number" className="form-control" min={1} value={dcParcelas} onChange={e => setDcParcelas(Number(e.target.value))} />
                      </div>
                    </div>
                  </div>

                  <div className="comercial-section-card" style={{ padding: '16px', marginBottom: '10px' }}>
                    <div className="comercial-section-title" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
                      <i className="fa-solid fa-calendar-check"></i> Fechamento & Emissão
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="comercial-field-label"><i className="fa-solid fa-receipt"></i> Forma Pagamento</label>
                        <select className="select-custom" value={dcFormaPag} onChange={e => setDcFormaPag(e.target.value)}>
                          <option value="pix">Pix</option>
                          <option value="cartao">Cartão</option>
                          <option value="boleto">Boleto</option>
                          <option value="dinheiro">Dinheiro</option>
                        </select>
                      </div>
                      <div>
                        <label className="comercial-field-label"><i className="fa-solid fa-calendar-plus"></i> Data de Início</label>
                        <input type="date" className="form-control" value={dcDataInicio} onChange={e => setDcDataInicio(e.target.value)} />
                      </div>
                      <div>
                        <label className="comercial-field-label"><i className="fa-solid fa-calendar-day"></i> Primeiro Vencimento</label>
                        <input type="date" className="form-control" value={dcVencimento} onChange={e => setDcVencimento(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                      <div>
                        <label className="comercial-field-label"><i className="fa-solid fa-user-tie"></i> Responsável Venda</label>
                        <input className="form-control" value={dcResponsavelVenda} onChange={e => setDcResponsavelVenda(e.target.value)} />
                      </div>
                      <div>
                        <label className="comercial-field-label"><i className="fa-solid fa-shop"></i> Unidade</label>
                        <input className="form-control" value={dcUnidadeContratada} onChange={e => setDcUnidadeContratada(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <label className="comercial-field-label"><i className="fa-solid fa-file-lines"></i> Observações Contratuais</label>
                      <textarea className="form-control" rows={2} value={dcObservacoesContratuais} onChange={e => setDcObservacoesContratuais(e.target.value)} />
                    </div>
                  </div>

                  {/* Ficha de Resumo Prático para o Cliente */}
                  <div style={{
                    marginTop: '15px',
                    padding: '18px',
                    background: 'rgba(16, 185, 129, 0.03)',
                    border: '1px dashed rgba(16, 185, 129, 0.3)',
                    borderRadius: '12px',
                    color: 'var(--text-main)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                      <h4 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <i className="fa-solid fa-receipt" style={{ marginRight: '6px' }}></i> Resumo de Venda & Fechamento (Apresentação ao Cliente)
                      </h4>
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                        Fechamento
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Período de Vigência</div>
                        <div style={{ fontSize: '1rem', fontWeight: 'bold', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fa-solid fa-calendar-week" style={{ color: 'var(--color-primary)', fontSize: '0.9rem' }}></i>
                          {dcDataInicio ? new Date(dcDataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} até {dataFimStr}
                        </div>
                        <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', marginTop: '2px' }}>
                          Duração: {dcDuracao === 'semana' ? `${dcVigenciaQtd} semana(s)` : dcDuracao === 'mensal' ? `${dcVigenciaQtd} mês(es)` : `${dcVigenciaQtd} ano(s)`}
                        </small>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Valor Total (Líquido)</div>
                        <div style={{ fontSize: '1rem', fontWeight: 'bold', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fa-solid fa-circle-check" style={{ color: 'var(--color-success)', fontSize: '0.9rem' }}></i>
                          {fmt(valorLiquido)}
                        </div>
                        <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', marginTop: '2px' }}>
                          Bruto: {fmt(valorBruto)} (Desc: {fmt(descontoReais)})
                        </small>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Condição de Pagamento</div>
                        <div style={{ fontSize: '1rem', fontWeight: 'bold', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fa-solid fa-credit-card" style={{ color: 'var(--color-primary)', fontSize: '0.9rem' }}></i>
                          {dcParcelas}x de {fmt(valorParcela)}
                        </div>
                        <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', marginTop: '2px' }}>
                          Forma: {dcFormaPag.toUpperCase()}
                        </small>
                      </div>
                    </div>
                  </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button style={{ ...btnSecondary, color: '#ec4899', borderColor: '#ec489944' }} onClick={() => { setClientModalTab('contratos'); setShowContractPreview(true); }}>
                      <i className="fa-solid fa-file-contract" style={{ marginRight: '6px' }} />Gerar Contrato
                    </button>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button style={btnSecondary} onClick={() => setShowClientModal(false)}>Fechar</button>
                      <button style={btnPrimary} onClick={handleSaveClientCommercial}>Salvar</button>
                    </div>
                  </div>
                </div>
              )}
              {clientModalTab === 'contratos' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0 }}>Contratos do Aluno</h4>
                    {!hasActiveSignedContract && (
                      <button style={btnPrimary} onClick={() => setShowContractPreview(true)}>
                        <i className="fa-solid fa-plus" style={{ marginRight: '6px' }} />Novo Contrato
                      </button>
                    )}
                  </div>
                  {clientContracts.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>Nenhum contrato gerado ainda.</p>
                  ) : clientContracts.map((ct: any) => (
                    <div key={ct._id} style={{ padding: '14px', background: 'var(--bg-darker)', borderRadius: '10px', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ct.planoId?.nome || 'Plano'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Emitido: {ct.createdAt ? new Date(ct.createdAt).toLocaleDateString('pt-BR') : '—'} · Emissor: {ct.usuarioEmissor || '—'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '20px', background: ct.status === 'assinado' ? '#10b98122' : ct.status === 'congelado' ? '#3b82f622' : '#f59e0b22', color: ct.status === 'assinado' ? '#10b981' : ct.status === 'congelado' ? '#3b82f6' : '#f59e0b', fontWeight: 600 }}>
                            {ct.clicksignDocKey && ct.status === 'pendente' ? 'Aguardando Clicksign' : ct.status}
                          </span>
                          {ct.status === 'assinado' && (
                            <button style={{ ...btnSecondary, fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => { setFreezeContractId(ct._id); setShowFreezeModal(true); }}>Congelar</button>
                          )}
                          {(ct.status === 'assinado' || ct.status === 'pendente') && (
                            <button style={{ ...btnSecondary, fontSize: '0.75rem', padding: '4px 8px', color: '#ef4444', borderColor: '#ef444444' }} onClick={() => handleCancelContract(ct._id)}>Cancelar</button>
                          )}
                          <button style={{ ...btnSecondary, fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => { const plan = plans.find((p: any) => p._id === (ct.planoId?._id || ct.planoId)); if (plan && ct.contratoTexto) downloadContractPDF(selectedClient, plan, ct.contratoTexto); }}>
                            <i className="fa-solid fa-download" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contract preview modal */}
      {showContractPreview && selectedClient && (
        <div style={{ ...modalOverlay, zIndex: 9100 }} onClick={e => { if (e.target === e.currentTarget) setShowContractPreview(false); }}>
          <div style={{ ...modalBox, maxWidth: '800px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Pré-visualização do Contrato</h3>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setShowContractPreview(false)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', maxHeight: '40vh', overflow: 'auto', marginBottom: '20px', background: '#fff', color: '#111' }} dangerouslySetInnerHTML={{ __html: generateContractTemplate() }} />
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Nome do Assinante (para aceite digital)</label>
                <input style={inputStyle} value={signatureName} onChange={e => setSignatureName(e.target.value)} placeholder="Nome completo do assinante" />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button style={btnSecondary} onClick={() => handleCreateContract('pendente')}>Salvar como Pendente</button>
                <button style={{ ...btnPrimary, background: '#6366f1', borderColor: '#6366f1' }} onClick={() => handleCreateContract('clicksign')}>
                  <i className="fa-solid fa-file-signature" style={{ marginRight: '6px' }} />Enviar p/ Clicksign
                </button>
                <button style={btnPrimary} onClick={() => handleCreateContract('assinado')}>
                  <i className="fa-solid fa-signature" style={{ marginRight: '6px' }} />Assinar e Ativar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Freeze modal */}
      {showFreezeModal && (
        <div style={{ ...modalOverlay, zIndex: 9200 }} onClick={e => { if (e.target === e.currentTarget) setShowFreezeModal(false); }}>
          <div style={{ ...modalBox, maxWidth: '400px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>Congelar Contrato</h3>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setShowFreezeModal(false)}><i className="fa-solid fa-xmark" /></button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label style={labelStyle}>Data de Início do Congelamento</label><input style={inputStyle} type="date" value={freezeStartDate} onChange={e => setFreezeStartDate(e.target.value)} /></div>
              <div><label style={labelStyle}>Duração (dias, máx. 30)</label><input style={inputStyle} type="number" min={1} max={30} value={freezeDuration} onChange={e => setFreezeDuration(Number(e.target.value))} /></div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button style={btnSecondary} onClick={() => setShowFreezeModal(false)}>Cancelar</button>
                <button style={btnPrimary} onClick={handleFreezeContract}>Congelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  // TAB: AGENDAMENTOS
  // ══════════════════════════════════════════════════════════════
  if (activeTab === 'agendamentos') {
    const upcoming = appointments
      .filter((a: any) => a.date >= today)
      .sort((a: any, b: any) => (a.date + a.time).localeCompare(b.date + b.time));
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Agendamentos</h2>
          <button style={btnPrimary} onClick={() => setShowAptModal(true)}>
            <i className="fa-solid fa-plus" style={{ marginRight: '6px' }} />Novo Agendamento
          </button>
        </div>

        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-darker)', borderBottom: '1px solid var(--border-color)' }}>
                {['Data', 'Hora', 'Cliente', 'Tipo', 'Status', 'Ação'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upcoming.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Sem agendamentos futuros.</td></tr>
              ) : upcoming.map((a: any) => {
                const c = clients.find((cl: any) => cl._id === a.clientId);
                return (
                  <tr key={a._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>{a.date ? new Date(a.date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>{a.time || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 500 }}>{c?.dadosPessoais?.nome || 'Desconhecido'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{a.type || 'Atendimento'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '20px', background: a.status === 'cancelado' ? '#ef444422' : a.status === 'concluido' ? '#10b98122' : '#3b82f622', color: a.status === 'cancelado' ? '#ef4444' : a.status === 'concluido' ? '#10b981' : '#3b82f6' }}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {a.status === 'agendado' && (
                        <button style={{ ...btnSecondary, padding: '4px 10px', fontSize: '0.75rem', color: '#ef4444', borderColor: '#ef444444' }} onClick={() => handleCancelAppointment(a._id)}>
                          <i className="fa-solid fa-xmark" style={{ marginRight: '4px' }} />Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* New appointment modal */}
        {showAptModal && (
          <div style={modalOverlay} onClick={e => { if (e.target === e.currentTarget) setShowAptModal(false); }}>
            <div style={{ ...modalBox, maxWidth: '480px' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Novo Agendamento</h3>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setShowAptModal(false)}><i className="fa-solid fa-xmark" /></button>
              </div>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Cliente *</label>
                  <select style={inputStyle} value={aptClientId} onChange={e => setAptClientId(e.target.value)}>
                    <option value="">Selecione o cliente...</option>
                    {clients.filter((c: any) => c.dadosPessoais?.nome).sort((a: any, b: any) => a.dadosPessoais.nome.localeCompare(b.dadosPessoais.nome)).map((c: any) => (
                      <option key={c._id} value={c._id}>{c.dadosPessoais.nome}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>Data *</label><input style={inputStyle} type="date" value={aptDate} min={today} onChange={e => setAptDate(e.target.value)} /></div>
                  <div><label style={labelStyle}>Horário *</label><input style={inputStyle} type="time" value={aptTime} onChange={e => setAptTime(e.target.value)} /></div>
                </div>
                <div>
                  <label style={labelStyle}>Tipo de Atendimento</label>
                  <select style={inputStyle} value={aptType} onChange={e => setAptType(e.target.value)}>
                    <option value="fisioterapia">Fisioterapia</option>
                    <option value="treino_livre">Treino Livre</option>
                    <option value="avaliacao">Avaliação</option>
                    <option value="massagem">Massagem</option>
                    <option value="consulta">Consulta</option>
                  </select>
                </div>
                <div><label style={labelStyle}>Observações</label><textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={aptNotes} onChange={e => setAptNotes(e.target.value)} /></div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button style={btnSecondary} onClick={() => setShowAptModal(false)}>Cancelar</button>
                  <button style={btnPrimary} onClick={handleCreateAppointment}>Agendar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // TAB: FREQUÊNCIA & EVASÃO
  // ══════════════════════════════════════════════════════════════
  if (activeTab === 'frequencia') {
    const sortedClients = [...activeClients].sort((a: any, b: any) => getDaysSinceLastAppointment(b._id) - getDaysSinceLastAppointment(a._id));
    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Frequência & Evasão</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            Acompanhe a assiduidade dos alunos ativos e identifique riscos de abandono.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {statCard('fa-circle-check', 'Risco Baixo (≤7 dias)', activeClients.filter((c: any) => getDaysSinceLastAppointment(c._id) <= 7).length, '#10b981')}
          {statCard('fa-circle-exclamation', 'Risco Médio (8–20 dias)', activeClients.filter((c: any) => { const d = getDaysSinceLastAppointment(c._id); return d > 7 && d <= 20; }).length, '#f59e0b')}
          {statCard('fa-circle-xmark', 'Risco Alto (>20 dias)', activeClients.filter((c: any) => getDaysSinceLastAppointment(c._id) > 20).length, '#ef4444')}
        </div>

        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-darker)', borderBottom: '1px solid var(--border-color)' }}>
                {['Aluno', 'Sessões (mês)', 'Último Atendimento', 'Dias sem vir', 'Risco de Evasão'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedClients.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum aluno ativo.</td></tr>
              ) : sortedClients.map((c: any) => {
                const days = getDaysSinceLastAppointment(c._id);
                const risk = getRiskLevel(days);
                const sessions = getTotalSessionsThisMonth(c._id);
                const clientApts = appointments.filter((a: any) => a.clientId === c._id && (a.status === 'confirmado' || a.status === 'concluido'));
                const lastApt = clientApts.length > 0
                  ? new Date(Math.max(...clientApts.map((a: any) => new Date(a.date || a.createdAt).getTime()))).toLocaleDateString('pt-BR')
                  : 'Sem histórico';
                return (
                  <tr key={c._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.dadosPessoais?.nome}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.dadosPessoais?.telefone || ''}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.9rem', fontWeight: 600, color: sessions > 0 ? '#10b981' : 'var(--text-muted)' }}>{sessions}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{lastApt}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.9rem', fontWeight: 600 }}>{days === 999 ? '—' : days}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '20px', background: risk.bg, color: risk.color, fontWeight: 700 }}>
                        {risk.level}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // TAB: MENSALIDADES
  // ══════════════════════════════════════════════════════════════
  if (activeTab === 'mensalidades') {
    const byStatus = (s: string) => clients.filter((c: any) => c.dadosComerciais?.status === s);
    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Mensalidades</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>Registre pagamentos e acompanhe o status dos planos.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {statCard('fa-circle-check', 'Ativos', byStatus('ativo').length, '#10b981')}
          {statCard('fa-circle-xmark', 'Vencidos', byStatus('vencido').length, '#ef4444')}
          {statCard('fa-clock', 'Pendentes', byStatus('pendente').length, '#3b82f6')}
          {statCard('fa-circle-pause', 'Suspensos', byStatus('suspenso').length, '#f59e0b')}
        </div>

        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-darker)', borderBottom: '1px solid var(--border-color)' }}>
                {['Cliente', 'Plano', 'Vencimento', 'Status', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...clients].sort((a: any, b: any) => {
                const order = ['vencido', 'pendente', 'suspenso', 'ativo', 'cancelado', 'inativo'];
                return order.indexOf(a.dadosComerciais?.status) - order.indexOf(b.dadosComerciais?.status);
              }).map((c: any) => {
                const planInfo = plans.find((p: any) => p._id === (c.dadosComerciais?.planoId?._id || c.dadosComerciais?.planoId));
                const st = c.dadosComerciais?.status || 'pendente';
                const venc = c.dadosComerciais?.vencimento;
                return (
                  <tr key={c._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.dadosPessoais?.nome}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.dadosPessoais?.telefone || ''}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                      <div>{planInfo?.nome || '—'}</div>
                      {planInfo && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fmt(planInfo.preco)}</div>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {venc ? new Date(venc + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '20px', background: statusColor(st) + '22', color: statusColor(st), fontWeight: 600 }}>
                        {statusLabel(st)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        style={{ ...btnPrimary, fontSize: '0.75rem', padding: '6px 12px', background: '#10b981' }}
                        onClick={() => { setPaymentClient(c); setPaymentValue(planInfo?.preco || 0); setPaymentDate(new Date().toISOString().split('T')[0]); setShowPaymentModal(true); }}
                      >
                        <i className="fa-solid fa-money-bill-wave" style={{ marginRight: '6px' }} />Registrar Pagamento
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Payment modal */}
        {showPaymentModal && paymentClient && (
          <div style={modalOverlay} onClick={e => { if (e.target === e.currentTarget) setShowPaymentModal(false); }}>
            <div style={{ ...modalBox, maxWidth: '440px' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>Registrar Pagamento</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{paymentClient.dadosPessoais?.nome}</p>
                </div>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setShowPaymentModal(false)}><i className="fa-solid fa-xmark" /></button>
              </div>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div><label style={labelStyle}>Valor (R$)</label><input style={inputStyle} type="number" step="0.01" value={paymentValue} onChange={e => setPaymentValue(Number(e.target.value))} /></div>
                <div>
                  <label style={labelStyle}>Forma de Pagamento</label>
                  <select style={inputStyle} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                    <option value="pix">PIX</option><option value="cartao">Cartão</option><option value="boleto">Boleto</option><option value="dinheiro">Dinheiro</option>
                  </select>
                </div>
                <div><label style={labelStyle}>Data do Pagamento</label><input style={inputStyle} type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} /></div>
                <div><label style={labelStyle}>Observações</label><input style={inputStyle} value={paymentObs} onChange={e => setPaymentObs(e.target.value)} placeholder="Opcional" /></div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button style={btnSecondary} onClick={() => setShowPaymentModal(false)}>Cancelar</button>
                  <button style={{ ...btnPrimary, background: '#10b981' }} onClick={handleRegisterPayment}>
                    <i className="fa-solid fa-check" style={{ marginRight: '6px' }} />Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // TAB: CONTRATOS
  // ══════════════════════════════════════════════════════════════
  if (activeTab === 'contratos') {
    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Contratos</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>Selecione um cliente para gerar ou visualizar contratos.</p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <input
            placeholder="Buscar cliente..."
            value={clientSearch}
            onChange={e => setClientSearch(e.target.value)}
            style={{ ...inputStyle, maxWidth: '320px' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredClients.filter((c: any) => c.dadosPessoais?.nome).map((c: any) => {
            const planInfo = plans.find((p: any) => p._id === (c.dadosComerciais?.planoId?._id || c.dadosComerciais?.planoId));
            const st = c.dadosComerciais?.status || 'pendente';
            return (
              <div key={c._id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{c.dadosPessoais?.nome}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{planInfo?.nome || 'Sem plano'}</div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '20px', background: statusColor(st) + '22', color: statusColor(st), fontWeight: 600 }}>{statusLabel(st)}</span>
                  <button style={btnPrimary} onClick={() => { openClientModal(c); setTimeout(() => setClientModalTab('contratos'), 100); }}>
                    <i className="fa-solid fa-file-contract" style={{ marginRight: '6px' }} />Gerenciar Contratos
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reuse the client modal for contracts */}
        {showClientModal && selectedClient && (
          <div style={modalOverlay} onClick={e => { if (e.target === e.currentTarget) setShowClientModal(false); }}>
            <div style={modalBox}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{selectedClient.dadosPessoais?.nome}</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedClient.dadosPessoais?.email}</p>
                </div>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setShowClientModal(false)}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 24px' }}>
                {(['pessoais', 'comerciais', 'contratos'] as const).map(t => (
                  <button key={t} onClick={() => setClientModalTab(t)} style={{
                    background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer',
                    color: clientModalTab === t ? 'var(--color-primary)' : 'var(--text-muted)',
                    borderBottom: clientModalTab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
                    fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize'
                  }}>
                    {t === 'pessoais' ? 'Dados Pessoais' : t === 'comerciais' ? 'Dados Comerciais' : 'Contratos'}
                  </button>
                ))}
              </div>
              <div style={{ padding: '24px' }}>
                {clientModalTab === 'contratos' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <h4 style={{ margin: 0 }}>Contratos do Aluno</h4>
                      {!hasActiveSignedContract && (
                        <button style={btnPrimary} onClick={() => setShowContractPreview(true)}>
                          <i className="fa-solid fa-plus" style={{ marginRight: '6px' }} />Novo Contrato
                        </button>
                      )}
                    </div>
                    {clientContracts.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>Nenhum contrato gerado ainda.</p>
                    ) : clientContracts.map((ct: any) => (
                      <div key={ct._id} style={{ padding: '14px', background: 'var(--bg-darker)', borderRadius: '10px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ct.planoId?.nome || 'Plano'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Emitido: {ct.createdAt ? new Date(ct.createdAt).toLocaleDateString('pt-BR') : '—'}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '20px', background: ct.status === 'assinado' ? '#10b98122' : ct.status === 'congelado' ? '#3b82f622' : '#f59e0b22', color: ct.status === 'assinado' ? '#10b981' : ct.status === 'congelado' ? '#3b82f6' : '#f59e0b', fontWeight: 600 }}>
                              {ct.status}
                            </span>
                            {ct.status === 'assinado' && (
                              <button style={{ ...btnSecondary, fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => { setFreezeContractId(ct._id); setShowFreezeModal(true); }}>Congelar</button>
                            )}
                            {(ct.status === 'assinado' || ct.status === 'pendente') && (
                              <button style={{ ...btnSecondary, fontSize: '0.75rem', padding: '4px 8px', color: '#ef4444', borderColor: '#ef444444' }} onClick={() => handleCancelContract(ct._id)}>Cancelar</button>
                            )}
                            <button style={{ ...btnSecondary, fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => { const plan = plans.find((p: any) => p._id === (ct.planoId?._id || ct.planoId)); if (plan && ct.contratoTexto) downloadContractPDF(selectedClient, plan, ct.contratoTexto); }}>
                              <i className="fa-solid fa-download" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {clientModalTab === 'comerciais' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={labelStyle}>Plano</label>
                        <select style={inputStyle} value={dcPlano} onChange={e => setDcPlano(e.target.value)}>
                          <option value="">Selecione...</option>
                          {plans.map((p: any) => <option key={p._id} value={p._id}>{p.nome} — {fmt(p.preco)}</option>)}
                        </select>
                      </div>
                      <div>
                      <label style={labelStyle}>Vigência do Contrato</label>
                      <select style={inputStyle} value={dcDuracao} onChange={e => setDcDuracao(e.target.value)}>
                        <option value="mensal">Mensal (1 Mês)</option>
                        <option value="trimestral">Trimestral (3 Meses)</option>
                        <option value="semestral">Semestral (6 Meses)</option>
                        <option value="anual">Anual (12 Meses)</option>
                      </select>
                    </div>
                    <div><label style={labelStyle}>Data de Início</label><input style={inputStyle} type="date" value={dcDataInicio} onChange={e => setDcDataInicio(e.target.value)} /></div>
                      <div><label style={labelStyle}>Vencimento</label><input style={inputStyle} type="date" value={dcVencimento} onChange={e => setDcVencimento(e.target.value)} /></div>
                      <div>
                        <label style={labelStyle}>Forma de Pagamento</label>
                        <select style={inputStyle} value={dcFormaPag} onChange={e => setDcFormaPag(e.target.value)}>
                          <option value="pix">PIX</option><option value="cartao">Cartão</option><option value="boleto">Boleto</option><option value="dinheiro">Dinheiro</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Desconto</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select style={{ ...inputStyle, width: '80px' }} value={dcDescontoTipo} onChange={e => setDcDescontoTipo(e.target.value)}>
                            <option value="percentual">%</option><option value="fixo">R$</option>
                          </select>
                          <input style={{ ...inputStyle, flex: 1 }} type="number" value={dcDescontoValor} onChange={e => setDcDescontoValor(Number(e.target.value))} />
                        </div>
                      </div>
                      <div><label style={labelStyle}>Parcelas</label><input style={inputStyle} type="number" min={1} value={dcParcelas} onChange={e => setDcParcelas(Number(e.target.value))} /></div>
                      <div><label style={labelStyle}>Responsável pela Venda</label><input style={inputStyle} value={dcResponsavelVenda} onChange={e => setDcResponsavelVenda(e.target.value)} /></div>
                      <div><label style={labelStyle}>Unidade</label><input style={inputStyle} value={dcUnidadeContratada} onChange={e => setDcUnidadeContratada(e.target.value)} /></div>
                    </div>
                    <div>
                      <label style={labelStyle}>Observações Contratuais</label>
                      <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={dcObservacoesContratuais} onChange={e => setDcObservacoesContratuais(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <button style={{ ...btnSecondary, color: '#ec4899', borderColor: '#ec489944' }} onClick={() => setShowContractPreview(true)}>
                        <i className="fa-solid fa-file-contract" style={{ marginRight: '6px' }} />Gerar Contrato
                      </button>
                      <button style={btnPrimary} onClick={handleSaveClientCommercial}>Salvar Dados</button>
                    </div>
                  </div>
                )}
                {clientModalTab === 'pessoais' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><label style={labelStyle}>Nome</label><input style={inputStyle} value={dcNome} onChange={e => setDcNome(e.target.value)} /></div>
                    <div><label style={labelStyle}>E-mail</label><input style={inputStyle} value={dcEmail} onChange={e => setDcEmail(e.target.value)} /></div>
                    <div><label style={labelStyle}>CPF</label><input style={inputStyle} value={dcCpf} onChange={e => setDcCpf(e.target.value)} /></div>
                    <div><label style={labelStyle}>Telefone</label><input style={inputStyle} value={dcTelefone} onChange={e => setDcTelefone(e.target.value)} /></div>
                    <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button style={btnSecondary} onClick={() => setShowClientModal(false)}>Fechar</button>
                      <button style={btnPrimary} onClick={handleSaveClientPersonal}>Salvar</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showContractPreview && selectedClient && (
          <div style={{ ...modalOverlay, zIndex: 9100 }} onClick={e => { if (e.target === e.currentTarget) setShowContractPreview(false); }}>
            <div style={{ ...modalBox, maxWidth: '800px' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>Pré-visualização do Contrato</h3>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setShowContractPreview(false)}><i className="fa-solid fa-xmark" /></button>
              </div>
              <div style={{ padding: '24px' }}>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px', maxHeight: '40vh', overflow: 'auto', marginBottom: '20px', background: '#fff', color: '#111' }} dangerouslySetInnerHTML={{ __html: generateContractTemplate() }} />
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Nome do Assinante</label>
                  <input style={inputStyle} value={signatureName} onChange={e => setSignatureName(e.target.value)} placeholder="Nome completo" />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button style={btnSecondary} onClick={() => handleCreateContract('pendente')}>Salvar como Pendente</button>
                  <button style={{ ...btnPrimary, background: '#6366f1', borderColor: '#6366f1' }} onClick={() => handleCreateContract('clicksign')}>
                    <i className="fa-solid fa-file-signature" style={{ marginRight: '6px' }} />Enviar p/ Clicksign
                  </button>
                  <button style={btnPrimary} onClick={() => handleCreateContract('assinado')}>
                    <i className="fa-solid fa-signature" style={{ marginRight: '6px' }} />Assinar e Ativar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showFreezeModal && (
          <div style={{ ...modalOverlay, zIndex: 9200 }} onClick={e => { if (e.target === e.currentTarget) setShowFreezeModal(false); }}>
            <div style={{ ...modalBox, maxWidth: '400px' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>Congelar Contrato</h3>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setShowFreezeModal(false)}><i className="fa-solid fa-xmark" /></button>
              </div>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div><label style={labelStyle}>Data de Início</label><input style={inputStyle} type="date" value={freezeStartDate} onChange={e => setFreezeStartDate(e.target.value)} /></div>
                <div><label style={labelStyle}>Duração (dias, máx. 30)</label><input style={inputStyle} type="number" min={1} max={30} value={freezeDuration} onChange={e => setFreezeDuration(Number(e.target.value))} /></div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button style={btnSecondary} onClick={() => setShowFreezeModal(false)}>Cancelar</button>
                  <button style={btnPrimary} onClick={handleFreezeContract}>Congelar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
