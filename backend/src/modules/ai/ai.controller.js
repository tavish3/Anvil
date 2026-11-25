const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { getAiStatus, getJobInsights, regenerateJobInsights, getSimilarJobs, searchJobs } = require('./ai.service');

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

module.exports = {
  getStatus: handleGetStatus,
  getJobInsights: handleGetJobInsights,
  regenerateJobInsights: handleRegenerateJobInsights,
  getSimilarJobs: handleGetSimilarJobs,
  searchJobs: handleSearchJobs
};
