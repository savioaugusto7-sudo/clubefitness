'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// =========================================================================
// BANCO DE DADOS FICTÍCIO — ELENCO DA MÚSICA POPULAR BRASILEIRA (MPB)
// =========================================================================

interface MPBStudent {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  cpf: string;
  plano: string;
  freqSemanal: number;
  sexo: string;
  objetivo: string;
  restricoes: string;
  avaliador: string;
  profResponsavel: string;
  diasSemVir: number;
  ultimaAvaliacao: string;
  ultimoTesteForca: string;
  fimPlano: string;
  status: 'ativo' | 'vigente';
  wellnessScore: number;
  wellnessStatus: 'otimo' | 'moderado' | 'ruim' | 'critico';
  wellnessConduta: string;
  queixa: string;
}

const MPB_STUDENTS: MPBStudent[] = [
  {
    id: 'mpb-1',
    nome: 'Chico Buarque',
    telefone: '(11) 98765-4321',
    email: 'chico.buarque@mpb.com.br',
    cpf: '111.222.333-44',
    plano: 'Plano Físico Total 3x',
    freqSemanal: 3,
    sexo: 'M',
    objetivo: 'Fortalecimento muscular e melhora postural para composição musical',
    restricoes: 'Leve tendinite no manguito rotador direito',
    avaliador: 'Dr. Albert',
    profResponsavel: 'Prof. Gabriel',
    diasSemVir: 0, // Chegou hoje
    ultimaAvaliacao: '15/07/2026',
    ultimoTesteForca: '20/07/2026',
    fimPlano: '15/12/2026',
    status: 'ativo',
    wellnessScore: 18,
    wellnessStatus: 'moderado',
    wellnessConduta: 'Reduzir carga de ombro direito em 20% e focar em manguito',
    queixa: 'Dor pontual no ombro direito após tocar violão prolongadamente'
  },
  {
    id: 'mpb-2',
    nome: 'Elis Regina',
    telefone: '(11) 99888-7766',
    email: 'elis.regina@mpb.com.br',
    cpf: '222.333.444-55',
    plano: 'Plano Performance 4x',
    freqSemanal: 4,
    sexo: 'F',
    objetivo: 'Capacidade cardiorrespiratória e estabilidade de core',
    restricoes: 'Nenhuma restrição articular',
    avaliador: 'Dr. Guilherme',
    profResponsavel: 'Prof. Gabriel',
    diasSemVir: 1, // Treinou ontem
    ultimaAvaliacao: '10/08/2026',
    ultimoTesteForca: '12/08/2026',
    fimPlano: '10/02/2027',
    status: 'ativo',
    wellnessScore: 28,
    wellnessStatus: 'otimo',
    wellnessConduta: 'Prontidão excelente. Treino de força em progressão normal',
    queixa: 'Nenhuma queixa álgica'
  },
  {
    id: 'mpb-3',
    nome: 'Caetano Veloso',
    telefone: '(21) 97777-8899',
    email: 'caetano.veloso@mpb.com.br',
    cpf: '333.444.555-66',
    plano: 'Plano Fisioterapia & Longevidade 2x',
    freqSemanal: 2,
    sexo: 'M',
    objetivo: 'Mobilidade articular torácica e fortalecimento de lombar',
    restricoes: 'Desconforto lombar L4-L5 em flexão extrema',
    avaliador: 'Dr. Albert',
    profResponsavel: 'Prof. Gabriel',
    diasSemVir: 2,
    ultimaAvaliacao: '02/06/2026',
    ultimoTesteForca: '05/06/2026',
    fimPlano: '02/12/2026',
    status: 'ativo',
    wellnessScore: 22,
    wellnessStatus: 'moderado',
    wellnessConduta: 'Evitar sobrecarga axial e mobilizar cadeia posterior',
    queixa: 'Tensão lombar pós-viagem aérea'
  },
  {
    id: 'mpb-4',
    nome: 'Gilberto Gil',
    telefone: '(71) 96666-5544',
    email: 'gilberto.gil@mpb.com.br',
    cpf: '444.555.666-77',
    plano: 'Plano Personal & Fisio 3x',
    freqSemanal: 3,
    sexo: 'M',
    objetivo: 'Condicionamento global e equilíbrio neuromuscular',
    restricoes: 'Sensibilidade patelar em agachamentos profundos',
    avaliador: 'Dr. Guilherme',
    profResponsavel: 'Prof. Gabriel',
    diasSemVir: 3,
    ultimaAvaliacao: '20/07/2026',
    ultimoTesteForca: '22/07/2026',
    fimPlano: '20/01/2027',
    status: 'ativo',
    wellnessScore: 26,
    wellnessStatus: 'otimo',
    wellnessConduta: 'Aquecimento específico de joelho e treino progressivo',
    queixa: 'Leve rigidez matinal nos joelhos'
  },
  {
    id: 'mpb-5',
    nome: 'Milton Nascimento',
    telefone: '(31) 95555-4433',
    email: 'milton.nascimento@mpb.com.br',
    cpf: '555.666.777-88',
    plano: 'Plano Saúde Ativa 2x',
    freqSemanal: 2,
    sexo: 'M',
    objetivo: 'Mobilidade articular e prevenção de quedas',
    restricoes: 'Controle de esforço cardiovascular e respiração ritmada',
    avaliador: 'Dr. Albert',
    profResponsavel: 'Prof. Gabriel',
    diasSemVir: 15, // Ausente precisando de tratativa
    ultimaAvaliacao: '12/05/2026',
    ultimoTesteForca: '15/05/2026',
    fimPlano: '12/11/2026',
    status: 'ativo',
    wellnessScore: 20,
    wellnessStatus: 'moderado',
    wellnessConduta: 'Retorno gradual após período de ausência',
    queixa: 'Fadiga muscular em membros inferiores'
  },
  {
    id: 'mpb-6',
    nome: 'Rita Lee',
    telefone: '(11) 94444-3322',
    email: 'rita.lee@mpb.com.br',
    cpf: '666.777.888-99',
    plano: 'Plano Musculação Livre 3x',
    freqSemanal: 3,
    sexo: 'F',
    objetivo: 'Hipertrofia e densidade óssea com pesos livres',
    restricoes: 'Nenhuma restrição clínica',
    avaliador: 'Dr. Guilherme',
    profResponsavel: 'Prof. Gabriel',
    diasSemVir: 1,
    ultimaAvaliacao: '05/08/2026',
    ultimoTesteForca: '08/08/2026',
    fimPlano: '05/02/2027',
    status: 'ativo',
    wellnessScore: 29,
    wellnessStatus: 'otimo',
    wellnessConduta: 'Excelente estado para estímulo de hipertrofia',
    queixa: 'Nenhuma dor relatada'
  },
  {
    id: 'mpb-7',
    nome: 'Gal Costa',
    telefone: '(71) 93333-2211',
    email: 'gal.costa@mpb.com.br',
    cpf: '777.888.999-00',
    plano: 'Plano Pilates & Postura 2x',
    freqSemanal: 2,
    sexo: 'F',
    objetivo: 'Flexibilidade e alinhamento de coluna',
    restricoes: 'Tensão cervical em momentos de estresse',
    avaliador: 'Dr. Albert',
    profResponsavel: 'Prof. Gabriel',
    diasSemVir: 4,
    ultimaAvaliacao: '18/07/2026',
    ultimoTesteForca: '18/07/2026',
    fimPlano: '18/01/2027',
    status: 'ativo',
    wellnessScore: 24,
    wellnessStatus: 'otimo',
    wellnessConduta: 'Alongamento de cadeia anterior e descompressão cervical',
    queixa: 'Tensão no trapézio superior esquerdo'
  }
];

// =========================================================================
// MÓDULOS DE TREINAMENTO & DESAFIOS PEDAGÓGICOS
// =========================================================================

interface TrainingModule {
  id: number;
  title: string;
  badge: string;
  icon: string;
  summary: string;
  objectives: string[];
  spotlightTarget: string;
  requiredAction: string;
  faqError: {
    question: string;
    solution: string;
    actionTip: string;
  };
}

const MODULES: TrainingModule[] = [
  {
    id: 1,
    title: 'Cockpit do Resumo do Dia & Janela Ativa',
    badge: 'Módulo 1',
    icon: 'fa-clipboard-list',
    summary: 'Aprenda a operar o painel inicial de atendimentos de hoje, identificar alunos na janela de tempo atual e ler o questionário diário de Wellness.',
    objectives: [
      'Identificar o horário atual (Janela Ativa) e localizar o aluno que acabou de chegar.',
      'Clicar em [Ver] no Badge de Wellness para entender a conduta recomendada.',
      'Marcar a [Presença] do aluno Chico Buarque no horário das 08:00.',
      'Aprender a reverter o status caso tenha clicado em Falta por engano.'
    ],
    spotlightTarget: 'btn-presenca-chico',
    requiredAction: 'marcar_presenca_chico',
    faqError: {
      question: 'Marquei presença para o aluno errado ou cliquei em Falta sem querer. O que faço?',
      solution: 'No bloco de atendimentos de hoje, localize o aluno e clique no botão [Reverter Status]. O agendamento voltará instantaneamente para "Agendado", permitindo marcar a opção correta.',
      actionTip: 'No simulador, clique no botão "Reverter" para testar.'
    }
  },
  {
    id: 2,
    title: 'Agenda Completa & Gestão de Observações Clínicas',
    badge: 'Módulo 2',
    icon: 'fa-calendar-alt',
    summary: 'Domine a navegação na grade de horários, vagas da academia, consulta de histórico e lançamento de observações clínicas com timestamp.',
    objectives: [
      'Navegar até o menu [Agenda Completa] na barra lateral.',
      'Localizar o atendimento das 10:00 do aluno Caetano Veloso.',
      'Clicar no card do horário para abrir o Modal de Inspeção.',
      'Adicionar uma Observação Clínica sobre a conduta pós-sessão e clicar em [Salvar Observação].'
    ],
    spotlightTarget: 'slot-caetano',
    requiredAction: 'adicionar_obs_caetano',
    faqError: {
      question: 'Esqueci de salvar a observação clínica durante o atendimento. Como lançar depois?',
      solution: 'Abra a Agenda Completa, selecione a data do atendimento e clique no card do aluno. O bloco de observações permite digitar e salvar a qualquer momento, registrando automaticamente a data, hora e seu nome.',
      actionTip: 'As observações ficam salvas de forma perpétua no prontuário do aluno.'
    }
  },
  {
    id: 3,
    title: 'Agendamento Direto pelo Profissional',
    badge: 'Módulo 3',
    icon: 'fa-calendar-plus',
    summary: 'Aprenda a agendar um horário direto para um aluno, verificando disponibilidade de vagas em tempo real e validade do plano.',
    objectives: [
      'Acessar a aba [Agendar Aluno] no menu lateral.',
      'Buscar e selecionar o aluno Gilberto Gil.',
      'Escolher a modalidade Fisioterapia e a vaga das 14:00.',
      'Inserir a observação prévia e confirmar o agendamento.'
    ],
    spotlightTarget: 'btn-confirmar-agendamento',
    requiredAction: 'agendar_gilberto',
    faqError: {
      question: 'O que fazer se o horário desejado pelo aluno estiver com vagas esgotadas?',
      solution: 'O sistema bloqueia superlotação para preservar a qualidade do atendimento. Se for uma urgência clínica justificada, comunique a Recepção para remanejar outro horário ou cadastrar um encaixe excepcional.',
      actionTip: 'Sempre confira o saldo de créditos antes de concluir.'
    }
  },
  {
    id: 4,
    title: 'Clientes Vinculados & Prontuário Clínico 360°',
    badge: 'Módulo 4',
    icon: 'fa-user-friends',
    summary: 'Monitore os alertas de saúde da sua carteira de alunos (Avaliação Vencida, Teste de Força, Risco de Evasão) e consulte o prontuário completo.',
    objectives: [
      'Acessar a tela [Clientes Vinculados] no menu lateral.',
      'Identificar o card da aluna Elis Regina.',
      'Clicar em [Prontuário / Histórico] para abrir o histórico clínico.',
      'Visualizar os laudos de avaliação física e o histórico de Wellness.'
    ],
    spotlightTarget: 'btn-prontuario-elis',
    requiredAction: 'abrir_prontuario_elis',
    faqError: {
      question: 'O card do aluno está com a tag "Avaliação Vencida" em vermelho. Como proceder?',
      solution: 'Alunos com mais de 60 dias sem reavaliação física disparam esse alerta. Sugira ao aluno agendar uma nova avaliação para recalibrar as metas de composição corporal e cargas.',
      actionTip: 'O alerta muda para verde assim que a nova avaliação for registrada.'
    }
  },
  {
    id: 5,
    title: 'Fichas de Treino & Workout Builder',
    badge: 'Módulo 5',
    icon: 'fa-dumbbell',
    summary: 'Aprenda a prescrever treinos personalizados (Treino A, B, C, Livre), pesquisar no Banco de Exercícios por grupo muscular e definir cargas e séries.',
    objectives: [
      'Acessar [Fichas de Treino] no menu lateral.',
      'Localizar a aluna Rita Lee e clicar em [Abrir Ficha de Treino].',
      'Adicionar o exercício Supino Reto com 3 séries e 12 repetições no Treino A.',
      'Salvar a ficha de treino atualizada.'
    ],
    spotlightTarget: 'btn-salvar-treino',
    requiredAction: 'salvar_treino_rita',
    faqError: {
      question: 'Não encontrei um exercício específico no banco. O que fazer?',
      solution: 'Use a busca inteligente no Banco de Exercícios filtrando pelo grupo muscular principal. Caso precise de uma variação muito específica, você pode solicitar a inclusão ao Coordenador Técnico.',
      actionTip: 'Você também pode usar o campo "Observações do Exercício" para instruir a execução.'
    }
  },
  {
    id: 6,
    title: 'Central de Retenção & Registro de Tratativas',
    badge: 'Módulo 6',
    icon: 'fa-heart-circle-check',
    summary: 'Aprenda a prevenir o abandono de treinos: identifique alunos ausentes há mais de 7 dias e registre justificativas na esteira de retenção.',
    objectives: [
      'Acessar o [Resumo do Dia] e rolar até a seção Central de Retenção Semanal.',
      'Identificar o aluno Milton Nascimento (15 dias sem treinar).',
      'Clicar em [Registrar Tratativa].',
      'Selecionar o motivo "Em viagem / Férias justificadas", preencher a observação e salvar.'
    ],
    spotlightTarget: 'btn-tratar-milton',
    requiredAction: 'tratar_milton',
    faqError: {
      question: 'Por que é importante registrar a tratativa no sistema?',
      solution: 'Ao registrar a tratativa, toda a equipe (professores, recepção e gestão) fica ciente de que o aluno já foi abordado, evitando mensagens repetitivas no WhatsApp e organizando o fluxo de retorno do aluno.',
      actionTip: 'O card do aluno passa a exibir a tag azul "✓ Tratado".'
    }
  }
];

export default function TreinamentoProfissionalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Controle de Módulo e Missões
  const [currentModuleId, setCurrentModuleId] = useState<number>(1);
  const [completedModules, setCompletedModules] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCertificate, setShowCertificate] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);

  // Estados do Simulador Sandbox (100% Isolado em memória)
  const [simActiveTab, setSimActiveTab] = useState<'resumo_dia' | 'dashboard' | 'agendamento_prof' | 'clientes' | 'treinos_prof'>('resumo_dia');
  const [simPresencas, setSimPresencas] = useState<Record<string, 'presenca' | 'falta' | 'agendado'>>({});
  const [simObservacoes, setSimObservacoes] = useState<Record<string, string>>({
    'mpb-3': 'Aluno relatou que viajará no fim de semana. Foco em alívio lombar.'
  });
  const [simTratativas, setSimTratativas] = useState<Record<string, { motivo: string; obs: string }>>({});
  
  // Modais do Simulador
  const [inspectModalApt, setInspectModalApt] = useState<any | null>(null);
  const [inspectObsInput, setInspectObsInput] = useState('');
  const [showWellnessModal, setShowWellnessModal] = useState<MPBStudent | null>(null);
  const [showProntuarioModal, setShowProntuarioModal] = useState<MPBStudent | null>(null);
  const [showWorkoutModal, setShowWorkoutModal] = useState<MPBStudent | null>(null);
  const [showTratativaModal, setShowTratativaModal] = useState<MPBStudent | null>(null);
  const [tratativaMotivoInput, setTratativaMotivoInput] = useState('Em viagem / Férias justificadas');
  const [tratativaObsInput, setTratativaObsInput] = useState('');

  // Agendamento manual simulado
  const [agendamentoAlunoId, setAgendamentoAlunoId] = useState('mpb-4');
  const [agendamentoServico, setAgendamentoServico] = useState('Fisioterapia');
  const [agendamentoHorario, setAgendamentoHorario] = useState('14:00');
  const [agendamentoObs, setAgendamentoObs] = useState('');

  // Proteção de Acesso: apenas admin na Fase 1
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Carregar progresso do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cf_training_completed_modules');
      if (saved) setCompletedModules(JSON.parse(saved));
    } catch {}
  }, []);

  const triggerToast = (message: string, type: 'success' | 'warning' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const markModuleCompleted = (modId: number) => {
    if (!completedModules.includes(modId)) {
      const updated = [...completedModules, modId];
      setCompletedModules(updated);
      try {
        localStorage.setItem('cf_training_completed_modules', JSON.stringify(updated));
      } catch {}
      triggerToast(`🎉 Parabéns! Você concluiu o ${MODULES.find(m => m.id === modId)?.title}!`, 'success');
      if (modId < MODULES.length) {
        setCurrentModuleId(modId + 1);
      } else {
        setShowCertificate(true);
      }
    }
  };

  const currentModule = MODULES.find(m => m.id === currentModuleId) || MODULES[0];
  const progressPercent = Math.round((completedModules.length / MODULES.length) * 100);

  return (
    <div style={{ minHeight: '100vh', background: '#090d16', color: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* ========================================================================= */}
      {/* HEADER SUPERIOR: IDENTIFICAÇÃO & BARRA DE PROGRESSO                       */}
      {/* ========================================================================= */}
      <header style={{
        background: 'rgba(15, 23, 42, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '14px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backdropFilter: 'blur(12px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/dashboard" style={{
            background: 'rgba(255,255,255,0.06)',
            color: '#94a3b8',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '6px 12px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '0.8rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <i className="fa-solid fa-arrow-left"></i> Voltar ao Dashboard
          </Link>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: 'linear-gradient(135deg, #00f2fe, #4facfe)', color: '#0f172a', fontWeight: 900, fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                Ambiente de Treinamento
              </span>
              <span style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)', fontWeight: 800, fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px' }}>
                🔒 Modo Sandbox Isolado
              </span>
            </div>
            <h1 style={{ margin: '4px 0 0', fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
              🎓 Guia Prático & Simulador 360° do Profissional
            </h1>
          </div>
        </div>

        {/* Barra de Progresso & Botão Certificado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ minWidth: '200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 800, marginBottom: '4px' }}>
              <span style={{ color: '#94a3b8' }}>Progresso da Capacitação</span>
              <span style={{ color: progressPercent === 100 ? '#10b981' : '#00f2fe' }}>{progressPercent}% Concluído</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: progressPercent === 100 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #00f2fe, #4facfe)',
                borderRadius: '4px',
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>

          {progressPercent === 100 && (
            <button
              type="button"
              onClick={() => setShowCertificate(true)}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              <i className="fa-solid fa-award"></i> Ver Certificado
            </button>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* TOAST DE FEEDBACK DE AÇÕES                                                */}
      {/* ========================================================================= */}
      {feedbackToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: feedbackToast.type === 'success' ? '#065f46' : '#92400e',
          color: '#fff',
          border: `1px solid ${feedbackToast.type === 'success' ? '#10b981' : '#f59e0b'}`,
          borderRadius: '12px',
          padding: '14px 20px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          zIndex: 9999,
          fontSize: '0.88rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <i className={feedbackToast.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'} style={{ fontSize: '1.2rem' }}></i>
          {feedbackToast.message}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONTAINER PRINCIPAL SPLIT-SCREEN                                         */}
      {/* ========================================================================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(360px, 440px) 1fr',
        gap: '0',
        minHeight: 'calc(100vh - 70px)'
      }}>

        {/* ======================================================================= */}
        {/* COLUNA ESQUERDA: GUIA PEDAGÓGICO, TUTOR & MISSÕES                       */}
        {/* ======================================================================= */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 70px)'
        }}>

          {/* Busca Inteligente Instantânea */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
              🔍 O que você precisa fazer no sistema?
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ex: marcar presença, adicionar observação, wellness..."
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: '0.84rem'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '10px', top: '10px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              )}
            </div>
          </div>

          {/* Seletor Rápido de Módulos */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
                Módulos do Treinamento
              </span>
              <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>
                {completedModules.length} de {MODULES.length} concluídos
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {MODULES.map(m => {
                const isCurrent = m.id === currentModuleId;
                const isDone = completedModules.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setCurrentModuleId(m.id);
                      if (m.id === 1 || m.id === 6) setSimActiveTab('resumo_dia');
                      else if (m.id === 2) setSimActiveTab('dashboard');
                      else if (m.id === 3) setSimActiveTab('agendamento_prof');
                      else if (m.id === 4) setSimActiveTab('clientes');
                      else if (m.id === 5) setSimActiveTab('treinos_prof');
                    }}
                    style={{
                      background: isCurrent ? 'rgba(0, 242, 254, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${isCurrent ? '#00f2fe' : isDone ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.06)'}`,
                      borderRadius: '8px',
                      padding: '8px 10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <i className={`fa-solid ${m.icon}`} style={{ color: isDone ? '#10b981' : isCurrent ? '#00f2fe' : '#64748b', fontSize: '0.85rem' }}></i>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: isCurrent ? '#fff' : '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.title}
                      </div>
                    </div>
                    {isDone && <i className="fa-solid fa-circle-check" style={{ color: '#10b981', fontSize: '0.75rem' }}></i>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cartão de Missão do Módulo Atual */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))',
            border: '1px solid rgba(0, 242, 254, 0.3)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span style={{ background: 'rgba(0, 242, 254, 0.15)', color: '#00f2fe', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                {currentModule.badge}
              </span>
              {completedModules.includes(currentModule.id) ? (
                <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                  <i className="fa-solid fa-check"></i> Concluído
                </span>
              ) : (
                <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                  <i className="fa-solid fa-play"></i> Em Andamento
                </span>
              )}
            </div>

            <h2 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
              {currentModule.title}
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: '#94a3b8', lineHeight: '1.45' }}>
              {currentModule.summary}
            </p>

            {/* Objetivos da Missão */}
            <div style={{ background: 'rgba(0, 0, 0, 0.25)', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <strong style={{ display: 'block', fontSize: '0.76rem', color: '#38bdf8', textTransform: 'uppercase', marginBottom: '8px' }}>
                🎯 Passo a Passo do Treinamento:
              </strong>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                {currentModule.objectives.map((obj, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{obj}</li>
                ))}
              </ul>
            </div>

            {/* Botão de Concluir Módulo */}
            <button
              type="button"
              onClick={() => markModuleCompleted(currentModule.id)}
              style={{
                width: '100%',
                background: completedModules.includes(currentModule.id) ? 'rgba(16, 185, 129, 0.15)' : 'linear-gradient(135deg, #00f2fe, #4facfe)',
                color: completedModules.includes(currentModule.id) ? '#10b981' : '#0f172a',
                border: completedModules.includes(currentModule.id) ? '1px solid #10b981' : 'none',
                padding: '10px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <i className={completedModules.includes(currentModule.id) ? 'fa-solid fa-check-double' : 'fa-solid fa-flag-checkered'}></i>
              {completedModules.includes(currentModule.id) ? 'Módulo Concluído (Clique para Avançar)' : 'Praticar no Simulador & Concluir'}
            </button>
          </div>

          {/* Seção "O Que Fazer Se Eu Errar?" */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.04)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '14px',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 800, fontSize: '0.84rem', marginBottom: '8px' }}>
              <i className="fa-solid fa-life-ring"></i>
              <span>O que fazer se eu errar nesta etapa?</span>
            </div>
            <strong style={{ display: 'block', fontSize: '0.8rem', color: '#fff', marginBottom: '4px' }}>
              ❓ {currentModule.faqError.question}
            </strong>
            <p style={{ margin: '0 0 8px', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.4' }}>
              👉 {currentModule.faqError.solution}
            </p>
            <div style={{ fontSize: '0.74rem', color: '#38bdf8', fontStyle: 'italic' }}>
              💡 {currentModule.faqError.actionTip}
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* COLUNA DIREITA: SIMULADOR SANDBOX DO CLUBE FITNESS                      */}
        {/* ======================================================================= */}
        <div style={{
          padding: '24px',
          background: '#090d16',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 70px)'
        }}>

          {/* Banner do Simulador */}
          <div style={{
            background: 'rgba(0, 242, 254, 0.05)',
            border: '1px dashed rgba(0, 242, 254, 0.3)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-flask" style={{ color: '#00f2fe', fontSize: '1.2rem' }}></i>
              <div>
                <strong style={{ fontSize: '0.85rem', color: '#fff' }}>Simulador Sandbox do Sistema Real</strong>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                  Todos os alunos fictícios são nomes da <strong>MPB</strong>. Sinta-se livre para clicar, testar botões e preencher observações!
                </div>
              </div>
            </div>

            {/* Menu de Abas Simuladas */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              {[
                { id: 'resumo_dia', label: 'Resumo do Dia', icon: 'fa-clipboard-list' },
                { id: 'dashboard', label: 'Agenda Completa', icon: 'fa-calendar-alt' },
                { id: 'agendamento_prof', label: 'Agendar Aluno', icon: 'fa-calendar-plus' },
                { id: 'clientes', label: 'Clientes', icon: 'fa-user-friends' },
                { id: 'treinos_prof', label: 'Fichas de Treino', icon: 'fa-dumbbell' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSimActiveTab(tab.id as any)}
                  style={{
                    background: simActiveTab === tab.id ? '#00f2fe' : 'transparent',
                    color: simActiveTab === tab.id ? '#0f172a' : '#94a3b8',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 750,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <i className={`fa-solid ${tab.icon}`}></i> {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ===================================================================== */}
          {/* SIMULADOR ABA 1: RESUMO DO DIA                                        */}
          {/* ===================================================================== */}
          {simActiveTab === 'resumo_dia' && (
            <div>
              {/* Contadores de Topo */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Atendimentos Hoje</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>7 Alunos</div>
                </div>
                <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Academia</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>5 Treinos</div>
                </div>
                <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Consultório</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>2 Sessões</div>
                </div>
                <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Janela Ativa</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#facc15', marginTop: '2px' }}>08:00 (Agora)</div>
                </div>
              </div>

              {/* Janela Ativa de Horário (Destaque) */}
              <div style={{
                background: 'rgba(99, 102, 241, 0.04)',
                border: '2px solid #6366f1',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '24px',
                boxShadow: '0 0 20px rgba(99, 102, 241, 0.15)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-circle-play"></i> ⭐ ATENDIMENTOS NO HORÁRIO ATUAL (08:00)
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
                      Alunos agendados para este momento. Sinalize a presença assim que o aluno comparecer.
                    </p>
                  </div>
                </div>

                {/* Card de Chico Buarque no Horário Atual */}
                {(() => {
                  const chico = MPB_STUDENTS[0];
                  const chicoStatus = simPresencas['mpb-1'] || 'agendado';
                  return (
                    <div style={{
                      background: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>08:00</span>
                          <h4 style={{ margin: '2px 0', fontSize: '1rem', fontWeight: 800, color: '#fff' }}>{chico.nome}</h4>
                          <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                            {chico.plano}
                          </span>
                        </div>
                        <div>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            background: chicoStatus === 'presenca' ? 'rgba(16, 185, 129, 0.2)' : chicoStatus === 'falta' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: chicoStatus === 'presenca' ? '#10b981' : chicoStatus === 'falta' ? '#ef4444' : '#f59e0b'
                          }}>
                            {chicoStatus === 'presenca' ? 'Presença Confirmada' : chicoStatus === 'falta' ? 'Falta Registrada' : 'Aguardando Aluno'}
                          </span>
                        </div>
                      </div>

                      {/* Badge Wellness do Dia */}
                      <div style={{
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        marginBottom: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#f59e0b' }}>
                            🧘 Wellness do Dia: {chico.wellnessScore}/30 • {chico.wellnessStatus.toUpperCase()}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '2px' }}>
                            👉 {chico.wellnessConduta}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowWellnessModal(chico)}
                          style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#fff',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            fontWeight: 700
                          }}
                        >
                          Ver Detalhes
                        </button>
                      </div>

                      {/* Botões de Ação */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSimPresencas(prev => ({ ...prev, 'mpb-1': 'presenca' }));
                            triggerToast('✅ Presença de Chico Buarque registrada com sucesso!');
                          }}
                          style={{
                            flex: 1,
                            background: '#10b981',
                            color: '#fff',
                            border: 'none',
                            padding: '8px',
                            borderRadius: '8px',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          <i className="fa-solid fa-check"></i> Presença
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSimPresencas(prev => ({ ...prev, 'mpb-1': 'falta' }));
                            triggerToast('⚠️ Falta registrada para Chico Buarque.', 'warning');
                          }}
                          style={{
                            flex: 1,
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            padding: '8px',
                            borderRadius: '8px',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          <i className="fa-solid fa-xmark"></i> Falta
                        </button>

                        {chicoStatus !== 'agendado' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSimPresencas(prev => ({ ...prev, 'mpb-1': 'agendado' }));
                              triggerToast('🔄 Status de Chico Buarque revertido para Agendado.');
                            }}
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              color: '#cbd5e1',
                              border: '1px solid rgba(255,255,255,0.15)',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              cursor: 'pointer'
                            }}
                          >
                            <i className="fa-solid fa-rotate-left"></i> Reverter
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setShowWorkoutModal(chico)}
                          style={{
                            background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                            color: '#0f172a',
                            border: 'none',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          <i className="fa-solid fa-dumbbell"></i> Abrir Ficha de Treino
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Central de Retenção Semanal (Milton Nascimento) */}
              <div style={{
                background: '#111827',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '20px'
              }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-heart-circle-check"></i> Central de Retenção & Alunos Ausentes
                </h3>

                {(() => {
                  const milton = MPB_STUDENTS[4];
                  const isTratado = Boolean(simTratativas['mpb-5']);
                  return (
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.04)',
                      border: '1px solid rgba(245, 158, 11, 0.2)',
                      borderRadius: '10px',
                      padding: '14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '0.95rem', color: '#fff' }}>{milton.nome}</strong>
                          <span style={{
                            background: isTratado ? 'rgba(56, 189, 248, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isTratado ? '#38bdf8' : '#ef4444',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.72rem',
                            fontWeight: 800
                          }}>
                            {isTratado ? `Tratado (${simTratativas['mpb-5'].motivo})` : 'Pendente de Tratativa (15 dias sem vir)'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px' }}>
                          Contratou <strong style={{ color: '#fde047' }}>2x/sem</strong> • Fez <strong style={{ color: '#10b981' }}>0</strong> • Restam <strong style={{ color: '#ef4444' }}>2 pendentes</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowTratativaModal(milton)}
                        style={{
                          background: isTratado ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.06)',
                          color: isTratado ? '#38bdf8' : '#fff',
                          border: `1px solid ${isTratado ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255,255,255,0.15)'}`,
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontWeight: 750,
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                      >
                        <i className={isTratado ? 'fa-solid fa-pen' : 'fa-solid fa-pen-to-square'}></i> {isTratado ? 'Editar Tratativa' : 'Registrar Tratativa'}
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* SIMULADOR ABA 2: AGENDA COMPLETA                                      */}
          {/* ===================================================================== */}
          {simActiveTab === 'dashboard' && (
            <div>
              {/* Barra de Data e Abas de Local */}
              <div style={{
                background: '#111827',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: '14px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button type="button" style={{ background: '#00f2fe', color: '#0f172a', border: 'none', padding: '6px 14px', borderRadius: '8px', fontWeight: 800, fontSize: '0.78rem' }}>
                    Academia
                  </button>
                  <button type="button" style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem' }}>
                    Consultório
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>
                    📅 28/08/2026 (Sexta-feira)
                  </span>
                  <button type="button" style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700 }}>
                    Hoje
                  </button>
                </div>
              </div>

              {/* Grade de Horários Simulada */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Slot 08:00 - Chico Buarque */}
                <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#00f2fe' }}>⏰ 08:00</strong>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Vagas: 1/4 Ocupadas</span>
                  </div>
                  <div
                    onClick={() => {
                      const chico = MPB_STUDENTS[0];
                      setInspectModalApt(chico);
                      setInspectObsInput(simObservacoes['mpb-1'] || '');
                    }}
                    style={{
                      background: 'rgba(16, 185, 129, 0.04)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: '#fff' }}>Chico Buarque</strong>
                      <span style={{ marginLeft: '8px', fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        Treino Monitorado
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      <i className="fa-solid fa-eye"></i> Inspecionar
                    </span>
                  </div>
                </div>

                {/* Slot 10:00 - Caetano Veloso */}
                <div style={{ background: '#111827', border: '1.5px solid #00f2fe', borderRadius: '12px', padding: '14px', boxShadow: '0 0 15px rgba(0,242,254,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#00f2fe' }}>⏰ 10:00 (Objetivo da Missão)</strong>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Vagas: 1/4 Ocupadas</span>
                  </div>
                  <div
                    onClick={() => {
                      const caetano = MPB_STUDENTS[2];
                      setInspectModalApt(caetano);
                      setInspectObsInput(simObservacoes['mpb-3'] || '');
                    }}
                    style={{
                      background: 'rgba(56, 189, 248, 0.06)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '0.95rem', color: '#fff' }}>Caetano Veloso</strong>
                        <span style={{ fontSize: '0.7rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          Fisioterapia
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#f59e0b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <i className="fa-solid fa-note-sticky"></i>
                        <span>{simObservacoes['mpb-3'] ? `Obs: ${simObservacoes['mpb-3']}` : 'Sem observação'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      style={{
                        background: '#00f2fe',
                        color: '#0f172a',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontWeight: 800,
                        fontSize: '0.76rem',
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fa-solid fa-pen-to-square"></i> Abrir & Editar Obs
                    </button>
                  </div>
                </div>

                {/* Slot 14:00 - Elis Regina */}
                <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#00f2fe' }}>⏰ 14:00</strong>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Vagas: 1/4 Ocupadas</span>
                  </div>
                  <div
                    onClick={() => {
                      const elis = MPB_STUDENTS[1];
                      setInspectModalApt(elis);
                      setInspectObsInput(simObservacoes['mpb-2'] || '');
                    }}
                    style={{
                      background: 'rgba(168, 85, 247, 0.04)',
                      border: '1px solid rgba(168, 85, 247, 0.2)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: '#fff' }}>Elis Regina</strong>
                      <span style={{ marginLeft: '8px', fontSize: '0.7rem', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        Avaliação Física
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      <i className="fa-solid fa-eye"></i> Inspecionar
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* SIMULADOR ABA 3: AGENDAMENTO DIRETO                                   */}
          {/* ===================================================================== */}
          {simActiveTab === 'agendamento_prof' && (
            <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-calendar-plus" style={{ color: '#00f2fe' }}></i>
                Novo Agendamento Direto pelo Profissional
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
                    Selecione o Aluno:
                  </label>
                  <select
                    value={agendamentoAlunoId}
                    onChange={(e) => setAgendamentoAlunoId(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                  >
                    {MPB_STUDENTS.map(s => (
                      <option key={s.id} value={s.id}>{s.nome} — {s.plano}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
                      Modalidade / Serviço:
                    </label>
                    <select
                      value={agendamentoServico}
                      onChange={(e) => setAgendamentoServico(e.target.value)}
                      style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                    >
                      <option value="Fisioterapia">Fisioterapia</option>
                      <option value="Treino Monitorado">Treino Monitorado</option>
                      <option value="Quiropraxia">Quiropraxia</option>
                      <option value="Avaliação Física">Avaliação Física</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
                      Horário Disponível:
                    </label>
                    <select
                      value={agendamentoHorario}
                      onChange={(e) => setAgendamentoHorario(e.target.value)}
                      style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                    >
                      <option value="14:00">14:00 (3 vagas livres)</option>
                      <option value="15:00">15:00 (2 vagas livres)</option>
                      <option value="16:00">16:00 (4 vagas livres)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
                    Observação Prévia do Atendimento:
                  </label>
                  <textarea
                    value={agendamentoObs}
                    onChange={(e) => setAgendamentoObs(e.target.value)}
                    placeholder="Ex: Primeira sessão pós-turnê..."
                    rows={3}
                    style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', resize: 'vertical' }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const aluno = MPB_STUDENTS.find(s => s.id === agendamentoAlunoId);
                    triggerToast(`✅ Agendamento de ${aluno?.nome} confirmado para as ${agendamentoHorario}!`);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#fff',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fa-solid fa-calendar-check"></i> Confirmar Agendamento
                </button>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* SIMULADOR ABA 4: CLIENTES VINCULADOS & PRONTUÁRIO                     */}
          {/* ===================================================================== */}
          {simActiveTab === 'clientes' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                {MPB_STUDENTS.map(student => (
                  <div
                    key={student.id}
                    style={{
                      background: '#111827',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '14px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#fff' }}>{student.nome}</h4>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{student.telefone} • {student.freqSemanal}x/sem</span>
                        </div>
                        <span style={{
                          background: student.diasSemVir <= 7 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: student.diasSemVir <= 7 ? '#10b981' : '#ef4444',
                          padding: '2px 8px',
                          borderRadius: '8px',
                          fontSize: '0.7rem',
                          fontWeight: 800
                        }}>
                          {student.diasSemVir <= 7 ? 'Ativo' : 'Risco'}
                        </span>
                      </div>

                      {/* Indicadores de Saúde */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '10px' }}>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>
                          <span style={{ color: '#94a3b8' }}>Avaliação Física:</span>
                          <strong style={{ display: 'block', color: '#38bdf8' }}>{student.ultimaAvaliacao}</strong>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>
                          <span style={{ color: '#94a3b8' }}>Teste de Força:</span>
                          <strong style={{ display: 'block', color: '#10b981' }}>{student.ultimoTesteForca}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setShowProntuarioModal(student)}
                        style={{
                          flex: 1,
                          background: 'rgba(0, 242, 254, 0.12)',
                          color: '#00f2fe',
                          border: '1px solid rgba(0, 242, 254, 0.3)',
                          padding: '6px',
                          borderRadius: '8px',
                          fontWeight: 750,
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                      >
                        <i className="fa-solid fa-address-card"></i> Prontuário
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowWorkoutModal(student)}
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.15)',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                      >
                        <i className="fa-solid fa-dumbbell"></i> Treino
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* SIMULADOR ABA 5: FICHAS DE TREINO                                     */}
          {/* ===================================================================== */}
          {simActiveTab === 'treinos_prof' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                {MPB_STUDENTS.map(student => (
                  <div
                    key={student.id}
                    style={{
                      background: '#111827',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '14px',
                      padding: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#fff' }}>{student.nome}</h4>
                        <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{student.plano}</span>
                      </div>
                      <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>
                        Ficha Ativa
                      </span>
                    </div>

                    <p style={{ fontSize: '0.76rem', color: '#cbd5e1', margin: '0 0 12px' }}>
                      <strong>Objetivo:</strong> {student.objetivo}
                    </p>

                    <button
                      type="button"
                      onClick={() => setShowWorkoutModal(student)}
                      style={{
                        width: '100%',
                        background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                        color: '#0f172a',
                        border: 'none',
                        padding: '8px',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      <i className="fa-solid fa-dumbbell"></i> Abrir Workout Builder
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL SIMULADO 1: INSPEÇÃO DE AGENDAMENTO & OBSERVAÇÃO CLÍNICA            */}
      {/* ========================================================================= */}
      {inspectModalApt && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9000,
          backdropFilter: 'blur(6px)',
          padding: '16px'
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(0, 242, 254, 0.3)',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-address-card"></i> Detalhes do Atendimento
              </h3>
              <button
                type="button"
                onClick={() => setInspectModalApt(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#fff' }}>{inspectModalApt.nome}</div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px' }}>
                  {inspectModalApt.telefone} • {inspectModalApt.plano}
                </div>
              </div>

              {/* Bloco de Gestão de Observações Clínicas */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#f59e0b', marginBottom: '6px' }}>
                  <i className="fa-solid fa-note-sticky"></i> Observação Clínica do Atendimento:
                </label>
                <textarea
                  value={inspectObsInput}
                  onChange={(e) => setInspectObsInput(e.target.value)}
                  placeholder="Digite as anotações sobre o estado do aluno, condutas e feedback..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    resize: 'vertical'
                  }}
                />
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>
                  🕒 Será gravado com timestamp automático e assinatura do profissional.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setInspectModalApt(null)}
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Fechar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSimObservacoes(prev => ({ ...prev, [inspectModalApt.id]: inspectObsInput }));
                    setInspectModalApt(null);
                    triggerToast(`✅ Observação clínica de ${inspectModalApt.nome} gravada com sucesso!`);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fa-solid fa-floppy-disk"></i> Salvar Observação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL SIMULADO 2: WELLNESS DIÁRIO                                         */}
      {/* ========================================================================= */}
      {showWellnessModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9000,
          backdropFilter: 'blur(6px)',
          padding: '16px'
        }}>
          <div style={{ background: '#1e293b', border: '1px solid #6366f1', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 800, color: '#818cf8' }}>
              🧘 Questionário de Wellness — {showWellnessModal.nome}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem', color: '#cbd5e1' }}>
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '8px' }}>
                <strong>Score de Prontidão:</strong> <span style={{ color: '#facc15' }}>{showWellnessModal.wellnessScore}/30</span>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '8px' }}>
                <strong>Queixa Reportada:</strong> <span>{showWellnessModal.queixa}</span>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '8px' }}>
                <strong>Conduta Técnica Recomendada:</strong> <span style={{ color: '#38bdf8' }}>{showWellnessModal.wellnessConduta}</span>
              </div>
            </div>

            <div style={{ marginTop: '16px', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setShowWellnessModal(null)}
                style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL SIMULADO 3: PRONTUÁRIO CLÍNICO 360°                                 */}
      {/* ========================================================================= */}
      {showProntuarioModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9000,
          backdropFilter: 'blur(6px)',
          padding: '16px'
        }}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(0,242,254,0.3)', borderRadius: '16px', maxWidth: '640px', width: '100%', padding: '24px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#00f2fe' }}>
                📋 Prontuário Clínico — {showProntuarioModal.nome}
              </h3>
              <button type="button" onClick={() => setShowProntuarioModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>&times;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px' }}>
                <strong style={{ color: '#38bdf8', fontSize: '0.85rem' }}>Anamnese & Histórico Clínico:</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#cbd5e1' }}>{showProntuarioModal.objetivo}</p>
                <div style={{ fontSize: '0.76rem', color: '#f59e0b', marginTop: '6px' }}>
                  ⚠️ Restrição: {showProntuarioModal.restricoes}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px' }}>
                <strong style={{ color: '#10b981', fontSize: '0.85rem' }}>Última Avaliação Física ({showProntuarioModal.ultimaAvaliacao}):</strong>
                <div style={{ display: 'flex', gap: '14px', marginTop: '6px', fontSize: '0.78rem', color: '#cbd5e1' }}>
                  <span>Gordura: 16.4%</span>
                  <span>Massa Magra: 58.2kg</span>
                  <span>IMC: 22.8</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => triggerToast(`📄 Laudo PDF de ${showProntuarioModal.nome} gerado com sucesso!`)}
                style={{
                  background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                  color: '#0f172a',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                <i className="fa-solid fa-file-pdf"></i> Visualizar Laudo Completo em PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL SIMULADO 4: WORKOUT BUILDER                                         */}
      {/* ========================================================================= */}
      {showWorkoutModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9000,
          backdropFilter: 'blur(6px)',
          padding: '16px'
        }}>
          <div style={{ background: '#1e293b', border: '1px solid #00f2fe', borderRadius: '16px', maxWidth: '580px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#00f2fe' }}>
                🏋️ Workout Builder — {showWorkoutModal.nome}
              </h3>
              <button type="button" onClick={() => setShowWorkoutModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>&times;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px' }}>
                <strong style={{ fontSize: '0.85rem', color: '#38bdf8' }}>Treino A — Peito & Tríceps</strong>
                <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                  • <strong>Supino Reto com Barra:</strong> 3 séries × 12 reps (Descanso 60s)<br/>
                  • <strong>Puxada Alta no Pulley:</strong> 3 séries × 12 reps (Descanso 60s)<br/>
                  • <strong>Tríceps Corda:</strong> 3 séries × 15 reps
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowWorkoutModal(null);
                  triggerToast(`✅ Ficha de treino de ${showWorkoutModal.nome} atualizada e salva por 60 dias!`);
                }}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                <i className="fa-solid fa-floppy-disk"></i> Salvar e Publicar Ficha de Treino
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL SIMULADO 5: REGISTRAR TRATATIVA DE RETENÇÃO                         */}
      {/* ========================================================================= */}
      {showTratativaModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9000,
          backdropFilter: 'blur(6px)',
          padding: '16px'
        }}>
          <div style={{ background: '#1e293b', border: '1px solid #f59e0b', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', fontWeight: 800, color: '#f59e0b' }}>
              📝 Registrar Tratativa de Retenção — {showTratativaModal.nome}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
                  Motivo da Ausência / Desfecho:
                </label>
                <select
                  value={tratativaMotivoInput}
                  onChange={(e) => setTratativaMotivoInput(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem' }}
                >
                  <option value="Em viagem / Férias justificadas">Em viagem / Férias justificadas</option>
                  <option value="Agendou reposição de treino">Agendou reposição de treino</option>
                  <option value="Atestado médico / Afastamento clínico">Atestado médico / Afastamento clínico</option>
                  <option value="Reagendará na próxima semana">Reagendará na próxima semana</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
                  Observações Clínicas / Detalhes:
                </label>
                <textarea
                  value={tratativaObsInput}
                  onChange={(e) => setTratativaObsInput(e.target.value)}
                  placeholder="Ex: Aluno em turnê em Minas Gerais, retorna na segunda..."
                  rows={3}
                  style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowTratativaModal(null)}
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimTratativas(prev => ({
                      ...prev,
                      [showTratativaModal.id]: { motivo: tratativaMotivoInput, obs: tratativaObsInput }
                    }));
                    setShowTratativaModal(null);
                    triggerToast(`✅ Tratativa de ${showTratativaModal.nome} registrada com sucesso!`);
                  }}
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Salvar Tratativa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CERTIFICADO DE CAPACITAÇÃO DIGITAL                               */}
      {/* ========================================================================= */}
      {showCertificate && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(8px)',
          padding: '16px'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #0f172a, #1e293b)',
            border: '2px solid #00f2fe',
            borderRadius: '20px',
            maxWidth: '600px',
            width: '100%',
            padding: '32px',
            textAlign: 'center',
            boxShadow: '0 0 40px rgba(0, 242, 254, 0.3)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🏆</div>
            <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '4px 12px', borderRadius: '20px', fontWeight: 900, fontSize: '0.78rem', textTransform: 'uppercase' }}>
              Certificação Concluída com Sucesso
            </span>
            <h2 style={{ margin: '12px 0 6px', fontSize: '1.4rem', fontWeight: 900, color: '#fff' }}>
              Certificado de Capacitação Operacional
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: '#94a3b8', lineHeight: '1.5' }}>
              Certificamos que o profissional concluiu com 100% de aproveitamento todos os módulos práticos do <strong>Simulador 360° do Clube Fitness</strong>.
            </p>

            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'left' }}>
              <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>Habilidades Validadas:</div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                <li>Operação do Cockpit, Janela Ativa e Questionário Wellness</li>
                <li>Gestão da Agenda Completa e Lançamento de Observações Clínicas</li>
                <li>Agendamento Direto e Controle de Vagas</li>
                <li>Navegação no Prontuário Eletrônico 360° e Laudos PDF</li>
                <li>Prescrição no Workout Builder e Prevenção de Evasão</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setShowCertificate(false)}
              style={{
                background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                color: '#0f172a',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '12px',
                fontWeight: 900,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Concluir & Voltar ao Simulador
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
