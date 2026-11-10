const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/MONGODB_URI=(.*)/);
const uri = match[1].trim().replace(/["']/g, '');

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const clientId = new mongoose.Types.ObjectId('6ac6b86cf35eac86b346fee8');
  const contractId = new mongoose.Types.ObjectId('6ac79bff513c31a418050bfd');

  // Check if any payment already exists for Lucia
  const existing = await db.collection('payments').find({ clientId }).toArray();
  if (existing.length > 0) {
    console.log(`Lucia already has ${existing.length} payments:`, existing);
  } else {
    const parcelas = [
      {
        clientId,
        clientNome: 'Lúcia da Silva',
        contractId,
        planoNome: 'Tratamento Personalizado ',
        valor: 266.66,
        vencimento: '2026-10-08',
        dataPagamento: '',
        status: 'Pendente',
        formaPagamento: 'Boleto',
        asaasPaymentId: '',
        asaasInvoiceUrl: '',
        parcelaNumero: 1,
        parcelasTotal: 3,
        observacoes: 'Parcelamento manual (1/3)',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        clientId,
        clientNome: 'Lúcia da Silva',
        contractId,
        planoNome: 'Tratamento Personalizado ',
        valor: 266.66,
        vencimento: '2026-11-08',
        dataPagamento: '',
        status: 'Pendente',
        formaPagamento: 'Boleto',
        asaasPaymentId: '',
        asaasInvoiceUrl: '',
        parcelaNumero: 2,
        parcelasTotal: 3,
        observacoes: 'Parcelamento manual (2/3)',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        clientId,
        clientNome: 'Lúcia da Silva',
        contractId,
        planoNome: 'Tratamento Personalizado ',
        valor: 266.68,
        vencimento: '2026-12-08',
        dataPagamento: '',
        status: 'Pendente',
        formaPagamento: 'Boleto',
        asaasPaymentId: '',
        asaasInvoiceUrl: '',
        parcelaNumero: 3,
        parcelasTotal: 3,
        observacoes: 'Parcelamento manual (3/3)',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const result = await db.collection('payments').insertMany(parcelas);
    console.log('Inserted 3 parcelas for Lúcia da Silva:', result.insertedIds);
  }

  // Update client commercial data to have parcelas: 3
  await db.collection('clients').updateOne(
    { _id: clientId },
    {
      $set: {
        'dadosComerciais.parcelas': 3,
        'dadosComerciais.formaPagamento': 'boleto',
        updatedAt: new Date()
      }
    }
  );

  await mongoose.disconnect();
}

run().catch(console.error);

