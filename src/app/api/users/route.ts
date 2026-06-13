import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import User from '@/models/User';
import Client from '@/models/Client';
import Professional from '@/models/Professional';
import Plan from '@/models/Plan';
import { isRestrictedForTestAdmin } from '@/utils/authCheck';

export async function GET() {
  try {
    await dbConnect();
    
    // Register Plan model to ensure it can be populated
    const _plan = Plan;

    const users = await User.find({}).sort({ createdAt: -1 });
    const clients = await Client.find({}).populate('dadosComerciais.planoId');
    const professionals = await Professional.find({});

    const clientsMap = new Map(clients.map(c => [c.userId?.toString(), c]));
    const professionalsMap = new Map(professionals.map(p => [p.userId?.toString(), p]));

    const mergedData = users.map(u => {
      const userIdStr = u._id.toString();
      return {
        ...u.toObject(),
        clientDetails: clientsMap.get(userIdStr) || null,
        professionalDetails: professionalsMap.get(userIdStr) || null
      };
    });

    return NextResponse.json({ success: true, data: mergedData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { nome, email, tipo, cargo, especialidade, registro } = body;

    if (!nome || !email || !tipo) {
      return NextResponse.json({ success: false, error: 'Nome, email e perfil são obrigatórios' }, { status: 400 });
    }

    if (await isRestrictedForTestAdmin(email)) {
      return NextResponse.json({ success: false, error: 'Acesso negado: Administrador de teste só pode gerenciar usuários de teste (*@clube.com).' }, { status: 403 });
    }

    const emailLower = email.toLowerCase();

    // Verify if user already exists
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Um usuário com este e-mail já está cadastrado' }, { status: 400 });
    }

    // 1. Create User
    const user = await User.create({
      nome,
      email: emailLower,
      tipo,
      cargo: cargo || (tipo === 'professional' ? (especialidade || 'Profissional') : undefined)
    });

    // 2. Create sub-document based on selected role
    if (tipo === 'client') {
      await Client.create({
        userId: user._id,
        dadosPessoais: {
          nome: user.nome,
          email: user.email,
          nacionalidade: 'brasileiro(a)',
          estadoCivil: 'solteiro(a)',
          profissao: 'autônomo(a)'
        },
        dadosClinicos: {
          lesoes: '',
          restricoes: '',
          medicamentos: '',
          historicoClinico: '',
          observacoes: ''
        },
        dadosComerciais: {
          status: 'ativo',
          frequencia: 3,
          parcelas: 1,
          creditosTotal: 12,
          creditosUsados: 0,
          creditosReservados: 0,
          creditosMassagemTotal: 1,
          creditosMassagemUsados: 0,
          creditosMassagemReservados: 0,
          descontoValor: 0,
          descontoTipo: 'percentual',
          duracao: 'mensal',
          formaPagamento: 'pix'
        }
      });
    } else if (tipo === 'professional') {
      await Professional.create({
        userId: user._id,
        nome: user.nome,
        especialidade: especialidade || 'Fisioterapia',
        registro: registro || 'CREFITO/00000-F'
      });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, nome, email, tipo, cargo, especialidade, registro } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID do usuário não fornecido' }, { status: 400 });
    }

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (await isRestrictedForTestAdmin(user.email) || await isRestrictedForTestAdmin(email)) {
      return NextResponse.json({ success: false, error: 'Acesso negado: Administrador de teste só pode gerenciar usuários de teste (*@clube.com).' }, { status: 403 });
    }

    const emailLower = email ? email.toLowerCase() : user.email;

    // Check unique email if changing email
    if (emailLower !== user.email) {
      const existingUser = await User.findOne({ email: emailLower });
      if (existingUser) {
        return NextResponse.json({ success: false, error: 'Um usuário com este e-mail já está cadastrado' }, { status: 400 });
      }
    }

    const oldTipo = user.tipo;

    // 1. Update User base fields
    user.nome = nome || user.nome;
    user.email = emailLower;
    user.tipo = tipo || user.tipo;
    user.cargo = cargo || user.cargo;
    await user.save();

    // 2. Manage role mapping change
    if (oldTipo !== user.tipo) {
      // Clean up old sub-documents
      if (oldTipo === 'client') {
        await Client.deleteOne({ userId: user._id });
      } else if (oldTipo === 'professional') {
        await Professional.deleteOne({ userId: user._id });
      }

      // Create new sub-documents
      if (user.tipo === 'client') {
        await Client.create({
          userId: user._id,
          dadosPessoais: {
            nome: user.nome,
            email: user.email,
            nacionalidade: 'brasileiro(a)',
            estadoCivil: 'solteiro(a)',
            profissao: 'autônomo(a)'
          },
          dadosClinicos: {
            lesoes: '',
            restricoes: '',
            medicamentos: '',
            historicoClinico: '',
            observacoes: ''
          },
          dadosComerciais: {
            status: 'ativo',
            frequencia: 3,
            parcelas: 1,
            creditosTotal: 12,
            creditosUsados: 0,
            creditosReservados: 0,
            creditosMassagemTotal: 1,
            creditosMassagemUsados: 0,
            creditosMassagemReservados: 0,
            descontoValor: 0,
            descontoTipo: 'percentual',
            duracao: 'mensal',
            formaPagamento: 'pix'
          }
        });
      } else if (user.tipo === 'professional') {
        await Professional.create({
          userId: user._id,
          nome: user.nome,
          especialidade: especialidade || 'Fisioterapia',
          registro: registro || 'CREFITO/00000-F'
        });
      }
    } else {
      // Sync names/details if type didn't change
      if (user.tipo === 'client') {
        await Client.updateOne(
          { userId: user._id },
          { 
            $set: { 
              'dadosPessoais.nome': user.nome, 
              'dadosPessoais.email': user.email 
            } 
          }
        );
      } else if (user.tipo === 'professional') {
        await Professional.updateOne(
          { userId: user._id },
          { 
            $set: { 
              nome: user.nome,
              especialidade: especialidade || undefined,
              registro: registro || undefined
            } 
          }
        );
      }
    }

    return NextResponse.json({ success: true, data: user });
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
      return NextResponse.json({ success: false, error: 'ID do usuário não fornecido' }, { status: 400 });
    }

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (await isRestrictedForTestAdmin(user.email)) {
      return NextResponse.json({ success: false, error: 'Acesso negado: Administrador de teste só pode gerenciar usuários de teste (*@clube.com).' }, { status: 403 });
    }

    // Clean up sub-documents
    await Client.deleteOne({ userId: user._id });
    await Professional.deleteOne({ userId: user._id });

    // Delete User
    await User.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Usuário excluído com sucesso' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
