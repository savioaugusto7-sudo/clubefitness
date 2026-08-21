import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Professional from '@/models/Professional';
import User from '@/models/User';

export const maxDuration = 30;

export async function GET() {
  try {
    await dbConnect();
    // Force register User model
    const _user = User;

    // Garantir existência padrão de Dr. Albert e Dr. Guilherme se não existirem
    const defaultDoctors = [
      {
        nome: 'Dr. Albert',
        email: 'albert@clube.com',
        especialidade: 'Quiropraxia e Fisioterapia Clínica',
        registro: 'CREFITO 45678-F',
        cargo: 'Fisioterapeuta / Quiropraxista',
        pin: '1234'
      },
      {
        nome: 'Dr. Guilherme',
        email: 'guilherme@clube.com',
        especialidade: 'Fisioterapia e Consulta Clínica',
        registro: 'CREFITO 78910-F',
        cargo: 'Fisioterapeuta / Clínico',
        pin: '1234'
      }
    ];

    for (const doc of defaultDoctors) {
      const existingProf = await Professional.findOne({
        nome: { $regex: new RegExp(`^${doc.nome}$`, 'i') }
      });
      if (!existingProf) {
        let user = await User.findOne({ email: doc.email.toLowerCase() });
        if (!user) {
          user = await User.create({
            nome: doc.nome,
            email: doc.email.toLowerCase(),
            tipo: 'professional',
            roles: ['professional'],
            cargo: doc.cargo
          });
        }
        await Professional.create({
          userId: user._id,
          nome: doc.nome,
          especialidade: doc.especialidade,
          registro: doc.registro,
          pin: doc.pin
        });
      }
    }

    const professionals = await Professional.find({}).populate('userId');
    return NextResponse.json({ success: true, data: professionals });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { email, nome, especialidade, registro, cargo, pin } = body;

    // 1. Create or Find User
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({
        nome,
        email: email.toLowerCase(),
        tipo: 'professional',
        roles: ['professional'],
        cargo: cargo || 'Profissional'
      });
    } else {
      user.tipo = 'professional';
      if (!user.roles) {
        user.roles = ['professional'];
      } else if (!user.roles.includes('professional')) {
        user.roles = [...user.roles, 'professional'];
      }
      if (cargo) user.cargo = cargo;
      await user.save();
    }

    // 2. Create Professional Record
    const professional = await Professional.create({
      userId: user._id,
      nome,
      especialidade,
      registro,
      pin: pin || '1234'
    });

    return NextResponse.json({ success: true, data: professional });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, nome, especialidade, registro, cargo, pin } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing professional ID' }, { status: 400 });
    }

    const professional = await Professional.findById(id);
    if (!professional) {
      return NextResponse.json({ success: false, error: 'Professional not found' }, { status: 404 });
    }

    professional.nome = nome || professional.nome;
    professional.especialidade = especialidade || professional.especialidade;
    professional.registro = registro || professional.registro;
    if (pin !== undefined) {
      professional.pin = pin || '1234';
    }
    await professional.save();

    // Sincronizar nome e cargo no User
    if (nome || cargo) {
      const user = await User.findById(professional.userId);
      if (user) {
        if (nome) user.nome = nome;
        if (cargo) user.cargo = cargo;
        await user.save();
      }
    }

    return NextResponse.json({ success: true, data: professional });
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
      return NextResponse.json({ success: false, error: 'Missing professional ID' }, { status: 400 });
    }

    const professional = await Professional.findById(id);
    if (!professional) {
      return NextResponse.json({ success: false, error: 'Professional not found' }, { status: 404 });
    }

    // Deletar o registro de Professional e também o seu User
    await User.findByIdAndDelete(professional.userId);
    await Professional.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Professional deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
