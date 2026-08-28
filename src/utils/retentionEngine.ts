/**
 * Motor Unificado de Retenção & Frequência Semanal (Anti-Churn)
 * Clube Fitness
 */

export function dateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getWeekDates(baseDate: Date): Date[] {
  const d = new Date(baseDate);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=Dom
  // Primeira da semana = segunda (1), se dom retrocede 6
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMon);
  const dates: Date[] = [];
  for (let i = 0; i < 5; i++) { // Segunda a Sexta
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    dates.push(day);
  }
  return dates;
}

export function parseFrequenciaSemanal(freqStr: any): number {
  if (freqStr === undefined || freqStr === null) return 0;
  if (typeof freqStr === 'number') return freqStr;
  const str = String(freqStr);
  const match = str.match(/(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  const lower = str.toLowerCase();
  if (lower.includes('diár') || lower.includes('diar')) {
    return 5;
  }
  return 0;
}

export function getWeeklyFrequencyMetrics(
  client: any, 
  appointments: any[], 
  simulatedDateStr?: string
) {
  const freqStr = client.dadosComerciais?.frequencia;
  const freqSemanal = typeof freqStr === 'number' ? freqStr : parseFrequenciaSemanal(freqStr);
  if (freqSemanal === 0) {
    return {
      frequenciaSemanal: 0,
      realizados: 0,
      agendados: 0,
      pendentes: 0,
      diasRestantes: 0,
      alerta: false,
      status: 'ok' as const,
      simulatedTodayISO: simulatedDateStr || dateToISO(new Date()),
      dayOfWeek: new Date().getDay()
    };
  }

  const baseDate = simulatedDateStr ? new Date(simulatedDateStr + 'T00:00:00') : new Date();
  const dayOfWeek = baseDate.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb

  // dias_restantes_semana (Segunda a Sexta = 1 a 5)
  let diasRestantes = 0;
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    diasRestantes = 5 - dayOfWeek;
  } else if (dayOfWeek === 0 || dayOfWeek === 6) {
    diasRestantes = 0;
  }

  // Obter datas da semana atual baseada na data base
  const weekDates = getWeekDates(baseDate);
  const simulatedTodayISO = dateToISO(baseDate);

  // Filtrar agendamentos da semana atual (segunda a sexta)
  const mondayISO = dateToISO(weekDates[0]);
  const fridayISO = dateToISO(weekDates[weekDates.length - 1]);

  const weekApts = (appointments || []).filter(a => {
    const cid = a.clienteId && typeof a.clienteId === 'object' ? a.clienteId._id?.toString() : a.clienteId?.toString();
    return (
      cid === client._id?.toString() &&
      a.data >= mondayISO &&
      a.data <= fridayISO &&
      a.status !== 'cancelado'
    );
  });

  let realizados = 0;
  let agendados = 0;

  weekApts.forEach(apt => {
    if (apt.data < simulatedTodayISO) {
      if (apt.status === 'presenca') {
        realizados++;
      }
    } else if (apt.data > simulatedTodayISO) {
      if (apt.status === 'agendado') {
        agendados++;
      }
    } else { // apt.data === simulatedTodayISO
      if (apt.status === 'presenca') {
        realizados++;
      } else if (apt.status === 'agendado') {
        agendados++;
      }
    }
  });

  const pendentes = Math.max(0, freqSemanal - realizados - agendados);
  const alerta = diasRestantes <= pendentes && pendentes > 0;
  const status = pendentes === 0 ? 'ok' : (alerta ? 'at_risk' : 'in_progress');

  return {
    frequenciaSemanal: freqSemanal,
    realizados,
    agendados,
    pendentes,
    diasRestantes,
    alerta,
    status,
    simulatedTodayISO,
    dayOfWeek
  };
}
