'use client';

import React, { useState } from 'react';

interface PerfilSegurancaProfissionalPanelProps {
  professionalId?: string;
  professionalData?: any;
  sessionUser?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
}

export default function PerfilSegurancaProfissionalPanel({
  professionalId,
  professionalData,
  sessionUser
}: PerfilSegurancaProfissionalPanelProps) {
  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // PIN State
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [loadingPin, setLoadingPin] = useState(false);
  const [pinMsg, setPinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isColetivo = sessionUser?.email === 'coletivo@clube.com';
  const profName = professionalData?.nome || sessionUser?.name || 'Profissional';
  const profEmail = sessionUser?.email || professionalData?.userId?.email || '—';
  const profRole = professionalData?.especialidade || professionalData?.cargo || 'Profissional de Educação Física / Fisioterapeuta';
  const profRegistro = professionalData?.registro || 'Não informado';

  // Handle Password Submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Por favor, informe sua senha atual.' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'A nova senha deve ter no mínimo 6 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'A confirmação de senha não coincide com a nova senha.' });
      return;
    }

    setLoadingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          password: newPassword
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setPasswordMsg({ type: 'error', text: data.error || 'Erro ao atualizar senha.' });
      } else {
        setPasswordMsg({ type: 'success', text: 'Senha de acesso atualizada com sucesso! Use a nova senha no próximo login.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Erro de conexão com o servidor.' });
    } finally {
      setLoadingPassword(false);
    }
  };

  // Handle PIN Submit
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMsg(null);

    if (isColetivo) {
      setPinMsg({
        type: 'error',
        text: 'Não é permitido alterar o PIN no terminal coletivo. Faça login individualmente.'
      });
      return;
    }

    const cleanNewPin = newPin.trim();
    if (!/^\d{4}$/.test(cleanNewPin)) {
      setPinMsg({ type: 'error', text: 'O novo PIN deve conter exatamente 4 números (ex: 4589).' });
      return;
    }

    if (cleanNewPin !== confirmPin.trim()) {
      setPinMsg({ type: 'error', text: 'A confirmação do PIN não coincide com o novo PIN.' });
      return;
    }

    if (!currentPin.trim()) {
      setPinMsg({ type: 'error', text: 'Informe seu PIN atual (o padrão inicial de fábrica é 1234).' });
      return;
    }

    setLoadingPin(true);
    try {
      const res = await fetch('/api/professionals/my-pin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPin: currentPin.trim(),
          newPin: cleanNewPin
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setPinMsg({ type: 'error', text: data.error || 'Erro ao atualizar o PIN.' });
      } else {
        setPinMsg({
          type: 'success',
          text: 'PIN de assinatura rápida atualizado com sucesso! Use o novo código no totem coletivo.'
        });
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
      }
    } catch (err: any) {
      setPinMsg({ type: 'error', text: err.message || 'Erro de conexão com o servidor.' });
    } finally {
      setLoadingPin(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 8px 60px 8px' }}>
      {/* Top Banner / Identification Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '24px 28px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(10px)',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
            }}
          >
            <i className="fas fa-user-shield"></i>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#f8fafc' }}>
                {profName}
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}
              >
                {profRole}
              </span>
            </div>
            <div
              style={{
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                fontSize: '13px',
                color: '#94a3b8',
                flexWrap: 'wrap'
              }}
            >
              <span>
                <i className="fas fa-envelope" style={{ marginRight: '6px', color: '#64748b' }}></i>
                {profEmail}
              </span>
              <span>
                <i className="fas fa-id-badge" style={{ marginRight: '6px', color: '#64748b' }}></i>
                Registro: <strong>{profRegistro}</strong>
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '10px 16px',
            fontSize: '12px',
            color: '#cbd5e1',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <i className="fas fa-lock" style={{ color: '#10b981', fontSize: '15px' }}></i>
          <div>
            <div style={{ fontWeight: '600', color: '#f1f5f9' }}>Ambiente Autenticado</div>
            <div style={{ color: '#94a3b8', fontSize: '11px' }}>Suas credenciais são criptografadas com segurança</div>
          </div>
        </div>
      </div>

      {/* Explanatory Guideline Box */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.2) 0%, rgba(17, 24, 39, 0.6) 100%)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px'
        }}
      >
        <i className="fas fa-info-circle" style={{ color: '#38bdf8', fontSize: '20px', marginTop: '2px' }}></i>
        <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#cbd5e1' }}>
          <strong style={{ color: '#f8fafc', display: 'block', marginBottom: '2px' }}>
            Entenda a diferença entre suas credenciais:
          </strong>
          <span style={{ display: 'block' }}>
            <strong style={{ color: '#93c5fd' }}>1. Senha de Acesso:</strong> Senha com letras e números usada para fazer login no sistema através do seu e-mail individual.
          </span>
          <span style={{ display: 'block' }}>
            <strong style={{ color: '#a7f3d0' }}>2. PIN de Assinatura Rápida (4 dígitos):</strong> Código numérico rápido usado no terminal/totem compartilhado da academia para registrar suas intervenções sem precisar digitar seu e-mail e senha.
          </span>
        </div>
      </div>

      {isColetivo && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '24px',
            color: '#fca5a5',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <i className="fas fa-exclamation-triangle" style={{ fontSize: '18px' }}></i>
          <div>
            <strong>Acesso via Terminal Coletivo:</strong> Você está conectado à conta compartilhada de totem da academia. Para alterar sua senha pessoal ou seu PIN, faça login com seu e-mail individual.
          </div>
        </div>
      )}

      {/* Two Column Grid for Password and PIN */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px'
        }}
      >
        {/* CARD 1: Alterar Senha de Acesso */}
        <div
          style={{
            background: 'var(--card-bg, #1e293b)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6',
                fontSize: '18px'
              }}
            >
              <i className="fas fa-key"></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#f8fafc' }}>
                Senha de Acesso
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                Utilizada para entrar no sistema com seu e-mail
              </p>
            </div>
          </div>

          {passwordMsg && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '13px',
                background: passwordMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${passwordMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: passwordMsg.type === 'success' ? '#6ee7b7' : '#fca5a5',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <i className={passwordMsg.type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'}></i>
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {/* Senha Atual */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>
                Senha Atual *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Sua senha atual"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 14px',
                    borderRadius: '8px',
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#f8fafc',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <i className={showCurrentPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                </button>
              </div>
            </div>

            {/* Nova Senha */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>
                Nova Senha * (mínimo 6 caracteres)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nova senha segura"
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 14px',
                    borderRadius: '8px',
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#f8fafc',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <i className={showNewPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                </button>
              </div>
            </div>

            {/* Confirmar Nova Senha */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>
                Confirmar Nova Senha *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Digite a nova senha novamente"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 14px',
                    borderRadius: '8px',
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#f8fafc',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <i className={showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                </button>
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
              <button
                type="submit"
                disabled={loadingPassword}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: loadingPassword ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {loadingPassword ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Atualizando Senha...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i> Salvar Nova Senha
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* CARD 2: PIN de Assinatura Rápida (Totem Coletivo) */}
        <div
          style={{
            background: 'var(--card-bg, #1e293b)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
                fontSize: '18px'
              }}
            >
              <i className="fas fa-th"></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#f8fafc' }}>
                PIN Rápido (4 Dígitos)
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                Assinatura rápida para terminal / totem coletivo
              </p>
            </div>
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
              marginBottom: '16px',
              fontSize: '12px',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fas fa-lightbulb" style={{ color: '#fbbf24' }}></i>
            <span>
              O PIN padrão inicial cadastrado é <strong>1234</strong>.
            </span>
          </div>

          {pinMsg && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '13px',
                background: pinMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${pinMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: pinMsg.type === 'success' ? '#6ee7b7' : '#fca5a5',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <i className={pinMsg.type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'}></i>
              <span>{pinMsg.text}</span>
            </div>
          )}

          <form onSubmit={handlePinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {/* PIN Atual */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>
                PIN Atual * (4 dígitos)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrentPin ? 'text' : 'password'}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Ex: 1234"
                  maxLength={4}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 14px',
                    borderRadius: '8px',
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#f8fafc',
                    fontSize: '16px',
                    letterSpacing: '4px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPin(!showCurrentPin)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <i className={showCurrentPin ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                </button>
              </div>
            </div>

            {/* Novo PIN */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>
                Novo PIN * (exatamente 4 dígitos numéricos)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPin ? 'text' : 'password'}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Ex: 5892"
                  maxLength={4}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 14px',
                    borderRadius: '8px',
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#f8fafc',
                    fontSize: '16px',
                    letterSpacing: '4px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPin(!showNewPin)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <i className={showNewPin ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                </button>
              </div>
            </div>

            {/* Confirmar Novo PIN */}
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>
                Confirmar Novo PIN * (4 dígitos)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPin ? 'text' : 'password'}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Repita o novo PIN"
                  maxLength={4}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 40px 10px 14px',
                    borderRadius: '8px',
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#f8fafc',
                    fontSize: '16px',
                    letterSpacing: '4px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPin(!showConfirmPin)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <i className={showConfirmPin ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                </button>
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
              <button
                type="submit"
                disabled={loadingPin || isColetivo}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  background: isColetivo ? '#64748b' : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: loadingPin || isColetivo ? 'not-allowed' : 'pointer',
                  boxShadow: isColetivo ? 'none' : '0 4px 12px rgba(5, 150, 105, 0.3)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {loadingPin ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Atualizando PIN...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i> Salvar Novo PIN
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
