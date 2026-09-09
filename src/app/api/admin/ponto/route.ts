import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import PontoRecord from '@/models/PontoRecord';
import ProfessionalSchedule from '@/models/ProfessionalSchedule';
import Professional from '@/models/Professional';
import Settings from '@/models/Settings';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const profissionalId = searchParams.get('profissionalId');
    const mes = searchParams.get('mes'); // "YYYY-MM"
    const dataFiltro = searchParams.get('data'); // "YYYY-MM-DD"
    const apenasAtrasos = searchParams.get('apenasAtrasos') === 'true';

    // 1. Buscar todos os profissionais
    const professionals = await Professional.find({}).sort({ nome: 1 }).lean();

    // 2. Buscar todas as escalas cadastradas
    const schedules = await ProfessionalSchedule.find({}).lean();
    const scheduleMap = new Map<string, any>();
    schedules.forEach((s: any) => scheduleMap.set(String(s.profissionalId), s));

    // 3. Montar query para registros de ponto
    const query: any = {};
    if (profissionalId && profissionalId !== 'todos') {
      query.profissionalId = profissionalId;
    }
    if (dataFiltro) {
      query.data = dataFiltro;
    } else if (mes) {
      query.data = { $regex: `^${mes}` };
    }
    if (apenasAtrasos) {
      query.minutosAtraso = { $gt: 0 };
    }

    const records = await PontoRecord.find(query).sort({ data: -1, horario: -1 }).lean();

    // 4. Buscar configurações da clínica
    const clinicSetting = await Settings.findOne({ key: 'clinic_location' }).lean();
    const clinicLocation = clinicSetting?.value || {
      latitude: -19.9234,
      longitude: -43.9372,
      radiusMeters: 150,
      nome: 'Clube Fitness Fisio',
      endereco: 'Sede da Clínica'
    };

    return NextResponse.json({
      success: true,
      data: {
        professionals,
        schedules,
        records,
        clinicLocation
      }
    });
  } catch (error: any) {
    console.error('Erro na API Admin de Ponto (GET):', error);
    return NextResponse.json({ success: false, error: error.message || 'Erro ao carregar dados administrativos de ponto.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { action, profissionalId, diasSemana, folgasEspecificas, clinicLocation } = body;

    // Ação 1: Atualizar Escala Semanal e Folgas de um Profissional Individual
    if (action === 'save_schedule' || profissionalId) {
      if (!profissionalId) {
        return NextResponse.json({ success: false, error: 'ID do profissional é obrigatório.' }, { status: 400 });
      }

      const prof = await Professional.findById(profissionalId).lean();
      if (!prof) {
        return NextResponse.json({ success: false, error: 'Profissional não encontrado.' }, { status: 404 });
      }

      const updated = await ProfessionalSchedule.findOneAndUpdate(
        { profissionalId },
        {
          profissionalId,
          profissionalNome: prof.nome,
          diasSemana: diasSemana || {},
          folgasEspecificas: folgasEspecificas || []
        },
        { new: true, upsert: true }
      );

      return NextResponse.json({
        success: true,
        data: updated,
        message: `Escala e folgas de ${prof.nome} atualizadas com sucesso!`
      });
    }

    // Ação 2: Atualizar Coordenadas e Raio da Sede da Clínica
    if (action === 'save_clinic_location' || clinicLocation) {
      if (!clinicLocation || !clinicLocation.latitude || !clinicLocation.longitude) {
        return NextResponse.json({ success: false, error: 'Latitude e Longitude são obrigatórias.' }, { status: 400 });
      }

      const setting = await Settings.findOneAndUpdate(
        { key: 'clinic_location' },
        {
          value: {
            latitude: Number(clinicLocation.latitude),
            longitude: Number(clinicLocation.longitude),
            radiusMeters: Number(clinicLocation.radiusMeters) || 150,
            nome: clinicLocation.nome || 'Clube Fitness Fisio',
            endereco: clinicLocation.endereco || ''
          }
        },
        { new: true, upsert: true }
      );

      return NextResponse.json({
        success: true,
        data: setting.value,
        message: 'Coordenadas e raio da clínica atualizados com sucesso!'
      });
    }

    return NextResponse.json({ success: false, error: 'Ação não especificada.' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro na API Admin de Ponto (POST):', error);
    return NextResponse.json({ success: false, error: error.message || 'Erro ao salvar dados administrativos.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { recordId, status, justificativaAdmin } = body;

    if (!recordId) {
      return NextResponse.json({ success: false, error: 'ID do registro de ponto é obrigatório.' }, { status: 400 });
    }

    const updated = await PontoRecord.findByIdAndUpdate(
      recordId,
      {
        status: status || 'abonado',
        justificativaAdmin: justificativaAdmin || ''
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Registro de ponto não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: status === 'abonado'
        ? 'Atraso abonado com sucesso! Os pontos de débito foram removidos da meta.'
        : 'Status do registro atualizado com sucesso.'
    });
  } catch (error: any) {
    console.error('Erro ao atualizar registro de ponto (PUT):', error);
    return NextResponse.json({ success: false, error: error.message || 'Erro ao atualizar registro de ponto.' }, { status: 500 });
  }
}
