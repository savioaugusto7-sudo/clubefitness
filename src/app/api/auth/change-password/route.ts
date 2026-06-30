import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../[...nextauth]/route';
import dbConnect from '@/utils/dbConnect';
import User from '@/models/User';
import { hashPassword } from '@/utils/auth';

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    // 1. Get current authenticated session
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ success: false, error: 'Acesso não autorizado. Faça login novamente.' }, { status: 401 });
    }

    const body = await request.json();
    const { password } = body;

    // 2. Validate password input
    if (!password || password.trim().length < 6) {
      return NextResponse.json({ success: false, error: 'A senha deve possuir no mínimo 6 caracteres.' }, { status: 400 });
    }

    // 3. Find and update user record
    const user = await User.findOne({ email: session.user.email.toLowerCase() });
    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // 4. Update password and flag
    user.password = hashPassword(password);
    user.needPasswordChange = false;
    await user.save();

    return NextResponse.json({ success: true, message: 'Senha atualizada com sucesso!' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
