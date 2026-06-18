import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import Card from '../ui/Card';
import Button from '../ui/Button';

const PIECE_UNICODE = {
  wK: '\u2654', wQ: '\u2655', wR: '\u2656', wB: '\u2657', wN: '\u2658', wP: '\u2659',
  bK: '\u265A', bQ: '\u265B', bR: '\u265C', bB: '\u265D', bN: '\u265E', bP: '\u265F',
};
const PIECE_ORDER = ['q', 'r', 'b', 'n', 'p'];

function countPieces(fen) {
  const board = fen.split(' ')[0];
  const counts = {};
  for (const ch of board) {
    if (ch === '/') continue;
    if (isNaN(ch)) counts[ch] = (counts[ch] || 0) + 1;
  }
  return counts;
}

function getCapturedPieces(fen) {
  const current = countPieces(fen);
  const start = { P: 8, N: 2, B: 2, R: 2, Q: 1, K: 1, p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
  const captured = { white: [], black: [] };
  for (const [piece, count] of Object.entries(start)) {
    const diff = count - (current[piece] || 0);
    if (diff > 0) {
      const color = piece === piece.toUpperCase() ? 'white' : 'black';
      for (let i = 0; i < diff; i++) captured[color].push(piece);
    }
  }
  captured.white.sort((a, b) => PIECE_ORDER.indexOf(a.toLowerCase()) - PIECE_ORDER.indexOf(b.toLowerCase()));
  captured.black.sort((a, b) => PIECE_ORDER.indexOf(a.toLowerCase()) - PIECE_ORDER.indexOf(b.toLowerCase()));
  return captured;
}

function useBoardSize(containerRef) {
  const [size, setSize] = useState(400);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = Math.floor(el.getBoundingClientRect().width);
      if (w > 0) setSize(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);
  return size;
}

function useGameTimer(isRunning, isGameOver) {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef(null);
  useEffect(() => {
    if (isRunning && !isGameOver) {
      intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, isGameOver]);
  const reset = () => setSeconds(0);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return { mm, ss, reset };
}

export default function ChessGameBoard({
  title = 'Chess',
  game,
  onMove,
  status,
  gameStarted = false,
  gameOver = false,
  playerColor = 'w',
  opponentName = 'Opponent',
  isOpponentThinking = false,
  gameResult = null,
  onResign,
  onDraw,
  onUndo,
  onNewGame,
  onReview,
  undoDisabled = true,
  settingsContent,
  extraSidebarContent,
  showEval = false,
  evalScore = 0,
}) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const boardContainerRef = useRef(null);
  const movesListRef = useRef(null);
  const boardSize = useBoardSize(boardContainerRef);
  const gameRef = useRef(game);
  const playerColorRef = useRef(playerColor);
  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { playerColorRef.current = playerColor; }, [playerColor]);

  const isCheck = useMemo(() => {
    try { return game.isCheck(); } catch (e) { return false; }
  }, [game]);

  const capturedPieces = useMemo(() => getCapturedPieces(game.fen()), [game]);

  const squareStyles = useMemo(() => {
    const styles = {};
    if (isCheck) {
      const board = game.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && piece.type === 'k' && piece.color === game.turn()) {
            const file = 'abcdefgh'[c];
            const rank = 8 - r;
            styles[`${file}${rank}`] = {
              backgroundColor: 'rgba(255, 0, 0, 0.55)',
              boxShadow: 'inset 0 0 12px 4px rgba(255, 0, 0, 0.7)',
            };
          }
        }
      }
    }
    if (selectedSquare) {
      styles[selectedSquare] = {
        ...(styles[selectedSquare] || {}),
        backgroundColor: 'rgba(255, 255, 0, 0.45)',
        boxShadow: 'inset 0 0 0 3px rgba(255, 200, 0, 0.9)',
      };
      try {
        const moves = game.moves({ square: selectedSquare, verbose: true });
        for (const m of moves) {
          const isCapture = game.get(m.to) !== null;
          if (!styles[m.to]) {
            styles[m.to] = isCapture
              ? { backgroundColor: 'rgba(220, 50, 50, 0.5)', boxShadow: 'inset 0 0 0 3px rgba(220, 50, 50, 0.8)' }
              : { backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.35) 28%, transparent 29%)', backgroundColor: 'transparent' };
          }
        }
      } catch (e) {}
    }
    return styles;
  }, [game, isCheck, selectedSquare]);

  const handlePieceDrop = useCallback(({ sourceSquare, targetSquare }) => {
    setSelectedSquare(null);
    return onMove(sourceSquare, targetSquare);
  }, [onMove]);

  const handlePieceClick = useCallback(({ piece, square }) => {
    if (!gameStarted || gameOver || isOpponentThinking) return;
    if (gameRef.current.turn() !== playerColorRef.current) return;
    const pieceColor = piece.pieceType[0] === 'w' ? 'w' : 'b';
    if (pieceColor === playerColorRef.current) setSelectedSquare(square);
  }, [gameStarted, gameOver, isOpponentThinking]);

  const handleSquareClick = useCallback(({ square }) => {
    if (!gameStarted || gameOver || isOpponentThinking) return;
    if (gameRef.current.turn() !== playerColorRef.current) return;
    if (selectedSquare) {
      const result = onMove(selectedSquare, square);
      if (result) {
        setSelectedSquare(null);
      } else {
        const piece = gameRef.current.get(square);
        if (piece && piece.color === playerColorRef.current) {
          setSelectedSquare(square);
        } else {
          setSelectedSquare(null);
        }
      }
    } else {
      const piece = gameRef.current.get(square);
      if (piece && piece.color === playerColorRef.current) setSelectedSquare(square);
    }
  }, [selectedSquare, onMove, gameStarted, gameOver, isOpponentThinking]);

  useEffect(() => {
    if (movesListRef.current) {
      movesListRef.current.scrollTop = movesListRef.current.scrollHeight;
    }
  }, [game]);

  const handleResignConfirm = () => {
    onResign?.();
    setConfirmAction(null);
  };
  const handleDrawConfirm = () => {
    onDraw?.();
    setConfirmAction(null);
  };

  const isWhitesTurn = game.turn() === 'w';
  const currentPlayerLabel = isWhitesTurn ? 'White' : 'Black';
  const playerPieceColor = playerColor === 'w' ? 'White' : 'Black';
  const opponentPieceColor = playerColor === 'w' ? 'Black' : 'White';
  const isPlayerTurn = game.turn() === playerColor;

  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: 1100, margin: '0 auto' }}>
      <style>{`
        .cgb-layout { display: grid; grid-template-columns: 1fr; gap: var(--space-6); align-items: start; }
        @media (min-width: 1024px) { .cgb-layout { grid-template-columns: 1fr 320px; } }
        .cgb-board-wrap { display: flex; justify-content: center; position: relative; padding: var(--space-3); overflow: hidden; }
        .cgb-eval-badge { position: absolute; top: var(--space-2); left: var(--space-2); font-family: var(--font-display); font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; background: var(--color-bg); color: var(--color-ink); border: var(--border-thin); padding: 4px 10px; z-index: 2; }
        .cgb-check-badge { position: absolute; top: var(--space-2); right: var(--space-2); font-family: var(--font-display); font-size: var(--font-size-sm); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; background: #C0392B; color: #fff; border: 3px solid #000; padding: 4px 12px; z-index: 2; animation: cgb-pulse-check 0.8s ease-in-out infinite; }
        @keyframes cgb-pulse-check { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .cgb-title { font-family: var(--font-display); font-size: var(--font-size-2xl); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-ink); margin-bottom: var(--space-4); padding-bottom: var(--space-4); border-bottom: var(--border-brutal); }
        .cgb-settings-title { font-family: var(--font-display); font-size: var(--font-size-lg); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-ink); margin-bottom: var(--space-4); padding-bottom: var(--space-3); border-bottom: var(--border-thick); }
        .cgb-label { display: block; font-family: var(--font-display); font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; color: var(--color-ink); margin-bottom: var(--space-2); }
        .cgb-action-btns { display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-4); }
        .cgb-action-btns .btn { width: 100%; justify-content: center; }
        .cgb-status-card { padding: var(--space-3) var(--space-4); background: var(--color-bg-alt); border: var(--border-brutal); box-shadow: var(--shadow-md); }
        .cgb-status-label { font-family: var(--font-display); font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.12em; color: var(--color-muted); margin-bottom: var(--space-1); font-weight: 700; }
        .cgb-status-text { font-family: var(--font-display); font-size: var(--font-size-lg); font-weight: 700; color: var(--color-ink); }
        .cgb-game-bar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-3) var(--space-4); background: var(--color-black); color: var(--color-bg); border: var(--border-brutal); margin-bottom: var(--space-4); flex-wrap: wrap; }
        .cgb-game-bar-item { font-family: var(--font-display); font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; display: flex; align-items: center; gap: var(--space-2); }
        .cgb-timer { font-family: var(--font-display); font-size: var(--font-size-xl); font-weight: 700; letter-spacing: 0.04em; min-width: 6ch; text-align: center; }
        .cgb-turn-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; border: 2px solid var(--color-bg); flex-shrink: 0; }
        .cgb-turn-dot.white { background: #fff; }
        .cgb-turn-dot.black { background: #333; }
        .cgb-thinking { animation: cgb-pulse-thinking 1s ease-in-out infinite; }
        @keyframes cgb-pulse-thinking { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .cgb-game-over-bar { background: var(--color-green); }
        .cgb-player-label { font-family: var(--font-display); font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; padding: var(--space-1) var(--space-3); display: flex; align-items: center; gap: var(--space-2); }
        .cgb-player-label.active { background: var(--color-black); color: var(--color-bg); }
        .cgb-player-label.inactive { background: var(--color-surface); color: var(--color-muted); }
        .cgb-captured { display: flex; align-items: center; flex-wrap: wrap; gap: 2px; min-height: 28px; padding: 4px 8px; font-size: 18px; line-height: 1; }
        .cgb-captured-label { font-family: var(--font-display); font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; color: var(--color-muted); margin-right: 4px; white-space: nowrap; }
        .cgb-captured-row { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); border: var(--border-thin); background: var(--color-bg); }
        .cgb-captured-row + .cgb-captured-row { border-top: none; }
        .cgb-confirm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; display: flex; align-items: center; justify-content: center; padding: var(--space-4); }
        .cgb-confirm-box { background: var(--color-bg); border: var(--border-brutal); box-shadow: var(--shadow-lg); padding: var(--space-5); max-width: 400px; width: 100%; text-align: center; }
        .cgb-confirm-title { font-family: var(--font-display); font-size: var(--font-size-lg); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: var(--space-3); }
        .cgb-confirm-text { font-family: var(--font-ui); font-size: var(--font-size-sm); color: var(--color-muted); margin-bottom: var(--space-4); }
        .cgb-confirm-btns { display: flex; gap: var(--space-3); justify-content: center; }
        .cgb-confirm-btns .btn { min-width: 120px; justify-content: center; }
        .cgb-gameover-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.82); display: flex; align-items: center; justify-content: center; padding: var(--space-4); animation: cgb-fade-in 0.3s ease; }
        @keyframes cgb-fade-in { from { opacity: 0; } to { opacity: 1; } }
        .cgb-gameover-box { background: var(--color-bg); border: var(--border-brutal); box-shadow: var(--shadow-lg); padding: var(--space-6) var(--space-5); max-width: 440px; width: 100%; text-align: center; position: relative; overflow: hidden; animation: cgb-slide-up 0.4s ease; }
        @keyframes cgb-slide-up { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .cgb-gameover-box::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 6px; }
        .cgb-gameover-box.win::before { background: var(--color-green); }
        .cgb-gameover-box.loss::before { background: var(--color-danger); }
        .cgb-gameover-box.draw-result::before { background: var(--color-warning); }
        .cgb-gameover-crown { font-size: 56px; line-height: 1; margin-bottom: var(--space-3); animation: cgb-crown-bounce 0.6s ease; }
        @keyframes cgb-crown-bounce { 0% { transform: scale(0) rotate(-20deg); } 60% { transform: scale(1.2) rotate(5deg); } 100% { transform: scale(1) rotate(0deg); } }
        .cgb-gameover-icon { font-size: 56px; line-height: 1; margin-bottom: var(--space-3); }
        .cgb-gameover-result { font-family: var(--font-display); font-size: var(--font-size-3xl); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: var(--space-2); }
        .cgb-gameover-result.win-text { color: var(--color-green); }
        .cgb-gameover-result.loss-text { color: var(--color-danger); }
        .cgb-gameover-result.draw-text { color: var(--color-warning); }
        .cgb-gameover-subtitle { font-family: var(--font-display); font-size: var(--font-size-md); font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-muted); margin-bottom: var(--space-4); }
        .cgb-gameover-stats { display: flex; justify-content: center; gap: var(--space-5); margin-bottom: var(--space-5); padding: var(--space-3) 0; border-top: var(--border-thin); border-bottom: var(--border-thin); }
        .cgb-gameover-stat { text-align: center; }
        .cgb-gameover-stat-label { font-family: var(--font-display); font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--color-muted); margin-bottom: 2px; }
        .cgb-gameover-stat-value { font-family: var(--font-display); font-size: var(--font-size-lg); font-weight: 700; color: var(--color-ink); }
        .cgb-gameover-btns { display: flex; gap: var(--space-3); justify-content: center; }
        .cgb-gameover-btns .btn { min-width: 140px; justify-content: center; }
        .cgb-confetti { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; overflow: hidden; }
        .cgb-confetti-piece { position: absolute; width: 8px; height: 8px; animation: cgb-confetti-fall 2.5s ease-in forwards; }
        @keyframes cgb-confetti-fall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(400px) rotate(720deg); opacity: 0; } }
        .cgb-moves-card { border: var(--border-brutal); box-shadow: var(--shadow-md); background: var(--color-bg); display: flex; flex-direction: column; max-height: 320px; }
        .cgb-moves-title { font-family: var(--font-display); font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700; padding: var(--space-3) var(--space-3) var(--space-2); border-bottom: var(--border-thick); background: var(--color-black); color: var(--color-bg); }
        .cgb-moves-list { flex: 1; overflow-y: auto; padding: var(--space-2) var(--space-3); font-family: var(--font-ui); font-size: var(--font-size-sm); }
        .cgb-moves-list::-webkit-scrollbar { width: 6px; }
        .cgb-moves-list::-webkit-scrollbar-track { background: var(--color-bg-alt); }
        .cgb-moves-list::-webkit-scrollbar-thumb { background: var(--color-ink); border: 1px solid var(--color-bg-alt); }
        .cgb-move-row { display: flex; align-items: center; gap: 0; padding: 2px 0; line-height: 1.4; }
        .cgb-move-row:nth-child(even) { background: var(--color-surface); }
        .cgb-move-num { font-family: var(--font-display); font-size: var(--font-size-xs); font-weight: 700; color: var(--color-muted); min-width: 32px; text-align: right; padding-right: var(--space-2); }
        .cgb-move-san { flex: 1; font-weight: 600; color: var(--color-ink); cursor: default; }
        .cgb-move-san:last-child { padding-left: var(--space-4); }
        .cgb-move-san.active-move { background: var(--color-green); color: var(--color-white); padding: 0 4px; margin: 0 -4px; }
        .cgb-moves-empty { padding: var(--space-4) var(--space-3); text-align: center; font-family: var(--font-ui); font-size: var(--font-size-xs); color: var(--color-muted); }
        .cgb-move-count { font-family: var(--font-display); font-size: 10px; color: var(--color-muted); padding: var(--space-1) var(--space-3) var(--space-2); border-top: var(--border-thin); text-align: right; }
        @media (max-width: 640px) {
          .cgb-title { font-size: var(--font-size-xl); }
          .cgb-board-wrap { padding: var(--space-2); }
          .cgb-game-bar { justify-content: center; gap: var(--space-4); }
          .cgb-gameover-box { padding: var(--space-5) var(--space-4); }
          .cgb-gameover-result { font-size: var(--font-size-2xl); }
          .cgb-gameover-crown, .cgb-gameover-icon { font-size: 44px; }
        }
        @media (max-width: 400px) {
          .cgb-eval-badge { font-size: 10px; padding: 2px 6px; }
          .cgb-check-badge { font-size: 10px; padding: 2px 8px; }
          .cgb-moves-card { max-height: 240px; }
        }
      `}</style>

      {confirmAction && (
        <div className="cgb-confirm-overlay" onClick={() => setConfirmAction(null)}>
          <div className="cgb-confirm-box" onClick={(e) => e.stopPropagation()}>
            <div className="cgb-confirm-title">
              {confirmAction === 'resign' ? 'Resign Game?' : 'Offer Draw?'}
            </div>
            <div className="cgb-confirm-text">
              {confirmAction === 'resign'
                ? 'Are you sure you want to resign? This will count as a loss.'
                : 'Are you sure you want to offer a draw? The game will end as a draw.'}
            </div>
            <div className="cgb-confirm-btns">
              <Button variant="outline" onClick={() => setConfirmAction(null)}>CANCEL</Button>
              <Button variant={confirmAction === 'resign' ? 'danger' : 'primary'} onClick={confirmAction === 'resign' ? handleResignConfirm : handleDrawConfirm}>
                {confirmAction === 'resign' ? 'RESIGN' : 'OFFER DRAW'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {gameOver && gameResult && (
        <div className="cgb-gameover-overlay" onClick={(e) => e.stopPropagation()}>
          <div className={`cgb-gameover-box ${gameResult.winner === 'player' ? 'win' : gameResult.winner === 'opponent' ? 'loss' : 'draw-result'}`}>
            {gameResult.winner === 'player' && (
              <div className="cgb-confetti">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="cgb-confetti-piece" style={{
                    left: `${Math.random() * 100}%`, top: `${-10 + Math.random() * 20}%`,
                    backgroundColor: ['#1A6B3A', '#D4A017', '#C0392B', '#fff', '#4CAF70'][i % 5],
                    animationDelay: `${Math.random() * 1.5}s`, animationDuration: `${2 + Math.random() * 1.5}s`,
                    borderRadius: i % 3 === 0 ? '50%' : '2px', transform: `rotate(${Math.random() * 360}deg)`,
                  }} />
                ))}
              </div>
            )}
            {gameResult.winner === 'player' && <div className="cgb-gameover-crown">👑</div>}
            {gameResult.winner === 'opponent' && <div className="cgb-gameover-icon">⚔️</div>}
            {gameResult.winner === null && <div className="cgb-gameover-icon">🤝</div>}
            <div className={`cgb-gameover-result ${gameResult.winner === 'player' ? 'win-text' : gameResult.winner === 'opponent' ? 'loss-text' : 'draw-text'}`}>
              {gameResult.winner === 'player' ? 'YOU WIN!' : gameResult.winner === 'opponent' ? 'YOU LOSE' : 'DRAW'}
            </div>
            <div className="cgb-gameover-subtitle">
              {gameResult.type === 'checkmate' ? 'by Checkmate' : gameResult.type === 'stalemate' ? 'by Stalemate' : gameResult.type === 'resignation' ? 'by Resignation' : 'by Agreement'}
            </div>
            <div className="cgb-gameover-stats">
              <div className="cgb-gameover-stat">
                <div className="cgb-gameover-stat-label">Moves</div>
                <div className="cgb-gameover-stat-value">{Math.ceil(game.history().length / 2)}</div>
              </div>
              <div className="cgb-gameover-stat">
                <div className="cgb-gameover-stat-label">You</div>
                <div className="cgb-gameover-stat-value">{playerPieceColor}</div>
              </div>
            </div>
            <div className="cgb-gameover-btns">
              <Button onClick={onNewGame}>PLAY AGAIN</Button>
              {onReview && <Button variant="outline" onClick={onReview}>REVIEW</Button>}
            </div>
          </div>
        </div>
      )}

      <h1 className="cgb-title">{title}</h1>

      {gameStarted && (
        <div className={`cgb-game-bar ${gameOver ? 'cgb-game-over-bar' : ''}`}>
          <div className="cgb-game-bar-item">
            <span className={`cgb-turn-dot ${isWhitesTurn ? 'white' : 'black'}`}></span>
            {gameOver ? 'GAME OVER' : `${currentPlayerLabel}'s Turn`}
          </div>
          <div className="cgb-game-bar-item">
            {isPlayerTurn && !gameOver && <span style={{ color: 'var(--color-green-light)' }}>YOUR MOVE</span>}
            {!isPlayerTurn && !gameOver && <span className="cgb-thinking" style={{ color: 'var(--color-warning)' }}>{isOpponentThinking ? 'THINKING' : 'OPPONENT'}</span>}
            {gameOver && <span style={{ color: 'var(--color-green-pale)' }}>{status}</span>}
          </div>
          <div className="cgb-game-bar-item">
            <span>{playerPieceColor} vs {opponentName}</span>
          </div>
        </div>
      )}

      <div className="cgb-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div className="cgb-captured-row">
            <span className="cgb-captured-label">{opponentPieceColor}:</span>
            <div className="cgb-captured">
              {capturedPieces.black.length === 0 && <span style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-ui)', fontSize: 'var(--font-size-xs)' }}>None</span>}
              {capturedPieces.black.map((p, i) => (
                <span key={`b${i}`} style={{ opacity: 0.9 }}>{PIECE_UNICODE[`b${p.toUpperCase()}`]}</span>
              ))}
            </div>
          </div>

          <Card className="cgb-board-wrap">
            {showEval && <div className="cgb-eval-badge">Eval: {playerColor === 'w' ? evalScore : -evalScore}</div>}
            {isCheck && !gameOver && <div className="cgb-check-badge">CHECK!</div>}
            <div ref={boardContainerRef} style={{ width: '100%', maxWidth: 480 }}>
              <div style={{ width: boardSize, height: boardSize }}>
                <Chessboard
                  options={{
                    position: game.fen(),
                    onPieceDrop: handlePieceDrop,
                    onPieceClick: handlePieceClick,
                    onSquareClick: handleSquareClick,
                    boardOrientation: playerColor === 'w' ? 'white' : 'black',
                    darkSquareStyle: { backgroundColor: '#1A6B3A' },
                    lightSquareStyle: { backgroundColor: '#EDEADE' },
                    squareStyles: squareStyles,
                  }}
                />
              </div>
            </div>
          </Card>

          <div className="cgb-captured-row">
            <span className="cgb-captured-label">{playerPieceColor}:</span>
            <div className="cgb-captured">
              {capturedPieces.white.length === 0 && <span style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-ui)', fontSize: 'var(--font-size-xs)' }}>None</span>}
              {capturedPieces.white.map((p, i) => (
                <span key={`w${i}`} style={{ opacity: 0.9 }}>{PIECE_UNICODE[`w${p.toUpperCase()}`]}</span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {settingsContent && (
            <Card style={{ padding: 'var(--space-4)' }}>
              <h2 className="cgb-settings-title">Match Settings</h2>
              {settingsContent}
            </Card>
          )}

          {extraSidebarContent}

          {gameStarted && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div className={`cgb-player-label ${isPlayerTurn && !gameOver ? 'active' : 'inactive'}`}>
                <span className={`cgb-turn-dot ${playerColor === 'w' ? 'white' : 'black'}`}></span>
                You ({playerPieceColor})
                {isCheck && !gameOver && <span style={{ marginLeft: 'auto', color: '#C0392B', fontSize: '10px' }}>IN CHECK</span>}
                {isPlayerTurn && !gameOver && !isCheck && <span style={{ marginLeft: 'auto', color: 'var(--color-green-light)' }}>&#9654;</span>}
              </div>
              <div className={`cgb-player-label ${!isPlayerTurn && !gameOver ? 'active' : 'inactive'}`}>
                <span className={`cgb-turn-dot ${playerColor === 'w' ? 'black' : 'white'}`}></span>
                {opponentName} ({opponentPieceColor})
                {!isPlayerTurn && !gameOver && (
                  <span className="cgb-thinking" style={{ marginLeft: 'auto', color: 'var(--color-warning)' }}>&#9654;</span>
                )}
              </div>
            </div>
          )}

          <div className="cgb-status-card">
            <div className="cgb-status-label">Status</div>
            <div className="cgb-status-text">{status}</div>
          </div>

          {gameStarted && (
            <div className="cgb-moves-card">
              <div className="cgb-moves-title">Move History</div>
              <div className="cgb-moves-list" ref={movesListRef}>
                {game.history().length === 0 && <div className="cgb-moves-empty">No moves yet</div>}
                {(() => {
                  const history = game.history();
                  const rows = [];
                  for (let i = 0; i < history.length; i += 2) {
                    const moveNum = Math.floor(i / 2) + 1;
                    rows.push(
                      <div key={moveNum} className="cgb-move-row">
                        <span className="cgb-move-num">{moveNum}.</span>
                        <span className={`cgb-move-san ${i === history.length - 1 ? 'active-move' : ''}`}>{history[i]}</span>
                        {history[i + 1] && (
                          <span className={`cgb-move-san ${i + 1 === history.length - 1 ? 'active-move' : ''}`}>{history[i + 1]}</span>
                        )}
                      </div>
                    );
                  }
                  return rows;
                })()}
              </div>
              {game.history().length > 0 && <div className="cgb-move-count">Move {Math.ceil(game.history().length / 2)}</div>}
            </div>
          )}

          {gameStarted && !gameOver && (
            <div className="cgb-action-btns">
              {onUndo && <Button variant="outline" onClick={onUndo} disabled={undoDisabled}>UNDO MOVE</Button>}
              {onDraw && <Button variant="outline" onClick={() => setConfirmAction('draw')}>OFFER DRAW</Button>}
              {onResign && <Button variant="danger" onClick={() => setConfirmAction('resign')}>RESIGN</Button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
