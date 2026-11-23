const { z } = require('zod');

const JobInsightsSchema = z.object({
  summary: z.string().describe('2-3 factual sentences, max 60 words'),
  experienceLevel: z.enum(['INTERN', 'ENTRY', 'MID', 'SENIOR', 'LEAD', 'UNSPECIFIED']),
  responsibilities: z.array(z.string()).describe('3-6 short phrases'),
  requirements: z.array(z.string()).describe('up to 6 short phrases'),
  niceToHave: z.array(z.string()).describe('up to 4 short phrases'),
  perks: z.array(z.string()).describe('up to 4 short phrases'),
});

const SearchQuerySchema = z.object({
  semanticQuery: z.string(),
  locationType: z.enum(['REMOTE', 'ONSITE', 'HYBRID']).nullable(),
  jobType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']).nullable(),
  location: z.string().nullable(),
  salaryMin: z.number().nullable().describe('annual INR'),
  salaryMax: z.number().nullable().describe('annual INR'),
});

const ResumeProfileSchema = z.object({
  headline: z.string().nullable(),
  summary: z.string(),
  skills: z.array(z.string()),
  totalYearsExperience: z.number().nullable(),
  roles: z.array(z.object({
    title: z.string(),
    company: z.string().nullable(),
    years: z.number().nullable(),
    highlights: z.array(z.string()),
  })),
  education: z.array(z.object({
    degree: z.string(),
    institution: z.string().nullable(),
    year: z.string().nullable(),
  })),
  certifications: z.array(z.string()),
});

const FitAnalysisSchema = z.object({
  score: z.number().describe('integer 0-100'),
  summary: z.string(),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  recommendation: z.string(),
});

const CritiqueSchema = z.object({
  passed: z.boolean(),
  unsupportedClaims: z.array(z.string()),
  issues: z.array(z.string()),
});

const ResumeTipsSchema = z.object({
  summary: z.string(),
  tips: z.array(z.object({
    section: z.enum(['SUMMARY', 'SKILLS', 'EXPERIENCE', 'EDUCATION', 'PROJECTS', 'FORMATTING', 'OTHER']),
    priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    suggestion: z.string(),
    reason: z.string(),
  })),
  keywordsToConsider: z.array(z.string()),
});

module.exports = {
  JobInsightsSchema,
  SearchQuerySchema,
  ResumeProfileSchema,
  FitAnalysisSchema,
  CritiqueSchema,
  ResumeTipsSchema,
};
