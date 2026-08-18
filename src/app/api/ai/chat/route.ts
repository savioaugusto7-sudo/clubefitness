import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/utils/dbConnect';
import AiConversation from '@/models/AiConversation';
import { GoogleGenAI } from '@google/genai';
import { geminiToolDeclarations, executeAiTool, getGabiSystemInstruction } from '@/utils/aiTools';

export const maxDuration = 30;

const MODEL_CHAIN = [
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest'
];

export async function GET(request: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (conversationId) {
      const conv = await AiConversation.findById(conversationId).lean();
      return NextResponse.json({ success: true, data: conv });
    }

    const query: any = {};
    const u = session?.user as any;
    if (u?.id) {
      query.userId = u.id;
    }
    const conversations = await AiConversation.find(query)
      .sort({ updatedAt: -1 })
      .limit(20)
      .select('title channel createdAt updatedAt')
      .lean();

    return NextResponse.json({ success: true, data: conversations });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { message, conversationId } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ success: false, error: 'Mensagem não informada.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Chave GEMINI_API_KEY não configurada no servidor (adicione nas variáveis de ambiente da Vercel).' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const userObj = session?.user as any;

    // 1. Localizar ou criar a conversa
    let conversation: any = null;
    if (conversationId) {
      conversation = await AiConversation.findById(conversationId);
    }
    if (!conversation) {
      conversation = await AiConversation.create({
        userId: userObj?.id || undefined,
        userName: userObj?.name || 'Administrador',
        title: message.substring(0, 45) + (message.length > 45 ? '...' : ''),
        channel: 'dashboard',
        messages: []
      });
    }

    // 2. Montar histórico de mensagens anteriores para memória contínua da sessão
    const history: any[] = [];
    const pastMessages = conversation.messages.slice(-14);
    for (const msg of pastMessages) {
      if (msg.role === 'user' && msg.content) {
        history.push({
          role: 'user',
          parts: [{ text: msg.content }]
        });
      } else if (msg.role === 'model' && msg.content) {
        history.push({
          role: 'model',
          parts: [{ text: msg.content }]
        });
      }
    }

    // Adicionar mensagem atual do usuário no banco
    conversation.messages.push({
      role: 'user',
      content: message,
      createdAt: new Date()
    });

    let finalAnswerText = '';
    const executedToolsRecord: any[] = [];
    let lastErr: any = null;

    // 3. Executar chat com histórico, loop de Tool Calling e Fallback de Modelos
    for (const modelName of MODEL_CHAIN) {
      try {
        const nowBH = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const chat = ai.chats.create({
          model: modelName,
          history: history.length > 0 ? history : undefined,
          config: {
            systemInstruction: getGabiSystemInstruction(nowBH),
            tools: [{ functionDeclarations: geminiToolDeclarations as any }]
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
            const fnResult = await executeAiTool(fnName, fnArgs);
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

        finalAnswerText = chatResponse.text || 'Operação concluída com sucesso.';
        break; // Sucesso na execução!
      } catch (err: any) {
        console.warn(`Tentativa no modelo ${modelName} falhou: ${err.message}`);
        lastErr = err;
      }
    }

    if (!finalAnswerText && lastErr) {
      throw lastErr;
    }

    // Salvar resposta final no banco
    conversation.messages.push({
      role: 'model',
      content: finalAnswerText,
      toolCalls: executedToolsRecord.map(t => ({ name: t.name, args: t.args })),
      createdAt: new Date()
    });

    await conversation.save();

    return NextResponse.json({
      success: true,
      response: finalAnswerText,
      conversationId: conversation._id,
      executedTools: executedToolsRecord,
      messages: conversation.messages
    });
  } catch (error: any) {
    console.error('Erro na API de Chat da IA:', error);
    return NextResponse.json({
      success: false,
      error: `Erro ao processar mensagem com a IA: ${error.message}`
    }, { status: 500 });
  }
}
