import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Appointment from '@/models/Appointment';
import AgendaConfig from '@/models/AgendaConfig';
import Client from '@/models/Client';
import Professional from '@/models/Professional';

export const maxDuration = 30;

const SERVICOS_CONFIG: Record<string, { vagasOcupadas: number }> = {
  'Treino Monitorado':        { vagasOcupadas: 1 },
  'Treino Livre':             { vagasOcupadas: 0 },
  'Recovery':                 { vagasOcupadas: 1 },
  'Avaliação Física':         { vagasOcupadas: 3 },
  'Teste de Força':           { vagasOcupadas: 3 },
  'Avaliação Fisioterápica':  { vagasOcupadas: 3 },
  'Emergência':               { vagasOcupadas: 3 },
  'Terapia Manual':           { vagasOcupadas: 3 },
  'Massagem':                 { vagasOcupadas: 1 },
  'Consulta':                 { vagasOcupadas: 1 },
  'Quiropraxia':              { vagasOcupadas: 1 }
};

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // YYYY-MM-DD
    const diasSemanaParam = searchParams.get('diasSemana'); // e.g. "1,2,3,4,5"
    const tipoFiltro = searchParams.get('tipo') || 'academia'; // 'academia' | 'dr_albert' | 'dr_guilherme' | 'consultorio'
    const semanasParam = searchParams.get('semanas');
    const weeksToProject = semanasParam ? Math.min(12, Math.max(1, Number(semanasParam))) : 4;

    if (!date) {
      return NextResponse.json({ success: false, error: 'Data obrigatória' }, { status: 400 });
    }

    // Registrar models
    const _c = Client;
    const _p = Professional;

    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const dayNamesShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    // ─────────────────────────────────────────────────────────────
    // MODO MULTI-DIAS (Para Horários Fixos com múltiplos dias da semana)
    // ─────────────────────────────────────────────────────────────
    if (diasSemanaParam) {
      const selectedDays = diasSemanaParam
        .split(',')
        .map(d => Number(d.trim()))
        .filter(d => !isNaN(d) && d >= 1 && d <= 6); // 1 a 6 (Seg a Sáb)

      if (selectedDays.length === 0) {
        return NextResponse.json({ success: true, data: [], slots: [] });
      }

      // 1. Gerar todas as datas candidatas nas próximas N semanas
      const allTargetDates: { dateStr: string; dayOfWeek: number; dayName: string; dayShort: string; formatted: string }[] = [];
      const startDt = new Date(date + 'T12:00:00');

      for (let w = 0; w < weeksToProject; w++) {
        for (const d of selectedDays) {
          const target = new Date(startDt);
          const currentDay = target.getDay();
          let diff = d - currentDay;
          if (diff < 0) diff += 7;
          target.setDate(target.getDate() + diff + (w * 7));

          const dtStr = target.toISOString().split('T')[0];
          if (!allTargetDates.some(x => x.dateStr === dtStr)) {
            const dayNum = target.getDate().toString().padStart(2, '0');
            const monthNum = (target.getMonth() + 1).toString().padStart(2, '0');
            allTargetDates.push({
              dateStr: dtStr,
              dayOfWeek: d,
              dayName: dayNames[d],
              dayShort: dayNamesShort[d],
              formatted: `${dayNum}/${monthNum} (${dayNamesShort[d]})`
            });
          }
        }
      }

      allTargetDates.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
      const dateStrings = allTargetDates.map(d => d.dateStr);

      // 2. Buscar agendamentos e regras das datas
      const appointments = await Appointment.find({
        data: { $in: dateStrings },
        status: { $ne: 'cancelado' }
      })
        .populate('profissionalId')
        .lean();

      const configs = await AgendaConfig.find({
        $or: [
          { dataEspecifica: { $in: dateStrings } },
          { diaSemana: { $in: selectedDays }, dataEspecifica: null }
        ]
      }).lean();

      // 3. Determinar grade padrão
      const hasSaturday = selectedDays.includes(6);
      const hasWeekday = selectedDays.some(d => d >= 1 && d <= 5);

      let defaultSlots: string[] = [];
      if (tipoFiltro === 'dr_albert' || tipoFiltro === 'dr_guilherme' || tipoFiltro === 'consultorio') {
        defaultSlots = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];
      } else {
        defaultSlots = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
      }

      // Adições de horários extras
      const additions = configs.filter((c: any) => c.acao === 'adicionar' && c.tipo === (tipoFiltro === 'academia' ? 'academia' : tipoFiltro));
      for (const add of additions) {
        if (!defaultSlots.includes(add.horario)) {
          defaultSlots.push(add.horario);
        }
      }
      defaultSlots.sort((a, b) => a.localeCompare(b));

      // 4. Avaliar cada horário em todas as datas candidatas
      const result = defaultSlots.map(horario => {
        let minVagasLivres = tipoFiltro === 'academia' ? 6 : 1;
        let maxVagasOcupadas = 0;
        const conflitos: any[] = [];

        for (const target of allTargetDates) {
          // Checar bloqueios na data
          const specificBlock = configs.find((c: any) => c.horario === horario && c.acao === 'bloquear' && c.dataEspecifica === target.dateStr);
          const recurringBlock = configs.find((c: any) => c.horario === horario && c.acao === 'bloquear' && c.diaSemana === target.dayOfWeek && !c.dataEspecifica);

          if (specificBlock || recurringBlock) {
            minVagasLivres = 0;
            conflitos.push({
              data: target.dateStr,
              dataFormatada: target.formatted,
              diaSemana: target.dayName,
              horario,
              capacidade: 0,
              vagasOcupadas: 0,
              motivo: `Horário bloqueado na grade em ${target.formatted}`
            });
            continue;
          }

          // Capacidade personalizada
          const customCap = configs.find((c: any) => c.horario === horario && c.acao === 'alterar_capacidade' && (c.dataEspecifica === target.dateStr || (c.diaSemana === target.dayOfWeek && !c.dataEspecifica)));
          const capacidade = customCap?.capacidadePersonalizada !== undefined && customCap?.capacidadePersonalizada !== null
            ? customCap.capacidadePersonalizada
            : (tipoFiltro === 'academia' ? 6 : 1);

          // Agendamentos na data
          const slotsApts = appointments.filter((apt: any) => {
            if (apt.data !== target.dateStr || apt.horario !== horario) return false;
            if (tipoFiltro === 'dr_albert') {
              const profNome = (apt.profissionalId?.nome || apt.profissionalId?.dadosPessoais?.nome || '').toLowerCase();
              return apt.tipo === 'dr_albert' || (apt.tipo !== 'academia' && profNome.includes('albert'));
            }
            if (tipoFiltro === 'dr_guilherme') {
              const profNome = (apt.profissionalId?.nome || apt.profissionalId?.dadosPessoais?.nome || '').toLowerCase();
              return apt.tipo === 'dr_guilherme' || (apt.tipo !== 'academia' && profNome.includes('guilherme'));
            }
            return (apt.tipo || 'academia') === tipoFiltro;
          });

          let ocupadas = 0;
          if (tipoFiltro === 'dr_albert' || tipoFiltro === 'dr_guilherme' || tipoFiltro === 'consultorio') {
            ocupadas = slotsApts.length;
          } else {
            ocupadas = slotsApts.reduce((sum: number, apt: any) => {
              const cfg = SERVICOS_CONFIG[apt.servico] || { vagasOcupadas: 1 };
              return sum + cfg.vagasOcupadas;
            }, 0);
          }

          const livres = Math.max(0, capacidade - ocupadas);
          if (livres < minVagasLivres) {
            minVagasLivres = livres;
          }
          if (ocupadas > maxVagasOcupadas) {
            maxVagasOcupadas = ocupadas;
          }

          if (livres === 0) {
            conflitos.push({
              data: target.dateStr,
              dataFormatada: target.formatted,
              diaSemana: target.dayName,
              horario,
              capacidade,
              vagasOcupadas: ocupadas,
              motivo: `Lotado (${ocupadas}/${capacidade} vagas ocupadas em ${target.formatted})`
            });
          }
        }

        const capacidadeGeral = tipoFiltro === 'academia' ? 6 : 1;
        return {
          horario,
          capacidade: capacidadeGeral,
          tipo: tipoFiltro,
          vagasOcupadas: maxVagasOcupadas,
          vagasRestantes: minVagasLivres,
          minVagasLivres,
          disponivel: minVagasLivres > 0 && conflitos.length === 0,
          conflitos,
          totalDatasAvaliadas: allTargetDates.length
        };
      });

      return NextResponse.json({
        success: true,
        data: result,
        slots: result,
        isMultiDay: true,
        totalDatasAvaliadas: allTargetDates.length,
        datasAvaliadas: allTargetDates.map(d => d.formatted)
      });
    }

    // ─────────────────────────────────────────────────────────────
    // MODO DATA ÚNICA (Padrão para agendamentos avulsos)
    // ─────────────────────────────────────────────────────────────
    const parts = date.split('-');
    const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const dayOfWeek = dateObj.getDay();

    // 1. Determinar horários padrões
    let defaultAcademiaSlots: string[] = [];
    let defaultDoctorSlots: string[] = [];

    if (dayOfWeek !== 0) { // Domingo fechado
      if (dayOfWeek === 6) { // Sábado
        defaultAcademiaSlots = ['09:50', '10:40', '11:30', '12:25'];
        defaultDoctorSlots = [];
      } else { // Segunda a Sexta
        defaultAcademiaSlots = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
        defaultDoctorSlots = [
          '06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00',
          '15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'
        ];
      }
    }

    // 2. Buscar customizações da AgendaConfig
    const configs = await AgendaConfig.find({
      $or: [
        { dataEspecifica: date },
        { diaSemana: dayOfWeek, dataEspecifica: null }
      ]
    });

    const resolveSlots = (tipo: string, defaults: string[]) => {
      const rules = configs.filter(c => c.tipo === tipo);
      const specificRules = rules.filter(r => r.dataEspecifica === date);
      const recurringRules = rules.filter(r => r.diaSemana === dayOfWeek && !r.dataEspecifica);

      const getActiveRule = (h: string) => {
        const spec = specificRules.find(r => r.horario === h);
        if (spec) return spec;
        return recurringRules.find(r => r.horario === h);
      };

      let slots = [...defaults];
      const additions = rules.filter(r => r.acao === 'adicionar');
      for (const add of additions) {
        const active = getActiveRule(add.horario);
        if (active && active.acao === 'adicionar' && !slots.includes(add.horario)) {
          slots.push(add.horario);
        }
      }

      slots = slots.filter(h => {
        const active = getActiveRule(h);
        return !active || active.acao !== 'bloquear';
      });

      slots.sort((a, b) => a.localeCompare(b));

      return slots.map(horario => {
        const activeRule = getActiveRule(horario);
        let capacidade = tipo === 'academia' ? 6 : 1;
        if (activeRule && activeRule.acao === 'alterar_capacidade' && activeRule.capacidadePersonalizada !== null) {
          capacidade = activeRule.capacidadePersonalizada;
        }

        return { horario, capacidade, tipo };
      });
    };

    let resolvedSlots: any[] = [];
    if (tipoFiltro === 'dr_albert' || tipoFiltro === 'dr_guilherme') {
      resolvedSlots = resolveSlots(tipoFiltro, defaultDoctorSlots);
    } else if (tipoFiltro === 'consultorio') {
      resolvedSlots = resolveSlots('consultorio', defaultDoctorSlots);
    } else {
      resolvedSlots = resolveSlots('academia', defaultAcademiaSlots);
    }

    // 3. Buscar agendamentos existentes da data e popular
    const appointments = await Appointment.find({
      data: date,
      status: { $ne: 'cancelado' }
    })
      .populate({
        path: 'clienteId',
        populate: { path: 'dadosComerciais.planoId', select: 'nome tipo' }
      })
      .populate('profissionalId');

    const result = resolvedSlots.map(slot => {
      const slotsApts = appointments.filter(apt => {
        if (apt.horario !== slot.horario) return false;
        if (slot.tipo === 'dr_albert') {
          const profNome = (apt.profissionalId?.nome || apt.profissionalId?.dadosPessoais?.nome || '').toLowerCase();
          return apt.tipo === 'dr_albert' || (apt.tipo !== 'academia' && profNome.includes('albert'));
        }
        if (slot.tipo === 'dr_guilherme') {
          const profNome = (apt.profissionalId?.nome || apt.profissionalId?.dadosPessoais?.nome || '').toLowerCase();
          return apt.tipo === 'dr_guilherme' || (apt.tipo !== 'academia' && profNome.includes('guilherme'));
        }
        return apt.tipo === slot.tipo;
      });
      
      let totalVagasOcupadas = 0;
      if (slot.tipo === 'dr_albert' || slot.tipo === 'dr_guilherme' || slot.tipo === 'consultorio') {
        totalVagasOcupadas = slotsApts.length;
      } else {
        totalVagasOcupadas = slotsApts.reduce((sum, apt) => {
          const cfg = SERVICOS_CONFIG[apt.servico] || { vagasOcupadas: 1 };
          return sum + cfg.vagasOcupadas;
        }, 0);
      }

      const vagasRestantes = Math.max(0, slot.capacidade - totalVagasOcupadas);
      return {
        ...slot,
        vagasOcupadas: totalVagasOcupadas,
        vagasRestantes,
        minVagasLivres: vagasRestantes,
        disponivel: vagasRestantes > 0,
        conflitos: [],
        appointments: slotsApts
      };
    });

    return NextResponse.json({ 
      success: true, 
      data: result,
      slots: result 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
