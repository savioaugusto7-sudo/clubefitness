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

  const punches = await db.collection('pontorecords').find({
    data: { $gte: '2026-10-01', $lte: '2026-10-31' }
  }).toArray();

  const businessDays = [
    { iso: '2026-10-01', dow: 'Qui', br: '01/10/2026' },
    { iso: '2026-10-02', dow: 'Sex', br: '02/10/2026' },
    { iso: '2026-10-05', dow: 'Seg', br: '05/10/2026' },
    { iso: '2026-10-06', dow: 'Ter', br: '06/10/2026' },
    { iso: '2026-10-07', dow: 'Qua', br: '07/10/2026' },
    { iso: '2026-10-08', dow: 'Qui', br: '08/10/2026' },
    { iso: '2026-10-09', dow: 'Sex', br: '09/10/2026' },
    { iso: '2026-10-13', dow: 'Ter', br: '13/10/2026' },
    { iso: '2026-10-14', dow: 'Qua', br: '14/10/2026' },
    { iso: '2026-10-15', dow: 'Qui', br: '15/10/2026' },
    { iso: '2026-10-16', dow: 'Sex', br: '16/10/2026' },
    { iso: '2026-10-19', dow: 'Seg', br: '19/10/2026' },
    { iso: '2026-10-20', dow: 'Ter', br: '20/10/2026' },
    { iso: '2026-10-21', dow: 'Qua', br: '21/10/2026' },
    { iso: '2026-10-22', dow: 'Qui', br: '22/10/2026' },
    { iso: '2026-10-23', dow: 'Sex', br: '23/10/2026' },
    { iso: '2026-10-26', dow: 'Seg', br: '26/10/2026' },
    { iso: '2026-10-27', dow: 'Ter', br: '27/10/2026' },
    { iso: '2026-10-28', dow: 'Qua', br: '28/10/2026' },
    { iso: '2026-10-29', dow: 'Qui', br: '29/10/2026' },
    { iso: '2026-10-30', dow: 'Sex', br: '30/10/2026' }
  ];

  function calcProf(profName) {
    const profPunches = punches.filter(p => p.profissionalNome?.toLowerCase().includes(profName.toLowerCase().split(' ')[0]));
    let totalAtrasosMin = 0;
    let totalAtrasoDebito = 0;
    let totalAusenciaDebito = 0;
    const details = [];

    businessDays.forEach(bd => {
      const p = profPunches.find(x => x.data === bd.iso);
      let status = '';
      let debito = 0;

      if (profName === 'Cleiton Freitas') {
        if (p) {
          if (bd.iso === '2026-10-06') {
            status = 'Abonado (Teste técnico)';
          } else if (p.minutosAtraso > 0) {
            status = `Atraso ${p.minutosAtraso}m`;
            debito = -p.minutosAtraso;
            totalAtrasoDebito += debito;
            totalAtrasosMin += p.minutosAtraso;
          } else {
            status = 'Pontual';
          }
        } else {
          status = 'Sem registro';
          debito = -20;
          totalAusenciaDebito += debito;
        }
      } else if (profName === 'Ruthi Novais') {
        if (p) {
          if (p.minutosAtraso > 0) {
            status = `Atraso ${p.minutosAtraso}m`;
            debito = -p.minutosAtraso;
            totalAtrasoDebito += debito;
            totalAtrasosMin += p.minutosAtraso;
          } else {
            status = 'Pontual';
          }
        } else {
          status = 'Sem registro';
          debito = -20;
          totalAusenciaDebito += debito;
        }
      } else if (profName === 'Pedro Grossi') {
        if (p) {
          if (p.minutosAtraso > 0) {
            status = `Atraso ${p.minutosAtraso}m`;
            debito = -p.minutosAtraso;
            totalAtrasoDebito += debito;
            totalAtrasosMin += p.minutosAtraso;
          } else {
            status = 'Pontual';
          }
        } else {
          status = 'Sem registro';
          debito = -20;
          totalAusenciaDebito += debito;
        }
      } else if (profName === 'Matheus Poeiras Luciano') {
        if (p) {
          if (p.minutosAtraso > 0) {
            status = `Atraso ${p.minutosAtraso}m`;
            debito = -p.minutosAtraso;
            totalAtrasoDebito += debito;
            totalAtrasosMin += p.minutosAtraso;
          } else {
            status = 'Pontual';
          }
        } else {
          status = 'Sem registro';
          debito = -20;
          totalAusenciaDebito += debito;
        }
      } else if (profName === 'Rachel Zauli Serpa') {
        if (p) {
          status = 'Pontual';
        } else {
          status = 'Sem registro';
          debito = -20;
          totalAusenciaDebito += debito;
        }
      } else if (profName === 'Guilherme José Graciano') {
        if (bd.iso === '2026-10-16') {
          status = 'Abonado oficial';
        } else if (p) {
          // Check if afternoon shift applies (21/10 onwards)
          let esp = '08:00';
          if (['2026-10-21', '2026-10-22', '2026-10-26', '2026-10-28', '2026-10-29'].includes(bd.iso)) {
            esp = '14:00';
          }
          // calculate delay vs esp
          const [h, m] = p.horario.split(':').map(Number);
          const [eh, em] = esp.split(':').map(Number);
          const pMin = h * 60 + m;
          const eMin = eh * 60 + em;
          const atraso = Math.max(0, pMin - eMin);
          if (atraso > 0) {
            status = `Atraso ${atraso}m`;
            debito = -atraso;
            totalAtrasoDebito += debito;
            totalAtrasosMin += atraso;
          } else {
            status = 'Pontual';
          }
        } else {
          status = 'Sem registro';
          debito = -20;
          totalAusenciaDebito += debito;
        }
      } else if (profName === 'Thiago Castro Lima Rocha') {
        if (bd.iso < '2026-10-16') {
          status = '-'; // Pre-admission requested as '-'
        } else if (bd.iso === '2026-10-22') {
          status = 'Abonado oficial (Esqueceu de marcar)';
        } else if (p) {
          const [h, m] = p.horario.split(':').map(Number);
          const atraso = Math.max(0, (h * 60 + m) - (7 * 60));
          if (atraso > 0) {
            status = `Atraso ${atraso}m`;
            debito = -atraso;
            totalAtrasoDebito += debito;
            totalAtrasosMin += atraso;
          } else {
            status = 'Pontual';
          }
        } else {
          status = 'Sem registro';
          debito = -20;
          totalAusenciaDebito += debito;
        }
      } else if (profName === 'Maria Luísa Câmara Gontijo') {
        if (bd.iso < '2026-10-05') {
          status = '-'; // Pre-admission / pre-start as '-'
        } else if (bd.dow === 'Qua') {
          status = 'Folga semanal';
        } else if (bd.dow === 'Qui' && !p) {
          status = 'Abonado (Quinta não-fixo)';
        } else if (bd.iso === '2026-10-05') {
          status = 'Abonado oficial (Primeiro plantão)';
        } else if (p) {
          let esp = '09:00';
          if (bd.dow === 'Ter') esp = '07:00';
          if (bd.dow === 'Qui') esp = '07:00';
          if (bd.dow === 'Sex') esp = '14:00';
          const [h, m] = p.horario.split(':').map(Number);
          const [eh, em] = esp.split(':').map(Number);
          const atraso = Math.max(0, (h * 60 + m) - (eh * 60 + em));
          if (atraso > 0) {
            status = `Atraso ${atraso}m`;
            debito = -atraso;
            totalAtrasoDebito += debito;
            totalAtrasosMin += atraso;
          } else {
            status = 'Pontual';
          }
        } else {
          status = 'Sem registro';
          debito = -20;
          totalAusenciaDebito += debito;
        }
      }

      if (debito !== 0 || status.includes('Atraso') || status === 'Sem registro') {
        details.push(`${bd.iso} (${bd.dow}): ${status} -> ${debito} pts`);
      }
    });

    console.log(`\n=== ${profName} ===`);
    console.log(`Atrasos: ${totalAtrasoDebito} pts (${totalAtrasosMin} min) | Ausências: ${totalAusenciaDebito} pts | Total Débito Ponto: ${totalAtrasoDebito + totalAusenciaDebito} pts`);
    details.forEach(d => console.log('  ', d));

    return {
      profName,
      atrasosMin: totalAtrasosMin,
      debitoAtrasos: totalAtrasoDebito,
      debitoAusencias: totalAusenciaDebito,
      totalDebitoPonto: totalAtrasoDebito + totalAusenciaDebito
    };
  }

  const results = [
    calcProf('Cleiton Freitas'),
    calcProf('Guilherme José Graciano'),
    calcProf('Ruthi Novais'),
    calcProf('Albert Nunes'),
    calcProf('Pedro Grossi'),
    calcProf('Rachel Zauli Serpa'),
    calcProf('Matheus Poeiras Luciano'),
    calcProf('Maria Luísa Câmara Gontijo'),
    calcProf('Thiago Castro Lima Rocha')
  ];

  console.log('\n\nRESUMO GERAL DOS DEBITOS DE PONTO:');
  console.table(results);

  process.exit(0);
}

run();
