const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { applyToJob, withdrawApplication, getMyApplications, getJobApplicants, updateApplicationStatus } = require('./application.service');

const handleApplyToJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const applicantId = req.user.userId;
  const { coverLetter } = req.body;
  const resumeBuffer = req.file.buffer;

  const application = await applyToJob(applicantId, jobId, resumeBuffer, coverLetter);

  res.status(201).json(
    new ApiResponse(201, application, 'Application submitted successfully')
  );
});

const handleWithdrawApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const applicantId = req.user.userId;

  await withdrawApplication(id, applicantId);

  res.status(200).json(
    new ApiResponse(200, null, 'Application withdrawn successfully')
  );
});

const handleGetMyApplications = asyncHandler(async (req, res) => {
  const applicantId = req.user.userId;
  const applications = await getMyApplications(applicantId);

  res.status(200).json(
    new ApiResponse(200, applications, 'Applications retrieved successfully')
  );
});

const handleGetJobApplicants = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const employerId = req.user.userId;
  const applicants = await getJobApplicants(jobId, employerId);

  res.status(200).json(
    new ApiResponse(200, applicants, 'Applicants retrieved successfully')
  );
});

const handleUpdateApplicationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const employerId = req.user.userId;
  const { status } = req.body;

  const application = await updateApplicationStatus(id, employerId, status);

  res.status(200).json(
    new ApiResponse(200, application, 'Application status updated successfully')
  );
});

module.exports = {
  applyToJob: handleApplyToJob,
  withdrawApplication: handleWithdrawApplication,
  getMyApplications: handleGetMyApplications,
  getJobApplicants: handleGetJobApplicants,
  updateApplicationStatus: handleUpdateApplicationStatus
};
