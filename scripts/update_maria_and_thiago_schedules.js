const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
let uri = '';
env.split('\n').forEach(l => { 
  if (l.trim().startsWith('MONGODB_URI=')) {
    uri = l.trim().replace('MONGODB_URI=', '').trim(); 
  }
});

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const prof = await db.collection('professionals').findOne({ nome: /Maria Lu/i });
  console.log('Maria Luísa prof:', prof);

  const mariaSchedule = {
    profissionalId: prof._id,
    profissionalNome: prof.nome,
    diasSemana: {
      '0': { ativo: false, horarioEntrada: '08:00', horarioSaida: '12:00', periodoNome: 'Domingo' },
      '1': { ativo: true, horarioEntrada: '09:00', horarioSaida: '13:00', periodoNome: 'Manhã (09h)' },
      '2': { ativo: true, horarioEntrada: '07:00', horarioSaida: '13:00', periodoNome: 'Manhã (07h)' },
      '3': { ativo: false, horarioEntrada: '08:00', horarioSaida: '12:00', periodoNome: 'Quarta (Folga)' },
      '4': { ativo: true, horarioEntrada: '07:00', horarioSaida: '13:00', periodoNome: 'Quinta (07h - Não fixo / Abonado se ausente)' },
      '5': { ativo: true, horarioEntrada: '14:00', horarioSaida: '18:00', periodoNome: 'Tarde (14h)' },
      '6': { ativo: false, horarioEntrada: '08:00', horarioSaida: '12:00', periodoNome: 'Sábado' }
    },
    folgasEspecificas: [],
    updatedAt: new Date()
  };

  const res = await db.collection('professionalschedules').updateOne(
    { profissionalId: prof._id },
    { $set: mariaSchedule },
    { upsert: true }
  );
  console.log('Updated Maria schedule:', res);

  // Thiago schedule check
  const profThiago = await db.collection('professionals').findOne({ nome: /Thiago/i });
  if (profThiago) {
    const thiagoSchedule = {
      profissionalId: profThiago._id,
      profissionalNome: profThiago.nome,
      diasSemana: {
        '0': { ativo: false, horarioEntrada: '08:00', horarioSaida: '12:00', periodoNome: 'Domingo' },
        '1': { ativo: true, horarioEntrada: '07:00', horarioSaida: '13:00', periodoNome: 'Manhã (07h)' },
        '2': { ativo: true, horarioEntrada: '07:00', horarioSaida: '13:00', periodoNome: 'Manhã (07h)' },
        '3': { ativo: true, horarioEntrada: '07:00', horarioSaida: '13:00', periodoNome: 'Manhã (07h)' },
        '4': { ativo: true, horarioEntrada: '07:00', horarioSaida: '13:00', periodoNome: 'Manhã (07h)' },
        '5': { ativo: true, horarioEntrada: '07:00', horarioSaida: '13:00', periodoNome: 'Manhã (07h)' },
        '6': { ativo: false, horarioEntrada: '08:00', horarioSaida: '12:00', periodoNome: 'Sábado' }
      },
      folgasEspecificas: [],
      updatedAt: new Date()
    };
    const resT = await db.collection('professionalschedules').updateOne(
      { profissionalId: profThiago._id },
      { $set: thiagoSchedule },
      { upsert: true }
    );
    console.log('Updated Thiago schedule:', resT);
  }

  // Also record abono for Thiago on 22/10/2026 in scoreadjustments
  const existingAbonoThiago = await db.collection('scoreadjustments').findOne({
    profissionalNome: /Thiago/i,
    motivo: /22\/10/
  });
  if (!existingAbonoThiago && profThiago) {
    await db.collection('scoreadjustments').insertOne({
      profissionalId: profThiago._id,
      profissionalNome: profThiago.nome,
      pontos: 0,
      tipo: 'abono_ponto',
      motivo: 'Abonado pela gestão: 22/10/2026 (Qui) - Thiago chegou no horário e esqueceu de marcar',
      mesReferencia: '2026-10',
      criadoEm: new Date()
    });
    console.log('Inserted Thiago 22/10 abono into scoreadjustments');
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
