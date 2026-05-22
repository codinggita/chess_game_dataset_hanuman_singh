const morgan = require('morgan');

/**
 * Custom logger middleware using morgan
 * Logs: :method :url :status :response-time ms - :res[content-length]
 */
const logger = morgan('dev');

module.exports = logger;
