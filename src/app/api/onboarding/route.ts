import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();
    const {
      nome,
      dataNascimento,
      sexo,
      cpf,
      telefone,
      email,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      cep,
      nacionalidade,
      estadoCivil,
      profissao,
      // dados clínicos
      lesoes,
      restricoes,
      medicamentos,
      historicoClinico,
      termoAceito,
    } = body;

    const user = session.user as any;
    const client = await Client.findById(user.profileId);

    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente não encontrado' }, { status: 404 });
    }

    const normalizedSexo = sexo ? (sexo.trim().toUpperCase().startsWith('F') ? 'F' : (sexo.trim().toUpperCase().startsWith('M') ? 'M' : 'O')) : '';

    client.dadosPessoais = {
      nome: nome || client.dadosPessoais?.nome || '',
      dataNascimento: dataNascimento || client.dadosPessoais?.dataNascimento || '',
      sexo: normalizedSexo || client.dadosPessoais?.sexo || '',
      cpf: cpf || client.dadosPessoais?.cpf || '',
      telefone: telefone || client.dadosPessoais?.telefone || '',
      email: email || client.dadosPessoais?.email || '',
      endereco: endereco || client.dadosPessoais?.endereco || '',
      numero: numero || client.dadosPessoais?.numero || '',
      complemento: complemento || client.dadosPessoais?.complemento || '',
      bairro: bairro || client.dadosPessoais?.bairro || '',
      cidade: cidade || client.dadosPessoais?.cidade || '',
      estado: estado || client.dadosPessoais?.estado || '',
      cep: cep || client.dadosPessoais?.cep || '',
      nacionalidade: nacionalidade || client.dadosPessoais?.nacionalidade || 'brasileiro(a)',
      estadoCivil: estadoCivil || client.dadosPessoais?.estadoCivil || 'solteiro(a)',
      profissao: profissao || client.dadosPessoais?.profissao || '',
    };

    client.dadosClinicos = {
      lesoes: lesoes || client.dadosClinicos?.lesoes || '',
      restricoes: restricoes || client.dadosClinicos?.restricoes || '',
      medicamentos: medicamentos || client.dadosClinicos?.medicamentos || '',
      historicoClinico: historicoClinico || client.dadosClinicos?.historicoClinico || '',
      observacoes: client.dadosClinicos?.observacoes || '',
    };

    client.cadastroConcluido = true;
    client.termoAceito = termoAceito === true;
    client.dataAceiteTermo = termoAceito ? new Date() : undefined;

    await client.save();

    return NextResponse.json({ success: true, data: client });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    await dbConnect();
    const user = session.user as any;
    const client = await Client.findById(user.profileId);

    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: client });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
