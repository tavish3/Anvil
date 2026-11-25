const { z } = require('zod');
const { SEARCH_QUERY_MIN_CHARS, SEARCH_QUERY_MAX_CHARS } = require('../../ai/constants');

const similarQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10).default(5)
});

const searchQuerySchema = z.object({
  q: z.string().trim().min(SEARCH_QUERY_MIN_CHARS).max(SEARCH_QUERY_MAX_CHARS),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(10)
});

const recommendationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(10)
});

module.exports = { similarQuerySchema, searchQuerySchema, recommendationsQuerySchema };
