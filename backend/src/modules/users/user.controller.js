const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { getMe: getMeService, updateMe: updateMeService, updateAvatar: updateAvatarService } = require('./user.service');

const getMe = asyncHandler(async (req, res) => {
  const user = await getMeService(req.user.userId);

  res.status(200).json(
    new ApiResponse(200, user, 'User profile retrieved successfully')
  );
});

const updateMe = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const user = await updateMeService(req.user.userId, name);

  res.status(200).json(
    new ApiResponse(200, user, 'Profile updated successfully')
  );
});

const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json(
      new ApiResponse(400, null, 'No file uploaded')
    );
  }

  const user = await updateAvatarService(req.user.userId, req.file.buffer);

  res.status(200).json(
    new ApiResponse(200, user, 'Avatar updated successfully')
  );
});

module.exports = {
  getMe,
  updateMe,
  updateAvatar
};
