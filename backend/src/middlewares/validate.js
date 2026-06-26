const ApiError = require('../utils/ApiError');

const validate = (schema, target = 'body') => {
  return (req, res, next) => {
    const dataToValidate = target === 'query' ? req.query : req.body;
    const result = schema.safeParse(dataToValidate);

    if (!result.success) {
      const errors = result.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      return next(new ApiError(400, 'Validation failed', errors));
    }

    if (target === 'query') {
      req.query = result.data;
    } else {
      req.body = result.data;
    }
    next();
  };
};

module.exports = validate;
