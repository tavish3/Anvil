const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const { sendEmail } = require('../../emails/mailer');
const { passwordResetTemplate } = require('../../emails/templates/passwordReset');

const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = crypto.randomBytes(40).toString('hex');

  return { accessToken, refreshToken };
};

const registerUser = async (data) => {
  const { name, email, password, role } = data;

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new ApiError(409, 'Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role
    }
  });

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);

  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: refreshTokenExpiry
    }
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl
    },
    accessToken,
    refreshToken
  };
};

const loginUser = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);

  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: refreshTokenExpiry
    }
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl
    },
    accessToken,
    refreshToken
  };
};

const refreshTokens = async (refreshToken) => {
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true }
  });

  if (!tokenRecord) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  if (tokenRecord.expiresAt < new Date()) {
    await prisma.refreshToken.delete({
      where: { token: refreshToken }
    });
    throw new ApiError(401, 'Refresh token expired');
  }

  await prisma.refreshToken.delete({
    where: { token: refreshToken }
  });

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(
    tokenRecord.user.id,
    tokenRecord.user.role
  );

  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      token: newRefreshToken,
      userId: tokenRecord.user.id,
      expiresAt: refreshTokenExpiry
    }
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user: {
      id: tokenRecord.user.id,
      name: tokenRecord.user.name,
      email: tokenRecord.user.email,
      role: tokenRecord.user.role,
      avatarUrl: tokenRecord.user.avatarUrl
    }
  };
};

const logoutUser = async (refreshToken) => {
  await prisma.refreshToken.deleteMany({
    where: { token: refreshToken }
  });
};

const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  // Silently succeed if user not found to prevent email enumeration
  if (!user) {
    return;
  }

  // Generate random token
  const rawToken = crypto.randomBytes(32).toString('hex');
  
  // Hash the token for storage
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Calculate expiry (15 minutes from now)
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);

  // Store in PasswordReset table
  await prisma.passwordReset.create({
    data: {
      token: hashedToken,
      userId: user.id,
      expiresAt
    }
  });

  // Send email with reset link
  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`;
  const emailHtml = passwordResetTemplate(resetUrl, user.name);

  await sendEmail(user.email, 'Reset Your Password', emailHtml);
};

const resetPassword = async (token, newPassword) => {
  // Hash the incoming token to compare with stored hash
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find the password reset record
  const passwordReset = await prisma.passwordReset.findUnique({
    where: { token: hashedToken },
    include: { user: true }
  });

  if (!passwordReset) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  // Check if token is expired
  if (passwordReset.expiresAt < new Date()) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  // Check if token has already been used
  if (passwordReset.used) {
    throw new ApiError(400, 'Reset token has already been used');
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 10);

  // Update user password
  await prisma.user.update({
    where: { id: passwordReset.userId },
    data: { passwordHash }
  });

  // Mark token as used
  await prisma.passwordReset.update({
    where: { id: passwordReset.id },
    data: { used: true }
  });
};

module.exports = {
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser,
  forgotPassword,
  resetPassword
};
