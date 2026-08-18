import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import User from '@/models/User';
import Plan from '@/models/Plan';
import crypto from 'crypto';

export const maxDuration = 30;

function calculateExpirationDate(dataAdesao: string, planName: string): string {
  const date = new Date(dataAdesao + 'T12:00:00');
  if (planName.toLowerCase().includes('semestral')) {
    date.setMonth(date.getMonth() + 6);
  } else {
    date.setMonth(date.getMonth() + 12);
  }
  return date.toISOString().split('T')[0];
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { nome, cpf, dataNascimento, sexo, planoName, dataAdesao } = body;

    if (!nome || !cpf || !dataNascimento || !sexo || !planoName || !dataAdesao) {
      return NextResponse.json({ success: false, error: 'Todos os campos são obrigatórios: Nome, CPF, Data de Nascimento, Sexo, Plano e Data de Adesão.' }, { status: 400 });
    }

    const cpfClean = cpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) {
      return NextResponse.json({ success: false, error: 'CPF inválido.' }, { status: 400 });
    }

    // Generate internal placeholder email based on CPF to avoid login
    const email = `dynamus-${cpfClean}@clubefitness.com`;

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Este CPF já está cadastrado em nosso sistema.' }, { status: 400 });
    }

    // 2. Find the selected plan (Dynamus Semestral or Dynamus Anual)
    let plan = await Plan.findOne({ nome: planoName });
    if (!plan) {
      plan = await Plan.findOne({ nome: /dynamus/i });
    }
    if (!plan) {
      plan = await Plan.create({
        nome: planoName,
        preco: 0,
        tipo: 'Mensal',
        validadeDias: 30,
        ativo: true
      });
    }

    // 3. Create Placeholder User (no active credentials/password)
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(randomPassword, salt, 10000, 64, 'sha512').toString('hex');
    const hashedPassword = `${salt}:10000:${hash}`;

    const user = await User.create({
      nome: nome.trim(),
      email,
      tipo: 'client',
      roles: ['client'],
      password: hashedPassword,
      needPasswordChange: false
    });

    // 4. Generate sequential Client code
    const count = await Client.countDocuments();
    const codigo = `CF-${String(count + 1).padStart(4, '0')}`;

    const vencimento = calculateExpirationDate(dataAdesao, planoName);

    // 5. Create Client record
    const client = await Client.create({
      userId: user._id,
      codigo,
      cadastroConcluido: true,
      termoAceito: true,
      dataAceiteTermo: new Date(),
      dadosPessoais: {
        nome: user.nome,
        email: user.email,
        telefone: '(31) 99999-9999', // placeholder phone
        cpf: cpfClean,
        dataNascimento: dataNascimento || '2000-01-01',
        sexo: sexo || 'O',
        cep: '30000-000',
        endereco: 'Área do Aluno Dynamus',
        numero: 'SN',
        complemento: '',
        bairro: 'Centro',
        cidade: 'Belo Horizonte',
        estado: 'MG'
      },
      dadosClinicos: {
        lesoes: '',
        restricoes: '',
        medicamentos: '',
        historicoClinico: '',
        observacoes: 'Cadastrado simplificado via link Dynamus.'
      },
      dadosComerciais: {
        status: 'ativo',
        planoId: plan._id,
        dataInicio: dataAdesao,
        vencimento,
        frequencia: 3,
        parcelas: planoName.toLowerCase().includes('semestral') ? 6 : 12,
        creditosTotal: 13,
        creditosUsados: 0,
        creditosReservados: 0
      }
    });

    return NextResponse.json({ success: true, data: client });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
