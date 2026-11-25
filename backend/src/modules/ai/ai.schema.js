const { z } = require('zod');

const similarQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10).default(5)
});

module.exports = { similarQuerySchema };
