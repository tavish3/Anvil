const { z } = require('zod');

const applicationStatusEnum = z.enum(['APPLIED', 'REVIEWING', 'INTERVIEW', 'OFFERED', 'REJECTED'], {
  errorMap: () => ({ message: 'Status must be APPLIED, REVIEWING, INTERVIEW, OFFERED, or REJECTED' })
});

const updateApplicationStatusSchema = z.object({
  status: applicationStatusEnum
});

module.exports = {
  updateApplicationStatusSchema
};
