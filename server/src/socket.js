const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const { setupGameSockets } = require('./sockets/game.socket');
const { setupMatchmakingSockets } = require('./sockets/matchmaking.socket');

let io;

// Shared handshake auth. `io.use()` only guards the main namespace in Socket.IO
// v4, so this is also attached to each child namespace (/game, /matchmaking)
// that relies on `socket.user`.
const authMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error: No token provided'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // tokens are signed as { userId } (see auth.service.js)
    const user = await User.findById(decoded.userId || decoded.id).select('-password');
    if (!user) return next(new Error('Authentication error: User not found'));

    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
};

const initSocket = (server, pubClient, subClient) => {
  io = new Server(server, {
    cors: {
      origin: '*', // Adjust in production
      methods: ['GET', 'POST']
    }
  });

  // Defensive Redis adapter setup
  if (pubClient && subClient) {
    try {
      io.adapter(createAdapter(pubClient, subClient));
      console.log('Socket.IO Redis Adapter configured.');
    } catch (err) {
      console.warn('Socket.IO Redis Adapter failed to initialize, falling back to Memory Adapter.');
    }
  }

  // Authentication Middleware (main namespace)
  io.use(authMiddleware);

  // Global Connection Handler
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.id})`);

    // Basic Online Presence
    socket.join('global');

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.name} (${socket.id})`);
    });
  });

  setupGameSockets(io, authMiddleware);
  setupMatchmakingSockets(io, authMiddleware);

  return io;
};

const getIo = () => {
  if (!io) throw new Error('Socket.IO has not been initialized!');
  return io;
};

module.exports = { initSocket, getIo };
