const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getMe, updateMe, updateAvatar } = require('./user.controller');
const { updateNameSchema } = require('./user.schema');
const validate = require('../../middlewares/validate');
const verifyAccessToken = require('../../middlewares/auth');

// Multer configuration for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG images are allowed'));
    }
  }
});

router.get('/me', verifyAccessToken, getMe);
router.patch('/me', verifyAccessToken, validate(updateNameSchema), updateMe);
router.patch('/me/avatar', verifyAccessToken, upload.single('avatar'), updateAvatar);

module.exports = router;
