const express = require('express');
const router = express.Router();
const { getStatus, getJobInsights, regenerateJobInsights, getSimilarJobs, searchJobs, getRecommendations, analyzeFit, generateCoverLetter, generateResumeTips } = require('./ai.controller');
const { similarQuerySchema, searchQuerySchema, recommendationsQuerySchema, coverLetterBodySchema } = require('./ai.schema');
const validateRequest = require('../../middlewares/validateRequest');
const verifyAccessToken = require('../../middlewares/auth');
const requireRole = require('../../middlewares/requireRole');
const { requireAiEnabled, aiRateLimit, aiDailyBudget } = require('../../middlewares/aiGuard');

// Middleware order per AI spec §10.1/§11.2: requireAiEnabled -> (auth -> role) -> aiRateLimit -> (aiDailyBudget) -> validateRequest -> controller
router.get('/status', aiRateLimit({ name: 'status', limit: 60 }), getStatus);
router.get('/jobs/:id/insights', requireAiEnabled, aiRateLimit({ name: 'insights', limit: 120 }), getJobInsights);
router.post('/jobs/:id/insights/regenerate', requireAiEnabled, verifyAccessToken, requireRole('EMPLOYER'), aiRateLimit({ name: 'regenerate', limit: 5 }), regenerateJobInsights);
router.get('/jobs/:id/similar', requireAiEnabled, aiRateLimit({ name: 'similar', limit: 60 }), validateRequest(similarQuerySchema, 'query'), getSimilarJobs);
router.get('/search', requireAiEnabled, aiRateLimit({ name: 'search', limit: 20 }), aiDailyBudget, validateRequest(searchQuerySchema, 'query'), searchJobs);
router.get('/recommendations', requireAiEnabled, verifyAccessToken, requireRole('APPLICANT'), aiRateLimit({ name: 'recommendations', limit: 30 }), validateRequest(recommendationsQuerySchema, 'query'), getRecommendations);
router.post('/jobs/:id/fit', requireAiEnabled, verifyAccessToken, requireRole('APPLICANT'), aiRateLimit({ name: 'fit', limit: 10 }), aiDailyBudget, analyzeFit);
router.post('/jobs/:id/cover-letter', requireAiEnabled, verifyAccessToken, requireRole('APPLICANT'), aiRateLimit({ name: 'cover-letter', limit: 5 }), aiDailyBudget, validateRequest(coverLetterBodySchema, 'body'), generateCoverLetter);
router.post('/jobs/:id/resume-tips', requireAiEnabled, verifyAccessToken, requireRole('APPLICANT'), aiRateLimit({ name: 'resume-tips', limit: 5 }), aiDailyBudget, generateResumeTips);

module.exports = router;
