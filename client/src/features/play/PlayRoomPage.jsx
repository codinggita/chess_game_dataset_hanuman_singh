import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Chess } from 'chess.js';
import ChessGameBoard from '../../components/chess/ChessGameBoard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function PlayRoomPage() {
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [game, setGame] = useState(new Chess());
  const [status, setStatus] = useState('Waiting to join...');
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [playerColor, setPlayerColor] = useState('w');
  const [opponentName, setOpponentName] = useState('Opponent');
  const [moveCount, setMoveCount] = useState(0);
  const moveHistoryRef = useRef([]);
  const gameRef = useRef(game);

  useEffect(() => { gameRef.current = game; }, [game]);

  useEffect(() => {
    const token = localStorage.getItem('chess_auth_token');
    const newSocket = io('http://localhost:5000/game', { auth: { token } });

    newSocket.on('connect', () => console.log('Connected to game namespace'));

    newSocket.on('game_state', (data) => {
      const g = new Chess(data.fen);
      setGame(g);
      setGameStarted(true);
      setStatus('Game in progress');
      moveHistoryRef.current = [];
      setMoveCount(0);
    });

    newSocket.on('move_made', (data) => {
      const g = new Chess(data.fen);
      setGame(g);
    });

    newSocket.on('game_over', (data) => {
      setGameOver(true);
      const winner = data.winner === playerColor ? 'player' : 'opponent';
      if (data.reason === 'checkmate') {
        setGameResult({ type: 'checkmate', winner });
      } else if (data.reason === 'draw' || data.reason === 'stalemate') {
        setGameResult({ type: 'draw', winner: null });
      } else if (data.reason === 'resignation') {
        setGameResult({ type: 'resignation', winner });
      } else {
        setGameResult({ type: 'draw', winner: null });
      }
      setStatus(`Game Over: ${data.reason} - Winner: ${data.winner}`);
    });

    setSocket(newSocket);
    return () => newSocket.close();
  }, [playerColor]);

  const handleMove = useCallback((sourceSquare, targetSquare) => {
    if (!socket || !joined) return false;
    const move = { from: sourceSquare, to: targetSquare, promotion: 'q' };
    const newGame = new Chess(gameRef.current.fen());
    try {
      const result = newGame.move(move);
      if (result) {
        moveHistoryRef.current.push(result.san);
        setMoveCount(moveHistoryRef.current.length);
        setGame(newGame);
        socket.emit('make_move', { roomId, move });
        return true;
      }
    } catch (e) { return false; }
    return false;
  }, [socket, joined, roomId]);

  const handleJoin = () => {
    if (!roomId || !socket) return;
    socket.emit('join_room', { roomId });
    setJoined(true);
    setStatus('Joined Room. Waiting for opponent...');
  };

  const handleCreate = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(newRoomId);
    if (socket) {
      socket.emit('join_room', { roomId: newRoomId });
    }
    setJoined(true);
    setStatus('Room Created. Waiting for opponent...');
  };

  const handleResign = () => {
    if (socket) socket.emit('resign', { roomId });
    setGameOver(true);
    setGameResult({ type: 'resignation', winner: 'opponent' });
    setStatus('You resigned.');
  };

  const handleDraw = () => {
    if (socket) socket.emit('offer_draw', { roomId });
  };

  if (!joined) {
    return (
      <div style={{ padding: 'var(--space-4)', maxWidth: 500, margin: '0 auto' }}>
        <style>{`
          .pr-join-title { font-family: var(--font-display); font-size: var(--font-size-2xl); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-ink); margin-bottom: var(--space-4); padding-bottom: var(--space-4); border-bottom: var(--border-brutal); }
          .pr-join-or { font-family: var(--font-display); font-size: var(--font-size-sm); font-weight: 700; text-transform: uppercase; text-align: center; color: var(--color-muted); }
          .pr-join-input { border: var(--border-thick); background: var(--color-bg); border-radius: 0; padding: 10px 12px; font-family: var(--font-ui); font-size: var(--font-size-md); color: var(--color-ink); outline: none; flex: 1; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; }
          .pr-join-input::placeholder { color: var(--color-muted); }
        `}</style>
        <h1 className="pr-join-title">Play Room</h1>
        <Card style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Button onClick={handleCreate} style={{ width: '100%', justifyContent: 'center' }}>CREATE PRIVATE ROOM</Button>
          <div className="pr-join-or">OR</div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input type="text" placeholder="ROOM ID" className="pr-join-input" value={roomId} onChange={e => setRoomId(e.target.value)} />
            <Button onClick={handleJoin}>JOIN</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <ChessGameBoard
      title={`Room: ${roomId}`}
      game={game}
      onMove={handleMove}
      status={status}
      gameStarted={gameStarted}
      gameOver={gameOver}
      playerColor={playerColor}
      opponentName={opponentName}
      gameResult={gameResult}
      onResign={handleResign}
      onDraw={handleDraw}
      onNewGame={() => { setGameOver(false); setGameResult(null); setGameStarted(false); setJoined(false); setStatus('Waiting to join...'); }}
      onReview={() => { setGameOver(false); setGameResult(null); }}
    />
  );
}
