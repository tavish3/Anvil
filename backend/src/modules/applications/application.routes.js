const express = require('express');
const router = express.Router();
const multer = require('multer');
const { applyToJob, withdrawApplication, getMyApplications, getJobApplicants, updateApplicationStatus } = require('./application.controller');
const { updateApplicationStatusSchema } = require('./application.schema');
const validate = require('../../middlewares/validate');
const verifyAccessToken = require('../../middlewares/auth');
const requireRole = require('../../middlewares/requireRole');

// Multer configuration for resume upload (memory storage, PDF only, max 5MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// GET /my - Get all my applications (Applicant only)
router.get('/my', verifyAccessToken, requireRole('APPLICANT'), getMyApplications);

// POST /jobs/:jobId/apply - Apply to a job (Applicant only)
router.post('/jobs/:jobId/apply', verifyAccessToken, requireRole('APPLICANT'), upload.single('resume'), applyToJob);

// GET /jobs/:jobId - Get all applicants for a job (Employer only)
router.get('/jobs/:jobId', verifyAccessToken, requireRole('EMPLOYER'), getJobApplicants);

// DELETE /:id/withdraw - Withdraw application (Applicant only)
router.delete('/:id/withdraw', verifyAccessToken, requireRole('APPLICANT'), withdrawApplication);

// PATCH /:id/status - Update application status (Employer only)
router.patch('/:id/status', verifyAccessToken, requireRole('EMPLOYER'), validate(updateApplicationStatusSchema), updateApplicationStatus);

module.exports = router;
