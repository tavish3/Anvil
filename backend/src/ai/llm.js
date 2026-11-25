const { ChatGoogle } = require('@langchain/google/node');
const { aiConfig } = require('./config');
const { EmptyModelOutputError } = require('./errors');

let chatModel;
let writingModel;

function build(model) {
  // NEVER pass temperature, timeout (ignored by ChatGoogle), endpoint, reasoningEffort or thinkingBudget.
  const options = { model, apiKey: aiConfig.apiKey, platformType: 'gai', maxRetries: 2 };
  if (aiConfig.thinkingLevel) options.thinkingLevel = aiConfig.thinkingLevel;
  return new ChatGoogle(options);
}

function getChatModel() {
  if (!chatModel) chatModel = build(aiConfig.chatModel);
  return chatModel;
}

function getWritingModel() {
  if (aiConfig.writingModel === aiConfig.chatModel) return getChatModel();
  if (!writingModel) writingModel = build(aiConfig.writingModel);
  return writingModel;
}

const structured = (model, schema, name) => model.withStructuredOutput(schema, { method: 'jsonSchema', name });

// ChatGoogle ignores its `timeout` option, so EVERY invocation must carry an AbortSignal.
function callOptions(signal) {
  const signals = [AbortSignal.timeout(aiConfig.requestTimeoutMs)];
  if (signal) signals.push(signal);
  return { signal: AbortSignal.any(signals) };
}

// `message.text` excludes thought-summary blocks (StringOutputParser does NOT - never use it with Gemini).
function getText(message) {
  const text = typeof message?.text === 'string' ? message.text.trim() : '';
  if (!text) throw new EmptyModelOutputError();
  return text;
}

module.exports = { getChatModel, getWritingModel, structured, callOptions, getText };
