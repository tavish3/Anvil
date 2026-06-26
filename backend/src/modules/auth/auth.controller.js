const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { registerUser, loginUser, refreshTokens, logoutUser, forgotPassword, resetPassword } = require('./auth.service');

const register = asyncHandler(async (req, res) => {
  const result = await registerUser(req.body);

  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });

  res.status(201).json(
    new ApiResponse(201, {
      user: result.user,
      accessToken: result.accessToken
    }, 'Registration successful')
  );
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await loginUser(email, password);

  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });

  res.status(200).json(
    new ApiResponse(200, {
      user: result.user,
      accessToken: result.accessToken
    }, 'Login successful')
  );
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(401).json(
      new ApiResponse(401, null, 'No refresh token provided')
    );
  }

  const result = await refreshTokens(refreshToken);

  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });

  res.status(200).json(
    new ApiResponse(200, {
      accessToken: result.accessToken,
      user: result.user
    }, 'Token refreshed')
  );
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (refreshToken) {
    await logoutUser(refreshToken);
  }

  res.clearCookie('refreshToken');

  res.status(200).json(
    new ApiResponse(200, null, 'Logout successful')
  );
});

const handleForgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await forgotPassword(email);

  res.status(200).json(
    new ApiResponse(200, null, 'If an account with that email exists, a password reset link has been sent')
  );
});

const handleResetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  await resetPassword(token, newPassword);

  res.status(200).json(
    new ApiResponse(200, null, 'Password reset successful')
  );
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  forgotPassword: handleForgotPassword,
  resetPassword: handleResetPassword
};
