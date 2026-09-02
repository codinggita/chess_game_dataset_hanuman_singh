// `redisClient` in cache.js is (re)assigned after connectRedis() resolves, so
// read it lazily through the module object rather than destructuring at load.
const cache = require('../utils/cache');
const { v4: uuidv4 } = require('uuid');

const getRedis = () => cache.redisClient;

// userId -> Set of live matchmaking socket ids, so a found match notifies only
// the two players involved rather than everyone connected.
const userSockets = new Map();

const addUserSocket = (userId, socketId) => {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(socketId);
};

const removeUserSocket = (userId, socketId) => {
  const set = userSockets.get(userId);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) userSockets.delete(userId);
};

const emitToUser = (mmNamespace, userId, event, payload) => {
  const set = userSockets.get(userId);
  if (!set) return;
  for (const socketId of set) {
    mmNamespace.to(socketId).emit(event, payload);
  }
};

const setupMatchmakingSockets = (io, authMiddleware) => {
  const mmNamespace = io.of('/matchmaking');
  if (authMiddleware) mmNamespace.use(authMiddleware);

  mmNamespace.on('connection', (socket) => {
    const userId = socket.user?._id?.toString();
    if (!userId) {
      socket.emit('queue_error', { message: 'Not authenticated' });
      socket.disconnect(true);
      return;
    }
    addUserSocket(userId, socket.id);
    socket.data.queues = new Set();

    socket.on('join_queue', async ({ mode, rating }) => {
      if (!getRedis()) {
        socket.emit('queue_error', { message: 'Matchmaking is currently unavailable' });
        return;
      }

      const queueKey = `queue:${mode}`;
      await getRedis().zAdd(queueKey, { score: Number(rating) || 1200, value: userId });
      socket.data.queues.add(queueKey);
      socket.join(queueKey);
      socket.emit('queue_joined', { mode });

      matchPlayers(mmNamespace, queueKey);
    });

    socket.on('leave_queue', async ({ mode }) => {
      if (!getRedis()) return;
      const queueKey = `queue:${mode}`;
      await getRedis().zRem(queueKey, userId);
      socket.data.queues.delete(queueKey);
      socket.leave(queueKey);
      socket.emit('queue_left');
    });

    socket.on('disconnect', async () => {
      removeUserSocket(userId, socket.id);
      if (!getRedis()) return;
      for (const queueKey of socket.data.queues) {
        await getRedis().zRem(queueKey, userId);
      }
    });
  });
};

const matchPlayers = async (mmNamespace, queueKey) => {
  if (!getRedis()) return;

  const players = await getRedis().zRangeWithScores(queueKey, 0, -1);

  for (let i = 0; i < players.length - 1; i++) {
    const p1 = players[i];
    const p2 = players[i + 1];

    if (Math.abs(p1.score - p2.score) <= 100) {
      const roomId = uuidv4().split('-')[0].toUpperCase();

      // Remove both atomically-ish before notifying, so a third check can't re-pair them.
      const removed = await getRedis().zRem(queueKey, [p1.value, p2.value]);
      if (removed < 2) continue;

      emitToUser(mmNamespace, p1.value, 'match_found', { roomId, color: 'white', opponent: p2.value });
      emitToUser(mmNamespace, p2.value, 'match_found', { roomId, color: 'black', opponent: p1.value });

      i++; // skip the player we just paired
    }
  }
};

module.exports = { setupMatchmakingSockets };
