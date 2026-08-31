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
    const tipoFiltro = searchParams.get('tipo') || 'academia'; // 'academia' | 'dr_albert' | 'dr_guilherme' | 'consultorio'

    if (!date) {
      return NextResponse.json({ success: false, error: 'Data obrigatória' }, { status: 400 });
    }

    // Registrar models
    const _c = Client;
    const _p = Professional;

    const parts = date.split('-');
    const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const dayOfWeek = dateObj.getDay();

    // 1. Determinar horários padrões
    let defaultAcademiaSlots: string[] = [];
    let defaultDoctorSlots: string[] = [];

    if (dayOfWeek !== 0) { // Domingo fechado
      if (dayOfWeek === 6) { // Sábado
        defaultAcademiaSlots = ['09:50', '10:40', '11:30', '12:25'];
        // Agendas dos médicos fechadas aos sábados por padrão (abertas apenas por Horário Extra)
        defaultDoctorSlots = [];
      } else { // Segunda a Sexta
        defaultAcademiaSlots = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
        // Dr. Albert e Dr. Guilherme: 06:00 às 22:00 (17 horários de 1 hora)
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
      // Priorizar regras de data específica sobre regras recorrentes
      const rules = configs.filter(c => c.tipo === tipo);
      
      const specificRules = rules.filter(r => r.dataEspecifica === date);
      const recurringRules = rules.filter(r => r.diaSemana === dayOfWeek && !r.dataEspecifica);

      // Função auxiliar para ver se há regra para um horário específico
      const getActiveRule = (h: string) => {
        const spec = specificRules.find(r => r.horario === h);
        if (spec) return spec;
        return recurringRules.find(r => r.horario === h);
      };

      // Iniciar lista de slots
      let slots = [...defaults];

      // Adicionar novos horários
      const additions = rules.filter(r => r.acao === 'adicionar');
      for (const add of additions) {
        const active = getActiveRule(add.horario);
        if (active && active.acao === 'adicionar' && !slots.includes(add.horario)) {
          slots.push(add.horario);
        }
      }

      // Remover horários bloqueados
      slots = slots.filter(h => {
        const active = getActiveRule(h);
        return !active || active.acao !== 'bloquear';
      });

      // Ordenar horários
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
      const slotsApts = appointments.filter(apt => apt.horario === slot.horario && apt.tipo === slot.tipo);
      
      let totalVagasOcupadas = 0;
      if (slot.tipo === 'dr_albert' || slot.tipo === 'dr_guilherme' || slot.tipo === 'consultorio') {
        // Nas agendas dedicadas Dr. Albert e Dr. Guilherme: 1 cliente = 1 vaga, independentemente do serviço
        totalVagasOcupadas = slotsApts.length;
      } else {
        // Na academia: avaliações ocupam 3 vagas, monitorado 1 vaga, livre 0 vagas
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
        disponivel: vagasRestantes > 0,
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
