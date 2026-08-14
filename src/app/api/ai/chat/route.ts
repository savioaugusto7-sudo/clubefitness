import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/utils/dbConnect';
import AiConversation from '@/models/AiConversation';
import { GoogleGenAI } from '@google/genai';
import { geminiToolDeclarations, executeAiTool, AI_SYSTEM_INSTRUCTION } from '@/utils/aiTools';

const MODEL_CHAIN = [
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest'
];

async function generateWithFallback(ai: any, params: any) {
  let lastErr = null;
  for (const model of MODEL_CHAIN) {
    try {
      const res = await ai.models.generateContent({
        ...params,
        model
      });
      return res;
    } catch (err: any) {
      console.warn(`Tentativa com modelo ${model} falhou: ${err.message}. Tentando próximo modelo...`);
      lastErr = err;
    }
  }
  throw lastErr;
}

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

    // 2. Montar histórico para o modelo
    const contents: any[] = [];
    const recentMessages = conversation.messages.slice(-12);

    for (const msg of recentMessages) {
      if (msg.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: msg.content }] });
      } else if (msg.role === 'model') {
        const parts: any[] = [];
        if (msg.content) parts.push({ text: msg.content });
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          for (const tc of msg.toolCalls) {
            parts.push({ functionCall: { name: tc.name, args: tc.args } });
          }
        }
        contents.push({ role: 'model', parts });
      } else if (msg.role === 'tool') {
        const parts: any[] = [];
        if (msg.toolResults && msg.toolResults.length > 0) {
          for (const tr of msg.toolResults) {
            parts.push({ functionResponse: { name: tr.name, response: tr.result } });
          }
        }
        contents.push({ role: 'user', parts });
      }
    }

    // Adicionar mensagem atual do usuário
    contents.push({ role: 'user', parts: [{ text: message }] });

    // Adicionar ao documento MongoDB
    conversation.messages.push({
      role: 'user',
      content: message,
      createdAt: new Date()
    });

    const executedToolsRecord: any[] = [];

    // 3. Loop de Tool Calling (Recursivo até obter texto final)
    let currentIteration = 0;
    const maxIterations = 5;
    let finalAnswerText = '';

    while (currentIteration < maxIterations) {
      currentIteration++;

      const response: any = await generateWithFallback(ai, {
        contents,
        config: {
          systemInstruction: AI_SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: geminiToolDeclarations as any }]
        }
      });

      const functionCalls = response.functionCalls;

      if (functionCalls && functionCalls.length > 0) {
        // O modelo decidiu invocar uma ou mais ferramentas
        const modelParts: any[] = [];
        const toolResponseParts: any[] = [];
        const currentToolCalls: any[] = [];
        const currentToolResults: any[] = [];

        for (const call of functionCalls) {
          const fnName = call.name;
          const fnArgs = call.args || {};
          currentToolCalls.push({ name: fnName, args: fnArgs });

          // Executar ferramenta no MongoDB
          const fnResult = await executeAiTool(fnName, fnArgs);
          currentToolResults.push({ name: fnName, result: fnResult });
          executedToolsRecord.push({ name: fnName, args: fnArgs, result: fnResult });

          modelParts.push({ functionCall: { name: fnName, args: fnArgs, id: call.id } });
          toolResponseParts.push({ functionResponse: { name: fnName, response: fnResult, id: call.id } });
        }

        // Registrar no histórico da chamada
        contents.push({ role: 'model', parts: modelParts });
        contents.push({ role: 'user', parts: toolResponseParts });

        conversation.messages.push({
          role: 'model',
          content: response.text || '',
          toolCalls: currentToolCalls,
          createdAt: new Date()
        });

        conversation.messages.push({
          role: 'tool',
          content: 'Resultado da ferramenta executada com sucesso.',
          toolResults: currentToolResults,
          createdAt: new Date()
        });
      } else {
        // Resposta de texto final atingida
        finalAnswerText = response.text || 'Processamento concluído.';
        break;
      }
    }

    if (!finalAnswerText && executedToolsRecord.length > 0) {
      // Se parou por max iterations, fazer uma chamada final sem tools para sintetizar
      const finalSynth: any = await generateWithFallback(ai, {
        contents,
        config: {
          systemInstruction: AI_SYSTEM_INSTRUCTION + '\nSintetize a resposta com base nos dados obtidos.'
        }
      });
      finalAnswerText = finalSynth.text || 'Operação realizada com sucesso.';
    }

    // Salvar mensagem final da IA no banco
    conversation.messages.push({
      role: 'model',
      content: finalAnswerText,
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
