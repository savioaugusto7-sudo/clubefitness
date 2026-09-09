import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import PontoRecord from '@/models/PontoRecord';
import ProfessionalSchedule from '@/models/ProfessionalSchedule';
import Professional from '@/models/Professional';
import Settings from '@/models/Settings';

export const maxDuration = 30;

// Fórmula de Haversine para calcular distância em metros entre duas coordenadas
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Obter data e hora local no fuso horário do Brasil (America/Sao_Paulo)
function getBrazilDateTime() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(now);
  const findPart = (t: string) => parts.find(p => p.type === t)?.value || '';

  const year = findPart('year');
  const month = findPart('month');
  const day = findPart('day');
  const hour = findPart('hour');
  const minute = findPart('minute');
  const second = findPart('second');

  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${hour}:${minute}:${second}`;
  const timeHm = `${hour}:${minute}`;

  // Calcular dia da semana em SP
  const dateObj = new Date(`${dateStr}T12:00:00.000Z`);
  const dayOfWeek = dateObj.getUTCDay(); // 0 = Domingo, 1 = Segunda, ...

  return { dateStr, timeStr, timeHm, dayOfWeek, hour: parseInt(hour, 10), minute: parseInt(minute, 10) };
}

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const professionalId = searchParams.get('professionalId');

    if (!professionalId) {
      return NextResponse.json({ success: false, error: 'ID do profissional é obrigatório.' }, { status: 400 });
    }

    const { dateStr, dayOfWeek, timeHm } = getBrazilDateTime();
    const currentMonthPrefix = dateStr.slice(0, 7); // "YYYY-MM"

    // 1. Buscar dados do profissional
    const prof = await Professional.findById(professionalId).lean();
    if (!prof) {
      return NextResponse.json({ success: false, error: 'Profissional não encontrado.' }, { status: 404 });
    }

    // 2. Buscar ou criar escala individual do profissional
    let schedule = await ProfessionalSchedule.findOne({ profissionalId }).lean();
    if (!schedule) {
      // Escala padrão padrão
      schedule = {
        profissionalId,
        profissionalNome: prof.nome,
        diasSemana: {
          '0': { ativo: false, horarioEntrada: '08:00', horarioSaida: '12:00', periodoNome: 'Domingo' },
          '1': { ativo: true, horarioEntrada: '08:00', horarioSaida: '14:00', periodoNome: 'Manhã' },
          '2': { ativo: true, horarioEntrada: '08:00', horarioSaida: '14:00', periodoNome: 'Manhã' },
          '3': { ativo: true, horarioEntrada: '08:00', horarioSaida: '14:00', periodoNome: 'Manhã' },
          '4': { ativo: true, horarioEntrada: '08:00', horarioSaida: '14:00', periodoNome: 'Manhã' },
          '5': { ativo: true, horarioEntrada: '08:00', horarioSaida: '14:00', periodoNome: 'Manhã' },
          '6': { ativo: false, horarioEntrada: '08:00', horarioSaida: '12:00', periodoNome: 'Sábado' }
        },
        folgasEspecificas: []
      };
    }

    // 3. Avaliar se hoje é dia de folga
    const dayConfig = (schedule.diasSemana as any)?.[String(dayOfWeek)] || { ativo: true, horarioEntrada: '08:00', horarioSaida: '14:00', periodoNome: 'Geral' };
    const folgaEspecifica = (schedule.folgasEspecificas || []).find((f: any) => f.data === dateStr);
    const isFolga = !dayConfig.ativo || Boolean(folgaEspecifica);
    const motivoFolga = folgaEspecifica?.motivo || (!dayConfig.ativo ? 'Folga semanal programada' : '');

    // 4. Buscar registro de ponto de hoje
    const todayRecord = await PontoRecord.findOne({
      profissionalId,
      data: dateStr
    }).lean();

    // 5. Buscar histórico do mês atual
    const monthRecords = await PontoRecord.find({
      profissionalId,
      data: { $regex: `^${currentMonthPrefix}` }
    }).sort({ data: -1, horario: -1 }).lean();

    // 6. Buscar configurações da clínica (coordenadas e raio)
    const clinicSetting = await Settings.findOne({ key: 'clinic_location' }).lean();
    const clinicLocation = clinicSetting?.value || {
      latitude: -19.9234, // Fallback configurável
      longitude: -43.9372,
      radiusMeters: 150,
      nome: 'Clube Fitness Fisio',
      endereco: 'Sede da Clínica'
    };

    return NextResponse.json({
      success: true,
      data: {
        hoje: {
          data: dateStr,
          horarioAtual: timeHm,
          diaSemana: dayOfWeek,
          horarioEsperado: dayConfig.horarioEntrada || '08:00',
          horarioSaida: dayConfig.horarioSaida || '14:00',
          periodoNome: dayConfig.periodoNome || 'Manhã',
          isFolga,
          motivoFolga,
          registroHoje: todayRecord || null
        },
        clinicLocation: {
          latitude: clinicLocation.latitude,
          longitude: clinicLocation.longitude,
          radiusMeters: clinicLocation.radiusMeters || 150,
          nome: clinicLocation.nome || 'Clube Fitness Fisio',
          endereco: clinicLocation.endereco || ''
        },
        monthRecords: monthRecords || [],
        resumoMes: {
          totalDiasTrabalhados: monthRecords.length,
          totalAtrasosMinutos: monthRecords.reduce((acc: number, r: any) => acc + (r.minutosAtraso || 0), 0),
          totalDebitosPontos: monthRecords.reduce((acc: number, r: any) => acc + (r.status === 'valido' ? (r.pontosDebito || 0) : 0), 0)
        }
      }
    });
  } catch (error: any) {
    console.error('Erro na API de Ponto (GET):', error);
    return NextResponse.json({ success: false, error: error.message || 'Erro ao carregar dados de ponto.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const {
      profissionalId,
      latitude,
      longitude,
      accuracy,
      dispositivoInfo
    } = body;

    if (!profissionalId) {
      return NextResponse.json({ success: false, error: 'ID do profissional é obrigatório.' }, { status: 400 });
    }

    const { dateStr, timeStr, timeHm, dayOfWeek, hour, minute } = getBrazilDateTime();

    // 1. Buscar profissional
    const prof = await Professional.findById(profissionalId);
    if (!prof) {
      return NextResponse.json({ success: false, error: 'Profissional não encontrado.' }, { status: 404 });
    }

    // 2. Verificar se já bateu ponto hoje
    const existing = await PontoRecord.findOne({
      profissionalId,
      data: dateStr
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        error: `Você já registrou seu ponto de entrada hoje às ${existing.horario}.`,
        data: existing
      }, { status: 400 });
    }

    // 3. Obter configurações de localização da clínica
    const clinicSetting = await Settings.findOne({ key: 'clinic_location' }).lean();
    const clinicLoc = clinicSetting?.value || {
      latitude: -19.9234,
      longitude: -43.9372,
      radiusMeters: 150
    };

    let distanciaMetros = 0;
    let dentroPerimetro = true;

    if (clinicLoc.latitude && clinicLoc.longitude) {
      if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
        return NextResponse.json({
          success: false,
          error: 'Localização GPS não fornecida ou desativada. Ative o GPS para registrar o ponto.'
        }, { status: 400 });
      }

      distanciaMetros = calculateDistanceMeters(
        Number(latitude),
        Number(longitude),
        Number(clinicLoc.latitude),
        Number(clinicLoc.longitude)
      );

      const maxRadius = Number(clinicLoc.radiusMeters) || 150;
      if (distanciaMetros > maxRadius) {
        dentroPerimetro = false;
        return NextResponse.json({
          success: false,
          error: `Você está fora da clínica (${distanciaMetros}m de distância). O registro de ponto é permitido apenas dentro do raio de ${maxRadius}m.`,
          distanciaMetros,
          maxRadius
        }, { status: 403 });
      }
    }

    // 4. Buscar escala individual do profissional para o dia
    const schedule = await ProfessionalSchedule.findOne({ profissionalId }).lean();
    const dayConfig = (schedule?.diasSemana as any)?.[String(dayOfWeek)] || { ativo: true, horarioEntrada: '08:00', horarioSaida: '14:00', periodoNome: 'Manhã' };
    const folgaEspecifica = (schedule?.folgasEspecificas || []).find((f: any) => f.data === dateStr);
    const isFolga = !dayConfig.ativo || Boolean(folgaEspecifica);

    const horarioEsperado = dayConfig.horarioEntrada || '08:00';
    const periodoCobertura = `${dayConfig.horarioEntrada || '08:00'} - ${dayConfig.horarioSaida || '14:00'}`;

    // 5. Calcular atraso em minutos e débito de pontos
    let minutosAtraso = 0;
    let pontosDebito = 0;

    if (!isFolga && horarioEsperado) {
      const [expH, expM] = horarioEsperado.split(':').map(Number);
      const expectedTotalMinutes = (expH || 0) * 60 + (expM || 0);
      const currentTotalMinutes = hour * 60 + minute;

      if (currentTotalMinutes > expectedTotalMinutes) {
        minutosAtraso = currentTotalMinutes - expectedTotalMinutes;
        pontosDebito = minutosAtraso * 1; // 1 pt por minuto de atraso
      }
    }

    // 6. Criar e salvar o registro de ponto
    const pontoRecord = new PontoRecord({
      profissionalId,
      userId: prof.userId,
      profissionalNome: prof.nome,
      data: dateStr,
      horario: timeStr,
      tipo: 'entrada',
      horarioEsperado,
      periodoCobertura,
      minutosAtraso,
      pontosDebito,
      localizacao: {
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        accuracy: accuracy ? Number(accuracy) : null,
        distanciaMetros,
        dentroPerimetro
      },
      status: 'valido',
      dispositivoInfo: dispositivoInfo || ''
    });

    await pontoRecord.save();

    return NextResponse.json({
      success: true,
      data: pontoRecord,
      message: minutosAtraso > 0
        ? `Ponto registrado às ${timeHm}. Atenção: ${minutosAtraso} minuto(s) de atraso (${pontosDebito} pts de débito na meta).`
        : `Ponto registrado às ${timeHm} com sucesso! Pontualidade 100% (0 débitos).`
    });
  } catch (error: any) {
    console.error('Erro ao registrar ponto (POST):', error);
    return NextResponse.json({ success: false, error: error.message || 'Erro ao registrar ponto.' }, { status: 500 });
  }
}
