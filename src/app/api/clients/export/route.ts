import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import PhysicalAssessment from '@/models/PhysicalAssessment';
import PhysioReport from '@/models/PhysioReport';
import StrengthTest from '@/models/StrengthTest';
import Prontuario from '@/models/Prontuario';
import { checkSessionPermission } from '@/utils/authHelper';

export async function GET(request: Request) {
  try {
    await dbConnect();
    
    // 1. Apenas administradores e profissionais podem exportar dossiê completo de dados
    await checkSessionPermission(['admin', 'professional']);

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Parâmetro clientId ausente' }, { status: 400 });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Aluno não encontrado' }, { status: 404 });
    }

    // 2. Coleta todos os registros de saúde vinculados em paralelo
    const [assessments, reports, strengthTests, prontuarios] = await Promise.all([
      PhysicalAssessment.find({ clienteId: clientId }),
      PhysioReport.find({ clienteId: clientId }),
      StrengthTest.find({ clienteId: clientId }),
      Prontuario.find({ clienteId: clientId })
    ]);

    // 3. Monta o dossiê consolidado estruturado (LGPD)
    const dossier = {
      exportadoEm: new Date().toISOString(),
      cliente: {
        codigo: client.codigo,
        cadastroConcluido: client.cadastroConcluido,
        termoAceito: client.termoAceito,
        dataAceiteTermo: client.dataAceiteTermo,
        dadosPessoais: client.dadosPessoais,
        dadosClinicos: client.dadosClinicos,
        dadosComerciais: client.dadosComerciais
      },
      avaliacoesFisicas: assessments.map(as => ({
        data: as.data,
        dadosMedidos: as.dadosMedidos,
        resultadosCalculados: as.resultadosCalculados,
        metas: as.metas,
        observacoes: as.observacoes
      })),
      laudosRelatorios: reports.map(rep => ({
        data: rep.data,
        conteudo: rep.conteudo,
        anamnese: rep.anamnese,
        goniometria: rep.goniometria,
        testesEspeciais: rep.testesEspeciais,
        termografia: rep.termografia,
        testesOrtopedicos: rep.testesOrtopedicos,
        perimetria: rep.perimetria
      })),
      testesForca: strengthTests.map(st => ({
        data: st.data,
        exercicios: st.exercicios,
        analise: st.analise,
        pesoCliente: st.pesoCliente,
        testesRealizados: st.testesRealizados,
        comparativos: st.comparativos,
        observacoes: st.observacoes
      })),
      prontuarios: prontuarios.map(pr => ({
        data: pr.data,
        conteudo: pr.conteudo
      }))
    };

    return NextResponse.json({ success: true, data: dossier });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
