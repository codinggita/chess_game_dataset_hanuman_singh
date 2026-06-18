import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import { engineService } from '../../services/engineService';
import ChessGameBoard from '../../components/chess/ChessGameBoard';
import Button from '../../components/ui/Button';

export default function PlayAIPage() {
  const [game, setGame] = useState(new Chess());
  const [difficulty, setDifficulty] = useState(5);
  const [playerColor, setPlayerColor] = useState('w');
  const [status, setStatus] = useState('Select Difficulty & Color to Start');
  const [evalScore, setEvalScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const moveHistoryRef = useRef([]);
  const gameRef = useRef(game);
  const playerColorRef = useRef(playerColor);
  const difficultyRef = useRef(difficulty);
  const isAIThinkingRef = useRef(false);
  const gameStartedRef = useRef(false);
  const gameOverRef = useRef(false);

  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { playerColorRef.current = playerColor; }, [playerColor]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  useEffect(() => { gameStartedRef.current = gameStarted; }, [gameStarted]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

  const cloneGame = (g) => new Chess(g.fen());

  const makeAIMove = useCallback(() => {
    isAIThinkingRef.current = true;
    setIsAIThinking(true);
    setStatus('AI is thinking...');
    const currentGame = gameRef.current;
    engineService.findBestMove(currentGame.fen(), difficultyRef.current, 10, 500, {
      onBestMove: (moveStr) => {
        if (!moveStr || moveStr === '(none)') {
          isAIThinkingRef.current = false;
          setIsAIThinking(false);
          setStatus('Your Turn');
          return;
        }
        const move = { from: moveStr.substring(0, 2), to: moveStr.substring(2, 4), promotion: moveStr.length > 4 ? moveStr.substring(4, 5) : 'q' };
        const newGame = cloneGame(currentGame);
        const result = newGame.move(move);
        if (!result) {
          isAIThinkingRef.current = false;
          setIsAIThinking(false);
          setStatus('Your Turn');
          return;
        }
        moveHistoryRef.current.push(result.san);
        setMoveCount(moveHistoryRef.current.length);
        setGame(newGame);
        if (newGame.isGameOver()) {
          gameOverRef.current = true;
          setGameOver(true);
          if (newGame.isCheckmate()) { setGameResult({ type: 'checkmate', winner: 'ai' }); setStatus('Checkmate! AI Wins.'); }
          else if (newGame.isDraw()) { setGameResult({ type: 'draw', winner: null }); setStatus('Draw!'); }
          else if (newGame.isStalemate()) { setGameResult({ type: 'stalemate', winner: null }); setStatus('Stalemate! Draw.'); }
        } else {
          isAIThinkingRef.current = false;
          setIsAIThinking(false);
          setStatus(newGame.isCheck() ? 'Check! Your Turn' : 'Your Turn');
        }
      },
      onEval: (info) => { if (info.type === 'cp') setEvalScore(info.value / 100); }
    });
  }, []);

  const handleMove = useCallback((sourceSquare, targetSquare) => {
    if (gameRef.current.turn() !== playerColorRef.current) return false;
    if (isAIThinkingRef.current) return false;
    if (!gameStartedRef.current || gameOverRef.current) return false;
    const newGame = cloneGame(gameRef.current);
    try {
      const move = newGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      if (move === null) return false;
      moveHistoryRef.current.push(move.san);
      setMoveCount(moveHistoryRef.current.length);
      setGame(newGame);
      if (newGame.isGameOver()) {
        gameOverRef.current = true;
        setGameOver(true);
        if (newGame.isCheckmate()) { setGameResult({ type: 'checkmate', winner: 'player' }); setStatus('Checkmate! You Win!'); }
        else if (newGame.isDraw()) { setGameResult({ type: 'draw', winner: null }); setStatus('Draw!'); }
        else if (newGame.isStalemate()) { setGameResult({ type: 'stalemate', winner: null }); setStatus('Stalemate! Draw.'); }
      } else {
        setTimeout(makeAIMove, 300);
      }
      return true;
    } catch (e) { return false; }
  }, [makeAIMove]);

  const handleUndo = () => {
    if (!gameStarted || gameOver || isAIThinkingRef.current) return;
    if (moveHistoryRef.current.length < 2) return;
    moveHistoryRef.current.splice(-2, 2);
    const newGame = new Chess();
    for (const san of moveHistoryRef.current) newGame.move(san);
    setMoveCount(moveHistoryRef.current.length);
    setGame(newGame);
    setStatus('Your Turn');
  };

  const startNewGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setGameStarted(true);
    setGameOver(false);
    setGameResult(null);
    gameOverRef.current = false;
    isAIThinkingRef.current = false;
    setIsAIThinking(false);
    moveHistoryRef.current = [];
    setMoveCount(0);
    setStatus(playerColor === 'b' ? 'AI is thinking...' : 'Your Turn — Make a move');
    if (playerColor === 'b') {
      isAIThinkingRef.current = true;
      setIsAIThinking(true);
      setTimeout(makeAIMove, 300);
    }
  };

  const handleResign = () => {
    setGameOver(true);
    gameOverRef.current = true;
    const winner = playerColor === 'w' ? 'ai' : 'player';
    setGameResult({ type: 'resignation', winner: winner === 'ai' ? 'opponent' : 'player' });
    setStatus(`${playerColor === 'w' ? 'White' : 'Black'} resigned.`);
  };

  const handleDraw = () => {
    setGameOver(true);
    gameOverRef.current = true;
    setGameResult({ type: 'draw', winner: null });
    setStatus('Draw agreed.');
  };

  const settingsContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <style>{`
        .pai-range { -webkit-appearance: none; appearance: none; width: 100%; height: 8px; background: var(--color-surface); border: var(--border-thin); outline: none; cursor: pointer; }
        .pai-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 20px; height: 20px; background: var(--color-green); border: 3px solid var(--color-black); cursor: pointer; }
        .pai-range::-moz-range-thumb { width: 20px; height: 20px; background: var(--color-green); border: 3px solid var(--color-black); cursor: pointer; border-radius: 0; }
        .pai-range:focus { border-color: var(--color-green); box-shadow: var(--shadow-green); }
        .pai-range:disabled { opacity: 0.5; cursor: not-allowed; }
        .pai-difficulty-val { font-family: var(--font-display); font-size: var(--font-size-lg); font-weight: 700; color: var(--color-ink); text-align: right; margin-top: var(--space-1); }
      `}</style>
      <div>
        <label className="cgb-label">Color</label>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button variant={playerColor === 'w' ? 'primary' : 'outline'} onClick={() => setPlayerColor('w')} disabled={gameStarted && !gameOver} style={{ flex: 1, justifyContent: 'center' }}>White</Button>
          <Button variant={playerColor === 'b' ? 'primary' : 'outline'} onClick={() => setPlayerColor('b')} disabled={gameStarted && !gameOver} style={{ flex: 1, justifyContent: 'center' }}>Black</Button>
        </div>
      </div>
      <div>
        <label className="cgb-label">AI Difficulty (0-20)</label>
        <input type="range" min="0" max="20" value={difficulty} onChange={(e) => setDifficulty(parseInt(e.target.value))} disabled={gameStarted && !gameOver} className="pai-range" />
        <div className="pai-difficulty-val">{difficulty}</div>
      </div>
      <div className="cgb-action-btns">
        <Button onClick={startNewGame}>{gameStarted && !gameOver ? 'NEW GAME' : 'START GAME'}</Button>
      </div>
    </div>
  );

  return (
    <ChessGameBoard
      title="Play vs AI"
      game={game}
      onMove={handleMove}
      status={status}
      gameStarted={gameStarted}
      gameOver={gameOver}
      playerColor={playerColor}
      opponentName="AI"
      isOpponentThinking={isAIThinking}
      gameResult={gameResult}
      onResign={handleResign}
      onDraw={handleDraw}
      onUndo={handleUndo}
      onNewGame={startNewGame}
      onReview={() => { setGameOver(false); setGameResult(null); }}
      undoDisabled={!gameStarted || gameOver || isAIThinking || moveCount < 2}
      settingsContent={settingsContent}
      showEval={true}
      evalScore={evalScore}
    />
  );
}
