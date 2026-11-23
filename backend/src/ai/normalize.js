const { FIT_BANDS, LIST_LIMITS } = require('./constants');

const LOCATION_TYPES = ['REMOTE', 'ONSITE', 'HYBRID'];
const JOB_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'];
const EXPERIENCE_LEVELS = ['INTERN', 'ENTRY', 'MID', 'SENIOR', 'LEAD', 'UNSPECIFIED'];
const TIP_SECTIONS = ['SUMMARY', 'SKILLS', 'EXPERIENCE', 'EDUCATION', 'PROJECTS', 'FORMATTING', 'OTHER'];
const TIP_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];

function normalizeList(arr, { max, maxLen = 160 } = {}) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed.slice(0, maxLen));
    if (out.length >= max) break;
  }
  return out;
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeJobInsights(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const h = r.highlights && typeof r.highlights === 'object' ? r.highlights : {};
  return {
    summary: asString(r.summary).slice(0, 400),
    highlights: {
      experienceLevel: EXPERIENCE_LEVELS.includes(h.experienceLevel) ? h.experienceLevel : 'UNSPECIFIED',
      responsibilities: normalizeList(h.responsibilities, { max: LIST_LIMITS.RESPONSIBILITIES }),
      requirements: normalizeList(h.requirements, { max: LIST_LIMITS.REQUIREMENTS }),
      niceToHave: normalizeList(h.niceToHave, { max: LIST_LIMITS.NICE_TO_HAVE }),
      perks: normalizeList(h.perks, { max: LIST_LIMITS.PERKS }),
    },
  };
}

function normalizeSalary(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function normalizeSearchQuery(raw, originalQuery) {
  const r = raw && typeof raw === 'object' ? raw : {};

  let semanticQuery = asString(r.semanticQuery).slice(0, 200);
  if (!semanticQuery) {
    semanticQuery = asString(originalQuery).slice(0, 200);
  }

  const locationRaw = asString(r.location).slice(0, 80);
  const location = locationRaw && locationRaw.toLowerCase() !== 'remote' ? locationRaw : null;

  let salaryMin = normalizeSalary(r.salaryMin);
  let salaryMax = normalizeSalary(r.salaryMax);
  if (salaryMin != null && salaryMax != null && salaryMin > salaryMax) {
    [salaryMin, salaryMax] = [salaryMax, salaryMin];
  }

  return {
    semanticQuery,
    filters: {
      locationType: LOCATION_TYPES.includes(r.locationType) ? r.locationType : null,
      jobType: JOB_TYPES.includes(r.jobType) ? r.jobType : null,
      location,
      salaryMin,
      salaryMax,
    },
  };
}

function clampYears(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(60, Math.max(0, n));
}

function normalizeRole(role) {
  if (!role || typeof role !== 'object') return null;
  const title = asString(role.title);
  if (!title) return null;
  return {
    title,
    company: asString(role.company) || null,
    years: clampYears(role.years),
    highlights: normalizeList(role.highlights, { max: LIST_LIMITS.ROLE_HIGHLIGHTS }),
  };
}

function normalizeEducation(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const degree = asString(entry.degree);
  if (!degree) return null;
  return {
    degree,
    institution: asString(entry.institution) || null,
    year: asString(entry.year) || null,
  };
}

function normalizeResumeProfile(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    headline: asString(r.headline) || null,
    summary: asString(r.summary),
    skills: normalizeList(r.skills, { max: LIST_LIMITS.SKILLS }),
    totalYearsExperience: clampYears(r.totalYearsExperience),
    roles: (Array.isArray(r.roles) ? r.roles : [])
      .slice(0, LIST_LIMITS.ROLES)
      .map(normalizeRole)
      .filter(Boolean),
    education: (Array.isArray(r.education) ? r.education : [])
      .slice(0, LIST_LIMITS.EDUCATION)
      .map(normalizeEducation)
      .filter(Boolean),
    certifications: normalizeList(r.certifications, { max: LIST_LIMITS.CERTIFICATIONS }),
  };
}

function scoreToVerdict(score) {
  if (score >= FIT_BANDS.STRONG_FIT) return 'STRONG_FIT';
  if (score >= FIT_BANDS.GOOD_FIT) return 'GOOD_FIT';
  if (score >= FIT_BANDS.PARTIAL_FIT) return 'PARTIAL_FIT';
  return 'WEAK_FIT';
}

function normalizeFitAnalysis(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const n = Number(r.score);
  const score = Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 0;
  return {
    score,
    verdict: scoreToVerdict(score),
    summary: asString(r.summary),
    matchedSkills: normalizeList(r.matchedSkills, { max: LIST_LIMITS.MATCHED_SKILLS }),
    missingSkills: normalizeList(r.missingSkills, { max: LIST_LIMITS.MISSING_SKILLS }),
    strengths: normalizeList(r.strengths, { max: LIST_LIMITS.STRENGTHS }),
    gaps: normalizeList(r.gaps, { max: LIST_LIMITS.GAPS }),
    recommendation: asString(r.recommendation),
  };
}

function normalizeTip(tip) {
  if (!tip || typeof tip !== 'object') return null;
  if (!TIP_SECTIONS.includes(tip.section) || !TIP_PRIORITIES.includes(tip.priority)) return null;
  const suggestion = asString(tip.suggestion);
  if (!suggestion) return null;
  return {
    section: tip.section,
    priority: tip.priority,
    suggestion,
    reason: asString(tip.reason),
  };
}

function normalizeTips(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    summary: asString(r.summary).slice(0, 400),
    tips: (Array.isArray(r.tips) ? r.tips : [])
      .slice(0, LIST_LIMITS.TIPS)
      .map(normalizeTip)
      .filter(Boolean),
    keywordsToConsider: normalizeList(r.keywordsToConsider, { max: LIST_LIMITS.KEYWORDS }),
  };
}

module.exports = {
  normalizeList,
  normalizeJobInsights,
  normalizeSearchQuery,
  normalizeResumeProfile,
  normalizeFitAnalysis,
  scoreToVerdict,
  normalizeTips,
};
