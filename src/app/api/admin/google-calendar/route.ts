import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import dbConnect from '@/utils/dbConnect';
import Professional from '@/models/Professional';

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const professionalId = searchParams.get('professionalId');
    const date = searchParams.get('date'); // YYYY-MM-DD

    if (!professionalId || !date) {
      return NextResponse.json({ success: false, error: 'Parâmetros professionalId e date são obrigatórios.' }, { status: 400 });
    }

    const professional = await Professional.findById(professionalId);
    if (!professional) {
      return NextResponse.json({ success: false, error: 'Profissional não encontrado.' }, { status: 404 });
    }

    if (!professional.googleTokens || !professional.googleTokens.refreshToken) {
      return NextResponse.json({ success: true, notConnected: true, data: [] });
    }

    const oAuth2Client = getOAuthClient();
    oAuth2Client.setCredentials({
      access_token: professional.googleTokens.accessToken,
      refresh_token: professional.googleTokens.refreshToken,
      expiry_date: professional.googleTokens.tokenExpiry ? new Date(professional.googleTokens.tokenExpiry).getTime() : null
    });

    // Escuta por novos tokens gerados por auto-refresh e atualiza no BD
    oAuth2Client.on('tokens', async (newTokens) => {
      if (newTokens.access_token) {
        professional.googleTokens.accessToken = newTokens.access_token;
      }
      if (newTokens.expiry_date) {
        professional.googleTokens.tokenExpiry = new Date(newTokens.expiry_date);
      }
      await professional.save();
    });

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    
    // Filtros de tempo para obter apenas os eventos do dia especificado
    const timeMin = `${date}T00:00:00Z`;
    const timeMax = `${date}T23:59:59Z`;

    const response = await calendar.events.list({
      calendarId: professional.googleTokens.calendarId || 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = response.data.items || [];
    const formattedEvents = events.map(e => ({
      id: e.id,
      summary: e.summary || 'Sem Título',
      start: e.start?.dateTime || e.start?.date || '',
      end: e.end?.dateTime || e.end?.date || '',
      description: e.description || ''
    }));

    return NextResponse.json({ success: true, data: formattedEvents });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { professionalId, summary, start, end, description } = body;

    if (!professionalId || !summary || !start || !end) {
      return NextResponse.json({ success: false, error: 'Parâmetros obrigatórios ausentes.' }, { status: 400 });
    }

    const professional = await Professional.findById(professionalId);
    if (!professional) {
      return NextResponse.json({ success: false, error: 'Profissional não encontrado.' }, { status: 404 });
    }

    if (!professional.googleTokens || !professional.googleTokens.refreshToken) {
      return NextResponse.json({ success: false, error: 'Google Agenda não integrada para este profissional.' }, { status: 400 });
    }

    const oAuth2Client = getOAuthClient();
    oAuth2Client.setCredentials({
      access_token: professional.googleTokens.accessToken,
      refresh_token: professional.googleTokens.refreshToken,
      expiry_date: professional.googleTokens.tokenExpiry ? new Date(professional.googleTokens.tokenExpiry).getTime() : null
    });

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    
    const event = {
      summary,
      description: description || '',
      start: { dateTime: start, timeZone: 'America/Sao_Paulo' },
      end: { dateTime: end, timeZone: 'America/Sao_Paulo' }
    };

    const response = await calendar.events.insert({
      calendarId: professional.googleTokens.calendarId || 'primary',
      requestBody: event
    });

    return NextResponse.json({ success: true, data: response.data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const professionalId = searchParams.get('professionalId');
    const eventId = searchParams.get('eventId');

    if (!professionalId || !eventId) {
      return NextResponse.json({ success: false, error: 'Parâmetros professionalId e eventId são obrigatórios.' }, { status: 400 });
    }

    const professional = await Professional.findById(professionalId);
    if (!professional) {
      return NextResponse.json({ success: false, error: 'Profissional não encontrado.' }, { status: 404 });
    }

    if (!professional.googleTokens || !professional.googleTokens.refreshToken) {
      return NextResponse.json({ success: false, error: 'Google Agenda não integrada para este profissional.' }, { status: 400 });
    }

    const oAuth2Client = getOAuthClient();
    oAuth2Client.setCredentials({
      access_token: professional.googleTokens.accessToken,
      refresh_token: professional.googleTokens.refreshToken,
      expiry_date: professional.googleTokens.tokenExpiry ? new Date(professional.googleTokens.tokenExpiry).getTime() : null
    });

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    await calendar.events.delete({
      calendarId: professional.googleTokens.calendarId || 'primary',
      eventId
    });

    return NextResponse.json({ success: true, message: 'Compromisso removido da Google Agenda.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
