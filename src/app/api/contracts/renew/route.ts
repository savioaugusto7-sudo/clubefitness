import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import Payment from '@/models/Payment';
import { syncClientPlanValidity } from '@/utils/commercial';

function formatFormaPagamento(fp?: string): string {
  if (!fp) return 'Pix Manual';
  const lower = fp.toLowerCase();
  if (lower === 'dinheiro') return 'Dinheiro';
  if (lower === 'pix') return 'Pix Manual';
  if (lower === 'cartao' || lower === 'cartão') return 'Cartão Manual';
  if (lower === 'boleto') return 'Boleto';
  if (lower === 'asaas') return 'Asaas';
  return fp;
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId é obrigatório.' }, { status: 400 });
    }

    const client = await Client.findById(clientId).populate('dadosComerciais.planoId');
    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente não encontrado.' }, { status: 404 });
    }

    const com = client.dadosComerciais || {};
    const duracao = com.duracao || 'mensal';
    const duracaoQtd = Number(com.duracaoQtd) || 1;
    const planName = (com.planoId as any)?.nome || 'Plano Personalizado';
    const todayStr = new Date().toISOString().split('T')[0];

    const baseDateStr = com.dataInicio || todayStr;
    const baseDate = new Date((baseDateStr.includes('T') ? baseDateStr.split('T')[0] : baseDateStr) + 'T00:00:00');
    
    // Count existing payments to project the next cycle index
    const N = await Payment.countDocuments({ clientId: client._id });

    // Calculate due date of next cycle (start of cycle N + 1): dataInicio + N cycles
    const nextStartObj = new Date(baseDate);
    if (duracao === 'semana') {
      nextStartObj.setDate(nextStartObj.getDate() + (N * duracaoQtd * 7));
    } else if (duracao === 'anual') {
      nextStartObj.setMonth(nextStartObj.getMonth() + (N * duracaoQtd * 12));
    } else {
      nextStartObj.setMonth(nextStartObj.getMonth() + (N * duracaoQtd));
    }
    const nextStartIso = nextStartObj.toISOString().split('T')[0];

    // Calculate validity end date of next cycle (end of cycle N + 1): dataInicio + (N + 1) cycles
    const nextEndObj = new Date(baseDate);
    if (duracao === 'semana') {
      nextEndObj.setDate(nextEndObj.getDate() + ((N + 1) * duracaoQtd * 7));
    } else if (duracao === 'anual') {
      nextEndObj.setMonth(nextEndObj.getMonth() + ((N + 1) * duracaoQtd * 12));
    } else {
      nextEndObj.setMonth(nextEndObj.getMonth() + ((N + 1) * duracaoQtd));
    }
    const newEndIso = nextEndObj.toISOString().split('T')[0];

    // Calculate payment for the new cycle
    const valorUnitario = Number(com.valorUnitario) || 0;
    const bruto = valorUnitario * duracaoQtd;
    const desc = Number(com.descontoValor) || 0;
    let liquido = bruto;
    if (com.descontoTipo === 'percentual') {
      liquido = bruto * (1 - desc / 100);
    } else {
      liquido = Math.max(0, bruto - desc);
    }

    const isZeroVal = parseFloat(liquido.toFixed(2)) === 0;

    // Create payment installment record for the new cycle
    const paymentRecord = await Payment.create({
      clientId: client._id,
      clientNome: client.dadosPessoais?.nome || 'Sem Nome',
      planoNome: `${planName} (Renovação)`,
      valor: parseFloat(liquido.toFixed(2)),
      vencimento: nextStartIso,
      dataPagamento: isZeroVal ? todayStr : '',
      status: isZeroVal ? 'Pago' : 'Pendente',
      formaPagamento: formatFormaPagamento(com.formaPagamento),
      parcelaNumero: 1,
      parcelasTotal: 1,
      observacoes: `Renovação de vigência executada em ${new Date().toLocaleDateString('pt-BR')}`
    });

    // Update client commercial status and dates
    client.dadosComerciais.vencimento = newEndIso;
    client.dadosComerciais.status = 'ativo';
    client.dadosComerciais.creditosUsados = 0; // Reset used credits for new cycle
    await client.save();

    // If it was created as paid (zero value), trigger sync helper to confirm alignment
    if (isZeroVal) {
      await syncClientPlanValidity(client._id.toString());
    }

    return NextResponse.json({
      success: true,
      message: 'Vigência renovada com sucesso!',
      data: {
        novoVencimento: newEndIso,
        vencimentoFormatado: nextEndObj.toLocaleDateString('pt-BR'),
        pagamento: paymentRecord
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
