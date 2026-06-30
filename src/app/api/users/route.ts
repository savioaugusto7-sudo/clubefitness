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
      const userObj = u.toObject();
      return {
        ...userObj,
        roles: userObj.roles && userObj.roles.length > 0 ? userObj.roles : [userObj.tipo],
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
    const { nome, email, tipo, cargo, especialidade, registro, roles } = body;

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

    const activeRoles = roles && roles.length > 0 ? roles : [tipo];

    // 1. Create User
    const user = await User.create({
      nome,
      email: emailLower,
      tipo: activeRoles[0] || tipo,
      roles: activeRoles,
      cargo: cargo || (activeRoles.includes('professional') ? (especialidade || 'Profissional') : undefined)
    });

    // 2. Create sub-documents based on active roles
    if (activeRoles.includes('client')) {
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
    }

    if (activeRoles.includes('professional')) {
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
    const { id, nome, email, tipo, cargo, especialidade, registro, roles } = body;

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

    // 1. Update User base fields
    user.nome = nome || user.nome;
    user.email = emailLower;
    if (tipo) user.tipo = tipo;
    if (roles) user.roles = roles;
    user.cargo = cargo || user.cargo;
    await user.save();

    const activeRoles = user.roles && user.roles.length > 0 ? user.roles : [user.tipo];

    // 2. Synchronize Client profile (create or delete)
    const clientExists = await Client.findOne({ userId: user._id });
    if (activeRoles.includes('client')) {
      if (!clientExists) {
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
      } else {
        await Client.updateOne(
          { userId: user._id },
          { 
            $set: { 
              'dadosPessoais.nome': user.nome, 
              'dadosPessoais.email': user.email 
            } 
          }
        );
      }
    } else {
      if (clientExists) {
        await Client.deleteOne({ userId: user._id });
      }
    }

    // 3. Synchronize Professional profile (create or delete)
    const profExists = await Professional.findOne({ userId: user._id });
    if (activeRoles.includes('professional')) {
      if (!profExists) {
        await Professional.create({
          userId: user._id,
          nome: user.nome,
          especialidade: especialidade || 'Fisioterapia',
          registro: registro || 'CREFITO/00000-F'
        });
      } else {
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
    } else {
      if (profExists) {
        await Professional.deleteOne({ userId: user._id });
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
