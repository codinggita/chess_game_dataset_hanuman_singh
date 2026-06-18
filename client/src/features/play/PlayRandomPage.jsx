import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function PlayRandomPage() {
  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState('Select a Time Control to Join Queue');
  const [inQueue, setInQueue] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('chess_auth_token');
    const newSocket = io('http://localhost:5000/matchmaking', { auth: { token } });

    newSocket.on('connect', () => console.log('Connected to matchmaking namespace'));

    newSocket.on('queue_joined', ({ mode }) => {
      setInQueue(true);
      setStatus(`Searching for opponent in ${mode}...`);
    });

    newSocket.on('queue_left', () => {
      setInQueue(false);
      setStatus('Left queue. Select a Time Control.');
    });

    newSocket.on('match_found', ({ roomId }) => {
      setStatus('MATCH FOUND! Joining game...');
      setTimeout(() => navigate('/play/room', { state: { autoJoin: roomId } }), 1500);
    });

    setSocket(newSocket);
    return () => newSocket.close();
  }, [navigate]);

  const joinQueue = (mode) => {
    if (!socket) return;
    setSelectedMode(mode);
    socket.emit('join_queue', { mode, rating: 1200 });
  };

  const leaveQueue = () => {
    if (!socket || !selectedMode) return;
    socket.emit('leave_queue', { mode: selectedMode });
  };

  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: 900, margin: '0 auto' }}>
      <style>{`
        .pr-title { font-family: var(--font-display); font-size: var(--font-size-2xl); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-ink); margin-bottom: var(--space-4); padding-bottom: var(--space-4); border-bottom: var(--border-brutal); }
        .pr-status { font-family: var(--font-display); font-size: var(--font-size-lg); font-weight: 700; text-transform: uppercase; color: var(--color-ink); margin-bottom: var(--space-6); }
        .pr-mode-grid { display: grid; grid-template-columns: 1fr; gap: var(--space-4); }
        @media (min-width: 640px) { .pr-mode-grid { grid-template-columns: repeat(3, 1fr); } }
        .pr-mode-card { padding: var(--space-6); display: flex; flex-direction: column; align-items: center; gap: var(--space-3); cursor: pointer; transition: transform 150ms ease; }
        .pr-mode-card:hover { transform: translate(-4px, -4px); }
        .pr-mode-name { font-family: var(--font-display); font-size: var(--font-size-2xl); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-ink); }
        .pr-mode-time { font-family: var(--font-ui); font-size: var(--font-size-md); font-weight: 700; color: var(--color-muted); }
        .pr-searching-wrap { display: flex; flex-direction: column; align-items: center; gap: var(--space-5); padding: var(--space-8) 0; }
        .pr-searching-spinner { width: 120px; height: 120px; border: var(--border-brutal); background: var(--color-black); display: flex; align-items: center; justify-content: center; animation: pr-pulse 1.5s ease-in-out infinite; }
        @keyframes pr-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .pr-searching-text { font-family: var(--font-display); font-size: var(--font-size-sm); font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--color-bg); }
      `}</style>

      <h1 className="pr-title">Play Online</h1>
      <p className="pr-status">{status}</p>

      {!inQueue ? (
        <div className="pr-mode-grid">
          <Card className="pr-mode-card" onClick={() => joinQueue('bullet')}>
            <div className="pr-mode-name">Bullet</div>
            <div className="pr-mode-time">1 min</div>
          </Card>
          <Card className="pr-mode-card" onClick={() => joinQueue('blitz')}>
            <div className="pr-mode-name">Blitz</div>
            <div className="pr-mode-time">3 min</div>
          </Card>
          <Card className="pr-mode-card" onClick={() => joinQueue('rapid')}>
            <div className="pr-mode-name">Rapid</div>
            <div className="pr-mode-time">10 min</div>
          </Card>
        </div>
      ) : (
        <div className="pr-searching-wrap">
          <div className="pr-searching-spinner">
            <span className="pr-searching-text">Searching</span>
          </div>
          <Button variant="outline" onClick={leaveQueue} style={{ minWidth: 200, justifyContent: 'center' }}>CANCEL MATCHMAKING</Button>
        </div>
      )}
    </div>
  );
}
