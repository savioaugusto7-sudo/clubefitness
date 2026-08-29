import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import Contract from '@/models/Contract';
import Proposal from '@/models/Proposal';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await dbConnect();

    const clients = await Client.find({}).lean();
    const reports: any[] = [];
    let healedCount = 0;
    let leadCount = 0;

    for (const client of clients) {
      const com = client.dadosComerciais || {};
      const dp = client.dadosPessoais || {};
      const clientName = dp.nome || client.nome || 'Aluno';
      const status = com.status || 'lead';

      // 1. Se for LEAD puro, manter intacto sem inventar dados
      if (status === 'lead') {
        leadCount++;
        reports.push({
          id: client._id,
          nome: clientName,
          status: 'lead',
          tipo: 'lead_puro',
          mensagem: 'Lead preservado com dados pessoais oficiais. Sem dados comerciais fictícios.'
        });
        continue;
      }

      // 2. Para alunos com vínculo comercial (ativo, vencido, congelado, etc.), buscar dados contratuais oficiais
      const contract: any = await Contract.findOne({ clientId: client._id, status: { $ne: 'cancelado' } })
        .sort({ createdAt: -1 })
        .lean();
      
      const proposal: any = await Proposal.findOne({ clientId: client._id })
        .sort({ createdAt: -1 })
        .lean();

      // Extração de data de início oficial
      let officialDataInicio = com.dataInicio || contract?.dataInicio || proposal?.dataInicio || '';
      
      // Limpeza de typo no ano (ex: 62026-06-15 -> 2026-06-15)
      if (officialDataInicio && officialDataInicio.startsWith('6202')) {
        officialDataInicio = officialDataInicio.replace(/^6202/, '202');
      }

      // Extrair da string "Assinado em DD/MM/AAAA" se ainda não tiver
      if (!officialDataInicio && com.contrato) {
        const match = String(com.contrato).match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (match) {
          officialDataInicio = `${match[3]}-${match[2]}-${match[1]}`;
        }
      }

      // Extração de dataFim oficial (término da vigência de acesso)
      let officialDataFim = com.dataFim || contract?.dataFim || com.vencimento || '';
      if (officialDataFim && officialDataFim.startsWith('6202')) {
        officialDataFim = officialDataFim.replace(/^6202/, '202');
      }

      // Extração de 1º Vencimento e Dia de Vencimento
      let officialFirstVenc = com.dataPrimeiroVencimento || contract?.dataPrimeiroVencimento || proposal?.dataVencimentoEscolhida || officialDataInicio || '';
      if (officialFirstVenc && officialFirstVenc.startsWith('6202')) {
        officialFirstVenc = officialFirstVenc.replace(/^6202/, '202');
      }

      const officialDiaVenc = com.diaVencimento || contract?.diaVencimento || (officialFirstVenc ? parseInt(officialFirstVenc.split('-')[2] || '5', 10) : 5);

      const officialValorTotal = Number(
        contract?.valorLiquido || 
        contract?.valorTotal || 
        proposal?.valorFinalRecalculado || 
        proposal?.valorAcordado || 
        com.valorTotal || 
        com.valorUnitario || 
        0
      );

      // Persistir correções oficiais no banco
      const updateData: any = {};
      let needsUpdate = false;

      if (!com.dataInicio || com.dataInicio !== officialDataInicio) {
        updateData['dadosComerciais.dataInicio'] = officialDataInicio;
        needsUpdate = true;
      }
      if (!com.dataFim || com.dataFim !== officialDataFim) {
        updateData['dadosComerciais.dataFim'] = officialDataFim;
        updateData['dadosComerciais.vencimento'] = officialDataFim;
        needsUpdate = true;
      }
      if (!com.dataPrimeiroVencimento || com.dataPrimeiroVencimento !== officialFirstVenc) {
        updateData['dadosComerciais.dataPrimeiroVencimento'] = officialFirstVenc;
        needsUpdate = true;
      }
      if (!com.diaVencimento || com.diaVencimento !== officialDiaVenc) {
        updateData['dadosComerciais.diaVencimento'] = officialDiaVenc;
        needsUpdate = true;
      }
      if (!com.valorTotal || com.valorTotal !== officialValorTotal) {
        updateData['dadosComerciais.valorTotal'] = officialValorTotal;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await Client.updateOne({ _id: client._id }, { $set: updateData });
        healedCount++;
      }

      reports.push({
        id: client._id,
        nome: clientName,
        status,
        dataInicio: officialDataInicio,
        dataFim: officialDataFim,
        dataPrimeiroVencimento: officialFirstVenc,
        diaVencimento: officialDiaVenc,
        valorTotal: officialValorTotal,
        atualizado: needsUpdate
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Auditoria e saneamento de clientes concluído com sucesso.',
      stats: {
        totalClients: clients.length,
        healedCount,
        leadCount
      },
      reports
    });
  } catch (error: any) {
    console.error('[Heal Clients API] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
