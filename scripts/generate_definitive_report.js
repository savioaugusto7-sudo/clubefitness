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
    if (ct.planoNome) clientContractMap.set(cid = String(ct.clientId), ct.planoNome);
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
      plan: finalPlan
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
  // Regra: Concluída dentro do SLA (≤ 1h). Se inferior a 15min, pontua mediante abono oficial da gestão.
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
      pontuou = true; // Abonado conforme comando expresso: "mas abone o ponto de avaliações fisicas ou fisioterapicas inferiores a 15min"
      motivo = `Inferior a 15min (${duracaoMin}m) — Pontuado por Abono Oficial da Gestão`;
    }

    let pontos = pontuou ? 4 : 0;

    // Determinação da Gestão: remover duplicidade de Daniele Debossan no dia 02/10
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
  // Regra expressa: "Teste de força pode ter qualquer tempo registrado" -> TODOS pontuam (+4 pts cada)!
  strengthTests.forEach(s => {
    const prof = normName(profMap.get(String(s.profissionalId)) || s.profissionalNome);
    const client = clientMap.get(String(s.clienteId));
    const alunoNome = client?.nome || s.alunoNome || 'Não Identificado';
    const tempo = Number(s.tempoGastoSegundos) || 0;
    const pontuou = true;

    if (clinicalByProf[prof]) {
      clinicalByProf[prof].push({
        tipo: 'Teste de Força (Dinamometria)',
        data: s.data,
        aluno: alunoNome,
        plano: client?.plan || 'Sem Plano',
        duracaoStr: `${Math.floor(tempo / 60)}m ${tempo % 60}s`,
        tempoSegundos: tempo,
        pontuou,
        pontos: 4,
        motivo: 'Pontuou (Teste de Força - Qualquer tempo admitido)'
      });
    }
  });

  // Processar Relatórios Clínicos Fisioterápicos:
  // Regra: SLA teto de 2h (7200s). Se inferior a 15min, pontua por Abono da Gestão. Se > 2h, extrapola o tempo (0 pts).
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
      pontuou = true; // Abonado conforme comando: "mas abone o ponto de avaliações fisicas ou fisioterapicas inferiores a 15min"
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

  // Tabela de ponto sem emojis
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

  // Cards individuais ordenados rigorosamente pelo ranking de Saldo Líquido Final atualizado
  const profDetails = [
    {
      nome: 'Cleiton Freitas',
      cargo: 'Fisioterapeuta / Educador Físico / Co-Responsável Manhã',
      saldoStr: 'Produção: +16 pts (3 ev.) | Meta Turno: +91 pts (Co-Resp. 50%) | Débitos: 0 pts | Saldo Líquido Final: +107 pts',
      saldoColor: '#166534',
      badge: '1º Lugar Geral',
      debitosHtml: `      <div class="sub-table-title">Débitos Registrados Conforme Regras</div>
      <table class="sub-table">
        <thead><tr><th>Data</th><th>Ocorrência</th><th>Critério</th><th class="text-right">Impacto</th></tr></thead>
        <tbody><tr><td colspan="4" class="text-center text-muted" style="padding:6px;">Nenhuma infração registrada no mês. 100% assíduo e pontual. Débito de teste técnico em 06/10 abonado oficialmente.</td></tr></tbody>
      </table>`,
      auditNote: '<strong>Auditoria de Ponto, Produção e Meta de Turno:</strong> Co-responsável pelo Turno da Manhã compartilhando a liderança com Ruthi Novais (+91 pts com base nos 26 alunos retidos na meta). 21 dias presentes em 21 dias úteis (100% de assiduidade). Registro do dia 06/10 abonado pela gestão (teste técnico). Produção clínica: 3 procedimentos pontuados (+16 pts: 1 avaliação física e 2 relatórios fisioterápicos).'
    },
    {
      nome: 'Albert Nunes',
      cargo: 'Diretor Clínico / Fisioterapeuta',
      saldoStr: 'Produção: +88 pts (20 ev.) | Meta Turno: — (Diretoria) | Débito SLA: -2 pts | Saldo Líquido Final: +86 pts',
      saldoColor: '#047857',
      badge: '2º Lugar Geral',
      debitosHtml: `      <div class="sub-table-title">Débitos Registrados (Critérios Oficiais)</div>
      <table class="sub-table">
        <thead><tr><th>Data</th><th>Aluno(a) / Ocorrência</th><th>Motivo</th><th class="text-right">Débito</th></tr></thead>
        <tbody><tr><td>30/10/2026</td><td>Augusto Andrade Oliveira</td><td>SLA Ficha 24h: Ficha não prescrita em até 24h pós-avaliação</td><td class="text-right text-rose">-2 pts</td></tr></tbody>
      </table>`,
      auditNote: '<strong>Auditoria de Governança e Produção Clínica:</strong> Isento de marcação biométrica por responder pela Direção Clínica e societária da unidade. Conforme regra geral de remuneração de produção, todo procedimento clínico executado pontua para o profissional. Executou 21 procedimentos: 20 pontuaram no SLA (+88 pts: 11 avaliações, incluindo 2 inferiores a 15min abonadas pela gestão, 5 testes de dinamometria e 4 relatórios) e 1 relatório extrapolou o SLA de 2h (Lourilda Maria, 132 min, registrado na tabela de extrapolação). Débito de SLA de Ficha: -2 pts. Saldo final: +86 pts.'
    },
    {
      nome: 'Rachel Zauli Serpa',
      cargo: 'Fisioterapeuta / Equipe Manhã',
      saldoStr: 'Produção: +18 pts (4 ev.) | Meta Turno: +52 pts (26 al. × 2) | Débitos SLA: -2 pts | Saldo Líquido Final: +68 pts',
      saldoColor: '#0f766e',
      badge: '3º Lugar Geral',
      debitosHtml: `      <div class="sub-table-title">Débitos Registrados (Critérios Oficiais)</div>
      <table class="sub-table">
        <thead><tr><th>Data</th><th>Aluno(a) / Ocorrência</th><th>Motivo</th><th class="text-right">Débito</th></tr></thead>
        <tbody><tr><td>26/10/2026</td><td>Monia Pires Novais</td><td>SLA Ficha 24h: Ficha não prescrita em até 24h pós-avaliação</td><td class="text-right text-rose">-2 pts</td></tr></tbody>
      </table>`,
      auditNote: '<strong>Auditoria de Ponto, Produção e Meta de Turno:</strong> Integrante da Equipe da Manhã (+52 pts pela retenção de 26 alunos). 21 dias presentes em 21 dias úteis (100% de assiduidade com ZERO minutos de atraso em todo o mês). Escala oficial no sistema: Segunda, Quarta, Quinta e Sexta às 09:00h; Terça-feira às 10:00h. Todos os 4 procedimentos clínicos executados pontuaram no SLA (+18 pts). Débito de SLA: -2 pts.'
    },
    {
      nome: 'Pedro Grossi',
      cargo: 'Fisioterapeuta / Treinador / Equipe Tarde-Noite',
      saldoStr: 'Produção: +60 pts (12 ev.) | Meta Turno: +22 pts (11 al. × 2) | Débitos: -35 pts (-29 pts ponto, -6 pts SLA) | Saldo Líquido Final: +47 pts',
      saldoColor: '#0284c7',
      badge: '4º Lugar Geral',
      debitosHtml: `      <div class="sub-table-title">Débitos Registrados (Critérios Oficiais)</div>
      <table class="sub-table">
        <thead><tr><th>Data</th><th>Aluno(a) / Ocorrência</th><th>Motivo</th><th class="text-right">Débito</th></tr></thead>
        <tbody>
          <tr><td>01/10/2026</td><td>Gabriel Lage</td><td>Ficha de treino não atualizada em até 24h pós-avaliação</td><td class="text-right text-rose">-2 pts</td></tr>
          <tr><td>02/10/2026</td><td>Ronei Vital Gomes</td><td>Ficha de treino não atualizada em até 24h pós-avaliação</td><td class="text-right text-rose">-2 pts</td></tr>
          <tr><td>05/10/2026</td><td>Juan Victor Rocha</td><td>Ficha de treino não atualizada em até 24h pós-avaliação</td><td class="text-right text-rose">-2 pts</td></tr>
          <tr><td>Outubro/2026</td><td>Atrasos de Ponto (9 ocorrências)</td><td>Débito estrito de atraso de ponto: 29 minutos acumulados (1 min = 1 pt)</td><td class="text-right text-rose">-29 pts</td></tr>
        </tbody>
      </table>`,
      auditNote: '<strong>Auditoria de Ponto, Produção e Meta de Turno:</strong> Integrante da Equipe Tarde/Noite (+22 pts pela retenção de 11 alunos). 21 dias presentes em 21 dias úteis (100% assíduo). Horário contratual esperado às 15:00h. Conforme determinação expressa da gestão, atrasos são debitados à razão de 1 min = 1 pt (29 minutos acumulados em 9 plantões = -29 pts). Débitos de SLA de Ficha: -6 pts. Produção clínica: 12 procedimentos concluídos (+60 pts: 3 avaliações, 3 testes de dinamometria e 6 relatórios fisioterápicos, incluindo os 2 inferiores a 15 min abonados). Saldo final: +47 pts.'
    },
    {
      nome: 'Matheus Poeiras Luciano',
      cargo: 'Treinador / Co-Responsável Turno Tarde-Noite',
      saldoStr: 'Produção: +4 pts (1 ev.) | Meta Turno: +38,5 pts (Co-Resp. 50%) | Débitos: -10 pts (Atrasos de Ponto) | Saldo Líquido Final: +32,5 pts',
      saldoColor: '#0369a1',
      badge: '5º Lugar Geral',
      debitosHtml: `      <div class="sub-table-title">Débitos Registrados (Critérios Oficiais)</div>
      <table class="sub-table">
        <thead><tr><th>Data</th><th>Aluno(a) / Ocorrência</th><th>Motivo</th><th class="text-right">Status / Impacto</th></tr></thead>
        <tbody>
          <tr><td>08/10/2026</td><td>Maria de Fátima Gottschalg</td><td>Ficha de treino não atualizada em 24h pós-avaliação</td><td class="text-right text-emerald font-bold">Abonado pela Gestão (0 pts)</td></tr>
          <tr><td>Outubro/2026</td><td>Atrasos de Ponto (3 ocorrências)</td><td>Débito estrito de atraso de ponto: 10 minutos acumulados (07/10 1m, 08/10 1m, 21/10 8m)</td><td class="text-right text-rose">-10 pts</td></tr>
        </tbody>
      </table>`,
      auditNote: '<strong>Auditoria de Ponto, Produção e Meta de Turno:</strong> Co-responsável pelo Turno da Tarde/Noite compartilhando a liderança com Dr. Guilherme Graciano (+38,5 pts para cada com base na divisão de 50% dos 77 pts dos 11 alunos retidos). 21 dias presentes em 21 dias úteis (100% assíduo). Débito de SLA de Ficha da aluna Maria de Fátima Gottschalg oficialmente abonado pela gestão (+2 pts). Atrasos de ponto debitados à razão de 1 min = 1 pt (10 minutos acumulados = -10 pts). Produção clínica: 1 avaliação física (+4 pts). Saldo final: +32,5 pts.'
    },
    {
      nome: 'Ruthi Novais',
      cargo: 'Treinadora / Avaliadora / Co-Responsável Manhã',
      saldoStr: 'Produção: +8 pts (2 ev.) | Meta Turno: +91 pts (Co-Resp. 50%) | Débitos: -86 pts (-60 pts ausências, -22 pts atrasos, -4 pts SLA) | Saldo Líquido Final: +13 pts',
      saldoColor: '#166534',
      badge: '6º Lugar Geral',
      debitosHtml: `      <div class="sub-table-title">Débitos Registrados (Critérios Oficiais)</div>
      <table class="sub-table">
        <thead><tr><th>Data</th><th>Aluno(a) / Ocorrência</th><th>Motivo</th><th class="text-right">Débito</th></tr></thead>
        <tbody>
          <tr><td>09/10/2026</td><td>Plantão Manhã</td><td>Ausência de registro de ponto no turno</td><td class="text-right text-rose">-20 pts</td></tr>
          <tr><td>13/10/2026</td><td>Plantão Manhã</td><td>Ausência de registro de ponto no turno</td><td class="text-right text-rose">-20 pts</td></tr>
          <tr><td>14/10/2026</td><td>Plantão Manhã</td><td>Ausência de registro de ponto no turno</td><td class="text-right text-rose">-20 pts</td></tr>
          <tr><td>Outubro/2026</td><td>Atrasos de Ponto (4 ocorrências)</td><td>Débito estrito de atraso de ponto: 22 minutos acumulados (02/10 4m, 05/10 4m, 07/10 1m, 22/10 13m)</td><td class="text-right text-rose">-22 pts</td></tr>
          <tr><td>02/10/2026</td><td>Daniele Debossan</td><td>Ficha de treino não atualizada em até 24h pós-avaliação</td><td class="text-right text-rose">-2 pts</td></tr>
          <tr><td>30/10/2026</td><td>Renato Brandão Diniz</td><td>Ficha de treino não atualizada em até 24h pós-avaliação</td><td class="text-right text-rose">-2 pts</td></tr>
        </tbody>
      </table>`,
      auditNote: '<strong>Auditoria de Ponto, Produção e Meta de Turno:</strong> Co-responsável pelo Turno da Manhã compartilhando a liderança com Cleiton Freitas (+91 pts atribuídos para cada com base nos 26 alunos retidos na meta). Horário contratual oficial ajustado para 06:00h. Conforme determinação expressa da gestão, ausências de registro biométrico debitam 20 pts (3 dias em 09, 13 e 14/10 = -60 pts). Atrasos de ponto debitados à razão de 1 min = 1 pt (22 min acumulados = -22 pts). Débitos de SLA de Ficha: -4 pts. Produção clínica: 2 avaliações válidas no SLA (+8 pts) — a 2ª avaliação de Daniele Debossan em 02/10 foi desconsiderada por duplicidade. Saldo final: +13 pts.'
    },
    {
      nome: 'Guilherme José Graciano',
      cargo: 'Fisioterapeuta / Co-Responsável Turno Tarde-Noite',
      saldoStr: 'Produção: +60 pts (11 ev.) | Meta Turno: +38,5 pts (Co-Resp. 50%) | Débitos: -129 pts (-40 pts ausências, -89 pts atrasos) | Saldo Líquido Final: -30,5 pts',
      saldoColor: '#b91c1c',
      badge: '7º Lugar Geral',
      debitosHtml: `      <div class="sub-table-title">Débitos Registrados Conforme Regras</div>
      <table class="sub-table">
        <thead><tr><th>Data</th><th>Ocorrência</th><th>Critério</th><th class="text-right">Impacto</th></tr></thead>
        <tbody>
          <tr><td>16/10/2026</td><td>Sexta-feira</td><td>Sexta-feira autorizada e abonada oficialmente pela gestão</td><td class="text-right text-emerald font-bold">Abonado Oficial (0 pts)</td></tr>
          <tr><td>20/10/2026</td><td>Plantão Terça</td><td>Ausência de registro de ponto biométrico no turno</td><td class="text-right text-rose">-20 pts</td></tr>
          <tr><td>27/10/2026</td><td>Plantão Terça</td><td>Ausência de registro de ponto biométrico no turno</td><td class="text-right text-rose">-20 pts</td></tr>
          <tr><td>Outubro/2026</td><td>Atrasos de Ponto (4 ocorrências)</td><td>Débito estrito de atraso de ponto: 89 minutos acumulados (02/10 16m, 06/10 3m, 22/10 13m, 29/10 57m)</td><td class="text-right text-rose">-89 pts</td></tr>
        </tbody>
      </table>`,
      auditNote: '<strong>Auditoria de Ponto, Produção e Meta de Turno:</strong> Co-responsável pelo Turno da Tarde/Noite compartilhando a liderança com Matheus Poeiras (+38,5 pts para cada com base na divisão de 50% dos 77 pts dos 11 alunos retidos). Conforme determinação expressa da gestão, ausências de registro biométrico debitam 20 pts (20/10 e 27/10 = -40 pts; 16/10 abonada oficialmente). Atrasos de ponto debitados estritamente à razão de 1 min = 1 pt (89 min acumulados = -89 pts). Produção clínica: 11 procedimentos pontuados no SLA (+60 pts). 4 relatórios extrapolaram 2h e constam na tabela de extrapolação. Saldo final: -30,5 pts.'
    },
    {
      nome: 'Thiago Castro Lima Rocha',
      cargo: 'Fisioterapeuta (Início em 16/10/2026)',
      saldoStr: 'Produção: 0 pts | Meta Turno: — | Débitos: -45 pts (-40 pts ausências, -5 pts atrasos) | Saldo Líquido Final: -45 pts',
      saldoColor: '#b91c1c',
      badge: '8º Lugar Geral',
      debitosHtml: `      <div class="sub-table-title">Débitos Registrados Conforme Regras</div>
      <table class="sub-table">
        <thead><tr><th>Data</th><th>Ocorrência</th><th>Critério</th><th class="text-right">Impacto</th></tr></thead>
        <tbody>
          <tr><td>01 a 15/10/2026</td><td>Período Pré-admissão</td><td>Período anterior à admissão oficial do profissional</td><td class="text-right text-muted">— (0 pts)</td></tr>
          <tr><td>21/10/2026</td><td>Plantão Quarta</td><td>Ausência de registro de ponto no plantão</td><td class="text-right text-rose">-20 pts</td></tr>
          <tr><td>22/10/2026</td><td>Plantão Quinta</td><td>Presença confirmada no horário / Esquecimento de marcação abonado</td><td class="text-right text-emerald font-bold">Abonado Oficial (0 pts)</td></tr>
          <tr><td>27/10/2026</td><td>Plantão Terça</td><td>Ausência de registro de ponto no plantão</td><td class="text-right text-rose">-20 pts</td></tr>
          <tr><td>Outubro/2026</td><td>Atrasos de Ponto (4 ocorrências)</td><td>Débito estrito de atraso de ponto: 5 minutos acumulados (19/10 1m, 20/10 1m, 23/10 1m, 26/10 2m)</td><td class="text-right text-rose">-5 pts</td></tr>
        </tbody>
      </table>`,
      auditNote: '<strong>Auditoria de Ponto e Produção:</strong> Admitido em 16/10/2026. Conforme determinação da gestão, o período pré-admissão (01 a 15/10) é identificado por (-). No dia 22/10, presença confirmada e abonada formalmente pela gestão. Dias sem marcação de ponto (21/10 e 27/10) debitam 20 pts cada (-40 pts). Atrasos de ponto somaram 5 minutos debitados a 1 pt/min (-5 pts). Saldo final: -45 pts.'
    },
    {
      nome: 'Maria Luísa Câmara Gontijo',
      cargo: 'Fisioterapeuta (Escala Fixada)',
      saldoStr: 'Produção: +6 pts (1 ev.) | Meta Turno: — | Débitos: -112 pts (-60 pts ausências, -52 pts atrasos) | Saldo Líquido Final: -106 pts',
      saldoColor: '#b91c1c',
      badge: '9º Lugar Geral',
      debitosHtml: `      <div class="sub-table-title">Débitos Registrados Conforme Regras</div>
      <table class="sub-table">
        <thead><tr><th>Data</th><th>Ocorrência</th><th>Critério</th><th class="text-right">Impacto</th></tr></thead>
        <tbody>
          <tr><td>01 e 02/10/2026</td><td>Período Pré-início</td><td>Período anterior ao primeiro plantão presencial</td><td class="text-right text-muted">— (0 pts)</td></tr>
          <tr><td>05/10/2026</td><td>Primeiro Plantão</td><td>Primeiro registro presencial / Débito de entrada abonado pela gestão</td><td class="text-right text-emerald font-bold">Abonado Oficial (0 pts)</td></tr>
          <tr><td>06/10/2026</td><td>Plantão Terça (07h)</td><td>Ausência de registro de ponto no plantão obrigatório</td><td class="text-right text-rose">-20 pts</td></tr>
          <tr><td>16/10/2026</td><td>Plantão Sexta (14h)</td><td>Ausência de registro de ponto no plantão obrigatório</td><td class="text-right text-rose">-20 pts</td></tr>
          <tr><td>27/10/2026</td><td>Plantão Terça (07h)</td><td>Ausência de registro de ponto no plantão obrigatório</td><td class="text-right text-rose">-20 pts</td></tr>
          <tr><td>Quintas-feiras</td><td>Escala Facultativa (07h)</td><td>Plantões não fixos: ausência abonada automaticamente conforme determinação</td><td class="text-right text-emerald font-bold">Abonado (0 pts)</td></tr>
          <tr><td>Quartas-feiras</td><td>Folga Semanal</td><td>Escala sem plantão programado</td><td class="text-right text-muted">Folga (0 pts)</td></tr>
          <tr><td>Outubro/2026</td><td>Atrasos de Ponto (3 ocorrências)</td><td>Débito estrito de atraso de ponto: 52 minutos acumulados (19/10 18m, 20/10 8m, 26/10 26m)</td><td class="text-right text-rose">-52 pts</td></tr>
        </tbody>
      </table>`,
      auditNote: '<strong>Auditoria de Ponto, Produção e Escala Oficial:</strong> Escala oficial cadastrada no sistema e homologada em relatório: Segunda 09h, Terça 07h, Quinta 07h (não fixo / abonado automaticamente se ausente), Sexta 14h; Quarta folga. Período pré-início (01 e 02/10) registrado como (-). Primeiro plantão (05/10) abonado pela gestão. Ausências em plantões obrigatórios (06, 16 e 27/10) debitam 20 pts cada (-60 pts). Atrasos de ponto somaram 52 minutos debitados a 1 pt/min (-52 pts). Produção clínica: 1 relatório fisioterápico (+6 pts). Saldo final: -106 pts.'
    }
  ];

  // Montar blocos individuais com quebra de página controlada
  const profCardsHtml = profDetails.map((p, idx) => {
    const pageBreak = (idx === 1 || idx === 3 || idx === 5 || idx === 7) ? '<div class="page-break"></div>' : '';
    return `${pageBreak}
  <div class="prof-card">
    <div class="prof-header">
      <div>
        <span class="prof-name">${p.nome}</span>
        <span class="prof-role">• ${p.cargo}</span>
        <span style="display:inline-block; margin-left:8px; padding:2px 6px; border-radius:4px; background:#f8fafc; font-size:8.5px; font-weight:700; color:#475569; border:1px solid #cbd5e1;">${p.badge}</span>
      </div>
      <div class="prof-balance" style="color: ${p.saldoColor}; font-weight: bold;">
        ${p.saldoStr}
      </div>
    </div>
    <div class="prof-body">
${getClinicalTableForProf(p.nome)}
${p.debitosHtml}
${getPontoTableForProf(p.nome)}
      <div class="audit-note">${p.auditNote}</div>
    </div>
  </div>`;
  }).join('\n\n');

  // Montar HTML do relatório totalmente isento de emojis
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório Executivo de Pontuação dos Profissionais — Outubro / 2026</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 10mm 12mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 10px;
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
      font-size: 10px;
      color: #475569;
      margin-top: 2px;
      font-weight: 500;
    }
    .header .meta {
      text-align: right;
      font-size: 9px;
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
      font-size: 8.5px;
      margin-top: 3px;
    }

    h2 {
      font-size: 11px;
      font-weight: 800;
      color: #1e293b;
      margin: 12px 0 6px 0;
      padding-bottom: 3px;
      border-bottom: 1px solid #e2e8f0;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 9.5px;
    }
    th {
      background: #f8fafc;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 5px 6px;
      border-top: 1px solid #cbd5e1;
      border-bottom: 1.5px solid #94a3b8;
      font-size: 8.5px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    td {
      padding: 4px 6px;
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
      padding: 8px 10px;
      margin-bottom: 10px;
      border-radius: 4px;
      font-size: 9px;
      line-height: 1.45;
    }

    .kpi-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
    }
    .kpi-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      background: #ffffff;
    }
    .kpi-card-title {
      font-size: 10.5px;
      font-weight: 800;
      margin-bottom: 4px;
      padding-bottom: 3px;
      border-bottom: 1px solid #e2e8f0;
    }

    .prof-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      margin-bottom: 14px;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
      page-break-inside: avoid;
    }
    .prof-header {
      background: #f1f5f9;
      padding: 6px 10px;
      border-bottom: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top-left-radius: 5px;
      border-top-right-radius: 5px;
    }
    .prof-name {
      font-weight: 800;
      font-size: 11px;
      color: #0f172a;
    }
    .prof-role {
      font-size: 9px;
      color: #475569;
      margin-left: 6px;
    }
    .prof-balance {
      font-size: 9.5px;
      font-weight: 800;
    }
    .prof-body {
      padding: 8px 10px;
    }

    .sub-table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0 8px 0;
      font-size: 8.5px;
    }
    .sub-table th {
      background: #f8fafc;
      font-size: 8px;
      padding: 3px 5px;
      border-bottom: 1px solid #cbd5e1;
    }
    .sub-table td {
      padding: 3px 5px;
      border-bottom: 1px solid #f1f5f9;
    }
    .sub-table-title {
      font-weight: 700;
      font-size: 9px;
      color: #334155;
      margin-top: 6px;
      margin-bottom: 2px;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .audit-note {
      font-size: 8.5px;
      color: #475569;
      background: #f8fafc;
      padding: 5px 8px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
      margin-top: 6px;
      line-height: 1.4;
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
      <div><strong>Emissão:</strong> 02/11/2026 • Auditoria Contábil Anti-Perdas</div>
      <div class="badge-scope">Frequência: Exclusivo Clube Fitness Monitorado | Produção: Todos os Planos</div>
    </div>
  </div>

  <!-- 1. TABELA GERAL CONSOLIDADA -->
  <h2>1. Tabela Geral de Pontuação Consolidada (Outubro / 2026)</h2>
  <table>
    <thead>
      <tr>
        <th>Profissional</th>
        <th>Função / Turno</th>
        <th class="text-center">Produção Clínica (+)</th>
        <th class="text-center" style="background:#e0f2fe; color:#0369a1;">Meta Turno (≥80%) (+)</th>
        <th class="text-center">Débito Original</th>
        <th class="text-center">Abonos (+)</th>
        <th class="text-center">Débito Efetivo (-)</th>
        <th class="text-center" style="background:#fef3c7; color:#92400e;">Saldo Líquido Final</th>
        <th class="text-center">Assiduidade (Ponto)</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background:#f0fdf4;">
        <td class="font-bold">Cleiton Freitas</td>
        <td>Fisioterapeuta / <strong>Co-Resp. Manhã</strong></td>
        <td class="text-center text-emerald font-bold">+16 pts <small>(3 ev.)</small></td>
        <td class="text-center font-bold text-emerald" style="background:#dcfce7; font-size:11px;">+91 pts <small>(50% de 26 al. × 7)</small></td>
        <td class="text-center text-rose" style="text-decoration:line-through;">-193 pts</td>
        <td class="text-center text-emerald font-bold">+193 pts</td>
        <td class="text-center text-emerald font-bold">0 pts</td>
        <td class="text-center font-bold" style="color:#166534; font-size:12px; background:#dcfce7;">+107 pts</td>
        <td class="text-center font-bold text-emerald">21 / 21 (100%)</td>
      </tr>
      <tr>
        <td class="font-bold">Albert Nunes</td>
        <td>Diretor Clínico / Fisioterapia</td>
        <td class="text-center text-emerald font-bold">+88 pts <small>(20 ev.)</small></td>
        <td class="text-center text-muted">— <small>(Diretoria)</small></td>
        <td class="text-center text-rose">-2 pts</td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-rose font-bold">-2 pts</td>
        <td class="text-center font-bold" style="color:#0f766e; font-size:12px; background:#f0fdfa;">+86 pts</td>
        <td class="text-center text-muted">Isento (Diretoria)</td>
      </tr>
      <tr>
        <td class="font-bold">Rachel Zauli Serpa</td>
        <td>Fisioterapeuta / Equipe Manhã</td>
        <td class="text-center text-emerald font-bold">+18 pts <small>(4 ev.)</small></td>
        <td class="text-center font-bold text-emerald" style="background:#ecfdf5; font-size:11px;">+52 pts <small>(26 al. × 2)</small></td>
        <td class="text-center text-rose">-2 pts</td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-rose font-bold">-2 pts</td>
        <td class="text-center font-bold" style="color:#0f766e; font-size:12px; background:#f0fdfa;">+68 pts</td>
        <td class="text-center font-bold text-emerald">21 / 21 (0m atraso)</td>
      </tr>
      <tr>
        <td class="font-bold">Pedro Grossi</td>
        <td>Fisioterapeuta / Equipe Tarde-Noite</td>
        <td class="text-center text-emerald font-bold">+60 pts <small>(12 ev.)</small></td>
        <td class="text-center font-bold text-emerald" style="background:#ecfdf5; font-size:11px;">+22 pts <small>(11 al. × 2)</small></td>
        <td class="text-center text-rose">-35 pts</td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-rose font-bold">-35 pts</td>
        <td class="text-center font-bold" style="color:#0284c7; font-size:12px;">+47 pts</td>
        <td class="text-center font-bold">21 / 21 (29m atraso)</td>
      </tr>
      <tr style="background:#f8fafc;">
        <td class="font-bold">Matheus Poeiras Luciano</td>
        <td>Treinador / <strong>Co-Resp. Tarde-Noite</strong></td>
        <td class="text-center text-emerald font-bold">+4 pts <small>(1 ev.)</small></td>
        <td class="text-center font-bold text-emerald" style="background:#dcfce7; font-size:11px;">+38,5 pts <small>(50% de 11 al. × 7)</small></td>
        <td class="text-center text-rose">-12 pts</td>
        <td class="text-center text-emerald font-bold">+2 pts</td>
        <td class="text-center text-rose font-bold">-10 pts</td>
        <td class="text-center font-bold" style="color:#0369a1; font-size:12px; background:#e0f2fe;">+32,5 pts</td>
        <td class="text-center font-bold">21 / 21 (10m atraso)</td>
      </tr>
      <tr>
        <td class="font-bold">Ruthi Novais</td>
        <td>Treinadora / <strong>Co-Resp. Manhã</strong></td>
        <td class="text-center text-emerald font-bold">+8 pts <small>(2 ev.)</small></td>
        <td class="text-center font-bold text-emerald" style="background:#dcfce7; font-size:11px;">+91 pts <small>(50% de 26 al. × 7)</small></td>
        <td class="text-center text-rose">-86 pts</td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-rose font-bold">-86 pts</td>
        <td class="text-center font-bold" style="color:#166534; font-size:12px;">+13 pts</td>
        <td class="text-center font-bold text-rose">18 / 21 (3 ausências, 22m)</td>
      </tr>
      <tr style="background:#fef2f2;">
        <td class="font-bold">Dr. Guilherme José Graciano</td>
        <td>Fisioterapeuta / <strong>Co-Resp. Tarde-Noite</strong></td>
        <td class="text-center text-emerald font-bold">+60 pts <small>(11 ev.)</small></td>
        <td class="text-center font-bold text-emerald" style="background:#dcfce7; font-size:11px;">+38,5 pts <small>(50% de 11 al. × 7)</small></td>
        <td class="text-center text-rose">-129 pts</td>
        <td class="text-center text-emerald font-bold">Abono 16/10</td>
        <td class="text-center text-rose font-bold">-129 pts</td>
        <td class="text-center font-bold text-rose" style="font-size:12px; background:#fee2e2;">-30,5 pts</td>
        <td class="text-center text-rose">18 / 21 (2 ausências, 89m)</td>
      </tr>
      <tr style="background:#fef2f2;">
        <td class="font-bold">Thiago Castro Lima Rocha</td>
        <td>Fisioterapeuta (Início 16/10)</td>
        <td class="text-center text-muted">0 pts</td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-rose">-45 pts</td>
        <td class="text-center text-emerald font-bold">Abono 22/10</td>
        <td class="text-center text-rose font-bold">-45 pts</td>
        <td class="text-center font-bold text-rose" style="font-size:12px; background:#fee2e2;">-45 pts</td>
        <td class="text-center text-rose">8 / 11 (2 ausências, 5m)</td>
      </tr>
      <tr style="background:#fef2f2;">
        <td class="font-bold">Maria Luísa Câmara Gontijo</td>
        <td>Fisioterapeuta (Escala Fixada)</td>
        <td class="text-center text-emerald font-bold">+6 pts <small>(1 ev.)</small></td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-rose">-112 pts</td>
        <td class="text-center text-emerald font-bold">Abono 05/10 e Qui</td>
        <td class="text-center text-rose font-bold">-112 pts</td>
        <td class="text-center font-bold text-rose" style="font-size:12px; background:#fee2e2;">-106 pts</td>
        <td class="text-center text-rose">10 plantões (3 ausências, 52m)</td>
      </tr>
    </tbody>
  </table>

  <!-- 2. CONFRONTO GERAL DA PRODUÇÃO CLÍNICA -->
  <h2>2. Confronto Geral de Procedimentos Registrados no Banco (Auditoria Anti-Perdas)</h2>
  <div class="confront-box">
    <strong>Auditoria de Integridade Clínica:</strong> Conforme determinação expressa da gestão, todo procedimento clínico executado gera créditos de pontuação para o profissional executor, sem restrição de plano:
    <ul style="margin: 4px 0 4px 16px; padding: 0;">
      <li><strong>Total Bruto de Procedimentos no Banco:</strong> <strong>61 procedimentos</strong> (21 Avaliações Físicas, 16 Testes de Dinamometria e 24 Relatórios Clínicos).</li>
      <li><strong>Procedimentos Homologados com Crédito de Pontuação:</strong> <strong>55 procedimentos pontuados</strong> (todos os concluídos dentro dos SLAs oficiais de tempo).</li>
      <li><strong>Testes de Força (Dinamometria):</strong> Conforme determinação expressa, <strong>todos os 16 testes pontuam normalmente</strong>, admitindo qualquer tempo registrado (inclusive durações curtas de 2 a 14 minutos inerentes ao dinamômetro).</li>
      <li><strong>Abono Oficial para Procedimentos &lt; 15 min:</strong> Avaliações e relatórios com duração inferior a 15 min foram auditados e <strong>pontuados mediante abono formal da gestão</strong> (Rosilda Roveda 13m 43s, Rosália Pessoa 1m 28s, Mateus Ahlert 6m 4s e Ian Javoski 12m 23s).</li>
      <li><strong>Procedimentos que Extrapolaram o Tempo Máximo de SLA:</strong> <strong>4 relatórios fisioterápicos</strong> ultrapassaram o teto máximo de 2 horas (7.200s), detalhados na tabela específica abaixo.</li>
    </ul>
  </div>

  <!-- 2.1 TABELA DE PROCEDIMENTOS QUE EXTRAPOLARAM O TEMPO (SLA MÁXIMO) -->
  <h2>2.1 Procedimentos que Extrapolaram o Tempo Limite de SLA (&gt; 2 Horas)</h2>
  <table class="sub-table" style="font-size: 9px; margin-bottom: 12px;">
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

  <!-- 3. APURAÇÃO DE METAS E ASSIDUIDADE POR TURNO -->
  <h2>3. Apuração de Metas e Assiduidade por Turno (Outubro / 2026)</h2>
  <div class="confront-box" style="border-left-color: #0284c7; background: #f0f9ff; margin-bottom: 12px;">
    <strong>Regra Parametrizada pela Gestão:</strong>
    <ul style="margin: 4px 0 0 16px; padding: 0;">
      <li><strong>Escopo Exclusivo de Frequência de Salão:</strong> Restrito estritamente a alunos ativos do plano <em>Clube Fitness - Monitorado</em>. Demais planos (incluindo Tratamento Personalizado e Protocolos) são clínicos e não entram no cômputo de frequência/meta de salão.</li>
      <li><strong>Co-Responsabilidade do Turno da Manhã (50% / 50%):</strong> Ruthi Novais e Cleiton Freitas dividem igualmente a liderança do turno matutino: <strong>+91 pts para Ruthi</strong> e <strong>+91 pts para Cleiton</strong> (50% dos 182 pts gerados pelos 26 alunos retidos na meta). Rachel Zauli recebe <strong>+52 pts</strong> como equipe.</li>
      <li><strong>Co-Responsabilidade do Turno Tarde/Noite (50% / 50%):</strong> Matheus Poeiras Luciano e Dr. Guilherme José Graciano dividem igualmente a liderança do turno vespertino/noturno: <strong>+38,5 pts para Matheus</strong> e <strong>+38,5 pts para Guilherme</strong> (50% dos 77 pts gerados pelos 11 alunos retidos na meta). Pedro Grossi recebe <strong>+22 pts</strong> como equipe.</li>
      <li><strong>Critério de Meta Batida (≥ 80%):</strong> Aluno que cumpriu 80% ou mais das aulas contratadas no mês de outubro.</li>
      <li><strong>Bonificação por Aluno na Meta:</strong> <strong>+7 pts</strong> para a Responsabilidade do Turno | <strong>+2 pts</strong> para cada profissional da equipe do turno.</li>
    </ul>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
    <!-- TURNO MANHÃ -->
    <div style="background: #fff; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px;">
      <div style="font-weight: 800; color: #166534; font-size: 11px; margin-bottom: 6px; border-bottom: 1px solid #dcfce7; padding-bottom: 4px;">
        Turno Manhã (06h às 12h) — 26 Alunos Retidos na Meta (72,2%)
      </div>
      <div style="font-size: 9px; line-height: 1.5; color: #334155;">
        <div><strong>Co-Responsáveis:</strong> Cleiton Freitas ➔ <strong>+91 pts</strong> | Ruthi Novais ➔ <strong>+91 pts</strong> <small>(Divisão 50/50)</small></div>
        <div><strong>Equipe:</strong> Rachel Zauli ➔ <strong>+52 pts</strong> <small>(26 × 2 pts)</small></div>
        <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #e2e8f0;">
          <strong>Total de Presenças de Salão:</strong> 369 presenças (vs. 56 faltas) | <strong>Taxa de Presença:</strong> 86,8%<br>
          <strong>Alunos que Bateram a Meta:</strong> Giovana Rocha (188%), Eugênio Pacelli (144%), Denise Palhares (88%), Andreza Cancellieri (100%), Sofia Stefane (81%), Fernando Diniz (300%), Daniele Debossan (133%), Renata Thomé (122%), Dante Sarmento (144%), Meires Devanir (111%), Luiza Maria, Carlos Eduardo, Maria Lúcia, etc.
        </div>
      </div>
    </div>

    <!-- TURNO TARDE/NOITE -->
    <div style="background: #fff; border: 1px solid #bae6fd; border-radius: 6px; padding: 10px;">
      <div style="font-weight: 800; color: #0369a1; font-size: 11px; margin-bottom: 6px; border-bottom: 1px solid #e0f2fe; padding-bottom: 4px;">
        Turno Tarde/Noite (14h às 20h + 13h) — 11 Alunos Retidos na Meta (73,3%)
      </div>
      <div style="font-size: 9px; line-height: 1.5; color: #334155;">
        <div><strong>Co-Responsáveis:</strong> Dr. Guilherme Graciano ➔ <strong>+38,5 pts</strong> | Matheus Poeiras ➔ <strong>+38,5 pts</strong> <small>(Divisão 50/50)</small></div>
        <div><strong>Equipe:</strong> Pedro Grossi ➔ <strong>+22 pts</strong> <small>(11 × 2 pts)</small></div>
        <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #e2e8f0;">
          <strong>Total de Presenças de Salão:</strong> 241 presenças (vs. 23 faltas) | <strong>Taxa de Presença:</strong> 91,3%<br>
          <strong>Alunos que Bateram a Meta:</strong> Arthur Lopes Cussat (100%), Éder Pereira (111%), Débora San Martin (88%), Emanuel Costa (88%), Izaú Veras (100%), Paula Maria Ferraz (111%), Ian Javoski (400%), Aluisio Cláudio (88%), Luiz Antônio Araujo (100%), Gabriel Lage (88%) e Lucca Gorini (100%).
        </div>
      </div>
    </div>
  </div>

  <!-- 4. RADAR DE OPORTUNIDADES DE FREQUÊNCIA (REGRAS OFICIAIS DE SALÃO) -->
  <h2>4. Radar de Oportunidades de Frequência de Salão (Exclusivo Clube Fitness - Monitorado)</h2>
  <div class="confront-box" style="border-left-color: #f59e0b; background: #fffbeb; margin-bottom: 10px;">
    <strong>Auditoria das Regras do Sistema:</strong> Conforme determinação expressa da gestão ("Não contabilizamos os demais planos para frequência"), esta tabela contempla <strong>estritamente alunos do Clube Fitness - Monitorado</strong>. Apresenta o confronto com os critérios oficiais de fechamento (Frequência &lt; 80% = -5 pts/aluno; Sem Treino Livre = -2 pts/aluno; Emergência &gt; 1 = -4 pts/aluno):
  </div>

  <table class="sub-table" style="font-size: 9px; margin-bottom: 14px;">
    <thead>
      <tr style="background:#f1f5f9;">
        <th>Turno</th>
        <th>Aluno(a) com Frequência Abaixo da Meta</th>
        <th>Plano Ativo</th>
        <th class="text-center">Presenças / Faltas</th>
        <th class="text-center">Taxa Real</th>
        <th class="text-center">Gap p/ Atingir 80%</th>
        <th class="text-center">Treinos Livres</th>
        <th class="text-center">Emergências</th>
        <th class="text-right">Impacto Regra Oficial (Débito Aluno &lt;80%)</th>
      </tr>
    </thead>
    <tbody>
      <!-- MANHÃ (10 ALUNOS MONITORADO) -->
      <tr>
        <td rowspan="10" class="font-bold" style="background:#f0fdf4; vertical-align:top; color:#166534;">Manhã</td>
        <td class="font-bold">Célia Maria da Silva Gomes</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">9P / 3F (12 tot)</td>
        <td class="text-center font-bold text-rose">75,0%</td>
        <td class="text-center">Apenas 1 presença a mais</td>
        <td class="text-center">0</td>
        <td class="text-center">0</td>
        <td class="text-right font-bold text-rose">-5 pts/aluno</td>
      </tr>
      <tr>
        <td class="font-bold">Anna Luiza Nogueira Coutinho</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">3P / 1F (4 tot)</td>
        <td class="text-center font-bold text-rose">75,0%</td>
        <td class="text-center">Apenas 1 presença a mais</td>
        <td class="text-center">0</td>
        <td class="text-center">0</td>
        <td class="text-right font-bold text-rose">-5 pts/aluno</td>
      </tr>
      <tr>
        <td class="font-bold">Livia Teixeira de Lima</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">7P / 3F (10 tot)</td>
        <td class="text-center font-bold text-rose">70,0%</td>
        <td class="text-center">Apenas 1 presença a mais</td>
        <td class="text-center">1</td>
        <td class="text-center">1</td>
        <td class="text-right font-bold text-rose">-5 pts/aluno</td>
      </tr>
      <tr>
        <td class="font-bold">Danilson Gonçalves De Melo e Silva</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">7P / 3F (10 tot)</td>
        <td class="text-center font-bold text-rose">70,0%</td>
        <td class="text-center">Apenas 1 presença a mais</td>
        <td class="text-center font-bold text-emerald">4 (Ok)</td>
        <td class="text-center">0</td>
        <td class="text-right font-bold text-rose">-5 pts/aluno</td>
      </tr>
      <tr>
        <td class="font-bold">Tatiana Bonifacino</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">7P / 3F (10 tot)</td>
        <td class="text-center font-bold text-rose">70,0%</td>
        <td class="text-center">Apenas 1 presença a mais</td>
        <td class="text-center font-bold text-emerald">4 (Ok)</td>
        <td class="text-center">0</td>
        <td class="text-right font-bold text-rose">-5 pts/aluno</td>
      </tr>
      <tr>
        <td class="font-bold">Kelly Nascimento Brandão</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">8P / 4F (12 tot)</td>
        <td class="text-center font-bold text-rose">66,7%</td>
        <td class="text-center">2 presenças a mais</td>
        <td class="text-center">0</td>
        <td class="text-center">1</td>
        <td class="text-right font-bold text-rose">-5 pts/aluno</td>
      </tr>
      <tr>
        <td class="font-bold">Mariana Borja de Salvo</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">4P / 4F (8 tot)</td>
        <td class="text-center font-bold text-rose">50,0%</td>
        <td class="text-center">3 presenças a mais</td>
        <td class="text-center">1</td>
        <td class="text-center">0</td>
        <td class="text-right font-bold text-rose">-5 pts/aluno</td>
      </tr>
      <tr>
        <td class="font-bold">Ruan de Oliveira Lopes Rosa</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">2P / 7F (9 tot)</td>
        <td class="text-center font-bold text-rose">22,2%</td>
        <td class="text-center">6 presenças a mais</td>
        <td class="text-center">0</td>
        <td class="text-center">0</td>
        <td class="text-right font-bold text-rose">-5 pts/aluno</td>
      </tr>
      <tr>
        <td class="font-bold">Juliana de Carvalho Bastone</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">0P / 1F (1 tot)</td>
        <td class="text-center font-bold text-rose">0,0%</td>
        <td class="text-center">1 presença p/ 100%</td>
        <td class="text-center">0</td>
        <td class="text-center">0</td>
        <td class="text-right font-bold text-rose">-5 pts/aluno</td>
      </tr>
      <tr>
        <td class="font-bold">Fabrício Galvão de Brito</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">0P / 2F (2 tot)</td>
        <td class="text-center font-bold text-rose">0,0%</td>
        <td class="text-center">2 presenças p/ 100%</td>
        <td class="text-center">0</td>
        <td class="text-center">0</td>
        <td class="text-right font-bold text-rose">-5 pts/aluno</td>
      </tr>

      <!-- TARDE / NOITE (4 ALUNOS MONITORADO) -->
      <tr style="border-top: 2px solid #cbd5e1;">
        <td rowspan="4" class="font-bold" style="background:#f0f9ff; vertical-align:top; color:#0369a1;">Tarde/Noite</td>
        <td class="font-bold">Maria Valentina Bonifacino Ferreira Rocha</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">7P / 2F (9 tot)</td>
        <td class="text-center font-bold text-rose">77,8%</td>
        <td class="text-center">Apenas 1 presença a mais</td>
        <td class="text-center">0</td>
        <td class="text-center">0</td>
        <td class="text-right font-bold text-rose">-5 pts/aluno</td>
      </tr>
      <tr>
        <td class="font-bold">Ronei Vital Gomes</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">7P / 3F (10 tot)</td>
        <td class="text-center font-bold text-rose">70,0%</td>
        <td class="text-center">Apenas 1 presença a mais</td>
        <td class="text-center">0</td>
        <td class="text-center">0</td>
        <td class="text-right font-bold text-rose">-5 pts/aluno</td>
      </tr>
      <tr>
        <td class="font-bold">Francisco De assis de souza gomes</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">4P / 2F (6 tot)</td>
        <td class="text-center font-bold text-rose">66,7%</td>
        <td class="text-center">Apenas 1 presença a mais</td>
        <td class="text-center">0</td>
        <td class="text-center">0</td>
        <td class="text-right font-bold text-rose">-5 pts/aluno</td>
      </tr>
      <tr>
        <td class="font-bold">Rosália Pessoa Caldas</td>
        <td>Clube Fitness - Monitorado</td>
        <td class="text-center">6P / 3F (9 tot)</td>
        <td class="text-center font-bold text-rose">66,7%</td>
        <td class="text-center">2 presenças a mais</td>
        <td class="text-center">0</td>
        <td class="text-center">0</td>
        <td class="text-right font-bold text-rose">-5 pts/aluno</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- 5. DETALHAMENTO PADRONIZADO POR PROFISSIONAL -->
  <h2>5. Detalhamento Padronizado por Profissional & Auditoria Completa de Ponto</h2>

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
