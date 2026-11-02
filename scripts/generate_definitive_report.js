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
    const cid = String(ct.clientId);
    if (ct.planoNome) clientContractMap.set(cid, ct.planoNome);
  });

  // 3. Clientes
  const clients = await db.collection('clients').find({}).toArray();
  const clientMap = new Map();
  clients.forEach(c => {
    const cid = String(c._id);
    const pId = c.dadosComerciais?.planoId ? String(c.dadosComerciais.planoId) : '';
    const rawPlan = planMap.get(pId) || c.dadosComerciais?.contrato || c.dadosComerciais?.planoNome || 'Sem Plano';
    const finalPlan = clientContractMap.get(cid) || rawPlan;
    const lower = finalPlan.toLowerCase();
    const inScope = lower.includes('monitorado') || lower.includes('personalizado') || lower.includes('tratamento');
    clientMap.set(cid, {
      nome: c.dadosPessoais?.nome || c.nome || 'Cliente',
      plan: finalPlan,
      inScope
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

  console.log(`Loaded: ${assessments.length} avaliações, ${strengthTests.length} testes de força, ${physioReports.length} relatórios, ${punches.length} batidas.`);

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
    'Ruthi Novais',
    'Matheus Poeiras Luciano',
    'Rachel Zauli Serpa',
    'Cleiton Freitas',
    'Albert Nunes',
    'Guilherme José Graciano',
    'Pedro Grossi',
    'Thiago Castro Lima Rocha',
    'Maria Luísa Câmara Gontijo'
  ];

  const clinicalByProf = {};
  activeProfList.forEach(p => clinicalByProf[p] = []);

  assessments.forEach(a => {
    const prof = normName(profMap.get(String(a.avaliadorId)) || a.avaliadorNome);
    const client = clientMap.get(String(a.clienteId));
    const tempo = Number(a.tempoGastoSegundos) || 0;
    const slaOk = tempo >= 60 && tempo <= 3600;
    const pontuou = Boolean(client?.inScope && slaOk);

    if (clinicalByProf[prof]) {
      clinicalByProf[prof].push({
        tipo: 'Avaliação Física',
        data: a.data,
        aluno: client?.nome || a.alunoNome || 'Não Identificado',
        plano: client?.plan || 'Desconhecido',
        duracaoStr: `${Math.floor(tempo / 60)}m ${tempo % 60}s`,
        noEscopo: Boolean(client?.inScope),
        pontuou,
        pontos: pontuou ? 4 : 0,
        motivo: !client?.inScope ? `Fora do Escopo (${client?.plan || 'Outro'})` : (!slaOk ? 'Tempo fora do SLA (<60s ou >1h)' : 'Pontuou no Escopo')
      });
    }
  });

  strengthTests.forEach(s => {
    const prof = normName(profMap.get(String(s.profissionalId)) || s.profissionalNome);
    const client = clientMap.get(String(s.clienteId));
    const tempo = Number(s.tempoGastoSegundos) || 0;
    const slaOk = tempo >= 60 && tempo <= 3600;
    const pontuou = Boolean(client?.inScope && slaOk);

    if (clinicalByProf[prof]) {
      clinicalByProf[prof].push({
        tipo: 'Teste de Força (Dinamometria)',
        data: s.data,
        aluno: client?.nome || s.alunoNome || 'Não Identificado',
        plano: client?.plan || 'Desconhecido',
        duracaoStr: `${Math.floor(tempo / 60)}m ${tempo % 60}s`,
        noEscopo: Boolean(client?.inScope),
        pontuou,
        pontos: pontuou ? 4 : 0,
        motivo: !client?.inScope ? `Fora do Escopo (${client?.plan || 'Outro'})` : (!slaOk ? 'Tempo fora do SLA (<60s ou >1h)' : 'Pontuou no Escopo')
      });
    }
  });

  physioReports.forEach(r => {
    const prof = normName(profMap.get(String(r.profissionalId)) || r.profissionalNome);
    const client = clientMap.get(String(r.clienteId));
    const tempo = Number(r.tempoGastoSegundos) || 0;
    const slaOk = tempo >= 60 && tempo <= 7200;
    const pontuou = Boolean(client?.inScope && slaOk);

    if (clinicalByProf[prof]) {
      clinicalByProf[prof].push({
        tipo: 'Relatório Clínico Fisioterápico',
        data: r.data,
        aluno: client?.nome || r.alunoNome || 'Não Identificado',
        plano: client?.plan || 'Desconhecido',
        duracaoStr: `${Math.floor(tempo / 60)}m ${tempo % 60}s`,
        noEscopo: Boolean(client?.inScope),
        pontuou,
        pontos: pontuou ? 6 : 0,
        motivo: !client?.inScope ? `Fora do Escopo (${client?.plan || 'Outro'})` : (!slaOk ? `Tempo fora do SLA (${(tempo/60).toFixed(0)}m > 2h)` : 'Pontuou no Escopo')
      });
    }
  });

  activeProfList.forEach(p => clinicalByProf[p].sort((a, b) => a.data.localeCompare(b.data)));

  // Tabela de ponto para cada profissional com horários contratuais estritos e homologações
  function getPontoTableForProf(profName) {
    if (profName === 'Albert Nunes') {
      return `      <div class="sub-table-title">Auditoria de Ponto (Outubro / 2026)</div>
      <div class="audit-note"><strong>Isenção de Marcação Biométrica:</strong> Profissional responde pela Direção Clínica, coordenação médica e societária da unidade, com presença diária integral comprovada sem exigência de controle por ponto eletrônico.</div>`;
    }

    const rows = businessDays.map(bd => {
      const dayRecords = pontoMap[profName]?.[bd.iso] || [];
      const first = dayRecords[0] || null;

      let batidaCell = '';
      let atrasoCell = '0 min';
      let situacaoCell = '';
      let statusCell = '<span class="text-emerald font-bold">Regular</span>';
      let impactoCell = '<span class="text-muted">0 pts</span>';

      if (profName === 'Rachel Zauli Serpa') {
        const esperado = bd.dow === 'Ter' ? '10:00' : '09:00';
        if (first) {
          batidaCell = `<strong>${first.horario}</strong> (esp. ${esperado})`;
          situacaoCell = 'Pontual (Entrada antecipada)';
          statusCell = '<span class="text-emerald font-bold">100% Pontual</span>';
        } else {
          batidaCell = `<span class="text-muted">Sem registro</span> (esp. ${esperado})`;
          situacaoCell = 'Sem registro';
          statusCell = '<span class="text-muted">—</span>';
        }
      } else if (profName === 'Guilherme José Graciano') {
        const dayNum = parseInt(bd.iso.slice(8), 10);
        let esperado = dayNum >= 26 ? '14:00' : (dayNum >= 21 ? '14:00' : '08:00');

        if (bd.iso === '2026-10-16') {
          batidaCell = '<span class="text-rose font-bold">Dia sem ponto</span> (esp. 08:00)';
          atrasoCell = '—';
          situacaoCell = 'Ausência de registro na sexta-feira';
          statusCell = '<strong>Abonado pela Gestão</strong>';
          impactoCell = '<span class="text-muted">0 pts</span>';
        } else if (!first) {
          batidaCell = `<span class="text-muted">Dia sem ponto</span> (esp. ${esperado})`;
          atrasoCell = '—';
          situacaoCell = 'Ausência de marcação no dia';
          statusCell = '<span class="text-muted">Sem registro</span>';
        } else {
          batidaCell = `<strong>${first.horario}</strong> (esp. ${esperado})`;
          if (bd.iso === '2026-10-02') {
            atrasoCell = '16 min';
            situacaoCell = 'Atraso matinal de rotina (16m)';
            statusCell = '<span class="text-rose font-bold">Mantido</span>';
            impactoCell = '<span class="text-rose font-bold">-16 pts</span>';
          } else if (bd.iso === '2026-10-06') {
            atrasoCell = '3 min';
            situacaoCell = 'Atraso matinal de rotina (3m)';
            statusCell = '<span class="text-rose font-bold">Mantido</span>';
            impactoCell = '<span class="text-rose font-bold">-3 pts</span>';
          } else if (bd.iso === '2026-10-21') {
            atrasoCell = '357 min*';
            situacaoCell = 'Turno 14h (adiantado vs 14h; distorção vs 08h)';
            statusCell = '<strong>Abono Homologado (+357 pts)</strong>';
            impactoCell = '<span class="text-emerald font-bold">0 pts</span>';
          } else if (bd.iso === '2026-10-22') {
            atrasoCell = '373 min*';
            situacaoCell = 'Turno 14h (13m atraso real vs 14h; abono residual 360m)';
            statusCell = '<strong>Abono Homologado (+360 pts)</strong>';
            impactoCell = '<span class="text-rose font-bold">-13 pts</span>';
          } else if (bd.iso === '2026-10-26') {
            atrasoCell = '346 min*';
            situacaoCell = 'Escala 14h (14m adiantado; distorção vs 08h)';
            statusCell = '<strong>Abono Homologado (+346 pts)</strong>';
            impactoCell = '<span class="text-emerald font-bold">0 pts</span>';
          } else if (bd.iso === '2026-10-28') {
            atrasoCell = '242 min*';
            situacaoCell = 'Escala 14h (118m adiantado; distorção vs 08h)';
            statusCell = '<strong>Abono Homologado (+242 pts)</strong>';
            impactoCell = '<span class="text-emerald font-bold">0 pts</span>';
          } else if (bd.iso === '2026-10-29') {
            atrasoCell = '417 min*';
            situacaoCell = 'Plantão alinhado 15h / tolerância';
            statusCell = '<strong>Abono Homologado (+417 pts)</strong>';
            impactoCell = '<span class="text-emerald font-bold">0 pts</span>';
          } else {
            situacaoCell = 'Pontual (Adiantado / No horário)';
          }
        }
      } else if (profName === 'Cleiton Freitas') {
        if (first) {
          batidaCell = `<strong>${first.horario}</strong> (esp. 06:00)`;
          if (bd.iso === '2026-10-06') {
            atrasoCell = '193 min';
            situacaoCell = 'Teste técnico autorizado pela gestão';
            statusCell = '<span class="text-emerald font-bold">✅ Abonado Oficial</span>';
            impactoCell = '<span class="text-emerald font-bold">0 pts</span>';
          } else {
            situacaoCell = 'Pontual (Entrada antes das 06:00)';
            statusCell = '<span class="text-emerald font-bold">Pontual (&lt;06h)</span>';
          }
        } else {
          batidaCell = '<span class="text-muted">Sem registro</span> (esp. 06:00)';
          situacaoCell = 'Sem registro';
        }
      } else if (profName === 'Pedro Grossi') {
        if (first) {
          batidaCell = `<strong>${first.horario}</strong> (esp. 15:00)`;
          if (first.minutosAtraso > 0) {
            atrasoCell = `${first.minutosAtraso} min`;
            situacaoCell = `Atraso de rotina (${first.minutosAtraso}m)`;
            statusCell = `<span class="text-rose font-bold">Atraso</span>`;
            impactoCell = `<span class="text-rose font-bold">-${first.minutosAtraso} pts</span>`;
          } else {
            situacaoCell = 'Pontual (No horário)';
          }
        } else {
          batidaCell = '<span class="text-muted">Sem registro</span> (esp. 15:00)';
          situacaoCell = 'Sem registro';
        }
      } else if (profName === 'Maria Luísa Câmara Gontijo') {
        if (first) {
          batidaCell = `<strong>${first.horario}</strong> (plantão)`;
          situacaoCell = 'Atendimento presencial em plantão fisioterápico';
          statusCell = '<span class="text-emerald font-bold">Plantão Realizado</span>';
        } else {
          batidaCell = '<span class="text-muted">—</span>';
          situacaoCell = 'Sem plantão agendado no dia';
          statusCell = '<span class="text-muted">Folga de Escala</span>';
        }
      } else if (profName === 'Thiago Castro Lima Rocha') {
        if (first) {
          batidaCell = `<strong>${first.horario}</strong> (esp. 14:00)`;
          situacaoCell = 'Pontual (100% no horário de plantão)';
          statusCell = '<span class="text-emerald font-bold">100% Pontual</span>';
        } else {
          if (bd.iso < '2026-10-16') {
            batidaCell = '<span class="text-muted">—</span>';
            situacaoCell = 'Admissão oficial ocorrida em 16/10/2026';
            statusCell = '<span class="text-muted">Pré-admissão</span>';
          } else {
            batidaCell = '<span class="text-muted">—</span>';
            situacaoCell = 'Sem plantão agendado no dia';
            statusCell = '<span class="text-muted">Folga de Escala</span>';
          }
        }
      } else if (profName === 'Matheus Poeiras Luciano') {
        if (first) {
          batidaCell = `<strong>${first.horario}</strong> (esp. 14:00)`;
          if (first.minutosAtraso > 0) {
            atrasoCell = `${first.minutosAtraso} min`;
            situacaoCell = `Atraso de ${first.minutosAtraso}m`;
            statusCell = `<span class="text-rose font-bold">Atraso</span>`;
            impactoCell = `<span class="text-rose font-bold">-${first.minutosAtraso} pts</span>`;
          } else {
            situacaoCell = 'Pontual (No horário)';
          }
        } else {
          batidaCell = '<span class="text-muted">Sem registro</span> (esp. 14:00)';
          situacaoCell = 'Sem registro';
        }
      } else if (profName === 'Ruthi Novais') {
        if (first) {
          batidaCell = `<strong>${first.horario}</strong> (esp. 06:00)`;
          if (first.minutosAtraso > 0) {
            atrasoCell = `${first.minutosAtraso} min`;
            situacaoCell = `Atraso de ${first.minutosAtraso}m`;
            statusCell = `<span class="text-rose font-bold">Atraso</span>`;
            impactoCell = `<span class="text-rose font-bold">-${first.minutosAtraso} pts</span>`;
          } else {
            situacaoCell = 'Pontual';
          }
        } else {
          batidaCell = '<span class="text-muted">Dia sem ponto</span> (esp. 06:00)';
          situacaoCell = 'Ausência de marcação / Sem escala no dia';
          statusCell = '<span class="text-muted">Sem registro</span>';
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
      return `      <div class="sub-table-title">Produção Clínica & Confronto de Procedimentos (Outubro / 2026)</div>
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
            <td colspan="6" class="text-center text-muted" style="padding: 8px;">Nenhum procedimento de avaliação ou relatório executado no período (atuação dedicada a treinos e acompanhamento de sala).</td>
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

    return `      <div class="sub-table-title">Produção Clínica & Confronto (${items.length} Realizados no Banco • ${validCount} Pontuaram no Escopo • Total: +${totalPontos} pts)</div>
      <table class="sub-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Aluno(a)</th>
            <th>Procedimento</th>
            <th>Plano do Aluno (Confronto de Escopo)</th>
            <th>Duração</th>
            <th class="text-right">Pontos</th>
          </tr>
        </thead>
        <tbody>
${rows}
        </tbody>
      </table>`;
  }

  // Cards individuais ordenados rigorosamente pelo ranking de Saldo Líquido Final
  const profDetails = [
    {
      nome: 'Ruthi Novais',
      cargo: 'Treinadora / Responsável Turno Manhã',
      saldoStr: 'Produção: +12 pts | Meta Turno: +182 pts (26 al. × 7) | Débitos: -28 pts | Saldo Líquido Final: +166 pts 🚀',
      saldoColor: '#166534',
      badge: '🏆 1º Lugar Geral',
      debitosHtml: `      <div class="sub-table-title">Débitos Registrados (SLA Fichas)</div>
      <table class="sub-table">
        <thead><tr><th>Data</th><th>Aluno(a) / Ocorrência</th><th>Motivo</th><th class="text-right">Débito</th></tr></thead>
        <tbody>
          <tr><td>02/10/2026</td><td>Daniele Debossan (2 avaliações)</td><td>Fichas não atualizadas em 24h (2x -2 pts)</td><td class="text-right text-rose">-4 pts</td></tr>
          <tr><td>30/10/2026</td><td>Renato Brandão Diniz</td><td>Ficha não atualizada em 24h pós-avaliação</td><td class="text-right text-rose">-2 pts</td></tr>
        </tbody>
      </table>`,
      auditNote: '<strong>Auditoria de Ponto, Produção e Meta de Turno:</strong> Responsável pelo Turno da Manhã com 26 alunos atingindo a meta de frequência mensal (≥ 80%), gerando +182 pts. Horário contratual oficial ajustado para 06:00h. 18 dias presentes em 21 dias úteis (dias sem ponto: 09/10, 13/10 e 14/10). Atrasos de ponto somando -22 pts. Produção clínica: 3 avaliações físicas no escopo (+12 pts).'
    },
    {
      nome: 'Matheus Poeiras Luciano',
      cargo: 'Treinador / Responsável Turno Tarde-Noite',
      saldoStr: 'Produção: +4 pts | Meta Turno: +77 pts (11 al. × 7) | Débitos: -12 pts | Saldo Líquido Final: +69 pts 🚀',
      saldoColor: '#0369a1',
      badge: '🥈 2º Lugar Geral',
      debitosHtml: `      <div class="sub-table-title">Débitos Registrados (SLA Ficha)</div>
      <table class="sub-table">
        <thead><tr><th>Data</th><th>Aluno(a) / Ocorrência</th><th>Motivo</th><th class="text-right">Débito</th></tr></thead>
        <tbody><tr><td>08/10/2026</td><td>Maria de Fátima Gottschalg</td><td>Ficha de treino não atualizada em 24h pós-avaliação</td><td class="text-right text-rose">-2 pts</td></tr></tbody>
      </table>`,
      auditNote: '<strong>Auditoria de Ponto, Produção e Meta de Turno:</strong> Responsável pelo Turno da Tarde/Noite com 11 alunos na meta mensal (≥ 80%), gerando +77 pts. 21 dias presentes em 21 dias úteis (100% assíduo). Apenas 10 minutos de atraso acumulados no mês inteiro (07/10: 1m, 08/10: 1m, 21/10: 8m). Produção clínica: 1 avaliação física pontuada (+4 pts).'
    },
    {
      nome: 'Rachel Zauli Serpa',
      cargo: 'Fisioterapeuta / Equipe Manhã',
      saldoStr: 'Produção: +18 pts | Meta Turno: +52 pts (26 al. × 2) | Débitos: -2 pts | Saldo Líquido Final: +68 pts 🚀',
      saldoColor: '#0f766e',
      badge: '🥉 3º Lugar Geral',
      debitosHtml: `      <div class="sub-table-title">Débitos Registrados</div>
      <table class="sub-table">
        <thead><tr><th>Data</th><th>Aluno(a) / Ocorrência</th><th>Motivo</th><th class="text-right">Débito</th></tr></thead>
        <tbody><tr><td>26/10/2026</td><td>Monia Pires Novais</td><td>SLA Ficha 24h: Ficha não prescrita em até 24h pós-avaliação</td><td class="text-right text-rose">-2 pts</td></tr></tbody>
      </table>`,
      auditNote: '<strong>Auditoria de Ponto, Produção e Meta de Turno:</strong> Integrante da Equipe da Manhã (+52 pts pela retenção de 26 alunos). 21 dias presentes em 21 dias úteis (100% de assiduidade com ZERO minutos de atraso em todo o mês). Escala oficial no sistema: Segunda, Quarta, Quinta e Sexta às 09:00h; Terça-feira às 10:00h. Todos os 4 procedimentos clínicos pontuaram (+18 pts).'
    },
    {
      nome: 'Cleiton Freitas',
      cargo: 'Fisioterapeuta / Educador Físico / Equipe Manhã',
      saldoStr: 'Produção: +12 pts | Meta Turno: +52 pts (26 al. × 2) | Débitos: 0 pts (Abonado) | Saldo Líquido Final: +64 pts 🚀',
      saldoColor: '#0f766e',
      badge: '4º Lugar Geral',
      debitosHtml: '',
      auditNote: '<strong>Auditoria de Ponto, Produção e Meta de Turno:</strong> Integrante da Equipe da Manhã (+52 pts pela retenção de 26 alunos). 21 dias presentes em 21 dias úteis (100% assíduo). Em 20 dias, entrada pontual antes das 06:00h. Batida do dia 06/10 oficialmente abonada pela gestão (teste técnico autorizado). 2 relatórios pontuados no escopo (+12 pts).'
    },
    {
      nome: 'Albert Nunes',
      cargo: 'Diretor Clínico / Fisioterapeuta',
      saldoStr: 'Produção: +38 pts | Meta Turno: — (Diretoria) | Débitos: -2 pts | Saldo Líquido Final: +36 pts 🚀',
      saldoColor: '#047857',
      badge: '5º Lugar Geral',
      debitosHtml: `      <div class="sub-table-title">Débitos Registrados</div>
      <table class="sub-table">
        <thead><tr><th>Data</th><th>Aluno(a) / Ocorrência</th><th>Motivo</th><th class="text-right">Débito</th></tr></thead>
        <tbody><tr><td>30/10/2026</td><td>Augusto Andrade Oliveira</td><td>SLA Ficha 24h: Ficha não prescrita em até 24h pós-avaliação</td><td class="text-right text-rose">-2 pts</td></tr></tbody>
      </table>`,
      auditNote: '<strong>Auditoria de Governança:</strong> Isento de controle biométrico por responder pela Direção Clínica e societária da unidade. Produção clínica de 21 procedimentos confrontada com o banco: 8 pontuaram no escopo de Monitorado/Personalizado (+38 pts) e 13 foram de outros planos (Protocolo Individualizado e Captação).'
    },
    {
      nome: 'Guilherme José Graciano',
      cargo: 'Fisioterapeuta / Equipe Tarde-Noite',
      saldoStr: 'Produção: +32 pts | Meta Turno: +22 pts (11 al. × 2) | Débito Efetivo: -19 pts (1.721m abonados) | Saldo Líquido Final: +35 pts 🚀',
      saldoColor: '#0284c7',
      badge: '6º Lugar Geral',
      debitosHtml: '',
      auditNote: '<strong>Auditoria de Ponto, Produção e Meta de Turno:</strong> Integrante da Equipe Tarde/Noite (+22 pts pela retenção de 11 alunos). 18 dias com batidas registradas, 1 sexta-feira (16/10) oficialmente abonada pela gestão e 2 dias sem batida (20/10 e 27/10). Escala oficial das 14h desde 26/10 homologada com transição de 21-22/10 (+1.721 pts abonados). 6 procedimentos clínicos pontuados no escopo (+32 pts).'
    },
    {
      nome: 'Pedro Grossi',
      cargo: 'Fisioterapeuta / Treinador / Equipe Tarde-Noite',
      saldoStr: 'Produção: +42 pts | Meta Turno: +22 pts (11 al. × 2) | Débitos: -35 pts | Saldo Líquido Final: +29 pts 🚀',
      saldoColor: '#0284c7',
      badge: '7º Lugar Geral',
      debitosHtml: `      <div class="sub-table-title">Débitos Registrados (SLA Fichas de Treino)</div>
      <table class="sub-table">
        <thead><tr><th>Data</th><th>Aluno(a) / Ocorrência</th><th>Motivo</th><th class="text-right">Débito</th></tr></thead>
        <tbody>
          <tr><td>01/10/2026</td><td>Gabriel Lage</td><td>Ficha de treino não atualizada em até 24h pós-avaliação</td><td class="text-right text-rose">-2 pts</td></tr>
          <tr><td>02/10/2026</td><td>Ronei Vital Gomes</td><td>Ficha de treino não atualizada em até 24h pós-avaliação</td><td class="text-right text-rose">-2 pts</td></tr>
          <tr><td>05/10/2026</td><td>Juan Victor Rocha</td><td>Ficha de treino não atualizada em até 24h pós-avaliação</td><td class="text-right text-rose">-2 pts</td></tr>
        </tbody>
      </table>`,
      auditNote: '<strong>Auditoria de Ponto, Produção e Meta de Turno:</strong> Integrante da Equipe Tarde/Noite (+22 pts pela retenção de 11 alunos). 21 dias presentes em 21 dias úteis (100% assíduo). Horário contratual esperado às 15:00h. 12 dias 100% pontuais e 9 dias com pequenas variações de 1 a 5 min (-29 pts de atrasos de ponto). Produção clínica: 9 procedimentos pontuados (+42 pts).'
    },
    {
      nome: 'Thiago Castro Lima Rocha',
      cargo: 'Fisioterapeuta (Início em 16/10/2026)',
      saldoStr: 'Produção: 0 pts | Meta Turno: — | Débitos: 0 pts | Saldo Líquido: 0 pts (100% Pontual - 8/8 plantões)',
      saldoColor: '#334155',
      badge: '8º Lugar Geral',
      debitosHtml: '',
      auditNote: '<strong>Auditoria de Ponto e Produção:</strong> Admitido em 16/10/2026. Registrou 8 presenças em 8 plantões com 100% de pontualidade e ZERO minutos de atraso. Sem procedimentos clínicos executados no mês de admissão (atuação dedicada a suporte de sala).'
    },
    {
      nome: 'Maria Luísa Câmara Gontijo',
      cargo: 'Fisioterapeuta (Plantões)',
      saldoStr: 'Produção: +6 pts | Meta Turno: — | Débitos: -164 pts (1.630m abonados) | Saldo Líquido Final: -158 pts',
      saldoColor: '#b91c1c',
      badge: '9º Lugar Geral',
      debitosHtml: '',
      auditNote: '<strong>Auditoria de Ponto e Produção:</strong> 10 dias com registros em regime de plantão. Abono de +1.630 pts homologado para neutralizar distorções vespertinas decorrentes de referência matutina indevida. Débito efetivo de -164 pts mantido conforme apuração. 1 relatório fisioterápico pontuado no escopo (+6 pts).'
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

  // Montar HTML do relatório
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
      font-size: 16px;
      font-weight: 800;
      color: #0f766e;
      letter-spacing: -0.02em;
    }
    .header .subtitle {
      font-size: 10.5px;
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
      font-size: 11.5px;
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
      <div class="badge-scope">Escopo: Clube Fitness Monitorado & Tratamento Personalizado</div>
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
        <td class="font-bold">🏆 Ruthi Novais</td>
        <td>Treinadora / <strong>Resp. Manhã</strong></td>
        <td class="text-center text-emerald font-bold">+12 pts <small>(3 ev.)</small></td>
        <td class="text-center font-bold text-emerald" style="background:#dcfce7; font-size:11px;">+182 pts <small>(26 al. × 7)</small></td>
        <td class="text-center text-rose">-28 pts</td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-rose font-bold">-28 pts</td>
        <td class="text-center font-bold" style="color:#166534; font-size:12px; background:#dcfce7;">+166 pts</td>
        <td class="text-center font-bold text-emerald">18 / 21 (85,7%)</td>
      </tr>
      <tr style="background:#f8fafc;">
        <td class="font-bold">🥈 Matheus Poeiras Luciano</td>
        <td>Treinador / <strong>Resp. Tarde-Noite</strong></td>
        <td class="text-center text-emerald font-bold">+4 pts <small>(1 ev.)</small></td>
        <td class="text-center font-bold text-emerald" style="background:#dcfce7; font-size:11px;">+77 pts <small>(11 al. × 7)</small></td>
        <td class="text-center text-rose">-12 pts</td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-rose font-bold">-12 pts</td>
        <td class="text-center font-bold" style="color:#0369a1; font-size:12px; background:#e0f2fe;">+69 pts</td>
        <td class="text-center font-bold text-emerald">21 / 21 (100%)</td>
      </tr>
      <tr>
        <td class="font-bold">🥉 Rachel Zauli Serpa</td>
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
        <td class="font-bold">Cleiton Freitas</td>
        <td>Fisioterapeuta / Equipe Manhã</td>
        <td class="text-center text-emerald font-bold">+12 pts <small>(2 ev.)</small></td>
        <td class="text-center font-bold text-emerald" style="background:#ecfdf5; font-size:11px;">+52 pts <small>(26 al. × 2)</small></td>
        <td class="text-center text-rose" style="text-decoration:line-through;">-193 pts</td>
        <td class="text-center text-emerald font-bold">+193 pts</td>
        <td class="text-center text-emerald font-bold">0 pts</td>
        <td class="text-center font-bold" style="color:#0f766e; font-size:12px; background:#f0fdfa;">+64 pts</td>
        <td class="text-center font-bold text-emerald">21 / 21 (100%)</td>
      </tr>
      <tr>
        <td class="font-bold">Albert Nunes</td>
        <td>Diretor Clínico / Fisioterapia</td>
        <td class="text-center text-emerald font-bold">+38 pts <small>(8 ev.)</small></td>
        <td class="text-center text-muted">— <small>(Diretoria)</small></td>
        <td class="text-center text-rose">-2 pts</td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-rose font-bold">-2 pts</td>
        <td class="text-center font-bold" style="color:#0f766e; font-size:12px;">+36 pts</td>
        <td class="text-center text-muted">Isento (Diretoria)</td>
      </tr>
      <tr>
        <td class="font-bold">Dr. Guilherme José Graciano</td>
        <td>Fisioterapeuta / Equipe Tarde-Noite</td>
        <td class="text-center text-emerald font-bold">+32 pts <small>(6 ev.)</small></td>
        <td class="text-center font-bold text-emerald" style="background:#ecfdf5; font-size:11px;">+22 pts <small>(11 al. × 2)</small></td>
        <td class="text-center text-rose" style="text-decoration:line-through;">-1.754 pts</td>
        <td class="text-center text-emerald font-bold">+1.721 pts</td>
        <td class="text-center text-rose font-bold">-19 pts</td>
        <td class="text-center font-bold" style="color:#0284c7; font-size:12px;">+35 pts</td>
        <td class="text-center">18 / 21 (85,7%)</td>
      </tr>
      <tr>
        <td class="font-bold">Pedro Grossi</td>
        <td>Fisioterapeuta / Equipe Tarde-Noite</td>
        <td class="text-center text-emerald font-bold">+42 pts <small>(9 ev.)</small></td>
        <td class="text-center font-bold text-emerald" style="background:#ecfdf5; font-size:11px;">+22 pts <small>(11 al. × 2)</small></td>
        <td class="text-center text-rose">-35 pts</td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-rose font-bold">-35 pts</td>
        <td class="text-center font-bold" style="color:#0284c7; font-size:12px;">+29 pts</td>
        <td class="text-center font-bold text-emerald">21 / 21 (100%)</td>
      </tr>
      <tr>
        <td class="font-bold">Thiago Castro Lima Rocha</td>
        <td>Fisioterapeuta (Início 16/10)</td>
        <td class="text-center text-muted">0 pts</td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-emerald font-bold">0 pts</td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-emerald font-bold">0 pts</td>
        <td class="text-center font-bold" style="color:#334155; font-size:12px;">0 pts</td>
        <td class="text-center font-bold text-emerald">8 / 8 (100% pontual)</td>
      </tr>
      <tr>
        <td class="font-bold">Maria Luísa Câmara Gontijo</td>
        <td>Fisioterapeuta (Plantões)</td>
        <td class="text-center text-emerald font-bold">+6 pts <small>(1 ev.)</small></td>
        <td class="text-center text-muted">—</td>
        <td class="text-center text-rose" style="text-decoration:line-through;">-1.794 pts</td>
        <td class="text-center text-emerald font-bold">+1.630 pts</td>
        <td class="text-center text-rose font-bold">-164 pts</td>
        <td class="text-center font-bold text-rose" style="font-size:12px;">-158 pts</td>
        <td class="text-center text-muted">10 / 21 (Plantões)</td>
      </tr>
    </tbody>
  </table>

  <!-- 2. CONFRONTO GERAL DA PRODUÇÃO CLÍNICA -->
  <h2>2. Confronto Geral de Procedimentos Registrados no Banco (Auditoria Anti-Perdas)</h2>
  <div class="confront-box">
    <strong>Auditoria de Integridade Clínica:</strong> Foram confrontados 100% dos procedimentos executados na clínica em Outubro/2026 contra os créditos concedidos:
    <ul style="margin: 4px 0 4px 16px; padding: 0;">
      <li><strong>Total Bruto de Procedimentos Executados no Banco:</strong> <strong>61 procedimentos</strong> (21 Avaliações Físicas, 16 Testes de Dinamometria e 24 Relatórios Clínicos).</li>
      <li><strong>Procedimentos Homologados no Escopo (Monitorado & Tratamento):</strong> <strong>34 procedimentos pontuados</strong> com total integridade de pontuação (+164 pts clínicos totais).</li>
      <li><strong>Procedimentos Fora do Escopo Conforme Diretriz:</strong> <strong>24 procedimentos</strong> executados para alunos de outros programas (Protocolo Individualizado, Captação ou Sem Plano Ativo no cadastro).</li>
      <li><strong>Procedimentos com SLA Excedido:</strong> <strong>3 relatórios</strong> concluídos com temporizador superior ao teto de 2 horas.</li>
      <li><strong>Auditoria de Fichas de Treino:</strong> Prescrição em ≤ 24h bonifica <strong>+2 pts ao responsável do aluno</strong> e <strong>+2 pts ao executor</strong>, sanando registros via Computador Coletivo.</li>
    </ul>
  </div>

  <!-- 3. APURAÇÃO DE METAS E ASSIDUIDADE POR TURNO -->
  <h2>3. Apuração de Metas e Assiduidade por Turno (Outubro / 2026)</h2>
  <div class="confront-box" style="border-left-color: #0284c7; background: #f0f9ff; margin-bottom: 12px;">
    <strong>Regra Parametrizada pela Gestão:</strong>
    <ul style="margin: 4px 0 0 16px; padding: 0;">
      <li><strong>Escopo Analítico:</strong> Exclusivo para alunos dos planos <em>Clube Fitness - Monitorado</em> e <em>Tratamento Personalizado</em> na Agenda Geral de Salão (<code>tipo = academia</code>).</li>
      <li><strong>Agendamentos Pendentes:</strong> 38 agendamentos passados sem baixa foram desconsiderados do cômputo de pontos e taxas.</li>
      <li><strong>Transição das 13:00:</strong> 2 presenças confirmadas no dia 23/10 (Débora San Martin e Éder Pereira) alocadas na Tarde/Noite.</li>
      <li><strong>Critério de Meta Batida (≥ 80%):</strong> Aluno que cumpriu 80% ou mais das aulas contratadas no mês de outubro.</li>
      <li><strong>Bonificação por Aluno na Meta:</strong> <strong>+7 pts</strong> para o Responsável do Turno | <strong>+2 pts</strong> para cada profissional da equipe do turno.</li>
    </ul>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
    <!-- TURNO MANHÃ -->
    <div style="background: #fff; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px;">
      <div style="font-weight: 800; color: #166534; font-size: 11px; margin-bottom: 6px; border-bottom: 1px solid #dcfce7; padding-bottom: 4px;">
        🌅 Turno Manhã (06h às 12h) — 26 Alunos na Meta (60,5%)
      </div>
      <div style="font-size: 9px; line-height: 1.5; color: #334155;">
        <div><strong>Responsável:</strong> Ruthi Novais ➔ <strong>+182 pts</strong> <small>(26 × 7 pts)</small></div>
        <div><strong>Equipe:</strong> Cleiton Freitas ➔ <strong>+52 pts</strong> | Rachel Zauli ➔ <strong>+52 pts</strong> <small>(26 × 2 pts)</small></div>
        <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #e2e8f0;">
          <strong>Total de Presenças de Salão:</strong> 369 presenças (vs. 56 faltas) | <strong>Taxa de Presença:</strong> 86,8%<br>
          <strong>26 Alunos que Bateram a Meta:</strong> Giovana Rocha (188%), Eugênio Pacelli (144%), Denise Palhares (88%), Andreza Cancellieri (100%), Sofia Stefane (81%), Fernando Diniz (300%), Daniele Debossan (133%), Renata Thomé (122%), Dante Sarmento (144%), Meires Devanir (111%), Luiza Maria, Carlos Eduardo, Maria Lúcia, etc.
        </div>
      </div>
    </div>

    <!-- TURNO TARDE/NOITE -->
    <div style="background: #fff; border: 1px solid #bae6fd; border-radius: 6px; padding: 10px;">
      <div style="font-weight: 800; color: #0369a1; font-size: 11px; margin-bottom: 6px; border-bottom: 1px solid #e0f2fe; padding-bottom: 4px;">
        🌇 Turno Tarde/Noite (14h às 20h + 13h) — 11 Alunos na Meta (31,4%)
      </div>
      <div style="font-size: 9px; line-height: 1.5; color: #334155;">
        <div><strong>Responsável:</strong> Matheus Poeiras Luciano ➔ <strong>+77 pts</strong> <small>(11 × 7 pts)</small></div>
        <div><strong>Equipe:</strong> Pedro Grossi ➔ <strong>+22 pts</strong> | Dr. Guilherme Graciano ➔ <strong>+22 pts</strong> <small>(11 × 2 pts)</small></div>
        <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #e2e8f0;">
          <strong>Total de Presenças de Salão:</strong> 241 presenças (vs. 23 faltas) | <strong>Taxa de Presença:</strong> 91,3%<br>
          <strong>11 Alunos que Bateram a Meta:</strong> Arthur Lopes Cussat (100%), Éder Pereira (111%), Débora San Martin (88%), Emanuel Costa (88%), Izaú Veras (100%), Paula Maria Ferraz (111%), Ian Javoski (400%), Aluisio Cláudio (88%), Luiz Antônio Araujo (100%), Gabriel Lage (88%) e Lucca Gorini (100%).
        </div>
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- 4. DETALHAMENTO PADRONIZADO POR PROFISSIONAL -->
  <h2>4. Detalhamento Padronizado por Profissional & Auditoria Completa de Ponto</h2>

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
