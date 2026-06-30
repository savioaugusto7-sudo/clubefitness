import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import dbConnect from '@/utils/dbConnect';
import Professional from '@/models/Professional';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Contém o professionalId no callback

    // 1. Caso de Callback (quando o Google envia o código de volta)
    if (code) {
      await dbConnect();
      
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      const professionalId = state;
      if (!professionalId) {
        return new NextResponse('Professional ID missing in state', { status: 400 });
      }

      // Salvar os tokens no banco
      const professional = await Professional.findById(professionalId);
      if (!professional) {
        return new NextResponse('Professional not found', { status: 404 });
      }

      professional.googleTokens = {
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token || professional.googleTokens?.refreshToken || '',
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        calendarId: 'primary'
      };

      await professional.save();

      // Redireciona de volta para o dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // 2. Caso Inicial (geração do link de redirecionamento)
    const professionalId = searchParams.get('professionalId');
    if (!professionalId) {
      return NextResponse.json({ success: false, error: 'professionalId é obrigatório para iniciar a autenticação.' }, { status: 400 });
    }

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      state: professionalId
    });

    return NextResponse.json({ success: true, url });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
