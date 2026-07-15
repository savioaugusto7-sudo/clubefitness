import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import PhysioReport from '@/models/PhysioReport';
import Client from '@/models/Client';
import Professional from '@/models/Professional';
import { checkSessionPermission } from '@/utils/authHelper';

export async function GET(request: Request) {
  try {
    await dbConnect();

    // Register schemas
    const _client = Client;
    const _prof = Professional;

    const { user } = await checkSessionPermission(['admin', 'professional', 'client']);

    let query = {};
    if (user.role === 'professional' && user.email !== 'coletivo@clube.com') {
      const linkedClients = await Client.find({ profissionalId: user.professionalProfileId }).select('_id');
      const clientIds = linkedClients.map(c => c._id);
      query = { clienteId: { $in: clientIds } };
    } else if (user.role === 'client') {
      query = { clienteId: user.clientProfileId };
    }

    const reports = await PhysioReport.find(query)
      .populate('clienteId')
      .populate('profissionalId');

    return NextResponse.json({ success: true, data: reports });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    await checkSessionPermission(['admin', 'professional']);

    const body = await request.json();
    const { clienteId, profissionalId, data, conteudo, anamnese, goniometria, testesEspeciais, termografia, testesOrtopedicos, pdfName, tempoGastoSegundos } = body;

    if (!clienteId || !profissionalId || !data || !conteudo) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const report = await PhysioReport.create({
      clienteId,
      profissionalId,
      data,
      conteudo,
      anamnese,
      goniometria,
      testesEspeciais,
      termografia,
      testesOrtopedicos,
      pdfName,
      tempoGastoSegundos: Number(tempoGastoSegundos) || 0
    });

    // Populate so the PDF generator has access to client and professional names
    const populatedReport = await PhysioReport.findById(report._id)
      .populate('clienteId')
      .populate('profissionalId');

    return NextResponse.json({ success: true, data: populatedReport });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    
    await checkSessionPermission(['admin', 'professional']);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 });
    }

    await PhysioReport.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Physiotherapy report deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
