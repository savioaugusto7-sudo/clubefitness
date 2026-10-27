import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import PhysicalAssessment from '@/models/PhysicalAssessment';
import PhysioReport from '@/models/PhysioReport';
import StrengthTest from '@/models/StrengthTest';
import ClientTestRecord from '@/models/ClientTestRecord';
import { checkSessionPermission } from '@/utils/authHelper';

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

export async function GET(request: Request) {
  try {
    const auth = await checkSessionPermission(['admin', 'profissional', 'recepcao'], undefined, request);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: 'Acesso não autorizado' }, { status: 401 });
    }

    await dbConnect();

    // 1. Buscar todos os alunos ativos / cadastrados (sem excluídos anonimizados)
    const clients = await Client.find(
      { 'dadosComerciais.status': { $ne: 'excluido_anonimizado' } },
      {
        _id: 1,
        'dadosPessoais.nome': 1,
        'dadosPessoais.idade': 1,
        'dadosPessoais.telefone': 1,
        'dadosPessoais.cpf': 1,
        'dadosPessoais.email': 1,
        'dadosComerciais.status': 1,
        'dadosClinicos.lesoes': 1,
        'dadosClinicos.restricoes': 1,
        createdAt: 1
      }
    )
      .sort({ 'dadosPessoais.nome': 1 })
      .lean()
      .maxTimeMS(8000);

    const clientIds = clients.map(c => c._id);
    const clientIdsStr = clients.map(c => c._id.toString());

    // 2. Agregar contagens e últimas datas de forma ultrarrápida e real em paralelo
    const [paAgg, prAgg, stAgg, trAgg] = await Promise.all([
      PhysicalAssessment.aggregate([
        { $match: { clienteId: { $in: [...clientIds, ...clientIdsStr] } } },
        {
          $group: {
            _id: '$clienteId',
            total: { $sum: 1 },
            ultimaData: { $max: '$data' }
          }
        }
      ]),
      PhysioReport.aggregate([
        { $match: { clienteId: { $in: [...clientIds, ...clientIdsStr] } } },
        {
          $group: {
            _id: '$clienteId',
            total: { $sum: 1 },
            ultimaData: { $max: '$data' }
          }
        }
      ]),
      StrengthTest.aggregate([
        { $match: { clienteId: { $in: [...clientIds, ...clientIdsStr] } } },
        {
          $group: {
            _id: '$clienteId',
            total: { $sum: 1 },
            ultimaData: { $max: '$data' }
          }
        }
      ]),
      ClientTestRecord.aggregate([
        { $match: { clienteId: { $in: [...clientIds, ...clientIdsStr] } } },
        {
          $group: {
            _id: '$clienteId',
            total: { $sum: 1 },
            ultimaData: { $max: '$data' },
            temAlertaCritico: {
              $max: {
                $cond: [
                  { $gt: [{ $size: { $ifNull: ['$metricas.alertasClinicos', []] } }, 0] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    // Mapear agregações por ID de cliente em string
    const statsMap: Record<string, {
      totalPA: number;
      totalPR: number;
      totalST: number;
      totalTR: number;
      ultimaData: string;
      temAlertaCritico: boolean;
    }> = {};

    const registerStats = (aggList: any[], key: 'totalPA' | 'totalPR' | 'totalST' | 'totalTR') => {
      aggList.forEach(item => {
        const idStr = item._id?.toString();
        if (!idStr) return;
        if (!statsMap[idStr]) {
          statsMap[idStr] = {
            totalPA: 0,
            totalPR: 0,
            totalST: 0,
            totalTR: 0,
            ultimaData: '',
            temAlertaCritico: false
          };
        }
        statsMap[idStr][key] = item.total || 0;
        if (item.ultimaData && (!statsMap[idStr].ultimaData || item.ultimaData > statsMap[idStr].ultimaData)) {
          statsMap[idStr].ultimaData = item.ultimaData;
        }
        if (item.temAlertaCritico) {
          statsMap[idStr].temAlertaCritico = true;
        }
      });
    };

    registerStats(paAgg, 'totalPA');
    registerStats(prAgg, 'totalPR');
    registerStats(stAgg, 'totalST');
    registerStats(trAgg, 'totalTR');

    const result = clients.map(c => {
      const idStr = c._id.toString();
      const st = statsMap[idStr] || {
        totalPA: 0,
        totalPR: 0,
        totalST: 0,
        totalTR: 0,
        ultimaData: '',
        temAlertaCritico: false
      };

      const totalAvaliacoes = st.totalPA + st.totalPR;
      const totalTestes = st.totalST + st.totalTR;
      const totalGeral = totalAvaliacoes + totalTestes;

      return {
        _id: idStr,
        nome: c.dadosPessoais?.nome || 'Sem Nome',
        idade: c.dadosPessoais?.idade || null,
        telefone: c.dadosPessoais?.telefone || '',
        cpf: c.dadosPessoais?.cpf || '',
        email: c.dadosPessoais?.email || '',
        status: c.dadosComerciais?.status || 'ativo',
        lesoes: c.dadosClinicos?.lesoes || '',
        restricoes: c.dadosClinicos?.restricoes || '',
        totalAvaliacoes,
        totalTestes,
        totalGeral,
        totalPA: st.totalPA,
        totalPR: st.totalPR,
        totalST: st.totalST,
        totalTR: st.totalTR,
        ultimaData: st.ultimaData || '',
        temAlertaCritico: st.temAlertaCritico
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
      total: result.length
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (error: any) {
    console.error('Erro ao listar alunos na Central de Avaliações:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
