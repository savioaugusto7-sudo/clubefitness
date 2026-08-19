'use client';

import React, { useState, useEffect } from 'react';

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
  
  const [activeCategory, setActiveCategory] = useState<'fichasMonitorado' | 'fichasLivre'>('fichasMonitorado');
  const [activeTabLetter, setActiveTabLetter] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('A');
  const [workoutName, setWorkoutName] = useState('Ficha A');
  const [workoutGoal, setWorkoutGoal] = useState('');
  const [workoutItems, setWorkoutItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rawWorkoutDoc, setRawWorkoutDoc] = useState<any>(null);
  const [todayWellness, setTodayWellness] = useState<any>(null);

  // 1. Carregar banco de exercícios, treinos existentes e Wellness do aluno
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setIsLoading(true);
        // 1.1 Buscar lista de exercícios
        const resEx = await fetch('/api/exercises');
        const dataEx = await resEx.json();
        let loadedExercises: any[] = [];
        if (dataEx.success && Array.isArray(dataEx.data)) {
          loadedExercises = dataEx.data;
          if (isMounted) setExercises(loadedExercises);
        }

        // 1.2 Buscar treino existente do aluno no MongoDB
        const resWorkouts = await fetch(`/api/workouts?clientId=${clientId}`);
        const dataWorkouts = await resWorkouts.json();
        
        if (dataWorkouts.success && dataWorkouts.data && isMounted) {
          const w = dataWorkouts.data;
          setRawWorkoutDoc(w);

          // Identificar se há fichasMonitorado ou fichasLivre
          const monitorado = w.fichasMonitorado || [];
          const livre = w.fichasLivre || [];
          const chosenCategory = (monitorado.length > 0 && monitorado.some((s: any) => s.exercicios?.length > 0))
            ? 'fichasMonitorado'
            : (livre.length > 0 && livre.some((s: any) => s.exercicios?.length > 0))
            ? 'fichasLivre'
            : 'fichasMonitorado';

          setActiveCategory(chosenCategory);
          const activeSheets = w[chosenCategory] || [];
          const initialSheet = activeSheets.find((s: any) => s.id === 'A') || activeSheets[0] || { id: 'A', nome: 'Ficha A', exercicios: [] };

          if (initialSheet) {
            setActiveTabLetter(initialSheet.id || 'A');
            setWorkoutName(initialSheet.nome || `Ficha ${initialSheet.id || 'A'}`);
            setWorkoutGoal(initialSheet.observacoesGerais || '');
            
            const items = (initialSheet.exercicios || []).map((ex: any, idx: number) => {
              const exName = typeof ex.exercicioId === 'object' ? ex.exercicioId?.nome : ex.exercicioId;
              const matchedDbEx = loadedExercises.find(e => e.nome === exName || e._id === exName);
              const grupo = matchedDbEx?.grupo || matchedDbEx?.grupo_muscular || 'Geral';
              
              return {
                _id: matchedDbEx?._id || ex._id || `ex_${idx}`,
                id: String(Date.now() + idx + Math.random()),
                nome: exName || 'Exercício',
                grupo,
                series: Number(ex.series) || 3,
                reps: String(ex.repeticoes || '12'),
                carga: parseFloat(String(ex.carga || ex.carga_sugerida || '10').replace('kg', '')) || 0,
                descanso: parseInt(String(ex.descanso || '60').replace('s', '')) || 60,
                observacao: ex.observacao || ex.observacoes || '',
                ritmo: ex.ritmo || '2-0-2-0'
              };
            });
            setWorkoutItems(items);
          }
        }

        // 1.3 Buscar Wellness de hoje do aluno (via agendamento e logs)
        try {
          const resApts = await fetch('/api/appointments');
          const dataApts = await resApts.json();
          if (dataApts.success && Array.isArray(dataApts.data) && isMounted) {
            const hojeISO = new Date().toISOString().split('T')[0];
            const studentApts = dataApts.data.filter((a: any) => 
              String(a.clienteId?._id || a.clienteId) === String(clientId)
            );
            // Pegar o mais recente de hoje com wellness ou o último realizado
            const withWellness = studentApts.find((a: any) => a.data === hojeISO && a.wellness?.realizado) ||
                                 studentApts.find((a: any) => a.wellness?.realizado);
            if (withWellness?.wellness) {
              setTodayWellness(withWellness.wellness);
            }
          }

          if (!todayWellness) {
            const resW = await fetch(`/api/wellness?clientId=${clientId}`);
            const dataW = await resW.json();
            if (dataW.success && Array.isArray(dataW.data) && dataW.data.length > 0 && isMounted) {
              setTodayWellness(dataW.data[0]);
            }
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

  // Troca de sub-ficha (A, B, C, D, E)
  const handleChangeSheet = (letter: 'A' | 'B' | 'C' | 'D' | 'E', categoryOverride?: 'fichasMonitorado' | 'fichasLivre') => {
    setActiveTabLetter(letter);
    const cat = categoryOverride || activeCategory;
    const sheets = rawWorkoutDoc?.[cat] || [];
    const sheet = sheets.find((s: any) => s.id === letter);
    if (sheet) {
      setWorkoutName(sheet.nome || `Ficha ${letter}`);
      setWorkoutGoal(sheet.observacoesGerais || '');
      const items = (sheet.exercicios || []).map((ex: any, idx: number) => {
        const exName = typeof ex.exercicioId === 'object' ? ex.exercicioId?.nome : ex.exercicioId;
        const matchedDbEx = exercises.find(e => e.nome === exName || e._id === exName);
        return {
          _id: matchedDbEx?._id || ex._id || `ex_${idx}`,
          id: String(Date.now() + idx + Math.random()),
          nome: exName || 'Exercício',
          grupo: matchedDbEx?.grupo || matchedDbEx?.grupo_muscular || 'Geral',
          series: Number(ex.series) || 3,
          reps: String(ex.repeticoes || '12'),
          carga: parseFloat(String(ex.carga || ex.carga_sugerida || '10').replace('kg', '')) || 0,
          descanso: parseInt(String(ex.descanso || '60').replace('s', '')) || 60,
          observacao: ex.observacao || ex.observacoes || '',
          ritmo: ex.ritmo || '2-0-2-0'
        };
      });
      setWorkoutItems(items);
    } else {
      setWorkoutName(`Ficha ${letter}`);
      setWorkoutGoal('');
      setWorkoutItems([]);
    }
  };

  const muscles = ['Todos', 'Peito', 'Costas', 'Pernas', 'Ombros', 'Braços', 'Core', 'Cardio'];

  // Filtro abrangente por grupo muscular
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
      id: Date.now().toString() + Math.random(),
      nome: ex.nome,
      grupo: ex.grupo || ex.grupo_muscular || 'Geral',
      series: 3,
      reps: '12',
      carga: 10,
      descanso: 60,
      observacao: '',
      ritmo: '2-0-2-0'
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
      const currentSheetPayload = {
        id: activeTabLetter,
        nome: workoutName,
        ultimaAtualizacao: new Date().toISOString().split('T')[0],
        observacoesGerais: workoutGoal,
        exercicios: workoutItems.map(item => ({
          exercicioId: item.nome,
          series: Number(item.series) || 3,
          repeticoes: String(item.reps || '12'),
          carga: `${item.carga}kg`,
          descanso: `${item.descanso}s`,
          observacao: item.observacao || '',
          ritmo: item.ritmo || '2-0-2-0',
          combinaGrupo: ''
        }))
      };

      const existingSheets = rawWorkoutDoc?.[activeCategory] || [
        { id: 'A', nome: 'Ficha A', exercicios: [] },
        { id: 'B', nome: 'Ficha B', exercicios: [] },
        { id: 'C', nome: 'Ficha C', exercicios: [] }
      ];

      const sheetIdx = existingSheets.findIndex((s: any) => s.id === activeTabLetter);
      let updatedSheets = [...existingSheets];
      if (sheetIdx !== -1) {
        updatedSheets[sheetIdx] = currentSheetPayload;
      } else {
        updatedSheets.push(currentSheetPayload);
      }

      const payload = {
        clientId,
        category: activeCategory,
        workoutData: updatedSheets,
        [activeCategory]: updatedSheets
      };

      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success || res.ok) {
        alert('Ficha de treino salva com sucesso!');
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
              Ficha de Treino do Aluno
            </h2>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              Aluno: <strong style={{ color: '#fff' }}>{clientName}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Volume Previsto:</span>
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
          background: todayWellness.status === 'otimo' ? 'rgba(16, 185, 129, 0.18)' : todayWellness.status === 'moderado' ? 'rgba(234, 179, 8, 0.18)' : todayWellness.status === 'ruim' ? 'rgba(249, 115, 22, 0.18)' : 'rgba(239, 68, 68, 0.18)',
          borderBottom: `2px solid ${todayWellness.statusColor || '#10b981'}`,
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.4rem' }}>🧘</span>
            <div>
              <span style={{ fontWeight: 800, color: todayWellness.statusColor || '#10b981', fontSize: '0.92rem' }}>
                WELLNESS DO DIA: {todayWellness.statusLabel || 'Estado Registrado'} (Score: {todayWellness.score}/30)
              </span>
              <span style={{ color: 'var(--text-main, #fff)', fontSize: '0.84rem', marginLeft: '12px' }}>
                • Sono: <strong>{todayWellness.sono}/10</strong> | Fadiga: <strong>{todayWellness.fadiga}/10</strong> | Dor Muscular: <strong>{todayWellness.dorMuscular}/10</strong>
              </span>
            </div>
          </div>
          <div style={{
            background: todayWellness.statusColor || '#10b981',
            color: '#fff',
            padding: '4px 14px',
            borderRadius: '20px',
            fontSize: '0.84rem',
            fontWeight: 800,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            🎯 {todayWellness.conduta || 'Treino Liberado'}
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
            
            {/* Seletor de Modalidade e Abas de Ficha */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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

              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <button
                  type="button"
                  onClick={() => { setActiveCategory('fichasMonitorado'); handleChangeSheet(activeTabLetter, 'fichasMonitorado'); }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: activeCategory === 'fichasMonitorado' ? 'var(--color-primary)' : 'transparent',
                    color: activeCategory === 'fichasMonitorado' ? '#fff' : 'var(--text-muted)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Treino Monitorado
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveCategory('fichasLivre'); handleChangeSheet(activeTabLetter, 'fichasLivre'); }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: activeCategory === 'fichasLivre' ? 'var(--color-primary)' : 'transparent',
                    color: activeCategory === 'fichasLivre' ? '#fff' : 'var(--text-muted)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Treino Livre
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 2, minWidth: '240px' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Nome da Ficha</label>
                <input type="text" className="form-control" value={workoutName} onChange={e => setWorkoutName(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: '180px' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Observações / Foco</label>
                <input type="text" className="form-control" placeholder="Ex: Hipertrofia Peitoral e Tríceps" value={workoutGoal} onChange={e => setWorkoutGoal(e.target.value)} />
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                  <i className="fa-solid fa-list-check" style={{ marginRight: '8px', color: 'var(--color-primary)' }}></i>
                  Exercícios da Ficha {activeTabLetter} ({activeCategory === 'fichasMonitorado' ? 'Monitorado' : 'Livre'})
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
