import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Chess } from 'chess.js';
import ChessGameBoard from '../../components/chess/ChessGameBoard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { connectSocket } from '../../services/socket.js';

const fromPgn = (pgn, fen) => {
  const g = new Chess();
  try {
    if (pgn) g.loadPgn(pgn);
    else if (fen) g.load(fen);
  } catch {
    if (fen) { try { g.load(fen); } catch { /* keep fresh board */ } }
  }
  return g;
};

export default function PlayRoomPage() {
  const location = useLocation();
  const autoJoinId = location.state?.autoJoin || null;

  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [joined, setJoined] = useState(false);
  const [game, setGame] = useState(new Chess());
  const [status, setStatus] = useState('Waiting to join...');
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [playerColor, setPlayerColor] = useState('w');
  const [opponentName, setOpponentName] = useState('Opponent');
  const [drawOffer, setDrawOffer] = useState(false);
  const [notice, setNotice] = useState(null);

  const gameRef = useRef(game);
  const colorRef = useRef(playerColor);
  const roomIdRef = useRef(roomId);
  const gameOverRef = useRef(gameOver);
  const opponentNameRef = useRef(opponentName);
  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { colorRef.current = playerColor; }, [playerColor]);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);
  useEffect(() => { opponentNameRef.current = opponentName; }, [opponentName]);

  useEffect(() => {
    const s = connectSocket('/game');

    s.on('connect_error', (err) => setNotice(err.message || 'Connection failed'));

    s.on('assigned', ({ roomId: rid, color }) => {
      setRoomId(rid);
      setPlayerColor(color === 'white' ? 'w' : 'b');
    });

    s.on('game_state', (data) => {
      setGame(fromPgn(data.pgn, data.fen));
      if (data.blackName || data.whiteName) {
        const me = colorRef.current === 'w' ? data.whiteName : data.blackName;
        const opp = colorRef.current === 'w' ? data.blackName : data.whiteName;
        if (opp && opp !== me) setOpponentName(opp);
      }
    });

    s.on('waiting_for_opponent', () => {
      setStatus('Waiting for opponent to join...');
    });

    s.on('game_start', (data) => {
      setGame(fromPgn(data.pgn, data.fen));
      setGameStarted(true);
      setGameOver(false);
      setGameResult(null);
      setStatus('Game in progress');
      const opp = colorRef.current === 'w' ? data.blackName : data.whiteName;
      if (opp) setOpponentName(opp);
    });

    s.on('move_made', (data) => {
      setGame(fromPgn(data.pgn, data.fen));
    });

    s.on('invalid_move', ({ message }) => setNotice(message || 'Illegal move'));

    s.on('draw_offered', () => setDrawOffer(true));
    s.on('draw_declined', () => setNotice('Draw offer declined'));

    s.on('room_full', () => {
      setNotice('That room is full.');
      setJoined(false);
    });

    s.on('opponent_left', () => {
      if (!gameOverRef.current) setNotice('Opponent disconnected.');
    });

    s.on('game_over', (data) => {
      const myColor = colorRef.current === 'w' ? 'white' : 'black';
      const winner = data.winner === 'draw' ? null : (data.winner === myColor ? 'player' : 'opponent');
      const typeMap = { mate: 'checkmate', resign: 'resignation', stalemate: 'stalemate', draw: 'draw' };
      setGameOver(true);
      setGameResult({ type: typeMap[data.reason] || 'draw', winner });
      setStatus(
        data.winner === 'draw'
          ? `Draw by ${data.reason}`
          : `${data.winner === myColor ? 'You' : opponentNameRef.current} won by ${data.reason}`
      );
    });

    setSocket(s);
    return () => s.close();
  }, []);

  // Auto-join when arriving from matchmaking
  useEffect(() => {
    if (socket && autoJoinId && !joined) {
      socket.emit('join_room', { roomId: autoJoinId });
      setRoomId(autoJoinId);
      setJoined(true);
      setStatus('Joining match...');
    }
  }, [socket, autoJoinId, joined]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const handleMove = useCallback((sourceSquare, targetSquare) => {
    if (!socket || !joined || gameOver) return false;
    if (gameRef.current.turn() !== colorRef.current) return false;

    const move = { from: sourceSquare, to: targetSquare, promotion: 'q' };
    const next = fromPgn(gameRef.current.pgn());
    let result;
    try {
      result = next.move(move);
    } catch {
      return false;
    }
    if (!result) return false;

    setGame(next); // optimistic; server echoes authoritative state
    socket.emit('make_move', { roomId: roomIdRef.current, move });
    return true;
  }, [socket, joined, gameOver]);

  const handleJoin = () => {
    const rid = roomInput.trim().toUpperCase();
    if (!rid || !socket) return;
    socket.emit('join_room', { roomId: rid });
    setRoomId(rid);
    setJoined(true);
    setStatus('Joining room...');
  };

  const handleCreate = () => {
    if (!socket) return;
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    socket.emit('join_room', { roomId: newRoomId });
    setRoomId(newRoomId);
    setJoined(true);
    setStatus('Room created. Waiting for opponent...');
  };

  const handleResign = () => {
    if (socket) socket.emit('resign', { roomId: roomIdRef.current });
  };

  const handleOfferDraw = () => {
    if (socket) socket.emit('offer_draw', { roomId: roomIdRef.current });
    setNotice('Draw offer sent');
  };

  const respondDraw = (accept) => {
    if (socket) socket.emit('draw_response', { roomId: roomIdRef.current, accept });
    setDrawOffer(false);
  };

  const resetToLobby = () => {
    setGameOver(false);
    setGameResult(null);
    setGameStarted(false);
    setJoined(false);
    setRoomId('');
    setRoomInput('');
    setGame(new Chess());
    setStatus('Waiting to join...');
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
        {notice && <div style={{ marginBottom: 'var(--space-3)', fontFamily: 'var(--font-ui)', color: 'var(--color-danger)', fontWeight: 700 }}>{notice}</div>}
        <Card style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Button onClick={handleCreate} style={{ width: '100%', justifyContent: 'center' }}>CREATE PRIVATE ROOM</Button>
          <div className="pr-join-or">OR</div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input type="text" placeholder="ROOM ID" className="pr-join-input" value={roomInput} onChange={e => setRoomInput(e.target.value)} />
            <Button onClick={handleJoin}>JOIN</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      {notice && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 300,
          background: 'var(--color-black)', color: 'var(--color-bg)', padding: '8px 16px',
          fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase',
          letterSpacing: '0.08em', border: 'var(--border-thick)',
        }}>{notice}</div>
      )}

      {drawOffer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--color-bg)', border: 'var(--border-brutal)', padding: 'var(--space-5)', maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 'var(--space-3)' }}>Opponent offers a draw</div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
              <Button variant="outline" onClick={() => respondDraw(false)}>DECLINE</Button>
              <Button variant="primary" onClick={() => respondDraw(true)}>ACCEPT</Button>
            </div>
          </div>
        </div>
      )}

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
        onDraw={handleOfferDraw}
        onNewGame={resetToLobby}
        onReview={() => { setGameOver(false); setGameResult(null); }}
      />
    </>
  );
}
