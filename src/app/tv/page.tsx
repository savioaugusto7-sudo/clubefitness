'use client';

import React, { useEffect, useState } from 'react';
import './tv.css';

const FRASES_MOTIVACIONAIS_TV = [
  "A constância supera o talento. Continue vindo todos os dias! 🔥",
  "Sua saúde é o seu maior investimento. Cuide-se bem! 🩺",
  "Não limite seus desafios. Desafie seus limites! 💪",
  "O único treino ruim é aquele que você não fez. 🏋️‍♂️",
  "Pequenos progressos diários resultam em grandes transformações. 🌟",
  "Mantenha a postura e contraia o abdômen ao realizar os exercícios!",
  "A disciplina te leva aonde a motivação não consegue alcançar. 🧠",
  "Seu corpo aguenta quase tudo. É a sua mente que você precisa convencer.",
  "Movimente-se! A atividade física é o melhor remédio para o corpo e para a mente. 🏥",
  "A persistência é o caminho do êxito. Bons treinos! 🚀"
];

const STREAKS_TV = [
  { nome: "Sávio S.", dias: 5, mensagem: "Sávio S. alcançou a marca de <strong>5 dias seguidos</strong> de atividade! 🔥" },
  { nome: "Maria S.", dias: 3, mensagem: "Maria S. completou <strong>3 treinos</strong> esta semana! 💪" },
  { nome: "João O.", dias: 4, mensagem: "João O. está ativo com <strong>4 treinos seguidos</strong>! ⚡" }
];

function formatTVClientName(fullName: string) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const ignore = ['de', 'da', 'do', 'dos', 'das', 'e'];
  let lastPart = parts[parts.length - 1];
  if (parts.length > 2 && ignore.includes(parts[1].toLowerCase())) {
    lastPart = parts[2];
  } else if (parts.length > 1) {
    lastPart = parts[1];
  }
  const initial = lastPart.charAt(0).toUpperCase();
  return `${parts[0]} ${initial}.`;
}

function getTVActiveBdayClients(clients: any[], appointments: any[], selectedDateStr: string) {
  const today = new Date(selectedDateStr + 'T00:00:00');
  const currentYear = today.getFullYear();
  const activeBdays: any[] = [];

  clients.forEach(client => {
    if (!client.dadosPessoais || !client.dadosPessoais.dataNascimento) return;
    
    const bdayStr = client.dadosPessoais.dataNascimento;
    const bdayParts = bdayStr.split('-');
    if (bdayParts.length !== 3) return;
    
    const bdayMonth = parseInt(bdayParts[1]) - 1;
    const bdayDay = parseInt(bdayParts[2]);
    
    const bdayThisYear = new Date(currentYear, bdayMonth, bdayDay);
    
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const bdayZero = new Date(bdayThisYear.getFullYear(), bdayThisYear.getMonth(), bdayThisYear.getDate());
    
    const diffTime = todayZero.getTime() - bdayZero.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      activeBdays.push({ client, reason: 'dia_exato' });
    } else if (diffDays > 0 && diffDays <= 7) {
      const hasPresenceToday = appointments.some(a => {
        const cId = a.clienteId?._id || a.clienteId;
        return cId === client._id && a.data === selectedDateStr && a.status === 'presenca';
      });
      
      if (hasPresenceToday) {
        const hadPreviousPresence = appointments.some(a => {
          const cId = a.clienteId?._id || a.clienteId;
          if (cId !== client._id || a.status !== 'presenca') return false;
          const aptDate = new Date(a.data + 'T00:00:00');
          return aptDate.getTime() >= bdayZero.getTime() && aptDate.getTime() < todayZero.getTime();
        });
        
        if (!hadPreviousPresence) {
          activeBdays.push({ client, reason: 'primeira_presenca' });
        }
      }
    }
  });
  return activeBdays;
}

export default function TVDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [themeColor, setThemeColor] = useState('#10b981');
  const [gymName, setGymName] = useState('CLUBE FITNESS FISIO');
  
  // Custom simulation states
  const [tvSelectedDate, setTvSelectedDate] = useState('');
  const [tvSelectedTime, setTvSelectedTime] = useState('');
  const [tvHasManualControls, setTvHasManualControls] = useState(false);
  const [tvQuoteIndex, setTvQuoteIndex] = useState(0);
  const [isTVModeActive, setIsTVModeActive] = useState(false);

  // Spotify integration
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [spotifyClientId, setSpotifyClientId] = useState('');
  const [spotifyTrack, setSpotifyTrack] = useState<any>({
    nome: "Levitating",
    artista: "Dua Lipa",
    capa: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=120&auto=format&fit=crop"
  });

  const simulatedPlaylist = [
    { nome: "Levitating", artista: "Dua Lipa", capa: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=120&auto=format&fit=crop" },
    { nome: "Blinding Lights", artista: "The Weeknd", capa: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=120&auto=format&fit=crop" },
    { nome: "Physical", artista: "Dua Lipa", capa: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=120&auto=format&fit=crop" },
    { nome: "Wake Me Up", artista: "Avicii", capa: "https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=120&auto=format&fit=crop" },
    { nome: "Don't Start Now", artista: "Dua Lipa", capa: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=120&auto=format&fit=crop" }
  ];

  // Set initial simulation dates and check Spotify token from hash
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const hourStr = new Date().getHours().toString().padStart(2, '0') + ':00';
    setTvSelectedDate(todayStr);
    setTvSelectedTime(hourStr);

    if (typeof window !== 'undefined') {
      const storedClientId = localStorage.getItem('spotify_client_id') || '';
      setSpotifyClientId(storedClientId);
      
      const storedToken = localStorage.getItem('spotify_access_token');
      if (storedToken) setSpotifyToken(storedToken);

      if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const token = params.get('access_token');
        if (token) {
          setSpotifyToken(token);
          localStorage.setItem('spotify_access_token', token);
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    }
  }, []);

  // Sync settings and dynamic timers
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          const colorSetting = json.data.find((s: any) => s.key === 'theme_color');
          const nameSetting = json.data.find((s: any) => s.key === 'gym_name');
          if (colorSetting) {
            setThemeColor(colorSetting.value);
            document.documentElement.style.setProperty('--color-primary', colorSetting.value);
          }
          if (nameSetting) setGymName(nameSetting.value.toUpperCase());
        }
      });

    // Real-time clock interval
    const clockTimer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Auto update simulation hour if not manual
      if (!tvHasManualControls) {
        const currentHour = now.getHours().toString().padStart(2, '0') + ':00';
        setTvSelectedTime(prev => {
          if (prev !== currentHour) {
            return currentHour;
          }
          return prev;
        });
      }
    }, 1000);

    // Carousel quote rotator
    const quoteTimer = setInterval(() => {
      setTvQuoteIndex(prev => (prev + 1) % FRASES_MOTIVACIONAIS_TV.length);
    }, 60000);

    return () => {
      clearInterval(clockTimer);
      clearInterval(quoteTimer);
    };
  }, [tvHasManualControls]);

  // Fetch data periodically
  const fetchData = async () => {
    try {
      const [resApts, resClients] = await Promise.all([
        fetch('/api/appointments'),
        fetch('/api/clients')
      ]);
      const jsonApts = await resApts.json();
      const jsonClients = await resClients.json();
      if (jsonApts.success) setAppointments(jsonApts.data);
      if (jsonClients.success) setClients(jsonClients.data);
    } catch (e) {
      console.error('Error fetching TV Mode data:', e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Spotify track updates
  const updateSpotifyTrack = async () => {
    if (spotifyToken) {
      try {
        const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: { 'Authorization': `Bearer ${spotifyToken}` }
        });
        if (res.status === 401) {
          setSpotifyToken(null);
          localStorage.removeItem('spotify_access_token');
          return;
        }
        if (res.status === 204 || res.status > 300) {
          // Play simulation as fallback
          const min = new Date().getMinutes();
          const track = simulatedPlaylist[Math.floor(min / 3) % simulatedPlaylist.length];
          setSpotifyTrack(track);
          return;
        }
        const data = await res.json();
        if (data && data.item) {
          setSpotifyTrack({
            nome: data.item.name,
            artista: data.item.artists.map((a: any) => a.name).join(', '),
            capa: data.item.album.images[0]?.url || 'https://placehold.co/120x120/1db954/ffffff?text=CFF'
          });
        }
      } catch (err) {
        // Fallback simulation
        const min = new Date().getMinutes();
        const track = simulatedPlaylist[Math.floor(min / 3) % simulatedPlaylist.length];
        setSpotifyTrack(track);
      }
    } else {
      // Rotation simulation
      const min = new Date().getMinutes();
      const track = simulatedPlaylist[Math.floor(min / 3) % simulatedPlaylist.length];
      setSpotifyTrack(track);
    }
  };

  useEffect(() => {
    updateSpotifyTrack();
    const spotifyInterval = setInterval(updateSpotifyTrack, 10000); // update every 10s
    return () => clearInterval(spotifyInterval);
  }, [spotifyToken]);

  // Connect & Disconnect Spotify handlers
  const connectSpotify = () => {
    if (!spotifyClientId.trim()) {
      alert('Por favor, insira o seu Spotify Client ID.');
      return;
    }
    localStorage.setItem('spotify_client_id', spotifyClientId);
    const redirectUri = window.location.origin + window.location.pathname;
    const scopes = 'user-read-currently-playing';
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${spotifyClientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
    window.location.href = authUrl;
  };

  const disconnectSpotify = () => {
    setSpotifyToken(null);
    localStorage.removeItem('spotify_access_token');
    alert('Spotify desconectado.');
  };

  // Reset to auto simulation
  const resetTVToAuto = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const hourStr = new Date().getHours().toString().padStart(2, '0') + ':00';
    setTvSelectedDate(todayStr);
    setTvSelectedTime(hourStr);
    setTvHasManualControls(false);
  };

  // Toggle TV Mode (Fullscreen)
  const toggleTVMode = () => {
    const nextVal = !isTVModeActive;
    setIsTVModeActive(nextVal);
    
    if (typeof document !== 'undefined') {
      if (nextVal) {
        document.body.classList.add('tv-mode-active');
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          elem.requestFullscreen().catch(err => {
            console.warn('Erro ao entrar em tela cheia:', err);
          });
        }
        resetTVToAuto();
      } else {
        document.body.classList.remove('tv-mode-active');
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(err => {
            console.warn('Erro ao sair de tela cheia:', err);
          });
        }
      }
    }
  };

  // Format date helper values
  const dateObj = tvSelectedDate ? new Date(tvSelectedDate + 'T00:00:00') : new Date();
  const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const weekdayStr = weekdays[dateObj.getDay()];
  const dayStr = `${dateObj.getDate()} de ${months[dateObj.getMonth()]} de ${dateObj.getFullYear()}`;

  // Filter schedules
  const hourNum = tvSelectedTime ? parseInt(tvSelectedTime.split(':')[0], 10) : new Date().getHours();
  const nextHourStr = ((hourNum + 1) % 24).toString().padStart(2, '0') + ':00';

  const todayApts = appointments.filter(a => a.data === tvSelectedDate && a.status !== 'cancelado');
  const currentApts = todayApts.filter(a => a.horario === tvSelectedTime);
  const nextApts = todayApts.filter(a => a.horario === nextHourStr);

  const presentAptsToday = todayApts.filter(a => a.status === 'presenca');
  const sortedCheckins = [...presentAptsToday].sort((a, b) => b.horario.localeCompare(a.horario));
  const activeBdays = getTVActiveBdayClients(clients, appointments, tvSelectedDate);

  // Compute leaderboard score count
  const currentYearStr = tvSelectedDate ? tvSelectedDate.split('-')[0] : String(new Date().getFullYear());
  const currentMonthStr = tvSelectedDate ? tvSelectedDate.split('-')[1] : String(new Date().getMonth() + 1).padStart(2, '0');
  
  // Total presence confirmed in month
  const monthApts = appointments.filter(a => 
    a.status === 'presenca' && 
    a.data && a.data.startsWith(`${currentYearStr}-${currentMonthStr}`)
  );

  const presenceMap: Record<string, number> = {};
  clients.forEach(c => {
    presenceMap[c._id] = c.dadosComerciais?.status === 'ativo' ? (c.dadosComerciais?.creditosUsados || 0) : 0;
  });
  monthApts.forEach(a => {
    const cId = a.clienteId?._id || a.clienteId;
    if (presenceMap[cId] !== undefined) {
      presenceMap[cId] += 1;
    }
  });

  let leaderboard = clients.map(c => ({
    nome: formatTVClientName(c.dadosPessoais?.nome || ''),
    presencas: presenceMap[c._id] || 0
  }));

  // Append simulated gymrats to ensure 13 spots
  const simulatedGymrats = [
    { nome: "Ana B.", presencas: 14 },
    { nome: "Carlos M.", presencas: 12 },
    { nome: "Beatriz F.", presencas: 10 },
    { nome: "Lucas R.", presencas: 9 },
    { nome: "Fernanda C.", presencas: 8 },
    { nome: "Gabriel S.", presencas: 7 },
    { nome: "Juliana P.", presencas: 6 },
    { nome: "Rodrigo A.", presencas: 5 },
    { nome: "Mariana T.", presencas: 4 },
    { nome: "Felipe G.", presencas: 2 }
  ];

  simulatedGymrats.forEach(sim => {
    if (!leaderboard.some(g => g.nome === sim.nome)) {
      leaderboard.push(sim);
    }
  });

  leaderboard.sort((a, b) => b.presencas - a.presencas);
  leaderboard = leaderboard.slice(0, 13);

  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];
  const restGymrats = leaderboard.slice(3);

  const maxPresences = Math.max(...leaderboard.map(g => g.presencas), 1);

  return (
    <div className={`tv-panel-container ${isTVModeActive ? 'tv-mode-active' : ''}`}>
      {/* Floating Exit Button for TV fullscreen mode */}
      {isTVModeActive && (
        <button className="tv-exit-btn" onClick={toggleTVMode}>
          <i className="fa-solid fa-compress"></i> Sair do Modo TV
        </button>
      )}

      {/* Control Bar (Only shown when not active/fullscreen) */}
      {!isTVModeActive && (
        <div className="content-panel" style={{ 
          padding: '16px', 
          marginBottom: '0', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: '16px', 
          background: 'rgba(22, 29, 45, 0.7)', 
          borderRadius: '18px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-info" style={{ fontSize: '0.8rem', background: 'rgba(0, 240, 255, 0.15)', color: 'var(--apple-cyan)' }}>
              <i className="fa-solid fa-tv"></i> Clube Fitness TV
            </span>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Controles de simulação e conectividade:</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Data:</label>
              <input 
                type="date" 
                value={tvSelectedDate} 
                onChange={e => {
                  setTvSelectedDate(e.target.value);
                  setTvHasManualControls(true);
                }} 
                className="select-custom" 
                style={{ width: 'auto', height: '32px', padding: '4px 8px', fontSize: '0.8rem', margin: 0, background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.06)' }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Hora:</label>
              <select 
                value={tvSelectedTime} 
                onChange={e => {
                  setTvSelectedTime(e.target.value);
                  setTvHasManualControls(true);
                }} 
                className="select-custom" 
                style={{ width: 'auto', height: '32px', padding: '4px 8px', fontSize: '0.8rem', margin: 0, background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.06)' }}
              >
                {Array.from({ length: 15 }, (_, i) => {
                  const hr = (i + 7).toString().padStart(2, '0') + ':00';
                  return <option key={hr} value={hr}>{hr}</option>;
                })}
              </select>
            </div>

            {tvHasManualControls && (
              <button className="btn btn-secondary btn-sm" onClick={resetTVToAuto} style={{ height: '32px', padding: '0 12px', margin: 0, borderColor: 'rgba(255,255,255,0.06)' }}>
                <i className="fa-solid fa-rotate"></i> Auto
              </button>
            )}

            {/* Spotify integration inside controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: '12px' }}>
              <span style={{ color: '#1DB954', fontSize: '1rem', display: 'flex', alignItems: 'center' }}><i className="fa-brands fa-spotify"></i></span>
              {spotifyToken ? (
                <>
                  <span style={{ fontSize: '0.72rem', color: '#1DB954', fontWeight: 700 }}>Spotify Conectado</span>
                  <button className="btn btn-secondary btn-sm" onClick={disconnectSpotify} style={{ height: '32px', padding: '0 10px', margin: 0, color: '#ff0055', background: 'rgba(255,0,85,0.05)', borderColor: 'rgba(255,0,85,0.2)', fontSize: '0.72rem' }}>
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <input 
                    type="text" 
                    placeholder="Client ID Spotify" 
                    value={spotifyClientId} 
                    onChange={e => setSpotifyClientId(e.target.value)} 
                    className="select-custom" 
                    style={{ width: '130px', height: '32px', padding: '4px 8px', fontSize: '0.75rem', margin: 0, background: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.06)', color: '#fff' }}
                  />
                  <button className="btn btn-secondary btn-sm" onClick={connectSpotify} style={{ height: '32px', padding: '0 10px', margin: 0, background: '#1DB954', color: '#000', fontWeight: 700, border: 'none', fontSize: '0.72rem' }}>
                    Conectar
                  </button>
                </>
              )}
            </div>

            <button className="btn btn-primary btn-sm" onClick={toggleTVMode} style={{ height: '32px', padding: '0 16px', background: 'var(--apple-green)', color: '#000', border: 'none', fontWeight: 800, boxShadow: 'var(--glow-green)' }}>
              <i className="fa-solid fa-expand"></i> Modo TV
            </button>
          </div>
        </div>
      )}

      {/* Main TV Header */}
      <div className="tv-header">
        <div className="tv-header-brand">
          <img src="/logo.jpg" alt="Logo" className="tv-header-logo" style={{ borderRadius: '50%' }} onError={(e: any) => { e.target.src = 'https://placehold.co/100x100/00ff88/000000?text=CFF' }} />
          <div className="tv-header-title-wrapper">
            <div className="tv-header-title">{gymName}</div>
            <div className="tv-header-tagline">Gestão Inteligente de Saúde e Treino</div>
          </div>
        </div>
        <div className="tv-header-datetime">
          <div className="tv-date">
            <div className="tv-date-weekday">{weekdayStr}</div>
            <div className="tv-date-day">{dayStr}</div>
          </div>
          <div className="tv-clock">{currentTime.toLocaleTimeString('pt-BR')}</div>
        </div>
      </div>

      {/* Main Apple Fitness Dashboard Grid */}
      <div className="tv-grid">
        {/* COLUMN 1: SCHEDULE */}
        <div className="tv-col">
          <div className="tv-col-header" style={{ color: 'var(--apple-green)' }}>
            <div className="tv-col-header-left">
              <i className="fa-solid fa-calendar-day"></i>
              <h2>Agenda do Dia</h2>
            </div>
            <span className="live-indicator">
              <span className="live-dot"></span> Live
            </span>
          </div>

          <div className="tv-col-content">
            {/* Quote carousel replacing rings */}
            <div className="tv-apple-quote-box" style={{ marginBottom: '8px' }}>
              <div className="tv-apple-quote-text">
                "{FRASES_MOTIVACIONAIS_TV[tvQuoteIndex]}"
              </div>
            </div>

            <div className="tv-apple-schedule">
              {/* Current slot */}
              <div className="tv-apple-hour-section">
                <div className="tv-apple-hour-title now">Agora • {tvSelectedTime}</div>
                {currentApts.length > 0 ? currentApts.map((a, i) => {
                  const clientName = formatTVClientName(a.clienteId?.dadosPessoais?.nome || a.clienteId?.nome || 'Aluno');
                  const isPres = a.status === 'presenca';
                  return (
                    <div key={i} className={`tv-apple-apt-card ${a.status}`}>
                      <div>
                        <div className="tv-apple-apt-name">{clientName}</div>
                        <div className="tv-apple-apt-service">{a.servico}</div>
                      </div>
                      <span className={`tv-apple-status-badge ${a.status}`}>
                        {isPres ? 'Presente' : 'Agendado'}
                      </span>
                    </div>
                  );
                }) : (
                  <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '10px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                    Sem atendimentos agendados para este horário.
                  </p>
                )}
              </div>

              {/* Next slot */}
              <div className="tv-apple-hour-section" style={{ marginTop: '8px' }}>
                <div className="tv-apple-hour-title next">A Seguir • {nextHourStr}</div>
                {nextApts.length > 0 ? nextApts.map((a, i) => {
                  const clientName = formatTVClientName(a.clienteId?.dadosPessoais?.nome || a.clienteId?.nome || 'Aluno');
                  const isPres = a.status === 'presenca';
                  return (
                    <div key={i} className={`tv-apple-apt-card ${a.status}`}>
                      <div>
                        <div className="tv-apple-apt-name">{clientName}</div>
                        <div className="tv-apple-apt-service">{a.servico}</div>
                      </div>
                      <span className={`tv-apple-status-badge ${a.status}`}>
                        {isPres ? 'Presente' : 'Agendado'}
                      </span>
                    </div>
                  );
                }) : (
                  <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '10px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                    Sem agendamentos.
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* COLUMN 2: CONSTANCY LEADERBOARD */}
        <div className="tv-col">
          <div className="tv-col-header" style={{ color: 'var(--apple-cyan)' }}>
            <div className="tv-col-header-left">
              <i className="fa-solid fa-fire"></i>
              <h2>Ranking da Constância</h2>
            </div>
          </div>

          <div className="tv-col-content" style={{ gap: '12px' }}>
            {/* Apple Podium (Top 3) */}
            <div className="tv-apple-podium">
              {/* 2nd place */}
              {top2 && (
                <div className="tv-apple-podium-col second">
                  <div className="tv-apple-podium-medal">🥈</div>
                  <div className="tv-apple-podium-bar">
                    <span className="tv-apple-podium-count">{top2.presencas}</span>
                    <span className="tv-apple-podium-name">{top2.nome}</span>
                  </div>
                </div>
              )}

              {/* 1st place */}
              {top1 && (
                <div className="tv-apple-podium-col first">
                  <div className="tv-apple-podium-medal">🏆</div>
                  <div className="tv-apple-podium-bar">
                    <span className="tv-apple-podium-count">{top1.presencas}</span>
                    <span className="tv-apple-podium-name">{top1.nome}</span>
                  </div>
                </div>
              )}

              {/* 3rd place */}
              {top3 && (
                <div className="tv-apple-podium-col third">
                  <div className="tv-apple-podium-medal">🥉</div>
                  <div className="tv-apple-podium-bar">
                    <span className="tv-apple-podium-count">{top3.presencas}</span>
                    <span className="tv-apple-podium-name">{top3.nome}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Neon Leaderboard List (positions 4 to 13) */}
            <div className="tv-apple-leaderboard-list">
              {restGymrats.map((g, index) => {
                const pos = index + 4;
                const barWidth = Math.round((g.presencas / maxPresences) * 100);
                return (
                  <div key={pos} className="tv-apple-leaderboard-item">
                    <span className="tv-apple-leaderboard-rank">{pos}</span>
                    <div className="tv-apple-leaderboard-info">
                      <div className="tv-apple-leaderboard-name-wrapper">
                        <span className="tv-apple-leaderboard-name">{g.nome}</span>
                        <span className="tv-apple-leaderboard-count">{g.presencas} presenças</span>
                      </div>
                      <div className="tv-apple-leaderboard-progress-container">
                        <div className="tv-apple-leaderboard-progress-bar" style={{ width: `${barWidth}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* COLUMN 3: SPOTIFY & MURAL ACTIVITY */}
        <div className="tv-col">
          <div className="tv-col-header" style={{ color: '#1DB954' }}>
            <div className="tv-col-header-left">
              <i className="fa-brands fa-spotify"></i>
              <h2>Spotify</h2>
            </div>
          </div>

          <div className="tv-col-content" style={{ gap: '16px' }}>
            {/* Spotify playing now card */}
            <div className="tv-spotify-widget" style={{ marginTop: 0, marginBottom: '8px' }}>
              <img src={spotifyTrack.capa} alt="Album Art" className="tv-spotify-album-art" />
              <div className="tv-spotify-info">
                <div className="tv-spotify-title-row">
                  <span className="tv-spotify-brand-icon"><i className="fa-brands fa-spotify"></i></span>
                  <span className="tv-spotify-track-name">{spotifyTrack.nome}</span>
                </div>
                <div className="tv-spotify-artist-name">{spotifyTrack.artista}</div>
              </div>
              <div className="tv-spotify-equalizer">
                <div className="tv-spotify-eq-bar"></div>
                <div className="tv-spotify-eq-bar"></div>
                <div className="tv-spotify-eq-bar"></div>
                <div className="tv-spotify-eq-bar"></div>
              </div>
            </div>

            {/* Streaks highlight box */}
            <div className="tv-apple-mural-box">
              <div className="tv-apple-mural-title">
                <i className="fa-solid fa-trophy"></i> Destaques do Clube
              </div>
              <div className="tv-apple-mural-content" dangerouslySetInnerHTML={{ __html: STREAKS_TV[tvQuoteIndex % STREAKS_TV.length].mensagem }} />
            </div>

            {/* Birthdays highlight box (if any) */}
            {activeBdays.length > 0 && (
              <div className="tv-apple-mural-box" style={{ background: 'rgba(255, 183, 0, 0.03)', borderColor: 'rgba(255, 183, 0, 0.15)' }}>
                <div className="tv-apple-mural-title" style={{ color: 'var(--apple-yellow)' }}>
                  <i className="fa-solid fa-cake-candles"></i> Aniversariante do Dia!
                </div>
                <div className="tv-apple-mural-content">
                  🎂 Feliz aniversário para <strong>{activeBdays.map(b => formatTVClientName(b.client.dadosPessoais?.nome || b.client.nome)).join(' e ')}</strong>! Muitas conquistas e saúde hoje! 🎉
                </div>
              </div>
            )}

            {/* Live Feed of Check-ins */}
            <div className="tv-apple-feed">
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '1px' }}>Últimas Presenças</span>
              {sortedCheckins.length > 0 ? sortedCheckins.slice(0, 4).map((a, i) => {
                const clientName = formatTVClientName(a.clienteId?.dadosPessoais?.nome || a.clienteId?.nome || 'Aluno');
                return (
                  <div key={i} className="tv-apple-feed-item">
                    <div className="tv-apple-feed-avatar">{clientName.charAt(0)}</div>
                    <div className="tv-apple-feed-info">
                      <div className="tv-apple-feed-text"><strong>{clientName}</strong> confirmou presença para <strong>{a.servico}</strong>!</div>
                      <div className="tv-apple-feed-time"><i className="fa-regular fa-clock"></i> {a.horario}</div>
                    </div>
                  </div>
                );
              }) : (
                <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', padding: '12px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                  Aguardando check-ins confirmados hoje... 👟
                </p>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
