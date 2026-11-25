const express = require('express');
const router = express.Router();
const multer = require('multer');
const ApiError = require('../../utils/ApiError');
const { upsertResume, getResume, deleteResume, reprocessResume } = require('./resume.controller');
const verifyAccessToken = require('../../middlewares/auth');
const requireRole = require('../../middlewares/requireRole');
const { requireAiEnabled, aiRateLimit } = require('../../middlewares/aiGuard');

// Multer: memory storage, PDF only, max 5MB (same limits as the apply flow).
// Errors are converted to ApiError(400) so they never surface as a generic 500 (§12.4.1).
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

const uploadResume = (req, res, next) => {
  upload.single('resume')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ApiError(400, 'Resume must be 5MB or smaller'));
      }
      // A wrong field name means no resume file was provided; the AI-7 verify
      // list expects 'Resume file is required' here rather than multer's message.
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new ApiError(400, 'Resume file is required'));
      }
      return next(new ApiError(400, err.message));
    }
    if (err.message === 'Only PDF files are allowed') {
      return next(new ApiError(400, 'Only PDF files are allowed'));
    }
    next(new ApiError(400, err.message || 'Invalid file upload'));
  });
};

// Middleware order per AI spec §10.1/§11.2: requireAiEnabled -> auth -> role -> aiRateLimit -> controller
router.put('/me', requireAiEnabled, verifyAccessToken, requireRole('APPLICANT'), aiRateLimit({ name: 'resume-put', limit: 10 }), uploadResume, upsertResume);
router.get('/me', requireAiEnabled, verifyAccessToken, requireRole('APPLICANT'), aiRateLimit({ name: 'resume-get', limit: 60 }), getResume);
router.delete('/me', requireAiEnabled, verifyAccessToken, requireRole('APPLICANT'), aiRateLimit({ name: 'resume-delete', limit: 10 }), deleteResume);
router.post('/me/reprocess', requireAiEnabled, verifyAccessToken, requireRole('APPLICANT'), aiRateLimit({ name: 'resume-reprocess', limit: 5 }), reprocessResume);

module.exports = router;
