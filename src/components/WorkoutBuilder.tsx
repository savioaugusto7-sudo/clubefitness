'use client';

import React, { useState, useEffect } from 'react';
import { calculateWellness } from '@/utils/wellnessHelper';

const normalizeText = (str: string) => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

interface WorkoutBuilderProps {
  onClose: () => void;
  clientId: string;
  clientName: string;
}

export default function WorkoutBuilder({ onClose, clientId, clientName }: WorkoutBuilderProps) {
  const [exercises, setExercises] = useState<any[]>([]);
  const [selectedMuscle, setSelectedMuscle] = useState('Todos');
  const [search, setSearch] = useState('');
  
  const [workoutName, setWorkoutName] = useState('Treino A - Hipertrofia');
  const [workoutGoal, setWorkoutGoal] = useState('Hipertrofia');
  const [workoutItems, setWorkoutItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTabLetter, setActiveTabLetter] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('A');
  const [rawWorkoutDoc, setRawWorkoutDoc] = useState<any>(null);
  const [todayWellness, setTodayWellness] = useState<any>(null);

  // 1. Carregar banco de exercícios e treino existente do aluno
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Buscar lista de exercícios
        const resEx = await fetch('/api/exercises');
        const dataEx = await resEx.json();
        let loadedExercises: any[] = [];
        if (dataEx.success && Array.isArray(dataEx.data)) {
          loadedExercises = dataEx.data;
          if (isMounted) setExercises(loadedExercises);
        }

        // Buscar treino existente do aluno
        const resWorkouts = await fetch(`/api/workouts?clientId=${clientId}`);
        const dataWorkouts = await resWorkouts.json();
        
        if (dataWorkouts.success && dataWorkouts.data && isMounted) {
          const w = dataWorkouts.data;
          setRawWorkoutDoc(w);

          // Se tiver estrutura por categorias (musculacao -> [Ficha A, Ficha B...])
          if (w.musculacao && Array.isArray(w.musculacao) && w.musculacao.length > 0) {
            const sheetA = w.musculacao.find((s: any) => s.id === 'A') || w.musculacao[0];
            if (sheetA) {
              setWorkoutName(sheetA.nome || 'Treino A');
              setWorkoutGoal(sheetA.observacoesGerais || 'Hipertrofia');
              
              const items = (sheetA.exercicios || []).map((ex: any, idx: number) => {
                const exName = typeof ex.exercicioId === 'object' ? ex.exercicioId?.nome : ex.exercicioId;
                const matchedDbEx = loadedExercises.find(e => e.nome === exName || e._id === exName);
                const grupo = matchedDbEx?.grupo || matchedDbEx?.grupo_muscular || 'Geral';
                
                return {
                  _id: matchedDbEx?._id || ex._id || `ex_${idx}`,
                  id: String(Date.now() + idx),
                  nome: exName || 'Exercício',
                  grupo,
                  series: Number(ex.series) || 3,
                  reps: ex.repeticoes || '10',
                  carga: parseFloat(String(ex.carga).replace('kg', '')) || 0,
                  descanso: parseInt(String(ex.descanso).replace('s', '')) || 60,
                  observacao: ex.observacao || ''
                };
              });
              setWorkoutItems(items);
            }
          } else if (Array.isArray(w.exercicios) && w.exercicios.length > 0) {
            // Estrutura plana legada
            if (w.nome) setWorkoutName(w.nome);
            if (w.objetivo) setWorkoutGoal(w.objetivo);
            const items = w.exercicios.map((ex: any, idx: number) => {
              const exObj = typeof ex.exercicioId === 'object' ? ex.exercicioId : loadedExercises.find(e => e._id === ex.exercicioId) || {};
              return {
                _id: exObj._id || ex.exercicioId || `ex_${idx}`,
                id: String(Date.now() + idx),
                nome: exObj.nome || 'Exercício',
                grupo: exObj.grupo || exObj.grupo_muscular || 'Geral',
                series: Number(ex.series) || 3,
                reps: ex.repeticoes || '10',
                carga: parseFloat(String(ex.carga_sugerida || ex.carga || '0').replace('kg', '')) || 0,
                descanso: Number(ex.descanso) || 60,
                observacao: ex.observacoes || ''
              };
            });
            setWorkoutItems(items);
          }
        }

        // Buscar Wellness do Aluno (logs mais recentes)
        try {
          const resW = await fetch(`/api/wellness?clientId=${clientId}`);
          const dataW = await resW.json();
          if (dataW.success && Array.isArray(dataW.data) && dataW.data.length > 0 && isMounted) {
            setTodayWellness(dataW.data[0]);
          }
        } catch (e) {}

      } catch (err) {
        console.error('Erro ao carregar dados do treino:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [clientId]);

  // Troca de sub-ficha (A, B, C, D, E) se o documento possuir múltiplas fichas
  const handleChangeSheet = (letter: 'A' | 'B' | 'C' | 'D' | 'E') => {
    setActiveTabLetter(letter);
    if (rawWorkoutDoc?.musculacao && Array.isArray(rawWorkoutDoc.musculacao)) {
      const sheet = rawWorkoutDoc.musculacao.find((s: any) => s.id === letter);
      if (sheet) {
        setWorkoutName(sheet.nome || `Treino ${letter}`);
        setWorkoutGoal(sheet.observacoesGerais || 'Hipertrofia');
        const items = (sheet.exercicios || []).map((ex: any, idx: number) => {
          const exName = typeof ex.exercicioId === 'object' ? ex.exercicioId?.nome : ex.exercicioId;
          const matchedDbEx = exercises.find(e => e.nome === exName || e._id === exName);
          return {
            _id: matchedDbEx?._id || ex._id || `ex_${idx}`,
            id: String(Date.now() + idx),
            nome: exName || 'Exercício',
            grupo: matchedDbEx?.grupo || matchedDbEx?.grupo_muscular || 'Geral',
            series: Number(ex.series) || 3,
            reps: ex.repeticoes || '10',
            carga: parseFloat(String(ex.carga).replace('kg', '')) || 0,
            descanso: parseInt(String(ex.descanso).replace('s', '')) || 60,
            observacao: ex.observacao || ''
          };
        });
        setWorkoutItems(items);
      } else {
        setWorkoutName(`Treino ${letter}`);
        setWorkoutItems([]);
      }
    }
  };

  const muscles = ['Todos', 'Peito', 'Costas', 'Pernas', 'Ombros', 'Braços', 'Core', 'Cardio'];

  // Filtro inteligente e abrangente por grupo muscular
  const filteredExercises = exercises.filter(e => {
    const rawGroup = normalizeText(e.grupo || e.grupo_muscular || '');
    const searchNormalized = normalizeText(search);
    
    if (search && !normalizeText(e.nome).includes(searchNormalized) && !rawGroup.includes(searchNormalized)) {
      return false;
    }

    if (selectedMuscle === 'Todos') return true;

    if (selectedMuscle === 'Peito') return rawGroup.includes('peit');
    if (selectedMuscle === 'Costas') return rawGroup.includes('cost') || rawGroup.includes('dorsal');
    if (selectedMuscle === 'Pernas') return rawGroup.includes('pern') || rawGroup.includes('quad') || rawGroup.includes('post') || rawGroup.includes('glut') || rawGroup.includes('pant');
    if (selectedMuscle === 'Ombros') return rawGroup.includes('ombr') || rawGroup.includes('delt');
    if (selectedMuscle === 'Braços') return rawGroup.includes('brac') || rawGroup.includes('bice') || rawGroup.includes('trice') || rawGroup.includes('anteb');
    if (selectedMuscle === 'Core') return rawGroup.includes('core') || rawGroup.includes('abd') || rawGroup.includes('lomb');
    if (selectedMuscle === 'Cardio') return rawGroup.includes('card') || rawGroup.includes('aero') || rawGroup.includes('aque');

    return rawGroup.includes(normalizeText(selectedMuscle));
  });

  const addToWorkout = (ex: any) => {
    const newEx = {
      _id: ex._id,
      id: Date.now().toString(),
      nome: ex.nome,
      grupo: ex.grupo || ex.grupo_muscular || 'Geral',
      series: 3,
      reps: '10',
      carga: 10,
      descanso: 60,
      observacao: ''
    };
    setWorkoutItems(prev => [...prev, newEx]);
  };

  const updateItem = (id: string, field: string, val: any) => {
    setWorkoutItems(prev => prev.map(item => item.id === id ? { ...item, [field]: val } : item));
  };

  const removeItem = (id: string) => {
    setWorkoutItems(prev => prev.filter(item => item.id !== id));
  };

  const calculateTotalLoad = () => {
    return workoutItems.reduce((acc, item) => {
      const c = parseFloat(item.carga) || 0;
      const s = Number(item.series) || 0;
      const r = parseFloat(String(item.reps).replace(/[^0-9.]/g, '')) || 10;
      return acc + (s * r * c);
    }, 0);
  };

  const handleSave = async () => {
    try {
      // Se tivermos a estrutura por categorias, preservamos e atualizamos a ficha ativa
      let payload: any = {};
      if (rawWorkoutDoc?.musculacao && Array.isArray(rawWorkoutDoc.musculacao)) {
        const updatedCategory = [...rawWorkoutDoc.musculacao];
        const sheetIndex = updatedCategory.findIndex((s: any) => s.id === activeTabLetter);
        const currentSheetPayload = {
          id: activeTabLetter,
          nome: workoutName,
          observacoesGerais: workoutGoal,
          exercicios: workoutItems.map(item => ({
            exercicioId: item.nome,
            series: Number(item.series) || 3,
            repeticoes: String(item.reps || '10'),
            carga: `${item.carga}kg`,
            descanso: `${item.descanso}s`,
            observacao: item.observacao || '',
            ritmo: '2-0-2-0',
            combinaGrupo: ''
          }))
        };

        if (sheetIndex !== -1) {
          updatedCategory[sheetIndex] = currentSheetPayload;
        } else {
          updatedCategory.push(currentSheetPayload);
        }

        payload = {
          clienteId: clientId,
          musculacao: updatedCategory,
          fisioterapia: rawWorkoutDoc.fisioterapia || [],
          hidroginastica: rawWorkoutDoc.hidroginastica || [],
          pilates: rawWorkoutDoc.pilates || []
        };
      } else {
        // Formato padrão
        payload = {
          clienteId: clientId,
          profissionalId: '6668ab030303030303030302',
          nome: workoutName,
          objetivo: workoutGoal,
          status: 'ativo',
          exercicios: workoutItems.map(item => ({
            exercicioId: item._id,
            series: Number(item.series) || 3,
            repeticoes: String(item.reps || '10'),
            carga_sugerida: `${item.carga}kg`,
            descanso: Number(item.descanso) || 60,
            observacoes: item.observacao || ''
          }))
        };
      }

      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success || res.ok) {
        alert('Treino salvo com sucesso no sistema!');
        onClose();
      } else {
        alert('Erro ao salvar treino: ' + (data.error || 'Falha na requisição'));
      }
    } catch (err: any) {
      alert('Erro de conexão ao salvar: ' + err.message);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#0a0f1d', zIndex: 999999, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* HEADER */}
      <div style={{ padding: '14px 24px', background: '#131b2e', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ gap: '6px', fontSize: '0.88rem' }}>
            <i className="fa-solid fa-arrow-left"></i> Voltar para Lista
          </button>
          <div>
            <h2 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '1.2rem', fontWeight: 800 }}>
              <i className="fa-solid fa-dumbbell" style={{ marginRight: '8px' }}></i>
              Editor Avançado de Treino
            </h2>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              Aluno: <strong style={{ color: '#fff' }}>{clientName}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Volume de Carga Previsto:</span>
            <strong style={{ marginLeft: '8px', fontSize: '1.05rem', color: 'var(--color-primary)' }}>{Math.round(calculateTotalLoad())} kg</strong>
          </div>
          <button className="btn btn-primary" onClick={handleSave} style={{ gap: '6px', fontWeight: 700, padding: '8px 20px' }}>
            <i className="fa-solid fa-floppy-disk"></i> Salvar Treino
          </button>
        </div>
      </div>

      {/* BANNER WELLNESS DE PRONTIDÃO DO ALUNO */}
      {todayWellness && (
        <div style={{
          background: todayWellness.statusColor ? `${todayWellness.statusColor}22` : 'rgba(16, 185, 129, 0.15)',
          borderBottom: `2px solid ${todayWellness.statusColor || '#10b981'}`,
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.3rem' }}>🧘</span>
            <div>
              <span style={{ fontWeight: 800, color: todayWellness.statusColor || '#10b981', fontSize: '0.9rem' }}>
                WELLNESS DO DIA: {todayWellness.statusLabel || 'Estado Registrado'} (Score: {todayWellness.score}/30)
              </span>
              <span style={{ color: 'var(--text-main, #fff)', fontSize: '0.85rem', marginLeft: '10px' }}>
                • Sono: <strong>{todayWellness.sono}/10</strong> | Fadiga: <strong>{todayWellness.fadiga}/10</strong> | Dor Muscular: <strong>{todayWellness.dorMuscular}/10</strong>
              </span>
            </div>
          </div>
          <div style={{
            background: todayWellness.statusColor ? `${todayWellness.statusColor}33` : 'rgba(16, 185, 129, 0.25)',
            color: '#fff',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.82rem',
            fontWeight: 700,
            border: `1px solid ${todayWellness.statusColor || '#10b981'}`
          }}>
            🎯 Conduta: {todayWellness.conduta || 'Treino Liberado'}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* SIDEBAR EXERCISES */}
        <div style={{ width: '360px', background: '#131b2e', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar exercício pelo nome ou grupo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ marginBottom: '10px', fontSize: '0.88rem' }}
            />
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {muscles.map(m => (
                <button
                  key={m}
                  onClick={() => setSelectedMuscle(m)}
                  style={{
                    padding: '4px 9px',
                    borderRadius: '100px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: selectedMuscle === m ? 'var(--color-primary)' : 'rgba(255,255,255,0.04)',
                    color: selectedMuscle === m ? '#fff' : 'var(--text-muted, #94a3b8)',
                    cursor: 'pointer',
                    fontSize: '0.74rem',
                    fontWeight: selectedMuscle === m ? 700 : 500
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredExercises.map(ex => (
              <div
                key={ex._id}
                style={{
                  padding: '10px 14px',
                  background: '#0a0f1d',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main, #fff)' }}>{ex.nome}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)' }}>{ex.grupo || ex.grupo_muscular || 'Geral'}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => addToWorkout(ex)}
                  title="Adicionar ao Treino"
                  style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                >
                  <i className="fa-solid fa-plus"></i>
                </button>
              </div>
            ))}
            {filteredExercises.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: '40px', fontSize: '0.85rem' }}>
                <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '1.5rem', marginBottom: '8px', opacity: 0.3, display: 'block' }}></i>
                Nenhum exercício encontrado para "{selectedMuscle}".
              </div>
            )}
          </div>
        </div>

        {/* MAIN WORKOUT AREA */}
        <div style={{ flex: 1, padding: '24px 30px', overflowY: 'auto', background: '#0a0f1d' }}>
          <div style={{ maxWidth: '880px', margin: '0 auto' }}>
            
            {/* Abas de Ficha (A, B, C, D, E) */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Ficha:</span>
              {(['A', 'B', 'C', 'D', 'E'] as const).map(letter => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => handleChangeSheet(letter)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '8px',
                    border: activeTabLetter === letter ? '2px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.1)',
                    background: activeTabLetter === letter ? 'var(--color-primary)' : 'rgba(255,255,255,0.03)',
                    color: activeTabLetter === letter ? '#fff' : 'var(--text-muted)',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                >
                  Ficha {letter}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 2, minWidth: '240px' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Nome da Ficha</label>
                <input type="text" className="form-control" value={workoutName} onChange={e => setWorkoutName(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Objetivo / Foco</label>
                <select className="select-custom" value={workoutGoal} onChange={e => setWorkoutGoal(e.target.value)}>
                  <option value="Hipertrofia">Hipertrofia</option>
                  <option value="Emagrecimento">Emagrecimento</option>
                  <option value="Resistência">Resistência</option>
                  <option value="Força">Força Máxima</option>
                  <option value="Reabilitação">Reabilitação Fisioterapêutica</option>
                  <option value="Condicionamento">Condicionamento Geral</option>
                </select>
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                  <i className="fa-solid fa-list-check" style={{ marginRight: '8px', color: 'var(--color-primary)' }}></i>
                  Exercícios da Ficha {activeTabLetter}
                </h3>
                <span className="badge badge-info">{workoutItems.length} exercícios</span>
              </div>
              
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {workoutItems.map((item, index) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '14px 16px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary)', width: '24px' }}>
                      {index + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: '180px' }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main, #fff)' }}>{item.nome}</div>
                      <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.78rem' }}>{item.grupo}</div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Séries</div>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={item.series}
                          onChange={e => updateItem(item.id, 'series', Number(e.target.value))}
                          style={{ width: '60px', textAlign: 'center', padding: '4px' }}
                        />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Reps</div>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={item.reps}
                          onChange={e => updateItem(item.id, 'reps', e.target.value)}
                          style={{ width: '65px', textAlign: 'center', padding: '4px' }}
                        />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Carga (kg)</div>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={item.carga}
                          onChange={e => updateItem(item.id, 'carga', Number(e.target.value))}
                          style={{ width: '70px', textAlign: 'center', padding: '4px' }}
                        />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Desc. (s)</div>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={item.descanso}
                          onChange={e => updateItem(item.id, 'descanso', Number(e.target.value))}
                          style={{ width: '65px', textAlign: 'center', padding: '4px' }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => removeItem(item.id)}
                      style={{ color: '#ef4444', padding: '6px 10px', marginLeft: 'auto' }}
                      title="Remover Exercício"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                ))}

                {workoutItems.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                    <i className="fa-solid fa-dumbbell" style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.25, display: 'block' }}></i>
                    <p style={{ margin: 0 }}>Nenhum exercício na Ficha {activeTabLetter}. Selecione exercícios no painel lateral à esquerda para adicionar.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
