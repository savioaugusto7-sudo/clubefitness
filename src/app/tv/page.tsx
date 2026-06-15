'use client';

import React, { useEffect, useState } from 'react';
import './tv.css';

export default function TVDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [themeColor, setThemeColor] = useState('#2563eb');
  const [gymName, setGymName] = useState('Clube Fitness');
  
  useEffect(() => {
    // Load config from DB to support different machines (e.g. real TV)
    fetch('/api/settings')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          const colorSetting = json.data.find((s: any) => s.key === 'theme_color');
          const nameSetting = json.data.find((s: any) => s.key === 'gym_name');
          const color = colorSetting ? colorSetting.value : '#2563eb';
          const name = nameSetting ? nameSetting.value : 'Clube Fitness Fisio';
          setThemeColor(color);
          setGymName(name);
          document.documentElement.style.setProperty('--color-primary', color);
        }
      });

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchApts = async () => {
      try {
        const res = await fetch('/api/appointments');
        const json = await res.json();
        if (json.success) {
          const todayStr = new Date().toISOString().split('T')[0];
          const today = json.data.filter((a: any) => a.data === todayStr && a.status !== 'cancelado');
          setAppointments(today.sort((a: any, b: any) => a.horario.localeCompare(b.horario)));
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchApts();
    const refreshTimer = setInterval(fetchApts, 60000); // 1 min refresh
    return () => clearInterval(refreshTimer);
  }, []);

  const timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="tv-container" style={{ background: '#0f172a', color: '#fff', height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER */}
      <header style={{ padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '50px', height: '50px', background: 'var(--color-primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fa-solid fa-dumbbell" style={{ fontSize: '24px', color: '#fff' }}></i>
          </div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, background: `linear-gradient(45deg, var(--color-primary), #60a5fa)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{gymName}</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ margin: 0, fontSize: '3.5rem', fontWeight: 700, lineHeight: 1 }}>{timeStr}</h2>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '1.2rem', textTransform: 'capitalize' }}>{dateStr}</p>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, padding: '48px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '48px' }}>
        
        {/* AGENDA SECTION */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h2 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '12px', color: '#cbd5e1' }}>
            <i className="fa-solid fa-calendar-check" style={{ color: 'var(--color-primary)' }}></i> Próximos Atendimentos
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '16px' }}>
            {appointments.length > 0 ? appointments.slice(0, 6).map((a, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '24px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: `6px solid ${a.tipo === 'academia' ? '#10b981' : '#3b82f6'}`, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 700 }}>{a.horario}</div>
                  <div style={{ color: '#94a3b8', fontSize: '1.2rem', marginTop: '4px' }}>{a.servico || 'Sessão'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 600 }}>{a.clienteId?.nome || 'Aluno'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <span style={{ background: a.tipo === 'academia' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)', color: a.tipo === 'academia' ? '#34d399' : '#60a5fa', padding: '4px 12px', borderRadius: '100px', fontSize: '1rem', fontWeight: 600, textTransform: 'uppercase' }}>
                      {a.tipo === 'academia' ? 'Treino' : 'Fisio'}
                    </span>
                  </div>
                </div>
              </div>
            )) : (
              <div style={{ fontSize: '1.5rem', color: '#64748b', textAlign: 'center', padding: '48px' }}>
                Nenhum atendimento agendado para hoje.
              </div>
            )}
          </div>
        </div>

        {/* WIDGETS SECTION */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* RANKING GYMRATS */}
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '32px', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', color: '#cbd5e1' }}>
              <i className="fa-solid fa-fire" style={{ color: '#ef4444' }}></i> Gym Rats da Semana
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24', width: '30px' }}>1</div>
                <div style={{ flex: 1, fontSize: '1.2rem', fontWeight: 600 }}>João Silva</div>
                <div style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', padding: '4px 12px', borderRadius: '100px', fontSize: '1rem', fontWeight: 700 }}>5 treinos</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#94a3b8', width: '30px' }}>2</div>
                <div style={{ flex: 1, fontSize: '1.2rem', fontWeight: 600 }}>Maria Santos</div>
                <div style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', padding: '4px 12px', borderRadius: '100px', fontSize: '1rem', fontWeight: 700 }}>4 treinos</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b45309', width: '30px' }}>3</div>
                <div style={{ flex: 1, fontSize: '1.2rem', fontWeight: 600 }}>Carlos Lima</div>
                <div style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', padding: '4px 12px', borderRadius: '100px', fontSize: '1rem', fontWeight: 700 }}>3 treinos</div>
              </div>
            </div>
          </div>

          {/* SPOTIFY WIDGET */}
          <div style={{ background: 'rgba(29, 185, 84, 0.1)', padding: '32px', borderRadius: '24px', border: '1px solid rgba(29, 185, 84, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '80px', height: '80px', background: '#1DB954', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-brands fa-spotify" style={{ fontSize: '40px', color: '#fff' }}></i>
              </div>
              <div>
                <div style={{ fontSize: '1rem', color: '#1DB954', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>Tocando Agora</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>Playlist da Clínica</div>
                <div style={{ fontSize: '1.2rem', color: '#94a3b8' }}>Música Relaxante & Foco</div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

