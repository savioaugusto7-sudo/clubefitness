import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Professional from '@/models/Professional';
import User from '@/models/User';

export async function GET() {
  try {
    await dbConnect();
    // Force register User model
    const _user = User;
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
        cargo: cargo || 'Profissional'
      });
    } else {
      user.tipo = 'professional';
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


