const { z } = require('zod');

const jobTypeEnum = z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'], {
  errorMap: () => ({ message: 'Job type must be FULL_TIME, PART_TIME, CONTRACT, or INTERNSHIP' })
});

const locationTypeEnum = z.enum(['REMOTE', 'ONSITE', 'HYBRID'], {
  errorMap: () => ({ message: 'Location type must be REMOTE, ONSITE, or HYBRID' })
});

const baseJobSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  location: z.string().min(1, 'Location is required').optional(),
  locationType: locationTypeEnum.optional(),
  jobType: jobTypeEnum.optional(),
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  skills: z.array(z.string()).optional(),
  deadline: z.string().optional().transform(val => val ? new Date(val) : null)
});

const createJobSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  location: z.string().min(1, 'Location is required'),
  locationType: locationTypeEnum,
  jobType: jobTypeEnum,
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  skills: z.array(z.string()).optional(),
  deadline: z.string().optional().transform(val => val ? new Date(val) : null)
}).refine(data => {
  if (data.salaryMin && data.salaryMax && data.salaryMin > data.salaryMax) {
    return false;
  }
  return true;
}, {
  message: 'salaryMin must be less than or equal to salaryMax'
});

const updateJobSchema = baseJobSchema.refine(data => {
  if (data.salaryMin && data.salaryMax && data.salaryMin > data.salaryMax) {
    return false;
  }
  return true;
}, {
  message: 'salaryMin must be less than or equal to salaryMax'
});

const jobQuerySchema = z.object({
  q: z.string().optional(),
  location: z.string().optional(),
  locationType: locationTypeEnum.optional(),
  jobType: jobTypeEnum.optional(),
  salaryMin: z.coerce.number().int().positive().optional(),
  salaryMax: z.coerce.number().int().positive().optional(),
  sortBy: z.enum(['newest', 'salaryAsc', 'salaryDesc']).default('newest'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10)
});

module.exports = {
  createJobSchema,
  updateJobSchema,
  jobQuerySchema
};
