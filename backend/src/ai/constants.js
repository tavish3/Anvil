module.exports = {
  EMBEDDING_DIMENSIONS: 1536,
  EMBEDDING_INPUT_MAX_CHARS: 6000,   // ≈1.5k tokens: inside the limits of both Gemini embedding models
  JOB_DESCRIPTION_MAX_CHARS: 6000,
  RESUME_TEXT_MAX_CHARS: 20000,      // stored in DB
  RESUME_PROMPT_MAX_CHARS: 12000,    // sent to the LLM
  RESUME_EMBED_RAW_CHARS: 4000,      // raw excerpt appended to the resume embedding text
  RESUME_MIN_TEXT_CHARS: 200,        // below this the PDF is considered unreadable (scanned image)
  RESUME_MAX_PDF_PAGES: 8,           // only the first N pages are parsed
  PDF_PARSE_TIMEOUT_MS: 20000,
  SEARCH_QUERY_MIN_CHARS: 2,
  SEARCH_QUERY_MAX_CHARS: 300,
  COVER_LETTER_NOTES_MAX_CHARS: 500,
  MAX_REVISIONS: 1,                  // cover-letter revise cycles (§13)
  GRAPH_RECURSION_LIMIT: 15,
  WORKER_RATE_LIMIT_PAUSE_MS: 60000, // minimum queue pause after a Gemini 429 (spec §9.2)
  GRAPH_TIMEOUT_MS: 90000,
  SYNC_REQUEST_TIMEOUT_MS: 45000,    // overall AbortSignal for single-call endpoints (search, fit)
  PROMPT_VERSION: 'v2',              // 'v1' = OpenAI era; bump to invalidate caches and regenerate insights
  CACHE_TTL_SECONDS: { EMBEDDING: 86400, QUERY_PARSE: 3600, FIT: 604800, TIPS: 604800 },
  FIT_BANDS: { STRONG_FIT: 75, GOOD_FIT: 55, PARTIAL_FIT: 35 },   // below PARTIAL_FIT ⇒ WEAK_FIT
  QUEUE_NAME: 'ai',
  JOB_NAMES: { PROCESS_JOB: 'process-job', PROCESS_RESUME: 'process-resume' },
  LIST_LIMITS: {                     // post-LLM clamping (§8.9)
    RESPONSIBILITIES: 6, REQUIREMENTS: 6, NICE_TO_HAVE: 4, PERKS: 4,
    SKILLS: 40, ROLES: 6, ROLE_HIGHLIGHTS: 3, EDUCATION: 4, CERTIFICATIONS: 8,
    MATCHED_SKILLS: 12, MISSING_SKILLS: 8, STRENGTHS: 4, GAPS: 4,
    TIPS: 8, KEYWORDS: 10,
  },
};
