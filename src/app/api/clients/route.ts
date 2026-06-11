import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import User from '@/models/User';
import Plan from '@/models/Plan';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Force registration of models for population
    const _plan = Plan;
    const _user = User;

    let query = {};
    if (userId) {
      query = { userId };
    }

    const clients = await Client.find(query)
      .populate('userId')
      .populate('dadosComerciais.planoId');

    return NextResponse.json({ success: true, data: clients });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { email, nome, tipo, planId, dadosPessoais, dadosClinicos, dadosComerciais } = body;

    // 1. Create or Find User
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({
        nome: nome || dadosPessoais?.nome || 'Novo Aluno',
        email: email.toLowerCase(),
        tipo: tipo || 'client'
      });
    }

    // 2. Create Client
    const client = await Client.create({
      userId: user._id,
      dadosPessoais: {
        nome: user.nome,
        email: user.email,
        ...dadosPessoais
      },
      dadosClinicos: dadosClinicos || {},
      dadosComerciais: {
        planoId: planId || dadosComerciais?.planoId,
        status: 'ativo',
        ...dadosComerciais
      }
    });

    return NextResponse.json({ success: true, data: client });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, dadosPessoais, dadosClinicos, dadosComerciais } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing client ID' }, { status: 400 });
    }

    const client = await Client.findById(id);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    if (dadosPessoais) {
      client.dadosPessoais = { ...client.dadosPessoais, ...dadosPessoais };
      // Sync user name if updated
      if (dadosPessoais.nome) {
        await User.findByIdAndUpdate(client.userId, { nome: dadosPessoais.nome });
      }
    }
    if (dadosClinicos) {
      client.dadosClinicos = { ...client.dadosClinicos, ...dadosClinicos };
    }
    if (dadosComerciais) {
      client.dadosComerciais = { ...client.dadosComerciais, ...dadosComerciais };
    }

    await client.save();
    return NextResponse.json({ success: true, data: client });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing client ID' }, { status: 400 });
    }

    const client = await Client.findById(id);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    // Delete associated User and Client
    await User.findByIdAndDelete(client.userId);
    await Client.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Client deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
