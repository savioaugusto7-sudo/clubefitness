'use client';

import React, { useState, useEffect, useRef } from 'react';

interface ToolRecord {
  name: string;
  args?: any;
  result?: any;
}

interface MessageItem {
  id?: string;
  role: 'user' | 'model' | 'tool';
  content: string;
  toolCalls?: any[];
  toolResults?: any[];
  executedTools?: ToolRecord[];
  createdAt?: string | Date;
  timeStr?: string;
}

export default function AiCopilotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      role: 'model',
      content: 'Oi! Sou a **Gabi**, sua atendente e consultora do Clube Fitness & Fisio! 🌟\n\nComo posso te ajudar hoje? Pode me pedir para reservar uma vaga de treino, consultar dados de alunos, ver o financeiro ou tirar qualquer dúvida!',
      createdAt: new Date(),
      timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, loading]);

  // Inicializar Web Speech API para ditado por voz
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const reco = new SpeechRecognition();
        reco.continuous = false;
        reco.interimResults = false;
        reco.lang = 'pt-BR';

        reco.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setIsListening(false);
        };

        reco.onerror = () => {
          setIsListening(false);
        };

        reco.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = reco;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Reconhecimento de voz não suportado neste navegador. Tente pelo Google Chrome.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: MessageItem = {
      role: 'user',
      content: text,
      createdAt: new Date(),
      timeStr: nowTime
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId: conversationId || undefined
        })
      });

      const data = await res.json();
      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (data.success) {
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }

        const botMsg: MessageItem = {
          role: 'model',
          content: data.response,
          executedTools: data.executedTools || [],
          createdAt: new Date(),
          timeStr: botTime
        };

        setMessages((prev) => [...prev, botMsg]);
      } else {
        const errorMsg: MessageItem = {
          role: 'model',
          content: `Oi! Tive uma pequena oscilação ao buscar essa informação: ${data.error || 'Pode repetir por favor?'}`,
          createdAt: new Date(),
          timeStr: botTime
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      console.error('Erro no chat da Gabi:', err);
      const networkError: MessageItem = {
        role: 'model',
        content: `Oi! Minha conexão oscilou rapidinho. Pode me enviar novamente? 😊 (${err.message})`,
        createdAt: new Date(),
        timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, networkError]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewConversation = () => {
    setConversationId(null);
    setMessages([
      {
        role: 'model',
        content: 'Nova conversa iniciada! Como posso te ajudar agora? 💬',
        createdAt: new Date(),
        timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const quickPrompts = [
    { label: '📊 Resumo do Mês', prompt: 'Gabi, qual o resumo financeiro deste mês (recebido, pendências e inadimplência)?' },
    { label: '🗓️ Vagas de Hoje', prompt: 'Gabi, quais são as vagas e agendamentos para hoje na academia e consultório?' },
    { label: '⚠️ Alunos em Risco', prompt: 'Gabi, quais alunos estão há mais de 15 dias sem treinar?' },
    { label: '🏷️ Planos e Valores', prompt: 'Gabi, me passa a lista de planos e valores ativos da academia?' }
  ];

  return (
    <>
      {/* Botão Flutuante Estilo WhatsApp (Launcher) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '50px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 24px rgba(37, 211, 102, 0.45), 0 2px 8px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.95rem',
            transition: 'all 0.25s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {/* Avatar da Gabi com Foto Real */}
          <div
            style={{
              position: 'relative',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              overflow: 'visible',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <img
              src="/gabi.jpg"
              alt="Gabi"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #fff',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '11px',
                height: '11px',
                borderRadius: '50%',
                background: '#4ade80',
                border: '2px solid #075E54',
                boxShadow: '0 0 6px #4ade80'
              }}
            />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.2 }}>Falar com a Gabi</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.9, fontWeight: 500 }}>Online • Atendente IA</div>
          </div>
        </button>
      )}

      {/* Janela de Chat Estilo WhatsApp */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: 'calc(100vw - 40px)',
            maxWidth: '430px',
            height: '630px',
            maxHeight: 'calc(100vh - 40px)',
            background: '#0b141a',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '16px',
            boxShadow: '0 24px 48px rgba(0,0,0,0.7), 0 0 24px rgba(37, 211, 102, 0.2)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: 'var(--font-body, system-ui, -apple-system, sans-serif)'
          }}
        >
          {/* Header Estilo WhatsApp */}
          <div
            style={{
              background: '#202c33',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#e9edef'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  position: 'relative',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <img
                  src="/gabi.jpg"
                  alt="Gabi"
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid rgba(255,255,255,0.2)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#25D366',
                    border: '2px solid #202c33'
                  }}
                />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 600, color: '#e9edef', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Gabi • Clube Fitness
                </h4>
                <div style={{ fontSize: '0.74rem', color: '#25D366', fontWeight: 500 }}>
                  {loading ? 'digitando...' : 'Online agora'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={handleNewConversation}
                title="Nova Conversa"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#8696a0',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <i className="fa-solid fa-plus"></i> Novo
              </button>

              <button
                onClick={() => setIsOpen(false)}
                title="Fechar"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8696a0',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  padding: '6px'
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          {/* Quick Prompts Chips */}
          <div
            style={{
              padding: '8px 12px',
              background: '#111b21',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              scrollbarWidth: 'none'
            }}
          >
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(qp.prompt)}
                disabled={loading}
                style={{
                  background: '#202c33',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  color: '#00a884',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '5px 12px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#2a3942')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#202c33')}
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Mensagens (WhatsApp Wallpaper / Bubbles) */}
          <div
            style={{
              flex: 1,
              padding: '14px 16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: '#0b141a',
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
          >
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '100%'
                  }}
                >
                  {/* Badge de Ação Realizada nos Bastidores */}
                  {!isUser && msg.executedTools && msg.executedTools.length > 0 && (
                    <div
                      style={{
                        fontSize: '0.7rem',
                        color: '#00a884',
                        background: 'rgba(0, 168, 132, 0.1)',
                        border: '1px solid rgba(0, 168, 132, 0.25)',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <i className="fa-solid fa-check-double"></i> Ação no sistema: {msg.executedTools.map((t) => t.name.replace(/_/g, ' ')).join(', ')}
                    </div>
                  )}

                  {/* Balão de Mensagem Estilo WhatsApp */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', maxWidth: '88%' }}>
                    {!isUser && (
                      <img
                        src="/gabi.jpg"
                        alt="Gabi"
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          marginBottom: '2px',
                          flexShrink: 0
                        }}
                      />
                    )}
                    <div
                      style={{
                        background: isUser ? '#005c4b' : '#202c33',
                        color: '#e9edef',
                        padding: '10px 14px 6px 14px',
                        borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                        fontSize: '0.88rem',
                        lineHeight: '1.5',
                        wordBreak: 'break-word',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        position: 'relative'
                      }}
                    >
                      <div
                        style={{ whiteSpace: 'pre-wrap' }}
                        dangerouslySetInnerHTML={{
                          __html: msg.content
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\*(.*?)\*/g, '<em>$1</em>')
                            .replace(/^### (.*$)/gim, '<h4 style="margin:8px 0 4px 0; color:#25D366;">$1</h4>')
                            .replace(/^## (.*$)/gim, '<h3 style="margin:10px 0 6px 0; color:#25D366;">$1</h3>')
                            .replace(/`(.*?)`/g, '<code style="background:rgba(0,0,0,0.3); padding:2px 5px; border-radius:4px; font-size:0.85em; color:#a7f3d0;">$1</code>')
                            .replace(/\n/g, '<br/>')
                        }}
                      />
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '4px',
                          fontSize: '0.68rem',
                          color: 'rgba(255,255,255,0.45)',
                          marginTop: '4px'
                        }}
                      >
                        <span>{msg.timeStr || 'agora'}</span>
                        {isUser && <i className="fa-solid fa-check-double" style={{ color: '#53bdeb' }}></i>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Digitando... */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: '#202c33', borderRadius: '12px', width: 'fit-content', color: '#8696a0', fontSize: '0.8rem' }}>
                <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#25D366', animation: 'pulse 1s infinite' }}></span>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#25D366', animation: 'pulse 1s infinite 0.2s' }}></span>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#25D366', animation: 'pulse 1s infinite 0.4s' }}></span>
                </span>
                <span>Gabi está digitando...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer com Microfone e Envio Estilo WhatsApp */}
          <div
            style={{
              padding: '10px 12px',
              background: '#202c33',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}
          >
            {/* Botão Microfone / Gravação de Voz */}
            <button
              onClick={toggleListening}
              type="button"
              title={isListening ? 'Parar de escutar' : 'Ditar mensagem por voz'}
              style={{
                background: isListening ? '#ef4444' : 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isListening ? '#fff' : '#8696a0',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
            >
              <i className={`fa-solid ${isListening ? 'fa-microphone-lines fa-fade' : 'fa-microphone'}`}></i>
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={isListening ? 'Ouvindo sua voz...' : 'Mensagem para a Gabi...'}
              disabled={loading}
              style={{
                flex: 1,
                background: '#2a3942',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px',
                padding: '10px 16px',
                color: '#e9edef',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || loading}
              style={{
                background: input.trim() && !loading ? '#00a884' : 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
            >
              <i className="fa-solid fa-paper-plane" style={{ fontSize: '0.95rem' }}></i>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
