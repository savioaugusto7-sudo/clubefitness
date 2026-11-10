const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const match = envContent.match(/MONGODB_URI=(.*)/);
const uri = match[1].trim().replace(/["']/g, '');

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const clientId = new mongoose.Types.ObjectId('6a5fd12deacd73a3fea7de27');
  const contractId = new mongoose.Types.ObjectId('6abfc5ab8d093e38904bde01');

  // Verify if Pedro already has any payment
  const existing = await db.collection('payments').find({ clientId }).toArray();
  if (existing.length > 0) {
    console.log(`Pedro Ferraz already has ${existing.length} payments in DB. Removing to re-create...`);
    await db.collection('payments').deleteMany({ clientId });
  }

  const vencimentos = [
    '2026-06-25',
    '2026-07-25',
    '2026-08-25',
    '2026-09-25',
    '2026-10-25',
    '2026-11-25',
    '2026-12-25',
    '2027-01-25',
    '2027-02-25',
    '2027-03-25',
    '2027-04-25',
    '2027-05-25'
  ];

  const parcelas = vencimentos.map((venc, idx) => {
    const num = idx + 1;
    // Até outubro/2026: pago. Vencimento <= 2026-10-31 é pago
    const isPago = venc <= '2026-10-31';
    return {
      clientId,
      clientNome: 'Pedro Ferraz de Azevedo',
      contractId,
      planoNome: 'Clube Fitness - Monitorado',
      valor: 780.00,
      vencimento: venc,
      dataPagamento: isPago ? venc : '',
      status: isPago ? 'Pago' : 'Pendente',
      formaPagamento: 'Wellhub',
      asaasPaymentId: '',
      asaasInvoiceUrl: '',
      parcelaNumero: num,
      parcelasTotal: 12,
      observacoes: `Check-in Wellhub - Parcela manual (${num}/12)`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  const insertResult = await db.collection('payments').insertMany(parcelas);
  console.log(`Successfully inserted ${insertResult.insertedCount} parcelas for Pedro Ferraz.`);

  // Update client commercial data
  await db.collection('clients').updateOne(
    { _id: clientId },
    {
      $set: {
        'dadosComerciais.parcelas': 12,
        'dadosComerciais.valorUnitario': 780,
        'dadosComerciais.formaPagamento': 'wellhub',
        updatedAt: new Date()
      }
    }
  );
  console.log('Client dadosComerciais updated.');

  // Update contract
  await db.collection('contracts').updateOne(
    { _id: contractId },
    {
      $set: {
        parcelas: 12,
        formaPagamento: 'wellhub',
        updatedAt: new Date()
      }
    }
  );
  console.log('Contract updated.');

  await mongoose.disconnect();
}

run().catch(console.error);

