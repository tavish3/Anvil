const { RESUME_PROMPT_MAX_CHARS } = require('../constants');
const { getChatModel, getWritingModel, structured, callOptions, getText } = require('../llm');
const { coverLetterPrompt, revisePrompt, factCheckPrompt, getTone } = require('../prompts');
const { CritiqueSchema } = require('../schemas');
const { normalizeList } = require('../normalize');
const { runAi } = require('../errors');
const { cleanText, truncate, wordCount } = require('../text');

// §13 reviewDraft code-level checks (pure, unit-tested).
const PLACEHOLDER_RE = /\[[^\]\n]{1,60}\]/;
const MARKDOWN_RE = /^\s*([#>*-]|\d+\.)\s|\*\*/m;
const GREETING_RE = /^\s*dear\b/i;

function checkCoverLetterDraft(draft, tone = 'PROFESSIONAL') {
  const text = typeof draft === 'string' ? draft : '';
  const issues = [];

  if (PLACEHOLDER_RE.test(text)) {
    issues.push('The letter contains a placeholder such as [Company] or [Your Name].');
  }
  if (MARKDOWN_RE.test(text)) {
    issues.push('The letter contains markdown formatting or bullet points.');
  }

  const { minWords, maxWords } = getTone(tone);
  const words = wordCount(text);
  if (words < minWords * 0.9 || words > maxWords * 1.1) {
    issues.push(`The letter has ${words} words; the expected length for this tone is roughly ${minWords}-${maxWords} words.`);
  }

  if (!GREETING_RE.test(text)) {
    issues.push('The letter does not open with a "Dear ..." greeting.');
  }

  return issues;
}

// §13 runApplicationAssistant: warnings shown to the user when the final draft still fails review.
function buildWarnings(critique) {
  if (!critique || critique.passed) return [];
  const warnings = (critique.unsupportedClaims || []).map((claim) => `Could not verify: ${claim}`);
  return warnings.concat(critique.issues || []);
}

// The committed §14.7 template has no {resume}/{notes} variables, so the facts the
// reviser needs are carried inside the free-text `problems` block.
function buildReviseProblems({ critique, notes, resumeText } = {}) {
  const parts = [];
  const claims = critique?.unsupportedClaims || [];
  const issues = critique?.issues || [];

  if (claims.length > 0) {
    parts.push(
      'Unsupported claims - remove or rewrite each so every fact is supported by the resume or the notes:\n' +
      claims.map((c) => `- ${c}`).join('\n')
    );
  }
  if (issues.length > 0) {
    parts.push('Other issues to fix:\n' + issues.map((i) => `- ${i}`).join('\n'));
  }

  parts.push(`<notes>\n${notes || '(none)'}\n</notes>`);
  parts.push(`<resume>\n${truncate(resumeText, RESUME_PROMPT_MAX_CHARS)}\n</resume>`);
  return parts.join('\n\n');
}

// §14.5 note: the <match_analysis> block is a compact rendering of matchedSkills + strengths.
function renderMatchAnalysis(analysis) {
  const a = analysis && typeof analysis === 'object' ? analysis : {};
  const lines = [];
  if (Array.isArray(a.matchedSkills) && a.matchedSkills.length > 0) {
    lines.push(`Matched skills: ${a.matchedSkills.join(', ')}`);
  }
  if (Array.isArray(a.strengths) && a.strengths.length > 0) {
    lines.push('Strengths:');
    for (const s of a.strengths) lines.push(`- ${s}`);
  }
  return lines.length > 0 ? lines.join('\n') : '(no match analysis available)';
}

let writeChain = null;
let reviseChain = null;
let critiqueChain = null;

function getWriteChain() {
  if (!writeChain) writeChain = coverLetterPrompt.pipe(getWritingModel());
  return writeChain;
}

function getReviseChain() {
  if (!reviseChain) reviseChain = revisePrompt.pipe(getWritingModel());
  return reviseChain;
}

function getCritiqueChain() {
  if (!critiqueChain) {
    critiqueChain = factCheckPrompt.pipe(
      structured(getChatModel(), CritiqueSchema, 'cover_letter_fact_check')
    );
  }
  return critiqueChain;
}

async function writeCoverLetter({ document, resumeText, analysis, candidateName, company, tone, notes, signal } = {}) {
  return runAi(async () => {
    const toneInfo = getTone(tone);
    const message = await getWriteChain().invoke(
      {
        candidate_name: candidateName || '',
        company: company || '',
        document,
        resume: truncate(resumeText, RESUME_PROMPT_MAX_CHARS),
        analysis: renderMatchAnalysis(analysis),
        notes: notes || '(none)',
        tone_instruction: toneInfo.tone_instruction,
        length_instruction: toneInfo.length_instruction,
      },
      callOptions(signal)
    );
    // Plain text only: getText(message), never StringOutputParser (§4.2).
    return cleanText(getText(message));
  });
}

async function reviseCoverLetter({ draft, problems, tone, signal } = {}) {
  return runAi(async () => {
    const toneInfo = getTone(tone);
    const message = await getReviseChain().invoke(
      {
        draft,
        problems,
        tone_instruction: toneInfo.tone_instruction,
        length_instruction: toneInfo.length_instruction,
      },
      callOptions(signal)
    );
    return cleanText(getText(message));
  });
}

async function critiqueCoverLetter({ resumeText, notes, draft, tone, signal } = {}) {
  return runAi(async () => {
    const raw = await getCritiqueChain().invoke(
      {
        resume: truncate(resumeText, RESUME_PROMPT_MAX_CHARS),
        notes: notes || '(none)',
        draft,
        word_count: wordCount(draft),
      },
      callOptions(signal)
    );

    const unsupportedClaims = normalizeList(raw?.unsupportedClaims, { max: 12 });
    const issues = normalizeList(raw?.issues, { max: 12 });
    // Code-level checks are authoritative: appended to issues, passed recomputed in code.
    issues.push(...checkCoverLetterDraft(draft, tone));

    return {
      passed: unsupportedClaims.length === 0 && issues.length === 0,
      unsupportedClaims,
      issues,
    };
  });
}

module.exports = {
  writeCoverLetter,
  reviseCoverLetter,
  critiqueCoverLetter,
  checkCoverLetterDraft,
  buildWarnings,
  buildReviseProblems,
};
