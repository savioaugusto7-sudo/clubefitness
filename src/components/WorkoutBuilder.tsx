'use client';

import React, { useState, useEffect } from 'react';

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

  useEffect(() => {
    fetch('/api/exercises')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setExercises(data.data);
        }
      });
  }, []);

  const muscles = ['Todos', 'Peito', 'Costas', 'Pernas', 'Ombros', 'Braços', 'Core', 'Cardio'];

  const filteredExercises = exercises.filter(e => {
    if (selectedMuscle !== 'Todos' && e.grupo_muscular !== selectedMuscle) return false;
    if (search && !e.nome.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const addToWorkout = (ex: any) => {
    setWorkoutItems([...workoutItems, { ...ex, id: Date.now().toString(), series: 3, reps: 10, carga: 0, descanso: 60 }]);
  };

  const updateItem = (id: string, field: string, val: number) => {
    setWorkoutItems(prev => prev.map(item => item.id === id ? { ...item, [field]: val } : item));
  };

  const removeItem = (id: string) => {
    setWorkoutItems(prev => prev.filter(item => item.id !== id));
  };

  const calculateTotalLoad = () => {
    return workoutItems.reduce((acc, item) => acc + (item.series * item.reps * item.carga), 0);
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: clientId,
          profissionalId: '6668ab030303030303030302', // Admin/Prof default
          nome: workoutName,
          objetivo: workoutGoal,
          status: 'ativo',
          exercicios: workoutItems.map(item => ({
            exercicioId: item._id,
            series: item.series,
            repeticoes: item.reps.toString(),
            carga_sugerida: item.carga.toString(),
            descanso: item.descanso,
            observacoes: ''
          }))
        })
      });
      if (res.ok) {
        alert('Treino salvo com sucesso!');
        onClose();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'var(--bg-default)', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
      
      {/* HEADER */}
      <div style={{ padding: '20px 40px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button className="btn btn-secondary" onClick={onClose}><i className="fa-solid fa-arrow-left"></i></button>
          <div>
            <h2 style={{ margin: 0, color: 'var(--color-primary)' }}>Editor Avançado de Treino</h2>
            <div style={{ color: 'var(--text-dim)' }}>Aluno: {clientName}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ background: 'var(--bg-default)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Volume de Carga Total:</span>
            <strong style={{ marginLeft: '8px', fontSize: '1.2rem', color: 'var(--color-primary)' }}>{calculateTotalLoad()} kg</strong>
          </div>
          <button className="btn btn-primary" onClick={handleSave}><i className="fa-solid fa-save"></i> Salvar Treino</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* SIDEBAR EXERCISES */}
        <div style={{ width: '350px', background: 'var(--bg-card)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
            <input type="text" className="form-control" placeholder="Buscar exercício..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: '12px' }} />
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {muscles.map(m => (
                <button key={m} onClick={() => setSelectedMuscle(m)} style={{ padding: '6px 12px', borderRadius: '100px', border: '1px solid var(--border-color)', background: selectedMuscle === m ? 'var(--color-primary)' : 'transparent', color: selectedMuscle === m ? '#fff' : 'var(--text-color)', cursor: 'pointer', fontSize: '0.85rem' }}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredExercises.map(ex => (
              <div key={ex._id} style={{ padding: '16px', background: 'var(--bg-default)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{ex.nome}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{ex.grupo_muscular}</div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => addToWorkout(ex)}><i className="fa-solid fa-plus"></i></button>
              </div>
            ))}
            {filteredExercises.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: '40px' }}>Nenhum exercício encontrado.</div>}
          </div>
        </div>

        {/* MAIN WORKOUT AREA */}
        <div style={{ flex: 1, padding: '40px', overflowY: 'auto', background: 'var(--bg-default)' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            
            <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
              <div className="form-group" style={{ flex: 2 }}>
                <label>Nome do Treino</label>
                <input type="text" className="form-control" value={workoutName} onChange={e => setWorkoutName(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Objetivo</label>
                <select className="select-custom" value={workoutGoal} onChange={e => setWorkoutGoal(e.target.value)}>
                  <option value="Hipertrofia">Hipertrofia</option>
                  <option value="Emagrecimento">Emagrecimento</option>
                  <option value="Resistência">Resistência</option>
                  <option value="Força">Força Máxima</option>
                  <option value="Reabilitação">Reabilitação Fisioterapêutica</option>
                </select>
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Exercícios Adicionados</h3>
                <span className="badge badge-info">{workoutItems.length} exercícios</span>
              </div>
              
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {workoutItems.map((item, index) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '16px', background: 'var(--bg-default)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--border-color)', width: '30px' }}>{index + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{item.nome}</div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{item.grupo_muscular}</div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Séries</div>
                        <input type="number" className="form-control" value={item.series} onChange={e => updateItem(item.id, 'series', Number(e.target.value))} style={{ width: '70px', textAlign: 'center' }} />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Reps</div>
                        <input type="number" className="form-control" value={item.reps} onChange={e => updateItem(item.id, 'reps', Number(e.target.value))} style={{ width: '70px', textAlign: 'center' }} />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Carga (kg)</div>
                        <input type="number" className="form-control" value={item.carga} onChange={e => updateItem(item.id, 'carga', Number(e.target.value))} style={{ width: '80px', textAlign: 'center' }} />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Desc. (s)</div>
                        <input type="number" className="form-control" value={item.descanso} onChange={e => updateItem(item.id, 'descanso', Number(e.target.value))} style={{ width: '80px', textAlign: 'center' }} />
                      </div>
                    </div>

                    <button className="btn btn-secondary btn-sm" onClick={() => removeItem(item.id)} style={{ color: 'var(--color-danger)' }}><i className="fa-solid fa-trash"></i></button>
                  </div>
                ))}

                {workoutItems.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
                    <i className="fa-solid fa-dumbbell" style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.2 }}></i>
                    <p>Adicione exercícios usando o painel lateral.</p>
                  </div>
                )}
              </div>
            </div>

            {/* CHART PLACEHOLDER */}
            {workoutItems.length > 0 && (
              <div style={{ marginTop: '40px', background: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ marginBottom: '20px' }}><i className="fa-solid fa-chart-bar" style={{ color: 'var(--color-primary)' }}></i> Distribuição de Carga por Exercício</h3>
                <div style={{ display: 'flex', gap: '12px', height: '150px', alignItems: 'flex-end', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                  {workoutItems.map(item => {
                    const load = item.series * item.reps * item.carga;
                    const maxLoad = Math.max(...workoutItems.map(i => i.series * i.reps * i.carga)) || 1;
                    const height = Math.max(10, (load / maxLoad) * 100);
                    return (
                      <div key={item.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{load}kg</div>
                        <div style={{ width: '100%', height: `${height}%`, background: 'var(--color-primary)', borderRadius: '4px 4px 0 0', opacity: 0.8 }}></div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60px' }} title={item.nome}>{item.nome}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
