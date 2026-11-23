const { aiConfig } = require('./config');
const { EMBEDDING_DIMENSIONS } = require('./constants');

let chatModel = null;
let writingModel = null;
let embeddings = null;

function chatOptions(model) {
  const options = {
    model,
    apiKey: aiConfig.apiKey,
    maxRetries: 2,
    timeout: aiConfig.requestTimeoutMs,
  };
  if (aiConfig.reasoningEffort) {
    options.reasoning = { effort: aiConfig.reasoningEffort };
  }
  return options;
}

function getChatModel() {
  if (!chatModel) {
    const { ChatOpenAI } = require('@langchain/openai');
    chatModel = new ChatOpenAI(chatOptions(aiConfig.chatModel));
  }
  return chatModel;
}

function getWritingModel() {
  if (!writingModel) {
    if (aiConfig.writingModel === aiConfig.chatModel) {
      return getChatModel();
    }
    const { ChatOpenAI } = require('@langchain/openai');
    writingModel = new ChatOpenAI(chatOptions(aiConfig.writingModel));
  }
  return writingModel;
}

function getEmbeddings() {
  if (!embeddings) {
    const { OpenAIEmbeddings } = require('@langchain/openai');
    embeddings = new OpenAIEmbeddings({
      model: aiConfig.embeddingModel,
      apiKey: aiConfig.apiKey,
      dimensions: EMBEDDING_DIMENSIONS,
      batchSize: 64,
      maxRetries: 2,
      timeout: aiConfig.requestTimeoutMs,
    });
  }
  return embeddings;
}

function structured(model, schema, name) {
  return model.withStructuredOutput(schema, { method: 'jsonSchema', strict: true, name });
}

module.exports = { getChatModel, getWritingModel, getEmbeddings, structured };
