import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import mongoose from 'mongoose';

// Rota para limpar todos os dados fictícios do banco
// GET /api/admin/clean-demo?secret=clubefix2024
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== 'clubefix2024') {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }

  await dbConnect();
  const db = mongoose.connection.db!;

  const results: Record<string, number> = {};

  // E-mails que devem ser PRESERVADOS (contas reais)
  const emailsProtegidos = ['savioaugusto7@gmail.com'];

  // 1. Buscar IDs dos usuários reais para preservar
  const usersCol = db.collection('users');
  const usuariosReais = await usersCol.find({ email: { $in: emailsProtegidos } }).toArray();
  const idsProtegidos = usuariosReais.map(u => u._id);

  // 2. Buscar IDs dos clientes fictícios (userId não está entre os reais)
  const clientsCol = db.collection('clients');
  const clientesFicticios = await clientsCol.find({ userId: { $nin: idsProtegidos } }).toArray();
  const clienteIds = clientesFicticios.map(c => c._id);
  const clienteUserIds = clientesFicticios.map(c => c.userId);

  // 3. Buscar IDs dos profissionais fictícios
  const profCol = db.collection('professionals');
  const profFicticios = await profCol.find({}).toArray();
  const profIds = profFicticios.map(p => p._id);
  const profUserIds = profFicticios.map(p => p.userId);

  // 4. Deletar appointments vinculados a clientes/profissionais fictícios
  const aptsCol = db.collection('appointments');
  const rApts = await aptsCol.deleteMany({
    $or: [
      { clienteId: { $in: clienteIds } },
      { profissionalId: { $in: profIds } }
    ]
  });
  results['agendamentos'] = rApts.deletedCount;

  // 5. Deletar workouts
  const workoutsCol = db.collection('workouts');
  const rWork = await workoutsCol.deleteMany({ clienteId: { $in: clienteIds } });
  results['fichas_treino'] = rWork.deletedCount;

  // 6. Deletar assessments
  const assessCol = db.collection('assessments');
  const rAss = await assessCol.deleteMany({ clienteId: { $in: clienteIds } });
  results['avaliacoes'] = rAss.deletedCount;

  // 7. Deletar reports
  const reportsCol = db.collection('reports');
  const rRep = await reportsCol.deleteMany({ clienteId: { $in: clienteIds } });
  results['relatorios'] = rRep.deletedCount;

  // 8. Deletar strength-tests
  const stCol = db.collection('strengthtests');
  const rSt = await stCol.deleteMany({ clienteId: { $in: clienteIds } });
  results['testes_forca'] = rSt.deletedCount;

  // 9. Deletar contracts
  const contractsCol = db.collection('contracts');
  const rCon = await contractsCol.deleteMany({ clienteId: { $in: clienteIds } });
  results['contratos'] = rCon.deletedCount;

  // 10. Deletar prontuarios
  const prontuariosCol = db.collection('prontuarios');
  const rPron = await prontuariosCol.deleteMany({ clienteId: { $in: clienteIds } });
  results['prontuarios'] = rPron.deletedCount;

  // 11. Deletar fixed-schedules
  const schedCol = db.collection('fixedschedules');
  const rSched = await schedCol.deleteMany({ clienteId: { $in: clienteIds } });
  results['horarios_fixos'] = rSched.deletedCount;

  // 12. Deletar financial records
  const finCol = db.collection('financials');
  const rFin = await finCol.deleteMany({ clienteId: { $in: clienteIds } });
  results['financeiro'] = rFin.deletedCount;

  // 13. Deletar clientes fictícios
  const rClients = await clientsCol.deleteMany({ userId: { $nin: idsProtegidos } });
  results['clientes'] = rClients.deletedCount;

  // 14. Deletar profissionais fictícios
  const rProf = await profCol.deleteMany({});
  results['profissionais'] = rProf.deletedCount;

  // 15. Deletar usuários fictícios (todos exceto os protegidos)
  const rUsers = await usersCol.deleteMany({ _id: { $nin: idsProtegidos } });
  results['usuarios'] = rUsers.deletedCount;

  // 16. Deletar planos
  const plansCol = db.collection('plans');
  const rPlans = await plansCol.deleteMany({});
  results['planos'] = rPlans.deletedCount;

  // 17. Deletar medicamentos
  const medCol = db.collection('medications');
  const rMed = await medCol.deleteMany({});
  results['medicamentos'] = rMed.deletedCount;

  const totalDeletado = Object.values(results).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    success: true,
    message: `✅ Limpeza concluída! ${totalDeletado} registros fictícios removidos.`,
    detalhes: results,
    preservados: emailsProtegidos,
  });
}
