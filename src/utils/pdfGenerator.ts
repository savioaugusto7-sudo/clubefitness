/* eslint-disable @typescript-eslint/no-explicit-any */

declare const Chart: any;
declare const PDFLib: any;

function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

async function getLogoBase64(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/logo_b64.txt');
    if (!res.ok) throw new Error('Failed to fetch logo_b64.txt');
    const text = await res.text();
    return `data:image/jpeg;base64,${text.trim()}`;
  } catch (error) {
    console.error('Error loading logo base64:', error);
    return null;
  }
}

async function getAvatarBase64(sex: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const filename = sex?.trim().toUpperCase().startsWith('F') ? '/avatar_feminino_b64.txt' : '/avatar_masculino_b64.txt';
    const res = await fetch(filename);
    if (!res.ok) throw new Error(`Failed to fetch ${filename}`);
    const text = await res.text();
    return `data:image/png;base64,${text.trim()}`;
  } catch (error) {
    console.error('Error loading avatar base64:', error);
    return null;
  }
}

function base64ToBlob(base64: string, mime: string): Blob {
  const byteCharacters = atob(base64.split(',')[1] || base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mime });
}

function isMaigneFilled(maigneVal: any): boolean {
  if (!maigneVal) return false;
  try {
    let parsed = maigneVal;
    if (typeof maigneVal === 'string') {
      if (!maigneVal.startsWith('{')) {
        return maigneVal.trim().length > 0;
      }
      parsed = JSON.parse(maigneVal);
    }
    if (!parsed || typeof parsed !== 'object') return false;
    if (parsed.realizou !== undefined) {
      return parsed.realizou === 'sim';
    }
    const isDefault =
      (parsed.flexao === undefined || parsed.flexao === 25) &&
      (parsed.flexaoEVA === undefined || parsed.flexaoEVA === 0) &&
      (parsed.extensao === undefined || parsed.extensao === 25) &&
      (parsed.extensaoEVA === undefined || parsed.extensaoEVA === 0) &&
      (parsed.inclinacaoD === undefined || parsed.inclinacaoD === 25) &&
      (parsed.inclinacaoDEVA === undefined || parsed.inclinacaoDEVA === 0) &&
      (parsed.inclinacaoE === undefined || parsed.inclinacaoE === 25) &&
      (parsed.inclinacaoEEVA === undefined || parsed.inclinacaoEEVA === 0) &&
      (parsed.rotacaoD === undefined || parsed.rotacaoD === 25) &&
      (parsed.rotacaoDEVA === undefined || parsed.rotacaoDEVA === 0) &&
      (parsed.rotacaoE === undefined || parsed.rotacaoE === 25) &&
      (parsed.rotacaoEEVA === undefined || parsed.rotacaoEEVA === 0) &&
      (!parsed.observacoes || parsed.observacoes.trim() === '');
    return !isDefault;
  } catch (e) {
    return false;
  }
}

function triggerDirectDownload(blob: Blob, filename: string) {
  if (typeof window === 'undefined') return;

  try {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Erro no download direto via client-side, usando fallback do servidor:', error);
    const reader = new FileReader();
    reader.onloadend = function() {
      const base64data = (reader.result as string).split(',')[1];
      
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/download-pdf';
      form.style.display = 'none';
      
      const inputB64 = document.createElement('input');
      inputB64.type = 'hidden';
      inputB64.name = 'pdfB64';
      inputB64.value = base64data;
      form.appendChild(inputB64);
      
      const inputName = document.createElement('input');
      inputName.type = 'hidden';
      inputName.name = 'filename';
      inputName.value = filename;
      form.appendChild(inputName);
      
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    };
    reader.readAsDataURL(blob);
  }
}

export async function downloadReportPDF(report: any) {
  if (typeof window === 'undefined') return;
  const html2pdf = (window as any).html2pdf;
  if (!html2pdf) {
    alert('O gerador de PDF ainda está sendo carregado. Por favor, aguarde alguns segundos.');
    return;
  }
  if (!report) {
    console.error('downloadReportPDF was called with null or undefined report');
    return;
  }

  let client = report.clienteId || { dadosPessoais: { nome: 'Paciente' } };
  if (typeof client === 'string') {
    client = { _id: client, dadosPessoais: { nome: 'Paciente' } };
  }
  if (!client.dadosPessoais) {
    client.dadosPessoais = { nome: client.nome || 'Paciente' };
  }

  let prof = report.profissionalId || { nome: 'Profissional', registro: 'CREFITO' };
  if (typeof prof === 'string') {
    prof = { _id: prof, nome: 'Profissional', registro: 'CREFITO' };
  }
  if (!prof.nome) {
    prof.nome = 'Profissional';
  }
  if (!prof.registro) {
    prof.registro = 'CREFITO';
  }
  const logoBase64 = await getLogoBase64();
  
  const pdfWrapper = document.createElement('div');
  pdfWrapper.style.position = 'absolute';
  pdfWrapper.style.left = '0px';
  pdfWrapper.style.top = `${typeof window !== 'undefined' ? window.scrollY : 0}px`;
  pdfWrapper.style.width = '794px';
  pdfWrapper.style.opacity = '0';
  pdfWrapper.style.zIndex = '99999';
  pdfWrapper.style.pointerEvents = 'none';
  pdfWrapper.style.display = 'block';

  const pdfContainer = document.createElement('div');
  pdfContainer.style.background = '#ffffff';
  pdfContainer.style.color = '#333333';
  pdfContainer.style.padding = '0';
  pdfContainer.style.margin = '0';
  pdfContainer.style.width = '794px';
  pdfContainer.style.boxSizing = 'border-box';

  pdfWrapper.appendChild(pdfContainer);
  document.body.appendChild(pdfWrapper);

  const birthDate = client.dadosPessoais.dataNascimento ? new Date(client.dadosPessoais.dataNascimento) : null;
  let ageText = '-';
  if (birthDate) {
    const reportDate = new Date(report.data);
    let age = reportDate.getFullYear() - birthDate.getFullYear();
    const m = reportDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && reportDate.getDate() < birthDate.getDate())) {
      age--;
    }
    ageText = `${age} anos`;
  }

  const pdfStyles = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap');
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff;
      }
      .pdf-page {
        background: #ffffff;
        color: #1e293b;
        font-family: 'Inter', sans-serif;
        box-sizing: border-box;
        width: 794px;
        padding: 20px 30px;
      }
      .font-outfit {
        font-family: 'Outfit', sans-serif;
      }
      .grid-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 10px;
        margin-bottom: 10px;
      }
      .logo-box {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .logo-img {
        width: 50px;
        height: 50px;
        border-radius: 8px;
        object-fit: cover;
      }
      .logo-title {
        font-size: 20px;
        font-weight: 800;
        color: #0e131f;
        margin: 0;
        letter-spacing: -0.5px;
      }
      .logo-subtitle {
        font-size: 8px;
        color: #64748b;
        margin: 2px 0 0 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .date-box {
        background: #f1f5f9;
        border-radius: 6px;
        padding: 6px 12px;
        text-align: center;
        border: 1px solid #cbd5e1;
      }
      .date-box span {
        font-size: 8px;
        color: #64748b;
        font-weight: 600;
        display: block;
        text-transform: uppercase;
      }
      .date-box strong {
        font-size: 13px;
        color: #0f172a;
        font-family: 'Outfit', sans-serif;
      }
      .client-bar {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        display: grid;
        grid-template-columns: 1.5fr 0.8fr 0.8fr;
        padding: 6px 12px;
        margin-bottom: 12px;
        font-size: 9px;
      }
      .client-bar-item {
        border-right: 1px solid #e2e8f0;
        padding: 0 8px;
      }
      .client-bar-item:last-child {
        border-right: none;
      }
      .client-bar-item span {
        color: #64748b;
        font-weight: 500;
        display: block;
        font-size: 8px;
        text-transform: uppercase;
        margin-bottom: 2px;
      }
      .client-bar-item strong {
        color: #0f172a;
        font-size: 10px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
      }
      .table-data {
        width: 100%;
        border-collapse: collapse;
        font-size: 8px;
      }
      .table-data th {
        background: #f8fafc;
        color: #475569;
        font-weight: 600;
        text-align: left;
        padding: 4px 6px;
        border-bottom: 1px solid #e2e8f0;
        text-transform: uppercase;
        font-size: 7.5px;
      }
      .table-data td {
        padding: 4px 6px;
        border-bottom: 1px solid #f1f5f9;
        color: #334155;
      }
      .table-data tr:last-child td {
        border-bottom: none;
      }
      .section-card {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 12px;
        background: #ffffff;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .section-card-title {
        background: #0f172a;
        color: #ffffff;
        padding: 6px 12px;
        font-family: 'Outfit', sans-serif;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 1px;
        text-transform: uppercase;
      }
      .section-card-content {
        padding: 8px 10px;
        background: #ffffff;
      }
      .metric-badge {
        font-size: 7px;
        font-weight: 700;
        text-transform: uppercase;
        padding: 2px 6px;
        border-radius: 4px;
        display: inline-block;
      }
      .badge-green { background: #dcfce7; color: #15803d; }
      .badge-orange { background: #ffedd5; color: #c2410c; }
      .badge-blue { background: #dbeafe; color: #1d4ed8; }
      .badge-red { background: #fee2e2; color: #b91c1c; }

      p, li, tr, h2, h3, h4, table, tbody {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    </style>
  `;

  if (!report.anamnese) {
    pdfContainer.innerHTML = `
      ${pdfStyles}
      <div class="pdf-page">
        <!-- Header -->
        <div class="grid-header">
          <div class="logo-box">
            ${logoBase64 
              ? `<img src="${logoBase64}" class="logo-img" alt="Logo Clube Fitness Fisio">`
              : `<div style="width: 48px; height: 48px; border-radius: 8px; background: linear-gradient(135deg, #10b981 0%, #0d9488 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 18px; font-family: 'Outfit', sans-serif; box-shadow: 0 4px 8px rgba(16, 185, 129, 0.2); flex-shrink: 0;">CFF</div>`
            }
            <div>
              <h1 class="logo-title font-outfit">CLUBE FITNESS FISIO</h1>
              <p class="logo-subtitle">Fisioterapia, Quiropraxia e Fortalecimento</p>
            </div>
          </div>
          <div class="date-box">
            <span>Data de Atendimento</span>
            <strong>${formatDate(report.data)}</strong>
          </div>
        </div>

        <!-- Barra do Cliente -->
        <div class="client-bar">
          <div class="client-bar-item">
            <span>Paciente</span>
            <strong>${client.dadosPessoais.nome}</strong>
          </div>
          <div class="client-bar-item">
            <span>Idade</span>
            <strong>${ageText}</strong>
          </div>
          <div class="client-bar-item">
            <span>Sexo</span>
            <strong>${(client.dadosPessoais.sexo || 'M') === 'M' ? 'Masculino' : 'Feminino'}</strong>
          </div>
        </div>

        <!-- Detalhes do Evolutivo -->
        <div class="section-card">
          <div class="section-card-title">Relatório Clínico Evolutivo Simplificado</div>
          <div class="section-card-content" style="font-size: 9px; line-height: 1.5; color: #334155;">
            <div style="margin-bottom: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <span style="font-weight: 700; color: #0d9488; text-transform: uppercase; font-size: 8px; display: block; margin-bottom: 2px;">Queixa Principal Relatada:</span>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px;">${report.conteudo.queixaPrincipal}</div>
              </div>
              <div>
                <span style="font-weight: 700; color: #0d9488; text-transform: uppercase; font-size: 8px; display: block; margin-bottom: 2px;">Dor Estimada (Escala EVA):</span>
                <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 6px; padding: 8px; font-weight: 800; color: #b91c1c; font-size: 11px;">${report.conteudo.dorEscala} / 10</div>
              </div>
            </div>

            <div style="margin-bottom: 10px;">
              <span style="font-weight: 700; color: #0d9488; text-transform: uppercase; font-size: 8px; display: block; margin-bottom: 2px;">Amplitude de Movimento (ADM):</span>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px;">${report.conteudo.adm || 'Não mensurada.'}</div>
            </div>

            <div style="margin-bottom: 10px;">
              <span style="font-weight: 700; color: #0d9488; text-transform: uppercase; font-size: 8px; display: block; margin-bottom: 2px;">Testes Clínicos Realizados:</span>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px;">${report.conteudo.testes || 'Sem testes aplicados.'}</div>
            </div>

            <div style="margin-bottom: 10px;">
              <span style="font-weight: 700; color: #0d9488; text-transform: uppercase; font-size: 8px; display: block; margin-bottom: 2px;">Conduta / Intervenção Realizada em Sessão:</span>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; white-space: pre-wrap;">${report.conteudo.conduta}</div>
            </div>

            <div style="margin-bottom: 10px;">
              <span style="font-weight: 700; color: #0d9488; text-transform: uppercase; font-size: 8px; display: block; margin-bottom: 2px;">Prescrição de Autocuidado / Exercícios domiciliares:</span>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; white-space: pre-wrap;">${report.conteudo.exercicios || 'Sem prescrições adicionais.'}</div>
            </div>
          </div>
        </div>

        <!-- Assinatura Profissional -->
        <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #475569;">
          <div style="width: 250px; margin: 0 auto; border-top: 1px solid #cbd5e1; padding-top: 6px;">
            <strong>${prof.nome}</strong><br>
            <span>${prof.registro}</span>
          </div>
        </div>

        <!-- Footer Empresa -->
        <div style="margin-top: 30px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 8px; color: #64748b;">
          <span>Clube Fitness Fisio &nbsp;|&nbsp; Fisioterapia, Quiropraxia e Fortalecimento</span>
        </div>
      </div>
    `;
  } else {
    const h = report.anamnese.historico;
    const hb = report.anamnese.habitos;
    const g = report.goniometria;
    const te = report.testesEspeciais;
    const tImg = report.termografia;
    const ex = report.examesComplementares || [];
    const ort = report.testesOrtopedicos;

    const hasTermografia = tImg && tImg.realizou === 'sim';
    const hasExames = ex && ex.length > 0;
    const hasMaigne = ort.estrelaMaigne && isMaigneFilled(ort.estrelaMaigne);
    const hasYTest = ort.yTeste && ort.yTeste.realizou === 'sim';
    const hasStepDown = ort.stepDown && ort.stepDown.realizou === 'sim';
    const hasDE = ort.discinesiaEscapular && ort.discinesiaEscapular.realizou === 'sim';

    let queixasHtml = report.anamnese.queixas.map((q: any, idx: number) => `
      <div class="section-card" style="margin-bottom: 10px; page-break-inside: avoid; break-inside: avoid;">
        <div style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-family: 'Outfit', sans-serif; font-size: 9.5px; font-weight: 700; color: #0d9488; text-transform: uppercase;">
            ${idx === 0 ? 'Queixa Principal' : `Queixa Secundária #${idx}`}
          </span>
          <span class="metric-badge badge-red" style="font-size: 7.5px;">Dor EVA: ${q.dorIntensidade || 0}/10</span>
        </div>
        <div class="section-card-content" style="padding: 8px 10px;">
          <table class="table-data">
            <tbody>
              <tr>
                <td style="font-weight: 700; width: 25%;">Onde é a dor:</td>
                <td>${q.dorOnde || '-'}</td>
                <td style="font-weight: 700; width: 25%;">Quando começou:</td>
                <td>${q.quandoComecou || '-'}</td>
              </tr>
              <tr>
                <td style="font-weight: 700;">Como iniciou:</td>
                <td>${q.comoIniciou || '-'}</td>
                <td style="font-weight: 700;">Evolução da dor:</td>
                <td>${q.dorEvolucao === 'estavel' ? 'Estável (Mesma dor)' : (q.dorEvolucao === 'aumentando' ? 'Aumentando' : 'Diminuindo')}</td>
              </tr>
              <tr>
                <td style="font-weight: 700;">Frequência:</td>
                <td>${q.dorTodoMomento === 'sim' ? 'Dor a todo momento' : 'Dor intermitente'}</td>
                <td style="font-weight: 700;">Origem estimada:</td>
                <td>${q.origens.join(', ') || 'Não especificada'}</td>
              </tr>
              <tr>
                <td style="font-weight: 700;">Piora com:</td>
                <td colspan="3">${q.desencadeiaPiora || '-'}</td>
              </tr>
              <tr>
                <td style="font-weight: 700;">Melhora com:</td>
                <td colspan="3">${q.melhoraDesaparece || '-'}</td>
              </tr>
              <tr>
                <td style="font-weight: 700;">Característica:</td>
                <td colspan="3">${q.caracteristicaDor || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `).join('');

    let cirurgiasHtml = '-';
    if (h.cirurgiasRealizou === 'sim' && h.cirurgias && h.cirurgias.length > 0) {
      cirurgiasHtml = h.cirurgias.map((c: any) => `${formatDate(c.data)}: ${c.local}`).join('<br>');
    }

    let examesHtml = 'Nenhum exame complementar anexado.';
    if (ex && ex.length > 0) {
      examesHtml = ex.map((e: any) => `• ${e.nome} (Laudo em PDF)`).join('<br>');
    }

    let termografiaHtml = 'Não realizada.';
    if (tImg && tImg.realizou === 'sim') {
      termografiaHtml = 'Realizada.';
      if (tImg.imagemB64) {
        termografiaHtml += `<br><img src="${tImg.imagemB64}" style="max-height:160px; margin-top:8px; border-radius:4px; border:1px solid #cbd5e1; display:block;">`;
      }
    }

    let yTestHtml = 'Não realizado.';
    if (ort.yTeste && ort.yTeste.realizou === 'sim') {
      const yd = ort.yTeste.direita;
      const ye = ort.yTeste.esquerda;
      const compD = yd.comprimentoMembro || 1;
      const compE = ye.comprimentoMembro || 1;
      const scoreD = ((yd.anterior + yd.posteromedial + yd.posterolateral) / (3 * compD)) * 100;
      const scoreE = ((ye.anterior + ye.posteromedial + ye.posterolateral) / (3 * compE)) * 100;
      const diffAnt = Math.abs(yd.anterior - ye.anterior);
      const diffPM = Math.abs(yd.posteromedial - ye.posteromedial);
      const diffPL = Math.abs(yd.posterolateral - ye.posterolateral);

      let alerts = [];
      if (diffAnt > 10 || diffPM > 10 || diffPL > 10) alerts.push('Assimetria significativa (> 10cm) - Risco de Lesão!');
      if (scoreD < 94 || scoreE < 94) alerts.push('Alto risco de lesão (Composite Score < 94%)');

      yTestHtml = `
        <table class="table-data">
          <thead>
            <tr style="background:#f8fafc; font-weight:bold;">
              <th>Direção</th>
              <th style="text-align:center;">Direito</th>
              <th style="text-align:center;">Esquerdo</th>
              <th style="text-align:center;">Diferença</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight:600;">Comprimento</td>
              <td style="text-align:center;">${yd.comprimentoMembro} cm</td>
              <td style="text-align:center;">${ye.comprimentoMembro} cm</td>
              <td style="text-align:center;">-</td>
            </tr>
            <tr>
              <td style="font-weight:600;">Alcance Ant</td>
              <td style="text-align:center;">${yd.anterior} cm</td>
              <td style="text-align:center;">${ye.anterior} cm</td>
              <td style="text-align:center;">${diffAnt.toFixed(1)} cm</td>
            </tr>
            <tr>
              <td style="font-weight:600;">Alcance PM</td>
              <td style="text-align:center;">${yd.posteromedial} cm</td>
              <td style="text-align:center;">${ye.posteromedial} cm</td>
              <td style="text-align:center;">${diffPM.toFixed(1)} cm</td>
            </tr>
            <tr>
              <td style="font-weight:600;">Alcance PL</td>
              <td style="text-align:center;">${yd.posterolateral} cm</td>
              <td style="text-align:center;">${ye.posterolateral} cm</td>
              <td style="text-align:center;">${diffPL.toFixed(1)} cm</td>
            </tr>
            <tr style="font-weight:bold; background:#f8fafc;">
              <td>Composite Score</td>
              <td style="text-align:center;">${scoreD.toFixed(1)}%</td>
              <td style="text-align:center;">${scoreE.toFixed(1)}%</td>
              <td style="text-align:center;">-</td>
            </tr>
          </tbody>
        </table>
        ${alerts.length > 0 ? `<div style="margin-top:6px; color:#ef4444; font-weight:bold; font-size:7.5px;">⚠️ Alertas: ${alerts.join(' | ')}</div>` : ''}
      `;
    }

    let stepDownHtml = 'Não realizado.';
    if (ort.stepDown && ort.stepDown.realizou === 'sim') {
      const sdVal = ort.stepDown;
      const sex = client.dadosPessoais.sexo || 'M';
      let rFactors = [];
      if (sdVal.quedaPelvica > 5) rFactors.push('Queda Pélvica (>5°)');
      if (sdVal.aducaoQuadril > 10) rFactors.push('Adução de Quadril (>10°)');
      const limit = sex === 'M' ? 10 : 15;
      if (sdVal.valgoDinamicoJoelho > limit) rFactors.push(`Valgo Dinâmico (${sdVal.valgoDinamicoJoelho}° > ${limit}°)`);
      if (sdVal.compExcentricoPrps > 0 && sdVal.compExcentricoPrps < 60) rFactors.push('Comp. Excêntrico reduzido (<60°)');

      stepDownHtml = `
        <div style="font-size:8px; line-height:1.4; color: #334155;">
          Queda Pélvica: <strong>${sdVal.quedaPelvica}°</strong> | 
          Adução Quadril: <strong>${sdVal.aducaoQuadril}°</strong> <br>
          Valgo Dinâmico: <strong>${sdVal.valgoDinamicoJoelho}°</strong> | 
          Excêntrico/PRPS: <strong>${sdVal.compExcentricoPrps}°</strong>
          ${rFactors.length > 0 ? `<div style="margin-top:4px; color:#ef4444; font-weight:bold;">⚠️ Risco: ${rFactors.join(', ')}</div>` : '<div style="margin-top:4px; color:#10b981; font-weight:bold;">✓ Controle Seguro</div>'}
        </div>
      `;
    }

    let deHtml = 'Não realizada.';
    if (ort.discinesiaEscapular && ort.discinesiaEscapular.realizou === 'sim') {
      const deVal = ort.discinesiaEscapular;
      deHtml = `
        <div style="font-size:8px; line-height:1.4; color: #334155;">
          Tipo: <strong>${deVal.tipo}</strong> <br>
          • Projeta cabeça para frente: <strong>${deVal.abducaoBilateralCabecaFrente === 'sim' ? 'Sim' : 'Não'}</strong> <br>
          • Desvio na abdução unilateral: <strong>${deVal.abducaoUnilateralToracicaCabeca === 'sim' ? 'Sim' : 'Não'}</strong> <br>
          • Dor na abdução com inclinação: <strong>${deVal.dorAbducaoUnilateralInclinacao === 'sim' ? 'Sim' : 'Não'}</strong>
        </div>
      `;
    }

    let maigneSvgHtml = '';
    let maigneTableHtml = '';
    if (ort.estrelaMaigne) {
      const m = ort.estrelaMaigne;
      const cx = 190, cy = 150, maxRadius = 100, scale = 2.0;
      const angles = [-Math.PI/2, -Math.PI/6, Math.PI/6, Math.PI/2, 5*Math.PI/6, 7*Math.PI/6];
      const refVals = [40, 40, 30, 30, 30, 40];
      const clientVals = [m.flexao, m.rotacaoD, m.inclinacaoD, m.extensao, m.inclinacaoE, m.rotacaoE];
      
      const fEVA = m.flexaoEVA !== undefined ? m.flexaoEVA : 0;
      const extEVA = m.extensaoEVA !== undefined ? m.extensaoEVA : 0;
      const idEVA = m.inclinacaoDEVA !== undefined ? m.inclinacaoDEVA : 0;
      const ieEVA = m.inclinacaoEEVA !== undefined ? m.inclinacaoEEVA : 0;
      const rdEVA = m.rotacaoDEVA !== undefined ? m.rotacaoDEVA : 0;
      const reEVA = m.rotacaoEEVA !== undefined ? m.rotacaoEEVA : 0;

      maigneSvgHtml = `
        <svg width="200" height="158" viewBox="0 0 380 300" style="display:block; margin:0 auto; background:#ffffff;">
          <!-- Grid Circles -->
          ${[10, 20, 30, 40, 50].map(val => `
            <circle cx="${cx}" cy="${cy}" r="${val * scale}" stroke="#e2e8f0" fill="none" stroke-width="0.5" />
            <text x="${cx}" y="${cy - (val * scale) + 3}" style="font-size:7px; fill:#94a3b8; text-anchor:middle;">${val}</text>
          `).join('')}

          <!-- Grid Lines -->
          ${angles.map((ang, idx) => {
            const x = cx + maxRadius * Math.cos(ang);
            const y = cy + maxRadius * Math.sin(ang);
            return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#94a3b8" stroke-width="0.75" />`;
          }).join('')}

          <!-- Labels for directions -->
          <text x="${cx}" y="${cy - maxRadius - 10}" style="font-size:9px; fill:#334155; font-weight:bold; text-anchor:middle;">Flexão (EVA: ${fEVA})</text>
          <text x="${cx + maxRadius * Math.cos(angles[1]) + 15}" y="${cy + maxRadius * Math.sin(angles[1]) - 5}" style="font-size:9px; fill:#334155; font-weight:bold; text-anchor:start;">Rot D (EVA: ${rdEVA})</text>
          <text x="${cx + maxRadius * Math.cos(angles[2]) + 15}" y="${cy + maxRadius * Math.sin(angles[2]) + 10}" style="font-size:9px; fill:#334155; font-weight:bold; text-anchor:start;">Inc D (EVA: ${idEVA})</text>
          <text x="${cx}" y="${cy + maxRadius + 18}" style="font-size:9px; fill:#334155; font-weight:bold; text-anchor:middle;">Extensão (EVA: ${extEVA})</text>
          <text x="${cx + maxRadius * Math.cos(angles[4]) - 15}" y="${cy + maxRadius * Math.sin(angles[4]) + 10}" style="font-size:9px; fill:#334155; font-weight:bold; text-anchor:end;">Inc E (EVA: ${ieEVA})</text>
          <text x="${cx + maxRadius * Math.cos(angles[5]) - 15}" y="${cy + maxRadius * Math.sin(angles[5]) - 5}" style="font-size:9px; fill:#334155; font-weight:bold; text-anchor:end;">Rot E (EVA: ${reEVA})</text>

          <!-- Reference Polygon -->
          <polygon points="${angles.map((ang, idx) => {
            const x = cx + refVals[idx] * scale * Math.cos(ang);
            const y = cy + refVals[idx] * scale * Math.sin(ang);
            return `${x},${y}`;
          }).join(' ')}" fill="none" stroke="#f59e0b" stroke-width="1.2" stroke-dasharray="3,3" />

          <!-- Value Polygon -->
          <polygon points="${angles.map((ang, idx) => {
            const x = cx + clientVals[idx] * scale * Math.cos(ang);
            const y = cy + clientVals[idx] * scale * Math.sin(ang);
            return `${x},${y}`;
          }).join(' ')}" fill="rgba(13, 148, 136, 0.15)" stroke="#0d9488" stroke-width="1.8" />

          <!-- Value Dots -->
          ${angles.map((ang, idx) => {
            const x = cx + clientVals[idx] * scale * Math.cos(ang);
            const y = cy + clientVals[idx] * scale * Math.sin(ang);
            return `<circle cx="${x}" cy="${y}" r="3.5" fill="#0d9488" stroke="#ffffff" stroke-width="1" />`;
          }).join('')}
        </svg>
      `;

      maigneTableHtml = `
        <table class="table-data" style="font-size: 7.5px; margin-top: 4px;">
          <thead>
            <tr style="background:#f8fafc; font-weight:bold;">
              <th style="padding: 2px 4px;">Direção</th>
              <th style="padding: 2px 4px; text-align:center;">ADM</th>
              <th style="padding: 2px 4px; text-align:center;">Dor (EVA)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight:bold; padding: 2px 4px;">Flexão</td>
              <td style="text-align:center; padding: 2px 4px;">${m.flexao}/50</td>
              <td style="text-align:center; padding: 2px 4px;">${fEVA}/10</td>
            </tr>
            <tr>
              <td style="font-weight:bold; padding: 2px 4px;">Extensão</td>
              <td style="text-align:center; padding: 2px 4px;">${m.extensao}/50</td>
              <td style="text-align:center; padding: 2px 4px;">${extEVA}/10</td>
            </tr>
            <tr>
              <td style="font-weight:bold; padding: 2px 4px;">Rot D</td>
              <td style="text-align:center; padding: 2px 4px;">${m.rotacaoD}/50</td>
              <td style="text-align:center; padding: 2px 4px;">${rdEVA}/10</td>
            </tr>
            <tr>
              <td style="font-weight:bold; padding: 2px 4px;">Rot E</td>
              <td style="text-align:center; padding: 2px 4px;">${m.rotacaoE}/50</td>
              <td style="text-align:center; padding: 2px 4px;">${reEVA}/10</td>
            </tr>
            <tr>
              <td style="font-weight:bold; padding: 2px 4px;">Inc D</td>
              <td style="text-align:center; padding: 2px 4px;">${m.inclinacaoD}/50</td>
              <td style="text-align:center; padding: 2px 4px;">${idEVA}/10</td>
            </tr>
            <tr>
              <td style="font-weight:bold; padding: 2px 4px;">Inc E</td>
              <td style="text-align:center; padding: 2px 4px;">${m.inclinacaoE}/50</td>
              <td style="text-align:center; padding: 2px 4px;">${ieEVA}/10</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    pdfContainer.innerHTML = `
      ${pdfStyles}
      <div class="pdf-page">
        <!-- Header -->
        <div class="grid-header">
          <div class="logo-box">
            ${logoBase64 
              ? `<img src="${logoBase64}" class="logo-img" alt="Logo Clube Fitness Fisio">`
              : `<div style="width: 48px; height: 48px; border-radius: 8px; background: linear-gradient(135deg, #10b981 0%, #0d9488 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 18px; font-family: 'Outfit', sans-serif; box-shadow: 0 4px 8px rgba(16, 185, 129, 0.2); flex-shrink: 0;">CFF</div>`
            }
            <div>
              <h1 class="logo-title font-outfit">CLUBE FITNESS FISIO</h1>
              <p class="logo-subtitle">Fisioterapia, Quiropraxia e Fortalecimento</p>
            </div>
          </div>
          <div class="date-box">
            <span>Data do Relatório</span>
            <strong>${formatDate(report.data)}</strong>
          </div>
        </div>

        <!-- Barra do Cliente -->
        <div class="client-bar">
          <div class="client-bar-item">
            <span>Paciente</span>
            <strong>${client.dadosPessoais.nome}</strong>
          </div>
          <div class="client-bar-item">
            <span>Idade</span>
            <strong>${ageText}</strong>
          </div>
          <div class="client-bar-item">
            <span>Sexo</span>
            <strong>${(client.dadosPessoais.sexo || 'M') === 'M' ? 'Masculino' : 'Feminino'}</strong>
          </div>
        </div>

        <div class="section-card">
          <div class="section-card-title">Anamnese & Queixas Frequentes</div>
          <div class="section-card-content" style="padding: 10px 10px 2px 10px;">
            ${queixasHtml}
          </div>
        </div>

        <div class="section-card">
          <div class="section-card-title">Histórico Clínico Detalhado</div>
          <div class="section-card-content">
            <table class="table-data">
              <tbody>
                <tr>
                  <td style="font-weight:700; width:30%;">Traumas pregressos:</td>
                  <td>${h.traumas || 'Nenhum relatado.'}</td>
                </tr>
                <tr>
                  <td style="font-weight:700;">Cirurgias:</td>
                  <td>${cirurgiasHtml}</td>
                </tr>
                <tr>
                  <td style="font-weight:700;">Doenças pregressas/atuais:</td>
                  <td>${h.doencasPregressasAtuais || 'Nenhuma.'}</td>
                </tr>
                <tr>
                  <td style="font-weight:700;">Traumas emocionais/estresse:</td>
                  <td>${h.traumasEmocionaisStress || 'Nenhum.'}</td>
                </tr>
                <tr>
                  <td style="font-weight:700;">Medicação em uso:</td>
                  <td>${h.medicacao || 'Nenhuma.'}</td>
                </tr>
                <tr>
                  <td style="font-weight:700;">Álcool/Tabaco/Drogas:</td>
                  <td>${h.drogasRecreativas || 'Nenhum.'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="section-card">
          <div class="section-card-title">Estilo de Vida & Hábitos</div>
          <div class="section-card-content">
            <table class="table-data">
              <tbody>
                <tr>
                  <td style="font-weight:700; width:30%;">Qualidade do Sono:</td>
                  <td>Dorme ${hb.sonoHoras}h por noite (${hb.sonoTipo === 'continuo' ? 'Sono contínuo' : 'Acorda à noite'}), Qualidade: ${hb.sonoQualidade}.</td>
                </tr>
                <tr>
                  <td style="font-weight:700;">Alimentação / Dor:</td>
                  <td>${hb.alimentacaoDor || 'Sem observações.'}</td>
                </tr>
                <tr>
                  <td style="font-weight:700;">Atividade Física:</td>
                  <td>
                    ${hb.atividadeFisicaFaz === 'sim' ? `Faz atividade física regular: ${hb.atividadeFisicaQual || ''}. Interfere na dor: ${hb.atividadeFisicaInterfere || ''}` : 'Não pratica atividade física regularmente.'}
                  </td>
                </tr>
                <tr>
                  <td style="font-weight:700;">Nível de Estresse:</td>
                  <td>Nível ${hb.stressNivel}/10 | Mecanismo de controle: ${hb.controleStress || 'Nenhum.'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="section-card">
          <div class="section-card-title">Amplitude de Movimento (Goniometria)</div>
          <div class="section-card-content">
            <table class="table-data">
              <thead>
                <tr style="font-weight:bold;">
                  <th>Articulação / Movimento</th>
                  <th style="text-align:center; width:25%;">Direito</th>
                  <th style="text-align:center; width:25%;">Esquerdo</th>
                </tr>
              </thead>
              <tbody>
                ${[
                  { key: 'quadrilFlexao1', label: 'Quadril - Flexão com Joelho Fletido' },
                  { key: 'quadrilFlexao2', label: 'Quadril - Flexão com Joelho Estendido' },
                  { key: 'quadrilRotInt', label: 'Quadril - Rotação Interna' },
                  { key: 'quadrilRotExt', label: 'Quadril - Rotação Externa' },
                  { key: 'joelhoFlexao', label: 'Joelho - Flexão' },
                  { key: 'joelhoPopliteo', label: 'Joelho - Ângulo Poplíteo' },
                  { key: 'tornozeloDorsi1', label: 'Tornozelo - Dorsiflexão Joelho Estendido' },
                  { key: 'tornozeloDorsi2', label: 'Tornozelo - Dorsiflexão Joelho Fletido' },
                  { key: 'tornozeloFlexaoPlantar', label: 'Tornozelo - Flexão Plantar' },
                  { key: 'ombroRotInt', label: 'Ombro - Rotação Interna' },
                  { key: 'ombroRotExt', label: 'Ombro - Rotação Externa' },
                  { key: 'ombroAbducao', label: 'Ombro - Abdução' }
                ].map(row => `
                  <tr>
                    <td style="font-weight:600;">${row.label}</td>
                    <td style="text-align:center;">${g[row.key + 'D'] || '0'}°</td>
                    <td style="text-align:center;">${g[row.key + 'E'] || '0'}°</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="section-card">
          <div class="section-card-title">Testes Ortopédicos Especiais</div>
          <div class="section-card-content">
            <table class="table-data">
              <thead>
                <tr style="font-weight:bold;">
                  <th>Teste Clínico</th>
                  <th style="text-align:center; width:35%;">Direito</th>
                  <th style="text-align:center; width:35%;">Esquerdo</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="font-weight:700;">Teste de Ober</td>
                  <td style="text-align:center; color:${te.oberD === 'Positivo' ? '#ef4444' : '#334155'}; font-weight:${te.oberD === 'Positivo' ? '700' : 'normal'};">${te.oberD}</td>
                  <td style="text-align:center; color:${te.oberE === 'Positivo' ? '#ef4444' : '#334155'}; font-weight:${te.oberE === 'Positivo' ? '700' : 'normal'};">${te.oberE}</td>
                </tr>
                <tr>
                  <td style="font-weight:700;">Teste de Thomas</td>
                  <td style="text-align:center; color:${te.thomasD === 'Positivo' ? '#ef4444' : '#334155'}; font-weight:${te.thomasD === 'Positivo' ? '700' : 'normal'};">
                    ${te.thomasD} ${te.thomasD === 'Positivo' && te.thomasAnguloD ? `(${te.thomasAnguloD}°)` : ''}
                  </td>
                  <td style="text-align:center; color:${te.thomasE === 'Positivo' ? '#ef4444' : '#334155'}; font-weight:${te.thomasE === 'Positivo' ? '700' : 'normal'};">
                    ${te.thomasE} ${te.thomasE === 'Positivo' && te.thomasAnguloE ? `(${te.thomasAnguloE}°)` : ''}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        ${hasTermografia || hasExames ? `
        <div class="section-card">
          <div class="section-card-title">Termografia & Exames Complementares</div>
          <div class="section-card-content" style="font-size: 8.5px; line-height: 1.5; color: #334155;">
            ${hasTermografia ? `
            <div style="margin-bottom: ${hasExames ? '10px' : '0px'};">
              <span style="font-weight: 700; color: #0d9488; text-transform: uppercase; font-size: 8px; display: block; margin-bottom: 4px;">Mapeamento por Termografia:</span>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px;">
                ${termografiaHtml}
              </div>
            </div>
            ` : ''}
            ${hasExames ? `
            <div>
              <span style="font-weight: 700; color: #0d9488; text-transform: uppercase; font-size: 8px; display: block; margin-bottom: 4px;">Exames Complementares Anexados:</span>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px;">
                ${examesHtml}
              </div>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        ${(hasMaigne || hasYTest || hasStepDown || hasDE) ? `
        <div class="section-card">
          <div class="section-card-title">Testes Avançados & Avaliação Funcional</div>
          <div class="section-card-content" style="padding: 10px;">
            <table style="width:100%; border-collapse:collapse; font-size:9px;" border="0">
              <tr>
                ${hasMaigne ? `
                <td style="width: ${(hasYTest || hasStepDown || hasDE) ? '48%' : '100%'}; vertical-align:top; padding-right: ${(hasYTest || hasStepDown || hasDE) ? '8px' : '0px'};">
                  <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; background: #ffffff;">
                    <span style="font-weight: 700; color: #0d9488; text-transform: uppercase; font-size: 8px; display: block; margin-bottom: 6px; text-align:center;">Estrela Maigne</span>
                    ${maigneSvgHtml}
                    ${maigneTableHtml}
                  </div>
                </td>
                ` : ''}
                ${(hasYTest || hasStepDown || hasDE) ? `
                <td style="width: ${hasMaigne ? '52%' : '100%'}; vertical-align:top; padding-left: ${hasMaigne ? '8px' : '0px'};">
                  <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${hasYTest ? `
                    <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; background: #ffffff;">
                      <span style="font-weight: 700; color: #0d9488; text-transform: uppercase; font-size: 8px; display: block; margin-bottom: 6px;">Y Teste (Equilíbrio Dinâmico)</span>
                      ${yTestHtml}
                    </div>
                    ` : ''}
                    ${hasStepDown ? `
                    <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; background: #ffffff;">
                      <span style="font-weight: 700; color: #0d9488; text-transform: uppercase; font-size: 8px; display: block; margin-bottom: 6px;">Step Down Test</span>
                      ${stepDownHtml}
                    </div>
                    ` : ''}
                    ${hasDE ? `
                    <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; background: #ffffff;">
                      <span style="font-weight: 700; color: #0d9488; text-transform: uppercase; font-size: 8px; display: block; margin-bottom: 6px;">Cintura Escapular</span>
                      ${deHtml}
                    </div>
                    ` : ''}
                  </div>
                </td>
                ` : ''}
              </tr>
            </table>
          </div>
        </div>
        ` : ''}

        <div class="section-card">
          <div class="section-card-title">Conduta Fisioterapêutica Aplicada</div>
          <div class="section-card-content" style="font-size: 8.5px; line-height: 1.5; white-space: pre-wrap; background: #fafafa;">${report.conteudo.conduta}</div>
        </div>

        <div class="section-card">
          <div class="section-card-title">Prescrição de Autocuidado / Domiciliar</div>
          <div class="section-card-content" style="font-size: 8.5px; line-height: 1.5; white-space: pre-wrap; background: #fafafa;">${report.conteudo.exercicios || 'Nenhuma prescrição adicional.'}</div>
        </div>

        <!-- Assinatura Profissional -->
        <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #475569;">
          <div style="width: 250px; margin: 0 auto; border-top: 1px solid #cbd5e1; padding-top: 6px;">
            <strong>${prof.nome}</strong><br>
            <span>${prof.registro}</span>
          </div>
        </div>

        <!-- Footer Empresa -->
        <div style="margin-top: 30px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 8px; color: #64748b;">
          <span>Clube Fitness Fisio &nbsp;|&nbsp; Fisioterapia, Quiropraxia e Fortalecimento</span>
        </div>
      </div>
    `;
  }

  const options = {
    margin: 0,
    filename: `Relatorio_Fisioterapia_${client.dadosPessoais.nome.replace(/\s+/g, '_')}_${formatDate(report.data).replace(/\//g, '-')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2.0, useCORS: true, letterRendering: true, scrollX: 0, scrollY: 0, windowWidth: 794, width: 794, x: 0, y: 0 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] }
  };

  html2pdf().set(options).from(pdfContainer).output('blob').then((blob: Blob) => {
    triggerDirectDownload(blob, options.filename);
    document.body.removeChild(pdfWrapper);
  }).catch((err: any) => {
    console.error('Erro na geração do PDF do relatório:', err);
    document.body.removeChild(pdfWrapper);
  });
}



function calculateObjectiveWeeklyRate(peso: number, sexo: string, freq: number, nivel: string, tipo: string) {
  const p = Number(peso) || 70;
  const s = sexo === 'F' ? 'F' : 'M';
  const f = Number(freq) || 3;
  const n = nivel || 'Iniciante / Retorno';
  const t = tipo === 'Emagrecimento' ? 'Emagrecimento' : 'Massa Magra';

  let taxaBase = 0;
  let fatorSexo = 1.00;
  let fatorFreq = 1.00;

  if (t === 'Massa Magra') {
    // Hypertrofia
    if (n === 'Iniciante / Retorno') taxaBase = 0.0030;
    else if (n === 'Iniciante a Intermediário') taxaBase = 0.0022;
    else if (n === 'Intermediário') taxaBase = 0.0015;
    else if (n === 'Avançado') taxaBase = 0.0008;

    if (s === 'F') fatorSexo = 0.80;

    if (f === 2) fatorFreq = 0.80;
    else if (f === 3) fatorFreq = 0.90;
    else if (f === 4) fatorFreq = 1.00;
    else if (f >= 5) fatorFreq = 1.05;
  } else {
    // Emagrecimento
    if (n === 'Iniciante / Retorno') taxaBase = 0.0055;
    else if (n === 'Iniciante a Intermediário') taxaBase = 0.0065;
    else if (n === 'Intermediário') taxaBase = 0.0075;
    else if (n === 'Avançado') taxaBase = 0.0085;

    if (s === 'F') fatorSexo = 0.85;

    if (f === 2) fatorFreq = 0.85;
    else if (f === 3) fatorFreq = 0.95;
    else if (f === 4) fatorFreq = 1.00;
    else if (f >= 5) fatorFreq = 1.05;
  }

  return p * taxaBase * fatorSexo * fatorFreq;
}

export async function downloadAssessmentPDF(assessment: any, allAssessments?: any[]) {
  if (typeof window === 'undefined') return;
  const html2pdf = (window as any).html2pdf;
  if (!html2pdf) {
    alert('O gerador de PDF ainda está sendo carregado. Por favor, aguarde alguns segundos.');
    return;
  }
  if (!assessment) {
    console.error('downloadAssessmentPDF was called with null or undefined assessment');
    return;
  }



  let client = assessment.clienteId || { dadosPessoais: { nome: 'Aluno' } };
  if (typeof client === 'string') {
    client = { _id: client, dadosPessoais: { nome: 'Aluno' } };
  }
  if (!client.dadosPessoais) {
    client.dadosPessoais = { nome: client.nome || 'Aluno' };
  }

  const logoBase64 = await getLogoBase64();
  const avatarB64 = await getAvatarBase64(client.dadosPessoais?.sexo || 'M');

  let prof = assessment.avaliadorId || { nome: 'Avaliador', registro: 'CREF/CREFITO' };
  if (typeof prof === 'string') {
    prof = { _id: prof, nome: 'Avaliador', registro: 'CREF/CREFITO' };
  }
  if (!prof.nome) {
    prof.nome = 'Avaliador';
  }
  if (!prof.registro) {
    prof.registro = 'CREF/CREFITO';
  }

  let maigneObj = { flexao: 25, flexaoEVA: 0, extensao: 25, extensaoEVA: 0, inclinacaoD: 25, inclinacaoDEVA: 0, inclinacaoE: 25, inclinacaoEEVA: 0, rotacaoD: 25, rotacaoDEVA: 0, rotacaoE: 25, rotacaoEEVA: 0, observacoes: '' };
  let hasMaigneData = false;
  if (assessment.dadosMedidos.testesEspeciais?.maigne) {
    const rawMaigne = assessment.dadosMedidos.testesEspeciais.maigne;
    if (isMaigneFilled(rawMaigne)) {
      if (typeof rawMaigne === 'string' && rawMaigne.startsWith('{')) {
        try {
          const parsed = JSON.parse(rawMaigne);
          if (parsed && typeof parsed === 'object') {
            maigneObj = { ...maigneObj, ...parsed };
            hasMaigneData = true;
          }
        } catch (e) {
          // Not JSON
        }
      } else if (typeof rawMaigne === 'object') {
        maigneObj = { ...maigneObj, ...rawMaigne };
        hasMaigneData = true;
      }
    }
  }

  let maigneSvgHtml = '';
  if (hasMaigneData) {
    const m = maigneObj;
    const cx = 190, cy = 150, maxRadius = 100, scale = 2.0;
    const angles = [-Math.PI/2, -Math.PI/6, Math.PI/6, Math.PI/2, 5*Math.PI/6, 7*Math.PI/6];
    const refVals = [40, 40, 30, 30, 30, 40];
    const clientVals = [m.flexao, m.rotacaoD, m.inclinacaoD, m.extensao, m.inclinacaoE, m.rotacaoE];
    
    const fEVA = m.flexaoEVA !== undefined ? m.flexaoEVA : 0;
    const extEVA = m.extensaoEVA !== undefined ? m.extensaoEVA : 0;
    const idEVA = m.inclinacaoDEVA !== undefined ? m.inclinacaoDEVA : 0;
    const ieEVA = m.inclinacaoEEVA !== undefined ? m.inclinacaoEEVA : 0;
    const rdEVA = m.rotacaoDEVA !== undefined ? m.rotacaoDEVA : 0;
    const reEVA = m.rotacaoEEVA !== undefined ? m.rotacaoEEVA : 0;

    maigneSvgHtml = `
      <svg width="180" height="142" viewBox="0 0 380 300" style="display:block; margin:0 auto; background:#ffffff;">
        <!-- Grid Circles -->
        ${[10, 20, 30, 40, 50].map(val => `
          <circle cx="${cx}" cy="${cy}" r="${val * scale}" stroke="#e2e8f0" fill="none" stroke-width="0.5" />
          <text x="${cx}" y="${cy - (val * scale) + 3}" style="font-size:7px; fill:#94a3b8; text-anchor:middle;">${val}</text>
        `).join('')}

        <!-- Grid Lines -->
        ${angles.map((ang, idx) => {
          const x = cx + maxRadius * Math.cos(ang);
          const y = cy + maxRadius * Math.sin(ang);
          return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#94a3b8" stroke-width="0.75" />`;
        }).join('')}

        <!-- Labels for directions -->
        <text x="${cx}" y="${cy - maxRadius - 10}" style="font-size:9px; fill:#334155; font-weight:bold; text-anchor:middle;">Flexão (EVA: ${fEVA})</text>
        <text x="${cx + maxRadius * Math.cos(angles[1]) + 15}" y="${cy + maxRadius * Math.sin(angles[1]) - 5}" style="font-size:9px; fill:#334155; font-weight:bold; text-anchor:start;">Rot D (EVA: ${rdEVA})</text>
        <text x="${cx + maxRadius * Math.cos(angles[2]) + 15}" y="${cy + maxRadius * Math.sin(angles[2]) + 10}" style="font-size:9px; fill:#334155; font-weight:bold; text-anchor:start;">Inc D (EVA: ${idEVA})</text>
        <text x="${cx}" y="${cy + maxRadius + 18}" style="font-size:9px; fill:#334155; font-weight:bold; text-anchor:middle;">Extensão (EVA: ${extEVA})</text>
        <text x="${cx + maxRadius * Math.cos(angles[4]) - 15}" y="${cy + maxRadius * Math.sin(angles[4]) + 10}" style="font-size:9px; fill:#334155; font-weight:bold; text-anchor:end;">Inc E (EVA: ${ieEVA})</text>
        <text x="${cx + maxRadius * Math.cos(angles[5]) - 15}" y="${cy + maxRadius * Math.sin(angles[5]) - 5}" style="font-size:9px; fill:#334155; font-weight:bold; text-anchor:end;">Rot E (EVA: ${reEVA})</text>

        <!-- Reference Polygon -->
        <polygon points="${angles.map((ang, idx) => {
          const x = cx + refVals[idx] * scale * Math.cos(ang);
          const y = cy + refVals[idx] * scale * Math.sin(ang);
          return `${x},${y}`;
        }).join(' ')}" fill="none" stroke="#f59e0b" stroke-width="1.2" stroke-dasharray="3,3" />

        <!-- Value Polygon -->
        <polygon points="${angles.map((ang, idx) => {
          const x = cx + clientVals[idx] * scale * Math.cos(ang);
          const y = cy + clientVals[idx] * scale * Math.sin(ang);
          return `${x},${y}`;
        }).join(' ')}" fill="rgba(13, 148, 136, 0.15)" stroke="#0d9488" stroke-width="1.8" />

        <!-- Value Dots -->
        ${angles.map((ang, idx) => {
          const x = cx + clientVals[idx] * scale * Math.cos(ang);
          const y = cy + clientVals[idx] * scale * Math.sin(ang);
          return `<circle cx="${x}" cy="${y}" r="3.5" fill="#0d9488" stroke="#ffffff" stroke-width="1" />`;
        }).join('')}
      </svg>
    `;
  }

  // ===== Parse structured Y-Test, Step Down, Termografia =====
  const rawYTest = assessment.dadosMedidos.testesEspeciais?.yTest || '';
  let yTestObj: any = null;
  let yTestLegacyStr = '';
  if (rawYTest) {
    try {
      const parsed = JSON.parse(rawYTest);
      if (parsed && typeof parsed === 'object' && parsed.realizou === 'sim') yTestObj = parsed;
      else yTestLegacyStr = rawYTest;
    } catch { yTestLegacyStr = rawYTest; }
  }

  const rawStepDown = assessment.dadosMedidos.testesEspeciais?.stepDown || '';
  let stepDownObj: any = null;
  let stepDownLegacyStr = '';
  if (rawStepDown) {
    try {
      const parsed = JSON.parse(rawStepDown);
      if (parsed && typeof parsed === 'object' && parsed.realizou === 'sim') stepDownObj = parsed;
      else stepDownLegacyStr = rawStepDown;
    } catch { stepDownLegacyStr = rawStepDown; }
  }

  const rawTermografia = assessment.dadosMedidos.testesEspeciais?.termografia || '';
  const hasTermografiaImage = rawTermografia && rawTermografia.startsWith('data:');
  const termografiaIsRealizado = rawTermografia && rawTermografia.trim().length > 0;

  // Build Y-Test HTML row(s)
  let yTestRowsHtml = '';
  if (yTestObj) {
    const yd = yTestObj.direita || {};
    const ye = yTestObj.esquerda || {};
    const mD = yd.comprimentoMembro || 0;
    const mE = ye.comprimentoMembro || 0;
    const antD = yd.anterior || 0, antE = ye.anterior || 0;
    const pmD = yd.posteromedial || 0, pmE = ye.posteromedial || 0;
    const plD = yd.posterolateral || 0, plE = ye.posterolateral || 0;
    const scoreD = mD > 0 ? (((antD + pmD + plD) / (3 * mD)) * 100).toFixed(1) : '—';
    const scoreE = mE > 0 ? (((antE + pmE + plE) / (3 * mE)) * 100).toFixed(1) : '—';
    const diffAnt = Math.abs(antD - antE);
    const diffPM = Math.abs(pmD - pmE);
    const diffPL = Math.abs(plD - plE);
    const hasAsym = diffAnt > 10 || diffPM > 10 || diffPL > 10;
    const hasLow = (mD > 0 && parseFloat(scoreD) < 94) || (mE > 0 && parseFloat(scoreE) < 94);
    const alertHtml = (hasAsym || hasLow)
      ? `<div style="color:#ef4444; font-size:6px; font-weight:700; margin-top:2px;">${hasAsym ? '⚠ Assimetria &gt;10cm' : ''}${hasAsym && hasLow ? ' / ' : ''}${hasLow ? '⚠ Score &lt;94%' : ''}</div>`
      : '';
    yTestRowsHtml = `
    <tr>
      <td style="padding:3px 0; vertical-align: top;">Y-Test Score D/E</td>
      <td style="text-align:right; font-weight:600; vertical-align: top; font-size: 7.5px; color: ${hasAsym || hasLow ? '#ef4444' : '#1e293b'}">
        ${scoreD}% / ${scoreE}%
        ${alertHtml}
      </td>
    </tr>
    <tr>
      <td style="padding:3px 0; vertical-align: top; font-size:7px;">Y-Test Alcances D (cm)</td>
      <td style="text-align:right; font-weight:600; vertical-align: top; font-size: 7px;">
        Ant:${antD} PM:${pmD} PL:${plD}
      </td>
    </tr>
    <tr>
      <td style="padding:3px 0; vertical-align: top; font-size:7px;">Y-Test Alcances E (cm)</td>
      <td style="text-align:right; font-weight:600; vertical-align: top; font-size: 7px;">
        Ant:${antE} PM:${pmE} PL:${plE}
      </td>
    </tr>`;
  } else if (yTestLegacyStr) {
    yTestRowsHtml = `<tr><td style="padding:3px 0; vertical-align: top;">Y-Test</td><td style="text-align:right; font-weight:600; vertical-align: top; font-size: 7.5px;">${yTestLegacyStr}</td></tr>`;
  }

  // Build Step Down HTML row(s)
  let stepDownRowsHtml = '';
  if (stepDownObj) {
    const sex = assessment.dadosMedidos?.sexo || 'M';
    const valLim = sex === 'M' ? 10 : 15;
    const risks: string[] = [];
    if ((stepDownObj.quedaPelvica || 0) > 5) risks.push('Queda Pélvica &gt;5°');
    if ((stepDownObj.aducaoQuadril || 0) > 10) risks.push('Adução &gt;10°');
    if ((stepDownObj.valgoDinamicoJoelho || 0) > valLim) risks.push(`Valgo &gt;${valLim}°`);
    if (stepDownObj.compExcentricoPrps > 0 && stepDownObj.compExcentricoPrps < 60) risks.push('PRPS &lt;60°');
    const riskColor = risks.length > 0 ? '#ef4444' : '#10b981';
    const riskLabel = risks.length > 0 ? `⚠ ${risks.join(', ')}` : '✓ Controle adequado';
    stepDownRowsHtml = `
    <tr>
      <td style="padding:3px 0; vertical-align: top;">Step Down</td>
      <td style="text-align:right; font-weight:600; vertical-align: top; font-size: 7.5px; color:${riskColor}">${riskLabel}</td>
    </tr>
    <tr>
      <td style="padding:3px 0; vertical-align: top; font-size:7px;">Step Down Métricas</td>
      <td style="text-align:right; font-weight:600; vertical-align: top; font-size: 7px;">
        QP:${stepDownObj.quedaPelvica || 0}° AQ:${stepDownObj.aducaoQuadril || 0}° VJ:${stepDownObj.valgoDinamicoJoelho || 0}° PRPS:${stepDownObj.compExcentricoPrps || 0}°
      </td>
    </tr>`;
  } else if (stepDownLegacyStr) {
    stepDownRowsHtml = `<tr><td style="padding:3px 0; vertical-align: top;">Step Down</td><td style="text-align:right; font-weight:600; vertical-align: top; font-size: 7.5px;">${stepDownLegacyStr}</td></tr>`;
  }

  let assessmentsList = [];
  if (allAssessments) {
    assessmentsList = allAssessments;
  } else {
    try {
      const res = await fetch('/api/assessments');
      const json = res.ok ? await res.json() : { success: false };
      if (json.success) assessmentsList = json.data;
    } catch (e) {
      console.error(e);
    }
  }

  const currentClientId = typeof assessment.clienteId === 'object' ? assessment.clienteId?._id : assessment.clienteId;
  const history = assessmentsList
    .filter((a: any) => {
      const aClientId = typeof a.clienteId === 'object' ? a.clienteId?._id : a.clienteId;
      return aClientId === currentClientId && a.data <= assessment.data && !a.pdf_url;
    })
    .sort((a: any, b: any) => a.data.localeCompare(b.data))
    .slice(-3);

  const dates = history.map((h: any) => formatDate(h.data).substring(0, 5));
  const weights = history.map((h: any) => h.dadosMedidos.peso);
  const fatPercents = history.map((h: any) => h.resultadosCalculados.percentualGordura);
  const muscles = history.map((h: any) => h.resultadosCalculados.massaMagra);

  const genderText = assessment.dadosMedidos.sexo === 'M' ? 'Masculino' : 'Feminino';

  // Helper para verificar assimetria no PDF
  function checkPDFAsymmetry(valD: any, valE: any) {
    const d = parseFloat(valD) || 0;
    const e = parseFloat(valE) || 0;
    const max = Math.max(d, e);
    if (max > 0 && (Math.abs(d - e) / max) > 0.10) {
      return `<div style="color:#ef4444; font-size:6px; font-weight:700; margin-top:2px;">Assimetria significativa</div>`;
    }
    return '';
  }

  function checkThomasPDFAsymmetry(valD: any, valE: any, label: any) {
    const d = parseFloat(valD) || 0;
    const e = parseFloat(valE) || 0;
    const max = Math.max(d, e);
    if (max > 0 && (Math.abs(d - e) / max) > 0.10) {
      return `<div style="color:#ef4444; font-size:6px; font-weight:700; margin-top:2px;">Assimetria significativa (${label})</div>`;
    }
    return '';
  }

  // Helper para goniometria status
  function getGonStatusDot(movement: any, value: any) {
    let color = '#10b981'; // Green (ideal)
    let label = 'Dentro do ideal';
    
    if (movement === 'quadrilFlexao1') {
      if (value < 60) { color = '#ef4444'; label = 'Abaixo do ideal'; }
      else if (value < 70) { color = '#f59e0b'; label = 'Atenção'; }
    } else if (movement === 'quadrilFlexao2') {
      if (value < 90) { color = '#ef4444'; label = 'Abaixo do ideal'; }
      else if (value < 100) { color = '#f59e0b'; label = 'Atenção'; }
    } else if (movement === 'quadrilRotInt') {
      if (value < 30) { color = '#ef4444'; label = 'Abaixo do ideal'; }
      else if (value < 40) { color = '#f59e0b'; label = 'Atenção'; }
    } else if (movement === 'quadrilRotExt') {
      if (value < 30) { color = '#ef4444'; label = 'Abaixo do ideal'; }
      else if (value < 40) { color = '#f59e0b'; label = 'Atenção'; }
    } else if (movement === 'joelhoFlexao') {
      if (value < 120) { color = '#ef4444'; label = 'Abaixo do ideal'; }
      else if (value < 135) { color = '#f59e0b'; label = 'Atenção'; }
    } else if (movement === 'joelhoPopliteo') {
      if (value < 145) { color = '#ef4444'; label = 'Abaixo do ideal'; }
      else if (value < 155) { color = '#f59e0b'; label = 'Atenção'; }
    } else if (movement === 'tornozeloDorsi1') {
      if (value < 25) { color = '#ef4444'; label = 'Abaixo do ideal'; }
      else if (value < 35) { color = '#f59e0b'; label = 'Atenção'; }
    } else if (movement === 'tornozeloDorsi2') {
      if (value < 15) { color = '#ef4444'; label = 'Abaixo do ideal'; }
      else if (value < 20) { color = '#f59e0b'; label = 'Atenção'; }
    } else if (movement === 'tornozeloFlexaoPlantar') {
      if (value < 30) { color = '#ef4444'; label = 'Abaixo do ideal'; }
      else if (value < 40) { color = '#f59e0b'; label = 'Atenção'; }
    } else if (movement === 'ombroRotInt') {
      if (value < 70) { color = '#ef4444'; label = 'Abaixo do ideal'; }
      else if (value < 80) { color = '#f59e0b'; label = 'Atenção'; }
    } else if (movement === 'ombroRotExt') {
      if (value < 70) { color = '#ef4444'; label = 'Abaixo do ideal'; }
      else if (value < 80) { color = '#f59e0b'; label = 'Atenção'; }
    } else if (movement === 'ombroAbducao') {
      if (value < 160) { color = '#ef4444'; label = 'Abaixo do ideal'; }
      else if (value < 180) { color = '#f59e0b'; label = 'Atenção'; }
    }
    return `<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background-color:${color}; margin-left:6px;" title="${label}"></span>`;
  }

  // Cálculos de composição corporal
  const pctGordura = assessment.resultadosCalculados.percentualGordura;
  const pctMassaMagra = 100 - pctGordura;
  
  // Percentuais de referência
  // Pollock 7 Dobras Reference table from user's image
  const referenceBF = {
    M: [
      { ageMin: 7, ageMax: 10, p10: 11.5, p30: 13.2, p50: 15.8, p70: 19.4, p90: 25.5 },
      { ageMin: 11, ageMax: 14, p10: 10.8, p30: 12.5, p50: 14.9, p70: 18.2, p90: 24.1 },
      { ageMin: 15, ageMax: 19, p10: 10.2, p30: 11.8, p50: 13.7, p70: 17.5, p90: 22.8 },
      { ageMin: 20, ageMax: 29, p10: 7.9,  p30: 12.7, p50: 16.6, p70: 20.6, p90: 26.3 },
      { ageMin: 30, ageMax: 39, p10: 11.9, p30: 16.5, p50: 19.7, p70: 23.0, p90: 27.8 },
      { ageMin: 40, ageMax: 49, p10: 14.9, p30: 19.1, p50: 21.9, p70: 24.8, p90: 29.2 },
      { ageMin: 50, ageMax: 59, p10: 16.7, p30: 20.7, p50: 23.2, p70: 26.0, p90: 30.3 },
      { ageMin: 60, ageMax: 200, p10: 17.6, p30: 21.3, p50: 23.7, p70: 26.7, p90: 30.9 }
    ],
    F: [
      { ageMin: 7, ageMax: 10, p10: 14.8, p30: 17.5, p50: 20.2, p70: 25.8, p90: 31.2 },
      { ageMin: 11, ageMax: 14, p10: 15.5, p30: 18.8, p50: 22.4, p70: 28.5, p90: 33.4 },
      { ageMin: 15, ageMax: 19, p10: 17.2, p30: 21.5, p50: 25.1, p70: 30.2, p90: 35.1 },
      { ageMin: 20, ageMax: 29, p10: 14.5, p30: 18.2, p50: 21.5, p70: 25.4, p90: 30.8 },
      { ageMin: 30, ageMax: 39, p10: 17.4, p30: 21.3, p50: 24.2, p70: 27.8, p90: 32.5 },
      { ageMin: 40, ageMax: 49, p10: 20.1, p30: 24.5, p50: 27.6, p70: 30.9, p90: 35.2 },
      { ageMin: 50, ageMax: 59, p10: 22.3, p30: 26.8, p50: 29.8, p70: 33.1, p90: 37.4 },
      { ageMin: 60, ageMax: 200, p10: 23.1, p30: 27.5, p50: 30.5, p70: 34.2, p90: 38.5 }
    ]
  };

  const currentSex = assessment.dadosMedidos.sexo || client.dadosPessoais?.sexo || 'M';
  const currentAge = assessment.dadosMedidos.idade || client.dadosPessoais?.idade || 30;
  
  const bfList = (referenceBF as any)[currentSex] || referenceBF['M'];
  const bfRow = bfList.find((r: any) => currentAge >= r.ageMin && currentAge <= r.ageMax) || bfList[bfList.length - 1];

  let bfClassification = 'Média';
  let bfBadgeClass = 'badge-green';
  if (pctGordura <= bfRow.p10) {
    bfClassification = 'Excelente';
    bfBadgeClass = 'badge-green';
  } else if (pctGordura <= bfRow.p30) {
    bfClassification = 'Bom';
    bfBadgeClass = 'badge-green';
  } else if (pctGordura <= bfRow.p50) {
    bfClassification = 'Média';
    bfBadgeClass = 'badge-green';
  } else if (pctGordura <= bfRow.p90) {
    bfClassification = 'Acima';
    bfBadgeClass = 'badge-orange';
  } else {
    bfClassification = 'Risco';
    bfBadgeClass = 'badge-red';
  }

  const bfMaxLimit = bfRow.p50; // The P50 limit determines inside vs above average
  const idealBFRange = `${bfRow.p10.toFixed(1)}% - ${bfRow.p50.toFixed(1)}%`;
  const refRCQ = currentSex === 'M' ? '< 0,83' : '< 0,78';

  // Estimativa sugerida para Foco do Planejamento
  let targetText = 'Não especificado';
  let totalSemanas = 0;
  const meses = assessment.dadosMedidos.objetivoMeses || 3;
  
  if (assessment.dadosMedidos.tipoObjetivo) {
    const sexo = assessment.dadosMedidos.sexo || client.dadosPessoais?.sexo || 'M';
    const objectives = assessment.dadosMedidos.tipoObjetivo.split(',').filter(Boolean);
    const freq = parseInt(assessment.dadosMedidos.freqSemanal) || 3;
    const nivel = assessment.dadosMedidos.nivelExperiencia || 'Iniciante / Retorno';
    const peso = Number(assessment.dadosMedidos.peso) || 70;
    totalSemanas = Math.round(meses * 4.33);

    const parts = objectives.map((tipo: string) => {
      const weeklyRate = calculateObjectiveWeeklyRate(peso, sexo, freq, nivel, tipo);
      const consTotal = (weeklyRate * 0.50 * totalSemanas).toFixed(2).replace('.', ',');
      const espTotal = (weeklyRate * 1.00 * totalSemanas).toFixed(2).replace('.', ',');
      const excTotal = (weeklyRate * 1.20 * totalSemanas).toFixed(2).replace('.', ',');
      const label = tipo === 'Emagrecimento' ? 'Perda' : 'Ganho';
      return `${label} (Cons/Esp/Excel): ${consTotal} / ${espTotal} / ${excTotal} kg`;
    });
    
    targetText = `Projeção para ${meses} ${meses === 1 ? 'mês' : 'meses'} (${totalSemanas} sem) | Nível: ${nivel} | ${parts.join(' e ')}`;
  }
  
  let diffBFText = '';
  if (pctGordura > bfMaxLimit) {
    diffBFText = `Você está ${(pctGordura - bfMaxLimit).toFixed(1)}% acima da média ideal`;
  } else {
    diffBFText = `Você está dentro da faixa ideal`;
  }

  const pdfWrapper = document.createElement('div');
  pdfWrapper.style.position = 'absolute';
  pdfWrapper.style.left = '0px';
  pdfWrapper.style.top = `${typeof window !== 'undefined' ? window.scrollY : 0}px`;
  pdfWrapper.style.width = '794px';
  pdfWrapper.style.opacity = '0';
  pdfWrapper.style.zIndex = '99999';
  pdfWrapper.style.pointerEvents = 'none';
  pdfWrapper.style.display = 'block';

  const pdfContainer = document.createElement('div');
  pdfContainer.style.background = '#ffffff';
  pdfContainer.style.padding = '0';
  pdfContainer.style.margin = '0';
  pdfContainer.style.width = '794px';
  pdfContainer.style.boxSizing = 'border-box';

  pdfWrapper.appendChild(pdfContainer);

  pdfContainer.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap');
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff;
      }
      .pdf-page {
        background: #ffffff;
        color: #1e293b;
        font-family: 'Inter', sans-serif;
        box-sizing: border-box;
        width: 794px;
        height: 1110px;
        padding: 30px 40px;
        position: relative;
        overflow: hidden;
        page-break-inside: avoid;
        page-break-after: always;
      }
      .pdf-page:last-child {
        page-break-after: avoid;
      }
      .font-outfit {
        font-family: 'Outfit', sans-serif;
      }
      .grid-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 10px;
        margin-bottom: 6px;
      }
      .logo-box {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .logo-img {
        width: 50px;
        height: 50px;
        border-radius: 8px;
        object-fit: cover;
      }
      .logo-title {
        font-size: 20px;
        font-weight: 800;
        color: #0e131f;
        margin: 0;
        letter-spacing: -0.5px;
      }
      .logo-subtitle {
        font-size: 8px;
        color: #64748b;
        margin: 2px 0 0 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .date-box {
        background: #f1f5f9;
        border-radius: 6px;
        padding: 6px 12px;
        text-align: center;
        border: 1px solid #cbd5e1;
      }
      .date-box span {
        font-size: 8px;
        color: #64748b;
        font-weight: 600;
        display: block;
        text-transform: uppercase;
      }
      .date-box strong {
        font-size: 13px;
        color: #0f172a;
        font-family: 'Outfit', sans-serif;
      }
      .client-bar {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        display: grid;
        grid-template-columns: 1.5fr 0.8fr 0.8fr 1.5fr;
        padding: 6px 12px;
        margin-bottom: 6px;
        font-size: 9px;
      }
      .client-bar-item {
        border-right: 1px solid #e2e8f0;
        padding: 0 8px;
      }
      .client-bar-item:last-child {
        border-right: none;
      }
      .client-bar-item span {
        color: #64748b;
        font-weight: 500;
        display: block;
        font-size: 8px;
        text-transform: uppercase;
        margin-bottom: 2px;
      }
      .client-bar-item strong {
        color: #0f172a;
        font-size: 10px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
      }
      .metric-badge {
        font-size: 7px;
        font-weight: 700;
        text-transform: uppercase;
        padding: 2px 6px;
        border-radius: 4px;
        display: inline-block;
        margin-top: 4px;
      }
      .badge-green { background: #dcfce7; color: #15803d; }
      .badge-orange { background: #ffedd5; color: #c2410c; }
      .badge-blue { background: #dbeafe; color: #1d4ed8; }
      .badge-red { background: #fee2e2; color: #b91c1c; }
      
      .table-data {
        width: 100%;
        border-collapse: collapse;
        font-size: 8.5px;
      }
      .table-data th {
        background: #f8fafc;
        color: #475569;
        font-weight: 600;
        text-align: left;
        padding: 5px 8px;
        border-bottom: 1px solid #e2e8f0;
        text-transform: uppercase;
        font-size: 8px;
      }
      .table-data td {
        padding: 5px 8px;
        border-bottom: 1px solid #f1f5f9;
        color: #334155;
      }
      .table-data tr:last-child td {
        border-bottom: none;
      }
      .bar-progress-container {
        background: #e2e8f0;
        height: 6px;
        border-radius: 3px;
        overflow: hidden;
        margin-top: 4px;
        position: relative;
      }
      .bar-progress-fill {
        height: 100%;
        border-radius: 3px;
      }
      .body-silhouette-svg {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 5px;
      }
    </style>

    <!-- PÁGINA 1 -->
    <div class="pdf-page">
      <!-- Header -->
      <div class="grid-header">
        <div class="logo-box">
          ${logoBase64 
            ? `<img src="${logoBase64}" class="logo-img" alt="Logo Clube Fitness Fisio">`
            : `<div style="width: 48px; height: 48px; border-radius: 8px; background: linear-gradient(135deg, #10b981 0%, #0d9488 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 18px; font-family: 'Outfit', sans-serif; box-shadow: 0 4px 8px rgba(16, 185, 129, 0.2); flex-shrink: 0;">CFF</div>`
          }
          <div>
            <h1 class="logo-title font-outfit">CLUBE FITNESS FISIO</h1>
            <p class="logo-subtitle">Avaliação Física e Composição Corporal</p>
          </div>
        </div>
        <div class="date-box">
          <span>Data da Avaliação</span>
          <strong>${formatDate(assessment.data)}</strong>
        </div>
      </div>

      <!-- Barra do Cliente -->
      <div class="client-bar" style="${assessment.dadosMedidos.tipoObjetivo ? 'border-bottom: none; border-radius: 8px 8px 0 0; margin-bottom: 0;' : ''}">
        <div class="client-bar-item">
          <span>Nome do Aluno</span>
          <strong>${client.dadosPessoais.nome}</strong>
        </div>
        <div class="client-bar-item">
          <span>Idade</span>
          <strong>${assessment.dadosMedidos.idade} anos</strong>
        </div>
        <div class="client-bar-item">
          <span>Sexo</span>
          <strong>${genderText}</strong>
        </div>
        <div class="client-bar-item">
          <span>Objetivo Principal</span>
          <strong title="${assessment.dadosMedidos.objetivoPrincipal || 'Geral'}">${assessment.dadosMedidos.objetivoPrincipal || 'Condicionamento'}</strong>
        </div>
      </div>

      <!-- Barra de Metas e Planejamento -->
      ${assessment.dadosMedidos.tipoObjetivo ? `
      <div class="client-bar" style="border-radius: 0 0 8px 8px; grid-template-columns: 1fr 1fr; margin-bottom: 8px;">
        <div class="client-bar-item">
          <span>Prazo do Objetivo</span>
          <strong>${assessment.dadosMedidos.objetivoMeses || 3} meses</strong>
        </div>
        <div class="client-bar-item" style="border-right: none;">
          <span>Frequência Semanal Estimada</span>
          <strong>${assessment.dadosMedidos.freqSemanal || 3}x por Semana</strong>
        </div>
      </div>
      ` : ''}

      <!-- Visão Geral Corporal -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 8px; background: #ffffff;">
        <div style="background: #0f172a; color: #ffffff; padding: 6px 12px; font-family: 'Outfit', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
          Visão Geral Corporal
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); padding: 10px; gap: 10px; background: #ffffff;">
          <!-- Massa Total -->
          <div style="border-right: 1px solid #f1f5f9; padding-right: 10px;">
            <span style="font-size: 8px; color: #64748b; font-weight: 600; text-transform: uppercase;">Massa Total</span>
            <div style="font-size: 18px; font-weight: 800; color: #0f172a; font-family: 'Outfit', sans-serif; margin-top: 2px;">${assessment.dadosMedidos.peso.toFixed(1)} <span style="font-size:10px; font-weight:500;">kg</span></div>
            <div class="bar-progress-container">
              <div class="bar-progress-fill" style="width: 75%; background: #10b981;"></div>
            </div>
            <span style="font-size: 7px; color: #94a3b8; display:block; margin-top: 3px;">Faixa saudável: 60 - 100 kg</span>
          </div>

          <!-- % Gordura -->
          <div style="border-right: 1px solid #f1f5f9; padding-right: 10px; padding-left: 5px;">
            <span style="font-size: 8px; color: #64748b; font-weight: 600; text-transform: uppercase;">% Gordura Corporal</span>
            <div style="display:flex; align-items:center; gap: 8px; margin-top: 2px;">
              <div style="font-size: 18px; font-weight: 800; color: #0f172a; font-family: 'Outfit', sans-serif;">${pctGordura.toFixed(1)}%</div>
              <!-- Mini Donut em SVG -->
              <svg width="22" height="22" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" fill="none" stroke="#f1f5f9" stroke-width="2.5"></circle>
                <circle cx="10" cy="10" r="8" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="${pctGordura.toFixed(0)} ${100 - pctGordura.toFixed(0)}" stroke-dashoffset="25"></circle>
              </svg>
            </div>
            <div class="metric-badge ${bfBadgeClass}">${bfClassification}</div>
          </div>

          <!-- Massa Magra -->
          <div style="border-right: 1px solid #f1f5f9; padding-right: 10px; padding-left: 5px;">
            <span style="font-size: 8px; color: #64748b; font-weight: 600; text-transform: uppercase;">Massa Magra</span>
            <div style="font-size: 18px; font-weight: 800; color: #0f172a; font-family: 'Outfit', sans-serif; margin-top: 2px;">${assessment.resultadosCalculados.massaMagra.toFixed(1)} <span style="font-size:10px; font-weight:500;">kg</span></div>
            <div class="bar-progress-container">
              <div class="bar-progress-fill" style="width: 80%; background: #10b981;"></div>
            </div>
            <div class="metric-badge badge-green">Excelente</div>
          </div>

          <!-- IMC -->
          <div style="padding-left: 5px;">
            <span style="font-size: 8px; color: #64748b; font-weight: 600; text-transform: uppercase;">IMC</span>
            <div style="font-size: 18px; font-weight: 800; color: #0f172a; font-family: 'Outfit', sans-serif; margin-top: 2px;">${assessment.resultadosCalculados.imc.toFixed(1)}</div>
            <!-- Régua colorida do IMC -->
            <div style="display:flex; height: 5px; border-radius: 2.5px; overflow:hidden; margin-top: 5px; background: #e2e8f0; width: 100%;">
              <div style="flex:18.5; background:#3b82f6;"></div> <!-- Baixo -->
              <div style="flex:6.4; background:#10b981;"></div>  <!-- Normal -->
              <div style="flex:5; background:#f59e0b;"></div>    <!-- Sobrepeso -->
              <div style="flex:5; background:#ef4444;"></div>    <!-- Obeso -->
            </div>
            <div class="metric-badge badge-green">${assessment.resultadosCalculados.imcClassificacao}</div>
          </div>
        </div>
      </div>

      <!-- Composição Corporal e Análise de Risco -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px;">
        <!-- Composição Corporal -->
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
          <h3 style="font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin: 0 0 8px 0; text-transform: uppercase;">Composição Corporal</h3>
          <div style="display:flex; justify-content:space-between; align-items: center; gap: 10px;">
            <table class="table-data" style="flex:1;">
              <tr style="background:#f8fafc; font-weight:600;"><td style="padding:4px 8px;">Componente</td><td style="padding:4px 8px;">Medido</td></tr>
              <tr><td>Massa Total</td><td style="font-weight:600;">${assessment.dadosMedidos.peso.toFixed(1)} kg</td></tr>
              <tr><td>Massa Magra</td><td style="font-weight:600; color:#10b981;">${assessment.resultadosCalculados.massaMagra.toFixed(1)} kg (${pctMassaMagra.toFixed(1)}%)</td></tr>
              <tr><td>Massa Gorda</td><td style="font-weight:600; color:#ef4444;">${assessment.resultadosCalculados.massaGorda.toFixed(1)} kg (${pctGordura.toFixed(1)}%)</td></tr>
              <tr><td>Gordura Corporal</td><td style="font-weight:600; color:#f59e0b;">${pctGordura.toFixed(1)}%</td></tr>
              <tr><td>IMC / RCQ</td><td style="font-weight:600;">${assessment.resultadosCalculados.imc.toFixed(1)} / ${assessment.resultadosCalculados.rcq.toFixed(2)}</td></tr>
            </table>

            <!-- Donut Chart em SVG -->
            <div style="text-align:center; padding-right: 5px;">
              <svg width="76" height="76" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="15.91549430918954" fill="none" stroke="#eaeaea" stroke-width="5.5"></circle>
                <!-- Segmento de Massa Magra (Green) -->
                <circle cx="21" cy="21" r="15.91549430918954" fill="none" stroke="#10b981" stroke-width="5.5" stroke-dasharray="${pctMassaMagra.toFixed(1)} ${pctGordura.toFixed(1)}" stroke-dashoffset="25"></circle>
                <!-- Segmento de Massa Gorda (Orange) -->
                <circle cx="21" cy="21" r="15.91549430918954" fill="none" stroke="#f59e0b" stroke-width="5.5" stroke-dasharray="${pctGordura.toFixed(1)} ${pctMassaMagra.toFixed(1)}" stroke-dashoffset="${25 - parseFloat(pctMassaMagra.toFixed(1))}"></circle>
              </svg>
              <div style="margin-top:6px; font-size:7px; display:flex; gap:6px; justify-content:center;">
                <span style="display:flex; align-items:center; gap:2px;"><span style="display:inline-block; width:5px; height:5px; background:#10b981; border-radius:50%;"></span>M.Magra</span>
                <span style="display:flex; align-items:center; gap:2px;"><span style="display:inline-block; width:5px; height:5px; background:#f59e0b; border-radius:50%;"></span>M.Gorda</span>
              </div>
            </div>
          </div>
          <div style="background:#f8fafc; border-radius:6px; border:1px solid #e2e8f0; padding:6px; margin-top:8px; font-size:8px; text-align:center;">
            Referência de gordura ideal para ${currentSex === 'M' ? 'homens' : 'mulheres'} (${currentAge} anos): <strong>${idealBFRange} (Excelente a Média)</strong>. <span style="color:#c2410c; font-weight:600;">${diffBFText}</span>
          </div>
        </div>

        <!-- Análise de Risco & Saúde -->
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
          <h3 style="font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin: 0 0 8px 0; text-transform: uppercase;">Análise de Risco e Saúde Geral</h3>
          <div style="display:grid; grid-template-columns: 0.9fr 1.1fr; gap:10px;">
            <div style="display:flex; flex-direction:column; gap:6px;">
              <!-- RCQ -->
              <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:6px; text-align:center;">
                <span style="font-size:7.5px; color:#64748b; font-weight:600; text-transform:uppercase;">RCQ</span>
                <div style="font-size:14px; font-weight:700; color:#0f172a; margin: 1px 0;">${assessment.resultadosCalculados.rcq.toFixed(2)}</div>
                <div class="metric-badge ${assessment.resultadosCalculados.rcqClassificacao.includes('Alto') ? 'badge-red' : (assessment.resultadosCalculados.rcqClassificacao.includes('Moderado') ? 'badge-orange' : 'badge-green')}" style="font-size: 6px; padding: 1px 4px;">
                  ${assessment.resultadosCalculados.rcqClassificacao}
                </div>
                <div style="font-size:6.5px; color:#94a3b8; margin-top:4px;">Ideal homens: ${refRCQ}</div>
              </div>
              <!-- Saúde Geral -->
              <table style="width:100%; font-size:7.5px; border-collapse:collapse;">
                <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:2.5px 0;">Sono</td><td style="font-weight:600; text-align:right;">${assessment.dadosMedidos.saudeGeral?.sono || '7-8h'}</td></tr>
                <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:2.5px 0;">Ativ. Física</td><td style="font-weight:600; text-align:right; color:#15803d;">${assessment.dadosMedidos.saudeGeral?.atividadeFisica || '4x/sem'} ✓</td></tr>
              </table>
            </div>

            <div style="border-left:1px solid #f1f5f9; padding-left:10px;">
              <span style="font-size:7.5px; color:#64748b; font-weight:600; text-transform:uppercase; display:block; margin-bottom:4px;">Análise Clínica complementar</span>
              <table style="width:100%; font-size:7.5px; border-collapse:collapse;">
                <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:4px 0;">Nutrição</td><td style="text-align:right; font-weight:600; color:#15803d;">${assessment.dadosMedidos.saudeGeral?.nutricao || 'Adequada'} ✓</td></tr>
                <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:4px 0;">Medicamentos</td><td style="text-align:right; font-weight:600;">${assessment.dadosMedidos.saudeGeral?.medicamentos || 'Nenhum'}</td></tr>
                <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:4px 0;">Cirurgias</td><td style="text-align:right; font-weight:600;">${assessment.dadosMedidos.saudeGeral?.cirurgias || 'Nenhuma'}</td></tr>
                <tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:4px 0;">Queixas</td><td style="text-align:right; font-weight:600;">${assessment.dadosMedidos.saudeGeral?.queixas || 'Nenhuma'}</td></tr>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Dobras e Circunferências -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <!-- Dobras Cutâneas -->
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
          <h3 style="font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin: 0 0 8px 0; text-transform: uppercase;">Dobras Cutâneas (mm)</h3>
          
          <div style="display:flex; gap: 10px;">
            <!-- Silhueta com pontos -->
                                    <div style="width: 80px; height: 160px; position: relative; flex-shrink: 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 5px; display: flex; align-items: center; justify-content: center;">
              <img src="${avatarB64}" style="width: 100%; height: 100%; object-fit: contain; opacity: 0.85;" />
              <svg viewBox="0 0 100 200" width="100" height="200" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                <!-- Green Dots for Dobras -->
                <circle cx="43" cy="50" r="3" fill="#10b981" title="Peitoral"></circle>
                <circle cx="34" cy="65" r="3" fill="#10b981" title="TrÃ­ceps"></circle>
                <circle cx="58" cy="55" r="3" fill="#10b981" title="Subescapular"></circle>
                <circle cx="41" cy="60" r="3" fill="#10b981" title="Subaxilar"></circle>
                <circle cx="56" cy="72" r="3" fill="#10b981" title="Supra-ilÃ­aca"></circle>
                <circle cx="49" cy="74" r="3" fill="#10b981" title="AbdÃ´men"></circle>
                <circle cx="46" cy="120" r="3" fill="#10b981" title="Coxa"></circle>
              </svg>
            </div>

            <!-- Tabela de Dados -->
            <div style="flex:1;">
              <table class="table-data" style="font-size: 8px;">
                <tr><td style="font-weight:600; padding:3px 6px;">Região</td><td style="font-weight:600; padding:3px 6px; text-align:right;">Valor</td></tr>
                <tr><td style="padding:2.5px 6px;">Peitoral</td><td style="text-align:right; font-weight:600;">${assessment.dadosMedidos.dobras.peitoral || 0} mm</td></tr>
                <tr><td style="padding:2.5px 6px;">Tríceps</td><td style="text-align:right; font-weight:600;">${assessment.dadosMedidos.dobras.triceps || 0} mm</td></tr>
                <tr><td style="padding:2.5px 6px;">Subescapular</td><td style="text-align:right; font-weight:600;">${assessment.dadosMedidos.dobras.subescapular || 0} mm</td></tr>
                <tr><td style="padding:2.5px 6px;">Subaxilar (Axilar Média)</td><td style="text-align:right; font-weight:600;">${assessment.dadosMedidos.dobras.subaxilar || 0} mm</td></tr>
                <tr><td style="padding:2.5px 6px;">Supra-ilíaca</td><td style="text-align:right; font-weight:600;">${assessment.dadosMedidos.dobras.suprailiaca || 0} mm</td></tr>
                <tr><td style="padding:2.5px 6px;">Abdômen</td><td style="text-align:right; font-weight:600;">${assessment.dadosMedidos.dobras.abdomen || 0} mm</td></tr>
                <tr><td style="padding:2.5px 6px;">Coxa</td><td style="text-align:right; font-weight:600;">${assessment.dadosMedidos.dobras.coxa || 0} mm</td></tr>
              </table>
            </div>
          </div>

          <div style="display:flex; justify-content:center; margin-top:8px; border-top:1px dashed #cbd5e1; padding-top:6px; font-size:9px; font-family:'Outfit', sans-serif;">
            <div>Soma das Dobras: <strong style="color:#10b981; font-size:11px;">${assessment.dadosMedidos.somaDobras || 124} mm</strong></div>
          </div>
        </div>

        <!-- Circunferências -->
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
          <h3 style="font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin: 0 0 8px 0; text-transform: uppercase;">Circunferências (Perímetros em cm)</h3>
          
          <div style="display:flex; gap: 10px;">
            <!-- Silhueta com linhas -->
                                    <div style="width: 80px; height: 160px; position: relative; flex-shrink: 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 5px; display: flex; align-items: center; justify-content: center;">
              <img src="${avatarB64}" style="width: 100%; height: 100%; object-fit: contain; opacity: 0.85;" />
              <svg viewBox="0 0 100 200" width="100" height="200" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                <!-- Green Lines for Circunferencias -->
                <line x1="45" y1="30" x2="55" y2="30" stroke="#10b981" stroke-width="2" title="Pescoço"></line>
                <line x1="38" y1="40" x2="62" y2="40" stroke="#10b981" stroke-width="2" title="Ombros"></line>
                <line x1="40" y1="52" x2="60" y2="52" stroke="#10b981" stroke-width="2" title="TÃ³rax"></line>
                <line x1="44" y1="75" x2="56" y2="75" stroke="#10b981" stroke-width="2" title="Cintura"></line>
                <line x1="44" y1="84" x2="56" y2="84" stroke="#10b981" stroke-width="2" title="AbdÃ´men"></line>
                <line x1="42" y1="92" x2="58" y2="92" stroke="#10b981" stroke-width="2" title="Quadril"></line>
                <line x1="42" y1="125" x2="49" y2="125" stroke="#10b981" stroke-width="2"></line>
                <line x1="51" y1="125" x2="58" y2="125" stroke="#10b981" stroke-width="2"></line>
              </svg>
            </div>

            <!-- Tabela de Dados -->
            <div style="flex:1;">
              <table class="table-data" style="font-size: 7.5px;">
                <tr><td style="font-weight:600; padding:2px 4px;">Região</td><td style="font-weight:600; padding:2px 4px; text-align:right;">Valor</td></tr>
                <tr><td style="padding:1.5px 4px;">Pescoço</td><td style="text-align:right; font-weight:600;">${assessment.dadosMedidos.circunferencias.pescoco || 0} cm</td></tr>
                <tr><td style="padding:1.5px 4px;">Ombros</td><td style="text-align:right; font-weight:600;">${assessment.dadosMedidos.circunferencias.ombros || 0} cm</td></tr>
                <tr><td style="padding:1.5px 4px;">Tórax</td><td style="text-align:right; font-weight:600;">${assessment.dadosMedidos.circunferencias.torax || 0} cm</td></tr>
                <tr><td style="padding:1.5px 4px;">Braço Dir. / Esq.</td><td style="text-align:right; font-weight:600;">${assessment.dadosMedidos.circunferencias.braçoD || 0} / ${assessment.dadosMedidos.circunferencias.braçoE || 0} cm</td></tr>
                <tr><td style="padding:1.5px 4px;">Antebraço Dir. / Esq.</td><td style="text-align:right; font-weight:600;">${assessment.dadosMedidos.circunferencias.antebraçoD || 0} / ${assessment.dadosMedidos.circunferencias.antebraçoE || 0} cm</td></tr>
                <tr><td style="padding:1.5px 4px;">Cintura</td><td style="text-align:right; font-weight:600;">${assessment.dadosMedidos.circunferencias.cintura || 0} cm</td></tr>
                <tr><td style="padding:1.5px 4px;">Abdômen</td><td style="text-align:right; font-weight:600;">${assessment.dadosMedidos.circunferencias.abdomen || 0} cm</td></tr>
                <tr><td style="padding:1.5px 4px;">Quadril</td><td style="text-align:right; font-weight:600;">${assessment.dadosMedidos.circunferencias.quadril || 0} cm</td></tr>
                <tr><td style="padding:1.5px 4px;">Coxa Dir. / Esq.</td><td style="text-align:right; font-weight:600;">${assessment.dadosMedidos.circunferencias.coxaD || 0} / ${assessment.dadosMedidos.circunferencias.coxaE || 0} cm</td></tr>
                <tr><td style="padding:1.5px 4px;">Panturrilha Dir. / Esq.</td><td style="text-align:right; font-weight:600;">${assessment.dadosMedidos.circunferencias.panturrilhaD || 0} / ${assessment.dadosMedidos.circunferencias.panturrilhaE || 0} cm</td></tr>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Footer Decorado Página 1 -->
      <div style="position: absolute; bottom: 30px; left: 45px; right: 45px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid #e2e8f0; padding-top:6px; font-size:7px; color:#64748b;">
        <span>Clube Fitness Fisio &nbsp;|&nbsp; Fisioterapia e Quiropraxia</span>
        <span>Sua saúde, nosso propósito.</span>
        <span>Página 1 de 2</span>
      </div>
    </div>

    <!-- PÁGINA 2 -->
    <div class="pdf-page">
      <!-- Mini Header da Página 2 -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <h2 class="font-outfit" style="margin:0; font-size:14px; color:#0e131f;">CLUBE FITNESS FISIO</h2>
          <span style="font-size:10px; color:#94a3b8;">/</span>
          <span style="font-size:9.5px; color:#64748b; font-weight:600; text-transform:uppercase;">Relatório de Desempenho</span>
        </div>
        <div style="font-size:9px; color:#475569;">
          Aluno: <strong>${client.dadosPessoais.nome}</strong> &nbsp;|&nbsp; Data: ${formatDate(assessment.data)}
        </div>
      </div>

      <!-- Flexibilidade e Mobilidade (Goniometria) -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 8px;">
        <h3 style="font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin: 0 0 8px 0; text-transform: uppercase;">Flexibilidade e Mobilidade Articular (Goniometria)</h3>
        
        <div style="display: flex; gap: 8px; align-items: flex-start;">
          <div style="flex: 1; display:grid; grid-template-columns: repeat(5, 1fr); gap: 6px;">
            <!-- Quadril -->
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:6px;">
              <strong style="font-size:8.5px; color:#0f172a; display:block; border-bottom:1px solid #e2e8f0; padding-bottom:2px; margin-bottom:4px; text-transform:uppercase;">Quadril</strong>
              <table style="width:100%; font-size:8px; border-collapse:collapse;">
                <tr>
                  <td style="padding:2px 0; vertical-align: top;">F. Quadril (1)</td>
                  <td style="text-align:right; font-weight:600; vertical-align: top;">
                    ${assessment.dadosMedidos.goniometria?.quadrilFlexao1D || 0}°${getGonStatusDot('quadrilFlexao1', assessment.dadosMedidos.goniometria?.quadrilFlexao1D)} / ${assessment.dadosMedidos.goniometria?.quadrilFlexao1E || 0}°${getGonStatusDot('quadrilFlexao1', assessment.dadosMedidos.goniometria?.quadrilFlexao1E)}
                    ${checkPDFAsymmetry(assessment.dadosMedidos.goniometria?.quadrilFlexao1D, assessment.dadosMedidos.goniometria?.quadrilFlexao1E)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:2px 0; vertical-align: top;">F. Quadril (2)</td>
                  <td style="text-align:right; font-weight:600; vertical-align: top;">
                    ${assessment.dadosMedidos.goniometria?.quadrilFlexao2D || 0}°${getGonStatusDot('quadrilFlexao2', assessment.dadosMedidos.goniometria?.quadrilFlexao2D)} / ${assessment.dadosMedidos.goniometria?.quadrilFlexao2E || 0}°${getGonStatusDot('quadrilFlexao2', assessment.dadosMedidos.goniometria?.quadrilFlexao2E)}
                    ${checkPDFAsymmetry(assessment.dadosMedidos.goniometria?.quadrilFlexao2D, assessment.dadosMedidos.goniometria?.quadrilFlexao2E)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:2px 0; vertical-align: top;">RQI</td>
                  <td style="text-align:right; font-weight:600; vertical-align: top;">
                    ${assessment.dadosMedidos.goniometria?.quadrilRotIntD || 0}°${getGonStatusDot('quadrilRotInt', assessment.dadosMedidos.goniometria?.quadrilRotIntD)} / ${assessment.dadosMedidos.goniometria?.quadrilRotIntE || 0}°${getGonStatusDot('quadrilRotInt', assessment.dadosMedidos.goniometria?.quadrilRotIntE)}
                    ${checkPDFAsymmetry(assessment.dadosMedidos.goniometria?.quadrilRotIntD, assessment.dadosMedidos.goniometria?.quadrilRotIntE)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:2px 0; vertical-align: top;">RQE</td>
                  <td style="text-align:right; font-weight:600; vertical-align: top;">
                    ${assessment.dadosMedidos.goniometria?.quadrilRotExtD || 0}°${getGonStatusDot('quadrilRotExt', assessment.dadosMedidos.goniometria?.quadrilRotExtD)} / ${assessment.dadosMedidos.goniometria?.quadrilRotExtE || 0}°${getGonStatusDot('quadrilRotExt', assessment.dadosMedidos.goniometria?.quadrilRotExtE)}
                    ${checkPDFAsymmetry(assessment.dadosMedidos.goniometria?.quadrilRotExtD, assessment.dadosMedidos.goniometria?.quadrilRotExtE)}
                  </td>
                </tr>
              </table>
            </div>

            <!-- Joelho -->
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:6px;">
              <strong style="font-size:8.5px; color:#0f172a; display:block; border-bottom:1px solid #e2e8f0; padding-bottom:2px; margin-bottom:4px; text-transform:uppercase;">Joelho</strong>
              <table style="width:100%; font-size:8px; border-collapse:collapse;">
                <tr>
                  <td style="padding:2px 0; vertical-align: top;">F. Joelho</td>
                  <td style="text-align:right; font-weight:600; vertical-align: top;">
                    ${assessment.dadosMedidos.goniometria?.joelhoFlexaoD || 0}°${getGonStatusDot('joelhoFlexao', assessment.dadosMedidos.goniometria?.joelhoFlexaoD)} / ${assessment.dadosMedidos.goniometria?.joelhoFlexaoE || 0}°${getGonStatusDot('joelhoFlexao', assessment.dadosMedidos.goniometria?.joelhoFlexaoE)}
                    ${checkPDFAsymmetry(assessment.dadosMedidos.goniometria?.joelhoFlexaoD, assessment.dadosMedidos.goniometria?.joelhoFlexaoE)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:2px 0; vertical-align: top;">Poplíteo</td>
                  <td style="text-align:right; font-weight:600; vertical-align: top;">
                    ${assessment.dadosMedidos.goniometria?.joelhoPopliteoD || 0}°${getGonStatusDot('joelhoPopliteo', assessment.dadosMedidos.goniometria?.joelhoPopliteoD)} / ${assessment.dadosMedidos.goniometria?.joelhoPopliteoE || 0}°${getGonStatusDot('joelhoPopliteo', assessment.dadosMedidos.goniometria?.joelhoPopliteoE)}
                    ${checkPDFAsymmetry(assessment.dadosMedidos.goniometria?.joelhoPopliteoD, assessment.dadosMedidos.goniometria?.joelhoPopliteoE)}
                  </td>
                </tr>
              </table>
            </div>

            <!-- Tornozelo -->
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:6px;">
              <strong style="font-size:8.5px; color:#0f172a; display:block; border-bottom:1px solid #e2e8f0; padding-bottom:2px; margin-bottom:4px; text-transform:uppercase;">Tornozelo</strong>
              <table style="width:100%; font-size:8px; border-collapse:collapse;">
                <tr>
                  <td style="padding:2px 0; vertical-align: top;">Dorsi (1)</td>
                  <td style="text-align:right; font-weight:600; vertical-align: top;">
                    ${assessment.dadosMedidos.goniometria?.tornozeloDorsi1D || 0}°${getGonStatusDot('tornozeloDorsi1', assessment.dadosMedidos.goniometria?.tornozeloDorsi1D)} / ${assessment.dadosMedidos.goniometria?.tornozeloDorsi1E || 0}°${getGonStatusDot('tornozeloDorsi1', assessment.dadosMedidos.goniometria?.tornozeloDorsi1E)}
                    ${checkPDFAsymmetry(assessment.dadosMedidos.goniometria?.tornozeloDorsi1D, assessment.dadosMedidos.goniometria?.tornozeloDorsi1E)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:2px 0; vertical-align: top;">Dorsi (2)</td>
                  <td style="text-align:right; font-weight:600; vertical-align: top;">
                    ${assessment.dadosMedidos.goniometria?.tornozeloDorsi2D || 0}°${getGonStatusDot('tornozeloDorsi2', assessment.dadosMedidos.goniometria?.tornozeloDorsi2D)} / ${assessment.dadosMedidos.goniometria?.tornozeloDorsi2E || 0}°${getGonStatusDot('tornozeloDorsi2', assessment.dadosMedidos.goniometria?.tornozeloDorsi2E)}
                    ${checkPDFAsymmetry(assessment.dadosMedidos.goniometria?.tornozeloDorsi2D, assessment.dadosMedidos.goniometria?.tornozeloDorsi2E)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:2px 0; vertical-align: top;">F. Plantar</td>
                  <td style="text-align:right; font-weight:600; vertical-align: top;">
                    ${assessment.dadosMedidos.goniometria?.tornozeloFlexaoPlantarD || 0}°${getGonStatusDot('tornozeloFlexaoPlantar', assessment.dadosMedidos.goniometria?.tornozeloFlexaoPlantarD)} / ${assessment.dadosMedidos.goniometria?.tornozeloFlexaoPlantarE || 0}°${getGonStatusDot('tornozeloFlexaoPlantar', assessment.dadosMedidos.goniometria?.tornozeloFlexaoPlantarE)}
                    ${checkPDFAsymmetry(assessment.dadosMedidos.goniometria?.tornozeloFlexaoPlantarD, assessment.dadosMedidos.goniometria?.tornozeloFlexaoPlantarE)}
                  </td>
                </tr>
              </table>
            </div>

            <!-- Ombro -->
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:6px;">
              <strong style="font-size:8.5px; color:#0f172a; display:block; border-bottom:1px solid #e2e8f0; padding-bottom:2px; margin-bottom:4px; text-transform:uppercase;">Ombro</strong>
              <table style="width:100%; font-size:8px; border-collapse:collapse;">
                <tr>
                  <td style="padding:2px 0; vertical-align: top;">ROI</td>
                  <td style="text-align:right; font-weight:600; vertical-align: top;">
                    ${assessment.dadosMedidos.goniometria?.ombroRotIntD || 0}°${getGonStatusDot('ombroRotInt', assessment.dadosMedidos.goniometria?.ombroRotIntD)} / ${assessment.dadosMedidos.goniometria?.ombroRotIntE || 0}°${getGonStatusDot('ombroRotInt', assessment.dadosMedidos.goniometria?.ombroRotIntE)}
                    ${checkPDFAsymmetry(assessment.dadosMedidos.goniometria?.ombroRotIntD, assessment.dadosMedidos.goniometria?.ombroRotIntE)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:2px 0; vertical-align: top;">ROE</td>
                  <td style="text-align:right; font-weight:600; vertical-align: top;">
                    ${assessment.dadosMedidos.goniometria?.ombroRotExtD || 0}°${getGonStatusDot('ombroRotExt', assessment.dadosMedidos.goniometria?.ombroRotExtD)} / ${assessment.dadosMedidos.goniometria?.ombroRotExtE || 0}°${getGonStatusDot('ombroRotExt', assessment.dadosMedidos.goniometria?.ombroRotExtE)}
                    ${checkPDFAsymmetry(assessment.dadosMedidos.goniometria?.ombroRotExtD, assessment.dadosMedidos.goniometria?.ombroRotExtE)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:2px 0; vertical-align: top;">Latíssimo</td>
                  <td style="text-align:right; font-weight:600; vertical-align: top;">
                    ${assessment.dadosMedidos.goniometria?.ombroAbducaoD || 0}°${getGonStatusDot('ombroAbducao', assessment.dadosMedidos.goniometria?.ombroAbducaoD)} / ${assessment.dadosMedidos.goniometria?.ombroAbducaoE || 0}°${getGonStatusDot('ombroAbducao', assessment.dadosMedidos.goniometria?.ombroAbducaoE)}
                    ${checkPDFAsymmetry(assessment.dadosMedidos.goniometria?.ombroAbducaoD, assessment.dadosMedidos.goniometria?.ombroAbducaoE)}
                  </td>
                </tr>
              </table>
            </div>

            <!-- Testes Especiais -->
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:6px;">
              <strong style="font-size:8.5px; color:#0f172a; display:block; border-bottom:1px solid #e2e8f0; padding-bottom:2px; margin-bottom:4px; text-transform:uppercase;">Testes Especiais</strong>
              <table style="width:100%; font-size:8px; border-collapse:collapse;">
                <tr>
                  <td style="padding:3px 0; vertical-align: top;">OBER D/E</td>
                  <td style="text-align:right; font-weight:600; vertical-align: top; color: ${assessment.dadosMedidos.testesEspeciais?.oberD === 'Positivo' || assessment.dadosMedidos.testesEspeciais?.oberE === 'Positivo' ? '#ef4444' : '#1e293b'};">
                    ${assessment.dadosMedidos.testesEspeciais?.oberD || 'Negativo'} / ${assessment.dadosMedidos.testesEspeciais?.oberE || 'Negativo'}
                  </td>
                </tr>
                <tr>
                  <td style="padding:3px 0; vertical-align: top;">Thomas Ilio.</td>
                  <td style="text-align:right; font-weight:600; vertical-align: top; color: ${assessment.dadosMedidos.testesEspeciais?.thomasD === 'Positivo' || assessment.dadosMedidos.testesEspeciais?.thomasE === 'Positivo' ? '#ef4444' : '#1e293b'};">
                    ${assessment.dadosMedidos.testesEspeciais?.thomasD === 'Positivo' ? `${assessment.dadosMedidos.testesEspeciais.thomasIliopsoasD || 0}°` : 'Neg.'} / 
                    ${assessment.dadosMedidos.testesEspeciais?.thomasE === 'Positivo' ? `${assessment.dadosMedidos.testesEspeciais.thomasIliopsoasE || 0}°` : 'Neg.'}
                    ${checkThomasPDFAsymmetry(assessment.dadosMedidos.testesEspeciais?.thomasIliopsoasD, assessment.dadosMedidos.testesEspeciais?.thomasIliopsoasE, 'Iliopsoas')}
                  </td>
                </tr>
                <tr>
                  <td style="padding:3px 0; vertical-align: top;">Thomas Reto.</td>
                  <td style="text-align:right; font-weight:600; vertical-align: top; color: ${assessment.dadosMedidos.testesEspeciais?.thomasD === 'Positivo' || assessment.dadosMedidos.testesEspeciais?.thomasE === 'Positivo' ? '#ef4444' : '#1e293b'};">
                    ${assessment.dadosMedidos.testesEspeciais?.thomasD === 'Positivo' ? `${assessment.dadosMedidos.testesEspeciais.thomasRetofemoralD || 0}°` : 'Neg.'} / 
                    ${assessment.dadosMedidos.testesEspeciais?.thomasE === 'Positivo' ? `${assessment.dadosMedidos.testesEspeciais.thomasRetofemoralE || 0}°` : 'Neg.'}
                    ${checkThomasPDFAsymmetry(assessment.dadosMedidos.testesEspeciais?.thomasRetofemoralD, assessment.dadosMedidos.testesEspeciais?.thomasRetofemoralE, 'Retofemoral')}
                  </td>
                </tr>
                ${hasMaigneData ? `
                <tr>
                  <td style="padding:3px 0; vertical-align: top;">Maigne ADM</td>
                  <td style="text-align:right; font-weight:600; vertical-align: top; font-size: 7px;">
                    F:${maigneObj.flexao} / E:${maigneObj.extensao} / RD:${maigneObj.rotacaoD} / RE:${maigneObj.rotacaoE} / ID:${maigneObj.inclinacaoD} / IE:${maigneObj.inclinacaoE}
                  </td>
                </tr>
                <tr>
                  <td style="padding:3px 0; vertical-align: top;">Maigne Dor (EVA)</td>
                  <td style="text-align:right; font-weight:600; vertical-align: top; font-size: 7px; color: ${[maigneObj.flexaoEVA, maigneObj.extensaoEVA, maigneObj.rotacaoDEVA, maigneObj.rotacaoEEVA, maigneObj.inclinacaoDEVA, maigneObj.inclinacaoEEVA].some(val => val > 0) ? '#ef4444' : '#1e293b'};">
                    F:${maigneObj.flexaoEVA} / E:${maigneObj.extensaoEVA} / RD:${maigneObj.rotacaoDEVA} / RE:${maigneObj.rotacaoEEVA} / ID:${maigneObj.inclinacaoDEVA} / IE:${maigneObj.inclinacaoEEVA}
                  </td>
                </tr>
                ` : ''}
                ${hasMaigneData && maigneObj.observacoes && maigneObj.observacoes.trim() !== '' ? `
                <tr>
                  <td style="padding:3px 0; vertical-align: top;">Maigne Obs.</td>
                  <td style="text-align:right; font-weight:600; vertical-align: top; font-size: 7.5px;">
                    ${maigneObj.observacoes}
                  </td>
                </tr>
                ` : ''}
                ${assessment.dadosMedidos.testesEspeciais?.maigne && !hasMaigneData && !assessment.dadosMedidos.testesEspeciais.maigne.startsWith('{') && assessment.dadosMedidos.testesEspeciais.maigne.trim() !== '' ? `
                <tr>
                  <td style="padding:3px 0; vertical-align: top;">Maigne Obs.</td>
                  <td style="text-align:right; font-weight:600; vertical-align: top; font-size: 7.5px;">
                    ${assessment.dadosMedidos.testesEspeciais.maigne}
                  </td>
                </tr>
                ` : ''}
                ${stepDownRowsHtml}
                ${yTestRowsHtml}
                ${termografiaIsRealizado && !hasTermografiaImage ? `
                <tr>
                  <td style="padding:3px 0; vertical-align: top;">Termografia</td>
                  <td style="text-align:right; font-weight:600; vertical-align: top; font-size: 7.5px;">Realizada (imagem na pág. 3)</td>
                </tr>` : termografiaIsRealizado ? `
                <tr>
                  <td style="padding:3px 0; vertical-align: top;">Termografia</td>
                  <td style="text-align:right; font-weight:600; vertical-align: top; font-size: 7.5px; color:#10b981;">✓ Imagem incluída (ver pág. 3)</td>
                </tr>` : ''}
              </table>
            </div>
          </div>
          ${hasMaigneData ? `
          <div style="width: 180px; border-left: 1px solid #e2e8f0; padding-left: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0;">
            <strong style="font-size: 8px; color: #0f172a; display: block; margin-bottom: 4px; text-transform: uppercase; text-align: center; font-family: 'Outfit', sans-serif;">Estrela de Maigne</strong>
            ${maigneSvgHtml}
          </div>
          ` : ''}
        </div>

        <div style="margin-top:6px; font-size:7px; color:#64748b; display:flex; gap:10px; justify-content:center;">
          <span>Legenda de Referência:</span>
          <span><span style="display:inline-block; width:5px; height:5px; background:#10b981; border-radius:50%;"></span> Dentro do ideal</span>
          <span><span style="display:inline-block; width:5px; height:5px; background:#f59e0b; border-radius:50%;"></span> Atenção (Amplitude limítrofe)</span>
          <span><span style="display:inline-block; width:5px; height:5px; background:#ef4444; border-radius:50%;"></span> Abaixo do ideal (Mobilidade reduzida)</span>
        </div>
      </div>

      <!-- Evolução Corporal (Histórico de Gráficos e Tabela) -->
      <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 12px; margin-bottom: 12px;">
        <!-- Gráficos de Evolução -->
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
          <h3 style="font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin: 0 0 8px 0; text-transform: uppercase;">Evolução Corporal (Últimos 3 Testes)</h3>
          
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; height: 110px;">
            <div style="height:100%;">
              <div style="font-size:7.5px; text-align:center; color:#64748b; margin-bottom:2px; font-weight:600;">MASSA TOTAL (kg)</div>
              <div style="height:90px; position:relative; text-align:center;"><canvas id="pdfWeightChart" width="220" height="90" style="max-width:100%; display:inline-block;"></canvas></div>
            </div>
            <div style="height:100%;">
              <div style="font-size:7.5px; text-align:center; color:#64748b; margin-bottom:2px; font-weight:600;">% GORDURA</div>
              <div style="height:90px; position:relative; text-align:center;"><canvas id="pdfFatChart" width="220" height="90" style="max-width:100%; display:inline-block;"></canvas></div>
            </div>
            <div style="height:100%;">
              <div style="font-size:7.5px; text-align:center; color:#64748b; margin-bottom:2px; font-weight:600;">MASSA MAGRA (kg)</div>
              <div style="height:90px; position:relative; text-align:center;"><canvas id="pdfMuscleChart" width="220" height="90" style="max-width:100%; display:inline-block;"></canvas></div>
            </div>
          </div>
        </div>

        <!-- Tabela do Histórico -->
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
          <h3 style="font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin: 0 0 8px 0; text-transform: uppercase;">Histórico de Avaliações</h3>
          <table class="table-data" style="font-size:7.5px; width:100%;">
            <thead>
              <tr>
                <th style="padding:4px;">Data</th>
                <th style="padding:4px; text-align:right;">Peso</th>
                <th style="padding:4px; text-align:right;">% Gord.</th>
                <th style="padding:4px; text-align:right;">M.Magra</th>
                <th style="padding:4px; text-align:right;">IMC</th>
              </tr>
            </thead>
            <tbody>
              ${history.map((h: any) => `
                <tr>
                  <td style="padding:4px;"><strong>${formatDate(h.data)}</strong></td>
                  <td style="padding:4px; text-align:right;">${h.dadosMedidos.peso.toFixed(1)} kg</td>
                  <td style="padding:4px; text-align:right; color:#c2410c; font-weight:600;">${h.resultadosCalculados.percentualGordura.toFixed(1)}%</td>
                  <td style="padding:4px; text-align:right; color:#15803d; font-weight:600;">${h.resultadosCalculados.massaMagra.toFixed(1)} kg</td>
                  <td style="padding:4px; text-align:right;">${h.resultadosCalculados.imc.toFixed(1)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Referências Importantes e Padrões -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 12px; background: #ffffff;">
        <h3 style="font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin: 0 0 6px 0; text-transform: uppercase;">Referências e Padrões de Saúde</h3>
        <ul style="margin: 6px 0 0 0; padding-left: 16px; font-size: 8.5px; line-height: 1.6; color: #475569; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px;">
          <li>% de Gordura ideal (${currentSex === 'M' ? 'homens' : 'mulheres'}, ${bfRow.ageMax === 200 ? `${bfRow.ageMin} anos ou mais` : `${bfRow.ageMin}-${bfRow.ageMax} anos`}): <strong>${idealBFRange}</strong></li>
          <li>RCQ ideal (${currentSex === 'M' ? 'homens' : 'mulheres'}): <strong>${refRCQ}</strong></li>
          <li>IMC saudável: <strong>18,5 - 24,9</strong></li>
          <li>Sono reparador recomendado: <strong>7 - 9 h/noite</strong></li>
          <li>Atividade física: <strong>150 - 300 min/semana</strong></li>
        </ul>
      </div>

      <!-- Considerações Finais do Avaliador -->
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 20px;">
        <h3 style="font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin: 0 0 8px 0; text-transform: uppercase;">Considerações Finais e Conduta do Avaliador</h3>
        <p style="font-size: 8.5px; line-height: 1.5; color: #334155; margin: 4px 0 0 0; font-style: italic;">
          "${assessment.observacoes || 'Excelente progresso corporal geral. Recomendado manter a regularidade na planilha de treinos e dieta.'}"
        </p>
      </div>

      <!-- Empresa -->
      <div style="text-align: center; margin-top: 20px; margin-bottom: 10px;">
        <div style="font-size: 14px; font-weight: 800; color: #0d9488; font-family: 'Outfit', sans-serif;">
          Clube Fitness Fisio
        </div>
      </div>

      <!-- Footer Decorado Página 2 -->
      <div style="position: absolute; bottom: 30px; left: 45px; right: 45px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid #e2e8f0; padding-top:6px; font-size:7px; color:#64748b;">
        <span>Clube Fitness Fisio &nbsp;|&nbsp; Telefone: (48) 99999-9999 &nbsp;|&nbsp; @clubefitnessfisio</span>
        <span>Sua saúde, nosso propósito.</span>
        <span>Página 2 de 2</span>
      </div>
    </div>
  `;

  // Anexar temporariamente o wrapper ao body para desenhar os gráficos Chart.js
  document.body.appendChild(pdfWrapper);

  // Renderizar Gráficos de Evolução de forma segura
  if (typeof Chart !== 'undefined') {
    try {
      new Chart(document.getElementById('pdfWeightChart'), {
        type: 'line',
        data: {
          labels: dates,
          datasets: [{
            data: weights,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.05)',
            tension: 0.25,
            borderWidth: 2,
            pointBackgroundColor: '#10b981',
            pointRadius: 3.5,
            fill: true
          }]
        },
        options: {
          animation: false,
          responsive: false,
          maintainAspectRatio: true,
          scales: {
            y: { display: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 7 } } },
            x: { grid: { display: false }, ticks: { font: { size: 7 } } }
          },
          plugins: { legend: { display: false } }
        }
      });
    } catch (err) {
      console.error('Erro ao renderizar pdfWeightChart:', err);
    }

    try {
      new Chart(document.getElementById('pdfFatChart'), {
        type: 'line',
        data: {
          labels: dates,
          datasets: [{
            data: fatPercents,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.05)',
            tension: 0.25,
            borderWidth: 2,
            pointBackgroundColor: '#f59e0b',
            pointRadius: 3.5,
            fill: true
          }]
        },
        options: {
          animation: false,
          responsive: false,
          maintainAspectRatio: true,
          scales: {
            y: { display: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 7 } } },
            x: { grid: { display: false }, ticks: { font: { size: 7 } } }
          },
          plugins: { legend: { display: false } }
        }
      });
    } catch (err) {
      console.error('Erro ao renderizar pdfFatChart:', err);
    }

    try {
      new Chart(document.getElementById('pdfMuscleChart'), {
        type: 'line',
        data: {
          labels: dates,
          datasets: [{
            data: muscles,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.05)',
            tension: 0.25,
            borderWidth: 2,
            pointBackgroundColor: '#3b82f6',
            pointRadius: 3.5,
            fill: true
          }]
        },
        options: {
          animation: false,
          responsive: false,
          maintainAspectRatio: true,
          scales: {
            y: { display: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 7 } } },
            x: { grid: { display: false }, ticks: { font: { size: 7 } } }
          },
          plugins: { legend: { display: false } }
        }
      });
    } catch (err) {
      console.error('Erro ao renderizar pdfMuscleChart:', err);
    }
  } else {
    console.warn('A biblioteca Chart.js não está disponível globalmente. Gráficos de evolução não serão renderizados no PDF.');
  }

  const safeClientName = (client.dadosPessoais?.nome || 'Aluno').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Avaliacao_${safeClientName}_${formatDate(assessment.data).replace(/\//g, '-')}.pdf`;

  const options = {
    margin: [0, 0, 0, 0], // Margem zerada para bater com as dimensões exatas em mm do layout
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2.0, useCORS: true, letterRendering: true, scrollX: 0, scrollY: 0, windowWidth: 794, width: 794, x: 0, y: 0 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] }
  };

  // ===== Helper to build Termografia page 3 as a PDF Uint8Array via PDFLib =====
  async function buildTermografiaPagePdf(): Promise<Uint8Array | null> {
    if (!hasTermografiaImage) return null;
    try {
      if (typeof PDFLib === 'undefined') return null;
      const { PDFDocument, rgb, StandardFonts } = PDFLib;
      const termoDoc = await PDFDocument.create();
      const page = termoDoc.addPage([595.28, 841.89]); // A4 portrait in points
      const font = await termoDoc.embedFont(StandardFonts.HelveticaBold);

      // Title
      page.drawText('TERMOGRAFIA', { x: 40, y: 800, size: 16, font, color: rgb(0.04, 0.51, 0.48) });
      page.drawText(`Avaliação: ${formatDate(assessment.data)}`, { x: 40, y: 780, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
      const clientName = client.dadosPessoais?.nome || 'Aluno';
      page.drawText(`Aluno(a): ${clientName}`, { x: 40, y: 766, size: 10, font, color: rgb(0.2, 0.2, 0.2) });

      // Embed image
      const imgData = rawTermografia;
      let embeddedImg;
      if (imgData.startsWith('data:image/png')) {
        const b64 = imgData.split(',')[1];
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        embeddedImg = await termoDoc.embedPng(bytes);
      } else {
        const b64 = imgData.split(',')[1];
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        embeddedImg = await termoDoc.embedJpg(bytes);
      }

      const maxW = 515, maxH = 650;
      const dim = embeddedImg.scaleToFit(maxW, maxH);
      const imgX = (595.28 - dim.width) / 2;
      const imgY = 745 - dim.height;
      page.drawImage(embeddedImg, { x: imgX, y: Math.max(30, imgY), width: dim.width, height: dim.height });

      // Footer
      page.drawText('Página 3 de 3 — Termografia', { x: 40, y: 20, size: 7, font, color: rgb(0.4, 0.4, 0.4) });

      return await termoDoc.save();
    } catch (e) {
      console.error('Erro ao criar página de termografia:', e);
      return null;
    }
  }

  if (assessment.pdf_url) {
    // Se tiver anexo em PDF, gerar o PDF do sistema como arraybuffer e concatenar com o anexo
    html2pdf().set(options).from(pdfContainer).output('arraybuffer').then(async (pdfSystemBuffer: any) => {
      try {
        // Remover o wrapper da árvore do DOM
        document.body.removeChild(pdfWrapper);

        // Carregar a biblioteca pdf-lib com fallback resiliente
        if (typeof PDFLib === 'undefined') {
          console.warn('A biblioteca de manipulação de PDF (pdf-lib) não foi carregada. Baixando apenas o relatório do sistema...');
          alert('Aviso: A biblioteca de mesclagem (pdf-lib) não pôde ser carregada devido a restrições de rede local ou CORS. O sistema gerará e exibirá o relatório timbrado oficial da avaliação de forma individual, mas o seu PDF anexo não pôde ser mesclado (ele continua salvo no banco de dados).');
          
          const rawBlob = new Blob([pdfSystemBuffer], { type: 'application/pdf' });
          triggerDirectDownload(rawBlob, filename);
          return;
        }
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        // Carregar PDF gerado pelo sistema
        const systemPdfDoc = await PDFDocument.load(pdfSystemBuffer);
        const systemPages = await mergedPdf.copyPages(systemPdfDoc, systemPdfDoc.getPageIndices());
        systemPages.forEach((page: any) => mergedPdf.addPage(page));

        // Termografia page 3 if available
        const termoBytes = await buildTermografiaPagePdf();
        if (termoBytes) {
          const termoDoc = await PDFDocument.load(termoBytes);
          const termoPages = await mergedPdf.copyPages(termoDoc, termoDoc.getPageIndices());
          termoPages.forEach((page: any) => mergedPdf.addPage(page));
        }

        // Carregar e processar o PDF anexo em Base64
        const attachedBlob = base64ToBlob(assessment.pdf_url, 'application/pdf');
        const attachedPdfBuffer = await attachedBlob.arrayBuffer();
        const attachedPdfDoc = await PDFDocument.load(attachedPdfBuffer);
        const attachedPages = await mergedPdf.copyPages(attachedPdfDoc, attachedPdfDoc.getPageIndices());
        attachedPages.forEach((page: any) => mergedPdf.addPage(page));

        // Salvar PDF final mesclado
        const mergedPdfBytes = await mergedPdf.save();
        const mergedBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        triggerDirectDownload(mergedBlob, filename);
  
      } catch (error: any) {
        console.error('Erro na mesclagem dos PDFs:', error);
        alert('Erro ao mesclar o PDF anexo com a avaliação do sistema: ' + error.message);
      }
    }).catch((err: any) => {
      console.error('Erro na geração do PDF:', err);
      alert('Erro ao gerar o PDF da avaliação: ' + err.message);
      document.body.removeChild(pdfWrapper);
    });
  } else if (hasTermografiaImage) {
    // Sem pdf_url mas com imagem de termografia — mesclar via PDFLib
    html2pdf().set(options).from(pdfContainer).output('arraybuffer').then(async (pdfSystemBuffer: any) => {
      try {
        document.body.removeChild(pdfWrapper);
        if (typeof PDFLib === 'undefined') {
          const rawBlob = new Blob([pdfSystemBuffer], { type: 'application/pdf' });
          triggerDirectDownload(rawBlob, filename);
          return;
        }
        const { PDFDocument } = PDFLib;
        const mergedPdf = await PDFDocument.create();

        const systemPdfDoc = await PDFDocument.load(pdfSystemBuffer);
        const systemPages = await mergedPdf.copyPages(systemPdfDoc, systemPdfDoc.getPageIndices());
        systemPages.forEach((page: any) => mergedPdf.addPage(page));

        const termoBytes = await buildTermografiaPagePdf();
        if (termoBytes) {
          const termoDoc = await PDFDocument.load(termoBytes);
          const termoPages = await mergedPdf.copyPages(termoDoc, termoDoc.getPageIndices());
          termoPages.forEach((page: any) => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        const mergedBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        triggerDirectDownload(mergedBlob, filename);
      } catch (error: any) {
        console.error('Erro ao adicionar página de termografia:', error);
        const rawBlob = new Blob([pdfSystemBuffer], { type: 'application/pdf' });
        triggerDirectDownload(rawBlob, filename);
        document.body.removeChild(pdfWrapper);
      }
    }).catch((err: any) => {
      console.error('Erro na geração do PDF:', err);
      alert('Erro ao gerar o PDF da avaliação: ' + err.message);
      document.body.removeChild(pdfWrapper);
    });
  } else {
    // Fluxo padrão caso não exista PDF anexo nem imagem termografia
    html2pdf().set(options).from(pdfContainer).output('blob').then((blob: Blob) => {
      triggerDirectDownload(blob, filename);
      document.body.removeChild(pdfWrapper);
    }).catch((err: any) => {
      console.error('Erro na geração do PDF:', err);
      alert('Erro ao gerar o PDF da avaliação (sem anexo): ' + err.message);
      document.body.removeChild(pdfWrapper);
    });
  }
}

// ==========================================================
// PDF — PRONTUÁRIO CLÍNICO INDIVIDUAL
// ==========================================================
export function downloadProntuarioPDF(prontuario: any, client: any, profNome = 'Profissional do Clube', profRegistro = '') {
  const html2pdf = (window as any).html2pdf;
  if (!html2pdf) { alert('html2pdf.js não está carregado.'); return; }

  const fmtDate = (d: string) => { if (!d) return '-'; const p = d.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; };

  const pdfWrapper = document.createElement('div');
  pdfWrapper.style.cssText = `position:absolute;left:0;top:${typeof window !== 'undefined' ? window.scrollY : 0}px;width:720px;opacity:0;z-index:99999;pointer-events:none;`;
  const pdfContainer = document.createElement('div');
  pdfContainer.style.cssText = 'background:#fff;color:#333;padding:30px;font-family:Arial,sans-serif;width:720px;box-sizing:border-box;';
  pdfWrapper.appendChild(pdfContainer);
  document.body.appendChild(pdfWrapper);

  const obs = prontuario.conteudo || prontuario.observacoes || '';
  const nome = client?.dadosPessoais?.nome || 'Paciente';
  const nascimento = fmtDate(client?.dadosPessoais?.dataNascimento || '');
  const cpf = client?.dadosPessoais?.cpf || '-';
  const sexo = (client?.dadosPessoais?.sexo || 'M') === 'F' ? 'Feminino' : 'Masculino';
  const tel = client?.dadosPessoais?.telefone || '-';
  const email = client?.dadosPessoais?.email || '-';
  const dataDoc = fmtDate(prontuario.data || prontuario.createdAt?.split('T')[0] || '');

  pdfContainer.innerHTML = `
    <style>
      p, li, tr, h2, h3, h4, table {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    </style>
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0f172a;padding-bottom:20px;margin-bottom:30px;">
      <div><h1 style="color:#0f172a;margin:0;font-size:28px;">CLUBE FITNESS FISIO</h1><p style="color:#666;margin:4px 0 0 0;font-size:12px;">Fisioterapia, Quiropraxia e Fortalecimento</p></div>
      <div style="text-align:right;"><span style="font-weight:bold;color:#0f172a;font-size:16px;">PRONTUÁRIO CLÍNICO DE ACOMPANHAMENTO</span><br><small style="color:#777">Data de Emissão: ${dataDoc}</small></div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:30px;font-size:13px;">
      <tr style="background:#f8fafc;"><td style="padding:10px;font-weight:bold;width:15%;border:1px solid #e2e8f0;">Paciente:</td><td style="padding:10px;width:45%;border:1px solid #e2e8f0;">${nome}</td><td style="padding:10px;font-weight:bold;width:15%;border:1px solid #e2e8f0;">Data Nasc.:</td><td style="padding:10px;width:25%;border:1px solid #e2e8f0;">${nascimento}</td></tr>
      <tr><td style="padding:10px;font-weight:bold;border:1px solid #e2e8f0;">CPF:</td><td style="padding:10px;border:1px solid #e2e8f0;">${cpf}</td><td style="padding:10px;font-weight:bold;border:1px solid #e2e8f0;">Sexo:</td><td style="padding:10px;border:1px solid #e2e8f0;">${sexo}</td></tr>
      <tr style="background:#f8fafc;"><td style="padding:10px;font-weight:bold;border:1px solid #e2e8f0;">Telefone:</td><td style="padding:10px;border:1px solid #e2e8f0;">${tel}</td><td style="padding:10px;font-weight:bold;border:1px solid #e2e8f0;">E-mail:</td><td style="padding:10px;border:1px solid #e2e8f0;">${email}</td></tr>
    </table>
    <div style="font-size:14px;line-height:1.6;margin-bottom:40px;border:1px solid #e2e8f0;border-radius:6px;padding:20px;background:#fafafa;min-height:400px;white-space:pre-wrap;">${obs}</div>
    <div style="margin-top:60px;font-size:12px;text-align:center;"><div style="width:50%;margin:0 auto;"><div style="border-top:1px solid #333;padding-top:6px;">${profNome}<br><small>${profRegistro}</small></div></div></div>
  `;

  const options = { margin: 10, filename: `Prontuario_${nome.replace(/\s+/g,'_')}_${dataDoc.replace(/\//g,'-')}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2.0, useCORS: true, scrollX: 0, scrollY: 0, windowWidth: 720, width: 720, x: 0, y: 0 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: ['css', 'legacy'] } };
  


  html2pdf().set(options).from(pdfContainer).output('blob').then((blob: Blob) => {
    triggerDirectDownload(blob, options.filename);
    document.body.removeChild(pdfWrapper);
  }).catch((err: any) => {
    console.error('Erro PDF prontuário:', err);
    document.body.removeChild(pdfWrapper);
  });
}

// ==========================================================
// PDF — PRONTUÁRIOS CONSOLIDADOS (todos de um aluno)
// ==========================================================
export function downloadUnifiedProntuariosPDF(prontuarios: any[], client: any, profNome = 'Profissional do Clube', profRegistro = '') {
  const html2pdf = (window as any).html2pdf;
  if (!html2pdf) { alert('html2pdf.js não está carregado.'); return; }
  if (!prontuarios || prontuarios.length === 0) { alert('Nenhum prontuário registrado para este aluno.'); return; }

  const sorted = [...prontuarios].sort((a, b) => (a.data || '').localeCompare(b.data || ''));
  const fmtDate = (d: string) => { if (!d) return '-'; const p = d.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; };
  const nome = client?.dadosPessoais?.nome || 'Paciente';

  const pdfWrapper = document.createElement('div');
  pdfWrapper.style.cssText = `position:absolute;left:0;top:${typeof window !== 'undefined' ? window.scrollY : 0}px;width:720px;opacity:0;z-index:99999;pointer-events:none;`;
  const pdfContainer = document.createElement('div');
  pdfContainer.style.cssText = 'background:#fff;color:#333;font-family:Arial,sans-serif;width:720px;box-sizing:border-box;';
  pdfWrapper.appendChild(pdfContainer);
  document.body.appendChild(pdfWrapper);

  pdfContainer.innerHTML = `<style>p, li, tr, h2, h3, h4, table { page-break-inside: avoid !important; break-inside: avoid !important; }</style>` + sorted.map((p, idx) => {
    const obs = p.conteudo || p.observacoes || '';
    const data = fmtDate(p.data || p.createdAt?.split('T')[0] || '');
    return `<div style="background:#fff;padding:30px;min-height:1100px;${idx > 0 ? 'border-top:4px solid #6366f1;margin-top:20px;' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0f172a;padding-bottom:16px;margin-bottom:24px;">
        <div><h2 style="color:#0f172a;margin:0;font-size:20px;">CLUBE FITNESS FISIO</h2><p style="color:#666;margin:2px 0 0 0;font-size:10px;">Fisioterapia, Quiropraxia e Fortalecimento</p></div>
        <div style="text-align:right;"><span style="font-weight:bold;color:#0f172a;font-size:13px;">PRONTUÁRIO ${idx + 1}/${sorted.length}</span><br><small style="color:#777;font-size:11px;">Paciente: ${nome} | Data: ${data}</small></div>
      </div>
      <div style="font-size:13px;line-height:1.7;white-space:pre-wrap;border:1px solid #e2e8f0;padding:16px;border-radius:6px;background:#fafafa;min-height:700px;">${obs}</div>
      <div style="margin-top:40px;font-size:11px;text-align:center;"><div style="width:50%;margin:0 auto;border-top:1px solid #333;padding-top:6px;">${profNome}<br><small>${profRegistro}</small></div></div>
    </div>`;
  }).join('');

  const options = { margin: 5, filename: `Prontuarios_${nome.replace(/\s+/g,'_')}_completo.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 1.8, useCORS: true, scrollX: 0, scrollY: 0, windowWidth: 720, width: 720, x: 0, y: 0 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: ['css', 'legacy'] } };

  html2pdf().set(options).from(pdfContainer).output('blob').then((blob: Blob) => {
    triggerDirectDownload(blob, options.filename);
    document.body.removeChild(pdfWrapper);
  }).catch((err: any) => {
    console.error('Erro PDF prontuários:', err);
    document.body.removeChild(pdfWrapper);
  });
}

const STRENGTH_REFERENCE_TABLE: Record<string, Record<string, { M: { min: number, max: number }, F: { min: number, max: number } }>> = {
  "Ombro": {
    "Abdução": { M: { min: 18, max: 25 }, F: { min: 14, max: 20 } },
    "Rotação Externa Neutro": { M: { min: 12, max: 16 }, F: { min: 12, max: 16 } },
    "Rotação Externa 90° de Abdução": { M: { min: 14, max: 18 }, F: { min: 14, max: 18 } }
  },
  "Cotovelo": {
    "Flexão": { M: { min: 20, max: 30 }, F: { min: 15, max: 22 } },
    "Extensão": { M: { min: 15, max: 22 }, F: { min: 10, max: 16 } }
  },
  "Punho": {
    "Flexão": { M: { min: 10, max: 18 }, F: { min: 7, max: 13 } },
    "Extensão": { M: { min: 8, max: 15 }, F: { min: 6, max: 11 } }
  },
  "Tornozelo": {
    "Inversão": { M: { min: 15, max: 22 }, F: { min: 12, max: 18 } },
    "Eversão": { M: { min: 12, max: 18 }, F: { min: 10, max: 15 } },
    "Flexão Plantar": { M: { min: 40, max: 55 }, F: { min: 30, max: 45 } }
  },
  "Joelho": {
    "Extensão": { M: { min: 45, max: 60 }, F: { min: 35, max: 50 } },
    "Flexão": { M: { min: 25, max: 35 }, F: { min: 20, max: 30 } }
  },
  "Quadril": {
    "Flexão": { M: { min: 30, max: 42 }, F: { min: 25, max: 36 } },
    "Abdução": { M: { min: 25, max: 35 }, F: { min: 20, max: 30 } },
    "Adução": { M: { min: 15, max: 20 }, F: { min: 15, max: 20 } },
    "Extensão": { M: { min: 25, max: 30 }, F: { min: 25, max: 30 } }
  }
};

export async function downloadStrengthTestPDF(st: any, client: any, prof: any) {
  const html2pdf = (window as any).html2pdf;
  if (!html2pdf) { alert('html2pdf.js não está carregado.'); return; }

  const fmtDate = (d: string) => { if (!d) return '-'; const p = d.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; };
  const nome = client?.dadosPessoais?.nome || 'Paciente';
  const cpf = client?.dadosPessoais?.cpf || '-';
  const sex = client?.dadosPessoais?.sexo || 'M';
  const data = fmtDate(st.data || st.createdAt?.split('T')[0] || '');
  const peso = st.pesoCliente || client?.dadosMedidos?.peso || '-';

  const logoBase64 = await getLogoBase64();

  const pdfWrapper = document.createElement('div');
  pdfWrapper.style.cssText = `position:absolute;left:0;top:${typeof window !== 'undefined' ? window.scrollY : 0}px;width:794px;opacity:0;z-index:99999;pointer-events:none;display:block;`;
  const pdfContainer = document.createElement('div');
  pdfContainer.style.cssText = 'background:#ffffff;color:#1e293b;padding:0;margin:0;width:794px;box-sizing:border-box;';
  pdfWrapper.appendChild(pdfContainer);
  document.body.appendChild(pdfWrapper);

  const isNew = st.testesRealizados && st.testesRealizados.length > 0;

  const pdfStyles = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap');
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff;
      }
      .pdf-page {
        background: #ffffff;
        color: #1e293b;
        font-family: 'Inter', sans-serif;
        box-sizing: border-box;
        width: 794px;
        padding: 25px 35px;
      }
      .font-outfit {
        font-family: 'Outfit', sans-serif;
      }
      .grid-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 10px;
        margin-bottom: 10px;
      }
      .logo-box {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .logo-img {
        width: 50px;
        height: 50px;
        border-radius: 8px;
        object-fit: cover;
      }
      .logo-title {
        font-size: 20px;
        font-weight: 800;
        color: #0e131f;
        margin: 0;
        letter-spacing: -0.5px;
      }
      .logo-subtitle {
        font-size: 8px;
        color: #64748b;
        margin: 2px 0 0 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .date-box {
        background: #f1f5f9;
        border-radius: 6px;
        padding: 6px 12px;
        text-align: center;
        border: 1px solid #cbd5e1;
      }
      .date-box span {
        font-size: 8px;
        color: #64748b;
        font-weight: 600;
        display: block;
        text-transform: uppercase;
      }
      .date-box strong {
        font-size: 13px;
        color: #0f172a;
        font-family: 'Outfit', sans-serif;
      }
      .client-bar {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        display: grid;
        grid-template-columns: 1.5fr 1fr 1fr 1fr;
        padding: 6px 12px;
        margin-bottom: 12px;
        font-size: 9px;
      }
      .client-bar-item {
        border-right: 1px solid #e2e8f0;
        padding: 0 8px;
      }
      .client-bar-item:last-child {
        border-right: none;
      }
      .client-bar-item span {
        color: #64748b;
        font-weight: 500;
        display: block;
        font-size: 8px;
        text-transform: uppercase;
        margin-bottom: 2px;
      }
      .client-bar-item strong {
        color: #0f172a;
        font-size: 10px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
      }
      .table-data {
        width: 100%;
        border-collapse: collapse;
        font-size: 9px;
      }
      .table-data th {
        background: #f8fafc;
        color: #475569;
        font-weight: 600;
        text-align: left;
        padding: 6px 8px;
        border-bottom: 1px solid #e2e8f0;
        text-transform: uppercase;
        font-size: 8px;
      }
      .table-data td {
        padding: 6px 8px;
        border-bottom: 1px solid #f1f5f9;
        color: #334155;
      }
      .table-data tr:last-child td {
        border-bottom: none;
      }
      .section-card {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 12px;
        background: #ffffff;
      }
      .section-card-title {
        background: #0f172a;
        color: #ffffff;
        padding: 6px 12px;
        font-family: 'Outfit', sans-serif;
        font-size: 9.5px;
        font-weight: 700;
        letter-spacing: 1px;
        text-transform: uppercase;
      }
      .section-card-content {
        padding: 8px 10px;
        background: #ffffff;
      }
      .metric-badge {
        font-size: 7.5px;
        font-weight: 700;
        text-transform: uppercase;
        padding: 2px 6px;
        border-radius: 4px;
        display: inline-block;
      }
      .badge-green { background: #dcfce7; color: #15803d; }
      .badge-orange { background: #ffedd5; color: #c2410c; }
      .badge-blue { background: #dbeafe; color: #1d4ed8; }
      .badge-red { background: #fee2e2; color: #b91c1c; }
      p, li, tr, h2, h3, h4, table, tbody {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    </style>
  `;

  if (isNew) {
    // Individual tests logic
    const testsHtml = st.testesRealizados.map((t: any) => {
      // Look up reference in table
      const refData = STRENGTH_REFERENCE_TABLE[t.articulacao]?.[t.movimento]?.[sex === 'F' ? 'F' : 'M'] || { min: 0, max: 0 };
      const refText = refData.min > 0 ? `${refData.min}-${refData.max} %PC` : '-';
      
      let badgeClass = 'badge-green';
      if (t.classificacao === 'DÉFICIT LEVE') badgeClass = 'badge-blue';
      else if (t.classificacao === 'DÉFICIT MODERADO') badgeClass = 'badge-orange';
      else if (t.classificacao === 'DÉFICIT GRAVE') badgeClass = 'badge-red';

      return `
        <tr>
          <td><strong>${t.articulacao}</strong></td>
          <td>${t.movimento}</td>
          <td style="text-align:center;">${t.lado}</td>
          <td style="text-align:right;">${t.valorObtido} ${t.unidade}</td>
          <td style="text-align:right; font-weight:600;">${t.forcaN?.toFixed(1)} N</td>
          <td style="text-align:right; font-weight:600;">${t.pcPercent?.toFixed(1)}%</td>
          <td style="text-align:center; color:#64748b;">${refText}</td>
          <td style="text-align:right; font-weight:700;">${t.pctRef?.toFixed(1)}%</td>
          <td style="text-align:center;"><span class="metric-badge ${badgeClass}">${t.classificacao || 'FORÇA NORMAL'}</span></td>
        </tr>
      `;
    }).join('');

    // Bilateral comparisons logic
    const compsHtml = (st.comparativos || []).map((c: any) => {
      let badgeClass = 'badge-green';
      if (c.classificacaoSimetria === 'Aceitável') badgeClass = 'badge-blue';
      else if (c.classificacaoSimetria === 'Atenção') badgeClass = 'badge-orange';
      else if (c.classificacaoSimetria === 'Assimetria Relevante') badgeClass = 'badge-red';

      return `
        <tr>
          <td><strong>${c.articulacao}</strong></td>
          <td>${c.movimento}</td>
          <td style="text-align:right; font-weight:600;">${c.valorD?.toFixed(1)} N</td>
          <td style="text-align:right; font-weight:600;">${c.valorE?.toFixed(1)} N</td>
          <td style="text-align:right; font-weight:700; color:${c.deficit > 15 ? '#b91c1c' : '#1e293b'}">${c.deficit?.toFixed(1)}%</td>
          <td style="text-align:right; font-weight:700; color:${c.simetria < 85 ? '#b91c1c' : '#15803d'}">${c.simetria?.toFixed(1)}%</td>
          <td style="text-align:center;"><span class="metric-badge ${badgeClass}">${c.classificacaoSimetria || 'Excelente'}</span></td>
        </tr>
      `;
    }).join('');

    const observationHtml = st.observacoes 
      ? `<div class="section-card">
          <div class="section-card-title">Observações Clínicas / Recomendações</div>
          <div class="section-card-content" style="font-size:9.5px; line-height:1.5; white-space:pre-wrap; background:#fafafa;">${st.observacoes}</div>
         </div>`
      : '';

    pdfContainer.innerHTML = `
      ${pdfStyles}
      <div class="pdf-page">
        <!-- Header -->
        <div class="grid-header">
          <div class="logo-box">
            ${logoBase64 
              ? `<img src="${logoBase64}" class="logo-img" alt="Logo Clube Fitness Fisio">`
              : `<div style="width: 48px; height: 48px; border-radius: 8px; background: linear-gradient(135deg, #10b981 0%, #0d9488 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 18px; font-family: 'Outfit', sans-serif; box-shadow: 0 4px 8px rgba(16, 185, 129, 0.2); flex-shrink: 0;">CFF</div>`
            }
            <div>
              <h1 class="logo-title font-outfit">CLUBE FITNESS FISIO</h1>
              <p class="logo-subtitle">Avaliação Clínico-Funcional de Força Muscular</p>
            </div>
          </div>
          <div class="date-box">
            <span>Data do Teste</span>
            <strong>${data}</strong>
          </div>
        </div>

        <!-- Paciente / Info -->
        <div class="client-bar">
          <div class="client-bar-item">
            <span>Paciente</span>
            <strong>${nome}</strong>
          </div>
          <div class="client-bar-item">
            <span>CPF</span>
            <strong>${cpf}</strong>
          </div>
          <div class="client-bar-item">
            <span>Peso Corporal</span>
            <strong>${peso} kg</strong>
          </div>
          <div class="client-bar-item">
            <span>Sexo</span>
            <strong>${sex === 'F' ? 'Feminino' : 'Masculino'}</strong>
          </div>
        </div>

        <!-- Tabela de Testes Individuais -->
        <div class="section-card">
          <div class="section-card-title">Testes Individuais por Articulação e Movimento</div>
          <div class="section-card-content" style="padding:0;">
            <table class="table-data">
              <thead>
                <tr>
                  <th>Articulação</th>
                  <th>Movimento</th>
                  <th style="text-align:center;">Lado</th>
                  <th style="text-align:right;">Valor</th>
                  <th style="text-align:right;">Força (N)</th>
                  <th style="text-align:right;">%PC</th>
                  <th style="text-align:center;">Ref. Média</th>
                  <th style="text-align:right;">% Ref.</th>
                  <th style="text-align:center;">Classificação</th>
                </tr>
              </thead>
              <tbody>
                ${testsHtml}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tabela de Comparação Bilateral -->
        ${st.comparativos && st.comparativos.length > 0 ? `
          <div class="section-card">
            <div class="section-card-title">Análise de Simetria e Déficit Lateral</div>
            <div class="section-card-content" style="padding:0;">
              <table class="table-data">
                <thead>
                  <tr>
                    <th>Articulação</th>
                    <th>Movimento</th>
                    <th style="text-align:right;">Dir (N)</th>
                    <th style="text-align:right;">Esq (N)</th>
                    <th style="text-align:right;">Déficit (%)</th>
                    <th style="text-align:right;">Simetria (%)</th>
                    <th style="text-align:center;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${compsHtml}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}

        <!-- Observações -->
        ${observationHtml}

        <!-- Interpretação Clínica dos Resultados -->
        <div class="section-card" style="margin-top: 15px;">
          <div class="section-card-title">Interpretação Clínica dos Resultados</div>
          <div class="section-card-content" style="padding: 10px; background: #ffffff;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; border-left: 4px solid #10b981; background: #fafafa;">
                <strong style="display: block; font-size: 8.5px; color: #0f172a; margin-bottom: 2px;">&ge; 90% do Valor de Referência</strong>
                <span style="font-size: 8px; color: #475569; line-height: 1.3; display: block;">
                  <strong>Força normal:</strong> o paciente apresenta força muscular dentro dos parâmetros normativos para sua faixa demográfica. Liberação para progressão de carga ou retorno ao esporte/atividades.
                </span>
              </div>
              <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; border-left: 4px solid #3b82f6; background: #fafafa;">
                <strong style="display: block; font-size: 8.5px; color: #0f172a; margin-bottom: 2px;">75-89% do Valor de Referência</strong>
                <span style="font-size: 8px; color: #475569; line-height: 1.3; display: block;">
                  <strong>Déficit leve:</strong> força levemente reduzida. Indica necessidade de fortalecimento direcionado, porém funcionalidade preservada para a maioria das atividades de vida diária.
                </span>
              </div>
              <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; border-left: 4px solid #f97316; background: #fafafa;">
                <strong style="display: block; font-size: 8.5px; color: #0f172a; margin-bottom: 2px;">50-74% do Valor de Referência</strong>
                <span style="font-size: 8px; color: #475569; line-height: 1.3; display: block;">
                  <strong>Déficit moderado:</strong> comprometimento funcional relevante. Requer programa de reabilitação estruturado com reavaliação periódica. Restrição de atividades de maior demanda.
                </span>
              </div>
              <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; border-left: 4px solid #ef4444; background: #fafafa;">
                <strong style="display: block; font-size: 8.5px; color: #0f172a; margin-bottom: 2px;">&lt; 50% do Valor de Referência</strong>
                <span style="font-size: 8px; color: #475569; line-height: 1.3; display: block;">
                  <strong>Déficit grave:</strong> fraqueza muscular importante com alto impacto funcional. Investigação de causas subjacentes, possível encaminhamento médico e reabilitação intensiva são indicados.
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Empresa -->
        <div style="margin-top: 30px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 8px; color: #64748b;">
          <span>Clube Fitness Fisio &nbsp;|&nbsp; Fisioterapia, Quiropraxia e Fortalecimento</span>
        </div>
      </div>
    `;
  } else {
    // Legacy single-exercise fallback
    let v: any = st.valores || {};
    if (!v.supino && st.exercicios?.length) {
      const ex = st.exercicios;
      v = {
        supino: ex.find((e: any) => /supino/i.test(e.nome))?.carga || 0,
        remada: ex.find((e: any) => /remada/i.test(e.nome))?.carga || 0,
        desenvolvimento: ex.find((e: any) => /desenvolvim/i.test(e.nome))?.carga || 0,
        puxada: ex.find((e: any) => /puxada/i.test(e.nome))?.carga || 0,
        rotacaoExternaOmbro: ex.find((e: any) => /externa/i.test(e.nome))?.carga || 0,
        rotacaoInternaOmbro: ex.find((e: any) => /interna/i.test(e.nome))?.carga || 0,
        abducaoOmbro: ex.find((e: any) => /abdu/i.test(e.nome))?.carga || 0
      };
    }

    const rHor = v.remada && v.supino ? v.remada / v.supino : 0;
    const rVer = v.desenvolvimento && v.puxada ? v.desenvolvimento / v.puxada : 0;
    const rRot = v.rotacaoExternaOmbro && v.rotacaoInternaOmbro ? v.rotacaoExternaOmbro / v.rotacaoInternaOmbro : 0;
    const rAbd = v.rotacaoExternaOmbro && v.abducaoOmbro ? v.rotacaoExternaOmbro / v.abducaoOmbro : 0;
    const [iH, iV, iR, iA] = [rHor >= 0.80, rVer >= 1.50, rRot >= 0.70, rAbd >= 0.55];
    const a = st.analise || {
      razaoHorizontal: rHor,
      razaoVertical: rVer,
      razaoRotadores: rRot,
      razaoAbdRotadores: rAbd,
      riscoOmbro: !iH || !iV || !iR || !iA,
      alertas: [
        ...(!iH ? ['Risco: razão horizontal (Remada/Supino) deve ser ≥ 0.80'] : []),
        ...(!iV ? ['Risco: razão vertical (Desenvolvimento/Puxada) deve ser ≥ 1.50'] : []),
        ...(!iR ? ['Risco: razão rotadores (Ext/Int) deve ser ≥ 0.70'] : []),
        ...(!iA ? ['Risco: razão abdutores (Ext/Abd) deve ser ≥ 0.55'] : [])
      ]
    };

    const sc = a.riscoOmbro ? '#b91c1c' : '#0d9488';
    const warningsHtml = (a.alertas || []).map((t: string) => `<div style="background:#fef2f2;border:1px solid #fca5a5;padding:12px;border-radius:6px;margin-bottom:12px;color:#b91c1c;font-size:11px;font-weight:bold;">⚠️ ${t}</div>`).join('');
    const ratioRow = (label: string, val: number, ref: string, ok: boolean) => `<tr><td style="padding:6px;">${label}</td><td style="padding:6px;text-align:center;font-weight:bold;">${val > 0 ? val.toFixed(2) : '-'}</td><td style="padding:6px;text-align:center;">${ref}</td><td style="padding:6px;text-align:center;font-weight:bold;color:${ok ? '#10b981' : '#ef4444'}">${val > 0 ? (ok ? 'OK' : 'ALTERADO') : '-'}</td></tr>`;

    pdfContainer.innerHTML = `
      ${pdfStyles}
      <div class="pdf-page">
        <!-- Header -->
        <div class="grid-header">
          <div class="logo-box">
            ${logoBase64 
              ? `<img src="${logoBase64}" class="logo-img" alt="Logo Clube Fitness Fisio">`
              : `<div style="width: 48px; height: 48px; border-radius: 8px; background: linear-gradient(135deg, #10b981 0%, #0d9488 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 18px; font-family: 'Outfit', sans-serif; box-shadow: 0 4px 8px rgba(16, 185, 129, 0.2); flex-shrink: 0;">CFF</div>`
            }
            <div>
              <h1 class="logo-title font-outfit">CLUBE FITNESS FISIO</h1>
              <p class="logo-subtitle">Análise Comparativa de Força Muscular Máxima (1RM)</p>
            </div>
          </div>
          <div class="date-box">
            <span>Data do Teste</span>
            <strong>${data}</strong>
          </div>
        </div>

        <!-- Paciente / Info -->
        <div class="client-bar" style="grid-template-columns: 2fr 1fr 1fr;">
          <div class="client-bar-item">
            <span>Paciente</span>
            <strong>${nome}</strong>
          </div>
          <div class="client-bar-item">
            <span>CPF</span>
            <strong>${cpf}</strong>
          </div>
          <div class="client-bar-item">
            <span>Status de Risco</span>
            <strong style="color:${sc};">${a.riscoOmbro ? 'RISCO ELEVADO' : 'EQUILIBRADO / SEGURO'}</strong>
          </div>
        </div>

        <!-- Cargas Máximas -->
        <div class="section-card">
          <div class="section-card-title">Cargas Máximas Registradas</div>
          <div class="section-card-content" style="padding:0;">
            <table class="table-data">
              <thead>
                <tr style="background:#f4f6f8;"><th style="padding:6px;text-align:left;">Exercício</th><th style="padding:6px;text-align:center;width:30%;">Carga</th></tr>
              </thead>
              <tbody>
                <tr><td style="padding:5px;">Supino Reto</td><td style="padding:5px;text-align:center;"><strong>${v.supino || 0} kg</strong></td></tr>
                <tr><td style="padding:5px;">Remada Curvada / Máquina</td><td style="padding:5px;text-align:center;"><strong>${v.remada || 0} kg</strong></td></tr>
                <tr><td style="padding:5px;">Desenvolvimento de Ombros</td><td style="padding:5px;text-align:center;"><strong>${v.desenvolvimento || 0} kg</strong></td></tr>
                <tr><td style="padding:5px;">Puxada Alta (Lat Pulldown)</td><td style="padding:5px;text-align:center;"><strong>${v.puxada || 0} kg</strong></td></tr>
                <tr><td style="padding:5px;">Rotação Externa de Ombro</td><td style="padding:5px;text-align:center;"><strong>${v.rotacaoExternaOmbro || 0} kg</strong></td></tr>
                <tr><td style="padding:5px;">Rotação Interna de Ombro</td><td style="padding:5px;text-align:center;"><strong>${v.rotacaoInternaOmbro || 0} kg</strong></td></tr>
                <tr><td style="padding:5px;">Abdução de Ombro</td><td style="padding:5px;text-align:center;"><strong>${v.abducaoOmbro || 0} kg</strong></td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Razões de Equilíbrio -->
        <div class="section-card">
          <div class="section-card-title">Razões de Equilíbrio Muscular</div>
          <div class="section-card-content" style="padding:0;">
            <table class="table-data">
              <thead>
                <tr style="background:#f4f6f8;font-weight:bold;"><th style="padding:6px;text-align:left;">Métrica</th><th style="padding:6px;text-align:center;width:20%;">Resultado</th><th style="padding:6px;text-align:center;width:25%;">Referência</th><th style="padding:6px;text-align:center;width:20%;">Status</th></tr>
              </thead>
              <tbody>
                ${ratioRow('Horizontal (Remada / Supino)', rHor, '≥ 0.80', iH)}
                ${ratioRow('Vertical (Desenvolvimento / Puxada)', rVer, '≥ 1.50', iV)}
                ${ratioRow('Rotadores (Ext / Int)', rRot, '≥ 0.70', iR)}
                ${ratioRow('Abdutores/Rotadores (Ext / Abd)', rAbd, '≥ 0.55', iA)}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Advertências -->
        ${warningsHtml ? `<h4 style="margin:15px 0 6px 0;color:#ef4444;font-size:11px;text-transform:uppercase;">Advertências Clínicas</h4>${warningsHtml}` : `<div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:10px;border-radius:6px;color:#15803d;font-size:10px;font-weight:bold;margin-top:10px;">✓ Nenhum desequilíbrio muscular de risco detectado. Proporções biomecânicas adequadas.</div>`}
        
        <!-- Observações -->
        ${st.observacoes ? `<div class="section-card" style="margin-top:12px;"><div class="section-card-title">Observações</div><div class="section-card-content" style="font-size:9px;">${st.observacoes}</div></div>` : ''}

        <!-- Footer Empresa -->
        <div style="margin-top: 40px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; font-size: 8px; color: #64748b;">
          <span>Clube Fitness Fisio &nbsp;|&nbsp; Fisioterapia, Quiropraxia e Fortalecimento</span>
        </div>
      </div>
    `;
  }

  const filename = `Analise_Forca_${nome.replace(/\s+/g, '_')}_${data.replace(/\//g, '-')}.pdf`;
  const options = {
    margin: 0,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2.0, useCORS: true, letterRendering: true, scrollX: 0, scrollY: 0, windowWidth: 794, width: 794, x: 0, y: 0 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] }
  };

  html2pdf().set(options).from(pdfContainer).output('blob').then((blob: Blob) => {
    triggerDirectDownload(blob, options.filename);
    document.body.removeChild(pdfWrapper);
  }).catch((err: any) => {
    console.error('Erro PDF força:', err);
    document.body.removeChild(pdfWrapper);
  });
}

// ==========================================================
// HELPERS — valor por extenso em português
// ==========================================================
function valorExtenso(valor: number): string {
  const unidades = ['','um','dois','três','quatro','cinco','seis','sete','oito','nove'];
  const dezenas = ['','dez','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
  const dezenove = ['dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
  const centenas = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];
  function grp(n: number): string { if (!n) return ''; let r=''; const c=Math.floor(n/100),d=Math.floor((n%100)/10),u=n%10; if(c>0){r+=(c===1&&!d&&!u)?'cem':centenas[c];} if(d>0){if(r)r+=' e ';if(d===1){r+=dezenove[u];return r;}r+=dezenas[d];}if(u>0){if(r)r+=' e ';r+=unidades[u];}return r; }
  const int=Math.floor(valor), cts=Math.round((valor-int)*100);
  let t=''; if(!int){t='zero reais';}else if(int===1){t='um real';}else{const m=Math.floor(int/1000),r=int%1000;if(m>0){t=m===1?'mil':`${grp(m)} mil`;if(r>0)t+=(r<100||r%100===0)?` e ${grp(r)}`:` ${grp(r)}`;}else t=grp(r);t+=' reais';}
  const ct=cts>0?(cts===1?'um centavo':`${grp(cts)} centavos`):'';
  return ct?(!int?ct:`${t} e ${ct}`):t;
}

// ==========================================================
// PDF — CONTRATO DE PRESTAÇÃO DE SERVIÇOS
// ==========================================================
export function downloadContractPDF(client: any, plan: any, templateOverride?: string) {
  const html2pdf = (window as any).html2pdf;
  if (!html2pdf) { alert('html2pdf.js não está carregado.'); return; }
  if (!client) { alert('Cliente não encontrado.'); return; }

  const fmtDate = (d: string) => { if (!d) return '-'; const p = d.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; };
  const com = client.dadosComerciais || {};
  const pes = client.dadosPessoais || {};
  
  const planNome = plan?.nome || 'Plano Personalizado';
  const isAnual = (plan?.tipo === 'Anual' || (com.duracao || '').toLowerCase() === 'anual' || planNome.toLowerCase().includes('anual'));
  
  // 1. Cálculos Automáticos de Valores e Descontos
  const basePreco = Number(plan?.preco) || 0;
  const descVal = Number(com.descontoValor) || 0;
  const descTipo = com.descontoTipo || 'percentual';
  
  let valorFinal = basePreco;
  if (descTipo === 'percentual') {
    valorFinal = basePreco * (1 - descVal / 100);
  } else {
    valorFinal = Math.max(0, basePreco - descVal);
  }
  
  const numParcelas = Number(com.parcelas) || 1;
  const valorParcela = valorFinal / numParcelas;
  
  // 2. Vigência e Datas
  const today = new Date().toISOString().split('T')[0];
  const dataInicio = com.dataInicio || com.vencimento || today;
  const vigMeses = isAnual ? 12 : 1;
  
  const endD = new Date(dataInicio + 'T00:00:00');
  endD.setMonth(endD.getMonth() + vigMeses);
  const dataFim = endD.toISOString().split('T')[0];
  
  const formaPagText = ({pix:'Pix',boleto:'Boleto Bancário',cartao:'Cartão de Crédito/Débito',dinheiro:'Dinheiro'} as any)[com.formaPagamento] || com.formaPagamento || 'Pix';
  const now = new Date();
  const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const diaVenc = com.vencimento ? parseInt(com.vencimento.split('-')[2]||'5',10) : now.getDate();

  // Endereço completo estruturado
  const enderecoCompleto = `${pes.endereco || '-'}${pes.numero ? `, nº ${pes.numero}` : ''}${pes.complemento ? `, ${pes.complemento}` : ''}${pes.bairro ? `, Bairro ${pes.bairro}` : ''}${pes.cidade ? `, ${pes.cidade}` : ''}${pes.estado ? `/${pes.estado}` : ''}${pes.cep ? `, CEP ${pes.cep}` : ''}`;
  
  // Serviços Inclusos do Plano
  const servicosList = plan?.servicosPermitidos?.length > 0
    ? plan.servicosPermitidos.join(', ')
    : 'Treinos Monitorados, Fisioterapia, Recovery, Quiropraxia';
    
  // Benefícios Inclusos do Plano
  const beneficiosList = plan?.beneficiosInclusos || [];
  
  const contratoBody = templateOverride || `
    <h3 style="font-size:10pt;font-weight:bold;margin-top:15px;margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:3px;">1. IDENTIFICAÇÃO DAS PARTES</h3>
    <p style="font-size:9.5pt;margin-bottom:4px;line-height:1.4;">
      <strong>CONTRATADO:</strong> CLUBE FITNESS FISIO, com sede em Belo Horizonte/MG.<br>
      <strong>CONTRATANTE:</strong> ${pes.nome || '-'}, de nacionalidade ${pes.nacionalidade || 'brasileiro(a)'}, estado civil ${pes.estadoCivil || 'solteiro(a)'}, ${pes.profissao ? `profissão ${pes.profissao}` : ''}, portador(a) do CPF nº ${pes.cpf || '-'}, nascido(a) em ${fmtDate(pes.dataNascimento)}, e-mail ${pes.email || '-'}, telefones ${pes.telefone || '-'}${pes.telefoneSecundario ? ` / ${pes.telefoneSecundario}` : ''}, residente e domiciliado em: ${enderecoCompleto}.
    </p>

    <h3 style="font-size:10pt;font-weight:bold;margin-top:15px;margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:3px;">2. OBJETO DO CONTRATO</h3>
    <p style="font-size:9.5pt;line-height:1.4;">
      O presente instrumento tem por objeto a prestação de serviços de fisioterapia e atividades físicas na modalidade <strong>Plano ${planNome}</strong>, de acordo com as regras operacionais estabelecidas neste contrato.
    </p>

    <h3 style="font-size:10pt;font-weight:bold;margin-top:15px;margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:3px;">3. SERVIÇOS E BENEFÍCIOS CONTRATADOS</h3>
    <p style="font-size:9.5pt;margin-bottom:4px;line-height:1.4;">
      <strong>3.1 Serviços Inclusos no Plano:</strong> O CONTRATANTE terá direito a utilizar os seguintes serviços e modalidades: ${servicosList}. Saldo total de créditos: ${plan?.creditosTotal || 0} sessões mensais.
    </p>
    <p style="font-size:9.5pt;margin-bottom:4px;line-height:1.4;">
      <strong>3.2 Benefícios Adicionais:</strong> Acesso às avaliações corporais e testes de força muscular periódicos.
      ${isAnual ? `
        <br>• <strong>Massagem Relaxante Mensal:</strong> Direito a 01 (uma) sessão de massagem por mês durante a vigência.
        <br>• <strong>Atendimento Emergencial Complementar:</strong> Acesso a atendimentos emergenciais em caso de dor aguda.
        <br>• <strong>Aulas Coletivas:</strong> Acesso prioritário a aulas coletivas e eventos integrativos do clube.
      ` : ''}
    </p>

    <h3 style="font-size:10pt;font-weight:bold;margin-top:15px;margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:3px;">4. VALOR E FORMA DE PAGAMENTO</h3>
    <p style="font-size:9.5pt;margin-bottom:4px;line-height:1.4;">
      <strong>4.1 Valor Contratado:</strong> O valor final líquido da contratação é de <strong>R$ ${valorFinal.toFixed(2).replace('.', ',')} (${valorExtenso(valorFinal)})</strong>.
    </p>
    <p style="font-size:9.5pt;line-height:1.4;">
      <strong>4.2 Condições:</strong> O pagamento será efetuado em <strong>${numParcelas}</strong> parcela(s) no valor de <strong>R$ ${valorParcela.toFixed(2).replace('.', ',')}</strong> cada, com pagamento via <strong>${formaPagText}</strong> e primeiro vencimento em <strong>${fmtDate(com.vencimento || today)}</strong> (dia de vencimento: <strong>${diaVenc}</strong>).
    </p>

    <h3 style="font-size:10pt;font-weight:bold;margin-top:15px;margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:3px;">5. REGRAS DE AGENDAMENTO E PLANILHA DE TREINO</h3>
    <p style="font-size:9.5pt;margin-bottom:4px;line-height:1.4;">
      <strong>5.1 Desmarcação:</strong> O cancelamento ou alteração de sessões agendadas deverá ocorrer com no mínimo 6 (seis) horas de antecedência.
    </p>
    <p style="font-size:9.5pt;line-height:1.4;">
      <strong>5.2 Faltas:</strong> A ausência não comunicada no prazo estabelecido na cláusula 5.1 resultará na perda automática do crédito da respectiva sessão.
    </p>

    ${isAnual ? `
    <h3 style="font-size:10pt;font-weight:bold;margin-top:15px;margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:3px;">6. CLÁUSULA DE CONGELAMENTO</h3>
    <p style="font-size:9.5pt;line-height:1.4;">
      O CONTRATANTE de plano anual possui o direito de suspender ("congelar") e redistribuir seus créditos por um período de até 30 (trinta) dias em razão de sua ausência, desde que a utilização ocorra estritamente dentro da vigência do plano contratado, sendo vedada a prorrogação do prazo contratual original.
    </p>
    <p style="font-size:9.5pt;line-height:1.4;margin-top:4px;">
      <strong>Parágrafo Único:</strong> O período de congelamento não prorroga o término deste contrato e todos os créditos devem ser gozados até a data final estipulada na Cláusula de Vigência.
    </p>

    <h3 style="font-size:10pt;font-weight:bold;margin-top:15px;margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:3px;">7. GESTÃO TERAPÊUTICA E CRÉDITOS EXCEDENTES</h3>
    <p style="font-size:9.5pt;line-height:1.4;">
      <strong>7.1 Gestão Extraordinária:</strong> Planos anuais incluem acompanhamento de evolução física e clínica personalizada. Créditos excedentes acumulados poderão ser redistribuídos ou convertidos sob supervisão e indicação fisioterapêutica estritamente durante a vigência do contrato.
    </p>
    ` : ''}

    <h3 style="font-size:10pt;font-weight:bold;margin-top:15px;margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:3px;">${isAnual ? '8' : '6'}. REAJUSTE E RESCISÃO ANTECIPADA</h3>
    <p style="font-size:9.5pt;margin-bottom:4px;line-height:1.4;">
      <strong>Reajuste:</strong> O valor do plano sofrerá reajuste anual com base no índice oficial do IPCA/IBGE.
    </p>
    <p style="font-size:9.5pt;line-height:1.4;">
      <strong>Rescisão Antecipada:</strong> O cancelamento deste instrumento por parte do contratante antes do prazo de vigência impõe multa rescisória equivalente a 10% (dez por cento) do saldo remanescente das parcelas em aberto, exigindo comunicação prévia de 30 dias.
    </p>

    <h3 style="font-size:10pt;font-weight:bold;margin-top:15px;margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:3px;">${isAnual ? '9' : '7'}. VIGÊNCIA</h3>
    <p style="font-size:9.5pt;line-height:1.4;">
      Este contrato tem vigência de <strong>${vigMeses} mês(es)</strong>, iniciando em <strong>${fmtDate(dataInicio)}</strong> e término improrrogável em <strong>${fmtDate(dataFim)}</strong>.
    </p>

    <h3 style="font-size:10pt;font-weight:bold;margin-top:15px;margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:3px;">${isAnual ? '10' : '8'}. FORO E LEGISLAÇÃO APLICÁVEL</h3>
    <p style="font-size:9.5pt;line-height:1.4;">
      Fica eleito o Foro da Comarca de Belo Horizonte/MG para dirimir quaisquer dúvidas ou litígios decorrentes do presente contrato.
    </p>
  `;

  // A4 page width in pixels at 96dpi = 794px
  const PAGE_W = 794;

  const pdfWrapper = document.createElement('div');
  pdfWrapper.style.cssText = `position:absolute;left:0;top:${typeof window !== 'undefined' ? window.scrollY : 0}px;width:${PAGE_W}px;opacity:0;z-index:99999;pointer-events:none;overflow:hidden;`;

  const pdfContainer = document.createElement('div');
  // Use internal padding of 56px (~15mm) as margins and set options.margin to 0 to prevent right-edge clipping
  pdfContainer.style.cssText = `width:${PAGE_W}px;background:#fff;color:#000;font-family:Arial,sans-serif;font-size:9.5pt;box-sizing:border-box;padding:56px;margin:0;`;

  pdfWrapper.appendChild(pdfContainer);
  document.body.appendChild(pdfWrapper);

  // If a rich templateOverride was passed (HTML from generateContractTemplate), use it directly.
  // Otherwise build the legacy header + body.
  if (templateOverride) {
    pdfContainer.innerHTML = templateOverride + `
      <style>
        p, h2, h3, h4 {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          display: block !important;
          position: relative !important;
        }
        li, tr, table {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      </style>
    `;
    // Clear padding and margin of the wrapper div to let our internal padding handle it
    const wrapper = pdfContainer.firstElementChild as HTMLElement;
    if (wrapper) {
      wrapper.style.padding = '0px';
      wrapper.style.margin = '0px';
      wrapper.style.maxWidth = '100%';
      wrapper.style.width = '100%';
    }
  } else {
    pdfContainer.innerHTML = `
      <style>
        p, h2, h3, h4 {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          display: block !important;
          position: relative !important;
        }
        li, tr, table {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      </style>
      <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:14px;margin-bottom:18px;">
        <h1 style="font-size:15pt;font-weight:bold;margin:0;color:#10b981;">CLUBE FITNESS FISIO</h1>
        <p style="font-size:9pt;margin:3px 0 0 0;color:#444;">Fisioterapia, Quiropraxia e Fortalecimento — Belo Horizonte, MG</p>
        <h2 style="font-size:13pt;font-weight:bold;margin:10px 0 0 0;text-transform:uppercase;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h2>
        <p style="font-size:8.5pt;margin:3px 0 0 0;color:#555;">Emissão: ${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}</p>
      </div>
      ${contratoBody}
      <div style="margin-top:60px;display:flex;justify-content:space-between;gap:40px;font-size:10pt;">
        <div style="flex:1;text-align:center;"><div style="border-top:1px solid #000;padding-top:6px;margin-top:40px;">CONTRATADO<br><small>Clube Fitness Fisio</small></div></div>
        <div style="flex:1;text-align:center;"><div style="border-top:1px solid #000;padding-top:6px;margin-top:40px;">CONTRATANTE<br><small>${pes.nome||'-'}</small></div></div>
      </div>
    `;
  }

  // Margins in mm (set to 0 since we use internal 56px padding to prevent right-edge cropping)
  const options = {
    margin: 0,
    filename: `Contrato_${(pes.nome||'Aluno').replace(/\s+/g,'_')}_${today}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
      windowWidth: PAGE_W,
      width: PAGE_W,
      x: 0,
      y: 0,
      logging: false,
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };



  html2pdf().set(options).from(pdfContainer).output('blob').then((blob: Blob) => {
    triggerDirectDownload(blob, options.filename);
    document.body.removeChild(pdfWrapper);
  }).catch((err: any) => {
    console.error('Erro PDF contrato:', err);
    document.body.removeChild(pdfWrapper);
  });
}

export function getContractPDFBase64(client: any, plan: any, templateOverride?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const html2pdf = (window as any).html2pdf;
    if (!html2pdf) { reject(new Error('html2pdf.js não está carregado.')); return; }
    if (!client) { reject(new Error('Cliente não encontrado.')); return; }

    const fmtDate = (d: string) => { if (!d) return '-'; const p = d.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; };
    const com = client.dadosComerciais || {};
    const pes = client.dadosPessoais || {};
    
    const planNome = plan?.nome || 'Plano Personalizado';
    const isAnual = (plan?.tipo === 'Anual' || (com.duracao || '').toLowerCase() === 'anual' || planNome.toLowerCase().includes('anual'));
    
    const basePreco = Number(plan?.preco) || 0;
    const descVal = Number(com.descontoValor) || 0;
    const descTipo = com.descontoTipo || 'percentual';
    
    let valorFinal = basePreco;
    if (descTipo === 'percentual') {
      valorFinal = basePreco * (1 - descVal / 100);
    } else {
      valorFinal = Math.max(0, basePreco - descVal);
    }
    
    const numParcelas = Number(com.parcelas) || 1;
    const valorParcela = valorFinal / numParcelas;
    
    const today = new Date().toISOString().split('T')[0];
    const dataInicio = com.dataInicio || com.vencimento || today;
    const vigMeses = isAnual ? 12 : 1;
    
    const endD = new Date(dataInicio + 'T00:00:00');
    endD.setMonth(endD.getMonth() + vigMeses);
    const dataFim = endD.toISOString().split('T')[0];
    
    const formaPagText = ({pix:'Pix',boleto:'Boleto Bancário',cartao:'Cartão de Crédito/Débito',dinheiro:'Dinheiro'} as any)[com.formaPagamento] || com.formaPagamento || 'Pix';
    const now = new Date();
    const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const diaVenc = com.vencimento ? parseInt(com.vencimento.split('-')[2]||'5',10) : now.getDate();

    const enderecoCompleto = `${pes.endereco || '-'}${pes.numero ? `, nº ${pes.numero}` : ''}${pes.complemento ? `, ${pes.complemento}` : ''}${pes.bairro ? `, Bairro ${pes.bairro}` : ''}${pes.cidade ? `, ${pes.cidade}` : ''}${pes.estado ? `/${pes.estado}` : ''}${pes.cep ? `, CEP ${pes.cep}` : ''}`;
    const servicosList = plan?.servicosPermitidos?.length > 0 ? plan.servicosPermitidos.join(', ') : 'Treinos Monitorados, Fisioterapia, Recovery, Quiropraxia';
    
    const contratoBody = templateOverride || `
      <h3 style="font-size:10pt;font-weight:bold;margin-top:15px;margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:3px;">1. IDENTIFICAÇÃO DAS PARTES</h3>
      <p style="font-size:9.5pt;margin-bottom:4px;line-height:1.4;">
        <strong>CONTRATADO:</strong> CLUBE FITNESS FISIO, com sede em Belo Horizonte/MG.<br>
        <strong>CONTRATANTE:</strong> ${pes.nome || '-'}, de nacionalidade ${pes.nacionalidade || 'brasileiro(a)'}, estado civil ${pes.estadoCivil || 'solteiro(a)'}, ${pes.profissao ? `profissão ${pes.profissao}` : ''}, portador(a) do CPF nº ${pes.cpf || '-'}, nascido(a) em ${fmtDate(pes.dataNascimento)}, e-mail ${pes.email || '-'}, telefones ${pes.telefone || '-'}${pes.telefoneSecundario ? ` / ${pes.telefoneSecundario}` : ''}, residente e domiciliado em: ${enderecoCompleto}.
      </p>
      <h3 style="font-size:10pt;font-weight:bold;margin-top:15px;margin-bottom:8px;border-bottom:1px solid #000;padding-bottom:3px;">2. OBJETO DO CONTRATO</h3>
      <p style="font-size:9.5pt;line-height:1.4;">
        O presente instrumento tem por objeto a prestação de serviços de fisioterapia e atividades físicas na modalidade <strong>Plano ${planNome}</strong>, de acordo com as regras operacionais estabelecidas neste contrato.
      </p>
    `;

    const PAGE_W = 794;
    const pdfWrapper = document.createElement('div');
    pdfWrapper.style.cssText = `position:absolute;left:0;top:${typeof window !== 'undefined' ? window.scrollY : 0}px;width:${PAGE_W}px;opacity:0;z-index:99999;pointer-events:none;overflow:hidden;`;
    const pdfContainer = document.createElement('div');
    // Use internal padding of 56px (~15mm) as margins and set options.margin to 0 to prevent right-edge clipping
    pdfContainer.style.cssText = `width:${PAGE_W}px;background:#fff;color:#000;font-family:Arial,sans-serif;font-size:9.5pt;box-sizing:border-box;padding:56px;margin:0;`;
    pdfWrapper.appendChild(pdfContainer);
    document.body.appendChild(pdfWrapper);

    if (templateOverride) {
      pdfContainer.innerHTML = templateOverride + `
        <style>
          p, h2, h3, h4 { page-break-inside: avoid !important; break-inside: avoid !important; display: block !important; position: relative !important; }
          li, tr, table { page-break-inside: avoid !important; break-inside: avoid !important; }
        </style>
      `;
      // Clear padding and margin of the wrapper div to let our internal padding handle it
      const wrapper = pdfContainer.firstElementChild as HTMLElement;
      if (wrapper) {
        wrapper.style.padding = '0px';
        wrapper.style.margin = '0px';
        wrapper.style.maxWidth = '100%';
        wrapper.style.width = '100%';
      }
    } else {
      pdfContainer.innerHTML = `
        <style>
          p, h2, h3, h4 { page-break-inside: avoid !important; break-inside: avoid !important; display: block !important; position: relative !important; }
          li, tr, table { page-break-inside: avoid !important; break-inside: avoid !important; }
        </style>
        <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:14px;margin-bottom:18px;">
          <h1 style="font-size:15pt;font-weight:bold;margin:0;color:#10b981;">CLUBE FITNESS FISIO</h1>
          <p style="font-size:9pt;margin:3px 0 0 0;color:#444;">Fisioterapia, Quiropraxia e Fortalecimento — Belo Horizonte, MG</p>
          <h2 style="font-size:13pt;font-weight:bold;margin:10px 0 0 0;text-transform:uppercase;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h2>
          <p style="font-size:8.5pt;margin:3px 0 0 0;color:#555;">Emissão: ${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}</p>
        </div>
        ${contratoBody}
        <div style="margin-top:60px;display:flex;justify-content:space-between;gap:40px;font-size:10pt;">
          <div style="flex:1;text-align:center;"><div style="border-top:1px solid #000;padding-top:6px;margin-top:40px;">CONTRATADO<br><small>Clube Fitness Fisio</small></div></div>
          <div style="flex:1;text-align:center;"><div style="border-top:1px solid #000;padding-top:6px;margin-top:40px;">CONTRATANTE<br><small>${pes.nome||'-'}</small></div></div>
        </div>
      `;
    }

    const options = {
      margin: 0,
      filename: `Contrato_${(pes.nome||'Aluno').replace(/\s+/g,'_')}_${today}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: PAGE_W,
        width: PAGE_W,
        x: 0,
        y: 0,
        logging: false,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(options).from(pdfContainer).outputPdf('datauristring').then((pdfBase64: string) => {
      document.body.removeChild(pdfWrapper);
      resolve(pdfBase64);
    }).catch((err: any) => {
      document.body.removeChild(pdfWrapper);
      reject(err);
    });
  });
}
