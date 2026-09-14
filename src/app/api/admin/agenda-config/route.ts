import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import AgendaConfig from '@/models/AgendaConfig';

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');

    const query: any = {};
    if (tipo) {
      query.tipo = tipo;
    }

    const configs = await AgendaConfig.find(query).sort({ diaSemana: 1, horario: 1, createdAt: -1 });
    return NextResponse.json({ success: true, data: configs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();

    // Suporte a operação em lote
    if (body.bulk && Array.isArray(body.rules)) {
      const results: any[] = [];
      for (const item of body.rules) {
        const { tipo, horario, acao, diaSemana, dataEspecifica, capacidadePersonalizada, servico } = item;
        if (!tipo || !horario || !acao) continue;

        // Limpar regras conflitantes anteriores para a mesma chave
        const matchQuery: any = { tipo, horario };
        if (dataEspecifica) {
          matchQuery.dataEspecifica = dataEspecifica;
        } else {
          matchQuery.diaSemana = diaSemana !== undefined ? diaSemana : null;
          matchQuery.dataEspecifica = null;
        }

        await AgendaConfig.deleteMany(matchQuery);

        const created = await AgendaConfig.create({
          tipo,
          horario,
          acao,
          diaSemana: diaSemana !== undefined ? diaSemana : null,
          dataEspecifica: dataEspecifica || null,
          capacidadePersonalizada: capacidadePersonalizada !== undefined ? capacidadePersonalizada : null,
          servico: servico || null
        });
        results.push(created);
      }
      return NextResponse.json({ success: true, data: results, count: results.length });
    }

    const { tipo, horario, acao, diaSemana, dataEspecifica, capacidadePersonalizada, servico } = body;

    if (!tipo || !horario || !acao) {
      return NextResponse.json({ success: false, error: 'Campos obrigatórios: tipo, horario, acao' }, { status: 400 });
    }

    // Limpar regra conflitante anterior se existir
    const matchQuery: any = { tipo, horario };
    if (dataEspecifica) {
      matchQuery.dataEspecifica = dataEspecifica;
    } else {
      matchQuery.diaSemana = diaSemana !== undefined ? diaSemana : null;
      matchQuery.dataEspecifica = null;
    }
    await AgendaConfig.deleteMany(matchQuery);

    // Criar a nova regra
    const newConfig = await AgendaConfig.create({
      tipo,
      horario,
      acao,
      diaSemana: diaSemana !== undefined ? diaSemana : null,
      dataEspecifica: dataEspecifica || null,
      capacidadePersonalizada: capacidadePersonalizada !== undefined ? capacidadePersonalizada : null,
      servico: servico || null
    });

    return NextResponse.json({ success: true, data: newConfig });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const dataEspecifica = searchParams.get('dataEspecifica');
    const tipo = searchParams.get('tipo');
    const diaSemana = searchParams.get('diaSemana');
    const horario = searchParams.get('horario');

    if (id) {
      await AgendaConfig.findByIdAndDelete(id);
      return NextResponse.json({ success: true, message: 'Configuração removida com sucesso' });
    }

    if (dataEspecifica) {
      const deleteQuery: any = { dataEspecifica };
      if (tipo) deleteQuery.tipo = tipo;
      const res = await AgendaConfig.deleteMany(deleteQuery);
      return NextResponse.json({ success: true, message: `${res.deletedCount} regras de ${dataEspecifica} removidas` });
    }

    if (tipo && horario && diaSemana !== null && diaSemana !== undefined) {
      await AgendaConfig.deleteMany({
        tipo,
        horario,
        diaSemana: Number(diaSemana),
        dataEspecifica: null
      });
      return NextResponse.json({ success: true, message: 'Regra removida e horário restaurado' });
    }

    return NextResponse.json({ success: false, error: 'Parâmetros insuficientes para remoção' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
