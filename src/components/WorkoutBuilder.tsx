'use client';

import React, { useState, useEffect, useMemo } from 'react';

const normalizeText = (str: string) => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

const COMBINATION_GROUPS = [
  { id: '', label: 'Individual', color: 'transparent', textColor: '#94a3b8' },
  { id: 'G1', label: 'G1 (Verde)', color: '#10b981', textColor: '#ffffff' },
  { id: 'G2', label: 'G2 (Laranja)', color: '#f97316', textColor: '#ffffff' },
  { id: 'G3', label: 'G3 (Ciano)', color: '#06b6d4', textColor: '#ffffff' },
  { id: 'G4', label: 'G4 (Roxo)', color: '#a855f7', textColor: '#ffffff' },
  { id: 'G5', label: 'G5 (Amarelo)', color: '#eab308', textColor: '#000000' },
];

const getGroupColor = (groupName: string) => {
  const found = COMBINATION_GROUPS.find(g => g.id === groupName);
  return found?.color || 'transparent';
};

const TECHNIQUE_PRESETS = [
  'Pico de contração 2s',
  'Drop-set na última série',
  'Rest-pause (3x com 10s)',
  'Excêntrica lenta 4s',
  'Até a falha concêntrica',
  'Isometria final 10s',
  'Repetições parciais'
];

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

  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveToast, setSaveToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [activeObsModalItem, setActiveObsModalItem] = useState<any | null>(null);
  const [tempObsText, setTempObsText] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setIsLoading(true);

        const [resEx, resWorkouts, resApts] = await Promise.all([
          fetch('/api/exercises').then(r => r.json()).catch(() => ({ success: false })),
          fetch(`/api/workouts?clientId=${clientId}`).then(r => r.json()).catch(() => ({ success: false })),
          fetch(`/api/appointments?t=${Date.now()}`).then(r => r.json()).catch(() => ({ success: false }))
        ]);

        let loadedExercises: any[] = [];
        if (resEx?.success && Array.isArray(resEx.data)) {
          loadedExercises = resEx.data;
          if (isMounted) setExercises(loadedExercises);
        }

        if (resWorkouts?.success && resWorkouts.data && isMounted) {
          const w = resWorkouts.data;
          setRawWorkoutDoc(w);

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
                ritmo: ex.ritmo || '2-0-2-0',
                combinaGrupo: ex.combinaGrupo || ''
              };
            });
            setWorkoutItems(items);
          }
        }

        if (resApts?.success && Array.isArray(resApts.data) && isMounted) {
          const hojeISO = new Date().toISOString().split('T')[0];
          const studentApts = resApts.data.filter((a: any) => 
            String(a.clienteId?._id || a.clienteId) === String(clientId)
          );
          const withWellness = studentApts.find((a: any) => a.data === hojeISO && a.wellness?.realizado) ||
                               studentApts.find((a: any) => a.wellness?.realizado);
          if (withWellness?.wellness) {
            setTodayWellness(withWellness.wellness);
          }
        }

      } catch (err) {
        console.error('Erro ao carregar dados do treino:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [clientId]);

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
          ritmo: ex.ritmo || '2-0-2-0',
          combinaGrupo: ex.combinaGrupo || ''
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

  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      const g = ex.grupo || ex.grupo_muscular || 'Geral';
      const matchMuscle = selectedMuscle === 'Todos' || normalizeText(g) === normalizeText(selectedMuscle);
      const matchSearch = !search.trim() || normalizeText(ex.nome).includes(normalizeText(search)) || normalizeText(g).includes(normalizeText(search));
      return matchMuscle && matchSearch;
    });
  }, [exercises, selectedMuscle, search]);

  const addToWorkout = (ex: any) => {
    const newEx = {
      _id: ex._id,
      id: String(Date.now() + Math.random()),
      nome: ex.nome,
      grupo: ex.grupo || ex.grupo_muscular || 'Geral',
      series: 3,
      reps: '12',
      carga: 10,
      descanso: 60,
      observacao: '',
      ritmo: '2-0-2-0',
      combinaGrupo: ''
    };
    setWorkoutItems(prev => [...prev, newEx]);
  };

  const updateItem = (id: string, field: string, val: any) => {
    setWorkoutItems(prev => prev.map(item => item.id === id ? { ...item, [field]: val } : item));
  };

  const removeItem = (id: string) => {
    setWorkoutItems(prev => prev.filter(item => item.id !== id));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= workoutItems.length) return;
    const newItems = [...workoutItems];
    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;
    setWorkoutItems(newItems);
  };

  const metrics = useMemo(() => {
    let volumeTotal = 0;
    let totalSeries = 0;
    let totalTempoSegundos = 0;

    workoutItems.forEach(item => {
      const s = Number(item.series) || 0;
      const c = parseFloat(item.carga) || 0;
      const r = parseFloat(String(item.reps).replace(/[^0-9.]/g, '')) || 10;
      const d = parseInt(String(item.descanso).replace(/[^0-9]/g, '')) || 60;

      volumeTotal += (s * r * c);
      totalSeries += s;
      totalTempoSegundos += (s * (30 + d));
    });

    const tempoMinutos = Math.max(15, Math.round(totalTempoSegundos / 60));

    return {
      volumeTotal: Math.round(volumeTotal),
      totalSeries,
      totalExercicios: workoutItems.length,
      tempoMinutos
    };
  }, [workoutItems]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveToast(null);

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
          combinaGrupo: item.combinaGrupo || ''
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
        setRawWorkoutDoc((prev: any) => ({
          ...(prev || {}),
          [activeCategory]: updatedSheets
        }));

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        setJustSaved(true);
        setSaveToast({
          message: `✨ ${workoutName} salva com sucesso às ${timeStr}! As alterações estão sincronizadas.`,
          type: 'success'
        });

        setTimeout(() => {
          setJustSaved(false);
        }, 3000);

        setTimeout(() => {
          setSaveToast(null);
        }, 5000);

      } else {
        setSaveToast({
          message: `Erro ao salvar: ${data.error || 'Falha na resposta do servidor'}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setSaveToast({
        message: `Erro de conexão ao salvar: ${err.message}`,
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#070b14',
      color: '#f8fafc',
      zIndex: 999999,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      
      {saveToast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10000000,
          background: saveToast.type === 'success' 
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))' 
            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(185, 28, 28, 0.95))',
          backdropFilter: 'blur(12px)',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '100px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(16, 185, 129, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontWeight: 700,
          fontSize: '0.92rem',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <i className={saveToast.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'} style={{ fontSize: '1.1rem' }}></i>
          <span>{saveToast.message}</span>
          <button 
            onClick={() => setSaveToast(null)} 
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '6px', opacity: 0.8 }}
          >
            &times;
          </button>
        </div>
      )}

      <div style={{
        padding: '14px 28px',
        background: 'linear-gradient(180deg, #111827 0%, #0c1220 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button 
            type="button"
            className="btn btn-secondary" 
            onClick={onClose} 
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: '#e2e8f0',
              fontWeight: 600,
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <i className="fa-solid fa-arrow-left"></i> Voltar para Lista
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                background: 'linear-gradient(135deg, #10b981, #059669)', 
                color: '#fff', 
                padding: '3px 8px', 
                borderRadius: '6px', 
                fontSize: '0.72rem', 
                fontWeight: 900,
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}>
                Ficha Clínica
              </span>
              <h2 style={{ margin: 0, color: '#ffffff', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
                Ficha de Treino do Aluno
              </h2>
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.86rem', marginTop: '2px' }}>
              Aluno: <strong style={{ color: '#38bdf8', fontWeight: 700 }}>{clientName}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '6px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <i className="fa-solid fa-weight-hanging" style={{ color: '#10b981', fontSize: '0.9rem' }}></i>
            <div>
              <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Volume Previsto</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981' }}>{metrics.volumeTotal.toLocaleString('pt-BR')} kg</div>
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '6px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <i className="fa-solid fa-layer-group" style={{ color: '#38bdf8', fontSize: '0.9rem' }}></i>
            <div>
              <div style={{ fontSize: '0.66rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>Exercícios / Séries</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8' }}>{metrics.totalExercicios} ex • {metrics.totalSeries} séries</div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              background: justSaved 
                ? 'linear-gradient(135deg, #10b981, #059669)' 
                : 'linear-gradient(135deg, #10b981, #047857)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.75 : 1,
              boxShadow: justSaved 
                ? '0 0 25px rgba(16, 185, 129, 0.6)' 
                : '0 4px 16px rgba(16, 185, 129, 0.3)',
              border: 'none',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {isSaving ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Salvando Ficha...
              </>
            ) : justSaved ? (
              <>
                <i className="fa-solid fa-circle-check"></i> Ficha Salva!
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk"></i> Salvar Treino
              </>
            )}
          </button>
        </div>
      </div>

      {todayWellness && (
        <div style={{
          background: todayWellness.status === 'otimo' 
            ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 78, 59, 0.25) 100%)' 
            : todayWellness.status === 'moderado' 
            ? 'linear-gradient(90deg, rgba(234, 179, 8, 0.15) 0%, rgba(113, 63, 18, 0.25) 100%)' 
            : todayWellness.status === 'ruim' 
            ? 'linear-gradient(90deg, rgba(249, 115, 22, 0.15) 0%, rgba(124, 45, 18, 0.25) 100%)' 
            : 'linear-gradient(90deg, rgba(239, 68, 68, 0.15) 0%, rgba(127, 29, 29, 0.25) 100%)',
          borderBottom: `2px solid ${todayWellness.statusColor || '#10b981'}`,
          padding: '12px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '6px 14px',
              borderRadius: '100px',
              border: `1.5px solid ${todayWellness.statusColor || '#10b981'}`
            }}>
              <span style={{ fontSize: '1.2rem' }}>🧘</span>
              <div>
                <span style={{ 
                  color: todayWellness.statusColor || '#10b981', 
                  fontWeight: 900, 
                  fontSize: '0.86rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {todayWellness.statusLabel || 'Wellness'}
                </span>
                <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '0.92rem', marginLeft: '6px' }}>
                  ({todayWellness.score}/30 pts)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                <span style={{ color: '#94a3b8' }}>🌙 Sono:</span>
                <strong style={{ color: '#ffffff' }}>{todayWellness.sono}/10</strong>
                <div style={{ width: '45px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(todayWellness.sono / 10) * 100}%`, height: '100%', background: '#38bdf8' }}></div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                <span style={{ color: '#94a3b8' }}>⚡ Fadiga:</span>
                <strong style={{ color: '#ffffff' }}>{todayWellness.fadiga}/10</strong>
                <div style={{ width: '45px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(todayWellness.fadiga / 10) * 100}%`, height: '100%', background: '#f59e0b' }}></div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                <span style={{ color: '#94a3b8' }}>🩺 Dor:</span>
                <strong style={{ color: '#ffffff' }}>{todayWellness.dorMuscular}/10</strong>
                <div style={{ width: '45px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(todayWellness.dorMuscular / 10) * 100}%`, height: '100%', background: '#ef4444' }}></div>
                </div>
              </div>

            </div>
          </div>

          <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: `1px solid ${todayWellness.statusColor || '#10b981'}`,
            color: '#ffffff',
            padding: '6px 16px',
            borderRadius: '10px',
            fontSize: '0.86rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: `0 0 15px ${todayWellness.statusColor ? todayWellness.statusColor + '33' : 'rgba(16,185,129,0.2)'}`
          }}>
            <span>👉 Conduta:</span>
            <span style={{ color: todayWellness.statusColor || '#10b981' }}>{todayWellness.conduta || 'Treino Liberado'}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        <div style={{
          width: '380px',
          background: '#0d1322',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>
                <i className="fa-solid fa-plus-circle" style={{ color: '#10b981', marginRight: '6px' }}></i> Adicionar Exercício
              </span>
              <span style={{ fontSize: '0.74rem', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '100px', color: '#94a3b8' }}>
                {filteredExercises.length} disponíveis
              </span>
            </div>

            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por nome ou grupo muscular..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.84rem'
                }}
              />
              <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.8rem' }}></i>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  &times;
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {muscles.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMuscle(m)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '100px',
                    border: '1px solid',
                    borderColor: selectedMuscle === m ? '#10b981' : 'rgba(255,255,255,0.08)',
                    background: selectedMuscle === m ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                    color: selectedMuscle === m ? '#10b981' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.74rem',
                    fontWeight: selectedMuscle === m ? 800 : 500,
                    transition: 'all 0.15s'
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
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ex.nome}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginTop: '2px' }}>
                    {ex.grupo || ex.grupo_muscular || 'Geral'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => addToWorkout(ex)}
                  title="Adicionar à Ficha"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    transition: 'all 0.2s'
                  }}
                >
                  <i className="fa-solid fa-plus"></i>
                </button>
              </div>
            ))}

            {filteredExercises.length === 0 && (
              <div style={{ textAlign: 'center', color: '#64748b', marginTop: '50px', padding: '0 20px' }}>
                <i className="fa-solid fa-dumbbell" style={{ fontSize: '2rem', opacity: 0.3, marginBottom: '10px', display: 'block' }}></i>
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Nenhum exercício encontrado</div>
                <small style={{ color: '#475569' }}>Tente outro filtro muscular ou termo de busca</small>
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', background: '#070b14' }}>
          <div style={{ maxWidth: '1050px', margin: '0 auto' }}>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '14px',
              background: '#0d1322',
              padding: '12px 18px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#94a3b8', marginRight: '4px' }}>
                  FICHAS:
                </span>
                {(['A', 'B', 'C', 'D', 'E'] as const).map(letter => {
                  const isSelected = activeTabLetter === letter;
                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => handleChangeSheet(letter)}
                      style={{
                        padding: '7px 18px',
                        borderRadius: '8px',
                        border: isSelected ? '1.5px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                        background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                        color: isSelected ? '#10b981' : '#94a3b8',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        boxShadow: isSelected ? '0 0 15px rgba(16, 185, 129, 0.25)' : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      Ficha {letter}
                    </button>
                  );
                })}
              </div>

              <div style={{
                display: 'flex',
                background: 'rgba(0, 0, 0, 0.4)',
                padding: '4px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <button
                  type="button"
                  onClick={() => { setActiveCategory('fichasMonitorado'); handleChangeSheet(activeTabLetter, 'fichasMonitorado'); }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '7px',
                    border: 'none',
                    background: activeCategory === 'fichasMonitorado' ? '#10b981' : 'transparent',
                    color: activeCategory === 'fichasMonitorado' ? '#ffffff' : '#94a3b8',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <i className="fa-solid fa-user-shield" style={{ marginRight: '6px' }}></i>
                  Treino Monitorado
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveCategory('fichasLivre'); handleChangeSheet(activeTabLetter, 'fichasLivre'); }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '7px',
                    border: 'none',
                    background: activeCategory === 'fichasLivre' ? '#38bdf8' : 'transparent',
                    color: activeCategory === 'fichasLivre' ? '#ffffff' : '#94a3b8',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <i className="fa-solid fa-person-running" style={{ marginRight: '6px' }}></i>
                  Treino Livre
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <label style={{ fontWeight: 700, fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  NOME DA FICHA
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={workoutName} 
                  onChange={e => setWorkoutName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    background: '#0d1322',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.9rem'
                  }} 
                />
              </div>
              <div style={{ flex: 2, minWidth: '280px' }}>
                <label style={{ fontWeight: 700, fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                  OBSERVAÇÕES GERAIS / FOCO DO TREINO
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Ex: Foco em Hipertrofia Peitoral e Deltoide Anterior • Intervalos estritos" 
                  value={workoutGoal} 
                  onChange={e => setWorkoutGoal(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    background: '#0d1322',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.9rem'
                  }} 
                />
              </div>
            </div>

            <div style={{
              background: '#0d1322',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
            }}>
              
              <div style={{
                padding: '16px 22px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-list-check" style={{ color: '#10b981', fontSize: '1.1rem' }}></i>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                    Exercícios da {workoutName} ({activeCategory === 'fichasMonitorado' ? 'Monitorado' : 'Livre'})
                  </h3>
                </div>
                <span style={{ 
                  background: 'rgba(16, 185, 129, 0.15)', 
                  color: '#10b981', 
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '4px 12px',
                  borderRadius: '100px',
                  fontSize: '0.78rem',
                  fontWeight: 800
                }}>
                  {workoutItems.length} EXERCÍCIOS
                </span>
              </div>
              
              {workoutItems.length > 0 && !isLoading && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(200px, 2fr) 65px 75px 85px 75px 75px 55px 105px 65px',
                  gap: '8px',
                  padding: '10px 20px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: '#64748b',
                  letterSpacing: '0.5px'
                }}>
                  <div>EXERCÍCIO</div>
                  <div style={{ textAlign: 'center' }}>SÉRIES</div>
                  <div style={{ textAlign: 'center' }}>REPS</div>
                  <div style={{ textAlign: 'center' }}>RITMO</div>
                  <div style={{ textAlign: 'center' }}>CARGA</div>
                  <div style={{ textAlign: 'center' }}>DESC.</div>
                  <div style={{ textAlign: 'center' }}>OBS</div>
                  <div style={{ textAlign: 'center' }}>COMBINAR</div>
                  <div style={{ textAlign: 'center' }}>AÇÕES</div>
                </div>
              )}

              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {isLoading ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#10b981', marginBottom: '16px', display: 'block' }}></i>
                    <p style={{ margin: 0, fontWeight: 800, color: '#ffffff', fontSize: '1rem' }}>Carregando ficha de treino do aluno...</p>
                    <small style={{ color: '#64748b' }}>Sincronizando exercícios, cargas e Wellness</small>
                  </div>
                ) : workoutItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                    <i className="fa-solid fa-dumbbell" style={{ fontSize: '2.5rem', opacity: 0.3, marginBottom: '12px', display: 'block' }}></i>
                    <p style={{ margin: 0, fontWeight: 700, color: '#94a3b8', fontSize: '0.95rem' }}>Esta ficha ainda não possui exercícios cadastrados.</p>
                    <small style={{ color: '#475569' }}>Selecione exercícios na barra lateral à esquerda para adicionar.</small>
                  </div>
                ) : (
                  workoutItems.map((item, index) => {
                    const groupColor = getGroupColor(item.combinaGrupo);
                    const isGrouped = Boolean(item.combinaGrupo);

                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(200px, 2fr) 65px 75px 85px 75px 75px 55px 105px 65px',
                          gap: '8px',
                          alignItems: 'center',
                          padding: '10px 14px',
                          background: isGrouped ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.015)',
                          borderRadius: '10px',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderLeft: isGrouped ? `4px solid ${groupColor}` : '4px solid transparent',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <span style={{ 
                            fontSize: '0.8rem', 
                            fontWeight: 800, 
                            color: '#64748b', 
                            width: '18px' 
                          }}>
                            {index + 1}
                          </span>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#f8fafc' }}>
                                {item.nome}
                              </span>
                              {item.combinaGrupo && (
                                <span style={{
                                  background: groupColor,
                                  color: item.combinaGrupo === 'G5' ? '#000' : '#fff',
                                  fontSize: '0.65rem',
                                  fontWeight: 900,
                                  padding: '1px 6px',
                                  borderRadius: '4px'
                                }}>
                                  {item.combinaGrupo}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                              {item.grupo}
                            </div>
                          </div>
                        </div>

                        <div>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={item.series}
                            onChange={e => updateItem(item.id, 'series', Number(e.target.value))}
                            style={{
                              width: '100%',
                              textAlign: 'center',
                              padding: '4px',
                              background: '#070b14',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#fff',
                              borderRadius: '6px',
                              fontWeight: 700
                            }}
                          />
                        </div>

                        <div>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={item.reps}
                            onChange={e => updateItem(item.id, 'reps', e.target.value)}
                            placeholder="12"
                            style={{
                              width: '100%',
                              textAlign: 'center',
                              padding: '4px',
                              background: '#070b14',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#fff',
                              borderRadius: '6px',
                              fontWeight: 700
                            }}
                          />
                        </div>

                        <div>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={item.ritmo || '2-0-2-0'}
                            onChange={e => updateItem(item.id, 'ritmo', e.target.value)}
                            placeholder="2-0-2-0"
                            title="Ritmo / Cadência: Excêntrica-Isometria-Concêntrica-Pausa"
                            style={{
                              width: '100%',
                              textAlign: 'center',
                              padding: '4px',
                              background: '#070b14',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              color: '#38bdf8',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '0.78rem'
                            }}
                          />
                        </div>

                        <div>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={item.carga}
                            onChange={e => updateItem(item.id, 'carga', Number(e.target.value))}
                            placeholder="10"
                            style={{
                              width: '100%',
                              textAlign: 'center',
                              padding: '4px',
                              background: '#070b14',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#10b981',
                              borderRadius: '6px',
                              fontWeight: 700
                            }}
                          />
                        </div>

                        <div>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={item.descanso}
                            onChange={e => updateItem(item.id, 'descanso', Number(e.target.value))}
                            placeholder="60"
                            style={{
                              width: '100%',
                              textAlign: 'center',
                              padding: '4px',
                              background: '#070b14',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#fff',
                              borderRadius: '6px',
                              fontWeight: 700
                            }}
                          />
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveObsModalItem(item);
                              setTempObsText(item.observacao || '');
                            }}
                            title={item.observacao ? `Obs: ${item.observacao}` : 'Adicionar observação técnica'}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: item.observacao ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                              background: item.observacao ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                              color: item.observacao ? '#38bdf8' : '#94a3b8',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <i className="fa-solid fa-comment-dots"></i>
                          </button>
                        </div>

                        <div>
                          <select
                            value={item.combinaGrupo || ''}
                            onChange={e => updateItem(item.id, 'combinaGrupo', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '4px 6px',
                              borderRadius: '6px',
                              border: item.combinaGrupo ? `1.5px solid ${groupColor}` : '1px solid rgba(255, 255, 255, 0.1)',
                              background: item.combinaGrupo ? `${groupColor}22` : '#070b14',
                              color: item.combinaGrupo ? '#ffffff' : '#94a3b8',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            {COMBINATION_GROUPS.map(g => (
                              <option key={g.id} value={g.id} style={{ background: '#0d1322', color: '#fff' }}>
                                {g.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => moveItem(index, 'up')}
                            disabled={index === 0}
                            title="Subir"
                            style={{
                              padding: '3px 6px',
                              background: 'transparent',
                              border: 'none',
                              color: index === 0 ? '#334155' : '#94a3b8',
                              cursor: index === 0 ? 'default' : 'pointer',
                              fontSize: '0.74rem'
                            }}
                          >
                            <i className="fa-solid fa-chevron-up"></i>
                          </button>

                          <button
                            type="button"
                            onClick={() => moveItem(index, 'down')}
                            disabled={index === workoutItems.length - 1}
                            title="Descer"
                            style={{
                              padding: '3px 6px',
                              background: 'transparent',
                              border: 'none',
                              color: index === workoutItems.length - 1 ? '#334155' : '#94a3b8',
                              cursor: index === workoutItems.length - 1 ? 'default' : 'pointer',
                              fontSize: '0.74rem'
                            }}
                          >
                            <i className="fa-solid fa-chevron-down"></i>
                          </button>

                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            title="Excluir Exercício"
                            style={{
                              padding: '3px 6px',
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontSize: '0.78rem'
                            }}
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>

      </div>

      {activeObsModalItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(6px)',
          zIndex: 10000001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }} onClick={() => setActiveObsModalItem(null)}>
          <div style={{
            background: '#0d1322',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#38bdf8' }}>
                <i className="fa-solid fa-comment-medical" style={{ marginRight: '8px' }}></i>
                Observações Técnicas • {activeObsModalItem.nome}
              </h4>
              <button onClick={() => setActiveObsModalItem(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}>&times;</button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.76rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                SUGESTÕES DE MÉTODOS E TÉCNICAS RÁPIDAS:
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {TECHNIQUE_PRESETS.map(tech => (
                  <button
                    key={tech}
                    type="button"
                    onClick={() => {
                      setTempObsText(prev => prev ? `${prev} • ${tech}` : tech);
                    }}
                    style={{
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      padding: '4px 10px',
                      borderRadius: '100px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    + {tech}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.76rem', color: '#94a3b8', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                INSTRUÇÃO BIOMECÂNICA PERSONALIZADA:
              </label>
              <textarea
                className="form-control"
                rows={3}
                value={tempObsText}
                onChange={e => setTempObsText(e.target.value)}
                placeholder="Ex: Manter cotovelos alinhados, fazer pico de contração de 2 segundos..."
                style={{
                  width: '100%',
                  background: '#070b14',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '0.86rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActiveObsModalItem(null)}
                style={{ padding: '6px 14px', fontSize: '0.84rem' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  updateItem(activeObsModalItem.id, 'observacao', tempObsText);
                  setActiveObsModalItem(null);
                }}
                style={{
                  padding: '6px 18px',
                  background: '#10b981',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  borderRadius: '8px'
                }}
              >
                Salvar Observação
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
