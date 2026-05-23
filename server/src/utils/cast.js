/**
 * Utility for casting string-stored values from the dataset to proper types
 */

const castMove = (doc) => {
  if (!doc) return null;
  return {
    ...doc,
    turns: parseInt(doc.turns, 10),
    white_rating: parseInt(doc.white_rating, 10),
    black_rating: parseInt(doc.black_rating, 10),
    opening_ply: parseInt(doc.opening_ply, 10),
    rated: doc.rated === 'TRUE',
    created_at: new Date(parseFloat(doc.created_at)),
    last_move_at: new Date(parseFloat(doc.last_move_at)),
  };
};

/**
 * Derive time_class from increment_code (initialSeconds+incrementSeconds)
 */
const getTimeClass = (incrementCode) => {
  if (!incrementCode) return 'unknown';
  const initial = parseInt(incrementCode.split('+')[0], 10);
  
  if (initial < 180) return 'bullet';
  if (initial < 600) return 'blitz';
  if (initial < 1800) return 'rapid';
  return 'classical';
};

module.exports = {
  castMove,
  getTimeClass,
};
