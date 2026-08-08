'use client';

import React, { useState } from 'react';

export default function DynamusCadastroPage() {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [planoName, setPlanoName] = useState('Dynamus Semestral');
  const [dataAdesao, setDataAdesao] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const formatCpf = (val: string) => {
    const digits = val.replace(/\D/g, '');
    let formatted = '';
    if (digits.length > 0) {
      formatted += digits.substring(0, 3);
    }
    if (digits.length > 3) {
      formatted += '.' + digits.substring(3, 6);
    }
    if (digits.length > 6) {
      formatted += '.' + digits.substring(6, 9);
    }
    if (digits.length > 9) {
      formatted += '-' + digits.substring(9, 11);
    }
    return formatted;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '');
    if (digits.length <= 11) {
      setCpf(formatCpf(digits));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/cadastro-dynamus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          cpf,
          planoName,
          dataAdesao
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Erro ao realizar cadastro.');
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente mais tarde.');
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div style={containerStyle}>
        <div style={glowBgStyle}></div>
        <div style={glassCardStyle}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={successIconStyle}>
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <h1 style={titleStyle}>Cadastro Concluído!</h1>
            <p style={paragraphStyle}>
              Parabéns, <strong>{nome}</strong>! Seu cadastro no plano <strong>{planoName}</strong> foi registrado com sucesso.
            </p>
            <div style={infoBoxStyle}>
              <i className="fa-solid fa-circle-info" style={{ marginRight: '8px', color: 'var(--color-primary)' }}></i>
              <span>Como aluno do plano Dynamus, você não tem login direto no sistema. Suas sessões deverão ser agendadas e gerenciadas diretamente pela equipe da recepção ou administração.</span>
            </div>
            <button 
              style={btnStyle}
              onClick={() => {
                setNome('');
                setCpf('');
                setSuccess(false);
              }}
            >
              Realizar Novo Cadastro
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={glowBgStyle}></div>
      <div style={glassCardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img src="/logo.jpg" alt="Logo" style={logoStyle} />
          <h1 style={titleStyle}>Cadastro de Aluno Dynamus</h1>
          <p style={subtitleStyle}>Preencha as informações abaixo para efetivar a sua adesão.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {error && (
            <div style={errorBoxStyle}>
              <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>
              {error}
            </div>
          )}

          <div style={groupStyle}>
            <label style={labelStyle}>Nome Completo</label>
            <input 
              type="text" 
              style={inputStyle} 
              placeholder="Digite o seu nome completo"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
              disabled={saving}
            />
          </div>

          <div style={groupStyle}>
            <label style={labelStyle}>CPF</label>
            <input 
              type="text" 
              style={inputStyle} 
              placeholder="000.000.000-00"
              value={cpf}
              onChange={handleCpfChange}
              required
              disabled={saving}
            />
          </div>

          <div style={groupStyle}>
            <label style={labelStyle}>Plano Contratado</label>
            <select 
              style={selectStyle} 
              value={planoName}
              onChange={e => setPlanoName(e.target.value)}
              disabled={saving}
            >
              <option value="Dynamus Semestral">Dynamus Semestral</option>
              <option value="Dynamus Anual">Dynamus Anual</option>
            </select>
          </div>

          <div style={groupStyle}>
            <label style={labelStyle}>Data de Adesão</label>
            <input 
              type="date" 
              style={inputStyle} 
              value={dataAdesao}
              onChange={e => setDataAdesao(e.target.value)}
              required
              disabled={saving}
            />
          </div>

          <button type="submit" style={btnStyle} disabled={saving}>
            {saving ? (
              <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i> Cadastrando...</>
            ) : (
              'Finalizar Cadastro'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// Styling (Modern Premium Dark Theme with Glassmorphism)
const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: '#090a0f',
  fontFamily: "'Outfit', 'Inter', sans-serif",
  padding: '20px',
  position: 'relative',
  overflow: 'hidden',
  color: '#fff'
};

const glowBgStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '500px',
  height: '500px',
  background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.15) 50%, rgba(0,0,0,0) 100%)',
  zIndex: 1,
  pointerEvents: 'none'
};

const glassCardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.02)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '24px',
  padding: '40px',
  width: '100%',
  maxWidth: '480px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  zIndex: 2,
  position: 'relative'
};

const logoStyle: React.CSSProperties = {
  width: '64px',
  height: '64px',
  borderRadius: '50%',
  objectFit: 'cover',
  marginBottom: '16px',
  border: '2px solid rgba(255,255,255,0.1)'
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.6rem',
  fontWeight: 800,
  margin: '0 0 6px 0',
  letterSpacing: '-0.02em',
  background: 'linear-gradient(135deg, #fff 0%, #a78bfa 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent'
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: '#94a3b8',
  margin: 0
};

const paragraphStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  color: '#e2e8f0',
  lineHeight: 1.5,
  margin: 0
};

const groupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  textAlign: 'left'
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  fontWeight: 600,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

const inputStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '12px',
  padding: '12px 16px',
  color: '#fff',
  fontSize: '0.9rem',
  transition: 'border-color 0.2s',
  outline: 'none'
};

const selectStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '12px',
  padding: '12px 16px',
  color: '#fff',
  fontSize: '0.9rem',
  transition: 'border-color 0.2s',
  outline: 'none',
  appearance: 'none',
  cursor: 'pointer'
};

const btnStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  border: 'none',
  color: '#fff',
  borderRadius: '12px',
  padding: '14px',
  fontSize: '0.92rem',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'opacity 0.2s, transform 0.1s',
  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  marginTop: '10px'
};

const errorBoxStyle: React.CSSProperties = {
  background: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid #ef4444',
  color: '#f87171',
  padding: '12px 16px',
  borderRadius: '12px',
  fontSize: '0.82rem',
  display: 'flex',
  alignItems: 'center'
};

const successIconStyle: React.CSSProperties = {
  fontSize: '3.5rem',
  color: '#10b981',
  margin: '0 auto'
};

const infoBoxStyle: React.CSSProperties = {
  background: 'rgba(99, 102, 241, 0.08)',
  border: '1px solid rgba(99, 102, 241, 0.2)',
  padding: '16px',
  borderRadius: '16px',
  fontSize: '0.8rem',
  color: '#c7d2fe',
  textAlign: 'left',
  lineHeight: 1.5,
  display: 'flex',
  alignItems: 'flex-start'
};
