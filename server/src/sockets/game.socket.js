const { Chess } = require('chess.js');
const Match = require('../models/Match');

// In-memory active games, keyed by roomId
const activeGames = new Map();

const COLOR_BY_TURN = { w: 'white', b: 'black' };

const publicState = (room) => ({
  fen: room.chess.fen(),
  pgn: room.chess.pgn(),
  turn: COLOR_BY_TURN[room.chess.turn()],
  whiteName: room.players.white?.name || null,
  blackName: room.players.black?.name || null,
  started: Boolean(room.players.white && room.players.black),
});

const persistMatch = (roomId, room, winner, victory_status) => {
  // roomId isn't guaranteed unique across sessions; suffix it so replays of the
  // same room don't collide on the unique `id` index.
  const match = new Match({
    id: `${roomId}-${Date.now()}`,
    status: 'completed',
    pgn: room.chess.pgn(),
    fen: room.chess.fen(),
    winner,
    victory_status,
    white_id: room.players.white?.name || '',
    black_id: room.players.black?.name || '',
    turns: String(room.chess.history().length),
  });
  match.save().catch((err) => console.error('Failed to persist room match:', err.message));
};

const endGame = (namespace, roomId, room, { reason, winner }) => {
  if (room.over) return;
  room.over = true;
  namespace.to(roomId).emit('game_over', { reason, winner });
  persistMatch(roomId, room, winner, reason);
  activeGames.delete(roomId);
};

const setupGameSockets = (io, authMiddleware) => {
  const gameNamespace = io.of('/game');
  if (authMiddleware) gameNamespace.use(authMiddleware);

  gameNamespace.on('connection', (socket) => {
    const playerName = socket.user?.name || socket.user?.email || `guest-${socket.id.slice(0, 5)}`;

    socket.on('join_room', ({ roomId }) => {
      if (!roomId) return;
      roomId = String(roomId).trim().toUpperCase();

      let room = activeGames.get(roomId);
      if (!room) {
        room = {
          chess: new Chess(),
          players: { white: null, black: null },
          over: false,
        };
        activeGames.set(roomId, room);
      }

      // Reconnect: same user already has a seat
      let color = ['white', 'black'].find((c) => room.players[c]?.userId === String(socket.user?._id || ''));

      if (!color) {
        if (!room.players.white) color = 'white';
        else if (!room.players.black) color = 'black';
        else {
          socket.emit('room_full', { roomId });
          return;
        }
      }

      room.players[color] = { socketId: socket.id, name: playerName, userId: String(socket.user?._id || '') };
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.color = color;

      socket.emit('assigned', { roomId, color });

      const state = publicState(room);
      socket.emit('game_state', state);

      if (state.started) {
        gameNamespace.to(roomId).emit('game_start', publicState(room));
      } else {
        socket.emit('waiting_for_opponent', { roomId });
      }
    });

    socket.on('make_move', ({ roomId, move }) => {
      roomId = String(roomId || socket.data.roomId || '').trim().toUpperCase();
      const room = activeGames.get(roomId);
      if (!room || room.over) return;

      const color = socket.data.color;
      if (!color) return;
      if (!room.players.white || !room.players.black) {
        socket.emit('invalid_move', { message: 'Waiting for opponent' });
        return;
      }
      // Enforce turn ownership — chess.js alone can't tell who is who.
      if (COLOR_BY_TURN[room.chess.turn()] !== color) {
        socket.emit('invalid_move', { message: 'Not your turn' });
        return;
      }

      let result;
      try {
        result = room.chess.move(move);
      } catch (err) {
        result = null;
      }
      if (!result) {
        socket.emit('invalid_move', { message: 'Illegal move' });
        return;
      }

      gameNamespace.to(roomId).emit('move_made', {
        fen: room.chess.fen(),
        pgn: room.chess.pgn(),
        turn: COLOR_BY_TURN[room.chess.turn()],
        move: result,
      });

      if (room.chess.isGameOver()) {
        let reason = 'draw';
        let winner = 'draw';
        if (room.chess.isCheckmate()) {
          reason = 'mate';
          // side to move has been mated
          winner = room.chess.turn() === 'w' ? 'black' : 'white';
        } else if (room.chess.isStalemate()) {
          reason = 'stalemate';
        }
        endGame(gameNamespace, roomId, room, { reason, winner });
      }
    });

    socket.on('resign', ({ roomId }) => {
      roomId = String(roomId || socket.data.roomId || '').trim().toUpperCase();
      const room = activeGames.get(roomId);
      if (!room || room.over) return;
      const color = socket.data.color;
      if (!color) return;
      const winner = color === 'white' ? 'black' : 'white';
      endGame(gameNamespace, roomId, room, { reason: 'resign', winner });
    });

    socket.on('offer_draw', ({ roomId }) => {
      roomId = String(roomId || socket.data.roomId || '').trim().toUpperCase();
      const room = activeGames.get(roomId);
      if (!room || room.over) return;
      socket.to(roomId).emit('draw_offered', { from: socket.data.color });
    });

    socket.on('draw_response', ({ roomId, accept }) => {
      roomId = String(roomId || socket.data.roomId || '').trim().toUpperCase();
      const room = activeGames.get(roomId);
      if (!room || room.over) return;
      if (accept) {
        endGame(gameNamespace, roomId, room, { reason: 'draw', winner: 'draw' });
      } else {
        socket.to(roomId).emit('draw_declined');
      }
    });

    socket.on('send_message', ({ roomId, message }) => {
      roomId = String(roomId || socket.data.roomId || '').trim().toUpperCase();
      gameNamespace.to(roomId).emit('receive_message', { message, sender: playerName });
    });

    socket.on('disconnect', () => {
      const roomId = socket.data.roomId;
      const color = socket.data.color;
      if (!roomId || !color) return;
      const room = activeGames.get(roomId);
      if (!room) return;

      if (room.players[color]?.socketId === socket.id) {
        room.players[color] = null;
      }
      socket.to(roomId).emit('opponent_left', { color });

      // If the game hadn't started, drop the empty room.
      if (!room.over && !room.players.white && !room.players.black) {
        activeGames.delete(roomId);
      }
    });
  });
};

module.exports = { setupGameSockets };
