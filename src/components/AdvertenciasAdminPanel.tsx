'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface ProfessionalOption {
  _id: string;
  nome: string;
  especialidade?: string;
  cargo?: string;
}

interface AdvertenciaItem {
  _id: string;
  profissionalId: {
    _id: string;
    nome: string;
    especialidade?: string;
    registro?: string;
  } | string;
  pontosDebito: number;
  descricao: string;
  data: string;
  mesReferencia: string;
  criadoPorNome?: string;
  status: 'ativa' | 'cancelada';
  motivoCancelamento?: string;
  canceladoEm?: string;
  createdAt: string;
}

interface AdvertenciasAdminPanelProps {
  onRefresh?: () => void;
}

export default function AdvertenciasAdminPanel({ onRefresh }: AdvertenciasAdminPanelProps) {
  // State
  const [professionals, setProfessionals] = useState<ProfessionalOption[]>([]);
  const [advertencias, setAdvertencias] = useState<AdvertenciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedProfFilter, setSelectedProfFilter] = useState<string>('todos');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('todos');

  // Form state
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const [formProfId, setFormProfId] = useState('');
  const [formPontos, setFormPontos] = useState('');
  const [formDataOcorrencia, setFormDataOcorrencia] = useState(todayStr);
  const [formDescricao, setFormDescricao] = useState('');

  // Modal de Revogação
  const [revokingItem, setRevokingItem] = useState<AdvertenciaItem | null>(null);
  const [motivoRevogacao, setMotivoRevogacao] = useState('');
  const [revokingLoading, setRevokingLoading] = useState(false);

  // Carregar profissionais
  const fetchProfessionals = async () => {
    try {
      const res = await fetch('/api/professionals');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setProfessionals(json.data);
      }
    } catch (e) {
      console.error('Erro ao buscar profissionais:', e);
    }
  };

  // Carregar advertências com filtros
  const fetchAdvertencias = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (selectedMonth) params.append('mes', selectedMonth);
      if (selectedProfFilter !== 'todos') params.append('profissionalId', selectedProfFilter);
      if (selectedStatusFilter !== 'todos') params.append('status', selectedStatusFilter);

      const res = await fetch(`/api/admin/advertencias?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAdvertencias(json.data);
      } else {
        setErrorMsg(json.error || 'Erro ao carregar lista de advertências.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Erro de conexão ao carregar advertências.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfessionals();
  }, []);

  useEffect(() => {
    fetchAdvertencias();
  }, [selectedMonth, selectedProfFilter, selectedStatusFilter]);

  // Submeter nova advertência
  const handleSubmitAdvertencia = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!formProfId) {
      setErrorMsg('Selecione o profissional que receberá a advertência.');
      return;
    }

    const ptsNum = parseFloat(String(formPontos).replace(',', '.'));
    if (isNaN(ptsNum) || ptsNum <= 0) {
      setErrorMsg('Informe uma quantidade válida de pontos a debitar (maior que zero).');
      return;
    }

    if (!formDescricao.trim()) {
      setErrorMsg('Descreva detalhadamente a ocorrência / motivo da advertência.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/advertencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profissionalId: formProfId,
          pontosDebito: ptsNum,
          descricao: formDescricao.trim(),
          data: formDataOcorrencia || todayStr
        })
      });
      const json = await res.json();

      if (json.success) {
        setSuccessMsg(`Advertência registrada com sucesso! -${ptsNum} pts debitados do profissional.`);
        setFormPontos('');
        setFormDescricao('');
        setFormProfId('');
        fetchAdvertencias();
        if (onRefresh) onRefresh();
      } else {
        setErrorMsg(json.error || 'Erro ao registrar advertência.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Falha de comunicação ao registrar advertência.');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirmar revogação de advertência
  const handleConfirmRevogacao = async () => {
    if (!revokingItem) return;
    if (!motivoRevogacao.trim()) {
      alert('Por favor, informe a justificativa para revogação da advertência.');
      return;
    }

    setRevokingLoading(true);
    try {
      const res = await fetch('/api/admin/advertencias', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: revokingItem._id,
          status: 'cancelada',
          motivoCancelamento: motivoRevogacao.trim()
        })
      });
      const json = await res.json();

      if (json.success) {
        setSuccessMsg('Advertência revogada com sucesso. Os pontos foram restituídos.');
        setRevokingItem(null);
        setMotivoRevogacao('');
        fetchAdvertencias();
        if (onRefresh) onRefresh();
      } else {
        alert(json.error || 'Erro ao revogar advertência.');
      }
    } catch (e: any) {
      alert(e.message || 'Falha ao revogar advertência.');
    } finally {
      setRevokingLoading(false);
    }
  };

  // Cálculos de KPIs
  const kpis = useMemo(() => {
    const ativas = advertencias.filter(a => a.status === 'ativa');
    const totalPontosDebito = ativas.reduce((acc, curr) => acc + (Number(curr.pontosDebito) || 0), 0);
    const profsUnicos = new Set(
      ativas.map(a => (typeof a.profissionalId === 'object' && a.profissionalId?._id ? a.profissionalId._id : String(a.profissionalId)))
    );
    const canceladas = advertencias.filter(a => a.status === 'cancelada').length;

    return {
      totalAtivas: ativas.length,
      totalPontosDebito,
      profsPenalizados: profsUnicos.size,
      totalCanceladas: canceladas
    };
  }, [advertencias]);

  const getProfNome = (item: AdvertenciaItem) => {
    if (typeof item.profissionalId === 'object' && item.profissionalId?.nome) {
      return item.profissionalId.nome;
    }
    const found = professionals.find(p => p._id === item.profissionalId);
    return found ? found.nome : 'Profissional';
  };

  const getProfEspecialidade = (item: AdvertenciaItem) => {
    if (typeof item.profissionalId === 'object' && item.profissionalId?.especialidade) {
      return item.profissionalId.especialidade;
    }
    const found = professionals.find(p => p._id === item.profissionalId);
    return found?.especialidade || '';
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* HEADER EXECUTIVO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950/40 rounded-2xl border border-rose-500/20 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
              <i className="fa-solid fa-triangle-exclamation text-xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Advertências & Débitos Disciplinares
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Gestão Administrativa
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Lançamento de penalidades com débito direto no extrato de pontuação e ranking dos profissionais.
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLES RÁPIDOS */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-700/60 rounded-xl px-3 py-2">
            <i className="fa-regular fa-calendar text-rose-400 text-sm"></i>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white text-sm outline-none cursor-pointer"
            />
            {selectedMonth && (
              <button
                type="button"
                onClick={() => setSelectedMonth('')}
                title="Ver todos os meses"
                className="text-xs text-slate-400 hover:text-white ml-1"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          <button
            onClick={() => {
              fetchAdvertencias();
              fetchProfessionals();
            }}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-sm text-slate-200 transition-all active:scale-95 disabled:opacity-50"
            title="Atualizar dados"
          >
            <i className={`fa-solid fa-rotate ${loading ? 'animate-spin' : ''}`}></i>
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK ALERTS */}
      {errorMsg && (
        <div className="p-4 bg-rose-950/50 border border-rose-500/40 rounded-xl flex items-center justify-between text-rose-200 text-sm">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-circle-exclamation text-rose-400 text-base"></i>
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-950/50 border border-emerald-500/40 rounded-xl flex items-center justify-between text-emerald-200 text-sm">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-circle-check text-emerald-400 text-base"></i>
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* CARDS DE RESUMO / KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-md relative overflow-hidden">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
            Advertências Ativas
          </p>
          <p className="text-3xl font-extrabold text-white tracking-tight">
            {kpis.totalAtivas}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {selectedMonth ? `No mês ${selectedMonth}` : 'No período geral'}
          </p>
        </div>

        <div className="bg-slate-900/60 border border-rose-900/30 rounded-2xl p-4 backdrop-blur-md relative overflow-hidden">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-300">
            <i className="fa-solid fa-arrow-trend-down"></i>
          </div>
          <p className="text-xs uppercase tracking-wider text-rose-300 font-semibold mb-1">
            Total Pontos Debitados
          </p>
          <p className="text-3xl font-extrabold text-rose-400 tracking-tight">
            -{kpis.totalPontosDebito.toFixed(1)} <span className="text-base font-medium text-rose-300">pts</span>
          </p>
          <p className="text-xs text-rose-400/70 mt-1">
            Impactando metas individuais
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-md relative overflow-hidden">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <i className="fa-solid fa-user-xmark"></i>
          </div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
            Profissionais Notificados
          </p>
          <p className="text-3xl font-extrabold text-white tracking-tight">
            {kpis.profsPenalizados}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Com débito no ranking
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-md relative overflow-hidden">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-xl bg-slate-700/20 flex items-center justify-center text-slate-400">
            <i className="fa-solid fa-ban"></i>
          </div>
          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
            Advertências Revogadas
          </p>
          <p className="text-3xl font-extrabold text-slate-300 tracking-tight">
            {kpis.totalCanceladas}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Pontos restituídos
          </p>
        </div>
      </div>

      {/* FORMULÁRIO DE LANÇAMENTO */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-sm">
            <i className="fa-solid fa-pen-to-square"></i>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Lançar Advertência Disciplinar</h2>
            <p className="text-xs text-slate-400">
              Selecione o profissional, defina a pontuação a debitar livremente e registre o motivo detalhado.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmitAdvertencia} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* SELEÇÃO DO PROFISSIONAL (SEM AVATAR) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Profissional <span className="text-rose-400">*</span>
              </label>
              <select
                value={formProfId}
                onChange={(e) => setFormProfId(e.target.value)}
                required
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
              >
                <option value="">Selecione o profissional...</option>
                {professionals.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.nome} {p.especialidade ? `(${p.especialidade})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* PONTOS A DEBITAR (NUMERO LIVRE - SEM BLOQUEIO DE 5 EM 5) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Pontos a Debitar <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={formPontos}
                  onChange={(e) => setFormPontos(e.target.value)}
                  placeholder="Ex: 5, 8, 12.5, 20..."
                  required
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors pr-14"
                />
                <span className="absolute right-3.5 top-2.5 text-xs font-bold text-rose-400">
                  -pts
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Entrada livre: digite qualquer valor que desejar debitar.
              </p>
            </div>

            {/* DATA DA OCORRÊNCIA */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Data da Ocorrência <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={formDataOcorrencia}
                onChange={(e) => setFormDataOcorrencia(e.target.value)}
                required
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>
          </div>

          {/* DESCRIÇÃO / MOTIVO */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Descrição do Ocorrido / Justificativa <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={formDescricao}
              onChange={(e) => setFormDescricao(e.target.value)}
              placeholder="Descreva detalhadamente o ocorrido, processo descumprido ou conduta que gerou a advertência..."
              rows={3}
              required
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors resize-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-sm font-semibold shadow-lg shadow-rose-900/30 transition-all active:scale-95 disabled:opacity-50"
            >
              <i className={`fa-solid fa-triangle-exclamation ${submitting ? 'animate-spin' : ''}`}></i>
              <span>{submitting ? 'Registrando...' : 'Lançar Advertência e Debitar'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* HISTÓRICO DE ADVERTÊNCIAS */}
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-sm">
              <i className="fa-solid fa-list-check"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Histórico de Advertências Registradas</h2>
              <p className="text-xs text-slate-400">
                Total de {advertencias.length} registros no filtro selecionado.
              </p>
            </div>
          </div>

          {/* FILTROS ADICIONAIS DA TABELA */}
          <div className="flex flex-wrap items-center gap-3">
            {/* FILTRAR POR PROFISSIONAL */}
            <select
              value={selectedProfFilter}
              onChange={(e) => setSelectedProfFilter(e.target.value)}
              className="bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
            >
              <option value="todos">Todos os Profissionais</option>
              {professionals.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.nome}
                </option>
              ))}
            </select>

            {/* FILTRAR POR STATUS */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
            >
              <option value="todos">Todos os Status</option>
              <option value="ativa">Apenas Ativas</option>
              <option value="cancelada">Apenas Revogadas</option>
            </select>
          </div>
        </div>

        {/* TABELA DE REGISTROS */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <i className="fa-solid fa-circle-notch fa-spin text-2xl text-rose-500"></i>
            <span className="text-sm">Carregando advertências...</span>
          </div>
        ) : advertencias.length === 0 ? (
          <div className="py-12 text-center text-slate-500 bg-slate-950/30 rounded-xl border border-slate-800/40">
            <i className="fa-solid fa-circle-check text-3xl text-slate-600 mb-2"></i>
            <p className="text-sm font-medium text-slate-400">Nenhuma advertência encontrada</p>
            <p className="text-xs text-slate-600 mt-1">
              Não há registros para os filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[11px] font-semibold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Profissional</th>
                  <th className="py-3 px-4">Descrição / Motivo</th>
                  <th className="py-3 px-4 text-center">Débito</th>
                  <th className="py-3 px-4">Registrado Por</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {advertencias.map((item) => {
                  const isCancelada = item.status === 'cancelada';
                  return (
                    <tr
                      key={item._id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        isCancelada ? 'opacity-60 bg-slate-950/20' : ''
                      }`}
                    >
                      {/* DATA */}
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-300 whitespace-nowrap">
                        {item.data}
                      </td>

                      {/* PROFISSIONAL (SEM AVATAR) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-white">
                          {getProfNome(item)}
                        </div>
                        {getProfEspecialidade(item) && (
                          <div className="text-xs text-slate-400">
                            {getProfEspecialidade(item)}
                          </div>
                        )}
                      </td>

                      {/* DESCRIÇÃO */}
                      <td className="py-3.5 px-4 max-w-md">
                        <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-line">
                          {item.descricao}
                        </p>
                        {isCancelada && item.motivoCancelamento && (
                          <div className="mt-1.5 p-2 bg-slate-950/60 border border-slate-800 rounded-lg text-[11px] text-slate-400">
                            <span className="font-semibold text-rose-300">Revogado:</span> {item.motivoCancelamento}
                          </div>
                        )}
                      </td>

                      {/* PONTOS DEBITO */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            isCancelada
                              ? 'bg-slate-800 text-slate-400 line-through'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          -{item.pontosDebito} pts
                        </span>
                      </td>

                      {/* REGISTRADO POR */}
                      <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                        {item.criadoPorNome || 'Administrador'}
                      </td>

                      {/* STATUS */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isCancelada ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            <i className="fa-solid fa-ban text-[10px]"></i>
                            Revogada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <i className="fa-solid fa-circle text-[8px] animate-pulse"></i>
                            Ativa
                          </span>
                        )}
                      </td>

                      {/* AÇÕES */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {!isCancelada ? (
                          <button
                            onClick={() => {
                              setRevokingItem(item);
                              setMotivoRevogacao('');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/40 text-xs text-slate-300 hover:text-rose-200 transition-colors"
                            title="Revogar advertência e estornar pontos"
                          >
                            <i className="fa-solid fa-undo text-xs text-rose-400"></i>
                            <span>Revogar</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Sem ações</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE REVOGAÇÃO */}
      {revokingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5 text-rose-400">
                <i className="fa-solid fa-rotate-left text-lg"></i>
                <h3 className="text-base font-bold text-white">Revogar Advertência</h3>
              </div>
              <button
                onClick={() => setRevokingItem(null)}
                className="text-slate-400 hover:text-white"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-300">
              <p>
                <strong className="text-white">Profissional:</strong> {getProfNome(revokingItem)}
              </p>
              <p>
                <strong className="text-white">Data:</strong> {revokingItem.data}
              </p>
              <p>
                <strong className="text-white">Pontuação:</strong> -{revokingItem.pontosDebito} pts
              </p>
              <p className="text-slate-400 italic">
                &quot;{revokingItem.descricao}&quot;
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Motivo / Justificativa da Revogação <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={motivoRevogacao}
                onChange={(e) => setMotivoRevogacao(e.target.value)}
                placeholder="Informe o motivo da anulação desta advertência (ex: engano comprovado, justificativa aceita pela coordenação...)"
                rows={3}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-rose-500 resize-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Ao confirmar, a advertência será inativada e os pontos serão imediatamente restituídos.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRevokingItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRevogacao}
                disabled={revokingLoading || !motivoRevogacao.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors disabled:opacity-50"
              >
                <i className={`fa-solid fa-check ${revokingLoading ? 'animate-spin' : ''}`}></i>
                <span>{revokingLoading ? 'Revogando...' : 'Confirmar Revogação'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
