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
  'Sessão de Fisioterapia':   { vagasOcupadas: 3 },
  'Atendimento Individual':   { vagasOcupadas: 3 },
  'Pilates':                  { vagasOcupadas: 2 },
  'Funcional':                { vagasOcupadas: 2 },
  'Massagem':                 { vagasOcupadas: 1 },
  'Consulta':                 { vagasOcupadas: 1 },
  'Quiropraxia':              { vagasOcupadas: 1 }
};

function getCapacidadeBase(tipo: string): number {
  if (tipo === 'dr_albert') return 2;
  if (tipo === 'dr_guilherme') return 1;
  return 6; // Academia / Geral
}

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // YYYY-MM-DD
    const diasSemanaParam = searchParams.get('diasSemana') || searchParams.get('daysOfWeek'); // e.g. "1,2,3,4,5"
    let tipoFiltro = searchParams.get('tipo') || searchParams.get('agendaTipo') || 'academia'; // 'academia' | 'dr_albert' | 'dr_guilherme'
    const servicoParam = searchParams.get('servico') || searchParams.get('service') || 'Treino Monitorado';
    const semanasParam = searchParams.get('semanas') || searchParams.get('weeks');
    const weeksToProject = semanasParam ? Math.min(24, Math.max(1, Number(semanasParam))) : 16;

    // Normalizar tipoFiltro caso venha com nomes legados
    if (tipoFiltro === 'albert') tipoFiltro = 'dr_albert';
    if (tipoFiltro === 'guilherme') tipoFiltro = 'dr_guilherme';

    // Suporte para quando passar profissionalId diretamente
    const profissionalIdParam = searchParams.get('profissionalId');
    if (profissionalIdParam && tipoFiltro === 'academia') {
      const profObj = await Professional.findById(profissionalIdParam).lean() as any;
      const pName = (profObj?.nome || '').toLowerCase();
      if (pName.includes('albert')) tipoFiltro = 'dr_albert';
      else if (pName.includes('guilherme')) tipoFiltro = 'dr_guilherme';
    }

    if (!date) {
      return NextResponse.json({ success: false, error: 'Data obrigatória' }, { status: 400 });
    }

    // Registrar models
    const _c = Client;
    const _p = Professional;

    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const dayNamesShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const servicoWeight = tipoFiltro === 'academia' 
      ? (SERVICOS_CONFIG[servicoParam]?.vagasOcupadas !== undefined ? SERVICOS_CONFIG[servicoParam].vagasOcupadas : 1)
      : 1;

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
            const yearNum = target.getFullYear();
            allTargetDates.push({
              dateStr: dtStr,
              dayOfWeek: d,
              dayName: dayNames[d],
              dayShort: dayNamesShort[d],
              formatted: `${dayNum}/${monthNum}/${yearNum} (${dayNamesShort[d]})`
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
      let defaultSlots: string[] = [];
      if (tipoFiltro === 'dr_albert' || tipoFiltro === 'dr_guilherme') {
        defaultSlots = [
          '06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00',
          '15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'
        ];
      } else {
        defaultSlots = [
          '06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00',
          '15:00','16:00','17:00','18:00','19:00','20:00'
        ];
      }

      // Adições de horários extras
      const additions = configs.filter((c: any) => c.acao === 'adicionar' && c.tipo === tipoFiltro);
      for (const add of additions) {
        if (!defaultSlots.includes(add.horario)) {
          defaultSlots.push(add.horario);
        }
      }
      defaultSlots.sort((a, b) => a.localeCompare(b));

      const capacidadeNominal = getCapacidadeBase(tipoFiltro);

      // Helper para calcular vagas ocupadas em um horário específico de uma data
      const getSlotOccupancy = (targetDateStr: string, targetDay: number, checkHour: string) => {
        const specificBlock = configs.find((c: any) => c.horario === checkHour && c.acao === 'bloquear' && c.dataEspecifica === targetDateStr);
        const recurringBlock = configs.find((c: any) => c.horario === checkHour && c.acao === 'bloquear' && c.diaSemana === targetDay && !c.dataEspecifica);
        if (specificBlock || recurringBlock) {
          return { bloqueado: true, capacidade: 0, ocupadas: 0, livres: 0 };
        }

        const customCap = configs.find((c: any) => c.horario === checkHour && c.acao === 'alterar_capacidade' && (c.dataEspecifica === targetDateStr || (c.diaSemana === targetDay && !c.dataEspecifica)));
        const cap = customCap?.capacidadePersonalizada !== undefined && customCap?.capacidadePersonalizada !== null
          ? customCap.capacidadePersonalizada
          : capacidadeNominal;

        const slotsApts = appointments.filter((apt: any) => {
          if (apt.data !== targetDateStr || apt.horario !== checkHour) return false;
          if (tipoFiltro === 'dr_albert') {
            const profNome = (apt.profissionalId?.nome || apt.profissionalId?.dadosPessoais?.nome || '').toLowerCase();
            return apt.tipo === 'dr_albert' || (apt.tipo !== 'academia' && profNome.includes('albert'));
          }
          if (tipoFiltro === 'dr_guilherme') {
            const profNome = (apt.profissionalId?.nome || apt.profissionalId?.dadosPessoais?.nome || '').toLowerCase();
            return apt.tipo === 'dr_guilherme' || (apt.tipo !== 'academia' && profNome.includes('guilherme'));
          }
          return (apt.tipo || 'academia') === 'academia';
        });

        let ocupadas = 0;
        if (tipoFiltro === 'dr_albert' || tipoFiltro === 'dr_guilherme') {
          ocupadas = slotsApts.length; // 1 paciente = 1 vaga
        } else {
          ocupadas = slotsApts.reduce((sum: number, apt: any) => {
            const cfg = SERVICOS_CONFIG[apt.servico] || { vagasOcupadas: 1 };
            return sum + cfg.vagasOcupadas;
          }, 0);
        }

        const livres = Math.max(0, cap - ocupadas);
        return { bloqueado: false, capacidade: cap, ocupadas, livres };
      };

      // 4. Avaliar cada horário em todas as datas candidatas
      const result = defaultSlots.map(horario => {
        let minVagasLivres = capacidadeNominal;
        let maxVagasOcupadas = 0;
        const conflitos: any[] = [];
        let datasLivresCount = 0;

        for (const target of allTargetDates) {
          const occ = getSlotOccupancy(target.dateStr, target.dayOfWeek, horario);

          if (occ.bloqueado) {
            minVagasLivres = 0;
            // Buscar sugestões de horários alternativos livres nesta data
            const alternativos = defaultSlots
              .filter(h => h !== horario)
              .map(h => ({ horario: h, ...getSlotOccupancy(target.dateStr, target.dayOfWeek, h) }))
              .filter(alt => !alt.bloqueado && alt.livres >= servicoWeight)
              .map(alt => ({ horario: alt.horario, vagasRestantes: alt.livres, capacidade: alt.capacidade }));

            conflitos.push({
              data: target.dateStr,
              dataFormatada: target.formatted,
              diaSemana: target.dayName,
              horario,
              capacidade: 0,
              vagasOcupadas: 0,
              vagasRestantes: 0,
              motivo: `Horário suspenso/bloqueado na grade em ${target.formatted}`,
              horariosAlternativos: alternativos
            });
            continue;
          }

          if (occ.livres < minVagasLivres) {
            minVagasLivres = occ.livres;
          }
          if (occ.ocupadas > maxVagasOcupadas) {
            maxVagasOcupadas = occ.ocupadas;
          }

          const comportaServico = occ.livres >= servicoWeight;
          if (comportaServico) {
            datasLivresCount++;
          } else {
            // Buscar sugestões de horários alternativos livres nesta data
            const alternativos = defaultSlots
              .filter(h => h !== horario)
              .map(h => ({ horario: h, ...getSlotOccupancy(target.dateStr, target.dayOfWeek, h) }))
              .filter(alt => !alt.bloqueado && alt.livres >= servicoWeight)
              .map(alt => ({ horario: alt.horario, vagasRestantes: alt.livres, capacidade: alt.capacidade }));

            const motivoTexto = tipoFiltro === 'dr_albert'
              ? `Horário lotado (${occ.ocupadas}/${occ.capacidade} pacientes em ${target.formatted})`
              : tipoFiltro === 'dr_guilherme'
              ? `Horário ocupado (1/1 paciente em ${target.formatted})`
              : `Vagas insuficientes (${occ.ocupadas}/${occ.capacidade} vagas ocupadas em ${target.formatted}, necessário ${servicoWeight})`;

            conflitos.push({
              data: target.dateStr,
              dataFormatada: target.formatted,
              diaSemana: target.dayName,
              horario,
              capacidade: occ.capacidade,
              vagasOcupadas: occ.ocupadas,
              vagasRestantes: occ.livres,
              motivo: motivoTexto,
              horariosAlternativos: alternativos
            });
          }
        }

        const totalDatas = allTargetDates.length;
        let status: 'livre' | 'conflito_parcial' | 'lotado' = 'livre';
        if (conflitos.length === 0) {
          status = 'livre';
        } else if (conflitos.length < totalDatas) {
          status = 'conflito_parcial';
        } else {
          status = 'lotado';
        }

        return {
          horario,
          capacidade: capacidadeNominal,
          tipo: tipoFiltro,
          vagasOcupadas: maxVagasOcupadas,
          vagasRestantes: minVagasLivres,
          minVagasLivres,
          totalDatasAvaliadas: totalDatas,
          totalDatasLivres: datasLivresCount,
          totalConflitos: conflitos.length,
          status,
          disponivel: conflitos.length === 0,
          conflitos,
          datasConflito: conflitos
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
    let defaultSlots: string[] = [];

    if (dayOfWeek !== 0) { // Domingo fechado
      if (dayOfWeek === 6) { // Sábado
        if (tipoFiltro === 'academia') {
          defaultSlots = ['09:50', '10:40', '11:30', '12:25'];
        } else {
          defaultSlots = [];
        }
      } else { // Segunda a Sexta
        if (tipoFiltro === 'dr_albert' || tipoFiltro === 'dr_guilherme') {
          defaultSlots = [
            '06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00',
            '15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'
          ];
        } else {
          defaultSlots = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
        }
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
        let capacidade = getCapacidadeBase(tipo);
        if (activeRule && activeRule.acao === 'alterar_capacidade' && activeRule.capacidadePersonalizada !== null) {
          capacidade = activeRule.capacidadePersonalizada;
        }

        return { horario, capacidade, tipo };
      });
    };

    const resolvedSlots = resolveSlots(tipoFiltro, defaultSlots);

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
        return (apt.tipo || 'academia') === 'academia';
      });
      
      let totalVagasOcupadas = 0;
      if (slot.tipo === 'dr_albert' || slot.tipo === 'dr_guilherme') {
        totalVagasOcupadas = slotsApts.length; // 1 paciente = 1 vaga
      } else {
        totalVagasOcupadas = slotsApts.reduce((sum, apt) => {
          const cfg = SERVICOS_CONFIG[apt.servico] || { vagasOcupadas: 1 };
          return sum + cfg.vagasOcupadas;
        }, 0);
      }

      const vagasRestantes = Math.max(0, slot.capacidade - totalVagasOcupadas);
      const disponivel = vagasRestantes >= servicoWeight;

      return {
        ...slot,
        vagasOcupadas: totalVagasOcupadas,
        vagasRestantes,
        minVagasLivres: vagasRestantes,
        disponivel,
        status: disponivel ? 'livre' : 'lotado',
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
