import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/utils/dbConnect';
import AiConversation from '@/models/AiConversation';
import { GoogleGenAI } from '@google/genai';
import { 
  executiveToolDeclarations, 
  executeExecutiveTool, 
  getExecutiveSystemInstruction 
} from '@/utils/aiExecutiveTools';

export const maxDuration = 45;

const MODEL_CHAIN = [
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-flash-lite-latest',
  'gemini-3.7-flash',
  'gemini-3.8-flash'
];

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

export async function POST(request: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user || !isSavio(user)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Acesso restrito: O Gabi Intelligence Studio é de uso exclusivo do Gestor Geral Sávio Augusto Oliveira.' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { message, conversationId } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ success: false, error: 'Comando ou pergunta não informada.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Chave GEMINI_API_KEY não configurada no servidor.' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // 1. Localizar ou criar conversa no canal executive
    let conversation: any = null;
    if (conversationId) {
      conversation = await AiConversation.findById(conversationId);
    }
    if (!conversation) {
      conversation = await AiConversation.create({
        userId: user.id || user._id,
        userName: user.name || 'Sávio Augusto Oliveira',
        title: message.substring(0, 45) + (message.length > 45 ? '...' : ''),
        channel: 'gabi_executive',
        messages: []
      });
    }

    // 2. Histórico de mensagens anteriores
    const history: any[] = [];
    const pastMessages = (conversation.messages || []).slice(-10);
    for (const msg of pastMessages) {
      if (msg.role === 'user' && msg.content) {
        history.push({ role: 'user', parts: [{ text: msg.content }] });
      } else if (msg.role === 'model' && msg.content) {
        history.push({ role: 'model', parts: [{ text: msg.content }] });
      }
    }

    conversation.messages.push({
      role: 'user',
      content: message,
      createdAt: new Date()
    });

    let finalAnswerText = '';
    const executedToolsRecord: any[] = [];
    let lastErr: any = null;

    for (const modelName of MODEL_CHAIN) {
      try {
        const nowBH = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const chat = ai.chats.create({
          model: modelName,
          history: history.length > 0 ? history : undefined,
          config: {
            systemInstruction: getExecutiveSystemInstruction(nowBH),
            tools: [{ functionDeclarations: executiveToolDeclarations as any }]
          }
        });

        let chatResponse: any = await chat.sendMessage({ message });
        let iteration = 0;
        const maxIterations = 5;

        while (chatResponse.functionCalls && chatResponse.functionCalls.length > 0 && iteration < maxIterations) {
          iteration++;
          const toolResponses: any[] = [];

          for (const call of chatResponse.functionCalls) {
            const fnName = call.name;
            const fnArgs = call.args || {};
            const fnResult = await executeExecutiveTool(fnName, fnArgs);
            executedToolsRecord.push({ name: fnName, args: fnArgs, result: fnResult });

            toolResponses.push({
              functionResponse: {
                name: fnName,
                response: fnResult,
                id: call.id
              }
            });
          }

          chatResponse = await chat.sendMessage({ message: toolResponses });
        }

        finalAnswerText = chatResponse.text || 'Análise executada com sucesso.';
        break;
      } catch (err: any) {
        lastErr = err;
        console.warn(`[Gabi Executive API] Tentativa com modelo ${modelName} falhou:`, err?.message);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (!finalAnswerText && lastErr) {
      let friendlyError = lastErr?.message || 'Erro inesperado';
      try {
        const parsed = JSON.parse(friendlyError);
        if (parsed?.error?.message) {
          friendlyError = parsed.error.message;
        }
      } catch (_) {}

      return NextResponse.json({ 
        success: false, 
        error: `Falha ao processar análise com IA: ${friendlyError}` 
      }, { status: 500 });
    }

    // Salvar resposta no banco
    conversation.messages.push({
      role: 'model',
      content: finalAnswerText,
      createdAt: new Date()
    });
    conversation.updatedAt = new Date();
    await conversation.save();

    // Extrair bloco json:visual se houver
    let visualMetadata = null;
    const visualRegex = /```json:visual\s*([\s\S]*?)\s*```/;
    const visualMatch = finalAnswerText.match(visualRegex);
    if (visualMatch && visualMatch[1]) {
      try {
        visualMetadata = JSON.parse(visualMatch[1]);
      } catch (e) {
        console.warn('[Gabi Executive API] Erro ao parsear json:visual:', e);
      }
    }

    return NextResponse.json({
      success: true,
      conversationId: conversation._id,
      reply: finalAnswerText,
      executedTools: executedToolsRecord,
      visualMetadata: visualMetadata
    });
  } catch (error: any) {
    console.error('[Gabi Executive API POST] Erro geral:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user || !isSavio(user)) {
      return NextResponse.json({ success: false, error: 'Acesso restrito.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (conversationId) {
      const conv = await AiConversation.findById(conversationId).lean();
      return NextResponse.json({ success: true, data: conv });
    }

    const conversations = await AiConversation.find({
      channel: 'gabi_executive'
    })
      .sort({ updatedAt: -1 })
      .limit(30)
      .select('title channel createdAt updatedAt')
      .lean();

    return NextResponse.json({ success: true, data: conversations });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
