const prisma = require('../../config/db');
const ApiError = require('../../utils/ApiError');
const uploadToCloudinary = require('../../utils/uploadToCloudinary');
const emailQueue = require('../../queues/email.queue');
const { createNotification } = require('../notifications/notification.service');

const applyToJob = async (applicantId, jobId, resumeBuffer, coverLetter, { useSavedResume = false } = {}) => {
  // Check job exists, not deleted, deadline not passed
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      isDeleted: false
    }
  });

  if (!job) {
    throw new ApiError(404, 'Job not found');
  }

  if (job.deadline && job.deadline < new Date()) {
    throw new ApiError(400, 'Job application deadline has passed');
  }

  // Check applicant hasn't already applied
  const existingApplication = await prisma.application.findFirst({
    where: {
      jobId,
      applicantId
    }
  });

  if (existingApplication) {
    throw new ApiError(409, 'You have already applied to this job');
  }

  // Resolve the resume: an uploaded file always wins; otherwise the applicant's
  // saved resume may be reused; with neither, applying is not possible.
  let resumeUrl;
  if (resumeBuffer) {
    resumeUrl = await uploadToCloudinary(resumeBuffer, 'job-board/resumes');
  } else if (useSavedResume) {
    const savedResume = await prisma.resume.findUnique({ where: { userId: applicantId } });
    if (!savedResume) {
      throw new ApiError(400, 'No saved resume found. Please upload a resume.');
    }
    resumeUrl = savedResume.fileUrl;
  } else {
    throw new ApiError(400, 'Resume is required');
  }

  // Create application with status APPLIED
  const application = await prisma.application.create({
    data: {
      jobId,
      applicantId,
      resumeUrl,
      coverLetter,
      status: 'APPLIED'
    },
    include: {
      job: {
        include: {
          employer: true
        }
      },
      applicant: {
        select: {
          name: true
        }
      }
    }
  });

  // Enqueue email notification job (new-application)
  await emailQueue.add('new-application', {
    employerEmail: application.job.employer.email,
    employerName: application.job.employer.name,
    jobTitle: application.job.title,
    applicantName: application.applicant.name
  });

  // Create in-app notification for employer
  await createNotification(
    application.job.employerId,
    `${application.applicant.name} applied to your listing "${application.job.title}"`
  );

  return application;
};

const withdrawApplication = async (applicationId, applicantId) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId }
  });

  if (!application) {
    throw new ApiError(404, 'Application not found');
  }

  if (application.applicantId !== applicantId) {
    throw new ApiError(403, 'You do not have permission to withdraw this application');
  }

  if (application.status !== 'APPLIED') {
    throw new ApiError(400, 'Can only withdraw applications with APPLIED status');
  }

  await prisma.application.delete({
    where: { id: applicationId }
  });
};

const getMyApplications = async (applicantId) => {
  const applications = await prisma.application.findMany({
    where: {
      applicantId
    },
    include: {
      job: {
        include: {
          employer: {
            select: {
              name: true
            }
          }
        }
      },
      applicant: {
        select: {
          name: true,
          email: true,
          avatarUrl: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return applications.map(app => ({
    id: app.id,
    jobId: app.jobId,
    jobTitle: app.job.title,
    companyName: app.job.employer.name,
    status: app.status,
    createdAt: app.createdAt,
    resumeUrl: app.resumeUrl,
    coverLetter: app.coverLetter,
    applicantName: app.applicant.name,
    applicantEmail: app.applicant.email,
    avatarUrl: app.applicant.avatarUrl
  }));
};

const getJobApplicants = async (jobId, employerId) => {
  // Verify employer owns the job
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      employerId
    }
  });

  if (!job) {
    throw new ApiError(404, 'Job not found or you do not have permission to view applicants');
  }

  const applications = await prisma.application.findMany({
    where: {
      jobId
    },
    include: {
      applicant: {
        select: {
          name: true,
          email: true,
          avatarUrl: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return applications.map(app => ({
    id: app.id,
    applicantName: app.applicant.name,
    applicantEmail: app.applicant.email,
    avatarUrl: app.applicant.avatarUrl,
    resumeUrl: app.resumeUrl,
    coverLetter: app.coverLetter,
    status: app.status,
    createdAt: app.createdAt
  }));
};

const updateApplicationStatus = async (applicationId, employerId, newStatus) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      job: true,
      applicant: true
    }
  });

  if (!application) {
    throw new ApiError(404, 'Application not found');
  }

  // Verify employer owns the job the application belongs to
  if (application.job.employerId !== employerId) {
    throw new ApiError(403, 'You do not have permission to update this application');
  }

  // Update status
  const updatedApplication = await prisma.application.update({
    where: { id: applicationId },
    data: { status: newStatus }
  });

  // Enqueue email notification job (status-changed)
  await emailQueue.add('status-changed', {
    applicantEmail: application.applicant.email,
    applicantName: application.applicant.name,
    jobTitle: application.job.title,
    newStatus
  });

  // Create in-app notification for applicant
  await createNotification(
    application.applicantId,
    `Your application for "${application.job.title}" has been moved to ${newStatus}`
  );

  return updatedApplication;
};

module.exports = {
  applyToJob,
  withdrawApplication,
  getMyApplications,
  getJobApplicants,
  updateApplicationStatus
};
