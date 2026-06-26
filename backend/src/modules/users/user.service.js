const prisma = require('../../config/db');
const uploadToCloudinary = require('../../utils/uploadToCloudinary');
const ApiError = require('../../utils/ApiError');

const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      createdAt: true
    }
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

const updateMe = async (userId, name) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      createdAt: true
    }
  });

  return user;
};

const updateAvatar = async (userId, buffer) => {
  const avatarUrl = await uploadToCloudinary(buffer, 'job-board/avatars');

  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      createdAt: true
    }
  });

  return user;
};

module.exports = {
  getMe,
  updateMe,
  updateAvatar
};
