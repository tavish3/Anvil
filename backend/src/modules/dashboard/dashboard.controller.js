const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { getEmployerDashboard } = require('./dashboard.service');

const getEmployerDashboardHandler = asyncHandler(async (req, res) => {
  const dashboard = await getEmployerDashboard(req.user.userId);
  
  res.status(200).json(
    new ApiResponse(true, 'Dashboard data retrieved successfully', dashboard)
  );
});

module.exports = {
  getEmployerDashboardHandler
};
