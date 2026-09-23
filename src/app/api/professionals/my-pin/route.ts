import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/utils/dbConnect';
import Professional from '@/models/Professional';
import User from '@/models/User';

export const maxDuration = 30;

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
    }

    const email = session.user.email.toLowerCase().trim();

    // 🔒 Regra de Segurança: O terminal coletivo NUNCA pode alterar o PIN de nenhum profissional
    if (email === 'coletivo@clube.com') {
      return NextResponse.json(
        { success: false, error: 'A troca de PIN não é permitida no terminal coletivo. Acesse sua conta individual.' },
        { status: 403 }
      );
    }

    const dbUser = await User.findOne({ email });
    if (!dbUser) {
      return NextResponse.json({ success: false, error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // Localizar cadastro profissional correspondente
    let professional = await Professional.findOne({ userId: dbUser._id });
    if (!professional) {
      // Fallback por nome ou email vinculado
      professional = await Professional.findOne({
        $or: [
          { nome: new RegExp(`^${dbUser.nome}$`, 'i') },
          { nome: new RegExp(`^${session.user.name || ''}$`, 'i') }
        ]
      });
    }

    if (!professional) {
      return NextResponse.json(
        { success: false, error: 'Perfil profissional não encontrado para este usuário.' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { currentPin, newPin } = body;

    // Validação estrita do novo PIN (exatamente 4 dígitos numéricos)
    const cleanNewPin = (newPin || '').trim();
    if (!/^\d{4}$/.test(cleanNewPin)) {
      return NextResponse.json(
        { success: false, error: 'O novo PIN deve conter exatamente 4 dígitos numéricos (ex: 4589).' },
        { status: 400 }
      );
    }

    // Validação do PIN atual
    const expectedCurrentPin = professional.pin || '1234';
    if ((currentPin || '').trim() !== expectedCurrentPin) {
      return NextResponse.json(
        { success: false, error: 'PIN atual incorreto. Verifique e tente novamente ou solicite reset ao administrador.' },
        { status: 400 }
      );
    }

    // Atualizar PIN
    professional.pin = cleanNewPin;
    await professional.save();

    return NextResponse.json({
      success: true,
      message: 'PIN de acesso coletivo atualizado com sucesso!',
      pin: cleanNewPin
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
