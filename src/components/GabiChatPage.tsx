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

export default function GabiChatPage() {
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
    scrollToBottom();
  }, [messages, loading]);

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

        reco.onerror = () => setIsListening(false);
        reco.onend = () => setIsListening(false);

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
          content: `Oi! Tive uma pequena oscilação ao processar: ${data.error || 'Pode repetir por favor?'}`,
          createdAt: new Date(),
          timeStr: botTime
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      console.error('Erro no chat da Gabi:', err);
      const networkError: MessageItem = {
        role: 'model',
        content: `Oi! Minha conexão oscilou rapidinho. Pode me enviar novamente? 😊`,
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100dvh - 90px)',
        maxHeight: 'calc(100dvh - 90px)',
        background: '#0b141a',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}
    >
      {/* Header WhatsApp Style */}
      <div
        style={{
          background: '#202c33',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#e9edef',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              position: 'relative',
              width: '46px',
              height: '46px',
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
                width: '46px',
                height: '46px',
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
                width: '13px',
                height: '13px',
                borderRadius: '50%',
                background: '#25D366',
                border: '2.5px solid #202c33'
              }}
            />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#e9edef' }}>
              Gabi • Atendente Clube Fitness
            </h3>
            <div style={{ fontSize: '0.78rem', color: '#25D366', fontWeight: 500 }}>
              {loading ? 'digitando...' : 'Online no WhatsApp'}
            </div>
          </div>
        </div>

        <button
          onClick={handleNewConversation}
          title="Nova Conversa"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: '#8696a0',
            padding: '8px 14px',
            cursor: 'pointer',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <i className="fa-solid fa-plus"></i> Nova Conversa
        </button>
      </div>

      {/* Quick Prompts Chips */}
      <div
        style={{
          padding: '10px 14px',
          background: '#111b21',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          scrollbarWidth: 'none',
          flexShrink: 0
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
              borderRadius: '18px',
              color: '#00a884',
              fontSize: '0.78rem',
              fontWeight: 600,
              padding: '6px 14px',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.2s ease'
            }}
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div
        style={{
          flex: 1,
          padding: '16px 20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
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
              {!isUser && msg.executedTools && msg.executedTools.length > 0 && (
                <div
                  style={{
                    fontSize: '0.72rem',
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

              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', maxWidth: '85%' }}>
                {!isUser && (
                  <img
                    src="/gabi.jpg"
                    alt="Gabi"
                    style={{
                      width: '28px',
                      height: '28px',
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
                    padding: '12px 16px 8px 16px',
                    borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    fontSize: '0.92rem',
                    lineHeight: '1.55',
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
                      fontSize: '0.7rem',
                      color: 'rgba(255,255,255,0.45)',
                      marginTop: '6px'
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

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', background: '#202c33', borderRadius: '14px', width: 'fit-content', color: '#8696a0', fontSize: '0.85rem' }}>
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

      {/* Input Footer */}
      <div
        style={{
          padding: '12px 16px',
          background: '#202c33',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          flexShrink: 0
        }}
      >
        <button
          onClick={toggleListening}
          type="button"
          title={isListening ? 'Parar de escutar' : 'Ditar mensagem por voz'}
          style={{
            background: isListening ? '#ef4444' : 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '42px',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isListening ? '#fff' : '#8696a0',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
        >
          <i className={`fa-solid ${isListening ? 'fa-microphone-lines fa-fade' : 'fa-microphone'}`} style={{ fontSize: '1.05rem' }}></i>
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
            borderRadius: '24px',
            padding: '12px 18px',
            color: '#e9edef',
            fontSize: '0.92rem',
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
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
        >
          <i className="fa-solid fa-paper-plane" style={{ fontSize: '1.05rem' }}></i>
        </button>
      </div>
    </div>
  );
}
