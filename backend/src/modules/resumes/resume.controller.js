const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { upsertResume, getResume, deleteResume, reprocessResume } = require('./resume.service');

const handleUpsertResume = asyncHandler(async (req, res) => {
  const dto = await upsertResume(req.user.userId, req.file);

  res.status(200).json(
    new ApiResponse(200, dto, 'Resume uploaded successfully')
  );
});

const handleGetResume = asyncHandler(async (req, res) => {
  const dto = await getResume(req.user.userId);

  res.status(200).json(
    new ApiResponse(200, dto, 'Resume retrieved')
  );
});

const handleDeleteResume = asyncHandler(async (req, res) => {
  await deleteResume(req.user.userId);

  res.status(200).json(
    new ApiResponse(200, null, 'Resume deleted successfully')
  );
});

const handleReprocessResume = asyncHandler(async (req, res) => {
  const dto = await reprocessResume(req.user.userId);

  res.status(200).json(
    new ApiResponse(200, dto, 'Resume reprocessing started')
  );
});

module.exports = {
  upsertResume: handleUpsertResume,
  getResume: handleGetResume,
  deleteResume: handleDeleteResume,
  reprocessResume: handleReprocessResume
};
