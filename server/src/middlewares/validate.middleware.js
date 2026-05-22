const { validationResult } = require('express-validator');
const apiResponse = require('../utils/apiResponse');

/**
 * Validates request body/params using express-validator results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return apiResponse.error(res, 'Validation failed', errors.array(), 400);
  }
  next();
};

module.exports = validate;
