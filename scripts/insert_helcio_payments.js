const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const match = envContent.match(/MONGODB_URI=(.*)/);
const uri = match[1].trim().replace(/["']/g, '');

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const clientId = new mongoose.Types.ObjectId('6a8a40a1cb07f85cca3ec826');
  const client = await db.collection('clients').findOne({ _id: clientId });
  if (!client) {
    console.error('Client Helcio not found!');
    process.exit(1);
  }

  const contract = await db.collection('contracts').findOne({ clientId }, { sort: { createdAt: -1 } });
  const contractId = contract ? contract._id : null;

  // Check if payments already exist for Helcio
  const existing = await db.collection('payments').find({ clientId }).toArray();
  if (existing.length > 0) {
    console.log(`Found ${existing.length} existing payments for Helcio. Removing before re-inserting...`);
    await db.collection('payments').deleteMany({ clientId });
  }

  // 1 parcela em 02/10/2026 (PAGA) + 10 parcelas novembro a diante (PENDENTES)
  const vencimentos = [
    { venc: '2026-10-02', status: 'Pago', pagoEm: '2026-10-02' },
    { venc: '2026-11-02', status: 'Pendente', pagoEm: '' },
    { venc: '2026-12-02', status: 'Pendente', pagoEm: '' },
    { venc: '2027-01-02', status: 'Pendente', pagoEm: '' },
    { venc: '2027-02-02', status: 'Pendente', pagoEm: '' },
    { venc: '2027-03-02', status: 'Pendente', pagoEm: '' },
    { venc: '2027-04-02', status: 'Pendente', pagoEm: '' },
    { venc: '2027-05-02', status: 'Pendente', pagoEm: '' },
    { venc: '2027-06-02', status: 'Pendente', pagoEm: '' },
    { venc: '2027-07-02', status: 'Pendente', pagoEm: '' },
    { venc: '2027-08-02', status: 'Pendente', pagoEm: '' }
  ];

  const totalParcelas = vencimentos.length; // 11 parcelas

  const paymentsToInsert = vencimentos.map((item, idx) => {
    const num = idx + 1;
    return {
      clientId,
      clientNome: 'Helcio Dias Florencio',
      contractId,
      planoNome: 'Tratamento Personalizado',
      valor: 656.00,
      vencimento: item.venc,
      dataPagamento: item.pagoEm,
      status: item.status,
      formaPagamento: 'Cartão Manual',
      asaasPaymentId: '',
      asaasInvoiceUrl: '',
      parcelaNumero: num,
      parcelasTotal: totalParcelas,
      observacoes: `Contrato Tratamento Personalizado (Cartão) - Parcela ${num}/${totalParcelas}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  const res = await db.collection('payments').insertMany(paymentsToInsert);
  console.log(`Inserted ${res.insertedCount} payments for Helcio.`);

  // Update client dadosComerciais
  await db.collection('clients').updateOne(
    { _id: clientId },
    {
      $set: {
        'dadosComerciais.valorUnitario': 656.00,
        'dadosComerciais.valorTotal': 656.00 * totalParcelas,
        'dadosComerciais.parcelas': totalParcelas,
        'dadosComerciais.formaPagamento': 'cartao',
        'dadosComerciais.diaVencimento': 2,
        'dadosComerciais.dataPrimeiroVencimento': '2026-10-02',
        updatedAt: new Date()
      }
    }
  );
  console.log('Client dadosComerciais updated.');

  // Update contract
  if (contractId) {
    await db.collection('contracts').updateOne(
      { _id: contractId },
      {
        $set: {
          valorLiquido: 656.00 * totalParcelas,
          parcelas: totalParcelas,
          formaPagamento: 'cartao',
          updatedAt: new Date()
        }
      }
    );
    console.log('Contract updated.');
  }

  await mongoose.disconnect();
}

run().catch(console.error);

