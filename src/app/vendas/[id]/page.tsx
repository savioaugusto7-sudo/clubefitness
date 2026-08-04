'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

export default function VendaPage({ params }: { params: any }) {
  const router = useRouter();
  const unwrappedParams = 'then' in params ? use(params) : params;
  const id = unwrappedParams.id;

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [proposal, setProposal] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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

  // Form States - Pagamento
  const [formaPagamento, setFormaPagamento] = useState<'pix' | 'boleto' | 'cartao'>('pix');
  const [parcelas, setParcelas] = useState(1);
  const [dataVencimento, setDataVencimento] = useState('');

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/propostas?id=${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const prop = json.data;
          setProposal(prop);
          
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-darker)', color: 'var(--text-main)' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="fa-solid fa-circle-notch fa-spin fa-3x" style={{ color: 'var(--color-primary)', marginBottom: '15px' }}></i>
          <p style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem' }}>Carregando proposta comercial...</p>
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

  const basePrice = proposal.valorAcordado || 0;
  const isAnual = proposal.planoTipo === 'Anual' || 
                  proposal.planoNome.toLowerCase().includes('anual') || 
                  proposal.duracao === 'anual' || 
                  proposal.vigenciaQtd >= 12;

  // Business Rules for dynamic calculations:
  // Card applies a +5% markup
  const finalPrice = formaPagamento === 'cartao' ? basePrice * 1.05 : basePrice;

  // Max installments
  const maxInstallments = isAnual
    ? (formaPagamento === 'cartao' ? 12 : (formaPagamento === 'boleto' ? 10 : 1))
    : 1;

  // Adjust installment index if exceeds max
  const currentInstallments = Math.min(parcelas, maxInstallments);
  const installmentValue = finalPrice / currentInstallments;

  const handlePaymentChange = (type: 'pix' | 'boleto' | 'cartao') => {
    setFormaPagamento(type);
    setParcelas(1); // Reset to 1x when payment changes
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 11) {
      setCpf(val);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 8) {
      setCep(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);
    
    // Client Side validations to prevent contract emission blocks
    const errorsList: string[] = [];
    if (!nome.trim()) errorsList.push('Nome Completo é obrigatório.');
    if (!cpf.trim() || cpf.length !== 11) errorsList.push('CPF inválido (deve conter 11 dígitos).');
    if (!email.trim() || !email.includes('@')) errorsList.push('E-mail válido é obrigatório.');
    if (!telefone.trim()) errorsList.push('Telefone é obrigatório.');
    if (!cep.trim() || cep.length !== 8) errorsList.push('CEP inválido (deve conter 8 dígitos).');
    if (!endereco.trim()) errorsList.push('Endereço (Rua/Avenida) é obrigatório.');
    if (!numero.trim()) errorsList.push('Número residencial é obrigatório.');
    if (!bairro.trim()) errorsList.push('Bairro é obrigatório.');
    if (!cidade.trim()) errorsList.push('Cidade é obrigatória.');
    if (!estado.trim() || estado.length !== 2) errorsList.push('UF do estado é obrigatória (2 letras).');

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

    setSubmitting(true);

    const payload = {
      formaPagamentoEscolhida: formaPagamento,
      parcelasEscolhidas: currentInstallments,
      valorFinalRecalculado: finalPrice,
      dataVencimentoEscolhida: dataVencimento,
      dadosPreenchidos: {
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
      }
    };

    try {
      const res = await fetch(`/api/propostas?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        alert('Erro ao enviar proposta: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro na conexão: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-darker)', color: 'var(--text-main)', padding: '20px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '40px', maxWidth: '600px', width: '100%', textAlign: 'center', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
            <i className="fa-solid fa-circle-check fa-3x" style={{ color: 'var(--color-primary)' }}></i>
          </div>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.8rem', marginBottom: '15px', color: 'var(--text-main)' }}>Proposta Enviada com Sucesso!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '30px' }}>
            Obrigado, <strong>{nome}</strong>! Seus dados cadastrais foram atualizados no sistema.<br />
            A recepção do <strong>Clube Fitness Fisio</strong> irá revisar as informações e emitir o seu contrato de prestação de serviços para assinatura eletrônica em instantes.
          </p>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '15px', fontSize: '0.85rem', color: 'var(--text-dim)', textAlign: 'left', marginBottom: '30px' }}>
            <strong>Resumo Escolhido:</strong><br />
            • Plano: {proposal.planoNome}<br />
            • Pagamento: {formaPagamento === 'pix' ? 'Pix (1x)' : (formaPagamento === 'boleto' ? `Boleto Bancário (${currentInstallments}x)` : `Cartão de Crédito (${currentInstallments}x)`)}<br />
            • Valor Total: R$ {finalPrice.toFixed(2).replace('.', ',')}
          </div>
          <p style={{ color: 'var(--color-primary)', fontSize: '0.9rem', fontWeight: 600 }}>Você já pode fechar esta página.</p>
        </div>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const maxDateObj = new Date();
  maxDateObj.setDate(maxDateObj.getDate() + 31);
  const maxDateStr = maxDateObj.toISOString().split('T')[0];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-darker)', color: 'var(--text-main)', padding: '40px 20px', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)' }}>CLUBE FITNESS FISIO</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '5px' }}>Preencha seus dados para liberação do seu contrato</p>
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

        <form onSubmit={handleSubmit}>
          {/* 1. Proposta Comercial */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '25px', marginBottom: '25px', boxShadow: 'var(--shadow-card)' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', marginBottom: '15px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-file-invoice-dollar"></i> Proposta Comercial Negociada
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Plano</span>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: '5px 0 0 0' }}>{proposal.planoNome}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Créditos Mensais</span>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: '5px 0 0 0' }}>{proposal.creditosMensais} sessões</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Valor Base Negociado</span>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: '5px 0 0 0', color: 'var(--color-primary)' }}>R$ {basePrice.toFixed(2).replace('.', ',')}</p>
              </div>
            </div>
          </div>

          {/* 2. Dados Pessoais */}
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
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Telefone / WhatsApp *</label>
                <input className="form-control" type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(99) 99999-9999" required style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }} />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>CPF (Apenas números) *</label>
                <input className="form-control" type="text" value={cpf} onChange={handleCpfChange} maxLength={11} placeholder="CPF do titular" required style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }} />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>E-mail (Para assinatura eletrônica) *</label>
                <input className="form-control" type="email" value={email} onChange={(e) => {}} disabled style={{ width: '100%', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text-dim)', cursor: 'not-allowed' }} />
              </div>

            </div>
          </div>

          {/* 3. Endereço Residencial */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '25px', marginBottom: '25px', boxShadow: 'var(--shadow-card)' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', marginBottom: '20px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-map-location-dot"></i> 2. Endereço Residencial
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>CEP *</label>
                <input className="form-control" type="text" value={cep} onChange={handleCepChange} onBlur={handleCepBlur} maxLength={8} placeholder="00000000" required style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }} />
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
                <input className="form-control" type="text" value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Apto, Bloco, etc." style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }} />
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
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>UF Estado *</label>
                <input className="form-control" type="text" value={estado} onChange={(e) => setEstado(e.target.value)} maxLength={2} placeholder="MG" required style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }} />
              </div>
            </div>
          </div>

          {/* 4. Opções de Pagamento e Parcelas */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '25px', marginBottom: '35px', boxShadow: 'var(--shadow-card)' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', marginBottom: '20px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-credit-card"></i> 3. Forma de Pagamento e Parcelamento
            </h3>

            {/* Payment Method selector buttons */}
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '25px' }}>
              <button type="button" onClick={() => handlePaymentChange('pix')} style={{ flex: 1, minWidth: '130px', padding: '16px', background: formaPagamento === 'pix' ? 'var(--color-primary-glow)' : 'rgba(255,255,255,0.02)', border: formaPagamento === 'pix' ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: '#fff', cursor: 'pointer', transition: 'var(--transition-fast)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <i className="fa-brands fa-pix fa-xl" style={{ color: formaPagamento === 'pix' ? 'var(--color-primary)' : 'var(--text-muted)' }}></i>
                <strong>PIX</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Sem desconto</span>
              </button>

              <button type="button" onClick={() => handlePaymentChange('boleto')} style={{ flex: 1, minWidth: '130px', padding: '16px', background: formaPagamento === 'boleto' ? 'var(--color-primary-glow)' : 'rgba(255,255,255,0.02)', border: formaPagamento === 'boleto' ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: '#fff', cursor: 'pointer', transition: 'var(--transition-fast)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-barcode fa-xl" style={{ color: formaPagamento === 'boleto' ? 'var(--color-primary)' : 'var(--text-muted)' }}></i>
                <strong>Boleto Bancário</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{isAnual ? 'Até 10x sem juros' : '1x'}</span>
              </button>

              <button type="button" onClick={() => handlePaymentChange('cartao')} style={{ flex: 1, minWidth: '130px', padding: '16px', background: formaPagamento === 'cartao' ? 'var(--color-primary-glow)' : 'rgba(255,255,255,0.02)', border: formaPagamento === 'cartao' ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: '#fff', cursor: 'pointer', transition: 'var(--transition-fast)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-credit-card fa-xl" style={{ color: formaPagamento === 'cartao' ? 'var(--color-primary)' : 'var(--text-muted)' }}></i>
                <strong>Cartão de Crédito</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>+5% de acréscimo</span>
              </button>
            </div>

            {/* Installment selection */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: 'var(--radius-sm)' }}>
              <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Opções de Parcelamento:</label>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                {Array.from({ length: maxInstallments }, (_, i) => i + 1).map((num) => {
                  const val = finalPrice / num;
                  const active = currentInstallments === num;
                  return (
                    <button key={num} type="button" onClick={() => setParcelas(num)} style={{ padding: '12px', background: active ? 'var(--color-primary-glow)' : 'transparent', border: active ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span><strong>{num}x</strong> de</span>
                      <strong style={{ color: active ? 'var(--color-primary)' : '#fff' }}>R$ {val.toFixed(2).replace('.', ',')}</strong>
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Data do Primeiro Vencimento *</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={dataVencimento} 
                  onChange={(e) => setDataVencimento(e.target.value)} 
                  min={todayStr} 
                  max={maxDateStr} 
                  required 
                  style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', color: '#fff' }} 
                />
                <small style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                  Selecione uma data para o primeiro vencimento entre hoje e os próximos 31 dias.
                </small>
              </div>

              {/* Dynamic total message */}
              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Valor Total a Pagar:</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>R$ {finalPrice.toFixed(2).replace('.', ',')}</span>
              </div>
              {formaPagamento === 'cartao' && (
                <p style={{ color: 'var(--color-warning)', fontSize: '0.78rem', margin: '5px 0 0 0', textAlign: 'right' }}>
                  * Inclui taxa de 5% de acréscimo do parcelamento no cartão de crédito.
                </p>
              )}
            </div>
          </div>

          {/* Submit Action */}
          <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.1rem', fontWeight: 700, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            {submitting ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i> Enviando proposta comercial...
              </>
            ) : (
              <>
                <i className="fa-solid fa-paper-plane"></i> Enviar Proposta para Emissão do Contrato
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
