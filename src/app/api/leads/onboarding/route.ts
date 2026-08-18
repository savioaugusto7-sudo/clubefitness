import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import User from '@/models/User';
import Plan from '@/models/Plan';
import { hashPassword } from '@/utils/auth';

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email é obrigatório.' }, { status: 400 });
    }
    const emailClean = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: emailClean });
    return NextResponse.json({ success: true, exists: !!existingUser });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
      // dados clínicos
      lesoes,
      restricoes,
      medicamentos,
      historicoClinico,
      termoAceito,
    } = body;

    if (!nome || !email || !telefone) {
      return NextResponse.json({ success: false, error: 'Campos obrigatórios ausentes: Nome, E-mail e Telefone são necessários.' }, { status: 400 });
    }

    const emailClean = email.trim().toLowerCase();

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email: emailClean });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Este e-mail já está cadastrado em nosso sistema.' }, { status: 400 });
    }

    // 2. Create User
    const defaultPassword = '123456';
    const hashedPassword = hashPassword(defaultPassword);
    const user = await User.create({
      nome: nome.trim(),
      email: emailClean,
      tipo: 'client',
      roles: ['client'],
      password: hashedPassword,
      needPasswordChange: true
    });

    // 3. Generate sequential Client code
    const count = await Client.countDocuments();
    const codigo = `CF-${String(count + 1).padStart(4, '0')}`;

    // Normalize sex
    const normalizedSexo = sexo ? (sexo.trim().toUpperCase().startsWith('F') ? 'F' : (sexo.trim().toUpperCase().startsWith('M') ? 'M' : 'O')) : 'M';

    // 4. Find or dynamically create "Captação" Plan
    let capPlan = await Plan.findOne({ nome: 'Captação' });
    if (!capPlan) {
      capPlan = await Plan.create({
        nome: 'Captação',
        preco: 0,
        tipo: 'Mensal',
        validadeDias: 30,
        ativo: true
      });
    }

    // 5. Create Client document as lead
    const client = await Client.create({
      userId: user._id,
      codigo,
      cadastroConcluido: true,
      termoAceito: termoAceito === true,
      dataAceiteTermo: termoAceito ? new Date() : undefined,
      dadosPessoais: {
        nome: user.nome,
        email: user.email,
        telefone: telefone.trim(),
        cpf: (cpf || '').replace(/\D/g, ''),
        dataNascimento: dataNascimento || '',
        sexo: normalizedSexo,
        cep: (cep || '').replace(/\D/g, ''),
        endereco: endereco || '',
        numero: numero || '',
        complemento: complemento || '',
        bairro: bairro || '',
        cidade: cidade || '',
        estado: estado || ''
      },
      dadosClinicos: {
        lesoes: lesoes || '',
        restricoes: restricoes || '',
        medicamentos: medicamentos || '',
        historicoClinico: historicoClinico || '',
        observacoes: ''
      },
      dadosComerciais: {
        status: 'lead',
        planoId: capPlan._id,
        frequencia: 3,
        parcelas: 1,
        creditosTotal: 0,
        creditosUsados: 0,
        creditosReservados: 0
      }
    });

    return NextResponse.json({ success: true, data: client });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
