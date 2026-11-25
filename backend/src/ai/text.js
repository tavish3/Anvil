const crypto = require('crypto');
const {
  JOB_DESCRIPTION_MAX_CHARS,
  RESUME_EMBED_RAW_CHARS,
} = require('./constants');

function sha256(str) {
  return crypto.createHash('sha256').update(String(str), 'utf8').digest('hex');
}

function cleanText(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\r\n?/g, '\n')
    // Strip control characters except \n and \t (also removes NUL, which PostgreSQL TEXT cannot store)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripPdfPageMarkers(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/gm, '');
}

function truncate(str, max) {
  if (typeof str !== 'string') return '';
  return str.length <= max ? str : str.slice(0, max);
}

function wordCount(str) {
  if (typeof str !== 'string') return 0;
  const matches = str.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

function escapeLike(str) {
  return String(str).replace(/[\\%_]/g, '\\$&');
}

function buildJobDocument(job, employerName) {
  const j = job || {};
  const lines = [
    `Title: ${j.title || ''}`,
    `Company: ${employerName || ''}`,
    `Location: ${j.location || ''} (${j.locationType || ''})`,
    `Job type: ${j.jobType || ''}`,
  ];

  const { salaryMin, salaryMax } = j;
  if (salaryMin != null && salaryMax != null) {
    lines.push(`Salary: ${salaryMin} - ${salaryMax} INR per year`);
  } else if (salaryMin != null) {
    lines.push(`Salary: from ${salaryMin} INR per year`);
  } else if (salaryMax != null) {
    lines.push(`Salary: up to ${salaryMax} INR per year`);
  }

  const skills = Array.isArray(j.skills) ? j.skills.filter(Boolean) : [];
  if (skills.length > 0) {
    lines.push(`Skills: ${skills.join(', ')}`);
  }

  lines.push('Description:');
  lines.push(truncate(cleanText(j.description), JOB_DESCRIPTION_MAX_CHARS));

  return lines.join('\n');
}

function buildResumeEmbeddingText(profile, rawText) {
  if (!profile || typeof profile !== 'object') {
    return truncate(rawText, RESUME_EMBED_RAW_CHARS * 3);
  }

  const lines = [];
  if (profile.headline) lines.push(`Headline: ${profile.headline}`);
  if (profile.summary) lines.push(`Summary: ${profile.summary}`);
  if (Array.isArray(profile.skills) && profile.skills.length > 0) {
    lines.push(`Skills: ${profile.skills.join(', ')}`);
  }
  if (Array.isArray(profile.roles) && profile.roles.length > 0) {
    lines.push('Experience:');
    for (const role of profile.roles) {
      let line = `- ${role.title || 'Role'}`;
      if (role.company) line += ` at ${role.company}`;
      if (Array.isArray(role.highlights) && role.highlights.length > 0) {
        line += `: ${role.highlights.join('; ')}`;
      }
      lines.push(line);
    }
  }
  if (Array.isArray(profile.education) && profile.education.length > 0) {
    lines.push('Education:');
    for (const edu of profile.education) {
      const parts = [edu.degree, edu.institution, edu.year].filter(Boolean);
      lines.push(`- ${parts.join(', ')}`);
    }
  }

  lines.push('Resume excerpt:');
  lines.push(truncate(rawText, RESUME_EMBED_RAW_CHARS));

  return lines.join('\n');
}

// Pure: how text is presented to the embedding model for a given role.
//  gemini-embedding-2  -> no taskType; the role is expressed with text prefixes
//  gemini-embedding-001 -> raw text + taskType
function formatEmbeddingInput({ model, role, text, title }) {
  if (/embedding-2/.test(model)) {
    return {
      contents: role === 'query' ? `task: search result | query: ${text}` : `title: ${title || 'none'} | text: ${text}`,
      taskType: undefined,
    };
  }
  return { contents: text, taskType: role === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT' };
}

module.exports = {
  sha256,
  cleanText,
  stripPdfPageMarkers,
  truncate,
  wordCount,
  escapeLike,
  formatEmbeddingInput,
  buildJobDocument,
  buildResumeEmbeddingText,
};
