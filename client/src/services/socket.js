import { io } from 'socket.io-client';

// Socket.IO server origin (no /api/v1 suffix). Mirrors api.js base resolution.
const SOCKET_ORIGIN = import.meta.env.DEV
  ? 'http://localhost:5000'
  : (import.meta.env.VITE_API_BASE_URL || 'https://chess-dataset.onrender.com').replace(/\/api\/v1\/?$/, '');

/**
 * Connect to a Socket.IO namespace with the stored auth token attached.
 * @param {string} namespace e.g. '/game', '/matchmaking'
 */
export const connectSocket = (namespace = '/') => {
  const token = localStorage.getItem('chess_auth_token');
  return io(`${SOCKET_ORIGIN}${namespace}`, { auth: { token } });
};

export { SOCKET_ORIGIN };
