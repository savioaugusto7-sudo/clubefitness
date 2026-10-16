import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/utils/dbConnect';
import SavedPrompt from '@/models/SavedPrompt';

function isSavio(user: any): boolean {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  const name = (user.name || '').toLowerCase().trim();
  const id = String(user.id || user._id || '');

  return (
    email === 'savioaugusto7@gmail.com' ||
    id === '6a3d455ae52a33bfc8e5302f' ||
    name === 'sávio augusto oliveira' ||
    name === 'savio augusto oliveira'
  );
}

const DEFAULT_PROMPTS = [
  {
    titulo: 'Vencimentos dos Próximos 30 Dias',
    descricao: 'Lista contratos que vencem nos próximos 30 dias com plano, valores, dias restantes e checagem de renovação.',
    prompt: 'Liste todos os contratos de alunos que vencem nos próximos 30 dias. Apresente uma tabela completa com nome do aluno, telefone, plano, data de vencimento, dias restantes, valor e se já existe proposta de renovação pendente.',
    categoria: 'financeiro',
    tags: ['vencimento', 'renovacao', 'financeiro'],
    isDefault: true,
    ordem: 1
  },
  {
    titulo: 'Auditoria de Alunos Sem Registro Financeiro',
    descricao: 'Identifica alunos com contrato ativo que não possuem cobranças ou lançamentos na coleção financeira.',
    prompt: 'Faça uma auditoria minuciosa: quais alunos estão com status comercial ativo mas NÃO possuem lançamentos ou parcelas no financeiro/pagamentos? Aponte nome, plano contratado, forma de pagamento cadastrada e data de início.',
    categoria: 'inconsistencias',
    tags: ['auditoria', 'inconsistencia', 'financeiro'],
    isDefault: true,
    ordem: 2
  },
  {
    titulo: 'Radar de Retenção & Risco de Churn (> 15 dias)',
    descricao: 'Mapeia alunos ausentes há mais de 15 dias, separando cancelamentos reais de pendências operacionais da agenda do Dr. Albert.',
    prompt: 'Apresente o relatório de retenção e risco de churn para alunos ausentes há mais de 15 dias. Lembre-se: apenas cancelamentos frequentes e explícitos configuram ociosidade; na agenda do Dr. Albert, sessões passadas em aberto decorrem de rotina operacional de check-in. Diferencie quem tem horário fixo de avulsos.',
    categoria: 'retencao',
    tags: ['churn', 'retencao', 'dr_albert', 'guilherme'],
    isDefault: true,
    ordem: 3
  },
  {
    titulo: 'Alunos Ativos Que Nunca Agendaram (Onboarding)',
    descricao: 'Detecta alunos que fecharam contrato mas ainda não tiveram nenhuma sessão marcada no clube.',
    prompt: 'Quais alunos com contrato ativo NUNCA registraram nenhum agendamento na história do sistema? Informe plano, data de início da matrícula e contato para alinharmos onboarding urgente.',
    categoria: 'auditoria',
    tags: ['onboarding', 'matriculas', 'primeiro_treino'],
    isDefault: true,
    ordem: 4
  },
  {
    titulo: 'Ocupação da Grade: Dr. Albert vs Guilherme vs Salão',
    descricao: 'Audita como as vagas de horários fixos estão distribuídas entre os professores.',
    prompt: 'Faça um balanço da ocupação da grade: quantos horários fixos estão alocados para o Dr. Albert Nunes, quantos para o Guilherme Graciano e quantos na Academia Geral? Aponte horários com maior concorrência.',
    categoria: 'grade',
    tags: ['grade', 'vagas', 'horarios_fixos'],
    isDefault: true,
    ordem: 5
  }
];

export async function GET(request: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user || !isSavio(user)) {
      return NextResponse.json({ success: false, error: 'Acesso restrito.' }, { status: 403 });
    }

    let prompts = await SavedPrompt.find({
      $or: [
        { userId: user.id || user._id },
        { userEmail: user.email },
        { isDefault: true }
      ]
    }).sort({ ordem: 1, createdAt: -1 }).lean();

    // Se ainda não houver nenhum prompt salvo, faz o seed dos padrões
    if (prompts.length === 0) {
      const uId = user.id || user._id;
      const uEmail = user.email || 'savioaugusto7@gmail.com';

      const toInsert = DEFAULT_PROMPTS.map(p => ({
        ...p,
        userId: uId,
        userEmail: uEmail
      }));

      await SavedPrompt.insertMany(toInsert);
      prompts = await SavedPrompt.find({ userEmail: uEmail }).sort({ ordem: 1 }).lean();
    }

    return NextResponse.json({ success: true, data: prompts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user || !isSavio(user)) {
      return NextResponse.json({ success: false, error: 'Acesso restrito.' }, { status: 403 });
    }

    const body = await request.json();
    const { titulo, descricao, prompt, categoria, tags } = body;

    if (!titulo || !prompt) {
      return NextResponse.json({ success: false, error: 'Título e Prompt são obrigatórios.' }, { status: 400 });
    }

    const newPrompt = await SavedPrompt.create({
      userId: user.id || user._id,
      userEmail: user.email || 'savioaugusto7@gmail.com',
      titulo: titulo.trim(),
      descricao: (descricao || '').trim(),
      prompt: prompt.trim(),
      categoria: categoria || 'auditoria',
      tags: Array.isArray(tags) ? tags : [],
      isDefault: false
    });

    return NextResponse.json({ success: true, data: newPrompt });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user || !isSavio(user)) {
      return NextResponse.json({ success: false, error: 'Acesso restrito.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID do prompt não informado.' }, { status: 400 });
    }

    await SavedPrompt.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Prompt removido com sucesso.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
