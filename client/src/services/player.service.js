import api from './api.js';

export const playerService = {
  getAll: (params) => api.get('/players', { params }),
  getById: (id) => api.get(`/players/${id}`),
};
