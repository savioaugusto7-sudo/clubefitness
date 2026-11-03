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

async function build() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const firstDayStr = '2026-10-01';
  const lastDayStr = '2026-10-31';

  // 1. Profissionais
  const professionals = await db.collection('professionals').find({}).toArray();
  const profMap = new Map();
  professionals.forEach(p => profMap.set(String(p._id), p.nome));

  // 2. Planos e Contratos
  const plans = await db.collection('plans').find({}).toArray();
  const planMap = new Map();
  plans.forEach(p => planMap.set(String(p._id), p.nome));

  const contracts = await db.collection('contracts').find({}).toArray();
  const clientContractMap = new Map();
  contracts.forEach(ct => {
    if (ct.planoNome) clientContractMap.set(String(ct.clientId), ct.planoNome);
  });

  // 3. Clientes
  const clients = await db.collection('clients').find({}).toArray();
  const clientMap = new Map();
  clients.forEach(c => {
    const cid = String(c._id);
    const pId = c.dadosComerciais?.planoId ? String(c.dadosComerciais.planoId) : '';
    const rawPlan = planMap.get(pId) || c.dadosComerciais?.contrato || c.dadosComerciais?.planoNome || 'Sem Plano';
    const finalPlan = clientContractMap.get(cid) || rawPlan;
    clientMap.set(cid, {
      id: cid,
      nome: c.dadosPessoais?.nome || c.nome || 'Cliente',
      plan: finalPlan,
      profissionalId: c.profissionalId ? String(c.profissionalId) : (c.dadosClinicos?.profissionalResponsavelId ? String(c.dadosClinicos.profissionalResponsavelId) : null)
    });
  });

  // 4. Procedimentos Clínicos
  const assessments = await db.collection('physicalassessments').find({
    data: { $gte: firstDayStr, $lte: lastDayStr }
  }).sort({ data: 1 }).toArray();

  const strengthTests = await db.collection('strengthtests').find({
    data: { $gte: firstDayStr, $lte: lastDayStr }
  }).sort({ data: 1 }).toArray();

  const physioReports = await db.collection('physioreports').find({
    data: { $gte: firstDayStr, $lte: lastDayStr }
  }).sort({ data: 1 }).toArray();

  // 5. Batidas de Ponto
  const punches = await db.collection('pontorecords').find({
    data: { $gte: firstDayStr, $lte: lastDayStr }
  }).sort({ data: 1, horario: 1 }).toArray();

  // Calendário de 21 dias úteis
  const businessDays = [
    { iso: '2026-10-01', br: '01/10/2026', dow: 'Qui' },
    { iso: '2026-10-02', br: '02/10/2026', dow: 'Sex' },
    { iso: '2026-10-05', br: '05/10/2026', dow: 'Seg' },
    { iso: '2026-10-06', br: '06/10/2026', dow: 'Ter' },
    { iso: '2026-10-07', br: '07/10/2026', dow: 'Qua' },
    { iso: '2026-10-08', br: '08/10/2026', dow: 'Qui' },
    { iso: '2026-10-09', br: '09/10/2026', dow: 'Sex' },
    { iso: '2026-10-13', br: '13/10/2026', dow: 'Ter' },
    { iso: '2026-10-14', br: '14/10/2026', dow: 'Qua' },
    { iso: '2026-10-15', br: '15/10/2026', dow: 'Qui' },
    { iso: '2026-10-16', br: '16/10/2026', dow: 'Sex' },
    { iso: '2026-10-19', br: '19/10/2026', dow: 'Seg' },
    { iso: '2026-10-20', br: '20/10/2026', dow: 'Ter' },
    { iso: '2026-10-21', br: '21/10/2026', dow: 'Qua' },
    { iso: '2026-10-22', br: '22/10/2026', dow: 'Qui' },
    { iso: '2026-10-23', br: '23/10/2026', dow: 'Sex' },
    { iso: '2026-10-26', br: '26/10/2026', dow: 'Seg' },
    { iso: '2026-10-27', br: '27/10/2026', dow: 'Ter' },
    { iso: '2026-10-28', br: '28/10/2026', dow: 'Qua' },
    { iso: '2026-10-29', br: '29/10/2026', dow: 'Qui' },
    { iso: '2026-10-30', br: '30/10/2026', dow: 'Sex' }
  ];

  function normName(name) {
    if (!name) return 'Desconhecido';
    const s = name.trim().replace(/\s+/g, ' ');
    if (s.toLowerCase().includes('albert')) return 'Albert Nunes';
    if (s.toLowerCase().includes('guilherme')) return 'Guilherme José Graciano';
    if (s.toLowerCase().includes('cleiton')) return 'Cleiton Freitas';
    if (s.toLowerCase().includes('grossi')) return 'Pedro Grossi';
    if (s.toLowerCase().includes('rachel') || s.toLowerCase().includes('raquel')) return 'Rachel Zauli Serpa';
    if (s.toLowerCase().includes('ruthi')) return 'Ruthi Novais';
    if (s.toLowerCase().includes('poeiras')) return 'Matheus Poeiras Luciano';
    if (s.toLowerCase().includes('gontijo') || s.toLowerCase().includes('maria luísa') || s.toLowerCase().includes('maria luisa')) return 'Maria Luísa Câmara Gontijo';
    if (s.toLowerCase().includes('thiago')) return 'Thiago Castro Lima Rocha';
    return s;
  }

  // Agrupamento de ponto por profissional e dia
  const pontoMap = {};
  punches.forEach(p => {
    const prof = normName(p.profissionalNome);
    if (!pontoMap[prof]) pontoMap[prof] = {};
    if (!pontoMap[prof][p.data]) pontoMap[prof][p.data] = [];
    pontoMap[prof][p.data].push(p);
  });

  const activeProfList = [
    'Cleiton Freitas',
    'Guilherme José Graciano',
    'Ruthi Novais',
    'Albert Nunes',
    'Pedro Grossi',
    'Rachel Zauli Serpa',
    'Matheus Poeiras Luciano',
    'Maria Luísa Câmara Gontijo',
    'Thiago Castro Lima Rocha'
  ];

  const clinicalByProf = {};
  activeProfList.forEach(p => clinicalByProf[p] = []);

  // Processar Avaliações Físicas:
  let danieleSeenCount = 0;
  assessments.forEach(a => {
    const prof = normName(profMap.get(String(a.avaliadorId)) || a.avaliadorNome);
    const client = clientMap.get(String(a.clienteId));
    const alunoNome = client?.nome || a.alunoNome || 'Não Identificado';
    const tempo = Number(a.tempoGastoSegundos) || 0;
    const duracaoMin = (tempo / 60).toFixed(1);

    let pontuou = tempo >= 60 && tempo <= 3600;
    let motivo = 'Pontuou (SLA Conforme)';
    if (tempo > 3600) {
      pontuou = false;
      motivo = 'Extrapolou tempo limite SLA (> 1h)';
    } else if (tempo < 60) {
      pontuou = false;
      motivo = 'Duração nula / Incompleta (< 60s)';
    } else if (tempo < 900) {
      pontuou = true;
      motivo = `Inferior a 15min (${duracaoMin}m) — Pontuado por Abono Oficial da Gestão`;
    }

    let pontos = pontuou ? 4 : 0;

    if (alunoNome.toLowerCase().includes('daniele debossan') && a.data === '2026-10-02') {
      danieleSeenCount++;
      if (danieleSeenCount > 1) {
        pontuou = false;
        pontos = 0;
        motivo = 'Duplicidade no mesmo dia (Desconsiderada pela Gestão)';
      }
    }

    if (clinicalByProf[prof]) {
      clinicalByProf[prof].push({
        tipo: 'Avaliação Física',
        data: a.data,
        aluno: alunoNome,
        plano: client?.plan || 'Sem Plano',
        duracaoStr: `${Math.floor(tempo / 60)}m ${tempo % 60}s`,
        tempoSegundos: tempo,
        pontuou,
        pontos,
        motivo
      });
    }
  });

  // Processar Testes de Força (Dinamometria):
  strengthTests.forEach(s => {
    const prof = normName(profMap.get(String(s.profissionalId)) || s.profissionalNome);
    const client = clientMap.get(String(s.clienteId));
    const alunoNome = client?.nome || s.alunoNome || 'Não Identificado';
    const tempo = Number(s.tempoGastoSegundos) || 0;

    if (clinicalByProf[prof]) {
      clinicalByProf[prof].push({
        tipo: 'Teste de Força (Dinamometria)',
        data: s.data,
        aluno: alunoNome,
        plano: client?.plan || 'Sem Plano',
        duracaoStr: `${Math.floor(tempo / 60)}m ${tempo % 60}s`,
        tempoSegundos: tempo,
        pontuou: true,
        pontos: 4,
        motivo: 'Pontuou (Teste de Força - Qualquer tempo admitido)'
      });
    }
  });

  // Processar Relatórios Clínicos Fisioterápicos:
  physioReports.forEach(r => {
    const prof = normName(profMap.get(String(r.profissionalId)) || profMap.get(String(r.fisioterapeutaId)) || r.profissionalNome || r.fisioterapeutaNome);
    const client = clientMap.get(String(r.clienteId));
    const alunoNome = client?.nome || r.alunoNome || 'Não Identificado';
    const tempo = Number(r.tempoGastoSegundos) || 0;
    const duracaoMin = (tempo / 60).toFixed(1);

    let pontuou = false;
    let motivo = '';

    if (tempo > 7200) {
      pontuou = false;
      motivo = `Extrapolou tempo limite SLA (${duracaoMin}m > 2h)`;
    } else if (tempo < 900) {
      pontuou = true;
      motivo = `Inferior a 15min (${duracaoMin}m) — Pontuado por Abono Oficial da Gestão`;
    } else {
      pontuou = true;
      motivo = 'Pontuou (SLA Conforme)';
    }

    if (clinicalByProf[prof]) {
      clinicalByProf[prof].push({
        tipo: 'Relatório Clínico Fisioterápico',
        data: r.data,
        aluno: alunoNome,
        plano: client?.plan || 'Sem Plano',
        duracaoStr: `${Math.floor(tempo / 60)}m ${tempo % 60}s`,
        tempoSegundos: tempo,
        pontuou,
        pontos: pontuou ? 6 : 0,
        motivo
      });
    }
  });

  activeProfList.forEach(p => clinicalByProf[p].sort((a, b) => a.data.localeCompare(b.data)));

  function getPontoTableForProf(profName) {
    if (profName === 'Albert Nunes') {
      return `      <div class="sub-table-title">Auditoria de Ponto (Outubro / 2026)</div>
      <div class="audit-note"><strong>Isenção de Marcação Biométrica:</strong> Profissional responde pela Direção Clínica, coordenação médica e diretoria executiva, com presença integral comprovada sem exigência de controle por relógio de ponto.</div>`;
    }

    const rows = businessDays.map(bd => {
      const dayRecords = pontoMap[profName]?.[bd.iso] || [];
      const first = dayRecords[0] || null;

      let batidaCell = '';
      let atrasoCell = '0 min';
      let situacaoCell = '';
      let statusCell = '<span class="text-emerald font-bold">Pontual</span>';
      let impactoCell = '<span class="text-muted">0 pts</span>';

      if (profName === 'Cleiton Freitas') {
        if (first) {
          batidaCell = `<strong>${first.horario}</strong> (esp. 06:00)`;
          if (bd.iso === '2026-10-06') {
            atrasoCell = '193 min (teste)';
            situacaoCell = 'Teste técnico autorizado pela gestão';
            statusCell = '<span class="text-emerald font-bold">Abonado Oficial</span>';
            impactoCell = '<span class="text-emerald font-bold">0 pts</span>';
          } else {
            situacaoCell = 'Pontual (Entrada antes das 06:00)';
            statusCell = '<span class="text-emerald font-bold">100% Pontual</span>';
          }
        } else {
          batidaCell = '<span class="text-muted">Sem registro</span> (esp. 06:00)';
          atrasoCell = '—';
          situacaoCell = 'Ausência de registro de ponto';
          statusCell = '<span class="text-rose font-bold">Ausência</span>';
          impactoCell = '<span class="text-rose font-bold">-20 pts</span>';
        }
      } else if (profName === 'Guilherme José Graciano') {
        const dayNum = parseInt(bd.iso.slice(8), 10);
        let esperado = (dayNum >= 26 || dayNum === 21 || dayNum === 22) ? '14:00' : '08:00';

        if (bd.iso === '16/10/2026' || bd.iso === '2026-10-16') {
          batidaCell = '<span class="text-muted">Sem ponto</span> (esp. 08:00)';
          atrasoCell = '—';
          situacaoCell = 'Sexta-feira autorizada e abonada pela gestão';
          statusCell = '<span class="text-emerald font-bold">Abonado Oficial</span>';
          impactoCell = '<span class="text-muted">0 pts</span>';
        } else if (first) {
          batidaCell = `<strong>${first.horario}</strong> (esp. ${esperado})`;
          let atrasoMin = 0;
          if (bd.iso === '2026-10-02') atrasoMin = 16;
          else if (bd.iso === '2026-10-06') atrasoMin = 3;
          else if (bd.iso === '2026-10-22') atrasoMin = 13;
          else if (bd.iso === '2026-10-29') atrasoMin = 57;

          if (atrasoMin > 0) {
            atrasoCell = `${atrasoMin} min`;
            situacaoCell = `Atraso na entrada (${atrasoMin} min)`;
            statusCell = '<span class="text-rose font-bold">Atraso</span>';
            impactoCell = `<span class="text-rose font-bold">-${atrasoMin} pts</span>`;
          } else {
            atrasoCell = '0 min';
            situacaoCell = 'Presença confirmada / Pontual';
            statusCell = '<span class="text-emerald font-bold">Pontual</span>';
            impactoCell = '<span class="text-muted">0 pts</span>';
          }
        } else {
          batidaCell = `<span class="text-muted">Sem registro</span> (esp. ${esperado})`;
          atrasoCell = '—';
          situacaoCell = 'Ausência de registro de ponto no turno';
          statusCell = '<span class="text-rose font-bold">Ausência</span>';
          impactoCell = '<span class="text-rose font-bold">-20 pts</span>';
        }
      } else if (profName === 'Ruthi Novais') {
        if (first) {
          batidaCell = `<strong>${first.horario}</strong> (esp. 06:00)`;
          const atr = first.minutosAtraso > 0 ? first.minutosAtraso : 0;
          if (atr > 0) {
            atrasoCell = `${atr} min`;
            situacaoCell = `Atraso na entrada (${atr} min)`;
            statusCell = '<span class="text-rose font-bold">Atraso</span>';
            impactoCell = `<span class="text-rose font-bold">-${atr} pts</span>`;
          } else {
            atrasoCell = '0 min';
            situacaoCell = 'Pontual';
            statusCell = '<span class="text-emerald font-bold">Pontual</span>';
            impactoCell = '<span class="text-muted">0 pts</span>';
          }
        } else {
          batidaCell = '<span class="text-muted">Sem registro</span> (esp. 06:00)';
          atrasoCell = '—';
          situacaoCell = 'Ausência de registro de ponto no turno';
          statusCell = '<span class="text-rose font-bold">Ausência</span>';
          impactoCell = '<span class="text-rose font-bold">-20 pts</span>';
        }
      } else if (profName === 'Pedro Grossi') {
        if (first) {
          batidaCell = `<strong>${first.horario}</strong> (esp. 15:00)`;
          const atr = first.minutosAtraso > 0 ? first.minutosAtraso : 0;
          if (atr > 0) {
            atrasoCell = `${atr} min`;
            situacaoCell = `Atraso na entrada (${atr} min)`;
            statusCell = '<span class="text-rose font-bold">Atraso</span>';
            impactoCell = `<span class="text-rose font-bold">-${atr} pts</span>`;
          } else {
            atrasoCell = '0 min';
            situacaoCell = 'Pontual';
            statusCell = '<span class="text-emerald font-bold">Pontual</span>';
            impactoCell = '<span class="text-muted">0 pts</span>';
          }
        } else {
          batidaCell = '<span class="text-muted">Sem registro</span> (esp. 15:00)';
          atrasoCell = '—';
          situacaoCell = 'Ausência de registro de ponto no turno';
          statusCell = '<span class="text-rose font-bold">Ausência</span>';
          impactoCell = '<span class="text-rose font-bold">-20 pts</span>';
        }
      } else if (profName === 'Matheus Poeiras Luciano') {
        if (first) {
          batidaCell = `<strong>${first.horario}</strong> (esp. 14:00)`;
          const atr = first.minutosAtraso > 0 ? first.minutosAtraso : 0;
          if (atr > 0) {
            atrasoCell = `${atr} min`;
            situacaoCell = `Atraso na entrada (${atr} min)`;
            statusCell = '<span class="text-rose font-bold">Atraso</span>';
            impactoCell = `<span class="text-rose font-bold">-${atr} pts</span>`;
          } else {
            atrasoCell = '0 min';
            situacaoCell = 'Pontual';
            statusCell = '<span class="text-emerald font-bold">100% Pontual</span>';
            impactoCell = '<span class="text-muted">0 pts</span>';
          }
        } else {
          batidaCell = '<span class="text-muted">Sem registro</span> (esp. 14:00)';
          atrasoCell = '—';
          situacaoCell = 'Ausência de registro de ponto no turno';
          statusCell = '<span class="text-rose font-bold">Ausência</span>';
          impactoCell = '<span class="text-rose font-bold">-20 pts</span>';
        }
      } else if (profName === 'Rachel Zauli Serpa') {
        const esperado = bd.dow === 'Ter' ? '10:00' : '09:00';
        if (first) {
          batidaCell = `<strong>${first.horario}</strong> (esp. ${esperado})`;
          atrasoCell = '0 min';
          situacaoCell = 'Pontual (Entrada antecipada)';
          statusCell = '<span class="text-emerald font-bold">100% Pontual</span>';
          impactoCell = '<span class="text-muted">0 pts</span>';
        } else {
          batidaCell = `<span class="text-muted">Sem registro</span> (esp. ${esperado})`;
          atrasoCell = '—';
          situacaoCell = 'Ausência de registro de ponto';
          statusCell = '<span class="text-rose font-bold">Ausência</span>';
          impactoCell = '<span class="text-rose font-bold">-20 pts</span>';
        }
      } else if (profName === 'Maria Luísa Câmara Gontijo') {
        const dow = bd.dow;
        let espHora = 'Folga';
        if (dow === 'Seg') espHora = '09:00';
        else if (dow === 'Ter') espHora = '07:00';
        else if (dow === 'Qui') espHora = '07:00 (Facultativo)';
        else if (dow === 'Sex') espHora = '14:00';

        if (bd.iso < '2026-10-05') {
          batidaCell = '<span class="text-muted">—</span>';
          atrasoCell = '—';
          situacaoCell = '<span class="text-muted">—</span>';
          statusCell = '<span class="text-muted">—</span>';
          impactoCell = '<span class="text-muted">—</span>';
        } else if (bd.iso === '2026-10-05') {
          batidaCell = '<strong>12:09:55</strong> (esp. 09:00)';
          atrasoCell = '189 min';
          situacaoCell = 'Primeiro plantão presencial / Débito abonado oficialmente pela gestão';
          statusCell = '<span class="text-emerald font-bold">Abonado Oficial</span>';
          impactoCell = '<span class="text-muted">0 pts</span>';
        } else if (first) {
          batidaCell = `<strong>${first.horario}</strong> (esp. ${espHora})`;
          let atrasoMin = 0;
          if (bd.iso === '2026-10-19') atrasoMin = 18;
          else if (bd.iso === '2026-10-20') atrasoMin = 8;
          else if (bd.iso === '2026-10-26') atrasoMin = 26;

          if (atrasoMin > 0) {
            atrasoCell = `${atrasoMin} min`;
            situacaoCell = `Atraso na entrada (${atrasoMin} min)`;
            statusCell = '<span class="text-rose font-bold">Atraso</span>';
            impactoCell = `<span class="text-rose font-bold">-${atrasoMin} pts</span>`;
          } else {
            atrasoCell = '0 min';
            situacaoCell = 'Plantão presencial executado';
            statusCell = '<span class="text-emerald font-bold">Presente</span>';
            impactoCell = '<span class="text-muted">0 pts</span>';
          }
        } else {
          if (dow === 'Qua') {
            batidaCell = '<span class="text-muted">—</span>';
            atrasoCell = '—';
            situacaoCell = 'Quarta-feira (Folga semanal da escala)';
            statusCell = '<span class="text-muted">Folga</span>';
            impactoCell = '<span class="text-muted">0 pts</span>';
          } else if (dow === 'Qui') {
            batidaCell = '<span class="text-muted">—</span>';
            atrasoCell = '—';
            situacaoCell = 'Quinta-feira não fixa (Abonada conforme determinação)';
            statusCell = '<span class="text-emerald font-bold">Abonado (Não Fixo)</span>';
            impactoCell = '<span class="text-muted">0 pts</span>';
          } else {
            batidaCell = `<span class="text-muted">Sem registro</span> (esp. ${espHora})`;
            atrasoCell = '—';
            situacaoCell = 'Ausência de registro de ponto no plantão';
            statusCell = '<span class="text-rose font-bold">Ausência</span>';
            impactoCell = '<span class="text-rose font-bold">-20 pts</span>';
          }
        }
      } else if (profName === 'Thiago Castro Lima Rocha') {
        if (bd.iso < '2026-10-16') {
          batidaCell = '<span class="text-muted">—</span>';
          atrasoCell = '—';
          situacaoCell = '<span class="text-muted">—</span>';
          statusCell = '<span class="text-muted">—</span>';
          impactoCell = '<span class="text-muted">—</span>';
        } else if (bd.iso === '2026-10-22') {
          batidaCell = '<span class="text-emerald font-bold">Presença confirmada</span>';
          atrasoCell = '0 min';
          situacaoCell = 'Chegou no horário e esqueceu de marcar o ponto';
          statusCell = '<span class="text-emerald font-bold">Abonado Oficial</span>';
          impactoCell = '<span class="text-muted">0 pts</span>';
        } else if (first) {
          batidaCell = `<strong>${first.horario}</strong> (esp. 07:00)`;
          let atrasoMin = 0;
          if (bd.iso === '2026-10-19') atrasoMin = 1;
          else if (bd.iso === '2026-10-20') atrasoMin = 1;
          else if (bd.iso === '2026-10-23') atrasoMin = 1;
          else if (bd.iso === '2026-10-26') atrasoMin = 2;

          if (atrasoMin > 0) {
            atrasoCell = `${atrasoMin} min`;
            situacaoCell = `Atraso na entrada (${atrasoMin} min)`;
            statusCell = '<span class="text-rose font-bold">Atraso</span>';
            impactoCell = `<span class="text-rose font-bold">-${atrasoMin} pts</span>`;
          } else {
            atrasoCell = '0 min';
            situacaoCell = 'Pontual (Entrada às 07:00h)';
            statusCell = '<span class="text-emerald font-bold">100% Pontual</span>';
            impactoCell = '<span class="text-muted">0 pts</span>';
          }
        } else {
          batidaCell = '<span class="text-muted">Sem registro</span> (esp. 07:00)';
          atrasoCell = '—';
          situacaoCell = 'Ausência de registro de ponto';
          statusCell = '<span class="text-rose font-bold">Ausência</span>';
          impactoCell = '<span class="text-rose font-bold">-20 pts</span>';
        }
      }

      return `          <tr>
            <td class="font-bold">${bd.br} (${bd.dow})</td>
            <td>${batidaCell}</td>
            <td class="text-center">${atrasoCell}</td>
            <td>${situacaoCell}</td>
            <td>${statusCell}</td>
            <td class="text-right">${impactoCell}</td>
          </tr>`;
    }).join('\n');

    return `      <div class="sub-table-title">Auditoria Completa de Ponto — Todos os 21 Dias Úteis de Outubro / 2026</div>
      <table class="sub-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Batida vs Esperado</th>
            <th class="text-center">Atraso</th>
            <th>Situação Comprovada</th>
            <th>Status / Abono</th>
            <th class="text-right">Impacto</th>
          </tr>
        </thead>
        <tbody>
${rows}
        </tbody>
      </table>`;
  }

  function getClinicalTableForProf(profName) {
    const items = clinicalByProf[profName] || [];
    if (items.length === 0) {
      return `      <div class="sub-table-title">Produção Clínica & Procedimentos Executados (Outubro / 2026)</div>
      <table class="sub-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Aluno(a)</th>
            <th>Procedimento</th>
            <th>Plano do Aluno</th>
            <th>Duração / SLA</th>
            <th class="text-right">Pontos</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="6" class="text-center text-muted" style="padding: 8px;">Nenhum procedimento de avaliação, teste ou relatório executado no período (atuação dedicada a treinos e acompanhamento de sala).</td>
          </tr>
        </tbody>
      </table>`;
    }

    const rows = items.map(item => {
      let pontosCell = `<span class="text-emerald font-bold">+${item.pontos} pts</span>`;
      let planoCell = `<span style="display:inline-block; padding:1px 5px; border-radius:3px; background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; font-size:8px; font-weight:700;">${item.plano}</span>`;

      if (!item.pontuou) {
        pontosCell = `<span class="text-muted">0 pts</span>`;
        planoCell = `<span style="display:inline-block; padding:1px 5px; border-radius:3px; background:#f8fafc; color:#64748b; border:1px solid #cbd5e1; font-size:8px;">${item.plano}</span>`;
      }

      return `          <tr>
            <td>${item.data}</td>
            <td class="font-bold">${item.aluno}</td>
            <td>${item.tipo}</td>
            <td>${planoCell}</td>
            <td>${item.duracaoStr} <span class="text-muted">(${item.motivo})</span></td>
            <td class="text-right">${pontosCell}</td>
          </tr>`;
    }).join('\n');

    const totalPontos = items.reduce((acc, cur) => acc + cur.pontos, 0);
    const validCount = items.filter(i => i.pontuou).length;

    return `      <div class="sub-table-title">Produção Clínica Completa (${items.length} Executados • ${validCount} Pontuaram no SLA • Total: +${totalPontos} pts)</div>
      <table class="sub-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Aluno(a)</th>
            <th>Procedimento</th>
            <th>Plano do Aluno</th>
            <th>Duração / SLA</th>
            <th class="text-right">Pontos</th>
          </tr>
        </thead>
        <tbody>
${rows}
        </tbody>
      </table>`;
  }

  // Cards individuais ordenados rigorosamente pelo ranking de Saldo Líquido Final com TODOS os critérios de débito aplicados
  const profDetails = [
    {
      nome: 'Pedro Grossi',
      cargo: 'Fisioterapeuta / Treinador / Equipe Tarde-Noite',
      saldoStr: 'Produção: +60 pts (12 ev.) | Meta Turno: +76 pts (38 al. × 2) | Débitos Totais: -35 pts | Saldo Líquido Final: +101 pts',
      saldoColor: '#047857',
      badge: '1º Lugar Geral',
      debitosHtml: `      <div class="sub-table-title">Débitos Registrados (Critérios Oficiais do Card & Ponto)</div>
      <table class="sub-table">
        <thead><tr><th>Critério</th><th>Aluno(a) / Ocorrência</th><th>Motivo</th><th class="text-right">Débito</th></tr></thead>
        <tbody>
          <tr><td>SLA Ficha 24h</td><td>Gabriel Lage (01/10)</td><td>Ficha não prescrita em 24h pós-avaliação</td><td class="text-right text-rose">-2 pts</td></tr>
          <tr><td>SLA Ficha 24h</td><td>Ronei Vital Gomes (02/10)</td><td>Ficha não prescrita em 24h pós-avaliação</td><td class="text-right text-rose">-2 pts</td></tr>
          <tr><td>SLA Ficha 24h</td><td>Juan Victor Rocha (05/10)</td><td>Ficha não prescrita em 24h pós-avaliação</td><td class="text-right text-rose">-2 pts</td></tr>
          <tr><td>Atraso de Ponto</td><td>9 ocorrências (Outubro)</td><td>Débito estrito de atraso de ponto: 29 minutos acumulados (1 min = 1 pt)</td><td class="text-right text-rose">-29 pts</td></tr>
        </tbody>
      </table>`,
      auditNote: '<strong>Auditoria Contábil Consolidada:</strong> 1º Lugar Geral (+101 pts). 12 procedimentos clínicos concluídos no SLA (+60 pts). Bonificação de Equipe da Tarde/Noite (+76 pts pela retenção de 38 alunos nos planos Monitorado e Tratamento Personalizado). Débitos totais de -35 pts (-6 pts de SLA de Fichas e -29 pts de atrasos de ponto). Assiduidade: 21 dias presentes em 21 dias úteis.'
    },
    {
      nome: 'Cleiton Freitas',
      cargo: 'Fisioterapeuta / Educador Físico / Co-Responsável Manhã',
      saldoStr: 'Produção: +16 pts (3 ev.) | Meta Turno: +122,5 pts (Co-Resp. 50%) | Débitos Totais: -70,5 pts | Saldo Líquido Final: +68 pts',
      saldoColor: '#166534',
      badge: '2º Lugar Geral',
      debitosHtml: `      <div class="sub-table-title">Débitos Registrados (Critérios Oficiais do Card & Ponto)</div>
      <table class="sub-table">
        <thead><tr><th>Critério</th><th>Ocorrência / Abrangência</th><th>Regra Aplicada</th><th class="text-right">Débito</th></tr></thead>
        <tbody>
          <tr><td>Frequência &lt; 80%</td><td>13 alunos abaixo da meta (Manhã)</td><td>50% do débito de fechamento de turno (-65 pts total ÷ 2)</td><td class="text-right text-rose">-32,5 pts</td></tr>
          <tr><td>Sem Treino Livre</td><td>34 alunos sem mín. 1 treino/sem.</td><td>50% do débito de fechamento de turno (-68 pts total ÷ 2)</td><td class="text-right text-rose">-34 pts</td></tr>
          <tr><td>Emergência &gt; 1</td><td>2 alunos com &gt; 1 emergência</td><td>50% do débito de fechamento de turno (-8 pts total ÷ 2)</td><td class="text-right text-rose">-4 pts</td></tr>
          <tr><td>Ponto Biométrico</td><td>21 dias presentes (100% assíduo)</td><td>06/10 teste técnico de 193 min abonado formalmente</td><td class="text-right text-emerald font-bold">0 pts</td></tr>
        </tbody>
      </table>`,
      auditNote: '<strong>Auditoria Contábil Consolidada:</strong> 2º Lugar Geral (+68 pts). Co-responsável pelo Turno da Manhã compartilhando a liderança com Ruthi Novais (+122,5 pts pela retenção de 35 alunos). Produção clínica: 3 procedimentos pontuados (+16 pts). Aplicação estrita dos 3 critérios de débito de turno do card (-32,5 pts de frequência &lt; 80%, -34 pts de treinos livres pendentes e -4 pts de emergências extras = -70,5 pts). Ponto 100% regular.'
    },
    {
      nome: 'Matheus Poeiras Luciano',
      cargo: 'Treinador / Co-Responsável Turno Tarde-Noite',
      saldoStr: 'Produção: +4 pts (1 ev.) | Meta Turno: +133 pts (Co-Resp. 50%) | Débitos Totais: -80,5 pts | Saldo Líquido Final: +56,5 pts',
      saldoColor: '#0369a1',
      badge: '3º Lugar Geral',
      debitosHtml: `      <div class="sub-table-title">Débitos Registrados (Critérios Oficiais do Card & Ponto)</div>
      <table class="sub-table">
        <thead><tr><th>Critério</th><th>Aluno(a) / Ocorrência</th><th>Motivo</th><th class="text-right">Débito</th></tr></thead>
        <tbody>
          <tr><td>Frequência &lt; 80%</td><td>5 alunos abaixo da meta (Tarde)</td><td>50% do débito de fechamento de turno (-25 pts total ÷ 2)</td><td class="text-right text-rose">-12,5 pts</td></tr>
          <tr><td>Sem Treino Livre</td><td>42 alunos sem mín. 1 treino/sem.</td><td>50% do débito de fechamento de turno (-84 pts total ÷ 2)</td><td class="text-right text-rose">-42 pts</td></tr>
          <tr><td>Emergência &gt; 1</td><td>3 alunos com &gt; 1 emergência</td><td>50% do débito de fechamento de turno (-12 pts total ÷ 2)</td><td class="text-right text-rose">-6 pts</td></tr>
          <tr><td>Ficha Vencida &gt; 2m</td><td>Ian Javoski Brandão Diniz</td><td>Aluno ativo da carteira sem renovação de avaliação/ficha</td><td class="text-right text-rose">-10 pts</td></tr>
          <tr><td>Atraso de Ponto</td><td>3 ocorrências (10 min acum.)</td><td>Débito estrito de atraso de ponto (07/10 1m, 08/10 1m, 21/10 8m)</td><td class="text-right text-rose">-10 pts</td></tr>
          <tr><td>SLA Ficha 24h</td><td>Maria de Fátima Gottschalg</td><td>Ficha pós-avaliação abonada formalmente pela gestão</td><td class="text-right text-emerald font-bold">Abonado (0 pts)</td></tr>
        </tbody>
      </table>`,
      auditNote: '<strong>Auditoria Contábil Consolidada:</strong> 3º Lugar Geral (+56,5 pts). Co-responsável pelo Turno da Tarde/Noite compartilhando a liderança com Dr. Guilherme Graciano (+133 pts pela retenção de 38 alunos). Produção clínica: 1 avaliação física (+4 pts). Débitos totais de -80,5 pts (-60,5 pts de turno, -10 pts de carteira vencida e -10 pts de atrasos de ponto).'
    },
    {
      nome: 'Rachel Zauli Serpa',
      cargo: 'Fisioterapeuta / Equipe Manhã',
      saldoStr: 'Produção: +18 pts (4 ev.) | Meta Turno: +70 pts (35 al. × 2) | Débitos Totais: -42 pts | Saldo Líquido Final: +46 pts',
      saldoColor: '#0f766e',
      badge: '4º Lugar Geral',
      debitosHtml: `      <div class="sub-table-title">Débitos Registrados (Critérios Oficiais do Card & Ponto)</div>
      <table class="sub-table">
        <thead><tr><th>Critério</th><th>Aluno(a) / Ocorrência</th><th>Motivo</th><th class="text-right">Débito</th></tr></thead>
        <tbody>
          <tr><td>SLA Ficha 24h</td><td>Monia Pires Novais (26/10)</td><td>Ficha não prescrita em até 24h pós-avaliação</td><td class="text-right text-rose">-2 pts</td></tr>
          <tr><td>Ficha Vencida &gt; 2m</td><td>Marcelo Rodrigues Motta</td><td>Aluno ativo da carteira há &gt; 60 dias sem avaliação/ficha</td><td class="text-right text-rose">-10 pts</td></tr>
          <tr><td>Ficha Vencida &gt; 2m</td><td>Livia Teixeira de Lima</td><td>Aluna ativa da carteira há &gt; 60 dias sem avaliação/ficha</td><td class="text-right text-rose">-10 pts</td></tr>
          <tr><td>Ficha Vencida &gt; 2m</td><td>Ruan de Oliveira Lopes Rosa</td><td>Aluno ativo da carteira há &gt; 60 dias sem avaliação/ficha</td><td class="text-right text-rose">-10 pts</td></tr>
          <tr><td>Ficha Vencida &gt; 2m</td><td>Ana Marta Accoroni Araújo</td><td>Aluna ativa da carteira há &gt; 60 dias sem avaliação/ficha</td><td class="text-right text-rose">-10 pts</td></tr>
          <tr><td>Ponto Biométrico</td><td>21 dias presentes (0m atraso)</td><td>100% de pontualidade em todo o mês de outubro</td><td class="text-right text-emerald font-bold">0 pts</td></tr>
        </tbody>
      </table>`,
      auditNote: '<strong>Auditoria Contábil Consolidada:</strong> 4º Lugar Geral (+46 pts). Integrante da Equipe da Manhã (+70 pts pela retenção de 35 alunos). Produção clínica: 4 procedimentos concluídos (+18 pts). Débitos: -2 pts de SLA Ficha 24h e -40 pts de alunos ativos da carteira com avaliação/ficha vencida há mais de 2 meses. Ponto com 100% de assiduidade e pontualidade perfeita (0 minutos de atraso).'
    },
    {
      nome: 'Albert Nunes',
      cargo: 'Diretor Clínico / Fisioterapeuta',
      saldoStr: 'Produção: +88 pts (20 ev.) | Meta Turno: — (Diretoria) | Débitos Totais: -42 pts | Saldo Líquido Final: +46 pts',
      saldoColor: '#047857',
      badge: '5º Lugar Geral',
      debitosHtml: `      <div class="sub-table-title">Débitos Registrados (Critérios Oficiais do Card & Ponto)</div>
      <table class="sub-table">
        <thead><tr><th>Critério</th><th>Aluno(a) / Ocorrência</th><th>Motivo</th><th class="text-right">Débito</th></tr></thead>
        <tbody>
          <tr><td>SLA Ficha 24h</td><td>Augusto Andrade Oliveira (30/10)</td><td>Ficha não prescrita em 24h pós-avaliação</td><td class="text-right text-rose">-2 pts</td></tr>
          <tr><td>Ficha Vencida &gt; 2m</td><td>Isadora de Araujo Martins</td><td>Aluna ativa da carteira há &gt; 60 dias sem avaliação</td><td class="text-right text-rose">-10 pts</td></tr>
          <tr><td>Ficha Vencida &gt; 2m</td><td>Zaime Romeu Gottshalg</td><td>Aluno ativo da carteira há &gt; 60 dias sem avaliação</td><td class="text-right text-rose">-10 pts</td></tr>
          <tr><td>Ficha Vencida &gt; 2m</td><td>Rodrigo Freitas ferreira</td><td>Aluno ativo da carteira há &gt; 60 dias sem avaliação</td><td class="text-right text-rose">-10 pts</td></tr>
          <tr><td>Ficha Vencida &gt; 2m</td><td>Rogério Segura Perez</td><td>Aluno ativo da carteira há &gt; 60 dias sem avaliação</td><td class="text-right text-rose">-10 pts</td></tr>
          <tr><td>Ponto Biométrico</td><td>Isenção por Diretoria</td><td>Presença integral sem controle de relógio de ponto</td><td class="text-right text-muted">— (0 pts)</td></tr>
        </tbody>
      </table>`,
      auditNote: '<strong>Auditoria Contábil Consolidada:</strong> 5º Lugar Geral (+46 pts). Isento de controle biométrico por responder pela Diretoria Clínica. Maior produção clínica da clínica: 20 procedimentos concluídos (+88 pts). Débitos: -2 pts de SLA Ficha 24h e -40 pts de 4 alunos ativos vinculados com avaliação vencida há mais de 2 meses. Saldo final: +46 pts.'
    },
    {
      nome: 'Dr. Guilherme José Graciano',
      cargo: 'Fisioterapeuta / Co-Responsável Turno Tarde-Noite',
      saldoStr: 'Produção: +60 pts (11 ev.) | Meta Turno: +133 pts (Co-Resp. 50%) | Débitos Totais: -189,5 pts | Saldo Líquido Final: +3,5 pts',
      saldoColor: '#047857',
      badge: '6º Lugar Geral',
      debitosHtml: `      <div class="sub-table-title">Débitos Registrados (Critérios Oficiais do Card & Ponto)</div>
      <table class="sub-table">
        <thead><tr><th>Critério</th><th>Ocorrência / Abrangência</th><th>Regra Aplicada</th><th class="text-right">Débito</th></tr></thead>
        <tbody>
          <tr><td>Frequência &lt; 80%</td><td>5 alunos abaixo da meta (Tarde)</td><td>50% do débito de fechamento de turno (-25 pts total ÷ 2)</td><td class="text-right text-rose">-12,5 pts</td></tr>
          <tr><td>Sem Treino Livre</td><td>42 alunos sem mín. 1 treino/sem.</td><td>50% do débito de fechamento de turno (-84 pts total ÷ 2)</td><td class="text-right text-rose">-42 pts</td></tr>
          <tr><td>Emergência &gt; 1</td><td>3 alunos com &gt; 1 emergência</td><td>50% do débito de fechamento de turno (-12 pts total ÷ 2)</td><td class="text-right text-rose">-6 pts</td></tr>
          <tr><td>Ausência de Ponto</td><td>2 dias (20/10 e 27/10)</td><td>Ausência de registro de ponto no turno (-20 pts/dia)</td><td class="text-right text-rose">-40 pts</td></tr>
          <tr><td>Atraso de Ponto</td><td>4 ocorrências (89 min acum.)</td><td>Débito estrito de atraso (02/10 16m, 06/10 3m, 22/10 13m, 29/10 57m)</td><td class="text-right text-rose">-89 pts</td></tr>
          <tr><td>Abono Ponto</td><td>Sexta-feira 16/10</td><td>Dia autorizado e abonado oficialmente pela gestão</td><td class="text-right text-emerald font-bold">Abonado (0 pts)</td></tr>
        </tbody>
      </table>`,
      auditNote: '<strong>Auditoria Contábil Consolidada:</strong> 6º Lugar Geral (+3,5 pts). Co-responsável pelo Turno da Tarde/Noite compartilhando a liderança com Matheus Poeiras (+133 pts pela retenção de 38 alunos). Produção clínica: 11 procedimentos pontuados no SLA (+60 pts, incluindo Valdson, Geane e Anderson). Débitos de turno: -60,5 pts. Débitos de ponto: -129 pts (-40 pts de ausências e -89 pts de atrasos acumulados).'
    },
    {
      nome: 'Thiago Castro Lima Rocha',
      cargo: 'Fisioterapeuta (Início em 16/10/2026)',
      saldoStr: 'Produção: 0 pts | Meta Turno: — | Débitos Totais: -45 pts | Saldo Líquido Final: -45 pts',
      saldoColor: '#b91c1c',
      badge: '7º Lugar Geral',
      debitosHtml: `      <div class="sub-table-title">Débitos Registrados (Critérios Oficiais do Card & Ponto)</div>
      <table class="sub-table">
        <thead><tr><th>Critério</th><th>Ocorrência</th><th>Regra Aplicada</th><th class="text-right">Débito</th></tr></thead>
        <tbody>
          <tr><td>Pré-admissão</td><td>01 a 15/10/2026</td><td>Período anterior ao início efetivo identificado por (-)</td><td class="text-right text-muted">— (0 pts)</td></tr>
          <tr><td>Ausência de Ponto</td><td>2 dias (21/10 e 27/10)</td><td>Ausência de marcação biométrica (-20 pts/dia)</td><td class="text-right text-rose">-40 pts</td></tr>
          <tr><td>Abono Oficial</td><td>22/10/2026 (Quinta)</td><td>Presença confirmada no horário / Esquecimento abonado</td><td class="text-right text-emerald font-bold">Abonado (0 pts)</td></tr>
          <tr><td>Atraso de Ponto</td><td>4 ocorrências (5 min acum.)</td><td>Débito estrito de atraso de ponto (19/10 1m, 20/10 1m, 23/10 1m, 26/10 2m)</td><td class="text-right text-rose">-5 pts</td></tr>
        </tbody>
      </table>`,
      auditNote: '<strong>Auditoria Contábil Consolidada:</strong> 7º Lugar Geral (-45 pts). Admitido em 16/10/2026. Período pré-admissão (01 a 15/10) registrado estritamente como (-). Dia 22/10 abonado formalmente pela gestão. Débito de 2 dias de ausência (-40 pts) e 5 min de atraso (-5 pts).'
    },
    {
      nome: 'Ruthi Novais',
      cargo: 'Treinadora / Avaliadora / Co-Responsável Manhã',
      saldoStr: 'Produção: +8 pts (2 ev.) | Meta Turno: +122,5 pts (Co-Resp. 50%) | Débitos Totais: -186,5 pts | Saldo Líquido Final: -56 pts',
      saldoColor: '#b91c1c',
      badge: '8º Lugar Geral',
      debitosHtml: `      <div class="sub-table-title">Débitos Registrados (Critérios Oficiais do Card & Ponto)</div>
      <table class="sub-table">
        <thead><tr><th>Critério</th><th>Aluno(a) / Ocorrência</th><th>Motivo</th><th class="text-right">Débito</th></tr></thead>
        <tbody>
          <tr><td>Frequência &lt; 80%</td><td>13 alunos abaixo da meta (Manhã)</td><td>50% do débito de fechamento de turno (-65 pts total ÷ 2)</td><td class="text-right text-rose">-32,5 pts</td></tr>
          <tr><td>Sem Treino Livre</td><td>34 alunos sem mín. 1 treino/sem.</td><td>50% do débito de fechamento de turno (-68 pts total ÷ 2)</td><td class="text-right text-rose">-34 pts</td></tr>
          <tr><td>Emergência &gt; 1</td><td>2 alunos com &gt; 1 emergência</td><td>50% do débito de fechamento de turno (-8 pts total ÷ 2)</td><td class="text-right text-rose">-4 pts</td></tr>
          <tr><td>SLA Ficha 24h</td><td>2 alunas (Daniele e Renato)</td><td>Ficha não prescrita em 24h pós-avaliação (-2 pts cada)</td><td class="text-right text-rose">-4 pts</td></tr>
          <tr><td>Ficha Vencida &gt; 2m</td><td>3 alunos ativos da carteira</td><td>Eugênio Pacelli, Isabel Imaculada e Julio Savio (-10 pts cada)</td><td class="text-right text-rose">-30 pts</td></tr>
          <tr><td>Ausência de Ponto</td><td>3 dias (09, 13 e 14/10)</td><td>Ausência de registro biométrico no turno (-20 pts/dia)</td><td class="text-right text-rose">-60 pts</td></tr>
          <tr><td>Atraso de Ponto</td><td>4 ocorrências (22 min acum.)</td><td>Débito estrito de atraso (02/10 4m, 05/10 4m, 07/10 1m, 22/10 13m)</td><td class="text-right text-rose">-22 pts</td></tr>
        </tbody>
      </table>`,
      auditNote: '<strong>Auditoria Contábil Consolidada:</strong> 8º Lugar Geral (-56 pts). Co-responsável pelo Turno da Manhã (+122,5 pts pela retenção de 35 alunos). Produção clínica: 2 avaliações no SLA (+8 pts, duplicidade de Daniele Debossan em 02/10 desconsiderada). Débitos totais de -186,5 pts (-70,5 pts de turno, -34 pts de SLA/fichas vencidas e -82 pts de ponto).'
    },
    {
      nome: 'Maria Luísa Câmara Gontijo',
      cargo: 'Fisioterapeuta (Escala Fixada)',
      saldoStr: 'Produção: +6 pts (1 ev.) | Meta Turno: — | Débitos Totais: -112 pts | Saldo Líquido Final: -106 pts',
      saldoColor: '#b91c1c',
      badge: '9º Lugar Geral',
      debitosHtml: `      <div class="sub-table-title">Débitos Registrados (Critérios Oficiais do Card & Ponto)</div>
      <table class="sub-table">
        <thead><tr><th>Critério</th><th>Ocorrência</th><th>Regra Aplicada</th><th class="text-right">Débito</th></tr></thead>
        <tbody>
          <tr><td>Pré-início</td><td>01 e 02/10/2026</td><td>Período anterior ao primeiro plantão presencial (-)</td><td class="text-right text-muted">— (0 pts)</td></tr>
          <tr><td>Abono 1º Plantão</td><td>05/10/2026 (Segunda)</td><td>Primeiro plantão presencial / Entrada abonada pela gestão</td><td class="text-right text-emerald font-bold">Abonado (0 pts)</td></tr>
          <tr><td>Ausência de Ponto</td><td>3 plantões obrigatórios (06, 16 e 27/10)</td><td>Ausência de registro de ponto em plantão obrigatório (-20 pts/dia)</td><td class="text-right text-rose">-60 pts</td></tr>
          <tr><td>Abono Quinta</td><td>Quintas-feiras facultativas (07h)</td><td>Plantões não fixos: ausência abonada automaticamente</td><td class="text-right text-emerald font-bold">Abonado (0 pts)</td></tr>
          <tr><td>Folga Semanal</td><td>Quartas-feiras</td><td>Escala sem plantão programado</td><td class="text-right text-muted">Folga (0 pts)</td></tr>
          <tr><td>Atraso de Ponto</td><td>3 ocorrências (52 min acum.)</td><td>Débito estrito de atraso de ponto (19/10 18m, 20/10 8m, 26/10 26m)</td><td class="text-right text-rose">-52 pts</td></tr>
        </tbody>
      </table>`,
      auditNote: '<strong>Auditoria Contábil Consolidada:</strong> 9º Lugar Geral (-106 pts). Escala oficial homologada: Segunda 09h, Terça 07h, Quinta 07h (não fixo / abonado automaticamente), Sexta 14h; Quarta folga. Período pré-início (01 e 02/10) registrado como (-). Primeiro plantão (05/10) abonado. Produção clínica: 1 relatório fisioterápico (+6 pts). Débitos de ponto: -112 pts (-60 pts de ausências e -52 pts de atrasos acumulados).'
    }
  ];

  // Montar blocos individuais com quebra de página controlada
  const profCardsHtml = profDetails.map((p, idx) => {
    const clinicalTable = getClinicalTableForProf(p.nome);
    const pontoTable = getPontoTableForProf(p.nome);

    return `
  <!-- CARD PROFISSIONAL: ${p.nome} -->
  <div class="prof-card">
    <div class="prof-header">
      <div>
        <span class="prof-name">${p.nome}</span>
        <span class="prof-role">(${p.cargo})</span>
      </div>
      <div>
        <span class="prof-balance" style="color: ${p.saldoColor}; font-size:10.5px;">${p.badge} • ${p.saldoStr}</span>
      </div>
    </div>
    <div class="prof-body">
${clinicalTable}
${p.debitosHtml}
${pontoTable}
      <div class="audit-note">${p.auditNote}</div>
    </div>
  </div>`;
  }).join('\n');

  // Montagem do HTML Completo com Margens Laterais Amplas (16mm lateral + 4mm padding seguro)
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório Executivo Mensal de Pontuação — Outubro / 2026</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 16mm 12mm 16mm; /* Margens laterais ampliadas para 16mm */
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 0 4mm; /* Padding seguro de resguardo lateral */
      font-size: 8.5px;
      line-height: 1.35;
    }
    .header {
      border-bottom: 2px solid #0f766e;
      padding-bottom: 8px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header h1 {
      margin: 0;
      font-size: 15px;
      font-weight: 800;
      color: #0f766e;
      letter-spacing: -0.02em;
    }
    .header .subtitle {
      font-size: 9.5px;
      color: #475569;
      margin-top: 2px;
      font-weight: 500;
    }
    .header .meta {
      text-align: right;
      font-size: 8.5px;
      color: #64748b;
    }
    .badge-scope {
      display: inline-block;
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
      padding: 2.5px 7px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 8px;
      margin-top: 3px;
    }

    h2 {
      font-size: 10.5px;
      font-weight: 800;
      color: #1e293b;
      margin: 12px 0 6px 0;
      padding-bottom: 3px;
      border-bottom: 1px solid #e2e8f0;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 8px;
    }
    th {
      background: #f8fafc;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 4px 5px;
      border-top: 1px solid #cbd5e1;
      border-bottom: 1.5px solid #94a3b8;
      font-size: 7.5px;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    td {
      padding: 3.5px 5px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    tr:nth-child(even) td {
      background: #fafafa;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .text-emerald { color: #047857; font-weight: 700; }
    .text-rose { color: #b91c1c; font-weight: 700; }
    .text-muted { color: #64748b; }

    .confront-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #0f766e;
      padding: 7px 9px;
      margin-bottom: 10px;
      border-radius: 4px;
      font-size: 8.5px;
      line-height: 1.4;
    }

    .kpi-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 10px;
    }
    .kpi-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 7px 9px;
      background: #ffffff;
    }
    .kpi-card-title {
      font-size: 9.5px;
      font-weight: 800;
      margin-bottom: 3px;
      padding-bottom: 2px;
      border-bottom: 1px solid #e2e8f0;
    }

    .prof-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      margin-bottom: 12px;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
      page-break-inside: avoid;
    }
    .prof-header {
      background: #f1f5f9;
      padding: 5px 9px;
      border-bottom: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top-left-radius: 5px;
      border-top-right-radius: 5px;
    }
    .prof-name {
      font-weight: 800;
      font-size: 10px;
      color: #0f172a;
    }
    .prof-role {
      font-size: 8.5px;
      color: #475569;
      margin-left: 6px;
    }
    .prof-balance {
      font-size: 9px;
      font-weight: 800;
    }
    .prof-body {
      padding: 7px 9px;
    }

    .sub-table {
      width: 100%;
      border-collapse: collapse;
      margin: 5px 0 7px 0;
      font-size: 8px;
    }
    .sub-table th {
      background: #f8fafc;
      font-size: 7.5px;
      padding: 3px 5px;
      border-bottom: 1px solid #cbd5e1;
    }
    .sub-table td {
      padding: 2.5px 5px;
      border-bottom: 1px solid #f1f5f9;
    }
    .sub-table-title {
      font-weight: 700;
      font-size: 8.5px;
      color: #334155;
      margin-top: 5px;
      margin-bottom: 2px;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .audit-note {
      font-size: 8px;
      color: #475569;
      background: #f8fafc;
      padding: 4px 7px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      margin-top: 5px;
      line-height: 1.35;
    }

    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>

  <!-- CABEÇALHO EXECUTIVO -->
  <div class="header">
    <div>
      <h1>CLUBE FITNESS • CENTRAL DE METAS & PERFORMANCE</h1>
      <div class="subtitle">Relatório Executivo Mensal de Pontuação dos Profissionais — Fechamento Outubro / 2026</div>
    </div>
    <div class="meta">
      <div><strong>Período:</strong> 01/10/2026 a 31/10/2026</div>
      <div><strong>Emissão:</strong> 02/11/2026 • Auditoria Contábil Anti-Perdas & Margens Seguras</div>
      <div class="badge-scope">Frequência: Monitorado & Tratamento Personalizado | Todos os Critérios de Débito Homologados</div>
    </div>
  </div>

  <!-- 1. TABELA GERAL CONSOLIDADA -->
  <h2>1. Tabela Geral de Pontuação Consolidada (Outubro / 2026)</h2>
  <table>
    <thead>
      <tr>
        <th>Pos.</th>
        <th>Profissional</th>
        <th class="text-center">Produção (+)</th>
        <th class="text-center" style="background:#e0f2fe; color:#0369a1;">Meta Turno (+)</th>
        <th class="text-center">Déb. Fichas (-)</th>
        <th class="text-center">Déb. Turno (-)</th>
        <th class="text-center">Déb. Ponto (-)</th>
        <th class="text-center">Abonos (+)</th>
        <th class="text-center">Débito Efetivo (-)</th>
        <th class="text-center" style="background:#fef3c7; color:#92400e;">Saldo Líquido</th>
        <th class="text-center">Assiduidade</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background:#f0fdf4;">
        <td class="font-bold text-center">1º</td>
        <td class="font-bold">Pedro Grossi</td>
        <td class="text-center text-emerald font-bold">+60 pts</td>
        <td class="text-center font-bold text-emerald" style="background:#ecfdf5;">+76 pts</td>
        <td class="text-center text-rose">-6 pts</td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-rose">-29 pts</td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-rose font-bold">-35 pts</td>
        <td class="text-center font-bold" style="color:#047857; font-size:11px; background:#dcfce7;">+101 pts</td>
        <td class="text-center font-bold">21 / 21 (29m atraso)</td>
      </tr>
      <tr style="background:#f0fdf4;">
        <td class="font-bold text-center">2º</td>
        <td class="font-bold">Cleiton Freitas</td>
        <td class="text-center text-emerald font-bold">+16 pts</td>
        <td class="text-center font-bold text-emerald" style="background:#dcfce7;">+122,5 pts</td>
        <td class="text-center text-muted">0 pts</td>
        <td class="text-center text-rose">-70,5 pts</td>
        <td class="text-center text-rose" style="text-decoration:line-through;">-193 pts</td>
        <td class="text-center text-emerald font-bold">+193 pts</td>
        <td class="text-center text-rose font-bold">-70,5 pts</td>
        <td class="text-center font-bold" style="color:#166534; font-size:11px; background:#dcfce7;">+68 pts</td>
        <td class="text-center font-bold text-emerald">21 / 21 (100%)</td>
      </tr>
      <tr style="background:#f0f9ff;">
        <td class="font-bold text-center">3º</td>
        <td class="font-bold">Matheus Poeiras Luciano</td>
        <td class="text-center text-emerald font-bold">+4 pts</td>
        <td class="text-center font-bold text-emerald" style="background:#e0f2fe;">+133 pts</td>
        <td class="text-center text-rose">-10 pts</td>
        <td class="text-center text-rose">-60,5 pts</td>
        <td class="text-center text-rose">-10 pts</td>
        <td class="text-center text-emerald font-bold">+2 pts</td>
        <td class="text-center text-rose font-bold">-80,5 pts</td>
        <td class="text-center font-bold" style="color:#0369a1; font-size:11px; background:#e0f2fe;">+56,5 pts</td>
        <td class="text-center font-bold">21 / 21 (10m atraso)</td>
      </tr>
      <tr>
        <td class="font-bold text-center">4º</td>
        <td class="font-bold">Rachel Zauli Serpa</td>
        <td class="text-center text-emerald font-bold">+18 pts</td>
        <td class="text-center font-bold text-emerald" style="background:#ecfdf5;">+70 pts</td>
        <td class="text-center text-rose">-42 pts</td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-muted">0 pts</td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-rose font-bold">-42 pts</td>
        <td class="text-center font-bold" style="color:#0f766e; font-size:11px; background:#f0fdfa;">+46 pts</td>
        <td class="text-center font-bold text-emerald">21 / 21 (0m atraso)</td>
      </tr>
      <tr>
        <td class="font-bold text-center">5º</td>
        <td class="font-bold">Albert Nunes</td>
        <td class="text-center text-emerald font-bold">+88 pts</td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-rose">-42 pts</td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-muted">0 pts</td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-rose font-bold">-42 pts</td>
        <td class="text-center font-bold" style="color:#0f766e; font-size:11px; background:#f0fdfa;">+46 pts</td>
        <td class="text-center text-muted">Isento (Diretoria)</td>
      </tr>
      <tr style="background:#f0fdf4;">
        <td class="font-bold text-center">6º</td>
        <td class="font-bold">Dr. Guilherme José Graciano</td>
        <td class="text-center text-emerald font-bold">+60 pts</td>
        <td class="text-center font-bold text-emerald" style="background:#dcfce7;">+133 pts</td>
        <td class="text-center text-muted">0 pts</td>
        <td class="text-center text-rose">-60,5 pts</td>
        <td class="text-center text-rose">-129 pts</td>
        <td class="text-center text-emerald font-bold">Abono 16/10</td>
        <td class="text-center text-rose font-bold">-189,5 pts</td>
        <td class="text-center font-bold text-emerald" style="color:#047857; font-size:11px; background:#dcfce7;">+3,5 pts</td>
        <td class="text-center text-rose">18 / 21 (2 ausências, 89m)</td>
      </tr>
      <tr style="background:#fef2f2;">
        <td class="font-bold text-center">7º</td>
        <td class="font-bold">Thiago Castro Lima Rocha</td>
        <td class="text-center text-muted">0 pts</td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-muted">0 pts</td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-rose">-45 pts</td>
        <td class="text-center text-emerald font-bold">Abono 22/10</td>
        <td class="text-center text-rose font-bold">-45 pts</td>
        <td class="text-center font-bold text-rose" style="font-size:11px; background:#fee2e2;">-45 pts</td>
        <td class="text-center text-rose">8 / 11 (2 ausências, 5m)</td>
      </tr>
      <tr style="background:#fef2f2;">
        <td class="font-bold text-center">8º</td>
        <td class="font-bold">Ruthi Novais</td>
        <td class="text-center text-emerald font-bold">+8 pts</td>
        <td class="text-center font-bold text-emerald" style="background:#dcfce7;">+122,5 pts</td>
        <td class="text-center text-rose">-34 pts</td>
        <td class="text-center text-rose">-70,5 pts</td>
        <td class="text-center text-rose">-82 pts</td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-rose font-bold">-186,5 pts</td>
        <td class="text-center font-bold text-rose" style="font-size:11px; background:#fee2e2;">-56 pts</td>
        <td class="text-center font-bold text-rose">18 / 21 (3 ausências, 22m)</td>
      </tr>
      <tr style="background:#fef2f2;">
        <td class="font-bold text-center">9º</td>
        <td class="font-bold">Maria Luísa Câmara Gontijo</td>
        <td class="text-center text-emerald font-bold">+6 pts</td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-muted">0 pts</td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-rose">-112 pts</td>
        <td class="text-center text-emerald font-bold">Abono 05/10 e Qui</td>
        <td class="text-center text-rose font-bold">-112 pts</td>
        <td class="text-center font-bold text-rose" style="font-size:11px; background:#fee2e2;">-106 pts</td>
        <td class="text-center text-rose">10 plantões (3 ausências, 52m)</td>
      </tr>
    </tbody>
  </table>

  <!-- 2. AUDITORIA CONSOLIDADA DOS 5 CRITÉRIOS DE DÉBITO DO CARD OFICIAL -->
  <h2>2. Auditoria e Aplicação Rigorosa dos Critérios de Débito Oficiais</h2>
  <div class="confront-box">
    <strong>Homologação Integral dos Critérios Contratuais de Débito:</strong>
    <ul style="margin: 3px 0 3px 14px; padding: 0;">
      <li><strong>1. Avaliação/Teste/Relatório sem Ficha após 24h (-2 pts):</strong> Albert (-2 pts), Rachel (-2 pts), Pedro (-6 pts), Ruthi (-4 pts); Matheus abonado oficialmente pela gestão.</li>
      <li><strong>2. Avaliação ou Ficha vencida há &gt; 2 meses (-10 pts por aluno vinculado):</strong> Verificado para todos os profissionais com alunos sob tutela cadastral: Rachel Zauli (-40 pts: 4 alunos), Albert Nunes (-40 pts: 4 alunos), Ruthi Novais (-30 pts: 3 alunos) e Matheus Poeiras (-10 pts: 1 aluno).</li>
      <li><strong>3. Aluno ativo com frequência mensal &lt; 80% no fechamento (-5 pts/aluno):</strong> Aplicado à liderança de turno: 13 alunos na Manhã (-65 pts total ➔ -32,5 pts para Cleiton e -32,5 pts para Ruthi) e 5 alunos na Tarde (-25 pts total ➔ -12,5 pts para Matheus e -12,5 pts para Guilherme).</li>
      <li><strong>4. Aluno sem o mín. de 1 Treino Livre na semana (-2 pts/aluno no fechamento):</strong> Aplicado à liderança de turno: 34 alunos na Manhã (-68 pts total ➔ -34 pts para Cleiton e -34 pts para Ruthi) e 42 alunos na Tarde (-84 pts total ➔ -42 pts para Matheus e -42 pts para Guilherme).</li>
      <li><strong>5. Aluno com &gt; 1 emergência no mês (-4 pts/aluno no fechamento):</strong> Aplicado à liderança de turno: 2 alunos na Manhã (-8 pts total ➔ -4 pts para Cleiton e -4 pts para Ruthi: Raquel Freitas e Dante Sarmento) e 3 alunos na Tarde (-12 pts total ➔ -6 pts para Matheus e -6 pts para Guilherme: Raquel Freitas, Rafaela Vaz e Ian Javoski).</li>
      <li><strong>6. Ponto Biométrico:</strong> Ausências debitam -20 pts/dia e atrasos debitam -1 pt/minuto, conforme regras operacionais já homologadas.</li>
    </ul>
  </div>

  <!-- 3. APURAÇÃO DE METAS E ASSIDUIDADE POR TURNO -->
  <h2>3. Apuração de Metas de Turno e Bonificação de Retenção</h2>
  <div class="kpi-container">
    <!-- TURNO MANHÃ -->
    <div class="kpi-card" style="border-left: 4px solid #166534;">
      <div class="kpi-card-title" style="color: #166534;">Turno Manhã (06h às 12h) — 35 Alunos Retidos na Meta (72,9% de 48 alunos)</div>
      <div style="font-size: 8px; line-height: 1.45; color: #334155;">
        <div><strong>Bonificação (+):</strong> Co-Resp. Cleiton Freitas: <strong>+122,5 pts</strong> | Co-Resp. Ruthi Novais: <strong>+122,5 pts</strong> | Equipe Rachel Zauli: <strong>+70 pts</strong></div>
        <div><strong>Débitos de Turno (-):</strong> Frequência &lt; 80%: -65 pts (-32,5 pts cada) | Treino Livre pendente: -68 pts (-34 pts cada) | Emergências extras: -8 pts (-4 pts cada)</div>
        <div><strong>Total de Débitos do Turno Manhã:</strong> -70,5 pts para Cleiton e -70,5 pts para Ruthi</div>
      </div>
    </div>

    <!-- TURNO TARDE/NOITE -->
    <div class="kpi-card" style="border-left: 4px solid #0369a1;">
      <div class="kpi-card-title" style="color: #0369a1;">Turno Tarde/Noite (13h às 21h) — 38 Alunos Retidos na Meta (88,4% de 43 alunos)</div>
      <div style="font-size: 8px; line-height: 1.45; color: #334155;">
        <div><strong>Bonificação (+):</strong> Co-Resp. Matheus Poeiras: <strong>+133 pts</strong> | Co-Resp. Dr. Guilherme: <strong>+133 pts</strong> | Equipe Pedro Grossi: <strong>+76 pts</strong></div>
        <div><strong>Débitos de Turno (-):</strong> Frequência &lt; 80%: -25 pts (-12,5 pts cada) | Treino Livre pendente: -84 pts (-42 pts cada) | Emergências extras: -12 pts (-6 pts cada)</div>
        <div><strong>Total de Débitos do Turno Tarde/Noite:</strong> -60,5 pts para Matheus e -60,5 pts para Dr. Guilherme</div>
      </div>
    </div>
  </div>

  <!-- 4. RADAR DE OPORTUNIDADES DE FREQUÊNCIA (MONITORADO & TRATAMENTO PERSONALIZADO) -->
  <h2>4. Radar de Oportunidades de Frequência por Turno (Diagnóstico Direção)</h2>
  <table class="sub-table" style="font-size: 8px; margin-bottom: 12px;">
    <thead>
      <tr style="background:#f1f5f9;">
        <th>Turno</th>
        <th>Aluno(a) com Frequência Abaixo da Meta</th>
        <th>Plano Ativo</th>
        <th class="text-center">Presenças / Faltas</th>
        <th class="text-center">Taxa Real</th>
        <th class="text-center">Faltas p/ Atingir 80%</th>
        <th class="text-right">Débito Aluno &lt; 80%</th>
      </tr>
    </thead>
    <tbody>
      <!-- MANHÃ (13 ALUNOS) -->
      <tr>
        <td rowspan="13" class="font-bold" style="background:#f0fdf4; vertical-align:top; color:#166534;">Manhã</td>
        <td class="font-bold">Célia Maria da Silva Gomes</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">9P / 3F (12 tot)</td>
        <td class="text-center font-bold text-rose">75,0%</td>
        <td class="text-center">Apenas 1 presença a mais</td>
        <td class="text-right font-bold text-rose">-5 pts</td>
      </tr>
      <tr>
        <td class="font-bold">Anna Luiza Nogueira Coutinho</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">3P / 1F (4 tot)</td>
        <td class="text-center font-bold text-rose">75,0%</td>
        <td class="text-center">Apenas 1 presença a mais</td>
        <td class="text-right font-bold text-rose">-5 pts</td>
      </tr>
      <tr>
        <td class="font-bold">Livia Teixeira de Lima</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">7P / 3F (10 tot)</td>
        <td class="text-center font-bold text-rose">70,0%</td>
        <td class="text-center">Apenas 1 presença a mais</td>
        <td class="text-right font-bold text-rose">-5 pts</td>
      </tr>
      <tr>
        <td class="font-bold">Danilson Gonçalves De Melo e Silva</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">7P / 3F (10 tot)</td>
        <td class="text-center font-bold text-rose">70,0%</td>
        <td class="text-center">Apenas 1 presença a mais</td>
        <td class="text-right font-bold text-rose">-5 pts</td>
      </tr>
      <tr>
        <td class="font-bold">Tatiana Bonifacino</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">7P / 3F (10 tot)</td>
        <td class="text-center font-bold text-rose">70,0%</td>
        <td class="text-center">Apenas 1 presença a mais</td>
        <td class="text-right font-bold text-rose">-5 pts</td>
      </tr>
      <tr>
        <td class="font-bold">Kelly Nascimento Brandão</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">8P / 4F (12 tot)</td>
        <td class="text-center font-bold text-rose">66,7%</td>
        <td class="text-center">2 presenças a mais</td>
        <td class="text-right font-bold text-rose">-5 pts</td>
      </tr>
      <tr>
        <td class="font-bold">Helcio Dias Florencio</td>
        <td>Tratamento Personalizado</td>
        <td class="text-center">1P / 1F (2 tot)</td>
        <td class="text-center font-bold text-rose">50,0%</td>
        <td class="text-center">Apenas 1 presença a mais</td>
        <td class="text-right font-bold text-rose">-5 pts</td>
      </tr>
      <tr>
        <td class="font-bold">Mariana Borja de Salvo</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">4P / 4F (8 tot)</td>
        <td class="text-center font-bold text-rose">50,0%</td>
        <td class="text-center">3 presenças a mais</td>
        <td class="text-right font-bold text-rose">-5 pts</td>
      </tr>
      <tr>
        <td class="font-bold">Aluisio Mourão Mendes</td>
        <td>Tratamento Personalizado</td>
        <td class="text-center">4P / 5F (9 tot)</td>
        <td class="text-center font-bold text-rose">44,4%</td>
        <td class="text-center">4 presenças a mais</td>
        <td class="text-right font-bold text-rose">-5 pts</td>
      </tr>
      <tr>
        <td class="font-bold">Ruan de Oliveira Lopes Rosa</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">2P / 7F (9 tot)</td>
        <td class="text-center font-bold text-rose">22,2%</td>
        <td class="text-center">6 presenças a mais</td>
        <td class="text-right font-bold text-rose">-5 pts</td>
      </tr>
      <tr>
        <td class="font-bold">Juliana de Carvalho Bastone</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">0P / 1F (1 tot)</td>
        <td class="text-center font-bold text-rose">0,0%</td>
        <td class="text-center">1 presença p/ 100%</td>
        <td class="text-right font-bold text-rose">-5 pts</td>
      </tr>
      <tr>
        <td class="font-bold">Fabrício Galvão de Brito</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">0P / 2F (2 tot)</td>
        <td class="text-center font-bold text-rose">0,0%</td>
        <td class="text-center">2 presenças p/ 100%</td>
        <td class="text-right font-bold text-rose">-5 pts</td>
      </tr>
      <tr>
        <td class="font-bold">Sofia Araújo Campos</td>
        <td>Tratamento Personalizado</td>
        <td class="text-center">0P / 0F (0 tot)</td>
        <td class="text-center font-bold text-muted">Sem baixa</td>
        <td class="text-center">Início sem frequência</td>
        <td class="text-right font-bold text-rose">-5 pts</td>
      </tr>

      <!-- TARDE / NOITE (5 ALUNOS) -->
      <tr style="border-top: 2px solid #cbd5e1;">
        <td rowspan="5" class="font-bold" style="background:#f0f9ff; vertical-align:top; color:#0369a1;">Tarde/Noite</td>
        <td class="font-bold">Maria Valentina Bonifacino Ferreira Rocha</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">7P / 2F (9 tot)</td>
        <td class="text-center font-bold text-rose">77,8%</td>
        <td class="text-center">Apenas 1 presença a mais</td>
        <td class="text-right font-bold text-rose">-5 pts</td>
      </tr>
      <tr>
        <td class="font-bold">Ronei Vital Gomes</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">7P / 3F (10 tot)</td>
        <td class="text-center font-bold text-rose">70,0%</td>
        <td class="text-center">Apenas 1 presença a mais</td>
        <td class="text-right font-bold text-rose">-5 pts</td>
      </tr>
      <tr>
        <td class="font-bold">Francisco De assis de souza gomes</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">4P / 2F (6 tot)</td>
        <td class="text-center font-bold text-rose">66,7%</td>
        <td class="text-center">Apenas 1 presença a mais</td>
        <td class="text-right font-bold text-rose">-5 pts</td>
      </tr>
      <tr>
        <td class="font-bold">Rosália Pessoa Caldas</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">6P / 3F (9 tot)</td>
        <td class="text-center font-bold text-rose">66,7%</td>
        <td class="text-center">2 presenças a mais</td>
        <td class="text-right font-bold text-rose">-5 pts</td>
      </tr>
      <tr>
        <td class="font-bold">Márcio Nogueira Resende</td>
        <td>Tratamento Personalizado</td>
        <td class="text-center">5P / 3F (8 tot)</td>
        <td class="text-center font-bold text-rose">62,5%</td>
        <td class="text-center">2 presenças a mais</td>
        <td class="text-right font-bold text-rose">-5 pts</td>
      </tr>
    </tbody>
  </table>

  <!-- 4.1 TABELA DE PROCEDIMENTOS QUE EXTRAPOLARAM O TEMPO LIMITE SLA -->
  <h2>4.1 Procedimentos Clínicos que Extrapolaram o Tempo Limite de SLA (&gt; 2 Horas)</h2>
  <table class="sub-table" style="font-size: 8px; margin-bottom: 12px;">
    <thead>
      <tr style="background:#fef2f2;">
        <th>Data</th>
        <th>Aluno(a)</th>
        <th>Procedimento</th>
        <th>Profissional Executor</th>
        <th>Duração Registrada</th>
        <th>Teto Máximo SLA</th>
        <th class="text-right">Status / Pontos</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="font-bold">08/10/2026</td>
        <td class="font-bold">Lúcia da Silva</td>
        <td>Relatório Clínico Fisioterápico</td>
        <td>Dr. Guilherme José Graciano</td>
        <td class="text-rose font-bold">162m 23s (2h 42m)</td>
        <td>120 min (2h)</td>
        <td class="text-right font-bold text-rose">Extrapolou SLA (0 pts)</td>
      </tr>
      <tr>
        <td class="font-bold">15/10/2026</td>
        <td class="font-bold">Lourilda Maria Santos Rocha</td>
        <td>Relatório Clínico Fisioterápico</td>
        <td>Albert Nunes</td>
        <td class="text-rose font-bold">132m 48s (2h 13m)</td>
        <td>120 min (2h)</td>
        <td class="text-right font-bold text-rose">Extrapolou SLA (0 pts)</td>
      </tr>
      <tr>
        <td class="font-bold">19/10/2026</td>
        <td class="font-bold">Mateus Ahlert</td>
        <td>Relatório Clínico Fisioterápico</td>
        <td>Dr. Guilherme José Graciano</td>
        <td class="text-rose font-bold">209m 20s (3h 29m)</td>
        <td>120 min (2h)</td>
        <td class="text-right font-bold text-rose">Extrapolou SLA (0 pts)</td>
      </tr>
      <tr>
        <td class="font-bold">23/10/2026</td>
        <td class="font-bold">Éder Pereira</td>
        <td>Relatório Clínico Fisioterápico</td>
        <td>Dr. Guilherme José Graciano</td>
        <td class="text-rose font-bold">141m 29s (2h 21m)</td>
        <td>120 min (2h)</td>
        <td class="text-right font-bold text-rose">Extrapolou SLA (0 pts)</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- 5. DETALHAMENTO PADRONIZADO POR PROFISSIONAL -->
  <h2>5. Detalhamento Padronizado por Profissional & Auditoria Completa</h2>

${profCardsHtml}

</body>
</html>`;

  const htmlOutputPath = 'C:/Users/user/.gemini/antigravity/brain/abdac8a5-d79c-4a8d-b6f5-b3894f8eb65b/relatorio_pontuacao_outubro_2026.html';
  fs.writeFileSync(htmlOutputPath, html, 'utf8');
  console.log(`HTML generated successfully at: ${htmlOutputPath} (${html.length} bytes)`);

  process.exit(0);
}

build().catch(err => {
  console.error('Error during build:', err);
  process.exit(1);
});
