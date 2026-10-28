/**
 * Reconciliação de Créditos no Banco de Dados (Server-side)
 * Sincroniza dadosComerciais do Cliente com o consumo real do ciclo vigente
 * Clube Fitness Fisio
 */

import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import Appointment from '@/models/Appointment';
import { calculateCycleCredits, getServiceCreditCategory } from '@/utils/creditReconciliation';

/**
 * Retorna os créditos já consumidos (presenças e faltas) pelo cliente no mês especificado (YYYY-MM).
 * Usado na validação de novos agendamentos para não misturar competências mensais.
 */
export async function getUsedCreditsInMonth(
  clienteId: string,
  tipoCredito: string,
  mesAgendamento: string,
  isDynamus = false
): Promise<number> {
  await dbConnect();

  const appointments = await Appointment.find({
    clienteId,
    data: new RegExp('^' + mesAgendamento),
    status: { $in: ['presenca', 'falta'] }
  }).lean();

  let totalUsed = 0;
  for (const apt of appointments) {
    const cfg = getServiceCreditCategory(apt.servico || apt.tipoServico || '', isDynamus);
    if (cfg.tipoCredito === tipoCredito) {
      totalUsed += cfg.cost;
    }
  }

  return totalUsed;
}

/**
 * Sincroniza atomicamente os dadosComerciais do cliente no MongoDB
 * refletindo o saldo exato do ciclo corrente (mês atual).
 */
export async function reconcileClientCreditsInDb(clientId: string) {
  await dbConnect();

  const client = await Client.findById(clientId).populate('dadosComerciais.planoId');
  if (!client) return null;

  const apts = await Appointment.find({ clienteId: clientId }).lean();
  const ledger = calculateCycleCredits(client, apts);

  if (!client.dadosComerciais) {
    client.dadosComerciais = {} as any;
  }

  // Atualizar contadores do ciclo corrente
  client.dadosComerciais.creditosUsados = ledger.academia.usados;
  client.dadosComerciais.creditosReservados = ledger.academia.reservados;

  client.dadosComerciais.creditosMassagemUsados = ledger.massagem.usados;
  client.dadosComerciais.creditosMassagemReservados = ledger.massagem.reservados;

  client.dadosComerciais.creditosEmergenciaUsados = ledger.emergencia.usados;
  client.dadosComerciais.creditosEmergenciaReservados = ledger.emergencia.reservados;

  await client.save();
  return ledger;
}
