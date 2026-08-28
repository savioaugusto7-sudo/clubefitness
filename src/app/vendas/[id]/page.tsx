'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { generateContractTemplate } from '@/utils/contractTemplate';
import { getCardRateForInstallment } from '@/utils/paymentRates';
import { isMinorFromBirthDate } from '@/utils/dateUtils';
import { calculateContractEndDate } from '@/utils/contractValidity';

export default function VendaPage({ params }: { params: any }) {
  const router = useRouter();
  const unwrappedParams = 'then' in params ? use(params) : params;
  const id = unwrappedParams.id;

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [proposal, setProposal] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Workflow steps: 'form' -> 'contract_review' -> 'success'
  const [step, setStep] = useState<'form' | 'contract_review' | 'success'>('form');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [contractHtml, setContractHtml] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');

  // Form States - Dados Pessoais
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');

  // Form States - Endereço
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');

  // Form States - Responsável Legal (quando menor de idade)
  const [respNome, setRespNome] = useState('');
  const [respCpf, setRespCpf] = useState('');
  const [respEmail, setRespEmail] = useState('');
  const [respTelefone, setRespTelefone] = useState('');

  // Form States - Pagamento (Boleto / Pix ou Cartão de Crédito)
  const [formaPagamento, setFormaPagamento] = useState<'boleto' | 'cartao'>('boleto');
  const [parcelas, setParcelas] = useState(1);
  const [dataVencimento, setDataVencimento] = useState('');

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/propostas?id=${id}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const prop = json.data;
          const isMinorCalc = Boolean(prop.isMinor || isMinorFromBirthDate(prop.clientId?.dadosPessoais?.dataNascimento || prop.clientId?.dadosPessoais?.nascimento));
          setProposal({ ...prop, isMinor: isMinorCalc });
          
          // Calcular parcelamento inicial sugerido para Boleto / Pix
          const isAnualProp = prop.duracao === 'anual' || (prop.planoTipo && prop.planoTipo.toLowerCase().includes('anual')) || (prop.vigenciaQtd || 1) >= 12;
          const isSemanalProp = prop.duracao === 'semana';
          const isRecorrenteProp = Boolean(prop.criarRecorrenciaMensal);
          const mEq = isAnualProp ? 12 : isSemanalProp ? Math.max(1, Math.floor((prop.vigenciaQtd || 1) / 4)) : Math.max(1, prop.vigenciaQtd || 1);
          const defaultBoletoInstallments = isRecorrenteProp ? 1 : isAnualProp ? 10 : Math.min(10, mEq);
          setParcelas(defaultBoletoInstallments);

          // Prefill with client personal data if already exists
          const pes = prop.clientId?.dadosPessoais || {};
          setNome(pes.nome || '');
          setCpf(pes.cpf || '');
          setEmail(pes.email || '');
          setTelefone(pes.telefone || '');
          setCep(pes.cep || '');
          setEndereco(pes.endereco || '');
          setNumero(pes.numero || '');
          setComplemento(pes.complemento || '');
          setBairro(pes.bairro || '');
          setCidade(pes.cidade || '');
          setEstado(pes.estado || '');
        } else {
          setErrorMsg(json.error || 'Proposta não encontrada.');
        }
      })
      .catch((err) => {
        setErrorMsg('Erro ao carregar proposta: ' + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleCepBlur = async () => {
    const cleaned = cep.replace(/\D/g, '');
    if (cleaned.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setEndereco(data.logradouro || '');
        setBairro(data.bairro || '');
        setCidade(data.localidade || '');
        setEstado(data.uf || '');
      }
    } catch {}
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-darker)', color: 'var(--text-main)', padding: '20px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', maxWidth: '360px', width: '100%', margin: '0 auto' }}>
          <i className="fa-solid fa-circle-notch fa-spin fa-3x" style={{ color: 'var(--color-primary)', marginBottom: '18px', display: 'inline-block' }}></i>
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: '0 0 8px 0', textAlign: 'center' }}>
            Carregando proposta comercial...
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0, textAlign: 'center' }}>
            Aguarde um instante enquanto preparamos seu contrato.
          </p>
        </div>
      </div>
    );
  }

  if (errorMsg || !proposal) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-darker)', color: 'var(--text-main)', padding: '20px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '30px', maxWidth: '500px', width: '100%', textAlign: 'center', boxShadow: 'var(--shadow-card)' }}>
          <i className="fa-solid fa-circle-exclamation fa-3x" style={{ color: 'var(--color-danger)', marginBottom: '15px' }}></i>
          <h2 style={{ fontFamily: 'var(--font-title)', marginBottom: '10px' }}>Ops! Ocorreu um erro</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>{errorMsg || 'A proposta comercial que você está tentando acessar é inválida ou expirou.'}</p>
          <button className="btn btn-primary" onClick={() => router.push('/')} style={{ width: '100%' }}>Voltar ao Início</button>
        </div>
      </div>
    );
  }

  // Se a proposta expirou (mais de 3 dias)
  if (proposal.status === 'expirada') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-darker)', color: 'var(--text-main)', padding: '20px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '40px 30px', maxWidth: '520px', width: '100%', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: '2px solid #ef4444' }}>
            <i className="fa-solid fa-clock-rotate-left fa-2x" style={{ color: '#ef4444' }}></i>
          </div>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', marginBottom: '12px', color: '#fff' }}>Link de Venda Expirado</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '20px' }}>
            Este link de proposta comercial possuía validade de <strong>3 dias</strong> e expirou por segurança.
          </p>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '25px' }}>
            Entre em contato com a equipe da <strong>Clube Fitness Fisio</strong> para receber um novo link de contratação.
          </p>
          <button 
            className="btn btn-primary" 
            onClick={() => router.push('/')}
            style={{ width: '100%', padding: '12px' }}
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  // Se a proposta já foi respondida ou finalizada
  if (proposal.status === 'respondida' || proposal.status === 'aceita' || proposal.status === 'finalizada') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-darker)', color: 'var(--text-main)', padding: '20px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 'var(--radius-md)', padding: '40px 30px', maxWidth: '520px', width: '100%', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: '2px solid #22c55e' }}>
            <i className="fa-solid fa-check fa-2x" style={{ color: '#22c55e' }}></i>
          </div>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', marginBottom: '12px', color: '#fff' }}>Proposta Já Concluída!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '20px' }}>
            Os dados desta proposta já foram preenchidos e a contratação foi enviada com sucesso.
          </p>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            Acesse o seu WhatsApp para assinar o documento pelo Clicksign caso ainda não tenha assinado.
          </p>
        </div>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const basePrice = proposal.valorAcordado || 0;

  const isAnual = proposal.duracao === 'anual' || (proposal.planoTipo && proposal.planoTipo.toLowerCase().includes('anual')) || (proposal.vigenciaQtd || 1) >= 12;
  const isSemanal = proposal.duracao === 'semana';
  const isRecorrente = Boolean(proposal.criarRecorrenciaMensal);
  const isRecorrenteMensalSemVinculo = isRecorrente && proposal.duracao === 'mensal' && Number(proposal.vigenciaQtd || 1) === 1;

  // Equivalência de meses para cálculo
  const vigenciaMesesEquivalentes = (() => {
    if (isAnual) return 12;
    if (isSemanal) {
      return Math.max(1, Math.floor((proposal.vigenciaQtd || 1) / 4));
    }
    return Math.max(1, proposal.vigenciaQtd || 1);
  })();

  const rawDataInicio = proposal.dataInicio || new Date().toISOString().split('T')[0];
  const dataFimCalculadaRaw = calculateContractEndDate(
    rawDataInicio,
    isAnual ? 'anual' : (proposal.duracao || 'mensal'),
    isAnual ? 1 : vigenciaMesesEquivalentes,
    undefined,
    isRecorrenteMensalSemVinculo
  );

  const formatPtBr = (str: string) => {
    if (!str) return '-';
    const parts = str.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return str;
  };
  const dataInicioFormatada = formatPtBr(rawDataInicio);
  const dataFimCalculada = formatPtBr(dataFimCalculadaRaw);

  // Máximo de parcelas para Boleto / Pix
  const maxInstallmentsBoleto = (() => {
    if (isRecorrente) return 1;
    if (isAnual) return 10;
    return Math.min(10, vigenciaMesesEquivalentes);
  })();

  // Máximo de parcelas para Cartão de Crédito
  const maxInstallmentsCartao = (() => {
    if (isRecorrente) return 1;
    if (isAnual) return 12;
    return Math.min(12, vigenciaMesesEquivalentes * 2);
  })();

  const maxInstallments = formaPagamento === 'cartao' ? maxInstallmentsCartao : maxInstallmentsBoleto;
  const currentInstallments = Math.max(1, Math.min(parcelas, maxInstallments));

  const cardRate = formaPagamento === 'cartao' ? getCardRateForInstallment(currentInstallments) : 0;
  const finalPrice = formaPagamento === 'cartao' ? Number((basePrice * (1 + cardRate)).toFixed(2)) : basePrice;
  const valorParcelaAtual = Number((finalPrice / currentInstallments).toFixed(2));

  // Valores de referência para apresentação nos cards de modalidade:
  const valorParcelaMaxBoleto = Number((basePrice / maxInstallmentsBoleto).toFixed(2));
  const valorMensalEquivalenteAnual = isAnual ? Number((basePrice / 12).toFixed(2)) : null;

  const cardRateMax = getCardRateForInstallment(maxInstallmentsCartao);
  const finalPriceMaxCartao = Number((basePrice * (1 + cardRateMax)).toFixed(2));
  const valorParcelaMaxCartao = Number((finalPriceMaxCartao / maxInstallmentsCartao).toFixed(2));

  const handlePaymentChange = (type: 'boleto' | 'cartao') => {
    setFormaPagamento(type);
    if (type === 'boleto') {
      setParcelas(maxInstallmentsBoleto);
    } else {
      setParcelas(maxInstallmentsCartao);
    }
  };

  const handleProceedToContractReview = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);
    
    const errorsList: string[] = [];
    if (!cep.trim() || cep.length !== 8) errorsList.push('CEP inválido (deve conter 8 dígitos).');
    if (!endereco.trim()) errorsList.push('Endereço (Rua/Avenida) é obrigatório.');
    if (!numero.trim()) errorsList.push('Número residencial é obrigatório.');
    if (!bairro.trim()) errorsList.push('Bairro é obrigatório.');
    if (!cidade.trim()) errorsList.push('Cidade é obrigatória.');
    if (!estado.trim() || estado.length !== 2) errorsList.push('UF do estado é obrigatória (2 letras).');

    // Validação adicional para menor de idade
    if (proposal.isMinor) {
      if (!respNome.trim()) errorsList.push('Nome do Responsável Legal é obrigatório.');
      if (!respCpf.trim() || respCpf.length !== 11) errorsList.push('CPF do Responsável Legal inválido (11 dígitos).');
      if (!respEmail.trim() || !respEmail.includes('@')) errorsList.push('E-mail do Responsável Legal é obrigatório.');
      if (!respTelefone.trim()) errorsList.push('Telefone/WhatsApp do Responsável Legal é obrigatório.');
    } else {
      if (!nome.trim()) errorsList.push('Nome Completo é obrigatório.');
      if (!cpf.trim() || cpf.length !== 11) errorsList.push('CPF inválido (deve conter 11 dígitos).');
      if (!email.trim() || !email.includes('@')) errorsList.push('E-mail válido é obrigatório.');
      if (!telefone.trim()) errorsList.push('Telefone / WhatsApp é obrigatório.');
    }

    if (!dataVencimento) {
      errorsList.push('Data do primeiro vencimento é obrigatória.');
    } else {
      const selectedDate = new Date(dataVencimento + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + 31);
      
      if (selectedDate < today || selectedDate > maxDate) {
        errorsList.push('A data do primeiro vencimento deve estar entre hoje e os próximos 31 dias.');
      }
    }

    if (errorsList.length > 0) {
      setValidationErrors(errorsList);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Gerar minuta HTML do contrato com os dados informados
    // Quando menor: clientNome/clientCpf = dados do RESPONSÁVEL (quem assina o contrato)
    // beneficiarioNome/beneficiarioCpf = dados do MENOR (quem usa o serviço)
    const contractClientNome = proposal.isMinor ? respNome : nome;
    const contractClientCpf = proposal.isMinor ? respCpf : cpf;
    const contractClientEmail = proposal.isMinor ? respEmail : email;
    const contractClientTelefone = proposal.isMinor ? respTelefone : telefone;

    const html = generateContractTemplate({
      clientNome: contractClientNome,
      clientCpf: contractClientCpf,
      clientEmail: contractClientEmail,
      clientTelefone: contractClientTelefone,
      clientEndereco: endereco,
      clientNumero: numero,
      clientComplemento: complemento,
      clientBairro: bairro,
      clientCidade: cidade,
      clientEstado: estado,
      clientCep: cep,
      planNome: proposal.planoNome,
      planPreco: finalPrice,
      planTipo: proposal.planoTipo,
      descontoTipo: proposal.descontoTipo,
      descontoValor: proposal.descontoValor,
      parcelas: currentInstallments,
      formaPagamento: formaPagamento,
      dataInicio: proposal.dataInicio || todayStr,
      dataVencimento: dataVencimento,
      observacoesContratuais: proposal.observacoesContratuais,
      creditosMensais: proposal.creditosMensais || (proposal.frequencia * 4 + 1),
      creditosMassagem: proposal.creditosMassagem !== undefined ? Number(proposal.creditosMassagem) : 0,
      creditosEmergencia: proposal.creditosEmergencia !== undefined ? Number(proposal.creditosEmergencia) : (isAnual ? 1 : 0),
      duracao: proposal.duracao,
      vigenciaQtd: proposal.vigenciaQtd,
      criarRecorrenciaMensal: proposal.criarRecorrenciaMensal,
      recorrenciaMeses: proposal.recorrenciaMeses,
      // Menor de idade
      isMinor: proposal.isMinor || false,
      beneficiarioNome: proposal.isMinor ? nome : undefined,
      beneficiarioCpf: proposal.isMinor ? cpf : undefined
    });

    setContractHtml(html);
    setStep('contract_review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmAndDispatchClicksign = async () => {
    if (!acceptedTerms) {
      alert('Por favor, confirme que você leu e concorda com as cláusulas do contrato.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        formaPagamentoEscolhida: formaPagamento,
        parcelasEscolhidas: currentInstallments,
        valorFinalRecalculado: finalPrice,
        dataVencimentoEscolhida: dataVencimento,
        dadosPreenchidos: proposal.isMinor ? {
          // Quando menor: NÃO envia nome/cpf (mantém do menor em dadosPessoais)
          // Sobrescreve apenas contato e endereço com dados do responsável
          telefone: respTelefone,
          email: respEmail,
          cep,
          endereco,
          numero,
          complemento,
          bairro,
          cidade,
          estado,
          // Dados do responsável para Clicksign
          responsavelNome: respNome,
          responsavelCpf: respCpf
        } : {
          nome,
          cpf,
          email,
          telefone,
          cep,
          endereco,
          numero,
          complemento,
          bairro,
          cidade,
          estado
        },
        dispararClicksign: true,
        contratoTexto: contractHtml
      };

      const res = await fetch(`/api/propostas?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSignatureUrl(data.signatureUrl || '');
        setStep('success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert('Erro ao emitir contrato: ' + (data.error || 'Falha no processamento.'));
      }
    } catch (err: any) {
      console.error('Erro no envio da proposta:', err);
      alert('Erro ao conectar com o servidor: ' + (err.message || 'Verifique sua conexão e tente novamente.'));
    } finally {
      setSubmitting(false);
    }
  };

  const maxDateObj = new Date();
  maxDateObj.setDate(maxDateObj.getDate() + 31);
  const maxDateStr = maxDateObj.toISOString().split('T')[0];

  // ==========================================
  // ETAPA 3: SUCESSO (DISPARADO NO CLICKSIGN)
  // ==========================================
  if (step === 'success') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-darker)', color: 'var(--text-main)', padding: '20px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '40px', maxWidth: '600px', width: '100%', textAlign: 'center', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ width: '85px', height: '85px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: '2px solid #22c55e' }}>
            <i className="fa-brands fa-whatsapp fa-3x" style={{ color: '#22c55e' }}></i>
          </div>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.8rem', marginBottom: '15px', color: 'var(--text-main)' }}>Contrato Enviado para o WhatsApp!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '25px' }}>
            Perfeito, <strong>{nome}</strong>! O seu contrato foi gerado e enviado pela <strong>Clicksign</strong> diretamente para o seu WhatsApp no número <strong>{telefone}</strong>.
          </p>

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '16px', fontSize: '0.9rem', color: 'var(--text-dim)', textAlign: 'left', marginBottom: '25px' }}>
            <strong style={{ color: '#fff', display: 'block', marginBottom: '6px' }}>Resumo Contratado:</strong>
            • Plano: {proposal.planoNome}<br />
            • Pagamento: {formaPagamento === 'boleto' ? `Boleto / Pix (${currentInstallments}x de R$ ${valorParcelaAtual.toFixed(2).replace('.', ',')})` : `Cartão de Crédito (${currentInstallments}x de R$ ${valorParcelaAtual.toFixed(2).replace('.', ',')})`}<br />
            • Valor Total: R$ {finalPrice.toFixed(2).replace('.', ',')}
          </div>

          <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.6', margin: '20px 0 0 0' }}>
            <i className="fa-solid fa-bell" style={{ color: 'var(--color-primary)', marginRight: '6px' }}></i>
            Acesse o aplicativo do <strong>WhatsApp</strong> no seu celular para assinar o documento.<br />
            <small style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Assim que você concluir a assinatura, seu plano e créditos de treino serão ativados automaticamente. Você já pode fechar esta página.
            </small>
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // ETAPA 2: LEITURA E REVISÃO DO CONTRATO
  // ==========================================
  if (step === 'contract_review') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-darker)', color: 'var(--text-main)', padding: '40px 20px', fontFamily: 'var(--font-body)' }}>
        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '1.9rem', fontWeight: 800, color: 'var(--color-primary)' }}>CLUBE FITNESS FISIO</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Revisão e Leitura do Contrato de Prestação de Serviços</p>
          </div>

          {/* Stepper indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>1</span>
              <span>Dados & Pagamento</span>
            </div>
            <i className="fa-solid fa-chevron-right" style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}></i>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.9rem' }}>
              <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
              <span>Leitura do Contrato</span>
            </div>
            <i className="fa-solid fa-chevron-right" style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}></i>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
              <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
              <span>Assinatura (Clicksign)</span>
            </div>
          </div>

          {/* Contract Content Card */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '25px', marginBottom: '25px', boxShadow: 'var(--shadow-card)' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', marginBottom: '15px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <span>
                <i className="fa-solid fa-file-contract" style={{ marginRight: '8px' }}></i> Minuta Oficial do Contrato
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <i className="fa-solid fa-lock" style={{ marginRight: '5px', color: 'var(--color-primary)' }}></i>
                Ambiente Seguro
              </span>
            </h3>

            {/* Scrollable Document Container */}
            <div style={{ background: '#ffffff', color: '#111827', padding: '30px', borderRadius: '8px', border: '1px solid var(--border-color)', maxHeight: '520px', overflowY: 'auto', lineHeight: '1.6', fontSize: '0.92rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)' }}>
              <div dangerouslySetInnerHTML={{ __html: contractHtml }} />
            </div>

            {/* Acceptance Checkbox */}
            <div style={{ marginTop: '20px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  style={{ width: '22px', height: '22px', marginTop: '2px', accentColor: '#10b981', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 600, lineHeight: '1.4' }}>
                  Declaro que li, conferi meus dados cadastrais e concordo integralmente com todas as cláusulas e condições deste contrato de prestação de serviços.
                </span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={submitting}
              onClick={() => {
                setStep('form');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={{ flex: '1 1 180px', padding: '16px', fontSize: '1rem', fontWeight: 600, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <i className="fa-solid fa-arrow-left"></i> Voltar e Editar Dados
            </button>

            <button
              type="button"
              className="btn btn-primary"
              disabled={!acceptedTerms || submitting}
              onClick={handleConfirmAndDispatchClicksign}
              style={{
                flex: '2 1 280px',
                padding: '16px',
                fontSize: '1.1rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                background: acceptedTerms ? '#22c55e' : 'var(--bg-secondary)',
                borderColor: acceptedTerms ? '#22c55e' : 'var(--border-color)',
                color: acceptedTerms ? '#fff' : 'var(--text-dim)',
                cursor: (acceptedTerms && !submitting) ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              {submitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Gerando contrato e enviando p/ WhatsApp...
                </>
              ) : (
                <>
                  <i className="fa-brands fa-whatsapp fa-lg"></i> Confirmar e Assinar pelo WhatsApp
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // ETAPA 1: FORMULÁRIO DE DADOS E PAGAMENTO
  // ==========================================
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-darker)', color: 'var(--text-main)', padding: '40px 20px', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)' }}>CLUBE FITNESS FISIO</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '5px' }}>Preencha seus dados para liberação do seu contrato</p>
        </div>

        {/* Stepper indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.9rem' }}>
            <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
            <span>Dados & Pagamento</span>
          </div>
          <i className="fa-solid fa-chevron-right" style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}></i>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
            <span>Leitura do Contrato</span>
          </div>
          <i className="fa-solid fa-chevron-right" style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}></i>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
            <span>Assinatura (Clicksign)</span>
          </div>
        </div>

        {/* Validation Errors banner */}
        {validationErrors.length > 0 && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', padding: '20px', marginBottom: '25px' }}>
            <h4 style={{ color: 'var(--color-danger)', margin: '0 0 10px 0', fontFamily: 'var(--font-title)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-triangle-exclamation"></i> Por favor, corrija os seguintes erros:
            </h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-main)', fontSize: '0.9rem' }}>
              {validationErrors.map((err, idx) => <li key={idx} style={{ marginBottom: '4px' }}>{err}</li>)}
            </ul>
          </div>
        )}

        <form onSubmit={handleProceedToContractReview}>
          {/* 1. Proposta Comercial */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '25px', marginBottom: '25px', boxShadow: 'var(--shadow-card)' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', marginBottom: '15px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-file-invoice-dollar"></i> Proposta Comercial Negociada
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Plano</span>
                <p style={{ fontSize: '1.05rem', fontWeight: 700, margin: '5px 0 0 0' }}>{proposal.planoNome}</p>
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginTop: '2px' }}>
                  {isRecorrenteMensalSemVinculo 
                    ? 'Mensal Recorrente' 
                    : `Vigência: ${proposal.duracao === 'semana' ? `${proposal.vigenciaQtd} semana(s)` : proposal.duracao === 'mensal' ? `${proposal.vigenciaQtd} mês(es)` : `${proposal.vigenciaQtd} ano(s)`}`
                  }
                </small>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Período de Vigência</span>
                <p style={{ fontSize: '0.95rem', fontWeight: 700, margin: '5px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className="fa-solid fa-calendar-days" style={{ color: 'var(--color-primary)', fontSize: '0.85rem' }}></i>
                  {isRecorrenteMensalSemVinculo 
                    ? `${dataInicioFormatada} (Renovação Automática)` 
                    : `${dataInicioFormatada} até ${dataFimCalculada}`
                  }
                </p>
              </div>

              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Valor Base Negociado</span>
                <p style={{ fontSize: '1.05rem', fontWeight: 700, margin: '5px 0 0 0', color: 'var(--color-primary)' }}>R$ {basePrice.toFixed(2).replace('.', ',')}</p>
                {valorMensalEquivalenteAnual !== null && (
                  <small style={{ color: '#fde047', fontSize: '0.74rem', display: 'block', marginTop: '2px' }}>
                    (R$ {valorMensalEquivalenteAnual.toFixed(2).replace('.', ',')}/mês no usufruto)
                  </small>
                )}
              </div>

              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Franquia Mensal</span>
                <p style={{ fontSize: '0.95rem', fontWeight: 700, margin: '5px 0 0 0', color: '#38bdf8' }}>
                  {proposal.creditosMensais} treinos/mês
                </p>
                {((proposal.creditosMassagem || 0) > 0 || (proposal.creditosEmergencia || (isAnual ? 1 : 0)) > 0) && (
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.74rem', display: 'block', marginTop: '2px' }}>
                    {[
                      (proposal.creditosMassagem || 0) > 0 ? `${proposal.creditosMassagem} massagem/mês` : '',
                      (proposal.creditosEmergencia !== undefined ? proposal.creditosEmergencia : (isAnual ? 1 : 0)) > 0 ? `${proposal.creditosEmergencia !== undefined ? proposal.creditosEmergencia : (isAnual ? 1 : 0)} emergência/mês` : ''
                    ].filter(Boolean).join(' • ')}
                  </small>
                )}
              </div>
            </div>
          </div>

          {/* 2. Dados Pessoais / Responsável Legal */}
          {proposal.isMinor ? (
            <>
              {/* Banner: Contrato para Menor de Idade */}
              <div style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.4)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: '25px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <i className="fa-solid fa-child" style={{ color: '#eab308', fontSize: '1.3rem', marginTop: '2px' }}></i>
                <div>
                  <strong style={{ color: '#eab308', display: 'block', marginBottom: '4px' }}>Contrato para Menor de Idade</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    Esta proposta foi configurada para um(a) beneficiário(a) menor de idade. Preencha os dados do <strong>Responsável Legal</strong> que assinará o contrato. O contrato será enviado para o WhatsApp do responsável.
                  </span>
                </div>
              </div>

              {/* Beneficiário (read-only — dados do menor, preenchidos pelo admin) */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '25px', marginBottom: '25px', boxShadow: 'var(--shadow-card)' }}>
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', marginBottom: '20px', color: '#eab308', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-child"></i> 1. Beneficiário (Menor de Idade)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '20px' }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nome do Beneficiário</label>
                    <input className="form-control" type="text" value={nome} readOnly style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-dim)', cursor: 'not-allowed' }} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>CPF do Beneficiário</label>
                    <input className="form-control" type="text" value={cpf} readOnly style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-dim)', cursor: 'not-allowed' }} />
                  </div>
                </div>
              </div>

              {/* Responsável Legal (editável — quem assina) */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: 'var(--radius-md)', padding: '25px', marginBottom: '25px', boxShadow: 'var(--shadow-card)' }}>
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', marginBottom: '20px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-user-shield"></i> 2. Dados do Responsável Legal
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '18px', marginTop: '-8px' }}>
                  O responsável legal será o signatário do contrato e receberá o documento pelo WhatsApp.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '20px' }}>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nome Completo do Responsável *</label>
                    <input className="form-control" type="text" value={respNome} onChange={(e) => setRespNome(e.target.value)} required style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>CPF do Responsável (Apenas números) *</label>
                    <input className="form-control" type="text" value={respCpf} onChange={(e) => setRespCpf(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="12345678900" required style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>E-mail do Responsável *</label>
                    <input className="form-control" type="email" value={respEmail} onChange={(e) => setRespEmail(e.target.value)} required style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }} />
                  </div>
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Telefone / WhatsApp do Responsável (Contrato será enviado aqui) *</label>
                    <input className="form-control" type="text" value={respTelefone} onChange={(e) => setRespTelefone(e.target.value)} placeholder="(99) 99999-9999" required style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }} />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '25px', marginBottom: '25px', boxShadow: 'var(--shadow-card)' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', marginBottom: '20px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-user-gear"></i> 1. Dados Pessoais
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '20px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nome Completo *</label>
                  <input className="form-control" type="text" value={nome} onChange={(e) => setNome(e.target.value)} required style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }} />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>E-mail (Para assinatura eletrônica) *</label>
                  <input className="form-control" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }} />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Telefone / WhatsApp (Para recebimento do contrato) *</label>
                  <input className="form-control" type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(99) 99999-9999" required style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }} />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>CPF (Apenas números) *</label>
                  <input className="form-control" type="text" value={cpf} onChange={(e) => setCpf(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="12345678900" required style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }} />
                </div>
              </div>
            </div>
          )}

          {/* 3. Endereço Residencial */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '25px', marginBottom: '25px', boxShadow: 'var(--shadow-card)' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', marginBottom: '20px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-map-location-dot"></i> {proposal.isMinor ? '3' : '2'}. Endereço Residencial
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '20px' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>CEP *</label>
                <input className="form-control" type="text" value={cep} onChange={(e) => setCep(e.target.value.replace(/\D/g, '').slice(0, 8))} onBlur={handleCepBlur} placeholder="30000000" required style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }} />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Rua / Avenida *</label>
                <input className="form-control" type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)} required style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }} />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Número *</label>
                <input className="form-control" type="text" value={numero} onChange={(e) => setNumero(e.target.value)} required style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }} />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Complemento</label>
                <input className="form-control" type="text" value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Apto, Bloco..." style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }} />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Bairro *</label>
                <input className="form-control" type="text" value={bairro} onChange={(e) => setBairro(e.target.value)} required style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }} />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cidade *</label>
                <input className="form-control" type="text" value={cidade} onChange={(e) => setCidade(e.target.value)} required style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }} />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>UF (Estado) *</label>
                <input className="form-control" type="text" value={estado} onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))} maxLength={2} placeholder="MG" required style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }} />
              </div>
            </div>
          </div>

          {/* 4. Forma de Pagamento */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '25px', marginBottom: '25px', boxShadow: 'var(--shadow-card)' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', marginBottom: '20px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-credit-card"></i> {proposal.isMinor ? '4' : '3'}. Condições de Pagamento
            </h3>

            {/* Cards de Apresentação e Escolha: Boleto / Pix vs Cartão de Crédito */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '25px' }}>
              
              {/* Card 1: Boleto / Pix */}
              <div
                onClick={() => handlePaymentChange('boleto')}
                style={{
                  background: formaPagamento === 'boleto' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)',
                  border: `2px solid ${formaPagamento === 'boleto' ? 'var(--color-primary)' : 'var(--border-color)'}`,
                  borderRadius: '12px',
                  padding: '20px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                        <i className="fa-solid fa-barcode fa-lg"></i>
                      </div>
                      <div>
                        <strong style={{ fontSize: '1.05rem', color: '#fff', display: 'block' }}>Boleto / Pix</strong>
                        <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Sem juros no parcelamento</small>
                      </div>
                    </div>
                    <input 
                      type="radio" 
                      name="formaPagamentoRadio" 
                      checked={formaPagamento === 'boleto'} 
                      onChange={() => handlePaymentChange('boleto')} 
                      style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)', cursor: 'pointer' }} 
                    />
                  </div>

                  {/* Valor da Parcela e Total */}
                  <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {maxInstallmentsBoleto > 1 ? `Até ${maxInstallmentsBoleto}x de` : 'À vista (1x) de'}
                    </div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-primary)', margin: '2px 0' }}>
                      R$ {valorParcelaMaxBoleto.toFixed(2).replace('.', ',')}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                      Valor Total: <strong style={{ color: '#fff' }}>R$ {basePrice.toFixed(2).replace('.', ',')}</strong>
                    </div>
                  </div>

                  {/* Destaque no plano anual: Valor referente ao mês de acesso */}
                  {valorMensalEquivalenteAnual !== null && (
                    <div style={{ marginTop: '10px', padding: '9px 12px', background: 'rgba(234, 179, 8, 0.12)', border: '1px solid rgba(234, 179, 8, 0.35)', borderRadius: '6px', fontSize: '0.82rem', color: '#fde047', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-fire" style={{ color: '#eab308' }}></i>
                      <span>Equivalente a <strong style={{ color: '#fff' }}>R$ {valorMensalEquivalenteAnual.toFixed(2).replace('.', ',')}/mês</strong> nos 12 meses de acesso</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: Cartão de Crédito */}
              <div
                onClick={() => handlePaymentChange('cartao')}
                style={{
                  background: formaPagamento === 'cartao' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255,255,255,0.02)',
                  border: `2px solid ${formaPagamento === 'cartao' ? '#3b82f6' : 'var(--border-color)'}`,
                  borderRadius: '12px',
                  padding: '20px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                        <i className="fa-solid fa-credit-card fa-lg"></i>
                      </div>
                      <div>
                        <strong style={{ fontSize: '1.05rem', color: '#fff', display: 'block' }}>Cartão de Crédito</strong>
                        <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Parcelamento flexível</small>
                      </div>
                    </div>
                    <input 
                      type="radio" 
                      name="formaPagamentoRadio" 
                      checked={formaPagamento === 'cartao'} 
                      onChange={() => handlePaymentChange('cartao')} 
                      style={{ width: '18px', height: '18px', accentColor: '#3b82f6', cursor: 'pointer' }} 
                    />
                  </div>

                  {/* Valor da Parcela e Total */}
                  <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {maxInstallmentsCartao > 1 ? `Até ${maxInstallmentsCartao}x de` : 'À vista (1x) de'}
                    </div>
                    <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#60a5fa', margin: '2px 0' }}>
                      R$ {valorParcelaMaxCartao.toFixed(2).replace('.', ',')}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                      Valor Total: <strong style={{ color: '#fff' }}>R$ {finalPriceMaxCartao.toFixed(2).replace('.', ',')}</strong>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Installments & Due Date */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                  Selecione o Número de Parcelas
                </label>
                <select 
                  className="form-control" 
                  value={currentInstallments} 
                  onChange={(e) => setParcelas(Number(e.target.value))} 
                  disabled={maxInstallments <= 1}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 14px', color: '#fff', fontSize: '0.95rem' }}
                >
                  {Array.from({ length: maxInstallments }, (_, i) => i + 1).map((num) => {
                    const rate = formaPagamento === 'cartao' ? getCardRateForInstallment(num) : 0;
                    const total = formaPagamento === 'cartao' ? Number((basePrice * (1 + rate)).toFixed(2)) : basePrice;
                    const instVal = Number((total / num).toFixed(2));
                    return (
                      <option key={num} value={num} style={{ background: '#1e293b', color: '#fff' }}>
                        {num}x de R$ {instVal.toFixed(2).replace('.', ',')} (Total: R$ {total.toFixed(2).replace('.', ',')})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Data do Primeiro Vencimento *</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={dataVencimento} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setDataVencimento(val);
                    if (val) {
                      const sel = new Date(val + 'T00:00:00');
                      const max = new Date(maxDateStr + 'T00:00:00');
                      const min = new Date(todayStr + 'T00:00:00');
                      if (sel > max) {
                        setDataVencimento(maxDateStr);
                      } else if (sel < min) {
                        setDataVencimento(todayStr);
                      }
                    }
                  }} 
                  min={todayStr} 
                  max={maxDateStr} 
                  required 
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }} 
                />
                <small style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                  Selecione uma data para o primeiro vencimento entre hoje e os próximos 31 dias.
                </small>
              </div>

              {/* Resumo da Condição de Pagamento Escolhida */}
              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block', fontWeight: 600 }}>
                    Condição Selecionada:
                  </span>
                  <span style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 700 }}>
                    {formaPagamento === 'boleto' ? 'Boleto / Pix' : 'Cartão de Crédito'}
                  </span>
                  {dataVencimento && (
                    <small style={{ color: 'var(--text-dim)', display: 'block', marginTop: '2px', fontSize: '0.8rem' }}>
                      1º Vencimento: {new Date(dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </small>
                  )}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: formaPagamento === 'boleto' ? 'var(--color-primary)' : '#60a5fa' }}>
                    {currentInstallments}x de R$ {valorParcelaAtual.toFixed(2).replace('.', ',')}
                  </div>
                  <small style={{ color: 'var(--text-dim)', fontSize: '0.82rem', display: 'block' }}>
                    Valor Total: <strong style={{ color: '#fff' }}>R$ {finalPrice.toFixed(2).replace('.', ',')}</strong>
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Action -> Step 2 */}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.1rem', fontWeight: 700, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span>Avançar para Leitura do Contrato</span>
            <i className="fa-solid fa-arrow-right"></i>
          </button>
        </form>
      </div>
    </div>
  );
}
