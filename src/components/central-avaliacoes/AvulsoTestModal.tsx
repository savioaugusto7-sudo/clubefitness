'use client';

import React, { useState } from 'react';
import QueixaFisioterapiaCard from '@/components/fisioterapia/QueixaFisioterapiaCard';
import { QueixaFisioterapicaItem } from '@/utils/fisioterapiaQueixasCatalog';
import { calculateHopBatteryAnalysis } from '@/utils/biomechanicsEngine';
import { calculateWellness } from '@/utils/wellnessHelper';

interface AvulsoTestModalProps {
  clientId: string;
  clientNome: string;
  onClose: () => void;
  onSaved: () => void;
  onOpenCompletaPhysical?: () => void;
  onOpenCompletaPhysio?: () => void;
}

type TestCategory =
  | 'Y_TEST'
  | 'STEP_DOWN'
  | 'HOP_TEST'
  | 'WELLNESS'
  | 'GONIOMETRIA'
  | 'DINAMOMETRIA'
  | 'PERIMETRIA'
  | 'COMPOSICAO_CORPORAL'
  | 'TESTES_ESPECIAIS'
  | 'QUEIXAS_EVA';

export default function AvulsoTestModal({
  clientId,
  clientNome,
  onClose,
  onSaved,
  onOpenCompletaPhysical,
  onOpenCompletaPhysio
}: AvulsoTestModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<TestCategory>('Y_TEST');
  const [dataTeste, setDataTeste] = useState<string>(new Date().toISOString().split('T')[0]);
  const [observacoes, setObservacoes] = useState('');
  const [saving, setSaving] = useState(false);

  // 1. Y-Test Form State
  const [yMembroCm, setYMembroCm] = useState<number | ''>(85);
  const [yAntD, setYAntD] = useState<number | ''>('');
  const [yAntE, setYAntE] = useState<number | ''>('');
  const [yPmD, setYPmD] = useState<number | ''>('');
  const [yPmE, setYPmE] = useState<number | ''>('');
  const [yPlD, setYPlD] = useState<number | ''>('');
  const [yPlE, setYPlE] = useState<number | ''>('');

  // 2. Step Down Form State
  const [sdDegrau, setSdDegrau] = useState<number>(20);
  const [sdEstrategiaTroncoD, setSdEstrategiaTroncoD] = useState<boolean>(false);
  const [sdEstrategiaTroncoE, setSdEstrategiaTroncoE] = useState<boolean>(false);
  const [sdValgoD, setSdValgoD] = useState<boolean>(false);
  const [sdValgoE, setSdValgoE] = useState<boolean>(false);
  const [sdApoioAntepeD, setSdApoioAntepeD] = useState<boolean>(false);
  const [sdApoioAntepeE, setSdApoioAntepeE] = useState<boolean>(false);
  const [sdPontuacaoD, setSdPontuacaoD] = useState<number | ''>('');
  const [sdPontuacaoE, setSdPontuacaoE] = useState<number | ''>('');

  // 2.5 Hop Tests Form State (Bateria de Saltos Canônica LSI >= 90%)
  const [hopMembroAfetado, setHopMembroAfetado] = useState<'Direito' | 'Esquerdo' | 'Bilateral' | 'Nenhum'>('Nenhum');
  const [hopSingleD, setHopSingleD] = useState<number | ''>('');
  const [hopSingleE, setHopSingleE] = useState<number | ''>('');
  const [hopTripleD, setHopTripleD] = useState<number | ''>('');
  const [hopTripleE, setHopTripleE] = useState<number | ''>('');
  const [hopCrossD, setHopCrossD] = useState<number | ''>('');
  const [hopCrossE, setHopCrossE] = useState<number | ''>('');
  const [hopTimedD, setHopTimedD] = useState<number | ''>('');
  const [hopTimedE, setHopTimedE] = useState<number | ''>('');

  // 2.6 Wellness & Prontidão Form State (Sono, Fadiga, Dor 1-10)
  const [wellSono, setWellSono] = useState<number>(3);
  const [wellFadiga, setWellFadiga] = useState<number>(3);
  const [wellDor, setWellDor] = useState<number>(3);

  // 3. Goniometria Form State (Padrão Canônico Oficial)
  const [gDorsi1D, setGDorsi1D] = useState<number | ''>('');
  const [gDorsi1E, setGDorsi1E] = useState<number | ''>('');
  const [gDorsi2D, setGDorsi2D] = useState<number | ''>('');
  const [gDorsi2E, setGDorsi2E] = useState<number | ''>('');
  const [gJoelhoFlexD, setGJoelhoFlexD] = useState<number | ''>('');
  const [gJoelhoFlexE, setGJoelhoFlexE] = useState<number | ''>('');
  const [gPopliteoD, setGPopliteoD] = useState<number | ''>('');
  const [gPopliteoE, setGPopliteoE] = useState<number | ''>('');
  const [gOmbroRotIntD, setGOmbroRotIntD] = useState<number | ''>('');
  const [gOmbroRotIntE, setGOmbroRotIntE] = useState<number | ''>('');
  const [gOmbroRotExtD, setGOmbroRotExtD] = useState<number | ''>('');
  const [gOmbroRotExtE, setGOmbroRotExtE] = useState<number | ''>('');

  // 4. Dinamometria Form State
  const [stGrupo, setStGrupo] = useState('Extensores de Joelho');
  const [stUnidade, setStUnidade] = useState<'N' | 'kgf'>('N');
  const [stValorD, setStValorD] = useState<number | ''>('');
  const [stValorE, setStValorE] = useState<number | ''>('');

  // 5. Perimetria Form State
  const [periBracoD, setPeriBracoD] = useState<number | ''>('');
  const [periBracoE, setPeriBracoE] = useState<number | ''>('');
  const [periCoxaD, setPeriCoxaD] = useState<number | ''>('');
  const [periCoxaE, setPeriCoxaE] = useState<number | ''>('');
  const [periCintura, setPeriCintura] = useState<number | ''>('');
  const [periQuadril, setPeriQuadril] = useState<number | ''>('');

  // 6. Composição Corporal
  const [ccPeso, setCcPeso] = useState<number | ''>('');
  const [ccGordura, setCcGordura] = useState<number | ''>('');
  const [ccMassaMagra, setCcMassaMagra] = useState<number | ''>('');

  // 7. Testes Ortopédicos / Estrela de Maggi
  const [toThomas, setToThomas] = useState<'Normal' | 'Encurtado' | 'Positivo'>('Normal');
  const [toOber, setToOber] = useState<'Normal' | 'Encurtado' | 'Positivo'>('Normal');
  const [toMaggi, setToMaggi] = useState('');
  const [toKfboD, setToKfboD] = useState<number | ''>('');
  const [toKfboE, setToKfboE] = useState<number | ''>('');

  // 8. Queixa Dor EVA Padronizada (Anatomia + CIF)
  const [evaQueixa, setEvaQueixa] = useState<QueixaFisioterapicaItem>({
    regiao: 'Joelho',
    subRegiao: 'Anterior / Patelofemoral (Retropatelar / Tróclea)',
    lateralidade: 'Direito',
    dorIntensidade: 5,
    atividadesAgravantes: ['Descer escadas', 'Agachar (Squatting)'],
    fatoresAlivio: ['Repouso absoluto'],
    dorEvolucao: 'estavel',
    comportamentoDor: 'Intermitente',
    caracteristicaDor: 'Pontual / Aguda',
    dorOnde: 'Joelho Direito (Anterior / Patelofemoral)',
    desencadeiaPiora: 'Descer escadas, Agachar (Squatting)',
    melhoraDesaparece: 'Repouso absoluto'
  });

  // Cálculos dinâmicos em tempo real
  const yCalc = React.useMemo(() => {
    const dAnt = Number(yAntD) || 0;
    const eAnt = Number(yAntE) || 0;
    const difAnt = Math.abs(dAnt - eAnt);

    const somaD = dAnt + (Number(yPmD) || 0) + (Number(yPlD) || 0);
    const somaE = eAnt + (Number(yPmE) || 0) + (Number(yPlE) || 0);
    const memb = Number(yMembroCm) || 0;

    const scoreCompD = memb > 0 ? (somaD / (3 * memb)) * 100 : 0;
    const scoreCompE = memb > 0 ? (somaE / (3 * memb)) * 100 : 0;
    const maxComp = Math.max(scoreCompD, scoreCompE);
    const assimetria = maxComp > 0 ? (Math.abs(scoreCompD - scoreCompE) / maxComp) * 100 : 0;

    return { difAnt, scoreCompD, scoreCompE, assimetria };
  }, [yMembroCm, yAntD, yAntE, yPmD, yPmE, yPlD, yPlE]);

  const hopCalc = React.useMemo(() => {
    return calculateHopBatteryAnalysis({
      membroAfetado: hopMembroAfetado,
      singleHopD: hopSingleD,
      singleHopE: hopSingleE,
      tripleHopD: hopTripleD,
      tripleHopE: hopTripleE,
      crossoverHopD: hopCrossD,
      crossoverHopE: hopCrossE,
      timedHopD: hopTimedD,
      timedHopE: hopTimedE
    });
  }, [hopMembroAfetado, hopSingleD, hopSingleE, hopTripleD, hopTripleE, hopCrossD, hopCrossE, hopTimedD, hopTimedE]);

  const wellnessCalc = React.useMemo(() => {
    return calculateWellness(wellSono, wellFadiga, wellDor);
  }, [wellSono, wellFadiga, wellDor]);

  const dinamometriaAssimetria = React.useMemo(() => {
    const vd = Number(stValorD) || 0;
    const ve = Number(stValorE) || 0;
    const maxVal = Math.max(vd, ve);
    if (maxVal === 0) return 0;
    return Number(((Math.abs(vd - ve) / maxVal) * 100).toFixed(1));
  }, [stValorD, stValorE]);

  const handleSalvar = async () => {
    setSaving(true);
    try {
      let payloadDados: any = {};
      let payloadMetricas: any = {};

      if (selectedCategory === 'WELLNESS') {
        const resWell = await fetch('/api/wellness', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clienteId: clientId,
            data: dataTeste,
            sono: wellSono,
            fadiga: wellFadiga,
            dorMuscular: wellDor
          })
        });
        const jsonWell = await resWell.json();
        if (!jsonWell.success) throw new Error(jsonWell.error || 'Falha ao salvar wellness');
        alert('Check-in de Wellness registrado com sucesso!');
        onSaved();
        onClose();
        return;
      } else if (selectedCategory === 'Y_TEST') {
        payloadDados = {
          comprimentoMembroCm: yMembroCm,
          alcanceAnteriorD: yAntD,
          alcanceAnteriorE: yAntE,
          alcancePosteromedialD: yPmD,
          alcancePosteromedialE: yPmE,
          alcancePosterolateralD: yPlD,
          alcancePosterolateralE: yPlE
        };
        payloadMetricas = {
          scorePrincipal: Number(yCalc.scoreCompD.toFixed(1)),
          assimetriaPercentual: Number(yCalc.assimetria.toFixed(1)),
          assimetriaAbsoluta: Number(yCalc.difAnt.toFixed(1)),
          classificacao: yCalc.difAnt > 4 ? 'Assimetria anterior > 4 cm (Risco para joelho)' : 'Normal'
        };
      } else if (selectedCategory === 'STEP_DOWN') {
        payloadDados = {
          degrauCm: sdDegrau,
          estrategiaTroncoD: sdEstrategiaTroncoD,
          estrategiaTroncoE: sdEstrategiaTroncoE,
          valgoD: sdValgoD,
          valgoE: sdValgoE,
          apoioAntepeD: sdApoioAntepeD,
          apoioAntepeE: sdApoioAntepeE,
          pontuacaoD: sdPontuacaoD,
          pontuacaoE: sdPontuacaoE
        };
        payloadMetricas = {
          scorePrincipal: Number(sdPontuacaoD) || 0,
          classificacao: (Number(sdPontuacaoD) > 2 || Number(sdPontuacaoE) > 2) ? 'Déficit de controle dinâmico' : 'Excelente'
        };
      } else if (selectedCategory === 'HOP_TEST') {
        payloadDados = {
          membroAfetado: hopMembroAfetado,
          singleHopD: hopSingleD,
          singleHopE: hopSingleE,
          tripleHopD: hopTripleD,
          tripleHopE: hopTripleE,
          crossoverHopD: hopCrossD,
          crossoverHopE: hopCrossE,
          timedHopD: hopTimedD,
          timedHopE: hopTimedE,
          testes: hopCalc?.testes || []
        };
        payloadMetricas = {
          scorePrincipal: hopCalc?.lsiMedio || 0,
          lsiMedio: hopCalc?.lsiMedio || 0,
          statusGeral: hopCalc?.statusGeral || 'retencao',
          classificacao: hopCalc?.badgeStatus || 'Pendente'
        };
      } else if (selectedCategory === 'GONIOMETRIA') {
        payloadDados = {
          tornozeloDorsi1D: gDorsi1D !== '' ? { semForca: Number(gDorsi1D), comForca: '' } : undefined,
          tornozeloDorsi1E: gDorsi1E !== '' ? { semForca: Number(gDorsi1E), comForca: '' } : undefined,
          tornozeloDorsi2D: gDorsi2D !== '' ? { semForca: Number(gDorsi2D), comForca: '' } : undefined,
          tornozeloDorsi2E: gDorsi2E !== '' ? { semForca: Number(gDorsi2E), comForca: '' } : undefined,
          joelhoFlexaoD: gJoelhoFlexD !== '' ? { semForca: Number(gJoelhoFlexD), comForca: '' } : undefined,
          joelhoFlexaoE: gJoelhoFlexE !== '' ? { semForca: Number(gJoelhoFlexE), comForca: '' } : undefined,
          joelhoPopliteoD: gPopliteoD !== '' ? { semForca: Number(gPopliteoD), comForca: '' } : undefined,
          joelhoPopliteoE: gPopliteoE !== '' ? { semForca: Number(gPopliteoE), comForca: '' } : undefined,
          ombroRotIntD: gOmbroRotIntD !== '' ? { semForca: Number(gOmbroRotIntD), comForca: '' } : undefined,
          ombroRotIntE: gOmbroRotIntE !== '' ? { semForca: Number(gOmbroRotIntE), comForca: '' } : undefined,
          ombroRotExtD: gOmbroRotExtD !== '' ? { semForca: Number(gOmbroRotExtD), comForca: '' } : undefined,
          ombroRotExtE: gOmbroRotExtE !== '' ? { semForca: Number(gOmbroRotExtE), comForca: '' } : undefined
        };
      } else if (selectedCategory === 'DINAMOMETRIA') {
        payloadDados = {
          grupoMuscular: stGrupo,
          unidade: stUnidade,
          ladoDireito: stValorD,
          ladoEsquerdo: stValorE,
          assimetriaPercentual: dinamometriaAssimetria
        };
        payloadMetricas = {
          scorePrincipal: Math.max(Number(stValorD) || 0, Number(stValorE) || 0),
          assimetriaPercentual: dinamometriaAssimetria,
          classificacao: dinamometriaAssimetria > 15 ? 'Assimetria Crítica (>15%)' : (dinamometriaAssimetria > 10 ? 'Atenção (10-15%)' : 'Simétrico (≤10%)')
        };
      } else if (selectedCategory === 'PERIMETRIA') {
        payloadDados = {
          braçoD: periBracoD,
          braçoE: periBracoE,
          coxaD: periCoxaD,
          coxaE: periCoxaE,
          cintura: periCintura,
          quadril: periQuadril
        };
      } else if (selectedCategory === 'COMPOSICAO_CORPORAL') {
        payloadDados = {
          peso: ccPeso,
          percentualGordura: ccGordura,
          massaMagraKg: ccMassaMagra
        };
        payloadMetricas = {
          scorePrincipal: Number(ccGordura) || 0
        };
      } else if (selectedCategory === 'TESTES_ESPECIAIS') {
        payloadDados = {
          thomas: toThomas,
          ober: toOber,
          estrelaMaggi: toMaggi,
          kfboD: toKfboD,
          kfboE: toKfboE
        };
      } else if (selectedCategory === 'QUEIXAS_EVA') {
        payloadDados = {
          regiao: evaQueixa.regiao,
          subRegiao: evaQueixa.subRegiao,
          lateralidade: evaQueixa.lateralidade,
          intensidade: evaQueixa.dorIntensidade,
          atividadesAgravantes: evaQueixa.atividadesAgravantes,
          fatoresAlivio: evaQueixa.fatoresAlivio,
          caracteristica: evaQueixa.caracteristicaDor || 'Pontual / Aguda',
          observacoesLivres: evaQueixa.observacoesLivres || '',
          // Retrocompatibilidade automática sintetizada:
          dorOnde: evaQueixa.dorOnde,
          desencadeiaPiora: evaQueixa.desencadeiaPiora,
          melhoraDesaparece: evaQueixa.melhoraDesaparece
        };
        payloadMetricas = {
          scorePrincipal: evaQueixa.dorIntensidade,
          regiao: evaQueixa.regiao,
          lateralidade: evaQueixa.lateralidade,
          subRegiao: evaQueixa.subRegiao,
          classificacao: evaQueixa.dorIntensidade === 0
            ? 'Sem dor'
            : evaQueixa.dorIntensidade <= 3
            ? 'Dor leve'
            : evaQueixa.dorIntensidade <= 6
            ? 'Dor moderada'
            : 'Dor severa'
        };
      }

      const res = await fetch('/api/client-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: clientId,
          data: dataTeste,
          tipoTeste: selectedCategory,
          dados: payloadDados,
          metricas: payloadMetricas,
          observacoes,
          origemDocumento: { tipo: 'Avulso' }
        })
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Falha ao salvar teste');

      alert('Teste registrado com sucesso!');
      onSaved();
      onClose();
    } catch (err: any) {
      alert(`Erro ao salvar teste: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(5, 8, 15, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#0f172a',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          maxWidth: '750px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -10px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#0f172a',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-bolt" style={{ color: '#ec4899' }} />
              Lançamento de Teste Avulso / Medição
            </h4>
            <small style={{ color: 'var(--text-dim, #94a3b8)' }}>
              Aluno: <strong style={{ color: '#e2e8f0' }}>{clientNome}</strong> • Registro isolado sem necessidade de avaliação completa
            </small>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-dim, #94a3b8)', fontSize: '1.2rem', cursor: 'pointer' }}
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Barra de Data e Atalhos para Avaliação Completa */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#161f30',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>Data da Medição:</label>
            <input
              type="date"
              className="form-control form-control-sm"
              style={{ width: '150px' }}
              value={dataTeste}
              onChange={e => setDataTeste(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {onOpenCompletaPhysical && (
              <button
                type="button"
                onClick={() => { onClose(); onOpenCompletaPhysical(); }}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.75rem', borderColor: 'var(--primary)', color: 'var(--primary)' }}
              >
                <i className="fas fa-heartbeat" style={{ marginRight: '4px' }} />
                Avaliação Física Completa
              </button>
            )}
            {onOpenCompletaPhysio && (
              <button
                type="button"
                onClick={() => { onClose(); onOpenCompletaPhysio(); }}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.75rem', borderColor: 'var(--secondary)', color: 'var(--secondary)' }}
              >
                <i className="fas fa-file-medical" style={{ marginRight: '4px' }} />
                Relatório Fisio Completo
              </button>
            )}
          </div>
        </div>

        {/* Grade de Seleção do Teste */}
        <div style={{ padding: '12px 20px 6px', backgroundColor: '#0f172a', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', overflowX: 'auto', display: 'flex', gap: '6px' }}>
          {[
            { id: 'Y_TEST', label: 'Y-Test', icon: 'fa-shoe-prints' },
            { id: 'STEP_DOWN', label: 'Step Down', icon: 'fa-sort-amount-down' },
            { id: 'HOP_TEST', label: 'Hop Tests (LSI)', icon: 'fa-person-running' },
            { id: 'WELLNESS', label: 'Wellness & ACWR', icon: 'fa-battery-half' },
            { id: 'GONIOMETRIA', label: 'Goniometria', icon: 'fa-ruler-combined' },
            { id: 'DINAMOMETRIA', label: 'Força Kinology', icon: 'fa-weight-hanging' },
            { id: 'QUEIXAS_EVA', label: 'Dor EVA', icon: 'fa-heartbeat' },
            { id: 'TESTES_ESPECIAIS', label: 'Ortopédicos / Maggi', icon: 'fa-star' },
            { id: 'PERIMETRIA', label: 'Perimetria', icon: 'fa-ruler-horizontal' },
            { id: 'COMPOSICAO_CORPORAL', label: 'Composição', icon: 'fa-percentage' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedCategory(t.id as TestCategory)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: selectedCategory === t.id ? '#6366f1' : 'rgba(255, 255, 255, 0.12)',
                background: selectedCategory === t.id ? '#312e81' : '#161f30',
                color: selectedCategory === t.id ? '#fff' : 'var(--text-dim, #94a3b8)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className={`fas ${t.icon}`} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Corpo do Formulário do Teste Específico */}
        <div style={{ padding: '20px', backgroundColor: '#0b0f19', overflowY: 'auto', flex: 1 }}>
          {/* 1. Y-TEST */}
          {selectedCategory === 'Y_TEST' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ backgroundColor: '#161f30', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>
                  Comprimento do Membro Inferior (cm) — Da EIAS ao maléolo medial:
                </label>
                <input
                  type="number"
                  placeholder="Ex: 85"
                  className="form-control form-control-sm"
                  style={{ width: '120px' }}
                  value={yMembroCm}
                  onChange={e => setYMembroCm(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>

              <table className="data-table" style={{ margin: 0, fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Direção do Alcance</th>
                    <th style={{ textAlign: 'center' }}>Direito (cm)</th>
                    <th style={{ textAlign: 'center' }}>Esquerdo (cm)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Anterior</strong> <small style={{ color: 'var(--text-dim)' }}>(Diferença normal &le; 4 cm)</small></td>
                    <td><input type="number" step="0.1" className="form-control form-control-sm" value={yAntD} onChange={e => setYAntD(e.target.value === '' ? '' : Number(e.target.value))} /></td>
                    <td><input type="number" step="0.1" className="form-control form-control-sm" value={yAntE} onChange={e => setYAntE(e.target.value === '' ? '' : Number(e.target.value))} /></td>
                  </tr>
                  <tr>
                    <td><strong>Posteromedial</strong></td>
                    <td><input type="number" step="0.1" className="form-control form-control-sm" value={yPmD} onChange={e => setYPmD(e.target.value === '' ? '' : Number(e.target.value))} /></td>
                    <td><input type="number" step="0.1" className="form-control form-control-sm" value={yPmE} onChange={e => setYPmE(e.target.value === '' ? '' : Number(e.target.value))} /></td>
                  </tr>
                  <tr>
                    <td><strong>Posterolateral</strong></td>
                    <td><input type="number" step="0.1" className="form-control form-control-sm" value={yPlD} onChange={e => setYPlD(e.target.value === '' ? '' : Number(e.target.value))} /></td>
                    <td><input type="number" step="0.1" className="form-control form-control-sm" value={yPlE} onChange={e => setYPlE(e.target.value === '' ? '' : Number(e.target.value))} /></td>
                  </tr>
                </tbody>
              </table>

              {/* Feedback dinâmico do Y-Test */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '10px 14px', background: 'var(--bg-dark)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem' }}>
                  Diferença Anterior: <strong style={{ color: yCalc.difAnt > 4 ? '#ef4444' : '#10b981' }}>{yCalc.difAnt.toFixed(1)} cm</strong>
                </span>
                <span style={{ fontSize: '0.8rem' }}>
                  Score Composto: <strong>D: {yCalc.scoreCompD.toFixed(1)}% | E: {yCalc.scoreCompE.toFixed(1)}%</strong>
                </span>
                <span style={{ fontSize: '0.8rem' }}>
                  Assimetria Composta: <strong style={{ color: yCalc.assimetria > 10 ? '#ef4444' : '#10b981' }}>{yCalc.assimetria.toFixed(1)}%</strong>
                </span>
              </div>
            </div>
          )}

          {/* 2. STEP DOWN TEST */}
          {selectedCategory === 'STEP_DOWN' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: 0 }}>Altura do Degrau:</label>
                <select
                  value={sdDegrau}
                  onChange={e => setSdDegrau(Number(e.target.value))}
                  className="form-control form-control-sm"
                  style={{ width: '120px' }}
                >
                  <option value={15}>15 cm</option>
                  <option value={20}>20 cm</option>
                </select>
              </div>

              <table className="data-table" style={{ margin: 0, fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Compensação Observada</th>
                    <th style={{ textAlign: 'center' }}>Direito</th>
                    <th style={{ textAlign: 'center' }}>Esquerdo</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Valgo Dinâmico de Joelho (+1 pt)</td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={sdValgoD} onChange={e => setSdValgoD(e.target.checked)} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={sdValgoE} onChange={e => setSdValgoE(e.target.checked)} />
                    </td>
                  </tr>
                  <tr>
                    <td>Oscilação / Estratégia de Tronco (+1 pt)</td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={sdEstrategiaTroncoD} onChange={e => setSdEstrategiaTroncoD(e.target.checked)} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={sdEstrategiaTroncoE} onChange={e => setSdEstrategiaTroncoE(e.target.checked)} />
                    </td>
                  </tr>
                  <tr>
                    <td>Apoio de Antepé / Queda de Calcanhar (+1 pt)</td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={sdApoioAntepeD} onChange={e => setSdApoioAntepeD(e.target.checked)} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={sdApoioAntepeE} onChange={e => setSdApoioAntepeE(e.target.checked)} />
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Pontuação Final (0 = Excelente, &ge;2 = Déficit)</strong></td>
                    <td>
                      <input
                        type="number"
                        placeholder="0-3"
                        className="form-control form-control-sm"
                        value={sdPontuacaoD}
                        onChange={e => setSdPontuacaoD(e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        placeholder="0-3"
                        className="form-control form-control-sm"
                        value={sdPontuacaoE}
                        onChange={e => setSdPontuacaoE(e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* 2.5 HOP TESTS (BATERIA DE SALTOS UNIPODAIS - NOYES ET AL. - LSI ≥ 90%) */}
          {selectedCategory === 'HOP_TEST' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '10px 14px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <small style={{ color: '#818cf8', fontWeight: 600 }}>
                    <i className="fas fa-info-circle" style={{ marginRight: '6px' }} />
                    Bateria de Saltos Unipodais (Noyes): LSI ≥ 90% é o corte padrão-ouro para liberação de corrida, agilidade e retorno ao esporte (RTS).
                  </small>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#cbd5e1', margin: 0, fontWeight: 600 }}>Membro Lesionado/Afetado:</label>
                    <select
                      value={hopMembroAfetado}
                      onChange={e => setHopMembroAfetado(e.target.value as any)}
                      className="form-control form-control-sm"
                      style={{ width: '150px', background: '#0f172a', color: '#fff', borderColor: '#475569' }}
                    >
                      <option value="Nenhum">Nenhum / Profilático</option>
                      <option value="Direito">Direito (Lesionado)</option>
                      <option value="Esquerdo">Esquerdo (Lesionado)</option>
                      <option value="Bilateral">Bilateral</option>
                    </select>
                  </div>
                </div>
              </div>

              <table className="data-table" style={{ margin: 0, fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Teste Funcional de Salto</th>
                    <th style={{ textAlign: 'center' }}>Referência</th>
                    <th style={{ textAlign: 'center' }}>Direito (D)</th>
                    <th style={{ textAlign: 'center' }}>Esquerdo (E)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>1. Single Hop for Distance</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Salto unipodal simples para frente (cm)</div>
                    </td>
                    <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 600 }}>LSI ≥ 90%</td>
                    <td>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Ex: 145"
                        className="form-control form-control-sm"
                        value={hopSingleD}
                        onChange={e => setHopSingleD(e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Ex: 140"
                        className="form-control form-control-sm"
                        value={hopSingleE}
                        onChange={e => setHopSingleE(e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>2. Triple Hop for Distance</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>3 saltos contínuos em linha reta (cm)</div>
                    </td>
                    <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 600 }}>LSI ≥ 90%</td>
                    <td>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Ex: 420"
                        className="form-control form-control-sm"
                        value={hopTripleD}
                        onChange={e => setHopTripleD(e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Ex: 405"
                        className="form-control form-control-sm"
                        value={hopTripleE}
                        onChange={e => setHopTripleE(e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>3. Crossover Hop for Distance</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>3 saltos cruzando faixa central de 15 cm (cm)</div>
                    </td>
                    <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 600 }}>LSI ≥ 90%</td>
                    <td>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Ex: 380"
                        className="form-control form-control-sm"
                        value={hopCrossD}
                        onChange={e => setHopCrossD(e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Ex: 360"
                        className="form-control form-control-sm"
                        value={hopCrossE}
                        onChange={e => setHopCrossE(e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>4. 6-Meter Timed Hop</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Salto contínuo por 6 metros cronometrado (segundos)</div>
                    </td>
                    <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 600 }}>LSI ≥ 90%</td>
                    <td>
                      <input
                        type="number"
                        step="0.05"
                        placeholder="Ex: 2.15"
                        className="form-control form-control-sm"
                        value={hopTimedD}
                        onChange={e => setHopTimedD(e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.05"
                        placeholder="Ex: 2.22"
                        className="form-control form-control-sm"
                        value={hopTimedE}
                        onChange={e => setHopTimedE(e.target.value === '' ? '' : Number(e.target.value))}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Live Preview Inteligente de Simetria e Parecer RTS */}
              {hopCalc && hopCalc.testes.length > 0 && (
                <div style={{ background: '#0a0f1d', border: `1px solid ${hopCalc.badgeCor}`, borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
                        Simetria Global (LSI Médio):
                      </span>
                      <span style={{ fontSize: '1.15rem', fontWeight: 800, color: hopCalc.badgeCor }}>
                        {hopCalc.lsiMedio}%
                      </span>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: '6px', background: hopCalc.badgeBg, color: hopCalc.badgeCor, fontSize: '0.8rem', fontWeight: 700, border: `1px solid ${hopCalc.badgeCor}` }}>
                      {hopCalc.badgeStatus}
                    </span>
                  </div>

                  {/* Resumo por teste */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                    {hopCalc.testes.map(t => (
                      <div key={t.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{t.nome}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: t.status === 'otimo' ? '#10b981' : t.status === 'atencao' ? '#f59e0b' : '#ef4444' }}>
                            {t.lsiPct}%
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{t.ladoDominante}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                    <strong>Parecer RTS:</strong> {hopCalc.parecerRTS}
                  </div>

                  <div style={{ padding: '8px 10px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', fontSize: '0.8rem', color: '#10b981' }}>
                    <strong>🎯 Diretriz para o Treinador:</strong> {hopCalc.diretrizTreinador}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2.6 CHECK-IN DE WELLNESS & PRONTIDÃO */}
          {selectedCategory === 'WELLNESS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '10px 14px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                <small style={{ color: '#38bdf8', fontWeight: 600 }}>
                  <i className="fas fa-heart-pulse" style={{ marginRight: '6px' }} />
                  Monitoramento Psicofisiológico e Prontidão de Treino (Hooper / Foster / Gabbett). Escala de 1 (Ótimo) a 10 (Crítico).
                </small>
              </div>

              {/* Sliders ou Seletores dos 3 Pilares */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                {/* 1. Sono */}
                <div style={{ background: '#161f30', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                      <i className="fas fa-moon" style={{ color: '#818cf8', marginRight: '5px' }} />
                      Qualidade do Sono
                    </span>
                    <strong style={{ color: wellSono <= 3 ? '#10b981' : wellSono <= 6 ? '#f59e0b' : '#ef4444' }}>
                      {wellSono}/10
                    </strong>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={wellSono}
                    onChange={e => setWellSono(Number(e.target.value))}
                    style={{ width: '100%', accentColor: wellSono <= 3 ? '#10b981' : wellSono <= 6 ? '#f59e0b' : '#ef4444' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                    <span>1 (Reparador)</span>
                    <span>10 (Insônia)</span>
                  </div>
                </div>

                {/* 2. Fadiga */}
                <div style={{ background: '#161f30', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                      <i className="fas fa-battery-half" style={{ color: '#f59e0b', marginRight: '5px' }} />
                      Nível de Fadiga
                    </span>
                    <strong style={{ color: wellFadiga <= 3 ? '#10b981' : wellFadiga <= 6 ? '#f59e0b' : '#ef4444' }}>
                      {wellFadiga}/10
                    </strong>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={wellFadiga}
                    onChange={e => setWellFadiga(Number(e.target.value))}
                    style={{ width: '100%', accentColor: wellFadiga <= 3 ? '#10b981' : wellFadiga <= 6 ? '#f59e0b' : '#ef4444' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                    <span>1 (Descansado)</span>
                    <span>10 (Exaustão)</span>
                  </div>
                </div>

                {/* 3. Dor Muscular */}
                <div style={{ background: '#161f30', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                      <i className="fas fa-person-dots-from-line" style={{ color: '#ef4444', marginRight: '5px' }} />
                      Dor Muscular (DOMS)
                    </span>
                    <strong style={{ color: wellDor <= 3 ? '#10b981' : wellDor <= 6 ? '#f59e0b' : '#ef4444' }}>
                      {wellDor}/10
                    </strong>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={wellDor}
                    onChange={e => setWellDor(Number(e.target.value))}
                    style={{ width: '100%', accentColor: wellDor <= 3 ? '#10b981' : wellDor <= 6 ? '#f59e0b' : '#ef4444' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                    <span>1 (Sem dor)</span>
                    <span>10 (Incapacitante)</span>
                  </div>
                </div>
              </div>

              {/* Live Preview do Wellness e Matriz de Decisão */}
              <div style={{ background: '#0a0f1d', border: `1px solid ${wellnessCalc.statusColor}`, borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
                      Score de Sobrecarga Wellness:
                    </span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: wellnessCalc.statusColor }}>
                      {wellnessCalc.score}/30
                    </span>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: '6px', background: wellnessCalc.statusBadgeBg, color: wellnessCalc.statusColor, fontSize: '0.8rem', fontWeight: 700, border: `1px solid ${wellnessCalc.statusColor}` }}>
                    {wellnessCalc.statusLabel}
                  </span>
                </div>

                <div style={{ padding: '8px 10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                  <strong style={{ color: wellnessCalc.statusColor }}>🎯 Conduta Imediata:</strong> {wellnessCalc.conduta}
                </div>
              </div>
            </div>
          )}

          {/* 3. GONIOMETRIA PONTUAL (COM PADRÃO OFICIAL DE TORNOZELO) */}
          {selectedCategory === 'GONIOMETRIA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '8px 12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <small style={{ color: '#10b981' }}>
                  <i className="fas fa-check-circle" style={{ marginRight: '6px' }} />
                  Padrão Canônico: Tornozelo Estendido (Ref: 20°) e Lunge (Ref: 35-45°). Preencha apenas as articulações avaliadas hoje.
                </small>
              </div>

              <table className="data-table" style={{ margin: 0, fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Articulação / Movimento</th>
                    <th style={{ textAlign: 'center' }}>Referência</th>
                    <th style={{ textAlign: 'center' }}>Direito (°)</th>
                    <th style={{ textAlign: 'center' }}>Esquerdo (°)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Tornozelo — Dorsiflexão (Joelho Estendido)</strong></td>
                    <td style={{ textAlign: 'center', color: 'var(--text-dim)' }}>20°</td>
                    <td><input type="number" className="form-control form-control-sm" value={gDorsi1D} onChange={e => setGDorsi1D(e.target.value === '' ? '' : Number(e.target.value))} /></td>
                    <td><input type="number" className="form-control form-control-sm" value={gDorsi1E} onChange={e => setGDorsi1E(e.target.value === '' ? '' : Number(e.target.value))} /></td>
                  </tr>
                  <tr>
                    <td><strong>Tornozelo — Dorsiflexão (Joelho Fletido / Lunge)</strong></td>
                    <td style={{ textAlign: 'center', color: 'var(--text-dim)' }}>35–45°</td>
                    <td><input type="number" className="form-control form-control-sm" value={gDorsi2D} onChange={e => setGDorsi2D(e.target.value === '' ? '' : Number(e.target.value))} /></td>
                    <td><input type="number" className="form-control form-control-sm" value={gDorsi2E} onChange={e => setGDorsi2E(e.target.value === '' ? '' : Number(e.target.value))} /></td>
                  </tr>
                  <tr>
                    <td>Joelho — Flexão</td>
                    <td style={{ textAlign: 'center', color: 'var(--text-dim)' }}>135–150°</td>
                    <td><input type="number" className="form-control form-control-sm" value={gJoelhoFlexD} onChange={e => setGJoelhoFlexD(e.target.value === '' ? '' : Number(e.target.value))} /></td>
                    <td><input type="number" className="form-control form-control-sm" value={gJoelhoFlexE} onChange={e => setGJoelhoFlexE(e.target.value === '' ? '' : Number(e.target.value))} /></td>
                  </tr>
                  <tr>
                    <td>Joelho — Ângulo Poplíteo</td>
                    <td style={{ textAlign: 'center', color: 'var(--text-dim)' }}>155–160°</td>
                    <td><input type="number" className="form-control form-control-sm" value={gPopliteoD} onChange={e => setGPopliteoD(e.target.value === '' ? '' : Number(e.target.value))} /></td>
                    <td><input type="number" className="form-control form-control-sm" value={gPopliteoE} onChange={e => setGPopliteoE(e.target.value === '' ? '' : Number(e.target.value))} /></td>
                  </tr>
                  <tr>
                    <td>Ombro — Rotação Interna</td>
                    <td style={{ textAlign: 'center', color: 'var(--text-dim)' }}>80–90°</td>
                    <td><input type="number" className="form-control form-control-sm" value={gOmbroRotIntD} onChange={e => setGOmbroRotIntD(e.target.value === '' ? '' : Number(e.target.value))} /></td>
                    <td><input type="number" className="form-control form-control-sm" value={gOmbroRotIntE} onChange={e => setGOmbroRotIntE(e.target.value === '' ? '' : Number(e.target.value))} /></td>
                  </tr>
                  <tr>
                    <td>Ombro — Rotação Externa</td>
                    <td style={{ textAlign: 'center', color: 'var(--text-dim)' }}>80–100°</td>
                    <td><input type="number" className="form-control form-control-sm" value={gOmbroRotExtD} onChange={e => setGOmbroRotExtD(e.target.value === '' ? '' : Number(e.target.value))} /></td>
                    <td><input type="number" className="form-control form-control-sm" value={gOmbroRotExtE} onChange={e => setGOmbroRotExtE(e.target.value === '' ? '' : Number(e.target.value))} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* 4. DINAMOMETRIA / FORÇA KINOLOGY */}
          {selectedCategory === 'DINAMOMETRIA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>Grupo Muscular:</label>
                  <select className="form-control form-control-sm" value={stGrupo} onChange={e => setStGrupo(e.target.value)}>
                    <option value="Extensores de Joelho">Extensores de Joelho (Quadríceps)</option>
                    <option value="Flexores de Joelho">Flexores de Joelho (Isquiotibiais)</option>
                    <option value="Abdutores de Quadril">Abdutores de Quadril (Glúteo Médio)</option>
                    <option value="Adutores de Quadril">Adutores de Quadril</option>
                    <option value="Rotadores Externos de Ombro">Rotadores Externos de Ombro</option>
                    <option value="Rotadores Internos de Ombro">Rotadores Internos de Ombro</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>Unidade de Medida:</label>
                  <select className="form-control form-control-sm" value={stUnidade} onChange={e => setStUnidade(e.target.value as any)}>
                    <option value="N">Newtons (N)</option>
                    <option value="kgf">Quilograma-força (kgf)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>Lado Direito ({stUnidade}):</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 280.5"
                    className="form-control form-control-sm"
                    value={stValorD}
                    onChange={e => setStValorD(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>Lado Esquerdo ({stUnidade}):</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 275.0"
                    className="form-control form-control-sm"
                    value={stValorE}
                    onChange={e => setStValorE(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Cálculo dinâmico de assimetria */}
              <div style={{ padding: '10px 14px', background: 'var(--bg-dark)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem' }}>Déficit / Assimetria Bilateral:</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 'bold', color: dinamometriaAssimetria > 15 ? '#ef4444' : (dinamometriaAssimetria > 10 ? '#f59e0b' : '#10b981') }}>
                  {dinamometriaAssimetria}% ({dinamometriaAssimetria > 15 ? 'Crítica' : (dinamometriaAssimetria > 10 ? 'Atenção' : 'Simétrico')})
                </span>
              </div>
            </div>
          )}

          {/* 5. PERIMETRIA RÁPIDA */}
          {selectedCategory === 'PERIMETRIA' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Braço Direito (cm):</label>
                <input type="number" step="0.5" className="form-control form-control-sm" value={periBracoD} onChange={e => setPeriBracoD(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Braço Esquerdo (cm):</label>
                <input type="number" step="0.5" className="form-control form-control-sm" value={periBracoE} onChange={e => setPeriBracoE(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Coxa Medial Direita (cm):</label>
                <input type="number" step="0.5" className="form-control form-control-sm" value={periCoxaD} onChange={e => setPeriCoxaD(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Coxa Medial Esquerda (cm):</label>
                <input type="number" step="0.5" className="form-control form-control-sm" value={periCoxaE} onChange={e => setPeriCoxaE(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Cintura (cm):</label>
                <input type="number" step="0.5" className="form-control form-control-sm" value={periCintura} onChange={e => setPeriCintura(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Quadril (cm):</label>
                <input type="number" step="0.5" className="form-control form-control-sm" value={periQuadril} onChange={e => setPeriQuadril(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
            </div>
          )}

          {/* 6. COMPOSIÇÃO CORPORAL */}
          {selectedCategory === 'COMPOSICAO_CORPORAL' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Peso Atual (kg):</label>
                <input type="number" step="0.1" className="form-control form-control-sm" value={ccPeso} onChange={e => setCcPeso(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>% Gordura:</label>
                <input type="number" step="0.1" className="form-control form-control-sm" value={ccGordura} onChange={e => setCcGordura(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Massa Magra (kg):</label>
                <input type="number" step="0.1" className="form-control form-control-sm" value={ccMassaMagra} onChange={e => setCcMassaMagra(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
            </div>
          )}

          {/* 7. TESTES ORTOPÉDICOS / ESTRELA DE MAGGI */}
          {selectedCategory === 'TESTES_ESPECIAIS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Teste de Thomas (Iliopsoas):</label>
                  <select className="form-control form-control-sm" value={toThomas} onChange={e => setToThomas(e.target.value as any)}>
                    <option value="Normal">Normal</option>
                    <option value="Encurtado">Encurtado</option>
                    <option value="Positivo">Positivo (Restrição Severa)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Teste de Ober (TFL / ITB):</label>
                  <select className="form-control form-control-sm" value={toOber} onChange={e => setToOber(e.target.value as any)}>
                    <option value="Normal">Normal</option>
                    <option value="Encurtado">Encurtado</option>
                    <option value="Positivo">Positivo (Encurtamento TFL)</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Estrela de Maggi (Maigne — Coluna / Sacroilíaca):</label>
                <input
                  type="text"
                  placeholder="Ex: Bloqueio L5-S1 em rotação direita, dor à inclinação esquerda"
                  className="form-control form-control-sm"
                  value={toMaggi}
                  onChange={e => setToMaggi(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Teste KFBO Direito (cm):</label>
                  <input type="number" step="0.5" className="form-control form-control-sm" value={toKfboD} onChange={e => setToKfboD(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Teste KFBO Esquerdo (cm):</label>
                  <input type="number" step="0.5" className="form-control form-control-sm" value={toKfboE} onChange={e => setToKfboE(e.target.value === '' ? '' : Number(e.target.value))} />
                </div>
              </div>
            </div>
          )}

          {/* 8. QUEIXAS DE DOR & ESCALA EVA PADRONIZADA */}
          {selectedCategory === 'QUEIXAS_EVA' && (
            <QueixaFisioterapiaCard
              queixa={evaQueixa}
              index={0}
              isPrincipal={true}
              onChange={setEvaQueixa}
            />
          )}

          {/* Campo de Observações Gerais */}
          <div style={{ marginTop: '16px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>
              Observações Clínicas Adicionais:
            </label>
            <textarea
              rows={2}
              className="form-control form-control-sm"
              placeholder="Anotações do avaliador sobre o teste..."
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
            />
          </div>
        </div>

        {/* Rodapé do Modal com Ações */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: '#0f172a',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px'
          }}
        >
          <button type="button" onClick={onClose} className="btn btn-outline btn-sm">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={saving}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {saving ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-check" />}
            Salvar Medição Avulsa
          </button>
        </div>
      </div>
    </div>
  );
}
