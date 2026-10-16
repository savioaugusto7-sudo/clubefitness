'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
);

interface PromptItem {
  _id?: string;
  titulo: string;
  descricao: string;
  prompt: string;
  categoria: string;
  tags?: string[];
  isDefault?: boolean;
}

interface MessageItem {
  id?: string;
  role: 'user' | 'model';
  content: string;
  timeStr: string;
  executedTools?: any[];
  visualMetadata?: any;
}

interface GabiIntelligenceStudioProps {
  user: any;
}

export default function GabiIntelligenceStudio({ user }: GabiIntelligenceStudioProps) {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      role: 'model',
      content: `Olá, **Sávio**! Bem-vindo ao seu **Gabi Intelligence Studio**.\n\nEste é o seu ambiente executivo exclusivo de inteligência de dados. Posso cruzar em tempo real as coleções de **Clientes**, **Contratos**, **Financeiro**, **Agendamentos** e **Horários Fixos** para gerar auditorias completas, detectar inconsistências e projetar vencimentos.\n\nEscolha um dos prompts na barra lateral ou faça qualquer pergunta analítica diretamente!`,
      timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      visualMetadata: {
        kpis: [
          { label: 'Base Ativa Auditada', value: '121 Alunos', type: 'success' },
          { label: 'Risco Crítico (>30d)', value: '7 Alunos', type: 'danger' },
          { label: 'Onboarding Pendente', value: '2 Alunos', type: 'warning' },
          { label: 'Horários Fixos Ativos', value: '47 Vagas', type: 'info' }
        ]
      }
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Prompts do Sávio
  const [savedPrompts, setSavedPrompts] = useState<PromptItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [showNewPromptModal, setShowNewPromptModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPromptText, setNewPromptText] = useState('');
  const [newCategory, setNewCategory] = useState('auditoria');

  // Controle de layout da barra lateral
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Busca e filtro em tabelas de ferramentas
  const [tableSearch, setTableSearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Carregar prompts salvos da API
  const fetchPrompts = async () => {
    try {
      const res = await fetch('/api/ai/executive/prompts');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSavedPrompts(data.data);
      }
    } catch (e) {
      console.error('Erro ao carregar prompts:', e);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: MessageItem = {
      role: 'user',
      content: text,
      timeStr: nowTime
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/executive/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId: conversationId
        })
      });

      let data: any = null;
      const textResponse = await res.text();
      try {
        data = JSON.parse(textResponse);
      } catch {
        if (res.status === 504) {
          throw new Error('A requisição excedeu o tempo limite do servidor (504 Gateway Timeout).');
        }
        throw new Error(`Falha no servidor (${res.status}): ${textResponse.substring(0, 100)}`);
      }

      if (data.success) {
        if (data.conversationId) setConversationId(data.conversationId);

        const modelMsg: MessageItem = {
          role: 'model',
          content: data.reply,
          timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          executedTools: data.executedTools || [],
          visualMetadata: data.visualMetadata || extractAutoVisualMetadata(data.executedTools)
        };

        setMessages(prev => [...prev, modelMsg]);
      } else {
        const errorMsg: MessageItem = {
          role: 'model',
          content: `⚠️ **Erro na análise:** ${data.error || 'Não foi possível concluir a consulta.'}`,
          timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (err: any) {
      const errorMsg: MessageItem = {
        role: 'model',
        content: `⚠️ **Erro de conexão:** ${err.message}`,
        timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Gerador automático de visualizações com base nas ferramentas executadas
  const extractAutoVisualMetadata = (tools?: any[]) => {
    if (!tools || tools.length === 0) return null;

    // Se executou consultar_vencimentos_proximos
    const vencTool = tools.find(t => t.name === 'consultar_vencimentos_proximos');
    if (vencTool && vencTool.result?.alunos) {
      const alunos = vencTool.result.alunos;
      return {
        kpis: [
          { label: 'Vencimentos Auditados', value: `${alunos.length} Alunos`, type: 'warning' },
          { label: 'Valor Total Previsto', value: `R$ ${Number(vencTool.result.valorTotalPrevisto || 0).toLocaleString('pt-BR')}`, type: 'success' },
          { label: 'Período Auditado', value: `${vencTool.result.periodoAuditadoDias} dias`, type: 'info' }
        ],
        chart: {
          type: 'bar',
          title: 'Vencimentos por Dias Restantes',
          labels: ['1 a 7 dias', '8 a 15 dias', '16 a 30 dias'],
          data: [
            alunos.filter((a: any) => a.diasRestantes <= 7).length,
            alunos.filter((a: any) => a.diasRestantes > 7 && a.diasRestantes <= 15).length,
            alunos.filter((a: any) => a.diasRestantes > 15).length
          ]
        }
      };
    }

    // Se executou auditar_inconsistencias_cadastrais_financeiras
    const incTool = tools.find(t => t.name === 'auditar_inconsistencias_cadastrais_financeiras');
    if (incTool && incTool.result?.inconsistencias) {
      const inc = incTool.result.inconsistencias;
      return {
        kpis: [
          { label: 'Ativos Sem Financeiro', value: inc.ativosSemFinanceiro?.qtd || 0, type: 'danger' },
          { label: 'Vencidos Como Ativos', value: inc.planosVencidosComoAtivos?.qtd || 0, type: 'warning' },
          { label: 'Nunca Agendaram', value: inc.ativosQueNuncaAgendaram?.qtd || 0, type: 'info' }
        ]
      };
    }

    return null;
  };

  // Salvar novo prompt
  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPromptText.trim()) return;

    try {
      const res = await fetch('/api/ai/executive/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: newTitle,
          descricao: newDesc,
          prompt: newPromptText,
          categoria: newCategory
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowNewPromptModal(false);
        setNewTitle('');
        setNewDesc('');
        setNewPromptText('');
        fetchPrompts();
      } else {
        alert('Erro ao salvar prompt: ' + data.error);
      }
    } catch (e: any) {
      alert('Erro: ' + e.message);
    }
  };

  // Excluir prompt salvo
  const handleDeletePrompt = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja excluir este prompt da sua biblioteca?')) return;
    try {
      const res = await fetch(`/api/ai/executive/prompts?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchPrompts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Exportar tabela para Excel
  const handleExportTableToXlsx = (title: string, dataRows: any[]) => {
    if (!dataRows || dataRows.length === 0) {
      alert('Não há dados para exportar.');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(dataRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dados');
    const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    XLSX.writeFile(wb, `${safeTitle}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredPrompts = savedPrompts.filter(p => {
    if (selectedCategory === 'todos') return true;
    return p.categoria === selectedCategory;
  });

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 70px)', background: '#0a0f1d', color: '#f8fafc', overflow: 'hidden' }}>
      
      {/* 1. BARRA LATERAL: PROMPT STUDIO DO SÁVIO */}
      <div style={{
        width: sidebarOpen ? '320px' : '0px',
        minWidth: sidebarOpen ? '320px' : '0px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        background: '#0d1527',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Topo da Sidebar */}
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-solid fa-wand-magic-sparkles" style={{ fontSize: '13px', color: '#fff' }}></i>
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.02em' }}>Prompt Studio</span>
            </div>
            <button
              onClick={() => setShowNewPromptModal(true)}
              style={{
                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                color: '#fff',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <i className="fa-solid fa-plus"></i> Novo
            </button>
          </div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
            Consultas estratégicas e rotinas de auditoria salvas para o Sávio.
          </p>

          {/* Filtro de Categorias */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
            {['todos', 'financeiro', 'retencao', 'inconsistencias', 'grade'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  background: selectedCategory === cat ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  color: selectedCategory === cat ? '#38bdf8' : '#94a3b8',
                  border: selectedCategory === cat ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  textTransform: 'capitalize'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Prompts Salvos */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredPrompts.map((p, idx) => (
            <div
              key={p._id || idx}
              onClick={() => handleSendMessage(p.prompt)}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '10px',
                padding: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(56, 189, 248, 0.06)';
                e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#e2e8f0' }}>{p.titulo}</span>
                {!p.isDefault && (
                  <button
                    onClick={(e) => handleDeletePrompt(p._id!, e)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', opacity: 0.6, cursor: 'pointer', fontSize: '0.7rem' }}
                    title="Excluir prompt"
                  >
                    <i className="fa-solid fa-trash"></i>
                  </button>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.3 }}>
                {p.descricao}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                <span style={{
                  fontSize: '0.65rem',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  color: '#c084fc',
                  fontWeight: 600
                }}>
                  {p.categoria}
                </span>
                <span style={{ fontSize: '0.68rem', color: '#38bdf8', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Executar <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.6rem' }}></i>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. ÁREA PRINCIPAL: CHAT EXECUTIVO & VISUALIZAÇÕES */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
        
        {/* Header Superior */}
        <div style={{
          height: '60px',
          background: '#0d1527',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={sidebarOpen ? 'Recolher Prompt Studio' : 'Expandir Prompt Studio'}
            >
              <i className={`fa-solid ${sidebarOpen ? 'fa-angles-left' : 'fa-angles-right'}`}></i>
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#f8fafc' }}>
                  Gabi Intelligence Studio
                </h2>
                <span style={{
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(139, 92, 246, 0.2))',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  color: '#c084fc',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase'
                }}>
                  Gestor Geral: Sávio
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>
                Auditoria de Dados · Detecção de Inconsistências · Tabelas & Gráficos
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => {
                setConversationId(null);
                setMessages([
                  {
                    role: 'model',
                    content: 'Nova sessão iniciada, Sávio. Em que análise posso te apoiar agora?',
                    timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }
                ]);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="fa-solid fa-arrows-rotate"></i> Limpar Sessão
            </button>
          </div>
        </div>

        {/* Mensagens & Visualizações */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  width: '100%'
                }}
              >
                <div style={{
                  maxWidth: isUser ? '80%' : '94%',
                  background: isUser ? 'linear-gradient(135deg, #0284c7, #2563eb)' : '#0d1527',
                  border: isUser ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  padding: '18px 22px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
                }}>
                  {/* Cabeçalho da mensagem */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      background: isUser ? 'rgba(255, 255, 255, 0.2)' : 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      color: '#fff'
                    }}>
                      <i className={`fa-solid ${isUser ? 'fa-user' : 'fa-brain'}`}></i>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: isUser ? '#fff' : '#38bdf8' }}>
                      {isUser ? 'Sávio Augusto Oliveira' : 'Gabi Intelligence'}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: isUser ? 'rgba(255,255,255,0.7)' : '#64748b', marginLeft: 'auto' }}>
                      {msg.timeStr}
                    </span>
                  </div>

                  {/* 1. CARDS DE KPIS (Se houver no metadata visual) */}
                  {msg.visualMetadata?.kpis && Array.isArray(msg.visualMetadata.kpis) && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                      {msg.visualMetadata.kpis.map((kpi: any, kIdx: number) => {
                        const colorMap: Record<string, string> = {
                          success: '#10b981',
                          danger: '#ef4444',
                          warning: '#f59e0b',
                          info: '#38bdf8'
                        };
                        const borderCol = colorMap[kpi.type] || '#38bdf8';
                        return (
                          <div key={kIdx} style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderLeft: `4px solid ${borderCol}`,
                            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '8px',
                            padding: '10px 14px'
                          }}>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>{kpi.label}</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: borderCol, marginTop: '2px' }}>{kpi.value}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. GRÁFICO INTERATIVO (Se houver no metadata visual) */}
                  {msg.visualMetadata?.chart && (
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '16px',
                      maxWidth: '650px'
                    }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' }}>
                        📊 {msg.visualMetadata.chart.title}
                      </div>
                      <div style={{ height: '220px', position: 'relative' }}>
                        {msg.visualMetadata.chart.type === 'doughnut' ? (
                          <Doughnut
                            data={{
                              labels: msg.visualMetadata.chart.labels,
                              datasets: [{
                                data: msg.visualMetadata.chart.data,
                                backgroundColor: ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'],
                                borderWidth: 0
                              }]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 11 } } }
                              }
                            }}
                          />
                        ) : (
                          <Bar
                            data={{
                              labels: msg.visualMetadata.chart.labels,
                              datasets: [{
                                label: 'Quantidade de Alunos',
                                data: msg.visualMetadata.chart.data,
                                backgroundColor: '#38bdf8',
                                borderRadius: 6
                              }]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: { display: false }
                              },
                              scales: {
                                x: { ticks: { color: '#94a3b8', font: { size: 11 } } },
                                y: { ticks: { color: '#94a3b8', font: { size: 11 } } }
                              }
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3. CONTEÚDO PRINCIPAL EM MARKDOWN */}
                  <div style={{
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                    color: isUser ? '#fff' : '#cbd5e1',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {msg.content.replace(/```json:visual[\s\S]*?```/, '').trim()}
                  </div>

                  {/* 4. TABELAS DE RESULTADOS DE FERRAMENTAS COM EXPORTAÇÃO XLSX */}
                  {!isUser && msg.executedTools && msg.executedTools.map((tool, tIdx) => {
                    const resultList = tool.result?.alunos || 
                                       tool.result?.inconsistencias?.ativosSemFinanceiro?.lista || 
                                       tool.result?.inconsistencias?.planosVencidosComoAtivos?.lista || 
                                       tool.result?.inconsistencias?.ativosQueNuncaAgendaram?.lista;

                    if (!Array.isArray(resultList) || resultList.length === 0) return null;

                    return (
                      <div key={tIdx} style={{
                        marginTop: '16px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '10px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          padding: '10px 14px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
                        }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8' }}>
                            <i className="fa-solid fa-table"></i> Tabela Analítica de Dados ({resultList.length} registros)
                          </span>
                          <button
                            onClick={() => handleExportTableToXlsx(tool.name, resultList)}
                            style={{
                              background: '#10b981',
                              color: '#fff',
                              border: 'none',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <i className="fa-solid fa-file-excel"></i> Baixar Excel (.xlsx)
                          </button>
                        </div>

                        {/* Prévia da Tabela */}
                        <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ background: 'rgba(0, 0, 0, 0.2)', color: '#94a3b8' }}>
                                <th style={{ padding: '8px 12px' }}>#</th>
                                <th style={{ padding: '8px 12px' }}>Nome</th>
                                <th style={{ padding: '8px 12px' }}>Plano</th>
                                <th style={{ padding: '8px 12px' }}>Vencimento / Início</th>
                                <th style={{ padding: '8px 12px' }}>Contato</th>
                              </tr>
                            </thead>
                            <tbody>
                              {resultList.slice(0, 20).map((row: any, rIdx: number) => (
                                <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                  <td style={{ padding: '8px 12px', color: '#64748b' }}>{rIdx + 1}</td>
                                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#f8fafc' }}>{row.nome}</td>
                                  <td style={{ padding: '8px 12px', color: '#cbd5e1' }}>{row.plano || row.duracao || '—'}</td>
                                  <td style={{ padding: '8px 12px', color: '#38bdf8' }}>{row.vencimento || row.dataInicio || '—'}</td>
                                  <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{row.telefone || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {resultList.length > 20 && (
                            <div style={{ padding: '8px 12px', textAlign: 'center', fontSize: '0.72rem', color: '#64748b' }}>
                              Exibindo 20 de {resultList.length} registros. Baixe a planilha Excel para a lista completa.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', color: '#38bdf8' }}>
              <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Gabi Intelligence cruzando dados no MongoDB...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Barra Inferior de Entrada */}
        <div style={{
          padding: '16px 20px',
          background: '#0d1527',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {/* Chips de Perguntas Rápidas */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '8px' }}>
            {[
              'Liste os próximos vencimentos dos próximos 30 dias',
              'Quais alunos são ativos e não estão no financeiro?',
              'Audite a agenda do Dr. Albert vs cancelamentos reais',
              'Quais alunos ativos nunca tiveram agendamento?'
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip)}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#cbd5e1',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
              >
                {chip}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder="Digite sua dúvida ou instrução analítica para a Gabi..."
              disabled={loading}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                padding: '12px 16px',
                color: '#f8fafc',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !input.trim()}
              style={{
                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                color: '#fff',
                border: 'none',
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !input.trim() ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem'
              }}
            >
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: SALVAR NOVO PROMPT */}
      {showNewPromptModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#0d1527',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                Salvar Prompt no Seu Studio
              </h3>
              <button
                onClick={() => setShowNewPromptModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1rem' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSavePrompt} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Título do Prompt</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Auditoria Semanal de Descontos"
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Categoria</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0a0f1d',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="financeiro">Financeiro & Vencimentos</option>
                  <option value="inconsistencias">Inconsistências & Lacunas</option>
                  <option value="retencao">Retenção & Churn</option>
                  <option value="grade">Grade & Ocupação</option>
                  <option value="auditoria">Auditoria Geral</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Descrição Curta</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Ex: Cruza frequência de alunos com descontos especiais"
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Texto Completo do Prompt (Instrução para a IA)</label>
                <textarea
                  required
                  rows={4}
                  value={newPromptText}
                  onChange={(e) => setNewPromptText(e.target.value)}
                  placeholder="Digite a ordem exata que a Gabi deve executar no banco..."
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewPromptModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#94a3b8',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Salvar Prompt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
