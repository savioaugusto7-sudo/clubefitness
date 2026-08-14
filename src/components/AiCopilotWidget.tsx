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
}

export default function AiCopilotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      role: 'model',
      content: 'Olá! Sou o **Copiloto Inteligente do Clube Fitness**. Como posso ajudar hoje? Você pode me pedir relatórios financeiros, consultar dados de alunos, verificar horários livres na agenda ou gerar propostas de venda.',
      createdAt: new Date()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: MessageItem = {
      role: 'user',
      content: text,
      createdAt: new Date()
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

      if (data.success) {
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }

        const botMsg: MessageItem = {
          role: 'model',
          content: data.response,
          executedTools: data.executedTools || [],
          createdAt: new Date()
        };

        setMessages((prev) => [...prev, botMsg]);
      } else {
        const errorMsg: MessageItem = {
          role: 'model',
          content: `⚠️ Desculpe, ocorreu uma falha: ${data.error || 'Não foi possível processar sua solicitação.'}`,
          createdAt: new Date()
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      console.error('Erro no chat da IA:', err);
      const networkError: MessageItem = {
        role: 'model',
        content: `⚠️ Erro de conexão com o servidor da IA: ${err.message}`,
        createdAt: new Date()
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
        content: 'Nova conversa iniciada! Como posso te ajudar agora?',
        createdAt: new Date()
      }
    ]);
  };

  const quickPrompts = [
    { label: '📊 Resumo Financeiro', prompt: 'Qual o resumo financeiro deste mês (faturamento, pendências e inadimplentes)?' },
    { label: '⚠️ Alunos em Risco', prompt: 'Liste os alunos com risco de evasão ou sem treinar há mais de 15 dias.' },
    { label: '📅 Agenda de Hoje', prompt: 'Quais são os agendamentos e horários para hoje?' },
    { label: '🏷️ Planos Ativos', prompt: 'Quais planos comerciais temos cadastrados e quais os valores?' }
  ];

  return (
    <>
      {/* Botão Flutuante (Launcher) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '50px',
            padding: '14px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4), 0 2px 6px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.95rem',
            transition: 'all 0.25s ease',
            animation: 'pulse 2s infinite'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <i className="fa-solid fa-robot" style={{ fontSize: '1rem' }}></i>
          </div>
          <span>Copiloto IA</span>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#4ade80',
              boxShadow: '0 0 8px #4ade80'
            }}
          />
        </button>
      )}

      {/* Janela de Chat Flutuante */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: 'calc(100vw - 40px)',
            maxWidth: '440px',
            height: '620px',
            maxHeight: 'calc(100vh - 40px)',
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 0 20px rgba(16, 185, 129, 0.15)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: 'var(--font-body, system-ui, sans-serif)'
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#fff'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)'
                }}
              >
                <i className="fa-solid fa-robot" style={{ color: '#fff', fontSize: '1.1rem' }}></i>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Clube Fitness AI
                </h4>
                <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  Online • Gemini Flash
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleNewConversation}
                title="Nova Conversa"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <i className="fa-solid fa-plus"></i> Novo
              </button>

              <button
                onClick={() => setIsOpen(false)}
                title="Minimizar"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
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
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.02)',
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
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '16px',
                  color: '#34d399',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '5px 12px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)')}
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              background: '#090d16'
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
                  {/* Tool execution badge */}
                  {!isUser && msg.executedTools && msg.executedTools.length > 0 && (
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <i className="fa-solid fa-bolt"></i> Ação executada: {msg.executedTools.map((t) => t.name).join(', ')}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    style={{
                      background: isUser ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#1e293b',
                      color: isUser ? '#fff' : '#f1f5f9',
                      padding: '12px 16px',
                      borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      border: isUser ? 'none' : '1px solid rgba(255,255,255,0.07)',
                      fontSize: '0.88rem',
                      lineHeight: '1.55',
                      maxWidth: '88%',
                      wordBreak: 'break-word',
                      boxShadow: isUser ? '0 4px 12px rgba(16, 185, 129, 0.25)' : '0 4px 12px rgba(0,0,0,0.2)'
                    }}
                  >
                    <div
                      style={{ whiteSpace: 'pre-wrap' }}
                      dangerouslySetInnerHTML={{
                        __html: msg.content
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          .replace(/^### (.*$)/gim, '<h4 style="margin:8px 0 4px 0; color:#34d399;">$1</h4>')
                          .replace(/^## (.*$)/gim, '<h3 style="margin:10px 0 6px 0; color:#34d399;">$1</h3>')
                          .replace(/`(.*?)`/g, '<code style="background:rgba(0,0,0,0.3); padding:2px 5px; border-radius:4px; font-size:0.85em; color:#a7f3d0;">$1</code>')
                          .replace(/\n/g, '<br/>')
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Typing Loader */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.85rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  <i className="fa-solid fa-circle-notch fa-spin" style={{ color: '#10b981' }}></i>
                </div>
                <span>Processando resposta & consultando dados...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div
            style={{
              padding: '12px 14px',
              background: '#0f172a',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}
          >
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
              placeholder="Digite sua dúvida ou comando para a IA..."
              disabled={loading}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '10px',
                padding: '12px 14px',
                color: '#fff',
                fontSize: '0.88rem',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => (e.target.style.borderColor = '#10b981')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || loading}
              style={{
                background: input.trim() && !loading ? '#10b981' : 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: '10px',
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
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
