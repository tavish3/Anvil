const express = require('express');
const router = express.Router();
const { createJob, updateJob, softDeleteJob, getMyListings, getJobs, getJobById } = require('./job.controller');
const { createJobSchema, updateJobSchema, jobQuerySchema } = require('./job.schema');
const validate = require('../../middlewares/validate');
const verifyAccessToken = require('../../middlewares/auth');
const requireRole = require('../../middlewares/requireRole');

router.get('/', validate(jobQuerySchema, 'query'), getJobs);
router.get('/my/listings', verifyAccessToken, requireRole('EMPLOYER'), getMyListings);
router.get('/:id', getJobById);
router.post('/', verifyAccessToken, requireRole('EMPLOYER'), validate(createJobSchema), createJob);
router.patch('/:id', verifyAccessToken, requireRole('EMPLOYER'), validate(updateJobSchema), updateJob);
router.delete('/:id', verifyAccessToken, requireRole('EMPLOYER'), softDeleteJob);

module.exports = router;
