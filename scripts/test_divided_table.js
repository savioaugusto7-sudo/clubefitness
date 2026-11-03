const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
let uri = '';
env.split('\n').forEach(l => { 
  if (l.trim().startsWith('MONGODB_URI=')) uri = l.trim().replace('MONGODB_URI=', '').trim(); 
});

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log('Testing divided table generation...');

  // 1. Data mapping for all 9 professionals:
  const data = [
    {
      pos: '1º',
      nome: 'Cleiton Freitas',
      somas: {
        aval: 4,
        testes: 0,
        relat: 12,
        freq80: 122.5,
        treinoLivre: 14,
        emergOk: 69,
        abonos: 193 // teste tecnico abonado
      },
      debitos: {
        slaFicha: 0,
        vencidos: 0,
        freqBaixa: 32.5,
        semTreino: 34,
        emergExtra: 4,
        ausPonto: 0,
        atrasoPonto: 193 // cobrado e abonado em abonos
      },
      assiduidade: '21 / 21 (100%)'
    },
    {
      pos: '2º',
      nome: 'Matheus Poeiras Luciano',
      somas: {
        aval: 4,
        testes: 0,
        relat: 0,
        freq80: 133,
        treinoLivre: 1,
        emergOk: 60,
        abonos: 2 // ficha maria de fatima
      },
      debitos: {
        slaFicha: 0,
        vencidos: 10,
        freqBaixa: 12.5,
        semTreino: 42,
        emergExtra: 6,
        ausPonto: 0,
        atrasoPonto: 10
      },
      assiduidade: '21 / 21 (10m atraso)'
    },
    {
      pos: '3º',
      nome: 'Pedro Grossi',
      somas: {
        aval: 12,
        testes: 12,
        relat: 36,
        freq80: 76,
        treinoLivre: 0,
        emergOk: 0,
        abonos: 0
      },
      debitos: {
        slaFicha: 6,
        vencidos: 0,
        freqBaixa: 0,
        semTreino: 0,
        emergExtra: 0,
        ausPonto: 0,
        atrasoPonto: 29
      },
      assiduidade: '21 / 21 (29m atraso)'
    },
    {
      pos: '4º',
      nome: 'Dr. Guilherme José Graciano',
      somas: {
        aval: 0,
        testes: 24,
        relat: 36,
        freq80: 133,
        treinoLivre: 1,
        emergOk: 60,
        abonos: 0 // 16/10 abonado sem gerar débito
      },
      debitos: {
        slaFicha: 0,
        vencidos: 0,
        freqBaixa: 12.5,
        semTreino: 42,
        emergExtra: 6,
        ausPonto: 40,
        atrasoPonto: 89
      },
      assiduidade: '18 / 21 (2 ausências, 89m)'
    },
    {
      pos: '5º',
      nome: 'Dra. Rachel Zauli Serpa',
      somas: {
        aval: 4,
        testes: 8,
        relat: 6,
        freq80: 70,
        treinoLivre: 0,
        emergOk: 0,
        abonos: 0
      },
      debitos: {
        slaFicha: 2,
        vencidos: 40,
        freqBaixa: 0,
        semTreino: 0,
        emergExtra: 0,
        ausPonto: 0,
        atrasoPonto: 0
      },
      assiduidade: '21 / 21 (0m atraso)'
    },
    {
      pos: '6º',
      nome: 'Dr. Albert Nunes',
      somas: {
        aval: 44,
        testes: 20,
        relat: 24,
        freq80: 0,
        treinoLivre: 0,
        emergOk: 0,
        abonos: 0
      },
      debitos: {
        slaFicha: 2,
        vencidos: 40,
        freqBaixa: 0,
        semTreino: 0,
        emergExtra: 0,
        ausPonto: 0,
        atrasoPonto: 0
      },
      assiduidade: 'Isento (Diretoria)'
    },
    {
      pos: '7º',
      nome: 'Ruthi Novais',
      somas: {
        aval: 8,
        testes: 0,
        relat: 0,
        freq80: 122.5,
        treinoLivre: 14,
        emergOk: 69,
        abonos: 0
      },
      debitos: {
        slaFicha: 4,
        vencidos: 30,
        freqBaixa: 32.5,
        semTreino: 34,
        emergExtra: 4,
        ausPonto: 60,
        atrasoPonto: 22
      },
      assiduidade: '18 / 21 (3 ausências, 22m)'
    },
    {
      pos: '8º',
      nome: 'Thiago Castro Lima Rocha',
      somas: {
        aval: 0,
        testes: 0,
        relat: 0,
        freq80: 0,
        treinoLivre: 0,
        emergOk: 0,
        abonos: 0
      },
      debitos: {
        slaFicha: 0,
        vencidos: 0,
        freqBaixa: 0,
        semTreino: 0,
        emergExtra: 0,
        ausPonto: 40,
        atrasoPonto: 5
      },
      assiduidade: '8 / 11 (2 ausências, 5m)'
    },
    {
      pos: '9º',
      nome: 'Maria Luísa Câmara Gontijo',
      somas: {
        aval: 0,
        testes: 0,
        relat: 6,
        freq80: 0,
        treinoLivre: 0,
        emergOk: 0,
        abonos: 0
      },
      debitos: {
        slaFicha: 0,
        vencidos: 0,
        freqBaixa: 0,
        semTreino: 0,
        emergExtra: 0,
        ausPonto: 60,
        atrasoPonto: 52
      },
      assiduidade: '10 plantões (3 ausências, 52m)'
    }
  ];

  // Calculate totals and net score:
  data.forEach(p => {
    const totSoma = p.somas.aval + p.somas.testes + p.somas.relat + p.somas.freq80 + p.somas.treinoLivre + p.somas.emergOk + p.somas.abonos;
    const totDeb = p.debitos.slaFicha + p.debitos.vencidos + p.debitos.freqBaixa + p.debitos.semTreino + p.debitos.emergExtra + p.debitos.ausPonto + p.debitos.atrasoPonto;
    const saldo = totSoma - totDeb;
    p.totSoma = totSoma;
    p.totDeb = totDeb;
    p.saldo = saldo;
  });

  data.sort((a, b) => b.saldo - a.saldo);
  data.forEach((p, idx) => {
    p.pos = `${idx + 1}º`;
    console.log(`${p.pos} ${p.nome}: Somas=${p.totSoma} | Débitos=-${p.totDeb} | Saldo Líquido=${p.saldo} pts`);
  });

  process.exit(0);
}
run();

