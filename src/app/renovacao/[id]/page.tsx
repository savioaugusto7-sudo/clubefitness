'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { generateContractTemplate } from '@/utils/contractTemplate';

export default function RenovacaoPage({ params }: { params: any }) {
  const router = useRouter();
  const unwrappedParams = 'then' in params ? use(params) : params;
  const id = unwrappedParams.id;

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [renewal, setRenewal] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Steps: 'form' -> 'contract_review' -> 'success'
  const [step, setStep] = useState<'form' | 'contract_review' | 'success'>('form');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [contractHtml, setContractHtml] = useState('');
  const [clicksignUrl, setClicksignUrl] = useState('');

  // Form states
  const [formaPagamento, setFormaPagamento] = useState<'pix' | 'boleto' | 'cartao'>('pix');
  const [parcelas, setParcelas] = useState(1);
  const [dataPrimeiroVencimento, setDataPrimeiroVencimento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/renovacoes?id=${id}`)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          const ren = json.data;
          setRenewal(ren);

          const client = ren.clientId || {};
          const pes = client.dadosPessoais || {};
          setTelefone(pes.telefone || '');
          setEmail(pes.email || '');

          // Sugerir primeira data de vencimento padrão (ex: 5 dias após o início ou início)
          if (ren.dataInicioRenovacao) {
            const start = new Date(ren.dataInicioRenovacao + 'T12:00:00');
            start.setDate(start.getDate() + 5);
            setDataPrimeiroVencimento(start.toISOString().split('T')[0]);
          }

          const isAnualRen = ren.planoTipo === 'Anual' || 
                            (ren.planoNome && ren.planoNome.toLowerCase().includes('anual')) ||
                            Number(ren.vigenciaMeses) >= 12 ||
                            Boolean(ren.duracao === 'anual');
          if (isAnualRen) {
            setFormaPagamento('boleto');
            setParcelas(10);
          }
        } else {
          setErrorMsg(json.error || 'Link de renovação não encontrado.');
        }
      })
      .catch(err => {
        setErrorMsg('Erro ao carregar renovação: ' + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // Limites da data de vencimento (janela de 30 dias a partir do início da renovação)
  const minVencDate = renewal?.dataInicioRenovacao || '';
  const maxVencDate = renewal?.dataInicioRenovacao ? (() => {
    const d = new Date(renewal.dataInicioRenovacao + 'T12:00:00');
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  })() : '';

  const isAnual = renewal?.planoTipo === 'Anual' || 
                  (renewal?.planoNome && renewal.planoNome.toLowerCase().includes('anual')) ||
                  Number(renewal?.vigenciaMeses) >= 12 ||
                  Boolean(renewal?.duracao === 'anual');

  const baseValue = renewal?.valorReajustado || 0;
  const valorMensalEquivalenteAnual = isAnual ? Number((baseValue / 12).toFixed(2)) : null;
  
  const currentTotal = (() => {
    if (formaPagamento === 'cartao') {
      return Math.round(baseValue * 1.05 * 100) / 100;
    }
    return baseValue;
  })();

  const maxInstallments = (() => {
    if (formaPagamento === 'cartao') return 12;
    if (formaPagamento === 'boleto') return 10;
    return 1;
  })();

  const availableInstallments = (() => {
    if (isAnual) {
      return formaPagamento === 'cartao' ? [12] : [10];
    }
    return Array.from({ length: maxInstallments }, (_, i) => i + 1);
  })();

  const currentInstallments = isAnual
    ? (formaPagamento === 'cartao' ? 12 : 10)
    : Math.min(parcelas, maxInstallments);
  const installmentValue = currentInstallments > 0 ? Math.round((currentTotal / currentInstallments) * 100) / 100 : 0;

  const handlePaymentChange = (type: 'pix' | 'boleto' | 'cartao') => {
    setFormaPagamento(type);
    if (isAnual) {
      setParcelas(type === 'cartao' ? 12 : 10);
    } else if (type === 'pix') {
      setParcelas(1);
    } else if (type === 'boleto') {
      setParcelas(Math.min(parcelas, 10));
    } else if (type === 'cartao') {
      setParcelas(Math.min(parcelas, 12));
    }
  };

  const handleProceedToContractReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataPrimeiroVencimento) {
      alert('Por favor, selecione a data do primeiro pagamento.');
      return;
    }

    const client = renewal.clientId || {};
    const pes = client.dadosPessoais || {};

    const html = generateContractTemplate({
      clientNome: pes.nome || 'Aluno',
      clientCpf: pes.cpf || '—',
      clientEmail: email || pes.email || '',
      clientTelefone: telefone || pes.telefone || '',
      clientEndereco: pes.endereco || '',
      clientNumero: pes.numero || '',
      clientComplemento: pes.complemento || '',
      clientBairro: pes.bairro || '',
      clientCidade: pes.cidade || 'Belo Horizonte',
      clientEstado: pes.estado || 'MG',
      clientCep: pes.cep || '',
      planNome: renewal.planoNome,
      planTipo: 'Anual',
      planPreco: currentTotal,
      creditosMensais: renewal.creditosMensais,
      dataInicio: renewal.dataInicioRenovacao,
      dataVencimento: dataPrimeiroVencimento,
      formaPagamento,
      parcelas: currentInstallments,
      vigenciaQtd: 12,
      recorrenciaMeses: 12,
      criarRecorrenciaMensal: true,
      unidadeContratada: 'Clube Fitness'
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
      const res = await fetch('/api/renovacoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: renewal._id,
          dataPrimeiroVencimento,
          formaPagamento,
          parcelas: currentInstallments,
          dadosPreenchidos: {
            telefone,
            email
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        setClicksignUrl(data.clicksignUrl || '');
        setStep('success');
      } else {
        alert('Erro ao processar renovação: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro de conexão ao processar renovação.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <i className="fa-solid fa-circle-notch fa-spin fa-3x" style={{ color: 'var(--color-primary)', marginBottom: '18px' }}></i>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 8px 0' }}>Carregando sua Renovação...</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>Estamos preparando suas condições exclusivas.</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !renewal) {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, maxWidth: '480px', textAlign: 'center', padding: '36px 24px' }}>
          <i className="fa-solid fa-triangle-exclamation fa-3x" style={{ color: '#ef4444', marginBottom: '16px' }}></i>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 10px 0' }}>Link Indisponível</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
            {errorMsg || 'Este link de renovação não é válido ou já foi utilizado.'}
          </p>
          <button 
            className="btn btn-secondary" 
            onClick={() => window.location.href = '/'}
            style={{ padding: '10px 20px', borderRadius: '8px' }}
          >
            Ir para a Página Inicial
          </button>
        </div>
      </div>
    );
  }

  const clientName = renewal.clientId?.dadosPessoais?.nome || 'Aluno';
  const dataFimAnteriorFormatada = renewal.dataFimAnterior ? new Date(renewal.dataFimAnterior + 'T12:00:00').toLocaleDateString('pt-BR') : '';
  const dataInicioFormatada = renewal.dataInicioRenovacao ? new Date(renewal.dataInicioRenovacao + 'T12:00:00').toLocaleDateString('pt-BR') : '';
  const dataFimCalculadaFormatada = renewal.dataFimCalculada ? new Date(renewal.dataFimCalculada + 'T12:00:00').toLocaleDateString('pt-BR') : '';

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-darker)', color: 'var(--text-main)', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        
        {/* Header com Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '20px', border: '1px solid rgba(99, 102, 241, 0.25)', marginBottom: '12px' }}>
            <i className="fa-solid fa-arrows-rotate" style={{ color: 'var(--color-primary)' }}></i>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Renovação Oficial de Plano
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>Clube Fitness & Fisio</h1>
        </div>

        {/* ETAPA 3: SUCESSO */}
        {step === 'success' && (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: '2px solid #10b981' }}>
              <i className="fa-solid fa-check fa-2x" style={{ color: '#10b981' }}></i>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 10px 0' }}>Contrato Enviado para Assinatura!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '24px' }}>
              Parabéns, <strong>{clientName}</strong>! Sua renovação para o plano <strong>{renewal.planoNome} (Anual)</strong> (vigência de <strong>{dataInicioFormatada}</strong> até <strong>{dataFimCalculadaFormatada}</strong>) foi gerada e enviada para o <strong>Clicksign</strong>.
            </p>

            <div style={{ background: 'rgba(37, 211, 102, 0.1)', border: '1px solid rgba(37, 211, 102, 0.3)', padding: '18px', borderRadius: '14px', marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ fontWeight: 700, color: '#25D366', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-brands fa-whatsapp fa-lg"></i> Receba no WhatsApp
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                O link para assinatura eletrônica foi encaminhado para o seu WhatsApp/E-mail. Você pode assinar diretamente pelo celular em menos de 1 minuto!
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {clicksignUrl && (
                <a 
                  href={clicksignUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
                >
                  <i className="fa-solid fa-signature"></i> Assinar Agora no Clicksign
                </a>
              )}
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={() => window.location.href = '/'}
                style={{ width: '100%', padding: '12px', borderRadius: '12px', fontWeight: 600 }}
              >
                Voltar à Página Inicial
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 1: CONFIGURAÇÃO DE PAGAMENTO & VENCIMENTO */}
        {step === 'form' && (
          <form onSubmit={handleProceedToContractReview}>
            {/* Mensagem Dinâmica de Boas-Vindas */}
            <div style={{ ...cardStyle, padding: '24px', marginBottom: '20px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.06) 100%)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="fa-solid fa-sparkles" style={{ color: '#fff', fontSize: '1.1rem' }}></i>
                </div>
                <div>
                  <h2 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 800 }}>
                    {renewal.isExpired ? 'Condições Especiais de Reativação' : 'Sua Renovação de Plano'}
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                    {renewal.isExpired ? (
                      <>
                        Olá, <strong>{clientName}</strong>! Seu último contrato encerrou no dia <strong>{dataFimAnteriorFormatada}</strong>. Veja os detalhes exclusivos da sua renovação! Preparamos condições especiais de renovação para reativar o seu plano.
                      </>
                    ) : (
                      <>
                        Olá, <strong>{clientName}</strong>! Seu plano irá se encerrar no dia <strong>{dataFimAnteriorFormatada}</strong>. Veja os detalhes exclusivos da sua renovação e garanta a continuidade dos seus treinos e benefícios sem interrupções!
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Card Limpo do Plano e Vigência Anual */}
            <div style={{ ...cardStyle, padding: '24px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-tag" style={{ color: 'var(--color-primary)' }}></i>
                Detalhes da Sua Renovação
              </h3>

              <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '18px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Plano:</span>
                  <strong style={{ color: 'var(--text-main)', fontSize: '1rem' }}>{renewal.planoNome} (Anual)</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Vigência do Novo Contrato:</span>
                  <strong style={{ color: '#10b981' }}>
                    12 meses ({dataInicioFormatada} até {dataFimCalculadaFormatada})
                  </strong>
                </div>

                <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, display: 'block' }}>Valor do Plano:</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {formaPagamento === 'cartao' ? 'Valor Total no Cartão' : 'Valor Total Anual'}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                      R$ {currentTotal.toFixed(2).replace('.', ',')}
                    </span>
                    {currentInstallments > 1 && (
                      <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 700, marginTop: '2px' }}>
                        ({currentInstallments}x de R$ {installmentValue.toFixed(2).replace('.', ',')})
                      </div>
                    )}
                    {isAnual && formaPagamento === 'boleto' && valorMensalEquivalenteAnual !== null && (
                      <div style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 700, marginTop: '2px' }}>
                        Equivalente a R$ {valorMensalEquivalenteAnual.toFixed(2).replace('.', ',')}/mês
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                ℹ️ <strong>Continuidade do Plano:</strong> A data de início do seu novo ciclo é <strong>{dataInicioFormatada}</strong>, mantendo seu plano ativo e suas condições especiais.
              </div>
            </div>

            {/* Escolha da Data do 1º Pagamento (Próximos 30 dias) */}
            <div style={{ ...cardStyle, padding: '24px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-calendar-days" style={{ color: 'var(--color-primary)' }}></i>
                Data do Primeiro Pagamento
              </h3>
              <p style={{ margin: '0 0 14px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Escolha a melhor data para o vencimento da sua primeira mensalidade (em até 30 dias a partir do início do novo ciclo):
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input 
                  type="date" 
                  className="form-control" 
                  min={minVencDate} 
                  max={maxVencDate} 
                  value={dataPrimeiroVencimento} 
                  onChange={e => setDataPrimeiroVencimento(e.target.value)} 
                  required 
                  style={{ padding: '12px 14px', fontSize: '1rem', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '10px', color: '#fff', outline: 'none' }} 
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Período disponível para escolha: <strong>{dataInicioFormatada}</strong> até <strong>{maxVencDate ? new Date(maxVencDate + 'T12:00:00').toLocaleDateString('pt-BR') : ''}</strong>.
                </div>
              </div>
            </div>

            {/* Forma de Pagamento com Regras Específicas */}
            <div style={{ ...cardStyle, padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-credit-card" style={{ color: 'var(--color-primary)' }}></i>
                Forma de Pagamento
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: isAnual ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                {(isAnual ? [
                  { 
                    id: 'boleto', 
                    label: 'Boleto / Pix (10x)', 
                    icon: 'fa-barcode', 
                    desc: `10x de R$ ${(baseValue / 10).toFixed(2).replace('.', ',')}`,
                    equiv: valorMensalEquivalenteAnual ? `(equiv. a R$ ${valorMensalEquivalenteAnual.toFixed(2).replace('.', ',')}/mês)` : null
                  },
                  { 
                    id: 'cartao', 
                    label: 'Cartão de Crédito (12x)', 
                    icon: 'fa-credit-card', 
                    desc: `12x de R$ ${((baseValue * 1.05) / 12).toFixed(2).replace('.', ',')}`,
                    equiv: null
                  }
                ] : [
                  { id: 'pix', label: 'PIX (1x)', icon: 'fa-qrcode', desc: 'À vista', equiv: null },
                  { id: 'boleto', label: 'Boleto (até 10x)', icon: 'fa-barcode', desc: 'Sem acréscimo', equiv: null },
                  { id: 'cartao', label: 'Cartão (até 12x)', icon: 'fa-credit-card', desc: 'Parcelamento flexível', equiv: null }
                ]).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handlePaymentChange(item.id as any)}
                    style={{
                      padding: '14px 10px',
                      borderRadius: '10px',
                      border: formaPagamento === item.id ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                      background: formaPagamento === item.id ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-darker)',
                      color: formaPagamento === item.id ? '#818cf8' : 'var(--text-muted)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <i className={`fa-solid ${item.icon}`} style={{ fontSize: '1.2rem' }}></i>
                    <span style={{ fontSize: '0.85rem' }}>{item.label}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-muted)' }}>{item.desc}</span>
                    {item.equiv && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#f59e0b', marginTop: '1px' }}>
                        {item.equiv}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Opções de Parcelamento */}
              {!isAnual ? (
                maxInstallments > 1 ? (
                  <div style={{ marginTop: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                      {formaPagamento === 'cartao' ? 'Número de Parcelas no Cartão:' : 'Número de Parcelas no Boleto / Pix:'}
                    </label>
                    <select 
                      className="form-control" 
                      value={currentInstallments} 
                      onChange={e => setParcelas(Number(e.target.value))}
                      disabled={availableInstallments.length <= 1}
                      style={{ padding: '10px 12px', background: 'var(--bg-darker)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      {availableInstallments.map(num => {
                        const parcVal = (currentTotal / num).toFixed(2).replace('.', ',');
                        return (
                          <option key={num} value={num}>
                            {num === 1 
                              ? `1x de R$ ${currentTotal.toFixed(2).replace('.', ',')} (à vista)` 
                              : `${num}x de R$ ${parcVal}/mês`}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ) : (
                  <div style={{ padding: '10px 12px', background: 'var(--bg-darker)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '14px' }}>
                    ✅ <strong>Pagamento à vista:</strong> Quitação única no valor de <strong>R$ {currentTotal.toFixed(2).replace('.', ',')}</strong>.
                  </div>
                )
              ) : (
                <div style={{ marginTop: '14px', padding: '12px 16px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fa-solid fa-circle-check" style={{ color: '#38bdf8', fontSize: '1.2rem' }}></i>
                    <div>
                      <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.92rem' }}>
                        Condição Exclusiva do Plano Anual
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {formaPagamento === 'cartao' 
                          ? '12x no cartão de crédito com taxa especial de 5%' 
                          : '10x no boleto bancário / Pix sem juros'}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ fontSize: '1.1rem', color: formaPagamento === 'cartao' ? '#60a5fa' : 'var(--color-primary)' }}>
                      {currentInstallments}x de R$ {installmentValue.toFixed(2).replace('.', ',')}
                    </strong>
                  </div>
                </div>
              )}
              {/* Destaque no plano anual: Valor referente ao mês de acesso (espelhado da página de vendas) */}
              {isAnual && formaPagamento === 'boleto' && valorMensalEquivalenteAnual !== null && (
                <div style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  background: 'rgba(234, 179, 8, 0.12)',
                  border: '1px solid rgba(234, 179, 8, 0.35)',
                  borderRadius: '8px',
                  fontSize: '0.84rem',
                  color: '#fde047',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <i className="fa-solid fa-fire" style={{ color: '#eab308' }}></i>
                  <span>
                    Equivalente a <strong style={{ color: '#fff' }}>R$ {valorMensalEquivalenteAnual.toFixed(2).replace('.', ',')}/mês</strong> nos 12 meses de acesso
                  </span>
                </div>
              )}
            </div>

            {/* Botão de Avançar para Revisão do Contrato */}
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, var(--color-primary) 0%, #4f46e5 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '14px',
                fontSize: '1.05rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              <i className="fa-solid fa-file-signature"></i>
              Avançar para Revisão do Contrato
            </button>
          </form>
        )}

        {/* ETAPA 2: REVISÃO DO CONTRATO & CLICKSIGN EXCLUSIVO */}
        {step === 'contract_review' && (
          <div>
            <div style={{ ...cardStyle, padding: '24px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-file-lines" style={{ color: 'var(--color-primary)' }}></i>
                  Revisão do Contrato de Prestação de Serviços (Anual)
                </h3>
                <button 
                  type="button" 
                  onClick={() => setStep('form')} 
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  <i className="fa-solid fa-arrow-left" style={{ marginRight: '4px' }}></i> Alterar Opções
                </button>
              </div>

              {/* Minuta Dinâmica do Contrato */}
              <div 
                style={{ 
                  background: '#fff', 
                  color: '#111', 
                  borderRadius: '12px', 
                  padding: '24px', 
                  maxHeight: '400px', 
                  overflowY: 'auto', 
                  fontSize: '0.86rem', 
                  lineHeight: 1.6,
                  border: '1px solid #d1d5db'
                }} 
                dangerouslySetInnerHTML={{ __html: contractHtml }} 
              />
            </div>

            {/* Card de Assinatura Clicksign Exclusiva */}
            <div style={{ ...cardStyle, padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-signature" style={{ color: 'var(--color-primary)' }}></i>
                Assinatura do Contrato
              </h3>

              <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
                <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-shield-halved"></i> Assinatura Eletrônica Oficial via Clicksign
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                  O contrato oficial com validade jurídica será enviado diretamente para seu <strong>WhatsApp</strong> e <strong>E-mail</strong> para formalização digital rápida e segura.
                </p>
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                <input 
                  type="checkbox" 
                  checked={acceptedTerms} 
                  onChange={e => setAcceptedTerms(e.target.checked)} 
                  required 
                  style={{ marginTop: '3px' }} 
                />
                <span>
                  Declaro que li e concordo com os termos do contrato de prestação de serviços de condicionamento físico do <strong>Clube Fitness</strong> e confirmo a renovação do meu plano.
                </span>
              </label>
            </div>

            {/* Botão de Disparo Oficial */}
            <button
              type="button"
              disabled={submitting || !acceptedTerms}
              onClick={handleConfirmAndDispatchClicksign}
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '14px',
                fontSize: '1.02rem',
                fontWeight: 800,
                cursor: submitting || !acceptedTerms ? 'not-allowed' : 'pointer',
                opacity: submitting || !acceptedTerms ? 0.65 : 1,
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                textAlign: 'center'
              }}
            >
              {submitting ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                  Gerando Documento no Clicksign...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane"></i>
                  Enviar para o Clicksign e Receber contrato via Whatsapp para assinatura
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// Estilos de container e card
const containerStyle: React.CSSProperties = {
  minHeight: '100dvh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--bg-darker)',
  color: 'var(--text-main)',
  padding: '20px'
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '18px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.35)'
};
