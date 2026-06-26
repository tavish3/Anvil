const prisma = require('../../config/db');
const ApiError = require('../../utils/ApiError');

const createJob = async (employerId, data) => {
  const job = await prisma.job.create({
    data: {
      employerId,
      ...data
    }
  });

  return job;
};

const updateJob = async (jobId, employerId, data) => {
  const job = await prisma.job.findUnique({
    where: { id: jobId }
  });

  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  if (job.employerId !== employerId) {
    throw new ApiError(403, 'You do not have permission to update this job');
  }

  const updatedJob = await prisma.job.update({
    where: { id: jobId },
    data
  });

  return updatedJob;
};

const softDeleteJob = async (jobId, employerId) => {
  const job = await prisma.job.findUnique({
    where: { id: jobId }
  });

  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  if (job.employerId !== employerId) {
    throw new ApiError(403, 'You do not have permission to delete this job');
  }

  const deletedJob = await prisma.job.update({
    where: { id: jobId },
    data: { isDeleted: true }
  });

  return deletedJob;
};

const getMyListings = async (employerId) => {
  const jobs = await prisma.job.findMany({
    where: {
      employerId,
      isDeleted: false
    },
    include: {
      _count: {
        select: { applications: true }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return jobs;
};

const getJobs = async (params) => {
  const {
    q,
    location,
    locationType,
    jobType,
    salaryMin,
    salaryMax,
    sortBy = 'newest',
    page = 1,
    limit = 10
  } = params;

  // Ensure page, limit, and salary values are numbers
  const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
  const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;
  const salaryMinNum = salaryMin !== undefined && salaryMin !== null ? (typeof salaryMin === 'string' ? parseInt(salaryMin, 10) : salaryMin) : undefined;
  const salaryMaxNum = salaryMax !== undefined && salaryMax !== null ? (typeof salaryMax === 'string' ? parseInt(salaryMax, 10) : salaryMax) : undefined;

  const where = {
    isDeleted: false,
    AND: [
      {
        OR: [
          { deadline: null },
          { deadline: { gte: new Date() } }
        ]
      }
    ]
  };

  if (q) {
    where.AND.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } }
      ]
    });
  }

  if (location) {
    where.AND.push({
      location: { contains: location, mode: 'insensitive' }
    });
  }

  if (locationType) {
    where.AND.push({
      locationType
    });
  }

  if (jobType) {
    where.AND.push({
      jobType
    });
  }

  if (salaryMinNum !== undefined) {
    where.AND.push({
      salaryMax: { gte: salaryMinNum }
    });
  }

  if (salaryMaxNum !== undefined) {
    where.AND.push({
      salaryMin: { lte: salaryMaxNum }
    });
  }

  let orderBy = {};
  switch (sortBy) {
    case 'salaryAsc':
      orderBy = { salaryMin: 'asc' };
      break;
    case 'salaryDesc':
      orderBy = { salaryMax: 'desc' };
      break;
    case 'newest':
    default:
      orderBy = { createdAt: 'desc' };
      break;
  }

  const skip = (pageNum - 1) * limitNum;

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy,
      skip,
      take: limitNum,
      include: {
        employer: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      }
    }),
    prisma.job.count({ where })
  ]);

  const totalPages = Math.ceil(total / limitNum);

  return {
    jobs,
    total,
    page: pageNum,
    totalPages
  };
};

const getJobById = async (jobId) => {
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      isDeleted: false
    },
    include: {
      employer: {
        select: {
          id: true,
          name: true,
          avatarUrl: true
        }
      }
    }
  });

  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  return job;
};

module.exports = {
  createJob,
  updateJob,
  softDeleteJob,
  getMyListings,
  getJobs,
  getJobById
};
