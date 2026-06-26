const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { createJob, updateJob, softDeleteJob, getMyListings, getJobs, getJobById } = require('./job.service');

const handleCreateJob = asyncHandler(async (req, res) => {
  const job = await createJob(req.user.userId, req.body);

  res.status(201).json(
    new ApiResponse(201, job, 'Job created successfully')
  );
});

const handleUpdateJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const job = await updateJob(id, req.user.userId, req.body);

  res.status(200).json(
    new ApiResponse(200, job, 'Job updated successfully')
  );
});

const handleSoftDeleteJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const job = await softDeleteJob(id, req.user.userId);

  res.status(200).json(
    new ApiResponse(200, job, 'Job deleted successfully')
  );
});

const handleGetMyListings = asyncHandler(async (req, res) => {
  const jobs = await getMyListings(req.user.userId);

  res.status(200).json(
    new ApiResponse(200, jobs, 'Listings retrieved successfully')
  );
});

const handleGetJobs = asyncHandler(async (req, res) => {
  const result = await getJobs(req.query);

  res.status(200).json(
    new ApiResponse(200, result, 'Jobs retrieved successfully')
  );
});

const handleGetJobById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const job = await getJobById(id);

  res.status(200).json(
    new ApiResponse(200, job, 'Job retrieved successfully')
  );
});

module.exports = {
  createJob: handleCreateJob,
  updateJob: handleUpdateJob,
  softDeleteJob: handleSoftDeleteJob,
  getMyListings: handleGetMyListings,
  getJobs: handleGetJobs,
  getJobById: handleGetJobById
};
