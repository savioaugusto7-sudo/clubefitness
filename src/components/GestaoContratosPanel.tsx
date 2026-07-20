'use client';

import React, { useState, useEffect, useRef } from 'react';
import { downloadContractPDF, getContractPDFBase64 } from '@/utils/pdfGenerator';

const normalizeText = (str: string) => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

interface GestaoContratosPanelProps {
  clients: any[];
  plans: any[];
  userCargo: string;
  fetchData: () => void;
}

export default function GestaoContratosPanel({
  clients,
  plans,
  userCargo,
  fetchData
}: GestaoContratosPanelProps) {
  // Navigation & General states
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contracts, setContracts] = useState<any[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);

  // Form states (Dados Comerciais)
  const [dcPlano, setDcPlano] = useState('');
  const [dcFormaPag, setDcFormaPag] = useState('pix');
  const [dcDuracao, setDcDuracao] = useState<'mensal' | 'anual' | 'semana' | 'indeterminado'>('mensal');
  const [dcVigenciaQtd, setDcVigenciaQtd] = useState(1);
  const [dcValorUnitario, setDcValorUnitario] = useState(0);
  const [dcVencimento, setDcVencimento] = useState('');
  const [dcDescontoTipo, setDcDescontoTipo] = useState<'percentual' | 'fixo'>('percentual');
  const [dcDescontoValor, setDcDescontoValor] = useState(0);
  const [dcParcelas, setDcParcelas] = useState(1);
  const [dcDataInicio, setDcDataInicio] = useState('');
  const [dcResponsavelVenda, setDcResponsavelVenda] = useState('');
  const [dcUnidadeContratada, setDcUnidadeContratada] = useState('');
  const [dcObservacoesContratuais, setDcObservacoesContratuais] = useState('');
  const [dcFrequencia, setDcFrequencia] = useState(3);
  const [dcCreditosTotal, setDcCreditosTotal] = useState(0);
  const [savingComercial, setSavingComercial] = useState(false);

  // Modals & Triggers
  const [showTextPreview, setShowTextPreview] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showImportSignedModal, setShowImportSignedModal] = useState(false);
  const [importPdfFile, setImportPdfFile] = useState<File | null>(null);
  const [importPdfBase64, setImportPdfBase64] = useState<string>('');
  const [importPdfName, setImportPdfName] = useState<string>('');
  const [submittingImport, setSubmittingImport] = useState(false);

  // Asaas Search & Link state
  const [dcAsaasCustomerId, setDcAsaasCustomerId] = useState('');
  const [searchingAsaas, setSearchingAsaas] = useState(false);

  const handleSearchAsaas = async () => {
    if (!selectedClient) return;
    try {
      setSearchingAsaas(true);
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'asaas_search_link',
          clientId: selectedClient._id,
          customCustomerId: dcAsaasCustomerId
        })
      });
      const data = await res.json();
      if (data.success) {
        setDcAsaasCustomerId(data.asaasCustomerId);
        alert(`Sucesso! Cliente vinculado ao Asaas ID: ${data.asaasCustomerId}. Faturas sincronizadas!`);
        fetchData();
        if (selectedClient) loadContracts(selectedClient._id);
      } else {
        alert('Erro ao buscar no Asaas: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro ao buscar no Asaas: ' + err.message);
    } finally {
      setSearchingAsaas(false);
    }
  };

  const handlePdfFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Por favor, selecione um arquivo no formato PDF.');
      return;
    }
    setImportPdfFile(file);
    setImportPdfName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImportPdfBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImportSignedContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    const plan = plans.find(p => p._id === dcPlano);
    if (!plan) {
      alert('Por favor, selecione um plano comercial.');
      return;
    }

    try {
      setSubmittingImport(true);

      const isAnual = dcDuracao === 'anual';
      const bruto = dcValorUnitario * dcVigenciaQtd;
      const descVal = Number(dcDescontoValor) || 0;
      let liquido = bruto;
      if (dcDescontoTipo === 'percentual') {
        liquido = bruto * (1 - descVal / 100);
      } else {
        liquido = Math.max(0, bruto - descVal);
      }

      const endD = new Date((dcDataInicio || new Date().toISOString().split('T')[0]) + 'T00:00:00');
      if (dcDuracao === 'semana') {
        endD.setDate(endD.getDate() + (dcVigenciaQtd * 7));
      } else if (dcDuracao === 'anual') {
        endD.setMonth(endD.getMonth() + (dcVigenciaQtd * 12));
      } else {
        endD.setMonth(endD.getMonth() + dcVigenciaQtd);
      }
      const dataFimCalculada = endD.toISOString().split('T')[0];

      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClient._id,
          planoId: dcPlano,
          planoNome: plan.nome,
          planoTipo: isAnual ? 'Anual' : 'Mensal',
          valorBruto: bruto,
          descontoTipo: dcDescontoTipo,
          descontoValor: descVal,
          valorLiquido: liquido,
          formaPagamento: dcFormaPag,
          parcelas: dcParcelas,
          dataPrimeiroVencimento: dcVencimento || dcDataInicio,
          dataInicio: dcDataInicio,
          dataFim: dataFimCalculada,
          vigenciaMeses: dcVigenciaQtd,
          frequencia: dcFrequencia,
          creditosTotal: dcCreditosTotal,
          status: 'assinado',
          assinaturaNome: 'Importado / Já Assinado Anteriormente',
          contratoAnexo: importPdfBase64,
          usuarioEmissor: 'Sistema / Importação Manual'
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('Contrato existente importado e ativado com sucesso!');
        setShowImportSignedModal(false);
        setImportPdfFile(null);
        setImportPdfBase64('');
        setImportPdfName('');
        setSelectedClient({
          ...selectedClient,
          dadosComerciais: {
            ...selectedClient.dadosComerciais,
            planoId: dcPlano,
            status: 'ativo',
            vencimento: dataFimCalculada,
            dataInicio: dcDataInicio
          }
        });
        loadContracts(selectedClient._id);
        fetchData();
      } else {
        alert('Erro ao registrar contrato: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro ao registrar contrato: ' + err.message);
    } finally {
      setSubmittingImport(false);
    }
  };

  // Presential Signature Modal Canvas states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [sigName, setSigName] = useState('');
  const [sigConsent, setSigConsent] = useState(false);
  const [submittingSignature, setSubmittingSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventDefault = (e: TouchEvent) => {
      e.preventDefault();
    };

    canvas.addEventListener('touchstart', preventDefault, { passive: false });
    canvas.addEventListener('touchmove', preventDefault, { passive: false });
    canvas.addEventListener('touchend', preventDefault, { passive: false });
    canvas.addEventListener('touchcancel', preventDefault, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', preventDefault);
      canvas.removeEventListener('touchmove', preventDefault);
      canvas.removeEventListener('touchend', preventDefault);
      canvas.removeEventListener('touchcancel', preventDefault);
    };
  }, [showSignatureModal]);

  // Filter clients
  const filteredClients = clients.filter(c => {
    const nome = c.dadosPessoais?.nome || '';
    const cpf = c.dadosPessoais?.cpf || '';
    const q = normalizeText(searchQuery);
    return normalizeText(nome).includes(q) || cpf.includes(q);
  });

  // Load contracts for selected client
  const loadContracts = async (clientId: string) => {
    try {
      setLoadingContracts(true);
      const res = await fetch(`/api/contracts?clientId=${clientId}`);
      const data = await res.json();
      if (data.success) {
        setContracts(data.data);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico de contratos:', err);
    } finally {
      setLoadingContracts(false);
    }
  };

  // Sync clicksign status
  const handleSyncClicksign = async (contractId: string) => {
    try {
      const res = await fetch(`/api/clicksign?id=${contractId}`);
      const data = await res.json();
      if (data.success) {
        alert('Status sincronizado com sucesso!');
        if (selectedClient) loadContracts(selectedClient._id);
        fetchData();
      } else {
        alert('Erro ao sincronizar: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro ao sincronizar: ' + err.message);
    }
  };

  // Confirm / Mark contract as Assinado and activate client plan
  const handleConfirmSignContract = async (contractId: string) => {
    if (!selectedClient) return;
    if (!confirm('Deseja marcar este contrato como Assinado e ativar o plano do aluno?')) return;
    try {
      const res = await fetch('/api/contracts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contractId,
          action: 'sign',
          assinaturaNome: selectedClient.dadosPessoais?.nome || 'Assinado Manualmente'
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Contrato marcado como Assinado e plano do aluno ativado com sucesso!');
        loadContracts(selectedClient._id);
        fetchData();
      } else {
        alert('Erro ao ativar contrato: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  // Cancel clicksign/manual contract
  const handleCancelContract = async (contractId: string, clientNome: string) => {
    if (!confirm(`Cancelar o contrato de ${clientNome}? Esta ação não pode ser desfeita.`)) return;
    try {
      const res = await fetch(`/api/clicksign?id=${contractId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('Contrato cancelado com sucesso!');
        if (selectedClient) loadContracts(selectedClient._id);
        fetchData();
      } else {
        alert('Erro ao cancelar: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro ao cancelar: ' + err.message);
    }
  };

  // Select client workspace
  const handleSelectClient = (client: any) => {
    setSelectedClient(client);
    const com = client.dadosComerciais || {};
    
    setDcPlano(com.planoId?._id || com.planoId || '');
    setDcFormaPag(com.formaPagamento || 'pix');
    setDcDuracao(com.duracao || 'mensal');
    setDcVigenciaQtd(com.duracaoQtd || 1);
    setDcValorUnitario(com.valorUnitario || 0);
    setDcVencimento(com.vencimento || '');
    setDcDescontoTipo(com.descontoTipo || 'percentual');
    setDcDescontoValor(com.descontoValor || 0);
    setDcParcelas(com.parcelas || 1);
    setDcDataInicio(com.dataInicio || new Date().toISOString().split('T')[0]);
    setDcResponsavelVenda(com.responsavelVenda || '');
    setDcUnidadeContratada(com.unidadeContratada || '');
    setDcObservacoesContratuais(com.observacoesContratuais || '');
    setDcFrequencia(client.frequencia || 3);
    setDcCreditosTotal(com.creditosTotal || 0);
    setDcAsaasCustomerId(com.asaasCustomerId || '');

    loadContracts(client._id);
  };

  // Auto-fill values when plan changes
  useEffect(() => {
    if (!dcPlano) return;
    const plan = plans.find(p => p._id === dcPlano);
    if (plan) {
      setDcValorUnitario(plan.preco);
      setDcDuracao(plan.tipo === 'Anual' ? 'anual' : 'mensal');
      setDcVigenciaQtd(plan.tipo === 'Anual' ? 12 : 1);
      
      // Setup default credits
      const planCreds = plan.creditosTotal || 0;
      setDcCreditosTotal(planCreds);
    }
  }, [dcPlano, plans]);

  // Save commercial data to client profile
  const handleSaveComercial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    try {
      setSavingComercial(true);

      const isAnual = dcDuracao === 'anual';
      const startD = new Date((dcDataInicio || new Date().toISOString().split('T')[0]) + 'T00:00:00');
      const endD = new Date(startD);
      if (dcDuracao === 'semana') {
        endD.setDate(endD.getDate() + (dcVigenciaQtd * 7));
      } else if (isAnual) {
        endD.setMonth(endD.getMonth() + (dcVigenciaQtd * 12));
      } else {
        endD.setMonth(endD.getMonth() + dcVigenciaQtd);
      }
      const dataFimCalculada = endD.toISOString().split('T')[0];

      const res = await fetch('/api/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedClient._id,
          dadosComerciais: {
            planoId: dcPlano || null,
            formaPagamento: dcFormaPag,
            duracao: dcDuracao,
            duracaoQtd: dcVigenciaQtd,
            valorUnitario: dcValorUnitario,
            vencimento: dataFimCalculada,
            dataPrimeiroVencimento: dcVencimento,
            descontoTipo: dcDescontoTipo,
            descontoValor: dcDescontoValor,
            parcelas: dcParcelas,
            dataInicio: dcDataInicio,
            responsavelVenda: dcResponsavelVenda,
            unidadeContratada: dcUnidadeContratada,
            observacoesContratuais: dcObservacoesContratuais,
            creditosTotal: dcCreditosTotal
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Dados comerciais atualizados com sucesso no perfil do aluno!');
        setSelectedClient(data.data);
        fetchData();
      } else {
        alert('Erro ao salvar dados comerciais: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro ao salvar dados comerciais: ' + err.message);
    } finally {
      setSavingComercial(false);
    }
  };

  // Generate dynamic contract HTML text
  const generateContractText = () => {
    const plan = plans.find(p => p._id === dcPlano);
    if (!plan) return '<p style="color:var(--color-danger);font-weight:bold;">Selecione um plano comercial na coluna da esquerda para gerar a minuta do contrato.</p>';

    const pes = selectedClient.dadosPessoais || {};
    const formattedCpf = pes.cpf || '—';
    const formattedNome = pes.nome || '—';
    
    const isAnual = dcDuracao === 'anual';
    let vigenciaText = '1 (um) mês';
    if (dcDuracao === 'semana') {
      vigenciaText = `${dcVigenciaQtd} semana(s)`;
    } else if (dcDuracao === 'mensal') {
      vigenciaText = dcVigenciaQtd === 1 ? '1 (um) mês' : `${dcVigenciaQtd} meses`;
    } else if (dcDuracao === 'anual') {
      vigenciaText = dcVigenciaQtd === 1 ? '12 (doze) meses (1 ano)' : `${dcVigenciaQtd * 12} meses (${dcVigenciaQtd} anos)`;
    }

    const bruto = dcValorUnitario * dcVigenciaQtd;
    const descVal = Number(dcDescontoValor) || 0;
    let liquido = bruto;
    if (dcDescontoTipo === 'percentual') {
      liquido = bruto * (1 - descVal / 100);
    } else {
      liquido = Math.max(0, bruto - descVal);
    }
    const valFinal = liquido;
    const valorParcela = valFinal / (Number(dcParcelas) || 1);

    const formaPagText = ({ pix: 'Pix', boleto: 'Boleto Bancário', cartao: 'Cartão de Crédito/Débito', dinheiro: 'Dinheiro' } as any)[dcFormaPag] || dcFormaPag;
    const dataContrato = new Date().toLocaleDateString('pt-BR');
    const servicosList = plan.servicosPermitidos?.length > 0 ? plan.servicosPermitidos.join(', ') : 'Treino Monitorado, Recovery, Fisioterapia';

    const endD = new Date((dcDataInicio || new Date().toISOString().split('T')[0]) + 'T00:00:00');
    if (dcDuracao === 'semana') {
      endD.setDate(endD.getDate() + (dcVigenciaQtd * 7));
    } else if (isAnual) {
      endD.setMonth(endD.getMonth() + (dcVigenciaQtd * 12));
    } else {
      endD.setMonth(endD.getMonth() + dcVigenciaQtd);
    }
    const dataFimCalculada = endD.toLocaleDateString('pt-BR');

    const enderecoCompleto = `${pes.endereco || '-'}${pes.numero ? `, nº ${pes.numero}` : ''}${pes.complemento ? `, ${pes.complemento}` : ''}${pes.bairro ? `, Bairro ${pes.bairro}` : ''}${pes.cidade ? `, ${pes.cidade}` : ''}${pes.estado ? `/${pes.estado}` : ''}${pes.cep ? `, CEP ${pes.cep}` : ''}`;

    let html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #000; font-size: 9.5pt;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 15pt; font-weight: bold; color: #10b981;">CLUBE FITNESS FISIO</h1>
          <p style="margin: 4px 0 0; font-size: 9pt; color: #555;">Prestação de Fisioterapia e Atividades Físicas Personalizadas</p>
          <h2 style="margin: 10px 0 0; font-size: 12pt; font-weight: bold; text-transform: uppercase;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS E ADESÃO</h2>
        </div>

        <h3 style="font-size: 10pt; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 2px; margin-top: 15px;">1. IDENTIFICAÇÃO DAS PARTES</h3>
        <p style="margin-bottom: 10px;">
          <strong>CONTRATADA:</strong> CLUBE FITNESS FISIO, sediada em Belo Horizonte, Minas Gerais.<br/>
          <strong>CONTRATANTE:</strong> ${formattedNome}, CPF nº ${formattedCpf}, residente em: ${enderecoCompleto}. E-mail: ${pes.email || '—'}, Telefone: ${pes.telefone || '—'}.
        </p>

        <h3 style="font-size: 10pt; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 2px; margin-top: 15px;">2. OBJETO DO CONTRATO</h3>
        <p style="margin-bottom: 10px;">
          O objeto deste contrato é a prestação de serviços de condicionamento físico e acompanhamento terapêutico na modalidade <strong>Plano ${plan.nome}</strong>.
        </p>

        <h3 style="font-size: 10pt; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 2px; margin-top: 15px;">3. SERVIÇOS E VIGÊNCIA</h3>
        <p style="margin-bottom: 10px;">
          <strong>3.1 Serviços Inclusos:</strong> O aluno terá acesso às seguintes modalidades/serviços: ${servicosList}. Saldo total: ${dcCreditosTotal} créditos mensais.<br/>
          <strong>3.2 Vigência:</strong> Este contrato vigorará por <strong>${vigenciaText}</strong>, iniciando em <strong>${new Date(dcDataInicio + 'T12:00:00').toLocaleDateString('pt-BR')}</strong> e término em <strong>${dataFimCalculada}</strong>.
        </p>

        <h3 style="font-size: 10pt; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 2px; margin-top: 15px;">4. VALORES E CONDIÇÕES DE PAGAMENTO</h3>
        <p style="margin-bottom: 10px;">
          O CONTRATANTE pagará à CONTRATADA o valor líquido total de <strong>R$ ${valFinal.toFixed(2).replace('.', ',')}</strong>, parcelado em <strong>${dcParcelas}x</strong> de <strong>R$ ${valorParcela.toFixed(2).replace('.', ',')}</strong> via <strong>${formaPagText}</strong>, com vencimento inicial em <strong>${new Date(dcVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>.
        </p>

        <h3 style="font-size: 10pt; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 2px; margin-top: 15px;">5. CANCELAMENTOS E MULTAS</h3>
        <p style="margin-bottom: 10px;">
          Cancelamentos e ausências devem ser avisados com antecedência mínima de 6 (seis) horas. Desistências antes do prazo de vigência acarretarão multa rescisória de 10% do valor restante a vencer.
        </p>

        <p style="margin-top: 30px; text-align: center;">Belo Horizonte, ${dataContrato}</p>
        
        <div style="display: flex; justify-content: space-between; margin-top: 40px; gap: 30px;">
          <div style="flex: 1; text-align: center;"><div style="border-top: 1px solid #333; padding-top: 6px;"><strong>CONTRATADO</strong><br/><small>Clube Fitness Fisio</small></div></div>
          <div style="flex: 1; text-align: center;"><div style="border-top: 1px solid #333; padding-top: 6px;"><strong>CONTRATANTE</strong><br/><small>${formattedNome}</small></div></div>
        </div>
      </div>
    `;

    return html;
  };

  // Submit contract (clicksSign, manual pending, or direct signed)
  const handleIssueContract = async (status: 'pendente' | 'clicksign') => {
    const plan = plans.find(p => p._id === dcPlano);
    if (!plan) {
      alert('Selecione um plano comercial.');
      return;
    }

    const isClicksign = status === 'clicksign';
    let pdfBase64 = '';

    if (isClicksign) {
      try {
        pdfBase64 = await getContractPDFBase64(
          {
            ...selectedClient,
            dadosComerciais: {
              planoId: dcPlano,
              formaPagamento: dcFormaPag,
              duracao: dcDuracao,
              vencimento: dcVencimento,
              descontoTipo: dcDescontoTipo,
              descontoValor: dcDescontoValor,
              parcelas: dcParcelas,
              dataInicio: dcDataInicio,
              responsavelVenda: dcResponsavelVenda,
              unidadeContratada: dcUnidadeContratada,
              observacoesContratuais: dcObservacoesContratuais
            }
          },
          plan,
          generateContractText()
        );
      } catch (err: any) {
        alert('Erro ao gerar o PDF para a Clicksign: ' + err.message);
        return;
      }
    }

    const payload = {
      clientId: selectedClient._id,
      planoId: dcPlano,
      descontoTipo: dcDescontoTipo,
      descontoValor: dcDescontoValor,
      parcelas: dcParcelas,
      formaPagamento: dcFormaPag,
      dataPrimeiroVencimento: dcVencimento,
      dataInicio: dcDataInicio,
      responsavelVenda: dcResponsavelVenda,
      unidadeContratada: dcUnidadeContratada,
      observacoesContratuais: dcObservacoesContratuais,
      status: isClicksign ? 'pendente' : 'pendente',
      contratoTexto: generateContractText(),
      usuarioEmissor: userCargo,
      enviarClicksign: isClicksign,
      enviarAsaas: false,
      contratoPdfBase64: pdfBase64,
      frequencia: dcFrequencia,
      creditosTotal: dcCreditosTotal
    };

    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert(isClicksign ? 'Contrato enviado para Clicksign com sucesso!' : 'Contrato pendente gerado!');
        loadContracts(selectedClient._id);
        fetchData();
      } else {
        alert('Erro ao gerar contrato: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  // HTML5 Canvas Drawing functions for Presential Touch Signature
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getMouseCoords(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getMouseCoords(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getTouchCoords(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const coords = getTouchCoords(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  const getMouseCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const getTouchCoords = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Open signature canvas modal
  const handleOpenSignatureModal = () => {
    const plan = plans.find(p => p._id === dcPlano);
    if (!plan) {
      alert('Por favor, selecione um plano comercial antes.');
      return;
    }
    setSigName(selectedClient.dadosPessoais?.nome || '');
    setSigConsent(false);
    setShowSignatureModal(true);
    // Let the DOM render and clear the canvas
    setTimeout(() => clearCanvas(), 100);
  };

  // Submit Touch Signature contract creation
  const handleSaveSignatureContract = async () => {
    if (!sigConsent) {
      alert('Você precisa aceitar os termos declarados.');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    setSubmittingSignature(true);
    try {
      const base64Image = canvas.toDataURL('image/png');
      
      // Grab IP address
      let ip = 'IP não detectado';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        ip = ipData.ip || 'IP não detectado';
      } catch (err) {
        console.warn('Failed to fetch public IP:', err);
      }

      const plan = plans.find(p => p._id === dcPlano);
      const payload = {
        clientId: selectedClient._id,
        planoId: dcPlano,
        descontoTipo: dcDescontoTipo,
        descontoValor: dcDescontoValor,
        parcelas: dcParcelas,
        formaPagamento: dcFormaPag,
        dataPrimeiroVencimento: dcVencimento,
        dataInicio: dcDataInicio,
        responsavelVenda: dcResponsavelVenda,
        unidadeContratada: dcUnidadeContratada,
        observacoesContratuais: dcObservacoesContratuais,
        status: 'assinado',
        assinaturaNome: sigName,
        contratoTexto: generateContractText(),
        usuarioEmissor: userCargo,
        enviarClicksign: false,
        enviarAsaas: false,
        frequencia: dcFrequencia,
        creditosTotal: dcCreditosTotal,
        assinaturaPresencialImage: base64Image,
        trilhaAuditoria: {
          ip,
          dataHora: new Date(),
          operadorNome: userCargo,
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Desconhecido'
        }
      };

      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert('Assinatura presencial coletada e contrato ativado com sucesso!');
        setShowSignatureModal(false);
        loadContracts(selectedClient._id);
        fetchData();
        
        // Trigger auto-download
        downloadContractPDF(selectedClient, plan, payload.contratoTexto, data.data);
      } else {
        alert('Erro ao emitir contrato assinado: ' + data.error);
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
    } finally {
      setSubmittingSignature(false);
    }
  };

  // Render Client List General View
  if (!selectedClient) {
    return (
      <div>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Gestão Completa de Contratos</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            Selecione um aluno para gerenciar dados comerciais, ler minutas de contratos e disparar assinaturas (Clicksign ou Presencial por Touchscreen).
          </p>
        </div>

        <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar aluno por nome ou CPF..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ maxWidth: '360px' }}
          />
        </div>

        <div className="content-panel">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>CPF</th>
                  <th>Plano Comercial Atual</th>
                  <th>Vigência Comercial</th>
                  <th>Status Comercial</th>
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((c: any) => {
                  const com = c.dadosComerciais || {};
                  const plan = plans.find(p => p._id === (com.planoId?._id || com.planoId));
                  const status = com.status || 'pendente';
                  const stLabel = status === 'assinado' ? 'Contrato Ativo' : status === 'congelado' ? 'Congelado' : 'Sem Contrato Ativo';
                  const stColor = status === 'assinado' ? 'var(--color-success)' : status === 'congelado' ? 'var(--color-warning)' : 'var(--text-dim)';
                  
                  return (
                    <tr key={c._id}>
                      <td style={{ fontWeight: 600 }}>{c.dadosPessoais?.nome || 'Sem Nome'}</td>
                      <td>{c.dadosPessoais?.cpf || '—'}</td>
                      <td>{plan?.nome || '—'}</td>
                      <td>
                        {com.dataInicio ? `${new Date(com.dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')} até ${com.vencimento ? new Date(com.vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}` : '—'}
                      </td>
                      <td>
                        <span style={{ color: stColor, fontWeight: 700 }}>{stLabel}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => handleSelectClient(c)}
                        >
                          <i className="fa-solid fa-file-signature" style={{ marginRight: '6px' }}></i> Gerenciar Contratos
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      Nenhum aluno encontrado correspondente à pesquisa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Render Detailed Workspace View for Selected Client
  return (
    <div>
      {/* Workspace Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={() => setSelectedClient(null)}>
          <i className="fa-solid fa-arrow-left" style={{ marginRight: '6px' }}></i> Voltar para a lista
        </button>
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Aluno selecionado: <strong>{selectedClient.dadosPessoais?.nome}</strong> ({selectedClient.dadosPessoais?.cpf || 'Sem CPF'})
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: Commercial settings */}
        <form onSubmit={handleSaveComercial} className="content-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* BLOCO VÍNCULO E BUSCA ASAAS */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <i className="fa-solid fa-credit-card" style={{ color: 'var(--color-primary)' }}></i> Vínculo Asaas (ID do Cliente)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-control"
                style={{ fontSize: '0.83rem', flex: 1 }}
                value={dcAsaasCustomerId}
                onChange={e => setDcAsaasCustomerId(e.target.value)}
                placeholder="ex: cus_0000057489 (ou deixe em branco para CPF)"
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', whiteSpace: 'nowrap', background: 'rgba(16,185,129,0.1)', color: 'var(--color-primary)', borderColor: 'rgba(16,185,129,0.3)' }}
                onClick={handleSearchAsaas}
                disabled={searchingAsaas}
              >
                {searchingAsaas ? (
                  <span><i className="fa-solid fa-spinner fa-spin"></i> Buscando...</span>
                ) : (
                  <span><i className="fa-solid fa-magnifying-glass"></i> Buscar no Asaas</span>
                )}
              </button>
            </div>
            <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', marginTop: '4px' }}>
              Insira o ID ou deixe em branco para buscar por CPF/E-mail no Asaas.
            </small>
          </div>

          <div className="form-group">
            <label>Plano</label>
            <select className="select-custom" value={dcPlano} onChange={e => setDcPlano(e.target.value)} required>
              <option value="">Selecione um plano...</option>
              {plans.map(p => (
                <option key={p._id} value={p._id}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Forma de Pagamento</label>
              <select className="select-custom" value={dcFormaPag} onChange={e => setDcFormaPag(e.target.value)} required>
                <option value="pix">Pix</option>
                <option value="cartao">Cartão de Crédito</option>
                <option value="boleto">Boleto Bancário</option>
                <option value="dinheiro">Dinheiro</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Dia de Vencimento (1º Vencimento)</label>
              <input
                type="date"
                className="form-control"
                value={dcVencimento}
                onChange={e => setDcVencimento(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Tipo Vigência</label>
              <select className="select-custom" value={dcDuracao} onChange={e => setDcDuracao(e.target.value as any)} required>
                <option value="semana">Semana</option>
                <option value="mensal">Mensal</option>
                <option value="anual">Anual</option>
                <option value="indeterminado">Indeterminado</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Qtd Vigência</label>
              <input
                type="number"
                className="form-control"
                value={dcVigenciaQtd}
                onChange={e => setDcVigenciaQtd(Number(e.target.value))}
                min={1}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Desconto Tipo</label>
              <select className="select-custom" value={dcDescontoTipo} onChange={e => setDcDescontoTipo(e.target.value as any)}>
                <option value="percentual">Percentual (%)</option>
                <option value="fixo">Fixo (R$)</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Desconto Valor</label>
              <input
                type="number"
                className="form-control"
                value={dcDescontoValor}
                onChange={e => setDcDescontoValor(Number(e.target.value))}
                min={0}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Nº Parcelas</label>
              <select className="select-custom" value={dcParcelas} onChange={e => setDcParcelas(Number(e.target.value))} required>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}x</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Valor Unitário (R$)</label>
              <input
                type="number"
                className="form-control"
                value={dcValorUnitario}
                onChange={e => setDcValorUnitario(Number(e.target.value))}
                min={0}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Data de Início</label>
              <input
                type="date"
                className="form-control"
                value={dcDataInicio}
                onChange={e => setDcDataInicio(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Créditos Mensais</label>
              <input
                type="number"
                className="form-control"
                value={dcCreditosTotal}
                onChange={e => setDcCreditosTotal(Number(e.target.value))}
                min={0}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Responsável Venda</label>
              <input
                type="text"
                className="form-control"
                value={dcResponsavelVenda}
                onChange={e => setDcResponsavelVenda(e.target.value)}
                placeholder="Ex: Consultor X"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Unidade Contratada</label>
              <input
                type="text"
                className="form-control"
                value={dcUnidadeContratada}
                onChange={e => setDcUnidadeContratada(e.target.value)}
                placeholder="Ex: Unidade Lourdes"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Observações Contratuais</label>
            <textarea
              className="form-control"
              value={dcObservacoesContratuais}
              onChange={e => setDcObservacoesContratuais(e.target.value)}
              placeholder="Inserir observações que aparecem na minuta..."
              style={{ minHeight: '60px', resize: 'vertical' }}
            />
          </div>

          {/* SIMULADOR DE PREÇO & FECHAMENTO */}
          {(() => {
            const brutoSim = dcValorUnitario * dcVigenciaQtd;
            const descValSim = Number(dcDescontoValor) || 0;
            let liquidoSim = brutoSim;
            if (dcDescontoTipo === 'percentual') {
              liquidoSim = brutoSim * (1 - descValSim / 100);
            } else {
              liquidoSim = Math.max(0, brutoSim - descValSim);
            }
            const descontoReaisSim = brutoSim - liquidoSim;
            const valorParcelaSim = liquidoSim / (Number(dcParcelas) || 1);

            const endD = new Date((dcDataInicio || new Date().toISOString().split('T')[0]) + 'T00:00:00');
            if (dcDuracao === 'semana') {
              endD.setDate(endD.getDate() + (dcVigenciaQtd * 7));
            } else if (dcDuracao === 'anual') {
              endD.setMonth(endD.getMonth() + (dcVigenciaQtd * 12));
            } else {
              endD.setMonth(endD.getMonth() + dcVigenciaQtd);
            }
            const dataFimSimStr = endD.toLocaleDateString('pt-BR');

            return (
              <div style={{
                marginTop: '10px',
                padding: '16px',
                background: 'rgba(16, 185, 129, 0.04)',
                border: '1px dashed rgba(16, 185, 129, 0.35)',
                borderRadius: '10px',
                color: 'var(--text-main)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                  <h4 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <i className="fa-solid fa-receipt" style={{ marginRight: '6px' }}></i> Resumo de Venda & Fechamento (Apresentação ao Cliente)
                  </h4>
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(16,185,129,0.12)', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                    Fechamento
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Período de Vigência</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 'bold', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-calendar-week" style={{ color: 'var(--color-primary)', fontSize: '0.85rem' }}></i>
                      {dcDataInicio ? new Date(dcDataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} até {dataFimSimStr}
                    </div>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', marginTop: '2px' }}>
                      Duração: {dcDuracao === 'semana' ? `${dcVigenciaQtd} semana(s)` : dcDuracao === 'mensal' ? `${dcVigenciaQtd} mês(es)` : `${dcVigenciaQtd} ano(s)`}
                    </small>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Valor Total (Líquido)</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 'bold', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-circle-check" style={{ color: 'var(--color-success)', fontSize: '0.85rem' }}></i>
                      R$ {liquidoSim.toFixed(2).replace('.', ',')}
                    </div>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', marginTop: '2px' }}>
                      Bruto: R$ {brutoSim.toFixed(2).replace('.', ',')} (Desc: R$ {descontoReaisSim.toFixed(2).replace('.', ',')})
                    </small>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Condição de Pagamento</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 'bold', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-credit-card" style={{ color: 'var(--color-primary)', fontSize: '0.85rem' }}></i>
                      {dcParcelas}x de R$ {valorParcelaSim.toFixed(2).replace('.', ',')}
                    </div>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', marginTop: '2px' }}>
                      Forma: {dcFormaPag.toUpperCase()}
                    </small>
                  </div>
                </div>
              </div>
            );
          })()}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={savingComercial}
            style={{ width: '100%', marginTop: '10px' }}
          >
            {savingComercial ? (
              <span><i className="fa-solid fa-spinner fa-spin"></i> Salvando no Perfil...</span>
            ) : (
              <span><i className="fa-solid fa-floppy-disk"></i> Salvar Dados Comerciais no Perfil</span>
            )}
          </button>
        </form>

        {/* Right Column: Issuance & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Box 1: Issue actions */}
          <div className="content-panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              <i className="fa-solid fa-file-invoice" style={{ marginRight: '8px' }}></i> Emissão de Novo Contrato
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', padding: '10px', background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.3)', color: '#10b981', fontWeight: 600 }}
                onClick={() => setShowTextPreview(true)}
              >
                <i className="fa-solid fa-book-open" style={{ marginRight: '6px' }}></i> Visualizar Texto Completo do Contrato
              </button>



              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ flex: 1, minWidth: '140px', background: '#10b981', borderColor: '#10b981', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}
                  onClick={() => handleOpenSignatureModal()}
                >
                  <i className="fa-solid fa-hand-pointer"></i> Assinatura Presencial
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, minWidth: '140px', color: '#818cf8', borderColor: 'rgba(129,140,248,0.4)', background: 'rgba(129,140,248,0.08)', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}
                  onClick={() => handleIssueContract('clicksign')}
                >
                  <i className="fa-solid fa-file-signature"></i> Enviar p/ Clicksign
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, minWidth: '140px', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}
                  onClick={() => handleIssueContract('pendente')}
                >
                  <i className="fa-solid fa-clock"></i> Emitir Pendente
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, minWidth: '100%', color: '#10b981', borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.1)', display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center', marginTop: '6px' }}
                  onClick={() => setShowImportSignedModal(true)}
                >
                  <i className="fa-solid fa-file-circle-check"></i> Registrar Já Assinado (Anexar PDF)
                </button>
              </div>
            </div>
          </div>

          {/* Box 2: Contract History */}
          <div className="content-panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              <i className="fa-solid fa-history" style={{ marginRight: '8px' }}></i> Histórico de Contratos Emitidos
            </h3>

            {loadingContracts ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Carregando contratos...
              </div>
            ) : contracts.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Nenhum contrato emitido anteriormente para este aluno.
              </div>
            ) : (
              <div className="table-responsive" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table className="data-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Emissão</th>
                      <th>Plano</th>
                      <th>Tipo</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map(c => {
                      const cType = c.assinaturaPresencialImage ? 'Presencial (Touch)' : c.clicksignDocKey ? 'Clicksign' : 'Manual';
                      const st = c.clicksignStatus || c.status;
                      const statusColor = st === 'assinado' ? 'var(--color-success)' : st === 'cancelado' ? 'var(--color-danger)' : 'var(--color-warning)';
                      
                      return (
                        <tr key={c._id}>
                          <td>{new Date(c.dataEmissao).toLocaleDateString('pt-BR')}</td>
                          <td style={{ fontWeight: 600 }}>{c.planoNome}</td>
                          <td>{cType}</td>
                          <td>
                            <span style={{ color: statusColor, fontWeight: 700 }}>
                              {st === 'assinado' ? 'Assinado' : st === 'cancelado' ? 'Cancelado' : 'Pendente'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '3px 6px', fontSize: '0.75rem' }}
                                title="Baixar PDF do Contrato"
                                onClick={() => {
                                  const plan = plans.find(p => p._id === (c.planoId?._id || c.planoId));
                                  if (plan) downloadContractPDF(selectedClient, plan, c.contratoTexto, c);
                                }}
                              >
                                <i className="fa-solid fa-file-pdf"></i>
                              </button>

                              {st === 'pendente' && (
                                <button
                                  className="btn btn-success"
                                  style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  title="Confirmar / Marcar como Assinado e Ativar Plano"
                                  onClick={() => handleConfirmSignContract(c._id)}
                                >
                                  <i className="fa-solid fa-file-circle-check"></i> Marcar Assinado
                                </button>
                              )}

                              {c.clicksignDocKey && st === 'pendente' && (
                                <>
                                  <button
                                    className="btn btn-secondary"
                                    style={{ padding: '3px 6px', fontSize: '0.75rem', color: 'var(--color-primary)' }}
                                    title="Sincronizar com Clicksign"
                                    onClick={() => handleSyncClicksign(c._id)}
                                  >
                                    <i className="fa-solid fa-sync"></i>
                                  </button>
                                  {c.clicksignUrl && (
                                    <a
                                      href={c.clicksignUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-secondary"
                                      style={{ padding: '3px 6px', fontSize: '0.75rem', color: '#6366f1' }}
                                      title="Abrir Link Clicksign"
                                    >
                                      <i className="fa-solid fa-external-link"></i>
                                    </a>
                                  )}
                                </>
                              )}

                              {st !== 'cancelado' && (
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '3px 6px', fontSize: '0.75rem', color: 'var(--color-danger)' }}
                                  title="Cancelar Contrato"
                                  onClick={() => handleCancelContract(c._id, selectedClient.dadosPessoais?.nome)}
                                >
                                  <i className="fa-solid fa-trash"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: TEXT PREVIEW */}
      {showTextPreview && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowTextPreview(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <div className="modal-header">
              <h3>Minuta de Contrato Gerada</h3>
              <button className="modal-close" onClick={() => setShowTextPreview(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '500px', overflowY: 'auto', background: '#fff', color: '#000', padding: '30px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              <div dangerouslySetInnerHTML={{ __html: generateContractText() }} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowTextPreview(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PRESENTIAL SIGNATURE (TOUCH / CANVAS) */}
      {showSignatureModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => { if (!submittingSignature) setShowSignatureModal(false); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px', width: '95%' }}>
            <div className="modal-header">
              <h3>Assinatura Eletrônica Presencial</h3>
              <button className="modal-close" onClick={() => { if (!submittingSignature) setShowSignatureModal(false); }}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Vire o tablet, celular ou tela touchscreen para que o aluno leia os termos e assine com o dedo ou caneta stylus.
              </p>

              <div className="form-group">
                <label>Nome Completo do Assinante</label>
                <input
                  type="text"
                  className="form-control"
                  value={sigName}
                  onChange={e => setSigName(e.target.value)}
                  placeholder="Nome do aluno ou responsável legal"
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Desenhe a assinatura abaixo:</label>
                <div style={{ background: '#fff', borderRadius: '6px', padding: '4px', display: 'flex', justifyContent: 'center' }}>
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={180}
                    style={{
                      border: '2px dashed #94a3b8',
                      borderRadius: '4px',
                      cursor: 'crosshair',
                      background: '#ffffff',
                      maxWidth: '100%',
                      touchAction: 'none'
                    }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawingTouch}
                    onTouchMove={drawTouch}
                    onTouchEnd={stopDrawingTouch}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={clearCanvas}>
                    <i className="fa-solid fa-eraser"></i> Limpar Tela
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '6px' }}>
                <input
                  type="checkbox"
                  id="sigConsentCheck"
                  checked={sigConsent}
                  onChange={e => setSigConsent(e.target.checked)}
                  style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer' }}
                />
                <label htmlFor="sigConsentCheck" style={{ fontSize: '0.8rem', cursor: 'pointer', lineHeight: '1.4', margin: 0, fontWeight: 500 }}>
                  Declaro que li e concordo com todos os termos do contrato, realizando a assinatura por meio eletrônico touchscreen neste terminal presencial.
                </label>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowSignatureModal(false)}
                disabled={submittingSignature}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveSignatureContract}
                disabled={submittingSignature || !sigConsent || !sigName}
                style={{ background: '#10b981', borderColor: '#10b981' }}
              >
                {submittingSignature ? (
                  <span><i className="fa-solid fa-spinner fa-spin"></i> Enviando...</span>
                ) : (
                  <span><i className="fa-solid fa-file-signature"></i> Finalizar Assinatura</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: IMPORT EXISTING SIGNED CONTRACT */}
      {showImportSignedModal && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => { if (!submittingImport) setShowImportSignedModal(false); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '95%' }}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-file-circle-check" style={{ marginRight: '8px', color: 'var(--color-success)' }}></i>Registrar Contrato Já Assinado</h3>
              <button className="modal-close" onClick={() => { if (!submittingImport) setShowImportSignedModal(false); }}>&times;</button>
            </div>
            <form onSubmit={handleImportSignedContract} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', padding: '12px', borderRadius: '8px', fontSize: '0.83rem', color: 'var(--text-main)' }}>
                <strong>Ativação Direta de Aluno:</strong> Utilize esta opção para cadastrar alunos migrados que já possuem contrato assinado anteriormente. O contrato será registrado com status <strong style={{ color: 'var(--color-success)' }}>ASSINADO</strong> e o plano será ativado imediatamente.
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600 }}>Anexar PDF do Contrato Assinado (Opcional)</label>
                <input
                  type="file"
                  accept="application/pdf"
                  className="form-control"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handlePdfFileSelect(file);
                  }}
                />
                {importPdfName && (
                  <small style={{ color: 'var(--color-success)', marginTop: '4px', display: 'block' }}>
                    <i className="fa-solid fa-circle-check"></i> Arquivo selecionado: {importPdfName}
                  </small>
                )}
              </div>

              <div style={{ border: '1px solid var(--border-color)', padding: '12px', borderRadius: '6px', background: 'var(--bg-secondary)', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div><strong>Aluno:</strong> {selectedClient?.dadosPessoais?.nome || '—'}</div>
                <div><strong>Plano:</strong> {plans.find(p => p._id === dcPlano)?.nome || 'Não selecionado'}</div>
                <div><strong>Data de Início:</strong> {dcDataInicio || 'Não informada'}</div>
                <div><strong>Vigência:</strong> {dcVigenciaQtd} {dcDuracao}(s)</div>
                <div><strong>Valor Unitário:</strong> R$ {dcValorUnitario.toFixed(2)} | <strong>Parcelas:</strong> {dcParcelas}x</div>
                <div><strong>Forma de Pagamento:</strong> {dcFormaPag.toUpperCase()}</div>
              </div>

              <div className="modal-footer" style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowImportSignedModal(false)} disabled={submittingImport}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)' }} disabled={submittingImport}>
                  {submittingImport ? (
                    <span><i className="fa-solid fa-spinner fa-spin"></i> Registrando...</span>
                  ) : (
                    <span><i className="fa-solid fa-check-double"></i> Confirmar e Ativar Aluno</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
