const { z } = require('zod');

const updateNameSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters')
});

module.exports = {
  updateNameSchema
};
