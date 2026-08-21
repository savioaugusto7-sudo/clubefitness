import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import User from '@/models/User';
import Plan from '@/models/Plan';
import Professional from '@/models/Professional';
import { checkSessionPermission } from '@/utils/authHelper';
import { hashPassword } from '@/utils/auth';

import { calculateContractEndDate, getContractValidityInfo } from '@/utils/contractValidity';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    // Force registration of models for population
    const _plan = Plan;
    const _user = User;
    const _prof = Professional;

    const { user } = await checkSessionPermission(['admin', 'receptionist', 'professional', 'client'], undefined, request);

    let query: any = { 'dadosComerciais.status': { $ne: 'excluido_anonimizado' } };

    // Clients can only fetch their own profile
    if (user.role === 'client') {
      query._id = user.clientProfileId;
    }

    if (id) {
      query._id = id;
    } else if (userId) {
      query.userId = userId;
    }

    let clients: any[] = [];
    try {
      clients = await Client.find(query)
        .populate({ path: 'userId', select: 'email role activeRoles' })
        .populate({ path: 'dadosComerciais.planoId', select: 'nome valor preco status tipo' })
        .populate({ path: 'profissionalId', select: 'nome email' })
        .lean()
        .maxTimeMS(8000);
    } catch (popErr: any) {
      console.warn('[clients GET] Populate timed out, falling back to raw find:', popErr.message);
      clients = await Client.find(query).lean().maxTimeMS(5000);
    }

    // Auto-Heal & Consistência de Vigência: calcula a vigência real unificada
    try {
      clients.forEach((c: any) => {
        if (c && c.dadosComerciais) {
          try {
            const info = getContractValidityInfo(c, c.dadosComerciais.planoId);
            if (info && info.dataFim) {
              c.dadosComerciais.vencimento = info.dataFim;
            }
            if (c.dadosComerciais.status !== 'congelado' && c.dadosComerciais.status !== 'inativo') {
              c.dadosComerciais.status = info?.statusKey === 'vencido' ? 'vencido' : (c.dadosComerciais.status === 'lead' ? 'lead' : 'ativo');
            }
          } catch (itemErr: any) {
            console.warn('[clients GET] Error calculating validity for client:', c._id, itemErr?.message);
          }
        }
      });
    } catch (loopErr: any) {
      console.warn('[clients GET] Loop error in auto-heal:', loopErr?.message);
    }

    return NextResponse.json({ success: true, data: clients });
  } catch (error: any) {
    console.error('[clients GET] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();

    await checkSessionPermission(['admin', 'receptionist']);

    const body = await request.json();
    const { email, nome, tipo, planId, dadosPessoais, dadosClinicos, dadosComerciais } = body;

    // 1. Create or Find User
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      const defaultPassword = '123456';
      const hashedPassword = hashPassword(defaultPassword);
      user = await User.create({
        nome: nome || dadosPessoais?.nome || 'Novo Aluno',
        email: email.toLowerCase(),
        tipo: tipo || 'client',
        password: hashedPassword,
        needPasswordChange: true
      });
    } else {
      // Check if client document already exists for this user
      const clientExists = await Client.findOne({ userId: user._id });
      if (clientExists) {
        return NextResponse.json({ success: false, error: 'Este e-mail já possui um perfil de aluno cadastrado no sistema.' }, { status: 400 });
      }
    }

    // 2. Count existing clients to generate sequential code
    const count = await Client.countDocuments();
    const codigo = `CF-${String(count + 1).padStart(4, '0')}`;

    const normalizedSexo = dadosPessoais?.sexo ? (dadosPessoais.sexo.trim().toUpperCase().startsWith('F') ? 'F' : (dadosPessoais.sexo.trim().toUpperCase().startsWith('M') ? 'M' : 'O')) : 'M';

    // 3. Create Client
    const client = await Client.create({
      userId: user._id,
      codigo,
      dadosPessoais: {
        nome: user.nome,
        email: user.email,
        ...dadosPessoais,
        sexo: normalizedSexo
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

    const { user } = await checkSessionPermission(['admin', 'receptionist', 'professional', 'client']);

    const body = await request.json();
    const { id, dadosPessoais, dadosClinicos, dadosComerciais, profissionalId, cadastroConcluido, termoAceito, dataAceiteTermo } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing client ID' }, { status: 400 });
    }

    if (user.role === 'client' && id !== user.clientProfileId) {
      return NextResponse.json({ success: false, error: 'Acesso negado: Você só pode atualizar seus próprios dados' }, { status: 403 });
    }

    const client = await Client.findById(id);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    if (dadosPessoais) {
      const normalizedSexo = dadosPessoais.sexo ? (dadosPessoais.sexo.trim().toUpperCase().startsWith('F') ? 'F' : (dadosPessoais.sexo.trim().toUpperCase().startsWith('M') ? 'M' : 'O')) : undefined;
      const updatedPessoais = { ...dadosPessoais };
      if (normalizedSexo !== undefined) {
        updatedPessoais.sexo = normalizedSexo;
      }
      Object.assign(client.dadosPessoais, updatedPessoais);
      client.markModified('dadosPessoais');
      // Sync user name if updated
      if (dadosPessoais.nome) {
        await User.findByIdAndUpdate(client.userId, { nome: dadosPessoais.nome });
      }
    }
    if (dadosClinicos) {
      Object.assign(client.dadosClinicos, dadosClinicos);
      client.markModified('dadosClinicos');
    }
    if (dadosComerciais) {
      const isRecorrente = Boolean(dadosComerciais.criarRecorrenciaMensal !== undefined ? dadosComerciais.criarRecorrenciaMensal : client.dadosComerciais?.criarRecorrenciaMensal);
      const calculatedEnd = calculateContractEndDate(
        dadosComerciais.dataInicio || client.dadosComerciais?.dataInicio,
        dadosComerciais.duracao || client.dadosComerciais?.duracao,
        dadosComerciais.duracaoQtd || dadosComerciais.vigenciaQtd || client.dadosComerciais?.duracaoQtd,
        dadosComerciais.vencimento || client.dadosComerciais?.vencimento,
        isRecorrente
      );

      const merged = {
        ...dadosComerciais,
        vencimento: calculatedEnd
      };

      Object.assign(client.dadosComerciais, merged);
      client.markModified('dadosComerciais');
    }
    if (profissionalId !== undefined) {
      client.profissionalId = profissionalId || null;
    }
    if (cadastroConcluido !== undefined) {
      client.cadastroConcluido = cadastroConcluido;
    }
    if (termoAceito !== undefined) {
      client.termoAceito = termoAceito;
    }
    if (dataAceiteTermo !== undefined) {
      client.dataAceiteTermo = dataAceiteTermo;
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

    await checkSessionPermission(['admin']);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing client ID' }, { status: 400 });
    }

    const client = await Client.findById(id);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    // 1. Delete associated User record (blocks login access)
    if (client.userId) {
      await User.findByIdAndDelete(client.userId);
    }

    // 2. Anonymize personal identification fields (LGPD Right to be Forgotten)
    client.dadosPessoais = {
      nome: `Paciente Anonimizado ${client.codigo || client._id.toString()}`,
      email: `anonimo-${client._id.toString()}@clube.com`,
      cpf: '-',
      telefone: '-',
      whatsapp: '-',
      endereco: '-',
      sexo: client.dadosPessoais?.sexo || 'O',
      dataNascimento: client.dadosPessoais?.dataNascimento || ''
    };

    client.dadosComerciais.status = 'excluido_anonimizado';

    client.markModified('dadosPessoais');
    client.markModified('dadosComerciais');
    await client.save();

    return NextResponse.json({ success: true, message: 'Client anonymized successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
