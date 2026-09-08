import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Professional from '@/models/Professional';
import Client from '@/models/Client';
import PhysicalAssessment from '@/models/PhysicalAssessment';
import StrengthTest from '@/models/StrengthTest';
import PhysioReport from '@/models/PhysioReport';
import ClientWorkout from '@/models/ClientWorkout';
import Appointment from '@/models/Appointment';

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);

    const now = new Date();
    const currentYearMonth = now.toISOString().slice(0, 7); // "YYYY-MM"
    const mesParam = searchParams.get('mes') || currentYearMonth;

    const [yearStr, monthStr] = mesParam.split('-');
    const year = parseInt(yearStr, 10) || now.getFullYear();
    const month = parseInt(monthStr, 10) || (now.getMonth() + 1);

    const firstDayStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

    const startOfMonthDate = new Date(`${firstDayStr}T00:00:00.000Z`);
    const endOfMonthDate = new Date(`${lastDayStr}T23:59:59.999Z`);

    // 1. Buscar todos os profissionais ativos
    const professionals = await Professional.find({}).lean();
    if (!professionals || professionals.length === 0) {
      return NextResponse.json({ success: true, data: { ranking: [], kpis: {}, mes: mesParam } });
    }

    // 2. Buscar todos os clientes
    const clients = await Client.find({}).lean();
    const clientMap = new Map<string, any>();
    clients.forEach((c: any) => clientMap.set(String(c._id), c));

    // Filtrar clientes ativos no período
    const activeClients = clients.filter((c: any) => {
      const st = c.dadosComerciais?.status;
      return st === 'ativo' || st === 'pendente';
    });

    // 3. Buscar Avaliações Físicas, Testes de Força e Relatórios do mês
    const [monthAssessments, monthStrengthTests, monthReports, allWorkouts, monthAppointments] = await Promise.all([
      PhysicalAssessment.find({
        data: { $gte: firstDayStr, $lte: lastDayStr }
      }).lean(),
      StrengthTest.find({
        data: { $gte: firstDayStr, $lte: lastDayStr }
      }).lean(),
      PhysioReport.find({
        data: { $gte: firstDayStr, $lte: lastDayStr }
      }).lean(),
      ClientWorkout.find({}).lean(),
      Appointment.find({
        data: { $gte: firstDayStr, $lte: lastDayStr }
      }).lean()
    ]);

    // Mapear fichas de treino por cliente e data
    const workoutUpdateEvents: Array<{
      clientId: string;
      profId?: string;
      profNome?: string;
      data: string;
      updatedAt?: Date;
      sheetName: string;
      sheetType: 'monitorado' | 'livre';
    }> = [];

    allWorkouts.forEach((w: any) => {
      const cId = String(w.clienteId);
      (w.fichasMonitorado || []).forEach((f: any) => {
        if (f.ultimaAtualizacao && f.ultimaAtualizacao >= firstDayStr && f.ultimaAtualizacao <= lastDayStr) {
          workoutUpdateEvents.push({
            clientId: cId,
            profId: f.profissionalId ? String(f.profissionalId) : undefined,
            profNome: f.profissionalNome || '',
            data: f.ultimaAtualizacao,
            updatedAt: w.updatedAt ? new Date(w.updatedAt) : undefined,
            sheetName: f.nome || `Ficha ${f.id}`,
            sheetType: 'monitorado'
          });
        }
      });
      (w.fichasLivre || []).forEach((f: any) => {
        if (f.ultimaAtualizacao && f.ultimaAtualizacao >= firstDayStr && f.ultimaAtualizacao <= lastDayStr) {
          workoutUpdateEvents.push({
            clientId: cId,
            profId: f.profissionalId ? String(f.profissionalId) : undefined,
            profNome: f.profissionalNome || '',
            data: f.ultimaAtualizacao,
            updatedAt: w.updatedAt ? new Date(w.updatedAt) : undefined,
            sheetName: f.nome || `Ficha ${f.id}`,
            sheetType: 'livre'
          });
        }
      });
    });

    // Estrutura de pontuação por profissional
    interface ProfScoreData {
      prof: any;
      creditosIndividuais: number;
      debitosIndividuais: number;
      creditosColetivos: number;
      debitosColetivos: number;
      pontosLiquidos: number;
      detalhes: {
        avaliacoesPrazo: number;
        avaliacoesPrazoPts: number;
        testesForcaPrazo: number;
        testesForcaPrazoPts: number;
        fichas24h: number;
        fichas24hPts: number;
        relatoriosPrazo: number;
        relatoriosPrazoPts: number;
        semFichaApos24h: number;
        semFichaApos24hDebito: number;
        alunosVencidos2m: number;
        alunosVencidos2mDebito: number;
        retencaoAltaAlunos: number;
        retencaoAltaPts: number;
        retencaoBaixaAlunos: number;
        retencaoBaixaDebito: number;
        treinoLivreAtivoAlunos: number;
        treinoLivreAtivoPts: number;
        treinoLivreInativoAlunos: number;
        treinoLivreInativoDebito: number;
        emergenciaOkAlunos: number;
        emergenciaOkPts: number;
        emergenciaExtraAlunos: number;
        emergenciaExtraDebito: number;
      };
      extratoCreditos: Array<{
        tipo: string;
        descricao: string;
        alunoNome: string;
        data: string;
        tempoGasto?: string;
        pontos: number;
      }>;
      extratoDebitos: Array<{
        tipo: string;
        motivo: string;
        alunoNome: string;
        data: string;
        pontosDebito: number;
      }>;
    }

    const profScoresMap = new Map<string, ProfScoreData>();

    professionals.forEach((p: any) => {
      const pId = String(p._id);
      profScoresMap.set(pId, {
        prof: p,
        creditosIndividuais: 0,
        debitosIndividuais: 0,
        creditosColetivos: 0,
        debitosColetivos: 0,
        pontosLiquidos: 0,
        detalhes: {
          avaliacoesPrazo: 0,
          avaliacoesPrazoPts: 0,
          testesForcaPrazo: 0,
          testesForcaPrazoPts: 0,
          fichas24h: 0,
          fichas24hPts: 0,
          relatoriosPrazo: 0,
          relatoriosPrazoPts: 0,
          semFichaApos24h: 0,
          semFichaApos24hDebito: 0,
          alunosVencidos2m: 0,
          alunosVencidos2mDebito: 0,
          retencaoAltaAlunos: 0,
          retencaoAltaPts: 0,
          retencaoBaixaAlunos: 0,
          retencaoBaixaDebito: 0,
          treinoLivreAtivoAlunos: 0,
          treinoLivreAtivoPts: 0,
          treinoLivreInativoAlunos: 0,
          treinoLivreInativoDebito: 0,
          emergenciaOkAlunos: 0,
          emergenciaOkPts: 0,
          emergenciaExtraAlunos: 0,
          emergenciaExtraDebito: 0
        },
        extratoCreditos: [],
        extratoDebitos: []
      });
    });

    // =========================================================================
    // 1. PROCESSAR AVALIAÇÕES FÍSICAS (+4 pts se ≤ 1h, antifraude > 60s)
    //    E DÉBITO (-2 pts se após 24h não houver ficha criada/atualizada)
    // =========================================================================
    monthAssessments.forEach((ass: any) => {
      const pId = String(ass.avaliadorId?._id || ass.avaliadorId);
      const targetScore = profScoresMap.get(pId);
      const cObj = clientMap.get(String(ass.clienteId?._id || ass.clienteId));
      const alunoNome = cObj?.dadosPessoais?.nome || cObj?.nome || 'Aluno';

      const tempoGasto = Number(ass.tempoGastoSegundos) || 0;
      const dataAssStr = ass.data || ass.createdAt?.toISOString().split('T')[0] || '';

      // Crédito: Concluída dentro de 1h (entre 60s e 3600s)
      if (tempoGasto >= 60 && tempoGasto <= 3600) {
        if (targetScore) {
          targetScore.detalhes.avaliacoesPrazo++;
          targetScore.detalhes.avaliacoesPrazoPts += 4;
          targetScore.creditosIndividuais += 4;
          targetScore.extratoCreditos.push({
            tipo: 'Avaliação Física',
            descricao: 'Avaliação física concluída dentro do SLA (≤ 1h)',
            alunoNome,
            data: dataAssStr,
            tempoGasto: `${Math.floor(tempoGasto / 60)}m ${tempoGasto % 60}s`,
            pontos: 4
          });
        }
      }

      // Débito Antifraude / SLA Ficha: verificar se foi criada/atualizada ficha em até 24h
      const hasWorkoutWithin24h = workoutUpdateEvents.some(w => {
        if (w.clientId !== String(ass.clienteId?._id || ass.clienteId)) return false;
        const assTime = new Date(ass.createdAt || `${dataAssStr}T12:00:00`).getTime();
        const wTime = new Date(w.updatedAt || `${w.data}T12:00:00`).getTime();
        const diffHours = (wTime - assTime) / (1000 * 60 * 60);
        return diffHours >= 0 && diffHours <= 24;
      });

      // Se já passaram mais de 24h da avaliação e não há ficha correspondente: débito -2 pts
      const assAgeHours = (Date.now() - new Date(ass.createdAt || `${dataAssStr}T12:00:00`).getTime()) / (1000 * 60 * 60);
      if (!hasWorkoutWithin24h && assAgeHours > 24) {
        if (targetScore) {
          targetScore.detalhes.semFichaApos24h++;
          targetScore.detalhes.semFichaApos24hDebito += 2;
          targetScore.debitosIndividuais += 2;
          targetScore.extratoDebitos.push({
            tipo: 'Ficha Não Prescrita (SLA 24h)',
            motivo: 'Avaliação física realizada sem ficha de treino atualizada em até 24h',
            alunoNome,
            data: dataAssStr,
            pontosDebito: 2
          });
        }
      }
    });

    // =========================================================================
    // 2. PROCESSAR TESTES DE FORÇA (+4 pts se ≤ 1h, antifraude > 60s)
    // =========================================================================
    monthStrengthTests.forEach((st: any) => {
      const pId = String(st.profissionalId?._id || st.profissionalId);
      const targetScore = profScoresMap.get(pId);
      const cObj = clientMap.get(String(st.clienteId?._id || st.clienteId));
      const alunoNome = cObj?.dadosPessoais?.nome || cObj?.nome || 'Aluno';

      const tempoGasto = Number(st.tempoGastoSegundos) || 0;
      const dataStStr = st.data || st.createdAt?.toISOString().split('T')[0] || '';

      if (tempoGasto >= 60 && tempoGasto <= 3600) {
        if (targetScore) {
          targetScore.detalhes.testesForcaPrazo++;
          targetScore.detalhes.testesForcaPrazoPts += 4;
          targetScore.creditosIndividuais += 4;
          targetScore.extratoCreditos.push({
            tipo: 'Teste de Força',
            descricao: 'Teste de dinamometria/força concluído dentro do SLA (≤ 1h)',
            alunoNome,
            data: dataStStr,
            tempoGasto: `${Math.floor(tempoGasto / 60)}m ${tempoGasto % 60}s`,
            pontos: 4
          });
        }
      }
    });

    // =========================================================================
    // 3. PROCESSAR RELATÓRIOS FISIOTERÁPICOS (+6 pts se ≤ 2h, antifraude > 60s)
    // =========================================================================
    monthReports.forEach((rep: any) => {
      const pId = String(rep.profissionalId?._id || rep.profissionalId);
      const targetScore = profScoresMap.get(pId);
      const cObj = clientMap.get(String(rep.clienteId?._id || rep.clienteId));
      const alunoNome = cObj?.dadosPessoais?.nome || cObj?.nome || 'Paciente';

      const tempoGasto = Number(rep.tempoGastoSegundos) || 0;
      const dataRepStr = rep.data || rep.createdAt?.toISOString().split('T')[0] || '';

      if (tempoGasto >= 60 && tempoGasto <= 7200) {
        if (targetScore) {
          targetScore.detalhes.relatoriosPrazo++;
          targetScore.detalhes.relatoriosPrazoPts += 6;
          targetScore.creditosIndividuais += 6;
          targetScore.extratoCreditos.push({
            tipo: 'Relatório Fisioterápico',
            descricao: 'Relatório clínico fisioterápico concluído dentro do SLA (≤ 2h)',
            alunoNome,
            data: dataRepStr,
            tempoGasto: `${Math.floor(tempoGasto / 60)}m ${tempoGasto % 60}s`,
            pontos: 6
          });
        }
      }
    });

    // =========================================================================
    // 4. PROCESSAR FICHAS DE TREINO (+4 pts se realizada em até 24h após avaliação)
    // =========================================================================
    const allRecentEvals = [...monthAssessments, ...monthStrengthTests, ...monthReports];

    workoutUpdateEvents.forEach((w: any) => {
      let targetProfId = w.profId;
      // Se a ficha não possui profId gravado, buscar o profissional responsável do cliente
      if (!targetProfId) {
        const cObj = clientMap.get(w.clientId);
        targetProfId = cObj?.dadosClinicos?.profissionalResponsavelId
          ? String(cObj.dadosClinicos.profissionalResponsavelId)
          : undefined;
      }

      if (!targetProfId) return;

      const targetScore = profScoresMap.get(targetProfId);
      if (!targetScore) return;

      const cObj = clientMap.get(w.clientId);
      const alunoNome = cObj?.dadosPessoais?.nome || cObj?.nome || 'Aluno';

      // Verificar se esta atualização de ficha ocorreu dentro de 24h após uma avaliação recente
      const evalMatch = allRecentEvals.find(ev => {
        const evCId = String(ev.clienteId?._id || ev.clienteId);
        if (evCId !== w.clientId) return false;
        const evTime = new Date(ev.createdAt || `${ev.data}T12:00:00`).getTime();
        const wTime = new Date(w.updatedAt || `${w.data}T12:00:00`).getTime();
        const diffHours = (wTime - evTime) / (1000 * 60 * 60);
        return diffHours >= 0 && diffHours <= 24;
      });

      if (evalMatch) {
        targetScore.detalhes.fichas24h++;
        targetScore.detalhes.fichas24hPts += 4;
        targetScore.creditosIndividuais += 4;
        targetScore.extratoCreditos.push({
          tipo: 'Ficha de Treino (SLA 24h)',
          descricao: `Ficha de treino (${w.sheetName}) prescrita em até 24h após avaliação clínica`,
          alunoNome,
          data: w.data,
          pontos: 4
        });
      }
    });

    // =========================================================================
    // 5. PROCESSAR VENCIMENTO DE AVALIAÇÃO / FICHA > 2 MESES (-10 pts)
    //    (Aplicado ao profissional vinculado à carteira do aluno)
    // =========================================================================
    const nowMs = Date.now();
    const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;

    activeClients.forEach((client: any) => {
      const cId = String(client._id);
      const respProfId = client.dadosClinicos?.profissionalResponsavelId
        ? String(client.dadosClinicos.profissionalResponsavelId)
        : null;

      if (!respProfId) return;
      const targetScore = profScoresMap.get(respProfId);
      if (!targetScore) return;

      const alunoNome = client.dadosPessoais?.nome || client.nome || 'Aluno';

      // Verificar última avaliação física
      const clientAssessments = monthAssessments.filter((a: any) => String(a.clienteId?._id || a.clienteId) === cId);
      let lastAssDate = client.dadosClinicos?.dataUltimaAvaliacao
        ? new Date(client.dadosClinicos.dataUltimaAvaliacao).getTime()
        : 0;

      if (clientAssessments.length > 0) {
        const sorted = [...clientAssessments].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        lastAssDate = Math.max(lastAssDate, new Date(sorted[0].data).getTime());
      }

      if (lastAssDate > 0 && (nowMs - lastAssDate) > TWO_MONTHS_MS) {
        targetScore.detalhes.alunosVencidos2m++;
        targetScore.detalhes.alunosVencidos2mDebito += 10;
        targetScore.debitosIndividuais += 10;
        targetScore.extratoDebitos.push({
          tipo: 'Avaliação Física Vencida (> 2 meses)',
          motivo: 'Aluno da carteira está há mais de 60 dias sem renovação de avaliação física',
          alunoNome,
          data: new Date(lastAssDate).toISOString().split('T')[0],
          pontosDebito: 10
        });
      }
    });

    // =========================================================================
    // 6. PROCESSAR CRÉDITOS E DÉBITOS COLETIVOS (TODOS OS PROFISSIONAIS RECEBEM)
    //    - Frequência ≥ 80% (+5 pts) vs < 80% (-5 pts)
    //    - Treino Livre semanal (+2 pts) vs sem Treino Livre (-2 pts)
    //    - Emergências ≤ 1 (+3 pts) vs Emergências > 1 (-4 pts)
    // =========================================================================
    let totalAlunosAltaFreq = 0;
    let totalAlunosBaixaFreq = 0;
    let totalAlunosTreinoLivreOk = 0;
    let totalAlunosTreinoLivreFalta = 0;
    let totalAlunosEmergenciaOk = 0;
    let totalAlunosEmergenciaExtra = 0;

    const collectiveCreditEvents: Array<{ tipo: string; descricao: string; alunoNome: string; pontos: number }> = [];
    const collectiveDebitEvents: Array<{ tipo: string; motivo: string; alunoNome: string; pontosDebito: number }> = [];

    activeClients.forEach((client: any) => {
      const cId = String(client._id);
      const alunoNome = client.dadosPessoais?.nome || client.nome || 'Aluno';

      const clientMonthApts = monthAppointments.filter((a: any) => {
        const aCId = String(a.clienteId?._id || a.clienteId);
        return aCId === cId;
      });

      // Frequência
      const presencas = clientMonthApts.filter((a: any) => a.status === 'presenca').length;
      const faltas = clientMonthApts.filter((a: any) => a.status === 'falta').length;
      const totalAulas = presencas + faltas;

      const freqMensal = totalAulas > 0 ? (presencas / totalAulas) * 100 : 100;

      if (freqMensal >= 80) {
        totalAlunosAltaFreq++;
        collectiveCreditEvents.push({
          tipo: 'Retenção Coletiva (Frequência ≥ 80%)',
          descricao: `Aluno concluiu o mês com frequência de ${freqMensal.toFixed(0)}% (Meta ≥ 80% atingida)`,
          alunoNome,
          pontos: 5
        });
      } else {
        totalAlunosBaixaFreq++;
        collectiveDebitEvents.push({
          tipo: 'Baixa Frequência do Aluno (< 80%)',
          motivo: `Aluno concluiu o mês com frequência de apenas ${freqMensal.toFixed(0)}% (Abaixo da meta de 80%)`,
          alunoNome,
          pontosDebito: 5
        });
      }

      // Treino Livre Semanal
      const treinosLivres = clientMonthApts.filter((a: any) => {
        const serv = (a.servico || '').toLowerCase();
        return (serv.includes('livre') || a.tipoCredito === 'nenhum') && a.status === 'presenca';
      }).length;

      if (treinosLivres >= 4) { // Pelo menos 1 treino livre por semana (4 semanas/mês)
        totalAlunosTreinoLivreOk++;
        collectiveCreditEvents.push({
          tipo: 'Treino Livre Semanal',
          descricao: `Aluno realizou ${treinosLivres} treinos livres no mês (Meta semanal cumprida)`,
          alunoNome,
          pontos: 2
        });
      } else {
        totalAlunosTreinoLivreFalta++;
        collectiveDebitEvents.push({
          tipo: 'Ausência de Treino Livre Semanal',
          motivo: `Aluno realizou apenas ${treinosLivres} treino(s) livre(s) no mês (Meta de 1x/semana não atingida)`,
          alunoNome,
          pontosDebito: 2
        });
      }

      // Emergências
      const emergencias = clientMonthApts.filter((a: any) => {
        const serv = (a.servico || '').toLowerCase();
        return (serv.includes('emerg') || a.tipoCredito === 'emergencia') && a.status !== 'cancelado';
      }).length;

      if (emergencias <= 1) {
        totalAlunosEmergenciaOk++;
        collectiveCreditEvents.push({
          tipo: 'Controle de Emergências',
          descricao: `Aluno teve ${emergencias} atendimento(s) de emergência no mês (Controle preventivo mantido)`,
          alunoNome,
          pontos: 3
        });
      } else {
        totalAlunosEmergenciaExtra++;
        collectiveDebitEvents.push({
          tipo: 'Emergências Excedentes (> 1 no mês)',
          motivo: `Aluno teve ${emergencias} atendimentos de emergência no mês (Entrou no critério de emergência extra)`,
          alunoNome,
          pontosDebito: 4
        });
      }
    });

    // Atribuir os pontos coletivos a todos os profissionais
    const totalCollectiveCreditsPts = (totalAlunosAltaFreq * 5) + (totalAlunosTreinoLivreOk * 2) + (totalAlunosEmergenciaOk * 3);
    const totalCollectiveDebitsPts = (totalAlunosBaixaFreq * 5) + (totalAlunosTreinoLivreFalta * 2) + (totalAlunosEmergenciaExtra * 4);

    profScoresMap.forEach((profScore) => {
      profScore.detalhes.retencaoAltaAlunos = totalAlunosAltaFreq;
      profScore.detalhes.retencaoAltaPts = totalAlunosAltaFreq * 5;
      profScore.detalhes.retencaoBaixaAlunos = totalAlunosBaixaFreq;
      profScore.detalhes.retencaoBaixaDebito = totalAlunosBaixaFreq * 5;

      profScore.detalhes.treinoLivreAtivoAlunos = totalAlunosTreinoLivreOk;
      profScore.detalhes.treinoLivreAtivoPts = totalAlunosTreinoLivreOk * 2;
      profScore.detalhes.treinoLivreInativoAlunos = totalAlunosTreinoLivreFalta;
      profScore.detalhes.treinoLivreInativoDebito = totalAlunosTreinoLivreFalta * 2;

      profScore.detalhes.emergenciaOkAlunos = totalAlunosEmergenciaOk;
      profScore.detalhes.emergenciaOkPts = totalAlunosEmergenciaOk * 3;
      profScore.detalhes.emergenciaExtraAlunos = totalAlunosEmergenciaExtra;
      profScore.detalhes.emergenciaExtraDebito = totalAlunosEmergenciaExtra * 4;

      profScore.creditosColetivos = totalCollectiveCreditsPts;
      profScore.debitosColetivos = totalCollectiveDebitsPts;

      // Concatenar extrato coletivo
      profScore.extratoCreditos.push(...collectiveCreditEvents.map(e => ({ ...e, data: mesParam })));
      profScore.extratoDebitos.push(...collectiveDebitEvents.map(e => ({ ...e, data: mesParam })));

      // Calcular saldo total líquido
      const totalCred = profScore.creditosIndividuais + profScore.creditosColetivos;
      const totalDeb = profScore.debitosIndividuais + profScore.debitosColetivos;
      profScore.pontosLiquidos = totalCred - totalDeb;
    });

    // =========================================================================
    // 7. CONSOLIDAR RANKING E KPIS
    // =========================================================================
    const ranking = Array.from(profScoresMap.values()).sort((a, b) => b.pontosLiquidos - a.pontosLiquidos);

    const totalPontosClinica = ranking.reduce((acc, curr) => acc + curr.pontosLiquidos, 0);
    const totalCreditosClinica = ranking.reduce((acc, curr) => acc + curr.creditosIndividuais + curr.creditosColetivos, 0);
    const totalDebitosClinica = ranking.reduce((acc, curr) => acc + curr.debitosIndividuais + curr.debitosColetivos, 0);

    const kpis = {
      mesReferencia: mesParam,
      totalProfissionais: professionals.length,
      totalAlunosAtivos: activeClients.length,
      totalPontosClinica,
      totalCreditosClinica,
      totalDebitosClinica,
      liderNome: ranking[0]?.prof?.nome || 'Nenhum',
      liderPontos: ranking[0]?.pontosLiquidos || 0,
      totalAlunosAltaFreq,
      totalAlunosBaixaFreq,
      totalAlunosEmergenciaOk,
      totalAlunosEmergenciaExtra
    };

    return NextResponse.json({
      success: true,
      data: {
        ranking,
        kpis,
        mes: mesParam
      }
    });

  } catch (error: any) {
    console.error('Erro ao calcular metas dos profissionais:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
