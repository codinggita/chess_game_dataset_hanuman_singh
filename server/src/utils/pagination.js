const paginate = (query = {}, page = 1, limit = 10) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  return { skip, limit: limitNum, page: pageNum, meta: { page: pageNum, limit: limitNum } };
};

const buildSort = (sortStr, defaultSort = { created_at: -1 }) => {
  if (!sortStr) return defaultSort;
  const sort = {};
  sortStr.split(',').forEach(field => {
    field.startsWith('-') ? sort[field.slice(1)] = -1 : sort[field] = 1;
  });
  return sort;
};

module.exports = { paginate, buildSort };
