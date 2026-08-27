import ClientTestRecord from '@/models/ClientTestRecord';
import mongoose from 'mongoose';
import {
  calculateYTestAnalysis,
  calculateStepDownAnalysis,
  calculateThomasAlerts,
  calculateOberAlerts,
  calculateGoniometryAlerts,
  calculateStrengthTestAlerts
} from './biomechanicsEngine';

function toObjectId(val: any): mongoose.Types.ObjectId | null {
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

/**
 * Synchronizes tests from a PhysicalAssessment document into ClientTestRecord
 */
export async function syncPhysicalAssessmentTests(assessmentDoc: any) {
  try {
    const clienteId = toObjectId(assessmentDoc.clienteId);
    const profissionalId = toObjectId(assessmentDoc.avaliadorId) || new mongoose.Types.ObjectId('6668ab030303030303030302');
    const data = assessmentDoc.data || new Date().toISOString().split('T')[0];
    const docId = toObjectId(assessmentDoc._id);

    if (!clienteId) return;

    const dm = assessmentDoc.dadosMedidos || {};
    const rc = assessmentDoc.resultadosCalculados || {};
    const te = dm.testesEspeciais || {};

    // 1. Composição Corporal
    if (rc.percentualGordura || rc.imc || dm.dobras) {
      await ClientTestRecord.create({
        clienteId,
        profissionalId,
        data,
        tipoTeste: 'COMPOSICAO_CORPORAL',
        dados: {
          peso: dm.peso,
          altura: dm.altura,
          dobras: dm.dobras,
          somaDobras: dm.somaDobras,
          resultados: rc
        },
        metricas: {
          scorePrincipal: Number(rc.percentualGordura) || 0,
          classificacao: rc.imcClassificacao || 'Normal'
        },
        origemDocumento: { tipo: 'PhysicalAssessment', documentoId: docId }
      });
    }

    // 2. Perimetria
    if (dm.circunferencias) {
      await ClientTestRecord.create({
        clienteId,
        profissionalId,
        data,
        tipoTeste: 'PERIMETRIA',
        dados: dm.circunferencias,
        metricas: {},
        origemDocumento: { tipo: 'PhysicalAssessment', documentoId: docId }
      });
    }

    // 3. Goniometria
    if (dm.goniometria && Object.keys(dm.goniometria).length > 0) {
      const alerts = calculateGoniometryAlerts(dm.goniometria);
      await ClientTestRecord.create({
        clienteId,
        profissionalId,
        data,
        tipoTeste: 'GONIOMETRIA',
        dados: dm.goniometria,
        metricas: {
          alertasClinicos: alerts.map(a => ({
            tipo: a.tipo,
            titulo: a.titulo,
            descricao: a.descricao,
            riscoClinico: a.riscoClinico
          }))
        },
        origemDocumento: { tipo: 'PhysicalAssessment', documentoId: docId }
      });
    }

    // 4. Y-Test
    if (te.yTest) {
      let yData: any = null;
      if (typeof te.yTest === 'string' && te.yTest.startsWith('{')) {
        try { yData = JSON.parse(te.yTest); } catch {}
      } else if (typeof te.yTest === 'object') {
        yData = te.yTest;
      }

      if (yData && (yData.realizou === 'sim' || yData.direita || yData.esquerda)) {
        const yd = yData.direita || {};
        const ye = yData.esquerda || {};
        const analysis = calculateYTestAnalysis({
          lenD: yd.comprimentoMembro,
          lenE: ye.comprimentoMembro,
          antD: yd.anterior,
          antE: ye.anterior,
          pmD: yd.posteromedial,
          pmE: ye.posteromedial,
          plD: yd.posterolateral,
          plE: ye.posterolateral
        });

        await ClientTestRecord.create({
          clienteId,
          profissionalId,
          data,
          tipoTeste: 'Y_TEST',
          dados: yData,
          metricas: {
            scorePrincipal: Math.max(analysis.compostoD, analysis.compostoE),
            assimetriaPercentual: analysis.assimetriaComposta,
            assimetriaAbsoluta: analysis.assimetriaAnt,
            deficitLateral: analysis.assimetriaAnt,
            ladoDeficitario: (Number(yd.anterior) || 0) < (Number(ye.anterior) || 0) ? 'Direito' : 'Esquerdo',
            alertasClinicos: analysis.alerts.map(a => ({
              tipo: a.tipo,
              titulo: a.titulo,
              descricao: a.descricao,
              riscoClinico: a.riscoClinico
            }))
          },
          origemDocumento: { tipo: 'PhysicalAssessment', documentoId: docId }
        });
      }
    }

    // 5. Step Down
    if (te.stepDown) {
      let sdData: any = null;
      if (typeof te.stepDown === 'string' && te.stepDown.startsWith('{')) {
        try { sdData = JSON.parse(te.stepDown); } catch {}
      } else if (typeof te.stepDown === 'object') {
        sdData = te.stepDown;
      }

      if (sdData && (sdData.realizou === 'sim' || sdData.quedaPelvicaD !== undefined || sdData.quedaPelvica !== undefined)) {
        const analysis = calculateStepDownAnalysis({
          pelvicaD: sdData.quedaPelvicaD ?? sdData.quedaPelvica,
          pelvicaE: sdData.quedaPelvicaE ?? sdData.quedaPelvica,
          aducaoD: sdData.aducaoQuadrilD ?? sdData.aducaoQuadril,
          aducaoE: sdData.aducaoQuadrilE ?? sdData.aducaoQuadril,
          valgoD: sdData.valgoDinamicoJoelhoD ?? sdData.valgoDinamicoJoelho,
          valgoE: sdData.valgoDinamicoJoelhoE ?? sdData.valgoDinamicoJoelho,
          prpsD: sdData.compExcentricoPrpsD ?? sdData.compExcentricoPrps,
          prpsE: sdData.compExcentricoPrpsE ?? sdData.compExcentricoPrps
        });

        await ClientTestRecord.create({
          clienteId,
          profissionalId,
          data,
          tipoTeste: 'STEP_DOWN',
          dados: sdData,
          metricas: {
            scorePrincipal: Math.max(analysis.scoreD, analysis.scoreE),
            classificacao: `${analysis.classificacaoD} (D) / ${analysis.classificacaoE} (E)`,
            alertasClinicos: analysis.alerts.map(a => ({
              tipo: a.tipo,
              titulo: a.titulo,
              descricao: a.descricao,
              riscoClinico: a.riscoClinico
            }))
          },
          origemDocumento: { tipo: 'PhysicalAssessment', documentoId: docId }
        });
      }
    }

    // 6. Teste de Thomas
    if (te.thomasIliopsoasDStatus || te.thomasRetofemoralDStatus || te.thomasD || te.thomasE) {
      const thomasAlerts = calculateThomasAlerts(te);
      await ClientTestRecord.create({
        clienteId,
        profissionalId,
        data,
        tipoTeste: 'THOMAS',
        dados: te,
        metricas: {
          classificacao: te.thomasIliopsoasDStatus === 'Positivo' || te.thomasIliopsoasEStatus === 'Positivo' ? 'Encurtamento Positivo' : 'Normal',
          alertasClinicos: thomasAlerts.map(a => ({
            tipo: a.tipo,
            titulo: a.titulo,
            descricao: a.descricao,
            riscoClinico: a.riscoClinico
          }))
        },
        origemDocumento: { tipo: 'PhysicalAssessment', documentoId: docId }
      });
    }

    // 7. Teste de Ober
    if (te.oberD || te.oberE) {
      const oberAlerts = calculateOberAlerts(te.oberD, te.oberE);
      await ClientTestRecord.create({
        clienteId,
        profissionalId,
        data,
        tipoTeste: 'OBER',
        dados: { oberD: te.oberD, oberE: te.oberE },
        metricas: {
          classificacao: te.oberD === 'Positivo' || te.oberE === 'Positivo' ? 'Retração Positiva' : 'Normal',
          alertasClinicos: oberAlerts.map(a => ({
            tipo: a.tipo,
            titulo: a.titulo,
            descricao: a.descricao,
            riscoClinico: a.riscoClinico
          }))
        },
        origemDocumento: { tipo: 'PhysicalAssessment', documentoId: docId }
      });
    }

    // 8. Teste de Maigne
    if (te.maigne) {
      await ClientTestRecord.create({
        clienteId,
        profissionalId,
        data,
        tipoTeste: 'MAIGNE',
        dados: te.maigne,
        metricas: {},
        origemDocumento: { tipo: 'PhysicalAssessment', documentoId: docId }
      });
    }
  } catch (err) {
    console.error('Error syncing physical assessment tests to ClientTestRecord:', err);
  }
}

/**
 * Synchronizes tests from a PhysioReport document into ClientTestRecord
 */
export async function syncPhysioReportTests(reportDoc: any) {
  try {
    const clienteId = toObjectId(reportDoc.clienteId);
    const profissionalId = toObjectId(reportDoc.profissionalId) || new mongoose.Types.ObjectId('6668ab030303030303030301');
    const data = reportDoc.data || new Date().toISOString().split('T')[0];
    const docId = toObjectId(reportDoc._id);

    if (!clienteId) return;

    // Goniometria
    if (reportDoc.goniometria && Object.keys(reportDoc.goniometria).length > 0) {
      const alerts = calculateGoniometryAlerts(reportDoc.goniometria);
      await ClientTestRecord.create({
        clienteId,
        profissionalId,
        data,
        tipoTeste: 'GONIOMETRIA',
        dados: reportDoc.goniometria,
        metricas: {
          alertasClinicos: alerts.map(a => ({
            tipo: a.tipo,
            titulo: a.titulo,
            descricao: a.descricao,
            riscoClinico: a.riscoClinico
          }))
        },
        origemDocumento: { tipo: 'PhysioReport', documentoId: docId }
      });
    }

    // Perimetria
    if (reportDoc.perimetria && Object.keys(reportDoc.perimetria).length > 0) {
      await ClientTestRecord.create({
        clienteId,
        profissionalId,
        data,
        tipoTeste: 'PERIMETRIA',
        dados: reportDoc.perimetria,
        metricas: {},
        origemDocumento: { tipo: 'PhysioReport', documentoId: docId }
      });
    }

    const ort = reportDoc.testesOrtopedicos || {};

    // Y-Test
    if (ort.yTeste && ort.yTeste.realizou === 'sim') {
      const yd = ort.yTeste.direita || {};
      const ye = ort.yTeste.esquerda || {};
      const analysis = calculateYTestAnalysis({
        lenD: yd.comprimentoMembro,
        lenE: ye.comprimentoMembro,
        antD: yd.anterior,
        antE: ye.anterior,
        pmD: yd.posteromedial,
        pmE: ye.posteromedial,
        plD: yd.posterolateral,
        plE: ye.posterolateral
      });

      await ClientTestRecord.create({
        clienteId,
        profissionalId,
        data,
        tipoTeste: 'Y_TEST',
        dados: ort.yTeste,
        metricas: {
          scorePrincipal: Math.max(analysis.compostoD, analysis.compostoE),
          assimetriaPercentual: analysis.assimetriaComposta,
          assimetriaAbsoluta: analysis.assimetriaAnt,
          deficitLateral: analysis.assimetriaAnt,
          ladoDeficitario: (Number(yd.anterior) || 0) < (Number(ye.anterior) || 0) ? 'Direito' : 'Esquerdo',
          alertasClinicos: analysis.alerts.map(a => ({
            tipo: a.tipo,
            titulo: a.titulo,
            descricao: a.descricao,
            riscoClinico: a.riscoClinico
          }))
        },
        origemDocumento: { tipo: 'PhysioReport', documentoId: docId }
      });
    }

    // Step Down
    if (ort.stepDown && ort.stepDown.realizou === 'sim') {
      const sd = ort.stepDown;
      const analysis = calculateStepDownAnalysis({
        pelvicaD: sd.quedaPelvicaD,
        pelvicaE: sd.quedaPelvicaE,
        aducaoD: sd.aducaoQuadrilD,
        aducaoE: sd.aducaoQuadrilE,
        valgoD: sd.valgoDinamicoJoelhoD,
        valgoE: sd.valgoDinamicoJoelhoE,
        prpsD: sd.compExcentricoPrpsD,
        prpsE: sd.compExcentricoPrpsE
      });

      await ClientTestRecord.create({
        clienteId,
        profissionalId,
        data,
        tipoTeste: 'STEP_DOWN',
        dados: sd,
        metricas: {
          scorePrincipal: Math.max(analysis.scoreD, analysis.scoreE),
          classificacao: `${analysis.classificacaoD} (D) / ${analysis.classificacaoE} (E)`,
          alertasClinicos: analysis.alerts.map(a => ({
            tipo: a.tipo,
            titulo: a.titulo,
            descricao: a.descricao,
            riscoClinico: a.riscoClinico
          }))
        },
        origemDocumento: { tipo: 'PhysioReport', documentoId: docId }
      });
    }

    // Thomas
    if (reportDoc.testesEspeciais?.thomasIliopsoasDStatus || reportDoc.testesEspeciais?.thomasRetofemoralDStatus) {
      const te = reportDoc.testesEspeciais;
      const thomasAlerts = calculateThomasAlerts(te);
      await ClientTestRecord.create({
        clienteId,
        profissionalId,
        data,
        tipoTeste: 'THOMAS',
        dados: te,
        metricas: {
          classificacao: te.thomasIliopsoasDStatus === 'Positivo' || te.thomasIliopsoasEStatus === 'Positivo' ? 'Encurtamento Positivo' : 'Normal',
          alertasClinicos: thomasAlerts.map(a => ({
            tipo: a.tipo,
            titulo: a.titulo,
            descricao: a.descricao,
            riscoClinico: a.riscoClinico
          }))
        },
        origemDocumento: { tipo: 'PhysioReport', documentoId: docId }
      });
    }

    // Ober
    if (reportDoc.testesEspeciais?.oberD || reportDoc.testesEspeciais?.oberE) {
      const te = reportDoc.testesEspeciais;
      const oberAlerts = calculateOberAlerts(te.oberD, te.oberE);
      await ClientTestRecord.create({
        clienteId,
        profissionalId,
        data,
        tipoTeste: 'OBER',
        dados: { oberD: te.oberD, oberE: te.oberE },
        metricas: {
          classificacao: te.oberD === 'Positivo' || te.oberE === 'Positivo' ? 'Retração Positiva' : 'Normal',
          alertasClinicos: oberAlerts.map(a => ({
            tipo: a.tipo,
            titulo: a.titulo,
            descricao: a.descricao,
            riscoClinico: a.riscoClinico
          }))
        },
        origemDocumento: { tipo: 'PhysioReport', documentoId: docId }
      });
    }
  } catch (err) {
    console.error('Error syncing physio report tests to ClientTestRecord:', err);
  }
}

/**
 * Synchronizes tests from a StrengthTest document into ClientTestRecord
 */
export async function syncStrengthTestRecord(stDoc: any) {
  try {
    const clienteId = toObjectId(stDoc.clienteId);
    const profissionalId = toObjectId(stDoc.profissionalId) || new mongoose.Types.ObjectId('6668ab030303030303030302');
    const data = stDoc.data || new Date().toISOString().split('T')[0];
    const docId = toObjectId(stDoc._id);

    if (!clienteId) return;

    const testesList = stDoc.testesRealizados || [];
    const alerts = calculateStrengthTestAlerts(testesList, stDoc.pesoCliente || 70, 'M');

    await ClientTestRecord.create({
      clienteId,
      profissionalId,
      data,
      tipoTeste: 'DINAMOMETRIA',
      dados: {
        testesRealizados: testesList,
        comparativos: stDoc.comparativos,
        pesoCliente: stDoc.pesoCliente
      },
      metricas: {
        alertasClinicos: alerts.map(a => ({
          tipo: a.tipo,
          titulo: a.titulo,
          descricao: a.descricao,
          riscoClinico: a.riscoClinico
        }))
      },
      origemDocumento: { tipo: 'StrengthTest', documentoId: docId }
    });
  } catch (err) {
    console.error('Error syncing strength test to ClientTestRecord:', err);
  }
}
