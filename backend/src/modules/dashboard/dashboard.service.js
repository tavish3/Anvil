const prisma = require('../../config/db');

const getEmployerDashboard = async (userId) => {
  // Get total listings (non-deleted)
  const totalListings = await prisma.job.count({
    where: {
      employerId: userId,
      isDeleted: false
    }
  });

  // Get total applications across all employer's jobs
  const totalApplications = await prisma.application.count({
    where: {
      job: {
        employerId: userId
      }
    }
  });

  // Get applications grouped by status
  const byStage = await prisma.application.groupBy({
    by: ['status'],
    where: {
      job: {
        employerId: userId
      }
    },
    _count: {
      status: true
    }
  });

  // Transform groupBy result to a simpler object
  const byStageMap = {
    APPLIED: 0,
    REVIEWING: 0,
    INTERVIEW: 0,
    OFFERED: 0,
    REJECTED: 0
  };

  byStage.forEach(stage => {
    byStageMap[stage.status] = stage._count.status;
  });

  // Get recent listings (last 5) with application count
  const recentListings = await prisma.job.findMany({
    where: {
      employerId: userId,
      isDeleted: false
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      _count: {
        select: {
          applications: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 5
  });

  return {
    totalListings,
    totalApplications,
    byStage: byStageMap,
    recentListings: recentListings.map(listing => ({
      id: listing.id,
      title: listing.title,
      createdAt: listing.createdAt,
      applicationCount: listing._count.applications
    }))
  };
};

module.exports = {
  getEmployerDashboard
};
