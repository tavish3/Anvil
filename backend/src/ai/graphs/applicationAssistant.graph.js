const { StateGraph, Annotation, START, END } = require('@langchain/langgraph');
const { MAX_REVISIONS, GRAPH_RECURSION_LIMIT, GRAPH_TIMEOUT_MS } = require('../constants');
const { getFitAnalysis } = require('../chains/fitAnalysis.chain');
const {
  writeCoverLetter,
  reviseCoverLetter,
  critiqueCoverLetter,
  buildWarnings,
  buildReviseProblems,
} = require('../chains/coverLetter.chain');
const { getResumeTips } = require('../chains/resumeTips.chain');
const { buildJobDocument } = require('../text');

// AI spec §13. Node names must NOT equal state keys (LangGraph throws).
const State = Annotation.Root({
  mode: Annotation(),
  job: Annotation(),
  employerName: Annotation(),
  resumeText: Annotation(),
  resumeHash: Annotation(),
  candidateName: Annotation(),
  tone: Annotation(),
  notes: Annotation(),
  analysis: Annotation(),
  draft: Annotation(),
  critique: Annotation(),
  revisions: Annotation({ reducer: (_a, b) => b, default: () => 0 }),
  tips: Annotation(),
  tipsCached: Annotation(),
});

async function analyzeMatch(state, config) {
  const { analysis } = await getFitAnalysis({
    job: state.job,
    employerName: state.employerName,
    resume: { text: state.resumeText, textHash: state.resumeHash },
    signal: config?.signal,
  });
  return { analysis };
}

async function writeDraft(state, config) {
  const draft = await writeCoverLetter({
    document: buildJobDocument(state.job, state.employerName),
    resumeText: state.resumeText,
    analysis: state.analysis,
    candidateName: state.candidateName,
    company: state.employerName,
    tone: state.tone,
    notes: state.notes,
    signal: config?.signal,
  });
  return { draft };
}

async function reviewDraft(state, config) {
  const critique = await critiqueCoverLetter({
    resumeText: state.resumeText,
    notes: state.notes,
    draft: state.draft,
    tone: state.tone,
    signal: config?.signal,
  });
  return { critique };
}

async function reviseDraft(state, config) {
  const draft = await reviseCoverLetter({
    draft: state.draft,
    problems: buildReviseProblems({
      critique: state.critique,
      notes: state.notes,
      resumeText: state.resumeText,
    }),
    tone: state.tone,
    signal: config?.signal,
  });
  return { draft, revisions: (state.revisions || 0) + 1 };
}

async function suggestTips(state, config) {
  const { tips, cached } = await getResumeTips({
    job: state.job,
    employerName: state.employerName,
    resume: { text: state.resumeText, textHash: state.resumeHash },
    analysis: state.analysis,
    signal: config?.signal,
  });
  return { tips, tipsCached: cached };
}

function buildGraph() {
  return new StateGraph(State)
    .addNode('analyzeMatch', analyzeMatch)
    .addNode('writeDraft', writeDraft)
    .addNode('reviewDraft', reviewDraft)
    .addNode('reviseDraft', reviseDraft)
    .addNode('suggestTips', suggestTips)
    .addEdge(START, 'analyzeMatch')
    .addConditionalEdges(
      'analyzeMatch',
      (s) => (s.mode === 'RESUME_TIPS' ? 'suggestTips' : 'writeDraft'),
      ['writeDraft', 'suggestTips']
    )
    .addEdge('writeDraft', 'reviewDraft')
    .addConditionalEdges(
      'reviewDraft',
      (s) => (!s.critique.passed && s.revisions < MAX_REVISIONS ? 'reviseDraft' : END),
      ['reviseDraft', END]
    )
    .addEdge('reviseDraft', 'reviewDraft')
    .addEdge('suggestTips', END)
    .compile();
}

// Compiled once, lazily — nothing is constructed at require time.
let graph = null;
function getGraph() {
  if (!graph) graph = buildGraph();
  return graph;
}

async function runApplicationAssistant(input = {}) {
  const result = await getGraph().invoke(input, {
    signal: AbortSignal.timeout(GRAPH_TIMEOUT_MS),
    recursionLimit: GRAPH_RECURSION_LIMIT,
  });

  if (input.mode === 'RESUME_TIPS') {
    const tips = result.tips || {};
    return {
      summary: tips.summary || '',
      tips: Array.isArray(tips.tips) ? tips.tips : [],
      keywordsToConsider: Array.isArray(tips.keywordsToConsider) ? tips.keywordsToConsider : [],
      cached: result.tipsCached === true,
    };
  }

  return {
    coverLetter: result.draft,
    revisions: result.revisions || 0,
    warnings: buildWarnings(result.critique),
  };
}

module.exports = { runApplicationAssistant };
