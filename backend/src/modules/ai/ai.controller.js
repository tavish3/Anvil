const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { getAiStatus, getJobInsights, regenerateJobInsights, getSimilarJobs, searchJobs, getRecommendations, analyzeFitForUser, generateCoverLetterForUser, generateResumeTipsForUser } = require('./ai.service');

const handleGetStatus = asyncHandler(async (req, res) => {
  const status = await getAiStatus();

  res.status(200).json(
    new ApiResponse(200, status, 'AI status retrieved')
  );
});

const handleGetJobInsights = asyncHandler(async (req, res) => {
  const insights = await getJobInsights(req.params.id);

  res.status(200).json(
    new ApiResponse(200, insights, 'Job insights retrieved')
  );
});

const handleRegenerateJobInsights = asyncHandler(async (req, res) => {
  const result = await regenerateJobInsights(req.params.id, req.user.userId);

  res.status(200).json(
    new ApiResponse(200, result, 'Regeneration started')
  );
});

const handleGetSimilarJobs = asyncHandler(async (req, res) => {
  const result = await getSimilarJobs(req.params.id, req.validated.query.limit);

  res.status(200).json(
    new ApiResponse(200, result, 'Similar jobs retrieved')
  );
});

const handleSearchJobs = asyncHandler(async (req, res) => {
  const result = await searchJobs(req.validated.query);

  res.status(200).json(
    new ApiResponse(200, result, 'Search results retrieved')
  );
});

const handleGetRecommendations = asyncHandler(async (req, res) => {
  const result = await getRecommendations(req.user.userId, req.validated.query);

  res.status(200).json(
    new ApiResponse(200, result, 'Recommendations retrieved')
  );
});

const handleAnalyzeFit = asyncHandler(async (req, res) => {
  const result = await analyzeFitForUser(req.user.userId, req.params.id);

  res.status(200).json(
    new ApiResponse(200, result, 'Fit analysis retrieved')
  );
});

const handleGenerateCoverLetter = asyncHandler(async (req, res) => {
  const result = await generateCoverLetterForUser(req.user.userId, req.params.id, req.validated.body);

  res.status(200).json(
    new ApiResponse(200, result, 'Cover letter generated')
  );
});

const handleGenerateResumeTips = asyncHandler(async (req, res) => {
  const result = await generateResumeTipsForUser(req.user.userId, req.params.id);

  res.status(200).json(
    new ApiResponse(200, result, 'Resume tips generated')
  );
});

module.exports = {
  getStatus: handleGetStatus,
  getJobInsights: handleGetJobInsights,
  regenerateJobInsights: handleRegenerateJobInsights,
  getSimilarJobs: handleGetSimilarJobs,
  searchJobs: handleSearchJobs,
  getRecommendations: handleGetRecommendations,
  analyzeFit: handleAnalyzeFit,
  generateCoverLetter: handleGenerateCoverLetter,
  generateResumeTips: handleGenerateResumeTips
};
