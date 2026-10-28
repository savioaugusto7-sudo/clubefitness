import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import PhysicalAssessment from '@/models/PhysicalAssessment';
import PhysioReport from '@/models/PhysioReport';
import StrengthTest from '@/models/StrengthTest';
import ClientTestRecord from '@/models/ClientTestRecord';
import Professional from '@/models/Professional';
import { checkSessionPermission } from '@/utils/authHelper';
import { computeLongitudinalReassessment } from '@/utils/longitudinalEngine';
import { generateClinicalNarrative } from '@/utils/clinicalReasoningEngine';
import { generatePersonalizedClinicalNarrative } from '@/utils/aiClinicalNarrative';
import { calculateGoniometryAlerts, calculateStrengthTestAlerts } from '@/utils/biomechanicsEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

function toValidObjectId(val: any): mongoose.Types.ObjectId | null {
  if (!val) return null;
  const str = String(val).trim();
  if (mongoose.Types.ObjectId.isValid(str) && /^[0-9a-fA-F]{24}$/.test(str)) {
    try {
      return new mongoose.Types.ObjectId(str);
    } catch {
      return null;
    }
  }
  return null;
}

const TEST_TYPE_LABELS: Record<string, string> = {
  Y_TEST: 'Y-Test (Equilíbrio Dinâmico)',
  STEP_DOWN: 'Step Down Test',
  HOP_TEST: 'Bateria de Hop Tests (Simetria LSI)',
  GONIOMETRIA: 'Goniometria Pontual',
  DINAMOMETRIA: 'Dinamometria / Força',
  THOMAS: 'Teste de Thomas',
  OBER: 'Teste de Ober',
  MAIGNE: 'Estrela de Maggi (Maigne)',
  COMPOSICAO_CORPORAL: 'Composição Corporal',
  PERIMETRIA: 'Perimetria Rápida',
  ESTRELA_MAGGI: 'Estrela de Maggi',
  QUEIXAS_EVA: 'Escala de Dor EVA'
};

export async function GET(request: Request) {
  try {
    const auth = await checkSessionPermission(['admin', 'profissional', 'recepcao'], undefined, request);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: 'Acesso não autorizado' }, { status: 401 });
    }

    await dbConnect();
    const _prof = Professional; // ensure model registration

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const t1Id = searchParams.get('t1Id');
    const t2Id = searchParams.get('t2Id');

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId é obrigatório' }, { status: 400 });
    }

    const clientObjId = toValidObjectId(clientId);
    const clientQuery = clientObjId
      ? { $or: [{ clienteId: clientId }, { clienteId: clientObjId }] }
      : { clienteId: clientId };

    // 1. Carregar perfil real do Aluno
    const clientDoc = await Client.findOne(
      clientObjId ? { _id: clientObjId } : { _id: clientId }
    )
      .populate({ path: 'profissionalId', select: 'nome email' })
      .lean();

    if (!clientDoc) {
      return NextResponse.json({ success: false, error: 'Aluno não encontrado' }, { status: 404 });
    }

    // 2. Carregar todas as coleções do aluno em paralelo
    const [physicalAssessments, physioReports, strengthTests, clientTestRecords] = await Promise.all([
      PhysicalAssessment.find(clientQuery).sort({ data: -1, createdAt: -1 }).lean().maxTimeMS(8000),
      PhysioReport.find(clientQuery).sort({ data: -1, createdAt: -1 }).lean().maxTimeMS(8000),
      StrengthTest.find(clientQuery).sort({ data: -1, createdAt: -1 }).lean().maxTimeMS(8000),
      ClientTestRecord.find(clientQuery).sort({ data: -1, createdAt: -1 }).lean().maxTimeMS(8000)
    ]);

    // 3. Montar Linha do Tempo Unificada (Timeline)
    const timeline: any[] = [];

    physicalAssessments.forEach(pa => {
      const dm = pa.dadosMedidos || {};
      const rc = pa.resultadosCalculados || {};
      const metrics: string[] = [];
      if (dm.peso) metrics.push(`Peso: ${dm.peso} kg`);
      if (rc.percentualGordura) metrics.push(`%Gordura: ${rc.percentualGordura}%`);
      if (dm.goniometria?.tornozeloDorsi1D) metrics.push('Goniometria');
      if (dm.testesEspeciais?.yTest) metrics.push('Y-Test');

      timeline.push({
        id: pa._id.toString(),
        origem: 'PhysicalAssessment',
        tipoLabel: 'Avaliação Física Completa',
        icone: 'fa-heartbeat',
        cor: '#6366f1',
        data: pa.data,
        createdAt: pa.createdAt,
        avaliadorId: pa.avaliadorId,
        resumo: metrics,
        rawDoc: pa
      });
    });

    physioReports.forEach(pr => {
      const metrics: string[] = [];
      const queixas = pr.anamnese?.queixas || pr.anamnese?.queixasDor;
      if (Array.isArray(queixas) && queixas.length > 0) {
        metrics.push(`${queixas.length} queixa(s) de dor`);
      } else if (pr.conteudo?.queixaPrincipal) {
        metrics.push(`Queixa: ${pr.conteudo.queixaPrincipal}`);
      } else if (pr.conteudo?.dorEscala != null) {
        metrics.push(`Dor EVA: ${pr.conteudo.dorEscala}/10`);
      }
      if (pr.goniometria && Object.keys(pr.goniometria).length > 0) {
        metrics.push('Goniometria');
      }
      if (pr.testesOrtopedicos && Object.keys(pr.testesOrtopedicos).length > 0) {
        metrics.push('Testes Ortopédicos');
      }

      timeline.push({
        id: pr._id.toString(),
        origem: 'PhysioReport',
        tipoLabel: 'Relatório Fisioterápico',
        icone: 'fa-file-medical',
        cor: '#0d9488',
        data: pr.data,
        createdAt: pr.createdAt,
        avaliadorId: pr.profissionalId,
        resumo: metrics,
        pdfUrl: pr.pdf_url || null,
        rawDoc: pr
      });
    });

    strengthTests.forEach(st => {
      const metrics: string[] = [];
      const qtdTestes = (st.testesRealizados || []).length || (st.exercicios || []).length;
      metrics.push(`${qtdTestes} grupo(s) testado(s)`);
      if (st.comparativos && st.comparativos.length > 0) {
        const comAssimetria = st.comparativos.filter((c: any) => c.deficit > 10).length;
        if (comAssimetria > 0) metrics.push(`${comAssimetria} assimetria(s) >10%`);
        else metrics.push('Simetrias adequadas (≤10%)');
      }

      timeline.push({
        id: st._id.toString(),
        origem: 'StrengthTest',
        tipoLabel: 'Teste de Força Dinamometria',
        icone: 'fa-weight-hanging',
        cor: '#f59e0b',
        data: st.data,
        createdAt: st.createdAt,
        avaliadorId: st.profissionalId,
        resumo: metrics,
        rawDoc: st
      });
    });

    clientTestRecords.forEach(tr => {
      const metrics: string[] = [];
      if (tr.tipoTeste === 'QUEIXAS_EVA') {
        const onde = tr.dados?.dorOnde || tr.dados?.regiao || 'Dor';
        const eva = tr.dados?.intensidade ?? tr.metricas?.scorePrincipal ?? 0;
        metrics.push(`${onde}: EVA ${eva}/10`);
        if (tr.dados?.atividadesAgravantes && tr.dados.atividadesAgravantes.length > 0) {
          metrics.push(`Piora: ${tr.dados.atividadesAgravantes.slice(0, 2).join(', ')}`);
        }
      } else {
        if (tr.metricas?.scorePrincipal != null) {
          metrics.push(`Score: ${tr.metricas.scorePrincipal}`);
        }
        if (tr.metricas?.assimetriaPercentual != null) {
          metrics.push(`Assimetria: ${tr.metricas.assimetriaPercentual}%`);
        }
        if (tr.comparativoAnterior?.statusEvolucao) {
          metrics.push(`Status: ${tr.comparativoAnterior.statusEvolucao}`);
        }
      }

      timeline.push({
        id: tr._id.toString(),
        origem: 'ClientTestRecord',
        tipoTeste: tr.tipoTeste,
        tipoLabel: TEST_TYPE_LABELS[tr.tipoTeste] || tr.tipoTeste || 'Teste Avulso',
        icone: tr.tipoTeste === 'QUEIXAS_EVA' ? 'fa-heart-pulse' : 'fa-bolt',
        cor: tr.tipoTeste === 'QUEIXAS_EVA' ? '#ef4444' : '#ec4899',
        data: tr.data,
        createdAt: tr.createdAt,
        avaliadorId: tr.profissionalId,
        resumo: metrics,
        rawDoc: tr
      });
    });

    // Ordenar timeline por data decrescente
    timeline.sort((a, b) => {
      if (b.data !== a.data) return b.data.localeCompare(a.data);
      const bTime = new Date(b.createdAt || 0).getTime();
      const aTime = new Date(a.createdAt || 0).getTime();
      return bTime - aTime;
    });

    // 4. Comparador Longitudinal (Laudo de Reavaliação T1 vs T2)
    // Seletor de opções comparativas (todas as avaliações que possuem dados de goniometria ou testes funcionais)
    const availableReports = [...physioReports].sort((a, b) => (a.data || '').localeCompare(b.data || ''));
    let t1Doc: any = null;
    let t2Doc: any = null;

    if (t1Id && t2Id) {
      t1Doc = availableReports.find(r => r._id.toString() === t1Id) || physicalAssessments.find(a => a._id.toString() === t1Id);
      t2Doc = availableReports.find(r => r._id.toString() === t2Id) || physicalAssessments.find(a => a._id.toString() === t2Id);
    } else if (availableReports.length >= 2) {
      t1Doc = availableReports[0];
      t2Doc = availableReports[availableReports.length - 1];
    } else if (availableReports.length === 1 && physicalAssessments.length >= 1) {
      t1Doc = physicalAssessments[0];
      t2Doc = availableReports[0];
    }

    let longitudinalComputed: any = null;
    let clinicalNarrative: any = null;

    if (t1Doc && t2Doc && t1Doc._id.toString() !== t2Doc._id.toString()) {
      try {
        // Buscar os testes de força mais próximos de t1 e t2
        const sortedST = [...strengthTests].sort((a, b) => (a.data || '').localeCompare(b.data || ''));
        const st1 = sortedST.find(s => s.data && t1Doc.data && s.data <= t1Doc.data) || sortedST[0];
        const st2 = sortedST.slice().reverse().find(s => s.data && t2Doc.data && s.data <= t2Doc.data) || sortedST[0];

        const computed = computeLongitudinalReassessment({
          client: {
            nome: clientDoc.dadosPessoais?.nome || 'Aluno',
            idade: clientDoc.dadosPessoais?.idade || 30,
            pesoKg: clientDoc.dadosPessoais?.peso || 70
          },
          t1Report: t1Doc,
          t2Report: t2Doc,
          t1Strength: st1,
          t2Strength: st2
        });

        const baseNarrative = generateClinicalNarrative(computed);
        const narrative = await generatePersonalizedClinicalNarrative(computed, baseNarrative);
        longitudinalComputed = computed;
        clinicalNarrative = narrative;
      } catch (err: any) {
        console.warn('Erro ao processar cálculo longitudinal:', err.message);
      }
    }

    // 5. Alertas Clínicos Vivos na Avaliação Mais Recente
    let liveGonioAlerts: any[] = [];
    try {
      const latestGonioDoc = physioReports[0]?.goniometria || physicalAssessments[0]?.dadosMedidos?.goniometria || null;
      liveGonioAlerts = latestGonioDoc ? calculateGoniometryAlerts(latestGonioDoc) : [];
    } catch (err: any) {
      console.warn('Erro ao calcular alertas de goniometria:', err.message);
    }

    let liveStrengthAlerts: any[] = [];
    try {
      const latestStrengthDoc = strengthTests[0] || null;
      if (latestStrengthDoc) {
        const testsList = Array.isArray(latestStrengthDoc.testesRealizados)
          ? latestStrengthDoc.testesRealizados
          : Array.isArray(latestStrengthDoc.exercicios)
          ? latestStrengthDoc.exercicios
          : [];
        liveStrengthAlerts = calculateStrengthTestAlerts(
          testsList,
          clientDoc.dadosPessoais?.peso || 70,
          clientDoc.dadosPessoais?.sexo === 'Feminino' ? 'F' : 'M'
        );
      }
    } catch (err: any) {
      console.warn('Erro ao calcular alertas de força:', err.message);
    }

    // 6. Séries Cronológicas para Gráficos de Evolução
    // A) Goniometria ao longo do tempo (Dorsiflexão Estendido, Dorsiflexão Lunge, Flexão Joelho, Poplíteo)
    let gonioSeries: any[] = [];
    try {
      const gonioTimelineDocs = [...physioReports, ...physicalAssessments]
        .filter(doc => {
          const g = doc.goniometria || doc.dadosMedidos?.goniometria;
          return g && (g.tornozeloDorsi1D || g.tornozeloDorsi2D || g.joelhoFlexaoD);
        })
        .sort((a, b) => (a.data || '').localeCompare(b.data || ''));

      gonioSeries = gonioTimelineDocs.map(doc => {
        const g = doc.goniometria || doc.dadosMedidos?.goniometria || {};
        const getV = (v: any) => typeof v === 'object' ? Number(v?.semForca ?? v?.ativo ?? '') || null : Number(v) || null;
        return {
          data: doc.data,
          dorsi1D: getV(g.tornozeloDorsi1D),
          dorsi1E: getV(g.tornozeloDorsi1E),
          dorsi2D: getV(g.tornozeloDorsi2D),
          dorsi2E: getV(g.tornozeloDorsi2E),
          joelhoFlexaoD: getV(g.joelhoFlexaoD),
          joelhoFlexaoE: getV(g.joelhoFlexaoE),
          popliteoD: getV(g.joelhoPopliteoD),
          popliteoE: getV(g.joelhoPopliteoE),
          ombroRotIntD: getV(g.ombroRotIntD || g.ombroRotacaoInternaD),
          ombroRotIntE: getV(g.ombroRotIntE || g.ombroRotacaoInternaE),
          ombroRotExtD: getV(g.ombroRotExtD || g.ombroRotacaoExternaD),
          ombroRotExtE: getV(g.ombroRotExtE || g.ombroRotacaoExternaE),
          ombroFlexaoD: getV(g.ombroFlexaoD),
          ombroFlexaoE: getV(g.ombroFlexaoE)
        };
      });
    } catch (err: any) {
      console.warn('Erro em gonioSeries:', err.message);
    }

    // B) Dor / EVA ao longo do tempo (unificando Relatórios Fisioterápicos e Testes Avulsos de Queixa)
    let evaSeries: any[] = [];
    try {
      const evaSeriesDocs = [...physioReports]
        .filter(doc => (doc.anamnese?.queixas && doc.anamnese.queixas.length > 0) || (doc.anamnese?.queixasDor && doc.anamnese.queixasDor.length > 0) || doc.conteudo?.dorEscala != null);

      const avulsoEvaRecords = clientTestRecords.filter(tr => tr.tipoTeste === 'QUEIXAS_EVA');

      const combinedEva = [
        ...evaSeriesDocs.map(doc => {
          const queixas = doc.anamnese?.queixas || doc.anamnese?.queixasDor || [];
          return {
            data: doc.data,
            origem: 'Relatório',
            queixas: queixas.map((q: any) => ({
              regiao: q.dorOnde || q.regiao || doc.conteudo?.queixaPrincipal || 'Geral',
              intensidade: Number(q.dorIntensidade ?? q.intensidade ?? doc.conteudo?.dorEscala) || 0,
              atividadesAgravantes: q.atividadesAgravantes || []
            })),
            dorGeral: doc.conteudo?.dorEscala != null ? Number(doc.conteudo.dorEscala) : null
          };
        }),
        ...avulsoEvaRecords.map(tr => ({
          data: tr.data,
          origem: 'Avulso',
          queixas: [{
            regiao: tr.dados?.dorOnde || tr.dados?.regiao || 'Geral',
            intensidade: Number(tr.dados?.intensidade ?? tr.metricas?.scorePrincipal ?? 0),
            atividadesAgravantes: tr.dados?.atividadesAgravantes || []
          }],
          dorGeral: Number(tr.dados?.intensidade ?? tr.metricas?.scorePrincipal ?? 0)
        }))
      ].sort((a, b) => (a.data || '').localeCompare(b.data || ''));

      evaSeries = combinedEva;
    } catch (err: any) {
      console.warn('Erro em evaSeries:', err.message);
    }

    // C) Testes de Força ao longo do tempo (Dinamometria)
    let strengthSeries: any[] = [];
    try {
      const strengthSeriesDocs = [...strengthTests].sort((a, b) => (a.data || '').localeCompare(b.data || ''));
      strengthSeries = strengthSeriesDocs.map(doc => {
        return {
          data: doc.data,
          testes: (doc.testesRealizados || []).map((t: any) => ({
            movimento: t.movimento,
            lado: t.lado,
            forcaN: t.forcaN || t.valorObtido,
            pcPercent: t.pcPercent
          })),
          comparativos: (doc.comparativos || []).map((c: any) => ({
            movimento: c.movimento,
            simetria: c.simetria,
            deficit: c.deficit
          }))
        };
      });
    } catch (err: any) {
      console.warn('Erro em strengthSeries:', err.message);
    }

    return NextResponse.json({
      success: true,
      data: {
        client: {
          _id: clientDoc._id.toString(),
          nome: clientDoc.dadosPessoais?.nome || 'Aluno',
          idade: clientDoc.dadosPessoais?.idade || null,
          sexo: clientDoc.dadosPessoais?.sexo || 'Não informado',
          peso: clientDoc.dadosPessoais?.peso || null,
          altura: clientDoc.dadosPessoais?.altura || null,
          telefone: clientDoc.dadosPessoais?.telefone || '',
          email: clientDoc.dadosPessoais?.email || '',
          profissionalResponsavel: clientDoc.profissionalId?.nome || null,
          lesoes: clientDoc.dadosClinicos?.lesoes || '',
          restricoes: clientDoc.dadosClinicos?.restricoes || '',
          historicoClinico: clientDoc.dadosClinicos?.historicoClinico || '',
          observacoes: clientDoc.dadosClinicos?.observacoes || ''
        },
        counts: {
          physicalAssessments: physicalAssessments.length,
          physioReports: physioReports.length,
          strengthTests: strengthTests.length,
          clientTestRecords: clientTestRecords.length,
          totalTimeline: timeline.length
        },
        timeline,
        longitudinal: {
          t1Id: t1Doc?._id?.toString() || null,
          t1Data: t1Doc?.data || null,
          t2Id: t2Doc?._id?.toString() || null,
          t2Data: t2Doc?.data || null,
          availableReports: availableReports.map(r => ({ id: r._id.toString(), data: r.data })),
          computed: longitudinalComputed,
          narrative: clinicalNarrative
        },
        liveAlerts: {
          goniometria: liveGonioAlerts,
          strength: liveStrengthAlerts
        },
        evolutionSeries: {
          goniometria: gonioSeries,
          eva: evaSeries,
          strength: strengthSeries
        }
      }
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (error: any) {
    console.error('Erro ao carregar Central Individual do Aluno:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
