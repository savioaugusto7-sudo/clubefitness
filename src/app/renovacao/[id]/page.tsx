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
  const [step, setStep] = useState<'form' | 'contract_review' | 'success'>('form');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [contractHtml, setContractHtml] = useState('');
  const [showContractModal, setShowContractModal] = useState(false);

  // Form states
  const [formaPagamento, setFormaPagamento] = useState<'pix' | 'boleto' | 'cartao'>('pix');
  const [parcelas, setParcelas] = useState(1);
  const [dataPrimeiroVencimento, setDataPrimeiroVencimento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [signMethod, setSignMethod] = useState<'instant' | 'clicksign'>('instant');

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

  // Calcular limites de data de vencimento (dentro dos próximos 30 dias a partir do início)
  const minVencDate = renewal?.dataInicioRenovacao || '';
  const maxVencDate = renewal?.dataInicioRenovacao ? (() => {
    const d = new Date(renewal.dataInicioRenovacao + 'T12:00:00');
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  })() : '';

  const handleOpenContract = () => {
    if (!renewal) return;
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
      planTipo: renewal.planoTipo,
      planPreco: renewal.valorReajustado,
      creditosMensais: renewal.creditosMensais,
      dataInicio: renewal.dataInicioRenovacao,
      dataVencimento: dataPrimeiroVencimento || renewal.dataInicioRenovacao,
      formaPagamento,
      parcelas,
      vigenciaQtd: renewal.vigenciaMeses,
      recorrenciaMeses: renewal.vigenciaMeses,
      criarRecorrenciaMensal: true,
      unidadeContratada: 'Clube Fitness'
    });

    setContractHtml(html);
    setShowContractModal(true);
  };

  const handleConfirmRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataPrimeiroVencimento) {
      alert('Por favor, selecione a data do primeiro pagamento.');
      return;
    }
    if (!acceptedTerms) {
      alert('Por favor, confirme a leitura e o aceite dos termos do contrato.');
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
          parcelas,
          assinarClicksign: signMethod === 'clicksign',
          dadosPreenchidos: {
            telefone,
            email
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        setStep('success');
      } else {
        alert('Erro ao confirmar renovação: ' + data.error);
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
  const reajusteValor = renewal.valorReajustado - renewal.valorAnterior;

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-darker)', color: 'var(--text-main)', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        
        {/* Header com Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '20px', border: '1px solid rgba(99, 102, 241, 0.25)', marginBottom: '12px' }}>
            <i className="fa-solid fa-arrows-rotate" style={{ color: 'var(--color-primary)' }}></i>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Portal de Renovação Oficial
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>Clube Fitness & Fisio</h1>
        </div>

        {step === 'success' ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', border: '2px solid #10b981' }}>
              <i className="fa-solid fa-check fa-2x" style={{ color: '#10b981' }}></i>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 10px 0' }}>Renovação Confirmada com Sucesso!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '24px' }}>
              Parabéns, <strong>{clientName}</strong>! Seu novo ciclo foi renovado com sucesso a partir de <strong>{dataInicioFormatada}</strong> até <strong>{dataFimCalculadaFormatada}</strong>.
            </p>

            {signMethod === 'clicksign' ? (
              <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '16px', borderRadius: '12px', marginBottom: '24px', textAlign: 'left', fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-signature"></i> Assinatura Digital Clicksign
                </div>
                Enviamos o envelope de assinatura para o seu e-mail / WhatsApp cadastrado. Basta abrir e assinar em poucos toques!
              </div>
            ) : (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '16px', borderRadius: '12px', marginBottom: '24px', textAlign: 'left', fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 700, color: '#10b981', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-shield-halved"></i> Aceite Registrado
                </div>
                Seu aceite digital foi registrado com sucesso em nossos servidores com data e hora oficial.
              </div>
            )}

            <button 
              className="btn btn-primary" 
              onClick={() => window.location.href = '/login'}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem' }}
            >
              Acessar Área do Aluno
            </button>
          </div>
        ) : (
          <form onSubmit={handleConfirmRenewal}>
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

            {/* Card de Preços e Reajuste 5% */}
            <div style={{ ...cardStyle, padding: '24px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-tag" style={{ color: 'var(--color-primary)' }}></i>
                Resumo da Sua Renovação
              </h3>

              <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '18px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '0.88rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Plano:</span>
                  <strong style={{ color: 'var(--text-main)' }}>{renewal.planoNome}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '0.88rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Valor do ciclo anterior:</span>
                  <span>R$ {renewal.valorAnterior.toFixed(2).replace('.', ',')}/mês</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '0.88rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Reajuste anual de renovação (+5%):</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>+ R$ {reajusteValor.toFixed(2).replace('.', ',')}/mês</span>
                </div>
                <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>Novo Valor da Mensalidade:</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                    R$ {renewal.valorReajustado.toFixed(2).replace('.', ',')}<span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>/mês</span>
                  </span>
                </div>
              </div>

              {/* Vigência do Novo Ciclo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div style={{ padding: '12px 14px', background: 'var(--bg-darker)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Início da Renovação</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>{dataInicioFormatada}</div>
                </div>
                <div style={{ padding: '12px 14px', background: 'var(--bg-darker)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Término do Ciclo</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>{dataFimCalculadaFormatada}</div>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                ℹ️ <strong>Regra de Renovação:</strong> A renovação garante seu valor promocional com início contínuo exatamente 1 dia após o encerramento do ciclo anterior. Para escolher uma data de início personalizada posterior, solicite uma nova adesão como <em>Novo Contrato</em> com os valores vigentes de tabela.
              </div>
            </div>

            {/* Escolha da Data do 1º Pagamento (Próximos 30 dias) */}
            <div style={{ ...cardStyle, padding: '24px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-calendar-days" style={{ color: 'var(--color-primary)' }}></i>
                Data do Primeiro Pagamento
              </h3>
              <p style={{ margin: '0 0 14px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Escolha a data mais conveniente para o vencimento da sua primeira mensalidade (em até 30 dias a partir do início do plano):
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

            {/* Forma de Pagamento */}
            <div style={{ ...cardStyle, padding: '24px', marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-credit-card" style={{ color: 'var(--color-primary)' }}></i>
                Forma de Pagamento
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                {[
                  { id: 'pix', label: 'PIX', icon: 'fa-qrcode' },
                  { id: 'cartao', label: 'Cartão', icon: 'fa-credit-card' },
                  { id: 'boleto', label: 'Boleto', icon: 'fa-barcode' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFormaPagamento(item.id as any)}
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
                      gap: '8px'
                    }}
                  >
                    <i className={`fa-solid ${item.icon}`} style={{ fontSize: '1.2rem' }}></i>
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Botão de Visualização do Contrato */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Contrato de Prestação de Serviços</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Visualize as cláusulas contratuais atualizadas.</div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenContract}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="fa-solid fa-file-lines"></i>
                  Visualizar Contrato
                </button>
              </div>
            </div>

            {/* Método de Assinatura & Confirmação */}
            <div style={{ ...cardStyle, padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-signature" style={{ color: 'var(--color-primary)' }}></i>
                Assinatura do Contrato
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--bg-darker)', borderRadius: '8px', border: signMethod === 'instant' ? '1px solid #10b981' : '1px solid var(--border-color)', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="signMethod" 
                    checked={signMethod === 'instant'} 
                    onChange={() => setSignMethod('instant')} 
                  />
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>Aceite Online Instantâneo</strong>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Confirmação imediata com registro digital de segurança.</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--bg-darker)', borderRadius: '8px', border: signMethod === 'clicksign' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="signMethod" 
                    checked={signMethod === 'clicksign'} 
                    onChange={() => setSignMethod('clicksign')} 
                  />
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>Enviar para o Clicksign (Assinatura Eletrônica)</strong>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Receba o documento oficial por e-mail/WhatsApp para assinatura digital.</div>
                  </div>
                </label>
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
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

            {/* Botão de Finalização */}
            <button
              type="submit"
              disabled={submitting || !acceptedTerms}
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '14px',
                fontSize: '1.05rem',
                fontWeight: 800,
                cursor: submitting || !acceptedTerms ? 'not-allowed' : 'pointer',
                opacity: submitting || !acceptedTerms ? 0.65 : 1,
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              {submitting ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                  Processando Renovação...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-lock"></i>
                  Confirmar e Concluir Renovação
                </>
              )}
            </button>
          </form>
        )}

      </div>

      {/* Modal de Visualização do Contrato */}
      {showContractModal && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, padding: '20px' }}
          onClick={() => setShowContractModal(false)}
        >
          <div 
            style={{ background: '#fff', color: '#111', borderRadius: '16px', width: '100%', maxWidth: '750px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#111' }}>Contrato de Prestação de Serviços</h3>
              <button onClick={() => setShowContractModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.4rem', color: '#6b7280', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, fontSize: '0.88rem', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: contractHtml }} />
            <div style={{ padding: '14px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowContractModal(false)}
                style={{ padding: '10px 20px', background: '#111827', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Fechar e Continuar
              </button>
            </div>
          </div>
        </div>
      )}

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
