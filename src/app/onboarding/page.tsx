'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const user = session?.user as any;

  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [termoAceito, setTermoAceito] = useState(false);

  const [nome, setNome] = useState(user?.name || '');
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email] = useState(user?.email || '');

  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [estadoCivil, setEstadoCivil] = useState('solteiro(a)');
  const [profissao, setProfissao] = useState('');

  const [lesoes, setLesoes] = useState('');
  const [restricoes, setRestricoes] = useState('');
  const [medicamentos, setMedicamentos] = useState('');
  const [historicoClinico, setHistoricoClinico] = useState('');

  const buscarCep = async () => {
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

  const handleSubmit = async () => {
    if (!termoAceito) {
      setError('Você precisa aceitar os Termos de Consentimento e a Política de Privacidade para prosseguir.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome, dataNascimento, sexo, cpf, telefone, email,
          cep, endereco, numero, complemento, bairro, cidade, estado,
          nacionalidade: 'brasileiro(a)', estadoCivil, profissao,
          lesoes, restricoes, medicamentos, historicoClinico,
          termoAceito: true
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/dashboard');
      } else {
        setError(data.error || 'Erro ao salvar.');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-main)' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const steps = [
    { num: 1, label: 'Dados Pessoais', icon: 'fa-user' },
    { num: 2, label: 'Endereço', icon: 'fa-map-marker-alt' },
    { num: 3, label: 'Saúde', icon: 'fa-heart-pulse' },
  ];

  const progressPct = ((step - 1) / 2) * 100;

  return (
    <>
      <style>{`
        .ob-wrapper {
          min-height: 100vh;
          background: var(--bg-main);
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: auto;
        }
        @media (min-width: 1024px) {
          .ob-wrapper {
            grid-template-columns: 380px 1fr;
            grid-template-rows: 1fr;
          }
          .ob-sidebar { display: flex !important; }
          .ob-main { padding: 48px 60px; }
        }
        .ob-sidebar {
          display: none;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          padding: 60px 48px;
          background: linear-gradient(160deg, rgba(16,185,129,0.08) 0%, rgba(0,0,0,0) 60%);
          border-right: 1px solid var(--border-color);
          position: sticky;
          top: 0;
          height: 100vh;
        }
        .ob-main {
          padding: 32px 20px 60px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          overflow-y: auto;
        }
        .ob-header-mobile {
          text-align: center;
          margin-bottom: 32px;
          width: 100%;
        }
        @media (min-width: 1024px) {
          .ob-header-mobile { display: none; }
        }
        .ob-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 36px 32px;
          width: 100%;
          max-width: 680px;
          box-shadow: var(--shadow-card);
        }
        @media (max-width: 480px) {
          .ob-card { padding: 24px 16px; border-radius: 14px; }
        }
        .ob-stepper {
          display: flex;
          align-items: center;
          width: 100%;
          margin-bottom: 32px;
        }
        .ob-step-dot {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 0 0 auto;
        }
        .ob-step-circle {
          width: 48px; height: 48px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.35s cubic-bezier(.4,0,.2,1);
          font-size: 15px;
        }
        @media (max-width: 400px) {
          .ob-step-circle { width: 36px; height: 36px; font-size: 12px; }
          .ob-step-label { font-size: 0.6rem !important; }
        }
        .ob-step-line {
          flex: 1;
          height: 2px;
          margin: -18px 6px 0;
          transition: background 0.4s;
        }
        @media (max-width: 400px) {
          .ob-step-line { margin: -12px 4px 0; }
        }
        .ob-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 540px) {
          .ob-form-grid { grid-template-columns: 1fr; }
        }
        .ob-form-grid .full { grid-column: 1 / -1; }
        .ob-sidebar-step {
          display: flex; align-items: center; gap: 16px;
          padding: 14px 18px; border-radius: 12px;
          margin-bottom: 12px; width: 100%;
          transition: all 0.25s;
          cursor: default;
        }
        .ob-progress-bar {
          width: 100%;
          height: 4px;
          background: var(--border-color);
          border-radius: 4px;
          margin-bottom: 36px;
          overflow: hidden;
        }
        .ob-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-primary), #34d399);
          border-radius: 4px;
          transition: width 0.4s cubic-bezier(.4,0,.2,1);
        }
        .ob-btn-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 28px;
          gap: 12px;
          flex-wrap: wrap;
        }
        .ob-btn-row .btn { min-width: 120px; }
        @media (max-width: 360px) {
          .ob-btn-row .btn { min-width: 90px; font-size: 0.8rem; padding: 8px 12px; }
        }
      `}</style>

      <div className="ob-wrapper">

        {/* ── SIDEBAR (desktop only) ── */}
        <aside className="ob-sidebar">
          <div style={{ marginBottom: '48px' }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '16px',
              background: 'var(--color-primary-glow)',
              border: '1px solid var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '20px',
              boxShadow: '0 0 24px rgba(16,185,129,0.25)',
            }}>
              <i className="fa-solid fa-dumbbell" style={{ fontSize: '24px', color: 'var(--color-primary)' }}></i>
            </div>
            <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '1.6rem', color: 'var(--text-main)', margin: '0 0 6px', lineHeight: 1.2 }}>
              Bem-vindo,<br />{(user?.name || '').split(' ')[0]}!
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>
              Complete seu cadastro para começar a usar o sistema com segurança.
            </p>
          </div>

          {steps.map(s => {
            const isActive = step === s.num;
            const isDone = step > s.num;
            return (
              <div key={s.num} className="ob-sidebar-step" style={{
                background: isActive ? 'var(--color-primary-glow)' : isDone ? 'rgba(16,185,129,0.04)' : 'transparent',
                border: isActive ? '1px solid var(--color-primary)' : '1px solid transparent',
              }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                  background: isDone ? 'var(--color-primary)' : isActive ? 'var(--color-primary)' : 'var(--bg-darker)',
                  border: `1px solid ${isActive || isDone ? 'var(--color-primary)' : 'var(--border-color)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isDone
                    ? <i className="fa-solid fa-check" style={{ color: '#fff', fontSize: '12px' }}></i>
                    : <i className={`fa-solid ${s.icon}`} style={{ color: isActive ? '#fff' : 'var(--text-dim)', fontSize: '13px' }}></i>
                  }
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Etapa {s.num}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: isActive ? 'var(--color-primary)' : isDone ? 'var(--text-muted)' : 'var(--text-dim)', fontWeight: isActive ? 700 : 400 }}>
                    {s.label}
                  </div>
                </div>
              </div>
            );
          })}

          <p style={{ marginTop: 'auto', color: 'var(--text-dim)', fontSize: '0.75rem', lineHeight: 1.5, paddingTop: '32px' }}>
            <i className="fa-solid fa-shield-halved" style={{ color: 'var(--color-primary)', marginRight: '6px' }}></i>
            Seus dados são protegidos e utilizados exclusivamente para fins de atendimento.
          </p>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="ob-main">

          {/* Header mobile */}
          <div className="ob-header-mobile">
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'var(--color-primary-glow)',
              border: '2px solid var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <i className="fa-solid fa-dumbbell" style={{ fontSize: '22px', color: 'var(--color-primary)' }}></i>
            </div>
            <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', color: 'var(--text-main)', margin: '0 0 4px' }}>
              Bem-vindo, {(user?.name || '').split(' ')[0]}!
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
              Complete seu cadastro para começar.
            </p>
          </div>

          {/* Stepper mobile (dots) */}
          <div className="ob-stepper" style={{ maxWidth: '680px' }}>
            {steps.map((s, i) => (
              <React.Fragment key={s.num}>
                <div className="ob-step-dot">
                  <div className="ob-step-circle" style={{
                    background: step >= s.num ? 'var(--color-primary)' : 'var(--bg-card)',
                    border: `2px solid ${step >= s.num ? 'var(--color-primary)' : 'var(--border-color)'}`,
                    boxShadow: step === s.num ? '0 0 14px rgba(16,185,129,0.45)' : 'none',
                  }}>
                    {step > s.num
                      ? <i className="fa-solid fa-check" style={{ color: '#fff' }}></i>
                      : <i className={`fa-solid ${s.icon}`} style={{ color: step === s.num ? '#fff' : 'var(--text-muted)' }}></i>
                    }
                  </div>
                  <span className="ob-step-label" style={{ fontSize: '0.68rem', color: step >= s.num ? 'var(--color-primary)' : 'var(--text-dim)', marginTop: '5px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className="ob-step-line" style={{
                    background: step > s.num ? 'var(--color-primary)' : 'var(--border-color)',
                  }} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Barra de progresso */}
          <div className="ob-progress-bar" style={{ maxWidth: '680px' }}>
            <div className="ob-progress-fill" style={{ width: `${progressPct === 0 ? 4 : progressPct}%` }} />
          </div>

          {/* ── CARD PRINCIPAL ── */}
          <div className="ob-card">

            {/* STEP 1 */}
            {step === 1 && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-user" style={{ color: 'var(--color-primary)' }}></i> Dados Pessoais
                </h2>

                <div className="ob-form-grid">
                  <div className="form-group full">
                    <label>Nome Completo *</label>
                    <input className="form-control" value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo" />
                  </div>

                  <div className="form-group">
                    <label>Data de Nascimento *</label>
                    <input type="date" className="form-control" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Sexo *</label>
                    <select className="select-custom" value={sexo} onChange={e => setSexo(e.target.value)}>
                      <option value="">Selecione</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="O">Outro / Prefiro não informar</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>CPF</label>
                    <input className="form-control" value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" />
                  </div>
                  <div className="form-group">
                    <label>Telefone / WhatsApp *</label>
                    <input className="form-control" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 90000-0000" />
                  </div>

                  <div className="form-group full">
                    <label>E-mail</label>
                    <input className="form-control" value={email} disabled style={{ opacity: 0.55 }} />
                    <small style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>E-mail vinculado à conta Google.</small>
                  </div>
                </div>

                {error && (
                  <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', color: 'var(--color-danger)', fontSize: '0.84rem', marginTop: '16px' }}>
                    <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>{error}
                  </div>
                )}

                <div className="ob-btn-row" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={() => {
                    if (!nome || !dataNascimento || !sexo || !telefone) { setError('Preencha os campos obrigatórios (*).'); return; }
                    setError(''); setStep(2);
                  }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Próximo <i className="fa-solid fa-arrow-right"></i>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-map-marker-alt" style={{ color: 'var(--color-primary)' }}></i> Endereço e Perfil
                </h2>

                <div className="ob-form-grid">
                  <div className="form-group">
                    <label>CEP</label>
                    <input className="form-control" value={cep} onChange={e => setCep(e.target.value)} onBlur={buscarCep} placeholder="00000-000" />
                  </div>
                  <div className="form-group">
                    <label>Bairro</label>
                    <input className="form-control" value={bairro} onChange={e => setBairro(e.target.value)} placeholder="Bairro" />
                  </div>

                  <div className="form-group full">
                    <label>Endereço</label>
                    <input className="form-control" value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Rua, Avenida..." />
                  </div>

                  <div className="form-group">
                    <label>Número</label>
                    <input className="form-control" value={numero} onChange={e => setNumero(e.target.value)} placeholder="Nº" />
                  </div>
                  <div className="form-group">
                    <label>Complemento</label>
                    <input className="form-control" value={complemento} onChange={e => setComplemento(e.target.value)} placeholder="Apto, Bloco..." />
                  </div>

                  <div className="form-group">
                    <label>Cidade</label>
                    <input className="form-control" value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Cidade" />
                  </div>
                  <div className="form-group">
                    <label>Estado (UF)</label>
                    <input className="form-control" value={estado} onChange={e => setEstado(e.target.value)} placeholder="UF" maxLength={2} />
                  </div>

                  <div className="form-group">
                    <label>Estado Civil</label>
                    <select className="select-custom" value={estadoCivil} onChange={e => setEstadoCivil(e.target.value)}>
                      <option value="solteiro(a)">Solteiro(a)</option>
                      <option value="casado(a)">Casado(a)</option>
                      <option value="divorciado(a)">Divorciado(a)</option>
                      <option value="viúvo(a)">Viúvo(a)</option>
                      <option value="união estável">União Estável</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Profissão</label>
                    <input className="form-control" value={profissao} onChange={e => setProfissao(e.target.value)} placeholder="Sua profissão" />
                  </div>
                </div>

                <div className="ob-btn-row">
                  <button className="btn" onClick={() => setStep(1)} style={{ display: 'flex', alignItems: 'center', gap: '8px', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                    <i className="fa-solid fa-arrow-left"></i> Voltar
                  </button>
                  <button className="btn btn-primary" onClick={() => { setError(''); setStep(3); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Próximo <i className="fa-solid fa-arrow-right"></i>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-heart-pulse" style={{ color: 'var(--color-primary)' }}></i> Informações de Saúde
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: '24px', lineHeight: 1.6 }}>
                  Essas informações são confidenciais e ajudam a equipe a personalizar seu treino com segurança.<br />
                  <strong style={{ color: 'var(--text-main)' }}>Deixe em branco caso não se aplique.</strong>
                </p>

                <div className="ob-form-grid">
                  <div className="form-group full">
                    <label>Lesões ou Cirurgias</label>
                    <textarea className="form-control" rows={2} value={lesoes} onChange={e => setLesoes(e.target.value)}
                      placeholder="Ex: Lesão no joelho direito em 2021, cirurgia de coluna em 2019..."
                      style={{ resize: 'vertical' }} />
                  </div>
                  <div className="form-group full">
                    <label>Restrições de Movimento</label>
                    <textarea className="form-control" rows={2} value={restricoes} onChange={e => setRestricoes(e.target.value)}
                      placeholder="Ex: Não pode agachamento profundo, dor ao elevar o braço acima da cabeça..."
                      style={{ resize: 'vertical' }} />
                  </div>
                  <div className="form-group full">
                    <label>Medicamentos em Uso</label>
                    <textarea className="form-control" rows={2} value={medicamentos} onChange={e => setMedicamentos(e.target.value)}
                      placeholder="Ex: Losartana 50mg, Metformina..."
                      style={{ resize: 'vertical' }} />
                  </div>
                  <div className="form-group full">
                    <label>Histórico Clínico Relevante</label>
                    <textarea className="form-control" rows={2} value={historicoClinico} onChange={e => setHistoricoClinico(e.target.value)}
                      placeholder="Ex: Hipertensão, diabetes, asma, doenças cardiovasculares..."
                      style={{ resize: 'vertical' }} />
                  </div>
                </div>

                <div style={{ marginTop: '24px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <input
                    type="checkbox"
                    id="chkTermo"
                    checked={termoAceito}
                    onChange={e => setTermoAceito(e.target.checked)}
                    style={{ width: '18px', height: '18px', marginTop: '3px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                  />
                  <label htmlFor="chkTermo" style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: '1.5', cursor: 'pointer' }}>
                    Declaro que li e concordo com os <a href="#" onClick={(e) => { e.preventDefault(); alert('Política de Privacidade:\n\nOs dados de saúde coletados nesta avaliação (anamnese, queixas, restrições e registros clínicos) serão utilizados exclusivamente por profissionais autorizados para elaboração, acompanhamento e adaptação de sua conduta terapêutica e de exercícios físicos, garantindo sigilo médico em conformidade com as normas do CFM/CREFITO e da LGPD (Lei nº 13.709/2018).'); }} style={{ color: 'var(--color-primary)', textDecoration: 'underline', fontWeight: 600 }}>Termos de Consentimento Livre e Esclarecido (TCLE)</a> e com a <a href="#" onClick={(e) => { e.preventDefault(); alert('Política de Tratamento de Dados:\n\nSeus dados pessoais (cadastro e faturamento) e clínicos (evolução física e de força) são armazenados em servidores protegidos. Seus dados cadastrais poderão ser eliminados sob requisição expressa, enquanto dados de prontuário clínico serão mantidos em anonimização para cumprimento das obrigações legais de guarda médica de 20 anos.'); }} style={{ color: 'var(--color-primary)', textDecoration: 'underline', fontWeight: 600 }}>Política de Privacidade</a> para o tratamento de meus dados pessoais e de saúde.
                  </label>
                </div>

                {error && (
                  <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', color: 'var(--color-danger)', fontSize: '0.84rem', marginBottom: '16px' }}>
                    <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>{error}
                  </div>
                )}

                <div className="ob-btn-row">
                  <button className="btn" onClick={() => setStep(2)} style={{ display: 'flex', alignItems: 'center', gap: '8px', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                    <i className="fa-solid fa-arrow-left"></i> Voltar
                  </button>
                  <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '190px', justifyContent: 'center' }}>
                    {saving
                      ? <><div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div> Salvando...</>
                      : <><i className="fa-solid fa-check"></i> Concluir Cadastro</>
                    }
                  </button>
                </div>
              </div>
            )}
          </div>

          <p style={{ marginTop: '24px', color: 'var(--text-dim)', fontSize: '0.75rem', textAlign: 'center' }}>
            <i className="fa-solid fa-lock" style={{ marginRight: '4px' }}></i>
            Seus dados são protegidos e utilizados exclusivamente para fins de atendimento.
          </p>
        </main>
      </div>
    </>
  );
}
