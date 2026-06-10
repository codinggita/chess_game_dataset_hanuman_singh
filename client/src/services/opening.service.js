import api from './api.js';

export const openingService = {
  getAll: (params) => {
    if (params && params.q) return api.get('/openings/search', { params });
    return api.get('/openings', { params });
  },
  getById: (id) => api.get(`/openings/${id}`),
};
