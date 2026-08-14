'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

type Step = 1 | 2 | 3;

export default function PublicCadastroPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [termoAceito, setTermoAceito] = useState(false);

  // Step 1: Dados Pessoais
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [dataNascimentoDisplay, setDataNascimentoDisplay] = useState('');
  const [sexo, setSexo] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Step 2: Endereço
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');

  // Step 3: Saúde
  const [lesoes, setLesoes] = useState('');
  const [restricoes, setRestricoes] = useState('');
  const [medicamentos, setMedicamentos] = useState('');
  const [historicoClinico, setHistoricoClinico] = useState('');

  const convertBrToIso = (brDate: string) => {
    if (!brDate) return '';
    const clean = brDate.trim().replace(/\D/g, '');
    if (clean.length === 8) {
      const day = clean.substring(0, 2);
      const month = clean.substring(2, 4);
      const year = clean.substring(4, 8);
      return `${year}-${month}-${day}`;
    }
    const parts = brDate.trim().split(/[/.-]/);
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2].length === 2 ? `19${parts[2]}` : parts[2];
      if (year.length === 4) return `${year}-${month}-${day}`;
    }
    return '';
  };

  const handleDateChange = (val: string) => {
    const digits = val.replace(/\D/g, '');
    let formatted = '';
    
    if (digits.length > 0) {
      formatted += digits.substring(0, 2);
    }
    if (digits.length > 2) {
      formatted += '/' + digits.substring(2, 4);
    }
    if (digits.length > 4) {
      formatted += '/' + digits.substring(4, 8);
    }
    
    setDataNascimentoDisplay(formatted);
    const iso = convertBrToIso(formatted);
    setDataNascimento(iso);
  };

  const calculateAge = (brDate: string) => {
    if (brDate.length !== 10) return null;
    const iso = convertBrToIso(brDate);
    if (!iso) return null;
    const birth = new Date(iso);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    if (age < 0 || age > 120) return null;
    return age;
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

  const handleStep1Next = async () => {
    setError('');
    const cleanNome = nome.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanTel = telefone.trim();

    if (!cleanNome) {
      setError('Por favor, informe seu Nome Completo.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Por favor, informe um E-mail válido.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!dataNascimentoDisplay.trim()) {
      setError('Por favor, informe sua Data de Nascimento (ex: 30/01/1980).');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const isoDate = convertBrToIso(dataNascimentoDisplay);
    if (!isoDate || isoDate.length !== 10) {
      setError('A data de nascimento deve estar no formato DD/MM/AAAA (ex: 30/01/1980).');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!cleanTel) {
      setError('Por favor, informe seu Telefone / WhatsApp com DDD.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setCheckingEmail(true);
    try {
      const res = await fetch(`/api/leads/onboarding?email=${encodeURIComponent(cleanEmail)}`);
      const data = await res.json();
      if (data.exists) {
        setError('Este e-mail já está cadastrado em nosso sistema.');
        setCheckingEmail(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    } catch (err) {
      console.warn('Verificação de email:', err);
    }
    setCheckingEmail(false);
    setDataNascimento(isoDate);
    if (!sexo) setSexo('M');
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!termoAceito) {
      setError('Você precisa aceitar os Termos de Consentimento e a Política de Privacidade para prosseguir.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/leads/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome, dataNascimento, sexo, cpf, telefone, email,
          cep, endereco, numero, complemento, bairro, cidade, estado,
          lesoes, restricoes, medicamentos, historicoClinico,
          termoAceito: true
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Erro ao salvar o cadastro.');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { num: 1, label: 'Dados Pessoais', icon: 'fa-user' },
    { num: 2, label: 'Endereço', icon: 'fa-map-marker-alt' },
    { num: 3, label: 'Saúde', icon: 'fa-heart-pulse' },
  ];

  const progressPct = ((step - 1) / 2) * 100;

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-darker)', color: 'var(--text-main)', padding: '20px' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '45px 35px', maxWidth: '600px', width: '100%', textAlign: 'center', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ width: '85px', height: '85px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
            <i className="fa-solid fa-circle-check fa-3x" style={{ color: 'var(--color-primary)' }}></i>
          </div>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.8rem', marginBottom: '16px', color: '#fff', fontWeight: 800 }}>Cadastro Concluído com Sucesso!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '35px' }}>
            Obrigado, <strong>{nome}</strong>! Suas informações de cadastro inicial foram salvas no sistema.<br /><br />
            Nossa equipe do <strong>Clube Fitness Fisio</strong> entrará em contato em breve para agendar a sua **avaliação física** e apresentar as propostas comerciais ideais para o seu perfil.
          </p>
          <button className="btn btn-primary" onClick={() => router.push('/')} style={{ width: '100%', padding: '12px 0', fontSize: '1rem', fontWeight: 600 }}>
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

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
              <i className="fa-solid fa-address-card" style={{ fontSize: '24px', color: 'var(--color-primary)' }}></i>
            </div>
            <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '1.6rem', color: 'var(--text-main)', margin: '0 0 6px', lineHeight: 1.2 }}>
              Cadastro Inicial
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}>
              Preencha o formulário para darmos início ao seu atendimento e agendamento.
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
          
          <p style={{ marginTop: 'auto', color: 'var(--text-dim)', fontSize: '0.75rem', lineHeight: 1.5 }}>
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
              <i className="fa-solid fa-address-card" style={{ fontSize: '22px', color: 'var(--color-primary)' }}></i>
            </div>
            <h1 style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', color: 'var(--text-main)', margin: '0 0 4px' }}>
              Cadastro Inicial
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
              Preencha o formulário para darmos início ao atendimento.
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
                    <input className="form-control" value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo" required />
                  </div>

                  <div className="form-group full">
                    <label>E-mail *</label>
                    <input className="form-control" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu.email@exemplo.com" required />
                  </div>

                  <div className="form-group">
                    <label>Data de Nascimento *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={dataNascimentoDisplay} 
                      onChange={e => handleDateChange(e.target.value)} 
                      placeholder="DD/MM/AAAA"
                      maxLength={10}
                      required
                    />
                    {(() => {
                      const age = calculateAge(dataNascimentoDisplay);
                      if (age !== null) {
                        return (
                          <small style={{ color: 'var(--color-primary)', display: 'block', marginTop: '4px', fontWeight: 600 }}>
                            Idade: {age} anos
                          </small>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div className="form-group">
                    <label>Sexo *</label>
                    <select className="select-custom" value={sexo} onChange={e => setSexo(e.target.value)} required>
                      <option value="">Selecione</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="O">Outro / Prefiro não informar</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>CPF</label>
                    <input className="form-control" value={cpf} onChange={handleCpfChange} maxLength={11} placeholder="CPF (apenas números)" />
                  </div>
                  <div className="form-group">
                    <label>Telefone / WhatsApp *</label>
                    <input className="form-control" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(99) 99999-9999" required />
                  </div>
                </div>

                {error && (
                  <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', color: 'var(--color-danger)', fontSize: '0.84rem', marginTop: '16px' }}>
                    <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>{error}
                  </div>
                )}

                <div className="ob-btn-row" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={handleStep1Next} disabled={checkingEmail} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {checkingEmail ? 'Verificando...' : 'Próximo'} <i className="fa-solid fa-arrow-right"></i>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div>
                <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-map-marker-alt" style={{ color: 'var(--color-primary)' }}></i> Endereço Residencial
                </h2>

                <div className="ob-form-grid">
                  <div className="form-group">
                    <label>CEP</label>
                    <input className="form-control" value={cep} onChange={handleCepChange} onBlur={buscarCep} placeholder="00000000" maxLength={8} />
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
                </div>

                <div className="ob-btn-row">
                  <button className="btn" onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                    <i className="fa-solid fa-arrow-left"></i> Voltar
                  </button>
                  <button className="btn btn-primary" onClick={() => { setError(''); setStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  Essas informações nos ajudam a preparar a sua avaliação física de forma personalizada e segura.<br />
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
                      ? <><div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div> Cadastrando...</>
                      : <><i className="fa-solid fa-check"></i> Finalizar Cadastro</>
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
