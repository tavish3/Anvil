const ApiError = require('../utils/ApiError');
const validateRequest = (schema, target = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[target]);
  if (!result.success) {
    const errors = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(new ApiError(400, 'Validation failed', errors));
  }
  req.validated = { ...(req.validated || {}), [target]: result.data };   // do NOT assign req.query
  next();
};
module.exports = validateRequest;
