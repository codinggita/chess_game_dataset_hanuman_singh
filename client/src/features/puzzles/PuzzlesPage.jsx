import React, { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import ChessGameBoard from '../../components/chess/ChessGameBoard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const DUMMY_PUZZLES = [
  {
    id: 1,
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    solution: ['h5f7'],
    rating: 800,
    theme: 'Mate in 1',
  },
  {
    id: 2,
    fen: '8/8/8/8/4k3/4p3/4Q3/4K3 w - - 0 1',
    solution: ['e2c4', 'e4f3', 'c4e2'],
    rating: 1200,
    theme: 'Perpetual Check',
  },
  {
    id: 3,
    fen: 'r1bqkbnr/pppppppp/2n5/4P3/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2',
    solution: ['c6e5'],
    rating: 900,
    theme: 'Hanging Piece',
  },
  {
    id: 4,
    fen: '2k5/2p5/1K6/8/8/8/8/4R3 w - - 0 1',
    solution: ['e1e8'],
    rating: 1000,
    theme: 'Back Rank Mate',
  },
  {
    id: 5,
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    solution: ['f3g5'],
    rating: 1100,
    theme: 'Fork',
  },
];

export default function PuzzlesPage() {
  const [game, setGame] = useState(new Chess());
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [moveIndex, setMoveIndex] = useState(0);
  const [status, setStatus] = useState('Solve the puzzle! Find the best move.');
  const [streak, setStreak] = useState(0);
  const [solved, setSolved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState(null);

  const puzzle = DUMMY_PUZZLES[puzzleIndex];

  useEffect(() => {
    loadPuzzle();
  }, [puzzleIndex]);

  const loadPuzzle = () => {
    setGame(new Chess(DUMMY_PUZZLES[puzzleIndex].fen));
    setMoveIndex(0);
    setStatus('Solve the puzzle! Find the best move.');
    setSolved(false);
    setFailed(false);
    setGameOver(false);
    setGameResult(null);
  };

  const nextPuzzle = () => {
    setPuzzleIndex((i) => (i + 1) % DUMMY_PUZZLES.length);
  };

  const handleMove = useCallback((sourceSquare, targetSquare) => {
    const newGame = new Chess(game.fen());
    try {
      const move = newGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      if (move === null) return false;

      const userMoveStr = move.from + move.to;
      const expectedMoveStr = puzzle.solution[moveIndex];

      if (userMoveStr === expectedMoveStr) {
        setGame(newGame);

        if (moveIndex + 1 >= puzzle.solution.length) {
          setStatus('Puzzle Solved! Great job.');
          setSolved(true);
          setStreak((s) => s + 1);
          setGameOver(true);
          setGameResult({ type: 'checkmate', winner: 'player' });
          setTimeout(nextPuzzle, 2000);
        } else {
          setStatus('Correct! Waiting for opponent response...');
          setMoveIndex((i) => i + 1);

          setTimeout(() => {
            const oppMoveStr = puzzle.solution[moveIndex + 1];
            if (oppMoveStr) {
              const oppGame = new Chess(newGame.fen());
              const oppResult = oppGame.move({
                from: oppMoveStr.substring(0, 2),
                to: oppMoveStr.substring(2, 4),
                promotion: 'q',
              });
              if (oppResult) {
                setGame(oppGame);
                setMoveIndex((i) => i + 2);
                setStatus('Your turn! Find the best move.');
              }
            }
          }, 500);
        }
        return true;
      } else {
        setStatus('Incorrect move. Try again!');
        setStreak(0);
        setFailed(true);
        return false;
      }
    } catch (e) {
      return false;
    }
  }, [game, moveIndex, puzzle]);

  const settingsContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div>
        <label className="cgb-label">Rating</label>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-ink)' }}>{puzzle.rating}</div>
      </div>
      <div>
        <label className="cgb-label">Theme</label>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--color-ink)' }}>{puzzle.theme}</div>
      </div>
      <div className="cgb-action-btns">
        <Button onClick={loadPuzzle}>RETRY PUZZLE</Button>
        <Button variant="outline" onClick={nextPuzzle}>SKIP PUZZLE</Button>
      </div>
    </div>
  );

  return (
    <ChessGameBoard
      title="Puzzles"
      game={game}
      onMove={handleMove}
      status={status}
      gameStarted={true}
      gameOver={gameOver}
      playerColor="w"
      opponentName="Puzzle"
      gameResult={gameResult}
      onNewGame={loadPuzzle}
      onReview={() => { setGameOver(false); setGameResult(null); }}
      settingsContent={settingsContent}
      extraSidebarContent={
        <Card style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-muted)', marginBottom: 'var(--space-1)', fontWeight: 700 }}>Streak</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--font-size-3xl)', fontWeight: 700, color: streak > 0 ? 'var(--color-green)' : 'var(--color-ink)' }}>{streak}</div>
        </Card>
      }
    />
  );
}
